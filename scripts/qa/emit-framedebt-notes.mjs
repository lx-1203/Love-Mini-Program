/* 给两行"结构半段已判、观感半段还欠帧"的台账行补一条明写的帧债。
   为什么单独走脚本而不是手改：这一列是 11 列表格里的第 11 格，手改极易只截到半句把整行拆坏
   （本仓发生过 85 行变 12 列的事故）。这里读现值、拼尾巴、交给 patch-ledger-cells 落盘。
   为什么必须写：源码级判点只证明"结构换成了独立节点/顶部锚定裁切"，
   不证明"脸真的在画内""环真的渲染出来了"。判点在案而帧未出 ⇒ 状态不许写成帧级已验。 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const LEDGER = "reports/audit/round-6/issue-matrix.md";
const lines = readFileSync(resolve(REPO, LEDGER), "utf8").split(/\r?\n/);

const NOTES = {
  "MP-R2VIS-PAGES-HOME-INDEX-003":
    "〔round-7 结构半段已落，帧债未清〕头像已从 aspectFill 中心裁切换成「外层圆 + overflow 裁、图片 widthFix 贴顶」，" +
    "可重跑判点 MP-R2VIS-PAGES-HOME-INDEX-003（clip 节点在案 / 头像图用 widthFix / 头像规则不再写死 height）；" +
    "但「脸是否真的入画」是观感命题，判点取不到 ⇒ 须由 round-7 终轮重建 mock 档后的 pages/home/index 帧背书，帧未出之前本行不得写帧级已验。",
  "MP-R2VIS-PAGES-MESSAGES-INDEX-004":
    "〔round-7 已按理想图拆掉整图，帧债换档〕整图海报已删，换成虚线轨道 + 6 个独立头像（各带心动角标）+ 中心吉祥物，" +
    "结构由 7 条判点与 4 例挂载测（not-logged-waiting-orbit.spec.ts，含「少一个头像就变红」的变异测）背书；" +
    "这张卡只在真实档游客身份渲染 ⇒ 复验帧必须是 real 档 guest 帧，且必须是**本次拆图之后重建**的产物（03:52 那批 real 档不含此改动）。",
};

const patches = [];
for (const [id, note] of Object.entries(NOTES)) {
  const line = lines.find((l) => l.includes("| " + id + " |"));
  if (!line) { console.log("!! 台账里找不到 " + id); continue; }
  const cells = line.split("|").map((s) => s.trim());
  const cur = cells[11] || "";
  if (cur.includes("〔round-7")) { console.log("  跳过（已注过）" + id); continue; }
  patches.push({ id, col: 11, new: cur + " / " + note, why: "把「判点只证结构、不证观感」这件事写在处置列里，下一个读者不会把源码级判点读成帧级已验" });
}
writeFileSync(resolve(REPO, "reports/audit/round-7/cellplan-round7-framedebt-note.json"), JSON.stringify({ patches }, null, 1) + "\n");
console.log("FRAMEDEBT_NOTES=" + patches.length + "（补丁只改第 11 列，与 verify-source-shape 的 6/9 列不冲突）");
