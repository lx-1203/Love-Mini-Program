/* R20（2026-09-08）小程序真实验证截图脚本
 * 连接微信开发者工具自动化端口(9420)，逐页导航截图，收集 console 错误。
 * 用法：node scripts/r20-capture.cjs [outputDir]
 */
const path = require("path");
const fs = require("fs");
const automator = require("miniprogram-automator");

// R20：automator 0.12 的 checkVersion 与新版开发者工具握手返回 undefined 导致崩溃，
// 直接短路版本检查（仅影响握手，不影响自动化能力）
try {
  const mpMod = require("miniprogram-automator/out/MiniProgram.js");
  const MP = mpMod.default || mpMod;
  if (MP && MP.prototype) {
    MP.prototype.checkVersion = async function checkVersion() {};
  }
} catch (e) {
  console.log("[patch] checkVersion patch skipped:", e.message);
}

const OUT_DIR = process.argv[2] || "D:/6/恋爱小程序/截图存档/r20";
const WS = "ws://127.0.0.1:9420";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const consoleErrors = [];

async function shot(mp, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await mp.screenshot({ path: file });
  console.log(`[shot] ${name}`);
}

async function goTo(mp, route, waitMs = 3500) {
  await mp.reLaunch(route);
  await sleep(waitMs);
  const page = await mp.currentPage();
  console.log(`[nav] ${route} -> ${page ? page.path : "?"}`);
  return page;
}

async function tapFirst(page, selector) {
  const el = await page.$(selector);
  if (!el) {
    console.log(`[tap] ${selector} NOT FOUND`);
    return false;
  }
  await el.tap();
  console.log(`[tap] ${selector} ok`);
  return true;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mp = await automator.connect({ wsEndpoint: WS });
  console.log("[connect] ok");

  mp.on("console", (msg) => {
    if (msg.type === "error" || msg.type === "warn") {
      consoleErrors.push(`[${msg.type}] ${msg.args && msg.args.join(" | ")}`);
    }
  });
  mp.on("exception", (err) => {
    consoleErrors.push(`[exception] ${err && err.message}`);
  });

  // 0. 当前页
  let page = await mp.currentPage();
  console.log("[page0]", page && page.path);

  // 1. 登录（若在登录页则点体验号按钮；其它页面视为已有会话）
  if (!page || page.path === "pages/login/index") {
    await goTo(mp, "/pages/login/index", 2500);
    page = await mp.currentPage();
    if (page && page.path === "pages/login/index") {
      await tapFirst(page, ".btn-guest");
      await sleep(4000);
      page = await mp.currentPage();
      console.log("[after-login]", page && page.path);
    }
  }
  await shot(mp, "01-after-login");

  // 2. 首页（R20：登录跳转存在竞态，reLaunch 两次确保落在 home）
  await goTo(mp, "/pages/home/index", 3000);
  page = await goTo(mp, "/pages/home/index", 5000);
  await shot(mp, "02-home-top");
  try {
    // R20：home 为页面级自然滚动，须用 miniProgram.pageScrollTo（callWxMethod 版本无效）
    await mp.pageScrollTo(560);
    await sleep(1500);
    await shot(mp, "03-home-mid");
    await mp.pageScrollTo(1250);
    await sleep(1500);
    await shot(mp, "04-home-community");
    await mp.pageScrollTo(0);
    await sleep(800);
  } catch (e) {
    console.log("[scroll-home] fail:", e.message);
  }

  // 3. 附近页
  page = await goTo(mp, "/pages/nearby/index", 4500);
  await shot(mp, "05-nearby-top");
  const circleScroll = await page.$(".circle-scroll");
  if (circleScroll && circleScroll.scrollTo) {
    try {
      await circleScroll.scrollTo(400, 0);
      console.log("[scroll] circle-scroll ok");
    } catch (e) {
      console.log("[scroll] circle-scroll fail:", e.message);
    }
  }
  await sleep(500);
  await shot(mp, "06-nearby-circles");

  // 4. 村口动态流
  page = await goTo(mp, "/subpackages/village/village/index", 4000);
  await shot(mp, "07-village-feed");

  // 5. 兴趣圈列表 + 圈内话题
  page = await goTo(mp, "/subpackages/circles/circles/index", 4000);
  await shot(mp, "08-circles-list");
  page = await goTo(mp, "/subpackages/circles/circles/topics?circleId=8", 4000);
  await shot(mp, "09-circle-topics");

  // 6. 发布动态（顶部 + 渠道选择弹层）
  page = await goTo(mp, "/subpackages/village/village/publish", 3000);
  await shot(mp, "10-publish-top");
  if (await tapFirst(page, ".publish-to__card")) {
    await sleep(800);
    await shot(mp, "11-publish-sheet");
  }

  // 7. 发布动态 v2（post 页头部重叠验证）
  page = await goTo(mp, "/subpackages/village/village/post", 3000);
  await shot(mp, "12-post-top");
  if (await tapFirst(page, ".post-to__card")) {
    await sleep(800);
    await shot(mp, "13-post-sheet");
  }

  // 8. 消息列表 → 单人聊天（R20：优先直接带 conversationId 导航，稳定可靠）
  const convId = process.argv[3] || "";
  page = await goTo(mp, "/pages/messages/index", 4000);
  await shot(mp, "14-messages");
  let chatOk = false;
  if (convId) {
    page = await goTo(
      mp,
      `/subpackages/chat/chat-session/index?conversationId=${encodeURIComponent(convId)}`,
      4000
    );
    chatOk = !!(page && page.path.includes("chat-session"));
  }
  if (!chatOk) {
    const chatItem = await page.$(".chat-item");
    if (chatItem) {
      await chatItem.tap();
      await sleep(3500);
      page = await mp.currentPage();
      chatOk = !!(page && page.path.includes("chat-session"));
    } else {
      console.log("[tap] .chat-item NOT FOUND");
    }
  }
  if (chatOk) {
    await shot(mp, "15-chat-session");
  } else {
    console.log("[warn] chat-session 未打开");
  }

  // 9. 官方助手聊天
  page = await goTo(mp, "/subpackages/chat/official-chat/index", 4500);
  await shot(mp, "16-official-chat");

  // 10. 错误汇总
  fs.writeFileSync(
    path.join(OUT_DIR, "console-errors.log"),
    consoleErrors.join("\n"),
    "utf8"
  );
  console.log(`[done] errors=${consoleErrors.length}`);

  await mp.disconnect();
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
