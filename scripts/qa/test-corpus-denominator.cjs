/* verify-evidence-corpus 的「在册分母 + advisory/blocking 两轴」自检（lane: L16 r16，2026-09-30）。
 *
 * 起因（盘上实测，不是假想）：门遍历的是各 manifest 的 shots 数组，**不是** reports/screenshots/** 的
 * tracked 集合。用户 2026-09-30 删掉盘上截图后，`git ls-files --deleted` 报 3849 个在册缺席（本次运行中
 * 又变成 3850 —— 别的车道还在动盘），而门点名只看见其中 3 个；配了仓外证据库那一发更是
 * `CORPUS_PROBLEMS=0` 并 PASS —— 那 3846 个对门的一个字节都没影响过。这一格从前**没有任何读数**：
 * 文件头注释写着"现在新增一行 CORPUS_*_DENOM_* 具名读数"，而 `grep -n DENOM` 只命中那条注释本身
 * （HEAD 里那版连 STRICT/ls-files 都没有 ⇒ 承诺过的机器件从未落盘）。本文件测的就是补上后的读数与两轴。
 *
 * 断言的骨架（判据必须能给阳性，恒 0 的读数等于没量）：
 *   A 真仓全域：五行 CORPUS_DENOM_* 都存在，且与本文件**独立复算**的数相等；盲区数必须非零且是主导项；
 *   B 真仓窄 scope：--strict 把被删除集背书的那一份退回判红，且退回改前的逐字写法（复现旧判据）；
 *   C 一次性夹具仓（.zcode/tmp 下自己的独立 git 仓库，绝不碰 reports/screenshots/**）：
 *      C1 在册后删除 ⇒ advisory、不进 PROBLEMS；未被点名的那帧 ⇒ BLINDSPOT=1（当前盲区的缩小版；
 *         真仓今天没有当前盲区，3965 是历史删除账的残留，见 2026-10-28 段）；
 *      C2 **关键反证**：把这些帧重新放回盘上 ⇒ advisory / ABSENT / BLINDSPOT 三格读数必须全部变化
 *         （不变就说明这条轴量的是常数而不是盘，正是本轮点名要治的死代码形状）；删掉后读数复现 C1；
 *      C3 从未入库的缺席 ⇒ 删除集给不出凭据 ⇒ 照旧判红（advisory 不是万能豁免，红不许被洗成绿）；
 *      C4 --strict 下 C1 那批又变红（判红权在旗标，不在判据；读数不随旗标漂移）；
 *   D 变异：把"能否被删除集背书"这个谓词放宽成恒真 ⇒ C3 那格必绿 ⇒ 本文件的断言必须变红。
 *     活文件全程逐字节未变（只动 .zcode/tmp 下的替身），替身用完删掉并复核不在盘上。
 *     ⚠ 这一节 2026-09-30 由 L16b 接手重写：上一版把 --root 传给 anchor=真实仓 的替身 ⇒ 门解出
 *     <repo>/fx（不存在）⇒ 扫描集为空 exit=2 ⇒ live 与 mutant **同样** bad=2，"变异必红"于是靠路径
 *     没接上而通过（假阳性的反证）。现在每个夹具配一份锚到**该夹具根**的 live/relaxed 替身，
 *     两者只差谓词那一行，并要求 live 侧 bad==0 —— 没有这条，mutant 的红说明不了任何事。
 *
 * 为什么 B 不再跑第二发全域（实测出来的约束，不是洁癖）：全域一发 113s，两发 + 夹具 = **289s**，
 * 距聚合器 run-qa-selftests.mjs 的 spawnSync timeout:300000 只剩 11s ⇒ 并发车道一挤就被误杀成失败。
 * 窄 scope（exec-a-mock-final 一棵子树）实测 16s / 23s，问的是同一件事。
 * 〔2026-09-30 复量：安静盘（无并发车道）全域一发 21s、本文件整发 21s 跑完 56 格。
 *   289s 那一发是三车道并发 + 冷缓存时量到的 ⇒ "不许跑第二发全域"这条约束继续成立，
 *   但聚合器 300s 上限的余量并不是恒定的 11s —— 别把它当舒适区。〕
 *
 * 2026-10-28 重钉（接手的盘上实测，不是猜；判成 (b) 不是 (a)）：
 *   2026-09-30 用户删盘上截图确曾是书面裁定（本文件上面的起因段与门里 2026-09-30 那段都记着）；
 *   但后续两个提交把「选定删除集」从**当前**语料的凭据改成了历史账：
 *     · bfdec13d（2026-10-09，一个 API 功能提交）把 3851 张截图的删除连带提交进了库；
 *     · 04a0a221（2026-10-24）又把其中被清单点名的 5 张 round-7 执行帧放回盘上，提交说明逐字写着
 *       它们是「被无关提交连带删掉」的 —— 这 5 张正是 exec-a-mock-final 清单里那 5 条历史具名路径。
 *   今天 `git ls-files --deleted -- reports` = 0（瞬时删除集为空），`git log --diff-filter=D -- reports`
 *   = 3970 条历史删除账（3851 截图 + 119 非截图）；其中 6 条又被跟踪：
 *     · 04a0a221 放回 5 张被清单点名的 round-7 执行帧（exec-a-mock-final 那 5 条）；
 *     · 61315a93 把 8e69c124 按裁定移出跟踪的 `exec-v37-nearby/exec-results.json` 又加了回来
 *       （这条没有任何清单点名它）。
 *   ⇒ 3964 条已不在当前索引里。门的 BLINDSPOT 报 3965 = 这 3964 + 那条回盘但未具名的台账，
 *   所以它既不是当前缺席、也不是当前盲区。当前真正缺席的具名帧 = 144（round-1），它们从未入库，
 *   历史账也给不出凭据 ⇒ 仍 blocking。
 *   所以 (a)「删除集本来就该为空、3970 是分母算错」不成立：3846 张确实已出册（只是不再被任何清单点名，
 *   构不成当前缺席）；成立的是 (b)「删除曾是裁定、被后来的补录覆盖」。
 *   原判据「门点名的缺席 == 复算的交集」把 3970 当成了当前分母 ⇒ 门按历史账点名 5 条已回盘的帧，
 *   复算按当前缺席数 0 条，两边量的不是同一件事。本文件从此只守**当前基线**三件事：
 *     ① 门报的当前缺席（gateNamedAbsent=144）与独立遍历逐条相等，且全部无凭据 ⇒ blocking；
 *     ② 历史账里被清单点名的路径全部已回盘（5/5，均在盘且被跟踪）⇒ 不许再把它们读成「又丢了」；
 *     ③ 历史账余数拆成「已出册 3964 + 回盘未具名 1」如实记录（两者都不是当前缺席）；
 *        advisory 轴的活体证明仍由 C1/C3 夹具承担（真仓今天 advisory=0，不是把这条轴关了）。
 *   ⚠ 94c286bf（2026-09-29「补录 round-1~8 截图」）发生在 09-30 删除**之前**，它不是让删除集失效的
 *   那个提交；真正的恢复是 04a0a221。别把这两枚提交记混 —— 本判据的日期/提交号都以 git 读数为准。
 *
 * 标签写法守同门两条硬规矩（test-corpus-legacy-window.cjs:19-21、test-corpus-sha-axis.cjs:17-19）：
 * 断言标签里不能出现 `CORPUS_RESULT=FAIL` 原形（聚合器 run-qa-selftests.mjs:52 取输出里**第一个**
 * `[A-Z]{2,8}_(TEST|RESULT)=(PASS|FAIL)`），引用判据名一律写成 `CORPUS-RESULT`；门体输出不回显。
 *
 * 用法：node22 scripts/qa/test-corpus-denominator.cjs
 *       对放宽判定的替身做 A/B：QA_CORPUS_GATE=<替身路径> node22 scripts/qa/test-corpus-denominator.cjs
 *       （PATH 上的 node 是 v16，会崩在门里的 import.meta.dirname）
 */
