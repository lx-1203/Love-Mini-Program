package com.campuslove.api.feedback;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Feedback;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.FeedbackRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.NoSuchElementException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 真实反馈服务实现。
 * 在 real profile 下激活，使用 FeedbackRepository 实现数据库持久化。
 *
 * 功能9：新增 uploadImage 方法，复用 MediaStorageService 上传图片附件。
 * 功能10：新增 getSubmissionDetail 方法，查询反馈详情（含 content/attachments/latestReplyContent）。
 */
@Profile("real")
@Service
public class RealFeedbackService implements FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(RealFeedbackService.class);
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** 附件 JSON 数组反序列化的 TypeReference */
    private static final TypeReference<List<String>> ATTACHMENTS_TYPE_REF = new TypeReference<>() {};

    /**
     * 功能9：反馈图片大小上限（5MB）。
     *
     * <p>注意：MediaStorageService 默认图片上限为 10MB，
     * 功能9业务规则要求单张 ≤5MB，此处额外校验。
     * R4-01850：上限收敛为 {@link FeedbackService#FEEDBACK_IMAGE_MAX_BYTES} 共享常量，
     * 与 Mock 实现共用，改限时只改一处。</p>
     */
    private static final long FEEDBACK_IMAGE_MAX_BYTES = FeedbackService.FEEDBACK_IMAGE_MAX_BYTES;

    private final FeedbackRepository feedbackRepository;
    private final ObjectMapper objectMapper;

    /** 功能9：媒体存储服务，复用其上传/校验逻辑 */
    private final MediaStorageService mediaStorageService;

    /** R4-00342：活动仓库——提案转活动时真实创建 Activity 记录 */
    private final ActivityRepository activityRepository;

    public RealFeedbackService(FeedbackRepository feedbackRepository,
                               ObjectMapper objectMapper,
                               MediaStorageService mediaStorageService,
                               ActivityRepository activityRepository) {
        this.feedbackRepository = feedbackRepository;
        this.objectMapper = objectMapper;
        this.mediaStorageService = mediaStorageService;
        this.activityRepository = activityRepository;
    }

    /**
     * 提交反馈。
     * 创建 Feedback 记录并保存到数据库，返回提交记录视图。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     *
     * @param type    反馈类型
     * @param request 反馈提交请求
     * @return 提交记录视图
     */
    @Override
    @Transactional
    public SubmissionRecordView submit(FeedbackTicketType type, FeedbackSubmissionRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

        Feedback feedback = new Feedback();
        feedback.setUserId(currentUserId);
        feedback.setType(type);
        feedback.setTitle(request.title());
        feedback.setContent(request.content());
        feedback.setContactWechat(request.contactWechat());
        feedback.setExpectedCity(request.expectedCity());
        feedback.setExpectedCampus(request.expectedCampus());
        feedback.setStatus(SubmissionStatus.SUBMITTED);
        feedback.setCreatedAt(now);
        feedback.setUpdatedAt(now);

        // 将附件列表序列化为 JSON 字符串存储
        if (request.attachments() != null && !request.attachments().isEmpty()) {
            try {
                feedback.setAttachments(objectMapper.writeValueAsString(request.attachments()));
            } catch (JsonProcessingException e) {
                log.warn("附件列表序列化失败，将忽略附件: {}", e.getMessage());
                feedback.setAttachments(null);
            }
        }

        Feedback saved = feedbackRepository.save(feedback);
        log.info("用户 {} 提交反馈，类型: {}，ID: {}", currentUserId, type, saved.getId());

        return toView(saved);
    }

    /**
     * 查询当前用户的提交记录。
     * 支持按 type 过滤，若 type 为 null 则返回该用户所有反馈。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     *
     * @param type 反馈类型（可选过滤）
     * @return 提交记录列表
     */
    @Override
    public List<SubmissionRecordView> listMine(FeedbackTicketType type) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<Feedback> feedbacks;
        if (type != null) {
            feedbacks = feedbackRepository.findByUserIdAndTypeOrderByCreatedAtDesc(currentUserId, type);
        } else {
            feedbacks = feedbackRepository.findByUserIdOrderByCreatedAtDesc(currentUserId);
        }
        return feedbacks.stream().map(this::toView).toList();
    }

    /**
     * 管理员查询所有反馈（不含活动提案）。
     * 排除 ACTIVITY_PROPOSAL 类型，按创建时间降序排列。
     *
     * @return 提交记录列表
     */
    @Override
    public List<SubmissionRecordView> listAdminFeedback() {
        List<Feedback> feedbacks = feedbackRepository
                .findByTypeNotOrderByCreatedAtDesc(FeedbackTicketType.ACTIVITY_PROPOSAL);
        return feedbacks.stream().map(this::toView).toList();
    }

    /**
     * 将活动提案转为活动。
     * 更新 Feedback 的状态为 CONVERTED，并设置 convertedActivityId。
     *
     * @param proposalId 提案 ID
     * @return 更新后的提交记录视图
     * @throws NoSuchElementException 提案不存在时抛出
     * @throws IllegalStateException  提案类型不是 ACTIVITY_PROPOSAL 时抛出
     */
    @Override
    @Transactional
    public SubmissionRecordView convertProposal(long proposalId) {
        Feedback feedback = feedbackRepository.findById(proposalId)
                .orElseThrow(() -> new NoSuchElementException("提案不存在，ID: " + proposalId));

        // 校验提案类型必须是 ACTIVITY_PROPOSAL
        if (feedback.getType() != FeedbackTicketType.ACTIVITY_PROPOSAL) {
            throw new IllegalStateException(
                    "只有 ACTIVITY_PROPOSAL 类型的反馈可以转换，当前类型: " + feedback.getType());
        }

        // 校验提案尚未被转换
        if (feedback.getStatus() == SubmissionStatus.CONVERTED) {
            throw new IllegalStateException(ErrorMessages.PROPOSAL_ALREADY_CONVERTED_PREFIX + proposalId);
        }

        // R4-00342：转换时真实创建 Activity 记录（原实现仅改状态、convertedActivityId 恒为
        // null，运营闭环断裂）。按提案内容初始化活动：标题/描述取自提案，校区/城市取
        // 提案期望值，时间地点缺省为"待定"，由运营后续完善。
        Activity activity = new Activity();
        activity.setTitle(feedback.getTitle() != null && !feedback.getTitle().isBlank()
                ? feedback.getTitle()
                : "校园活动提案");
        activity.setDescription(feedback.getContent() != null ? feedback.getContent() : "");
        activity.setLocation(feedback.getExpectedCampus() != null ? feedback.getExpectedCampus() : "待定");
        activity.setScheduleText("待定");
        activity.setCityName(feedback.getExpectedCity());
        activity.setCampusName(feedback.getExpectedCampus());
        activity.setEnrollmentCount(0);
        activity.setStatus(Activity.ActivityStatus.upcoming);
        activity.setPublished(true);
        activity.setActivityDate(null);
        activity.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        activity.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        Activity savedActivity = activityRepository.save(activity);

        // 更新状态为 CONVERTED 并回填 convertedActivityId
        feedback.setStatus(SubmissionStatus.CONVERTED);
        feedback.setConvertedActivityId(savedActivity.getId());
        feedback.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        Feedback saved = feedbackRepository.save(feedback);
        log.info("活动提案 {} 已转换为活动，convertedActivityId: {}", proposalId, saved.getConvertedActivityId());

        return toView(saved);
    }

    /**
     * 将 Feedback 实体转换为 SubmissionRecordView 视图对象。
     *
     * @param feedback 反馈实体
     * @return 提交记录视图
     */
    private SubmissionRecordView toView(Feedback feedback) {
        String submittedAt = feedback.getCreatedAt() != null
                ? feedback.getCreatedAt().format(FORMATTER)
                : null;
        return new SubmissionRecordView(
                feedback.getId(),
                feedback.getType(),
                feedback.getTitle(),
                feedback.getStatus(),
                feedback.getLatestReplySummary(),
                submittedAt,
                feedback.getConvertedActivityId()
        );
    }

    /**
     * 功能9：上传反馈图片附件。
     *
     * <p>实现逻辑：
     * <ul>
     *   <li>校验 userId 非空</li>
     *   <li>校验 file 非空且非空文件</li>
     *   <li>校验文件大小 ≤ 5MB（功能9业务规则，比 MediaStorageService 默认 10MB 更严格）</li>
     *   <li>委托 MediaStorageService.store 上传，type="image" 走图片校验规则
     *       （jpg/png/webp 格式校验由 MediaStorageService 完成）</li>
     *   <li>返回上传结果，含访问 URL</li>
     * </ul>
     * </p>
     *
     * <p>错误处理：
     * <ul>
     *   <li>userId 为空 → IllegalArgumentException（理论上不会发生，由 Controller 保证）</li>
     *   <li>file 为空或空文件 → IllegalArgumentException → 400</li>
     *   <li>文件大小超限 → IllegalArgumentException → 400</li>
     *   <li>格式不支持/IO 错误 → 由 MediaStorageService 抛出对应异常</li>
     * </ul>
     * </p>
     *
     * @param userId 当前登录用户 ID
     * @param file   multipart 文件
     * @return 上传结果，含访问 URL
     */
    @Override
    @Transactional
    public UploadedImageResult uploadImage(Long userId, MultipartFile file) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(ErrorMessages.FILE_REQUIRED);
        }
        // 功能9 业务规则：单张图片 ≤ 5MB（比 MediaStorageService 默认 10MB 更严格）
        // R4-01849：错误文案由常量值拼接，改限时文案自动同步（不再硬编码 5MB 文案）
        if (file.getSize() > FEEDBACK_IMAGE_MAX_BYTES) {
            throw new IllegalArgumentException(feedbackImageSizeMessage());
        }
        // 委托 MediaStorageService 上传，type="image" 触发 jpg/png/webp 校验
        MediaStorageService.UploadResult uploadResult = mediaStorageService.store(userId, file, "image");
        log.info("用户[{}]上传反馈图片成功，URL: {}", userId, uploadResult.getUrl());
        return new UploadedImageResult(uploadResult.getUrl());
    }

    /**
     * R4-01849：图片超限错误文案——由共享常量动态拼接（"图片大小不能超过 NMB"），
     * 修改 {@link FeedbackService#FEEDBACK_IMAGE_MAX_BYTES} 时文案自动同步。
     */
    private static String feedbackImageSizeMessage() {
        return "图片大小不能超过 " + (FeedbackService.FEEDBACK_IMAGE_MAX_BYTES / 1024 / 1024) + "MB";
    }

    /**
     * 功能10：查询反馈提交详情。
     *
     * <p>实现逻辑：
     * <ul>
     *   <li>校验 userId 非空</li>
     *   <li>根据 id 查询 Feedback 实体，不存在抛 IllegalArgumentException</li>
     *   <li>校验反馈归属：仅返回属于当前用户的反馈详情，避免越权访问</li>
     *   <li>解析 attachments JSON 字符串为 List<String></li>
     *   <li>返回 SubmissionDetailView（含 content/attachments/latestReplyContent）</li>
     * </ul>
     * </p>
     *
     * <p>错误处理：
     * <ul>
     *   <li>userId 为空 → IllegalArgumentException</li>
     *   <li>反馈不存在 → IllegalArgumentException → 400</li>
     *   <li>反馈不属于当前用户 → IllegalArgumentException → 400（避免越权）</li>
     * </ul>
     * </p>
     *
     * @param userId 当前登录用户 ID
     * @param id     反馈记录 ID
     * @return 反馈详情视图
     */
    @Override
    public SubmissionDetailView getSubmissionDetail(Long userId, long id) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.FEEDBACK_NOT_FOUND_PREFIX + id));
        // 校验反馈归属：仅返回属于当前用户的反馈详情，避免越权访问他人反馈
        if (!userId.equals(feedback.getUserId())) {
            log.warn("用户[{}]尝试访问不属于其的反馈记录[ID:{}]，归属用户[{}]",
                    userId, id, feedback.getUserId());
            throw new IllegalArgumentException(ErrorMessages.FEEDBACK_ACCESS_FORBIDDEN);
        }
        return toDetailView(feedback);
    }

    /**
     * 管理员回复/标记反馈为已处理（infra R2-00023）。
     *
     * @param id    反馈记录 ID
     * @param reply 回复内容（非空）
     * @return 更新后的提交记录视图（状态 REVIEWED，latestReplySummary 已刷新）
     */
    @Override
    @Transactional
    public SubmissionRecordView replyFeedback(long id, String reply) {
        if (reply == null || reply.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.REPLY_CONTENT_REQUIRED);
        }
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(ErrorMessages.FEEDBACK_NOT_FOUND_PREFIX + id));

        feedback.setStatus(SubmissionStatus.REVIEWED);
        // 截断过长回复（latestReplySummary 列通常为 255 字符，取前 200 并加省略号）
        String summary = reply.trim().length() > 200
                ? reply.trim().substring(0, 200) + "…"
                : reply.trim();
        feedback.setLatestReplySummary(summary);
        feedback.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        Feedback saved = feedbackRepository.save(feedback);
        log.info("管理员回复反馈完成, id={}, 状态={}", id, saved.getStatus());
        return toView(saved);
    }

    /**
     * 将 Feedback 实体转换为 SubmissionDetailView 详情视图。
     *
     * <p>与 toView 不同，详情视图包含完整 content、解析后的 attachments 数组、
     * 以及 latestReplyContent（最新回复完整内容，当前回复表未实现，先返回 null）。</p>
     *
     * @param feedback 反馈实体
     * @return 反馈详情视图
     */
    private SubmissionDetailView toDetailView(Feedback feedback) {
        String submittedAt = feedback.getCreatedAt() != null
                ? feedback.getCreatedAt().format(FORMATTER)
                : null;
        List<String> attachments = parseAttachments(feedback.getAttachments());
        // latestReplyContent 暂无回复表，先返回 null；后续接入回复表后补充
        return new SubmissionDetailView(
                feedback.getId(),
                feedback.getType(),
                feedback.getTitle(),
                feedback.getContent(),
                attachments,
                feedback.getStatus(),
                feedback.getLatestReplySummary(),
                null,
                submittedAt,
                feedback.getConvertedActivityId()
        );
    }

    /**
     * 解析 attachments JSON 字符串为 List<String>。
     *
     * <p>容错处理：
     * <ul>
     *   <li>null 或空字符串 → 返回空列表</li>
     *   <li>JSON 解析失败 → 记录警告日志并返回空列表，不抛异常</li>
     * </ul>
     * </p>
     *
     * @param attachmentsJson 附件 JSON 字符串
     * @return 附件 URL 数组（永不返回 null）
     */
    private List<String> parseAttachments(String attachmentsJson) {
        if (attachmentsJson == null || attachmentsJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            List<String> parsed = objectMapper.readValue(attachmentsJson, ATTACHMENTS_TYPE_REF);
            return parsed != null ? parsed : Collections.emptyList();
        } catch (JsonProcessingException e) {
            log.warn("附件 JSON 解析失败，返回空列表: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
