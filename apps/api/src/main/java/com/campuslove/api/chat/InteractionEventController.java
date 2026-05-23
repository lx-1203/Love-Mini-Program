package com.campuslove.api.chat;

import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 互动提醒增强控制器。
 * 提供互动事件列表查询、未读数获取、标记已读等接口。
 */
@RestController
@RequestMapping("/api/notifications/interactions")
public class InteractionEventController {

    private final InteractionEventService interactionEventService;

    public InteractionEventController(InteractionEventService interactionEventService) {
        this.interactionEventService = interactionEventService;
    }

    /**
     * 查询互动事件列表（分页）。
     * GET /api/notifications/interactions?userId=xxx&page=0&size=20
     *
     * @param userId 用户 ID
     * @param page   页码（从 0 开始，默认 0）
     * @param size   每页大小（默认 20）
     * @return 互动事件视图列表
     */
    @GetMapping
    public ResponseEntity<List<InteractionEventView>> getInteractionEvents(
            @RequestParam("userId") Long userId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        try {
            List<InteractionEventView> events = interactionEventService.getInteractionEvents(userId, page, size);
            return ResponseEntity.ok(events);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 获取未读互动事件数。
     * GET /api/notifications/interactions/unread-count?userId=xxx
     *
     * @param userId 用户 ID
     * @return 未读互动事件数
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestParam("userId") Long userId) {
        try {
            long count = interactionEventService.getUnreadCount(userId);
            return ResponseEntity.ok(Map.of("count", count));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 标记指定互动事件为已读。
     * PUT /api/notifications/interactions/{eventId}/read?userId=xxx
     *
     * @param eventId 事件 ID
     * @param userId  用户 ID（用于验证）
     * @return 操作结果
     */
    @PutMapping("/{eventId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable("eventId") Long eventId,
            @RequestParam("userId") Long userId) {
        try {
            interactionEventService.markAsRead(eventId, userId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 标记所有互动事件为已读。
     * PUT /api/notifications/interactions/read-all?userId=xxx
     *
     * @param userId 用户 ID
     * @return 操作结果
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@RequestParam("userId") Long userId) {
        try {
            interactionEventService.markAllAsRead(userId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