const fs = require("node:fs");
const { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } = fs;
const { createHash } = require("node:crypto");
const { join, resolve, basename } = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");
const { carryRelativeDeps, relativeImportSpecifiers } = require("./gate-substitute-deps.cjs");

const REPO = resolve(__dirname, "..", "..");
const LIVE_GATE = join(REPO, "scripts", "qa", "verify-evidence-corpus.mjs");
const QA_DIR = join(REPO, "scripts", "qa");
const GATE = process.env.QA_CORPUS_GATE ? resolve(process.env.QA_CORPUS_GATE) : LIVE_GATE;
const NODE = process.execPath;
const RUN = `${process.pid}-${Date.now().toString(36)}`;   // 每次一发一个独立目录：win32 上"删除还没落地、新写已经开跑"会互相抹掉
const FX = join(REPO, ".zcode", "tmp", "corpusdenom-fx-" + RUN);
const MUT = join(REPO, ".zcode", "tmp", "corpusdenom-mut-" + RUN);
const ANCHOR = 'const repo = resolve(here, "../..");';
const PRED = "DENOM.absentSet.has(foldCase(keyOf(p)))";
const PNG_MAGIC = Buffer.from("89504e470d0a1a0a", "hex");
const sha16 = (b) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const git = (cwd, ...a) => { try { return execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch { return ""; } };
/* 夹具的写操作不许静默失败：git() 出错返回 ""，若 add 的 pathspec 没命中就什么也没入库，
   而下面的断言会把"门看不见缺席"读成"没有缺席"—— 一次性夹具尤其要 fail-fast，否则测的是空气。 */
const gitMust = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const commit = (cwd, ...a) => gitMust(cwd, "-c", "user.name=lane16", "-c", "user.email=lane16@invalid", ...a);

let fail = 0, cases = 0;
const ok = (cond, label, detail) => {
  cases++;
  if (cond) console.log(`  ok   ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? "  <<" + String(detail).slice(0, 260) + ">>" : ""}`); }
};

/* ---------- 门的读数（只取数，不回显门体） ---------- */
function runGate(gatePath, args, cwd) {
  const env = { ...process.env }; delete env.QA_EVIDENCE_STORE;   // 库轴有两个来源，继承进来就不是同一发了
  const r = spawnSync(NODE, [gatePath].concat(args), { cwd: cwd || REPO, encoding: "utf8", timeout: 300000, env, maxBuffer: 64 * 1024 * 1024 });
  const body = (r.stdout || "") + (r.stderr || "");
  const n = (re) => { const m = body.match(re); return m ? Number(m[1]) : null; };
  return {
    code: r.status, body,
    /* 取数必须锚到那一行本尊：门现在的解释句里也会出现 "PROBLEMS" 字样，用裸 CORPUS_PROBLEMS=(\d+) 会把
       散文里那个 0 读成门的判决 —— 一个假绿。下游（emit-round-report 的 gateKv）也是首匹配口径 ⇒ 门的
       stdout 里这个键**只许出现一次**，本文件下面把这条也断言了。 */
    problems: n(/^CORPUS_SCANNED=\d+ CORPUS_EXPIRED_GITSHA=\d+ CORPUS_PROBLEMS=(\d+)/m),
    problemsTokenHits: (body.match(/CORPUS_PROBLEMS=\d/g) || []).length,
    trackedFiles: n(/CORPUS_DENOM_TRACKED source=\S+ root=\S+ trackedFiles=(\d+)/),
    trackedAbsent: n(/CORPUS_DENOM_ABSENT trackedAbsentFiles=(\d+)/),
    trackedAbsentFrames: n(/trackedAbsentFrames=(\d+)/),
    trackedAbsentNonImage: n(/trackedAbsentNonImage=(\d+)/),
    gateItems: n(/CORPUS_DENOM_SCANNED gateItems=(\d+)/),
    namedPaths: n(/gateNamedPaths=(\d+)/),
    namedAbsent: n(/gateNamedAbsent=(\d+)/),
    vouched: n(/vouchedByDeletionSet=(\d+)/),
    notVouched: n(/notVouched=(\d+)/),
    namedByGate: n(/CORPUS_DENOM_BLINDSPOT absentNamedByGate=(\d+)/),
    neverOpened: n(/absentNeverOpenedByGate=(\d+)/),
    advisoryFrames: n(/CORPUS_DENOM_AXIS advisoryFrames=(\d+)/),
    advisoryManifests: n(/advisoryManifests=(\d+)/),
    blockingFrames: n(/blockingFrames=(\d+)/),
    strictInLine: (body.match(/CORPUS_DENOM_AXIS .*strict=(\w+)/) || [])[1] || "",
    advisoryFiles: (body.match(/^ {2}CORPUS_ADVISORY_FILE (\S+)/gm) || []).map((l) => l.trim().replace(/^CORPUS_ADVISORY_FILE /, "")),
    problemFiles: (body.match(/^ {2}CORPUS_PROBLEM (\S+)/gm) || []).map((l) => l.trim().replace(/^CORPUS_PROBLEM /, "")),
    hasDenomLines: ["CORPUS_DENOM_TRACKED", "CORPUS_DENOM_ABSENT", "CORPUS_DENOM_SCANNED", "CORPUS_DENOM_BLINDSPOT", "CORPUS_DENOM_AXIS"]
      .filter((k) => new RegExp("^" + k + "\\b", "m").test(body)),
  };
}

