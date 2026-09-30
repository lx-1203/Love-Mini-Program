/* round-7 执行轮 · 混合传输版（WS 取证据 + CLI 桥出帧）。
 *
 * 为什么混合，全是这一小时里量出来的（notes §15 + diag-two-windows 的实测表）：
 *   · 桥的 routeStack（走 automation_evaluate）刚才 4 个页里 0 个给出答案（两个"空"、两个 ERR），
 *     而同一段时间里 WS 的 currentPage() 3/4 给了正确答案 ⇒ 落点探针换 WS。
 *   · WS 单条 page.$ 6.6–8.1ms，12 条并发 31ms；桥的折叠探针 210ms/条 ⇒ 判点换 WS。
 *   · 出帧不许换：WS 的 screenshot 实测 61s/张且 5 次里 2 次超时，桥是 2.6s/张。
 *
 * 记账口径与 r-exec-cli.mjs 保持一致：一条 EXECUTED 必须要么有帧、要么至少有一个探针答案；
 * 判据里既没点名类名也不要求出帧的记 SKIPPED（不是 EXECUTED）。
 *
 * 批次结局有三类，只有第三类不可采信（分类在 WSX-GATE 区的 classifyBatch，离线夹具真跑过三个方向）：
 *   (a) measured     量到了且有 EXECUTED ⇒ WSX_ADMISSIBLE=yes / WSX_RESULT=OK
 *   (b) judged       每条都有落点或探针答案，只是没有 EXECUTED（合法的全红/全跳）⇒ 同上，可入账
 *   (c) unmeasurable 一整批 route/探针/帧全空（通道或窗口没起来）⇒ WSX_ADMISSIBLE=no 且退出码非 0，
 *                    runner 那句自描述不写"完整跑完"；这类行是通道状态的投影，不许当产品 FAILED 结案
 *                    （口径同 artifact-band.mjs:70「只能记 NOT_SHOOTABLE，不许记成产品 FAILED」、
 *                      r-exec-cli.mjs:335「一行都不跑（跑出来的落点红不可采信）」）。
 *
 * 用法：
 *   node scripts/qa/r-exec-ws.mjs --fidelity <MANIFEST>   # 先做保真对照，不一致就别当默认
 *   node scripts/qa/r-exec-ws.mjs [--only M1,M2] [--limit N] [--redo-holes]
 *   # 开页就绪/早停口径（默认值与理由见 OPEN_POLICY）：
 *   #   --ready-attempts 6 --ready-wait 9000   首个页组的窗口启动等待（合计 45s）
 *   #   --open-attempts 3  --open-wait 4000    后续页组的开页重试
 *   #   --abort-after 3                        连续 N 个页组同因开页失败就早停（0=关掉早停）
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, rmSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { guardUiLease } from "./ui-lease.mjs";
/* 端口来源与 ws-channel-up / shoot-frameplan 同一份实现（配置文件 scripts/qa/ide-port.json 优先，
   env 只做显式覆盖，读不到才回落且留痕）。此前这里是 `process.env.WSX_PORT || "9420"`，
   即"配置文件存在但这个消费者不认它"。 */
import { readIdePort } from "./ide-port-config.mjs";
const IDE_WS_PORT = readIdePort().port;
/* 档位读法与 r-exec-cli.mjs:26/35、ws-channel-up.mjs:33、artifact-band.mjs 自己是同一份实现：
   问的都是 "--project 那包在盘的 config/env.js 声明了哪一档"。
   为什么这条腿也必须问（2026-09-28 实测）：本腿产出的行此前一个 band 字段都没有，
   于是 round-8 那条完整且可采信的 145 行 WS 波次（exec-ws-tap-r8，admissible=yes、
   outcome=measured）被 verify-real-coverage.mjs 扫到（EXEC_ROWS 计入）却一条也认领不了
   ——门只认 /^real(@|$)/ 的 band，没有 band 的行落在"既不算覆盖、也不算欠账"的暗面。
   "backend 字段没有门那边对应物"这一整类证据就这样隐身。 */
import { readApiMode } from "./artifact-band.mjs";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const { openPage, shot, evaluate, mintToken, bootSession, verifyLogin, assertIdentityProducible, observedUserId } = await import("./cli-automator.mjs");

const argv = process.argv.slice(2);
function opt(n, d) { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; }
function flag(n) { return argv.includes("--" + n); }
const PROJECT = opt("project", join(REPO, "apps/client/dist/build/mp-weixin"));
/* 身份必须被机器断言并写进结果，不能靠"上一个进程留下的 storage 状态"——
   桥版执行器就是因为把 mintToken 的返回值当字符串用（忘了 await）才让真实模式整批 not-logged-in，
   详见 scripts/qa/probe-boot-callsite.mjs。这里不做同样的假设。 */
const IDENTITY = opt("identity", "A");
let LOGIN_VERIFY = "(未前置)";
const LABEL = opt("round", "round-7");
const OPS = opt("ops", join(REPO, "reports/audit/round-6/ops"));
/* --ids-file：只跑名单里的 case（一行一个 `MANIFEST#ID` 或 `MANIFEST/ID`，也收 {"cases":[...]}）。
   为什么要有它：SEL_COMPONENT_SCOPE 那批（本轮实测 193 条）元素躲在自定义组件里，CLI 腿按该门
   自己的实测有 90.6% 点不动 ⇒ 只有 WS 腿能点；但在 WS 腿上重跑整轮 1107 例不叫"补这一刀"，叫重来一轮。
   名单必须给守恒读数：没在语料里找到的逐条点名，静默少跑就等于假覆盖。 */
const IDS_FILE = opt("ids-file", "");
let IDS = null;
const idsSeen = new Set();
const OUT_DIR = opt("out", join(REPO, "reports/audit", LABEL, "interact"));
const RES = join(OUT_DIR, "exec-results.json");
function git(a) { try { return execFileSync("git", a.split(" "), { cwd: REPO, encoding: "utf8" }).trim(); } catch { return ""; } }
const GIT_SHA = git("rev-parse --short HEAD") || "unknown";
/* 取景目录默认带上仓库 sha：同一轮里重建过产物再跑，帧会落到新目录，
   而不是按 MANIFEST-ID-after.png 同名把上一批覆盖掉（§19 就是这么丢的证据）。
   要跨产物共用一个目录，显式传 --shots。 */
const SHOT_DIR = opt("shots", join(REPO, "reports/screenshots", LABEL + "-exec-" + GIT_SHA.slice(0, 8)));
const ONLY = (opt("only", "") || "").split(",").filter(Boolean);
const LIMIT = Number(opt("limit", "0"));
const FIDELITY = opt("fidelity", "");
const TAP_MODE = flag("tap");
/* 真实模式跑的时候不能再以 requiresReal 为由跳过——那 236 条正是真实刀唯一能还的债。
   （requiresReal=false 的用例在真实产物里照样会跑，跑挂就如实记，不预先豁免。） */
const REAL_MODE = flag("real");
const TAP_SETTLE = Number(opt("tap-settle", "1400"));
const FRAME_RE = /截图|全帧|出帧|特写|帧/;
const TAP_RE = /点击|输入|滑动|滚动|长按|拖|tap|click|input|scroll|swipe|trigger/;
const BOOT_T = Date.now();

