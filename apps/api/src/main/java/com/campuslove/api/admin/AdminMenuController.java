package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Menu;
import com.campuslove.api.entity.Role;
import com.campuslove.api.entity.RoleMenu;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.MenuRepository;
import com.campuslove.api.repository.RoleMenuRepository;
import com.campuslove.api.repository.RoleRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
 * 管理后台 - 菜单管理控制器（eladmin 风格动态菜单）。
 *
 * <p>核心能力：</p>
 * <ul>
 *   <li>{@code GET /api/v1/admin/menus/current}：返回当前管理员可见菜单树
 *       （登录后前端拉取，动态生成侧边栏与路由），替代前端硬编码菜单</li>
 *   <li>菜单 CRUD + 树形查询（仅超级管理员）</li>
 * </ul>
 *
 * <p>菜单树结构（eladmin 风格）：</p>
 * <pre>{@code
 * [{
 *   "id": 100, "parentId": 0, "title": "系统管理", "path": "/system",
 *   "name": "System", "component": null, "menuType": "DIR",
 *   "children": [
 *     { "id": 101, "parentId": 100, "title": "数据看板", "path": "/dashboard",
 *       "name": "Dashboard", "component": "views/Dashboard.vue", "menuType": "MENU" }
 *   ]
 * }]
 * }</pre>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/menus")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminMenuController {

    private final MenuRepository menuRepository;
    private final RoleMenuRepository roleMenuRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    public AdminMenuController(MenuRepository menuRepository,
                               RoleMenuRepository roleMenuRepository,
                               RoleRepository roleRepository,
                               UserRepository userRepository) {
        this.menuRepository = menuRepository;
        this.roleMenuRepository = roleMenuRepository;
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
    }

    /**
     * 查询当前管理员可见菜单树（动态菜单核心）。
     *
     * <p>按当前管理员角色（user.role 与 roles.code 对齐）经 role_menu
     * 关联查询可见菜单，SUPER_ADMIN 返回全部，ADMIN 返回业务子集。</p>
     *
     * @return 菜单树
     */
    @GetMapping("/current")
    public List<MenuTreeNode> getCurrentMenus() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<Menu> menus = resolveMenusForUser(userId);
        return buildTree(menus);
    }

    /**
     * 查询全部菜单树（仅超级管理员，菜单管理页用）。
     *
     * @return 全部菜单树
     */
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public List<MenuTreeNode> listMenus() {
        SecurityUtils.getCurrentUserId();
        return buildTree(menuRepository.findAllByOrderBySortAsc());
    }

    /**
     * 查询单条菜单详情（仅超级管理员）。
     *
     * @param id 菜单 ID
     * @return 菜单详情；不存在返回 404
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<MenuDetailView> getMenu(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();
        Optional<Menu> menuOpt = menuRepository.findById(id);
        return menuOpt.map(menu -> ResponseEntity.ok(toDetailView(menu)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * 新增菜单（仅超级管理员）。
     *
     * @param req 新增请求体
     * @return 创建后的菜单
     */
    @PostMapping
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.CREATE_MENU, targetType = "MENU",
            description = "新增菜单")
    public ResponseEntity<MenuDetailView> createMenu(@Valid @RequestBody MenuRequest req) {
        SecurityUtils.getCurrentUserId();

        // name 唯一性校验（动态路由依赖 name 唯一）
        List<Menu> all = menuRepository.findAllByOrderBySortAsc();
        boolean nameExists = all.stream().anyMatch(m -> m.getName().equalsIgnoreCase(req.name()));
        if (nameExists) {
            return ResponseEntity.badRequest().build();
        }

        Menu menu = new Menu();
        applyRequest(menu, req);
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        menu.setCreatedAt(now);
        menu.setUpdatedAt(now);
        Menu saved = menuRepository.save(menu);

        // 新菜单自动授权给 SUPER_ADMIN（保证全局管理员始终可见）
        roleRepository.findByCode(AdminDataScope.ROLE_SUPER_ADMIN)
                .ifPresent(role -> roleMenuRepository.save(new RoleMenu(role, saved)));

        return ResponseEntity.ok(toDetailView(saved));
    }

    /**
     * 编辑菜单（仅超级管理员）。
     *
     * @param id  菜单 ID
     * @param req 编辑请求体
     * @return 更新后的菜单；不存在返回 404
     */
    @PutMapping("/{id}")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_MENU, targetType = "MENU",
            description = "编辑菜单")
    public ResponseEntity<MenuDetailView> updateMenu(
            @PathVariable("id") @Min(1) Long id,
            @Valid @RequestBody MenuRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<Menu> menuOpt = menuRepository.findById(id);
        if (menuOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Menu menu = menuOpt.get();

        // name 唯一性校验（排除自身）
        if (req.name() != null) {
            List<Menu> all = menuRepository.findAllByOrderBySortAsc();
            boolean nameExists = all.stream().anyMatch(
                    m -> !m.getId().equals(id) && m.getName().equalsIgnoreCase(req.name()));
            if (nameExists) {
                return ResponseEntity.badRequest().build();
            }
        }

        applyRequest(menu, req);
        menu.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        Menu saved = menuRepository.save(menu);
        return ResponseEntity.ok(toDetailView(saved));
    }

    /**
     * 删除菜单（仅超级管理员）。
     *
     * @param id 菜单 ID
     * @return 204 删除成功；404 不存在；409 存在子菜单
     */
    @DeleteMapping("/{id}")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.DELETE_MENU, targetType = "MENU",
            description = "删除菜单")
    public ResponseEntity<Void> deleteMenu(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Menu> menuOpt = menuRepository.findById(id);
        if (menuOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 存在子菜单时拒绝删除（先删子菜单）
        boolean hasChildren = menuRepository.findAllByOrderBySortAsc().stream()
                .anyMatch(m -> m.getParentId() != null && m.getParentId().equals(id));
        if (hasChildren) {
            return ResponseEntity.status(409).build();
        }
        menuRepository.delete(menuOpt.get());
        return ResponseEntity.noContent().build();
    }

    /**
     * 解析指定用户的可见菜单（user.role 与 roles.code 对齐，经 role_menu 关联）。
     *
     * @param userId 用户 ID
     * @return 可见菜单列表（已去重排序）
     */
    private List<Menu> resolveMenusForUser(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return List.of();
        }
        String roleCode = userOpt.get().getRole();
        if (roleCode == null || roleCode.isBlank()) {
            return List.of();
        }
        // 超级管理员返回全部菜单
        if (AdminDataScope.ROLE_SUPER_ADMIN.equalsIgnoreCase(roleCode)) {
            return menuRepository.findAllByOrderBySortAsc();
        }
        // 校区管理员：按角色编码经 role_menu 关联查询
        Optional<Role> roleOpt = roleRepository.findByCode(roleCode.toUpperCase());
        if (roleOpt.isEmpty()) {
            return List.of();
        }
        return menuRepository.findMenusByRoleId(roleOpt.get().getId());
    }

    /**
     * 将平铺菜单列表构建为树。
     *
     * @param menus 平铺菜单列表
     * @return 菜单树（顶级节点含 children）
     */
    private List<MenuTreeNode> buildTree(List<Menu> menus) {
        if (menus == null || menus.isEmpty()) {
            return List.of();
        }
        // 先按排序权重排序，保证树内顺序稳定
        List<Menu> sorted = menus.stream()
                .sorted(Comparator.comparing(Menu::getSort, Comparator.nullsLast(Integer::compareTo)))
                .collect(Collectors.toList());

        Map<Long, MenuTreeNode> nodeMap = new LinkedHashMap<>();
        for (Menu menu : sorted) {
            nodeMap.put(menu.getId(), new MenuTreeNode(
                    menu.getId(),
                    menu.getParentId(),
                    menu.getTitle(),
                    menu.getName(),
                    menu.getPath(),
                    menu.getComponent(),
                    menu.getIcon(),
                    menu.getSort(),
                    menu.getHidden(),
                    menu.getPermission(),
                    menu.getMenuType(),
                    new ArrayList<>()
            ));
        }

        List<MenuTreeNode> roots = new ArrayList<>();
        for (MenuTreeNode node : nodeMap.values()) {
            if (node.parentId() == null || node.parentId() == 0L) {
                roots.add(node);
            } else {
                MenuTreeNode parent = nodeMap.get(node.parentId());
                if (parent != null) {
                    parent.children().add(node);
                } else {
                    // 父节点不在可见集合（如父为目录但不可见）时挂到根
                    roots.add(node);
                }
            }
        }

        // 剔除「没有可见子菜单的目录」（DIR 节点 children 为空）：
        // 校区管理员（ADMIN）可能因角色菜单 seed 关联到目录自身但未关联其子菜单，
        // 此时目录应整体隐藏（如「系统管理」对校区管理员不可见），避免渲染空目录。
        roots.removeIf(node -> isDirWithoutChildren(node));
        return roots;
    }

    /**
     * 判断节点是否为「无可见子菜单的目录」。
     * <p>递归：目录（DIR）且 children 为空，或所有子节点均为空目录时返回 true。</p>
     *
     * @param node 菜单树节点
     * @return true 表示应剔除
     */
    private boolean isDirWithoutChildren(MenuTreeNode node) {
        if (node == null) {
            return true;
        }
        boolean isDir = "DIR".equalsIgnoreCase(node.menuType());
        if (!isDir) {
            return false;
        }
        List<MenuTreeNode> children = node.children();
        if (children == null || children.isEmpty()) {
            return true;
        }
        // 目录下所有子节点均为空目录时，该目录整体剔除
        return children.stream().allMatch(this::isDirWithoutChildren);
    }

    private void applyRequest(Menu menu, MenuRequest req) {
        if (req.parentId() != null) {
            menu.setParentId(req.parentId());
        }
        if (req.title() != null) {
            menu.setTitle(req.title().trim());
        }
        if (req.name() != null) {
            menu.setName(req.name().trim());
        }
        if (req.path() != null) {
            menu.setPath(req.path().trim());
        }
        if (req.component() != null) {
            menu.setComponent(req.component().trim());
        }
        if (req.icon() != null) {
            menu.setIcon(req.icon().trim());
        }
        if (req.sort() != null) {
            menu.setSort(req.sort());
        }
        if (req.hidden() != null) {
            menu.setHidden(req.hidden());
        }
        if (req.permission() != null) {
            menu.setPermission(req.permission().trim());
        }
        if (req.menuType() != null) {
            menu.setMenuType(req.menuType().trim().toUpperCase());
        }
    }

    private MenuDetailView toDetailView(Menu menu) {
        return new MenuDetailView(
                menu.getId(),
                menu.getParentId(),
                menu.getTitle(),
                menu.getName(),
                menu.getPath(),
                menu.getComponent(),
                menu.getIcon(),
                menu.getSort(),
                menu.getHidden(),
                menu.getPermission(),
                menu.getMenuType(),
                menu.getCreatedAt() != null ? menu.getCreatedAt().toString() : null,
                menu.getUpdatedAt() != null ? menu.getUpdatedAt().toString() : null
        );
    }
}

