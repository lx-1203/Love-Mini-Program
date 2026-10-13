# 组件穿透车道（comp-chain-lane）— 2026-10-13

职责：把 OT05/OT06/OT09/OC09 里 handler 侧那条通道欠款做成**离线可证的链感知解析** + 能红的测试，然后带设备真档射 OT05/OT09（handler 路由）+ PFI25（按 recipe-lane §5 处方）。骨架先行、逐步追加。
边界：不碰 `apps/client/src/**`；不改历史 `exec-*`/台账/`.zcode/**`；不 `git add/commit/checkout/stash`；新输出只落 `reports/audit/round-7/exec-v38-*/`；scratch 落 `tmp/qa/`；租约锁 `tmp/qa/locks/ui-audit-v38.lock`。node 用绝对路径 v22（`D:/codex-tools/node-v22.17.0-win-x64/node.exe`）。

## 0. 组件链实读（读产物，不读文档）

`apps/client/dist/build/mp-weixin-real/subpackages/profile-extra/profile/other.json` usingComponents：
`whisper-compose-sheet / profile-shell / bottom-sheet`。
`components/profile/ProfileShell.json`：`public-profile / my-profile / loading-spinner`。
`components/profile/public/PublicProfile.json`：`relationship-c-t-a(=./RelationshipCTA) / …`。
⇒ **链 `profile-shell → public-profile → relationship-c-t-a` 逐字是各层 .json 的 usingComponents 键（kebab-case）**，与题面一致；与上一程台账「编译标签是路径形 components/…/RelationshipCTA」的说法相反（再次证伪）。
`test-cap-recipes.cjs §9` 就是拿这三个 .json 现查、链末段落在 `components/profile/public/RelationshipCTA.json`。

**但 handler 落点实读与题面「在三层子组件上」不符——两条独立的实测证据**（照题面「读文件自己确认再报告」的要求写下来）：
- 源侧：`handleLike`(`other.vue:171`)、`openWhisperSheet`(`other.vue:250`) 都在**页 `other.vue` 的 `<script setup>`**，经 `@like/@whisper` 挂在 `<profile-shell>` 上（`other.vue:426/428`）；`RelationshipCTA.vue` 只 `emit('like'/'whisper'/'message'/'follow')`（源 :46/:52/:58/:67），**没有** 这两个同名方法。`subpackages/chat/official-chat/index.vue` 的 `loadOfficialChat` 同理是页级 `<script setup>`。
- 编译产物：`other.js` 里 `handleLike/openWhisperSheet` 被最小化成 `setup` 里的局部常量 `Q`/`Y`（`async function Q()` 打 POST /matches/like、`function Y()` 打开 whisper sheet），渲染绑定写作 `g:e.o(Q,"e5")`、`i:e.o(Y,"dd")`（`e.o` 是 vue3 事件包装，不是实例方法），既不在页实例的具名方法上、也不在 CTA 叶子实例上。
⇒ 即便链通到 CTA 叶子，`handleLike` 也不在那儿；直调页级 `<script setup>` 闭包**在名字这一层根本不可达**。这就是 v37-relegs 交出 `no-method(<route>)` 的真因——不是「没追子组件」这么简单。

## 1. 通道改造（handler 解析链感知 · 默认关 · 单一通道扩展）

改动面只在 `scripts/qa/exec-capabilities.mjs`（+ `scripts/qa/test-exec-capabilities.cjs`、`scripts/qa/test-cap-recipes.cjs`、`scripts/qa/case-recipes.json`）：
- **`normalizeHandlerChain(spec)`（新导出）**：把 handler 步上的组件链归一化为标签数组，接受三种写法：`componentChain:[...]` / `chain:[...]` / `componentSelector:"a >>> b >>> c"`；每段必须匹配 `CHAIN_TAG=/^[a-zA-Z][a-zA-Z0-9_-]*$/` 且不含 `/`，否则回 error。
- **`parseHandlerCall`**：解析链、把 error 转成拒收（`handler 的组件链不合法：…`）；spec 上带 `componentChain` 与 `chainSource`。
- **`handlerCallSource(spec)`** 分两形（`spec.componentChain.length>0` 判定）：
  - **链形**：从页实例起，`for (i=0; i<chain.length; i++) { var nx = node.selectComponent(chain[i]); if (!nx) return res('chain-missing <tag> @<i>'); node = nx; }`。父节点没有 `selectComponent` 也独立回执 `chain-no-select <tag> @<i>`。到叶子按 **vm / instance / setupState / ctx** 四格找方法（`c.$vm / c / c.$vm.$.setupState / c.$vm.$.ctx`），命中 via 前缀 `chain-`；都找不到 → `method-absent <route> @<a>b>c`。
  - **缺省页形（无 componentId 且空链）逐字保留既有 `vm` / `page` 短路次序与 `no-method <route>` 回执**，只补 `page-setupState` / `page-ctx` 两个把手（对已命中 vm/page 的配方一字不变，只可能给历史 no-method 多一次机会）。带 `componentId` 时链为 `component-vm/component-instance/component-setupState/component-ctx`。
