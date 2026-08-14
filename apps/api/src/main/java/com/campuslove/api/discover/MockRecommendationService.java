package com.campuslove.api.discover;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.mock.MockRuntimeState;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 推荐服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟数据。
 */
@Profile("mock")
@Service
public class MockRecommendationService implements RecommendationService {

  private final MockRuntimeState runtimeState;

  /**
   * Mock 报名状态存储：activityId -> enrolled
   */
  private final Map<String, Boolean> enrollmentMap = new ConcurrentHashMap<>();

  public MockRecommendationService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

  @Override
  public List<DiscussionRecommendationView> getDiscussions() {
    return runtimeState.discussionRecommendations().stream()
        .map(item -> new DiscussionRecommendationView(
            item.id(),
            item.title(),
            item.summary(),
            item.heatLabel()
        ))
        .toList();
  }

  @Override
  public List<ActivityRecommendationView> getActivities() {
    return runtimeState.activityRecommendations().stream()
        .map(item -> new ActivityRecommendationView(
            item.id(),
            item.title(),
            item.location(),
            item.scheduleText(),
            item.description(),
            item.enrollmentCount(),
            item.participantAvatars()
        ))
        .toList();
  }

  @Override
  public ActivityEnrollmentView enrollActivity(String activityId, boolean enrolled, Long userId) {
    if (activityId == null || activityId.isBlank()) {
      throw new IllegalArgumentException("activityId is required");
    }

    MockRuntimeState.ActivityRecommendationData activity = runtimeState.activityRecommendations().stream()
        .filter(a -> a.id().equals(activityId))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

    enrollmentMap.put(activityId, enrolled);

    int enrollmentCount = enrolled
        ? activity.enrollmentCount() + 1
        : activity.enrollmentCount();

    return new ActivityEnrollmentView(activityId, enrolled, enrollmentCount);
  }

  @Override
  public ActivityDetailView getActivityDetail(String activityId, Long userId) {
    if (activityId == null || activityId.isBlank()) {
      throw new IllegalArgumentException("activityId is required");
    }

    MockRuntimeState.ActivityRecommendationData activity = runtimeState.activityRecommendations().stream()
        .filter(a -> a.id().equals(activityId))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

    boolean isEnrolled = enrollmentMap.getOrDefault(activityId, false);

    return new ActivityDetailView(
        Long.valueOf(activity.id()),
        activity.title(),
        activity.location(),
        activity.scheduleText(),
        activity.description(),
        activity.enrollmentCount(),
        activity.participantAvatars(),
        "upcoming",
        LocalDate.now(TimeZones.BUSINESS).plusDays(1),
        isEnrolled,
        "other",
        null
    );
  }

  @Override
  public RecommendationPreferencesView getPreferences() {
    return new RecommendationPreferencesView("12:00", "campus_first", true);
  }

  @Override
  public RecommendationPreferencesView updatePreferences(RecommendationPreferencesView prefs) {
    if (prefs == null || prefs.dailyNotifyTime() == null || prefs.scope() == null) {
      throw new IllegalArgumentException("dailyNotifyTime and scope are required");
    }
    return prefs;
  }

  @Override
  public List<RecommendedPersonView> getRecommendations(Long userId) {
    // Mock 实现：将 MockRuntimeState.recommendedPeople 转换为 RecommendedPersonView
    return runtimeState.recommendedPeople().stream()
        .map(this::toView)
        .toList();
  }

  @Override
  public List<RecommendedPersonView> getRecommendations(Long userId, RecommendationFilter filter) {
    // Phase B - Task B2.12: 在 mock 候选池上实现 in-memory filter，
    // 复用与 RealRecommendationService.matchesFilter 相同的逻辑。
    // filter 为 null 或空时返回全部 mock 数据，向后兼容。
    if (filter == null || filter.isEmpty()) {
      return getRecommendations(userId);
    }
    return runtimeState.recommendedPeople().stream()
        .filter(person -> matchesFilter(person, filter))
        .map(this::toView)
        .toList();
  }

  @Override
  public List<RecommendedPersonView> getRecommendationsForGuest(RecommendationFilter filter) {
    // Mock 实现：与登录用户一致，返回 mock 候选池（游客无个性化上下文，
    // mock 数据本身不含个性化逻辑，直接复用同一数据源保证两端口径一致）
    return getRecommendations(null, filter);
  }

