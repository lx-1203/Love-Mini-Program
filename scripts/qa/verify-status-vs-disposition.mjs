/**
 * 状态列与处置列自相矛盾的检测（v3.2 配套，只读，默认只提示不否决）。
 *
 * 为什么立它：目标 ⑤ 的收尾条件是"没有任何判据成立但未修 / 有证据缺口的条目"。
 * 这两件事以前只能靠人读台账 —— 而实测两行已经自相矛盾：
 *   · MP-R1-…-CHAT-SESSION-INDEX-002 第 6 列写「已修复（源码级判点）」，
 *     第 12 列却写「…端到端真实腿未跑 ⇒ 状态停在 已修复待复验，不写已验证」；
 *   · MP-R7CLIENT-UPLOAD-EXT-001 第 6 列同上，第 12 列写「仍欠：一次真上传正例帧 + 一条非法扩展名负例…仍未接线」。
 * 一行同时说"到终态了"和"还欠帧"，下一轮就会有人只读第 6 列把它当成已结案。
 *
 * 判据形状：第 6 列是终结性措辞（已修复 / 已验证 / 判据不成立 / 保留）且第 9 或 12 列出现**显式欠款标记**
 * （仍欠 / 待复验 / 未跑 / 未接线 / 不许写「已验证」/ 需人复验 / 状态停在）。措辞列是散文，
 * 所以默认只提示（advisory）；`--strict` 才把它变成否决 —— 违反"没量过误报率的门不要先变红"。
 * 用法：node scripts/qa/verify-status-vs-disposition.mjs [--matrix 路径] [--strict] [--selftest]
 * 退出码：0=无矛盾或只提示；1=--strict 下有矛盾；2=台账读不到 / 扫描集为空。
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const TERMINAL = /^(已修复|已验证|判据不成立|保留-判据不成立|撤销|不立账|并入)/;
/* 「已修复待复验」这种值本身就写着"还欠复验"，它不是终态。第一版没排除它，
   于是 CHATINPUT-A01 这种"状态列与处置列本来就一致"的行被抓成假矛盾
   （抓错的门会让下一轮去改一条没毛病的行）。所以先排除带"待复验/待人"的措辞。 */
const NON_TERMINAL_TOO = /待复验|待人|需人复验|需人判/;
const OWED = /(仍欠|尚欠|待复验|未跑|未接线|不许写|不写「已验证」|需人复验|需人判|状态停在|欠一次|本轮未动)/;

function rowsOf(text) {
  const lines = text.split(/\r?\n/);
  const hdr = lines.find((l) => /^\|/.test(l) && /\|\s*(?:status|状态)\s*\|/i.test(l));
  if (!hdr) return { err: "找不到 status/状态 表头" };
  const cols = hdr.split("|").map((s) => s.trim());
  const si = cols.findIndex((c) => /^(?:status|状态)$/i.test(c));
  const ii = cols.findIndex((c) => /^(?:新号|id)$/i.test(c));
  const ei = cols.findIndex((c) => /^statusEvidence$/i.test(c));
  const hi = cols.findIndex((c) => /^(?:处置|disposition)$/i.test(c));
  if (si < 0 || ii < 0) return { err: "status 或 新号 列定位失败" };
  const out = [];
  for (const l of lines) {
    if (!/^\|\s*MP-/.test(l)) continue;
    const c = l.split("|").map((s) => s.trim());
    out.push({ id: c[ii], status: c[si] || "", ev: ei >= 0 ? c[ei] : "", hist: hi >= 0 ? c[hi] : "" });
  }
  return { rows: out, cols: { si, ii, ei, hi } };
}

function scan(matrixPath) {
  const r = rowsOf(readFileSync(matrixPath, "utf8"));
  if (r.err) return r;
  const hits = [];
  for (const row of r.rows) {
    const st = row.status.split("（")[0].trim();
    if (!TERMINAL.test(st) || NON_TERMINAL_TOO.test(row.status)) continue;
    const m = [row.ev, row.hist].join(" ｜ ").match(OWED);
    if (!m) continue;
    const where = (row.hist && OWED.test(row.hist) ? "处置" : "") + (row.ev && OWED.test(row.ev) ? (row.hist && OWED.test(row.hist) ? "+statusEvidence" : "statusEvidence") : "");
    const i = [row.ev, row.hist].join(" ｜ ").indexOf(m[0]);
    hits.push({ id: row.id, status: st, marker: m[0], where, quote: [row.ev, row.hist].join(" ｜ ").slice(Math.max(0, i - 10), i + 150).replace(/\s+/g, " ") });
  }
  return { rows: r.rows, hits };
}

