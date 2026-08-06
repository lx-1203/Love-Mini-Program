# Admin 第二轮审查问题清单(round2)

- 来源:子代理完整审查结果 sa_20260806_012239_000000000_2d1e4b654c23(审查 D:\6\恋爱小程序\apps\admin\src,当前工作区状态含未提交修改)
- 统计(子代理原文):共 133 条:CRITICAL 3、HIGH 24、MEDIUM 57、LOW 49
- 已排除已修复项(i18n 已覆盖的模板文案、/v1/admin 路径前缀)

## 问题清单(共 133 条)

### CRITICAL / HIGH

```
admin|apps/admin/src/views/Feedback.vue|60|CRITICAL|后端 GET /api/v1/admin/feedback 返回 ApiResponse{code,message,data,traceId} 包装(FeedbackController.java:93-94),前端 listAdminFeedback 按裸数组 FeedbackRecordView[] 直接赋值,反馈页将拿到包装对象:空态判断(feedbacks.length===0)失效、v-for 遍历对象 4 个属性渲染垃圾行|反馈管理页数据解析全错、功能不可用|http 层统一解包 ApiResponse 或后端返回裸数组(与其余 admin 端点契约对齐)
admin|apps/admin/src/views/Feedback.vue|113|CRITICAL|handleConfirmProcess 调用 PUT /api/v1/admin/feedback/{id}/reply,后端 FeedbackController 无此端点(仅 GET list + POST activity-proposals/{id}/convert),必然 404|"标记已处理/回复"功能 100% 失败,反馈只能看不能处理|后端补齐 /reply 端点,或前端改用已存在端点并修正契约
admin|apps/admin/src/views/AuditLogs.vue|55|CRITICAL|日期筛选发送 `${date}T00:00:00Z`(带 Z 后缀),后端 AdminAuditLogController.parseDateTime 用 ISO_LOCAL_DATE_TIME 解析(AdminAuditLogController.java:119-130),带 Z 必抛 DateTimeParseException 并返回 null|审计日志按日期范围筛选静默失效,合规追溯能力受损|前端发送纯日期 yyyy-MM-dd(后端已兼容),或后端改用 ISO_OFFSET_DATE_TIME
admin|apps/admin/src/router/index.ts|41|HIGH|后端 AdminCertificationController 提供 GET /api/v1/admin/certifications + POST /{id}/review(校园认证审核),前端无对应路由/页面/API|认证申请积压,认证管理功能整体缺失|新增 Certifications 页面与 api/certifications.ts
admin|apps/admin/src/router/index.ts|41|HIGH|后端 AdminCommentController 提供 GET /api/v1/admin/comments + DELETE /{id},前端 api/posts.ts:124-136 已封装 listComments/deleteComment 但无任何页面消费|评论无法审核与删除,垃圾评论无法治理|新增评论管理页
admin|apps/admin/src/router/index.ts|41|HIGH|后端 AdminConfigController(configs/rules/switches 三组接口)与 api/config.ts:60-111 全部封装,但无页面/路由使用|系统参数、业务规则、功能开关完全不可管理|新增系统配置页
admin|apps/admin/src/router/index.ts|41|HIGH|后端 AdminMatchConfigController(match-config/recommend-strategy)与 api/match-config.ts:28-58 已封装,无页面使用|匹配算法/推荐策略配置不可管理|新增匹配配置页
admin|apps/admin/src/views/SensitiveWords.vue|194|HIGH|后端支持 POST /sensitive-words/batch-import(1 万条异步导入,返回 taskId),i18n 已备 importTitle/importFormatTip/importSuccess 等 key,页面无批量导入 UI|词库只能逐条新增,运营效率低|新增导入弹窗与 taskId 轮询
admin|apps/admin/src/api/http.ts|54|HIGH|JWT 明文存 localStorage(admin_token),session.ts:92-93 同步写入,任何 XSS(如评论/帖子内容注入)可窃取管理员令牌|token 泄露即账号接管,无 HttpOnly/同源保护|迁移 HttpOnly Cookie 或缩短 token 有效期+刷新机制
admin|apps/admin/src/router/guards.ts|109|HIGH|角色校验完全依赖 localStorage.admin_user(可被控制台篡改),且 super_admin 与 admin 无任何前端差异;后端所有 admin 端点仅 hasRole('ADMIN'),无超级管理员分级|普通管理员与超级管理员权限无差别,配置类操作(通知/敏感词/未来配置)无隔离,越权面|后端引入 SUPER_ADMIN 角色校验,前端按角色隐藏/禁用敏感菜单
admin|apps/admin/src/views/NotifyConfig.vue|62|HIGH|通知模板/启停配置对所有 ADMIN 无差别开放,后端 AdminNotifyConfigController 也无 SUPER_ADMIN 区分|任意普通管理员可改动全局推送模板(含营销文案),无审批与隔离|按角色分级+操作审计提示
admin|apps/admin/src/views/Users.vue|62|HIGH|"禁用自己"仅前端用可篡改的 localStorage(currentAdminId)拦截,后端 toggleUserStatus(AdminUserController.java:247)无自保护|篡改 localStorage 即可绕过,存在锁死账号风险|后端增加"禁用自己返回 400"校验
admin|apps/admin/src/api/http.ts|158|HIGH|错误消息硬编码中文(158/160/175/179/204:"请求超时，请稍后重试"等 5 处),i18n 已提供 errors.network 等 key 但未使用|en-US 语言下所有网络/超时/解析错误仍显示中文|改用全局 t() 翻译
admin|apps/admin/src/stores/session.ts|80|HIGH|登录错误消息硬编码中文(80/86/101/108/112/133 共 6 处:"用户名或密码错误"等)|en-US 下登录错误显示中文|改用 i18n key
admin|apps/admin/src/views/Feedback.vue|33|HIGH|反馈列表无分页/搜索/筛选,后端 listAdminFeedback 全量返回(RealFeedbackService.java:131-133)|反馈量大时页面渲染卡顿|后端加分页参数,前端接 Pagination
admin|apps/admin/src/views/SensitiveWords.vue|59|HIGH|敏感词列表无分页(注释自认后端支持 Pageable),全量加载渲染|词库数百条后 DOM 过大|接入分页查询
admin|apps/admin/src/views/NotifyConfig.vue|152|HIGH|类型列直接展示后端英文枚举(config.type),未映射 i18n(notifyConfig.fieldLikeNotify 等 key 已备但未用)|zh/en 下用户都看到 LIKE_NOTIFY 之类代码|增加 typeLabel 映射函数
admin|apps/admin/src/views/Users.vue|325|HIGH|后端列表返回脱敏 phone 字段但表格无手机号列;后端支持 createdAtFrom/To 时间范围筛选,前端无入口|运营无法按手机号/注册时间定位用户|补列与时间筛选
admin|apps/admin/src/views/Posts.vue|54|HIGH|后端支持 authorId 筛选,前端无作者搜索;列表不展示 auditedAt(审核时间)列;审核弹窗拒绝时 remark 非必填|审核缺上下文、无作者定位、拒绝不可追溯|补作者搜索/审核时间列/拒绝必填备注
admin|apps/admin/src/views/Reports.vue|278|HIGH|已处理/已驳回举报只显示"已处理"文字,处理备注(handleRemark)无处可看;处理弹窗 REJECT 不强制填写原因|误驳回无法追责复核|列表/详情展示 handleRemark,REJECT 必填
admin|apps/admin/src/views/Posts.vue|301|HIGH|前端审核成功/删除成功无任何成功提示(仅静默刷新列表),操作结果不可感知|运营不确定操作是否成功|加 toast 反馈
admin|apps/admin/src/views/Users.vue|190|HIGH|禁用/启用成功无 toast,仅刷新列表;失败才显示 errorMsg|同上|加成功提示
```