function relOf(p) { return relative(REPO, p).split("\\").join("/"); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* WSX-GATE-BEGIN */
/* 这一区回答的是"这一腿的账能不能入"，不是"产品对不对"：行形状、可测量判定、批次结局分类、
   开页失败签名与早停判定、失败原因的截断口径——全是纯函数（不读模块级状态、不碰设备），
   所以能在 .zcode/tmp/gap-wsx/gate-harness.mjs 里把这段原文字节切出来 import，离线跑正反对照
   （先例：shoot-frameplan.mjs:100-186 的 GATE-BEGIN/GATE-END 区 + 它的 gate-harness）。
   为什么必须有：round-8 stage-8 那条腿 145 行全部 route/observed/evidence 空、durationMs=0、
   WSX_STATS 探针条数=0 出帧=0，脚本却打 WSX_RESULT=OK、runner 写"完整跑完"（真因见
   .zcode/tmp/gap-openpage/REPORT.md：窗口刚被 ws-channel-up 重开、还在 boot，桥侧开页全量
   "timeout waiting for automator response"）。零取证的一批不是"跑完"，也不是产品红。
   口径沿用仓里已有的两句话：artifact-band.mjs:70「就只能记 NOT_SHOOTABLE，不许记成产品 FAILED」
   / r-exec-cli.mjs:335「一行都不跑（跑出来的落点红不可采信）」。 */

/* 行形状（本腿唯一的生产者）：字段名与 r-exec-cli.mjs:173-185 对齐，落账的就是这些。
   band 是第 10 个**入参**而不是在函数里读模块级常量：这个函数住在 WSX-GATE 区，
   离线夹具（.zcode/tmp/gap-wsx/gate-harness.mjs:24-26）把该区原文字节切出来按 data-URL import，
   读一次模块级 BAND 就会让那段自成一个模块、直接 ReferenceError（:88 的"纯函数"约束就断了）。
   缺省成空串而不是某个"看起来对"的档位：忘了传就等于没盖，门那边会把它数成漏盖（见
   verify-real-coverage.mjs 的 REALCOV_BANDLESS_ROWS），不给一个假的 real。
   identity 是第 11 个入参、同样的缺省口径（空串=没盖），因为**档位只是入场券，认领看身份**：
   门的两条轴各读一个字段（verify-real-coverage.mjs:237 judgedLogin=has("A")||has("B")、
   :238 judgedGuest=has("guest")||has("not-logged-in")），两边都不读 prose、也不接受"随便一个非空串"。
   盖法与 r-exec-cli.mjs:176 `identity: IDENTITY` 逐字同一套词表（A/B/guest/none，来自 --identity），
   本仓不另立第二个身份词表。gap-band2 的 F1 实测：只有 band 没有 identity ⇒ COVERED 202→202（+0）。
   第 12 个入参 session 是**会话证据**（{source, verify}，由 :294 的 mkRow 注入，函数体照旧保持纯）：
   identity 是人给的标签，session 是这条腿实际拿到的会话。旧 mintToken 只分 A/非 A（非 A 一律
   /auth/guest-login），所以 `--identity B` 的腿铸的是游客票、行却盖 B，而门的登录轴
   （verify-real-coverage.mjs:237）把 A/B 等量齐观 ⇒ 假记账。门从此用这两个字段核对标签，
   缺证据（老行）只数不撤，见 REALCOV_SESSION_*。 */
export function row(manifest, page, c, status, route, reason, observed, evid, miss, band, identity, session) {
  const s = session || {};
  return {
    suite: "C-" + manifest, manifest, id: c.id, page, tier: c.tier || "normal",
    band: band || "",
    identity: identity || "",
    /* 会话证据与身份标签分家落账（口径同 r-exec-cli.mjs:181）：空串=本行没有证据（老行/没前置）。 */
    loginVerify: String(s.verify || ""), sessionSource: String(s.source || ""),
    requiresReal: c.requiresReal === true, title: String(c.title || "").slice(0, 160),
    status, observed: observed || "", missingEvidence: miss || [], failureReason: reason || "",
    route: route || "", toast: "", console: "", evidence: evid || "", durationMs: 0, transport: "ws+cli-shot",
  };
}
export function evidenceHole(r) {
  return r.status === "EXECUTED" && !r.evidence && !/present\(|absent/.test(String(r.observed || ""));
}
/* 一行"量到了东西"= 落点非空 或 有帧 或 探针给过 present/absent。三个都不满足就是零取证行，
   它既不能当绿也不能当红，只能当"这一腿没跑成"。 */
export const MEASURE_TOKEN_RE = /present\(|absent/;
export function rowMeasured(r) {
  if (!r) return false;
  if (String(r.route || "").trim()) return true;
  if (String(r.evidence || "").trim()) return true;
  return MEASURE_TOKEN_RE.test(String(r.observed || ""));
}
/* 三类结局（只有 (c) 不可采信）：
   (a) measured     —— 量到了，且至少一行 EXECUTED（帧或探针答案）
   (b) judged       —— 每条都有可测量的落点/探针，只是没有 EXECUTED：合法的全红/全跳，判决站得住
   (c) unmeasurable —— 一个页组都没量到（开页全挂 / 落点与探针全无答案）⇒ 通道或窗口没起来
   外加 no-attempt（本腿压根没试任何页组，交给原有"一行都没产生"那道守恒门去红）。 */
export const OUTCOME_UNMEASURABLE = "unmeasurable";
export function classifyBatch({ rows, stats, stopped = false, aborted = false } = {}) {
  const newRows = (rows || []).filter(Boolean);
  const s = stats || {};
  const measuredRows = newRows.filter(rowMeasured);
  const executed = measuredRows.filter((r) => r.status === "EXECUTED").length;
  const attempted = (s.pages || 0) > 0 || !!aborted || newRows.length > 0;
  let outcome;
  if (!attempted) outcome = "no-attempt";
  else if (!measuredRows.length) outcome = OUTCOME_UNMEASURABLE;
  else outcome = executed ? "measured" : "judged";
  const admissible = outcome !== OUTCOME_UNMEASURABLE;
  const lines = [];
  lines.push("WSX_OUTCOME class=" + outcome + " 新行=" + newRows.length + " 可测量行=" + measuredRows.length +
    " EXECUTED=" + executed + " 页组=" + (s.pages || 0) + " 探针条数=" + (s.probes || 0) +
    " 出帧=" + (s.shots || 0) + " 开页失败组=" + (s.openFailGroups || 0) + " 开页重试=" + (s.openRetries || 0) +
    " 早停=" + (aborted ? "yes" : "no") + " 截停=" + (stopped ? "yes" : "no"));
  lines.push("WSX_ADMISSIBLE=" + (admissible ? "yes" : "no") + " " + (admissible
    ? outcome === "measured" ? "有 EXECUTED 且带可复核物件 ⇒ 可入账"
      : outcome === "judged" ? "整批落点/探针都有答案，只是没有 EXECUTED ⇒ 这是判决不是取证失败"
        : "本腿没产生新行（守恒门会另行判红；这不是取证失败，是没取证）"
    : "批次里没有任何一条量到落点/探针/帧 ⇒ 通道或窗口没起来，这批行不许当产品 FAILED 结案，须重跑（口径同 artifact-band.mjs:70 / r-exec-cli.mjs:335）"));
  let runnerNote;
  if (!admissible) runnerNote = "，本批无可采信测量⇒不采信（未完整跑完）";
  else if (aborted) runnerNote = "，开页连续同因失败提前中止（未完整跑完）";
  else if (stopped) runnerNote = "，被 --limit 截停（未完整跑完）";
  else if (outcome === "no-attempt") runnerNote = "，未产生新行（不叫跑完）";
  else runnerNote = "，完整跑完";
  return { outcome, admissible, measured: measuredRows.length, executed, newRows: newRows.length, lines, runnerNote, exit: admissible ? 0 : 2 };
}
/* 开页失败签名：把"同一原因"折叠成一个短串，供早停判定用。
   优先抠 cli-automator 拼在 stdout 里的那句 reason（真原因在这），抠不到就退成"数字归一化后的头 120 字"。 */
export function errorSignature(msg) {
  const s = String((msg && msg.message) || msg || "").replace(/\s+/g, " ").trim();
  const tool = (/^([A-Za-z_][\w.]*)/.exec(s) || [])[1] || (/调用失败/.test(s) ? "桥调用" : "unknown");
  const json = /"(?:message|reason)"\s*:\s*"([^"]{1,120})"/.exec(s);
  const core = json ? json[1] : s.slice(0, 120);
  return tool + "::" + core.replace(/\d+/g, "#").slice(0, 120);
}
/* 早停判定：连续（不是累计）这么多**页组**开页失败且签名一致 ⇒ 判"窗口/通道没起来"，剩下的组别再跑。
   sigs 在任意一次开页成功后由调用方清空，所以这里只需数尾巴。limit<=0 表示关掉早停。 */
export function openAbortVerdict(sigs, limit = 3) {
  const list = (sigs || []).filter(Boolean);
  const last = list[list.length - 1] || "";
  let consecutive = 0;
  for (let i = list.length - 1; i >= 0 && list[i] === last; i--) consecutive++;
  return { abort: !!last && limit > 0 && consecutive >= limit, consecutive, signature: last };
}
/* 截断要保"原因"而不是保"命令回显"：cli-automator.mjs:63-69 是特意把 stdout/stderr 拼在**尾巴**上的
   （头那条 `Command failed: <200+ 字含中文的 exe 路径 + bootstrap>` 等于没有信息），而旧版 :444 又对
   整串做 slice(0,70) 二次截断 ⇒ 145 行的 reason 停在路径中间（83 字 = 13 前缀 + 70），真原因
   {"ok":false,"message":"timeout waiting for automator response"} 被当场销毁。
   这里改成"掐头保尾"：命令回显压成一句（保留 tool 名与非零退出这件事），预算大头留给 stdout（实测原因在
   stdout 的 JSON 里，stderr 只有 banner），没有 stdout/stderr 尾巴时整条就是原因、不掐头只截尾。 */
export const REASON_BUDGET = 320;
export function failReasonOf(err, budget = REASON_BUDGET) {
  const s = String((err && err.message) || err || "").replace(/\s+/g, " ").trim();
  if (!s) return "(没有错误信息)";
  const si = s.indexOf(" | stdout=");
  const ei = s.indexOf(" | stderr=");
  if (si < 0 && ei < 0) return s.slice(0, budget);
  const c1 = si >= 0 ? si : ei;
  const leadRaw = s.slice(0, c1);
  const prefix = (/^(\S+ 调用失败：)/.exec(leadRaw) || [])[1] || "";
  const code = /(?:exited code|exit code)\s+(\d+)/i.exec(leadRaw);
  const proj = /--project\s+(.+?)(?=\s+--|\s*$)/.exec(leadRaw);
  const lead = prefix + "命令非零退出" + (code ? "(exit=" + code[1] + ")" : "") +
    (proj ? "(project=" + String(proj[1]).split(/[\\/]/).filter(Boolean).slice(-1)[0] + ")" : "");
  const outRaw = si >= 0 ? s.slice(si + 10, ei > si ? ei : s.length).trim() : "";
  const errRaw = ei >= 0 ? s.slice(ei + 10).trim() : "";
  const cut = (v, n) => (v.length > n ? v.slice(0, Math.max(0, n - 1)) + "…" : v);
  const leadCap = Math.max(0, Math.round(budget * 0.2));
  const outCap = Math.max(40, Math.round(budget * 0.6) - 10);
  const errCap = Math.max(0, budget - leadCap - outCap - 20);
  let r = cut(lead, leadCap);
  if (outRaw) r += " | stdout=" + cut(outRaw, outCap);
  if (errRaw) r += " | stderr=" + cut(errRaw, errCap);
  return r.trim();
}
/* 就绪重试策略（默认值就是这一份，argv 的 ready-attempts / ready-wait / open-attempts / open-wait /
   abort-after 只做覆盖）：首组 firstAttempts 次、每次静置 firstWaitMs ⇒ (6-1)×9s=45s，正覆盖实测的窗口
   启动区间 2–45s（窗口起来后同样的调用只要 1898–2113ms，见 .zcode/tmp/gap-openpage/probe1、probe2）；
   后续组收紧到 3 次 × 4s；连续 abortAfterGroups 个页组同因开页失败就早停。
   最坏静置 45+2×8=61s，占这条腿 120min 预算（ui-queue.round8-stage8.json 的 timeoutMin）的 0.85%，
   换来的是不再把 145 行同一条不可采信 reason 落进账本。 */
export const OPEN_POLICY = { firstAttempts: 6, firstWaitMs: 9000, attempts: 3, waitMs: 4000, abortAfterGroups: 3 };
/* 盘上行级字段的清点（纯函数，只描述事实、不判好坏）：
   "哪一档"的判定权只留给门（verify-real-coverage.mjs:110 的 REAL_BAND）与执行旗标，
   "哪一身份"的判定权只留给门的两条轴（:237-238），这里若再写一份 /^real/ 或 has("A")
   就出现两个说了算的地方，口径迟早分家。
   rows 里可能含上一腿 merge 进来的旧行 ⇒ 统计的是盘面事实，不是本腿产量。 */
export function fieldCensus(rows, field) {
  const byValue = {};
  let missing = 0;
  for (const r of rows || []) {
    const v = String((r && r[field]) || "");
    if (!v) { missing++; continue; }
    byValue[v] = (byValue[v] || 0) + 1;
  }
  const kinds = Object.keys(byValue).sort();
  return { byValue, kinds, missing };
}
export function bandCensus(rows) { return fieldCensus(rows, "band"); }
/* 身份清点与档位清点同一套形状（missing = 没盖 identity 的行数，门那边数成 REALCOV_IDENTITYLESS_ROWS）。 */
export function identCensus(rows) { return fieldCensus(rows, "identity"); }
/* 身份对账（纯函数，把收尾那四行读数一次算完）：为什么留在 GATE 区、由离线夹具真跑，
   而不是写在 main() 里——换过会话的那条腿只有合并盘上旧行之后才看得出问题，
   而那件事在没有设备的时候也能造出来（.zcode/tmp/gap-identity/verdict-proof.mjs）。
   三条读数分别对应三种错：
     unstamped 本腿新行漏盖身份（生产者忘传，门两条轴都领不到）
     mixed     本腿新行跨两种身份（同一条腿里换过会话）
     disagree  文件级那个标量 identity 在替不属于自己的行说话（续跑/合并把别的身份、
               或压根没盖身份的旧行留在了同一个文件里；后者记成 "?"，与 flush() 的 identities 同源）
   判据口径不在这里：这里只报事实，谁能领哪条轴仍由门说了算（verify-real-coverage.mjs:237-238）。 */
export function identVerdict(newRows, allRows, fileIdentity) {
  const iNew = identCensus(newRows), iAll = identCensus(allRows || []);
  /* 盘上事实要和 flush() 写进文件头的 identities 数组说同一句话：那里把"没盖身份"读成 "?"
     （r-exec-cli.mjs:692 同写法），这里也必须把 missing 并进同一张表，否则漏盖的行
     既不在 kinds 里也不在告警里，头部标量就又没人对账了。 */
  const onDisk = { ...iAll.byValue };
  if (iAll.missing) onDisk["?"] = iAll.missing;
  const lines = [];
  lines.push("WSX_FILE_IDENT 文件级 identity=" + fileIdentity + " 本腿新行=" + (newRows || []).length + " 已盖=" + ((newRows || []).length - iNew.missing) +
    " 漏盖=" + iNew.missing + " 本腿身份=" + (iNew.kinds.map((b) => b + "=" + iNew.byValue[b]).join(" ") || "(全无)") +
    " 盘上全部身份=" + (iAll.kinds.map((b) => b + "=" + iAll.byValue[b]).join(" ") || "(全无)") + " 盘上漏盖=" + iAll.missing);
  if (iNew.missing) lines.push("WSX_IDENT_UNSTAMPED " + iNew.missing + " 条新行没有 identity ⇒ 门的两条身份轴都认领不了它们（哪怕 band=real@…），先修生产者再谈结论");
  if (iNew.kinds.length > 1) lines.push("WSX_MIXED_IDENT 本腿新行跨 " + iNew.kinds.join(",") + " 两种身份 ⇒ 同一腿里换过会话，整批通过率不能当单一身份的数，须按行 identity 拆开算（口径同 r-exec-cli.mjs:698）");
  const disagree = Object.keys(onDisk).filter((k) => k !== String(fileIdentity)).sort();
  if (disagree.length) lines.push("WSX_IDENT_DISAGREE 文件级 identity=" + fileIdentity + " 但盘上有别的身份：" +
    disagree.map((k) => k + "=" + onDisk[k]).join(" ") +
    " ⇒ 头部标量不能替这些行作证，混批文件（含没盖身份的 ?）的整批通过率要按行身份拆开算（混档位的同款害处见 WSX_MIXED_BAND）");
  return { iNew, iAll, onDisk, lines, unstamped: iNew.missing, mixed: iNew.kinds.length > 1, disagree };
}
/* WSX-GATE-END */

/* 载体指纹（本腿的行级 band 从这来）：与 r-exec-cli.mjs:35/176 同一份读法、同一个格式
   `(BAND.mode || "?") + "@" + (BAND.sha8 || "?")`，读的也是同一个 artifact-band.mjs:14。
   两个数要说清楚：mode = --project 那包在盘 config/env.js 的 VITE_API_MODE；
   sha8 = artifact-band.mjs:22 对那份 env.js **字节的 sha256 前 8 位**（产物配置的内容哈希），
   它不是 git sha——本文件上面的 GIT_SHA 才是仓库 sha，两个数各管各的，不许混。
   档位只从 --project 读，绝不按旗标猜：`--real` 决定的是跑不跑 requiresReal 那批，
   它改不了在盘的是哪一档。把旗标当档位写进账，就是门那边最坏的一种数据——
   一行声称 real、实际跑在 mock 载体上（ws-channel-up.mjs:96-100 的 round-8b 事故
   就是这个形状：real 标签 × mock 画面）。 */
const BAND = readApiMode(resolve(PROJECT));
const BAND_STR = (BAND.mode || "?") + "@" + (BAND.sha8 || "?");
/* row() 住在 GATE 区、必须保持纯（见那里的注释），所以档位与身份都由这里注入。
   本腿生产行的唯一入口就是这个包装；再出现裸 row(...) 调用就是漏盖 band/identity，
   门那边会分别数成 REALCOV_BANDLESS_ROWS / REALCOV_IDENTITYLESS_ROWS。
   IDENTITY 是模块级 --identity 的值（:60，缺省 "A"），与 r-exec-cli.mjs:264 同一套旗标同一套词表。
   SESSION 是本腿**实际**拿到的会话证据（铸票端点 + store 实测串），boot 之后才填得上；
   填不上就是空串 ⇒ 行没有可证会话 ⇒ 门数成"不可证"（REALCOV_SESSION_UNPROVEN_ROWS），不认领成已证。 */
const SESSION = { source: "", verify: "" };
const mkRow = (...a) => row(...a, BAND_STR, IDENTITY, SESSION);
/* 旗标 ↔ 档位的两种错配，都只报不改（改执行语义是设备腿的事，离线不许动）：
   · --real 而产物声明非 real ⇒ 这一腿跑的是 mock 载体上的"真实用例"，行仍按 real=false 的档位入账；
   · 产物声明 real 而没带 --real ⇒ requiresReal 整批会被记 SKIPPED
     （r-exec-cli.mjs:726 对同款形状直接判红）。 */
const BAND_FLAG_CONFLICT = REAL_MODE && BAND.mode !== "real";
const BAND_FLAG_UNSERVED = !REAL_MODE && BAND.mode === "real";

/* 就绪/重试/早停的 argv 口径：默认值直接取自 GATE 区的 OPEN_POLICY（同一份数，不另立一套），
   数值理由见那里的注释。桥侧开页在窗口启动期间必然 "timeout waiting for automator response"，
   那是通道状态不是产品判决 ⇒ 首组给足启动时间重试，连续同因失败到第 N 个页组就早停。 */
const OPEN_ATTEMPTS = Math.max(1, Number(opt("open-attempts", String(OPEN_POLICY.attempts))) || OPEN_POLICY.attempts);
const OPEN_WAIT = Math.max(0, Number(opt("open-wait", String(OPEN_POLICY.waitMs))) || 0);
const READY_ATTEMPTS = Math.max(OPEN_ATTEMPTS, Number(opt("ready-attempts", String(OPEN_POLICY.firstAttempts))) || OPEN_POLICY.firstAttempts);
const READY_WAIT = Math.max(0, Number(opt("ready-wait", String(OPEN_POLICY.firstWaitMs))) || 0);
const ABORT_AFTER = Math.max(0, Number(opt("abort-after", String(OPEN_POLICY.abortAfterGroups))));

function automator() {
  try { return require("miniprogram-automator"); } catch { /* fallthrough */ }
  const store = join(REPO, "node_modules", ".pnpm");
  const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
  return hit ? require(join(store, hit, "node_modules", "miniprogram-automator")) : null;
}
const A = automator();
if (!A) { console.log("WSX_RESULT=FAIL reason=找不到 miniprogram-automator"); process.exit(2); }

let mini = null, conns = 0, wsErrs = 0;
async function sess() {
  if (mini) return mini;
  mini = await Promise.race([A.connect({ wsEndpoint: "ws://127.0.0.1:" + IDE_WS_PORT }),
    new Promise((_, rj) => setTimeout(() => rj(new Error("CONNECT_TIMEOUT_8S")), 8000))]);
  conns++;
  return mini;
}
/* WS 会话是单点的：一次断线不能把整轮带走，也不能把已跑的行丢掉（每页组落盘见 flush）。
   注意：绝不 close()——实测 close 会把 9420 那个 IDE 子进程整个带走。 */
async function withRetry(label, fn) {
  for (let a = 0; a < 2; a++) {
    try { const m = await sess(); return await fn(m); }
    catch (e) {
      wsErrs++;
      mini = null;
      if (a === 1) { console.log("WSX_RETRY_FAIL " + label + " :: " + String(e && e.message).slice(0, 80)); return undefined; }
      console.log("WSX_RETRY " + label + " :: " + String(e && e.message).slice(0, 80));
      await sleep(1200);
    }
  }
  return undefined;
}
async function wsRoute() {
  return await withRetry("currentPage", async (m) => { const p = await m.currentPage(); return (p && p.path) || ""; });
}
/* 一个页组只取一次 page 句柄，别每条选择器都重新 currentPage()。
   实测反面教材：把 12 条选择器并发打出去（=24 条并发命令 + 失败重试风暴），
   IDE 的自动化服务直接全线 "timeout waiting for automator response"，12/12 全灭；
   而串行版实测 6.6–8.1ms/条。并发在这条通道上没有收益，只有把通道打死的代价。 */
async function wsPage() {
  return await withRetry("page", async (m) => await m.currentPage());
}
/* 身份前置走 WS 而不是走桥：探针、tap 都发生在这个会话里，用另一条通道写 storage
   等于"在隔壁房间点灯，却说这边亮了"。evaluate 传函数 + 参数，automator 会序列化。 */
async function wsBootSession(token) {
  return await withRetry("bootSession", async (m) => await m.evaluate((t) => {
    try {
      wx.setStorageSync("token", t);
      var app = getApp(); var vm = app["$vm"];
      var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
      var p = vm["$pinia"] || gp["$pinia"];
      var s = p._s.get("session"); if (s && s.bootstrap) { s.bootstrap(); }
      return "boot-ok";
    } catch (e) { return "ERR " + e.message; }
  }, token));
}
async function wsVerifyLogin() {
  return await withRetry("verifyLogin", async (m) => await m.evaluate(() => {
    try {
      var app = getApp(); var vm = app["$vm"];
      var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
      var p = vm["$pinia"] || gp["$pinia"]; var s = p._s.get("session");
      return s && s.isLoggedIn ? "logged-in userId=" + (s.userSession && s.userSession.userId) : "not-logged-in";
    } catch (e) { return "ERR " + e.message; }
  }));
}
/* 交互切片用：WS 的元素.tap()。不可逆的账号级动作先禁触——
   不是为了把红的藏起来，而是这类动作会把后面几百条用例共用的会话打掉，
   那一次跑就只剩下"注销成功"这一帧；被禁的条目一律显式记 SKIPPED-DENY，不混进已跑。
   清单本体在 scripts/qa/deny-tap.cjs（与 r-exec-cli.mjs 同一份，词表不再两处各抄一份）；
   其中「清空」按**宾语**判：判据自己指明了 <input>/<textarea>/v-model= 且清的就是那个框
   或框里的内容 ⇒ 放行；清的是 storage/会话/历史/数据源，或「清空」本身就是被 tap 的
   确认按钮 ⇒ 照旧禁触。证明不了宾语是字段的默认拦。详见该文件头注。 */
const { denyTapMatch } = require("./deny-tap.cjs");
async function wsTap(sel) {
  return await withRetry("tap " + sel, async (m) => {
    const p = await m.currentPage();
    const el = await p.$(sel);
    if (!el) return "NO_ELEMENT";
    await el.tap();
    return "tapped";
  });
}
function classesOf(text) {
  const seen = new Set();
  for (const m of String(text || "").matchAll(/\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__|--)[a-z0-9_-]+)/g)) seen.add("." + m[1]);
  return [...seen];
}
/* 判点：串行问一遍；连续 3 条拿不到答案就判整组探针失效（不逐条重试，避免重试风暴） */
async function probeSet(pageObj, selectors) {
  const out = {};
  if (!pageObj) { selectors.forEach((s) => { out[s] = "no-answer"; }); return { map: out, broken: true }; }
  let consecErr = 0;
  for (const s of selectors) {
    try {
      const list = await pageObj.$$(s);
      const n = Array.isArray(list) ? list.length : (list ? 1 : 0);
      out[s] = n > 0 ? "present(" + n + ")" : "absent";
      consecErr = 0;
    } catch (e) {
      out[s] = "ERR:" + String(e && e.message).slice(0, 30);
      if (++consecErr >= 3) { selectors.slice(selectors.indexOf(s) + 1).forEach((x) => { out[x] = "no-answer"; }); return { map: out, broken: true }; }
    }
  }
  return { map: out, broken: false };
}
/* 桥的折叠探针（与 r-exec-cli.mjs 同一形态）：只为保真对照而存在，跑完这轮就该退役 */
function cliProbe(selectors) {
  if (!selectors.length) return {};
  const start = "() => { const app = getApp(); const bag = {}; app.__probeBag = bag; " +
    "const sels = " + JSON.stringify(selectors) + "; " +
    "sels.forEach(function (s, i) { try { const q = wx.createSelectorQuery(); " +
    "q.selectAll(s).fields({ size: true }, function (res) { bag[i] = (Array.isArray(res) ? res.length : (res ? 1 : 0)); }); q.exec(); } " +
    "catch (e) { bag[i] = 'ERR'; } }); return 'started:' + sels.length; }";
  const read = "() => JSON.stringify(getApp().__probeBag || {})";
  try { evaluate(start, { project: PROJECT }); } catch (e) { return { __err: String(e.message).slice(0, 60) }; }
  /* 桥不会 await 返回 Promise 的 fn-source，只能先把回调写进袋、再同步等一会儿去读 */
  const t0 = Date.now();
  while (Date.now() - t0 < 1500) { /* 忙等：这条只在保真对照里跑，一轮一次 */ }
  let bag = {};
  try { bag = JSON.parse(String(evaluate(read, { project: PROJECT }))); } catch (e) { return { __err: "read:" + String(e.message).slice(0, 40) }; }
  const out = {};
  selectors.forEach((s, i) => {
    out[s] = typeof bag[i] === "number" ? (bag[i] > 0 ? "present(" + bag[i] + ")" : "absent") : String(bag[i] === undefined ? "no-answer" : bag[i]);
  });
  return out;
}
function verdictOf(ans) {
  const s = String(ans);
  if (s.startsWith("present(")) return "present";
  if (s === "absent") return "absent";
  return "no-answer";
}

