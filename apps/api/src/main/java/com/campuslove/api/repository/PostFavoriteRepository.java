package com.campuslove.api.repository;

import com.campuslove.api.entity.PostFavorite;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 帖子收藏记录 Repository（2026-08-08 论坛互动真实化）。
 * 提供基于用户和帖子的收藏查询、判断、删除和统计方法。
 */
@Repository
public interface PostFavoriteRepository extends JpaRepository<PostFavorite, Long> {

    /**
     * 判断用户是否已收藏某帖子（收藏 toggle 去重判断）。
     */
    boolean existsByUserIdAndPostId(Long userId, Long postId);

    /**
     * 删除用户对指定帖子的收藏记录（取消收藏，bulk DELETE 场景的回退）。
     */
    void deleteByUserIdAndPostId(Long userId, Long postId);

    /**
     * 统计指定帖子的收藏总数。
     */
    long countByPostId(Long postId);

    /**
     * 批量查询当前用户已收藏的帖子 ID 集合（列表页填充 isFavorite，防 N+1）。
     *
     * @param userId  当前用户 ID
     * @param postIds 帖子 ID 集合
     * @return 已收藏的帖子 ID 列表
     */
    @Query("SELECT pf.postId FROM PostFavorite pf WHERE pf.userId = :userId AND pf.postId IN :postIds")
    List<Long> findPostIdsByUserIdAndPostIdIn(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);

    /**
     * 批量统计指定帖子的收藏数（列表页填充 favoriteCount，防 N+1）。
     *
     * @param postIds 帖子 ID 集合
     * @return 每行 [postId, count]
     */
    @Query("SELECT pf.postId, COUNT(pf) FROM PostFavorite pf WHERE pf.postId IN :postIds GROUP BY pf.postId")
    List<Object[]> countByPostIds(@Param("postIds") List<Long> postIds);
}
