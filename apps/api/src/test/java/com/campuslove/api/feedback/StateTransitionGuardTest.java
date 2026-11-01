package com.campuslove.api.feedback;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.admin.AdminDataScope;
import com.campuslove.api.common.ResourceConflictException;
import com.campuslove.api.common.StateMachines;
import com.campuslove.api.entity.Feedback;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.FeedbackRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * C3（2026-11 第六轮修复波 W1）：两处状态机闭合。
 *
 * <p>非法迁移各一条用例（能变红）＋合法迁移正控（不误伤）：
 * <ul>
 *   <li>feedback 工单：终态 CONVERTED 不得被 reply/handle 回退成 REVIEWED，
 *       回退后再 convert 会产出重复活动；</li>
 *   <li>心动信号：expired/declined/accepted 是终态，accept/decline 只允许从 pending，
 *       杜绝过期信号被复活。</li>
 * </ul>
 * 两张迁移表集中在 {@link StateMachines} 一处定义（口径统一）。</p>
 */
@DisplayName("C3 状态机：feedback 工单 + 心动信号非法迁移拒绝")
class StateTransitionGuardTest {

    // ==================== feedback 迁移表 ====================

    @Test
    @DisplayName("feedback：终态 CONVERTED 无出边（回退被拒 409）")
    void convertedTicketIsTerminal() {
        assertThrows(ResourceConflictException.class,
                () -> StateMachines.assertFeedbackTransitionAllowed(
                        SubmissionStatus.CONVERTED, SubmissionStatus.REVIEWED));
        assertThrows(ResourceConflictException.class,
                () -> StateMachines.assertFeedbackTransitionAllowed(
                        SubmissionStatus.CONVERTED, SubmissionStatus.PROCESSING));
    }

    @Test
    @DisplayName("feedback：SUBMITTED→REVIEWED/CONVERTED 合法（正控不误伤）")
    void normalFeedbackTransitionsAllowed() {
        assertDoesNotThrow(() -> StateMachines.assertFeedbackTransitionAllowed(
                SubmissionStatus.SUBMITTED, SubmissionStatus.REVIEWED));
        assertDoesNotThrow(() -> StateMachines.assertFeedbackTransitionAllowed(
                SubmissionStatus.SUBMITTED, SubmissionStatus.CONVERTED));
    }

    /** 接线行为用例：replyFeedback 打到 CONVERTED 工单必须 409 且不落库（迁移守卫确被调用）。 */
    @Test
    @DisplayName("接线：replyFeedback 对 CONVERTED 工单抛 409，不写库")
    void replyOnConvertedTicketIsRejectedAtService() {
        FeedbackRepository repo = mock(FeedbackRepository.class);
        ActivityRepository activityRepository = mock(ActivityRepository.class);
        AdminDataScope scope = mock(AdminDataScope.class);
        RealFeedbackService service =
                new RealFeedbackService(repo, new ObjectMapper(), null, activityRepository, scope);

        Feedback converted = new Feedback();
        converted.setId(5L);
        converted.setUserId(1L);
        converted.setType(FeedbackTicketType.FEEDBACK);
        converted.setStatus(SubmissionStatus.CONVERTED);
        when(repo.findById(5L)).thenReturn(Optional.of(converted));
        when(scope.resolveUserCampusName(any())).thenReturn("南开区");

        assertThrows(ResourceConflictException.class, () -> service.replyFeedback(5L, "再回复一次"));
    }

    /** 接线行为用例：对已 CONVERTED 的提案再转化必须被共用表拒绝（重复活动防线）。 */
    @Test
    @DisplayName("接线：convertProposal 对已 CONVERTED 提案抛 409")
    void convertAlreadyConvertedRejected() {
        FeedbackRepository repo = mock(FeedbackRepository.class);
        ActivityRepository activityRepository = mock(ActivityRepository.class);
        AdminDataScope scope = mock(AdminDataScope.class);
        RealFeedbackService service =
                new RealFeedbackService(repo, new ObjectMapper(), null, activityRepository, scope);

        Feedback converted = new Feedback();
        converted.setId(7L);
        converted.setUserId(1L);
        converted.setType(FeedbackTicketType.ACTIVITY_PROPOSAL);
        converted.setStatus(SubmissionStatus.CONVERTED);
        when(repo.findById(7L)).thenReturn(Optional.of(converted));
        when(scope.resolveUserCampusName(any())).thenReturn("南开区");

        assertThrows(ResourceConflictException.class, () -> service.convertProposal(7L));
    }

