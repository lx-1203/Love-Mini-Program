# 台账卫生车道（ledger lane）— tour-ledger.json 自相矛盾修正

日期：2026-10-13
车道：ledger-hygiene（本文件 + `reports/audit/ui-audit-2026-10-09/tour-ledger.json`）
判定来源（source of truth，全文核读）：
- `reports/audit/ui-audit-2026-10-09/sort-round3.json` 条目 `R3-02`、`R3-07`（并 `R3-OT-01`、`R3-PFI25-03` 同主体）
- `reports/audit/ui-audit-2026-10-09/fix-round2.json` `fix.evidence` 段（定谳一/定谳二/死选择器实证/台账修正备注）
- 台账自身在册行 `corrections[R2-OT-06(诊断增补)]`（三层根因原文）

不改的东西：`scripts/qa/**`、`apps/client/src/**`（他车道在改）、`sort-round2.json`（R3-07 提到它同样挂旧口径，但不属本车道文件）、`.zcode/**`。不提交、不跑执行器/浏览器/DevTools/后端。

---

## 1. 目标行清单

改动 4 行（均为「结论被后续证据推翻」的行），全部按本仓既有形状处理：**原文留档 + 追加改判记 + 证据指针**，不覆盖、不删句、不美化 status。

| # | 数组 | 行 id | 改的字段 | 矛盾 | 出处 |
|---|------|-------|----------|------|------|
| 1 | `corrections[5]` | `F01/F02(OT05/OT06/OT09)` | `applied` | 「源码级实锤 … 均无 relationship-cta*」＝结构性错配实锤 | R3-02 补法第二段 |
| 2 | `fixlane[1]` | `REAL-PFI25-05/F07` | `result`、`ledgerEffect` | 「产品缺陷候选维持 critical 档」+「倾向归因=渲染链路丢弃（fetchProfile 覆盖嫌疑）」 | R3-07 补法 |
| 3 | `fixlane[4]` | `F01/F02/REAL-OT-06(OT05/06/09)` | `result`、`ledgerEffect` | 同一「结构性错配实锤」旧文本的第二处在场（行 id 含 F01/F02；读者从 fixlane 进也会先读到它），且前置写成「非执行可解」 | R3-02 补法 + fix-round2「台账修正备注」末句「该行『非执行可解』应按 round-1 证据重估」 |
| 4 | `corrections[4]` | `REAL-PFI25-05/F07` | `applied` | 该行写着「产品缺陷成立与否按新证据回写」却从未记录回写结果，读者只剩 fixlane 的红可看 | R3-07 |

明确不动的行：
- `corrections[8] R2-NEARBY-09` 的「升级产品缺陷候选」字样 —— 属 nearby 主体（R3-04/R3-NEARBY-02 认定候选**成立**），与 PFI25 无关；这正是「同句在他行语境下合法、禁止全局替换」的实例。
- `corrections[10] R2-OT-06(诊断增补)` —— 它就是在册的正确三层根因，本车道只引它作指针，不改它。
- `fixlane[0] REAL-VB03-03` 的「VB03=已判过（EXECUTED）」—— 与 R3-01④ 有冲突（替换断言计已判、原判据本体未测），但那是 R3-01 的门禁分桶主体，不在本车道两条授权矛盾内 → 记入 §4 交拍板。
- `routes[]` 73 行 —— 已核：无一行含 relationship-cta/结构性错配/PFI25 判词。改前全文命中口径：`结构性错配` 1 行（1623）、`实锤` 2 行（31/1623）——两条都落在目标行内；`relationship-cta|RelationshipCTA` 4 行（31/54/55/1623），其中 54/55 是 `corrections[10] R2-OT-06(诊断增补)` 的在册正确三层根因与其实测 evidence（只作指针引用，不改）。routes 段（行 59–1593，实测边界：`"routes"` 在 59、`"fixlane"` 在 1594）对 `relationship-cta`/`结构性错配`/`PFI25`/`产品缺陷` 四种判词命中均为 **0**，无需动。

