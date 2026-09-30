/* 派生 verify-ledger 的"退役登记"（reports/audit/round-7/ledger-retired-vouchers.json）。
 *
 * 背景：70472d92（"删一周前及以前的报告"，实删 118 份）把 round-2 与 baseline 的 18 份文件删了，
 * 而 round-6 台账里有 71 个 ID 正是靠这些文件当凭证 ⇒ 它们成了"全轮次矩阵无本尊行"的孤儿。
 * 用户 2026-09-30 裁定：登记退役、具名报数（不恢复被有意删除的凭证，也不重建行）。
 *
 * 凭证怎么定（不许猜）：
 *   ① literal —— 在删除前的 18 份 blob 里逐字搜到该 ID 的那一份；
 *   ② cluster/alias —— literal 找不到时，用**仍存活**的 round-6/ledger-notes.md 里记的
 *      LEDGER_CLUSTER_HIT / LEDGER_ALIAS_HIT 行给出的锚点路径补，并如实标 via。
 *   找不到凭证的 ID 一律不登记（unresolvedVouchers 里单列）——"没找到"不许写成"已登记"。
 *
 * 用法：node scripts/qa/derive-ledger-retire-register.mjs [orphanLog]
 *   orphanLog 默认 .zcode/tmp/orch-r9/ledger-orphans.log（由 verify-ledger 输出里 `ORPHAN_ID <id>` 行构成）；
 *   不给就直接跑一次 verify-ledger 取孤儿集（离线、只读）。
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/* core.quotepath=false：否则非 ASCII 路径会被 C 引用成 "\346\254\241..."，git show 取不到那一份，
   于是"读不到凭证"会被错记成"没有凭证"（本工具第一版就踩了这个坑：18 份只读到 13 份）。 */
const git = (args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 });

const DEL_COMMIT = "70472d92";
const orphanLog = process.argv[2] || join(REPO, ".zcode", "tmp", "orch-r9", "ledger-orphans.log");

let orphanIds;
if (existsSync(orphanLog)) {
  orphanIds = readFileSync(orphanLog, "utf8").split(/\r?\n/)
    .map((l) => (l.match(/^\s*ORPHAN_ID\s+(\S+)\s*$/) || [])[1]).filter(Boolean);
} else {
  const out = execFileSync(process.execPath, [join(REPO, "scripts", "qa", "verify-ledger.mjs"), "reports/audit/round-6"],
    { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"] });
  orphanIds = out.split(/\r?\n/).map((l) => (l.match(/^\s*ORPHAN_ID\s+(\S+)\s*$/) || [])[1]).filter(Boolean);
}
if (!orphanIds.length) { console.error("NO_ORPHANS_PARSED ⇒ 孤儿集为空，拒写登记件"); process.exit(2); }

const deleted = git(["show", "--name-only", "--diff-filter=D", "--format=", DEL_COMMIT])
  .split(/\r?\n/).map((s) => s.trim()).filter(Boolean).filter((p) => /round-2|baseline/.test(p));
const blobs = deleted.map((p) => {
  let text = ""; try { text = git(["show", `${DEL_COMMIT}^:${p}`]); } catch { text = ""; }
  return { path: p, text };
});
const readable = blobs.filter((b) => b.text).length;
if (readable !== deleted.length) { console.error(`SCOPE_INCOMPLETE blobsReadable=${readable} scope=${deleted.length} ⇒ 凭证搜索集不完整，拒写`); process.exit(2); }

const notesPath = join(REPO, "reports", "audit", "round-6", "ledger-notes.md");
const anchorMap = new Map();
if (existsSync(notesPath)) {
  for (const line of readFileSync(notesPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/LEDGER_(ALIAS|CLUSTER)_HIT\s+(\S+)\s+.*?@\s+(\S+)/);
    if (m) anchorMap.set(m[2], { via: m[1].toLowerCase(), path: m[3], evidence: line.trim() });
  }
}

const items = orphanIds.map((id) => {
  const hit = blobs.find((b) => b.text.includes(id));
  if (hit) return { id, voucher: hit.path, via: "literal", commit: DEL_COMMIT, reason: "凭证文档由 70472d92（删一周前报告）有意删除；台账未同步退役 ⇒ 该 ID 无本尊行可对" };
  const a = anchorMap.get(id);
  if (a) return { id, voucher: a.path, via: a.via, commit: DEL_COMMIT, voucherEvidence: a.evidence, reason: "凭 literal 搜不到，靠 ledger-notes 里记的簇锚/别名指向的凭证（该凭证同样被 70472d92 删除）" };
  return { id, voucher: null, via: null, commit: DEL_COMMIT, reason: "未找到任何凭证 ⇒ 不登记退役" };
});
const unresolved = items.filter((i) => !i.voucher).map((i) => i.id);
const byVia = {}; for (const i of items) if (i.via) byVia[i.via] = (byVia[i.via] || 0) + 1;

const out = {
  schema: "ledger-retired-vouchers/v1",
  decidedBy: "用户 2026-09-30 裁定：登记退役、具名报数（不恢复被有意删除的凭证，不重建行）",
  appliesToGate: "scripts/qa/verify-ledger.mjs",
  policy: "已登记退役的 ID 不再计入 PROBLEMS，但必须逐条具名打印并计数；未登记的新孤儿照旧判红。",
  derivedBy: "scripts/qa/derive-ledger-retire-register.mjs",
  derivedFrom: { orphanCount: orphanIds.length, voucherSearchScope: deleted.length, blobsReadable: readable, commit: DEL_COMMIT, byVia },
  unresolvedVouchers: unresolved,
  items,
};
writeFileSync(join(REPO, "reports", "audit", "round-7", "ledger-retired-vouchers.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`REGISTER items=${items.length} withVoucher=${items.length - unresolved.length} unresolved=${unresolved.length} byVia=${JSON.stringify(byVia)}`);
if (unresolved.length) console.log("UNRESOLVED:", unresolved.join(", "));
