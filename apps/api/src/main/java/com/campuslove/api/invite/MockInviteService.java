package com.campuslove.api.invite;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 邀请奖励服务实现（@Profile("mock")）。
 *
 * <p>展示版（showcase）与本地开发在 mock profile 下运行：无数据库，本实现用内存
 * 邀请码/奖励集合模拟 invite_code / invite_reward 表，奖励走
 * {@link com.campuslove.api.wallet.MockWalletServiceImpl}，使 /api/v1/invites 端点可用。</p>
 *
 * <p>与 {@link RealInviteService} 行为对齐：邀请码幂等生成、不能邀请自己、
 * 一人只能被绑定一次、accept 即发奖励入邀请人钱包。</p>
 */
@Profile("mock")
@Service
public class MockInviteService implements InviteService {

    private static final Logger log = LoggerFactory.getLogger(MockInviteService.class);

    /** 用户 ID -> 邀请码 */
    private final Map<Long, String> inviteCodes = new ConcurrentHashMap<>();

    /** 被邀请人 ID -> 奖励记录 */
    private final Map<Long, RewardView> rewards = new ConcurrentHashMap<>();

    private final AtomicLong codeSeq = new AtomicLong(100000);

    private final WalletService walletService;

    public MockInviteService(WalletService walletService) {
        this.walletService = walletService;
    }

    @Override
    public InviteCodeView getOrCreateInviteCode(Long userId) {
        return new InviteCodeView(inviteCodes.computeIfAbsent(userId, this::generateCode),
                "invite?code=" + inviteCodes.get(userId));
    }

    @Override
    public InviteCodeView getMyInviteCode(Long userId) {
        String code = inviteCodes.get(userId);
        return code != null ? new InviteCodeView(code, "invite?code=" + code)
                : new InviteCodeView(null, null);
    }

    @Override
    public AcceptResultView acceptInvite(Long userId, String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("userId and code are required");
        }
        // 邀请码存在性校验
        Long inviterUserId = inviteCodes.entrySet().stream()
                .filter(e -> e.getValue().equals(code.trim()))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.INVITE_CODE_NOT_FOUND));

        // 不能邀请自己
        if (inviterUserId.equals(userId)) {
            throw new IllegalArgumentException(ErrorMessages.CANNOT_INVITE_SELF);
        }

        // 一个用户只能被绑定一次
        if (rewards.containsKey(userId)) {
            RewardView existing = rewards.get(userId);
            return new AcceptResultView(inviterUserId, "Mock用户" + inviterUserId,
                    existing.rewardPoints(), walletService.getBalance(inviterUserId), true);
        }

        // 创建记录 + accept 即发奖励入邀请人钱包
        RewardView created = new RewardView(
                (long) (rewards.size() + 1),
                userId,
                "Mock用户" + userId,
                INVITE_REWARD_POINTS,
                "GRANTED",
                java.time.LocalDateTime.now().toString());
        rewards.put(userId, created);
        long balanceAfter = walletService.recharge(
                inviterUserId, (long) INVITE_REWARD_POINTS, "INVITE-" + userId + "-MOCK",
                WalletTransactionLog.RELATED_TYPE_INVITE_REWARD, String.valueOf(userId));
        log.info("Mock 邀请绑定成功并发放奖励：inviterUserId={}, inviteeUserId={}, reward={}",
                inviterUserId, userId, INVITE_REWARD_POINTS);
        return new AcceptResultView(inviterUserId, "Mock用户" + inviterUserId,
                INVITE_REWARD_POINTS, balanceAfter, false);
    }

    @Override
    public List<RewardView> listMyRewards(Long userId) {
        return rewards.values().stream()
                .filter(r -> r.id() != null)
                .collect(Collectors.toList());
    }

    private String generateCode(Long userId) {
        return "M" + codeSeq.incrementAndGet();
    }
}
