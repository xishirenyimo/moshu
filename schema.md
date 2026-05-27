# 个人图书管理系统 — 数据库 Schema 设计

> 版本：MVP v1.0  
> 数据库：PostgreSQL (Supabase)  
> 日期：2026-05-25

---

## 1. 概述

本系统管理个人图书的阅读进度，核心围绕书籍信息、作者、标签三个实体构建。支持多用户（未来家人/朋友共用），每个用户拥有独立的图书库。

### 核心设计原则

- 每本书有且仅有一个**主作者**（MVP），数据库层预留多对多扩展路径
- 阅读进度以**页码**为唯一真实来源，百分比由前端根据 `current_page / total_pages` 自动计算
- 封面图录入时从 Google Books API 下载至 Supabase Storage，统一以 `{book_id}.jpg` 命名
- 所有表从 Day 1 即带 `user_id`，启用 RLS 实现用户数据隔离

---

## 2. 实体关系概览

```
┌──────────────┐       ┌──────────────┐
│   profiles   │       │   authors    │
│  (Supabase   │       │              │
│   Auth 扩展) │       │  id          │
│              │       │  name        │
│  id          │◄──────│  nationality │
│  display_name│  FK?  │  user_id     │──────┐
└──────┬───────┘       └──────┬───────┘      │
       │                      │               │
       │ 1:N                  │ 1:N           │
       │                      │               │
       ▼                      ▼               │
┌──────────────────────────────────┐          │
│             books                │          │
│                                  │          │
│  id                              │          │
│  isbn (可空)                     │          │
│  title                           │          │
│  author_id (FK → authors)        │          │
│  publisher                       │          │
│  language                        │          │
│  total_pages                     │          │
│  current_page                    │          │
│  reading_status (枚举)            │          │
│  purchase_status (枚举)           │          │
│  note_status (枚举)               │          │
│  notes                           │          │
│  rating                          │          │
│  completed_at                    │          │
│  cover_path                      │          │
│  user_id (FK → profiles) ────────┼──────────┘
│  created_at                      │
│  updated_at                      │
└────────┬─────────────────────────┘
         │
         │ N:M
         │
┌────────┴──────────┐    ┌──────────────┐
│    book_tags      │    │     tags     │
│                   │    │              │
│  book_id (FK)     │────│  id          │
│  tag_id (FK)      │    │  name        │
│                   │    │  user_id     │
└───────────────────┘    └──────────────┘
```

---

## 3. 枚举类型

```sql
-- 阅读状态
CREATE TYPE reading_status_enum AS ENUM ('未读', '在读', '已读', '弃读');

-- 购买状态
CREATE TYPE purchase_status_enum AS ENUM ('未购', '已购');

-- 笔记整理状态
CREATE TYPE note_status_enum AS ENUM ('未进行', '进行中', '已完成');
```

---

## 4. 表结构 DDL

### 4.1 profiles（用户资料）

> 由 Supabase Auth 的 `auth.users` 表自动触发创建。

```sql
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(SPLIT_PART(NEW.email, '@', 1), '用户'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4.2 authors（作者）

```sql
CREATE TABLE public.authors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  nationality text,  -- 自由文本 + 前端 autocomplete（预设 ~20 常见国籍），不做强制校验
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (name, user_id)
);
```

**说明：**
- `nationality` 无标准数据源，由用户手动录入
- 同一用户下作者名称唯一（`UNIQUE(name, user_id)`），防止重复
- 不同用户的作者数据完全隔离

### 4.3 books（书籍）

```sql
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
  rating          integer CHECK (rating >= 0 AND rating <= 5),
  cover_path      text,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (isbn, user_id)
);
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `isbn` | text | 否 | ISBN-10 或 ISBN-13，手动录入时可为空 |
| `title` | text | 是 | 书名 |
| `author_id` | uuid | 否 | 主作者外键，`ON DELETE SET NULL` 保证删作者不丢书 |
| `publisher` | text | 否 | 出版社（来自 Google Books API 或手动录入） |
| `language` | text | 否 | 语言（如 "zh", "en"），用于按语言统计阅读分布 |
| `total_pages` | integer | 否 | 总页数，用于百分比计算。为 NULL 时百分比不可用 |
| `current_page` | integer | 否 | 当前阅读页码 |
| `completed_at` | timestamptz | 否 | 最近一次读完的时间。状态变为"已读"时写入，变回非"已读"时清空 |
| `reading_status` | enum | 是 | 未读 / 在读 / 已读 / 弃读 |
| `purchase_status` | enum | 是 | 未购 / 已购 |
| `note_status` | enum | 是 | 未进行 / 进行中 / 已完成 |
| `notes` | text | 否 | 纯文本备注，不支持 Markdown |
| `rating` | integer | 否 | 用户评分 0-5，0 表示未评分（可清零），卡片不显示星标 |
| `cover_path` | text | 否 | Supabase Storage 中的封面路径，如 `covers/{book_id}.jpg` |
| `user_id` | uuid | 是 | 数据归属用户 |
| `created_at` | timestamptz | 是 | 创建时间，系统自动记录 |
| `updated_at` | timestamptz | 是 | 最后修改时间，需触发器自动更新 |

### 4.4 tags（标签）

```sql
CREATE TABLE public.tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (name, user_id)
);
```

**说明：**
- 标签自由输入，`UNIQUE(name, user_id)` 保证每个用户标签名称唯一
- 前端录入时做**记忆提示**：输入时查询已有标签名做 autocomplete
- 一本书可以有多个标签

### 4.5 book_tags（书籍-标签关联）

```sql
CREATE TABLE public.book_tags (
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,

  PRIMARY KEY (book_id, tag_id)
);
```

---

## 5. 自动更新时间戳触发器

```sql
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
```

---

## 6. RLS（Row Level Security）策略

```sql
-- ===== profiles =====
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ===== authors =====
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own authors"
  ON public.authors FOR ALL
  USING (auth.uid() = user_id);

-- ===== books =====
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own books"
  ON public.books FOR ALL
  USING (auth.uid() = user_id);

-- ===== tags =====
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tags"
  ON public.tags FOR ALL
  USING (auth.uid() = user_id);

-- ===== book_tags =====
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own book_tags (via book)"
  ON public.book_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_tags.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can CRUD own book_tags (via tag)"
  ON public.book_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tags
      WHERE tags.id = book_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );
```

---

## 7. 推荐索引

```sql
-- 书籍按用户 + 阅读状态筛选（高频查询）
CREATE INDEX idx_books_user_reading  ON public.books (user_id, reading_status);

-- 书籍按购买状态筛选
CREATE INDEX idx_books_user_purchase ON public.books (user_id, purchase_status);

-- 书籍按笔记状态筛选
CREATE INDEX idx_books_user_note     ON public.books (user_id, note_status);

-- 作者按用户 + 国籍聚合（统计页面最频繁）
CREATE INDEX idx_authors_user_nationality ON public.authors (user_id, nationality);

-- 标签按用户 + 名称（autocomplete 提示）
CREATE INDEX idx_tags_user_name ON public.tags (user_id, name);

-- 标签关联表双向外键（JOIN 优化）
CREATE INDEX idx_book_tags_tag  ON public.book_tags (tag_id);
CREATE INDEX idx_book_tags_book ON public.book_tags (book_id);

-- ISBN 查询（录入时判断是否已存在）
CREATE INDEX idx_books_isbn ON public.books (isbn) WHERE isbn IS NOT NULL;
```

---

