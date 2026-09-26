/**
 * 把判据台（verify-fixes-against-artifact）的逐条结论落到台账 status 格里，
 * 让每一条 `待修复 / 已修复待复验` 都带得上"本轮为什么没做完 + 还缺哪个载体"。
 *
 * 为什么需要它（本轮实测）：矩阵 163 行里 61 行还写 `待修复`，其中 56 行在 status／处置／
 * statusEvidence 三格里**都没有任何去向标记**；判据台早就给出了每条的桶与原因，只是没人接线
 * （"建了工具没接线"是本轮公开批评过 4 次的同一类失败）。同时 12 行 `已修复待复验` 其实已经
 * `ARTIFACT_VERIFIED`（静态判据在产物里看得见），不推进就等于让台账长期虚高。
 *
 * 三条推进规则（每条都只读判据台已经跑过的控制，不另起一套判据）：
 *  P1  `待修复` + 桶∈{产物已见, 仅源码} + closerAction=patched  → `已修复待复验（…）`，并把命中原文写进 statusEvidence
 *  P2  `已修复待复验` + 桶=产物已见 + frame=false + 有 present 硬判点命中 → `已修复（产物侧已见，静态判据）`
 *  P3  其余一律**不推进状态**，只把去向写进 status 的括注（closerAction + 桶 + 缺的载体）
 * 反向保护：状态格里已有去向括注（含「」）的行不重复追加；桶=两载体都没有 且状态=已修复待复验 的行
 * 只记冲突不降级（降级是另一件事，交人判）。扫描集为空一律 exit 2。
 * 用法：node scripts/qa/land-verdicts-into-ledger.mjs [--apply] [--verdicts <f>] [--ledger <f>]
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes("--apply");
const VERDICTS = arg("verdicts", ".zcode/tmp/fixverify/verdicts.json");
const LEDGER = arg("ledger", "reports/audit/round-6/issue-matrix.md");
const rel = (p) => relative(REPO, p).split(sep).join("/");

const BUCKET_CN = {
  ARTIFACT_VERIFIED: "产物已见", SOURCE_ONLY: "仅源码命中", NEEDS_UI_FRAME: "需排UI帧",
  NOT_IN_EITHER: "两载体都没有", UNDECIDABLE: "判据不足",
};
const ACTION_CN = {
  patched: "已改工作树", deferred_p4: "P4延后出本轮", needs_backend: "需后端改动", needs_ruling: "待人裁决",
  no_op_already_fixed: "判据本已满足", ledger_anchor_error: "台账锚点写错",
};
const COL_STATUS = 6, COL_EVID = 8, COL_STAT_EVID = 9;

const vPath = resolve(REPO, VERDICTS), lPath = resolve(REPO, LEDGER);
if (!existsSync(vPath) || !existsSync(lPath)) { console.log(`LAND_RESULT=FAIL reason=读不到输入（${VERDICTS} / ${LEDGER}）`); process.exit(2); }
const vj = JSON.parse(readFileSync(vPath, "utf8"));
const items = Array.isArray(vj.items) ? vj.items : [];
if (!items.length) { console.log("LAND_RESULT=FAIL reason=判据台条目为 0（扫描集为空不得改台账）"); process.exit(2); }
const meta = vj.meta || {};
const byId = new Map();
for (const it of items) if (it && it.id) byId.set(String(it.id), it);

const lines = readFileSync(lPath, "utf8").split(/\r?\n/);
let promoted = 0, annotated = 0, untouched = 0, conflictMarked = 0;
const promotedRows = [], annotatedRows = [], conflicts = [], skippedNoRow = [], malformed = [];
const seenIds = new Set();

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  if (!/^\| MP-/.test(raw)) continue;
  const c = raw.split("|").map((s) => s.trim());
  const id = c[1];
  if (!id) continue;
  if (!byId.has(id)) {
    // 判据台只覆盖本轮修复波的 116 条；矩阵里另有几十条属于更早的波次。
    // 这些行**同样不能留裸状态**：读台账的人分不出"没轮到判"和"判过但没记录"，
    // 所以明确写一句"判据台未覆盖本条"，把它和已判过的区分开 —— 这是自认覆盖面，不是给出结论。
    skippedNoRow.push(id);
    const st0 = c[COL_STATUS] || "";
    if (/^(待修复|已修复待复验)$/.test(st0)) {
      const rebuilt0 = "| " + c.slice(1, c.length - 1).join(" | ") + " |";
      if (rebuilt0.split("|").length !== c.length) { malformed.push(id + " 未覆盖行重拼列数变化"); continue; }
      c[COL_STATUS] = `${st0}（去向：判据台未覆盖本条（不在本轮修复波 ${items.length} 条条目集内），缺的载体=需人复判后指定）`;
      annotated++; annotatedRows.push(id + "（未覆盖）");
      lines[i] = "| " + c.slice(1, c.length - 1).join(" | ") + " |";
    }
    continue;
  }
  seenIds.add(id);
  const it = byId.get(id);
  const bucket = BUCKET_CN[it.verdict] || String(it.verdict || "?");
  const action = it.closerAction ? (ACTION_CN[it.closerAction] || it.closerAction) : "closer 无记录";
  const status = c[COL_STATUS] || "";
  const head = status.split(/[（(]/)[0];
  const hardPresent = (it.probes || []).filter((p) => p && p.hard && p.polarity === "present" && p.artifact && p.artifact.hit);
  /* 纯删除型条目（没有 present 硬判点）以前落不了账：它既进不了"产物已见"那一支（要求有命中判点），
     也就会一直留着上一轮写进去的"去向/冲突"注记——而那条注记描述的是**当时**的判据台，现在已经是假话。
     这里补上它自己的判据：absent 硬判点在源码里在、在产物里不在，才算"删掉了"；
     两边都不在不算证据（那可能从来就没有过这个东西）。 */
  const hardAbsentGone = (it.probes || []).filter((p) => p && p.hard && p.polarity === "absent"
    && p.artifact && !p.artifact.hit && p.src && p.src.hit);
  /* 注意：判据台的 verdictWhy 是**给人看的自由文本**，里面常带 `callerSnapshot`、`IMAGE_PATHS.…` 这类
     标识符形状的词。本仓已有实测教训：把这些词写回台账格子里，抽取器会照着造出硬判点，
     反过来把已经修好的条目钉成缺陷。所以格子里只写**受控中文标签 + 指针**，原文留在 verdicts 文件里。 */
  const REF = "详见 reports/audit/round-6/fixwave-verdicts.json 内本条 verdictWhy";
  let next = status, evAdd = "";

  if (head === "待修复" && (it.verdict === "ARTIFACT_VERIFIED" || it.verdict === "SOURCE_ONLY") && it.closerAction === "patched") {
    next = `已修复待复验（判据台=${bucket}，closer=已改工作树；缺的载体=${it.verdict === "SOURCE_ONLY" ? "重建后的产物命中" : "UI 帧"}；${REF}）`;
    evAdd = `〔判据台落账 ${meta.baselineSha || "?"} 基线：命中判点 ${hardPresent.slice(0, 3).map((p) => p.token).join("、") || "(无 present 硬判点)"}〕`;
    promoted++; promotedRows.push(id + " → " + next.slice(0, 40));
  } else if (head === "已修复待复验" && it.verdict === "ARTIFACT_VERIFIED" && it.frame === false && hardPresent.length) {
    next = `已修复（产物侧已见，静态判据可判；判据台基线 ${meta.baselineSha || "?"}）`;
    evAdd = `〔落账：命中 ${hardPresent.slice(0, 3).map((p) => p.token).join("、")}〕`;
    promoted++; promotedRows.push(id + " → 已修复（产物已见）");
  } else if (head === "已修复待复验" && it.verdict === "ARTIFACT_VERIFIED" && it.frame === false && !hardPresent.length && hardAbsentGone.length) {
    next = `已修复（删除判点在源码里仍在、产物作用域内已不可见，静态可判；判据台基线 ${meta.baselineSha || "?"}）`;
    evAdd = `〔落账：删除判点已不可见 ${hardAbsentGone.slice(0, 3).map((p) => p.token).join("、")}〕`;
    promoted++; promotedRows.push(id + " → 已修复（删除判点已不可见）");
  } else if (/^(待修复|已修复待复验)$/.test(status) && !/[（(]/.test(status)) {
    const carrier = it.verdict === "NOT_IN_EITHER" ? "两载体里都找不到预期修后状态，需收紧判据"
      : it.verdict === "NEEDS_UI_FRAME" ? "渲染帧（静态判不了）"
        : it.verdict === "UNDECIDABLE" ? "判据本身没点名可判的物件"
          : it.verdict === "SOURCE_ONLY" ? "重建后的产物" : "UI 帧";
    next = `${status}（去向：closer=${action}；判据台=${bucket}；缺的载体=${carrier}；${REF}）`;
    annotated++; annotatedRows.push(id);
  } else {
    untouched++;
    const whyTxt = String(it.verdictWhy || "").replace(/\s+/g, " ").slice(0, 120);
    if (head === "已修复待复验" && it.verdict === "NOT_IN_EITHER") {
      conflicts.push(id + " 状态=已修复待复验 但判据台=两载体都没有 :: " + whyTxt);
      /* "已写进台账正文"是一句承诺，只有真的改了这一格才算兑现：上一版只在终端打印冲突、
         rowsTouched 仍为 0 ⇒ 退出码 2、一个字都没写，而提示语却说自己写过了。 */
      if (status.indexOf("与判据台冲突") < 0) {
        next = `${status}（与判据台冲突：${whyTxt}——不自动降级，待人判；${REF}）`;
        conflictMarked++;
        untouched--;
      }
    }
  }
  if (next === status && !evAdd) continue;
  c[COL_STATUS] = next;
  if (evAdd && String(c[COL_STAT_EVID] || "").indexOf(evAdd.slice(1, 20)) < 0) c[COL_STAT_EVID] = (c[COL_STAT_EVID] || "") + evAdd;
  /* 重拼必须**保持列数不变**：`split("|")` 在行首行尾各留一个空元素，slice(1) 会把行尾那个空元素
     也当一列拼回去 ⇒ 本轮 85 行全部变成 12 列，被 verify-ledger 的 shape 轴当场判红
     （OFF_SCHEMA_ROWS=85）。这里自己先断言，不靠下游门禁捞。 */
  const rebuilt = "| " + c.slice(1, c.length - 1).join(" | ") + " |";
  if (rebuilt.split("|").length !== c.length) { malformed.push(id + " 重拼后列数变化 " + c.length + "→" + rebuilt.split("|").length); continue; }
  lines[i] = rebuilt;
}

