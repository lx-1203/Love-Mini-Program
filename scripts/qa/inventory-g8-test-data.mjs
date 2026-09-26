#!/usr/bin/env node
/* ④ 第 4 项「遗留测试数据处置」的可辩护默认落地：**留，但把"留下的是什么、要清该怎么清"变成机器产物**。

 为什么默认是"留"而不是"删"：
   · G8/G9 写进真实库的行是这一轮判据的证据本体（RING2 的帖子 id、RING5 的幂等重放计数、
     RING6 的评论/点赞计数都靠"行还在"才可复查）；删掉就等于把已经成立的结论改成不可复查。
   · 但"留"如果不点名留下什么，就是含糊的默认值。所以这个脚本把指纹逐条抄出来、
     并按主键生成一份**默认回滚**的清理脚本，将来真要删的人面对的是显式 ID 清单而不是 LIKE 语句。

 三条硬规矩（都是从本轮踩过的坑来的）：
   1. 只按**显式主键**删，永不生成范围/LIKE 谓词——幂等批改写吞掉整表的事故有过先例。
   2. 默认 ROLLBACK。要 COMMIT 必须同时给 `--apply` 与 `--backup <已存在的备份文件>`，缺一即拒。
   3. 守恒：解析到的指纹数必须等于写进清单的行数，少一条就 exit 2（不许"部分收录"）。

 用法：node scripts/qa/inventory-g8-test-data.mjs [--src-dir reports/audit/real-e2e]
      生成清理脚本：node scripts/qa/inventory-g8-test-data.mjs --emit-sql
      真要提交删除：node scripts/qa/inventory-g8-test-data.mjs --emit-sql --apply --backup <dump.sql>
*/
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const SRC = resolve(REPO, arg("src-dir", "reports/audit/real-e2e"));
const OUT_MD = resolve(REPO, arg("out", "reports/audit/real-e2e/test-data-inventory.md"));
const OUT_SQL = resolve(REPO, arg("out-sql", "reports/audit/real-e2e/test-data-cleanup.sql"));

if (!existsSync(SRC)) { console.log("TDI_RESULT=FAIL reason=找不到 G8/G9 取证目录 " + SRC); process.exit(2); }
const logs = readdirSync(SRC).filter((f) => /^(g[89].*\.(txt|log)|summary\.md)$/.test(f)).sort();
if (!logs.length) { console.log("TDI_RESULT=FAIL reason=目录里没有任何 g8/g9 取证日志（没有来源就不出清单，空清单不等于「已处置」）"); process.exit(2); }

/* 指纹 = 日志里能唯一指认同一次写入的物件：显式 id、G8 命名前缀的标题、上传落盘名。
   刻意不做"跨行推断"：宁可少收，也不要凭猜把不相干的行写进删除范围。 */
const rows = [];
const seen = new Set();
function add(kind, key, note, file) {
  const sig = kind + "|" + key;
  if (seen.has(sig)) return;
  /* 同一个主键只记一次（先分类的赢）：post 循环在前、通用 id 循环在后，
     不去重会让 id=236 同时以 post 和 id-unclassified 出现，把条数虚报成两条数据。 */
  if (kind !== "title" && kind !== "upload" && rows.some((r) => r.key === key)) return;
  seen.add(sig);
  rows.push({ kind, key, note, file });
}
for (const f of logs) {
  const txt = readFileSync(join(SRC, f), "utf8");
  /* 先数总账再分类：漏收一条却照写"无部分收录"，就是这份清单最坏的一种错——
     它会让人以为删除范围是完整的。所以 rawIdHits 与分类结果必须对上。 */
  for (const m of txt.matchAll(/(?:POST \/posts|返回|village-posts\/|admin[^\n]*?)(?:id=|\/)(\d+)/gi)) {
    add("post", m[1], "G8 环内按 id 写入/回读过的行", f);
  }
  for (const m of txt.matchAll(/\bid=(\d+)/g)) {
    /* 只在**同一行**里找类别线索。上一版取"前 90 个字符"的窗口，
       会把上一行的「点赞 HTTP 200」串进身份账号那一行，把 user 标成 like——
       清单里的类别将来是删除范围的依据，标错类别比不标更危险。 */
    const lineStart = txt.lastIndexOf("\n", m.index) + 1;
    const line = txt.slice(lineStart, m.index);
    const kind = /comment|评论/i.test(line) ? "comment" : /like|点赞/i.test(line) ? "like"
      : /user|身份|author|账号/i.test(line) ? "user" : "id-unclassified";
    add(kind, m[1], "同一行原文：" + line.slice(-46).replace(/\s+/g, " "), f);
  }
  for (const m of txt.matchAll(/(G8取证\d+号|G9素材[^\s,，。)]*)/g)) add("title", m[1], "按命名前缀可反查的测试数据", f);
  for (const m of txt.matchAll(/uploads?\/([\w.-]+\.(?:png|jpg|jpeg|webp|gif))/gi)) add("upload", m[1], "G9 素材环落盘的文件名", f);
  /* 兜底：凡出现在 `id=` 总账里、却没能被上面任何分类收走的，一律以 id-unclassified 入册。
     没有这一步，"守恒"就只是"写下来的等于我解析到的"，而我解析到什么是由正则决定的——
     那正是最容易漏数又最难发现的错法（本轮实测：userId=100151 因大小写/词边界躲过了分类正则）。 */
  for (const m of txt.matchAll(/\bid=(\d+)|Id=(\d+)/g)) {
    const id = m[1] || m[2];
    if (id && !rows.some((r) => r.key === id)) add("id-unclassified", id, "只在 `id=` 总账里出现，上下文未能归类", f);
  }
}
const rawIds = new Set();
for (const f of logs) {
  const txt = readFileSync(join(SRC, f), "utf8");
  for (const m of txt.matchAll(/\bid=(\d+)|Id=(\d+)/g)) rawIds.add(m[1] || m[2]);
}
const idRows = rows.filter((r) => r.kind !== "title" && r.kind !== "upload");
const missing = [...rawIds].filter((x) => !idRows.some((r) => r.key === x));
const conserved = rows.length > 0 && !missing.length;

