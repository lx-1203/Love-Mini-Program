package com.campuslove.api.village;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.ContentSecurityChecker;
import com.campuslove.api.config.ContentSecurityVerdict;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

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

    @Autowired(required = false)
    private PostMentionService postMentionService;
    private final SensitiveWordFilter sensitiveWordFilter;
    private final VillageQueryService queryService;

    /**
     * 统一内容安全检查器（微信 msgSecCheck v2 / 本地敏感词兜底，2026-10-05 合规接线）。
     * 字段注入（required=false）兼容旧测试构造器；为 null 时跳过统一检查，
     * 由下方 {@link SensitiveWordFilter} 兜底。checker 自身 fail-closed（异常降级本地过滤）。
     */
    @Autowired(required = false)
    private ContentSecurityChecker contentSecurityChecker;
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
     * 发帖落库段的显式事务边界（S2-1，2026-10-30）。
     *
     * <p>内容安全检查（微信 msgSecCheck v2）是外部 HTTP 调用，原先被方法级
     * {@code @Transactional} 圈在事务里：微信侧一慢，就长时间占住一条 Hikari 连接
     * 和帖子相关行锁，并发发帖会把连接池抽干，进而拖垮整个 API。现改成
     * 「校验 + 检查在事务外，落库在事务内」，边界由本模板划定。</p>
     *
     * <p>用编程式而不是声明式：同类自调用不经过代理，注解本来就不生效；
     * 而且只有把边界写成代码，测试才能证伪「外呼发生在事务内」。</p>
     */
    private final TransactionTemplate transactionTemplate;

    /**
     * 「挂起一切事务」模板（S2-1，2026-10-30）——内容安全外呼专用。
     *
     * <p>只把本方法改成编程式事务还不够：调用方仍可能带着外层事务进来。实测
     * {@code RealVillageService.createPost}（4 个重载）与
     * {@code AdminContentComposeController} 都是 {@code @Transactional} 的纯委托，
     * 于是发帖线程上早就有一个活动事务，本类里 {@code rejectIfRisky} 的微信 HTTP 调用
     * 照样跑在事务内——连接和行锁还是被占着，改造等于没发生。</p>
     *
     * <p>PROPAGATION_NOT_SUPPORTED 会让 Spring <b>挂起</b>当前事务（含其 EntityManager
     * 与连接），外呼返回后再恢复，因此「外呼不在事务内」由本类自己保证，不依赖任何调用方
     * 的注解写法。落库段仍用 {@link #transactionTemplate}（REQUIRED）：有外层事务就加入、
     * 没有就新建，原子性与改造前一致。</p>
     */
    private final TransactionTemplate suspendingTemplate;

    /**
     * 圈层归属回填（2026-10-14）：把发帖人的 {@code users.circle_path} 写进
     * {@code posts.owner_circle_path}，让<b>小程序新发的帖子</b>与后台圈层导航、
     * 审核作用域同源——此前该列只由一次性回填脚本和后台代发链路写入，
     * 于是新发帖一律落「未归属」，圈层树里看不到刚上传的内容。
     *
     * <p>可选注入：为 null 时行为与改动前逐字节一致（不回填），
     * 口径同仓内其它增量接线（如 AdminScopeService 的 nullable 注入）。</p>
     */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.campuslove.api.repository.UserRepository userRepository;

    /**
     * Spring 注入构造器（多个构造器时必须显式 @Autowired 指定，
     * 否则 Spring 报 "No default constructor found"）。
     *
     * <p>注入 {@link PlatformTransactionManager} 而不是 TransactionTemplate bean：
     * 前者只要开了事务管理就一定存在，后者依赖 Boot 的 TransactionAutoConfiguration，
     * 手工装配的容器里没有，会让 bean 创建直接失败（口径同 VipOrderService）。</p>
     */
    @Autowired
    public VillagePostService(PostRepository postRepository,
                              SensitiveWordFilter sensitiveWordFilter,
                              VillageQueryService queryService,
                              ActivityRepository activityRepository,
                              PostTagRepository postTagRepository,
                              CircleMembershipRepository circleMembershipRepository,
                              CampusCertificationRepository campusCertificationRepository,
                              PlatformTransactionManager transactionManager) {
        this.postRepository = postRepository;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.queryService = queryService;
        this.activityRepository = activityRepository;
        this.postTagRepository = postTagRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.campusCertificationRepository = campusCertificationRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.suspendingTemplate = new TransactionTemplate(transactionManager);
        this.suspendingTemplate.setPropagationBehavior(
                org.springframework.transaction.TransactionDefinition.PROPAGATION_NOT_SUPPORTED);
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
        this(postRepository, sensitiveWordFilter, queryService, null, null, null, null, noOpTxManager());
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
        this(postRepository, sensitiveWordFilter, queryService, activityRepository,
                null, null, null, noOpTxManager());
    }

    /**
     * 测试构造器用的「不开事务」事务管理器。
     *
     * <p>单测直接 new 本类时原本就不经过 Spring 代理，方法上的 {@code @Transactional}
     * 从来不生效；这里把同一事实显式化，使
     * {@code TransactionSynchronizationManager.isActualTransactionActive()} 仍为 false，
     * 不会让「外呼在事务外」这类判点在测试里假绿。</p>
     */
    private static PlatformTransactionManager noOpTxManager() {
        return new PlatformTransactionManager() {
            @Override
            public org.springframework.transaction.TransactionStatus getTransaction(
                    org.springframework.transaction.TransactionDefinition definition) {
                return new SimpleTransactionStatus();
            }

            @Override
            public void commit(org.springframework.transaction.TransactionStatus status) {
                // 无事务可提交
            }

            @Override
            public void rollback(org.springframework.transaction.TransactionStatus status) {
                // 无事务可回滚
            }
        };
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
    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public PostDetailView createPost(Long userId, String title, String content, List<String> images, List<String> tags,
                                     String category, Long activityId, String targetType, Long targetId) {
        return createPost(userId, title, content, images, tags, category, activityId, targetType, targetId, List.of());
    }

    @CacheEvict(cacheNames = CacheNames.VILLAGE_HOT_POSTS, allEntries = true)
    public PostDetailView createPost(Long userId, String title, String content, List<String> images, List<String> tags,
                                     String category, Long activityId, String targetType, Long targetId,
                                     List<Long> mentionedUserIds) {
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

        // 2026-10-05 合规接线：发布前统一内容安全检查（微信 msgSecCheck v2，scene=3 论坛），
        // 命中高风险（risky）直接拒绝发布；checker 异常时内部降级本地敏感词（fail-closed）。
        // S2-1（2026-10-30）：这里会外呼微信 API，因此必须在事务之外——
        // 放进事务会带着连接和行锁等一个外部调用；挪到 afterCommit 等于先发后审，合规失效。
        // 用 NOT_SUPPORTED 模板包一层：调用方（RealVillageService / 后台代发）即便带着
        // 外层事务进来，外呼期间那个事务也会被挂起。
        suspendingTemplate.executeWithoutResult(status -> {
            rejectIfRisky(title, userId, "3", "帖子标题");
            rejectIfRisky(content, userId, "3", "帖子内容");
        });

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
        // 圈层归属：与后台代发链路同源（AdminContentComposeController#resolveOwnerCirclePath
        // 读的是同一列 users.circle_path）；作者未归属任何圈层时保持 null，落「未归属」而不是丢帖。
        post.setOwnerCirclePath(authorCirclePath(userId));
        post.setCreatedAt(now);
        post.setUpdatedAt(now);

        // 缺陷修复：使用 saveAndFlush 立即回填 IDENTITY 主键，保证返回视图中的 id 非空
        // （原 save() 在事务提交时才生成主键，实体在构建视图时 getId() 仍为 null；
        //  实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id）
        //
        // S2-1（2026-10-30）事务边界：上面「校验 + 内容安全检查 + 敏感词过滤」全部在事务之外
        // （其中 msgSecCheck 要外呼微信 API），只有下面这段落库在一个短事务里原子提交。
        // 视图也在事务内构建：toPostDetailView 会触碰懒加载关联，出事务后再取会抛
        // LazyInitializationException。
        return transactionTemplate.execute(status -> {
            Post saved = postRepository.saveAndFlush(post);

            // 2026-10-28：@提及关系先落库；待审帖不提前发通知，审核通过后由 PostMentionService.notifyMentions 发送
            if (postMentionService != null) {
                postMentionService.saveMentions(saved.getId(), userId, mentionedUserIds);
            }

            // R4-00328：同步写入 post_tags 关联表——此前 post_tag 表无任何写入方，
            // 「按标签查帖子 / 热门话题」恒为空，标签功能断链。现发帖时按过滤后标签
            // 逐条写 PostTag（同一事务；唯一约束冲突（重复标签）仅记录日志不阻断发帖）。
            if (postTagRepository != null && !filteredTags.isEmpty()) {
                for (String tag : filteredTags) {
                    try {
                        postTagRepository.save(new PostTag(saved.getId(), tag));
                    } catch (org.springframework.dao.DataIntegrityViolationException e) {
                        logDuplicateTag(tag);
                    }
                }
            }

            return queryService.toPostDetailView(saved, userId);
        });
    }

    /** 2026-10-14 圈层归属回填：读发帖人自己的 users.circle_path。 */
    private String authorCirclePath(Long userId) {
        if (userRepository == null || userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .map(com.campuslove.api.entity.User::getCirclePath)
                .filter(p -> !p.isBlank())
                .map(String::trim)
                .orElse(null);
    }

    /** 标签唯一约束冲突日志（R4-00328：重复标签不阻断发帖）。 */
    private void logDuplicateTag(String tag) {
        log.warn("post_tags 写入冲突，跳过重复标签：tag={}", tag);
    }

    /**
     * 统一内容安全检查（2026-10-05 合规接线）：高风险（risky）内容直接拒绝。
     * review 判定放行但记录告警日志；checker 未注入（旧测试构造器）时跳过。
     *
     * @param content 待检文本
     * @param userId  发布者 ID
     * @param scene   msgSecCheck v2 场景（1=资料 2=评论 3=论坛 4=社交日志）
     * @param field   字段名（用于拒绝文案与日志）
     */
    private void rejectIfRisky(String content, Long userId, String scene, String field) {
        if (contentSecurityChecker == null || content == null || content.isBlank()) {
            return;
        }
        ContentSecurityVerdict verdict = contentSecurityChecker.check(content, userId, scene);
        if ("risky".equals(verdict.suggest())) {
            log.warn("内容安全检查命中高风险，拒绝发布: userId={}, scene={}, field={}, label={}, source={}",
                    userId, scene, field, verdict.label(), verdict.source());
            throw new IllegalArgumentException(field + "包含违规内容，请修改后重试");
        }
        if ("review".equals(verdict.suggest())) {
            log.warn("内容安全检查命中待复核（review），放行并记录: userId={}, scene={}, field={}, source={}",
                    userId, scene, field, verdict.source());
        }
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
