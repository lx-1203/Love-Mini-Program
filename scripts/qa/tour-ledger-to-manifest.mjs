#!/usr/bin/env node
/**
 * tour-ledger-to-manifest.mjs —— 把 CLI 巡检通道的台账换成取景覆盖门认识的清单形状。
 *
 * 为什么需要这一步：verify-sweep-coverage.mjs 读的是 `results[].frames[]`（取景腿的方言），
 * 而 real-tour-cli.mjs 写的是平铺 `shots[]`（巡检腿的方言）。两套判据本来量的是同一件事
 * （这页有没有一张能当证据的画面），消费方看不见生产方的输出路径就等于没跑
 * ——本仓在覆盖门上栽过一次"发现式看不见我的件"，这里不靠猜，做成显式转换。
 *
 * 只做搬运，不做判断：state 一律 "top"（CLI 通道只出默认态，没有滚动分帧），
 * belowFloor/landingMismatch 按生产方自己的字段如实映射，判红留给覆盖门。
 * 档位与 harness 原样带上，跨尺比像素的禁令写在 captureLimitations 里，不在这里偷偷抹平。
 *
 * 用法：node scripts/qa/tour-ledger-to-manifest.mjs --ledger <real-tour 的 json> --round R2b --out <sweep 形状的 json>
 * 退出码：0 转成；2 输入读不到或 shots 为空（空扫描集不得占着"覆盖"这个词）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "TOURMANIFEST_RESULT";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const relOf = (p) => relative(REPO, resolve(p)).split(sep).join("/");

const srcP = resolve(arg("ledger", ""));
const outP = resolve(arg("out", ""));
const ROUND = arg("round", "");
if (!srcP || !existsSync(srcP) || !outP || !ROUND) {
  console.log(`${RK}=NOT-EVIDENCED reason=bad-args ledger=${arg("ledger", "") || "(没传)"} out=${arg("out", "") || "(没传)"} round=${ROUND || "(没传)"}`);
  process.exit(2);
}
const src = JSON.parse(readFileSync(srcP, "utf-8"));
const shots = Array.isArray(src.shots) ? src.shots : [];
if (!shots.length) { console.log(`${RK}=NOT-EVIDENCED reason=no-shots（空件不得转成"这轮覆盖了 N 页"）`); process.exit(2); }

const byRoute = new Map();
for (const s of shots) {
  const route = String(s.page || s.route || "").replace(/^\//, "");
  if (!route) continue;
  if (!byRoute.has(route)) byRoute.set(route, []);
  const bytes = Number(s.bytes) || 0;
  byRoute.get(route).push({
    route, query: s.params || "", state: "top", path: String(s.path || "").split(sep).join("/"),
    bytes, contentHash: String(s.contentHash || ""),
    belowFloor: bytes <= 3000,
    /* 落点由生产方自己的 route 字段说话：它记的就是 getCurrentPages() 的当时落点。 */
    landingPath: String(s.route || "").replace(/^\//, ""),
    landingMismatch: !!s.route && String(s.route).replace(/^\//, "") !== route,
    landingVerified: !!s.route,
  });
}
/* band 的取法（2026-10-19 重写）：
   原版这里是一条死三元 —— `/mp-weixin-real/.test(...) ? "" : ""`，两个分支都返回 ""，
   于是顶层 band 恒为 "(未记)"，而覆盖门的 band 对源判点写的是"两边都有且不等才红" ⇒
   这条通道永远不参加档位核对：一批发自 mock 树的帧能就这样混进 real 档的覆盖读数。
   现在优先用生产件自己记的 band（real-tour-cli.mjs 3.3-cli 起会记），
   旧件没记就按 --project / 件里的 projectDir 现算——算法与取景腿 bandOf、收口门第 5 条逐字同法。
   两头都算不出来 ⇒ NOT-EVIDENCED 退 2：宁可不转，也不转出一份"档位未知"的清单。 */
function bandOf(dir) {
  const f = join(dir, "config", "env.js");
  if (!existsSync(f)) return "";
  const buf = readFileSync(f);
  const m = String(buf).match(/MODE:\s*"([^"]+)"/);
  return `${m ? m[1] : "?"}@${createHash("sha256").update(buf).digest("hex").slice(0, 8)}`;
}
const projCandidates = [arg("project", ""), src.projectDir ? resolve(REPO, String(src.projectDir)) : "", join(REPO, "apps/client/dist/build/mp-weixin-real")].filter(Boolean);
const derivedBand = String(src.band || "").trim() || (projCandidates.map((p) => bandOf(p)).find((b) => b) || "");
const bandSrc = String(src.band || "").trim() ? "生产件自记" : (derivedBand ? "转换时按产物现算（生产件没记 band）" : "(算不出)");
if (!derivedBand) { console.log(`${RK}=NOT-EVIDENCED reason=no-band（件里没记、产物 env.js 也读不到 ⇒ 这批帧属于哪棵树无人知道）`); process.exit(2); }
const out = {
  schema: "mp-fidelity-sweep/v1",
  round: ROUND,
  band: derivedBand,
  bandProvenance: bandSrc,
  identity: (shots[0] && shots[0].identity) || "A",
  harness: src.harness || "wechatide CLI",
  consoleCapture: "CLI 通道另采 console（见生产件）",
  sourceLedger: relOf(srcP),
  gitSha: src.gitSha || null,
  /* 这一条不是装饰：CLI 通道本轮没有自证"取景前重开过项目窗口"，
     所以它只贡献**可达/渲染/唯一帧**证据，不贡献与理想图比像素的保真判据。 */
  reattach: { exit: null, at: src.generatedAt || "", proven: "none（CLI 通道未自证重开窗口；保真像素判据不从这里取）" },
  totals: { routesInManifest: byRoute.size, targetsThisRun: byRoute.size, frames: shots.length },
  results: [...byRoute.entries()].map(([route, frames]) => ({ route, query: frames[0].query, harness: "wechatide CLI", frames, errors: [] })),
};
const blob = JSON.stringify(out, null, 2);
if (/token|authorization|bearer/i.test(blob)) { console.log(`${RK}=NOT-EVIDENCED reason=out-would-carry-credential`); process.exit(2); }
mkdirSync(dirname(outP), { recursive: true });
writeFileSync(outP, blob + "\n", "utf8");
console.log(`${RK}=WROTE file=${relOf(outP)} 页=${byRoute.size} 帧=${shots.length} sha256=${createHash("sha256").update(blob).digest("hex").slice(0, 12)}`);
process.exit(0);