  /** MBTI 候选池（按推荐顺序稳定取模，保证每次展示一致） */
  private static final List<String> MBTI_POOL =
      List.of("INFJ", "INTP", "ENFP", "ISFP", "ENTJ", "INFP", "ESTJ", "ISTP");

  /** 性格标签候选池（与兴趣标签拼合后取前 N 个） */
  private static final List<String> PERSONALITY_POOL =
      List.of("阳光开朗", "慢热但真诚", "理性务实", "温柔细腻", "幽默健谈", "安静专注", "行动力强", "共情力强");

  /** 悄悄话候选池 */
  private static final List<String> WHISPER_POOL = List.of(
      "第一次见面可以从一杯咖啡开始，紧张也没关系。",
      "比起闲聊，我更想听听你今天真正在想什么。",
      "希望第一段对话能留下点想象空间。",
      "我偏爱傍晚的校园散步，灯亮起来的时候最适合认识新朋友。"
  );

  /** 期待画像候选池 */
  private static final List<String> EXPECTED_PARTNER_POOL = List.of(
      "真诚、边界感清晰，聊天节奏合拍。",
      "喜欢深度对话，对生活有自己的节奏。",
      "温柔有耐心，愿意从一杯咖啡慢慢认识彼此。",
      "直接、不绕弯子，共同规划未来的生活。"
  );

  /** 活跃状态候选池（循环使用，展示"刚刚活跃/今天/几小时前/离线"） */
  private static final List<String> ACTIVE_POOL =
      List.of("just_now", "today", "hours_2", "offline", "hours_5", "days_1");

  /** 职业候选池（V2026.08.08.0015，与 real 种子口径一致） */
  private static final List<String> OCCUPATION_POOL =
      List.of("产品经理", "互联网运营", "研究生在读", "程序员", "设计", "自媒体");

  /** 月收入档位候选池（V2026.08.08.0015，与 real 种子口径一致） */
  private static final List<String> INCOME_POOL =
      List.of("3k-8k", "8k-15k", "15k-30k", "30k+");

