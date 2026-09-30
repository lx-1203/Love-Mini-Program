/* 游客落点三态判定：booked（复测腿已入账）+ measured（实测）合起来才是结论。
   单独成模块的原因：verify-guest-landing.mjs 主流程在导入时就会跑一遍（拿租约），
   triage 门禁只能 import 这个纯函数，不能顺手把模拟器的锁抢了。

   2026-10-01 §35(4) 收紧落点稳定性判据（判据缺陷按判据修）：
   旧判据 `new Set(samples.map(s=>s.landing)).size===1` 在 n=1 时恒为真 —— 一条没有第二次测量的腿
   在账本里写着 `stable=true`，等于把"没测过"记成"测过且稳定"。本文件是这条判据的**唯一实现**：
   载具（measure 写行）与所有下游（landingStatus 的结案判定、具名报数）都从这里取，
   不许再在别处落第二份会漂移的副本（同 measured-ledger.mjs 的接线纪律）。
   生效的最低样本数 = max(MIN_STABLE_SAMPLES, 声明的 repeat)：只写 `n >= repeat` 的话，
   一条 `--repeat 1` 的腿仍然自证清白（n=1>=1 ⇒ 空判据原地复活），所以地板值 2 是这条判据的一部分。 */
export const LANDING_UNCLOSED = ["BOOKED", "MEASURED-DRIFT", "MEASURED-INVALID", "MEASURED-UNSTABLE", "MEASURED-FAIL"];

/* ---------- 落点稳定性判据（纯函数、零 IO）---------- */

/** 单样本永远证不了"稳定"：地板值写死成字段，调用方与读账本的人都据此复核，不靠注释。 */
export const MIN_STABLE_SAMPLES = 2;
/** 降级原因的两类机器码（本仓裁定：判据的前提要落在字段里，不是散文里）。 */
export const STABLE_DEFECT = { SHORT_SAMPLES: "SHORT_SAMPLES", LANDING_DISAGREE: "LANDING_DISAGREE" };

/** 这一行要求的最低样本数：行内自述的 repeatDeclared 优先（合并账必然混批次，行内值才是那趟腿的声明），
 *  缺字段（收紧之前写的旧行）退回台账顶层 repeat，再缺就退回地板值；三者都过 max(地板, 值)。 */
export function requiredSamplesOf(row, doc) {
  const declared = [row && row.repeatDeclared, row && row.repeat, doc && doc.repeat]
    .map((x) => Number(x)).find((x) => Number.isFinite(x) && x > 0);
  return Math.max(MIN_STABLE_SAMPLES, declared === undefined ? MIN_STABLE_SAMPLES : declared);
}

/** 判据本身：n 个样本要满足"够数"且"全一致"才算稳定。
 *  @returns 机器可读字段（stable / stableBasis / stableWhy / stableSamples / stableRequiredSamples /
 *            stableDeclaredRepeat / stableDefect），载具把它们逐字写进台账行。 */
export function judgeStability(samples, repeat) {
  const list = Array.isArray(samples) ? samples : [];
  const required = Math.max(MIN_STABLE_SAMPLES, Number(repeat) > 0 ? Number(repeat) : MIN_STABLE_SAMPLES);
  const n = list.length;
  const landings = list.map((s) => String((s && s.landing) || ""));
  const distinct = [...new Set(landings)];
  const shortSamples = n < required;
  const disagree = distinct.length > 1;
  const codes = [shortSamples && STABLE_DEFECT.SHORT_SAMPLES, disagree && STABLE_DEFECT.LANDING_DISAGREE].filter(Boolean);
  const basis = "n=" + n + "/repeat=" + required;
  if (!codes.length) return { stable: true, stableBasis: basis, stableWhy: null, stableSamples: n, stableRequiredSamples: required, stableDeclaredRepeat: Number(repeat) || null, stableDefect: null, landings: distinct };
  const why = shortSamples
    /* 样本数不够时**不许**把话说成"落点一致"：n=1 的落点无从比对，唯一诚实的说法是"没测够"。
       落点同时也不一致的话，两个原因都写出来（降级原因的归类靠字段，不靠句式）。 */
    ? (disagree
      ? "样本数不足（n=" + n + " < repeat=" + required + "）且落点不一致（" + distinct.join(" | ") + "）"
      : "单样本，未达 repeat=" + required + "（n=" + n + "）⇒ 没有第二次测量，稳定性未成立")
    : "落点不一致（" + distinct.join(" | ") + "）";
  return { stable: false, stableBasis: basis, stableWhy: why, stableSamples: n, stableRequiredSamples: required, stableDeclaredRepeat: Number(repeat) || null, stableDefect: codes.join("+"), landings: distinct };
}

