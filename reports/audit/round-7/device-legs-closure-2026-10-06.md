# 设备腿收口报告（2026-10-06）——#11 / #29c / #3 / VB03 / VRN07 逐腿落账

> 性质：QA 设备腿执行代理的执行报告。输入=ruling-closure-2026-10-06.md §1.T9/§3 三条已采纳设备腿的命令
> 与 uncovered10-disposition-r14.md §2.8/§2.10/§3 的分流。纪律：只执行腿，不改执行器代码；
> 判据/台账写入全部走 sanctioned 通道（apply-ops-cellplans / patch 体例 / 手写名册体例，写前留 .bak）；
> **跑不出/收不到的格子如实记阻塞，不伪造任何一格**。
> 载具：本机自动化 IDE 实例（WS 9420，`ws-channel-up` ALREADY_UP、档位比对 match）；
> 后端 8080 LISTENING；Node 22 = D:/codex-tools/node-v22.17.0-win-x64。
> 判据源口径与 ruling-closure 一致：verify-source-shape / round-6 issue-matrix / round-6 ops / decisions §36 名册。

## 0. 结论一句话

四条腿全部真跑、产物落盘：#11 booked 复测腿 28/28 组 CLOSED、#29c guest+A 两条 244+244 行、
#3 MSG06 real 腿 EXECUTED 行在盘；**VB03 的 showcase 腿跑出 honest SKIPPED（LEFT_PAGE）——该格不闭**；
VRN07 只读核实完成（A/B birth_date 均 non-NULL ⇒ 路 A 不可行、路 B 待所有者授权，零写库）。
名册 #3/#11/#29c half_closed→closed（half_closed 7→4、closed 13→16、20 行守恒）；
REALCOV_UNCOVERED 维持 9（VB03 一格不虚报）；run-qa-selftests 红 2→1（余 1=既有 triage 成员错配，具名）。

## 1. 载具预检（L1）

- `netstat`：8080（api，PID 32156）、9420（自动化，PID 44784）均 LISTENING。
- `node scripts/qa/ws-channel-up.mjs --project D:/6/恋爱小程序/apps/client/dist/build/mp-weixin-real`
  → `WS_UP=ALREADY_UP port=9420 connectMs=188 page=pages/login/index`；
  `WS_UP_BAND=match … VITE_API_MODE=real MODE=real envSha8=f0677920`、`WS_UP_BAND_RESULT=match exit=0`。
- `node scripts/qa/open-project-window.mjs --project …/mp-weixin-real` → `OPENWIN_RESULT=OK`（probe route=pages/login/index）。
- 租约链路实测正常：open-project-window/verify-guest-landing/r-exec-cli 各自 acquire/release，
  heartbeat 正常，无孤儿锁需要接管。**零修复动作**（无需开新窗/修环境）。
- 收尾时已按嘱把窗口切回 real 产物（见 §8）。

## 2. L2 —— decisions#11 booked 复测腿【腿成功 ⇒ 名册 closed】

命令（T9 命令 1-3；第 2 步带 `--repeat 2`，理由见下）：
1. `node scripts/qa/open-project-window.mjs --project …/mp-weixin-real`（L1 已做）
2. `node22 scripts/qa/verify-guest-landing.mjs --mode measure --project apps/client/dist/build/mp-weixin-real --repeat 2`
3. （同一次运行续写）booked 回读 → `reports/audit/round-7/guest-landing-booked.json`

**--repeat 2 的原因（偏离 T9 字面命令的具名声明）**：stable 地板 = max(MIN_STABLE_SAMPLES=2, repeat)；
按 T9 裸跑（repeat=1）会让本轮 28 行全部以 SHORT_SAMPLES 入账，把既有台账里 27 行真稳定行
就地降级成单样本——merge-never-shrink 只守行数不守稳定性，那是毁证据不是补证据。
repeat=2 与台账既有 lastRun（2026-09-30，repeat=2）同参数。

读数（腿输出原文）：
- `GUEST_LANDING_MEASURED=28 档=real@f0677920 全部落点稳定=yes`
- `GUEST_LAND_STABILITY rows=28 稳定=28 降级=0｜最低样本数=max(2,声明repeat=2)=2`
- `GUEST_LAND_LEDGER_WRITTEN=yes reason=merged policy=merge-never-shrink 本轮行=28 台账行=28->28 就地更新=28 新增=0 保留旧行=0 丢弃=0`
- 状态分布 **CLOSED=28**（改前 CLOSED=27 + MEASURED-DRIFT=1）；`GUEST_LANDING_RESULT=OK`、锚点可核 11/11。