## 8. Supabase Storage 设置

### 8.1 存储桶

```
Bucket 名称: book-covers
访问权限:   public (公开读取，用于 <img> 直接加载)
文件命名:   {book_id}.jpg   (如 550e8400-e29b-41d4-a716-446655440000.jpg)
最大文件:   2MB
允许格式:   image/jpeg, image/png, image/webp
```

### 8.2 Storage RLS

```sql
-- 所有人可读取封面（生成公开 URL 给 <img> 使用）
CREATE POLICY "Public can view covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

-- 登录用户可上传封面
CREATE POLICY "Authenticated users can upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.role() = 'authenticated'
  );

-- 登录用户可删除自己的封面
CREATE POLICY "Authenticated users can delete covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-covers'
    AND auth.role() = 'authenticated'
  );
```

---

## 9. 前端计算字段

以下字段不在数据库中存储，由前端按需计算：

| 计算字段 | 公式 | 说明 |
|----------|------|------|
| 阅读百分比 | `(current_page / total_pages) * 100` | `total_pages` 为 NULL 时返回 "—" |
| 封面完整 URL | `{SUPABASE_URL}/storage/v1/object/public/book-covers/{cover_path}` | 通过 supabase-js 的 `getPublicUrl` 获取 |

---

## 10. 关键设计决策

| 决策点 | MVP 做法 | 未来扩展路径 |
|--------|----------|-------------|
| 多作者支持 | `books.author_id` 单作者 | 创建 `book_authors(id, book_id, author_id)` 中间表，移除 `books.author_id` |
| 阅读活动记录 | 仅 `current_page` 覆盖式更新 | 创建 `reading_sessions(id, book_id, page, date)` 表记录每日进度 |
| 数据导出 | JSON 文本导出 + 封面按文件名对应 | 网页端 ZIP 打包下载（JSZip） |
| 作者国籍来源 | 手动录入 | 未来可对接 Wikidata API 自动获取 |

---

## 11. 统计查询示例

以下查询直接支撑书架页顶部概览栏：

```sql
-- 总藏书 / 已读 / 在读 / 未读
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE reading_status = '已读') AS finished,
  COUNT(*) FILTER (WHERE reading_status = '在读') AS reading,
  COUNT(*) FILTER (WHERE reading_status = '未读') AS unread
FROM books
WHERE user_id = auth.uid();

-- 按国籍分布
SELECT a.nationality, COUNT(*) AS count
FROM books b
JOIN authors a ON b.author_id = a.id
WHERE b.user_id = auth.uid() AND a.nationality IS NOT NULL
GROUP BY a.nationality
ORDER BY count DESC;

-- 按标签分布
SELECT t.name, COUNT(*) AS count
FROM book_tags bt
JOIN tags t ON bt.tag_id = t.id
JOIN books b ON bt.book_id = b.id
WHERE b.user_id = auth.uid()
GROUP BY t.name
ORDER BY count DESC;

-- 按出版社统计
SELECT publisher, COUNT(*) AS count
FROM books
WHERE user_id = auth.uid() AND publisher IS NOT NULL
GROUP BY publisher
ORDER BY count DESC;

-- 按语言统计
SELECT language, COUNT(*) AS count
FROM books
WHERE user_id = auth.uid() AND language IS NOT NULL
GROUP BY language
ORDER BY count DESC;
```

---

## 12. 数据库层已确认决策

- [x] `books.author_id` → `ON DELETE SET NULL`（删作者不丢书）
- [x] `isbn` → `UNIQUE(isbn, user_id)`（同用户下 ISBN 不可重复录入）

---

## 13. 技术栈全景

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 19 + Vite | SPA |
| 组件库 | shadcn/ui | 基于 Tailwind CSS，组件代码自行掌控 |
| 服务端状态 | TanStack Query (React Query) | 管理所有 Supabase 数据获取/缓存/mutation |
| 客户端状态 | Zustand | 筛选条件、UI 开关等纯客户端状态 |
| 组件本地状态 | React useState | 表单输入临时值、校验提示 |
| 表单处理 | react-hook-form + zod + @hookform/resolvers | 非受控模式 + 声明式校验 |
| 路由 | React Router v6 | loader 做路由守卫 |
| 样式 | Tailwind CSS | 响应式断点：sm(640) / md(768) / lg(1024) |
| 后端数据库 | Supabase (PostgreSQL) | 自带 Auth、Storage、Edge Functions |
| API 代理 | Supabase Edge Functions (Deno) | Google Books / OpenLibrary 查询代理 |
| 数据同步 | supabase-js 客户端 | 直连 Supabase REST API |
| 类型安全 | `supabase gen types typescript` 自动生成 | 从 DB Schema → TypeScript 类型 |
| 条码扫描 | html5-qrcode | PWA 内调用摄像头识别 ISBN 条形码 (EAN-13) |
| 错误提示 | shadcn/ui toast (sonner) | 全局统一错误处理 |
| 部署 | Vercel | GitHub 仓库直连，自动部署 |
| 离线 | Service Worker 缓存只读 | 不可离线写入 |

---

## 14. 项目目录结构

```
src/
├── components/        # 共享 UI 组件
│   ├── ui/            # shadcn/ui 组件 (button, card, sheet, skeleton, toast...)
│   ├── BookCard.tsx   # 书籍卡片（网格/列表双模式）
│   ├── BookCardGrid.tsx
│   ├── BookCardList.tsx
│   ├── BookForm.tsx   # 录入/编辑表单（react-hook-form）
│   ├── FilterBar.tsx  # 高频筛选 chips（阅读状态）
│   ├── FilterSheet.tsx# 中低频筛选面板（标签/国籍/作者/购买/笔记）
│   ├── Navbar.tsx
│   ├── ISBNScanner.tsx# 摄像头扫码组件
│   └── ExportButton.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── BookshelfPage.tsx    # /books
│   ├── BookDetailPage.tsx   # /books/:id
│   └── AddBookPage.tsx      # /books/add
├── hooks/             # 自定义 hooks
│   ├── useBooks.ts         # TanStack Query: 书架列表 + 筛选
│   ├── useBook.ts          # TanStack Query: 单书详情
│   ├── useCreateBook.ts    # TanStack Query: 入库 mutation
│   ├── useUpdateBook.ts    # TanStack Query: 更新 mutation
│   ├── useDeleteBook.ts    # TanStack Query: 删除 mutation
│   ├── useAuthors.ts       # TanStack Query: 作者列表（国籍筛选用）
│   ├── useTags.ts          # TanStack Query: 标签列表（autocomplete 用）
│   └── useSearchISBN.ts    # Supabase Edge Function 调用
├── stores/            # Zustand stores
│   ├── filterStore.ts      # 筛选条件（阅读状态/标签/国籍/作者/购买/笔记）
│   ├── viewStore.ts        # 视图偏好（卡片/列表）
│   └── sortStore.ts        # 排序方式
├── queries/           # TanStack Query 配置
│   └── queryClient.ts      # 全局 QueryClient + 默认 onError toast
├── lib/               # 工具函数 & 客户端
│   ├── supabase.ts         # supabase-js 客户端实例
│   └── utils.ts            # 通用工具（百分比计算等）
├── validators/        # zod schemas
│   ├── authSchemas.ts      # 登录/注册表单校验
│   └── bookSchemas.ts      # 书籍表单校验
├── types/             # TypeScript 类型
│   └── database.ts         # supabase gen types 自动生成
├── layouts/
│   ├── RootLayout.tsx      # 无 Navbar 外壳（登录/注册页用）
│   └── AppLayout.tsx       # 带 Navbar 外壳（需登录）
└── router.tsx              # 路由定义 + loader 守卫
```

