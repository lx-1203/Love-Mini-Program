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
 * 第四条（本轮补，只加信息不加口子）：**孤儿租约**（status=LEASED、租期未过、但属主进程已被 taskkill）
 * 必须与"真有人在用"区分得出来 —— 实测两次：设备腿被杀之后 wechat-automation-cli.lock 仍以
 * LEASED + 未来 leaseUntil 挂着，CLOSEOUT/WAIT_UI 打印的「设备正在被用（r7-guest-landing@pid45960）」
 * 把一个已经不存在的进程说成活跃竞争者，下一个人因此白等满一个租期。
 *   · 判定：pid 必须"两次独立检查都说没了"才算孤儿（见 pidState），任何不确定一律按**活着**（fail-safe）；
 *   · 孤儿**仍然拦**（规矩 2 不改），只是 reason 里写清"属主进程已不存在"；
 *   · 想接管必须显式调 reclaimOrphanUi({confirm:"RECLAIM_ORPHAN", ...}) —— 它先把原文件逐字节留档成
 *     .orphan-<时间戳>，再换属主，pid 还活着就直接拒。不做成环境变量：环境变量是环境态、会被任何
 *     后代进程继承（一个留在 shell 里的 QA_RECLAIM_ORPHAN=1 会让之后每条腿都能悄悄抢锁），
 *     而函数调用必须写在调用点上，接管因此永远是可归因的一次决定。
 *
 * 用法：import { acquireUi, releaseUi, heldLeases, reclaimOrphanUi, pidState } from "./ui-lease.mjs"; */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";

/* import.meta.dirname 要 node ≥20.11；本模块会被 emit-round-report 在任意解释器下 import，
   拿不到就会在 import 期抛 TypeError（一整份报告打不出来，原因却藏在别的文件里）。 */
const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
export const LOCK_DIR = process.env.QA_LOCK_DIR ? resolve(process.env.QA_LOCK_DIR) : join(REPO, "tmp", "qa", "locks");
const LEASE_MS = Number(process.env.QA_LEASE_MS || 20 * 60 * 1000);
const SELF_RESOURCE = process.env.QA_UI_RESOURCE || "wechat-automation-cli";

/* ---- 判活（本轮补）：三态，判不出来就当"还活着" ----
 * 为什么值得较真：排他性建立在"属主进程还在不在"上，判反了的代价就是把正在被用的模拟器抢走
 * ——正是本文件头注记录的那起事故（一次并发把 214 行测量打成 58+41 行作废）。所以两票一致才认死：
 *   第一票 process.kill(pid, 0)：libuv 在 Windows 上走 OpenProcess(QUERY_LIMITED|TERMINATE)，
 *     进程不存在 ⇒ ESRCH；存在但打不开（受保护进程，本机实测 pid 4 System 给 EPERM）⇒ 算活着。
 *   第二票 tasklist /FI "PID eq <pid>" /FO CSV /NH：本机实测 ~155ms/次，只在第一票说"没了"时才花，
 *     常规路径（属主活着）一次都不 spawn。命中判据是 CSV 第 2 字段精确等于该 pid（`,"<pid>",`），
 *     不是子串包含 —— 实测查 4 命中 `"System","4",…` 而不会误命中 `"40"`。
 * 为什么没用 taskkill /0（本机实测，写下来免得下一个人再试）：这个 Windows 的 taskkill 没有 /0 开关，
 *   `taskkill /PID <活pid> /0` 一律"无效参数/选项"退出 1 ⇒ 拿它判活会把每个进程都判成死，
 *   恰好是"把有人在用的锁当孤儿抢走"那个方向的错，绝对不能用。
 * 已知残余风险：万一 tasklist 看不见某个活进程（极少数受保护/其他会话的进程），需要两票同时失手
 *   才会误判成孤儿；此时 reclaimOrphanUi 还会再强制问一次，且 pidState() 返回 unknown 一律拒接管。
 * 非 win32：kill(2) 的 ESRCH 本身就是内核口径，不需要第二票。 */