连带（机械修正，均留档）：
- **锚点重锚**：policy 两条锚点行漂移（T9 预言命中）——vip/index.vue 的工作树未提交改动
  （「2026-10-05 微信支付管道打通」:36-38 净增 3 行）把 50→53、63→66；
  `guest-landing-policy.json` 两处 line 字段改 53/66 + `$basisKeys.vipFlag` 同步，
  **needle 逐字未动**（:53 `if (!featureFlags.membershipEnabled) {`、:66 `uni.switchTab({ url: ROUTES.TAB.PROFILE });`），
  备份 `scripts/qa/guest-landing-policy.json.bak-20261006-anchor-repin`。
  该文件不在语料戳管辖（verify-ops-corpus-stamp 只读 round-6/ops）。
- **selftest 过期钉子**：`test-guest-landing-stability.mjs` 真台账断言把「字段全 stable=true」
  当成「必有降级」，腿成功后台账健康（降级=0、矛盾=0）反被判红——与该断言上方注释自己声明的
  「补拍后改核矛盾必须归零」相悖。改为形状无关派生不变量（矛盾计数 == 逐行独立复算，双向），
  负例咬合力不变；备份 `test-guest-landing-stability.mjs.bak-20261006-expired-nail`。
  修正后 `STABN_TEST=PASS`（37 checks / 0 failures）。

门/自测读数变化：
- `test-guest-landing-writeguard` **14 断言全绿**（改前 14 红——全是锚点预检 exit 2 连带）。
- `test-guest-landing` 5 红→**1 红**：booked 判据/守恒/锚点断言全绿；余 1 红=
  「派生第二条游客腿的 triage 没成功 :: exit=2」——**既有独立红**（见 §7 阻塞 B3），与本裁定判据无关。
- `run-qa-selftests` 聚合 **FAILED 2→1**（改前 writeguard 14 + guest-landing 5）。

## 3. L3 —— decisions#29c 落地对 (c) 两条腿【腿成功 ⇒ 名册 closed】

5 组/9 key 现量（triage-exec-failures 对 `reports/audit/round-7/interact/exec-results.json`，
`TRIAGE_LANDING_SCOPE= 落地对总组数=9 可归属组=4 身份未声明组=5`）：
campus/index→hub（20 行）、discover/matching→discover（23）、village/tag-posts→village/index（9）、
setup/campus→discover（11）、setup/recommend-pref→discover（9）。
5 组所在 manifest：SUBPACKAGES-CAMPUS-CAMPUS-INDEX、SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING、次要18、次要21。

命令（T9 模板逐字，仅展开 manifests）：
1. `node22 scripts/qa/r-exec-cli.mjs --project apps/client/dist/build/mp-weixin-real --out reports/audit/round-7/exec-landing-c-guest --real-cases-only --identity guest --tap --native-capture --manifests SUBPACKAGES-CAMPUS-CAMPUS-INDEX,SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING,次要18,次要21`
   → `RUNNER_RESULT=OK`，**244 行**，`RUNNER_IDENTITIES guest=244`，`loginVerify=not-logged-in`，
   `RUNNER_BAND real@f0677920`，EXECUTED=1 / SKIPPED=243（身份适用范围外=165、非真实用例=64…）。
2. 同参数换 `--identity A --out reports/audit/round-7/exec-landing-c-a`
   → `RUNNER_RESULT=OK`，**244 行**，`loginVerify=logged-in userId=100158`，EXECUTED=19 / SKIPPED=225。

判据兑现（如实划界）：5 组页在**两轴各有带身份戳的行落盘**——guest 轴 5 页行 route 全为
`pages/login/index`（与游客落点裁定同向；行示例 CX01/CX02/MT01/TP01/SCU01/RP01），
A 轴 5 页行停留本页（campus/index 6 行 EXECUTED，matching/tag-posts/setup 全页 route=自身）。
§29 存档 (a) 的「让 9 个 key 变成可归属」自此有证据件可引用。
**按 (a) 路径原设计「不改门的任何判定」**：旧 interact 语料的 5 个未声明对是固定历史，
面板 `LANDING_IDENTITY_UNDECLARED=5` 读数不变；guest 腿行因身份范围收窄多为 SKIPPED，
triage 对新语料 `TRIAGE_OPEN=0`（无新增欠账）。预期中的 `FAILED-guest-gate-by-ruling` 行=0：
5 组用例自 2026-09-29 落点裁定入库后已被 tag-ops-identity-scope 标为 A/B，
guest 腿在开工前即被受控摘除（身份范围外），落点观察保存在行内 route 字段——与 T9 预期的形状偏差如实记档。

