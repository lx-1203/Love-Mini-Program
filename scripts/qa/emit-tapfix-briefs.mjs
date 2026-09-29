#!/usr/bin/env node
/* 把「交互判据没点名可点物件」的 281 条摊成 lane 简报，交给分批的复核员。
   为什么要有这一步：不摊的话我只能一次改几十条判据，改完既没人复核也没守恒；
   摊成简报后，每条的应补数、承载文件、该页产物路径都是数据，
   执行器与合并器（merge-tapfix-lanes.mjs）拿同一份普查对账，谁自述都不算。
   用法：node scripts/qa/emit-tapfix-briefs.mjs [--maxPerBatch 26] [--out reports/audit/round-7/tapfix-briefs] */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const MAX = Number(arg("maxPerBatch", "26"));
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/tapfix-briefs"));
const CENSUS = resolve(REPO, arg("census", "reports/audit/round-7/tap-target-census.json"));
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));

/* CLI 通道只会 tap 和 input（见 r-exec-cli 的 element 调用），
   这些动词要的是一次连续手势，桥里表达不了 ⇒ 只能标 unverifiable 并写明欠哪条载具，
   不许为了凑数把「向右拖动」改写成「点击卡片」。 */
const GESTURE = /拖动|滑动|长按|双击|滚动|下拉|向左|向右|向上|向下|松手|甩|滑|swipe|drag|scroll/i;

if (!existsSync(CENSUS)) { console.log("BRIEF_RESULT=FAIL reason=普查不存在 " + CENSUS); process.exit(2); }
const census = JSON.parse(readFileSync(CENSUS, "utf8"));
const opsCache = new Map();
const caseOf = (manifest, id) => {
  if (!opsCache.has(manifest)) {
    const f = join(OPS, manifest + ".json");
    opsCache.set(manifest, existsSync(f) ? new Map((JSON.parse(readFileSync(f, "utf8")).cases || []).map((c) => [c.id, c])) : new Map());
  }
  return opsCache.get(manifest).get(id) || null;
};

const pages = (census.pages || []).filter((p) => (p.missing || []).length).sort((a, b) => b.missing.length - a.missing.length);
let total = 0;
for (const p of pages) total += p.missing.length;
if (total !== census.totals.actionMissingSelector) {
  console.log("BRIEF_RESULT=FAIL reason=摊出去的 " + total + " 条与普查缺口 " + census.totals.actionMissingSelector + " 不守恒");
  process.exit(2);
}

