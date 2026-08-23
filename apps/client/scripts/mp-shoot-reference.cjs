/**
 * mp-shoot-reference.cjs — 微信小程序「参考图」逐页截图工具（顶+底），带空页重连重试。
 *
 * 连接 automator(ws://127.0.0.1:9420) 后，先轮询等待当前页就绪；每页 reLaunch+截图，
 * 若命中「getPageMetaByWebviewId(...) is null / rawPath」类空页错误，则断开重连并重试。
 *
 * 依赖：miniprogram-automator (devDependency)。启动：
 *   pnpm --filter @campus-love/client add -D miniprogram-automator
 *   <微信开发者工具>\cli.bat auto --project dist/build/mp-weixin --auto-port 9420
 * 用法：node scripts/mp-shoot-reference.cjs [--port 9420] [--out 截图存档/xx] [--pages 首页,消息]
 */
"use strict";
const path = require("node:path");
const fs = require("node:fs");

const PAGE_MATRIX = [
  { key: "login",         label: "登录页",        route: "/pages/login/index" },
  { key: "waiting",       label: "未登录等待页",   route: "/pages/discover/index" },
  { key: "home",          label: "首页",          route: "/pages/home/index" },
  { key: "nearby",        label: "附近",          route: "/pages/nearby/index" },
  { key: "discover",      label: "寻觅匹配卡片",    route: "/pages/discover/index" },
  { key: "matching",      label: "匹配中",        route: "/pages/discover/matching" },
  { key: "match-success", label: "匹配成功",       route: "/pages/discover/match-success" },
  { key: "messages",      label: "消息",          route: "/pages/messages/index" },
  { key: "profile",       label: "个人主页",       route: "/pages/profile/index" },
  { key: "other",         label: "他人主页",       route: "/pages/profile/other" },
  { key: "campus",        label: "校园圈",        route: "/pages/campus/hub" },
  { key: "circles",       label: "兴趣圈列表",     route: "/pages/circles/index" },
  { key: "topic",         label: "圈子详情/话题",  route: "/pages/circles/topic-detail" },
  { key: "village",       label: "帖子",          route: "/pages/village/detail" },
  { key: "discover-waiting", label: "未登录等待(寻觅)", route: "/pages/discover/index" },
  { key: "profile-lock",  label: "未登录个人主页", route: "/pages/profile/index" },
];

function arg(name, dflt) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isMetaNullErr = (err) => /getPageMetaByWebviewId|rawPath|is null/i.test(String((err && err.message) || err));

async function ensurePage(mini) {
  for (let i = 0; i < 24; i++) {
    try { const p = await mini.currentPage(); if (p) return p; } catch (e) { /* ignore */ }
    await sleep(500);
  }
  throw new Error("等待当前页超时 (getPageMetaByWebviewId null)");
}

async function shoot(mini, p, out) {
  await mini.reLaunch(p.route);
  await sleep(1300);
  await mini.screenshot({ path: path.join(out, p.key + "-top.png") });
  try { await mini.pageScrollTo(1050); } catch (e) {}
  await sleep(700);
  try { await mini.screenshot({ path: path.join(out, p.key + "-mid.png") }); } catch (e) { console.warn("[mp-shoot] mid fail: " + p.key); }
  try { await mini.pageScrollTo(99999); } catch (e) {}
  await sleep(700);
  try { await mini.screenshot({ path: path.join(out, p.key + "-bottom.png") }); } catch (e) { console.warn("[mp-shoot] bottom fail: " + p.key); }
}

async function main() {
  const port = Number(arg("port", "9420"));
  const out = arg("out", "截图存档");
  const pages = (arg("pages", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const target = pages.length ? PAGE_MATRIX.filter((p) => pages.includes(p.key)) : PAGE_MATRIX;

  let automator;
  try { automator = require("miniprogram-automator"); }
  catch (e) {
    console.error("[mp-shoot] 缺少 miniprogram-automator（devDependency）");
    process.exit(1);
  }

  let mini = await automator.connect({ wsEndpoint: "ws://127.0.0.1:" + port });
  fs.mkdirSync(out, { recursive: true });
  await ensurePage(mini);

  for (const p of target) {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        await shoot(mini, p, out);
        console.log("[mp-shoot] OK " + p.label + " (" + p.route + ")");
        ok = true;
      } catch (err) {
        console.warn("[mp-shoot] 重试 " + p.label + " (" + p.route + "): " + err.message);
        if (isMetaNullErr(err)) {
          try { await mini.disconnect(); } catch (e) {}
          await sleep(900);
          mini = await automator.connect({ wsEndpoint: "ws://127.0.0.1:" + port });
          await ensurePage(mini);
        } else {
          await sleep(700);
        }
      }
    }
    if (!ok) console.warn("[mp-shoot] 放弃 " + p.label + " (" + p.route + ")");
  }
  try { await mini.disconnect(); } catch (e) {}
}

main().catch((e) => { console.error(e); process.exit(1); });