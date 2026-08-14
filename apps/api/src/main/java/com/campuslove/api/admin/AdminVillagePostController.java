package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.AuditStatus;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.PostViewHistory;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostFavoriteRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostViewHistoryRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
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
 * 管理后台 - 论坛分页管理：村落动态控制器。
 * <p>与 {@link AdminPostController}（村落动态合一管理）并存，本控制器承担
 * 村落动态的精细化独立管理：审核、置顶/取消置顶、加精、删除、查看评论等，
 * 归属 /api/v1/admin/forum/village-posts 独立端点。</p>
 *
 * <p>数据隔离说明（商业模式：每个高校一个管理员）：</p>
 * <ul>
 *   <li>posts 表无 campus_name 列，列表查询的校区隔离按<b>作者所属校区</b>过滤：
 *       作者校区取自 user_campus_profile.campus_name（普通用户校区，
 *       与 AdminUserController.searchForAdmin 语义一致）</li>
 *   <li>校区管理员（ADMIN + campusName 非空）强制按管辖校区过滤列表，
 *       忽略调用方传入的 campusName 参数；写操作与读操作（详情/评论/
 *       浏览记录）通过 {@link AdminDataScope#assertCampusAccess(String)}
 *       越权拦截（HTTP 403）</li>
 *   <li>全局管理员（SUPER_ADMIN 或 ADMIN 无校区）不做过滤</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/forum/village-posts")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminVillagePostController {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final AdminDataScope adminDataScope;
    /**
     * 2026-08-08 论坛互动真实化：帖子收藏 Repository（后台展示收藏数）。
     */
    private final PostFavoriteRepository postFavoriteRepository;
    /**
     * 2026-08-08 论坛互动真实化：帖子浏览历史 Repository（后台浏览记录查询）。
     */
    private final PostViewHistoryRepository postViewHistoryRepository;
    /**
     * 2026-08-11 热度榜：热度分重算器（运营操纵 hot_boost/hot_banned 后立即生效）。
     */
    private final com.campuslove.api.village.HotScoreScheduler hotScoreScheduler;

    public AdminVillagePostController(
            PostRepository postRepository,
            UserRepository userRepository,
            CommentRepository commentRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            AdminDataScope adminDataScope,
            PostFavoriteRepository postFavoriteRepository,
            PostViewHistoryRepository postViewHistoryRepository,
            com.campuslove.api.village.HotScoreScheduler hotScoreScheduler) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.adminDataScope = adminDataScope;
        this.postFavoriteRepository = postFavoriteRepository;
        this.postViewHistoryRepository = postViewHistoryRepository;
        this.hotScoreScheduler = hotScoreScheduler;
    }

    /**
     * 分页查询村落动态列表（审核状态/帖子状态/关键字/校区筛选）。
     *
     * @param auditStatus 审核状态：pending / approved / rejected，可选
     * @param status      帖子状态：active / deleted / hidden，可选
     * @param keyword     内容模糊关键字（村落动态帖子无标题字段，仅匹配内容），可选
     * @param campusName  校区筛选（按作者所属校区过滤），可选；
     *                    校区管理员强制按其管辖校区过滤，忽略本参数
     * @param page        页码，1-based，默认 1
     * @param pageSize    每页大小，默认 20，最大 100
     * @return 分页村落动态列表（置顶优先，按创建时间倒序）
     */
    @GetMapping
    public AdminPageView<AdminVillagePostSummaryView> listPosts(
            @RequestParam(name = "auditStatus", required = false) String auditStatus,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        AuditStatus auditStatusEnum = parseAuditStatus(auditStatus);
        PostStatus postStatusEnum = parsePostStatus(status);
        String normalizedKeyword = normalize(keyword);

        // 数据隔离：校区管理员强制按其管辖校区过滤，忽略调用方传入的 campusName，
        // 防止校区管理员越权查看其他校区数据（与 AdminUserController.listUsers 一致）
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();
        if (effectiveCampus == null) {
            effectiveCampus = normalize(campusName);
        }

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<Post> result = postRepository.searchForVillageAdmin(
                auditStatusEnum, postStatusEnum, normalizedKeyword, effectiveCampus, pageable);

        // 批量预加载作者信息（昵称/头像），避免 N+1 查询
        Map<Long, User> authorMap = loadAuthorMap(
                result.getContent().stream().map(Post::getAuthorId).toList());

        // 2026-08-08 论坛互动真实化：批量预加载收藏数（postId -> count），防 N+1
        List<Long> postIds = result.getContent().stream().map(Post::getId).toList();
        Map<Long, Integer> favoriteCountMap = postIds.isEmpty() ? Map.of()
                : postFavoriteRepository.countByPostIds(postIds).stream()
                        .collect(java.util.stream.Collectors.toMap(
                                r -> (Long) r[0], r -> ((Number) r[1]).intValue()));

        List<AdminVillagePostSummaryView> items = result.getContent().stream()
                .map(post -> toSummaryView(post, authorMap, favoriteCountMap))
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
     * 查询村落动态详情（含作者昵称头像与审核元信息）。
     *
     * @param id 帖子 ID
     * @return 帖子详情；帖子不存在返回 404
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminVillagePostDetailView> getPostDetail(
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.get();
        // 数据隔离：校区管理员仅能查看本校区作者帖子的详情（读操作越权拦截）
        assertPostCampusAccess(post);
        Map<Long, User> authorMap = loadAuthorMap(List.of(post.getAuthorId()));
        return ResponseEntity.ok(toDetailView(post, authorMap.get(post.getAuthorId())));
    }

    /**
     * 审核村落动态（通过或拒绝）。
     * <p>与 {@link AdminPostController#auditPost} 逻辑一致：拒绝时同步将
     * status 置为 hidden，使其在村口列表不可见；通过时保持原 status 不变。</p>
     *
     * @param id  帖子 ID
     * @param req 审核请求体（decision: approved/rejected）
     * @return 操作结果；帖子不存在返回 404；校区越权返回 403
     */
    @PostMapping("/{id}/audit")
    @Transactional
    @Auditable(value = AuditOperation.AUDIT_POST, targetType = "POST",
            description = "管理员审核村落动态")
    public ResponseEntity<Map<String, Object>> auditPost(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminPostAuditRequest req) {
        Long auditorId = SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.get();
        // 数据隔离：校区管理员仅能审核本校区作者的帖子
        assertPostCampusAccess(post);

        AuditStatus newStatus = "approved".equals(req.decision())
                ? AuditStatus.approved
                : AuditStatus.rejected;
        post.setAuditStatus(newStatus);
        post.setAuditRemark(req.remark());
        post.setAuditorId(auditorId);
        post.setAuditedAt(LocalDateTime.now(TimeZones.BUSINESS));
        post.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        // 审核拒绝时同步隐藏，使其在村口列表不可见（与 AdminPostController 一致）
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
     * 置顶村落动态。
     *
     * @param id 帖子 ID
     * @return 操作结果；帖子不存在返回 404
     */
    @PostMapping("/{id}/pin")
    @Transactional
    @Auditable(value = AuditOperation.PIN_POST, targetType = "POST",
            description = "管理员置顶村落动态")
    public ResponseEntity<Map<String, Object>> pinPost(@PathVariable("id") @Positive Long id) {
        return setPostPinned(id, true);
    }

    /**
     * 取消村落动态置顶。
     *
     * @param id 帖子 ID
     * @return 操作结果；帖子不存在返回 404
     */
    @PostMapping("/{id}/unpin")
    @Transactional
    @Auditable(value = AuditOperation.UNPIN_POST, targetType = "POST",
            description = "管理员取消村落动态置顶")
    public ResponseEntity<Map<String, Object>> unpinPost(@PathVariable("id") @Positive Long id) {
        return setPostPinned(id, false);
    }

    /**
     * 置顶/取消置顶通用逻辑。
     *
     * @param id     帖子 ID
     * @param pinned true 置顶 / false 取消置顶
     * @return 操作结果；帖子不存在返回 404
     */
    private ResponseEntity<Map<String, Object>> setPostPinned(Long id, boolean pinned) {
        SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.orElseThrow(() ->
                new IllegalStateException("postOpt 已确认非空但 orElseThrow 触发，数据不一致"));
        // 数据隔离：校区管理员仅能操作本校区作者的帖子
        assertPostCampusAccess(post);

        post.setIsPinned(pinned);
        post.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        postRepository.save(post);

        Map<String, Object> body = new HashMap<>();
        body.put("id", post.getId());
        body.put("isPinned", post.getIsPinned());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 删除村落动态（软删除）。
     * <p>将帖子 status 置为 deleted，保留数据用于审计；评论通过帖子维度
     * 查询天然随帖子隐藏，不硬删（与 AdminPostController 语义一致）。</p>
     *
     * @param id 帖子 ID
     * @return 操作结果；帖子不存在返回 404
     */
    @DeleteMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.DELETE_POST, targetType = "POST",
            description = "管理员删除村落动态（软删）")
    public ResponseEntity<Map<String, Object>> deletePost(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.orElseThrow(() ->
                new IllegalStateException("postOpt 已确认非空但 orElseThrow 触发，数据不一致"));
        // 数据隔离：校区管理员仅能删除本校区作者的帖子
        assertPostCampusAccess(post);

        post.setStatus(PostStatus.deleted);
        post.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        postRepository.save(post);

        Map<String, Object> body = new HashMap<>();
        body.put("id", post.getId());
        body.put("status", post.getStatus().name());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    // ---- 2026-08-11 热度榜运营操纵（人为控制「哪个帖子上去、哪个不上」） ----

    /**
     * 设置帖子热度倍率（hot_boost：>1 上榜加成，0 压榜，支持小数微调）。
     *
     * <p>设置后立即重算该帖热度分并清空榜单缓存，运营改完马上生效。</p>
     */
    @PostMapping("/{id}/hot-boost")
    @Transactional
    @Auditable(value = AuditOperation.PIN_POST, targetType = "POST",
            description = "管理员设置帖子热度倍率")
    public ResponseEntity<Map<String, Object>> setHotBoost(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminHotBoostRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.get();
        assertPostCampusAccess(post);

        double boost = req.boost();
        if (boost < 0 || boost > 100) {
            throw new IllegalArgumentException("boost 需在 0-100 之间（0=压榜，>1=上榜加成）");
        }
        post.setHotBoost(boost);
        post.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        postRepository.save(post);

        double newScore = hotScoreScheduler.recalcPostScore(post.getId());

        Map<String, Object> body = new HashMap<>();
        body.put("id", post.getId());
        body.put("hotBoost", post.getHotBoost());
        body.put("hotScore", newScore);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 设置帖子禁止上榜（hot_banned：1=不上榜/不进推荐流，不影响前台可见性）。
     */
    @PostMapping("/{id}/hot-ban")
    @Transactional
    @Auditable(value = AuditOperation.PIN_POST, targetType = "POST",
            description = "管理员设置帖子禁止上榜")
    public ResponseEntity<Map<String, Object>> setHotBan(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminHotBanRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.get();
        assertPostCampusAccess(post);

        post.setHotBanned(req.banned());
        post.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        postRepository.save(post);

        double newScore = hotScoreScheduler.recalcPostScore(post.getId());

        Map<String, Object> body = new HashMap<>();
        body.put("id", post.getId());
        body.put("hotBanned", post.getHotBanned());
        body.put("hotScore", newScore);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 单帖立即重算热度分（运营调整互动数据/权重后想马上生效）。
     */
    @PostMapping("/{id}/hot-recalc")
    @Transactional
    @Auditable(value = AuditOperation.PIN_POST, targetType = "POST",
            description = "管理员手动重算帖子热度分")
    public ResponseEntity<Map<String, Object>> recalcHotScore(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Post post = postOpt.get();
        assertPostCampusAccess(post);

        double newScore = hotScoreScheduler.recalcPostScore(post.getId());

        Map<String, Object> body = new HashMap<>();
        body.put("id", post.getId());
        body.put("hotScore", newScore);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 分页查询指定帖子的评论列表（含评论者昵称）。
     * <p>参照 AdminCommentController 模式：帖子不存在时返回空页，
     * 不额外做 404 拦截（评论按 postId 查询天然无数据）。</p>
     *
     * @param id       帖子 ID
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页评论列表
     */
    @GetMapping("/{id}/comments")
    public AdminPageView<AdminCommentSummaryView> listComments(
            @PathVariable("id") @Positive Long id,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        // 数据隔离：校区管理员仅能查看本校区作者帖子的评论（读操作越权拦截）；
        // 帖子不存在时保持原语义返回空页，不额外做 404 拦截
        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isPresent()) {
            assertPostCampusAccess(postOpt.get());
        }

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<Comment> result = commentRepository.findWithPostByPostIdOrderByCreatedAtDesc(id, pageable);

        // 批量预加载评论作者昵称，避免 N+1 查询
        Map<Long, String> authorNicknameMap = loadAuthorNicknames(result.getContent());

        List<AdminCommentSummaryView> items = result.getContent().stream()
                .map(comment -> toCommentView(comment, authorNicknameMap))
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
     * 分页查询帖子的浏览记录（2026-08-08 论坛互动真实化，后台可见）。
     *
     * <p>返回浏览者昵称/头像/最近浏览时间，按 viewed_at 倒序；
     * 帖子不存在返回 404。</p>
     *
     * @param id       帖子 ID
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页浏览者列表
     */
    @GetMapping("/{id}/views")
    public AdminPageView<AdminPostViewerView> listPostViewers(
            @PathVariable("id") @Positive Long id,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new com.campuslove.api.common.ResourceNotFoundException("Post not found: " + id));
        // 数据隔离：校区管理员仅能查看本校区作者帖子的浏览记录（读操作越权拦截）
        assertPostCampusAccess(post);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<PostViewHistory> result = postViewHistoryRepository.findByPostIdOrderByViewedAtDesc(id, pageable);

        // 批量预加载浏览者昵称/头像，避免 N+1 查询
        List<Long> viewerIds = result.getContent().stream()
                .map(PostViewHistory::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> viewerMap = viewerIds.isEmpty() ? Map.of()
                : userRepository.findByIdIn(viewerIds).stream()
                        .collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        List<AdminPostViewerView> items = result.getContent().stream()
                .map(h -> {
                    User viewer = viewerMap.get(h.getUserId());
                    return new AdminPostViewerView(
                            h.getUserId(),
                            viewer != null ? viewer.getNickname() : null,
                            viewer != null ? viewer.getAvatarUrl() : null,
                            h.getViewedAt()
                    );
                })
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
     * 校验当前管理员对目标帖子的校区访问权（写操作越权拦截）。
     * <p>posts 表无 campus_name 列，帖子所属校区按作者校区判定：
     * 优先取 user_campus_profile.campus_name（普通用户校区），
     * 其次取 users.campus_name（管理员账号管辖校区，兼容旧数据）。</p>
     *
     * @param post 目标帖子
     * @throws com.campuslove.api.common.OperationForbiddenException 校区越权时
     */
    private void assertPostCampusAccess(Post post) {
        adminDataScope.assertCampusAccess(resolveAuthorCampus(post.getAuthorId()));
    }

    /**
     * 解析帖子作者的所属校区名。
     *
     * @param authorId 作者用户 ID
     * @return 作者校区名（未知归属返回 null，按 AdminDataScope 语义视为全局资源）
     */
    private String resolveAuthorCampus(Long authorId) {
        if (authorId == null) {
            return null;
        }
        // 普通用户校区：user_campus_profile.campus_name（与 AdminUserController 语义一致）
        Optional<UserCampusProfile> campusOpt = userCampusProfileRepository.findByUserId(authorId);
        if (campusOpt.isPresent() && isNotBlank(campusOpt.get().getCampusName())) {
            return campusOpt.get().getCampusName().trim();
        }
        // 兼容：管理员账号管辖校区（users.campus_name）
        Optional<User> userOpt = userRepository.findById(authorId);
        if (userOpt.isPresent() && isNotBlank(userOpt.get().getCampusName())) {
            return userOpt.get().getCampusName().trim();
        }
        return null;
    }

    /**
     * 批量加载作者信息映射（昵称/头像），避免 N+1 查询。
     *
     * @param authorIds 作者用户 ID 集合
     * @return userId -> User 映射
     */
    private Map<Long, User> loadAuthorMap(List<Long> authorIds) {
        List<Long> ids = authorIds.stream()
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
     * 批量加载评论作者昵称映射，避免 N+1 查询。
     *
     * @param comments 当前页评论列表
     * @return userId -> nickname 映射
     */
    private Map<Long, String> loadAuthorNicknames(List<Comment> comments) {
        List<Long> authorIds = comments.stream()
                .map(Comment::getAuthorId)
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
     * Entity 转评论视图。
     */
    private AdminCommentSummaryView toCommentView(Comment comment, Map<Long, String> authorNicknameMap) {
        return new AdminCommentSummaryView(
                comment.getId(),
                comment.getPost() != null ? comment.getPost().getId() : null,
                comment.getAuthorId(),
                authorNicknameMap.get(comment.getAuthorId()),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }

    /**
     * Entity 转列表 SummaryView。
     *
     * @param favoriteCountMap 收藏数批量预加载 Map（postId -> count）
     */
    private AdminVillagePostSummaryView toSummaryView(Post post, Map<Long, User> authorMap,
                                                      Map<Long, Integer> favoriteCountMap) {
        User author = authorMap.get(post.getAuthorId());
        return new AdminVillagePostSummaryView(
                post.getId(),
                post.getAuthorId(),
                author != null ? author.getNickname() : null,
                author != null ? author.getAvatarUrl() : null,
                AdminVillagePostSummaryView.previewOf(post.getContent()),
                post.getCategory() != null ? post.getCategory().name() : null,
                post.getStatus() != null ? post.getStatus().name() : null,
                post.getAuditStatus() != null ? post.getAuditStatus().name() : null,
                post.getIsPinned(),
                post.getLikesCount(),
                post.getCommentsCount(),
                post.getShareCount(),
                post.getViewCount(),
                favoriteCountMap.getOrDefault(post.getId(), 0),
                post.getHotScore(),
                post.getHotBoost(),
                post.getHotBanned(),
                post.getCreatedAt(),
                post.getAuditedAt()
        );
    }

    /**
     * Entity 转详情 View（含作者昵称头像与审核元信息）。
     */
    private AdminVillagePostDetailView toDetailView(Post post, User author) {
        return new AdminVillagePostDetailView(
                post.getId(),
                post.getAuthorId(),
                author != null ? author.getNickname() : null,
                author != null ? author.getAvatarUrl() : null,
                post.getContent(),
                post.getImages(),
                post.getTags(),
                post.getCategory() != null ? post.getCategory().name() : null,
                post.getStatus() != null ? post.getStatus().name() : null,
                post.getAuditStatus() != null ? post.getAuditStatus().name() : null,
                post.getAuditRemark(),
                post.getAuditorId(),
                post.getAuditedAt(),
                post.getIsPinned(),
                post.getLikesCount(),
                post.getCommentsCount(),
                post.getShareCount(),
                post.getViewCount(),
                (int) postFavoriteRepository.countByPostId(post.getId()),
                post.getHotScore(),
                post.getHotBoost(),
                post.getHotBanned(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    /**
     * 解析审核状态参数（非法值直接 400，不再静默转 null）。
     */
    private AuditStatus parseAuditStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return AuditStatus.valueOf(value.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(ErrorMessages.ILLEGAL_AUDIT_STATUS_PREFIX + value);
        }
    }

    /**
     * 解析帖子状态参数（非法值直接 400）。
     */
    private PostStatus parsePostStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return PostStatus.valueOf(value.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(ErrorMessages.ILLEGAL_POST_STATUS_PREFIX + value);
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

    /**
     * 判断字符串是否非空（非 null 且 trim 后非空）。
     */
    private boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }
}

/**
 * 管理后台 - 村落动态列表项视图。
 *
 * @param id             帖子 ID
 * @param authorId       作者用户 ID
 * @param authorNickname 作者昵称（批量预加载填充，无作者时为 null）
 * @param authorAvatar   作者头像 URL（批量预加载填充）
 * @param contentPreview 帖子内容预览（前 80 字符）
 * @param category       分类：all/interest/sincere/hometown/anonymous/latest/campus
 * @param status         帖子状态：active/deleted/hidden
 * @param auditStatus    审核状态：pending/approved/rejected
 * @param isPinned       是否置顶
 * @param likesCount     点赞数
 * @param commentsCount  评论数
 * @param shareCount     转发数
 * @param viewCount      浏览量（2026-08-08 论坛互动真实化新增）
 * @param favoriteCount  收藏数（2026-08-08 论坛互动真实化新增）
 * @param hotScore       热度分（2026-08-11 热度榜）
 * @param hotBoost       运营热度倍率（2026-08-11，>1 上榜加成，0 压榜）
 * @param hotBanned      是否禁止上榜（2026-08-11）
 * @param createdAt      创建时间
 * @param auditedAt      审核时间（未审核则为 null）
 */
record AdminVillagePostSummaryView(
        Long id,
        Long authorId,
        String authorNickname,
        String authorAvatar,
        String contentPreview,
        String category,
        String status,
        String auditStatus,
        Boolean isPinned,
        Integer likesCount,
        Integer commentsCount,
        Integer shareCount,
        Integer viewCount,
        Integer favoriteCount,
        Double hotScore,
        Double hotBoost,
        Boolean hotBanned,
        LocalDateTime createdAt,
        LocalDateTime auditedAt
) {
    /**
     * 截取帖子内容前 80 个字符作为预览。
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

/**
 * 管理后台 - 村落动态详情视图。
 *
 * @param id             帖子 ID
 * @param authorId       作者用户 ID
 * @param authorNickname 作者昵称
 * @param authorAvatar   作者头像 URL
 * @param content        帖子完整内容
 * @param images         图片 URL 数组（JSON 字符串）
 * @param tags           话题标签数组（JSON 字符串）
 * @param category       分类
 * @param status         帖子状态
 * @param auditStatus    审核状态
 * @param auditRemark    审核备注（拒绝原因等）
 * @param auditorId      审核人用户 ID
 * @param auditedAt      审核时间
 * @param isPinned       是否置顶
 * @param likesCount     点赞数
 * @param commentsCount  评论数
 * @param shareCount     转发数
 * @param viewCount      浏览量（2026-08-08 论坛互动真实化新增）
 * @param favoriteCount  收藏数（2026-08-08 论坛互动真实化新增）
 * @param hotScore       热度分（2026-08-11 热度榜）
 * @param hotBoost       运营热度倍率（2026-08-11）
 * @param hotBanned      是否禁止上榜（2026-08-11）
 * @param createdAt      创建时间
 * @param updatedAt      最近更新时间
 */
record AdminVillagePostDetailView(
        Long id,
        Long authorId,
        String authorNickname,
        String authorAvatar,
        String content,
        String images,
        String tags,
        String category,
        String status,
        String auditStatus,
        String auditRemark,
        Long auditorId,
        LocalDateTime auditedAt,
        Boolean isPinned,
        Integer likesCount,
        Integer commentsCount,
        Integer shareCount,
        Integer viewCount,
        Integer favoriteCount,
        Double hotScore,
        Double hotBoost,
        Boolean hotBanned,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

/**
 * 管理后台 - 帖子浏览者视图（2026-08-08 论坛互动真实化新增）。
 *
 * @param userId    浏览者用户 ID
 * @param nickname  浏览者昵称
 * @param avatarUrl 浏览者头像 URL
 * @param viewedAt  最近浏览时间
 */
record AdminPostViewerView(
        Long userId,
        String nickname,
        String avatarUrl,
        LocalDateTime viewedAt
) {
}

/**
 * 管理后台 - 热度倍率请求（2026-08-11）。
 *
 * @param boost 热度倍率（0-100：0=压榜，1=原始，>1=上榜加成，支持小数）
 */
record AdminHotBoostRequest(
        @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.DecimalMin("0")
        @jakarta.validation.constraints.DecimalMax("100") Double boost
) {
}

/**
 * 管理后台 - 禁止上榜请求（2026-08-11）。
 *
 * @param banned true 禁止上榜（不进入榜单/推荐流，不影响前台可见）
 */
record AdminHotBanRequest(
        @jakarta.validation.constraints.NotNull Boolean banned
) {
}
