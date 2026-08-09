package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.MediaAsset;
import com.campuslove.api.entity.User;
import com.campuslove.api.media.MediaAssetService;
import com.campuslove.api.repository.MediaAssetRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 媒体图片审核控制器（2026-08-09）。
 * <p>承接 media_asset 审核闭环：列表（pending 优先 + 状态/用户/校区筛选）、
 * 详情（含上传者昵称头像与完整元信息）、审核（通过/驳回，拒绝需备注）。</p>
 *
 * <p>数据隔离说明（与 AdminVillagePostController 一致）：</p>
 * <ul>
 *   <li>校区管理员（ADMIN + campusName 非空）强制按其管辖校区过滤列表，
 *       忽略调用方传入的 campusName 参数</li>
 *   <li>详情/审核通过 {@link AdminDataScope#assertCampusAccess(String)}
 *       按上传者所属校区越权拦截（HTTP 403）</li>
 *   <li>全局管理员（SUPER_ADMIN 或 ADMIN 无校区）不做过滤</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/media-assets")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminMediaAssetController {

    private static final Logger log = LoggerFactory.getLogger(AdminMediaAssetController.class);

    private final MediaAssetRepository mediaAssetRepository;
    private final UserRepository userRepository;
    private final AdminDataScope adminDataScope;
    private final MediaAssetService mediaAssetService;

    public AdminMediaAssetController(
            MediaAssetRepository mediaAssetRepository,
            UserRepository userRepository,
            AdminDataScope adminDataScope,
            MediaAssetService mediaAssetService) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.userRepository = userRepository;
        this.adminDataScope = adminDataScope;
        this.mediaAssetService = mediaAssetService;
    }

    /**
     * 分页查询媒体图片（审核状态/上传者/校区筛选）。
     * <p>默认按 pending（待审核）筛选，pending 优先排序、同状态按上传时间倒序。</p>
     *
     * @param auditStatus 审核状态：pending / approved / rejected，默认 pending
     * @param userId      上传者用户 ID，可选
     * @param campusName  校区筛选（按上传者所属校区过滤），可选；
     *                    校区管理员强制按其管辖校区过滤，忽略本参数
     * @param page        页码，1-based，默认 1
     * @param pageSize    每页大小，默认 20，最大 100
     * @return 分页图片审核列表
     */
    @GetMapping
    public AdminPageView<AdminMediaAssetSummaryView> listMediaAssets(
            @RequestParam(name = "auditStatus", defaultValue = "pending") String auditStatus,
            @RequestParam(name = "userId", required = false) Long userId,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedStatus = normalize(auditStatus);
        String normalizedCampus = normalize(campusName);
        // 数据隔离：校区管理员强制按其管辖校区过滤，忽略调用方传入的 campusName
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();
        if (effectiveCampus == null) {
            effectiveCampus = normalizedCampus;
        }

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<MediaAsset> result = mediaAssetRepository.searchForAdmin(
                normalizedStatus, userId, effectiveCampus, pageable);

        // 批量预加载上传者信息（昵称/头像），避免 N+1 查询
        Map<Long, User> authorMap = loadAuthorMap(
                result.getContent().stream().map(MediaAsset::getUserId).toList());

        List<AdminMediaAssetSummaryView> items = result.getContent().stream()
                .map(asset -> toSummaryView(asset, authorMap.get(asset.getUserId())))
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
     * 查询媒体图片详情（含上传者昵称头像与完整元信息）。
     *
     * @param id 资产 ID
     * @return 详情；不存在返回 404；校区越权返回 403
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminMediaAssetDetailView> getMediaAssetDetail(
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<MediaAsset> assetOpt = mediaAssetRepository.findById(id);
        if (assetOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        MediaAsset asset = assetOpt.get();
        // 数据隔离：校区管理员仅能查看本校区上传者的资产（读操作越权拦截）
        assertCampusAccess(asset);
        User author = userRepository.findById(asset.getUserId()).orElse(null);
        return ResponseEntity.ok(toDetailView(asset, author));
    }

    /**
     * 审核媒体图片（通过或驳回）。
     * <p>审核状态变更后用户端下次拉取即时生效（本人视角全可见 + 状态角标）。</p>
     *
     * @param id  资产 ID
     * @param req 审核请求体（decision: approved/rejected，拒绝时 remark 必填）
     * @return 操作结果；不存在返回 404；校区越权返回 403
     */
    @PostMapping("/{id}/audit")
    @Transactional
    @Auditable(value = AuditOperation.AUDIT_MEDIA_ASSET, targetType = "MEDIA_ASSET",
            description = "管理员审核媒体图片")
    public ResponseEntity<Map<String, Object>> auditMediaAsset(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminMediaAssetAuditRequest req) {
        Long auditorId = SecurityUtils.getCurrentUserId();

        Optional<MediaAsset> assetOpt = mediaAssetRepository.findById(id);
        if (assetOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        MediaAsset asset = assetOpt.get();
        // 数据隔离：校区管理员仅能审核本校区上传者的资产
        assertCampusAccess(asset);

        // 拒绝时必须提供备注（审核闭环要求：驳回原因可追溯）
        if (MediaAssetService.AUDIT_REJECTED.equals(req.decision())
                && (req.remark() == null || req.remark().isBlank())) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "rejected 审核必须提供备注（remark）"));
        }

        MediaAsset updated = mediaAssetService.updateAudit(id, req.decision(), req.remark(), auditorId)
                .orElseThrow(() -> new IllegalStateException("media_asset 记录不存在: " + id));

        Map<String, Object> body = new HashMap<>();
        body.put("id", updated.getId());
        body.put("auditStatus", updated.getAuditStatus());
        body.put("auditRemark", updated.getAuditRemark());
        return ResponseEntity.ok(body);
    }

    // ---- 视图转换 ----

    private AdminMediaAssetSummaryView toSummaryView(MediaAsset asset, User author) {
        return new AdminMediaAssetSummaryView(
                asset.getId(),
                asset.getUserId(),
                author != null ? author.getNickname() : null,
                author != null ? author.getAvatarUrl() : null,
                asset.getType(),
                asset.getUrl(),
                asset.getOriginalName(),
                asset.getMime(),
                asset.getSize(),
                asset.getWidth(),
                asset.getHeight(),
                asset.getStatus(),
                asset.getAuditStatus(),
                asset.getAuditRemark(),
                asset.getAuditorId(),
                asset.getAuditedAt(),
                asset.getCreatedAt(),
                adminDataScope.resolveUserCampusName(asset.getUserId())
        );
    }

    private AdminMediaAssetDetailView toDetailView(MediaAsset asset, User author) {
        return new AdminMediaAssetDetailView(
                asset.getId(),
                asset.getUserId(),
                author != null ? author.getNickname() : null,
                author != null ? author.getAvatarUrl() : null,
                asset.getType(),
                asset.getUrl(),
                asset.getOriginalName(),
                asset.getMime(),
                asset.getSize(),
                asset.getWidth(),
                asset.getHeight(),
                asset.getDurationMs(),
                asset.getStatus(),
                asset.getAuditStatus(),
                asset.getAuditRemark(),
                asset.getAuditorId(),
                asset.getAuditedAt(),
                asset.getCreatedAt(),
                adminDataScope.resolveUserCampusName(asset.getUserId())
        );
    }

    // ---- 辅助方法 ----

    /**
     * 批量加载上传者信息映射，避免 N+1 查询。
     *
     * @param userIds 上传者用户 ID 列表
     * @return userId → User 映射
     */
    private Map<Long, User> loadAuthorMap(List<Long> userIds) {
        List<Long> ids = userIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        List<User> authors = userRepository.findByIdIn(ids);
        Map<Long, User> result = new HashMap<>();
        for (User u : authors) {
            result.put(u.getId(), u);
        }
        return result;
    }

    /**
     * 校区越权拦截（详情/审核共用）。
     *
     * @param asset 目标资产
     * @throws OperationForbiddenException 校区管理员操作其他校区上传者的资产时
     */
    private void assertCampusAccess(MediaAsset asset) {
        adminDataScope.assertCampusAccess(adminDataScope.resolveUserCampusName(asset.getUserId()));
    }

    /** 去空白（筛选参数统一处理） */
    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}

