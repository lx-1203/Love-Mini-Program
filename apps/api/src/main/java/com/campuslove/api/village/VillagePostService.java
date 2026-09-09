package com.campuslove.api.village;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.Post.Visibility;
import com.campuslove.api.entity.PostTag;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostTagRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 村口帖子发布组件（Task 4.2.2 拆分）。
 *
 * <p>职责：处理帖子创建/更新/删除等写操作。不负责查询（由 {@link VillageQueryService}
 * 负责）和互动（点赞/评论/转发由 {@link VillageInteractionService} 负责）。</p>
 *
 * <p>提取自原 RealVillageService.createPost 方法。包含敏感词过滤、标签清洗、
 * 帖子初始化（计数清零、状态置为 active）等逻辑，并通过 @CacheEvict 主动失效热门列表缓存。</p>
 */
@Profile("real")
@Component
public class VillagePostService {

    private static final Logger log = LoggerFactory.getLogger(VillagePostService.class);

    /** 帖子标题最小长度（字）（R4-01840，2026-08-08 走查 P1：必填 5-30 字） */
    public static final int POST_TITLE_MIN_LENGTH = 5;

    /** 帖子标题最大长度（字）（R4-01840） */
    public static final int POST_TITLE_MAX_LENGTH = 30;


    private final PostRepository postRepository;
    private final SensitiveWordFilter sensitiveWordFilter;
    private final VillageQueryService queryService;
    /**
     * 2026-08-09 帖子关联活动：活动存在性校验（无效 activityId 宽松置 null，不抛错）。
     */
    private final ActivityRepository activityRepository;

    /**
     * 帖子标签 Repository（R4-00328：createPost 同步写 post_tags，修复「标签功能断链」）。
     * 可为 null（兼容旧测试构造器）：为 null 时跳过标签落库（posts.tags JSON 仍写入，
     * 仅标签聚合查询不可用）。
     */
    private final PostTagRepository postTagRepository;

    /**
     * 圈子成员 Repository（Batch B：圈子发帖成员校验）。
     * 可为 null（兼容旧测试构造器）：为 null 时跳过圈子成员校验。
     */
    private final CircleMembershipRepository circleMembershipRepository;

    /**
     * 校园认证 Repository（Batch B：校园可见帖子发帖校验）。
     * 可为 null（兼容旧测试构造器）：为 null 时跳过校园认证校验。
     */
    private final CampusCertificationRepository campusCertificationRepository;

    /**
     * Spring 注入构造器（多个构造器时必须显式 @Autowired 指定，
     * 否则 Spring 报 "No default constructor found"）。
     */
    @Autowired
    public VillagePostService(PostRepository postRepository,
                              SensitiveWordFilter sensitiveWordFilter,
                              VillageQueryService queryService,
                              ActivityRepository activityRepository,
                              PostTagRepository postTagRepository,
                              CircleMembershipRepository circleMembershipRepository,
                              CampusCertificationRepository campusCertificationRepository) {
        this.postRepository = postRepository;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.queryService = queryService;
        this.activityRepository = activityRepository;
        this.postTagRepository = postTagRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.campusCertificationRepository = campusCertificationRepository;
    }

    /**
     * 兼容旧测试的构造器（activityRepository 为 null，activityId 校验跳过、不落库）。
     *
     * @deprecated 仅单元测试使用；Spring 注入请使用带 ActivityRepository 的构造器。
     */
    @Deprecated
    public VillagePostService(PostRepository postRepository,
                              SensitiveWordFilter sensitiveWordFilter,
                              VillageQueryService queryService) {
        this(postRepository, sensitiveWordFilter, queryService, null, null, null, null);
    }

    /**
     * 兼容旧测试的构造器（postTagRepository 为 null，标签不落库）。
     *
     * @deprecated 仅单元测试使用；Spring 注入请使用带 PostTagRepository 的构造器。
     */
    @Deprecated
    public VillagePostService(PostRepository postRepository,
                              SensitiveWordFilter sensitiveWordFilter,
                              VillageQueryService queryService,
                              ActivityRepository activityRepository) {
        this(postRepository, sensitiveWordFilter, queryService, activityRepository, null, null, null);
    }