/* 行形状与 evidenceHole 已进 WSX-GATE 区（离线夹具要用真的那个，不是影子实现）。 */

/* 出帧统一走桥（WS 出帧实测 61s/张）。>3000B 才算证据，这条口径与 r-exec-cli 一致 */
function shootFor(name, id) {
  const miss = [];
  const f = join(SHOT_DIR, name + "-" + id + "-after.png");
  try {
    rmSync(f, { force: true });
    shot(f, { project: PROJECT });
    const sz = existsSync(f) ? statSync(f).size : 0;
    if (sz > 3000) { stats.shots++; return { evid: relOf(f) + "(" + sz + "B)", miss }; }
    miss.push(relOf(f) + "(仅 " + sz + "B，不当证据)");
  } catch (e) { miss.push(relOf(f) + "(未写出:" + String(e.message).slice(0, 50) + ")"); }
  return { evid: "", miss };
}
/* 交互型用例：点 action 里点名的第一个元素，等页面稳定后重问判点并必出一帧。
   判点没变 + 有帧 = 这条交互"发生了但没改变可观测状态"，仍是 EXECUTED（证据在帧里），
   但不许记成"交互生效"——那要看 expected 到底断言了什么，属于人工判读层。 */
async function runTapCase(name, page, c, route, cls) {
  const actionText = String(c.action || "");
  const targets = classesOf(actionText);
  const denyWord = denyTapMatch(actionText);
  if (denyWord) {
    return { bucket: "tapDeny", row: mkRow(name, page, c, "SKIPPED", route, "动作命中不可逆清单（注销/解绑/清空/登出）⇒ 禁触，否则后面几百条共用的会话会被打掉" +
      " | 命中词=" + denyWord + "（清单唯一来源 scripts/qa/deny-tap.cjs；「清空」按宾语判）", "top=" + route + " | deny-tap | action=" + actionText.slice(0, 60)) };
  }
  if (!targets.length) {
    return { bucket: "tapNoTarget", row: mkRow(name, page, c, "SKIPPED", route, "交互动词但 action 里没点名可点元素（没有 selector 就没法把这次点击归属到某个东西）⇒ 待把判据收紧", "top=" + route + " | dom: (action 无类名) | tap-skipped") };
  }
  const sel = targets[0];
  const pre = await probeSet(await wsPage(), [sel]);
  if (pre.map[sel] !== "absent" && String(pre.map[sel]).startsWith("present") === false) {
    return { bucket: "tapNoTarget", row: mkRow(name, page, c, "SKIPPED", route, "目标元素探针无答案（" + pre.map[sel] + "）⇒ 通道没准备好，不盲点", "top=" + route + " | pre: " + sel + ":" + pre.map[sel] + " | tap-skipped") };
  }
  if (pre.map[sel] === "absent") {
    return { bucket: "tapNoTarget", row: mkRow(name, page, c, "SKIPPED", route, "目标元素 " + sel + " 当前不在页上（可能要先展开/滚动/登录态）⇒ 不盲点，待补前置态", "top=" + route + " | pre: " + sel + ":absent | tap-skipped") };
  }
  const t = await wsTap(sel);
  if (t !== "tapped") {
    return { bucket: "tapFail", row: mkRow(name, page, c, "SKIPPED", route, "tap 未成功：" + String(t) + " ⇒ 通道/元素问题，不算交互失败也不算通过", "top=" + route + " | tap=" + String(t) + " | tap-skipped") };
  }
  await sleep(TAP_SETTLE);
  const routeAfter = String((await wsRoute()) || "");
  const all = [...new Set(cls.concat(targets))];
  const post = await probeSet(await wsPage(), all);
  const { evid, miss } = shootFor(name, c.id);
  const observed = "top=" + routeAfter + (routeAfter !== route ? "（点击后从 " + route + " 变了）" : "") +
    " | tap=" + sel + " | dom: " + all.map((s) => s + ":" + (post.map[s] || "no-answer")).join(" ") + " | post-tap";
  if (!evid) {
    return { bucket: "tapNoFrame", row: mkRow(name, page, c, "SKIPPED", routeAfter, "点击后出帧失败（miss=" + miss.join(";") + "）⇒ 交互型没有帧就不算证据", observed, "", miss) };
  }
  return { bucket: "executed", row: mkRow(name, page, c, "EXECUTED", routeAfter, "", observed, evid, miss) };
}

