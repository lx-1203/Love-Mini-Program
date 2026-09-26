/* states-verdict.mjs 的四象限判决自检。
 * 为什么要有：这个纯函数决定每一行是"产品结论"还是"取景器的错"。判错方向的代价不对称 ——
 * 把"探针坏了"读成"节点没出现"会凭空造出一条产品缺陷（本仓为这类假缺陷返工过多次），
 * 所以判决顺序本身就是被测对象，不只是各个分支。
 * 每条正例都配"能判出差别"的反例（同输入只动一个事实，判决必须变），避免写成永不变的常量函数。
 * 用法：node scripts/qa/test-states-verdict.cjs
 */
let fail = 0, cases = 0;
const ok = (cond, label, detail) => {
  cases++;
  if (cond) console.log(`  ok   ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? "  «" + detail + "»" : ""}`); }
};

(async () => {
  const mod = await import("../qa/states-verdict.mjs").catch((e) => { console.log("IMPORT_FAIL " + e.message); process.exit(1); });
  const C = mod.classifyStateVerdict;
  ok(typeof C === "function", "classifier 是函数（import 真成功）", "typeof=" + typeof C);
  ok(typeof mod.VERDICT_IS_PRODUCT_SIGNAL === "function", "第二导出也在");

  const base = { preProbe: "0", postProbe: "0", preHash: "aaaa", postHash: "bbbb", tapMismatch: false, tapRes: "ok", tooSmall: false };
  const V = (over) => C(Object.assign({}, base, over));

  ok(V({ preHash: "x", postHash: "x", postProbe: "1" }) === "APPEARED_NOPIXEL", "节点出现 + 像素不变 ⇒ APPEARED_NOPIXEL", V({ preHash: "x", postHash: "x", postProbe: "1" }));
  ok(V({ postProbe: "1" }) === "APPEARED", "节点出现 + 像素变了 ⇒ APPEARED（反例只改哈希，判决必须变）", V({ postProbe: "1" }));
  ok(V({ preHash: "x", postHash: "x" }) === "NOCHANGE", "节点没出现 + 像素不变 ⇒ NOCHANGE", V({ preHash: "x", postHash: "x" }));
  ok(V({}) === "CHANGED_BUT_NO_NODE", "像素变了但节点没出现 ⇒ CHANGED_BUT_NO_NODE", V({}));
  ok(V({ preProbe: "1" }) === "WAS_THERE", "动作前节点就在 ⇒ WAS_THERE（默认态不干净）", V({ preProbe: "1" }));

  // 取景器的错必须**优先于**产品结论：每条都挑一个"否则会被读成产品缺陷"的输入
  ok(V({ tapMismatch: true, postProbe: "1" }) === "HARNESS_MISS", "点错控件优先于 APPEARED", V({ tapMismatch: true, postProbe: "1" }));
  ok(V({ tapMismatch: true, preProbe: "0", postProbe: "0", preHash: "x", postHash: "x" }) === "HARNESS_MISS", "点错控件优先于 NOCHANGE（防造假缺陷）", V({ tapMismatch: true, preProbe: "0", postProbe: "0", preHash: "x", postHash: "x" }));
  ok(V({ postProbe: "ERR:boom" }) === "PROBE_ERR", "探针报错不得折叠成 0", V({ postProbe: "ERR:boom" }));
  ok(V({ preProbe: "ERR:boom" }) === "PROBE_ERR", "前帧探针报错同样优先", V({ preProbe: "ERR:boom" }));
  ok(V({ tapRes: "TAP_ERR timeout" }) === "PROBE_ERR", "tap 自己失败 ⇒ PROBE_ERR", V({ tapRes: "TAP_ERR timeout" }));
  ok(V({ tooSmall: true, postProbe: "1" }) === "PROBE_ERR", "帧 <3000B 不算证据", V({ tooSmall: true, postProbe: "1" }));
  ok(V({ postHash: null }) === "PROBE_ERR", "缺后帧哈希 ⇒ 无从判断像素是否变化，记 PROBE_ERR", V({ postHash: null }));
  ok(V({ preHash: null }) === "PROBE_ERR", "缺前帧哈希同上");

  // 探针未知 ≠ 不存在：route/节点探针对空返回都应该是 ERR 而不是 0（这是 real 取景时踩过的形状）
  ok(V({ postProbe: "" }) === "PROBE_ERR", "空串探针结果按测量失败处理", V({ postProbe: "" }));

  ok(mod.VERDICT_IS_PRODUCT_SIGNAL("APPEARED") === true && mod.VERDICT_IS_PRODUCT_SIGNAL("HARNESS_MISS") === false,
    "产品/取景器两类的归类标志正确");
  ok(mod.VERDICT_IS_PRODUCT_SIGNAL("PROBE_ERR") === false, "PROBE_ERR 不进产品账");

  console.log(`STV_SUMMARY cases=${cases} fail=${fail}`);
  console.log(`STV_TEST=${fail ? "FAIL" : "PASS"}`);
  process.exit(fail ? 1 : 0);
})();
