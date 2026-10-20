#!/usr/bin/env node
/** 修车道派单件生成器（R8 收口波里由 tmp/ 临时脚本补齐的正经一环）。
 *
 * 为什么需要它：找茬泳道早就有 emit-fidelity-lanes.mjs 从取景清单机械切分，
 * 而**修车道**一直是主代理手写任务书——R7/R8 两轮都是临时脚本、没入库，
 * 下一程既复现不出分派、也审计不了"这条缺陷归谁修"。R8 实测：
 * 手写派发漏掉了两条车道的接口约定（SafeImage 的 data-v 结论、对比度复算口径），
 * 靠车道自己回读才没走偏；那两件事应当由工具带进任务书，而不是靠人记。
 *
 * 用法：node scripts/qa/emit-fix-lanes.mjs --fixlist <fixlist-Rn.json> --rows <逐行卡件>
 *          --round R8 --out tmp/qa/lanes/R8fix [--severity P1] [--max-batches 5] [--max-rows 32]
 *          [--shared-re <正则>] [--notes <文件>] [--self-test]
 *   · --severity P1 只把含该级的批次纳入（根因/共享批次无条件纳入），其余批次登记为"本轮不派"；
 *   · --rows 是"逐行缺陷字段"的件（defect_id/sev/axis/page/frame/cite/symptom/fix），
 *     收录判据一律取 --fixlist 的 batches[].defects，不由行件说了算。
 * 机器行：EMITFIXLANES_RESULT=PASS|FAIL|NOT-EVIDENCED（互斥不成立 / 批次对不上 ⇒ FAIL，退 1）
 *
 * 命名说明：本文件不是 verify-* 门，不参与 verify-gate-list-sync 的孤儿计数
 * （那条判点只扫 /^verify-.+\.(mjs|cjs)$/，见其 :205），与 emit-fidelity-lanes.mjs 同理。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SELF = fileURLToPath(import.meta.url);
const RK = "EMITFIXLANES_RESULT";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const rel = (p) => String(p).split("\\").join("/").replace(REPO.split("\\").join("/") + "/", "");

if (flag("self-test")) selfTest();

const fixlistP = resolve(arg("fixlist", ""));
const rowsP = resolve(arg("rows", ""));
const ROUND = arg("round", "");
const OUT = resolve(arg("out", ""));
const SEV = arg("severity", "P1");
const MAXB = Math.max(1, Number(arg("max-batches", "5")));
const MAXR = Math.max(1, Number(arg("max-rows", "32")));
const SHARED_RE = new RegExp(arg("shared-re", "components/common/|theme/|utils/image-local\\.ts|config/images\\.ts|utils/media\\.ts$"));
const NOTES = arg("notes", "");

for (const [k, v] of [["fixlist", fixlistP], ["rows", rowsP], ["out", OUT]]) {
  if (!v || !existsSync(k === "out" ? dirname(v) : v)) {
    console.log(`${RK}=NOT-EVIDENCED reason=参数缺失/路径不存在 ${k}=${arg(k, "(没传)")}`);
    process.exit(2);
  }
}
if (!ROUND) { console.log(`${RK}=NOT-EVIDENCED reason=--round 没传`); process.exit(2); }

let fl;
try { fl = JSON.parse(readFileSync(fixlistP, "utf8")); } catch (e) { console.log(`${RK}=NOT-EVIDENCED reason=fixlist 读不成 ${e.message}`); process.exit(2); }
let rowArr;
try {
  const j = JSON.parse(readFileSync(rowsP, "utf8"));
  rowArr = Array.isArray(j) ? j : (j.accepted || j.rows || []);
} catch (e) { console.log(`${RK}=NOT-EVIDENCED reason=行件读不成 ${e.message}`); process.exit(2); }
const byId = new Map(rowArr.map((r) => [r.id || r.defect_id, r]));
const sevOf = (r) => r.sev || r.severity || "";
const citeOf = (r) => r.cite || r.source_citation || "";
const fixOf = (r) => r.fix || r["建议改法"] || "";
const symOf = (r) => r.symptom || r["现象"] || "";

const batches = (fl.batches || []).map((b) => {
  const rows = (b.defects || []).map((id) => byId.get(id)).filter(Boolean);
  const unaccounted = (b.defects || []).filter((id) => !byId.has(id));
  const sev = {};
  for (const r of rows) sev[sevOf(r) || "(空)"] = (sev[sevOf(r) || "(空)"] || 0) + 1;
  const blocking = (sev.P0 || 0) + (sev[SEV] || 0);
  return { id: b.batch_id, files: b.files || [], shared: !!b.shared, rows, unaccounted, sev, blocking, root: (b.files || []).some((f) => SHARED_RE.test(f)) };
});

const unaccountedTotal = batches.reduce((a, b) => a + b.unaccounted.length, 0);
if (unaccountedTotal) console.log(`${RK}_ROWGAP fixlist 收录但行件里没有的 defect_id=${unaccountedTotal}（这些条不会进任务书，别当成已派）`);

const chosen = batches.filter((b) => b.blocking > 0 || b.shared || b.root);
const notChosen = batches.filter((b) => !(b.blocking > 0 || b.shared || b.root));
console.log(`${RK}_SCOPE 批次选中=${chosen.length}/总=${batches.length} 其中含${SEV}的批次=${batches.filter((b) => b.blocking > 0).length} 缺陷行选中=${chosen.reduce((a, b) => a + b.rows.length, 0)}/总=${rowArr.length}`);
if (!chosen.length) { console.log(`${RK}=NOT-EVIDENCED reason=没有含 ${SEV} 或共享/根因的批次 ⇒ 空派单，不许出一份"零缺陷"任务书`); process.exit(2); }

const rootB = chosen.filter((b) => b.shared || b.root);
const pageB = chosen.filter((b) => !(b.shared || b.root));
/* 车道名一律取全局序号：早先用"每区一个字母 + 区内序号"，同一区被切块时两块都叫 FXB，
   后写的任务书把先写的**静默覆掉**——互斥自检照样通过（两块文件本就不重叠），
   但被覆掉那块的缺陷一条都没派出去（R8 实测 10 车道只落 7 份任务书）。 */
