package com.campuslove.api.invite;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.entity.InviteCode;
import com.campuslove.api.entity.InviteReward;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.InviteCodeRepository;
import com.campuslove.api.repository.InviteRewardRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实邀请奖励服务实现（3-K 邀请奖励，real profile）。
 *
 * <p>流程：</p>
 * <ul>
 *   <li>生成邀请码：8 位随机字母数字（UUID 派生），冲突时重试；每人至多一个</li>
 *   <li>accept：校验邀请码存在 / 不能邀请自己 / 只能绑定一次 →
 *       创建 invite_reward（invitee 唯一约束兜底）→ 奖励入邀请人钱包
 *       （orderId=INVITE-{inviteeUserId} 幂等）</li>
 *   <li>奖励记录列表：批量预加载被邀请人昵称避免 N+1</li>
 * </ul>
 */
@Profile("real")
@Service
public class RealInviteService implements InviteService {

    private static final Logger log = LoggerFactory.getLogger(RealInviteService.class);

    /** 邀请码长度（去掉前缀后 8 位） */
    private static final int CODE_LENGTH = 8;

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final InviteCodeRepository inviteCodeRepository;
    private final InviteRewardRepository inviteRewardRepository;
    private final UserRepository userRepository;
    private final WalletService walletService;

    public RealInviteService(InviteCodeRepository inviteCodeRepository,
                             InviteRewardRepository inviteRewardRepository,
                             UserRepository userRepository,
                             WalletService walletService) {
        this.inviteCodeRepository = inviteCodeRepository;
        this.inviteRewardRepository = inviteRewardRepository;
        this.userRepository = userRepository;
        this.walletService = walletService;
    }

    @Override
    @Transactional
    public InviteService.InviteCodeView getOrCreateInviteCode(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        // 幂等：已存在邀请码直接返回
        Optional<InviteCode> existing = inviteCodeRepository.findByUserId(userId);
        if (existing.isPresent()) {
            return toView(existing.get());
        }

        InviteCode inviteCode = new InviteCode();
        inviteCode.setUserId(userId);
        inviteCode.setCode(generateUniqueCode());
        inviteCodeRepository.saveAndFlush(inviteCode);
        log.info("邀请码生成成功：userId={}, code={}", userId, inviteCode.getCode());
        return toView(inviteCode);
    }

    @Override
    @Transactional(readOnly = true)
    public InviteService.InviteCodeView getMyInviteCode(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return inviteCodeRepository.findByUserId(userId).map(this::toView)
                .orElse(new InviteService.InviteCodeView(null, null));
    }

    @Override
    @Transactional
    public InviteService.AcceptResultView acceptInvite(Long userId, String code) {
        if (userId == null || code == null || code.isBlank()) {
            throw new IllegalArgumentException("userId and code are required");
        }

        // 1. 邀请码存在性校验
        InviteCode inviteCode = inviteCodeRepository.findByCode(code.trim())
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.INVITE_CODE_NOT_FOUND));

        // 2. 不能邀请自己
        if (inviteCode.getUserId().equals(userId)) {
            throw new IllegalArgumentException(ErrorMessages.CANNOT_INVITE_SELF);
        }

        // 3. 一个用户只能被绑定一次
        Optional<InviteReward> existing = inviteRewardRepository.findByInviteeUserId(userId);
        if (existing.isPresent()) {
            InviteReward reward = existing.get();
            log.info("用户已绑定过邀请关系，幂等返回：userId={}, inviterUserId={}",
                    userId, reward.getInviterUserId());
            return new InviteService.AcceptResultView(
                    reward.getInviterUserId(),
                    loadNickname(reward.getInviterUserId()),
                    reward.getRewardPoints() != null ? reward.getRewardPoints() : 0,
                    walletService.getBalance(reward.getInviterUserId()),
                    true);
        }

        // 4. 创建奖励记录（invitee 唯一约束兜底并发重复绑定）
        InviteReward reward = new InviteReward();
        reward.setInviterUserId(inviteCode.getUserId());
        reward.setInviteeUserId(userId);
        reward.setRewardPoints(INVITE_REWARD_POINTS);
        reward.setStatus(InviteReward.STATUS_GRANTED);
        inviteRewardRepository.saveAndFlush(reward);

        // 5. accept 时即发放奖励入邀请人钱包（最简单可靠；
        //    TODO(产品)：可改为「被邀请人完成注册后发」，届时由注册完成事件触发）
        long balanceAfter;
        try {
            balanceAfter = walletService.recharge(
                    inviteCode.getUserId(),
                    (long) INVITE_REWARD_POINTS,
                    "INVITE-" + userId,
                    WalletTransactionLog.RELATED_TYPE_INVITE_REWARD,
                    String.valueOf(userId));
        } catch (RuntimeException e) {
            log.error("邀请奖励入账失败（回滚绑定记录）：inviterUserId={}, inviteeUserId={}, error={}",
                    inviteCode.getUserId(), userId, e.getMessage());
            throw new RuntimeException(ErrorMessages.INVITE_REWARD_CREDIT_FAILED, e);
        }

        log.info("邀请绑定成功并发放奖励：inviterUserId={}, inviteeUserId={}, reward={}",
                inviteCode.getUserId(), userId, INVITE_REWARD_POINTS);
        return new InviteService.AcceptResultView(
                inviteCode.getUserId(),
                loadNickname(inviteCode.getUserId()),
                INVITE_REWARD_POINTS,
                balanceAfter,
                false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InviteService.RewardView> listMyRewards(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        List<InviteReward> rewards = inviteRewardRepository.findByInviterUserIdOrderByCreatedAtDesc(userId);

        // 批量预加载被邀请人昵称，避免循环中触发 N+1 查询
        List<Long> inviteeIds = rewards.stream()
                .map(InviteReward::getInviteeUserId)
                .distinct()
                .toList();
        Map<Long, User> userMap = inviteeIds.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(inviteeIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));

        return rewards.stream()
                .map(r -> new InviteService.RewardView(
                        r.getId(),
                        r.getInviteeUserId(),
                        userMap.containsKey(r.getInviteeUserId())
                                ? userMap.get(r.getInviteeUserId()).getNickname()
                                : com.campuslove.api.config.DisplayConstants.UNKNOWN_USER,
                        r.getRewardPoints() != null ? r.getRewardPoints() : 0,
                        r.getStatus(),
                        r.getCreatedAt() != null ? r.getCreatedAt().toString() : null))
                .toList();
    }

    // ---- 私有辅助方法 ----

    private InviteService.InviteCodeView toView(InviteCode inviteCode) {
        return new InviteService.InviteCodeView(inviteCode.getCode(),
                "invite?code=" + inviteCode.getCode());
    }

    private String loadNickname(Long userId) {
        return userRepository.findById(userId)
                .map(User::getNickname)
                .orElse(com.campuslove.api.config.DisplayConstants.UNKNOWN_USER);
    }

    /**
     * 生成唯一邀请码（8 位，去除易混淆字符 I/O/0/1；冲突重试）。
     */
    private String generateUniqueCode() {
        SecureRandom random = new SecureRandom();
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
            }
            String candidate = sb.toString();
            if (!inviteCodeRepository.existsByCode(candidate)) {
                return candidate;
            }
        }
        // 极端冲突场景：追加时间戳片段兜底
        return "INV" + System.currentTimeMillis();
    }
}
