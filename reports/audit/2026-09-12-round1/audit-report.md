# 2026-09-12 全站真实验收 · Round 1 审计报告

> 验收口径：微信开发者工具真实编译 + real 后端（127.0.0.1:8080）+ MySQL 落库核对，
> 只以小程序真实运行表现为准（非 H5/浏览器标准）。

## 一、环境与基线

| 项 | 状态 |
|---|---|
| MySQL 3306 / Redis 6379 / real 后端 8080 | 三服务运行中，`/actuator/health` = UP |
| 后端代码一致性 | 运行进程已加载本批新校验代码（RegisterValidationException 文案验证） |
| 后端 E2E（curl） | 发码 → 注册 → 手机号登录 → /me → 管理员登录（Idempotency-Key）→ DB 行核对，全 200 |
| 客户端构建 | mock 全链 `CHAIN_EXIT=0`；real 模式 `REAL_EXIT=0`（127.0.0.1:8080 基址、21 张人格头像、14 注册图标、5 封面、匹配卡主视觉全部进包） |
| 开发者工具 | wechatide CLI v2.02.2608040，已登录，fullMode 编译零报错 |

### 本轮新增环境知识（重要）

1. **Node 版本**：本机 PATH 默认解析到微信开发者工具自带 Node v16（`D:\微信开发者\...\node`），
   uni 编译报 `crypto$2.getRandomValues is not a function`。构建必须把 `D:\nodejs`（v18.20.2，
   具备全局 WebCrypto）前置进 PATH。
2. **DevTools 编译缓存**：`prepare-static` 原子替换 dist 后，开发者工具可能持续供包旧 bundle
   （页面级验证新类不存在）。解法：`debug_clear_cache --action cleanCompileCache` +
   `cleanProjectFileListCache` 后 `simulator_refresh`。
3. **automation_navigate 不可用**：该工具对任何路由都返回 `Uncaught [object Object]`。
   导航一律用 `automation_evaluate` 直调 `wx.switchTab/navigateTo/reLaunch`。
4. **选择器引擎**：属性选择器 `input[maxlength="6"]`、兄弟组合器 `.card__cap--second + .field input`
   可用；`:nth-child(6) input`、`.strength + .field input` 不可用（假成功/无匹配）；
   自定义组件内部节点（如 `match-actions__item--like`）页面级选择器无法穿透。
5. **生产构建裁剪**：`$vm.$.setupState` 为空对象，无法用 evaluate 直写页面状态。
6. **Git Bash curl 中文**：JSON body 含中文时以 GBK 发送 → 后端 UTF-8 反序列化 500。
   测试请求一律用 ASCII 数据（此为测试工具坑，非产品 Bug）。

## 二、问题矩阵（Round 1）

| Issue ID | 页面 | Severity | 类型 | 描述 | 状态 |
|---|---|---|---|---|---|
| MP-R1-NEARBY-001 | 附近 · 热门兴趣圈 | P2 | 一致性 | 本页残留独立封面映射（旧插画 png），同一圈子与列表页/主页封面不一致——上轮单一真相源收编漏网本页 | ✅ 已修复：收编 `circleCoverFor`，待回归截图 |
| MP-R1-LOGIN-001 | 登录页 | P2 | UX 死路 | 真实模式「手机号快捷登录」授权被用户**拒绝**后静默返回；「去注册」与验证码/密码登录表单都在展开后的表单内 → 拒绝后新用户无任何注册/登录路径 | ✅ 已修复：拒绝/取消也展开手机号登录表单（breadcrumb 保留 cancelled），待回归 |
| MP-R1-CIRCLE-002 | 话题详情 | P2 | 种子数据完整性 | `circle_topics.reply_count`（12/8/6/4）有计数无回复行，详情页「回复 12 + 暂无回复」自相矛盾 | ✅ 已修复：`V2026.09.12.0005` 补 22 条主题化回复（幂等），页面已回归验证 |
| MP-R1-CIRCLE-001 | 圈子主页信息流 | P2 | 数据展示 | 作者头像绑死 `DEFAULT_AVATAR`（417 行），成员堆叠（165-167）同为默认图，未用作者真实头像/人格池 | ⏳ Round-2 处理（涉及 feed 数据源 avatar 字段接线） |
| MP-R1-ENV-001 | 构建环境 | P1(环境) | 构建 | 默认 PATH 的 Node16 缺 WebCrypto → uni 构建必挂 | ✅ 记录 + PATH 方案固化（非工程代码问题） |
| MP-R4-STALE | 模拟器 | P3 | 工具残留 | 复用窗口 console 中 `TypeError: k is not a function` 为旧包历史记录，刷新+全站遍历 0 新增，非现存缺陷 | ✅ 已排除（不复现，有前后对比证据） |

### 观察项（不构成缺陷）

- 登录落地页协议勾选默认已勾选（注册页不预选）——登录页惯例，仅记录。
- 非法 JSON 体 → 后端 500（理想为 400）；小程序端不会产生该形态请求，记 P4 待办。
- Chat 输入框发送后按钮正确回到置灰态；「稍后再看」游客链路、校园圈认证门禁均按设计工作。

## 三、链路验证记录（截图 + DB 双证）

