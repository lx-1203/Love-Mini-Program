package com.campuslove.api.profile;

import com.campuslove.api.auth.OnlineUserService;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.discover.UserPreferenceCalculator;
import com.campuslove.api.entity.InterestTag;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.ProfileVisitor;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserOnlineStatus;
import com.campuslove.api.location.GeoService;
import com.campuslove.api.repository.InterestTagRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.ProfileVisitorRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserDeviceSessionRepository;
import com.campuslove.api.repository.UserOnlineStatusRepository;
import com.campuslove.api.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 统一个人主页 DTO 端点（real 专属）。
 * 新个人主页前端统一消费 /api/v1/profile/me 与 /api/v1/profile/{userId}。
 *
 * <p>R6/L07（2026-10-19）：为他人主页补齐 {@code distanceText} / {@code online} /
 * {@code relation.commonPoints} 三个字段。全部由真实列推导，来源缺失一律返回 null，
 * 不在服务端造数（口径详见 {@link UserProfileDTO} 与 {@link CommonPointDTO} 的 javadoc）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/profile")
@PreAuthorize("hasRole('USER')")
public class UserProfileController {

    /**
     * 在线判定心跳阈值（分钟）。与 {@code RealOnlineStatusService.HEARTBEAT_TIMEOUT_MINUTES}
     * 同值同语义（那边用它把超时心跳标记为 offline），此处复用同一口径而非再造第二个阈值。
     */
    private static final int ONLINE_HEARTBEAT_WINDOW_MINUTES = 5;

    /**
     * 距离可信上限（km）。与 {@code RecommendationRanker.deriveDistanceText} 的 {@code km > 300} 兜底同口径：
     * 超出即视为种子数据/漂移 GPS，不下发距离而不是下发离谱数字。
     */
    private static final double MAX_RELIABLE_DISTANCE_KM = 300.0;

    private final UserRepository userRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final LikeRepository likeRepository;
    private final ProfileVisitorRepository profileVisitorRepository;
    private final PostRepository postRepository;
    private final UserPreferenceCalculator preferenceCalculator;
    private final InterestTagRepository interestTagRepository;
    private final UserOnlineStatusRepository userOnlineStatusRepository;
    private final UserDeviceSessionRepository userDeviceSessionRepository;
    private final OnlineUserService onlineUserService;
    private final GeoService geoService;

    public UserProfileController(
            UserRepository userRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            LikeRepository likeRepository,
            ProfileVisitorRepository profileVisitorRepository,
            PostRepository postRepository,
            UserPreferenceCalculator preferenceCalculator,
            InterestTagRepository interestTagRepository,
            UserOnlineStatusRepository userOnlineStatusRepository,
            UserDeviceSessionRepository userDeviceSessionRepository,
            OnlineUserService onlineUserService,
            GeoService geoService) {
        this.userRepository = userRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.likeRepository = likeRepository;
        this.profileVisitorRepository = profileVisitorRepository;
        this.postRepository = postRepository;
        this.preferenceCalculator = preferenceCalculator;
        this.interestTagRepository = interestTagRepository;
        this.userOnlineStatusRepository = userOnlineStatusRepository;
        this.userDeviceSessionRepository = userDeviceSessionRepository;
        this.onlineUserService = onlineUserService;
        this.geoService = geoService;
    }

