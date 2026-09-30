# 游客落点稳定性判据收紧（r22）— 绿损失对账

依据：`reports/audit/round-7/decisions-v33.md` §35 第 (4) 条（判据缺陷就在判据上修；收紧后丢的每一格必须具名）。
本件只统计、只改判据源码，**没有**动 `guest-landing-measured.json` / `guest-landing-booked.json`（只读），
也**没有**跑任何连 DevTools / 抢 UI 租约的腿。

## 1. 判据原文（收紧后）

唯一实现住在纯模块 `scripts/qa/guest-landing-status.mjs:32`（载具与下游共用同一把尺，不落第二份副本），
载具接线在 `scripts/qa/verify-guest-landing.mjs:328`：

```js
const stab = judgeStability(samples, REPEAT);   // stable = (samples.length >= max(MIN_STABLE_SAMPLES, 声明 repeat)) && 所有 samples[].landing 一致
```

被替换掉的旧写法（`verify-guest-landing.mjs` 旧 :315）：
`const stable = new Set(samples.map((s) => s.landing)).size === 1;` —— n=1 时该集合恒为 1 元 ⇒ 空判据。

**比交回口径更严的一处，明写在这里**：任务给的判据是 `samples.length >= 本次声明的 repeat`。若只按这一条，
一条 `--repeat 1` 的腿仍然自证清白（n=1 >= 1），空判据原地复活。所以生效最低样本数取
`max(MIN_STABLE_SAMPLES=2, 声明 repeat)`（`guest-landing-status.mjs:17`、`:23`、`:34`）。
这条加强只会让判据更严、不会更松；对当前台账的结果与字面口径完全一致（顶层 `repeat=2`）。
`--repeat 1` 的腿现在会先印一行 `GUEST_LAND_WARN`（`verify-guest-landing.mjs:264`），只警告不拦腿
（沿用 `:24` 那条"正在跑的腿不许被新增硬失败带走"的纪律）。

## 2. 新增的机器可读字段（不是散文）

measure 写行时逐字落进台账（`verify-guest-landing.mjs:334`）：

| 字段 | 含义 | 例 |
|---|---|---|
| `stable` | 收紧后的布尔值 | `false` |
| `stableBasis` | 结论的依据轴（n / 生效最低样本数） | `"n=1/repeat=2"` |
| `stableWhy` | 不成立时的原因（成立时为 `null`） | `"单样本，未达 repeat=2（n=1）⇒ 没有第二次测量，稳定性未成立"` |
| `stableDefect` | 降级机器码，两类可叠加 | `"SHORT_SAMPLES"` / `"LANDING_DISAGREE"` / `"SHORT_SAMPLES+LANDING_DISAGREE"` |
| `stableSamples` / `stableRequiredSamples` | 样本数 / 生效最低样本数 | `1` / `2` |
| `repeatDeclared` | 那一趟腿自己声明的 repeat（合并账混批次时靠它复核） | `1` |

下游一律**现算不信字段**：`recomputeStability()`（`guest-landing-status.mjs:55`）拿行内 `samples`
与 `max(2, row.repeatDeclared ?? doc.repeat)` 重算；行里旧的 `stable=true` 与现算矛盾时单独点名计数，
不并进降级分类（`stableDefect` 才是分类）。

## 3. 下游消费：不达标的行 = 未闭环

- `LANDING_UNCLOSED` 由 4 态变 5 态，新增 `MEASURED-UNSTABLE`（`guest-landing-status.mjs:12`）。
- `landingStatus()` 在身份检查之后、探针之前判稳定性（`guest-landing-status.mjs:118`）：
  样本不够 ⇒ `MEASURED-UNSTABLE`，statusText 以「未结案」开头 ⇒ triage 门禁
  （`triage-exec-failures.mjs:1155` 的 `/^未结案/`）把它计入 `TRIAGE_OPEN 未结案的落地对`，
  红不藏起来。稳定性排在探针之前，是因为一只眼睛既证不了落点、也不该替探针读数背书。
- 具名报数行由 `stabilityAuditLines()`（`guest-landing-status.mjs:96`）出，载具 book 与 measure 都印
  （`verify-guest-landing.mjs:343`、`:385`）。两类降级原因分开计数，当场给恒等式：

```
GUEST_LAND_STABILITY rows=28 稳定=11 降级=17｜因样本数不足=17 因落点不一致=0 两者皆有=0｜恒等式 降级=样本不足+落点不一致−两者=17+0-0=17｜最低样本数=max(2,声明repeat=2)=2
GUEST_LAND_STABILITY_SHORT 样本数不足=17 行：<17 个 guardCaseId>
GUEST_LAND_STABILITY_DISAGREE 落点不一致=0 行：（无）
GUEST_LAND_STABILITY_FIELD 行内 stable 字段与现算矛盾=17 行（收紧前那趟腿留下的 stable=true 不作证据）：<17 个 guardCaseId>
```

## 4. 绿损失复算（只读 `guest-landing-measured.json`，28 行）

