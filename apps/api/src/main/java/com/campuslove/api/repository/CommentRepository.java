package com.campuslove.api.repository;

import com.campuslove.api.entity.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 评论 Repository。
 * 提供基于帖子的查询方法。
 */
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * 根据帖子 ID 查询评论列表，按创建时间倒序。
     *
     * @param postId 帖子 ID
     * @return 评论列表
     */
    List<Comment> findByPostIdOrderByCreatedAtDesc(Long postId);
}
