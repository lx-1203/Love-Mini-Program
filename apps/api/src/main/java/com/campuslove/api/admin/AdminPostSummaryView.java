package com.campuslove.api.admin;

import java.time.LocalDateTime;

/**
 * 管理后台 - 帖子列表项视图。
 * <p>用于 GET /api/admin/posts 分页列表展示。</p>
 *
 * @param id             帖子 ID
 * @param authorId       作者用户 ID
 * @param authorNickname 作者昵称（联表查询填充，无作者时为 null）
 * @param contentPreview 帖子内容预览（前 80 字符）
 * @param category       分类：all/interest/sincere/hometown/anonymous/latest/campus
 * @param status         帖子状态：active/deleted/hidden
 * @param auditStatus    审核状态：pending/approved/rejected
 * @param likesCount     点赞数
 * @param commentsCount  评论数
 * @param shareCount     转发数
 * @param createdAt      创建时间
 * @param auditedAt      审核时间（未审核则为 null）
 */
public record AdminPostSummaryView(
        Long id,
        Long authorId,
        String authorNickname,
        String contentPreview,
        String category,
        String status,
        String auditStatus,
        Integer likesCount,
        Integer commentsCount,
        Integer shareCount,
        LocalDateTime createdAt,
        LocalDateTime auditedAt
) {
    /**
     * 截取帖子内容前 80 个字符作为预览。
     *
     * @param content 原始内容
     * @return 长度 ≤ 80 的预览字符串
     */
    public static String previewOf(String content) {
        if (content == null) {
            return "";
        }
        return content.length() <= 80 ? content : content.substring(0, 80);
    }
}
