package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleTopicLikeNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** 话题点赞通知去重仓库（2026-10-28）。 */
@Repository
public interface CircleTopicLikeNoticeRepository extends JpaRepository<CircleTopicLikeNotice, Long> {

    boolean existsByTopicIdAndUserId(Long topicId, Long userId);
}
