package com.campuslove.api.mock;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("mock")
public class MockRuntimeState {

    /**
     * 国际化文案资源（R4-00398）。
     * <p>mock 会话/资料中文文案不再硬编码在 Java 常量中——displayName / loginHero /
     * basicProfile 等展示文案经 {@link MessageSource} 按请求 Locale 解析
     * （资源 key 见 i18n/messages*.properties 的 mock.* 分组）。
     * 单元测试直接 new 本组件时为 null，各 getter 回退到内置默认值。</p>
     */
    @Autowired(required = false)
    private MessageSource messageSource;

    /** 无 MessageSource（单元测试）时的默认展示名 */
    private static final String DEFAULT_DISPLAY_NAME = "星野";

    /**
     * mock 会话默认用户 ID（R4-00399 配置化）。
     * 默认 "user-1001"（历史值），可通过 app.mock.session-user-id 覆盖，
     * 便于本地演示模拟多用户会话。
     */
    @org.springframework.beans.factory.annotation.Value("${app.mock.session-user-id:user-1001}")
    private String sessionUserId = "user-1001";

    /** mock 媒体占位路径前缀（R4-01799 统一常量，替换本地演示素材时改一处即可） */
    public static final String MOCK_MEDIA_PATH_PREFIX = "/uploads/mock/";

  private boolean loggedIn;
  private boolean phoneBound;
  private boolean profileCompleted;
  private boolean campusVerified;
  private boolean scheduleCompleted;
  private String displayName = DEFAULT_DISPLAY_NAME;
  private String campusName;
  private LoginHeroData loginHero = new LoginHeroData(
      "video",
      null,
      null,
      "campus-night",
      "校园恋爱",
      "先从推荐的人、讨论圈、活动和临时聊天开始认识彼此。",
      true
  );

  private BasicProfileData basicProfile = new BasicProfileData(
      "星野",
      "安静、好奇，更喜欢一对一慢慢聊。",
      "大三",
      "她/她",
      168,
      "bachelor",
      "never",
      "广东省",
      "广州市",
      "广州市",
      List.of("摄影", "养猫"),
      // R4-00398 说明：媒体占位路径（/uploads/mock/*）保留——mock 资料完整度契约
      // （profile_completion=100）依赖这些字段非空；客户端 SafeImage 对加载失败
      // 的图片自动回退首字占位，不会展示破图。mock 包已从生产 jar 排除（R4-00367），
      // 影响面仅限本地演示。推荐卡片（recommendedPeople/activityRecommendations）
      // 的头像已置空走客户端占位。
      // R4-01799：占位路径统一收敛为常量（见 MOCK_MEDIA_PATH_PREFIX），
      // 替换本地演示素材时只需改一处。
      List.of(MOCK_MEDIA_PATH_PREFIX + "photo-1.jpg"),
      MOCK_MEDIA_PATH_PREFIX + "half.jpg",
      MOCK_MEDIA_PATH_PREFIX + "intro.mp4",
      MOCK_MEDIA_PATH_PREFIX + "bg.jpg"
  );

  private ProfileStatsData profileStats = new ProfileStatsData(28, 16, 104);

  private CampusProfileData campusProfile = new CampusProfileData(
      "广州",
      "南校区",
      "工业设计",
      "draft"
  );

  private ScheduleProfileData scheduleProfile = new ScheduleProfileData(
      "图书馆和北草坪",
      List.of("今晚", "本周"),
      List.of(
          new ScheduleBlockData("b-1", "周一", "09:00", "10:30", "设计课"),
          new ScheduleBlockData("b-2", "周三", "14:00", "15:30", "专题讨论")
      )
  );

