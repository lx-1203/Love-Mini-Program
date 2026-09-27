/* 游客落点三态判定：booked（复测腿已入账）+ measured（实测）合起来才是结论。
   单独成模块的原因：verify-guest-landing.mjs 主流程在导入时就会跑一遍（拿租约），
   triage 门禁只能 import 这个纯函数，不能顺手把模拟器的锁抢了。 */
export const LANDING_UNCLOSED = ["BOOKED", "MEASURED-DRIFT", "MEASURED-INVALID", "MEASURED-FAIL"];

export function landingStatus(booked, measured) {
  const mrows = Object.fromEntries(((measured && measured.rows) || []).map((r) => [r.groupKey, r]));
  return booked.rows.map((r) => {
    const m = mrows[r.groupKey];
    if (!m) return { ...r, status: "BOOKED", statusText: `未结案：复测腿 ${r.guardCaseId} 已入账未跑（覆盖 ${r.debtRows} 行）` };
    if (m.measuredLanding !== r.landing) return { ...r, status: "MEASURED-DRIFT", statusText: `未结案：实测落地 ${m.measuredLanding || "(空)"} ≠ 裁定 ${r.landing} ⇒ 落点变了，裁定重开` };
    if (m.identity !== "not-logged-in") return { ...r, status: "MEASURED-INVALID", statusText: `未结案：采样时身份不是游客（${m.identity}）⇒ 这条量的是别人的落点` };
    const miss = [];
    if (!m.markers || m.markers[r.landingMarker] !== "1") miss.push(`${r.landingMarker}=${(m.markers && m.markers[r.landingMarker]) || "?"}`);
    if (r.registerEntry && (!m.markers || m.markers[r.registerEntry] !== "1")) miss.push(`${r.registerEntry}=${(m.markers && m.markers[r.registerEntry]) || "?"}`);
    return miss.length
      ? { ...r, status: "MEASURED-FAIL", statusText: `未结案：复测腿已跑，判据不过（${miss.join(" ")}）⇒ 产品缺口，不许反过来改判据` }
      : { ...r, status: "CLOSED", statusText: `已结案：复测腿 ${r.guardCaseId} 实测符合裁定（${m.measuredAt}，档位 ${m.band || "?"}）` };
  });
}