const PID_TTL_MS = 5000;
const pidVotes = new Map();

function killVote(pid) {
  try { process.kill(pid, 0); return "alive"; }
  catch (e) {
    if (e && e.code === "ESRCH") return "gone";
    if (e && e.code === "EPERM") return "alive";   // 没权限打开 ≠ 不存在
    return "unknown";                              // ERR_INVALID_ARG_TYPE 等：连参数都不可信
  }
}
function tasklistVote(pid) {
  let r;
  try {
    r = spawnSync("tasklist", ["/FI", "PID eq " + pid, "/FO", "CSV", "/NH"],
      { encoding: "utf8", windowsHide: true, timeout: 5000 });
  } catch (e) { return "unknown"; }
  if (!r || r.error || r.signal || r.status !== 0) return "unknown";   // 问不出来 ⇒ 不猜
  const hit = String(r.stdout || "").split(/\r?\n/).some((line) => line.includes(',"' + pid + '",'));
  return hit ? "alive" : "gone";
}

/** pid 的存活三态："alive" | "dead"（两票都说没） | "unknown"（字段非法或问不出来）。
 *  调用方规矩：只有 "dead" 才允许说"孤儿"；"unknown" 与 "alive" 一样拦、一样不许接管。 */
export function pidState(rawPid, { force = false } = {}) {
  const pid = Number(rawPid);
  if (!Number.isInteger(pid) || pid <= 0) return "unknown";
  const cached = pidVotes.get(pid);
  if (!force && cached && Date.now() - cached.at < PID_TTL_MS) return cached.state;
  const first = killVote(pid);
  let state = first === "gone" ? "dead" : first;
  if (first === "gone" && process.platform === "win32") {
    const second = tasklistVote(pid);
    state = second === "alive" ? "alive" : second === "gone" ? "dead" : "unknown";
  }
  if (pidVotes.size > 512) pidVotes.clear();
  pidVotes.set(pid, { at: Date.now(), state });
  return state;
}

const pidAlive = (pid) => pidState(pid) === "alive";
const readLock = (file) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; } };
const live = (l) => {
  if (!l) return false;
  if (String(l.status || "").toLowerCase() !== "leased") return false;
  const unexpired = l.leaseUntil && new Date(l.leaseUntil).getTime() + 30000 > Date.now();
  // 租期没到 ⇒ 一律算占用；租期过了但进程还活着 ⇒ 也算（它只是忘了续租）
  return !!unexpired || pidAlive(l.pid);
};

/* 孤儿提示只说一次/进程：run-ui-queue 每 60s 轮一次 heldLeases，不能每轮都刷一行。 */
const orphanWarned = new Set();
function warnOrphan(h) {
  const key = h.file + "|" + h.pid + "|" + h.leaseUntil;
  if (orphanWarned.has(key)) return;
  orphanWarned.add(key);
  /* 走 stderr：不改任何消费者已经打印的 *_RESULT 行（它们仍然按原样落地），
     但让"设备正在被用（r7-guest-landing@pid45960）"这行旁边同时出现真相。 */
  console.error(`UI_LEASE_ORPHAN file=${h.file} owner=${h.owner} pid=${h.pid} leaseUntil=${h.leaseUntil} `
    + `⇒ 属主进程已不存在（被 taskkill 掉的腿没来得及释放），不是有人在活跃使用；`
    + `默认仍按占用拦（守排他），要接管必须在调用点显式 import { reclaimOrphanUi } 并带 confirm:"RECLAIM_ORPHAN"`);
}

/** 目录里当前所有"活租约"（排除 excludeOwner 自己，便于续租时不把自己算成冲突）。
 *  返回项除原有字段外补：pidState / orphan / why / label —— 只加信息，
 *  owner/pid/resource/leaseUntil 的含义与取值一律不动（消费者靠它们比对与打印）。 */