  private final List<RecommendedPersonData> recommendedPeople = List.of(
      new RecommendedPersonData(
          "person-1",
          "林安",
          "林",
          "工业设计大三，偏好低压力的第一轮聊天。",
          "共同兴趣：电影夜和安静的咖啡馆路线",
          "合适时间：今晚 19:00 之后",
          null,
          21,
          168,
          "bachelor",
          "never",
          "广东省",
          "广州市",
          "广州市",
          "工业设计大三，偏好低压力的第一轮聊天。",
          List.of("电影", "咖啡馆")
      ),
      new RecommendedPersonData(
          "person-2",
          "周沐",
          "周",
          "更适合从音乐话题切入，再配一段短距离校园散步。",
          "节奏接近：更喜欢短时见面和明确时段",
          "合适时间：周五 16:00-18:00",
          null,
          22,
          175,
          "master",
          "never",
          "北京市",
          "北京市",
          "北京市",
          "更喜欢从音乐话题切入，再配一段短距离校园散步。",
          List.of("音乐", "散步")
      ),
      new RecommendedPersonData(
          "person-3",
          "许诺",
          "许",
          "喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。",
          "共同偏好：校园人多时也接受室内兜底",
          "合适时间：周末下午",
          null,
          21,
          180,
          "bachelor",
          "single",
          "江苏省",
          "南京市",
          "上海市",
          "喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。",
          List.of("咖啡", "摄影")
      ),
      new RecommendedPersonData(
          "person-4",
          "苏璃",
          "苏",
          "心理学硕士，喜欢深度的对话与长期规划的话题。",
          "共同兴趣：阅读与城市规划",
          "合适时间：周末上午",
          null,
          23,
          162,
          "master",
          "never",
          "上海市",
          "上海市",
          "上海市",
          "心理学硕士，喜欢深度的对话与长期规划的话题。",
          List.of("阅读", "心理学")
      ),
      new RecommendedPersonData(
          "person-5",
          "夏野",
          "夏",
          "建筑学大五，未来想去成都定居，喜欢户外运动与城市探索。",
          "共同兴趣：户外运动与城市探索",
          "合适时间：周六全天",
          null,
          21,
          185,
          "bachelor",
          "single",
          "四川省",
          "成都市",
          "成都市",
          "建筑学大五，未来想去成都定居，喜欢户外运动与城市探索。",
          List.of("户外", "建筑", "摄影")
      )
  );

  private final List<DiscussionRecommendationData> discussionRecommendations = List.of(
      new DiscussionRecommendationData(
          "d-1",
          "大家怎么平衡恋爱和考试周？",
          "一条很实用的讨论串，边界清楚，安排也容易落地。",
          "412 人收藏"
      ),
      new DiscussionRecommendationData(
          "d-2",
          "第一次校园咖啡散步，怎样才会更自然？",
          "大家在分享路线、时间点和不生硬的开场方式。",
          "热度上升"
      )
  );

  private final List<ActivityRecommendationData> activityRecommendations = List.of(
      new ActivityRecommendationData(
          "a-1",
          "图书馆南门咖啡散步",
          "南门咖啡馆",
          "周四 19:00-20:00",
          "轻松的咖啡散步活动，适合初次见面，环境舒适低压，可以自然地开启对话。",
          12,
          List.of()
      ),
      new ActivityRecommendationData(
          "a-2",
          "电影社轻松线下碰面",
          "影像楼 B 厅",
          "周六 15:00-17:00",
          "电影社组织的线下交流活动，边看电影边聊天，氛围轻松不拘束。",
          8,
          List.of()
      )
  );

  public synchronized SessionSnapshot currentSession() {
    return new SessionSnapshot(
        sessionUserId,
        loggedIn,
        "wechat",
        // R4-00398：展示名仅在仍为内置默认值时经 i18n 资源解析（mock.session.displayName）；
        // 用户已自定义昵称（saveBasicProfile 更新 displayName）时原样返回，避免覆盖用户修改。
        DEFAULT_DISPLAY_NAME.equals(displayName)
            ? resolveText("mock.session.displayName", displayName)
            : displayName,
        phoneBound,
        profileCompleted,
        campusVerified,
        scheduleCompleted,
        campusName
    );
  }

  public synchronized SessionSnapshot loginWithWechat() {
    loggedIn = true;
    return currentSession();
  }

  public synchronized LoginHeroData loginHero() {
    // R4-00398：标题/副标题经 i18n 资源解析（mock.loginHero.*）
    return new LoginHeroData(
        loginHero.heroMode(),
        loginHero.heroVideoUrl(),
        loginHero.heroPosterUrl(),
        loginHero.heroAnimationTheme(),
        resolveText("mock.loginHero.title", loginHero.heroTitle()),
        resolveText("mock.loginHero.subtitle", loginHero.heroSubtitle()),
        loginHero.videoFallbackToAnimation()
    );
  }

