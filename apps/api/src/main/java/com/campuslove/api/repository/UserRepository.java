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
     * R4-00349：候选用户 ID 投影分页查询（仅取 ID 列）。
     *
     * <p>匹配引擎 {@code findAndScoreCandidates} 对候选评分时只依赖 ID 与三类档案
     * （校区/兴趣/日程，另有批量预加载），无需加载候选 User 实体的大字段；
     * 仅对最终选中的 Top-N 候选再按 ID 加载完整实体，降低匹配请求的 DB 载荷。</p>
     *
     * @param pageable 分页参数
     * @return 候选用户 ID 分页列表
     */
    @Query("SELECT u.id FROM User u")
    Page<Long> findCandidateIds(Pageable pageable);

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

    // ---- R4-00393：校区隔离统计（校区管理员仅可查看本校区数据） ----

    /**
     * 统计指定校区用户总数（R4-00393 校区隔离）。
     *
     * @param campusName 校区名称
     * @return 该校区用户数
     */
    @Query("SELECT COUNT(u) FROM User u WHERE EXISTS (SELECT 1 FROM UserCampusProfile p WHERE p.userId = u.id AND p.campusName = :campusName)")
    long countByCampusName(@Param("campusName") String campusName);

    /**
     * 统计指定校区在指定时间后注册的用户数（R4-00393 校区隔离）。
     *
     * @param since      起始时间
     * @param campusName 校区名称
     * @return 该校区新增用户数
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :since AND EXISTS (SELECT 1 FROM UserCampusProfile p WHERE p.userId = u.id AND p.campusName = :campusName)")
    long countByCreatedAtAfterAndCampusName(@Param("since") LocalDateTime since,
                                            @Param("campusName") String campusName);

    /**
     * 按 pronouns 分组统计指定校区用户数（R4-00393 校区隔离性别比）。
     *
     * @param campusName 校区名称
     * @return 该校区每种 pronouns 对应的用户数
     */
    @Query("SELECT u.pronouns AS field, COUNT(u) AS cnt FROM User u "
            + "WHERE EXISTS (SELECT 1 FROM UserCampusProfile p WHERE p.userId = u.id AND p.campusName = :campusName) "
            + "GROUP BY u.pronouns")
    java.util.List<FieldCountProjection> countGroupByPronounsByCampus(@Param("campusName") String campusName);

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
     * 支持按 role（USER/ADMIN）、status（active/disabled）、注册时间范围、昵称匹配筛选。</p>
     *
     * <p>R4-00384：昵称条件由 {@code LIKE '%x%'} 中缀通配改为 {@code LIKE 'x%'}
     * 前缀匹配——中缀通配符无法命中普通 B-Tree 索引（数据量大时全表扫描），
     * 前缀匹配可走索引；代价是仅匹配昵称开头（管理端按昵称前缀搜索语义足够）。</p>
     *
     * @param role          角色筛选（可空）
     * @param status        状态筛选（可空，active/disabled）
     * @param createdAtFrom 注册起始时间（可空）
     * @param createdAtTo   注册结束时间（可空）
     * @param nickname      昵称前缀匹配（可空）
     * @param pageable      分页
     * @return 分页用户列表
     */
    @Query("""
            SELECT u FROM User u
            WHERE (:role IS NULL OR u.role = :role)
              AND (:status IS NULL OR u.status = :status)
              AND (:createdAtFrom IS NULL OR u.createdAt >= :createdAtFrom)
              AND (:createdAtTo IS NULL OR u.createdAt <= :createdAtTo)
              AND (:nickname IS NULL OR :nickname = '' OR u.nickname LIKE CONCAT(:nickname, '%'))
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
     * <p>R4-00384：昵称条件同样改为前缀匹配（命中索引，避免全表扫描）。</p>
     *
     * @param nickname   昵称前缀匹配（可空）
     * @param campusName 管辖校区筛选（可空，匹配 UserCampusProfile.campusName）
     * @param pageable   分页
     * @return 分页管理员列表（按注册时间倒序）
     */
    @Query("""
            SELECT u FROM User u
            WHERE u.role IN ('ADMIN', 'SUPER_ADMIN')
              AND (:nickname IS NULL OR :nickname = '' OR u.nickname LIKE CONCAT(:nickname, '%'))
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile p
                    WHERE p.userId = u.id AND p.campusName = :campusName))
            ORDER BY u.createdAt DESC
            """)
    Page<User> searchAllAdmins(
            @Param("nickname") String nickname,
            @Param("campusName") String campusName,
            Pageable pageable);

    // ---- B10（2026-08-10）：C 端用户搜索 ----

    /**
     * 用户搜索（按昵称/校区名中缀匹配），仅返回可被搜索的普通用户。
     *
     * <p>约束：status=active（账号可用）、role=USER（排除管理员，与推荐候选池口径一致）。
     * 中缀 LIKE（%x%）无法命中 B-Tree 索引——校园规模下可接受；
     * 数据量增长时的扩展路径：改前缀匹配（LIKE 'x%' 走索引，代价是仅匹配开头）
     * 或引入全文索引/ES（UserIndexSyncListener 预留桩）。</p>
     *
     * @param keyword  搜索关键词（昵称或校区名中缀）
     * @param status   账号状态（active）
     * @param role     用户角色（USER）
     * @param pageable 分页参数
     * @return 分页用户列表（按资料完整度降序、注册时间降序）
     */
    @Query("""
            SELECT u FROM User u
            WHERE (u.nickname LIKE CONCAT('%', :keyword, '%')
                   OR u.campusName LIKE CONCAT('%', :keyword, '%'))
              AND u.status = :status
              AND u.role = :role
            ORDER BY u.profileCompletion DESC, u.createdAt DESC
            """)
    Page<User> searchByKeyword(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("role") String role,
            Pageable pageable);

    // ---- 关注/粉丝计数原子更新（infra R2-00263，消除并发丢失更新） ----

    @Modifying
    @Query("UPDATE User u SET u.followingCount = COALESCE(u.followingCount, 0) + 1, "
            + "u.updatedAt = :now WHERE u.id = :id")
    int incrementFollowingCount(@Param("id") Long id, @Param("now") LocalDateTime now);

    /**
     * R4-00296：查询用户最新关注数（JPQL 查询执行前自动 flush，
     * 返回原子递增后的 DB 值，而非持久化上下文的陈旧实体值）。
     */
    @Query("SELECT COALESCE(u.followingCount, 0) FROM User u WHERE u.id = :id")
    int findFollowingCountById(@Param("id") Long id);

    /**
     * R4-00296：查询用户最新粉丝数（同上）。
     */
    @Query("SELECT COALESCE(u.followersCount, 0) FROM User u WHERE u.id = :id")
    int findFollowersCountById(@Param("id") Long id);

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
