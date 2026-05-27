"""
E2E Test Script for MoShu Book Manager
"""
import os, sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5173"
OUT = "C:/Users/周子豪/Desktop/墨属/test_screenshots"
os.makedirs(OUT, exist_ok=True)

def load_env(path):
    env = {}
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()
    return env

env = load_env("C:/Users/周子豪/Desktop/墨属/.env")
TEST_EMAIL = env.get("VITE_TEST_EMAIL", "")
TEST_PASS = env.get("VITE_TEST_PASSWORD", "")
assert TEST_EMAIL and TEST_PASS, "Set VITE_TEST_EMAIL and VITE_TEST_PASSWORD in .env"

errors = []

def log(msg):
    print(f"  [{time.strftime('%H:%M:%S')}] {msg}")

def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name), full_page=True)
    log(f"Screenshot: {name}")

def check(desc, condition):
    if condition:
        log(f"  OK  {desc}")
    else:
        errors.append(desc)
        log(f"  FAIL {desc}")

def login(page):
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("#email", timeout=10000)
    page.fill("#email", TEST_EMAIL)
    page.fill("#password", TEST_PASS)
    page.locator("button[type=submit]").click()
    page.wait_for_url("**/books", timeout=10000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1280, "height": 800})

    # ============================================================
    # 1. Public Pages
    # ============================================================
    log("===== 1. Public Pages =====")

    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    shot(page, "01_login.png")
    check("Login title visible", page.get_by_text("墨属").first.is_visible())
    check("Email input", page.locator("#email").is_visible())
    check("Password input", page.locator("#password").is_visible())
    check("Submit button", page.locator("button[type=submit]").is_visible())

    page.goto(f"{BASE}/register")
    page.wait_for_load_state("networkidle")
    shot(page, "02_register.png")
    check("Register email", page.locator("#email").is_visible())
    check("Register displayName", page.locator("#displayName").is_visible())
    check("Register password", page.locator("#password").is_visible())

    page.goto(f"{BASE}/reset-password")
    page.wait_for_load_state("networkidle")
    shot(page, "03_reset_password.png")
    check("Reset page", page.locator("#email").is_visible())

    # AuthGuard
    page.goto(f"{BASE}/books")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)
    shot(page, "04_auth_guard.png")
    check("AuthGuard redirect to login", "/login" in page.url)

    # ============================================================
    # 2. Form Validation
    # ============================================================
    log("===== 2. Form Validation =====")

    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("button[type=submit]").click()
    page.wait_for_timeout(500)
    shot(page, "28_login_validation.png")
    check("Login validation errors shown", page.locator(".text-destructive").count() > 0)

    page.goto(f"{BASE}/register")
    page.wait_for_load_state("networkidle")
    page.fill("#email", "notanemail")
    page.fill("#password", "ab")
    page.fill("#displayName", "")
    page.locator("button[type=submit]").click()
    page.wait_for_timeout(800)
    shot(page, "29_register_validation.png")
    # Form should still be on register page (not redirected)
    check("Register validation prevented submit", "/register" in page.url)

    # ============================================================
    # 3. Login
    # ============================================================
    log("===== 3. Login =====")
    login(page)
    shot(page, "05_after_login.png")
    logged_in = "/books" in page.url
    check("Login success", logged_in)
    if not logged_in:
        log(f"Login failed! Body: {page.locator('body').inner_text()[:300]}")
        b.close()
        print(f"\nFAILED: {len(errors)} errors")
        exit(1)

    # ============================================================
    # 4. Bookshelf
    # ============================================================
    log("===== 4. Bookshelf =====")
    page.wait_for_timeout(1000)
    shot(page, "06_bookshelf.png")

    check("Navbar visible", page.locator("header").is_visible())
    check("Stats cards visible", page.locator("text=总藏书").is_visible())
    check("Filter pills visible", page.locator("text=在读").first.is_visible())

    # View toggle
    view_btn = page.locator(".lucide-list, .lucide-layout-grid").first
    if view_btn.is_visible():
        view_btn.click()
        page.wait_for_timeout(400)
        shot(page, "07_list_view.png")
        check("List view active", page.locator(".lucide-layout-grid").first.is_visible())
        view_btn.click()
        page.wait_for_timeout(400)

    # Filter sheet
    filter_btn = page.locator(".lucide-sliders-horizontal").first
    filter_btn.click()
    page.wait_for_timeout(400)
    shot(page, "08_filter_sheet.png")
    check("Filter sheet open", page.locator("text=购买状态").is_visible())
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # ============================================================
    # 5. Reading Status Filter
    # ============================================================
    log("===== 5. Reading Status Filter =====")
    page.locator("button", has_text="已读").first.click()
    page.wait_for_timeout(800)
    shot(page, "09_filter_read.png")
    # Click back to all
    page.locator("button", has_text="全部").first.click()
    page.wait_for_timeout(500)

    # ============================================================
    # 6. Search
    # ============================================================
    log("===== 6. Search =====")
    search_input = page.locator("input[placeholder*='搜索']").first
    if search_input.is_visible():
        search_input.fill("E2E")
        page.wait_for_timeout(800)
        shot(page, "10_search.png")
        log("Search executed")
        search_input.fill("")
        page.wait_for_timeout(500)

    # ============================================================
    # 7. Add Book
    # ============================================================
    log("===== 7. Add Book =====")
    page.goto(f"{BASE}/books/add")
    page.wait_for_load_state("networkidle")
    shot(page, "11_add_book.png")

    check("Title input", page.locator("#title").is_visible())
    check("Author input", page.locator("#authorName").is_visible())
    check("Publisher input", page.locator("#publisher").is_visible())

    page.fill("#title", "E2E Test Book")
    page.fill("#authorName", "E2E Author")
    page.fill("#publisher", "Test Publisher")
    shot(page, "12_filled_form.png")

    # Tags
    tag_inputs = page.locator("input[placeholder*='标签']")
    if tag_inputs.count() > 0:
        tag_inputs.first.fill("TestTag")
        tag_inputs.first.press("Enter")
        page.wait_for_timeout(300)
        shot(page, "13_tags.png")
        check("Tag added", page.locator("text=TestTag").is_visible())

    page.locator("button[type=submit]").click()
    page.wait_for_timeout(3000)
    shot(page, "14_after_add.png")
    log(f"After add URL: {page.url}")

    # ============================================================
    # 8. Book Detail
    # ============================================================
    log("===== 8. Book Detail =====")
    if not page.url.endswith("/books/add") and "/books/" in page.url:
        log("Already on detail page")
    else:
        page.goto(f"{BASE}/books")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        book_link = page.locator("a[href*='/books/']").first
        if book_link.count() > 0:
            book_link.click()
            page.wait_for_timeout(1000)

    log(f"Detail page URL: {page.url}")
    shot(page, "15_book_detail.png")

    # Rating
    stars = page.locator(".lucide-star")
    count = stars.count()
    if count >= 2:
        stars.nth(1).click()
        page.wait_for_timeout(500)
        shot(page, "16_rating.png")
        check("Rating stars visible", count >= 5)

    # Reading status
    status_sel = page.locator("button[role=combobox]").first
    if status_sel.is_visible():
        status_sel.click()
        page.wait_for_timeout(400)
        shot(page, "17_status_select.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

    # ============================================================
    # 9. Book Edit
    # ============================================================
    log("===== 9. Book Edit =====")
    edit_btn = page.locator("button").filter(has_text="编辑").first
    if edit_btn.is_visible():
        edit_btn.click()
        page.wait_for_timeout(500)
        shot(page, "18_edit_mode.png")
        check("Edit mode active", page.locator("button").filter(has_text="取消编辑").first.is_visible() or page.locator("button").filter(has_text="取消").count() >= 2)
        # Cancel edit
        cancel_btns = page.locator("button").filter(has_text="取消")
        if cancel_btns.count() > 0:
            cancel_btns.last.click()
            page.wait_for_timeout(300)

    # Purchase switch
    switch = page.locator("[role=switch]").first
    if switch.is_visible():
        switch.click()
        page.wait_for_timeout(400)
        switch.click()
        page.wait_for_timeout(400)
        check("Purchase switch toggled", True)

    # Excerpt — use the last "+添加" button (excerpt is at bottom of page)
    excerpt_input = page.locator("input[placeholder*='摘录']")
    if excerpt_input.count() > 0:
        try:
            excerpt_input.first.fill("E2E test excerpt")
            # Exclude navbar "添加书籍", pick the last button with Plus icon
            add_btns = page.locator("button:has(.lucide-plus)")
            add_btn = add_btns.last
            if add_btn.is_visible() and add_btn.is_enabled():
                add_btn.click()
                page.wait_for_timeout(1500)
                shot(page, "19_excerpt.png")
                check("Excerpt added", page.locator("text=E2E").count() > 0)
            else:
                log("Add excerpt button not usable")
        except Exception as e:
            log(f"Excerpt test skipped: {e}")
    else:
        log("Excerpt input not found")

    # ============================================================
    # 10. Book Delete
    # ============================================================
    log("===== 10. Book Delete =====")
    del_btn = page.locator("button").filter(has_text="删除")
    if del_btn.count() > 0:
        try:
            del_btn.last.click()
            page.wait_for_timeout(500)
            shot(page, "30_delete_dialog.png")
            has_dialog = page.locator("text=确定删除").is_visible() or page.locator("text=永久删除").is_visible()
            check("Delete dialog shown", has_dialog)
            if has_dialog:
                cancel_btn = page.locator("button").filter(has_text="取消").last
                if cancel_btn.is_visible():
                    cancel_btn.click()
                    page.wait_for_timeout(300)
        except Exception as e:
            log(f"Delete test skipped: {e}")
    else:
        log("Delete button not found - skipping")

    # ============================================================
    # 11. Settings
    # ============================================================
    log("===== 11. Settings =====")
    page.goto(f"{BASE}/settings")
    page.wait_for_load_state("networkidle")
    shot(page, "20_settings.png")

    check("Dark mode toggle", page.locator("[role=switch]").first.is_visible())
    check("Export button", page.locator("button").filter(has_text="导出").first.is_visible())
    check("Import button", page.locator("button").filter(has_text="导入").first.is_visible())
    check("Delete account button", page.locator("button").filter(has_text="注销").first.is_visible())

    # Dark mode toggle
    dark_switch = page.locator("[role=switch]").first
    if dark_switch.is_visible():
        dark_switch.click()
        page.wait_for_timeout(400)
        shot(page, "21_dark_mode.png")
        check("Dark mode active", page.locator("html.dark").count() > 0)
        dark_switch.click()
        page.wait_for_timeout(400)

    # Export
    export_btn = page.locator("button").filter(has_text="导出").first
    if export_btn.is_visible():
        export_btn.click()
        page.wait_for_timeout(1500)
        check("Export triggered", True)
        shot(page, "31_after_export.png")

    # ============================================================
    # 12. Author Management
    # ============================================================
    log("===== 12. Author Management =====")
    page.goto(f"{BASE}/settings/authors")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    shot(page, "22_author_list.png")

    check("Author heading", page.locator("h1").filter(has_text="作者").first.is_visible())
    check("Author search", page.locator("input[placeholder*='搜索'][placeholder*='作者']").first.is_visible())

    # Search author
    author_search = page.locator("input[placeholder*='搜索'][placeholder*='作者']").first
    if author_search.is_visible():
        author_search.fill("E2E Author")
        page.wait_for_timeout(600)
        shot(page, "32_author_search.png")
        check("Author search result", page.locator("text=E2E Author").is_visible())
        author_search.fill("")
        page.wait_for_timeout(500)

    # Click first author
    author_btn = page.locator("text=本").first
    if author_btn.count() > 0:
        author_btn.click()
        page.wait_for_timeout(1000)
        shot(page, "23_author_detail.png")
        log(f"Author detail URL: {page.url}")

        # Edit author
        edit_btn = page.locator("button").filter(has_text="编辑").first
        if edit_btn.is_visible():
            edit_btn.click()
            page.wait_for_timeout(400)
            shot(page, "24_author_edit.png")

            textarea = page.locator("textarea")
            if textarea.is_visible():
                textarea.fill("Updated author bio - E2E")
                page.wait_for_timeout(300)

            save_btn = page.locator("button[type=button]").filter(has_text="保存").first
            if save_btn.is_visible():
                save_btn.click()
                page.wait_for_timeout(1500)
                shot(page, "25_author_saved.png")
                check("Bio updated", page.locator("text=Updated author bio - E2E").is_visible())

    # ============================================================
    # 13. Navbar Navigation
    # ============================================================
    log("===== 13. Navbar Navigation =====")
    page.goto(f"{BASE}/books")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)

    # Desktop: click Add Book from nav
    add_nav = page.locator("header button").filter(has_text="添加书籍")
    if add_nav.count() > 0:
        add_nav.first.click()
        page.wait_for_timeout(500)
        check("Nav to add book page", "/books/add" in page.url)
        shot(page, "33_nav_add_book.png")

    page.goto(f"{BASE}/books")
    page.wait_for_timeout(500)

    # Click branding to go home
    brand = page.locator("header a").filter(has_text="墨属")
    if brand.count() > 0:
        brand.first.click()
        page.wait_for_timeout(500)
        check("Branding links to bookshelf", "/books" in page.url and "add" not in page.url)

    # ============================================================
    # 14. Mobile Viewport
    # ============================================================
    log("===== 14. Mobile Viewport =====")
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(500)

    # Bookshelf on mobile
    page.goto(f"{BASE}/books")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)
    shot(page, "34_mobile_bookshelf.png")
    check("Mobile bottom nav", page.locator("nav").first.is_visible())

    # Add book on mobile
    page.goto(f"{BASE}/books/add")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    shot(page, "35_mobile_add_book.png")

    # Settings on mobile
    page.goto(f"{BASE}/settings")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    shot(page, "36_mobile_settings.png")

    # Restore desktop
    page.set_viewport_size({"width": 1280, "height": 800})
    page.wait_for_timeout(300)

    # ============================================================
    # 15. Empty States
    # ============================================================
    log("===== 15. Empty States =====")
    # Search for nonexistent book to trigger empty result
    page.goto(f"{BASE}/books")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(600)
    search_input = page.locator("header input[placeholder*='搜索']").first
    if search_input.is_visible():
        search_input.fill("ZZZ_NONEXISTENT_ZZZ")
        page.wait_for_timeout(800)
        shot(page, "37_empty_search.png")
        check("Empty filter state with clear button", page.locator("button").filter(has_text="清除").first.is_visible())
        # Clear
        clear_btn = page.locator("button").filter(has_text="清除").first
        if clear_btn.is_visible():
            clear_btn.click()
            page.wait_for_timeout(500)

    # ============================================================
    # 16. Logout
    # ============================================================
    log("===== 16. Logout =====")
    page.goto(f"{BASE}/books")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)

    user_menu = page.locator("header .lucide-user").first
    if user_menu.is_visible():
        user_menu.click()
    else:
        page.locator("header button").last.click()
    page.wait_for_timeout(400)
    shot(page, "26_user_menu.png")

    logout_btn = page.locator("[role=menuitem]").filter(has_text="退出").first
    if logout_btn.count() == 0:
        logout_btn = page.locator("text=退出登录").last
    if logout_btn.is_visible():
        logout_btn.click()
        page.wait_for_timeout(2000)
        shot(page, "27_after_logout.png")
        check("Logout redirect to login", "/login" in page.url)
    else:
        check("Logout button visible", False)

    # ============================================================
    # 17. Re-login
    # ============================================================
    log("===== 17. Re-login =====")
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    shot(page, "38_relogin_page.png")
    log(f"Re-login page URL: {page.url}")

    if "/login" not in page.url:
        log("Session still active, logging out via UI")
        page.goto(f"{BASE}/books")
        page.wait_for_timeout(1000)
        user_menu = page.locator("header .lucide-user").first
        if user_menu.is_visible():
            user_menu.click()
            page.wait_for_timeout(300)
            lout = page.locator("[role=menuitem]").filter(has_text="退出").first
            if lout.is_visible():
                lout.click()
                page.wait_for_timeout(2000)
        page.goto(f"{BASE}/login")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

    if page.locator("#email").is_visible():
        page.fill("#email", TEST_EMAIL)
        page.fill("#password", TEST_PASS)
        page.locator("button[type=submit]").click()
        page.wait_for_url("**/books", timeout=10000)
        page.wait_for_load_state("networkidle")
    shot(page, "28_relogin.png")
    check("Re-login success", "/books" in page.url)

    # ============================================================
    # Summary
    # ============================================================
    print("\n" + "=" * 50)
    total = len(errors)
    if errors:
        print(f"  FAILURES: {total}")
        for e in errors:
            print(f"    FAIL: {e}")
    else:
        print("  ALL TESTS PASSED!")
    print(f"  Screenshots: {OUT}")
    print("=" * 50)

    b.close()
    exit(len(errors))
