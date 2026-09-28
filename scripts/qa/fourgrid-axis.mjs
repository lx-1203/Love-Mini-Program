/* dist/src 四格「空集判红」的共享判据（fourgrid-axis）。
   为什么存在：这条红是"token 提取失灵"的保险丝——语料里有人声称"按目标查找且失败"，
   四格却一条都恢复不出来，那不是"没有失败"，是提取器坏了，绝不能印 0 当体检通过。
   round-6 时代这个声称只有 locate-label / locate-selector / locate-label-token-lost 三个桶会发；
   round-7 的 mock 刀改成 observe-only（不再写 element not found，failureReason 里没有查找句），
   同一个声称换了口径：observed 的 dom 结论 `.x:absent`（r-exec-ws.mjs:821 拼的那段）。
   所以判红条件必须同时认两套词汇，否则 round-7 形态的"提取失灵"会躲进 NOT_APPLICABLE 里静默。
   生产者（triage-exec-failures.mjs 给每行标 domAbsent）与消费者（emit-round-report.mjs 的 D 节）
   共用本模块，避免"第二份实现悄悄漂移"；行为测试见 scripts/qa/test-fourgrid-domextract.mjs。

   判据强度（不许为了变绿而动的部分）：
   - claims>0 且四格为空 ⇒ red（不是放宽，是"有账没核"）；
   - claims===0 ⇒ NOT_APPLICABLE（明确"没跑"，不是 PASS —— 措辞由消费者负责打印）；
   - 本函数永远不返回 "PASS"。 */

/** 旧（round-6）词表里的"定位类失败"桶计数。 */
export function legacyLocateBuckets(buckets = {}) {
  return (buckets["locate-label"] || 0) + (buckets["locate-selector"] || 0) + (buckets["locate-label-token-lost"] || 0);
}

/** 新（round-7 observe-only）词表里的"按目标查找且失败"声称：分诊条目上的 domAbsent 旗标。 */
export function domAbsentClaims(items = []) {
  return items.filter((it) => it && it.domAbsent === true).length;
}

/**
 * 四格空集分流。入参：{ fourCellTotal: 四格条数合计, buckets, items }。
 * 返回：{ red, notApplicable, locateBuckets, domAbsent, error? }
 */
export function fourGridEmptySetVerdict({ fourCellTotal = 0, buckets = {}, items = [] } = {}) {
  const locateBuckets = legacyLocateBuckets(buckets);
  const domAbsent = domAbsentClaims(items);
  const claims = locateBuckets + domAbsent;
  if (fourCellTotal === 0 && claims > 0) {
    return {
      red: true,
      notApplicable: false,
      locateBuckets,
      domAbsent,
      error: `空集判红：有 ${locateBuckets} 条定位类失败（round-6 执行器词表桶）+ ${domAbsent} 行 observe-only dom 结论答 absent（round-7 执行器词表），但 dist/src 四格 0 条 —— token 提取失灵，不能当作没有失败`,
    };
  }
  return { red: false, notApplicable: claims === 0 && fourCellTotal === 0, locateBuckets, domAbsent };
}
