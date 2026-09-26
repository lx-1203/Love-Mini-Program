/**
 * 证据完整性门禁（G6 用，v3.2 配套工具）——把"证据 == 盘"从叮嘱变成退出码。
 *
 * 存在的理由（.zcode/research/ISSUE-CENSUS-2026-09-25.md §4 的 D3/D4，均实测）：
 *  - manifest 记的 contentHash 与盘上字节可以不一致（实测一张帧 manifest=3e6b3ce5… 盘上=428a5662…）；
 *  - 目录可以残留上一轮帧而不被发现（实测 50 张孤儿帧，其中 39 张是旧弹窗污染）；
 *  - 状态配额可被"同名不同质"帧凑满：两个不同 state 指向同一字节内容也算两个状态。
 * 只读校验，不写任何文件（除 --json 显式指定的输出）。
 *
 * 用法：node scripts/verify-evidence-integrity.mjs <manifest.json> [--dir <截图根>] [--json out.json]
 * contentHash 算法为实测：sha256(文件字节) 的前 16 位十六进制。
 */
import { readFileSync, existsSync, readdirSync, lstatSync, writeFileSync } from "node:fs";
const evList = (r) => (Array.isArray(r.evidence) ? r.evidence : (r.evidence ? [String(r.evidence)] : []));
import { createHash } from "node:crypto";
import { dirname, join, resolve, relative, sep } from "node:path";

const argv = process.argv.slice(2);
const manifestPath = argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--"));
if (!manifestPath || !existsSync(manifestPath)) {
  console.error(`用法：node scripts/verify-evidence-integrity.mjs <manifest.json> [--dir 截图根]`);
  console.error(`EVIDENCE_RESULT=FAIL reason=缺少或找不到 manifest 参数`);
  process.exit(1);
}
const optFlag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : null;
};

const m = JSON.parse(readFileSync(manifestPath, "utf8"));
const shots = m.shots ?? [];
const norm = (p) => resolve(p).split(sep).join("/");
const hash16 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

let missing = [], mismatch = [], matched = 0, noHash = 0;
for (const s of shots) {
  if (!s.path) { missing.push(`<无 path 字段> ${s.page}/${s.state}`); continue; }
  if (!existsSync(s.path)) { missing.push(s.path); continue; }
  if (!s.contentHash) { noHash++; continue; }  // 未记哈希 ≠ 哈希不符：round-1 的 305 帧整批没有该字段
  const actual = hash16(s.path);
  if (actual === s.contentHash) matched++;
  else mismatch.push(`${s.path} -> manifest=${s.contentHash} 盘上=${actual}`);
}

// 孤儿帧：扫描根目录下存在、但 manifest 未引用的图片文件
const scanRoot = optFlag("dir") || dirname(manifestPath);
const refPaths = (arr) => (arr ?? []).map((z) => (typeof z === "string" ? z : z?.path || "")).filter(Boolean).map(norm);
const listedMain = new Set([
  ...shots.map((s) => norm(s.path || "")),
  ...refPaths(m.zoomFrames),
]);
/* stateNotApplied[] / routeDrifts[] 里的帧也是**合法登记**的：它们确实拍出来了，只是被判定
   「状态未生效 / 落点跳出」，因而不得计入状态配额。首版"已引用集"只算 shots+zoomFrames，
   于是权威索引把 6 张改判帧移出 shots[] 之后，这 6 张盘上真帧被报成孤儿（同一个假阳性第三次出现：
   round-1 的 345 张 zoomFrames 也被这么误报过）。
   但不能并进 main 就完事 —— 只被"非证据数组"引用的帧必须单独可见，否则 DUP_STATE=0 与
   "这些帧还在盘上"两件事会被读成"问题修好了"。 */
const listedNonEvidence = new Set([
  ...refPaths(m.stateNotApplied),
  ...refPaths(m.routeDrifts),
]);
const listed = new Set([...listedMain, ...listedNonEvidence]);
let onlyAsNonEvidence = 0;
// 注意：zoomFrames 是合法登记的辅助放大裁切帧（本轮 345 张）。首版没把它们算进"已引用"，
// 于是整套裁切帧被误报成 345 个孤儿——工具自身的假阳性，差点当成产品问题上报。
const orphans = [];
// 实测坑：.claude/skills/planning-with-files 是一个断链符号链接，statSync 直接 ENOENT 抛出，
// 于是整个 G6 门禁以"未捕获异常"死掉（编排层只能记成"一致性校验无法启动"）。目录符号链接
// 还可能把 walk 引回祖先目录造成无限递归。改用 lstat + 访问集 + 逐条 try。
const visited = new Set();
let walkSkipped = 0;
(function walk(d) {
  const key = norm(d);
  if (visited.has(key)) { walkSkipped++; return; }
  visited.add(key);
  let names = [];
  try { names = readdirSync(d); } catch { walkSkipped++; return; }
  for (const name of names) {
    const p = join(d, name);
    let st = null;
    try { st = lstatSync(p); } catch { walkSkipped++; continue; }
    if (st.isSymbolicLink()) {
      // 符号链接只按"它自己是不是被登记的证据"判断，不跟随：断链会让 statSync 抛，
      // 指向父目录的循环会让递归无限下钻。
      if (/\.(png|jpg|jpeg|webp)$/i.test(name)) {
        const n = norm(p);
        if (!listed.has(n)) orphans.push(p);
        else if (!listedMain.has(n)) onlyAsNonEvidence++;
      }
      walkSkipped++;
      continue;
    }
    if (st.isDirectory()) walk(p);
    else if (/\.(png|jpg|jpeg|webp)$/i.test(name)) {
      const n = norm(p);
      if (!listed.has(n)) orphans.push(p);
      else if (!listedMain.has(n)) onlyAsNonEvidence++;
    }
  }
})(resolve(scanRoot));

