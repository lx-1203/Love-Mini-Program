package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.OfficialAccount;
import com.campuslove.api.entity.OfficialMessage;
import com.campuslove.api.official.OfficialAccountService;
import com.campuslove.api.official.OfficialAccountView;
import com.campuslove.api.official.OfficialMessageView;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.OfficialAccountRepository;
import com.campuslove.api.repository.OfficialMessageRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 官方号控制器（2026-08-07 官方号体系）。
 *
 * <p>读接口：运营侧查看官方号账号列表与消息流。
 * 写接口（2026-10-27 新增）：超级管理员发布/下架<b>全站广播</b>公告，
 * 直接写入小程序官方号会话已在渲染的 official_messages 表，客户端零改动即时生效。</p>
 *
 * <p>数据隔离说明：官方号为<b>全局资源</b>（官方号内容面向全平台用户，不区分校区），
 * 不做校区数据隔离；正因如此广播会影响所有校区所有用户，写接口收紧为
 * {@code SUPER_ADMIN} 专属（校区管理员 ADMIN 只读不可广播）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/official-accounts")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
@Validated
public class AdminOfficialAccountController {

    /**
     * 唯一可写入的官方号 code。
     * <p>广播只能落进 official-assistant（寻觅助手）的消息流：official-promoter 在
     * official_accounts 中 enabled=0，而 {@code RealOfficialAccountService#getMessages}
     * 对停用账号直接返回空列表，写进去的内容用户永远看不到，故服务端拒绝其他账号。</p>
     */
    private static final String BROADCAST_ACCOUNT_CODE = "official-assistant";

    /**
     * content 长度上限（字符）。
     * <p>与用户端官方号发消息接口同一口径：{@code OfficialAccountController.OfficialChatSendRequest}
     * 使用 {@code @Size(max = 500)}；DB 列为 TEXT，故 500 是本模块既有的正文长度约定，不另造常量。</p>
     */
    private static final int MAX_CONTENT_LENGTH = 500;

    /** 卡片标题长度上限（与 official_messages.card_title varchar(128) 对齐） */
    private static final int MAX_CARD_TITLE_LENGTH = 128;

    /** 卡片描述长度上限（与 official_messages.card_desc varchar(255) 对齐） */
    private static final int MAX_CARD_DESC_LENGTH = 255;

    /** 卡片角标长度上限（与 official_messages.card_tag varchar(32) 对齐） */
    private static final int MAX_CARD_TAG_LENGTH = 32;

    /** 卡片跳转地址长度上限（与 official_messages.card_target_url varchar(512) 对齐） */
    private static final int MAX_CARD_TARGET_URL_LENGTH = 512;

    private final OfficialAccountService officialAccountService;
    private final OfficialAccountRepository officialAccountRepository;
    private final OfficialMessageRepository officialMessageRepository;
    private final ActivityRepository activityRepository;

    public AdminOfficialAccountController(
            OfficialAccountService officialAccountService,
            OfficialAccountRepository officialAccountRepository,
            OfficialMessageRepository officialMessageRepository,
            ActivityRepository activityRepository) {
        this.officialAccountService = officialAccountService;
        this.officialAccountRepository = officialAccountRepository;
        this.officialMessageRepository = officialMessageRepository;
        this.activityRepository = activityRepository;
    }

    /**
     * 获取全部启用官方账号列表。
     * GET /api/v1/admin/official-accounts
     *
     * @return 账号视图列表
     */
    @GetMapping
    public List<OfficialAccountView> getAccounts() {
        return officialAccountService.getAccounts();
    }

    /**
     * 获取某官方号的消息流（发布时间升序）。
     * GET /api/v1/admin/official-accounts/{code}/messages
     *
     * @param code 官方号唯一标识
     * @return 消息视图列表；账号不存在或已下线时返回空列表
     */
    @GetMapping("/{code}/messages")
    public ResponseEntity<List<OfficialMessageView>> getMessages(
            @PathVariable("code")
            @NotBlank(message = ErrorMessages.CODE_REQUIRED)
            @Size(max = 32, message = ErrorMessages.CODE_MAX_LENGTH) String code) {
        List<OfficialMessageView> messages = officialAccountService.getMessages(code);
        return ResponseEntity.ok(messages);
    }

