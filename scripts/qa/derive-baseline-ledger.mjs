#!/usr/bin/env node
/**
 * derive-baseline-ledger.mjs —— 页面 ↔ 理想效果图 基准账本的**现场派生**（MP-FIDELITY Phase C）。
 *
 * 为什么重新派生而不是恢复旧件：
 *   reports/audit/baseline/ideal-baseline.md 已不在盘上（只剩 .zcode/tmp 的陈旧副本，那是别的轮的口径），
 *   而现存唯一映射是 deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §2 的 19 行表。
 *   另外两份"8 页无基准"清单互相不一致（round-1/findings/次要22-req.json 与 次要21-req.json:21），
 *   所以本脚本把它们降级成**待检主张**：分歧逐行 LEDGER_DIFF 点名，权威集只由派生结果给。
 *
 * 三条硬规矩（都是为了让"有基准"这三个字不能被编出来）：
 *   1. 页集合取**编译产物 app.json**，不取源码 pages.json：后者还隔着 strip-mock 与 #ifdef 裁剪
 *      （setup/dev 与 setup/showcase 两条在 real 档里根本不存在），抄源码会把不存在的页算进分母。
 *   2. 表里点名的图**必须逐张在盘上**；点名了却没有 ⇒ baselineStatus=基准图缺失（判红），
 *      绝不回退成"差不多的一张"、也绝不因为找不到就把这页划成有基准。
 *   3. 守恒：有基准 + 无基准 + 基准图缺失 = 产物页数；对不上就退 1。
 *
 * 用法：node scripts/qa/derive-baseline-ledger.mjs [--project <产物目录>] [--out <目录>]
 * 退出码：0 派生成且守恒与缺图判点全中；1 有缺图/不守恒；2 输入读不到（产物或规范文档不在）。
 */
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { stripComments } from "./strip-js-comments.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "BASELINELEDGER_RESULT";

const arg = (k, dflt) => {
  const i = process.argv.indexOf("--" + k);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v === undefined || String(v).startsWith("--") ? dflt : v;
};

const project = resolve(arg("project", join(REPO, "apps/client/dist/build/mp-weixin-real")));
/* --out 既收目录也收文件名：上一发我按"目录"写死，第二次跑传了 .json 路径进去，
   mkdirSync 撞在一个已存在的文件上抛 EEXIST ⇒ 生成器根本没跑成，而报错长得像权限问题。
   后缀名一律按**文件**处理，取它的父目录建。 */
const OUT_ARG = resolve(arg("out", join(REPO, "reports/audit/mp-fidelity-2026-10-18")));
const outDir = /\.json$/i.test(OUT_ARG) ? dirname(OUT_ARG) : OUT_ARG;
mkdirSync(outDir, { recursive: true });
const appJson = join(project, "app.json");
const specDoc = join(REPO, "deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md");
const imgRoot = join(REPO, "素材/理想效果图");

if (!existsSync(appJson)) { console.log(`${RK}=NOT-EVIDENCED reason=no-app-json path=${appJson}`); process.exit(2); }
if (!existsSync(specDoc)) { console.log(`${RK}=NOT-EVIDENCED reason=no-spec-doc path=${specDoc}`); process.exit(2); }
if (!existsSync(imgRoot)) { console.log(`${RK}=NOT-EVIDENCED reason=no-ideal-dir path=${imgRoot}`); process.exit(2); }

/* ── 输入 1：编译产物的真实页集合 ── */
const app = JSON.parse(readFileSync(appJson, "utf-8"));
const routes = [];
for (const p of (app.pages || [])) routes.push({ route: p, package: "main" });
for (const sp of (app.subPackages || app.subpackages || [])) {
  const root = String(sp.root || "").replace(/\/+$/, "");
  for (const p of (sp.pages || [])) routes.push({ route: `${root}/${p}`, package: root });
}
const routeSet = new Set(routes.map((r) => r.route));

