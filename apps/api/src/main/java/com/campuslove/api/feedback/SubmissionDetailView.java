package com.campuslove.api.feedback;

import java.util.List;

/**
 * 反馈提交记录详情视图（功能10）。
 *
 * <p>在原 {@link SubmissionRecordView} 基础上新增 content/attachments/latestReplyContent
 * 字段，用于反馈历史详情页展示完整内容。</p>
 *
 * <p>列表接口（GET /api/feedback/my-submissions）仍返回 {@link SubmissionRecordView}
 * 以节省流量；详情接口（GET /api/feedback/my-submissions/{id}）返回本视图。</p>
 */
public record SubmissionDetailView(

    /** 反馈记录 ID */
    long id,

    /** 反馈类型：FEEDBACK / SUGGESTION / ACTIVITY_PROPOSAL */
    FeedbackTicketType type,

    /** 标题 */
    String title,

    /** 反馈内容（详情页才返回，列表页为节省流量不返回） */
    String content,

    /** 附件 URL 数组（永不返回 null，无附件时返回空列表） */
    List<String> attachments,

    /** 提交状态：SUBMITTED / PROCESSING / REVIEWED / PLANNED / CONVERTED */
    SubmissionStatus status,

    /** 最新回复摘要（可空） */
    String latestReplySummary,

    /** 最新回复完整内容（详情页才返回，可空） */
    String latestReplyContent,

    /** 提交时间字符串（yyyy-MM-dd HH:mm:ss） */
    String submittedAt,

    /** 转换后的活动 ID（仅 ACTIVITY_PROPOSAL 类型有值，其他类型为 null） */
    Long convertedActivityId
) {
}