if (!existsSync(join(PROJECT, "app.json"))) { console.log("WSX_RESULT=FAIL reason=--project 不是已编译产物：" + PROJECT); process.exit(2); }
/* 身份标签先自证，位置在**建目录/取租约之前**（拒跑就要真的什么都没发生：不建 OUT_DIR、不碰
   tmp/qa/locks、一行不跑）。形状照 artifact-band.mjs:59 assertGuestCapable 与 r-exec-cli.mjs:265 那条前置。
   本轮实测的根因：mintToken 旧写法只分 "A" 与"不是 A"，非 A 一律 POST /auth/guest-login ⇒
   `--identity B` 的腿铸到的是游客会话、行却盖 identity:"B"，而门的登录轴（verify-real-coverage.mjs:237）
   把 A/B 等量齐观 ⇒ 每一次"B 轴已判"都可能是游客穿着 B 的标签领了登录轴的钱（假绿，不是假红）。
   现在 B 必须用 B 的凭据走 phone-login（scripts/qa/r-exec.cjs:IDENT_DEFS），读不到就抛 ⇒ 这条腿当场拒跑。 */
const PRODUCIBLE = assertIdentityProducible(IDENTITY, REPO);
if (!PRODUCIBLE.ok) {
  console.log("WSX_RESULT=FAIL reason=identity=" + IDENTITY + " 铸不出与之相符的会话：" + PRODUCIBLE.reason +
    " ⇒ 未建目录、未取租约、未写任何文件、一行不跑（把 B 行盖成游客票或 A 票都是伪造证据）");
  process.exit(2);
}
console.log("WSX_IDENT_PRODUCIBLE=" + IDENTITY + (PRODUCIBLE.mints
  ? " 铸票端点=" + PRODUCIBLE.source + "（凭据来源=" + PRODUCIBLE.credFrom + "）"
  : " 不铸票 ⇒ 按未登录画面跑"));
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SHOT_DIR, { recursive: true });
const prior = existsSync(RES) ? JSON.parse(readFileSync(RES, "utf8")) : { results: [] };
if (flag("redo-holes")) {
  const before = (prior.results || []).length;
  prior.results = (prior.results || []).filter((r) => !evidenceHole(r));
  console.log("WSX_VOIDED " + (before - prior.results.length) + " 条 EXECUTED-无证据");
}
/* 增量补跑用：同一份结果文件里，只把"上一刀没跑的那类"退回待跑，
   不动已 EXECUTED 的行（否则等于拿新帧把旧结论冲掉，历史就没了）。 */
