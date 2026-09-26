/* §82：把 18 条"源码里有本轮 ID 锚点、台账却仍写 待修复"的行推到有据可查的终态。
   判据（三条同时成立才抬，缺一不抬）：
     1) ID 锚点在**工作树**里命中、在 **HEAD** 里 0 命中 ⇒ 这是本轮改的，不是历史注释；
     2) 承载文件处于 dirty 状态（未提交，与 HEAD 对照才有意义）；
     3) 判据台（verify-fixes-against-artifact）给出该条的静态判定桶，桶决定限定语，
        绝不写成"已验证修好"：NEEDS_UI_FRAME 就是"待帧"，UNDECIDABLE 就是"判据不足"。
   为什么值得单独写脚本而不是手改 18 行：手改必踩列数/裸竖线，而台账是按列取值的权威件。
   用法：node scripts/qa/land-comment-sweep-rows.mjs [--apply]
*/
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = join(REPO, "reports/audit/round-6/issue-matrix.md");
const APPLY = process.argv.includes("--apply");
const COLS = 11, C = { id: 1, status: 6, statusEvidence: 9, action: 11 };

/* 18 条候选 = .zcode/tmp/comment-sweep.cjs 的 CANDIDATE 全集；
   files 是锚点实际落点（不只是台账写的那一个 —— MATCHING-016 的真实改点在 stores/match.ts）。 */
