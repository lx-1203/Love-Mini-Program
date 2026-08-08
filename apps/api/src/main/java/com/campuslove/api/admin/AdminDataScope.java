package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 管理端数据范围（DataScope）服务 —— 多管理员多校区数据隔离核心。
 *
 * <p>商业模式「每个高校一个管理员」：管理员账号在 users 表中以
 * {@code role + campus_name} 标识管辖范围：</p>
 * <ul>
 *   <li><b>SUPER_ADMIN</b>：全局超级管理员，可见全部校区数据，不强制过滤</li>
 *   <li><b>ADMIN + campusName 非空</b>：校区管理员，list/query 端点必须
 *       按其 campusName 过滤（数据隔离），写操作越权返回 403</li>
 *   <li><b>ADMIN + campusName 为空</b>：全局运营管理员，不过滤（兼容旧账号）</li>
 * </ul>
 *
 * <p>用法：</p>
 * <ul>
 *   <li>查询：{@link #getCurrentAdminCampusName()} 非 null 时把返回的校区名注入查询条件</li>
 *   <li>写操作：{@link #assertCampusAccess(String)} 校验目标资源 campusName
 *       与当前管理员管辖范围匹配，不匹配抛 {@link OperationForbiddenException}（HTTP 403）</li>
 * </ul>
 */
@Service
// mock profile 无 UserRepository bean（无 JPA），数据隔离仅 real 模式生效
@Profile("real")
public class AdminDataScope {

    private static final Logger log = LoggerFactory.getLogger(AdminDataScope.class);

    /** 超级管理员角色编码 */
    public static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";

    /** 校区管理员角色编码 */
    public static final String ROLE_ADMIN = "ADMIN";

    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;

    public AdminDataScope(UserRepository userRepository,
                          UserCampusProfileRepository userCampusProfileRepository) {
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
    }

    /**
     * 获取当前管理员管辖校区名。
     *
     * @return 当前管理员为校区管理员（ADMIN 且 campusName 非空）时返回校区名；
     *         全局管理员（SUPER_ADMIN 或 ADMIN 无校区）返回 null
     */
    public String getCurrentAdminCampusName() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return null;
        }
        return resolveCampusName(userId);
    }

    /**
     * 判断当前管理员是否为超级管理员（SUPER_ADMIN）。
     *
     * @return true 表示当前管理员为超级管理员
     */
    public boolean isCurrentSuperAdmin() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return false;
        }
        Optional<User> userOpt = userRepository.findById(userId);
        return userOpt.map(u -> ROLE_SUPER_ADMIN.equalsIgnoreCase(u.getRole())).orElse(false);
    }

    /**
     * 校验当前管理员对指定校区资源的访问权（写操作越权拦截）。
     *
     * <p>规则：</p>
     * <ul>
     *   <li>当前管理员为全局管理员（SUPER_ADMIN 或 ADMIN 无校区）→ 放行</li>
     *   <li>当前管理员为校区管理员：
     *       <ul>
     *         <li>目标资源 campusName 为 null（全局资源，如系统配置）→ 放行</li>
     *         <li>目标资源 campusName 等于管辖校区 → 放行</li>
     *         <li>否则 → 抛 {@link OperationForbiddenException}（HTTP 403）</li>
     *       </ul>
     *   </li>
     * </ul>
     *
     * @param targetCampusName 目标资源的校区名（可为 null 表示全局资源）
     * @throws OperationForbiddenException 校区管理员访问其他校区资源时
     */
    public void assertCampusAccess(String targetCampusName) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return;
        }
        String myCampus = resolveCampusName(userId);
        if (myCampus == null) {
            // 全局管理员（SUPER_ADMIN 或 ADMIN 无校区），无需过滤
            return;
        }
        if (targetCampusName == null || targetCampusName.isBlank()) {
            // 目标为全局资源，校区管理员可管理
            return;
        }
        if (!myCampus.equalsIgnoreCase(targetCampusName.trim())) {
            log.warn("数据隔离拦截：管理员 userId={} 管辖校区 [{}] 尝试操作校区 [{}] 的资源",
                    userId, myCampus, targetCampusName);
            throw new OperationForbiddenException(ErrorMessages.CAMPUS_ADMIN_SCOPE_FORBIDDEN);
        }
    }

    /**
     * 解析指定管理员账号的管辖校区名。
     *
     * @param userId 管理员用户 ID
     * @return 校区名（ADMIN 且 campusName 非空时）；全局管理员返回 null
     */
    private String resolveCampusName(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.warn("当前管理员不存在: userId={}", userId);
            return null;
        }
        User user = userOpt.get();
        // 超级管理员恒为全局（即使误设 campusName 也按全局处理）
        if (ROLE_SUPER_ADMIN.equalsIgnoreCase(user.getRole())) {
            return null;
        }
        String campusName = user.getCampusName();
        if (campusName == null || campusName.isBlank()) {
            return null;
        }
        return campusName.trim();
    }

    /**
     * 解析普通用户归属校区名（用于商业数据写操作越权校验）。
     *
     * <p>普通用户（role=USER）的 users.campus_name 恒为 null，校区信息存于
     * {@code user_campus_profile} 表；未认证校区信息时返回 null（按全局资源处理）。</p>
     *
     * @param userId 用户 ID
     * @return 校区名（可能为 null）
     */
    public String resolveUserCampusName(Long userId) {
        if (userId == null) {
            return null;
        }
        return userCampusProfileRepository.findByUserId(userId)
                .map(UserCampusProfile::getCampusName)
                .orElse(null);
    }
}