- **`handlerCallVerdict`** 加三条独立前缀映射：`chain-missing → chain-hop-missing(...)`、`chain-no-select → chain-parent-not-component(...)`、`method-absent → method-absent-on-component(...)`。八种原始回执（含空读数）**两两不折叠**——这条正是「一枚折叠 `no-method` 让病隐形两个 attempt」的反面。
- `validateRecipes` 里已有的 handler 步循环自然把 `parseHandlerCall` 的链错也拒收（不需要新条件）。
- **不新增第二条通道**、不动 `handlerCallOk`、不改 `MODE_SUFFIX`/banner：`--handler-call` 仍只接管声明了 `handler` 的步，旗标默认关时 `handlerFallback` 第一步 `if (!step || !step.handler) return null;` 原样把句柄交回旧路径。
- 不动 `apps/client/src/**`。

## 2. 测试与变异证明（能红）

- `CAPS_TEST=PASS（checks=77）`（原 67 + 十条 C8-bis 新判点）：链数组/selector 路径两种输入同解、路径形/点号井号被拒；链载荷 `new Function("return("+src+")")` 可解析、含 `selectComponent(tag)` 与 `chain-missing`/`method-absent` 独立前缀、无 `uni` 记号；八种回执两两不折叠且 `handlerCallOk` 只在 `ok-*` 上为真；缺省页形保留 `via='vm'/'page'` + `no-method`；`validateRecipes` 拒收链形错的 handler 步。C6 的 `specFor(handlerCall)` 现在喂**带链的 spec**，`handlerCallSource` 的链形源码也纳入「每个 *Source 生成器产出的源码都可解析」——上一程那枚多余 `}` 的教训在链形上继续受保护。
- `CAPRECIPES_TEST=PASS（checks=128）`（原 121 + 七条 §9）：新增 `resolveChainRegistration(page,chain)` + `handlerChainProblems(recipes)`——**从 `*.json` 现查每一跳的 `usingComponents[tag]`、解析相对路径、核对下一层 .json 存在**；对四例的每一个 handler 步要求显式声明 `componentChain`（OT05/OT06/OT09 三层链；OC09 `loadOfficialChat` 空链=页级）。链叶子当场核到 `RelationshipCTA.json`。§9 只核注册表可达性，**不解锁也不替代 §8 的「动作步恰命中 1 枚」**——一条专项断言把 PFI25 的 tap 脱伪类放宽成命中 2 枚，§8 照旧判红、§9 不参与，两判点互不解锁。
- **工作树外的一次性变异副本**（`C:/Users/dsghy/AppData/Local/Temp/comp-chain/`，跑完已删）——每条新判点各配一枚能红的变异：

  ```
  M1 删除 handlerCallVerdict 三条链/叶子分支        → CAPS_TEST=FAIL checks=77
     FAIL C8-bis 回执各自点名模态（chain-hop-missing/chain-parent-not-component/method-absent-on-component/ok(via=chain-*)）
  M2 把 normalizeHandlerChain 的 TAG 关拆掉         → CAPS_TEST=FAIL checks=77
     FAIL C8-bis 负例：路径形/类名当组件段一律 parseHandlerCall 拒
     FAIL C8-bis validateRecipes 拒收链形错的 handler 步
  M3 把链形载荷 chain-missing/method-absent 折回 no-method → CAPS_TEST=FAIL checks=77
     FAIL C8-bis 链载荷逐跳 selectComponent、带 chain-missing/method-absent 独立前缀
  M4 把 OT05 一处 componentChain 末段改成未注册名  → CAPRECIPES_TEST=FAIL checks=128
     FAIL §9 四例的每个 handler 步都显式声明了 componentChain
     FAIL §9 活配方全体 handler 步的声明链与注册表零冲突
        :: 次要20|OT05 step#7 声明的 componentChain 与产物注册表对不上：
           第 3 跳标签 relationship-cta 不在 components/profile/public/PublicProfile.json 的 usingComponents 里
           （该层实际键=[public-hero,…,public-moment,relationship-c-t-a,governance-menu,loading-spinner]）
  ```

  M4 的红**只来自那一刀**、且直接从真产物读出来（不是抄笔记）——把 `relationship-c-t-a` 少写两个连字符就撞 PublicProfile.json 的实际键列表。删副本再跑，两份测试回到 `PASS（77）/ PASS（128）`。
