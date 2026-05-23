package com.campuslove.api.chat;

import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 互动通知 Controller。
 * 提供获取通知列表、标记已读、获取未读数的 API。
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

  private final NotificationService notificationService;

  public NotificationController(NotificationService notificationService) {
    this.notificationService = notificationService;
  }

  /**
   * 获取当前用户的通知列表。
   * GET /api/notifications
   */
  @GetMapping
  public List<NotificationView> getNotifications(
          @RequestParam(name = "userId") Long userId) {
    return notificationService.getNotifications(String.valueOf(userId));
  }

  /**
   * 标记指定通知为已读。
   * PUT /api/notifications/{id}/read
   */
  @PutMapping("/{id}/read")
  public void markAsRead(@PathVariable("id") Long id) {
    notificationService.markAsRead(id);
  }

  /**
   * 获取当前用户的未读通知数。
   * GET /api/notifications/unread-count
   */
  @GetMapping("/unread-count")
  public UnreadCountView getUnreadCount(
          @RequestParam(name = "userId") Long userId) {
    return notificationService.getUnreadCount(String.valueOf(userId));
  }

  // ---- Phase 2 新增端点 ----

  /**
   * 获取通知列表（分页，支持仅未读过滤）。
   * GET /api/notifications/list
   */
  @GetMapping("/list")
  public List<NotificationView> getNotificationsPaged(
          @RequestParam(name = "userId") Long userId,
          @RequestParam(name = "unreadOnly", required = false, defaultValue = "false") Boolean unreadOnly,
          @RequestParam(name = "page", defaultValue = "0") int page,
          @RequestParam(name = "size", defaultValue = "20") int size) {
    Pageable pageable = PageRequest.of(page, size);
    return notificationService.getNotifications(userId, unreadOnly, pageable);
  }

  /**
   * 获取未读通知数（Long userId 版本）。
   * GET /api/notifications/count
   */
  @GetMapping("/count")
  public long getUnreadCountLong(@RequestParam(name = "userId") Long userId) {
    return notificationService.getUnreadCount(userId);
  }

  /**
   * 标记指定通知为已读（带用户验证）。
   * PUT /api/notifications/{id}/read-with-user
   */
  @PutMapping("/{id}/read-with-user")
  public void markAsReadWithUser(
          @PathVariable("id") Long notificationId,
          @RequestParam(name = "userId") Long userId) {
    notificationService.markAsRead(notificationId, userId);
  }

  /**
   * 标记所有通知为已读。
   * PUT /api/notifications/read-all
   */
  @PutMapping("/read-all")
  public void markAllAsRead(@RequestParam(name = "userId") Long userId) {
    notificationService.markAllAsRead(userId);
  }
}
