package com.campuslove.api.wallet;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实商业化解锁服务实现（P0-17，real profile）。
 *
 * <p>流程：</p>
 * <ol>
 *   <li>白名单校验 targetType ∈ {LIKED_ME, VISITOR}</li>
 *   <li>查 wallet_unlocks：已解锁直接返回 {@code {unlocked:true, balance}}（不扣费）</li>
 *   <li>未解锁：按配置单价（{@code app.unlock-price.liked-me / app.unlock-price.visitor}，
 *       单位分）调用 {@link WalletService#deduct} 扣费（relatedType 用白名单值
 *       UNLOCK_LIKED_ME / UNLOCK_VISITOR，orderId 幂等），写入 wallet_unlocks 解锁记录</li>
 *   <li>返回 {@code {unlocked:true, balance}}；余额不足抛 {@link InsufficientBalanceException}</li>
 * </ol>
 *
 * <p>幂等与并发安全：钱包扣减由 order_id 唯一索引兜底；解锁记录由 uk_user_target
 * 唯一约束兜底——并发重复解锁时后插入者约束冲突，捕获后按已解锁处理返回。</p>
 */
@Profile("real")
@Service
public class RealWalletUnlockService implements WalletUnlockService {

    private static final Logger log = LoggerFactory.getLogger(RealWalletUnlockService.class);

    private final WalletService walletService;
    private final WalletUnlockRepository unlockRepository;

    /** 解锁单价（分）：喜欢我列表（app.unlock-price.liked-me，默认 300 分 = 3 元） */
    @Value("${app.unlock-price.liked-me:300}")
    private int likedMePriceCents;

    /** 解锁单价（分）：访客列表（app.unlock-price.visitor，默认 300 分 = 3 元） */
    @Value("${app.unlock-price.visitor:300}")
    private int visitorPriceCents;

    public RealWalletUnlockService(WalletService walletService, WalletUnlockRepository unlockRepository) {
        this.walletService = walletService;
        this.unlockRepository = unlockRepository;
    }

    @Override
    @Transactional
    public WalletUnlockView unlock(Long userId, String targetType, Long targetId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        if (targetId == null || targetId <= 0) {
            throw new IllegalArgumentException("解锁目标 ID 必须为正数");
        }
        // P0-17：解锁目标类型白名单校验，拒绝未定义的扣费场景
        String normalizedType = normalizeTargetType(targetType);

        // 已解锁直接放行（不扣费）
        if (unlockRepository.findByUserIdAndTargetTypeAndTargetId(userId, normalizedType, targetId).isPresent()) {
            log.info("解锁命中已解锁记录，直接放行：userId={}, type={}, targetId={}", userId, normalizedType, targetId);
            return new WalletUnlockView(true, walletService.getBalance(userId));
        }

        // 未解锁：按配置单价扣费
        long priceCents = priceForType(normalizedType);
        String relatedType = relatedTypeFor(normalizedType);
        // orderId 幂等：同一 (user, type, targetId) 重复提交只扣一次费
        String orderId = "UNLOCK-" + normalizedType + "-" + targetId;
        Long balanceAfter;
        try {
            balanceAfter = walletService.deduct(userId, priceCents, orderId, relatedType, String.valueOf(targetId));
        } catch (InsufficientBalanceException e) {
            log.warn("解锁扣费失败，余额不足：userId={}, type={}, targetId={}, price={}",
                    userId, normalizedType, targetId, priceCents);
            throw e;
        }

        // 写入解锁记录（uk_user_target 唯一约束兜底并发重复解锁）
        try {
            WalletUnlock unlock = new WalletUnlock();
            unlock.setUserId(userId);
            unlock.setTargetType(normalizedType);
            unlock.setTargetId(targetId);
            unlock.setAmountCents(priceCents);
            unlockRepository.saveAndFlush(unlock);
        } catch (DataIntegrityViolationException e) {
            // 并发场景下另一事务已写入解锁记录：幂等语义，按已解锁处理
            log.info("解锁记录唯一约束冲突（并发重复解锁），按已解锁处理：userId={}, type={}, targetId={}",
                    userId, normalizedType, targetId);
        }

        log.info("解锁成功：userId={}, type={}, targetId={}, price={}, balanceAfter={}",
                userId, normalizedType, targetId, priceCents, balanceAfter);
        return new WalletUnlockView(true, balanceAfter);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<Long> findUnlockedTargetIds(Long userId, String targetType, Collection<Long> targetIds) {
        if (userId == null || targetIds == null || targetIds.isEmpty()) {
            return Set.of();
        }
        List<Long> distinctIds = targetIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (distinctIds.isEmpty()) {
            return Set.of();
        }
        String normalizedType = normalizeTargetType(targetType);
        return unlockRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, normalizedType, distinctIds).stream()
                .map(WalletUnlock::getTargetId)
                .collect(Collectors.toSet());
    }

    /** 目标类型白名单归一化：非法类型抛 400。 */
    private String normalizeTargetType(String targetType) {
        if (WalletUnlock.TARGET_TYPE_LIKED_ME.equals(targetType)) {
            return WalletUnlock.TARGET_TYPE_LIKED_ME;
        }
        if (WalletUnlock.TARGET_TYPE_VISITOR.equals(targetType)) {
            return WalletUnlock.TARGET_TYPE_VISITOR;
        }
        throw new IllegalArgumentException("不支持的解锁类型: " + targetType
                + ", 仅支持: " + WalletUnlock.TARGET_TYPE_LIKED_ME + " / " + WalletUnlock.TARGET_TYPE_VISITOR);
    }

    /** 目标类型 → 解锁单价（分）。 */
    private long priceForType(String targetType) {
        return WalletUnlock.TARGET_TYPE_LIKED_ME.equals(targetType)
                ? likedMePriceCents : visitorPriceCents;
    }

    /** 目标类型 → 钱包流水 relatedType（白名单值）。 */
    private String relatedTypeFor(String targetType) {
        return WalletUnlock.TARGET_TYPE_LIKED_ME.equals(targetType)
                ? WalletTransactionLog.RELATED_TYPE_UNLOCK_LIKED_ME
                : WalletTransactionLog.RELATED_TYPE_UNLOCK_VISITOR;
    }
}
