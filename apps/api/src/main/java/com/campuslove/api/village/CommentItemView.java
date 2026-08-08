package com.campuslove.api.village;

import java.util.List;

/**
 * 评论项视图。
 *
 * <p>P1-02 / A-12 楼中楼：{@code parentId} 标识父评论（null 为根评论），
 * {@code replyTo} 为楼中楼回复的回复对象昵称，{@code replies} 为楼中楼回复子数组
 * （根评论携带，子评论为空列表）。</p>
 *
 * @param id        评论 ID
 * @param postId    帖子 ID
 * @param parentId  父评论 ID（null 表示根评论）
 * @param author    评论作者
 * @param content   评论内容
 * @param likeCount 点赞数（M-14 评论点赞后回填，2026-08-08 修复真实统计）
 * @param createdAt 创建时间
 * @param isAuthor  是否当前用户发布
 * @param isLiked   当前用户是否已点赞（2026-08-08 新增，匿名时 false）
 * @param replyTo   回复对象昵称（楼中楼回复）
 * @param replies   楼中楼回复列表（根评论携带，子评论为空）
 */
public record CommentItemView(
    Long id,
    Long postId,
    Long parentId,
    CommentAuthorView author,
    String content,
    int likeCount,
    String createdAt,
    boolean isAuthor,
    boolean isLiked,
    String replyTo,
    List<CommentItemView> replies
) {
    /**
     * 兼容旧调用（9 参，无 replies / isLiked）：isLiked 默认 false，楼中楼回复为空列表。
     */
    public CommentItemView(
            Long id,
            Long postId,
            Long parentId,
            CommentAuthorView author,
            String content,
            int likeCount,
            String createdAt,
            boolean isAuthor,
            String replyTo) {
        this(id, postId, parentId, author, content, likeCount, createdAt, isAuthor, false, replyTo, List.of());
    }
}
