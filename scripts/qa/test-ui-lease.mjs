/* UI 租约的离线自检：全程用临时目录，一次都不碰真实 tmp/qa/locks/
   （那里有上一轮的历史墓碑，脚本自己写了"绝不删改他人锁"的规矩，自检就得先做到）。
   跑法：PATH=<node22>:$PATH node scripts/qa/test-ui-lease.mjs */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, hostname } from "node:os";

const dir = mkdtempSync(join(tmpdir(), "qalease-"));
process.env.QA_LOCK_DIR = join(dir, "locks");
const { acquireUi, releaseUi, heldLeases } = await import("./ui-lease.mjs");
const L = join(dir, "locks", "wechat-automation-cli.lock");

let fails = 0, ran = 0;
const t = (name, cond, got) => { ran++; console.log((cond ? "ok   " : "FAIL ") + name + (got === undefined ? "" : " → " + got)); if (!cond) fails++; };

t("a0 空目录无活锁", heldLeases().length === 0, JSON.stringify(heldLeases()));
const a = acquireUi({ owner: "selftest-A", batch: "R99" });
t("a1 首次取得租约", a.ok === true, a.state);
t("a2 锁文件写出来了", !!readFileSync(L, "utf8").includes("LEASED"));
const b = acquireUi({ owner: "selftest-B", batch: "R99" });
t("a3 他人活锁 ⇒ BUSY 且不改写锁文件", b.ok === false && b.state === "BUSY" && b.holders.length === 1,
  b.state + " holders=" + (b.holders || []).map((h) => h.owner).join(","));
t("a4 BUSY 时没把属主改成 B", readFileSync(L, "utf8").includes("selftest-A"));

// 过期租约 + 不存在的 pid ⇒ 不再算占用（这是"上一轮没退干净"最常见的形状）
const stale = JSON.parse(readFileSync(L, "utf8"));
writeFileSync(L, JSON.stringify(Object.assign({}, stale, {
  leaseUntil: new Date(Date.now() - 60000).toISOString(), pid: 2147483645,
}), null, 1));
t("a5 租期已过且 pid 已死 ⇒ 不再算活锁", heldLeases().length === 0, JSON.stringify(heldLeases()));

// 租期已过但进程还活着 ⇒ 仍按占用（它只是忘了续租，不是真退出）
writeFileSync(L, JSON.stringify(Object.assign({}, stale, {
  pid: process.pid, leaseUntil: new Date(Date.now() - 60000).toISOString(),
}), null, 1));
t("a6 租期过但进程活着 ⇒ 仍 BUSY", heldLeases().length === 1, JSON.stringify(heldLeases()));

// status=released 的历史墓碑必须透明（否则锁目录会越用越满）
writeFileSync(L, JSON.stringify(Object.assign({}, stale, {
  status: "released", pid: process.pid, leaseUntil: new Date(Date.now() + 600000).toISOString(),
}), null, 1));
t("a7 released 墓碑不算占用", heldLeases().length === 0, JSON.stringify(heldLeases()));

/* a8 原先写成 `r.released === false || r.released === true` —— 恒真，等于没测。
   换成真的会咬人的两条：不是我的锁不得硬写，是我的锁要能落到 released。 */
writeFileSync(L, JSON.stringify(Object.assign({}, stale, {
  owner: "selftest-A", status: "LEASED", pid: process.pid, leaseUntil: new Date(Date.now() + 600000).toISOString(),
}), null, 1));
const rOther = releaseUi({ owner: "selftest-Z" });
t("a8 释放别人的锁 ⇒ 拒绝且文件原样", rOther.released === false && readFileSync(L, "utf8").includes("selftest-A"), JSON.stringify(rOther));
const rMine = releaseUi({ owner: "selftest-A" });
t("a8b 释放自己的锁 ⇒ 落 released 墓碑", rMine.released === true && readFileSync(L, "utf8").includes('"released"'), JSON.stringify(rMine));

/* guardUiLease 是四个会开页的工具共用的那段避让逻辑，所以它必须在**子进程**里被验：
   它拿不到租约时会 process.exit(2)，在本进程里跑一次就把自检本身杀掉了。 */
import { spawnSync } from "node:child_process";
import { resolve as rsl } from "node:path";
const QA_QA = rsl(import.meta.dirname);
const hasLockFile = (d) => { try { return readdirSync(d).length > 0; } catch { return false; } };
const child = (code, env) => spawnSync(process.execPath, ["--input-type=module", "-e", code],
  { cwd: QA_QA, encoding: "utf8", env: Object.assign({}, process.env, env), timeout: 60000 });
