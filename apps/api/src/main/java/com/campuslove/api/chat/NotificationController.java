package com.campuslove.api.chat;

import com.campuslove.api.config.SecurityUtils;
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
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 * Phase 3 新增：signalType 社交/内容信号分类筛选。
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
  public List<NotificationView> getNotifications() {
    Long userId = SecurityUtils.getCurrentUserId();
    return notificationService.getNotifications(userId);
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
  public UnreadCountView getUnreadCount() {
    Long userId = SecurityUtils.getCurrentUserId();
    return notificationService.getUnreadCount(userId);
  }

  // ---- Phase 2 新增端点 ----

  /**
   * 获取通知列表（分页，支持仅未读过滤和信号类型筛选）。
   * GET /api/notifications/list
   *
   * @param unreadOnly 是否仅显示未读通知
   * @param signalType 信号类型筛选：SOCIAL（社交信号）/ CONTENT（内容信号），为空则不过滤
   * @param page       页码（从0开始）
   * @param size       每页大小
   */
  @GetMapping("/list")
  public List<NotificationView> getNotificationsPaged(
          @RequestParam(name = "unreadOnly", required = false, defaultValue = "false") Boolean unreadOnly,
          @RequestParam(name = "signalType", required = false) String signalType,
          @RequestParam(name = "page", defaultValue = "0") int page,
          @RequestParam(name = "size", defaultValue = "20") int size) {
    Long userId = SecurityUtils.getCurrentUserId();
    Pageable pageable = PageRequest.of(page, size);
    return notificationService.getNotifications(userId, unreadOnly, signalType, pageable);
  }

  /**
   * 获取未读通知数（Long userId 版本）。
   * GET /api/notifications/count
   */
  @GetMapping("/count")
  public long getUnreadCountLong() {
    Long userId = SecurityUtils.getCurrentUserId();
    return notificationService.getUnreadCount(userId).count();
  }

  /**
   * 标记指定通知为已读（带用户验证）。
   * PUT /api/notifications/{id}/read-with-user
   */
  @PutMapping("/{id}/read-with-user")
  public void markAsReadWithUser(@PathVariable("id") Long notificationId) {
    Long userId = SecurityUtils.getCurrentUserId();
    notificationService.markAsRead(notificationId, userId);
  }

  /**
   * 标记所有通知为已读。
   * PUT /api/notifications/read-all
   */
  @PutMapping("/read-all")
  public void markAllAsRead() {
    Long userId = SecurityUtils.getCurrentUserId();
    notificationService.markAllAsRead(userId);
  }
}