console.log(`LAND_ITEMS=${items.length} 台账行匹配=${seenIds.size} 未匹配到判据台的矩阵行=${skippedNoRow.length} 推进=${promoted} 仅记去向=${annotated} 标冲突=${conflictMarked} 不动=${untouched}`);
promotedRows.forEach((r) => console.log("  PROMOTE " + r));
conflicts.forEach((r) => console.log("  CONFLICT " + r));
if (conflicts.length) console.log(`  〔冲突 ${conflicts.length} 条：状态说已修、判据台两个载体都找不到修后态 —— 不自动降级，只在本格里标注待人判；本轮实际写入 ${conflictMarked} 条${APPLY ? "（随 --apply 落盘）" : "（DRY：加 --apply 才落盘）"}〕`);
const rowsTouched = promoted + annotated + conflictMarked;
if (malformed.length) {
  console.log(`LAND_RESULT=FAIL reason=${malformed.length} 行重拼后列数发生变化，一个字都不写`);
  malformed.slice(0, 6).forEach((m) => console.log("  MALFORMED " + m));
  process.exit(2);
}
/* "看了 111 行、确实没有要改的" 与 "扫描集没对上、一行都没看" 不能共用一个退出码：
   前者是本轮的正常结果（NIE 已清零、可推进的上一轮都推进过了），后者才是工具失效。
   判据用 seenIds——只有真匹配到台账行才算"看过了"。 */
