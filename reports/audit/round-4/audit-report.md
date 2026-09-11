# Round 4 回归审计报告（2026-09-11）

## 方法

- 4 个全新无记忆 judge × 20 张 Round-4 回归截图（r4-*.png），双轨任务：①逐项验证 Round-3 修复是否真实生效；②独立寻找新问题。
- 判官携源码交叉验证权（可查 Java/Vue 源码定位根因）。

## Round-3 修复回归验证

**19/20 项验证通过**，1 项未生效转本轮修复：

| 回归项 | 判定 |
|---|---|
| 寻觅：喜欢粉色标签、匹配度徽章可读 | ✓ 生效 |
| 首页：头部避让、喜欢心形图标、瓦片文案 | ✓ 生效 |
| 首页滚动：渐变遮罩使统计可读 | ✓ 生效（数字随滚动淡出属正常滚动行为，遮罩 R4 已加高优化） |
| 附近：人脉图标、本校置顶 | ✓ 生效 |
| 消息：最近聊天前移、文案统一 | ✓ 生效 |
| 我的：图标避让、编辑胶囊、位置去重 | ✓ 生效 |
| 设置：nav-bar 复位、恋爱认证去重、eye 图标 | ✓ 生效 |
| 每日一问：状态栏避让、CTA、绿渐变 | ✓ 生效 |
| 匹配成功：nav 避让、文案、头像放大 | ✓ 生效 |
| 帖子 221：图文/互动/头像 | ✓ 生效（12 赞 2 评论含头像评语） |
| 圈主页：返回钮、朋友行空格 | ✓ 生效 |
| **小满封面女性化** | **✗ 未生效 → R4 修复**。判官定位根因：迁移守卫条件（=person-03）永不命中（前置迁移已改为 person-04），且封面实际取 `profile_background_url`（迁移未触及）。R4 已 UPDATE 该字段 → 复验 r4-16b 封面为女性 ✓ |

## Round-4 新问题与处置

### 修复（13 项）

| Issue ID | 级别 | 修复 |
|---|---|---|
| MP-R4-PROFILE-001 | P1 | 游客秋薇(女)头像为男性 person-09：GuestPersona.java 性别-素材映射全面修正（夏言→08、阿辰→05、草莓奶昔→04、周雨→09、暮然→03、秋薇→06），现库秋薇 avatar_url 已 UPDATE 为 person-04（女性），复验 ✓ |
| MP-R4-CAMPUS-001 | P1 | 校园圈 hub 认证按钮被胶囊压住 85%：padding-right 公式漏加胶囊本体 87px（7+8→7+104），margin-top 接 --statusbar；复验 ✓ |
| MP-R4-OTHER-001 | P2 | 他人主页返回钮侵入状态栏：other-header padding 接入 --statusbar + 页面根绑定 styleVars；复验 ✓ |
| MP-R4-CHAT-001 | P2 | userId 深链聊天标题回退「聊天」：新增 deepLinkPartnerName（createSession 会话视图昵称 + getPersonProfile 兜底拉取），pageTitle 回退链补全 |
| MP-R4-OFFCHAT-001 | P2 | 己方头像男性（同 PROFILE-001 数据面），随 avatar_url 修正消除 |
| MP-R4-MATCHING-001 | P3 | 音乐品味行图标空白：heart_pink.png 为全透明空文件（像素验证 opacity=0）→ 换 lucide music.svg；复验 ✓ |
| MP-R4-MSUCCESS-001 | P3 | 标题「成功」二字被微信胶囊叠压：内容区 padding-top 接 --statusbar+120rpx 下移至胶囊带以下；复验 ✓ |
| MP-R4-CIRCLEHOME-001 | P2 | 云海帖三图山感不足：二图 post-5→post-2（暗色云雾海岸）；复验 ✓ |
| MP-R4-CIRCLEHOME-002 | P4 | 「等12位朋友已加入」缺空格：i18n friendsJoined 加空格；复验 ✓ |
| MP-R4-POST-001 | P4 | 帖子详情禁用态发送按钮对比度 1.4:1 → 降饱和绿底+深绿字；复验 ✓ |
| MP-R4-PUBLISH-001/002 | P4 | 标题偏左+与胶囊贴挤：改三栏弹性布局（X|标题flex居中|发布），padding-right 200→210rpx；发布按钮 flex-shrink:0 |
| MP-R4-DAILY-001 | P4 | 锁定卡垂直居中（min-height 70vh），消除下方 60% 空白；复验 ✓ |
| MP-R4-SETTINGS-001 | P4 | 图标撞形：浏览记录 eye→clock、我的相册 pulse→album.svg；复验 ✓（全组图标语义唯一） |
| MP-R4-HOME-002 | P2 | 遮罩加高（statusbar+28px 渐变）让数字淡出而非硬裁切；统计数字随滚动上移属小程序正常滚动行为 |
| MP-R4-SETUP-002 | P4 | 签名 textarea 180rpx→120rpx 收紧死空间 |

### 记录保留（附理由）

| Issue | 理由 |
|---|---|
| MP-R4-HOME-004 / NEARBY-001 / CIRCLES-001 / CAMPUS-002 数字格式混用 | 理想图自身即「1.2w」与「8,932」混用（R21 裁决对齐理想图）；三轮 judges 均提示 → 升级为产品确认项，本轮维持理想图口径 |
| MP-R4-HOME-005 底部横幅被 tabBar 遮挡 | 伪影：截取时未滚动到底，InviteBanner 之后的 home-section-gap(360rpx+safe-area) 存在 |
| MP-R4-MESSAGES-001 会话项缺时间/未读 | 模板已含时间+未读角标（v-if 未读>0）；演示会话未读为 0、时间为相对字段缺失，属种子数据范围 |
| MP-R4-DISCOVER-001 距离 6km 双展示 | 卡片徽章=排序信息、资料行=详情，双入口为设计意图（P4） |
| MP-R4-NEARBY-002 本校 CTA 无差异化 | 需认证状态接入的产品设计，列入 backlog |
| MP-R4-HOME-002b 瓦片副文案字号 | P4，字号体系一致性权衡，维持 |
| MP-R4-SETUP-001 标签右偏 ≤14px | P4，等距性已达标，残余偏移源于标签宽度差，维持 |
| MP-R4-MSUCCESS-002 右头像纹理图 | dev-preview 星野头像与 DB 内叶清欢头像均为素材库纹理图，属素材资产缺失，已登记素材缺口 |

## 构建与环境

- 客户端全量重建 ✓（含 R4 全部修复）；后端重打包+重启 ✓（GuestPersona 修复）；Flyway 无新增迁移（数据修正为直接 UPDATE + 后续并入 R3 迁移附录）。
- 开发者工具增量编译不可靠再次确认：本轮采用「关窗→删 WeappCompileCache→删 dist→全新构建→重开」流程保证加载最新产物。
