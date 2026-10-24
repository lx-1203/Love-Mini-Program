#!/usr/bin/env node
/* 落点稳定性判据（§35(4) 收紧，2026-10-01）的单元层负例。全程离线：不开模拟器、不抢 UI 租约、
   不写任何台账 —— reports/audit/round-7/guest-landing-measured.json 只被【读】。
   要钉死的原发缺陷：旧判据 `new Set(samples.map(s=>s.landing)).size===1` 在 n=1 时恒为真，
   于是盘上 28 行全写 stable=true，其中 17 行只有 1 个样本 —— 「没测过」被记成「测过且稳定」。
   本文件干三件事：
     ① 把新判据的四种形状量出来（n=1 不成立 / n=2 一致成立 / n=2 不一致不成立且原因点名落点 / n=3 依据写对）；
     ② 证明两类降级原因分开计数（样本数不足 vs 落点不一致），并把恒等式当场核一遍；
     ③ 变异证明：在 .zcode/tmp 的替身里把判据退回旧写法（活文件一个字不动），
        证明①②那批断言在替身下必然变红 —— 否则本文件测的又是空气。
   §35(1) 的教训在这里照办：变异必须【带着读数】变红，未捕获异常造成的 exit 1 不算反证，
   所以替身的每一发求值都过 try/catch，抛异常记成「空转」并判红。
   方言（聚合器 run-qa-selftests.mjs 认的两行；stem 不带下划线，它取数的 ^\w{2,8}_SUMMARY 上限是 8 字符）：
     SUMMARY: assertion failures = N
     STABN_TEST=PASS|FAIL
   跑法："D:/codex-tools/node-v22.17.0-win-x64/node.exe" scripts/qa/test-guest-landing-stability.mjs */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import * as LIVE_IMPL from "./guest-landing-status.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const STATUS = join(REPO, "scripts", "qa", "guest-landing-status.mjs");
const LEDGER = join(REPO, "reports", "audit", "round-7", "guest-landing-measured.json");
/* 一次性替身只住 .zcode/tmp，结束时整目录删掉并复核不在盘上。 */
const TMP = join(REPO, ".zcode", "tmp", "guest-stability-selftest");
const MUTANT = join(TMP, "guest-landing-status.mutant.mjs");
const sha = (p) => { try { return createHash("sha256").update(readFileSync(p)).digest("hex"); } catch { return "(读不到)"; } };
/* 开跑就记台账与判据活文件的指纹：本文件只读它们，收尾时指纹必须一个 bit 都没动
   （并行测量腿会正当改写台账 ⇒ 这里只把变化打成观测行，判据仍按【本测试写没写】说话）。 */
const LEDGER_START_SHA = sha(LEDGER);
const STATUS_START_SHA = sha(STATUS);

let checks = 0, fail = 0;
/* 聚合器抓的是输出里【第一个】*_TEST=/*_RESULT=(PASS|FAIL) 与第一个 "assertion failures ="：
   凡是往 stdout 里贴别人（或判据文案）的文本都必须先过 san()，否则一条绿会被读成红（反向也成立）。 */
const san = (s) => String(s).replace(/_TEST=/g, "_TEST~").replace(/_RESULT=/g, "_RESULT~")
  .replace(/assertion failures =/g, "assertion-failures(引用)");
function t(name, cond, detail) {
  checks++;
  if (cond) console.log("ok   " + name + (detail === undefined ? "" : "  (" + san(String(detail)).slice(0, 180) + ")"));
  else { fail++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + san(String(detail)).slice(0, 300))); }
}
const S = (...landings) => landings.map((l) => ({ landing: l, identity: "not-logged-in", markers: {} }));

