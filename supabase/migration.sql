-- 墨属 数据库迁移 v1.0
-- 在 Supabase SQL Editor 中执行此文件
-- https://ctjhprrzcjjukocwnblo.supabase.co → SQL Editor → New query → 粘贴执行

-- ============================================================
-- 1. 枚举类型
-- ============================================================

CREATE TYPE reading_status_enum AS ENUM ('未读', '在读', '已读', '弃读');
CREATE TYPE purchase_status_enum AS ENUM ('未购', '已购');
CREATE TYPE note_status_enum AS ENUM ('未进行', '进行中', '已完成');

-- ============================================================
-- 2. 表结构
-- ============================================================

-- profiles（用户资料，由 auth.users 触发器自动创建）
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- authors
CREATE TABLE public.authors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  nationality text,
  bio         text,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, user_id)
);

-- books
CREATE TABLE public.books (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn            text,
  title           text NOT NULL,
  author_id       uuid REFERENCES public.authors(id) ON DELETE SET NULL,
  publisher       text,
  language        text,
  total_pages     integer CHECK (total_pages > 0),
  current_page    integer CHECK (current_page >= 0),
  completed_at    timestamptz,
  reading_status  reading_status_enum NOT NULL DEFAULT '未读',
  purchase_status purchase_status_enum NOT NULL DEFAULT '未购',
  note_status     note_status_enum NOT NULL DEFAULT '未进行',
  notes           text,
  review          text,
  rating          integer CHECK (rating >= 0 AND rating <= 5),
  cover_path      text,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (isbn, user_id)
);

-- tags
CREATE TABLE public.tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, user_id)
);

-- book_tags
CREATE TABLE public.book_tags (
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

-- excerpts (摘录)
CREATE TABLE public.excerpts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  content    text NOT NULL,
  page       integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. 函数 & 触发器
-- ============================================================

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 新用户注册时自动创建 profile，display_name 取邮箱 @ 前部分
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(NEW.email, '@', 1),
      '用户'
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. upsert_book — 录入书籍的统一入口
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_book(
  p_book_id            uuid DEFAULT NULL,
  p_title              text DEFAULT NULL,
  p_isbn               text DEFAULT NULL,
  p_author_name        text DEFAULT NULL,
  p_author_nationality text DEFAULT NULL,
  p_publisher          text DEFAULT NULL,
  p_language           text DEFAULT NULL,
  p_total_pages        integer DEFAULT NULL,
  p_current_page       integer DEFAULT NULL,
  p_reading_status     text DEFAULT '未读',
  p_purchase_status    text DEFAULT '未购',
  p_note_status        text DEFAULT '未进行',
  p_notes              text DEFAULT NULL,
  p_rating             integer DEFAULT NULL,
  p_cover_path         text DEFAULT NULL,
  p_tag_names          text[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_book_id   uuid;
  v_author_id uuid;
  v_tag_id    uuid;
  v_tag_name  text;
BEGIN
  -- 1. 插入或获取作者
  IF p_author_name IS NOT NULL AND p_author_name != '' THEN
    INSERT INTO public.authors (name, nationality, user_id)
    VALUES (p_author_name, p_author_nationality, auth.uid())
    ON CONFLICT (name, user_id) DO UPDATE
      SET nationality = COALESCE(EXCLUDED.nationality, authors.nationality)
    RETURNING id INTO v_author_id;
  END IF;

  -- 2. 插入书籍
  INSERT INTO public.books (
    id, isbn, title, author_id, publisher, language,
    total_pages, current_page, reading_status, purchase_status,
    note_status, notes, rating, cover_path, user_id
  ) VALUES (
    COALESCE(p_book_id, gen_random_uuid()),
    p_isbn, p_title, v_author_id, p_publisher, p_language,
    p_total_pages, p_current_page,
    p_reading_status::public.reading_status_enum,
    p_purchase_status::public.purchase_status_enum,
    p_note_status::public.note_status_enum,
    p_notes, p_rating, p_cover_path, auth.uid()
  )
  RETURNING id INTO v_book_id;

  -- 3. 处理标签
  IF p_tag_names IS NOT NULL AND array_length(p_tag_names, 1) > 0 THEN
    FOREACH v_tag_name IN ARRAY p_tag_names
    LOOP
      IF v_tag_name IS NOT NULL AND v_tag_name != '' THEN
        -- 插入或获取标签
        INSERT INTO public.tags (name, user_id)
        VALUES (v_tag_name, auth.uid())
        ON CONFLICT (name, user_id) DO NOTHING;

        SELECT id INTO v_tag_id
        FROM public.tags
        WHERE name = v_tag_name AND user_id = auth.uid();

        -- 关联书籍和标签
        INSERT INTO public.book_tags (book_id, tag_id)
        VALUES (v_book_id, v_tag_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object('book_id', v_book_id, 'author_id', v_author_id);
END;
$$;

-- ============================================================
-- 5. RLS 策略
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- authors
CREATE POLICY "Users can CRUD own authors"
  ON public.authors FOR ALL
  USING (auth.uid() = user_id);

-- books
CREATE POLICY "Users can CRUD own books"
  ON public.books FOR ALL
  USING (auth.uid() = user_id);

-- tags
CREATE POLICY "Users can CRUD own tags"
  ON public.tags FOR ALL
  USING (auth.uid() = user_id);

-- book_tags (via book)
CREATE POLICY "Users can CRUD own book_tags via book"
  ON public.book_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_tags.book_id
      AND books.user_id = auth.uid()
    )
  );

-- book_tags (via tag)
CREATE POLICY "Users can CRUD own book_tags via tag"
  ON public.book_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tags
      WHERE tags.id = book_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. 索引
-- ============================================================

CREATE INDEX idx_books_user_reading ON public.books (user_id, reading_status);
CREATE INDEX idx_books_user_purchase ON public.books (user_id, purchase_status);
CREATE INDEX idx_books_user_note ON public.books (user_id, note_status);
CREATE INDEX idx_authors_user_nationality ON public.authors (user_id, nationality);
CREATE INDEX idx_tags_user_name ON public.tags (user_id, name);
CREATE INDEX idx_book_tags_tag ON public.book_tags (tag_id);
CREATE INDEX idx_book_tags_book ON public.book_tags (book_id);
CREATE INDEX idx_books_isbn ON public.books (isbn) WHERE isbn IS NOT NULL;
CREATE INDEX idx_excerpts_book ON public.excerpts (book_id, created_at);

-- excerpts (via book)
ALTER TABLE public.excerpts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own excerpts via book"
  ON public.excerpts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = excerpts.book_id
      AND books.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. delete_account — 注销账户
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
