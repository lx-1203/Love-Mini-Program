package com.campuslove.api.discover;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.CircleReply;
import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.chat.NotificationService;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.ContentSecurityChecker;
import com.campuslove.api.config.ContentSecurityVerdict;
import com.campuslove.api.content.ContentMentionService;
import com.campuslove.api.entity.CircleAnnouncement;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.CircleTopicLikeNotice;
import com.campuslove.api.entity.ContentMention;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CircleAnnouncementRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleReplyRepository;
import com.campuslove.api.repository.CircleTopicLikeNoticeRepository;
import com.campuslove.api.repository.CircleTopicLikeRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.InterestCircleRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.growth.SocialProgressService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 真实兴趣圈服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 实现 CircleService 接口的所有方法，提供圈子列表、加入/退出、
 * 话题浏览与发布、回复浏览与发布等完整功能。
 */
@Profile("real")
@Service
public class RealCircleService implements CircleService {

    private static final Logger log = LoggerFactory.getLogger(RealCircleService.class);

    /** 内容预览最大长度 */
    private static final int CONTENT_PREVIEW_MAX_LENGTH = 80;

    private final InterestCircleRepository interestCircleRepository;
    private final CircleMembershipRepository circleMembershipRepository;
    private final CircleTopicRepository circleTopicRepository;
    private final CircleReplyRepository circleReplyRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final InteractionEventService interactionEventService;

    /**
     * 敏感词过滤器（FIN-00039 修复：createTopic 内容过滤，用法与 VillagePostService 一致）。
     */
    private final SensitiveWordFilter sensitiveWordFilter;

    /**
     * 统一内容安全检查器（微信 msgSecCheck v2 / 本地敏感词兜底，2026-10-05 合规接线）。
     * 字段注入（required=false）兼容既有单测构造器；为 null 时跳过统一检查，
     * 由 {@link SensitiveWordFilter} 兜底。checker 自身 fail-closed（异常降级本地过滤）。
     */
    @Autowired(required = false)
    private ContentSecurityChecker contentSecurityChecker;

    /** 话题点赞（2026-10-28）；单元测试未注入时点赞状态按未点赞处理。 */
    @Autowired(required = false)
    private CircleTopicLikeRepository circleTopicLikeRepository;

    /** 话题点赞通知去重（2026-10-28）。 */
    @Autowired(required = false)
    private CircleTopicLikeNoticeRepository circleTopicLikeNoticeRepository;

    /** 通知服务（话题点赞通知，2026-10-28）。 */
    @Autowired(required = false)
    private NotificationService notificationService;

    /** 内容 @ 提及（话题/回复，2026-10-28）。 */
    @Autowired(required = false)
    private ContentMentionService contentMentionService;

    /** 圈子公告（2026-10-28 表化）。 */
    @Autowired(required = false)
    private CircleAnnouncementRepository circleAnnouncementRepository;

    /**
     * JPA 实体管理器（FIN-00037/00038 修复）。
     *
     * <p>用于圈子话题数批量统计与成员数原子更新。</p>
     */
    private final EntityManager entityManager;

    /**
     * 社交升温漏斗服务（R4-00327：加入圈子埋点）。
     * real profile 注入；单元测试 / mock 场景为 null 时跳过埋点。
     * 采用字段注入（required=false）而非构造器参数，避免破坏既有单测构造器。
     */
    @Autowired(required = false)
    private SocialProgressService socialProgressService;

    /**
     * 话题/回复落库段的显式事务边界（S2-2，2026-10-30，口径同 VillagePostService）。
     *
     * <p>内容安全检查（微信 msgSecCheck v2）是外部 HTTP 调用，原先被方法级
     * {@code @Transactional} 圈在事务里：微信侧一慢，就长时间占住一条 Hikari 连接
     * 和 circle_topics / circle_replies 的行锁，并发发帖会把连接池抽干，
     * 进而拖垮整个 API。现改成「校验 + 检查在事务外，落库在事务内」，
     * 边界由本模板划定。</p>
     *
     * <p>用编程式而不是声明式：{@code createTopic} 的 5 参重载自调用 6 参重载、
     * {@code replyToTopic} 的 3 参重载自调用 4 参重载，同类自调用不经过代理，
     * 内层注解本来就不生效；而且只有把边界写成代码，测试才能证伪
     * 「外呼发生在事务内」。</p>
     */
    private final TransactionTemplate transactionTemplate;

    /**
     * 「挂起一切事务」模板（S2-2，2026-10-30）——内容安全外呼专用。
     *
     * <p>只把本方法改成编程式事务还不够：调用方仍可能带着外层事务进来
     * （本类的 {@code joinCircle}/{@code likeTopic} 等方法就是 {@code @Transactional} 的，
     * 任何后续把发布链路包进事务的调用方也一样）。内层用 REQUIRED 的话会直接
     * <b>加入</b>那个外层事务，{@code rejectIfRisky} 的微信 HTTP 调用照样跑在事务里——
     * 连接和行锁还是被占着，改造等于没发生。</p>
     *
     * <p>PROPAGATION_NOT_SUPPORTED 会让 Spring <b>挂起</b>当前事务（含其 EntityManager
     * 与连接），外呼返回后再恢复，因此「外呼不在事务内」由本类自己保证，不依赖任何调用方
     * 的注解写法。落库段仍用 {@link #transactionTemplate}（REQUIRED）：有外层事务就加入、
     * 没有就新建，原子性与改造前一致。</p>
     */
    private final TransactionTemplate suspendingTemplate;

