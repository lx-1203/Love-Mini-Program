# Round-10 全站视觉与一致性审查 · 问题清单（2026-09-17）

> **审查对象**：Round-10 全站巡检截图 `reports/screenshots/r10-audit/`（81 张，2026-09-16 23:44 → 09-17 00:14），由 `scripts/r10-shoot.ps1` 四段式跑出（78 个路由 + 3 张首页校验），**此前未出报告**。
> **审查方式**：逐张人工读图 + 代码/接口双向溯源（不只看表象，定位到行）。
> **受控环境**：real 后端 8080（存活）、MySQL 3306、Redis 6379 均在跑；`app-config` 实测 `commerce.enabled/vip/coin/course/consult = false`。
> **巡检账号**：截图昵称「曦风」（userId **100158**），`/profile/basic` 资料完成度 **30%** —— 这一点直接决定了本次巡检的**覆盖面盲区**（见 §6.1）。

---

## 0. 执行结论清单

| 编号 | 级别 | 页面 | 问题（一句话） | 根因性质 | 证据截图 |
|---|---|---|---|---|---|
| R10-P1-001 | **P1** | 圈子主页 | 冷启动/深链进入有效圈子（摄影圈 id=8）被判「圈子不存在或已解散」 | 空态判定竞态 | `25-circles-circle-home.png` |
| R10-P1-002 | **P1** | 恋爱咨询 | 封存态（`commerce.consult=false`）下仍展示 ¥99/¥129/¥159 课程 + 「报名」按钮 | 开关未接线 | `47-love-center-consulting.png` |
| R10-P1-003 | **P1** | 全站 | 状态栏叠印仍在 ≥5 页出现（标题被系统时间压住） | 避让链路断点（系统性） | `33` `45` `47` `69` `70` |
| R10-P1-004 | **P1** | 匹配成功 / 实名 | 头像渲染为**空白白圆**（无兜底图） | 图片源未本地化/兜底未生效 | `32-match-success.png` `50-real-name.png` |
| R10-P2-005 | P2 | 匹配列表 | 标题「匹配列表」与返回按钮**重叠** | 布局碰撞 | `36-likes.png` |
| R10-P2-006 | P2 | 附近的人(卡) | 昵称显示为 `? . . .`；「亲密度 72%」标签压住简介文字 | 文案/层级 | `45-love-center-nearby.png` |
| R10-P2-007 | P2 | 校园圈 | 校名截断（「中国人民…」「上海交通…」）；数字格式 w/千分位混用 | 自适应缺失 | `26-campus-hub.png` |
| R10-P2-008 | P2 | 搜索 | 缺返回入口；空态双文案矛盾；tab 语义与空态文案不符 | 信息架构 | `42-search.png` |
| R10-P2-009 | P2 | 选择兴趣 | 底部「完成选择」按钮遮挡「互相陪伴」标签 | 内容溢出 | `66-setup-interest.png` |
| R10-P2-010 | P2 | MBTI | 「提交并查看结果」按钮被裁切；速览+测试混排；无返回 | 内容溢出/IA | `46-love-center-mbti.png` |
| R10-P2-011 | P2 | 寻觅助手 | 首条消息被 header 裁切（消息列表未避让头部） | 滚动容器起始位 | `61-official-chat.png` |
| R10-P2-012 | P2 | 封存页/实名 | 缺自定义导航栏（无返回、无标题），仅靠系统返回 | 导航规范 | `73` `74` `75` `50` |
| R10-P2-013 | P2 | 发布动态 | `publish.vue` 与 `post.vue` 双实现并存且**功能不一致** | 技术债 | `16` vs `17` |
| R10-P2-014 | P2 | 恋爱咨询 | 该模块导航栏为绿色实心，与全站白底居中标题不一致 | 视觉规范 | `39` `47` |
| R10-P3-015 | P3 | 多页 | 审计测试数据污染正式库（聊天/帖子/讨论圈/相册） | 数据治理 | `60` `18` `69` `55` |
| R10-P3-016 | P3 | 多页 | 标签语言不统一：英文 `running/movies` vs 中文 `韩剧/写作` | 数据一致性 | `06` `34` `45` |
| R10-P3-017 | P3 | 附近的人 | 学校/校区字段混用（「北校区·5km」vs「东南大学·6km」） | 数据一致性 | `34-nearby-people.png` |
| R10-P3-018 | P3 | 讨论圈 | 副标题与分组副标题文案重复；条目缺作者/时间 | 文案 | `69-discover-discussions.png` |
| R10-P3-019 | P3 | 寻觅助手 | 9 月推「春季联谊会」；推「交友币」与封存策略矛盾 | 内容运营 | `61-official-chat.png` |
| R10-P3-020 | P3 | 线下活动 | 分类兜底文案「其他」语义不清 | 文案 | `70-discover-activities.png` |
| R10-P3-021 | P3 | 细分发现 | 10/10 推荐对象全为女性，人格池性别分布单一 | 素材 | `33-home-segment.png` |
| R10-P3-022 | P3 | 我的相册 | 空位边框近乎不可见；「添加照片」按钮弱可点击感 | 视觉层级 | `55-profile-album.png` |

