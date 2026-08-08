package com.campuslove.api.feedback;

import java.util.List;
import org.springframework.web.multipart.MultipartFile;

/**
 * 反馈服务接口。
 * 提供反馈提交、查询、管理等功能。
 *
 * 功能9：新增 uploadImage 方法，用于上传反馈图片附件。
 * 功能10：新增 getSubmissionDetail 方法，用于查询反馈详情（含完整内容/附件/回复）。
 */
public interface FeedbackService {

    /**
     * 反馈图片大小上限（字节）（R4-01850 双实现共用常量）。
     * 5MB——功能9业务规则（比 MediaStorageService 默认 10MB 更严格），
     * Real/Mock 实现共用，改限时只改一处。
     */
    long FEEDBACK_IMAGE_MAX_BYTES = 5L * 1024 * 1024;

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

    /**
     * 管理员回复/标记反馈为已处理（infra R2-00023）。
     *
     * <p>将反馈状态推进至 REVIEWED 并记录回复摘要。供管理后台
     * PUT /api/v1/admin/feedback/{id}/reply 端点调用。</p>
     *
     * @param id    反馈记录 ID
     * @param reply 回复内容（非空）
     * @return 更新后的提交记录视图（状态为 REVIEWED，latestReplySummary 已刷新）
     * @throws NoSuchElementException 反馈不存在时抛出
     * @throws IllegalArgumentException reply 为空时抛出
     */
    SubmissionRecordView replyFeedback(long id, String reply);

    /**
     * 功能9：上传反馈图片附件。
     *
     * <p>校验规则：
     * <ul>
     *   <li>图片格式：jpg/png/webp（其他格式抛出 IllegalArgumentException）</li>
     *   <li>图片大小：单张 ≤ 5MB（超出抛出 IllegalArgumentException）</li>
     * </ul>
     * </p>
     *
     * <p>存储路径：uploads/{userId}/{yyyyMM}/{uuid}.{ext}（与照片墙/视频上传一致）</p>
     *
     * @param userId 当前登录用户 ID（由 Controller 从 SecurityContext 获取后传入）
     * @param file   multipart 文件
     * @return 上传结果，含访问 URL
     * @throws IllegalArgumentException 文件过大或格式不支持时抛出
     * @throws IllegalStateException    IO 错误时抛出
     */
    UploadedImageResult uploadImage(Long userId, MultipartFile file);

    /**
     * 功能10：查询反馈提交详情。
     *
     * <p>仅返回属于当前用户的反馈详情，避免越权访问他人反馈。</p>
     *
     * <p>详情包含：
     * <ul>
     *   <li>content：完整反馈内容（列表接口不返回）</li>
     *   <li>attachments：附件 URL 数组（解析 JSON 字符串后返回）</li>
     *   <li>latestReplyContent：最新回复完整内容（列表接口仅返回摘要）</li>
     * </ul>
     * </p>
     *
     * @param userId 当前登录用户 ID（由 Controller 从 SecurityContext 获取后传入）
     * @param id     反馈记录 ID
     * @return 反馈详情视图
     * @throws IllegalArgumentException 反馈不存在或不属于当前用户时抛出
     */
    SubmissionDetailView getSubmissionDetail(Long userId, long id);

    /**
     * 功能9：上传图片结果。
     *
     * <p>不可变值对象，由实现方构造并返回。</p>
     */
    class UploadedImageResult {

        /** 访问 URL（相对路径，如 /uploads/1/202607/uuid.jpg） */
        private final String url;

        /**
         * 构造上传图片结果。
         *
         * @param url 访问 URL
         */
        public UploadedImageResult(String url) {
            this.url = url;
        }

        public String getUrl() {
            return url;
        }
    }
}
