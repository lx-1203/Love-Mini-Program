package com.campuslove.api.repository;

import com.campuslove.api.entity.User;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
            ORDER BY u.createdAt DESC
            """)
    Page<User> searchForAdmin(
            @Param("role") String role,
            @Param("status") String status,
            @Param("createdAtFrom") LocalDateTime createdAtFrom,
            @Param("createdAtTo") LocalDateTime createdAtTo,
            @Param("nickname") String nickname,
            Pageable pageable);
}
