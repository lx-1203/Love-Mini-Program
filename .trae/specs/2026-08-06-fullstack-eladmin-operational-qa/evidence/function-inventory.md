# 小程序功能清点清单（Function Inventory）

> 范围：`apps/client/src/pages`（pages.json 45 个主包页面 + 4 个分包）+ 后端 `apps/api` 实际暴露端点
> 方式：读代码确认客户端页面/调用 + 实际 HTTP 走查（2026-08-06，real profile @127.0.0.1:8080）
> 状态说明：**可用** = 端到端调用成功；**未实现** = 客户端/后端无对应端点或纯静态占位；**占位** = 有入口页面无后端逻辑；**报错** = 走查中发现 4xx/5xx 异常

## 一、TabBar 主功能

| # | 功能（页面） | 客户端调用 | 后端端点 | 状态 | 备注 |
|---|---|---|---|---|---|
| 1 | 寻觅·推荐人物（pages/discover/index） | GET /recommendations | 同路径 | 可用 | 200，返回空数组（当前无候选用户，链路入口正常） |
| 2 | 寻觅·左滑/右滑/反悔（discover） | POST /matches/pass、/matches/rewind | 同路径 | 可用 | 200 |
| 3 | 圈子·村口帖子流（pages/village/index） | GET /posts | 同路径 | 可用 | 200，种子 16 条 |
| 4 | 首页（pages/home/index） | GET /home/dashboard | 同路径 | 可用 | 200 |
| 5 | 消息·聊天总览（pages/chat/index） | GET /chat/overview | 同路径 | 可用 | 200（sessions/recommendedPeople 空） |
| 6 | 我的（pages/profile/index） | GET /profile/basic、/profile/stats、/auth/me | 同路径 | 可用 | 200 |
| 7 | 登录/注册（pages/login/index） | POST /auth/register、/phone-login、/wechat-login | 同路径 | 可用 | 注册自动登录 + 手机号重登均 200 |

## 二、寻觅/匹配相关

| # | 功能 | 客户端调用 | 后端端点 | 状态 | 备注 |
|---|---|---|---|---|---|
| 8 | 喜欢（右滑）/取消喜欢 | POST /matches/like、/cancel-like | 同路径 | 可用 | 双向喜欢生成心动信号（实测 signal id=2） |
| 9 | 超级喜欢 | POST /matches/super-like | 同路径 | 可用（语义降级） | 实现与普通 like 一致（实体无 superLike 字段，代码注释明示） |
| 10 | 心动信号列表/接受/拒绝 | GET /matches/heart-signals；POST .../{id}/accept、/decline | 同路径 | 可用 | 实测 count=1，accept 200 |
| 11 | 喜欢我的人 | GET /matches/liked-me | 同路径 | 可用 | 200 |
| 12 | 我喜欢的（含"收藏"语义） | GET /matches/my-likes | 同路径 | 可用 | 200；项目无独立"收藏"端点，以 my-likes 承担 |
| 13 | 访客列表 | GET /matches/visitors | 同路径 | 可用 | 200 |
| 14 | **记录访客（被访问方产生访客）** | POST /matches/visit | 同路径 | **报错 500** | 缺陷#1：LocalDate/LocalDateTime 类型不匹配 |
| 15 | 谁看过我（pages/profile/visitors） | GET /profile/visitors | 同路径 | 可用 | 200 |
| 16 | 破冰话题 | GET /matches/{matchId}/icebreakers | 同路径 | 可用 | 200，3 条 |
| 17 | 匹配表单配置/创建匹配/快速匹配 | GET /matches/form-config；POST /matches、/matches/quick | 同路径 | 可用 | 200；quick 需带 userId（前端契约一致，契约小瑕疵见走查报告） |
| 18 | 今日已看（pages/discover/history） | GET /recommendations/history | 同路径 | 可用 | 200 |
| 19 | 讨论推荐/活动推荐 | GET /recommendations/discussions、/activities | 同路径 | 可用 | 200 |
| 20 | 推荐偏好（子包 setup/recommend-pref） | GET/PUT /recommendations/preferences | 同路径 | 可用 | 200 |

## 三、聊天相关