    /**
     * 发布一条全站广播公告（写入 official_messages，小程序官方号会话即时展示）。
     *
     * <p>POST /api/v1/admin/official-accounts/{code}/messages</p>
     *
     * <p>广播无校区/用户维度：official_messages 一行即对<b>全平台所有用户</b>可见，
     * 故本端点仅超级管理员可用（校区管理员只读）。</p>
     *
     * @param code 官方号唯一标识，服务端强制只允许 {@code official-assistant}
     * @param req  公告内容（messageType text/card + content，card 需 cardActivityId）
     * @return 落库后的公告视图；参数不合法返回 400
     */
    @PostMapping("/{code}/messages")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    @Auditable(value = AuditOperation.PUBLISH_ANNOUNCEMENT, targetType = "OFFICIAL_MESSAGE",
            description = "超级管理员发布官方号全站广播公告")
    public ResponseEntity<Map<String, Object>> publishAnnouncement(
            @PathVariable("code")
            @NotBlank(message = ErrorMessages.CODE_REQUIRED)
            @Size(max = 32, message = ErrorMessages.CODE_MAX_LENGTH) String code,
            @Valid @RequestBody AdminOfficialAnnouncementPublishRequest req) {
        // 幂等性：后台 http.ts 对写请求统一注入 Idempotency-Key 头（API-CONTRACT.md 约定）
        SecurityUtils.getCurrentUserId();

        if (!BROADCAST_ACCOUNT_CODE.equals(code.trim())) {
            return badRequest("广播只能发布到「寻觅助手」（" + BROADCAST_ACCOUNT_CODE
                    + "），官方号 " + code + " 不可写入");
        }
        OfficialAccount account = officialAccountRepository.findByCode(BROADCAST_ACCOUNT_CODE).orElse(null);
        if (account == null) {
            return badRequest("官方号不存在：" + BROADCAST_ACCOUNT_CODE);
        }
        if (!account.isEnabled()) {
            return badRequest("官方号「" + account.getName() + "」已停用，广播发布后用户端不会展示");
        }

        String messageType = req.messageType() == null
                ? OfficialMessage.MessageType.text.name()
                : req.messageType().trim().toLowerCase();
        if (!OfficialMessage.MessageType.text.name().equals(messageType)
                && !OfficialMessage.MessageType.card.name().equals(messageType)) {
            return badRequest("messageType 只支持 text（文本）或 card（活动卡片）");
        }

        String content = req.content().trim();
        if (content.length() > MAX_CONTENT_LENGTH) {
            return badRequest(ErrorMessages.CONTENT_MAX_LENGTH_PREFIX + MAX_CONTENT_LENGTH + " 字");
        }

        OfficialMessage message = new OfficialMessage();
        message.setAccountId(account.getId());
        message.setMessageType(messageType);
        message.setContent(content);
        message.setPublishedAt(LocalDateTime.now(TimeZones.BUSINESS));

        if (OfficialMessage.MessageType.card.name().equals(messageType)) {
            Long activityId = req.cardActivityId();
            if (activityId == null) {
                return badRequest("card 类型公告必须关联活动（cardActivityId），"
                        + "否则小程序卡片分支不渲染，用户只能看到空消息");
            }
            Activity activity = activityRepository.findById(activityId).orElse(null);
            if (activity == null) {
                return badRequest("关联活动不存在：cardActivityId=" + activityId);
            }
            message.setCardActivityId(activityId);
            // 卡片文案缺省回退活动自身信息，保证客户端卡片分支字段齐全
            message.setCardTitle(orDefault(trimToNull(req.cardTitle()), trimToNull(activity.getTitle()),
                    MAX_CARD_TITLE_LENGTH));
            message.setCardDesc(orDefault(trimToNull(req.cardDesc()), trimToNull(activity.getScheduleText()),
                    MAX_CARD_DESC_LENGTH));
            message.setCardTag(limit(trimToNull(req.cardTag()), MAX_CARD_TAG_LENGTH));
            message.setCardTargetUrl(limit(trimToNull(req.cardTargetUrl()), MAX_CARD_TARGET_URL_LENGTH));
        }

        OfficialMessage saved = officialMessageRepository.save(message);
        return ResponseEntity.ok(toBody(saved, true));
    }

    /**
     * 下架（硬删除）一条官方号公告。
     *
     * <p>DELETE /api/v1/admin/official-accounts/{code}/messages/{id}</p>
     *
     * <p>official_messages 无状态位，用户端按 published_at 升序全量渲染，
     * 因此下架只能物理删行——软删标记会让公告继续出现在用户会话里。
     * 同样仅超级管理员可用，并写审计日志。</p>
     *
     * @param code 官方号唯一标识，服务端强制只允许 {@code official-assistant}
     * @param id   official_messages.id
     * @return 删除结果；公告不存在返回 404
     */
    @DeleteMapping("/{code}/messages/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    @Auditable(value = AuditOperation.TAKE_DOWN_ANNOUNCEMENT, targetType = "OFFICIAL_MESSAGE",
            description = "超级管理员下架官方号全站广播公告（硬删除）")
    public ResponseEntity<Map<String, Object>> takeDownAnnouncement(
            @PathVariable("code")
            @NotBlank(message = ErrorMessages.CODE_REQUIRED)
            @Size(max = 32, message = ErrorMessages.CODE_MAX_LENGTH) String code,
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        if (!BROADCAST_ACCOUNT_CODE.equals(code.trim())) {
            return badRequest("只能下架「寻觅助手」（" + BROADCAST_ACCOUNT_CODE + "）的公告");
        }
        OfficialMessage message = officialMessageRepository.findById(id).orElse(null);
        if (message == null) {
            return ResponseEntity.notFound().build();
        }
        OfficialAccount owner = officialAccountRepository
                .findById(message.getAccountId()).orElse(null);
        if (owner == null || !BROADCAST_ACCOUNT_CODE.equals(owner.getCode())) {
            return badRequest("该公告不属于 " + BROADCAST_ACCOUNT_CODE + "，不允许通过广播接口下架");
        }

        officialMessageRepository.delete(message);

        Map<String, Object> body = toBody(message, false);
        body.put("deleted", true);
        return ResponseEntity.ok(body);
    }

