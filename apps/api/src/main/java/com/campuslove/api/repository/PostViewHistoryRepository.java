package com.campuslove.api.repository;

import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PostViewHistory;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 帖子浏览历史 Repository（2026-08-08 论坛互动真实化）。
 * 同一用户对同一帖子仅保留一条浏览记录（uk_post_view_history_user_post），
 * 重复浏览刷新 viewed_at（upsert 语义）。
 */
@Repository
public interface PostViewHistoryRepository extends JpaRepository<PostViewHistory, Long> {

    /**
     * 查询用户对指定帖子的浏览记录（upsert 判断：命中则刷新 viewed_at）。
     */
    Optional<PostViewHistory> findByUserIdAndPostId(Long userId, Long postId);

    /**
     * 删除用户的全部浏览记录（清空浏览历史）。
     */
    void deleteByUserId(Long userId);

    /**
     * 分页查询用户的最近浏览记录，按 viewed_at 倒序。
     *
     * <p>EXISTS 子查询过滤已删除/下架的帖子（status != active 不占位），
     * 保证浏览记录页点卡片不会跳到失效帖子。</p>
     *
     * @param userId   当前用户 ID
     * @param status   帖子状态过滤（active）
     * @param pageable 分页参数
     * @return 浏览记录分页结果
     */
    @Query("""
            SELECT pvh FROM PostViewHistory pvh
            WHERE pvh.userId = :userId
              AND EXISTS (SELECT 1 FROM Post p WHERE p.id = pvh.postId AND p.status = :status)
            ORDER BY pvh.viewedAt DESC
            """)
    Page<PostViewHistory> findRecentByUserId(@Param("userId") Long userId,
                                             @Param("status") Post.PostStatus status,
                                             Pageable pageable);

    /**
     * 分页查询浏览过指定帖子的用户记录，按 viewed_at 倒序（管理后台浏览记录弹窗）。
     *
     * @param postId   帖子 ID
     * @param pageable 分页参数
     * @return 浏览者记录分页结果
     */
    Page<PostViewHistory> findByPostIdOrderByViewedAtDesc(Long postId, Pageable pageable);
}
