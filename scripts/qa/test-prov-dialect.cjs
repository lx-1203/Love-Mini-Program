/* verify-provenance-all 的「帧路径方言」自检。
 *
 * 起因（本轮实测，不是假想）：round-6-real-tour 的 18 帧 + smoke 2 帧被门禁判成
 * PROV_FRAMES_UNRESOLVABLE=20，而 20 张帧**全部在盘上**。根因在门禁的解析式
 *   p.startsWith(repo) || p.startsWith("/") ? p : join(repo, p)
 * —— Windows 上 repo 是反斜杠形态，`D:/6/…` 这种绝对+正斜杠两支都不命中，join 出一个必然不存在的字符串。
 * 一个把存在的文件报成断链的门禁，会把「取证洞」的注意力从真洞上引开，所以两侧都要有护栏：
 * 生产者写规范方言（real-tour-cli.mjs 的 selfcheck），门禁不再因分隔符方言误红。
 *
 * 判据要能区分对错，所以每个正例都配了「旧解析式在同一条路径上的结果」作为反向对照，
 * 并显式区分 Windows / POSIX 两种平台事实（方言洞是平台相关的，不假装通用）。
 * 用法：node scripts/qa/test-prov-dialect.cjs
 */
const { mkdirSync, writeFileSync, existsSync, rmSync, utimesSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const REPO = resolve(__dirname, "..", "..");
const GATE = join(REPO, "scripts", "qa", "verify-provenance-all.mjs");
const FX = join(REPO, ".zcode", "tmp", "provdialect");
const HEAD = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();

let fail = 0, cases = 0;
const ok = (cond, label, detail) => {
  cases++;
  if (cond) console.log(`  ok   ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? "  «" + detail + "»" : ""}`); }
};

/* 旧解析式逐字复刻：用来证明「这条用例真的能判出差别」，而不是新代码恰好也让老毛病通过 */
const OLD_REPO = resolve(REPO); // 门禁里 repo = path.resolve(...)，Windows 上是反斜杠形态
function oldResolve(p) {
  return p.startsWith(OLD_REPO) || p.startsWith("/") ? p : join(OLD_REPO, p);
}

function makeShot(dir, name) {
  mkdirSync(dir, { recursive: true });
  const f = join(dir, name);
  writeFileSync(f, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(2048, 7)]));
  const now = new Date();
  utimesSync(f, now, now);            // mtime=现在 ⇒ 时间轴归属应落在当前 HEAD 之后，判 consistent
  return f;
}
function manifest(dir, obj) {
  const p = join(dir, "manifest-detail.json");
  writeFileSync(p, JSON.stringify({ gitSha: HEAD, shots: obj }, null, 1));
  return p;
}
function runGate(sub) {
  const root = join(".zcode", "tmp", "provdialect", sub);
  const r = spawnSync(process.execPath, [GATE, "--root", root, "--scope", root + "/"], {
    cwd: REPO, encoding: "utf8", timeout: 120000,
  });
  const out = String(r.stdout || "") + String(r.stderr || "");
  const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : null; };
  return {
    code: r.status, out,
    consistent: num(/PROV_FRAMES_CONSISTENT=(\d+)/),
    unresolvable: num(/PROV_FRAMES_UNRESOLVABLE=(\d+)/),
    absolute: num(/PROV_FRAMES_ABSOLUTE=(\d+)/),
    verdict: (out.match(/PROVENANCE_RESULT=(\w+)/) || [])[1],
  };
}

rmSync(FX, { recursive: true, force: true });

// ---------- A. 规范方言：仓库相对 + 正斜杠 ----------
{
  const dir = join(FX, "rel");
  makeShot(dir, "shot-a.png");
  manifest(dir, [{ path: ".zcode/tmp/provdialect/rel/shot-a.png" }]);
  const g = runGate("rel");
  ok(g.consistent === 1, "A 相对方言：consistent=1", "got=" + g.consistent);
  ok(g.unresolvable === 0, "A 相对方言：unresolvable=0", "got=" + g.unresolvable);
  ok(g.absolute === 0, "A 相对方言：absolute=0（不该被误记成绝对）", "got=" + g.absolute);
  ok(g.code === 0 && g.verdict === "PASS", "A 相对方言：exit 0 / PASS", "code=" + g.code + " verdict=" + g.verdict);
}

