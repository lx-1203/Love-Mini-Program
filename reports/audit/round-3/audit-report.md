# Round 3 审计报告（2026-09-10/11）

## 执行环境

| 项 | 状态 |
|---|---|
| MySQL 3306 | UP（campus_love） |
| Redis 6379 | UP（PONG） |
| 后端 API 8080 | UP（/actuator/health = {"status":"UP"}），全新 jar（含 MessageDashboardService 修复） |
| 小程序构建 | build:mp-weixin ✓（Node 22.17.0，体积门禁验收通过） |
| 微信开发者工具 | 2.02.2608040，已登录，项目窗口 fullMode，simulator 348×750 |
| 前后端联通 | app-config / auth/me / login-hero 均 200；游客登录→后端会话→演示数据预置全链路可用 |
| 登录态 | 游客登录（稍后再看）→ 秋薇(100151)，GuestDemoDataProvisioner 预置会话/互动数据 |

## 审查方法

- 4 个无记忆 judge 子代理 × 20 张截图（主包 6 Tab + 分包 14 页），每张强制 ≥1 个证据化问题，共产出 **54 项**记录在案。
- 截图对照理想图（素材/理想效果图/）做结构→层级→交互→间距→字色逐级比对。
- 全部问题按 P0→P4 分诊：修复 / 记录保留 / 判为误报，逐条给出证据与处置。

## P0 分诊结果（0 项成立）

| Issue | 判定 | 依据 |
|---|---|---|
| MP-R3-MATCHING-001 匹配页"打不开" | **误报（自动化伪影）** | matching.vue onLoad 无匹配上下文时 200ms goBack 兜底（防死页设计，2026-08-18 引入）。真实链路：寻觅卡「喜欢」携带 cardId/action/userId 上下文进入 ✓；游客被实名认证门控拦截（产品逻辑）✓；`?dev-preview=1` QA 入口可稳定复现匹配中动画页 ✓ |

## P1 修复清单（9→9 全部修复）

| Issue ID | 页面 | 问题 | 修复 | 验证 |
|---|---|---|---|---|
| MP-R3-HOME-001 | home | 头部铃铛+角标"3"侵入状态栏/刘海带，与胶囊过近 | HomeHeader padding-top 改 `var(--statusbar, env())`；composable 注入 --statusbar | r3-02：标题行/铃铛/定位完整可见 ✓ |
| MP-R3-HOME-006 | home | 滚动后统计区与系统时间/刘海叠印 | 页面新增 onPageScroll 驱动的顶部渐变遮罩（.home-page__top-scrim，scrollTop>10 淡入） | r3-03：滚动后 14/2/10/3 统计区全部可读 ✓ |
| MP-R3-PROFILE-001 | profile | 右上分享/设置图标进入状态栏带，其下文字被胶囊遮挡 | MyHeader icons top 改 statusbar+16rpx、right 追加 104px 胶囊避让；`.my-header` 顶部补 statusbar 内边距；profile `.safe-top` 接入 --statusbar | r3-06：图标位于胶囊带内左侧、编辑资料胶囊不再叠压 ✓ |
| MP-R3-DAILY-001/003 | daily-question | 头部标题与系统时间叠印（返回钮同因被盖） | dq-header padding-top 接入 --statusbar；页面根绑定 useMenuButtonRect().styleVars | r3-12：返回/标题在状态栏下方 ✓ |
| MP-R3-MSUCCESS-001/002 | match-success | 返回钮、右上截图钮侵入状态栏，右上钮与胶囊同带碰撞 | success-nav padding-top 接入 --statusbar、右侧 padding 追加胶囊避让 104px；根绑定 styleVars | r3-13 ✓ |
| MP-R3-SETTINGS-001 | settings | 自绘导航栏整体被顶进状态栏（视觉上"无返回"） | `.safe-top`（--statusbar 化）移至 nav-bar 之前；**补正漏实例化的 useMenuButtonRect**（此为修复不生效根因） | r3-19：‹ 返回 + 「设置」标题完整可见 ✓ |

## P2 修复清单（12 项：11 修复 + 1 记录）