const nextName = () => "FX" + String.fromCharCode(65 + lanes.length);
const lanes = [];
if (rootB.length) lanes.push({ name: nextName(), label: "根因与共享件（必须最先单独跑）", bins: rootB, first: true });
/* 页车道按目录就近分箱，再按上限切块：一条车道扛 18 个文件会在预算内写不完，
   交回来的就是半成品卡（R7-L04 实测：7 行、正文停在"逐帧缺陷条目补全中"）。 */
const areaOf = (f) => (/src\/pages\//.test(f) ? "主包页" : /subpackages\/(circles|campus)/.test(f) ? "圈子与校园" : /subpackages\/(village|discover)/.test(f) ? "村子与发现" : /subpackages\/(profile-extra|setup)/.test(f) ? "个人页与资料" : /subpackages\/tools/.test(f) ? "工具页" : "其余");
const bins = new Map();
for (const b of pageB) { const a = areaOf(b.files[0] || ""); (bins.get(a) || bins.set(a, []).get(a)).push(b); }
let ci = 1;
for (const [area, bs] of bins) {
  let chunk = [], n = 0;
  const flush = () => { if (!chunk.length) return; lanes.push({ name: nextName(), label: area, bins: chunk }); chunk = []; n = 0; };
  for (const b of bs) { if (chunk.length && (chunk.length >= MAXB || n + b.rows.length > MAXR)) flush(); chunk.push(b); n += b.rows.length; }
  flush(); ci++;
}
const names = lanes.map((l) => l.name);
if (new Set(names).size !== names.length) { console.log(`${RK}=FAIL reason=车道名重复 ⇒ 任务书会互相覆写 ${names.join(",")}`); process.exit(1); }

/* 互斥硬判：同一文件进两条车道 ⇒ 覆写事故，直接 FAIL，不出任务书。 */
const owner = new Map();
for (const l of lanes) for (const b of l.bins) for (const f of b.files) {
  if (owner.has(f)) { console.log(`${RK}=FAIL reason=文件被两条车道领走 ${f} ∈ ${owner.get(f)} 与 ${l.name}`); process.exit(1); }
  owner.set(f, l.name);
}

mkdirSync(OUT, { recursive: true });
const notesTxt = NOTES && existsSync(resolve(NOTES)) ? readFileSync(resolve(NOTES), "utf8").trim() : "";
let dispatched = 0;
const summary = [];
for (const l of lanes) {
  const files = [], rows = [];
  for (const b of l.bins) { for (const f of b.files) files.push(f); for (const r of b.rows) rows.push({ ...r, batch: b.id }); }
  const sev = {};
  for (const r of rows) sev[sevOf(r) || "(空)"] = (sev[sevOf(r) || "(空)"] || 0) + 1;
  const L = [];
  L.push(`# 修车道任务书 ${l.name}（${ROUND} 缺陷修复 · ${l.label}）`);
  L.push(``);
  if (l.first) L.push(`**你是根因车道：必须最先、单独跑。**你改的是全局令牌与公共原语，别的车道建立在它们之上。`);
  L.push(`## 本车道读数（来自 ${rel(fixlistP)}，不是车道自报）`);
  L.push(`- 批次=${l.bins.length}（${l.bins.map((b) => b.id).join(", ")}）　缺陷行=${rows.length}　严重度=${JSON.stringify(sev)}　可改文件=${files.length}`);
  L.push(``);
  L.push(`## 你能改的文件（互斥，只有这些）`);
  for (const f of files) L.push(`- ${f}`);
  L.push(``);
  L.push(`## 硬规矩`);
  L.push(`1. 只改上面列出的文件；其余文件属于并行车道，碰了就是互相覆写。`);
  L.push(`2. 不许新增 verify-*/门脚本（verify-gate-list-sync 的孤儿基线=3，多一把没接线的尺直接判红）。`);
  L.push(`3. 不许跑构建/取景/发布链/设备（单例资源，主代理串行调度）；不许 git add/commit/checkout/restore/stash。`);
  L.push(`4. 每条修复必须在屏幕上可见：复拍门按"页 + 状态"逐帧比内容区像素（裁顶 40px），画面没动 ⇒ FIXNOTVISIBLE。`);
  L.push(`5. 素材只许用仓内既有的（apps/client/src/static 全量在盘）。不许下载、不许生成、不许用带水印图；造不出来就登记 未修。`);
  L.push(`6. 后端没有的字段不许在前端编造 ⇒ 登记 未修 并写清缺哪列。`);
  L.push(`7. 改资产或全站令牌时同步三棵树：apps/client/src/static/、apps/client/static-local-backup/full-static/、apps/api/uploads/app-assets/。`);
  L.push(``);
  if (notesTxt) { L.push(`## 已知机制与接口约定（前序车道实测，不要重复发明）`); L.push(notesTxt); L.push(``); }
  L.push(`## 允许并鼓励判"这条不成立"`);
  L.push(`逐条核对后若误报，按 \`证伪=<id> — <为什么>（出处 <文件:行号>）\` 列出并给证据，不要硬改。`);
  L.push(``);
  L.push(`## 预算`);
  L.push(`调用 ≤${l.bins.length * 8 + 60} 次，读文件 ≤${l.bins.length * 4 + 20} 次；Grep 定位后定点读，超大文件禁止通读。`);
  L.push(``);
  L.push(`## 缺陷逐条`);
  for (const r of rows) {
    L.push(``);
    L.push(`### ${r.id}　${sevOf(r)} / ${r.axis}　批次 ${r.batch}`);
    L.push(`- page: ${r.page}`);
    L.push(`- 帧: ${r.frame || ""}`);
    if (citeOf(r)) L.push(`- 源码证据: ${citeOf(r)}`);
    if (symOf(r)) L.push(`- 现象: ${symOf(r)}`);
    if (fixOf(r)) L.push(`- 建议改法: ${fixOf(r)}`);
  }
  L.push(``);
  writeFileSync(join(OUT, `${l.name}.brief.md`), L.join("\n") + "\n", "utf8");
  dispatched += rows.length;
  summary.push({ name: l.name, line: `批次=${l.bins.length} 行=${rows.length} sev=${JSON.stringify(sev)} 文件=${files.length}${l.first ? " [串行]" : ""}`, brief: `${l.name}.brief.md` });
}

console.log(`${RK}_UNASSIGNED 本轮不派批次=${notChosen.length} 行=${notChosen.reduce((a, b) => a + b.rows.length, 0)}（都不含 ${SEV}，且非共享/根因）`);
for (const s of summary) console.log(`  LANE ${s.name}: ${s.line} brief=${rel(join(OUT, s.brief))}`);
console.log(`${RK}=PASS 车道=${lanes.length} 缺陷行=${dispatched} 可改文件=${owner.size} 互斥=成立 out=${rel(OUT)}`);

/* ── 自测：合成 fixlist + 行件，证明三条判点都活着 ──
   ①互斥不成立 ⇒ FAIL 退 1（把同一文件塞进两个批次）；
   ②含 P1 的批次才派，纯 P2/P3 非共享批次进"本轮不派"；
   ③空选 ⇒ NOT-EVIDENCED 退 2，不许出一份零缺陷任务书。 */
function selfTest() {
  const root = join(REPO, "tmp", "qa", `selftest-emit-fix-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  const mk = (name, fixlist, rows) => {
    writeFileSync(join(root, name + ".fixlist.json"), JSON.stringify(fixlist), "utf8");
    writeFileSync(join(root, name + ".rows.json"), JSON.stringify(rows), "utf8");
    return ["--fixlist", join(root, name + ".fixlist.json"), "--rows", join(root, name + ".rows.json"), "--round", "T", "--out", join(root, name + ".lanes")];
  };
  const good = mk("good", { batches: [
    { batch_id: "T-B01", files: ["apps/client/src/theme/global.scss"], shared: false, defects: ["T-L1-D01"] },
    { batch_id: "T-B02", files: ["apps/client/src/pages/a/index.vue"], shared: false, defects: ["T-L1-D02"] },
    { batch_id: "T-B03", files: ["apps/client/src/pages/b/index.vue"], shared: false, defects: ["T-L1-D03"] },
  ] }, [
    { id: "T-L1-D01", sev: "P3", axis: "间距", page: "a", frame: "f1", cite: "x:1", symptom: "s", fix: "f" },
    { id: "T-L1-D02", sev: "P1", axis: "位置", page: "a", frame: "f2", cite: "x:2", symptom: "s", fix: "f" },
    { id: "T-L1-D03", sev: "P2", axis: "文案", page: "b", frame: "f3", cite: "x:3", symptom: "s", fix: "f" },
  ]);
  const dup = mk("dup", { batches: [
    { batch_id: "T-B10", files: ["apps/client/src/pages/c/index.vue"], shared: false, defects: ["T-L2-D01"] },
    { batch_id: "T-B11", files: ["apps/client/src/pages/c/index.vue"], shared: false, defects: ["T-L2-D02"] },
  ] }, [
    { id: "T-L2-D01", sev: "P1", axis: "位置", page: "c", frame: "f4", cite: "x:4" },
    { id: "T-L2-D02", sev: "P1", axis: "字号", page: "c", frame: "f5", cite: "x:5" },
  ]);
  const empty = mk("empty", { batches: [
    { batch_id: "T-B20", files: ["apps/client/src/pages/d/index.vue"], shared: false, defects: ["T-L3-D01"] },
  ] }, [{ id: "T-L3-D01", sev: "P3", axis: "文案", page: "d", frame: "f6", cite: "x:6" }]);
  const run = (args) => spawnSync(process.execPath, [SELF, ...args], { encoding: "utf8" });
  const rG = run(good), outG = String(rG.stdout);
  const okG = rG.status === 0 && /EMITFIXLANES_RESULT=PASS/.test(outG)
    && /本轮不派批次=1/.test(outG)                     // 纯 P3 且非共享的批次不派
    && /缺陷行=2 /.test(outG)                           // 只派 根因1 + 含P1的1
    && existsSync(join(root, "good.lanes", "FXA.brief.md")) && existsSync(join(root, "good.lanes", "FXB.brief.md"));
  const rD = run(dup);
  const okD = rD.status === 1 && /文件被两条车道领走/.test(String(rD.stdout) + String(rD.stderr));
  const rE = run(empty);
  const okE = rE.status === 2 && /空派单/.test(String(rE.stdout));
  /* 第 4 例：同一区被切成两块时，两份任务书必须各自落盘。
     这条正是补上"FXB 被自己第二块覆掉"那个 bug 的负控——去掉命名修正后它会红。 */
  const manyRows = [], manyB = [];
  for (let i = 1; i <= 6; i++) {
    manyRows.push({ id: "T-L4-D0" + i, sev: "P1", axis: "位置", page: "p" + i, frame: "f" + i, cite: "x:" + i });
    manyB.push({ batch_id: "T-B4" + i, files: ["apps/client/src/pages/p" + i + "/index.vue"], shared: false, defects: ["T-L4-D0" + i] });
  }
  const many = mk("many", { batches: manyB }, manyRows);
  const rM = run(many), outM = String(rM.stdout);
  const okM = rM.status === 0 && /车道=2 /.test(outM)
    && existsSync(join(root, "many.lanes", "FXA.brief.md")) && existsSync(join(root, "many.lanes", "FXB.brief.md"));
  const ok = okG && okD && okE && okM;
  rmSync(root, { recursive: true, force: true });
  console.log(`EMITFIXLANES_SELFTEST=${ok ? "PASS" : "FAIL"} 分箱出册=${okG ? "OK" : "BAD"} 互斥仍拒=${okD ? "OK" : "BAD"} 空选派仍拒=${okE ? "OK" : "BAD"} 切块不覆写=${okM ? "OK" : "BAD"}（good=${rG.status} dup=${rD.status} empty=${rE.status} many=${rM.status}）`);
  process.exit(ok ? 0 : 1);
}
