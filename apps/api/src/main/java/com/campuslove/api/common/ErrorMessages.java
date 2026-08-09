package com.campuslove.api.common;

/**
 * 公共错误消息常量（R4-00345 起：后端中文提示收敛统一）。
 *
 * <p>设计背景：本项目为中文面向产品，后端错误消息保留中文是合理的商业决策；
 * 本类将散落在 controller/service 中的高频硬编码中文消息收敛为单一常量源，
 * 消除同义字符串重复、统一文案风格。后续若需走 MessageSource i18n，
 * 只需将常量值替换为消息资源 key 或在本类内接入解析。</p>
 *
 * <p>使用约定：</p>
 * <ul>
 *   <li>完整消息常量直接引用：{@code throw new IllegalArgumentException(ErrorMessages.X)}</li>
 *   <li>带参数消息：常量 + 拼接（常量命名为 *_PREFIX 的为不含尾部变量的前缀部分）</li>
 *   <li>Bean Validation 注解 {@code message = ErrorMessages.X}（编译期常量，可直接引用）</li>
 * </ul>
 *
 * @see com.campuslove.api.config.I18nConfig
 * @since R4 (batch-4)
 */
public final class ErrorMessages {

    private ErrorMessages() {
    }

    // ============ 通用参数校验 ============
    /** userId 不能为空 */
    public static final String USER_ID_REQUIRED = "userId 不能为空";

    /** 用户 ID 不能为空 */
    public static final String USER_ID_CN_REQUIRED = "用户 ID 不能为空";

    /** 当前用户 ID 不能为空 */
    public static final String CURRENT_USER_ID_REQUIRED = "当前用户 ID 不能为空";

    /** 目标用户 ID 不能为空 */
    public static final String TARGET_USER_ID_REQUIRED = "目标用户 ID 不能为空";

    /** 发起方用户 ID 不能为空 */
    public static final String CALLER_USER_ID_REQUIRED = "发起方用户 ID 不能为空";

    /** 接收方用户 ID 不能为空 */
    public static final String CALLEE_USER_ID_REQUIRED = "接收方用户 ID 不能为空";

    /** 操作用户 ID 不能为空 */
    public static final String OPERATOR_USER_ID_REQUIRED = "操作用户 ID 不能为空";

    /** 通话房间 ID 不能为空 */
    public static final String ROOM_ID_REQUIRED = "通话房间 ID 不能为空";

    /** 会话 ID 不能为空 */
    public static final String SESSION_ID_REQUIRED = "会话 ID 不能为空";

    /** userId 和 triggerUserId 不能为空 */
    public static final String USER_AND_TRIGGER_USER_ID_REQUIRED = "userId 和 triggerUserId 不能为空";

    /** userId 和 matchUserId 不能为空 */
    public static final String USER_AND_MATCH_USER_ID_REQUIRED = "userId 和 matchUserId 不能为空";

    /** userId 和 peerUserId 不能为空 */
    public static final String USER_AND_PEER_USER_ID_REQUIRED = "userId 和 peerUserId 不能为空";

    /** userId 和 targetUserId 不能为空 */
    public static final String USER_AND_TARGET_USER_ID_REQUIRED = "userId 和 targetUserId 不能为空";

    /** eventId 和 userId 不能为空 */
    public static final String EVENT_AND_USER_ID_REQUIRED = "eventId 和 userId 不能为空";

    /** authorId 不能为空 */
    public static final String AUTHOR_ID_REQUIRED = "authorId 不能为空";

    /** schoolId 不能为空 */
    public static final String SCHOOL_ID_REQUIRED = "schoolId 不能为空";

    /** category 不能为空 */
    public static final String CATEGORY_REQUIRED = "category 不能为空";

    /** title 不能为空 */
    public static final String TITLE_REQUIRED = "title 不能为空";

    /** topicId 不能为空 */
    public static final String TOPIC_ID_REQUIRED = "topicId 不能为空";

    /** content 不能为空 */
    public static final String CONTENT_REQUIRED = "content 不能为空";

    /** 标题不能为空 */
    public static final String TITLE_REQUIRED_CN = "标题不能为空";

    /** 内容不能为空 */
    public static final String CONTENT_REQUIRED_CN = "内容不能为空";

    /** 回复内容不能为空 */
    public static final String REPLY_CONTENT_REQUIRED = "回复内容不能为空";

    /** code 不能为空 */
    public static final String CODE_REQUIRED = "code 不能为空";

    /** code 长度不能超过 32 */
    public static final String CODE_MAX_LENGTH = "code 长度不能超过 32";

    /** provider 不能为空 */
    public static final String PROVIDER_REQUIRED = "provider 不能为空";

    /** openId 不能为空 */
    public static final String OPEN_ID_REQUIRED = "openId 不能为空";

    /** rawPassword 不能为空 */
    public static final String RAW_PASSWORD_REQUIRED = "rawPassword 不能为空";

    /** rawPassword 不能为 null */
    public static final String RAW_PASSWORD_NOT_NULL = "rawPassword 不能为 null";

    /** matchId 不能为空 */
    public static final String MATCH_ID_REQUIRED = "matchId 不能为空";

    /** identityToken 不能为空 */
    public static final String IDENTITY_TOKEN_REQUIRED = "identityToken 不能为空";

    /** Token 不能为空 */
    public static final String TOKEN_REQUIRED = "Token 不能为空";

    /** 套餐 ID 不能为空 */
    public static final String PLAN_ID_REQUIRED = "套餐 ID 不能为空";

    /** 规则 ID 不能为空 */
    public static final String RULE_ID_REQUIRED = "规则 ID 不能为空";

    /** 订单号不能为空 */
    public static final String ORDER_NO_REQUIRED = "订单号不能为空";

    /** 关联业务类型不能为空 */
    public static final String BIZ_TYPE_REQUIRED = "关联业务类型不能为空";

    /** 启用状态不能为空 */
    public static final String ENABLED_REQUIRED = "启用状态不能为空";

    /** 折扣类型不能为空 */
    public static final String DISCOUNT_TYPE_REQUIRED = "折扣类型不能为空";

    /** 配置键不能为空 */
    public static final String CONFIG_KEY_REQUIRED = "配置键不能为空";

    /** 配置值不能为空 */
    public static final String CONFIG_VALUE_REQUIRED = "配置值不能为空";

