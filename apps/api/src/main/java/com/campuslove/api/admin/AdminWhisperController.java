package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.WhisperMessage;
import com.campuslove.api.repository.WhisperMessageRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 悄悄话管理（v3.1 审核红线：列表/查看/删除）。
 *
 * <p>数据隔离（S3-7，2026-10-30 迁移到共享作用域轴 {@link AdminDataScope}）：</p>
 * <ul>
 *   <li>改造前：列表 {@code findAll(...)} 直接返回<b>全平台</b>悄悄话（含正文），
 *       删除按 id 直删——两个端点上<b>没有任何</b>校区/圈层判定，
 *       校区管理员可读可删其他校区的私信内容。</li>
 *   <li>改造后：与同域的私信会话管理 {@link AdminConversationController} 同口径——
 *       whisper_message 表无 campus 列，故按<b>收发双方所属校区</b>判定，
 *       校区取自 {@code user_campus_profile}（经
 *       {@link AdminDataScope#resolveUserCampusNames(java.util.Collection)} 批量解析，
 *       避免逐行 N+1）；校区未知视为「不属于」并排除（比
 *       {@link AdminDataScope#assertCampusAccess(String)} 的「null 视为全局资源放行」更严格，
 *       避免跨校区私信泄露）。</li>
 *   <li>SUPER_ADMIN（作用域解析为 null）：逐字节沿用原有数据库分页与响应结构，行为不变。</li>
 *   <li>无管辖校区的异常账号（{@link AdminDataScope#isNoCampusScope(String)} 命中内部哨兵）：
 *       列表返回空集、删除一律 403（fail-closed，哨兵绝不参与校区比对）。</li>
 * </ul>
 *
 * <p>刻意不变之处：正文是否对非超管脱敏属<b>角色轴</b>（能看什么）而非作用域轴（看谁的），
 * 且改变字段取值会影响现有后台展示，故本类只补作用域判定，脱敏另议。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/whispers")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
public class AdminWhisperController {

    private final WhisperMessageRepository repository;
    /** 管理端数据作用域（校区轴）：与 AdminConversationController 共用同一套口径 */
    private final AdminDataScope adminDataScope;

    public AdminWhisperController(WhisperMessageRepository repository, AdminDataScope adminDataScope) {
        this.repository = repository;
        this.adminDataScope = adminDataScope;
    }

    @GetMapping
    public ResponseEntity<AdminPageView<AdminWhisperView>> list(
        @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
        @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(200) int size) {
        SecurityUtils.getCurrentUserId();
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();

        // 无管辖校区（内部哨兵）：读不到任何数据，且绝不拿哨兵去和真实校区名比对
        if (AdminDataScope.isNoCampusScope(scopedCampus)) {
            return ResponseEntity.ok(new AdminPageView<>(List.of(), 0L, page, size, 1));
        }
        if (scopedCampus == null) {
            // 全局管理员（SUPER_ADMIN）：保持原数据库侧分页，行为与响应结构逐字节不变
            Page<WhisperMessage> result = repository.findAll(PageRequest.of(page - 1, size));
            var items = result.getContent().stream().map(AdminWhisperView::of).toList();
            return ResponseEntity.ok(new AdminPageView<>(
                items,
                result.getTotalElements(),
                page,
                size,
                AdminPageView.calculateTotalPages(result.getTotalElements(), size)
            ));
        }

        // 校区管理员：表无 campus 列，须按「双方均属本校区」过滤后内存分页
        // （与 AdminConversationController#filterConversationsByCampus 同一取舍：
        //   只读后台、量级可控；如量增大应在仓储层补 JOIN user_campus_profile 的分页查询）
        List<WhisperMessage> scoped = filterWhispersByCampus(scopedCampus);
        int total = scoped.size();
        int from = Math.min((page - 1) * size, total);
        int to = Math.min(from + size, total);
        var items = scoped.subList(from, to).stream().map(AdminWhisperView::of).toList();
        return ResponseEntity.ok(new AdminPageView<>(
            items,
            total,
            page,
            size,
            AdminPageView.calculateTotalPages(total, size)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        // 越权拦截：先按目标行做校区作用域校验（不匹配 → 403）。
        // 行不存在时不加判断，交由 deleteById() 抛出与改造前完全一致的「不存在」语义，
        // 以免本次迁移顺带改掉 404 响应体。
        repository.findById(id).ifPresent(this::assertWhisperAccess);
        repository.deleteById(id);
        Map<String, Object> body = new HashMap<>();
        body.put("id", id);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /**
     * 校验当前管理员对目标悄悄话的访问权（校区轴）。
     *
     * <p>悄悄话是收发双方的私密内容，仅当<b>双方都属于其管辖校区</b>时校区管理员才可删除；
     * 任一方校区未知即视为不属于（排除），全局管理员（SUPER_ADMIN）放行。</p>
     *
     * @param whisper 目标悄悄话
     * @throws OperationForbiddenException 越权时（HTTP 403）
     */
    private void assertWhisperAccess(WhisperMessage whisper) {
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();
        if (scopedCampus == null) {
            return; // 全局管理员（SUPER_ADMIN）
        }
        if (AdminDataScope.isNoCampusScope(scopedCampus)) {
            throw new OperationForbiddenException(ErrorMessages.CAMPUS_ADMIN_SCOPE_FORBIDDEN);
        }
        Map<Long, String> campusByUser = resolveParticipantCampuses(List.of(whisper));
        if (!belongs(whisper.getSenderId(), scopedCampus, campusByUser)
            || !belongs(whisper.getReceiverId(), scopedCampus, campusByUser)) {
            throw new OperationForbiddenException(ErrorMessages.CAMPUS_ADMIN_SCOPE_FORBIDDEN);
        }
    }

    /**
     * 过滤出「收发双方均属管辖校区」的悄悄话（按创建时间倒序，保证分页稳定）。
     *
     * @param scopedCampus 当前管理员管辖校区名（非空、非哨兵）
     * @return 可见的悄悄话列表
     */
    private List<WhisperMessage> filterWhispersByCampus(String scopedCampus) {
        List<WhisperMessage> all = repository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        Map<Long, String> campusByUser = resolveParticipantCampuses(all);
        List<WhisperMessage> scoped = new ArrayList<>();
        for (WhisperMessage w : all) {
            if (belongs(w.getSenderId(), scopedCampus, campusByUser)
                && belongs(w.getReceiverId(), scopedCampus, campusByUser)) {
                scoped.add(w);
            }
        }
        return scoped;
    }

    /**
     * 批量解析悄悄话收发双方的归属校区（一次 IN 查询，避免逐行 N+1）。
     *
     * @param whispers 待解析的悄悄话集合
     * @return userId → campusName；无校区资料的 userId 不在 Map 中
     */
    private Map<Long, String> resolveParticipantCampuses(List<WhisperMessage> whispers) {
        List<Long> participantIds = whispers.stream()
            .flatMap(w -> java.util.stream.Stream.of(w.getSenderId(), w.getReceiverId()))
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (participantIds.isEmpty()) {
            return Map.of();
        }
        return adminDataScope.resolveUserCampusNames(participantIds);
    }

    /** 判断用户是否属于指定校区（校区缺失视为不属于，fail-closed）。 */
    private boolean belongs(Long userId, String scopedCampus, Map<Long, String> campusByUser) {
        String campus = userId == null ? null : campusByUser.get(userId);
        return campus != null && !campus.isBlank() && campus.trim().equalsIgnoreCase(scopedCampus.trim());
    }

    /** 悄悄话管理视图 */
    public record AdminWhisperView(
        Long id, Long senderId, Long receiverId, String content,
        String status, Long priceCents, String createdAt, String readAt
    ) {
        static AdminWhisperView of(WhisperMessage m) {
            return new AdminWhisperView(
                m.getId(), m.getSenderId(), m.getReceiverId(), m.getContent(),
                m.getStatus(), m.getPriceCents(),
                m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
                m.getReadAt() != null ? m.getReadAt().toString() : null
            );
        }
    }
}
