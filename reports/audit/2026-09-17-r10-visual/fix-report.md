# Round-10 修复与回归报告（2026-09-17）

> 上游报告：[audit-report.md](./audit-report.md)（22 项问题：P1×4 / P2×10 / P3×8）
> 回归证据：`reports/screenshots/r10-regress/`（26 张，全部在 real 构建 + 曦风(100158) 登录态实拍）
> 构建链：`pnpm build:mp-weixin:real:dev` 通过（含新增状态栏守卫 fail-fast）

---

## 1. 修复清单（对照上游 22 项）

### P1（4/4 全部修复并回归验证）

| 编号 | 修复 | 回归证据 |
|---|---|---|
| P1-001 圈子冷启动误判不存在 | `circle-home.vue`：`isUnknownCircle` 增加 `circlesFetchSettled` 门——拉取未落定恒走骨架态；拉取中（被前置页触发）由 `watch(loading)` 接管；落定后未命中才判未知圈 | `R25-circle-home.png`：直连 `circleId=8` 首屏完整渲染摄影圈（无"不存在"闪现、无卡骨架） |
| P1-002 恋爱咨询未封存 | `consulting.vue`：接 `appConfig.isCommerceOn("consult")`；封存态渲染 ADR-2 同款封存卡；web-view 分支同样受闸控制 | `R47-consulting.png`：显示"功能封存中"卡，无 ¥ 课程/报名按钮 |
| P1-003 状态栏叠印（系统性） | ① 全仓 60 文件 `env(safe-area-inset-top)` → `var(--statusbar, env(...))` 兜底链；② 12 个叠印页接线 `useMenuButtonRect` 注入（segment/love-center nearby·mbti/tag-posts/campus post-topic·topic-detail/history/location/market×3/consulting→AppShell/real-name·verification）；③ 新增守卫脚本 `scripts/check-statusbar-offset.mjs`（禁裸 env/禁自造变量/注入源 warn），已接入 `build:mp-weixin:real(:dev)` 链，当前 **0 errors PASS**；④ 收敛第三套命名 `--statusbar-height`（nearby/index.vue），login 页统一兜底链 | `R33/R45/R19/R28/R29/R35/R46/R53/R74` 等：标题/返回键全部位于状态栏之下 |
| P1-004 头像/图标空白 | ① `match-success.vue`：myAvatar 经 `resolveMediaUrl()` 统一出口；② `MatchSuccess.vue`：双头像加 `@error` → 本地默认头像兜底；③ 实名/认证中心状态卡：`SafeImage custom-class` 跨组件作用域不生效导致零尺寸 → 改原生 `<image>` + 补 72rpx 尺寸 CSS；④ 删除 `src/static/default-avatar.jpg` 重复副本（保留 `assets/default-avatar.jpg` 唯一真身） | `R49-verification.png`：状态卡 🎓 图标正常渲染；`R50-realname.png`：状态卡结构正常 |

### P2（代码修复 6 项；4 项复核为误报/设计如此）

| 编号 | 结论 | 说明 |
|---|---|---|
| P2-005 匹配列表标题重叠 | **已修** | 胶囊 96px 预留从 `likes-header__actions` 上移到整行；标题改为可省略截断（不折行不叠字）| 
| P2-006 `?...`昵称/徽标压简介 | **已修（根因反转）** | `?...` 为 masked 蒙面模式设计占位（非缺陷）；真因是 `schoolLabel` 兜底拆分 `headline`，而 headline 已是自由简介 → 简介被塞进学校槽渲染成长胶囊并与认证徽章叠压。已移除该兜底（学校槽只认 campusName/学历），`card__school` 本有 ellipsis 兜底 |
| P2-007 校名截断/数字混用 | **已修** | 校名独占一行，"未认证" badge 下沉到统计行；`9,823/9,500/8,600/8,000` 统一为 `9.8k/9.5k/8.6k/8k` |
| P2-008 搜索页 | **已修** | 补返回键；空态只留一句（EmptyState 新增 `hideSub`）；文案对齐 tab 语义（"搜索感兴趣的人、标签和学校"），noResult 改中性 |
| P2-009 兴趣页按钮遮挡 | **误报** | 复核 `66-setup-interest.png`：按钮与"互相陪伴"无重叠（间距正常） |
| P2-010 MBTI 按钮裁切 | **误报（部分）** | 提交按钮在 scroll-view 内，裁切为滚动中间态；返回键本就存在（旧截图中被状态栏压住——已由 P1-003 注入修复）。"两套 IA 挤一页"保留为观察项 |
| P2-011 助手首条消息裁切 | **误报** | scroll-to-bottom 定位到最新消息，顶部消息半显是聊天列表常态 |
| P2-012 封存页/实名缺导航 | **已修** | real-name：`safe-top` 移到 nav-bar 之前 + 注入 `--statusbar`（此前整条导航顶进状态栏）；market 三页补注入（页面本有返回+标题） |
| P2-013 publish/post 双实现 | **设计如此** | `publish`=快速动态（profile 入口）、`post`=带标题帖子（village/nearby/profile 入口），两种内容类型均有活跃入口与链路 E 依赖，不收敛 |
| P2-014 恋爱咨询导航/入口重复 | **已修** | 换全站统一 AppShell 白底导航（P1-003 同步解决）；MBTI 从"快捷入口"去重（恋爱测试区保留唯一入口） |

