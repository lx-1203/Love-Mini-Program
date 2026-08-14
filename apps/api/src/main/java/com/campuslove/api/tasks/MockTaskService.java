package com.campuslove.api.tasks;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 任务与积分服务实现（@Profile("mock")）。
 *
 * <p>展示版（showcase）与本地开发在 mock profile 下运行：无数据库，本实现用内存
 * 领取集合模拟 task_claim 表，奖励走 {@link MockWalletServiceImpl}（mock profile
 * 自动注入），使 /api/v1/tasks 端点可用。</p>
 *
 * <p>完成度模拟（与 real 行为一致的语义）：</p>
 * <ul>
 *   <li>daily-checkin：进度 1/1（演示环境可领取，对齐签到链路）</li>
 *   <li>complete-profile：0/100（需真实资料）</li>
 *   <li>first-post：0/1（需真实动态）</li>
 *   <li>campus-verify：0/1（需真实认证）</li>
 * </ul>
 */
@Profile("mock")
@Service
public class MockTaskService implements TaskService {

    private static final Logger log = LoggerFactory.getLogger(MockTaskService.class);

    /** 已领取记录：userId -> 已领取任务编码集合（每日任务按日期维度：code#yyyyMMdd） */
    private final ConcurrentHashMap<Long, Set<String>> claimedMap = new ConcurrentHashMap<>();

    private final WalletService walletService;

    public MockTaskService(WalletService walletService) {
        this.walletService = walletService;
    }

    @Override
    public List<TaskView> listTasks(Long userId) {
        Set<String> claimed = claimedMap.getOrDefault(userId, Set.of());
        String todayKey = TASK_DAILY_CHECKIN + "#" + LocalDate.now();
        boolean dailyClaimed = claimed.contains(todayKey);
        boolean profileClaimed = claimed.contains(TASK_COMPLETE_PROFILE);
        boolean postClaimed = claimed.contains(TASK_FIRST_POST);
        boolean verifyClaimed = claimed.contains(TASK_CAMPUS_VERIFY);

        return List.of(
                new TaskView(TASK_DAILY_CHECKIN, "每日签到", "今日完成签到即可领取",
                        REWARD_DAILY_CHECKIN, 1, 1, dailyClaimed, !dailyClaimed),
                new TaskView(TASK_COMPLETE_PROFILE, "完善个人资料", "资料完善度达到 100% 即可领取",
                        REWARD_COMPLETE_PROFILE, 0, 100, profileClaimed, false),
                new TaskView(TASK_FIRST_POST, "发布首条动态", "发布 1 条动态即可领取",
                        REWARD_FIRST_POST, 0, 1, postClaimed, false),
                new TaskView(TASK_CAMPUS_VERIFY, "完成校园认证", "校园认证通过即可领取",
                        REWARD_CAMPUS_VERIFY, 0, 1, verifyClaimed, false)
        );
    }

    @Override
    public TaskProgressView getProgress(Long userId) {
        List<TaskView> tasks = listTasks(userId);
        int completedCount = (int) tasks.stream().filter(t -> t.progressCurrent() >= t.progressTarget()).count();
        int claimedCount = (int) tasks.stream().filter(TaskView::claimed).count();
        int totalReward = tasks.stream().mapToInt(TaskView::rewardPoints).sum();
        int claimedReward = tasks.stream().filter(TaskView::claimed).mapToInt(TaskView::rewardPoints).sum();
        int percent = totalReward > 0 ? Math.round(claimedReward * 100f / totalReward) : 0;
        return new TaskProgressView(tasks, completedCount, claimedCount, tasks.size(),
                claimedReward, totalReward, percent);
    }

    @Override
    public ClaimResultView claim(Long userId, String taskCode) {
        Set<String> claimed = claimedMap.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet());

        int reward = switch (taskCode) {
            case TASK_DAILY_CHECKIN -> {
                // 每日任务：按当日维度去重
                String todayKey = TASK_DAILY_CHECKIN + "#" + LocalDate.now();
                if (!claimed.add(todayKey)) {
                    throw new IllegalArgumentException(ErrorMessages.TASK_ALREADY_CLAIMED);
                }
                yield REWARD_DAILY_CHECKIN;
            }
            case TASK_COMPLETE_PROFILE -> {
                if (!claimed.add(TASK_COMPLETE_PROFILE)) {
                    throw new IllegalArgumentException(ErrorMessages.TASK_ALREADY_CLAIMED);
                }
                yield REWARD_COMPLETE_PROFILE;
            }
            case TASK_FIRST_POST -> {
                if (!claimed.add(TASK_FIRST_POST)) {
                    throw new IllegalArgumentException(ErrorMessages.TASK_ALREADY_CLAIMED);
                }
                yield REWARD_FIRST_POST;
            }
            case TASK_CAMPUS_VERIFY -> {
                if (!claimed.add(TASK_CAMPUS_VERIFY)) {
                    throw new IllegalArgumentException(ErrorMessages.TASK_ALREADY_CLAIMED);
                }
                yield REWARD_CAMPUS_VERIFY;
            }
            default -> throw new IllegalArgumentException(ErrorMessages.TASK_CODE_UNKNOWN_PREFIX + taskCode);
        };

        long balanceAfter = walletService.recharge(
                userId, (long) reward, "TASK-" + taskCode + "-" + userId + "-MOCK",
                WalletTransactionLog.RELATED_TYPE_TASK_REWARD, taskCode);
        log.info("Mock 任务奖励领取成功：userId={}, taskCode={}, reward={}", userId, taskCode, reward);
        return new ClaimResultView(taskCode, reward, balanceAfter);
    }
}