## 4. L4 —— decisions#3 MESSAGES-INDEX-002 的 real 腿【腿成功 ⇒ 名册 closed】

命令（§3 表「腿按 MSG06/NotLoggedWaiting 载体跑」的落地；**不带 --real-cases-only**——
MSG06 requiresReal=false，带了反而会像旧腿一样把它记成「真实刀只跑 requiresReal」的守恒行）：
`node22 scripts/qa/r-exec-cli.mjs --project apps/client/dist/build/mp-weixin-real --out reports/audit/round-7/exec-msg002-real-closure --manifests PAGES-MESSAGES-INDEX --identity none --tap --native-capture`
→ `RUNNER_RESULT=OK`，41 行，`RUNNER_IDENTITIES none=41`，`loginVerify=not-logged-in`，
EXECUTED=27 / SKIPPED=14，band=real@f0677920。triage 复核 exit 0（TRIAGE_OPEN=0、身份读数干净）。

关键行（原文字段）：
`MSG06 | status=EXECUTED | band=real@f0677920 | identity=none | loginVerify=not-logged-in | sessionSource=cleared | route=pages/messages/index`
observed=`top=pages/messages/index | … | native toast[无] console[无]`，evidence=`reports/screenshots/round-7-exec/PAGES-MESSAGES-INDEX-MSG06-after.png(11752B)`。
**如实划界**：本腿买到的是 MSG-002 判据（副标恒取静态键、不接游客计数）的 real 带复验载体——
未登录（token 已清）+ real 构建 → usePageAccess 放行、messages 页不重定向、NotLoggedWaiting 分支在位；
判据本身的「静态键/无计数版键」两点仍由 verify-source-shape 的源码判点承担（bands=["real"] 的盖章口径）。
MSG06 自己的「两按钮均可达」判点**没有被本腿判掉**（按钮在自定义组件内，CLI 通道点不进——与 OT09 同一堵墙），
不在本裁定收账范围内，不冒充。

## 5. L5 —— VB03 换档腿（NEEDS_BAND_CHANGE）【判据点名完成 + 腿跑成 honest SKIPPED ⇒ 该格不闭】

① **判据点名（sanctioned ops 写者）**：新建 `scripts/qa/cellplan-round7-vb03-showcase.json`
（A-add-tapTarget 1 行：次要22|VB03 tapTarget=`.nav-bar__back`，账单页导航栏返回键 @tap=goBack，
即 action (b) 步「返回 VIP」的页内可归属物件；note 写明 (c) 步走 --gestures pullDown、(a)/(b) 进页走 nav）。
`apply-ops-cellplans.mjs --bands mp-weixin,mp-weixin-real,mp-weixin-showcase`（三档 wxml 逐字命中
`class="nav-bar__back press-feedback"` 各 1 处）→ DRY 守恒 78→78 → `--apply`
→ `OPSCELL_APPLIED 次要22 A=1 备份=次要22.json.pre-ops-cellplan.4.bak`、全库 24 份 1107 条守恒。
② **语料戳重打（T4 先例同路径）**：`verify-ops-corpus-stamp --check` 如实判红
（`DRIFT 次要22.json 判据内容变了`）→ `--write`（备份 `ops-corpus-stamp.json.pre-stamp-write.20261006-185234.bak`）
→ `STAMP_RESULT=PASS`（cases=1107 守恒）。
③ **档位选择记 showcase**（本计划件 $comment 与本节即记录）：开窗
`open-project-window.mjs --project …/mp-weixin-showcase` → `OPENWIN_RESULT=OK`。
④ 腿：`node22 scripts/qa/r-exec-cli.mjs --project apps/client/dist/build/mp-weixin-showcase --out reports/audit/round-7/exec-vb03-showcase-closure --real-cases-only --identity A --gestures --net-count --tap --native-capture --manifests 次要22`
→ `RUNNER_RESULT=OK`，78 行，**`RUNNER_BAND real@ed1cd82c`（showcase 档在门上就是 real 档，与 disposition 判定一致）**，
identity=A logged-in，EXECUTED=12 / SKIPPED=66（含动词拒发=5：scroll/swipe 族如实拒发）。

**VB03 行结果：`status=SKIPPED`，不闭格**（不虚报）。observed 原文（截取）：
`top=pages/profile/index ≠ subpackages/vip/bills | dom: .nav-bar__back:present(1) | size: .nav-bar__back=[33x33px ≈63.46x63.46rpx] | tap-腿 | tap[tap:.nav-bar__back] | pullDown=error(ERR uni is not defined) 交互后已离开本页 ⇒ 本条探针不在本页上，不作判 | …`，failureReason=`交互后离开目标页 ⇒ 状态量不到，记 LEFT_PAGE（不是产品判红）`。