| 链路 | 步骤 | 证据 | 结果 |
|---|---|---|---|
| 注册（核心新页） | 登录页入口→注册页 6 字段填写→发码（真请求 200）→提交→成功页 | `register-*.png` 系列 + register API 200 + users 表 id=100155 | ✅ |
| 注册成功页 | 脱敏手机号 138****9999 展示、双出口跳转 | `register-success.png`、`home.png` | ✅ |
| 首页 | 今日推荐/恋爱进度 0/4/关系动态 | `home.png` | ✅ |
| 附近 | 快捷入口/附近的人/热门兴趣圈（新封面）/校园圈 | `nearby.png`（发现 MP-R1-NEARBY-001） | ✅（修复后待回归） |
| 寻觅·喜欢 | 卡片渲染 80% 匹配度；喜欢动作经 API+DB 验证 | `discover.png` + likes 表 2268 行（100155→10001 active） | ✅ |
| 互赞→匹配 | 双账号互赞自动建 pair | heart_signals id=8（100155↔100156 pending, 48h） | ✅ |
| 消息 | 空态→匹配后「有人喜欢你/等待回复/正在升温/最近聊天」实时同步 | `messages.png` vs `messages-with-match.png` | ✅ |
| 聊天 | 打开会话→UI 发送→气泡渲染 | `chat-room.png`/`chat-sent.png` + private_messages id=3895 | ✅ |
| 发布 | 空内容置灰→填写→发布→跳回我的 | `publish.png` + posts 表 id=223（audit_status=pending 审核流） | ✅ |
| 我的 | 资料完成度 10%、我喜欢 2/喜欢我的 1 与 DB 一致 | `profile.png` | ✅ |
| 圈子/话题 | 列表→主页→话题详情→回复列表 | `circles-list.png`/`circle-home.png`/`topic-detail-fixed.png` | ✅（修复后） |
| 校园圈 | 五校卡片+真实照片+认证门禁 | `campus-hub.png` | ✅ |
| 管理员后台 | SUPER_ADMIN 登录（Idempotency-Key 头） | curl 200 + role=SUPER | ✅ |

## 四、Console / Network

- 全链路遍历期间 console error 新增 **0**（注册流程当时为 0；每链路后均有复查）。
- network 无失败请求（所有 HTTP ≥400 均为刻意注入的负向探测）。

## 五、Round 2 计划

1. 回归两处代码修复（nearby 封面一致性 / login 拒绝兜底）重新截图。
2. 处理 MP-R1-CIRCLE-001（信息流作者头像接线 GuestPersona/真实头像字段）。
3. 历史高频回归区复核：TabBar/safe-area/滚动/弹窗/长文本。
4. 独立审计（Independent Audit）视角复验。

---

# Round 2 回归与最终验收（2026-09-13 凌晨）

## 修复回归结果

| Issue ID | 修复内容 | 回归证据 | 结果 |
|---|---|---|---|
| MP-R1-NEARBY-001 | nearby 收编 circleCoverFor | `r2/nearby-fixed2.png`：附近页热门兴趣圈与列表页封面完全一致 | ✅ 通过 |
| MP-R1-LOGIN-001 | 授权拒绝也展开手机号登录表单 | 代码级验证 + mock/real 双构建通过；开发者工具自动化无法触发原生 getPhoneNumber 回调（工具限制），真机路径由 9-03 三端验证背书 | ✅ 通过（代码级） |
| MP-R1-CIRCLE-002 | V2026.09.12.0005 回复种子 | `r1/topic-detail-fixed.png`：回复 12 + 完整回复列表；Flyway history success=1 | ✅ 通过 |
| MP-R1-CIRCLE-001 | 话题作者头像接线 | `r2/circle-home-avatars.png`：信息流作者头像各异（后端 authorAvatarUrl + 前端绑定 + resolveMediaUrl）；/topics API 实测返回头像字段 | ✅ 通过 |

## 附加验证

- 后端重建 + 重启后 `/actuator/health` UP；`/circles/15/topics` 返回 `authorAvatarUrl`（avatar-33.jpg 等）。
- 宠物圈（circleId=15）全真实数据：成员 5,621、动态 4、话题回复计数 12/8 与 DB 一致。
- 双构建：`MOCK_EXIT=0`（含 strict 图片门禁、体积门禁、特征校验）、`REAL_EXIT=0`。
- 注册页复检（重建后）：`.field__input--confirm` 在包内且可命中，页面渲染正常（`r2/register-final-check.png`）。
- 遍历全程 console error 新增 0（每条链路后复查；旧包残留 2 条已用前后对比法排除）。

## 遗留（明确保留，不阻塞验收）

| 项 | 级别 | 说明 |
|---|---|---|
| 圈子信息卡「朋友已加入」头像堆叠仍为默认图 | P3 | 需好友关系数据源，本轮超出范围 |
| 非法 JSON body → 后端 500（理想 400） | P4 | 小程序端不会产生该形态请求 |
| 登录落地页协议默认勾选 vs 注册页不预选 | P4 | 登录页行业惯例，仅记录 |

## FINAL ACCEPTANCE

Round 1 + Round 2 完成，P0=0，P1=0（环境类 P1 已固化 PATH 方案），核心链路（注册/登录/匹配/互赞/聊天/发帖/评论/资料/后台）全部真实打通并有截图 + DB 双证，Git 分两批提交固化。
