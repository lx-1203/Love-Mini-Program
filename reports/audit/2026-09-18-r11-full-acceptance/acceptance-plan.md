# R11 全量审查与验收方案（主控文档 v2）

> 本文件取代同目录 `acceptance-plan.md`（v1）。方法框架对齐《微信小程序无限 Token 全面审查、三轮以上迭代修复与最终验收总控提示词》，全部条款已落本项目实际数据。
> 核心原则：**不是"把页面做出来"，而是"证明页面已经达到目标状态"。** 一切结论必须有截图 / 日志 / DB / 构建输出四类证据之一支撑。

---

## 0. 最高优先级硬性规则

1. **只验收微信小程序**：以 `build:mp-weixin:real` 产物 + 微信开发者工具模拟器表现为唯一标准；禁止以 H5 表现为依据判定合格。
2. **证据驱动**：禁止"感觉没问题"。每个结论附证据编号（截图文件名 / 日志行 / SQL 结果 / 命令输出）。
3. **每张截图至少发现 1 个证据充分的问题**：无大问题也必须从 §4 五维检查表中继续深挖，直到产出问题或完成 §10.3 的"无问题举证清单"全项。
4. **先取证后修改**：任何修复前必须完成 Phase 0 基线。
5. **小步迭代**：单 commit 单逻辑单元；每批修复只重跑受影响场景，三轮全量不省略。

---

## 1. Phase 0 — 项目真实状态基线（已建立，验收时复核）

### 1.1 结构事实

| 端 | 路径 | 技术栈 | 构建命令 |
|---|---|---|---|
| 客户端 | `apps/client` | uni-app Vue3 + Pinia + vue-i18n → mp-weixin | `build:mp-weixin:real`（9 步守卫链） |
| 管理后台 | `apps/admin` | Vite + Vue3 | `build`（vue-tsc + vite） |
| 服务端 | `apps/api` | Spring Boot + MySQL 3306 + Redis 6379 | `api:test`（mvn test） |
| 代码规模 | 客户端 | 234 个 .vue，**71 个注册页面**，**913 个交互绑定**分布于 146 文件 | — |

### 1.2 页面总清单（71 页，见附录 A）
以 `pages.json` 实际注册为准（8 主包 + 63 分包；`setup/dev` 仅 DEV 构建存在，real 包必须验证其**不存在**）。

### 1.3 历史问题清单（必须回归，不得因当前截图正常而删除）

| 来源 | 内容 | 状态 |
|---|---|---|
| `reports/audit/round-1 ~ round-5`、`final`、`2026-09-12-round1` ~ `2026-09-17-r10-visual` | R1–R10 全部问题项 | 逐条建回归卡 |
| R10 修复报告遗留 | 29 条 statusbar warn；MBTI 双 IA 观察项；双身份巡检规范未执行 | 待闭环 |
| 9.17 周汇报 | 8 个测试文件编译失败；LBS Phase 2；getPhoneNumber / ContentSecurityChecker / WS connect 三处 0 接线 | 待闭环 |
| 2026-09-18 截图复核 | N1 首页偶发空白 / N2 campus 话题详情加载失败 / N3 搜索占位文案不符 / N4 tag-posts 裸"#"标题 / N5 讨论圈同文案未消 / N6 相册重复图 | 待修 |

---

## 2. 理想目标基准（Target UI Baseline）

### 2.1 基准来源（统一归档引用）
- `deliverables/注册页/寻觅注册页-设计规范.md` + 高保真设计稿.html（注册/编辑页基准）
- `素材/首页/最终/拆分图标-精修版/`（首页素材基准）
- `design-tokens-admin.md`（管理后台 token）
- `设计问题诊断与重构方案.md`、`archive/design/design-system/`（全站设计系统）
- 客户端设计 token 源：`apps/client/src` 内 tokens（颜色/字号/间距/尺寸全部走 token，禁硬编码）

