package com.campuslove.api.admin.circle;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.entity.circle.AdminLayer;
import com.campuslove.api.repository.circle.AdminLayerRepository;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 管理员-圈层绑定 Controller（Frame 08 圈层绑定管理）。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/admin-layers")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminLayerController {

    private final AdminLayerRepository adminLayerRepository;

    public AdminLayerController(AdminLayerRepository adminLayerRepository) {
        this.adminLayerRepository = adminLayerRepository;
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
        adminLayerRepository.deleteAllByAdminId(adminId);
        bindings.forEach(b -> b.setAdminId(adminId));
        return ApiResponse.ok(adminLayerRepository.saveAll(bindings));
    }
}
