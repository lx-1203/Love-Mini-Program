package com.campuslove.api.runtime;

import java.util.ArrayList;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("mock")
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
      "她/她",
      168,
      "bachelor",
      "never",
      "广东省",
      "广州市",
      "广州市",
      List.of("买房", "养猫"),
      List.of("/uploads/mock/photo-1.jpg"),
      "/uploads/mock/half.jpg",
      "/uploads/mock/intro.mp4",
      "/uploads/mock/bg.jpg"
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
          180,
          "bachelor",
          "divorced",
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
          185,
          "phd",
          "widowed",
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
          List.of("https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop",
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop",
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop")
      ),
      new ActivityRecommendationData(
          "a-2",
          "电影社轻松线下碰面",
          "影像楼 B 厅",
          "周六 15:00-17:00",
          "电影社组织的线下交流活动，边看电影边聊天，氛围轻松不拘束。",
          8,
          List.of("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop",
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop",
              "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=64&h=64&fit=crop")
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