---

## 15. 路由设计

```
RootLayout (无 Navbar)
  ├─ /login          → LoginPage
  ├─ /register       → RegisterPage
  └─ /reset-password → ResetPasswordPage

/ (重定向到 /books，需登录)
  └─ AppLayout (带 Navbar + 需登录保护)
       ├─ /books              → BookshelfPage
       ├─ /books/:id          → BookDetailPage
       ├─ /books/add          → AddBookPage
       ├─ /settings           → SettingsPage
       └─ /settings/authors   → AuthorManagePage
```

**路由守卫实现：** React Router v6 loader，进入受保护路由前检查 `supabase.auth.getSession()`，无 session 则 redirect 到 `/login`。

---

## 16. Supabase Edge Function 设计

### 16.1 search-isbn

**输入：**
```typescript
{ isbn: string }
```

**处理流程：**
1. 校验 ISBN 格式（ISBN-10 10位 / ISBN-13 13位）
2. 调 Google Books API 查询（fetch timeout 8 秒）
3. 命中 → 下载封面图 → 上传至 Supabase Storage `tmp/{timestamp}_{isbn}.jpg` → 返回完整数据 + 临时 `cover_path`
4. 未命中 → 调 OpenLibrary API 兜底
5. 仍未命中 → 返回 `{ found: false }`
6. 详细错误分类见第 38 节

**返回结构（命中）：**
```typescript
{
  found: true,
  book: {
    isbn: string,
    title: string,
    authors: string[],       // 作者名列表
    publisher: string | null,
    language: string | null,
    total_pages: number | null,
    cover_path: string | null,  // tmp 临时路径，或 null（封面不合格时）
    source: "google_books" | "open_library"
  }
}
```

**API Key 管理：** Google Books API Key 通过 Supabase Edge Function Secret 注入，不在前端暴露。

---

## 17. ISBN 录入流程

```
用户输入 ISBN（扫码 / 手动输入）
          │
          ▼
  调用 Edge Function search-isbn
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
  Google  Open  都未找到
  Books   Library  │
    │       │      │
    └───┬───┘      │
        ▼          │
   ┌──────────┐    │
   │ 查到数据？ │    │
   └────┬─────┘    │
    ┌───┴───┐      │
    ▼       ▼      ▼
   是       否     静默降级
    │       │     （无提示）
    ▼       ▼      │
 预填表单  空白手动表单
（全部字段可改） （所有字段需自行填写）
    │
    ▼
 用户修改 ISBN？（Combobox 失焦检测 ISBN 变化）
    ├── 是 → 弹窗"ISBN 已变更，是否用新数据刷新表单？"
    │         ├── 刷新 → 重新查询 API，覆盖已有字段
    │         └── 保留 → 保留当前表单内容
    └── 否 → 继续
    │
    ▼
 用户确认 → INSERT books + book_tags + INSERT authors (if new)
```

**关键规则：**
- API 返回数据预填后所有字段可改
- ISBN 变更弹出确认（方案3），防止覆盖用户已编辑的其他字段
- API 无结果时**静默降级**，不弹 toast，表单保持空白等用户手动填
- 录入页 ISBN 确认后即为最终值，**编辑模式中 ISBN 只读锁定**
- 录入页只填书名即可保存，其余字段全可选

**扫码库：** html5-qrcode，调用 `getUserMedia` 实时解析 EAN-13 条形码，PWA 环境需 HTTPS（localhost / Vercel 均满足）。

---

---

## 18. 书架页功能规格

### 18.1 展示形式

- **默认**：网格卡片视图（手机 1-2 列，平板 3 列，桌面 4 列）
- **可切换**：列表视图（表格行）
- **视图偏好**：存入 Zustand + localStorage，刷新保持

### 18.2 每张卡片展示

封面图（无封面时首字+渐变背景占位） / 书名 / 作者 / 阅读进度条（无 total_pages 时显示"已读 X 页"） / 状态标签（已读/在读/未读） / 评分星标（仅已评分书籍显示，只读）

### 18.3 筛选

| 筛选维度 | 交互方式 | 数据类型 |
|----------|---------|---------|
| 阅读状态 | 3 个 chip/tab 平铺顶部（在读/已读/未读） | 枚举 |
| 标签 | 筛选面板内多选 | book_tags → tags |
| 购买状态 | 筛选面板内选择 | 枚举 |
| 笔记状态 | 筛选面板内选择 | 枚举 |
| 国籍 | 筛选面板内多选，选项从已有作者数据动态生成 | `SELECT DISTINCT nationality` |
| 作者 | 筛选面板内多选 | authors |

**筛选面板交互：**
- 桌面端（≥768px）：点击筛选按钮 → Popover 弹出面板
- 移动端（<768px）：点击筛选按钮 → Bottom Sheet 滑出，占屏幕 60-70%

**筛选状态：** 存入 Zustand filterStore，仅内存保存（刷新重置）。筛选条件可叠加。

**无匹配处理：** `totalBooks > 0 && filteredCount === 0` 时显示"没有书籍匹配当前条件"+ 一键"清除全部筛选"按钮。

### 18.4 排序

支持 3 种排序方式，默认 `updated_at DESC`。排序偏好仅内存保存，刷新重置，与筛选条件同类。

| 排序方式 | 规则 |
|----------|------|
| 最近修改 | `updated_at DESC` |
| 书名 A-Z | `title ASC` |
| 评分 | `rating DESC NULLS LAST` → 同分 `updated_at DESC` |

所有排序统一次级规则：`updated_at DESC`。排序偏好仅内存保存，刷新重置（与筛选同类，属临时浏览上下文）。

### 18.5 搜索

书名模糊搜索（`title.ilike('%keyword%')`），搜索框位于书架页顶部，debounce 300ms 触发查询。与筛选条件正交叠加。搜索条件变更时页码自动重置到第1页。

### 18.6 顶部概览栏

全局统计数据实时展示：
- 总藏书 X 本
- 已读率（已读数 / 总数 × 100%）
- 按国籍分布
- 按标签分布
- 按出版社统计
- 按语言统计

桌面端默认展开，移动端默认折叠（仅显示"X 本书 · 已读 Y% · 在读 Z 本"一行），点击可展开查看完整统计。

### 18.7 录入后的筛选保留

录入新书后返回列表时保留当前筛选/搜索条件（不清除）。用户主动设置的筛选不因录入操作被破坏。

---

## 19. 书籍详情页字段清单

**整体布局：** 单列纵向，桌面端 `max-w` 约束宽度。默认查看模式，点击"编辑"按钮切换为编辑模式。

