package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.admin.audit.AuditOperation;
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
 *   <li>SUPER_ADMIN（作用域解析为 null）：逐字节沿用原有数据库分页，取数与条数行为不变
 *       （视图新增 {@code redacted} 字段，超管侧恒为 false，正文照旧可见）。</li>
 *   <li>无管辖校区的异常账号（{@link AdminDataScope#isNoCampusScope(String)} 命中内部哨兵）：
 *       列表返回空集、删除一律 403（fail-closed，哨兵绝不参与校区比对）。</li>
 * </ul>
 *
 * <p><b>正文档位（F-W1b-2，2026-11-01 统一到与 {@link AdminConversationController} 同一口径）</b>：
 * 改造前本类把 {@code whisper_message.content} <b>原样</b>铺给类级
 * {@code @PreAuthorize} 放行的全部角色（ADMIN / SUPER_ADMIN / AUDITOR），
 * 而同域同语义的私信会话管理对非超管一律置 null —— 同一份「两个人私下说的话」，
 * 换一个后台页面就换了保密档位，这就是自相矛盾（谁能读私信正文必须由一条口径决定，
 * 不能由「走哪个 Controller」决定）。现在两侧完全一致：
 * 正文只在 {@link AdminDataScope#isCurrentSuperAdmin()} 为真时返回，其余档位
 * {@code content} 为 null 且 {@code redacted=true}（服务端裁决，前端仅据标记展示，
 * 字段名与私信侧 {@code AdminConversationView#redacted} 保持一致，两侧同一套语义）。
 * 作用域轴（看谁的）与档位轴（能看什么）分别由
 * 校区过滤与本条收紧独立负责，两者互不替代：校区管理员既只看得见本校区的双向悄悄话，
 * 也读不到其中任何一句正文。</p>
 *
 * <p><b>读留痕</b>：本类的列表与删除都带 {@link Auditable}（操作码
 * {@code VIEW_WHISPER} / {@code DELETE_WHISPER}）。悄悄话是平台里保密等级最高的一类数据，
 * 改造前它的读与删在 {@code audit_log} 里<b>一条都不留</b>（实测 0 条），
 * 事后既查不出谁翻过、也查不出翻了多少条。</p>
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
    @Auditable(value = AuditOperation.VIEW_WHISPER, targetType = "WHISPER",
            description = "管理端读取悄悄话列表（正文按档位收紧，读出规模由审计切面记入读范围快照）")
    public ResponseEntity<AdminPageView<AdminWhisperView>> list(
        @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
        @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(200) int size) {
        SecurityUtils.getCurrentUserId();
        String scopedCampus = adminDataScope.getCurrentAdminCampusName();
        // 档位轴（能看什么）：与 AdminConversationController 同一判据、同一取否方向 ——
        // 只有超管可见正文，校区管理员/审核员拿到 null + redacted=true。
        boolean canSeeContent = adminDataScope.isCurrentSuperAdmin();

        // 无管辖校区（内部哨兵）：读不到任何数据，且绝不拿哨兵去和真实校区名比对
        if (AdminDataScope.isNoCampusScope(scopedCampus)) {
            return ResponseEntity.ok(new AdminPageView<>(List.of(), 0L, page, size, 1));
        }
        if (scopedCampus == null) {
            // 全局管理员（SUPER_ADMIN）：保持原数据库侧分页，取数行为逐字节不变
            // （视图多出一个 redacted 字段，超管侧恒 false，正文照旧可见）
            Page<WhisperMessage> result = repository.findAll(PageRequest.of(page - 1, size));
            var items = result.getContent().stream().map(m -> AdminWhisperView.of(m, canSeeContent)).toList();
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
        var items = scoped.subList(from, to).stream().map(m -> AdminWhisperView.of(m, canSeeContent)).toList();
        return ResponseEntity.ok(new AdminPageView<>(
            items,
            total,
            page,
            size,
            AdminPageView.calculateTotalPages(total, size)
        ));
    }

    @DeleteMapping("/{id}")
    @Auditable(value = AuditOperation.DELETE_WHISPER, targetType = "WHISPER",
            description = "管理端删除单条悄悄话（私密内容的破坏性写操作，与读操作同等留痕）")
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

    /**
     * 悄悄话管理视图。
     *
     * <p>字段 {@code redacted} 与私信侧 {@code AdminConversationView#redacted} 同名同义：
     * true 表示「正文已由服务端按档位收走，前端只可展示『正文已隐藏』徽标，
     * 不得自行以任何方式还原」。前端没有裁决权，档位只在服务端。</p>
     *
     * @param id            悄悄话 ID
     * @param senderId      发送者
     * @param receiverId    接收者
     * @param content       正文；非超管恒为 null
     * @param status        状态
     * @param priceCents    付费金额（分）
     * @param createdAt     创建时间文本
     * @param readAt        已读时间文本
     * @param redacted      正文是否被档位收紧（true ⇒ content 必为 null）
     */
    public record AdminWhisperView(
        Long id, Long senderId, Long receiverId, String content,
        String status, Long priceCents, String createdAt, String readAt, boolean redacted
    ) {
        /**
         * 实体 → 视图。
         *
         * <p>{@code content} 是<b>整条视图里唯一的正文明文出口</b>，因此它必须出现在
         * 带档位判据的表达式里——静态门
         * {@code AdminSensitiveReadAuditStaticGateTest} 守的就是这一点（把三元判据摘掉即红）。</p>
         *
         * @param m             悄悄话实体
         * @param canSeeContent 当前管理员档位（仅超管为 true）
         * @return 视图
         */
        static AdminWhisperView of(WhisperMessage m, boolean canSeeContent) {
            return new AdminWhisperView(
                m.getId(), m.getSenderId(), m.getReceiverId(),
                canSeeContent ? m.getContent() : null,
                m.getStatus(), m.getPriceCents(),
                m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
                m.getReadAt() != null ? m.getReadAt().toString() : null,
                !canSeeContent
            );
        }
    }
}