/* 累积台账：取证日志每轮 G8 都会被覆盖，只从日志派生的清单因此是"会失忆的清单"。
   本轮实测就是这种失忆——终报里写着的 posts.id=270 / comments.id=1238 / campus_topics.id=299 /
   campus_replies.id=31 在现在的 g8-rings.txt 里已经找不到了（被后一次 G8 覆盖），
   所以清单必须落到一份**只增不换**的 JSON 台账里，并允许从报告文字里回捞历史指纹。 */
const LEDGER = resolve(REPO, arg("ledger", "reports/audit/real-e2e/test-data-ledger.json"));
const led = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : { entries: [] };
const before = led.entries.length;
const known = new Set(led.entries.map((e) => e.kind + "|" + e.key));
for (const r of rows) if (!known.has(r.kind + "|" + r.key)) led.entries.push({ ...r, firstSeen: new Date().toISOString() });
for (const mf of String(arg("from-md", "")).split(",").filter(Boolean)) {
  const f = resolve(REPO, mf);
  if (!existsSync(f)) { console.log("TDI_WARN --from-md 不存在 " + mf); continue; }
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/(posts|comments|campus_topics|campus_replies|users)\.id\s*=\s*(\d+)/g)) {
    const sig = m[1] + "|" + m[2];
    if (known.has(sig) || led.entries.some((e) => e.kind + "|" + e.key === sig)) continue;
    led.entries.push({ kind: m[1], key: m[2], note: "只在报告文字里出现（原始取证日志已被后一次 G8 覆盖，不可机器复核）", file: mf, firstSeen: new Date().toISOString(), weak: true });
  }
}
writeFileSync(LEDGER, JSON.stringify({ updatedAt: new Date().toISOString(), entries: led.entries }, null, 1));
const weakOnly = led.entries.filter((e) => e.weak);