export function heldLeases({ excludeOwner = null, dir = LOCK_DIR } = {}) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!/\.lock$/.test(name)) continue;
    const l = readLock(join(dir, name));
    if (!l || !live(l)) continue;
    if (excludeOwner && l.owner === excludeOwner && pidAlive(l.pid) && l.pid === process.pid) continue;
    const st = pidState(l.pid);
    const h = {
      file: name, owner: l.owner || "?", pid: l.pid, resource: l.resource || name, leaseUntil: l.leaseUntil || "?",
      pidState: st,
      orphan: st === "dead",
      why: st === "dead"
        ? `属主进程 pid ${l.pid} 已不存在（孤儿租约：被杀的腿没释放）⇒ 仍按占用拦，接管须显式调 reclaimOrphanUi`
        : st === "unknown"
          ? `pid 字段缺失/非法或判活不可用（pid=${l.pid === undefined ? "(缺)" : l.pid}）⇒ fail-safe 按有人在用`
          : `属主进程 pid ${l.pid} 仍在跑 ⇒ 真有人在用`,
      label: `${l.owner || "?"}@pid${l.pid}` + (st === "dead" ? "（孤儿：属主进程已不存在，非活跃使用）"
        : st === "unknown" ? "（判不出存活：按有人在用）" : ""),
    };
    if (h.orphan) warnOrphan(h);
    out.push(h);
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
 *  同时认为自己独占模拟器 —— 这正是本模块要防的那起事故（自检 a10 现在盯着它）。
 *  注意：属主进程已死的孤儿租约在这里**照样是 BUSY**（只加信息不放行）；
 *  确认要接管的调用点显式 import { reclaimOrphanUi }，别改这里的判据。 */
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
    /* reason 里把"真有人在用"与"属主已死的孤儿租约"分开说 —— 前者别去碰，后者是白等满租期的元凶。
       令牌名（*_RESULT=FAIL）与「模拟器已被占用」这句都原样保留：消费者与自检都在 grep 它们。 */
    const describe = (h) => h.owner + "@pid" + h.pid + " 租期到 " + h.leaseUntil +
      (h.orphan ? "【孤儿：属主进程已不存在，不是在活跃使用】" : h.pidState === "unknown" ? "【判不出存活：按有人在用】" : "");
    const orphans = (got.holders || []).filter((h) => h.orphan);
    console.log(`${failTag}_RESULT=FAIL reason=模拟器已被占用（` +
      got.holders.map(describe).join("；") +
      `）⇒ 一行都不跑；确要并发请显式设 QA_SKIP_UI_LEASE=1` +
      (orphans.length
        ? ` ｜其中 ${orphans.length} 把是孤儿租约（pid 已没、租期未过）：默认仍拦，接管请调用 ui-lease 的 reclaimOrphanUi({confirm:"RECLAIM_ORPHAN"})（会先把原锁逐字节留档），别拿 QA_SKIP_UI_LEASE=1 当接管用`
        : ""));
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

/** 显式接管的确认令牌：拼错/漏了都拒，没有默认值。 */
export const RECLAIM_CONFIRM = "RECLAIM_ORPHAN";

/* 【唯一能把孤儿租约接过来的门】
 * 为什么做成"专用导出函数"而不是环境变量（本轮的选择，理由一句话）：环境变量是环境态、会被任何
 * 后代进程继承，一个留在 shell 里的 QA_RECLAIM_ORPHAN=1 会让之后每条腿都静默获得抢锁能力且查不到
 * 是谁授权的；而函数调用必须写在调用点上，接管因此永远是可归因的一次显式决定，不 opt-in 的消费者
 * 行为与今天逐字节相同。
 * 三条硬规矩：
 *   1) 先留档再动笔：原文件逐字节 copy 成 <锁名>.orphan-<UTC时间戳>（故意不以 .lock 结尾 ⇒
 *      heldLeases 的 /\.lock$/ 扫描看不见它，tour-r6 的 -probe.lock 清点也不会误收）；
 *   2) pid 仍存活、或判不出存活（unknown）⇒ 拒，文件一个字节都不改；
 *   3) status 不是 LEASED（历史墓碑/异常锁）⇒ 拒：头注规矩 1 对墓碑永远生效。
 * 成功后这把锁归调用进程（pid=本进程），于是紧随其后的 acquireUi 的自比对（owner+pid）会认它是我。 */
