package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Menu;
import com.campuslove.api.entity.Role;
import com.campuslove.api.entity.RoleMenu;
import com.campuslove.api.repository.MenuRepository;
import com.campuslove.api.repository.RoleMenuRepository;
import com.campuslove.api.repository.RoleRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 角色管理控制器（eladmin 风格）。
 * <p>仅超级管理员可管理角色。角色与 user.role 字符串双轨对齐
 * （roles.code = SUPER_ADMIN / ADMIN），通过 role_menu 关联角色可见菜单。</p>
 *
 * <p>R4-00391：角色编码仅允许系统识别的 {@link #SYSTEM_ROLE_CODES}（SUPER_ADMIN / ADMIN）——
 * 鉴权链路（SecurityConfig / AdminDataScope）只认 user.role 的这两个字符串，
 * 创建任意新角色 code 对权限无任何作用（双轨假角色，运营配置误以为生效）。
 * 自定义角色编码一律拒绝并提示，保证角色模型与 user.role 单一来源对齐。</p>
 *
 * <p>核心能力：</p>
 * <ul>
 *   <li>角色 CRUD（编码唯一，仅限系统角色编码）</li>
 *   <li>角色绑定菜单：{@code PUT /{id}/menus} 重建 role_menu 关联</li>
 *   <li>查询角色已绑定菜单 ID 集合：{@code GET /{id}/menus}</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/roles")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Validated
public class AdminRoleController {

    private final RoleRepository roleRepository;
    private final RoleMenuRepository roleMenuRepository;
    private final MenuRepository menuRepository;

    /**
     * R4-00391：系统识别的角色编码（与 user.role 单一来源对齐）。
     * 鉴权链路仅认这两个字符串，其他自定义角色编码对权限无任何作用。
     */
    private static final Set<String> SYSTEM_ROLE_CODES = Set.of("SUPER_ADMIN", "ADMIN");

    public AdminRoleController(RoleRepository roleRepository,
                               RoleMenuRepository roleMenuRepository,
                               MenuRepository menuRepository) {
        this.roleRepository = roleRepository;
        this.roleMenuRepository = roleMenuRepository;
        this.menuRepository = menuRepository;
    }

    /**
     * R4-00391：校验角色编码属于系统识别集合，否则拒绝创建/编辑。
     *
     * @param code 角色编码（已 trim + 大写）
     */
    private void assertSystemRoleCode(String code) {
        if (!SYSTEM_ROLE_CODES.contains(code)) {
            throw new IllegalArgumentException(
                    "角色编码 " + code + " 不受系统识别：权限模型仅支持 SUPER_ADMIN / ADMIN"
                            + "（user.role 单一来源），自定义编码创建后对权限无任何作用，已拒绝。");
        }
    }

    /**
     * 查询角色列表。
     *
     * @return 全部角色
     */
    @GetMapping
    public List<AdminRoleView> listRoles() {
        SecurityUtils.getCurrentUserId();
        return roleRepository.findAll().stream()
                .map(this::toView)
                .collect(Collectors.toList());
    }

    /**
     * 查询角色详情。
     *
     * @param id 角色 ID
     * @return 角色详情；不存在返回 404
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminRoleView> getRole(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();
        Optional<Role> roleOpt = roleRepository.findById(id);
        return roleOpt.map(role -> ResponseEntity.ok(toView(role)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * 查询角色已绑定的菜单 ID 集合（角色菜单分配页初始化用）。
     *
     * @param id 角色 ID
     * @return 菜单 ID 集合
     */
    @GetMapping("/{id}/menus")
    public ResponseEntity<Set<Long>> getRoleMenuIds(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();
        Optional<Role> roleOpt = roleRepository.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Set<Long> menuIds = roleMenuRepository.findByRoleId(id).stream()
                .map(rm -> rm.getMenu().getId())
                .collect(Collectors.toSet());
        return ResponseEntity.ok(menuIds);
    }

    /**
     * 新增角色（编码唯一）。
     *
     * @param req 新增请求体
     * @return 创建后的角色
     */
    @PostMapping
    @Transactional
    @Auditable(value = AuditOperation.CREATE_ROLE, targetType = "ROLE",
            description = "新增角色")
    public ResponseEntity<AdminRoleView> createRole(@Valid @RequestBody AdminRoleRequest req) {
        SecurityUtils.getCurrentUserId();

        String code = req.code().trim().toUpperCase();
        // R4-00391：仅允许系统识别编码（防止创建对权限无任何作用的假角色）
        assertSystemRoleCode(code);
        if (roleRepository.existsByCode(code)) {
            return ResponseEntity.badRequest().build();
        }

        Role role = new Role();
        applyRequest(role, req, code);
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        role.setCreatedAt(now);
        role.setUpdatedAt(now);
        Role saved = roleRepository.save(role);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 编辑角色。
     *
     * @param id  角色 ID
     * @param req 编辑请求体
     * @return 更新后的角色；不存在返回 404
     */
    @PutMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.UPDATE_ROLE, targetType = "ROLE",
            description = "编辑角色")
    public ResponseEntity<AdminRoleView> updateRole(
            @PathVariable("id") @Min(1) Long id,
            @Valid @RequestBody AdminRoleRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<Role> roleOpt = roleRepository.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Role role = roleOpt.get();

        String code = req.code() != null ? req.code().trim().toUpperCase() : role.getCode();
        // R4-00391：仅允许系统识别编码
        assertSystemRoleCode(code);
        // 编码唯一性校验（排除自身）
        Optional<Role> codeExists = roleRepository.findByCode(code);
        if (codeExists.isPresent() && !codeExists.get().getId().equals(id)) {
            return ResponseEntity.badRequest().build();
        }

        applyRequest(role, req, code);
        role.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        Role saved = roleRepository.save(role);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 绑定角色菜单（重建 role_menu 关联，全量替换）。
     *
     * @param id      角色 ID
     * @param menuIds 菜单 ID 集合
     * @return 绑定结果；角色不存在返回 404
     */
    @PutMapping("/{id}/menus")
    @Transactional
    @Auditable(value = AuditOperation.ASSIGN_ROLE_MENU, targetType = "ROLE",
            description = "角色菜单权限分配")
    public ResponseEntity<Void> assignRoleMenus(
            @PathVariable("id") @Min(1) Long id,
            @RequestBody List<Long> menuIds) {
        SecurityUtils.getCurrentUserId();

        Optional<Role> roleOpt = roleRepository.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Role role = roleOpt.get();

        // 全量替换：先删后插（事务内，保证原子性）
        roleMenuRepository.deleteByRoleId(id);

        if (menuIds != null && !menuIds.isEmpty()) {
            List<Menu> menus = menuRepository.findByIdIn(menuIds);
            for (Menu menu : menus) {
                RoleMenu rm = new RoleMenu(role, menu);
                roleMenuRepository.save(rm);
            }
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * 删除角色。
     *
     * @param id 角色 ID
     * @return 204 删除成功；404 不存在；409 为内置角色
     */
    @DeleteMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.DELETE_ROLE, targetType = "ROLE",
            description = "删除角色")
    public ResponseEntity<Void> deleteRole(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Role> roleOpt = roleRepository.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 内置角色（SUPER_ADMIN/ADMIN）禁止删除，防止权限模型被破坏
        String code = roleOpt.get().getCode();
        if ("SUPER_ADMIN".equalsIgnoreCase(code) || "ADMIN".equalsIgnoreCase(code)) {
            return ResponseEntity.status(409).build();
        }
        roleRepository.delete(roleOpt.get());
        return ResponseEntity.noContent().build();
    }

    private void applyRequest(Role role, AdminRoleRequest req, String code) {
        role.setCode(code);
        if (req.name() != null) {
            role.setName(req.name().trim());
        }
        if (req.dataScope() != null) {
            role.setDataScope(req.dataScope().trim().toUpperCase());
        }
        if (req.description() != null) {
            role.setDescription(req.description().trim());
        }
        if (req.enabled() != null) {
            role.setEnabled(req.enabled());
        }
    }

    private AdminRoleView toView(Role role) {
        return new AdminRoleView(
                role.getId(),
                role.getName(),
                role.getCode(),
                role.getDataScope(),
                role.getDescription(),
                role.getEnabled(),
                role.getCreatedAt() != null ? role.getCreatedAt().toString() : null,
                role.getUpdatedAt() != null ? role.getUpdatedAt().toString() : null
        );
    }
}

/**
 * 新增/编辑角色请求体。
 *
 * @param name        角色名称（必填，中文）
 * @param code        角色编码（必填，唯一，与 user.role 对齐）
 * @param dataScope   数据范围：ALL / CAMPUS
 * @param description 角色描述
 * @param enabled     是否启用
 */
record AdminRoleRequest(
        @NotBlank(message = "角色名称不能为空")
        @Size(min = 1, max = 64, message = "角色名称长度须为 1-64 字") String name,
        @NotBlank(message = "角色编码不能为空")
        @Size(min = 1, max = 32, message = "角色编码长度须为 1-32 字") String code,
        String dataScope,
        String description,
        Boolean enabled) {
}

/**
 * 角色视图。
 */
record AdminRoleView(
        Long id,
        String name,
        String code,
        String dataScope,
        String description,
        Boolean enabled,
        String createdAt,
        String updatedAt) {
}
