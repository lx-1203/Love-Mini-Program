#!/usr/bin/env node
/**
 * verify-sweep-coverage.mjs —— 逐页取景的覆盖门（MP-FIDELITY Phase D 的收口）。
 *
 * 判的是"71 页是不是每页都有**自己的**画面"，不是"我拍了 71 次"：
 *   · 零帧页：这一页本轮没有任何落盘帧 ⇒ 不许算覆盖；
 *   · 空白帧：整页只拍出 <=3000B 的帧（与 real-tour-cli.mjs:210 同地板）⇒ 渲染没起来；
 *   · 跨页同图：两页的帧 sha256 前 16 位逐字节相同 ⇒ 其中一张不是那一页的证据
 *     （本项目栽过 280 组同字节帧：那是"交互后"被按派单归档，而不是按效果归档）；
 *   · 账本/清单不同源：清单 band 与账本 band 不等 ⇒ 帧比的是另一棵树，整轮作废。
 * 这四条任何一条不中 ⇒ 判红并逐条点名，绝不给一个"总体 OK"。
 *
 * 为什么单独成门而不复用 frame-hash-census：那边数的是"同一身份·同一页组内"的重复，
 * frameGroupKey 就是 `${identity}::${page}` ⇒ 跨页撞图它结构上看不见（两条不同组键）。
 *
 * 用法：node scripts/qa/verify-sweep-coverage.mjs --ledger <baseline-ledger.json> --manifest <sweep-manifest.json>
 *      node scripts/qa/verify-sweep-coverage.mjs --self-test
 * 退出码：0 覆盖齐且无空白/重复；1 有缺；2 输入读不到或 band 不符（那是前提不成立，不是产品判红）。
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "SWEEPCOVER_RESULT";
const MIN_BYTES = 3000;

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

function judge(ledgerPath, manifestPath) {
  const problems = [];
  const stats = {};
  if (!existsSync(ledgerPath)) return { problems: [`账本读不到 ${ledgerPath}`], stats: null };
  if (!existsSync(manifestPath)) return { problems: [`取景清单读不到 ${manifestPath}`], stats: null };
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf-8"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const want = (ledger.rows || []).map((r) => r.route);
  if (!want.length) return { problems: ["账本零行（空扫描集不得当覆盖）"], stats: null };

  /* band 对源：帧必须钉在账本声明的那棵产物树上 */
  if (ledger.bandStamp && manifest.band && ledger.bandStamp !== manifest.band) {
    return { problems: [`band 不符 ledger=${ledger.bandStamp} manifest=${manifest.band} ⇒ 这一批帧量的是另一棵树，整轮不采信`], stats: null };
  }

  const byRoute = new Map();
  for (const rec of (manifest.results || [])) {
    byRoute.set(rec.route, (rec.frames || []));
  }
  const hashOwners = new Map(); /* sha16 → [route] */
  let blankPages = 0, noFramePages = 0, dupGroups = 0, dupFrames = 0;
  for (const route of want) {
    const frames = byRoute.get(route) || [];
    if (!frames.length) { noFramePages++; problems.push(`零帧页 ${route} ⇒ 这一页本轮没有画面，不许记覆盖`); continue; }
    const good = frames.filter((f) => Number(f.bytes) > MIN_BYTES && !f.belowFloor);
    if (!good.length) { blankPages++; problems.push(`空白页 ${route} 帧数=${frames.length} 全部 <=${MIN_BYTES}B 或标了 belowFloor ⇒ 渲染没起来`); }
    for (const f of good) {
      const h = String(f.contentHash || "");
      if (!h) { problems.push(`${route} 有一帧没有 contentHash ⇒ 它没进守恒账（帧=${f.path}）`); continue; }
      if (!hashOwners.has(h)) hashOwners.set(h, []);
      hashOwners.get(h).push(route);
    }
  }
  for (const [h, owners] of hashOwners) {
    const uniq = [...new Set(owners)];
    if (uniq.length > 1) { dupGroups++; dupFrames += owners.length; problems.push(`跨页同图 sha16=${h.slice(0, 8)}… 覆盖 ${uniq.length} 页：${uniq.slice(0, 6).join(", ")}${uniq.length > 6 ? " …" : ""} ⇒ 至少 ${uniq.length - 1} 张不是它所在页的证据`); }
  }
  const covered = want.filter((r) => { const f = byRoute.get(r) || []; return f.some((x) => Number(x.bytes) > MIN_BYTES && !x.belowFloor); }).length;
  Object.assign(stats, { want: want.length, covered, blankPages, noFramePages, dupGroups, dupFrames, harness: manifest.harness || "(未记)" });
  return { problems, stats };
}