  public synchronized BasicProfileData basicProfile() {
    // R4-00398：昵称/简介仅在仍为内置默认值时经 i18n 资源解析（mock.profile.*）；
    // 用户已保存过基本资料（字段被修改）时原样返回，避免覆盖用户编辑内容。
    boolean profileDefaulted = DEFAULT_DISPLAY_NAME.equals(basicProfile.nickname());
    return new BasicProfileData(
        profileDefaulted ? resolveText("mock.profile.nickname", basicProfile.nickname()) : basicProfile.nickname(),
        profileDefaulted ? resolveText("mock.profile.bio", basicProfile.bio()) : basicProfile.bio(),
        basicProfile.grade(),
        basicProfile.pronouns(),
        basicProfile.height(),
        basicProfile.educationLevel(),
        basicProfile.relationshipStatus(),
        basicProfile.hometownProvince(),
        basicProfile.hometownCity(),
        basicProfile.futureCity(),
        basicProfile.futurePlanTags(),
        basicProfile.photoGallery(),
        basicProfile.halfBodyPhotoUrl(),
        basicProfile.personalVideoUrl(),
        basicProfile.profileBackgroundUrl()
    );
  }

  /**
   * 按请求 Locale 解析 i18n 文案（R4-00398）。
   * MessageSource 未注入（单元测试）或解析失败时回退内置默认值。
   */
  private String resolveText(String key, String fallback) {
    if (messageSource == null) {
      return fallback;
    }
    try {
      return messageSource.getMessage(key, null, fallback,
              org.springframework.context.i18n.LocaleContextHolder.getLocale());
    } catch (Exception e) {
      return fallback;
    }
  }

  public synchronized ProfileStatsData profileStats() {
    return profileStats;
  }

  public synchronized BasicProfileData saveBasicProfile(BasicProfileData profile) {
    // 保留既有媒体字段（照片墙/视频/背景图/半身照），避免保存基本资料时被清空
    BasicProfileData merged = new BasicProfileData(
        profile.nickname(),
        profile.bio(),
        profile.grade(),
        profile.pronouns(),
        profile.height(),
        profile.educationLevel(),
        profile.relationshipStatus(),
        profile.hometownProvince(),
        profile.hometownCity(),
        profile.futureCity(),
        profile.futurePlanTags(),
        profile.photoGallery() != null ? profile.photoGallery() : basicProfile.photoGallery(),
        profile.halfBodyPhotoUrl() != null ? profile.halfBodyPhotoUrl() : basicProfile.halfBodyPhotoUrl(),
        profile.personalVideoUrl() != null ? profile.personalVideoUrl() : basicProfile.personalVideoUrl(),
        profile.profileBackgroundUrl() != null ? profile.profileBackgroundUrl() : basicProfile.profileBackgroundUrl()
    );
    basicProfile = merged;
    displayName = merged.nickname();
    profileCompleted = true;
    return basicProfile;
  }

  public synchronized CampusProfileData campusProfile() {
    return campusProfile;
  }

  public synchronized CampusProfileData saveCampusProfile(CampusProfileData profile) {
    campusProfile = profile;
    campusVerified = true;
    campusName = profile.campusName();
    return campusProfile;
  }

  public synchronized ScheduleProfileData scheduleProfile() {
    return scheduleProfile;
  }

  public synchronized ScheduleProfileData saveScheduleProfile(ScheduleProfileData profile) {
    scheduleProfile = new ScheduleProfileData(
        profile.preferredCampusArea(),
        List.copyOf(profile.preferredTimeWindows()),
        List.copyOf(profile.courseBlocks())
    );
    scheduleCompleted = true;
    return scheduleProfile;
  }

  public synchronized List<RecommendedPersonData> recommendedPeople() {
    // R4-00399：推荐池人设文案经 i18n 资源解析（mock.recommended.person{n}.*），
    // 无 MessageSource（单元测试）或资源缺失时回退内置默认文案，改动文案无需发版。
    java.util.ArrayList<RecommendedPersonData> out = new java.util.ArrayList<>();
    for (int i = 0; i < recommendedPeople.size(); i++) {
      RecommendedPersonData p = recommendedPeople.get(i);
      int n = i + 1;
      out.add(new RecommendedPersonData(
          p.id(),
          resolveText("mock.recommended.person" + n + ".name", p.name()),
          p.initials(),
          resolveText("mock.recommended.person" + n + ".headline", p.headline()),
          resolveText("mock.recommended.person" + n + ".commonGround", p.commonGround()),
          resolveText("mock.recommended.person" + n + ".availability", p.availability()),
          p.avatarUrl(),
          p.age(),
          p.height(),
          p.educationLevel(),
          p.relationshipStatus(),
          p.hometownProvince(),
          p.hometownCity(),
          p.futureCity(),
          resolveText("mock.recommended.person" + n + ".bio", p.bio()),
          p.interestTags()
      ));
    }
    return List.copyOf(out);
  }

