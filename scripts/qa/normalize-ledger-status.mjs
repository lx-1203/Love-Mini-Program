/* 把 status 列里的散文归位（§79）。
   成因（不回避）：§61 那次形状归一化里，我先做了「按位置原样拷贝」再挑有把握的枚举位，
   于是 4/6 列行的**散文正好落在 status 槽上就被留在那儿了** —— 列数修对了，值域反而第一次可见地错。
   判据（只用文本里**已经写着**的词，绝不替你发明状态）：
     0) 行在「NOISE 不予立账」小节内 → 状态 = 不立账（该节标题原话；该节自己的表头无 status 槽）；
     1) 散文里含受控状态词（待修复/已修复待复验/判据不成立/未取证/需裁决/撤销…）→ 取**最先出现**的那个当状态；
     2) 否则文本自称是「复验记录/复核记录/回归核对」→ 状态 = 回归核对；
     3) 否则文本自称「同族在册/并入/不新增 ID/补证据不新增」→ 状态 = 并入-不另立案；
     4) 剩下的一律 = 需裁决（并把 ID 打出来交人看，不猜）。
   原文一个字不丢：状态之外的整段散文挪进「处置」列，前面加归位标记。
   自判：11 列不变、单元格无裸竖线、每行都被分到 1-4 中的一类且分类总数==待修行数，否则拒绝落盘。
   用法：node scripts/qa/normalize-ledger-status.mjs [--apply]
*/
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = join(REPO, "reports/audit/round-6/issue-matrix.md");
const APPLY = process.argv.includes("--apply");

const VOCAB = ["待修复（需产品裁决", "已修复待复验", "保留-判据不成立", "判据不成立", "未取证/需裁决", "未取证", "需裁决", "撤销", "回归核对", "并入-不另立案", "待复验", "待修复", "不立账"];
const HDR_COLS = 11;

const C = { id: 1, alias: 2, page: 3, category: 4, severity: 5, status: 6, conf: 7, evidence: 8, statusEvidence: 9, idealRef: 10, action: 11 };

const src = readFileSync(FILE, "utf8");
const lines = src.split("\n");

/* 「NOISE 不予立账」那一节（第四节）本身不是缺陷表，是"这些东西为什么不立账"的登记表，
   它自己的表头是 4 列（ID|类型|出处|处置），没有 status 槽 —— §61 形状归一化把它们补齐到 11 列后
   status 只能留空。它们的终态就写在节标题里：不立账。这不是我发明的状态，是该节标题的原话。 */
