/* R13: drive a REAL admin-UI management action (pin/unpin) and confirm it reaches
 * MySQL and the app-facing feed. Uses the admin's own /api Vite proxy for the read-back. */
import puppeteer from "puppeteer";
import { writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:5179";
const OUT = "D:/6/恋爱小程序/reports/audit/2026-09-22-r13-goal";
const SHOTS = `${OUT}/shots-admin`;
const TARGET = process.argv[2] || "43";

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });

const pinCalls = [];
page.on("response", async (r) => {
  const u = r.url();
  if (/village-posts\/\d+\/(un)?pin$/.test(u)) {
    let body = "";
    try { body = await r.text(); } catch { body = "<unreadable>"; }
    pinCalls.push({ url: u, status: r.status(), body: body.slice(0, 200) });
  }
});

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
await page.waitForSelector('input[placeholder="请输入管理员账号"]', { timeout: 30000 });
await page.type('input[placeholder="请输入管理员账号"]', "local-dev-admin-openid-123456");
await page.type('input[placeholder="请输入密码"]', "Admin@12345");
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.innerText.replace(/\s/g, "").includes("登录")).click();
});
await page.waitForFunction(() => !location.pathname.includes("/login"), { timeout: 45000 });

await page.goto(`${BASE}/forum/village-posts`, { waitUntil: "networkidle2", timeout: 60000 });
await page.waitForSelector("tbody tr", { timeout: 30000 });
await new Promise((k) => setTimeout(k, 1500));

// app-facing feed read-back against the real backend with a guest token.
// Uses node:http because this shell's `node` is the DevTools-bundled v16 (no global fetch).
import { request } from "node:http";

const API_HOST = "127.0.0.1";
const API_PORT = 8080;

function httpJson(method, path, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: API_HOST, port: API_PORT, path, method, headers: { "Content-Type": "application/json", ...headers } },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(d); } catch { parsed = null; }
          resolve({ status: res.statusCode, json: parsed, raw: d });
        });
      }
    );
    req.on("error", reject);
    if (bodyObj) req.write(JSON.stringify(bodyObj));
    req.end();
  });
}

const guestRes = await httpJson("POST", "/api/v1/auth/guest-login", {}, {});
const guestToken = guestRes.json?.token;
const feedOrder = async () => {
  const r = await httpJson("GET", "/api/v1/posts?page=1&size=8", { Authorization: `Bearer ${guestToken}` });
  if (r.status !== 200) return { http: r.status, ids: null };
  return { http: r.status, ids: (r.json?.items || []).map((x) => x.id + (x.isPinned ? "*" : "")) };
};

async function clickRowAction(postId, want) {
  return page.evaluate(
    (id, label) => {
      const row = [...document.querySelectorAll("tbody tr")].find((tr) => tr.querySelector("td")?.innerText.trim() === id);
      if (!row) return "row-not-found";
      const btn = [...row.querySelectorAll("button")].find((b) => b.innerText.trim() === label);
      if (!btn) return "button-not-found:" + [...row.querySelectorAll("button")].map((b) => b.innerText.trim()).join("/");
      btn.click();
      return "clicked";
    },
    postId,
    want
  );
}

const report = { target: TARGET };
report.feedBefore = await feedOrder();
report.pinClick = await clickRowAction(TARGET, "置顶");
await new Promise((k) => setTimeout(k, 2500));
report.afterPinClickCalls = [...pinCalls];
await page.screenshot({ path: `${SHOTS}/910-ui-pinned.png` });
report.feedAfterPin = await feedOrder();
report.rowStateAfterPin = await page.evaluate(
  (id) => {
    const row = [...document.querySelectorAll("tbody tr")].find((tr) => tr.querySelector("td")?.innerText.trim() === id);
    return row ? row.innerText.replace(/\s+/g, " ").slice(0, 160) : "row-not-found";
  },
  TARGET
);

report.unpinClick = await clickRowAction(TARGET, "取消置顶");
await new Promise((k) => setTimeout(k, 2500));
report.afterUnpinClickCalls = [...pinCalls];
await page.screenshot({ path: `${SHOTS}/911-ui-unpinned.png` });
report.feedAfterUnpin = await feedOrder();

writeFileSync(`${OUT}/admin-ui-management-evidence.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
