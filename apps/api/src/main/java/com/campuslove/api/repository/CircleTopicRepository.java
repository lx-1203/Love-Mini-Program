package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleTopic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 圈子话题 Repository。
 * 提供基于圈子的分页查询方法，支持置顶优先排序。
 */
public interface CircleTopicRepository extends JpaRepository<CircleTopic, Long> {

    /**
     * 根据圈子 ID 查询话题，置顶优先，然后按创建时间倒序分页。
     *
     * @param circleId 圈子 ID
     * @param pageable 分页参数
     * @return 分页话题列表
     */
    Page<CircleTopic> findByCircleIdOrderByIsPinnedDescCreatedAtDesc(Long circleId, Pageable pageable);
}