| 分组 | 字段 | 来源 | 可编辑 | 备注 |
|------|------|------|--------|------|
| **封面区** | 封面 | Storage URL | 编辑模式下可更换 | 无封面时首字+渐变背景占位；支持本地上传 + API 下载 |
| | 书名 | books.title | 是 | |
| | 作者 | books.author_id → authors | 是 | Combobox（搜索已有 + 直接输入创建新） |
| **阅读进度区** | 阅读状态 | books.reading_status | 是 | 自动流转 + 手动覆盖；四态：未读/在读/已读/弃读 |
| | 总页数 | books.total_pages | 是 | 变动不触发自动流转；失焦时检测 current_page > total_pages 冲突 |
| | 当前页码 | books.current_page | 是 | `<input type="number" min="0">`，total_pages 非空时 max=total_pages，为空时 max=99999；变动触发自动流转 |
| | 阅读百分比 | 前端计算 | 只读 | 无 total_pages 时显示"已读 X 页" |
| **评分区** | 评分 | books.rating | **始终可交互** | 1-5 星标整数，可清零（点击已选星级清为0），不在编辑模式锁后 |
| **书籍信息区** | 出版社 | books.publisher | 是 | |
| | 语言 | books.language | 是 | 下拉 8 种精简选项 |
| | ISBN | books.isbn | **编辑模式只读** | 录入时确定，编辑模式锁定只读 |
| **标签区** | 标签 | book_tags → tags | 是 | 纯文本输入 + 回车分隔，已存在标签自动匹配，不存在则自动创建 |
| **购阅状态区** | 购买情况 | books.purchase_status | **始终可交互** | Toggle Switch 开关，不在编辑模式锁后 |
| | 笔记整理情况 | books.note_status | **始终可交互** | 三态 Segmented Control：未进行/进行中/已完成 |
| **备注区** | 备注 | books.notes | 是 | 固定 3-4 行 textarea，纯文本 |
| — | 数据更新时间 | books.updated_at | 只读 | 自动 |

**编辑模式规则补充：**
- 修改 ISBN → 锁定只读（录入时确定，编辑不改变身份）
- 修改 current_page → 自动流转 reading_status（在 onSubmit 中计算）
- 弃读后修改 current_page → 自动从弃读变回在读
- 离开编辑页时若有未保存内容 → 弹出确认弹窗

---

## 20. 认证规格

- **登录方式**：邮箱 + 密码（主），Magic Link（备选）。Supabase Auth 原生支持两者并存
- **注册**：无需邮箱验证（MVP），填写邮箱 + 密码 + display_name
- **密码强度**：依赖 Supabase Auth 默认最低 6 字符，前端不做额外强度校验
- **验证成功后**：重定向到 `/books`
- **注销**：Navbar 头像下拉菜单中
- **密码重置**：`/reset-password` 页面，Supabase 自动发送重置邮件
- **display_name**：注册时收集，默认取邮箱 @ 前部分，设置页可修改
- **页面**：`/login`、`/register`、`/reset-password`，均属于 RootLayout（无 Navbar）

---

## 21. UX 体系

### 21.1 加载状态

| 场景 | 方案 |
|------|------|
| 书架页数据加载 | Skeleton 卡片 × 4-6 张，shadcn/ui `<Skeleton />` |
| 表单提交按钮 | Button 内 spinner + disabled，防止重复提交 |
| 封面图片加载 | 灰色占位图，加载完成后替换，无 spinner |

### 21.2 保存失败处理

编辑页保存失败时：
- 保留在编辑模式，表单数据不丢
- Toast 提示"保存失败，请重试"
- Dismiss 按钮保持可用，用户可重试或自行离开
- 离开时触发未保存拦截弹窗，提醒有未保存内容
- 连续失败 3 次后 toast 追加"请检查网络连接"

核心原则：用户编辑成果不因外部故障被丢弃。

### 21.3 数据加载策略

- **纯 CSR**：页面框架静态渲染，书籍数据通过客户端 React Query 获取
- 不需要 SSR/SEO，RLS 策略需要 `auth.uid()` 在客户端请求上下文中

### 21.4 错误处理

- 全局：TanStack Query 默认 `onError` 回调 → Toast
- 消息格式：简短中文提示（"查询失败，请检查网络"/"保存失败，请重试"）
- 详细错误 → `console.error`
- 不内联错误信息到 UI 中，避免页面布局跳动

### 21.5 删除操作

- 点击删除 → 确认弹窗（提示书名 + "确定删除？此操作不可撤销"）
- 确认后：删除书籍记录 + 同时清理 Supabase Storage 对应封面文件
- 删除成功 toast 提示，返回书架页，保留当前筛选条件

### 21.6 离开拦截

| 场景 | 策略 |
|------|------|
| 录入页（填写中） | 不拦截。录入成本低（~30s），拦截增加摩擦 |
| 编辑页（详情页） | 弹出确认"有未保存内容，确定离开吗？" |

### 21.7 响应式布局

| 断点 | 描述 | 书架列数 | 筛选面板 | Navbar |
|------|------|---------|---------|------------|
| <768px (mobile) | 手机 | 1-2 列 | bottom sheet | 底部 3 Tab（书架/录入/设置） |
| 768-1024px (tablet) | 平板 | 3 列 | popover | 顶部（Logo/搜索/+录入/头像下拉） |
| >1024px (desktop) | 桌面 | 4 列 | popover | 顶部（Logo/搜索/+录入/头像下拉） |

### 21.8 Toast 通知规格

| 属性 | 决定 |
|------|------|
| 位置 | 桌面右下角，移动端顶部居中 |
| 类型 | success（绿）/ error（红）/ info（蓝）三种 |
| 自动消失 | success 2s / error 需手动关闭或 5s / info 3s |
| 堆叠 | 最多同时显示 3 个，超出时最早的出现消失 |
| 去重 | 同类型同内容不重复显示 |
| 实现 | 全局 ToastContainer + zustand toastStore，`toast.success('xxx')` 即可调用 |

---

## 22. 数据导出规格

- **格式**：单个 `library-export.json` 文件
- **内容**：全量书籍数据，作者和标签内嵌（非独立文件）
- **封面**：单独批量下载，通过 `cover_filename`（`{book_id}.jpg` 命名）与 JSON 数据对应
- **导出入口**：Navbar 或个人设置页中的"导出数据"按钮

