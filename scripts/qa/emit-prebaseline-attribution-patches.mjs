/* 生成"判据引用的写法在开跑基线里就已存在"那 8 行的台账补丁。
   数字不抄对话、不抄子代理结论：这一份脚本自己跑 git show 094f7239 与工作树各数一遍，
   两边计数逐字相同才落补丁；只要有一边不同，就把这一行从计划里踢出去并说明原因。
   为什么不是"改成已修复"：这些行的改动**在不在码里**与**是不是本轮做的**是两件事。
   码里在 ⇒ 不该挂着"待修复"；本轮没动过 ⇒ 不许记成本轮的功劳。台账已有的口径是
   「保留-判据不成立（本轮前落地：…）」，这里沿用同一措辞，不新造档位。 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const BASE = "094f7239";
const sh = (c) => { try { return execSync(c, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 }); } catch (e) { return String((e && e.stdout) || "") + String((e && e.stderr) || ""); } };
const cnt = (s, t) => s.split(t).length - 1;

const ROWS = [
  { id: "MP-R2-CAMPUSPOST-011", file: "apps/client/src/i18n/locales/zh-CN.ts", needles: ["chooseImageFailed"], claim: "配图上传失败走专属文案键" },
  { id: "MP-R2-MATCHING-014", file: "apps/client/src/subpackages/discover-extra/discover/matching.vue", needles: ["redirectingToSuccess", "onUnload("], claim: "匹配成功跳转时保住 matchedUser，不被 onUnload 的 reset 打掉" },
  { id: "MP-R2-PAGES-REGISTER-INDEX-010", file: "apps/client/src/utils/form-validator.ts", needles: ["export function maskPhone"], claim: "手机号脱敏由统一工具函数提供" },
  { id: "MP-R2-POSTTOPIC-010", file: "apps/client/src/subpackages/circles/circles/post-topic.vue", needles: ["postTopicActivityEnrollHint", "ActivityCard"], claim: "活动话题报名提示走 i18n 键并复用 ActivityCard" },
  { id: "MP-R2VIS-PAGES-LOGIN-INDEX-001", file: "apps/client/src/pages/login/index.vue", needles: ["btn-guest"], claim: "登录页三枚按钮圆角走同一令牌" },
  { id: "MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-001", file: "apps/client/src/subpackages/circles/circles/circle-home.vue", needles: ["MORE_SVG", "104px"], claim: "圈主页「更多」用图标素材且右侧避让胶囊留 104px" },
  { id: "MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-004", file: "apps/client/src/subpackages/circles/circles/index.vue", needles: ["circles-header__search"], claim: "圈子列表头部搜索图标尺寸/底色与规范一致" },
  { id: "MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-002", file: "apps/client/src/subpackages/profile-extra/profile/location.vue", needles: ["location-card__icon"], claim: "位置卡图标走素材路径而不是内联字形" },
];

const patches = [];
const rejected = [];
for (const r of ROWS) {
  const base = sh("git show " + BASE + ":" + r.file);
  const now = sh("git show HEAD:" + r.file);
  const work = sh("cat -- " + r.file);
  const sameVsBase = r.needles.every((n) => cnt(base, n) === cnt(work, n));
  const detail = r.needles.map((n) => n + " 基线=" + cnt(base, n) + "/工作树=" + cnt(work, n)).join("，");
  if (!sameVsBase) { rejected.push(r.id + " 判据与基线不同形（" + detail + "）⇒ 不写「本轮前落地」，留给判据台"); continue; }
  if (base === work) rejected.push(r.id + " 文件相对基线零差异 ⇒ 结论更强（本轮确实没碰这个文件），仍按「本轮前落地」记账");
  patches.push({
    id: r.id, col: 6,
    new: "保留-判据不成立（本轮前落地：" + r.claim + " 所要求的写法在开跑基线 " + BASE + " 与工作树里计数逐字相同（" + detail + "），本轮没有可归因于本行的改动；记为「该缺陷在本轮开始前就不成立」，不冒充本轮功劳，也不挂着待修复）",
    why: "判据台对本行报 UNDECIDABLE 的原话是「授予绿用的判点在修复前的 HEAD 里就已存在 ⇒ 命中不能证明改动落地」；本补丁把这句判决落成台账口径，数字由 scripts/qa/emit-prebaseline-attribution-patches.mjs 现测生成，可重跑复现",
  });
  patches.push({
    id: r.id, col: 9,
    new: "承载 " + r.file + "；判点非判别性实测：git show " + BASE + ":" + r.file + " 与当前工作树对 " + detail + " 的计数相同（HEAD 侧 " + r.needles.map((n) => n + "=" + cnt(now, n)).join("，") + "）⇒ 本行证据只能证明「写法在位」，不能证明「本轮落地」。重跑：node scripts/qa/emit-prebaseline-attribution-patches.mjs",
    why: "把「数出来的等式」写进 statusEvidence，下一个读者不必再信我的转述",
  });
}
writeFileSync(resolve(REPO, "reports/audit/round-7/cellplan-prebaseline-attribution.json"), JSON.stringify({ patches }, null, 1) + "\n");
const dropped = rejected.filter((x) => x.includes("不写「本轮前落地」")).length;
console.log("PREBASELINE_PATCHES=" + patches.length + " 行数=" + ROWS.length + " 踢出=" + dropped + " 附注=" + (rejected.length - dropped));
for (const x of rejected) console.log("  踢出 " + x);
