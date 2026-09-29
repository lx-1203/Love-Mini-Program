# 令牌裁决实现刀报告（decisions-v33 §1 / §2）

 lane：token-rulings · 工作树：`D:\6\恋爱小程序` · 分支 main（未 commit / 未 stage）
 裁定依据：用户 2026-09-29 06:20「一律按判据补齐实现」——冲突时只动实现，不动判据。

---

## 0. 先纠两处我核过的旧账（复述旧测量本身有风险，逐条重测）

1. **判据语料归属**：`reports/audit/round-6/ops/*.json`（24 清单 / 1107 用例，只读、带戳）里
   **没有任何一条用例点名 `--c-text-inverse` 或 `--r-lg`**。机器扫全 1107 条：
   `inverse` 命中 0、`--r-lg|radius-lg` 命中 0、`--c-*`/`--r-*` 形式令牌名只出现在
   DC05/DC06/DC45/REG16/PUB06/PR07/OC07/INT01/INT11/AC11/AC12/MW03 这 12 条里，与本两项无关。
   两项的权威判据文本在**台账** `reports/audit/round-6/issue-matrix.md`（列：判据/处置），
   可重跑的机器谓词在 `scripts/qa/verify-source-shape.mjs` 的 SPEC。
   语料戳未动，实测复跑：`STAMP_RESULT=PASS canon=0fef00d141e7 cases=1107`。
2. **§2 的冲突不止浅色档**：decisions-v33 标题写「浅色值完全相同」，实测
   深色档同样逐字相同（`styles/tokens.scss` 暗色 mixin 里 `--c-bg-container:#1A1F26`
   与 `--c-text-inverse:#1A1F26` 同值）。所以只改浅色那一半留不下可判性。

---

## 1. `--r-lg` 令牌值与判据正面冲突 → **BLOCKED（未改一行实现）**

### 1.1 判据原文（case-id + file:line）

- 台账行：`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004`
  —— `reports/audit/round-6/issue-matrix.md:171`（处置列 = 判据的强制句）
- 谓词行：同文件 col8（源码判点）+ `scripts/qa/verify-source-shape.mjs:886-893`
- 立案描述（本轮复述处）：`reports/audit/round-7/decisions-v33.md:19-23`

处置列原文（逐字）：

> 修：分两档，不得一刀切。①24rpx 两处（HEAD :1010 .publish-to__card / :1054 .publish-rows）走**等值**令牌 var(--r-xl)（theme/design-variables.scss:195 `$radius-xl: 24rpx` → :436 `--r-xl`）；**禁**走 var(--card-radius)——实测 `--card-radius: 40rpx`（design-variables.scss:652），按原锚点直改即 24→40rpx 视觉变更，须另立裁决行再裁。②其余 6 处（999/8/32/6/16/20rpx）无 24rpx 等值档，逐值找等值令牌（999→--r-full、16→--r-lg）或按 nit 保留，不等值即不替换。与令牌层收口串行

证据列原文（节选，同 col7）：

> publish.vue 的 border-radius **字面量**在 HEAD 874ff52f 为 :1000(999rpx)、:1010(24rpx)、:1019(8rpx)、:1025(32rpx 32rpx 0 0)、:1033(6rpx)、:1046(16rpx)、:1054(24rpx)、:1085(20rpx) 共 8 处

### 1.2 令牌定义与全部消费者（实测，非复述）

- 定义源：`apps/client/src/theme/design-variables.scss:194` `$radius-lg: 20rpx;`
  → 输出 `:435` `--r-lg: #{$radius-lg};`；TS 镜像 `apps/client/src/theme/tokens.ts:240` `lg: 20`；
  别名 `apps/client/src/styles/tokens.scss:96` `--radius-lg: var(--r-lg); // 16rpx`（注释漂移，值随 --r-lg=20）。
- 消费者（实测，已剔注释行与 `.correct` / `.bak` / spec 死件）：`var(--r-lg…)` 共 **137 处 / 62 个文件**
  （含短别名 `--radius-lg`，其定义 `styles/tokens.scss:96` 只是转发 `var(--r-lg)`）。
  **fallback 分布本身就是这条判据冲突的现场**：`16rpx`×40、`20rpx`×32、`18rpx`×5、`24rpx`×1、无 fallback×59。
  因为变量恒有值，40 处写着 `var(--r-lg, 16rpx)` 的站点今天实际全渲染 20rpx ——
  即「作者按判据那句 16→--r-lg 写了 16 的兜底，令牌实值却是 20」在本仓已扩散到 40 处；
  反过来 32 处按 20 写兜底（含 publish.vue:1126）。两批人各自认账，改哪一边都会把另一边 40 或 32 处推进错值。
