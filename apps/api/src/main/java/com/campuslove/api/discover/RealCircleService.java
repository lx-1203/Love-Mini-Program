package com.campuslove.api.discover;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.CircleReply;
import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleReplyRepository;
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
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Objects;
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
import org.springframework.transaction.annotation.Transactional;

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
     * 构造函数，注入所有必要的 Repository 和工具类。
     *
     * @param interestCircleRepository 兴趣圈 Repository
     * @param circleMembershipRepository 圈子成员关系 Repository
     * @param circleTopicRepository     圈子话题 Repository
     * @param circleReplyRepository     圈子回复 Repository
     * @param userRepository            用户 Repository
     * @param objectMapper              JSON 序列化工具
     * @param interactionEventService   互动事件服务
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
            EntityManager entityManager) {
        this.interestCircleRepository = interestCircleRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.circleReplyRepository = circleReplyRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.interactionEventService = interactionEventService;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.entityManager = entityManager;
    }

    // ==================== 圈子列表 ====================

    /**
     * 获取所有兴趣圈列表，包含当前用户加入状态。
     * 按排序权重升序排列，同时查询当前用户的加入状态。
     *
     * @param userId 当前用户 ID（用于判断加入状态），可为 null
     * @return 圈子视图列表
     */
    @Override
    @Transactional(readOnly = true)
    public List<CircleView> getCircles(Long userId) {
        log.debug("获取兴趣圈列表, userId={}", userId);

        // 查询所有兴趣圈，按排序权重升序
        List<InterestCircle> circles = interestCircleRepository.findAllByOrderBySortOrderAsc();

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
                            (int) topicCount
                    );
                })
                .toList();
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
            throw new IllegalArgumentException("userId 不能为空");
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
            throw new IllegalArgumentException("userId 不能为空");
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
    @Transactional(readOnly = true)
    public Page<CircleTopicView> getTopics(Long circleId, Pageable pageable) {
        log.debug("获取圈子话题列表, circleId={}, page={}, size={}",
                circleId, pageable.getPageNumber(), pageable.getPageSize());

        // 验证圈子是否存在
        findCircleOrThrow(circleId);

        // 查询话题列表（置顶优先，时间倒序）
        Page<CircleTopic> topicPage = circleTopicRepository
                .findByCircleIdOrderByIsPinnedDescCreatedAtDesc(circleId, pageable);

        // 转换为视图对象（批量预加载作者，避免 N+1 查询）
        List<CircleTopic> topics = topicPage.getContent();
        Map<Long, User> authorMap = loadAuthorMap(
                topics.stream().map(CircleTopic::getAuthorId).toList());
        List<CircleTopicView> views = topics.stream()
                .map(t -> toTopicView(t, authorMap))
                .toList();

        return new PageImpl<>(views, pageable, topicPage.getTotalElements());
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
    @Transactional
    public CircleTopicView createTopic(Long circleId, Long authorId, String title, String content, List<String> images) {
        log.info("创建话题, circleId={}, authorId={}, title={}", circleId, authorId, title);

        if (authorId == null) {
            throw new IllegalArgumentException("authorId 不能为空");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("标题不能为空");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("内容不能为空");
        }

        // 验证圈子是否存在
        InterestCircle circle = findCircleOrThrow(circleId);

        // FIN-00039 修复：标题与内容做敏感词过滤（与 VillagePostService 用法一致），
        // 过滤策略为替换为 *** 而非拒绝发布，保证用户体验
        String filteredTitle = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(title, authorId, "CIRCLE_TOPIC")
                : title;
        String filteredContent = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(content, authorId, "CIRCLE_TOPIC")
                : content;

        // 创建话题实体
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        CircleTopic topic = new CircleTopic();
        topic.setCircle(circle);
        topic.setAuthorId(authorId);
        topic.setTitle(filteredTitle);
        topic.setContent(filteredContent);
        topic.setImages(toJsonString(images));
        topic.setReplyCount(0);
        topic.setIsPinned(false);
        topic.setCreatedAt(now);

        circleTopicRepository.save(topic);

        log.info("话题创建成功, topicId={}, circleId={}", topic.getId(), circleId);

        return toTopicView(topic);
    }

    /**
     * 获取话题详情（含完整内容，不做截断）。
     *
     * @param topicId 话题 ID
     * @return 话题视图（完整内容）
     * @throws IllegalArgumentException 话题不存在时抛出
     */
    @Override
    @Transactional(readOnly = true)
    public CircleTopicView getTopicDetail(Long topicId) {
        log.debug("获取话题详情, topicId={}", topicId);

        CircleTopic topic = findTopicOrThrow(topicId);

        // 详情页返回完整内容，不做截断
        return toTopicViewFullContent(topic);
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
    @Transactional
    public CircleReplyView replyToTopic(Long topicId, Long authorId, String content) {
        log.info("回复话题, topicId={}, authorId={}", topicId, authorId);

        if (authorId == null) {
            throw new IllegalArgumentException("authorId 不能为空");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("回复内容不能为空");
        }

        // infra R2-00234: 回复内容补敏感词过滤（createTopic 已有过滤，此前回复可绕过）
        String filteredContent = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(content, authorId, "CIRCLE_REPLY")
                : content;
        if (filteredContent == null || filteredContent.isBlank()) {
            throw new IllegalArgumentException("回复内容不能为空");
        }

        // 查找话题，不存在则抛出异常
        CircleTopic topic = findTopicOrThrow(topicId);

        // 创建回复实体
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        CircleReply reply = new CircleReply();
        reply.setTopic(topic);
        reply.setAuthorId(authorId);
        reply.setContent(filteredContent);
        reply.setCreatedAt(now);

        circleReplyRepository.save(reply);

        // 更新话题回复数
        topic.setReplyCount(topic.getReplyCount() + 1);
        circleTopicRepository.save(topic);

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

        // 查询所有回复（按创建时间倒序）
        List<CircleReply> allReplies = circleReplyRepository.findByTopicIdOrderByCreatedAtDesc(topicId);

        // 手动分页处理（Repository 返回 List 而非 Page）
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), allReplies.size());
        List<CircleReply> pageContent = start < allReplies.size()
                ? allReplies.subList(start, end)
                : List.of();

        // 转换为视图对象（批量预加载作者，避免 N+1 查询）
        Map<Long, User> authorMap = loadAuthorMap(
                pageContent.stream().map(CircleReply::getAuthorId).toList());
        List<CircleReplyView> views = pageContent.stream()
                .map(r -> toReplyView(r, authorMap))
                .toList();

        return new PageImpl<>(views, pageable, allReplies.size());
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
    @Transactional(readOnly = true)
    public Page<CircleTopicView> getFeaturedTopics(Pageable pageable) {
        log.debug("获取精选话题, page={}, size={}", pageable.getPageNumber(), pageable.getPageSize());

        // 构建带排序的分页请求：置顶优先，创建时间倒序
        Sort sort = Sort.by(Sort.Direction.DESC, "isPinned")
                .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);

        // 查询所有话题
        Page<CircleTopic> topicPage = circleTopicRepository.findAll(sortedPageable);

        // 转换为视图对象（批量预加载作者，避免 N+1 查询）
        List<CircleTopic> topics = topicPage.getContent();
        Map<Long, User> authorMap = loadAuthorMap(
                topics.stream().map(CircleTopic::getAuthorId).toList());
        List<CircleTopicView> views = topics.stream()
                .map(t -> toTopicView(t, authorMap))
                .toList();

        return new PageImpl<>(views, pageable, topicPage.getTotalElements());
    }

    // ==================== 私有辅助方法 ====================

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
                .orElseThrow(() -> new IllegalArgumentException("话题不存在: " + topicId));
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
     * 将 CircleTopic 实体转换为 CircleTopicView（内容做截断，用于列表展示，批量版本）。
     *
     * @param topic     话题实体
     * @param authorMap 批量预加载的作者 Map
     * @return 话题视图（内容预览）
     */
    private CircleTopicView toTopicView(CircleTopic topic, Map<Long, User> authorMap) {
        return new CircleTopicView(
                topic.getId(),
                topic.getCircle().getId(),
                topic.getCircle().getName(),
                topic.getAuthorId(),
                resolveAuthorName(topic.getAuthorId(), authorMap),
                topic.getTitle(),
                truncate(topic.getContent(), CONTENT_PREVIEW_MAX_LENGTH),
                parseJsonToList(topic.getImages()),
                topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                topic.getIsPinned() != null ? topic.getIsPinned() : false,
                topic.getCreatedAt()
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
        return new CircleTopicView(
                topic.getId(),
                topic.getCircle().getId(),
                topic.getCircle().getName(),
                topic.getAuthorId(),
                resolveAuthorName(topic.getAuthorId(), authorMap),
                topic.getTitle(),
                topic.getContent(),
                parseJsonToList(topic.getImages()),
                topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                topic.getIsPinned() != null ? topic.getIsPinned() : false,
                topic.getCreatedAt()
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
        return new CircleTopicView(
                topic.getId(),
                topic.getCircle().getId(),
                topic.getCircle().getName(),
                topic.getAuthorId(),
                getAuthorName(topic.getAuthorId()),
                topic.getTitle(),
                truncate(topic.getContent(), CONTENT_PREVIEW_MAX_LENGTH),
                parseJsonToList(topic.getImages()),
                topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                topic.getIsPinned() != null ? topic.getIsPinned() : false,
                topic.getCreatedAt()
        );
    }

    /**
     * 将 CircleTopic 实体转换为 CircleTopicView（完整内容，用于详情页）。
     *
     * @param topic 话题实体
     * @return 话题视图（完整内容）
     */
    private CircleTopicView toTopicViewFullContent(CircleTopic topic) {
        return new CircleTopicView(
                topic.getId(),
                topic.getCircle().getId(),
                topic.getCircle().getName(),
                topic.getAuthorId(),
                getAuthorName(topic.getAuthorId()),
                topic.getTitle(),
                topic.getContent(),
                parseJsonToList(topic.getImages()),
                topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                topic.getIsPinned() != null ? topic.getIsPinned() : false,
                topic.getCreatedAt()
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
