/**
 * Admin 全页面截图脚本 v2（编译渲染实际效果图采集）。
 * 用法：node shots-admin.mjs
 * 前置：5177 dev server + 8080 后端已启动。
 * v2：健壮等待（侧边栏/内容选择器）+ 失败重载 + 关键交互态（批量条/详情弹窗/调阅弹窗）。
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const EXEC = path.join(HOME, "AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe");
const BASE = "http://127.0.0.1:5177";
const OUT = path.resolve("shots/admin-actual");
fs.mkdirSync(OUT, { recursive: true });

const USER = "local-dev-admin-openid-123456";
const PASS = "Admin@123456";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EXEC,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

/** 等待任一选择器出现（整页加载 + 动态路由重入），超时重载一次 */
async function gotoAndWait(url, selector, label) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    } catch {
      /* networkidle 超时继续等选择器 */
    }
    try {
      await page.waitForSelector(selector, { timeout: 12000 });
      await sleep(1500);
      return true;
    } catch {
      console.warn(`retry ${attempt + 1} for ${label || url}`);
      await sleep(800);
    }
  }
  return false;
}

// 1) 登录页截图（先等 .login-card 确保样式/挂载完成）
const loginOk = await gotoAndWait(`${BASE}/login`, ".login-card", "login");
if (loginOk) {
  await page.screenshot({ path: path.join(OUT, "00-login.png"), fullPage: false });
  console.log("login page shot");
}

// 2) 登录
await page.waitForSelector("input", { timeout: 15000 });
const inputs = await page.$$("input");
await inputs[0].type(USER, { delay: 10 });
await inputs[1].type(PASS, { delay: 10 });
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
  page.click("button.login-button"),
]);
await page.waitForSelector("aside.sidebar", { timeout: 20000 }).catch(() => {});
await sleep(2000);
console.log("after login url:", page.url());

// 3) 枚举侧边栏菜单链接
const links = await page.$$eval("aside a.menu-item", (as) =>
  as.map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })),
);
console.log("menu links:", links.length);

// 4) 逐页截图（整页），等待侧边栏+内容容器渲染
let idx = 1;
const seen = new Set();
const shots = [];
for (const link of links) {
  if (!link.href || seen.has(link.href)) continue;
  seen.add(link.href);
  const url = `${BASE}${link.href}`;
  const ok = await gotoAndWait(url, "aside.sidebar .layout-content, aside.sidebar, .layout-content", link.text);
  const safe = `${String(idx).padStart(2, "0")}-${link.href.replace(/^\/+/, "").replace(/[/?#]/g, "_") || "dashboard"}-${link.text}`;
  await page.screenshot({ path: path.join(OUT, `${safe}.png`), fullPage: true });
  shots.push({ safe, ok, href: link.href });
  console.log("shot:", safe, ok ? "" : "(TIMEOUT)");
  idx++;
}

// 5) 关键交互态：用户管理（勾选→批量条 / 查看详情弹窗）
const usersLink = links.find((l) => l.href.includes("content/users")) || links.find((l) => l.href.includes("user"));
console.log("users link:", usersLink && usersLink.href);
const usersUrl = `${BASE}${(usersLink || {}).href || "/"}`;
if (await gotoAndWait(usersUrl, ".data-table", "users-interactive")) {
  // 5a. 勾选第一行 → 批量条
  const checkbox = await page.$("tbody input[type=checkbox]");
  if (checkbox) {
    await checkbox.click();
    await sleep(600);
    await page.screenshot({ path: path.join(OUT, "90-users-batch-bar.png"), fullPage: false });
    console.log("shot: users batch bar");
  }
  // 5b. 查看详情弹窗
  const viewBtn = await page.$("tbody .action-button.view");
  if (viewBtn) {
    await viewBtn.click();
    await page.waitForSelector(".detail-modal, .modal", { timeout: 10000 }).catch(() => {});
    await sleep(1800);
    await page.screenshot({ path: path.join(OUT, "91-user-detail-modal.png"), fullPage: false });
    console.log("shot: user detail modal");
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(400);
  }
}

// 6) 关键交互态：举报管理 → 调阅弹窗
const reportsLink = links.find((l) => l.href.includes("reports"));
if (reportsLink) {
  const reportsUrl = `${BASE}${reportsLink.href}`;
  if (await gotoAndWait(reportsUrl, ".data-table", "reports-interactive")) {
    const evBtn = await page.$("tbody .action-button.audit");
    if (evBtn) {
      await evBtn.click();
      await page.waitForSelector(".evidence-modal", { timeout: 10000 }).catch(() => {});
      await sleep(1800);
      await page.screenshot({ path: path.join(OUT, "92-report-evidence-modal.png"), fullPage: false });
      console.log("shot: report evidence modal");
    } else {
      console.log("no USER-type report row for evidence modal");
    }
  }
}

// 7) 圈层管理页（三级色阶卡）单独视口截图
const circleLink = links.find((l) => l.href.includes("circle-layers"));
if (circleLink) {
  if (await gotoAndWait(`${BASE}${circleLink.href}`, ".grade-card", "circle-layers")) {
    await page.screenshot({ path: path.join(OUT, "93-circle-grade-card.png"), fullPage: false });
    console.log("shot: circle grade card");
  }
}

await browser.close();
console.log("done ->", OUT);
