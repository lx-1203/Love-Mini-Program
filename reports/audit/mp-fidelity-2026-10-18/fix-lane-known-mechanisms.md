# 修车道已知机制与接口约定（R8 实测，供后续轮次直接引用）

这份件的存在理由：R8 的教训不是"缺陷太多"，而是**同一个根因被不同泳道各自重新发现一遍**，
以及修车道拿着缺陷卡的建议值照改、改出一个零像素或不达标的"修复"。
`scripts/qa/emit-fix-lanes.mjs --notes <本文件>` 会把它整段带进每份任务书。

下面每条都带实测出处，不是推测。

## 1. SafeImage 的尺寸只能写在组件标签上

`custom-class` / `root-class` 这条路**永远无效**，原因不是"类挂错了节点"，是 uni-app 的
`data-v` 作用域边界：这两个 prop 的值被绑进组件**内部**节点，而那些节点带的是组件自己的
scope id；宿主页的 scoped 规则编译成 `.x.data-v-<宿主>`，因此命中 0 个节点。
证据：`apps/client/dist/build/mp-weixin/components/common/SafeImage.wxml` 里
`class="['data-v-00127654','safe-image__img',…]"`，而 `subpackages/campus/campus/index.wxss`
里是 `.school-icon.data-v-094e836b{width:40rpx;height:40rpx}`。

- 唯一能跨边界的宿主面是**组件标签自身**（宿主节点）。活证据：
  `MatchCard.wxml` / `PublicHero.wxml` 中 `<safe-image class="match-card__photo data-v-…">`。
- 现在（R8 之后）组件已补 `:host{display:block;width:100%;height:100%}`
  （`apps/client/src/components/common/SafeImage.vue:348`）。`:host` 特异度 0,1,0，
  低于任何宿主 scoped 规则（0,2,0）也低于内联 style ⇒ 宿主没写尺寸时默认值等于原根节点取值，
  既有调用点逐像素不变；宿主把尺寸写在标签上则立刻生效。
- H5 端 Vue scoped 把 `:host` 编成 `:host[data-v-*]`，无 Shadow DOM ⇒ 永不命中，H5 行为不变。
- **把类从 custom-class 挪到 root-class 是无效改动**（同一个边界），R7 就这么白改过一轮。

## 2. 对比度要算，不要看着改

R8 有多条缺陷卡的"建议改法"本身不达标，照抄会做出零收益或仍不合格的改动：

| 建议值 | 实测 | 结论 |
|---|---|---|
| 白字压 `--c-brand-600` | 2.81:1 | 不达本行自陈 ≥4.5:1 |
| 渐变终点收 `--c-brand-700` | 4.14:1 | 同样不达 |
| `--c-brand-800` #156B51 | 6.45:1 | 采用 |
| `--c-status-disabled` 作开关底 | 对白 1.29:1 | 比现状更弱，否掉 |
| 再深一档 `--c-neutral-400` | 把 ON 态绿轨压到 1.22:1 | 反而糊掉，否掉 |
| 白字压 `--c-brand` #36C99A | ≈1.9:1 | 否掉 |

令牌真值以 `apps/client/src/theme/design-variables.scss` 为准，**不要信 .vue 里过期的
字面量兜底**（R8 就有一条把 `#1F9A75` 当成 `--c-brand-600` 的真值，实际是 `#2AAE83`）。
另注意 `tokens.scss` 的 `@mixin dark-theme-vars` 里的值在浅色态不生效，取错档会算错。

## 3. 空态居中需要"宿主页有可解析高度"

`EmptyState` 的 `flex:1 0 auto` + `justify-content:center` 在下列情况下是惰性的：
宿主链上高度不可解析。已知两种形态：

- 宿主页写 `min-height:100%`（祖先无确定高 ⇒ 百分比退化成 auto）。
  修法：宿主改 `min-height:100vh`，或给空态槽一个 `flex:1` 的确定容器。
- 页面里残留一条 `.empty-state{…}` 规则，而模板渲染的是 `<EmptyState>` 组件
  （组件根类名是 `.empty`）⇒ 那是死样式，改它零像素。改之前先确认模板用的是哪个。

AppShell 已在 R8 把 `.shell` 从 `min-height:100%` 改成 `100vh` 并立成 flex 列，
`.shell__body` 补 `flex:1 1 auto`；这条改动对全部 12 个宿主都生效。