for (const [k, re] of [["redo-taps", /^action 含交互动词/], ["redo-real", /^requiresReal/]]) {
  if (!flag(k)) continue;
  const before = (prior.results || []).length;
  prior.results = (prior.results || []).filter((r) => !(r.status === "SKIPPED" && re.test(String(r.failureReason || ""))));
  console.log("WSX_VOIDED_" + k + " " + (before - prior.results.length) + " 条（退回待跑，本轮重新产生状态）");
}
const done = new Set((prior.results || []).map((r) => r.manifest + "|" + r.id));
const rows = [];
const stats = { executed: 0, failed: 0, skipTap: 0, skipReal: 0, skipRoute: 0, skipNoCrit: 0, skipMiss: 0, tapDeny: 0, tapNoTarget: 0, tapFail: 0, tapNoFrame: 0, pages: 0, probes: 0, shots: 0, openFailGroups: 0, openRetries: 0 };
const SKIP_KEYS = ["skipTap", "skipReal", "skipRoute", "skipNoCrit", "skipMiss", "tapDeny", "tapNoTarget", "tapFail", "tapNoFrame"];
const skipTotal = () => SKIP_KEYS.reduce((a, k) => a + stats[k], 0);

function flush(cls) {
  const m2 = new Map();
  for (const r of [...(prior.results || []), ...rows]) m2.set(r.manifest + "|" + r.id, r);
  /* runner 这句是自描述，不是判决：只有"可采信且没被截停/早停"才许写"完整跑完"（缺陷①的假绿就在这行字上）。
     没有分类结果（增量落盘/异常收尾）就绝不自称跑完。 */
  const note = cls ? cls.runnerNote : "，增量落盘";
  try {
    writeFileSync(RES, JSON.stringify({ round: LABEL, gitSha: GIT_SHA, identity: IDENTITY,
      /* 文件级也留一份档位与出处（口径同 r-exec-cli.mjs:387/699）：行级 band 是门的认领依据，
         文件级 project 让事后的人能拿 sha8 回到那包 env.js 复核——不然这个数只是一个猜不透的哈希。
         注意 merge 进来的上一腿旧行**不会被这里改写**：band/identity 只在 row() 生产那一刻盖，
         补跑/续跑把历史行的档位或身份刷成本腿的档位，就等于伪造证据。
         identities 是**行级事实的清点**（口径同 r-exec-cli.mjs:387 的 identities 与 :699 的 fileBands）：
         上面那个标量 identity 会替整批行说话，而它替说话的资格要靠这份清点来对账
         （对不上就在收尾打 WSX_IDENT_DISAGREE。事故原文见 r-exec-cli.mjs:687-698 的注释：
         头部 identity=A、里面 38 行是游客腿跑出来的）。"?" 是本仓既有的"没盖身份"哨兵
         （r-exec-cli.mjs:692 同写法），门的认领判点读到的也是这个数。 */
      identities: [...new Set([...m2.values()].map((r) => String(r.identity || "?")))].sort(),
      project: relOf(resolve(PROJECT)), band: BAND_STR,
      loginVerify: LOGIN_VERIFY, updatedAt: new Date().toISOString(),
      admissible: cls ? cls.admissible : null, outcome: cls ? cls.outcome : null,
      runner: "scripts/qa/r-exec-ws.mjs（WS 取证 + 桥出帧" + note + "）", results: [...m2.values()] }, null, 1));
  } catch (e) { console.log("WSX_FLUSH_ERR " + String(e.message).slice(0, 80)); }
  return [...m2.values()];
}