export function reclaimOrphanUi({ owner, batch = "-", file = null, confirm = "", reason = "" } = {}) {
  const refuse = (why, extra = {}) => Object.assign({ reclaimed: false, why }, extra);
  if (confirm !== RECLAIM_CONFIRM) return refuse(`没带 confirm:"${RECLAIM_CONFIRM}" ⇒ 接管孤儿租约必须是一次显式调用，不接受顺手参数`);
  if (!owner) return refuse("没给 owner ⇒ 接管后这把锁没人认领，等于把租约改成匿名（不许）");
  const name = file || SELF_RESOURCE + ".lock";
  if (/[/\\]/.test(name)) return refuse("file 只收锁目录里的文件名（不给路径，免得顺着路径写到目录外）");
  const target = join(LOCK_DIR, name);
  const l = readLock(target);
  if (!l) return refuse(`锁读不到或不是合法 JSON：${name} ⇒ 无从判断属主，不接管`, { file: name });
  const status = String(l.status || "").toLowerCase();
  if (status !== "leased") return refuse(`status=${l.status || "(空)"} 不是 LEASED ⇒ 这是历史墓碑或异常锁，按规矩一个字节都不动`,
    { file: name, owner: l.owner, pid: l.pid, status: l.status });
  const st = pidState(l.pid, { force: true });   // 接管现场重新问一次，不吃 5s 缓存
  if (st !== "dead") return refuse(st === "alive"
    ? `pid ${l.pid} 仍存活 ⇒ 这是真有人在用，不是孤儿，拒`
    : `pid ${l.pid} 判不出存活（unknown）⇒ fail-safe 按有人在用，拒（先修判活，别先动锁）`,
    { file: name, owner: l.owner, pid: l.pid, pidState: st });
  const votes = process.platform === "win32" ? "kill=ESRCH + tasklist=no-match（两票一致）" : "kill(2)=ESRCH（内核口径）";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");   // Windows 文件名不能有冒号
  const backup = target + ".orphan-" + stamp;
  copyFileSync(target, backup);                                   // 先留档，后改写
  const nowIso = new Date().toISOString();
  const leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();
  writeFileSync(target, JSON.stringify({
    resource: l.resource || name.replace(/\.lock$/, ""), owner, pid: process.pid, host: hostname(),
    batch: batch || "-", status: "LEASED", leaseUntil,
    attempt: (l.attempt || 0) + 1, acquiredAt: nowIso, lastHeartbeat: nowIso,
    takenOverFrom: { owner: l.owner || "?", pid: l.pid, host: l.host || "?", batch: l.batch || "-", leaseUntil: l.leaseUntil || "?" },
    orphanReclaimedAt: nowIso, reclaimPidCheck: votes,
    reclaimReason: reason || "（调用方没填 reason）", reclaimedBackup: basename(backup),
  }, null, 1));
  console.log(`UI_LEASE_RECLAIM=OK file=${name} from=${l.owner || "?"}@pid${l.pid} to=${owner}@pid${process.pid} `
    + `why=属主进程已不存在（孤儿租约，租期 ${l.leaseUntil || "?"} 未到但腿已被杀） `
    + `pidCheck=${votes} backup=${basename(backup)} newLeaseUntil=${leaseUntil}`);
  return { reclaimed: true, file: target, backup, from: l.owner, fromPid: l.pid, leaseUntil };
}
