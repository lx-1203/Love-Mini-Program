/**
 * 配对语言包批量落键（zh-CN / en-US 同批，本仓规则：配对文件不开例外）。
 *
 * 为什么要有它：register+login lane 删掉登录页内联注册模式之后，9 个键失去消费方，
 * `verify-i18n-orphan.mjs` 从 PASS 转 FAIL（孤儿 1266 > 棘轮 1257）。这种红必须由
 * **同一批** locale 改动消掉；手改 22 处（2 文件 × 11 键）迟早漏一个，而漏一个就是单边键。
 *
 * 三条硬规矩：
 *  1. **删之前先数消费方**：全 `apps/client/src` 检索 `t("ns.key")` / `t('ns.key')` / 裸 `ns.key` 字面量，
 *     命中数 > 0 就拒绝删（宁可留孤儿键让门禁继续红，也不静默摘掉还在用的键）。
 *  2. 配对存在性：每个动作的键必须**两边都能定位**（zh 是 `"key":`、en 是 `key:` 两种实测形状），
 *     任一侧定位不到就整批不写（不留下单边改动）。
 *  3. 守恒：报告的"改动数 = 删除数 + 改值数"，且两文件的改动键集合必须逐字相同，否则不写盘。
 * 用法：node scripts/qa/land-locale-batch.mjs --plan .zcode/tmp/round7/locale-plan.json [--apply]
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ZH = "apps/client/src/i18n/locales/zh-CN.ts";
const EN = "apps/client/src/i18n/locales/en-US.ts";
const APPLY = process.argv.includes("--apply");
const planPath = (() => { const i = process.argv.indexOf("--plan"); return i >= 0 ? resolve(process.argv[i + 1]) : ""; })();
const rel = (p) => relative(REPO, p).split(sep).join("/");
if (!planPath || !existsSync(planPath)) { console.log("LOCALE_RESULT=FAIL reason=缺 --plan 或文件不存在"); process.exit(2); }
const plan = JSON.parse(readFileSync(planPath, "utf8"));
const DEL = plan.deleteKeys || [], SET = plan.setValueKeys || [];
if (!DEL.length && !SET.length) { console.log("LOCALE_RESULT=FAIL reason=计划为空（没东西可落却报绿是不允许的）"); process.exit(2); }

/* 消费方检索：扫全部 src 下的 .vue/.ts（跳过语言包自身与 .mimosa 缓存） */
const srcRoot = join(REPO, "apps/client", "src");
const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n); let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (n === ".mimosa" || n === "node_modules" || n === "i18n") continue; walk(p); }
    else if (/\.(vue|ts)$/.test(n)) files.push(p);
  }
})(srcRoot);
const blob = files.map((f) => ({ f: rel(f), t: readFileSync(f, "utf8") }));
function consumers(key) {
  const hits = [];
  for (const { f, t } of blob) {
    if (/(locales\/zh-CN|locales\/en-US)\.ts$/.test(f)) continue;
    const re = new RegExp("[\"'`]" + key.replace(/\./g, "\\.") + "[\"'`]|\\b" + key.replace(/\./g, "\\.") + "\\b", "g");
    const n = (t.match(re) || []).length;
    if (n) hits.push(f + "×" + n);
  }
  return hits;
}

/** 在指定 block（如 `login`）里定位一行：zh 形状 "key": …，en 形状 key: …；返回行号（0-based）或 -1 */
function findLine(lines, block, key) {
  const start = lines.findIndex((l) => new RegExp("^\\s{2}\"?" + block + "\"?:\\s*\\{").test(l));
  if (start < 0) return -2;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s{2}\}/.test(lines[i])) break;
    const m = lines[i].match(/^\s{2,}"([A-Za-z0-9_]+)":|^\s{2,}([A-Za-z0-9_]+):/);
    const k = m && (m[1] || m[2]);
    if (k && k === key) return i;
  }
  return -1;
}
const bad = [];
const edits = { zh: {}, en: {} };
for (const item of DEL.concat(SET)) {
  const [block, key] = item.key.split(".");
  const li = findLine(readFileSync(join(REPO, ZH), "utf8").split(/\r?\n/), block, key);
  const lj = findLine(readFileSync(join(REPO, EN), "utf8").split(/\r?\n/), block, key);
  if (li < 0 || lj < 0) { bad.push(`${item.key} 定位失败（zh=${li} en=${lj}；-1=块内没这个键，-2=块本身没找到）`); continue; }
  if (DEL.includes(item)) {
    const c = consumers(item.key);
    if (c.length) { bad.push(`${item.key} 仍有 ${c.length} 处消费方：${c.slice(0, 3).join(", ")} ⇒ 不许删`); continue; }
  }
  edits.zh[item.key] = li; edits.en[item.key] = lj;
}
if (bad.length) { console.log(`LOCALE_RESULT=FAIL reason=${bad.length} 个键不过关，一个字都没写`); bad.forEach((b) => console.log("  BLOCKED " + b)); process.exit(1); }
const sameSet = Object.keys(edits.zh).sort().join(",") === Object.keys(edits.en).sort().join(",");
if (!sameSet) { console.log("LOCALE_RESULT=FAIL reason=两文件的可改键集合不一致（会变成单边键）"); process.exit(1); }

function applyFile(rel0, lineMap) {
  const p = join(REPO, rel0);
  const lines = readFileSync(p, "utf8").split(/\r?\n/);
  const idxs = Object.values(lineMap).sort((a, b) => b - a);
  for (const i of idxs) {
    const item = (DEL.find((d) => lineMap[d.key] === i) || SET.find((s) => lineMap[s.key] === i));
    if (DEL.includes(item)) lines.splice(i, 1);
    else {
      const line = lines[i];
      const isZh = /"\s*[A-Za-z0-9_]+\s*":/.test(line);
      lines[i] = isZh
        ? line.replace(/:\s*"(?:[^"\\]|\\.)*"\s*,?\s*$/, `: ${JSON.stringify(item.zh)},`).replace(/,(\s*)$/, ",")
        : line.replace(/:\s*"(?:[^"\\]|\\.)*"\s*,?\s*$/, `: ${JSON.stringify(item.en)},`);
      if (lines[i] === line) bad.push(item.key + " 改值正则没命中：" + line.slice(0, 60));
    }
  }
  return { p, out: lines.join("\n") };
}
const a = applyFile(ZH, edits.zh), b2 = applyFile(EN, edits.en);
if (bad.length) { console.log(`LOCALE_RESULT=FAIL reason=改值有 ${bad.length} 处没命中，不写盘`); bad.forEach((x) => console.log("  NOREPLACE " + x)); process.exit(1); }
console.log(`LOCALE_PLAN delete=${DEL.length} setValue=${SET.length} touched=${Object.keys(edits.zh).length} 两文件键集一致=${sameSet ? "yes" : "no"}`);
DEL.forEach((d) => console.log(`  DEL ${d.key}`));
SET.forEach((s) => console.log(`  SET ${s.key} zh=${JSON.stringify(s.zh)} en=${JSON.stringify(s.en)}`));
if (!APPLY) { console.log("LOCALE_RESULT=DRY 加 --apply 才写盘（写前自动备份 .pre-localebatch.bak）"); process.exit(0); }
for (const [src, txt] of [[ZH, a.out], [EN, b2.out]]) {
  const p = join(REPO, src);
  copyFileSync(p, p + ".pre-localebatch.bak");
  writeFileSync(p, txt);
  console.log(`LOCALE_WRITTEN=${src} backup=${src}.pre-localebatch.bak`);
}
console.log("LOCALE_RESULT=OK");