let noiseFrom = -1, noiseTo = -1;
for (let i = 0; i < lines.length; i++) {
  if (noiseFrom < 0 && /^#{2,}\s.*(不予立账|NOISE)/.test(lines[i])) { noiseFrom = i; continue; }
  if (noiseFrom >= 0 && /^#{2,}\s/.test(lines[i])) { noiseTo = i; break; }
}
if (noiseFrom >= 0 && noiseTo < 0) noiseTo = lines.length;
const inNoiseSection = (i) => noiseFrom >= 0 && i > noiseFrom && i < noiseTo;

const bad = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (!/^\|\s*MP-/.test(l)) continue;
  const c = l.split("|");
  if (c.length - 2 !== HDR_COLS) continue;
  const v = String(c[C.status] || "").trim();
  if (!VOCAB.some((t) => v.startsWith(t))) bad.push({ i, c, v });
}

const groups = { token: [], review: [], merge: [], overturn: [], notfiled: [], unknown: [] };
const out = [];
for (const b of bad) {
  const prose = b.v;
  let token = null, kind = null;
  /* 规则按"这句话自己在说什么"排，且**只看开头**：
     散文里出现的受控词经常是被引用的别处状态（例：`【源码复核推翻 finding 的 status=待修复】`
     说的是"待修复"这个判定被推翻＝判据不成立，若在全文里 find 关键字就会把它抬成"待修复"，正好反了）。 */
  if (inNoiseSection(b.i)) { token = "不立账"; kind = "notfiled"; }
  else if (/^【?源码复核推翻|^【?复核推翻|^判据不成立|^保留-判据不成立/.test(prose)) { token = "保留-判据不成立"; kind = "overturn"; }
  else if (VOCAB.some((t) => prose.startsWith(t))) { token = VOCAB.find((t) => prose.startsWith(t)); kind = "token"; }
  else if (/^(A 路|B 路|[ABCS]\s*路)?[:：]?\s*(PostCard|登出后|onPullDown|三分区)?.*复验记录|^.*复核记录/.test(prose)) { token = "回归核对"; kind = "review"; }
  else if (/^(条目)?正文自述|同族在册|并入|不新增 ?ID|补证据不新增|同一缺陷/.test(prose)) { token = "并入-不另立案"; kind = "merge"; }
  else if (/复验记录|复核记录/.test(prose)) { token = "回归核对"; kind = "review"; }
  else if (/同族在册|并入|不新增/.test(prose)) { token = "并入-不另立案"; kind = "merge"; }
  if (!token) {
    /* 状态列为空的行（§61 归一化时 4 列行没东西可填）——它们的"自己在说什么"写在处置列里，
       所以去那一列找自述，而不是直接兜底成"需裁决"。 */
    const act = String(b.c[C.action] || "").trim();
    if (/回归核对|复验记录|复核记录|非新缺陷/.test(act)) { token = "回归核对"; kind = "review"; }
    else if (/并入|同族在册|不新增|不另立案|噪声|同一缺陷/.test(act)) { token = "并入-不另立案"; kind = "merge"; }
    else if (/判据不成立|推翻/.test(act)) { token = "保留-判据不成立"; kind = "overturn"; }
  }
  if (!token) { token = "需裁决"; kind = "unknown"; }
  groups[kind].push(b.c[C.id].trim());
  const c = b.c.slice();
  c[C.status] = " " + token + " ";
  const moved = prose
    ? "〔§79 状态列归位：原列内容是散文「" + prose.slice(0, 300) + "」，已挪到本列，状态按该句自述判定〕"
    : "〔§79 状态列归位：本行 status 原为空（该行所在小节自己的表头没有 status 槽），按其小节标题补为「" + token + "」，原文一字未动〕";
  c[C.action] = (c[C.action] ? c[C.action] + " / " : "") + moved;
  const row = c.join("|");
  if (row.split("|").length - 2 !== HDR_COLS) { console.log("ABORT 归位后列数变了 " + b.c[C.id]); process.exit(2); }
  for (const cell of c.slice(1, -1)) if (cell.includes("|")) { console.log("ABORT 单元格含竖线 " + b.c[C.id]); process.exit(2); }
  out.push({ i: b.i, row });
}

const classified = groups.token.length + groups.review.length + groups.merge.length + groups.overturn.length + groups.notfiled.length + groups.unknown.length;
console.log(`STATUS_NORM 待归位=${bad.length} 已分类=${classified} 小节区间=§${noiseFrom + 1}..${noiseTo}`);
console.log(`  开头即状态词=${groups.token.length}  自述被复核推翻=${groups.overturn.length}  自称复验/复核记录=${groups.review.length}  自称并入同族=${groups.merge.length}  不予立账小节=${groups.notfiled.length}  判不出来→需裁决=${groups.unknown.length}`);
groups.unknown.forEach((id) => {
  const b = bad.find((x) => x.c[C.id].trim() === id);
  console.log("  UNKNOWN " + id + " :: " + (b ? b.v.slice(0, 90) : ""));
});
if (classified !== bad.length) { console.log("STATUS_NORM=REFUSED 分类数与待归位数不符"); process.exit(2); }
if (!APPLY) { console.log("STATUS_NORM=DRY_RUN（加 --apply 落盘）"); process.exit(0); }

const bak = FILE + ".pre-statusnorm.bak";
writeFileSync(bak, src);
const next = lines.slice();
for (const o of out) next[o.i] = o.row;
const result = next.join("\n");
/* 落盘前自判：新内容不能比原文短一半（散文是搬移不是删除，正常只会长），
   且必须走 tmp+rename，避免把权威件写成半截文件。 */
if (result.length < src.length * 0.9) {
  console.log(`STATUS_NORM=REFUSED 新内容长度 ${result.length} < 原文 ${src.length} 的 90%，不覆写`);
  process.exit(2);
}
const tmp = FILE + ".tmp-" + process.pid;
writeFileSync(tmp, result);
renameSync(tmp, FILE);
console.log(`STATUS_NORM=APPLIED changed=${out.length} 长度 ${src.length}→${result.length} backup=${bak.replace(REPO + "/", "")}`);
