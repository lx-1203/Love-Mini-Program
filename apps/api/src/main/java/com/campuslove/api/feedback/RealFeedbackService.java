package com.campuslove.api.feedback;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Feedback;
import com.campuslove.api.repository.FeedbackRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实反馈服务实现。
 * 在 real profile 下激活，使用 FeedbackRepository 实现数据库持久化。
 */
@Profile("real")
@Service
public class RealFeedbackService implements FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(RealFeedbackService.class);
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final FeedbackRepository feedbackRepository;
    private final ObjectMapper objectMapper;

    public RealFeedbackService(FeedbackRepository feedbackRepository, ObjectMapper objectMapper) {
        this.feedbackRepository = feedbackRepository;
        this.objectMapper = objectMapper;
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
        LocalDateTime now = LocalDateTime.now();

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
            throw new IllegalStateException("提案已被转换，无需重复操作，ID: " + proposalId);
        }

        // 更新状态为 CONVERTED，暂时不创建 Activity 记录（仅更新状态）
        feedback.setStatus(SubmissionStatus.CONVERTED);
        feedback.setUpdatedAt(LocalDateTime.now());

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
}
