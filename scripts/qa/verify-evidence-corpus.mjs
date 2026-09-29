/**
 * D3 + D1 全语料版：把"证据==盘"和"provenance 可信"一次扫完所有 manifest。
 * 单轮工具 verify-evidence-integrity.mjs 只管一份；本工具管整个 reports/ 树，
 * 并额外检查每份 manifest 记的 gitSha **是不是真提交**、**是不是当轮 HEAD**
 * （R1 的 305 帧就栽在这上面：manifest 记 aefd8a72，HEAD 实为 18c91ccf → 按契约整批过期）。
 * 只读。用法：node scripts/qa/verify-evidence-corpus.mjs
 *
 * 2026-09-29 口径修订（lane-stamps）：CORPUS_EXPIRED_GITSHA 原先把三种完全不同的事实并成一个数
 * ——「可解析、只是比 HEAD 旧的历史轮戳记」「写了个本仓解析不到的字符串（真断链）」
 * 「顶层没有 gitSha（无从核实）」。前一类是证据定格在当时的正常状态，后两类才不可背书。
 * 现在拆成 CORPUS_SHA_CLASS 三个类各自计数；**判红条件一字未放宽**（仍然是 !real ⇒ 红），
 * 并且 HEAD 比对从「短写字符串相等」改成「经 git 归一到 40 位」，免得同一枚提交的全写被读成过期。
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const HEAD = (() => { try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(); } catch { return ""; } })();

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (n !== "node_modules") walk(p, out); }
    else if (/manifest.*\.json$/i.test(n)) out.push(p);
  }
  return out;
}
const hash16 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

/* ---------- 仓外证据库这一轴（用户 2026-09-29 裁定：帧改成"仓外证据库 + manifest 内 sha256 可核"） ----------
   三态必须分开，绝不能糊成一个"通过率"：
     unconfigured（没配）   ⇒ 本轴一句话都不说，判定与从前**逐字节相同**（不新增红，也不豁免任何东西）；
     unreachable（配了够不着）⇒ 判红。不可达不是"当没有库"，那正是把证据弄丢还宣布安全的形状；
     reachable（配了且够得着）⇒ 盘上缺帧时，可由库按哈希背书；两边都没有 ⇒ 断链，判红并指名。
   库里的对象名是完整 sha256（evidence-store.mjs 写的），manifest 里只有 16 位前缀，
   所以索引按 16 位前缀建；同一前缀命中多枚 = 碰撞，宁可判红也不许"取第一个当命中"。 */
const STORE = (() => {
  const i = process.argv.indexOf("--store");
  const d = i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : (process.env.QA_EVIDENCE_STORE || "");
  if (!d) return { mode: "unconfigured", dir: "", index: null };
  const dir = resolve(d);
  const dirNorm = dir.split(sep).join("/"), repoNorm = repo.split(sep).join("/");
  if (dirNorm === repoNorm || dirNorm.startsWith(repoNorm + "/")) return { mode: "inside-repo", dir, index: null };
  if (!existsSync(dir)) return { mode: "unreachable", dir, index: null };
  const index = new Map();
  let objects = 0;
  for (const b of readdirSync(dir)) {
    const sub = join(dir, b);
    let st = null; try { st = statSync(sub); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const f of readdirSync(sub)) {
      const h = f.replace(/\.[0-9a-z]+$/i, "").toLowerCase();
      objects++;
      const k = h.slice(0, 16);
      index.set(k, (index.get(k) || 0) + 1);
    }
  }
  return { mode: "reachable", dir, index, objects };
})();
const isRealCommit = (sha) => { try { execFileSync("git", ["cat-file", "-e", sha + "^{commit}"], { cwd: repo, stdio: "ignore" }); return true; } catch { return false; } };
/* 把「是不是 HEAD」比成字符串相等是错的：HEAD 取的是 --short（8 位），而生产者在 2026-09-28
   起的 exec-* 清单里写的是 40 位全写（实测 reports/audit/round-7/exec-A-mock-final 那一枚）。
   同一枚提交用两种方言写，短写比不中的那份就会被记进"过期"堆里 —— 于是这个计数器数的不再是
   "证据与盘不符"，而是"戳记少写了几个字符"。一律经 git 归一到 40 位再比。
   这只修**分类**，不动判红：红仍然由 isRealCommit 决定（见下面 real/fail 那一段）。 */