| # | 功能 | 客户端调用 | 后端端点 | 状态 | 备注 |
|---|---|---|---|---|---|
| 21 | 临时会话创建/消息/置顶/结束/撤回 | POST /temp-chat/sessions、/{id}/messages 等 | 同路径 | 可用 | 实测创建 session-2-30-01ecc32e，发消息 200 |
| 22 | 私信会话/发消息/已读/置顶（pages/chat-session 消息 Tab） | POST /messages/conversations、/conversations/{id}/messages、/read、/pin | 同路径 | 可用 | 实测 conv=2，msg id=2/3，未读计数正确 |
| 23 | 语音消息 | POST /chat/voice | 同路径 | 可用（校验生效） | 假文件 400"MIME 不支持"，端点存活 |
| 24 | VIP/聊天红包 | POST /vip/red-packets；GET /chat/{chatId}/red-packets | 同路径 | 可用（资金受限） | 创建红包 400 余额不足（无充值入口，见链路7）；列表查询 200 |
| 25 | 视频通话（pages/chat/video-call） | POST /chat/video-call/start、/end；GET /records | 同路径 | 可用 | 实测 RINGING→ENDED，records=1 |
| 26 | 通知列表/未读/已读 | GET /notifications、/unread-count；PUT /read-all | 同路径 | 可用 | 200 |
| 27 | 互动事件（通知增强） | GET /notifications/interactions 等 | 同路径 | 可用 | 实测 count=1 |
| 28 | **社交升温进度条（消息页/寻觅页）** | GET /growth/social-progress | **不存在** | **报错 404** | 缺陷#3：后端无该端点/Controller |

## 四、圈子/动态相关

