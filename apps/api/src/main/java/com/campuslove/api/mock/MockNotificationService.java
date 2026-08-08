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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
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

  // R4-01852~01856：mock 种子通知的演示时间偏移（秒），统一命名便于调整
  private static final long OFFSET_5_MINUTES = 300L;
  private static final long OFFSET_30_MINUTES = 1800L;
  private static final long OFFSET_1_HOUR = 3600L;
  private static final long OFFSET_2_HOURS = 7200L;
  private static final long OFFSET_4_HOURS = 14400L;

  private final AtomicLong notificationIdSeq = new AtomicLong(1);
  /** FIN-00061 修复：按用户隔离的通知存储（key=userId），消除所有用户共享内存状态互相污染 */
  private final Map<String, List<NotificationState>> notificationsByUser = new LinkedHashMap<>();

  /**
   * 国际化文案资源（R4-00406）。
   * <p>通知摘要中文文案不再硬编码拼接——经 {@link MessageSource} 按请求 Locale 解析
   * （资源 key 见 i18n/messages*.properties 的 mock.notify.* 分组）。
   * 单元测试直接 new 本服务时为 null，buildSummary 回退内置中文拼接。</p>
   */
  @Autowired(required = false)
  private MessageSource messageSource;

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
      // R4-01852~01856：演示时间偏移收敛为命名常量（5 分钟/30 分钟/1 小时/2 小时/4 小时）
      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "follow",
          "林安", MockMediaPaths.AVATAR_LINAN,
          1001L, "user", false,
          now.minusSeconds(OFFSET_5_MINUTES).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "like",
          "周沐", MockMediaPaths.AVATAR_ZHOU_MU,
          2001L, "post", false,
          now.minusSeconds(OFFSET_30_MINUTES).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "comment",
          "许诺", MockMediaPaths.AVATAR_XUNUO,
          3001L, "comment", true,
          now.minusSeconds(OFFSET_1_HOUR).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "visitor",
          "苏璃", MockMediaPaths.AVATAR_SULI,
          null, null, false,
          now.minusSeconds(OFFSET_2_HOURS).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "match",
          "夏野", MockMediaPaths.AVATAR_XIAYE,
          5001L, "user", false,
          now.minusSeconds(OFFSET_4_HOURS).toString()
      ));

      states.add(new NotificationState(
          notificationIdSeq.getAndIncrement(), uid, "like",
          "林安", MockMediaPaths.AVATAR_LINAN,
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

  /**
   * 构建通知摘要（R4-00406：文案经 i18n 资源解析，资源 key 见 mock.notify.*）。
   * 无 MessageSource（单元测试直接 new）时回退内置中文拼接文案。
   */
  private String buildSummary(String type, String sourceUserName) {
    return switch (type) {
      case "follow" -> resolveSummary("mock.notify.follow", sourceUserName + "关注了你", sourceUserName);
      case "like" -> resolveSummary("mock.notify.like", sourceUserName + "赞了你的帖子", sourceUserName);
      case "comment" -> resolveSummary("mock.notify.comment", sourceUserName + "评论了你", sourceUserName);
      case "visitor" -> resolveSummary("mock.notify.visitor", sourceUserName + "访问了你的主页", sourceUserName);
      case "match" -> resolveSummary("mock.notify.match", "你和" + sourceUserName + "配对成功", sourceUserName);
      default -> resolveSummary("mock.notify.other", sourceUserName + "与你互动", sourceUserName);
    };
  }

  /**
   * 按请求 Locale 解析通知摘要（R4-00406）。
   * MessageSource 未注入（单元测试）或解析失败时回退内置中文文案。
   */
  private String resolveSummary(String key, String fallback, String sourceUserName) {
    if (messageSource == null) {
      return fallback;
    }
    try {
      return messageSource.getMessage(key, new Object[]{sourceUserName}, fallback,
          org.springframework.context.i18n.LocaleContextHolder.getLocale());
    } catch (Exception e) {
      return fallback;
    }
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