    /** 开关键不能为空 */
    public static final String SWITCH_KEY_REQUIRED = "开关键不能为空";

    /** 开关状态不能为空 */
    public static final String SWITCH_VALUE_REQUIRED = "开关状态不能为空";

    /** 媒体类型 type 不能为空 */
    public static final String MEDIA_TYPE_REQUIRED = "媒体类型 type 不能为空";

    /** 文件不能为空 */
    public static final String FILE_REQUIRED = "文件不能为空";

    /** 上传文件不能为空 */
    public static final String UPLOAD_FILE_REQUIRED = "上传文件不能为空";

    /** 语音文件不能为空 */
    public static final String VOICE_FILE_REQUIRED = "语音文件不能为空";

    /** 用户 ID 格式无效 */
    public static final String USER_ID_FORMAT_INVALID = "用户 ID 格式无效";

    /** 解锁目标 ID 不能为空 */
    public static final String UNLOCK_TARGET_ID_REQUIRED = "解锁目标 ID 不能为空";

    /** 解锁目标 ID 必须为正数 */
    public static final String UNLOCK_TARGET_ID_POSITIVE = "解锁目标 ID 必须为正数";

    /** 金额必须为正数 */
    public static final String AMOUNT_POSITIVE = "金额必须为正数";

    /** 支付金额不能为负数 */
    public static final String PAYMENT_AMOUNT_NOT_NEGATIVE = "支付金额不能为负数";

    /** 基础金额不能为负数 */
    public static final String BASE_AMOUNT_NOT_NEGATIVE = "基础金额不能为负数";

    /** 页码不能为负数 */
    public static final String PAGE_NUM_NOT_NEGATIVE = "页码不能为负数";

    /** 每页大小必须大于 0 */
    public static final String PAGE_SIZE_POSITIVE = "每页大小必须大于 0";

    /** 页码不能小于 0 */
    public static final String PAGE_NUM_MIN = "页码不能小于 0";

    /** 每页大小不能小于 1 */
    public static final String PAGE_SIZE_MIN = "每页大小不能小于 1";

    /** 每页大小不能超过 100 */
    public static final String PAGE_SIZE_MAX = "每页大小不能超过 100";

    /** 目标用户不存在 */
    public static final String TARGET_USER_NOT_FOUND = "目标用户不存在";

    /** 用户不存在 */
    public static final String USER_NOT_FOUND = "用户不存在";

    /** 用户不存在: userId= */
    public static final String ADMIN_USER_NOT_FOUND_PREFIX = "用户不存在: userId=";

    /** 发起方用户不存在 */
    public static final String CALLER_USER_NOT_FOUND = "发起方用户不存在";

    /** 接收方用户不存在 */
    public static final String CALLEE_USER_NOT_FOUND = "接收方用户不存在";

    /** 管理员账号不存在 */
    public static final String ADMIN_ACCOUNT_NOT_FOUND = "管理员账号不存在";

    /** 旧密码错误 */
    public static final String OLD_PASSWORD_WRONG = "旧密码错误";

    /** 手机号或密码错误 */
    public static final String PHONE_OR_PASSWORD_WRONG = "手机号或密码错误";

    /** 管理员账号或密码错误 */
    public static final String ADMIN_ACCOUNT_OR_PASSWORD_WRONG = "管理员账号或密码错误";

    /** 手机号格式不正确 */
    public static final String PHONE_FORMAT_INVALID = "手机号格式不正确";

    /** 手机号不能为空 */
    public static final String PHONE_REQUIRED = "手机号不能为空";

    /** 该手机号已注册 */
    public static final String PHONE_ALREADY_REGISTERED = "该手机号已注册";

    /** 该手机号已注册，请直接登录 */
    public static final String PHONE_REGISTERED_PLEASE_LOGIN = "该手机号已注册，请直接登录";

    /** 该手机号不可注册 */
    public static final String PHONE_CANNOT_REGISTER = "该手机号不可注册";

    /** 该手机号不可登录 */
    public static final String PHONE_CANNOT_LOGIN = "该手机号不可登录";

    /** 密码不能为空 */
    public static final String PASSWORD_REQUIRED = "密码不能为空";

    /** 密码长度须为 6-64 位 */
    public static final String PASSWORD_LENGTH_INVALID = "密码长度须为 6-64 位";

    /** 密码长度不合法 */
    public static final String PASSWORD_LENGTH_ILLEGAL = "密码长度不合法";

    /** 昵称不能为空 */
    public static final String NICKNAME_REQUIRED = "昵称不能为空";

    /** 昵称长度须为 1-20 字 */
    public static final String NICKNAME_LENGTH_INVALID = "昵称长度须为 1-20 字";

    /** 新密码不能为空 */
    public static final String NEW_PASSWORD_REQUIRED = "新密码不能为空";

    /** 新密码长度须为 6-64 位 */
    public static final String NEW_PASSWORD_LENGTH_INVALID = "新密码长度须为 6-64 位";

    /** 旧密码不能为空 */
    public static final String OLD_PASSWORD_REQUIRED = "旧密码不能为空";

    /** oldPassword 长度不能超过 128 */
    public static final String OLD_PASSWORD_MAX_LENGTH = "oldPassword 长度不能超过 128";

    /** 手机号长度不合法 */
    public static final String PHONE_LENGTH_ILLEGAL = "手机号长度不合法";

    /** username 长度不能超过 128 */
    public static final String USERNAME_MAX_LENGTH = "username 长度不能超过 128";

    /** password 长度不能超过 128 */
    public static final String PASSWORD_MAX_LENGTH = "password 长度不能超过 128";

    /** userIds 列表不能为空 */
    public static final String USER_IDS_REQUIRED = "userIds 列表不能为空";

    /** userIds 列表不能超过 500 条 */
    public static final String USER_IDS_MAX_COUNT = "userIds 列表不能超过 500 条";

    /** 日期格式无效，必须为 yyyy-MM-dd */
    public static final String DATE_FORMAT_INVALID = "日期格式无效，必须为 yyyy-MM-dd";

    /** 日期格式必须为 yyyy-MM-dd */
    public static final String DATE_FORMAT_REQUIRED = "日期格式必须为 yyyy-MM-dd";

