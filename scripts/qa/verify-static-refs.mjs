/* 包内引用对账：客户端源码里所有 /static/... 字面量引用，是否真能在 src/static 找到件。
   为什么单独量：verify-app-assets-coverage 走的是 cdnPrefixes（后端服务那 924 个），
   而 home-split / icons / svg-spec 这些按契约**留包内**，门不看它们——
   可 real 档发布链会原地裁剪 src/static，被裁掉的正好是"源码没字面量引用"的那些。
   所以"引用得到却不在包内"是这条链上唯一会静默白屏的形状，必须单独数。 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
/* 复用仓内已有的注释剥离器，不自建第二份真相（它带行号对齐，剥完仍能报出原行号）。 */
import { stripComments } from "./strip-js-comments.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(REPO, "apps", "client", "src");

const SELFTEST = process.argv.includes("--self-test");
let stOk = 0, stTotal = 0;
/* --self-test：判据必须能给出阳性，否则"缺失=0"是空转不是达标。
   拿一个盘上真存在的件判"该命中"、拿一个必不存在的件判"该缺失"，两边都对才算这把尺活着。
   采集侧的阳性对照在 refs 建好之后追加（这里还看不到集合），最终判定也在文件末尾统一收。 */
if (SELFTEST) {
  const probe = (p) => existsSync(join(SRC, p));
  // 从包内真拿一个素材件当阳性对照（present 已是相对 SRC 的路径，直接用）
  const present = readdirSync(SRC, { recursive: true })
    .map((f) => String(f).split(sep).join("/"))
    .find((f) => f.startsWith("static/") && /\.(png|svg|jpg)$/.test(f) && existsSync(join(SRC, f)));
  const cases = [
    [present || "", true, "盘上真件必须判命中（判不出命中=这把尺是死的）"],
    ["static/assets/__definitely-not-here-9f3c1a__.png", false, "假造路径必须判缺失"],
    ["static/assets/images/mascot/${x}.png", null, "插值形态不判缺失、进 unresolvable"],
  ];
  for (const [p, want, why] of cases) {
    if (!p) { console.log(`SELFTEST SKIP ${why}`); continue; }
    stTotal += 1;
    const got = want === null ? (/[*{}$]/.test(p) ? null : probe(p)) : probe(p);
    const pass = got === want;
    if (pass) stOk += 1;
    console.log(`${pass ? "PASS" : "FAIL"}  ${why}  ${p} → ${got}`);
  }
}

function walk(d, out = []) {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    const s = statSync(f);
    if (s.isDirectory()) { if (!/(^|[\\/])(node_modules|\.mimosa)([\\/]|$)/.test(f + sep)) walk(f, out); }
    else if (/\.(vue|ts|js)$/.test(e)) out.push(f);
  }
  return out;
}

/* 两个必须排除的来源，否则门会长期假红（假红的门等于没有门）：
   1. 注释里的举例路径——如 assets-index.ts 用 `/static/generated/x.jpg` 讲解 rel 口径、
      profile.ts 引用一个**已被替换掉**的坏值 `/static/assets/mock/voice-status.mp3`（注释自陈"资产不存在"）；
   2. 单元测试的输入——tests/utils/media.spec.ts 断言 toLocalImage 原样透传，那个件本就不该存在。
   第一版没排这两类，报了 3 个假缺失。 */
const isTestFile = (f) => /(^[\\/]|[/\\])tests?[/\\]|\.spec\.[jt]s$|\.test\.[jt]s$/.test(f.slice(SRC.length));

const refs = new Map();
for (const f of walk(SRC)) {
  if (isTestFile(f)) continue;
  const raw = readFileSync(f, "utf8");
  const t = stripComments(raw);
  for (const m of t.matchAll(/['"`]\/?(static\/[^'"`\s]+?\.(?:png|jpe?g|svg|webp|gif|wav|mp3))['"`]/g)) {
    const rel = m[1].replace(/^\/+/, "");
    if (!refs.has(rel)) refs.set(rel, []);
    refs.get(rel).push(f.slice(REPO.length + 1).split(sep).join("/") + ":" + (t.slice(0, m.index).split("\n").length));
  }
}

const missing = [];
const unresolvable = [];
for (const [rel, where] of refs) {
  // rel 形如 "static/assets/..."，所以要接在 src 下而不是 src/static 下
  // （第一版拼成了 src/static/static/... ⇒ 565 个全判缺失，是量具错不是素材缺）
  /* 通配 / 插值 / 大括号展开 / 注释里的举例形态，静态判不了——
     判成"缺失"是假警（第一版就是这么报了 8 个），但也不能悄悄丢掉，
     所以单列一个数摆出来：unresolvable。它变多说明有人在源码里加了更多动态路径。 */
  if (/[*{}$]/.test(rel)) { unresolvable.push([rel, where]); continue; }
  if (!existsSync(join(SRC, rel))) missing.push([rel, where]);
}

/* 采集侧的阳性对照：排除注释与测试之后，门还必须能看见一个**真运行时引用**。
   只验"假路径判缺失"不验"真路径被采集"的话，把采集器整个写坏成 0 条也照样绿——
   那是本仓记过两次的空转形状。avatar-1.jpg 在 api/profile.ts:19 的 resolveMediaUrl(...) 里，
   非注释、非测试，必须出现在集合中。 */
if (SELFTEST) {
  const mustSee = "static/assets/images/avatars/avatar-1.jpg";
  const got = refs.has(mustSee);
  stOk += got ? 1 : 0;
  console.log(`${got ? "PASS" : "FAIL"}  真运行时引用必须被采集到（排除注释/测试后不许把门弄瞎）  ${mustSee} → ${got}`);
  stTotal += 1;
}
console.log(`STATICREF 源码字面量引用=${refs.size} 个唯一素材路径，命中包内=${refs.size - missing.length - unresolvable.length}，判不了(通配/插值)=${unresolvable.length}，缺失=${missing.length}`);
for (const [rel, where] of unresolvable.slice(0, 10)) console.log(`STATICREF_DYNAMIC ${rel}  ← ${where[0]}`);
for (const [rel, where] of missing.slice(0, 15)) console.log(`STATICREF_MISSING ${rel}  ← ${where.slice(0, 2).join(", ")}`);
if (SELFTEST) {
  console.log(`STATICREF_SELFTEST=${stOk === stTotal ? "PASS" : "FAIL"} ${stOk}/${stTotal}`);
  process.exit(stOk === stTotal ? 0 : 1);
}
console.log(`STATICREF_RESULT=${missing.length === 0 ? "PASS" : "FAIL"} 缺失=${missing.length}`);
process.exit(missing.length === 0 ? 0 : 1);