/* ══════════ 1. 判据本体：交给实现（现网 or 替身），断言集一字不变地打两遍 ══════════ */
function coreAssertions(I) {
  return [
    ["A1 n=1 且声明 repeat=2 ⇒ 不 stable（旧判据在这里恒真，这就是那 17 格的形状）",
      () => I.judgeStability(S("pages/login/index"), 2).stable === false],
    ["A2 不 stable 的依据与原因都是【字段】：stableBasis=n=1/repeat=2、stableDefect=SHORT_SAMPLES、stableWhy 说没测够",
      () => {
        const j = I.judgeStability(S("pages/login/index"), 2);
        return j.stableBasis === "n=1/repeat=2" && j.stableDefect === "SHORT_SAMPLES" &&
          j.stableSamples === 1 && j.stableRequiredSamples === 2 && j.stable === false &&
          /未达 repeat=2/.test(String(j.stableWhy)) && !/落点不一致/.test(String(j.stableWhy));
      }],
    ["A3 n=2 且两次落点一致 ⇒ stable，依据写 n=2/repeat=2",
      () => {
        const j = I.judgeStability(S("pages/login/index", "pages/login/index"), 2);
        return j.stable === true && j.stableBasis === "n=2/repeat=2" && j.stableWhy === null && j.stableDefect === null;
      }],
    ["A4 n=2 且落点不一致 ⇒ 不 stable，stableWhy 点名「落点不一致」并带出两个落点",
      () => {
        const j = I.judgeStability(S("pages/login/index", "pages/home/index"), 2);
        return j.stable === false && j.stableDefect === "LANDING_DISAGREE" &&
          /落点不一致/.test(String(j.stableWhy)) && String(j.stableWhy).includes("pages/home/index") &&
          String(j.stableWhy).includes("pages/login/index") && j.stableBasis === "n=2/repeat=2";
      }],
    ["A5 n=3（声明 repeat=3）⇒ stable 且 stableBasis 写对 n=3/repeat=3",
      () => {
        const j = I.judgeStability(S("a", "a", "a"), 3);
        return j.stable === true && j.stableBasis === "n=3/repeat=3" && j.stableRequiredSamples === 3;
      }],
    ["A6 多余样本不扣分：n=3 而声明 repeat=2 ⇒ 仍 stable，依据如实写 n=3/repeat=2",
      () => {
        const j = I.judgeStability(S("a", "a", "a"), 2);
        return j.stable === true && j.stableBasis === "n=3/repeat=2";
      }],
    ["A7 地板值：n=1 且声明 repeat=1 仍不 stable（只按 n>=repeat 判的话，一条 --repeat 1 的腿就把空判据原地复活）",
      () => {
        const j = I.judgeStability(S("a"), 1);
        return j.stable === false && j.stableRequiredSamples === 2 && j.stableDeclaredRepeat === 1 &&
          j.stableDefect === "SHORT_SAMPLES";
      }],
    ["A8 两个条件同时不满足 ⇒ stableDefect 把两条机器码都写出来（分类不许靠句式猜）",
      () => {
        const j = I.judgeStability(S("a", "b"), 3);
        return j.stable === false && j.stableDefect === "SHORT_SAMPLES+LANDING_DISAGREE" &&
          /样本数不足/.test(String(j.stableWhy)) && /落点不一致/.test(String(j.stableWhy));
      }],
    ["A9 landingStatus：n=1 的行算未闭环 MEASURED-UNSTABLE，且该态在 LANDING_UNCLOSED 里、statusText 以「未结案」开头",
      () => {
        const booked = { rows: [{ groupKey: "g1", landing: "a", landingMarker: ".m", registerEntry: null, guardCaseId: "GG-1", debtRows: 1 }] };
        const ms = { repeat: 2, rows: [{ groupKey: "g1", measuredLanding: "a", identity: "not-logged-in", markers: { ".m": "1" }, samples: S("a"), measuredAt: "x", band: "real@1" }] };
        const r = I.landingStatus(booked, ms)[0];
        return r.status === "MEASURED-UNSTABLE" && I.LANDING_UNCLOSED.includes("MEASURED-UNSTABLE") &&
          /^未结案/.test(r.statusText) && r.stability.stableDefect === "SHORT_SAMPLES";
      }],
    ["A10 landingStatus：n=2 一致且探针全中 ⇒ CLOSED（收紧没有把够数的行一起打死）",
      () => {
        const booked = { rows: [{ groupKey: "g1", landing: "a", landingMarker: ".m", registerEntry: null, guardCaseId: "GG-1", debtRows: 1 }] };
        const ms = { repeat: 2, rows: [{ groupKey: "g1", measuredLanding: "a", identity: "not-logged-in", markers: { ".m": "1" }, samples: S("a", "a"), measuredAt: "x", band: "real@1" }] };
        const r = I.landingStatus(booked, ms)[0];
        return r.status === "CLOSED" && /已结案/.test(r.statusText) && r.statusText.includes("n=2/repeat=2");
      }],
    /* 合成账本：稳定 2 行、样本不足 2 行、落点不一致 1 行、两者皆有 1 行 ⇒ 降级 4，分开计数 3 / 2。 */
    ["A11 stabilityAudit 把两类降级原因分开计数，且恒等式 降级=样本不足+落点不一致−两者皆有 当场成立",
      () => {
        const a = I.stabilityAudit(AUDIT_DOC);
        return a.rows === 6 && a.stable === 2 && a.degraded === 4 && a.shortSamples === 3 &&
          a.landingDisagree === 2 && a.both === 1 && a.degraded === a.shortSamples + a.landingDisagree - a.both;
      }],
    ["A12 stabilityAudit 具名到 guardCaseId（样本不足那份与落点不一致那份不是同一串名字）",
      () => {
        const a = I.stabilityAudit(AUDIT_DOC);
        const has = (list, ...ids) => ids.every((x) => list.includes(x)) && list.length === ids.length;
        return has(a.shortSampleIds, "GG-short-1", "GG-nosamples", "GG-both") &&
          has(a.landingDisagreeIds, "GG-disagree", "GG-both") &&
          has(a.stableIds, "GG-n2", "GG-n3");
      }],
    ["A13 报数行把两个数分开印出来（读的人一眼能分清「没测够」与「落点变了」）",
      () => {
        const ls = I.stabilityAuditLines(AUDIT_DOC);
        const head = ls.find((l) => l.startsWith("GUEST_LAND_STABILITY rows=")) || "";
        return /因样本数不足=3/.test(head) && /因落点不一致=2/.test(head) && /两者皆有=1/.test(head) &&
          ls.some((l) => l.startsWith("GUEST_LAND_STABILITY_SHORT") && l.includes("GG-short-1")) &&
          ls.some((l) => l.startsWith("GUEST_LAND_STABILITY_DISAGREE") && l.includes("GG-disagree"));
      }],
    ["A14 读取侧不信行内的 stable 字段：旧行写 stable=true 但只有 1 个样本 ⇒ 现算推翻并单独点名",
      () => {
        const a = I.stabilityAudit(AUDIT_DOC_STALE_FIELD);
        return a.degraded === 1 && a.fieldContradictions === 1 && a.stable === 0 &&
          a.fieldContradictionIds.join(",").includes("GG-short-1");
      }],
  ];
}
const AUDIT_ROWS = [
  { guardCaseId: "GG-n2", groupKey: "k2", measuredLanding: "a", identity: "not-logged-in", markers: {}, samples: S("a", "a"), stable: true, measuredAt: "x", band: "real@1" },
  { guardCaseId: "GG-n3", groupKey: "k3", measuredLanding: "a", identity: "not-logged-in", markers: {}, samples: S("a", "a", "a"), repeatDeclared: 3, stable: true, measuredAt: "x", band: "real@1" },
  { guardCaseId: "GG-short-1", groupKey: "ks", measuredLanding: "a", identity: "not-logged-in", markers: {}, samples: S("a"), stable: true, measuredAt: "x", band: "real@1" },
  { guardCaseId: "GG-nosamples", groupKey: "kn", measuredLanding: "a", identity: "not-logged-in", markers: {}, stable: true, measuredAt: "x", band: "real@1" },
  { guardCaseId: "GG-disagree", groupKey: "kd", measuredLanding: "a", identity: "not-logged-in", markers: {}, samples: S("a", "b"), stable: false, measuredAt: "x", band: "real@1" },
  { guardCaseId: "GG-both", groupKey: "kb", measuredLanding: "a", identity: "not-logged-in", markers: {}, samples: S("a", "b"), repeatDeclared: 3, stable: false, measuredAt: "x", band: "real@1" },
];
const AUDIT_DOC = { repeat: 2, rows: AUDIT_ROWS };
const AUDIT_DOC_STALE_FIELD = { repeat: 2, rows: [AUDIT_ROWS[2]] };

