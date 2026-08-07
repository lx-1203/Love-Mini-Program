package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.InterestCircleRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
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
 * 管理后台 - 论坛分页管理：兴趣圈控制器。
 * <p>提供兴趣圈分页列表、新增/编辑/删除、圈内话题分页、话题置顶/取消置顶、
 * 话题删除等接口，归属 /api/v1/admin/forum/circles 独立端点。</p>
 *
 * <p>数据隔离说明（商业模式：每个高校一个管理员）：</p>
 * <ul>
 *   <li>interest_circles 表无 campus_name 列（圈子为全局维度，不区分校区），
 *       因此本控制器<b>不做校区过滤</b>：全局管理员与校区管理员均可查看/管理全部圈子</li>
 *   <li>写操作按全局资源处理（目标 campusName 为 null，校区管理员按
 *       {@link AdminDataScope#assertCampusAccess(String)} 语义放行），
 *       调用断言以保持数据隔离入口统一、并为未来圈子增加校区维度预留</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/forum/circles")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminCircleController {

    private final InterestCircleRepository interestCircleRepository;
    private final CircleTopicRepository circleTopicRepository;
    private final UserRepository userRepository;
    private final AdminDataScope adminDataScope;

    public AdminCircleController(
            InterestCircleRepository interestCircleRepository,
            CircleTopicRepository circleTopicRepository,
            UserRepository userRepository,
            AdminDataScope adminDataScope) {
        this.interestCircleRepository = interestCircleRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.userRepository = userRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询兴趣圈列表（圈名/描述关键字筛选）。
     *
     * @param keyword  圈名/描述模糊关键字，可选
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页兴趣圈列表（按排序权重升序）
     */
    @GetMapping
    public AdminPageView<AdminCircleSummaryView> listCircles(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedKeyword = normalize(keyword);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<InterestCircle> result = interestCircleRepository.searchForAdmin(normalizedKeyword, pageable);

        List<AdminCircleSummaryView> items = result.getContent().stream()
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
     * 新增兴趣圈。
     *
     * @param req 新增请求体（name 必填；icon/description/sortOrder 可选）
     * @return 创建成功的兴趣圈摘要；圈名重复返回 400
     */
    @PostMapping
    @Transactional
    @Auditable(value = AuditOperation.CREATE_CIRCLE, targetType = "CIRCLE",
            description = "管理员新增兴趣圈")
    public ResponseEntity<AdminCircleSummaryView> createCircle(@Valid @RequestBody AdminCircleRequest req) {
        SecurityUtils.getCurrentUserId();

        // 显式参数校验（@Valid 作为第二道防线，统一中文错误文案）
        String name = normalize(req.name());
        if (name == null) {
            throw new IllegalArgumentException("圈名不能为空");
        }
        if (name.length() > 64) {
            throw new IllegalArgumentException("圈名长度不能超过 64 字");
        }

        // 圈名唯一性校验（防重复创建）
        if (interestCircleRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("该圈名已存在: " + name);
        }

        InterestCircle circle = new InterestCircle();
        circle.setName(name);
        String icon = normalize(req.icon());
        circle.setIcon(icon != null ? icon : "\uD83D\uDCCB");
        circle.setDescription(normalize(req.description()));
        circle.setSortOrder(req.sortOrder() != null ? req.sortOrder() : 0);
        // 创建路径必须使用 save 返回值（@Version 乐观锁 + ID 由 JPA 回填）
        InterestCircle saved = interestCircleRepository.save(circle);

        return ResponseEntity.ok(toSummaryView(saved));
    }

    /**
     * 编辑兴趣圈（部分更新：仅非 null 字段生效）。
     *
     * @param id  兴趣圈 ID
     * @param req 编辑请求体
     * @return 更新后的兴趣圈摘要；圈子不存在返回 404；圈名与他圈冲突返回 400
     */
    @PutMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.UPDATE_CIRCLE, targetType = "CIRCLE",
            description = "管理员编辑兴趣圈")
    public ResponseEntity<AdminCircleSummaryView> updateCircle(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminCircleRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<InterestCircle> circleOpt = interestCircleRepository.findById(id);
        if (circleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        InterestCircle circle = circleOpt.get();
        // 圈子为全局资源（无校区维度），按 null 校区断言放行（数据隔离入口统一）
        adminDataScope.assertCampusAccess(null);

        // 仅在字段非 null 时更新，允许部分更新语义
        if (req.name() != null && !req.name().isBlank()) {
            String newName = req.name().trim();
            if (newName.length() > 64) {
                throw new IllegalArgumentException("圈名长度不能超过 64 字");
            }
            // 圈名唯一性校验（排除自身）
            Optional<InterestCircle> nameExists = interestCircleRepository.findByName(newName);
            if (nameExists.isPresent() && !nameExists.get().getId().equals(id)) {
                throw new IllegalArgumentException("该圈名已存在: " + newName);
            }
            circle.setName(newName);
        }
        if (req.icon() != null && !req.icon().isBlank()) {
            circle.setIcon(req.icon().trim());
        }
        if (req.description() != null && !req.description().isBlank()) {
            circle.setDescription(req.description().trim());
        }
        if (req.sortOrder() != null) {
            circle.setSortOrder(req.sortOrder());
        }

        InterestCircle saved = interestCircleRepository.save(circle);
        return ResponseEntity.ok(toSummaryView(saved));
    }

    /**
     * 删除兴趣圈。
     * <p>若圈子下存在话题则返回 409 拒绝删除（保留数据，避免误删话题）；
     * 无话题时删除圈子，关联成员关系（circle_memberships）由数据库
     * ON DELETE CASCADE 自动清理。</p>
     *
     * @param id 兴趣圈 ID
     * @return 操作结果；圈子不存在返回 404；存在话题返回 409
     */
    @DeleteMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.DELETE_CIRCLE, targetType = "CIRCLE",
            description = "管理员删除兴趣圈")
    public ResponseEntity<Map<String, Object>> deleteCircle(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<InterestCircle> circleOpt = interestCircleRepository.findById(id);
        if (circleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 圈子为全局资源，按 null 校区断言放行（数据隔离入口统一）
        adminDataScope.assertCampusAccess(null);

        // 存在话题时拒绝删除，避免误删话题数据（409）
        long topicCount = circleTopicRepository.countByCircleId(id);
        if (topicCount > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "该圈子下存在 " + topicCount + " 条话题，请先处理话题后再删除圈子"));
        }

        interestCircleRepository.deleteById(id);

        Map<String, Object> body = new HashMap<>();
        body.put("id", id);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 分页查询指定兴趣圈的话题列表（作者/关键字筛选，置顶优先）。
     *
     * @param id       兴趣圈 ID
     * @param authorId 作者用户 ID 筛选，可选
     * @param keyword  标题/内容模糊关键字，可选
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页话题列表；圈子不存在返回 404
     */
    @GetMapping("/{id}/topics")
    public ResponseEntity<AdminPageView<AdminCircleTopicSummaryView>> listCircleTopics(
            @PathVariable("id") @Positive Long id,
            @RequestParam(name = "authorId", required = false) @Positive Long authorId,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        Optional<InterestCircle> circleOpt = interestCircleRepository.findById(id);
        if (circleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        InterestCircle circle = circleOpt.get();

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<CircleTopic> result = circleTopicRepository.searchForAdmin(
                id, authorId, normalize(keyword), pageable);

        // 批量预加载作者昵称，避免 N+1 查询
        Map<Long, String> authorNicknameMap = loadAuthorNicknames(result.getContent());

        List<AdminCircleTopicSummaryView> items = result.getContent().stream()
                .map(topic -> toTopicView(topic, circle, authorNicknameMap))
                .toList();

        AdminPageView<AdminCircleTopicSummaryView> view = new AdminPageView<>(
                items,
                result.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize)
        );
        return ResponseEntity.ok(view);
    }

    /**
     * 置顶兴趣圈话题。
     *
     * @param id 话题 ID
     * @return 操作结果；话题不存在返回 404
     */
    @PostMapping("/topics/{id}/pin")
    @Transactional
    @Auditable(value = AuditOperation.PIN_TOPIC, targetType = "CIRCLE_TOPIC",
            description = "管理员置顶兴趣圈话题")
    public ResponseEntity<Map<String, Object>> pinTopic(@PathVariable("id") @Positive Long id) {
        return setTopicPinned(id, true);
    }

    /**
     * 取消兴趣圈话题置顶。
     *
     * @param id 话题 ID
     * @return 操作结果；话题不存在返回 404
     */
    @PostMapping("/topics/{id}/unpin")
    @Transactional
    @Auditable(value = AuditOperation.UNPIN_TOPIC, targetType = "CIRCLE_TOPIC",
            description = "管理员取消兴趣圈话题置顶")
    public ResponseEntity<Map<String, Object>> unpinTopic(@PathVariable("id") @Positive Long id) {
        return setTopicPinned(id, false);
    }

    /**
     * 话题置顶/取消置顶通用逻辑。
     *
     * @param id     话题 ID
     * @param pinned true 置顶 / false 取消置顶
     * @return 操作结果；话题不存在返回 404
     */
    private ResponseEntity<Map<String, Object>> setTopicPinned(Long id, boolean pinned) {
        SecurityUtils.getCurrentUserId();

        Optional<CircleTopic> topicOpt = circleTopicRepository.findById(id);
        if (topicOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CircleTopic topic = topicOpt.get();
        // 话题属于圈子，圈子为全局资源（无校区维度），按 null 校区断言放行
        adminDataScope.assertCampusAccess(null);

        topic.setIsPinned(pinned);
        circleTopicRepository.save(topic);

        Map<String, Object> body = new HashMap<>();
        body.put("id", topic.getId());
        body.put("isPinned", topic.getIsPinned());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 删除兴趣圈话题（硬删除）。
     * <p>话题回复（circle_replies）外键带 ON DELETE CASCADE（V2026.05.23.0005），
     * 数据库自动级联清理，无孤儿数据；采用硬删是因为话题无软删字段，
     * 与 AdminCommentController 删除评论语义一致。</p>
     *
     * @param id 话题 ID
     * @return 操作结果；话题不存在返回 404
     */
    @DeleteMapping("/topics/{id}")
    @Transactional
    @Auditable(value = AuditOperation.DELETE_POST, targetType = "CIRCLE_TOPIC",
            description = "管理员删除兴趣圈话题")
    public ResponseEntity<Map<String, Object>> deleteTopic(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<CircleTopic> topicOpt = circleTopicRepository.findById(id);
        if (topicOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 话题属于圈子，圈子为全局资源（无校区维度），按 null 校区断言放行
        adminDataScope.assertCampusAccess(null);

        circleTopicRepository.deleteById(id);

        Map<String, Object> body = new HashMap<>();
        body.put("id", id);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 批量加载话题作者昵称映射，避免 N+1 查询。
     *
     * @param topics 当前页话题列表
     * @return userId -> nickname 映射
     */
    private Map<Long, String> loadAuthorNicknames(List<CircleTopic> topics) {
        List<Long> authorIds = topics.stream()
                .map(CircleTopic::getAuthorId)
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
     * Entity 转兴趣圈摘要视图。
     */
    private AdminCircleSummaryView toSummaryView(InterestCircle circle) {
        return new AdminCircleSummaryView(
                circle.getId(),
                circle.getName(),
                circle.getIcon(),
                circle.getDescription(),
                circle.getMemberCount(),
                circle.getSortOrder(),
                circle.getCreatedAt()
        );
    }

    /**
     * Entity 转话题摘要视图。
     */
    private AdminCircleTopicSummaryView toTopicView(
            CircleTopic topic, InterestCircle circle, Map<Long, String> authorNicknameMap) {
        return new AdminCircleTopicSummaryView(
                topic.getId(),
                circle.getId(),
                circle.getName(),
                topic.getAuthorId(),
                authorNicknameMap.get(topic.getAuthorId()),
                topic.getTitle(),
                AdminCircleTopicSummaryView.previewOf(topic.getContent()),
                topic.getReplyCount(),
                topic.getIsPinned(),
                topic.getCreatedAt()
        );
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
 * 管理后台 - 兴趣圈新增/编辑请求体。
 * <p>新增（POST）时 name 必填（Controller 显式校验）；编辑（PUT）时
 * 仅非 null 字段生效（部分更新），name 可缺省。</p>
 *
 * @param name        圈名（新增必填，1-64 字；编辑可选）
 * @param icon        emoji 图标（可选，≤16 字符；新增缺省 📋）
 * @param description 圈子描述（可选，≤256 字）
 * @param sortOrder   排序权重（可选，升序；新增缺省 0）
 */
record AdminCircleRequest(
        @Size(max = 64, message = "圈名长度不能超过 64 字")
        String name,
        @Size(max = 16, message = "图标长度不能超过 16 字符")
        String icon,
        @Size(max = 256, message = "圈子描述长度不能超过 256 字")
        String description,
        Integer sortOrder
) {
}

/**
 * 管理后台 - 兴趣圈列表项视图。
 *
 * @param id          兴趣圈 ID
 * @param name        圈名
 * @param icon        emoji 图标
 * @param description 圈子描述
 * @param memberCount 成员数
 * @param sortOrder   排序权重
 * @param createdAt   创建时间
 */
record AdminCircleSummaryView(
        Long id,
        String name,
        String icon,
        String description,
        Integer memberCount,
        Integer sortOrder,
        java.time.LocalDateTime createdAt
) {
}

/**
 * 管理后台 - 兴趣圈话题列表项视图。
 *
 * @param id             话题 ID
 * @param circleId       所属圈子 ID
 * @param circleName     所属圈子名
 * @param authorId       作者用户 ID
 * @param authorNickname 作者昵称（批量预加载填充）
 * @param title          话题标题
 * @param contentPreview 话题内容预览（前 80 字符）
 * @param replyCount     回复数
 * @param isPinned       是否置顶
 * @param createdAt      创建时间
 */
record AdminCircleTopicSummaryView(
        Long id,
        Long circleId,
        String circleName,
        Long authorId,
        String authorNickname,
        String title,
        String contentPreview,
        Integer replyCount,
        Boolean isPinned,
        java.time.LocalDateTime createdAt
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
