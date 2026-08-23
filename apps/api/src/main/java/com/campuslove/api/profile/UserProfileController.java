package com.campuslove.api.profile;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.discover.UserPreferenceCalculator;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.ProfileVisitor;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.ProfileVisitorRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
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
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/profile")
@PreAuthorize("hasRole('USER')")
public class UserProfileController {

    private final UserRepository userRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final LikeRepository likeRepository;
    private final ProfileVisitorRepository profileVisitorRepository;
    private final PostRepository postRepository;
    private final UserPreferenceCalculator preferenceCalculator;

    public UserProfileController(
            UserRepository userRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            LikeRepository likeRepository,
            ProfileVisitorRepository profileVisitorRepository,
            PostRepository postRepository,
            UserPreferenceCalculator preferenceCalculator) {
        this.userRepository = userRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.likeRepository = likeRepository;
        this.profileVisitorRepository = profileVisitorRepository;
        this.postRepository = postRepository;
        this.preferenceCalculator = preferenceCalculator;
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

        UserProfileDTO.Relation relation;
        if (isPublic) {
            boolean liked = likeRepository.findByUserIdAndTargetUserId(viewerId, user.getId())
                    .map(like -> like.getStatus() == Like.LikeStatus.active)
                    .orElse(false);
            boolean matched = isMutualLike(viewerId, user.getId());
            List<String> commonInterests = buildCommonInterests(viewerId, user.getId(), basic, campus);
            int matchScore = buildMatchScore(viewerId, user.getId(), basic, campus, commonInterests);
            List<String> matchReasons = new ArrayList<>(commonInterests);
            relation = new UserProfileDTO.Relation(liked, matched, false, false, matchScore, matchReasons, commonInterests);
        } else {
            relation = new UserProfileDTO.Relation(false, false, false, false, 0, List.of(), List.of());
        }

        List<UserProfileDTO.Post> posts = buildPosts(user.getId());
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
                state);
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

    private ProfileSocialProofView buildSocialProof(Long userId) {
        long likedMe = likeRepository.countByTargetUserIdAndStatus(userId, Like.LikeStatus.active);
        long likes = postRepository.findByAuthorId(userId).stream()
                .mapToLong(post -> post.getLikesCount() == null ? 0L : post.getLikesCount().longValue())
                .sum();
        long visitors = profileVisitorRepository.findByHostIdOrderByVisitedAtDesc(userId).stream()
                .map(ProfileVisitor::getVisitorId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .count();
        long matches = likeRepository.findByUserIdAndStatus(userId, Like.LikeStatus.active).stream()
                .filter(like -> isMutualLike(userId, like.getTargetUserId()))
                .count();
        return new ProfileSocialProofView(likedMe, likes, visitors, matches);
    }

    private boolean isMutualLike(Long userId, Long targetUserId) {
        if (targetUserId == null) return false;
        return likeRepository.findByUserIdAndTargetUserId(targetUserId, userId)
                .map(like -> like.getStatus() == Like.LikeStatus.active)
                .orElse(false);
    }

    private List<UserProfileDTO.Post> buildPosts(Long userId) {
        return postRepository.findByAuthorId(userId).stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
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

    private int buildMatchScore(Long viewerId, Long targetId, UserBasicProfile targetBasic, UserCampusProfile targetCampus, List<String> commonInterests) {
        UserBasicProfile myBasic = userBasicProfileRepository.findByUserId(viewerId).orElse(null);
        UserCampusProfile myCampus = userCampusProfileRepository.findByUserId(viewerId).orElse(null);
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

    private List<String> buildCommonInterests(Long viewerId, Long targetId, UserBasicProfile targetBasic, UserCampusProfile targetCampus) {
        UserBasicProfile myBasic = userBasicProfileRepository.findByUserId(viewerId).orElse(null);
        UserCampusProfile myCampus = userCampusProfileRepository.findByUserId(viewerId).orElse(null);
        List<String> common = new ArrayList<>();

        List<String> myTags = myBasic != null ? new ArrayList<>(preferenceCalculator.parseInterestTags(myBasic.getInterestTags())) : new ArrayList<>();
        List<String> targetTags = targetBasic != null ? new ArrayList<>(preferenceCalculator.parseInterestTags(targetBasic.getInterestTags())) : new ArrayList<>();
        for (String tag : myTags) {
            if (targetTags.contains(tag) && !common.contains(tag)) {
                common.add(tag);
                if (common.size() >= 3) break;
            }
        }

        if (common.size() < 3 && myCampus != null && targetCampus != null) {
            if (notBlank(myCampus.getCampusName()) && myCampus.getCampusName().equals(targetCampus.getCampusName()) && !common.contains("同校")) {
                common.add("同校");
            }
        }
        if (common.size() < 3 && myCampus != null && targetCampus != null) {
            if (notBlank(myCampus.getCityName()) && myCampus.getCityName().equals(targetCampus.getCityName()) && !common.contains("同城")) {
                common.add("同城");
            }
        }
        if (common.size() < 3 && myBasic != null && targetBasic != null) {
            Integer myAge = myBasic.getBirthYear() == null ? null : Year.now().getValue() - myBasic.getBirthYear();
            Integer targetAge = targetBasic.getBirthYear() == null ? null : Year.now().getValue() - targetBasic.getBirthYear();
            if (myAge != null && targetAge != null && Math.abs(myAge - targetAge) <= 5 && !common.contains("同龄")) {
                common.add("同龄");
            }
        }
        return common;
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
