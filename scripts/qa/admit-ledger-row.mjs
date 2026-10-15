#!/usr/bin/env node
/* 往权威台账立一行：手写 markdown 表格行最容易坏在三件事上——列数不对、ID 撞号、状态词不在词表。
   本脚本把这三件事做成插入前断言，缺省只干跑（打印将要插入的位置与新行数），
   加 --apply 才写盘；写盘前后各数一次表格行数，守恒不过就当场报错。
   用法：node scripts/qa/admit-ledger-row.mjs --row <行文本文件> [--apply]
        [--ledger reports/audit/round-6/issue-matrix.md] [--table-header "| 新号 | 历史别名 |"] */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes("--apply");
const LEDGER = resolve(REPO, arg("ledger", "reports/audit/round-6/issue-matrix.md"));
const ROW = readFileSync(resolve(REPO, arg("row", ".zcode/tmp/ledger-new-row.txt")), "utf8").replace(/\r?\n$/, "");

/* 状态词表只有一个来源：normalize-ledger-status.mjs 里的 VOCAB 数组。
   在这里抄一份等于给自己造一条会与词表漂移的判据。 */
const VOCAB_SRC = readFileSync(resolve(REPO, "scripts/qa/normalize-ledger-status.mjs"), "utf8");
const VOCAB = (JSON.parse("[" + (VOCAB_SRC.match(/const VOCAB = \[([\s\S]*?)\];/) || [])[1].trim() + "]"));

const errs = [];
const cells = ROW.split("|").slice(1, -1).map((s) => s.trim());
if (!ROW.startsWith("|") || !ROW.endsWith("|")) errs.push("行文本必须以 | 开头并以 | 结尾（现在不是表格行）");
if (cells.length !== 11) errs.push(`列数 ${cells.length} ≠ 台账口径要求的 11 列`);
const id = cells[0] || "";
/* ID 形状必须与 verify-ledger.mjs 的 isRealId 同源，否则会出现更坏的事：
   本工具"放行"的号，权威门转头判 MALFORMED_TOKEN —— 实测第一版就是这样，
   车道用 MP-AUDITR3-* 立了 9 行，ADMIT_RESULT=OK 连打九次，
   随后 verify-ledger 把 MALFORMED_TOKENS 从 5 顶到 14，白修一轮。
   两个载具对"什么叫合法 ID"必须有一条尺子：这里对齐 ^MP-R\d（含 R\d+ 多轮前缀）。 */
if (!/^MP-R\d[A-Z0-9-]*$/.test(id)) {
  errs.push(`新号形状不对：${id || "(空)"}（权威门 verify-ledger 认 ^MP-R\\d…，本工具不许放行它将来会判畸形的号）`);
}
const status = cells[5] || "";
if (!VOCAB.some((v) => status.startsWith(v))) errs.push(`status「${status.slice(0, 40)}」不在受控词表里（词表 ${VOCAB.length} 档）`);

const txt = readFileSync(LEDGER, "utf8");
const lines = txt.split("\n");
const hdr = lines.findIndex((l) => l.startsWith(arg("table-header", "| 新号 | 历史别名 |")));
if (hdr < 0) errs.push("找不到主表表头 ⇒ 无法定位插入点（不许瞎插到文件末尾）");
if (lines.some((l) => l.startsWith("|") && l.split("|")[1]?.trim() === id)) errs.push(`ID 撞号：${id} 已在台账里`);
/* 主表 = 从表头起、连续以 | 开头的行；到第一个非表格行为止。
   插到"下一节表格"里会把行送进另一个口径。 */
let end = hdr + 1;
while (end < lines.length && (lines[end].startsWith("|") || lines[end].startsWith("|MP-"))) end++;
/* 「一行」的定义在这里只有一份：isDataRow(l)。
   表格行 = 以 | 开头，且不是 |---|---| 那种分隔行。分隔行同样以 | 开头、同样含 |，
   把它当数据行数进"主表行数"就是分母 +1 的幻影行（本仓已记过两次：
   「分隔行被当数据行 ⇒ 分母 +1 幻影」，emit-open-items 里是同一条错）。
   before / after / 守恒断言三处必须共用这一个定义。第一版只有 before 走它，
   after 用的是第二套更宽的定义（`l.includes("|")`，不看分隔行），于是分隔行只进 after
   不进 before ⇒ 180 行的真表插一行后报「插入后主表行数 181 ≠ 180」，
   每一行都过不了守恒 —— 差得不写盘的那一步之外，这个工具在 issue-matrix.md 上永久不可用，
   本轮 8 行因此是被受控 splice 插进去的，不是本工具插的。 */
const isDataRow = (l) => l.startsWith("|") && !(/^\|[\s|:-]*\|?$/.test(l) && /---/.test(l));
const bodyRows = lines.slice(hdr + 1, end).filter(isDataRow);
/* 检查必须先于写入。第一版把 errs 的判断放在写盘之后，实测后果是：
   一条 status 不在词表里的行**已经被插进台账**，而屏幕上打的是 ADMIT_RESULT=FAIL ——
   一个"报了拒绝却已经把动作做完"的工具，比一个直接红掉的工具危险得多（它会让人以为台账是干净的）。 */
if (errs.length) {
  console.log(`ADMIT_RESULT=FAIL problems=${errs.length}（未落盘）`);
  for (const e of errs) console.log("  ✗ " + e);
  process.exit(2);
}
let after = bodyRows.length + (APPLY ? 1 : 0);
if (APPLY) {
  const next = [...lines.slice(0, end), ROW, ...lines.slice(end)];
  /* 插入点 end 落在旧表尾之后 ⇒ 新区间 [hdr+1, end+1) 覆盖原表全部行 + 新行（分隔行也在其中，
     由同一个 isDataRow 滤掉）。守恒按"同一个定义数出来的两边"判：measured === before + 1。 */
  const measured = next.slice(hdr + 1, end + 1).filter(isDataRow).length;
  if (measured !== bodyRows.length + 1) { console.log(`ADMIT_RESULT=FAIL reason=插入后主表行数 ${measured} ≠ ${bodyRows.length + 1}（守恒不过就不落盘）`); process.exit(2); }
  writeFileSync(LEDGER, next.join("\n"));
  after = measured;
}
console.log(`ADMIT ${APPLY ? "已落盘" : "干跑"} 主表行数 ${bodyRows.length} → ${after}（表头在第 ${hdr + 1} 行，插入点第 ${end + 1} 行）`);
console.log(`  新号=${id} 列数=${cells.length} status=${status.slice(0, 24)} 词表=${VOCAB.length} 档`);
console.log(APPLY ? "ADMIT_RESULT=OK" : "ADMIT_RESULT=DRY（加 --apply 才写台账）");
