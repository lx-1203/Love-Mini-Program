package com.campuslove.api.common;

import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.feedback.SubmissionStatus;
import java.util.Map;
import java.util.Set;

/**
 * C3（2026-11 第六轮修复波 W1）：两处状态机的合法迁移表，集中一处定义。
 *
 * <p>照本仓既有做法（{@code vip/VipOrderService.ALLOWED_TRANSITIONS} + {@code applyTransition}
 * 唯一入口，非法迁移拒绝）书写，但迁移拒绝抛既有语义异常
 * {@link ResourceConflictException}（HTTP 409）而非 {@code IllegalStateException}——
 * 后者在 {@code GlobalExceptionHandler} 无 handler 会塌成 500（见 C7），
 * 把「业务拒绝」伪装成「服务端故障」。</p>
 *
 * <p>之所以两张表放同一条类：feedback 工单与心动信号此前各自散落判断
 * （feedback 的 {@code convertProposal} 有终态守卫、{@code replyFeedback} 却没有，
 * 心动信号 accept/decline 零守卫，而同样的 {@code status==accepted} 谓词在
 * {@code chat/TempChatSessionService} 却有守卫）——口径不一致本身即缺陷证据。
 * 现在两处写点都只经本类的单一断言入口，规则不再漂移。</p>
 */
public final class StateMachines {

    private StateMachines() {
    }

    // ==================== feedback 工单 ====================

    /**
     * feedback 工单合法迁移表。终态 {@code CONVERTED}（提案已转为真实活动）无出边——
     * 一旦进入终态不得被 reply/handle 回退，否则回退后再转化会重复创建 Activity。
     */
    private static final Map<SubmissionStatus, Set<SubmissionStatus>> FEEDBACK_TRANSITIONS = Map.of(
            SubmissionStatus.SUBMITTED,
            Set.of(SubmissionStatus.PROCESSING, SubmissionStatus.REVIEWED,
                    SubmissionStatus.PLANNED, SubmissionStatus.CONVERTED),
            SubmissionStatus.PROCESSING,
            Set.of(SubmissionStatus.PROCESSING, SubmissionStatus.REVIEWED,
                    SubmissionStatus.PLANNED, SubmissionStatus.CONVERTED),
            SubmissionStatus.REVIEWED,
            Set.of(SubmissionStatus.PROCESSING, SubmissionStatus.REVIEWED,
                    SubmissionStatus.PLANNED, SubmissionStatus.CONVERTED),
            SubmissionStatus.PLANNED,
            Set.of(SubmissionStatus.PROCESSING, SubmissionStatus.REVIEWED,
                    SubmissionStatus.PLANNED, SubmissionStatus.CONVERTED),
            // 终态：CONVERTED 无任何合法出边
            SubmissionStatus.CONVERTED, Set.of());

    /** 工单迁移唯一入口：非法迁移抛 409。 */
    public static void assertFeedbackTransitionAllowed(SubmissionStatus from, SubmissionStatus to) {
        if (from == null) {
            throw new ResourceConflictException("工单当前状态缺失，拒绝迁移到 " + to);
        }
        Set<SubmissionStatus> allowed = FEEDBACK_TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new ResourceConflictException("工单状态非法迁移: " + from + " -> " + to);
        }
    }

    // ==================== 心动信号 ====================

    /**
     * 心动信号合法迁移表。{@code pending} 是唯一可被 accept/decline 的起始态；
     * {@code accepted / declined / expired} 均为终态，无出边——
     * 保证「已过期(expired)的信号不得被 accept 复活」，与
     * {@code chat/TempChatSessionService} 的 {@code status==accepted} 谓词口径统一。
     */
    private static final Map<SignalStatus, Set<SignalStatus>> HEART_SIGNAL_TRANSITIONS = Map.of(
            SignalStatus.pending, Set.of(SignalStatus.accepted, SignalStatus.declined, SignalStatus.expired),
            SignalStatus.accepted, Set.of(),
            SignalStatus.declined, Set.of(),
            SignalStatus.expired, Set.of());

    /** 心动信号迁移唯一入口：非法迁移抛 409。 */
    public static void assertHeartSignalTransitionAllowed(SignalStatus from, SignalStatus to) {
        if (from == null) {
            throw new ResourceConflictException("心动信号当前状态缺失，拒绝迁移到 " + to);
        }
        Set<SignalStatus> allowed = HEART_SIGNAL_TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new ResourceConflictException("心动信号状态非法迁移: " + from + " -> " + to);
        }
    }
}
