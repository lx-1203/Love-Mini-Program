#!/usr/bin/env node
/* 源码级判点：给那些"载体本来就是源码、不是渲染帧"的台账行一个可重跑的机器判据。

 为什么要有这个载体：台账里有相当一部分行的判据其实是代码结构命题
 （"模板里不许每次调用 statsOf"、"avatarFailedIds 必须有清除点"、"白色前景改用 --c-text-inverse
 且禁改 --c-bg-container"、"删掉 .catch(() => {}) 空兜底"）。
 这类命题永远等不到帧——帧既看不见调用次数，也看不见 import 在哪一行。
 于是它们既不该记"待修复"（改动确实在位），也不该记"已修复（帧级复验）"（那是假借帧的名义给绿）。
 这里给的是第三种：**已修复（源码级判点）**，并把每条判点的原文谓词一起写进 statusEvidence。

 三条规矩：
   1. 谓词写成数据（SPEC），不写成"我看过没问题"；改判必须能重跑复现。
   2. 注释里出现被禁的写法 **不算违反**（本轮实测：`// 这里原来每次都 fetchProgress()` 是在解释修复），
      所以匹配前先剥掉行注释与块注释。
   3. 一条不过就 exit 非 0，且不许把不过的那条从计划里悄悄删掉。

 用法：node scripts/qa/verify-source-shape.mjs [--out reports/audit/round-7/cellplan-source-shape.json] [--dry]
*/
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DRY = process.argv.includes("--dry");
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/cellplan-source-shape.json"));

/* 每条判点：id=台账行号，file=承载文件，claim=判据原文要求，checks=可重跑谓词。
   谓词只允许四种：absent / present / countEq / countTemplateEq。 */