### 2.2 理想图对比优先级（必须从结构开始，禁止只比颜色）
L1 页面结构 → L2 信息层级 → L3 交互位置 → L4 卡片尺寸 → L5 间距 → L6 Typography → L7 Icon → L8 颜色 → L9 阴影 → L10 微细节

### 2.3 设计一致性五统一
Color（主色/辅色/danger/warning/text-primary/text-secondary/background/border）｜Radius（Button/Card/Input/Avatar/Modal）｜Spacing（8/12/16/24/32 体系）｜Typography（页面标题/Section Title/Body/Secondary/Caption）｜Component（Button/Card/Avatar/Tag/Tab/BottomNav/EmptyState/Loading/Error/Toast）。**发现重复实现 → 组件收敛，建 Issue（E 类）。**

---

## 3. 截图取证规范

### 3.1 每页截图数量下限

| 页面类型 | 下限 | 必含状态 |
|---|---|---|
| 普通页 | 1 | 完整首屏 |
| 带滚动页 | 3 | 顶部 / 中部 / 底部（验证 TabBar 遮挡与最后一条内容） |
| 核心页（附录 A 标注★） | 6 | 默认 / 滚动后 / 交互后 / 空态 / 数据态 / 弹层态 |
| 表单页 | +2 | 校验错误态 / 键盘弹起态 |

### 3.2 覆盖矩阵
71 页 × 双身份（① 满配账号：100% 资料+已实名+有数据 ② 全新注册账号）× 双启动（冷启动 `reLaunch` 直连 / 热导航进入）。带参页面参数全部走 `scripts/r11-param-map.json` 固化表（附录 D），禁止临时手写。

### 3.3 证据质量门禁（修 R10 流程缺陷）
- 全部截图在**终版构建完成后**拍摄，文件名带 build hash：`R11-<hash>-NN-page.png`
- 空白 / 纯骨架截图**自动重拍 3 次**，仍异常记为缺陷（P1），**不得计入通过证据**
- console 抓取与截图同步：每页 `get_simulator_console` 过滤 error/TypeError/NAV_FAIL，写入 `console-evidence.log`
- 每页生成截图矩阵行：页面 / 截图文件 / 状态 / 身份 / 启动方式 / 结果

---

## 4. 每页审查深度（五维检查表 —— "查到什么程度"的明确定义）

每张截图必须逐维过一遍，每维查到下表所列深度才算"查完"：

### 4.1 UI 维（查到 token 值级）
间距 / 对齐 / 字体 / 字重 / 颜色 / 圆角 / 阴影 / icon / 图片比例 / 内容密度 / 留白 —— 逐项与 design token 对数值。记录格式："应为 token X（16px），实际 8px"，禁止"感觉挤"。

### 4.2 UX 维（查到操作路径级）
点击热区（微信规范 ≥ 88rpx×88rpx）/ 操作路径步数 / 信息层级 / 用户是否知道下一步 / CTA 是否第一眼可见 / 返回落点是否符合心智 / 是否迷路（任意页 2 步内能否回 tab）。

### 4.3 小程序维（查到设备行为级）
状态栏叠印（`var(--statusbar, env())` 兜底链 + 注入源）/ TabBar 遮挡（滚到底最后一条内容完整可见）/ safe-area 底部 Home Indicator / scroll-view 高度与回弹 / sticky / fixed 覆盖 / 键盘弹起布局 / modal 层级 / 页面高度 / 内容裁切 / 胶囊按钮碰撞（右上 96px 预留）。

### 4.4 数据维（查到极值级）
空数据 / 最短（"张三"）/ 中等 / 长（50 字）/ 极长（100/500/1000 字）/ 长昵称 / 长标题 / 多图 / 无头像 / 缺字段 / 加载失败 / 图片失败 fallback。

