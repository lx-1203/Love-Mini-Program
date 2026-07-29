package com.campuslove.api.village;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.PostTag;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostTagRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实帖子话题标签服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 *
 * <p>Task 2.3.2：{@link #getTags()} 添加 {@code @Cacheable}（CacheName = {@link CacheNames#USER_TAGS}），
 * 避免每次接口调用重复返回新构造的 List。标签列表为静态预置常量，
 * TTL 10 分钟自然失效即可，无需 @CacheEvict。</p>
 */
@Profile("real")
@Service
public class RealPostTagService implements PostTagService {

    /**
     * 预置话题标签列表。
     */
    private static final List<String> PRESET_TAGS = List.of(
            "校园日常", "兴趣分享", "找搭子", "求助",
            "表白墙", "校友动态", "生活记录", "技术交流"
    );

    private final PostTagRepository postTagRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final ObjectMapper objectMapper;

    public RealPostTagService(
            PostTagRepository postTagRepository,
            PostRepository postRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            ObjectMapper objectMapper) {
        this.postTagRepository = postTagRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 获取预置话题标签列表。
     *
     * <p>Task 2.3.2：使用 {@code @Cacheable} 缓存返回值，
     * 避免每次接口调用都重新构造 List 对象（虽然 PRESET_TAGS 是常量，
     * 但缓存后可直接返回缓存引用，减少对象分配与序列化开销）。
     * CacheKey 固定为 {@code "all"}，TTL 10 分钟。</p>
     *
     * @return 不可变的预置标签列表
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.USER_TAGS, key = "'all'")
    public List<String> getTags() {
        return PRESET_TAGS;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostSummaryView> getPostsByTag(String tagName, int page, int size) {
        if (tagName == null || tagName.isBlank()) {
            return List.of();
        }

        // 1. 查询该标签下所有 post_id
        List<PostTag> tagRecords = postTagRepository.findByTagName(tagName);
        if (tagRecords.isEmpty()) {
            return List.of();
        }

        List<Long> postIds = tagRecords.stream()
                .map(PostTag::getPostId)
                .distinct()
                .toList();

        // 2. 查询帖子并按创建时间倒序分页
        Page<Post> postPage = postRepository.findByIdInAndStatusOrderByCreatedAtDesc(
                postIds, PostStatus.active,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        return postPage.getContent().stream()
                .map(this::toPostSummaryView)
                .toList();
    }

    /**
     * 将 Post 实体转换为 PostSummaryView。
     */
    private PostSummaryView toPostSummaryView(Post post) {
        PostAuthorView author = getPostAuthorView(post.getAuthorId());
        List<String> tags = parseJsonToList(post.getTags());
        String summary = truncate(post.getContent(), 120);

        return new PostSummaryView(
                post.getId(),
                null,
                summary,
                author,
                post.getCategory().name(),
                tags,
                post.getLikesCount(),
                post.getCommentsCount(),
                post.getShareCount(),
                post.getCreatedAt().toString(),
                post.getLikesCount() >= 50,
                false
        );
    }

    /**
     * 获取帖子作者视图。
     */
    private PostAuthorView getPostAuthorView(Long authorId) {
        User author = userRepository.findById(authorId).orElse(null);
        String nickname = author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = author != null ? author.getAvatarUrl() : null;
        String campusName = userCampusProfileRepository.findByUserId(authorId)
                .map(UserCampusProfile::getCampusName)
                .orElse("");

        return new PostAuthorView(authorId, nickname, avatarUrl, campusName);
    }

    /**
     * 将 JSON 字符串解析为 List。
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