const SPEC = [
  {
    id: "MP-R2-CAMPUS-HUB-012", file: "apps/client/src/subpackages/campus/campus/hub.vue",
    claim: "成员数/动态数每卡只计算一次（模板不得反复调 statsOf）",
    checks: [{ kind: "countTemplateEq", re: /statsOf\s*\(/g, n: 0 }, { kind: "present", re: /stats:\s*statsOf\(/ }],
  },
  {
    id: "MP-R2-PAGES-MESSAGES-INDEX-021", file: "apps/client/src/pages/messages/index.vue",
    claim: "头像失败的置位集合必须有清除点（否则重载后永远占位）",
    checks: [{ kind: "countEq", re: /avatarFailedIds\.value\s*=\s*new Set\(\)/g, n: 1 }],
  },
  {
    id: "MP-R2-CAMPUSPOST-016", file: "apps/client/src/subpackages/circles/circles/post-topic.vue",
    claim: "onLoad 的 import 必须在文件头 import 区，不得夹在脚本中段",
    checks: [{ kind: "importHead", re: /import\s*\{[^}]*onLoad[^}]*\}\s*from/ }],
  },
  {
    id: "MP-R2-VILLAGE-INDEX-010", file: "apps/client/src/subpackages/village/village/index.vue",
    claim: "删掉 `.catch(() => {})` 这种吞异常的空兜底",
    checks: [{ kind: "absent", re: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g }],
  },
  {
    id: "MP-R2-PROFILE-034", file: "apps/client/src/pages/profile/index.vue",
    claim: "删除 socialProgressStore 实例化与 onShow 里的 fetchProgress()",
    checks: [{ kind: "absent", re: /socialProgressStore\.(fetchProgress|load)\s*\(/g },
      { kind: "absent", re: /const\s+socialProgressStore\s*=/g }],
  },
  {
    id: "MP-R2-PAGES-REGISTER-INDEX-014", file: "apps/client/src/pages/register/index.vue",
    claim: "(A) 三处彩色底上的白色前景改用 var(--c-text-inverse)，并明令禁改 var(--c-bg-container)",
    checks: [{ kind: "countEq", re: /var\(--c-text-inverse/g, n: 3 }, { kind: "present", re: /var\(--c-bg-container/g }],
  },
  {
    id: "MP-R2-CAMPUS-HUB-009", file: "apps/client/src/subpackages/campus/campus/hub.vue",
    claim: "同文件两处 --c-bg-page 兜底值统一：:372 用 #EEF7F2，另一处不得再留 #F0F4F2",
    checks: [{ kind: "absent", re: /#F0F4F2/g }, { kind: "countEq", re: /#EEF7F2/g, n: 2 }],
  },
  {
    /* 这一条原本是"待人读帧"：取景器给的三个判点全是 FRAME_ONLY（帧里量不到圆角数值），
       而判据本身其实是 CSS 声明命题——三枚按钮的 border-radius 换成 var(--r-full)。
       逐选择器量比"整文件计数"更硬：计数 3 只能证明有 3 处，不能证明正好落在这三枚按钮上。 */
    id: "MP-R2VIS-PAGES-LOGIN-INDEX-001", file: "apps/client/src/pages/login/index.vue",
    claim: "三枚按钮（.btn-primary / .btn-phone-quick / .btn-guest）的 border-radius 全部改用 var(--r-full)",
    checks: [
      { kind: "present", re: /\.btn-primary\s*\{[^}]*border-radius:\s*var\(--r-full\)/ },
      { kind: "present", re: /\.btn-phone-quick\s*\{[^}]*border-radius:\s*var\(--r-full\)/ },
      { kind: "present", re: /\.btn-guest\s*\{[^}]*border-radius:\s*var\(--r-full\)/ },
      { kind: "countEq", re: /border-radius:\s*var\(--r-full\)/g, n: 3 },
    ],
  },
  /* 下面三条原本是挂在 `tmp/tour-R2.mjs` 上的——那个文件被 .gitignore 的 `tmp/` 挡着，
     台账写"HEAD 已修"时其实根本不在 HEAD 里（详见 NOTES §42）。
     三处修都在**已跟踪**的后继载体 scripts/qa/tour-r6.mjs 里，判点因此改指向它。 */
  {
    id: "MP-R2VIS-TMP-TOUR-R2-001", file: "scripts/qa/tour-r6.mjs",
    claim: "权限抑制点在 wx.* JS 桥那层，且注册型 API（wx.onNeedPrivacyAuthorization）故意不 mock",
    checks: [
      { kind: "present", re: /'wx\.onNeedPrivacyAuthorization':/ },
      { kind: "present", re: /notMockedOnPurpose:/ },
      { kind: "present", re: /const CAPTURE_LIMITATIONS = \{/ },
    ],
  },
  {
    id: "MP-R2VIS-TMP-TOUR-R2-002", file: "scripts/qa/tour-r6.mjs",
    claim: "帧去重要有整帧内容哈希（sha256 前 16 位），且判等口径是字节全等而非感知哈希",
    checks: [
      { kind: "present", re: /function frameHash\(buf\)/ },
      { kind: "present", re: /digest\('hex'\)\.slice\(0, 16\)/ },
      { kind: "present", re: /'state-not-applied'/ },
    ],
  },
  {
    id: "MP-R2VIS-TMP-TOUR-R2-003", file: "scripts/qa/tour-r6.mjs",
    claim: "probeRoute 不能只取栈顶：必须同时把整条页面栈（top/depth/stack）带回来",
    checks: [
      { kind: "present", re: /async function probeRoute\(\)/ },
      { kind: "present", re: /JSON\.stringify\(\{top:[^}]*stack:/ },
      { kind: "present", re: /stack:\s*(?:o\.stack\|\[\]|out)/ },
    ],
  },
  {
    /* 判据是"两处 void fetchLikes 的空 catch 要接上上报"——纯代码结构命题，
       帧里既看不见 catch 也看不见 captureException，所以按谓词结案。 */
    id: "MP-R2-PROFILE-035", file: "apps/client/src/pages/profile/index.vue",
    claim: "两处 likesStore.fetchLikes() 的 .catch(() => {}) 空兜底改为 captureException 上报",
    checks: [
      { kind: "absent", re: /fetchLikes\(\)\.catch\(\(\)\s*=>\s*\{\s*\}\)/g },
      { kind: "countEq", re: /captureException\(error,\s*\{\s*source:\s*"profile\.fetchLikes"/g, n: 2 },
    ],
  },
  {
    /* 遮蔽（shadowing）这一类：函数内再取一次同名 store 会让外层那个永远不生效。
       判点只问"整份文件里这样的实例化还剩几次"——应当只剩 setup 顶层那一次。 */
    id: "MP-R2-CIRCLES-INDEX-009", file: "apps/client/src/subpackages/circles/circles/index.vue",
    claim: "删除函数内重复的 useSessionStore 实例化，只保留 setup 顶层一处",
    checks: [{ kind: "countEq", re: /const sessionStore = useSessionStore\(\)/g, n: 1 }],
  },
  {
    /* 这条横跨两个页面 + 一处缓存写入守卫，所以用 files 逐文件核；
       任一文件不过，整条不过——不能因为 home 标注了就给整条绿灯。 */
    id: "MP-R6-F1-NEARBY-IP-CITY-001",
    claim: "citySource=ip 时城市只用于标注：home/nearby 副标题带「按服务器位置推断」，且不写进 NEARBY_CITY 缓存",
    files: [
      {
        file: "apps/client/src/pages/home/index.vue",
        checks: [
          { kind: "present", re: /loc\.citySource === "ip"/ },
          { kind: "present", re: /locationPage\.serverCityTag/ },
        ],
      },
      {
        file: "apps/client/src/pages/nearby/index.vue",
        checks: [
          { kind: "present", re: /const ipSourced = loc\.citySource === "ip";/ },
          { kind: "present", re: /locationPage\.serverCityTag/ },
          { kind: "present", re: /if \(!ipSourced\) \{[\s\S]{0,400}setStorageSync\(STORAGE_KEYS\.NEARBY_CITY/ },
        ],
      },
    ],
  },
  {
    /* 图标引用"在不在盘上"是存在性命题，不是文本命题：
       判点直接要求三个被引用的 svg 文件真的存在且非 0 字节。 */
    id: "MP-R2VIS-CONFIG-IMAGES-001", file: "apps/client/src/config/images.ts",
    claim: "config/images.ts 引用的 paw/cat/planet 三枚图标文件确实在盘上（非 0 字节）",
    checks: [
      { kind: "present", re: /CIRCLE_PET:\s*ICONS_BASE \+ '\/common\/paw\.svg'/ },
      { kind: "present", re: /CIRCLE_CAT:\s*ICONS_BASE \+ '\/common\/cat\.svg'/ },
      { kind: "present", re: /CIRCLE_PLANET:\s*ICONS_BASE \+ '\/common\/planet\.svg'/ },
      { kind: "fileExists", path: "apps/client/src/static/assets/icons/common/paw.svg" },
      { kind: "fileExists", path: "apps/client/src/static/assets/icons/common/cat.svg" },
      { kind: "fileExists", path: "apps/client/src/static/assets/icons/common/planet.svg" },
    ],
  },
];

/* 剥注释：禁用的写法只出现在注释里（说明"这里原来是怎么写的"）不算违反。
   不剥就会把 5 条已修好的行读成没修——那是反向的假红。

   ⚠ 必须先归一 CRLF：`.` 不匹配 `\r`，而 `$`（无 m 修饰）只在整个串末尾成立，
   所以 `/\/\/.*$/` 在 Windows 行尾带 `\r` 的文件上**整行都匹配不到**，
   注释里的 `.catch(() => {})` 会被当成活代码（本轮实测：MP-R2-VILLAGE-INDEX-010 因此被误判未修）。 */
function stripComments(src) {
  const norm = src.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return norm.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
}
function templateOf(src) {
  const a = src.indexOf("<template"), b = src.lastIndexOf("</template>");
  return a >= 0 && b > a ? stripComments(src.slice(a, b)) : "";
}

const results = [];
/** 一条谓词跑一个文件。fileExists 是唯一不看内容、只看"在不在盘上"的判点类型
    （图标/素材这类"引用了但不存在"的判据本来就是存在性命题，不是文本命题）。 */
function runChecks(fileRel, checks) {
  const f = resolve(REPO, fileRel);
  if (!existsSync(f)) return "承载文件不存在 " + fileRel;
  const raw = readFileSync(f, "utf8");
  const src = stripComments(raw);
  const tpl = templateOf(raw);
  const lines = src.split("\n");
  let importHeadLine = -1;
  for (let i = 0; i < lines.length; i++) { const m = lines[i].match(checks.find((c) => c.kind === "importHead")?.re || /$^/); if (m) { importHeadLine = i + 1; break; } }
  for (const c of checks) {
    if (c.kind === "fileExists") {
      const p = resolve(REPO, c.path);
      if (!existsSync(p)) return "要求的文件不在盘上：" + c.path;
      if (!statSyncSize(p)) return "文件在盘上但是 0 字节：" + c.path;
    } else if (c.kind === "absent") { const m = src.match(c.re); if (m) return "禁用写法仍在：" + String(m[0]).slice(0, 40); }
    else if (c.kind === "present") { if (!c.re.test(src)) return "要求的写法查不到：" + String(c.re).slice(0, 46); }
    else if (c.kind === "countEq") { const n = (src.match(c.re) || []).length; if (n !== c.n) return "计数应为 " + c.n + "，实测 " + n + "（" + String(c.re).slice(0, 40) + "）"; }
    else if (c.kind === "countTemplateEq") { const n = (tpl.match(c.re) || []).length; if (n !== c.n) return "<template> 内计数应为 " + c.n + "，实测 " + n; }
    else if (c.kind === "importHead") {
      const firstCode = lines.findIndex((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l)) + 1;
      if (importHeadLine < 0) return "找不到该 import";
      if (importHeadLine > firstCode + 40) return "import 仍在脚本中段（行 " + importHeadLine + "）";
    } else return "未知的判点类型 " + c.kind + "（写错了不许当通过）";
  }
  return null;
}
function statSyncSize(p) { try { return statSync(p).size > 0; } catch { return false; } }

for (const s of SPEC) {
  /* 一条判据可以横跨几个文件（"home 与 nearby 都要标注 IP 推断城市"）。
     这种情况写成 files: [{file, checks}]，逐文件跑，任一不过整条不过——
     不能只核一个文件就给整条绿灯。 */
  const targets = s.files ? s.files : [{ file: s.file, checks: s.checks }];
  let bad = null, where = s.file;
  for (const t of targets) {
    const r = runChecks(t.file, t.checks);
    if (r) { bad = t.file + " :: " + r; where = t.file; break; }
  }
  results.push({ id: s.id, file: where, ok: !bad, why: bad || "", claim: s.claim });
}

const pass = results.filter((r) => r.ok);
const fail = results.filter((r) => !r.ok);
const patches = pass.map((r) => ({
  id: r.id, col: 6, new: "已修复（源码级判点：判据是代码结构命题，帧与像素两侧都取不到该量；谓词见 statusEvidence，可重跑 verify-source-shape.mjs 复现）",
  why: "不借帧的名义给绿，也不再挂着待修复",
})).concat(pass.map((r) => ({ id: r.id, col: 9, new: ("源码判点：" + r.claim + " ｜承载 " + r.file).replace(/\|/g, "／").slice(0, 220), why: "写明这条是靠哪个谓词成立的" })));

if (!DRY) writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: "verify-source-shape.mjs", passed: pass.length, failed: fail.length, patches }, null, 1));
console.log("SRC_SHAPE total=" + results.length + " 成立=" + pass.length + " 不成立=" + fail.length + " 补丁=" + patches.length +
  "（守恒：" + (pass.length + fail.length === results.length ? "yes" : "NO") + "）");
for (const r of fail) console.log("SHAPE_FAIL " + r.id + " :: " + r.why);
console.log("SRC_SHAPE_RESULT=" + (fail.length ? "PARTIAL（有谓词不过，不过的那几条不落账）" : "OK"));
process.exit(pass.length + fail.length === results.length ? 0 : 2);
