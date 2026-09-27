/* round-7 交互态取景器：走 IDE CLI 的元素级通道（scripts/qa/cli-automator.mjs），补 WS 巡检拍不到的
 * 「点击之后」那一帧，并把**为什么这帧算数**写成可判的三件事：
 *   1. 落点：open_page 之后 getCurrentPages() 的顶栏必须就是目标页（像素会骗人，路由不会）；
 *   2. 节点：期望节点在**动作前不存在、动作后存在**（v-if 弹层的决定性判据；三态探针 1/0/ERR）；
 *   3. 像素：动作前后各一帧，比较 sha256 —— 节点出现但像素不变，说明"截图不含这一层"或"视觉本就无差异"，
 *      这三件事分开记，才不会把"探针没坏"误读成"功能正常"。
 *
 * 四象限判决（pre/post 节点存在性 × 前后帧是否同字节）：
 *   APPEARED            pre=0 post=1 且像素变了        ⇒ 交互生效且渲染可见
 *   APPEARED_NOPIXEL    pre=0 post=1 但像素逐字节相同  ⇒ 节点在、截图不含它（截图通道或层级问题）
 *   NOCHANGE            pre=0 post=0 且像素相同        ⇒ 交互根本没生效（真缺陷 or 选择器没命中）
 *   WAS_THERE           pre=1                          ⇒ 默认态里弹层就已经在（判据本身有问题，另记）
 *   PROBE_ERR           任一次探针返回 ERR:*           ⇒ **测量工具坏了**，不是产品结论，单独计数且 exit 1
 *
 * 清单（TSV，制表符分隔，# 开头是注释）：identity<TAB>page<TAB>query或-<TAB>state<TAB>tapSelector<TAB>expectSelector
 * 用法：node scripts/qa/tour-cli-states.mjs --tsv .zcode/tmp/round7/states.tsv \
 *        --project D:/6/恋爱小程序/apps/client/dist/build/mp-weixin --label round-7-states
 * 退出码：0=全部行都落帧且无 PROBE_ERR；1=有 PROBE_ERR 或一张帧都没有；2=输入不合法（空清单/缺文件）。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, relative, sep, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, openPage, shot, element, routeStack, nodeCount, mintToken, bootSession, verifyLogin } from "./cli-automator.mjs";
import { classifyStateVerdict } from "./states-verdict.mjs";
import { guardUiLease } from "./ui-lease.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const TSV = arg("tsv", "");
const PROJECT = arg("project", "");
const LABEL = arg("label", "round-7-states");
const SETTLE = Number(arg("settle", "2400"));
const MAXN = Number(arg("maxn", "8"));
const OUT_DIR = join(REPO, "reports", "screenshots", LABEL);
const relOf = (p) => relative(REPO, p).split(sep).join("/");
const sleep = (ms) => { const t = Date.now(); while (Date.now() - t < ms) { /* 忙等：本流程全是同步子进程调用 */ } };

if (!TSV || !existsSync(TSV)) { console.log(`STATES_RESULT=FAIL reason=缺 --tsv 或文件不存在（${TSV || "未给"}）`); process.exit(2); }
if (!PROJECT || !existsSync(join(PROJECT, "app.json"))) { console.log(`STATES_RESULT=FAIL reason=--project 不合法：${PROJECT || "未给"}（要指向已编译产物目录）`); process.exit(2); }
const rows = readFileSync(TSV, "utf8").split(/\r?\n/).map((l) => l.replace(/\r$/, "")).filter((l) => l.trim() && !l.trim().startsWith("#"))
  .map((l) => { const a = l.split("\t"); return { identity: (a[0] || "A").trim(), page: (a[1] || "").trim(), query: (a[2] || "").trim(), state: (a[3] || "交互后").trim(), tap: (a[4] || "").trim(), expect: (a[5] || "").trim(), expectTapText: (a[6] || "").trim() }; })
  .filter((r) => r.page);
