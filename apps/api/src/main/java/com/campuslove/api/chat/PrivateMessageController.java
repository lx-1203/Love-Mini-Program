package com.campuslove.api.chat;

import com.campuslove.api.config.SecurityUtils;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/messages")
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
    public List<ConversationView> getConversations() {
        Long userId = SecurityUtils.getCurrentUserId();
        return privateMessageService.getConversations(userId);
    }

    /**
     * 创建或获取会话。
     * POST /api/messages/conversations
     */
    @PostMapping("/conversations")
    public ConversationView createConversation(@RequestBody CreateConversationRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return privateMessageService.createOrGetConversation(currentUserId, request.userBId());
    }

    /**
     * 获取指定会话的消息列表。
     * GET /api/messages/conversations/{id}/messages
     */
    @GetMapping("/conversations/{id}/messages")
    public List<MessageView> getMessages(
            @PathVariable("id") Long conversationId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
        return privateMessageService.getMessages(conversationId, userId, pageable);
    }

    /**
     * 在指定会话中发送消息。
     * POST /api/messages/conversations/{id}/messages
     */
    @PostMapping("/conversations/{id}/messages")
    public MessageView sendMessage(
            @PathVariable("id") Long conversationId,
            @RequestBody SendMessageRequest request) {
        Long senderId = SecurityUtils.getCurrentUserId();
        return privateMessageService.sendMessage(
                conversationId, senderId, request.content(), request.kind());
    }

    /**
     * 标记指定会话的消息为已读。
     * PUT /api/messages/conversations/{id}/read
     */
    @PutMapping("/conversations/{id}/read")
    public void markAsRead(@PathVariable("id") Long conversationId) {
        Long userId = SecurityUtils.getCurrentUserId();
        privateMessageService.markAsRead(conversationId, userId);
    }

    // ---- Phase 2 新增：会话置顶 ----

    /**
     * 设置会话置顶状态。
     * PUT /api/messages/conversations/{id}/pin
     */
    @PutMapping("/conversations/{id}/pin")
    public ResponseEntity<Void> pinConversation(
            @PathVariable("id") Long conversationId,
            @RequestParam boolean pinned) {
        Long userId = SecurityUtils.getCurrentUserId();
        privateMessageService.pinConversation(conversationId, pinned, userId);
        return ResponseEntity.ok().build();
    }
}

/**
 * 创建会话请求体。
 * userAId 由 SecurityUtils 自动获取，只需传入对方用户ID。
 */
record CreateConversationRequest(
    Long userBId
) {}

/**
 * 发送消息请求体。
 * senderId 由 SecurityUtils 自动获取，只需传入内容和类型。
 */
record SendMessageRequest(
    String content,
    String kind
) {}