- 兄弟套件未退化：`VERB_TEST=PASS`；`r-exec-cli --selftest` 与其余离线件本车道不重复跑（同一份 exec-capabilities 已被 CAPS/CAPRECIPES 全数扫过）。

## 3. 带内三例（real@f0677920）

**通道凭据**（`ws-channel-up --project apps/client/dist/build/mp-weixin-real --wait 300`，v38 锁内）：
```
WS_UP=ALREADY_UP port=9420 connectMs=171 page=subpackages/chat/official-chat/index hits=00000000
WS_UP_BAND=match … VITE_API_MODE=real MODE=real envSha8=f0677920 / 实例自报 apiMode=real
WS_UP_BAND_RESULT=match exit=0
```

**正向对照（当场复跑）**：real 档登录页在带内被会话内 store 顶回 `pages/discover/index`（`v37-positive-control.mjs` 的 login-only 把手在这条实例上打不开——`open pages/login/index` 之后 `route=pages/discover/index`），所以本腿的 POSITIVE_CONTROL 换用 **ui-channel-lane 那条已被量过的形状**（`tmp/qa/v37-nearby-probe.mjs`，同租约同端口）：
```
V37_CHANNEL_OK=ws port=9420 band=real@f0677920
V37_IDENTITY=sessionSource=phone-login loginVerify=logged-in userId=100158 tokenLen=249
V37_BEFORE=stack=pages/discover/index top=pages/discover/index
V37_SWITCHTAB=switchTab-ok
V37_AFTER=pages/nearby/index  /  V37_AFTER_SETTLE=pages/nearby/index
V37_CENSUS 15 枚节点：.nearby-home=1 / .nearby-entry=5 / .campus-entry=4 / .circle-mini=8 / .nearby-post-item=3 … TOTAL=31
V37_VERDICT=PASSES(nearby-stable)
```
⇒ 通道**选得到（`$` 出 31 计数）+ 动得了（switchTab ok）+ 读得回（路由 3s 后仍在 nearby）**；在此之后任何 `absent`/`chain-missing`/`method-absent` 才是可采信的仪器读数。

**执行器**：`r-exec-ws.mjs --real --identity A --navto-open --handler-call --strict-verbs`（OT05/OT09 两条腿；PFI25 单独按 recipe-lane §5 处方跑，不带两旗标）。名单文件：`tmp/qa/v38-ot-ids.txt`、`tmp/qa/v38-pfi25-ids.txt`。踩坑记录：**不要给 `--only 次要20`**（那会把交叉校验的判据台也裁掉，`WSX_RECIPE_BAD PAGES-PROFILE-INDEX|PFI25 不在判据台里…` 五行 ⇒ 一行都不跑）；`--ids-file` 已经把范围收到具体 id，让 `validateRecipes` 对全判据台跑就好（v37-relegs lane 也踩过同一坑）。

**逐条读数**（新目录，未改任何历史 `exec-*`）：

| case | verdict | dispatched | 判定动作卡在哪 | 链感知给出的**独立**回执 |
|---|---|---|---|---|
| 次要20\|OT05 | UNVERIFIED-INSTRUMENT | **0** | #7 tap `…__btn--like`（已完成 7/18，modal 已 arm 但没 tap 可触发） | `chain-hop-missing(profile-shell @0 ⇒ selectComponent 在该跳返回 null)` — 独立前缀，不再折叠成 `no-method` |
| 次要20\|OT09 | UNVERIFIED-INSTRUMENT | **0** | #4 tap `…__btn--whisper`（3/32，whisper 弹层从未打开） | 同上：`chain-hop-missing(profile-shell @0)` |
| PAGES-PROFILE-INDEX\|PFI25 | UNVERIFIED-INSTRUMENT | **0** | #13 `drainModal 期望≥1 实收 0` — **按 recipe-lane §5 判读为仪器欠款** | #6/#10 同刻 probe 报 `.voice-preview__delete=present(2)` 与 `.voice-preview__delete:last-child=present(2)` ⇒ `instrumentFault=recipe-positional-pseudo-ignored` |

