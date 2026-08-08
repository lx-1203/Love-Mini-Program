/**
 * 2026-08-08 走查收尾：匹配页 H5 运行时验证截图
 * 1. API 登录超级账号拿 token
 * 2. puppeteer 打开 H5（localhost:5173），注入 token
 * 3. 截图匹配页（验证卡片大图 + 13 项信息区块）
 */
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const BASE = "http://127.0.0.1:8080/api/v1";
const H5 = "http://localhost:5173";
const OUT_DIR = path.join(__dirname, "..", "test-screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function login() {
  const res = await fetch(`${BASE}/auth/phone-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "19900000000", password: "Admin@12345" }),
  });
  const data = await res.json();
  if (!data.token) throw new Error("login failed: " + JSON.stringify(data).slice(0, 200));
  console.log(`[login] token len=${data.token.length} userId=${data.userId}`);
  return data.token;
}

(async () => {
  const token = await login();
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();

  await page.evaluateOnNewDocument((tk) => {
    localStorage.setItem("token", tk);
    localStorage.setItem("uni-storage-token", tk);
    // 跳过引导/隐私弹窗
    localStorage.setItem("campus-love:privacy-authorized", "1");
    localStorage.setItem("uni-storage-campus-love:privacy-authorized", "1");
  }, token);

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  console.log("[navigate] discover page ...");
  await page.goto(`${H5}/#/pages/discover/index`, { waitUntil: "networkidle2", timeout: 60000 });
  // 等待卡片渲染（网络图片加载完成）
  await page.waitForSelector(".card--current", { timeout: 30000 }).catch(() => console.log("[warn] .card--current not found"));
  await new Promise((r) => setTimeout(r, 6000));
  await page.screenshot({ path: path.join(OUT_DIR, "verify-discover-card.png") });
  console.log("[shot] verify-discover-card.png saved");

  // 检查卡片关键区块是否渲染
  const info = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    return {
      hasCard: !!q(".card--current"),
      name: q(".card__name")?.textContent ?? null,
      meta: q(".card__meta")?.textContent ?? null,
      basics: q(".card__basics-item")?.textContent ?? null,
      bio: q(".card__bio")?.textContent?.slice(0, 20) ?? null,
      tags: q(".tag-pill")?.textContent ?? null,
      mbti: q(".card__mbti-badge")?.textContent ?? null,
      expect: q(".card__expect-title")?.textContent ?? null,
      postPreview: q(".card__post-preview-title")?.textContent ?? null,
      actionBar: !!q(".action-bar") || !!q("[class*=action-bar]"),
      bgImgLoaded: (() => {
        const img = q(".card__bg");
        if (!img) return "no-img";
        return img.complete && img.naturalWidth > 0 ? "loaded" : "pending/fail";
      })(),
    };
  });
  console.log("[card-info]", JSON.stringify(info, null, 2));

  if (consoleErrors.length) {
    console.log("[console-errors]", consoleErrors.slice(0, 5));
  }
  await browser.close();
})().catch((e) => {
  console.error("[verify failed]", e);
  process.exit(1);
});