    /** 补签日期不能为空 */
    public static final String MAKEUP_DATE_REQUIRED = "补签日期不能为空";

    /** 补签日期必须早于今天 */
    public static final String MAKEUP_DATE_BEFORE_TODAY = "补签日期必须早于今天";

    /** 仅可补签昨日及之前  */
    public static final String MAKEUP_ONLY_YESTERDAY_PREFIX = "仅可补签昨日及之前 ";

    /** 目标用户 ID 必须为正数 */
    public static final String TARGET_USER_ID_POSITIVE = "目标用户 ID 必须为正数";

    /** 话题不存在:  */
    public static final String TOPIC_NOT_FOUND_PREFIX = "话题不存在: ";

    /** 用户不存在:  */
    public static final String USER_NOT_FOUND_CN_PREFIX = "用户不存在: ";

    /** 关注者用户不存在:  */
    public static final String FOLLOWER_USER_NOT_FOUND_PREFIX = "关注者用户不存在: ";

    /** 目标用户不存在:  */
    public static final String TARGET_USER_NOT_FOUND_PREFIX = "目标用户不存在: ";

    /** 账号已被禁用，请联系管理员 */
    public static final String ACCOUNT_DISABLED_CONTACT_ADMIN = "账号已被禁用，请联系管理员";

    /** 通知 ID 不能为空 */
    public static final String NOTIFY_ID_REQUIRED = "通知 ID 不能为空";

    /** 商户订单号不能为空 */
    public static final String MERCHANT_ORDER_NO_REQUIRED = "商户订单号不能为空";

    /** 支付金额不能为空 */
    public static final String PAYMENT_AMOUNT_REQUIRED = "支付金额不能为空";

    /** 支付金额必须大于 0 */
    public static final String PAYMENT_AMOUNT_POSITIVE = "支付金额必须大于 0";

    /** 签名不能为空 */
    public static final String SIGNATURE_REQUIRED = "签名不能为空";

    /** 套餐价格不能为负数 */
    public static final String PLAN_PRICE_NOT_NEGATIVE = "套餐价格不能为负数";

    // ============ 认证/登录 ============
    /** 微信登录凭证无效，请重新登录 */
    public static final String WECHAT_CREDENTIAL_INVALID = "微信登录凭证无效，请重新登录";

    /** Token 无效或已过期 */
    public static final String TOKEN_INVALID_OR_EXPIRED = "Token 无效或已过期";

    /** Token 已被撤销，请重新登录 */
    public static final String TOKEN_REVOKED = "Token 已被撤销，请重新登录";

    /** 无法从 Token 中提取用户信息 */
    public static final String TOKEN_USER_EXTRACTION_FAILED = "无法从 Token 中提取用户信息";

    /** 用户登录处理失败，请稍后重试 */
    public static final String USER_LOGIN_FAILED_RETRY = "用户登录处理失败，请稍后重试";

    /** 体验账号入口已关闭，请使用其他方式登录 */
    public static final String TRIAL_LOGIN_DISABLED = "体验账号入口已关闭，请使用其他方式登录";

    /** 管理员账号已被禁用，请联系超级管理员 */
    public static final String ADMIN_DISABLED_CONTACT_SUPER = "管理员账号已被禁用，请联系超级管理员";

    /** 所在高校已被停用，请联系超级管理员 */
    public static final String SCHOOL_DISABLED_CONTACT_SUPER = "所在高校已被停用，请联系超级管理员";

    /** 管理员登录未启用 */
    public static final String ADMIN_LOGIN_NOT_ENABLED = "管理员登录未启用";

    /** SHA-256 算法不可用 */
    public static final String SHA256_UNAVAILABLE = "SHA-256 算法不可用";

    /** 无法获取 Apple 公钥（kid= */
    public static final String APPLE_PUBLIC_KEY_FETCH_FAILED_PREFIX = "无法获取 Apple 公钥（kid=";

    /** Apple identityToken 签名无效 */
    public static final String APPLE_TOKEN_SIGNATURE_INVALID = "Apple identityToken 签名无效";

    /** Apple identityToken 无效:  */
    public static final String APPLE_TOKEN_INVALID_PREFIX = "Apple identityToken 无效: ";

    /** Apple identityToken 已过期 */
    public static final String APPLE_TOKEN_EXPIRED = "Apple identityToken 已过期";

    /** Apple identityToken nonce 校验失败 */
    public static final String APPLE_TOKEN_NONCE_MISMATCH = "Apple identityToken nonce 校验失败";

    /** Apple identityToken 缺少 sub */
    public static final String APPLE_TOKEN_MISSING_SUB = "Apple identityToken 缺少 sub";

    /** identityToken 不是合法 JWT */
    public static final String IDENTITY_TOKEN_NOT_JWT = "identityToken 不是合法 JWT";

    /** identityToken header 缺少 kid */
    public static final String IDENTITY_TOKEN_MISSING_KID = "identityToken header 缺少 kid";

    /** identityToken 格式非法 */
    public static final String IDENTITY_TOKEN_FORMAT_INVALID = "identityToken 格式非法";

    // ============ 校园认证 ============
    /** 请先完成校园认证/绑定学校，再查看校园话题 */
    public static final String CAMPUS_VERIFICATION_REQUIRED = "请先完成校园认证/绑定学校，再查看校园话题";

    /** 您的校园认证正在审核中，请耐心等待 */
    public static final String CAMPUS_CERT_PENDING = "您的校园认证正在审核中，请耐心等待";

    /** 您已完成校园认证，无需重复提交 */
    public static final String CAMPUS_CERT_ALREADY_DONE = "您已完成校园认证，无需重复提交";

    /** 审核结果无效，仅支持 APPROVED 或 REJECTED */
    public static final String CAMPUS_AUDIT_RESULT_INVALID = "审核结果无效，仅支持 APPROVED 或 REJECTED";

    /** 认证记录不存在:  */
    public static final String CAMPUS_CERT_NOT_FOUND_PREFIX = "认证记录不存在: ";

    // ============ 聊天/语音/视频通话 ============
    /** 互动事件不存在或不属于该用户: eventId= */
    public static final String INTERACTION_EVENT_NOT_FOUND_PREFIX = "互动事件不存在或不属于该用户: eventId=";

