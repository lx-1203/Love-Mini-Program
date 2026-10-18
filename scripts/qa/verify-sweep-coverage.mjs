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
 * 这五条任何一条不中 ⇒ 判红并逐条点名，绝不给一个"总体 OK"。
 *
 * 为什么单独成门而不复用 frame-hash-census：那边数的是"同一身份·同一页组内"的重复，
 * frameGroupKey 就是 `${identity}::${page}` ⇒ 跨页撞图它结构上看不见（两条不同组键）。
 *
 * 并集判（多件 --manifest）新增的第 5 条判点：**空转件**。一条通道传进来却一页都没扛住
 * （它的帧全在地板下/全标了落点不符）⇒ 点名判红。并集把两条通道的页合起来数之后，
 * "CLI 那腿跑了但一张可用帧都没出"会被 automator 那半掩盖成覆盖=58/71 之类的好看数——
 * 不点名就等于允许"跑了但没取证"混进覆盖读数。
 *
 * 用法：node scripts/qa/verify-sweep-coverage.mjs --ledger <baseline-ledger.json> --manifest <清单[,另一条通道的清单]>
 *      node scripts/qa/verify-sweep-coverage.mjs --self-test
 * 退出码：0 覆盖齐且无空白/重复；1 有缺；2 输入读不到或 band 不符（那是前提不成立，不是产品判红）。
 * 分母永远是账本 71 行；分子允许来自多份清单（两条通道各一件）。
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "SWEEPCOVER_RESULT";
const MIN_BYTES = 3000;

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

/**
 * 分母是账本（71 行），**分子允许来自多份清单**。
 *
 * 为什么必须支持多份（2026-10-19 实测坐实）：Phase D 是两条通道合起来才覆盖 71 页的——
 *   · automator 取景腿只走「有基准」那 14 页（要和理想效果图比 378×814 像素）；
 *   · CLI 巡检腿只走「无基准」那 57 页（出图 193×413，禁跨尺比像素）。
 * 于是"拿单份清单去要 SWEEPCOVER_RESULT=PASS"在构造上永不成立：那 14 页的件里 57 页是零帧、
 * 那 57 页的件里 14 页是零帧。收口门第 2 条当时就是逐件 spawn 逐件要 PASS ⇒ 一条**恒红判据**，
 * 而恒红的门和零命中的仪表一样不测任何东西。这里改成并集判，一次传多件。
 */
