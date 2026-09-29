/* 面板侧「语料 gitSha 拆类读数轴」的离线自检（lane: shaclass-r9，2026-09-29）。
 *
 * 起因（在册，reports/audit/round-7/followups-v33.md §5，原文照抄）：
 *   「`emit-round-report.mjs` 目前只印 `CORPUS_EXPIRED_GITSHA` 这个合并数，而语料门已经能分三类
 *    （`CORPUS_SHA_CLASS resolvableOlder/unresolvable/empty`）。HEAD 每前进一次，那个合并数就涨一次，
 *    读的人分不清"历史轮本应定格"和"真断链"。补法在面板侧。」
 * 本文件测的就是补上的那条面板轴，三个方向都必须**当场量到**：
 *   · merged 涨了而三类里没有断链 ⇒ 轴必须**绿**（否则 HEAD 一动就假红，等于把 advisory 读成红）；
 *   · unresolvable（写了串却解析不到）⇒ 轴必须**红**；
 *   · empty 里只有「未被打戳约定豁免」的那部分 ⇒ 轴必须**红**，而被 legacy 豁免的那些 ⇒ 必须**不红**
 *     —— 直接拿 empty>0 判红就是把已豁免的历史无戳件读成衰减，故这条两侧都钉住。
 * 读数失效的四种形状（类行缺失 / 值不是整数 / 三类相加≠合并数 / legacy>empty）用 --sha-class-body
 * **回放**造出来：真门总会打那行，不回放在就永远演示不了"仪器坏了"这一类，而"只会打印一个数的读数"
 * 在本仓等于一条永远绿的空轴。
 *
 * 判据要能区分对错 ⇒ 末尾用**翻转谓词符号的替身**（throwaway copy 只住 .zcode/tmp 下，
 * 活文件 scripts/qa/emit-round-report.mjs 一个字都不改）证明这些断言真会变红：替身在同一条输入上
 * 必须变绿，否则说明断言是恒真的摆设（借 test-corpus-legacy-window.cjs §I 的同一套做法）。
 *
 * 用法：node22 scripts/qa/test-panel-sha-class-axis.cjs   （PATH 上的 node 是 v16，会崩在 import.meta）
 *
 * 标签写法有一条硬规矩（借同门 test-corpus-sha-axis.cjs:17-19 / test-corpus-legacy-window.cjs:19-22 的教训）：
 * 断言标签与被转述的门/面板输出行里不能出现 `X_RESULT=PASS|FAIL` / `X_TEST=…` 原形 ——
 * 聚合器 run-qa-selftests.mjs:52 取的是输出里**第一个** `[A-Z]{2,8}_(TEST|RESULT)=(PASS|FAIL)`，
 * 抢在我这条 PNSHA_TEST 之前的任何一条都会把本次读数张冠李戴。所有被转述的外部判决行一律走 brk() 断字符。
 */
const { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, statSync } = require("node:fs");
const { createHash } = require("node:crypto");
const { join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync, execFileSync } = require("node:child_process");

const REPO = resolve(__dirname, "..", "..");
const PANEL = join(REPO, "scripts", "qa", "emit-round-report.mjs");
const GATE = join(REPO, "scripts", "qa", "verify-evidence-corpus.mjs");
/* 夹具与替身目录**按 pid 命名**。实测踩到的形状（2026-09-30 00:0x，本车道自己的自检在聚合器里红了一次）：
   聚合器可以被同时跑两遍（主控收尾跑一次、某条车道手上一遍），而固定路径的自检会在开头 `rmSync` 对方的目录 ——
   于是这一份正在写的替身被那一份抹掉，报 `ENOENT … _mutant-emptyBlocked-emit-round-report.mjs`，
   同一时刻 test-corpus-legacy-window.cjs 也因为它的固定夹具目录被这样抹掉而报 bad=2。
   那是"两个跑的人互相踩"，不是判据有问题 ⇒ 每个进程用自己的目录，谁也不碰谁。 */
const FXREL = `.zcode/tmp/panel-shaclass-${process.pid}`;
const FX = join(REPO, ...FXREL.split("/"));
const MUTREL = `.zcode/tmp/panel-shaclass-mut-${process.pid}`;
const MUT = join(REPO, ...MUTREL.split("/"));

