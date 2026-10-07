/**
 * D1 全域 provenance 清算（v3.2 配套工具，只读，不改任何证据）。
 *
 * 为什么还要再写一个工具（verify-evidence-corpus.mjs 已经比对过 gitSha vs HEAD）：
 *  「等于 HEAD」只证明证据不旧于当前提交，它证明不了两件事——
 *   A. 证据是否**可能**由它所记的那次提交产出：帧的 mtime 早于所记提交的 committer date，
 *      那次提交当时还不存在，这张帧就不可能是它产出的（回填/伪造）。R1 的 305 帧是反方向的
 *      毛病：帧晚于所记提交、其间 apps/client/src 又新提交了 47 个文件 → 戳记过期。
 *      两种毛病用 HEAD 一个数都分不出来，必须逐帧按时间轴判。
 *   B. 下一轮的假证据从哪来：凡是往 manifest 里写 gitSha 的**生产者脚本**，必须运行时派生。
 *      scripts/qa/r1-exec.cjs 与 tmp/tour-R1.mjs 曾把 gitSha 写成字面量，这就是 R1 整批过期的
 *      根因；产物侧的事后扫描只能追认损失，抓不到还没跑的那一轮。
 *
 * 用法：node scripts/qa/verify-provenance-all.mjs [--samples N]
 * 退出码：0=PASS，1=存在伪造/过期/无戳/生产者硬编码，2=扫描集为空（宁可红着也不空过）。
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, relative, sep, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const rel = (p) => relative(repo, p).split(sep).join("/");
/* 帧路径解析（本轮实测出来的方言洞）：旧写法 `p.startsWith(repo) || p.startsWith("/") ? p : join(repo, p)`
   在 Windows 上只认反斜杠形态的 repo，于是「仓库相对+正斜杠」的规范写法走 join（对），
   但「盘符+正斜杠」的绝对写法两支都不命中，被 join 成「repo 前缀 + 反斜杠串」这种必然不存在的
   字符串 —— round-6-real-tour 的 18 帧 + smoke 2 帧就是这样被误判成 PROV_FRAMES_UNRESOLVABLE=20 的。
   本门禁的职责是发现「盘上没有这张帧」，不是发现「分隔符我不认识」，所以先归一分隔符再判绝对性；
   方言漂移不豁免，改为单列 PROV_FRAMES_ABSOLUTE 提示行（生产者侧该自证，real-tour-cli.mjs 已加 selfcheck）。 */
const resolveShot = (p) => { const n = p.replace(/[\\/]+/g, sep); return isAbsolute(n) ? n : join(repo, n); };
const isAbsoluteDialect = (p) => p.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(p);
/* 库读法必须与 verify-evidence-corpus 同源（同一实现，不是第二份三态判定）。 */
import { openEvidenceStore, storeVouches } from "./evidence-store-read.mjs";
const git = (args) => {
  try { return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim(); } catch { return ""; }
};
const HEAD = git(["rev-parse", "--short", "HEAD"]);

const argv = process.argv.slice(2);
/* 仓外证据库这一轴（本轮补）：本门以前只会说"这帧不在盘上 ⇒ 断链"，
   而 evidence-store-read 的唯一实现允许问"库里能不能按哈希背书它"。
   ⚠ 只背书"存在性"，**不**替代时间轴判定：库里的对象 mtime 是搬移时刻，不是拍摄时刻，
   所以被背书的帧进 PROV_FRAMES_STORE_VOUCHED 单列，绝不并进 CONSISTENT（并进就是造假绿）。
   库不可达 ⇒ 单列判红（与 verify-evidence-corpus 同一极性、同一实现）；未配库 ⇒ 行为逐字不变。 */
const STORE = openEvidenceStore({ argv, repo });
const SAMPLES = (() => { const i = argv.indexOf("--samples"); return i >= 0 ? Number(argv[i + 1]) || 0 : 3; })();
// 时间轴判据的容差：帧与它所属提交的 committer date 相差不到 2 分钟时不下结论
// （committer date 会被 rebase/cherry-pick 改写，只作粗判）。
const TOLERANCE_MS = 2 * 60 * 1000;
const SRC_PATH = "apps/client/src";