/* ---------- 本文件自己的尺子：独立复算三个集合（不读门的数，也不共享门的代码路径） ---------- */
const isAbs = (p) => /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith("/");
const fold = (s) => (process.platform === "win32" ? s.toLowerCase() : s);
const norm = (p) => fold(p.split("\\").join("/"));
function walkManifests(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir)) {
    const p = join(dir, n);
    let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (n !== "node_modules") walkManifests(p, out); }
    else if (/manifest.*\.json$/i.test(n)) out.push(p);
  }
  return out;
}
function independentSets(repoRoot, rootRel) {
  const trackedList = git(repoRoot, "ls-files", "--", rootRel).split(/\r?\n/).filter(Boolean);
  const trackedSet = new Set(trackedList.map(norm));
  /* 2026-10-18：与门同源但**独立算**——缺席凭据取两源并集：
     ①工作树瞬时 ls-files --deleted；②git log --diff-filter=D（被提交删掉的路径）。
     账主把选定删除提交进去后 ① 归零，只靠 ① 就会把"按裁定删的"读成"拿不出凭据的"。
     2026-10-28 补：两源并集是**历史删除账**，不是"当前缺席"。其中「历史删过、今天又被跟踪」的
     路径（今天=04a0a221 放回的 5 帧）必须单独数出来，否则门按历史账点名它们时会被误读成当前缺席。 */
  const transientList = git(repoRoot, "-c", "core.quotepath=off", "ls-files", "--deleted", "--", rootRel)
    .split(/\r?\n/).filter(Boolean).map(norm);
  const committedList = git(repoRoot, "-c", "core.quotepath=off", "log", "--diff-filter=D", "--name-only", "--pretty=format:", "--", rootRel)
    .split(/\r?\n/).filter(Boolean).map(norm);
  const absent = new Set([...transientList, ...committedList]);
  const named = new Set(); let items = 0, absentNamed = 0, namedAbsent = 0;
  for (const m of walkManifests(join(repoRoot, ...rootRel.split("/")))) {
    let j; try { j = JSON.parse(readFileSync(m, "utf8")); } catch { continue; }
    const shots = j.shots ?? j.frames ?? [];
    if (!Array.isArray(shots) || !shots.length) continue;
    for (const s of shots) {
      const p = s.path || s.file || "";
      if (!p) continue;
      items++;
      // 比较键＝仓相对方言（与 ls-files 同方言）；存在性问的是解析到绝对路径之后的事。两者混成一个是本仓反复踩的方言坑。
      const abs = isAbs(p) ? p : join(repoRoot, p);
      const pre = norm(repoRoot) + "/";
      const k = norm(abs).startsWith(pre) ? norm(abs).slice(pre.length) : norm(abs);
      named.add(k);
      if (!existsSync(abs)) { namedAbsent++; if (absent.has(k)) absentNamed++; }
    }
  }
  /* 四个只服务**当前基线**的派生量（与门的同名读数一一对账，而不是把 3970 当分母）：
       namedInAbsent  = 清单点名的路径 ∩ 历史删除账（不管今天在不在盘上）→ 对应门的 absentNamedByGate；
       restoredNamed  = 上一格中今天又被跟踪的（= 已回盘）→ 必须等于 namedInAbsent，否则有帧"回盘没回册"；
       restoredUnnamed = 回了索引但没有任何清单点名的历史删除路径 → 它仍在门的 BLINDSPOT 里，
                         但它不是当前缺席，必须单独扣出来；
       stillGone      = 历史删除账里今天已不在索引中的 → 历史残留（门的 BLINDSPOT 减掉 restoredUnnamed）。 */
  let namedInAbsent = 0, restoredNamed = 0, restoredCount = 0;
  for (const k of named) {
    if (!absent.has(k)) continue;
    namedInAbsent++;
    if (trackedSet.has(k)) restoredNamed++;
  }
  let stillGone = 0;
  for (const k of absent) {
    if (trackedSet.has(k)) restoredCount++;
    else stillGone++;
  }
  /* restoredUnnamed = 回了索引、但没有任何清单点名的历史删除路径（今天=61315a93 加回的
     exec-v37-nearby/exec-results.json）。门的 BLINDSPOT 会把它也算进 "never opened"，
     所以它的 3965 必须拆成 stillGone(3964)+restoredUnnamed(1)，不能整块读成当前盲区。 */
  const restoredUnnamed = restoredCount - restoredNamed;
  return { trackedCount: trackedList.length, absentCount: absent.size, transientCount: transientList.length, committedCount: committedList.length,
    named: named.size, items, absentNamed, namedAbsent, namedInAbsent, restoredNamed, restoredUnnamed, stillGone };
}

/* ================= A. 真仓全域：读数存在且等于独立复算 =================
   盘在被并发车道动（本车道实测：缺席总数 12:40=3850、点名缺席 3 帧→4 帧），而全域一发要 113s，
   门的数落在**跑前**与**跑后**两次独立复算之间即算对上；readdir 或 manifest 并集当分母的话两个都对不上。
   漂移本身印成 DIAGNOSTIC 行，不靠"容忍"把它藏起来。
   2026-10-28：诊断行把三个数分开印，别再拿一个 "namedAbsent" 混指两件事 ——
     历史删除账（门 trackedAbsent / 复算 absentCount）、当前具名缺席（门 namedAbsent / 复算 namedAbsent）、
     历史账里被清单点名的回盘帧（门 namedByGate / 复算 namedInAbsent）。上一版把 absentNamed 印成
     namedAbsent，读的人会把「历史账里缺且被点名=0」看成「当前没有缺席」，正是这次要治的混读。 */
