package com.campuslove.api.repository;

import com.campuslove.api.entity.InterestCircle;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 兴趣圈 Repository。
 * 提供按排序权重查询的方法。
 */
public interface InterestCircleRepository extends JpaRepository<InterestCircle, Long> {

    /**
     * 查询所有兴趣圈，按排序权重升序。
     *
     * @return 兴趣圈列表
     */
    List<InterestCircle> findAllByOrderBySortOrderAsc();

    /**
     * 根据圈名查询兴趣圈（管理后台新增/编辑时唯一性校验）。
     *
     * @param name 圈名
     * @return 匹配的兴趣圈（可能为空）
     */
    Optional<InterestCircle> findByName(String name);

    /**
     * 管理后台 - 兴趣圈分页查询（圈名/描述模糊筛选，按排序权重升序）。
     *
     * @param keyword  圈名/描述模糊关键字，可空
     * @param pageable 分页参数
     * @return 分页兴趣圈列表
     */
    @Query("""
            SELECT c FROM InterestCircle c
            WHERE (:keyword IS NULL OR :keyword = '' OR c.name LIKE CONCAT('%', :keyword, '%')
                   OR c.description LIKE CONCAT('%', :keyword, '%'))
            ORDER BY c.sortOrder ASC, c.id ASC
            """)
    Page<InterestCircle> searchForAdmin(
            @Param("keyword") String keyword,
            Pageable pageable);
}