    /** 语音文件超过  */
    public static final String VOICE_FILE_EXCEEDS_PREFIX = "语音文件超过 ";

    /** 不支持的语音 MIME 类型： */
    public static final String VOICE_MIME_UNSUPPORTED = "不支持的语音 MIME 类型：";

    /** 语音存储路径异常，已拒绝 */
    public static final String VOICE_STORAGE_PATH_INVALID = "语音存储路径异常，已拒绝";

    /** 语音上传失败，请稍后重试 */
    public static final String VOICE_UPLOAD_FAILED_RETRY = "语音上传失败，请稍后重试";

    /** 无权删除该语音文件 */
    public static final String VOICE_DELETE_FORBIDDEN = "无权删除该语音文件";

    /** 删除语音文件失败，请稍后重试 */
    public static final String VOICE_DELETE_FAILED_RETRY = "删除语音文件失败，请稍后重试";

    /** URL 包含非法字符（反斜杠） */
    public static final String URL_ILLEGAL_BACKSLASH = "URL 包含非法字符（反斜杠）";

    /** 不能与自己进行视频通话 */
    public static final String VIDEO_CALL_SELF_NOT_ALLOWED = "不能与自己进行视频通话";

    /** 视频通话发起失败，请稍后重试 */
    public static final String VIDEO_CALL_START_FAILED_RETRY = "视频通话发起失败，请稍后重试";

    /** 无权操作此通话 */
    public static final String VIDEO_CALL_OPERATION_FORBIDDEN = "无权操作此通话";

    /** 通话已结束，无需重复操作 */
    public static final String VIDEO_CALL_ALREADY_ENDED = "通话已结束，无需重复操作";

    /** 视频通话结束失败，请稍后重试 */
    public static final String VIDEO_CALL_END_FAILED_RETRY = "视频通话结束失败，请稍后重试";

    /** 查询通话记录失败，请稍后重试 */
    public static final String VIDEO_CALL_QUERY_FAILED_RETRY = "查询通话记录失败，请稍后重试";

    /** 无法解析推荐人信息: recommendedPersonId= */
    public static final String RECOMMENDER_PARSE_FAILED_PREFIX = "无法解析推荐人信息: recommendedPersonId=";

    /** 心动信号无效或已过期: signalId= */
    public static final String SIGNAL_INVALID_OR_EXPIRED_PREFIX = "心动信号无效或已过期: signalId=";

    /** 非法操作方:  */
    public static final String ILLEGAL_OPERATOR_PREFIX = "非法操作方: ";

    /** kind 必须为 text/voice/emoji/system */
    public static final String CHAT_KIND_INVALID = "kind 必须为 text/voice/emoji/system";

    /** decision 必须为 accept/reject/revoke */
    public static final String CHAT_DECISION_INVALID = "decision 必须为 accept/reject/revoke";

    /** kind 必须为 TEXT/IMAGE/VOICE/VIDEO/EMOJI/ACTIVITY */
    public static final String PRIVATE_MSG_KIND_INVALID = "kind 必须为 TEXT/IMAGE/VOICE/VIDEO/EMOJI/ACTIVITY";

    /** endReason 必须为 CALLER_HANGUP/CALLEE_HANGUP/TIMEOUT/NETWORK_ERROR */
    public static final String END_REASON_INVALID = "endReason 必须为 CALLER_HANGUP/CALLEE_HANGUP/TIMEOUT/NETWORK_ERROR";

    /** 通话记录不存在 */
    public static final String VIDEO_CALL_NOT_FOUND = "通话记录不存在";

    /** 会话不存在:  */
    public static final String SESSION_NOT_FOUND_PREFIX = "会话不存在: ";

    // ============ 发现/推荐/圈子/活动 ============
    /** 偏好数据不能为空 */
    public static final String PREFERENCE_DATA_REQUIRED = "偏好数据不能为空";

    /** 推荐时间偏好(preferredTime)不能为空 */
    public static final String PREFERRED_TIME_REQUIRED = "推荐时间偏好(preferredTime)不能为空";

    /** 推荐范围(scope)不能为空 */
    public static final String PREFERENCE_SCOPE_REQUIRED = "推荐范围(scope)不能为空";

    /** 保存推荐偏好失败，用户ID:  */
    public static final String SAVE_PREFERENCE_FAILED_PREFIX = "保存推荐偏好失败，用户ID: ";

    /** heightMin 不能大于 heightMax */
    public static final String HEIGHT_MIN_GT_MAX = "heightMin 不能大于 heightMax";

    /** ageMin 必须在  */
    public static final String AGE_MIN_RANGE_PREFIX = "ageMin 必须在 ";

    /** ageMax 必须在  */
    public static final String AGE_MAX_RANGE_PREFIX = "ageMax 必须在 ";

    /** ageMin 不能大于 ageMax */
    public static final String AGE_MIN_GT_MAX = "ageMin 不能大于 ageMax";

    /** 暂无每日一问记录，请稍后再试 */
    public static final String DAILY_QUESTION_NONE_RETRY = "暂无每日一问记录，请稍后再试";

    /** 您已经回答过该问题，不能重复回答 */
    public static final String DAILY_QUESTION_ALREADY_ANSWERED = "您已经回答过该问题，不能重复回答";

    /** 请先回答问题才能查看其他人的回答 */
    public static final String DAILY_QUESTION_ANSWER_REQUIRED = "请先回答问题才能查看其他人的回答";

    /** 问题不存在:  */
    public static final String DAILY_QUESTION_NOT_FOUND_PREFIX = "问题不存在: ";

    /** 活动已结束，无法报名 */
    public static final String ACTIVITY_ENDED_NO_ENROLL = "活动已结束，无法报名";

    /** content 长度不能超过  */
    public static final String CONTENT_MAX_LENGTH_PREFIX = "content 长度不能超过 ";

    /** dailyNotifyTime 不能为空 */
    public static final String DAILY_NOTIFY_TIME_REQUIRED = "dailyNotifyTime 不能为空";

    /** scope 不能为空 */
    public static final String SCOPE_REQUIRED = "scope 不能为空";

    /** campusName 长度不能超过 50 */
    public static final String CAMPUS_NAME_MAX_50 = "campusName 长度不能超过 50";
    /** 活动分类 code 长度上限（R4 2026-08-09） */
    public static final String CATEGORY_MAX_LENGTH = "category 长度不能超过 32";
    /** 活动封面图 URL 长度上限（R4 2026-08-09） */
    public static final String COVER_IMAGE_MAX_LENGTH = "coverImage 长度不能超过 512";

