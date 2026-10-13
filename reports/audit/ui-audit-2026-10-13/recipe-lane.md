# 配方车道 2026-10-13（离线修配方，不碰设备）

范围：只改 `scripts/qa/case-recipes.json` 与 `scripts/qa/test-cap-recipes.cjs`。没跑设备腿、没碰
`reports/audit/round-7/exec-*`、没动 `r-exec-*.mjs`/`exec-capabilities.mjs`、没重编译产物带、没落台账、无 git add/commit。

## 1. 歧义定位（量出来的，不是读配方读出来的）

- 案：`PAGES-PROFILE-INDEX|PFI25`，v37 腿回 `UNVERIFIED-INSTRUMENT`（`reports/audit/round-7/exec-v37-pfi25/exec-results.json`，
  `instrumentFault=recipe-tap-target-ambiguous`）。产品侧行为没问题（modal 装上了、文案 `提示|确定删除当前语音状态吗？` 可读）。
- 数的是**当前编译产物**（跑的就是这包）：`apps/client/dist/build/mp-weixin-real/pages/profile/index.wxml`。
  该页 `.voice-preview__delete` 类 token 命中 **2 枚** `<view>`：
  前者 `aria-label="{{I}}" bindtap="{{J}}"`（文案 `{{H}}`=「重录」），后者 `aria-label="{{L}}" bindtap="{{M}}"`（文案 `{{K}}`=「删除」），
  两枚是 `.voice-preview__card` 的相邻子节点，静态属性逐字相同（class / hover-class / role 全同），
  只有**顺序**与运行期才落地的 aria-label/文案不同。
- 离线数出的 2 与该腿自己的设备读数同数：`exec-v37-pfi25` 的 step#6 probe 报 `".voice-preview__delete":"present(2)"`
  ⇒ 计数器的轴与设备同刻读数在这一枚上对得上，不是纸面推演。
- 歧义如何变成打偏：`scripts/qa/r-exec-ws.mjs:840-849` 的 tap 走 `deepOne`（`:488-495`）→ automator 的 `page.$(selector)`
  = **首命中**（`node_modules/.pnpm/miniprogram-automator@0.12.1/.../out/Page.js` 的 `Page.getElement`），
  于是 tap 打到 idx0「重录」（`exec-v37` 的 `tapOrderAb`：#0 点后 modal count=0，#1 点后 count=1），
  step#12 `drainModal` 期望≥1 实收 0。配方格式此前**没有任何**能声明「这一步该命中几枚」的字段，
  校验器（`test-cap-recipes.cjs`）也从不看命中数 ⇒ 歧义被静默接受，直接烧掉一条设备腿。
- 源侧病根（不在本车道修）：`apps/client/src/pages/profile/index.vue:1736-1745`（重录钮）与
  `:1746-1755`（删除钮）共用 `class="voice-preview__delete press-feedback"`（copy-paste；重录钮没有自己的修饰类）。

## 2. 修前 / 修后命中数（同一份产物、同一台机器现数）

产物：`apps/client/dist/build/mp-weixin-real/pages/profile/index.wxml`（只读，未重编译）

| 选择器 | 修前 | 修后 | 用途 |
|---|---|---|---|
| `.voice-preview__delete` | 2 | 2 | 旧 tap/assert 的靶（歧义源，现只留在 probe 里当对照读数） |
| `.voice-preview__delete:last-child` | — | **1** | 新 tap/assert 的靶（`.voice-preview__card` 的最后一子 =「删除」那枚） |
| `.voice-preview__card > .voice-preview__delete` | 2 | 2 | 反面：单靠父级收窄**不解决**，必须带序号/位置把手 |
| `.voice-preview__delete:first-child` | 0 | 0 | 反面：第一枚不是 last-child 的对偶，证计数器真在数结构 |
| `.video-cta` | 3 | 3 | 未动（产物里 3 枚分属互斥 wx:if/wx:else 分支，设备同刻读到 2 ⇒ 产物条数会高估，这条只作对照不作动作靶） |

配方改动（`PAGES-PROFILE-INDEX|PFI25`）：

- 两处 `tap` 与四处 `assertPresent/assertAbsent` 的选择器收窄为 `.voice-preview__delete:last-child`，并各带 `expectMatches: 1`。
- step#6 probe 增列伪类形；并在 `armModal` 之后、第一次 tap 之前**新增一步同刻 probe**，同时列裸形与伪类形
  （`expectMatches: {".voice-preview__delete": 2, ".voice-preview__delete:last-child": 1}`）⇒ 该行读数本身就是
  「WS 引擎认不认位置伪类」的证据：读到 `present(1)` 才算寻址坐实，读到 `present(2)` 说明伪类被忽略 ⇒ 记仪器欠款，不许读成产品红。