if (!rows.length) { console.log("STATES_RESULT=FAIL reason=清单为空（空扫描集不得占设备、不得判绿）"); process.exit(2); }
const badRows = rows.filter((r) => !r.expect || !r.tap);
if (badRows.length) { console.log(`STATES_RESULT=FAIL reason=${badRows.length} 行缺 tap/expect 选择器 —— 没有元素级判据的行拍了帧也判不了，先从清单里去掉`); badRows.slice(0, 5).forEach((r) => console.log("  BADROW " + [r.identity, r.page, r.state].join("/"))); process.exit(2); }
/* 会开页 ⇒ 先排队。并发不报错、只互相换页，实测一整批测量作废（见 ui-lease.mjs 头注）。 */
guardUiLease({ owner: "tour-cli-states-" + LABEL, tag: "STATES_LEASE", failTag: "STATES" });

const GIT_SHA = (() => { try { return require("node:child_process").execSync("git rev-parse --short HEAD", { cwd: REPO, encoding: "utf8" }).trim(); } catch { return "unknown"; } })();
mkdirSync(OUT_DIR, { recursive: true });
const opts = { project: PROJECT };
const shots = [], failures = [];
let probeErr = 0, harnessMiss = 0;

const sessions = {};
for (const idt of [...new Set(rows.map((r) => r.identity))]) {
  try { sessions[idt] = await mintToken(idt === "A" ? "A" : "B", REPO, "r7-states-" + idt.toLowerCase()); console.log(`[identity ${idt}] token ok userId=${sessions[idt].userId}`); }
  catch (e) { sessions[idt] = null; console.log(`[identity ${idt}] 铸 token 失败：${e.message} ⇒ 该身份的行一律记失败，不拿未登录画面冒充`); }
}
let curIdent = null;
const hashOf = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);
const takeShot = (file) => { try { rmSync(file, { force: true }); shot(file, opts); const st = statSync(file); return st.size > 3000 ? { bytes: st.size, hash: hashOf(file) } : { tooSmall: st.size }; } catch (e) { return { err: String(e.message).slice(0, 90) }; } };

