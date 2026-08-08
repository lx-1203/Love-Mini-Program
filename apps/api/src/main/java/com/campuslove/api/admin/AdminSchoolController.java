package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.School;
import com.campuslove.api.repository.SchoolRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 高校管理控制器（商业模式：每个高校一个管理员）。
 * <p>高校是一级管理对象（schools 表），创建校区管理员时从该表下拉选择。
 * 仅超级管理员可管理高校（含新增/编辑/删除/启用/停用）。</p>
 *
 * <p>停用高校语义：school.status=disabled 时，对应校区管理员登录被拒
 * （由登录流程 {@code AdminLoginSchoolCheck} 校验，见 Phase 2.1.2）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/schools")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminSchoolController {

    private final SchoolRepository schoolRepository;

    public AdminSchoolController(SchoolRepository schoolRepository) {
        this.schoolRepository = schoolRepository;
    }

    /**
     * 分页查询高校列表（关键词/状态筛选）。
     *
     * @param keyword  名称/编码模糊关键字，可选
     * @param status   状态筛选：active / disabled，可选
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页高校列表
     */
    @GetMapping
    public AdminPageView<AdminSchoolView> listSchools(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedKeyword = normalize(keyword);
        String normalizedStatus = normalize(status);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<School> result = schoolRepository.searchForAdmin(normalizedKeyword, normalizedStatus, pageable);
        List<AdminSchoolView> items = result.getContent().stream().map(this::toView).toList();

        return new AdminPageView<>(
                items,
                result.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize)
        );
    }

    /**
     * 查询全部启用高校（创建校区管理员时下拉选择，无需分页）。
     *
     * @return 启用高校列表
     */
    @GetMapping("/options")
    public List<AdminSchoolView> listSchoolOptions() {
        SecurityUtils.getCurrentUserId();
        return schoolRepository.findByStatusOrderBySortOrderAsc("active").stream()
                .map(this::toView)
                .toList();
    }

    /**
     * 查询高校详情。
     *
     * @param id 高校 ID
     * @return 高校详情；不存在返回 404
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminSchoolView> getSchool(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();
        Optional<School> schoolOpt = schoolRepository.findById(id);
        return schoolOpt.map(school -> ResponseEntity.ok(toView(school)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * 新增高校（仅超级管理员）。
     *
     * @param req 新增请求体
     * @return 创建后的高校
     */
    @PostMapping
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.CREATE_SCHOOL, targetType = "SCHOOL",
            description = "新增高校")
    public ResponseEntity<AdminSchoolView> createSchool(@Valid @RequestBody AdminSchoolRequest req) {
        SecurityUtils.getCurrentUserId();

        // 编码与名称唯一性校验
        if (schoolRepository.findByCode(req.code()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }
        if (schoolRepository.findByName(req.name()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }

        School school = new School();
        school.setName(req.name().trim());
        school.setCode(req.code().trim().toUpperCase());
        school.setStatus("active");
        school.setSortOrder(req.sortOrder() != null ? req.sortOrder() : 0);
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        school.setCreatedAt(now);
        school.setUpdatedAt(now);
        School saved = schoolRepository.save(school);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 编辑高校（仅超级管理员）。
     *
     * @param id  高校 ID
     * @param req 编辑请求体（name/code/sortOrder 可部分更新）
     * @return 更新后的高校；不存在返回 404
     */
    @PutMapping("/{id}")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_SCHOOL, targetType = "SCHOOL",
            description = "编辑高校")
    public ResponseEntity<AdminSchoolView> updateSchool(
            @PathVariable("id") @Min(1) Long id,
            @Valid @RequestBody AdminSchoolRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<School> schoolOpt = schoolRepository.findById(id);
        if (schoolOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        School school = schoolOpt.get();

        // 编码/名称唯一性校验（排除自身）
        if (req.code() != null) {
            Optional<School> codeExists = schoolRepository.findByCode(req.code().trim().toUpperCase());
            if (codeExists.isPresent() && !codeExists.get().getId().equals(id)) {
                return ResponseEntity.badRequest().build();
            }
            school.setCode(req.code().trim().toUpperCase());
        }
        if (req.name() != null) {
            Optional<School> nameExists = schoolRepository.findByName(req.name().trim());
            if (nameExists.isPresent() && !nameExists.get().getId().equals(id)) {
                return ResponseEntity.badRequest().build();
            }
            school.setName(req.name().trim());
        }
        if (req.sortOrder() != null) {
            school.setSortOrder(req.sortOrder());
        }
        school.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        School saved = schoolRepository.save(school);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 启用/停用高校（仅超级管理员）。
     * <p>停用高校后，该校区对应管理员登录被拒（由登录流程校验）。</p>
     *
     * @param id     高校 ID
     * @param status 目标状态：active / disabled
     * @return 操作结果
     */
    @PostMapping("/{id}/status")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.TOGGLE_SCHOOL, targetType = "SCHOOL",
            description = "启用/停用高校")
    public ResponseEntity<AdminSchoolView> toggleSchoolStatus(
            @PathVariable("id") @Min(1) Long id,
            @RequestParam(name = "status", defaultValue = "disabled") String status) {
        SecurityUtils.getCurrentUserId();

        Optional<School> schoolOpt = schoolRepository.findById(id);
        if (schoolOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        School school = schoolOpt.get();
        String normalized = "active".equalsIgnoreCase(status) ? "active" : "disabled";
        school.setStatus(normalized);
        school.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        School saved = schoolRepository.save(school);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 删除高校（仅超级管理员）。
     * <p>删除前校验该高校未被管理员关联（存在 campus_name 匹配的管理员时拒绝删除）。</p>
     *
     * @param id 高校 ID
     * @return 204 删除成功；404 不存在；409 被管理员关联
     */
    @DeleteMapping("/{id}")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.DELETE_SCHOOL, targetType = "SCHOOL",
            description = "删除高校")
    public ResponseEntity<Void> deleteSchool(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<School> schoolOpt = schoolRepository.findById(id);
        if (schoolOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 幂等性：存在关联校区管理员时返回 409 阻止删除（避免孤儿数据）
        if (schoolHasLinkedAdmin(schoolOpt.get().getName())) {
            return ResponseEntity.status(409).build();
        }
        schoolRepository.delete(schoolOpt.get());
        return ResponseEntity.noContent().build();
    }

    /**
     * 检查是否存在管辖该校区名的管理员账号。
     *
     * @param schoolName 高校名称（与 user.campus_name 对齐）
     * @return true 存在关联管理员
     */
    private boolean schoolHasLinkedAdmin(String schoolName) {
        return schoolRepository.countByLinkedAdminName(schoolName) > 0;
    }

    private AdminSchoolView toView(School school) {
        return new AdminSchoolView(
                school.getId(),
                school.getName(),
                school.getCode(),
                school.getStatus(),
                school.getSortOrder(),
                school.getCreatedAt() != null ? school.getCreatedAt().toString() : null,
                school.getUpdatedAt() != null ? school.getUpdatedAt().toString() : null
        );
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

/**
 * 新增/编辑高校请求体。
 *
 * @param name      高校全称（必填，唯一，1-128 字）
 * @param code      高校编码（必填，唯一，字母数字，如 NJU）
 * @param sortOrder 排序权重（可选）
 */
record AdminSchoolRequest(
        @NotBlank(message = ErrorMessages.SCHOOL_NAME_REQUIRED)
        @Size(min = 1, max = 128, message = ErrorMessages.SCHOOL_NAME_LENGTH_INVALID) String name,
        @NotBlank(message = ErrorMessages.SCHOOL_CODE_REQUIRED)
        @Pattern(regexp = "^[A-Za-z0-9]{1,32}$", message = ErrorMessages.SCHOOL_CODE_LENGTH_INVALID)
        String code,
        Integer sortOrder) {
}

/**
 * 高校视图。
 */
record AdminSchoolView(
        Long id,
        String name,
        String code,
        String status,
        Integer sortOrder,
        String createdAt,
        String updatedAt) {
}