// ---------- B. 绝对 + 正斜杠（本轮真出过错的那一类） ----------
{
  const dir = join(FX, "absfwd");
  const f = makeShot(dir, "shot-b.png");
  const fwd = f.split("\\").join("/");
  manifest(dir, [{ path: fwd }]);
  const g = runGate("absfwd");
  ok(existsSync(fwd), "B 帧确实在盘上（用绝对+正斜杠字符串 stat）", "不存在");
  if (process.platform === "win32") {
    ok(!existsSync(oldResolve(fwd)),
      "B 反向对照：旧解析式对同一条路径必然 stat 不到（证明 B 测的是真差别）",
      "oldResolve=" + oldResolve(fwd));
    ok(fwd.startsWith(OLD_REPO) === false,
      "B 机制：绝对+正斜杠不以反斜杠形态的 repo 开头（旧式因此落进 join 分支）",
      "startsWith=" + fwd.startsWith(OLD_REPO));
  } else {
    ok(existsSync(oldResolve(fwd)),
      "B 反向对照（POSIX）：绝对路径以 / 开头，旧式在此平台本就正确 ⇒ 方言洞是 Windows 专属事实",
      "oldResolve=" + oldResolve(fwd));
  }
  ok(g.unresolvable === 0, "B 新门禁：绝对+正斜杠不再被算成断链帧", "unresolvable=" + g.unresolvable);
  ok(g.consistent === 1, "B 新门禁：consistent=1", "got=" + g.consistent);
  ok(g.absolute === 1, "B 方言提示：absolute=1（可见但不计红）", "got=" + g.absolute);
  ok(g.code === 0 && g.verdict === "PASS", "B 新门禁：exit 0 / PASS", "code=" + g.code + " verdict=" + g.verdict);
}

// ---------- C. 绝对 + 反斜杠：旧式本来就能处理，改动不得把它弄坏 ----------
{
  const dir = join(FX, "absback");
  const f = makeShot(dir, "shot-c.png");
  manifest(dir, [{ path: f }]);
  ok(existsSync(oldResolve(f)), "C 反向对照：旧解析式对绝对+反斜杠是有效的（改动必须保留这条）", "oldResolve=" + oldResolve(f));
  const g = runGate("absback");
  ok(g.unresolvable === 0 && g.consistent === 1, "C 新门禁：绝对+反斜杠仍解析（归一分隔符没有回退老能力）",
    "unresolvable=" + g.unresolvable + " consistent=" + g.consistent);
  ok(g.absolute === 1, "C 方言提示：absolute=1", "got=" + g.absolute);
}

// ---------- D. 真的不在盘上：必须仍然判红，且能说清是哪一条 ----------
{
  const dir = join(FX, "missing");
  makeShot(dir, "real.png");
  manifest(dir, [{ path: ".zcode/tmp/provdialect/missing/ghost.png" }, { path: ".zcode/tmp/provdialect/missing/real.png" }]);
  const g = runGate("missing");
  ok(g.unresolvable === 1, "D 真断链：unresolvable=1（只有 ghost 那一条）", "got=" + g.unresolvable);
  ok(g.consistent === 1, "D 同清单里的真帧照常计一致：consistent=1", "got=" + g.consistent);
  ok(g.code === 1 && g.verdict === "FAIL", "D 真断链必须计红：exit 1 / FAIL", "code=" + g.code + " verdict=" + g.verdict);
  ok(/PROV_FRAME_MISSING .*ghost\.png/.test(g.out), "D 红要可归因：打印缺失帧的记法与解析结果", "样例行未出现");
}

// ---------- E. 扫描集为空不得判绿 ----------
{
  mkdirSync(join(FX, "empty"), { recursive: true });
  const g = runGate("empty");
  ok(g.code === 2, "E 空夹具：exit 2（宁可红着也不空过）", "code=" + g.code);
  ok(g.verdict === "FAIL", "E 空夹具：PROVENANCE_RESULT=FAIL", "verdict=" + g.verdict);
}

rmSync(FX, { recursive: true, force: true });
console.log(`PVD_SUMMARY cases=${cases} fail=${fail} head=${HEAD} platform=${process.platform}`);
console.log(`PVD_TEST=${fail ? "FAIL" : "PASS"}`);
process.exit(fail ? 1 : 0);
