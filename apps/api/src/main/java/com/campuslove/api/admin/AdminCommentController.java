package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 评论管理控制器。
 * <p>提供评论分页列表与删除接口。</p>
 *
 * <p>数据隔离（商业模式：每个高校一个管理员，委托 {@link AdminDataScope}）：</p>
 * <ul>
 *   <li>列表：comments 表无 campus_name 列，按<b>评论作者所属校区</b>过滤
 *       （作者校区取自 user_campus_profile.campus_name，与 AdminUserController 语义一致）；
 *       校区管理员强制按其管辖校区过滤（忽略调用方 campusName 参数），
 *       全局管理员（SUPER_ADMIN 或 ADMIN 无校区）可用 campusName 参数筛选</li>
 *   <li>删除：读取目标评论后按作者校区调用
 *       {@link AdminDataScope#assertCampusAccess(String)} 校验越权，越权抛 403</li>
 * </ul>
 *
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/comments")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminCommentController {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    /** 管理端数据隔离（多管理员多校区） */
    private final AdminDataScope adminDataScope;

    public AdminCommentController(
            CommentRepository commentRepository,
            UserRepository userRepository,
            AdminDataScope adminDataScope) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询评论列表。
     *
     * @param authorId   作者用户 ID 筛选，可选
     * @param postId     关联帖子 ID 筛选，可选（不限定帖子时传 null）
     * @param campusName 校区筛选（按评论作者所属校区过滤），可选；
     *                   校区管理员强制按其管辖校区过滤，忽略本参数
     * @param page       页码，1-based，默认 1
     * @param pageSize   每页大小，默认 20，最大 100
     * @return 分页评论列表
     */
    @GetMapping
    public AdminPageView<AdminCommentSummaryView> listComments(
            @RequestParam(name = "authorId", required = false) @Positive Long authorId,
            @RequestParam(name = "postId", required = false) @Positive Long postId,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        // 数据隔离：校区管理员强制按其管辖校区过滤，忽略调用方传入的 campusName，
        // 防止校区管理员越权查看其他校区评论（与 AdminUserController.listUsers 一致）
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();
        String effectiveCampus = scopedCampus != null
                ? scopedCampus
                : normalize(campusName);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<Comment> result = commentRepository.searchForAdmin(
                authorId, postId, effectiveCampus, pageable);

        // 批量预加载作者昵称，避免 N+1 查询
        Map<Long, String> authorNicknameMap = loadAuthorNicknames(result.getContent());

        List<AdminCommentSummaryView> items = result.getContent().stream()
                .map(comment -> toSummaryView(comment, authorNicknameMap))
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
     * 删除评论（硬删除）。
     * <p>评论当前没有软删字段，采用硬删除与现有村口评论删除逻辑保持一致。
     * 删除后不可恢复，前端需二次确认。</p>
     *
     * @param id 评论 ID
     * @return 操作结果；评论不存在返回 404
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteComment(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Comment> commentOpt = commentRepository.findById(id);
        if (commentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Comment comment = commentOpt.get();
        // 数据隔离：校区管理员仅能删除本校区作者的评论，越权抛 403
        adminDataScope.assertCampusAccess(
                adminDataScope.resolveUserCampusName(comment.getAuthorId()));

        commentRepository.deleteById(id);

        Map<String, Object> body = new HashMap<>();
        body.put("id", id);
        body.put("success", true);
        return ResponseEntity.ok(body);
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
     * 批量加载作者昵称映射，避免 N+1 查询。
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
    private AdminCommentSummaryView toSummaryView(Comment comment, Map<Long, String> authorNicknameMap) {
        Long postId = comment.getPost() != null ? comment.getPost().getId() : null;
        return new AdminCommentSummaryView(
                comment.getId(),
                postId,
                comment.getAuthorId(),
                authorNicknameMap.get(comment.getAuthorId()),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}