**合计 22 项**：P1 × 4、P2 × 10、P3 × 8。

---

## 1. 三条系统性根因（修这 3 条 = 一次清掉大半清单）

### 1.1 【根因 A】状态栏避让链路"变量名写了但没人注入"

项目已确立统一写法：`var(--statusbar, env(safe-area-inset-top))`，其中 `--statusbar` 由 `composables/useMenuButtonRect()` 的 `styleVars` 绑到页面根节点 `:style` 注入。

全仓语法扫描结果：

| 指标 | 数量 | 说明 |
|---|---|---|
| `env(safe-area-inset-top)` 总出现处 | **103** | 覆盖 ~50 个页面/组件 |
| 使用 `var(--statusbar` 且**已正确接注入源** | **14** 页 | R8/R9 等轮次修过的（home/nearby/profile/hub/circle-home/match-success/likes/album/other/settings/interest/daily-question/heart-signals/village-index） |
| 使用 `var(--statusbar` 但**未接注入源** | **0** | 好消息：已修的都接对了 |
| 仍在用 **env-only**（无 `--statusbar` 兜底） | **~50 页/组件** | 模拟器/多数机型 `env(safe-area-inset-top)=0` → 顶部避让=0 |
| 注入 `usePageMetaStyle` 的文件 | **0** | `useStatusBarHeight.ts` 里那套 `page-meta` 注入路径**从未被任何页面使用**（死代码） |

> 关键洞察：R8/R9 每一轮都是"撞见一页、修一页"，累计只修了 5 处用户可见缺陷。**这不是修得不够勤，而是缺一次语法级收口**——103 处里还有 ~50 处同样的写法在等着。

**本次截图实证仍有叠印的页面**：`33-home-segment`（`home/segment.vue` 只有普通 padding）、`45-love-center-nearby`（`padding: calc(env(safe-area-inset-top) + var(--sp-4))` → 实际 = 8px）、`47-love-center-consulting`、`69-discover-discussions`、`70-discover-activities`。

**附带问题**：变量命名不统一，存在**第三套** `--statusbar-height`（`pages/nearby/index.vue:503`）。

**建议修法（R11 首选动作）**
1. 写 `apps/client/scripts/check-statusbar-offset.mjs`，规则三条：
   - 禁止裸 `env(safe-area-inset-top)`（必须包在 `var(--statusbar, …)` 内，或走白名单类 `.safe-area-*`）；
   - 凡出现 `var(--statusbar` 的文件，必须同时存在 `useMenuButtonRect`（或等价注入）——**杜绝"变量名写了但没人注入"的静默失效**；
   - 禁止 `--statusbar-height` 等自造变量名。
2. 挂到 `build:mp-weixin:real|mock|showcase` 三链前置（与既有 `check:mp-image --strict` 同级 fail-fast），并在 pre-commit hook 加同规则。
3. 顺手清理未使用的 `usePageMetaStyle`（或明确标注为备用），消除"有两条注入路径"的认知歧义。

### 1.2 【根因 B】空态判定没有区分「未开始拉取 / 拉取中 / 确实不存在」

`subpackages/circles/circles/circle-home.vue:85-89`：

```ts
const isUnknownCircle = computed<boolean>(() => {
  if (useMock()) return false;
  if (!circleId.value) return true;
  return !circles.value.some((c) => c.id === circleId.value);   // ← store 冷启动时必定 true
});
```

`onLoad` 里才异步补拉 `fetchCircles()`，但**判定不等拉取结束**。于是冷启动/深链直连 → 先渲染「圈子不存在或已解散」，等接口回来才变正常。

