/* eslint-disable no-console */
/**
 * H5 dev server 页面渲染验证脚本（Phase Feedback 改版验收）
 *
 * 连接 http://[::1]:5173（uni-app H5 dev server，IPv6 监听），
 * 依次访问七个页面，收集文本/截图/错误。
 */
const fs = require("node:fs");
const path = require("node:path");

const BASE = "http://[::1]:5173";

async function main() {
  const puppeteer = require("D:/6/恋爱小程序/node_modules/puppeteer");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  const errors = [];
  const requests = [];
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message.slice(0, 300)}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console.error] ${msg.text().slice(0, 300)}`);
  });
  page.on("requestfailed", (req) => requests.push(`[failed] ${req.url()} ${req.failure()?.errorText}`));

  const pagesToVisit = [
    { name: "discover(寻觅/匹配)", url: "/#/pages/discover/index" },
    { name: "home(首页)", url: "/#/pages/home/index" },
    { name: "village(圈子)", url: "/#/pages/village/index" },
    { name: "messages(消息)", url: "/#/pages/messages/index" },
    { name: "profile(我的)", url: "/#/pages/profile/index" },
    { name: "love-center(恋爱中心)", url: "/#/pages/love-center/index" },
    { name: "privacy(权限设置)", url: "/#/pages/profile/privacy" },
  ];

  const results = [];
  for (const item of pagesToVisit) {
    try {
      await page.goto(BASE + item.url, { waitUntil: "networkidle2", timeout: 60000 });
      // 轮询等待 Vue 渲染出文本
      let text = "";
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        text = await page.evaluate(() => document.body.innerText || "");
        if (text.length > 0) break;
      }
      const shotPath = `D:/6/恋爱小程序/verification_logs/feedback-dev-${item.name.split("(")[0].replace(/[^\w\u4e00-\u9fa5]/g, "")}.png`;
      await page.screenshot({ path: shotPath });
      results.push({
        page: item.name,
        ok: text.length > 0,
        textLen: text.length,
        text: text.slice(0, 200).replace(/\n/g, " | "),
        screenshot: shotPath,
      });
    } catch (err) {
      results.push({ page: item.name, ok: false, error: err.message });
    }
  }

  await browser.close();

  console.log("\n===== 页面渲染结果 =====");
  let passCount = 0;
  for (const r of results) {
    if (r.ok) passCount++;
    console.log(`\n[${r.ok ? "PASS" : "FAIL"}] ${r.page} (文本长度 ${r.textLen ?? "-"})`);
    if (r.ok) {
      console.log(`  文本: ${r.text}`);
    } else {
      console.log(`  错误: ${r.error ?? "无文本渲染"}`);
    }
  }
  console.log(`\n通过 ${passCount}/${results.length}`);
  console.log(`\n===== 页面错误（${errors.length}） =====`);
  for (const e of errors.slice(0, 15)) console.log("  " + e);
  console.log(`\n===== 请求失败（${requests.length}） =====`);
  for (const r of requests.slice(0, 10)) console.log("  " + r);

  process.exit(passCount === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