function judge(ledgerPath, manifestPaths, blockedPath) {
  const problems = [];
  const stats = {};
  const files = (Array.isArray(manifestPaths) ? manifestPaths : [manifestPaths]).filter(Boolean);
  if (!existsSync(ledgerPath)) return { problems: [`账本读不到 ${ledgerPath}`], stats: null };
  if (!files.length) return { problems: ["没传任何取景清单（空件不得当覆盖）"], stats: null };
  const absent = files.filter((p) => !existsSync(p));
  if (absent.length) return { problems: absent.map((p) => `取景清单读不到 ${p}`), stats: null };
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf-8"));
  const want = (ledger.rows || []).map((r) => r.route);
  if (!want.length) return { problems: ["账本零行（空扫描集不得当覆盖）"], stats: null };

  /* band 对源：每一件都要单独钉在账本声明的那棵产物树上。
     并集时最容易出的事故是"半件来自另一棵树"——只查第一件就等于没查。 */
  const loaded = [];
  for (const p of files) {
    let m = null;
    try { m = JSON.parse(readFileSync(p, "utf-8")); } catch { problems.push(`取景清单不是合法 JSON：${p}`); continue; }
    if (ledger.bandStamp && m.band && ledger.bandStamp !== m.band) {
      return { problems: [`band 不符 ledger=${ledger.bandStamp} manifest=${m.band}（件=${p}）⇒ 这一批帧量的是另一棵树，整轮不采信`], stats: null };
    }
    loaded.push({ path: p, m });
  }
  if (!loaded.length) return { problems, stats: null };

  const labelOf = (p) => basename(p);
  const byRoute = new Map(); /* route → frames[]（跨件并集，同页多件的帧合起来数） */
  for (const { path, m } of loaded) {
    for (const rec of (m.results || [])) {
      const frames = (rec.frames || []).map((f) => ({ ...f, from: labelOf(path) }));
      byRoute.set(rec.route, [...(byRoute.get(rec.route) || []), ...frames]);
    }
  }
  const hashOwners = new Map(); /* sha16 → [route] */
  /* 「够不着页」命名桶（Phase D 的判据不可满足问题）：
     subpackages/vip/{index,promo-code,bills} 在会员旗标关闭时必然跳回 pages/profile/index，
     而"不开会员/showcase 旗标"是用户的长期约束 ⇒ 这三页在现行产品里取不到帧，
     要求 71/71 有可用帧就是一条**构造上不可满足**的判据（恒红的门和零命中的仪表一样不测东西）。
     这里不降阈值、不删分母：把它们移到第三桶，每行必须带 reason + evidence；
     covered + blocked + 缺 = want，且**一旦哪天真拍到可用帧就自动从桶里掉出来**（否则豁免会变洗白）。 */
  const blockedRows = new Map();
  if (blockedPath && existsSync(blockedPath)) {
    let bj = null;
    try { bj = JSON.parse(readFileSync(blockedPath, "utf-8")); } catch { problems.push(`够不着名册读不成 JSON：${blockedPath}`); }
    for (const r of ((bj && bj.rows) || [])) {
      const route = String(r && r.route || "").trim();
      if (!route) { problems.push("够不着名册里有一行没有 route ⇒ 不许按空路由豁免"); continue; }
      if (!want.includes(route)) { problems.push(`够不着名册点名了不在账本里的路由 ${route} ⇒ 名册不能拿来豁免别的东西`); continue; }
      const reason = String(r.reason || "").trim(), evidence = String(r.evidence || "").trim();
      if (!reason || !evidence) { problems.push(`够不着行 ${route} 缺 ${!reason ? "reason" : "evidence"} ⇒ 没有出处的豁免等于没有豁免`); continue; }
      blockedRows.set(route, { reason, evidence });
    }
    if (bj && bj.band && ledger.bandStamp && bj.band !== ledger.bandStamp) problems.push(`够不着名册的 band=${bj.band} 与账本 ${ledger.bandStamp} 不符 ⇒ 那份名册是别的档写的`);
  }
  let blankPages = 0, noFramePages = 0, dupGroups = 0, dupFrames = 0, mismatchFrames = 0, blockedPages = 0;
  const contributed = new Map(); /* 件 → 该件独自承重的路由数（空转的件必须点名） */
  for (const { path } of loaded) contributed.set(labelOf(path), 0);
  for (const route of want) {
    const frames = byRoute.get(route) || [];
    const good = frames.filter((f) => Number(f.bytes) > MIN_BYTES && !f.belowFloor && !f.landingMismatch);
    /* 够不着桶先看一眼：真有可用帧就不许占桶（豁免会自动失效），没帧才谈得上"够不着"。 */
    if (blockedRows.has(route)) {
      if (good.length) { problems.push(`够不着名册里的 ${route} 这一轮**真拍到了** ${good.length} 张可用帧 ⇒ 把该行从名册删掉，豁免不许赖着`); blockedRows.delete(route); }
      else { blockedPages++; console.error(`SWEEPCOVER_BLOCKED ${route} reason=${blockedRows.get(route).reason} evidence=${blockedRows.get(route).evidence}`); continue; }
    }
    if (!frames.length) { noFramePages++; problems.push(`零帧页 ${route} ⇒ 这一页本轮没有画面，不许记覆盖`); continue; }
    const mismatchedHere = frames.filter((f) => f.landingMismatch);
    if (mismatchedHere.length) {
      mismatchFrames += mismatchedHere.length;
      problems.push(`落点不符页 ${route}：${mismatchedHere.map((f) => `${f.state}→${f.landingPath}`).join(", ")} ⇒ 这些帧不是该页画面，不计覆盖（R1 实测 pages/discover/index 拍到的是登录页，与 pages/login/index 逐字节相同）`);
    }
    if (!good.length) { blankPages++; problems.push(`空白页 ${route} 帧数=${frames.length} 全部 <=${MIN_BYTES}B / 标了 belowFloor / 落点不符 ⇒ 该页没有可用画面`); }
    for (const f of good) {
      const h = String(f.contentHash || "");
      if (!h) { problems.push(`${route} 有一帧没有 contentHash ⇒ 它没进守恒账（帧=${f.path} 件=${f.from}）`); continue; }
      if (!hashOwners.has(h)) hashOwners.set(h, []);
      hashOwners.get(h).push(route);
    }
  }
  for (const [h, owners] of hashOwners) {
    const uniq = [...new Set(owners)];
    if (uniq.length > 1) { dupGroups++; dupFrames += owners.length; problems.push(`跨页同图 sha16=${h.slice(0, 8)}… 覆盖 ${uniq.length} 页：${uniq.slice(0, 6).join(", ")}${uniq.length > 6 ? " …" : ""} ⇒ 至少 ${uniq.length - 1} 张不是它所在页的证据`); }
  }
  const covered = want.filter((r) => { const f = byRoute.get(r) || []; return f.some((x) => Number(x.bytes) > MIN_BYTES && !x.belowFloor && !x.landingMismatch); });
  const coveredSet = new Set(covered);
  for (const { path, m } of loaded) {
    const mine = (m.results || []).filter((r) => coveredSet.has(r.route) && (r.frames || []).some((f) => Number(f.bytes) > MIN_BYTES && !f.belowFloor && !f.landingMismatch));
    contributed.set(labelOf(path), mine.length);
    /* 一件传进来却一页都没扛住 ⇒ 它是空转件。并集判据下这种件会被"另一件覆盖了"掩盖掉，
       所以按件点名：不点名就等于允许"跑了但没取证"混进覆盖读数。 */
    if (!mine.length) problems.push(`空转件 ${labelOf(path)}：该件 0 页有可用帧（results=${(m.results || []).length}）⇒ 这条通道这一轮没取到证，不许靠并集蒙过去`);
  }
  Object.assign(stats, {
    want: want.length, covered: covered.length, blockedPages, blankPages, noFramePages, dupGroups, dupFrames, mismatchFrames,
    files: loaded.map(({ path, m }) => `${labelOf(path)}(${(m.results || []).length}页,${m.harness ? m.harness.split("(")[0] : "harness 未记"})`),
    contributed, harness: loaded.map(({ m }) => m.harness || "(未记)").join(" + "),
  });
  return { problems, stats };
}