const git = (...a) => { try { return execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim(); } catch { return ""; } };
const isCommit = (sha) => { try { execFileSync("git", ["cat-file", "-e", sha + "^{commit}"], { cwd: REPO, stdio: "ignore" }); return true; } catch { return false; } };
const HEAD40 = git("rev-parse", "HEAD");
const OLDER40 = git("rev-parse", "HEAD~1");
/* 真断链样本现取、绝不写字面量：固定盐做 sha1 ⇒ 40 位合法形状、必然不是本仓对象。
   写成字面量会被语料门自己的 HARDCODED_SHA 轴扫到（verify-evidence-corpus.mjs:283-297 扫 scripts/qa/**.cjs）。 */
const PHANTOM = createHash("sha1").update("lane-shaclass-r9:unresolvable-fixture").digest("hex");
/* 打戳约定起点必须与门**同源派生**（同一命令、同一方言），不许把某天的读数抄成常量：
   抄成常量的话，约定起点在历史上移动时本文件会静默改掉"豁免窗口"的定义。 */
const CONV_RAW = (git("log", "--reverse", "--format=%cI", "-S", "gitSha", "--", "scripts/qa").split("\n")[0] || "");
const CONV = CONV_RAW ? new Date(CONV_RAW) : null;

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const brk = (s) => String(s).replace(/([A-Z]{2,8})_(RESULT|TEST)=/g, "$1-$2="); // 断掉聚合器那条正则，见文件头
/* ok() 对**标签也**做 brk：本文件第一版把一条断言标签写成 `… ⇒ EMIT_RESULT=FAIL` 原形，
   聚合器 run-qa-selftests.mjs:52 取的是整个输出里第一个 `[A-Z]{2,8}_(TEST|RESULT)=(PASS|FAIL)`，
   于是它把"我在转述别人的判据名"读成"本次判决是 FAIL"，一条 61 项全中的自检被打成 FAIL（实测，2026-09-29 本车道自己踩的）。
   标签一律过 brk，就不必再靠"写的时候记得断字符"这条靠不住的纪律。 */
let fail = 0, cases = 0;
const ok = (cond, label, detail) => {
  cases++;
  const lb = brk(label);
  if (cond) console.log(`  ok   ${lb}`);
  else { fail++; console.log(`  FAIL ${lb}${detail ? "  <<" + brk(String(detail)).slice(0, 260) + ">>" : ""}`); }
};

/* ---------- 夹具：一份 manifest + 若干"盘上真有、哈希相符"的帧 ----------
   帧全部命中 matched ⇒ 红只可能来自 gitSha 这一轴，测的就是面板拆类而不是帧完整性。 */
function manifestAt(sub, opts) {
  const dir = join(FX, ...sub.split("/"));
  const img = join(dir, "img");
  mkdirSync(img, { recursive: true });
  const shots = [];
  const n = opts.frames || 2;
  for (let i = 1; i <= n; i++) {
    const f = join(img, `S0${i}.png`);
    writeFileSync(f, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from(sub + "-S0" + i, "utf8")]));
    const rel = f.slice(REPO.length + 1).split("\\").join("/");
    shots.push({ identity: "A", route: "pages/x/index", state: "默认", path: rel, file: rel,
      bytes: statSync(f).size, contentHash: sha256(readFileSync(f)).slice(0, 16) });
  }
  const j = { shots };
  if ("gitSha" in opts) j.gitSha = opts.gitSha;
  if ("generatedAt" in opts) j.generatedAt = opts.generatedAt;
  writeFileSync(join(dir, "manifest-detail.json"), JSON.stringify(j, null, 1));
}

/** 跑一次面板的离线自检轴：root=真跑只读门的夹具根；bodyFile=回放一份门 stdout。 */
function axisRun(opts) {
  const args = [PANEL, "--sha-class-selftest"];
  if (opts.bodyFile) args.push("--sha-class-body", opts.bodyFile);
  else args.push("--sha-class-root", opts.root);
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const ml = (out.match(/^EMIT_SHA_CLASS .*$/m) || [null])[0];
  const field = (k) => { const m = ml && ml.match(new RegExp("(?:^|\\s)" + k + "=(\\S+)")); return m ? m[1] : null; };
  return { code: r.status, out, machine: ml, field };
}

