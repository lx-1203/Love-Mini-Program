package com.campuslove.api.admin.circle;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.circle.AdminLayer;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.circle.AdminLayerRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 管理员-圈层绑定 Controller（Frame 08 圈层绑定管理）。
 *
 * <p>roleCode 一致性约束：{@code users.role} 是「功能角色」这条轴的<b>唯一权威</b>，
 * {@code admin_layer.roleCode} 只是它的冗余副本，二者不得漂移。故 POST/PUT 写入时
 * 校验 roleCode 必须等于所绑定管理员账号的 users.role，不一致返回 400（中文提示）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/admin-layers")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminLayerController {

    private final AdminLayerRepository adminLayerRepository;
    private final UserRepository userRepository;

    public AdminLayerController(AdminLayerRepository adminLayerRepository,
                               UserRepository userRepository) {
        this.adminLayerRepository = adminLayerRepository;
        this.userRepository = userRepository;
    }

    /** 获取某管理员的全部圈层绑定 */
    @GetMapping("/admin/{adminId}")
    public ApiResponse<List<AdminLayer>> getByAdminId(@PathVariable Long adminId) {
        return ApiResponse.ok(adminLayerRepository.findByAdminId(adminId));
    }

    /** 获取某圈层的全部管理员绑定 */
    @GetMapping("/layer/{layerId}")
    public ApiResponse<List<AdminLayer>> getByLayerId(@PathVariable Long layerId) {
        return ApiResponse.ok(adminLayerRepository.findByCircleLayerId(layerId));
    }

    /** 为管理员绑定圈层 */
    @PostMapping
    public ApiResponse<AdminLayer> bind(@RequestBody AdminLayer binding) {
        validateRoleCodeMatches(binding.getAdminId(), binding.getRoleCode());
        return ApiResponse.ok(adminLayerRepository.save(binding));
    }

    /** 解除管理员-圈层绑定 */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> unbind(@PathVariable Long id) {
        adminLayerRepository.deleteById(id);
        return ApiResponse.ok(null);
    }

    /** 重建某管理员的全部圈层绑定（替换式） */
    @PutMapping("/admin/{adminId}")
    public ApiResponse<List<AdminLayer>> replaceBindings(
            @PathVariable Long adminId,
            @RequestBody List<AdminLayer> bindings
    ) {
        // 替换式写入前先整体校验：任一绑定行的 roleCode 与该管理员 users.role 不符即 400，
        // 避免部分写入后事务边界外的脏数据
        for (AdminLayer b : bindings) {
            validateRoleCodeMatches(adminId, b.getRoleCode());
        }
        adminLayerRepository.deleteAllByAdminId(adminId);
        bindings.forEach(b -> b.setAdminId(adminId));
        return ApiResponse.ok(adminLayerRepository.saveAll(bindings));
    }

    /**
     * 校验冗余副本 roleCode 与权威 users.role 一致。
     *
     * <p>roleCode 为空时按实体默认值 {@code ADMIN} 语义处理（save 前若为 null 会被
     * 列默认覆盖）；此处仅做「非空即必须等于 users.role」的一致性守卫。</p>
     *
     * @param adminId  绑定指向的管理员用户 ID
     * @param roleCode 待写入的冗余角色副本
     * @throws IllegalArgumentException 管理员不存在或角色不一致时（400）
     */
    private void validateRoleCodeMatches(Long adminId, String roleCode) {
        if (adminId == null) {
            throw new IllegalArgumentException("绑定失败：缺少 adminId，无法校验角色一致性");
        }
        Optional<User> adminOpt = userRepository.findById(adminId);
        if (adminOpt.isEmpty()) {
            throw new IllegalArgumentException("绑定失败：管理员账号不存在（adminId=" + adminId + "）");
        }
        String authoritativeRole = adminOpt.get().getRole();
        if (roleCode != null && !roleCode.isBlank()
                && !roleCode.equalsIgnoreCase(authoritativeRole)) {
            throw new IllegalArgumentException(
                    "绑定失败：admin_layer.roleCode=[" + roleCode
                            + "] 与管理员实际角色 users.role=[" + authoritativeRole
                            + "] 不一致。users.role 为唯一权威，请先在用户管理中调整账号角色，"
                            + "再绑定圈层，二者不得漂移。");
        }
    }
}