诚实归因（两道具名残障，均**不在本代理授权修改面内**，重试不改变定序故不再烧设备分钟）：
- **定序**：判据 (a)(b)(c) 是「进入 → 点返回 → 重进入 → 下拉」的跨页时序；执行器单行模型把
  tapTarget（返回键）真点下发后页面立即离栈（栈=1 时 goBack 走 switchTab 我的页，正是 VB08 描述的分支），
  (c) 的下拉与状态回读再也回不到 bills 页 → LEFT_PAGE。要闭这一格需要「多步 nav 时序」原语（[NEW]）。
- **通道**：pullDown 的 evaluate 在本窗报 `ERR uni is not defined`（pullDownSource 带 typeof 守卫仍抛，
  疑与 showcase 窗 evaluate 上下文的 uni 绑定有关）——载具通道缺陷，留给能力车道诊断。
- 已买到并落盘的部分：tapTarget 点名（tapNoTarget 闸不再扣）、showcase 档带行（real@ed1cd82c × 78，
  含同页 VB06 EXECUTED 证明 bills 页在 showcase 可正常打开）、探针命中与几何读数。
  **门读数不变：REALCOV_UNCOVERED 仍计 次要22|VB03=9/236**；去向册 VB03 行保持 NEEDS_BAND_CHANGE 在册。

## 6. L6 —— VRN07 只读核实（NEEDS_IDENTITY_IMPOSSIBLE）【核实完成；路 B 待授权，零写库】

只读查询（本机 MySQL 8.0.45，Windows 服务 mysqld.exe PID 6432@127.0.0.1:3306；凭据取自仓库 .env 的
DB_USERNAME/DB_PASSWORD；docker compose 未运行——DB 是本机服务不是容器；仅 SELECT，零写入）：
`SELECT id, nickname, birth_date FROM users WHERE id IN (100151,100158,100159);`

| 账号 | id | birth_date | 判定 |
|---|---|---|---|
| A 曦风 | 100158 | **2003-05-20**（非 NULL，~23 岁成年） | 不落「资料缺 birthDate」支路 |
| B 小新生 | 100159 | **2002-06-15**（非 NULL，~24 岁成年） | 同上 |
| guest 阿辰 | 100151 | 2003-06-15（非 NULL，backfill 已覆盖） | 与 disposition §2.8 记载一致 |

连带普查（只读）：users 共 280 行，birth_date IS NULL 共 **138 行**——抽样全为种子号（10001 远山、
10002 阿辰、10003 小满…），**没有一行是门要求的 identity ∈ {A=100158, B=100159}**。

结论分叉（按 disposition §2.8 的路 A/路 B）：
- **路 A（birth_date IS NULL ⇒ 免新身份直接进未成年支路）不可行**：A/B 均 non-NULL。
  138 个 NULL 账号虽在库，但执行器 IDENT_DEFS 无第四身份（加身份=改执行器，不在授权内），
  门的认领轴只认 A/B。故「1 腿 + 第二个成年对照账号」这条路不成立，未跑腿。
- **路 B（DB 夹具写入）不做，记「待所有者授权」**：需把某测试账号 birth_date 置 NULL/未成年
  （产品 API 双路拒绝：注册端点与 ProfileUpdateService 都拒绝未成年）。本次**未对库做任何写入**。
- VRN07 保持 NEEDS_IDENTITY_IMPOSSIBLE 在册，REALCOV_UNCOVERED 照旧计它。

## 7. 阻塞清单（全部具名，无一虚报）

