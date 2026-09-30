#!/usr/bin/env node
/* DENY_TAP（交互禁触清单）的唯一来源。

   为什么要有这个文件（round-7 F-04，2026-09-30 授权）：这份词表原本在
   `r-exec-cli.mjs` 和 `r-exec-ws.mjs` 里各抄了一份**逐字相同**的正则，两条载具的安全边界
   可以各自漂移 —— 本仓对"第二份会漂移的副本"有明确反对先例（`change-verbs.cjs` 就是同类
   缺陷 §96.2 的收口载体）。现在两个消费者都只 require 本模块，词表不再有两份。

   ── 收窄规则（一句话，F-04 的授权条件就是这句）──────────────────────────────
   「清空」不再按词禁触，而是按**它自己的宾语**判：只有当这条判据的文本里就地指出了一个
   小程序文本输入控件（平台可打字组件的闭集 `<input>` / `<textarea>`，或把类名绑回控件的
   `v-model=`），并且「清空」的宾语就是那个控件本身（`清空 .reply-input`）或那个控件里的
   内容（`检查内容是否清空`）时，才认为它清的是输入框 ⇒ 放行；宾语是存储/会话/历史/数据源
   （`清空 storage`、`清空历史`）或「清空」本身就是被 tap 的确认按钮（`tap 确认清空`）时，
   它仍是账号级不可逆动作 ⇒ 照旧禁触。默认值是禁触：证明不了宾语是字段的，一律拦。
   ────────────────────────────────────────────────────────────────────────
   这是**收窄不是放宽**：放行只发生在这条判据自己指明了文本控件的那几行，其余词条
   （注销/解绑/删除账号/删除帐号/退出登录/登出）一个字都没动，也不引入"清空"的关键词豁免。

   谁消费：r-exec-cli.mjs（--tap 刀，命中记 SKIPPED + "交互禁触…"）、
           r-exec-ws.mjs（WS 交互腿，命中记 bucket=tapDeny）。
   行为负例：scripts/qa/test-deny-tap-field-clear.cjs —— 双向都验：误拦的两行现在放行、
           账号级清空在**故意放宽的反例（mutant）**下必须变红。 */
"use strict";

/* 原词表逐字（`/注销|解绑|清空|删除账号|删除帐号|退出登录|登出/`）拆成两部分：
   除「清空」外的词条按词禁触，一字未改；「清空」交给下面的宾语判定。 */
var ALWAYS_DENY_WORDS = ["注销", "解绑", "删除账号", "删除帐号", "退出登录", "登出"];

/* 文本控件的证据。刻意**不**认 `.reply-input` / `.search-input` 这类类名片段里的
   "input" —— 那等于给任意选择器名发豁免；只认组件标签本体、裸组件名，以及把类名绑回
   控件的 v-model= 写法。 */
var FIELD_PROOF = /<\s*(?:input|textarea)\b|(?<![-.\w])textarea(?![\w-])|(?<![-.\w])input(?![\w-])\s*[（(]|v-model\s*=/i;

/* 「清空 X」：X 是一个元素引用（选择器），需要再被 FIELD_PROOF 就地绑实才算字段。 */
var CLEAR_OBJECT_IS_SELECTOR = /清空\s*([.#][A-Za-z][\w-]*)/g;

/* 「检查内容是否清空」：宾语是那个控件里的内容，不是某个存储。 */
var CLEAR_OBJECT_IS_FIELD_CONTENT = /内容[^。；]{0,6}是否[^。；]{0,6}清空|是否[^。；]{0,6}清空[^。；]{0,10}内容/;

/* 反向否决：宾语是持久化范围 ⇒ 无论同一段文字里还有没有输入框，都按账号级拦。 */
var PERSISTENCE_OBJECT = /清空\s*(?:的\s*)?(?:storage|localStorage|sessionStorage|缓存|会话|token|登录态|历史|数据源|数据库|数据|账号|帐号|草稿箱)|清空\s*(storage|缓存|会话)/i;

/* 反向否决：「清空」本身就是被点的那个控件（确认清空按钮 /「清空历史」按钮）。 */
var CLEAR_IS_THE_TAPPED_CONTROL = /(?:tap|点|点击|按)[^。；]{0,6}(?:确认|确定)?\s*清空|「[^」]{0,8}清空/;

function hasFieldProof(s) {
  return FIELD_PROOF.test(s);
}

/* 该选择器在本判据里是否被就地绑到了文本控件：取它每次出现往后到子句边界的那一段来验，
   验的就是原文，不做任何转译（TD03 原文：`.reply-input（topic-detail.vue 的 <input>，
   v-model=replyContent :414 …）`）。 */
function selectorBoundToField(s, sel) {
  var esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var re = new RegExp(esc, "g");
  var m;
  while ((m = re.exec(s)) !== null) {
    var rest = s.slice(m.index);
    var stop = rest.search(/[。；]/);
    var span = stop < 0 ? rest : rest.slice(0, stop);
    if (hasFieldProof(span)) return true;
  }
  return false;
}

/* 这条 action 里的「清空」是不是"清一个输入框"。默认 false（证明不了就拦）。 */
function clearsAtextField(action) {
  var s = String(action || "");
  if (!/清空/.test(s)) return false;
  if (PERSISTENCE_OBJECT.test(s)) return false;
  if (CLEAR_IS_THE_TAPPED_CONTROL.test(s)) return false;
  if (!hasFieldProof(s)) return false;
  /* 用 matchAll 取**捕获组**：String.match 配 /g 只会回整段命中（"清空 .reply-input"），
     拿它当选择器去回查绑定证据必然落空 —— 这就是本函数首版把 TD03 误留在禁触侧的原因。 */
  for (const mm of s.matchAll(CLEAR_OBJECT_IS_SELECTOR)) {
    if (selectorBoundToField(s, mm[1])) return true;
  }
  return CLEAR_OBJECT_IS_FIELD_CONTENT.test(s);
}

/* 载具用这一个入口。返回命中词（"" = 可以下发交互）。 */
function denyTapMatch(action) {
  var s = String(action || "");
  for (var i = 0; i < ALWAYS_DENY_WORDS.length; i++) {
    if (s.indexOf(ALWAYS_DENY_WORDS[i]) >= 0) return ALWAYS_DENY_WORDS[i];
  }
  if (s.indexOf("清空") < 0) return "";
  return clearsAtextField(s) ? "" : "清空";
}

function deniesTap(action) {
  return denyTapMatch(action) !== "";
}

module.exports = {
  ALWAYS_DENY_WORDS: ALWAYS_DENY_WORDS,
  denyTapMatch: denyTapMatch,
  deniesTap: deniesTap,
  clearsAtextField: clearsAtextField
};
