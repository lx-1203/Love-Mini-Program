#!/usr/bin/env node
/**
 * admin-browser-verify.mjs —— MP-FIDELITY 阶段6：管理后台浏览器级核查（补 R6.7 欠账
 * 「后台浏览器级截图未做：图片能否被人眼看到」）。
 *
 * 与 r13-admin-ui-manage.mjs 的差别：那把尺钉死 5179 旧端口与旧口令 Admin@12345
 * （今实测 401，口令已于 2026-10-14 轮换）；本脚本吃 5177 现役 dev 服务、口令只从
 * 环境变量 ADMIN_LOGIN_PASSWORD 读（绝不进 argv/日志，同 data-hygiene.md 凭据纪律）。
 *
 * 核查四件：
 *   1) 登录 → Dashboard 截图（真实浏览器渲染，非 API 级）；
 *   2) 用户列表 / 媒体资产页逐页截图，媒体页校验 <img> 的 naturalWidth>0
 *      （R6.5 登记过"漏调重写的组件会 200 地裂图"——200 HTML 不算图，naturalWidth 才算）；
 *   3) 计数对齐：同源 /api 代理读 community-overview 与 posts 列表 total，断言相等；
 *   4) 一次真实管理动作：village-posts 置顶→读回→取消置顶→读回，落 API+UI 双证据。
 *
 * 用法：ADMIN_LOGIN_PASSWORD=... node scripts/qa/admin-browser-verify.mjs
 *   BASE 可覆盖（默认 http://127.0.0.1:5177）。
 * 退出码：0 四件全中；1 有不中；2 前提不成立（口令缺/服务不可达）。
 */
import puppeteer from "puppeteer";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import http from "node:http";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = process.env.BASE || "http://127.0.0.1:5177";
const SHOTS = join(REPO, "reports", "audit", "mp-fidelity-2026-10-18", "admin-browser-shots");
const RK = "ADMINBROWSER_RESULT";
const L = [];
const say = (s) => { L.push(s); console.log(s); };
const sleep = (ms) => new Promise((k) => setTimeout(k, ms));

const PW = process.env.ADMIN_LOGIN_PASSWORD;
if (!PW) { console.log(`${RK}=NOT-EVIDENCED reason=ADMIN_LOGIN_PASSWORD 未注入（口令不入 argv）`); process.exit(2); }
mkdirSync(SHOTS, { recursive: true });

/* 前置登录探针（2026-10-26 缺陷：账号被迁移 V2026.10.26.0001 收口为 disabled/password=NULL 后，
   页面登录只会 45s 超时看不出原因）。先进登录 API 拿真实回码：红也红得明白，并点名迁移注释
   认可的复通路径。本机 PATH 的 node 可能是 v16（无全局 fetch），用 node:http 手搓，不引新依赖；
   口令只走环境变量→请求体，不进 argv/日志；token 不落日志。 */
