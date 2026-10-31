package com.campuslove.api.admin.circle;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.circle.AdminLayer;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.circle.AdminLayerRepository;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
 *
 * <p><b>写接口契约（P2 修复，2026-10-31）</b>：请求体不再是 {@code @Entity AdminLayer}，
 * 而是白名单 DTO {@link AdminLayerBindRequest}。旧实现把实体直接交给
 * {@code save}/{@code saveAll}，而这两个方法对「id 非空的游离实体」执行 <b>MERGE</b>：
 * body 里带上别人已有的绑定行 ID 就能<b>覆盖那一行</b>（把某管理员的绑定改指到别的圈层，
 * 等于凭空换掉他的数据域），未写的字段按 null 落库，{@code created_at} 由客户端 JSON
 * 直接决定（审计轨迹可伪造）。可达者仅 SUPER_ADMIN，故这是完整性问题而非提权。</p>
 *
 * <p>现在的规则：绑定行<b>永远由服务端新建</b>（id 交给自增主键、时间戳取业务时区当前
 * 时间）；PUT 替换式接口的 {@code adminId} 以路径变量为唯一权威，body 里的同名字段不参与
 * 写入。响应体仍是 {@code AdminLayer} 实体，字段集合与修复前一致。</p>
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

    /**
     * 为管理员绑定圈层（恒新插入一行，请求体里没有 id 通道）。
     *
     * @param req 白名单请求体（adminId / circleLayerId / roleCode）
     * @return 新建后的绑定行
     */
    @PostMapping
    public ApiResponse<AdminLayer> bind(@Valid @RequestBody AdminLayerBindRequest req) {
        validateRoleCodeMatches(req.adminId(), req.roleCode());
        return ApiResponse.ok(adminLayerRepository.save(toNewEntity(req, req.adminId())));
    }

    /** 解除管理员-圈层绑定 */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> unbind(@PathVariable Long id) {
        adminLayerRepository.deleteById(id);
        return ApiResponse.ok(null);
    }

    /**
     * 重建某管理员的全部圈层绑定（替换式）。
     *
     * <p>路径变量 {@code adminId} 是唯一权威：body 里的 {@code adminId} 只做一致性校验，
     * 不参与写入；每一行都重建为新实体（id=null），因此无法用带别人行 ID 的 body 去
     * merge 覆盖其它管理员的绑定。</p>
     *
     * @param adminId 目标管理员 ID
     * @param reqs    绑定白名单请求体列表（可为空列表 = 清空该管理员全部绑定）
     * @return 重建后的绑定行列表
     */
    @PutMapping("/admin/{adminId}")
    public ApiResponse<List<AdminLayer>> replaceBindings(
            @PathVariable Long adminId,
            @Valid @RequestBody List<AdminLayerBindRequest> reqs
    ) {
        List<AdminLayerBindRequest> bindings = reqs == null ? List.of() : reqs;
        // 替换式写入前先整体校验：任一绑定行的 roleCode 与该管理员 users.role 不符即 400，
        // 避免部分写入后事务边界外的脏数据
        for (AdminLayerBindRequest b : bindings) {
            validateRoleCodeMatches(adminId, b.roleCode());
        }
        List<AdminLayer> fresh = new ArrayList<>(bindings.size());
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        for (AdminLayerBindRequest b : bindings) {
            AdminLayer entity = toNewEntity(b, adminId);
            // 替换式写入是同一次操作产生的批量绑定，时间戳取同一个服务端时刻
            entity.setCreatedAt(now);
            fresh.add(entity);
        }
        adminLayerRepository.deleteAllByAdminId(adminId);
        return ApiResponse.ok(adminLayerRepository.saveAll(fresh));
    }

    /**
     * 白名单 DTO -> <b>新建</b>实体：id 恒为 null（交给自增主键，绝不 merge 既有行），
     * adminId 由调用方给定（PUT 时为路径变量），createdAt 由服务端掌管。
     *
     * <p>{@code roleCode} 为空时不写该字段，保持实体默认值 {@code ADMIN} 的既有语义。</p>
     */
    private AdminLayer toNewEntity(AdminLayerBindRequest req, Long authoritativeAdminId) {
        if (req.circleLayerId() == null) {
            throw new IllegalArgumentException("绑定失败：缺少 circleLayerId，无法确定要绑定哪个圈层");
        }
        AdminLayer entity = new AdminLayer();
        entity.setId(null);
        entity.setAdminId(authoritativeAdminId);
        entity.setCircleLayerId(req.circleLayerId());
        if (req.roleCode() != null && !req.roleCode().isBlank()) {
            entity.setRoleCode(req.roleCode());
        }
        entity.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        return entity;
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
