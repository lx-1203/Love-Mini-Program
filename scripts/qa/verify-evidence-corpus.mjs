/**
 * D3 + D1 全语料版：把"证据==盘"和"provenance 可信"一次扫完所有 manifest。
 * 单轮工具 verify-evidence-integrity.mjs 只管一份；本工具管整个 reports/ 树，
 * 并额外检查每份 manifest 记的 gitSha **是不是真提交**、**是不是当轮 HEAD**
 * （R1 的 305 帧就栽在这上面：manifest 记 aefd8a72，HEAD 实为 18c91ccf → 按契约整批过期）。
 * 只读。用法：node scripts/qa/verify-evidence-corpus.mjs
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
const isRealCommit = (sha) => { try { execFileSync("git", ["cat-file", "-e", sha + "^{commit}"], { cwd: repo, stdio: "ignore" }); return true; } catch { return false; } };

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
  for (const s of shots) {
    const p = s.path || s.file || "";
    if (!p || !existsSync(p)) { missing++; continue; }
    if (!s.contentHash) {
      noHash++;
      if (typeof s.bytes === "number") { if (statSync(p).size === s.bytes) bytesOk++; else bytesBad++; }
      continue;
    }
    if (hash16(p) === s.contentHash) matched++; else mismatch++;
  }
  const sha = j.gitSha || "";
  const real = sha ? isRealCommit(sha) : false;
  const same = sha && sha === HEAD;
  const verdict = !sha ? "无gitSha" : (!real ? "gitSha不存在" : (same ? "对应当前HEAD" : "非当前HEAD→按契约过期"));
  if (!same) expired++;
  if (missing || mismatch || noHash || !real || bytesBad) {
    fail++;
    const why = [missing && `帧不存在=${missing}`, mismatch && `哈希不符=${mismatch}`, noHash && `无 contentHash=${noHash}`,
      bytesBad && `字节数不符=${bytesBad}`, !real && `gitSha 不可核实(${sha || "空"} ⇒ ${verdict})`].filter(Boolean).join(" ");
    failReasons.push(`${toRelPosix(m)} 共 ${shots.length} 帧 :: ${why}`);
  }
  // 只改打印，不改判定：原写法 m.replace(repo + "/")，Windows 下 m 与 repo 都是反斜杠路径，
  // "D:\…\reports" 里插个正斜杠前缀永远剥不掉 → 日志打出全量绝对路径。走同一条归一化流水线拿相对路径。
  console.log(`  ${toRelPosix(m)}  shots=${shots.length} matched=${matched} noHash=${noHash} missing=${missing} bytesOk=${bytesOk} bytesBad=${bytesBad} gitSha=${sha || "-"} → ${verdict}`);
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

console.log(`CORPUS_SCANNED=${scanned} CORPUS_EXPIRED_GITSHA=${expired} CORPUS_PROBLEMS=${fail}${scoped ? "（限定 scope=" + scopeArg.join("+") + "，生产者侧降级 INFO）" : ""}`);
/* 判红必须当场说清是哪几份、缺什么。原来只有一个 CORPUS_PROBLEMS=N 的计数，
   读的人得自己在几十行里逐行对数字找原因 —— 一个不指名道姓的红和没有证据一样没用。 */
for (const r of failReasons) console.log("  CORPUS_PROBLEM " + r);
console.log(fail || hardBlocking.some((h) => h.includes("≠ HEAD")) ? "CORPUS_RESULT=FAIL（存在不可背书证据或硬编码 SHA）" : "CORPUS_RESULT=PASS");
process.exit(fail || hardBlocking.some((h) => h.includes("≠ HEAD")) ? 1 : 0);
