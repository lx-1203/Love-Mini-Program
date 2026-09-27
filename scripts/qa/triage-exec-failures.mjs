#!/usr/bin/env node
/**
 * 执行轮 FAILED / SKIPPED 行的分诊台（只读，不改任何权威件）。
 *
 * 为什么要"两份载体各查一遍"：执行轮跑的是 874ff52f 的冻结构建（dist），
 * 而修复波在这期间改的是源码树（src）。同一条"元素找不到"，
 * 在 dist 里有 / 没有，与在 src 里有 / 没有，是四个完全不同的结论：
 *   dist 无 + src 无 → 用例文案/选择器本就不属于这个构建（规格噪声或产品确实没有）
 *   dist 无 + src 有 → 修复波刚刚补上了它（本轮失败，重建后应复验）
 *   dist 有 + src 无 → 修复波把它删了（本轮通过的东西下次会没，必须复验）
 *   dist 有 + src 有 → 构建里有却定位不到 → 状态没到 / 时机太早 / 作用域找错（harness 或产品）
 * 只看其中一份就会把"harness 找不到"误报成"产品没有"，或反过来。
 *
 * 用法：node scripts/qa/triage-exec-failures.mjs \
 *         [--results reports/audit/round-6/interact/exec-results.json] \
 *         [--dist apps/client/dist/build/mp-weixin] [--src apps/client/src] \
 *         [--out .zcode/tmp/triage-r6]
 */
import fs from "node:fs";
import path from "node:path";
import { landingStatus } from "./guest-landing-status.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const RESULTS = arg("results", "reports/audit/round-6/interact/exec-results.json");
const DIST = arg("dist", "apps/client/dist/build/mp-weixin");
const SRC = arg("src", "apps/client/src");
const OUT_RAW = arg("out", "");
/* 默认 out 不再是一个固定的 round-6 名字：换语料不换旗标 ⇒ 把 round-7 的分诊写进 round-6 的文件名里
   （本轮我自己就这么踩了一次：--results 指到 exec-guest-real-final，盘上 triage-r6.* 就成了它的替身）。
   没给 --out 时按语料目录自己起名，冲突不可能发生。 */
const OUT = OUT_RAW || ".zcode/tmp/triage-" + path.basename(String(RESULTS)).replace(/\.\w+$/, "").replace(/[^A-Za-z0-9._-]/g, "_") + (path.basename(path.dirname(String(RESULTS).replace(/[\\/]+$/, ""))) || "").replace(/[^A-Za-z0-9._-]/g, "_");
if (!OUT_RAW) console.log("TRIAGE_OUT_DERIVED out=" + OUT + "（没给 --out ⇒ 按语料名派生，避免把新轮次写进旧轮次的文件名）");

{
  const KNOWN = ["results", "dist", "src", "out", "guest-book", "guest-measured"];
  const bad = process.argv.slice(2).filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log("TRIAGE_RESULT=FAIL reason=不认识的旗标 " + bad.join(",") + " ⇒ 会被静默忽略而回落到默认输入（实测：--corpus 拼错会让分诊悄悄读 round-6 的旧语料，红的是别人家的账）"); process.exit(2); }
}
console.log("TRIAGE_INPUTS results=" + RESULTS + " dist=" + DIST + " src=" + SRC + " out=" + OUT);

const die = (m) => { console.log(m); process.exitCode = 2; throw new Error(m); };

if (!fs.existsSync(RESULTS)) die(`FAIL 权威件不存在：${RESULTS}`);
if (!fs.existsSync(DIST)) die(`FAIL 冻结构建不存在：${DIST}（没有它就无法区分"跑的构建里没有"与"源码里没有"）`);

const doc = JSON.parse(fs.readFileSync(RESULTS, "utf8"));
if (!Array.isArray(doc.results)) die(`FAIL ${RESULTS} 没有 results[] 数组（顶层键：${Object.keys(doc).join(",")}）`);
const rows = doc.results;

// ---------- 载体索引：整份读进内存，逐 token 做 indexOf ----------
const EXT_DIST = new Set([".wxml", ".js", ".json", ".wxss"]);
const EXT_SRC = new Set([".vue", ".ts", ".js", ".json", ".scss", ".css"]);
function walk(dir, exts, stopAt) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        stack.push(p);
      } else if (exts.has(path.extname(e.name))) {
        try { if (fs.statSync(p).size <= 4 * 1024 * 1024) out.push(p); } catch { /* 断链/权限：跳过但要计数 */ }
        if (stopAt && out.length > stopAt) return out;
      }
    }
  }
  return out;
}
function index(files) {
  const idx = [];
  for (const p of files) {
    let t;
    try { t = fs.readFileSync(p, "utf8"); } catch { continue; }
    idx.push({ p, t });
  }
  return idx;
}
const distFiles = walk(DIST, EXT_DIST);
const srcFiles = walk(SRC, EXT_SRC);
const distIdx = index(distFiles);
const srcIdx = index(srcFiles);
if (!distIdx.length) die(`FAIL 构建索引为空：${DIST}`);
if (!srcIdx.length) die(`FAIL 源码索引为空：${SRC}`);

