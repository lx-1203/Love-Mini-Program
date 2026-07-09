package com.campuslove.api.campus;

import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.discover.ActivityView;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.CampusTopic;
import com.campuslove.api.entity.CampusTopicReply;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CampusTopicReplyRepository;
import com.campuslove.api.repository.CampusTopicRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.village.PostAuthorView;
import com.campuslove.api.village.PostSummaryView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
    private final ObjectMapper objectMapper;
    private final SensitiveWordFilter sensitiveWordFilter;

    public RealCampusService(
            CampusTopicRepository campusTopicRepository,
            CampusTopicReplyRepository campusTopicReplyRepository,
            PostRepository postRepository,
            ActivityRepository activityRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper,
            SensitiveWordFilter sensitiveWordFilter) {
        this.campusTopicRepository = campusTopicRepository;
        this.campusTopicReplyRepository = campusTopicReplyRepository;
        this.postRepository = postRepository;
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
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

        return toCampusTopicView(topic);
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

        return topics.stream()
                .map(this::toCampusTopicView)
                .toList();
    }

    @Override
    @Transactional
    public CampusTopicView createCampusTopic(Long userId, Long schoolId, String category, String title, String content) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }
        if (schoolId == null) {
            throw new IllegalArgumentException("schoolId 不能为空");
        }
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("category 不能为空");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("title 不能为空");
        }

        // 敏感词过滤：过滤话题标题和内容
        String filteredTitle = sensitiveWordFilter.filterWithLog(title, userId, "CAMPUS_TOPIC_TITLE");
        String filteredContent = sensitiveWordFilter.filterWithLog(
                content != null ? content : "", userId, "CAMPUS_TOPIC_CONTENT");

        LocalDateTime now = LocalDateTime.now();
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
        return toCampusTopicView(topic);
    }

    // ---- 校园话题回复 ----

    @Override
    @Transactional
    public CampusTopicReplyView replyCampusTopic(Long topicId, Long userId, String content) {
        if (topicId == null) {
            throw new IllegalArgumentException("topicId 不能为空");
        }
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content 不能为空");
        }

        // 敏感词过滤：过滤回复内容
        String filteredContent = sensitiveWordFilter.filterWithLog(content, userId, "CAMPUS_REPLY");

        CampusTopic topic = findTopicOrThrow(topicId);

        LocalDateTime now = LocalDateTime.now();
        CampusTopicReply reply = new CampusTopicReply();
        reply.setTopicId(topicId);
        reply.setAuthorId(userId);
        reply.setContent(filteredContent);
        reply.setIsAnonymous(false);
        reply.setCreatedAt(now);

        campusTopicReplyRepository.save(reply);

        // 增加话题回复计数
        topic.setReplyCount(topic.getReplyCount() + 1);
        topic.setUpdatedAt(now);
        campusTopicRepository.save(topic);

        return toCampusTopicReplyView(reply);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampusTopicReplyView> getCampusTopicReplies(Long topicId) {
        List<CampusTopicReply> replies = campusTopicReplyRepository.findByTopicIdOrderByCreatedAtAsc(topicId);
        return replies.stream()
                .map(this::toCampusTopicReplyView)
                .toList();
    }

    // ---- 同校帖子流 ----

    @Override
    @Transactional(readOnly = true)
    public List<PostSummaryView> getCampusPosts(Long schoolId, int page) {
        // 获取最新的活跃帖子，按创建时间倒序分页
        Page<Post> postPage = postRepository.findByStatusOrderByCreatedAtDesc(
                PostStatus.active, PageRequest.of(page, 20));

        List<PostSummaryView> result = new ArrayList<>();
        for (Post post : postPage.getContent()) {
            PostAuthorView author = getPostAuthorView(post.getAuthorId());
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
                    post.getLikesCount() >= 50,
                    false // isAlumni
            ));
        }
        return result;
    }

    // ---- 同校活动 ----

    @Override
    @Transactional(readOnly = true)
    public List<ActivityView> getCampusActivities(Long schoolId, int page) {
        // 获取即将开始的活动
        Page<Activity> activityPage = activityRepository.findByStatusOrderByActivityDateAsc(
                ActivityStatus.upcoming, PageRequest.of(page, 20));

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
                        activity.getActivityDate()
                ))
                .toList();
    }

    // ---- 私有辅助方法 ----

    /**
     * 查找话题，不存在则抛出异常。
     */
    private CampusTopic findTopicOrThrow(Long topicId) {
        return campusTopicRepository.findById(topicId)
                .orElseThrow(() -> new IllegalArgumentException("话题不存在: " + topicId));
    }

    /**
     * 将 CampusTopic 实体转换为 CampusTopicView。
     */
    private CampusTopicView toCampusTopicView(CampusTopic topic) {
        String authorName;
        String authorAvatar;
        Long displayAuthorId;

        if (Boolean.TRUE.equals(topic.getIsAnonymous())) {
            // 匿名发帖：隐藏用户信息
            authorName = "匿名校友";
            authorAvatar = null;
            displayAuthorId = null;
        } else {
            // 非匿名：查询真实用户信息
            User author = userRepository.findById(topic.getAuthorId()).orElse(null);
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
     * 将 CampusTopicReply 实体转换为 CampusTopicReplyView。
     * 匿名回复时返回"匿名校友"。
     */
    private CampusTopicReplyView toCampusTopicReplyView(CampusTopicReply reply) {
        String authorName;
        String authorAvatar;
        Long displayAuthorId;

        if (Boolean.TRUE.equals(reply.getIsAnonymous())) {
            // 匿名回复：隐藏用户信息
            authorName = "匿名校友";
            authorAvatar = null;
            displayAuthorId = null;
        } else {
            // 非匿名：查询真实用户信息
            User author = userRepository.findById(reply.getAuthorId()).orElse(null);
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
     * 获取帖子作者视图。
     */
    private PostAuthorView getPostAuthorView(Long authorId) {
        User author = userRepository.findById(authorId).orElse(null);
        String nickname = author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = author != null ? author.getAvatarUrl() : null;

        return new PostAuthorView(authorId, nickname, avatarUrl, "");
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