async function main() {
  const files = (ONLY.length ? ONLY : readdirSync(OPS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))).sort();
  if (!files.length) { console.log("WSX_RESULT=FAIL reason=没有要跑的 manifest（空扫描集不得占设备）"); process.exit(2); }
  /* 名单先对语料核一遍，再占设备：名单里的 id 全都不在语料 ⇒ 这一腿会交出 0 行却"看起来成功了"。 */
  if (IDS_FILE) {
    const p = (/^\w:[\\/]/.test(IDS_FILE) || IDS_FILE.startsWith("/")) ? IDS_FILE : join(REPO, IDS_FILE);
    if (!existsSync(p)) { console.log("WSX_RESULT=FAIL reason=--ids-file 读不到 " + IDS_FILE + "（路径写错不许当成「全跑」）"); process.exit(2); }
    const raw = readFileSync(p, "utf8").trim();
    let list = [];
    try { const j = JSON.parse(raw); list = Array.isArray(j) ? j : (j.cases || j.ids || []); }
    catch { list = raw.split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith("#")); }
    /* 名单行允许三种写法：MANIFEST#ID、MANIFEST/ID、MANIFEST ID。
       分隔符按"切开再拼 |"处理，不能直接把空白删掉——那是上一版在这里犯的错
       （负例实测 PAGES-HOME-INDEX H13 被拼成 PAGES-HOME-INDEXH13，好名单也会被判成找不到）。 */
    IDS = new Set(list.map((x) => String(x).trim().split(/[/#\s]+/).filter(Boolean).join("|").toUpperCase()).filter(Boolean));
    if (!IDS.size) { console.log("WSX_RESULT=FAIL reason=--ids-file 解析出 0 条 ⇒ 空名单不许占设备"); process.exit(2); }
    const corpus = new Map();
    for (const name of files) {
      try {
        const mf = JSON.parse(readFileSync(join(OPS, name + ".json"), "utf8"));
        for (const c of (mf.cases || [])) corpus.set((name + "|" + c.id).toUpperCase(), c);
      } catch { console.log("WSX_IDS_SKIP_FILE " + name + "（语料读不到，名单核对不到它）"); }
    }
    const missing = [...IDS].filter((k) => !corpus.has(k));
    console.log("WSX_IDS_FILE " + IDS_FILE + " 名单=" + IDS.size + " 在语料=" + (IDS.size - missing.length) + " 找不到=" + missing.length);
    if (missing.length) {
      for (const k of missing.slice(0, 12)) console.log("  WSX_IDS_MISSING " + k);
      if (missing.length > 12) console.log("  WSX_IDS_MISSING …另 " + (missing.length - 12) + " 条未逐条点名");
      console.log("WSX_RESULT=FAIL reason=名单里 " + missing.length + " 条不在本轮语料里（判据改号或名单拼错）⇒ 静默少跑就是假覆盖");
      process.exit(2);
    }
    /* 名单腿必须尊重判据台上已经存在的两种口径，否则这一把 WS 腿会把"别人家身份的判点"和
       "已经盖章说这条通道做不了的判点"一起认领成自己的结果——那是把噪声重新包装成证据。
       这里选择整批拒绝而不是逐行静默跳过：名单是人写的，写错了要让人当场知道。 */
    const wrongId = [...IDS].filter((k) => {
      const c = corpus.get(k); const ids = Array.isArray(c && c.identities) ? c.identities.map(String) : [];
      return ids.length > 0 && !ids.includes(String(IDENTITY));
    });
    if (wrongId.length) {
      for (const k of wrongId.slice(0, 12)) console.log("  WSX_IDS_WRONG_IDENTITY " + k + " 标=" + JSON.stringify((corpus.get(k) || {}).identities) + " 本腿=" + IDENTITY);
      console.log("WSX_RESULT=FAIL reason=名单里 " + wrongId.length + " 条的身份适用范围不含本腿 identity=" + IDENTITY + " ⇒ 这一腿不能替它们作证（载具：tag-ops-identity-scope.mjs 标的 identities）");
      process.exit(2);
    }
    const stamped = [...IDS].filter((k) => { const c = corpus.get(k) || {}; return c.automatable === false; });
    if (stamped.length) {
      for (const k of stamped.slice(0, 12)) console.log("  WSX_IDS_NOT_AUTOMATABLE " + k + " :: " + String((corpus.get(k) || {}).notAutomatableFrom || "(没记出处)").slice(0, 60));
      console.log("WSX_RESULT=FAIL reason=名单里 " + stamped.length + " 条已被判据台盖章「不可自动化」⇒ 再发一次交互只会把已有裁定重新包装成失败证据");
      process.exit(2);
    }
    console.log("WSX_IDS_GUARD=OK 身份口径与不可自动化盖章都对上（名单 " + IDS.size + " 条都能由 identity=" + IDENTITY + " 这一腿认领）");
  }
  /* WS 通道与 CLI 桥驱动的是同一台模拟器：并发不报错，只互相换页 ⇒ 排队用同一把租约。
     （身份标签能不能铸，早在 :505 取租约之前就判过了 —— WSX_IDENT_PRODUCIBLE。） */
  guardUiLease({ owner: "r-exec-ws-" + LABEL, tag: "WSX_LEASE", failTag: "WSX" });
  console.log("[boot] sha=" + GIT_SHA + " project=" + relOf(PROJECT) + " transport=ws-route+ws-probe+cli-shot");
  /* 档位自证：开跑前就把"这一腿的每一行会盖成什么 band、这个数是从哪个文件读的"打出来。
     门那边按 band 认领覆盖（verify-real-coverage.mjs:110 /^real(@|$)/），所以这行字就是
     本腿能不能入账的预告，不等跑完 90 分钟才发现 145 行全是白跑的（exec-ws-tap-r8 的形状）。 */
  console.log("WSX_BAND_STAMP band=" + BAND_STR + " 读自=" + relOf(BAND.envFile) +
    " 声明档位=" + (BAND.mode || "(env.js 读不到)") + " viteMode=" + (BAND.viteMode || "(读不到)") +
    " 旗标--real=" + (REAL_MODE ? "on" : "off") + "（sha8 是这份 env.js 的内容哈希，不是 git sha=" + GIT_SHA + "）");
  if (!BAND.mode) console.log("WSX_BAND_WARN 读不到 VITE_API_MODE ⇒ 每行盖成 " + BAND_STR +
    "，门的 real 认领与 mock 认领都不会算它（宁可无档位，不猜档位；artifact-band.mjs:13 同口径）");
  if (BAND_FLAG_CONFLICT) console.log("WSX_BAND_WARN 旗标与载体不符：--real 承诺跑 requiresReal 那批，" +
    "而 --project 那包声明的是 " + (BAND.mode || "读不到") + " 档 ⇒ 行仍按 " + BAND_STR + " 入账（以载体为准），" +
    "这一腿量到的不是真实模式，门不会认它；要真实模式的证据只能换 --project apps/client/dist/build/mp-weixin-real 重跑");
  if (BAND_FLAG_UNSERVED) console.log("WSX_BAND_WARN 载体是 real 档（" + BAND_STR + "）但没带 --real ⇒ requiresReal 整批记 SKIPPED；" +
    "那条跳过原因写的「本切片只跑 mock 产物」在这条腿上不成立（同款事故见 r-exec-cli.mjs:36-41），别拿这句当结论");
  /* 身份自证（与档位同一件事，但它是**认领的那一步**）：band 只回答"这行是真档跑的"，
     门还问"是谁这一腿跑的"——verify-real-coverage.mjs:237 登录轴=A/B、:238 游客轴=guest/not-logged-in。
     只盖档位不盖身份的波次照样 +0（gap-band2 F1 实测：COVERED 202→202，补 identity 才 +5），
     所以这一行同样是"能不能入账"的预告，而不是装饰。词表由门说了算，本腿不自创写法。 */
  console.log("WSX_IDENT_STAMP identity=" + IDENTITY + "（旗标 --identity，缺省 A；盖法同 r-exec-cli.mjs:176/296）" +
    " ⇒ 每行都盖这个数，门的登录轴只认 A/B、游客轴只认 guest/not-logged-in，两轴各要一条（未标 identities 的判据）");
  const r0 = await wsRoute();
  if (r0 === undefined) { console.log("WSX_RESULT=FAIL reason=WS 通道连不上；先跑 node scripts/qa/ws-channel-up.mjs（别用 close()）"); process.exit(2); }
  console.log("[boot] ws 当前页=" + r0);

  /* 身份前置：铸真 token → 写进这个 WS 会话 → 断言 store 认了。断言不成立就不跑一行，
     因为未登录画面不能当已登录证据（桥版执行器就是栽在没 await mintToken 上）。 */
  if (IDENTITY === "none") {
    LOGIN_VERIFY = "skipped-by-flag";
    SESSION.source = "no-mint"; SESSION.verify = LOGIN_VERIFY;
    console.log("[boot] identity=none ⇒ 不写会话，按游客档跑，落点一律按未登录读");
  } else {
    let t = "", minted = null;
    /* 标签原样传给 mintToken（旧写法 `IDENTITY === "B" ? "B" : "A"` 外面还套着 mintToken 内部的"非 A 即游客"，
       两道合起来让任何非 A 标签都铸到游客票）。mintToken 现在会：A/B 走 phone-login 各自那对凭据、
       guest 走 guest-login、别的标签直接抛。 */
    try { minted = await mintToken(IDENTITY, REPO, "r7-ws-" + LABEL); t = minted.token; }
    catch (e) { console.log("WSX_RESULT=FAIL reason=铸 token 失败：" + String(e.message).slice(0, 130) + " ⇒ 一行都不跑"); process.exit(2); }
    SESSION.source = String(minted.source || "");
    let b = await wsBootSession(t);
    if (b === undefined) { b = bootSession(t, { project: PROJECT }); console.log("[boot] WS 写会话没答，退回桥写入（下方 verify 仍以 WS 为准）"); }
    let v = await wsVerifyLogin();
    if (v === undefined) { v = "(WS 无答案，桥值=" + verifyLogin({ project: PROJECT }) + ")"; }
    LOGIN_VERIFY = String(v);
    SESSION.verify = LOGIN_VERIFY;
    console.log("[boot] " + b + " identity=" + IDENTITY + " mint=" + SESSION.source + " 铸到userId=" + minted.userId + " verify=" + LOGIN_VERIFY);
    if (!/^logged-in/.test(LOGIN_VERIFY)) {
      console.log("WSX_RESULT=FAIL reason=store 报 " + LOGIN_VERIFY + " ⇒ 整批不跑（游客档请用 --identity guest，真游客画面用 r-exec-cli.mjs --identity guest）");
      process.exit(2);
    }
    /* store 里那个会话必须就是这次铸出来的那张票（口径同 r-exec-cli.mjs 的 obsUser 核对）：
       对不上是"上一个进程留下的 storage 状态"（:57 记过同款事故），标签就不能作证 ⇒ 整批不跑。 */
    const obsUser = observedUserId(LOGIN_VERIFY);
    if (obsUser && minted.userId && obsUser !== String(minted.userId)) {
      console.log("WSX_RESULT=FAIL reason=identity=" + IDENTITY + " 要的是 userId=" + minted.userId + "（" + SESSION.source + "）的会话，"
        + "store 实测 userId=" + obsUser + " ⇒ 标签与可证会话不符，一行都不跑");
      process.exit(2);
    }
  }
  /* 盖出去的身份与这条腿**量到的**会话对不对得上账（只报、不改执行语义）：
     WS 腿没有 CLI 那道游客前置（r-exec-cli.mjs:332 assertGuestCapable + :343 clearSession +
     :348 要求 not-logged-in），所以 --identity guest 在本腿走的是"铸 guest-login token + 断言 logged-in"
     那一支——会话是登录了的游客账号，不是清了会话的游客画面，而门的游客轴照样认这个数。
     另一头 identity=none 量的确实是未登录画面，但词表里没有 none ⇒ 两轴都不认领（不是产品红，是白跑）。
     这两句都是为了让"身份"这一格在落账前就有出处可查，别等门 +0 才发现（同 WSX_BAND_WARN 的位置）。 */
  if (IDENTITY === "guest" && /^logged-in/.test(LOGIN_VERIFY)) console.log("WSX_IDENT_WARN identity=guest 而 store 报 " + LOGIN_VERIFY +
    " ⇒ 这一腿盖的是「游客」，量的是 guest-login 登录态（本腿没有 CLI 那道 assertGuestCapable 前置）；门的游客轴会认这些行，" +
    "要真游客画面（清会话 + not-logged-in）只能走 r-exec-cli.mjs --identity guest 那条前置，别把本腿当游客账");
  if (IDENTITY === "none") console.log("WSX_IDENT_WARN identity=none ⇒ 行按未登录画面跑，但门的认领词表是 A/B（登录轴）与 guest/not-logged-in（游客轴）" +
    "（verify-real-coverage.mjs:237-238）⇒ 这一腿对两条轴都 +0；要游客轴的账得把旗标写成 --identity guest（并看上一条）");
  if (IDENTITY === "B") console.log("WSX_IDENT_B proven mint=" + SESSION.source + " store=" + LOGIN_VERIFY +
    " ⇒ B 这一腿现在铸的是 phone-login 的 B 票（凭据读自 scripts/qa/r-exec.cjs:IDENT_DEFS.B，声明 userId=100159），"
    + "铸不出就已在取租约前拒跑（WSX_IDENT_PRODUCIBLE）；门核对行上的 sessionSource/loginVerify 后才认登录轴的钱"
    + "（verify-real-coverage.mjs 的 REALCOV_SESSION_*）。旧版这条只打 WARN、把 A/非 A 的分叉留给下一轮，"
    + "于是每条盖 B 的行其实是游客会话——那条假记账到此不可能再发生，发生了也会被门数成 CONTRADICT。");

  if (FIDELITY) {
    /* 保真对照：同一时刻同一页，WS 并发 $$ 与桥折叠探针必须给出同样的 present/absent 结论。
       不一致 ⇒ 不许把 WS 当默认传输（这一条是 #36 定的规矩，不能因为 WS 快就绕过）。 */
    const mf = JSON.parse(readFileSync(join(OPS, FIDELITY + ".json"), "utf8"));
    const byPage = {};
    for (const c of (mf.cases || [])) (byPage[c.page] = byPage[c.page] || []).push(c);
    let cmp = 0, diff = 0, bothNoAnswer = 0;
    const diffs = [];
    for (const page of Object.keys(byPage).slice(0, Number(opt("fidelityPages", "2")))) {
      /* 开页偶发整批失败是这条通道的已知行为（实测这一轮就两次），一次失败不等于这一页不能对照：
         重试两次，仍失败才跳过——跳过要留 FIDELITY_SKIP 的痕，不能悄悄少样本。 */
      let opened = false, lastErr = "";
      for (let a = 0; a < 2 && !opened; a++) {
        try { openPage(page, "", { project: PROJECT }); opened = true; }
        catch (e) { lastErr = failReasonOf(e, 200); console.log("FIDELITY_OPEN_RETRY(" + a + ") " + page + " :: " + lastErr); await sleep(2000); }
      }
      if (!opened) { console.log("FIDELITY_SKIP page=" + page + " 开页两次都失败：" + lastErr); continue; }
      await sleep(2500);
      const sels = [...new Set(byPage[page].flatMap((c) => classesOf(c.action + " " + c.expected)))].slice(0, 24);
      if (!sels.length) { console.log("FIDELITY_SKIP page=" + page + " 没有点名类名"); continue; }
      const wsObj = await probeSet(await wsPage(), sels);
      const ws = wsObj.map;
      const cl = cliProbe(sels);
      const top = await wsRoute();
      console.log("FIDELITY page=" + page + " sels=" + sels.length + " route=" + top + " routeOk=" + (String(top || "").includes(page)) +
        " ws探针组失效=" + (wsObj.broken ? "yes" : "no"));
      for (const s of sels) {
        const a = verdictOf(ws[s]), b = verdictOf(cl[s]);
        if (a === "no-answer" && b === "no-answer") { bothNoAnswer++; continue; }
        cmp++;
        if (a !== b) { diff++; if (diffs.length < 12) diffs.push(page + " " + s + " ws=" + a + " cli=" + b); }
      }
    }
    console.log("FIDELITY_TOTAL 可比=" + cmp + " 不一致=" + diff + " 两边都无答案=" + bothNoAnswer);
    diffs.forEach((d) => console.log("FIDELITY_DIFF " + d));
    console.log(cmp < 8 ? "FIDELITY=TOO_FEW_SAMPLES 可比样本 <8，这次对照不算数（别拿它当通过）"
      : (diff === 0 ? "FIDELITY=PASS 逐例结论一致 ⇒ 允许把 WS 当取证默认传输" : "FIDELITY=FAIL 有 " + diff + " 条不一致 ⇒ WS 不许当默认，先解释每一条"));
    /* 对照跑完必须真的退出：WS 会话按规矩不许 close()，事件循环会一直挂着把设备占住
       （实测两次对照都是靠外层 timeout 才结束的）。 */
    process.exit(cmp >= 8 && diff > 0 ? 2 : 0);
  }

  let budget = LIMIT > 0 ? LIMIT : Infinity;
  let stopped = false;
  /* aborted=开页连续同因失败早停；openFailSigs=逐组的开页失败签名（一次成功即清空，早停只数"连续"） */
  let aborted = false;
  let abortedAfter = 0;   // 早停时那一段"连续同因失败"的组数（不是累计失败组数）
  const openFailSigs = [];
  let groupNo = 0;
  for (const name of files) {
    if (stopped) break;
    let mf;
    try { mf = JSON.parse(readFileSync(join(OPS, name + ".json"), "utf8")); } catch { console.log("SKIP-MANIFEST unreadable " + name); continue; }
    const byPage = {};
    for (const c of (mf.cases || [])) (byPage[c.page] = byPage[c.page] || []).push(c);
    for (const page of Object.keys(byPage)) {
      if (stopped) break;
      let todo = byPage[page].filter((c) => !done.has(name + "|" + c.id));
      if (IDS) {
        /* 名单之外的一条都不跑：换页成本省下来，而且"这一腿补的是哪一刀"说不说得清取决于此。
           idsSeen 记"名单里有哪些在本轮语料中真的遇上了"（不管此前跑没跑过），
           末尾用它核对守恒 ⇒ 静默少跑会变成一条红而不是一次成功。 */
        for (const c of byPage[page]) {
          const k = (name + "|" + c.id).toUpperCase();
          if (IDS.has(k)) idsSeen.add(k);
        }
        todo = todo.filter((c) => IDS.has((name + "|" + c.id).toUpperCase()));
      }
      if (!todo.length) continue;
      stats.pages++;
      groupNo++;
      console.log("WSX_GROUP_START page=" + page + " 待跑=" + todo.length + " 累计=" + ((Date.now() - BOOT_T) / 60000).toFixed(1) + "min");
      /* 开页就绪等待（缺陷③）：窗口刚被 ws-channel-up/open-project-window 重开时，桥侧 simulator_open_page
         只会回 "timeout waiting for automator response"（实测 2–45s 后同样的调用 1.9–2.1s 就成），
         那是通道状态不是产品判决 ⇒ 重试到有答案为止：首个页组按 READY_ATTEMPTS/READY_WAIT 给足启动时间，
         后续组用 OPEN_ATTEMPTS/OPEN_WAIT；重试仍失败才落 FAILED，并记签名准备早停。 */
      const attempts = groupNo === 1 ? READY_ATTEMPTS : OPEN_ATTEMPTS;
      const waitMs = groupNo === 1 ? READY_WAIT : OPEN_WAIT;
      let openErr = null;
      for (let a = 0; a < attempts; a++) {
        try { openPage(page, "", { project: PROJECT }); openErr = null; break; }
        catch (e) {
          openErr = e;
          if (a + 1 < attempts) {
            stats.openRetries++;
            console.log("WSX_OPEN_RETRY " + (a + 1) + "/" + attempts + " page=" + page + " 等 " + waitMs + "ms :: " + failReasonOf(e, 200));
            await sleep(waitMs);
          }
        }
      }
      if (openErr) {
        openFailSigs.push(errorSignature(openErr.message));
        const v = openAbortVerdict(openFailSigs, ABORT_AFTER);
        stats.openFailGroups++;
        console.log("WSX_GROUP_OPEN_FAIL page=" + page + " 本组行数=" + todo.length + " 开页尝试=" + attempts +
          " 连续同因失败组=" + v.consecutive + "/" + (ABORT_AFTER || "关") + " 签名=" + v.signature);
        /* 原因保尾（缺陷②）：failReasonOf 掐掉命令回显、把 stdout/stderr 里的真原因留住，
           不再 slice(0,70) 把 145 行的 reason 截在半条 exe 路径上。 */
        const reason = "open_page 失败（重试 " + attempts + " 次仍失败）：" + failReasonOf(openErr);
        for (const c of todo) rows.push(mkRow(name, page, c, "FAILED", "", reason, ""));
        stats.failed += todo.length;
        flush();
        if (v.abort) {
          aborted = true; stopped = true; abortedAfter = v.consecutive;
          console.log("WSX_ABORT 连续 " + v.consecutive + " 个页组开页同因失败（" + v.signature + "）⇒ 窗口/通道没起来，" +
            "剩下的页组一律不再开（继续只会量产同一句不可采信行）：本腿已落 " + rows.length + " 行、已试页组 " + stats.pages + " 个");
          break;
        }
        continue;
      }
      /* 有一次开页成功就说明通道是活的：早停计数归零，避免把相隔很久的两次同类抖动叠成"连续" */
      openFailSigs.length = 0;
      await sleep(Number(opt("settle", "2200")));
      const route = String((await wsRoute()) || "");
      const routeKnown = !!route;
      const routeOk = routeKnown ? route.includes(page) : null;
      const allCls = [...new Set(todo.flatMap((c) => classesOf(c.action + " " + c.expected)))];
      stats.probes += allCls.length;
      const pr = allCls.length ? await probeSet(await wsPage(), allCls) : { map: {}, broken: false };
      const dom = pr.map;
      if (pr.broken) console.log("WSX_PROBE_BROKEN page=" + page + " ⇒ 该组探针不采信");
      for (const c of todo) {
        const cls = classesOf(c.action + " " + c.expected);
        const observed = "top=" + (route || (routeKnown ? "?" : "(落点未取证)")) + (routeOk === false ? " ≠ " + page : "") +
          " | dom: " + (cls.length ? cls.map((s) => s + ":" + (dom[s] || "no-answer")).join(" ") : "(本条没点名类名)") +
          " | ws-route+ws-probe" + (pr.broken ? " | probe-broken" : "");
        if (c.requiresReal === true && !REAL_MODE) {
          stats.skipReal++;
          rows.push(mkRow(name, page, c, "SKIPPED", route, "requiresReal ⇒ 本切片只跑 mock 产物", observed));
        } else if (routeOk === false) {
          stats.failed++;
          rows.push(mkRow(name, page, c, "FAILED", route, "落在别的页（页内守卫或路由重定向），须人判（跑 scripts/qa/triage-cold-entry.mjs 可定位到具体守卫行）", observed));
        } else if (TAP_RE.test(String(c.action || ""))) {
          if (!TAP_MODE) {
            stats.skipTap++;
            rows.push(mkRow(name, page, c, "SKIPPED", route, "action 含交互动词 ⇒ 未开 --tap，交互型留待下一刀", observed));
          } else {
            const r = await runTapCase(name, page, c, route, cls);
            if (r.bucket !== "executed") stats[r.bucket]++; else stats.executed++;
            rows.push(r.row);
          }
        } else if (!cls.length && !FRAME_RE.test(String(c.evidence || ""))) {
          stats.skipNoCrit++;
          rows.push(mkRow(name, page, c, "SKIPPED", route, "判据未点名可观测物件（既无类名也不要求出帧）⇒ 没有可判的东西，不能记 EXECUTED", observed));
        } else if (!routeKnown) {
          stats.skipRoute++;
          rows.push(mkRow(name, page, c, "SKIPPED", route, "WS currentPage() 没给结果 ⇒ 不知是否已在 " + page + "，答案无法归属，待重跑", observed));
        } else {
          const miss = [];
          let evid = "";
          if (FRAME_RE.test(String(c.evidence || "")) || cls.length) {
            const f = join(SHOT_DIR, name + "-" + c.id + "-after.png");
            try {
              rmSync(f, { force: true });
              shot(f, { project: PROJECT });
              const sz = existsSync(f) ? statSync(f).size : 0;
              if (sz > 3000) { evid = relOf(f) + "(" + sz + "B)"; stats.shots++; } else miss.push(relOf(f) + "(仅 " + sz + "B，不当证据)");
            } catch (e) { miss.push(relOf(f) + "(未写出:" + String(e.message).slice(0, 50) + ")"); }
          }
          const answered = cls.filter((s) => verdictOf(dom[s]) !== "no-answer");
          if (!evid && !answered.length) {
            stats.skipMiss++;
            rows.push(mkRow(name, page, c, "SKIPPED", route, "出帧失败且探针无有效答案（miss=" + miss.join(";") + "）⇒ 不记 EXECUTED", observed, "", miss));
          } else {
            stats.executed++;
            rows.push(mkRow(name, page, c, "EXECUTED", route, "", observed, evid, miss));
          }
        }
        if (--budget <= 0) { stopped = true; break; }
      }
      flush();
      console.log("WSX_GROUP page=" + page + " 本次新行=" + rows.length + " executed=" + stats.executed + " failed=" + stats.failed +
        " skipped=" + skipTotal() +
        " 出帧=" + stats.shots + " ws重试=" + wsErrs + " 连接次数=" + conns + " 已跑=" + ((Date.now() - BOOT_T) / 60000).toFixed(1) + "min");
    }
  }

  /* 批次结局（缺陷①）：先分类再落盘，因为 runner 那句自描述必须跟着结局变——
     零取证的一批不许写"完整跑完"，也不许打 WSX_RESULT=OK。 */
  const batch = classifyBatch({ rows, stats, stopped, aborted });
  const all = flush(batch);
  const dupNew = rows.length - new Set(rows.map((r) => r.manifest + "|" + r.id)).size;
  const bad = all.filter((r) => !["EXECUTED", "FAILED", "SKIPPED"].includes(r.status));
  const holes = all.filter(evidenceHole);
  console.log("WSX_ROWS new=" + rows.length + " merged=" + all.length + " 之前已有=" + (prior.results || []).length + " 重复新行=" + dupNew);
  console.log("WSX_STATS executed=" + stats.executed + " failed=" + stats.failed + " skipped=" + skipTotal() +
    "(交互动词未开tap=" + stats.skipTap + " requiresReal=" + stats.skipReal + " 落点未取证=" + stats.skipRoute +
    " 无可判物件=" + stats.skipNoCrit + " 出帧失败=" + stats.skipMiss +
    " tap禁触=" + stats.tapDeny + " tap无目标=" + stats.tapNoTarget + " tap失败=" + stats.tapFail + " tap无帧=" + stats.tapNoFrame +
    ") 页组=" + stats.pages + " 探针条数=" + stats.probes + " 出帧=" + stats.shots + " ws重试=" + wsErrs + " 连接次数=" + conns);
  const st = {};
  for (const r of all) st[r.status] = (st[r.status] || 0) + 1;
  console.log("WSX_STATUS_ALL " + Object.keys(st).sort().map((k) => k + "=" + st[k]).join(" "));
  /* 档位清点（与 r-exec-cli.mjs:693-699 的 RUNNER_FILE_BANDS/RUNNER_MIXED 同一件事）：
     本腿新行必须 100% 盖上带；漏盖（missing>0）就是上面那条注释说的"裸 row() 调用"，
     门那边会把同样的行数计进 REALCOV_BANDLESS_ROWS，所以这里不能装看不见。 */
  const cNew = bandCensus(rows), cAll = bandCensus(all);
  console.log("WSX_FILE_BANDS 本腿新行=" + rows.length + " 已盖=" + (rows.length - cNew.missing) + " 漏盖=" + cNew.missing +
    " 本腿档位=" + (cNew.kinds.map((b) => b + "=" + cNew.byValue[b]).join(" ") || "(全无)") +
    " 盘上全部档位=" + (cAll.kinds.map((b) => b + "=" + cAll.byValue[b]).join(" ") || "(全无)") + " 盘上漏盖=" + cAll.missing);
  if (cNew.missing) console.log("WSX_BAND_UNSTAMPED " + cNew.missing + " 条新行没有 band ⇒ 这一腿对档位门完全不可见（本轮 145 行的原案），先修生产者再谈结论");
  if (cNew.kinds.length > 1) console.log("WSX_MIXED_BAND 本腿新行跨 " + cNew.kinds.join(",") + " 两档以上 ⇒ 同一腿里换过产物，档位不同的行不能互相复验，须按档位分别重跑");
  /* 身份清点（与上面档位同一件事、同一个形状）：档位只是入场券，门按 identity 分两条轴认领
     （verify-real-coverage.mjs:237 登录轴=A/B、:238 游客轴=guest/not-logged-in），
     所以"盖了 real 却没盖身份"的波次照样 +0（gap-band2 F1 的实测形状）。读数由 GATE 区的
     identVerdict() 一次算完（离线夹具 verdict-proof.mjs 跑的就是它），这里只负责打印。 */
  identVerdict(rows, all, IDENTITY).lines.forEach((l) => console.log(l));
  console.log("WSX_EVIDENCE_HOLE " + holes.length + (holes.length ? " 条：" + holes.slice(0, 8).map((r) => r.manifest + "/" + r.id).join(",") : ""));
  batch.lines.forEach((l) => console.log(l));
  if (!batch.admissible) {
    console.log("WSX_UNMEASURABLE_ROWS " + rows.length + " 条（" + rows.slice(0, 6).map((r) => r.manifest + "/" + r.id).join(",") +
      (rows.length > 6 ? "…" : "") + "）：落点/探针/帧三样全空 ⇒ 这些行是通道状态的投影，不是产品判决");
    console.log("WSX_REMEDY 先接回活窗口再重跑这一腿：node scripts/qa/open-project-window.mjs --project " + relOf(PROJECT) +
      " --settle 24（必要时 node scripts/qa/ws-channel-up.mjs）；窗口没起来的红不许记成产品 FAILED（artifact-band.mjs:70 / r-exec-cli.mjs:335）");
  }
  const fails = [];
  if (!rows.length) fails.push("一行都没产生（要么全跑过了，要么筛选把用例全挡住了 ⇒ 这不叫跑完）");
  if (dupNew) fails.push("重复 manifest|id " + dupNew + " 条");
  if (IDS) {
    /* 名单腿的守恒：名单里每一条都必须在"扫到的语料"里出现、且在盘上有行。
       两个方向分开报：没遇上＝manifest 没进扫描集或判据被改名；有行少＝静默少跑。 */
    const covered = new Set(all.filter((r) => IDS.has((r.manifest + "|" + r.id).toUpperCase())).map((r) => (r.manifest + "|" + r.id).toUpperCase()));
    const notSeen = [...IDS].filter((k) => !idsSeen.has(k));
    console.log("WSX_IDS 名单=" + IDS.size + " 语料里遇上=" + idsSeen.size + " 盘上有行=" + covered.size + " 名单里没遇上=" + notSeen.length);
    if (notSeen.length) fails.push("名单里 " + notSeen.length + " 条在本腿扫到的 manifest 里根本没出现（manifest 没进扫描集或判据被改了号）：" + notSeen.slice(0, 8).join(","));
    if (stopped) console.log("WSX_IDS_PARTIAL 本腿被预算/limit 截停 ⇒ 名单只落 " + covered.size + "/" + IDS.size + " 行，不许按跑完记账");
    else if (covered.size !== IDS.size) fails.push("守恒破：名单 " + IDS.size + " ≠ 盘上有行 " + covered.size + " ⇒ 有条目被静默跳过（既没 EXECUTED 也没 FAILED/SKIPPED 行）");
  }
  if (bad.length) fails.push("非法状态 " + bad.length + " 条");
  if (holes.length) fails.push(holes.length + " 条 EXECUTED 没有任何证据 ⇒ 没有证据的绿不许入账");
  /* 零取证的整批不是"跑完且全红"，是"这一腿没跑成"：单独成一条红，措辞与 WSX_ADMISSIBLE=no 对齐，
     这样 run-ui-queue.mjs:136 那行只收 _RESULT= 的 resultLines 也能看见它。 */
  if (!batch.admissible) fails.push("本批无可采信测量（class=" + batch.outcome + "，" + rows.length + " 行落点/探针/帧全空" +
    (aborted ? "，已在连续 " + abortedAfter + " 个同因开页失败组上早停" : "") + "）⇒ 记 NOT_SHOOTABLE/重跑，不许记成产品 FAILED");
  if (all.length !== (prior.results || []).length + rows.length - dupNew) fails.push("合并后总数对不上");
  if (fails.length) { console.log("WSX_RESULT=FAIL reason=" + fails.join(" / ") + " ⇒ 结论不落盘"); process.exit(2); }
  console.log("WSX_WRITTEN=" + relOf(RES) + " results=" + all.length);
  console.log("WSX_SCOPE=" + (TAP_MODE ? "observe+tap（requiresReal 仍未跑，真实模式要 --project 指到 real 产物）" : "observe-only（交互型与 requiresReal 未跑；这不是一轮完整的执行轮）"));
  console.log("WSX_RESULT=OK");
  /* 收尾必须真的退出：WS 会话按规矩不许 close()（会把 9420 的 IDE 子进程整个带走），不 exit 就挂着占设备——
     stage-8 那条腿 21:29:11 写完行、21:53 才被外层 timeout 打掉就是这里（上面 fidelity 分支的 process.exit 同理）。 */
  process.exit(0);
}
main().catch((e) => {
  console.log("WSX_RESULT=FAIL stage=uncaught msg=" + String((e && e.stack) || e).split("\n")[0].slice(0, 180));
  flush();
  process.exit(2);
});