- 本轮直接相关的两处（同文件、同一判据的射程内）：
  - `apps/client/src/subpackages/village/village/publish.vue:1082` `.publish-image { … border-radius: 16rpx; … }` ← 16rpx 字面量，按「不等值即不替换」留任
  - `apps/client/src/subpackages/village/village/publish.vue:1126` `.publish-tip { … border-radius: var(--r-lg, 20rpx); … }` ← 20rpx 字面量**已按「等值」换成 --r-lg**
  - 该文件 :1122-1124 的收口注释已把冲突写死在盘上：「.publish-image 的 16rpx 全表无等值档（--r-sm=8rpx / --r-lg=20rpx，台账处置列举例的『16→--r-lg』实为 16→20rpx 视觉变更，不采纳），按 nit 保留字面量」

### 1.3 为什么没有任何值能满足它（精确矛盾）

同一条判据里，「等值」是唯一授权替换的谓词，而它把 `--r-lg` 同时钉在两个互斥值上：

1. 括号例 `16→--r-lg` ⇒ 要求 `--r-lg == 16rpx`；
2. 「不等值即不替换」+ HEAD :1085 的 20rpx 字面量已被替换为 `var(--r-lg, 20rpx)`
   ⇒ 要求 `--r-lg == 20rpx`，否则 publish.vue:1126 就成了一次 20→16rpx 的**非等值替换**，
   正是该句判据自己禁止的行为。

标量不能同时等于 16 与 20。把 `--r-lg` 改 16rpx 会：
- 否证判据自身的等值条款（见 2）并把 publish.vue:1126 变成新视觉变更；
- 与设计规范 `deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md:86`
  正面冲突：该行把圆角档写死为「4 / 8 / 12 / **20** / 24 / 32 / 9999 rpx」，
  同文档 :93 更把 `$radius-lg` 的 16rpx 那份定义为「已知令牌债……后者覆盖前者（**生效 20rpx**），建议下轮清理去重」
  ——即设计口径与 Wave-2 收口（design-variables.scss:187-190 注释）都已裁定 lg 档 = 20rpx；
- 连带 137 处 `var(--r-lg…)` 消费者从 20rpx 变 16rpx（decisions §1 自述的「会影响所有用 --r-lg 的地方」）。

要让括号例字面成立，只能改判据（把 `16→--r-lg` 换成实值为 16rpx 的档，或在括号例外加豁免），
这属于本刀禁止的动作 ⇒ **停手上报，未动 `--r-lg` / `$radius-lg` / `tokens.ts radius.lg` 任何一处。**

### 1.4 该案的回归钉（只钉现状，不选边）

`apps/client/src/tests/design-token-rulings.spec.ts` 第 2 个 describe：
`$radius-lg == 20rpx` && `--r-lg == #{$radius-lg}` && `designTokens.radius.lg == 20`
&& `$radius-*` 声明仍为 7 档 && publish.vue 的 16rpx 字面量仍在位 && :1126 仍是 `var(--r-lg, 20rpx)`。
任何一侧被单方面挪动（把令牌改成 16，或把 16 字面量悄悄换成 --r-lg）都会先在这里变红。

---

## 2. `--c-text-inverse` 与 `--c-bg-container` 同值 → **已按判据补齐实现**

### 2.1 判据原文（case-id + file:line）

- 被这条同值卡住的判据：`MP-R2-PAGES-REGISTER-INDEX-014`
  —— `reports/audit/round-6/issue-matrix.md:119`，col8 源码判点：
  > 源码判点：(A) 三处彩色底上的白色前景改用 var(--c-text-inverse)，并明令禁改 var(--c-bg-container)
  col10 处置列（判据本体，逐字节选）：
  > 修：**拆两类映射，不得合并成一句**。（A）彩色底上的白色**前景**（:1036 .sms-btn__text、:1119 .submit-btn__text、:1136 .submit-btn__spinner 的 border-top-color）→ `var(--c-text-inverse)`（浅色 #FFFFFF、暗色 #1A1F26 皆为「叠在彩色/浅色块上的反色前景」语义）。**禁**改 `var(--c-bg-container)`——其暗色＝tokens.scss:235 #1A1F26，会把彩色钮上的白字刷成近黑字，属新缺陷。
  谓词：`scripts/qa/verify-source-shape.mjs:452-456`（`countEq var(--c-text-inverse == 3` + `present var(--c-bg-container`）。