| Issue ID | 页面 | 处置 |
|---|---|---|
| MP-R3-MSG-001 | messages | **修复（IA）**：「最近聊天」前移至「活动推荐」之前（原被 3 张活动卡挤出首屏）；模板顺序交换 + 注释同步 |
| MP-R3-CIRCLES-001/002 | circles | **修复**：文案精简（人加入→人、等 N 位朋友加入）；加入按钮水平内边距 sp-7→sp-5；统计行不再被省略号吃掉 |
| MP-R3-CAMPUS-001 | campus-hub | **修复**：统计文案精简（位同学→同学、条动态→动态）+ nowrap+ellipsis，「态」字孤行消失 |
| MP-R3-VILLAGE-001 | village | **修复（数据）**：晚霞帖 post-7 热气球图 → 黄昏球场 basketball.png（10 帖） |
| MP-R3-POST-001 | post-detail | **修复（数据）**：帖 221 车内补觉图 → campus-life.png（操场） |
| MP-R3-POST-003 | post-detail | **修复（数据）**：帖 221 补 12 赞 + 2 条评论（likes_count/comments_count 同步） |
| MP-R3-CIRCLEHOME-001 | circle-home | **修复**：hero 返回钮 top 接入 --statusbar；灰 chevron → 白色粗 chevron（深色封面可读） |
| MP-R3-CIRCLEHOME-002 | circle-home | **修复（数据）**：云海帖三图（房车/摄影师/暗山）→ 云天/山崖/雾山素材 |
| MP-R3-DISCOVER-002 | discover | **修复**：匹配度粉圆 128→160rpx、内圈 104→132rpx、value 40rpx、label 22rpx（原「匹配度」糊化不可读） |
| MP-R3-PUBLISH-001 | publish | **修复**：禁用态发布按钮文字 #fff→深绿 #2A7A5E（对比度 1.36:1→4.6:1+） |
| MP-R3-SETTINGS-002 | settings | **修复**：「恋爱认证」双入口去重（保留账号管理组）；「浏览记录」图标换 common/eye.svg |
| MP-R3-OTHER-001 | profile-other | **修复（数据）**：小满(10003,女) 半身照男性素材 person-03 → person-02（女性），封面性别自洽 |

## P3/P4 快速修复（择优）

| Issue ID | 处置 |
|---|---|
| MP-R3-MSG-002 | **修复**：消息页「14 个人想认识你」→「14 人喜欢了你」（含后端 AssistantSuggestionView 文案同步） |
| MP-R3-MSG-003 | **修复（后端）**：MessageDashboardService 活动图标按标题关键词映射（篮球🏀/骑行🚴/跑步🏃/读书📚/观影🎬，默认🌿），不再全场绿叶 |
| MP-R3-HOME-003 | **修复**：进度瓦片「参与兴趣互动」→「兴趣互动」（孤字换行消除） |
| MP-R3-HOME-004 | **修复**：推荐卡「喜欢」按钮误用「看看TA」按钮图（渲染白条）→ 白色 ♥ 字符 |
| MP-R3-PROFILE-002 | **修复**：locationLabel 在 future==home 时去重（"北京 · 未来: 北京"→"北京"） |
| MP-R3-PROFILE-003 | 已有 line-clamp（复核实为排版正常），记录复核结论 |
| MP-R3-VILLAGE-002/003 | **修复**：品牌副标题 nowrap；搜索框与胶囊间距 104→112px |
| MP-R3-CAMPUS-004 | **修复**：文案「认证后可进入私域」→「认证学校后可加入专属校园圈」 |
| MP-R3-CHAT-002 | **修复**：空会话裸文本改居中浅灰 .chat-empty-hint |
| MP-R3-OFFCHAT-001 | **修复**：官方号副标题 #667870→#5A6B64（加深一档） |
| MP-R3-OFFCHAT-002 | **修复**：官方号"+"按钮改私聊同款灰底深字 |
| MP-R3-MSUCCESS-003 | **修复**：文案「互相喜欢了彼此」→「互相喜欢上了」（昵称回填逻辑原有，仅深链缺参时回退 TA） |
| MP-R3-MSUCCESS-004 | **修复（CSS）**：双头像 160→192rpx、连接心 100→136rpx/120rpx 圆 |
| MP-R3-NEARBY-001 | **修复**：校园圈入口本校（sessionStore.campusName）置顶，与定位文案自洽 |
| MP-R3-NEARBY-002 | **修复**：「我的人脉」WiFi 图（LOGIN_SPLIT r10_c02 切图错位）→ social/follow.svg 人形+加号 |
| MP-R3-DAILY-002 | **修复**：锁定卡新增「去签到」CTA（就地 checkInStore.checkIn() 解锁，消除死胡同）+ i18n unlockSuccess |
| MP-R3-SETUP-001 | **修复**：SetupProgress 首/尾 wrap flex 覆盖导致圆点 1-2 挤在一起的 CSS 结构缺陷；标签行与圆点行同构对齐 |
| MP-R3-SETUP-002 | **修复**：昵称/签名字段补「昵称/个性签名」标签与占位符（i18n zh/en 同步） |
| MP-R3-DISCOVER-001 | 记录：签名孤字行为自然换行，wxss 无 balance 能力，不值得为单条数据改版 |
| MP-R3-DISCOVER-004 | **修复**：「喜欢」标签品牌粉 #FF6B81 + 600 字重（三键层级） |

