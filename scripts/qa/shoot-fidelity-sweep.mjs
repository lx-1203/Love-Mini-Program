#!/usr/bin/env node
/**
 * shoot-fidelity-sweep.mjs —— 逐页串行取景（MP-FIDELITY Phase D）。
 *
 * 为什么单独一条腿（而不是复用现成的两条）：
 *   · scripts/mp-shoot-reference.cjs 的 PAGES 是 2026-08-22 那张表，里面 `/pages/village/detail`、
 *     `/pages/circles/index` 这类路由在今天的产物里根本不存在（分包后是 subpackages/…）⇒ 抄它等于拍一堆 404；
 *   · scripts/qa/real-tour-cli.mjs 走 wechatide CLI，出图实测 193×413，而它自己在 :14/:229 就写了
 *     "禁止跨 harness 比像素"（automator 是 378×814）⇒ 保真比对必须钉在 automator 这一尺上；
 *   · 两者都不给"每张帧记内容 hash"，而这个项目的老病就是逐字节相同的帧被当成两个状态的证据。
 *
 * 三条写在前面的事实：
 *   1. 设备是单例：本腿一开场就 guardUiLease，绝不与别的腿并发（并发不报错，只互相换页 ⇒ 空探针）。
 *   2. 分母来自账本，不来自我的记忆：页数 = baseline-ledger.json 的行数，且账本的 bandStamp 必须等于
 *      当前产物 band（不等就退 2 —— 拿别的档的帧比理想图是伪造）。
 *   3. console 采不到就如实写"采不到"：miniprogram-automator 0.12.1 没有 onConsole/onError
 *      （实测 grep 过 out/ 的导出面），我不假装 hook 上了。
 *
 * 用法：node scripts/qa/shoot-fidelity-sweep.mjs --ledger <baseline-ledger.json> --round R1
 *        [--identity A] [--project <产物目录>] [--out <帧根目录>] [--only a,b] [--limit n]
 *        [--settle 2600] [--harness automator] [--dry]
 * 退出码：0 全数落帧；1 有页没落到帧或有空白/重复帧；2 前提不成立（账本读不到 / band 不符 / 租约被占 / 连不上）。
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { guardUiLease } from "./ui-lease.mjs";
import { hash16, judgeFrame, frameGroupKey, sigOf } from "./shoot-frameplan.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const require = createRequire(import.meta.url);
const RK = "FIDELITYSWEEP_RESULT";
const WAIT = 9000;
const MIN_BYTES = 3000; /* 与 real-tour-cli.mjs:210 同地板：小于此的帧不当证据 */

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

const LEDGER = resolve(arg("ledger", ""));
const ROUND = arg("round", "");
const IDENTITY = arg("identity", "A");
const PROJECT = resolve(arg("project", join(REPO, "apps/client/dist/build/mp-weixin-real")));
const WS = arg("ws", "ws://127.0.0.1:9420");
const SETTLE = Number(arg("settle", String(WAIT)));
const ONLY = arg("only", "").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = Number(arg("limit", "0"));
const dryRun = flag("dry");

if (!LEDGER || !existsSync(LEDGER)) { console.log(`${RK}=NOT-EVIDENCED reason=no-ledger path=${LEDGER || "(没传 --ledger)"}`); process.exit(2); }
if (!ROUND) { console.log(`${RK}=NOT-EVIDENCED reason=no-round（帧目录必须带轮次，否则下一轮会覆写上一轮）`); process.exit(2); }

const ledger = JSON.parse(readFileSync(LEDGER, "utf-8"));
const rows = (ledger.rows || []);
if (!rows.length) { console.log(`${RK}=NOT-EVIDENCED reason=empty-ledger（空账本不许占设备）`); process.exit(2); }

/* band 核对：帧必须钉在账本声明的那棵树上。算法与 scripts/qa/artifact-band.mjs:14-24 一致。 */
function bandOf(dir) {
  const f = join(dir, "config/env.js");
  if (!existsSync(f)) return "";
  const buf = readFileSync(f);
  const m = String(buf).match(/MODE:\s*"([^"]+)"/);
  const { createHash } = require("node:crypto");
  return `${m ? m[1] : "?"}@${createHash("sha256").update(buf).digest("hex").slice(0, 8)}`;
}
const bandNow = bandOf(PROJECT);
if (!bandNow) { console.log(`${RK}=NOT-EVIDENCED reason=no-env-js dir=${PROJECT}`); process.exit(2); }
if (ledger.bandStamp && ledger.bandStamp !== bandNow) {
  console.log(`${RK}=NOT-EVIDENCED reason=band-mismatch ledger=${ledger.bandStamp} artifact=${bandNow} ⇒ 账本与产物不是同一棵树，取景就是假证据`);
  process.exit(2);
}

