/* reMemberPath 行为测试：eval 工具里的真函数，用产物里的真实一串做正例。 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(REPO, "scripts", "qa", "verify-fixes-against-artifact.cjs"), "utf8");
const a = SRC.indexOf("function esc(s)");
const b = SRC.indexOf("/** CSS 变量");
if (a < 0 || b < 0 || b <= a) { console.log("RMP_TEST=FAIL reason=取不到函数片段"); process.exit(2); }
const fns = new Function(SRC.slice(a, b) + "; return {reIdent: reIdent, reMemberPath: reMemberPath};")();

const ART = "K:e.unref(o.IMAGE_PATHS).ICONS_V2.MORE_SVG,L:e.unref(o.IMAGE_P";
const SOURCE = '<image class="feed-more" :src="IMAGE_PATHS.ICONS_V2.MORE_SVG" mode="aspectFit" />';
const NEG_ORDER = "MORE_SVG then later IMAGE_PATHS.ICONS_V2 nothing";
const NEG_PARTIAL = "IMAGE_PATHS.SOMETHING_ELSE.MORE_SVG";
const PLAIN = "class=\"hero-actions-right\" 和 submit-text";

const cases = [
  { name: "产物打包形式命中", tok: "IMAGE_PATHS.ICONS_V2.MORE_SVG", text: ART, expect: true },
  { name: "源码点号链命中", tok: "IMAGE_PATHS.ICONS_V2.MORE_SVG", text: SOURCE, expect: true },
  { name: "顺序颠倒不得命中", tok: "IMAGE_PATHS.ICONS_V2.MORE_SVG", text: NEG_ORDER, expect: false },
  { name: "中间段不同不得命中", tok: "IMAGE_PATHS.ICONS_V2.MORE_SVG", text: NEG_PARTIAL, expect: false },
  { name: "无点号 token 仍走成词匹配", tok: "hero-actions-right", text: PLAIN, expect: true },
  { name: "无点号 token 不吃 padding 这种贴边", tok: "id", text: "padding valid", expect: false },
  { name: "段间超过 14 字符不吃", tok: "IMAGE_PATHS.ICONS_V2.MORE_SVG", text: "IMAGE_PATHS" + new Array(20).join("x") + ".ICONS_V2.MORE_SVG", expect: false },
  { name: "点号但段非标识符→退回整串", tok: "a.b c.d", text: "xx a.b c.d yy", expect: true },
];

let fail = 0;
for (const c of cases) {
  const re = fns.reIdent(c.tok);
  const got = re.test(c.text);
  const ok = got === c.expect;
  if (!ok) fail++;
  console.log("RMP " + (ok ? "OK  " : "FAIL") + " " + c.name + " expect=" + c.expect + " got=" + got + " re=" + String(re));
}
console.log("RMP_SUMMARY total=" + cases.length + " fail=" + fail);
console.log("RMP_TEST=" + (fail ? "FAIL" : "PASS"));
process.exit(fail ? 2 : 0);
