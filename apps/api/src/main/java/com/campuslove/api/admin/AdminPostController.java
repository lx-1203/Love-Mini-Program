package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.AuditStatus;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
 * 管理后台 - 帖子管理控制器。
 * <p>提供帖子分页列表、审核（通过/拒绝）、删除等接口。</p>
 *
 * <p>数据隔离（两轴并存，圈层轴优先；与 {@link AdminVillagePostController} 同一口径）：</p>
 * <ul>
 *   <li><b>已在 admin_layer 绑定圈层的账号（2026-10-14 裁定：以圈层为准）</b>：
 *       列表按 {@code posts.owner_circle_path} 落在其绑定节点<b>子树</b>内过滤
 *       （{@link PostRepository#searchForAdminScoped}），审核/删除按同一条轴
 *       （{@link AdminScopeService#assertInScope(String)}，HTTP 403）拦截；
 *       不再叠加管理员自身校区，只有调用方显式传 {@code campusName} 时才主动收窄。
 *       <b>读写必须同时迁移</b>：只换写侧、列表仍是校区轴的话，管理员会审掉自己
 *       列表里看不见的行（上一轮迁移因此在 {@link AdminVillagePostController} 一并改掉读写两侧）</li>
 *   <li><b>未绑定圈层的账号</b>：沿用旧校区轴——posts 表无 campus_name 列，列表按
 *       <b>作者所属校区</b>过滤（作者校区取自 user_campus_profile.campus_name，
 *       与 AdminUserController 语义一致），校区管理员强制按其管辖校区过滤并忽略传入的
 *       campusName，读写通过 {@link AdminDataScope#assertCampusAccess(String)} 拦截；
 *       属增量迁移，可见性不因新增轴而放大。空校区的 ADMIN / AUDITOR 由
 *       {@link AdminDataScope#NO_CAMPUS_SCOPE} 内部哨兵收敛为空集/一律 403（fail-closed），
 *       该哨兵<b>永不</b>作为存储值写入业务字段</li>
 *   <li>全局管理员（SUPER_ADMIN）不做过滤，行为与改造前逐字节一致</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/posts")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
@Validated
public class AdminPostController {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    /** 管理端数据隔离（多管理员多校区，旧「校区」轴） */
    private final AdminDataScope adminDataScope;
    /** 圈层数据域（RBAC 第二授权轴：看「谁的」数据）；与校区轴并存，绑定后以圈层为准 */
    private final AdminScopeService adminScopeService;
    private final RealAdminStatsService adminStatsService;

    public AdminPostController(
            PostRepository postRepository,
            UserRepository userRepository,
            CommentRepository commentRepository,
            AdminDataScope adminDataScope,
            AdminScopeService adminScopeService,
            RealAdminStatsService adminStatsService) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.adminDataScope = adminDataScope;
        this.adminScopeService = adminScopeService;
        this.adminStatsService = adminStatsService;
    }

    /**
     * 分页查询帖子列表（支持审核状态/帖子状态/分类/作者/校区筛选）。
     *
     * @param auditStatus 审核状态：pending / approved / rejected，可选
     * @param status      帖子状态：active / deleted / hidden，可选；
     *                    <b>不传时默认屏排除 deleted</b>（软删行不进 items 也不进 total，
     *                    要看回收站请显式传 status=deleted）
     * @param category    分类：all/interest/sincere/hometown/anonymous/latest/campus，可选
     * @param authorId    作者用户 ID，可选
     * @param campusName  校区筛选（按作者所属校区过滤），可选；
     *                    已绑圈层的账号：仅作<b>调用方主动收窄</b>用（圈层轴优先，不再叠加
     *                    管理员自身校区）；未绑圈层的校区管理员：强制按其管辖校区过滤，忽略本参数
     * @param page        页码，1-based，默认 1
     * @param pageSize    每页大小，默认 20，最大 100
     * @return 分页帖子列表
     */
    @GetMapping
    public AdminPageView<AdminPostSummaryView> listPosts(
            @RequestParam(name = "auditStatus", required = false) String auditStatus,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "authorId", required = false) @Positive Long authorId,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        Long adminId = SecurityUtils.getCurrentUserId();

        AuditStatus auditStatusEnum = parseAuditStatus(auditStatus);
        PostStatus postStatusEnum = parsePostStatus(status);
        PostCategory categoryEnum = parseCategory(category);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        // 2026-10-20 R7 口径修正：后台删除是软删（status 置 deleted），调用方没指定 status 筛选时
        // 默认屏不得把已删行算进 total、也不得列进 items（否则运营看见虚高数，且与客户端 total 不同尺）；
        // 显式 status=deleted（后台「已删除」筛选项）时不排除，误删仍找得回
        PostStatus excludeStatus = postStatusEnum == null ? PostStatus.deleted : null;

        java.util.List<String> prefixes = adminScopeService.currentPrefixes();
        Page<Post> result;
        if (!adminDataScope.isCurrentSuperAdmin() && !prefixes.isEmpty()) {
            // 2026-10-14 裁定：绑定圈层后以圈层为准——列表即「绑定的圈层子树」，
            // 与 auditPost/deletePost 的 assertPostAccess 同一口径（看得见才审得着）。
            // 只保留调用方显式传入的 campusName 作为主动收窄；不叠加管理员自身校区。
            // 扩权是受控的：admin_layer 只有 SUPER_ADMIN 能写（见 AdminLayerController 类级鉴权）。
            result = postRepository.searchForAdminScoped(
                    auditStatusEnum, postStatusEnum, excludeStatus,
                    categoryEnum, authorId, normalize(campusName), adminId, pageable);
        } else {
            // SUPER_ADMIN 或「无圈层绑定的账号」：逐字节沿用旧查询，行为不变（增量迁移：
            // 未绑定圈层的在用校区管理员仍按旧校区作用域可见，不会被误挡在门外）。
            // 数据隔离：校区管理员强制按其管辖校区过滤，忽略调用方传入的 campusName，
            // 防止校区管理员越权查看其他校区帖子（与 AdminUserController.listUsers 一致）；
            // 空校区账号在此拿到内部哨兵 NO_CAMPUS_SCOPE，读查询据此收敛为空集（fail-closed）。
            String scopedCampus = adminDataScope.getCurrentAdminCampusName();
            String effectiveCampus = scopedCampus != null
                    ? scopedCampus
                    : normalize(campusName);
            result = postRepository.searchForAdmin(
                    auditStatusEnum, postStatusEnum, excludeStatus,
                    categoryEnum, authorId, effectiveCampus, pageable);
        }

        // 批量预加载作者昵称，避免 N+1 查询
        Map<Long, String> authorNicknameMap = loadAuthorNicknames(result.getContent());

        List<AdminPostSummaryView> items = result.getContent().stream()
                .map(post -> toSummaryView(post, authorNicknameMap))
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
     * 审核帖子（通过或拒绝）。
     *
     * @param id  帖子 ID
     * @param req 审核请求体
     * @return 操作结果；帖子不存在返回 404；越权返回 403（数据未改动）
     */
    @PostMapping("/{id}/audit")
    @Transactional
    public ResponseEntity<Map<String, Object>> auditPost(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminPostAuditRequest req) {
        Long auditorId = SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.get();

        // 数据域越权拦截：与列表端点同一口径（已绑圈层者按圈层子树，未绑者按校区），
        // 见 assertPostAccess；哨兵账号一律 403（fail-closed）
        assertPostAccess(post);

        // R4-00428：显式 switch 校验决策值——仅接受 approved / rejected，
        // 未来扩展决策值（如 pending）不会被静默当作拒绝
        AuditStatus newStatus = switch (req.decision()) {
            case "approved" -> AuditStatus.approved;
            case "rejected" -> AuditStatus.rejected;
            default -> throw new IllegalArgumentException("不支持的审核决策: " + req.decision());
        };
        post.setAuditStatus(newStatus);
        post.setAuditRemark(req.remark());
        post.setAuditorId(auditorId);
        post.setAuditedAt(LocalDateTime.now(TimeZones.BUSINESS));
        post.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        // 若审核拒绝，同步将帖子状态置为 hidden，使其在村口列表不可见
        // 通过则保持原 status 不变（避免覆盖管理员手动隐藏的场景）
        if (newStatus == AuditStatus.rejected && post.getStatus() == PostStatus.active) {
            post.setStatus(PostStatus.hidden);
        }

        postRepository.save(post);
        adminStatsService.invalidateStatsCache();

        Map<String, Object> body = new HashMap<>();
        body.put("id", post.getId());
        body.put("auditStatus", post.getAuditStatus().name());
        body.put("auditRemark", post.getAuditRemark());
        body.put("auditorId", post.getAuditorId());
        body.put("auditedAt", post.getAuditedAt());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 删除帖子（软删除）。
     * <p>将帖子 status 置为 deleted，保留数据用于审计。
     * infra R2-00270: 修正注释——当前实现不硬删除评论，评论通过帖子维度查询天然随帖子隐藏，
     * 原注释"同时清理该帖子下所有评论（硬删除）"与实现不符，已更正。</p>
     *
     * @param id 帖子 ID
     * @return 操作结果；帖子不存在返回 404；越权返回 403（数据未改动）
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deletePost(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.orElseThrow(() ->
                new IllegalStateException("postOpt 已确认非空但 orElseThrow 触发，数据不一致"));
        // 数据域越权拦截：与列表端点同一口径（已绑圈层者按圈层子树，未绑者按校区）
        assertPostAccess(post);
        post.setStatus(PostStatus.deleted);
        post.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        postRepository.save(post);
        adminStatsService.invalidateStatsCache();

        Map<String, Object> body = new HashMap<>();
        body.put("id", post.getId());
        body.put("status", post.getStatus().name());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 校验当前管理员对目标帖子的访问权（审核/删除两条写路径的越权拦截）。
     *
     * <p>与 {@link #listPosts} 必须同一条轴、同一个口径，否则会出现「列表按圈层子树放开、
     * 写操作仍按校区拦截」（看得到却点不动），或反过来「写按圈层放开、列表看不见」
     * （审掉自己列表里没有的行）——两种错配都比单一口径更危险。
     * 本方法逐字对齐 {@code AdminVillagePostController#assertPostAccess}（2026-10-14 裁定）。</p>
     *
     * <p>分支：</p>
     * <ul>
     *   <li>非 SUPER_ADMIN 且在 {@code admin_layer} 绑定了圈层 → 按帖子的
     *       {@code owner_circle_path} 走圈层轴；不在子树内抛 403。
     *       {@code owner_circle_path} 为 NULL（未归属）时只有持有 {@code C1} 的
     *       全平台作用域可见，局部作用域一律 403（fail-closed，见
     *       {@link AdminScopeService#inScope(String)}）</li>
     *   <li>其余（SUPER_ADMIN、未绑定圈层的账号）→ 旧校区轴：帖子无 campus_name 列，
     *       按作者校区判定（{@link AdminDataScope#resolveUserCampusName(Long)}）。
     *       空校区的 ADMIN / AUDITOR 在此拿到 {@link AdminDataScope#NO_CAMPUS_SCOPE}
     *       内部哨兵，{@code assertCampusAccess} 一律拒绝（403），
     *       哨兵字符串绝不作为存储值进入任何业务字段</li>
     * </ul>
     *
     * @param post 目标帖子
     * @throws com.campuslove.api.common.OperationForbiddenException 越权时（HTTP 403）
     */
    private void assertPostAccess(Post post) {
        java.util.List<String> prefixes = adminScopeService.currentPrefixes();
        if (!adminDataScope.isCurrentSuperAdmin() && !prefixes.isEmpty()) {
            adminScopeService.assertInScope(post.getOwnerCirclePath());
            return;
        }
        adminDataScope.assertCampusAccess(
                adminDataScope.resolveUserCampusName(post.getAuthorId()));
    }

    /**
     * 批量加载作者昵称映射，避免 N+1 查询。
     *
     * @param posts 当前页帖子列表
     * @return userId -> nickname 映射
     */
    private Map<Long, String> loadAuthorNicknames(List<Post> posts) {
        List<Long> authorIds = posts.stream()
                .map(Post::getAuthorId)
                .distinct()
                .toList();
        if (authorIds.isEmpty()) {
            return Map.of();
        }
        List<User> authors = userRepository.findAllById(authorIds);
        Map<Long, String> result = new HashMap<>();
        for (User u : authors) {
            result.put(u.getId(), u.getNickname());
        }
        return result;
    }

    /**
     * Entity 转 SummaryView。
     */
    private AdminPostSummaryView toSummaryView(Post post, Map<Long, String> authorNicknameMap) {
        return new AdminPostSummaryView(
                post.getId(),
                post.getAuthorId(),
                authorNicknameMap.get(post.getAuthorId()),
                AdminPostSummaryView.previewOf(post.getContent()),
                post.getCategory() != null ? post.getCategory().name() : null,
                post.getStatus() != null ? post.getStatus().name() : null,
                post.getAuditStatus() != null ? post.getAuditStatus().name() : null,
                post.getVisibility() != null ? post.getVisibility().name() : null,
                post.getCircleId(),
                post.getLikesCount(),
                post.getCommentsCount(),
                post.getShareCount(),
                post.getViewCount(),
                post.getCreatedAt(),
                post.getAuditedAt()
        );
    }

    /**
     * 空串转 null 归一化。
     *
     * @param value 原始值
     * @return 去首尾空白后的值；null 或空白返回 null
     */
    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * 解析审核状态参数。
     */
    private AuditStatus parseAuditStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return AuditStatus.valueOf(value.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            // infra R2-00269: 非法筛选参数直接 400，不再静默转 null 导致查询条件失效
            throw new IllegalArgumentException(ErrorMessages.ILLEGAL_AUDIT_STATUS_PREFIX + value);
        }
    }

    /**
     * 解析帖子状态参数。
     */
    private PostStatus parsePostStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return PostStatus.valueOf(value.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            // infra R2-00269: 非法筛选参数直接 400
            throw new IllegalArgumentException(ErrorMessages.ILLEGAL_POST_STATUS_PREFIX + value);
        }
    }

    /**
     * 解析分类参数。
     */
    private PostCategory parseCategory(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return PostCategory.valueOf(value.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            // infra R2-00269: 非法筛选参数直接 400
            throw new IllegalArgumentException(ErrorMessages.ILLEGAL_POST_CATEGORY_PREFIX + value);
        }
    }
}
