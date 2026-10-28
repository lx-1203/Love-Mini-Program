package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleTopicLike;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 圈子话题点赞 Repository。
 */
public interface CircleTopicLikeRepository extends JpaRepository<CircleTopicLike, Long> {

    boolean existsByTopicIdAndUserId(Long topicId, Long userId);

    long deleteByTopicIdAndUserId(Long topicId, Long userId);

    @Query("SELECT l.topicId FROM CircleTopicLike l WHERE l.userId = :userId AND l.topicId IN :topicIds")
    List<Long> findTopicIdsByUserIdAndTopicIdIn(@Param("userId") Long userId,
                                                @Param("topicIds") List<Long> topicIds);
}