## 4. `var(--statusbar, env(...))` 在本运行档解出 0

`env(safe-area-inset-*)` 在取景档恒 0（`apps/client/src/pages/messages/index.vue:64` 已记录并改
JS 注入）。凡靠它做状态栏让位的，实际让位 = 0 ⇒ 控件压进系统时间/胶囊带。
正确做法：页面/组件自己 `useStatusBarHeight()` 或 `useMenuButtonRect()` 取实测值注入
`--statusbar`（`AppShell.vue:329`、`daily-question/index.vue:356` 是活例）。
注意：导航带**已经**在页头下面时，不要再额外 `+88rpx`——那会把它推到胶囊下方 44px，
制造一个新的高度错位（R8 的 FXE 收尾就纠正了两处这种"避让补两遍"）。

## 5. 吸底与页头吸顶都要显式传

- `AppShell` 的 `.is-fixed .shell__header{position:sticky}` 分支只在传了 `fixed` 时存在。
  R8 把 `fixed` 默认值改成 `true`（`AppShell.vue:70`），漏传的宿主（security/love-center/help）
  才拿到吸顶。判断"这页有没有吸顶"要看这个 prop，不是看 CSS。
- 底部动作条 `BottomActionBar` 必须 `fixed` + 页面自己留等高占位；`show-tab-bar=false` 的页面
  `AppShell.bodyPaddingBottom` 恒为 0，占位没人给就会盖住末行。

## 6. 图标会 404 的两条路径

- `assets/icons/` **根目录**既不在 `cdnPrefixes` 也不在 `localPrefixes`，而 prune 的
  `PATH_RE` 要"目录/文件"两级字面量 ⇒ 以 `ICONS_BASE + '/cake.svg'` 拼接形态引用的会被剪掉。
  `ICONS_BASE` 是 `assetDir('assets/icons')`（函数调用），计算路径解析器解不出这种基址
  （`PREPARESTATIC_COMPUTED 基址解不出=479` 条是同一个根因）。
  现行修法是在 `config/images.ts` 的 `IN_PACKAGE_ASSETS` 里做 **pkg+tail 双登记**
  （`{ pkg:'/static/assets/icons/cake.svg', tail:'/assets/icons/cake.svg' }`），
  运行时取值一律不变。R8 已把 14 枚根图标全部登记，包内实测 14/14。
- `assets/icons/emoji/` 只在 `cdnPrefixes`（real 包内没有 `emoji/` 目录）⇒
  **裸绑** `ICONS_EMOJI.*` 且不经过 `resolveMediaUrl` 的，real 档就是空槽。
  已登记未接：`apps/client/src/components/profile/public/PublicCommon.vue:45`。

## 7. "改了没上屏"的四种成因（按出现次数排）

1. 改的文件没有被 import（本仓有过 `tabBar.custom:true` 时改 `TabBar.vue` 而运行时加载的是
   `custom-tab-bar/`）——改之前先追一次 import 链。
2. 改在 `useMock()` 分支里，real 档那一发根本不执行（R8 的 L1 抓到 6 条属于这类）。
3. 值来自后端，前端分支永远不进（`v-if` 的另一支、`?? ` 兜底被后端显式 null/'' 短路）。
4. 声明了 `align-items/justify-content` 但容器没 `display:flex`（R8 在 nearby 抓到一处）。

## 8. 不许假修（四条硬线）

- 后端没有的列不许前端编造（性别、在线、成员数、匹配度百分比都出现过）。
  需要新列 ⇒ 登记 `未修` 并点名缺哪一列。
- 不许下载/生成图片，不许用带「AI生成」水印的图。
- 复拍门按"页 + 状态"逐帧比内容区像素（裁顶 40px）⇒ 画面不动的改动等于没修。
- 改资产或全站令牌要同步三棵树：`apps/client/src/static/`、
  `apps/client/static-local-backup/full-static/`（还原源，漏了它下一发 `prepare-static --dev`
  会把改动吃掉）、`apps/api/uploads/app-assets/`（real 档真正对外的副本）。

## 9. R8 留下的、别在复判里当新缺陷重复计数的在册项

