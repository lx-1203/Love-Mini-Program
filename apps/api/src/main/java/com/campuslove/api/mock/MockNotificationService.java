package com.campuslove.api.mock;

import com.campuslove.api.chat.NotificationService;
import com.campuslove.api.chat.NotificationSourceUserView;
import com.campuslove.api.chat.NotificationView;
import com.campuslove.api.chat.RealNotificationService;
import com.campuslove.api.chat.UnreadCountView;
import java.time.Instant;
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
 * Phase 3 更新：支持 signalType 分类筛选。
 */
@Profile("mock")
@Service
public class MockNotificationService implements NotificationService {

  private final AtomicLong notificationIdSeq = new AtomicLong(1);
  /** FIN-00061 修复：按用户隔离的通知存储（key=userId），消除所有用户共享内存状态互相污染 */
  private final Map<String, List<NotificationState>> notificationsByUser = new LinkedHashMap<>();

  @Override
  public List<NotificationView> getNotifications(Long userId) {
    return getNotifications(userId, null, (Pageable) null);
  }

  @Override
  public UnreadCountView getUnreadCount(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }

    List<NotificationState> states = getOrCreateUserNotifications(String.valueOf(userId));
    long unreadCount = states.stream()
        .filter(n -> !n.isRead())
        .count();

    return new UnreadCountView(unreadCount);
  }

  /**
   * FIN-00060 修复：mock 数据按用户隔离。
   *
   * <p>通知来源人统一使用推荐池人设（林安/周沐/许诺/苏璃/夏野），
   * 与 MockRuntimeState.recommendedPeople 一致，避免两套人名体系；
   * 头像使用本地 mock 资源路径（原 cdn.campuslove.cn 编造域名必 404）。</p>
   */
  private List<NotificationState> getOrCreateUserNotifications(String userId) {
    return notificationsByUser.computeIfAbsent(userId, uid -> {
      Instant now = Instant.now();
      List<NotificationState> states = new java.util.ArrayList<>();
      // 推荐池人设：林安(1001)、周沐(1002)、许诺(1003)、苏璃(1004)、夏野(1005)
      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "follow",
          "林安", "/uploads/mock/avatar-linan.jpg",
          1001L, "user", false,
          now.minusSeconds(300).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "like",
          "周沐", "/uploads/mock/avatar-zhoumu.jpg",
          2001L, "post", false,
          now.minusSeconds(1800).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "comment",
          "许诺", "/uploads/mock/avatar-xunuo.jpg",
          3001L, "comment", true,
          now.minusSeconds(3600).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "visitor",
          "苏璃", "/uploads/mock/avatar-suli.jpg",
          null, null, false,
          now.minusSeconds(7200).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "match",
          "夏野", "/uploads/mock/avatar-xiaye.jpg",
          5001L, "user", false,
          now.minusSeconds(14400).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "like",
          "林安", "/uploads/mock/avatar-linan.jpg",
          2002L, "post", false,
          now.minusSeconds(28800).toString()
      ));
      return states;
    });
  }

  @Override
  public void markAsRead(Long notificationId) {
    if (notificationId == null) {
      throw new IllegalArgumentException("notificationId is required");
    }

    for (List<NotificationState> states : notificationsByUser.values()) {
      for (int i = 0; i < states.size(); i++) {
        NotificationState state = states.get(i);
        if (state.id() == notificationId) {
          states.set(i, new NotificationState(state.id(), state.userId(), state.type(),
              state.sourceUserName(), state.sourceUserAvatar(),
              state.referenceId(), state.referenceType(), true, state.createdAt()));
          return;
        }
      }
    }
    throw new IllegalArgumentException("notification not found: " + notificationId);
  }

  private NotificationView toNotificationView(NotificationState state) {
    String summary = buildSummary(state.type(), state.sourceUserName());
    String signalType = RealNotificationService.determineSignalType(state.type());
    return new NotificationView(
        state.id(),
        state.type(),
        new NotificationSourceUserView(state.sourceUserName(), state.sourceUserAvatar()),
        state.referenceId(),
        state.referenceType(),
        state.isRead(),
        state.createdAt(),
        summary,
        signalType
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
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }

    // FIN-00060 修复：原实现忽略 unreadOnly 与分页（恒返回全部），现按语义过滤 + 分页。
    List<NotificationState> states = getOrCreateUserNotifications(String.valueOf(userId));
    var stream = states.stream();
    if (Boolean.TRUE.equals(unreadOnly)) {
      stream = stream.filter(n -> !n.isRead());
    }
    List<NotificationView> all = stream
        .map(this::toNotificationView)
        .toList();
    if (pageable == null) {
      return all;
    }
    int from = (int) Math.min(pageable.getOffset(), all.size());
    int to = (int) Math.min(from + pageable.getPageSize(), all.size());
    return from < all.size() ? all.subList(from, to) : List.of();
  }

  @Override
  public List<NotificationView> getNotifications(Long userId, Boolean unreadOnly, String signalType, Pageable pageable) {
    // 先按 unreadOnly + 分页过滤，再按 signalType 过滤（与 RealNotificationService 语义一致）
    List<NotificationView> allViews = getNotifications(userId, unreadOnly, pageable);
    if (signalType != null && !signalType.isBlank()) {
      return allViews.stream()
          .filter(view -> signalType.equals(view.signalType()))
          .toList();
    }
    return allViews;
  }

  @Override
  public void markAsRead(Long notificationId, Long userId) {
    markAsRead(notificationId);
  }

  @Override
  public void markAllAsRead(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }
    // FIN-00061 修复：仅标记当前用户的通知为已读（原实现标记全局共享状态）
    List<NotificationState> states = getOrCreateUserNotifications(String.valueOf(userId));
    for (int i = 0; i < states.size(); i++) {
      NotificationState state = states.get(i);
      if (!state.isRead()) {
        states.set(i, new NotificationState(state.id(), state.userId(), state.type(),
            state.sourceUserName(), state.sourceUserAvatar(),
            state.referenceId(), state.referenceType(), true, state.createdAt()));
      }
    }
  }

  @Override
  public void createNotification(Long userId, String type, Long sourceUserId, Long referenceId, String referenceType) {
    // Mock 实现：追加到当前用户的通知列表尾部，保持可观测性
    List<NotificationState> states = getOrCreateUserNotifications(String.valueOf(userId));
    NotificationState state = new NotificationState(
        notificationIdSeq.getAndIncrement(), String.valueOf(userId), type,
        "系统", null, referenceId, referenceType, false, Instant.now().toString());
    states.add(0, state);
  }

}