```json
{
  "exported_at": "2026-05-21T...",
  "user": { "email": "..." },
  "books": [
    {
      "title": "...",
      "isbn": "...",
      "author": { "name": "村上春树", "nationality": "日本" },
      "tags": ["小说", "日本文学"],
      "publisher": "...",
      "language": "zh",
      "total_pages": 300,
      "current_page": 150,
      "reading_status": "在读",
      "purchase_status": "已购",
      "note_status": "进行中",
      "notes": "...",
      "rating": 4,
      "completed_at": "...",
      "cover_filename": "550e8400-e29b-41d4-a716-446655440000.jpg",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### 22.1 数据导入规格

- **格式**：与导出同款的 ZIP 包（`library-export.json` + 封面图片）
- **流程**：上传 ZIP → 前端 JSZip 解析 JSON → 干跑预检（格式校验、ISBN 解析、数据完整性）→ 展示汇总 + 问题清单（"3 本 ISBN 冲突，2 本格式异常"）→ 用户确认 → 逐条 upsert_book + 上传封面（尽力而为，成功的保留，失败的跳过，最后汇报结果）
- **原子性**：尽力而为模式，非全量事务回滚。成功的保留，失败的跳过并在最终报告中列出
- **ISBN 冲突**：预检阶段弹窗让用户选择"跳过"还是"覆盖"
- **封面**：解压后上传至 Supabase Storage 对应路径
- **不包含**：用户设置（深色模式、筛选偏好等纯 UI 状态）

---

## 23. 阅读状态自动流转规则

修改 `current_page` 时，前端自动推断 `reading_status`：

| 条件 | 自动流转 |
|------|---------|
| `current_page > 0 && current_page < total_pages` | `'在读'` |
| `current_page > 0 && total_pages IS NULL` | `'在读'` |
| `current_page >= total_pages && total_pages IS NOT NULL` | `'已读'` |
| `current_page = 0` | 不变（保持原有状态） |
| `current_page 变动 + 当前状态 = '弃读'` | `'在读'`（重新捡起，动了就说明又在读） |

**手动覆盖：**
- 用户可手动更改 reading_status（详情页下拉框），不受自动流转约束
- 手动覆盖后以手动值为准，不做校验（如"已读但 current_page=0"即便语义矛盾也信任用户操作）
- 下次 current_page 变动时自动流转重新介入

**completed_at 联动：**
- reading_status 变为 `'已读'` → `SET completed_at = NOW()`
- reading_status 变为非 `'已读'` → `SET completed_at = NULL`

**弃读相关：**
- 弃读时保留 current_page（记录读到哪里放弃的）
- 弃读 → 已读允许手动切换但不自动触发

**关键约束：**
- 仅 `current_page` 变动触发自动流转，`total_pages` 变动不触发。
- 用户手动覆盖后以手动值为准。
- 实现位置：编辑表单的 `onSubmit` 中，在调 mutation 前计算。

---

## 24. 评分规格

| 属性 | 决定 |
|------|------|
| 刻度 | 1-5 星（整数），对应数据库 `rating INTEGER CHECK (0-5)`，0 表示未评分 |
| 可清零 | 是，点击已选星级清为 0（点第3颗星两次：先设为3，再点一次清为0） |
| 交互 | 详情页始终可点击（不在编辑模式锁后），hover 预览点击确认 |
| 视觉效果 | 纯星标组件，实心黄星 + 空心灰星 |
| 书架卡片 | 已评分的显示只读星标，未评分（rating=0）不显示 |
| 排序 | 评分 DESC NULLS LAST → 同分 `updated_at DESC` |

---

## 25. 封面文件全生命周期

### 25.1 命名规则

统一使用 `{book_id}.jpg`（如 `covers/550e8400-e29b-41d4-a716-446655440000.jpg`）。

### 25.2 录入流程

```
Edge Function 查询 API → 下载封面图 → 上传至 Storage tmp/{timestamp}_{isbn}.jpg
→ 返回临时 cover_path → 预填表单 → 用户确认 
→ 前端生成 book_id（crypto.randomUUID()）
→ storage.move('tmp/xxx.jpg', 'covers/{book_id}.jpg')
→ upsert_book RPC（传入 p_book_id = 预生成的 book_id，cover_path = 'covers/{book_id}.jpg'）
→ move() 失败时：书籍仍入库，cover_path 留空，toast 提示"封面上传失败，可在详情页手动添加"
```

**时序说明：** 前端在 RPC 调用前先预生成 book_id 并完成封面 move，RPC 接受 `p_book_id` 可选参数直接写入，避免 INSERT 后再 UPDATE cover_path 的额外操作。

### 25.3 编辑更换

详情页编辑模式下，封面旁"更换"按钮 → 文件选择器或本地上传（`<input type="file" accept="image/*">`）。

### 25.4 本地上传

- 支持上传本地图片作为封面（API 无结果或封面不佳时）
- 文件大小上限 2MB
- 直接上传覆盖 `covers/{book_id}.jpg`
- 不做裁剪、不做比例限制

### 25.5 删除清理

删除书籍：先删数据库行 → 成功后 best-effort 调 `storage.remove('covers/{book_id}.jpg')`，失败不阻塞。

---

## 26. 数据库函数：upsert_book

录入书籍的统一入口，一个事务内完成全部操作：

```
输入：book 字段 + author_name + tag_names[] + 可选 p_book_id
事务内：
  1. INSERT INTO authors ... ON CONFLICT (name, user_id) DO NOTHING → 获取 author_id
  2. INSERT INTO books (含 author_id，若传了 p_book_id 则用其作为 id) → 获取 book_id
  3. 遍历 tag_names：INSERT INTO tags ... ON CONFLICT (name, user_id) DO NOTHING → 获取 tag_id
  4. 批量 INSERT INTO book_tags (book_id, tag_id)