function report(problems, stats) {
  for (const p of problems) console.error(`SWEEPCOVER_PROBLEM ${p}`);
  if (stats) console.log(`SWEEPCOVER_STATS want=${stats.want} covered=${stats.covered} blankPages=${stats.blankPages} noFramePages=${stats.noFramePages} dupGroups=${stats.dupGroups} dupFrames=${stats.dupFrames} harness=${stats.harness}`);
  console.log(problems.length ? `${RK}=FAIL covered=${stats ? stats.covered : 0}/${stats ? stats.want : "?"} problems=${problems.length}` : `${RK}=PASS covered=${stats.covered}/${stats.want} 空白=0 跨页同图=0`);
  return problems.length ? 1 : 0;
}

/** 合成夹具自证：好件必绿；零帧/空白/跨页同图/band 不符 四种坏件必红。 */
function selfTest() {
  const SRK = "SWEEPCOVER_SELFTEST";
  const scratch = join(REPO, ".zcode", "tmp", "sweep-coverage-selftest");
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  const ledger = {
    bandStamp: "real@deadbeef",
    rows: [{ route: "pages/a/index" }, { route: "pages/b/index" }, { route: "pages/c/index" }],
  };
  const lp = join(scratch, "ledger.json");
  writeFileSync(lp, JSON.stringify(ledger), "utf-8");
  const mk = (name, manifest) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify(manifest), "utf-8"); return p; };
  const good = mk("good.json", {
    band: "real@deadbeef", harness: "automator",
    results: [
      { route: "pages/a/index", frames: [{ bytes: 9000, contentHash: "aaaa1111", path: "f/a.png" }] },
      { route: "pages/b/index", frames: [{ bytes: 9000, contentHash: "bbbb2222", path: "f/b.png" }] },
      { route: "pages/c/index", frames: [{ bytes: 9000, contentHash: "cccc3333", path: "f/c.png" }] },
    ],
  });
  const missing = mk("missing.json", { band: "real@deadbeef", harness: "automator", results: [{ route: "pages/a/index", frames: [{ bytes: 9000, contentHash: "aaaa1111", path: "f/a.png" }] }, { route: "pages/b/index", frames: [{ bytes: 9000, contentHash: "bbbb2222", path: "f/b.png" }] }] });
  const blank = mk("blank.json", { band: "real@deadbeef", harness: "automator", results: [{ route: "pages/a/index", frames: [{ bytes: 9000, contentHash: "aaaa1111", path: "f/a.png" }] }, { route: "pages/b/index", frames: [{ bytes: 9000, contentHash: "bbbb2222", path: "f/b.png" }] }, { route: "pages/c/index", frames: [{ bytes: 120, contentHash: "cccc0000", path: "f/c.png", belowFloor: true }] }] });
  const dup = mk("dup.json", { band: "real@deadbeef", harness: "automator", results: [{ route: "pages/a/index", frames: [{ bytes: 9000, contentHash: "same1111", path: "f/a.png" }] }, { route: "pages/b/index", frames: [{ bytes: 9000, contentHash: "same1111", path: "f/b.png" }] }, { route: "pages/c/index", frames: [{ bytes: 9000, contentHash: "cccc3333", path: "f/c.png" }] }] });
  const bandOff = mk("bandoff.json", { band: "real@OTHERWIFE", harness: "automator", results: [{ route: "pages/a/index", frames: [{ bytes: 9000, contentHash: "aaaa1111", path: "f/a.png" }] }, { route: "pages/b/index", frames: [{ bytes: 9000, contentHash: "bbbb2222", path: "f/b.png" }] }, { route: "pages/c/index", frames: [{ bytes: 9000, contentHash: "cccc3333", path: "f/c.png" }] }] });

  const cases = [["好件", good, false], ["零帧页", missing, true], ["空白帧页", blank, true], ["跨页同图", dup, true], ["band 不符", bandOff, true]];
  let problems = 0;
  for (const [label, mp, mustFail] of cases) {
    const r = judge(lp, mp);
    const red = r.problems.length > 0;
    const ok = red === mustFail;
    console.log(`SWEEPCOVER_SELF ${label.padEnd(10)} 期望=${mustFail ? "红" : "绿"} 实测=${red ? `红(${r.problems.length})` : "绿"} ⇒ ${ok ? "判点承重" : "判点失效"}`);
    if (!ok) problems++;
  }
  rmSync(scratch, { recursive: true, force: true });
  console.log(problems ? `${SRK}=FAIL cases=5 problems=${problems}` : `${SRK}=PASS cases=5 负例可红=是`);
  return problems ? 1 : 0;
}

if (flag("self-test")) process.exit(selfTest());
const ledgerPath = resolve(arg("ledger", ""));
const manifestPath = resolve(arg("manifest", ""));
if (!ledgerPath || !manifestPath || !existsSync(ledgerPath) || !existsSync(manifestPath)) {
  console.log(`${RK}=NOT-EVIDENCED reason=需同时传 --ledger 与 --manifest 且两件都在盘上`);
  process.exit(2);
}
const { problems, stats } = judge(ledgerPath, manifestPath);
process.exit(report(problems, stats));
