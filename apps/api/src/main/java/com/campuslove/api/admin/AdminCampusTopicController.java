package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.CampusTopic;
import com.campuslove.api.entity.CampusTopic.AuditStatus;
import com.campuslove.api.entity.CampusTopic.TopicStatus;
import com.campuslove.api.entity.School;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CampusTopicRepository;
import com.campuslove.api.repository.SchoolRepository;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 论坛分页管理：校园圈话题控制器。
 * <p>提供校园圈话题分页列表、审核、删除等接口，归属
 * /api/v1/admin/forum/campus-topics 独立端点。</p>
 *
 * <p>数据隔离说明（商业模式：每个高校一个管理员）：</p>
 * <ul>
 *   <li>campus_topics 表无 campus_name 列，通过 school_id 关联 schools 表；
 *       学校名（school.name）与管理员管辖校区名（user.campus_name）字符串对齐
 *       （V2026.08.07.0010），因此校区隔离按
 *       campusName → School.name → schoolId 转换后过滤话题</li>
 *   <li>校区管理员（ADMIN + campusName 非空）强制按管辖校区过滤列表，
 *       忽略调用方传入的 campusName 参数；管辖校区无对应学校记录时返回空页</li>
 *   <li>写操作通过 {@link AdminDataScope#assertCampusAccess(String)} 越权拦截（HTTP 403）</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/forum/campus-topics")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminCampusTopicController {

    private final CampusTopicRepository campusTopicRepository;
    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final AdminDataScope adminDataScope;

    public AdminCampusTopicController(
            CampusTopicRepository campusTopicRepository,
            SchoolRepository schoolRepository,
            UserRepository userRepository,
            AdminDataScope adminDataScope) {
        this.campusTopicRepository = campusTopicRepository;
        this.schoolRepository = schoolRepository;
        this.userRepository = userRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询校园圈话题列表（关键字/状态/校区筛选）。
     *
     * @param keyword    标题/内容模糊关键字，可选
     * @param status     话题状态：active / deleted / hidden，可选
     * @param campusName 校区筛选（按学校名匹配后以 schoolId 过滤），可选；
     *                   校区管理员强制按其管辖校区过滤，忽略本参数
     * @param page       页码，1-based，默认 1
     * @param pageSize   每页大小，默认 20，最大 100
     * @return 分页校园圈话题列表（按创建时间倒序）
     */
    @GetMapping
    public AdminPageView<AdminCampusTopicSummaryView> listTopics(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        TopicStatus topicStatusEnum = parseTopicStatus(status);
        String normalizedKeyword = normalize(keyword);

        // 数据隔离：校区管理员强制按其管辖校区过滤，忽略调用方传入的 campusName
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();
        if (effectiveCampus == null) {
            effectiveCampus = normalize(campusName);
        }

        // 校区名 → 学校 ID 转换（campusName 与 school.name 字符串对齐）；
        // 无匹配学校时返回空页（该校区尚无学校记录或校区名不合法）
        Long schoolId = resolveSchoolId(effectiveCampus);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<CampusTopic> result = campusTopicRepository.searchForAdmin(
                schoolId, topicStatusEnum, normalizedKeyword, pageable);

        // 批量预加载作者昵称与学校名，避免 N+1 查询
        Map<Long, String> authorNicknameMap = loadAuthorNicknames(result.getContent());
        Map<Long, String> schoolNameMap = loadSchoolNames(result.getContent());

        List<AdminCampusTopicSummaryView> items = result.getContent().stream()
                .map(topic -> toSummaryView(topic, authorNicknameMap, schoolNameMap))
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
     * 审核校园圈话题（通过或拒绝）。
     * <p>与 AdminPostController 审核逻辑一致：拒绝时同步将 status 置为
     * hidden，使其在客户端校园圈列表不可见；通过时保持原 status 不变。</p>
     *
     * @param id  话题 ID
     * @param req 审核请求体（decision: approved/rejected）
     * @return 操作结果；话题不存在返回 404；校区越权返回 403
     */
    @PostMapping("/{id}/audit")
    @Transactional
    @Auditable(value = AuditOperation.AUDIT_POST, targetType = "CAMPUS_TOPIC",
            description = "管理员审核校园圈话题")
    public ResponseEntity<Map<String, Object>> auditTopic(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminPostAuditRequest req) {
        Long auditorId = SecurityUtils.getCurrentUserId();

        Optional<CampusTopic> topicOpt = campusTopicRepository.findById(id);
        if (topicOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CampusTopic topic = topicOpt.get();
        // 数据隔离：校区管理员仅能审核本校话题
        assertTopicCampusAccess(topic);

        AuditStatus newStatus = "approved".equals(req.decision())
                ? AuditStatus.approved
                : AuditStatus.rejected;
        topic.setAuditStatus(newStatus);
        topic.setAuditRemark(req.remark());
        topic.setAuditorId(auditorId);
        topic.setAuditedAt(LocalDateTime.now(TimeZones.BUSINESS));
        topic.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        // 审核拒绝时同步隐藏，使其在客户端校园圈列表不可见（与 AdminPostController 一致）
        if (newStatus == AuditStatus.rejected && topic.getStatus() == TopicStatus.active) {
            topic.setStatus(TopicStatus.hidden);
        }

        campusTopicRepository.save(topic);

        Map<String, Object> body = new HashMap<>();
        body.put("id", topic.getId());
        body.put("auditStatus", topic.getAuditStatus().name());
        body.put("auditRemark", topic.getAuditRemark());
        body.put("auditorId", topic.getAuditorId());
        body.put("auditedAt", topic.getAuditedAt());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 删除校园圈话题（软删除）。
     * <p>将话题 status 置为 deleted，保留数据用于审计；回复表
     * （campus_topic_replies）随话题维度查询天然隐藏，不硬删。</p>
     *
     * <p>注意：客户端 {@code RealCampusService.getCampusTopics} 目前未按
     * status 过滤（findBySchoolIdOrderByCreatedAtDesc 返回全状态），
     * 软删后的话题在客户端校园圈列表仍可见，需后续在客户端查询层
     * 追加 status = 'active' 过滤（本任务范围外，不做客户端改动）。</p>
     *
     * @param id 话题 ID
     * @return 操作结果；话题不存在返回 404；校区越权返回 403
     */
    @DeleteMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.DELETE_POST, targetType = "CAMPUS_TOPIC",
            description = "管理员删除校园圈话题（软删）")
    public ResponseEntity<Map<String, Object>> deleteTopic(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<CampusTopic> topicOpt = campusTopicRepository.findById(id);
        if (topicOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CampusTopic topic = topicOpt.orElseThrow(() ->
                new IllegalStateException("topicOpt 已确认非空但 orElseThrow 触发，数据不一致"));
        // 数据隔离：校区管理员仅能删除本校话题
        assertTopicCampusAccess(topic);

        topic.setStatus(TopicStatus.deleted);
        topic.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        campusTopicRepository.save(topic);

        Map<String, Object> body = new HashMap<>();
        body.put("id", topic.getId());
        body.put("status", topic.getStatus().name());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 校验当前管理员对目标话题的校区访问权（写操作越权拦截）。
     *
     * @param topic 目标话题
     * @throws com.campuslove.api.common.OperationForbiddenException 校区越权时
     */
    private void assertTopicCampusAccess(CampusTopic topic) {
        String schoolName = resolveSchoolName(topic.getSchoolId());
        adminDataScope.assertCampusAccess(schoolName);
    }

    /**
     * 校区名 → 学校 ID 转换（campusName 与 school.name 字符串对齐）。
     *
     * @param campusName 校区名（可为 null 表示不过滤）
     * @return 匹配的学校 ID；校区名为 null 或无匹配学校时返回 null
     */
    private Long resolveSchoolId(String campusName) {
        if (campusName == null) {
            return null;
        }
        return schoolRepository.findByName(campusName)
                .map(School::getId)
                .orElse(null);
    }

    /**
     * 学校 ID → 学校名转换（写操作越权校验用）。
     *
     * @param schoolId 学校 ID
     * @return 学校名；无匹配学校时返回 null（按 AdminDataScope 语义视为全局资源）
     */
    private String resolveSchoolName(Long schoolId) {
        if (schoolId == null) {
            return null;
        }
        return schoolRepository.findById(schoolId)
                .map(School::getName)
                .orElse(null);
    }

    /**
     * 批量加载话题作者昵称映射，避免 N+1 查询。
     *
     * @param topics 当前页话题列表
     * @return userId -> nickname 映射
     */
    private Map<Long, String> loadAuthorNicknames(List<CampusTopic> topics) {
        List<Long> authorIds = topics.stream()
                .map(CampusTopic::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (authorIds.isEmpty()) {
            return Map.of();
        }
        List<User> authors = userRepository.findByIdIn(authorIds);
        Map<Long, String> result = new HashMap<>();
        for (User u : authors) {
            result.put(u.getId(), u.getNickname());
        }
        return result;
    }

    /**
     * 批量加载学校名映射（schoolId -> schoolName），避免 N+1 查询。
     *
     * @param topics 当前页话题列表
     * @return schoolId -> schoolName 映射
     */
    private Map<Long, String> loadSchoolNames(List<CampusTopic> topics) {
        List<Long> schoolIds = topics.stream()
                .map(CampusTopic::getSchoolId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (schoolIds.isEmpty()) {
            return Map.of();
        }
        List<School> schools = schoolRepository.findByIdIn(schoolIds);
        Map<Long, String> result = new HashMap<>();
        for (School s : schools) {
            result.put(s.getId(), s.getName());
        }
        return result;
    }

    /**
     * Entity 转列表 SummaryView。
     */
    private AdminCampusTopicSummaryView toSummaryView(
            CampusTopic topic, Map<Long, String> authorNicknameMap, Map<Long, String> schoolNameMap) {
        return new AdminCampusTopicSummaryView(
                topic.getId(),
                topic.getSchoolId(),
                schoolNameMap.get(topic.getSchoolId()),
                topic.getAuthorId(),
                authorNicknameMap.get(topic.getAuthorId()),
                topic.getTitle(),
                AdminCampusTopicSummaryView.previewOf(topic.getContent()),
                topic.getCategory(),
                topic.getReplyCount(),
                topic.getViewCount(),
                topic.getIsAnonymous(),
                topic.getStatus() != null ? topic.getStatus().name() : null,
                topic.getAuditStatus() != null ? topic.getAuditStatus().name() : null,
                topic.getCreatedAt(),
                topic.getAuditedAt()
        );
    }

    /**
     * 解析话题状态参数（非法值直接 400）。
     */
    private TopicStatus parseTopicStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return TopicStatus.valueOf(value.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("非法话题状态参数: " + value);
        }
    }

    /**
     * 字符串归一化：trim 后空字符串视为 null。
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
 * 管理后台 - 校园圈话题列表项视图。
 *
 * @param id             话题 ID
 * @param schoolId       所属学校 ID
 * @param schoolName     所属学校名（批量预加载填充）
 * @param authorId       作者用户 ID
 * @param authorNickname 作者昵称（批量预加载填充）
 * @param title          话题标题
 * @param contentPreview 话题内容预览（前 80 字符）
 * @param category       话题分类：course/club/activity/study/life/alumni
 * @param replyCount     回复数
 * @param viewCount      浏览数
 * @param isAnonymous    是否匿名发帖
 * @param status         话题状态：active/deleted/hidden
 * @param auditStatus    审核状态：pending/approved/rejected
 * @param createdAt      创建时间
 * @param auditedAt      审核时间（未审核则为 null）
 */
record AdminCampusTopicSummaryView(
        Long id,
        Long schoolId,
        String schoolName,
        Long authorId,
        String authorNickname,
        String title,
        String contentPreview,
        String category,
        Integer replyCount,
        Integer viewCount,
        Boolean isAnonymous,
        String status,
        String auditStatus,
        java.time.LocalDateTime createdAt,
        java.time.LocalDateTime auditedAt
) {
    /**
     * 截取话题内容前 80 个字符作为预览。
     *
     * @param content 原始内容
     * @return 长度 ≤ 80 的预览字符串
     */
    public static String previewOf(String content) {
        if (content == null) {
            return "";
        }
        return content.length() <= 80 ? content : content.substring(0, 80);
    }
}