/** 读账本时的复核口径：拿行内 samples 现算，**不信**行里那个旧的 `stable` 字段
 *  （17 行旧行正是被那个字段冒充成"稳定"的）。字段与现算不符时单独点名，不合并计数。 */
export function recomputeStability(row, doc) {
  const j = judgeStability(row && row.samples, requiredSamplesOf(row, doc));
  const recorded = row && typeof row.stable === "boolean" ? row.stable : null;
  return { ...j, recordedStable: recorded, fieldContradiction: recorded !== null && recorded !== j.stable };
}

/** 全账本的稳定性对账：两类降级原因**分开计数**，并给出可复核的恒等式
 *  （降级 = 样本数不足 + 落点不一致 − 两者皆有）。具名到 guardCaseId，不是一句"都降级了"。 */
export function stabilityAudit(measured) {
  const rows = ((measured && measured.rows) || []);
  const out = {
    rows: rows.length, stable: 0, degraded: 0,
    shortSamples: 0, landingDisagree: 0, both: 0, noSamplesArray: 0, fieldContradictions: 0,
    declaredRepeat: Number(measured && measured.repeat) || null,
    requiredSamples: null,
    stableIds: [], shortSampleIds: [], landingDisagreeIds: [], bothIds: [], fieldContradictionIds: [],
    perRow: [],
  };
  const reqs = new Set();
  for (const r of rows) {
    const s = recomputeStability(r, measured);
    if (!Array.isArray(r && r.samples)) out.noSamplesArray++;
    reqs.add(s.stableRequiredSamples);
    const short = s.stableDefect && s.stableDefect.includes(STABLE_DEFECT.SHORT_SAMPLES);
    const disagree = s.stableDefect && s.stableDefect.includes(STABLE_DEFECT.LANDING_DISAGREE);
    if (s.stable) { out.stable++; out.stableIds.push(r.guardCaseId); }
    else {
      out.degraded++;
      if (short) { out.shortSamples++; out.shortSampleIds.push(r.guardCaseId); }
      if (disagree) { out.landingDisagree++; out.landingDisagreeIds.push(r.guardCaseId); }
      if (short && disagree) { out.both++; out.bothIds.push(r.guardCaseId); }
    }
    if (s.fieldContradiction) { out.fieldContradictions++; out.fieldContradictionIds.push(r.guardCaseId + "(账本写 stable=" + s.recordedStable + " 现算 " + s.stable + ")"); }
    out.perRow.push({ guardCaseId: r.guardCaseId, groupKey: r.groupKey, stable: s.stable, stableBasis: s.stableBasis, stableWhy: s.stableWhy, stableDefect: s.stableDefect, recordedStable: s.recordedStable, measuredAt: r.measuredAt, band: r.band });
  }
  out.requiredSamples = reqs.size === 1 ? [...reqs][0] : [...reqs].sort((a, b) => a - b).join("/");
  return out;
}

/** 具名报数行：让人一眼看出"多少行是因为样本数不够而降级，而不是因为落点不一致"。
 *  两类必须分开计数，且恒等式当场写出来 —— 否则"降级 17 行"读起来像落点变了 17 次。 */