### P3（代码+数据修复 6 项；2 项复核为设计/数据正确）

| 编号 | 结论 | 说明 |
|---|---|---|
| P3-015 审计残留数据 | **已修** | 迁移 `V2026.09.17.0001__r10_data_quality_fixes.sql`：删除 Round-7/8 验收帖(225/226)及其点赞/收藏/评论、`Round-8 audit` 私聊、QA 账号孤儿浏览历史；已在本地库执行并验证归零 |
| P3-016 标签英文/中文混排 | **已修（根因反转）** | 标签按设计存英文 key（profile-tags.ts 明确禁止改中文），混排根因是展示层未做映射。新增 `utils/tag-label.ts`（字典 + 存量别名表 running/movies/food 等），接入 CardSwiper / MatchInfo（发现页） / nearby-people；回归 `R06` 显示 跑步/电影/阅读/摄影 |
| P3-017 校区/学校字段混用 | **设计如此** | "北校区/南校区" 是 `V2026.08.09.0007` 有意种子（同校区过滤键），改为校名会破坏校区分组语义 |
| P3-018 讨论圈副标题重复/缺元信息 | **部分修复** | 删除与页头近同句的分组副标题；"缺作者/时间"系后端 `DiscussionRecommendationView` 本无该字段（话题推荐非 UGC），不做假数据；另将种子 12 连发同文案"操场晚霞"帖按 id 扰动为 6 种同主题改写（同句霸榜消除） |
| P3-019 官方助手消息矛盾 | **已修** | 迁移修正：春季联谊会→季节无关表述；签到赠币/会员解锁/币解锁等封存矛盾文案→功能引导；回归 `R61` 文案已更新 |
| P3-020 活动分类"其他" | **已修** | i18n `activities.category.other`：其他→综合 |
| P3-021 推荐池全女性 | **数据正确** | 库内池 116 女 / 93 男；巡检账号性别未设置（NULL）时推荐池按产品默认返回女性候选——男性视角列表全女性为预期行为，非缺陷 |
| P3-022 相册空位/按钮 | **已修** | 空位加品牌色虚线描边+浅绿底，"+"改品牌绿；"添加照片"按钮改品牌描边+浅绿底 |

## 2. 附带发现（本轮新修）

- **模拟器假死与恢复**：长时间窗口复用导致 `reLaunch:fail timeout`，`simulator_refresh` / 重开项目窗口可恢复；已写入巡检脚本（分段 + 段间 refresh）。
- **守卫接线**：`check:statusbar` npm script + 两条 real 构建链 fail-fast（`check-statusbar-offset.mjs` 当前 0 error / 29 warn，warn 为"有 var 无注入源"清单，供后续按页收敛）。
- **登录态取证方法**：窗口重启后需"注入 token → 触发 `session.bootstrap()`"两步（已固化 `scripts/eval_boot.ps1` / `eval_state.ps1`），单纯写 storage 不更新内存会话。

## 3. 回归矩阵（26 张实拍）

| 页面 | 验证点 | 结果 |
|---|---|---|
| R25 circle-home | 冷启动直连不再误判 | ✅ |
| R33 segment | 标题避让 + 新增返回键 | ✅ |
| R45 lc-nearby | 标题避让；masked 卡无叠压 | ✅ |
| R47 consulting | 封存卡 + AppShell 导航 | ✅ |
| R19/R28/R29/R35/R46/R53 | 状态栏避让 | ✅ 全部 |
| R49/R50 | 状态卡图标渲染 + 实名导航 | ✅ |
| R32 match-success | 头像兜底（页内无 401 空白圆） | ✅ |
| R36 likes | 标题与返回/右侧胶囊不再叠字 | ✅ |
| R26 campus-hub | 六字校名完整显示 + badge 下沉 | ✅ |
| R42 search | 返回键 + 单句空态 | ✅ |
| R39 love-center | 统一导航 + MBTI 去重 | ✅ |
| R55 album | 空位虚线框/绿色 +、按钮可点击感 | ✅ |
| R61 official-chat | 消息文案无季节/币类矛盾 | ✅ |
| R69 discussions | 分组副标题去重 | ✅ |
| R06 discover | 标签中文映射（跑步/电影/阅读/摄影） | ✅ |
| R34 nearby-people | 列表 + 标签映射 | ✅ |

## 4. 遗留/后续建议

1. `check-statusbar-offset.mjs` 的 29 条 warn（有兜底链无注入源）建议按页面组逐步清零后升级为 error。
2. MBTI 页"16 型速览 + 4 题测试"混排保留观察；如需拆分建议产品侧定夺。
3. 巡检规范：固定双身份（满配账号 + 新注册账号）；巡检脚本统一走 `circleId` 等真实参数名（本轮 `?id=8` 参数名笔误曾误导取证）。