/**
 * 菜单树节点视图。
 */
record MenuTreeNode(
        Long id,
        Long parentId,
        String title,
        String name,
        String path,
        String component,
        String icon,
        Integer sort,
        Boolean hidden,
        String permission,
        String menuType,
        List<MenuTreeNode> children) {
}

/**
 * 菜单详情视图。
 */
record MenuDetailView(
        Long id,
        Long parentId,
        String title,
        String name,
        String path,
        String component,
        String icon,
        Integer sort,
        Boolean hidden,
        String permission,
        String menuType,
        String createdAt,
        String updatedAt) {
}

/**
 * 新增/编辑菜单请求体。
 *
 * @param parentId   父菜单 ID（0 = 顶级，默认 0）
 * @param title      菜单标题（必填）
 * @param name       路由 name（必填，唯一）
 * @param path       路由路径（必填）
 * @param component  前端组件路径（目录可空）
 * @param icon       图标文件名
 * @param sort       排序权重
 * @param hidden     是否隐藏
 * @param permission 权限标识
 * @param menuType   菜单类型：DIR / MENU
 */
record MenuRequest(
        Long parentId,
        @NotBlank(message = "菜单标题不能为空")
        @Size(min = 1, max = 64, message = "菜单标题长度须为 1-64 字") String title,
        @NotBlank(message = "路由 name 不能为空")
        @Size(min = 1, max = 64, message = "路由 name 长度须为 1-64 字") String name,
        @NotBlank(message = "路由路径不能为空")
        @Size(min = 1, max = 128, message = "路由路径长度须为 1-128 字") String path,
        String component,
        String icon,
        Integer sort,
        Boolean hidden,
        String permission,
        String menuType) {
}