  /**
   * 将 mock 数据记录转换为推荐人物视图。
   *
   * <p>Phase Feedback1：补齐卡片重设计所需全部字段——认证双次、距离、活跃、
   * 性格/MBTI、悄悄话、期待画像、动态预览、IP 属地、私信权限、展示 ID 等，
   * 使展示版在真实 HTTP 数据下完整呈现寻觅页所有信息。</p>
   *
   * @param person mock 推荐人物数据
   * @return 推荐人物视图
   */
  private RecommendedPersonView toView(MockRuntimeState.RecommendedPersonData person) {
    Long id = tryParseLong(person.id());
    // 展示 ID：CL-1001 起递增（稳定推导，避免每次不同）
    int ordinal = person.id().equals("person-1") ? 1001
        : person.id().equals("person-2") ? 1002
        : person.id().equals("person-3") ? 1003
        : person.id().equals("person-4") ? 1004
        : person.id().equals("person-5") ? 1005 : 1006;
    String displayId = "CL-" + ordinal;

    // IP 属地：由 hometown 推导（如 "广东省 · 广州市"）
    String ipLocation = buildIpLocation(person);

    // 距离文案：同城/同省 vs 具体 km（mock 稳定推导）
    String distanceText = buildDistanceText(person);

    // 活跃状态（按 person 稳定取模）
    String activeStatusText = ACTIVE_POOL.get(Math.abs(person.name().hashCode()) % ACTIVE_POOL.size());

    // 双重认证：mock 前 4 位全量双认证，第 5 位仅机器认证（展示差异）
    boolean machineVerified = true;
    boolean humanVerified = !person.id().equals("person-5");

    // 性格标签：从兴趣标签 + 候选池稳定拼合
    List<String> personality = buildPersonality(person);

    // MBTI：稳定取模
    String mbti = MBTI_POOL.get(Math.abs(person.name().hashCode()) % MBTI_POOL.size());

    // 悄悄话 + 期待画像
    String whisper = WHISPER_POOL.get(Math.abs(person.name().hashCode()) % WHISPER_POOL.size());
    String expectedPartner = EXPECTED_PARTNER_POOL.get(Math.abs(person.name().hashCode()) % EXPECTED_PARTNER_POOL.size());

    // 动态预览（2 条稳定 mock，真实场景由后端用户动态下发）
    List<RecommendedPersonView.RecentPostView> recentPosts = List.of(
        new RecommendedPersonView.RecentPostView(
            "mp-" + ordinal + "-1",
            person.bio(),
            List.of(),
            8 + ordinal % 20,
            2 + ordinal % 6,
            false,
            "2026-08-01T12:00:00"
        ),
        new RecommendedPersonView.RecentPostView(
            "mp-" + ordinal + "-2",
            "这周想试着早睡，然后在操场慢跑两圈。",
            List.of(),
            15 + ordinal % 30,
            5,
            false,
            "2026-07-28T09:30:00"
        )
    );

    // 私信权限：默认不允许（前端走交友币/会员解锁流程演示）
    boolean allowMessage = false;

    // 半身照/照片墙：复用头像（mock 无独立素材，保证卡片大图可显示）
    String avatar = person.avatarUrl();
    List<String> photoGallery = avatar != null ? List.of(avatar) : List.of();

    return new RecommendedPersonView(
        id,
        person.name(),
        person.initials(),
        person.headline(),
        person.commonGround(),
        person.availability(),
        "", // campusName：mock 数据未维护，留空
        avatar,
        person.interestTags(),
        person.bio() != null ? person.bio() : "",
        avatar != null ? List.of(avatar) : List.of(),
        false,
        false,
        0,
        person.height(),
        person.educationLevel(),
        photoGallery,
        avatar, // halfBodyPhotoUrl：复用头像
        null, // personalVideoUrl：mock 未提供
        person.id().equals("person-1") ? "school"
            : person.id().equals("person-2") ? "idcard"
            : person.id().equals("person-3") ? "email" : "none",
        displayId,
        distanceText,
        activeStatusText,
        machineVerified,
        humanVerified,
        personality,
        mbti,
        whisper,
        false, // whisperSent
        recentPosts,
        expectedPartner,
        allowMessage,
        ipLocation,
        // V2026.08.08.0015：卡片完整字段（mock 稳定推导，与 real 口径一致）
        // R4-00337：incomeRange 已从公开推荐视图移除（敏感经济信息），INCOME_POOL 保留兼容
        OCCUPATION_POOL.get(Math.abs(person.name().hashCode()) % OCCUPATION_POOL.size()),
        person.age(),
        "2026-03-12T08:00:00",
        // V3（2026-08-12）：他人主页背景——mock 复用半身照/头像，保证他人主页有背景可展示
        avatar
    );
  }

  /** 由 hometown 推导 IP 属地（省份 · 城市）。 */
  private String buildIpLocation(MockRuntimeState.RecommendedPersonData person) {
    String province = person.hometownProvince();
    String city = person.hometownCity();
    if (province == null && city == null) return null;
    if (city == null) return province;
    if (province != null && province.equals(city)) return city;
    return province != null ? province + " · " + city : city;
  }

  /** 由 hometown 推导距离文案：同市为"同城"，否则按稳定 hash 给 km。 */
  private String buildDistanceText(MockRuntimeState.RecommendedPersonData person) {
    String city = person.hometownCity();
    if ("广州市".equals(city)) return "同校附近";
    if ("北京市".equals(city)) return "同城";
    double km = 3.2 + (Math.abs(person.name().hashCode()) % 120) / 10.0;
    return String.format(java.util.Locale.ROOT, "%.1fkm", km);
  }

  /** 性格标签：兴趣标签 + 候选池稳定拼合（前 4 个）。 */
  private List<String> buildPersonality(MockRuntimeState.RecommendedPersonData person) {
    java.util.LinkedHashSet<String> tags = new java.util.LinkedHashSet<>();
    if (person.interestTags() != null) {
      tags.addAll(person.interestTags());
    }
    int base = Math.abs(person.name().hashCode()) % PERSONALITY_POOL.size();
    for (int i = 0; i < 3; i++) {
      tags.add(PERSONALITY_POOL.get((base + i) % PERSONALITY_POOL.size()));
    }
    return List.copyOf(tags);
  }

