#!/usr/bin/env node
/**
 * verify-fidelity-closeout.mjs —— 「这轮真机保修到底完没完」的唯一判据（MP-FIDELITY 的收口）。
 *
 * 它**不重测任何东西**，只把各生产者的话收集成一张表。理由在册两次：
 *   · 收口门自己重算一遍 = 造出第二份真相，两份会漂（aggregate/覆盖门/配额门各自已量过同一件事）；
 *   · 上一程有过"门点了却没跑"与"读数来自上一份归档"的账，聚合器必须显式说清每条判据的出处。
 * 所以每条判据都带 `来源=`（哪个文件 / 哪条 spawn 的 stdout），拿不到来源就是 NOT-EVIDENCED，**绝不当绿**。
 *
 * 八条判据（一条不中 ⇒ 整体不绿；全中 ⇒ FIDELITY_CLOSEOUT_RESULT=PASS）：
 *   1 rounds      跑满 3 轮（每轮都要有取景清单落盘，空轮次名不算）
 *   2 coverage    账本 71 行每行都有可用帧（**按轮**把两条通道的清单并起来喂覆盖门，那一轮的并集门要 PASS；
 *                 逐件要 PASS 是恒红判据——两条通道各管一半，单件结构上凑不满 71）
 *   3 newdefects  末轮 P0/P1 新增缺陷=0 即算收口（2026-10-19 用户裁定；旧口径"defect_id 合计=0"
 *                 把"还在找茬"和"还没修完"混成一条，只要有人交卡就恒红）。P2/P3 允许存在，但必须
 *                 逐条点名 + 单列读数（P0=/P1=/P2=/P3=/CLEAN= 五档），没标级按阻断计。
 *                 前置（L04 已落地的逐轴 `## CLEAN` 出口）：末轮**每一张可用帧**要么有缺陷卡、要么有
 *                 **合规** CLEAN 卡。合规与否不在本门重算（另抄一份判点=第二份真相，必漂）——本门
 *                 spawn verify-finder-lane.mjs 读它自己的 `未被覆盖=` / `CLEAN_CARDS=` / `CLEAN_REJECTED=`；
 *                 既无缺陷卡也无合规 CLEAN 卡 ⇒ 漏审 ⇒ 判红（漏审不是"没问题"）。读不到那扇门的读数
 *                 ⇒ NOT-EVIDENCED 级红，不当绿。
 *                 数缺陷之前先按派单件 lanes-<round>.json 对账：每条派单都要有一张同 id 的卡，
 *                 一张卡都没有 ⇒ 判红（旧写法把"空目录"读成"零缺陷"，R2b 现场就这么绿过一次）
 *   4 fixvis      改动可见性：FIXNOTVISIBLE / CLOCK_ONLY 清零（比内容区像素，不是比状态栏时钟）
 *   5 band        产物带戳仍是指定那一档（改一字节 ⇒ 整批帧与账本过期）
 *   6 chain       发布链步序门 PASS（三步后处理真的指向本轮产物，不是 mock 那棵）
 *   7 carriers    新门在两个载具都点名（写了没人跑 = 没写）
 *   8 roundtrip   一次真实写回环：建得出/两端读得到/字段齐/删得掉/计数守恒
 *
 * 用法：node scripts/qa/verify-fidelity-closeout.mjs --ledger <json> --rounds R1,R2b,R3 \
 *          --manifest <每轮 sweep-manifest.json，逗号分隔> --lanes-last <末轮卡目录> \
 *          --fixvis <fix-visibility.json> --roundtrip <roundtrip.json> --band real@f0677920
 *          [--self-test]
 * 退出码：0 八条全中；1 有条目不中（逐条点名）；2 输入读不到（那是前提不成立，不是"没做完"）。
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "FIDELITY_CLOSEOUT_RESULT";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const relOf = (p) => relative(REPO, resolve(p)).split(sep).join("/");
const listArg = (k) => String(arg(k, "")).split(",").map((s) => s.trim()).filter(Boolean);

/* ── 纯判据：每行给 {name, ok, got, want, src}。可被 --self-test 用合成输入喂，不必占设备。 ── */
function judge(rows) {
  const bad = rows.filter((r) => !r.ok);
  /* 空表不算绿：判据一条都没检 ⇒ "没有不中的"是真空话，这道门自己就是那种零命中仪表。 */
  return { rows, bad, pass: rows.length > 0 && bad.length === 0 };
}

/* ══════════════════════════════════════════════════════════════════════════
   末轮卡判据的**单一实现**（2026-10-19 按用户裁定改）：
     旧口径「末轮 defect_id 合计=0」⇒ 只要泳道找出过任何东西，这一条就永远红，
     于是它测不出"本轮到底修没修完"，只测得出"本轮到底有没有人在找茬"。
     新口径：**P0/P1 新增=0 即算收口**；P2/P3 允许存在，但必须逐条点名 + 单列读数，
     没标级的条目一律按阻断处理（证明不了它不阻断，就不能据此收口）。
   新增前置（L04 已落地的 `## CLEAN` 逐轴出口）：末轮**每一张可用帧**要么有缺陷卡、要么有**合规**
   CLEAN 卡。合规与否**不由本门重算**——本文件的原则是"不重测任何东西，只收集各生产者的话"，
   轴词表/读数判点在 `verify-finder-lane.mjs` 里，这里再抄一份就是第二份真相（必漂）。
   所以这里 spawn 那扇门，读它自己的 `FINDERLANE_STATS 未被覆盖=` 与 `CLEAN_CARDS=`：
   它说哪张帧没被任何卡覆盖，那张就是漏审 ⇒ newdefects 判红（漏审不是"没问题"）。
   派单件与交卡件的对账**照旧保留**（一张卡都没有 ⇒ 红，这条抓过 R2b 的真实假交付）。
   ── 缺陷分桶读卡、覆盖读生产者：两件事各自的来源都在 `来源=` 里写清。 */

/* `- key: value` 字段表 + 以 defect_id 起一条的缺陷条目：与 verify-finder-lane 的同一套卡文法。 */
function cardFields(block) {
  const out = {};
  for (const m of block.matchAll(/^\s*[-*]\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/gm)) if (!(m[1] in out)) out[m[1]] = m[2].trim();
  return out;
}
function cardDefects(block) {
  return block.split(/(?=^\s*[-*]\s*defect_id\s*:)/m).filter((p) => /defect_id/.test(p)).map((p) => cardFields(p));
}
const SEV_OF = (s) => { const m = String(s || "").match(/^\s*(p[0-3])\b/i); return m ? m[1].toUpperCase() : ""; };