const HEAD40 = (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(); } catch { return ""; } })();
const fullCommit = (sha) => { try { return execFileSync("git", ["rev-parse", sha + "^{commit}"], { cwd: repo, encoding: "utf8" }).trim(); } catch { return ""; } };
const behindCount = (sha) => { try { return Number(execFileSync("git", ["rev-list", "--count", sha + "^{commit}..HEAD"], { cwd: repo, encoding: "utf8" }).trim()); } catch { return -1; } };

// 自测专用 --root（默认 reports，生产不传 → 行为与逐字改前一致）：本工具只扫 reports/，
// 而门禁小修的段边界自证需要在 reports/ 之外放一次性夹具（见 .zcode/tmp/scope-fixtures/），
// 又不能去"碰 reports/**"。开一个只影响扫描根、不改任何输出字段/退出码的旋钮，让同一份判据
// 逻辑（含 segMatch）能在真实 CLI 上跑夹具，而不是另抄一份影子实现自欺。
const ROOT = (() => { const i = process.argv.indexOf("--root"); return i >= 0 && process.argv[i + 1] ? resolve(repo, process.argv[i + 1]) : join(repo, "reports"); })();
const manifestsAll = walk(ROOT).filter((p) => !p.includes("node_modules"));
// --scope 前缀（逗号分隔）把审计缩到本轮产物：不限定的话，上一轮留在盘上的过期 manifest
// 会让门禁永远红，于是"本轮证据可信"这个判断被历史噪声永久淹没——那时它就不再是判据，
// 而是没人看的告警。限定 scope 时生产者扫描降级为 INFO（历史脚本里的字面量 SHA 照报不误，
// 只是不否决本轮）；不带 scope 的全域跑仍然把它们计入退出码。
const scopeArg = (() => { const i = process.argv.indexOf("--scope"); return i >= 0 ? (process.argv[i + 1] || "").split(",").map((s) => s.trim()).filter(Boolean) : []; })();
// 一条归一化流水线，盘上路径和 --scope 入参都只能走它：反斜杠→正斜杠、剥仓库前缀、
// Windows 上折叠大小写。两侧不同源的话比较就是在比两种方言，静默 0 命中只会伪装成门禁在管事。
const toPosix = (p) => p.split(sep).join("/").replace(/\\/g, "/");
// Windows 路径大小写不敏感：d:/… 与 D:/…、reports 与 REPORTS 指的是同一个目录。
// 按字面比大小写会把合法 scope 筛成 0 命中，再撞上"空扫描集 FAIL"——看着像证据有问题，
// 其实是档位没接上。用 sep 判平台，POSIX 上保持大小写敏感（那边确实区分）。
const foldCase = (s) => (sep === "\\" ? s.toLowerCase() : s);
const toRelPosix = (p) => {
  // 先归一化再剥前缀。首版反序（先 replace(repo + "/") 再把 \ 换成 /），在 Windows 上
  // repo 是反斜杠形式 → 前缀永不命中，任何 --scope 都筛出 0 份 manifest：
  // 门禁恒红（好过恒绿，但等于这个档位从没真正生效过）。实测由巡检代理报出。
  const uni = toPosix(p);
  const repoUni = toPosix(repo);
  let r = uni.slice(0, repoUni.length + 1).toLowerCase() === (repoUni + "/").toLowerCase() ? uni.slice(repoUni.length + 1) : uni;
  if (r.startsWith("./")) r = r.slice(2);
  return foldCase(r);
};
// 段边界匹配：修复"裸字符串前缀"把不同轮号串档的缺陷。历史写法 rel.startsWith(scope) 会把
// --scope reports/audit/round-1 连带命中 reports/audit/round-10/...（"round-10" 确实以 "round-1" 开头），
// 按轮号做区间审计时就直接污染结果。这里把 scope 拆成「父目录 + 末段名」两种语义：
//   · scope 以 "/" 结尾   → 只收该目录子树（round-1/ 只含 round-1/**，不含 round-1-tour 兄弟目录）；
//   · scope 不以 "/" 结尾 → 按"整段前缀"匹配：收 末段名本身及其带分隔符的后代（round-1/**），
//                           并且额外允许「同一父目录下的 <name>-* 兄弟」（round-1-tour/、round-1-interact/…）。
// 为什么保留这条 -\* 兄弟连带：本轮 round-6 的取证被生产者拆到 round-6-tour/、round-6-interact/ 里，
// 审计 --scope .../round-6 时必须把同轮这些兄弟一起收进来才谈得上"本轮证据"，这是既有 PASS 语义，不能动。
// 关键区分：<name>-* 只认"名字后紧跟分隔符或连字符"的兄弟，所以 round-1 命中 round-1-tour 却不命中
// round-10——"10" 既不是分隔符也不是连字符边界，它是另一个名字（第 10 轮），不属于 round-1 这一族。
function segMatch(target, scope) {
  if (scope.endsWith("/")) return target.startsWith(scope); // 显式子树：只认该目录下的后代
  const slash = scope.lastIndexOf("/");
  const parent = slash >= 0 ? scope.slice(0, slash + 1) : "";
  const name = slash >= 0 ? scope.slice(slash + 1) : scope;
  if (!target.startsWith(parent)) return false;              // 兄弟必须同父目录
  const rest = target.slice(parent.length);
  const tslash = rest.indexOf("/");
  const first = tslash >= 0 ? rest.slice(0, tslash) : rest;   // target 相对父目录的首个路径段
  return first === name || first.startsWith(name + "-");      // 自身(含后代) 或 <name>-* 兄弟；排除 round-1≠round-10
}
const inScope = (p) => {
  if (!scopeArg.length) return true;
  const rel = toRelPosix(p);
  // abs 必须是真·归一化绝对路径。历史上这里写过 toRelPosix(resolve(p))：归一化是对的，
  // 但 toRelPosix 会把仓库前缀又剥掉，于是 abs 其实还是相对路径，拿去 startsWith(绝对 scope)
  // 永远不成立，绝对写法的 --scope 实测 0 命中——同一个变量被相对化两次就是这个下场。
  // 本次接手时磁盘上已是 resolve(p).split(sep).join("/")（绝对了），但仍未折叠大小写，
  // 见下方探针：d:/… 与 REPORTS/Audit 这类同目录不同写法的 scope 照样 0 命中等值 FAIL。
  const abs = foldCase(toPosix(resolve(p)));
  // 同时接受"仓库相对"与"绝对"两种 scope：只认相对的那版会把调用方按定义模板传下来的绝对路径
  // 筛成 0 命中，而 0 命中走"空扫描集"分支报 FAIL —— 看着像门禁在管事，实际档位从没接上。
  // 相对项按 repo 而非 cwd 展开（语料本身就以 repo 为原点扫出来的），调用目录就不再影响结果。
  return scopeArg.some((sRaw) => {
    // 尾斜杠 = 显式"只要子树"。resolve() 会把尾斜杠吃掉，所以先记下意图再补回，交给 segMatch 分派。
    const wantSubtree = sRaw.endsWith("/") || sRaw.endsWith(sep);
    const sAbs = foldCase(toPosix(resolve(repo, sRaw)));
    const sRel = toRelPosix(sAbs);
    const [aSc, rSc] = wantSubtree ? [sAbs + "/", sRel + "/"] : [sAbs, sRel];
    return segMatch(rel, rSc) || segMatch(abs, aSc);
  });
};
const manifests = manifestsAll.filter(inScope);
console.log(`CORPUS_MANIFESTS=${manifests.length} CORPUS_MANIFESTS_TOTAL=${manifestsAll.length} SCOPE=${scopeArg.join("+") || "全域"} HEAD=${HEAD || "?"}`);
// 空扫描集不得判绿：首版在没有 manifest 时会安静地输出 CORPUS_PROBLEMS=0 并 PASS。
if (!manifests.length) {
  console.log("CORPUS_RESULT=FAIL reason=reports/ 下一份 manifest 都没扫到，空过没有意义");
  process.exit(2);
}
let fail = 0, expired = 0, scanned = 0;
/* 「过期」不是一个类，是三个类，而它们的历史含义完全不同：
     · resolvableOlder —— 戳记指向一枚真实存在、只是比 HEAD 旧的提交。历史轮的证据本就该定格在
       当时那枚提交上（round-1 记 aefd8a72、round-6 记 874ff52f…），把它和真断链并成一个数，
       面板上就是"43 处坏"，而真正不可核实的只有 1 处 —— 门的读数与它声称查的东西不是同一件事。
     · unresolvable   —— 写了个形状像 SHA 的字符串，本仓解析不到 ⇒ 真断链，判红。
     · empty          —— 顶层根本没有 gitSha ⇒ 无从核实，判红。
   计数拆开只改**可见性**；判红条件仍是 !real（见下面 fail 那一段），一类都没被放行。 */