const SETS0 = independentSets(REPO, "reports");
const LIVE_SHA = sha16(readFileSync(LIVE_GATE));
const GA = runGate(GATE, []);
const SETS1 = independentSets(REPO, "reports");
const drift = SETS0.absentCount !== SETS1.absentCount || SETS0.items !== SETS1.items
  || SETS0.namedAbsent !== SETS1.namedAbsent || SETS0.namedInAbsent !== SETS1.namedInAbsent;
const setEq = (gateVal, k) => gateVal === SETS0[k] || gateVal === SETS1[k];
console.log(`A_DIAGNOSTIC 盘漂移=${drift ? "有" : "无"} 复算(跑前) 历史删除=${SETS0.absentCount}(瞬时${SETS0.transientCount}+提交${SETS0.committedCount}) 当前具名缺席=${SETS0.namedAbsent} 其中历史账背书=${SETS0.absentNamed} 历史账具名回盘=${SETS0.restoredNamed} 回盘未具名=${SETS0.restoredUnnamed} 已出册=${SETS0.stillGone} items=${SETS0.items} :: (跑后) 历史删除=${SETS1.absentCount} 当前具名缺席=${SETS1.namedAbsent} 其中历史账背书=${SETS1.absentNamed} 历史账具名回盘=${SETS1.restoredNamed} 回盘未具名=${SETS1.restoredUnnamed} 已出册=${SETS1.stillGone} items=${SETS1.items} :: 门=历史${GA.trackedAbsent}/当前缺席${GA.namedAbsent}/遍历${GA.gateItems}`);
ok(GA.hasDenomLines.length === 5, "A 门确实印出五行 CORPUS_DENOM_*（TRACKED/ABSENT/SCANNED/BLINDSPOT/AXIS，全是可 grep 的机器行）",
  "命中=" + GA.hasDenomLines.join(","));
ok(setEq(GA.trackedAbsent, "absentCount"), `A 历史删除账==独立复算的两源并集（瞬时 --deleted ${SETS0.transientCount} ∪ 提交删除 ${SETS0.committedCount}；${SETS0.absentCount}~${SETS1.absentCount}）——这是历史账，别再当当前分母`,
  `门=${GA.trackedAbsent} 复算=${SETS0.absentCount}/${SETS1.absentCount}`);
ok(setEq(GA.namedAbsent, "namedAbsent"), `A 门点名的**当前**缺席（帧不存在）==独立复算（${SETS0.namedAbsent}~${SETS1.namedAbsent}，全部 round-1；这批从未入库）`,
  `门=${GA.namedAbsent} 复算=${SETS0.namedAbsent}/${SETS1.namedAbsent}`);
ok(setEq(GA.namedByGate, "namedInAbsent"), "A 门 BLINDSPOT 的『具名历史删除』==独立复算（5 条已由 04a0a221 放回盘上，不是当前缺席）",
  `门=${GA.namedByGate} 复算=${SETS0.namedInAbsent}/${SETS1.namedInAbsent}`);
ok(setEq(GA.gateItems, "items") && setEq(GA.namedPaths, "named"), "A 门的遍历集==独立复算（条目数与去重路径数）",
  `items 门=${GA.gateItems}/复算=${SETS0.items}~${SETS1.items}，paths 门=${GA.namedPaths}/复算=${SETS0.named}~${SETS1.named}`);
ok(GA.neverOpened === GA.trackedAbsent - GA.namedByGate,
  "A BLINDSPOT 余数==历史删除账减去门点名的历史具名路径（对账闭合，不是另算一套）",
  `历史=${GA.trackedAbsent} 具名=${GA.namedByGate} 余=${GA.neverOpened}`);
ok(GA.neverOpened === SETS0.stillGone + SETS0.restoredUnnamed
  || GA.neverOpened === SETS1.stillGone + SETS1.restoredUnnamed,
  "A BLINDSPOT 余数==已出册 + 回盘但未被点名的（今天 3964+1=3965；后者=61315a93 加回的 exec-v37-nearby 台账，两者都不是当前缺席）",
  `neverOpened=${GA.neverOpened} 已出册=${SETS0.stillGone}/${SETS1.stillGone} 回盘未具名=${SETS0.restoredUnnamed}/${SETS1.restoredUnnamed}`);
ok(GA.vouched + GA.notVouched === GA.namedAbsent, "A 两轴相加==当前点名缺席总数（不许有一格悄悄蒸发）",
  `${GA.vouched}+${GA.notVouched} vs ${GA.namedAbsent}`);
ok(GA.advisoryFrames === GA.vouched && GA.blockingFrames === GA.notVouched,
  "A AXIS 的 advisory/blocking 与 SCANNED 的两格同源（同一件事不许有两个数）",
  `advisory=${GA.advisoryFrames} blocking=${GA.blockingFrames}`);
ok(setEq(GA.vouched, "absentNamed"), "A 当前缺席里能在历史删除账找到凭据的==独立复算（今天=0：5 条历史具名路径已全部回盘）",
  `门=${GA.vouched} 复算=${SETS0.absentNamed}/${SETS1.absentNamed}`);
const EXEC_MANIFEST = "reports/audit/round-7/exec-a-mock-final/manifest-detail.json";
const ROUND1_MANIFEST = "reports/screenshots/round-1/manifest.json";
ok(!GA.advisoryFiles.includes(EXEC_MANIFEST) && GA.advisoryFrames === 0,
  "A exec-a-mock-final 的 650 帧全在盘上（含 04a0a221 放回的 5 帧）⇒ 不再走 CORPUS_ADVISORY_FILE；advisory 轴由 C1 夹具继续承担",
  `advisoryFiles=${GA.advisoryFiles.length} advisoryFrames=${GA.advisoryFrames}`);
ok(!GA.problemFiles.includes(EXEC_MANIFEST) && GA.problemFiles.includes(ROUND1_MANIFEST) && GA.problemFiles.length === 1,
  "A 唯一的 problem 是 round-1（144 帧从未入库 ⇒ 无凭据 blocking）；exec-a-mock-final 不判红",
  "problemFiles=" + GA.problemFiles.join("|"));
ok(SETS0.namedInAbsent === SETS0.restoredNamed && SETS0.namedInAbsent > 0,
  "A 历史删除账里被清单点名的路径全部已回盘（5/5，均在盘且被跟踪）⇒ 没有『已回盘却仍被算作缺席』的具名残余",
  `具名历史=${SETS0.namedInAbsent} 已回盘=${SETS0.restoredNamed}`);
