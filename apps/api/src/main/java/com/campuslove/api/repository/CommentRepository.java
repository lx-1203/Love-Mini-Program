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
     * P1-02 / A-12 楼中楼：分页查询帖子的根评论（parent_id IS NULL），按创建时间倒序。
     *
     * <p>@EntityGraph 预加载 post 关联，避免 toCommentItemView 访问
     * {@code comment.getPost().getId()} 时逐条触发 SELECT（N+1）。</p>
     *
     * @param postId   帖子 ID
     * @param pageable 分页参数
     * @return 根评论分页结果
     */
    @EntityGraph(attributePaths = "post")
    Page<Comment> findByPostIdAndParentIdIsNullOrderByCreatedAtDesc(Long postId, Pageable pageable);

    /**
     * P1-02 / A-12 楼中楼：查询指定根评论集合下的全部楼中楼回复，按创建时间正序。
     *
     * <p>@EntityGraph 预加载 post 关联，避免视图转换时 N+1。</p>
     *
     * @param postId    帖子 ID
     * @param parentIds 父评论 ID 集合
     * @return 楼中楼回复列表（按创建时间正序，时间正序更符合楼中楼阅读习惯）
     */
    @EntityGraph(attributePaths = "post")
    List<Comment> findByPostIdAndParentIdInOrderByCreatedAtAsc(Long postId, java.util.Collection<Long> parentIds);

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

    /**
     * 管理后台 - 多条件分页查询评论（作者/帖子/校区筛选）。
     * <p>数据隔离（商业模式：每个高校一个管理员）：comments 表无 campus_name 列，
     * campusName 非空时按<b>评论作者所属校区</b>过滤（EXISTS 子查询关联
     * {@code UserCampusProfile.campusName}，与 AdminUserController 语义一致）。</p>
     *
     * @param authorId   作者用户 ID 筛选，null 表示不筛选
     * @param postId     关联帖子 ID 筛选，null 表示不筛选
     * @param campusName 校区筛选（按评论作者所属校区过滤），null/空表示不筛选
     * @param pageable   分页参数
     * @return 分页评论结果（按创建时间倒序）
     */
    @Query("""
            SELECT c FROM Comment c
            WHERE (:authorId IS NULL OR c.authorId = :authorId)
              AND (:postId IS NULL OR c.post.id = :postId)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = c.authorId AND ucp.campusName = :campusName))
            ORDER BY c.createdAt DESC
            """)
    Page<Comment> searchForAdmin(
            @Param("authorId") Long authorId,
            @Param("postId") Long postId,
            @Param("campusName") String campusName,
            Pageable pageable);
}