/* 一发实现 = 逐条求值；抛异常记成 {threw}（§35(1)：崩溃冒充反证一律不算红，要它带着读数红）。 */
function evaluate(impl) {
  return coreAssertions(impl).map(([name, fn]) => {
    try { return { name, pass: fn() === true, threw: false }; }
    catch (e) { return { name, pass: false, threw: true, err: String(e && e.message).slice(0, 80) }; }
  });
}

/* ══════════ 2. 现网实现：断言集必须全绿（这就是 fail 计数的来源） ══════════ */
const liveRes = evaluate(LIVE_IMPL);
for (const r of liveRes) t(r.name + (r.threw ? "（现网求值抛异常）" : ""), r.pass, r.threw ? r.err : undefined);

/* ══════════ 3. 最低样本数的取值优先级（合并账混批次的复核轴，现网实现） ══════════ */
{
  const I = LIVE_IMPL;
  t("最低样本数=min 之上取行内 repeatDeclared（合并账里每行记住自己那趟腿声明了几次）",
    I.requiredSamplesOf({ repeatDeclared: 3 }, { repeat: 2 }) === 3, "got=" + I.requiredSamplesOf({ repeatDeclared: 3 }, { repeat: 2 }));
  t("旧行没有 repeatDeclared ⇒ 退回台账顶层 repeat（那 17 行就是靠这条被现算推翻的）",
    I.requiredSamplesOf({}, { repeat: 2 }) === 2 && I.requiredSamplesOf({ repeatDeclared: 1 }, { repeat: 2 }) === 2,
    "doc.repeat 回退=" + I.requiredSamplesOf({}, { repeat: 2 }) + " 行内 1 也不放宽=" + I.requiredSamplesOf({ repeatDeclared: 1 }, { repeat: 2 }));
  t("行与账本都没声明 ⇒ 落到地板值 MIN_STABLE_SAMPLES（缺声明不许当成「无需第二次测量」）",
    I.MIN_STABLE_SAMPLES === 2 && I.requiredSamplesOf({}, {}) === 2 && I.requiredSamplesOf(null, null) === 2,
    "MIN=" + I.MIN_STABLE_SAMPLES);
  t("recomputeStability 拿 samples 现算，不看行里那个 stable 字段（字段与现算各记各的账）",
    (() => {
      const s = I.recomputeStability({ samples: S("a"), stable: true }, { repeat: 2 });
      return s.stable === false && s.recordedStable === true && s.fieldContradiction === true;
    })(), JSON.stringify(I.recomputeStability({ samples: S("a"), stable: true }, { repeat: 2 })).slice(0, 160));
  t("LANDING_UNCLOSED 是 5 态且含 MEASURED-UNSTABLE（少一位就说明降级行被放回闭环那一侧了）",
    LIVE_IMPL.LANDING_UNCLOSED.length === 5 && LIVE_IMPL.LANDING_UNCLOSED.includes("MEASURED-UNSTABLE"),
    LIVE_IMPL.LANDING_UNCLOSED.join(","));
}