ok(GA.problemsTokenHits === 1,
  "A 门体里 `CORPUS_PROBLEMS=<数字>` 只出现一次（解释句不得复用这个键的字面形式：面板与下游都按首匹配取数，散文里再出现一个 0 就会被读成门的判决）",
  "hits=" + GA.problemsTokenHits);
ok(setEq(GA.trackedFiles, "trackedCount"), "A 在册分母==独立复算的 git ls-files（trackedFiles 那一格也是同一个数）",
  `门=${GA.trackedFiles} 复算=${SETS0.trackedCount}/${SETS1.trackedCount}`);
ok(GA.problems >= 1 && GA.code === 1, "A 全域默认档：PROBLEMS>=1 且退出码 1（只降一格，红没被洗成绿）",
  `problems=${GA.problems} exit=${GA.code}`);
ok(GA.trackedAbsentFrames !== null && GA.trackedAbsentNonImage !== null
  && GA.trackedAbsentFrames + GA.trackedAbsentNonImage === GA.trackedAbsent,
  "A 图扩展 + 非图扩展 == 全部历史删除账（对账闭合；两个数本就不该相等，账里混着 .tsv/.json/.log）",
  `frames=${GA.trackedAbsentFrames} nonImage=${GA.trackedAbsentNonImage} files=${GA.trackedAbsent}`);

/* ================= B. 真仓窄 scope：当前基线＋--strict 的 +1 是哪一格 =================
   真仓、真清单、真删除账，只是把扫描集收到 exec-a-mock-final 一棵子树 ⇒ 实测 16s/23s 而不是 113s×2。
   为什么不再跑第二发全域（实测出来的约束）：全域一发 113s，两发 + 夹具 = **289s**（本车道 12:47 实跑量到），
   距聚合器 run-qa-selftests.mjs 的 spawnSync timeout:300000 只剩 11s ⇒ 并发车道一挤就被误杀成测试失败。
   分母**不随 scope 缩**（它按 --root=reports 算），所以两档的 DENOM 读数必须逐字相同 —— 这正是
   "旗标只改判决、不改读数"的实证。
   2026-10-28 重钉：这棵子树的 650 帧今天全在盘上（04a0a221 放回 5 帧）⇒ 默认档 problems=0 是**当前基线**，
   不是判据放宽；--strict 的 +1 只来自 CORPUS_DENOM_BLINDSPOT（3964 条已出册 + 1 条回盘未具名），
   不再有「帧不存在」行。别把 +1 读回「那 5 帧又丢了」—— 它们已在盘上且被跟踪。 */
const SCOPE_B = "reports/audit/round-7/exec-a-mock-final/";
const GB = runGate(GATE, ["--scope", SCOPE_B]);
const GS = runGate(GATE, ["--scope", SCOPE_B, "--strict"]);
ok(GB.problems === 0 && GB.code === 0,
  "B 真仓窄 scope 默认档：650 帧全在盘上 ⇒ problems=0（改前那 5 帧缺席已被 04a0a221 放回；advisory 不再被真仓这一份撑着）",
  `problems=${GB.problems} exit=${GB.code}`);
ok(GB.advisoryFiles.length === 0 && GB.namedAbsent === 0 && GB.vouched === 0 && GB.blockingFrames === 0,
  "B 默认档：这份清单没有缺席 / 没有 advisory / 没有 blocking（advisory 轴的活体证明在 C1/C3，不靠真仓回盘帧）",
  `advisoryFiles=${GB.advisoryFiles.length} namedAbsent=${GB.namedAbsent} vouched=${GB.vouched} blocking=${GB.blockingFrames}`);
ok(!/CORPUS_PROBLEM .*exec-a-mock-final.*帧不存在=/.test(GS.body),
  "B --strict：不再给这份清单补『帧不存在』（650 帧全在盘上；strict 只恢复无凭据缺席那一格，不伪造缺席）", "");
ok(GS.problems === GB.problems + 1,
  "B --strict：相对默认档只多历史盲区那一格（+1），不是回盘帧的 +1",
  `strict=${GS.problems} default=${GB.problems}`);
ok(/CORPUS_PROBLEM .*不在任何被遍历的 manifest 点名列里/.test(GS.body) && !/（另有/.test(GS.body),
  "B --strict：问题行只讲历史盲区（3964 已出册 + 1 回盘未具名），没有『另有 N 帧属选定删除集』的附注", "");
ok(GS.strictInLine === "on" && GB.strictInLine === "off", "B 两发 AXIS 行各自自报档位（读者不用猜这一发是哪一档）",
  `default=${GB.strictInLine} strict=${GS.strictInLine}`);
ok(GS.trackedAbsent === GB.trackedAbsent && GS.neverOpened === GB.neverOpened
  && GS.vouched === GB.vouched && GS.blockingFrames === GB.blockingFrames && GS.gateItems === GB.gateItems,
  "B 两档的**读数**一字不变（分母按 --root 算、不随 scope/旗标缩），变的只是判决 ⇒ 咨询轴不会因旗标而漂移",
  `absent ${GB.trackedAbsent}/${GS.trackedAbsent} gap ${GB.neverOpened}/${GS.neverOpened} vouched ${GB.vouched}/${GS.vouched}`);
ok(GS.code === 1, "B --strict 退出码 1（拿它当门禁时确实拦得住）", "exit=" + GS.code);

/* ================= 夹具：一次性独立 git 仓库 ================= */
function variant(dst, opts) {
  const live = readFileSync(LIVE_GATE, "utf8");
  let t = live;
  if (opts.anchor) {
    if (live.split(ANCHOR).length - 1 !== 1) throw new Error("anchor 出现次数不是 1");
    t = t.replace(ANCHOR, `const repo = ${JSON.stringify(opts.anchor)};`);   // 机械定位，不动判据
  }
  if (opts.relaxed) {
    if (live.split(PRED).length - 1 !== 1) throw new Error("predicate 出现次数不是 1");
    t = t.replace(PRED, "true");                                            // 放宽：一律当"有凭据"
  }
  mkdirSync(resolve(dst, ".."), { recursive: true });
  writeFileSync(dst, t, "utf8");
  /* 替身必须带上活门的相对依赖。ESM 的 `./x.mjs` 按**导入方自身位置**解析，替身在
     .zcode/tmp 下 ⇒ 少了这一行就会 ERR_MODULE_NOT_FOUND、门零输出，本文件的读数于是全成
     null（2026-09-30 实测：断言失败数=14 且每一格 <<...=null>>）。缺依赖不是"少搬一个文件"
     这种小事，是把整发自检变成空气。 */
  const dep = carryRelativeDeps({ dstPath: dst, text: t, srcDir: QA_DIR });
  if (dep.missing.length) throw new Error("替身依赖搬不完: " + dep.missing.join(" | "));
  return t;
}
const frameBytes = (name, f) => Buffer.concat([PNG_MAGIC, Buffer.from("lane16-fixture-" + name + "-" + f, "utf8")]);