### 4.5 一致性维（查到跨页对照级）
与同站其他页同类组件并排对比：按钮 / 卡片 / 导航栏 / 空态 / Toast / 图标风格（SVG 非 emoji）/ 头像兜底图。

---

## 5. 交互行为规格总表（"所有交互应该如何"的定义 + 合格标准）

913 个绑定由 `r11-interaction-scan.mjs` 归属到页面生成 `interaction-matrix.csv`，按下表逐类验收。**通用铁律：任何可点击元素点击后 500ms 内必须有可观测反馈（路由变化 / DOM 变化 / Toast / 震动之一），否则记"死按钮"缺陷。**

| 类别 | 交互 | 期望行为（应该如何） | 验证方法 | 合格标准 |
|---|---|---|---|---|
| 导航 | Tab 切换（5 tab） | 切换后页面状态保持（滚动位/已加载数据不丢）；badge 联动清除；自定义 tab-bar 选中态正确 | automator 切 tab 往返，对比前后 DOM | 状态保持 100%，无白屏闪烁 |
| 导航 | 页面跳转 | 参数正确传递（对照附录 D 参数名）；跳转中有 loading 或即时渲染；无 NAV_FAIL | 逐导航点点击 + 断言 `getCurrentPages()` 路由 | 目标路由 100% 正确 |
| 导航 | 返回 | 返回落点为来源页；来源页状态恢复（列表滚动位/已填表单草稿）；深层返回（≥3 层）不丢栈 | A→B→C→返回×2 | 落点与状态双正确 |
| 导航 | 冷启动深链 | reLaunch 直达带参页，先骨架后内容，**严禁闪现"不存在/已解散/加载失败"错误空态**（R10 根因 B） | 每个带参页 reLaunch 直连 | 首屏无错误空态 |
| 点击 | 主按钮 | 有 ripple 涟漪 + 震动反馈（项目规范）；防连点（提交中 loading 锁，二次点击无效） | 快击 5 次断言只提交 1 次 | 反馈可见 + 幂等 |
| 点击 | 次按钮/图标钮 | 热区 ≥88rpx；有点击态（透明度/缩放） | 坐标点击 + 视觉断言 | 无死按钮 |
| 表单 | 输入框 | 聚焦键盘弹起布局上移不被遮；失焦校验或提交校验时机一致；错误提示行内抖动（注册页规范）；字数计数正确 | 逐字段输入合法/非法/边界值 | 三态（空/非法/合法）行为全对 |
| 表单 | 提交 | 空提交→校验提示不发送请求；非法→明确错误；合法→loading→成功反馈→正确跳转 | 三态各跑一次 | 三态全过 + DB 落库 |
| 弹层 | Modal/Popup/ActionSheet | 打开动画正常；遮罩点击行为符合设计（可关/不可关明确）；确认/取消路径都通；层级不被截断 | 打开→截图→三路关闭 | 开/关/遮罩/确认 100% 通 |
| 弹层 | Toast/Loading | Toast 文案正确、时长合理；Loading 不永驻（超时/失败必消失） | 触发后截屏+延时复查 | 无永驻 Loading |
| 手势 | CardSwiper 滑动 | 左滑/右滑方向语义正确；滑动跟手不掉帧；滑完自动切下一张；喜欢触发计数+动画 | automator 模拟 swipe | 方向语义 100% 对 |
| 手势 | 长按 | 长按菜单（LongPressMenu）触发正确，不误触点击 | 长按 vs 短按对照 | 行为区分正确 |
| 手势 | 下拉刷新（7 页：home/nearby/messages/nearby-people/likes/visitors/vip-bills） | 下拉触发刷新动画；数据实际重拉；动画能结束 | 下拉 + 接口抓包 | 刷新真实发生且复位 |
| 手势 | 上拉加载 | 到底加载下一页；无更多显示"没有更多了"；加载失败可重试 | 滚到底 | 分页正确无重复 |
| 互动 | 点赞/收藏/关注 | 乐观更新立即反馈；失败回滚+提示；计数联动；我的喜欢/收藏列表同步可见 | 操作后查 DB + 对应列表页 | 前后端一致 |
| 互动 | 喜欢/匹配 | 喜欢→对方也喜欢→弹匹配成功页（双头像兜底）→可直达聊天 | 双账号脚本互喜欢 | 全链路通 |
| 互动 | 签到 | 签到成功触发**爱心粒子动画（12 粒子 / 1.5s）**（项目规范）；连续签到计数正确 | 签到截图+计数核对 | 动画+计数双对 |
| 发布 | 图片上传 | 图片 ≤10MB、视频 ≤50MB 限制有前置校验提示；相册 ≤6 张上限控制；上传中进度可见；失败可重试 | 边界文件实测 | 超限拦截 + 提示正确 |
| 发布 | 发帖全流程 | 草稿→编辑→预览→发布→我的帖子可见；草稿再进入可恢复 | 全链路+中途退出重进 | 草稿恢复正确 |
| 聊天 | 发消息 | 发送中/成功/失败（可重发）三态；对方侧实时可见；进入会话未读清零 | 双账号对发 | 三态+已读全对 |
| 搜索 | 关键词搜索 | 输入 **300ms 防抖**（项目规范）；空结果态文案与 tab 语义一致；无结果不给误导文案 | 连续输入抓请求次数 | 防抖生效+空态正确 |
| 资料 | 头像/图片展示 | 卡片图优先级 `halfBodyPhotoUrl → photoGallery[0] → avatarUrl`；加载失败落本地默认头像（唯一真身 assets/default-avatar.jpg） | 断网/404 模拟 | 兜底 100% 生效 |
| 状态机 | 核心页七态 | Idle/Loading/Success/Empty/Error/Disabled/Refreshing 每态有设计态且互不串台 | 逐态构造（mock/断网/空库） | 七态全覆盖 |

