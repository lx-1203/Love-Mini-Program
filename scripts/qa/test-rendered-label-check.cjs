/* renderedLabelCheck 行为测试：直接 eval 执行器里的真函数，不复制实现。
   判据有三条：
   1) 文案真在渲染树里 → verdict=yes；
   2) 文案不在 → verdict=no，且只花 1 次 page.$ + 1 次 wxml()，绝不碰 $$/text()（这就是省掉的 400 次往返）；
   3) 抓到的子树看起来不像页面根 → verdict=unknown，调用方必须退回旧的逐节点扫描，
      不允许把"探针没抓到根"说成"产品上没有"。 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(REPO, "scripts", "qa", "r-exec.cjs"), "utf8");
const start = SRC.indexOf("async function renderedLabelCheck");
const end = SRC.indexOf("async function deepResolveLabel");
if (start < 0 || end < 0 || end <= start) {
  console.log("RLC_TEST=FAIL reason=取不到函数源码 start=" + start + " end=" + end);
  process.exit(2);
}
const body = SRC.slice(start, end);
let renderedLabelCheck;
try {
  renderedLabelCheck = new Function("return (" + body + ")")();
} catch (e) {
  console.log("RLC_TEST=FAIL reason=函数切片无法解析 err=" + e.message);
  process.exit(2);
}

const WXML = path.join(REPO, "reports", "screenshots", "round-6-interact", "wxml");
function stubPage(file, opts) {
  const calls = { dollar: 0, wxml: 0, dollars: 0, text: 0 };
  let w = "";
  try { w = fs.readFileSync(path.join(WXML, file), "utf8"); } catch (e) { w = null; }
  if (opts && opts.truncate) w = w.slice(0, opts.truncate);
  const page = {
    $: async function (sel) {
      calls.dollar++;
      if (w == null) throw new Error("no-file");
      return { wxml: async function () { calls.wxml++; return w; } };
    },
    $$: async function () { calls.dollars++; return []; },
  };
  return { page: page, calls: calls, w: w };
}

const results = [];
function check(name, expect, file, label, opts) {
  const s = stubPage(file, opts);
  return renderedLabelCheck(s.page, label).then(function (r) {
    const okVerdict = r.verdict === expect;
    const okCalls = expect === "no" || expect === "yes"
      ? (s.calls.dollar === 1 && s.calls.wxml === 1 && s.calls.dollars === 0)
      : (s.calls.dollars === 0);
    results.push({ name: name, expect: expect, got: r.verdict, reason: r.reason || ("len=" + r.len + "/cls=" + r.classes), calls: s.calls, ok: okVerdict && okCalls });
  });
}

const PT = "SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-PT03-after.wxml";
const VP = "SUBPACKAGES-VILLAGE-VILLAGE-TAG-POSTS-TP04-after.wxml";

Promise.all([
  check("发布在 post-topic 渲染树里→yes", "yes", PT, "发布"),
  check("跨节点+空格文案→yes", "yes", VP, "圈子"),
  check("页面真没有的文案→no", "no", VP, "确定要删除这条动态吗zzz"),
  check("带空格的标签走空白归一→yes/no 一致", "no", VP, "不成 能的文案 zz"),
  check("根子树太小→unknown（不许据此判没有）", "unknown", VP, "圈子", { truncate: 400 }),
  check("wxml 抛错→unknown", "unknown", "NO-SUCH-FILE.wxml", "圈子"),
  check("空 label→unknown", "unknown", VP, "   "),
  check("含实体字符的 label→unknown", "unknown", VP, "a&amp;b"),
]).then(function () {
  let fail = 0;
  results.forEach(function (x) {
    if (!x.ok) fail++;
    console.log("RLC " + (x.ok ? "OK  " : "FAIL") + " " + x.name + " expect=" + x.expect + " got=" + x.got + " " + x.reason + " calls=" + JSON.stringify(x.calls));
  });
  const sum = { yes: 0, no: 0, unknown: 0 };
  results.forEach((x) => { sum[x.got] = (sum[x.got] || 0) + 1; });
  console.log("RLC_SUMMARY total=" + results.length + " fail=" + fail + " verdicts=" + JSON.stringify(sum));
  console.log("RLC_TEST=" + (fail ? "FAIL" : "PASS"));
  process.exit(fail ? 2 : 0);
});
