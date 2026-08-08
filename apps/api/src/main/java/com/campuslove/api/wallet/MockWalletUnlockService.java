package com.campuslove.api.wallet;

import com.campuslove.api.common.ErrorMessages;
import java.util.Collection;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 商业化解锁服务实现（P0-17，mock profile）。
 *
 * <p>展示版/本地开发在 mock profile 下运行：无数据库，本实现用内存
 * {@link ConcurrentHashMap} 模拟解锁记录，使 /api/v1/wallet/unlock 端点可用，
 * 与 {@link RealWalletUnlockService}（real）行为对齐：已解锁放行 / 未解锁扣费记录。</p>
 */
@Profile("mock")
@Service
public class MockWalletUnlockService implements WalletUnlockService {

    private static final Logger log = LoggerFactory.getLogger(MockWalletUnlockService.class);

    private final WalletService walletService;

    /** 解锁单价（分）：喜欢我列表（默认 300 分，R4-01806 与 Real 实现共用常量） */
    @Value("${app.unlock-price.liked-me:" + WalletUnlock.DEFAULT_UNLOCK_PRICE_CENTS + "}")
    private int likedMePriceCents;

    /** 解锁单价（分）：访客列表（默认 300 分，R4-01807 与 Real 实现共用常量） */
    @Value("${app.unlock-price.visitor:" + WalletUnlock.DEFAULT_UNLOCK_PRICE_CENTS + "}")
    private int visitorPriceCents;

    /** 内存解锁记录：userId:targetType:targetId -> true */
    private final Set<String> unlockRecords = ConcurrentHashMap.newKeySet();

    public MockWalletUnlockService(WalletService walletService) {
        this.walletService = walletService;
    }

    @Override
    public WalletUnlockView unlock(Long userId, String targetType, Long targetId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        if (targetId == null || targetId <= 0) {
            throw new IllegalArgumentException(ErrorMessages.UNLOCK_TARGET_ID_POSITIVE);
        }
        String normalizedType = normalizeTargetType(targetType);

        // 已解锁直接放行（不扣费）
        if (unlockRecords.contains(memKey(userId, normalizedType, targetId))) {
            return new WalletUnlockView(true, walletService.getBalance(userId));
        }

        // 未解锁：按配置单价扣费（orderId 幂等，同 real 语义）
        long priceCents = WalletUnlock.TARGET_TYPE_LIKED_ME.equals(normalizedType)
                ? likedMePriceCents : visitorPriceCents;
        String relatedType = WalletUnlock.TARGET_TYPE_LIKED_ME.equals(normalizedType)
                ? WalletTransactionLog.RELATED_TYPE_UNLOCK_LIKED_ME
                : WalletTransactionLog.RELATED_TYPE_UNLOCK_VISITOR;
        String orderId = "UNLOCK-" + normalizedType + "-" + targetId;
        Long balanceAfter = walletService.deduct(userId, priceCents, orderId, relatedType, String.valueOf(targetId));

        unlockRecords.add(memKey(userId, normalizedType, targetId));
        log.info("Mock 解锁成功：userId={}, type={}, targetId={}, price={}, balanceAfter={}",
                userId, normalizedType, targetId, priceCents, balanceAfter);
        return new WalletUnlockView(true, balanceAfter);
    }

    @Override
    public Set<Long> findUnlockedTargetIds(Long userId, String targetType, Collection<Long> targetIds) {
        if (userId == null || targetIds == null || targetIds.isEmpty()) {
            return Set.of();
        }
        String normalizedType = normalizeTargetType(targetType);
        return targetIds.stream()
                .filter(id -> id != null && unlockRecords.contains(memKey(userId, normalizedType, id)))
                .collect(Collectors.toSet());
    }

    private String memKey(Long userId, String targetType, Long targetId) {
        return userId + ":" + targetType + ":" + targetId;
    }

    private String normalizeTargetType(String targetType) {
        if (WalletUnlock.TARGET_TYPE_LIKED_ME.equals(targetType)) {
            return WalletUnlock.TARGET_TYPE_LIKED_ME;
        }
        if (WalletUnlock.TARGET_TYPE_VISITOR.equals(targetType)) {
            return WalletUnlock.TARGET_TYPE_VISITOR;
        }
        throw new IllegalArgumentException(ErrorMessages.UNSUPPORTED_UNLOCK_TYPE_PREFIX + targetType
                + ", 仅支持: " + WalletUnlock.TARGET_TYPE_LIKED_ME + " / " + WalletUnlock.TARGET_TYPE_VISITOR);
    }
}