    /** isAnonymous 不能为空 */
    public static final String IS_ANONYMOUS_REQUIRED = "isAnonymous 不能为空";

    /** educationLevel 必须为 high_school/bachelor/master/phd */
    public static final String EDUCATION_LEVEL_INVALID = "educationLevel 必须为 high_school/bachelor/master/phd";

    /** relationshipStatus 必须为 never/married_before/divorced/widowed */
    public static final String RELATIONSHIP_STATUS_INVALID = "relationshipStatus 必须为 never/married_before/divorced/widowed";

    /** tagName 不能为空 */
    public static final String TAG_NAME_REQUIRED = "tagName 不能为空";

    /** tagName 长度不能超过 32 */
    public static final String TAG_NAME_MAX_LENGTH = "tagName 长度不能超过 32";

    // ============ 管理端 ============
    /** 活动标题不能为空 */
    public static final String ACTIVITY_TITLE_REQUIRED = "活动标题不能为空";

    /** 活动标题长度不能超过 128 字 */
    public static final String ACTIVITY_TITLE_MAX_LENGTH = "活动标题长度不能超过 128 字";

    /** 活动地点不能为空 */
    public static final String ACTIVITY_LOCATION_REQUIRED = "活动地点不能为空";

    /** 活动地点长度不能超过 256 字 */
    public static final String ACTIVITY_LOCATION_MAX_LENGTH = "活动地点长度不能超过 256 字";

    /** 活动时间描述不能为空 */
    public static final String ACTIVITY_TIME_DESC_REQUIRED = "活动时间描述不能为空";

    /** 活动时间描述长度不能超过 128 字 */
    public static final String ACTIVITY_TIME_DESC_MAX_LENGTH = "活动时间描述长度不能超过 128 字";

    /** 活动描述不能为空 */
    public static final String ACTIVITY_DESC_REQUIRED = "活动描述不能为空";

    /** 城市名称长度不能超过 64 字 */
    public static final String CITY_NAME_MAX_LENGTH = "城市名称长度不能超过 64 字";

    /** 校区名称长度不能超过 128 字 */
    public static final String CAMPUS_NAME_FULL_MAX_LENGTH = "校区名称长度不能超过 128 字";

    /** 非法活动状态参数:  */
    public static final String ILLEGAL_ACTIVITY_STATUS_PREFIX = "非法活动状态参数: ";

    /** 非法话题状态参数:  */
    public static final String ILLEGAL_TOPIC_STATUS_PREFIX = "非法话题状态参数: ";

    /** 非法审核状态参数:  */
    public static final String ILLEGAL_AUDIT_STATUS_PREFIX = "非法审核状态参数: ";

    /** 非法帖子状态参数:  */
    public static final String ILLEGAL_POST_STATUS_PREFIX = "非法帖子状态参数: ";

    /** 非法帖子分类参数:  */
    public static final String ILLEGAL_POST_CATEGORY_PREFIX = "非法帖子分类参数: ";

    /** 非法流水类型参数:  */
    public static final String ILLEGAL_FLOW_TYPE_PREFIX = "非法流水类型参数: ";

    /** 非法交易类型参数:  */
    public static final String ILLEGAL_TRANSACTION_TYPE_PREFIX = "非法交易类型参数: ";

    /** 非法兑换码状态参数:  */
    public static final String ILLEGAL_PROMO_STATUS_PREFIX = "非法兑换码状态参数: ";

    /** 非法折扣类型:  */
    public static final String ILLEGAL_DISCOUNT_TYPE_PREFIX = "非法折扣类型: ";

    /** 起始日期不能晚于结束日期 */
    public static final String START_DATE_AFTER_END = "起始日期不能晚于结束日期";

    /** 圈名不能为空 */
    public static final String CIRCLE_NAME_REQUIRED = "圈名不能为空";

    /** 圈名长度不能超过 64 字 */
    public static final String CIRCLE_NAME_MAX_LENGTH = "圈名长度不能超过 64 字";

    /** 该圈名已存在:  */
    public static final String CIRCLE_NAME_EXISTS_PREFIX = "该圈名已存在: ";

    /** 校区管理员无权操作其他校区的数据 */
    public static final String CAMPUS_ADMIN_SCOPE_FORBIDDEN = "校区管理员无权操作其他校区的数据";

    /** 生成数量须为 1- */
    public static final String PROMO_GENERATE_COUNT_PREFIX = "生成数量须为 1-";

    /** 折扣值必须为正数 */
    public static final String DISCOUNT_VALUE_POSITIVE = "折扣值必须为正数";

    /** 百分比折扣值不能超过  */
    public static final String DISCOUNT_PERCENT_MAX_PREFIX = "百分比折扣值不能超过 ";

    /** 最大使用次数不能为负数 */
    public static final String PROMO_MAX_USES_NOT_NEGATIVE = "最大使用次数不能为负数";

    /** 有效期起止时间不能为空 */
    public static final String PROMO_VALID_PERIOD_REQUIRED = "有效期起止时间不能为空";

    /** 有效期结束时间必须晚于开始时间 */
    public static final String PROMO_END_AFTER_START = "有效期结束时间必须晚于开始时间";

    /** 兑换码生成失败，唯一性冲突，请重试 */
    public static final String PROMO_GEN_CONFLICT_RETRY = "兑换码生成失败，唯一性冲突，请重试";

    /** 校区管理员（ADMIN）必须指定 campusName */
    public static final String CAMPUS_ADMIN_CAMPUS_NAME_REQUIRED = "校区管理员（ADMIN）必须指定 campusName";

    /** 全局管理员（SUPER_ADMIN）不能指定 campusName */
    public static final String SUPER_ADMIN_NO_CAMPUS_NAME = "全局管理员（SUPER_ADMIN）不能指定 campusName";

    /** 配置值长度不能超过  */
    public static final String CONFIG_VALUE_MAX_LENGTH_PREFIX = "配置值长度不能超过 ";

    /** 余额下限不能大于上限 */
    public static final String BALANCE_MIN_GT_MAX = "余额下限不能大于上限";

