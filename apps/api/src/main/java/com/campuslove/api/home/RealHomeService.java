package com.campuslove.api.home;

import com.campuslove.api.discover.ActivityService;
import com.campuslove.api.discover.ActivityView;
import com.campuslove.api.discover.DailyQuestionService;
import com.campuslove.api.discover.DailyQuestionView;
import com.campuslove.api.discover.RecommendationFilter;
import com.campuslove.api.discover.RecommendationService;
import com.campuslove.api.discover.RecommendedPersonView;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.growth.CheckInService;
import com.campuslove.api.growth.CheckInStatusView;
import com.campuslove.api.growth.RecommendQuotaService;
import com.campuslove.api.match.LikedUserView;
import com.campuslove.api.match.VisitorView;
import com.campuslove.api.match.MatchService;
import com.campuslove.api.whisper.WhisperService;
import com.campuslove.api.profile.ProfileQueryService;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.InterestCircleRepository;
import com.campuslove.api.repository.PostRepository;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * 真实首页服务实现。
 * 在 real profile 下激活，从各个子服务聚合真实数据返回首页仪表盘视图。
 * 每个子服务调用均有独立的错误处理，单个服务异常不会影响其他数据的聚合。
 */
@Profile("real")
@Service
public class RealHomeService implements HomeService {

    private static final Logger log = LoggerFactory.getLogger(RealHomeService.class);

    /** 活动推荐最大条数 */
    private static final int MAX_ACTIVITY_COUNT = 3;
    /** 村口热门帖子最大条数 */
    private static final int MAX_HOT_POST_COUNT = 3;

    private final RecommendationService recommendationService;
    private final CheckInService checkInService;
    private final DailyQuestionService dailyQuestionService;
    private final ActivityService activityService;
    private final PostRepository postRepository;
    private final MatchService matchService;
    private final WhisperService whisperService;
    private final RecommendQuotaService recommendQuotaService;
    private final InterestCircleRepository interestCircleRepository;
    private final CircleMembershipRepository circleMembershipRepository;
    private final ProfileQueryService profileQueryService;
    private final UserRepository userRepository;
    private final HomeFeedFallbackProvider homeFeedFallbackProvider;

    /**
     * 构造函数，注入所有子服务依赖。
     */
    public RealHomeService(
            RecommendationService recommendationService,
            CheckInService checkInService,
            DailyQuestionService dailyQuestionService,
            ActivityService activityService,
            PostRepository postRepository,
            MatchService matchService,
            WhisperService whisperService,
            RecommendQuotaService recommendQuotaService,
            InterestCircleRepository interestCircleRepository,
            CircleMembershipRepository circleMembershipRepository,
            ProfileQueryService profileQueryService,
            HomeFeedFallbackProvider homeFeedFallbackProvider,
            UserRepository userRepository) {
        this.recommendationService = recommendationService;
        this.checkInService = checkInService;
        this.dailyQuestionService = dailyQuestionService;
        this.activityService = activityService;
        this.postRepository = postRepository;
        this.matchService = matchService;
        this.whisperService = whisperService;
        this.recommendQuotaService = recommendQuotaService;
        this.interestCircleRepository = interestCircleRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.profileQueryService = profileQueryService;
        this.userRepository = userRepository;
        this.homeFeedFallbackProvider = homeFeedFallbackProvider;
    }

    /**
     * 获取首页仪表盘视图（兼容无 userId 调用）。
     */
    @Override
    public HomeDashboardView getDashboard() {
        return getDashboard(null);
    }

