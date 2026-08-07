package com.campuslove.api.village;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 评论点赞记录 Repository（M-14 评论点赞）。
 *
 * <p>提供评论点赞存在性查询与计数能力（点赞去重由 uk_comment_likes_user_comment
 * 唯一约束兜底）。</p>
 */
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    /**
     * 查询用户是否已点赞指定评论。
     *
     * @param userId    点赞用户 ID
     * @param commentId 评论 ID
     * @return true 表示已点赞
     */
    boolean existsByUserIdAndCommentId(Long userId, Long commentId);

    /**
     * 统计评论点赞数。
     *
     * @param commentId 评论 ID
     * @return 点赞数
     */
    long countByCommentId(Long commentId);

    /**
     * 删除用户对指定评论的点赞记录（取消点赞）。
     *
     * @param userId    点赞用户 ID
     * @param commentId 评论 ID
     */
    void deleteByUserIdAndCommentId(Long userId, Long commentId);
}
