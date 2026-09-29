#!/usr/bin/node
/* 负例（tapfix 载具车道）：emit-tapfix-briefs.mjs 以前开头就是
     rmSync(OUT, { recursive: true, force: true });
   —— 整目录连带别人写的东西一起没，无备份无回滚。本测试钉死四件事：
     ① 外来/入库形状的文件放进输出目录后，跑一遍还在（逐字节）；
     ② 本载具自己认领的批次清单**确实被换掉了**（不许为了"安全"变成什么都不写）；
     ③ 删除前留下了备份，且备份与旧内容逐字节相等；
     ④ 上面这套断言打到"修复前的形状"（把 rmSync(OUT,{recursive}) 那行插回去的一次性副本）
        必须变红 —— 否则这条负例是空的，绿灯等于没测。
   副本只活在 .zcode/tmp 下，测完立刻删；本仓的实盘目录
   reports/audit/round-7/tapfix-briefs 一次都不碰（那个目录里有 66 个未入库产物，
   其中 42 份是复核员手写的 lane 成果，被原写法整批铲掉）。
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-tapfix-briefs-no-wipe.cjs
   聚合器认的输出：SUMMARY: assertion failures = N（run-qa-selftests.mjs:45-51）+ NOTWIPE_TEST=PASS|FAIL */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(REPO, "scripts", "qa", "emit-tapfix-briefs.mjs");
const TMP = path.join(REPO, ".zcode", "tmp", "tapfix-no-wipe");
const MUTANT = path.join(TMP, "emit-tapfix-briefs.prefix-shape.mjs");

/* 保险闸：这个测试的所有写/删动作只许落在 .zcode/tmp 下面。
   路径里但凡出现 reports/ 或 apps/client/ 就地抛，不等跑完再后悔。 */
function guarded(p, what) {
  const rel = path.relative(path.join(REPO, ".zcode", "tmp"), p);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel))
    throw new Error("夹具路径越界，拒绝操作 " + what + "：" + p);
  return p;
}
let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + san(name) + (detail === undefined ? "" : " :: " + san(String(detail)).slice(0, 260))); }
  else console.log("ok   " + san(name) + (detail === undefined ? "" : "  (" + san(String(detail)).slice(0, 170) + ")"));
}
/* 被 spawn 的载具自己会打印 BRIEF_RESULT=OK / =FAIL。这些 token 绝不能原样出现在本测试的
   stdout 里：聚合器 run-qa-selftests.mjs:52 的 selfVerdict 抓的是**第一个** *_RESULT=(PASS|FAIL)，
   一旦抓到子进程那句 FAIL，就会把一条本来就绿的测试判红（反过来也同理，会掩盖真红）。 */
function san(s) {
  return String(s).replace(/_RESULT=/g, "_RESULT~").replace(/_TEST=/g, "_TEST~")
    .replace(/assertion failures =/g, "assertion-failures(引用)");
}
/* 逐字节比较，但**文件不在就当不相等**：第一版让 eq() 在 ENOENT 上直接抛，
   结果打到修复前的形状上时进程是崩掉的、不是报红的——崩掉的红和判据的红不是一回事，
   聚合器只会看到一堆栈。断言永远不许靠异常来表达。 */