---

## 6. 用户任务链路（全跑通才算行为合格）

| 链路 | 路径 | 关键断言 |
|---|---|---|
| A 浏览 | 登录→首页→附近→查看人→查看内容→返回 | 返回状态保持 |
| B 匹配 | 首页→寻觅→匹配卡片→喜欢→匹配成功→聊天 | 匹配判定+落库+会话建立 |
| C 圈子 | 附近→兴趣圈→圈子详情（冷启动直连测）→帖子→帖子详情→评论/互动 | 无"圈子不存在"误判 |
| D 校园 | 附近→校园圈→内容→返回 | 校名/认证徽标正确 |
| E 发布 | 发布→选择类型→编辑→预览→发布→我的帖子 | publish/post 双实现各自链路通 |
| F 消息 | 消息→会话→聊天→输入→返回 | 未读清零 |
| G 资料 | 我的→个人主页→编辑资料→保存→返回 | 保存落库+完成度联动 |
| H 新用户 | 注册→向导 5 步→实名→完成度 70%→解锁 | 门槛/空态正确（全新身份） |

---

## 7. 三层审查 + 五类问题定性

- **Layer A Code**：架构/重复代码/命名/状态管理/API/错误处理/异步流程/样式/组件（工具：eslint + typecheck + 硬约束扫描）
- **Layer B Visual**：截图 vs 理想基准，按 §2.2 十级对比
- **Layer C Behavior**：§5 全交互 + §6 全链路 + §8 极端测试
- 三层全过才算修复完成。

问题定性五类：**A 产品结构**（结构/路径/入口错误）｜**B UX**（层级/引导/可发现性）｜**C Visual**（间距/字体/颜色/卡片/icon）｜**D 小程序技术**（scroll-view/TabBar/safe-area/fixed/键盘）｜**E 架构**（重复组件/耦合/样式散落/hard-code）。**功能缺失必须记 P1/P2 功能问题，禁止降级写成视觉问题。**

---

## 8. 极端情况与隐藏 Bug 测试（每轮必跑）