function hits(idx, token) {
  const out = [];
  for (const f of idx) if (f.t.includes(token)) out.push(f.p);
  return out;
}
// 选择器必须按"独立类名 token"匹配：裸 indexOf 会把 .id 命中 valid/width/padding，把"构建里有没有"判成假有
function hitsSel(idx, token) {
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^A-Za-z0-9_-])${esc}(?![A-Za-z0-9_-])`);
  const out = [];
  for (const f of idx) if (re.test(f.t)) out.push(f.p);
  return out;
}
// 页面前缀：定位失败最可能落在"该页自己的文件"里，单独标出来免得被全仓命中淹没
function pageScoped(list, page) {
  if (!page) return [];
  const stem = String(page).split("/").slice(-1)[0];
  const dir = String(page).replace(/\/[^/]*$/, "");
  return list.filter((p) => p.includes(dir + path.sep) || p.includes(stem));
}

// ---------- 分类 ----------
// failureReason 是"每行一句"的机读字段，优先信它；observed 里可能串多条 act-FAIL（一条用例多动作），
// 用非贪婪 + 锚末端从 observed 抠目标会跨条吞（实测把 `发布") / act-FAIL:tap(__CAND__) ...` 整串当成文案），
// 所以 observed 只在 failureReason 不成形时兜底，且兜底取**最后一条** act-FAIL。
const RE_OBS_FAIL = /act-FAIL:(\w+)\((.*?)\)\s+([^|]*)$/;
const RE_REASON = /^action (\S+) (\S+) failed: (.*)$/;
const RE_NOT_FOUND = /^element not found:\s*(.*)$/;
const RE_OBS_SKIP = /^action-not-automatable:\s*(.*)$/;

const BUCKET = {
  "SKIPPED-not-automatable": "用例要求的动作本通道做不了（拖动/连点/量 rect 等），只能人工驱动 —— 覆盖缺口，不是产品失败",
  "SKIPPED-real-band": "判据要真实后端：本条由 real 带腿（--project mp-weixin-real + 8080 在跑）复测",
  "SKIPPED-vague-action": "action 写了交互动词却没点名可交互元素 —— 判据含糊，缺的是判据不是产品缺陷",
  "SKIPPED-vague-criterion": "判据既无类名也不要求出帧 —— 没有可观测物件，不能记 EXECUTED",
  "SKIPPED-observe-only-slice": "交互型动作落在 observe-only 切片里 —— 切片配置所致，非覆盖缺口",
  "SKIPPED-deny-irreversible": "注销/解绑/清空类不可逆动作显式 DENY，为的是保住后面几百条共用的会话",
  "SKIPPED-interact-reststate-absent": "交互腿下发失败，且同帧探针说类名本就不在静息态 ⇒ 欠前置配方（先展开/先切态）",
  "SKIPPED-interact-channel": "交互腿下发失败，但探针说物件在、元素级动作仍点不动 ⇒ 通道或选择器问题，须人工判",
  "SKIPPED-conservation-filler": "真实刀切片为守住 1107 行总数而记的占位行（本切片只跑 requiresReal，其余在别的档位/身份腿已判过）⇒ 既不是缺口也不是覆盖",
  "SKIPPED-identity-scope": "这条判据的身份适用范围被 ops 标成了别的腿（tag-ops-identity-scope.mjs 依 guest-landing-policy 的落点裁定）⇒ 本腿不认领，缺口记在标它的那次裁定上，不算产品失败也不算覆盖",
  "SKIPPED-left-page": "交互后已离开目标页（LEFT_PAGE），状态量不到 —— 不是产品判红",
  /* round-7 第二轮：执行器把"observe-only"这句谎话换成了当时量到的原因 ⇒ 词表跟着分档。
     旧口径里"游客被弹走"和"这一腿没带 --tap"共用一句话，分不开也就修不掉。 */
  "SKIPPED-interact-off-page": "交互动词 + 本页没落在声明页（栈顶是别的页）⇒ 交互根本没发出，点了是替别人的页做事；含游客闸门弹回",
  "SKIPPED-interact-not-issued": "交互动词 + 落点没问题但这一条没发出交互 ⇒ 读 observed 的 tap 段定位，欠的是配方",
  "FAILED-guest-gate-by-ruling": "游客落到 guest-landing-policy 裁定的那一页 ⇒ 闸门行为符合裁定，FAILED 是因为该条判据前置为登录态（身份适用范围问题，不是产品缺陷）",
  "SKIPPED-route-probe-no-answer": "落点探针本身没给答案（routeStack 取空/超时）⇒ 连「在不在这一页」都无从归属，欠的是重跑这一批，不是产品判红",
  "SKIPPED-frame-evidence-hole": "要求出帧但帧没成立（帧太小被拒且探针无有效答案）⇒ **证据缺口**，命名了也不许结案",
  "FAILED-landing-guard": "导航落在了别的页（页内守卫或路由重定向），元素存在性无从判 —— 每一组落地对须有 booked 复测腿或裁决",
  "locate-label": "按文案找不到元素（__CAND__ 是执行器「按标签解析」的哨兵，不是漏替换）",
  "locate-label-token-lost": "按文案找不到，且消息里没留下要找的文案 —— 无法复核，属执行器取证缺陷",
  "locate-selector": "按选择器找不到元素",
  "harness-api": "执行器自身报错（方法不存在 / 类型错误），与被测物无关",
  "timeout": "动作超时",
  "auth-precondition": "前置登录/登出/token 铸造失败",
  "other-fail": "未归类，需人工读原文",
};

/* round-7 执行器换了失败口径：failureReason 不再是 `action tap .x failed: element not found` 而是
   中文判据语句（`requiresReal ⇒ …`、`落在别的页（…），须人判`）。这里把**当时实测到的全部口径**逐条
   命名成桶 —— 词表漂移必须让门禁变红（下面有 unclassified===0 断言），不能被兜底桶悄悄吞掉。 */
