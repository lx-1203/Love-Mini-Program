/**
 * 从三份只读重判产物（unverifiable-recheck-{1,2,3}.json）**逐字抄取**证据，
 * 生成 B-not-automatable 落盘计划。为什么不交给车道手写 why：
 * 本项目反复出现"把结论写成看起来像证据的散文"（undefined 落进台账格、假类名过闸），
 * 而这三份产物里每条已经带 note/citation/bandAxis（含 file:line 与机制），
 * 所以这里只做拼接与过滤，一个字都不改写、不补写。
 * 判据点名的东西不存在但需要产品决定的那 36 条 CRITERIA_NAMES_NOTHING **不进本计划**——那是拍板项。
 * bandAxis 未点名档位的 5 条 WRONG_BAND 也不进——"哪一档能表达"没证据就不许盖章。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const OPS = join(REPO, "reports/audit/round-6/ops");
const ROWS = [1, 2, 3].flatMap(i => JSON.parse(readFileSync(join(REPO, `reports/audit/round-7/unverifiable-recheck-${i}.json`), "utf8")).rows || []);

/* page → manifest slug（不带 .json）：按 cases[].page 真实匹配，绝不按文件名猜 */
const manifestByPage = new Map();
for (const f of readdirSync(OPS).filter(x => x.endsWith(".json"))) {
  const slug = basename(f, ".json");
  const j = JSON.parse(readFileSync(join(OPS, f), "utf8"));
  for (const c of j.cases || []) if (!manifestByPage.has(c.page)) manifestByPage.set(c.page, slug);
}

const LANDABLE = new Set(["COMPOSED_OR_SCOPED", "WRONG_BAND", "NO_ELEMENT_NO_FIX"]);
const named = (r) => {
  const v = String(r.bandAxis || "").trim();
  const hasBand = /pageWxmlExact|bandWxmlOther|pageWxmlText|otherFileToken/.test(v);
  return hasBand || !/not-named|^n\/a|^absent/.test(v);
};
const targets = ROWS.filter(r => LANDABLE.has(r.verdict));
const entries = [], held = [], orphan = [];
for (const r of targets) {
  const note = String(r.note || "").trim(), cit = String(r.citation || "").trim();
  const why = [`${r.verdict}｜档位口径=${String(r.bandAxis || "未记录").trim()}`, note, cit].filter(Boolean).join(" ‖ ");
  if (why.replace(/[^一-龥a-zA-Z]/g, "").length < 40) { held.push({ ...r, reason: "证据过薄" }); continue; }
  const slug = manifestByPage.get(r.page);
  if (!slug) { orphan.push({ ...r, reason: "ops 里找不到该 page 的 manifest" }); continue; }
  if (r.verdict === "WRONG_BAND" && !named(r)) { held.push({ ...r, reason: "WRONG_BAND 但未点名哪一档能表达" }); continue; }
  entries.push({ manifest: slug, id: r.id, why });
}

/* 同 manifest 同 id 去重（三刀之间理论上不重叠，重叠就是产物本身有问题，必须显式报出来） */
const seen = new Set(), plan = [];
let dup = 0;
for (const e of entries) { const k = `${e.manifest}#${e.id}`; if (seen.has(k)) { dup++; continue; } seen.add(k); plan.push(e); }

const out = {
  "$comment": "round-8：把三刀只读重判里已点名机制/档位的行落成 B-not-automatable 标记。why 全部逐字抄自 unverifiable-recheck-{1,2,3}.json 的 verdict/bandAxis/note/citation，无任何改写或补写；CRITERIA_NAMES_NOTHING 与未点名档位的 WRONG_BAND 不进本计划（前者是拍板项，后者证据不足）。",
  "$source": "reports/audit/round-7/unverifiable-recheck-1.json / -2 / -3（已复制进 reports，脱离 tmp）",
  "$generatedBy": "scripts/qa/emit-round8-unverifiable-plan.mjs",
  "B-not-automatable": plan,
};
writeFileSync(join(REPO, "scripts/qa/cellplan-round8-unverifiable.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`候选 ${targets.length} 行 → 进计划 ${plan.length} 条｜暂扣 ${held.length}（未点名档位/过薄）｜找不到 manifest ${orphan.length}｜重复 ${dup}`);
if (held.length) console.log("暂扣清单:", held.map(h => `${h.verdict}:${h.id}@${h.page}`).join(" "));
if (orphan.length) console.log("无 manifest:", orphan.map(o => `${o.id}@${o.page}`).join(" "));
const bySlug = {};
for (const p of plan) bySlug[p.manifest] = (bySlug[p.manifest] || 0) + 1;
console.log("涉及 manifest 份数=" + Object.keys(bySlug).length, "最多的一份=" + Object.entries(bySlug).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(" "));
