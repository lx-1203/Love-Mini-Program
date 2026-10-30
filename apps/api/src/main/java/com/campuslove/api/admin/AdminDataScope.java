package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
 *   <li><b>ADMIN + campusName 为空</b>：历史「全局运营管理员」兼容分支<b>已收紧为
 *       fail-closed</b>——空校区的 ADMIN 一律按 {@link #NO_CAMPUS_SCOPE} 收敛为
 *       「读不到任何校区数据」，不再退化成一个放开全库的准超级账号。
 *       （圈层轴的可见性由 {@link AdminScopeService} 另行判定；本类只负责校区这条旧轴）</li>
 *   <li><b>AUDITOR</b>：只读审核员，<b>恒按 campusName 过滤</b>——本类不承认「全局审核员」，
 *       campusName 为空的 AUDITOR 视为异常账号，按 {@link #NO_CAMPUS_SCOPE} 收敛为「读不到任何校区数据」</li>
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

    /** {@link #resolveUserCampusNames(Collection)} 单次 IN 查询的 id 上限，避免超长 IN 子句 */
    private static final int CAMPUS_BATCH_SIZE = 500;

    /** 超级管理员角色编码 */
    public static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";

    /** 校区管理员角色编码 */
    public static final String ROLE_ADMIN = "ADMIN";

    /** 只读审核员角色编码（三级角色 AUDITOR：可读、不可写） */
    public static final String ROLE_AUDITOR = "AUDITOR";

    /**
     * 「无管辖校区」哨兵值。
     *
     * <p>本类用 null 表示「全局管理员、不做任何过滤」，但该语义现在<b>只</b>保留给
     * SUPER_ADMIN。空校区的 ADMIN 与空校区的 AUDITOR 都返回本哨兵：</p>
     * <ul>
     *   <li>AUDITOR 无「全局放行」语义——campus_name 为空的只读账号若返回 null，
     *       会退化成可读全部校区的越权账号；</li>
     *   <li>ADMIN 空校区是旧的「全局运营管理员」兼容分支，属同类越权隐患，已一并
     *       收紧为 fail-closed。</li>
     * </ul>
     * <p>故对这两类账号返回本哨兵（不可能等于任何真实校区名），使读查询过滤到空集、
     * 越权校验一律拒绝 —— 即宁可不给数据，也不放开全库。</p>
     *
     * <p><b>安全说明</b>：本哨兵值字符串刻意保留 {@code AUDITOR} 字样以兼容既有测试/断言，
     * 其语义已扩展至空校区 ADMIN，命名不再精确但未改名以避免波及 33 处调用点。
     * 当前<b>生产库不存在任何空校区的 ADMIN 账号</b>，故本次收紧不会把在用管理员挡在门外。</p>
     */
    public static final String NO_CAMPUS_SCOPE = "__AUDITOR_NO_CAMPUS__";

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
     * @return 当前管理员为校区管理员（ADMIN 且 campusName 非空）或审核员（AUDITOR 且 campusName 非空）
     *         时返回校区名；超级管理员（SUPER_ADMIN）返回 null（全局不过滤）；
     *         campus_name 为空的 ADMIN / AUDITOR（异常账号）返回 {@link #NO_CAMPUS_SCOPE}，
     *         即读不到任何校区数据（fail-closed）
     */
    public String getCurrentAdminCampusName() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return null;
        }
        return resolveCampusName(userId);
    }

    /**
     * 解析「允许写进业务表的归属校区」（S2-2，2026-10-30）。
     *
     * <p>不能用 {@link #getCurrentAdminCampusName()} 的返回值直接落库：那个方法在
     * 空校区的 ADMIN / AUDITOR 情形返回内部哨兵 {@link #NO_CAMPUS_SCOPE}，作用是让<b>读</b>
     * 查询收敛成空集。写路径照抄那句三元表达式，哨兵字符串就被写进了
     * {@code activities.campus_name} / {@code shop_items.campus_name} —— 记录随即对所有
     * 校区管理员不可见，也无人能从界面上把它改回来（改归属仍会走同一个错误分支）。</p>
     *
     * <p>规则集中在这里：哨兵作用域一律 403（fail-closed，绝不落库）；校区管理员一律写
     * 自己的校区（与改造前一致，请求体里的校区名对其不生效）；只有超级管理员按请求体归属；
     * 拿不到认证上下文时按最小权限拒绝——后台写接口都在 {@code @PreAuthorize} 之后，
     * 走到那一步本身就是异常，不能退化成"超管语义"而放开任意校区写入。</p>
     *
     * @param requestedCampusName 请求体里的归属校区（仅对超级管理员生效）
     * @return 允许落库的校区名（超管未指定时可为 null，表示全局/未归属）
     * @throws OperationForbiddenException 当前账号没有可写的校区作用域
     */
    public String resolveCampusForWrite(String requestedCampusName) {
        // 未认证走不到这里：SecurityUtils.getCurrentUserId() 自己就抛 401（fail-closed），
        // 因此本方法只需要处理"已认证但作用域异常"的账号。
        Long userId = SecurityUtils.getCurrentUserId();
        String myCampus = resolveCampusName(userId);
        if (NO_CAMPUS_SCOPE.equals(myCampus)) {
            log.warn("写入归属校区被拒绝：userId={} 无管辖校区，内部哨兵不得落库", userId);
            throw new OperationForbiddenException(ErrorMessages.CAMPUS_ADMIN_SCOPE_FORBIDDEN);
        }
        if (myCampus == null) {
            // 超级管理员：按请求体归属（与改造前一致）
            return requestedCampusName;
        }
        return myCampus;
    }

    /** 判断给定校区名是否为本类的内部哨兵（S2-2：写路径与门禁用它排除哨兵）。 */
    public static boolean isNoCampusScope(String campusName) {
        return NO_CAMPUS_SCOPE.equals(campusName);
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
     *   <li>当前管理员为超级管理员（SUPER_ADMIN）→ 放行</li>
     *   <li>当前账号为无校区的 ADMIN 或 AUDITOR（异常配置）→ 一律拒绝（见 {@link #NO_CAMPUS_SCOPE}）</li>
     *   <li>当前管理员为校区管理员 / 有校区的 AUDITOR：
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
        if (NO_CAMPUS_SCOPE.equals(myCampus)) {
            // 审核员无「全局放行」语义：campus_name 为空的 AUDITOR 属异常账号，
            // 一律拒绝（fail-closed），避免它退化成可读全库的超级管理员
            log.warn("数据隔离拦截：AUDITOR userId={} 未配置管辖校区，拒绝任何校区资源访问", userId);
            throw new OperationForbiddenException(ErrorMessages.CAMPUS_ADMIN_SCOPE_FORBIDDEN);
        }
        if (myCampus == null) {
            // 仅 SUPER_ADMIN 走到这里（空校区 ADMIN/AUDITOR 已返回 NO_CAMPUS_SCOPE 被上面拒绝），
            // 全局管理员无需过滤
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
     * @return 校区名（ADMIN 且 campusName 非空，或 AUDITOR 且 campusName 非空时）；
     *         超级管理员返回 null；无校区的 ADMIN / AUDITOR 返回 {@link #NO_CAMPUS_SCOPE}
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
            // 空校区一律 fail-closed，不再进入「全局不过滤」分支（那等于给非超级管理员放开全库）：
            // - AUDITOR 空校区：只读账号本就无全局语义；
            // - ADMIN 空校区：旧的「全局运营管理员」兼容分支，属同类越权隐患，已收紧。
            // SUPER_ADMIN 已在上方提前返回 null，不受此分支影响（行为逐字节不变）。
            // 注意：当前生产库无任何空校区 ADMIN 账号，本次收紧不会锁死在用管理员。
            return NO_CAMPUS_SCOPE;
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

    /**
     * 批量解析用户归属校区名（列表接口按校区做数据隔离时使用）。
     *
     * <p>语义与 {@link #resolveUserCampusName(Long)} 逐条调用等价：无校区资料的
     * userId 不会出现在返回 Map 中，调用方取到 null 即视为「不属于任何校区」。
     * 区别只在查询次数 —— 列表接口原先每行一次 {@code findByUserId}，
     * 一页 100 条就是 100 次往返（N+1），这里压成每 {@code CAMPUS_BATCH_SIZE}
     * 个 id 一次 IN 查询。分批是为了不把整页 id 塞进单条 SQL 的 IN 子句。</p>
     *
     * @param userIds 用户 ID 集合（允许含 null，允许为空）
     * @return userId → campusName；无资料的 userId 不在 Map 中
     */
    public Map<Long, String> resolveUserCampusNames(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<Long> distinct = userIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, String> campusByUserId = new HashMap<>();
        for (int from = 0; from < distinct.size(); from += CAMPUS_BATCH_SIZE) {
            List<Long> batch = distinct.subList(from, Math.min(from + CAMPUS_BATCH_SIZE, distinct.size()));
            for (UserCampusProfile profile : userCampusProfileRepository.findByUserIdIn(batch)) {
                if (profile.getUserId() != null && profile.getCampusName() != null) {
                    campusByUserId.putIfAbsent(profile.getUserId(), profile.getCampusName());
                }
            }
        }
        return campusByUserId;
    }
}