    /** 调整金额不能为空且不能为 0（正数充值、负数扣减） */
    public static final String ADJUST_AMOUNT_INVALID = "调整金额不能为空且不能为 0（正数充值、负数扣减）";

    /** 该用户当前不在线 */
    public static final String USER_NOT_ONLINE = "该用户当前不在线";

    /** 商品标题不能为空 */
    public static final String PRODUCT_TITLE_REQUIRED = "商品标题不能为空";

    /** 商品标题长度须为 1-128 字 */
    public static final String PRODUCT_TITLE_LENGTH_INVALID = "商品标题长度须为 1-128 字";

    /** 高校名称不能为空 */
    public static final String SCHOOL_NAME_REQUIRED = "高校名称不能为空";

    /** 高校名称长度须为 1-128 字 */
    public static final String SCHOOL_NAME_LENGTH_INVALID = "高校名称长度须为 1-128 字";

    /** 高校编码不能为空 */
    public static final String SCHOOL_CODE_REQUIRED = "高校编码不能为空";

    /** 高校编码须为 1-32 位字母数字 */
    public static final String SCHOOL_CODE_LENGTH_INVALID = "高校编码须为 1-32 位字母数字";

    /** 角色名称不能为空 */
    public static final String ROLE_NAME_REQUIRED = "角色名称不能为空";

    /** 角色名称长度须为 1-64 字 */
    public static final String ROLE_NAME_LENGTH_INVALID = "角色名称长度须为 1-64 字";

    /** 角色编码不能为空 */
    public static final String ROLE_CODE_REQUIRED = "角色编码不能为空";

    /** 角色编码长度须为 1-32 字 */
    public static final String ROLE_CODE_LENGTH_INVALID = "角色编码长度须为 1-32 字";

    /** 菜单标题不能为空 */
    public static final String MENU_TITLE_REQUIRED = "菜单标题不能为空";

    /** 菜单标题长度须为 1-64 字 */
    public static final String MENU_TITLE_LENGTH_INVALID = "菜单标题长度须为 1-64 字";

    /** 路由 name 不能为空 */
    public static final String MENU_ROUTE_NAME_REQUIRED = "路由 name 不能为空";

    /** 路由 name 长度须为 1-64 字 */
    public static final String MENU_ROUTE_NAME_LENGTH_INVALID = "路由 name 长度须为 1-64 字";

    /** 路由路径不能为空 */
    public static final String MENU_ROUTE_PATH_REQUIRED = "路由路径不能为空";

    /** 路由路径长度须为 1-128 字 */
    public static final String MENU_ROUTE_PATH_LENGTH_INVALID = "路由路径长度须为 1-128 字";

    /** 字典名称不能为空 */
    public static final String DICT_NAME_REQUIRED = "字典名称不能为空";

    /** 字典名称长度须为 1-64 字 */
    public static final String DICT_NAME_LENGTH_INVALID = "字典名称长度须为 1-64 字";

    /** 字典编码不能为空 */
    public static final String DICT_CODE_REQUIRED = "字典编码不能为空";

    /** 字典编码长度须为 1-64 字 */
    public static final String DICT_CODE_LENGTH_INVALID = "字典编码长度须为 1-64 字";

    /** 条目显示名不能为空 */
    public static final String DICT_ITEM_LABEL_REQUIRED = "条目显示名不能为空";

    /** 条目显示名长度须为 1-64 字 */
    public static final String DICT_ITEM_LABEL_LENGTH_INVALID = "条目显示名长度须为 1-64 字";

    /** 条目值不能为空 */
    public static final String DICT_ITEM_VALUE_REQUIRED = "条目值不能为空";

    /** 条目值长度须为 1-64 字 */
    public static final String DICT_ITEM_VALUE_LENGTH_INVALID = "条目值长度须为 1-64 字";

    /** 图标长度不能超过 16 字符 */
    public static final String CIRCLE_ICON_MAX_LENGTH = "图标长度不能超过 16 字符";

    /** 圈子描述长度不能超过 256 字 */
    public static final String CIRCLE_DESC_MAX_LENGTH = "圈子描述长度不能超过 256 字";

    /** 校区名长度不能超过 128 字 */
    public static final String CAMPUS_NAME_MAX_LENGTH = "校区名长度不能超过 128 字";

    /** status 必须为 active 或 disabled */
    public static final String USER_STATUS_INVALID = "status 必须为 active 或 disabled";

    /** result 必须为 HANDLE 或 REJECT */
    public static final String REPORT_RESULT_INVALID = "result 必须为 HANDLE 或 REJECT";

    /** decision 必须为 approved 或 rejected */
    public static final String POST_AUDIT_DECISION_INVALID = "decision 必须为 approved 或 rejected";

    /** role 必须为 ADMIN 或 SUPER_ADMIN */
    public static final String ADMIN_ROLE_INVALID = "role 必须为 ADMIN 或 SUPER_ADMIN";

    /** status 必须为 APPROVED/REJECTED/PENDING */
    public static final String CERT_STATUS_INVALID = "status 必须为 APPROVED/REJECTED/PENDING";

    /** words 列表不能超过 10000 条 */
    public static final String WORDS_MAX_COUNT = "words 列表不能超过 10000 条";

    /** category 必须为 POLITICS/PORN/ABUSE/AD/OTHER */
    public static final String SENSITIVE_CATEGORY_INVALID = "category 必须为 POLITICS/PORN/ABUSE/AD/OTHER";

    /** configs 列表不能为空 */
    public static final String NOTIFY_CONFIGS_REQUIRED = "configs 列表不能为空";

    // ============ 反馈 ============
    /** 提案已被转换，无需重复操作，ID:  */
    public static final String PROPOSAL_ALREADY_CONVERTED_PREFIX = "提案已被转换，无需重复操作，ID: ";

    /** 图片大小不能超过 5MB */
    public static final String IMAGE_SIZE_EXCEED_5MB = "图片大小不能超过 5MB";

    /** 无权访问该反馈记录 */
    public static final String FEEDBACK_ACCESS_FORBIDDEN = "无权访问该反馈记录";

    /** 反馈记录不存在，ID:  */
    public static final String FEEDBACK_NOT_FOUND_PREFIX = "反馈记录不存在，ID: ";

