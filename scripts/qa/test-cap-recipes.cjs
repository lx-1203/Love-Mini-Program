#!/usr/bin/node
/* case-recipes.json ↔ 判据台 的交叉校验（capability 车道 2026-10-06）。
   test-exec-capabilities.cjs 钉的是模块纯函数与配方文件自身的结构；本文件钉的是
   **配方对真判据台的承诺**：
   ① 每个配方键都在判据台里真实存在（键拼错 = 静默少跑，--ids-file 同一条教训）；
   ② 配方 page 与判据台 page 一致（逐例深链别把落点钉错页）；
   ③ 判据的 tapTarget 必须被配方步骤/夹具文本覆盖 —— 能力件要解的就是"点名物件点不到"，
      配方里碰不到 tapTarget 的配方不许自称解锁了这条判据（validateRecipes 的硬判点）；
   ④ 判据的 identities 口径：本通道只配登录轴；配方必须声明为什么不含游客轴
      （OT06/OC09 的游客轴是落点裁定问题，配方文件 hygiene 字段点名了它）；
   ⑤ requiresReal 用例的配方不得在 mock 载体上跑（防 mock 冒充真实模式 —— 门的那句老话）。
   跑法：node scripts/qa/test-cap-recipes.cjs
   聚合器认：SUMMARY: assertion failures = N + CAPRECIPES_TEST=PASS|FAIL。零设备、零落盘。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const OPS = path.join(REPO, "reports", "audit", "round-6", "ops");
/* RECIPES_UNDER_TEST：与下面 CAPS_UNDER_TEST 同一条纪律 —— 空转防护要用**一次性变异副本**
   跑同一套断言（活文件全程不改，用完即删），所以配方路径要能被外部指走；否则 §8 的负例
   只能靠自己构造的假语料，那就退回「永远绿的测试」。 */
const RECIPES_FILE = process.env.RECIPES_UNDER_TEST
  ? path.resolve(REPO, process.env.RECIPES_UNDER_TEST)
  : path.join(REPO, "scripts", "qa", "case-recipes.json");
const RECIPES = JSON.parse(fs.readFileSync(RECIPES_FILE, "utf8"));
const NODE = process.execPath;

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 150) + ")"));
}

/* ══════════════════════════════════════════════════════════════════════════════
   §8 用**编译产物**数选择器命中几枚（配方车道 2026-10-13，PFI25/v37 那条
   UNVERIFIED-INSTRUMENT 直接要补的判点）。
   ── 为什么要离线数产物 ──
   配方里的 tap 走 r-exec-ws.mjs 的 deepOne ⇒ automator 的 page.$，**永远取第一个命中**（实测：
   exec-v37-pfi25 的 step#6 probe 报 .voice-preview__delete present(2)，step#10 tap 打到 idx0「重录」，
   于是 drainModal 收到 0 次弹窗 —— 产品行为没问题，是配方说不清自己点了谁）。设备腿一轮几十分钟，
   这个错必须离线判红。数的是 apps/client/dist/build/mp-weixin-real 的 .wxml —— 跑的是产物，
   不是 .vue 源，所以「源里看着唯一」不算数。
   ── 下面这组纯函数只服务本文件的断言（载具解释器 r-exec-ws.mjs 不 import 它，本车道不碰执行器）──
   支持形：tag / .class / #id / [attr] / [attr="v"] / :first-child / :last-child / :nth-child(k) /
   后代与子代组合符（空格、>）/ 穿透链「>>>」（中间段=自定义组件标签，经该层 .json 的 usingComponents 解析）。
   uni-app 会把 :class 编成 class="{{['a','b', c && 'd']}}"，所以类名 token 也从这种数组里取引号串。
   ══════════════════════════════════════════════════════════════════════════════ */