const loginProbe = () => new Promise((res) => {
  const body = JSON.stringify({ username: "local-dev-admin-openid-123456", password: PW });
  const req = http.request(`${BASE}/api/v1/auth/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      "Idempotency-Key": `admin-browser-verify-${Date.now()}`,
    },
  }, (r) => {
    let text = "";
    r.on("data", (c) => { text += c; });
    r.on("end", () => res({ status: r.statusCode, body: text.slice(0, 512) }));
  });
  req.on("error", () => res(null)); /* 网络层不可达：维持旧行为，由下面浏览器段去报 */
  req.end(body);
});
const probe = await loginProbe();
if (probe) {
  let pj = null; try { pj = JSON.parse(probe.body); } catch { /* 回包不是 JSON：只按 http 码分流 */ }
  if (probe.status === 403 && String(pj?.code || "") === "ADMIN_DISABLED") {
    console.log(`${RK}=NOT-EVIDENCED reason=ADMIN_DISABLED（users 100000 已被迁移 V2026.10.26.0001 置 disabled/password=NULL）`);
    console.log("复通路径（迁移注释点名，仅本地）：LOCAL_ADMIN_PASSWORD='<新的强口令>' node scripts/dev/reset-local-admin.mjs --apply；不得回退任何仓库内出现过的公开口令");
    process.exit(2);
  }
  if (probe.status !== 200) {
    console.log(`${RK}=NOT-EVIDENCED reason=登录探针 http=${probe.status} code=${pj?.code ?? "?"} message=${String(pj?.message ?? "").slice(0, 120)}（口令不落日志）`);
    process.exit(2);
  }
  say("ADMINBROWSER_LOGIN_PROBE http=200（探针通过后再进浏览器，token 不落日志）");
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox"],
  /* 仓内 puppeteer 未装自带 Chrome（admin-browser-verify 首跑实测报缺），
     按序用本机 Chrome → Edge；都不在再让 puppeteer 自己报。 */
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"]
      .find((p) => existsSync(p))
    || undefined,
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });
let fails = 0;
const bad = (m) => { fails++; say(`${RK}_PROBLEM ${m}`); };
try {
  /* ── 1) 登录 ── */
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector('input[placeholder*="管理员账号"], input[placeholder*="账号"]', { timeout: 30000 });
  await page.type('input[placeholder*="账号"]', "local-dev-admin-openid-123456");
  await page.type('input[type="password"]', PW);
  await Promise.all([
    page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.innerText.replace(/\s/g, "").includes("登录"))?.click(); }),
    page.waitForFunction(() => !location.pathname.includes("/login"), { timeout: 45000 }),
  ]);
  say("ADMINBROWSER_LOGIN ok（登录后跳离 /login）");
  await sleep(1500);
  await page.screenshot({ path: join(SHOTS, "01-dashboard.png") });
  say("ADMINBROWSER_SHOT 01-dashboard.png");

  /* 动态路由的路径从侧边栏真实链接取（菜单 API 的 path 带目录前缀拼接，猜路径必错） */
  const hrefs = await page.$$eval("a[href]", (as) => [...new Set(as.map((a) => a.getAttribute("href")))].filter(Boolean));
  const pick = (kw) => hrefs.find((h) => h.includes(kw)) || "";
  const H_USERS = pick("users");
  const H_MEDIA = pick("media-assets") || pick("media");
  const H_VILLAGE = pick("village-posts");
  say(`ADMINBROWSER_HREFS users=${H_USERS} media=${H_MEDIA} village=${H_VILLAGE}（侧边栏共 ${hrefs.length} 条链接）`);
  if (!H_USERS || !H_MEDIA) bad(`侧边栏没找到用户/媒体入口（users=${H_USERS} media=${H_MEDIA}）`);

  /* ── 2a) 用户列表 ── */
  if (H_USERS) {
    await page.goto(`${BASE}${H_USERS}`, { waitUntil: "networkidle2", timeout: 60000 });
    try {
      await page.waitForSelector("tbody tr", { timeout: 30000 });
      const rows = await page.$$eval("tbody tr", (trs) => trs.length);
      say(`ADMINBROWSER_USERS ok tbody行=${rows}`);
    } catch { bad("用户列表 30s 内没渲染出 tbody tr"); }
    await sleep(800);
    await page.screenshot({ path: join(SHOTS, "02-users.png") });
    say("ADMINBROWSER_SHOT 02-users.png");
  }

  /* ── 2b) 媒体资产：图片必须 naturalWidth>0 才算人眼可见（200-HTML 假图不算） ── */
  if (H_MEDIA) {
    await page.goto(`${BASE}${H_MEDIA}`, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(2500);
    await page.screenshot({ path: join(SHOTS, "03-media-assets.png") });
    say("ADMINBROWSER_SHOT 03-media-assets.png");
    try {
      await page.waitForSelector("tbody tr", { timeout: 30000 });
      const imgs = await page.$$eval("img", (els) => els.map((e) => ({ src: String(e.src).slice(0, 120), w: e.naturalWidth, ok: e.complete && e.naturalWidth > 0 })));
      const vis = imgs.filter((i) => i.ok);
      const broke = imgs.filter((i) => !i.ok);
      say(`ADMINBROWSER_MEDIA img总数=${imgs.length} 真解码=${vis.length} 裂图=${broke.length}`);
      if (!vis.length) bad("媒体资产页没有任何 naturalWidth>0 的图片 ⇒ 浏览器级图片可见性不成立");
      if (broke.length) bad(`媒体资产页有 ${broke.length} 张裂图（前 3：${broke.slice(0, 3).map((b) => b.src).join(" | ")}）`);
    } catch { bad("媒体资产页 30s 内没渲染出 tbody tr"); }
  }

  /* ── 3) 计数对齐（走同一 5177 代理，凭证用页面里的 token） ── */
  const j = async (p) => await page.evaluate(async (pp) => {
    const r = await fetch(pp, { headers: { Authorization: `Bearer ${localStorage.getItem("admin_v2_token") || ""}` } });
    return { s: r.status, j: await r.json().catch(() => null) };
  }, p);
  const ov = await j("/api/v1/admin/stats/community-overview");
  const pl = await j("/api/v1/admin/posts?page=1&pageSize=1");
  const plv = await j("/api/v1/admin/forum/village-posts?page=1&pageSize=1");
  const ovTotal = ov?.j?.data?.totalPostCount ?? ov?.j?.totalPostCount;
  const plTotal = pl?.j?.data?.total ?? pl?.j?.total;
  const plvTotal = plv?.j?.data?.total ?? plv?.j?.total;
  say(`ADMINBROWSER_COUNTS overview.totalPostCount=${ovTotal} posts.total=${plTotal}（status=${pl.s}） village-posts.total=${plvTotal}（status=${plv.s}）`);
  if (!(Number.isFinite(Number(ovTotal)) && Number(ovTotal) === Number(plTotal))) bad(`计数不对齐：总览 ${ovTotal} vs 帖子列表 ${plTotal}`);

  /* ── 4) 真实管理动作：置顶 → 读回 → 取消 → 读回（village-posts） ── */
  if (H_VILLAGE) {
    await page.goto(`${BASE}${H_VILLAGE}`, { waitUntil: "networkidle2", timeout: 60000 });
    try {
      await page.waitForSelector("tbody tr", { timeout: 30000 });
    } catch { bad("village-posts 列表 30s 内没渲染出 tbody tr"); }
    await sleep(1500);
    await page.screenshot({ path: join(SHOTS, "04-village-posts.png") });
    say("ADMINBROWSER_SHOT 04-village-posts.png");
    /* 目标帖一经选定就按帖子 ID 钉死（行首格就是 posts.id）。置顶会重排列表：
       "还原时仍取 tbody 首行"点到的是重排后的另一帖——2026-10-26 登记过世界态漂移
       （408 被取消置顶、420 被误置顶，脚本却报 PIN_RESTORE ok）。 */
    const pinTrace = [];
    page.on("response", (r) => { if (/village-posts\/\d+\/(un)?pin$/.test(r.url())) pinTrace.push({ url: r.url(), status: r.status() }); });
    const target = await page.evaluate(() => {
      const tr = document.querySelector("tbody tr");
      if (!tr) return null;
      const id = (tr.querySelector("td")?.innerText || "").replace(/\s/g, "");
      const btn = [...tr.querySelectorAll("button")].find((b) => /置顶|取消置顶/.test(b.innerText));
      return (id && btn) ? { id, label: btn.innerText.replace(/\s/g, "") } : null;
    });
    const clickRowByPostId = (pid) => page.evaluate((id) => {
      const tr = [...document.querySelectorAll("tbody tr")]
        .find((r) => (r.querySelector("td")?.innerText || "").replace(/\s/g, "") === id);
      if (!tr) return false;
      const btn = [...tr.querySelectorAll("button")].find((b) => /置顶|取消置顶/.test(b.innerText));
      if (!btn) return false;
      btn.click();
      return true;
    }, pid);
    const pinListOf = async () => {
      const r = await j("/api/v1/admin/forum/village-posts?page=1&pageSize=100");
      return r?.j?.data?.items ?? r?.j?.items ?? [];
    };
    if (!target) { bad("village-posts 首行没解析出 帖子ID/置顶按钮"); }
    else {
      const t0 = (await pinListOf()).find((x) => String(x.id) === target.id);
      const initialPinned = t0 ? Boolean(t0.isPinned) : null;
      say(`ADMINBROWSER_PIN_TARGET 帖子#${target.id} 按钮「${target.label}」 点击前后端isPinned=${initialPinned}`);
      if (initialPinned === null) bad(`列表 API 第一页找不到帖子#${target.id}，初始置顶态没有权威读数`);
      const firstOk = await clickRowByPostId(target.id);
      if (!firstOk) bad(`帖子#${target.id} 的置顶按钮没点出去（行或按钮消失）`);
      else {
        await sleep(2500);
        await page.screenshot({ path: join(SHOTS, "05-after-pin-toggle.png") });
        say(`ADMINBROWSER_SHOT 05-after-pin-toggle.png（帖子#${target.id} 点击了「${target.label}」）`);
        if (!pinTrace.length) bad("置顶点击后没有捕获到 pin/unpin XHR（UI 动作没真发请求）");
        else {
          say(`ADMINBROWSER_PIN xhr=${JSON.stringify(pinTrace)}`);
          if (!pinTrace.some((t) => t.url.includes(`/village-posts/${target.id}/`))) {
            bad(`pin/unpin XHR 打的不是目标帖 #${target.id}：${pinTrace[0].url}`);
          }
        }
        /* 还原 = 同一帖（按 ID 找行）再点一次，之后用后端读回复核 isPinned 回到初始值 */
        const again = await clickRowByPostId(target.id);
        if (!again) bad(`还原点击找不到帖子#${target.id} 的行/按钮（列表重排后不在当前页？世界态可能已漂移）`);
        else {
          await sleep(2500);
          const hits = pinTrace.filter((t) => t.url.includes(`/village-posts/${target.id}/`));
          if (hits.length < 2) bad(`还原点击没有第二个命中 #${target.id} 的 pin/unpin XHR（trace=${JSON.stringify(pinTrace)}）`);
          else {
            const op = (u) => (/\/unpin$/.test(u) ? "unpin" : "pin");
            if (op(hits[0].url) === op(hits[1].url)) bad(`两次 XHR 不是互逆操作：${hits[0].url} → ${hits[1].url}`);
          }
          const t1 = (await pinListOf()).find((x) => String(x.id) === target.id);
          if (!t1) bad(`还原后列表 API 第一页找不到帖子#${target.id}，终态没有权威读数`);
          else if (initialPinned !== null && Boolean(t1.isPinned) !== initialPinned) {
            bad(`置顶态没还原：帖子#${target.id} 初始 isPinned=${initialPinned}，还原后=${Boolean(t1.isPinned)}`);
          } else {
            say(`ADMINBROWSER_PIN_RESTORE ok（帖子#${target.id} 还原为 isPinned=${t1.isPinned}，与点击前一致）`);
          }
        }
      }
    }
  } else { bad("侧边栏没找到 village-posts 入口，管理动作没做"); }
} catch (e) {
  bad("浏览器流程异常：" + String(e && e.message).slice(0, 200));
} finally {
  await browser.close();
}
writeFileSync(join(SHOTS, "report.txt"), L.join("\n") + "\n", "utf8");
console.log(`${RK}=${fails ? "FAIL" : "PASS"} 核查四件：登录/列表+媒体真图/计数对齐/真实管理动作，截图 ${SHOTS}`);
process.exit(fails ? 1 : 0);