    // ============ 成长/签到/免打扰 ============
    /** 该日期已签到，无法重复补签 */
    public static final String CHECKIN_ALREADY_DONE = "该日期已签到，无法重复补签";

    /** 签到失败，请稍后重试 */
    public static final String CHECKIN_FAILED_RETRY = "签到失败，请稍后重试";

    /** 无权操作该摘要 */
    public static final String PUSH_SUMMARY_FORBIDDEN = "无权操作该摘要";

    /** 未认证，无法标记推送为已发送 */
    public static final String PUSH_MARK_UNAUTHENTICATED = "未认证，无法标记推送为已发送";

    /** CUSTOM 模式下必须指定 customWeekdays */
    public static final String DND_CUSTOM_WEEKDAYS_REQUIRED = "CUSTOM 模式下必须指定 customWeekdays";

    /** customWeekdays 的值必须在 1-7 范围内:  */
    public static final String DND_WEEKDAY_RANGE_PREFIX = "customWeekdays 的值必须在 1-7 范围内: ";

    /** customWeekdays 必须为数字 CSV:  */
    public static final String DND_WEEKDAY_CSV_PREFIX = "customWeekdays 必须为数字 CSV: ";

    /** 开始时间与结束时间不能相同 */
    public static final String DND_START_EQUALS_END = "开始时间与结束时间不能相同";

    /** 开始时间格式必须为 HH:mm */
    public static final String DND_START_TIME_FORMAT = "开始时间格式必须为 HH:mm";

    /** 结束时间格式必须为 HH:mm */
    public static final String DND_END_TIME_FORMAT = "结束时间格式必须为 HH:mm";

    /** 重复方式必须为 EVERYDAY/WEEKDAYS/WEEKENDS/CUSTOM */
    public static final String DND_REPEAT_MODE_INVALID = "重复方式必须为 EVERYDAY/WEEKDAYS/WEEKENDS/CUSTOM";

    /** 自定义星期长度不能超过 16 */
    public static final String DND_CUSTOM_WEEKDAYS_MAX_LENGTH = "自定义星期长度不能超过 16";

    // ============ 钱包 ============
    /** 不支持的扣费业务类型:  */
    public static final String UNSUPPORTED_DEDUCT_TYPE_PREFIX = "不支持的扣费业务类型: ";

    /** 钱包扣减失败且幂等查询无记录，已回滚 */
    public static final String WALLET_DEDUCT_ROLLBACK = "钱包扣减失败且幂等查询无记录，已回滚";

    /** 钱包扣减失败，请稍后重试 */
    public static final String WALLET_DEDUCT_FAILED_RETRY = "钱包扣减失败，请稍后重试";

    /** 钱包充值失败且幂等查询无记录，已回滚 */
    public static final String WALLET_RECHARGE_ROLLBACK = "钱包充值失败且幂等查询无记录，已回滚";

    /** 钱包充值失败，请稍后重试 */
    public static final String WALLET_RECHARGE_FAILED_RETRY = "钱包充值失败，请稍后重试";

    /** 不支持的解锁类型:  */
    public static final String UNSUPPORTED_UNLOCK_TYPE_PREFIX = "不支持的解锁类型: ";

    /** 演示充值已关闭，请通过官方充值渠道完成支付 */
    public static final String DEMO_RECHARGE_DISABLED = "演示充值已关闭，请通过官方充值渠道完成支付";

    /** 演示充值 */
    public static final String DEMO_RECHARGE_SUBJECT_LABEL = "演示充值";

    /** 今日演示充值次数已用完（上限  */
    public static final String DEMO_RECHARGE_DAILY_LIMIT_PREFIX = "今日演示充值次数已用完（上限 ";

    /** 扣减金额不能为空 */
    public static final String DEDUCT_AMOUNT_REQUIRED = "扣减金额不能为空";

    /** 扣减金额必须大于 0 */
    public static final String DEDUCT_AMOUNT_POSITIVE = "扣减金额必须大于 0";

    /** 单次扣减金额超出上限 */
    public static final String DEDUCT_AMOUNT_EXCEEDS_LIMIT = "单次扣减金额超出上限";

    /** 充值金额不能为空 */
    public static final String RECHARGE_AMOUNT_REQUIRED = "充值金额不能为空";

    /** 充值金额必须大于 0 */
    public static final String RECHARGE_AMOUNT_POSITIVE = "充值金额必须大于 0";

    /** 单次充值金额超出上限 */
    public static final String RECHARGE_AMOUNT_EXCEEDS_LIMIT = "单次充值金额超出上限";

    /** 解锁类型不能为空 */
    public static final String UNLOCK_TYPE_REQUIRED = "解锁类型不能为空";

    // ============ VIP/优惠码/账单/自动续费 ============
    /** 优惠码不能为空 */
    public static final String PROMO_CODE_REQUIRED = "优惠码不能为空";

    /** 优惠码已用完 */
    public static final String PROMO_CODE_EXHAUSTED = "优惠码已用完";

    /** 优惠码兑换失败，请稍后重试 */
    public static final String PROMO_REDEEM_FAILED_RETRY = "优惠码兑换失败，请稍后重试";

    /** 优惠码已被禁用 */
    public static final String PROMO_CODE_DISABLED = "优惠码已被禁用";

    /** 优惠码尚未生效 */
    public static final String PROMO_CODE_NOT_ACTIVE = "优惠码尚未生效";

    /** 优惠码已过期 */
    public static final String PROMO_CODE_EXPIRED = "优惠码已过期";

    /** 优惠码使用次数已达上限 */
    public static final String PROMO_CODE_USES_EXCEEDED = "优惠码使用次数已达上限";

    /** 账单查询失败，请稍后重试 */
    public static final String BILL_QUERY_FAILED_RETRY = "账单查询失败，请稍后重试";

    /** 账单创建失败，请稍后重试 */
    public static final String BILL_CREATE_FAILED_RETRY = "账单创建失败，请稍后重试";

    /** 查询自动续费状态失败，请稍后重试 */
    public static final String AUTO_RENEW_QUERY_FAILED_RETRY = "查询自动续费状态失败，请稍后重试";

    /** 开启自动续费失败，请稍后重试 */
    public static final String AUTO_RENEW_ENABLE_FAILED_RETRY = "开启自动续费失败，请稍后重试";