function makeFixture(name, opts) {
  const trackedFrames = opts.trackedFrames || [];
  const untrackedFrames = opts.untrackedFrames || [];
  const root = join(FX, name);
  hardRm(root);                       // 每个夹具自己先清一次：上一发的残留会让这一发失真
  const area = join(root, ...opts.rootRel.split("/"));
  mkdirSync(join(area, "img"), { recursive: true });
  git(root, "init", "-q");
  writeFileSync(join(root, "README.txt"), "lane16 throwaway fixture repo\n");
  gitMust(root, "add", "-A"); commit(root, "commit", "-q", "-m", "base");
  const baseSha = gitMust(root, "rev-parse", "HEAD");
  const img = join(area, "img");
  for (const f of trackedFrames) writeFileSync(join(img, f), frameBytes(name, f));
  for (const f of untrackedFrames) writeFileSync(join(img, f), frameBytes(name, f));
  const shots = opts.namedFrames.map((f) => {
    const rel = `${opts.rootRel}/img/${f}`, abs = join(img, f);
    return { identity: "A", route: "pages/x/index", state: "默认", path: rel, file: rel,
      bytes: existsSync(abs) ? fs.statSync(abs).size : 0, contentHash: sha16(frameBytes(name, f)) };
  });
  const manPath = join(area, "manifest-detail.json");
  writeFileSync(manPath, JSON.stringify({ gitSha: baseSha, generatedAt: new Date().toISOString(), shots }, null, 1));
  // 只把该入库的入库：untrackedFrames 留在盘上但**永不 add** ⇒ 它就是"从未入库的缺席"那一格
  const rel = (p) => `${opts.rootRel}/${p}`;
  gitMust(root, "add", "--", rel("manifest-detail.json"), ...trackedFrames.map((f) => rel("img/" + f)));
  commit(root, "commit", "-q", "-m", "frames");
  const gatePath = join(MUT, name + ".gate.mjs");
  variant(gatePath, { anchor: root, relaxed: false });
  return { name, root, area, img, gatePath, rootRel: opts.rootRel, allFrames: trackedFrames.concat(untrackedFrames) };
}
const removeFrames = (fx) => { for (const f of fx.allFrames) rmSync(join(fx.img, f), { force: true }); };
const restoreFrames = (fx) => {
  mkdirSync(fx.img, { recursive: true });
  for (const f of fx.allFrames) writeFileSync(join(fx.img, f), frameBytes(fx.name, f));
};
/* win32 上刚被 git 进程碰过的目录常有句柄没放（EBUSY: resource busy, rmdir）—— 一次性夹具清不掉
   就等于在别人的工作树上留垃圾（本仓有过同类坑：巡检残留污染同伴的扫描）。重试 + 短退避，
   最终仍失败则由后面的复核断言把这件事报成红，而不是悄悄放过。 */
function hardRm(p, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try { rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); } catch { /* 继续下一轮 */ }
    if (!existsSync(p)) return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  return !existsSync(p);
}

/* 本车道自己的历史残留（前几发崩在 win32 的 EBUSY 上，留下了带 .git 的夹具目录）：
   只按 corpusdenom-* 前缀清，绝不整目录扫 —— .zcode/tmp 里还有别的车道的东西。 */
const TMP_DIR = join(REPO, ".zcode", "tmp");
if (existsSync(TMP_DIR)) for (const n of fs.readdirSync(TMP_DIR).filter((x) => /^corpusdenom-(fx|mut)/.test(x))) hardRm(join(TMP_DIR, n));
ok(!existsSync(FX) && !existsSync(MUT), "SETUP 本轮的一次性目录干净（每发一个唯一目录名，避免上一发的延迟删除把这一发抹掉）",
  `FX=${existsSync(FX)} MUT=${existsSync(MUT)}`);
ok(!existsSync(join(REPO, "scripts", "qa", "verify-evidence-corpus.mut.mjs")),
  "SETUP 替身只住在 .zcode/tmp 下，活目录 scripts/qa 里没有替身文件", "");
ok(readFileSync(LIVE_GATE, "utf8").split(PRED).length - 1 === 1, "SETUP 活门的背书谓词恰好 1 处（变异与反证都只认这一处）", "");
/* 替身依赖清单是**从活门文本派生**的，不是写死的文件名（写死的清单在门再加一条 import 时会静默漏搬，
   漏搬的后果就是本文件 2026-09-30 那一发：门零输出、14 格读数全 null）。派生出来 0 条也如实说 0 条。 */
const LIVE_SPECS = relativeImportSpecifiers(readFileSync(LIVE_GATE, "utf8"));
ok(LIVE_SPECS.every((s) => s.startsWith("./") && existsSync(join(QA_DIR, basename(s)))),
  `SETUP 活门的相对依赖全部派生且在盘上（共 ${LIVE_SPECS.length} 条）`,
  LIVE_SPECS.join(" | ") || "(无相对依赖)");

/* ---------- C1 在册后被删 ⇒ advisory；未被点名的那帧 ⇒ BLINDSPOT ---------- */
const fx1 = makeFixture("c1", {
  rootRel: "fx", trackedFrames: ["F01.png", "F02.png", "F03.png"], namedFrames: ["F01.png", "F02.png"],
});
removeFrames(fx1);
const args1 = ["--root", "fx", "--scope", "fx/"];
/* 前置量：夹具自己必须先成立，否则下面所有读数都在测空气（同 test-corpus-legacy-window.cjs:100 那条纪律） */
ok(existsSync(join(fx1.area, "manifest-detail.json")) && existsSync(fx1.gatePath),
  "C1 前置量：夹具清单与锚到夹具仓的门替身都在盘上", `man=${existsSync(join(fx1.area, "manifest-detail.json"))} gate=${existsSync(fx1.gatePath)}`);
ok(gitMust(fx1.root, "rev-list", "--count", "HEAD") === "2", "C1 前置量：夹具仓有 2 枚提交（base + frames）",
  "commits=" + gitMust(fx1.root, "rev-list", "--count", "HEAD"));
