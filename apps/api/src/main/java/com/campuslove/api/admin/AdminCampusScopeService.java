package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 校园管理员数据隔离服务（商业模式：每个高校一个管理员）。
 *
 * <p>轻量门面：统一委托给 {@link AdminDataScope} 获取当前管理员的管辖校区名，
 * 避免各管理端点直接依赖 UserRepository。</p>
 *
 * <p>语义：</p>
 * <ul>
 *   <li>null —— 全局管理员（SUPER_ADMIN 或 ADMIN 无校区），可见全部校区数据</li>
 *   <li>非空 —— 校区管理员，管理端点必须按该校区名过滤（数据隔离）</li>
 * </ul>
 */
@Service
// mock profile 无 AdminDataScope bean（数据隔离仅 real 模式生效）
@Profile("real")
public class AdminCampusScopeService {

    private static final Logger log = LoggerFactory.getLogger(AdminCampusScopeService.class);

    private final AdminDataScope adminDataScope;

    public AdminCampusScopeService(AdminDataScope adminDataScope) {
        this.adminDataScope = adminDataScope;
    }

    /**
     * 获取当前管理员的管辖校区名。
     *
     * @return 当前管理员为校区管理员时返回校区名（非空）；
     *         全局管理员返回 null
     */
    public String getCurrentAdminCampusName() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return null;
        }
        return adminDataScope.getCurrentAdminCampusName();
    }
}