const commitDateCache = new Map();
function commitDate(sha) {
  if (!sha) return null;
  if (commitDateCache.has(sha)) return commitDateCache.get(sha);
  const out = git(["show", "-s", "--format=%cI", `${sha}^{commit}`]);
  const d = out ? new Date(out) : null;
  commitDateCache.set(sha, d && isNaN(d.getTime()) ? null : d);
  return commitDateCache.get(sha);
}

// apps/client/src 的提交时间轴（升序），用于回答「这张帧拍摄时，线上代码其实是哪次提交」
const srcCommits = (() => {
  const raw = git(["log", "--reverse", "--format=%cI %h", "--", SRC_PATH]);
  if (!raw) return [];
  return raw.split("\n").map((l) => {
    const i = l.lastIndexOf(" ");
    return { at: new Date(l.slice(0, i)), sha: l.slice(i + 1).trim() };
  }).filter((x) => x.at && !isNaN(x.at.getTime()));
})();
function commitAtTime(t) {
  let best = null;
  for (const c of srcCommits) if (c.at.getTime() <= t) best = c; else break;
  return best;
}

function walk(dir, re, out = [], depth = 0) {
  if (!existsSync(dir) || depth > 8) return out;
  let names = [];
  try { names = readdirSync(dir); } catch { return out; }
  for (const n of names) {
    if (n === "node_modules" || n === ".git" || n === "dist" || n === "unpackage") continue;
    const p = join(dir, n);
    let st = null;
    try { st = statSync(p); } catch { continue; }  // 断链符号链接：跳过而不是让门禁崩
    if (st.isDirectory()) walk(p, re, out, depth + 1);
    else if (re.test(n)) out.push(p);
  }
  return out;
}