/* 每页一个简报；批内按条数装箱（大页优先），保证一个批次的活儿能在一次上下文里做完。 */
const batches = [];
let cur = [], curN = 0;
for (const p of pages) {
  if (curN + p.missing.length > MAX && cur.length) { batches.push({ pages: cur, n: curN }); cur = []; curN = 0; }
  cur.push(p); curN += p.missing.length;
}
if (cur.length) batches.push({ pages: cur, n: curN });

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const owned = [];
for (const [i, b] of batches.entries()) {
  const tag = String(i + 1).padStart(2, "0");
  mkdirSync(join(OUT, tag), { recursive: true });
  const specs = [];
  for (const p of b.pages) {
    /* outFile 必须一页一个名字：旧写法按 manifest 命名，而一个批次里同一 manifest 会有多条 lane
       （次要18→3 页、次要20→2 页），于是两条 lane 拿到同一个 outFile —— lane 只能自己改写到兄弟文件，
       谁没注意到就会把前一条的成果覆盖掉。下面还加了硬闸：真撞了就红，不再靠读者细心。 */
    const slug = String(p.page || "no-page").replace(/[^0-9A-Za-z_-]+/g, "-").replace(/^-+|-+$/g, "");
    /* 尾巴必须先剥：普查给的 p.manifest 本身就带 .json（本轮 54 页全是），
       这里再拼一次就生成出 tapfix-lane-PAGES-HOME-INDEX.json.json 的双后缀名 ——
       产物名与 ops/*.json 的账对不上，人也读不出哪个才是扩展名。
       注意：**已入库的 .json.json 产物不改名**（accepted[].lane 与各清单都按那个名字记着，
       改名等于把历史引用打断），这里只让新生成的简报交出干净名字。 */
    const manifestBase = String(p.manifest || "").replace(/\.json$/i, "");
    const file = "tapfix-lane-" + manifestBase + "--" + slug + ".json";
    if (owned.includes(file)) { console.log("BRIEF_RESULT=FAIL reason=outFile 撞了：" + tag + "/" + file + "（一页一名规则被破坏，摊出去的简报会互相覆盖）"); process.exit(2); }
    owned.push(file);
    const items = p.missing.map((m) => {
      const full = caseOf(m.manifest, m.id) || {};
      const oldAction = String(m.action || full.action || "");
      return {
        id: m.id, manifest: m.manifest, page: p.page, title: m.title || full.title || "",
        oldAction, expected: String(full.expected || ""), evidence: String(full.evidence || ""),
        requiresReal: !!m.requiresReal, gestureOnly: GESTURE.test(oldAction),
        tapChannel: /输入|填写|勾选|聚焦/.test(oldAction) ? "input" : "tap",
      };
    });
    specs.push({
      lane: p.page, manifest: p.manifest, sourceFile: p.sourceFile || null, sourceFound: !!p.sourceFound,
      planned: items.length, outFile: "reports/audit/round-7/tapfix-briefs/" + tag + "/" + file,
      cases: items,
    });
    writeFileSync(join(OUT, tag + ".json"), JSON.stringify({
      batch: tag, laneCount: specs.length, caseCount: specs.reduce((s, x) => s + x.planned, 0),
      lanes: specs,
      schema: {
        lane: "本页 page 路径（逐字照抄，普查靠它对账）",
        counts: { planned: "必须等于本 lane 的 cases.length", ok: "写进 cases 的条数", unverifiable: "写进 unverifiable 的条数" },
        cases: [{
          id: "", manifest: "", page: "", selector: ".kebab-case，必须逐字出现在 file:line 那一行",
          file: "仓库相对路径，如 apps/client/src/pages/discover/index.vue（组件里的类名写组件自己的路径）",
          line: "该行号那一行必须含该类名片段（合并器会重读文件核对，不接受自述）",
          oldAction: "逐字抄简报里的 oldAction，一个字都别改",
          newAction: "保留全部交互动词，把 selector 逐字写进去；动词丢了或多出来都会被整条拒绝",
          needsIdentity: "该目标只在某身份下存在时写 guest/A/B，否则留空",
          why: "为什么是它（一句话，指向源码里那条 bindtap）",
        }],
        unverifiable: [{
          id: "", manifest: "", page: "", reason: "", needsCarrier: "欠哪条载具才能点名（如 WS automator 的 touch/swipe、需要特定夹具、纯文案断言）",
        }],
      },
      hardRules: [
        "cases + unverifiable 必须恰好等于 planned，多一条少一条整份不采信。",
        "selector 必须在 file 的 line 那一行逐字存在；不许把类名改成「更好看」的写法，也不许引用一个只有样式没有事件的类——目标是能被自动化点到的东西，优先带 @tap/@click/bindtap/@input/@confirm 的那层。",
        "gestureOnly=true 的条：CLI 桥没有连续手势，要么它其实有个可点的等价物件（如三键按钮本身）并保留原动词，要么进 unverifiable 并在 needsCarrier 写明欠 WS 手势通道。不许把「向右拖动」悄悄改成「点击」。",
        "expected 里出现的具体文案/数字不能当点击目标；这类条进 unverifiable 并说明它断言的是文本不是物件。",
        "只写自己这一份 outFile，不改 ops/*.json，不改别的 lane，不改台账，不跑模拟器。",
      ],
    }, null, 1) + "\n");
  }
  console.log("BRIEF_BATCH " + tag + " lanes=" + specs.length + " 条=" + b.n + " 手势类=" +
    specs.reduce((s, x) => s + x.cases.filter((c) => c.gestureOnly).length, 0));
}
for (const f of readdirSync(OUT)) if (/^tapfix-lane-.*\.json$/.test(f)) rmSync(join(OUT, f), { force: true });
console.log("BRIEF_TOTAL 页=" + pages.length + " 条=" + total + " 批次=" + batches.length + " 守恒=" + (total === census.totals.actionMissingSelector ? "yes" : "no"));
console.log("BRIEF_RESULT=OK out=" + OUT.replace(REPO + "\\", "").replace(/\\/g, "/"));