/* ── 输入 2：理想效果图目录的真实清单（只认 .png，文件名逐字） ── */
const idealFiles = new Set(readdirSync(imgRoot).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f)));

/* ── 输入 3：规范文档 §2 的表（解析，不抄第二份） ── */
const spec = readFileSync(specDoc, "utf-8");
const tableRows = [];
for (const line of spec.split(/\r?\n/)) {
  const t = line.trim();
  if (!t.startsWith("|")) continue;
  const cells = t.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length < 6) continue;
  if (!/^\d+$/.test(cells[0])) continue; /* 表头与分隔行没有纯数字序号 */
  tableRows.push({ seq: Number(cells[0]), imageCell: cells[1], pageName: cells[2], routeCell: cells[3], fileCell: cells[4], statusCell: cells[5] });
}

/** 表里的"代码文件/路由"两列任给其一即可定位路由：
 *   `/pages/login/index` → pages/login/index
 *   `subpackages/x/y.vue` → subpackages/x/y
 * 表里写成 DISCOVER.MATCHING 这类常量名的一律**解析**成文件路径再比，绝不按名字猜。 */
function routeFromRow(row) {
  for (const cell of [row.fileCell, row.routeCell]) {
    const s = String(cell || "").replace(/`/g, "").trim();
    if (!s || s === "—") continue;
    const asPath = s.replace(/^\/+/, "").replace(/\.vue$/, "");
    if (routeSet.has(asPath)) return { route: asPath, from: row.fileCell.includes(s) ? "代码文件" : "路由" };
    const m = s.match(/(pages\/[A-Za-z0-9/_-]+|subpackages\/[A-Za-z0-9/_-]+)/);
    if (m && routeSet.has(m[1])) return { route: m[1], from: "代码文件（去 .vue）" };
  }
  return null;
}

/** 表里"理想效果图"一列可能是 `A.png / B.png`，也可能写成 `ChatGPT…11_37_17.png` 这种省略号缩写，
 *  还可能是"（理想图无对应参考）"这种压根没图的写法。三者必须分开处理：
 *    · 逐字命中盘上文件 ⇒ 基准图；
 *    · 省略号/空格缩写：把名字按 …/… 切成片段，**要求片段在盘上唯一命中一张**才认，
 *      并打印 BASELINE_NAME_RECONCILED 让这次对名可被复核（不静默"差不多就行"）；
 *    · 认不出且带扩展名 ⇒ 基准图缺失（判红）；不带扩展名或整格是括注 ⇒ 视为"无参考图"的写法。 */
function matchImage(raw) {
  const n = String(raw || "").trim();
  if (!n) return null;
  const withExt = /\.(png|jpg|jpeg|webp)$/i.test(n) ? n : `${n}.png`;
  if (idealFiles.has(withExt)) return { file: withExt, how: "逐字" };
  if (!/\.(png|jpg|jpeg|webp)$/i.test(n)) return null;
  const frags = n.split(/…|\.\.\./).map((s) => s.trim()).filter((s) => s.length >= 3);
  if (!frags.length) return null;
  const cands = [...idealFiles].filter((f) => frags.every((s) => f.includes(s)));
  if (cands.length === 1) return { file: cands[0], how: `片段唯一命中(${frags.join("∥")})` };
  return { file: "", how: cands.length ? `片段命中 ${cands.length} 张，不取` : "片段无命中" };
}

function imagesFromCell(cell) {
  const names = String(cell || "").split(/[\/、,]/).map((x) => x.trim()).filter(Boolean);
  const hit = [];
  const miss = [];
  for (const n of names) {
    if (/[（(].*[)）]/.test(n) && !/\.(png|jpg|jpeg|webp)$/i.test(n)) continue; /* 括注：无参考图的写法 */
    const m = matchImage(n);
    if (!m) continue;                                   /* 非图名的描述词，跳过 */
    if (m.file) {
      hit.push(m.file);
      if (m.how !== "逐字") console.log(`BASELINE_NAME_RECONCILED 表里写 "${n}" → 盘上 ${m.file}（${m.how}）`);
    } else miss.push(`${n}（${m.how}）`);
  }
  return { hit, miss };
}

const rowById = new Map();
const orphanRows = [];
const namedMissing = [];
for (const row of tableRows) {
  const located = routeFromRow(row);
  const { hit, miss } = imagesFromCell(row.imageCell);
  for (const m of miss) namedMissing.push(`#${row.seq} ${row.imageCell} → ${m}`);
  if (!located) { orphanRows.push(row); continue; }
  const prev = rowById.get(located.route);
  const rec = prev || { route: located.route, images: [], seqs: [], pageName: row.pageName };
  rec.images.push(...hit);
  rec.seqs.push(row.seq);
  rec.pageName = rec.pageName || row.pageName;
  rowById.set(located.route, rec);
}

/* ── 身份前提：沿用 gen-tour-tsv.mjs:6-9 的既有裁定（A 扫全部页；游客只扫 tabBar 页），
 *      外加 profile-guard.ts 的 LOCKED_PAGES 与 tabBar 清单。 */
const tabBarList = ((app.tabBar && app.tabBar.list) || []).map((x) => String(x.pagePath || ""));
const isTab = (r) => tabBarList.includes(r);
const LOCKED_SRC = join(REPO, "apps/client/src/guards/profile-guard.ts");
const lockedTokens = [];
if (existsSync(LOCKED_SRC)) {
  const gsrc = readFileSync(LOCKED_SRC, "utf-8");
  const block = String((gsrc.match(/LOCKED_PAGES\s*=\s*\[([\s\S]*?)\]/) || [, ""])[1]);
  for (const line of block.split(/\r?\n/)) {
    const t = line.match(/(?:ROUTES|SUBPACKAGE_ROUTES)\.[A-Z0-9_.]+/);
    if (t) lockedTokens.push(t[0]);
  }
}
/** 把 ROUTES.TAB.VILLAGE 这类点号 token 解析成真实路由：只在 routes.ts 里
 *  该叶子键名**全局唯一**时才敢解；重名键（INDEX/HOME 这种在各子对象里反复出现的）
 *  一律记 UNRESOLVED 并如实说出，不猜——猜错就等于给一页盖了"没被守卫锁"的章。 */
const ROUTES_SRC = join(REPO, "apps/client/src/constants/routes.ts");
const leafMap = new Map();
if (existsSync(ROUTES_SRC)) {
  const rtxt = readFileSync(ROUTES_SRC, "utf-8");
  for (const m of rtxt.matchAll(/([A-Z0-9_]+)\s*:\s*["'`]([^"'`]+)["'`]/g)) {
    const k = m[1], v = m[2];
    if (!leafMap.has(k)) leafMap.set(k, new Set());
    leafMap.get(k).add(v.replace(/^\/+/, "").replace(/\.vue$/, ""));
  }
}
const lockedRoutes = new Set();
const lockedUnresolved = [];
for (const tok of lockedTokens) {
  const leaf = tok.split(".").pop();
  const vals = leafMap.get(leaf);
  if (vals && vals.size === 1) lockedRoutes.add([...vals][0]);
  else lockedUnresolved.push(`${tok}(候选 ${vals ? vals.size : 0} 个)`);
}
for (const u of lockedUnresolved) console.log(`LOCKED_TOKEN_UNRESOLVED ${u} ⇒ 该 token 没有落成路由，宁可少标也不猜`);

/* 身份前提不能由"是不是 tab 页"一句话定：R2b 实测 pages/login/index 在登录身份下被
   pages/login/index.vue:87 的 `if (sessionStore.isLoggedIn && !autoForwardedToMain) { … uni.switchTab("/pages/discover/index") }`
   直接转走，拍到的帧落点是 pages/discover/index（与寻觅页逐字节同图）。
   ⇒ 转发页只能以未登录身份取景；声明 requiresAuth 的页反过来只能以登录身份取景。
   判点取**同一条 if 的块内**：第一版我写成"isLoggedIn 之后 240 字里出现 switchTab"，
   结果 pages/discover/index、pages/home/index 只因文件里有 `if (sessionStore.isLoggedIn) {` 就被打成游客页
   ——邻近 ≠ 因果，把 66 页的分母改错了 3 页。 */
const FORWARD_RE = /if\s*\(\s*[\w.]*isLoggedIn\s*&&[\s\S]{0,160}?(?:uni\.)?(?:switchTab|redirectTo)\s*\(/;
const guestOnlyRoutes = new Set();
const authRequiredRoutes = new Set();
for (const r of routes) {
  const f = join(REPO, "apps/client/src", `${r.route}.vue`);
  if (!existsSync(f)) continue;
  /* 判点不许读注释（2026-10-20 实测）：原版直接在含注释的原文上匹配 /requiresAuth:\s*true/，
     于是有人在注释里写一句"复用 requiresAuth: true 的要求"，这页就被钉成登录档、取景前提跟着错。
     同一族的方向相反的病见 scripts/qa/strip-js-comments.mjs 头注释——收成一份实现，别再各写各的。 */
  const src = stripComments(readFileSync(f, "utf8"));
  if (FORWARD_RE.test(src)) guestOnlyRoutes.add(r.route);
  if (/requiresAuth:\s*true/.test(src)) authRequiredRoutes.add(r.route);
}
console.log(`LEDGER_IDENTITY 派生：登录即转发页=${guestOnlyRoutes.size} 声明 requiresAuth 页=${authRequiredRoutes.size}（逐页读 apps/client/src/<route>.vue）`);
for (const x of guestOnlyRoutes) console.log(`  LEDGER_GUEST_ONLY ${x}（依据：该页源码里 if(isLoggedIn&&…) 块内直接 switchTab/redirectTo）`);

/* ── 逐页判决 ── */
const rows = [];
let nBaselined = 0, nNoBaseline = 0;
for (const r of routes) {
  const rec = rowById.get(r.route);
  const images = rec ? [...new Set(rec.images)] : [];
  let status;
  if (images.length) { status = "有基准"; nBaselined++; }
  else { status = "无基准"; nNoBaseline++; }
  const identity = guestOnlyRoutes.has(r.route)
    ? /* 2026-10-19 更正：这一页的前提不是「B」而是「没有会话」。
         B 在本案的词表里=guest-login，实测后端返回 loggedIn=true
         （POST /api/v1/auth/guest-login → {"userId":"100151","loggedIn":true,"loginMethod":"guest",…}），
         而登录页的转发判据读的正是 isLoggedIn ⇒ 拿 B 票去拍登录页照样被 switchTab 到 pages/discover/index。
         原文写「B（登录即转发，只能未登录取景）」是自相矛盾的配方：前半句要未登录，后半句给的是一张登录态票。
         R2b 那发 landingMismatch（top+bottom 都落 discover）就是照着原文办出来的后果。 */
      "none（登录即转发 ⇒ 必须清会话取景；B=guest 票实测 loggedIn=true 仍会转发，不满足前提）"
    : isTab(r.route)
      ? "A + B（tabBar 页两身份都取）"
      : authRequiredRoutes.has(r.route)
        ? "A（页面声明 requiresAuth:true）"
        : "A（页面未声明门槛 ⇒ 按登录态取，游客侧可达性未证）";
  /* identityPrecondition 是给人读的散文，identityAxis 是给机器判的标记。
     把两者合一的代价实测过：取景腿曾按散文前缀（"A（…需登录态）"）反推档位 ⇒ 70/71 行都命中同一个前缀，
     于是"这一页本来该用哪个身份拍"这条判点在 A 跑上恒为"对得上"（空读数），在 B 跑上恒为"错档"（假硬红）。
     判点要落在声明字段上，不落在措辞上。 */
  const axis = guestOnlyRoutes.has(r.route) ? "none" : isTab(r.route) ? "A+B" : authRequiredRoutes.has(r.route) ? "A" : "A?";
  rows.push({
    route: r.route,
    packageRoot: r.package,
    codeFile: `apps/client/src/${r.route}.vue`,
    baselineImages: images.map((f) => `素材/理想效果图/${f}`),
    baselineStatus: status,
    specRows: rec ? rec.seqs : [],
    identityPrecondition: identity,
    identityAxis: axis,
    identityAxisSource: guestOnlyRoutes.has(r.route) ? "源码：if(isLoggedIn&&…) 块内 switchTab/redirectTo"
      : isTab(r.route) ? "产物 app.json 的 tabBar.list"
        : authRequiredRoutes.has(r.route) ? "源码：requiresAuth: true" : "未声明 ⇒ 记 A?（按登录态取，档位未经声明证明）",
    lockedByProfileGuard: lockedRoutes.has(r.route),
  });
}
const axisCount = {};
for (const x of rows) axisCount[x.identityAxis] = (axisCount[x.identityAxis] || 0) + 1;
console.log(`LEDGER_AXIS ${Object.entries(axisCount).map(([k, v]) => `${k}=${v}`).join(" ")}（A? = 页面没声明门槛，档位是默认假设不是证据）`);

/* ── 与两份旧"8 页无基准"清单对照（只报分歧，不当真） ── */
const derivedNoBaseline = new Set(rows.filter((x) => x.baselineStatus === "无基准").map((x) => x.route));
const diffs = [];
const CLAIM_FILES = [
  ["reports/audit/round-1/findings/次要22-req.json", join(REPO, "reports/audit/round-1/findings/次要22-req.json")],
  ["reports/audit/round-1/findings/次要21-req.json", join(REPO, "reports/audit/round-1/findings/次要21-req.json")],
];
for (const [label, p] of CLAIM_FILES) {
  if (!existsSync(p)) { diffs.push(`${label}: 读不到，跳过（不判）`); continue; }
  const txt = readFileSync(p, "utf-8");
  const claimed = new Set();
  for (const m of txt.matchAll(/(?:subpackages|pages)\/[A-Za-z0-9/_-]+/g)) {
    const s = m[0].replace(/\/+$/, "");
    if (routeSet.has(s)) claimed.add(s);
  }
  const saidNoBase = [...claimed].filter((x) => !derivedNoBaseline.has(x));
  diffs.push(`${label}: 点名 ${claimed.size} 路由，其中 ${saidNoBase.length} 条本轮派生成**有基准**（分歧逐条见 LEDGER_DIFF）`);
  for (const x of saidNoBase) console.log(`LEDGER_DIFF src=${label} route=${x} claim=无基准 derived=有基准`);
}

/* ── 表里点名但盘上没有的图 ⇒ 判红 ── */
for (const m of namedMissing) console.log(`BASELINE_IMAGE_MISSING ${m}`);
/* 表里定位不到路由的行（组件内嵌态/品牌图/已被删掉的页）也必须点名，不许悄悄丢 */
for (const o of orphanRows) console.log(`LEDGER_ORPHAN_ROW #${o.seq} 理想效果图="${o.imageCell}" 页面="${o.pageName}" 代码文件="${o.fileCell}" ⇒ 对不上产物里任何路由（组件态/品牌图/已删页，逐条人工裁）`);

const conserved = nBaselined + nNoBaseline === routes.length;
const problems = [];
if (!conserved) problems.push(`守恒不成立：有基准 ${nBaselined} + 无基准 ${nNoBaseline} ≠ 产物页数 ${routes.length}`);
if (namedMissing.length) problems.push(`表里点名了 ${namedMissing.length} 张盘上不存在的理想图 ⇒ 不许把那些页算作有基准`);
if (!routes.length) problems.push("产物 app.json 里一页都没解析出来（空扫描集不得派生账本）");

mkdirSync(outDir, { recursive: true });
const json = {
  schema: "mp-fidelity-baseline-ledger/v1",
  generatedAt: new Date().toISOString(),
  project: project.replace(REPO + "/", ""),
  bandStamp: readBand(project),
  totals: { routes: routes.length, baselined: nBaselined, noBaseline: nNoBaseline, specRows: tableRows.length, orphanSpecRows: orphanRows.length, namedMissingImages: namedMissing.length },
  tabBarRoutes: tabBarList,
  lockedPageTokens: lockedTokens,
  rows,
};
writeFileSync(join(outDir, "baseline-ledger.json"), JSON.stringify(json, null, 2) + "\n", "utf-8");

/* md 视图：让"哪几页有基准、哪几页只能按规范比"一眼数得出来 */
const md = [];
md.push(`# 页面 ↔ 理想效果图 基准账本（现场派生 · ${json.generatedAt}）`);
md.push(``);
md.push(`派生自编译产物 \`${json.project}/app.json\`（band=${json.bandStamp}）+ 规范文档 §2 的 ${tableRows.length} 行表 + \`素材/理想效果图\` 的 ${idealFiles.size} 张实图。**不恢复旧 ideal-baseline.md**（那份只剩 .zcode/tmp 的陈旧副本）。`);
md.push(``);
md.push(`- 产物页数：**${routes.length}**（主包 ${routes.filter((r) => r.package === "main").length} + 分包 ${routes.length - routes.filter((r) => r.package === "main").length}）`);
md.push(`- 有基准：**${nBaselined}** ｜ 无基准：**${nNoBaseline}** ｜ 表点名却缺图：**${namedMissing.length}** ｜ 表里对不上任何路由的行：**${orphanRows.length}**`);
md.push(``);
md.push(`| 路由 | 分包 | 理想图 | 基准状态 | 规范行 | 身份前提 |`);
md.push(`|---|---|---|---|---|---|`);
for (const x of rows) {
  md.push(`| ${x.route} | ${x.packageRoot} | ${x.baselineImages.map((p) => p.replace("素材/理想效果图/", "")).join(" / ") || "—"} | ${x.baselineStatus} | ${(x.specRows || []).join(",") || "—"} | ${x.identityPrecondition} |`);
}
md.push(``);
md.push(`> 无基准页不是"不用看"，是**没有可比对象**：这些页按规范文档 §3 逐页说明与组件库比，并在总报告 §4「目标功能清单」里单列。`);
writeFileSync(join(outDir, "baseline-ledger.md"), md.join("\n") + "\n", "utf-8");

console.log(`BASELINELEDGER_OUT=${outDir}/baseline-ledger.json (${statSync(join(outDir, "baseline-ledger.json")).size}B) + baseline-ledger.md`);
for (const d of diffs) console.log(`BASELINELEDGER_CLAIM ${d}`);
for (const p of problems) console.error(`BASELINELEDGER_PROBLEM ${p}`);
console.log(problems.length
  ? `${RK}=FAIL routes=${routes.length} baselined=${nBaselined} nobaseline=${nNoBaseline} missingImage=${namedMissing.length} problems=${problems.length}`
  : `${RK}=PASS routes=${routes.length} baselined=${nBaselined} nobaseline=${nNoBaseline} specRows=${tableRows.length} 守恒=yes`);
process.exit(problems.length ? 1 : 0);

/** band 戳（mode@sha8）只为让账本能自证量的是哪一棵树；算法与 scripts/qa/artifact-band.mjs:14-24 一致。 */
function readBand(dir) {
  try {
    const f = join(dir, "config/env.js");
    if (!existsSync(f)) return "(无 config/env.js)";
    const buf = readFileSync(f);
    const m = String(buf).match(/MODE:\s*"([^"]+)"/);
    return `${m ? m[1] : "?"}@${createHash("sha256").update(buf).digest("hex").slice(0, 8)}`;
  } catch { return "(band 读不到)"; }
}
