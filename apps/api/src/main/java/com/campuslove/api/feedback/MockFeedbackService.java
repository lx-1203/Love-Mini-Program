package com.campuslove.api.feedback;

import com.campuslove.api.common.ErrorMessages;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Mock 反馈服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 *
 * <p>功能9：新增 uploadImage 方法，返回 mock URL（不实际上传）。</p>
 * <p>功能10：新增 getSubmissionDetail 方法，从内存 detail Map 中查询详情。</p>
 */
@Profile("mock")
@Service
public class MockFeedbackService implements FeedbackService {

  private final AtomicLong ids = new AtomicLong(1000);
  private final List<SubmissionRecordView> seedRecords = new ArrayList<>();

  /**
   * 功能10：反馈详情 Map，key=反馈 ID，value=详情视图。
   *
   * <p>submit 时同步写入详情，getSubmissionDetail 时按 ID 查询。</p>
   * <p>seed 数据初始化时也同步写入，便于详情页查看预置数据。</p>
   */
  private final Map<Long, SubmissionDetailView> detailMap = new HashMap<>();

  /**
   * 功能9：mock 图片 ID 自增计数器，用于生成唯一 mock URL。
   */
  private final AtomicLong imageIds = new AtomicLong(0);

  public MockFeedbackService() {
    // 预置 3 条记录（与 detailMap 同步初始化，确保详情页可查看）
    seedDetail(1L, FeedbackTicketType.FEEDBACK,
        "视频主视觉在媒体缺失时需要稳定切到动画兜底",
        "在弱网或资源加载失败时，视频主视觉应平滑切换到 Lottie 动画兜底，避免出现空白或闪烁。",
        List.of(),
        SubmissionStatus.PROCESSING,
        "兜底行为已经纳入新的客户端壳层处理。",
        "兜底行为已经纳入新的客户端壳层处理，预计在下个版本上线。",
        "2026-05-18 09:18",
        null);
    seedDetail(2L, FeedbackTicketType.SUGGESTION,
        "首页保留讨论入口",
        "首页改版后讨论入口被移到二级页面，建议保留首页直达入口，提升讨论活跃度。",
        List.of(),
        SubmissionStatus.REVIEWED,
        "已接受，纳入首页第一版信息架构调整。",
        "已接受，纳入首页第一版信息架构调整，下个版本会恢复首页讨论入口。",
        "2026-05-17 18:42",
        null);
    seedDetail(3L, FeedbackTicketType.ACTIVITY_PROPOSAL,
        "图书馆南门咖啡散步",
        "建议组织一次图书馆南门到咖啡厅的散步活动，长度约 2km，适合周末下午。",
        List.of(),
        SubmissionStatus.PLANNED,
        "运营已接收这个想法，正在整理活动草案。",
        "运营已接收这个想法，正在整理活动草案，预计下周公布具体时间地点。",
        "2026-05-17 20:30",
        501L);
  }

  /**
   * 辅助方法：同步预置 SubmissionRecordView 与 SubmissionDetailView。
   *
   * @param id            反馈 ID
   * @param type          反馈类型
   * @param title         标题
   * @param content       完整内容
   * @param attachments   附件 URL 数组
   * @param status        状态
   * @param replySummary  最新回复摘要
   * @param replyContent  最新回复完整内容
   * @param submittedAt   提交时间字符串
   * @param convertedId   转换后的活动 ID（可空）
   */
  private void seedDetail(long id,
                          FeedbackTicketType type,
                          String title,
                          String content,
                          List<String> attachments,
                          SubmissionStatus status,
                          String replySummary,
                          String replyContent,
                          String submittedAt,
                          Long convertedId) {
    seedRecords.add(new SubmissionRecordView(
        id, type, title, status, replySummary, submittedAt, convertedId
    ));
    detailMap.put(id, new SubmissionDetailView(
        id, type, title, content, attachments, status,
        replySummary, replyContent, submittedAt, convertedId
    ));
  }

  @Override
  public SubmissionRecordView submit(FeedbackTicketType type, FeedbackSubmissionRequest request) {
    long newId = ids.incrementAndGet();
    SubmissionRecordView created = new SubmissionRecordView(
        newId,
        type,
        request.title(),
        SubmissionStatus.SUBMITTED,
        "你的提交已进入待处理队列。",
        "刚刚",
        null
    );
    seedRecords.add(0, created);
    // 功能10：同步写入详情，供 getSubmissionDetail 查询
    List<String> attachments = request.attachments() != null
        ? List.copyOf(request.attachments())
        : List.of();
    detailMap.put(newId, new SubmissionDetailView(
        newId,
        type,
        request.title(),
        request.content(),
        attachments,
        SubmissionStatus.SUBMITTED,
        "你的提交已进入待处理队列。",
        null,
        "刚刚",
        null
    ));
    return created;
  }

