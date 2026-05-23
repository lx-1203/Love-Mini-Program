package com.campuslove.api.feedback;

import java.util.List;

/**
 * 反馈服务接口。
 * 提供反馈提交、查询、管理等功能。
 */
public interface FeedbackService {

    /**
     * 提交反馈。
     *
     * @param type    反馈类型
     * @param request 反馈提交请求
     * @return 提交记录视图
     */
    SubmissionRecordView submit(FeedbackTicketType type, FeedbackSubmissionRequest request);

    /**
     * 查询当前用户的提交记录。
     *
     * @param type 反馈类型（可选过滤）
     * @return 提交记录列表
     */
    List<SubmissionRecordView> listMine(FeedbackTicketType type);

    /**
     * 管理员查询所有反馈（不含活动提案）。
     *
     * @return 提交记录列表
     */
    List<SubmissionRecordView> listAdminFeedback();

    /**
     * 将活动提案转为活动。
     *
     * @param proposalId 提案 ID
     * @return 更新后的提交记录视图
     */
    SubmissionRecordView convertProposal(long proposalId);
}
