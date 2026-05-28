package com.campuslove.api.repository;

import com.campuslove.api.entity.CampusTopicReply;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 校园话题回复 Repository。
 * 提供基于话题 ID 的查询方法。
 */
public interface CampusTopicReplyRepository extends JpaRepository<CampusTopicReply, Long> {

    /**
     * 根据话题 ID 查询回复列表，按创建时间升序排列。
     *
     * @param topicId 话题 ID
     * @return 回复列表
     */
    List<CampusTopicReply> findByTopicIdOrderByCreatedAtAsc(Long topicId);

    /**
     * 统计指定话题的回复总数。
     *
     * @param topicId 话题 ID
     * @return 回复总数
     */
    long countByTopicId(Long topicId);
}