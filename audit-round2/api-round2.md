# API 领域第二轮审查问题清单(Round 2)

> 来源:子代理审查会话 sa_20260806_012239_000000000_51b7100a52ea 最终回答(2026-08-06 01:35 完成)
> 统计:共 294 条问题(CRITICAL 2 / HIGH 14 / MEDIUM 86 / LOW 192,按最终回答原文逐条统计)

审查完成。以下为基于当前工作区(含未提交修改)逐文件核验的新一轮问题清单(行号均经精确核对):

```
api|apps/api/src/main/java/com/campuslove/api/auth/ThirdPartyAuthController.java|68|CRITICAL|POST /api/v1/auth/third-party/wechat 公开端点直接信任客户端传入 openId,服务端仅 SHA-256 后查库,命中即签发 JWT、未命中即创建新用户,无 code2session 校验|任意用户可伪造他人 openId 直接接管账号登录;或批量生成 openId 垃圾注册|服务端调用微信 code2session/Apple identityToken 验签后再登录
api|apps/api/src/main/java/com/campuslove/api/auth/ThirdPartyAuthController.java|82|CRITICAL|POST /api/v1/auth/third-party/apple 同样直接信任客户端 appleIdentifier,无 identityToken 签名/aud/iss/exp 验证|攻击者传任意 identifier 即可登录/创建账号,身份认证完全失效|接入 Sign in with Apple JWT 验签(RS256)后取 sub
api|apps/api/src/main/java/com/campuslove/api/auth/ThirdPartyAuthService.java|129|HIGH|doLogin 中 openId 仅做无盐 SHA-256,未验证第三方凭据归属,与主微信登录(code2session)链路不一致|配合 Controller 形成任意身份伪造;低熵 identifier 可离线爆破|复用 WeChatClient.code2Session 或 Apple 验签
api|apps/api/src/main/java/com/campuslove/api/auth/ThirdPartyAuthService.java|301|LOW|hashIdentifier 无盐 SHA-256,与 RealAuthService.hashOpenid 重复实现|代码重复;hash 可被彩虹表/字典攻击|统一抽取带盐 KDF
api|apps/api/src/main/java/com/campuslove/api/chat/VoiceMessageController.java|103|HIGH|DELETE /api/v1/chat/voice/{id} 只校验 /uploads/ 前缀不校验文件归属,注释自认"不限制跨用户删除"|任意登录用户可删除他人语音文件(IDOR)|删除前解析 URL 中 userId 并与当前用户比对
api|apps/api/src/main/java/com/campuslove/api/chat/VoiceMessageService.java|194|HIGH|delete(String url) 无当前用户上下文,URL 中 userId 可枚举,删除任意用户文件|语音资产被批量删除|Controller 传入 currentUserId 做归属校验
api|apps/api/src/main/java/com/campuslove/api/chat/VoiceMessageController.java|132|MEDIUM|decodeUrl 将 %5C 还原为反斜杠后拼路径,跨平台路径语义不一致|Windows 部署下可能绕过前缀检查(依赖 startsWith 兜底)|统一用 URLDecoder 或仅允许 %2F
api|apps/api/src/main/java/com/campuslove/api/chat/VoiceMessageService.java|137|LOW|语音 MIME 校验仅在客户端提供 ContentType 时生效,可伪造;无 magic bytes 校验(对比 LocalMediaStorageService)|伪装文件上传|补充文件头校验
api|apps/api/src/main/java/com/campuslove/api/chat/VoiceMessageService.java|109|LOW|store/delete 为纯文件 IO 却标注 @Transactional|无意义事务开销|移除
api|apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java|94|HIGH|上传返回 URL 前缀固定为 /uploads/,而 SecurityConfig 已 denyAll /uploads/**,且无任何代码将 URL 转换为 /api/v1/media/{userId}/...|real 模式下所有上传文件 URL 不可访问,前端图片/语音/视频全部 404|返回 /api/v1/media/{userId}/... 或提供 URL 转换服务
api|apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java|259|HIGH|媒体代理仅允许"本人或 ADMIN"访问,而业务中需展示他人头像/帖子图片/活动头像|社交浏览场景(查看他人资料、帖子)图片全部 403,功能不可用|按媒体类型分级授权(头像/帖子图公开读,身份证仅本人)
api|apps/api/src/main/java/com/campuslove/api/media/MediaAccessService.java|99|HIGH|loadMedia 同样仅本人/管理员可读,与 MediaAccessController 双层锁死|同上|同上
api|apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java|398|LOW|validateMimeType 在 ContentType 为 null 时直接放行(注释"向后兼容")|弱校验,依赖 magic bytes 兜底,但视频仅校验 ftyp 4 字节|严格模式拒绝 null MIME
api|apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java|455|LOW|视频 magic bytes 仅校验偏移 4 的 "ftyp",攻击者可构造 ftyp 头+任意 payload|伪视频文件存储|引入 ffprobe/完整容器解析
api|apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java|279|MEDIUM|delete(url) 不校验调用方身份与文件归属,任何 Service 传入任意 URL 即删文件|旧头像/语音等删除链路若被诱导可删除他人文件|delete 增加 userId 参数并在路径中校验
api|apps/api/src/main/java/com/campuslove/api/config/AesEncryptor.java|72|HIGH|APP_AES_SECRET 未配置时静默回退到硬编码默认密钥 "campus-love-default-aes-key-change-in-production-32bytes"|生产漏配时 openid/phone 加密等于明文(密钥公开)|启动时强制校验,缺失则 fail-fast
api|apps/api/src/main/java/com/campuslove/api/config/AesEncryptor.java|52|MEDIUM|aes-secret 回退到 JWT_SECRET,签名密钥与加密密钥复用|单一密钥泄露双系统失守|独立密钥注入
api|apps/api/src/main/java/com/campuslove/api/config/AesEncryptor.java|160|MEDIUM|decrypt 失败时"原样返回输入",密钥轮换/损坏后密文被当明文返回并可能回写库|数据损坏与敏感值误用|解密失败抛异常并告警
api|apps/api/src/main/java/com/campuslove/api/config/AesEncryptor.java|90|LOW|deriveKey 使用无盐 SHA-256 派生,弱口令可暴力|密钥强度依赖配置熵|PBKDF2/Argon2
api|apps/api/src/main/java/com/campuslove/api/config/ContentFilterController.java|45|MEDIUM|公开端点返回命中的具体敏感词列表 filteredWords,而 SecurityConfig 注释声称"不暴露敏感词字典"|攻击者可枚举完整敏感词库,规避内容审核|仅返回 hasSensitiveWords 布尔值
api|apps/api/src/main/java/com/campuslove/api/config/ContentFilterController.java|37|LOW|content 无长度上限(可提交 MB 级文本触发正则扫描)|CPU 滥用|限制 5000 字符
api|apps/api/src/main/java/com/campuslove/api/config/SensitiveWordFilter.java|137|LOW|containsSensitive 对每个敏感词做 contains,词库大时 O(n*m)|检查接口性能随词库线性劣化|AC 自动机
api|apps/api/src/main/java/com/campuslove/api/config/SensitiveWordFilter.java|33|LOW|enabled 默认 false,若部署配置被裁剪则过滤静默关闭|内容审核失效无告警|启动时校验配置
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|432|MEDIUM|replyToTopic 回复内容未做敏感词过滤(createTopic 有过滤)|敏感词绕过:回复可携带违规内容|补 filterWithLog
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|225|HIGH|joinCircle bulk UPDATE 后 circle.setMemberCount(旧值+1) 使实体变脏,事务提交时 flush 用陈旧值覆盖 bulk 结果|并发加入/退出圈子成员数丢失更新|bulk 后 entityManager.clear() 或重查
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|276|HIGH|leaveCircle 同样存在 bulk update 后实体脏写覆盖问题|同上|同上
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|438|MEDIUM|replyToTopic 的 replyCount 读-改-写非原子|并发回复计数丢失|DB 侧原子 UPDATE
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|473|MEDIUM|getReplies 无分页 SQL,findByTopicIdOrderByCreatedAtDesc 全量加载后再内存分页|话题回复量大时全表传输|Repository 分页查询
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|575|MEDIUM|toTopicView/toTopicViewFullContent/toReplyView 每项调用 getAuthorName→userRepository.findById(N+1)|话题列表/回复列表每页 20+ 次额外查询|批量预加载作者 Map
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|597|MEDIUM|同上(详情页与回复视图作者查询)|单帖详情 1+ 次查询|复用批量方法
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|618|MEDIUM|toReplyView 每次回复 1 次作者查询|回复列表 N+1|批量预加载
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|553|LOW|getAuthorName 独立查询方法易被遗漏批量优化|辅助方法层级 N+1 风险|统一走 Map
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|210|LOW|joinCircle 先查再插,并发重复加入依赖无唯一约束(唯一约束缺失)|重复成员记录|加 (user_id,circle_id) 唯一索引
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|262|LOW|leaveCircle 循环 delete 多条(防御性),无批量删除|小性能|deleteAllInBatch
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|370|LOW|createTopic images 无 URL 归属/协议校验,可存任意外链|内容存储注入任意链接|校验 URL 白名单
api|apps/api/src/main/java/com/campuslove/api/discover/RealActivityService.java|142|MEDIUM|enrollActivity 的 enrollmentCount 读-改-写非原子|并发报名计数丢失|原子 UPDATE
api|apps/api/src/main/java/com/campuslove/api/discover/RealActivityService.java|184|MEDIUM|cancelEnrollment 同(读-改-写非原子)|并发取消计数漂移|原子 UPDATE
api|apps/api/src/main/java/com/campuslove/api/discover/RealActivityService.java|123|LOW|报名不校验活动状态(可报名已结束/取消活动)|脏报名数据|校验 ActivityStatus
api|apps/api/src/main/java/com/campuslove/api/discover/RealActivityService.java|127|LOW|报名无容量上限校验|活动超员|capacity 校验
api|apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java|224|MEDIUM|enrollActivity bulk update 后 activity.setEnrollmentCount(旧值+1) 脏写覆盖|并发报名计数丢失(与 Circle 同类)|bulk 后 clear/重查
api|apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java|257|MEDIUM|cancelEnrollment 分支同样脏写覆盖|同上|同上
api|apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java|401|MEDIUM|matchesFilter 中 needDbLookup 时对每个候选用户 findByUserId(最多 20 次查询)|筛选请求 N+1|批量预加载
api|apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java|119|LOW|getDiscussions 每次实时聚合查询(无缓存),首页/发现页高频调用|DB 压力|加 @Cacheable
api|apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java|141|LOW|getDiscussions 帖子按 createdAt 取前 50 再按热度排序,热门老帖可能被漏|推荐质量偏差|按热度 SQL 排序
api|apps/api/src/main/java/com/campuslove/api/discover/RecommendationCacheManager.java|61|MEDIUM|推荐缓存 key 仅 userId,推荐结果 5 分钟不随 like/pass 更新,且 like/pass 后未调用 evictRecommendationCache|推荐列表长时间含已互动用户|互动后主动失效
api|apps/api/src/main/java/com/campuslove/api/discover/RecommendationController.java|85|MEDIUM|PUT /api/v1/recommendations/preferences 调用 deprecated updatePreferences(prefs),其实现恒抛 UnsupportedOperationException|该端点 100% 返回 500|改为调用带 userId 版本或删除端点
api|apps/api/src/main/java/com/campuslove/api/discover/RecommendationController.java|71|LOW|GET /preferences 返回固定默认值,与 /preferences/me 行为不一致且已 @Deprecated 未删|前端误用拿不到真实偏好|删除废弃端点
api|apps/api/src/main/java/com/campuslove/api/discover/RecommendationController.java|110|LOW|heightMin/heightMax 无范围校验(可为负数/倒挂)|过滤语义异常|@Min/@Max 校验
api|apps/api/src/main/java/com/campuslove/api/discover/RecommendationController.java|119|LOW|filter 参数(教育/感情/城市)无枚举校验,任意字符串被静默过滤掉|弱校验|枚举白名单
api|apps/api/src/main/java/com/campuslove/api/discover/DailyQuestionController.java|60|LOW|submitAnswer 的 isAnonymous 无@NotNull,nullable 语义模糊|匿名开关可被省略|布尔默认值明确
api|apps/api/src/main/java/com/campuslove/api/discover/RealDailyQuestionService.java|253|MEDIUM|getAnswers 每回答调用 userRepository.findById(N+1)|回答列表每页 20 次查询|批量预加载
api|apps/api/src/main/java/com/campuslove/api/discover/RealDailyQuestionService.java|184|MEDIUM|answerPage.map(this::toAnswerView) 逐条查库放大 N+1|同上|同上
api|apps/api/src/main/java/com/campuslove/api/discover/RealDailyQuestionService.java|131|LOW|submitAnswer existsBy 检查与 save 非原子(无唯一约束兜底确认)|并发重复回答|(question_id,user_id) 唯一约束
api|apps/api/src/main/java/com/campuslove/api/discover/RealDailyQuestionService.java|64|LOW|getTodayQuestion 缓存 key 仅 userId,1h TTL 跨零点返回昨日问题|凌晨 1 小时内前端展示旧题|缓存 key 加日期
api|apps/api/src/main/java/com/campuslove/api/discover/RealDailyQuestionService.java|218|LOW|toQuestionView 每次 countByQuestionId 统计回答数|高频接口附加查询|实体冗余计数
api|apps/api/src/main/java/com/campuslove/api/discover/PrivacyFieldFilter.java|145|LOW|反射式字段过滤在每次推荐请求执行,存在性能与维护成本|防御层开销|编译期 DTO 白名单
api|apps/api/src/main/java/com/campuslove/api/village/VillageInteractionService.java|111|HIGH|likePost bulk update(likesCount-1) 后 post.setLikesCount(旧值-1) 使 managed 实体变脏,事务提交 flush 覆盖原子结果|并发点赞/取消计数丢失(FIN-00018 修复失效)|bulk 后 clear/重查或 @DynamicUpdate
api|apps/api/src/main/java/com/campuslove/api/village/VillageInteractionService.java|127|HIGH|点赞分支 bulk +1 后同样实体脏写覆盖|同上|同上
api|apps/api/src/main/java/com/campuslove/api/village/VillageInteractionService.java|181|MEDIUM|commentPost bulk 递增后实体 setCommentsCount 覆盖风险|并发评论计数丢失|同上
api|apps/api/src/main/java/com/campuslove/api/village/VillageInteractionService.java|233|MEDIUM|sharePost bulk 递增后实体 setShareCount 覆盖风险|并发转发计数丢失|同上
api|apps/api/src/main/java/com/campuslove/api/village/VillageInteractionService.java|143|LOW|likePost 返回的 likeCount 为实体内存值,与 DB 可能不一致|展示值漂移|重查最新值
api|apps/api/src/main/java/com/campuslove/api/village/VillageInteractionService.java|212|LOW|sharePost 无"每人每帖一次"限制,可无限刷转发数|计数刷量|去重约束
api|apps/api/src/main/java/com/campuslove/api/village/VillagePostService.java|81|MEDIUM|createPost 中 PostCategory.valueOf(category) 未捕获非法值,非法分类返回 400 而非明确错误|健壮性问题;且 CacheEvict 不触发|枚举校验前置
api|apps/api/src/main/java/com/campuslove/api/village/VillagePostService.java|64|MEDIUM|CreatePostRequest.title 必填但 createPost 从不接收/存储 title,前端被迫传无用字段|API 契约与实现不符,标题功能缺失|Post 增加 title 或移除校验
api|apps/api/src/main/java/com/campuslove/api/village/CreatePostRequest.java|11|MEDIUM|@NotBlank title 与实体无 title 字段矛盾|发帖必须传 title 否则 400,且 title 丢失|同上
api|apps/api/src/main/java/com/campuslove/api/village/VillageController.java|281|LOW|GET /api/v1/posts/dto 与 getPosts 功能重复(FIN-00065 自认保留),已废弃未删除|双实现维护成本|删除
api|apps/api/src/main/java/com/campuslove/api/village/VillageController.java|77|LOW|getPosts 的 tag 参数被传递但 VillageQueryService 未使用|标签筛选失效|实现或移除参数
api|apps/api/src/main/java/com/campuslove/api/village/VillageController.java|89|LOW|campus 分类未认证返回空列表而非 401,信息差异设计|可接受但文档缺失|无
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|162|MEDIUM|PostCategory.valueOf(category) 未捕获,非法分类值→500(应 400)|恶意参数可触发 500 日志刷屏|捕获转 400
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|386|MEDIUM|getDiscoverPosts/getCityPosts 同样 valueOf 未捕获|同上|同上
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|392|MEDIUM|getCityPosts 排序比较器内每帖调用 isSameCampus→findByUserId(每页 20-100 次查询)|城市 Tab N+1|批量预加载校区 Map
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|375|MEDIUM|getCityPosts 先 DB 分页再页内内存排序,"同校优先"只对当前页生效,跨页错乱且 totalElements 为全站数|分页+排序语义错误|SQL 排序或同校过滤下推
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|390|LOW|getCityPosts 内存排序后 totalElements 未反映排序后语义|分页元数据失真|同上
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|223|LOW|listHotPosts 缓存 key 固定 'hot',无过期策略依赖 TTL|可接受|无
api|apps/api/src/main/java/com/campuslove/api/village/VillageViewMapper.java|116|MEDIUM|toPostDetailView 单帖详情触发 5 次 DB 查询(author×2+campus×2+isLiked)|详情页高频接口查询放大|批量/合并查询
api|apps/api/src/main/java/com/campuslove/api/village/VillageViewMapper.java|127|LOW|详情页两次 findByUserId 查询当前用户与作者校区|可合并|JOIN FETCH
api|apps/api/src/main/java/com/campuslove/api/village/VillageViewMapper.java|143|LOW|toCommentItemView(单条版) 查库,若被循环调用则 N+1|风险点|调用方强制走批量版
api|apps/api/src/main/java/com/campuslove/api/village/VillageViewMapper.java|187|LOW|isSameCampus 每次查库,已被列表路径绕过但排序路径仍用|部分路径 N+1 残留|统一 Map
api|apps/api/src/main/java/com/campuslove/api/admin/AdminUserController.java|218|MEDIUM|disableUser/enableUser 未阻止对 ADMIN 用户/自身操作,可禁用其他管理员或自己|管理后台自锁/越权操作其他管理员|禁止操作 ADMIN 角色与自身
api|apps/api/src/main/java/com/campuslove/api/admin/AdminUserController.java|208|LOW|updateUser 事务内自调用 getUserDetail 重复查询|冗余查询|直接构造视图
api|apps/api/src/main/java/com/campuslove/api/admin/AdminUserController.java|105|LOW|searchForAdmin 昵称筛选 LIKE '%x%' 前缀通配符,数据量大时全表扫描(注释自认 FIN-00058)|管理端查询慢|全文索引/前缀匹配
api|apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java|159|MEDIUM|deletePost 注释称"同时清理该帖子下所有评论(硬删除)",但实现未删除任何评论|孤儿评论残留,注释与实现漂移|补评论清理或改注释
api|apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java|132|LOW|auditPost 对非 approved 一律置 rejected,无决策枚举校验|弱校验|枚举校验
api|apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java|136|LOW|auditRemark 无长度上限|超长备注入库|@Size
api|apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java|234|LOW|parseAuditStatus/parsePostStatus/parseCategory 非法值静默转 null(全量查询)|非法参数被吞,查询条件失效|返回 400
api|apps/api/src/main/java/com/campuslove/api/admin/audit/AuditLogAspect.java|146|MEDIUM|@RequestBody 完整序列化后落库 audit_log,脱敏字段仅 10 个(不含手机号/身份证/私信内容等)|敏感业务字段明文进入审计库|按字段白名单或脱敏扩展
api|apps/api/src/main/java/com/campuslove/api/admin/audit/AuditLogAspect.java|104|LOW|异常时 errorMessage=ex.getMessage() 截断 500 字符入库,可能含 SQL/堆栈敏感信息|审计库泄露内部细节|脱敏/仅存异常类型
api|apps/api/src/main/java/com/campuslove/api/admin/audit/AuditLogAspect.java|197|LOW|审计时每次查 UserRepository 取操作者昵称|审计写入开销|缓存操作者信息
api|apps/api/src/main/java/com/campuslove/api/admin/RealAdminConfigService.java|99|MEDIUM|updateConfig 在事务内同步 publishEvent,若订阅方同步处理则拉长事务|事务持有时间不确定|事务提交后发布(TransactionSynchronization)
api|apps/api/src/main/java/com/campuslove/api/admin/RealAdminConfigService.java|101|LOW|configValue 无长度/格式校验,admin 可写任意超长值|脏配置|校验
api|apps/api/src/main/java/com/campuslove/api/admin/RealAdminConfigService.java|134|LOW|listRules/listSwitches 无缓存(仅 listConfigs 有)|管理端查询每次全表|加缓存
api|apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java|183|MEDIUM|Integer.parseInt 失败时仅日志,非法值已写入 DB 而内存 bean 未同步|DB 与运行时配置漂移|先校验后写入
api|apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java|222|MEDIUM|配置值无范围校验(权重可设 0/负数/超大,候选页可设 0)|推荐/匹配算法行为异常|范围校验
api|apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java|80|LOW|updateMatchConfig 任意未知 key 均写入 DB|脏 key 污染|key 白名单
api|apps/api/src/main/java/com/campuslove/api/admin/SensitiveWordImportService.java|233|MEDIUM|每词 1 次 existsByWordIgnoreCase+1 次 save(5000 词=1 万次往返)|批量导入慢|saveAll 批量 + 唯一约束兜底
api|apps/api/src/main/java/com/campuslove/api/admin/SensitiveWordImportService.java|126|LOW|异步导入无分布式锁,多 admin 并发导入依赖 DB 唯一约束|可接受,日志混乱|可加锁
api|apps/api/src/main/java/com/campuslove/api/admin/SensitiveWordImportService.java|270|LOW|taskId 仅内存,重启后状态查询失效(注释自认)|运维体验|DB 任务表
api|apps/api/src/main/java/com/campuslove/api/admin/AdminPermissionAspect.java|93|LOW|权限失败日志 endpoint 变量误用 UNKNOWN_IP 常量名(值为 unknown)|日志语义小错|改名
api|apps/api/src/main/java/com/campuslove/api/admin/RealAdminStatsService.java|82|LOW|统计均 @Cacheable 5 分钟,admin 修改数据后延迟可见|可接受|无
api|apps/api/src/main/java/com/campuslove/api/config/JwtAuthenticationFilter.java|103|MEDIUM|?token= 查询参数支持使 JWT 进入 URL,会落入访问日志/Referer/代理日志|token 泄露面扩大(媒体代理已限定路径但日志仍记录)|限制为媒体路径+短时效子 token
api|apps/api/src/main/java/com/campuslove/api/config/JwtAuthenticationFilter.java|160|MEDIUM|每次请求 userRepository.findById 查库(注释自认)|高 QPS 下 DB 压力|缓存角色/状态
api|apps/api/src/main/java/com/campuslove/api/config/JwtAuthenticationFilter.java|123|LOW|黑名单校验先 getJtiFromToken(一次签名解析)再 getUserIdFromToken(第二次解析),每请求 2 次 JWT 解析|CPU 浪费|单次解析复用 Claims
api|apps/api/src/main/java/com/campuslove/api/config/JwtTokenProvider.java|313|LOW|revokeToken 以完整 token 字符串作 Redis key,key 巨大且与 jti 方案并存双写|存储浪费、双实现|统一 jti 黑名单
api|apps/api/src/main/java/com/campuslove/api/config/JwtTokenProvider.java|377|LOW|定时清理 1h 间隔,本地内存黑名单在重启后清空(已注释)|单实例降级场景登出失效|可接受
api|apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java|131|LOW|Swagger/API 文档仅 ADMIN 可访问,但 mock 模式 mock filter 自动注入 ADMIN 角色|mock 环境文档公开|可接受
api|apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java|186|LOW|CORS allowedHeaders 未含 Idempotency-Key(WebConfig 有),两处配置不一致|real 模式跨域幂等头可能被浏览器拦截|统一
api|apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java|179|LOW|CORS 与 WebConfig 双配置源,未来修改需两处同步|漂移风险|收敛一处
api|apps/api/src/main/java/com/campuslove/api/config/WebSocketConfig.java|160|LOW|握手拦截器只校验签名不过期,不查 token 黑名单(CONNECT 阶段才查)|已撤销 token 仍可建立 TCP/WS 连接|握手时查黑名单
api|apps/api/src/main/java/com/campuslove/api/config/WebSocketConfig.java|224|LOW|token 经 Sec-WebSocket-Protocol 明文子协议传输,日志可能记录|token 泄露面|可接受(标准方案)
api|apps/api/src/main/java/com/campuslove/api/config/JwtChannelInterceptor.java|99|LOW|CONNECT 只查完整 token 黑名单,不查 jti 黑名单(与 HTTP 过滤器不一致)|登出 token 的 jti 已撤销但 WS 仍可通过|统一 jti 校验
api|apps/api/src/main/java/com/campuslove/api/config/JwtChannelInterceptor.java|133|LOW|SUBSCRIBE 允许所有 /topic/** 订阅,广播消息无权限粒度|潜在敏感广播|按频道分级
api|apps/api/src/main/java/com/campuslove/api/chat/MessageWebSocketHandler.java|154|MEDIUM|WebSocket 消息 content/kind 无长度与格式校验(REST 的 @Size 校验不作用于 WS),可直接 new ChatMessageRequest 绕过|超大消息刷内存/带宽|WS 侧限长+限频
api|apps/api/src/main/java/com/campuslove/api/chat/MessageWebSocketHandler.java|196|LOW|私信 WS 消息仅推送不落库(与 REST 落库不一致)|消息丢失/顺序问题|统一落库
api|apps/api/src/main/java/com/campuslove/api/chat/MessageWebSocketHandler.java|212|LOW|mock 降级分支直接转发未校验|mock 行为与 real 漂移|可接受(仅 mock)
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatSessionService.java|418|MEDIUM|createSession 的 matchId 兜底把任意数字解析为 userId(代码 TODO 自认),可绕过推荐体系强拉任意用户建会话|骚扰任意用户+会话轰炸|matchId 归属校验
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatSessionService.java|120|LOW|createSession 并发无幂等(Controller 无 @Idempotent),重复点击可建双会话|重复会话|@Idempotent+唯一约束
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatSessionService.java|105|LOW|listSessions 内循环 markExpiredIfDue(每次 save 过期会话)|小写放大|批量更新
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatSessionService.java|90|MEDIUM|getOverview 每次调用推荐服务生成推荐(可能 5 分钟缓存未命中时全量计算)|聊天页首屏慢|复用缓存+异步
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatMessageService.java|113|LOW|引用消息支持任意 messageId(未校验同会话),可引用其他会话消息 ID|信息轻微泄露/错乱|校验同会话
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatMessageService.java|70|LOW|sendMessage 无敏感词过滤(村口/私信均有)|临时聊天可发违规词|补过滤
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatMessageService.java|249|LOW|撤回后 lastMessagePreview 未同步更新,预览仍显示原文|已撤回内容泄露|同步更新预览
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatCleanupService.java|91|LOW|定时任务锁在 finally 释放,而 @Transactional 提交发生在方法返回后(代理),锁早于事务提交释放|多实例短暂并发清理(幂等可容忍)|事务提交后再解锁
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatViewMapper.java|154|MEDIUM|getPartnerInfo 每会话 4 次查询(user+basic+campus+schedule),listSessions 每会话再 +1 次 contactExchange|会话列表 5N 次查询|批量预加载
api|apps/api/src/main/java/com/campuslove/api/chat/TempChatViewMapper.java|74|LOW|toSessionView 全量加载会话消息列表,长会话响应巨大|消息量大时响应膨胀|分页
api|apps/api/src/main/java/com/campuslove/api/chat/RealPrivateMessageService.java|307|MEDIUM|toConversationView 每会话一次 countByConversationIdAndSenderIdNotAndIsRead|会话列表 N+1|批量 group count
api|apps/api/src/main/java/com/campuslove/api/chat/RealPrivateMessageService.java|203|MEDIUM|getMessages 查询即全量标已读(含未翻页的旧消息),GET 副作用|未读计数失真|仅标已读当前页
api|apps/api/src/main/java/com/campuslove/api/chat/RealPrivateMessageService.java|245|MEDIUM|pinConversation 为会话级置顶(双方共享),置顶语义应为每用户独立|A 置顶 B 也看到置顶|每用户置顶字段
api|apps/api/src/main/java/com/campuslove/api/chat/RealPrivateMessageService.java|96|LOW|createOrGetConversation 无唯一约束,并发创建双会话|重复会话|(user_a,user_b) 唯一索引
api|apps/api/src/main/java/com/campuslove/api/chat/RealPrivateMessageService.java|360|LOW|buildQuotePreview 手写字符串 indexOf 解析 JSON|脆弱解析|ObjectMapper
api|apps/api/src/main/java/com/campuslove/api/chat/RealPrivateMessageService.java|131|LOW|发送者校验失败抛 400 语义(应 403)|语义偏差|OperationForbiddenException
api|apps/api/src/main/java/com/campuslove/api/chat/RealNotificationService.java|60|MEDIUM|getNotifications(无分页版)使用 Pageable.unpaged 全量加载,通知多时 OOM/大响应|通知列表膨胀|强制分页
api|apps/api/src/main/java/com/campuslove/api/chat/RealNotificationService.java|129|MEDIUM|signalType 先分页后内存过滤,第 1 页全是另一类型时返回空,需翻多页才见数据|筛选漏数据|SQL 过滤
api|apps/api/src/main/java/com/campuslove/api/chat/RealNotificationService.java|204|MEDIUM|markAllAsRead 全量加载未读再逐条 saveAll|未读量大时内存/写放大|批量 UPDATE
api|apps/api/src/main/java/com/campuslove/api/chat/NotificationController.java|40|LOW|/api/v1/notifications 与 /list 重复;unread-count 与 /count 重复;read 与 /read-with-user 重复|重复端点未清理|统一收敛
api|apps/api/src/main/java/com/campuslove/api/chat/RealInteractionEventService.java|152|MEDIUM|markAllAsRead 全量加载未读事件再 saveAll|写放大|批量 UPDATE
api|apps/api/src/main/java/com/campuslove/api/chat/RealInteractionEventService.java|170|MEDIUM|toInteractionEventView 每事件一次 findById 查触发用户|事件列表 N+1|批量预加载
api|apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java|176|LOW|setForceQueued/setNextQueueStatus 在 real 实现为空壳,mock 有状态|Mock/Real 行为漂移|删除或实现
api|apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java|221|LOW|getLikedMe/getMyLikes 无分页,喜欢列表全量返回|列表膨胀|分页
api|apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java|256|LOW|getVisitors 无分页全量访客|同上|分页
api|apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java|288|LOW|getHeartSignals 无分页|同上|分页
api|apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java|336|MEDIUM|rewind 的限额检查与计数递增非原子(GET+INCR 分离),并发请求可绕过每日 1 次限制|限额绕过|Lua/INCR 原子判断
api|apps/api/src/main/java/com/campuslove/api/match/MatchPolicy.java|62|MEDIUM|checkRewindLimit 与 incrementRewindCount 分离,Redis GET 与 INCR 非原子|并发绕过限额|INCR 返回值判断
api|apps/api/src/main/java/com/campuslove/api/match/MatchPolicy.java|122|LOW|localRewindCount 本地内存与 Redis 双写,多实例下各实例计数不一致|计数漂移|统一 Redis
api|apps/api/src/main/java/com/campuslove/api/match/MatchEngine.java|153|HIGH|findAndScoreCandidates 每候选调用 calculateMatchScore→3 次查询(campus/basic/schedule),50 候选=150+ 查询/次匹配|创建匹配接口极慢,DB 压力大|批量预加载(Map 复用,参照 RecommendationStrategy)
api|apps/api/src/main/java/com/campuslove/api/match/MatchEngine.java|186|HIGH|calculateMatchScore 内 3 次独立查询是 N+1 根因|同上|批量查询注入
api|apps/api/src/main/java/com/campuslove/api/match/MatchEngine.java|148|MEDIUM|候选池固定取前 50 用户,未按活跃/资料完整度过滤,大量无资料用户占据候选|匹配质量差|SQL 过滤
api|apps/api/src/main/java/com/campuslove/api/match/RealIcebreakerService.java|90|MEDIUM|getIcebreakers(matchId) 无归属校验,任意用户枚举 matchId 获取匹配双方共同兴趣/学校等推荐内容|间接泄露双方资料交集|参与者校验
api|apps/api/src/main/java/com/campuslove/api/match/RealIcebreakerService.java|156|LOW|getProfileBasedIcebreakers(peerUserId) 无调用方关系校验(当前无 Controller 暴露,留隐患)|未来暴露即隐私泄露|调用点校验
api|apps/api/src/main/java/com/campuslove/api/match/RealIcebreakerService.java|180|LOW|破冰话题内容直接嵌入对方兴趣/学校/专业,内容模板可被枚举|资料词泄露|模板不含原始值
api|apps/api/src/main/java/com/campuslove/api/match/RealIcebreakerService.java|392|LOW|buildCommonAnswerIcebreakers 加载对方全部回答列表|小性能|limit 5
api|apps/api/src/main/java/com/campuslove/api/match/MatchController.java|334|LOW|getIcebreakers 无 @PreAuthorize(仅依赖全局认证)|可接受|无
api|apps/api/src/main/java/com/campuslove/api/match/MatchController.java|363|LOW|GET /api/v1/matches/dto 恒返回空列表(TODO 自认)|死代码端点|删除
api|apps/api/src/main/java/com/campuslove/api/match/MatchController.java|393|LOW|MatchRequest.timeWindow @NotBlank 必填但 doCreateMatch 未使用该字段|多余必填字段|调整校验
api|apps/api/src/main/java/com/campuslove/api/profile/RealProfileService.java|58|HIGH|构造器用 new 手动实例化 ProfileQueryService/ProfileUpdateService,组件 @Component 同时被容器实例化,双实例并存;new 出的实例 @Transactional(readOnly)/@Cacheable 全部失效|代理注解失效、行为漂移、内存双份|改为构造器注入组件
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileQueryService.java|123|MEDIUM|readOnly 事务注解因上述 new 实例化而失效|只读优化丢失|同上
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileUpdateService.java|161|LOW|saveBasicProfile 每次重算 profileCompletion(多次查询)|写路径查询放大|增量更新
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileUpdateService.java|451|LOW|rebuildView 每次上传后 save user+重算完善度|上传路径额外写|合并
api|apps/api/src/main/java/com/campuslove/api/profile/FollowService.java|81|MEDIUM|followUser 的 followingCount/followersCount 读-改-写非原子|并发关注计数丢失|原子 UPDATE
api|apps/api/src/main/java/com/campuslove/api/profile/FollowService.java|134|MEDIUM|unfollowUser 同(读-改-写非原子)|同上|同上
api|apps/api/src/main/java/com/campuslove/api/profile/FollowService.java|72|LOW|关注无每日上限|刷粉|限额
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileVisitorController.java|108|MEDIUM|listVisitors 无分页全量加载访客记录|高频访问用户响应膨胀|分页
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileVisitorController.java|196|LOW|recordVisit 每次校验目标用户存在(1 次查询)|小性能|可接受
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileController.java|132|LOW|uploadPhoto 的 index 参数无 @Min/@Max 注解(靠 Service 校验)|防御不足|加注解
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileController.java|266|LOW|BasicProfileRequest 4 个必填字段(向后兼容)导致部分更新场景被迫传旧值|API 可用性|可选化
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileUpdateService.java|192|LOW|uploadPhoto 索引校验 OK|无
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileUpdateService.java|124|LOW|saveBasicProfile 未做敏感词过滤(nickname/bio)|资料可含违规词|过滤
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileUpdateService.java|436|LOW|deleteOldMediaQuietly 删除旧文件无归属二次校验(依赖 URL 前缀)|低风险|可加归属
api|apps/api/src/main/java/com/campuslove/api/user/RealOnlineStatusService.java|48|LOW|updateHeartbeat 每次写库,5 分钟心跳高并发写|写放大|Redis 心跳
api|apps/api/src/main/java/com/campuslove/api/user/RealOnlineStatusService.java|88|LOW|getOnlineStatus 公开任意用户在线状态/设备类型|隐私暴露(设计如此)|可接受
api|apps/api/src/main/java/com/campuslove/api/user/RealOnlineStatusService.java|153|LOW|checkAndMarkOfflineUsers 无 @Scheduled 调度点(方法存在但未被定时调用)|在线状态永不过期|补定时任务+分布式锁
api|apps/api/src/main/java/com/campuslove/api/user/UserController.java|122|LOW|在线状态端点无缓存,高频轮询打库|DB 压力|缓存
api|apps/api/src/main/java/com/campuslove/api/wallet/WalletServiceImpl.java|92|MEDIUM|initWallet 在 orElseGet 内 save,并发首笔交易双初始化,唯一约束冲突被当幂等冲突重查→抛 500|并发首笔扣款失败(资金安全无损)|catch 后重查钱包
api|apps/api/src/main/java/com/campuslove/api/wallet/WalletServiceImpl.java|82|LOW|幂等命中不校验 userId 与流水一致性|调用方传错 userId 时返回他人余额|校验 userId
api|apps/api/src/main/java/com/campuslove/api/wallet/WalletServiceImpl.java|259|LOW|writeTransactionLog 注释称"独立 try-catch"但实际无 catch,文档与实现不符|文档漂移|修正
api|apps/api/src/main/java/com/campuslove/api/vip/VipRedPacketService.java|353|MEDIUM|过期分支 setStatus(EXPIRED)+save 后 throw IllegalArgumentException,事务回滚使状态更新失效|红包永不为 EXPIRED,过期红包状态滞留|noRollbackFor 或拆事务
api|apps/api/src/main/java/com/campuslove/api/vip/VipRedPacketService.java|458|LOW|getRedPacketDetail(无 userId 版本)仍存在(未暴露,留后门风险)|未来误用即 IDOR|删除
api|apps/api/src/main/java/com/campuslove/api/vip/VipRedPacketService.java|553|MEDIUM|calculateClaimAmount 基于实体 claimedAmount/claimedCount 计算,与原子扣减后的 remaining 不同步时有偏差|拼手气金额分配边缘错误|改用 remaining 字段
api|apps/api/src/main/java/com/campuslove/api/vip/VipRedPacketService.java|195|LOW|创建红包锁在事务内获取,finally 解锁早于事务提交|锁窗口语义偏差(DB 行锁兜底)|可接受
api|apps/api/src/main/java/com/campuslove/api/vip/VipRedPacketService.java|419|LOW|newClaimedCount/newRemainingCount 基于旧实体值仅用于日志与返回|展示值可能偏差|重查
api|apps/api/src/main/java/com/campuslove/api/vip/AutoRenewService.java|248|MEDIUM|renewVip 每次调用生成全新 orderNo,幂等键失效;若定时任务重复调度将重复扣款|重复扣费风险|按"用户+周期"生成稳定 orderNo
api|apps/api/src/main/java/com/campuslove/api/vip/AutoRenewService.java|238|LOW|renewVip 无自动调度入口(仅 Controller 开关),自动续费实际不会自动触发|功能未闭环|补定时任务+分布式锁
api|apps/api/src/main/java/com/campuslove/api/vip/AutoRenewService.java|422|LOW|writeBillingLog 吞 DataAccessException,对账流水可能缺失|对账缺口|告警
api|apps/api/src/main/java/com/campuslove/api/vip/BillingService.java|230|MEDIUM|handlePaymentCallback 无任何 HTTP 入口(支付回调未接入),且幂等仅按 notification_id,transaction_id 为普通索引非唯一(注释自认)|未来接入即存在伪造回调/重复开通 VIP 风险;当前支付-权益闭环断裂|接入时加签名验证+orderNo 唯一
api|apps/api/src/main/java/com/campuslove/api/vip/BillingService.java|248|MEDIUM|同一 orderNo 不同 notificationId 可重复回调,每次 +30 天 VIP|VIP 无限顺延|按 orderNo 幂等
api|apps/api/src/main/java/com/campuslove/api/vip/BillingService.java|264|LOW|金额对账依赖 vip_bills.amount 本身,若账单可被篡改则对账失效|对账前提脆弱|账单不可变+签名
api|apps/api/src/main/java/com/campuslove/api/vip/BillingService.java|113|LOW|listBills(无分页版)保留,全量账单|列表膨胀|删除
api|apps/api/src/main/java/com/campuslove/api/vip/PromoCodeService.java|113|LOW|redeem 仅消耗优惠码未与订单/支付绑定,可被反复用于预览|业务闭环不完整|绑定订单
api|apps/api/src/main/java/com/campuslove/api/vip/PromoCodeService.java|199|LOW|validatePromoCode 中单用户次数 count 查询在悲观锁内,可接受|无
api|apps/api/src/main/java/com/campuslove/api/campus/RealCampusService.java|204|MEDIUM|getCampusPosts(schoolId,page) 完全忽略 schoolId,返回全站帖子|同校流功能错误|按 schoolId 过滤
api|apps/api/src/main/java/com/campuslove/api/campus/RealCampusService.java|245|MEDIUM|getCampusActivities 同样忽略 schoolId|同上|同上
api|apps/api/src/main/java/com/campuslove/api/campus/RealCampusService.java|83|LOW|getCampusTopic 的 viewCount 读-改-写非原子|浏览计数丢失|原子 UPDATE
api|apps/api/src/main/java/com/campuslove/api/campus/RealCampusService.java|179|MEDIUM|replyCampusTopic 的 replyCount 读-改-写非原子|并发回复计数丢失|原子 UPDATE
api|apps/api/src/main/java/com/campuslove/api/campus/CampusController.java|88|MEDIUM|listTopics 全量加载后内存分页,话题量大时全表传输|性能与内存问题|SQL 分页
api|apps/api/src/main/java/com/campuslove/api/campus/CampusController.java|163|MEDIUM|listReplies 同样全量加载内存分页|同上|同上
api|apps/api/src/main/java/com/campuslove/api/campus/CampusController.java|245|MEDIUM|resolveSchoolId 使用 campusName.hashCode() 作业务 ID,哈希不稳定且可碰撞|话题归属可能错乱、跨 JVM 不一致|用真实 schoolId/主键
api|apps/api/src/main/java/com/campuslove/api/campus/RealCampusCertificationService.java|83|LOW|重新提交认证覆盖旧记录,旧学生证文件未删除|文件堆积|删除旧文件
api|apps/api/src/main/java/com/campuslove/api/campus/RealCampusCertificationService.java|65|LOW|studentIdCardUrl 无格式/归属校验(可传任意 URL)|脏数据|校验
api|apps/api/src/main/java/com/campuslove/api/campus/CampusController.java|227|LOW|认证提交 studentIdCardUrl 无长度限制|超长 URL|@Size
api|apps/api/src/main/java/com/campuslove/api/growth/RealCheckInService.java|420|MEDIUM|补签配额 usedCount 读-改-写非原子,并发补签不同日期可超配额|配额绕过|原子 INCR 或行锁
api|apps/api/src/main/java/com/campuslove/api/growth/RealCheckInService.java|385|LOW|补签扣费(积分)与配额扣减无原子一致性(未见积分事务),部分失败状态不一致|补签计费漂移|同一事务
api|apps/api/src/main/java/com/campuslove/api/growth/RealCheckInService.java|546|MEDIUM|getHotTopicCount 取全站前 20 帖再内存过滤"今日",老帖占位导致今日计数为 0|统计语义错误|SQL 按日过滤
api|apps/api/src/main/java/com/campuslove/api/growth/RealCheckInService.java|210|LOW|重复签到路径仍执行 2 次统计查询|小性能|缓存
api|apps/api/src/main/java/com/campuslove/api/growth/RealCheckInService.java|666|LOW|calculateTotalExtraQuota 基于"连续天数"而非累计签到天数计算配额|配额语义偏差|按累计
api|apps/api/src/main/java/com/campuslove/api/growth/RealPushSummaryService.java|140|MEDIUM|每帖 2 次查询(countByPostId + 全部评论再内存过滤),用户帖子多时 N×2 查询|推送摘要生成慢|SQL 聚合
api|apps/api/src/main/java/com/campuslove/api/growth/RealPushSummaryService.java|126|LOW|访客/喜欢全量加载后内存过滤 24h|小放大|时间过滤下推
api|apps/api/src/main/java/com/campuslove/api/growth/RealPushSummaryService.java|111|LOW|摘要"今日已生成"依赖查询判断,并发生成重复|重复推送|唯一约束
api|apps/api/src/main/java/com/campuslove/api/growth/RealAppConfigService.java|(未展开)|LOW|App 配置服务默认值实现,与 DB 配置未打通|功能未闭环|接入 DB
api|apps/api/src/main/java/com/campuslove/api/growth/CheckInController.java|35|LOW|checkIn 无 @RateLimit(依赖幂等+Redis 锁)|可接受|无
api|apps/api/src/main/java/com/campuslove/api/home/RealHomeService.java|79|MEDIUM|getDashboard 聚合 5+ 子服务(推荐/签到/每日一问/活动/帖子),无缓存无并行|首页接口慢且 DB 压力大|并行化+缓存
api|apps/api/src/main/java/com/campuslove/api/home/RealHomeService.java|258|LOW|热门帖子按全局点赞取前 3,可能长期不变|首页内容固化|时间窗加权
api|apps/api/src/main/java/com/campuslove/api/village/VillageController.java|127|LOW|getPostDetail 未认证可访问(依赖全局 authenticated)|可接受|无
api|apps/api/src/main/java/com/campuslove/api/discover/ActivityController.java|49|LOW|活动列表 campusName 无长度校验|弱校验|@Size
api|apps/api/src/main/java/com/campuslove/api/report/ReportController.java|59|LOW|举报无每日限额/重复举报检查,可无限骚扰审核队列|审核资源滥用|限额+去重
api|apps/api/src/main/java/com/campuslove/api/chat/VideoCallService.java|47|MEDIUM|RINGING_TIMEOUT_SEC 定义后无定时任务执行超时,未接听通话永久 RINGING|状态泄漏|补超时任务(带分布式锁)
api|apps/api/src/main/java/com/campuslove/api/chat/VideoCallService.java|51|MEDIUM|MAX_CALL_DURATION_SEC 仅用于计算展示时长,不触发自动挂断|超长通话状态滞留|定时强制结束
api|apps/api/src/main/java/com/campuslove/api/chat/VideoCallController.java|58|MEDIUM|startCall 无 @RateLimit、无双方关系校验,任意用户可轰炸任意用户呼叫|骚扰+记录堆积|限流+关系校验
api|apps/api/src/main/java/com/campuslove/api/chat/VideoCallService.java|228|LOW|getRecords 无分页全量通话记录|列表膨胀|分页
api|apps/api/src/main/java/com/campuslove/api/ai/AiVideoController.java|57|MEDIUM|AI 生成接口无 @RateLimit/配额/计费控制,登录用户可无限调用付费上游|成本被刷爆|按用户配额+限流
api|apps/api/src/main/java/com/campuslove/api/ai/AiVideoController.java|59|LOW|请求体 Map 无字段与大小限制,可传任意参数透传上游|滥用|Schema 校验
api|apps/api/src/main/java/com/campuslove/api/ai/RealAiVideoService.java|222|LOW|上游响应非 JSON 时"原样透传",可能泄露上游内部错误信息|信息泄露边缘|脱敏
api|apps/api/src/main/java/com/campuslove/api/auth/WeChatClient.java|145|LOW|fallback 日志记录完整 code(临时凭证)|凭证泄露边缘|脱敏
api|apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java|463|LOW|历史明文密码 equals 比较(非 constant-time)+自动迁移|时序攻击边缘/技术债|一次性迁移后移除
api|apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java|579|LOW|openid SHA-256 无盐(与第三方登录重复实现)|字典攻击风险|统一 KDF
api|apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java|251|LOW|findOrCreateUserForWechatLogin 公开方法+重试 2 次,唯一约束冲突重试逻辑 OK|无
api|apps/api/src/main/java/com/campuslove/api/auth/AuthController.java|99|LOW|wechat-login 旧路径保留与 /auth/wechat 重复|重复端点|迁移后删除
api|apps/api/src/main/java/com/campuslove/api/auth/AuthController.java|304|LOW|AdminLoginRequest 无密码长度上限,超大密码触发 BCrypt 高 CPU|DoS 边缘|@Size(max=128)
api|apps/api/src/main/java/com/campuslove/api/ratelimit/RateLimitAspect.java|152|MEDIUM|限流键基于 request.remoteAddr,未取 X-Forwarded-For;反向代理后全站共享代理 IP 或被代理池绕过;本地内存桶多实例不共享|限流失效/误伤|统一网关 IP+Redis 桶
api|apps/api/src/main/java/com/campuslove/api/ratelimit/RateLimitBucketRegistry.java|117|LOW|桶清理无分布式锁(本地内存,可容忍)|多实例各自清理|可接受
api|apps/api/src/main/java/com/campuslove/api/common/IdempotentInterceptor.java|96|LOW|Idempotency-Key 无长度上限,超长头生成超长 Redis key|资源滥用|@Size 校验头
api|apps/api/src/main/java/com/campuslove/api/common/IdempotentInterceptor.java|133|LOW|幂等 key 在业务失败后仍占位至 TTL,用户无法重试(需换 key)|可用性|失败删除 key
api|apps/api/src/main/java/com/campuslove/api/common/Idempotent.java|19|LOW|默认 TTL 24h 过长,写失败场景 24h 内无法重试|可用性|缩短默认
api|apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java|151|LOW|余额不足响应体回显 userId/金额/余额,虽属本人数据但放大攻击面|信息冗余|精简
api|apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java|90|LOW|校验错误消息含字段名与默认消息,可被用于探测字段结构|低风险|可接受
api|apps/api/src/main/java/com/campuslove/api/mq/MessageProducer.java|87|MEDIUM|MQ 不可用时消息静默丢弃(仅日志),事件表补偿未实现(注释自认 FIN-00046)|通知/匹配事件丢失|outbox 模式
api|apps/api/src/main/java/com/campuslove/api/mq/MatchEventConsumer.java|98|MEDIUM|消费异常全部吞掉不重投,消息丢失|通知丢失|重试+死信
api|apps/api/src/main/java/com/campuslove/api/mq/MatchEventConsumer.java|116|LOW|match 事件处理非幂等,重复投递产生重复通知|重复通知|幂等键
api|apps/api/src/main/java/com/campuslove/api/search/UserIndexSyncListener.java|54|LOW|ES 索引同步为桩实现(仅日志),认证通过后搜索索引不同步|功能未完成|接入 ES
api|apps/api/src/main/java/com/campuslove/api/clientconfig/RealConfigService.java|142|LOW|客户端配置全部为硬编码默认值,未接 DB/CMS(注释自认)|运营无法配置|接 DB+缓存
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|449|LOW|getSimilarAuthors 候选池固定 200 用户,用户量增长后新用户不可见|推荐覆盖不足|动态分页
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|443|LOW|followedUserIds 全量加载关注列表|关注量大时内存|分页
api|apps/api/src/main/java/com/campuslove/api/village/PostTagController.java|49|LOW|getPostsByTag 返回 List 无分页元数据|前端无法翻页|返回 Page
api|apps/api/src/main/java/com/campuslove/api/village/PostTagController.java|51|LOW|tagName 无长度/存在性校验|弱校验|@Size
api|apps/api/src/main/java/com/campuslove/api/chat/ChatRedPacketController.java|(未逐行)|LOW|聊天红包控制器与 VipRedPacketController 职责重叠|重复入口|收敛
api|apps/api/src/main/java/com/campuslove/api/chat/InteractionEventController.java|(未逐行)|LOW|互动事件端点与 NotificationController 功能重叠|重复|收敛
api|apps/api/src/main/java/com/campuslove/api/admin/AdminAuditLogService.java|49|LOW|审计异步线程池满时(队列溢出)审计丢失无告警|审计缺口|有界队列+告警
api|apps/api/src/main/java/com/campuslove/api/debug/ErrorSimulationController.java|19|LOW|debug 控制器 @Profile("mock") 保护 OK|无
api|apps/api/src/main/java/com/campuslove/api/debug/MatchDebugController.java|19|LOW|同上|无
api|apps/api/src/main/resources/application-db.yml|65|MEDIUM|Flyway 管理员初始化 ADMIN_OPENID 默认 admin-default-openid-change-me,未配置时公开占位 openid 入库|默认凭据风险(配合密码哈希默认值)|强制配置
api|apps/api/src/main/resources/application-db.yml|81|MEDIUM|admin_password_hash 含硬编码默认 BCrypt 哈希,虽注释称无已知明文,但属"默认凭据"反模式|一旦被破解即为默认后门|启动强制校验非默认值
api|apps/api/src/main/resources/application-db.yml|97|LOW|RabbitMQ 默认 guest/guest 凭据|内网凭据默认值|强制配置
api|apps/api/src/main/resources/application-db.yml|52|LOW|Redis 连接池 max-wait 默认 -1 无限等待,连接耗尽时线程永久阻塞|故障时线程堆积|设正数
api|apps/api/src/main/resources/application.yml|188|LOW|JWT_SECRET 默认空(启动校验兜底),依赖 JwtConfig.validateSecret|配置依赖运行时校验,OK|无
api|apps/api/src/main/resources/application.yml|174|LOW|CORS 默认空,生产未配置时同源限制(安全但前端跨域失败)|部署需显式配置|文档
api|apps/api/src/main/java/com/campuslove/api/config/JwtConfig.java|(未逐行)|LOW|JWT 24h 有效期无 refresh token 轮换策略|长生命周期 token|缩短+刷新
api|apps/api/src/main/java/com/campuslove/api/chat/MockTempChatService.java|94|LOW|mock 实现消息预览逻辑与 real 不一致|行为漂移|可接受(mock)
api|apps/api/src/main/java/com/campuslove/api/match/MockMatchService.java|(未逐行)|LOW|mock 匹配服务状态机与 real 漂移|联调误导|对齐
api|apps/api/src/main/java/com/campuslove/api/growth/MockCheckInService.java|(未逐行)|LOW|mock 签到无 Redis 锁/DB 约束,行为与 real 不同|联调误导|可接受
api|apps/api/src/main/java/com/campuslove/api/monitor/PaymentMetrics.java|101|LOW|recordRedPacketSent 注释掉的埋点代码残留|死代码|清理
api|apps/api/src/main/java/com/campuslove/api/monitor/MatchMetrics.java|120|LOW|推荐耗时 Timer 在缓存命中路径不记录|监控盲区|可接受
api|apps/api/src/main/java/com/campuslove/api/config/AsyncConfig.java|(未逐行)|LOW|@Async 默认线程池队列 200,满时任务拒绝|异步任务丢失|监控+有界策略
api|apps/api/src/main/java/com/campuslove/api/config/RabbitConfig.java|(未逐行)|LOW|MQ 不可用时 MessagingFallback 降级日志,无自动恢复重连告警|静默降级|告警
api|apps/api/src/main/java/com/campuslove/api/entity/Post.java|103|LOW|category 默认 all,与 CreatePostRequest 必填语义重复|无
api|apps/api/src/main/java/com/campuslove/api/repository/PrivateMessageRepository.java|86|LOW|markAsReadByConversationAndSenderNot 批量更新无 @Modifying 事务内 flush 顺序问题(@Modifying 已标注)|需确认 clearAutomatically|加 clearAutomatically=true
api|apps/api/src/main/java/com/campuslove/api/repository/HeartSignalRepository.java|64|LOW|FUNCTION('DATE',...) 依赖 MySQL 方言,测试库(HSQL)不可用|可移植性|方言抽象
api|apps/api/src/main/java/com/campuslove/api/repository/UserCampusProfileRepository.java|37|LOW|GROUP BY campusName 统计为全表扫描,数据量大时慢(admin 统计缓存兜底)|可接受|无
api|apps/api/src/main/java/com/campuslove/api/repository/UserRepository.java|49|LOW|GROUP BY pronouns/gradeLabel 全表扫描|同上|无
api|apps/api/src/main/java/com/campuslove/api/config/RedisConfig.java|(未逐行)|LOW|缓存 TTL 配置分散(CacheNames 常量),部分缓存无统一过期策略|配置漂移|集中管理
api|apps/api/src/main/java/com/campuslove/api/config/CaffeineCacheConfig.java|(未逐行)|LOW|本地缓存与 Redis 双缓存一致性由 TTL 保证,更新时可能读到旧值|一致性窗口|双删/版本号
api|apps/api/src/main/java/com/campuslove/api/config/TraceIdFilter.java|(未逐行)|LOW|traceId 未在响应头统一输出(部分错误路径有)|排查困难|统一过滤器输出
api|apps/api/src/main/java/com/campuslove/api/config/OpenApiConfig.java|(未逐行)|LOW|Swagger 仅 ADMIN 可访问但接口定义含全量字段结构|信息暴露边缘|可接受
api|apps/api/src/main/java/com/campuslove/api/admin/AdminCertificationController.java|(未逐行)|LOW|认证审核操作无审计日志(不在 AdminAuditLogController 范围)|审核无痕|补审计
api|apps/api/src/main/java/com/campuslove/api/admin/AdminReportController.java|(未逐行)|LOW|举报处理无操作者审计字段(仅处理状态)|审计缺口|补处理人
api|apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java|113|MEDIUM|反馈附件上传返回 /uploads/ 前缀 URL,同样受 denyAll 影响不可访问|反馈图片不可见|统一媒体代理 URL
api|apps/api/src/main/java/com/campuslove/api/feedback/FeedbackService.java|94|MEDIUM|UploadedImageResult 文档示例仍为 /uploads/ 路径|同上|同上
api|apps/api/src/main/java/com/campuslove/api/chat/PrivateMessageController.java|61|LOW|createConversation 未校验 userB 是否存在(service 仅建会话)|对不存在用户建会话|存在性校验
api|apps/api/src/main/java/com/campuslove/api/chat/PrivateMessageController.java|140|LOW|SendMessageRequest.content 无 @NotBlank(仅 @Size),空内容可发|脏消息|@NotBlank
api|apps/api/src/main/java/com/campuslove/api/chat/ChatController.java|36|LOW|overview 端点直接委托 TempChatService,real/mock 行为差异大|联调漂移|可接受
api|apps/api/src/main/java/com/campuslove/api/config/MockSecurityConfig.java|121|LOW|mock 模式 anyRequest().permitAll 对非 /api 路径(如内部端点)全放行|mock 环境暴露面|可接受(仅 mock)
api|apps/api/src/main/java/com/campuslove/api/config/WebConfig.java|124|LOW|WebMvc CORS 与 Security CORS 双实现,real 优先级依赖 Bean 注册顺序|潜在不一致|统一
api|apps/api/src/main/java/com/campuslove/api/village/VillageQueryService.java|257|LOW|getCampusCategoryPosts 两步查询(先查同校 userId 再 IN 查询),同校人数多时 IN 列表巨大|SQL 过长|JOIN 过滤
api|apps/api/src/main/java/com/campuslove/api/discover/RealCircleService.java|117|LOW|getCircles 全量圈子列表无分页|圈子多时响应大|可接受(圈子量小)
api|apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java|121|LOW|doCreateMatch 用户存在性校验 findById 后即弃|小查询|existsById
api|apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java|129|LOW|候选为空时返回 pending 队列状态,无重试/通知机制|用户永远排队|补定时重试
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileQueryService.java|251|LOW|getProfileStats 多次 count 查询(likes 等)|统计查询放大|缓存
api|apps/api/src/main/java/com/campuslove/api/profile/ProfileQueryService.java|315|LOW|用户帖子遍历统计,帖子多时放大|同上|SQL 聚合
api|apps/api/src/main/java/com/campuslove/api/village/VillageController.java|242|LOW|similar-authors 每请求执行 200 候选池全量评分,无缓存|性能|缓存
api|apps/api/src/main/java/com/campuslove/api/discover/RecommendationRanker.java|174|LOW|buildHistory 无分页上限|历史列表膨胀|分页
api|apps/api/src/main/java/com/campuslove/api/growth/RealDoNotDisturbService.java|109|LOW|customWeekdays 字符串解析脆弱(手写 split)|健壮性|结构化存储
api|apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java|(未逐行)|LOW|微信订阅消息推送无重试/幂等|推送丢失|重试
api|apps/api/src/main/java/com/campuslove/api/campus/event/CertificationApprovedEvent.java|21|LOW|事件同步发布,订阅方异常被 RealCampusCertificationService catch 吞掉|订阅方失败静默|告警
api|apps/api/src/main/java/com/campuslove/api/admin/event/ConfigUpdatedEvent.java|21|LOW|配置事件同步发布,订阅方拉长事务(前面已报)|同上
api|apps/api/src/main/java/com/campuslove/api/common/BusinessException.java|(未逐行)|LOW|业务异常 message 直接透传客户端,含 userId 等上下文|信息冗余|模板化
api|apps/api/src/main/java/com/campuslove/api/config/RedisHealthIndicator.java|(未逐行)|LOW|Redis 健康检查在 mock 模式可能误报 DOWN|运维噪音|profile 隔离
api|apps/api/src/main/java/com/campuslove/api/config/DatabaseConfigValidator.java|(未逐行)|LOW|启动校验逻辑与 Flyway 迁移耦合|启动慢|可接受
```

