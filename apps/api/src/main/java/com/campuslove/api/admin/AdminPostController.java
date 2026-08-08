package com.campuslove.api.admin;

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
 * <p>数据隔离（商业模式：每个高校一个管理员，委托 {@link AdminDataScope}）：</p>
 * <ul>
 *   <li>列表：posts 表无 campus_name 列，按<b>作者所属校区</b>过滤
 *       （作者校区取自 user_campus_profile.campus_name，与 AdminUserController 语义一致）；
 *       校区管理员强制按其管辖校区过滤（忽略调用方 campusName 参数），
 *       全局管理员（SUPER_ADMIN 或 ADMIN 无校区）可用 campusName 参数筛选</li>
 *   <li>审核/删除：读取目标帖子后按作者校区调用
 *       {@link AdminDataScope#assertCampusAccess(String)} 校验越权，越权抛 403</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/posts")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminPostController {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    /** 管理端数据隔离（多管理员多校区） */
    private final AdminDataScope adminDataScope;

    public AdminPostController(
            PostRepository postRepository,
            UserRepository userRepository,
            CommentRepository commentRepository,
            AdminDataScope adminDataScope) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询帖子列表（支持审核状态/帖子状态/分类/作者/校区筛选）。
     *
     * @param auditStatus 审核状态：pending / approved / rejected，可选
     * @param status      帖子状态：active / deleted / hidden，可选
     * @param category    分类：all/interest/sincere/hometown/anonymous/latest/campus，可选
     * @param authorId    作者用户 ID，可选
     * @param campusName  校区筛选（按作者所属校区过滤），可选；
     *                    校区管理员强制按其管辖校区过滤，忽略本参数
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
        SecurityUtils.getCurrentUserId();

        AuditStatus auditStatusEnum = parseAuditStatus(auditStatus);
        PostStatus postStatusEnum = parsePostStatus(status);
        PostCategory categoryEnum = parseCategory(category);

        // 数据隔离：校区管理员强制按其管辖校区过滤，忽略调用方传入的 campusName，
        // 防止校区管理员越权查看其他校区帖子（与 AdminUserController.listUsers 一致）
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();
        String effectiveCampus = scopedCampus != null
                ? scopedCampus
                : normalize(campusName);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<Post> result = postRepository.searchForAdmin(
                auditStatusEnum, postStatusEnum, categoryEnum, authorId, effectiveCampus, pageable);

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
     * @return 操作结果；帖子不存在返回 404
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

        // 数据隔离：校区管理员仅能审核本校区作者的帖子，越权抛 403
        adminDataScope.assertCampusAccess(
                adminDataScope.resolveUserCampusName(post.getAuthorId()));

        AuditStatus newStatus = "approved".equals(req.decision())
                ? AuditStatus.approved
                : AuditStatus.rejected;
        post.setAuditStatus(newStatus);
        post.setAuditRemark(req.remark());
        post.setAuditorId(auditorId);
        post.setAuditedAt(LocalDateTime.now());
        post.setUpdatedAt(LocalDateTime.now());

        // 若审核拒绝，同步将帖子状态置为 hidden，使其在村口列表不可见
        // 通过则保持原 status 不变（避免覆盖管理员手动隐藏的场景）
        if (newStatus == AuditStatus.rejected && post.getStatus() == PostStatus.active) {
            post.setStatus(PostStatus.hidden);
        }

        postRepository.save(post);

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
     * @return 操作结果；帖子不存在返回 404
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
        // 数据隔离：校区管理员仅能删除本校区作者的帖子，越权抛 403
        adminDataScope.assertCampusAccess(
                adminDataScope.resolveUserCampusName(post.getAuthorId()));
        post.setStatus(PostStatus.deleted);
        post.setUpdatedAt(LocalDateTime.now());
        postRepository.save(post);

        Map<String, Object> body = new HashMap<>();
        body.put("id", post.getId());
        body.put("status", post.getStatus().name());
        body.put("success", true);
        return ResponseEntity.ok(body);
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
            throw new IllegalArgumentException("非法审核状态参数: " + value);
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
            throw new IllegalArgumentException("非法帖子状态参数: " + value);
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
            throw new IllegalArgumentException("非法帖子分类参数: " + value);
        }
    }
}
