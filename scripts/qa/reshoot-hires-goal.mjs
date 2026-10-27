#!/usr/bin/env node
/**
 * reshoot-hires-goal.mjs —— 目标收口·高分辨率重拍（automator 378×814 通道）。
 *
 * 为什么不用 wechatide CLI 截图：CLI 通道实测 193×413（real-tour-cli.mjs:14/:229 已登记
 * "禁止跨 harness 比像素"），低分辨率帧把折叠线以下的模块误判成"缺失"。本脚本走
 * mp-shoot-reference.cjs 同一条 automator 通道（378×814），并对长页补拍 bottom 帧。
 *
 * 顺序纪律（照 shoot-fidelity-sweep.mjs 实测教训）：
 *   重开项目窗口 → 清编译缓存 → automator.connect（重开必须在 connect 之前，否则拍到死通道/旧编译）。
 *   租约照拿：设备单例，并发取景=互拍空帧。
 *
 * 用法：<node≥18> scripts/qa/reshoot-hires-goal.mjs [--only 名称1,名称2]
 *   产物：reports/screenshots/goal-2026-10-26-hires/<名称>-1-top.png / -2-bottom.png
 *   退出码：0 全部落帧且宽度≥360；1 有页没落到帧或帧过小；2 前提不成立（连不上设备）。
 */
import { createRequire } from "node:module";
import { mkdirSync, statSync, readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const require = createRequire(import.meta.url);
const RK = "RESHOOT_HIRES";
const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d;
};
const WS = process.env.WS_ENDPOINT || "ws://127.0.0.1:9420";
const API = process.env.API_BASE || "http://127.0.0.1:8080/api/v1";
const OUT = resolve(arg("out", join(REPO, "reports", "verify", "2026-10-26", "50-fidelity", "frames")));
const PROJECT = resolve(arg("project", join(REPO, "apps", "client", "dist", "build", "mp-weixin-real")));
const MIN_BYTES = 3000;
const MIN_WIDTH = 360; /* automator 通道宽 378；CLI 通道 193——低于 360 即判错通道 */
const WAIT = 5000;

const ONLY = arg("only", "") ? arg("only", "").split(",") : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pngWidth = (p) => readFileSync(p).readUInt32BE(16);

/* 目标页：name=报告用名 route=重定向后真实落点 long=拍 bottom 帧。
   guest=游客态注入；anon=先清 storage（未登录态）。detail=动态取 id（活帖）。 */
const PAGES = [
  { name: "登录页", route: "/pages/login/index", long: false, anon: true },
  { name: "首页", route: "/pages/home/index", long: true, guest: true },
  { name: "附近首页", route: "/pages/nearby/index", long: true, guest: true },
  { name: "寻觅匹配卡片", route: "/pages/discover/index", long: false, guest: true },
  { name: "匹配中", route: "/subpackages/discover-extra/discover/matching?dev-preview=1", long: false, guest: true },
  { name: "匹配成功", route: "/subpackages/discover-extra/discover/match-success", long: false, guest: true },
  { name: "消息", route: "/pages/messages/index", long: false, guest: true },
  { name: "个人主页-已登录", route: "/pages/profile/index", long: true, guest: true },
  { name: "个人主页-未登录", route: "/pages/profile/index", long: true, anon: true },
  { name: "他人主页", route: "/subpackages/profile-extra/profile/other?userId={USER_ID}", long: true, guest: true, user: true },
  { name: "兴趣圈列表", route: "/subpackages/circles/circles/index", long: true, guest: true },
  { name: "圈子详情", route: "/subpackages/circles/circles/circle-home?circleId=8", long: true, guest: true },
  { name: "校园圈", route: "/subpackages/campus/campus/hub", long: true, guest: true },
  { name: "帖子详情", route: "/subpackages/village/village/detail?id={POST_ID}", long: true, guest: true, detail: true },
  { name: "发布帖子", route: "/subpackages/village/village/publish", long: true, guest: true },
];

let targets = ONLY ? PAGES.filter((p) => ONLY.includes(p.name)) : PAGES;
if (!targets.length) {
  console.log(`${RK}=NOT-EVIDENCED reason=no-matching-page only=${arg("only", "")}`);
  process.exit(2);
}