    // ---- 视图转换与校验辅助 ----

    /**
     * Entity 转响应体（与管理端其余写接口一致：直出字段 + success 标志）。
     *
     * @param message 已落库（或刚删除）的消息
     * @param success 写操作是否成功
     */
    private Map<String, Object> toBody(OfficialMessage message, boolean success) {
        Map<String, Object> body = new HashMap<>();
        body.put("id", message.getId());
        body.put("accountId", message.getAccountId());
        body.put("accountCode", BROADCAST_ACCOUNT_CODE);
        body.put("messageType", message.getMessageType());
        body.put("content", message.getContent());
        body.put("cardTitle", message.getCardTitle());
        body.put("cardDesc", message.getCardDesc());
        body.put("cardTag", message.getCardTag());
        body.put("cardTargetUrl", message.getCardTargetUrl());
        body.put("cardActivityId", message.getCardActivityId());
        body.put("sortOrder", message.getSortOrder());
        body.put("publishedAt", message.getPublishedAt());
        // 广播范围提示：official_messages 无校区/用户维度，一行即全平台可见
        body.put("audience", "ALL_CAMPUS_ALL_USERS");
        body.put("success", success);
        return body;
    }

    /**
     * 构造 400 错误响应。
     * <p>响应体沿用全局异常处理的统一格式 {@code {error, message, status}}——
     * 管理端 http.ts 的 extractErrorMessage 读的是 {@code message} 字段，
     * 只给 {@code error} 的话前端会退化成「未知错误」，故两个 key 都写。</p>
     */
    private ResponseEntity<Map<String, Object>> badRequest(String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", message);
        body.put("message", message);
        body.put("status", 400);
        return ResponseEntity.badRequest().body(body);
    }

    /** 优先取运营填写值，为空时回退默认值（并按列宽截断） */
    private String orDefault(String value, String fallback, int maxLength) {
        return limit(value != null ? value : fallback, maxLength);
    }

    /** trim 后空串归一为 null */
    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** 按列宽截断，避免写库触发 DataIntegrityViolationException */
    private String limit(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    /**
     * 管理后台 - 发布官方号广播公告请求体。
     *
     * @param messageType   消息类型：text 文本 / card 活动卡片（缺省按 text 处理）
     * @param content       公告正文（card 类型为卡片上方文案），必填，≤ 500 字
     * @param cardTitle     卡片标题，可空（card 缺省取活动标题）
     * @param cardDesc      卡片描述，可空（card 缺省取活动时间描述）
     * @param cardTag       卡片角标（如「七夕限定」），可空
     * @param cardTargetUrl 卡片 CTA 跳转地址，可空
     * @param cardActivityId 关联活动 ID，card 类型必填且必须真实存在
     */
    public record AdminOfficialAnnouncementPublishRequest(
            @Size(max = 16, message = "messageType 长度不能超过 16") String messageType,
            @NotBlank(message = ErrorMessages.CONTENT_REQUIRED)
            @Size(max = MAX_CONTENT_LENGTH,
                    message = ErrorMessages.CONTENT_MAX_LENGTH_PREFIX + MAX_CONTENT_LENGTH) String content,
            @Size(max = MAX_CARD_TITLE_LENGTH, message = "cardTitle 长度不能超过 128") String cardTitle,
            @Size(max = MAX_CARD_DESC_LENGTH, message = "cardDesc 长度不能超过 255") String cardDesc,
            @Size(max = MAX_CARD_TAG_LENGTH, message = "cardTag 长度不能超过 32") String cardTag,
            @Size(max = MAX_CARD_TARGET_URL_LENGTH, message = "cardTargetUrl 长度不能超过 512")
            String cardTargetUrl,
            @Positive(message = "cardActivityId 必须为正整数") Long cardActivityId
    ) {
    }
}
