package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleReply;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 圈子回复 Repository。
 * 提供基于话题的查询方法。
 */
public interface CircleReplyRepository extends JpaRepository<CircleReply, Long> {

    /**
     * 根据话题 ID 查询回复列表，按创建时间倒序。
     *
     * @param topicId 话题 ID
     * @return 回复列表
     */
    List<CircleReply> findByTopicIdOrderByCreatedAtDesc(Long topicId);
}