**已排除的假设**：不是 id 类型不匹配（store 内 `id: String(raw.id)` 已归一化，`stores/circle.ts:80`）；不是数据问题——实测 `GET /api/v1/circles` 返回 **id=8「摄影」圈存在**（12001 成员 / 5 话题 / 12 位好友已加入）。
**为什么 R9 没抓到**：R9 是从兴趣圈列表页点进去的（store 已热），所以不触发该竞态；r10 用 `wx.reLaunch` 直连才复现。

**建议修法**：判定必须 gate 在"**已成功拉取完成**"上；拉取中/未开始 → 走骨架态而非错误态：

```ts
if (loading.value || circles.value.length === 0) return false;  // 未就绪 → 骨架
return !circles.value.some(c => c.id === circleId.value);       // 已就绪且未命中 → 真不存在
```
更彻底的做法：把全站 `idle/loading/empty/error` 四态收敛成一个 `useAsyncState` 组合式，禁止各页手写"空态=取反"。

### 1.3 【根因 C】商业化封存开关"页面没读"

`47-love-center-consulting.png` 展示三门**带价格的课程**（¥99 / ¥129 / ¥159）与「报名」按钮，而后端 app-config 实测 `commerce.enabled=false`、`commerce.course=false`、`commerce.consult=false`。

对照：`73-market-detail` / `74-market-shop` / `75-market-wallet` 三页**正确**渲染「功能封存中」卡（说明封存体系本身可用），`76/77/78` VIP 三页走 `onLoad` 守卫重定向到「我的」（`subpackages/vip/index.vue:53-59`）。

**结论**：封存闸 `useAppConfigStore.isCommerceOn()` 未接进恋爱咨询/课程页 —— **同一策略在同一 App 内三种表现**（正确封存 / 未接线 / 守卫跳转）。建议：以路由为粒度做一次"封存覆盖面审计"，凡带交易动作（价格、报名、购买、支付、币）的页面逐个确认闸门接线，并加单测。

---

## 2. P1 明细（用户可见的功能性错误）

### R10-P1-001 圈子主页误判「圈子不存在」｜截图 `25`
见 §1.2。**影响**：分享链接/消息卡片直达圈子是社交产品的核心入口，用户第一眼看到"已解散"。
**验收方式**：`wx.reLaunch` 直连 `/subpackages/circles/circles/circle-home?id=8`，首屏应为骨架/正常内容，不得出现"圈子不存在"。

### R10-P1-002 恋爱咨询未封存｜截图 `47`
见 §1.3。

### R10-P1-003 状态栏叠印｜截图 `33` `45` `47` `69` `70`
**现象**：左上标题/副标题与系统状态栏（时间、电量）文字重叠。
**典型**：`70-discover-activities` 首行「从时间清晰、地点明确的小活动开始…」被 `0:11` 压住；`33-home-segment` 标题「细分发现 · 在线」被 `22:59` 压住；`45-love-center-nearby` 标题「附近的人」顶到屏幕最上沿。
见 §1.1 修法。

### R10-P1-004 头像空白白圆｜截图 `32` `50`
- `32-match-success`：左侧本人头像为**纯白圆**（右侧对方头像正常）。
- `50-real-name`：状态卡内头像同为**空白白圆**。
- 同账号在 `09-profile` 头像正常 → 说明问题出在**这两个页面的图片源/兜底路径**，不是账号没头像。
- 代码线索：`match-success.vue:27` `myAvatar = profileStore.avatarUrl || IMAGE_PATHS.DEFAULT_AVATAR`；`DEFAULT_AVATAR = STATIC_BASE + '/default-avatar.jpg'`，而 `src/static` 下同时存在 `default-avatar.jpg`（根）与 `assets/default-avatar.jpg`（子目录）**两份同名资源** → 路径歧义 + 远程 http 头像被 base lib 拒渲染（R5 已有"mp base lib 3.16.2 拒 http 图"结论）两个方向都要验。
**待补验证**：抓这两页的实际 `src` 值（控制台 `wx.getImageInfo`）与 `prepare-static` 裁剪后包内是否存在该文件；确认后统一"头像兜底"组件（空 src / 加载失败 → 落地成本地默认头像）。

---

## 3. P2 明细（视觉/交互一致性）