for (const r of rows) {
  if (!sessions[r.identity]) { failures.push({ identity: r.identity, page: r.page, state: r.state, severity: "P1", reason: "身份 token 未铸出" }); continue; }
  if (curIdent !== r.identity) {
    const b = bootSession(sessions[r.identity].token, opts);
    const v = verifyLogin(opts);
    console.log(`[boot ${r.identity}] ${b} / verify=${v}`);
    if (!/^logged-in/.test(String(v))) failures.push({ identity: r.identity, page: "(boot)", state: r.state, severity: "P1", reason: "session store 仍未登录：" + v });
    curIdent = r.identity;
  }
  const query = r.query && r.query !== "-" ? r.query.replace(/^\?/, "") : "";
  try { openPage(r.page, query, opts); } catch (e) { failures.push({ identity: r.identity, page: r.page, state: r.state, severity: "P1", reason: "open_page 失败：" + e.message.slice(0, 90) }); continue; }
  sleep(SETTLE);
  /* 落点探针偶发返回空串（CLI 通道忙，real 取景时也实测过两次）：空串**不等于**没落在目标页，
     重试一次仍空就记 UNKNOWN 且不打 drift 标 —— 把"没测到"折叠成"测出漂移"会凭空造缺陷。 */
  let landed = String(routeStack(opts) || "");
  if (!landed) { sleep(1500); landed = String(routeStack(opts) || ""); }
  const routeKnown = !!landed && !landed.startsWith("ERR");
  const drift = routeKnown ? !landed.split("|").pop().includes(r.page) : null;
  if (drift === true) failures.push({ identity: r.identity, page: r.page, state: r.state, severity: "P1", reason: `落在 ${landed} ≠ 目标页`, landed });
  if (drift === null) failures.push({ identity: r.identity, page: r.page, state: r.state, severity: "P2", reason: `落点探针没给出可用路由（两次结果 ${JSON.stringify(landed)}）⇒ 该行落点未取证（不得据此说页面没到达）` });

  const preProbe = nodeCount(r.expect, opts);
  const pre = takeShot(join(OUT_DIR, r.identity, `${r.page.replace(/\//g, "_")}__pre.png`));
  /* 选择器解析（本轮实测的两条 IDE 事实决定了这里的形状）：
     · 元素查询**永远只返回第一个命中**：`.post-tool:nth-child(2)`、`.post-tool:last-child` 读到的都是「图片」，
       位置类伪类在这里是无效的 ⇒ 不能靠 nth 定位第 k 个工具。
     · 所以按文本找靶的正确做法是：**换选择器**而不是换序号。TSV 第 5 列允许用 `|` 给多个候选，
       每个候选既原样试、也试 `:nth-child(1..MAXN)`（有些页面确实只有序号能区分），
       取第一个 `text` 含 expectTapText 的候选作为真正要点的选择器。
     · 一个都没找到 ⇒ HARNESS_MISS，并把试过的 (选择器→文本) 列出来：这是取景器的错，不进产品账。 */
  let tapSel = r.tap, tapText = "", tried = [];
  const readText = (sel) => { try { return String(element("text", sel, opts) ?? "").slice(0, 60); } catch (e) { return ""; } };
  const candidates = r.tap.split("|").map((s) => s.trim()).filter(Boolean);
  const expand = [];
  for (const c of candidates) { expand.push(c); if (!/:nth-child/.test(c)) for (let k = 1; k <= MAXN; k++) expand.push(`${c}:nth-child(${k})`); }
  if (r.expectTapText) {
    let hit = null;
    for (const cand of expand) {
      const t = readText(cand);
      if (t) { if (tried.length < 12) tried.push(t.slice(0, 10)); if (!hit && t.indexOf(r.expectTapText) >= 0) { hit = { cand, t }; break; } }
    }
    if (hit) { tapSel = hit.cand; tapText = hit.t; } else tapText = "NOMATCH(tried=" + tried.join(",") + ")";
  } else { tapText = readText(candidates[0] || r.tap); tapSel = candidates[0] || r.tap; }
  const tapMismatch = !!r.expectTapText && tapText.indexOf(r.expectTapText) < 0;
  let tapRes = "ok";
  if (!tapMismatch) { try { element("tap", tapSel, opts, ["--wait", "1"]); } catch (e) { tapRes = "TAP_ERR " + String(e.message).slice(0, 90); } }
  sleep(SETTLE);
  const postProbe = nodeCount(r.expect, opts);
  const file = join(OUT_DIR, r.identity, `${r.page.replace(/\//g, "_")}__${r.state}.png`);
  mkdirSync(dirname(file), { recursive: true });
  const post = takeShot(file);

  const verdict = classifyStateVerdict({ preProbe, postProbe, preHash: pre.hash || null, postHash: post.hash || null, tapMismatch, tapRes, tooSmall: !!(pre.tooSmall || post.tooSmall) });
  if (verdict === "HARNESS_MISS") { harnessMiss++; failures.push({ identity: r.identity, page: r.page, state: r.state, severity: "P1", reason: "取景器点错控件：tap 命中的文本是 " + JSON.stringify(tapText) + "，不含期望 " + JSON.stringify(r.expectTapText) + " ⇒ 本行不得当产品结论，选择器要重定" }); }
  else if (verdict === "PROBE_ERR") { probeErr++; failures.push({ identity: r.identity, page: r.page, state: r.state, severity: "P1", reason: "测量本身失败（不是产品结论）：pre=" + preProbe + " post=" + postProbe + " tap=" + tapRes + " shotPre=" + (pre.err || pre.tooSmall || "ok") + " shotPost=" + (post.err || post.tooSmall || "ok") }); }

  shots.push({
    identity: r.identity, page: r.page, state: r.state, query: query || null, route: landed, routeDrift: drift,
    tapSelector: r.tap, tapResolved: tapSel, expectSelector: r.expect, tapText, expectTapText: r.expectTapText || null, tapMismatch,
    nodeBefore: preProbe, nodeAfter: postProbe, tapResult: tapRes,
    verdict, preFrame: existsSync(join(OUT_DIR, r.identity, `${r.page.replace(/\//g, "_")}__pre.png`)) ? relOf(join(OUT_DIR, r.identity, `${r.page.replace(/\//g, "_")}__pre.png`)) : null,
    preBytes: pre.bytes || null, preHash: pre.hash || null, path: relOf(file), bytes: post.bytes || null, contentHash: post.hash || null,
    at: new Date().toISOString(),
  });
  console.log(`[row] ${r.identity} ${r.page} ${r.state} → ${verdict} (node ${preProbe}→${postProbe}, ${post.bytes || "?"}B${drift ? ", 落点漂移" : ""})`);
}