  public synchronized List<DiscussionRecommendationData> discussionRecommendations() {
    // R4-00399：讨论推荐文案经 i18n 资源解析（mock.recommended.discussion{n}.*）
    java.util.ArrayList<DiscussionRecommendationData> out = new java.util.ArrayList<>();
    for (int i = 0; i < discussionRecommendations.size(); i++) {
      DiscussionRecommendationData d = discussionRecommendations.get(i);
      int n = i + 1;
      out.add(new DiscussionRecommendationData(
          d.id(),
          resolveText("mock.recommended.discussion" + n + ".title", d.title()),
          resolveText("mock.recommended.discussion" + n + ".summary", d.summary()),
          resolveText("mock.recommended.discussion" + n + ".heatLabel", d.heatLabel())
      ));
    }
    return List.copyOf(out);
  }

  public synchronized List<ActivityRecommendationData> activityRecommendations() {
    // R4-00399：活动推荐文案经 i18n 资源解析（mock.recommended.activity{n}.*）
    java.util.ArrayList<ActivityRecommendationData> out = new java.util.ArrayList<>();
    for (int i = 0; i < activityRecommendations.size(); i++) {
      ActivityRecommendationData a = activityRecommendations.get(i);
      int n = i + 1;
      out.add(new ActivityRecommendationData(
          a.id(),
          resolveText("mock.recommended.activity" + n + ".title", a.title()),
          resolveText("mock.recommended.activity" + n + ".location", a.location()),
          resolveText("mock.recommended.activity" + n + ".scheduleText", a.scheduleText()),
          resolveText("mock.recommended.activity" + n + ".description", a.description()),
          a.enrollmentCount(),
          a.participantAvatars()
      ));
    }
    return List.copyOf(out);
  }

  public record SessionSnapshot(
      String userId,
      boolean loggedIn,
      String loginMethod,
      String displayName,
      boolean phoneBound,
      boolean profileCompleted,
      boolean campusVerified,
      boolean scheduleCompleted,
      String campusName
  ) {
  }

  public record LoginHeroData(
      String heroMode,
      String heroVideoUrl,
      String heroPosterUrl,
      String heroAnimationTheme,
      String heroTitle,
      String heroSubtitle,
      boolean videoFallbackToAnimation
  ) {
  }

  public record BasicProfileData(
      String nickname,
      String bio,
      String grade,
      String pronouns,
      Integer height,
      String educationLevel,
      String relationshipStatus,
      String hometownProvince,
      String hometownCity,
      String futureCity,
      List<String> futurePlanTags,
      List<String> photoGallery,
      String halfBodyPhotoUrl,
      String personalVideoUrl,
      String profileBackgroundUrl
  ) {
    public BasicProfileData {
      futurePlanTags = futurePlanTags == null ? List.of() : List.copyOf(futurePlanTags);
      photoGallery = photoGallery == null ? List.of() : List.copyOf(photoGallery);
    }
  }

  public record ProfileStatsData(
      int followingCount,
      int followersCount,
      int likesCount
  ) {
  }

  public record CampusProfileData(
      String city,
      String campusName,
      String department,
      String verificationStatus
  ) {
  }

  public record ScheduleBlockData(
      String id,
      String weekday,
      String start,
      String end,
      String label
  ) {
  }

  public record ScheduleProfileData(
      String preferredCampusArea,
      List<String> preferredTimeWindows,
      List<ScheduleBlockData> courseBlocks
  ) {
    public ScheduleProfileData {
      preferredTimeWindows = List.copyOf(preferredTimeWindows);
      courseBlocks = List.copyOf(new ArrayList<>(courseBlocks));
    }
  }

  public record RecommendedPersonData(
      String id,
      String name,
      String initials,
      String headline,
      String commonGround,
      String availability,
      String avatarUrl,
      Integer age,
      Integer height,
      String educationLevel,
      String relationshipStatus,
      String hometownProvince,
      String hometownCity,
      String futureCity,
      String bio,
      List<String> interestTags
  ) {
    public RecommendedPersonData {
      interestTags = interestTags == null ? List.of() : List.copyOf(interestTags);
    }
  }

  public record DiscussionRecommendationData(
      String id,
      String title,
      String summary,
      String heatLabel
  ) {
  }

  public record ActivityRecommendationData(
      String id,
      String title,
      String location,
      String scheduleText,
      String description,
      int enrollmentCount,
      List<String> participantAvatars
  ) {
    public ActivityRecommendationData {
      participantAvatars = List.copyOf(participantAvatars);
    }
  }
}
