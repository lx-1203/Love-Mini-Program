/* 模拟器独占租约（round-7 补的载具）。
 *
 * 为什么必须有：本机有两条通道会驱动**同一个** DevTools 模拟器
 *   · r-exec-cli / shoot-frameplan / tour（走 IDE 的 CLI 桥，不占 WS 端口）
 *   · r-exec.cjs / poll-reshoot / G7·G9 自检（占 wechat-automation-<port>.lock 那套按端口命名的锁）
 * 两边各自认为"我拿到了 UI"时，后到的那个不会报错，只会把前一个正在量的页换掉——
 * 实测代价：本轮我并发跑了 write-gates-json（内含 G7/G9 会开页）与全量交互轮，
 * 结果 214 行里 58 行落点探针取空、41 行交互下发"no such element"，一整批测量作废。
 *
 * 三条不许越过的线：
 *   1) 只读别人的锁，永不改写/删除非本人属主的锁文件（历史墓碑尤其不能动）；
 *   2) 只要目录里存在"活租约"（status=LEASED 且 pid 还活着 或 租期未过）就拒绝启动，
 *      即使那个 pid 看起来已死——租期没到仍按有人在用（与 poll-reshoot 同口径）；
 *   3) 自己那把锁落在同一个目录、同一套字段上，让按端口命名的老工具也能看见我。
 *
 * 用法：import { acquireUi, releaseUi, heldLeases } from "./ui-lease.mjs"; */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";

/* import.meta.dirname 要 node ≥20.11；本模块会被 emit-round-report 在任意解释器下 import，
   拿不到就会在 import 期抛 TypeError（一整份报告打不出来，原因却藏在别的文件里）。 */
const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
export const LOCK_DIR = process.env.QA_LOCK_DIR ? resolve(process.env.QA_LOCK_DIR) : join(REPO, "tmp", "qa", "locks");
const LEASE_MS = Number(process.env.QA_LEASE_MS || 20 * 60 * 1000);
const SELF_RESOURCE = process.env.QA_UI_RESOURCE || "wechat-automation-cli";

const pidAlive = (pid) => {
  if (!pid || !Number.isFinite(pid)) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
};
const readLock = (file) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; } };
const live = (l) => {
  if (!l) return false;
  if (String(l.status || "").toLowerCase() !== "leased") return false;
  const unexpired = l.leaseUntil && new Date(l.leaseUntil).getTime() + 30000 > Date.now();
  // 租期没到 ⇒ 一律算占用；租期过了但进程还活着 ⇒ 也算（它只是忘了续租）
  return !!unexpired || pidAlive(l.pid);
};

/** 目录里当前所有"活租约"（排除 excludeOwner 自己，便于续租时不把自己算成冲突）。 */
export function heldLeases({ excludeOwner = null, dir = LOCK_DIR } = {}) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!/\.lock$/.test(name)) continue;
    const l = readLock(join(dir, name));
    if (!l || !live(l)) continue;
    if (excludeOwner && l.owner === excludeOwner && pidAlive(l.pid) && l.pid === process.pid) continue;
    out.push({ file: name, owner: l.owner || "?", pid: l.pid, resource: l.resource || name, leaseUntil: l.leaseUntil || "?" });
  }
  return out;
}

function writeSelf(owner, batch, extra = {}) {
  mkdirSync(dirOf(), { recursive: true });
  const file = join(LOCK_DIR, SELF_RESOURCE + ".lock");
  const prev = readLock(file) || {};
  const now = new Date().toISOString();
  writeFileSync(file, JSON.stringify({
    resource: SELF_RESOURCE, owner, pid: process.pid, host: hostname(), batch: batch || "-",
    status: "LEASED", leaseUntil: new Date(Date.now() + LEASE_MS).toISOString(),
    attempt: (prev.attempt || 0) + 1, acquiredAt: prev.acquiredAt || now, lastHeartbeat: now, ...extra,
  }, null, 1));
  return file;
}
function dirOf() { return LOCK_DIR; }

/** 取租约。他人活锁 ⇒ {ok:false, state:"BUSY", holders}；成功 ⇒ {ok:true, file}。
 *  「算不算我自己」只看 pid，不看 owner 字符串：owner 是从 LABEL / PAGE 这类入参派生的，
 *  两个进程完全可能取出同一个 owner 名。原实现按 owner 相等放行，等于让同名的两个驱动
 *  同时认为自己独占模拟器 —— 这正是本模块要防的那起事故（自检 a10 现在盯着它）。 */
export function acquireUi({ owner, batch } = {}) {
  const holders = heldLeases().filter((h) => !(h.owner === owner && Number(h.pid) === process.pid));
  if (holders.length) return { ok: false, state: "BUSY", holders };
  return { ok: true, state: "ACQUIRED", file: writeSelf(owner, batch) };
}
export function renewUi({ owner, batch } = {}) { writeSelf(owner, batch); }
/** 一把梭的守卫：取不到租约就直接退（默认 2），取到了就挂上退出释放与 SIGINT/SIGTERM。
 *  为什么要有 —— r-exec-cli / shoot-frameplan / write-gates-json 各自抄了同一段 20 行的避让逻辑，
 *  再抄四遍就是四种"某一天的漏网之鱼"（本轮的事故恰恰来自一个没抄这段的工具）。
 *  已有自己实现的老工具不动：正在跑的进程持有的锁名不能被我改坏。 */
export function guardUiLease({ owner, batch = "R7", tag = "UI_LEASE", failTag = "LEASE", exitCode = 2 } = {}) {
  if (process.env.QA_SKIP_UI_LEASE === "1") {
    console.log(`${tag}=SKIPPED（QA_SKIP_UI_LEASE=1，明知有别的驱动时会污染测量）`);
    return { skipped: true, renew() {}, release() {} };
  }
  const got = acquireUi({ owner, batch });
  if (!got.ok) {
    console.log(`${failTag}_RESULT=FAIL reason=模拟器已被占用（` +
      got.holders.map((h) => h.owner + "@pid" + h.pid + " 租期到 " + h.leaseUntil).join("；") +
      `）⇒ 一行都不跑；确要并发请显式设 QA_SKIP_UI_LEASE=1`);
    process.exit(exitCode);
  }
  console.log(`${tag}=${got.state} ${String(got.file).replace(process.cwd() + "/", "")} owner=${owner}`);
  const release = () => { try { releaseUi({ owner }); } catch (e) { /* 退出路径上的释放失败不该改判决 */ } };
  process.on("exit", release);
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { release(); process.exit(sig === "SIGINT" ? 130 : 143); });
  return { skipped: false, file: got.file, renew: () => renewUi({ owner, batch }), release };
}export function releaseUi({ owner } = {}) {
  const file = join(LOCK_DIR, SELF_RESOURCE + ".lock");
  const l = readLock(file);
  if (!l || (l.owner && owner && l.owner !== owner)) return { released: false, why: "锁不属我（绝不动别人的锁）" };
  if (l.pid !== process.pid) return { released: false, why: "pid 不是本进程，跳过改写" };
  writeFileSync(file, JSON.stringify(Object.assign({}, l, { status: "released", releasedAt: new Date().toISOString() }), null, 1));
  return { released: true, file };
}
