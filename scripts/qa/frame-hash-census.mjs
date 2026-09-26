/* 帧的内容级去重体检：把执行轮引用的每一帧做 sha256，看"字节相同"的帧有多少。
 *
 * 为什么单独做：§14 的成本普查里 screenshot 单价是我从旧计时里取的常数（2.6 s），
 * 而这一轮实测每条约 10 s ⇒ 截图才是决定整轮时长的量；要省它只能"同内容只留一张"。
 * 但去重键必须是**内容**，不是"页 + 状态名"（§15 已量过：同页同态的 12 帧只有 2 个 hash，
 * 而按标题状态去重只能省 1%）。这个脚本给出可以直接抄进策略的两个数：
 *   ① 按内容去重能省多少帧；② 省下来的组里，是否有"跨状态标签"的相同内容
 *      （如果有，说明状态标签本身不可信，用它当复用键会把两个不同态并成一张）。
 *
 * 用法：node scripts/qa/frame-hash-census.mjs [--results <f>] [--min 20]
 */
import { readFileSync, existsSync, createReadStream } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const RESULTS = opt("results", join(REPO, "reports/audit/round-7/interact/exec-results.json"));

const sha = (p) => new Promise((res) => {
  const h = crypto.createHash("sha256");
  createReadStream(p).on("data", (c) => h.update(c)).on("end", () => res(h.digest("hex").slice(0, 16)));
});

const j = JSON.parse(readFileSync(RESULTS, "utf8"));
const rows = (j.results || []).filter((r) => r.status === "EXECUTED" && r.evidence);
const parsed = [];
for (const r of rows) {
  const m = /^([^(]+)\((\d+)B\)/.exec(String(r.evidence).trim());
  if (!m) { console.log("FH_UNPARSED_EVIDENCE " + r.manifest + "/" + r.id + " :: " + String(r.evidence).slice(0, 60)); continue; }
  parsed.push({ id: r.manifest + "/" + r.id, page: r.page, path: join(REPO, m[1]), size: Number(m[2]), title: String(r.title || "").slice(0, 40) });
}
const missing = parsed.filter((p) => !existsSync(p.path));
const have = parsed.filter((p) => existsSync(p.path));
for (const p of have) p.hash = await sha(p.path);

const byHash = new Map();
for (const p of have) {
  if (!byHash.has(p.hash)) byHash.set(p.hash, []);
  byHash.get(p.hash).push(p);
}
const groups = [...byHash.values()].sort((a, b) => b.length - a.length);
const dupGroups = groups.filter((g) => g.length > 1);
const saved = have.length - groups.length;
console.log("FH_ROWS_WITH_EVIDENCE=" + rows.length + " 解析出路径=" + parsed.length + " 文件存在=" + have.length + " 文件缺失=" + missing.length);
missing.slice(0, 5).forEach((p) => console.log("  FH_MISSING " + p.id + " :: " + relative(REPO, p.path)));
console.log("FH_HASH_UNIQUE=" + groups.length + " FH_DUPEABLE=" + saved + " 占比=" + (have.length ? (saved * 100 / have.length).toFixed(0) : 0) + "% 重复组=" + dupGroups.length);
/* 关键判据：重复组里有多少组跨了两个不同的页——跨页相同意味着"这一帧其实属于另一页"
   （取景时机不对/弹层没挂上），那不是可省的重复，那是取证缺陷 */
let crossPage = 0, crossPageSamples = [];
for (const g of dupGroups) {
  const pages = new Set(g.map((p) => p.page));
  if (pages.size > 1) { crossPage++; if (crossPageSamples.length < 4) crossPageSamples.push(g[0].hash + " :: " + g.map((p) => p.page).join(" | ")); }
}
console.log("FH_DUP_GROUPS_CROSS_PAGE=" + crossPage + (crossPage ? "（这些不是「能省的重复」，是帧挂错页的嫌疑）" : ""));
crossPageSamples.forEach((s) => console.log("  FH_CROSS_PAGE " + s));
for (const g of dupGroups.slice(0, 4)) {
  console.log("  FH_GROUP " + g[0].hash + " x" + g.length + " page=" + g[0].page + " 例：" + g.slice(0, 4).map((p) => p.id).join(", "));
}
console.log(saved > 0
  ? "FH_RESULT=可用：按内容 hash 去重可少留 " + saved + " 张；复用键只能用 hash，不能用页+状态名（§15 实测省 1%）"
  : "FH_RESULT=无重复可省：本轮每帧内容都不同 ⇒ " + have.length + " 张都得留，截图成本没法靠去重降");
