package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 校园管理员数据隔离服务（商业模式：每个高校一个管理员）。
 *
 * <p>管理员账号在 users 表中以 {@code campus_name} 标识管辖范围：
 * <ul>
 *   <li>null —— 全局管理员（SUPER_ADMIN 或全局 ADMIN），可见全部校区数据</li>
 *   <li>非空 —— 校区管理员，管理端点必须按该校区名过滤（数据隔离）</li>
 * </ul>
 * </p>
 *
 * <p>用法：管理端点查询用户/内容时调用 {@link #getCurrentAdminCampusName()}，
 * 非 null 时把返回的校区名注入查询条件；校区管理员不可越权查看其他校区。</p>
 */
@Service
public class AdminCampusScopeService {

    private static final Logger log = LoggerFactory.getLogger(AdminCampusScopeService.class);

    private final UserRepository userRepository;

    public AdminCampusScopeService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 获取当前管理员的管辖校区名。
     *
     * @return 当前管理员为校区管理员时返回校区名（非空）；
     *         全局管理员（campus_name 为 null/空白）返回 null
     */
    public String getCurrentAdminCampusName() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return null;
        }
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.warn("当前管理员不存在: userId={}", userId);
            return null;
        }
        String campusName = userOpt.get().getCampusName();
        if (campusName == null || campusName.isBlank()) {
            return null;
        }
        return campusName.trim();
    }
}
