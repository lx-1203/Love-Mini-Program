/* verify-evidence-corpus 的「gitSha 三类」自检（lane: stamps，2026-09-29）。
 *
 * 起因（盘上实测，不是假想）：全域跑报 `CORPUS_EXPIRED_GITSHA=43 CORPUS_PROBLEMS=1`，
 * 读的人据此以为 43 份证据坏了，而真正不可核实的只有 1 份（reports/screenshots/round-1/
 * manifest.json 顶层无 gitSha，它那 144 帧的哈希其实逐张与盘相符）。剩下 42 份记的是**真实
 * 存在、只是比 HEAD 旧**的提交 —— 历史轮证据本就该定格在当时那枚提交上。老写法
 *   const same = sha && sha === HEAD;   // HEAD 是 --short 的 8 位
 *   if (!same) expired++;
 * 把「可解析的旧」「解析不到」「空」并成一个数，而且会把 40 位全写的 HEAD 也读成过期
 * （2026-09-28 起的 exec-* 清单就是全写方言）。门和它声称查的东西不是同一件事。
 *
 * 判据要能区分对错，所以每条负例都逐字复刻**旧判据**在同一条输入上的结果作反向对照
 * （本仓吃过多次「负例永远不变红」的亏），并且显式带「必须绿」的正例：
 * 只有负例的门禁会靠"什么都红"假装严格，那种门禁同样没人信。
 * 用法：node scripts/qa/test-corpus-sha-axis.cjs   （必须 Node 22；PATH 上的 node 是 v16，会崩）
 *
 * 标签写法有一条硬规矩（本仓踩过的自伤）：断言标签里不能出现 `CORPUS_RESULT=FAIL` 原形，
 * 聚合器 run-qa-selftests 取的是输出里第一个 `[A-Z]{2,8}_(TEST|RESULT)=(PASS|FAIL)`；
 * 要引用判据名就写 `CORPUS-RESULT=FAIL`（连字符断开正则）。
 */
const { mkdirSync, writeFileSync, rmSync, readFileSync, statSync } = require("node:fs");
const { createHash } = require("node:crypto");
const { join, resolve } = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");

const REPO = resolve(__dirname, "..", "..");
const GATE = join(REPO, "scripts", "qa", "verify-evidence-corpus.mjs");
const FXREL = ".zcode/tmp/corpussha";
const FX = join(REPO, ...FXREL.split("/"));

const git = (...a) => { try { return execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim(); } catch { return ""; } };
const ok0 = (...a) => { try { execFileSync("git", a, { cwd: REPO, stdio: "ignore" }); return true; } catch { return false; } };
const HEAD8 = git("rev-parse", "--short", "HEAD");
const HEAD40 = git("rev-parse", "HEAD");
const OLDER40 = git("rev-parse", "HEAD~1");
const OLDER8 = git("rev-parse", "--short", "HEAD~1");
/* 真断链样本也现取，不写死字面量：对固定盐做 sha1 ⇒ 40 位合法形状、必然不是本仓对象。
   万一它解析成了对象就说明这条负例失效，本文件自己 exit 1 —— 负例不许恒真。 */
const PHANTOM = createHash("sha1").update("lane-stamps:corpus-unresolvable-fixture").digest("hex");

let fail = 0, cases = 0;
const ok = (cond, label, detail) => {
  cases++;
  if (cond) console.log(`  ok   ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? "  <<" + detail + ">>" : ""}`); }
};

/* 旧判据逐字复刻（verify-evidence-corpus.mjs 修订前的 L130-133）：用来证明每条用例
   真的能判出差别，而不是新代码恰好也让老毛病通过。 */
const OLD = {
  same: (sha) => !!(sha && sha === HEAD8),
  isReal: (sha) => (sha ? ok0("cat-file", "-e", sha + "^{commit}") : false),
  expiredCount: (list) => list.filter((sha) => !OLD.same(sha)).length,
};

function manifestAt(sub, gitShaValue, frames) {
  const dir = join(FX, ...sub.split("/"));
  const img = join(dir, "img");
  mkdirSync(img, { recursive: true });
  const shots = [];
  for (let i = 1; i <= frames; i++) {
    const f = join(img, `S0${i}.png`);
    writeFileSync(f, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from(sub + "-S0" + i, "utf8")]));
    const rel = f.slice(REPO.length + 1).split("\\").join("/");
    shots.push({ identity: "A", route: "pages/x/index", state: "默认", path: rel, file: rel,
      bytes: statSync(f).size, contentHash: createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16) });
  }
  writeFileSync(join(dir, "manifest-detail.json"), JSON.stringify({ generatedAt: new Date().toISOString(), gitSha: gitShaValue, shots }, null, 1));
}