let targets = rows.filter((r) => !ONLY.length || ONLY.includes(r.route));
if (LIMIT > 0) targets = targets.slice(0, LIMIT);
const OUT_DIR = resolve(arg("out", join(REPO, "tmp/qa/frames", ROUND, bandNow.replace("@", "-"))));

console.log(`[sweep] ledger=${LEDGER.replace(REPO + "/", "")} band=${bandNow} 页数=${rows.length} 本轮取景=${targets.length} identity=${IDENTITY} harness=automator(378x814) out=${OUT_DIR.replace(REPO + "/", "")} dry=${dryRun ? "yes" : "no"}`);

if (dryRun) {
  for (const r of targets.slice(0, 80)) console.log(`SWEEP_DRY ${r.route} baseline=${r.baselineStatus} identity=${r.identityPrecondition}`);
  console.log(`${RK}=DRY targets=${targets.length}（没连设备、没落一帧）`);
  process.exit(0);
}

/* 租约：拿不到就退，不自家排队（上一程"干跑抢了租约打死 16 条腿"的教训在案）。 */
guardUiLease({ owner: "shoot-fidelity-sweep-" + ROUND, tag: "SWEEPLEASE", failTag: "FIDELITYSWEEP" });
mkdirSync(OUT_DIR, { recursive: true });

