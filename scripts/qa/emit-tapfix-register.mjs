#!/usr/bin/env node
/* 把 lane 判定为"点名不了"的交互判据汇成一份**有名字的欠项台账**。
   为什么必须有这份东西：缺口不写清"欠哪条载具"，下一轮就会有人把那 82 条
   重新读成"产品没做"（本轮 village 的锁屏就是这么被读成 33 条 EXECUTED 的）。
   分组按 needsCarrier 归一后的种类，而不是按页——页只是位置，欠的东西才是结论。
   用法：node scripts/qa/emit-tapfix-register.mjs */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const OPS = join(REPO, "reports/audit/round-6/ops");
const R7 = join(REPO, "reports/audit/round-7");
const CENSUS = join(R7, "tap-target-census.json");
const MERGED = join(R7, "tapfix-merged.json");

const walk = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/^tapfix-lane-.*\.json$/.test(e.name)) out.push(p);
  }
  return out;
};
const lanes = walk(join(R7, "tapfix-briefs"));
if (!lanes.length) { console.log("REGISTER_RESULT=FAIL reason=找不到任何 lane 文件（批次目录被清了？）"); process.exit(2); }

/* needsCarrier 是 lane 自己写的自然语言，同一件事有七八种写法；
   归一成有限的几类，才看得出"这 82 条其实只欠 4 种载具"。 */
const KINDS = [
  ["连续手势（swipe/drag/longpress/scroll）", /手势|swipe|drag|longpress|长按|拖动|滑动|滚动|下拉|scroll|touch|甩/],
  ["断言对象是文案/数值，不是可点物件", /文案|文本|数值|计数|字数|i18n|字符串|断言的是|扫描|普查|热区|不存在|无节点|absence/],
  ["需要特定夹具或账号状态", /夹具|fixture|账号|身份|状态|完善度|门槛|锁屏|开关|会员|后端|服务端/],
  ["原生层（系统弹窗 / actionSheet / 权限）", /原生|showModal|actionSheet|系统|权限|微信/],
];
const classify = (u) => {
  const t = String(u.needsCarrier || "") + " " + String(u.reason || "");
  const hit = KINDS.find(([, re]) => re.test(t));
  return hit ? hit[0] : "其它（lane 未归入上述四类）";
};

const unv = [];
const named = new Map();
for (const f of lanes) {
  const j = JSON.parse(readFileSync(f, "utf8"));
  for (const u of (j.unverifiable || [])) unv.push({ ...u, lane: j.lane, src: f.replace(R7 + "/", "").split("\\").join("/") });
  for (const c of (j.cases || [])) named.set(String(c.manifest).replace(/\.json$/, "") + "|" + c.id, c);
}

const merged = existsSync(MERGED) ? JSON.parse(readFileSync(MERGED, "utf8")) : { accepted: [] };
const opsCache = new Map();
const opsCase = (mf, id) => {
  const k = String(mf || "").replace(/\.json$/, "");
  if (!opsCache.has(k)) {
    const p = join(OPS, k + ".json");
    opsCache.set(k, existsSync(p) ? new Map((JSON.parse(readFileSync(p, "utf8")).cases || []).map((c) => [c.id, c])) : new Map());
  }
  return opsCache.get(k).get(id) || null;
};

const census = JSON.parse(readFileSync(CENSUS, "utf8"));
const censusMissing = new Set();
for (const p of (census.pages || [])) for (const m of (p.missing || [])) censusMissing.add(String(m.manifest).replace(/\.json$/, "") + "|" + m.id);

const unvKeys = new Set(unv.map((u) => String(u.manifest).replace(/\.json$/, "") + "|" + u.id));
const overlaps = [...unvKeys].filter((k) => named.has(k));
const stillMissing = [...censusMissing].filter((k) => !unvKeys.has(k) && !named.has(k));

const byKind = new Map();
for (const u of unv) { const k = classify(u); (byKind.get(k) || byKind.set(k, []).get(k)).push(u); }