| 编号 | 现象 | 截图 | 建议 |
|---|---|---|---|
| 005 | 「匹配列表」标题与左上返回按钮横向重叠，「心动信号」徽标 + 「管理」按钮同排挤压 | `36` | 返回键改绝对定位、标题左内边距按返回键宽度预留；右侧操作收进「…」 |
| 006 | 卡片昵称显示 `? . . .`；橙色「亲密度 72%」标签覆盖简介文字；右上角有绿色残留色块 | `45` | 确认 `?` 是占位还是取数失败；简介容器给右侧留出标签宽度或标签换行 |
| 007 | 校名被「未认证」标挤压截断；统计数字 `2.8w` 与 `9,823` 混用 | `26` | 校名 `ellipsis` + 标签独立行；数字统一格式化函数（同 `formatCount`） |
| 008 | 无返回入口；「输入关键词，搜索校园里的帖子」与「这里空空如也」重复矛盾；tab（用户/标签/学校）与空态文案语义不符 | `42` | 补导航栏；空态只留一句；tab 与空态文案对齐 |
| 009 | 底部主按钮遮挡「互相陪伴」标签（内容溢出屏幕） | `66` | 内容区底部 padding 用 `--tab-bar-h-with-safe`/安全区 token 兜住 |
| 010 | 「提交并查看结果」按钮被裁切；「16 型速览」+「简化测试」两套 IA 挤一页；无返回 | `46` | 拆为两页或改分段；补导航 |
| 011 | 首条消息被绿色 header 裁切，只看到半个气泡 | `61` | 消息滚动容器加 `scroll-into-bottom` / 顶部 padding 避让 header 高度 |
| 012 | 封存页（market×3）与实名页无导航栏、无标题；「返回」是页面内按钮 | `73` `74` `75` `50` | 统一自定义导航组件（返回 + 标题 + 胶囊避让），封存页也应有标题 |
| 013 | 两个「发布动态」并存：`16`(publish) 无标题/无底栏、`17`(post) 有标题输入「填写标题会有更多赞哦~」+ 底栏（图片/话题/位置/提及/更多） | `16` `17` | 二选一收敛（建议留 `publish`），旧页仅做重定向 |
| 014 | 恋爱咨询模块导航为绿色实心，与全站白底+居中标题不一致；页内「MBTI 人格测试」在「快捷入口」与「恋爱测试」下各出现一次；整页仅 3 行列表 | `39` `47` | 换全站导航样式；去重入口；补内容或合并 |

---

## 4. P3 明细（数据 / 文案 / 素材）

| 编号 | 现象 | 截图 | 建议 |
|---|---|---|---|
| 015 | 审计残留进正式数据：聊天气泡 `Round-8 audit: chat send verification`；帖子 `Round-7 验收打卡：今晚的晚霞是粉紫色的…`；讨论圈同一句「今天在操场跑步遇到了很美的晚霞…」重复 3 次；相册同一张照片放 2 格 | `60` `18` `69` `55` | 出清理迁移（按 `%audit%`/`%验收%`/`%Round-%` 关键词 + QA 账号维度），并把"审计数据写入 QA 账号专库/专租户"写进 QA 规范 |
| 016 | 新用户兴趣标签英文（`running/movies/reading`），种子用户标签中文（`韩剧/写作/探店`） | `06` `34` `45` | 注册/向导标签落库前做中文映射，或统一走同一标签字典 |
| 017 | 同列表内「北校区·5km」「南校区·6km」与「东南大学·6km」混排 | `34` | 学校字段与院区字段拆列，展示走同一取值优先级 |
| 018 | 顶部副标题与分组副标题几乎同句；讨论条目无作者/无时间/无头像 | `69` | 删一条重复文案；补元信息 |
| 019 | 9 月推送「春季联谊会开始报名啦」；推送「连续签到 7 天额外赠送 2 交友币」与封存策略矛盾 | `61` | 官方消息内容改为可配置/按季节取值；封存期内不下发币类文案 |
| 020 | 活动分类列显示兜底文案「其他」 | `70` | 兜底文案改「综合」或隐藏分类标 |
| 021 | 「细分发现·在线」10 条推荐全为女性头像 | `33` | 人格池补男性样本（现 21 套偏单一） |
| 022 | 相册 7 个空位边框淡到看不见；「添加照片」按钮白底淡字 | `55` | 空位加虚线边框 token；按钮改主色描边/实底 |

---

## 5. 防误报（已核实为**非缺陷**，不必改）