/**
 * 媒体图片审核列表视图。
 *
 * @param id            资产 ID
 * @param userId        上传者用户 ID
 * @param userNickname  上传者昵称
 * @param userAvatar    上传者头像 URL
 * @param type          媒体类型（avatar/image）
 * @param url           媒体 URL
 * @param originalName  原始文件名
 * @param mime          MIME 类型
 * @param size          文件大小（字节）
 * @param width         图片宽度（像素）
 * @param height        图片高度（像素）
 * @param status        资产状态（pending/ready/failed）
 * @param auditStatus   审核状态（pending/approved/rejected）
 * @param auditRemark   审核备注（拒绝原因）
 * @param auditorId     审核人用户 ID
 * @param auditedAt     审核时间
 * @param createdAt     上传时间
 * @param campusName    上传者所属校区
 */
record AdminMediaAssetSummaryView(
        Long id,
        Long userId,
        String userNickname,
        String userAvatar,
        String type,
        String url,
        String originalName,
        String mime,
        Long size,
        Integer width,
        Integer height,
        String status,
        String auditStatus,
        String auditRemark,
        Long auditorId,
        LocalDateTime auditedAt,
        LocalDateTime createdAt,
        String campusName
) {
}

/**
 * 媒体图片审核详情视图（列表字段 + 视频时长）。
 */
record AdminMediaAssetDetailView(
        Long id,
        Long userId,
        String userNickname,
        String userAvatar,
        String type,
        String url,
        String originalName,
        String mime,
        Long size,
        Integer width,
        Integer height,
        Integer durationMs,
        String status,
        String auditStatus,
        String auditRemark,
        Long auditorId,
        LocalDateTime auditedAt,
        LocalDateTime createdAt,
        String campusName
) {
}
