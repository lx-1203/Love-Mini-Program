package com.campuslove.api.repository;

import com.campuslove.api.entity.PostShare;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
