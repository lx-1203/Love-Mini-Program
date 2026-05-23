package com.campuslove.api.repository;

import com.campuslove.api.entity.PostLike;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 帖子点赞记录 Repository。
 * 提供基于用户和帖子的点赞查询、判断、删除和统计方法。
 */
@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    /**
     * 根据用户 ID 和帖子 ID 查询点赞记录。
     * 用于判断用户是否已对某帖子点赞，以及获取点赞记录详情。
     *
     * @param userId 点赞用户 ID
     * @param postId 被点赞帖子 ID
     * @return 匹配的点赞记录（可能为空）
     */
    Optional<PostLike> findByUserIdAndPostId(Long userId, Long postId);

    /**
     * 判断用户是否已对某帖子点赞。
     * 用于点赞去重判断，比 findByUserIdAndPostId 更轻量。
     *
     * @param userId 点赞用户 ID
     * @param postId 被点赞帖子 ID
     * @return 如果已点赞返回 true，否则返回 false
     */
    boolean existsByUserIdAndPostId(Long userId, Long postId);

    /**
     * 根据用户 ID 和帖子 ID 删除点赞记录。
     * 用于取消点赞（toggle 行为的取消部分）。
     *
     * @param userId 点赞用户 ID
     * @param postId 被点赞帖子 ID
     */
    void deleteByUserIdAndPostId(Long userId, Long postId);

    /**
     * 统计指定帖子的点赞总数。
     * 可用于校验 posts.likes_count 的一致性。
     *
     * @param postId 被点赞帖子 ID
     * @return 该帖子的点赞总数
     */
    long countByPostId(Long postId);
}