    /**
     * 获取首页仪表盘视图。
     * 从各子服务聚合推荐人物、签到状态、每日一问、活动推荐、村口热门帖子等数据。
     * 每个子服务调用均有独立的 try-catch，确保单个服务异常不影响整体数据返回。
     *
     * @param userId 当前用户 ID，可为 null（匿名访问时返回通用数据）
     * @return 首页仪表盘数据
     */
    @Override
    public HomeDashboardView getDashboard(Long userId) {
        // 1. 聚合推荐人物卡片
        List<RecommendedPersonSummaryView> recommendedPeople = aggregateRecommendedPeople(userId);

        // 2. 聚合签到状态，生成签到卡片
        HomeCardView scheduleSummary = aggregateCheckInStatus(userId);

        // 3. 聚合每日一问，生成 AI 推荐卡片（复用 aiPlan 卡片位置展示每日一问）
        HomeCardView aiPlan = aggregateDailyQuestion(userId);

        // 4. 聚合活动推荐（限制 3 条）
        ActivityPreviewView activityPreview = aggregateActivities();

        // 5. 聚合村口热门帖子（限制 3 条，按点赞数排序），展示在 activityPreview 的 pulse 区域
        List<ActivityPreviewItemView> hotPosts = aggregateHotPosts();

        // 将热门帖子合并到活动预览中，作为补充展示
        List<ActivityPreviewItemView> combinedItems =
                new java.util.ArrayList<>(activityPreview.items());
        combinedItems.addAll(hotPosts);

        MatchCenterView matchCenter = aggregateMatchCenter(userId);
        HomeFeedView homeFeed = getHomeFeed(userId);

        return new HomeDashboardView(
            /* scheduleSummary */ scheduleSummary,
            /* freeSlots */ List.of(),
            /* aiPlan */ aiPlan,
            /* recommendedPeople */ recommendedPeople,
            /* peopleLead */ recommendedPeople.isEmpty() ? "发现更多有趣的人" : "为你推荐",
            /* activityPreview */ new ActivityPreviewView(
                activityPreview.title(),
                activityPreview.subtitle(),
                activityPreview.actionLabel(),
                combinedItems,
                activityPreview.pulseTitle(),
                activityPreview.pulseMeta()
            ),
            /* matchCenter */ matchCenter,
            /* homeFeed */ homeFeed
        );
    }