const lines = [];
lines.push("# 交互判据点名欠项台账（round-7）");
lines.push("");
lines.push(`- 本轮开工前"含交互动词但没点名可点物件"的缺口：**${named.size + unv.length}** 条（普查当时记 281）；其中 **${named.size}** 条已补上真目标并落盘（合并器逐行核过源码），**${unv.length}** 条 lane 判定为点不了 ⇒ 记在下面。`);
lines.push(`- 守恒：${named.size} + ${unv.length} = ${named.size + unv.length}，应等于 281 → ${named.size + unv.length === 281 ? "yes" : "NO"}`);
lines.push(`- 复核口径（普查已按新判据重算）：当前仍"没点名"= ${censusMissing.size} 条；既不在已点名也不在欠项里的 = ${stillMissing.length} 条。`);
lines.push(`- 一份东西同时点名两件事就无效：同一 id 既被"补上"又被"欠项"的 = ${overlaps.length} 条。`);
lines.push("");
lines.push("## 按欠的载具分组（这才是结论：82 条其实只欠这么几样东西）");
lines.push("");
for (const [k, items] of byKind) {
  lines.push(`### ${k} — ${items.length} 条`);
  lines.push("");
  for (const u of items) {
    const oc = opsCase(u.manifest, u.id);
    lines.push(`- \`${u.manifest}|${u.id}\`（${u.lane}）：${String(u.reason || "").replace(/\s+/g, " ").slice(0, 150)}`);
    lines.push(`  - 欠的载具：${String(u.needsCarrier || "（lane 没写）").replace(/\s+/g, " ").slice(0, 140)}`);
    if (oc) lines.push(`  - 原判据现文（未改）：${String(oc.action || "").replace(/\s+/g, " ").slice(0, 130)}`);
  }
  lines.push("");
}
if (overlaps.length) { lines.push("## 自相矛盾（同一 id 既补了又欠）"); lines.push(""); overlaps.forEach((k) => lines.push("- " + k)); lines.push(""); }
if (stillMissing.length) { lines.push("## 无人认领（普查仍缺、既没补也没记欠项）"); lines.push(""); stillMissing.forEach((k) => lines.push("- " + k)); lines.push(""); }

writeFileSync(join(R7, "tapfix-unverifiable.md"), lines.join("\n") + "\n");
writeFileSync(join(R7, "tapfix-unverifiable.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  base: { gapBeforeWave: 281, named: named.size, unverifiable: unv.length, censusNowMissing: censusMissing.size },
  conservation: { namedPlusUnverifiable: named.size + unv.length, ok: named.size + unv.length === 281, overlaps: overlaps.length, unclaimed: stillMissing.length },
  byKind: [...byKind.entries()].map(([k, v]) => ({ kind: k, n: v.length, ids: v.map((x) => x.manifest + "|" + x.id) })),
  items: unv,
}, null, 1) + "\n");
console.log("REGISTER_NAMED=" + named.size + " UNVERIFIABLE=" + unv.length + " 合计=" + (named.size + unv.length) +
  " 守恒=" + (named.size + unv.length === 281 ? "yes" : "NO"));
console.log("REGISTER_KINDS " + [...byKind.entries()].map(([k, v]) => k + "=" + v.length).join(" | "));
console.log("REGISTER_CONFLICT 同一条既补又欠=" + overlaps.length + " 无人认领=" + stillMissing.length);
if (merged.accepted.length !== named.size) console.log("REGISTER_WARN 合并器采信=" + merged.accepted.length + " 与 lane 里的 cases=" + named.size + " 不等（落盘后可能又跑过一次修复，须核对）");
console.log("REGISTER_RESULT=" + (named.size + unv.length === 281 && !overlaps.length && !stillMissing.length ? "OK" : "CHECK") +
  " out=reports/audit/round-7/tapfix-unverifiable.md");
process.exit(named.size + unv.length === 281 && !stillMissing.length ? 0 : 2);
