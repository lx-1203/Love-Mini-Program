package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.UserRepository;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 评论管理控制器。
 * <p>提供评论分页列表与删除接口。</p>
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/admin/comments")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCommentController {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    public AdminCommentController(
            CommentRepository commentRepository,
            UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
    }

    /**
     * 分页查询评论列表。
     *
     * @param authorId 作者用户 ID 筛选，可选
     * @param postId   关联帖子 ID 筛选，可选（不限定帖子时传 null）
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页评论列表
     */
    @GetMapping
    public AdminPageView<AdminCommentSummaryView> listComments(
            @RequestParam(name = "authorId", required = false) Long authorId,
            @RequestParam(name = "postId", required = false) Long postId,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "pageSize", defaultValue = "20") int pageSize) {
        SecurityUtils.getCurrentUserId();

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        // 优先按作者筛选；否则按帖子筛选；否则全量
        Page<Comment> result;
        if (authorId != null) {
            result = commentRepository.findByAuthorIdOrderByCreatedAtDesc(authorId, pageable);
        } else if (postId != null) {
            result = commentRepository.findByPostIdOrderByCreatedAtDesc(postId, pageable);
        } else {
            result = commentRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

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
    public ResponseEntity<Map<String, Object>> deleteComment(@PathVariable("id") Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Comment> commentOpt = commentRepository.findById(id);
        if (commentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        commentRepository.deleteById(id);

        Map<String, Object> body = new HashMap<>();
        body.put("id", id);
        body.put("success", true);
        return ResponseEntity.ok(body);
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