- 给出解法的判据（同一族）：`MP-R2VIS-THEME-DESIGN-VARIABLES-002`
  —— `reports/audit/round-6/issue-matrix.md:175`，col8：
  > 源码判点：图上徽标的底色/前景走图片遮罩令牌，不再在暗色变量块里重复定义 --c-text-inverse
  谓词：`scripts/qa/verify-source-shape.mjs:180-185`。
- 不可判性的立案句：`reports/audit/round-7/open-row-dispositions.json`（该 case-id 条目 reason）
  > The forbidden substitution is pixel-indistinguishable from the required one … so no frame in either theme can tell them apart.
  以及 `reports/audit/round-7/round7-NOTES.md:614-615`「用对用错逐像素一致，这条判据永不可判」。
- ops 语料 1107 条中无比本项更近的判据（见 §0.1）。

### 2.2 before / after（含每一处定义源）

| 定义源 | before | after |
|---|---|---|
| `theme/design-variables.scss:108` `$text-inverse` | `#FFFFFF` | **删除**（影子源；值归口到 :710 遮罩白字档） |
| `theme/design-variables.scss:359→369` `--c-text-inverse`（浅色） | `#{$text-inverse}` = `#FFFFFF` | `var(--c-overlay-text-primary)` = `rgba(255, 255, 255, 0.95)` |
| `theme/design-variables.scss:366` `--c-bg-container`（浅色） | `#FFFFFF` | `#FFFFFF`（**未动**，判据禁改 + 规范 §1.2 卡片 = #FFFFFF） |
| `styles/tokens.scss:244` `--c-text-inverse`（暗色 mixin） | `#1A1F26` | **删除**（判据原句：不再在暗色变量块里重复定义） |
| `styles/tokens.scss:217` `--color-text-inverse`（暗色 mixin） | `#1A1F26` | **删除**（kebab 别名继续等于 :57 的 `var(--c-text-inverse)` 单一来源） |
| `styles/tokens.scss:235` `--c-bg-container`（暗色 mixin） | `#1A1F26` | `#1A1F26`（未动） |
| `subpackages/village/village/detail.vue:1470` 页面级强制浅色钉 | `#FFFFFF` | `var(--c-overlay-text-primary)`（同块 :1461 `--c-bg-container:#FFFFFF` 保持不动） |
| `theme/tokens.ts:179` `designTokens.color.text.inverse`（JS 镜像·浅色） | `#FFFFFF` | `rgba(255, 255, 255, 0.95)` |
| `theme/tokens.ts:498` `darkThemeTokens…text.inverse`（JS 镜像·暗色） | `#1A1F26` | `rgba(255, 255, 255, 0.95)`（暖色档继承 :179） |

选值依据：不引入新色值、不自造 magic colour。`rgba(255, 255, 255, 0.95)` 是本仓既有的
「深底/图片遮罩上的白字」档 `--c-overlay-text-primary`（design-variables.scss:710，
同族 secondary/tertiary/quaternary/placeholder 分档在 :711-714），并且 :742 的
`--c-badge-on-image-text: var(--c-overlay-text-primary)` 已经用过同一个 var 别名范式；
该族按 :745 注释「不随主题翻转」，正好承接判据「不再在暗色变量块里重复定义」的要求。
规范 §1.2 配色表未给 `--c-text-inverse` 立档 ⇒ 移动它不与设计口径冲突（对比 §1.4 把圆角档写死，故 §1 blocked）。

### 2.3 逐消费者核过（约 200 处引用，全部按语义归类）

