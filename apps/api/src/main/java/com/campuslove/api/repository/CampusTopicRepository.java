package com.campuslove.api.repository;

import com.campuslove.api.entity.CampusTopic;
import com.campuslove.api.entity.CampusTopic.TopicStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * 管理后台 - 校园圈话题多条件分页查询。
     * <p>支持学校（校区隔离）、状态（active/deleted/hidden）与关键字
     * （标题/内容模糊）筛选，按创建时间倒序排列。</p>
     *
     * @param schoolId 学校 ID 筛选（校区隔离时必填），null 表示不筛选
     * @param status   话题状态筛选，null 表示不筛选
     * @param keyword  标题/内容模糊关键字，可空
     * @param pageable 分页参数
     * @return 分页话题列表
     */
    @Query("""
            SELECT t FROM CampusTopic t
            WHERE (:schoolId IS NULL OR t.schoolId = :schoolId)
              AND (:status IS NULL OR t.status = :status)
              AND (:keyword IS NULL OR :keyword = '' OR t.title LIKE CONCAT('%', :keyword, '%')
                   OR t.content LIKE CONCAT('%', :keyword, '%'))
            ORDER BY t.createdAt DESC
            """)
    Page<CampusTopic> searchForAdmin(
            @Param("schoolId") Long schoolId,
            @Param("status") TopicStatus status,
            @Param("keyword") String keyword,
            Pageable pageable);
}