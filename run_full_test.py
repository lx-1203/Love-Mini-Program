from playwright.sync_api import sync_playwright
import os
import json
from datetime import datetime

# 配置
SCREENSHOTS_DIR = r"d:\6\恋爱小程序\test-screenshots"
BASE_URL = "http://localhost:5173"
PREVIEW_URL = "file:///d:/6/恋爱小程序/design-preview/index.html"
REPORT_FILE = os.path.join(SCREENSHOTS_DIR, "test_report.json")

# 确保截图目录存在
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

# 全局测试结果
results = {
    "start_time": datetime.now().isoformat(),
    "tests": [],
    "errors": [],
    "console_logs": [],
    "summary": {}
}

def log_test(step, status, detail="", screenshot=None):
    results["tests"].append({
        "step": step,
        "status": status,
        "detail": detail,
        "screenshot": screenshot,
        "timestamp": datetime.now().isoformat()
    })
    print(f"[{status}] {step}: {detail}")

def save_screenshot(page, name):
    path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    return path

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--window-size=430,932"])
        context = browser.new_context(
            viewport={"width": 430, "height": 932},
            device_scale_factor=2
        )
        page = context.new_page()

        # 监听控制台日志
        page.on("console", lambda msg: results["console_logs"].append({
            "type": msg.type,
            "text": msg.text,
            "location": str(msg.location)
        }))

        # 监听页面错误
        page.on("pageerror", lambda err: results["errors"].append({
            "type": "page_error",
            "message": str(err),
            "timestamp": datetime.now().isoformat()
        }))

        # ==================== 测试1: 本地应用首页 ====================
        try:
            print("\n=== 测试1: 访问本地应用首页 ===")
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)
            ss = save_screenshot(page, "01_app_home")
            log_test("访问首页", "PASS", "首页加载成功", ss)

            # 检查可交互元素
            buttons = page.locator("button").all()
            links = page.locator("a").all()
            inputs = page.locator("input").all()
            log_test("可交互元素统计", "INFO",
                     f"buttons={len(buttons)}, links={len(links)}, inputs={len(inputs)}")

            # 检查底部导航栏
            tabbar = page.locator(".tabbar, .tab-bar, [class*='tabbar']").first
            if tabbar.is_visible():
                log_test("底部导航栏", "PASS", "导航栏可见")
                ss = save_screenshot(page, "02_tabbar_visible")
            else:
                log_test("底部导航栏", "FAIL", "导航栏未找到")

        except Exception as e:
            log_test("访问首页", "FAIL", str(e))
            ss = save_screenshot(page, "01_app_home_error")

        # ==================== 测试2: 静态设计预览页面 ====================
        try:
            print("\n=== 测试2: 访问静态设计预览页面 ===")
            page.goto(PREVIEW_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            ss = save_screenshot(page, "03_preview_home")
            log_test("访问设计预览", "PASS", "设计预览页面加载成功", ss)

            # 测试标签切换 - 首页（默认已显示）
            home_phone = page.locator(".phone").first
            if home_phone.is_visible():
                log_test("预览-首页", "PASS", "首页预览可见")
            else:
                log_test("预览-首页", "FAIL", "首页预览不可见")

            # 点击匹配标签
            match_tab = page.locator("button.preview-tab", has_text="匹配")
            if match_tab.count() > 0:
                match_tab.first.click()
                page.wait_for_timeout(1000)
                ss = save_screenshot(page, "04_preview_match")
                match_phone = page.locator("#page-match")
                if match_phone.is_visible():
                    log_test("预览-匹配页", "PASS", "匹配页切换成功", ss)
                else:
                    log_test("预览-匹配页", "FAIL", "匹配页未显示")
            else:
                log_test("预览-匹配页", "FAIL", "匹配标签未找到")

            # 点击聊天标签
            chat_tab = page.locator("button.preview-tab", has_text="聊天")
            if chat_tab.count() > 0:
                chat_tab.first.click()
                page.wait_for_timeout(1000)
                ss = save_screenshot(page, "05_preview_chat")
                chat_phone = page.locator("#page-chat")
                if chat_phone.is_visible():
                    log_test("预览-聊天页", "PASS", "聊天页切换成功", ss)
                else:
                    log_test("预览-聊天页", "FAIL", "聊天页未显示")
            else:
                log_test("预览-聊天页", "FAIL", "聊天标签未找到")

            # 点击我的标签
            profile_tab = page.locator("button.preview-tab", has_text="我的")
            if profile_tab.count() > 0:
                profile_tab.first.click()
                page.wait_for_timeout(1000)
                ss = save_screenshot(page, "06_preview_profile")
                profile_phone = page.locator("#page-profile")
                if profile_phone.is_visible():
                    log_test("预览-个人中心", "PASS", "个人中心切换成功", ss)
                else:
                    log_test("预览-个人中心", "FAIL", "个人中心未显示")
            else:
                log_test("预览-个人中心", "FAIL", "我的标签未找到")

            # 切回首页
            home_tab = page.locator("button.preview-tab", has_text="首页")
            if home_tab.count() > 0:
                home_tab.first.click()
                page.wait_for_timeout(1000)
                ss = save_screenshot(page, "07_preview_home_back")
                log_test("预览-返回首页", "PASS", "返回首页成功", ss)

        except Exception as e:
            log_test("设计预览测试", "FAIL", str(e))
            ss = save_screenshot(page, "03_preview_error")

        # ==================== 测试3: 本地应用导航测试 ====================
        try:
            print("\n=== 测试3: 本地应用导航测试 ===")
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

            # 尝试点击各个导航项
            nav_items = [
                ("首页", "/pages/discover/index"),
                ("讨论圈", "/pages/village/index"),
                ("匹配", "/pages/likes/index"),
                ("聊天", "/pages/messages/index"),
                ("我的", "/pages/profile/index"),
            ]

            for label, path in nav_items:
                try:
                    # 尝试通过文本或路径找到导航项
                    selectors = [
                        f"text={label}",
                        f"[data-path='{path}']",
                        f"a[href*='{path}']",
                    ]
                    clicked = False
                    for sel in selectors:
                        try:
                            el = page.locator(sel).first
                            if el.is_visible():
                                el.click()
                                page.wait_for_timeout(1500)
                                ss = save_screenshot(page, f"08_nav_{label}")
                                log_test(f"导航-{label}", "PASS", f"点击成功", ss)
                                clicked = True
                                break
                        except:
                            continue
                    if not clicked:
                        log_test(f"导航-{label}", "WARN", "未找到可点击元素")
                except Exception as e:
                    log_test(f"导航-{label}", "FAIL", str(e))

        except Exception as e:
            log_test("导航测试", "FAIL", str(e))

        # ==================== 测试4: 登录流程检查 ====================
        try:
            print("\n=== 测试4: 登录流程检查 ===")
            page.goto(f"{BASE_URL}/#/pages/login/index", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            ss = save_screenshot(page, "09_login_page")

            login_btn = page.locator("button, .login-btn, [class*='login']").first
            if login_btn and login_btn.is_visible():
                log_test("登录页面", "PASS", "登录按钮可见", ss)
            else:
                log_test("登录页面", "INFO", "未检测到标准登录按钮，可能是自动登录或无需登录", ss)

        except Exception as e:
            log_test("登录流程", "FAIL", str(e))

        # ==================== 测试5: 性能与加载检查 ====================
        try:
            print("\n=== 测试5: 性能检查 ===")
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)

            # 获取性能指标
            metrics = page.evaluate("""() => {
                const nav = performance.getEntriesByType('navigation')[0];
                return nav ? {
                    domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
                    loadComplete: nav.loadEventEnd - nav.startTime,
                    firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime,
                    firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
                } : {};
            }""")
            log_test("性能指标", "INFO", json.dumps(metrics, ensure_ascii=False))
            ss = save_screenshot(page, "10_performance")

        except Exception as e:
            log_test("性能检查", "FAIL", str(e))

        # ==================== 测试6: 响应式与兼容性 ====================
        try:
            print("\n=== 测试6: 响应式测试 ===")
            # 模拟不同设备尺寸
            devices = [
                ("iPhone_SE", 375, 667),
                ("iPhone_14", 390, 844),
                ("iPhone_14_Pro_Max", 430, 932),
            ]
            for name, w, h in devices:
                page.set_viewport_size({"width": w, "height": h})
                page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(1500)
                ss = save_screenshot(page, f"11_resp_{name}")
                log_test(f"响应式-{name}", "PASS", f"尺寸 {w}x{h}", ss)

        except Exception as e:
            log_test("响应式测试", "FAIL", str(e))

        # 保存报告
        results["end_time"] = datetime.now().isoformat()
        results["summary"] = {
            "total": len(results["tests"]),
            "pass": sum(1 for t in results["tests"] if t["status"] == "PASS"),
            "fail": sum(1 for t in results["tests"] if t["status"] == "FAIL"),
            "warn": sum(1 for t in results["tests"] if t["status"] == "WARN"),
            "info": sum(1 for t in results["tests"] if t["status"] == "INFO"),
            "console_errors": len([l for l in results["console_logs"] if l["type"] in ("error", "warn")]),
            "page_errors": len(results["errors"])
        }

        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        print(f"\n=== 测试完成 ===")
        print(f"报告已保存: {REPORT_FILE}")
        print(f"截图目录: {SCREENSHOTS_DIR}")
        print(f"总计: {results['summary']['total']}, 通过: {results['summary']['pass']}, 失败: {results['summary']['fail']}, 警告: {results['summary']['warn']}")

        browser.close()

if __name__ == "__main__":
    run_tests()