| # | 项 | 精确原因 | 下一步归属 |
|---|---|---|---|
| B1 | 次要22\|VB03 未闭（UNCOVERED 9 不减） | ①判据 (a)(b)(c) 跨页时序需要「多步 nav 定序」原语，单行模型 tap 返回键即离栈（LEFT_PAGE）；②pullDown evaluate 在 showcase 窗报 `ERR uni is not defined`（通道缺陷） | 能力车道：nav 时序原语 + pullDown 通道诊断；判据点名与 showcase 档证据已就位 |
| B2 | VRN07 未闭 | A/B birth_date 均 non-NULL（成年）；路 A 不可行；路 B=DB 夹具写入，数据不可逆，按裁定归所有者 | 所有者授权后一次带授权 DB 写入（本代理零写库） |
| B3 | test-guest-landing 余 1 红（selftests FAILED=1） | triage-exec-failures 对 exec-guest-real-guard-r10 判「复测腿与债不同源」：账本（ops 派生 RP01-11=11 行）vs 该语料落点组 4 行（RP01/02/06/10）成员等式不等；该语料是 guest 切片（146 SKIPPED）但 runner 串不带 real-cases-only 字样、不触发切片豁免。**先于本程在基线即红**，属门与账本的成员轴张力（triage :866-874 自己注释过「债名册不能由一次跑派生」），修门不在本代理授权内 | 门车道：要么让切片豁免认得「（real 切片）」这类 runner 串，要么把整页未声明组的成员等式改为子集断言 |
| B4 | #29c 面板读数不变 | 按 (a) 路径原设计「不改门的任何判定」：旧 interact 语料 5 对未声明是固定历史，LANDING_IDENTITY_UNDECLARED=5 照旧 | 如属要改读数，另行授权（改面板 EXEC 口径） |

## 8. 门禁前后读数总表

| 门/自测 | 前（本程开工时） | 后（本程收口时） | 说明 |
|---|---|---|---|
| run-qa-selftests | FAIL（2 个测试） | **FAIL（1 个测试）** | writeguard 14→0；stability 过期钉子修正后 0；余 guest-landing 1=B3（既有） |
| guest-landing booked 账 | CLOSED=27 + MEASURED-DRIFT=1 | **CLOSED=28** | 28/28 落点稳定 n=2；GUEST_LANDING_RESULT=OK |
| verify-real-coverage（带库） | FAIL UNCOVERED=9 | FAIL UNCOVERED=**9** | VB03 一格不虚报：SKIPPED 不算量到；守恒 28+199+9=236 OK |
| verify-real-coverage-disposition | PASS（9 有去向+STALE 1） | PASS（同前） | RCD_DUAL 一致 0 diff；TD03 stale advisory 维持 |
| verify-ops-corpus-stamp | PASS | FAIL(DRIFT 次要22)→**PASS** | sanctioned tapTarget 落盘后按 T4 先例 --write 重打，cases=1107 守恒 |
| 名册（decisions §36） | open=0 half_closed=7 closed=13 | **open=0 half_closed=4 closed=16**（20 守恒） | #3/#11/#29c half_closed→closed；test-ruling-roster PASS、buckets PASS、gen-round8-report source=roster OK |
| verify-source-shape --dry | OK | OK（未复跑改动面为零） | 本程未动源码判点 |

## 9. 本程改动的全部文件（git 可核）

- `reports/audit/round-7/decisions-v33.md`（名册 3 行 half_closed→closed + 尾部计数，手写维护件体例同 T10）
- `scripts/qa/guest-landing-policy.json`（两处锚点 line 50/63→53/66 + vipFlag 括注；备份 .bak-20261006-anchor-repin）
- `scripts/qa/test-guest-landing-stability.mjs`（真台账断言改派生不变量；备份 .bak-20261006-expired-nail）
- `scripts/qa/cellplan-round7-vb03-showcase.json`（新增点名计划件）
- `reports/audit/round-6/ops/次要22.json`（VB03 tapTarget，经 apply-ops-cellplans --apply；备份 .pre-ops-cellplan.4.bak）
- `reports/audit/round-7/ops-corpus-stamp.json`（sanctioned 重打；备份 .pre-stamp-write.20261006-185234.bak）
- 腿证据：`reports/audit/round-7/guest-landing-measured.json`、`guest-landing-booked.json`（载具合并写）；
  新增 exec 目录 `exec-landing-c-guest/`、`exec-landing-c-a/`、`exec-msg002-real-closure/`、
  `exec-vb03-showcase-closure/`（各含 exec-results.json，exec-* 命名约定）；帧落既有共享目录
  `reports/screenshots/round-7-exec/`（其中 MSG01-MSG40 族 31 张为 msg002 腿对同名的既有帧**同路径重拍覆盖**
  ——文件名由 manifest-id-序派生故与旧腿同名；旧行的 evidence 引用的是路径不是内容哈希，行账不受影响，特此留痕）
- 本报告：`reports/audit/round-7/device-legs-closure-2026-10-06.md`（新增）
- **未动**：apps/ 产品代码、database/（零写入，含只读核实查询）、执行器代码（r-exec-cli 等）、round-1~6 历史证据。
- 载具收尾：showcase 验腿后已把窗口切回 real 产物（open-project-window → OPENWIN_RESULT=OK），窗口保持开、进程原样。