const C1 = runGate(fx1.gatePath, args1, fx1.root);
ok(C1.problems !== null && C1.trackedAbsent !== null && C1.hasDenomLines.length === 5,
  "C1 前置量：门这一发读得出数（读不到就是夹具/替身坏了，绝不能当成 0 判绿）",
  `problems=${C1.problems} absent=${C1.trackedAbsent} 行=${C1.hasDenomLines.join(",")}`);
const S1 = independentSets(fx1.root, "fx");
ok(C1.trackedAbsent === 3 && S1.absentCount === 3, "C1 在册后删除的 3 帧都被分母读到（git ls-files --deleted 就是这批删除的凭据）",
  `门=${C1.trackedAbsent} 复算=${S1.absentCount}`);
ok(C1.advisoryFrames === 2 && C1.vouched === 2, "C1 被清单点名的 2 帧走 advisory，且这一格**非 0**（这条轴不是恒 0 的死代码）",
  `advisory=${C1.advisoryFrames} vouched=${C1.vouched}`);
ok(C1.problems === 0 && C1.code === 0, "C1 默认档不判红：用户选定删除的缺席不计进 PROBLEMS（裁定明写不许把他行使选择权做成默认红）",
  `problems=${C1.problems} exit=${C1.code}`);
ok(C1.neverOpened === 1 && C1.namedByGate === 2,
  "C1 F03 没被任何清单点名 ⇒ 门结构上打不开它，BLINDSPOT 行把这一格报成 1（夹具里这是当前盲区；真仓今天 3965 是历史删除残留，不是同一件事）",
  `gap=${C1.neverOpened} named=${C1.namedByGate}`);
ok(C1.blockingFrames === 0, "C1 无凭据那一格==0（这一发的点名缺席全部有凭据，符合夹具设定）", "blocking=" + C1.blockingFrames);

/* ---------- C1x 搬运是承重的：主动摘掉替身的依赖 ⇒ 同一枚替身立刻读不出数 ----------
   不摘一次就永远不知道 variant() 里那行 carryRelativeDeps 挡的是什么（2026-09-30 的 14 个 null
   正是它缺失时的形状）。摘完必须搬回来并复现原读数，否则后面的 C2/C3/C4 测的是缺文件不是判据。 */
for (const s of LIVE_SPECS) rmSync(join(MUT, basename(s)), { force: true });
const C1X = runGate(fx1.gatePath, args1, fx1.root);
ok(C1X.problems === null && /ERR_MODULE_NOT_FOUND|Cannot find module/.test(C1X.body),
  "C1x 摘掉依赖后替身跑不出读数（本文件那一发的失效形状，这里主动复现一次证明搬运在受力）",
  `problems=${C1X.problems} body=${C1X.body.slice(0, 90).replace(/\s+/g, " ")}`);
const recarry = carryRelativeDeps({ dstPath: fx1.gatePath, text: readFileSync(fx1.gatePath, "utf8"), srcDir: QA_DIR });
ok(recarry.missing.length === 0 && LIVE_SPECS.every((s) => existsSync(join(MUT, basename(s)))),
  "C1x 依赖已搬回替身目录（missing=0 且逐条复核在盘上）；复现读数由紧接着的 C2 那一发承担 —— 它必须读得出数，否则这一路断言测的都是缺文件",
  `missing=${recarry.missing.join("|")}`);

/* ---------- C2 关键反证：把 advisory 那批重新放回盘上 ⇒ 读数必须变化 ---------- */
restoreFrames(fx1);
const C2 = runGate(fx1.gatePath, args1, fx1.root);
ok(C2.trackedAbsent === 0 && C2.advisoryFrames === 0 && C2.neverOpened === 0,
  "C2 帧放回盘上后 ABSENT / advisory / BLINDSPOT 三格全部归零 ⇒ 这条轴量的确实是盘上的事实，不是抄死的常数",
  `absent=${C2.trackedAbsent} advisory=${C2.advisoryFrames} gap=${C2.neverOpened}`);
ok(C2.advisoryFrames !== C1.advisoryFrames && C2.trackedAbsent !== C1.trackedAbsent && C2.neverOpened !== C1.neverOpened,
  "C2 对 C1 逐项比较：三格读数**都**变了（任何一格不变就说明那格没接上数据线）",
  `advisory ${C1.advisoryFrames}->${C2.advisoryFrames}, absent ${C1.trackedAbsent}->${C2.trackedAbsent}, gap ${C1.neverOpened}->${C2.neverOpened}`);
ok(C2.namedAbsent === 0 && C2.gateItems === C1.gateItems && C2.namedPaths === C1.namedPaths,
  "C2 遍历集不变而缺席归零 ⇒ 变的是「帧在不在」，不是门看了多少东西（两件事分得开）",
  `namedAbsent=${C2.namedAbsent} items=${C2.gateItems}/${C1.gateItems}`);
removeFrames(fx1);
const C2b = runGate(fx1.gatePath, args1, fx1.root);
ok(C2b.advisoryFrames === C1.advisoryFrames && C2b.neverOpened === C1.neverOpened && C2b.trackedAbsent === C1.trackedAbsent,
  "C2 复核：再删一次，读数回到 C1 那一组 ⇒ 变化是可复现的读数差，不是随机漂移",
  `advisory=${C2b.advisoryFrames} gap=${C2b.neverOpened} absent=${C2b.trackedAbsent}`);

/* ---------- C3 从未入库的缺席 ⇒ 无凭据 ⇒ 照旧判红 ---------- */
const fx3 = makeFixture("c3", {
  rootRel: "fx", trackedFrames: [], untrackedFrames: ["G01.png", "G02.png"], namedFrames: ["G01.png", "G02.png"],
});
removeFrames(fx3);   // 从未 commit ⇒ 不在 ls-files 里 ⇒ 删除集给不出凭据
const args3 = ["--root", "fx", "--scope", "fx/"];
const C3 = runGate(fx3.gatePath, args3, fx3.root);
ok(C3.trackedAbsent === 0 && C3.namedAbsent === 2, "C3 分母里没有它们（从未入库），但清单点名却盘上无==2 ⇒ 两种事实分得开",
  `absent=${C3.trackedAbsent} namedAbsent=${C3.namedAbsent}`);