## 2. 每行改前 / 改后（按字段展开：§1 的 4 行 = 6 个字段）

形状统一为：**原句逐字留档 + 追加改判记 + 证据指针**。落地后实跑复核：6 个被改字段全部 `retained=true`（新串完整包含 HEAD 原串，见 §3.3）——即本轮没有任何一句旧判词被删或被新答案覆写。

### 字段 1 — `corrections[5]` `F01/F02(OT05/OT06/OT09)` → `applied`

改前（原文，逐字）：
> 源码级实锤：other.vue 与 real 编译产物 other.wxml 均无 relationship-cta*（配方选择器指向当前代码不存在的组件）⇒ OT05/06/09 配方需判据台重写，非执行可解；维持 UNCOVERED

改后（925 字，落盘回读）：
> 【原判定·留档】源码级实锤：other.vue 与 real 编译产物 other.wxml 均无 relationship-cta*（配方选择器指向当前代码不存在的组件）⇒ OT05/06/09 配方需判据台重写，非执行可解；维持 UNCOVERED。【改判 2026-10-13·ledger 车道】上述「结构性错配实锤」作废——读数本身复核成立（本车道实跑 grep：other.vue 与 mp-weixin-real 产物 other.wxml 对 relationship-cta 命中均为 0），错在推论：RelationshipCTA 组件存在且渲染（apps/client/src/components/profile/public/RelationshipCTA.vue 在盘、PublicProfile.vue:11 import 与 :80 使用、real 产物 components/profile/public/RelationshipCTA.{js,wxml,wxss} 在盘、PublicProfile.json 注册、PublicProfile.wxml 发射带 wx:if 的 relationship-c-t-a 节点并绑 like/message/whisper/follow），CTA 挂在 public-profile 分支而非 other 页，拿 other.* 无命中证「组件不存在」是查错了文件；真根因＝三层通道/选择器问题（①>>> 组件段与编译标签形状不匹配 ②本 IDE automator 0.12.1 元素查询不穿透自定义组件 ③带 query 的桥 open 令 currentPage 回报 webview 代理态、$ 全超时），三层原文见本台账 corrections「R2-OT-06(诊断增补)」行，判定出处 sort-round3.json R3-02 与 R3-OT-01、fix-round2.json fix.evidence「台账修正备注」段。维持 UNCOVERED（撤实锤≠补腿落地，四腿仍 NOT_SHOOTABLE）

要点：`status` 未升（UNCOVERED 维持）；层①写成「形状不匹配」而非照抄「路径形」，因本车道实读与在册读数不兼容（§4 条 5）。

### 字段 2 — `corrections[4]` `REAL-PFI25-05/F07` → `applied`

改前（原文，逐字）：
> PFI25 带 probe+shot 证据重跑（fixlane），产品缺陷成立与否按新证据回写

改后（575 字）= 原句 100% 置首留档 + 追加：
> ……。【回写落定 2026-10-13·ledger 车道】新证据结论＝产品缺陷候选撤销（红已撤）：源码定谳 real 分支 load() 不赋 voiceStatusUrl/voiceStatusDuration（赋值仅 mock 分支与动作方法），「渲染链丢弃／fetchProfile 覆盖」不成立、产品侧无可修；真丢弃点＝测试编排顺序（simulator_open_page 属 compiler 族⇒桥 open 重编译重启 AppService⇒原序 seed→open 的 seed 被清），配方已重排（seed 后置＋read(profile-voice-state) 同刻对照＋死选择器 .profile-complete-card 摘除）。状态＝红已撤、绿未证，PFI25 仍无有效判决行，待实带重跑重排后配方定谳——不得读作已修复或判过。证据指针：fix-round2.json fix.evidence 定谳一/定谳二/死选择器实证三段；sort-round3.json R3-PFI25-03 与 R3-07；读数现场见本台账 fixlane「REAL-PFI25-05/F07」行改判记