const BAND = path.join(REPO, "apps", "client", "dist", "build", "mp-weixin-real");
const POSITION_PSEUDO = /:(?:first-child|last-child|nth-child\(\d+\))/;
const ACTUATING = ["tap", "rapidTap", "input", "readValue"];
function wxmlAttrs(raw) {
  const attrs = {};
  const re = /[-.\w:]+(?:\s*=\s*"[^"]*")?/g;
  let m;
  while ((m = re.exec(raw))) {
    const p = /^([-.\w:]+)(?:\s*=\s*"([^"]*)")?$/.exec(m[0].trim());
    if (p && !(p[1] in attrs)) attrs[p[1]] = p[2] === undefined ? "" : p[2];
  }
  return attrs;
}
function parseWxml(text) {
  const nodes = [];
  const stack = [];
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt < 0) break;
    if (text[lt + 1] === "!") { const end = text.indexOf(">", lt); i = end < 0 ? text.length : end + 1; continue; }
    let j = lt + 1, quote = null;
    while (j < text.length) {
      const ch = text[j];
      if (quote) { if (ch === quote) quote = null; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === ">") break;
      j++;
    }
    const raw = text.slice(lt + 1, j).trim();
    i = j + 1;
    if (!raw || raw[0] === "?") continue;
    if (raw[0] === "/") { if (stack.length) stack.pop(); continue; }
    const selfClose = /\/$/.test(raw);
    const body = raw.replace(/\/$/, "");
    const tag = /^([a-zA-Z][-.\w]*)/.exec(body);
    if (!tag) continue;
    const parent = stack[stack.length - 1] || null;
    const node = { tag: tag[1], attrs: wxmlAttrs(body.slice(tag[1].length)), parent, children: [] };
    if (parent) parent.children.push(node);
    nodes.push(node);
    if (!selfClose) stack.push(node);
  }
  return nodes;
}
function classTokens(v) {
  const s = String(v === undefined ? "" : v);
  if (s.indexOf("{{") >= 0) return [...s.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] !== undefined ? m[1] : m[2]).filter(Boolean);
  return s.split(/\s+/).filter(Boolean);
}
function simpleParts(s) {
  const out = { tag: "", classes: [], id: "", attrs: [], pseudo: [] };
  const head = /^[a-zA-Z][\w-]*/.exec(s);
  let from = 0;
  if (head && !/^[.#[]/.test(s)) { out.tag = head[0]; from = head[0].length; }
  const re = /([.#][\w-]+|\[[^\]]+\]|:[\w-]+(?:\([^)]*\))?)/g;
  let m;
  while ((m = re.exec(s.slice(from)))) {
    const t = m[1];
    if (t[0] === ".") out.classes.push(t.slice(1));
    else if (t[0] === "#") out.id = t.slice(1);
    else if (t[0] === "[") out.attrs.push(t.slice(1, -1));
    else if (t[0] === ":") out.pseudo.push(t.slice(1));
  }
  return out;
}
const FILE_CACHE = new Map();
function wxmlNodes(file) {
  if (!FILE_CACHE.has(file)) FILE_CACHE.set(file, fs.existsSync(file) ? parseWxml(fs.readFileSync(file, "utf8")) : null);
  return FILE_CACHE.get(file);
}
function matchSimple(node, parts) {
  if (parts.tag && parts.tag !== node.tag) return false;
  const cls = classTokens(node.attrs.class);
  if (!parts.classes.every((c) => cls.includes(c))) return false;
  if (parts.id && String(node.attrs.id || "") !== parts.id) return false;
  for (const a of parts.attrs) {
    const p = /^([^=]+?)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))$/.exec(a) || /^([-.\w:]+)$/.exec(a);
    if (!p) return false;
    const got = node.attrs[p[1]];
    if (got === undefined) return false;
    const want = p[2] !== undefined ? p[2] : p[3] !== undefined ? p[3] : p[4];
    if (want !== undefined && got !== want) return false;
  }
  for (const p of parts.pseudo) {
    const sib = node.parent ? node.parent.children : [node];
    if (p === "last-child") { if (node !== sib[sib.length - 1]) return false; }
    else if (p === "first-child") { if (node !== sib[0]) return false; }
    else if (/^nth-child\(\d+\)$/.test(p)) { if (sib.indexOf(node) + 1 !== Number(/\((\d+)\)/.exec(p)[1])) return false; }
    else return false;
  }
  return true;
}
function splitCombinators(seg) {
  const parts = [];
  let mode = "desc";
  for (const tok of seg.trim().split(/\s+/)) {
    if (tok === ">") { mode = "child"; continue; }
    parts.push({ mode, sel: tok });
    mode = "desc";
  }
  return parts;
}
function hitsIn(file, selector) {
  const nodes = wxmlNodes(file);
  if (!nodes) return null;
  const chain = splitCombinators(selector);
  if (!chain.length) return null;
  const last = simpleParts(chain[chain.length - 1].sel);
  return nodes.filter((n) => matchSimple(n, last) && (() => {
    let cur = n;
    for (let i = chain.length - 1; i > 0; i--) {
      const head = simpleParts(chain[i - 1].sel);
      const step = chain[i].mode === "child"
        ? (!!cur.parent && matchSimple(cur.parent, head))
        : (() => { for (let p = cur.parent; p; p = p.parent) if (matchSimple(p, head)) return true; return false; })();
      if (!step) return false;
      cur = cur.parent;
    }
    return true;
  })());
}
function gateKey(node) {
  const g = [];
  for (let p = node; p; p = p.parent) {
    if ("wx:if" in p.attrs) g.unshift("if@" + p.attrs["wx:if"]);
    else if ("wx:elif" in p.attrs) g.unshift("elif@" + p.attrs["wx:elif"]);
    else if ("wx:else" in p.attrs) g.unshift("else");
  }
  return g.join("|");
}
/* 返回 {count, file, dynamic（命中在 wx:for 模板里 ⇒ 条数不可由产物证明）,
   exclusive（命中数>1 但两枚落在互斥 wx:if/wx:else 分支 ⇒ 产物条数会高估设备条数）, error} */
function countSelector(page, selector) {
  let file = path.join(BAND, String(page) + ".wxml");
  if (!fs.existsSync(file)) return { error: "产物里没有 " + path.relative(BAND, file) };
  const segs = String(selector).split(">>>").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < segs.length - 1; i++) {
    if (!/^[a-zA-Z][\w-]*$/.test(segs[i])) return { error: "穿透链段 " + segs[i] + " 不是组件标签形，离线数不了" };
    const json = file.replace(/\.wxml$/, ".json");
    let uc = {};
    try { uc = JSON.parse(fs.readFileSync(json, "utf8")).usingComponents || {}; } catch { /* 下面按解析不到处理 */ }
    const next = uc[segs[i]];
    if (!next) return { error: "段 " + segs[i] + " 在 " + path.relative(BAND, json) + " 的 usingComponents 里查不到" };
    file = path.resolve(path.dirname(file), next + ".wxml");
  }
  const hits = hitsIn(file, segs[segs.length - 1]);
  if (hits === null) return { error: "读不到 " + path.relative(BAND, file) };
  const gates = hits.map(gateKey);
  return {
    count: hits.length,
    file: path.relative(BAND, file),
    dynamic: hits.some((h) => { for (let p = h; p; p = p.parent) if ("wx:for" in p.attrs) return true; return false; }),
    exclusive: hits.length > 1 && gates.every((g) => g !== "") && new Set(gates).size === hits.length,
  };
}
/* 一条配方的「命中数」判点（活语料与变异副本共用同一个函数，负例才不是另造一套判点）：
   ① 动作步必须唯一致命中（0=死选择器，>1=歧义，wx:for=条数不可证）；
   ② 写了 expectMatches 的步必须与产物实测条数一致（expectMatches 的轴=编译产物命中数，不是设备同刻读数）；
   ③ 用位置伪类收窄的动作步，同配方必须有一步同时 probe 裸形与伪类形 ⇒ 设备读数自带「引擎认不认伪类」的判据。 */
function matchCountProblems(recipes) {
  const problems = [];
  for (const [key, r] of Object.entries(recipes.recipes || {})) {
    const steps = r.steps || [];
    const pseudoPairNeeds = new Set();
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!s || !s.do) continue;
      const isAct = ACTUATING.includes(s.do);
      const single = s.selector && (isAct || s.do === "assertPresent" || s.do === "assertAbsent");
      const list = s.do === "probe" ? (s.selectors || []) : (single ? [s.selector] : []);
      for (const sel of list) {
        const m = countSelector(r.page, sel);
        if (m.error) {
          if (isAct) problems.push(key + " step#" + (i + 1) + " 动作步 " + s.do + " 的选择器 " + sel + " 在产物里数不出来：" + m.error);
          continue;
        }
        if (isAct) {
          if (m.dynamic) problems.push(key + " step#" + (i + 1) + " 动作步 " + s.do + " 的选择器 " + sel + " 落在 wx:for 模板里（产物命中 " + m.count + " 枚模板节点，设备同刻条数不可由产物证明 ⇒ 寻址不唯一）");
          else if (m.count !== 1 && m.exclusive) problems.push(key + " step#" + (i + 1) + " 动作步 " + s.do + " 的选择器 " + sel + " 产物命中 " + m.count + " 枚且分属互斥 wx:if/wx:else 分支：同刻至多 1 枚，但按类名首匹配仍可能打偏 ⇒ 本仓不默认放行，要收窄到可判别的那一枚");
          else if (m.count !== 1) problems.push(key + " step#" + (i + 1) + " 动作步 " + s.do + " 的选择器 " + sel + " 在 " + m.file + " 命中 " + m.count + " 枚" + (m.count === 0 ? "（死选择器）" : "（PFI25/v37 的形状：automator 的 page.$ 取首命中，配方说不清点了谁；先收窄到唯一命中再上腿）"));
        }
        const map = s.do === "probe" && s.expectMatches && typeof s.expectMatches === "object" ? s.expectMatches : null;
        const present = map ? Object.prototype.hasOwnProperty.call(map, sel) : s.expectMatches !== undefined;
        if (present) {
          const declared = map ? map[sel] : s.expectMatches;
          if (typeof declared !== "number" || !Number.isInteger(declared) || declared < 0) {
            problems.push(key + " step#" + (i + 1) + " " + sel + " 的 expectMatches 不是非负整数（值 " + String(declared) + "）⇒ 半填/没测到的字段不许读成通过");
          } else if (declared !== m.count) {
            problems.push(key + " step#" + (i + 1) + " " + sel + " 声明 expectMatches=" + declared + " 而产物实测 " + m.count + "（" + m.file + "）");
          }
        }
      }
      if (s.do === "probe" && s.expectMatches && typeof s.expectMatches === "object") {
        const orphans = Object.keys(s.expectMatches).filter((k) => !(s.selectors || []).includes(k));
        if (orphans.length) problems.push(key + " step#" + (i + 1) + " probe 的 expectMatches 点名了没被 probe 的选择器：" + orphans.join(",") + "（声明与读数必须成对）");
      }
      if (isAct && POSITION_PSEUDO.test(String(s.selector || ""))) {
        pseudoPairNeeds.add(String(s.selector).replace(POSITION_PSEUDO, ""));
      }
    }
    /* 位置伪类是这条配方**唯一**能离线证唯一的把手，可它在设备上的有效性本仓只有反面实测（桥通道
       忽略位置伪类：scripts/qa/tour-cli-states.mjs:89），WS/automator 通道从未量过 ⇒ 配方必须自带
       「裸形与伪类形并列 probe 且各带 expectMatches」的对照步：设备上那一步的 present(n) 就是
       引擎认没认伪类的读数（认=1，不认=2 且当场可从行里读出，不必等 tap 打偏再猜）。 */
    for (const bare of pseudoPairNeeds) {
      const paired = steps.some((p) => p && p.do === "probe" && (p.selectors || []).includes(bare) &&
        (p.selectors || []).some((x) => x !== bare && x.indexOf(bare) === 0 && POSITION_PSEUDO.test(x)) && p.expectMatches);
      if (!paired) problems.push(key + " 有用位置伪类收窄的动作步（裸形 " + bare + "），却没有「裸形+伪类形并列且带 expectMatches」的对照 probe ⇒ 设备读数自证不了引擎认了这个伪类");
    }
  }
  return problems;
}
const liveProblems = matchCountProblems(RECIPES);
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

