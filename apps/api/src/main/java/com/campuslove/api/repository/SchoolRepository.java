package com.campuslove.api.repository;

import com.campuslove.api.entity.School;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 高校 Repository。
 */
public interface SchoolRepository extends JpaRepository<School, Long> {

    Optional<School> findByCode(String code);

    Optional<School> findByName(String name);

    /**
     * 批量按 ID 查询高校（管理后台视图批量预加载学校名，避免 N+1 查询）。
     *
     * @param ids 高校 ID 集合
     * @return 匹配的高校列表
     */
    List<School> findByIdIn(List<Long> ids);

    /**
     * 按状态查询高校（启用列表用于创建管理员时下拉）。
     *
     * @param status 状态（active/disabled）
     * @return 高校列表
     */
    List<School> findByStatusOrderBySortOrderAsc(String status);

    /**
     * 分页查询高校（名称/状态筛选）。
     *
     * @param keyword   名称/编码模糊关键字（可空）
     * @param status    状态筛选（可空）
     * @param pageable  分页参数
     * @return 分页高校列表
     */
    @Query("SELECT s FROM School s WHERE "
            + "(:keyword IS NULL OR s.name LIKE CONCAT('%', :keyword, '%') OR s.code LIKE CONCAT('%', :keyword, '%')) "
            + "AND (:status IS NULL OR s.status = :status)")
    Page<School> searchForAdmin(@Param("keyword") String keyword,
                                @Param("status") String status,
                                Pageable pageable);

    /**
     * 统计管辖校区名匹配该高校的管理员账号数。
     * <p>用于删除高校前校验：存在关联管理员时拒绝删除（避免孤儿数据）。</p>
     *
     * @param schoolName 高校名称（与 user.campus_name 对齐）
     * @return 关联管理员数
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.role IN ('ADMIN', 'SUPER_ADMIN') "
            + "AND u.campusName = :schoolName")
    long countByLinkedAdminName(@Param("schoolName") String schoolName);
}
