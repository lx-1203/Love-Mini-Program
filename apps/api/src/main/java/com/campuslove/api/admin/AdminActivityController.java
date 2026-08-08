package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.ActivityEnrollment;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
 * 管理后台 - 活动管理控制器。
 * <p>提供活动分页列表、详情、新增、编辑、删除、上架/下架、报名列表与报名 CSV 导出等接口。</p>
 *
 * <p>数据隔离（商业模式：每个高校一个管理员，委托 {@link AdminDataScope}）：</p>
 * <ul>
 *   <li>列表：校区管理员强制按管辖校区过滤（忽略调用方 campusName 参数）；
 *       全局管理员（SUPER_ADMIN 或 ADMIN 无校区）可用 campusName 参数筛选</li>
 *   <li>创建：校区管理员强制把活动 campusName 设为管辖校区，避免越权创建他校活动</li>
 *   <li>编辑/删除/上架/下架/详情/报名列表/导出：读取目标活动后调用
 *       {@link AdminDataScope#assertCampusAccess(String)} 校验越权，越权抛 403</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/activities")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminActivityController {

    /** 报名状态：报名记录无取消机制，状态恒为已报名 */
    private static final String ENROLLMENT_STATUS_JOINED = "joined";

    /** CSV 时间格式 */
    private static final DateTimeFormatter CSV_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ActivityRepository activityRepository;
    private final ActivityEnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    /** 管理端数据隔离（多管理员多校区） */
    private final AdminDataScope adminDataScope;

    public AdminActivityController(
            ActivityRepository activityRepository,
            ActivityEnrollmentRepository enrollmentRepository,
            UserRepository userRepository,
            AdminDataScope adminDataScope) {
        this.activityRepository = activityRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询活动列表（支持标题/状态/上架状态/校区筛选）。
     *
     * <p>数据隔离：校区管理员强制按管辖校区过滤，忽略调用方 campusName 参数；
     * 全局管理员（SUPER_ADMIN）可用 campusName 参数筛选。</p>
     *
     * @param keyword    标题模糊关键字，可选
     * @param status     活动状态筛选：upcoming / ongoing / ended，可选
     * @param published  上架状态筛选：true / false，可选
     * @param campusName 校区名称筛选（仅全局管理员生效），可选
     * @param page       页码，1-based，默认 1
     * @param pageSize   每页大小，默认 20，最大 100
     * @return 分页活动列表
     */
    @GetMapping
    public AdminPageView<AdminActivitySummaryView> listActivities(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "published", required = false) Boolean published,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedKeyword = normalize(keyword);
        ActivityStatus statusEnum = parseActivityStatus(status);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        // 数据隔离：校区管理员强制按管辖校区过滤，忽略调用方 campusName 参数；
        // 全局管理员（SUPER_ADMIN 等）可用 campusName 参数筛选
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();
        String effectiveCampus = scopedCampus != null
                ? scopedCampus
                : normalize(campusName);

        Page<Activity> result = activityRepository.searchForAdmin(
                normalizedKeyword, statusEnum, published, effectiveCampus, pageable);

        List<AdminActivitySummaryView> items = result.getContent().stream()
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
     * 查询活动详情。
     *
     * @param id 活动 ID
     * @return 活动详情；不存在返回 404；越权访问其他校区活动返回 403
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminActivityDetailView> getActivity(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Activity> activityOpt = activityRepository.findById(id);
        if (activityOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Activity activity = activityOpt.get();
        // 数据隔离：校区管理员仅可查看管辖校区活动（读操作与写操作同规则）
        adminDataScope.assertCampusAccess(activity.getCampusName());
        return ResponseEntity.ok(toDetailView(activity));
    }

    /**
     * 新增活动。
     *
     * <p>数据隔离：当前管理员为校区管理员时，强制把 campusName 设为管辖校区
     * （忽略请求体中的 campusName），避免越权创建他校活动。</p>
     *
     * @param req 新增活动请求体
     * @return 创建后的活动详情
     */
    @PostMapping
    @Transactional
    @Auditable(value = AuditOperation.CREATE_ACTIVITY, targetType = "ACTIVITY",
            description = "新增活动")
    public ResponseEntity<AdminActivityDetailView> createActivity(
            @Valid @RequestBody AdminActivityRequest req) {
        SecurityUtils.getCurrentUserId();
        validateRequiredFields(req);

        Activity activity = new Activity();
        activity.setTitle(req.title().trim());
        activity.setLocation(req.location().trim());
        activity.setScheduleText(req.scheduleText().trim());
        activity.setDescription(req.description().trim());
        activity.setCityName(normalize(req.cityName()));
        // 数据隔离：校区管理员强制把活动归属设为管辖校区，全局管理员使用请求体中的校区
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();
        activity.setCampusName(scopedCampus != null ? scopedCampus : normalize(req.campusName()));
        activity.setActivityDate(req.activityDate());
        ActivityStatus status = parseActivityStatus(req.status());
        activity.setStatus(status != null ? status : ActivityStatus.upcoming);
        activity.setPublished(req.published() != null ? req.published() : Boolean.TRUE);
        activity.setEnrollmentCount(0);
        activity.setParticipantAvatars("[]");

        Activity saved = activityRepository.save(activity);
        return ResponseEntity.ok(toDetailView(saved));
    }

    /**
     * 编辑活动（全量表单更新，必填字段校验同新增）。
     *
     * <p>数据隔离：读取目标活动后调用 {@link AdminDataScope#assertCampusAccess(String)}
     * 校验越权；校区管理员编辑时 campusName 不可变更（保持原管辖校区），
     * 仅全局管理员可调整活动归属校区。</p>
     *
     * @param id  活动 ID
     * @param req 编辑活动请求体
     * @return 更新后的活动详情；不存在返回 404；越权返回 403
     */
    @PutMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.UPDATE_ACTIVITY, targetType = "ACTIVITY",
            description = "编辑活动")
    public ResponseEntity<AdminActivityDetailView> updateActivity(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminActivityRequest req) {
        SecurityUtils.getCurrentUserId();
        validateRequiredFields(req);

        Optional<Activity> activityOpt = activityRepository.findById(id);
        if (activityOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Activity activity = activityOpt.get();
        // 数据隔离：越权操作其他校区活动抛 403
        adminDataScope.assertCampusAccess(activity.getCampusName());

        activity.setTitle(req.title().trim());
        activity.setLocation(req.location().trim());
        activity.setScheduleText(req.scheduleText().trim());
        activity.setDescription(req.description().trim());
        activity.setCityName(normalize(req.cityName()));
        // 校区管理员编辑时 campusName 不可变更（防改到其他校区造成越权数据可见），
        // 仅全局管理员可调整归属校区
        if (adminDataScope.getCurrentAdminCampusName() == null) {
            activity.setCampusName(normalize(req.campusName()));
        }
        activity.setActivityDate(req.activityDate());
        ActivityStatus status = parseActivityStatus(req.status());
        if (status != null) {
            activity.setStatus(status);
        }
        if (req.published() != null) {
            activity.setPublished(req.published());
        }
        activity.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        Activity saved = activityRepository.save(activity);
        return ResponseEntity.ok(toDetailView(saved));
    }

    /**
     * 删除活动（硬删除，同时清理该活动下全部报名记录避免孤儿数据）。
     * <p>活动被删除后不可恢复，前端需二次确认；报名记录随活动一并清除。</p>
     *
     * @param id 活动 ID
     * @return 操作结果；不存在返回 404；越权返回 403
     */
    @DeleteMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.DELETE_ACTIVITY, targetType = "ACTIVITY",
            description = "删除活动")
    public ResponseEntity<Map<String, Object>> deleteActivity(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Activity> activityOpt = activityRepository.findById(id);
        if (activityOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Activity activity = activityOpt.get();
        // 数据隔离：越权操作其他校区活动抛 403
        adminDataScope.assertCampusAccess(activity.getCampusName());

        // 先清理报名记录再删除活动，避免外键孤儿数据
        enrollmentRepository.deleteByActivityId(id);
        activityRepository.delete(activity);

        Map<String, Object> body = new HashMap<>();
        body.put("id", id);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 上架活动（published=true）。
     *
     * @param id 活动 ID
     * @return 操作结果；不存在返回 404；越权返回 403
     */
    @PostMapping("/{id}/publish")
    @Transactional
    @Auditable(value = AuditOperation.PUBLISH_ACTIVITY, targetType = "ACTIVITY",
            description = "上架活动")
    public ResponseEntity<Map<String, Object>> publishActivity(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        return setPublished(id, true);
    }

    /**
     * 下架活动（published=false）。
     *
     * @param id 活动 ID
     * @return 操作结果；不存在返回 404；越权返回 403
     */
    @PostMapping("/{id}/unpublish")
    @Transactional
    @Auditable(value = AuditOperation.UNPUBLISH_ACTIVITY, targetType = "ACTIVITY",
            description = "下架活动")
    public ResponseEntity<Map<String, Object>> unpublishActivity(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        return setPublished(id, false);
    }

    /**
     * 分页查询活动报名列表（含用户昵称/头像/报名时间/状态）。
     *
     * <p>报名记录实体无状态字段（无取消机制），状态恒为 {@code joined}（已报名）。</p>
     *
     * @param id       活动 ID
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 报名记录分页列表；活动不存在返回 404；越权返回 403
     */
    @GetMapping("/{id}/enrollments")
    public ResponseEntity<AdminPageView<AdminEnrollmentView>> listEnrollments(
            @PathVariable("id") @Positive Long id,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        Optional<Activity> activityOpt = activityRepository.findById(id);
        if (activityOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 数据隔离：校区管理员仅可查看管辖校区活动的报名数据
        adminDataScope.assertCampusAccess(activityOpt.get().getCampusName());

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<ActivityEnrollment> result =
                enrollmentRepository.findByActivityIdOrderByEnrolledAtDesc(id, pageable);

        // 批量预加载报名用户昵称/头像，避免 N+1 查询
        Map<Long, User> userMap = loadUserMap(result.getContent());
        List<AdminEnrollmentView> items = result.getContent().stream()
                .map(enrollment -> toEnrollmentView(enrollment, userMap))
                .toList();

        AdminPageView<AdminEnrollmentView> view = new AdminPageView<>(
                items,
                result.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize)
        );
        return ResponseEntity.ok(view);
    }

    /**
     * 导出活动报名记录 CSV（全部报名，不分页）。
     * <p>文件头带 UTF-8 BOM，保证 Excel 直接打开中文不乱码；
     * 响应 Content-Type 为 text/csv，附件下载。</p>
     *
     * @param id 活动 ID
     * @return CSV 文件流；活动不存在返回 404；越权返回 403
     */
    @GetMapping("/{id}/enrollments/export")
    public ResponseEntity<byte[]> exportEnrollments(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Activity> activityOpt = activityRepository.findById(id);
        if (activityOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 数据隔离：校区管理员仅可导出管辖校区活动的报名数据
        adminDataScope.assertCampusAccess(activityOpt.get().getCampusName());

        List<ActivityEnrollment> enrollments = enrollmentRepository.findByActivityId(id);
        Map<Long, User> userMap = loadUserMap(enrollments);

        StringBuilder csv = new StringBuilder();
        // 前置 UTF-8 BOM，保证 Excel 打开中文不乱码
        csv.append('\uFEFF');
        csv.append("用户ID,昵称,报名时间,状态\r\n");
        for (ActivityEnrollment enrollment : enrollments) {
            User user = userMap.get(enrollment.getUserId());
            String nickname = user != null ? user.getNickname() : "";
            String enrolledAt = enrollment.getEnrolledAt() != null
                    ? enrollment.getEnrolledAt().format(CSV_TIME_FORMATTER)
                    : "";
            csv.append(enrollment.getUserId()).append(',')
                    .append(escapeCsv(nickname)).append(',')
                    .append(escapeCsv(enrolledAt)).append(',')
                    .append(ENROLLMENT_STATUS_JOINED).append("\r\n");
        }

        byte[] content = csv.toString().getBytes(StandardCharsets.UTF_8);
        String filename = "activity_enrollments_" + id + ".csv";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(content);
    }

    /**
     * 设置活动上架状态（上架/下架共用）。
     *
     * @param id        活动 ID
     * @param published 目标上架状态
     * @return 操作结果；活动不存在返回 404；越权返回 403
     */
    private ResponseEntity<Map<String, Object>> setPublished(Long id, boolean published) {
        Optional<Activity> activityOpt = activityRepository.findById(id);
        if (activityOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Activity activity = activityOpt.get();
        // 数据隔离：越权操作其他校区活动抛 403
        adminDataScope.assertCampusAccess(activity.getCampusName());

        activity.setPublished(published);
        activity.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        activityRepository.save(activity);

        Map<String, Object> body = new HashMap<>();
        body.put("id", activity.getId());
        body.put("published", activity.getPublished());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 批量加载报名用户映射，避免 N+1 查询。
     *
     * @param enrollments 报名记录列表
     * @return userId -> User 映射
     */
    private Map<Long, User> loadUserMap(List<ActivityEnrollment> enrollments) {
        List<Long> userIds = enrollments.stream()
                .map(ActivityEnrollment::getUserId)
                .distinct()
                .toList();
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findByIdIn(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
    }

    /**
     * 报名记录 Entity 转 View。
     *
     * @param enrollment 报名记录
     * @param userMap    报名用户映射（预加载）
     * @return 报名视图
     */
    private AdminEnrollmentView toEnrollmentView(
            ActivityEnrollment enrollment, Map<Long, User> userMap) {
        User user = userMap.get(enrollment.getUserId());
        return new AdminEnrollmentView(
                enrollment.getId(),
                enrollment.getUserId(),
                user != null ? user.getNickname() : null,
                user != null ? user.getAvatarUrl() : null,
                enrollment.getEnrolledAt(),
                ENROLLMENT_STATUS_JOINED
        );
    }

    /**
     * 活动 Entity 转列表摘要 View。
     */
    private AdminActivitySummaryView toSummaryView(Activity activity) {
        return new AdminActivitySummaryView(
                activity.getId(),
                activity.getTitle(),
                activity.getLocation(),
                activity.getScheduleText(),
                activity.getCityName(),
                activity.getCampusName(),
                activity.getStatus() != null ? activity.getStatus().name() : null,
                activity.getPublished(),
                activity.getEnrollmentCount(),
                activity.getActivityDate(),
                activity.getCreatedAt(),
                activity.getUpdatedAt()
        );
    }

    /**
     * 活动 Entity 转详情 View（含完整描述）。
     */
    private AdminActivityDetailView toDetailView(Activity activity) {
        return new AdminActivityDetailView(
                activity.getId(),
                activity.getTitle(),
                activity.getLocation(),
                activity.getScheduleText(),
                activity.getDescription(),
                activity.getCityName(),
                activity.getCampusName(),
                activity.getStatus() != null ? activity.getStatus().name() : null,
                activity.getPublished(),
                activity.getEnrollmentCount(),
                activity.getActivityDate(),
                activity.getCreatedAt(),
                activity.getUpdatedAt()
        );
    }

    /**
     * 显式校验新增/编辑活动的必填字段（@Valid 注解作为第二道防线，
     * 显式校验保证单元测试与统一中文错误文案）。
     *
     * @param req 活动请求体
     * @throws IllegalArgumentException 必填字段缺失或超长时
     */
    private void validateRequiredFields(AdminActivityRequest req) {
        if (req.title() == null || req.title().isBlank()) {
            throw new IllegalArgumentException("活动标题不能为空");
        }
        if (req.title().trim().length() > 128) {
            throw new IllegalArgumentException("活动标题长度不能超过 128 字");
        }
        if (req.location() == null || req.location().isBlank()) {
            throw new IllegalArgumentException("活动地点不能为空");
        }
        if (req.location().trim().length() > 256) {
            throw new IllegalArgumentException("活动地点长度不能超过 256 字");
        }
        if (req.scheduleText() == null || req.scheduleText().isBlank()) {
            throw new IllegalArgumentException("活动时间描述不能为空");
        }
        if (req.scheduleText().trim().length() > 128) {
            throw new IllegalArgumentException("活动时间描述长度不能超过 128 字");
        }
        if (req.description() == null || req.description().isBlank()) {
            throw new IllegalArgumentException("活动描述不能为空");
        }
    }

    /**
     * 解析活动状态参数。
     *
     * @param value 状态字符串：upcoming / ongoing / ended
     * @return 活动状态枚举；null 或空白返回 null
     * @throws IllegalArgumentException 非法状态参数时
     */
    private ActivityStatus parseActivityStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return ActivityStatus.valueOf(value.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            // 非法筛选/请求参数直接 400，不再静默转 null 导致条件失效
            throw new IllegalArgumentException("非法活动状态参数: " + value);
        }
    }

    /**
     * 空串转 null 归一化。
     *
     * @param value 原始值
     * @return 去空格后的值；null 或空白返回 null
     */
    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * CSV 字段转义：含逗号/引号/换行时用双引号包裹，内部引号双写。
     *
     * @param value 原始值
     * @return 转义后的 CSV 字段
     */
    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"")
                || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}

/**
 * 新增/编辑活动请求体。
 * <p>创建与编辑共用：title/location/scheduleText/description 为必填
 * （对应 activities 表非空列），其余字段可空（编辑时 null 保持原值）。</p>
 *
 * @param title        活动标题（必填，1-128 字）
 * @param location     活动地点（必填，1-256 字）
 * @param scheduleText 活动时间描述（必填，1-128 字）
 * @param description  活动描述（必填）
 * @param cityName     城市名称（可选，≤64 字）
 * @param campusName   校区名称（可选，≤128 字；校区管理员创建时被强制覆盖为管辖校区）
 * @param activityDate 活动日期（可选，ISO yyyy-MM-dd）
 * @param status       活动状态（可选：upcoming / ongoing / ended，默认 upcoming）
 * @param published    是否上架（可选，默认 true）
 */
record AdminActivityRequest(
        @NotBlank(message = "活动标题不能为空")
        @Size(max = 128, message = "活动标题长度不能超过 128 字") String title,
        @NotBlank(message = "活动地点不能为空")
        @Size(max = 256, message = "活动地点长度不能超过 256 字") String location,
        @NotBlank(message = "活动时间描述不能为空")
        @Size(max = 128, message = "活动时间描述长度不能超过 128 字") String scheduleText,
        @NotBlank(message = "活动描述不能为空") String description,
        @Size(max = 64, message = "城市名称长度不能超过 64 字") String cityName,
        @Size(max = 128, message = "校区名称长度不能超过 128 字") String campusName,
        LocalDate activityDate,
        String status,
        Boolean published) {
}

/**
 * 活动列表摘要视图。
 */
record AdminActivitySummaryView(
        Long id,
        String title,
        String location,
        String scheduleText,
        String cityName,
        String campusName,
        String status,
        Boolean published,
        Integer enrollmentCount,
        LocalDate activityDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}

/**
 * 活动详情视图（含完整描述）。
 */
record AdminActivityDetailView(
        Long id,
        String title,
        String location,
        String scheduleText,
        String description,
        String cityName,
        String campusName,
        String status,
        Boolean published,
        Integer enrollmentCount,
        LocalDate activityDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}

/**
 * 活动报名记录视图。
 *
 * @param id         报名记录 ID
 * @param userId     报名用户 ID
 * @param nickname   报名用户昵称
 * @param avatarUrl  报名用户头像
 * @param enrolledAt 报名时间
 * @param status     报名状态（报名记录无取消机制，恒为 joined）
 */
record AdminEnrollmentView(
        Long id,
        Long userId,
        String nickname,
        String avatarUrl,
        LocalDateTime enrolledAt,
        String status) {
}
