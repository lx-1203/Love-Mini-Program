package com.campuslove.api.campus;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.discover.ActivityView;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.CampusTopic;
import com.campuslove.api.entity.CampusTopicReply;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.School;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CampusTopicReplyRepository;
import com.campuslove.api.repository.CampusTopicRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.village.PostAuthorView;
import com.campuslove.api.village.PostSummaryView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实校园社交服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 */
@Profile("real")
@Service
public class RealCampusService implements CampusService {

    private final CampusTopicRepository campusTopicRepository;
    private final CampusTopicReplyRepository campusTopicReplyRepository;
    private final PostRepository postRepository;
    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final SchoolRepository schoolRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final ObjectMapper objectMapper;
    private final SensitiveWordFilter sensitiveWordFilter;

    public RealCampusService(
            CampusTopicRepository campusTopicRepository,
            CampusTopicReplyRepository campusTopicReplyRepository,
            PostRepository postRepository,
            ActivityRepository activityRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            SchoolRepository schoolRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            ObjectMapper objectMapper,
            SensitiveWordFilter sensitiveWordFilter) {
        this.campusTopicRepository = campusTopicRepository;
        this.campusTopicReplyRepository = campusTopicReplyRepository;
        this.postRepository = postRepository;
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.schoolRepository = schoolRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.objectMapper = objectMapper;
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    // ---- 校园话题 ----

    @Override
    @Transactional
    public CampusTopicView getCampusTopic(Long topicId) {
        CampusTopic topic = findTopicOrThrow(topicId);

        // 增加浏览数
        topic.setViewCount(topic.getViewCount() + 1);
        campusTopicRepository.save(topic);

        // Task 2.2.3：批量预加载作者信息（单条场景下也走统一 Map，避免后续扩展时遗漏）
        Map<Long, User> authorMap = batchLoadAuthors(List.of(topic));
        return toCampusTopicView(topic, authorMap);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampusTopicView> getCampusTopics(Long schoolId, String category) {
        List<CampusTopic> topics;
        if (category != null && !category.isBlank()) {
            topics = campusTopicRepository.findBySchoolIdAndCategoryOrderByCreatedAtDesc(schoolId, category);
        } else {
            topics = campusTopicRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId);
        }

        // R4-00385：客户端查询层按 status='active' 过滤——管理端软删/隐藏的话题
        // （AdminCampusTopicController.deleteTopic / reject 审核置 hidden）不再对
        // 客户端校园圈列表可见，删除/下架功能真正生效（原注释自认未过滤的缺口）。
        List<CampusTopic> activeTopics = topics.stream()
                .filter(t -> t.getStatus() == CampusTopic.TopicStatus.active)
                .toList();

        // Task 2.2.3：批量预加载作者信息，避免在 toCampusTopicView 中触发 N+1 查询
        Map<Long, User> authorMap = batchLoadAuthors(activeTopics);
        return activeTopics.stream()
                .map(topic -> toCampusTopicView(topic, authorMap))
                .toList();
    }

    @Override
    @Transactional
    public CampusTopicView createCampusTopic(Long userId, Long schoolId, String category, String title, String content) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }
        if (schoolId == null) {
            throw new IllegalArgumentException(ErrorMessages.SCHOOL_ID_REQUIRED);
        }
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.CATEGORY_REQUIRED);
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.TITLE_REQUIRED);
        }

        // 敏感词过滤：过滤话题标题和内容
        String filteredTitle = sensitiveWordFilter.filterWithLog(title, userId, "CAMPUS_TOPIC_TITLE");
        String filteredContent = sensitiveWordFilter.filterWithLog(
                content != null ? content : "", userId, "CAMPUS_TOPIC_CONTENT");

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        CampusTopic topic = new CampusTopic();
        topic.setSchoolId(schoolId);
        topic.setCategory(category);
        topic.setTitle(filteredTitle);
        topic.setContent(filteredContent);
        topic.setAuthorId(userId);
        topic.setReplyCount(0);
        topic.setViewCount(0);
        topic.setIsAnonymous(false);
        topic.setCreatedAt(now);
        topic.setUpdatedAt(now);

        campusTopicRepository.save(topic);
        // Task 2.2.3：使用统一 Map 复用预加载逻辑
        Map<Long, User> authorMap = batchLoadAuthors(List.of(topic));
        return toCampusTopicView(topic, authorMap);
    }

    // ---- 校园话题回复 ----

    @Override
    @Transactional
    public CampusTopicReplyView replyCampusTopic(Long topicId, Long userId, String content) {
        if (topicId == null) {
            throw new IllegalArgumentException(ErrorMessages.TOPIC_ID_REQUIRED);
        }
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.CONTENT_REQUIRED);
        }

        // 敏感词过滤：过滤回复内容
        String filteredContent = sensitiveWordFilter.filterWithLog(content, userId, "CAMPUS_REPLY");

        CampusTopic topic = findTopicOrThrow(topicId);

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        CampusTopicReply reply = new CampusTopicReply();
        reply.setTopicId(topicId);
        reply.setAuthorId(userId);
        reply.setContent(filteredContent);
        reply.setIsAnonymous(false);
        reply.setCreatedAt(now);

        // 实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id，
        // 否则下方 toCampusTopicReplyView 中 reply.getId() 为 null
        reply = campusTopicReplyRepository.save(reply);

        // 增加话题回复计数
        topic.setReplyCount(topic.getReplyCount() + 1);
        topic.setUpdatedAt(now);
        campusTopicRepository.save(topic);

        // Task 2.2.3：批量预加载作者信息（单条场景下也走统一 Map）
        Map<Long, User> authorMap = batchLoadReplyAuthors(List.of(reply));
        return toCampusTopicReplyView(reply, authorMap);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampusTopicReplyView> getCampusTopicReplies(Long topicId) {
        List<CampusTopicReply> replies = campusTopicReplyRepository.findByTopicIdOrderByCreatedAtAsc(topicId);

        // Task 2.2.3：批量预加载回复作者信息，避免在 toCampusTopicReplyView 中触发 N+1 查询
        Map<Long, User> authorMap = batchLoadReplyAuthors(replies);
        return replies.stream()
                .map(reply -> toCampusTopicReplyView(reply, authorMap))
                .toList();
    }

    // ---- 同校帖子流 ----

    @Override
    @Transactional(readOnly = true)
    public List<PostSummaryView> getCampusPosts(Long schoolId, int page) {
        // P0-26 修复：原实现忽略 schoolId 直接返回全站帖子。
        // 现按作者 user_campus_profile 过滤，只返回同校内容（对外响应结构不变）。
        // 先解析 schoolId → 校区名，再取较宽窗口（200 条）内存过滤后按页切片，
        // 避免引入跨表分页查询的复杂度（数据量级下 200 条窗口足够）。
        String schoolName = resolveSchoolName(schoolId);
        if (schoolName == null || schoolName.isBlank()) {
            return List.of();
        }
        List<Post> allPosts = postRepository.findByStatusOrderByCreatedAtDesc(
                PostStatus.active, PageRequest.of(0, 200)).getContent();

        // 批量预加载作者校区资料，仅保留同校作者（一次查询，无 N+1）
        List<Long> authorIds = allPosts.stream()
                .map(Post::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, UserCampusProfile> campusMap = userCampusProfileRepository
                .findByUserIdIn(authorIds).stream()
                .collect(Collectors.toMap(UserCampusProfile::getUserId, p -> p, (a, b) -> a));
        List<Post> sameSchoolPosts = allPosts.stream()
                .filter(post -> schoolName.equals(
                        campusMap.get(post.getAuthorId()) != null
                                ? campusMap.get(post.getAuthorId()).getCampusName()
                                : null))
                .toList();

        // 内存分页切片（与原 20 条/页语义一致）
        int pageSize = 20;
        int from = Math.max(0, page) * pageSize;
        if (from >= sameSchoolPosts.size()) {
            return List.of();
        }
        List<Post> pagePosts = sameSchoolPosts.subList(from, Math.min(from + pageSize, sameSchoolPosts.size()));

        // 批量预加载作者信息与基本资料，避免在循环中触发 N+1 查询
        List<Long> pageAuthorIds = pagePosts.stream()
                .map(Post::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> authorMap = batchLoadUsers(pageAuthorIds);
        Map<Long, UserBasicProfile> basicProfileMap = userBasicProfileRepository
                .findByUserIdIn(pageAuthorIds).stream()
                .collect(Collectors.toMap(UserBasicProfile::getUserId, p -> p, (a, b) -> a));

        List<PostSummaryView> result = new ArrayList<>();
        for (Post post : pagePosts) {
            PostAuthorView author = getPostAuthorView(post.getAuthorId(), authorMap, campusMap, basicProfileMap);
            List<String> tags = parseJsonToList(post.getTags());
            String summary = truncate(post.getContent(), 120);

            result.add(new PostSummaryView(
                    post.getId(),
                    null, // title
                    summary,
                    author,
                    post.getCategory().name(),
                    tags,
                    post.getLikesCount(),
                    post.getCommentsCount(),
                    post.getShareCount(),
                    post.getCreatedAt().toString(),
                    post.getLikesCount() >= com.campuslove.api.config.ContentThresholds.HOT_POST_LIKES_THRESHOLD,
                    false, // isAlumni
                    false, // isFollowed
                    // 2026-08-08 论坛互动真实化：校园流不展示收藏（无收藏上下文，恒 0/false），浏览量取实体
                    0,
                    false, // isFavorite
                    post.getViewCount(),
                    // 2026-08-09 帖子关联活动：同校流暂无活动/评论预览上下文，按 null / 空列表兜底
                    post.getActivityId(),
                    null, // activity
                    Boolean.TRUE.equals(post.getIsPinned()),
                    List.of() // recentComments
            ));
        }
        return result;
    }

    // ---- 同校活动 ----

    @Override
    @Transactional(readOnly = true)
    public List<ActivityView> getCampusActivities(Long schoolId, int page) {
        // P0-26 修复：原实现忽略 schoolId 直接返回全站活动。
        // 活动表自带 campus_name（组织者发布时写入的校区），按学校名精确过滤，
        // 与校区管理员管辖口径一致，只返回同校活动。
        String schoolName = resolveSchoolName(schoolId);
        if (schoolName == null || schoolName.isBlank()) {
            return List.of();
        }
        Page<Activity> activityPage = activityRepository.findByCampusNameAndStatusOrderByActivityDateAsc(
                schoolName, ActivityStatus.upcoming, PageRequest.of(page, 20));

        return activityPage.getContent().stream()
                .map(activity -> new ActivityView(
                        activity.getId(),
                        activity.getTitle(),
                        activity.getLocation(),
                        activity.getScheduleText(),
                        activity.getDescription(),
                        activity.getEnrollmentCount(),
                        parseJsonToList(activity.getParticipantAvatars()),
                        activity.getStatus().name(),
                        activity.getActivityDate(),
                        activity.getCategory(),
                        activity.getCoverImage(),
                        false
                ))
                .toList();
    }

    // ---- 学校列表 ----

    /**
     * 获取所有学校（校区）列表。
     * 从 UserCampusProfile 表中查询 distinct campusName，按名称升序排列。
     *
     * <p>缓存策略：使用 {@link CacheNames#CAMPUS_SCHOOLS} 缓存，TTL 1 小时，
     * key 固定为 "all"（全量列表，无参数）。学校列表变更频率极低，TTL 较长以最大化命中率。</p>
     *
     * @return 去重后的校区名称列表（按名称升序）
     */
    @Cacheable(cacheNames = CacheNames.CAMPUS_SCHOOLS, key = "'all'")
    public List<String> listSchools() {
        return userCampusProfileRepository.findDistinctCampusNames();
    }

    // ---- 私有辅助方法 ----

    /**
     * 查找话题，不存在则抛出异常。
     */
    private CampusTopic findTopicOrThrow(Long topicId) {
        return campusTopicRepository.findById(topicId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.TOPIC_NOT_FOUND_PREFIX + topicId));
    }

    /**
     * 将 CampusTopic 实体转换为 CampusTopicView（批量场景）。
     *
     * <p>Task 2.2.3：从预加载的 author Map 中按 authorId 取出 User 实体（O(1)，无 N+1 查询），
     * Map 中不存在时按"未知用户"处理。匿名帖子直接返回"匿名校友"，不查 Map。</p>
     *
     * @param topic     话题实体
     * @param authorMap authorId → User 实体的 Map（可能为空 Map）
     * @return 话题视图
     */
    private CampusTopicView toCampusTopicView(CampusTopic topic, Map<Long, User> authorMap) {
        String authorName;
        String authorAvatar;
        Long displayAuthorId;

        if (Boolean.TRUE.equals(topic.getIsAnonymous())) {
            // 匿名发帖：隐藏用户信息
            authorName = "匿名校友";
            authorAvatar = null;
            displayAuthorId = null;
        } else {
            // 非匿名：从预加载的 Map 中获取作者信息（O(1)，无 N+1 查询）
            User author = authorMap != null ? authorMap.get(topic.getAuthorId()) : null;
            authorName = author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
            authorAvatar = author != null ? author.getAvatarUrl() : null;
            displayAuthorId = topic.getAuthorId();
        }

        return new CampusTopicView(
                topic.getId(),
                topic.getSchoolId(),
                topic.getCategory(),
                topic.getTitle(),
                topic.getContent(),
                topic.getImages(),
                displayAuthorId,
                authorName,
                authorAvatar,
                topic.getReplyCount(),
                topic.getViewCount(),
                Boolean.TRUE.equals(topic.getIsAnonymous()),
                topic.getCreatedAt().toString()
        );
    }

    /**
     * 将 CampusTopicReply 实体转换为 CampusTopicReplyView（批量场景）。
     * 匿名回复时返回"匿名校友"。
     *
     * <p>Task 2.2.3：从预加载的 author Map 中按 authorId 取出 User 实体（O(1)，无 N+1 查询）。</p>
     *
     * @param reply     回复实体
     * @param authorMap authorId → User 实体的 Map
     * @return 回复视图
     */
    private CampusTopicReplyView toCampusTopicReplyView(CampusTopicReply reply, Map<Long, User> authorMap) {
        String authorName;
        String authorAvatar;
        Long displayAuthorId;

        if (Boolean.TRUE.equals(reply.getIsAnonymous())) {
            // 匿名回复：隐藏用户信息
            authorName = "匿名校友";
            authorAvatar = null;
            displayAuthorId = null;
        } else {
            // 非匿名：从预加载的 Map 中获取作者信息（O(1)，无 N+1 查询）
            User author = authorMap != null ? authorMap.get(reply.getAuthorId()) : null;
            authorName = author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
            authorAvatar = author != null ? author.getAvatarUrl() : null;
            displayAuthorId = reply.getAuthorId();
        }

        return new CampusTopicReplyView(
                reply.getId(),
                reply.getTopicId(),
                displayAuthorId,
                authorName,
                authorAvatar,
                reply.getContent(),
                Boolean.TRUE.equals(reply.getIsAnonymous()),
                reply.getCreatedAt().toString()
        );
    }

    /**
     * 批量预加载 CampusTopic 列表的作者信息。
     *
     * <p>Task 2.2.3：原 toCampusTopicView 内部为每条非匿名话题调用
     * {@code userRepository.findById(authorId)}，N 条话题触发 N 次 SELECT user。
     * 本方法先收集 distinct authorId（仅非匿名），再通过
     * {@link org.springframework.data.jpa.repository.JpaRepository#findAllById(Iterable)}
     * 一次性查询并组装为 Map，将 N 次查询压缩为 1 次。</p>
     *
     * @param topics 话题列表
     * @return authorId → User 实体的 Map
     */
    private Map<Long, User> batchLoadAuthors(List<CampusTopic> topics) {
        if (topics == null || topics.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> authorIds = topics.stream()
                .filter(t -> !Boolean.TRUE.equals(t.getIsAnonymous()))
                .map(CampusTopic::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (authorIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    /**
     * 批量预加载 CampusTopicReply 列表的作者信息。
     *
     * <p>Task 2.2.3：批量收集回复 authorId 后一次性查询，避免在循环中触发 N+1 查询。</p>
     *
     * @param replies 回复列表
     * @return authorId → User 实体的 Map
     */
    private Map<Long, User> batchLoadReplyAuthors(List<CampusTopicReply> replies) {
        if (replies == null || replies.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> authorIds = replies.stream()
                .filter(r -> !Boolean.TRUE.equals(r.getIsAnonymous()))
                .map(CampusTopicReply::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (authorIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    /**
     * 获取帖子作者视图（单条调用场景，回退到单次查询）。
     */
    private PostAuthorView getPostAuthorView(Long authorId) {
        User author = userRepository.findById(authorId).orElse(null);
        String nickname = author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = author != null ? author.getAvatarUrl() : null;
        // P1-16：城市来自校园资料，年龄/学历来自基本资料（单条场景直接查询）
        UserCampusProfile campusProfile = userCampusProfileRepository.findByUserId(authorId).orElse(null);
        UserBasicProfile basicProfile = userBasicProfileRepository.findByUserId(authorId).orElse(null);
        return buildPostAuthorView(authorId, nickname, avatarUrl, campusProfile, basicProfile);
    }

    /**
     * 获取帖子作者视图（同校流批量场景，P1-16）。
     *
     * <p>从预加载的 author Map / campus Map / basicProfile Map 中取数（O(1)，无 N+1 查询），
     * 三个 Map 均可能为空 Map，缺失时按"未知用户/空字段"处理。</p>
     *
     * @param authorId          作者用户 ID
     * @param authorMap         authorId → User 实体的 Map（可能为空 Map）
     * @param campusMap         userId → UserCampusProfile 实体的 Map（可能为空 Map）
     * @param basicProfileMap   userId → UserBasicProfile 实体的 Map（可能为空 Map）
     * @return 帖子作者视图
     */
    private PostAuthorView getPostAuthorView(Long authorId, Map<Long, User> authorMap,
                                             Map<Long, UserCampusProfile> campusMap,
                                             Map<Long, UserBasicProfile> basicProfileMap) {
        User author = authorMap != null ? authorMap.get(authorId) : null;
        String nickname = author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = author != null ? author.getAvatarUrl() : null;
        UserCampusProfile campusProfile = campusMap != null ? campusMap.get(authorId) : null;
        UserBasicProfile basicProfile = basicProfileMap != null ? basicProfileMap.get(authorId) : null;
        return buildPostAuthorView(authorId, nickname, avatarUrl, campusProfile, basicProfile);
    }

    /**
     * 组装作者视图（P1-16：age/city/education 扩展字段）。
     *
     * <p>age 由年级标签推导（见 {@link PostAuthorView#deriveAgeFromGradeLabel}），
     * city 取自校园资料 city_name，education 取自基本资料 education_level。</p>
     */
    private PostAuthorView buildPostAuthorView(Long authorId, String nickname, String avatarUrl,
                                               UserCampusProfile campusProfile,
                                               UserBasicProfile basicProfile) {
        String campusName = campusProfile != null && campusProfile.getCampusName() != null
                ? campusProfile.getCampusName() : "";
        String city = campusProfile != null ? campusProfile.getCityName() : null;
        Integer age = basicProfile != null
                ? PostAuthorView.deriveAgeFromGradeLabel(basicProfile.getGradeLabel()) : null;
        String education = basicProfile != null ? basicProfile.getEducationLevel() : null;
        return new PostAuthorView(authorId, nickname, avatarUrl, campusName, age, city, education);
    }

    /**
     * 解析 schoolId → 校区名（P0-26 数据隔离辅助）。
     *
     * @param schoolId schools 表主键
     * @return 校区全称；schoolId 为空或学校不存在时返回 null
     */
    private String resolveSchoolName(Long schoolId) {
        if (schoolId == null) {
            return null;
        }
        return schoolRepository.findById(schoolId).map(School::getName).orElse(null);
    }

    /**
     * 批量查询用户信息，避免 N+1 查询。
     *
     * <p>Task 2.2.3：原 getCampusPosts 循环中调用 getPostAuthorView → userRepository.findById
     * 会触发 N 次 SELECT user。本方法先收集 distinct authorId 列表，再通过
     * {@link org.springframework.data.jpa.repository.JpaRepository#findAllById(Iterable)}
     * 一次性查询并组装为 Map，将 N 次查询压缩为 1 次。</p>
     *
     * @param userIds 用户 ID 列表
     * @return userId → User 实体的 Map
     */
    private Map<Long, User> batchLoadUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> distinctIds = userIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (distinctIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(distinctIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    /**
     * 将 JSON 字符串解析为字符串列表。
     */
    private List<String> parseJsonToList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    /**
     * 截断字符串。
     */
    private static String truncate(String text, int maxLen) {
        if (text == null) return null;
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}