- CSS 引用 `var(--c-text-inverse)`：**213 处 / 80 个文件**（实测，已剔注释行与 `.correct` / `.bak` 死件），覆盖 components/(chat、common、discover、home、profile、setup、social、village)、pages/(login、profile、nearby、messages…)、subpackages/(campus、chat、circles、discover、discover-extra、market、profile-extra、settings、setup、support、tools、village、vip)、`custom-tab-bar/index.wxss:93`、`styles/_components.scss:73/111/143/203`、`theme/global.scss:86 .text-white`。
  全部落在**彩色/品牌底的前景**：`--c-gradient-brand`、`--c-error`、`--c-secondary-blue-400`、`--c-brand*`、图片遮罩、`--c-badge-campus`。0.95 白压这些底与前一样子（对比度不降）。
- 作 `border-top-color`（spinner）：`album.vue:761`、`register/index.vue:1136` 等 ⇒ 同上。
- 作 `background`（反色小圆点，1 处）：`subpackages/profile-extra/settings/dnd.vue:798`，原注释即「反色背景：使用 token 替代硬编码 #ffffff」⇒ 近白仍正确。
- JS 侧 `tokens.color.text.inverse`（2 个组件）：`components/common/EducationBadge.vue:32`（verified 态压在 `t.color.gradient.brand` 上）、`components/social/SocialProgressIndicator.vue:71-73`（L4~L6 压在 #5B7FFF/#4C6EF5 上）⇒ 深色档原先给近黑前景本就是错的方向，改后两档都是近白。
- 别名链：`styles/tokens.scss:57 --color-text-inverse: var(--c-text-inverse)`（唯一剩余定义）。
- 带 fallback 的引用 `var(--c-text-inverse, #ffffff)`（privacy.vue、support/feedback、tools/love-center/*、activities/detail.vue、village/detail.vue:3246 等）不受影响：变量始终有值，fallback 永不生效。
- 判据点名的三处（register/index.vue）位置与计数未动，源码级判点仍成立。

### 2.4 回归钉

`apps/client/src/tests/design-token-rulings.spec.ts` 第 1 个 describe（10 it）钉：
浅/暗两侧 `--c-text-inverse` 与 `--c-bg-container` 不再同值、暗色 mixin 内不再有反色前景定义、
`--c-bg-container` 两档原值未被动、`$text-inverse` 影子源不得复活、
TS 镜像与 CSS 层同值、以及 REGISTER-014 源码判点的 3 处计数。

---

## 3. 验证（全部实测退出码，非复述）

| 门 | 命令 | 结果 |
|---|---|---|
| 类型 | `pnpm -C apps/client typecheck`（= `vue-tsc --noEmit`） | **TYPECHECK_EXIT=0** |
| 单测 | `node22 apps/client/node_modules/vitest/vitest.mjs run --config vitest.config.ts`（= `pnpm -C apps/client test` 的同一条命令，PATH node 是 v16 会把 vitest 2.1 打崩，所以显式走 Node 22） | **Test Files 121 passed (121) / Tests 1356 passed (1356) / VITEST_EXIT=0**，Duration 203.94s |
| 源码形状门 | `node22 scripts/qa/verify-source-shape.mjs --dry` | **SRC_SHAPE_RESULT=OK / SRC_SHAPE total=98 成立=98 不成立=0 补丁=182（守恒：yes）/ SRC_SHAPE_CRIT 判据台行=7 成立=7 / SRC_SHAPE_NEG 注入点=33 已变红=33 / SRC_SHAPE_EXIT=0** |
| 判据语料戳（只读证明） | `node22 scripts/qa/verify-ops-corpus-stamp.mjs --check` | 改动前后各跑一次，两次同值：**STAMP_RESULT=PASS files=24 cases=1107 canon=0fef00d141e7 戳记=0fef00d141e7**（`git status` 里 `reports/` 无任何 `M` 条目） |
| SCSS 真编译 | `sass.compile('apps/client/src/styles/tokens.scss')`（Node22 + 仓内 sass 1.101.0，产物只写到 `.zcode/tmp/_tokens-compiled.css` 草稿） | 编译成功 39193 字节，输出逐条：`--c-text-inverse: var(--c-overlay-text-primary)` / `--c-overlay-text-primary: rgba(255, 255, 255, 0.95)` / `--c-bg-container: #FFFFFF`（浅色）与 `--c-bg-container: #1A1F26`×3（三个暗色选择器）且暗色块内**不再出现** `--c-text-inverse`；`--r-lg: 20rpx`、`--r-xl: 24rpx` 一字未动 |

没有一条既有测试变红，也不需要改任何既有断言（基线 120 文件 / 1343 例 → 现在 121 / 1356，增量恰为本刀新增的 1 文件 13 例）。
最后一次全部门复跑（所有 src 改动落定之后）：`SRC_SHAPE_EXIT=0 / 98 成立=98 不成立=0 / RESULT=OK`，
`STAMP_EXIT=0 / PASS canon=0fef00d141e7 cases=1107`，工作树里属于本刀的 `M` 仍只有上表四个 + 一个新 spec。
特别说明：`MP-R2-PAGES-REGISTER-INDEX-014` 的源码判点（register/index.vue 内 `var(--c-text-inverse` 计数 3）
在改动前后都成立——本刀只动令牌值，没动那三处引用；它过去「判不出」是因为两令牌同值，不是计数不对。

### 3.1 残留风险（本刀未处理，留给复验员/后续刀）

1. **帧级复核待做**：暗色档的反色前景从 #1A1F26 翻成近白，是**看得见的视觉变更**
   （彩色钮/认证徽标/漏斗 L4~L6 上的字与描边）。裁定册 §0 已预告「改完会动视觉，需构建后帧级复核」；
   本刀按硬约束**未重建产物、未碰 dist、未跑 verify-band-freshness**，产物与本刀 src 必然不同步，这是预期的。
2. 值可判性口径：`rgba(255,255,255,0.95)` 压在纯白容器上合成后仍是白（alpha 叠白＝白），
   因此「近白字压白底」这一类**配对**缺陷不由本条令牌值解决——那一半已由 Wave-2 的成对令牌
   `--c-badge-on-image-bg/-text`（design-variables.scss:741-742）关掉。本刀关掉的是
   「判据点名两枚令牌之一、另一枚明令禁用，而两枚同值 ⇒ 逐像素不可判」这一半：
   在判据点名的场景（彩色底）上，两枚令牌现在合成差为曼哈顿 18~53（随底色），
   且**声明值**已不同，源级别永远可判。
3. 全仓唯一一处「同块内 color: var(--c-text-inverse) + background: var(--c-bg-container)」的配对
   = `apps/client/src/pages/nearby/index.vue:1036-1037` `.activity-entry`，已逐子节点核过：
   `__title`(:1064 --c-text-primary)、`__desc`(:1069 --c-text-secondary)、`__arrow`(:1082 --c-text-quaternary)
   三处自设色，父级那行 color 没有承载任何文本 ⇒ 不是现行缺陷，且改它超出本刀文件范围，未动。

---

## 4. 我动过的文件（`git diff --numstat` 原样输出，仅本刀四项 + 新档）

```
11	2	apps/client/src/styles/tokens.scss
4	1	apps/client/src/subpackages/village/village/detail.vue
14	4	apps/client/src/theme/design-variables.scss
11	2	apps/client/src/theme/tokens.ts
```
新增（未跟踪，故不在 numstat 内）：`apps/client/src/tests/design-token-rulings.spec.ts`（136 行 / 13 例）。

`--r-lg` 一项**零文件改动**（BLOCKED，见 §1）。

## 5. 工作树里别人的改动（本刀一律未 stage / 未 commit / 未 stash）

- 会话开始时 `git status --porcelain --untracked-files=no` 为**空**；结束时为 6 个 `M`，其中 2 个不是本刀的：
  `scripts/qa/test-evidence-store-axis.mjs`（20/6）、`scripts/qa/verify-evidence-corpus.mjs`（65/6）
  ⇒ 即任务书预告的「另一条车道在改 verify-evidence-corpus.mjs」，本刀未触碰、也未据其下结论。
- 会话期间 HEAD 从 `dbb2a7a1` 前进到 `138c366b`（体积口径车道按裁定 #23 改 `scripts/verify-package-size.mjs` 后自己提交的），
  另有 133 条 `??` 未跟踪文件（`reports/audit/round-7/**` 的 exec-*/judge-stand/ledger-plan 等产物、`.qoder/`）——都不是本刀产生的。
- `verify-ops-corpus-stamp.mjs --check` 自己会在 `reports/audit/round-6/ops/` 落一枚
  `.stamp-last-read.json` 读数标记（我中途 `git status` 撞见过它一次，最终状态该文件不在盘上、
  ops 目录零 `M`）；语料 24 份 JSON 与戳记全程未变。
