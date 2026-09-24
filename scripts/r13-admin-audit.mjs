/* R13 admin-console real-data audit driver.
 * Logs into the admin SPA against the real backend, visits every backend-menu route,
 * and records per-page: HTTP >=400 API calls, broken images, and a screenshot. */
import puppeteer from "puppeteer";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:5179";
const OUT = "D:/6/恋爱小程序/reports/audit/2026-09-22-r13-goal";
const SHOTS = `${OUT}/shots-admin`;
mkdirSync(SHOTS, { recursive: true });

const ROUTES = JSON.parse(process.argv[2] || "[]");

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--window-size=1440,900"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const apiErrors = [];
page.on("response", async (res) => {
  const u = res.url();
  if (!u.includes("/api/")) return;
  if (res.status() >= 400) apiErrors.push({ status: res.status(), url: u });
});
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e.message)));

// --- login ---
await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
await page.waitForSelector('input[placeholder="请输入管理员账号"]', { timeout: 30000 });
await page.type('input[placeholder="请输入管理员账号"]', "local-dev-admin-openid-123456");
await page.type('input[placeholder="请输入密码"]', "Admin@12345");
await page.screenshot({ path: `${SHOTS}/000-login.png` });
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.replace(/\s/g, "").includes("登录"));
  btn.click();
});
await page.waitForFunction(() => !location.pathname.includes("/login"), { timeout: 45000 });
const postLoginUrl = page.url();
const storedUser = await page.evaluate(() => localStorage.getItem("admin_v2_user"));
await page.screenshot({ path: `${SHOTS}/001-after-login.png` });

const results = [];
let idx = 2;
for (const r of ROUTES) {
  const before = apiErrors.length;
  const errBefore = consoleErrors.length;
  try {
    await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle2", timeout: 60000 });
  } catch (e) {
    results.push({ ...r, ok: false, navError: String(e.message).slice(0, 200) });
    continue;
  }
  await new Promise((k) => setTimeout(k, 2500));
  const probe = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    const loaded = imgs.filter((i) => i.complete && i.naturalWidth > 0);
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src).slice(0, 6);
    const txt = (document.body.innerText || "").trim();
    return {
      imgTotal: imgs.length,
      imgLoaded: loaded.length,
      brokenSrcs: broken,
      textLen: txt.length,
      h1: (document.querySelector("h1,h2,.page-title")?.innerText || "").trim().slice(0, 60),
      rows: document.querySelectorAll("table tbody tr, .el-table__row, .el-card").length,
    };
  });
  const file = `${String(idx).padStart(3, "0")}${r.slug}.png`;
  await page.screenshot({ path: `${SHOTS}/${file}`, fullPage: false });
  results.push({
    ...r,
    ok: true,
    shot: file,
    apiErrors: apiErrors.slice(before),
    newConsoleErrors: consoleErrors.slice(errBefore),
    finalUrl: page.url(),
    ...probe,
  });
  idx++;
}

writeFileSync(
  `${OUT}/admin-audit.json`,
  JSON.stringify({ postLoginUrl, storedUser, apiErrorsTotal: apiErrors.length, apiErrors, consoleErrors, results }, null, 2)
);
console.log(JSON.stringify({ postLoginUrl, routes: results.length, apiErrorsTotal: apiErrors.length }, null, 2));
await browser.close();