返回：{ book_id, author_id, ... }
```

**p_book_id 用途：** 前端预生成 UUID 以完成封面 move → INSERT 的时序（见 25.2 节）。
不传则由数据库自动 `gen_random_uuid()`。

编辑更新不走此函数，由前端 TanStack Query mutation 直接调 supabase-js 按需更新各字段。

---

## 27. 搜索规格

| 属性 | 决定 |
|------|------|
| 搜索范围 | 书名模糊匹配 |
| 实现方式 | `title.ilike('%keyword%')`，Supabase REST API |
| 搜索位置 | 书架页筛选栏旁，一个搜索 input |
| 与筛选关系 | 正交叠加，搜索关键词和筛选条件同时生效 |
| 无结果 | 显示"没有书籍匹配当前条件" + 一键"清除全部筛选"按钮 |

---

## 28. 分页与缓存策略

| 属性 | 决定 |
|------|------|
| 数据拉取 | 全量加载（不做服务端分页） |
| TanStack Query staleTime | 5 分钟 |
| 缓存失效 | 所有 mutation 成功后统一 `invalidateQueries({ queryKey: ['books'] })` |

---

## 29. 状态持久化策略

| 状态 | 存储位置 | 理由 |
|------|---------|------|
| 筛选条件（阅读状态/标签/国籍/作者/购买/笔记） | 仅内存，刷新重置 | 筛选是临时浏览上下文 |
| 搜索关键词 | 仅内存，刷新重置 | 同上 |
| 排序方式 | 仅内存，刷新重置 | 排序和筛选本质同类 |
| 视图偏好（卡片/列表） | Zustand + localStorage | 界面习惯，属于长期偏好 |

---

## 30. 空状态设计

| 场景 | 呈现 |
|------|------|
| 书架无任何书（`totalBooks === 0`） | 引导式空状态：插图 + "还没有书，添加你的第一本" + 醒目的 CTA 按钮。概览栏和筛选控件隐藏。 |
| 书架有书但筛选/搜索无匹配（`totalBooks > 0 && filteredCount === 0`） | "没有书籍匹配当前条件" + 一键"清除全部筛选"按钮，帮助用户快速复位。 |

---

## 31. MVP 开发顺序

```
1. 项目脚手架      — Vite + React + Tailwind + shadcn/ui + Router + 目录结构
2. Supabase 基础设施 — Schema 迁移 + RLS + Storage Bucket + supabase gen types
3. ISBN 查询 Edge Function — search-isbn 部署 + Google Books/OpenLibrary 代理
4. 书籍录入页       — AddBookPage + BookForm(react-hook-form+zod) + ISBNScanner
5. 书架页           — BookshelfPage + BookCard + FilterBar + FilterSheet + 概览统计栏 + 视图切换 + 搜索
6. 书籍详情/编辑页   — BookDetailPage + 编辑模式(独立切换) + 评分 + 封面更换 + 删除(确认弹窗)
7. 认证系统         — 登录/注册/密码重置 + loader 路由守卫（开发阶段用 mock session）
8. 数据导出         — ExportButton + JSON 导出
9. UX 打磨          — Skeleton 加载态 + toast 错误处理 + 响应式适配 + 空状态 + 无匹配状态
```

---

## 32. 关键设计决策总表

| 决策项 | 选择 |
|--------|------|
| ISBN 数据源 | Google Books API 为主，OpenLibrary 兜底 |
| 豆瓣 | 不自动抓取，仅手动复制粘贴信息 |
| API 调用方式 | Supabase Edge Functions 代理（API Key 不暴露前端） |
| 作者建模 | 独立 `authors` 实体，MVP 单作者，预留多对多 |
| 作者编辑交互 | 带 autocomplete 的文本输入，和标签保持一致 |
| 作者国籍 | 手动录入，无外部数据源 |
| 阅读进度 | 页码 → 百分比单向推导，`current_page` 变动自动流转阅读状态 |
| 自动流转规则 | `current_page` 变动触发（>0→在读，=total→已读），`total_pages` 变动不触发 |
| 进度更新 | 仅在书籍详情页编辑模式 |
| 书籍分类 | 自由标签，多对多，chips + autocomplete input |
| 标签管理 | 随书管理，无独立标签管理页 |
| 孤儿标签 | 不清理，作为历史标签词汇库保留 |
| 评分 | 1-5 星整数，可空，详情页始终可交互，卡片只读展示 |
| 排序 | 3 种（最近修改/书名A-Z/评分），次排序统一 `updated_at DESC` |
| 搜索 | 书名 `ilike` 模糊匹配，与筛选正交叠加 |
| 封面存储 | Supabase Storage，录入时 Edge Function 自动下载 |
| 封面命名 | 统一 `covers/{book_id}.jpg`，录入走 tmp 临时名 + Storage move |
| 封面更换 | 编辑模式下支持手动上传覆盖 |
| 封面删除 | 删书后 best-effort 清理，不阻塞 |
| 录入方式 | `upsert_book` 数据库函数，全包（作者+书籍+标签，一个事务） |
| 编辑方式 | 前端 TanStack Query mutation 按需拆解更新 |
| 编辑模式 | 详情页默认查看模式，点击"编辑"按钮切换，评分除外（始终可交互） |
| 多用户 | 所有表 `user_id` 字段 + RLS 策略 |
| 认证开发策略 | 后置接入，开发阶段用 mock session |
| 离线 | Service Worker 缓存只读 |
| 数据加载 | 全量加载 + staleTime 5min 缓存 |
| 缓存失效 | mutation 后统一 invalidateQueries |
| 筛选持久化 | 仅内存，刷新重置 |
| 排序持久化 | 仅内存，刷新重置 |
| 视图偏好 | localStorage 持久化 |
| 空状态 | 零书引导式 / 筛选无匹配带清除按钮 |
| ISBN 唯一性 | `UNIQUE(isbn, user_id)` |
| ISBN 重复扫码 | 前端按钮 debounce 防重，数据库约束兜底 |
| 并发编辑冲突 | Last-write-wins，不做乐观锁 |
| Edge Function 冷启动 | 接受，按钮 spinner + 文案，不做预热 |
| 删除作者 | 书保留，author_id SET NULL |
| 类型安全 | `supabase gen types` 自动生成 |
| 项目结构 | 传统按类型分（components/pages/hooks/...） |
| 路由 | `/` → `/books` → loader 守卫，有 session 渲染，无则 redirect `/login` |
| 响应式 | 断点 sm(640) / md(768) / lg(1024) |

---

## 33. Navbar 导航结构

### 33.1 桌面端（≥768px）

顶部水平栏，从左到右：**应用名/Logo（书架入口） | 搜索框 | "+" 录入按钮 | 头像下拉**

头像下拉菜单项：设置 / 深色模式切换 / 关于 / 退出登录。

### 33.2 移动端（<768px）

底部 3 Tab：**书架 | 录入(+) | 设置**

搜索框移至书架页顶部，不占底部 Tab。

**Tab 高亮规则：** 路由前缀匹配。`/books` 及所有子路由（`/books/:id`、`/books/add`）高亮"书架"；`/settings` 及所有子路由（`/settings/authors`）高亮"设置"。用户在任意深度的子页面都能感知所在模块。

### 33.3 路由

```
/ (重定向到 /books)
├─ RootLayout (无 Navbar)
│   ├─ /login
│   ├─ /register
│   └─ /reset-password
│
└─ AppLayout (Navbar + 需登录)
    ├─ /books          → BookshelfPage
    ├─ /books/:id      → BookDetailPage
    ├─ /books/add      → AddBookPage
    └─ /settings       → SettingsPage