快速连点 / 连续返回 / 快速切 Tab / 页面打开即返回 / 重复打开同页 / 重复提交 / 空内容提交 / 1000 字提交 / 断网（请求失败态）/ 弱网（超时态）/ 图片 404 / 页面重进旧状态残留 / 多次进出内存表现。**"页面看起来对但实际构建错误"专项**：滚动真实可达底部 / 点击热区真实覆盖 / modal 真实可关 / tab 切换状态真实保持 / 输入真实可键入 / 数据更新真实生效。

---

## 9. 问题记录规范

```text
Issue ID:  MP-R{n}-{PAGE}-{nnn}   （例：MP-R1-HOME-001）
Page / Screenshot / 问题位置 / 问题描述 / 问题类型(A-E) / Severity
当前行为 / 理想行为 / 为什么这是问题 / 与理想图差异 / 小程序影响 / 建议修复
Before: before.png  After: after.png  Regression: 是否波及其他页
```
Severity：P0 阻断使用｜P1 严重影响功能｜P2 明显影响体验｜P3 视觉细节｜P4 优化项。
无法修复的 P2/P3 必须书面记录 `Issue / Reason / Impact / Decision`，禁止静默忽略。

---

## 10. 合格判定标准（如何算合格 / 如何判定没有问题）

### 10.1 六道 Gate（量化，任一不过 = 整体不合格）

| Gate | 合格标准 |
|---|---|
| G1 构建完整 | 三端构建 0 error；real 包无 mock 泄漏（verify-env-release）；包体积在阈值内；`setup/dev` 不在 real 包 |
| G2 静态守卫 | check-mp-image-styles / statusbar / tabbar / contract / image-paths / missing-files / p0-compliance 全 0 error；**statusbar 29 warn 清零**；eslint 0 error；typecheck 0 error；单测全绿（**先修 8 个编译失败文件**）；openapi lint 0 error |
| G3 页面覆盖 | 284 场景截图矩阵 100% 有效（无空白/永久骨架计入通过项）；console error = 0；状态栏叠印 = 0 |
| G4 交互覆盖 | interaction-matrix 913 项 100% 执行；通过率 100%（豁免须有 Decision 记录）；七态状态机核心页全覆盖 |
| G5 数据合规 | 审计残留 SQL 0 命中；封存页 100% 正确（无价格/报名/币文案泄漏）；种子数据无霸榜同文案/重复图；3 个 0 接线项有书面决议 |
| G6 证据可信 | 全部截图带同一终版 build hash；链路 A–H 全 PASS；历史回归 0 复发 |

### 10.2 单页合格 = 五维全过 + 交互全过 + 状态机覆盖 + 理想基准十级对比无 L1–L4 偏差

### 10.3 "本页无问题"判定（必须 13 项举证全齐，缺一不得判定通过）
截图已看□ 理想图已对照□ 滚动已测□ 点击已测□ 返回已测□ safe-area 已查□ TabBar 已查□ 空态已查□ 长文已查□ 加载态已查□ 错误态已查□ 组件一致性已查□ 历史 Bug 回归已查□
→ 全齐才允许写"无问题"，且必须附举证记录，否则继续审查。

---

## 11. 多轮修复流程

| 轮次 | 内容 | 出口标准 |
|---|---|---|
| Round 1 | 全量审查（基线→截图→每图≥1问题→Issue Matrix）+ 修全部 P0/P1 + 主要 P2 | P0=0 且 P1=0 |
| Round 2 | 全量重截图，**禁止复用 R1 结论**，独立找茬 + 检查 R1 修复是否引入新 Bug + 历史回归 | 新问题全修 |
| Round 3 | 最严标准：真实 viewport / 滚动 / fixed / safe-area / 长内容 / 弱网 / 点击热区 / 动效 / 一致性 / 理想图偏差 | 重建 Issue Matrix 并清零 |
| Round 4+ | Independent Audit（五角色：修复/视觉/UX/小程序工程/独立回归，单 Agent 时分阶段模拟）。**怀疑一切：从"我要证明它没问题"出发**。发现 N 个新问题 → Round N Fix → 再 Audit，循环 | 独立审查在完整证据下无新可证明问题 |