const corpus = new Map();
for (const f of fs.readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(OPS, f), "utf8"));
    corpus.set(f.replace(/\.json$/, ""), j);
  } catch { /* 解析失败的判据文件由别的门管 */ }
}

/* validateRecipes 的动态半边：用真判据台喂它（ESM 模块经 tmp 包装 import）。
   CAPS_UNDER_TEST 与 test-exec-verb-dispatch.cjs 的 EXEC_UNDER_TEST 同一条纪律：
   空转防护要用**一次性变异副本**跑同一套断言（活文件全程不改，用完即删），
   否则 §7 那批负例与「永远绿的测试」分不开。 */
const WRAPPER = path.join(REPO, ".zcode", "tmp", "caps-import.mjs");
const CAPS_FILE = process.env.CAPS_UNDER_TEST
  ? path.resolve(REPO, process.env.CAPS_UNDER_TEST)
  : path.join(REPO, "scripts", "qa", "exec-capabilities.mjs");
async function loadCaps() {
  fs.mkdirSync(path.dirname(WRAPPER), { recursive: true });
  fs.writeFileSync(WRAPPER, "import * as C from " + JSON.stringify("file://" + CAPS_FILE.split("\\").join("/")) + "; export default C;\n", "utf8");
  return (await import("file://" + WRAPPER.split("\\").join("/"))).default;
}