function runGate(sub) {
  const root = sub ? `${FXREL}/${sub}` : FXREL;
  const r = spawnSync(process.execPath, [GATE, "--root", root, "--scope", root + "/"], { cwd: REPO, encoding: "utf8" });
  const body = (r.stdout || "") + (r.stderr || "");
  const g = (re) => { const m = body.match(re); return m ? Number(m[1]) : null; };
  return {
    code: r.status, body,
    expired: g(/CORPUS_EXPIRED_GITSHA=(\d+)/),
    problems: g(/CORPUS_PROBLEMS=(\d+)/),
    cOlder: g(/CORPUS_SHA_CLASS resolvableOlder=(\d+)/),
    cUnres: g(/CORPUS_SHA_CLASS resolvableOlder=\d+ unresolvable=(\d+)/),
    cEmpty: g(/CORPUS_SHA_CLASS resolvableOlder=\d+ unresolvable=\d+ empty=(\d+)/),
    fOlder: g(/:: frames resolvableOlder=(\d+)/),
    classLine: (body.match(/CORPUS_SHA_CLASS[^\n]*/) || ["(缺行)"])[0],
  };
}

// ---------- 前置量：夹具自己必须先成立，否则下面的断言全是空的 ----------
rmSync(FX, { recursive: true, force: true });
ok(!!HEAD8 && !!HEAD40 && !!OLDER40, "SETUP 取得到 HEAD 与 HEAD~1", `head8=${HEAD8} older=${OLDER40}`);
ok(!ok0("cat-file", "-e", PHANTOM + "^{commit}"), "SETUP 派生的 PHANTOM 确实不是本仓对象（否则负例等于没测）", PHANTOM);
ok(/^[0-9a-f]{7,40}$/.test(PHANTOM), "SETUP PHANTOM 形状合法（红只能是解析不到带来的，不能是形状）", PHANTOM);
ok(ok0("cat-file", "-e", OLDER8 + "^{commit}"), "SETUP HEAD~1 可解析（『可解析的旧』这一类的前置量）", OLDER8);

// ---------- A. 真断链（形状合法、本仓解析不到）必须红 ----------
{
  manifestAt("A", PHANTOM, 2);
  const g = runGate("A");
  ok(g.code === 1, "A 伪 SHA：exit 1（拆类之后仍然判红，没有被口径修订放行）", "code=" + g.code);
  ok(g.problems === 1, "A 伪 SHA：CORPUS_PROBLEMS=1", "problems=" + g.problems);
  ok(g.cUnres === 1 && g.cOlder === 0 && g.cEmpty === 0, "A 伪 SHA：归类 unresolvable=1", g.classLine);
  ok(/gitSha 不可核实/.test(g.body) && /真断链/.test(g.body), "A 伪 SHA：CORPUS_PROBLEM 指名『真断链』", "");
  ok(!/帧不存在=/.test(g.body) && !/哈希不符=/.test(g.body) && /matched=2/.test(g.body),
    "A 伪 SHA：2 帧哈希逐张相符，红只由 gitSha 轴引起（排除帧坏了这种混淆因）", "");
  ok(OLD.isReal(PHANTOM) === false, "A 反向对照：旧 isRealCommit 对同一枚伪 SHA 同样判假（红不是新代码造出来的）", "");
}

// ---------- B. 空 gitSha 必须红 ----------
{
  manifestAt("B", "", 2);
  const g = runGate("B");
  ok(g.code === 1, "B 空 SHA：exit 1", "code=" + g.code);
  ok(g.problems === 1, "B 空 SHA：CORPUS_PROBLEMS=1", "problems=" + g.problems);
  ok(g.cEmpty === 1, "B 空 SHA：归类 empty=1", g.classLine);
  ok(/顶层无 gitSha/.test(g.body), "B 空 SHA：CORPUS_PROBLEM 写清是『空』而不是『解析不到』", "");
}