writeFileSync(OUT_MD, [
  "# 遗留测试数据清单（G8/G9 写进真实库的行）",
  "",
  "- 来源：" + logs.map((f) => "`reports/audit/real-e2e/" + f + "`（mtime " + statSync(join(SRC, f)).mtime.toISOString() + "）").join("、"),
  "- 处置口径：**保留**（④ 的可辩护默认）。理由：这些行是本轮判据的证据本体，删掉即把已成立的结论改成不可复查。",
  "- " + (conserved ? "守恒：日志里去重主键 " + rawIds.size + " 个，全部入册（分类 " + idRows.length + " 条含兜底），无「部分收录」。" : "守恒失败：日志里有 " + rawIds.size + " 个去重主键，未入册的 = " + (missing.join(",") || "?") + "——清单不完整时不得当已处置。"),
  "- ⚠ 分类为 `id-unclassified` 的行表示日志上下文里认不出它属于哪张表；**它们同样不许进删除脚本**，只能人工对过 schema 再定。",
  "- ⚠ 取证日志会被下一轮 G8 覆盖（本目录只有 " + logs.length + " 份），所以这份清单必须在每次 G8 之后重跑生成。",
  "",
  "| 类型 | 指纹 | 依据 | 来源文件 |",
  "|---|---|---|---|",
  ...rows.map((r) => "| " + r.kind + " | `" + r.key + "` | " + r.note + " | " + r.file + " |"),
  "",
  "要清理时按 `test-data-cleanup.sql` 走：默认 BEGIN/ROLLBACK 演练，确认影响行数后才允许显式改成提交。",
  "",
  "## 累积台账（跨轮只增不换）",
  "",
  `- 台账文件 \`test-data-ledger.json\`：本轮之前 ${before} 条 → 现在 ${led.entries.length} 条（新增 ${led.entries.length - before}）。`,
  `- 其中 ${weakOnly.length} 条是**弱指纹**：只在报告文字里出现，原始取证日志已被后一次 G8 覆盖，机器不可复核 ⇒ 这些行不许进删除脚本，只能作为"库里可能有"的提示。`,
  "",
  "| 类型 | 主键 | 强度 | 首次入册 | 依据 |",
  "|---|---|---|---|---|",
  ...led.entries.map((e) => "| " + e.kind + " | `" + e.key + "` | " + (e.weak ? "弱（报告文字）" : "强（取证日志）") + " | " + String(e.firstSeen).slice(0, 10) + " | " + String(e.note).slice(0, 70) + " |"),
  "",
].join("\n"));
console.log("TDI_ROWS=" + rows.length + " 台账=" + led.entries.length + "（新增 " + (led.entries.length - before) + "，弱指纹 " + weakOnly.length + "）");

if (flag("emit-sql")) {
  const APPLY = flag("apply");
  const bak = arg("backup", "");
  if (APPLY && (!bak || !existsSync(resolve(REPO, bak)))) {
    console.log("TDI_RESULT=FAIL reason=--apply 必须配 --backup <已存在的备份文件>；没有备份就不生成可提交的删除脚本");
    process.exit(2);
  }
  /* 表名一律不猜：日志给的是 HTTP 路径（admin/village-posts/236），不是库表名；
     JPA 实体到表的映射由命名策略派生，本脚本没有读 schema 的权限。
     所以这里只生成"必须人工填表名才可执行"的骨架——填不出来就是删不了，
     这正是默认「保留」应有的样子：清理需要一个人都对不上号时删不掉的门槛。 */
  const byKind = {};
  /* 删除骨架只用**跨轮累积台账里的强指纹**：弱指纹（只在报告文字里出现、日志已被覆盖）
     连"它到底是哪张表"都没法复核，写进 DELETE 就是拿猜 measured 当真。 */
  for (const r of led.entries) {
    if (r.weak || r.kind === "title" || r.kind === "upload") continue;
    (byKind[r.kind] = byKind[r.kind] || new Set()).add(r.key);
  }
  const idKinds = Object.keys(byKind);
  const sql = [
    "-- G8/G9 遗留测试数据：清理骨架。默认且仅默认是演练，不生成可执行 DELETE。",
    "-- 生成时间 " + new Date().toISOString() + "；来源清单 test-data-inventory.md",
    "-- 表名未确认：日志里只有 HTTP 路径，没有库表名。填 <TABLE:...> 之前本文件不可执行。",
    "",
    "START TRANSACTION;",
    ...idKinds.map((k) => {
      const keys = [...byKind[k]].filter((x) => /^\d+$/.test(x));
      return "-- 类型 " + k + "（" + (keys.length || byKind[k].size) + " 个主键：" + [...byKind[k]].join(",").slice(0, 120) + "）\n"
        + "-- DELETE FROM <TABLE:" + k + "> WHERE id IN (" + (keys.join(",") || "?") + ");";
    }),
    "-- 标题/上传指纹（人工核对用，不进 DELETE）：" + (led.entries.filter((e) => e.kind === "title" || e.kind === "upload").map((e) => e.key).join(" / ") || "无"),
    "-- 弱指纹（只在报告文字里、日志已覆盖，不许进 DELETE）：" + (weakOnly.map((e) => e.kind + "." + e.key).join(" / ") || "无"),
    APPLY ? "-- --apply 已给出，但表名未确认 ⇒ 仍然只写 ROLLBACK；要提交请先补 schema 依据。" : "",
    "ROLLBACK; -- 影响行数与清单逐条一致，且 <TABLE:...> 已由实名替换，才允许改成提交",
    "",
  ].join("\n");
  writeFileSync(OUT_SQL, sql);
  console.log("TDI_SQL=" + OUT_SQL.replace(REPO.split("\\").join("/") + "/") + " 模式=ROLLBACK 演练（表名未确认，不产出可执行 DELETE）");
}
console.log("TDI_RESULT=" + (conserved ? "OK" : "FAIL（0 指纹，不作「已处置」记账）"));
process.exit(conserved ? 0 : 2);
