/* eslint-disable no-console */
/**
 * H5 构建产物诊断脚本：检查路由格式与渲染状态
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = "D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\h5";
const PORT = 8712;
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

  const puppeteer = require("D:/6/恋爱小程序/node_modules/puppeteer");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  const requests = [];
  page.on("requestfailed", (req) => requests.push(`[failed] ${req.url()} ${req.failure()?.errorText}`));
  page.on("response", (res) => {
    if (res.status() >= 400) requests.push(`[${res.status()}] ${res.url()}`);
    if (res.url().includes(".js") && res.status() === 200) {
      requests.push(`[js-ok] ${res.url().split("/").pop()}`);
    }
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      requests.push(`[console.${msg.type()}] ${msg.text().slice(0, 300)}`);
    }
  });
  page.on("pageerror", (err) => requests.push(`[pageerror] ${err.message.slice(0, 300)}`));

  // 1. 直接打开根路径
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle2", timeout: 30000 });
  // 手动 import 主模块，捕获顶层错误
  const importResult = await page.evaluate(async () => {
    try {
      const mod = await import("/assets/index-fC6G9Hx7.js");
      return { ok: true, keys: Object.keys(mod).slice(0, 10) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  console.log("[手动 import 主模块]", JSON.stringify(importResult));
  // 轮询等待 Vue 挂载（uni-app 启动可能较慢）
  let appReady = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const state = await page.evaluate(() => ({
      len: document.body.innerText.length,
      hasUni: document.querySelectorAll("uni-app, uni-page").length,
      appChildren: document.querySelector("#app")?.childElementCount ?? 0,
    }));
    if (state.len > 0 || state.hasUni > 0 || state.appChildren > 0) {
      appReady = true;
      break;
    }
  }
  const rootState = await page.evaluate(() => ({
    url: location.href,
    hash: location.hash,
    bodyLen: document.body.innerText.length,
    bodyText: document.body.innerText.slice(0, 300),
    hasUniApp: typeof window.__uniConfig !== "undefined" || document.querySelector("uni-app") !== null,
    uniTags: document.querySelectorAll("uni-app, uni-page").length,
    appChildren: document.querySelector("#app")?.childElementCount ?? 0,
    readyState: document.readyState,
  }));
  rootState.appReadyAfterPoll = appReady;
  console.log("\n[根路径状态]", JSON.stringify(rootState, null, 2));

  // 2. 尝试 hash 路由
  await page.goto(`http://127.0.0.1:${PORT}/#/pages/discover/index`, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 4000));
  const hashState = await page.evaluate(() => ({
    url: location.href,
    hash: location.hash,
    bodyLen: document.body.innerText.length,
    bodyText: document.body.innerText.slice(0, 300),
  }));
  console.log("\n[hash 路由状态]", JSON.stringify(hashState, null, 2));

  // 3. 尝试 history 路由（无 hash）
  await page.goto(`http://127.0.0.1:${PORT}/pages/discover/index`, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 4000));
  const historyState = await page.evaluate(() => ({
    url: location.href,
    hash: location.hash,
    bodyLen: document.body.innerText.length,
    bodyText: document.body.innerText.slice(0, 300),
  }));
  console.log("\n[history 路由状态]", JSON.stringify(historyState, null, 2));

  console.log("\n[网络/控制台问题]");
  for (const r of requests.slice(0, 30)) console.log("  " + r);

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