export function stabilityAuditLines(measured) {
  const a = stabilityAudit(measured);
  const ids = (list) => (list.length ? list.join(" ") : "（无）");
  return [
    `GUEST_LAND_STABILITY rows=${a.rows} 稳定=${a.stable} 降级=${a.degraded}｜因样本数不足=${a.shortSamples} 因落点不一致=${a.landingDisagree} 两者皆有=${a.both}｜恒等式 降级=样本不足+落点不一致−两者=${a.shortSamples}+${a.landingDisagree}-${a.both}=${a.shortSamples + a.landingDisagree - a.both}`
    + `｜最低样本数=max(${MIN_STABLE_SAMPLES},声明repeat=${a.declaredRepeat})=${a.requiredSamples}`,
    `GUEST_LAND_STABILITY_SHORT 样本数不足=${a.shortSamples} 行：${ids(a.shortSampleIds)}`,
    `GUEST_LAND_STABILITY_DISAGREE 落点不一致=${a.landingDisagree} 行：${ids(a.landingDisagreeIds)}`,
    `GUEST_LAND_STABILITY_FIELD 行内 stable 字段与现算矛盾=${a.fieldContradictions} 行（收紧前那趟腿留下的 stable=true 不作证据）：${ids(a.fieldContradictionIds)}`,
  ];
}

export function landingStatus(booked, measured) {
  const mrows = Object.fromEntries(((measured && measured.rows) || []).map((r) => [r.groupKey, r]));
  return booked.rows.map((r) => {
    const m = mrows[r.groupKey];
    if (!m) return { ...r, status: "BOOKED", statusText: `未结案：复测腿 ${r.guardCaseId} 已入账未跑（覆盖 ${r.debtRows} 行）` };
    if (m.measuredLanding !== r.landing) return { ...r, status: "MEASURED-DRIFT", statusText: `未结案：实测落地 ${m.measuredLanding || "(空)"} ≠ 裁定 ${r.landing} ⇒ 落点变了，裁定重开` };
    if (m.identity !== "not-logged-in") return { ...r, status: "MEASURED-INVALID", statusText: `未结案：采样时身份不是游客（${m.identity}）⇒ 这条量的是别人的落点` };
    /* 稳定性排在探针之前判：n<最低样本数时，这条行连"落点是什么"都只有一只眼睛看过，
       让探针的读数替它背书 = 把"没测够"折成"测过了"。降级行仍单独具名计数，不并进探针缺口。 */
    const stab = recomputeStability(m, measured);
    if (!stab.stable) return { ...r, status: "MEASURED-UNSTABLE", stability: stab, statusText: `未结案：落点稳定性未成立（${stab.stableBasis}｜${stab.stableDefect}｜${stab.stableWhy}）⇒ 这一格的"稳定"没有 ${stab.stableRequiredSamples} 次测量支撑，补齐第二个样本要重拍腿（另事、需授权），拿它当已结案就是把单样本当证据` };
    const miss = [];
    if (!m.markers || m.markers[r.landingMarker] !== "1") miss.push(`${r.landingMarker}=${(m.markers && m.markers[r.landingMarker]) || "?"}`);
    if (r.registerEntry && (!m.markers || m.markers[r.registerEntry] !== "1")) miss.push(`${r.registerEntry}=${(m.markers && m.markers[r.registerEntry]) || "?"}`);
    return miss.length
      ? { ...r, status: "MEASURED-FAIL", statusText: `未结案：复测腿已跑，判据不过（${miss.join(" ")}）⇒ 产品缺口，不许反过来改判据` }
      : { ...r, status: "CLOSED", statusText: `已结案：复测腿 ${r.guardCaseId} 实测符合裁定（${m.measuredAt}，档位 ${m.band || "?"}，${stab.stableBasis}）` };
  });
}