// 同内容不同状态：同一 (身份,page) 下 contentHash 相同但 state 不同 → 配额被凑
// 身份必须在键里：旧版键是 `page::hash`，于是 A 侧一组与 B 侧一组打出**逐字相同**的两行
// （本轮实测 7 组里 6 行看起来是重复行），读日志的人会以为计数器重了，或者干脆以为只有一组。
const byPage = new Map();
for (const s of shots) {
  if (!s.contentHash) continue;
  const k = `${s.identity || "?"}::${s.page}::${s.contentHash}`;
  const arr = byPage.get(k) ?? [];
  arr.push(s.state ?? "<无 state>");
  byPage.set(k, arr);
}
const dupState = [...byPage.entries()].filter(([, states]) => new Set(states).size > 1)
  .map(([k, states]) => `${k.split("::")[0]}|${k.split("::")[1]} 的 ${new Set(states).size} 个“不同状态”字节完全相同：${[...new Set(states)].join(",")}`);
/* 采集器自己改判出去的「状态未生效」帧数（stateNotApplied[]）。
   必须与 DUP_STATE_GROUPS 并排打印：新采集规则会把与本页已落盘帧同字节的帧**从 shots[] 里挪走**，
   所以 DUP_STATE_GROUPS=0 完全可能是"分母换了载体"，不是"两个状态现在有区别了"。
   本轮实测：dupfix corpus `DUP_STATE_GROUPS=0` 同时 `SNA=6`，同一批同字节现象一条没少。 */
const snaReclassified = Array.isArray(m.stateNotApplied) ? m.stateNotApplied.length : 0;

const out = {
  manifest: manifestPath,
  gitSha: m.gitSha ?? "(未记)",
  workflowVersion: m.workflowVersion ?? "(未记)",
  shots: shots.length, matched, missing, mismatch: mismatch.slice(0, 40), orphans, dupState,
};
if (optFlag("json")) writeFileSync(optFlag("json"), JSON.stringify(out, null, 2));

console.log(`EVIDENCE_MANIFEST=${manifestPath} gitSha=${out.gitSha} wf=${out.workflowVersion}`);
console.log(`EVIDENCE_SHOTS=${shots.length} MATCHED=${matched} NO_HASH=${noHash} MISSING=${missing.length} HASH_MISMATCH=${mismatch.length} ORPHANS=${orphans.length} DUP_STATE_GROUPS=${dupState.length} WALK_SKIPPED=${walkSkipped}`);
console.log(`EVIDENCE_SNA_RECLASSIFIED=${snaReclassified}（采集器改判出去的「状态未生效」帧：与本页已落盘帧同字节、已从 shots[] 移到 stateNotApplied[]；DUP_STATE_GROUPS=0 且本数>0 时读作「换载体」，不得读作「状态已有区别」）`);
console.log(`EVIDENCE_FRAMES_ON_DISK_ONLY_AS_NON_EVIDENCE=${onlyAsNonEvidence}（盘上确有此图，但只被 stateNotApplied[]/routeDrifts[] 引用，不算状态帧、也不算孤儿帧）`);
missing.slice(0, 8).forEach(p => console.log(`EVIDENCE_MISSING ${p}`));
mismatch.slice(0, 8).forEach(l => console.log(`EVIDENCE_MISMATCH ${l}`));
orphans.slice(0, 8).forEach(p => console.log(`EVIDENCE_ORPHAN ${relative(process.cwd(), p).split(sep).join("/")}`));
dupState.slice(0, 6).forEach(l => console.log(`EVIDENCE_DUP_STATE ${l}`));
/* 打印有上限，计数没有 —— 不写这一行的话，读日志的人看到"7 组却只有 6 行"就会怀疑计数器坏了
   （本轮就为此停下核对过一次）。截断必须自己声明。 */
if (dupState.length > 6) console.log(`  …EVIDENCE_DUP_STATE 另有 ${dupState.length - 6} 组未打印（取全量：--json <out> 里 dupState 是完整数组）`);

/**
 * 第二种模式：exec-results 的 evidence[] 完整性（--exec <file>）。
 * 实测坑：证据串形如 "…\H01-after.png(ERROR:timeout waiting for automator response)"，
 * 错误是**追加在路径后面的括号串**。直接 existsSync 会把它们全算成断链（我第一版就错了），
 * 必须先剥括号再判存在，才能把"通道故障噪声"与"真丢证据"分开。
 */