`subpackages/tools/daily-question/index.vue:484` 仍用 `--c-brand-600`（白字 2.81:1，按第 2 节算法
不合格）；`static/assets/icons/common/back.png` 折线 `#94A2B7` 压白仅 1.6:1，全站 20+ 页头在用；
`static/assets/icons/common/lock.svg:1` 硬编码 `stroke="#94A3B8"`；
`users#100158` 的 `photoGallery` 里有两枚 81×81 定位针 PNG（盘上 md5 `17f5630e…`、
`audit_status` 都是 approved）——那是数据脏，前端没有任何可辨信号，不要为此写前端判据。

## 10. 平台兼容性规则是 error 级，类型与单测都不覆盖（两次被同一条咬）

发布链第 5 步 `check-project-rules` 会把"目标基础库能不能解析"当 error 判，绕不过去：

- **禁止可选 catch 绑定**：写 `} catch {` ⇒ error（改 `} catch (e) {`）。
  R8 的 FXB 与 R9 的 FXB 各带进一处（`nearby/index.vue`、`chat/ChatHeader.vue`），
  两次都是 vue-tsc 与 1380 条测试全绿、却在第 5 步退 1。改完记得复跑
  `cd apps/client && node scripts/check-project-rules.mjs`（期望 `0 errors`）。
- 同族的 error 级判点还有：`check-mp-image-styles`（禁 `object-fit`/`image-rendering: crisp-edges`）、
  `check-statusbar-offset`、`check-tabbar-consistency`、`check-band-outdir-collision`。
- 这几条**不在** `vue-tsc` 与 `vitest` 的覆盖范围里。交件前自查一遍比等发布链拦下来便宜：
  一次失败要重走 13 步。

## 11. R10 派单前已定案、修车道**不许照卡上"建议改法"执行**的三处

派发器把每条卡的 `建议改法` 原样发给泳道，但下面三条的建议改法对着真实数据/真实契约是错的。
判点成立、级别成立，**只有改法不成立**——按卡改会把缺陷改得更糟。

1. **`R10-L10-D15`（album 照片墙假计数）与 `R10-L12-D01`（setup/profile 照片墙）：不要动判据。**
   两卡都建议把 `isPhotoAssetPath` 从黑名单翻成白名单（`.jpg/.png` 扩展名，或 `assets/images/portraits` 照片子树）。
   实测脏条目真身是 `/api/v1/media/100158/202610/019a7479-….png` —— 它**就是 `.png`**，扩展名白名单当场放行；
   而按照片子树放行会**连用户唯一那张真照片一起判成非照片**（它也住在 `/api/v1/media/…` 下）。
   根因是本工作流早先的上传腿把 81×81 的 `qa-upload.png` 传成了照片并写进 `photo_gallery`，属数据污染。
   已按 `R10-data-disposition.md` 走备份 + `ROLLBACK` 预演 + `COMMIT` 清掉引用 ⇒ **这两条不在本轮派发集内**，
   也不要改 `album.vue` 的 `NON_PHOTO_ASSET_RE` 或 `setup/profile/index.vue` 的同族正则。

2. **`R10-L06-D01`（匹配成功页伪造匹配度）已修，别在别的卡里把它改回去。**
   `MatchSuccess.vue` 的 `defaultScores=[90,85,80,79]` 与 `DEFAULT_REASON_LABELS` 补位已删除，
   匹配度改成卡头一个真值（`props.matchScore`，由 `view-models/match.ts:40` 从 `commonCircleCount` 派生）。
   若同页还有卡要求"共同点卡要凑满 4 行 / 每行都要有百分比"——那是理想图《匹配成功页面》里的**示例占位值**，
   与冻结契约 MP-R1-MATCHING-REQ-01（禁假百分比）冲突，**以契约为准**：真理由为空 ⇒ 整卡隐藏，
   这正是 ops 用例 `SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS.json:172` 点名的预期落点。
   也不要为此给 `scripts/qa/r-exec-cli.mjs` 的 `ROUTE_QUERY` 加 match-success 行——那张表是页粒度的，
   钉了 `userId=` 就把 :172 的"参数缺失 ⇒ 卡隐藏"落点换掉了（表内注释里"故意不落行"那两条就是这个道理）。

3. **共享主 CTA 渐变不要再翻成实色。**
   `--c-gradient-brand` 在 12 处消费者上算出来全部 <4.5:1，R9 已把 `BottomActionBar.vue:104` 收成
   `--c-brand-800`（白字 6.45:1，`theme/design-variables.scss` 真值算得）。本轮若见"按钮不是渐变"的卡，
   那是 R9 的在册设计裁定，不是回归——按 §9 的在册项处理，别重报也别回退。
