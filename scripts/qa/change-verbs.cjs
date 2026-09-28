#!/usr/bin/env node
/* 变更动词词表的唯一来源（round7-NOTES §96.2 的载体缺陷收口）。
   背景：判据台 `clausesOf` 先按 [。；;\\n] 切句，再按变更动词（firstVerbIndex 的那串词）把子句
   剪成 pre｜post，只有 post 侧被挖矿成判点；而归一化器 normalize-bracket-spans.mjs 只建模
   「。；，、： 会把壳劈开」，不建模"变更动词切句"——于是**壳里只要含这类词就会被从中间剪断**，
   半只壳（未闭合的 ⟨）按"到句尾都算说明"把它后面的真判点全部吞掉（§96.2 实测：`删除`→`移除`
   剪断点跟着词走，normalize 报 spans-with-delimiter=0 检不出来）。当时的处置是人肉把壳改成纯
   名词短语，并留待办："应在台子里把'壳内含变更动词'做成显式告警，而不是靠人肉换词"。
   本模块就是那条待办的载体：切句器与告警共用同一份数组——建模不一致这个缺陷类别本身被禁止复发，
   词表不需要人拍板（它就是盘上现存的 firstVerbIndex 数组，逐字搬来，不新增不删除）。
   谁消费：verify-fixes-against-artifact.cjs（firstVerbIndex 从这里拿）、
   normalize-bracket-spans.mjs（spans-with-change-verb 计数）、
   scripts/qa/test-change-verb-spans.cjs（行为负例）。 */

/* 逐字来自 verify-fixes-against-artifact.cjs 原 firstVerbIndex 的 verbs 数组（搬移，未改写）。
   顺序敏感项无——firstVerbIndex 取的是"最早命中"，与数组顺序无关。 */
var CHANGE_VERBS = ["改为", "改成", "改用", "改走", "统一走", "统一为", "替换为", "替换成", "换为", "换成", "补上", "补", "新增", "加上", "删掉", "删除", "移除", "去掉", "下掉", "不再使用", "不再保留", "使用", "应", "需", "走", "改"];

/* 剪断点定位：逐字来自原 firstVerbIndex（含"前面是 ASCII 字母则跳过"的边界规则）。
   返回 { at, head, verb }（at=post 侧起点，head=动词起点）或 null。 */
function firstVerbIndex(s) {
  var verbs = CHANGE_VERBS;
  var best = null;
  for (var i = 0; i < verbs.length; i++) {
    var v = verbs[i], from = 0;
    while (true) {
      var k = String(s).indexOf(v, from);
      if (k < 0) break;
      var before = k === 0 ? "" : String(s).charAt(k - 1);
      if (!/[A-Za-z]/.test(before)) { if (!best || k < best.at) best = { at: k, head: k, verb: v }; break; }
      from = k + 1;
    }
  }
  if (!best) return null;
  return { at: best.at + best.verb.length, head: best.head, verb: best.verb };
}

/* 一段文字会不会被切句器在动词处剪断（给"壳内含变更动词"告警用的同一把尺）。 */
function containsChangeVerb(text) {
  return firstVerbIndex(String(text || ""));
}

/* 台账一行里的 ⟨…⟩ 壳（含未闭合壳——它正是会被剪成半只的那种）。返回内含变更动词的壳内容样本。 */
function verbStraddlingSpans(lineText) {
  var hits = [];
  var re = /⟨([^⟩]*)⟩?/g, m;
  while ((m = re.exec(String(lineText || "")))) {
    if (!m[1]) continue;
    var v = containsChangeVerb(m[1]);
    if (v) hits.push({ inner: m[1], verb: v.verb, closed: String(lineText).charAt(m.index + m[0].length - 1) === "⟩" });
  }
  return hits;
}

module.exports = { CHANGE_VERBS, firstVerbIndex, containsChangeVerb, verbStraddlingSpans };
