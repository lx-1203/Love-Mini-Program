/**
 * G9 取证（只读）：按 v3.2 的定义，从 apps/client/src/config/images.ts 抽取 IMAGE_PATHS 全量常量，
 * 拼 real 基址逐个 GET，报告 抽取/探得/跳过/404。抽取为 0 视为解析失败，不是通过。
 */
const fs = require("fs");
const http = require("http");
const SRC = "apps/client/src/config/images.ts";
const BASE = "http://127.0.0.1:8080/api/v1/media/app-assets";

const text = fs.readFileSync(SRC, "utf8");
// 锚在真正的导出语句上：全文第一处 "IMAGE_PATHS" 是文件头注释里的 import 示例，
// 用它会把注释里的 "{ IMAGE_PATHS }" 当成对象体，抽出 0 条（本轮实测踩过）。
const block = (() => {
  const m = /export\s+const\s+IMAGE_PATHS\s*=\s*\{/.exec(text);
  if (!m) return "";
  const s = m.index + m[0].length - 1;
  let d = 0, j = s;
  for (; j < text.length; j++) {
    if (text[j] === "{") d++;
    else if (text[j] === "}") { d--; if (d === 0) break; }
  }
  return text.slice(s, j + 1);
})();
const literals = [...block.matchAll(/['"](\/static\/[^'"]+\.(?:png|jpe?g|svg|gif|webp|wav|mp3))['"]/g)].map(m => m[1]);
const derived = [...block.matchAll(/:\s*[`'"][^'"`]*\$\{/g)].length;
const uniq = [...new Set(literals)];
console.log(`G9_EXTRACTED=${uniq.length} (IMAGE_PATHS 块 ${block.length} 字节 / 字面量 ${literals.length} 条 / 模板拼接需人工判定 ${derived} 条)`);
if (uniq.length === 0) { console.log("G9_RESULT=FAIL 解析失败：抽取 0 条，不得记通过"); process.exit(1); }

const rel = u => u.replace(/^\/static\//, "").replace(/^static\//, "");
function get(path) {
  return new Promise(done => {
    const url = BASE + "/" + path;
    const req = http.get(encodeURI(url), { timeout: 8000 }, res => {
      let n = 0;
      res.on("data", c => (n += c.length));
      res.on("end", () => done({ status: res.statusCode, bytes: n }));
    });
    req.on("timeout", () => { req.destroy(); done({ status: "TIMEOUT", bytes: -1 }); });
    req.on("error", e => done({ status: "ERR", bytes: -1, why: e.code }));
  });
}
(async () => {
  let probed = 0, ok = 0, skipped = 0;
  const bad = [];
  // 对照表：把「文件是否在盘」与「HTTP 结果」交叉，才能把"缺文件"与"注册表/编码"分开。
  // 没有这张表就断言根因，正是既往报告犯过的错。
  const up = "apps/api/uploads/app-assets/";
  const tab = { diskYes_http200: 0, diskYes_http4xx: 0, diskNo_http200: 0, diskNo_http4xx: 0 };
  const diskYes4xx = [];
  for (const u of uniq) {
    const r = rel(u);
    if (!r || r === u) { skipped++; bad.push(`UNPARSED ${u}`); continue; }
    const onDisk = fs.existsSync(up + r);
    const res = await get(r);
    probed++;
    const good = res.status === 200 && res.bytes > 0;
    if (good) ok++;
    else bad.push(`${r} -> ${res.status}/${res.bytes}${res.why ? "/" + res.why : ""}${onDisk ? " [在盘]" : " [不在盘]"}`);
    if (onDisk && good) tab.diskYes_http200++;
    else if (onDisk && !good) { tab.diskYes_http4xx++; diskYes4xx.push(r); }
    else if (!onDisk && good) tab.diskNo_http200++;
    else tab.diskNo_http4xx++;
  }
  console.log(`G9_PROBED=${probed} G9_OK=${ok} G9_SKIPPED=${skipped} G9_FAIL=${bad.length}`);
  console.log(`G9_CONTROL 在盘且200=${tab.diskYes_http200} 在盘但失败=${tab.diskYes_http4xx} 不在盘但200=${tab.diskNo_http200} 不在盘且失败=${tab.diskNo_http4xx}`);
  const nonAscii = bad.filter(b => /[一-鿿]/.test(String(b).split(" -> ")[0]));
  console.log(`G9_NONASCII_FAILS=${nonAscii.length}  G9_ASCII_FAILS=${bad.length - nonAscii.length}  (只判路径段，已剥掉 [在盘]/[不在盘] 中文标签——这个标签污染同类计数踩过两次)`);
  diskYes4xx.slice(0, 10).forEach(p => console.log("G9_ONDISK_BUT_FAIL " + p));
  bad.slice(0, 25).forEach(b => console.log("G9_BAD " + b));
  fs.writeFileSync(".zcode/tmp/g9-results.json", JSON.stringify({ extracted: uniq.length, probed, ok, skipped, control: tab, failures: bad }, null, 2));
  console.log(ok === probed ? "G9_RESULT=PASS" : "G9_RESULT=FAIL（含待对照归因项）");
})();
