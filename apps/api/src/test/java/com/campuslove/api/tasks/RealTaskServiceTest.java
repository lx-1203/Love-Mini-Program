package com.campuslove.api.tasks;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.profile.ProfileQueryService;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.TaskClaimRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 真实任务与积分服务冒烟测试（3-J 任务与积分）。
 */
class RealTaskServiceTest {

    @Mock private TaskClaimRepository claimRepository;
    @Mock private CheckInRepository checkInRepository;
    @Mock private PostRepository postRepository;
    @Mock private CampusCertificationRepository certificationRepository;
    @Mock private ProfileQueryService profileQueryService;
    @Mock private WalletService walletService;

    private RealTaskService taskService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        taskService = new RealTaskService(claimRepository, checkInRepository, postRepository,
                certificationRepository, profileQueryService, walletService);
    }

    @Test
    void listTasks_shouldExposeFourTasksWithProgress() {
        when(profileQueryService.calculateProfileCompletion(1L)).thenReturn(100);
        when(postRepository.countByAuthorIdAndStatus(eq(1L), any())).thenReturn(1L);
        when(certificationRepository.findByUserId(1L))
                .thenReturn(Optional.of(certification("APPROVED")));

        List<TaskService.TaskView> tasks = taskService.listTasks(1L);

        assertEquals(4, tasks.size());
        TaskService.TaskView profile = tasks.stream()
                .filter(t -> t.code().equals(TaskService.TASK_COMPLETE_PROFILE)).findFirst().orElseThrow();
        assertEquals(100, profile.progressCurrent());
        assertTrue(profile.claimable());
        TaskService.TaskView verify = tasks.stream()
                .filter(t -> t.code().equals(TaskService.TASK_CAMPUS_VERIFY)).findFirst().orElseThrow();
        assertEquals(1, verify.progressCurrent());
    }

    @Test
    void claim_shouldRejectUnknownTaskCode() {
        assertThrows(IllegalArgumentException.class, () -> taskService.claim(1L, "unknown-task"));
    }

    @Test
    void claim_shouldRejectWhenNotCompleted() {
        when(profileQueryService.calculateProfileCompletion(1L)).thenReturn(30);
        assertThrows(IllegalArgumentException.class,
                () -> taskService.claim(1L, TaskService.TASK_COMPLETE_PROFILE));
    }

    @Test
    void claim_shouldRejectWhenAlreadyClaimed() {
        when(claimRepository.existsByUserIdAndTaskCode(1L, TaskService.TASK_COMPLETE_PROFILE))
                .thenReturn(true);
        assertThrows(IllegalArgumentException.class,
                () -> taskService.claim(1L, TaskService.TASK_COMPLETE_PROFILE));
        verify(walletService, never()).recharge(any(), any(), any(), any(), any());
    }

    @Test
    void claim_shouldCreditWalletAndRecordClaim() {
        when(profileQueryService.calculateProfileCompletion(1L)).thenReturn(100);
        when(claimRepository.existsByUserIdAndTaskCode(1L, TaskService.TASK_COMPLETE_PROFILE))
                .thenReturn(false);
        when(walletService.recharge(eq(1L), eq(50L),
                eq("TASK-complete-profile-1"),
                eq(WalletTransactionLog.RELATED_TYPE_TASK_REWARD),
                eq(TaskService.TASK_COMPLETE_PROFILE))).thenReturn(50L);

        TaskService.ClaimResultView result = taskService.claim(1L, TaskService.TASK_COMPLETE_PROFILE);

        assertEquals(50, result.rewardPoints());
        assertEquals(50L, result.balanceAfter());
        verify(claimRepository).saveAndFlush(any(com.campuslove.api.entity.TaskClaim.class));
    }

    @Test
    void claim_dailyCheckin_shouldUseTodayDateKey() {
        // 已签到（连续 1 天）
        when(checkInRepository.findCheckInDatesBefore(eq(1L), any())).thenReturn(List.of(LocalDate.now()));
        when(claimRepository.existsByUserIdAndTaskCodeAndClaimDate(eq(1L),
                eq(TaskService.TASK_DAILY_CHECKIN), eq(LocalDate.now()))).thenReturn(false);
        when(walletService.recharge(eq(1L), eq(5L), any(), any(), any())).thenReturn(5L);

        TaskService.ClaimResultView result = taskService.claim(1L, TaskService.TASK_DAILY_CHECKIN);

        assertEquals(5, result.rewardPoints());
        // 每日任务领取记录带当日 claim_date
        verify(claimRepository).saveAndFlush(any(com.campuslove.api.entity.TaskClaim.class));
    }

    @Test
    void getProgress_shouldAggregate() {
        when(profileQueryService.calculateProfileCompletion(1L)).thenReturn(0);
        when(postRepository.countByAuthorIdAndStatus(eq(1L), any())).thenReturn(0L);
        when(certificationRepository.findByUserId(1L)).thenReturn(Optional.empty());

        TaskService.TaskProgressView progress = taskService.getProgress(1L);

        assertEquals(4, progress.totalCount());
        assertEquals(175, progress.totalRewardPoints());
        assertEquals(0, progress.claimedRewardPoints());
    }

    private CampusCertification certification(String status) {
        CampusCertification cert = new CampusCertification();
        cert.setUserId(1L);
        cert.setStatus(status);
        return cert;
    }
}
