package com.campuslove.api.repository;

import com.campuslove.api.entity.User;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 用户主表 Repository。
 * 提供基于 openid 的查询方法。
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * 根据微信 openid 查询用户。
     *
     * @param openid 微信 openid
     * @return 匹配的用户（可能为空）
     */
    Optional<User> findByOpenid(String openid);

    /**
     * 按手机号查询用户(注册/手机号登录用,infra R2 联调新增)。
     *
     * @param phone 手机号
     * @return 匹配的用户(可能为空)
     */
    Optional<User> findByPhone(String phone);

    /**
     * 查询已开启自动续费的全部用户（R4-00316：定时续费扫描）。
     *
     * <p>AutoRenewService 的 @Scheduled 任务据此扫描「VIP 24 小时内到期」的用户
     * 并触发 {@code renewVip}，使自动续费开关真正生效（此前 renewVip 无任何调用方）。</p>
     *
     * @return 已开启自动续费的用户列表
     */
    java.util.List<User> findByAutoRenewEnabledTrue();

    /**
     * 推荐候选池分页查询（P0-21）。
     *
     * <p>仅返回可被推荐的普通用户：status=active（账号可用）、role=USER
     * （排除 ADMIN/SUPER_ADMIN，管理员账号不进入匹配候选池）。</p>
     *
     * @param status   账号状态（active/disabled）
     * @param role     用户角色（USER）
     * @param pageable 分页参数
     * @return 候选用户分页列表
     */
    Page<User> findByStatusAndRole(String status, String role, Pageable pageable);

    /**
     * 批量按 ID 查询用户（用于列表/详情视图批量预加载作者，避免 N+1 查询）。
     *
     * @param userIds 用户 ID 集合
     * @return 匹配的用户列表
     */
    java.util.List<User> findByIdIn(java.util.List<Long> ids);

    /**
     * 统计指定时间之后注册的用户数（用于新增用户统计）。
     *
     * @param since 起始时间
     * @return 新增用户数
     */
    long countByCreatedAtAfter(LocalDateTime since);

    /**
     * 统计指定时间范围内注册的用户数。
     *
     * @param from 起始时间
     * @param to   结束时间
     * @return 用户数
     */
    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    /**
     * 按代词偏好（pronouns，用作性别近似字段）分组统计用户数。
     * 用于管理后台性别比统计。
     *
     * @return 每种 pronouns 对应的用户数
     */
    @Query("SELECT u.pronouns AS field, COUNT(u) AS cnt FROM User u GROUP BY u.pronouns")
    java.util.List<FieldCountProjection> countGroupByPronouns();

    /**
     * 按年级标签分组统计用户数。
     *
     * @return 每种 gradeLabel 对应的用户数
     */
    @Query("SELECT u.gradeLabel AS field, COUNT(u) AS cnt FROM User u GROUP BY u.gradeLabel")
    java.util.List<FieldCountProjection> countGroupByGradeLabel();

    /**
     * 管理后台用户搜索（多条件分页）。
     * <p>所有筛选条件均可为 null（不参与筛选），按注册时间倒序排列。
     * 支持按 role（USER/ADMIN）、status（active/disabled）、注册时间范围、昵称模糊匹配筛选。</p>
     *
     * @param role          角色筛选（可空）
     * @param status        状态筛选（可空，active/disabled）
     * @param createdAtFrom 注册起始时间（可空）
     * @param createdAtTo   注册结束时间（可空）
     * @param nickname      昵称模糊匹配（可空）
     * @param pageable      分页
     * @return 分页用户列表
     */
    @Query("""
            SELECT u FROM User u
            WHERE (:role IS NULL OR u.role = :role)
              AND (:status IS NULL OR u.status = :status)
              AND (:createdAtFrom IS NULL OR u.createdAt >= :createdAtFrom)
              AND (:createdAtTo IS NULL OR u.createdAt <= :createdAtTo)
              AND (:nickname IS NULL OR :nickname = '' OR u.nickname LIKE CONCAT('%', :nickname, '%'))
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile p
                    WHERE p.userId = u.id AND p.campusName = :campusName))
            ORDER BY u.createdAt DESC
            """)
    Page<User> searchForAdmin(
            @Param("role") String role,
            @Param("status") String status,
            @Param("createdAtFrom") LocalDateTime createdAtFrom,
            @Param("createdAtTo") LocalDateTime createdAtTo,
            @Param("nickname") String nickname,
            @Param("campusName") String campusName,
            Pageable pageable);

    /**
     * 分页查询全部管理员（ADMIN + SUPER_ADMIN）。
     *
     * <p>修复：AdminUserController.listAdmins 原对 ADMIN/SUPER_ADMIN 各查一页后
     * 内存合并，单页最多返回 2×pageSize 条、跨页全局排序不成立、可能重复/遗漏。
     * 本方法一次查询同时覆盖两类角色，保证分页语义正确。</p>
     *
     * @param nickname   昵称模糊匹配（可空）
     * @param campusName 管辖校区筛选（可空，匹配 UserCampusProfile.campusName）
     * @param pageable   分页
     * @return 分页管理员列表（按注册时间倒序）
     */
    @Query("""
            SELECT u FROM User u
            WHERE u.role IN ('ADMIN', 'SUPER_ADMIN')
              AND (:nickname IS NULL OR :nickname = '' OR u.nickname LIKE CONCAT('%', :nickname, '%'))
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile p
                    WHERE p.userId = u.id AND p.campusName = :campusName))
            ORDER BY u.createdAt DESC
            """)
    Page<User> searchAllAdmins(
            @Param("nickname") String nickname,
            @Param("campusName") String campusName,
            Pageable pageable);

    // ---- 关注/粉丝计数原子更新（infra R2-00263，消除并发丢失更新） ----

    @Modifying
    @Query("UPDATE User u SET u.followingCount = COALESCE(u.followingCount, 0) + 1, "
            + "u.updatedAt = :now WHERE u.id = :id")
    int incrementFollowingCount(@Param("id") Long id, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE User u SET u.followersCount = COALESCE(u.followersCount, 0) + 1, "
            + "u.updatedAt = :now WHERE u.id = :id")
    int incrementFollowersCount(@Param("id") Long id, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE User u SET u.followingCount = CASE "
            + "WHEN COALESCE(u.followingCount, 0) > 0 THEN u.followingCount - 1 ELSE 0 END, "
            + "u.updatedAt = :now WHERE u.id = :id")
    int decrementFollowingCount(@Param("id") Long id, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE User u SET u.followersCount = CASE "
            + "WHEN COALESCE(u.followersCount, 0) > 0 THEN u.followersCount - 1 ELSE 0 END, "
            + "u.updatedAt = :now WHERE u.id = :id")
    int decrementFollowersCount(@Param("id") Long id, @Param("now") LocalDateTime now);
}
