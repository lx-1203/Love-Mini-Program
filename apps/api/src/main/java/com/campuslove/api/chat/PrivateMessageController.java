package com.campuslove.api.chat;

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
    public List<ConversationView> getConversations(
            @RequestParam(name = "userId") Long userId) {
        return privateMessageService.getConversations(userId);
    }

    /**
     * 创建或获取会话。
     * POST /api/messages/conversations
     */
    @PostMapping("/conversations")
    public ConversationView createConversation(@RequestBody CreateConversationRequest request) {
        return privateMessageService.createOrGetConversation(request.userAId(), request.userBId());
    }

    /**
     * 获取指定会话的消息列表。
     * GET /api/messages/conversations/{id}/messages
     */
    @GetMapping("/conversations/{id}/messages")
    public List<MessageView> getMessages(
            @PathVariable("id") Long conversationId,
            @RequestParam(name = "userId") Long userId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
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
        return privateMessageService.sendMessage(
                conversationId, request.senderId(), request.content(), request.kind());
    }

    /**
     * 标记指定会话的消息为已读。
     * PUT /api/messages/conversations/{id}/read
     */
    @PutMapping("/conversations/{id}/read")
    public void markAsRead(
            @PathVariable("id") Long conversationId,
            @RequestParam(name = "userId", defaultValue = "1") Long userId) {
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
            @RequestParam boolean pinned,
            @RequestParam(name = "userId", defaultValue = "1") Long userId) {
        privateMessageService.pinConversation(conversationId, pinned, userId);
        return ResponseEntity.ok().build();
    }
}

/**
 * 创建会话请求体。
 */
record CreateConversationRequest(
    Long userAId,
    Long userBId
) {}

/**
 * 发送消息请求体。
 */
record SendMessageRequest(
    Long senderId,
    String content,
    String kind
) {}