let expiredResolvableOlder = 0, expiredUnresolvable = 0, expiredEmpty = 0;
let framesResolvableOlder = 0, framesUnresolvable = 0, framesEmpty = 0;
let storeVouchedTotal = 0, storeCollisionTotal = 0;
const failReasons = [];
for (const m of manifests) {
  let j; try { j = JSON.parse(readFileSync(m, "utf8")); } catch { console.log(`  UNPARSEABLE ${m}`); fail++; continue; }
  const shots = j.shots ?? j.frames ?? [];
  if (!Array.isArray(shots) || shots.length === 0) continue;
  scanned++;
  // 实测坑：早期 schema 用 file 而不是 path（reports/screenshots/round-1/manifest.json 的 144 帧），
  // 首版只认 s.path，于是把"盘上都在、字节数逐张相符"的 144 帧报成"路径不可解析"。
  // 本仓今天的第六次同类错误还是在自己的输出上判据——字段名要按 schema 取，不能猜。
  let matched = 0, noHash = 0, mismatch = 0, missing = 0, bytesOk = 0, bytesBad = 0;
  /* 库这一轴只在"配了且够得着"时才动 missing 的归属：
     盘上没有但库里按哈希能找到唯一一枚 ⇒ 记 storeVouched（这正是不把像素塞进 git 的意义）；
     盘上没有、库里也没有 ⇒ 照旧记 missing，判红不变。没配库时这两个计数器恒为 0，
     本门的判定与改动前**逐字节相同**。 */
  let storeVouched = 0, storeCollision = 0;
  for (const s of shots) {
    const p = s.path || s.file || "";
    if (!p || !existsSync(p)) {
      const k = String(s.contentHash || "").toLowerCase();
      if (STORE.mode === "reachable" && k.length >= 16) {
        const hits = STORE.index.get(k.slice(0, 16)) || 0;
        if (hits === 1) { storeVouched++; continue; }
        if (hits > 1) { storeCollision++; }
      }
      missing++;
      continue;
    }
    if (!s.contentHash) {
      noHash++;
      if (typeof s.bytes === "number") { if (statSync(p).size === s.bytes) bytesOk++; else bytesBad++; }
      continue;
    }
    if (hash16(p) === s.contentHash) matched++; else mismatch++;
  }
  const sha = j.gitSha || "";
  const real = sha ? isRealCommit(sha) : false;
  const full = real ? fullCommit(sha) : "";
  // 归一到 40 位再比：同一枚提交的短写/全写是同一个事实，不是两种事实。
  const same = !!full && full === HEAD40;
  const behind = real && !same ? behindCount(sha) : 0;
  const verdict = !sha ? "无gitSha(空 ⇒ 不可核实，判红)"
    : (!real ? "gitSha不存在(形状合法但本仓解析不到 ⇒ 真断链，判红)"
      : (same ? "对应当前HEAD"
        : `非当前HEAD→按契约过期(可解析=${behind < 0 ? "?" : behind}个提交前的历史 ⇒ 不判红，历史轮证据本应定格在当时那枚提交)`));
  if (!same) {
    expired++;
    if (!sha) { expiredEmpty++; framesEmpty += shots.length; }
    else if (!real) { expiredUnresolvable++; framesUnresolvable += shots.length; }
    else { expiredResolvableOlder++; framesResolvableOlder += shots.length; }
  }
  if (missing || mismatch || noHash || !real || bytesBad) {
    fail++;
    const why = [missing && `帧不存在=${missing}`, mismatch && `哈希不符=${mismatch}`, noHash && `无 contentHash=${noHash}`,
      bytesBad && `字节数不符=${bytesBad}`, !real && `gitSha 不可核实(${sha ? sha + " ⇒ 本仓解析不到（真断链）" : "空 ⇒ 顶层无 gitSha（无从核实）"})`].filter(Boolean).join(" ");
    failReasons.push(`${toRelPosix(m)} 共 ${shots.length} 帧 :: ${why}`);
  }
  // 只改打印，不改判定：原写法 m.replace(repo + "/")，Windows 下 m 与 repo 都是反斜杠路径，
  // "D:\…\reports" 里插个正斜杠前缀永远剥不掉 → 日志打出全量绝对路径。走同一条归一化流水线拿相对路径。
  console.log(`  ${toRelPosix(m)}  shots=${shots.length} matched=${matched} noHash=${noHash} missing=${missing} bytesOk=${bytesOk} bytesBad=${bytesBad} gitSha=${sha || "-"} → ${verdict}`);
  storeVouchedTotal += storeVouched; storeCollisionTotal += storeCollision;
  if (STORE.mode === "reachable" && (storeVouched || storeCollision)) {
    console.log(`    CORPUS_STORE_LINE 库背书=${storeVouched} 前缀碰撞=${storeCollision}（碰撞不当命中，宁可红）`);
  }
}
if (!scanned) {
  console.log("CORPUS_RESULT=FAIL reason=扫到的 manifest 里没有任何带帧的清单，空过没有意义");
  process.exit(2);
}

