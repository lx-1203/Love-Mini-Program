/* 静态门禁：凡是自称支持 --dry 的脚本，不许在 dry 路径上抢设备租约 / 占端口 / 写迁移。
   为什么必须有：本轮两次"只是跑个预览"把正在执行的腿打掉（一次 15 条腿 NOT_RUN），
   两次都是同一个形状——工具先 acquireUi/guardUiLease，后面才看 --dry。
   这不是靠"下次小心"防住的，得有一个不认识人、只看文件内字节序的门。
   用法：node scripts/qa/verify-dry-no-lease.mjs [--dir scripts/qa] [--allow a.mjs,b.mjs] [--selftest] */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const KNOWN = new Set(["dir", "allow", "selftest"]);
for (const a of argv) {
  if (!a.startsWith("--")) continue;
  if (!KNOWN.has(a.slice(2))) { console.log("DRYLEASE_RESULT=FAIL reason=不认识的旗标 " + a + "（拼错一个字母就会被当成没传 ⇒ 拒跑）"); process.exit(2); }
}

/* "支持 dry" 的几种写法都要认：本轮两个肇事工具一个写 argv.includes("--dry")、一个写 has("dry")。 */
const DRY_RE = /["']--dry["']|hasFlag\(\s*["']dry["']\s*\)|flag\(\s*["']dry["']\s*\)|has\(\s*["']dry["']\s*\)/;
/* 会打掉别人的动作：抢设备租约、占端口、写库迁移。 */
const TAKE_RE = /acquireUi\s*\(|guardUiLease\s*\(|createServer\s*\(|writeFileSync\s*\([^)]{0,60}migrations/i;

/* 找"这一行提到 dry，且紧跟的几行里就 exit/return"的字节偏移；找不到返回 -1，
   当作"没有早退点"也判 RISK —— 只印一句就继续往下跑、顺手抢租约的 --dry 是最危险的形态。 */
function dryBailOffset(src) {
  const lines = src.split(/\r?\n/);
  let off = 0;
  for (let i = 0; i < lines.length; i++) {
    /* 早退点宽松认：很多工具是 `const DRY = has("dry")` 之后再 `if (DRY) { ... process.exit(0) }`，
       那一行里没有引号版本——只按带引号的写法找就会把已修好的工具误报成 RISK（现量误报过两个）。 */
    if (/\bdry\b/i.test(lines[i])) {
      const near = lines.slice(i, i + 4).join("\n");
      if (/\bprocess\.exit\s*\(/.test(near) || /\breturn\b/.test(near)) return off;
    }
    off += lines[i].length + 1;
  }
  return -1;
}

/* 纯函数：文件名 + 源码 ⇒ 判定。
   规则不是"谁在谁前面"（那种顺序判断会把写在 `if (dry) {…} else { acquireUi() }` 里的**正确**写法误报，
   现量就误报过两个已修好的工具），而是**可达性看得见的守卫**：
   每一处抢租约/占端口/写迁移的调用，上下 14 行内必须出现 dry 或显式跳过开关（QA_SKIP_UI_LEASE），
   否则就是"无条件抢设备"——这正是本轮打掉 15 条腿的那个形状。 */
export function auditOne(name, src) {
  if (!DRY_RE.test(src)) return { name, verdict: "no-dry", note: "不支持 --dry ⇒ 不在射程内（有租约也合法）" };
  const lines = src.split(/\r?\n/);
  /* 注释里出现 acquireUi() 不算调用（现量误报两次：shoot-frameplan 的修复说明写在块注释里，
     第二版的"只抹行首注释"没盖住续行）。这里按块注释状态机把注释整体抹成空内容，行号保持不变。
     整行 // 注释才剥，避免把 "http://…" 这类字符串里的双斜杠当注释吃掉。 */
  let inBlock = false;
  const code = lines.map((raw) => {
    let s = raw;
    if (inBlock) {
      const e = s.indexOf("*/");
      if (e < 0) return "";
      inBlock = false;
      s = s.slice(e + 2);
    }
    for (;;) {
      const st = s.indexOf("/*");
      if (st < 0) break;
      const en = s.indexOf("*/", st + 2);
      if (en < 0) { inBlock = true; s = s.slice(0, st); break; }
      s = s.slice(0, st) + s.slice(en + 2);
    }
    if (/^\s*\/\//.test(s)) return "";
    return s;
  });
  /* 第一个"dry 早退点"的行号：某行提到 dry，且它自己或随后 3 行里就 exit/return。 */
  let firstBail = -1;
  for (let j = 0; j < code.length; j++) {
    if (!/\bdry\b/i.test(code[j])) continue;
    if (/\bprocess\.exit\s*\(|\breturn\b/.test(code.slice(j, j + 4).join("\n"))) { firstBail = j; break; }
  }
  const bad = [];
  let takes = 0;
  for (let i = 0; i < code.length; i++) {
    if (!TAKE_RE.test(code[i])) continue;
    takes++;
    const nearTop = code.slice(Math.max(0, i - 4), i + 1).join("\n");
    /* 两种"看得见的不执行"任选其一即算安全：
       ① take 之前就有 dry 早退点（老写法：预览分支直接退出）；
       ② take 自己就写在 dry/跳过开关的 else 分支里（本轮两个已修工具的真实形状）。 */
    const bailed = firstBail >= 0 && firstBail < i;
    const inElse = /(QA_SKIP_UI_LEASE|dry)/i.test(nearTop) && /}\s*else\s*\{|else\s+if|elif/i.test(nearTop);
    if (!bailed && !inElse) bad.push("第 " + (i + 1) + " 行的抢设备动作没有可见守卫（既不在 dry 早退之后也不在 dry/跳过开关的 else 分支里）：" + lines[i].trim().slice(0, 90));
  }
  if (!takes) return { name, verdict: "clean", note: "有 dry，但没有租约/端口/迁移写入动作" };
  if (bad.length) return { name, verdict: "RISK", note: bad.join("；") };
  return { name, verdict: "clean", note: takes + " 处抢设备动作全部处在 dry/跳过守卫的可见范围内" };
}

if (argv.includes("--selftest")) {
  const S = {
    bad: 'if (argv.includes("--dry")) console.log("预览");\nconst l = guardUiLease({ owner: "x" });\nrun();\n',
    good: 'if (argv.includes("--dry")) { console.log("预览"); process.exit(0); }\nconst l = acquireUi({ owner: "x" });\n',
    noTake: 'if (flag("dry")) return;\nconsole.log("只看不动");\n',
    noDry: 'const l = guardUiLease({ owner: "y" });\nrun();\n',
    noBail: 'const l = acquireUi({ owner: "z" });\nif (argv.includes("--dry")) console.log("只印不退出");\n',
  };
  const cases = [
    { n: "先抢租约、dry 在后面才判 ⇒ 必须 RISK（本轮真实形状）", got: auditOne("bad.mjs", S.bad).verdict === "RISK" },
    { n: "dry 早退在前、租约在后 ⇒ clean", got: auditOne("good.mjs", S.good).verdict === "clean" },
    { n: "有 dry 且不碰租约/端口/迁移 ⇒ clean", got: auditOne("noTake.mjs", S.noTake).verdict === "clean" },
    { n: "不支持 dry 的工具不在射程内", got: auditOne("noDry.mjs", S.noDry).verdict === "no-dry" },
    { n: "有 dry 却没有早退点 ⇒ 也算 RISK（只印不退出照样抢）", got: auditOne("noBail.mjs", S.noBail).verdict === "RISK" },
  ];
  const bad = cases.filter((c) => !c.got);
  for (const c of cases) console.log((c.got ? "  ok " : "  BAD") + c.n);
  console.log("DRYLEASE_SELFTEST=" + (bad.length ? "FAIL" : "PASS") + " cases=" + cases.length + " bad=" + bad.length);
  process.exit(bad.length ? 1 : 0);
}

const DIR = arg("dir", "scripts/qa");
const allow = new Set(String(arg("allow", "")).split(",").map((x) => x.trim()).filter(Boolean));
const dirAbs = resolve(REPO, DIR);
if (!existsSync(dirAbs)) { console.log("DRYLEASE_RESULT=FAIL reason=找不到目录 " + DIR + "（一个文件都没扫到不能算过）"); process.exit(2); }
const files = readdirSync(dirAbs).filter((f) => /\.(mjs|cjs|js)$/.test(f)).sort();
if (!files.length) { console.log("DRYLEASE_RESULT=FAIL reason=" + DIR + " 里没扫到任何脚本"); process.exit(2); }
const rows = files.map((f) => auditOne(f, readFileSync(join(dirAbs, f), "utf8")));
const counts = {};
for (const r of rows) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
const risky = rows.filter((r) => r.verdict === "RISK");
console.log("DRYLEASE 扫描=" + files.length + " " + Object.entries(counts).sort().map(([k, v]) => k + "=" + v).join(" ") + " 显式放行=" + allow.size);
for (const r of risky) console.log((allow.has(r.name) ? "  ALLOWED " : "  RISK ") + r.name + " :: " + r.note);
const unallowed = risky.filter((r) => !allow.has(r.name));
if (unallowed.length) { console.log("DRYLEASE_RESULT=FAIL reason=" + unallowed.length + " 个自称支持 --dry 的脚本会在 dry 路径上抢租约/写共享状态（确属安全的用 --allow 点名并写清为什么）"); process.exit(2); }
console.log("DRYLEASE_RESULT=OK" + (risky.length ? "（" + risky.length + " 条走显式 --allow，已点名）" : " —— 没有 dry 抢设备的路径"));
