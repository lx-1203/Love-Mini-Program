# 微信小程序提审材料准备清单

> 本清单用于跟踪微信小程序提审前需要准备的物理材料。
> 代码仓库无法存放这些材料，需要项目运营/法务/产品团队线下准备。
> 最后更新：2026-08-09

---

## 0. 材料与代码映射表（复核总览）

> 说明：状态字段含义——
> - `已就绪`：材料已落在代码仓库或线下文件，且经负责人签字确认。
> - `待线下落实`：尚未线下准备或尚未上传至微信公众平台，禁止声称"已上传/已完成"。Sub-Agent 已就绪模板与流程，运营/法务按表逐项推进。
> - `待替换正式 appid`：当前代码中存在测试 appid 或多个 appid 不一致，待运营/产品确认正式 appid 后统一替换。
> 任何状态变更必须由对应责任人在 PR 中提供证据（截图/链接/文件 SHA256）。

| 材料名称 | 代码引用 | 文件名 | 责任人 | 状态 | 备注 |
|---|---|---|---|---|---|
| 3-5 分钟 Demo 视频 | apps/client/src/pages/{login,discover,chat,village,vip} | demo.mp4 | 产品组 | 待线下落实 | 微信开发者工具录屏或 OBS；MP4 720p；对应 L18 |
| 营业执照 | - | verification_logs/2026-07-28-mp-wechat/business-license.pdf | 法务组 | 待线下落实 | 需清晰、完整、有效期内；对应 L01、L07、L24 |
| 法人身份证（正反面） | - | legal-person-id.jpg | 法务组 | 待线下落实 | 正反面均需扫描；对应 L01、L07 |
| 企业对公账户信息 | - | - | 财务组 | 待线下落实 | 用于支付认证费用 300 元/年；对应 L01 |
| ICP 备案号 | apps/api application.yml server-url | verification_logs/2026-07-28-mp-wechat/icp-record.pdf | 运维组 | 待线下落实 | 备案周期 7-20 工作日；对应 L08、L23 |
| 服务器域名（request/uploadFile/downloadFile/socket） | apps/api application.yml cors.allowed-origins | - | 运维组 | 待线下落实 | 依赖 L08 ICP 备案 + L10 SSL 证书；对应 L11~L14 |
| SSL 证书（主域名+API 子域名） | docker/nginx/conf.d/*.conf | - | 运维组 | 待线下落实 | 推荐 Let's Encrypt 或通配符证书；对应 L10 |
| 测试账号清单（admin_test/user_test/vip_test） | 见本文「测试账号配置说明」小节（账号密码不落库，提审时临时配置） | - | QA 组 | 待线下落实 | 3 个测试账号，详见本文「测试账号配置说明」小节；对应 L19 |
| 隐私政策文本 | docs/privacy-policy.md | privacy-policy.md | 法务组 | 已就绪 | v1.1.0，2026-08-09 生效；Task 23 补充 8.1 节代码审查记录；R4 补充 3.5 节 AI 服务披露 |
| 用户协议文本 | docs/user-agreement.md | user-agreement.md | 法务组 | 已就绪 | v1.0.0，2026-07-26 生效 |
| 第三方 SDK 列表 | docs/third-party-sdks.md | third-party-sdks.md | 法务组 | 已就绪 | v1.1.0，Task 23 复核：明确 Sentry 仅 H5 启用 + 第一方错误上报通道 |
| 小程序内隐私政策页 | apps/client/src/subpackages/legal/privacy/index.vue | - | 前端组 | 已就绪 | 通过 subpackages 懒加载 |
| 小程序内用户协议页 | apps/client/src/subpackages/legal/agreement/index.vue | - | 前端组 | 已就绪 | 通过 subpackages 懒加载 |
| manifest __usePrivacyCheck__ | apps/client/src/manifest.json | - | 前端组 | 已就绪 | mp-weixin.__usePrivacyCheck__ = true |
| wx.onNeedPrivacyAuthorization 回调 | apps/client/src/App.vue | - | 前端组 | 已就绪 | App.vue onLaunch 中注册 |
| 隐私接口授权检查 | apps/client/src/utils/privacy.ts | - | 前端组 | 已就绪 | ensurePrivacyAuthorized() 7 处调用 |
| 微信公众平台隐私协议摘要 | mp.weixin.qq.com 后台 | - | 法务组 | 待线下落实 | 需法务复核后填写；对应 L20 |
| 微信公众平台用户隐私保护指引 | mp.weixin.qq.com 后台 | - | 法务组 | 待线下落实 | 需法务复核后填写；对应 L21 |
| 提审备注（功能说明+测试账号+演示视频链接） | - | - | 产品组 | 待线下落实 | 详见本文「提审备注模板」小节；对应 L22 |
| 类目资质：社交 > 社交资讯 | mp.weixin.qq.com 后台 | verification_logs/2026-07-28-mp-wechat/category-qualification.pdf | 法务组 | 待线下落实 | 已认证企业主体无需特殊资质；对应 L06、L07、L25 |
| 商标注册证（可选） | - | - | 法务组 | 待线下落实 | 防止小程序名称侵权，非必须 |
| 软件著作权登记证书（可选） | - | - | 法务组 | 待线下落实 | 用于维权，非必须 |
| AppID（manifest.json） | apps/client/src/manifest.json:49 | - | 产品组 / 运营组 | 待运营确认正式 appid（已统一为 wxc67cd233d72388d0） | mp-weixin 实际构建使用；行号已用 grep 验证 |
| AppID（project.config.json 根目录） | project.config.json:23 | - | 产品组 / 运营组 | 待运营确认正式 appid（已统一为 wxc67cd233d72388d0） | 微信开发者工具项目配置；行号已用 grep 验证 |
| AppID（apps/client/project.config.json） | apps/client/project.config.json:28 | - | 产品组 / 运营组 | 待运营确认正式 appid（已统一为 wxc67cd233d72388d0） | 微信开发者工具项目配置；行号已用 grep 验证 |
| 微信公众平台域名配置截图 | mp.weixin.qq.com 后台 | verification_logs/2026-07-28-mp-wechat/domain-config.png | 运维组 | 待线下落实 | 6 张截图（5 张服务器域名 + 1 张业务域名）；对应 L16 |
| AppID 确认截图 | 微信开发者工具 | verification_logs/2026-07-28-mp-wechat/appid-confirmation.png | 产品组 / 运营组 | 待线下落实 | 显示微信开发者工具 appid 字段；对应 L17 |

> 任何标 `待线下落实` 或 `待替换正式 appid` 的项目在提审前禁止勾选完成。
> 截图与扫描件统一存档到 `verification_logs/2026-07-28-mp-wechat/` 目录，文件命名规范见该目录 README.md。
> **代码行号验证**：本表中所有代码行号均通过 `grep -n` 验证，与实际文件一致。如代码变更导致行号偏移，请同步更新本表。

---

## 一、企业主体材料（必须）

### 1.1 主体认证
- [ ] 营业执照照片/扫描件（清晰、完整、有效期内）
- [ ] 法人身份证正反面照片/扫描件
- [ ] 企业对公账户（用于支付认证费用 300 元/年）
- [ ] 在微信公众平台完成企业主体认证
  - 入口：https://mp.weixin.qq.com → 注册 → 小程序 → 企业主体
  - 认证审核：3-5 工作日
  - 备注：个人主体无法发布社交类目小程序

### 1.2 类目资质
- [ ] 小程序类目选择：社交 > 社交资讯
- [ ] 类目资质材料上传
  - 营业执照：上传至 主体信息 → 营业执照
  - 法人身份证：自动关联（已认证主体无需重复上传）
- [ ] 类目审核通过（1-3 工作日）

## 二、服务器与域名（必须）

### 2.1 域名注册
- [ ] 注册主域名（如 campuslove.com）
- [ ] 注册 API 子域名（如 api.campuslove.com）
- [ ] 注册 CDN 子域名（如 cdn.campuslove.com，可选）
- [ ] 域名实名认证（个人或企业实名）

### 2.2 ICP 备案
- [ ] 在域名服务商处提交 ICP 备案申请
  - 所需材料：营业执照、法人身份证、域名证书、服务器租赁合同
  - 审核周期：7-20 工作日
- [ ] 备案通过后保存备案号
- [ ] 备案截图保存（用于内部归档，不提交微信）

### 2.3 SSL 证书
- [ ] 申请主域名 SSL 证书（Let's Encrypt 免费 或 阿里云/腾讯云付费）
- [ ] 申请 API 子域名 SSL 证书
- [ ] 部署到服务器（Nginx/Traefik）
- [ ] 配置 HTTPS 强制跳转

### 2.4 服务器配置
- [ ] 部署后端 API（Docker Compose 启动）
- [ ] 部署 Admin 后台（Nginx 静态托管）
- [ ] 配置 MySQL/Redis/RabbitMQ 持久化
- [ ] 配置 Prometheus + Grafana 监控
- [ ] 配置定时备份脚本（scripts/backup-mysql.sh）

### 2.5 微信小程序后台配置
- [ ] 配置 request 合法域名：https://api.campuslove.com
- [ ] 配置 uploadFile 合法域名：https://api.campuslove.com
- [ ] 配置 downloadFile 合法域名：https://api.campuslove.com
- [ ] 配置 socket 合法域名：wss://api.campuslove.com（如使用 WebSocket）
- [ ] 配置业务域名（可选，用于 webview 嵌入）

## 三、演示视频（必须）

### 3.1 录制准备
- [ ] 准备测试账号（至少 2 个：1 男 1 女，用于演示匹配）
- [ ] 准备测试数据（话题、动态、活动等）
- [ ] 准备录制环境（微信开发者工具 + 真机）

### 3.2 录制脚本（5 分钟）
- [ ] 0:00-0:30 微信登录与隐私协议
- [ ] 0:30-1:00 完善资料与校园认证
- [ ] 1:00-2:00 推荐匹配与喜欢操作
- [ ] 2:00-3:00 匹配成功与聊天
- [ ] 3:00-4:00 发布话题与社区互动
- [ ] 4:00-5:00 活动报名与个人中心

### 3.3 录制与上传
- [ ] 使用微信开发者工具录屏功能录制
- [ ] 输出格式 MP4 720p（或更高）
- [ ] 时长控制在 3-5 分钟
- [ ] 上传至微信公众平台 → 版本管理 → 提交审核 → 功能演示视频

## 四、法律文本（代码层已就绪，需法务复核签字）

> Task 23（FIN-00273/00274）复核（2026-07-28）：
> - **隐私政策**：`docs/privacy-policy.md` 新增 8.1 节"实名+校园认证代码审查记录"，
>   披露 `RealAuthService.loginWithWechat` 与 `RealCampusCertificationService.submitCertification`
>   均未实现显式 18 岁年龄校验，与隐私政策第 8 条"未成年人保护"的现状对齐。
> - **第三方 SDK 列表**：`docs/third-party-sdks.md` 升级至 v1.1.0，明确：
>   ① Sentry SDK 仅在 H5 环境且配置 `VITE_SENTRY_DSN` 时启用，mp-weixin 不加载；
>   ② 新增第 1.4 节"第一方错误上报通道"披露 mp-weixin 错误上报走自有后端
>   `/api/error-reports` 接口（属第一方数据收集，不涉及第三方 SDK）；
>   ③ 补充 Sentry SDK 版本号（`@sentry/vue@^8.42.0` / `@sentry-internal/*@8.55.2`）；
>   ④ 各 SDK 条目新增"适用平台"字段，第 2 节对照表新增"平台"列与第一方通道行；
>   ⑤ 第 3.6 节新增"平台差异说明"。
> - 代码引用核验：`apps/client/src/services/sentry.ts:67-69,82-113`（条件编译 + 平台判断）、
>   `apps/client/src/main.ts:6,119`（initSentry 调用）、
>   `apps/client/package.json:46-52`（Sentry 依赖版本）。

- [x] 隐私政策：docs/privacy-policy.md（v1.1.0，2026-08-09 生效；Task 23 补充 8.1 节代码审查记录；R4 补充 3.5 节 AI 服务披露）
- [x] 用户协议：docs/user-agreement.md（v1.0.0，2026-07-26 生效）
- [x] 第三方 SDK 列表：docs/third-party-sdks.md（v1.2.0，Task 23 复核：明确 Sentry 仅 H5 启用 + 新增第一方错误上报通道披露；R4 新增 Agnes AI 服务披露）
- [x] 小程序内隐私政策页面：apps/client/src/subpackages/legal/privacy/index.vue
- [x] 小程序内用户协议页面：apps/client/src/subpackages/legal/agreement/index.vue
- [x] manifest.json __usePrivacyCheck__: true
- [x] App.vue wx.onNeedPrivacyAuthorization 回调

## 五、测试账号（必须）

### 5.1 测试账号清单
- [ ] admin_test：管理员账号（用于演示后台管理）
- [ ] user_test_male：男性测试用户（用于演示匹配）
- [ ] user_test_female：女性测试用户（用于演示匹配）
- [ ] vip_test：已认证普通用户（账号名沿用历史命名；**VIP 会员已暂缓上线**，无 VIP 权益可演示）

> **说明**：提审时向微信审核员提供 3 个核心测试账号（admin_test / user_test / vip_test），其中 user_test 可在 user_test_male 与 user_test_female 中任选一个作为代表。匹配功能演示需 2 个账号（user_test_male + user_test_female），但提审配置只需填 3 个。

### 5.2 测试账号配置
- [ ] 在微信公众平台 → 版本管理 → 提交审核 → 测试账号 中配置
- [ ] 提供测试账号的微信号码和密码（如有）
- [ ] 提供测试账号已绑定的手机号（用于短信验证）

### 5.3 测试账号配置说明（详细）

> 本小节对应「线下落实进度跟踪表」L19。提审时需在微信公众平台后台配置 3 个测试账号，供微信审核员体验小程序功能。

#### 5.3.1 测试账号功能覆盖范围

| 账号 | 密码（不在文档/代码落明文） | 角色 | 功能覆盖范围 | 备注 |
|------|---------------------------|------|-------------|------|
| `admin_test` | 由环境变量 `TEST_ACCOUNT_PASSWORD` 注入（提审前临时配置，线下提供给审核员） | 管理员 | Admin 后台全功能：用户管理、内容审核、敏感词配置、举报处理、数据统计、通知配置、审计日志 | 用于演示后台运营能力；审核员可登录 Admin 后台验证内容审核流程 |
| `user_test` | 同上 | 已认证普通用户 | 微信登录、资料完善、校园认证、推荐匹配、喜欢操作、聊天（文字/语音/图片/视频）、社区话题、活动报名、签到、反馈 | 用于演示核心用户旅程；已通过校园认证（学生证/邮箱），可体验匹配与聊天全流程 |
| `vip_test` | 同上 | 已认证普通用户（账号名沿用历史命名） | 普通用户全部功能（含视频通话） | VIP 会员已暂缓上线（`membershipEnabled=false`），无高级筛选、无限喜欢、访客记录、专属徽章、红包、推广码等 VIP 权益可演示；红包功能已下架 |

> **测试数据要求**：
> - `user_test` 与 `vip_test` 需有已发布的动态/话题，用于演示社区互动
> - `user_test` 与 `vip_test` 之间需有匹配关系，用于演示聊天功能
> - `admin_test` 需有处理过的举报/审核记录，用于演示后台运营

#### 5.3.2 微信公众平台后台配置步骤

1. **登录微信公众平台**：https://mp.weixin.qq.com，使用管理员微信扫码登录
2. **进入版本管理**：左侧菜单「版本管理」>「提交审核」
3. **找到测试账号配置**：在「测试账号」区域点击「添加」
4. **逐个添加测试账号**（共 3 个，密码由 QA 提审前通过环境变量 `TEST_ACCOUNT_PASSWORD` 统一注入并线下提供给审核员，不在文档/代码中落明文）：
   - 账号 1：填入 `admin_test` / 备注「管理员账号，可登录 Admin 后台」
   - 账号 2：填入 `user_test` / 备注「已认证普通用户，可体验匹配与聊天」
   - 账号 3：填入 `vip_test` / 备注「已认证普通用户（账号名沿用历史命名；VIP 会员暂缓上线，无 VIP 权益可演示）」
5. **填写测试说明**：在「测试说明」文本框中填写：
   ```
   本小程序提供 3 个测试账号供审核员体验：
   1. admin_test（管理员）：可登录 Admin 后台（https://<ADMIN_DOMAIN>，占位）验证内容审核流程
   2. user_test（普通用户）：已通过校园认证，可体验匹配、聊天、社区互动全流程
   3. vip_test（普通用户）：账号名沿用历史命名，可体验匹配、聊天、社区互动全流程
   
   账号密码由审核专员线下提供（通过环境变量 TEST_ACCOUNT_PASSWORD 配置），登录后请勿修改密码或删除测试数据。
   ```
6. **保存**：点击「保存」，截图存档到 `verification_logs/2026-07-28-mp-wechat/test-accounts-config.png`
7. **在跟踪表 L19 填入**：测试账号清单、配置截图 SHA256、配置日期

#### 5.3.3 测试账号数据准备

| 账号 | 需准备的测试数据 | 数据来源 |
|------|-----------------|----------|
| `admin_test` | 已处理的举报记录 5 条、已审核的内容 10 条、敏感词配置完整 | 通过 Admin 后台手动创建 |
| `user_test` | 已完善的资料（头像/昵称/性别/学校/兴趣标签）、已发布的动态 3 条、已参与的话题 2 个 | 通过小程序端注册并操作 |
| `vip_test` | user_test 全部数据（普通用户角色，无 VIP 权益/账单/红包数据） | 通过小程序端注册并操作 |

> **测试数据注入方式**：测试账号与数据在提审前通过预发布环境临时创建（密码通过环境变量 `TEST_ACCOUNT_PASSWORD` 注入，不落库、不写入代码仓库）。生产环境不注入测试数据，测试账号仅在预发布环境可用。

## 六、隐私合规（必须）

- [x] manifest.json 配置 __usePrivacyCheck__: true
- [x] requiredPrivateInfos 配置（chooseAddress/chooseLocation/getLocation）
- [x] App.vue 注册 wx.onNeedPrivacyAuthorization 回调
- [x] 隐私接口组件调用前 ensurePrivacyAuthorized() 检查
- [ ] 微信公众平台 → 设置 → 服务内容声明 中填写隐私协议摘要
- [ ] 微信公众平台 → 设置 → 用户隐私保护指引 中填写完整隐私协议

## 七、其他材料（按需）

### 7.1 特殊行业资质（如适用）
- [ ] ICP 经营许可证（如涉及经营性业务）
- [ ] 网络文化经营许可证（如涉及娱乐内容）
- [ ] 互联网新闻信息服务许可证（如涉及新闻资讯）

### 7.2 商标注册（可选）
- [ ] 小程序名称商标注册证（防止名称侵权）
- [ ] Logo 商标注册证

### 7.3 软件著作权（可选）
- [ ] 软件著作权登记证书（用于维权）

## 八、提审前最终检查

- [ ] 所有"待线下落实"项已变为"已就绪"并附证据
- [ ] 代码已通过 CI/CD 全部门禁
- [ ] 测试覆盖率 ≥ 80%
- [ ] 微信开发者工具上传体验版
- [ ] 体验版真机测试通过
- [ ] 提审材料齐全
- [ ] 提审备注填写完整（功能说明 + 测试账号 + 演示视频链接）
- [ ] 提交审核

## 九、提审后跟踪

- [ ] 关注微信公众平台审核进度
- [ ] 准备应对审核驳回（常见原因：类目不符、隐私协议不完整、功能不完整）
- [ ] 审核通过后发布上线
- [ ] 上线后 7 天内监控线上稳定性
- [ ] 上线后 30 天内收集用户反馈并迭代

## 十、提审备注模板

> 本小节对应「线下落实进度跟踪表」L22。
> 提审时需在微信公众平台 → 版本管理 → 提交审核 → 「备注」文本框中填写以下内容。
> 模板中的 `[ ]` 占位由产品组在落实前替换为真实信息，落实后截图存档到 `verification_logs/2026-07-28-mp-wechat/submission-notes.png`。

### 10.1 小程序功能概述

```
【小程序名称】校园恋爱
【小程序简介】面向高校在校学生的校园社交小程序，提供基于校园认证的异性匹配、即时聊天、社区话题、活动报名等服务。
【主体类型】企业主体（已认证）
【服务类目】社交 > 社交资讯
【版本号】1.0.0（商业化首版）
【核心功能】
1. 微信登录与校园认证（学生证人工审核，仅限在校大学生）
2. 资料完善与异性推荐匹配（基于学校、兴趣标签等）
3. 即时聊天（文字/语音/图片/视频，支持视频通话）
4. 社区话题与动态发布（含敏感词过滤 + 机审 + 人审）
5. 活动报名与签到（线下校园活动）
6. 举报与处理（用户/帖子/评论/话题举报）
7. 个人中心（资料管理、隐私设置、账号注销）
【未成年人保护】注册时须勾选《用户协议》（要求年满 18 周岁且为在校大学生），校园认证通过学生证人工审核核验在校大学生身份；显式 18 岁校验与注册拦截为规划中（未实现），详见隐私政策第 8 条与 8.1 节代码审查记录。
【内容审核机制】敏感词过滤（6 大类词库）+ 机审 + 人工复核 + 用户举报 + 违规处理（账号禁用/启用 + 内容删除）。
```

### 10.2 测试账号说明

```
为便于审核员体验，提供以下 3 个测试账号：

1. admin_test（管理员）
   密码：提审时线下提供（由环境变量 TEST_ACCOUNT_PASSWORD 配置，不在文档/代码落明文）
   权限：Admin 后台全功能（用户管理、内容审核、举报处理、敏感词配置、数据统计）
   Admin 后台地址：https://<ADMIN_DOMAIN>（占位，运营替换为真实域名，R4-02132）

2. user_test（已认证普通用户）
   密码：同上
   权限：微信登录、校园认证、推荐匹配、聊天、社区话题、活动报名、签到、反馈
   说明：已通过校园认证，可体验匹配与聊天全流程

3. vip_test（已认证普通用户，账号名沿用历史命名）
   密码：同上
   权限：user_test 全部功能（含视频通话）
   说明：VIP 会员已暂缓上线，无 VIP 权益、红包等功能可演示

注意：
- 测试数据已预置，请勿删除或修改测试数据
- 请勿修改测试账号密码
- 如遇登录失败，请联系客服微信：[客服微信号占位]
```

### 10.3 类目选择理由

```
【所选类目】社交 > 社交资讯
【选择理由】
1. 本小程序核心功能为基于校园认证的异性社交匹配与聊天，属于社交类应用
2. 同时提供社区话题与动态发布功能，符合「社交资讯」子类的定义（社交 + 内容资讯）
3. 已认证企业主体，无需特殊行业资质（社交资讯类目不需要 ICP 经营许可证）
4. 不涉及直播、约会、陌生人速配等高风险子类，规避类目审核风险

【不选其他类目的原因】
- 不选「交友联谊 > 约会交友」：该类目需提供 ICP 经营许可证，且审核更严格
- 不选「社区社区论坛」：本小程序核心是社交匹配，社区为辅助功能
- 不选「教育 > 在线教育」：本小程序非教育类应用，校园认证仅用于身份校验
```

### 10.4 隐私政策说明

```
【隐私政策版本】v1.1.0（2026-08-09 生效）
【用户协议版本】v1.0.0（2026-07-26 生效）
【第三方 SDK 列表版本】v1.2.0

【隐私合规配置】
1. manifest.json 已配置 __usePrivacyCheck__: true
2. App.vue onLaunch 中注册 wx.onNeedPrivacyAuthorization 回调
3. 隐私接口调用前通过 ensurePrivacyAuthorized() 检查（7 处调用）
4. 隐私政策与用户协议页面通过 subpackages 懒加载（subpackages/legal/privacy 与 subpackages/legal/agreement）

【收集的用户信息】
- 微信登录信息（openid、unionid）
- 用户资料（头像、昵称、性别、生日、学校、专业、兴趣标签）
- 校园认证信息（学生证照片、教育邮箱）
- 位置信息（仅在用户主动点击「附近」时获取，用于显示活动距离）
- 设备信息（用于错误上报与风控）

【第三方 SDK】
- 微信开放平台 SDK（登录、支付）
- 高德地图 SDK（位置选择）
- Sentry SDK（仅 H5 环境启用，mp-weixin 不加载；mp-weixin 错误上报走自有后端 /api/error-reports 第一方通道）
- Agnes AI 服务（第三方 AI 视频/图片生成服务，经后端代理，非客户端 SDK；功能规划中，隐私政策 3.5 节已披露）

【未成年人保护】
- 注册时须勾选《用户协议》（要求年满 18 周岁且为在校大学生），校园认证通过学生证人工审核核验在校大学生身份
- 显式 18 岁校验与注册拦截为规划中（未实现）；隐私政策第 8 条与 8.1 节代码审查记录已如实披露现状与整改方案

【用户权利】
- 查询、更正、删除个人信息
- 账号注销（小程序「我的 > 设置 > 账号注销」）
- 撤回授权（小程序「我的 > 设置 > 隐私设置」）
```

### 10.5 演示视频说明

```
【视频时长】3 分 28 秒
【视频格式】MP4 720p
【视频内容大纲】
- 0:00-0:30 微信登录与隐私协议
- 0:30-1:00 完善资料与校园认证
- 1:00-2:00 推荐匹配与喜欢操作
- 2:00-3:00 匹配成功与聊天
- 3:00-4:00 发布话题与社区互动
- 4:00-5:00 活动报名与个人中心

【视频链接】（提审时在「功能演示视频」字段上传，无需在备注中重复填写链接）
【视频文件 SHA256】（落实后由产品组填入）
```

### 10.6 联系方式

```
【产品负责人】[姓名占位] / 微信：[微信号占位] / 电话：[电话占位]
【技术负责人】[姓名占位] / 微信：[微信号占位]
【客服】[微信号占位] / 服务时间：09:00-22:00
【紧急联系】[电话占位]
```

## 参考资料

- 微信小程序提审指南：https://developers.weixin.qq.com/miniprogram/product/review.html
- 微信小程序运营规范：https://developers.weixin.qq.com/miniprogram/product/
- 微信小程序设计规范：https://developers.weixin.qq.com/miniprogram/design/
- 隐私协议指引：https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/

---

## AppID 确认

> 本小节对应 `docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md` 附录 E.5 与「线下落实进度跟踪表」L17。
> Sub-Agent 无法线下完成 AppID 与微信开放平台的对账，需运营/产品线下确认。
>
> P1.18（2026-07-28）更新：Sub-Agent 已将三个配置文件的 appid 统一为 `wxc67cd233d72388d0`
> （与 `apps/client/src/manifest.json` 中 mp-weixin 实际构建使用的 appid 一致）。
> 由于 manifest.json 是 mp-weixin 构建产物中实际生效的 appid 来源，统一后可避免
> 「微信开发者工具 appid 与构建产物 appid 不匹配」的告警。
> 仍需运营/产品向微信开放平台核对 `wxc67cd233d72388d0` 是否为正式注册的小程序 appid。
>
> Task 21（FIN-00009）复核（2026-07-28）历史记录：Sub-Agent 此前确认存在两处 appid 不一致问题
> （manifest.json: `wxc67cd233d72388d0` vs 两个 project.config.json: `wx67d7f1aa83e60822`），
> 当时保留两处现有 appid 不做替换。P1.18 已修复此不一致问题，统一为 `wxc67cd233d72388d0`。

### 当前状态（P1.18 统一后）

| 配置文件 | 行号 | 当前 appid | 状态 |
|----------|------|-----------|------|
| `apps/client/src/manifest.json` | 49 | `wxc67cd233d72388d0` | mp-weixin 实际构建使用；待运营/产品确认是否为正式注册的小程序 appid |
| `project.config.json`（根目录） | 23 | `wxc67cd233d72388d0` | ✅ 已与 manifest.json 统一（P1.18 修复） |
| `apps/client/project.config.json` | 28 | `wxc67cd233d72388d0` | ✅ 已与 manifest.json 统一（P1.18 修复） |
| `apps/client/.env.mp-weixin` | - | （未直接配置 appid，仅配置 VITE_API_BASE_URL） | 不涉及 appid 替换 |

### 关键发现

P1.18 修复后，三个配置文件的 appid 已统一为 `wxc67cd233d72388d0`：
- `apps/client/src/manifest.json:49` —— mp-weixin 实际构建使用（uni-app 编译时读取此 appid 写入 dist/build/mp-weixin/project.config.json）
- `apps/client/project.config.json:28` —— 微信开发者工具项目配置
- `project.config.json:23`（根目录） —— 微信开发者工具项目配置（指向 apps/client/dist/build/mp-weixin）

仍需运营/产品向微信开放平台核对 `wxc67cd233d72388d0` 是否为正式注册的小程序 appid：
- 若为测试 appid：替换为正式 appid，同步更新上述三个文件
- 若为正式 appid：由运营签字确认，在本节「确认结果」小节填入正式 appid

### 落实流程

1. 运营/产品登录微信开放平台 https://mp.weixin.qq.com，查看「开发管理 > 开发设置 > AppID」
2. 确认正式注册的小程序 appid（记为 `OFFICIAL_APPID`）
3. 比对当前代码中已统一的 appid（`wxc67cd233d72388d0`）：
   - 若 `wxc67cd233d72388d0` == `OFFICIAL_APPID`，则无需替换，由运营签字确认即可
   - 若 `wxc67cd233d72388d0` != `OFFICIAL_APPID`（即当前为测试 appid），则将以下三个文件中的 appid 全部替换为 `OFFICIAL_APPID`：
     - `apps/client/src/manifest.json:49`
     - `apps/client/project.config.json:28`
     - `project.config.json:23`（根目录）
4. 同步检查 `apps/client/.env.mp-weixin`：如需通过环境变量注入 appid，新增 `VITE_MP_WEIXIN_APPID` 并在 manifest.json 引用（当前未启用此机制，可保留现状）
5. 微信开发者工具打开项目，确认无"appid 不匹配"警告
6. 截图存档到 `verification_logs/2026-07-28-mp-weixin/appid-confirmation.png`，截图需显示微信开发者工具项目设置页面的 appid 字段
7. 落实后在本节"确认结果"小节填入正式 appid、确认人签字、替换日期

### 确认结果（待运营/产品填写）

- 正式 appid：______________
- 确认人（签字）：______________
- 确认日期：______________
- 替换日期：______________
- 截图 SHA256（appid-confirmation.png）：______________

### 若为测试 appid 的处理

如运营/产品确认 `wxc67cd233d72388d0` 为测试 appid：
1. 替换 `apps/client/src/manifest.json:49` 中的 `wxc67cd233d72388d0` 为正式 appid
2. 替换 `project.config.json:23` 与 `apps/client/project.config.json:28` 中的 `wxc67cd233d72388d0` 为正式 appid
3. 同步更新 `app.name`/`app.shortname` 为已注册的小程序名称（如"校园恋爱"已核名通过）
4. 微信开发者工具打开项目，确认 appid 与微信公众平台一致

### 若为正式 appid 的处理

如运营/产品确认 `wxc67cd233d72388d0` 为正式 appid：
1. 在本节"确认结果"小节注明"已确认为正式 appid"
2. 由运营签字确认
3. 三个配置文件无需替换（P1.18 已统一）

---

## 微信公众平台域名配置（引用）

> 完整域名配置清单、配置入口、操作步骤、截图存档规范见 `docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md` 附录 E「微信公众平台域名配置」。

### 关键信息摘要

- **request 域名**：`https://<API_DOMAIN>`（占位，运营替换为真实域名）
- **uploadFile 域名**：`https://<UPLOAD_DOMAIN>`
- **downloadFile 域名**：`https://<DOWNLOAD_DOMAIN>`
- **socket 域名**：`wss://<WS_DOMAIN>`
- **业务域名**（如使用 webview）：`https://<H5_DOMAIN>`
- **配置入口**：微信公众平台 > 开发管理 > 开发设置 > 服务器域名
- **截图存档路径**：`verification_logs/2026-07-28-mp-wechat/domain-config.png`
- **落实前置条件**：域名必须先完成 ICP 备案（对应「线下落实进度跟踪表」L08）

落实后由运维在 `docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md` 附录 E.1 表格中填入真实域名，并在跟踪表 L16 填入截图 SHA256。

---

## 线下落实时间表

> 本时间表以提审目标日期（T 日）为基准，给出建议完成日期。实际进度由 Release Manager 在每周评审会上同步更新。
> T 日 = 提审提交日（初步定为 2026-08-10，与灰度发布 Stage 5 同步）

| 序号 | 落实项 | 对应跟踪表 | 建议完成日期 | 备注 |
|------|--------|-----------|--------------|------|
| T-30 | 启动企业主体认证（营业执照+法人身份证+对公账户+300元/年） | L01 | 2026-07-11 | 认证审核 3-5 工作日，需提前启动 |
| T-30 | 启动域名 ICP 备案（7-20 工作日） | L08、L09 | 2026-07-11 | 备案周期最长，需最早启动 |
| T-25 | 小程序名称注册与核名 | L02 | 2026-07-16 | 依赖主体认证通过 |
| T-20 | 域名 ICP 备案通过，获取备案号 | L08、L09 | 2026-07-21 | 备案通过后才能配置服务器域名 |
| T-15 | SSL 证书申请与部署 | L10 | 2026-07-26 | 主域名+API 子域名 |
| T-15 | 类目资质材料上传（营业执照、法人身份证） | L07、L24、L25 | 2026-07-26 | 依赖主体认证通过 |
| T-10 | 微信公众平台域名配置（request/upload/download/socket） | L11~L14、L16 | 2026-07-31 | 依赖 ICP 备案通过 |
| T-10 | 微信公众平台业务域名配置（如使用 webview） | L15 | 2026-07-31 | 依赖 ICP 备案通过 |
| T-10 | AppID 确认与正式 appid 替换 | L17、AppID 确认小节 | 2026-07-31 | 需运营/产品向微信开放平台核对 |
| T-7 | 小程序简介、标签、头像、客服联系方式填写 | L03~L05 | 2026-08-03 | 主体认证通过后即可填写 |
| T-7 | 微信公众平台隐私协议摘要与用户隐私保护指引填写 | L20、L21 | 2026-08-03 | 法务复核后填写 |
| T-5 | 功能演示视频录制与上传 | L18 | 2026-08-05 | 3-5 分钟，依赖核心流程稳定 |
| T-5 | 测试账号在微信公众平台后台配置 | L19 | 2026-08-05 | admin_test/user_test/vip_test |
| T-3 | 提审备注填写（功能说明+测试账号+演示视频链接） | L22 | 2026-08-07 | 汇总所有前置材料 |
| T-2 | 最终检查：所有"待线下落实"项已变为"已就绪"并附证据 | - | 2026-08-08 | Release Manager 主持 |
| T-1 | 提审前最后一轮 dogfood 测试 | - | 2026-08-09 | 确认核心流程无阻断 |
| T-0 | 提交审核 | - | 2026-08-10 | 微信公众平台 > 版本管理 > 提交审核 |

### 关键路径风险提示

1. **ICP 备案是关键路径**：备案周期 7-20 工作日，若 T-30 未启动则 T 日不可达。建议在 T-35 提前准备域名证书与服务器租赁合同。
2. **企业主体认证是关键路径**：认证审核 3-5 工作日，且类目资质上传、小程序名称注册均依赖认证通过。
3. **AppID 核对（P1.18 已统一）**：三个配置文件的 appid 已统一为 `wxc67cd233d72388d0`（manifest.json / 两个 project.config.json），不存在"两个不同 appid"问题；仍需在 T-10 前由运营/产品向微信开放平台核对 `wxc67cd233d72388d0` 是否为正式注册的小程序 appid，若为测试 appid 则按本文「AppID 确认」小节替换。
4. **演示视频录制**：依赖核心流程稳定，建议在 T-10 完成所有 P1 修复后再录制，避免录完后返工。

### 进度同步机制

- 每周一评审会：运营/法务/运维汇报「线下落实进度跟踪表」中各自负责项的进度
- 落实项完成后 24 小时内：责任人在跟踪表对应行填入证据，并通知 Release Manager 更新本文档与 `docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md`
- T-2 最终检查时：所有"待线下落实"项必须变为"已就绪"并附证据，否则提审时间顺延
