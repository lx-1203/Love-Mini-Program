package com.campuslove.api.discover;

import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.CircleReply;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleReplyRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.InterestCircleRepository;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
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

    /**
     * 构造函数，注入所有必要的 Repository 和工具类。
     *
     * @param interestCircleRepository 兴趣圈 Repository
     * @param circleMembershipRepository 圈子成员关系 Repository
     * @param circleTopicRepository     圈子话题 Repository
     * @param circleReplyRepository     圈子回复 Repository
     * @param userRepository            用户 Repository
     * @param objectMapper              JSON 序列化工具
     */
    public RealCircleService(
            InterestCircleRepository interestCircleRepository,
            CircleMembershipRepository circleMembershipRepository,
            CircleTopicRepository circleTopicRepository,
            CircleReplyRepository circleReplyRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.interestCircleRepository = interestCircleRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.circleReplyRepository = circleReplyRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
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
        final List<Long> finalJoinedCircleIds = joinedCircleIds;
        return circles.stream()
                .map(circle -> {
                    // 查询每个圈子的话题数量
                    long topicCount = circleTopicRepository.countByCircleId(circle.getId());
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
        membership.setJoinedAt(LocalDateTime.now());
        circleMembershipRepository.save(membership);

        // 更新圈子成员数
        circle.setMemberCount(circle.getMemberCount() + 1);
        interestCircleRepository.save(circle);

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

        // 删除所有匹配的成员关系（理论上只有一条，但做防御性处理）
        for (CircleMembership membership : memberships) {
            circleMembershipRepository.delete(membership);
        }

        // 更新圈子成员数，确保不低于 0
        int newCount = Math.max(0, circle.getMemberCount() - memberships.size());
        circle.setMemberCount(newCount);
        interestCircleRepository.save(circle);

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

        // 转换为视图对象
        List<CircleTopicView> views = topicPage.getContent().stream()
                .map(this::toTopicView)
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

        // 创建话题实体
        LocalDateTime now = LocalDateTime.now();
        CircleTopic topic = new CircleTopic();
        topic.setCircle(circle);
        topic.setAuthorId(authorId);
        topic.setTitle(title);
        topic.setContent(content);
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

        // 查找话题，不存在则抛出异常
        CircleTopic topic = findTopicOrThrow(topicId);

        // 创建回复实体
        LocalDateTime now = LocalDateTime.now();
        CircleReply reply = new CircleReply();
        reply.setTopic(topic);
        reply.setAuthorId(authorId);
        reply.setContent(content);
        reply.setCreatedAt(now);

        circleReplyRepository.save(reply);

        // 更新话题回复数
        topic.setReplyCount(topic.getReplyCount() + 1);
        circleTopicRepository.save(topic);

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

        // 转换为视图对象
        List<CircleReplyView> views = pageContent.stream()
                .map(this::toReplyView)
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

        // 转换为视图对象
        List<CircleTopicView> views = topicPage.getContent().stream()
                .map(this::toTopicView)
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
