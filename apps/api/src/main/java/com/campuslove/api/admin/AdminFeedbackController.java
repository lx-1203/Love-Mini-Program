package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Feedback;
import com.campuslove.api.feedback.FeedbackTicketType;
import com.campuslove.api.feedback.SubmissionStatus;
import com.campuslove.api.repository.FeedbackRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
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
 * 管理后台 - 反馈工单管理控制器（分页版）。
 *
 * <p>背景：早期仅有一个裸列表端点 {@code FeedbackController#listAdminFeedback}
 * （{@code GET /api/v1/admin/feedback}），它返回<b>不分页的全量数组</b>、
 * 且没有校区数据隔离；配套的处理动作也只有一个把状态推进到 REVIEWED 的
 * {@code PUT /api/v1/admin/feedback/{id}/reply}。本控制器补齐后台管理需要的
 * 「分页 + 按状态/类型筛选 + 校区数据隔离 + 可审计的状态处理」，与
 * {@link AdminReportController}、{@link AdminWhisperController} 保持同一套后台规范。</p>
 *
 * <p>接口（挂在独立的 {@code /tickets} 段下，与既有裸列表端点
 * {@code /api/v1/admin/feedback} 不冲突）：</p>
 * <ul>
 *   <li>{@code GET /api/v1/admin/feedback/tickets}：分页查询反馈工单列表，
 *       支持按状态（status）、类型（type）筛选</li>
 *   <li>{@code POST /api/v1/admin/feedback/tickets/{id}/handle}：处理工单，
 *       更新状态（可选写入回复摘要），带 {@link Auditable} 审计</li>
 * </ul>
 *
 * <p>权限说明：URL 层 {@code /api/v1/admin/**} 已按 HTTP 方法分级
 * （写方法仅 ADMIN/SUPER_ADMIN，读方法 ADMIN/SUPER_ADMIN/AUDITOR）；
 * 类级 {@code @PreAuthorize} 作为深度防御。</p>
 *
 * <p>数据隔离（商业模式：每个高校一个管理员）：<b>feedback_tickets 表没有校区列</b>
 * （{@code expected_campus} 是用户「期望的校区」愿望字段，非归属校区，不能用于隔离），
 * 因此工单的归属校区一律取<b>提交人所属校区</b>（{@code user_campus_profile.campus_name}），
 * 与 {@link AdminUserController} 按用户校区过滤的口径一致：</p>
 * <ul>
 *   <li>列表：校区管理员 / 有校区的审核员强制只看本人管辖校区提交的工单；
 *       全局管理员（SUPER_ADMIN 或无校区 ADMIN）可读全部，并可用 {@code campusName} 参数筛选</li>
 *   <li>处理：读取工单后按提交人校区调用 {@link AdminDataScope#assertCampusAccess(String)}
 *       校验越权，越权抛 403</li>
 * </ul>
 *
 * <p>实现取舍：由于 {@link FeedbackRepository} 无「按作者校区」的数据库级分页查询
 * （Feedback 与 User 之间没有 JPA 关联，只有裸 {@code user_id} 列），本控制器先取按
 * 创建时间降序的全量工单、在内存中按作者校区/状态/类型过滤，再做切片分页。这在后台
 * 反馈量级下可接受，但每个工单会触发一次作者校区解析查询（N+1）；如未来反馈量增大，
 * 应在仓储层补一条 JOIN {@code user_campus_profile} 的分页查询替换之。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/feedback/tickets")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
@Validated
public class AdminFeedbackController {

    private final FeedbackRepository feedbackRepository;
    /** 管理端数据隔离（多管理员多校区），校区解析统一走此服务 */
    private final AdminDataScope adminDataScope;

    public AdminFeedbackController(FeedbackRepository feedbackRepository, AdminDataScope adminDataScope) {
        this.feedbackRepository = feedbackRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询反馈工单列表。
     *
     * @param status     状态筛选：SUBMITTED / PROCESSING / REVIEWED / PLANNED / CONVERTED，可选
     * @param type       类型筛选：FEEDBACK / SUGGESTION / ACTIVITY_PROPOSAL，可选
     * @param campusName 校区筛选（按提交人所属校区过滤），可选；
     *                   校区管理员/审核员强制按其管辖校区过滤，忽略本参数
     * @param page       页码，1-based，默认 1
     * @param pageSize   每页大小，默认 20，最大 100
     * @return 分页工单列表
     */
    @GetMapping
    public AdminPageView<AdminFeedbackView> listTickets(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        SubmissionStatus statusFilter = parseEnum(SubmissionStatus.class, status);
        FeedbackTicketType typeFilter = parseEnum(FeedbackTicketType.class, type);

        // 数据隔离：校区管理员/审核员强制按其管辖校区过滤，忽略调用方 campusName
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();
        String effectiveCampus = scopedCampus != null ? scopedCampus : normalize(campusName);
        // 无校区的 AUDITOR（异常账号）解析为哨兵值：其可见校区集合为空 → 读不到任何数据（fail-closed）
        if (AdminDataScope.NO_CAMPUS_SCOPE.equals(effectiveCampus)) {
            return new AdminPageView<>(List.of(), 0L, Math.max(1, page), safeSize(pageSize), 1);
        }

        // 第一步：按状态/类型收窄候选集（与校区无关，先把行数降下来）
        List<Feedback> candidates = new ArrayList<>();
        for (Feedback f : feedbackRepository.findAllByOrderByCreatedAtDesc()) {
            if (statusFilter != null && f.getStatus() != statusFilter) {
                continue;
            }
            if (typeFilter != null && f.getType() != typeFilter) {
                continue;
            }
            candidates.add(f);
        }

        // 第二步：校区隔离。原实现在这里对每一行调一次 resolveUserCampusName，
        // 一页就是几十上百次 findByUserId（N+1）；改为一次性批量解析作者校区名。
        // 语义保持不变：无校区资料的作者仍被排除（authorCampus == null → 不属于任何校区）。
        List<Feedback> filtered;
        if (effectiveCampus == null) {
            filtered = candidates;
        } else {
            Map<Long, String> campusByAuthor = adminDataScope.resolveUserCampusNames(
                    candidates.stream().map(Feedback::getUserId).toList());
            filtered = new ArrayList<>();
            for (Feedback f : candidates) {
                String authorCampus = campusByAuthor.get(f.getUserId());
                if (authorCampus == null || !authorCampus.equalsIgnoreCase(effectiveCampus)) {
                    continue;
                }
                filtered.add(f);
            }
        }

        int safePage = Math.max(1, page);
        int safeSize = safeSize(pageSize);
        int total = filtered.size();
        int from = Math.min((safePage - 1) * safeSize, total);
        int to = Math.min(from + safeSize, total);
        List<AdminFeedbackView> items = filtered.subList(from, to).stream()
                .map(AdminFeedbackView::of)
                .toList();

        return new AdminPageView<>(
                items,
                total,
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(total, safeSize)
        );
    }

    /**
     * 处理反馈工单：更新状态（可选写入回复摘要）。
     *
     * <p>状态由调用方指定，取值须为合法 {@link SubmissionStatus}；
     * 例：推进到 PROCESSING / REVIEWED / PLANNED。审计操作记为 {@link AuditOperation#HANDLE_FEEDBACK}。</p>
     *
     * @param id  工单 ID
     * @param req 处理请求体
     * @return 处理后的工单视图；工单不存在返回 404
     */
    @PostMapping("/{id}/handle")
    @Transactional
    @Auditable(value = AuditOperation.HANDLE_FEEDBACK, targetType = "FEEDBACK")
    public ResponseEntity<AdminFeedbackView> handleTicket(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminFeedbackHandleRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<Feedback> feedbackOpt = feedbackRepository.findById(id);
        if (feedbackOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Feedback feedback = feedbackOpt.get();

        // 数据隔离：校区管理员/审核员仅能处理本校区提交人的工单，越权抛 403
        adminDataScope.assertCampusAccess(adminDataScope.resolveUserCampusName(feedback.getUserId()));

        feedback.setStatus(req.status());
        String summary = normalize(req.replySummary());
        if (summary != null) {
            feedback.setLatestReplySummary(summary);
        }
        Feedback saved = feedbackRepository.save(feedback);
        return ResponseEntity.ok(AdminFeedbackView.of(saved));
    }

    /** 每页大小收敛到 [1,100]。 */
    private static int safeSize(int pageSize) {
        return Math.max(1, Math.min(100, pageSize));
    }

    /** 归一化筛选参数：null/空白返回 null（不限制）。 */
    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** 宽松解析枚举参数：null/空白/非法值一律视为不限制（返回 null）。 */
    private static <E extends Enum<E>> E parseEnum(Class<E> type, String raw) {
        String value = normalize(raw);
        if (value == null) {
            return null;
        }
        try {
            return Enum.valueOf(type, value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    /** 反馈工单管理视图（对应 feedback_tickets 行）。 */
    public record AdminFeedbackView(
            Long id,
            Long userId,
            FeedbackTicketType type,
            String title,
            SubmissionStatus status,
            String latestReplySummary,
            String submittedAt
    ) {
        static AdminFeedbackView of(Feedback f) {
            return new AdminFeedbackView(
                    f.getId(),
                    f.getUserId(),
                    f.getType(),
                    f.getTitle(),
                    f.getStatus(),
                    f.getLatestReplySummary(),
                    f.getCreatedAt() != null ? f.getCreatedAt().toString() : null
            );
        }
    }

    /**
     * 处理工单请求体。
     *
     * @param status       目标状态（必填，合法 SubmissionStatus）
     * @param replySummary 回复摘要（可选，非空时写入 latest_reply_summary）
     */
    public record AdminFeedbackHandleRequest(
            @jakarta.validation.constraints.NotNull SubmissionStatus status,
            String replySummary
    ) {
    }
}
