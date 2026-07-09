package com.campuslove.api.repository;

import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.Post.AuditStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 帖子 Repository。
 * 提供基于分类、状态和作者的查询方法。
 */
public interface PostRepository extends JpaRepository<Post, Long> {

    /**
     * 根据分类和状态查询帖子，按创建时间倒序分页。
     *
     * @param category 帖子分类
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByCategoryAndStatusOrderByCreatedAtDesc(PostCategory category, PostStatus status, Pageable pageable);

    /**
     * 根据作者 ID 列表和状态查询帖子，按创建时间倒序分页。
     *
     * @param authorIds 作者 ID 列表
     * @param status    帖子状态
     * @param pageable  分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByAuthorIdInAndStatusOrderByCreatedAtDesc(List<Long> authorIds, PostStatus status, Pageable pageable);

    /**
     * 根据状态查询帖子，按创建时间倒序分页。
     *
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByStatusOrderByCreatedAtDesc(PostStatus status, Pageable pageable);

    /**
     * 根据作者 ID 列表和分类查询帖子，按创建时间倒序分页。
     *
     * @param authorIds 作者 ID 列表
     * @param category  帖子分类
     * @param status    帖子状态
     * @param pageable  分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByAuthorIdInAndCategoryAndStatusOrderByCreatedAtDesc(
            List<Long> authorIds, PostCategory category, PostStatus status, Pageable pageable);

    /**
     * 根据作者 ID 查询该用户的所有帖子。
     * 用于统计用户帖子总获赞数等场景。
     *
     * @param authorId 作者 ID
     * @return 该作者的所有帖子列表
     */
    List<Post> findByAuthorId(Long authorId);

    /**
     * 根据状态查询帖子，按点赞数倒序分页。
     * 用于首页聚合"村口热门帖子"场景。
     *
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表（按点赞数从高到低）
     */
    Page<Post> findByStatusOrderByLikesCountDesc(PostStatus status, Pageable pageable);

    /**
     * 根据 ID 列表和状态查询帖子，按创建时间倒序分页。
     * 用于标签聚合场景，查询特定标签下的帖子列表。
     *
     * @param ids     帖子 ID 列表
     * @param status  帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByIdInAndStatusOrderByCreatedAtDesc(List<Long> ids, PostStatus status, Pageable pageable);

    /**
     * 管理后台 - 多条件分页查询帖子。
     * <p>所有筛选条件均可为 null（不参与筛选），按创建时间倒序排列。</p>
     * <p>此查询不限制 PostStatus，便于管理员查看包含已删除/隐藏在内的所有帖子。</p>
     *
     * @param auditStatus 审核状态筛选（pending/approved/rejected），null 表示不筛选
     * @param status      帖子状态筛选（active/deleted/hidden），null 表示不筛选
     * @param category    帖子分类筛选，null 表示不筛选
     * @param authorId    作者用户 ID 筛选，null 表示不筛选
     * @param pageable    分页参数
     * @return 分页帖子列表
     */
    @Query("""
            SELECT p FROM Post p
            WHERE (:auditStatus IS NULL OR p.auditStatus = :auditStatus)
              AND (:status IS NULL OR p.status = :status)
              AND (:category IS NULL OR p.category = :category)
              AND (:authorId IS NULL OR p.authorId = :authorId)
            ORDER BY p.createdAt DESC
            """)
    Page<Post> searchForAdmin(
            @Param("auditStatus") AuditStatus auditStatus,
            @Param("status") PostStatus status,
            @Param("category") PostCategory category,
            @Param("authorId") Long authorId,
            Pageable pageable);
}