function report(problems, stats) {
  for (const p of problems) console.error(`SWEEPCOVER_PROBLEM ${p}`);
  if (stats) console.log(`SWEEPCOVER_STATS want=${stats.want} covered=${stats.covered} blocked=${stats.blockedPages} covered+blocked=${stats.covered + stats.blockedPages}/${stats.want} blankPages=${stats.blankPages} noFramePages=${stats.noFramePages} dupGroups=${stats.dupGroups} dupFrames=${stats.dupFrames} landingMismatchFrames=${stats.mismatchFrames} files=${(stats.files || []).join("|") || "(无)"} harness=${stats.harness}`);
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

  const landingBad = mk("landing.json", { band: "real@deadbeef", harness: "automator", results: [{ route: "pages/a/index", frames: [{ bytes: 9000, contentHash: "aaaa1111", path: "f/a.png" }] }, { route: "pages/b/index", frames: [{ bytes: 9000, contentHash: "bbbb2222", path: "f/b.png", landingMismatch: true, landingPath: "pages/login/index" }] }, { route: "pages/c/index", frames: [{ bytes: 9000, contentHash: "cccc3333", path: "f/c.png" }] }] });

  /* ── 两条通道并集的三件（2026-10-19 的真形状）：14 页 automator + 57 页 CLI 各缺一半。
     用例名就用现场的说法，别写成抽象的"x/y"——下一程要能一眼看出它对应哪条腿。 */
  const partA = mk("part-a.json", { band: "real@deadbeef", harness: "miniprogram-automator(378x814)", results: [
    { route: "pages/a/index", frames: [{ bytes: 9000, contentHash: "aaaa1111", path: "f/a.png" }] },
    { route: "pages/b/index", frames: [{ bytes: 9000, contentHash: "bbbb2222", path: "f/b.png" }] }] });
  const partB = mk("part-b.json", { band: "real@deadbeef", harness: "wechatide CLI(193x413)", results: [
    { route: "pages/c/index", frames: [{ bytes: 9000, contentHash: "cccc3333", path: "f/c.png" }] }] });
  const partBdup = mk("part-b-dup.json", { band: "real@deadbeef", harness: "wechatide CLI(193x413)", results: [
    { route: "pages/c/index", frames: [{ bytes: 9000, contentHash: "bbbb2222", path: "f/c.png" }] }] });
  const partBdead = mk("part-b-dead.json", { band: "real@deadbeef", harness: "wechatide CLI(193x413)", results: [
    { route: "pages/c/index", frames: [{ bytes: 120, contentHash: "cccc0000", path: "f/c.png", belowFloor: true }] }] });
  const partBband = mk("part-b-band.json", { band: "real@OTHERWIFE", harness: "wechatide CLI(193x413)", results: [
    { route: "pages/c/index", frames: [{ bytes: 9000, contentHash: "cccc3333", path: "f/c.png" }] }] });

  const cases = [
    ["好件", good, false], ["零帧页", missing, true], ["空白帧页", blank, true], ["跨页同图", dup, true], ["band 不符", bandOff, true], ["落点不符帧", landingBad, true],
    /* 单件必红（旧行为，不许被我改成并集时悄悄丢掉）：只传 automator 那件 ⇒ 57 页零帧 ⇒ 红 */
    ["单件（只 automator）", [partA], true], ["单件（只 CLI）", [partB], true],
    /* 并集必绿：这正是本程要修的恒红判据 */
    ["两件并集覆盖齐", [partA, partB], false],
    /* 并集不许掩盖坏件：三条各坏一种 */
    ["并集·跨通道同图", [partA, partBdup], true],
    ["并集·空转件", [partA, partBdead], true],
    ["并集·半件 band 不符", [partA, partBband], true],
  ];
  let problems = 0;
  for (const [label, mp, mustFail] of cases) {
    const r = judge(lp, mp);
    const red = r.problems.length > 0;
    const ok = red === mustFail;
    console.log(`SWEEPCOVER_SELF ${label.padEnd(22)} 期望=${mustFail ? "红" : "绿"} 实测=${red ? `红(${r.problems.length})` : "绿"} ⇒ ${ok ? "判点承重" : "判点失效"}`);
    if (!ok) problems++;
  }
  /* ── 够不着桶必须能红（2026-10-19 新增的第三桶）──
     这个桶是给"构造上取不到帧"的页用的（会员子系统在旗标关闭时整组重定向，而禁令是不开旗标）。
     一旦它变成"随便往名单里塞一行就绿"，覆盖判据就废了，所以四条负例分别钉住：
     有据才吸收、真拍到帧就失效、缺 evidence 判畸、点名不在账本里的路由判畸。 */
  const blkOk = mk("block-ok.json", { band: "real@deadbeef", rows: [{ route: "pages/c/index", reason: "旗标关闭时被重定向", evidence: "实测落点 pages/profile/index，10,206B 三页同图" }] });
  const blkStale = mk("block-stale.json", { band: "real@deadbeef", rows: [{ route: "pages/a/index", reason: "这一页其实拍得到", evidence: "partA 里就有它的 9000B 帧" }] });
  const blkNoEv = mk("block-noevidence.json", { band: "real@deadbeef", rows: [{ route: "pages/c/index", reason: "就是想要豁免", evidence: "" }] });
  const blkUnknown = mk("block-unknown.json", { band: "real@deadbeef", rows: [{ route: "pages/zz/index", reason: "顺手多塞一条", evidence: "出处：没有" }] });
  const blkBand = mk("block-band.json", { band: "real@OTHERWIFE", rows: [{ route: "pages/c/index", reason: "别的一档的名册", evidence: "x" }] });
  const blockCases = [
    ["够不着桶·缺帧且有据⇒吸收", [partA], blkOk, false],
    ["够不着桶·其实拍到了⇒失效", [partA, partB], blkStale, true],
    ["够不着桶·缺 evidence⇒判畸", [partA], blkNoEv, true],
    ["够不着桶·点名账本外路由⇒判畸", [partA], blkUnknown, true],
    ["够不着桶·band 不是这一档⇒判畸", [partA], blkBand, true],
  ];
  for (const [label, mp, bp, mustFail] of blockCases) {
    const r = judge(lp, mp, bp);
    const red = r.problems.length > 0;
    const ok = red === mustFail;
    console.log(`SWEEPCOVER_SELF ${label.padEnd(22)} 期望=${mustFail ? "红" : "绿"} 实测=${red ? `红(${r.problems.length})` : "绿"} ⇒ ${ok ? "判点承重" : "判点失效"}`);
    if (!ok) problems++;
  }
  /* 变异证明：并集绿件里把 CLI 那帧的 bytes 抽到地板下 ⇒ 必须翻红。
     否则"绿"只是因为判据没真读帧——那正是本仓两次栽过的零命中仪表形状。 */
  const mutantPath = mk("part-b-mutant.json", { band: "real@deadbeef", harness: "wechatide CLI(193x413)", results: [
    { route: "pages/c/index", frames: [{ bytes: 900, contentHash: "cccc3333", path: "f/c.png" }] }] });
  const mutRed = judge(lp, [partA, mutantPath]).problems.length > 0;
  console.log(`SWEEPCOVER_SELF 变异(并集绿→帧抽干) 翻红=${mutRed ? "yes" : "no"} ⇒ ${mutRed ? "判点可修" : "判点恒绿"}`);
  if (!mutRed) problems++;
  rmSync(scratch, { recursive: true, force: true });
  console.log(problems ? `${SRK}=FAIL cases=${cases.length} problems=${problems}` : `${SRK}=PASS cases=${cases.length} 负例可红=是`);
  return problems ? 1 : 0;
}

if (flag("self-test")) process.exit(selfTest());
const ledgerPath = resolve(arg("ledger", ""));
/* --manifest 可以吃逗号分隔的多件（两条通道各写各的清单，覆盖判据按并集数）。
   旧的单件写法不变：一件就是一个元素。 */
const manifestList = String(arg("manifest", "")).split(",").map((s) => s.trim()).filter(Boolean).map((p) => resolve(p));
if (!ledgerPath || !manifestList.length || !existsSync(ledgerPath)) {
  console.log(`${RK}=NOT-EVIDENCED reason=需同时传 --ledger 与 --manifest（后者可逗号分隔多件）且件在盘上`);
  process.exit(2);
}
const blockedArg = arg("blocked", "");
const { problems, stats } = judge(ledgerPath, manifestList, blockedArg ? resolve(blockedArg) : "");
if (blockedArg) console.log(`SWEEPCOVER_名册 已载入够不着名册 ${blockedArg}（够不着桶只在"这一轮真没帧"时生效，拍到帧就自动失效）`);
process.exit(report(problems, stats));