if (has("selftest")) {
  const fixtures = [
    { id: "MP-SELF-1", n: "处置列说欠帧而状态说已修复 ⇒ 必须被抓", status: "已修复（源码级判点）", ev: "e", hist: "端到端真实腿未跑 ⇒ 状态停在 已修复待复验", want: true },
    { id: "MP-SELF-2", n: "真正结案的行不该被抓", status: "已修复（帧级复验：当轮帧 + 3 个机器判点全部成立）", ev: "e", hist: "修完并复验通过", want: false },
    { id: "MP-SELF-3", n: "状态本来就写着未修 ⇒ 不是矛盾", status: "待修复", ev: "e", hist: "仍欠一次真上传正例帧", want: false },
    { id: "MP-SELF-4", n: "statusEvidence 里写欠款也要抓到", status: "已验证", ev: "帧侧仍欠一次该状态", hist: "已接线", want: true },
    { id: "MP-SELF-5", n: "状态本来就写「已修复待复验」⇒ 两列一致，不是矛盾（第一版在这里产假红）", status: "已修复待复验（需帧复验）", ev: "复验要的是登出态取景", hist: "待真机帧", want: false },
  ];
  const md = ["| 新号 | 历史别名 | 页面 | 类别 | severity | status | 置信 | 证据 | statusEvidence | 理想图依据 | 处置 |", "|---|---|---|---|---|---|---|---|---|---|---|"];
  for (const f of fixtures) md.push(`| ${f.id} | 无 | pages/a/index | C | P2 | ${f.status} | 高 | e | ${f.ev} | | ${f.hist} |`);
  const dir = join(REPO, "tmp", "qa");
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, "statusdispo-fixture.md");
  writeFileSync(tmp, md.join("\n"));
  const s = scan(tmp);
  const bad = [];
  if (s.err) bad.push("夹具读不出：" + s.err);
  else {
    const got = new Set(s.hits.map((h) => h.id));
    for (const f of fixtures) if (got.has(f.id) !== f.want) bad.push(`${f.id} ${f.n}：期望被抓=${f.want} 实际=${got.has(f.id)}`);
    if (!s.hits.length) bad.push("夹具里两条该抓的一条都没抓到 ⇒ 判据是空跑，本门永远绿");
    if (s.hits.length === s.rows.length) bad.push("全部行都算矛盾 ⇒ 判据过宽，下一轮没人再看它");
  }
  console.log(`DISPO_SELFTEST 夹具=${fixtures.length} 抓到=${s.hits ? s.hits.length : "?"} 结果=${bad.length ? "FAIL" : "PASS"}`);
  for (const b of bad) console.log("  BAD " + b);
  process.exit(bad.length ? 1 : 0);
}

const MATRIX = resolve(REPO, arg("matrix", "reports/audit/round-6/issue-matrix.md"));
if (!existsSync(MATRIX)) { console.log(`DISPO_RESULT=FAIL reason=台账不存在 ${MATRIX}`); process.exit(2); }
const s = scan(MATRIX);
if (s.err) { console.log(`DISPO_RESULT=FAIL reason=${s.err}`); process.exit(2); }
if (!s.rows.length) { console.log("DISPO_RESULT=FAIL reason=一行都没读到 ⇒ 表头或行前缀变了，不得当成\"没有矛盾\""); process.exit(2); }
console.log(`DISPO rows=${s.rows.length} 矛盾=${s.hits.length}（第 6 列说已到终态、处置/证据列仍写欠款）模式=${has("strict") ? "strict（否决）" : "advisory（只提示）"}`);
for (const h of s.hits) console.log(`  DISPO_HIT ${h.id} [${h.status}] 标记=${h.marker} 在=${h.where || "?"} :: ${h.quote}`);
console.log(s.hits.length
  ? `DISPO_RESULT=${has("strict") ? "FAIL" : "ADVISORY"} 有 ${s.hits.length} 行自相矛盾：第 6 列会被下一轮当结案读，处置列却说还欠东西。逐条归置（把欠款挂进取景配方/登记表，或把第 6 列改成真实状态），不许反过来改措辞。`
  : "DISPO_RESULT=PASS 没有\"状态说完成、处置说欠着\"的行");
process.exit(s.hits.length && has("strict") ? 1 : 0);