## 记录保留（产品决策/数据规模，附理由）

| Issue | 理由 |
|---|---|
| MP-R3-HOME-005 推荐卡信息密度 vs 理想图 | 缺认证行/相册条属数据模型扩展（需产品定义展示字段口径），本轮不臆造 |
| MP-R3-HOME-007 数字格式 1.2w vs 8,932 混用 | R21 已裁决对齐理想图（理想图自身即混用格式），维持 |
| MP-R3-HOME-008 兴趣卡图高不一 | 固定 216rpx+aspectFill 下三卡等高，judged 测量疑受图片内容明暗干扰，Round4 复核 |
| MP-R3-HOME-009 横滑无露头 | P4 优化项，与理想图一致即可，维持 |
| MP-R3-NEARBY-003/004 附近页 IA 与理想图差异 | 页面分区顺序"严格冻结"注释为产品决策；导航卡组承载核心跳转 |
| MP-R3-CIRCLES-003 兴趣圈无 tabBar | 二级页定位为产品结构决策（附近 Tab 已承载入口） |
| MP-R3-CAMPUS-003 全部"未认证"态 | 游客未认证视角自洽；认证激励文案已在 CAMPUS-004 改写 |
| MP-R3-CIRCLEHOME-003 热门 1.2w 人 vs 5 条动态 | 演示数据规模取舍：灌数百假话题污染演示库，维持种子真实计数 |
| MP-R3-POST-004 帖子缺来源圈子行 | 需数据模型扩展（posts.circle_id 归属），列入 backlog |
| MP-R3-PUBLISH-002/003 发布页底部工具栏 | P2-PUB-015 产品决策保留；003 位置文案已修 |
| MP-R3-MATCHING-003 = PROFILE-002 同源，已修 |
| MP-R3-DAILY-004 头部渐变粉尾 | **修复**（统一绿系渐变），随 DAILY-001 一并落地 |

## 误报/误判（判官结论被复核推翻）

| Issue | 复核结论 |
|---|---|
| MP-R3-MATCHING-001 P0 | 深链无上下文 200ms 兜底返回（设计内）；真实链路+dev-preview 双验证通过 |
| MP-R3-DISCOVER-003 筛选按钮未右对齐 | 实为胶囊安全区右对齐（R20 规避胶囊设计），判官建议反而会撞胶囊 |
| MP-R3-DAILY-003 无返回钮 | 返回钮存在，被状态栏叠压导致判官不可见（DAILY-001 修复一并解决） |
| MP-R3-CHAT-001 标题"聊天"非昵称 | 深链被误判临时会话所致；真实链路（消息列表进入）partnerName 正常 |

## 环境级问题记录

1. **开发者工具编译缓存陈旧**：多轮表现为"dist 已更新、运行时旧码"。定位：`WeappCompileCache`（87MB）。可靠解法 = 关窗 → 删 `WeappCompileCache` → 删 `dist/build/mp-weixin` → 全新构建 → 重开。**已写入回归高危区**。
2. **系统代理 127.0.0.1:7897**（Clash）复活导致模拟器启动失败：退出 IDE 全进程后重开可恢复；开发者工具代理设置保持「直连」未变。
3. 位置授权弹窗会遮挡截图：本轮以 `automation_wx_api mock getLocation` 固定坐标规避。
4. Git Bash 会把 `/pages/...` 转成 Windows 路径：自动化命令必须带 `MSYS2_ARG_CONV_EXCL="*"`。

## 数据迁移

- 新增 `database/flyway/sql/V2026.09.10.0001__r3_image_text_semantic_fix.sql`（幂等）：图文语义映射修正、小满半身照修正、帖 221 互动补齐。已在真实库执行成功（flyway_schema_history success=1）。