| # | 功能 | 客户端调用 | 后端端点 | 状态 | 备注 |
|---|---|---|---|---|---|
| 29 | 发帖 | POST /posts | 同路径 | 可用 | **重点验证通过：data.id=17 非空（已修复缺陷）** |
| 30 | 帖子详情/列表 | GET /posts、/posts/{id} | 同路径 | 可用 | 200 |
| 31 | 评论/评论列表 | POST/GET /posts/{id}/comments | 同路径 | 可用 | **重点验证通过：data.id=4 非空** |
| 32 | **点赞/取消点赞（toggle）** | POST /posts/{id}/like | 同路径 | **报错（逻辑缺陷）** | 缺陷#2：True→False 后卡死在 False，无法再点赞 |
| 33 | 转发 | POST /posts/{id}/share | 同路径 | 可用 | 200 |
| 34 | 兴趣圈列表/加入退出/话题/回复 | GET /circles；POST /circles/{id}/join；GET/POST /circles/{id}/topics 等 | 同路径 | 可用 | 种子 3 圈（成员 128/96/74），200 |
| 35 | 话题标签 | GET /post-tags | 同路径 | 可用 | 种子 8 条 |
| 36 | 校园认证（pages/campus/certification） | POST /campus/certification | 同路径 | 可用 | **重点验证通过：首次 200 PENDING，重复 409 RESOURCE_CONFLICT** |
| 37 | 校园话题/回复（pages/campus/*） | GET/POST /campus/topics 等 | 同路径 | 可用 | 未绑定学校返回空页（契约一致） |
| 38 | **校园活动 Tab（campus 页）** | GET /campus/activities | **不存在** | **报错 404** | 缺陷#4：前端调用无后端端点 |
| 39 | **同校动态流** | GET /campus/feed?userId= | **后端为 /posts/campus-feed** | **报错 404** | 缺陷#5：前后端路径不一致 |
| 40 | 我的动态 | 无调用 | 无 | 未实现 | posts 列表无 tab=mine 参数，前端亦无独立入口 |

## 五、活动/成长相关

| # | 功能 | 客户端调用 | 后端端点 | 状态 | 备注 |
|---|---|---|---|---|---|
| 41 | 活动列表/详情（子包 discover/activities、pages/activities/detail） | GET /activities、/activities/{id} | 同路径 | 可用 | 种子 4 条 |
| 42 | 报名/取消报名 | POST/DELETE /activities/{id}/enroll | 同路径 | 可用 | 实测 enrolled=true |
| 43 | 每日签到/状态 | POST /check-in；GET /check-in/status | 同路径 | 可用 | 实测 consecutiveDays=1；需 Idempotency-Key |
| 44 | 补签 | POST /check-in/make-up | 同路径 | 可用 | 200（未破坏性测试） |
| 45 | 每日一问（pages/daily-question） | GET /daily-question/today；POST /answer；GET /answers | 同路径 | 可用 | 实测 id=5、answerId=1、answers total=1 |
| 46 | **积分商城/逛逛（pages/shop/index）** | 无 API 调用 | 无 | 占位 | 静态页面，无后端支撑（Task 4.10 补齐项） |
| 47 | **钱包/余额/充值** | 无调用 | 无 HTTP 端点 | 未实现 | 后端有 user_wallet/wallet_transaction_log 表与 WalletService（含 getBalance），但无 Controller 暴露；发红包因余额 0 报"余额不足"且无充值入口 |

## 六、我的/设置相关

| # | 功能 | 客户端调用 | 后端端点 | 状态 | 备注 |
|---|---|---|---|---|---|
| 48 | 基本资料编辑（子包 setup/profile） | GET/PUT /profile/basic | 同路径 | 可用 | UTF-8 中文昵称字节级往返一致（走查已验证）；性别/生日不在当前契约字段内 |
| 49 | 校园资料/课表（子包 setup/campus、schedule） | GET/PUT /profile/campus、/schedule | 同路径 | 可用 | 200 |
| 50 | 相册（pages/profile/album） | POST /profile/photos、/profile/background、/video、/half-body | 同路径 | 可用 | 实测 /media/upload 200 返回 URL（相册上传链路存活） |
| 51 | 反馈提交/历史/详情（子包 support/feedback、pages/feedback/history） | POST /feedback/issues、/suggestions、/activity-proposals；GET /feedback/my-submissions、/my-submissions/{id} | 同路径 | 可用 | 实测 id=6 status=SUBMITTED |
| 52 | 免打扰（pages/settings/dnd） | GET/PUT /dnd | 同路径 | 可用 | 实测 enabled=false→true |
| 53 | 通知中心 | GET /notifications | 同路径 | 可用 | 200 |
| 54 | 权限设置（pages/profile/privacy） | 本地开关 | — | 占位 | 本地偏好，无后端 |
| 55 | **任务中心（pages/profile/tasks）** | 无 API 调用 | 无 | 占位 | 本地静态数据（代码注释明确"后续可接入后端任务系统"，Task 4.10 补齐项） |
| 56 | 恋爱认证（pages/verification/index） | 无 API 调用 | 无 | 占位 | 静态页；资料模型有 verificationBadgeLevel 字段但无提交端点 |
| 57 | 设置页（pages/settings/index） | POST /auth/logout 等 | 同路径 | 可用 | 登出 200 |

## 七、VIP 商业化相关

| # | 功能 | 客户端调用 | 后端端点 | 状态 | 备注 |
|---|---|---|---|---|---|
| 58 | VIP 开通页（pages/vip/index） | GET /vip/auto-renew/status；POST/DELETE /vip/auto-renew | 同路径 | 可用（本地配置） | 套餐列表为客户端本地配置（config/vip-plans.ts），无套餐 API；auto-renew 状态 200 |
| 59 | 优惠码（pages/vip/promo-code） | POST /vip/promo-codes/validate、/redeem | 同路径 | 可用 | 无效码返回 400"优惠码不存在"（非 500） |
| 60 | 账单（pages/vip/bills） | GET /vip/bills | 同路径 | 可用 | 200 total=0 |
| 61 | 发红包（pages/vip/red-packet、pages/chat/red-packet） | POST /vip/red-packets | 同路径 | 可用（资金受限） | 新用户余额 0 → 400 余额不足；**支付网关未配置，无充值端点**（降级说明，非 FAIL） |
| 62 | 红包领取/详情 | POST /vip/red-packets/{id}/claim；GET /{id} | 同路径 | 可用 | 不存在红包 → 400（错误路径正确） |

## 八、恋爱中心/其他（占位内容页）

| # | 功能 | 状态 | 备注 |
|---|---|---|---|
| 63 | 恋爱中心（pages/love-center/index） | 可用（入口） | 导航页，200 展示 |
| 64 | 附近的人（pages/love-center/nearby） | 占位 | 静态内容页（content-page），无后端 |
| 65 | MBTI 人格测试（pages/love-center/mbti） | 占位 | 静态内容页，无后端 |
| 66 | 恋爱咨询课程（pages/love-center/consulting） | 占位 | 静态内容页，无后端 |
| 67 | 隐私政策/用户协议（子包 legal） | 可用 | 本地静态 + /config/legal（200） |
| 68 | 开发调试页（pages/dev/index，DEV 构建） | 可用 | 仅开发构建包含 |

## 九、未实现/占位汇总（Task 4.10 关联）

1. **任务中心**（pages/profile/tasks）：本地静态数据，无后端任务系统 → 占位
2. **积分商城/逛逛**（pages/shop/index）：静态页，无商品/积分 API → 占位
3. **钱包/余额/充值**：后端表+服务存在但无 Controller → 未实现（影响红包创建闭环）
4. **恋爱认证**（pages/verification）：静态页 → 占位
5. **我的动态**：无独立端点/入口 → 未实现
6. **附近的人 / MBTI / 恋爱咨询**：静态内容页 → 占位
7. **VIP 套餐列表**：客户端本地配置，无套餐 API；**支付网关未配置** → 降级

## 十、真实缺陷清单（详见走查报告）

| # | 缺陷 | 端点 | 严重度 |
|---|---|---|---|
| 1 | 记录访客 500（LocalDate→LocalDateTime 类型不匹配） | POST /api/v1/matches/visit | 高 |
| 2 | 点赞 toggle 卡死：取消点赞后行未删除，无法再次点赞 | POST /api/v1/posts/{id}/like | 高 |
| 3 | 社交升温进度端点缺失（前端 404） | GET /api/v1/growth/social-progress | 中 |
| 4 | 校园活动端点缺失（前端 404） | GET /api/v1/campus/activities | 中 |
| 5 | 同校动态流前后端路径不一致（前端 404） | 前端 /campus/feed vs 后端 /posts/campus-feed | 中 |
