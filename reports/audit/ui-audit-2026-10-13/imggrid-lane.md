# 论坛配图统一腿（imggrid-lane）— 2026-10-13

触发：用户报「为什么论坛里面有些图片是横着的，有些是并排的，需要统一展示并且保证效果」。
纪律：不改 `scripts/qa/**` 之外的判据口径；临时件只落 `tmp/qa/`；量不到的轴如实写 UNVERIFIED，不拿源码判点冒充像素判点。

## 病根（读码定位，逐条带行号，均为改前状态）

同一条帖子的配图在五处渲染器各写各的尺寸，其中两处会在**同一屏内**混出两种形状：

| 载体 | 改前布局 | 单格尺寸口径 | 张数上限 |
|---|---|---|---|
| `components/village/PostCard.vue:457-515`（圈子/附近 feed 卡）| 1 张→`width:60%` + `aspect-ratio:4/3`（**横条**）；2/4→两列方格；3、5-9→三列方格 | 比例（aspect-ratio）| 9，超出挂 `+N` |
| `subpackages/village/village/detail.vue:2008-2041`（帖子详情）| **首图 `width:100%;height:400rpx` 独占整行（就是"横着的"）**，其余 `33.33%×220rpx` 并排；2 图另有 50/50 特判 | 固定 rpx 高 | 全量 |
| `components/home/CommunityFeed.vue:494-524`（首页社区流）| 一律一行 3 张 | `88rpx` 固定方图 + `min-height:88rpx` 防塌陷补丁 | slice(0,3) |
| `components/profile/public/PublicMoment.vue:188-199`（他人主页动态）| 一律一行 3 张 | `200rpx` 固定方图，圆角 32rpx | slice(0,3) |
| `components/profile/mine/MyStory.vue:379-390`（我的动态）| 一律一行 3 张 | `200rpx` 固定方图 | slice(0,3) |

五处 `mode` 全部是 `aspectFill`（不是拉伸变形），所以"横着"不是图片本身被转置：
`grep -rn "orientation|exif" apps/client/src apps/api/src/main/java` ⇒ **0 命中**，EXIF 轴在客户端与后端都不存在，
本条症状与它无关（若日后出现"照片内容躺倒"，那是另一条判据，需另立条目）。

台账侧唯一在册的相关裁定是 `MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-002`
（`reports/audit/round-6/issue-matrix.md:151`，谓词 `scripts/qa/verify-source-shape.mjs:910-916`）：
它只裁了「2 图 50/50」，处置列当时还写着两条候选（`2 图特判 50/50` 或 `首图亦 2/3`）——
"首图独占整行"这一半从未被裁过，是代码里长出来的既成事实。

## 统一口径（一处定义，五处只挂类名）

`apps/client/src/theme/global.scss:254-308` 新增 `.post-media-grid`：

- 单格恒 `aspect-ratio:1` + `mode="aspectFill"` 居中裁切 ⇒ **任何张数都不再出现横幅**；
- 列数只随张数变：`--1/--2/--4` → 两列等宽 `calc((100% - 8rpx)/2)`（1 张＝两列网格的一格，与 2 张时单格等大）；
  `--3/--5..--9` → 三列等宽 `calc((100% - 16rpx)/3)`；
- gap 8rpx、圆角 `var(--r-lg)`、占位底色 `var(--c-neutral-50)` 全档统一；`+N` 角标并进最后一格内
  （改前它是 flex 容器的绝对定位子节点，而容器没有 `position:relative` ⇒ 角标其实贴在整张卡右下，顺手一并修形）；
- 五处模板只保留自己的外边距，几何一律不再本地重写（`PostCard.vue:456-468`、`detail.vue:2006-2013`、
  `CommunityFeed.vue:500-504`、`MyStory.vue:387-390`、`PublicMoment.vue:196-199`）。

保留不动的两条在册语义：2 图 50/50（DETAIL-002 的裁定在新口径下仍然成立），
以及 `PostCard.vue:204-212` 的无图占位分支（2026-08-26 R3 裁过，与本条无关）。

## 已证到的部分（每条都可重跑）

1. 客户端三门：`npm run typecheck` ⇒ vue-tsc 无输出；`npm run test` ⇒ `Test Files 121 passed (121) / Tests 1366 passed (1366)`；
   `node scripts/check-mp-image-styles.mjs --strict` ⇒ `MPIMG_EXIT=0`。
2. 判据台：`verify-source-shape.mjs --dry` ⇒ `SRC_SHAPE total=99 成立=99 不成立=0`，
   且新谓词**可否决**——把 `.post-image-wrap--first { width:100%; height:400rpx; }` 插回 detail.vue 后同一条命令立刻
   `不成立=1 / SHAPE_FAIL MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-002 :: 禁用写法仍在：.post-image-wrap--first`，
   撤掉后回到 99/99。（第一次变异用的是 CSS 注释，被 `runChecks` 的 `stripComments`（:1618）吃掉而没变红——
   那是判点设计正确，不是它咬不动；变异必须落在真代码上。）
3. 台账：`patch-ledger-cells.mjs` 改 4 格（谱系/证据/判点/处置）→ `verify-ledger` ⇒ `LEDGER_RESULT=PASS`、
   `DATA_ROWS=245 OFF_SCHEMA_ROWS=0 STATUS_VOCAB_BAD=0`。
