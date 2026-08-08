package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
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
 *   <li>数据隔离：校区管理员（ADMIN + campusName 非空）仅能查看/编辑/
 *       禁用本校区用户，越权访问抛
 *       {@link com.campuslove.api.common.OperationForbiddenException}（HTTP 403），
 *       与 AdminVillagePostController 语义一致</li>
 * </ul>
 * <p>索引说明（FIN-00058 + R4-00384）：listUsers 的 nickname 筛选原为
 * {@code LIKE '%x%'} 中缀通配，无法命中普通 B-Tree 索引（数据量大时全表扫描）；
 * R4-00384 已改为前缀匹配（{@code LIKE 'x%'}），可走索引。长期可再引入
 * MySQL FULLTEXT（ngram parser）或搜索引擎支持中缀搜索。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminUserController {

    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final PasswordEncoder passwordEncoder;
    /** 校园管理员数据隔离（商业模式：每个高校一个管理员） */
    private final AdminCampusScopeService campusScopeService;
    /** 校园数据范围校验（越权写/读拦截，与 AdminVillagePostController 一致） */
    private final AdminDataScope adminDataScope;

    public AdminUserController(
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            PasswordEncoder passwordEncoder,
            AdminCampusScopeService campusScopeService,
            AdminDataScope adminDataScope) {
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.campusScopeService = campusScopeService;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 新增用户（后台「新增用户」对齐 eladmin 用户管理）。
     *
     * <p>手机号作为登录账号，密码 BCrypt 加密存储（与 {@code AuthService#registerUser} 语义一致），
     * 创建后状态为 active、角色为 USER。</p>
     *
     * <p>校验：手机号格式（11 位 1[3-9] 开头）、密码 6-64 位、昵称 1-20 字、
     * 手机号唯一（重复返回 400 业务异常）。</p>
     *
     * @param req 创建用户请求体
     * @return 创建成功后的用户摘要
     */
    @PostMapping
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.CREATE_USER, targetType = "USER",
            description = "管理员新增用户")
    public ApiResponse<AdminUserSummaryView> createUser(@Valid @RequestBody AdminCreateUserRequest req) {
        SecurityUtils.getCurrentUserId();

        // 显式参数校验（与 AuthService.registerUser 语义一致），@Valid 注解作为第二道防线；
        // 显式校验保证单元测试与统一中文错误文案
        if (req.phone() == null || !req.phone().matches("^1[3-9]\\d{9}$")) {
            throw new IllegalArgumentException(ErrorMessages.PHONE_FORMAT_INVALID);
        }
        if (req.password() == null || req.password().length() < 6 || req.password().length() > 64) {
            throw new IllegalArgumentException(ErrorMessages.PASSWORD_LENGTH_INVALID);
        }
        if (req.nickname() == null || req.nickname().isBlank() || req.nickname().trim().length() > 20) {
            throw new IllegalArgumentException(ErrorMessages.NICKNAME_LENGTH_INVALID);
        }

        // 手机号唯一性校验（与注册链路 registerUser 一致，防重复创建）
        boolean phoneExists = userRepository.findByPhone(req.phone()).isPresent();
        if (phoneExists) {
            throw new IllegalArgumentException(ErrorMessages.PHONE_ALREADY_REGISTERED);
        }

        User user = new User();
        // 约定：openid 字段存 "phone:{phone}"，与 AuthService.registerUser 保持一致，
        // 保证同手机号用户可通过 openid/phone 两种途径被唯一识别
        user.setOpenid("phone:" + req.phone());
        user.setPhone(req.phone());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setNickname(req.nickname().trim());
        user.setRole("USER");
        user.setStatus("active");
        user.setProfileCompletion(0);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        // 创建路径必须使用 save 返回值（@Version 乐观锁 + ID 由 JPA 回填）
        User saved = userRepository.save(user);

        return ApiResponse.ok(toSummaryView(saved));
    }

    /**
     * 创建管理员（商业模式：每个高校一个管理员）。
     *
     * <p>仅超级管理员可调用。创建的管理员账号 role 为 ADMIN（校区管理员）或
     * SUPER_ADMIN（全局超级管理员），管辖范围由 campusName 决定：
     * <ul>
     *   <li>campusName 为空 —— 全局管理员，可管理全部校区数据</li>
     *   <li>campusName 非空 —— 校区管理员，仅能管理该校区用户/内容（数据隔离强制）</li>
     * </ul>
     * </p>
     *
     * <p>校验：手机号唯一、格式 11 位、密码 6-64 位、昵称 1-20 字；
     * role 非 ADMIN/SUPER_ADMIN 时 400。</p>
     *
     * @param req 创建管理员请求体
     * @return 创建成功后的管理员摘要
     */
    @PostMapping("/admins")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.CREATE_USER, targetType = "ADMIN",
            description = "超级管理员创建管理员（含校区管理员）")
    public ApiResponse<AdminUserSummaryView> createAdmin(@Valid @RequestBody AdminCreateAdminRequest req) {
        SecurityUtils.getCurrentUserId();

        // 显式参数校验（与 createUser 语义一致），@Valid 注解作为第二道防线
        if (req.phone() == null || !req.phone().matches("^1[3-9]\\d{9}$")) {
            throw new IllegalArgumentException(ErrorMessages.PHONE_FORMAT_INVALID);
        }
        if (req.password() == null || req.password().length() < 6 || req.password().length() > 64) {
            throw new IllegalArgumentException(ErrorMessages.PASSWORD_LENGTH_INVALID);
        }
        if (req.nickname() == null || req.nickname().isBlank() || req.nickname().trim().length() > 20) {
            throw new IllegalArgumentException(ErrorMessages.NICKNAME_LENGTH_INVALID);
        }

        String role = req.normalizedRole();
        // 手机号唯一性校验（与注册链路 registerUser 一致，防重复创建）
        if (userRepository.findByPhone(req.phone()).isPresent()) {
            throw new IllegalArgumentException(ErrorMessages.PHONE_ALREADY_REGISTERED);
        }
        // 校区管理员必须指定管辖校区（否则与全局管理员语义冲突）
        String campusName = normalize(req.campusName());
        if ("ADMIN".equals(role) && campusName == null) {
            throw new IllegalArgumentException(ErrorMessages.CAMPUS_ADMIN_CAMPUS_NAME_REQUIRED);
        }
        if ("SUPER_ADMIN".equals(role) && campusName != null) {
            throw new IllegalArgumentException(ErrorMessages.SUPER_ADMIN_NO_CAMPUS_NAME);
        }

        User user = new User();
        user.setOpenid("phone:" + req.phone());
        user.setPhone(req.phone());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setNickname(req.nickname().trim());
        user.setRole(role);
        user.setCampusName(campusName);
        user.setStatus("active");
        user.setProfileCompletion(0);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        // 创建路径必须使用 save 返回值（@Version 乐观锁 + ID 由 JPA 回填）
        User saved = userRepository.save(user);

        return ApiResponse.ok(toSummaryView(saved));
    }

    /**
     * 分页查询管理员列表（含管辖校区）。
     *
     * <p>仅超级管理员可调用；按角色/校区/昵称筛选，按注册时间倒序。</p>
     *
     * @param campusName 校区筛选（可选）
     * @param nickname   昵称模糊关键字（可选）
     * @param page       页码，1-based，默认 1
     * @param pageSize   每页大小，默认 20，最大 100
     * @return 分页管理员列表
     */
    @GetMapping("/admins")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public AdminPageView<AdminUserSummaryView> listAdmins(
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "nickname", required = false) String nickname,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedCampus = normalize(campusName);
        String normalizedNickname = normalize(nickname);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        // 管理员列表 = ADMIN（校区/全局运营） + SUPER_ADMIN（全局超级管理员）。
        // 修复：原实现分两次单角色查询后内存合并，单页最多返回 2×pageSize 条、
        // 跨页全局排序不成立、可能重复/遗漏；现由 searchAllAdmins 一次查询覆盖两类角色
        Page<User> admins = userRepository.searchAllAdmins(
                normalizedNickname, normalizedCampus, pageable);

        List<AdminUserSummaryView> items = admins.getContent().stream()
                .map(this::toSummaryView)
                .toList();

        return new AdminPageView<>(
                items,
                admins.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(admins.getTotalElements(), safeSize)
        );
    }

    /**
     * 分页查询用户列表（支持角色/状态/注册时间/昵称筛选）。
     *
     * @param role           角色筛选：USER / ADMIN，可选
     * @param status         状态筛选：active / disabled，可选
     * @param nickname       昵称模糊关键字，可选
     * @param createdAtFrom  注册时间起（含），格式 yyyy-MM-dd'T'HH:mm:ss，可选
     * @param createdAtTo    注册时间止（含），格式 yyyy-MM-dd'T'HH:mm:ss，可选
     * @param campusName     校区筛选（可选，按用户所属校区 user_campus_profile.campus_name 匹配）；
     *                       当前管理员为校区管理员时强制按其管辖校区过滤（数据隔离），忽略本参数
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
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        // 当前管理员 ID（用于审计日志，目前仅调用以触发认证校验）
        SecurityUtils.getCurrentUserId();

        // 参数归一化：空字符串视为 null
        String normalizedRole = normalize(role);
        String normalizedStatus = normalize(status);
        String normalizedNickname = normalize(nickname);

        // 数据隔离（商业模式：每个高校一个管理员）：
        // 当前管理员为校区管理员时强制按其管辖校区过滤，忽略调用方传入的 campusName，
        // 防止校区管理员越权查看其他校区用户。
        String effectiveCampus = campusScopeService.getCurrentAdminCampusName();
        if (effectiveCampus == null) {
            effectiveCampus = normalize(campusName);
        }

        // 校验并构造分页参数（page 转为 0-based）
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<User> result = userRepository.searchForAdmin(
                normalizedRole, normalizedStatus, createdAtFrom, createdAtTo, normalizedNickname,
                effectiveCampus, pageable);

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
    public ResponseEntity<AdminUserDetailView> getUserDetail(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();

        // 数据隔离：校区管理员仅能查看本校区用户的详情（与 listUsers 隔离语义一致）
        adminDataScope.assertCampusAccess(resolveUserCampus(id));

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
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminUserUpdateRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();

        // 数据隔离：校区管理员仅能编辑本校区用户
        adminDataScope.assertCampusAccess(resolveUserCampus(id));

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
        user.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
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
    public ResponseEntity<Map<String, Object>> disableUser(@PathVariable("id") @Positive Long id) {
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
    public ResponseEntity<Map<String, Object>> enableUser(@PathVariable("id") @Positive Long id) {
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
        User user = userOpt.orElseThrow(() ->
                new IllegalStateException("userOpt 已确认非空但 orElseThrow 触发，数据不一致"));

        // 数据隔离：校区管理员仅能禁用/启用本校区用户（SUPER_ADMIN 操作者不受限）
        adminDataScope.assertCampusAccess(resolveUserCampus(id));

        // 权限模型（商业模式：超级管理员管理校区管理员）：
        // - 任何人不允许禁用/启用 SUPER_ADMIN（防止超级管理员账号被锁）
        // - 校区管理员（ADMIN）不能禁用/启用任何管理员（仅 SUPER_ADMIN 可操作 ADMIN）
        // - 任何人不允许操作自己的账号
        if ("SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.badRequest().body(Map.of("error", "不能禁用/启用超级管理员账号"));
        }
        if ("ADMIN".equalsIgnoreCase(user.getRole()) && !isSuperAdminOperator(adminId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "校区管理员无权禁用/启用其他管理员账号"));
        }
        if (user.getId() != null && user.getId().equals(adminId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "不能对自己的账号执行该操作"));
        }

        user.setStatus(newStatus);
        user.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userRepository.save(user);

        Map<String, Object> body = new HashMap<>();
        body.put("id", user.getId());
        body.put("status", user.getStatus());
        body.put("operatorId", adminId);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 判断当前操作者是否为超级管理员（SUPER_ADMIN）。
     *
     * <p>用于权限模型：仅超级管理员可以对校区管理员（ADMIN）执行禁用/启用。</p>
     *
     * @param adminId 操作者用户 ID
     * @return true 表示操作者为超级管理员
     */
    private boolean isSuperAdminOperator(Long adminId) {
        if (adminId == null) {
            return false;
        }
        return userRepository.findById(adminId)
                .map(u -> "SUPER_ADMIN".equalsIgnoreCase(u.getRole()))
                .orElse(false);
    }

    /**
     * 解析目标用户的所属校区名（用于数据隔离越权校验）。
     *
     * <p>与 {@link AdminVillagePostController#resolveAuthorCampus} 语义一致：
     * 普通用户（role=USER）的校区存于 user_campus_profile.campus_name
     * （users.campus_name 恒为 null），管理员账号兼容取 users.campus_name
     * （管辖校区）；未知归属返回 null（按 AdminDataScope 语义视为全局资源）。</p>
     *
     * @param userId 目标用户 ID
     * @return 目标用户所属校区名（可能为 null）
     */
    private String resolveUserCampus(Long userId) {
        if (userId == null) {
            return null;
        }
        // 普通用户校区：user_campus_profile.campus_name（与 listUsers 过滤语义一致）
        Optional<UserCampusProfile> campusOpt = userCampusProfileRepository.findByUserId(userId);
        String profileCampus = normalize(campusOpt.map(UserCampusProfile::getCampusName).orElse(null));
        if (profileCampus != null) {
            return profileCampus;
        }
        // 兼容：管理员账号管辖校区（users.campus_name）
        Optional<User> userOpt = userRepository.findById(userId);
        return normalize(userOpt.map(User::getCampusName).orElse(null));
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
                user.getCampusName(),
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

/**
 * 新增用户请求体（后台「新增用户」，对齐 eladmin 用户管理）。
 *
 * <p>校验规则与 {@code AuthService#registerUser} 一致：</p>
 * <ul>
 *   <li>phone：11 位手机号，1[3-9] 开头</li>
 *   <li>password：6-64 位</li>
 *   <li>nickname：1-20 字</li>
 * </ul>
 *
 * @param phone    手机号（唯一）
 * @param password 初始密码（6-64 位）
 * @param nickname 昵称（1-20 字）
 */
record AdminCreateUserRequest(
        @NotBlank(message = ErrorMessages.PHONE_REQUIRED)
        @Pattern(regexp = "^1[3-9]\\d{9}$", message = ErrorMessages.PHONE_FORMAT_INVALID) String phone,
        @NotBlank(message = ErrorMessages.PASSWORD_REQUIRED)
        @Size(min = 6, max = 64, message = ErrorMessages.PASSWORD_LENGTH_INVALID) String password,
        @NotBlank(message = ErrorMessages.NICKNAME_REQUIRED)
        @Size(min = 1, max = 20, message = ErrorMessages.NICKNAME_LENGTH_INVALID) String nickname) {
}