- 台账顶层：`repeat=2`、`rowPolicy=merge-never-shrink`、`generatedAt=2026-09-30T06:01:14.788Z`、
  `lastRun.rowsWritten=3 / rowsKeptFromPrevious=25 / rowsDropped=0`。
- 行内样本数分布：`n=1` 共 **17** 行（measuredAt 2026-09-30T04:39:05.811Z–04:58:28.750Z），
  `n=2` 共 **11** 行（measuredAt 05:02:56.754Z–06:03:33.946Z）。
  ⇒ 与 §35(4) 的括号读法有一处出入，如实记：n=2 那批是从 **05:02** 起就有的，不是 06:0x 才开始；
  06:01–06:03 只是最后一次 `rowsWritten=3` 的覆盖（nearby/certification/hub）。这不影响降级数。
- 旧判据下 `stable=true` 的行数：28（全部）。收紧后 `stable=true` 的行数：11。
- **绿损失 = 17 / 28**，与预期一致。17 行**全部**是"样本数不足（SHORT_SAMPLES）"，
  **0 行**是"落点不一致"—— n=2 那 11 行的两个样本落点本来就一致。
- 结案面同步：`landingStatus` 的分布由 `CLOSED=28` 变 `CLOSED=11 / MEASURED-UNSTABLE=17`
  （book 模式实跑读数，`--out` 指到 tmp 侧车，权威 booked 未写）。

### 4.1 从绿到红的 17 格（逐行，具名到 guardCaseId）

| guardCaseId | groupKey | 样本 n | 旧 stable | 现算 stable | 降级原因 | measuredAt | band |
|---|---|---|---|---|---|---|---|
| GG-campus-campus-index | subpackages/campus/campus/index → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:39:05.811Z | real@f0677920 |
| GG-circles-circles-circle-home | subpackages/circles/circles/circle-home → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:39:47.579Z | real@f0677920 |
| GG-discover-activities-index | subpackages/discover/activities/index → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:41:41.046Z | real@f0677920 |
| GG-discover-extra-discover-matching | subpackages/discover-extra/discover/matching → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:41:00.122Z | real@f0677920 |
| GG-profile-extra-profile-album | subpackages/profile-extra/profile/album → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:43:09.298Z | real@f0677920 |
| GG-profile-extra-profile-favorites | subpackages/profile-extra/profile/favorites → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:45:28.266Z | real@f0677920 |
| GG-profile-extra-profile-tasks | subpackages/profile-extra/profile/tasks → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:46:06.637Z | real@f0677920 |
| GG-profile-extra-verification-index | subpackages/profile-extra/verification/index → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:48:03.846Z | real@f0677920 |
| GG-setup-campus-index | subpackages/setup/campus/index → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:49:43.308Z | real@f0677920 |
| GG-setup-interest-index | subpackages/setup/interest/index → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:50:26.242Z | real@f0677920 |
| GG-setup-recommend-pref-index | subpackages/setup/recommend-pref/index → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:54:12.915Z | real@f0677920 |
| GG-support-feedback-index | subpackages/support/feedback/index → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:51:43.349Z | real@f0677920 |
| GG-village-village-index | subpackages/village/village/index → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:56:07.638Z | real@f0677920 |
| GG-village-village-publish | subpackages/village/village/publish → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:56:45.793Z | real@f0677920 |
| GG-village-village-tag-posts | subpackages/village/village/tag-posts → pages/login/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:57:23.040Z | real@f0677920 |
| GG-vip-bills | subpackages/vip/bills → pages/profile/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:58:00.282Z | real@f0677920 |
| GG-vip-index | subpackages/vip/index → pages/profile/index | 1 | true | false | SHORT_SAMPLES | 2026-09-30T04:58:28.750Z | real@f0677920 |

### 4.2 仍是绿的 11 格（n=2 且两样本落点一致，具名留档以便复核）

GG-campus-campus-certification、GG-campus-campus-hub、GG-discover-extra-discover-match-success、
GG-pages-nearby-index、GG-profile-extra-feedback-history、GG-profile-extra-settings-dnd、
GG-profile-extra-verification-real-name、GG-setup-schedule-index、GG-tools-search-index、
GG-village-village-history、GG-vip-promo-code。

## 5. 这一刀没做的事（不许被读成"已闭环"）

1. **没补第二个样本**：17 行要变绿只能重拍 `--mode measure --repeat 2 --only <17 个 guardCaseId>`，
   那要 UI 租约 + 8080 + 真档产物，且按"取证时效"裁定必须重拍而非继承 —— 需另行授权。
2. **没改写台账 JSON**：`guest-landing-measured.json` 里那 17 行的 `stable:true` 还在原地（历史事实，
   本车道无权篡改仪器证据），改由读取侧现算推翻并单独点名 `GUEST_LAND_STABILITY_FIELD=17`。
   下一次合法的 measure 腿重写这些行时才会带上 `stable:false + stableBasis/stableDefect/repeatDeclared`。