// ---------- C. HEAD 短写 + 帧相符 ⇒ 必须绿（这条轴不是恒真的证据） ----------
{
  manifestAt("C", HEAD8, 2);
  const g = runGate("C");
  ok(g.code === 0, "C HEAD 短写：exit 0（新鲜证据不误伤）", "code=" + g.code + " | " + g.body.slice(-260));
  ok(g.expired === 0 && g.problems === 0, "C HEAD 短写：expired=0 且 problems=0", "expired=" + g.expired + " problems=" + g.problems);
  ok(OLD.same(HEAD8) === true, "C 反向对照：旧判据对短写同样认 HEAD ⇒ 新老都该绿，这条只测不恒真", "");
}

// ---------- D. HEAD 全写 40 位 ⇒ 必须绿且不进过期堆（本次修订判出的差别） ----------
{
  manifestAt("D", HEAD40, 2);
  const g = runGate("D");
  ok(g.code === 0, "D HEAD 全写：exit 0", "code=" + g.code);
  ok(g.expired === 0, "D HEAD 全写：不计进 CORPUS_EXPIRED_GITSHA", "expired=" + g.expired);
  ok(/对应当前HEAD/.test(g.body), "D HEAD 全写：逐行判决报『对应当前HEAD』", "");
  ok(OLD.same(HEAD40) === false, "D 反向对照：旧判据把同一枚提交的全写读成过期 ⇒ 本用例真的判出差别，不是新代码恰好通过", "");
  ok(OLD.expiredCount([HEAD40]) === 1 && runGate("D").expired === 0, "D 反向对照：旧口径过期数=1，新口径=0", "");
}

// ---------- E. 可解析但比 HEAD 旧 ⇒ 不判红，但必须被点名成独立一类 ----------
{
  manifestAt("E", OLDER8, 2);
  const g = runGate("E");
  ok(g.code === 0, "E 可解析的旧：exit 0（历史轮定格不被误判成坏证据）", "code=" + g.code);
  ok(g.problems === 0, "E 可解析的旧：CORPUS_PROBLEMS=0", "problems=" + g.problems);
  ok(g.expired === 1, "E 可解析的旧：仍进过期总计数（没有谎称它新鲜）", "expired=" + g.expired);
  ok(g.cOlder === 1 && g.cUnres === 0 && g.cEmpty === 0, "E 可解析的旧：归类 resolvableOlder=1", g.classLine);
  ok(g.fOlder === 2, "E 可解析的旧：帧数按类计（frames resolvableOlder=2）", g.classLine);
  ok(/可解析=\d+个提交前的历史/.test(g.body), "E 可解析的旧：逐行写出落后几枚提交，读的人不用自己数", "");
  ok(OLD.isReal(OLDER8) === true && OLD.same(OLDER8) === false,
    "E 反向对照：旧判据下它同样不判红（红从来不是这一类带来的），老毛病只在把三类并成一个数", "");
}

// ---------- F. 混合目录：一份可解析的旧 + 一份空 ⇒ 总过期 2、红只有 1 ----------
{
  manifestAt("MIX/older", OLDER8, 2);
  manifestAt("MIX/empty", "", 2);
  const g = runGate("MIX");
  ok(/CORPUS_RESULT=FAIL/.test(g.body), "F 混合：整体仍 CORPUS-RESULT=FAIL（拆类不等于放行）", "");
  ok(g.expired === 2 && g.problems === 1, "F 混合：expired=2 而红只有 1 ⇒ 两个数不再互相冒充",
    "expired=" + g.expired + " problems=" + g.problems);
  ok(g.cOlder === 1 && g.cEmpty === 1 && g.cUnres === 0, "F 混合：三类计数分别点名", g.classLine);
  ok(g.expired === g.cOlder + g.cEmpty + g.cUnres, "F 混合：三类相加 == 总过期数（拆类没漏账）",
    "expired=" + g.expired + " sum=" + (g.cOlder + g.cEmpty + g.cUnres));
}

// ---------- G. 扫描集为空不得判绿 ----------
{
  mkdirSync(join(FX, "empty", "nested"), { recursive: true });
  const g = runGate("empty");
  ok(g.code === 2, "G 空夹具：exit 2（宁可红着也不空过）", "code=" + g.code);
}

console.log(`CPSSHA_SUMMARY cases=${cases} fail=${fail} head8=${HEAD8} head40=${HEAD40.slice(0, 12)} older=${OLDER8} phantom=${PHANTOM.slice(0, 12)} platform=${process.platform}`);
console.log(`CPSSHA_TEST=${fail ? "FAIL" : "PASS"}`);
process.exit(fail ? 1 : 0);