/* 1) 拉起自动化 WS 实例（9420 挂在"自动化模式 IDE 实例"上，不在主窗口进程——ws-channel-up.mjs:1-4）。
      自动化实例是全新 spawn ⇒ 编译缓存天然是当前 dist 的，无需再清。 */
{
  const re = spawnSync(process.execPath, [
    join(REPO, "scripts/qa/ws-channel-up.mjs"), "--project", PROJECT, "--wait", "300",
  ], { cwd: REPO, encoding: "utf8" });
  const out = `${re.stdout || ""}${re.stderr || ""}`;
  const verdict = out.split(/\r?\n/).find((l) => l.startsWith("WS_UP_BAND_RESULT=")) || "";
  console.log(`RESHOOT_WSUP exit=${re.status} ${verdict}`);
  if (re.status !== 0 || !verdict.includes("match")) {
    console.log(`${RK}=NOT-EVIDENCED reason=ws-channel-failed exit=${re.status} verdict=${verdict || "(无)"} 详情=${out.split(/\r?\n/).filter((l) => l.startsWith("WS_UP")).join(" / ").slice(0, 300)}`);
    process.exit(2);
  }
}

/* 3) 租约（设备单例） */
const { guardUiLease } = await import("./ui-lease.mjs");
guardUiLease({ owner: "verify-2026-10-26-fidelity", tag: "RESHOOTLEASE", failTag: "RESHOOT_HIRES" });

const automator = require(require.resolve("miniprogram-automator", { paths: [join(REPO, "apps/client"), REPO] }));
mkdirSync(OUT, { recursive: true });

let mp;
try {
  mp = await automator.connect({ wsEndpoint: WS });
} catch (e) {
  console.log(`${RK}=NOT-EVIDENCED reason=connect-failed err=${String(e && e.message).slice(0, 160)}`);
  process.exit(2);
}
console.log("connected");
await sleep(3000);