每轮结束：Git commit（`fix(miniprogram): round-N audit fixes`）+ 五件报告（audit-report / issue-matrix / screenshot-matrix / regression-report / git-summary）。

---

## 12. 最终停止条件（全部满足才允许 FINAL ACCEPTANCE）

1. Rounds ≥ 3；2. 核心页全部测过；3. 每张截图经过审查；4. 每图至少 1 个证据充分问题（审查阶段）；5. P0=0；6. P1=0；7. 历史高优 Bug 0 回归；8. 链路 A–H 全 PASS；9. 小程序专项检查（Viewport/SafeArea/TabBar/Scroll/Keyboard/Modal/Performance/Navigation）全 PASS；10. Independent Audit 完成且无新可证明问题（须附审查证据+范围+截图+测试结果）；11. 全部变更已 commit；12. 终版截图集已生成；13. 终版报告已生成；14. **G1–G6 全绿（含 29 warn 清零、测试全绿）**。

不满足 → 继续下一轮。不因时间/工作量主动降标。

---

## 13. Git 规范

每轮 `git status / diff / diff --stat` 核查：无非预期文件、无临时截图入库、无 debug/console.log 残留、无临时数据。禁止 squash 历史 / force push / 改无关提交 / 删历史 commit。提交信息走约定式（`fix(miniprogram): round-N audit fixes`）。

## 14. 禁止事项

减少截图凑数 / 放宽标准减问题数 / 只测首页 / 只看代码或只看截图 / 只跑一轮 / 三轮后直接结束 / 以 H5 为标准 / 改后不重新截图 / 不做回归 / 不查历史 / 不提交 Git / 删历史报告 / 隐藏问题 / 功能缺失写成视觉问题 / "感觉没问题"代替证据 / 无测试证据输出"无问题"。

---

## 附录 A. 71 页清单（★=核心页，⤓=下拉刷新，#=带参）

