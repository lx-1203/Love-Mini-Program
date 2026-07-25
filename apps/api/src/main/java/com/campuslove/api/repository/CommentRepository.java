package com.campuslove.api.repository;

import com.campuslove.api.entity.Comment;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 评论 Repository。
 * 提供基于帖子的查询方法，以及管理后台分页查询。
 */
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * 根据帖子 ID 查询评论列表，按创建时间倒序。
     *
     * @param postId 帖子 ID
     * @return 评论列表
     */
    List<Comment> findByPostIdOrderByCreatedAtDesc(Long postId);

    /**
     * 根据帖子 ID 分页查询评论，按创建时间倒序。
     *
     * @param postId 帖子 ID
     * @param pageable 分页参数
     * @return 分页评论结果
     */
    Page<Comment> findByPostIdOrderByCreatedAtDesc(Long postId, Pageable pageable);

    /**
     * 修复 N+1 查询：根据帖子 ID 分页查询评论，并通过 @EntityGraph 一次性预加载 post 关联。
     * <p>{@link com.campuslove.api.entity.Comment#getPost()} 是 LAZY 加载，
     * 调用方在 {@code toCommentItemView} 中访问 {@code comment.getPost().getId()} 时
     * 会为每条评论触发一次 SELECT post 查询（N+1 问题）。
     * 此方法使用 @EntityGraph 在单条 SQL 中通过 LEFT OUTER JOIN 加载 post，
     * 将原本 N 条 SQL 压缩为 1 条。</p>
     *
     * @param postId   帖子 ID
     * @param pageable 分页参数
     * @return 分页评论结果（post 已被预加载）
     */
    @EntityGraph(attributePaths = "post")
    @Query("SELECT c FROM Comment c WHERE c.post.id = :postId ORDER BY c.createdAt DESC")
    Page<Comment> findWithPostByPostIdOrderByCreatedAtDesc(@Param("postId") Long postId, Pageable pageable);

    /**
     * 管理后台 - 全量评论分页查询，按创建时间倒序。
     * <p>用于管理后台评论列表展示，不限定帖子。</p>
     *
     * @param pageable 分页参数
     * @return 分页评论结果
     */
    Page<Comment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * 管理后台 - 根据作者 ID 分页查询评论，按创建时间倒序。
     * <p>用于按用户筛选其发布的所有评论。</p>
     *
     * @param authorId 作者用户 ID
     * @param pageable 分页参数
     * @return 分页评论结果
     */
    Page<Comment> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);
}