/* ══════════ 4. 变异证明：把判据退回 size===1 的旧写法，只改 .zcode/tmp 下的替身 ══════════ */
const liveSrc = readFileSync(STATUS, "utf8");
const MUT_ANCHOR = "  const shortSamples = n < required;";
const MUT_REPLACE = "  const shortSamples = false; /* MUTANT §35(4) 旧写法：stable = distinct.length===1 ⇒ n=1 恒真 */";
const anchorHits = liveSrc.split(MUT_ANCHOR).length - 1;
t("变异锚点在活文件里恰好 1 处（多处或零处都说明这条负例量不到判据）", anchorHits === 1, "命中=" + anchorHits);
const mutantSrc = liveSrc.replace(MUT_ANCHOR, MUT_REPLACE);
t("替身与活文件确有差异且差异就是「取消样本数条件」（替身没改动 = 变异证明空转）",
  mutantSrc !== liveSrc && mutantSrc.includes(MUT_REPLACE) && !mutantSrc.includes(MUT_ANCHOR));
/* §35(1) 的形状：替身目录里缺相对依赖 ⇒ ERR_MODULE_NOT_FOUND ⇒ 整发自检读的是空气。
   guest-landing-status.mjs 是零 import 的纯模块，所以纯拷贝就够；这条断言把「以后有人给它加了
   相对 import」也一并拦住 —— 那时必须先搬依赖，否则本文件的变异证明就是假的。 */