/* 游客铸票（与 mp-shoot-reference.cjs 同形状：HTTP guest-login → setStorage token） */
/* 游客铸票（与 mp-shoot-reference.cjs 同形状：HTTP guest-login → setStorage token） */
let guestToken = "";
async function injectGuest() {
  const r = await fetch(`${API}/auth/guest-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const j = await r.json();
  const token = (j.data && j.data.token) || j.token || "";
  if (r.status !== 200 || !token) {
    console.log(`${RK}=NOT-EVIDENCED reason=guest-login-failed http=${r.status}`);
    process.exit(2);
  }
  guestToken = token;
  await mp.callWxMethod("setStorage", { key: "token", data: token });
  await mp.callWxMethod("setStorage", { key: "refresh_token", data: "" });
  /* 只写 storage 不够：pinia session 在内存里，清过会话后必须重新 bootstrap，
     否则后续 guest 页仍按未登录渲染（2026-10-26 实测：profile 两态 top 同哈希）。 */
  try {
    await mp.evaluate(() => {
      const app = getApp(); const vm = app["$vm"];
      const gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
      const p = vm["$pinia"] || gp["$pinia"];
      const s = p._s.get("session"); if (s && s.bootstrap) s.bootstrap();
      return "boot-ok";
    });
  } catch { /* 老版本 automator 无 evaluate 时退回仅 storage */ }
  console.log(`guest-login ok token_len=${token.length}`);
  return token;
}

async function shootOne(page, route) {
  const top = join(OUT, `${page.name}-1-top.png`);
  /* 导航后必须等「真的落在请求页」再截图。旧逻辑只 reLaunch + 固定 sleep，
     且拍完只**记录**落点、从不与请求路由比对 ⇒ 应用自身的启动重定向会抢在第一帧之前
     （2026-10-27 实测：本轮首页是「附近首页」，结果 top/bottom 两张都拍成
     pages/discover/index 的寻觅卡片，`ok` 照样为真、清单照写）。
     错页帧比没帧更坏：它会冒充成一页的真实证据进下一轮对比。 */
  const wantPath = String(route).split("?")[0].replace(/^\//, "");
  const pathOf = (p) => String(p || "").split("?")[0].replace(/^\//, "");
  let landed = "";
  for (let attempt = 0; attempt < 2 && pathOf(landed) !== wantPath; attempt++) {
    await mp.callWxMethod("reLaunch", { url: route });
    for (let t = 0; t < 14; t++) {
      await sleep(1500);
      try { landed = (await mp.currentPage()).path; } catch { continue; }
      if (pathOf(landed) === wantPath) break;
    }
    if (pathOf(landed) !== wantPath) console.log(`ROUTE_RETRY ${page.name} want=${wantPath} got=${landed}`);
  }
  if (pathOf(landed) !== wantPath) {
    let dropped = 0;
    for (const p of [top, join(OUT, `${page.name}-2-bottom.png`)]) {
      if (existsSync(p)) { rmSync(p); dropped++; }
    }
    console.log(`${RK}_ROUTE_MISMATCH ${page.name} want=${wantPath} got=${landed} ⇒ 不落帧并清掉同名遗留（删 ${dropped} 张）`);
    return { ok: false, rec: { route: landed, name: page.name, want: wantPath, frames: [], reason: "route-mismatch" } };
  }
  await sleep(WAIT);
  await mp.screenshot({ path: top });
  let bottom = "";
  let scrollMethod = "none";
  if (page.long) {
    /* pageScrollTo 滚的是页面，不是页面里的 <scroll-view>（本仓主内容多为内滚区）。
       先试内滚元素，失败再退回 pageScrollTo，并记录实际用的机制。
       两个坑都是本程实测：① 元素查询的接收者是 **Page**（mp.currentPage()），不是 mp——
       `mp.$$` 根本不是函数，原先被 try/catch 吞成"查不到"，于是每次都静默退回 pageScrollTo；
       ② 内建组件按标签名可能查不全，所以按选择器多试几把、并对每把的前 3 个元素逐个滚
       （与 shoot-fidelity-sweep.mjs:458 同一手法，那边早就踩过）。 */
    const pg = await mp.currentPage();
    for (const sel of ["scroll-view", "[scroll-y]", ".detail-body", ".scroll-body"]) {
      try {
        const views = pg && typeof pg.$$ === "function" ? await pg.$$(sel) : null;
        if (views && views.length) {
          let moved = 0;
          for (const el of views.slice(0, 3)) {
            try { await el.scrollTo(0, 99999); moved++; } catch { /* 单个滚不动就试下一个 */ }
          }
          if (moved) { scrollMethod = `page.$$(\"${sel}\").scrollTo×${moved}`; break; }
        }
      } catch { /* 换下一把选择器 */ }
    }
    if (scrollMethod === "none") {
      try {
        await mp.callWxMethod("pageScrollTo", { scrollTop: 99999, duration: 0 });
        scrollMethod = "wx.pageScrollTo";
      } catch {
        try { await mp.callWxMethod("pageScrollTo", { scrollTop: 20000, duration: 0 }); scrollMethod = "wx.pageScrollTo"; } catch {}
      }
    }
    await sleep(3500);
    bottom = join(OUT, `${page.name}-2-bottom.png`);
    await mp.screenshot({ path: bottom });
  }
  const hashOf = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);
  const bottomStuck = !!bottom && existsSync(bottom) && existsSync(top) && hashOf(bottom) === hashOf(top);
  /* 撞图即撤帧：bottom 与 top 逐字节相同 ⇒ 它不是"底部"的证据，只是同一张图的第二份副本。
     原实现把副本照样记进清单并打印 ok=true（2026-10-27 实测：帖子详情/发布帖子两页的内滚区
     没被任何一把选择器推动，清单里躺着 2 对同字节帧，而"states=25"看着像做满了）。
     现在：撤掉副本帧、该页判失败，宁可少一帧也不留一条假证据。 */
  let bottomUsable = !!bottom && existsSync(bottom) && !bottomStuck
    && statSync(bottom).size >= MIN_BYTES && pngWidth(bottom) >= MIN_WIDTH;
  if (bottomStuck) {
    try { rmSync(bottom); } catch { /* 删不掉也不许把它当证据 */ }
    bottomUsable = false;
  }
  const ok = existsSync(top) && statSync(top).size >= MIN_BYTES && pngWidth(top) >= MIN_WIDTH
    && (!page.long || bottomUsable);
  const cur = (await mp.currentPage()).path;
  const rec = { route: String(cur).split("?")[0], name: page.name, frames: [] };
  if (existsSync(top)) rec.frames.push({ route: rec.route, state: "top", path: relative(REPO, top), contentHash: hashOf(top), bytes: statSync(top).size });
  if (bottomUsable) rec.frames.push({ route: rec.route, state: "bottom", path: relative(REPO, bottom), contentHash: hashOf(bottom), bytes: statSync(bottom).size });
  console.log(`SHOT ${page.name} route=${cur} top=${existsSync(top) ? statSync(top).size + "B/" + pngWidth(top) + "w/" + hashOf(top) : "MISS"} bottom=${bottomUsable ? statSync(bottom).size + "B/" + pngWidth(bottom) + "w/" + hashOf(bottom) : (page.long ? (bottomStuck ? "STUCK-已撤帧" : "MISS") : "n/a")} scroll=${scrollMethod} ok=${ok}`);
  return { ok, rec };
}