    /**
     * 创建新帖子。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>校验 userId 与 content（必填）</li>
     *   <li>敏感词过滤：对 content 与 tags 调用 {@link SensitiveWordFilter#filterWithLog} 过滤并记录日志</li>
     *   <li>可见范围推导：targetType general→public, campus→school, circle→interest</li>
     *   <li>可见范围校验：interest 需圈子成员身份，school 需校园认证</li>
     *   <li>初始化帖子实体：likesCount/commentsCount/shareCount 均置为 0，status=active</li>
     *   <li>持久化并通过 {@link VillageQueryService#toPostDetailView} 转换为视图（isAuthor=true）</li>
     *   <li>失效 VILLAGE_HOT_POSTS 缓存（allEntries=true）</li>
     * </ol>
     *
     * @param userId     作者用户 ID
     * @param title      帖子标题（2026-08-08 走查 P1：必填 5-30 字）
     * @param content    帖子正文
     * @param images     图片 URL 列表（可为 null）
     * @param tags       标签列表（可为 null，将进行敏感词过滤）
     * @param category   分类（可为 null，默认 PostCategory.all）
     * @param activityId 关联活动 ID（2026-08-09 可选；活动不存在时宽松置 null 不抛错）
     * @param targetType 统一发布目标类型：general | circle | campus（可为 null，默认 general）
     * @param targetId   统一发布目标 ID：circle/campus 时必填
     * @return 帖子详情视图（isAuthor=true）
     * @throws IllegalArgumentException 当 userId/content/title 为空或 title 长度不合法时
     * @throws OperationForbiddenException 当可见范围校验不通过时（非圈子成员发圈子帖/未认证发校园帖）
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public PostDetailView createPost(Long userId, String title, String content, List<String> images, List<String> tags, String category, Long activityId, String targetType, Long targetId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        // R4-01840：标题长度阈值收敛为常量，校验与错误文案共用（调整时同步改 ErrorMessages 文案）
        if (title == null || title.trim().length() < POST_TITLE_MIN_LENGTH
                || title.trim().length() > POST_TITLE_MAX_LENGTH) {
            throw new IllegalArgumentException(ErrorMessages.POST_TITLE_REQUIRED_LENGTH);
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        // Batch B：可见范围推导——从 targetType 映射为 Visibility 枚举
        Visibility visibility = deriveVisibility(targetType);
        Long circleId = null;

        // Batch B：可见范围校验
        if (visibility == Visibility.interest) {
            // 圈子发帖：targetId 必填 + 必须是该圈子成员
            if (targetId == null) {
                throw new IllegalArgumentException("圈子发帖时 targetId（圈子 ID）不能为空");
            }
            validateCircleMembership(userId, targetId);
            circleId = targetId;
        } else if (visibility == Visibility.school) {
            // 校园可见：发帖人必须通过校园认证
            validateSchoolCertification(userId);
        }

        String filteredTitle = sensitiveWordFilter.filterWithLog(title.trim(), userId, "POST");
        String filteredContent = sensitiveWordFilter.filterWithLog(content, userId, "POST");
        List<String> filteredTags = filterTagList(tags, userId);

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        Post post = new Post();
        post.setAuthorId(userId);
        post.setTitle(filteredTitle);
        post.setContent(filteredContent);
        post.setImages(queryService.toJsonString(images));
        post.setTags(queryService.toJsonString(filteredTags));
        // infra R2-00216: 非法分类值转 400（原实现 valueOf 未捕获直接 500）
        PostCategory postCategory;
        try {
            postCategory = category != null ? PostCategory.valueOf(category) : PostCategory.all;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(ErrorMessages.UNSUPPORTED_POST_CATEGORY_PREFIX + category
                    + ", 仅支持: " + java.util.Arrays.toString(PostCategory.values()));
        }
        post.setCategory(postCategory);
        // Batch B：设置可见范围与圈子 ID
        post.setVisibility(visibility);
        post.setCircleId(circleId);
        // 2026-08-09 帖子关联活动：activityId 无效（活动不存在）时宽松置 null，不抛错
        if (activityId != null && activityRepository != null && activityRepository.existsById(activityId)) {
            post.setActivityId(activityId);
        }
        post.setLikesCount(0);
        post.setCommentsCount(0);
        post.setShareCount(0);
        post.setStatus(PostStatus.active);
        // 2026-09-03 发帖审核制：新帖一律进入待审核（pending），由管理后台
        // （AdminVillagePostController POST /{id}/audit）审核通过后才在各 feed 可见；
        // 详情页对非作者隐藏待审帖（VillageQueryService.getPost）。
        post.setAuditStatus(Post.AuditStatus.pending);
        post.setCreatedAt(now);
        post.setUpdatedAt(now);

        // 缺陷修复：使用 saveAndFlush 立即回填 IDENTITY 主键，保证返回视图中的 id 非空
        // （原 save() 在事务提交时才生成主键，实体在构建视图时 getId() 仍为 null；
        //  实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id）
        post = postRepository.saveAndFlush(post);

        // R4-00328：同步写入 post_tags 关联表——此前 post_tag 表无任何写入方，
        // 「按标签查帖子 / 热门话题」恒为空，标签功能断链。现发帖时按过滤后标签
        // 逐条写 PostTag（同一事务；唯一约束冲突（重复标签）仅记录日志不阻断发帖）。
        if (postTagRepository != null && !filteredTags.isEmpty()) {
            for (String tag : filteredTags) {
                try {
                    postTagRepository.save(new PostTag(post.getId(), tag));
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    logDuplicateTag(tag);
                }
            }
        }

        return queryService.toPostDetailView(post, userId);
    }

    /** 标签唯一约束冲突日志（R4-00328：重复标签不阻断发帖）。 */
    private void logDuplicateTag(String tag) {
        log.warn("post_tags 写入冲突，跳过重复标签：tag={}", tag);
    }

