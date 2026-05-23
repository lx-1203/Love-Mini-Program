package com.campuslove.api.discover;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Mock 兴趣圈服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 */
@Profile("mock")
@Service
public class MockCircleService implements CircleService {

  private static final List<CircleData> PRESET_CIRCLES = List.of(
      new CircleData(1L, "摄影圈", "\uD83D\uDCF7", "用镜头记录校园的每一刻美好", 328, 1),
      new CircleData(2L, "运动圈", "\u26BD", "一起流汗，一起变强", 512, 2),
      new CircleData(3L, "读书圈", "\uD83D\uDCDA", "分享书单与阅读感悟", 196, 3),
      new CircleData(4L, "音乐圈", "\uD83C\uDFB5", "从民谣到摇滚，总有一种旋律打动你", 437, 4),
      new CircleData(5L, "美食圈", "\uD83C\uDF5C", "探索校园周边的隐藏美味", 603, 5),
      new CircleData(6L, "旅行圈", "\u2708\uFE0F", "分享旅途故事和攻略", 271, 6)
  );

  private final List<Long> joinedCircleIds = new ArrayList<>(List.of(1L, 4L));
  private final Map<Long, List<TopicData>> topicsByCircle;
  private final Map<Long, List<ReplyData>> repliesByTopic;

  public MockCircleService() {
    this.topicsByCircle = buildMockTopics();
    this.repliesByTopic = buildMockReplies();
  }

  @Override
  public List<CircleView> getCircles(Long userId) {
    return PRESET_CIRCLES.stream()
        .map(circle -> {
          boolean joined = joinedCircleIds.contains(circle.id);
          return new CircleView(
              circle.id,
              circle.name,
              circle.icon,
              circle.description,
              circle.memberCount,
              joined
          );
        })
        .toList();
  }

  @Override
  public CircleMembershipView joinCircle(Long userId, Long circleId) {
    CircleData circle = PRESET_CIRCLES.stream()
        .filter(c -> c.id.equals(circleId))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Circle not found: " + circleId));

    if (!joinedCircleIds.contains(circleId)) {
      joinedCircleIds.add(circleId);
    }
    return new CircleMembershipView(circleId, true, circle.memberCount + 1);
  }

  @Override
  public CircleMembershipView leaveCircle(Long userId, Long circleId) {
    CircleData circle = PRESET_CIRCLES.stream()
        .filter(c -> c.id.equals(circleId))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Circle not found: " + circleId));

    joinedCircleIds.remove(circleId);
    return new CircleMembershipView(circleId, false, circle.memberCount - 1);
  }