// D1 的另一半：脚本里被硬编码的 8 位 SHA 字面量（实测 tour-R2.mjs 曾写死旧值）
const hard = [];
for (const dir of ["tmp", "scripts/qa", "scripts"]) {
  const d = join(repo, dir);
  if (!existsSync(d)) continue;
  for (const n of readdirSync(d)) {
    if (!/\.(mjs|cjs|js)$/.test(n)) continue;
    const t = readFileSync(join(d, n), "utf8");
    // 注释行要先剔除：tour-R2.mjs 里有一行"原 defect：const GIT_SHA = 'aefd8a72'"的说明文字，
    // 按原文匹配会把"记录过这个坑"当成"还埋着这个坑"，制造假阳性（本会话同类错已犯第四次）。
    const code = t.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    for (const mt of code.matchAll(/(?:GIT_SHA|gitSha|SHA)\s*=\s*['"]([0-9a-f]{7,40})['"]/g)) {
      hard.push(`${dir}/${n} 字面量 ${mt[1]} ${mt[1] === HEAD ? "== HEAD" : "≠ HEAD(" + HEAD + ") → 硬编码可疑"}`);
    }
  }
}
const scoped = scopeArg.length > 0;
for (const h of hard) console.log((scoped ? "  INFO_HARDCODED_SHA " : "  HARDCODED_SHA ") + h);
const hardBlocking = scoped ? [] : hard;

/* 仓外证据库这一轴的判决。三态必须分开，且"配了却够不着"是红：
   不可达时若按"库里没有就算了"处理，等于把证据弄丢还宣布安全 —— 这正是用户点名要防的形状。
   没配库时本轴不参与判定，本门行为与改动前逐字节相同（不新增红、也不豁免任何东西）。
   ⚠ 这段必须待在 CORPUS_PROBLEMS 打印**之前**：放后面的话 fail 涨了却不进那个数，
     红就不自洽（我第一版正是这么写的，实测不可达那跑仍报 PROBLEMS=1）。 */
if (STORE.mode === "unconfigured") {
  console.log("CORPUS_STORE=unconfigured（没配 QA_EVIDENCE_STORE/--store ⇒ 本轴不判，判定与从前相同）");
} else if (STORE.mode === "inside-repo") {
  fail++;
  failReasons.push(`证据库目录落在仓库内（${STORE.dir}）⇒ 库必须独立于被测物：藏在仓里时"证据在不在"会被"仓库干不干净"污染，且导出会把帧复制进自己的扫描范围`);
  console.log(`CORPUS_STORE=inside-repo dir=${toRelPosix(STORE.dir) || "."} ⇒ 判红`);
} else if (STORE.mode === "unreachable") {
  fail++;
  failReasons.push(`证据库已配置但够不着（${STORE.dir}）⇒ 不可达必须判红，不许当"库里没有"`);
  console.log(`CORPUS_STORE=unreachable dir=${STORE.dir} ⇒ 判红`);
} else {
  console.log(`CORPUS_STORE=reachable dir=${STORE.dir} 库内对象=${STORE.objects} 本轮库背书帧=${storeVouchedTotal} 前缀碰撞=${storeCollisionTotal}`);
  if (storeCollisionTotal) {
    fail++;
    failReasons.push(`库里同一 16 位前缀命中多枚对象（${storeCollisionTotal} 处）⇒ 不许"取第一个当命中"，宁可判红`);
  }
}
console.log(`CORPUS_SCANNED=${scanned} CORPUS_EXPIRED_GITSHA=${expired} CORPUS_PROBLEMS=${fail}${scoped ? "（限定 scope=" + scopeArg.join("+") + "，生产者侧降级 INFO）" : ""}`);
/* 新增行、不改上面那行一个字节（emit-round-report.mjs:1254 用 num("CORPUS_EXPIRED_GITSHA") 取数，
   动了它的形状就是跨车道改契约）。这一行把那个合并数拆成三个类，谁该红一目了然：
   可解析的旧是历史轮定格的正常状态，不可解析/空才是断链。 */
console.log(`CORPUS_SHA_CLASS resolvableOlder=${expiredResolvableOlder} unresolvable=${expiredUnresolvable} empty=${expiredEmpty} :: frames resolvableOlder=${framesResolvableOlder} unresolvable=${framesUnresolvable} empty=${framesEmpty}`);
/* 判红必须当场说清是哪几份、缺什么。原来只有一个 CORPUS_PROBLEMS=N 的计数，
   读的人得自己在几十行里逐行对数字找原因 —— 一个不指名道姓的红和没有证据一样没用。 */
for (const r of failReasons) console.log("  CORPUS_PROBLEM " + r);
/* 仓外证据库这一轴的判决见上面（必须在 CORPUS_PROBLEMS 印出来之前改 fail，
   否则"配了库却够不着"会躲在计数后面 —— 第一版就是这么写的，实测 PROBLEMS 仍是 1）。 */
console.log(fail || hardBlocking.some((h) => h.includes("≠ HEAD")) ? "CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）" : "CORPUS_RESULT=PASS");
process.exit(fail || hardBlocking.some((h) => h.includes("≠ HEAD")) ? 1 : 0);