    /**
     * 过滤标签列表中的敏感词。
     * 对每个标签进行敏感词过滤，移除空结果与空白字符串。
     *
     * @param tags   原始标签列表（可为 null）
     * @param userId 用户 ID（用于日志记录）
     * @return 过滤后的标签列表（不为 null）
     */
    private List<String> filterTagList(List<String> tags, Long userId) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        List<String> filtered = new ArrayList<>();
        for (String tag : tags) {
            String filteredTag = sensitiveWordFilter.filterWithLog(tag, userId, "POST_TAG");
            if (filteredTag != null && !filteredTag.isBlank()) {
                filtered.add(filteredTag);
            }
        }
        return filtered;
    }

    /**
     * 从 targetType 推导可见范围枚举。
     * <ul>
     *   <li>general (或 null/空) → public_</li>
     *   <li>campus → school</li>
     *   <li>circle → interest</li>
     * </ul>
     *
     * @param targetType 目标类型字符串
     * @return 对应的 Visibility 枚举值
     * @throws IllegalArgumentException 当 targetType 为非空但不合法时
     */
    private Visibility deriveVisibility(String targetType) {
        if (targetType == null || targetType.isBlank() || "general".equals(targetType)) {
            return Visibility.public_;
        }
        return switch (targetType) {
            case "campus" -> Visibility.school;
            case "circle" -> Visibility.interest;
            // R16（2026-09-07）：日常内容——仅互相喜欢（匹配）/关注作者的人可见
            case "friends", "daily" -> Visibility.friends;
            default -> throw new IllegalArgumentException(
                    "不支持的 targetType: " + targetType + "，仅支持: general/circle/campus/friends");
        };
    }

    /**
     * 校验用户是否为目标圈子的成员（Batch B：圈子发帖校验）。
     *
     * @param userId   用户 ID
     * @param circleId 圈子 ID
     * @throws OperationForbiddenException 用户未加入该圈子时（403）
     */
    private void validateCircleMembership(Long userId, Long circleId) {
        if (circleMembershipRepository == null) {
            // 兼容旧测试构造器（Repository 为 null 时跳过校验）
            return;
        }
        List<CircleMembership> memberships =
                circleMembershipRepository.findByUserIdAndCircleId(userId, circleId);
        if (memberships.isEmpty()) {
            throw new OperationForbiddenException(ErrorMessages.CIRCLE_JOIN_REQUIRED);
        }
    }

    /**
     * 校验用户是否通过校园认证（Batch B：校园可见帖子发帖校验）。
     *
     * @param userId 用户 ID
     * @throws OperationForbiddenException 用户未通过校园认证时（403）
     */
    private void validateSchoolCertification(Long userId) {
        if (campusCertificationRepository == null) {
            // 兼容旧测试构造器（Repository 为 null 时跳过校验）
            return;
        }
        Optional<CampusCertification> cert = campusCertificationRepository.findByUserId(userId);
        if (cert.isEmpty() || !"APPROVED".equals(cert.get().getStatus())) {
            throw new OperationForbiddenException(ErrorMessages.SCHOOL_CERT_REQUIRED_FOR_CAMPUS_POST);
        }
    }
}