const man = {
  gitSha: GIT_SHA, workflowVersion: "3.7-cli-states", generatedAt: new Date().toISOString(),
  project: relOf(PROJECT), harness: "wechatide CLI: simulator_open_page + automation_element_action(offset/tap) + automation_evaluate + simulator_screenshot",
  verdictLegend: { APPEARED: "弹层节点动作后出现且像素变化", APPEARED_NOPIXEL: "节点出现但前后帧逐字节相同（截图不含该层）", NOCHANGE: "节点没出现且像素没变（交互未生效）", CHANGED_BUT_NO_NODE: "像素变了但期望节点没出现（换了别的状态）", WAS_THERE: "动作前节点就在（默认态不干净）", PROBE_ERR: "测量失败，不是产品结论", HARNESS_MISS: "取景器点错控件（tap 命中的文本不含 expectTapText），本行结论作废" },
  captureLimitations: ["出图尺寸由 IDE 决定，禁止与 WS 巡检帧跨 harness 比像素", "每行拍前后两帧：判据是「动作改变了什么」，不是「看起来对」"],
  shots, failures,
};
const badPaths = shots.filter((s) => !s.path || !existsSync(join(REPO, s.path)));
console.log(`STATES_ROWS=${rows.length} FRAMES=${shots.length} PROBE_ERR=${probeErr} HARNESS_MISS=${harnessMiss} PATH_BAD=${badPaths.length}`);
const byVerdict = {};
for (const s of shots) byVerdict[s.verdict] = (byVerdict[s.verdict] || 0) + 1;
console.log("STATES_VERDICTS=" + JSON.stringify(byVerdict));
if (shots.length + failures.filter((f) => f.page !== "(boot)").length < rows.length) console.log(`STATES_CONSERVE=FAIL 行 ${rows.length} ≠ 帧 ${shots.length} + 失败若干（有行既没出帧也没记账）`);
else console.log(`STATES_CONSERVE=OK 帧 ${shots.length} + 记账 ${failures.length} 覆盖 ${rows.length} 行`);
if (!badPaths.length && shots.length) writeFileSync(join(OUT_DIR, "manifest-detail.json"), JSON.stringify(man, null, 1));
else { console.log("STATES_RESULT=FAIL reason=有 path 自证不过或零帧，manifest 不落盘"); process.exit(1); }
console.log(`STATES_WRITTEN=${relOf(join(OUT_DIR, "manifest-detail.json"))}`);
console.log(probeErr || harnessMiss
  ? `STATES_RESULT=PARTIAL（PROBE_ERR=${probeErr} HARNESS_MISS=${harnessMiss} —— 这些行不得当产品结论，先修取景器）`
  : "STATES_RESULT=OK");
process.exit(probeErr || harnessMiss ? 1 : 0);
