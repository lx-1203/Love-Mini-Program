package com.campuslove.api.repository;

import com.campuslove.api.entity.ConsultingCourse;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 咨询课程 Repository（3-I 咨询报名）。
 */
public interface ConsultingCourseRepository extends JpaRepository<ConsultingCourse, Long> {

    /**
     * 查询全部可报名课程（按价格升序）。
     *
     * @param status 状态（ConsultingCourse.STATUS_ONLINE）
     * @return 可报名课程列表
     */
    List<ConsultingCourse> findByStatusOrderByPriceAsc(int status);

    /** 内容版列表：排序优先，再按价格升序。 */
    List<ConsultingCourse> findByStatusOrderBySortOrderAscPriceAsc(int status);

    /** 管理后台列表：全部课程按排序/ID 升序。 */
    List<ConsultingCourse> findAllByOrderBySortOrderAscIdAsc();
}
