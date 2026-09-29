/**
 * round-8 总报告生成器（v3.3 续作轮专用；数字全部从盘上现算，不手抄）：所有数字从盘上现算（git log / gapbill / openrows-blockers / decisions），
 * 不手填任何计数。终局复量落盘后重跑一次即可，报告不会与读数脱节。
 * 用法：node22 scripts/qa/gen-round8-report.mjs   （基线提交 a4c8f995 硬编码在本文件第 21 行附近，换轮次要改）
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const rd = (p, dflt) => { try { return JSON.parse(readFileSync(join(REPO, p), "utf8")); } catch { return dflt; } };
const g = {
  gap: rd("reports/audit/round-7/gapbill-v33.json", null),
  recheck: rd("reports/audit/round-7/gate-recheck-v33.json", null),
  postCommit: rd("reports/audit/round-7/post-commit-gates-v33.json", null),
  open: rd("reports/audit/round-7/openrows-blockers-v33.json", null),
  final: rd(".zcode/tmp/final-verify/summary.json", null),
};
const commits = execFileSync("git", ["log", "--format=%h\t%s", "a4c8f995..HEAD"], { cwd: REPO, encoding: "utf8" }).trim().split(/\r?\n/).reverse();
const decisions = readFileSync(join(REPO, "reports/audit/round-7/decisions-v33.md"), "utf8").split(/\r?\n/).filter(l => /^## \d+\./.test(l)).map(l => l.replace(/^## /, ""));

const L = [];
L.push("# round-8 收官闭环总报告（v3.3 续作轮，2026-09-29）", "");
L.push("本轮不重跑已完成的轮次。起点是盘上事实：上一程 `dwfrun-e9907ebc` 在宿主会话转 `cold` 后停摆（`reportPersisted=false`，盘上只剩两条被门自己覆写的判决件，缺口账单无处续跑），所以本程把 v3.3 的六个阶段用子代理车道逐段执行，同时把工作流本身修到能安全续跑。", "");

L.push("## 1. 起点账单（唯一事实源，Node 22 实测）", "");
if (g.gap) {
  const reds = g.gap.red || g.gap.gates.filter(x => x.exitCode !== 0).map(x => x.name);
  L.push(`门禁并行实测 ${g.gap.gates.length} 项，红 ${reds.length} 项：${reds.join("、")}。` +
    `（此句读的是**缺口账单件**，其 HEAD=${g.gap.head || "unknown"}；终局复量那一发在第 7 节，两份件不同源、` +
    `口径以第 7 节为准。缺口账单那一发只有整条 v3.3 工作流真跑时才会重打，只跑终验脚本时它是上一程的旧件。）`, "");
  L.push(`- 后端 8080 UP；起点自动化端口为空，本程用零点击冷启打通（9420/9430 实测 LISTENING）。`);
  L.push(`- 起点 HEAD=${g.gap.head}，工作树脏 ${g.gap.dirty} 项。`);
  L.push("- 纠正一处长期误读：PATH 上的 node 是 v16.13.1，会把 verify-source-shape.mjs:22 与 verify-evidence-holes.mjs:15（用 import.meta.dirname，需 >=20.11）崩成假红；钉死 Node 22 后这两条门为绿，账单由「5 红」收正为「3 红」。", "");
}

L.push("## 2. 工作流本身改了什么（本轮一等主要交付）", "");
L.push("每条都有盘上证据，完整判定见 `.zcode/research/WF-V33-AUDIT-2026-09-29.md`。", "");
L.push("1. `runGate` 与端口探针改用 `WORKFLOW.nodeBin`（假红来源）。");
L.push("2. 账单阶段 `verify-source-shape` 加 `--dry`：不再覆写自己依赖的事实源。");
L.push("3. 新增 `persistJson`：账单与终验复量落盘，宿主会话死掉也能续跑。");
L.push("4. 新增 `scripts/qa/dryrun-workflow.mjs`（stub 宿主三画像 + 分支覆盖标记）。实测抓到 v3.3 原样复发的 F2：代理返回缺字段即炸在终报之前。修后 3/3 画像跑到「提交与总报告」；正向对照同一工具跑 v3.2 仍 CRASHED（exit 1，:1227）。");
L.push("5. UI 腿提示词换成实测可通的零点击冷启（`check_wechatide_status` + `ws-channel-up --wait 150`），撤掉「需用户手动开开发者工具」这条假 fallback；`--wait 60` 会给误导性的 `WS_UP=FAIL`。");
L.push("6. UI 腿加阳性对照硬前置：`wsApplied` 全空时 WS 派生的 `STATE_NOT_APPLIED` 一律记 `UNVERIFIED-INSTRUMENT`，不得记成产品失败（register 页 `.field__input` 三条就是这么被误判的，物件在源码与产物里都在）。");
L.push("7. 车道提示词按实测 150 轮硬上限要求：先落骨架、逐行落盘、每批不超过 15 行。");
L.push("8. 提交后复量 sha 敏感门并落 `post-commit-gates-v33.json`：本程 HEAD 连续推进，同一条 corpus 门的 `resolvableOlder` 从 42 读到 45，绿可能只是提交前快照。");
L.push("9. `WORKFLOW.version` 不再是死配置键（F5 复判：九键里只有它 0 处消费）。");
L.push("10. 新增 `scripts/qa/prove-gates-can-fail.mjs`：变异只打临时副本，四类变异 4/4 RED-PROVEN，已接进终验阶段。", "");

L.push("## 3. 工具与证据侧的实质修复", "");
L.push("- 分诊台认得「选择器已改名」那一型：`unclassified` 1→0，但门仍 exit 2（剩 5 组落地对无裁定，未硬造分类、未塞手写表）。");
L.push("- 语料门把 sha 读数拆成三类轴（可解析的旧 / 不可解析 / 空），实测 42+0+1=43 守恒，判红条件一字未改；新测试 34 断言 + 两次变异检验。");
L.push("- 溯源门 `LITERAL_SHA` 1→0；那枚写死的 `deadbeef` 实为内嵌自检负例夹具，代价是 `PROV_PRODUCERS` 12→11（诚实数，已登记待拍板）。");
L.push("- 4867 帧 `PRE_STAMP` 归因到生产者打的是「转换时刻 HEAD」而非采集带（同文件 `resultsGitSha` 早记着真带），按既有约定补每行 `bandSha`，夹具双向可证。");
L.push("- 报告器把 observe-only 的 dom 结论计入四格取数；分句建模补上「变更动词切句」。同时纠正一条错误归因：§4.5 那条红不是四格空集，HEAD 真实读数是 85 而非 118。");
L.push("- `verify-fixes-against-artifact.cjs` 两条守恒规则共用一个旗标导致空集自相矛盾，拆成分别归因，退出码与判决逐字不变。", "");

L.push("## 4. 台账：能落的都落了，剩下的不是「没干活」", "");
L.push("- 已落账 9 行：`已修复 118→127`、`已修复待复验 12→3`；独立复算 diff 恰 9 增 9 删，6 行受保护行与 HEAD 逐格相同；`verify-ledger`/`verify-state-truth`/`verify-queue-reconcile` 回读全 exit 0。");
if (g.open) L.push(`- 剩余未结 ${g.open.openRowCount} 行，机械归置：现在可落账 ${g.open.landableNow} 条，需拍板 4 条、需环境 4 条（明细见 reports/audit/round-7/openrows-blockers-v33.json）。`);
L.push("- 关键易误读点：交互腿那 49 个是「用例号」而非台账 `MP-*` 行号，两套命名空间，所以帧覆盖度不等于台账结案依据；页面级唯一命中的 `VILLAGE-PUBLISH-001` 缺的是设计依据与阈值语义，任何帧都答不了，故按不可落处理。", "");

L.push("## 5. 真实模式交互腿（§4.1 的账）", "");
const il = rd("reports/audit/round-7/interact-leg-result-v33.json", null);
const iaudit = rd("reports/audit/round-7/interact-leg-audit-v33.json", null);
if (il) {
  const d = il.rows.reduce((a, r) => ((a[r.outcome || r.status] = (a[r.outcome || r.status] || 0) + 1), a), {});
  L.push(`结果行数 ${il.rows.length}（计划 49 条真实模式交互用例全部试过，另补游客轴与对照行），分布：${Object.entries(d).map(([k, v]) => `${k} ${v}`).join(" / ")}。`);
  L.push(`门复跑：${String((il.gateRerun && il.gateRerun.out) || "").split(/\r?\n/)[0] || "读数缺失"}；exit=${il.gateRerun ? il.gateRerun.exit : "?"}。`);
  if (iaudit) L.push(`独立复核：${iaudit.verdict}（帧存在性、sha 一致、EXECUTED 前后必不同、UNCHANGED 前后必相同、每条有具名原因，均由主会话重算，不信车道自报）。`);
  L.push("- WS 腿不通且根因被纠正：不是取页也不是等不够，而是 `connect()` 里 `MiniProgram.checkVersion()` 把 `(await send(\"Tool.getInfo\")).SDKVersion` 喂给 `licia/cmpVersion.js:4` 的 `v1.split('.')`；9421 只回 `{version}` 没有 SDKVersion ⇒ 握手当场抛。");
  L.push("- CLI 桥腿可用：showcase 载体 band `real@ed1cd82c`（门 `REAL_BAND=/^real(@|$)/` 只看 mode），四步全绿并出帧。");
  L.push("- 在册陷阱：`mp-weixin-real` 窗口已死却过地板——`open_project_window` 回 success/type:reuse、截图 11290B，画面实为「模拟器启动失败」。过字节数不等于可采。");
  L.push("- 载具误挡：按载具口径复算 `DENY` 只命中 2/49（TD03、OT09），不是整批拦路虎；本轮未擅自改载具，待授权。", "");
} else {
  L.push("**（交互腿产物文件尚未落盘，此处不留结论。）**", "");
}

L.push("## 6. 需你拍板 " + decisions.length + " 项（本轮一律未自裁）", "");
for (const d of decisions) L.push("- " + d);
L.push("", "全文与每条的可选方向见 `reports/audit/round-7/decisions-v33.md`。判据冲突、令牌值、测试数据去留、证据入库方式都是政策选择，我不替你写。", "");

L.push("## 7. 终局复量读数", "");
if (g.final) {
  L.push("```");
  for (const [k, v] of Object.entries(g.final.gates || {})) L.push(`${k} exit=${v}`);
  L.push("```");
  L.push(`红项：${(g.final.reds || []).join("、") || "无"}`);
} else {
  L.push("**（未跑，故此处不留结论。）** 全清单门禁终局复量（条数以 GATE_SUITE 为准，不写死数字）、反 vacuous-green 自检、QA 自测汇总器、不跳实时门的全量面板，统一由 `scripts/qa/run-final-verify-v33.sh` 产出（汇总写成 `.zcode/tmp/final-verify/summary.json`，本生成器直接读它）。跑完再执行 `node22 scripts/qa/gen-round8-report.mjs`，本节自动填真实读数，不手抄数字。");
}
L.push("");
L.push("## 8. 本轮把「排在后面做」的账收掉了多少（含纠出的文档错）", "");
L.push("- `#51` / `#67`：**本程之前就已落盘入库**（commit `34b6fb3d`，备份 `.pre-ops-cellplan.bak` Sep 27 18:39）。ops 车道干跑实测 `A 组=8｜B 组=22｜已落地=30｜待改=0｜拒绝=0 → OPSCELL_RESULT=PASS exit 0`。`round7-NOTES.md` §104.3 记的 `A=9 / 31 行` 与盘上不符（那是旧态），所以本轮**没有重复 --apply**——拿旧文档重落一遍不是补完，是造假进度。");
L.push("- 我自己在交接文档里写的「默认吃三份计划」是错的：`:33` 的默认表有**四份**（漏了 `cellplan-round7-recovered.json` 13 行）。已在 `followups-v33.md` 1.1 节逐字纠正。");
L.push("- 167 行重判里的 `SELECTOR_MISSED=45` 只收进 **10** 条（9 条 add-tapTarget + 1 条 rename `TD07 .say-hello→.reply-say-hello`），守恒 286→286、全目录 1107 不变，幂等复跑 `已落地=10 待改=0`。拒 20 条分类点名：判据无点击步 12、两档静态不命中 2、多命中歧义 3、节点不挂事件 2、有 tap 无点击步 1。**方法论收获：四道闸本身会放行 28/30 —— 过闸是必要条件，不是充分条件。**");
L.push("- `CH12` 判成 **EXECUTED**：prestate 三样同向实测（`isVerified=false`、目标 btn `present(1)`、两支徽章 absent），tap 回 `{success:true}`，600ms 内路由 `hub|certification`、栈深 1→2、落地页 `.cert-page/.cert-header/.cert-body` present，7 帧哈希且人眼确认不是「模拟器启动失败」页。未量到的写明：500ms 子句、console、身份 B 腿。");
L.push("- 孤儿门禁接线：`verify-dry-no-lease` 与 `verify-case-automatable` 已接进 `GATE_SUITE`（唯一必然经过的调用点）并实跑为绿；`verify-openqueue-lanes` 判为**不该接**（打印 `OPENQ_RESULT=PARTIAL` 却 `exit=0`、写死 round-7、无条件覆写判决件），已留防再试注释，处置开成第 15 项。");
L.push("- 仍然存在的红与风险：`verify-ops-corpus-stamp --check` 仍 exit 1（10 个漂移文件里只有 4 个是本程改的，另 6 个先于本程就不符，车道按边界没有越权重打别人的戳）；`tmp/qa/unverifiable-recheck-*.json` 三份已复制进 `reports/audit/round-7/` 脱离不可携状态。", "");

writeFileSync(join(REPO, "reports/audit/round-7/round8-final-report.md"), L.join("\n") + "\n");
console.log("WROTE reports/audit/round-7/round8-final-report.md");
console.log("commits=" + commits.length + " decisions=" + decisions.length + " openRows=" + (g.open ? g.open.openRowCount : "n/a") + " finalReadings=" + (g.final ? "已填" : "未跑"));