3. **没把 book 模式的退出码改成红**：`GUEST_LANDING_RESULT=OK/FAIL` 仍由 problems（名册/锚点/守恒）决定，
   稳定性降级进的是"未结案计数 + 状态分布 + 具名报数"，由 triage 门禁的 `TRIAGE_OPEN` 与终局复量收口。
   要不要把 `MEASURED-UNSTABLE` 升格成 book 门的硬红，属编排方的裁量，本车道不替它决定（升格会立刻
   让 `verify-guest-landing（book）` 这一门红 17 格，现按"具名报数不藏红"交付）。
4. **兄弟车道在途文件未碰**：`run-qa-selftests.mjs` / `run-final-verify-v33.sh` / `gen-round8-report.mjs` /
   `verify-package-size.mjs` / workflow 文件 / 三条 verify-*.mjs 全部一字未改。

## 6. 自检与变异（实测读数）

跑法一律用绝对路径的 v22（PATH 上的 v16 会崩在 `import.meta`）：
`"D:/codex-tools/node-v22.17.0-win-x64/node.exe" scripts/qa/<test>`。

| 测试 | 退出码 | 自报读数 |
|---|---|---|
| `scripts/qa/test-guest-landing.mjs`（既有负例，块 7 按新判据补齐夹具 + 新增 7a/7b/7c/7d） | 0 | `SUMMARY: checks=44 assertion failures = 0` / `GL_TEST=PASS` |
| `scripts/qa/test-guest-landing-stability.mjs`（新建） | 0 | `SUMMARY: checks=37 assertion failures = 0` / `STABN_TEST=PASS` |
| `scripts/qa/test-guest-landing-writeguard.mjs`（未改，作为载具接线的回归） | 0 | `SUMMARY: checks=49 assertion failures = 0` / `WG_TEST=PASS` |
| `scripts/qa/verify-guest-landing.mjs --mode book`（--out 指到 tmp 侧车，权威 booked 未写） | 0 | 状态分布由 `CLOSED=28` 变 `CLOSED=11 MEASURED-UNSTABLE=17`，并印出 §3 的四行具名报数 |

变异证明（`test-guest-landing-stability.mjs` 把 `guest-landing-status.mjs` 纯拷贝到
`.zcode/tmp/guest-stability-selftest/guest-landing-status.mutant.mjs`，只把判据里的
`const shortSamples = n < required;` 换成 `const shortSamples = false;`，即退回
`stable = new Set(landings).size === 1` 的旧写法；活文件 sha256 前后全等
`c98b020e015b…`，台账 sha256 前后全等 `51f08ed2e007…`，全程只读）：

```
STABN_MUTANT red=9/14 关键条=A1,A2,A7,A9,A11,A12,A13,A14 异常=0｜现网红=0
STABN_REAL rows=28 稳定=11 降级=17 因样本数不足=17 因落点不一致=0 顶层repeat=2 最低样本数=2
```

`red=9/14` 说的是：同一套断言打到旧判据的替身上有 9 条具名变红（含 A1「n=1 且 repeat=2 必须不 stable」、
A7「--repeat 1 的地板值」、A9「landingStatus 不许把单样本算 CLOSED」、A11–A13「两类降级分开计数」、
A14「不信行内旧字段」），而替身求值零异常 ⇒ 红是读数红，不是崩溃冒充反证（§35(1) 的形状）。
现网实现下同一套断言 0 红。

## 7. 还欠什么（不在本车道能闭的）

1. 那 17 格的第二个样本：需授权的 `--mode measure --repeat 2 --only <17 个 guardCaseId>` 重拍腿
   （UI 租约 + 8080 + 真档产物），按"取证时效"必须重拍不继承。
2. `reports/audit/round-7/decisions-v33.md` §35(4) 那句「顶层 `repeat=2` 是 06:0x 之后改的」与盘上不符：
   n=2 那 11 行从 **05:02:56Z** 就开始写了，06:01–06:03 只是 `lastRun.rowsWritten=3` 的最后一次覆盖。
   本件按盘上读数为准，结论（17/28 降级）不受影响。
3. 编排方裁量：`MEASURED-UNSTABLE` 是否升格成 book 门的硬红（现按"具名报数 + 未结案计数"交付，不藏红）。
4. 聚合器 `run-qa-selftests.mjs` 会自动扫到新文件 `test-guest-landing-stability.mjs`；
   本车道未动该文件（兄弟车道在途），新文件的 stem `STABN` 不带下划线，取数按
   `SUMMARY: assertion failures = N` 主方言，实测可被现版聚合器读到（已用它的正则复验）。
5. 一次性件清盘情况：本车道自造的 `.zcode/tmp/stab-r22`、`.zcode/tmp/r22cap`、变异替身目录
   `.zcode/tmp/guest-stability-selftest`、`tmp/qa/guest-writeguard-r17` 都已删除并复核不在盘上。
   仍留在盘上的 `.zcode/tmp/guest-landing-selftest/`（26 个文件 / 8.2M）不是本车道造的，
   是既有 `test-guest-landing.mjs` 自己的夹具目录（该测试每次运行重建、从不回收，属既有设计）；
   本车道没去删它，怕的是兄弟车道同一测试正在读它 —— 要清它请在没有并发自测的时候做。