const SHOTS = [];
let failures = 0;
function bandOf() {
  try { const b = readFileSync(join(PROJECT, "config/env.js")); return `${String(b).match(/MODE:\s*"([^"]+)"/)?.[1] || "?"}@${createHash("sha256").update(b).digest("hex").slice(0, 8)}`; } catch { return "?"; }
}
function writeManifest() {
  /* 合并写：`--only` 只跑几页时，旧逻辑会把整轮清单截成本轮这几页
     （2026-10-27 实测：15 页的账被一次 --only 4 页跑成 4 页，其余 11 页的帧仍在盘上却不再被记账）。
     同名页本轮覆盖旧值，本轮没跑的页原样保留。 */
  let prior = [];
  try {
    const old = JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf-8"));
    if (Array.isArray(old.results)) prior = old.results;
  } catch { /* 无旧清单 ⇒ 首次成文 */ }
  const mine = new Set(SHOTS.map((r) => r.name));
  const merged = prior.filter((r) => !mine.has(r.name)).concat(SHOTS);
  const body = { schema: "reshoot-hires-goal/v1", generatedAt: new Date().toISOString(), project: relative(REPO, PROJECT), band: bandOf(), out: relative(REPO, OUT), results: merged };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(body, null, 2) + "\n", "utf-8");
  const kept = merged.length - SHOTS.length;
  console.log(`RESHOOT_MANIFEST=${join(OUT, "manifest.json")} states=${merged.reduce((n, r) => n + (r.frames || []).length, 0)} pages=${merged.length} 本轮=${SHOTS.length} 保留=${kept}`);
}

/* 帖子详情 / 他人主页：先取活帖与活作者 id（不猜 id；取不到就把该页记为失败） */
let postId = "";
let userId = "";
if (targets.some((p) => p.detail || p.user)) {
  try {
    const token = await injectGuest();
    const r = await fetch(`${API}/posts?page=1&pageSize=5`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    const j = await r.json();
    const list = j.items || (j.data && (j.data.list || j.data.records || j.data.items)) || (Array.isArray(j.data) ? j.data : []);
    const live = list.find((p) => p && p.id != null && p.status !== "deleted");
    postId = live ? String(live.id) : "";
    if (live) {
      userId = String(live.authorId ?? live.author?.userId ?? live.userId ?? "");
      if (!userId) {
        const d = await fetch(`${API}/posts/${postId}`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
        const dj = await d.json();
        const dd = dj.data ?? dj;
        userId = String(dd?.author?.userId ?? dd?.authorId ?? dd?.userId ?? "");
      }
    }
    console.log(`POST_LIST http=${r.status} count=${list.length} pickedPost=${postId} pickedUser=${userId}`);
  } catch (e) {
    console.log(`POST_LIST FAILED err=${String(e && e.message).slice(0, 120)}`);
  }
}

for (const page of targets) {
  try {
    if (page.anon) {
      await mp.callWxMethod("clearStorageSync");
      /* 清 storage 后 pinia 的 userSession 仍在 ⇒ 必须显式 logout，否则未登录态取到的是登录态帧。 */
      try {
        await mp.evaluate(() => {
          const app = getApp(); const vm = app["$vm"];
          const gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
          const p = vm["$pinia"] || gp["$pinia"];
          const s = p._s.get("session");
          if (s) { if (s.logout) { s.logout(); } else if (s.reset) { s.reset(); } else { s.isLoggedIn = false; s.userSession = null; } }
          return "clear-ok";
        });
      } catch { /* 同上的兼容退回 */ }
      await sleep(3000);
    } else if (page.guest) {
      await injectGuest();
    }
    let route = page.route;
    if (page.detail) {
      if (!postId) {
        console.log(`SHOT ${page.name} SKIP reason=no-live-post-id`);
        failures += 1;
        continue;
      }
      route = route.replace("{POST_ID}", postId);
    }
    if (page.user) {
      if (!userId) {
        console.log(`SHOT ${page.name} SKIP reason=no-live-user-id`);
        failures += 1;
        continue;
      }
      route = route.replace("{USER_ID}", userId);
    }
    const r = await shootOne(page, route);
    SHOTS.push(r.rec);
    if (!r.ok) failures += 1;
  } catch (e) {
    console.log(`SHOT ${page.name} FAILED err=${String(e && e.message).slice(0, 160)}`);
    failures += 1;
  }
}

writeManifest();
console.log(failures === 0 ? `${RK}=PASS pages=${targets.length} out=${OUT}` : `${RK}=FAIL failures=${failures}/${targets.length}`);
process.exit(failures === 0 ? 0 : 1);
