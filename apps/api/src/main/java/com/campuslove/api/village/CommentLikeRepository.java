package com.campuslove.api.village;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 评论点赞记录 Repository（M-14 评论点赞）。
 *
 * <p>提供评论点赞存在性查询与计数能力（点赞去重由 uk_comment_likes_user_comment
 * 唯一约束兜底）。2026-08-08 新增批量查询（评论区点赞数真实化，防 N+1）。</p>
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

    /**
     * 批量统计指定评论的点赞数（评论区列表填充 likeCount，防 N+1）。
     *
     * @param commentIds 评论 ID 集合
     * @return 每行 [commentId, count]
     */
    @Query("SELECT cl.commentId, COUNT(cl) FROM CommentLike cl WHERE cl.commentId IN :commentIds GROUP BY cl.commentId")
    List<Object[]> countByCommentIds(@Param("commentIds") List<Long> commentIds);

    /**
     * 批量查询当前用户已点赞的评论 ID 集合（评论区填充 isLiked，防 N+1）。
     *
     * @param userId     当前用户 ID
     * @param commentIds 评论 ID 集合
     * @return 已点赞的评论 ID 列表
     */
    @Query("SELECT cl.commentId FROM CommentLike cl WHERE cl.userId = :userId AND cl.commentId IN :commentIds")
    List<Long> findCommentIdsByUserIdAndCommentIdIn(@Param("userId") Long userId, @Param("commentIds") List<Long> commentIds);
}