const RE7_SELECTOR = /::\s*(\w+)\s*[：:]?\s*([.#]?[\w-]+)\s*::/;
function matchRe7(reason, obs) {
  if (/^真实刀只跑 requiresReal 用例/.test(reason)) return { bucket: "SKIPPED-conservation-filler" };
  if (/^本条判据的身份适用范围已标为/.test(reason)) return { bucket: "SKIPPED-identity-scope" };
  if (/^requiresReal\b/.test(reason)) return { bucket: "SKIPPED-real-band" };
  if (/^action 含交互动词但没点名可交互元素/.test(reason)) return { bucket: "SKIPPED-vague-action" };
  if (/^action 含交互动词但本页没落在声明页/.test(reason)) return { bucket: "SKIPPED-interact-off-page" };
  if (/^action 含交互动词但落点探针没给结果/.test(reason)) return { bucket: "SKIPPED-route-probe-no-answer" };
  if (/^action 含交互动词但这一条没发出交互/.test(reason)) return { bucket: "SKIPPED-interact-not-issued" };
  if (/^落在 .* ⇒ 与游客落点裁定一致/.test(reason)) return { bucket: "FAILED-guest-gate-by-ruling" };
  if (/^判据未点名可观测物件/.test(reason)) return { bucket: "SKIPPED-vague-criterion" };
  if (/^action 含交互动词\s*⇒\s*本切片(没带 --tap，)?只跑 observe-only/.test(reason)) return { bucket: "SKIPPED-observe-only-slice" };
  if (/^交互禁触/.test(reason)) return { bucket: "SKIPPED-deny-irreversible" };
  if (/^交互腿下发全部失败/.test(reason)) {
    const m = reason.match(RE7_SELECTOR);
    const common = m ? { op: m[1], token: m[2].replace(/^[.#]/, ""), tokenKind: "selector", recoverable: true, sel: m[2] } : {};
    if (!m) common.note = `下发失败但没留下 :: 选择器 :: 三段，无法复核：${reason.slice(0, 120)}`;
    return /探针说物件在/.test(reason)
      ? { bucket: "SKIPPED-interact-channel", ...common, unclassified: !m }
      : { bucket: "SKIPPED-interact-reststate-absent", ...common, unclassified: !m };
  }
  if (/^交互后离开目标页/.test(reason)) return { bucket: "SKIPPED-left-page" };
  /* 路由探针自己没答（取空/超时）⇒ 这一行连"落点是不是目标页"都不知道，
     不能折成 FAILED-landing-guard（那是拿"没量到"冒充"量到了别的页"）。 */
  if (/^落点探针没给结果/.test(reason)) return { bucket: "SKIPPED-route-probe-no-answer" };
  /* 执行器要求出帧、帧却因太小被拒、探针又没给出有效答案 ⇒ 这一条既没量到、也没有可看的帧。
     给它一个名字**不等于**结案：命名只是让它从"没人看见"变成"人人看见"，
     所以它同时进 evidenceHoles[]，由文末断言单独否决（见 EVIDENCE_HOLE）。 */
  if (/^出帧失败且探针无有效答案/.test(reason)) {
    const miss = (reason.match(/miss=([^\s（）()]+)/) || [])[1] || null;
    const bytes = (reason.match(/[（(]\s*仅\s*(\d+)\s*B/) || [])[1] || null;
    return { bucket: "SKIPPED-frame-evidence-hole", evidenceHole: true, miss, bytes };
  }
  if (/^落在别的页/.test(reason)) {
    const landed = (obs.match(/top=(\S+)/) || [])[1] || null;
    return { bucket: "FAILED-landing-guard", landed };
  }
  return null;
}

/* 每一组「声明页 → 实际落地页」都必须在这里有一条 booked 复测腿或裁决；
   新增落地对而这里没有 → 门禁红（见文末断言），不许悄悄当成"已归类"放过。 */
/* 词表自核：BUCKET 里挂了名字但没有任何一条归类规则能产出它 ⇒ 那条规则串和执行器说的不是一句话
   （本轮就为此踩过：执行器改了原因串，triage 把它整批算成 unclassified，看着像"没红"其实没归类）。
   这是只读自己源码的静态核对，不碰盘、不取租约。 */
{
  const src = fs.readFileSync(import.meta.filename, "utf8");
  const produced = (b) => {
    const q = b.replace(/[-]/g, "\\-");
    /* 这个文件里"产出一个桶"有两种写法：归类函数返回 { bucket: "X" }，
       和主循环里的 push(r, "X", {...})。只认前一种会把后一种的 8 个桶全判成空转（实测就是这样假红）。 */
    return new RegExp('bucket:\\s*"' + q + '"').test(src) || new RegExp('push\\([^,]*,\\s*"' + q + '"').test(src);
  };
  const orphans = Object.keys(BUCKET).filter((b) => !produced(b));
  console.log(`TRIAGE_VOCAB buckets=${Object.keys(BUCKET).length} 无规则可达=${orphans.length}`);
  for (const o of orphans) console.log("  VOCAB_ORPHAN " + o + " ⇒ 挂了桶却没有能产出它的归类规则（执行器的原因串和这条正则不同源）");
  if (orphans.length) { console.log("TRIAGE_RESULT=FAIL reason=词表里有空转桶 ⇒ 先对齐执行器口径再判"); process.exit(2); }
}

const LANDING_DISPOSITION = {
  "pages/login/index → pages/discover/index": "身份带不匹配：mock 带自动登录，已登录态进登录页被守卫送到广场。由 guest 真实带腿复测（exec-guest-real）。",
  "subpackages/vip/index → pages/profile/index": "权益重定向：未持有会员时 VIP 页被送回我的页。由 showcase 带腿复测。",
  "subpackages/vip/bills → pages/profile/index": "权益重定向：同 VIP 入口。由 showcase 带腿复测。",
  "subpackages/vip/promo-code → pages/profile/index": "权益重定向：兑换码页挂在 VIP 守卫后。由 showcase 带腿复测。",
  /* 游客档专属的两组落地对。写清楚它是"按既定裁定的正确行为"，同时写清楚**判据本身要改** ——
     这一条不能因为归了类就算结案，所以带 未结案 前缀，由文末单独计数并公开。 */
  "subpackages/campus/campus/hub → pages/login/index": "未结案：游客进校园 hub 被守卫送到登录页 —— 与既定裁定（游客不得浏览、未登录须引导到登录/注册）方向一致 ⇒ 产品没错，错的是判据：这条用例现在断言的是「看到 hub 内容」。须把判据改成断言「被引导到 pages/login/index」并按裁定重新登记，不改判据不许算过。",
  "subpackages/campus/campus/index → pages/login/index": "未结案：同上，校园 index 页。判据断言的是页内内容而非重定向，须收紧成可判物件「落地页 == pages/login/index + 登录页品牌件 present」。",
  /* guest 真实带（round-7 第二把身份刀）实测：游客档下所有内容页都被守卫送到登录页，
     落地对全部是 X → pages/login/index，方向与既定裁定一致 ⇒ 产品没错、判据错了。
     逐组登记而不是写一条通配：将来某一组不再落登录页（守卫放宽或某页本来该放行），
     必须靠这一组的锚点失配暴露出来，而不是被一条笼统规则吸收掉。 */
  "subpackages/discover-extra/discover/matching → pages/login/index": "未结案：游客档被守卫送到登录页，与裁定（游客不得浏览、未登录须引导到登录/注册）一致 ⇒ 须把判据改成断言重定向，并按裁定把这条标成 A 档专属或双档各一条。",
  "subpackages/discover-extra/discover/match-success → pages/login/index": "未结案：同上（匹配成功页是登录后态，游客本就不该到达）⇒ 判据要么改断言重定向，要么标 guest-only-负例。",
  "subpackages/village/village/index → pages/login/index": "未结案：同上，乡村首页。",
  "subpackages/village/village/publish → pages/login/index": "未结案：同上；发布页属写侧动作，游客不可达是设计 ⇒ 判据须改断言重定向。",
  "subpackages/village/village/tag-posts → pages/login/index": "未结案：同上，话题聚合页。",
  "subpackages/village/village/history → pages/login/index": "未结案：同上，浏览历史是个人数据，游客不可达是设计。",
  "subpackages/circles/circles/circle-home → pages/login/index": "未结案：同上，圈子首页。",
  "subpackages/campus/campus/certification → pages/login/index": "未结案：认证页需要已登录身份，游客不可达符合设计；但这一组要单独确认「想发起认证的新用户」的正确入口在哪（若答案是登录页，判据就断言重定向；若是注册页，则本组是真实的产品缺口）。",
  /* ↓ guest 真实带跑完 1107 行后的其余 13 组落地对（93 行），落点同样全是 pages/login/index。
     不写成一条通配：三组理由不同，将来某一组放宽时要把那一组单独照出来。 */
  "subpackages/tools/search/index → pages/login/index": "未结案：内容检索属「游客不得浏览」范围 ⇒ 与裁定一致；判据要改成断言重定向到登录页，而不是断言搜索结果。",
  "subpackages/discover/activities/index → pages/login/index": "未结案：活动列表属内容浏览，「游客不得浏览」范围内 ⇒ 判据改断言重定向。",
  "subpackages/profile-extra/profile/album → pages/login/index": "未结案：个人相册属个人数据，游客不可达符合设计 ⇒ 判据改断言重定向。",
  "subpackages/profile-extra/profile/favorites → pages/login/index": "未结案：同上，收藏。",
  "subpackages/profile-extra/profile/tasks → pages/login/index": "未结案：同上，任务/成就。",
  "subpackages/profile-extra/settings/dnd → pages/login/index": "未结案：设置项属已登录会话，游客不可达符合设计 ⇒ 判据改断言重定向。",
  "subpackages/profile-extra/feedback/history → pages/login/index": "未结案：反馈历史属个人数据，同上。",
  "subpackages/profile-extra/verification/index → pages/login/index": "未结案：与 certification 同一类问题——发起实人认证的入口对游客是否应当放行（若应引导去注册，本组是产品缺口而不是判据问题）。",
  "subpackages/profile-extra/verification/real-name → pages/login/index": "未结案：同上，实名页。",
  "subpackages/support/feedback/index → pages/login/index": "未结案：意见反馈是否要求登录是产品口径问题（游客报错无门）；判据不能默认「必须能进」。",
  "subpackages/setup/campus/index → pages/login/index": "未结案：setup 三步是注册前引导还是登录后设置，尚未拍板；若属注册前，这一组就是真缺口。",
  "subpackages/setup/schedule/index → pages/login/index": "未结案：同上。",
  "subpackages/setup/interest/index → pages/login/index": "未结案：同上。",
};

const buckets = {};
const items = [];
let unclassified = 0;
const unclassifiedRows = [];
const evidenceHoles = [];   // 有名字也不许结案的证据缺口：命名只是让它从"没人看见"变成"人人看见"
const gateProblems = [];
/* 每条"落进兜底桶"的行都单独记一句人可读的原因：门禁变红时必须自带证据，
   否则下一次跑这个脚本的人只能看到一个数字，还得重跑一遍才知道是哪几条。 */
const markUnclassified = (r, why) => {
  unclassified++;
  unclassifiedRows.push(`${r.id} @ ${r.page ?? "?"} [${r.status}] ${why} :: reason="${String(r.failureReason || "").slice(0, 110)}"`);
};
const markProblem = (m) => gateProblems.push(m);
let curOnTarget = null;   // 每条迭代重算：动作发生时是否就在用例声明的页面上
let curMismatch = false;  // observed 里的 `MISMATCH!`：前置身份/状态与自己声明的不符

const push = (r, b, extra) => {
  buckets[b] = (buckets[b] || 0) + 1;
  items.push({ id: r.id, suite: r.suite, page: r.page, status: r.status, bucket: b, onTarget: curOnTarget, mismatch: curMismatch, ...extra });
};

for (const r of rows) {
  if (r.status === "EXECUTED") { buckets["EXECUTED"] = (buckets["EXECUTED"] || 0) + 1; continue; }
  const obs = String(r.observed || "");
  const reason = String(r.failureReason || "");

  // 动作发生时在不在目标页：`top=` 与 route[] 末条都是执行器自报；与 page 不符 → 定位失败与元素存在性无关
  const topM = obs.match(/top=([^\s|]+)/);
  const lastRoute = Array.isArray(r.route) && r.route.length ? r.route[r.route.length - 1].route : null;
  curOnTarget = topM ? topM[1] === r.page : lastRoute ? lastRoute === r.page : null;
  curMismatch = /MISMATCH!/.test(obs);

  if (r.status === "SKIPPED" || r.status === "FAILED") {
    const re7 = matchRe7(reason, obs);
    if (re7) {
      const { bucket, op, token, tokenKind, recoverable, sel, note, landed, evidenceHole, miss, bytes, unclassified: uc } = re7;
      push(r, bucket, { want: token ? sel : (miss ? miss : (note ? String(note).slice(0, 120) : null)), op, token, tokenKind, recoverable, sel, landed, evidenceHole, frameBytes: bytes, from: "reason-re7" });
      if (evidenceHole) evidenceHoles.push(`${r.id} @ ${r.page} 要求出帧但帧未成立（${miss || "无 miss 路径"}${bytes ? `，仅 ${bytes}B` : ""}）`);
      if (uc) markUnclassified(r, "交互腿下发失败但没留下可复核的选择器");
      continue;
    }
  }
  if (r.status === "SKIPPED") {
    const m = obs.match(RE_OBS_SKIP);
    if (!m) {
      push(r, "other-fail", { want: null, note: `SKIPPED 但既不在 round-7 词表里、observed 也没有 action-not-automatable 尾注：reason="${reason.slice(0, 120)}"` });
      markUnclassified(r, "SKIPPED 口径不在词表内");
      continue;
    }
    push(r, "SKIPPED-not-automatable", { want: m[1], note: null });
    continue;
  }
  if (r.status !== "FAILED") { push(r, "other-fail", { want: null, note: `未知 status=${r.status}` }); markUnclassified(r, `未知 status=${r.status}`); continue; }

  // 取"失败那一幕"的原文：优先 failureReason（单句、机读），observed 只做兜底且取最后一条 act-FAIL
  let op = null, target = null, detail = null, src = null;
  const rm = reason.match(RE_REASON);
  const om = [...obs.matchAll(new RegExp(RE_OBS_FAIL.source, "g"))].pop();
  if (rm) { op = rm[1]; target = rm[2]; detail = rm[3]; src = "reason"; }
  else if (om) { op = om[1]; target = om[2]; detail = om[3].trim(); src = "observed"; }
  else { push(r, "other-fail", { want: null, note: `observed/failureReason 都不是 act-FAIL/action-x-failed 形态：obs="${obs.slice(0, 100)}" reason="${reason.slice(0, 100)}"` }); markUnclassified(r, "FAILED 但两种失败原文形态都对不上"); continue; }

  if (/is not a function|is not defined|TypeError|Cannot read/.test(detail)) { push(r, "harness-api", { want: detail.slice(0, 120), op, from: src }); continue; }
  if (/timeout|TIMEOUT/.test(detail)) { push(r, "timeout", { want: detail.slice(0, 120), op, from: src }); continue; }
  // 只按动作名判前置失败：`/login|logout/` 这种松散匹配会把 .login-sms-fallback 之类的选择器误判成登录前置失败
  if (op === "login" || op === "logout" || /^(login|logout|mint token|bootstrap)/i.test(detail)) {
    push(r, "auth-precondition", { want: detail.slice(0, 120), op, target, from: src }); continue;
  }

  const nf = detail.match(RE_NOT_FOUND);
  if (!nf) { push(r, "other-fail", { want: detail.slice(0, 160), op, from: src }); markUnclassified(r, "detail 不是 element not found 形态"); continue; }
  const found = nf[1].trim();

  const lm = found.match(/^__CAND__\s*[（(]"(.*)"[)）]$/);
  if (lm) {
    push(r, "locate-label", { want: lm[1], op, token: lm[1], tokenKind: "label", recoverable: true, suspect: lm[1].length < 2, from: src });
    continue;
  }
  // 选择器 + 标签混排（`.btn-text("返回微信登录")`）：决定性的是标签，选择器只是作用域
  const sm = found.match(/^(.+?)\s*[（(]"(.*)"[)）]$/);
  if (sm && sm[1] !== "__CAND__") {
    push(r, "locate-label", { want: sm[2], op, sel: sm[1], token: sm[2], tokenKind: "label", recoverable: true, suspect: sm[2].length < 2, from: src });
    continue;
  }
  if (found === "__CAND__" || found === "") {
    // 执行器只留下哨兵，没写要找的文案，也没写候选选择器 → 这条证据无法复核
    push(r, "locate-label-token-lost", { want: null, op, token: null, recoverable: false, from: src });
    markUnclassified(r, "执行器只留哨兵，没留文案也没留候选选择器（取证缺陷）");
    continue;
  }
  push(r, "locate-selector", { want: found, op, token: found.replace(/^[.#]/, ""), tokenKind: "selector", recoverable: true, from: src });
}

// ---------- token 存在性双查（标签按运行时语义 substring 匹配，选择器按类名 token 匹配）----------
const NEEDS_INDEX = items.filter((it) => it.recoverable && it.token);
for (const it of NEEDS_INDEX) {
  const matcher = it.tokenKind === "selector" ? hitsSel : hits;
  const dh = matcher(distIdx, it.token), sh = matcher(srcIdx, it.token);
  it.distHits = dh.length; it.srcHits = sh.length;
  it.distHere = pageScoped(dh, it.page).length;
  it.srcHere = pageScoped(sh, it.page).length;
  it.verdict =
    it.onTarget === false ? "不在目标页：前置导航没到位（用例前置/harness 通道），元素存在性无从判断"
      : (!dh.length && !sh.length) ? "两载皆无：本构建确无此文案/类，用例断言的目标不存在（产品缺或规格臆造）"
      : (!dh.length && sh.length) ? "仅源码有：修复波补上了它 → 本轮失败作废，重建后必须复验"
        : (dh.length && !sh.length) ? "仅构建有：修复波删掉了它 → 下次构建会新增失败，必须复验"
          : "两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机）";
}

// ---------- 落地对（每组须有 booked 复测腿或裁决）----------
const landingGroups = {};
for (const it of items) {
  if (it.bucket !== "FAILED-landing-guard") continue;
  const k = `${it.page} → ${it.landed || "?"}`;
  (landingGroups[k] = landingGroups[k] || []).push(it.id);
}
const landingKeys = Object.keys(landingGroups);
/* 落地对的处置：先读机器账本（verify-guest-landing.mjs --mode book 出的复测腿），
   再退回到脚本里手写的 LANDING_DISPOSITION。手写表只是"有人想过"，
   账本才是"有一腿会替我们量"——两者都在时以账本为准，因为它带三态。 */
const GUEST_BOOK = arg("guest-book", "reports/audit/round-7/guest-landing-booked.json");
const GUEST_MEASURED = arg("guest-measured", "reports/audit/round-7/guest-landing-measured.json");
const bookedText = {};
const coverMismatch = [];
const coverIdentitySkips = [];
/* 复测腿账本绑的是游客档那批行；A 档语料里同名落地对（VIP 三页）成员不同是应当的，
   拿它去比成员会造出三条假红 —— 所以先对齐身份，再比成员。 */
const corpusIdentity = String(doc.identity || (rows[0] && rows[0].identity) || "?");
/* 部分切片（--real-cases-only）天生只含 requiresReal 那一批 ⇒ 每组成员必然是全量的子集。
   拿它去比 booked 账本（按全量成员记账）会造出一串"这条腿量的不是这笔债"的假红
   （round-7 实测 24 组，例：campus/hub 账本 18 行 vs 本切片 4 行）。
   这不是债没对上，是核对轴不同源：切片腿回答"真实档这一组判没判过"，
   成员账回答"这一组由哪条腿复测"。所以切片语料不比成员，但**仍要求这组被复测腿认领**
   （下面的 landingMissing 照查），不许顺势把整组判成已结案。 */
const corpusIsPartialSlice = /real-cases-only/.test(String(doc.runner || "")) ||
  rows.some((r) => /^真实刀只跑 requiresReal 用例/.test(String(r.failureReason || "")));
const coverSliceSkips = [];
if (fs.existsSync(GUEST_BOOK)) {
  const bk = JSON.parse(fs.readFileSync(GUEST_BOOK, "utf8"));
  const ms = fs.existsSync(GUEST_MEASURED) ? JSON.parse(fs.readFileSync(GUEST_MEASURED, "utf8")) : null;
  for (const r of landingStatus(bk, ms)) {
    bookedText[r.groupKey] = r.statusText;
    const here = (landingGroups[r.groupKey] || []).slice().sort().join(",");
    const claim = (r.caseIds || []).slice().sort().join(",");
    if (r.identity && r.identity !== corpusIdentity) {
      if (here) coverIdentitySkips.push(`${r.groupKey}：账本绑 ${r.identity} 档 ${r.debtRows} 行，本语料是 ${corpusIdentity} 档 ${landingGroups[r.groupKey].length} 行 ⇒ 不比成员（落地对仍按账本处置）`);
      continue;
    }
    if (here && here !== claim) {
      /* 切片只可能让某一组"少几行"。实测多于账本 ⇒ 不能顺手写成"账本漏记"：
         round-7 实测这一支的真因是**成员本身随单次运行而变**——
         同一组在 --real-cases-only 切片里 7 行、在全量跑里 5 行（哪些行落进
         FAILED-landing-guard 取决于当次的落点/交互结果），所以拿任何"一次运行"当债名册都不成立。
         这里只陈述"两次不一样"这个事实，因果留给 ops 清单派生成员那一步去解（见 #67）。 */
      const subsetOnly = corpusIsPartialSlice && landingGroups[r.groupKey].length <= (r.caseIds || []).length;
      if (subsetOnly) coverSliceSkips.push(`${r.groupKey}：实测 ${landingGroups[r.groupKey].length} 行 vs 账本 ${r.caseIds.length} 行`);
      else coverMismatch.push(`${r.groupKey}：复测腿账本声称覆盖 ${(r.caseIds || []).length} 行，本轮该组实测 ${landingGroups[r.groupKey].length} 行且成员不同 ⇒ 这条腿量的不是这笔债${corpusIsPartialSlice ? "（实测多于账本 ⇒ 成员随单次运行而变，债名册不能由一次跑派生）" : ""}`);
    }
  }
}
const dispositionOf = (k) => bookedText[k] || LANDING_DISPOSITION[k] || null;
const landingMissing = landingKeys.filter((k) => !dispositionOf(k));

// ---------- 守恒断言（自洽性：不成立就别写报告）----------
const total = rows.length;
const sum = Object.values(buckets).reduce((a, b) => a + b, 0);
if (sum !== total) die(`FAIL 分类不守恒：桶合计 ${sum} ≠ 行总数 ${total}（有行被重复计或漏计）`);
const neg = Object.entries(buckets).filter(([, v]) => v < 0);
if (neg.length) die(`FAIL 出现负计数：${JSON.stringify(neg)}`);

const suspect = items.filter((it) => it.suspect).length;
const fromObserved = items.filter((it) => it.from === "observed").length;
const noReason = rows.filter((r) => r.status === "FAILED" && !r.failureReason).length;
const offTarget = items.filter((it) => it.onTarget === false).length;
const noTop = items.filter((it) => it.onTarget === null).length;
const mism = items.filter((it) => it.mismatch).length;

// ---------- 输出 ----------
const order = ["EXECUTED", ...Object.keys(BUCKET)];
const NO_TARGET = new Set(["SKIPPED-real-band", "SKIPPED-vague-action", "SKIPPED-vague-criterion", "SKIPPED-observe-only-slice", "SKIPPED-deny-irreversible", "SKIPPED-left-page", "SKIPPED-frame-evidence-hole", "FAILED-landing-guard"]);
const lines = [];
lines.push(`# 执行轮失败分诊（round 权威件：${RESULTS}）`);
lines.push("");
lines.push(`- 权威件快照：round=${doc.round ?? "?"} gitSha=${doc.gitSha ?? "?"} updatedAt=${doc.updatedAt ?? "?"} 行数=${total}`);
lines.push(`- 构建索引：${DIST} → ${distIdx.length}/${distFiles.length} 文件；源码索引：${SRC} → ${srcIdx.length}/${srcFiles.length} 文件`);
if (distFiles.length !== distIdx.length || srcFiles.length !== srcIdx.length)
  lines.push(`- **读取失败计数**：dist ${distFiles.length - distIdx.length} 个、src ${srcFiles.length - srcIdx.length} 个文件读不出（存在性判定是在"可读物集"上做的，不是全量，见上）`);
lines.push(`- 守恒：桶合计 ${sum} == 行数 ${total} ✔`);
lines.push(`- 解析来源：failureReason ${items.filter((i) => i.from === "reason").length} 条 / observed 兜底 ${fromObserved} 条；FAILED 行里 failureReason 为空 ${noReason} 条`);
lines.push(`- 单字标签（从用例散文里抠出来的残字，几乎必是规格噪声而不是产品缺陷）：${suspect} 条`);
lines.push(`- 动作发生时不在用例声明的页面上：${offTarget} 条；observed 里读不到 top= 也读不到 route[]（判不了）：${noTop} 条`);
lines.push(`- observed 带 \`MISMATCH!\`（执行器自报前置身份/状态不符）：${mism} 条`);
lines.push("");
lines.push("| 桶 | 条数 | 含义 |");
lines.push("|---|---|---|");
for (const b of order) if (buckets[b]) lines.push(`| ${b} | ${buckets[b]} | ${BUCKET[b] || "已通过的行，不参与分诊"} |`);
lines.push("");
lines.push(`判据形态未能归类的行数（归在兜底桶里，逐条列在下文）：**${unclassified}**`);
lines.push("");
for (const s of unclassifiedRows.slice(0, 60)) lines.push(`- ${s}`);
if (unclassifiedRows.length > 60) lines.push(`- …另 ${unclassifiedRows.length - 60} 行见同名 .json 的 unclassifiedRows`);
if (unclassifiedRows.length) lines.push("");

const four = {};
for (const it of NEEDS_INDEX) four[it.verdict] = (four[it.verdict] || 0) + 1;
lines.push("## 存在性四格（只统计能恢复出查找目标的定位失败）");
lines.push("");
lines.push("| 结论 | 条数 |");
lines.push("|---|---|");
for (const [k, v] of Object.entries(four).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
lines.push("");

if (landingKeys.length) {
  lines.push("## 落地对（FAILED-landing-guard：每组须有 booked 复测腿或裁决）");
  lines.push("");
  lines.push("| 声明页 → 实际落地页 | 条数 | 处置 |");
  lines.push("|---|---|---|");
  for (const k of landingKeys.sort((a, b) => landingGroups[b].length - landingGroups[a].length))
    lines.push(`| ${k} | ${landingGroups[k].length} | ${dispositionOf(k) || "**无处置 —— 须 booking 复测腿或写裁决**"} |`);
  lines.push("");
}

for (const b of order) {
  const list = items.filter((it) => it.bucket === b);
  if (!list.length || b === "EXECUTED") continue;
  lines.push(`## ${b}（${list.length} 条）`);
  lines.push("");
  if (b === "SKIPPED-not-automatable" || NO_TARGET.has(b)) {
    const byPage = {};
    for (const it of list) (byPage[it.page] = byPage[it.page] || []).push(it);
    for (const [p, l] of Object.entries(byPage).sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`- ${p}（${l.length} 条）：` + l.slice(0, 4).map((x) => `${x.id}${x.landed ? "→" + x.landed : ""}${x.want ? `「${String(x.want).slice(0, 50)}」` : ""}`).join("、") + (l.length > 4 ? `；另 ${l.length - 4} 条` : ""));
    }
  } else {
    const grouped = {};
    for (const it of list) {
      const k = `${(it.sel ? it.sel + '「' + it.token + '」' : it.want) || "?"} @ ${it.page}`;
      (grouped[k] = grouped[k] || []).push(it);
    }
    lines.push("| 要找的东西 | 页面 | 条数 | dist 命中(本页) | src 命中(本页) | 结论 |");
    lines.push("|---|---|---|---|---|---|");
    for (const [k, l] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
      const f = l[0];
      const tk = String(k.split(" @ ")[0]).replace(/\|/g, "/") + (f.suspect ? " ←单字残标签" : "");
      lines.push(`| ${tk} | ${f.page} | ${l.length} | ${f.distHits ?? "—"}(${f.distHere ?? "—"}) | ${f.srcHits ?? "—"}(${f.srcHere ?? "—"}) | ${f.verdict || "无查找目标"} |`);
    }
  }
  lines.push("");
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT + ".md", lines.join("\n"));
fs.writeFileSync(OUT + ".json", JSON.stringify({ results: RESULTS, updatedAt: doc.updatedAt ?? null, total, buckets, bucketNames: Object.keys(BUCKET), unclassified, unclassifiedRows, evidenceHoles, landingGroups, landingMissing, items }, null, 1));
console.log(`TRIAGE_SUMMARY rows=${total} unclassified=${unclassified}`);
for (const b of order) if (buckets[b]) console.log(`  ${String(buckets[b]).padStart(4)} ${b}`);
console.log(`out=${OUT}.md / ${OUT}.json`);

/* 两条"发现级"断言放在**写盘之后**，且先收集再一次性退出：
   词表漂移（执行器说了本脚本没学过的话）与新增落地对（没人 booking 复测腿）都必须把门禁推红，
   但红之前报告要已经落盘 —— 否则下一个人只看到一个数字，还得重跑一遍才知道是哪几条。 */
if (unclassified) {
  markProblem(`有 ${unclassified} 行没落进具名桶（词表漂移或取证缺陷），须补分类而不是接受兜底桶：\n  ${unclassifiedRows.slice(0, 25).join("\n  ")}${unclassifiedRows.length > 25 ? `\n  …另 ${unclassifiedRows.length - 25} 行见 ${OUT}.json` : ""}`);
}
if (landingMissing.length) {
  markProblem(`有 ${landingMissing.length} 组落地对没有 booked 复测腿/裁决（须进 guest-landing-policy.json 或补 LANDING_DISPOSITION）：\n  ${landingMissing.join("\n  ")}`);
}
/* 复测腿账本与本轮债必须同成员：账本写"这腿替 CH01…CH27 说话"，
   而本轮该组实测成员变了（用例增删/落点变了）时，那条腿量的是另一笔债，不能替这批行结案。 */
if (coverMismatch.length) {
  markProblem(`复测腿与债不同源（${coverMismatch.length} 组）：\n  ${coverMismatch.join("\n  ")}`);
}
/* 证据缺口单独否决：这些行已经"有名字"了，如果命名就算归类成功，那给每个洞起个名字就能把门刷绿。 */
if (evidenceHoles.length) {
  markProblem(`有 ${evidenceHoles.length} 条要求出帧却没拿到可用帧、探针也没给出有效答案 ⇒ 证据缺口，命名不等于结案：\n  ${evidenceHoles.slice(0, 25).join("\n  ")}${evidenceHoles.length > 25 ? `\n  …另 ${evidenceHoles.length - 25} 条见 ${OUT}.json` : ""}`);
}
const openRulings = landingKeys.filter((k) => /^未结案/.test(dispositionOf(k) || ""));
/* 红的那一次也要把"未结案"的组数打出来：这些是已归类但**没结案**的行，
   如果只在绿的时候报，读者永远看不到它们（而它们正是本门要往外送的东西）。 */
console.log(`TRIAGE_OPEN 未结案的落地对=${openRulings.length} 证据缺口=${evidenceHoles.length}（处置来源：复测腿账本 ${Object.keys(bookedText).length} 组 / 手写表 ${landingKeys.filter((k) => !bookedText[k] && LANDING_DISPOSITION[k]).length} 组）`);
for (const k of openRulings) console.log(`  OPEN_RULING ${k}（${landingGroups[k].length} 条）：${dispositionOf(k)}`);
if (corpusIsPartialSlice) console.log(`TRIAGE_SLICE_AXIS=partial（--real-cases-only 语料）不比成员的组数=${coverSliceSkips.length}；这些组仍须被复测腿认领，缺认领照旧判缺（见 TRIAGE_OPEN）`);
for (const s of coverSliceSkips) console.log(`  COVER_SLICE_SKIP ${s}`);
for (const s of coverIdentitySkips) console.log(`  COVER_SKIP ${s}`);
if (gateProblems.length) {
  console.log(`TRIAGE_RESULT=FAIL problems=${gateProblems.length}`);
  for (const p of gateProblems) console.log("  ✗ " + p);
  process.exit(2);
}
console.log(`TRIAGE_GATE=PASS unclassified=0 landingGroups=${landingKeys.length} 全部有处置；但其中 ${openRulings.length} 组处置本身写着"未结案"、${evidenceHoles.length} 条证据缺口 —— 这两类不计入结案`);