const ROWS = [
  ["MP-R2-CAMPUSPOST-013", ["apps/client/src/subpackages/campus/campus/post-topic.vue"]],
  ["MP-R2-CAMPUSPOST-014", ["apps/client/src/subpackages/campus/campus/post-topic.vue"]],
  ["MP-R2-CAMPUSPOST-016", ["apps/client/src/subpackages/campus/campus/post-topic.vue"]],
  ["MP-R2-CIRCLES-INDEX-006", ["apps/client/src/subpackages/circles/circles/index.vue"]],
  ["MP-R2-MATCHING-016", ["apps/client/src/stores/match.ts", "apps/client/src/subpackages/discover-extra/discover/matching.vue"]],
  ["MP-R2-PAGES-HOME-INDEX-110", ["apps/client/src/components/home/TodayRecommendationCard.vue"]],
  ["MP-R2-PAGES-MESSAGES-INDEX-018", ["apps/client/src/stores/messages.ts"]],
  ["MP-R2-PAGES-REGISTER-INDEX-013", ["apps/client/src/pages/register/index.vue", "apps/client/src/i18n/locales/zh-CN.ts"]],
  ["MP-R2-POSTTOPIC-012", ["apps/client/src/subpackages/circles/circles/post-topic.vue"]],
  ["MP-R2-PROFILE-024", ["apps/client/src/components/profile/mine/MyProfile.vue", "apps/client/src/components/profile/NotLoggedProfile.vue"]],
  ["MP-R2-PUB-114", ["apps/client/src/subpackages/village/village/publish.vue"]],
  ["MP-R2-VILLAGE-INDEX-010", ["apps/client/src/subpackages/village/village/index.vue"]],
  ["MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001", ["apps/client/src/subpackages/circles/circles/index.vue"]],
  ["MP-R2VIS-PAGES-MESSAGES-INDEX-002", ["apps/client/src/components/discover/NotLoggedWaiting.vue"]],
  ["MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-001", ["apps/client/src/components/village/PostCard.vue"]],
  ["MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-004", ["apps/client/src/subpackages/village/village/post.vue"]],
  ["MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A01", ["apps/client/src/subpackages/village/village/publish.vue"]],
  ["MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A05", ["apps/client/src/subpackages/village/village/publish.vue"]],
];
const git = (a) => { try { return execSync("git " + a, { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); } catch { return null; } };
/* 命中数一律在 JS 里数，不走 shell 的 grep/awk：
   ① execSync 在 Windows 上是 cmd.exe，`grep` 根本不存在，挂了会被我读成"0 命中"
     （§81 刚为这个形状写过自我更正，不能在这儿第二次）；
   ② `git grep -c` 的输出是 `path:count`，Number() 直接转成 NaN 也是同一个"失败伪装成 0"的坑。
   读不到就记 null 并在自检里判红，绝不与"确实 0 命中"混成一个值。 */
const occurrences = (text, needle) => { let n = 0, i = 0; while ((i = text.indexOf(needle, i)) >= 0) { n++; i += needle.length; } return n; };
const worktreeText = (f) => { try { return readFileSync(join(REPO, f), "utf8"); } catch { return null; } };
const headTextCache = new Map();
const headText = (f) => {
  if (headTextCache.has(f)) return headTextCache.get(f);
  const t = git(`show HEAD:${f.replace(/\\/g, "/")}`);
  const v = t && t.length > 100 ? t : null; // 短到不像一个源文件 = 命令没拿到内容，与"文件里没有该 ID"分开记
  headTextCache.set(f, v);
  return v;
};
const countInWorktree = (id, files) => files.reduce((s, f) => { const t = worktreeText(f); return s + (t ? occurrences(t, id) : 0); }, 0);
const countInHead = (id, files) => files.reduce((s, f) => { const t = headText(f); return s + (t ? occurrences(t, id) : 0); }, 0);
const headUnavailable = (fs_) => fs_.filter((f) => headText(f) === null);

const verdicts = JSON.parse(readFileSync(join(REPO, ".zcode/tmp/fixverify/verdicts.json"), "utf8"));
const vlist = Array.isArray(verdicts) ? verdicts : verdicts.items;
const vmap = new Map(vlist.map((x) => [x.id, x]));

const QUALIFY = {
  NEEDS_UI_FRAME: "需帧复验（T5 定向巡检覆盖本页）",
  UNDECIDABLE: "静态判据不足（判据未点名可核验物件或压缩改名），需补判点或帧",
  NOT_IN_EITHER: "判据台落点清单不全（真实改点在 stores/match.ts），补 srcRels 后重判",
  ARTIFACT_VERIFIED: "产物判点已命中",
  SOURCE_ONLY: "仅源码树命中，未在产物作用域命中",
};

const src = readFileSync(FILE, "utf8");
const lines = src.split("\n");
const idx = new Map();
lines.forEach((l, i) => {
  if (!/^\|\s*MP-/.test(l)) return;
  const c = l.split("|");
  if (c.length - 2 !== COLS) return;
  idx.set(c[C.id].trim(), i);
});

const plan = [], skip = [];
for (const [id, files] of ROWS) {
  const i = idx.get(id);
  if (i === undefined) { skip.push([id, "台账里无 11 列本尊行"]); continue; }
  const cells = lines[i].split("|");
  const st = String(cells[C.status] || "").trim();
  if (!/^待修复/.test(st)) { skip.push([id, "状态已不是待修复：" + st.slice(0, 20)]); continue; }
  const wt = countInWorktree(id, files), hd = countInHead(id, files);
  const hu = headUnavailable(files);
  if (hu.length) { skip.push([id, "HEAD 文本取不到（" + hu[0] + "）——测不出「HEAD 里没有」这件事，不抬"]); continue; }
  const dirty = git(`status --porcelain -- ${files.map((f) => JSON.stringify(f)).join(" ")}`).split("\n").filter(Boolean).length;
  const v = vmap.get(id);
  const bucket = v ? v.verdict : "(不在判据台)";
  if (!(wt > 0 && hd === 0 && dirty > 0)) { skip.push([id, `锚点不成立 wt=${wt} HEAD=${hd} dirty=${dirty}`]); continue; }
  const q = QUALIFY[bucket] || "判据桶=" + bucket;
  const note = `〔§82 注释清扫落定：ID 锚点在工作树 ${wt} 处命中、HEAD 0 命中、承载文件 dirty=${dirty}；`
    + `判据台桶=${bucket} ⇒ ${q}；22:59 mock 重建已并入产物，本轮不声称观感已验〕`;
  const next = cells.slice();
  next[C.status] = " 已修复待复验（" + q + "） ";
  next[C.statusEvidence] = " " + String(next[C.statusEvidence] || "").trim() + " " + note.replace(/\|/g, "∣") + " ";
  next[C.action] = " " + String(next[C.action] || "").trim() + " " + note.replace(/\|/g, "∣") + " ";
  const row = next.join("|");
  if (row.split("|").length - 2 !== COLS) { console.log("ABORT 列数变了 " + id); process.exit(2); }
  for (const cell of next.slice(1, -1)) if (cell.includes("|")) { console.log("ABORT 裸竖线 " + id); process.exit(2); }
  plan.push({ i, row, id, wt, hd, dirty, bucket });
}

/* 正向对照：`HEAD 里 0 命中` 只有在"HEAD 文本真的与工作树不同"时才有意义。
   如果 git show 拿回来的就是工作树内容（或干脆是空），那 18 条全都会"通过"这条判据 ——
   一个永远不会响的检查器比没有检查器更糟，所以这里先量"有多少个文件的 HEAD 版与工作树版确实不同"。 */
const allFiles = [...new Set(ROWS.flatMap(([, fs_]) => fs_))];
const differ = allFiles.filter((f) => { const h = headText(f), w = worktreeText(f); return h !== null && w !== null && h !== w; });
console.log(`SWEEP_LAND_CONTROL 文件数=${allFiles.length} 其中 HEAD 版与工作树版不同=${differ.length}（0 则说明 git show 没真取到 HEAD，"HEAD 无命中"这条判据不作数）`);
if (!differ.length) { console.log("SWEEP_LAND=REFUSED 对照失败：没有任何文件的 HEAD 版与工作树版不同"); process.exit(2); }

console.log(`SWEEP_LAND 候选=${ROWS.length} 可抬=${plan.length} 不动=${skip.length}`);
plan.forEach((p) => console.log(`  LAND ${p.id} 桶=${p.bucket} 锚点 wt=${p.wt}/HEAD=${p.hd}/dirty=${p.dirty}`));
skip.forEach(([id, why]) => console.log(`  KEEP ${id} :: ${why}`));
if (plan.length + skip.length !== ROWS.length) { console.log("SWEEP_LAND=REFUSED 分桶数与候选数不符"); process.exit(2); }
/* 空扫描集控制：18 条锚点在 worktree 里全为 0 命中，只可能是我的读文件方式坏了（路径、编码、大小写），
   不是"这些行都没修" —— 这种情况一律拒绝落盘，而不是安静地抬 0 条然后报"无事可做"。 */
if (!plan.length && skip.every(([, w]) => /wt=0/.test(w))) {
  console.log("SWEEP_LAND=REFUSED 候选锚点在 worktree 侧全部 0 命中 ⇒ 测量坏了，不是账实相符，禁止据此收尾");
  process.exit(2);
}
if (!APPLY) { console.log("SWEEP_LAND=DRY_RUN（加 --apply 落盘）"); process.exit(0); }

writeFileSync(FILE + ".pre-sweepland.bak", src);
const out = lines.slice();
for (const p of plan) out[p.i] = p.row;
const result = out.join("\n");
if (result.length <= src.length) { console.log("SWEEP_LAND=REFUSED 新内容不比原文长（搬移+加注应当只会长）"); process.exit(2); }
const tmp = FILE + ".tmp-" + process.pid;
writeFileSync(tmp, result);
renameSync(tmp, FILE);
console.log(`SWEEP_LAND=APPLIED changed=${plan.length} backup=reports/audit/round-6/issue-matrix.md.pre-sweepland.bak`);