### MEDIUM

```
admin|apps/admin/src/views/Users.vue|284|MEDIUM|列表加载失败仅 error-banner 展示,无重试按钮(仅 Feedback 页有 retryButton)|网络抖动后需手动刷新页面|统一接入 ErrorState 组件
admin|apps/admin/src/views/Posts.vue|258|MEDIUM|同 Users:错误态无重试入口|同上|同上
admin|apps/admin/src/views/Reports.vue|240|MEDIUM|同 Users:错误态无重试入口|同上|同上
admin|apps/admin/src/views/AuditLogs.vue|198|MEDIUM|同 Users:错误态无重试入口|同上|同上
admin|apps/admin/src/views/SensitiveWords.vue|234|MEDIUM|同 Users:错误态无重试入口|同上|同上
admin|apps/admin/src/views/NotifyConfig.vue|131|MEDIUM|同 Users:错误态无重试入口|同上|同上
admin|apps/admin/src/router/index.ts|23|MEDIUM|无 404 catch-all 路由,访问未知路径渲染空白|误输 URL 无兜底页|新增 NotFound 路由与视图
admin|apps/admin/src/views/Users.vue|307|MEDIUM|无"查看详情"入口,api/users.ts:86-88 getUserDetail 定义后从未使用,i18n users.detailTitle/detailPosts 等 key 未用|无法查看用户 bio/校园/认证详情|补详情弹窗
admin|apps/admin/src/views/Posts.vue|284|MEDIUM|帖子无详情查看:无图片(detailImages key 未用)、无全文(仅 80 字预览)、无作者信息页|审核/删帖决策缺上下文|补详情弹窗
admin|apps/admin/src/views/Reports.vue|271|MEDIUM|被举报目标(targetId)纯文本,无跳转查看目标帖子/用户/评论,无证据截图展示(detailEvidence key 未用)|无法快速核实举报内容|目标链接+证据展示
admin|apps/admin/src/views/Feedback.vue|262|MEDIUM|详情弹窗仅展示 title/latestReplySummary,无完整反馈内容、附件、回复历史(detailContent/detailAttachments/detailReplyHistory key 未用)|运营看不到反馈原文|后端补齐详情端点后展示
admin|apps/admin/src/views/AuditLogs.vue|171|MEDIUM|无导出功能,i18n auditLogs.exportButton/exportSuccess/exportFailed 已备但页面无按钮|审计日志无法离线归档|加 CSV 导出
admin|apps/admin/src/views/Dashboard.vue|128|MEDIUM|无手动刷新按钮,i18n dashboard.refreshSuccess/refreshFailed/lastUpdated key 未用,数据无自动轮询|看板数据滞后,运营需刷新页面|加刷新按钮/定时刷新
admin|apps/admin/src/components/Pagination.vue|109|MEDIUM|分页文案拼接硬编码中文全角括号:`（${t("common.total",...)}）`|en-US 下显示中文括号|括号也走 i18n
admin|apps/admin/src/views/Feedback.vue|270|MEDIUM|详情标签后硬编码全角冒号"："(detailId/detailType 等 6 处)|en-US 下冒号风格不一致|冒号纳入 i18n 文案
admin|apps/admin/src/views/Users.vue|325|MEDIUM|profileCompletion 后硬编码 "%" 拼接,en-US 与 zh 共用|国际化瑕疵|数值+单位走 i18n
admin|apps/admin/src/views/Reports.vue|278|MEDIUM|空值占位硬编码 "—"(Reports/Feedback/AuditLogs 多处),en-US 应显示 "-"|国际化瑕疵|统一 i18n 占位
admin|apps/admin/src/views/AuditLogs.vue|185|MEDIUM|operator 筛选占位符"操作者ID"但输入任意文本,后端 parseLong 失败静默返回 null(AdminAuditLogController.java:114-117)|输入用户名等非数字时筛选不生效且无提示|改用数字输入+校验提示,或后端支持用户名模糊
admin|apps/admin/src/views/AuditLogs.vue|106|MEDIUM|formatTime 直接字符串替换展示后端 LocalDateTime(服务器时区),未转用户本地时区|服务器为 UTC 时列表时间比本地晚 8 小时|统一时区转换(与 buildQuery 的 UTC 假设对齐)
admin|apps/admin/src/views/AuditLogs.vue|268|MEDIUM|requestBody 脱敏正则仅匹配 `"password":"..."` 引号格式(maskSensitiveBody:144-151),嵌套 JSON/base64/无引号键名不覆盖|登录/改密类审计体可能泄露凭据|改为递归 JSON 遍历脱敏
admin|apps/admin/src/views/AuditLogs.vue|249|MEDIUM|requestUrl 明文展示完整 query,若含 token/secret 参数则泄露|安全审计页自身泄露敏感参数|展示前脱敏 query
admin|apps/admin/src/views/Login.vue|110|MEDIUM|开发环境登录页明文展示 dev 默认密码(devPasswordHint),若 .env.development 误配真实密码则泄露|凭据泄露风险|仅展示账号不展示密码
admin|apps/admin/src/views/Reports.vue|204|MEDIUM|处理人显示为 "#{id}"(handlerPrefix),无用户名;Users 列表无最后操作人/更新时间列|审计追踪体验弱|列表展示操作人昵称
admin|apps/admin/src/views/Posts.vue|337|MEDIUM|审核弹窗无作者信息/举报次数上下文,无法判断恶意用户|审核质量受限|弹窗补充作者卡片
admin|apps/admin/src/views/SensitiveWords.vue|106|MEDIUM|新增去重仅比较当前已加载列表(若按分类筛选,只比较该分类子集),跨分类重复词误放行,靠后端 409 兜底但提示为"请求失败 (409)"|重复词入库体验差|去重逻辑基于全量或透传后端冲突信息
admin|apps/admin/src/views/SensitiveWords.vue|265|MEDIUM|删除按钮无 :disabled,deleting 期间可连点(ConfirmDialog confirming 只锁弹窗内按钮)|重复删除请求|列表按钮同步禁用
admin|apps/admin/src/views/NotifyConfig.vue|58|MEDIUM|保存按钮提交全部配置(无脏检查),未修改也全量 PUT;模板无字符数校验|误触保存覆盖未提交修改;超长模板无提示|脏检查+行级校验
admin|apps/admin/src/views/NotifyConfig.vue|118|MEDIUM|无"重置默认"功能,i18n resetButton/resetConfirm 等 key 已备但后端也无 reset 端点|无法一键恢复默认模板|后端补 reset 端点或移除 key
admin|apps/admin/src/views/Feedback.vue|43|MEDIUM|成功提示 toast 3 秒自动消失无手动关闭/无 aria-live|弱网用户可能错过|加持久关闭按钮
admin|apps/admin/src/components/ConfirmDialog.vue|111|MEDIUM|弹窗无 Esc 关闭、无焦点陷阱/焦点恢复、遮罩点击关闭但无 aria-modal|键盘/读屏用户操作困难|补键盘与 a11y
admin|apps/admin/src/views/Users.vue|367|MEDIUM|手写 modal-mask 弹窗(Users/Posts/Reports 三处重复),未复用 ConfirmDialog 之外的统一 Modal 组件|重复代码维护成本|抽公共 Modal
admin|apps/admin/src/views/Posts.vue|337|MEDIUM|同 Users 手写 modal 重复|同上|同上
admin|apps/admin/src/views/Reports.vue|309|MEDIUM|同 Users 手写 modal 重复|同上|同上
admin|apps/admin/src/views/Users.vue|612|MEDIUM|scoped 样式残留 .pagination/.page-button/.page-info 死代码(模板已改用共享 Pagination 组件)|死样式误导后续维护|删除
admin|apps/admin/src/views/Posts.vue|573|MEDIUM|同 Users 死样式残留|同上|删除
admin|apps/admin/src/views/Reports.vue|571|MEDIUM|同 Users 死样式残留|同上|删除
admin|apps/admin/src/views/AuditLogs.vue|564|MEDIUM|同 Users 死样式残留|同上|删除
admin|apps/admin/src/api/config.ts|60|MEDIUM|listConfigs/updateConfig/listRules/updateRule/listSwitches/updateSwitch 全部封装但无调用方,死代码+功能缺失双问题|见 HIGH 系统配置缺失|实现页面或移除
admin|apps/admin/src/api/match-config.ts|28|MEDIUM|getMatchConfig/updateMatchConfig/getRecommendStrategy/updateRecommendStrategy 无调用方|见 HIGH 匹配配置缺失|实现页面或移除
admin|apps/admin/src/api/posts.ts|124|MEDIUM|listComments/deleteComment 无调用方(评论管理页面缺失)|见 HIGH 评论缺失|实现页面或移除
admin|apps/admin/src/api/users.ts|86|MEDIUM|getUserDetail 无调用方(用户详情缺失)|见 MEDIUM 详情缺失|实现详情或移除
admin|apps/admin/src/main.ts|21|MEDIUM|`app.use(router as never)` 类型断言 hack 掩盖真实类型问题|类型安全漏洞|正确类型化 Vue 插件安装
admin|apps/admin/src/main.ts|25|MEDIUM|sessionStore.bootstrap() 与 App.vue:32 重复调用(两次恢复会话)|冗余异步调用,竞态窗口|只保留一处
admin|apps/admin/src/i18n/locales/zh-CN.ts|188|MEDIUM|大量 i18n key 无消费方:users.actionBan/banConfirm/actionResetPassword(188-192,198)、posts.actionRestore(276)、feedback.actionClose(342)、reports.processActionBan(442)、auditLogs.exportButton(522)、sensitiveWords.importTitle(636)、contentAudit.*(647-674)、matchConfig.*(677-700) 等约 80 个|代码与文案资源脱节,暗示功能未实现或已删功能残留|按实现状态清理或补功能
admin|apps/admin/src/i18n/locales/zh-CN.ts|198|MEDIUM|users.banConfirm 与 users.disableConfirmMessage 语义重复(两套封禁/禁用文案并存)|产品语义混乱|合并为单一操作文案
admin|apps/admin/src/views/Layout.vue|34|MEDIUM|菜单项缺失认证审核/评论/系统配置/匹配配置(对应后端已有接口),且 i18n layout.navContentAudit/navMatchConfig 已备|功能入口缺失直接导致功能不可达|补菜单入口
admin|apps/admin/src/views/Layout.vue|46|MEDIUM|displayName 回退到"管理员中心"文案,不显示真实用户名时可误导|UX 瑕疵|回退为账号
admin|apps/admin/src/views/Dashboard.vue|102|MEDIUM|"匹配趋势"区块只显示最近 5 天(slice(-5)),与"近 30 日"标题语义不符;dailyTrend 其余 25 天数据丢弃|趋势信息不足|展示完整 30 日或加说明
admin|apps/admin/src/views/Dashboard.vue|45|MEDIUM|统计卡片无环比/趋势/更新时间,部分子接口失败时对应卡片静默显示 0(如 activeStats 失败时 statInteractionsToday=0)|数据误导(0 与真实 0 无法区分)|失败卡片显示降级态
admin|apps/admin/src/views/Dashboard.vue|128|MEDIUM|onMounted 中 loadStats().catch() 冗余(loadStats 内部已 try/catch,永不 reject)|死代码|删除 catch
admin|apps/admin/src/views/Users.vue|99|MEDIUM|搜索无防抖(每按一次 Enter 全量请求),筛选 change 即请求|高频操作浪费请求|防抖+合并
admin|apps/admin/src/views/Posts.vue|80|MEDIUM|同 Users 无防抖|同上|同上
admin|apps/admin/src/views/Reports.vue|97|MEDIUM|同 Users 无防抖|同上|同上
admin|apps/admin/src/views/AuditLogs.vue|88|MEDIUM|查询按钮+筛选无防抖,日期切换高频请求|同上|同上
admin|apps/admin/src/views/Users.vue|73|MEDIUM|fetchUsers 无请求竞态防护(快速翻页时旧响应可能覆盖新数据)|分页数据错乱|请求序号/AbortController
admin|apps/admin/src/views/Posts.vue|54|MEDIUM|fetchPosts 同 Users 无竞态防护|同上|同上
admin|apps/admin/src/views/Reports.vue|69|MEDIUM|fetchReports 同 Users 无竞态防护|同上|同上
admin|apps/admin/src/views/Feedback.vue|56|MEDIUM|fetchFeedbacks 无竞态防护|同上|同上
admin|apps/admin/src/views/AuditLogs.vue|62|MEDIUM|fetchLogs 无竞态防护|同上|同上
admin|apps/admin/src/views/SensitiveWords.vue|63|MEDIUM|fetchWords 无竞态防护|同上|同上
admin|apps/admin/src/components/Pagination.vue|89|MEDIUM|分页仅上/下一页,无页码跳转输入(大数据量翻页痛苦)|UX 不足|加页码输入/页码列表
admin|apps/admin/src/components/Pagination.vue|76|MEDIUM|isFirst 依赖 page<=1,若后端返回越界 page 无钳制;totalPages<=0 时上一页仍可点(pageBase=1,page=2,totalPages=0)|边界态按钮可用性错误|钳制 page 范围
admin|apps/admin/src/views/Users.vue|270|MEDIUM|角色筛选仅有 USER/ADMIN,无 SUPER_ADMIN 选项(后端 role 枚举只有 USER/ADMIN,前端却渲染 super_admin 徽章样式 Users.vue:548)|前后端角色模型不一致|统一角色枚举
admin|apps/admin/src/views/Users.vue|316|MEDIUM|role-badge class 拼接 `role-${user.role.toLowerCase()}`,若后端返回未知角色则样式丢失(仅显示裸文本)|健壮性|默认样式兜底
admin|apps/admin/src/views/Posts.vue|200|MEDIUM|categoryLabel 白名单外分类直接显示英文原值|新分类无翻译|i18n 缺失回退中文
admin|apps/admin/src/views/Reports.vue|175|MEDIUM|targetTypeLabel/statusLabel 未知值回退英文枚举原值|同上一行|回退 i18n 兜底
admin|apps/admin/src/views/Feedback.vue|135|MEDIUM|typeLabel/statusLabel 未知枚举回退英文原值|同上|同上
admin|apps/admin/src/views/AuditLogs.vue|41|MEDIUM|operationLabelMap 未覆盖的操作显示英文枚举(AUDIT_POST 等)|新操作类型无翻译|兜底映射
admin|apps/admin/src/views/Feedback.vue|112|MEDIUM|默认回复文案(feedback.defaultReplyContent)写死"已由管理员标记为已处理",无个性化内容,且用户无法预览回复将发什么|用户收到模板化回复体验差|允许自定义必填
admin|apps/admin/src/views/Feedback.vue|209|MEDIUM|错误态与空态共用 error-banner 顶部展示,列表区域无独立空态插图|UX 简陋|空态/错误态差异化
admin|apps/admin/src/views/Users.vue|301|MEDIUM|loading/empty/error 三态共用一行 empty-cell 文案|无骨架屏,加载闪白|骨架行
admin|apps/admin/src/views/Posts.vue|276|MEDIUM|同 Users 三态简陋|同上|同上
admin|apps/admin/src/views/Reports.vue|260|MEDIUM|同 Users 三态简陋|同上|同上
admin|apps/admin/src/views/AuditLogs.vue|218|MEDIUM|同 Users 三态简陋|同上|同上
admin|apps/admin/src/views/SensitiveWords.vue|248|MEDIUM|同 Users 三态简陋|同上|同上
admin|apps/admin/src/views/NotifyConfig.vue|145|MEDIUM|同 Users 三态简陋|同上|同上
admin|apps/admin/src/utils/logger.ts|35|MEDIUM|logger.info 无业务调用方,debug/warn/error 使用也不均匀|日志规范未落地|统一调用规范
admin|apps/admin/src/theme/tokens.ts|33|MEDIUM|adminTokens 通过相对路径 `../../../client/src/theme/tokens` 跨包引用(tsconfig include 扩展),构建耦合 client 源码|client 改动可能破坏 admin 构建|提升为共享包
admin|apps/admin/src/views/Users.vue|217|MEDIUM|formatDate 每次调用 new Date().toLocaleString,大量行渲染性能开销,且无统一时间工具|性能与一致性|抽公共 date 工具
admin|apps/admin/src/views/Posts.vue|163|MEDIUM|同 Users formatDate 重复实现(Users/Posts/Reports/Feedback 各一份)|重复代码|抽公共工具
admin|apps/admin/src/views/Reports.vue|162|MEDIUM|同 Users formatDate 重复实现|同上|同上
admin|apps/admin/src/views/Feedback.vue|177|MEDIUM|同 Users formatDate 重复实现|同上|同上
admin|apps/admin/src/api/http.ts|168|MEDIUM|401 用 window.location.href 整页跳转,丢失 SPA 状态与跳转动画;且并发 401 会触发多次跳转|体验与冗余请求|统一跳转收敛
admin|apps/admin/src/api/http.ts|179|MEDIUM|非 JSON 错误响应默认消息 `请求失败 (${status})` 直出 HTTP 码,未映射业务错误码(errors.* 已备)|用户看到裸状态码|按错误码翻译
admin|apps/admin/src/api/http.ts|183|MEDIUM|后端 message 为 null 时 String(null)="null" 展示"null"|脏文案|空值兜底
admin|apps/admin/src/api/http.ts|150|MEDIUM|无请求取消机制(组件卸载后响应仍触发状态更新,配合无竞态防护)|内存/状态泄漏风险|支持 AbortSignal
```

