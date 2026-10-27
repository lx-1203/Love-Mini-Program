package com.campuslove.api.admin;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.circle.AdminLayerRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 圈层数据域（Scope）服务 —— 「谁的」数据可见的第二条授权轴。
 *
 * <p>与 {@link AdminDataScope} 的关系（为什么并存而非替换）：</p>
 * <ul>
 *   <li>{@link AdminDataScope} 用「单个 {@code users.campus_name} 字符串」做校区隔离，
 *       已被 {@code admin/} 下 <b>33 个控制器</b> 调用（{@code getCurrentAdminCampusName()} /
 *       {@code assertCampusAccess(String)} 口径全是「一个校区名」）。圈层是一棵
 *       25 节点树（C1 公司 → C1/Rx 大区 → C1/Rx/Sy 学校），一个账号可绑定多个
 *       互不相邻的节点，无法压成「一个字符串」。</li>
 *   <li>设计方案确立：<b>功能角色</b>（能做什么）与<b>圈层</b>（看谁的）是两条正交轴，
 *       任意角色可绑任意节点。{@code AdminDataScope} 继续承担「校区」这条旧轴，
 *       本服务新增「圈层」这条新轴；两者并行，端点逐个迁移，避免一次性改动 33 处调用点
 *       带来的大面积回归风险。</li>
 *   <li><b>优先级（2026-10-14 裁定）</b>：账号一旦在 {@code admin_layer} 绑定了圈层，
 *       读取列表<b>以圈层为准</b>，不再叠加「管理员自身校区」当天花板——否则绑大区与绑本校
 *       结果相同，正交模型形同虚设。旧校区轴只在两种情况下继续生效：账号<b>未绑定</b>圈层
 *       （增量迁移期不放大可见性），以及调用方<b>显式</b>传入 {@code campusName} 做主动收窄。</li>
 *   <li>本服务目前只把圈层轴接进「帖子列表 / 用户列表」两个读端点（见
 *       {@code AdminVillagePostController#listPosts}、{@code AdminUserController#listUsers}），
 *       其余端点作为后续跟进项。{@link #inScope(String)} /
 *       {@link #assertInScope(String)} 供详情/写操作及后续迁移复用。</li>
 * </ul>
 *
 * <p>数据基础：{@code users.circle_path}、{@code posts.owner_circle_path}、
 * {@code private_messages.owner_circle_path} 均已回填且可按路径段匹配
 * （{@code = 节点 OR LIKE '节点/%'}，禁止裸 {@code LIKE '节点%'}：那会让 S1 命中 S14）。
 * NULL 表示「未归属」。</p>
 *
 * <p>解析失败一律 fail-closed：任何异常/账号不存在都收敛为「无可见前缀」（空列表），
 * 即看不到任何圈层数据，宁可不给也不放开全库。</p>
 */
@Service
@Profile("real")
public class AdminScopeService {

    private static final Logger log = LoggerFactory.getLogger(AdminScopeService.class);

    /** 顶层公司节点路径：持有它即等于全平台可见（含「未归属」数据）。 */
    public static final String GLOBAL_PREFIX = "C1";

    private final UserRepository userRepository;
    private final AdminLayerRepository adminLayerRepository;

    public AdminScopeService(UserRepository userRepository,
                             AdminLayerRepository adminLayerRepository) {
        this.userRepository = userRepository;
        this.adminLayerRepository = adminLayerRepository;
    }

    /**
     * 解析当前登录管理员的可见圈层前缀集合。
     *
     * <ul>
     *   <li>SUPER_ADMIN → {@code ["C1"]}（全平台）</li>
     *   <li>其它后台账号 → 其在 {@code admin_layer} 中绑定的圈层节点对应的 circle_path 列表</li>
     *   <li>未绑定任何圈层的账号 → <b>空列表</b>（而不是 {@code ["C1"]}）：圈层轴上无任何可见范围</li>
     *   <li>账号不存在 / 未认证 / 解析异常 → 空列表（fail-closed）</li>
     * </ul>
     *
     * @return 可见前缀列表（可能为空，绝不为 null）
     */
    public List<String> currentPrefixes() {
        try {
            Long userId = SecurityUtils.getCurrentUserIdOrNull();
            if (userId == null) {
                log.warn("圈层数据域解析：无法获取当前登录用户，收敛为空域（fail-closed）");
                return List.of();
            }
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                log.warn("圈层数据域解析：管理员不存在 userId={}，收敛为空域（fail-closed）", userId);
                return List.of();
            }
            User user = userOpt.get();
            if (AdminDataScope.ROLE_SUPER_ADMIN.equalsIgnoreCase(user.getRole())) {
                // 超级管理员恒为全平台可见
                return List.of(GLOBAL_PREFIX);
            }
            // 其余账号：完全以其在 admin_layer 绑定的节点为准；未绑定 → 空列表
            List<String> paths = adminLayerRepository.findCirclePathsByAdminId(userId);
            List<String> result = new ArrayList<>();
            for (String p : paths) {
                if (p != null && !p.isBlank()) {
                    result.add(p.trim());
                }
            }
            return List.copyOf(result);
        } catch (RuntimeException e) {
            log.warn("圈层数据域解析异常，收敛为空域（fail-closed）", e);
            return List.of();
        }
    }

    /**
     * 判断某归属圈层路径是否落在当前管理员的数据域内。
     *
     * <p>规则：</p>
     * <ul>
     *   <li>可见前缀为空 → 任何值都不可见（false）</li>
     *   <li>owner 为 null/空白（「未归属」数据）→ <b>仅</b>持有 {@code C1} 前缀者可见，
     *       绝不泄漏给校区/大区/学校等局部作用域</li>
     *   <li>否则 → owner 以某个前缀打头（{@code startsWith}）即命中</li>
     * </ul>
     *
     * @param ownerCirclePath 数据行的归属圈层路径（可能为 null）
     * @return true 表示当前管理员可见该数据
     */
    public boolean inScope(String ownerCirclePath) {
        List<String> prefixes = currentPrefixes();
        if (prefixes.isEmpty()) {
            return false;
        }
        if (ownerCirclePath == null || ownerCirclePath.isBlank()) {
            // 未归属数据只对全平台（C1）作用域放行
            return hasGlobalPrefix(prefixes);
        }
        String value = ownerCirclePath.trim();
        for (String prefix : prefixes) {
            if (isWithinScopePrefix(value, prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断圈层路径 {@code value} 是否落在前缀 {@code prefix} 的子树内（含节点自身）。
     *
     * <p>必须按 <b>路径段</b> 比较，不能用裸 {@code startsWith}：校区节点
     * {@code C1/R3/S1} 与另一校区 {@code C1/R3/S14} 在字符串上共享前缀，
     * 裸前缀匹配会把 S14 误判进 S1 的数据域（实测：北大管理员可读/可审
     * C1/R3/S14 的帖子）。大区节点 {@code C1/R3} 仍应覆盖其下全部
     * {@code C1/R3/S*}，因此允许 {@code prefix + "/"} 前缀。</p>
     *
     * @param value  资源归属圈层路径
     * @param prefix 管理员可见节点路径
     * @return true 表示同节点或在同节点的子树内
     */
    public static boolean isWithinScopePrefix(String value, String prefix) {
        if (value == null || prefix == null) {
            return false;
        }
        String v = value.trim();
        String p = prefix.trim();
        if (v.isEmpty() || p.isEmpty()) {
            return false;
        }
        while (p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        if (p.isEmpty()) {
            return false;
        }
        return v.equals(p) || v.startsWith(p + "/");
    }

    /**
     * 校验某归属圈层路径在当前管理员数据域内，否则抛 403。
     *
     * @param ownerCirclePath 数据行的归属圈层路径（可能为 null）
     * @throws OperationForbiddenException 越权时（HTTP 403，中文提示所需数据域）
     */
    public void assertInScope(String ownerCirclePath) {
        if (inScope(ownerCirclePath)) {
            return;
        }
        Long userId = SecurityUtils.getCurrentUserIdOrNull();
        List<String> prefixes = currentPrefixes();
        String scopeDesc = prefixes.isEmpty()
                ? "该账号未绑定任何圈层数据域（无可见范围）"
                : "当前可见圈层：" + String.join("、", prefixes);
        String ownerDesc = (ownerCirclePath == null || ownerCirclePath.isBlank())
                ? "未归属（NULL）"
                : ownerCirclePath.trim();
        log.warn("圈层数据域拦截：管理员 userId={} 尝试访问归属圈层 [{}]，{}",
                userId, ownerDesc, scopeDesc);
        throw new OperationForbiddenException(
                "越权访问：该数据归属圈层为 [" + ownerDesc + "]，不在你的数据域内。" + scopeDesc);
    }

    /**
     * 前缀集合是否包含全平台作用域 {@code C1}。
     */
    private boolean hasGlobalPrefix(List<String> prefixes) {
        for (String p : prefixes) {
            if (GLOBAL_PREFIX.equals(p)) {
                return true;
            }
        }
        return false;
    }
}