| 截图 | 表象 | 实际 |
|---|---|---|
| `76` `77` | 都显示「我的」页（两文件 md5 完全相同） | `subpackages/vip/index.vue:53-59` onLoad 守卫：无入口上下文 → `navigateBack`/`switchTab(PROFILE)`。**封存设计如此** |
| `12-login` | 显示寻觅页而非登录页 | `pages/login/index.vue:92` 已登录 → `switchTab(/pages/discover/index)`。**守卫正确** |
| `31-discover-matching` | 显示寻觅卡而非「匹配中」动画 | `matching.vue:45-47` 无 target 参数 → 回退 `switchTab(DISCOVER)`。**需脚本带参才能巡检** |
| `15-village` `43-heart-signals` | 显示「完善资料，解锁完整交友功能 当前完成度 30%」 | 完成度门槛锁定，非报错 |
| `73` `74` `75` | 「功能封存中」 | `commerce.*=false`，与 ADR-2 一致 |
| `09` `15` 显示 30% | 疑似完成度 bug 复发 | 巡检账号 100158 的 `profileCompleted=false`、`scheduleCompleted=false`；30% = 仅基础资料（schedule 20 + interestTags 20 才到 70%）。**数据正确** |

---

## 6. 方法与流程改进（比单点修复更值钱）

### 6.1 巡检账号必须换成"满完成度 + 已实名"
本次 81 张截图用的账号完成度仅 **30%**，直接导致：`43-heart-signals` 渲染的是 LockScreen、村口锁屏、`66/67` 向导态、大量"资料锁"空态 —— **约 1/3 的截图看到的是门槛态而不是真实内容态**，这轮巡检的信息量被大幅浪费。
**规范**：R11 起固定两套巡检身份 —— ① **满配账号**（100% 资料 + 已实名 + 有聊天/帖子/相册数据）跑主链路；② **全新账号**（注册即用）跑门槛与空态链路。两套各出一轮，缺席任一套即视为巡检未完成。

### 6.2 把"撞见式修复"升级为"语法级收口"
状态栏问题连修 5 轮仍有残留（R8 报 4×P1、R9 又发现 1 处），根因就是缺守卫脚本。建议给同类"全局约定"都补一条静态检查：状态栏避让、`<image>` 的 `mode` 写法（已有）、tabBar 避让 token、路由常量引用。
现有可复用范本：`scripts/check-mp-image-styles.mjs` + `scripts/check-tabbar-consistency.mjs` + `scripts/git-hooks/pre-commit`。

### 6.3 深链/冷启动要成为独立测试维度
R10-P1-001 只在冷启动暴露，热路径永远测不到。建议巡检脚本对**每个分包首页与详情页**都补一次"冷启动直连"（`reLaunch` + 清 store 或新开窗口），并断言"首屏不得出现错误空态"。这类缺陷（误报"不存在/已解散/加载失败"）对产品的伤害远大于任何视觉瑕疵。

### 6.4 双实现收敛与卫生清理
`publish.vue` vs `post.vue`；`useStatusBarHeight` + `page-meta` 注入路径 0 引用；`--statusbar` 与 `--statusbar-height` 并存；`default-avatar` 两份同名资源。建议排一个"技术债清理批次"，一次清完（都是低风险、可静态识别）。

---

## 7. 证据索引

| 类别 | 路径 |
|---|---|
| 全部截图 | `reports/screenshots/r10-audit/`（81 张，含 `00-home-verify`×2） |
| 巡检脚本 | `scripts/r10-shoot.ps1`（四段：主包 → circles/campus/discover-extra → tools/profile-extra → chat/setup/support/market/vip） |
| 上轮报告 | `reports/audit/2026-09-16-r9-newuser-lifecycle/audit-report.md` |
| 关键代码 | `subpackages/circles/circles/circle-home.vue:85-89`、`stores/circle.ts:80`、`subpackages/tools/love-center/consulting.vue:121`、`subpackages/discover-extra/discover/match-success.vue:27`、`composables/useStatusBarHeight.ts`、`composables/useMenuButtonRect.ts` |
| 接口证据 | `GET /api/v1/circles` → id=8「摄影」存在；`GET /api/v1/app-config` → commerce 全 false |
| 本次探针脚本 | `tmp/r10probe2.py`、`tmp/r10probe3.py` |

---

## 8. 建议的下一轮（R11）顺序

1. **P1-001** 圈子冷启动空态（1 行判定 + 回归）
2. **P1-002** 恋爱咨询封存接线（+ 全站封存覆盖面审计）
3. **P1-003** 状态栏守卫脚本 → 一次性扫掉 ~50 处 → 挂三链 CI
4. **P1-004** 头像兜底统一（含 default-avatar 资源归一）
5. P2 逐页（005–014，建议按"页面组"批量提交，避免巨型 commit）
6. P3 数据/文案批次 + 测试数据清理迁移
7. 补齐 §6.1 双身份巡检，重跑 R11 全站截图做回归基线