/** 真跑一次只读语料门（限定夹具根），拿它自己的统计行与面板轴对账。 */
function runGateOn(rootAbs) {
  const r = spawnSync(process.execPath, [GATE, "--root", rootAbs], { cwd: REPO, encoding: "utf8", timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}
const numField = (text, key) => { const m = String(text).match(new RegExp("(?:^| )" + key + "=(\\d+)", "m")); return m ? Number(m[1]) : null; };
const statsLine = (out) => brk((String(out).match(/^CORPUS_SCANNED.*$/m) || ["(门没打统计行)"])[0]);

rmSync(FX, { recursive: true, force: true });
rmSync(MUT, { recursive: true, force: true });

// ---------- 0. 前置：负例原料必须真的是负例 ----------
ok(HEAD40.length === 40 && isCommit(HEAD40), "0 HEAD 解析得到（40 位真提交）", "HEAD40=" + HEAD40);
ok(OLDER40.length === 40 && isCommit(OLDER40) && OLDER40 !== HEAD40,
  "0 resolvableOlder 夹具原料：HEAD~1 是真提交且 != HEAD", "OLDER40=" + OLDER40);
ok(PHANTOM.length === 40 && !isCommit(PHANTOM),
  "0 unresolvable 夹具原料：派生出的 40 位串在本仓解析不到（若解析得到，这条负例就是恒真的摆设）", "PHANTOM=" + PHANTOM);
ok(!!CONV && !isNaN(CONV.getTime()),
  "0 打戳约定起点能从 git log 同源派生（派生不出来 ⇒ 豁免窗口的两条断言都无从判断）", "CONV_RAW=" + CONV_RAW);
if (!CONV || PHANTOM.length !== 40 || isCommit(PHANTOM)) {
  console.log(`  FAIL 0 前置不成立 ⇒ 本文件按失败收场，不静默跳过后面那些断言（跳过会让"缺负例"长得像"全绿"）`);
  console.log(`PNSHA_SUMMARY cases=${cases} fail=${fail} head40=${HEAD40.slice(0, 12)} conv=(派生不出来)`);
  console.log("PNSHA_TEST=FAIL");
  process.exit(1);
}

/* ---------- A. 历史轮定格：merged 涨了，轴必须绿 ----------
   这正是 §5 说的形状：HEAD 每前进一枚，resolvableOlder 就 +1，而链一根没断。 */
{
  manifestAt("A_older", { gitSha: OLDER40, frames: 3 });
  const a = axisRun({ root: join(FX, "A_older") });
  const g = runGateOn(join(FX, "A_older"));
  ok(a.code === 0, "A 可解析的旧戳：面板轴 exit 0（不判红）", "code=" + a.code + " out=" + a.out);
  ok(a.field("merged") === "1" && a.field("resolvableOlder") === "1",
    "A 轴具名读数点名：merged=1 且全部落在 resolvableOlder", "machine=" + a.machine);
  ok(a.field("unresolvable") === "0" && a.field("empty") === "0" && a.field("emptyBlocked") === "0",
    "A 轴：两个断链类都是 0 ⇒ 合并数那 1 处不是坏", "machine=" + a.machine);
  ok(a.field("expected_to_grow") === "resolvableOlder",
    "A 轴机器行自带 expected_to_grow 标签（写给机器读，别只写在散文里）", "machine=" + a.machine);
  ok(a.field("axis_red") === "no" && a.field("conserved") === "yes",
    "A 轴 axis_red=no 且三类相加对得上合并数", "machine=" + a.machine);
  ok(numField(g.out, "CORPUS_EXPIRED_GITSHA") === 1 && numField(g.out, "CORPUS_PROBLEMS") === 0,
    "A 反向对账：门自己也是 merged=1 而 PROBLEMS=0（面板与门读的是同一件事）", statsLine(g.out));
}

/* ---------- B. 真断链：unresolvable ⇒ 轴必须红 ---------- */
{
  manifestAt("B_unres", { gitSha: PHANTOM, frames: 2 });
  const b = axisRun({ root: join(FX, "B_unres") });
  const g = runGateOn(join(FX, "B_unres"));
  ok(b.code === 1, "B 解析不到的戳：面板轴 exit 1（这条轴会红，不是只印一个数）", "code=" + b.code);
  ok(b.field("unresolvable") === "1" && b.field("merged") === "1", "B 轴点名 unresolvable=1", "machine=" + b.machine);
  ok(b.field("axis_red") === "yes", "B 轴 axis_red=yes", "machine=" + b.machine);
  ok(/SHA_CLASS_HIT\[class\] unresolvable=1/.test(b.out), "B 轴逐字说出红因（class 类，不是仪器失效）", brk(b.out));
  ok(numField(g.out, "CORPUS_PROBLEMS") === 1,
    "B 反向对账：门对同一份清单自己就计红（PROBLEMS=1）⇒ 面板没有把 advisory 读成红", statsLine(g.out));
}

/* ---------- C. 无戳且不在豁免窗口：empty−legacy ⇒ 轴必须红 ---------- */
{
  manifestAt("C_empty_now", { frames: 2, generatedAt: new Date().toISOString() });
  const c = axisRun({ root: join(FX, "C_empty_now") });
  const g = runGateOn(join(FX, "C_empty_now"));
  ok(c.code === 1, "C 约定之后生成的无戳清单：面板轴 exit 1", "code=" + c.code);
  ok(c.field("empty") === "1" && c.field("legacy") === "0" && c.field("emptyBlocked") === "1",
    "C 轴点名 empty=1 / legacy=0 ⇒ 未豁免 1", "machine=" + c.machine);
  ok(/SHA_CLASS_HIT\[class\] empty=1 份顶层无 gitSha/.test(c.out) && /剩下 1 份/.test(c.out) && /本轴只判 empty−legacy/.test(c.out),
    "C 轴红因写成 empty−legacy（剩下 1 份）而不是裸 empty ⇒ 读者看得见豁免被减掉了", brk(c.out.slice(c.out.indexOf("SHA_CLASS_HIT"))));
  ok(numField(g.out, "CORPUS_PROBLEMS") === 1, "C 反向对账：门同一份清单 PROBLEMS=1", statsLine(g.out));
}

/* ---------- D. 无戳但早于打戳约定：legacy ⇒ 轴必须**不红**（把 advisory 读成红同样是错） ---------- */
{
  const before = new Date(CONV.getTime() - 86400000).toISOString();
  manifestAt("D_legacy", { frames: 2, generatedAt: before });
  const d = axisRun({ root: join(FX, "D_legacy") });
  const g = runGateOn(join(FX, "D_legacy"));
  ok(d.code === 0, "D 约定之前的无戳清单：面板轴 exit 0（legacy 豁免生效，红没被误放大）", "code=" + d.code);
  ok(d.field("empty") === "1" && d.field("legacy") === "1" && d.field("emptyBlocked") === "0",
    "D 轴：empty 仍照实数（事实没变），只有未豁免部分归零", "machine=" + d.machine);
  ok(numField(g.out, "CORPUS_LEGACY_NO_SHA") === 1 && numField(g.out, "CORPUS_PROBLEMS") === 0,
    "D 反向对账：门同一份清单 legacy=1 而 PROBLEMS=0 ⇒ 两把尺子读数能逐条对上", statsLine(g.out));
}

/* ---------- E. 读数失效的四种形状：用回放造（真门总会打那行，不回放在就没有负例） ---------- */
const REPLAY = join(FX, "replay");
mkdirSync(REPLAY, { recursive: true });
const GOOD_BODY = "CORPUS_SCANNED=9 CORPUS_EXPIRED_GITSHA=3 CORPUS_PROBLEMS=0\n" +
  "CORPUS_SHA_CLASS resolvableOlder=2 unresolvable=0 empty=1 :: frames resolvableOlder=40 unresolvable=0 empty=10\n" +
  "CORPUS_LEGACY_NO_SHA=1 CORPUS_LEGACY_FRAMES=10 打戳约定起点=2026-09-24T16:31:39.000Z\n";
function replayFile(name, text) { const p = join(REPLAY, name + ".txt"); writeFileSync(p, text); return p; }
{
  // E0 先确认回放通道本身可用（一份能对上账的输入 ⇒ 绿）
  const r = axisRun({ bodyFile: replayFile("good", GOOD_BODY) });
  ok(r.code === 0 && r.field("axis_red") === "no", "E0 回放通道可用：对得上账的输入判绿", "code=" + r.code);
  ok(r.field("frames_unresolvable") === "0" && r.field("frames_resolvableOlder") === "40",
    "E0 帧轴（`:: frames` 之后那半行）也被拆成三个具名读数", "machine=" + r.machine);
}
{
  const p = replayFile("no_class_line", "CORPUS_SCANNED=9 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=0\n" +
    "CORPUS-RESULT=PASS（假想的旧门输出：只有合并数、没有拆类行）\n");
  const r = axisRun({ bodyFile: p });
  ok(r.code === 1, "E1 类行缺失：轴 exit 1（合并数在、拆类没量到 ⇒ 不许当绿）", "code=" + r.code);
  ok(r.field("split") === "unmeasured" && /merged=47/.test(r.machine || "") && /resolvableOlder=未量/.test(r.machine || ""),
    "E1 读数写成「未量」而不是 0（0 会被读成「没有断链」，那正是空轴的形状）", "machine=" + r.machine);
  ok(/没有 CORPUS_SHA_CLASS 行/.test(r.out) && /SHA_CLASS_HIT\[instrument\]/.test(r.out),
    "E1 红因标成 instrument（仪器坏了），不与证据类混写", brk(r.out));
}
{
  const p = replayFile("not_integer", "CORPUS_SCANNED=9 CORPUS_EXPIRED_GITSHA=3 CORPUS_PROBLEMS=0\n" +
    "CORPUS_SHA_CLASS resolvableOlder=2 unresolvable=0 empty=若干 :: frames resolvableOlder=40 unresolvable=0 empty=10\n" +
    "CORPUS_LEGACY_NO_SHA=1\n");
  const r = axisRun({ bodyFile: p });
  ok(r.code === 1 && r.field("split") === "unmeasured",
    "E2 类值不是整数（字段改名/值形态变了）：轴 exit 1 且记未量", "code=" + r.code + " machine=" + r.machine);
}
{
  const p = replayFile("sum_mismatch", "CORPUS_SCANNED=9 CORPUS_EXPIRED_GITSHA=47 CORPUS_PROBLEMS=0\n" +
    "CORPUS_SHA_CLASS resolvableOlder=46 unresolvable=0 empty=0 :: frames resolvableOlder=9040 unresolvable=0 empty=0\n" +
    "CORPUS_LEGACY_NO_SHA=0\n");
  const r = axisRun({ bodyFile: p });
  ok(r.code === 1, "E3 三类相加(46)!=合并数(47)：轴 exit 1（有一类被漏计 ⇒ 拆分不可信）", "code=" + r.code);
  ok(r.field("conserved") === "no" && /三类相加 46 ≠ 合并数/.test(r.out), "E3 点名是守恒破了", "machine=" + r.machine);
}
{
  const p = replayFile("legacy_gt_empty", "CORPUS_SCANNED=9 CORPUS_EXPIRED_GITSHA=2 CORPUS_PROBLEMS=0\n" +
    "CORPUS_SHA_CLASS resolvableOlder=1 unresolvable=0 empty=1 :: frames resolvableOlder=10 unresolvable=0 empty=5\n" +
    "CORPUS_LEGACY_NO_SHA=4\n");
  const r = axisRun({ bodyFile: p });
  ok(r.code === 1 && /legacy 无戳清单 4 > empty 类/.test(r.out),
    "E4 legacy>empty（不可能，legacy 是 empty 的子集）：轴 exit 1 并点名两把尺子对不上", "code=" + r.code);
}

/* ---------- F. 面板接线：报告路径必须真的消费这条轴 ----------
   离线跑不了整份面板（它要复跑十几把门、还会取设备租约），所以这里做**静态接线核对**：
   取数、渲染进 H 节、机器行、以及"读数失效进 ERRORS / 证据类进一条不藏"四个挂点逐一按字面存在。
   动态那一半（真报告里出现 EMIT_SHA_CLASS leg=global/scoped 两行 + H 节三类点名）由本车道
   收尾时实跑整份面板证明，逐字读数见 reports/audit/round-7/panel-shaclass-r9.md §3。 */
{
  const live = readFileSync(PANEL, "utf8");
  const wired = [
    ["拆类取数（全域那把门）", 'measureCorpusShaClassAxis(G.corpus && G.corpus.body, "global"'],
    ["拆类取数（本轮 scope 那把，旧行连 EXPIRED_GITSHA 都没印过）", 'measureCorpusShaClassAxis(G.corpusScoped && G.corpusScoped.body, "scoped"'],
    ["H 节表格里点名三类（全域）", "shaClassCell(G.shaClass[0])"],
    ["H 节表格里点名三类（scope）", "shaClassCell(G.shaClass[1])"],
    ["正文汇总行进报告", "P(shaClassAxisCountLine(G.shaClass))"],
    ["机器行进 stdout（run-final-verify 与配对自检抓它）", "for (const m of G.shaClass) console.log(shaClassMachineLine(m));"],
    ["读数失效 ⇒ EMIT_RESULT=FAIL", "ERRORS.push(`语料 gitSha 拆类（leg=${m.leg}）读数不可信"],
    ["证据类 ⇒ 一条不藏（不重复进 gatePanel）", "OPEN.push({ item: `语料 gitSha 拆类（leg=${m.leg}）${r.cls}=${r.n}`"],
    ["合并数保留打印、没被退役", 'EXPIRED_GITSHA=${n(G.corpus.num("CORPUS_EXPIRED_GITSHA"))}'],
  ];
  for (const [label, needle] of wired) ok(live.includes(needle), "F " + label, "找不到字面：" + needle);
  const panelArr = live.match(/const gatePanel = \[[^\]]*\]/);
  ok(!!panelArr && !/shaClass/.test(panelArr[0]),
    "F 这条轴**没有**被塞进 gatePanel（语料门已为同一批 manifest 握着否决权，重复计会让「本次仍判红 N/M」失真）",
    panelArr ? panelArr[0].slice(0, 160) : "(没抓到 gatePanel 数组)");
}

/* ---------- G. 负例能咬人：翻转谓词符号的替身跑同一条输入 ----------
   替身只放 .zcode/tmp 下，活文件一个字都不改（多车道并发，改活文件等于踩别人脚）。
   机械定位需要三处：① 仓库根锚（副本不在 scripts/qa 下，resolve(here,"../..") 会指错根）；
   ② ./ui-lease.mjs；③ ./fourgrid-axis.mjs —— 三处都与判据无关，所以差异行数必须是「1 翻转 + 3 定位 = 4」。 */
const liveText = readFileSync(PANEL, "utf8");
const liveLines = liveText.split("\n");
const liveShaBefore = sha256(liveText);
const MUTS = [
  { name: "unresolvable", label: "把「unresolvable>0 判红」翻成「<0」",
    from: "if (man.unresolvable > 0) reasons.push", to: "if (man.unresolvable < 0) reasons.push",
    input: { root: join(FX, "B_unres") }, expect: "B 替身变绿 ⇒ 「B 轴 exit 1」那条断言确实在受力" },
  { name: "emptyBlocked", label: "把「empty−legacy>0 判红」翻成「<0」",
    from: "if (emptyBlocked > 0) reasons.push", to: "if (emptyBlocked < 0) reasons.push",
    input: { root: join(FX, "C_empty_now") }, expect: "C 替身变绿 ⇒ 「C 轴 exit 1」确实在受力" },
  { name: "conservation", label: "把「相加!=合并数 判红」翻成「==」",
    from: "else if (sum !== merged) instr(`三类相加", to: "else if (sum === merged) instr(`三类相加",
    input: { bodyFile: join(REPLAY, "sum_mismatch.txt") }, expect: "E3 替身变绿 ⇒ 「E3 轴 exit 1」确实在受力" },
];
mkdirSync(MUT, { recursive: true });
for (const mt of MUTS) {
  const occurrences = liveText.split(mt.from).length - 1;
  ok(occurrences === 1, `G ${mt.name} 替身前：活文件里那条谓词恰好出现 1 次（翻转才不会翻到别处）`, "出现 " + occurrences + " 次");
  if (occurrences !== 1) continue;
  let t = liveText.replace(mt.from, mt.to);
  t = t.replace('from "./ui-lease.mjs"', "from " + JSON.stringify(pathToFileURL(join(REPO, "scripts", "qa", "ui-lease.mjs")).href));
  t = t.replace('from "./fourgrid-axis.mjs"', "from " + JSON.stringify(pathToFileURL(join(REPO, "scripts", "qa", "fourgrid-axis.mjs")).href));
  t = t.replace('resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")', JSON.stringify(REPO));
  ok(!t.includes('from "./ui-lease.mjs"') && !t.includes('from "./fourgrid-axis.mjs"') && !/import\.meta\.url/.test(t),
    `G ${mt.name} 三处机械定位都换到了（没换到的话替身会指错仓库根，红绿都不可信）`, "");
  const mp = join(MUT, "_mutant-" + mt.name + "-emit-round-report.mjs");
  writeFileSync(mp, t);
  const tLines = t.split("\n");
  const diffLines = tLines.reduce((acc, l, i) => acc + (l !== liveLines[i] ? 1 : 0), 0);
  ok(diffLines === 4, `G ${mt.name} 替身与活文件只差 4 行（1 处谓词翻转 + 3 处机械定位），别的一个字没动`, "diffLines=" + diffLines);
  const args = [mp, "--sha-class-selftest"];
  if (mt.input.bodyFile) args.push("--sha-class-body", mt.input.bodyFile);
  else args.push("--sha-class-root", mt.input.root);
  const mr = spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  const liveRun = axisRun(mt.input);
  console.log(`  NEGATIVE_PROOF[${mt.label}] live_exit=${liveRun.code} mutant_exit=${mr.status} （活文件红、替身绿 ⇒ 断言不是恒真摆设）`);
  ok(liveRun.code === 1, `G ${mt.name} 活文件在同一条输入上判红`, "live_exit=" + liveRun.code);
  ok(mr.status === 0, `G ${mt.name} ${mt.expect}`, "mutant_exit=" + mr.status + " out=" + `${mr.stdout || ""}${mr.stderr || ""}`.slice(0, 400));
}
ok(sha256(readFileSync(PANEL, "utf8")) === liveShaBefore, "G 活文件在整套反证过程里逐字节未变（只动 .zcode/tmp 下的替身）", "");

/* ---------- H. 收尾：替身必须删干净，且活目录里从来没出现过替身 ---------- */
function readdirHas(dir, needle) {
  try { return require("node:fs").readdirSync(dir).some((f) => f.includes(needle)); } catch { return true; }
}
rmSync(MUT, { recursive: true, force: true });
rmSync(FX, { recursive: true, force: true });
ok(!existsSync(MUT), "H 替身目录已删除并复核不存在", "existsSync(" + MUTREL + ")=" + existsSync(MUT));
ok(!existsSync(join(REPO, ".zcode", "tmp", ...MUTREL.split("/").slice(-1)[0].split("/"))), "H 复核（按仓库相对路径再问一次）：替身目录确实没了", "");
ok(!readdirHas(join(REPO, "scripts", "qa"), "_mutant-"), "H scripts/qa 活目录里没有替身文件（本文件从不往活目录写）", "");
ok(!existsSync(FX), "H 夹具目录已删除（不落盘残留）", "");
{
  const mine = [FXREL.split("/").pop(), MUTREL.split("/").pop()];
  let left = [];
  try { left = require("node:fs").readdirSync(join(REPO, ".zcode", "tmp")).filter((n) => mine.includes(n)); } catch { left = ["(读不出 .zcode/tmp)"]; }
  ok(left.length === 0, "H 复核（点名问 .zcode/tmp）：本 pid 的夹具/替身目录都不在（别人的 pid 目录不算 —— 目录按 pid 隔离，并发跑两遍也互不抹）", left.join(" "));
}

console.log(`PNSHA_SUMMARY cases=${cases} fail=${fail} head40=${HEAD40.slice(0, 12)} older=${OLDER40.slice(0, 12)} phantom=${PHANTOM.slice(0, 12)} conv=${CONV.toISOString()} platform=${process.platform}`);
console.log(`PNSHA_TEST=${fail ? "FAIL" : "PASS"}`);
process.exit(fail ? 1 : 0);