const execPath = optFlag("exec");
let execFail = 0;   // 模块作用域：exec 分支在里面赋值，退出码在下面统一判
if (execPath) {
  if (!existsSync(execPath)) { console.log(`EXEC_EVIDENCE=FAIL reason=文件不存在 ${execPath}`); }
  else {
    const ej = JSON.parse(readFileSync(execPath, "utf8"));
    const rows = ej.results ?? [];
    let entries = 0, withErr = 0, errButFileThere = 0, errFileGone = 0, cleanNoFile = 0, cleanOk = 0, observations = 0, brokenRefs = 0;
    const broken = [];
    for (const r of rows) {
      const evs = Array.isArray(r.evidence) ? r.evidence : [];
      for (const raw of evs) {
        if (typeof raw !== "string") continue;
        entries++;
        const hasErr = /ERROR:|timeout/i.test(raw);
        // 尾注有两种实测形态："(ERROR:...)" 与 "(155040B)"，都得先剥再判存在。
        // 第一版只剥了 ERROR 那类，于是 575 条被误判成断链（实际是大小注记）。
        let base = raw.trim();
        let guard = 0;
        while (guard++ < 3 && /\([^)]*\)\s*$/i.test(base)) base = base.replace(/\([^)]*\)\s*$/i, "").trim();
        const isFileRef = /\.(png|jpe?g|webp|gif)$/i.test(base);
        const there = isFileRef && existsSync(base);
        if (!isFileRef) { observations++; if (hasErr) { withErr++; errFileGone++; } continue; }
        if (hasErr) {
          withErr++;
          if (there) errButFileThere++; else errFileGone++;
        } else if (there) cleanOk++;
        else { cleanNoFile++; brokenRefs++; if (broken.length < 15) broken.push(`${r.suite}/${r.id} -> ${raw}`); }
      }
    }
    const casesWithErr = rows.filter(r => evList(r).some(e => typeof e === "string" && /ERROR:|timeout/i.test(e))).length;
    const coveringRows = rows.filter(r => r.status === "EXECUTED" || r.status === "PASS").length;
    console.log(`EXEC_FILE=${execPath} gitSha=${ej.gitSha ?? "?"} cases=${rows.length}`);
    console.log(`EXEC_EVIDENCE_ENTRIES=${entries} WITH_ERROR=${withErr} (${entries ? (100 * withErr / entries).toFixed(1) : 0}% of entries) | CASES_WITH_ERROR=${casesWithErr} (${rows.length ? (100 * casesWithErr / rows.length).toFixed(1) : 0}% of cases) | COVERING_ROWS=${coveringRows}`);
    console.log(`EXEC_ERR_FILE_STILL_THERE=${errButFileThere} EXEC_ERR_FILE_GONE=${errFileGone} EXEC_CLEAN_OK=${cleanOk} EXEC_CLEAN_BUT_MISSING=${cleanNoFile} EXEC_NOT_A_FILE_REF=${observations}`);
    broken.forEach(b => console.log("EXEC_BROKEN " + b));
    /* 本轴的否决权**只留给"伪造"**：证据字段里写了图片路径、既没有 ERROR/timeout 注记、盘上又不存在
       —— 那是拿不存在的文件当证据（目标里点名的取证洞）。
       反过来，带 ERROR 注记的条目是执行器**自己声明**的采集失败（FAILED/SKIPPED 行占绝大多数：本轮实测
       EXECUTED 行内 18 条、FAILED/SKIPPED 行内 157 条），把它们一并计红等于把仪器噪声当产品缺陷否决收尾，
       与本轮已确立的"大部分自动化轮次失败是仪器噪声"口径冲突。
       「按 tier 交不齐证据」这条判红**不在此轴**，它已由 readjudicate-evidence.mjs 分类
       （EXECUTED_WITHOUT_TIER_EVIDENCE / NO_EVIDENCE_MISSING_FILE 等，含 navigation/noop 的特例）
       与 verify-queue-reconcile.mjs 的 QUEUE_ERR_TAINTED 承担 —— 在两个工具里各数一遍必然对不上，
       readjudicate 顶部注释早就写明"不得第二次造轮子"。 */
    execFail = cleanNoFile;
    console.log(execFail
      ? "EXEC_EVIDENCE=FAIL（存在「没有错误注记、盘上却不存在的图片引用」=伪造证据，G6 不得记 PASS）"
      : `EXEC_EVIDENCE=PASS（无伪造引用；${withErr} 条 ERROR 注记=执行器自报的采集失败，其 tier 交不齐者由 readjudicate/queue-reconcile 记账，不在本轴否决）`);
  }
}

// D4：同内容不同状态也算证据不诚实（配额被凑），并入硬失败；
// D5：--exec 分支的错误串/断链通过 execFail 参与退出码，避免"红着进来绿着出去"。
const hardFail = missing.length || mismatch.length || orphans.length || noHash || dupState.length || execFail;
console.log(hardFail ? "EVIDENCE_RESULT=FAIL（证据与盘不一致，G6 不得记 PASS）" : "EVIDENCE_RESULT=PASS");
process.exit(hardFail ? 1 : 0);