/* 覆盖与 CLEAN 的裁判是 L04 那扇门：spawn 它、吃它的读数行。跑不出读数行 = 不可证 = 红。 */
function spawnFinderLane(laneDir, manifestP) {
  const src = `spawn verify-finder-lane.mjs --lane ${laneDir ? relOf(laneDir) : "(无)"} --manifest ${manifestP ? relOf(manifestP) : "(无)"}`;
  if (!laneDir || !manifestP || !existsSync(laneDir) || !existsSync(manifestP)) return { ran: false, why: `卡目录或取景清单读不到 ⇒ 逐帧覆盖不可证`, src };
  const s = spawnSync(process.execPath, [join(HERE, "verify-finder-lane.mjs"), "--lane", laneDir, "--manifest", manifestP], { cwd: REPO, encoding: "utf8" });
  const out = `${s.stdout || ""}${s.stderr || ""}`;
  const stats = (out.match(/FINDERLANE_STATS .*/) || [""])[0];
  const usable = Number((stats.match(/可用帧=(\d+)/) || [])[1]);
  const uncNum = Number((stats.match(/未被覆盖=(\d+)/) || [])[1]);
  const verdict = (out.match(/FINDERLANE_RESULT=\S+/) || ["(无结果行)"])[0];
  const named = [...out.matchAll(/帧未被任何缺陷卡覆盖：(\S+)/g)].map((m) => m[1]);
  if (!stats || !Number.isFinite(usable) || !Number.isFinite(uncNum)) {
    return { ran: false, why: `找茬门没吐出 FINDERLANE_STATS（${verdict} exit=${s.status}）⇒ 逐帧覆盖不可证`, src, raw: out };
  }
  const cleanCards = Number((out.match(/CLEAN_CARDS=(\d+)/) || [])[1]);
  const cleanRejected = Number((out.match(/CLEAN_REJECTED=(\d+)/) || [])[1]);
  return {
    ran: true, usable, uncovered: Number.isFinite(uncNum) ? uncNum : named.length,
    uncoveredNames: named, truncated: uncNum > named.length, uncNum,
    clean: Number.isFinite(cleanCards) ? cleanCards : -1,
    rejected: Number.isFinite(cleanRejected) ? cleanRejected : -1,
    verdict, src, raw: out,
  };
}

