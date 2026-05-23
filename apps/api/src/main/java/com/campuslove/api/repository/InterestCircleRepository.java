package com.campuslove.api.repository;

import com.campuslove.api.entity.InterestCircle;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