// ---------- A. 产物侧：逐帧时间轴归属 ----------
// --scope 前缀（逗号分隔）把产物轴缩到本轮：不限定的话，上一轮那批"过期但确实没伪造"的
// manifest 会把门禁永久钉红，"本轮证据可信"就再也读不出来了。限定 scope 时生产者轴降级为
// INFO（历史脚本里的字面量 SHA 依旧逐条打印，只是不否决本轮）——生产者轴是全局风险，
// 所以要跑不带 scope 的全域版才有意义，那一版在开跑前执行。
const scopeArg = (() => { const i = argv.indexOf("--scope"); return i >= 0 ? (argv[i + 1] || "").split(",").map((s) => s.trim()).filter(Boolean) : []; })();
const scoped = scopeArg.length > 0;
const relOf = (p) => rel(p);
// 段边界语义，与 verify-evidence-corpus.mjs 保持同一套规则（两把尺子必须同源，否则同一 scope
// 在两个门禁里圈出不同证据集，区间审计就各说各话）。裸 startsWith 会让 --scope .../round-1 命中
// .../round-10/（前缀相同）而串档；尾斜杠=只收子树，无斜杠=自身+后代+同父目录 <name>-* 兄弟。
// 保留 -\* 连带是因为本轮取证被拆到 round-N-tour/、round-N-interact/ 里，收全"本轮"证据必需；
// 但 round-1 不认 round-10——"10" 不是分隔符/连字符边界，它是另一轮的名字，不属于 round-1 族。
function segMatch(target, scope) {
  if (scope.endsWith("/")) return target.startsWith(scope);
  const slash = scope.lastIndexOf("/");
  const parent = slash >= 0 ? scope.slice(0, slash + 1) : "";
  const name = slash >= 0 ? scope.slice(slash + 1) : scope;
  if (!target.startsWith(parent)) return false;
  const rest = target.slice(parent.length);
  const tslash = rest.indexOf("/");
  const first = tslash >= 0 ? rest.slice(0, tslash) : rest;
  return first === name || first.startsWith(name + "-");
}
// scope 归一化到"仓库相对 + 正斜杠"，与 relOf 同方言；保留尾斜杠子树意图；也接受绝对写法。
const scopeNorm = scopeArg.map((sRaw) => {
  const wantSubtree = sRaw.endsWith("/") || sRaw.endsWith(sep);
  let s = sRaw.split(sep).join("/").replace(/\\/g, "/");
  if (s.startsWith("/") || /^[a-zA-Z]:\//.test(s)) s = rel(resolve(s));
  if (s.startsWith("./")) s = s.slice(2);
  return wantSubtree && !s.endsWith("/") ? s + "/" : s;
});
// 自测专用 --root（默认 reports，生产不传 → 与改前逐字一致）：本工具只扫 reports/，段边界自证要用
// reports/ 之外的一次性夹具，故开一个只改扫描根、不动输出字段/退出码的旋钮，让真实判据跑夹具而非影子实现。
const ROOT = (() => { const i = argv.indexOf("--root"); return i >= 0 && argv[i + 1] ? resolve(repo, argv[i + 1]) : join(repo, "reports"); })();
const manifests = walk(ROOT, /manifest.*\.json$/i)
  .filter((p) => !/node_modules/.test(p))
  .filter((p) => !scoped || scopeNorm.some((s) => segMatch(relOf(p), s)));
if (!manifests.length) {
  console.log(`PROVENANCE_MANIFESTS=0 SCOPE=${scoped ? scopeArg.join("+") : "全域"}`);
  console.log("PROVENANCE_RESULT=FAIL reason=reports/ 下没有任何 manifest，扫描集为空（不得空过）");
  process.exit(2);
}
if (!srcCommits.length) {
  console.log("PROVENANCE_RESULT=FAIL reason=读不到 apps/client/src 的提交时间轴，无法做时间轴归属");
  process.exit(2);
}

/* 「manifest 顶层必须带 gitSha」这条约定本身有生效日期：早于该日期生成的清单不可能带上当时还不存在的
   字段，把它们算成本轮的红，等于要求历史产物服从未来的规矩（round-1 的 144 帧就是这一类：磁盘上
   一张不缺、字节数与清单逐张对得上，只是 generatedAt=2026-09-19）。
   约定起点由 git 派生，不落一张手维护的豁免名单——名单迟早变成永久的假红/假绿，本仓已吃过一次。
   取 scripts/qa/ 下最早一次改动 "gitSha" 这个字符串的提交：这是约定存在的**下界**，所以只会偏严不会偏松
   （任何晚于该时刻生成的无戳清单仍然判红）。 */
const STAMP_CONVENTION = (() => {
  const raw = git(["log", "--reverse", "--format=%cI", "-S", "gitSha", "--", "scripts/qa"]);
  const first = (raw || "").split("\n")[0] || "";
  const d = first ? new Date(first) : null;
  return d && !isNaN(d.getTime()) ? d : null;
})();
if (!STAMP_CONVENTION) {
  console.log("PROVENANCE_RESULT=FAIL reason=派生不出「gitSha 约定」的生效时间（git log -S 在 scripts/qa 无结果），无戳豁免不成立，不得默认放行");
  process.exit(2);
}

let frames = 0, noStamp = 0, badStamp = 0, unresolvable = 0;
let storeVouched = 0; const vouchedSamples = [];
let fabricated = 0, staleStamp = 0, consistent = 0, undated = 0, absoluteDialect = 0, unknownBand = 0;
let noStampLegacy = 0, legacyFrames = 0, legacyExempt = 0;
const samples = [];
const missingSamples = [];
const legacyExemptSamples = [];
const perManifest = [];

for (const mPath of manifests) {
  let j = null;
  try { j = JSON.parse(readFileSync(mPath, "utf8")); } catch { console.log(`PROV_UNPARSEABLE ${rel(mPath)}`); badStamp++; continue; }
  const shots = j.shots ?? j.frames ?? [];
  if (!Array.isArray(shots) || !shots.length) continue;   // 无帧的清单（如 ops manifest）不在本轴职责内
  const stamp = j.gitSha || "";
  const stampDate = commitDate(stamp);
  let legacy = false;
  if (!stamp) {
    const genRaw = j.generatedAt || j.generated_at || "";
    const gen = genRaw ? new Date(genRaw) : null;
    const genOk = gen && !isNaN(gen.getTime());
    if (genOk && gen < STAMP_CONVENTION) {
      legacy = true; noStampLegacy++;
      console.log(`PROV_MANIFEST_LEGACY ${rel(mPath)} generatedAt=${genRaw} 早于打戳约定 ${STAMP_CONVENTION.toISOString()}（约定尚未存在，不判红；但其帧一律不参与时间轴判决，本轮终报不得引用它作「产物级」证据）`);
    } else {
      noStamp++;
      console.log(`PROV_MANIFEST_NO_SHA ${rel(mPath)} generatedAt=${genRaw || "(无)"} 约定起点=${STAMP_CONVENTION.toISOString()}（约定之后生成的清单必须带 gitSha）`);
    }
  }
  else if (!stampDate) { badStamp++; console.log(`PROV_UNKNOWN_COMMIT ${rel(mPath)} gitSha=${stamp}（不是本仓任何提交）`); }
  let mf = 0, mFab = 0, mStale = 0, mCons = 0;
  for (const s of shots) {
    const p = s.path || s.file || "";
    const abs = resolveShot(p);
    mf++; frames++;
    if (p && isAbsoluteDialect(p)) absoluteDialect++;
    if (!p || !existsSync(abs)) {
      /* LEGACY 豁免（2026-10-06 采纳建议书 #12-A，reports/audit/round-7/ruling-recommendations-2026-10-06.md）。
         范围刻意收窄到最窄可证形状，三条缺一不可：
           ① 只看**整份 manifest 无 gitSha 且 generatedAt 早于打戳约定**的那一份（上面的 legacy 标记，
              由 git log -S 派生的 STAMP_CONVENTION 判定，不读任何手维护名单）；
           ② 只豁免**盘上不存在**的帧——在盘上的无戳帧仍走 legacyFrames 轴逐帧留名，不借本豁免消失；
           ③ 行内自带 bandSha 的帧不豁免（它声称了具体采集带，时间轴有据可判，按老规矩走）。
         为什么这不是给"断链"开后门：round-1 那 144 帧属打戳约定生效前的历史 manifest，帧本体已按用户
         2026-09-30 裁定删除不入库（decisions r10new#E）；没有本分支时它们落在 UNRESOLVABLE（红），读数
         会把"按裁定删除的历史证据"误读成"证据被这轮弄丢了"。豁免后单列 LEGACY_EXEMPT 且结论钉死为
         **「历史证据，不可引用」**——不进 CONSISTENT、不算覆盖、不给任何本轮结论背书（与 PROV_MANIFEST_LEGACY
         那行"其帧一律不参与时间轴判决"同一条纪律）。约定之后生成的无戳清单照样走 noStamp 判红，豁免面
         不会随时间自动变大（STAMP_CONVENTION 是固定下界）。 */
      if (legacy && !s.bandSha) {
        legacyExempt++;
        if (legacyExemptSamples.length < SAMPLES) legacyExemptSamples.push(`PROV_FRAME_LEGACY_EXEMPT ${rel(mPath)} 记=${p || "(空)"}（历史证据，不可引用）`);
        continue;
      }
      /* 盘上没有 ⇒ 先问仓外库能不能按哈希唯一背书（裁定③的形状）。
         能背书 ⇒ 单列 STORE_VOUCHED（承认存在性，不承认时间轴结论）；
         不能背书（没哈希/前缀不唯一/库里没有）⇒ 仍是断链，照旧判红并指名。 */
      const v = (!p || STORE.mode !== "reachable") ? { vouchable: false, why: "no_store_or_no_path" }
        : storeVouches(STORE, s.contentHash || s.sha256 || s.hash);
      if (v.vouchable) {
        storeVouched++;
        if (vouchedSamples.length < SAMPLES) {
          const h = String(s.contentHash || s.sha256 || s.hash || "").slice(0, 16);
          vouchedSamples.push(`PROV_FRAME_STORE_VOUCHED ${rel(mPath)} 记=${p} 哈希前缀=${h || "(空)"}`);
        }
        continue;
      }
      unresolvable++;
      if (missingSamples.length < SAMPLES) missingSamples.push(`PROV_FRAME_MISSING ${rel(mPath)} 记=${p || "(空)"} 解析为=${abs}`);
      continue;
    }
    let mt = 0;
    try { mt = statSync(abs).mtimeMs; } catch { unresolvable++; continue; }
    if (!stampDate && !s.bandSha) { if (legacy) legacyFrames++; else undated++; continue; }
    /* 权威索引是多带并集：顶层 gitSha 只代表"主带"，跨带进来的帧不能拿主带的提交去比，
       否则一批本来诚实的帧会被读成"回填戳记"（round-7 实测 325 张帧的目录名写着
       round-7-mock-tour-1a1df78b，而权威件顶层记的是 e4495d67 ⇒ 帧比主带提交早 6 小时）。
       生产者现在给每行都写了 bandSha；有 bandSha 就按它自己那一带判，没有才退回顶层。 */
    const rowStamp = s.bandSha || stamp;
    const rowStampDate = s.bandSha ? commitDate(s.bandSha) : stampDate;
    if (!rowStampDate) {
      unknownBand++;
      if (samples.length < SAMPLES) samples.push(`PROV_UNKNOWN_BAND ${rel(mPath)} 帧=${rel(abs)} 所记带 ${rowStamp} 不是本仓任何提交`);
      continue;
    }
    const attributed = commitAtTime(mt);
    if (mt < rowStampDate.getTime() - TOLERANCE_MS) {
      // 帧比它声称所属的提交还早 → 那次提交当时不存在，戳记是回填出来的
      fabricated++; mFab++;
      if (samples.length < SAMPLES) samples.push(`PROV_PRE_STAMP ${rel(mPath)} 帧=${rel(abs)} mtime=${new Date(mt).toISOString()} 所记提交 ${rowStamp}@${rowStampDate.toISOString()}${s.bandSha && s.bandSha !== stamp ? "（行内带，顶层是 " + stamp + "）" : ""}`);
    } else if (attributed && attributed.sha !== rowStamp && commitDate(attributed.sha) && commitDate(attributed.sha).getTime() > rowStampDate.getTime()) {
      // 帧拍摄时，src 已有比所记提交更新的提交 → 证据测的不是被审代码
      staleStamp++; mStale++;
      if (samples.length < SAMPLES) samples.push(`PROV_STALE_STAMP ${rel(mPath)} 帧=${rel(abs)} mtime=${new Date(mt).toISOString()} 实际对应 ${attributed.sha}，戳记却是 ${rowStamp}`);
    } else { consistent++; mCons++; }
  }
  perManifest.push({ file: rel(mPath), shots: mf, stamp: stamp || "-", fabricated: mFab, stale: mStale, consistent: mCons });
}

// ---------- B. 生产者侧：写 gitSha 的脚本必须运行时派生 ----------
const PRODUCER_DIRS = ["scripts", "tmp", "tools", join("apps", "client", "scripts"), join("apps", "admin", "scripts")];
const producers = [];
for (const d of PRODUCER_DIRS) {
  for (const p of walk(join(repo, d), /\.(mjs|cjs|js)$/i)) producers.push(p);
}
let producerLiteral = 0, producerNoDerive = 0, producerOk = 0, producerCount = 0;
const literalRe = /(?:GIT_SHA|gitSha|HEAD_SHA|commitSha)\s*[:=]\s*['"]([0-9a-f]{7,40})['"]/g;
// 「写戳」的判据必须收紧到**赋的是新值**：只把读来的 gitSha 原样搬运（如校验工具里的
// `gitSha: m.gitSha ?? "(未记)"`）不算生产者。首版只看"文件里有 gitSha 且有 writeFileSync"，
// 于是把 scripts/verify-evidence-integrity.mjs 误报成未派生的生产者——在自己输出上判据的
// 同类错误本仓已犯六次，这里按 RHS 形态收窄。
const READ_ONLY_RHS = /^[A-Za-z_$][\w$]*\s*(\?\?|\|\|)?[^,;]*\.\s*gitSha\b/;  // m.gitSha / j.gitSha ?? …
function stampsOwnValue(code) {
  for (const mt of code.matchAll(/gitSha\s*[:=]\s*([^,\n}]+)/g)) {
    const rhs = mt[1].trim();
    if (!rhs || READ_ONLY_RHS.test(rhs)) continue;
    if (/^['"`][0-9a-f]{7,40}['"`]$/.test(rhs)) return true;   // 字面量戳
    if (/^(GIT_SHA|HEAD_SHA|commitSha|sha)\b/.test(rhs)) return true;  // 派生来的常量
    if (/\brev-parse\b/.test(rhs)) return true;
  }
  return false;
}
for (const p of producers) {
  let text = "";
  try { text = readFileSync(p, "utf8"); } catch { continue; }
  /* 两类文件不参与"生产者必须运行时派生"的判定，但**必须逐条打出来**——
     "没人看"和"没问题"不能共用一个输出，这是本门自己的规矩：
       · 自测夹具（test-*、_mutant-*）：它写的假戳正是这条门的负例来源，
         把它算成"未派生的生产者"会让门永远红，而红到没人读就等于门不存在；
       · tmp/ 下的一次性脚本：它们产出的索引早被 rebuild-frozen-manifest 取代，
         不是本轮产物侧的生产者；但历史 scratch 留在盘上，点名比静默跳过诚实。 */
  const relP = rel(p);
  const isFixture = /(^|[\/\\])(test-|_mutant-)/.test(relP);
  const isScratch = relP.split(/[\/\\]/)[0] === "tmp";
  if (isFixture || isScratch) {
    console.log(`PROV_PRODUCER_EXEMPT ${relP} ${isFixture ? "自测夹具（它写的假戳就是本门的负例）" : "tmp/ 一次性脚本（非本轮生产者）"}`);
    continue;
  }
  const code = text.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");  // 注释里记录"曾经写错过"不算埋坑
  if (!/writeFileSync|writeFile\(|execFileSync\(\s*["']git/.test(code)) continue;
  if (!stampsOwnValue(code)) continue;
  producerCount++;
  const derived = /rev-parse|spawnSync\(\s*["']git|execFileSync\(\s*["']git|execSync\(\s*["']git/.test(code);
  let lit = null;
  for (const mt of code.matchAll(literalRe)) { lit = mt[1]; break; }
  if (lit) {
    producerLiteral++;
    console.log(`${scoped ? "PROV_INFO_PRODUCER_LITERAL" : "PROV_PRODUCER_LITERAL"} ${rel(p)} 字面量 ${lit}${lit === HEAD ? "（恰为当前 HEAD，仍属回填）" : " ≠ HEAD(" + (HEAD || "?") + ")"}`);
  } else if (!derived) {
    producerNoDerive++;
    console.log(`${scoped ? "PROV_INFO_PRODUCER_NODESCRIBE" : "PROV_PRODUCER_NODESCRIBE"} ${rel(p)} 写 gitSha 却没有任何运行时派生（rev-parse/git 子进程）`);
  } else producerOk++;
}
if (!producerCount) {
  console.log("PROV_PRODUCERS=0");
  console.log("PROVENANCE_RESULT=FAIL reason=一个 stamp 生产者都没扫到，扫描集为空（不得空过）");
  process.exit(2);
}

console.log(`PROVENANCE_HEAD=${HEAD || "?"} SRC_COMMITS=${srcCommits.length} SCOPE=${scoped ? scopeArg.join("+") : "全域"} MANIFESTS_WITH_FRAMES=${perManifest.length} FRAMES=${frames}`);
for (const x of perManifest) console.log(`PROV_MANIFEST ${x.file} shots=${x.shots} gitSha=${x.stamp} pre_stamp=${x.fabricated} stale_stamp=${x.stale} consistent=${x.consistent}`);
samples.forEach((s) => console.log(s));
missingSamples.forEach((s) => console.log(s));
console.log(`PROV_FRAMES_CONSISTENT=${consistent} PROV_FRAMES_STALE=${staleStamp} PROV_FRAMES_PRE_STAMP=${fabricated} PROV_FRAMES_UNRESOLVABLE=${unresolvable} PROV_FRAMES_UNDATED=${undated} PROV_FRAMES_UNKNOWN_BAND=${unknownBand} PROV_FRAMES_LEGACY=${legacyFrames} PROV_FRAMES_LEGACY_EXEMPT=${legacyExempt}`);
for (const s of legacyExemptSamples) console.log(s);
console.log(`PROV_LEGACY_EXEMPT_NOTE 打戳约定生效前的无戳历史 manifest（如 round-1）里盘上已不存在的帧，按 2026-10-06 采纳建议书 #12-A 单列豁免：结论=历史证据，不可引用（不进 CONSISTENT、不算覆盖、不给本轮结论背书；约定后的无戳清单不豁免，照旧 noStamp 判红）`);
/* 库这一轴单独印一行（不改上面任何计数的语义）：可达时把"盘上没有、但库里按哈希唯一命中"的帧具名报数；
   未配库时印 unconfigured 且计数必为 0 —— 也就是与从前逐字节相同。
   ⚠ 被背书的帧**不进** CONSISTENT：库里的 mtime 是搬移时刻，拿它做时间轴结论就是造假绿。 */
console.log(`PROV_STORE=${STORE.mode} 库内对象=${STORE.objects || 0} PROV_FRAMES_STORE_VOUCHED=${storeVouched}`);
for (const s of vouchedSamples) console.log(`  ${s}`);
if (STORE.mode === "unreachable") console.log(`  PROV_STORE_UNREACHABLE ${STORE.dir} ⇒ 配了库但够不着，这一发不得被读成"证据完好"`);
console.log(`PROV_FRAMES_ABSOLUTE=${absoluteDialect}（方言提示：manifest 规范写法是「仓库相对+正斜杠」；绝对路径能解析、不计红，但会跨机器失效，应由生产者 selfcheck 拦下）`);
console.log(`PROV_MANIFESTS_NO_SHA=${noStamp} PROV_MANIFESTS_NO_SHA_LEGACY=${noStampLegacy} PROV_MANIFESTS_BAD_SHA=${badStamp} 打戳约定起点=${STAMP_CONVENTION.toISOString()}（由 git log -S gitSha -- scripts/qa 派生）`);
/* 守恒断言：加了新桶（本次的 LEGACY）之后，最怕的不是判错而是漏记——漏掉的帧会让两个桶同时变小而
   看起来"更干净"。逐帧的结局互斥且穷尽（缺文件/无日期/历史件/未知带/回填/过期/一致），所以总数必须相等。 */
const accounted = consistent + staleStamp + fabricated + unresolvable + undated + legacyFrames + unknownBand + storeVouched + legacyExempt;
const conserved = accounted === frames;
console.log(`PROV_FRAME_ACCOUNTING in=${frames} out=${accounted} ${conserved ? "OK" : "MISMATCH（有帧没落到任何桶，本门的统计不可信）"}`);
console.log(`PROV_PRODUCERS=${producerCount} DERIVED_OK=${producerOk} LITERAL_SHA=${producerLiteral} NO_DERIVE=${producerNoDerive}${scoped ? "（限定 scope，生产者侧只报不计）" : ""}`);
const frameFail = fabricated || staleStamp || unresolvable || noStamp || badStamp || STORE.mode === "unreachable";
const fail = frameFail || !conserved || (!scoped && (producerLiteral || producerNoDerive));
console.log(fail
  ? (!conserved
      ? "PROVENANCE_RESULT=FAIL（帧数不守恒：统计口径漏帧，先看本行上面的 in/out 再看别的结论）"
      : frameFail
        ? "PROVENANCE_RESULT=FAIL（本轮产物侧存在回填/过期戳记/断链帧/无戳，禁止据此下结论）"
        : "PROVENANCE_RESULT=FAIL（生产者侧有字面量 SHA 或未派生，下一轮证据必然不可信）")
  : "PROVENANCE_RESULT=PASS");
process.exit(fail ? 1 : 0);