    /**
     * 构造函数，注入所有必要的 Repository 和工具类。
     *
     * <p>注入 {@link PlatformTransactionManager} 而不是 TransactionTemplate bean：
     * 前者只要开了事务管理就一定存在，后者依赖 Boot 的 TransactionAutoConfiguration，
     * 手工装配的容器里没有，会让 bean 创建直接失败（口径同 VipOrderService、
     * VillagePostService）。</p>
     *
     * @param interestCircleRepository 兴趣圈 Repository
     * @param circleMembershipRepository 圈子成员关系 Repository
     * @param circleTopicRepository     圈子话题 Repository
     * @param circleReplyRepository     圈子回复 Repository
     * @param userRepository            用户 Repository
     * @param objectMapper              JSON 序列化工具
     * @param interactionEventService   互动事件服务
     * @param sensitiveWordFilter       敏感词过滤器
     * @param entityManager             JPA 实体管理器
     * @param transactionManager        事务管理器（划定落库段边界用）
     */
    public RealCircleService(
            InterestCircleRepository interestCircleRepository,
            CircleMembershipRepository circleMembershipRepository,
            CircleTopicRepository circleTopicRepository,
            CircleReplyRepository circleReplyRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper,
            InteractionEventService interactionEventService,
            SensitiveWordFilter sensitiveWordFilter,
            EntityManager entityManager,
            PlatformTransactionManager transactionManager) {
        this.interestCircleRepository = interestCircleRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.circleReplyRepository = circleReplyRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.interactionEventService = interactionEventService;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.entityManager = entityManager;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.suspendingTemplate = new TransactionTemplate(transactionManager);
        this.suspendingTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_NOT_SUPPORTED);
    }

    // ==================== 圈子列表 ====================

    /**
     * 获取兴趣圈列表，包含当前用户加入状态。
     * 按排序权重升序排列，同时查询当前用户的加入状态。
     *
     * @param userId   当前用户 ID（用于判断加入状态），可为 null
     * @param category 分类过滤（非 null 非空时仅返回该分类圈子；未分类圈子仅"全部"可见）
     * @return 圈子视图列表
     */
    @Override
    @Transactional(readOnly = true)
    public List<CircleView> getCircles(Long userId, String category) {
        log.debug("获取兴趣圈列表, userId={}, category={}", userId, category);

        // 查询所有兴趣圈，按排序权重升序
        List<InterestCircle> circles = interestCircleRepository.findAllByOrderBySortOrderAsc();
        // B4（2026-08-10）：按分类服务端过滤（null/空 = 全部，含未分类圈子）
        if (category != null && !category.isBlank()) {
            String trimmed = category.trim();
            circles = circles.stream()
                    .filter(c -> trimmed.equals(c.getCategory()))
                    .toList();
        }

        // 如果用户已登录，查询其已加入的圈子 ID 列表，用于标记加入状态
        List<Long> joinedCircleIds = List.of();
        if (userId != null) {
            joinedCircleIds = circleMembershipRepository.findByUserId(userId)
                    .stream()
                    .map(membership -> membership.getCircle().getId())
                    .toList();
        }

        // 转换为视图对象
        // FIN-00037 修复：原实现每圈子一次 countByCircleId（N+1），
        // 改为一次 GROUP BY 聚合查询批量统计话题数
        List<Long> circleIds = circles.stream().map(InterestCircle::getId).toList();
        Map<Long, Long> topicCountMap = countTopicsByCircleIds(circleIds);

        final List<Long> finalJoinedCircleIds = joinedCircleIds;
        return circles.stream()
                .map(circle -> {
                    long topicCount = topicCountMap.getOrDefault(circle.getId(), 0L);
                    return new CircleView(
                            circle.getId(),
                            circle.getName(),
                            circle.getIcon(),
                            circle.getDescription(),
                            circle.getMemberCount() != null ? circle.getMemberCount() : 0,
                            finalJoinedCircleIds.contains(circle.getId()),
                            (int) topicCount,
                            circle.getCategory(),
                            estimateFriendJoinedCount(circle.getMemberCount() != null ? circle.getMemberCount() : 0)
                    );
                })
                .toList();
    }

    /**
     * 估算"已加入好友数"（2026-08-21：视觉对齐参考图；后端暂无好友-圈子关系统计，
     * 按成员数的千分之一推算并限制在 [3, 99]，与前端回退逻辑一致）。
     */
    private static int estimateFriendJoinedCount(int memberCount) {
        if (memberCount <= 0) return 3;
        int v = (int) Math.round(memberCount / 1000.0);
        return Math.max(3, Math.min(99, v));
    }

    /**
     * 批量统计多个圈子的话题数（FIN-00037 修复，避免 N+1）。
     *
     * @param circleIds 圈子 ID 列表
     * @return circleId -> 话题数
     */
    private Map<Long, Long> countTopicsByCircleIds(List<Long> circleIds) {
        if (circleIds == null || circleIds.isEmpty()) {
            return Map.of();
        }
        if (entityManager == null) {
            // 兼容单元测试直接 new 构造器场景（测试不覆盖 getCircles 批量统计路径时）
            Map<Long, Long> fallback = new LinkedHashMap<>();
            for (Long circleId : circleIds) {
                fallback.put(circleId, circleTopicRepository.countByCircleId(circleId));
            }
            return fallback;
        }
        List<Object[]> rows = entityManager.createQuery(
                        "SELECT t.circle.id, COUNT(t) FROM CircleTopic t "
                                + "WHERE t.circle.id IN :circleIds GROUP BY t.circle.id",
                        Object[].class)
                .setParameter("circleIds", circleIds)
                .getResultList();
        Map<Long, Long> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] instanceof Number circleId
                    && row[1] instanceof Number count) {
                result.put(circleId.longValue(), count.longValue());
            }
        }
        return result;
    }

    // ==================== 加入/退出圈子 ====================

    /**
     * 加入圈子。
     * 创建 CircleMembership 记录，并更新圈子成员数。
     * 如果用户已加入该圈子，则直接返回当前状态，不重复创建。
     *
     * @param userId   用户 ID
     * @param circleId 圈子 ID
     * @return 圈子成员关系视图
     * @throws IllegalArgumentException 圈子不存在时抛出
     */
    @Override
    @Transactional
    public CircleMembershipView joinCircle(Long userId, Long circleId) {
        log.info("用户加入圈子, userId={}, circleId={}", userId, circleId);

        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }

        // 查找圈子，不存在则抛出异常
        InterestCircle circle = findCircleOrThrow(circleId);

        // 检查是否已加入，避免重复加入
        List<CircleMembership> existing = circleMembershipRepository.findByUserIdAndCircleId(userId, circleId);
        if (!existing.isEmpty()) {
            log.warn("用户已加入该圈子, userId={}, circleId={}", userId, circleId);
            return new CircleMembershipView(circleId, true, circle.getMemberCount());
        }

        // 创建成员关系记录
        CircleMembership membership = new CircleMembership();
        membership.setCircle(circle);
        membership.setUserId(userId);
        membership.setJoinedAt(LocalDateTime.now(TimeZones.BUSINESS));
        circleMembershipRepository.save(membership);

        // FIN-00038 修复：memberCount 改为数据库侧原子递增，消除并发加入时的丢失更新；
        // entityManager 为 null（单元测试直接 new）时回退实体读-改-写
        // infra R2-00015 修复：bulk UPDATE 后必须 clear 持久化上下文，否则 managed 实体
        // circle 在事务提交 flush 时用本地旧值覆盖 bulk 原子结果（脏写回归）
        if (entityManager != null) {
            entityManager.createQuery(
                            "UPDATE InterestCircle c SET c.memberCount = c.memberCount + 1 WHERE c.id = :circleId")
                    .setParameter("circleId", circleId)
                    .executeUpdate();
            entityManager.clear();
        }
        circle.setMemberCount(circle.getMemberCount() + 1);

        // R4-00327：社交升温漏斗埋点——参与社区（L5_CIRCLE 计数）；
        // 埋点失败不影响加入圈子主流程（仅记录日志）
        if (socialProgressService != null) {
            try {
                socialProgressService.recordCircleActivity(userId);
            } catch (RuntimeException e) {
                log.debug("社交升温埋点（circle）失败：userId={}, error={}", userId, e.getMessage());
            }
        }

        log.info("用户成功加入圈子, userId={}, circleId={}, 当前成员数={}",
                userId, circleId, circle.getMemberCount());

        return new CircleMembershipView(circleId, true, circle.getMemberCount());
    }

    /**
     * 退出圈子。
     * 删除 CircleMembership 记录，并更新圈子成员数。
     * 如果用户未加入该圈子，则直接返回当前状态。
     *
     * @param userId   用户 ID
     * @param circleId 圈子 ID
     * @return 圈子成员关系视图
     * @throws IllegalArgumentException 圈子不存在时抛出
     */
    @Override
    @Transactional
    public CircleMembershipView leaveCircle(Long userId, Long circleId) {
        log.info("用户退出圈子, userId={}, circleId={}", userId, circleId);

        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }

        // 查找圈子，不存在则抛出异常
        InterestCircle circle = findCircleOrThrow(circleId);

        // 查找并删除成员关系
        List<CircleMembership> memberships = circleMembershipRepository.findByUserIdAndCircleId(userId, circleId);
        if (memberships.isEmpty()) {
            log.warn("用户未加入该圈子, userId={}, circleId={}", userId, circleId);
            return new CircleMembershipView(circleId, false, circle.getMemberCount());
        }

        // infra R2-00265: 批量删除成员关系（原循环逐条 delete，小写放大）
        circleMembershipRepository.deleteAllInBatch(memberships);

        // FIN-00038 修复：memberCount 改为数据库侧原子递减（下限 0），
        // 消除并发退出时的丢失更新；entityManager 为 null（单元测试直接 new）时回退实体读-改-写
        // infra R2-00015 修复：bulk UPDATE 后 clear 持久化上下文，防止 managed 实体脏写覆盖
        int newCount = Math.max(0, circle.getMemberCount() - memberships.size());
        if (entityManager != null) {
            entityManager.createQuery(
                            "UPDATE InterestCircle c SET c.memberCount = CASE "
                                    + "WHEN c.memberCount > :delta THEN c.memberCount - :delta ELSE 0 END "
                                    + "WHERE c.id = :circleId")
                    .setParameter("delta", (long) memberships.size())
                    .setParameter("circleId", circleId)
                    .executeUpdate();
            entityManager.clear();
        }
        circle.setMemberCount(newCount);

        log.info("用户成功退出圈子, userId={}, circleId={}, 当前成员数={}",
                userId, circleId, newCount);

        return new CircleMembershipView(circleId, false, newCount);
    }

    // ==================== 话题 ====================

    /**
     * 获取指定圈子的话题列表（分页）。
     * 置顶话题优先，然后按创建时间倒序排列。
     *
     * @param circleId 圈子 ID
     * @param pageable 分页参数
     * @return 话题视图分页列表
     */
    @Override
    public Page<CircleTopicView> getTopics(Long circleId, Pageable pageable) {
        return getTopics(circleId, null, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CircleTopicView> getTopics(Long circleId, Long viewerId, Pageable pageable) {
        log.debug("获取圈子话题列表, circleId={}, viewerId={}, page={}, size={}",
                circleId, viewerId, pageable.getPageNumber(), pageable.getPageSize());

        // 验证圈子是否存在
        findCircleOrThrow(circleId);

        // 查询话题列表（置顶优先，时间倒序）
        Page<CircleTopic> topicPage = circleTopicRepository
                .findByCircleIdOrderByIsPinnedDescCreatedAtDesc(circleId, pageable);

        // 转换为视图对象（批量预加载作者，避免 N+1 查询）；
        // 审核链路：前台仅展示已审核通过（approved）的话题
        List<CircleTopic> topics = topicPage.getContent().stream()
                .filter(t -> t.getAuditStatus() == CircleTopic.AuditStatus.approved)
                .toList();
        Map<Long, User> authorMap = loadAuthorMap(
                topics.stream().map(CircleTopic::getAuthorId).toList());
        Set<Long> likedTopicIds = loadLikedTopicIds(viewerId, topics);
        List<CircleTopicView> views = topics.stream()
                .map(t -> toTopicView(t, authorMap, likedTopicIds.contains(t.getId())))
                .toList();

        return new PageImpl<>(views, pageable, views.size());
    }

    /**
     * 在指定圈子发布新话题。
     * 创建 CircleTopic 记录，图片列表序列化为 JSON 存储。
     *
     * @param circleId 圈子 ID
     * @param authorId 作者用户 ID
     * @param title    话题标题
     * @param content  话题内容
     * @param images   图片 URL 列表
     * @return 话题视图
     * @throws IllegalArgumentException 圈子不存在或参数不合法时抛出
     */
    @Override
    public CircleTopicView createTopic(Long circleId, Long authorId, String title, String content, List<String> images) {
        return createTopic(circleId, authorId, title, content, images, null);
    }

    @Override
    public CircleTopicView createTopic(Long circleId, Long authorId, String title, String content,
                                       List<String> images, List<Long> mentionedUserIds) {
        log.info("创建话题, circleId={}, authorId={}, title={}", circleId, authorId, title);

        if (authorId == null) {
            throw new IllegalArgumentException(ErrorMessages.AUTHOR_ID_REQUIRED);
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.TITLE_REQUIRED_CN);
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.CONTENT_REQUIRED_CN);
        }

        // S2-1（2026-10-30）授权先于外呼：圈子存在性 + 成员身份必须在任何外部调用之前判定。
        // 顺序有两个理由：①越权请求不该先惊动微信（也不该花掉一次外呼配额）；
        // ②错误优先级必须是 403 盖过 400，否则非成员提交敏感文本会收到"内容违规"，
        // 等于告诉调用方"你的内容被判了"而其实他连进这个圈子的资格都没有。
        // 这两次读都在事务之外执行（Repository 调用各自成事务），不持有任何锁。
        InterestCircle authorizedCircle = findCircleOrThrow(circleId);
        boolean isMember = authorizedCircle.getId() != null
                && !circleMembershipRepository
                        .findByUserIdAndCircleId(authorId, authorizedCircle.getId()).isEmpty();
        if (!isMember) {
            throw new OperationForbiddenException(ErrorMessages.CIRCLE_JOIN_REQUIRED);
        }

        // 2026-10-05 合规接线：发布前统一内容安全检查（微信 msgSecCheck v2，scene=3 论坛），
        // 命中高风险（risky）直接拒绝；checker 异常时内部降级本地敏感词（fail-closed）。
        // S2-1（2026-10-30）：这里会外呼微信 API，因此必须在事务之外——放进事务会带着连接
        // 和 circle_topics 行锁等一个外部调用；挪到 afterCommit 等于先发后审，合规失效。
        // 用 NOT_SUPPORTED 模板包一层：调用方即便带着外层事务进来，外呼期间那个事务也会被挂起。
        suspendingTemplate.executeWithoutResult(status -> {
            rejectIfRisky(title, authorId, "3", "话题标题");
            rejectIfRisky(content, authorId, "3", "话题内容");
        });

        // FIN-00039 修复：标题与内容做敏感词过滤（与 VillagePostService 用法一致），
        // 过滤策略为替换为 *** 而非拒绝发布，保证用户体验。纯内存，不涉及数据库。
        String filteredTitle = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(title, authorId, "CIRCLE_TOPIC")
                : title;
        String filteredContent = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(content, authorId, "CIRCLE_TOPIC")
                : content;
        String imagesJson = toJsonString(images);

        // S2-1（2026-10-30）事务边界：上面「参数校验 + 授权读 + 内容安全外呼 + 敏感词过滤」
        // 全在事务之外，只有下面这段「取托管圈子 + 落库 + 构建视图」在一个短事务里原子提交。
        // 读操作也要在这个 lambda 里做一次：出事务读到的实体是游离态，
        // topic.setCircle(circle) 与后续 save 的 merge 语义会变，且 toTopicView 触碰
        // LAZY 的 topic.circle 关联会抛 LazyInitializationException（视图构建同理必须在事务内）。
        return transactionTemplate.execute(status -> {
            // 授权已在外层判定完毕，这里只为拿到事务内的托管圈子实例
            InterestCircle circle = findCircleOrThrow(circleId);

            // 创建话题实体
            LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
            CircleTopic topic = new CircleTopic();
            topic.setCircle(circle);
            topic.setAuthorId(authorId);
            topic.setTitle(filteredTitle);
            topic.setContent(filteredContent);
            topic.setImages(imagesJson);
            topic.setReplyCount(0);
            topic.setIsPinned(false);
            // CircleTopic 审核链路：新建话题进入待审（pending），后台审核通过后前台才可见；
            // 本路径仅由 CircleController（用户发布）调用，不影响 admin 测试数据创建
            topic.setAuditStatus(CircleTopic.AuditStatus.pending);
            topic.setCreatedAt(now);

            // 实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id，
            // 否则 mentions 落库与响应里的 topicId 都是 null（2026-10-28 实测）
            topic = circleTopicRepository.save(topic);

            // 2026-10-28：话题 @提及先落关系，后台审核通过后再发通知（与帖子同模式）
            if (contentMentionService != null) {
                contentMentionService.saveMentions(
                        ContentMention.TARGET_TOPIC, topic.getId(), authorId, circleId, mentionedUserIds);
            }

            log.info("话题创建成功, topicId={}, circleId={}", topic.getId(), circleId);

            return toTopicView(topic);
        });
    }

    /**
     * 获取话题详情（含完整内容，不做截断）。
     *
     * @param topicId 话题 ID
     * @return 话题视图（完整内容）
     * @throws IllegalArgumentException 话题不存在时抛出
     */
    @Override
    public CircleTopicView getTopicDetail(Long topicId) {
        return getTopicDetail(topicId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public CircleTopicView getTopicDetail(Long topicId, Long viewerId) {
        log.debug("获取话题详情, topicId={}, viewerId={}", topicId, viewerId);

        CircleTopic topic = findTopicOrThrow(topicId);

        // 详情页返回完整内容，不做截断
        return toTopicViewFullContent(topic, isTopicLiked(viewerId, topicId));
    }

    // ==================== 回复 ====================

    /**
     * 回复话题。
     * 创建 CircleReply 记录，并更新话题的回复数。
     *
     * @param topicId  话题 ID
     * @param authorId 回复者用户 ID
     * @param content  回复内容
     * @return 回复视图
     * @throws IllegalArgumentException 话题不存在或参数不合法时抛出
     */
    @Override
    public CircleReplyView replyToTopic(Long topicId, Long authorId, String content) {
        return replyToTopic(topicId, authorId, content, null);
    }

    @Override
    public CircleReplyView replyToTopic(Long topicId, Long authorId, String content,
                                        List<Long> mentionedUserIds) {
        log.info("回复话题, topicId={}, authorId={}", topicId, authorId);

        if (authorId == null) {
            throw new IllegalArgumentException(ErrorMessages.AUTHOR_ID_REQUIRED);
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.REPLY_CONTENT_REQUIRED);
        }

        // 话题存在性先判定（事务外的只读查询）：不存在就不该惊动微信。
        // 事务内还会再读一次拿托管实例（口径同 createTopic）。
        findTopicOrThrow(topicId);

        // 2026-10-05 合规接线：回复前统一内容安全检查（msgSecCheck v2，scene=2 评论），命中即拒绝
        // S2-1（2026-10-30）：同 createTopic——外呼微信 API 必须在事务之外，
        // 并且用 NOT_SUPPORTED 挂起调用方可能带着的外层事务，保证「回复内容检查不在事务里」
        // 由本类自己兜住，而不是依赖调用方的注解写法。
        suspendingTemplate.executeWithoutResult(status ->
                rejectIfRisky(content, authorId, "2", "回复内容"));

        // infra R2-00234: 回复内容补敏感词过滤（createTopic 已有过滤，此前回复可绕过）
        // 纯内存操作，仍在事务之外。
        String filteredContent = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(content, authorId, "CIRCLE_REPLY")
                : content;
        if (filteredContent == null || filteredContent.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.REPLY_CONTENT_REQUIRED);
        }

        // S2-1（2026-10-30）事务边界：只有「查话题 + 落回复 + 更新回复数 + 提及/互动事件 +
        // 构建视图」这段在一个短事务里原子提交。
        // findTopicOrThrow 必须在事务内：出事务读到的 topic 是游离态，reply.setTopic(topic)
        // 与 save 的 merge 语义会变，topic.getReplyCount() 的读改写也可能落到旧值上，
        // 且 toReplyView 触碰 LAZY 的 reply.topic（以及 topic.circle）会抛
        // LazyInitializationException。
        return transactionTemplate.execute(status -> {
            // 查找话题，不存在则抛出异常
            CircleTopic topic = findTopicOrThrow(topicId);

            // 创建回复实体
            LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
            CircleReply reply = new CircleReply();
            reply.setTopic(topic);
            reply.setAuthorId(authorId);
            reply.setContent(filteredContent);
            reply.setCreatedAt(now);

            // 实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id
            reply = circleReplyRepository.save(reply);

            // 更新话题回复数
            topic.setReplyCount(topic.getReplyCount() + 1);
            topic = circleTopicRepository.save(topic);

            // 2026-10-28：回复 @提及（回复无审核，创建即通知；引用 topicId 保证客户端可打开话题详情）
            if (contentMentionService != null) {
                contentMentionService.saveMentions(
                        ContentMention.TARGET_REPLY, reply.getId(), authorId,
                        topic.getCircle() != null ? topic.getCircle().getId() : null, mentionedUserIds);
                contentMentionService.notifyMentions(
                        ContentMention.TARGET_REPLY, reply.getId(), authorId, "comment", topicId);
            }

            // 记录互动事件：通知话题作者有人回复
            if (!authorId.equals(topic.getAuthorId())) {
                interactionEventService.recordEvent(
                        topic.getAuthorId(), authorId, "TOPIC_REPLIED", topicId, "TOPIC",
                        "有人回复了你的话题"
                );
            }

            log.info("回复创建成功, replyId={}, topicId={}, 当前回复数={}",
                    reply.getId(), topicId, topic.getReplyCount());

            return toReplyView(reply);
        });
    }

    /**
     * 获取指定话题的回复列表（分页）。
     * 按创建时间倒序排列。
     *
     * @param topicId  话题 ID
     * @param pageable 分页参数
     * @return 回复视图分页列表
     */
    @Override
    @Transactional(readOnly = true)
    public Page<CircleReplyView> getReplies(Long topicId, Pageable pageable) {
        log.debug("获取话题回复列表, topicId={}, page={}, size={}",
                topicId, pageable.getPageNumber(), pageable.getPageSize());

        // 验证话题是否存在
        findTopicOrThrow(topicId);

        // R4-00352：SQL 侧分页（替代原全量加载 findByTopicIdOrderByCreatedAtDesc
        // 后内存分页——高回复话题下内存占用随回复数线性增长）
        Page<CircleReply> replyPage = circleReplyRepository
                .findByTopicIdOrderByCreatedAtDesc(topicId, pageable);

        // 转换为视图对象（批量预加载作者，避免 N+1 查询）
        Map<Long, User> authorMap = loadAuthorMap(
                replyPage.getContent().stream().map(CircleReply::getAuthorId).toList());
        List<CircleReplyView> views = replyPage.getContent().stream()
                .map(r -> toReplyView(r, authorMap))
                .toList();

        return new PageImpl<>(views, pageable, replyPage.getTotalElements());
    }

    // ==================== 精选话题 ====================

    /**
     * 获取所有圈子的精选话题（用于村口"兴趣"分类）。
     * 置顶优先，然后按创建时间倒序排列。
     *
     * @param pageable 分页参数
     * @return 话题视图分页列表
     */
    @Override
    public Page<CircleTopicView> getFeaturedTopics(Pageable pageable) {
        return getFeaturedTopics(null, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CircleTopicView> getFeaturedTopics(Long viewerId, Pageable pageable) {
        log.debug("获取精选话题, viewerId={}, page={}, size={}",
                viewerId, pageable.getPageNumber(), pageable.getPageSize());

        // 构建带排序的分页请求：置顶优先，创建时间倒序
        Sort sort = Sort.by(Sort.Direction.DESC, "isPinned")
                .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);

        // 查询所有话题
        Page<CircleTopic> topicPage = circleTopicRepository.findAll(sortedPageable);

        // 转换为视图对象（批量预加载作者，避免 N+1 查询）；
        // 审核链路：前台精选话题仅展示已审核通过（approved）的话题
        List<CircleTopic> topics = topicPage.getContent().stream()
                .filter(t -> t.getAuditStatus() == CircleTopic.AuditStatus.approved)
                .toList();
        Map<Long, User> authorMap = loadAuthorMap(
                topics.stream().map(CircleTopic::getAuthorId).toList());
        Set<Long> likedTopicIds = loadLikedTopicIds(viewerId, topics);
        List<CircleTopicView> views = topics.stream()
                .map(t -> toTopicView(t, authorMap, likedTopicIds.contains(t.getId())))
                .toList();

        return new PageImpl<>(views, pageable, views.size());
    }

    @Override
    @Transactional(readOnly = true)
    public CircleMetaView getCircleMeta(Long circleId) {
        InterestCircle circle = findCircleOrThrow(circleId);
        List<CircleAnnouncementView> announcements = loadPublishedAnnouncements(circleId, 3);
        String pinned = announcements.stream()
                .filter(CircleAnnouncementView::isPinned)
                .map(CircleAnnouncementView::content)
                .findFirst()
                .orElseGet(() -> announcements.isEmpty() ? circle.getAnnouncement() : announcements.get(0).content());
        return new CircleMetaView(circleId, splitTags(circle.getTags()), pinned, announcements);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CircleAnnouncementView> getAnnouncements(Long circleId, int limit) {
        findCircleOrThrow(circleId);
        return loadPublishedAnnouncements(circleId, Math.max(1, Math.min(20, limit)));
    }

    private List<CircleAnnouncementView> loadPublishedAnnouncements(Long circleId, int limit) {
        if (circleAnnouncementRepository == null) {
            return List.of();
        }
        return circleAnnouncementRepository
                .findByCircleIdAndStatusOrderByIsPinnedDescPublishedAtDesc(
                        circleId, CircleAnnouncement.Status.published, PageRequest.of(0, limit))
                .stream()
                .map(a -> new CircleAnnouncementView(
                        a.getId(), a.getTitle(), a.getContent(),
                        Boolean.TRUE.equals(a.getIsPinned()), a.getPublishedAt()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CircleMentionCandidateView> getMentionCandidates(Long circleId, Long viewerId,
                                                                 String keyword, int limit) {
        findCircleOrThrow(circleId);
        // 仅圈成员可取候选，避免把圈成员名单暴露给任意登录用户（2026-10-28）
        if (viewerId == null
                || circleMembershipRepository.findByUserIdAndCircleId(viewerId, circleId).isEmpty()) {
            return List.of();
        }
        int safeLimit = Math.max(1, Math.min(100, limit));
        List<Long> memberIds = circleMembershipRepository.findUserIdsByCircleId(circleId).stream()
                .filter(id -> viewerId == null || !viewerId.equals(id))
                .toList();
        if (memberIds.isEmpty()) {
            return List.of();
        }
        String normalized = keyword == null ? "" : keyword.trim().toLowerCase(java.util.Locale.ROOT);
        return userRepository.findAllById(memberIds).stream()
                .filter(u -> normalized.isEmpty()
                        || (u.getNickname() != null
                        && u.getNickname().toLowerCase(java.util.Locale.ROOT).contains(normalized)))
                .limit(safeLimit)
                .map(u -> new CircleMentionCandidateView(u.getId(), resolveAuthorName(u), resolveAuthorAvatar(u)))
                .toList();
    }

    @Override
    @Transactional
    public TopicLikeView likeTopic(Long topicId, Long userId) {
        CircleTopic topic = findTopicOrThrow(topicId);
        if (circleTopicLikeRepository == null) {
            throw new IllegalStateException("circle topic like repository unavailable");
        }
        boolean created = false;
        if (!circleTopicLikeRepository.existsByTopicIdAndUserId(topicId, userId)) {
            com.campuslove.api.entity.CircleTopicLike like = new com.campuslove.api.entity.CircleTopicLike();
            like.setTopicId(topicId);
            like.setUserId(userId);
            like.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
            circleTopicLikeRepository.save(like);
            circleTopicRepository.incrementLikeCount(topicId);
            created = true;
        }
        if (created) {
            notifyTopicLike(topic, userId);
        }
        Integer count = circleTopicRepository.findLikeCountById(topicId);
        return new TopicLikeView(topicId, true, count == null ? 0 : count);
    }

    /**
     * 话题被首次点赞时通知作者（2026-10-28）。
     * 去重表与点赞关系解耦：取消再赞不重复通知；自己赞自己跳过；通知失败不回滚点赞。
     */
    private void notifyTopicLike(CircleTopic topic, Long likerId) {
        if (notificationService == null || topic.getAuthorId() == null
                || topic.getAuthorId().equals(likerId)) {
            return;
        }
        if (circleTopicLikeNoticeRepository == null) {
            return;
        }
        if (circleTopicLikeNoticeRepository.existsByTopicIdAndUserId(topic.getId(), likerId)) {
            return;
        }
        try {
            CircleTopicLikeNotice notice = new CircleTopicLikeNotice();
            notice.setTopicId(topic.getId());
            notice.setUserId(likerId);
            notice.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
            circleTopicLikeNoticeRepository.save(notice);
            notificationService.createNotification(
                    topic.getAuthorId(), "topic_like", likerId, topic.getId(), "topic");
        } catch (RuntimeException e) {
            log.warn("发送话题点赞通知失败 topicId={} likerId={}: {}", topic.getId(), likerId, e.toString());
        }
    }

    @Override
    @Transactional
    public TopicLikeView unlikeTopic(Long topicId, Long userId) {
        findTopicOrThrow(topicId);
        if (circleTopicLikeRepository == null) {
            throw new IllegalStateException("circle topic like repository unavailable");
        }
        long removed = circleTopicLikeRepository.deleteByTopicIdAndUserId(topicId, userId);
        if (removed > 0) {
            circleTopicRepository.decrementLikeCount(topicId);
        }
        Integer count = circleTopicRepository.findLikeCountById(topicId);
        return new TopicLikeView(topicId, false, count == null ? 0 : count);
    }

    private Set<Long> loadLikedTopicIds(Long viewerId, List<CircleTopic> topics) {
        if (circleTopicLikeRepository == null || viewerId == null || topics.isEmpty()) {
            return Collections.emptySet();
        }
        List<Long> topicIds = topics.stream().map(CircleTopic::getId).toList();
        return new HashSet<>(circleTopicLikeRepository.findTopicIdsByUserIdAndTopicIdIn(viewerId, topicIds));
    }

    private boolean isTopicLiked(Long viewerId, Long topicId) {
        return circleTopicLikeRepository != null && viewerId != null
                && circleTopicLikeRepository.existsByTopicIdAndUserId(topicId, viewerId);
    }

    private List<String> splitTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }
        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isEmpty())
                .toList();
    }

    // ==================== 私有辅助方法 ====================

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
     * 查找圈子，不存在则抛出异常。
     *
     * @param circleId 圈子 ID
     * @return 兴趣圈实体
     * @throws IllegalArgumentException 圈子不存在时抛出
     */
    private InterestCircle findCircleOrThrow(Long circleId) {
        return interestCircleRepository.findById(circleId)
                .orElseThrow(() -> new IllegalArgumentException("圈子不存在: " + circleId));
    }

    /**
     * 查找话题，不存在则抛出异常。
     *
     * @param topicId 话题 ID
     * @return 话题实体
     * @throws IllegalArgumentException 话题不存在时抛出
     */
    private CircleTopic findTopicOrThrow(Long topicId) {
        return circleTopicRepository.findById(topicId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.TOPIC_NOT_FOUND_PREFIX + topicId));
    }

    /**
     * 根据用户 ID 获取用户昵称。
     * 如果用户不存在，返回默认昵称"未知用户"。
     *
     * @param userId 用户 ID
     * @return 用户昵称
     */
    private String getAuthorName(Long userId) {
        if (userId == null) {
            return DisplayConstants.UNKNOWN_USER;
        }
        return userRepository.findById(userId)
                .map(User::getNickname)
                .filter(name -> name != null && !name.isBlank())
                .orElse(DisplayConstants.UNKNOWN_USER);
    }

    /**
     * 批量加载作者用户 Map（userId → User），避免列表转换逐条查库（N+1）。
     *
     * @param userIds 作者 ID 列表（可含 null/重复）
     * @return 用户映射，空列表返回空 Map
     */
    private Map<Long, User> loadAuthorMap(List<Long> userIds) {
        List<Long> distinct = userIds.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findByIdIn(distinct).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
    }

    /**
     * 从作者 Map 中解析用户昵称，避免逐条查库。
     *
     * @param userId    用户 ID
     * @param authorMap 批量预加载的作者 Map
     * @return 用户昵称，未知用户返回默认昵称
     */
    private String resolveAuthorName(Long userId, Map<Long, User> authorMap) {
        if (userId == null) {
            return DisplayConstants.UNKNOWN_USER;
        }
        User author = authorMap.get(userId);
        if (author == null) {
            return DisplayConstants.UNKNOWN_USER;
        }
        String nickname = author.getNickname();
        return nickname != null && !nickname.isBlank() ? nickname : DisplayConstants.UNKNOWN_USER;
    }

    /**
     * 从作者 Map 中解析用户头像（users.avatar_url 原值，客户端负责媒体解析）。
     * MP-R1-CIRCLE-001（2026-09-12）：话题 feed 作者头像此前无法到达前端，
     * 页面只能绑死默认头像。
     *
     * @param userId    用户 ID
     * @param authorMap 批量预加载的作者 Map
     * @return 头像 URL；无则空串（前端回退默认头像）
     */
    private String resolveAuthorAvatar(Long userId, Map<Long, User> authorMap) {
        if (userId == null) {
            return "";
        }
        User author = authorMap.get(userId);
        return author != null && author.getAvatarUrl() != null ? author.getAvatarUrl() : "";
    }

    /**
     * 单条版本：根据用户 ID 获取用户头像。
     *
     * @param userId 用户 ID
     * @return 头像 URL；无则空串
     */
    /** 单条版本：用户昵称（提及候选）。 */
    private String resolveAuthorName(User user) {
        if (user == null || user.getNickname() == null || user.getNickname().isBlank()) {
            return DisplayConstants.UNKNOWN_USER;
        }
        return user.getNickname();
    }

    /** 单条版本：用户头像（提及候选）。 */
    private String resolveAuthorAvatar(User user) {
        return user != null && user.getAvatarUrl() != null ? user.getAvatarUrl() : "";
    }

    private String getAuthorAvatar(Long userId) {
        if (userId == null) {
            return "";
        }
        return userRepository.findById(userId)                .map(User::getAvatarUrl)
                .orElse("");
    }

    /**
     * 将 CircleTopic 实体转换为 CircleTopicView（内容做截断，用于列表展示，批量版本）。
     *
     * @param topic     话题实体
     * @param authorMap 批量预加载的作者 Map
     * @return 话题视图（内容预览）
     */
    private CircleTopicView toTopicView(CircleTopic topic, Map<Long, User> authorMap) {
        return toTopicView(topic, authorMap, false);
    }

    private CircleTopicView toTopicView(CircleTopic topic, Map<Long, User> authorMap, boolean liked) {
        return new CircleTopicView(
                topic.getId(),
                topic.getCircle().getId(),
                topic.getCircle().getName(),
                topic.getAuthorId(),
                resolveAuthorName(topic.getAuthorId(), authorMap),
                resolveAuthorAvatar(topic.getAuthorId(), authorMap),
                topic.getTitle(),
                truncate(topic.getContent(), CONTENT_PREVIEW_MAX_LENGTH),
                parseJsonToList(topic.getImages()),
                topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                topic.getIsPinned() != null ? topic.getIsPinned() : false,
                topic.getCreatedAt(),
                topic.getLikeCount() != null ? topic.getLikeCount() : 0,
                liked
        );
    }

    /**
     * 将 CircleTopic 实体转换为 CircleTopicView（完整内容，用于详情页，批量版本）。
     *
     * @param topic     话题实体
     * @param authorMap 批量预加载的作者 Map
     * @return 话题视图（完整内容）
     */
    private CircleTopicView toTopicViewFullContent(CircleTopic topic, Map<Long, User> authorMap) {
        return toTopicViewFullContent(topic, authorMap, false);
    }

    private CircleTopicView toTopicViewFullContent(CircleTopic topic, Map<Long, User> authorMap, boolean liked) {
        return new CircleTopicView(
                topic.getId(),
                topic.getCircle().getId(),
                topic.getCircle().getName(),
                topic.getAuthorId(),
                resolveAuthorName(topic.getAuthorId(), authorMap),
                resolveAuthorAvatar(topic.getAuthorId(), authorMap),
                topic.getTitle(),
                topic.getContent(),
                parseJsonToList(topic.getImages()),
                topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                topic.getIsPinned() != null ? topic.getIsPinned() : false,
                topic.getCreatedAt(),
                topic.getLikeCount() != null ? topic.getLikeCount() : 0,
                liked
        );
    }

    /**
     * 将 CircleReply 实体转换为 CircleReplyView（批量版本）。
     *
     * @param reply     回复实体
     * @param authorMap 批量预加载的作者 Map
     * @return 回复视图
     */
    private CircleReplyView toReplyView(CircleReply reply, Map<Long, User> authorMap) {
        return new CircleReplyView(
                reply.getId(),
                reply.getTopic().getId(),
                reply.getAuthorId(),
                resolveAuthorName(reply.getAuthorId(), authorMap),
                resolveAuthorAvatar(reply.getAuthorId(), authorMap),
                reply.getContent(),
                reply.getCreatedAt()
        );
    }

    /**
     * 将 CircleTopic 实体转换为 CircleTopicView（内容做截断，用于列表展示）。
     *
     * @param topic 话题实体
     * @return 话题视图（内容预览）
     */
    private CircleTopicView toTopicView(CircleTopic topic) {
        return toTopicView(topic, false);
    }

    private CircleTopicView toTopicView(CircleTopic topic, boolean liked) {
        return new CircleTopicView(
                topic.getId(),
                topic.getCircle().getId(),
                topic.getCircle().getName(),
                topic.getAuthorId(),
                getAuthorName(topic.getAuthorId()),
                getAuthorAvatar(topic.getAuthorId()),
                topic.getTitle(),
                truncate(topic.getContent(), CONTENT_PREVIEW_MAX_LENGTH),
                parseJsonToList(topic.getImages()),
                topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                topic.getIsPinned() != null ? topic.getIsPinned() : false,
                topic.getCreatedAt(),
                topic.getLikeCount() != null ? topic.getLikeCount() : 0,
                liked
        );
    }

    /**
     * 将 CircleTopic 实体转换为 CircleTopicView（完整内容，用于详情页）。
     *
     * @param topic 话题实体
     * @return 话题视图（完整内容）
     */
    private CircleTopicView toTopicViewFullContent(CircleTopic topic) {
        return toTopicViewFullContent(topic, false);
    }

    private CircleTopicView toTopicViewFullContent(CircleTopic topic, boolean liked) {
        return new CircleTopicView(
                topic.getId(),
                topic.getCircle().getId(),
                topic.getCircle().getName(),
                topic.getAuthorId(),
                getAuthorName(topic.getAuthorId()),
                getAuthorAvatar(topic.getAuthorId()),
                topic.getTitle(),
                topic.getContent(),
                parseJsonToList(topic.getImages()),
                topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                topic.getIsPinned() != null ? topic.getIsPinned() : false,
                topic.getCreatedAt(),
                topic.getLikeCount() != null ? topic.getLikeCount() : 0,
                liked
        );
    }

    /**
     * 将 CircleReply 实体转换为 CircleReplyView。
     *
     * @param reply 回复实体
     * @return 回复视图
     */
    private CircleReplyView toReplyView(CircleReply reply) {
        return new CircleReplyView(
                reply.getId(),
                reply.getTopic().getId(),
                reply.getAuthorId(),
                getAuthorName(reply.getAuthorId()),
                getAuthorAvatar(reply.getAuthorId()),
                reply.getContent(),
                reply.getCreatedAt()
        );
    }

    /**
     * 将 JSON 字符串解析为 List。
     * 如果 JSON 为空或解析失败，返回空列表。
     *
     * @param json JSON 字符串
     * @return 字符串列表
     */
    private List<String> parseJsonToList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            log.warn("JSON 解析失败: {}", json, e);
            return List.of();
        }
    }

    /**
     * 将 List 序列化为 JSON 字符串。
     * 如果列表为空或序列化失败，返回 null。
     *
     * @param list 字符串列表
     * @return JSON 字符串
     */
    private String toJsonString(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.warn("JSON 序列化失败: {}", list, e);
            return null;
        }
    }

    /**
     * 截断字符串，超出部分用省略号替代。
     *
     * @param text   原始文本
     * @param maxLen 最大长度
     * @return 截断后的文本
     */
    private static String truncate(String text, int maxLen) {
        if (text == null) {
            return null;
        }
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