| # | 路由 | 备注 |
|---|---|---|
| 1 | pages/login/index | |
| 2 | pages/register/index | ★ 表单 |
| 3 | pages/register/success | |
| 4 | pages/home/index | ★⤓ tab |
| 5 | pages/nearby/index | ★⤓ tab |
| 6 | pages/discover/index | ★ tab（CardSwiper） |
| 7 | pages/messages/index | ★⤓ tab |
| 8 | pages/profile/index | ★ tab |
| 9 | subpackages/village/village/index | ★ |
| 10 | village/publish | ★ 表单 |
| 11 | village/post #id | ★ 表单 |
| 12 | village/detail #id | ★ |
| 13 | village/tag-posts #tagName | N4 待修 |
| 14 | village/history | |
| 15 | circles/circles/index | |
| 16 | circles/topics | |
| 17 | circles/topic-detail #id | |
| 18 | circles/post-topic #circleId | 表单 |
| 19 | circles/circle-home #circleId | ★ 冷启动竞态已修 |
| 20 | campus/campus/hub | |
| 21 | campus/campus/index | |
| 22 | campus/post-topic | 表单 |
| 23 | campus/topic-detail #id | N2 待修 |
| 24 | campus/certification | 表单 |
| 25 | discover-extra/discover/matching #target | 无参守卫回退 |
| 26 | discover-extra/discover/match-success | ★ |
| 27 | discover-extra/home/segment | |
| 28 | discover-extra/nearby/people | ⤓ |
| 29 | discover-extra/discover/history | |
| 30 | discover-extra/likes/index | ⤓ |
| 31 | discover-extra/likes-visitors/index | |
| 32 | tools/daily-question/index | |
| 33 | tools/love-center/index | 内容单薄待补 |
| 34 | tools/help/index | |
| 35 | tools/security/index | |
| 36 | tools/search/index | ★ N3 待修 |
| 37 | tools/heart-signals/index | 完成度门槛 |
| 38 | tools/activities/detail #id | |
| 39 | tools/love-center/nearby | |
| 40 | tools/love-center/mbti | 双 IA 观察项 |
| 41 | tools/love-center/consulting | 封存页 |
| 42 | profile-extra/settings/index | |
| 43 | profile-extra/verification/index | |
| 44 | profile-extra/verification/real-name | 表单 |
| 45 | profile-extra/profile/visitors | ⤓ |
| 46 | profile-extra/profile/other #userId | |
| 47 | profile-extra/profile/location | |
| 48 | profile-extra/profile/privacy | |
| 49 | profile-extra/profile/album | ★ 表单 N6 |
| 50 | profile-extra/profile/favorites | |
| 51 | profile-extra/profile/tasks | |
| 52 | profile-extra/settings/dnd | |
| 53 | profile-extra/feedback/history | |
| 54 | chat/chat-session/index #userId | ★ |
| 55 | chat/official-chat/index | |
| 56 | setup/profile/index | 向导① |
| 57 | setup/campus/index | 向导② |
| 58 | setup/schedule/index | 向导③ |
| 59 | setup/recommend-pref/index | 向导④ |
| 60 | setup/interest/index | 向导⑤ |
| 61 | setup/dev/index | 仅 DEV，real 包必须不存在 |
| 62 | setup/showcase/index | |
| 63 | support/feedback/index | 表单 |
| 64 | discover/discussions/index | N5 待修 |
| 65 | discover/activities/index | |
| 66 | legal/privacy/index | |
| 67 | legal/agreement/index | |
| 68 | market/detail/index #id | 封存页 |
| 69 | market/shop/index | 封存页 |
| 70 | market/wallet/index | 封存页 |
| 71 | vip/index · promo-code · bills（3 页） | 封存/守卫跳转；bills ⤓ |

## 附录 B. 项目硬约束静态扫描规则（check-project-rules.mjs）
禁 `:hover`｜禁 grid｜禁 `catch {}`｜组件禁 `import.meta.env.DEV`｜业务组件禁 emoji（SVG 图标替代）｜设计 token 强制（禁硬编码色值/字号/间距）｜图片走 IMAGE_PATHS 常量｜`backdrop-filter` 仅 H5 条件编译｜页面切换逻辑内联 .vue（禁外部 composable）｜工具函数从 .ts 导入（禁从 .vue）｜自定义组件宿主节点 `flex:1`｜CardSwiper `min-height: 860rpx` 兜底。

## 附录 C. 已知未闭环基线（Round 1 前置）
N1 首页偶发空白复核 / N2 campus topic-detail 加载失败 / N3 搜索占位文案 / N4 tag-posts 裸"#" / N5 讨论圈同文案迁移核验 / N6 相册重复图 / 29 条 statusbar warn / 8 个测试文件编译 / MBTI 双 IA 决议 / love-center 内容单薄 / getPhoneNumber·ContentSecurityChecker·WS connect 三处接线决议。

## 附录 D. 带参页面参数固化表（r11-param-map.json 为准）
circle-home/post-topic→`circleId`｜village detail/post、circles/campus topic-detail、activities/detail、market/detail→`id`｜tag-posts→`tagName`｜profile/other、chat-session→`userId`｜matching→`target`。**参数名以页面代码实际读取为准，逐页核对后固化，禁止临场手写。**

## 附录 E. 封存核验清单
`commerce.enabled/vip/coin/course/consult=false` 下：consulting / market×3 / vip×3 逐页截图验证封存卡或守卫跳转；官方助手/每日一问等运营文案无币类/课程类矛盾表述。
