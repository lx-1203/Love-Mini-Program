package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 用户管理控制器。
 * <p>提供用户分页列表、详情、编辑、禁用、启用等接口。</p>
 * <p>权限说明：</p>
 * <ul>
 *   <li>URL 层：SecurityConfig 已配置 /api/admin/** 仅 ADMIN 角色可访问（real 模式）</li>
 *   <li>方法层：额外加 @PreAuthorize("hasRole('ADMIN')") 作为深度防御，
 *       需在 Phase 3 任务 17 启用 @EnableMethodSecurity 后生效</li>
 *   <li>mock 模式：MockSecurityConfig 全部放行，便于本地调试</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;

    public AdminUserController(
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository) {
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
    }

    /**
     * 分页查询用户列表（支持角色/状态/注册时间/昵称筛选）。
     *
     * @param role           角色筛选：USER / ADMIN，可选
     * @param status         状态筛选：active / disabled，可选
     * @param nickname       昵称模糊关键字，可选
     * @param createdAtFrom  注册时间起（含），格式 yyyy-MM-dd'T'HH:mm:ss，可选
     * @param createdAtTo    注册时间止（含），格式 yyyy-MM-dd'T'HH:mm:ss，可选
     * @param page           页码，1-based，默认 1
     * @param pageSize       每页大小，默认 20，最大 100
     * @return 分页用户列表
     */
    @GetMapping
    public AdminPageView<AdminUserSummaryView> listUsers(
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "nickname", required = false) String nickname,
            @RequestParam(name = "createdAtFrom", required = false) LocalDateTime createdAtFrom,
            @RequestParam(name = "createdAtTo", required = false) LocalDateTime createdAtTo,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "pageSize", defaultValue = "20") int pageSize) {
        // 当前管理员 ID（用于审计日志，目前仅调用以触发认证校验）
        SecurityUtils.getCurrentUserId();

        // 参数归一化：空字符串视为 null
        String normalizedRole = normalize(role);
        String normalizedStatus = normalize(status);
        String normalizedNickname = normalize(nickname);

        // 校验并构造分页参数（page 转为 0-based）
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<User> result = userRepository.searchForAdmin(
                normalizedRole, normalizedStatus, createdAtFrom, createdAtTo, normalizedNickname, pageable);

        List<AdminUserSummaryView> items = result.getContent().stream()
                .map(this::toSummaryView)
                .toList();

        return new AdminPageView<>(
                items,
                result.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize)
        );
    }

    /**
     * 查询用户详情。
     *
     * @param id 用户 ID
     * @return 用户详情；不存在返回 404
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminUserDetailView> getUserDetail(@PathVariable("id") Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();

        // 联表查询校园资料，补充校区与认证状态
        Optional<UserCampusProfile> campusOpt = userCampusProfileRepository.findByUserId(id);
        String campusName = campusOpt.map(UserCampusProfile::getCampusName).orElse(null);
        String verificationStatus = campusOpt.map(UserCampusProfile::getVerificationStatus).orElse(null);

        AdminUserDetailView view = new AdminUserDetailView(
                user.getId(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getBio(),
                user.getGradeLabel(),
                user.getPronouns(),
                maskPhone(user.getPhone()),
                user.getRole(),
                user.getStatus(),
                user.getProfileCompletion(),
                user.getFollowingCount(),
                user.getFollowersCount(),
                campusName,
                verificationStatus,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
        return ResponseEntity.ok(view);
    }

    /**
     * 编辑用户（昵称、简介、年级、代词、状态）。
     * <p>不允许通过此接口修改角色、密码、openid 等敏感字段。</p>
     *
     * @param id  用户 ID
     * @param req 编辑请求体
     * @return 更新后的用户详情；不存在返回 404
     */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<AdminUserDetailView> updateUser(
            @PathVariable("id") Long id,
            @Valid @RequestBody AdminUserUpdateRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();

        // 仅在字段非 null 时更新，允许部分更新语义
        if (req.nickname() != null) {
            user.setNickname(req.nickname());
        }
        if (req.bio() != null) {
            user.setBio(req.bio());
        }
        if (req.gradeLabel() != null) {
            user.setGradeLabel(req.gradeLabel());
        }
        if (req.pronouns() != null) {
            user.setPronouns(req.pronouns());
        }
        if (req.status() != null) {
            String newStatus = req.status().toLowerCase();
            if (!"active".equals(newStatus) && !"disabled".equals(newStatus)) {
                return ResponseEntity.badRequest().build();
            }
            user.setStatus(newStatus);
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // 复用详情查询逻辑返回最新视图
        return getUserDetail(id);
    }

    /**
     * 禁用用户。
     * <p>将用户 status 置为 disabled，disabled 用户在登录时会被拒绝（由 AuthService 实现）。</p>
     *
     * @param id 用户 ID
     * @return 操作结果
     */
    @PostMapping("/{id}/disable")
    @Transactional
    public ResponseEntity<Map<String, Object>> disableUser(@PathVariable("id") Long id) {
        Long adminId = SecurityUtils.getCurrentUserId();
        return toggleUserStatus(id, "disabled", adminId);
    }

    /**
     * 启用用户。
     * <p>将用户 status 置为 active。</p>
     *
     * @param id 用户 ID
     * @return 操作结果
     */
    @PostMapping("/{id}/enable")
    @Transactional
    public ResponseEntity<Map<String, Object>> enableUser(@PathVariable("id") Long id) {
        Long adminId = SecurityUtils.getCurrentUserId();
        return toggleUserStatus(id, "active", adminId);
    }

    /**
     * 切换用户状态通用方法。
     *
     * @param id      用户 ID
     * @param newStatus 新状态（active / disabled）
     * @param adminId 操作管理员 ID（用于审计）
     * @return 操作结果
     */
    private ResponseEntity<Map<String, Object>> toggleUserStatus(Long id, String newStatus, Long adminId) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        user.setStatus(newStatus);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        Map<String, Object> body = new HashMap<>();
        body.put("id", user.getId());
        body.put("status", user.getStatus());
        body.put("operatorId", adminId);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * Entity 转 SummaryView。
     */
    private AdminUserSummaryView toSummaryView(User user) {
        return new AdminUserSummaryView(
                user.getId(),
                user.getNickname(),
                user.getAvatarUrl(),
                maskPhone(user.getPhone()),
                user.getRole(),
                user.getStatus(),
                user.getProfileCompletion(),
                user.getFollowingCount(),
                user.getFollowersCount(),
                user.getCreatedAt()
        );
    }

    /**
     * 手机号脱敏：保留前 3 位与后 4 位，中间用 **** 替换。
     *
     * @param phone 原始手机号
     * @return 脱敏后的字符串；空值原样返回
     */
    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /**
     * 字符串归一化：trim 后空字符串视为 null。
     *
     * @param value 原始值
     * @return 归一化后的值
     */
    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
