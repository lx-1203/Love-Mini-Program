package com.campuslove.api.repository;

import com.campuslove.api.entity.PostShare;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 帖子转发记录 Repository。
 * 提供基于帖子和用户的查询方法。
 */
public interface PostShareRepository extends JpaRepository<PostShare, Long> {

    /**
     * 根据帖子 ID 查询转发记录。
     *
     * @param postId 帖子 ID
     * @return 转发记录列表
     */
    List<PostShare> findByPostIdOrderByCreatedAtDesc(Long postId);

    /**
     * Task 2.2.4：根据帖子 ID 查询转发记录，并通过 @EntityGraph 一次性预加载 post 关联。
     * <p>{@link PostShare#getPost()} 是 LAZY 加载，
     * 调用方在 View 转换层访问 {@code share.getPost().getId()} / {@code share.getPost().getContent()} 等字段时
     * 会为每条转发记录触发一次 SELECT post 查询（N+1 问题）。
     * 此方法使用 @EntityGraph 在单条 SQL 中通过 LEFT OUTER JOIN 加载 post，
     * 将原本 N 条 SQL 压缩为 1 条。</p>
     *
     * @param postId 帖子 ID
     * @return 转发记录列表（post 已被预加载）
     */
    @EntityGraph(attributePaths = "post")
    @Query("SELECT s FROM PostShare s WHERE s.post.id = :postId ORDER BY s.createdAt DESC")
    List<PostShare> findWithPostByPostIdOrderByCreatedAtDesc(@Param("postId") Long postId);
}