### 字段 3 — `fixlane[1]` `REAL-PFI25-05/F07` → `result`

改前尾句（逐字）：
> …+ seed-voice fixture ok；倾向归因=store-patch 注入的语音态被渲染链路丢弃（fetchProfile 覆盖嫌疑），尚差渲染时 store 态探针定谳

改后（448 字）= 原句（含 FAILED 读数、帧字节数、3 复现计数）逐字保留 + 纯追加：
> ……尚差渲染时 store 态探针定谳——【改判 2026-10-13·ledger 车道】上述「倾向归因」为当时原判词、原文留档不删，已被后续源码定谳证伪（见本行 ledgerEffect 改判记与 corrections「REAL-PFI25-05/F07」行），三次 FAILED 定谳为测试编排伪红

### 字段 4 — `fixlane[1]` `REAL-PFI25-05/F07` → `ledgerEffect`

改前（原文，逐字）：
> 产品缺陷候选维持 critical 档且证据链升级（route+帧+类名+3 复现）；console 原文仍缺（r-exec-ws 不采 console，见 CON-EV-01 方法）

改后（878 字）= 原句加【原口径·留档】头（原句仍在，字节连续）+ 追加：
> 【原口径·留档】产品缺陷候选维持 critical 档且证据链升级（route+帧+类名+3 复现）；console 原文仍缺（r-exec-ws 不采 console，见 CON-EV-01 方法）。【撤红改判 2026-10-13·ledger 车道】critical 产品缺陷候选撤销：①源码级证伪「渲染链丢弃」——apps/client/src/stores/profile.ts real 分支 load() 不赋 voiceStatusUrl/voiceStatusDuration（赋值仅 mock 分支与动作方法），fetchProfile 仅 await this.load()，页面 clearVoiceStatus 仅用户点确认触发（fix-round2.json fix.evidence 定谳一段）；②真丢弃点＝编排顺序——simulator_open_page 属 compiler 族（wechatide-skill/references/tool-index.md 载明触发模拟器编译），桥 open 重编译重启 AppService 清空 pinia，配方原序 seed(step#1)→open(step#2) 的 seed 必灭（fix-round2.json 定谳二段，与本台账 CON-EV-01「桥开页重启 AppService」同原语实测吻合）；③修复已落盘——PFI25 配方重排（seed 后置）＋read(profile-voice-state) 渲染-存储同刻对照＋死选择器 .profile-complete-card 摘除，离线校验全绿。【现状】红已撤、绿未证：实带重跑未做（fix 车道无设备会话），PFI25 无有效判决行，待实带重跑定谳；本行不得读作已修复/已判过，也不计产品缺陷。证据指针：fix-round2.json fix.evidence 与 skipped 两条、sort-round3.json R3-PFI25-03/R3-07

要点：撤红 ≠ 报绿。字面「不得读作已修复/已判过」写进行内，防下一位读者把「撤销 critical」误读成通过。

### 字段 5 — `fixlane[4]` `F01/F02/REAL-OT-06(OT05/06/09)` → `result`

改前（原文，逐字）：
> apps/client/src/subpackages/profile-extra/profile/other.vue 与 real 产物 other.wxml（2424B 全文核对）均无 relationship-cta*——配方选择器指向当前代码不存在的组件，结构性错配实锤；OT05 另有 armModal 抛 showModal 语法错（C1 驱动缺陷）

改后（911 字）= 原句（含 2424B 当时读数）留档 + 追加改判，并显式圈出**不**改判的部分：
> 【原记·留档】apps/client/src/subpackages/profile-extra/profile/other.vue 与 real 产物 other.wxml（2424B 全文核对）均无 relationship-cta*——配方选择器指向当前代码不存在的组件，结构性错配实锤；OT05 另有 armModal 抛 showModal 语法错（C1 驱动缺陷）。【改判 2026-10-13·ledger 车道】「结构性错配实锤」作废，与 corrections「F01/F02(OT05/OT06/OT09)」行同源同判：本次核对只覆盖 other.* 一层（该层读数复核成立，本车道实跑 grep 命中 0），但 CTA 不在被核对的文件里——RelationshipCTA 存在且渲染（src components/profile/public/RelationshipCTA.vue＋PublicProfile.vue:11/:80；real 产物 components/profile/public/RelationshipCTA.{js,wxml,wxss}＋PublicProfile.json 注册＋PublicProfile.wxml 发射带 wx:if 的 relationship-c-t-a 节点），链 profile-shell→public-profile→relationship-cta，另 exec-realcov-b4 OT05 帧四钮可见（fix-round2.json fix.evidence 台账修正备注段所载）；错配在组件边界非组件缺失。探不到＝三层通道/选择器问题（>>> 组件段与编译标签形状、automator 不穿透自定义组件、带 query 桥 open 的 webview 代理态），三层原文见 corrections「R2-OT-06(诊断增补)」行，判定出处 sort-round3.json R3-02/R3-OT-01。armModal showModal 语法错一项不属本次改判范围（另一主体，仍在册）

### 字段 6 — `fixlane[4]` `F01/F02/REAL-OT-06(OT05/06/09)` → `ledgerEffect`

改前（原文，逐字）：
> OT05/06/09 维持 UNCOVERED；补腿前置=判据台按现页面结构重写配方（非执行可解），已立案

改后（514 字）= 原句整句置首逐字保留 + 破折号后追加改判：
> OT05/06/09 维持 UNCOVERED；补腿前置=判据台按现页面结构重写配方（非执行可解），已立案——【改判 2026-10-13·ledger 车道】上句「判据台按现页面结构重写配方（非执行可解）」前置作废：该核对只证 other.* 无 CTA，不证组件不存在，故「非执行可解」不成立（重估出处＝fix-round2.json fix.evidence 台账修正备注「该行『非执行可解』应按 round-1 证据重估」）；撤「结构性错配实锤」不改覆盖账，四腿仍 NOT_SHOOTABLE ⇒ OT05/06/09 维持 UNCOVERED 不变；补腿前置改记＝执行器落地「基底页＋应用内 wx.navigateTo 开页形态＋AppService 侧 handler 直调替代 DOM tap」后按已实证健康路径重跑 OT05/06/09/OC09 四腿（健康路径读数见本台账 corrections「R2-OT-06(诊断增补)」行 evidence/open 两段，判定出处＝sort-round3.json R3-OT-01 与 R3-02）；已立案待工具车道

注：这行是本车道唯一动到「前置条件」结论的地方，依据是 fix-round2.json 明文要求重估 + R3-OT-01 已实证健康路径；覆盖账（UNCOVERED）一字未改。


## 3. 守恒检查

node 一律用 `D:/codex-tools/node-v22.17.0-win-x64/node.exe`（PATH node 为 v16）。

### 3.0 台账口径一览（改前＝改后，逐项相等）

| 指标 | 改前 | 改后 | 判定 |
|------|------|------|------|
| `JSON.parse` | OK | OK | 一致 |
| 顶层键数 | 10 | 10 | 一致 |
| 顶层键名顺序 | round,generatedAt,consoleMethod,consoleOriginal,elementsMethod,securityMethod,corrections,routes,fixlane,fixlaneGateReadout | 同左 | 一致 |
| `corrections` 长度 | **11** | **11** | 未缩 |
| `routes` 长度 | **73** | **73** | 未缩 |
| `fixlane` 长度 | **5** | **5** | 未缩 |
| `fixlaneGateReadout` 键数 | 3 | 3 | 一致 |
| `uncovered` / `remaining` / `sessionContradictRows` | 5/236 / 5 条 / 0 | 5/236 / 5 条 / 0 | **一字未动** |
| `round` / `generatedAt` | 1 / 2026-10-09T22:25:53.827Z | 同左 | 未动（见 §4 条 4） |
| corrections 11 个 id 串 | CON-EV-01 … R2-OT-06(诊断增补) | 完全相同、顺序相同 | 无增删行 |
| fixlane 5 个 id 串 | REAL-VB03-03, REAL-PFI25-05/F07, CON-EV-01, CON-NET-02, F01/F02/REAL-OT-06(OT05/06/09) | 完全相同、顺序相同 | 无增删行 |
| 文件字节（parse 前 raw，JS 字符串长度） | 57302 | 60636 | 仅因追加改判记变长（+3334），无删除 |
| 盘上大小 | 66733B | 72404B | 同上（UTF-8 多字节口径） |
| 行数 | 1638 | 1638 | 一致（改判写进行内字符串，未增删行） |
| `git diff --stat` | — | `6 insertions(+), 6 deletions(-)` | 恰为 4 行的 6 个字段，无旁逸行 |

结论：**没有任何数组缩短**，没有行被删除或新增；变化只发生在 4 行 6 个字符串字段内部。

### 3.1 未伤及他行的证明

`corrections`/`fixlane` 逐下标与 HEAD 对比：changed rows = 4，全部命中预期 id；`unexpected-drift rows = 0`。8 个非目标顶层键（含 73 行 `routes`）JSON 串与 HEAD 完全相等。行尾符未变（diff 仅 6 行，若换行被改写会全文件翻动）。

### 3.2 本车道实跑的独立复核（2026-10-13，只读）

- `apps/client/src/components/profile/public/RelationshipCTA.vue` **在盘存在**（组件未缺失）。
- `apps/client/src/components/profile/public/PublicProfile.vue:11` `import RelationshipCTA from "./RelationshipCTA.vue"`、`:80` 模板内使用 ⇒ 组件被接进行渲染树。
- real 编译产物 `apps/client/dist/build/mp-weixin-real/components/profile/public/RelationshipCTA.{js,wxml,wxss}` 在盘，`PublicProfile.json` 注册该项，`PublicProfile.wxml` 实测发射 `<relationship-c-t-a wx:if="{{y}}" … bindlike/bindmessage/bindwhisper/bindfollow>` ⇒ **存在且（条件）渲染**，「组件不存在」不成立。
- 同时 `apps/client/src/subpackages/profile-extra/profile/other.vue` 与 `.../mp-weixin-real/subpackages/profile-extra/profile/other.wxml` 对 relationship-cta 命中数 **均为 0** ⇒ 当年那次 grep 的**读数是真的**，错的是**推论**：CTA 挂在 public-profile 分支，不在 `other` 页，拿 `other.*` 无命中去证「结构性错配实锤」是查错了文件。
- 结论形状：改判写作「读数成立、推论不成立」，而非「他们测错了」。
- 未写入本车道自测不到的数字：帧字节数（21137B/22726B/2424B）、outerWxml 13493B、复现次数 3 等全部沿用原行在册读数或以「（fix-round2.json 所载）」形式引用，未新增未经核实的计数。

### 3.3 旧判词留存核验（逐字段包含测试）

对每个被改字段，断言「HEAD 原串 ⊆ 新串」：

```
corrections[4].applied    retained=true
corrections[5].applied    retained=true
fixlane[1].result         retained=true
fixlane[1].ledgerEffect   retained=true
fixlane[4].result         retained=true
fixlane[4].ledgerEffect   retained=true
```

6/6 通过 —— 原句字节连续可读，改判只以「【改判 …】」追加在其后。（过程中曾有两处把标签插在原句中间导致原串断裂，已回改为纯追加，故此处为 6/6 而非 4/6。）

### 3.4 敏感词落点复核（确认无“美化 status”）

- `结构性错配` 命中 3 行（31/1623/1624）：全部位于留档块或「作废」改判句内。
- `实锤` 命中 3 行：同上。
- `critical` 命中 1 行（1605）：仅存在于【原口径·留档】内，其后紧跟「critical 产品缺陷候选撤销」。
- `产品缺陷候选` 命中 3 行（27/43/1605）：43 为 nearby 行（未动，候选成立是 R3-04 的结论）。
- `已修复` 两处上下文实测均为否定式：`本行不得读作已修复`、`——不得读作已修复`。PFI25 未获得任何更优 status；`fixlaneGateReadout` 与 `uncovered` 计数未动。

## 4. 未动但可疑（交拍板，本车道不修）

1. **`routes[].consoleRecap.landing` 与 `status`/`notes` 自相矛盾，共 12 行。** 全部 12 条 `status=NAV_FAIL` 行的 `consoleRecap.landing` 仍等于**请求路由本身**（回显），而同行 `notes` 写着实测落点不同页。例：`pages/nearby/index` landing=`pages/nearby/index` vs notes=落点`pages/discover/index`；`subpackages/vip/bills` landing=`…/bills` vs notes=落点`pages/profile/index`。这正是台账自己 `fixlane[2] CON-EV-01.run` 警告的「landing 列=open 目标回显、非实测落点」的落盘现场 —— 警告在册，但 73 行数据没按警告打标，下游仍可把它当落点证据。另：73/73 行 `consoleRecap.lines=0/errors=0/warns=0`（总行数 0），与 CON-EV-01「重放路径为可达上限」口径一致，但每行仍留 `error=0` 形状。修或标，需拍板（改数据 vs 加口径列）。
2. **`fixlaneGateReadout` 无 voided/pending 分桶**：`uncovered=5/236`、`sessionContradictRows=0`，而 `corrections[3] VI34`、`corrections[6] VI25` 自记「未有效判决」，`fixlane[1] PFI25` 改判「红已撤」，`fixlane[0] VB03` 以替换断言计「已判过」——R3-01 点名的 4 条门禁/台账分歧。补法归 `verify-real-coverage.mjs`（他车道文件）。
3. **`fixlane[0] REAL-VB03-03` 的 `ledgerEffect` 「VB03=已判过（EXECUTED）」与 R3-01④ 冲突**（原判据本体 onShow 缓存/下拉回读差异从未验证，flag 走向挂 needsUser F06 未拍板）。本车道未动：撤红授权只覆盖 PFI25，VB03 是否降档要 F06 拍板。
4. **顶层 `round` 仍为 `1`**，但 `corrections` 已含 `R2-*` 三条、`fixlane` 是 round-2 产物、并要接收 round-3 改判。台账自述轮次落后实际内容两轮（`generatedAt=2026-10-09T22:25:53.827Z` 同属过期）。
5. **三层根因①的措辞与今日盘上编译产物不符**：`corrections[10] R2-OT-06` 记「编译产物组件标签为路径形 `components/profile/public/RelationshipCTA`（非 relationship-c-t-a）」；本车道 2026-10-13 实读 `PublicProfile.wxml` 发射的是 kebab `<relationship-c-t-a …>`，`PublicProfile.json` 注册键亦为 `"relationship-c-t-a"`，全文 grep 未见路径形标签。可能解释：期间 `apps/client/src/**` 被重构/重编译（他车道在改），或层①当年即误判。**本车道未动该行**：不跑执行器就无法判定是「当时产物如此」还是「读错了」，且它是 R2-OT-06 在册证据；只把这条差异如实记下，待带内复测定谳。改判文本里我只引用「本台账 R2-OT-06 行在册三层原文」作指针，不复制层①的标签形状为我的实测。
6. `corrections[1] CON-NET-02` 「网络判点全部未有效测试」与 `fixlane[3] CON-NET-02.ledgerEffect` 「网络判点未有效测试」为同句双写（口径一致，无矛盾），仅属冗余。
