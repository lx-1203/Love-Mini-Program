package com.campuslove.api.tasks;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.TaskClaim;
import com.campuslove.api.profile.ProfileQueryService;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.TaskClaimRepository;
import com.campuslove.api.wallet.WalletService;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Task 2：{@code task_claim.claim_date} 的可空列把唯一键打穿（2026-10-30 修复回归用例）。
 *
 * <p><b>缺陷基线</b>：建表脚本 {@code V2026.08.10.0024} 第 24 行声明
 * {@code claim_date DATE NULL}，第 26 行却建了
 * {@code UNIQUE KEY uk_task_claim_user_code_date (user_id, task_code, claim_date)}。
 * MySQL/InnoDB 唯一索引里任意多个 NULL 互不相等，故 {@code claim_date IS NULL}
 * 的行完全不受该约束约束。而写入方 {@link RealTaskService#claim} 修复前是
 * {@code claim.setClaimDate(def.daily ? today : null)}（该文件第 140 行）——
 * complete-profile / first-post / campus-verify 三类一次性任务写的正是 NULL，
 * 于是「防重复领取」对它们只剩服务层第 2 步的先查后写；两步之间没有锁，
 * 并发双击可同时通过 {@code existsByUserIdAndTaskCode} 检查、各插一行、
 * 各调一次 {@code walletService.recharge} —— 重复发奖真的可写库（不是潜伏缺陷）。</p>
 *
 * <p><b>修复</b>：Flyway V2026.10.30.0002 把该列收敛为 NOT NULL，写入方对四类任务
 * 一律落业务时区当日（{@code LocalDate.now(TimeZones.BUSINESS)}），
 * 唯一键自此对四类任务都真正生效。</p>
 *
 * <p><b>本用例能钉住什么、钉不住什么</b>：服务层用 Mock 仓库，
 * 唯一键本身只能由数据库执行——所以这里断言的是「写入方的日期取值」这一
 * 让护栏成立的前提：一次性任务的领取行也必须带非空当日日期，
 * 且与同日防重查询用的是同一个日期值（同一口径）。
 * 「第二次领取被拒」在服务层可断言（先查后写命中），
 * 并发竞态下真正兜底的是 DB 唯一键，需在真实 MySQL 上验证（本仓无 task_claim 的
 * 集成测试基座，见交付说明）。</p>
 */
@DisplayName("Task 2 task_claim.claim_date 非空与同日防重用例")
class TaskClaimDateGuardTest {

    private static final long USER_ID = 1L;

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

    /** 每日签到：连续 1 天 → 任务完成，可领取。 */
    private void stubDailyCheckinCompleted() {
        when(checkInRepository.findCheckInDatesBefore(eq(USER_ID), any()))
                .thenReturn(List.of(LocalDate.now(TimeZones.BUSINESS)));
    }

    /** first-post：已有 1 条有效动态 → 任务完成，可领取。 */
    private void stubFirstPostCompleted() {
        when(postRepository.countByAuthorIdAndStatus(eq(USER_ID), any())).thenReturn(1L);
    }

    /* ==================== 1. 同日第二次领取必须被拒 ==================== */

    @Test
    @DisplayName("每日任务同日第二次领取：被拒（任务奖励已领取过），不发奖、不落第二行")
    void secondDailyClaimOnSameDateIsRejected() {
        stubDailyCheckinCompleted();
        LocalDate today = LocalDate.now(TimeZones.BUSINESS);
        // 库里已有当日领取行
        when(claimRepository.existsByUserIdAndTaskCodeAndClaimDate(USER_ID, TaskService.TASK_DAILY_CHECKIN, today))
                .thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> taskService.claim(USER_ID, TaskService.TASK_DAILY_CHECKIN));

        assertEquals(ErrorMessages.TASK_ALREADY_CLAIMED, ex.getMessage(), "同日重复领取必须给出已领取文案");
        verify(claimRepository, never()).saveAndFlush(any(TaskClaim.class));
        verify(walletService, never()).recharge(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("一次性任务第二次领取（complete-profile）：被拒，不发奖、不落第二行")
    void secondOneTimeTaskClaimIsRejected() {
        when(profileQueryService.calculateProfileCompletion(USER_ID)).thenReturn(100);
        when(claimRepository.existsByUserIdAndTaskCode(USER_ID, TaskService.TASK_COMPLETE_PROFILE))
                .thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> taskService.claim(USER_ID, TaskService.TASK_COMPLETE_PROFILE));

        assertEquals(ErrorMessages.TASK_ALREADY_CLAIMED, ex.getMessage());
        verify(claimRepository, never()).saveAndFlush(any(TaskClaim.class));
        verify(walletService, never()).recharge(any(), any(), any(), any(), any());
    }

    /* ==================== 2. 写入方日期取值：唯一键成立的前提 ==================== */

    @Test
    @DisplayName("一次性任务落库的 claim_date 必须是非空的业务当日（旧代码写 NULL → 唯一键被击穿）")
    void oneTimeTaskClaimPersistsNonNullBusinessDate() {
        stubFirstPostCompleted();
        when(claimRepository.existsByUserIdAndTaskCode(USER_ID, TaskService.TASK_FIRST_POST))
                .thenReturn(false);
        when(walletService.recharge(eq(USER_ID), eq(20L), any(), any(), any())).thenReturn(20L);

        LocalDate before = LocalDate.now(TimeZones.BUSINESS);
        taskService.claim(USER_ID, TaskService.TASK_FIRST_POST);
        LocalDate after = LocalDate.now(TimeZones.BUSINESS);

        TaskClaim saved = captureSavedClaim();
        assertNotNull(saved.getClaimDate(),
                "一次性任务的 claim_date 不得为 NULL：InnoDB 唯一索引里 NULL 互不相等，"
                        + "uk_task_claim_user_code_date 会被整列 NULL 击穿");
        assertEquals(USER_ID, saved.getUserId().longValue(), "领取行归属用户");
        assertEquals(TaskService.TASK_FIRST_POST, saved.getTaskCode(), "领取行任务编码");
        // 业务时区当日（跨午夜窗口的极端情况下允许落在前后两次读数之间）
        assertTrue(!saved.getClaimDate().isBefore(before) && !saved.getClaimDate().isAfter(after),
                "claim_date 必须是业务时区当日，实测: " + saved.getClaimDate()
                        + "，窗口: [" + before + ", " + after + "]");
    }

    @Test
    @DisplayName("每日任务落库的 claim_date 与同日防重查询用的是同一个日期值（同一口径）")
    void dailyClaimPersistsTheSameDateUsedForDedupLookup() {
        stubDailyCheckinCompleted();
        when(walletService.recharge(eq(USER_ID), eq(5L), any(), any(), any())).thenReturn(5L);

        taskService.claim(USER_ID, TaskService.TASK_DAILY_CHECKIN);

        // 防重查询用的日期（服务内部 today）
        ArgumentCaptor<LocalDate> lookupDate = ArgumentCaptor.forClass(LocalDate.class);
        verify(claimRepository).existsByUserIdAndTaskCodeAndClaimDate(
                eq(USER_ID), eq(TaskService.TASK_DAILY_CHECKIN), lookupDate.capture());

        TaskClaim saved = captureSavedClaim();
        assertNotNull(saved.getClaimDate(), "每日任务的 claim_date 必须非空");
        assertEquals(lookupDate.getValue(), saved.getClaimDate(),
                "写入日期必须与防重查询日期同一天，否则「先查后写 + 唯一键」两处口径不一致");
        // orderId 的 yyyyMMdd 后缀同样取自同一 today：三处一致才不会有「已入账却查得回、约束拦不住」的错位
        assertEquals(LocalDate.now(TimeZones.BUSINESS), saved.getClaimDate(), "落库日期即业务当日");
    }

    private TaskClaim captureSavedClaim() {
        ArgumentCaptor<TaskClaim> captor = ArgumentCaptor.forClass(TaskClaim.class);
        verify(claimRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }
}