```

---

## 34. 设置页

独立路由 `/settings`，含四个区块：

### 34.1 账号设置

- **display_name 编辑**：text input 预填当前值，修改后调 supabase-js `updateUser()` 更新 profiles 表，放账号设置区最顶部
- **修改密码**：当前密码 + 新密码 + 确认新密码，react-hook-form + zod 校验
- **修改邮箱**：新邮箱 + 确认，触发 Supabase 新邮箱验证流程

### 34.2 主题模式

Toggle 开关，手动切换亮色/深色。Tailwind `class` 策略，偏好存 localStorage。

### 34.3 账号注销

见第 50 节「账号注销」完整流程。

### 34.4 关于

- 版本号：从 `package.json` 读取（`import { version } from '../package.json'`）
- GitHub 仓库链接
- 数据来源声明："图书数据来源：Google Books / OpenLibrary"

---

## 35. 深色模式

| 属性 | 决定 |
|------|------|
| Tailwind 策略 | `darkMode: 'class'`，`<html>` 加 `class="dark"` 触发 |
| 切换方式 | 设置页 Toggle 开关，手动切换 |
| 持久化 | localStorage，应用启动时读取 |
| shadcn/ui 适配 | Tailwind `dark:` 前缀自动适配所有 shadcn 组件 |

---

## 36. 认证页面布局

`/login`、`/register`、`/reset-password` 均使用居中卡片式布局：

- 背景色/渐变 + 居中单张 `<Card />`
- 卡片内含：应用 Logo + 应用名 + 表单 + 底部链接（如"没有账号？去注册"）
- 桌面端和移动端共用同一套布局

---

## 37. 书籍详情页信息架构

### 37.1 整体布局

单列纵向布局，桌面端 `max-w` 约束宽度。字段分为 7 个视觉区：

| 分组 | 包含字段 | 说明 |
|------|---------|------|
| **封面区** | 封面大图 + 书名 + 作者 | 身份识别，最顶部 |
| **阅读进度区** | 阅读状态 / 总页数 / 当前页码 / 百分比进度条 | 核心动作区 |
| **评分区** | 星级评分（始终可交互） | 轻量反馈 |
| **书籍信息区** | 出版社 / 语言 / ISBN | 元数据，次重要 |
| **标签区** | 标签 chips | 分类归属 |
| **购阅状态区** | 购买状态 / 笔记状态 | 管理状态 |
| **备注区** | 纯文本备注（固定 3-4 行 textarea） | 辅助信息 |

### 37.2 进度条规则

- 有 `total_pages` → 显示百分比进度条
- 无 `total_pages` → 隐藏进度条，显示"已读 X 页"
- 百分比由前端计算，数据库不存储

### 37.3 不可编辑字段

- `updated_at`：只读，自动显示
- 阅读百分比：只读，前端实时计算
- `completed_at`：只读，阅读状态为"已读"时显示"读完于 YYYY-MM-DD"，非"已读"时隐藏

### 37.4 始终可交互的字段（不锁在编辑模式后）

- 评分（星级点击）
- 笔记状态（分段控件切换）

---

## 38. ISBN Edge Function 详细规格

### 38.1 输入

```typescript
{ isbn: string }  // 原始值，可能含连字符、空格
```

### 38.2 处理流水线

1. 去连字符和空格 → 纯数字
2. 位数检测：10 位 → 转 ISBN-13，12 位（UPC-A）→ 转 ISBN-13，13 位 → 直接使用
3. 非 10/12/13 位 → 返回 `{ found: false, error: "invalid_isbn" }`
4. 校验位验证 → 失败返回 `{ found: false, error: "invalid_isbn" }`
5. 调 Google Books API（fetch timeout 8 秒）：
   - 命中 → 返回数据
   - 超时 / 5xx / 配额耗尽 → 降级到 OpenLibrary
6. 调 OpenLibrary 兜底：
   - 命中 → 返回数据
   - 未找到（404）→ 返回 `{ found: false, error: "not_found" }`
   - 超时 / 5xx → 返回 `{ found: false, error: "service_unavailable" }`
7. 两个服务都不可用 → 返回 `{ found: false, error: "service_unavailable" }`

### 38.3 两类失败的区分

| 错误类型 | 含义 | 前端行为 |
|----------|------|---------|
| `invalid_isbn` | ISBN 格式/校验位错误 | Toast "ISBN 格式不正确" |
| `not_found` | 两个数据源均无该书数据 | 静默降级，不提示，表单保持空白等手动填 |
| `service_unavailable` | 第三方服务超时/配额耗尽/故障 | Toast "图书查询服务暂时不可用，请手动填写书籍信息" |

**关键原则：** 任何原因的查询失败都不能阻塞用户手动录入。表单始终可用。

### 38.4 封面处理

- 构建封面 URL 时去掉缩放参数获取最大尺寸原图
- 下载后检测尺寸：宽或高 < 200px → 不使用，`cover_path` 留空
- 上传至 Storage `tmp/{timestamp}_{isbn}.jpg`

### 38.5 返回结构

**命中：**
```typescript
{
  found: true,
  book: {
    isbn: string,
    title: string,
    authors: string[],
    publisher: string | null,
    language: string | null,
    total_pages: number | null,
    cover_path: string | null,  // tmp 临时路径，或 null
    source: "google_books" | "open_library"
  }
}
```

**未命中：**
```typescript
{
  found: false,
  error: "invalid_isbn" | "not_found" | "service_unavailable"
}
```

### 38.6 扫码

- 前端使用 `html5-qrcode`
- 支持格式：EAN-13 + UPC-A
- 摄像头权限：组件挂载时自动检测，无权限/无设备时扫码按钮禁用 + tooltip 说明，手动输入框仍可用

---

## 39. 录入页交互规格

### 39.1 页面结构

单页双模式：顶部 ISBN 查询区（扫码按钮 + 手动输入框）+ 下方全表单。无需页面跳转或模式切换。

### 39.2 提交成功行为

- 跳转到该书详情页，用户可检查信息并开始记录阅读进度
- MVP 不做"保存并继续添加"

### 39.3 语言字段

- 不自动推断（API 返回不完整）
- 下拉选项：zh / en / ja / ko / fr / de / es / 其他（8 种精简列表）
- 可留空

### 39.4 标签录入

- 第一次录入无历史标签时，autocomplete 无提示，输入新标签名直接创建
- 不做预设标签建议

---

## 40. 封面占位图

无封面时（手动录入无 ISBN、API 未返回封面），使用 **首字 + 渐变背景**：

- 取书名第一个字符
- 基于书名 hash 生成确定的渐变色
- 同本书每次渲染颜色一致

---

## 41. 筛选面板交互（FilterSheet）

| 端 | 交互 |
|------|------|
| 桌面端（≥768px） | 点击筛选按钮 → Popover 弹出面板（按钮下方），不改变书架布局宽度 |
| 移动端（<768px） | 点击筛选按钮 → Bottom Sheet 滑出，占屏幕 60-70% 高度 |

筛选内容：标签多选 / 国籍多选 / 作者多选 / 购买状态 / 笔记状态。使用 shadcn/ui `<Popover />` + `<Command />` 组合。

---

## 42. 进度条与页码输入

- 详情页编辑模式中，`current_page` 使用 `<input type="number">`，min=0
- `total_pages` 不为空时 `max=total_pages`；`total_pages` 为空时 max 不设限（设善意上限 99999）
- 纯数字输入，不带步进器、滑块等辅助控件

### 42.1 current_page > total_pages 冲突处理

- 策略：被动防御（失焦提示）
- `total_pages` 输入框失焦时，若 `current_page > total_pages`，弹出 toast 提示"当前页码（X）超过总页数（Y），请调整"
- 不给 total_pages 变动绑定自动流转，避免覆盖用户正在进行的批量编辑

### 42.2 进度条规则

- 有 `total_pages` → 显示百分比进度条 `(current_page / total_pages) * 100%`
- 无 `total_pages` → 隐藏进度条，显示"已读 X 页"

---

## 43. 作者管理页

访问路径：`/settings/authors`

- 列出所有作者，按关联书籍数降序排列
- 每行显示：作者名 / 国籍 / 关联书籍数（点击数字可跳转筛选列表）
- 操作：编辑（名称、国籍）、删除、合并
- **删除确认**：弹窗列出受影响书籍（"以下 3 本书的作者将变为'未设置'"），用户确认后 `ON DELETE SET NULL` 执行
- **合并操作**：选择源作者 → 下拉搜索目标作者 → 确认"将 X（N本书）合并到 Y（M本书），X将被删除"→ 执行 RPC（UPDATE books SET author_id = target WHERE author_id = source; DELETE FROM authors WHERE id = source）
- 入口：设置页"作者管理"

---

## 44. 标签管理

位置：设置页内嵌（不独立子页面）

- 以列表形式展示所有标签，按关联书籍数降序
- 每行显示：标签名 / 关联书籍数 / 删除按钮
- 点击标签名可内联编辑（双击或点编辑图标）
- **重命名冲突**：若新名称与已有标签重复，弹窗提示"标签'B'已存在，是否将使用'A'的 X 本书合并到'B'并删除'A'？"→ 确认后执行合并（UPDATE book_tags + DELETE tag A）。本质上是把重命名冲突转化为合并操作
- 删除时级联清理 `book_tags` 记录，同时从 filterStore 移除对应筛选条件，Toast 提示

---

## 45. 筛选逻辑补充

### 45.1 标签筛选逻辑

- 标签筛选为 **OR**：选中"编程""经典"→ 显示任意一个标签匹配的书
- OR 保证选得越多结果越多，直觉上不出错

### 45.2 删除标签/作者时清理筛选

- 删除标签或作者时，前端同步从 filterStore 移除对应筛选条件
- Toast 提示"已从筛选条件中移除"
- book_tags 级联删除提供后端安全网

---

## 46. 移动端布局补充

### 46.1 底部 Tab Bar

移动端（<768px）底部固定三个 Tab：

| Tab | 图标 | 路径 |
|-----|------|------|
| 书架 | 📚 | `/books` |
| 录入 | ➕ | `/books/add` |
| 设置 | ⚙ | `/settings` |

桌面端保持顶部 Navbar（Logo + 搜索 + + 录入 + 头像下拉）。

### 46.2 书架页首屏布局

| 区域 | 桌面端 | 移动端 |
|------|--------|--------|
| 概览统计栏 | 完全展开 | 折叠为一行（"X 本书 · 已读 Y% · 在读 Z 本"），点击展开 |
| 搜索框 | 内联在 Navbar 侧 | 独立一行，筛选按钮旁 |
| 筛选 chips | 顶部平铺 | 顶部可横向滚动 |
| 卡片布局 | 4 列网格 | 1-2 列网格 |
| 分页 | 全量渲染（数据已在客户端） | 客户端分批渲染（初始 20 条，滚动追加，数据已在内存） |

---

## 47. 出版社处理

出版社为纯自由文本，不做 autocomplete 规范化。理由：出版社数量远大于国籍/标签，预设列表不可行；统计价值低于国籍/语言分布。接受统计噪音，不在 MVP 范围增加复杂度。

---

## 48. PWA 离线缓存

MVP 做最小 PWA，属于开发顺序第 9 步（UX 打磨）：

| 内容 | 策略 |
|------|------|
| manifest.json | 提供应用名、图标，支持「添加到主屏幕」 |
| Service Worker | 缓存 App Shell（HTML/CSS/JS），离线可看界面骨架 |
| 书籍数据 | 不做离线缓存，避免用户离线看到旧数据产生混淆 |
| 写入 | 不支持离线写入 |

---

## 49. 测试策略

MVP 测试覆盖三层，按投入产出比排列：

| 层级 | 工具 | 覆盖范围 |
|------|------|---------|
| 数据库函数 | pgTAP 或直接 SQL 测试脚本 | `upsert_book` 事务正确性（作者/标签/书籍关联） |
| 纯逻辑单元 | Vitest | 阅读状态自动流转规则（5 个条件分支 + completed_at 联动） |
| UI / Edge Function / Storage | 手动测试 | MVP 阶段不写自动化测试，不阻塞交付 |

---

## 50. 账号注销

设置页「账号设置」区域底部提供"注销账号"按钮（远离密码修改区，防误触）。

流程：
1. 点击 → 弹窗确认"此操作将永久删除你的所有数据（X 本书、Y 个作者、Z 个标签），不可撤销"
2. 输入当前密码二次确认
3. 调 Supabase Edge Function 代理 `auth.admin.deleteUser()`
4. Edge Function 清理该用户 Storage 中所有封面文件
5. 成功后跳转 `/login` + Toast "账号已注销"

`ON DELETE CASCADE` 从 profiles → books/authors/tags/book_tags 自动处理数据库层清理。

---

## 51. 本轮新增决策（第 155-190 轮）

| 轮次 | 决策 |
|------|------|
| 155 | 排序仅内存保存，刷新重置（与筛选同类） |
| 156 | 测试策略：pgTAP + Vitest + 手动 |
| 157 | 导入原子性：尽力而为 + 干跑预检 |
| 158 | 移动端"加载更多"为客户端分批渲染 |
| 159 | 详情页展示"读完于 YYYY-MM-DD" |
| 160 | 密码策略：依赖 Supabase 默认 6 字符，不加额外校验 |
| 161 | 国籍：自由文本 + autocomplete（~20 预设） |
| 162 | display_name 默认值：取邮箱 @ 前部分 |
| 163 | 出版社：纯自由文本，不做 autocomplete |
| 164 | 封面时序：前端预生成 book_id，先 move 再 RPC |
| 165 | PWA：最小 App Shell 缓存，MVP 第 9 步顺手加 |
| 166 | 手动覆盖阅读状态不做校验，完全信任用户 |
| 167 | 标签重命名冲突：弹窗提示合并 |
| 168 | 保存失败：保留编辑模式，数据不丢，可重试 |
| 169 | Edge Function 区分 not_found / service_unavailable |
| 170 | display_name 默认值用 SPLIT_PART |
| 171 | Tab 高亮：路由前缀匹配 |
| 172 | 账号注销：全自动流程（Edge Function + 二次密码确认） |
| 173 | zod 校验文案：message 字段直接写中文 |
| 174 | 应用名称："墨属"，全局常量 `APP_NAME` |
| 175 | 深色模式占位图：一套配色通吃，不做深色适配 |
| 176 | shadcn/ui 组件：Command/Popover/Sheet/AlertDialog/DropdownMenu/Skeleton/Switch 等约 18 个 |
| 177 | 品牌色：shadcn 默认 neutral，不改 |
| 178 | 应用图标：用户自备（icon-192.png / icon-512.png / favicon.ico） |
| 179 | react-hook-form：统一 `mode: "onSubmit"` |
| 180 | React Query Devtools：`import.meta.env.DEV` 条件渲染 |
| 181 | .env 不提交，`.env.example` 提交 |
| 182 | Supabase CLI 本地开发 + Docker（`supabase init` + `supabase start`） |
| 183 | Edge Function 在 Supabase Dashboard 中直接写 |
| 184 | 包管理器：pnpm |
| 185 | 字体：Tailwind 默认系统字体栈，不引入 Web 字体 |
| 186 | Vercel 部署：vercel.json SPA rewrite + VITE_ 环境变量 |
| 187 | Node.js 版本要求：20 LTS |
| 188 | Git 仓库脚手架时初始化 |
| 189 | 前置条件清单：9 项 |
| 190 | 前置条件确认后开始编码 |

---

## 52. shadcn/ui 组件映射

| 交互 | 组件 |
|------|------|
| 作者 Combobox | `Command` + `Popover`（cmdk） |
| 筛选面板 (桌面) | `Popover` |
| 筛选面板 (移动) | `Sheet`（side=bottom） |
| 标签 chips | 自写（flex wrap + badge） |
| 评分星标 | 自写（5 个 button/span 黄/灰） |
| Toast | `sonner`（shadcn 默认适配） |
| 确认弹窗 | `AlertDialog` |
| 下拉菜单 | `DropdownMenu` |
| 深色模式 Toggle | `Switch` |
| 笔记状态 | 自写 Segmented Control |
| Skeleton | `Skeleton` |
| 录入/编辑表单 | `Input` / `Textarea` / `Select` / `Label` |
| 卡片 | `Card` |
| 标签 | `Badge` |
| 头像 | `Avatar` |
| 分隔线 | `Separator` |

需用 `npx shadcn-ui@latest add` 安装约 18 个组件。

---

## 53. Vercel 部署配置

### 53.1 Environment Variables

在 Vercel 项目 Settings → Environment Variables 中设置：

| Key | 值来源 |
|-----|--------|
| `VITE_SUPABASE_URL` | Supabase 项目 Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 项目 Settings → API → anon/public key |

### 53.2 vercel.json

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

SPA fallback：所有路由请求重写到 `index.html`，由 React Router 接管前端路由。

### 53.3 构建配置

- Build Command: `pnpm build`
- Output Directory: `dist`
- Install Command: `pnpm install`
- 框架预设：Vite（Vercel 自动检测）

### 53.4 部署流程

1. `git init && git add -A && git commit -m "init: 墨属 MVP"`
2. 创建 GitHub 仓库，push
3. Vercel Dashboard → Import Project → 选择仓库
4. 设置 Environment Variables
5. Deploy

后续每次 `git push` 到主分支自动触发部署。

---

## 54. 前置条件检查清单

开工前需确认以下事项：

| # | 条件 | 状态 |
|---|------|------|
| 1 | Node.js 20 LTS 已安装 | ☐ |
| 2 | pnpm 已安装 (`npm install -g pnpm`) | ☐ |
| 3 | Docker Desktop 已安装并运行 | ☐ |
| 4 | Supabase 账号已注册 + 新项目已创建 | ☐ |
| 5 | Google Books API Key 已申请 | ☐ |
| 6 | Git 已安装 | ☐ |
| 7 | GitHub 仓库已创建 | ☐ |
| 8 | Vercel 账号已注册 | ☐ |
| 9 | 应用图标已准备（icon-192.png / icon-512.png / favicon.ico） | ☐ |

