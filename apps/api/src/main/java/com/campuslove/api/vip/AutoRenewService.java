package com.campuslove.api.vip;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * VIP 自动续费服务。
 * <p>提供自动续费开关的查询、开启、关闭等业务逻辑。
 * 开启后，VIP 到期前 24 小时自动扣款续费。</p>
 *
 * <p>事务处理：所有写操作使用 @Transactional 保证原子性。
 * 状态查询使用只读事务以优化性能。</p>
 *
 * <p>错误处理：用户不存在等异常抛出 IllegalArgumentException，
 * 由 GlobalExceptionHandler 统一转换为 400 响应。
 * 数据库操作异常被捕获后包装为 RuntimeException 抛出，避免泄漏堆栈。</p>
 */
@Profile("real")
@Service
public class AutoRenewService {

    private static final Logger log = LoggerFactory.getLogger(AutoRenewService.class);

    private final UserRepository userRepository;

    public AutoRenewService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 查询当前用户的自动续费状态。
     *
     * @param userId 用户 ID
     * @return 自动续费状态视图
     * @throws IllegalArgumentException 用户 ID 为空或用户不存在时抛出
     */
    @Transactional(readOnly = true)
    public AutoRenewStatusView getStatus(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
            boolean enabled = Boolean.TRUE.equals(user.getAutoRenewEnabled());
            return new AutoRenewStatusView(enabled);
        } catch (IllegalArgumentException e) {
            // 业务参数异常直接抛出
            throw e;
        } catch (Exception e) {
            log.error("查询自动续费状态失败：userId={}", userId, e);
            throw new RuntimeException("查询自动续费状态失败，请稍后重试", e);
        }
    }

    /**
     * 开启自动续费。
     *
     * @param userId 用户 ID
     * @param planId 套餐 ID（用于将来扩展绑定支付渠道等）
     * @return 更新后的状态视图
     * @throws IllegalArgumentException 用户 ID 为空、套餐 ID 为空或用户不存在时抛出
     */
    @Transactional
    public AutoRenewStatusView enable(Long userId, String planId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        if (planId == null || planId.isBlank()) {
            throw new IllegalArgumentException("套餐 ID 不能为空");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        try {
            user.setAutoRenewEnabled(true);
            userRepository.save(user);
            log.info("自动续费已开启：userId={}, planId={}", userId, planId);
            return new AutoRenewStatusView(true);
        } catch (Exception e) {
            log.error("开启自动续费失败：userId={}, planId={}", userId, planId, e);
            throw new RuntimeException("开启自动续费失败，请稍后重试", e);
        }
    }

    /**
     * 关闭自动续费。
     *
     * @param userId 用户 ID
     * @return 更新后的状态视图
     * @throws IllegalArgumentException 用户 ID 为空或用户不存在时抛出
     */
    @Transactional
    public AutoRenewStatusView disable(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        try {
            user.setAutoRenewEnabled(false);
            userRepository.save(user);
            log.info("自动续费已关闭：userId={}", userId);
            return new AutoRenewStatusView(false);
        } catch (Exception e) {
            log.error("关闭自动续费失败：userId={}", userId, e);
            throw new RuntimeException("关闭自动续费失败，请稍后重试", e);
        }
    }

    /**
     * 设置自动续费开关（兼容旧接口，保留供内部调用）。
     *
     * @param userId  用户 ID
     * @param enabled 是否启用自动续费
     * @return 更新后的状态视图
     */
    @Transactional
    public AutoRenewStatusView setEnabled(Long userId, Boolean enabled) {
        if (enabled == null) {
            throw new IllegalArgumentException("启用状态不能为空");
        }
        return enabled ? enable(userId, "default") : disable(userId);
    }

    /**
     * 自动续费状态视图。
     *
     * @param enabled 是否启用自动续费
     */
    public record AutoRenewStatusView(Boolean enabled) {
    }
}