const automator = require(require.resolve("miniprogram-automator", { paths: [join(REPO, "apps/client"), REPO] }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 身份 A 的会话：铸票走 cli-automator 的 mintToken（纯 HTTP 到 8080，读凭据声明表，绝不打印值），
   注入走 callWxMethod('setStorage')（与 mp-shoot-reference.cjs:39-40 同形状）。 */
let session = { token: "", userId: "", source: "(未铸)" };
try {
  const { mintToken, assertIdentityProducible } = await import("./cli-automator.mjs");
  const prod = assertIdentityProducible(IDENTITY, REPO);
  if (!prod.ok) { console.log(`${RK}=NOT-EVIDENCED reason=identity-not-producible identity=${IDENTITY} why=${prod.reason}`); process.exit(2); }
  const minted = await mintToken(IDENTITY, REPO, "fidelity-" + ROUND);
  session = { token: minted.token, userId: minted.userId, source: minted.source };
  console.log(`[sweep] identity=${IDENTITY} mint=${session.source} userId=${session.userId} token长度=${String(minted.token).length}（值不落日志）`);
} catch (e) {
  console.log(`${RK}=NOT-EVIDENCED reason=mint-failed identity=${IDENTITY} err=${String(e && e.message).slice(0, 140)}`);
  process.exit(2);
}

const results = [];
let mp = null;
try {
  mp = await automator.connect({ wsEndpoint: WS });
  console.log("[sweep] automator connected " + WS);
  await sleep(3000);
  mp.callWxMethod("setStorage", { key: "token", data: session.token });
  mp.callWxMethod("setStorage", { key: "refreshToken", data: "" });
  await sleep(1200);
} catch (e) {
  console.log(`${RK}=NOT-EVIDENCED reason=connect-failed ws=${WS} err=${String(e && e.message).slice(0, 140)} hint=先 node scripts/qa/ws-channel-up.mjs；重建过产物则须重接设备腿`);
  process.exit(2);
}

const seen = new Map(); /* hash → 首个用到它的路由（跨页同图必须被数出来） */
for (const r of targets) {
  const rec = { route: r.route, harness: "automator", band: bandNow, identity: IDENTITY, frames: [], errors: [] };
  const shots = [{ state: "top", tokens: [`route:${r.route}`] }, { state: "bottom", tokens: [`route:${r.route}`, "scroll-bottom"] }];
  for (const s of shots) {
    const f = join(OUT_DIR, `${r.route.replace(/\//g, "__")}__${s.state}.png`);
    try {
      await mp.callWxMethod("reLaunch", { url: "/" + r.route });
      await sleep(SETTLE);
      if (s.state === "bottom") {
        try { await mp.callWxMethod("pageScrollTo", { scrollTop: 99999, duration: 0 }); }
        catch { try { await mp.callWxMethod("pageScrollTo", { scrollTop: 20000, duration: 0 }); } catch (e2) { rec.errors.push("pageScrollTo 不可用:" + String(e2.message).slice(0, 60)); } }
        await sleep(4000);
      }
      if (existsSync(f)) rmSync(f, { force: true });
      await mp.screenshot({ path: f });
      const size = existsSync(f) ? statSync(f).size : 0;
      const h = size > 0 ? hash16(f) : "";
      const prior = [...seen.entries()].filter(([hh]) => hh === h && h);
      const verdict = judgeFrame({
        stateSig: sigOf(s.tokens),
        contentHash: h,
        priors: results.flatMap((x) => x.frames.filter((fr) => fr.contentHash).map((fr) => ({ id: `${fr.route}__${fr.state}`, stateSig: fr.stateSig, contentHash: fr.contentHash }))),
      });
      const dupAcrossRoutes = prior.some(([, owner]) => owner !== r.route);
      rec.frames.push({
        route: r.route,
        state: s.state, path: f.replace(REPO + "/", "").split("\\").join("/"), bytes: size, contentHash: h,
        stateSig: sigOf(s.tokens), verdict: verdict.verdict, verdictNote: String(verdict.note || "").slice(0, 160),
        belowFloor: size <= MIN_BYTES, dupAcrossRoutes,
      });
      if (h && !seen.has(h)) seen.set(h, r.route);
      console.log(`SWEEP_FRAME ${r.route}__${s.state} bytes=${size} sha16=${h ? h.slice(0, 8) : "-"} verdict=${verdict.verdict}${size <= MIN_BYTES ? " 空白帧" : ""}${dupAcrossRoutes ? " 跨页同图" : ""}`);
    } catch (e) {
      rec.errors.push(`${s.state}: ${String(e && e.message).slice(0, 120)}`);
      console.log(`SWEEP_FAIL ${r.route} ${s.state} ${String(e && e.message).slice(0, 120)}`);
    }
  }
  results.push(rec);
}
try { await mp.disconnect(); } catch { /* 断开失败不影响已落的帧 */ }

const manifest = {
  schema: "mp-fidelity-sweep/v1", round: ROUND, band: bandNow, identity: IDENTITY,
  sessionSource: session.source, userId: session.userId,
  harness: "miniprogram-automator(实测出图 378x814，禁与 CLI 193x413 跨尺比像素)",
  consoleCapture: "unavailable：miniprogram-automator 0.12.1 的导出面没有 onConsole/onError（已 grep out/ 核实），本轮不假装采到 console",
  ledger: LEDGER.replace(REPO + "/", ""),
  totals: { targets: targets.length, frames: results.reduce((a, x) => a + x.frames.length, 0) },
  results,
};
writeFileSync(join(OUT_DIR, "sweep-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf-8");

/* 收口读数：空白帧、跨页同图、零帧页都逐条点名（"全绿但读的是空数"是这个项目的老病）。 */
const blank = results.flatMap((x) => x.frames.filter((f) => f.belowFloor));
const dups = results.flatMap((x) => x.frames.filter((f) => f.dupAcrossRoutes));
const noFrame = results.filter((x) => !x.frames.some((f) => !f.belowFloor));
const failedPages = results.filter((x) => x.errors.length);
for (const b of blank) console.log(`SWEEP_BLANK_FRAME ${b.route ?? ""} ${b.path} bytes=${b.bytes}`);
for (const d of dups) console.log(`SWEEP_DUP_ACROSS_ROUTES ${d.path} sha16=${String(d.contentHash).slice(0, 8)} 与更早页同图`);
for (const n of noFrame) console.log(`SWEEP_NO_UNIQUE_FRAME ${n.route} ⇒ 这一页本轮没有独立画面，不许算进覆盖`);
for (const fp of failedPages) console.log(`SWEEP_PAGE_ERROR ${fp.route} ${fp.errors.join(" | ").slice(0, 160)}`);
console.log(`FIDELITYSWEEP_FRAMES frames=${manifest.totals.frames} blank=${blank.length} dupAcross=${dups.length} noUniqueFrame=${noFrame.length} pageErrors=${failedPages.length}`);
const bad = noFrame.length + blank.length;
console.log(bad ? `${RK}=FAIL targets=${targets.length} frames=${manifest.totals.frames} blank=${blank.length} noUniqueFrame=${noFrame.length}`
  : `${RK}=PASS targets=${targets.length} frames=${manifest.totals.frames} band=${bandNow} console=unavailable(如实)`);
process.exit(bad ? 1 : 0);