ok(C3.blockingFrames === 2 && C3.problems === 1 && C3.code === 1,
  "C3 无凭据的缺席照旧进 PROBLEMS 并判红 ⇒ 不是「所有缺失都算 advisory」",
  `blocking=${C3.blockingFrames} problems=${C3.problems} exit=${C3.code}`);
ok(C3.advisoryFrames === 0 && C3.advisoryFiles.length === 0, "C3 advisory 那一格保持 0（没被顺手放宽）",
  `advisory=${C3.advisoryFrames} files=${C3.advisoryFiles.length}`);

/* ---------- C4 --strict 下 C1 那批又变红 ---------- */
const C4 = runGate(fx1.gatePath, args1.concat(["--strict"]), fx1.root);
ok(C4.problems === 2 && C4.code === 1,
  "C4 --strict：advisory 的那份清单回到判红 + 盲区 F03 再计一处 ⇒ 2 且退出码 1",
  `problems=${C4.problems} exit=${C4.code}`);
ok(C4.advisoryFrames === C1.advisoryFrames && C4.neverOpened === C1.neverOpened,
  "C4 读数不随旗标漂移：变的只有判决（同 verify-case-automatable.mjs:332/343 的 --strict 口径）",
  `advisory=${C4.advisoryFrames} gap=${C4.neverOpened}`);

/* ---------- D 变异证明：把背书谓词放宽成恒真 ⇒ 本文件必须变红 ----------
   替身必须"每夹具一枚"：门的仓库根是从**自身文件位置**派生的（resolve(here,"../..")），
   把主仓那枚替身拿去跑夹具，它扫的是主仓的 fx/（不存在）⇒ 空集 exit 2，测的就不是判据而是空气。
   所以每个夹具用它自己那枚锚定好的替身；relaxed 版只多改一处谓词。 */
function battery({ c1, c3 }) {
  let bad = 0;
  const r3 = runGate(c3, args3, fx3.root);
  if (!(r3.blockingFrames === 2 && r3.problems === 1 && r3.advisoryFrames === 0)) bad++;   // 无凭据必须仍判红
  const r1 = runGate(c1, args1, fx1.root);
  if (!(r1.advisoryFrames === 2 && r1.problems === 0)) bad++;                               // 有凭据的仍走 advisory
  return bad;
}
const RELAXED = join(MUT, "verify-evidence-corpus.relaxed.mjs");
{
  const liveText = readFileSync(LIVE_GATE, "utf8");
  ok(liveText.split(PRED).length - 1 === 1, "D 活文件里那条背书谓词恰好出现 1 次（放宽才不会误伤别处）",
    "count=" + (liveText.split(PRED).length - 1));
  const mutText = variant(RELAXED, { anchor: REPO, relaxed: true });
  /* 差异行数==2：一处翻转背书谓词（判据），一处仓库根锚点（机械定位，因为替身不在 scripts/qa 下）。
     别的一个字没动 —— 与 test-corpus-legacy-window.cjs:226 同一写法、同一个理由。 */
  const diffLines = mutText.split("\n").filter((l, i) => l !== liveText.split("\n")[i]).length;
  ok(diffLines === 2, "D 替身与活文件只差 2 行（背书谓词翻转 + 仓库根锚点，判据只动那一格）", "diffLines=" + diffLines);
  const relaxedC1 = variant(join(MUT, "c1.relaxed.mjs"), { anchor: fx1.root, relaxed: true });
  const relaxedC3 = variant(join(MUT, "c3.relaxed.mjs"), { anchor: fx3.root, relaxed: true });
  ok(relaxedC1.split("\n").filter((l, i) => l !== readFileSync(fx1.gatePath, "utf8").split("\n")[i]).length === 1,
    "D 夹具替身相对夹具门只差 1 行（背书谓词；锚点在生成夹具门时已经打好了）", "");
  const badLive = battery({ c1: fx1.gatePath, c3: fx3.gatePath });
  const badMut = battery({ c1: join(MUT, "c1.relaxed.mjs"), c3: join(MUT, "c3.relaxed.mjs") });
  ok(badLive === 0, "D 活判据：两格极性都成立（有凭据⇒advisory、无凭据⇒红）", "bad=" + badLive);
  ok(badMut >= 1, "D 反证：谓词放宽成恒真后 C3 被洗成绿 ⇒ 同一套判据**变红**（断言不是恒真的摆设）",
    `mutant_bad=${badMut} live_bad=${badLive}`);
  console.log(`  NEGATIVE_PROOF live_bad=${badLive} mutant_bad=${badMut}（恒真背书让 C3 的 blockingFrames 2->0、PROBLEMS 1->0）`);
  ok(sha16(readFileSync(LIVE_GATE)) === LIVE_SHA, "D 活文件在整套变异过程中逐字节未变（只动 .zcode/tmp 下的替身）", "");
  ok(existsSync(RELAXED), "D 变异体此刻确实还在盘上（下一步删它并复核）", RELAXED);
}

/* ---------- E. 一次性产物必须清干净（不留残缺，也不污染别人的扫描） ---------- */
hardRm(MUT);
hardRm(FX);
ok(!existsSync(MUT) && !existsSync(FX), "E 替身目录与夹具仓（含它自己的 .git）已删除并复核不在盘上",
  `MUT=${existsSync(MUT)} FX=${existsSync(FX)}`);
ok(!fs.readdirSync(TMP_DIR).some((n) => /^corpusdenom-(fx|mut)/.test(n)),
  "E 复核：.zcode/tmp 下本车道的一次性目录一个都不留（连历史残留一起 swept，不留给下一发）",
  fs.readdirSync(TMP_DIR).filter((n) => /^corpusdenom-(fx|mut)/.test(n)).join("|"));
ok(sha16(readFileSync(LIVE_GATE)) === LIVE_SHA, "E 活门文件与进场时逐字节相同", "");

console.log(`CORPDEN_SUMMARY cases=${cases} fail=${fail} realAbsent=${GA.trackedAbsent} realNamedByGate=${GA.namedByGate} realGap=${GA.neverOpened} realProblems=${GA.problems} head=${(GA.body.match(/HEAD=(\S+)/) || [])[1] || "?"} gate=${GATE === LIVE_GATE ? "live" : "variant"}`);
console.log(`SUMMARY: assertion failures = ${fail}`);
console.log(fail === 0 ? "CORPDEN_TEST=PASS" : "CORPDEN_TEST=FAIL");
process.exit(fail ? 1 : 0);
