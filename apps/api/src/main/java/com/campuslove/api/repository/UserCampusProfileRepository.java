package com.campuslove.api.repository;

import com.campuslove.api.entity.UserCampusProfile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * 用户校园资料 Repository。
 * 提供基于用户 ID 的查询方法。
 */
public interface UserCampusProfileRepository extends JpaRepository<UserCampusProfile, Long> {

    /**
     * 根据用户 ID 查询校园资料。
     *
     * @param userId 用户 ID
     * @return 匹配的校园资料（可能为空）
     */
    Optional<UserCampusProfile> findByUserId(Long userId);

    /**
     * 根据多个用户 ID 批量查询校园资料。
     * 用于批量预加载，避免 N+1 查询问题。
     *
     * @param userIds 用户 ID 列表
     * @return 校园资料列表
     */
    List<UserCampusProfile> findByUserIdIn(List<Long> userIds);

    /**
     * 按校区名称分组统计用户数（用于管理后台学校分布统计）。
     *
     * @return 每个校区对应的用户数
     */
    @Query("SELECT u.campusName AS field, COUNT(u) AS cnt FROM UserCampusProfile u GROUP BY u.campusName")
    List<FieldCountProjection> countGroupByCampusName();

    /**
     * 按城市名称分组统计用户数。
     *
     * @return 每个城市对应的用户数
     */
    @Query("SELECT u.cityName AS field, COUNT(u) AS cnt FROM UserCampusProfile u GROUP BY u.cityName")
    List<FieldCountProjection> countGroupByCityName();

    /**
     * 查询所有去重后的校区（学校）名称。
     * 用于校园列表缓存场景，避免在 Service 层做内存去重。
     * 仅返回非空的 campusName，按名称升序排列。
     *
     * @return 去重后的校区名称列表
     */
    @Query("SELECT DISTINCT u.campusName FROM UserCampusProfile u WHERE u.campusName IS NOT NULL AND u.campusName <> '' ORDER BY u.campusName ASC")
    List<String> findDistinctCampusNames();
}
