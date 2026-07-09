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
}