function eq(file, expected) {
  try { return fs.readFileSync(file).equals(Buffer.from(expected)); } catch { return false; }
}
const WIPE_RE = /^\s*rmSync\(OUT, \{ recursive: true/m;

/* ── 夹具：一份普查 + 一个"跑之前就存在"的输出目录 ─────────────────────────
   播种的 5 个文件各有分工：
     01.json / 02.json      —— 载具上一轮自己写的批次清单（形状可识别）⇒ 应当被换掉且有备份
     tracked-looking.json   —— 冒充入库/别人东西的文件（名字都不是批次名）⇒ 必须活下来
     01/tapfix-lane-*.json.json —— 复核员手写的 lane 成果 ⇒ 必须活下来
     tapfix-lane-ROOT-STRAY.json —— 根层 lane 产物，正是旧尾巴那句清扫会删的东西 ⇒ 必须活下来 */
const SEED = {
  "01.json": JSON.stringify({ batch: "01", laneCount: 1, caseCount: 1, lanes: [{ stub: "OLD-A" }], hardRules: ["OLD-A"] }),
  "02.json": JSON.stringify({ batch: "02", laneCount: 1, caseCount: 1, lanes: [{ stub: "OLD-B" }], hardRules: ["OLD-B"] }),
  "tracked-looking.json": JSON.stringify({ gitTracked: true, note: "名字不像批次清单也照样不该动" }),
  "01/tapfix-lane-PAGES-A-INDEX.json.json": JSON.stringify({ lane: "pages/a/index", counts: { planned: 2, ok: 2, unverifiable: 0 }, cases: [{ id: "A01", selector: ".btn-a" }] }),
  "tapfix-lane-ROOT-STRAY.json": JSON.stringify({ lane: "stray", counts: { planned: 0, ok: 0, unverifiable: 0 } }),
};
const CENSUS = JSON.stringify({
  generatedAt: "fixture", ops: "fixture",
  totals: { actionMissingSelector: 4 },
  pages: [
    { page: "pages/a/index", manifest: "PAGES-A-INDEX.json", sourceFile: null, sourceFound: false, missing: [
      { id: "A01", manifest: "PAGES-A-INDEX", action: "点 .btn-a", title: "t1" },
      { id: "A02", manifest: "PAGES-A-INDEX", action: "向左拖动列表", title: "t2" }] },
    { page: "pages/b/index", manifest: "PAGES-B-INDEX.json", sourceFile: null, sourceFound: false, missing: [
      { id: "B01", manifest: "PAGES-B-INDEX", action: "点 .btn-b", title: "t3" },
      { id: "B02", manifest: "PAGES-B-INDEX", action: "输入姓名 .inp", title: "t4" }] },
  ],
});
function plant(dir) {
  guarded(dir, "输出目录");
  fs.rmSync(dir, { recursive: true, force: true });
  for (const [rel, body] of Object.entries(SEED)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  const work = path.dirname(dir);
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(path.join(work, "census.json"), CENSUS);
  return path.join(work, "census.json");
}
function runCarrier(script, out, censusPath) {
  const ops = path.join(path.dirname(out), "ops-missing");   // 不指到真 ops，缺了就当没有
  const r = spawnSync(process.execPath, [script, "--census", censusPath, "--out", out, "--ops", ops, "--maxPerBatch", "3"],
    { cwd: REPO, encoding: "utf8", timeout: 120000 });
  return { code: r.status == null ? -1 : r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/* ── 核心判据：一趟跑完之后，目录应该长什么样 ──────────────────────────────
   返回"未满足的判据"列表（空 = 全过）。正例（现文件）和反例（修复前副本）
   跑的是同一份判据，反例必然在这里红 —— 这就是"负例可红"的结构。 */
function judge(label, dir, res) {
  const bad = [];
  const need = (name, cond) => { if (!cond) bad.push(label + ": " + name); };
  need("载具退出码 0（实得 " + res.code + "）", res.code === 0);
  for (const rel of ["tracked-looking.json", "01/tapfix-lane-PAGES-A-INDEX.json.json", "tapfix-lane-ROOT-STRAY.json"]) {
    const p = path.join(dir, rel);
    need("外来/复核员文件 " + rel + " 必须活下来且逐字节不变", fs.existsSync(p) && eq(p, SEED[rel]));
  }
  const b1 = path.join(dir, "01.json");
  let fresh = null;
  try { fresh = JSON.parse(fs.readFileSync(b1, "utf8")); } catch { }
  need("载具自己的 01.json 必须被这一轮换新（不是原样留着）",
    !!fresh && JSON.stringify(fresh) !== SEED["01.json"] && Array.isArray(fresh.lanes) && !!fresh.schema);
  const snaps = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^pre-\d{8}-\d{6}(\.\d+)?$/.test(f)) : [];
  need("必须留下 pre-<ts>/ 备份目录", snaps.length >= 1);
  const bak = snaps.length ? path.join(dir, snaps[snaps.length - 1], "01.json.bak") : null;
  need("备份里的旧批次清单要与被删前的内容逐字节相等", !!bak && fs.existsSync(bak) && eq(bak, SEED["01.json"]));
  need("要打印 TAPFIX_BACKUP= 路径（不读代码就该知道去哪儿捞）", /^TAPFIX_BACKUP=\S+pre-\d{8}-\d{6}/m.test(res.out));
  need("要打印机器可读的保留计数 TAPFIX_KEEP_FOREIGN=3", /^TAPFIX_OWNED_REMOVED=\d+ TAPFIX_KEEP_FOREIGN=3\b/m.test(res.out));
  return bad;
}

/* ══ 1. 现文件：必须全绿 ══ */
const live = fs.readFileSync(SCRIPT, "utf8");
t("被测脚本读到了 " + path.relative(REPO, SCRIPT), live.length > 0);
t("现脚本里已经没有裸的 rmSync(OUT,{recursive}) 删除动作（:51 那句被换掉了）", !WIPE_RE.test(live));

const D1 = path.join(TMP, "live", "out");
const c1 = plant(D1);
const r1 = runCarrier(SCRIPT, D1, c1);
const bad1 = judge("现脚本", D1, r1);
t("现脚本：四组保护判据全过（外来存活 / 自有换新 / 备份逐字节 / 计数打印）", bad1.length === 0, bad1.join(" | ") + " || stdout=" + r1.out.split("\n").slice(0, 6).join(" ⏎ "));

/* ══ 2. 修复前的形状：同一份判据必须变红 ══
   做法：把旧那句整目录递归删除插回一次性副本里（改副本，绝不动 live 脚本）。
   锚点用 `const TAGS =` 那一行 —— 插在它之前，语义就是"先铲平再往下走"。 */
const ANCHOR = "const TAGS = batches.map((_, i) =>";
let mutant = null;
t("能找到插入锚点（找不到就没法构造反例，这条负例不许假装跑过）", live.includes(ANCHOR));
if (live.includes(ANCHOR)) {
  mutant = live.replace(ANCHOR, "rmSync(OUT, { recursive: true, force: true });\n" + ANCHOR);
  t("副本与现脚本不同（否则红是假的）", mutant !== live);
  t("副本里确实恢复了整目录递归删除", WIPE_RE.test(mutant));
  const MP = guarded(MUTANT, "反例副本");
  fs.mkdirSync(path.dirname(MP), { recursive: true });
  fs.writeFileSync(MP, mutant);
  const D2 = path.join(TMP, "prefix-shape", "out");
  const c2 = plant(D2);
  const r2 = runCarrier(MP, D2, c2);
  const bad2 = judge("修复前副本", D2, r2);
  t("负例可红：同一份判据打到修复前的形状上必须报出未满足项", bad2.length > 0, "实得红数=" + bad2.length);
  /* 红必须来自"东西真被铲了"，不能来自夹具坏了或脚本没跑起来 */
  const wiped = !fs.existsSync(path.join(D2, "tracked-looking.json"))
    || !fs.existsSync(path.join(D2, "01", "tapfix-lane-PAGES-A-INDEX.json.json"));
  t("反例的红确实是因为外来文件被递归删除铲掉了（不是空转）", wiped, bad2.join(" | ").slice(0, 200));
  t("反例没有留下 pre-<ts>/ 备份（旧行为=无备份销毁）",
    !fs.existsSync(D2) || !fs.readdirSync(D2).some((f) => /^pre-\d{8}-\d{6}$/.test(f)));
}

/* ══ 3. 撞名必须红，且别人的东西一根手指都不许碰 ══
   两种撞法：① 批次名被非本载具形状的文件占着；② 批次目录位上是个文件。 */
const D3 = path.join(TMP, "collide-name", "out");
const c3 = plant(D3);
fs.writeFileSync(path.join(D3, "01.json"), JSON.stringify({ gitTracked: true, 为什么: "名字撞车但内容不是批次清单" }));
const OCCUPIED = fs.readFileSync(path.join(D3, "01.json"), "utf8");
const r3 = runCarrier(SCRIPT, D3, c3);
t("批次名被别人的文件占着 ⇒ 非 0 退出（既不覆盖也不静默跳过）", r3.code !== 0, "exit=" + r3.code);
/* 判据用 r3.out 原文（san() 只用在要打印的地方，别拿它去喂正则：
   第一版就是被自己那个 "把 = 换成 ~" 的消毒函数骗了，正则对不上却查不出原因）。 */
t("且那句失败是点名碰撞的", /碰撞/.test(r3.out) && /BRIEF_RESULT=FAIL/.test(r3.out), "exit=" + r3.code);
t("碰撞时占位的文件逐字节没被动过", eq(path.join(D3, "01.json"), OCCUPIED));

const D4 = path.join(TMP, "collide-dir", "out");
const c4 = plant(D4);
fs.rmSync(path.join(D4, "01"), { recursive: true, force: true });
fs.writeFileSync(path.join(D4, "01"), "这里该是个目录，实是个文件");
const r4 = runCarrier(SCRIPT, D4, c4);
t("批次目录位上是个文件 ⇒ 非 0 退出且说清是哪个路径", r4.code !== 0 && /01/.test(r4.out), "exit=" + r4.code);

/* ══ 4. 幂等：再跑一遍，保留计数不许把自家备份算成外来 ══ */
const r5 = runCarrier(SCRIPT, D1, c1);
const kv = (s, k) => { const m = s.match(new RegExp(k + "=(\\d+)")); return m ? Number(m[1]) : -1; };
t("第二趟仍然退出码 0", r5.code === 0, "exit=" + r5.code + " " + san(r5.out).slice(0, 200));
t("第二趟 TAPFIX_KEEP_FOREIGN 仍是 3（备份目录 pre-* 不许被当成外来文件重复计数）", kv(r5.out, "TAPFIX_KEEP_FOREIGN") === 3, "实得=" + kv(r5.out, "TAPFIX_KEEP_FOREIGN"));
t("第二趟仍然没有动复核员产物", eq(path.join(D1, "01", "tapfix-lane-PAGES-A-INDEX.json.json"), SEED["01/tapfix-lane-PAGES-A-INDEX.json.json"]));

/* ══ 5. 收尾：一次性反例副本不许留在仓里 ══ */
fs.rmSync(TMP, { recursive: true, force: true });
t("反例副本已删除，且 .zcode/tmp 下没有残留的载具副本", !fs.existsSync(MUTANT) && !fs.existsSync(TMP));
t("全程没往 reports/ 写过任何东西（自检自己的保险闸）",
  !fs.existsSync(path.join(REPO, "reports", "audit", "round-7", "tapfix-briefs", "pre-20200101-000000")));

console.log(fails ? "NOTWIPE_TEST=FAIL" : "NOTWIPE_TEST=PASS");
console.log("NOTWIPE_RAN checks=" + checks + " 正例红=" + bad1.length + " 反例红=" + (mutant ? "已构造" : "未构造"));
console.log("SUMMARY: assertion failures = " + fails);
process.exit(fails ? 1 : 0);