  @Override
  public Page<CircleTopicView> getTopics(Long circleId, Pageable pageable) {
    List<TopicData> topics = topicsByCircle.getOrDefault(circleId, List.of());
    List<CircleTopicView> views = topics.stream()
        .map(t -> new CircleTopicView(
            t.id,
            circleId,
            getCircleName(circleId),
            t.authorId,
            t.authorName,
            t.title,
            truncate(t.content, 80),
            t.images != null ? t.images : List.of(),
            t.replyCount,
            false,
            t.createdAt
        ))
        .toList();

    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), views.size());
    List<CircleTopicView> pageContent = start < views.size() ? views.subList(start, end) : List.of();
    return new PageImpl<>(pageContent, pageable, views.size());
  }

  @Override
  public CircleTopicView createTopic(Long circleId, Long authorId, String title, String content, List<String> images) {
    long newId = System.currentTimeMillis() % 100000;
    TopicData topic = new TopicData(
        newId,
        title,
        content,
        images,
        0,
        authorId,
        "Mock用户",
        LocalDateTime.now()
    );

    topicsByCircle.computeIfAbsent(circleId, k -> new ArrayList<>()).add(0, topic);

    return new CircleTopicView(
        topic.id,
        circleId,
        getCircleName(circleId),
        topic.authorId,
        topic.authorName,
        topic.title,
        truncate(topic.content, 80),
        topic.images != null ? topic.images : List.of(),
        topic.replyCount,
        false,
        topic.createdAt
    );
  }

  @Override
  public CircleTopicView getTopicDetail(Long topicId) {
    for (Map.Entry<Long, List<TopicData>> entry : topicsByCircle.entrySet()) {
      for (TopicData t : entry.getValue()) {
        if (t.id.equals(topicId)) {
          return new CircleTopicView(
              t.id,
              entry.getKey(),
              getCircleName(entry.getKey()),
              t.authorId,
              t.authorName,
              t.title,
              t.content,
              t.images != null ? t.images : List.of(),
              t.replyCount,
              false,
              t.createdAt
          );
        }
      }
    }
    throw new IllegalArgumentException("Topic not found: " + topicId);
  }

  @Override
  public CircleReplyView replyToTopic(Long topicId, Long authorId, String content) {
    long newId = System.currentTimeMillis() % 100000;
    ReplyData reply = new ReplyData(
        newId,
        content,
        authorId,
        "Mock用户",
        LocalDateTime.now()
    );

    repliesByTopic.computeIfAbsent(topicId, k -> new ArrayList<>()).add(reply);
    return new CircleReplyView(
        reply.id,
        topicId,
        reply.authorId,
        reply.authorName,
        reply.content,
        reply.createdAt
    );
  }

  @Override
  public Page<CircleReplyView> getReplies(Long topicId, Pageable pageable) {
    List<ReplyData> replies = repliesByTopic.getOrDefault(topicId, List.of());
    List<CircleReplyView> views = replies.stream()
        .map(r -> new CircleReplyView(
            r.id,
            topicId,
            r.authorId,
            r.authorName,
            r.content,
            r.createdAt
        ))
        .toList();

    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), views.size());
    List<CircleReplyView> pageContent = start < views.size() ? views.subList(start, end) : List.of();
    return new PageImpl<>(pageContent, pageable, views.size());
  }

  @Override
  public Page<CircleTopicView> getFeaturedTopics(Pageable pageable) {
    List<CircleTopicView> allTopics = new ArrayList<>();
    for (Map.Entry<Long, List<TopicData>> entry : topicsByCircle.entrySet()) {
      for (TopicData t : entry.getValue()) {
        allTopics.add(new CircleTopicView(
            t.id,
            entry.getKey(),
            getCircleName(entry.getKey()),
            t.authorId,
            t.authorName,
            t.title,
            truncate(t.content, 80),
            t.images != null ? t.images : List.of(),
            t.replyCount,
            false,
            t.createdAt
        ));
      }
    }

    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), allTopics.size());
    List<CircleTopicView> pageContent = start < allTopics.size() ? allTopics.subList(start, end) : List.of();
    return new PageImpl<>(pageContent, pageable, allTopics.size());
  }

  private String getCircleName(Long circleId) {
    return PRESET_CIRCLES.stream()
        .filter(c -> c.id.equals(circleId))
        .map(c -> c.name)
        .findFirst()
        .orElse("未知圈子");
  }

  private Map<Long, List<TopicData>> buildMockTopics() {
    Map<Long, List<TopicData>> map = new LinkedHashMap<>();

    map.put(1L, List.of(
        new TopicData(101L, "落日下的图书馆怎么拍最好看？",
            "最近傍晚的光线特别温柔，图书馆西侧的光影很漂亮，大家有没有推荐的机位和参数？",
            List.of("https://picsum.photos/400/300?1"), 12, 1002L, "林安", LocalDateTime.now().minusHours(2)),
        new TopicData(102L, "手机也能拍出胶片感吗？",
            "分享一些手机调色的思路，不用专业相机也能出片。附上我最近拍的几张。",
            List.of("https://picsum.photos/400/300?2", "https://picsum.photos/400/300?3"), 8, 1003L, "周沐",
            LocalDateTime.now().minusHours(5))
    ));

    map.put(2L, List.of(
        new TopicData(201L, "每周三晚操场夜跑组队",
            "配速6分左右，跑5公里，男女不限，一起互相督促！",
            null, 23, 1004L, "许诺", LocalDateTime.now().minusHours(1))
    ));

    map.put(4L, List.of(
        new TopicData(401L, "推荐一个超适合自习时听的歌单",
            "亲测不催眠，节奏刚好能集中注意力，链接在正文里。",
            null, 15, 1002L, "林安", LocalDateTime.now().minusDays(1))
    ));

    return map;
  }

  private Map<Long, List<ReplyData>> buildMockReplies() {
    Map<Long, List<ReplyData>> map = new LinkedHashMap<>();

    map.put(101L, List.of(
        new ReplyData(1001L, "推荐用50mm定焦，光圈开到f2.8，稍微低一点的角度！", 1004L, "许诺",
            LocalDateTime.now().minusHours(1)),
        new ReplyData(1002L, "黄金时刻（日落前后半小时）去拍效果最好", 1001L, "星野",
            LocalDateTime.now().minusMinutes(30))
    ));

    map.put(201L, List.of(
        new ReplyData(2001L, "我！正好想找人一起跑，一个人太难坚持了。", 1003L, "周沐",
            LocalDateTime.now().minusMinutes(45))
    ));

    return map;
  }

  private static String truncate(String text, int maxLen) {
    if (text == null) {
      return null;
    }
    return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
  }

  record CircleData(Long id, String name, String icon, String description, int memberCount, int sortOrder) {
  }

  record TopicData(Long id, String title, String content, List<String> images, int replyCount,
                   Long authorId, String authorName, LocalDateTime createdAt) {
  }

  record ReplyData(Long id, String content, Long authorId, String authorName, LocalDateTime createdAt) {
  }
}