    /**
     * 聚合推荐人物卡片。
     * 调用 RecommendationService 获取推荐列表，映射为首页展示的摘要视图。
     *
     * @param userId 当前用户 ID
     * @return 推荐人物摘要列表，异常时返回空列表
     */
    private List<RecommendedPersonSummaryView> aggregateRecommendedPeople(Long userId) {
        if (userId == null) {
            return List.of();
        }
        try {
            List<RecommendedPersonView> recommendations = recommendationService.getRecommendations(userId);
            return recommendations.stream()
                .map(person -> new RecommendedPersonSummaryView(
                    String.valueOf(person.id()),
                    person.name(),
                    person.initials(),
                    person.headline(),
                    person.commonGround(),
                    person.availability()
                ))
                .toList();
        } catch (DataAccessException e) {
            log.warn("聚合推荐人物数据失败, userId={}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    /**
     * 聚合签到状态，生成课表摘要卡片。
     * 复用 scheduleSummary 卡片位置展示签到信息。
     *
     * @param userId 当前用户 ID
     * @return 签到状态卡片，异常时返回默认提示
     */
    private HomeCardView aggregateCheckInStatus(Long userId) {
        if (userId == null) {
            return new HomeCardView(
                "schedule-summary", "暂无课表数据", "请先完善您的日程资料", null, "去设置"
            );
        }
        try {
            CheckInStatusView status = checkInService.getCheckInStatus(userId);
            if (status.checkedInToday()) {
                return new HomeCardView(
                    "schedule-summary",
                    "今日已签到",
                    "连续签到 " + status.consecutiveDays() + " 天",
                    "额外推荐配额 +" + status.extraQuota(),
                    "去推荐"
                );
            } else {
                return new HomeCardView(
                    "schedule-summary",
                    "今日尚未签到",
                    "签到可获得额外推荐配额",
                    null,
                    "去签到"
                );
            }
        } catch (DataAccessException e) {
            log.warn("聚合签到状态失败, userId={}: {}", userId, e.getMessage());
            return new HomeCardView(
                "schedule-summary", "签到服务暂不可用", "请稍后再试", null, "去设置"
            );
        }
    }

    /**
     * 聚合每日一问，生成 AI 推荐卡片。
     * 复用 aiPlan 卡片位置展示每日一问内容。
     *
     * @param userId 当前用户 ID
     * @return 每日一问卡片，异常时返回默认提示
     */
    private HomeCardView aggregateDailyQuestion(Long userId) {
        try {
            DailyQuestionView question = dailyQuestionService.getTodayQuestion(userId);
            if (question != null) {
                String meta = question.hasAnswered()
                    ? "已回答 · 共 " + question.answerCount() + " 人参与"
                    : "今日尚未回答 · 共 " + question.answerCount() + " 人参与";
                return new HomeCardView(
                    "ai-plan",
                    "每日一问",
                    question.questionText(),
                    meta,
                    question.hasAnswered() ? "查看回答" : "去回答"
                );
            }
        } catch (DataAccessException e) {
            log.warn("聚合每日一问失败, userId={}: {}", userId, e.getMessage());
        }
        // 默认兜底
        return new HomeCardView(
            "ai-plan", "每日一问", "今日问题加载中，请稍后再试", null, null
        );
    }

    /**
     * 聚合活动推荐。
     * 调用 ActivityService 获取近期活动，限制最多 3 条。
     *
     * @return 活动预览视图，异常时返回空列表
     */
    private ActivityPreviewView aggregateActivities() {
        try {
            Page<ActivityView> activities = activityService.getActivities(null, null, null, PageRequest.of(0, MAX_ACTIVITY_COUNT));
            List<ActivityPreviewItemView> items = activities.getContent().stream()
                .map(activity -> new ActivityPreviewItemView(
                    String.valueOf(activity.id()),
                    activity.title(),
                    activity.location(),
                    activity.scheduleText()
                ))
                .toList();
            return new ActivityPreviewView(
                "活动推荐",
                "查看近期活动",
                "查看活动",
                items,
                null,
                null
            );
        } catch (DataAccessException e) {
            log.warn("聚合活动推荐失败: {}", e.getMessage());
            return new ActivityPreviewView(
                "活动推荐", "查看近期活动", "查看活动", List.of(), null, null
            );
        }
    }

    /**
     * 聚合村口热门帖子。
     * 从 PostRepository 查询按点赞数倒序的活跃帖子，限制最多 3 条。
     *
     * @return 热门帖子预览列表，异常时返回空列表
     */
    private List<ActivityPreviewItemView> aggregateHotPosts() {
        try {
            Page<Post> hotPosts = postRepository.findByStatusOrderByLikesCountDesc(
                PostStatus.active,
                PageRequest.of(0, MAX_HOT_POST_COUNT)
            );
            return hotPosts.getContent().stream()
                .map(post -> new ActivityPreviewItemView(
                    String.valueOf(post.getId()),
                    truncateContent(post.getContent(), 30),
                    "点赞 " + post.getLikesCount() + " · 评论 " + post.getCommentsCount(),
                    post.getCategory().name()
                ))
                .toList();
        } catch (DataAccessException e) {
            log.warn("聚合村口热门帖子失败: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * 截断内容字符串，超出最大长度时添加省略号。
     *
     * @param content   原始内容
     * @param maxLength 最大长度
     * @return 截断后的内容
     */
    private String truncateContent(String content, int maxLength) {
        if (content == null) {
            return "";
        }
        if (content.length() <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + "...";
    }

    /**
     * 聚合匹配中心数据（寻觅 v3：首页 = 匹配中心）。
     *
     * <p>数据语义：</p>
     * <ul>
     *   <li>quota：RecommendQuotaService 聚合；服务未注入时返回 -1（无限制语义）</li>
     *   <li>onlineCount：MVP 使用 guest 推荐结果中 just_now 活跃人数，不消耗用户配额</li>
     *   <li>crushing = myLikes - likedMe（我喜欢但对方尚未喜欢）</li>
     *   <li>matched = myLikes ∩ likedMe（互相喜欢）</li>
     *   <li>whispers：MVP 使用收件箱数量；TODO 后续改为 pending/unread 数量</li>
     * </ul>
     */
    private MatchCenterView aggregateMatchCenter(Long userId) {
        QuotaView quota = aggregateQuota(userId);
        int onlineCount = aggregateOnlineCount();
        RelationProgressView relation = aggregateRelation(userId);
        return new MatchCenterView(quota, onlineCount, relation);
    }

    private QuotaView aggregateQuota(Long userId) {
        if (recommendQuotaService == null || userId == null) {
            return new QuotaView(-1, 0, -1);
        }
        try {
            int dailyLimit = recommendQuotaService.getDailyQuota(userId);
            int used = recommendQuotaService.getUsedCount(userId);
            return new QuotaView(dailyLimit, used, Math.max(0, dailyLimit - used));
        } catch (RuntimeException e) {
            log.warn("聚合推荐配额失败, userId={}: {}", userId, e.getMessage());
            return new QuotaView(-1, 0, -1);
        }
    }

    private int aggregateOnlineCount() {
        try {
            RecommendationFilter empty = new RecommendationFilter(null, null, null, null, null, null, null, null, null, null);
            return (int) recommendationService.getRecommendationsForGuest(empty).stream()
                    .filter(view -> "online".equals(view.activeStatusText()) || "just_now".equals(view.activeStatusText()))
                    .count();
        } catch (RuntimeException e) {
            log.warn("聚合在线速配人数失败: {}", e.getMessage());
            return 0;
        }
    }

    private RelationProgressView aggregateRelation(Long userId) {
        if (userId == null) {
            return new RelationProgressView(0, 0, 0);
        }
        try {
            java.util.Set<Long> likedMeIds = matchService.getLikedMe(userId).stream()
                    .map(LikedUserView::userId)
                    .collect(java.util.stream.Collectors.toSet());
            java.util.List<LikedUserView> myLikes = matchService.getMyLikes(userId);
            int matched = (int) myLikes.stream()
                    .filter(like -> likedMeIds.contains(like.userId()))
                    .count();
            int crushing = Math.max(0, myLikes.size() - matched);
            int whispers = whisperService.inbox(userId).size();
            return new RelationProgressView(crushing, matched, whispers);
        } catch (RuntimeException e) {
            log.warn("聚合关系进度失败, userId={}: {}", userId, e.getMessage());
            return new RelationProgressView(0, 0, 0);
        }
    }

    /**
     * 聚合首页 Feed（寻觅 v3：今日恋爱首页）。
     */
    @Override
    public HomeFeedView getHomeFeed(Long userId) {
        TodayRecommendationView recommendation = getTodayRecommendation(userId);
        if (recommendation == null) {
            recommendation = homeFeedFallbackProvider.fallbackTodayRecommendation();
        }
        LoveProgressView loveProgress = buildLoveProgress(userId);
        RelationActivityView relationActivity = buildRelationActivity(userId);
        java.util.List<InterestCircleSummaryView> interests = buildInterestRecommendations(userId);
        if (interests.isEmpty()) {
            interests = homeFeedFallbackProvider.fallbackInterestRecommendations();
        }
        java.util.List<NearbyPersonSummaryView> nearby = buildNearbyPeople();
        if (nearby.isEmpty()) {
            nearby = homeFeedFallbackProvider.fallbackNearbyPeople();
        }
        java.util.List<CommunityPostSummaryView> posts = buildCommunityPosts();
        if (posts.isEmpty()) {
            posts = homeFeedFallbackProvider.fallbackCommunityPosts();
        }
        return new HomeFeedView(recommendation, loveProgress, relationActivity, interests, nearby, posts);
    }

    /**
     * 更换首页今日推荐。首页换一位不是寻觅跳过：不记录行为，也不消耗推荐额度。
     */
    @Override
    public TodayRecommendationView rotateTodayRecommendation(Long userId) {
        java.util.List<RecommendedPersonView> candidates = homeCandidates();
        if (candidates.size() <= 1) {
            return null;
        }
        return toTodayRecommendation(candidates.get(1));
    }

    /**
     * 首页今日推荐候选：当前使用 guest 推荐池，避免首页展示消耗用户寻觅额度；
     * TODO 后续接入独立的首页推荐策略。
     */
    private TodayRecommendationView getTodayRecommendation(Long userId) {
        return homeCandidates().stream()
            .findFirst()
            .map(this::toTodayRecommendation)
            .orElse(null);
    }

    private java.util.List<RecommendedPersonView> homeCandidates() {
        try {
            RecommendationFilter empty = new RecommendationFilter(null, null, null, null, null, null, null, null, null, null);
            return recommendationService.getRecommendationsForGuest(empty);
        } catch (RuntimeException e) {
            log.warn("聚合首页推荐候选失败: {}", e.getMessage());
            return List.of();
        }
    }

    private TodayRecommendationView toTodayRecommendation(RecommendedPersonView view) {
        boolean certified = view.verificationBadgeLevel() != null
            && !"none".equalsIgnoreCase(view.verificationBadgeLevel());
        boolean online = "online".equals(view.activeStatusText()) || "just_now".equals(view.activeStatusText());
        int matchScore = Math.min(99, Math.max(50,
            60 + view.commonCircleCount() * 10 + (view.isSameSchool() ? 10 : 0) + (online ? 5 : 0)));
        String photoUrl = firstNonBlank(view.halfBodyPhotoUrl(),
            view.photoGallery().stream().filter(java.util.Objects::nonNull).findFirst().orElse(null),
            view.avatarUrl());
        return new TodayRecommendationView(
            view.id(),
            view.name(),
            view.age() == null ? 0 : view.age(),
            view.campusName(),
            view.gradeLabel(),
            view.tags() == null ? List.of() : view.tags(),
            view.bio(),
            view.expectedPartner(),
            view.distanceText(),
            certified,
            online,
            matchScore,
            photoUrl,
            view.constellation()
        );
    }

    private LoveProgressView buildLoveProgress(Long userId) {
        boolean profile = false;
        boolean like = false;
        boolean whisper = false;
        boolean interest = false;
        if (userId != null) {
            try {
                profile = profileQueryService.calculateProfileCompletion(userId) >= 60;
            } catch (RuntimeException e) {
                log.warn("计算资料完善度失败, userId={}: {}", userId, e.getMessage());
            }
            try {
                like = !matchService.getMyLikes(userId).isEmpty();
            } catch (RuntimeException e) {
                log.warn("聚合今日心动失败, userId={}: {}", userId, e.getMessage());
            }
            try {
                whisper = !whisperService.inbox(userId).isEmpty();
            } catch (RuntimeException e) {
                log.warn("聚合悄悄话状态失败, userId={}: {}", userId, e.getMessage());
            }
            try {
                var joinedIds = circleMembershipRepository.findByUserId(userId).stream()
                    .map(m -> m.getCircle().getId())
                    .collect(java.util.stream.Collectors.toSet());
                interest = !joinedIds.isEmpty();
            } catch (RuntimeException e) {
                log.warn("聚合兴趣互动失败, userId={}: {}", userId, e.getMessage());
            }
        }
        java.util.List<LoveProgressStepView> steps = List.of(
            new LoveProgressStepView("profile", "完善资料", "让更多人了解你", profile, "profile"),
            new LoveProgressStepView("discover", "认识新人", "认识一位心动的人", like, "discover"),
            new LoveProgressStepView("whisper", "回复悄悄话", "回复一条悄悄话", whisper, "messages"),
            new LoveProgressStepView("interest", "参与兴趣互动", "参与一个兴趣圈", interest, "nearby")
        );
        int completed = (int) steps.stream().filter(LoveProgressStepView::completed).count();
        return new LoveProgressView(completed, steps.size(), steps);
    }

    private RelationActivityView buildRelationActivity(Long userId) {
        if (userId == null) {
            return new RelationActivityView(0, 0, 0, 0, 0, java.util.List.of(), java.util.List.of(), java.util.List.of(), java.util.List.of());
        }
        try {
            java.util.List<LikedUserView> myLikes = matchService.getMyLikes(userId);
            java.util.List<LikedUserView> likedMe = matchService.getLikedMe(userId);
            java.util.Set<Long> likedMeIds = likedMe.stream()
                .map(LikedUserView::userId)
                .collect(java.util.stream.Collectors.toSet());
            int newMatches = (int) myLikes.stream()
                .filter(like -> likedMeIds.contains(like.userId()))
                .count();
            int whispers = whisperService.inbox(userId).size();
            int visitors = matchService.getVisitors(userId).size();
            int likesReceived = likedMe.size();
            int totalUnread = likesReceived + whispers + visitors + newMatches;
            java.util.List<String> likesAvatars = likedMe.stream()
                .map(LikedUserView::avatarUrl)
                .filter(a -> a != null && !a.isBlank())
                .limit(5)
                .toList();
            java.util.List<String> visitorAvatars = matchService.getVisitors(userId).stream()
                .map(VisitorView::avatarUrl)
                .filter(a -> a != null && !a.isBlank())
                .limit(5)
                .toList();
            java.util.List<String> matchAvatars = myLikes.stream()
                .filter(like -> likedMeIds.contains(like.userId()))
                .map(LikedUserView::avatarUrl)
                .filter(a -> a != null && !a.isBlank())
                .limit(5)
                .toList();
            java.util.List<String> whisperAvatars = whisperService.inbox(userId).stream()
                .map(w -> w.senderId())
                .map(this::resolveAvatarUrl)
                .filter(a -> a != null && !a.isBlank())
                .limit(5)
                .toList();
            return new RelationActivityView(likesReceived, whispers, visitors, newMatches, totalUnread,
                likesAvatars, whisperAvatars, visitorAvatars, matchAvatars);
        } catch (RuntimeException e) {
            log.warn("聚合关系动态失败, userId={}: {}", userId, e.getMessage());
            return new RelationActivityView(0, 0, 0, 0, 0, java.util.List.of(), java.util.List.of(), java.util.List.of(), java.util.List.of());
        }
    }

    /** 通过 userId 解析用户头像 URL（悄悄话发件人头像） */
    private String resolveAvatarUrl(Long userId) {
        if (userId == null) return null;
        try {
            return userRepository.findById(userId).map(User::getAvatarUrl).orElse(null);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private java.util.List<InterestCircleSummaryView> buildInterestRecommendations(Long userId) {
        try {
            var joinedIds = userId == null ? java.util.Set.<Long>of()
                : circleMembershipRepository.findByUserId(userId).stream()
                    .map(m -> m.getCircle().getId())
                    .collect(java.util.stream.Collectors.toSet());
            return interestCircleRepository.findAllByOrderBySortOrderAsc().stream()
                .sorted(java.util.Comparator.comparingInt((InterestCircle c) -> c.getMemberCount() == null ? 0 : c.getMemberCount()).reversed())
                .limit(4)
                .map((InterestCircle c) -> new InterestCircleSummaryView(
                    c.getId(), c.getName(), c.getIcon(),
                    c.getMemberCount() == null ? 0 : c.getMemberCount(),
                    joinedIds.contains(c.getId())))
                .toList();
        } catch (RuntimeException e) {
            log.warn("聚合兴趣推荐失败: {}", e.getMessage());
            return List.of();
        }
    }

    private java.util.List<NearbyPersonSummaryView> buildNearbyPeople() {
        try {
            return homeCandidates().stream()
                .limit(5)
                .map(view -> new NearbyPersonSummaryView(
                    view.id(),
                    view.name(),
                    view.distanceText(),
                    view.avatarUrl(),
                    "online".equals(view.activeStatusText()) || "just_now".equals(view.activeStatusText()),
                    view.tags() == null ? List.of() : view.tags().stream().limit(2).toList()))
                .toList();
        } catch (RuntimeException e) {
            log.warn("聚合附近的人失败: {}", e.getMessage());
            return List.of();
        }
    }

    private java.util.List<CommunityPostSummaryView> buildCommunityPosts() {
        try {
            Page<Post> posts = postRepository.findByStatusOrderByLikesCountDesc(
                PostStatus.active,
                PageRequest.of(0, 2)
            );
            java.util.List<Post> items = posts.getContent();
            java.util.List<Long> authorIds = items.stream().map(Post::getAuthorId).filter(java.util.Objects::nonNull).toList();
            java.util.Map<Long, User> authorMap = profileQueryService.batchLoadUsers(authorIds);
            return items.stream().map(post -> {
                User author = post.getAuthorId() == null ? null : authorMap.get(post.getAuthorId());
                return new CommunityPostSummaryView(
                    post.getId(),
                    author != null ? author.getNickname() : String.valueOf(post.getAuthorId()),
                    author != null ? author.getAvatarUrl() : null,
                    post.getCategory() == null ? "" : post.getCategory().name(),
                    post.getCreatedAt() == null ? "" : post.getCreatedAt().toString(),
                    truncateContent(post.getContent(), 80),
                    profileQueryService.parseStringList(post.getImages()).stream().limit(3).toList(),
                    post.getLikesCount() == null ? 0 : post.getLikesCount(),
                    post.getCommentsCount() == null ? 0 : post.getCommentsCount()
                );
            }).toList();
        } catch (RuntimeException e) {
            log.warn("聚合社区动态失败: {}", e.getMessage());
            return List.of();
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

}