**领域总结**(10 行内):
- 共 300+ 条;严重度分布:CRITICAL 2(第三方登录身份伪造×2 入口)、HIGH 15(媒体访问链路断裂 3、bulk+flush 并发覆盖 5、语音删除 IDOR 2、AES 默认密钥 1、MatchEngine N+1 2、Profile new 实例化 1)、MEDIUM 约 130、LOW 约 155。
- 最突出:C 位安全是"第三方登录信任客户端身份标识"与"媒体 URL/授权链路断裂(uploads 被 denyAll 且代理仅限本人)"两大体系性问题。
- 并发类:多处"bulk UPDATE + managed 实体回写"使既有的 FIN-00018/00038/00040"原子计数修复"实际失效,需统一改为 bulk 后 clear 或重查。
- 性能类:MatchEngine/RealCircleService/RealPushSummaryService/TempChatViewMapper 仍存在 N+1;多处列表接口无分页或内存分页。
- 技术债:Mock/Real 行为漂移、废弃端点(dto/preferences/重复读接口)、注释与实现漂移(deletePost 评论清理、writeBillingLog try-catch)未清理。
- 资金类:钱包/红包/优惠码主链路防护完善;薄弱点在 AutoRenew 无调度入口与 BillingService 回调未接入(一旦暴露即高危)。
- 建议优先修复:① 第三方登录验签;② 媒体 URL 生成与授权模型;③ 原子计数修复失效;④ AI 接口成本控制;⑤ 定时任务(AutoRenew/VideoCall 超时)补全。
