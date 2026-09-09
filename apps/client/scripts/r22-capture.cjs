/* R22（2026-09-09）健壮版回归截图脚本
 * 每个页面步骤独立 try/catch；连接断开/超时自动重连；单页失败不中断整轮。
 * 用法：node scripts/r22-capture.cjs [outputDir] [conversationId]
 */
const path = require("path");
const fs = require("fs");
const automator = require("miniprogram-automator");

try {
  const mpMod = require("miniprogram-automator/out/MiniProgram.js");
  const MP = mpMod.default || mpMod;
  if (MP && MP.prototype) MP.prototype.checkVersion = async function checkVersion() {};
} catch (e) {
  console.log("[patch] skipped:", e.message);
}

const OUT_DIR = process.argv[2] || "D:/6/恋爱小程序/截图存档/r20";
const CONV_ID = process.argv[3] || "";
const WS = "ws://127.0.0.1:9420";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const consoleErrors = [];
let mp = null;

async function connect() {
  for (let i = 0; i < 3; i++) {
    try {
      const m = await automator.connect({ wsEndpoint: WS });
      m.on("console", (msg) => {
        if (msg.type === "error") consoleErrors.push(`[error] ${(msg.args || []).join(" | ")}`);
      });
      m.on("exception", (err) => consoleErrors.push(`[exception] ${err && err.message}`));
      console.log("[connect] ok");
      return m;
    } catch (e) {
      console.log(`[connect] retry ${i + 1}: ${e.message}`);
      await sleep(3000);
    }
  }
  throw new Error("无法连接自动化端口");
}

/** 带重连的超时保护：promise 超时后重连一次再试 */
async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await Promise.race([
        fn(mp),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000)),
      ]);
    } catch (e) {
      console.log(`[${label}] attempt ${attempt} fail: ${e.message}`);
      try { if (mp) await mp.disconnect(); } catch (_) {}
      await sleep(2000);
      mp = await connect();
    }
  }
  throw new Error(`${label} 连续失败`);
}

async function shot(name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await withRetry((m) => m.screenshot({ path: file }), `shot:${name}`);
  console.log(`[shot] ${name}`);
}

async function nav(route, waitMs = 3500) {
  await withRetry(async (m) => {
    await m.reLaunch(route);
    await sleep(waitMs);
  }, `nav:${route}`);
  const page = await withRetry((m) => m.currentPage(), `cur:${route}`);
  console.log(`[nav] ${route} -> ${page ? page.path : "?"}`);
  return page;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  mp = await connect();

  // 登录态确认（连续两次 reLaunch home 对冲登录跳转竞态）
  await nav("/pages/discover/index", 3000).catch(() => {});
  await nav("/pages/home/index", 3000).catch(() => {});
  await nav("/pages/home/index", 5000).catch(() => {});
  await shot("02-home-top").catch((e) => console.log(e.message));
  try {
    await mp.pageScrollTo(560); await sleep(1200);
    await shot("03-home-mid");
    await mp.pageScrollTo(1250); await sleep(1200);
    await shot("04-home-community");
    await mp.pageScrollTo(0); await sleep(600);
  } catch (e) { console.log("[scroll-home]", e.message); }

  await nav("/pages/nearby/index", 5000).catch(() => {});
  await shot("05-nearby-top").catch(() => {});
  try {
    const page = await withRetry((m) => m.currentPage(), "cur-nearby");
    const cs = page && (await page.$(".circle-scroll"));
    if (cs && cs.scrollTo) { await cs.scrollTo(400, 0); await sleep(400); }
  } catch (e) { console.log("[nearby-scroll]", e.message); }
  await shot("06-nearby-circles").catch(() => {});

  await nav("/subpackages/village/village/index", 4000).catch(() => {});
  await shot("07-village-feed").catch(() => {});

  await nav("/subpackages/circles/circles/index", 4000).catch(() => {});
  await shot("08-circles-list").catch(() => {});

  await nav("/subpackages/circles/circles/topics?circleId=8", 4000).catch(() => {});
  await shot("09-circle-topics").catch(() => {});

  await nav("/subpackages/village/village/publish", 3000).catch(() => {});
  await shot("10-publish-top").catch(() => {});
  try {
    const page = await withRetry((m) => m.currentPage(), "cur-pub");
    const card = page && (await page.$(".publish-to__card"));
    if (card) { await card.tap(); await sleep(900); }
    await shot("11-publish-sheet");
  } catch (e) { console.log("[pub-sheet]", e.message); }

  await nav("/subpackages/village/village/post", 3000).catch(() => {});
  await shot("12-post-top").catch(() => {});
  try {
    const page = await withRetry((m) => m.currentPage(), "cur-post");
    const card = page && (await page.$(".post-to__card"));
    if (card) { await card.tap(); await sleep(900); }
    await shot("13-post-sheet");
  } catch (e) { console.log("[post-sheet]", e.message); }

  await nav("/pages/messages/index", 4000).catch(() => {});
  await shot("14-messages").catch(() => {});

  let chatOk = false;
  if (CONV_ID) {
    const page = await nav(`/subpackages/chat/chat-session/index?conversationId=${encodeURIComponent(CONV_ID)}`, 4000).catch(() => null);
    chatOk = !!(page && page.path && page.path.includes("chat-session"));
  }
  if (!chatOk) {
    const page = await nav("/subpackages/chat/chat-session/index?userId=10001", 4000).catch(() => null);
    chatOk = !!(page && page.path && page.path.includes("chat-session"));
  }
  if (chatOk) await shot("15-chat-session").catch(() => {});
  else console.log("[warn] chat-session 未打开");

  await nav("/subpackages/chat/official-chat/index", 5000).catch(() => {});
  await shot("16-official-chat").catch(() => {});

  fs.writeFileSync(path.join(OUT_DIR, "console-errors.log"), consoleErrors.join("\n"), "utf8");
  console.log(`[done] console-errors=${consoleErrors.length}`);
  try { await mp.disconnect(); } catch (_) {}
}

main().catch((e) => { console.error("[fatal]", e && e.message); process.exit(1); });
