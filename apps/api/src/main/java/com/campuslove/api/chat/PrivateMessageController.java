package com.campuslove.api.chat;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import com.campuslove.api.ratelimit.RateLimit;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 私信控制器。
 * 提供私信会话管理、消息发送、消息读取等 API。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/v1/messages")
@Validated
public class PrivateMessageController {

    private final PrivateMessageService privateMessageService;

    public PrivateMessageController(PrivateMessageService privateMessageService) {
        this.privateMessageService = privateMessageService;
    }

    /**
     * 获取当前用户的会话列表。
     * GET /api/messages/conversations
     */
    @GetMapping("/conversations")
    public ApiResponse<List<ConversationView>> getConversations() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(privateMessageService.getConversations(userId));
    }

    /**
     * 创建或获取会话。
     * POST /api/messages/conversations
     */
    @PostMapping("/conversations")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<ConversationView> createConversation(@Valid @RequestBody CreateConversationRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(privateMessageService.createOrGetConversation(currentUserId, request.userBId()));
    }

    /**
     * 获取指定会话的消息列表。
     * GET /api/messages/conversations/{id}/messages
     *
     * <p>2026-08-08 微信化重构：新增 order 参数——
     * desc（默认）最新在前（首屏）；asc 最早在前（上拉加载更早历史，page+1 取下一段）。</p>
     */
    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<List<MessageView>> getMessages(
            @PathVariable("id") @Positive Long conversationId,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(name = "order", defaultValue = "desc") String order) {
        Long userId = SecurityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.ok(privateMessageService.getMessages(conversationId, userId, pageable, order));
    }

    /**
     * 在指定会话中发送消息。
     * POST /api/messages/conversations/{id}/messages
     *
     * <p>速率限制：桶容量 30，每秒补充 1 个令牌（约 1 条/秒，突发 30 条），
     * 按客户端 IP 限流，防止消息刷屏与垃圾内容轰炸。</p>
     */
    @PostMapping("/conversations/{id}/messages")
    @RateLimit(capacity = 30, refillTokens = 1, key = "#request.remoteAddr")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<MessageView> sendMessage(
            @PathVariable("id") @Positive Long conversationId,
            @Valid @RequestBody SendMessageRequest request) {
        Long senderId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(privateMessageService.sendMessage(
                conversationId, senderId, request.content(), request.kind(),
                request.durationSeconds()));
    }

    /**
     * 标记指定会话的消息为已读。
     * PUT /api/messages/conversations/{id}/read
     */
    @PutMapping("/conversations/{id}/read")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> markAsRead(@PathVariable("id") @Positive Long conversationId) {
        Long userId = SecurityUtils.getCurrentUserId();
        privateMessageService.markAsRead(conversationId, userId);
        return ApiResponse.ok(null);
    }

    // ---- Phase 2 新增：会话置顶 ----

    /**
     * 设置会话置顶状态。
     * PUT /api/messages/conversations/{id}/pin
     */
    @PutMapping("/conversations/{id}/pin")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> pinConversation(
            @PathVariable("id") @Positive Long conversationId,
            @RequestParam boolean pinned) {
        Long userId = SecurityUtils.getCurrentUserId();
        privateMessageService.pinConversation(conversationId, pinned, userId);
        return ApiResponse.ok(null);
    }

    // ---- M-06/P0-07：删除会话 ----

    /**
     * 删除会话及其全部消息。
     * DELETE /api/messages/conversations/{id}
     *
     * <p>仅会话参与者可操作（服务层校验归属，防 IDOR）；
     * 删除后双方会话均不可见，消息一并清理。</p>
     */
    @DeleteMapping("/conversations/{id}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> deleteConversation(@PathVariable("id") @Positive Long conversationId) {
        Long userId = SecurityUtils.getCurrentUserId();
        privateMessageService.deleteConversation(conversationId, userId);
        return ApiResponse.ok(null);
    }
}

/**
 * 创建会话请求体。
 * userAId 由 SecurityUtils 自动获取，只需传入对方用户ID。
 */
record CreateConversationRequest(
    @NotNull @Positive Long userBId
) {}

/**
 * 发送消息请求体。
 * senderId 由 SecurityUtils 自动获取，只需传入内容和类型。
 *
 * <p>录音修复：kind 允许大小写（(?i) 前缀），客户端统一发送小写
 * （text/voice/emoji），服务层规范化存储为小写；语音消息携带 durationSeconds。</p>
 * <p>活动卡片：kind=activity，content 为 JSON
 * {"title","desc","tag","targetUrl"}（见 docs/API-CONTRACT.md 聊天域）。</p>
 */
record SendMessageRequest(
    @NotBlank(message = "content 不能为空") @Size(max = 5000) String content,
    @Pattern(regexp = "(?i)TEXT|IMAGE|VOICE|VIDEO|SYSTEM|EMOJI|ACTIVITY",
        message = "kind 必须为 TEXT/IMAGE/VOICE/VIDEO/SYSTEM/EMOJI/ACTIVITY")
    @Size(max = 32) String kind,
    @Min(0) @Max(60) Integer durationSeconds
) {}