### LOW

```
admin|apps/admin/src/views/Users.vue|32|LOW|pageSize 魔法数字 20 多处重复(Users:37/Posts:39/Reports:45/AuditLogs:29),无常量|维护成本|提公共常量
admin|apps/admin/src/views/Posts.vue|39|LOW|同 Users pageSize=20 魔法数字|同上|同上
admin|apps/admin/src/views/Reports.vue|45|LOW|同 Users pageSize=20 魔法数字|同上|同上
admin|apps/admin/src/views/AuditLogs.vue|29|LOW|同 Users size=20 魔法数字|同上|同上
admin|apps/admin/src/views/Feedback.vue|49|LOW|toast 3000ms 魔法数字(NotifyConfig.vue:94 同值重复)|同上|提常量
admin|apps/admin/src/views/NotifyConfig.vue|94|LOW|同 Feedback toast 3000ms|同上|同上
admin|apps/admin/src/views/Dashboard.vue|102|LOW|slice(-5)/reverse() 魔法数字无注释常量|可读性|具名常量
admin|apps/admin/src/views/AuditLogs.vue|155|LOW|formatDuration 中 1000 魔法数字|可读性|常量
admin|apps/admin/src/stores/session.ts|116|LOW|dev 登录 user.id 硬编码 1、username 硬编码 "admin"、displayName 硬编码"系统管理员"|dev 数据失真|由环境变量注入
admin|apps/admin/src/stores/session.ts|25|LOW|user 类型为 any(eslint-disable),无类型约束|类型安全|定义 AdminUser 接口
admin|apps/admin/src/views/Login.vue|34|LOW|showDevHint 依赖 devUsername/devPassword 两个 computed,逻辑可合并|冗余|简化
admin|apps/admin/src/App.vue|20|LOW|语言切换仅存 localStorage,不持久化到服务端/URL|多端不一致|URL query 持久化
admin|apps/admin/src/App.vue|39|LOW|locale-switcher 固定悬浮右上角,登录页也显示,且无最小宽度限制|小屏遮挡|响应式处理
admin|apps/admin/src/router/guards.ts|30|LOW|isTokenValid 对 dev-admin-token- 前缀直接放行(永不过期),依赖开发者配置正确|dev 环境 token 无过期约束|dev 也做基础校验
admin|apps/admin/src/router/guards.ts|37|LOW|atob 解析 JWT 未处理 URL-safe base64 补齐(padding),某些 JWT 解析失败导致误判未登录|兼容性|补齐 padding
admin|apps/admin/src/views/Forbidden.vue|25|LOW|goLogin 未 try/catch,sessionStore.logout 后端失败时(其内部已吞错)仍正常;但无 loading 态|双击重复登出|loading 防护
admin|apps/admin/src/views/Layout.vue|73|LOW|handleConfirmLogout catch 分支与成功分支逻辑几乎相同|可读性|合并分支
admin|apps/admin/src/views/Layout.vue|101|LOW|focusMainContent 无空值兜底注释说明,document 操作在 SSR 环境会崩(当前纯 CSR 可接受)|健壮性|环境守卫
admin|apps/admin/src/views/Users.vue|104|LOW|handleResetFilters 后仍调用 fetchUsers(与 handleSearch 相同逻辑),无重置特化|冗余|合并
admin|apps/admin/src/views/Posts.vue|85|LOW|同 Users handleResetFilters 冗余|同上|同上
admin|apps/admin/src/views/Reports.vue|105|LOW|同 Users handleResetFilters 冗余|同上|同上
admin|apps/admin/src/views/AuditLogs.vue|93|LOW|同 Users handleReset 冗余|同上|同上
admin|apps/admin/src/views/Users.vue|367|LOW|编辑弹窗无 ESC 关闭、无表单提交(仅按钮点击)|键盘流操作不便|补 keydown 处理
admin|apps/admin/src/views/Posts.vue|337|LOW|审核弹窗 radio 无默认聚焦,无 maxlength 限制 remark|UX 细节|补限制
admin|apps/admin/src/views/Reports.vue|309|LOW|处理弹窗提交按钮未跟随 handleDecision 显示差异化文案(REJECT 时按钮仍叫"提交")|歧义|按决策切换文案
admin|apps/admin/src/views/Users.vue|371|LOW|编辑弹窗 hint 文案"状态切换请使用列表中的禁用/启用按钮"与编辑接口支持 status 矛盾|误导|更新文案或移除
admin|apps/admin/src/views/SensitiveWords.vue|207|LOW|新增输入框 maxlength 20 但后端允许 64(SensitiveWordCreateRequest @Size(max=64)),前端过严|合法词被前端拒绝|对齐后端限制
admin|apps/admin/src/views/Users.vue|55|LOW|NICKNAME_MAX_LENGTH=20,后端 AdminUserUpdateRequest 校验是否 20 未核验,存在契约漂移风险|一致性|契约测试
admin|apps/admin/src/views/Posts.vue|34|LOW|auditStatusFilter 默认空=全部,无"待审核优先"默认排序|运营需手动筛选|默认 pending 排序
admin|apps/admin/src/views/Reports.vue|38|LOW|同 Posts 默认无 PENDING 优先|同上|同上
admin|apps/admin/src/views/AuditLogs.vue|224|LOW|日志行无 hover 高亮整行可点展开(仅 details summary 可点)|交互面积小|行点击展开
admin|apps/admin/src/views/AuditLogs.vue|106|LOW|createdAt 字符串直接替换展示,若后端格式变化(如含毫秒/时区)截断错误|健壮性|Date 解析兜底
admin|apps/admin/src/views/NotifyConfig.vue|126|LOW|保存按钮在 loading 完成前可点击(disabled 条件含 loading,实际 OK)但无脏状态文案|UX|显示"有未保存修改"
admin|apps/admin/src/views/Feedback.vue|298|LOW|ConfirmDialog slot message 中 textarea 无 maxlength 限制|超长回复|限制长度
admin|apps/admin/src/api/feedback.ts|69|LOW|replyFeedback 中 encodeURIComponent(id) 对数字 ID 无意义|冗余|简化
admin|apps/admin/src/api/config.ts|72|LOW|encodeURIComponent(key) 对 config key 编码,后端 @PathVariable 自动解码,双重编码风险(特殊字符 key)|边界|验证特殊 key
admin|apps/admin/src/api/notify-config.ts|30|LOW|listNotifyConfigs 无返回类型标注(其余 api 均有)|类型一致性|补类型
admin|apps/admin/src/api/audit-logs.ts|74|LOW|listAuditLogs 无显式返回类型标注|同上|同上
admin|apps/admin/src/api/sensitive-words.ts|35|LOW|listSensitiveWords 无显式返回类型标注|同上|同上
admin|apps/admin/src/api/http.ts|47|LOW|REQUEST_TIMEOUT_MS=15000 对批量/导入类慢操作(如 batch-import 异步可接受,但大导出)偏短|边界|按接口分级超时
admin|apps/admin/src/i18n/locales/zh-CN.ts|89|LOW|login.footerTip 与 layout.footerCopyright 内容完全重复|资源冗余|复用
admin|apps/admin/src/i18n/locales/zh-CN.ts|167|LOW|users.filterStatusAll 与 filterStatusAllShort 文案相同("全部"),双 key 冗余|资源冗余|合并
admin|apps/admin/src/i18n/locales/zh-CN.ts|204|LOW|users.disableConfirm 与 disableConfirmMessage 文案相同双 key 冗余|资源冗余|合并
admin|apps/admin/src/i18n/locales/zh-CN.ts|253|LOW|posts.filterStatusAll 与 posts.filterCategoryAll/categoryAll 三处"全部"|资源冗余|复用
admin|apps/admin/src/i18n/locales/en-US.ts|62|LOW|en-US 中 common.chinese 仍为中文"简体中文"(语言自名,可接受但非英文)|一致性|按惯例保留或英化
admin|apps/admin/src/views/Dashboard.vue|46|LOW|统计卡片 icon 路径 /icons/*.svg 硬编码,与 public/icons 目录耦合,无构建校验|图标缺失时静默|构建校验
admin|apps/admin/src/views/Layout.vue|35|LOW|menuItems 图标路径硬编码(/icons/*.svg)|同上|同上
admin|apps/admin/src/views/Users.vue|311|LOW|头像 img 无 onerror 兜底,头像 URL 失效显示裂图|UX|onerror 占位
admin|apps/admin/src/views/Reports.vue|196|LOW|reporterDisplay 昵称脱敏:1 字昵称返回 "x*" 仍可辨识;2 字昵称 "张*" 可辨识度高|隐私边界|1 字全打码或更长脱敏
admin|apps/admin/src/views/AuditLogs.vue|243|LOW|targetType 列直接显示英文枚举(POST/COMMENT/USER)|i18n 未覆盖|映射 label
admin|apps/admin/src/views/AuditLogs.vue|248|LOW|requestMethod/URL 列中文环境显示 HTTP 方法无 badge 色(已有 http-method 样式但无方法-颜色映射)|视觉区分弱|按方法着色
admin|apps/admin/src/views/SensitiveWords.vue|256|LOW|敏感词列 word 直接展示,无复制按钮|运营复制词不便|加复制
admin|apps/admin/src/views/NotifyConfig.vue|151|LOW|表格无行 key 之外的稳定性保障(config.id 可能为 null?后端 ID 必有)|边界|id 兜底
admin|apps/admin/src/views/Feedback.vue|237|LOW|列表行无 hover 操作提示/禁用态(已处理反馈仍可点"处理"|误操作|已处理行禁用
admin|apps/admin/src/views/Reports.vue|287|LOW|PENDING 之外显示 handledText,但无点击查看处理详情入口(与 handleRemark 不可见同源)|同上|详情入口
admin|apps/admin/src/components/ErrorState.vue|33|LOW|errorState__icon 使用 "!" 文本做图标,无 emoji 规范下可接受但样式简陋|视觉|CSS 图形
admin|apps/admin/src/styles/admin-common.css|389|LOW|admin-common.css 与各视图 scoped 重复定义 .pagination/.page-button(见 MEDIUM 死样式条目)|样式膨胀|统一收敛
admin|apps/admin/src/vite.config.ts|30|LOW|define 仅注入 3 个 VITE_ 变量,与 config/env.ts 读取 5 个变量清单不一致(其余走 import.meta.env 自动注入)|配置清单漂移|统一清单
admin|apps/admin/src/vite.config.ts|47|LOW|build.target es2015 与现代浏览器不匹配,拖慢产物(源码已用 ?./ optional chaining 等)|性能|升级 target
admin|apps/admin/src/views/Users.vue|90|LOW|catch 中 ApiError 优先展示 err.message(后端原始消息),未走 errors.* 映射,与 i18n 目标相悖|见 HIGH 硬编码条目|统一错误映射层
admin|apps/admin/src/views/Posts.vue|71|LOW|同 Users 错误消息直出后端文本|同上|同上
admin|apps/admin/src/views/Reports.vue|85|LOW|同 Users 错误消息直出后端文本|同上|同上
admin|apps/admin/src/views/SensitiveWords.vue|71|LOW|同 Users 错误消息直出后端文本|同上|同上
admin|apps/admin/src/api/http.ts|5|LOW|文件头注释仍写"从 localStorage.admin_token 读取",未提及 XSS 风险与改进方向|文档缺失|补安全说明
admin|apps/admin/src/stores/session.ts|19|LOW|注释声称"后端需实现 POST /api/v1/auth/admin/login",实际后端已实现,注释过时|文档漂移|更新注释
admin|apps/admin/src/views/Posts.vue|248|LOW|注释"移除 all/latest 占位分类"后,若后端新增分类(如 topic)需再次改码|可维护性|分类源驱动
admin|apps/admin/src/views/Dashboard.vue|97|LOW|注释"后续若后端提供真实活动流接口"标记的未来项无 TODO 跟踪|遗忘风险|登记 backlog
admin|apps/admin/src/views/SensitiveWords.vue|60|LOW|"若数据量增长可切换为分页查询"同样无 TODO 跟踪|遗忘风险|登记 backlog
```

## 领域总结(按严重度统计)

- 共 133 条:CRITICAL 3(反馈契约不匹配、/reply 端点不存在、审计日期筛选格式冲突)、HIGH 24(认证/评论/系统配置/匹配配置 4 大功能缺失、token 存储、角色越权、硬编码中文、批量导入缺失等)、MEDIUM 57(错误/空态无重试、死代码、重复样式、竞态、时区、脱敏不全等)、LOW 49(魔法数字、冗余 key、死注释、a11y 细节等)。
- 最高优先:Feedback 页契约层双断裂(列表解析错误 + 处理接口 404)与审计日期筛选静默失效,属"页面可用性"级缺陷;其次 4 个后端已就绪的前端空白功能(认证审核、评论、系统配置、匹配配置)构成管理闭环缺口。
- 安全面:token 存 localStorage、super_admin 无后端分级、禁用自己仅前端拦截,均需后端协同加固。
- 技术债:api 层 4 个文件死代码、4 个视图残留分页死样式、约 80 个无消费 i18n key、重复的时间格式化/弹窗/错误三态实现,建议集中清理。
- 国际化:模板文案已全覆盖,残余硬编码集中在 api/http.ts 与 stores/session.ts 的运行时错误消息及 Pagination 全角括号。
