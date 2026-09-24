/* R13 targeted re-verification of admin image rendering after the /static -> app-assets fix. */
import puppeteer from "puppeteer";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:5179";
const OUT = "D:/6/恋爱小程序/reports/audit/2026-09-22-r13-goal";
const SHOTS = `${OUT}/shots-admin`;
mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const bad = [];
page.on("response", (r) => {
  if (r.status() >= 400 && (r.url().includes("/api/") || r.url().includes("/static/"))) {
    bad.push({ status: r.status(), url: r.url().split("?")[0] });
  }
});

const probe = () =>
  page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    const ok = imgs.filter((i) => i.complete && i.naturalWidth > 0);
    return {
      total: imgs.length,
      loaded: ok.length,
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.split("?")[0]).slice(0, 8),
      sampleOkSrcs: ok.slice(0, 3).map((i) => i.src.split("?")[0]),
      rows: document.querySelectorAll("table tbody tr, .el-table__row").length,
      text: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 260),
    };
  });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
await page.waitForSelector('input[placeholder="请输入管理员账号"]', { timeout: 30000 });
await page.type('input[placeholder="请输入管理员账号"]', "local-dev-admin-openid-123456");
await page.type('input[placeholder="请输入密码"]', "Admin@12345");
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.innerText.replace(/\s/g, "").includes("登录")).click();
});
await page.waitForFunction(() => !location.pathname.includes("/login"), { timeout: 45000 });

const report = {};

// 1) users page avatars
await page.goto(`${BASE}/content/users`, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((k) => setTimeout(k, 4000));
report.users = await probe();
await page.screenshot({ path: `${SHOTS}/900-users-after-fix.png` });

// 2) media-assets switched to approved
await page.goto(`${BASE}/content/media-assets`, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((k) => setTimeout(k, 2500));
report.mediaDefaultPending = await probe();
await page.screenshot({ path: `${SHOTS}/901-media-pending-default.png` });

const switched = await page.evaluate(() => {
  const sel = document.querySelector("select.filter-select");
  if (!sel) return "no-select";
  const opt = [...sel.options].find((o) => o.value === "approved");
  if (!opt) return "no-approved-option";
  sel.value = opt.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  return "ok";
});
await new Promise((k) => setTimeout(k, 4000));
report.mediaApproved = await probe();
report.switchResult = switched;
await page.screenshot({ path: `${SHOTS}/902-media-approved.png` });

// 3) open first detail dialog to prove big preview renders
report.detail = await page.evaluate(async () => {
  const btn = [...document.querySelectorAll("button, .thumb, [class*='card']")].find((b) =>
    /详情|查看|预览|detail/i.test(b.innerText || "") || b.className.toString().includes("thumb")
  );
  if (!btn) return "no-detail-trigger";
  btn.click();
  return "clicked";
});
await new Promise((k) => setTimeout(k, 2500));
report.mediaDetail = await probe();
await page.screenshot({ path: `${SHOTS}/903-media-detail.png` });

report.badResponses = bad;
writeFileSync(`${OUT}/admin-image-recheck.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