const ACQ = 'const { guardUiLease } = await import("./ui-lease.mjs");'
  + "const g = guardUiLease({ owner: process.env.QA_TEST_OWNER || \"child-own\", tag: \"T_LEASE\", failTag: \"T\" });"
  + "console.log(\"CHILD_NOT_SKIPPED=\" + (!g.skipped));";
const c1 = child(ACQ, { QA_LOCK_DIR: process.env.QA_LOCK_DIR + "-child" });
t("a9 空目录 ⇒ guardUiLease 取到租约且不退出",
  c1.status === 0 && c1.stdout.includes("T_LEASE=ACQUIRED") && c1.stdout.includes("CHILD_NOT_SKIPPED=true"),
  "exit=" + c1.status + " out=" + c1.stdout.trim().split("\n").pop());
t("a9b 取到之后锁文件确实落下", (readFileSync(join(process.env.QA_LOCK_DIR + "-child", "wechat-automation-cli.lock"), "utf8")).includes("child-own"));
/* a10 的"崩掉的持有者"要手工造：guardUiLease 在正常退出时会自己 release（a9 那个孩子就是），
   所以"c1 留下的锁"根本不是孤儿租约 —— 上一版把这条测成了空测。
   真形状是：进程被杀 ⇒ 锁里仍是 LEASED 且租期未过 ⇒ 后来者必须被拦住。 */
const crashDir = join(dir, "crash-locks");
mkdirSync(crashDir, { recursive: true });
writeFileSync(join(crashDir, "wechat-automation-cli.lock"), JSON.stringify({
  resource: "wechat-automation-cli", owner: "ghost-driver", pid: 2147483645, host: hostname(),
  batch: "R99", status: "LEASED", leaseUntil: new Date(Date.now() + 600000).toISOString(),
}, null, 1));
const c2 = child(ACQ, { QA_LOCK_DIR: crashDir });
t("a10 孤儿活租约（pid 已死、租期未过）⇒ 仍拦得住",
  c2.status === 2 && c2.stdout.includes("T_RESULT=FAIL") && c2.stdout.includes("模拟器已被占用"),
  "exit=" + c2.status + " out=" + c2.stdout.trim().split("\n").pop());
t("a10b 拦下时不改写孤儿锁", readFileSync(join(crashDir, "wechat-automation-cli.lock"), "utf8").includes("ghost-driver"));
/* a12：这条才是本轮真找到的洞。owner 是从 LABEL/PAGE 派生的字符串，两个进程完全可能同名；
   旧实现用「owner 相等」当"这是我"的判据，于是同名并发直接双双放行 —— 租约形同不存在。 */
const own = acquireUi({ owner: "same-name-different-pid", batch: "R99" });
t("a12 本进程先占住一个 owner 名", own.ok === true, own.state);
const c4 = child(ACQ, { QA_TEST_OWNER: "same-name-different-pid" });
t("a12b 同名但 pid 不同 ⇒ BUSY（旧实现在这里会放行）",
  c4.status === 2 && c4.stdout.includes("模拟器已被占用"), "exit=" + c4.status);
t("a12c 拦下之后锁仍归本进程", readFileSync(join(process.env.QA_LOCK_DIR, "wechat-automation-cli.lock"), "utf8").includes("same-name-different-pid"));
const rOwn = releaseUi({ owner: "same-name-different-pid" });
t("a12d 自己释放自己的锁", rOwn.released === true, JSON.stringify(rOwn));
const c3 = child(ACQ, { QA_LOCK_DIR: process.env.QA_LOCK_DIR + "-skip", QA_SKIP_UI_LEASE: "1" });
t("a11 QA_SKIP_UI_LEASE=1 ⇒ 明跳且不留锁文件",
  c3.status === 0 && c3.stdout.includes("T_LEASE=SKIPPED") && !hasLockFile(join(process.env.QA_LOCK_DIR + "-skip")),
  "exit=" + c3.status);
rmSync(process.env.QA_LOCK_DIR + "-child", { recursive: true, force: true });
rmSync(process.env.QA_LOCK_DIR + "-skip", { recursive: true, force: true });

rmSync(dir, { recursive: true, force: true });
/* 总数从**实际跑过的断言**派生：上一版把 checks=9 写死，加一条就会报出一个不存在的总数。 */
console.log("LEASE_SUMMARY checks=" + ran + " fail=" + fails);
console.log("LEASE_TEST=" + (fails ? "FAIL" : "PASS") + " 断言失败数=" + fails);
process.exit(fails ? 1 : 0);
