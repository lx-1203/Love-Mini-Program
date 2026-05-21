package com.campuslove.api.runtime;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Component;

@Component
public class MockRuntimeState {

  private boolean loggedIn;
  private boolean phoneBound;
  private boolean profileCompleted;
  private boolean campusVerified;
  private boolean scheduleCompleted;
  private String displayName = "星野";
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
      "她/她"
  );

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
          "合适时间：今晚 19:00 之后"
      ),
      new RecommendedPersonData(
          "person-2",
          "周沐",
          "周",
          "更适合从音乐话题切入，再配一段短距离校园散步。",
          "节奏接近：更喜欢短时见面和明确时段",
          "合适时间：周五 16:00-18:00"
      ),
      new RecommendedPersonData(
          "person-3",
          "许诺",
          "许",
          "喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。",
          "共同偏好：校园人多时也接受室内兜底",
          "合适时间：周末下午"
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
          "周四 19:00-20:00"
      ),
      new ActivityRecommendationData(
          "a-2",
          "电影社轻松线下碰面",
          "影像楼 B 厅",
          "周六 15:00-17:00"
      )
  );

  public synchronized SessionSnapshot currentSession() {
    return new SessionSnapshot(
        "user-1001",
        loggedIn,
        "wechat",
        displayName,
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
    return loginHero;
  }

  public synchronized BasicProfileData basicProfile() {
    return basicProfile;
  }

  public synchronized BasicProfileData saveBasicProfile(BasicProfileData profile) {
    basicProfile = profile;
    displayName = profile.nickname();
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

  public List<RecommendedPersonData> recommendedPeople() {
    return recommendedPeople;
  }

  public List<DiscussionRecommendationData> discussionRecommendations() {
    return discussionRecommendations;
  }

  public List<ActivityRecommendationData> activityRecommendations() {
    return activityRecommendations;
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
      String pronouns
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
      String availability
  ) {
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
      String scheduleText
  ) {
  }

  // ---- CourseBlock CRUD support (Day 3) ----

  private final List<CourseBlockData> courseBlocks = new CopyOnWriteArrayList<>(List.of(
      new CourseBlockData("cb-1", "周一", 3, 5, "设计课", "南楼302"),
      new CourseBlockData("cb-2", "周三", 6, 8, "专题讨论", "北楼101")
  ));

  public record CourseBlockData(
      String id,
      String dayOfWeek,
      int startPeriod,
      int endPeriod,
      String courseName,
      String location
  ) {
    public CourseBlockData {
      if (startPeriod < 1 || startPeriod > 12) throw new IllegalArgumentException("startPeriod must be 1-12");
      if (endPeriod < 1 || endPeriod > 12) throw new IllegalArgumentException("endPeriod must be 1-12");
      if (startPeriod > endPeriod) throw new IllegalArgumentException("startPeriod must be <= endPeriod");
      if (!List.of("周一","周二","周三","周四","周五").contains(dayOfWeek)) {
        throw new IllegalArgumentException("dayOfWeek must be Mon-Fri (周一~周五)");
      }
    }
  }

  public synchronized List<CourseBlockData> courseBlocks() {
    return List.copyOf(courseBlocks);
  }

  public synchronized CourseBlockData addCourseBlock(CourseBlockData block) {
    CourseBlockData withId = new CourseBlockData(
        "cb-" + UUID.randomUUID().toString().substring(0, 8),
        block.dayOfWeek(), block.startPeriod(), block.endPeriod(),
        block.courseName(), block.location()
    );
    courseBlocks.add(withId);
    return withId;
  }

  public synchronized CourseBlockData updateCourseBlock(String blockId, CourseBlockData block) {
    for (int i = 0; i < courseBlocks.size(); i++) {
      if (courseBlocks.get(i).id().equals(blockId)) {
        CourseBlockData updated = new CourseBlockData(
            blockId, block.dayOfWeek(), block.startPeriod(), block.endPeriod(),
            block.courseName(), block.location()
        );
        courseBlocks.set(i, updated);
        return updated;
      }
    }
    throw new IllegalArgumentException("CourseBlock not found: " + blockId);
  }

  public synchronized void deleteCourseBlock(String blockId) {
    if (!courseBlocks.removeIf(b -> b.id().equals(blockId))) {
      throw new IllegalArgumentException("CourseBlock not found: " + blockId);
    }
  }

  // ---- Recommendation Engine pool (Day 3) ----

  public record RecommendationPoolUser(
      String id,
      String nickname,
      String initials,
      String school,       // 校区/学校名称
      String city,
      String grade,        // 年级
      List<String> topics, // 感兴趣的话题
      boolean campusVerified,
      List<CourseBlockData> scheduleBlocks // 课表，用于计算空闲时间
  ) {}

  private final List<RecommendationPoolUser> recommendationPool = List.of(
      new RecommendationPoolUser("rp-1", "林安", "林", "南校区", "广州", "大三",
          List.of("电影", "音乐"), true,
          List.of(new CourseBlockData("b1", "周一", 1, 3, "设计思维", "南楼201"),
                  new CourseBlockData("b2", "周三", 6, 8, "交互设计", "南楼302"))),
      new RecommendationPoolUser("rp-2", "周沐", "周", "北校区", "广州", "大二",
          List.of("音乐", "运动"), false,
          List.of(new CourseBlockData("b3", "周二", 3, 5, "数据结构", "北楼101"))),
      new RecommendationPoolUser("rp-3", "许诺", "许", "南校区", "深圳", "大四",
          List.of("美食", "电影", "运动"), true,
          List.of(new CourseBlockData("b4", "周四", 6, 8, "毕业设计", "南楼501"))),
      new RecommendationPoolUser("rp-4", "宋雨", "宋", "南校区", "广州", "大一",
          List.of("音乐", "美食"), true,
          List.of(new CourseBlockData("b5", "周一", 1, 4, "高等数学", "主楼101"),
                  new CourseBlockData("b6", "周三", 1, 2, "大学英语", "主楼201"))),
      new RecommendationPoolUser("rp-5", "何夕", "何", "东校区", "广州", "大三",
          List.of("电影", "运动"), false,
          List.of(new CourseBlockData("b7", "周五", 3, 6, "软件工程", "东楼301"))),
      new RecommendationPoolUser("rp-6", "陈雨", "陈", "北校区", "广州", "大二",
          List.of("电影", "美食"), true,
          List.of(new CourseBlockData("b8", "周二", 1, 2, "线性代数", "北楼201"),
                  new CourseBlockData("b9", "周四", 3, 5, "概率论", "北楼301"))),
      new RecommendationPoolUser("rp-7", "江川", "江", "南校区", "深圳", "大二",
          List.of("运动", "音乐"), false,
          List.of(new CourseBlockData("b10", "周一", 6, 8, "心理学导论", "南楼401"))),
      new RecommendationPoolUser("rp-8", "白露", "白", "南校区", "广州", "大三",
          List.of("电影", "音乐", "美食"), true,
          List.of(new CourseBlockData("b11", "周二", 6, 8, "影视鉴赏", "南楼101"))),
      new RecommendationPoolUser("rp-9", "夏木", "夏", "东校区", "深圳", "大一",
          List.of("运动"), false,
          List.of()),
      new RecommendationPoolUser("rp-10", "秋山", "秋", "南校区", "广州", "大二",
          List.of("美食", "电影"), true,
          List.of(new CourseBlockData("b12", "周一", 3, 5, "英语写作", "主楼301"),
                  new CourseBlockData("b13", "周五", 6, 7, "体育", "操场")))
  );

  public List<RecommendationPoolUser> recommendationPool() {
    return recommendationPool;
  }
}