  @Override
  public List<SubmissionRecordView> listMine(FeedbackTicketType type) {
    if (type == null) {
      return List.copyOf(seedRecords);
    }

    return seedRecords.stream()
        .filter(record -> record.type() == type)
        .toList();
  }

  @Override
  public List<SubmissionRecordView> listAdminFeedback() {
    return seedRecords.stream()
        .filter(record -> record.type() != FeedbackTicketType.ACTIVITY_PROPOSAL)
        .toList();
  }

  @Override
  public SubmissionRecordView convertProposal(long proposalId) {
    return seedRecords.stream()
        .filter(record -> record.id() == proposalId && record.type() == FeedbackTicketType.ACTIVITY_PROPOSAL)
        .findFirst()
        .map(record -> new SubmissionRecordView(
            record.id(),
            record.type(),
            record.title(),
            SubmissionStatus.CONVERTED,
            "已转成活动草案，正在补充执行细节。",
            record.submittedAt(),
            9000L + proposalId
        ))
        .orElseThrow(() -> new IllegalArgumentException("proposal not found"));
  }

  /**
   * 管理员回复/标记反馈为已处理（Mock 实现，infra R2-00023）。
   */
  @Override
  public SubmissionRecordView replyFeedback(long id, String reply) {
    if (reply == null || reply.isBlank()) {
      throw new IllegalArgumentException(ErrorMessages.REPLY_CONTENT_REQUIRED);
    }
    return seedRecords.stream()
        .filter(record -> record.id() == id)
        .findFirst()
        .map(record -> new SubmissionRecordView(
            record.id(),
            record.type(),
            record.title(),
            SubmissionStatus.REVIEWED,
            reply.trim().length() > 200 ? reply.trim().substring(0, 200) + "…" : reply.trim(),
            record.submittedAt(),
            record.convertedActivityId()
        ))
        .orElseThrow(() -> new IllegalArgumentException("feedback not found"));
  }

  /**
   * 功能9：上传反馈图片附件（Mock 实现）。
   *
   * <p>Mock 模式下不实际上传文件，仅返回 mock URL 供前端调试使用。</p>
   *
   * <p>校验规则（与 RealFeedbackService 保持一致，便于 mock/real 切换时行为一致）：
   * <ul>
   *   <li>userId 非空</li>
   *   <li>file 非空且非空文件</li>
   *   <li>文件大小 ≤ 5MB</li>
   * </ul>
   * </p>
   *
   * @param userId 当前登录用户 ID
   * @param file   multipart 文件
   * @return 上传结果，含 mock URL
   * @throws IllegalArgumentException 文件为空或超过 5MB 时抛出
   */
  @Override
  public FeedbackService.UploadedImageResult uploadImage(Long userId, MultipartFile file) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException(ErrorMessages.FILE_REQUIRED);
    }
    // R4-01850：与 RealFeedbackService 共用同一上限常量（改限时只改一处）
    if (file.getSize() > FeedbackService.FEEDBACK_IMAGE_MAX_BYTES) {
      throw new IllegalArgumentException("图片大小不能超过 "
          + (FeedbackService.FEEDBACK_IMAGE_MAX_BYTES / 1024 / 1024) + "MB");
    }
    // 返回 mock URL，不实际持久化
    long imageId = imageIds.incrementAndGet();
    String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image";
    String mockUrl = "mock://feedback/image/" + imageId + "/" + originalName;
    return new FeedbackService.UploadedImageResult(mockUrl);
  }

  /**
   * 功能10：查询反馈提交详情（Mock 实现）。
   *
   * <p>从内存 detailMap 中按 ID 查询详情。Mock 模式下不区分用户归属
   * （所有 mock 数据视为当前用户提交），但保留参数 userId 以保持接口一致。</p>
   *
   * @param userId 当前登录用户 ID（mock 模式下不校验归属）
   * @param id     反馈记录 ID
   * @return 反馈详情视图
   * @throws IllegalArgumentException 反馈不存在时抛出
   */
  @Override
  public SubmissionDetailView getSubmissionDetail(Long userId, long id) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }
    SubmissionDetailView detail = detailMap.get(id);
    if (detail == null) {
      throw new IllegalArgumentException(ErrorMessages.FEEDBACK_NOT_FOUND_PREFIX + id);
    }
    return detail;
  }
}