if (!seenIds.size) { console.log(`LAND_RESULT=FAIL reason=判据台 ${items.length} 条里一条都没匹配到台账行（扫描集/规则不匹配，不得空过）`); process.exit(2); }
if (!rowsTouched) { console.log(`LAND_RESULT=PASS-NOOP 已核 ${seenIds.size} 行、无需改动（推进/去向/冲突标注都为 0）`); process.exit(0); }
if (!APPLY) { console.log(`LAND_RESULT=DRY 将改 ${rowsTouched} 行（加 --apply 落盘，落盘前自动备份 .pre-verdictland.bak）`); process.exit(0); }
copyFileSync(lPath, lPath + ".pre-verdictland.bak");
writeFileSync(lPath, lines.join("\n"));
/* 台账格子里指向的那个文件必须在仓库里能打开：判据台的原始输出落在被 gitignore 的 .zcode/tmp，
   "证据写在没人能重跑的地方"是本轮公开批评过的同一类失败，所以顺手拷一份到 reports/ 下。 */
const PUB = join(REPO, "reports", "audit", "round-6", "fixwave-verdicts.json");
writeFileSync(PUB, JSON.stringify({ copiedFrom: rel(vPath), copiedAt: new Date().toISOString(), meta, summary: vj.summary || null, items }, null, 1));
console.log(`LAND_COPY_WRITTEN=${rel(PUB)} items=${items.length}`);
console.log(`LAND_WRITTEN=${rel(lPath)} rows=${rowsTouched} backup=${rel(lPath)}.pre-verdictland.bak`);
console.log("LAND_RESULT=OK");