    /** 关闭自动续费失败，请稍后重试 */
    public static final String AUTO_RENEW_DISABLE_FAILED_RETRY = "关闭自动续费失败，请稍后重试";

    /** 自动续费被中断，请稍后重试 */
    public static final String AUTO_RENEW_INTERRUPTED_RETRY = "自动续费被中断，请稍后重试";

    /** 自动续费失败，请稍后重试 */
    public static final String AUTO_RENEW_FAILED_RETRY = "自动续费失败，请稍后重试";

    /** 优惠码不存在 */
    public static final String PROMO_CODE_NOT_FOUND = "优惠码不存在";

    /** 体验账号创建失败，请稍后重试 */
    public static final String TRIAL_ACCOUNT_CREATE_FAILED_RETRY = "体验账号创建失败，请稍后重试";

    // ============ 媒体 ============
    /** 未认证 */
    public static final String UNAUTHENTICATED = "未认证";

    /** 未认证，拒绝访问媒体文件 */
    public static final String MEDIA_ACCESS_UNAUTHENTICATED = "未认证，拒绝访问媒体文件";

    /** 无权访问该用户的媒体文件 */
    public static final String MEDIA_ACCESS_FORBIDDEN = "无权访问该用户的媒体文件";

    /** 上传路径异常，已拒绝 */
    public static final String UPLOAD_PATH_INVALID = "上传路径异常，已拒绝";

    /** 创建存储目录失败:  */
    public static final String MKDIR_FAILED_PREFIX = "创建存储目录失败: ";

    /** 写入上传文件失败:  */
    public static final String WRITE_FILE_FAILED_PREFIX = "写入上传文件失败: ";

    /** 删除媒体文件失败:  */
    public static final String DELETE_FILE_FAILED_PREFIX = "删除媒体文件失败: ";

    /** 不支持的媒体类型:  */
    public static final String UNSUPPORTED_MEDIA_TYPE_PREFIX = "不支持的媒体类型: ";

    /** 文件名无效 */
    public static final String FILE_NAME_INVALID = "文件名无效";

    /** 文件缺少扩展名:  */
    public static final String FILE_MISSING_EXTENSION_PREFIX = "文件缺少扩展名: ";

    /** 读取文件内容失败:  */
    public static final String READ_FILE_FAILED_PREFIX = "读取文件内容失败: ";

    /** 文件内容为空，无法校验 magic bytes */
    public static final String FILE_CONTENT_EMPTY = "文件内容为空，无法校验 magic bytes";

    /** 图片大小超过限制（10MB）: 当前  */
    public static final String IMAGE_SIZE_EXCEED_10MB_PREFIX = "图片大小超过限制（10MB）: 当前 ";

    // ============ 匹配 ============
    /** 今日反悔次数已用完（上限  */
    public static final String REWIND_LIMIT_EXCEEDED_PREFIX = "今日反悔次数已用完（上限 ";

    // ============ 资料/关注 ============
    /** 指定索引无照片可删除:  */
    public static final String PHOTO_INDEX_INVALID_PREFIX = "指定索引无照片可删除: ";

    /** 不能关注自己 */
    public static final String CANNOT_FOLLOW_SELF = "不能关注自己";

    /** 已经关注了该用户 */
    public static final String ALREADY_FOLLOWING = "已经关注了该用户";

    /** 不能取消关注自己 */
    public static final String CANNOT_UNFOLLOW_SELF = "不能取消关注自己";

    /** 未关注该用户，无法取关 */
    public static final String NOT_FOLLOWING = "未关注该用户，无法取关";

    // ============ 举报 ============
    /** 举报 */
    public static final String REPORT_SUBJECT_LABEL = "举报";

    /** 今日举报次数已达上限（ */
    public static final String REPORT_DAILY_LIMIT_EXCEEDED_PREFIX = "今日举报次数已达上限（";

    /** 举报提交失败，请稍后重试 */
    public static final String REPORT_SUBMIT_FAILED_RETRY = "举报提交失败，请稍后重试";

    /** 帖子 ID 非法 */
    public static final String POST_ID_INVALID = "帖子 ID 非法";

    /** 帖子不存在或已删除 */
    public static final String POST_NOT_FOUND_OR_DELETED = "帖子不存在或已删除";

    /** targetType 必须为 POST/COMMENT/USER/TOPIC */
    public static final String REPORT_TARGET_TYPE_INVALID = "targetType 必须为 POST/COMMENT/USER/TOPIC";

    // ============ 村/帖子 ============
    /** 不支持的帖子分类:  */
    public static final String UNSUPPORTED_POST_CATEGORY_PREFIX = "不支持的帖子分类: ";

    /** 帖子标题必填，长度需为 5-30 字 */
    public static final String POST_TITLE_REQUIRED_LENGTH = "帖子标题必填，长度需为 5-30 字";

    /** 父评论不属于该帖子，无法回复 */
    public static final String PARENT_COMMENT_MISMATCH = "父评论不属于该帖子，无法回复";

    // ============ 基础设施/配置 ============
    /** 无效或已过期的 JWT token */
    public static final String JWT_INVALID_OR_EXPIRED = "无效或已过期的 JWT token";

    /** JWT token 中的用户ID格式无效:  */
    public static final String JWT_USER_ID_FORMAT_INVALID_PREFIX = "JWT token 中的用户ID格式无效: ";

    /** 用户不存在或已被删除:  */
    public static final String USER_NOT_FOUND_OR_DELETED_PREFIX = "用户不存在或已被删除: ";

    /** 用户已被禁用:  */
    public static final String USER_DISABLED_PREFIX = "用户已被禁用: ";

    /** 缺少 Idempotency-Key 请求头 */
    public static final String IDEMPOTENCY_KEY_MISSING = "缺少 Idempotency-Key 请求头";

    /** AES 加密失败 */
    public static final String AES_ENCRYPT_FAILED = "AES 加密失败";

    /** SensitiveDataMasker 是工具类，禁止实例化 */
    public static final String UTILITY_CLASS_INSTANTIATION_FORBIDDEN = "SensitiveDataMasker 是工具类，禁止实例化";

    /** 请求体字段数量不能超过  */
    public static final String REQUEST_FIELD_COUNT_EXCEEDED_PREFIX = "请求体字段数量不能超过 ";

}