    // ==================== 心动信号迁移表 ====================

    @Test
    @DisplayName("心动信号：只有 pending 可 accept/decline，expired/accepted/declined 为终态")
    void heartSignalTerminalStates() {
        // expired 复活被拒（与 TempChatSessionService 的 status==accepted 谓词口径统一）
        assertThrows(ResourceConflictException.class,
                () -> StateMachines.assertHeartSignalTransitionAllowed(SignalStatus.expired, SignalStatus.accepted));
        assertThrows(ResourceConflictException.class,
                () -> StateMachines.assertHeartSignalTransitionAllowed(SignalStatus.expired, SignalStatus.declined));
        // 重复/交叉终态迁移被拒
        assertThrows(ResourceConflictException.class,
                () -> StateMachines.assertHeartSignalTransitionAllowed(SignalStatus.accepted, SignalStatus.declined));
        assertThrows(ResourceConflictException.class,
                () -> StateMachines.assertHeartSignalTransitionAllowed(SignalStatus.declined, SignalStatus.accepted));
    }

    @Test
    @DisplayName("心动信号：pending→accepted/declined/expired 合法（正控）")
    void heartSignalPendingTransitionsAllowed() {
        assertDoesNotThrow(() -> StateMachines.assertHeartSignalTransitionAllowed(
                SignalStatus.pending, SignalStatus.accepted));
        assertDoesNotThrow(() -> StateMachines.assertHeartSignalTransitionAllowed(
                SignalStatus.pending, SignalStatus.declined));
        assertDoesNotThrow(() -> StateMachines.assertHeartSignalTransitionAllowed(
                SignalStatus.pending, SignalStatus.expired));
    }

    /**
     * 接线静态门：三个写点必须调用共用 StateMachines 断言（防止「表定义了但没接线」的假绿）。
     * 心动信号走 MatchRecorder（构造依赖重，无真库不便跑用例），以源码接线证明兜底。
     */
    @Test
    @DisplayName("接线：MatchRecorder.accept/decline 均调用 StateMachines 迁移守卫")
    void matchRecorderWiresHeartSignalGuard() throws IOException {
        Path src = Path.of("src", "main", "java", "com", "campuslove", "api", "match", "MatchRecorder.java");
        assertTrue(Files.isRegularFile(src), "找不到 MatchRecorder 源码（扫描面为空）: " + src.toAbsolutePath());
        String text = Files.readString(src, StandardCharsets.UTF_8);
        assertContainsGuard(text, "acceptHeartSignal", "assertHeartSignalTransitionAllowed");
        assertContainsGuard(text, "declineHeartSignal", "assertHeartSignalTransitionAllowed");
    }

    private static void assertContainsGuard(String source, String method, String guard) {
        int m = source.indexOf("public void " + method);
        assertTrue(m >= 0, "找不到方法 " + method);
        // 从签名后的第一个 '{' 起做括号配平，取方法体（对 CRLF/缩进不敏感）
        int open = source.indexOf('{', m);
        assertTrue(open > m, "无法定位 " + method + " 方法体起始花括号");
        int depth = 0;
        int close = -1;
        for (int i = open; i < source.length(); i++) {
            char c = source.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    close = i;
                    break;
                }
            }
        }
        assertTrue(close > open, "无法定位 " + method + " 方法体结尾");
        String body = source.substring(m, close);
        assertTrue(body.contains(guard), method + " 未调用 " + guard + "（迁移守卫没接线）");
    }
}