  /**
   * 将 mock 数据 id（如 person-1）解析为 Long，失败时返回 null。
   * 用于将字符串 ID 转换为视图所需的 Long ID。
   *
   * @param id 字符串 ID
   * @return Long 类型 ID，无法解析时返回 null
   */
  private Long tryParseLong(String id) {
    if (id == null || id.isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(id);
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  /**
   * 判断 mock 数据是否满足筛选条件（与 RealRecommendationService.matchesFilter 逻辑一致）。
   * 任一维度不满足即返回 false；所有激活的维度都通过才返回 true。
   *
   * <p>实现说明：直接对原始 RecommendedPersonData 进行筛选，避免视图转换丢失
   * relationshipStatus/hometownProvince/hometownCity/futureCity 等字段。
   * mock 数据已包含全部筛选维度，不需要 DB 回查。</p>
   *
   * @param person mock 推荐人物数据
   * @param filter 筛选条件
   * @return true 表示满足筛选条件
   */
  private boolean matchesFilter(MockRuntimeState.RecommendedPersonData person,
                                RecommendationFilter filter) {
    // 1. height 范围（闭区间）
    if (filter.heightMin() != null) {
      if (person.height() == null || person.height() < filter.heightMin()) {
        return false;
      }
    }
    if (filter.heightMax() != null) {
      if (person.height() == null || person.height() > filter.heightMax()) {
        return false;
      }
    }
    // 2. educationLevel 多选
    if (!filter.educationLevels().isEmpty()) {
      if (person.educationLevel() == null
          || !filter.educationLevels().contains(person.educationLevel())) {
        return false;
      }
    }
    // 3. relationshipStatus 多选
    if (!filter.relationshipStatuses().isEmpty()) {
      if (person.relationshipStatus() == null
          || !filter.relationshipStatuses().contains(person.relationshipStatus())) {
        return false;
      }
    }
    // 4. hometownProvince 等值
    if (filter.hometownProvince() != null) {
      if (person.hometownProvince() == null
          || !filter.hometownProvince().equals(person.hometownProvince())) {
        return false;
      }
    }
    // 5. hometownCity 等值
    if (filter.hometownCity() != null) {
      if (person.hometownCity() == null
          || !filter.hometownCity().equals(person.hometownCity())) {
        return false;
      }
    }
    // 6. futureCity 等值
    if (filter.futureCity() != null) {
      if (person.futureCity() == null
          || !filter.futureCity().equals(person.futureCity())) {
        return false;
      }
    }
    // 7. keyword 模糊匹配 nickname/bio/interestTags
    if (filter.keyword() != null) {
      String kw = filter.keyword().toLowerCase(Locale.ROOT);
      boolean inName = person.name() != null
          && person.name().toLowerCase(Locale.ROOT).contains(kw);
      boolean inBio = person.bio() != null
          && person.bio().toLowerCase(Locale.ROOT).contains(kw);
      boolean inTags = person.interestTags() != null
          && person.interestTags().stream()
              .anyMatch(t -> t != null && t.toLowerCase(Locale.ROOT).contains(kw));
      if (!(inName || inBio || inTags)) {
        return false;
      }
    }
    // 8. age 范围（闭区间，V2026.08.08.0015）
    if (filter.ageMin() != null) {
      if (person.age() == null || person.age() < filter.ageMin()) {
        return false;
      }
    }
    if (filter.ageMax() != null) {
      if (person.age() == null || person.age() > filter.ageMax()) {
        return false;
      }
    }
    return true;
  }

  @Override
  public RecommendationPreferencesView getPreferences(Long userId) {
    return new RecommendationPreferencesView("12:00", "campus_first", true);
  }

  @Override
  public RecommendationPreferencesView savePreferences(Long userId, String preferredTime, String scope, Boolean campusPriority) {
    if (preferredTime == null || scope == null) {
      throw new IllegalArgumentException("preferredTime and scope are required");
    }
    return new RecommendationPreferencesView(preferredTime, scope, campusPriority != null ? campusPriority : true);
  }

  @Override
  public RecommendationPreferencesView updatePreferences(Long userId, RecommendationPreference data) {
    // Mock 实现：不持久化，直接返回传入的偏好数据
    if (userId == null) {
      throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
    }
    if (data == null) {
      throw new IllegalArgumentException(ErrorMessages.PREFERENCE_DATA_REQUIRED);
    }
    return new RecommendationPreferencesView(data.getPreferredTime(), data.getScope(), data.getCampusPriority());
  }

  @Override
  public List<RecommendedPersonView> getHistory(Long userId) {
    // Mock 实现：返回空列表
    return List.of();
  }
}