    @GetMapping("/me")
    public UserProfileDTO getMyProfile() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalStateException("用户不存在: " + userId));
        UserBasicProfile basic = userBasicProfileRepository.findByUserId(userId).orElse(null);
        UserCampusProfile campus = userCampusProfileRepository.findByUserId(userId).orElse(null);
        return assemble(user, basic, campus, userId, false);
    }

    @GetMapping("/{userId}")
    public UserProfileDTO getPublicProfile(@PathVariable("userId") Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("目标用户 ID 非法");
        }
        Long viewerId = SecurityUtils.getCurrentUserId();
        User target = userRepository.findById(userId).orElseThrow(() -> new IllegalStateException("用户不存在: " + userId));
        UserBasicProfile basic = userBasicProfileRepository.findByUserId(userId).orElse(null);
        UserCampusProfile campus = userCampusProfileRepository.findByUserId(userId).orElse(null);
        return assemble(target, basic, campus, viewerId, true);
    }

    private UserProfileDTO assemble(User user, UserBasicProfile basic, UserCampusProfile campus, Long viewerId, boolean isPublic) {
        String name = user.getNickname() != null ? user.getNickname() : "";
        String avatar = user.getAvatarUrl() != null ? user.getAvatarUrl() : "";
        Integer age = basic != null && basic.getBirthYear() != null
                ? Year.now().getValue() - basic.getBirthYear()
                : null;
        String location = firstNonBlank(
                campus != null ? campus.getCityName() : null,
                campus != null ? campus.getCampusName() : null,
                basic != null ? basic.getHometownCity() : null,
                basic != null ? basic.getHometownProvince() : null);

        boolean student = campus != null && notBlank(campus.getCampusName());
        boolean verified = (campus != null && "verified".equalsIgnoreCase(campus.getVerificationStatus()))
                || (basic != null && Boolean.TRUE.equals(basic.getIdCardVerified()));

        String bio = basic != null && notBlank(basic.getBio()) ? basic.getBio() : user.getBio();
        String mbti = basic != null ? basic.getMbti() : "";
        List<String> personality = basic != null
                ? new ArrayList<>(preferenceCalculator.parseStringList(basic.getPersonalityTags()))
                : new ArrayList<>();
        String voiceIntro = basic != null && notBlank(basic.getPersonalVideoUrl())
                ? basic.getPersonalVideoUrl()
                : "";

        List<String> tags = basic != null
                ? new ArrayList<>(preferenceCalculator.parseInterestTags(basic.getInterestTags()))
                : new ArrayList<>();

        // 2026-08-21：封面兜底——未设置背景图时使用默认风景图（对齐他人主页参考图封面结构）
        String cover = basic != null && notBlank(basic.getProfileBackgroundUrl())
                ? basic.getProfileBackgroundUrl()
                : "/static/assets/images/posts/post-2.jpg";
        List<String> photos = basic != null
                ? new ArrayList<>(preferenceCalculator.parseStringList(basic.getPhotoGallery()))
                : new ArrayList<>();
        List<String> videos = new ArrayList<>();
        if (basic != null && notBlank(basic.getPersonalVideoUrl())) {
            videos.add(basic.getPersonalVideoUrl());
        }

        ProfileSocialProofView socialProof = buildSocialProof(user.getId());

        // 查看者三份资料：他人视角一次性加载，供共同点/匹配度/距离共用
        // （原实现里 buildCommonInterests 与 buildMatchScore 各查一遍，此处顺带消除重复查询）
        User viewerUser = null;
        UserBasicProfile viewerBasic = null;
        UserCampusProfile viewerCampus = null;

        UserProfileDTO.Relation relation;
        String distanceText = null;
        if (isPublic) {
            viewerUser = userRepository.findById(viewerId).orElse(null);
            viewerBasic = userBasicProfileRepository.findByUserId(viewerId).orElse(null);
            viewerCampus = userCampusProfileRepository.findByUserId(viewerId).orElse(null);

            boolean liked = likeRepository.findByUserIdAndTargetUserId(viewerId, user.getId())
                    .map(like -> like.getStatus() == Like.LikeStatus.active)
                    .orElse(false);
            boolean matched = isMutualLike(viewerId, user.getId());
            List<CommonPointDTO> commonPoints = buildCommonPoints(viewerBasic, viewerCampus, basic, campus);
            List<String> commonInterests = commonPoints.stream().map(CommonPointDTO::title).collect(Collectors.toList());
            int matchScore = buildMatchScore(viewerBasic, viewerCampus, basic, campus, commonInterests);
            List<String> matchReasons = new ArrayList<>(commonInterests);
            relation = new UserProfileDTO.Relation(
                    liked, matched, false, false, matchScore, matchReasons, commonInterests, commonPoints);
            distanceText = deriveDistanceText(viewerUser, user, viewerCampus, campus);
        } else {
            relation = new UserProfileDTO.Relation(
                    false, false, false, false, 0, List.of(), List.of(), List.of());
        }

        // 2026-09-05 R18：他人视角只展示已审核通过的帖子——pending 帖详情对非作者 404
        // （VillageQueryService.getPost 审核语义），泄漏到他人主页会出现"点了 404"；
        // 自己主页保留全部（作者可见自己的待审帖）
        List<UserProfileDTO.Post> posts = buildPosts(user.getId(), !isPublic);
        String state = computeState(user, basic, campus);

        return new UserProfileDTO(
                user.getId(),
                new UserProfileDTO.Basic(name, avatar, age, location, basic != null ? basic.getGender() : null),
                new UserProfileDTO.Identity(verified, student, mbti, personality),
                new UserProfileDTO.Intro(bio == null ? "" : bio, tags),
                new UserProfileDTO.Relationship("认真恋爱", preferenceCalculator.parseStringList(basic != null ? basic.getFuturePlanTags() : "[]")),
                new UserProfileDTO.Media(cover == null ? "" : cover, photos, videos, voiceIntro),
                socialProof,
                relation,
                posts,
                List.of(),
                List.of(),
                state,
                distanceText,
                deriveOnline(user.getId()));
    }

    private String computeState(User user, UserBasicProfile basic, UserCampusProfile campus) {
        if ("deactivated".equalsIgnoreCase(user.getStatus()) || "disabled".equalsIgnoreCase(user.getStatus())) {
            return "PRIVATE";
        }
        int completion = user.getProfileCompletion() == null ? 0 : user.getProfileCompletion();
        int photos = basic == null ? 0 : preferenceCalculator.parseStringList(basic.getPhotoGallery()).size();
        boolean verified = campus != null && "verified".equalsIgnoreCase(campus.getVerificationStatus());
        if (completion <= 0) {
            return "NEW";
        }
        if (completion >= 90 && photos >= 3 && verified) {
            return "HIGH_QUALITY";
        }
        if (completion < 90 || photos < 3) {
            return "INCOMPLETE";
        }
        return "NORMAL";
    }

    /**
     * R16（2026-09-07）性能修复：三项统计全部改为聚合 COUNT/SUM 查询，
     * 消除「全量拉取帖子/访客 + 逐条 isMutualLike N+1」导致他人主页 4~6s 假死。
     */
    private ProfileSocialProofView buildSocialProof(Long userId) {
        long likedMe = likeRepository.countByTargetUserIdAndStatus(userId, Like.LikeStatus.active);
        long likes = postRepository.sumLikesByAuthorId(userId);
        long visitors = profileVisitorRepository.countDistinctVisitorsByHostId(userId);
        // 互赞数：我 active 喜欢的目标里，对方也 active 喜欢我的数量（单条 COUNT）
        List<Long> myLikedTargets = likeRepository.findByUserIdAndStatus(userId, Like.LikeStatus.active)
                .stream()
                .map(Like::getTargetUserId)
                .filter(java.util.Objects::nonNull)
                .toList();
        long matches = myLikedTargets.isEmpty()
                ? 0L
                : likeRepository.countByTargetUserIdAndUserIdInAndStatus(
                        userId, myLikedTargets, Like.LikeStatus.active);
        return new ProfileSocialProofView(likedMe, likes, visitors, matches);
    }

    private boolean isMutualLike(Long userId, Long targetUserId) {
        if (targetUserId == null) return false;
        return likeRepository.findByUserIdAndTargetUserId(targetUserId, userId)
                .map(like -> like.getStatus() == Like.LikeStatus.active)
                .orElse(false);
    }

    private List<UserProfileDTO.Post> buildPosts(Long userId) {
        return buildPosts(userId, true);
    }

    /**
     * 2026-09-05 R18：isSelf=false（他人视角）仅返回审核通过且未下架/删除的帖子，
     * 与 VillageQueryService.getPost 的"非作者不可见待审帖"语义对齐，避免点击 404。
     */
    private List<UserProfileDTO.Post> buildPosts(Long userId, boolean isSelf) {
        // R16（2026-09-07）性能修复：他人视角用 top-N 索引查询，不再全量拉取后内存过滤
        List<Post> candidates;
        if (isSelf) {
            candidates = postRepository.findByAuthorId(userId).stream()
                    .sorted((a, b) -> {
                        if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                        return b.getCreatedAt().compareTo(a.getCreatedAt());
                    })
                    .limit(3)
                    .toList();
        } else {
            candidates = postRepository.findTop12ByAuthorIdAndAuditStatusAndStatusOrderByCreatedAtDesc(
                    userId, Post.AuditStatus.approved, Post.PostStatus.active);
        }
        return candidates.stream()
                .limit(3)
                .map(post -> new UserProfileDTO.Post(
                        String.valueOf(post.getId()),
                        post.getContent() == null ? "" : post.getContent(),
                        preferenceCalculator.parseStringList(post.getImages()),
                        post.getLikesCount() == null ? 0L : post.getLikesCount().longValue(),
                        post.getCommentsCount() == null ? 0L : post.getCommentsCount().longValue(),
                        post.getCreatedAt() == null ? "" : post.getCreatedAt().toString()))
                .collect(Collectors.toList());
    }

    private int buildMatchScore(UserBasicProfile myBasic, UserCampusProfile myCampus,
            UserBasicProfile targetBasic, UserCampusProfile targetCampus, List<String> commonInterests) {
        int score = Math.min(commonInterests.size() * 30, 60);
        if (myCampus != null && targetCampus != null) {
            if (notBlank(myCampus.getCampusName()) && myCampus.getCampusName().equals(targetCampus.getCampusName())) score += 20;
            if (notBlank(myCampus.getCityName()) && myCampus.getCityName().equals(targetCampus.getCityName())) score += 10;
        }
        if (myBasic != null && targetBasic != null) {
            Integer myAge = myBasic.getBirthYear() == null ? null : Year.now().getValue() - myBasic.getBirthYear();
            Integer targetAge = targetBasic.getBirthYear() == null ? null : Year.now().getValue() - targetBasic.getBirthYear();
            if (myAge != null && targetAge != null && Math.abs(myAge - targetAge) <= 5) score += 10;
        }
        return Math.min(100, score);
    }

    /**
     * 结构化共同点（R6/L07）。与旧的 {@code buildCommonInterests} 完全同源、同序、同 3 条上限，
     * 只是每条从裸字符串升级为 {@link CommonPointDTO}；{@code commonInterests} 由本方法的
     * title 反向生成，保证两份字段永不出现两套口径。
     *
     * <p>subtitle/icon 的取证规则（宁可 null，不编数据）：</p>
     * <ul>
     *   <li>同校 → {@code user_campus_profile.campus_name}（273/273 有值）+ 可选 {@code campus_branch}（8/273）</li>
     *   <li>同城 → {@code user_campus_profile.city_name}（273/273 有值）</li>
     *   <li>同龄 → {@code user_basic_profile.birth_year}（208/213 有值）推导的对方年龄</li>
     *   <li>兴趣词 → {@code interest_tag} 字典的 {@code category}/{@code icon}
     *       （实测均 0/8 有值 ⇒ 当前恒为 null；字典补齐后自动转真值）</li>
     * </ul>
     */
    private List<CommonPointDTO> buildCommonPoints(UserBasicProfile myBasic, UserCampusProfile myCampus,
            UserBasicProfile targetBasic, UserCampusProfile targetCampus) {
        List<CommonPointDTO> points = new ArrayList<>();
        Set<String> titles = new HashSet<>();

        List<String> myTags = myBasic != null
                ? new ArrayList<>(preferenceCalculator.parseInterestTags(myBasic.getInterestTags()))
                : List.of();
        List<String> targetTags = targetBasic != null
                ? new ArrayList<>(preferenceCalculator.parseInterestTags(targetBasic.getInterestTags()))
                : List.of();

        Map<String, InterestTag> dict = myTags.isEmpty()
                ? Map.of()
                : loadInterestTagDictionary();

        for (String tag : myTags) {
            if (targetTags.contains(tag) && titles.add(tag)) {
                InterestTag entry = dict.get(tag);
                points.add(new CommonPointDTO(tag, dictSubtitle(entry), dictIcon(entry)));
                if (points.size() >= 3) {
                    break;
                }
            }
        }

        if (points.size() < 3 && myCampus != null && targetCampus != null
                && notBlank(myCampus.getCampusName()) && myCampus.getCampusName().equals(targetCampus.getCampusName())
                && titles.add("同校")) {
            points.add(new CommonPointDTO("同校", campusSubtitle(targetCampus), null));
        }
        if (points.size() < 3 && myCampus != null && targetCampus != null
                && notBlank(myCampus.getCityName()) && myCampus.getCityName().equals(targetCampus.getCityName())
                && titles.add("同城")) {
            points.add(new CommonPointDTO("同城", targetCampus.getCityName(), null));
        }
        if (points.size() < 3 && myBasic != null && targetBasic != null) {
            Integer myAge = myBasic.getBirthYear() == null ? null : Year.now().getValue() - myBasic.getBirthYear();
            Integer targetAge = targetBasic.getBirthYear() == null ? null : Year.now().getValue() - targetBasic.getBirthYear();
            if (myAge != null && targetAge != null && Math.abs(myAge - targetAge) <= 5 && titles.add("同龄")) {
                // 判据是「相差 ≤5 岁」（沿用既有 matchScore 口径），故副标题只陈述对方年龄，不写「同为 N 岁」
                points.add(new CommonPointDTO("同龄", targetAge + "岁", null));
            }
        }
        return points;
    }

    /** 兴趣标签字典（{@code interest_tag}，启用项）。当前仅 8 行，一次取回按 name 建索引。 */
    private Map<String, InterestTag> loadInterestTagDictionary() {
        Map<String, InterestTag> map = new LinkedHashMap<>();
        for (InterestTag tag : interestTagRepository.findByEnabledTrueOrderByIdAsc()) {
            if (tag != null && notBlank(tag.getName())) {
                map.putIfAbsent(tag.getName().trim(), tag);
            }
        }
        return map;
    }

    /** 字典 category 才是面向用户的分组文案；恒为空时返回 null，不拿 group_key 内部键顶替。 */
    private String dictSubtitle(InterestTag entry) {
        return entry == null || !notBlank(entry.getCategory()) ? null : entry.getCategory().trim();
    }

    private String dictIcon(InterestTag entry) {
        return entry == null || !notBlank(entry.getIcon()) ? null : entry.getIcon().trim();
    }

    private String campusSubtitle(UserCampusProfile campus) {
        String name = campus.getCampusName();
        return notBlank(campus.getCampusBranch()) ? name + " · " + campus.getCampusBranch() : name;
    }

    /**
     * 在线状态推导（口径逐条对齐仓内既有实现，见 {@link UserProfileDTO#online()} 的 javadoc）。
     *
     * @return {@code true}=有有效会话或 5 分钟内心跳；{@code false}=有登录/心跳记录但均不活跃；
     *         {@code null}=三处来源都查无此用户（未知，交由前端渲染占位，不猜）
     */
    private Boolean deriveOnline(Long userId) {
        if (userId == null) {
            return null;
        }
        boolean liveSession = onlineUserService.getSession(userId).isPresent();
        UserOnlineStatus heartbeat = userOnlineStatusRepository.findByUserId(userId).orElse(null);
        boolean freshHeartbeat = heartbeat != null
                && heartbeat.getStatus() == UserOnlineStatus.OnlineStatus.online
                && heartbeat.getLastHeartbeat() != null
                && heartbeat.getLastHeartbeat().isAfter(
                        LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(ONLINE_HEARTBEAT_WINDOW_MINUTES));
        if (liveSession || freshHeartbeat) {
            return Boolean.TRUE;
        }
        boolean hasPresenceEvidence = heartbeat != null
                || !userDeviceSessionRepository.findByUserIdAndRevokedFalse(userId).isEmpty();
        return hasPresenceEvidence ? Boolean.FALSE : null;
    }

    /**
     * 距离文案：只在查看者与被查看者两侧都真实存有经纬度时给出，否则 null（不降级为「同城」等猜测）。
     * 坐标来源 {@code users.latitude}/{@code users.longitude}（gcj02，实测 271/292 有值）。
     */
    private String deriveDistanceText(User viewer, User target, UserCampusProfile viewerCampus,
            UserCampusProfile targetCampus) {
        if (viewer == null || target == null || java.util.Objects.equals(viewer.getId(), target.getId())) {
            return null;
        }
        // 同校不显示距离（与 RecommendationRanker.deriveDistanceText 同口径，避免同校显示 "<1km" 的怪结果）
        if (viewerCampus != null && targetCampus != null && notBlank(viewerCampus.getCampusName())
                && viewerCampus.getCampusName().equals(targetCampus.getCampusName())) {
            return null;
        }
        if (!hasCoords(viewer) || !hasCoords(target)) {
            return null;
        }
        double km = geoService.haversineKm(
                viewer.getLatitude().doubleValue(), viewer.getLongitude().doubleValue(),
                target.getLatitude().doubleValue(), target.getLongitude().doubleValue());
        if (Double.isNaN(km) || km < 0 || km > MAX_RELIABLE_DISTANCE_KM) {
            return null;
        }
        return geoService.formatDistance(km);
    }

    private boolean hasCoords(User user) {
        BigDecimal lat = user.getLatitude();
        BigDecimal lng = user.getLongitude();
        return lat != null && lng != null;
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (notBlank(value)) return value;
        }
        return "";
    }
}