三例都在**同一份活配方**（`scripts/qa/case-recipes.json`）上跑，未裁快照、未改历史行；`WSX_ADMISSIBLE=yes`（探针/落点都有答案），`WSX_STATS executed=0 failed=0 skipped=2 配方中止=2`（OT 那批）。PFI25 那一行**从执行器默认 `FAILED` 改回 SKIPPED/UNVERIFIED-INSTRUMENT**——不是我为了挪数改口径，是它自己的 step#6/#10 同刻读数就是 §5 说的那种「present(2) ⇒ 记仪器欠款」形状；`status` 从 FAILED 改到 SKIPPED 让门不认领覆盖（JUDGED 不含 SKIPPED）；前后 REALCOV 五个数一字未变（§4 复量），没拿它凑覆盖、也没往「欠账」上添行数。

**诊断（一次带内实测，`tmp/qa/v38-diag-selectcomponent.mjs`）**——把「tag 到底能不能被 `selectComponent` 拿到」当场问了一遍：
```
V38_DIAG={"route":"subpackages/profile-extra/profile/other","hasSelectComponent":"function",
  "hits":{"tag-bare profile-shell":"null","dot-scoped-class .data-v-365955e8":"OK ctor=ui",
          "hash-tag #profile-shell":"null","dot-tag .profile-shell":"null","attribute-form [u-i]":"null"}}
```
⇒ 题面给的 `selectComponent('profile-shell')` 在 WeChat 这一版 base library 上拿不到组件（只吃 `#id`/`.class`）；能拿到的是 uni-app 给 `<profile-shell>` 打的 scoped class `.data-v-365955e8`（`ProfileShell.wxml` 的 `public-profile` 上是 `.data-v-65112166`、`PublicProfile.wxml` 的 `relationship-c-t-a` 是 `.data-v-71835710`）。这条**不能塞进权威配方**：scoped class 是**文件内容哈希**，任何 `.vue` 改动都会重算；§9 校验器要的是各层 .json 的 `usingComponents` 键，两形**互不重合**。所以链感知代码是对的、回执是准的，但这条腿落不成产品结论——修它的两条真修都在别的车道：
  (a) 作者侧给 `<profile-shell>/<public-profile>/<relationship-c-t-a>` 三枚各补稳定 `class`/`id` + 把 `handleLike/openWhisperSheet/loadOfficialChat` 经 `defineExpose`（或改回 Options-API `methods`）暴露出去；`apps/client/src/**` 本轮 user-gated，本车道一行不动；
  (b) 载具侧在 DOM 端补「第 k 枚 / 按 aria-label 命中」把手（`c21-executor-capability-matrix.md` G-14 在册 25 条同类）。

## 4. 门前后复量（同一台机、同一份工作树）

命令（前后各跑一遍）：
```
node22 scripts/qa/verify-real-coverage.mjs --ops reports/audit/round-6/ops --dir reports/audit/round-7 --ledger reports/audit/ui-audit-2026-10-09/tour-ledger.json
```
| | COVERED | UNCOVERED | VOIDED | CONSERVATION | UNPROVEN_ROWS |
|---|---|---|---|---|---|
| 前（本车道开局、exec-v37-relegs 四条 SKIPPED 落盘后） | 199 | 5／236 | 4 | OK 免检=28 + 覆盖=199 + 欠账=5 + 待判=4 = 236／236 | 1150 |
| 后（本轮 exec-v38-ot-handler + exec-v38-pfi25 落盘） | **199** | **5／236** | **4** | OK 免检=28 + 覆盖=199 + 欠账=5 + 待判=4 = 236／236 | 1150 |
| 附加：收尾复量 `REALCOV_SESSION_SCANNED=3301／16096`（证过=134 不可证=3167 不符=0）、`SESSION_PROVEN=104`、`SESSION_UNPROVEN_ROWS=1150`（题面基线 1150 一致） | — | — | — | — | — |