- `adjudication` 追加 v37 段的实测记录（改前 2 / 改后 1、源侧共用类名的两个行号、位置伪类在本仓只有反面实测这一事实、
  以及「本条改动是寻址修正，不是产品判决」）。

## 3. 校验器新增判点（§8，`scripts/qa/test-cap-recipes.cjs`）

新增一段离线判点：用**编译产物**给每条配方的选择器数命中数（只读 `apps/client/dist/build/mp-weixin-real`，不重编译）。

- 判点 ①（硬）：动作步 `tap/rapidTap/input/readValue` 的 selector 必须在产物里**恰命中 1 枚**。
  0 枚=死选择器、N>1=歧义（PFI25/v37 的形状）、命中落在 `wx:for` 模板里=条数不可证、
  N>1 且分属互斥 `wx:if/wx:else` 分支=**本仓不默认放行**（照样红，因为首匹配仍可能打偏）。
  数不出来的（穿透链段解析不到组件文件）也红。
- 判点 ②（配方格式新增字段）：步骤可选写 `expectMatches` —— 单选择器步写数字、`probe` 步写「选择器→条数」映射。
  语义钉死为**该选择器在编译产物 wxml 里的节点命中数**（离线轴，不是设备同刻读数），必须等于现数出来的值；
  值不是非负整数（含被写成 `undefined` 的半填形状）判红；映射里点名了没被 probe 的选择器也判红。
- 判点 ③（自证形状）：凡动作步用位置伪类收窄，配方里必须有一步 `probe` **同时列裸形与伪类形且带 expectMatches**
  ⇒ 把「引擎认不认这个伪类」变成设备读数，而不是车道注释里的信念。
- 语料来源纪律：活语料与负例共用同一个 `matchCountProblems()`（负例不是另造一套判点）。
- 本机数法（可复算）：`node -e` 走 §8 的 `countSelector(page, selector)`；`.voice-preview__delete`=2、
  `:last-child`=1、编造类名=0、`.voice-preview__card > .voice-preview__delete`=2、
  `profile-shell >>> public-profile >>> relationship-c-t-a >>> .relationship-cta__btn--like`=1（末段在
  `components/profile/public/RelationshipCTA.wxml`，经各层 `.json` 的 usingComponents 下钻）。

机读行（同一台机、同一份工作树，改动前后）：

- 修前基线：`CAPRECIPES_TEST=PASS（checks=112）`
- 修后活语料：`CAPRECIPES_TEST=PASS（checks=121）`（`SUMMARY: assertion failures = 0`，+9 条判点全在 §8）
- 兄弟自测未退化：`CAPS_TEST=PASS（checks=65）`（`scripts/qa/test-exec-capabilities.cjs`，它也吃同一份 case-recipes.json）
- 其余 7 条配方（VI25/VI34/OT05/OT06/OT09/OC09/VB03）动作步在产物里本来就唯一命中，未受新判点牵连
  （实测每条动作步 count=1，所以闸不是一装就红一片的空闸）。

## 4. 变异证明（负例能红，且红只来自那一刀）

- 工作树内负例（常驻，随 §8 每次跑）：把活语料里 PFI25 的 tap 脱掉 `:last-child`（=v37 在盘形状）⇒ 判点必须多且只多
  「命中 2 枚」这一条；摘掉对照 probe ⇒ 必须报「位置伪类没有裸形并列读数」；`expectMatches` 写成 `"2"` / `undefined` /
  孤儿键 ⇒ 三种都红；往本来没有动作步的 VI25 插一步产物中 0 命中的 tap ⇒ 判「命中 0 枚」。四条都在活文件上跑，
  改前（checks=112）不存在这些判点，所以「绿」不是把期望放松换来的。
