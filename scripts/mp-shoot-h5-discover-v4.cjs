/* eslint-disable no-console */
/**
 * 寻觅页 H5 走查截图脚本（2026-08-08 v4 卡片精简验收）
 *
 * 背景：微信开发者工具 IDE 在本机无法创建 renderer 窗口（automator 链路不可用），
 * 改用 H5 构建产物 + puppeteer 完成界面走查截图（uni-app 跨端代码，视觉与交互一致；
 * mp 端差异：无胶囊、tabbar 渲染方式不同，报告中标注）。
 *
 * 截图清单（保存到 截图存档/2026-08-08-4/h5/）：
 *   01-discover-card.png      匹配主页：精简卡片（头像+双认证角标+蒙层4行）+ 底部三键操作栏
 *   02-detail-top.png         详情页顶部形象区（昵称/认证/年龄学校MBTI/距离活跃匹配度/更多操作）
 *   03-detail-basic.png       详情页「关于我」基础资料 2行4列
 *   04-detail-personality.png 性格与MBTI + 兴趣爱好分区
 *   05-detail-circles.png     兴趣圈横滑 + 期待画像
 *   06-detail-moments.png     TA的动态（贴吧式）+ 查看全部
 *   07-checkin-popup.png      签到弹窗（我的积分=钱包余额 / 连续天数 / 商城引导）
 *   08-discover-actions.png   底部操作栏细节（不喜欢48px/悄悄话64px/喜欢56px）
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = "D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\h5";
const PORT = 8711;
const OUT_DIR = "D:\\6\\恋爱小程序\\截图存档\\2026-08-08-4\\h5";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  console.log(`[server] http://127.0.0.1:${PORT}`);

  let puppeteer;
  try {
    puppeteer = require("D:/6/恋爱小程序/node_modules/puppeteer");
  } catch (e) {
    console.error("[puppeteer] 未找到:", e.message);
    process.exit(1);
  }

  // 获取真实 token（主账号 47 guest-login）
  const token = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 8080,
        path: "/api/v1/auth/guest-login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body).token);
          } catch (e) {
            reject(new Error("token parse failed: " + body.slice(0, 200)));
          }
        });
      }
    );
    req.on("error", reject);
    req.end("{}");
  });
  console.log(`[token] len=${token.length}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();

  // 注入 token（H5 端 uni.setStorageSync("token", ...) → localStorage）
  await page.evaluateOnNewDocument((tk) => {
    localStorage.setItem("token", tk);
    localStorage.setItem("uni-storage-token", tk);
  }, token);

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const shot = async (name, clip) => {
    await page.screenshot({ path: path.join(OUT_DIR, name), clip });
    console.log(`[shot] ${name}`);
  };

  // 1. 打开寻觅页
  await page.goto(`http://127.0.0.1:${PORT}/#/pages/discover/index`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  // 等待卡片渲染（卡片内容含昵称行）
  try {
    await page.waitForSelector(".card-swiper, .discover-card, .card__content", {
      timeout: 30000,
    });
  } catch (e) {
    console.error("[wait] card selector timeout, current URL:", page.url());
  }
  await new Promise((r) => setTimeout(r, 6000)); // 等推荐数据 + 图片

  // 2. 主视图截图（整页顶部 844px 高度）
  await shot("01-discover-card.png", { x: 0, y: 0, width: 390, height: 844 });

  // 3. 底部操作栏细节（放大）
  await shot("08-discover-actions.png", { x: 0, y: 620, width: 390, height: 224 });

  // 4. 点击卡片中部 → 详情 overlay（CardSwiper 手势系统监听 touch 事件）
  try {
    await page.touchscreen.tap(195, 400);
    await page.waitForSelector(".card-detail-overlay", { timeout: 15000 });
  } catch (e) {
    console.error("[click] detail overlay timeout");
  }
  await new Promise((r) => setTimeout(r, 2500));
  await shot("02-detail-top.png", { x: 0, y: 0, width: 390, height: 844 });

  // 5. 滚动详情页：基础资料 2行4列
  await page.mouse.wheel({ deltaY: 900 });
  await new Promise((r) => setTimeout(r, 1200));
  await shot("03-detail-basic.png", { x: 0, y: 0, width: 390, height: 844 });

  // 6. 性格与MBTI + 兴趣爱好
  await page.mouse.wheel({ deltaY: 900 });
  await new Promise((r) => setTimeout(r, 1200));
  await shot("04-detail-personality.png", { x: 0, y: 0, width: 390, height: 844 });

  // 7. 兴趣圈 + 期待画像
  await page.mouse.wheel({ deltaY: 900 });
  await new Promise((r) => setTimeout(r, 1200));
  await shot("05-detail-circles.png", { x: 0, y: 0, width: 390, height: 844 });

  // 8. TA的动态 + 查看全部
  await page.mouse.wheel({ deltaY: 900 });
  await new Promise((r) => setTimeout(r, 1200));
  await shot("06-detail-moments.png", { x: 0, y: 0, width: 390, height: 844 });

  // 9. 关闭详情 → 打开签到弹窗
  await page.touchscreen.tap(20, 30);
  await new Promise((r) => setTimeout(r, 800));
  try {
    await page.waitForSelector(".card-swiper, .discover-card", { timeout: 10000 });
  } catch (e) { /* ignore */ }
  // 点击签到入口（搜索栏右侧）
  try {
    await page.evaluate(() => {
      const el = document.querySelector(".top-row [class*='checkin'], [class*='check-in'], .checkin-entry, [class*='signin']");
      if (el) el.click();
    });
  } catch (e) { console.error("[checkin] entry click failed", e.message); }
  await new Promise((r) => setTimeout(r, 2500));
  await shot("07-checkin-popup.png", { x: 0, y: 0, width: 390, height: 844 });

  // 10. 收集结果
  const errors = [...new Set(consoleErrors)];
  fs.writeFileSync(
    path.join(OUT_DIR, "_run-errors.json"),
    JSON.stringify({ count: errors.length, errors: errors.slice(0, 20) }, null, 2)
  );
  console.log(`[console-errors] ${errors.length}`);
  errors.slice(0, 10).forEach((e) => console.log("  -", e.slice(0, 160)));

  await browser.close();
  server.close();
  console.log("[done]");
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
