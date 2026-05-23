package com.campuslove.api.chat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Mock 互动通知服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟通知数据。
 */
@Profile("mock")
@Service
public class MockNotificationService implements NotificationService {

  private final AtomicLong notificationIdSeq = new AtomicLong(1);
  private final Map<Long, NotificationState> notificationsById = new LinkedHashMap<>();

  @Override
  public List<NotificationView> getNotifications(String userId) {
    if (userId == null || userId.isBlank()) {
      throw new IllegalArgumentException("userId is required");
    }

    if (notificationsById.isEmpty()) {
      buildMockNotifications(userId);
    }

    return notificationsById.values().stream()
        .map(this::toNotificationView)
        .toList();
  }

  @Override
  public void markAsRead(Long notificationId) {
    if (notificationId == null) {
      throw new IllegalArgumentException("notificationId is required");
    }

    NotificationState state = notificationsById.get(notificationId);
    if (state == null) {
      throw new IllegalArgumentException("notification not found: " + notificationId);
    }

    notificationsById.put(notificationId,
        new NotificationState(state.id(), state.userId(), state.type(),
            state.sourceUserName(), state.sourceUserAvatar(),
            state.referenceId(), state.referenceType(), true, state.createdAt()));
  }

  @Override
  public UnreadCountView getUnreadCount(String userId) {
    if (userId == null || userId.isBlank()) {
      throw new IllegalArgumentException("userId is required");
    }

    if (notificationsById.isEmpty()) {
      buildMockNotifications(userId);
    }

    long unreadCount = notificationsById.values().stream()
        .filter(n -> !n.isRead())
        .count();

    return new UnreadCountView(unreadCount);
  }

  private void buildMockNotifications(String userId) {
    Instant now = Instant.now();

    addNotification(new NotificationState(
        notificationIdSeq.getAndIncrement(), userId, "follow",
        "林安", "https://cdn.campuslove.cn/avatars/linan.png",
        1001L, "user", false,
        now.minusSeconds(300).toString()
    ));

    addNotification(new NotificationState(
        notificationIdSeq.getAndIncrement(), userId, "like",
        "周沐", "https://cdn.campuslove.cn/avatars/zhoumu.png",
        2001L, "post", false,
        now.minusSeconds(1800).toString()
    ));

    addNotification(new NotificationState(
        notificationIdSeq.getAndIncrement(), userId, "comment",
        "许诺", "https://cdn.campuslove.cn/avatars/xunuo.png",
        3001L, "comment", true,
        now.minusSeconds(3600).toString()
    ));

    addNotification(new NotificationState(
        notificationIdSeq.getAndIncrement(), userId, "visitor",
        "陈雨", "https://cdn.campuslove.cn/avatars/chenyu.png",
        null, null, false,
        now.minusSeconds(7200).toString()
    ));

    addNotification(new NotificationState(
        notificationIdSeq.getAndIncrement(), userId, "match",
        "赵阳", "https://cdn.campuslove.cn/avatars/zhaoyang.png",
        5001L, "user", false,
        now.minusSeconds(14400).toString()
    ));

    addNotification(new NotificationState(
        notificationIdSeq.getAndIncrement(), userId, "like",
        "孙悦", "https://cdn.campuslove.cn/avatars/sunyue.png",
        2002L, "post", false,
        now.minusSeconds(28800).toString()
    ));
  }

  private void addNotification(NotificationState state) {
    notificationsById.put(state.id(), state);
  }

  private NotificationView toNotificationView(NotificationState state) {
    String summary = buildSummary(state.type(), state.sourceUserName());
    return new NotificationView(
        state.id(),
        state.type(),
        new NotificationSourceUserView(state.sourceUserName(), state.sourceUserAvatar()),
        state.referenceId(),
        state.referenceType(),
        state.isRead(),
        state.createdAt(),
        summary
    );
  }

  private String buildSummary(String type, String sourceUserName) {
    return switch (type) {
      case "follow" -> sourceUserName + "关注了你";
      case "like" -> sourceUserName + "赞了你的帖子";
      case "comment" -> sourceUserName + "评论了你";
      case "visitor" -> sourceUserName + "访问了你的主页";
      case "match" -> "你和" + sourceUserName + "配对成功";
      default -> sourceUserName + "与你互动";
    };
  }

  private record NotificationState(
      long id,
      String userId,
      String type,
      String sourceUserName,
      String sourceUserAvatar,
      Long referenceId,
      String referenceType,
      boolean isRead,
      String createdAt
  ) {}

  // ---- Phase 2 新增方法 Mock 实现 ----

  @Override
  public List<NotificationView> getNotifications(Long userId, Boolean unreadOnly, Pageable pageable) {
    // Mock 实现：委托给原有方法
    return getNotifications(String.valueOf(userId));
  }

  @Override
  public long getUnreadCount(Long userId) {
    if (userId == null) {
      return 0;
    }
    return notificationsById.values().stream()
        .filter(n -> !n.isRead())
        .count();
  }

  @Override
  public void markAsRead(Long notificationId, Long userId) {
    markAsRead(notificationId);
  }

  @Override
  public void markAllAsRead(Long userId) {
    // Mock 实现：标记所有为已读
    for (Map.Entry<Long, NotificationState> entry : notificationsById.entrySet()) {
      NotificationState state = entry.getValue();
      if (!state.isRead()) {
        notificationsById.put(entry.getKey(),
            new NotificationState(state.id(), state.userId(), state.type(),
                state.sourceUserName(), state.sourceUserAvatar(),
                state.referenceId(), state.referenceType(), true, state.createdAt()));
      }
    }
  }

  @Override
  public void createNotification(Long userId, String type, Long sourceUserId, Long referenceId, String referenceType) {
    // Mock 实现：无操作
  }
}