> 数字口径：SCANNED 由 `relegs-lane` 记的 16093 涨到 16096，差值全来自本车道新增的 exec-v38-* 行（均为 sessionSource=phone-login / loginVerify=logged-in userId=100158 的可证身份），`UNPROVEN_ROWS` 没被推高、`CONTRADICT_ROWS=0`。

`REALCOV_RESULT=FAIL` 不变。UNCOVERED 点名同一批五条：`VRN07 · OT05 · OT06 · OT09 · OC09`（登录轴），`NO_GUEST_JUDGED`：`OT06 · OC09`。四条腿保持 UNCOVERED 是**正确**结果：判定动作下发=0 ⇒ 不该换来覆盖；本车道一行没动 `status/identity/band` 去凑数，也没新增不可证身份行。

## 5. 未做与原因

- **OT06/OC09 的 `arm-unverified` 臂展那一半**（真档 `wx.request` 非本通道 mock，`requestType=function`）：题面点名排除在范围外 ⇒ 不射；这两条的登录轴仍 UNCOVERED、游客轴仍 `NO_GUEST_JUDGED`。
- **OT06/OC09 的游客轴**：只读注入动词是否豁免未定 ⇒ 不射（与 `relegs-lane.md §未做与原因` 同口径）。
- **VRN07**：需 DB 夹具、用户未授权 ⇒ 不射。
- **VB03/VI25/VI34**：不在本车道题面 ⇒ 不射（配方与判据未动，`CAPRECIPES_TEST=PASS checks=128` 只是**没把它们弄红**）。
- **不改 `apps/client/src/**`**：本轮 user-gated（题面明写）——链要真落，`defineExpose` + 稳定 class/id 是唯一让链叶子能命中方法的路；这条决策不在本车道做。
- **不新造第二条 handler 通道**：题面「扩一条通道就够 ⇒ 就别开第二份」。本轮把 `parseHandlerCall / handlerCallSource / handlerCallVerdict / validateRecipes` 四件都做成**同一条通道**的扩展；`MODE_SUFFIX`/banner/默认关语义一字未动。
- **不重编译产物带**：本车道只读 `apps/client/dist/build/mp-weixin-real/**`（§9 校验器、链叶子核对、§0 实读都从这份产物），band 保持 `real@f0677920`。
- **不动历史 `exec-*`**：`exec-v37-relegs/exec-results.json` / `exec-v37-pfi25/exec-results.json` / `…nearby` 都按原样保留；本轮新输出只在 `exec-v38-ot-handler/` 与 `exec-v38-pfi25/`（**各只一个 `exec-results.json`**）。

## 6. 租约与 git 足迹

- `ui-audit-v38.lock`（`QA_UI_RESOURCE=ui-audit-v38`）：`tmp/qa/v38-lease-run.mjs`（抄 `v37-lease-run.mjs`，只改资源名，finally + SIGINT/SIGTERM 释放）包住 bring-up / login-redirect 观察 / positive-control（两次） / nearby 对照 / selectComponent 诊断；`r-exec-ws.mjs` 两条腿自带 `guardUiLease`，退出即释放。每步都打 `LEASE_RELEASE={"released":true,…}` + `LEASE_HELD_AFTER=[]`；从未删锁文件；本车道收尾复量：
  ```
  HELD=[]
  ```
- git 足迹（新添加/新写入）：
  - 编辑：`scripts/qa/exec-capabilities.mjs`、`scripts/qa/case-recipes.json`、`scripts/qa/test-exec-capabilities.cjs`、`scripts/qa/test-cap-recipes.cjs`
  - 新目录：`reports/audit/round-7/exec-v38-ot-handler/exec-results.json`、`reports/audit/round-7/exec-v38-pfi25/exec-results.json`
  - 本文件：`reports/audit/ui-audit-2026-10-13/comp-chain-lane.md`
  - scratch：`tmp/qa/v38-*.mjs`、`tmp/qa/v38-*.txt`、`tmp/qa/v38-*.json`、`tmp/qa/v38-gate-final.txt`
  - 出帧目录：`reports/screenshots/ui-audit-2026-10-13-v38-ot-f0677920/`、`…-v38-pfi25-f0677920/`（本次判定动作 dispatched=0，帧空属正常）
  - 未动：任何历史 `exec-*`、`.zcode/**`、台账 `tour-ledger.json`、`apps/client/src/**`、`apps/client/dist/**`
  - **不 `git add/commit/checkout/stash`**（提交由用户拿）。
