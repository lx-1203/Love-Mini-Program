package com.campuslove.api.repository;

import com.campuslove.api.entity.CampusTopic;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 校园话题 Repository。
 * 提供基于学校 ID 和分类的查询方法。
 */
public interface CampusTopicRepository extends JpaRepository<CampusTopic, Long> {

    /**
     * 根据学校 ID 查询话题列表，按创建时间倒序排列。
     *
     * @param schoolId 学校 ID
     * @return 话题列表
     */
    List<CampusTopic> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    /**
     * 根据学校 ID 和分类查询话题列表，按创建时间倒序排列。
     *
     * @param schoolId 学校 ID
     * @param category 话题分类
     * @return 话题列表
     */
    List<CampusTopic> findBySchoolIdAndCategoryOrderByCreatedAtDesc(Long schoolId, String category);

    /**
     * 统计指定学校的话题总数。
     *
     * @param schoolId 学校 ID
     * @return 话题总数
     */
    long countBySchoolId(Long schoolId);
}