/* eslint-disable no-console */
/**
 * H5 构建产物验证脚本（Phase Feedback 改版验收）
 *
 * 启动本地静态服务器（http://127.0.0.1:8711），
 * 用 puppeteer 打开小程序 H5 构建产物，依次访问五个主 Tab 页面，
 * 收集页面标题、关键区块文本与截图，验证改版后的页面能正常渲染。
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = "D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\h5";
const PORT = 8711;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, urlPath);
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
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  console.log(`[server] http://127.0.0.1:${PORT}`);

  // 定位 puppeteer（monorepo 根 node_modules）
  let puppeteer;
  try {
    puppeteer = require("D:/6/恋爱小程序/node_modules/puppeteer");
  } catch (e) {
    console.error("[puppeteer] 未找到:", e.message);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  const results = [];
  const errors = [];

  // 监听页面错误
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console.error] ${msg.text().slice(0, 200)}`);
  });

  const pagesToVisit = [
    { name: "discover(寻觅/匹配)", url: "/#/pages/discover/index" },
    { name: "home(首页)", url: "/#/pages/home/index" },
    { name: "village(圈子)", url: "/#/pages/village/index" },
    { name: "messages(消息)", url: "/#/pages/messages/index" },
    { name: "profile(我的)", url: "/#/pages/profile/index" },
    { name: "love-center(恋爱中心)", url: "/#/pages/love-center/index" },
    { name: "privacy(权限设置)", url: "/#/pages/profile/privacy" },
  ];

  for (const item of pagesToVisit) {
    try {
      await page.goto(`http://127.0.0.1:${PORT}${item.url}`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      // 等待 Vue 渲染
      await new Promise((r) => setTimeout(r, 2500));
      const text = await page.evaluate(() => document.body.innerText.slice(0, 600));
      const shotPath = `D:/6/恋爱小程序/verification_logs/feedback-${item.name.split("(")[0].replace(/[^\w\u4e00-\u9fa5]/g, "")}.png`;
      fs.mkdirSync(path.dirname(shotPath), { recursive: true });
      await page.screenshot({ path: shotPath, fullPage: false });
      results.push({ page: item.name, ok: true, text: text.slice(0, 120).replace(/\n/g, " | "), screenshot: shotPath });
    } catch (err) {
      results.push({ page: item.name, ok: false, error: err.message });
    }
  }

  await browser.close();
  server.close();

  console.log("\n===== 验证结果 =====");
  for (const r of results) {
    console.log(`\n[${r.ok ? "PASS" : "FAIL"}] ${r.page}`);
    if (r.ok) {
      console.log(`  文本: ${r.text}`);
      console.log(`  截图: ${r.screenshot}`);
    } else {
      console.log(`  错误: ${r.error}`);
    }
  }
  console.log(`\n===== 页面错误（${errors.length}） =====`);
  for (const e of errors.slice(0, 20)) console.log("  " + e);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