- 工作树外一次性变异副本（`C:/Users/dsghy/AppData/Local/Temp/recipe-lane/mutant-recipes.json`，跑完已删）：
  `RECIPES_UNDER_TEST=<该副本>` 跑同一个 `test-cap-recipes.cjs`（新增这个 env 口子，纪律与在册的 `CAPS_UNDER_TEST` 同源）：

  ```
  mutated tap steps = 2
  FAIL §8 活配方全体动作步在产物里唯一致命中 … :: PAGES-PROFILE-INDEX|PFI25 step#11 动作步 tap 的选择器
       .voice-preview__delete 在 pages\profile\index.wxml 命中 2 枚（PFI25/v37 的形状…） ｜ … step#16 同样命中 2 枚
  FAIL §8 负例（活配方搬回 v37 旧形状）…
  FAIL §8 负例：把 PFI25 各 probe 里的 .voice-preview__delete:last-child 摘掉…
  SUMMARY: assertion failures = 3
  CAPRECIPES_TEST=FAIL（checks=121）
  ```

  红只来自那一刀：§1-§7 的 112 条一字未红（修前基线就是这 112 条）（同一次运行里逐行可见），三条红全在 §8 —— 第 1 条就是新判点本身
  （点名 step#11/#16 两枚 tap 与「命中 2 枚」），第 2、3 条是常驻负例在「语料已经是旧形状」的前提下失去可改的对象
  （它们的靶子 `:last-child` 在副本里已经不存在）。判点自身也能不红：把副本删掉再跑，回到 `PASS（checks=121）`。

## 5. 交给设备腿的命令（本车道没跑，也不该由本车道跑）

前置：拿到 UI 租约（`tmp/qa/locks/*.lock`，现由 v37 那条腿持有），产物带**不要重编译**。

```sh
D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/test-cap-recipes.cjs   # 先要 CAPRECIPES_TEST=PASS
printf 'PAGES-PROFILE-INDEX|PFI25\n' > tmp/qa/v38-pfi25-ids.txt
D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/r-exec-ws.mjs \
  --real --identity A --project apps/client/dist/build/mp-weixin-real \
  --recipes scripts/qa/case-recipes.json --ids-file tmp/qa/v38-pfi25-ids.txt \
  --round ui-audit-2026-10-13 --out reports/audit/round-7/exec-v38-pfi25
```

读数怎么判（配方已把这一步做成自证的）：

- step#10（armModal 之后、第一次 tap 之前的同刻 probe）若报 `".voice-preview__delete:last-child":"present(1)"`
  且 step#13 `drainModal` ≥1 ⇒ 寻址坐实，PFI25 的「取消即保留 / 确定即删」两半才有资格按判据定谳。
- 若报 `present(2)` ⇒ WS/automator 引擎忽略位置伪类（与桥通道实测同向：`scripts/qa/tour-cli-states.mjs:89-90`），
  本腿仍记 `UNVERIFIED-INSTRUMENT`，`instrumentFault` 建议写 `recipe-positional-pseudo-ignored`，**不许**读成产品红。
- 若报 `absent`/`ERR:` ⇒ 引擎不认这个选择器形（当场可知，tap 不会打偏到「重录」），同样记仪器欠款并点名是段形问题。

## 6. 未做（以及为什么不在本车道做）

- **in-band 判决仍欠**：本车道没跑设备腿，`红已撤、绿未证，无有效判决行`（`reports/audit/round-6/issue-matrix.md` matrix:194，
  文件第 195 行）不因这次编辑升级；升 `判过` 只认上面第 5 节那条重跑。台账归台账车道，本文件不改矩阵。
- **没碰执行器**：如果第 5 节那条腿回的是 `present(2)`（伪类被忽略），剩下的真修两处都在别人名下：
  (a) 载具补「第 k 枚 / 按 aria-label 命中」的 tap 把手 —— 即 round-7 `c21-executor-capability-matrix.md` G-14
  在册的 25 条同类欠款（`r-exec-ws.mjs` 的 `deepOne` 只有 `page.$` 首命中，没有序号/属性命中）；
  (b) 源侧给两枚分别补修饰类（`apps/client/src/pages/profile/index.vue:1736-1745` 那枚该叫 `.voice-preview__re-record`），
  然后重编译产物带。两条都要 sequencing（设备腿正在跑带、执行器刚被别的车道改过），请由主线拍。
- **产物里的类名重复本身没修**：`pages/profile/index.wxml` 仍是两枚同名兄弟；§8 的判点现在会拦住任何新配方
  再拿它当动作靶，但已入账的旧帧/旧行不受影响（也不该受影响）。
- **计数器的已知边界**（如实记，不当已证）：`.video-cta` 产物数=3 而 v37 设备读数=2，差在互斥 `wx:if/wx:else` 分支
  ⇒ 产物条数会**高估**同刻条数。本车道选择保守：这种情况照样把动作步判红，而不是给「大概只有一枚」开后门。
