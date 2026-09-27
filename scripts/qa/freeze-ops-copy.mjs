#!/usr/bin/env node
/* 把某一轮的**计划清单**冻结一份拷贝给下一轮，并写下出处。
 *
 * 为什么不是直接指过去：round-7 的两刀用的就是 round-6/ops 里那 45 份计划（1107 例），
 * 而 verify-state-truth / emit-round-report 的前置体检都要求"本轮目录下有 ops/"。
 * 两种解法：① 让门禁别说实话（把必需源检查关掉）；② 冻结一份带校验和的拷贝，
 * 并写明"拷自哪一版、每个文件的 sha256"。选 ②——计划本来就该按轮冻结，
 * 指向一个还能被改的目录等于让"被测计划"跟着结论一起漂。
 *
 * 用法：node scripts/qa/freeze-ops-copy.mjs --from reports/audit/round-6/ops --to reports/audit/round-7/ops [--check-only]
 * 退出码：0=写出（或 --check-only 且逐文件校验和一致）；2=拒写/校验不过。 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, renameSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, basename } from "node:path";

/* Windows 上写/拷一个刚被别的进程读过的文件会撞 sharing violation（errno -4094）：
   先落同目录临时文件再 rename（同目录 rename 是原子替换），并带 5 次退避重试。 */
function retryIo(what, fn) {
  let last = null;
  for (let i = 0; i < 5; i++) {
    try { fn(); return; }
    catch (e) { last = e; const until = Date.now() + 200 * (i + 1); while (Date.now() < until) { /* 同步退避：这脚本本来就是同步跑的 */ } }
  }
  console.log("FREEZEOPS_IOFAIL " + what + " ⇒ 重试 5 次仍失败：" + String(last && last.message).slice(0, 140));
  throw last;
}
function writeRobust(to, text) {
  const tmp = to + "." + process.pid + ".tmp";
  retryIo("write " + to, () => { writeFileSync(tmp, text); try { renameSync(tmp, to); } catch (e) { unlinkSync(tmp); throw e; } });
}
function copyRobust(from, to) {
  const tmp = to + "." + process.pid + ".tmp";
  retryIo("copy " + to, () => { copyFileSync(from, tmp); try { renameSync(tmp, to); } catch (e) { try { unlinkSync(tmp); } catch (e2) { /* 留着临时文件比改错判决好 */ } throw e; } });
}

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CHECK_ONLY = process.argv.includes("--check-only");
const FROM = resolve(REPO, arg("from", "reports/audit/round-6/ops"));
const TO = resolve(REPO, arg("to", "reports/audit/round-7/ops"));
if (!existsSync(FROM)) { console.log("FREEZEOPS_RESULT=FAIL reason=源目录不存在 " + FROM); process.exit(2); }
const src = readdirSync(FROM).filter((f) => f.endsWith(".json")).sort();
if (!src.length) { console.log("FREEZEOPS_RESULT=FAIL reason=源目录里没有 .json（空计划集不得冻结）"); process.exit(2); }
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);
const files = src.map((f) => ({ name: f, bytes: readFileSync(join(FROM, f)).length, sha256_16: sha(join(FROM, f)) }));
let totalCases = 0;
for (const f of src) { try { const j = JSON.parse(readFileSync(join(FROM, f), "utf8")); totalCases += (j.cases || j.ops || []).length; } catch (e) { console.log("FREEZEOPS_RESULT=FAIL reason=" + f + " 解析失败：" + String(e.message).slice(0, 60)); process.exit(2); } }

if (CHECK_ONLY) {
  const bad = files.filter((x) => !existsSync(join(TO, x.name)) || sha(join(TO, x.name)) !== x.sha256_16);
  console.log("FREEZEOPS_CHECK files=" + files.length + " 不一致/缺失=" + bad.length + (bad.length ? " → " + bad.slice(0, 6).map((x) => x.name).join(" ") : ""));
  process.exit(bad.length ? 2 : 0);
}
mkdirSync(TO, { recursive: true });
for (const f of src) copyRobust(join(FROM, f), join(TO, f));
const after = files.filter((x) => sha(join(TO, x.name)) !== x.sha256_16);
if (after.length) { console.log("FREEZEOPS_RESULT=FAIL reason=拷贝后 " + after.length + " 个文件校验和不一致，不写出处文件"); process.exit(2); }
/* 出处文件必须放在 ops/ **外面**：ops 目录是按"每个 .json 都是一份用例计划"来扫的，
   把元数据塞进去会被当成一份空计划（实测 QUEUE_BAD_MANIFEST PROVENANCE: 无 cases[] ⇒ 整轮判红）。 */
writeRobust(join(TO, "..", basename(TO) + "-provenance.json"), JSON.stringify({
  frozenFrom: (FROM + "").split("\\").join("/").replace(REPO.split("\\").join("/") + "/", ""), frozenAt: new Date().toISOString(),
  note: "本轮沿用上一轮的 1107 例计划；这里是**冻结拷贝**而不是活引用，逐文件 sha256 见 files[]。PROVENANCE.json 自身不在 files[] 里。",
  planFiles: files.length, totalCases, files,
}, null, 1));
console.log("FREEZEOPS_COPIED=" + files.length + " 用例合计=" + totalCases + " 目标=" + (TO + "").split("\\").join("/").replace(REPO.split("\\").join("/") + "/", ""));
console.log("FREEZEOPS_RESULT=OK 校验和全部一致，出处写入 PROVENANCE.json");