/* 末轮卡判据主函数。输入全是结构化数据（卡文 + 生产者给的覆盖读数），不碰盘 ⇒ --self-test 能喂合成件。 */
function assessLastRound(o) {
  const { lastRound, cards, plan, planSrc, ledgerBand, bandStaleCheck = true, stale = "", cover } = o;
  const problems = []; const notes = []; const named = [];
  const laneIds = (plan && Array.isArray(plan.lanes) ? plan.lanes : []).map((l) => String(l.lane_id || l.id || "")).filter(Boolean);
  const cardBase = new Set(cards.map((c) => c.file.replace(/\.md$/i, "")));
  const noCard = laneIds.filter((id) => !cardBase.has(id));
  const bandStale = bandStaleCheck && !!(plan && plan.band && ledgerBand && plan.band !== ledgerBand);

  const P = { P0: 0, P1: 0, P2: 0, P3: 0, none: 0 };
  let cleanSections = 0;
  for (const c of cards) {
    /* 先补一个换行：卡片第一行就是 `## FRAME`/`## CLEAN` 时，按 \n 切分会把首段漏掉（同款洞找茬门也堵过）。 */
    const chunks = ("\n" + String(c.text)).split(/\n(?=##\s+(?:FRAME|CLEAN))/);
    for (const sec of chunks.filter((x) => /^##\s+FRAME[\s:]/.test(x))) {
      const p = sec.split(/\r?\n/)[0].replace(/^##\s+FRAME[\s:]+/, "").trim();
      /* 分母外的帧（含派单件自己剔掉的"落点不符"帧）**照旧计缺陷**：旧口径数的是全盘 defect_id，
         要是这里跳过，那些 P0/P1 就被静默抹掉（R2b 实测 L07 有 12 条落在剔掉的 login/matching 帧上）
         ⇒ 覆盖归覆盖（找茬门的分母），缺陷桶归缺陷桶（本门逐张卡现数）。 */
      for (const d of cardDefects(sec)) {
        const sev = SEV_OF(d.severity);
        if (sev) P[sev]++;
        else { P.none++; problems.push(`缺陷没标级（severity 缺失或不在 P0-P3）：${d.defect_id || "(无 id)"} 帧=${p} ⇒ 证明不了它不阻断 ⇒ 按阻断计`); }
        if (sev === "P2" || sev === "P3") named.push(`${sev} ${d.defect_id || "(无 id)"} 帧=${p} axis=${String(d.axis || "?").trim() || "?"} 卡=${c.file}`);
        if ((sev === "P0" || sev === "P1") && !d.defect_id) problems.push(`P0/P1 条目没有 defect_id（帧=${p} 卡=${c.file}）⇒ 无法派修，按阻断计`);
      }
    }
    cleanSections += chunks.filter((x) => /^##\s+CLEAN(?:[ _-]?VERDICT)?[\s:]/i.test(x)).length;
  }

  /* 前置：每一张可用帧都要有交代（缺陷卡 或 合规 CLEAN 卡）。裁判是找茬门，读数拿不到 ⇒ 不可证 ⇒ 红。 */
  const cov = cover || { ran: false, why: "没接到覆盖读数（spawn 那一步没跑）", src: "(无来源)" };
  if (!cov.ran) problems.push(`逐帧覆盖不可证：${cov.why || "找茬门没吐出读数"} ⇒ 不当绿`);
  if (cov.ran && cov.usable <= 0) problems.push(`找茬门的可用帧分母=${cov.usable} ⇒ 空分母不许当"每帧都有交代"（同款"空表不当绿"）`);
  if (cov.ran && cov.uncovered > 0) {
    problems.push(`末轮有 ${cov.uncovered} 张可用帧既无缺陷卡也无合规 CLEAN 卡 ⇒ 漏审（漏审不是"没问题"）：${(cov.uncoveredNames || []).join(" ")}${cov.truncated ? ` …（门内点名截断，计数=${cov.uncNum}）` : ""}`);
    for (const f of (cov.uncoveredNames || []).slice(0, 12)) problems.push(`漏审帧 ${f}（找茬门原话）`);
  }
  if (cov.ran && cov.rejected > 0) problems.push(`找茬门拒了 ${cov.rejected} 张伪 CLEAN 卡（逐条原因见该门 stdout）⇒ 那些帧退回未覆盖，本判据不许当"没问题"`);

  const blocking = P.P0 + P.P1 + P.none;
  if (blocking) problems.push(`末轮 P0/P1 新增缺陷=${blocking}（P0=${P.P0} P1=${P.P1} 未标级=${P.none}）⇒ 本轮未收口`);
  /* 派单件 ↔ 交卡对账：一条没交都要点名，一张卡都没有就是假交付（R2b 绿过一次的那形状）。 */
  if (!plan || !laneIds.length) problems.push("派单件读不到或 lanes[] 为空 ⇒ 交卡对账无从谈起（空目录不得判「零缺陷」）");
  if (noCard.length) problems.push(`派单了却没交卡的泳道=${noCard.join(",")} ⇒ 该泳道没为任何帧作证`);
  if (bandStale) problems.push(`件 band=${plan.band} 与账本 band=${ledgerBand} 不符 ⇒ 这批卡看的是另一档产物的帧`);
  /* 卡/分母与末轮不同轮、或分母来自另一档产物：即便缺陷数是 0 也不能盖章（读的是别的轮的卡）。 */
  if (stale) problems.push(stale);

  const ok = !!plan && laneIds.length > 0 && noCard.length === 0 && !bandStale && !stale
    && cov.ran === true && cov.usable > 0 && cov.uncovered === 0 && cov.rejected === 0
    && blocking === 0;

  const got = `派单件=${planSrc || "(读不到)"} 泳道=${laneIds.length} 交卡=${cards.length}`
    + ` P0=${P.P0} P1=${P.P1} P2=${P.P2} P3=${P.P3} CLEAN=${cov.ran ? cov.clean : "?"}`
    + ` 未标级=${P.none} CLEAN段合计=${cleanSections}`
    + ` 可用帧=${cov.ran ? cov.usable : "?"} 漏审帧=${cov.ran ? cov.uncovered : "?"} CLEAN作废=${cov.ran ? cov.rejected : "?"}`;
  notes.push(`逐帧覆盖与 CLEAN 合规的裁判=${cov.src || "(无)"} ⇒ ${cov.verdict || cov.why || "(无读数)"}`);
  if (bandStale) notes.push(`件 band=${plan.band} 与账本 band=${ledgerBand} 不符 ⇒ 这批卡看的是另一档产物的帧`);
  if (noCard.length) notes.push(`没交卡=${noCard.join(",")}`);
  if (plan && laneIds.length === 0) notes.push("派单件里没有 lanes[]（或读不到派单件）⇒ 交卡对账无从谈起");
  return { ok, got, named, problems, notes, sev: P, noCard, clean: { ok: cov.ran ? cov.clean : -1, bad: cov.ran ? cov.rejected : -1, total: cleanSections }, uncovered: cov.ran ? (cov.uncoveredNames || []) : [], blocking, usable: cov.ran ? cov.usable : -1 };
}

/* PASS 行的唯一渲染处：只吃 rows（=上面刚打印过的那张判据表），不引用任何别处的绑定。
   为什么抽出来且只读表（2026-10-19 实测）：原版是 `rounds=${rounds.length}`，而本文件没有 `rounds`
   这个绑定 ⇒ 判据真全中那一发会在最后一行抛 ReferenceError、退出码 1，载具读不到 PASS 行——
   绿的收口被读成红。这一行的每个数都直接取 rows[].got，表能打印 ⇒ 行就能渲染。 */
function passLineFromRows(rows) {
  const got = (n) => { const x = (rows || []).find((y) => y && y.name === n); return x ? String(x.got) : "(无此判据)"; };
  return `${RK}=PASS 判据=${(rows || []).length} 全中 rounds=${got("rounds")} coverage=${got("coverage")} `
    + `newdefects=${got("newdefects")} fixvis=${got("fixvis")} band=${got("band")} chain=${got("chain")} `
    + `carriers=${got("carriers")} roundtrip=${got("roundtrip")}`;
}

/* ── newdefects 判据自证（2026-10-19 按裁定改口径后补）：
   这条判据以前只在 judge() 层面自证，**分桶与逐帧覆盖的算法本体从来没被喂过合成件**
   ⇒ 改错了也只会体现在真机那一发上（而真机那一发现在还是红的，分不清是判据错还是产品没修完）。
   这里直接把 assessLastRound 的四种输入形状钉死：P0/P1 必红、只有 P2/P3 必绿且逐条点名、
   漏审帧必红、以及**变异翻绿**（补上合规 CLEAN 卡 ⇒ 必须从红变绿，否则这个红是恒红装饰）。 */
function newdefectsSelfTest(SRK) {
  const FR1 = "tmp/qa/frames/ST/real-st/pages__home__index__top.png";
  const FR2 = "tmp/qa/frames/ST/real-st/pages__login__index__top.png";
  const H1 = "abcdef1234566789";
  const plan = { lanes: [{ lane_id: "ST-L01" }], band: "real@f0677920" };
  const LEDGER_BAND = "real@f0677920";
  const defect = (id, p, sev, axis) => `## FRAME ${p}\n- frame_hash: ${H1}\n- defect_id: ${id}\n- axis: ${axis || "间距"}\n- severity: ${sev}\n- fix_category: 单页\n`;
  const cardOf = (...secs) => ({ file: "ST-L01.md", text: secs.join("") });
  /* 覆盖与 CLEAN 合规的裁判是找茬门，所以合成件喂的是**那扇门会吐出的读数形状**，不是本门自算的结果。 */
  const covOK = (clean = 0) => ({ ran: true, usable: 2, uncovered: 0, uncoveredNames: [], uncNum: 0, truncated: false, clean, rejected: 0, verdict: "FINDERLANE_RESULT=PASS", src: "spawn verify-finder-lane（合成读数）" });
  const covMiss = (names, extra = {}) => ({ ran: true, usable: 2, uncovered: names.length, uncoveredNames: names, uncNum: names.length, clean: 0, rejected: 0, verdict: `FINDERLANE_RESULT=FAIL problems=${names.length}`, src: "spawn verify-finder-lane（合成读数）", ...extra });
  const run = (cards, over = {}) => assessLastRound({ lastRound: "ST", cards, plan, planSrc: "lanes-ST.json", ledgerBand: LEDGER_BAND, cover: covOK(), ...over });
  const has = (ps, re) => ps.some((x) => re.test(x));
  const STALE = "卡/帧来自 R4 而末轮（清单 mtime 派生）=R5 ⇒ 不许拿上一轮的卡给这一轮盖章";

  let fails = 0;
  const C = (label, cards, expectGreen, extra, over) => ({ label, cards, expectGreen, extra, over });
  const cases = [
    C("①P0 一条 ⇒ 红", [cardOf(defect("ST-D1", FR1, "P0"), defect("ST-D2", FR2, "P2"))], false,
      (r) => r.blocking === 1 && has(r.problems, /P0\/P1 新增缺陷=1/)),
    C("②只有 P2/P3 ⇒ 绿且逐条点名", [cardOf(defect("ST-D3", FR1, "P2"), defect("ST-D4", FR2, "P3"))], true,
      (r) => r.named.length === 2 && r.got.includes("P0=0 P1=0") && r.got.includes("P2=1 P3=1")),
    C("③有帧既无缺陷卡也无 CLEAN 卡 ⇒ 红", [cardOf(defect("ST-D5", FR1, "P2"))], false,
      (r) => has(r.problems, /既无缺陷卡也无合规 CLEAN 卡/) && r.uncovered.join(" ").includes(FR2),
      { cover: covMiss([FR2]) }),
    C("④变异：那张红帧改有合规 CLEAN 卡 ⇒ 翻绿", [cardOf(defect("ST-D6", FR1, "P2"))], true,
      (r) => r.got.includes("CLEAN=1") && r.uncovered.length === 0,
      { cover: covOK(1) }),
    C("变异：把 P0 降成 P2 ⇒ 翻绿", [cardOf(defect("ST-D1b", FR1, "P2"), defect("ST-D2", FR2, "P2"))], true, () => true),
    C("CLEAN 卡被门判作废 ⇒ 仍红（不是翻绿）", [cardOf(defect("ST-D7", FR1, "P2"))], false,
      (r) => has(r.problems, /伪 CLEAN/) && r.uncovered.length === 1,
      { cover: covMiss([FR2], { rejected: 1 }) }),
    C("门没吐出读数 ⇒ NOT-EVIDENCED 级红", [cardOf(defect("ST-D8", FR1, "P2"), defect("ST-D9", FR2, "P2"))], false,
      (r) => has(r.problems, /逐帧覆盖不可证/),
      { cover: { ran: false, why: "找茬门没吐出 FINDERLANE_STATS", src: "spawn 失败" } }),
    C("可用帧=0（空分母）⇒ 不许当绿", [cardOf(defect("ST-D10", FR1, "P2"))], false,
      (r) => has(r.problems, /空分母/), { cover: { ...covOK(), usable: 0 } }),
    C("分母外帧的 P0 照旧计（不许因路径剔掉）", [cardOf(defect("ST-D21", "tmp/qa/frames/ST/real-st/gone__top.png", "P0"), defect("ST-D22", FR1, "P2"), defect("ST-D23", FR2, "P2"))], false,
      (r) => r.sev.P0 === 1 && r.blocking === 1 && r.uncovered.length === 0),
    C("缺陷没标级 ⇒ 按阻断计（不许静默放过）", [{ file: "ST-L01.md", text: `## FRAME ${FR1}\n- frame_hash: ${H1}\n- defect_id: ST-D10\n- axis: 间距\n- severity: 高危\n` + defect("ST-D11", FR2, "P2") }], false,
      (r) => r.sev.none === 1 && r.blocking === 1),
    C("派单件读不到 ⇒ 红（空目录≠零缺陷）", [cardOf(defect("ST-D12", FR1, "P2"), defect("ST-D13", FR2, "P3"))], false,
      (r) => has(r.problems, /派单件读不到/), { plan: null, planSrc: "" }),
    C("有派单没交卡 ⇒ 红（对账照旧保留）", [], false,
      (r) => r.noCard.length === 1 && has(r.problems, /没交卡的泳道=ST-L01/)),
    C("卡与账本 band 不符 ⇒ 红", [cardOf(defect("ST-D14", FR1, "P2"), defect("ST-D15", FR2, "P2"))], false,
      (r) => has(r.problems, /band=real@deadbeef 与账本/), { plan: { lanes: [{ lane_id: "ST-L01" }], band: "real@deadbeef" } }),
    C("缺陷数为 0 但卡是别轮的 ⇒ 仍红", [cardOf(defect("ST-D24", FR1, "P2"), defect("ST-D25", FR2, "P3"))], false,
      (r) => has(r.problems, /不许拿上一轮的卡/), { stale: STALE }),
  ];
  for (const c of cases) {
    const r = run(c.cards, c.over || {});
    const good = r.ok === c.expectGreen && (!c.extra || c.extra(r));
    if (!good) fails++;
    console.log(`${SRK} newdefects ${c.label.padEnd(30)} 期望=${c.expectGreen ? "绿" : "红"} 实测=${r.ok ? "绿" : `红(${r.problems.length})`} ⇒ ${good ? "判点承重" : "判点失效"}`);
    if (!good) for (const p of r.problems.slice(0, 3)) console.log(`${SRK}   └ ${p}`);
  }
  /* 逐条点名必须真点名：P2/P3 有几条就得有几行，且行里有 defect_id + 帧 + 卡名。 */
  const r2 = run([cardOf(defect("ST-D19", FR1, "P2"), defect("ST-D20", FR2, "P3"))]);
  const namedOk = r2.named.length === r2.sev.P2 + r2.sev.P3 && r2.named.every((n) => /P[23] ST-D\d+ 帧=\S+ axis=\S+ 卡=ST-L01\.md/.test(n));
  console.log(`${SRK} ${"P2/P3 逐条点名不漏不静默".padEnd(40)} ⇒ ${namedOk ? "承重" : "失效"} 点名=${r2.named.length} P2+P3=${r2.sev.P2 + r2.sev.P3}`);
  if (!namedOk) fails++;
  /* 读数形状钉死：载具与报告要按这个格式抓数（缺任一段 = 读数不可比）。 */
  const shapeOk = ["P0=0", "P1=0", "P2=1", "P3=1", "CLEAN=0"].every((k) => r2.got.includes(k));
  console.log(`${SRK} ${"读数含 P0/P1/P2/P3/CLEAN 五档".padEnd(40)} ⇒ ${shapeOk ? "承重" : "失效"}`);
  if (!shapeOk) fails++;
  /* ── 与真门同源的夹具对（盘上真卡 + 真 spawn，不是合成读数）：
     cards/ 的 CLEAN 卡合规 ⇒ 本条判据绿；cards-bad/ 只差那张卡 ⇒ 门把它作废 ⇒ 本条判据红。
     这一对同时证明两件事：①判点会翻绿（不是恒红装饰）；②本门没另抄逐轴判点，口径跟着 L04 走。 */
  const fx = join(REPO, "tmp", "qa", "fixtures", "closeout");
  const manP = join(fx, "frames", "sweep-manifest.json");
  const runFx = (dir) => {
    const pl = JSON.parse(readFileSync(join(fx, "lanes-FX.json"), "utf-8"));
    const cs = readdirSync(join(fx, dir)).filter((f) => f.endsWith(".md")).sort().map((f) => ({ file: f, text: readFileSync(join(fx, dir, f), "utf-8") }));
    const cover = spawnFinderLane(join(fx, dir), manP);
    return { cover, r: assessLastRound({ lastRound: "FX", cards: cs, plan: pl, planSrc: "fixtures/closeout/lanes-FX.json", ledgerBand: "real@f0677920", cover }) };
  };
  let gFx = null, bFx = null, fxErr = "";
  try { gFx = runFx("cards"); bFx = runFx("cards-bad"); } catch (e) { fxErr = String((e && e.message) || e); }
  if (!gFx || !bFx) {
    console.log(`${SRK} ${"夹具对：真门裁决 合规绿／糊弄红".padEnd(40)} ⇒ 失效：夹具读不到（${fxErr}）— 不许跳过这一例`);
    fails++;
  } else {
    const fxOk = gFx.r.ok === true && gFx.cover.clean === 1 && gFx.cover.uncovered === 0
      && bFx.r.ok === false && bFx.cover.rejected === 1 && bFx.cover.uncovered === 1
      && /PASS/.test(gFx.cover.verdict) && /FAIL/.test(bFx.cover.verdict);
    console.log(`${SRK} ${"夹具对：真门裁决 合规绿／糊弄红".padEnd(40)} ⇒ ${fxOk ? "承重" : "失效"} 合规件=${gFx.r.ok ? "绿" : `红(${gFx.r.problems.length})`} CLEAN=${gFx.cover.clean} 糊弄件=${bFx.r.ok ? "绿(错)" : "红"} 采信=${bFx.cover.clean} 作废=${bFx.cover.rejected} 漏审=${bFx.cover.uncovered}`);
    if (!fxOk) for (const p of (gFx.r.ok ? bFx.r.problems : gFx.r.problems).slice(0, 3)) console.log(`${SRK}   └ ${p}`);
    if (!fxOk) fails++;
  }
  return { fails, n: cases.length + 4 };
}

function runSelfTest() {
  const SRK = "FIDELITY_CLOSEOUT_SELFTEST";
  const okRow = { name: "x", ok: true, got: "1", want: "1", src: "s" };
  const cases = [
    ["全绿基线", [{ ...okRow }], true],
    ["有一条不中必须红", [{ ...okRow }, { name: "y", ok: false, got: "0", want: "1", src: "s" }], false],
    ["ok 字段缺失（undefined）不许当绿", [{ name: "z", got: "0", want: "1", src: "s" }], false],
    ["空表不许当「没有不中的条目」⇒ 绿", [], false],
    ["got 比 want 多也不中", [{ name: "w", ok: false, got: "3", want: "2", src: "s" }], false],
  ];
  let fails = 0;
  for (const [label, rows, expectPass] of cases) {
    const r = judge(rows.map((x) => ({ ...x, ok: x.ok === true })));
    const got = r.pass;
    const good = got === expectPass;
    if (!good) fails++;
    console.log(`${SRK} ${label.padEnd(28)} 期望=${expectPass ? "绿" : "红"} 实测=${got ? "绿" : `红(${r.bad.length})`} ⇒ ${good ? "判点承重" : "判点失效"}`);
  }
  /* 变异证明：把不中的那条改成 ok:true，判据必须翻绿——否则"红"是恒红的装饰，测不出任何东西。 */
  const mutant = judge([{ name: "y", ok: true, got: "1", want: "1", src: "s" }]);
  console.log(`${SRK} 变异(不中→中) 翻绿=${mutant.pass ? "yes" : "no"} ⇒ ${mutant.pass ? "判点可修" : "判点恒红"}`);
  if (!mutant.pass) fails++;
  /* ── PASS 行渲染自证（2026-10-19 补）：全绿那一行平时根本跑不到（本程八条还红着），
     上一版就因为它引用了不存在的绑定，把"收口成功"读成"收口门崩了"。跑不到 ≠ 可以不对，
     所以这里把它渲染出来、并把"判据名 ↔ 行内字段名"绑成同一张表。 */
  const NAMES = ["rounds", "coverage", "newdefects", "fixvis", "band", "chain", "carriers", "roundtrip"];
  const greenRows = NAMES.map((n, i) => ({ name: n, ok: true, got: `g${i}`, want: "w", src: "s" }));
  const line = passLineFromRows(greenRows);
  const lineOk = line.startsWith(`${RK}=PASS`) && NAMES.every((n) => line.includes(`${n}=`)) && !/undefined|无此判据/.test(line);
  console.log(`${SRK} ${"PASS 行可渲染".padEnd(28)} ⇒ ${lineOk ? "承重" : "失效"}：${line}`);
  if (!lineOk) fails++;
  /* 变异：抽掉一条判据 ⇒ 必须显式留痕"(无此判据)"，不许静默少印一项（静默少印=下一程看不出错）。 */
  const mutLine = passLineFromRows(greenRows.slice(1));
  const mutVisible = mutLine.includes("(无此判据)");
  console.log(`${SRK} ${"变异(少一条判据)显式留痕".padEnd(28)} ⇒ ${mutVisible ? "承重" : "失效"}`);
  if (!mutVisible) fails++;
  /* 名字对账：主流程 push 的判据名必须与 NAMES 一字不差（改一边忘另一边 = PASS 行读不到那条）。
     这是从自己的源码里现数的，不抄散文数字。 */
  const self = readFileSync(fileURLToPath(import.meta.url), "utf-8");
  const pushed = [...self.matchAll(/push\(\s*"([a-z]+)"/g)].map((m) => m[1]);
  const nameSet = [...new Set(pushed)].sort();
  const namesAgree = nameSet.length === NAMES.length && NAMES.every((n) => nameSet.includes(n));
  console.log(`${SRK} ${"判据名与 PASS 行同名".padEnd(28)} ⇒ ${namesAgree ? "承重" : "失效"} 现数=${nameSet.join(",")}`);
  if (!namesAgree) fails++;
  /* 没放宽的机器留痕（本程只动 newdefects）：rounds 判据的三条硬形状必须还在——
     ①仍然要求 `validRounds.size >= MIN_ROUNDS`（不是 >=2、不是"盘上轮数"）；
     ②MIN_ROUNDS 默认仍是 3；③轮次证明仍只认 automator 清单里的 reattach.exit===0。
     这三条任何一条被改松，本子例当场红；载具里就不用再靠人复读散文确认。 */
  const roundsStrict = /push\(\s*"rounds"\s*,\s*validRounds\.size >= MIN_ROUNDS/.test(self)
    && /const MIN_ROUNDS = Number\(arg\("min-rounds", "3"\)\)/.test(self)
    && /Number\(re\.exit\) === 0/.test(self);
  console.log(`${SRK} ${"rounds 判据未被放宽（三条硬形状）".padEnd(28)} ⇒ ${roundsStrict ? "承重" : "失效"}`);
  if (!roundsStrict) fails++;
  /* 反"第二份真相"守卫：逐轴 CLEAN 合规的判点只许长在找茬门里，本门只许 spawn 它、读它吐的数。
     一旦有人在本文件里另抄一份轴词表/读数判点（两份必漂），这一例当场红。
     禁词用拼接写——本例子是拿自己的源码做子串检查的，把禁词原样写出来会自匹配成"永远失效"。 */
  const FORBID = ["const" + " AXES" + " = new Set", "AXIS" + "_ALT", "PROSE" + "_EMPTY", "reading" + "Reject", "cleanAxis" + "Values"];
  const noSecondTruth = FORBID.every((t) => !self.includes(t)) && /spawnFinderLane/.test(self) && /verify-finder-lane\.mjs/.test(self);
  console.log(`${SRK} ${"CLEAN 合规判点不在本门另抄一份".padEnd(28)} ⇒ ${noSecondTruth ? "承重" : "失效" + FORBID.filter((t) => self.includes(t)).join("/")}`);
  if (!noSecondTruth) fails++;
  const nd = newdefectsSelfTest(SRK);
  fails += nd.fails;
  console.log(`${SRK}=${fails === 0 ? "PASS" : "FAIL"} 例数=${cases.length + 4 + nd.n} 失效=${fails}`);
  process.exit(fails === 0 ? 0 : 1);
}
if (flag("self-test")) runSelfTest();

const LEDGER = resolve(arg("ledger", ""));
if (!LEDGER || !existsSync(LEDGER)) { console.log(`${RK}=NOT-EVIDENCED reason=no-ledger path=${arg("ledger", "") || "(没传 --ledger)"}`); process.exit(2); }
const ledger = JSON.parse(readFileSync(LEDGER, "utf-8"));
const wantRoutes = (ledger.rows || []).map((r) => r.route);
if (!wantRoutes.length) { console.log(`${RK}=NOT-EVIDENCED reason=empty-ledger（空账本没有分母，收口就是空话）`); process.exit(2); }

const MIN_ROUNDS = Number(arg("min-rounds", "3"));
/* band 的期望值从账本取，不从命令行赌：账本已经声明它属于哪棵树。 */
const EXPECT_BAND = arg("band", "") || ledger.bandStamp || "";
const rows = [];
const push = (name, ok, got, want, src) => rows.push({ name, ok: ok === true, got: String(got), want: String(want), src: String(src) });

/* 交付目录也派生：取 reports/audit 下最新那个 mp-fidelity-*。载具里要写死参数，
   而这一程的目录名带日期，写死等于下一程拿着上一程的判决读数。 */
function newestReportDir() {
  const base = join(REPO, "reports", "audit");
  if (!existsSync(base)) return "";
  const cands = readdirSync(base).filter((d) => /^mp-fidelity-/.test(d) && existsSync(join(base, d))).sort();
  return cands.length ? join(base, cands[cands.length - 1]) : "";
}
const REPORT_DIR = resolve(arg("report-dir", "") || newestReportDir());
/* 够不着名册按约定放在交付目录里，文件名固定；找不到就不传（覆盖门会照旧把那些页判红，
   这是诚实的缺省——把名册"造出来"让门变绿才是造假）。 */
const blockedFile = arg("blocked", "") ? resolve(arg("blocked", "")) : (existsSync(join(REPORT_DIR, "blocked-routes.json")) ? join(REPORT_DIR, "blocked-routes.json") : "");
const blockedRoutes = new Set();
if (blockedFile) {
  try { for (const r of (JSON.parse(readFileSync(blockedFile, "utf-8")).rows || [])) if (r && r.route && r.reason && r.evidence) blockedRoutes.add(String(r.route)); }
  catch { console.log("CLOSEOUT_BLOCKED_件 读不成 JSON ⇒ 当没有名册（不据此减少分母）"); }
  console.log(`CLOSEOUT_BLOCKED 载入 ${relOf(blockedFile)} 有效行=${blockedRoutes.size}（每行都要 reason+evidence，缺任一不计）`);
}
/* 只在"旗标真的传了"时才 resolve：arg 的缺省是空串，resolve("") 会返回当前目录，
   于是"没传 --roundtrip"被读成"目录里那个读不成的 JSON"，MISS 与坏件分不出来。 */
const pickFile = (k, cands) => { const a = arg(k, ""); if (a) return resolve(a); for (const c of cands) if (c && existsSync(c)) return resolve(c); return ""; };
const pickArg = (k, d) => { const a = arg(k, ""); return a ? resolve(a) : d; };

/* 1 rounds：轮次**从盘上派生**，不靠我报（载具里要写死参数，而轮次名每轮都变）。
   一轮算数的前提是它的清单证明"取景前重开过项目窗口"（reattach.exit===0）：
   R2 实测没重开 ⇒ 整轮帧是改前编译，那一轮无论跑出多少数都不能计入轮次。
   早于该仪表字段的轮次（R1）如实标成"改前基线轮"，不计入三轮——那是 instrument 的欠账，不是产品的。 */
const FRAMES_ROOT = resolve(arg("frames-root", join(REPO, "tmp/qa/frames")));
const derived = [];
if (existsSync(FRAMES_ROOT)) {
  for (const rd of readdirSync(FRAMES_ROOT).sort()) {
    const bandDir = join(FRAMES_ROOT, rd);
    if (!existsSync(bandDir)) continue;
    for (const bd of readdirSync(bandDir)) {
      /* 两条通道各写各的件：automator 取景腿写 sweep-manifest.json，CLI 巡检腿写 tour-manifest.json。
         覆盖判据要的是"这页有没有画面"，两件的页必须并起来数——只认一件就会把 57 页无基准页永远读成零帧。 */
      for (const fname of ["sweep-manifest.json", "tour-manifest.json"]) {
        const mf = join(bandDir, bd, fname);
        if (existsSync(mf)) derived.push({ round: rd, band: bd, channel: fname === "sweep-manifest.json" ? "automator" : "cli", manifestPath: mf });
      }
    }
  }
}
const wanted = listArg("rounds");
const picked = wanted.length ? derived.filter((d) => wanted.includes(d.round)) : derived;
const roundInfo = [];
for (const d of picked) {
  let m = null;
  try { m = JSON.parse(readFileSync(d.manifestPath, "utf-8")); } catch { /* 读不成 = 该件无效 */ }
  const re = m && m.reattach;
  roundInfo.push({ ...d, manifest: m, valid: !!m && re && Number(re.exit) === 0, why: !m ? "清单读不成" : (re && re.exit !== null ? `reattach.exit=${re.exit}` : String((re && re.proven) || "清单没有 reattach 字段（改前基线轮，不计入轮次）")) });
}
/* 轮次有效性按"轮"判，不按"件"判：一轮只要有一件 automator 清单证明重开过窗口就算这一轮成立。 */
const validRounds = new Set(roundInfo.filter((r) => r.valid).map((r) => r.round));
for (const r of roundInfo) console.log(`CLOSEOUT_ROUND ${r.round}/${r.channel} valid=${r.valid ? "yes" : "NO"} (${r.why}) manifest=${relOf(r.manifestPath)}`);
push("rounds", validRounds.size >= MIN_ROUNDS, `盘上轮=${new Set(roundInfo.map((r) => r.round)).size} 有重开窗证明的轮=${validRounds.size}`, `>=${MIN_ROUNDS}`,
  `派生自 ${relOf(FRAMES_ROOT)}/*/*/sweep-manifest.json（CLI 件不贡献轮次证明）`);

/* 2 coverage：覆盖门**按轮**跑一次，分子是该轮两条通道的清单**并集**，分母是账本 71 行。
   旧写法是"逐件 spawn、逐件要 PASS"，而 Phase D 的两条通道天然各管一半（automator 14 页有基准、
   CLI 57 页无基准）⇒ 单件永远缺另一半的页 ⇒ 这一条在构造上恒红。恒红的判据不测任何东西
   （本仓对零命中仪表记过两次账，这次是它的镜像形状：恒红门）。改成按轮并集后，
   一件坏（band 不符/空转/跨通道同图）照样红，因为覆盖门自己就把这些当成 problem 点名。 */
const coverScript = join(REPO, "scripts/qa/verify-sweep-coverage.mjs");
const covered = new Set();
let coverGateFails = 0; const coverNotes = [];
const byRound = new Map();
for (const rec of roundInfo) byRound.set(rec.round, [...(byRound.get(rec.round) || []), rec]);
for (const [rd, recs] of byRound) {
  /* 覆盖判据只加在**算数的轮**上（清单里重开窗得证的那些）。
     R1/R1smoke/R2 是两条通道并集这套做法之前的历史轮，拿今天的尺去量它们必然红——
     那不是"覆盖不齐"，是"判据与轮次不同源"。反过来，一个证明不了画面新鲜的轮
     也没资格替覆盖作证，所以它两头都不计：既不进轮次数，也不进覆盖判据。 */
  const rdValid = recs.some((r) => r.valid);
  if (!rdValid) { coverNotes.push(`${rd}: 无重开窗证明 ⇒ 不计入轮次，也不参加覆盖判据（历史轮）`); continue; }
  const broken = recs.filter((r) => !r.manifest);
  if (broken.length) { coverGateFails++; coverNotes.push(`${rd}: ${broken.length} 件清单读不成 JSON（${broken.map((b) => relOf(b.manifestPath)).join(", ")}）`); }
  const usable = recs.filter((r) => r.manifest);
  for (const rec of usable) {
    const routes = (rec.manifest.results || []).filter((r) => (r.frames || []).some((f) => Number(f.bytes) > 3000 && !f.landingMismatch && !f.belowFloor)).map((r) => r.route);
    for (const r of routes) covered.add(r);
  }
  if (!usable.length) { coverNotes.push(`${rd}: 本轮没有可判的清单 ⇒ 不计覆盖`); continue; }
  const s = spawnSync(process.execPath, [coverScript, "--ledger", LEDGER, "--manifest", usable.map((r) => r.manifestPath).join(","), ...(blockedFile ? ["--blocked", blockedFile] : [])], { cwd: REPO, encoding: "utf8" });
  const out = `${s.stdout || ""}${s.stderr || ""}`;
  const line = (out.match(/SWEEPCOVER_RESULT=\S+/) || ["(无结果行)"])[0];
  const st = (out.match(/SWEEPCOVER_STATS .*/) || ["(无统计行)"])[0].trim();
  if (!/SWEEPCOVER_RESULT=PASS/.test(line)) { coverGateFails++; coverNotes.push(`${rd}（并集 ${usable.length} 件）: ${line}`); }
  coverNotes.push(`${rd}（并集 ${usable.length} 件）: ${st}`);
}
/* 分母守恒：covered + blocked + missing = want。blocked 只收"名册里带 reason+evidence 的行"，
   而且真正的裁判还是覆盖门（它规定：名册里的页一旦真拍到可用帧就把那行判红）。 */
const missing = wantRoutes.filter((r) => !covered.has(r) && !blockedRoutes.has(r));
const blockedCount = wantRoutes.filter((r) => !covered.has(r) && blockedRoutes.has(r)).length;
push("coverage", coverGateFails === 0 && missing.length === 0,
  `并集覆盖=${covered.size}/${wantRoutes.length} 够不着=${blockedCount} 缺页=${missing.length} 覆盖门红=${coverGateFails}`,
  "每轮并集覆盖门 PASS 且 covered+够不着=71", "spawn verify-sweep-coverage --ledger --manifest <两条通道的清单> [--blocked 名册]");
if (missing.length) console.log(`CLOSEOUT_MISSING_ROUTE ${missing.slice(0, 60).join(" ")}`);
for (const n of coverNotes) console.log(`CLOSEOUT_COVER ${n}`);

/* 3..8 都锚在"末轮"上：末轮 = 清单 mtime 最新的那一轮。
   判决件按轮命名（fix-visibility-<round>.json / roundtrip-<round>.json）；
   找不到当轮件就**明说读的是哪一份**，不许拿着上一轮的判决给这一轮盖章。 */
let lastRound = "";
if (roundInfo.length) {
  const byM = roundInfo.map((r) => ({ r, t: statSync(r.manifestPath).mtimeMs })).sort((a, b) => a.t - b.t);
  lastRound = byM[byM.length - 1].r.round;
}
const lanesLast = resolve(pickArg("lanes-last", join(REPO, "tmp/qa/lanes", lastRound)));
let laneNotes = [];
if (lanesLast && existsSync(lanesLast)) {
  /* 判"末轮还找没找出阻断级缺陷"之前，先判两件事：
     ①卡到底交没交——旧写法是 readdir 找 .md（排掉 .brief.md）再数 defect_id ⇒ 一条卡都没有时 lastDefects=0 ⇒ 绿。
       R2b 现场就是这个形状：盘上只有 6 张 .brief.md（派单），一张卡都没写，收口门却把 newdefects 报成 OK。
       这就是本仓记过两次的「零命中仪表」的反向形：**空目录被判成通过**。按派单方自己的件逐条对账，照旧保留。
     ②每一张可用帧到底有没有交代——要么一张缺陷卡，要么一张**合规** CLEAN 卡（L04 的逐轴出口）。
       既无缺陷卡也无合规 CLEAN 卡的帧 = 漏审，漏审不是"没问题" ⇒ 判红。
     口径（2026-10-19 用户裁定）：P0/P1 新增=0 即算收口；P2/P3 允许存在但**逐条点名 + 单列读数**；
     没标 severity 的条目按阻断计（证明不了它不阻断就不能据此收口）。 */
  const planP = ["lanes-" + lastRound + ".json", "lanes.json"]
    .map((n) => join(lanesLast, n)).find((p) => existsSync(p))
    || (readdirSync(lanesLast).filter((f) => /^lanes.*\.json$/i.test(f))[0] ? join(lanesLast, readdirSync(lanesLast).filter((f) => /^lanes.*\.json$/i.test(f))[0]) : "");
  let plan = null;
  if (planP) { try { plan = JSON.parse(readFileSync(planP, "utf-8")); } catch { plan = null; } }
  const cardFiles = readdirSync(lanesLast).filter((f) => f.endsWith(".md") && !/\.brief\.md$/i.test(f)).sort();
  const cards = cardFiles.map((f) => ({ file: f, text: readFileSync(join(lanesLast, f), "utf-8") }));

  /* 逐帧覆盖与 CLEAN 合规**不在本门重算**：喂给找茬门（L04）的是"卡目录 + 派单件声明的取景清单"，
     读它自己的 FINDERLANE_STATS 未被覆盖= 与 CLEAN_CARDS=/CLEAN_REJECTED=。
     清单首选派单件自己的 manifest（那是派单时给泳道的 scope），退回末轮 automator 清单；
     不拿 CLI 巡检腿的 57 页当分母——那些页不在这批派单 scope 里，算进来就是"判据与派单不同源"的恒红形状。 */
  const lastRecs = roundInfo.filter((x) => x.round === lastRound);
  const cand = [];
  if (plan && plan.manifest) cand.push({ p: resolve(String(plan.manifest)), src: "派单件 plan.manifest" });
  for (const rec of lastRecs.filter((r) => r.channel === "automator")) cand.push({ p: rec.manifestPath, src: "末轮 automator 清单" });
  for (const rec of lastRecs) cand.push({ p: rec.manifestPath, src: "末轮清单（含 CLI 通道）" });
  let man = null; let manP = ""; let manSrc = "";
  for (const c of cand) {
    if (!c.p || !existsSync(c.p)) continue;
    try { man = JSON.parse(readFileSync(c.p, "utf-8")); } catch { continue; }
    manP = c.p; manSrc = `${relOf(c.p)}（取自${c.src}）`;
    break;
  }
  /* 卡与分母必须同轮同档：末轮是按清单 mtime 派生的，卡目录可能被显式指到别轮。
     "拿上一轮的判决给这一轮盖章"本文件已在 fixvis/roundtrip 上禁过，这里补上卡这一侧。 */
  const cardsRound = String((plan && plan.round) || (man && man.round) || lastRound || "");
  let stale = "";
  if (man && man.band && ledger.bandStamp && man.band !== ledger.bandStamp) stale = `取景清单 band=${man.band} 与账本 band=${ledger.bandStamp} 不符 ⇒ 分母来自另一档产物的帧`;
  else if (cardsRound && lastRound && cardsRound !== lastRound) stale = `卡/帧来自 ${cardsRound} 而末轮（清单 mtime 派生）=${lastRound} ⇒ 不许拿上一轮的卡给这一轮盖章`;
  const cover = spawnFinderLane(lanesLast, manP);
  const nd = assessLastRound({ lastRound, cards, plan, planSrc: planP ? relOf(planP) : "(读不到)", stale, ledgerBand: ledger.bandStamp, cover });
  laneNotes = [...nd.notes];
  laneNotes.push(`喂给找茬门的清单=${manSrc || "(读不到：派单件没写 manifest 且末轮清单不存在)"} round=${(man && man.round) || "?"} band=${(man && man.band) || "?"} 末轮=${lastRound}`);
  for (const p of nd.problems) laneNotes.push(`红点 ${p}`);
  for (const n of nd.named) console.log(`CLOSEOUT_P2P3 ${n}`);
  push("newdefects", nd.ok, nd.got,
    "每条派单都交了卡 且 每张可用帧有缺陷卡或合规 CLEAN 卡 且 P0=0 P1=0（P2/P3 允许但逐条点名）",
    `卡目录 ${relOf(lanesLast)} 按派单件对账（缺陷分桶本门现数） + 逐帧覆盖/CLEAN 合规=spawn verify-finder-lane --lane ${relOf(lanesLast)} --manifest ${manSrc || "(读不到)"}`);
} else {
  push("newdefects", false, `(末轮 ${lastRound || "?"} 的卡目录读不到 ${relOf(lanesLast || ".")})`,
    "每条派单都交了卡 且 每张可用帧有缺陷卡或合规 CLEAN 卡 且 P0=0 P1=0（P2/P3 允许但逐条点名）",
    "目录不存在 ⇒ NOT-EVIDENCED 级红，不当绿");
}
for (const n of laneNotes) console.log(`CLOSEOUT_LANES ${n}`);

/* 4 fixvis：改后帧里不许留 FIXNOTVISIBLE / CLOCK_ONLY。 */
const fixvisP = pickFile("fixvis", [join(REPORT_DIR, `fix-visibility-${lastRound}.json`), join(REPORT_DIR, "fix-visibility.json")]);
let fv = null;
if (fixvisP && existsSync(fixvisP)) { try { fv = JSON.parse(readFileSync(fixvisP, "utf-8")); } catch { fv = null; } }
const fvBad = fv ? ((fv.stats && (fv.stats.notVisible || 0) + (fv.stats.clockOnly || 0)) || 0) : -1;
push("fixvis", !!fv && fvBad === 0, fv ? `读=${relOf(fixvisP)} visible=${fv.stats && fv.stats.visible} notVisible=${fv.stats && fv.stats.notVisible} clockOnly=${fv.stats && fv.stats.clockOnly}` : "(读不到)",
  "notVisible+clockOnly=0", "生产者 verify-fix-visibility.mjs（比内容区像素，不比状态栏时钟）");

/* 5 band：产物带戳必须还是那一档。 */
const proj = resolve(arg("project", join(REPO, "apps/client/dist/build/mp-weixin-real")));
const envFile = join(proj, "config", "env.js");
let bandNow = "";
if (existsSync(envFile)) {
  const buf = readFileSync(envFile);
  const m = String(buf).match(/MODE:\s*"([^"]+)"/);
  bandNow = `${m ? m[1] : "?"}@${createHash("sha256").update(buf).digest("hex").slice(0, 8)}`;
}
push("band", !!EXPECT_BAND && bandNow === EXPECT_BAND && (!ledger.bandStamp || ledger.bandStamp === EXPECT_BAND),
  bandNow || "(读不到 env.js)", EXPECT_BAND || "(没传 --band ⇒ 不许绿)", "读 <project>/config/env.js 现算 sha8");

/* 6 chain + 7 carriers：spawn 那两个离线门，读它们自己的结果行。 */
function spawnLine(script, args, tagRe) {
  const s = spawnSync(process.execPath, [join(REPO, script), ...args], { cwd: REPO, encoding: "utf8" });
  const out = `${s.stdout || ""}${s.stderr || ""}`;
  const m = out.match(tagRe);
  return { exit: s.status, line: m ? m[0] : "(无结果行)", raw: out };
}
const chain = spawnLine("scripts/qa/verify-release-chain-steps.mjs", [], /CHAINSTEPS_RESULT=\S+/);
push("chain", /PASS/.test(chain.line), `${chain.line} exit=${chain.exit}`, "CHAINSTEPS_RESULT=PASS", "spawn verify-release-chain-steps");
const gs = spawnLine("scripts/qa/verify-gate-list-sync.cjs", [], /GATESYNC_RESULT=\S+|GATESYNC_ORPHANS=\d+/g);
const orph = (gs.raw.match(/GATESYNC_ORPHANS=(\d+)\s+baseline=(\d+)/) || [])[1];
const orphBase = (gs.raw.match(/GATESYNC_ORPHANS=\d+\s+baseline=(\d+)/) || [])[1];
push("carriers", /GATESYNC_RESULT=PASS/.test(gs.raw) && orph !== undefined && Number(orph) <= Number(orphBase),
  `${(gs.line || "").split("\n").join(" ")} 孤儿=${orph === undefined ? "?" : orph}/基线=${orphBase || "?"}`, "PASS 且孤儿不超基线", "spawn verify-gate-list-sync.cjs");

/* 8 roundtrip：只认生产者落盘的结果件；缺件 = MISS，不许当绿。 */
const rtP = pickFile("roundtrip", [join(REPORT_DIR, `roundtrip-${lastRound}.json`), join(REPORT_DIR, "roundtrip.json")]);
let rt = null, rtBad = "";
if (rtP) { try { rt = JSON.parse(readFileSync(rtP, "utf-8")); } catch { rtBad = "件在但读不成 JSON"; } }
push("roundtrip", !!rt && rt.verdict === "PASS" && rt.conserved === true && Number(rt.fields_same) === Number(rt.fields_total),
  rt ? `读=${relOf(rtP)} verdict=${rt.verdict} conserved=${rt.conserved} fields=${rt.fields_same}/${rt.fields_total} backup=${rt.backup}` : (rtBad ? `${rtBad}（${relOf(rtP)}）` : "MISS（没落盘件＝这一轮没真写过）"),
  "PASS + conserved + 字段齐", "生产者 verify-admin-roundtrip.mjs --out（写库那一发才产得出）");

const r = judge(rows);
console.log(`${RK} 判据=${rows.length} 不中=${r.bad.length}（每条都给 got/want/来源）`);
for (const x of rows) console.log(`  ${x.ok ? "OK  " : "BAD "} ${x.name.padEnd(11)} got=${x.got} want=${x.want} 来源=${x.src}`);
if (r.bad.length) {
  console.log(`${RK}=FAIL 不中=${r.bad.map((x) => x.name).join(",")}（还差 ${r.bad.length} 条，未达"完成"）`);
  process.exit(1);
}
/* PASS 行只许读**上面刚打印过的那张表**，不许另起炉灶重算一遍。
   原版这里写的是 `rounds=${rounds.length}`——本文件根本没有 `rounds` 这个绑定（轮次集合叫 validRounds，
   命令行参数叫 --rounds→wanted），而这一行平时跑不到（判据还红着）⇒ 真全绿那一发会在收口门自己的
   最后一行抛 ReferenceError、退出码 1，载具读不到 FIDELITY_CLOSEOUT_RESULT=PASS：**绿的收口被读成红**。
   八条判据的实测值都已经作为 rows[].got 落过一次（上面那 8 行 OK 就是），拿现成的就结构上不会再引用错名。
   --self-test 里有一条专门渲染这行，改坏字段名当场红。 */
console.log(passLineFromRows(rows));
process.exit(0);