async function main() {
  const C = await loadCaps();
  console.log("被测能力模块=" + path.relative(REPO, CAPS_FILE) + (process.env.CAPS_UNDER_TEST ? "（变异副本，非活文件）" : "（活文件）"));
  /* corpus 形状：key → {page}（validateRecipes 只读 page；tapTarget 从 cases 里拼）。 */
  const gateCorpus = new Map();
  for (const [manifest, j] of corpus) {
    for (const c of (j.cases || [])) {
      gateCorpus.set(manifest + "|" + c.id, { page: j.page || c.page || "", tapTarget: c.tapTarget || "" });
    }
  }
  const v = C.validateRecipes(RECIPES, gateCorpus);
  t("validateRecipes 对真判据台零问题（键全在/page 全对/tapTarget 全覆盖/夹具全可回滚）", v.ok, v.problems.join("；"));

  const keys = Object.keys(RECIPES.recipes || {});
  for (const key of keys) {
    const [manifest, id] = [key.slice(0, key.indexOf("|")), key.slice(key.indexOf("|") + 1)];
    const mf = corpus.get(manifest);
    const c = mf && (mf.cases || []).find((x) => x.id === id);
    t("配方 " + key + " 在判据台有行", !!c, c ? "tier=" + c.tier : "找不到");
    if (!c) continue;
    t("配方 " + key + " 的 requiresReal=" + c.requiresReal + " ⇒ 必须真档跑（配方只配能力，不换档位账）", c.requiresReal === true, "");
    const r = RECIPES.recipes[key];
    /* 深链参数与判据台点名目标的一致性：query 里带 userId 的配方，其 id 必须在 r14 判据 cost 文本里被点过名
       （10001=未喜欢/OT05、100155=已喜欢未匹配/OT06 态1、10003=互喜/OT06 态2）—— 防止把任意 id 写死进去。 */
    const q = String(r.query || "");
    if (/userId=(\d+)/.test(q)) {
      const uid = /userId=(\d+)/.exec(q)[1];
      const allowed = { "次要20|OT05": ["10001"], "次要20|OT06": ["100155", "10003"], "次要20|OT09": ["10001"] };
      t("配方 " + key + " 深链 userId=" + uid + " 在 r14 实测点名的目标表内", (allowed[key] || []).includes(uid), "allowed=" + (allowed[key] || []).join("/"));
    }
    /* OC09 的 code 参数：必须是 recon 实测在册的 official-assistant。 */
    if (key === "次要21|OC09") {
      t("配方 OC09 的 code=official-assistant（recon GET /official-accounts 在册行）", /code=official-assistant/.test(q), q);
    }
    /* VB03 的步骤形状：必须覆盖 (a) 首进 (b) 二次进入 (c) 下拉 三段（多步 nav 的判据 (a)(b)(c)）。
       R3-NET-04/R3-08 改判（2026-10-13 工具车道）：旧断言要求「逐段 drainNet 计数」（≥3 次），
       但 record 臂展放在 open 之前会被桥 open 的重编译（重启 AppService）洗掉 ⇒ 那几段计数恒为 0，
       是仪器读数不是「onShow 没重拉」。旧断言钉的是一条**结构上取不到读数**的形状，
       现在改成钉新形状：(a)(b) 两次进页仍在，(c) 段是「臂展后置 → 下拉重触发 → 同段取件」
       （netFaultArmWindow 判 ok），(a)(b) 的计数半边由配方 adjudication 如实记 NOT_SHOOTABLE。 */
    if (key === "次要22|VB03") {
      const blob = JSON.stringify(r.steps || []);
      const w = C.netFaultArmWindow(r.steps || []);
      t("配方 VB03 覆盖 (a)(b)(c) 三段：两次进账单页 + 一次下拉，且臂展窗=「open 后臂展 + 页内重触发 + 同段取件」（R3-NET-04 新判点形状）",
        (blob.match(/subpackages\/vip\/bills/g) || []).length >= 3 && /pullDown/.test(blob) &&
        (blob.match(/drainNet/g) || []).length >= 1 && w.ok === true && w.arms >= 1 && w.droppedArms.length === 0,
        "armWindow=" + w.kind + " arms=" + w.arms + " opens=" + w.opens);
      t("配方 VB03 声明了 showcase 档位（band real@ed1cd82c 由 --project 决定，配方只记 why）", /showcase/.test(r.why || ""), "");
    }
    /* R3-NET-04 的新判点形态对**每一条**带臂展的配方都成立（不只 VB03）：
       臂展不得排在 open 之前，且每一臂都要在同段内重触发 + 取件。 */
    if ((r.steps || []).some((s) => s && s.do === "armNetFault")) {
      const w = C.netFaultArmWindow(r.steps || []);
      t("配方 " + key + " 的网络判点是「open 后臂展 + 页内重触发 + 同段 drainNet」（arm 排在 open 前=臂被重编译洗掉=intercepted 恒 0 的旧形状，这里直接拦死）",
        w.ok === true, w.text.slice(0, 200));
    }
    /* R3-OT-01/R3-02 的两条替代通道必须在配方里点名得出来（旗标默认关，
       但配方不声明 = 这一腿连替代通道存在过都没写 ⇒ 下一轮人只会再看到一句「不在页上」）。 */
    if (["次要20|OT05", "次要20|OT06", "次要20|OT09", "次要21|OC09"].includes(key)) {
      const navto = (r.steps || []).filter((s) => s && s.do === "open" && s.via === "navto").length;
      const handled = (r.steps || []).filter((s) => s && (s.do === "callHandler" || s.handler)).length;
      const prose = String(r.why || "") + String(r.adjudication || "");
      t("配方 " + key + " 声明了新通道（navigateTo 开页 " + navto + " 步 / handler 直调 " + handled + " 步），且正文点名两旗标 --navto-open/--handler-call 默认关",
        navto >= 1 && handled >= 1 && /navto-open/.test(prose) && /handler-call/.test(prose),
        "navto=" + navto + " handler=" + handled);
    }
    /* REAL-OT-06：穿透链段形核对（中间段必须是编译标签名；路径形/把类名当组件段一律拦死）。 */
    (r.steps || []).forEach((s, i) => {
      const list = s && s.do === "probe" ? (s.selectors || []) : (s && s.selector ? [s.selector] : []);
      for (const sel of list) {
        if (String(sel).indexOf(">>>") < 0) continue;
        const dc = C.validateDeepChain(sel);
        t("配方 " + key + " step#" + (i + 1) + " 的穿透链段形合法", dc.ok, dc.reason || dc.note);
      }
    });
    /* 游客轴的诚实划界：OT06/OC09 无 identities 字段 ⇒ 门两轴都要；本通道只判登录轴，
       配方 why 必须点名"游客轴不在本配方（落点裁定非能力问题）"，不许装作两轴都判了。 */
    if (key === "次要20|OT06" || key === "次要21|OC09") {
      t("配方 " + key + " 的 why 显式声明游客轴不在本配方（待落点裁定，不是能力问题）", /游客轴/.test(r.why || ""), "");
      t("判据 " + key + " 确实没标 identities（门两轴都要 ⇒ 残余欠账的口径来源）", !Array.isArray(c.identities) || c.identities.length === 0, "");
    }
  }
  /* 判据台上 10 条欠账里没进配方的（VRN07 待授权、TD03 属 L13/DISPATCHABLE），逐条点名不装看不见。 */
  const notInRecipes = ["次要20|VRN07", "次要18|TD03"].filter((k) => !keys.includes(k));
  t("VRN07/TD03 不在本通道配方（VRN07=待授权 DB 夹具、TD03=L13 的 DENY 收窄+参数化输入，都不归本车道）", notInRecipes.length === 2, notInRecipes.join(","));
  t("hygiene 字段点名了 OT06/OC09 游客轴的归属（落点裁定）", /guest-landing-policy/.test(String(RECIPES.hygiene || "")), "");

  /* ══════════════════════════════════════════════════════════════════════════════
     §7 2026-10-13 工具车道两条新通道 + 臂展集成的**负例**（续作车道补）
     ── 为什么这一节必须存在 ──
     R3-OT-01/R3-02/R3-NET-04 落进来的原语（resolveOpenForm / handlerCall* / mockArmBranch /
     asFunctionDeclaration / 臂展回执 / netFaultArmWindow）此前**一条负例都没有**：
     test-cap-recipes 只顺手用了 netFaultArmWindow 与 validateDeepChain。没有能红的反面，
     「通道已落地」就等于没被验证过（本仓在这上面立过案的假绿形状）。
     ── 语料来源（不是自造夹具）──
       · 正例形状全部从 scripts/qa/case-recipes.json 的真实步序里**取**（open 步、handler 声明、
         穿透链、netFaultMockSource 的真载荷）；
       · 反面形状全部从同一批真实步序**改**出来（把 OC09 那一臂搬回 open 之前 = HEAD 在盘的旧形状、
         把真穿透链的中间段换成路径形 = 台账 R3-OT-01 ① 的那句误诊），改前/改后都是语料里的东西。
     ══════════════════════════════════════════════════════════════════════════════ */
  const allSteps = [];
  const wsSrc = fs.readFileSync(path.join(REPO, "scripts", "qa", "r-exec-ws.mjs"), "utf8");
  for (const [key, r] of Object.entries(RECIPES.recipes || {})) {
    (r.steps || []).forEach((s, i) => allSteps.push({ key, i, s }));
  }
  const openSteps = allSteps.filter((x) => x.s && x.s.do === "open");
  const navtoDecls = openSteps.filter((x) => x.s.via === "navto");
  const handlerDecls = allSteps.filter((x) => x.s && (x.s.handler || x.s.do === "callHandler"));

  /* ── A-1 开页形态：默认必须关，且关了以后与配方逐字同形 ── */
  t("§7 resolveOpenForm 在 navTo=false 下把语料里每一个 open 步都原样交回桥 open（page/query 逐字不动 ⇒ 1107 行的开页方式一字不变）",
    openSteps.length > 0 && openSteps.every((x) => {
      const f = C.resolveOpenForm({ page: x.s.page, query: x.s.query || "" }, { navTo: false });
      return f.via === "bridge" && f.kind === "flag-off" && f.page === x.s.page && f.query === (x.s.query || "") && f.url === "" && f.base === "";
    }), "open 步=" + openSteps.length);
  t("§7 resolveOpenForm 不读 argv（旗标由调用方传 ⇒ 离线能把两种形态都跑出来，同 verbsNamed 体例）",
    !/\bprocess\.argv\b|\bNAVTO_OPEN\b/.test(String(C.resolveOpenForm)));
  t("§7 配方声明的 via=navto 步在带旗标时确实换成「基底页 + /page?query」，且基底页不是目标页、不带 query",
    navtoDecls.length >= 1 && navtoDecls.every((x) => {
      const f = C.resolveOpenForm({ page: x.s.page, query: x.s.query || "" }, { navTo: true });
      return f.via === "navto" && f.kind === "ok" && f.url === "/" + x.s.page + (x.s.query ? "?" + x.s.query : "") &&
        f.base === C.NAVTO_BASE_PAGE && f.base !== f.page;
    }), "via=navto 声明=" + navtoDecls.length + " 条（" + [...new Set(navtoDecls.map((x) => x.key))].join(",") + "）");
  /* 基底页**可以**是 tabBar 页 —— 这是设计而不是漏洞：tabBar 限制打在 navigateTo 那一句上，
     桥 open(page,query) 对 tabBar 页是好的，所以缺省基底取 pages/discover/index（在册可开页）。
     钉这条是因为「基底页不许是 tabBar」这种想当然的判点会把整条通道判成死的。 */
  t("§7 缺省基底页在册且桥开得住（tabBar 限制只作用于 navigateTo 的目标页，不作用于基底页）",
    C.isTabBarPage(C.NAVTO_BASE_PAGE) === true &&
      C.resolveOpenForm({ page: "subpackages/vip/bills", query: "" }, { navTo: true }).base === C.NAVTO_BASE_PAGE);
  /* 反面：语料里 PFI25 的真实页 pages/profile/index 在 pages.json 的 tabBar 里 ⇒ navigateTo 打不开。
     钉这一条是因为「tabBar 页也走 navigateTo」在设备上必然 fail，而行上会读成「页打不开=产品问题」。 */
  const tabbarPageInCorpus = openSteps.map((x) => x.s.page).find((p) => C.isTabBarPage(p));
  t("§7 语料里真有 tabBar 页的 open 步（反面样本非凭空造）：" + tabbarPageInCorpus,
    !!tabbarPageInCorpus, tabbarPageInCorpus);
  t("§7 负例：tabBar 页即使带 --navto-open 也必须退回桥 open（平台限制，不许记成 navigateTo 失败的产品判决）",
    !!tabbarPageInCorpus && (function () {
      const f = C.resolveOpenForm({ page: tabbarPageInCorpus, query: "userId=1" }, { navTo: true });
      return f.via === "bridge" && f.kind === "tabbar";
    })());
  t("§7 负例：目标页==基底页时必须退回桥 open（navigateTo 只会叠一层自己）；空 page / 缺 step 不许发 navigateTo",
    (function () {
      const bills = "subpackages/vip/bills";
      const a = C.resolveOpenForm({ page: bills, query: "" }, { navTo: true, basePage: bills });
      const b = C.resolveOpenForm({ page: "", query: "x=1" }, { navTo: true });
      const c = C.resolveOpenForm(undefined, { navTo: true });
      const d = C.resolveOpenForm({ page: bills, query: "a=1" }, { navTo: true, basePage: C.NAVTO_BASE_PAGE });
      return a.kind === "base-is-target" && a.via === "bridge" && b.kind === "no-page" &&
        c.kind === "no-page" && d.via === "navto" && d.url === "/" + bills + "?a=1";
    })());
  t("§7 旗标没开时的那句宣告必须说「一字未用」，不许留空（照 --native-capture 的先例：空读数读作没用过，不读作试过不管用）",
    /一字未用/.test(C.openFormNote("bridge")) && /webview 代理态/.test(C.openFormNote("bridge")) &&
      /on\(base\+navigateTo/.test(C.openFormNote("navto")));
  t("§7 navigateTo 两条载荷（WS 的 Promise 形 / CLI 的 发起+回读 形）里一个 uni 记号都不许有，且各问各的（ fired 不混成 landed）",
    !/\buni\b/.test(C.navigateToSource("/a?b=1")) && !/\buni\b/.test(C.navigateToSyncSource("/a?b=1")) &&
      !/\buni\b/.test(C.navReadSource()) && /wx\.navigateTo/.test(C.navigateToSource("/a?b=1")) &&
      /getCurrentPages\(\)/.test(C.navReadSource()) && C.navToVerdict("nav-fired") !== "ok" &&
      C.navSyncVerdict("nav-ok") !== "fired");
  t("§7 空读数不许折叠成成功：navToVerdict('')/navSyncVerdict('') 都读作「没落地/没发起」，navLandVerdict 拿到空栈读 not-landed",
    /^unknown\(空读数/.test(C.navToVerdict("")) && /^unknown\(空读数/.test(C.navSyncVerdict("")) &&
      C.navLandVerdict("p/q", { nav: [], top: "" }).ok === false &&
      C.navLandVerdict("p/q", { nav: [], top: "p/q" }).ok === true &&
      C.navLandVerdict("p/q", { nav: ["fail xxx"], top: "other" }).kind === "not-landed" &&
      C.navLandVerdict("p/q", { nav: [], top: "", err: "boom" }).kind === "unreadable");

  /* ── A-2 handler 直调：语料里声明得出来的正例 + 三种打不成的反面 ── */
  const hDecls = handlerDecls.map((x) => (x.s.do === "callHandler" ? x.s.handler : x.s.handler)).filter(Boolean);
  t("§7 语料里每一条 handler 声明都吃得住 parseHandlerCall（配方写了却解析不了 = 上腿才发现在白写）",
    hDecls.length >= 1 && hDecls.every((h) => C.parseHandlerCall(h).ok === true),
    "声明=" + hDecls.length + " 条：" + hDecls.map((h) => h.method).join(","));
  t("§7 负例：method 缺失/非法标识符/没点名 routeIncludes 一律拒（不在上一页身上打 handler 比假绿更糟）",
    C.parseHandlerCall({ method: "", routeIncludes: "p" }).ok === false &&
      C.parseHandlerCall({ method: "like(); evil", routeIncludes: "p" }).ok === false &&
      C.parseHandlerCall({ method: "handleLike", routeIncludes: "" }).ok === false &&
      C.parseHandlerCall(null).ok === false && C.parseHandlerCall("handleLike").ok === false);
  const hSrc = C.handlerCallSource(C.parseHandlerCall(hDecls[0] || { method: "handleLike", routeIncludes: "profile-extra/profile/other" }).spec);
  t("§7 直调载荷点名 method 与路由、且一个 uni 记号都不许有（设备事实：evaluate 上下文里任何 uni 记号都抛 ERR uni is not defined）",
    !/\buni\b/.test(hSrc) && /getCurrentPages\(\)/.test(hSrc) && hSrc.indexOf("handleLike") >= 0 && /wrong-page/.test(hSrc));
  t("§7 五种回执互不折叠（把 no-page/wrong-page/no-method 读成「打成」就是这条通道最坏的假绿）",
    new Set([C.handlerCallVerdict(""), C.handlerCallVerdict("no-page"), C.handlerCallVerdict("wrong-page p/x"),
      C.handlerCallVerdict("no-method p/x"), C.handlerCallVerdict("ERR boom"), C.handlerCallVerdict("handler-ok via=vm")]).size === 6 &&
      C.handlerCallOk(C.handlerCallVerdict("handler-ok via=vm")) === true &&
      ["", "no-page", "wrong-page x", "no-method x", "ERR x"].every((s) => C.handlerCallOk(C.handlerCallVerdict(s)) === false));
  t("§7 替代通道的行上口吻必须明写「这不是判据点名的那个动作」（直调冒充点击与一次 tap 冒充 rapidTap×5 同罪）",
    /替代 DOM tap/.test(C.handlerNote({ method: "handleLike" }, "ok(vm)")) && /不能代替/.test(C.handlerNote({ method: "m" }, "ok")));

  /* ── B-1 functionDeclaration 臂展集成（R3-NET-04 未落地的第三份 Source）── */
  const mockSrc = C.netFaultMockSource();
  t("§7 真载荷源（本仓实际发给 mockWxMethod 的那串）必须落进 functionDeclaration 分岔，且能编成函数对象",
    C.mockArmBranch(mockSrc) === "functionDeclaration" && typeof C.asFunctionDeclaration(mockSrc) === "function" &&
      C.mockArmBranch(C.asFunctionDeclaration(mockSrc)) === "functionDeclaration");
  t("§7 负例：result 分岔（把 mock 当值递 = wx.request 被换成非函数值 ⇒ intercepted 恒 0 的假零本体）必须判 result 且编不出函数",
    C.mockArmBranch(JSON.stringify({ statusCode: 500 })) === "result" &&
      C.asFunctionDeclaration(JSON.stringify({ statusCode: 500 })) === null &&
      C.mockArmBranch("") === "result" && C.mockArmBranch(null) === "result" && C.asFunctionDeclaration("") === null);
  /* REAL-OT-06 那类事故形状：载荷串半路断掉（双引号/截断）。编不成函数就必须报错，
     不许"退回把串当 result 发"（那等于往载具上装一个会让应用侧每次请求都抛的值）。 */
  t("§7 负例：语法坏掉的函数字符串（真源串截一半 = REAL-OT-06 双引号事故的形状）⇒ asFunctionDeclaration 返回 null 而不是抛",
    (function () {
      const broken = mockSrc.slice(0, Math.floor(mockSrc.length / 2));
      let threw = false, got = null;
      try { got = C.asFunctionDeclaration(broken); } catch (e) { threw = true; }
      return !threw && got === null;
    })());
  t("§7 臂展回执载荷问满三件事（spec 袋 / 记账袋 / wx.request 是不是我们的 mock），且无 uni 记号",
    (function () { const s = C.netFaultArmReceiptSource(); return !/\buni\b/.test(s) && /__qaNetSpec/.test(s) && /__qaNetCalls/.test(s) && /wx\.request/.test(s) && /mocked/.test(s); })());
  t("§7 回执裁决四维各自不折叠：mocked=false / 袋不在 / mode 对不上 / 回执报错 四种都 ok=false 且点名差在哪一维；全在才 ok=true",
    (function () {
      const good = { spec: "fail-all", bag: true, requestType: "function", mocked: true, err: "" };
      const bads = [
        Object.assign({}, good, { mocked: false, requestType: "undefined" }),
        Object.assign({}, good, { bag: false }),
        Object.assign({}, good, { spec: "record" }),
        Object.assign({}, good, { err: "boom" }),
      ];
      const vs = bads.map((b) => C.armReceiptVerdict("fail-all", b));
      return C.armReceiptVerdict("fail-all", good).ok === true && vs.every((v) => v.ok === false) &&
        /wx\.request 不是本通道的 mock/.test(vs[0].text) && /__qaNetCalls/.test(vs[1].text) &&
        /spec\.mode/.test(vs[2].text) && /回执本身报错/.test(vs[3].text);
    })());
  t("§7 负例：没取到回执（空串/垃圾串/undefined）一律读作 arm-unverified，不许读作装上了",
    (function () {
      const r1 = C.interpretArmReceipt(""), r2 = C.interpretArmReceipt("no json here"), r3 = C.interpretArmReceipt(undefined);
      return [r1, r2, r3].every((r) => r.mocked === false) &&
        [r1, r2, r3].every((r) => C.armReceiptVerdict("record", r).ok === false);
    })());
  t("§7 臂展没证实时这一腿的口径：机读前缀 NOT_SHOOTABLE(netFault=arm-unverified) + 明写 0 是仪器读数、不许据此记 EXECUTED/FAILED",
    (function () {
      const s = C.armUnshootableText({ mode: "fail-all" }, C.armReceiptVerdict("fail-all", { mocked: false, bag: false, requestType: "function" }));
      return /^NOT_SHOOTABLE\(netFault=arm-unverified\)/.test(s) && /仪器读数/.test(s) && /不许据此记 EXECUTED\/FAILED/.test(s);
    })());

  /* ── B-2 判点形状：arm 后置 + 页内重触发（反面样本 = 同一条真配方搬回旧形状）── */
  const armedRecipes = Object.entries(RECIPES.recipes || {}).filter(([, r]) => (r.steps || []).some((s) => s && s.do === "armNetFault"));
  t("§7 语料里每条带臂展的配方都是「open 后臂展 + 同段重触发 + 同段取件」（" + armedRecipes.map(([k]) => k.split("|")[1]).join(",") + "）",
    armedRecipes.length >= 3 && armedRecipes.every(([k, r]) => {
      const w = C.netFaultArmWindow(r.steps || []);
      return w.ok === true && w.arms >= 1 && w.droppedArms.length === 0 && w.noRetriggerArms.length === 0 && w.noDrainArms.length === 0;
    }), "带臂展配方=" + armedRecipes.length);
  t("§7 反面样本在盘：语料里确实存在「先 open 再臂展」的真实配方（不是为测试造的形状）",
    armedRecipes.every(([, r]) => { const i = (r.steps || []).findIndex((s) => s && s.do === "armNetFault"); const o = (r.steps || []).findIndex((s) => s && s.do === "open"); return i > o; }));
  /* 把 OC09 那一臂搬回 open 之前 —— 这正是 HEAD 在盘的旧形状（实测交出 intercepted=0 的那一版）。
     这条负例是整节的承重墙：它证明 netFaultArmWindow 会真的拦，而不是一路绿灯。 */
  t("§7 负例（真配方搬回旧形状）：把 OC09 的 armNetFault 移回最前 ⇒ 必须判 arm-dropped-by-open（旧行 intercepted=0 的根因被拦死）",
    (function () {
      const r = (RECIPES.recipes || {})["次要21|OC09"];
      if (!r) return false;
      const steps = r.steps.slice();
      const i = steps.findIndex((s) => s && s.do === "armNetFault");
      steps.unshift(steps.splice(i, 1)[0]);
      const w = C.netFaultArmWindow(steps);
      return w.ok === false && w.kind === "arm-dropped-by-open" && w.droppedArms.length >= 1;
    })());
  t("§7 负例：臂展后同段没有任何重触发 ⇒ no-retrigger；有重触发但不同段 drainNet ⇒ no-drain（三种失败互不折叠）",
    (function () {
      const r = (RECIPES.recipes || {})["次要21|OC09"];
      if (!r) return false;
      const noRet = r.steps.filter((s) => s && !C.NET_RETRIGGER_KINDS.includes(s.do));
      const noDr = r.steps.filter((s) => s && s.do !== "drainNet");
      const w1 = C.netFaultArmWindow(noRet);
      const w2 = C.netFaultArmWindow(noDr);
      return w1.ok === false && w1.kind === "no-retrigger" && w2.ok === false && w2.kind === "no-drain";
    })());
  t("§7 反面：配方只声明 netFault 字段却一步都没臂展 ⇒ netFaultArmWindow 回 not-armed 且 ok=null（不许把「没上腿」读成「判过了」）",
    (function () {
      const w = C.netFaultArmWindow([{ do: "open", page: "p" }, { do: "tap", selector: ".x" }]);
      return w.ok === null && w.kind === "not-armed" && C.armWindowNote({ mode: "record" }, w) === "off";
    })());
  t("§7 首屏那一半的诚实边界：firstLoadFaultGap 点名「桥 open 重启 AppService ⇒ 页首请求拦不到」，且明写不许记成产品 FAILED、不许拿重触发冒充首屏",
    (function () {
      const s = C.firstLoadFaultGap("OC09 判据原文「开页即失败」");
      return /^NOT_SHOOTABLE\(netFault=first-load\)/.test(s) && /重启 AppService/.test(s) &&
        /不许记成产品 FAILED/.test(s) && /冒充/.test(s) && /OC09/.test(s);
    })());

  /* ── 穿透链：正例取自语料，反面就是把同一条真链改成台账点名的两种错法 ── */
  const realChain = ((RECIPES.recipes || {})["次要20|OT05"] || { steps: [] }).steps
    .map((s) => (s.selectors || [s.selector].filter(Boolean))).flat().find((x) => String(x).indexOf(">>>") >= 0);
  t("§7 语料里的真穿透链段形合法（" + String(realChain).slice(0, 60) + "…）",
    !!realChain && C.validateDeepChain(realChain).ok === true, realChain);
  t("§7 负例：中间段写成路径形（台账 R3-OT-01 ①「编译标签是 components/…/RelationshipCTA」那句被产物证伪的错法）⇒ 必拦",
    (function () {
      if (!realChain) return false;
      const segs = C.deepChainSegments(realChain);
      const bad = ["components/profile/public/RelationshipCTA"].concat(segs.slice(2)).join(" >>> ");
      const dc = C.validateDeepChain(bad);
      return dc.ok === false && /路径形/.test(dc.reason) && /不是「组件不存在」/.test(dc.reason);
    })());
  t("§7 负例：把类名当组件段穿（.relationship-cta >>> .relationship-cta__btn--like）必拦；只剩一段的链也拦",
    C.validateDeepChain(".relationship-cta >>> .relationship-cta__btn--like").ok === false &&
      C.validateDeepChain(" >>> .x").ok === false &&
      C.validateDeepChain(".plain-page-selector").ok === true);
  /* 分段符两侧写空 = 静默丢掉那一段。这不是漏洞，是**解释器与校验器共用同一枚分段函数**的结果：
     r-exec-ws.mjs 的 deepSegs 与 validateDeepChain 都走 deepChainSegments（filter(Boolean)）。
     钉这一条钉的是「两处不许各自漂移」—— 哪天有人只改一边，校验放行而解释器另解，
     设备上就又是「不在页上」被误读成组件不存在（R3-02 ① 的原病）。 */
  t("§7 空段的一致处理：校验器与解释器必须同解（" + "a >>>  >>> b" + " 两边都读成两段，不许一处当三段）",
    (function () {
      const s = "profile-shell >>>  >>> .x";
      const segs = C.deepChainSegments(s);
      return segs.length === 2 && C.validateDeepChain(s).ok === true &&
        /String\(selector\)\.split\(DEEP_CHAIN_SEP\)\.map\(\(s\) => s\.trim\(\)\)\.filter\(Boolean\)/.test(wsSrc);
    })(), "deepChainSegments(" + "profile-shell >>>  >>> .x" + ")=" + C.deepChainSegments("profile-shell >>>  >>> .x").length + " 段");

  /* ── 载具接线（两条腿的上腿前形状闸 + 默认关的拒发分支）：文本判点 ──
     这些分支只有设备能真跑到，离线能证的只有「拒发在旗标判断之内、缺省路径逐字同形」。 */
  t("§7 WS 腿：handlerFallback 的第一步是「这一步没声明 handler 就返回 null」⇒ 既有配方的行一字不变（替代通道只接管声明过的步）",
    /if \(!step \|\| !step\.handler\) return null;/.test(wsSrc));
  t("§7 WS 腿：声明了 handler 但没带 --handler-call ⇒ 当场拒发并点名「替代通道未使用」，不退化成页级一次 tap（callHandler 步同一条）",
    (function () {
      const i = wsSrc.indexOf("async function handlerFallback");
      const j = wsSrc.indexOf("case \"callHandler\"");
      return i > 0 && j > 0 && /if \(!HANDLER_CALL\) return \{ fatal:/.test(wsSrc.slice(i, i + 1400)) &&
        /NOT_SHOOTABLE\(handlerCall\): 本腿没带 --handler-call/.test(wsSrc.slice(j, j + 900));
    })());
  t("§7 WS 腿：带 --navto-open 但这一步没声明 via=navto 时仍走桥 open，且行上点名是哪条通道没装（旗标默认关 = 缺省形态不变）",
    /step\.via === "navto" && !NAVTO_OPEN/.test(wsSrc) && /新开页通道未使用，仍走桥 open/.test(wsSrc));
  t("§7 WS 腿：臂展集成把 asFunctionDeclaration 的**返回值真用上**（只判不成函数却没换成函数对象 = 仍靠 SDK 嗅探分岔，那正是 R3-NET-04 的原病）",
    (function () {
      const i = wsSrc.indexOf("case \"armNetFault\"");
      const seg = wsSrc.slice(i, i + 2600);
      return /const mockFn = asFunctionDeclaration\(mockSrc\)/.test(seg) && /mini\.mockWxMethod\("request", mockFn\)/.test(seg) &&
        /NOT_SHOOTABLE\(netFault=arm-parse\)/.test(seg);
    })());
  t("§7 WS 腿：臂展装完必须回读回执，读不到就 restore + 拒发（「调用没抛」不等于「臂展在位」）",
    /interpretArmReceipt\(await capEval\(netFaultArmReceiptSource\(\)\)\)/.test(wsSrc) &&
      /if \(!rv\.ok\) return \{ fatal: armUnshootableText/.test(wsSrc) && /已 restore 以免臂展残留/.test(wsSrc));
  t("§7 WS 腿：上设备前的两道形状闸（穿透链段形 / 臂展窗）不合法就不上腿，行前缀 NOT_SHOOTABLE(recipe-chain|recipe-netShape)",
    /NOT_SHOOTABLE\(recipe-chain\)/.test(wsSrc) && /NOT_SHOOTABLE\(recipe-netShape\//.test(wsSrc) &&
      /if \(chainBad\.length\)/.test(wsSrc) && /w\.ok === false/.test(wsSrc));
  t("§7 WS 腿：旗标没开也要把「没用过」喊出来（WSX_OPEN_FORM / WSX_HANDLER_CALL 两条 banner + 行上 openForm[bridge…] 默认口）",
    /WSX_OPEN_FORM=/.test(wsSrc) && /WSX_HANDLER_CALL=/.test(wsSrc) && /一字未用/.test(wsSrc) &&
      /openForm\[bridge（本腿没用 navigateTo 开页形态）\]/.test(wsSrc));
  t("§7 两条腿的新通道旗标全部 argv 派生且默认关（没有任何一处把 NAVTO_OPEN/HANDLER_CALL 硬编码成 true）",
    (function () {
      const cliSrc = fs.readFileSync(path.join(REPO, "scripts", "qa", "r-exec-cli.mjs"), "utf8");
      const pats = [cliSrc, wsSrc].map((s) => /const (NAVTO_OPEN|HANDLER_CALL) = (?:flag\(|process\.argv\.includes\()/.test(s) &&
        !/const (NAVTO_OPEN|HANDLER_CALL) = true/.test(s));
      return pats.every(Boolean);
    })());
  t("§7 新载荷源全部过 uni 关（本仓两条在册设备事实：evaluate 上下文里任何 uni 记号都抛 ERR uni is not defined）",
    [C.navigateToSource("/a"), C.navigateToSyncSource("/a"), C.navReadSource(), hSrc, C.handlerDrainSource(), C.netFaultArmReceiptSource()]
      .every((s) => !/\buni\b/.test(s)));

  /* ── §8 产物命中数：判点自身先自证，再上活语料，最后拿真配方搬回旧形状 ── */
  t("§8 编译产物在盘可数（" + path.relative(REPO, BAND) + "；只读，本车道不重编译）", fs.existsSync(path.join(BAND, "pages", "profile", "index.wxml")), "");
  const c2 = countSelector("pages/profile/index", ".voice-preview__delete");
  const c1 = countSelector("pages/profile/index", ".voice-preview__delete:last-child");
  const c0 = countSelector("pages/profile/index", ".voice-preview__no-such-class-xyz");
  const cCard = countSelector("pages/profile/index", ".voice-preview__card > .voice-preview__delete");
  const cChain = countSelector("subpackages/profile-extra/profile/other", "profile-shell >>> public-profile >>> relationship-c-t-a >>> .relationship-cta__btn--like");
  /* 计数器的自证：三档不同的数（2 / 1 / 0）+ 子代组合符 + 穿透链下钻到组件文件。
     钉住 2 不是随手写的期望值：exec-v37-pfi25 的 step#6 在同一份产物上设备读数就是 present(2)，
     离线数与设备数同向 ⇒ 这条判点数的东西就是设备上那几枚节点。 */
  t("§8 计数器不是恒真：同页三类选择器数出 2/1/0（.voice-preview__delete=" + c2.count + "（设备 step#6 实测 present(2) 同数）, :last-child=" + c1.count + ", 编造类名=" + c0.count + "）",
    c2.count === 2 && c1.count === 1 && c0.count === 0, "files=" + c2.file + "/" + c1.file);
  t("§8 计数器认得子代组合符（.voice-preview__card > .voice-preview__delete=" + cCard.count + " 枚，仍两枚 ⇒ 单靠父级收窄不解决 PFI25）",
    cCard.count === 2, cCard.file);
  t("§8 计数器能沿 usingComponents 下钻到组件文件（OT05 的穿透链末段在 " + cChain.file + " 命中 " + cChain.count + " 枚）",
    cChain.count === 1 && /RelationshipCTA\.wxml$/.test(String(cChain.file)), cChain.error ? "error=" + cChain.error : cChain.file);
  t("§8 活配方全体动作步在产物里唯一致命中，且 expectMatches 与产物实测一致（" + (RECIPES_FILE ? path.relative(REPO, RECIPES_FILE) : "") + "）",
    liveProblems.length === 0, liveProblems.join(" ｜ ").slice(0, 280));
  /* 负例 A（真配方搬回旧形状）：把 PFI25 的 tap 选择器脱掉 :last-child —— 这正是 v37 在盘的那一版。
     这条是 §8 的承重墙：它证明唯一性判点会真红，而红只来自这一刀。 */
  t("§8 负例（活配方搬回 v37 旧形状）：把 PFI25 的 tap .voice-preview__delete:last-child 脱掉伪类 ⇒ 必须判「命中 2 枚」，且只多出这一条",
    (function () {
      const mut = deepClone(RECIPES);
      const st = mut.recipes["PAGES-PROFILE-INDEX|PFI25"].steps;
      const tap = st.find((s) => s && s.do === "tap" && /:last-child/.test(String(s.selector || "")));
      if (!tap) return false;
      tap.selector = ".voice-preview__delete";
      delete tap.expectMatches;
      const before = matchCountProblems(RECIPES).length;
      const after = matchCountProblems(mut);
      return after.length === before + 1 && /PFI25/.test(after.join("")) && /命中 2 枚/.test(after.join(""));
    })());
  /* 负例 B：把对照 probe 里的伪类形摘掉（裸形读数还在，但「引擎认没认伪类」就没证据了）⇒ 必须红。 */
  t("§8 负例：把 PFI25 各 probe 里的 .voice-preview__delete:last-child 摘掉 ⇒ 「用位置伪类收窄却没有裸形+伪类并列的对照读数」必须判红",
    (function () {
      const mut = deepClone(RECIPES);
      mut.recipes["PAGES-PROFILE-INDEX|PFI25"].steps.forEach((p) => {
        if (p && p.do === "probe") {
          p.selectors = (p.selectors || []).filter((x) => x !== ".voice-preview__delete:last-child");
          if (p.expectMatches && typeof p.expectMatches === "object") delete p.expectMatches[".voice-preview__delete:last-child"];
        }
      });
      const after = matchCountProblems(mut);
      return after.length === liveProblems.length + 1 && /位置伪类/.test(after.join(""));
    })());
  /* 负例 C：expectMatches 半填（本仓立过案的两条原病：没测的值写进判决字段、expected=undefined 上行）。 */
  t("§8 负例：expectMatches 写成字符串 / 写成 undefined / 点名了没 probe 的选择器 ⇒ 三种都判红，不许读成通过（expected=undefined 那一类形状）",
    (function () {
      const m1 = deepClone(RECIPES);
      m1.recipes["PAGES-PROFILE-INDEX|PFI25"].steps.find((s) => s.do === "probe" && s.expectMatches).expectMatches[".voice-preview__delete"] = "2";
      const m2 = deepClone(RECIPES);
      m2.recipes["PAGES-PROFILE-INDEX|PFI25"].steps.find((s) => s.do === "probe" && s.expectMatches).expectMatches[".voice-preview__delete"] = undefined;
      const m3 = deepClone(RECIPES);
      m3.recipes["PAGES-PROFILE-INDEX|PFI25"].steps.find((s) => s.do === "probe" && s.expectMatches).expectMatches[".ghost-class"] = 1;
      const a = matchCountProblems(m1).join(""), b = matchCountProblems(m2).join(""), c = matchCountProblems(m3).join("");
      return /不是非负整数/.test(a) && /不是非负整数/.test(b) && /没被 probe 的选择器/.test(c);
    })());
  /* 正例反面都要有牙：给一条本来没动作步的配方塞一个产物上不存在的选择器当 tap ⇒ 死选择器也要判红。 */
  t("§8 负例：往 VI25 里插一步产物中命中 0 枚的 tap（死选择器）⇒ 与歧义同类拦下，不许「不在页上」到设备上才发现",
    (function () {
      const mut = deepClone(RECIPES);
      mut.recipes["SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI25"].steps.unshift({ do: "tap", selector: ".no-such-btn-xyz" });
      const after = matchCountProblems(mut);
      return after.length === liveProblems.length + 1 && /命中 0 枚/.test(after.join(""));
    })());

  console.log("SUMMARY: assertion failures = " + fails);
  console.log("CAPRECIPES_TEST=" + (fails === 0 ? "PASS" : "FAIL") + "（checks=" + checks + "）");
  process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => { console.log("CAPRECIPES_TEST=FAIL stage=uncaught " + String((e && e.stack) || e).split("\n")[0]); console.log("SUMMARY: assertion failures = " + (fails + 1)); process.exit(1); });
