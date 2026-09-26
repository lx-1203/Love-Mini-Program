/* evidenceVerdict 回归测试：钉住"不存在的文件不得当证据"这条取证洞的修补。
   round-6 的原始失效形态是：截图调用抛错（timeout waiting for automator response）之后，
   执行员仍然把那个根本没落盘的路径写进 evidence[]，后面又给它补了 `(ERROR:…)` 尾注，
   于是权威件里出现 289 条"看着像证据、其实盘上没有"的串，通过率被虚高到无法复核。
   本测试不看退出码、不看代码有没有，只看真函数对真输入给真回答。 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(REPO, "scripts", "qa", "r-exec.cjs"), "utf8");
const a = SRC.indexOf("function evidenceVerdict");
const b = SRC.indexOf("\n}", a);
if (a < 0 || b < 0) { console.log("EVT_TEST=FAIL reason=取不到 evidenceVerdict"); process.exit(2); }
const evidenceVerdict = new Function("fs", "path", "return (" + SRC.slice(a, b + 2) + ")")(fs, path);

/* 找一张真帧当正例 */
const SHOTDIR = path.join(REPO, "reports", "screenshots", "round-6-interact");
let realPng = null;
for (const f of fs.readdirSync(SHOTDIR)) {
  if (!/\.png$/i.test(f)) continue;
  const p = path.join(SHOTDIR, f);
  try { if (fs.statSync(p).size > 1000) { realPng = p; break; } } catch (e) { /* 下一个 */ }
}
if (!realPng) { console.log("EVT_TEST=FAIL reason=找不到任何真帧当正例，测试没有意义"); process.exit(2); }

/* 造一个 0 字节夹具（放 scratch，测完删） */
const zero = path.join(REPO, ".zcode", "tmp", "evidence-verdict-zero.png");
fs.writeFileSync(zero, Buffer.alloc(0));

const PHANTOM = path.join(SHOTDIR, "DOES-NOT-EXIST-CASE99-after.png");
const cases = [
  {
    name: "截图抛错 + 盘上确实没有 ⇒ 不得产出证据串（这就是当初漏进来的那 289 条）",
    shot: { path: PHANTOM, error: "timeout waiting for automator response" },
    want: { ok: false, hasEntry: false, missHas: ["未写出", "盘上存在=false"] },
  },
  {
    name: "截图抛错但文件居然在（上一例遗留）⇒ 仍不认，error 优先",
    shot: { path: realPng, error: "reconnect mid-shot" },
    want: { ok: false, hasEntry: false, missHas: ["未写出", "盘上存在=true"] },
  },
  { name: "路径不存在但没报错 ⇒ 不认", shot: { path: PHANTOM }, want: { ok: false, hasEntry: false, missHas: ["不可读"] } },
  { name: "写出 0 字节 ⇒ 不认", shot: { path: zero }, want: { ok: false, hasEntry: false, missHas: ["0 字节"] } },
  { name: "真帧在盘且非空 ⇒ 认，并带字节数", shot: { path: realPng }, want: { ok: true, hasEntry: true, entryHas: /\.png\(\d+B\)$/ } },
];

let fail = 0;
for (const c of cases) {
  const r = evidenceVerdict(c.shot) || {};
  const w = c.want;
  const problems = [];
  if (!!r.ok !== w.ok) problems.push("ok=" + r.ok + " 期望 " + w.ok);
  if (("entry" in r) !== !!w.hasEntry) problems.push("entry 在场=" + ("entry" in r) + " 期望 " + !!w.hasEntry);
  for (const s of (w.missHas || [])) if (String(r.miss || "").indexOf(s) < 0) problems.push("miss 缺片段 " + s);
  if (w.entryHas && !w.entryHas.test(String(r.entry || ""))) problems.push("entry 形态不符：" + r.entry);
  if (problems.length) fail++;
  console.log("EVT " + (problems.length ? "FAIL" : "OK  ") + " " + c.name + (problems.length ? " :: " + problems.join("；") : " :: " + JSON.stringify(r).slice(0, 110)));
}
try { fs.unlinkSync(zero); } catch (e) { /* scratch */ }

/* 接线检查：函数定义了不等于用上了。
   准确不变量不是"所有 evidence.push 都必须走 evidenceVerdict"，而是：
   每一条**文件路径**证据在 push 前必须被存在性+非空判定过——
   要么走 evidenceVerdict，要么在同一语句里自己 statSync 并按 size 分支
   （DOM 快照那条就是这么写的，而且它的失败原因「DOM 快照为空」比通用文案更准，不该为了统一而抹掉）；
   非文件型读数（noop 用的 scrollPos=）没有"盘上文件"可言，属豁免。
   三类之和必须等于 push 点总数，否则 FAIL：既拦得住"新加一个裸 push 路径"的回归，也不逼无意义重构。 */
const pushLines = SRC.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /evidence\.push\(/.test(l));
let viaFn = 0, inlineGuarded = 0, exempt = 0;
const bypass = [];
for (const [n, l] of pushLines) {
  if (/vb\.ok|va\.ok|va2\.ok|evidenceVerdict\(/.test(l)) viaFn++;
  else if (/statSync\(/.test(l) && /size|wsz/.test(l)) inlineGuarded++;
  else if (/scrollPos=/.test(l)) exempt++;
  else bypass.push(n);
}
console.log("EVT_WIRING push点=" + pushLines.length + " 走函数=" + viaFn + " 同句自查size=" + inlineGuarded + " 非文件豁免=" + exempt + " 绕过=" + (bypass.length ? bypass.join(",") : "0"));
if (viaFn + inlineGuarded + exempt !== pushLines.length || bypass.length) {
  fail++;
  console.log("EVT_FAIL 有文件路径证据未经存在性判定就进 evidence[]（行 " + bypass.join(",") + "）——这正是当初 289 条假证据的入口");
}

console.log("EVT_SUMMARY cases=" + cases.length + " fail=" + fail);
console.log("EVT_TEST=" + (fail ? "FAIL" : "PASS"));
process.exit(fail ? 2 : 0);