4. 产物侧（mock 与 real 两档重建后逐档 grep）：
   `dist/build/mp-weixin/app.wxss` 含 `.post-media-grid--3 … width:calc((100% - 16rpx) / 3)` 等全套新规则；
   三档的 `*.wxss`/`*.wxml` 里 `post-image-wrap--first`、`post-images--two` 命中数 **0**；
   五处 wxml（`components/village/PostCard.wxml`、`components/home/CommunityFeed.wxml`、
   `components/profile/mine/MyStory.wxml`、`components/profile/public/PublicMoment.wxml`、
   `subpackages/village/village/detail.wxml`）全部挂上新类名。
5. 组件能不能吃到 `app.wxss`：uni-app mp-weixin 运行时给每个组件的 options 基座是
   `{multipleSlots:!0, addGlobalClass:!0, pureDataPattern:/^uP$/}`（`dist/build/mp-weixin/common/vendor.js` 实测命中）
   ⇒ 全局类进得了组件节点，这条不是"我以为可以"。
   注意它只覆盖"全局样式影响组件自有节点"；`SafeImage` 的 `custom-class` 施加在**子组件内部**那一层仍然吃不到页面样式
   （`subpackages/discover-extra/nearby/people.vue:216-222` 记过这个坑），所以 detail.vue 保留
   「包裹 view 定尺寸 + SafeImage `custom-style="width:100%;height:100%"`」的既有形状，没有顺手改回去。

## 没证到的部分（如实记账，不得当已修）

**设备像素那一半没拿到。** 三条独立障碍，全部是载体侧事实：

1. CLI 桥 `automation_element_action` 对**必然存在**的节点也超时：
   `.tab-bar` ⇒ `timeout waiting for automator response`（`tmp/qa/cli-real-shape.mjs`，offset/size/rect 三种动作 ×5 选择器全红）。
2. CLI 桥 `automation_evaluate` 里的渲染层查询拿不到回调：
   `wx.createSelectorQuery()` 的 `fields({size},cb)` 形态当场抛 `An object could not be cloned.`（六个选择器逐个如此）；
   换成 `boundingClientRect(cb)` / `exec(cb)` / `.in(page)` 三种写法后不抛错，但袋子恒 `{}`（4s 内回调不落）。
   ⇒ 顺带纠一条在册口径：`r-exec-cli.mjs:966 probeStartSource` 的形状在**桥侧**取不到几何，
   而它的自检 `test-exec-probe-geometry.cjs` 喂的是合成袋子（:991 注释自陈），所以这条几何通道历史上从未被设备证过；
   盘上 `reports/audit/round-7/exec-*/exec-results.json` 里那些 `geometry=".x=[33x33px …]"` 读数
   说明它在某些批次确实出过数——本腿复现不出来，只能记"本载体不可复现"，不能反过来判那些读数为假。
3. 帧的**归属**证不了：本机同时活着多个项目窗口。`simulator_screenshot` 没有"这张帧来自哪个窗口"的回执，
   而 `--project` 只影响 evaluate/openPage 的落点（同一时刻 mock 侧读到 `detail?id=post-1.html`、real 侧读到 `pages/discover/index`）。
   实测两批帧量出同一个 `199x149px`（宽高比 1.336）＝旧口径 `60% 宽 + 4:3` 的精确值，
   而新口径应为 `≈161x161px` 正方——所以那两批帧**不是**新包的画面，一律作废（`tmp/qa/measure-frames.cjs` 读数）。
   期间还给两窗各设过导航栏标题做标记，但圈子页是自定义头（原生标题不上屏），标记法在该页无效；
   `simulator_refresh` 之后 mock 窗又报 `./subpackages/…-post-1.wxml not found`（盘上该文件在，22:14 新建）
   ⇒ 该窗口的编译缓存与外部重建打架。要出可信帧，必须先让本机只剩一个项目窗口。
4. 另一条与本轮无关的既有断口：`npm run build:h5` 在 HEAD 上就编不过
   （`tokens.scss:16 @import "../theme/design-variables.scss"` ⇒ sass `expected "{"`），
   所以"退一步用浏览器量同一份 CSS"这条路也不通。本腿没去修它（不在用户这条诉求里，且它会牵动 H5 全量产物）。

**结论口径**：源码级 + 产物级 + 三门 + 判据台（含可否决证明）已到位；
像素级"看起来统一了"待一次**单窗口**的模拟器取证。台账行的 status 保持
`已修复（源码级判点…）` 这一档——它声明的就是"帧与像素两侧都取不到该量"，不越级写"帧级复验"。

## 复现命令（给下一腿或给用户）

```bash
# 单窗口取证（关键：先确保 IDE 里只有 mock 一个项目窗）
"D:/codex-tools/node-v22.17.0-win-x64/node.exe" scripts/qa/open-project-window.mjs --project apps/client/dist/build/mp-weixin --settle 20
"D:/codex-tools/node-v22.17.0-win-x64/node.exe" tmp/qa/imggrid-mock-shoot.mjs
"D:/codex-tools/node-v22.17.0-win-x64/node.exe" tmp/qa/measure-frames.cjs tmp/qa/imggrid/mock3-feed-top.png
# 期望：单格宽高比 1.000（≈161x161px），旧口径是 1.336（199x149px）
"D:/codex-tools/node-v22.17.0-win-x64/node.exe" scripts/qa/verify-source-shape.mjs --dry   # 99/99
```