t("替身可纯拷贝运行（本模块没有任何相对 import；一旦加了就必须先搬依赖再来跑变异）",
  !/from\s+["']\.\//.test(mutantSrc), "相对 import 命中=" + (/from\s+["']\.\//.test(mutantSrc)));
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
writeFileSync(MUTANT, mutantSrc, "utf8");
const norm = (p) => String(p).replace(/[\\/]/g, "/").replace(/\/+$/, "");
t("替身只落在 .zcode/tmp 夹具目录里（活文件路径不在被写的那条上）",
  existsSync(MUTANT) && norm(resolve(MUTANT)).startsWith(norm(TMP) + "/") &&
    norm(resolve(STATUS)) !== norm(resolve(MUTANT)), resolve(MUTANT));
t("活文件字节未因造替身而变（判据只从替身侧被篡改）", readFileSync(STATUS, "utf8") === liveSrc);

let mutant = null, loadErr = "";
try { mutant = await import(pathToFileURL(MUTANT).href); } catch (e) { loadErr = String(e && e.message).slice(0, 120); }
t("替身加载成功并【带着读数】参与求值（加载失败就当红：崩溃不是反证，见 §35(1)）", !!mutant, loadErr || "ok");

const mutRes = mutant ? evaluate(mutant) : [];
const mutRed = mutRes.filter((r) => !r.pass);
const mutThrew = mutRes.filter((r) => r.threw);
const KEY_ASSERTIONS = ["A1", "A2", "A7", "A9", "A11", "A12", "A13", "A14"];
const keyRed = mutRed.filter((r) => KEY_ASSERTIONS.some((k) => r.name.startsWith(k)));
t("变异证明：把判据退回 size===1 后，本文件那批断言里恰好有具名若干条变红（不是全部塌掉、更不是零条）",
  !!mutant && mutRed.length >= 4 && keyRed.length >= 4,
  "变红条数=" + mutRed.length + " 其中关键条=" + keyRed.length);
t("变异证明的红是【读数红】：替身求值一条异常都不许抛（抛了就是把崩溃当反证）",
  !!mutant && mutThrew.length === 0, "异常条数=" + mutThrew.length + (mutThrew[0] ? " 首个=" + mutThrew[0].err : ""));
t("变异下 A1/A7 这类「单样本」判据必然放行（旧判据恒真的直接后果，红必须来自这里）",
  !!mutant && mutant.judgeStability(S("a"), 2).stable === true && mutant.judgeStability(S("a"), 1).stable === true,
  mutant ? "mutant n=1/rep=2 stable=" + mutant.judgeStability(S("a"), 2).stable : "(替身未加载)");
t("变异下 n=2 一致仍判 stable（证明它没把整把尺砸掉，只拆了样本数那一半 —— 否则红得没有归因）",
  !!mutant && mutant.judgeStability(S("a", "a"), 2).stable === true &&
    mutant.judgeStability(S("a", "b"), 2).stable === false);
console.log("STABN_MUTANT red=" + mutRed.length + "/" + (mutant ? mutRes.length : 0) +
  " 关键条=" + keyRed.map((r) => r.name.split(" ")[0]).join(",") +
  " 异常=" + mutThrew.length + "｜现网红=" + liveRes.filter((r) => !r.pass).length);
t("现网与替身在同一断言集上的差只出现在样本数相关的那几条（落点不一致那一半两把尺都咬）",
  !!mutant && (() => {
    const l = LIVE_IMPL.judgeStability(S("a", "b"), 2), m = mutant.judgeStability(S("a", "b"), 2);
    return l.stable === false && m.stable === false && l.stableDefect === "LANDING_DISAGREE" && m.stableDefect === "LANDING_DISAGREE";
  })());

/* ══════════ 5. 真台账（只读）对账：收紧必须在真实证据上真的咬得住 ══════════ */
{
  let doc = null, err = "";
  try { doc = JSON.parse(readFileSync(LEDGER, "utf8")); } catch (e) { err = String(e && e.message).slice(0, 80); }
  t("权威台账读得到（只读；读不到就是夹具问题，不许假装对过账）", !!doc && Array.isArray(doc.rows) && doc.rows.length > 0, err || "rows=" + (doc && doc.rows ? doc.rows.length : "(无)"));
  if (doc) {
    const a = LIVE_IMPL.stabilityAudit(doc);
    const n1 = doc.rows.filter((r) => (r.samples || []).length < LIVE_IMPL.requiredSamplesOf(r, doc));
    const recTrue = doc.rows.filter((r) => r.stable === true).length;
    /* 这条从前还带一个 `a.landingDisagree === 0` 的等式 —— 那是**把某一批数据的形状钉成判据**：
       2026-09-30 补齐第二个样本之后真台账里出现了 1 行落点不一致（GG-campus-campus-index 两次落点不同），
       于是那条钉住的期望自己过期了（本仓已反复付过这个代价：门/测试点名一枚具体实体就会随数据变红）。
       现在只留恒等式 + 两个**独立复算**：样本不足数 == 行内 samples 短于要求的行数、
       落点不一致数 == 行内 stableDefect 含 LANDING_DISAGREE 的行数（各用一条与实现无关的数法）。 */
    t("真台账：降级 = 样本不足 + 落点不一致 − 两者皆有，且两类各自与独立复算相等（不钉任何一批的字面数）",
      a.degraded === a.shortSamples + a.landingDisagree - a.both && a.rows === doc.rows.length &&
        a.shortSamples === n1.length &&
        a.landingDisagree === doc.rows.filter((r) => String(r.stableDefect || "").split("+").includes("LANDING_DISAGREE")).length,
      "rows=" + a.rows + " 降级=" + a.degraded + " 样本不足=" + a.shortSamples + " 落点不一致=" + a.landingDisagree + " 两者皆有=" + a.both);
    /* 这一条钉的是 §35(4) 的病本身：旧字段说「全绿」而现算说「有降级」。
       日后若补拍了第二个样本（字段与现算重新一致），这一支会自然改去核「矛盾必须归零」，
       判据不靠钉死 17 这个快照数活着。 */
    t("真台账：行内 stable 字段与现算不一致的行必须被点名（空判据不许靠字段复活）",
      recTrue === doc.rows.length ? a.degraded > 0 && a.fieldContradictions === a.degraded : a.fieldContradictions === 0,
      "字段说 stable=true 的行=" + recTrue + "/" + doc.rows.length + " 现算降级=" + a.degraded + " 点名矛盾=" + a.fieldContradictions);
    console.log("STABN_REAL rows=" + a.rows + " 稳定=" + a.stable + " 降级=" + a.degraded +
      " 因样本数不足=" + a.shortSamples + " 因落点不一致=" + a.landingDisagree +
      " 顶层repeat=" + a.declaredRepeat + " 最低样本数=" + a.requiredSamples);
    t("真台账的具名报数行打得出来（17 个 guardCaseId 要能在读数里逐个数到）",
      (() => {
        const ls = LIVE_IMPL.stabilityAuditLines(doc);
        const short = ls.find((l) => l.startsWith("GUEST_LAND_STABILITY_SHORT")) || "";
        const named = short.split("行：")[1] ? short.split("行：")[1].trim().split(/\s+/).filter((x) => x.startsWith("GG-")).length : 0;
        return named === a.shortSamples;
      })(), "点名条数=" + ((LIVE_IMPL.stabilityAuditLines(doc).find((l) => l.startsWith("GUEST_LAND_STABILITY_SHORT")) || "").split("行：")[1] || "").trim().split(/\s+/).filter((x) => x.startsWith("GG-")).length);
  }
}

/* ══════════ 6. 收尾：替身不许留在盘上，两个只读文件必须一个 bit 都没动 ══════════ */
rmSync(TMP, { recursive: true, force: true });
t("一次性替身与夹具目录都已删除（.zcode/tmp/guest-stability-selftest 不在盘上）",
  !existsSync(MUTANT) && !existsSync(TMP));
t("判据活文件 sha256 与开跑前全等（变异只发生在替身里，活判据没被这个测试碰过）",
  sha(STATUS) === STATUS_START_SHA, "before=" + STATUS_START_SHA.slice(0, 12) + " after=" + sha(STATUS).slice(0, 12));
t("权威台账 sha256 与开跑前全等（本测试全程只读台账）",
  sha(LEDGER) === LEDGER_START_SHA, "before=" + LEDGER_START_SHA.slice(0, 12) + " after=" + sha(LEDGER).slice(0, 12));
console.log("STABN_READONLY 台账 start=" + LEDGER_START_SHA.slice(0, 12) + " end=" + sha(LEDGER).slice(0, 12) +
  " 判据活文件 start=" + STATUS_START_SHA.slice(0, 12) + " end=" + sha(STATUS).slice(0, 12));

console.log("\nSUMMARY: checks=" + checks + " assertion failures = " + fail);
console.log(fail ? "STABN_TEST=FAIL" : "STABN_TEST=PASS");
process.exit(fail ? 1 : 0);
