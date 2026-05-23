package com.campuslove.api.match;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 匹配服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟匹配数据。
 */
@Profile("mock")
@Service
public class MockMatchService implements MatchService {

  private final AtomicLong ids = new AtomicLong(1);
  private final Map<String, MatchResultView> matches = new LinkedHashMap<>();
  private String nextQueueStatus;

  @Override
  public MatchFormConfigView getFormConfig() {
    return new MatchFormConfigView(List.of(
        new MatchFormSectionView(
            "intent",
            "匹配目标",
            List.of(new MatchFormFieldView(
                "matchIntent",
                "single-select",
                "从什么开始",
                List.of(
                    new MatchOptionView("topic", "话题匹配"),
                    new MatchOptionView("coffee", "咖啡散步"),
                    new MatchOptionView("study", "自习搭子")
                ),
                null,
                null
            ))
        ),
        new MatchFormSectionView(
            "filters",
            "筛选条件",
            List.of(
                new MatchFormFieldView(
                    "topicIds",
                    "multi-select",
                    "话题",
                    List.of(
                        new MatchOptionView("music", "音乐"),
                        new MatchOptionView("film", "电影"),
                        new MatchOptionView("sports", "运动"),
                        new MatchOptionView("food", "美食")
                    ),
                    null,
                    null
                ),
                new MatchFormFieldView(
                    "timeWindow",
                    "single-select",
                    "时间",
                    List.of(
                        new MatchOptionView("today-evening", "今晚"),
                        new MatchOptionView("tomorrow", "明天"),
                        new MatchOptionView("this-week", "本周")
                    ),
                    null,
                    null
                ),
                new MatchFormFieldView(
                    "durationMinutes",
                    "stepper",
                    "聊天时长",
                    List.of(),
                    15,
                    60
                )
            )
        )
    ));
  }

  @Override
  public MatchResultView createMatch(MatchRequest request) {
    return saveMatch(
        nextMatchId(),
        request.topicIds() == null || request.topicIds().isEmpty()
            ? "话题"
            : toTopicLabel(request.topicIds().get(0)),
        request.durationMinutes()
    );
  }

  @Override
  public MatchResultView createQuickMatch(QuickMatchRequest request) {
    return saveMatch(nextMatchId(), "快速匹配", request.durationMinutes());
  }

  @Override
  public MatchResultView getMatch(String id) {
    return matches.getOrDefault(
        id,
        new MatchResultView(
            id,
            "connected",
            "音乐",
            "大二，喜欢低压力的第一次见面。",
            20,
            "可以先问问，对方心里最轻松的一次校园初见应该是什么样。",
            "session-" + id
        )
    );
  }

  @Override
  public void setForceQueued(boolean forceQueued) {
    this.nextQueueStatus = forceQueued ? "queued" : null;
  }

  @Override
  public void setNextQueueStatus(String queueStatus) {
    this.nextQueueStatus = switch (queueStatus) {
      case "queued", "connected", "expired" -> queueStatus;
      default -> throw new IllegalArgumentException("Unsupported queue status: " + queueStatus);
    };
  }

  private MatchResultView saveMatch(String id, String topicLabel, Integer durationMinutes) {
    String queueStatus = nextQueueStatus == null ? "connected" : nextQueueStatus;
    nextQueueStatus = null;
    Integer countdownMinutes = "expired".equals(queueStatus)
        ? 0
        : durationMinutes == null ? 20 : durationMinutes;

    MatchResultView result = new MatchResultView(
        id,
        queueStatus,
        topicLabel,
        "大二，喜欢低压力的第一次见面。",
        countdownMinutes,
        "可以先问问，对方心里最轻松的一次校园初见应该是什么样。",
        "connected".equals(queueStatus) ? "session-" + id : null
    );
    matches.put(id, result);
    return result;
  }

  private String toTopicLabel(String topicId) {
    return switch (topicId) {
      case "music" -> "音乐";
      case "film" -> "电影";
      case "sports" -> "运动";
      case "food" -> "美食";
      default -> topicId;
    };
  }

  private String nextMatchId() {
    return "match-" + ids.incrementAndGet();
  }

  // ---- Phase 2 新增方法 Mock 实现 ----

  @Override
  public HeartSignalView likeUser(Long userId, Long targetUserId) {
    // Mock 实现：不产生心动信号
    return null;
  }

  @Override
  public void cancelLike(Long userId, Long targetUserId) {
    // Mock 实现：无操作
  }

  @Override
  public List<LikedUserView> getLikedMe(Long userId) {
    return List.of();
  }

  @Override
  public List<VisitorView> getVisitors(Long userId) {
    return List.of();
  }

  @Override
  public void recordVisit(Long visitorId, Long visitedUserId) {
    // Mock 实现：无操作
  }

  @Override
  public List<HeartSignalView> getHeartSignals(Long userId) {
    return List.of();
  }

  @Override
  public void acceptHeartSignal(Long signalId, Long userId) {
    // Mock 实现：无操作
  }

  @Override
  public void declineHeartSignal(Long signalId, Long userId) {
    // Mock 实现：无操作
  }

  // ---- Phase 2 新增：左滑/反悔/我喜欢的/访客已读 ----

  @Override
  public void passUser(Long userId, Long passedUserId) {
    // Mock 实现：无操作
  }

  @Override
  public RewindResultView rewind(Long userId) {
    // Mock 实现：返回失败（无 pass 记录可撤销）
    return new RewindResultView(false, "没有可撤销的 pass 记录");
  }

  @Override
  public List<LikedUserView> getMyLikes(Long userId) {
    return List.of();
  }

  @Override
  public void markVisitorRead(Long visitorId) {
    // Mock 实现：无操作
  }
}
