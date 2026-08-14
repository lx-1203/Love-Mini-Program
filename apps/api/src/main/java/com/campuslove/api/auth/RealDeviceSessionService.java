package com.campuslove.api.auth;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.JwtConfig;
import com.campuslove.api.repository.UserDeviceSessionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实设备会话服务实现（3-D 设备管理）。
 * 在 real profile 下激活，使用 UserDeviceSessionRepository 持久化设备记录，
 * 吊销时通过 {@link TokenBlacklistService} 将设备 JWT jti 加入黑名单（Redis + 本地内存降级）。
 */
@Profile("real")
@Service
public class RealDeviceSessionService implements DeviceSessionService {

    private static final Logger log = LoggerFactory.getLogger(RealDeviceSessionService.class);

    /** 请求未携带设备标识时的兜底值 */
    private static final String UNKNOWN_DEVICE_ID = "unknown";

    /** 吊销黑名单 TTL 兜底（JWT 配置缺失时按 24h），jti 会随 token 自然过期清理 */
    private static final long FALLBACK_REVOKE_TTL_SECONDS = 24L * 3600;

    private final UserDeviceSessionRepository repository;
    private final TokenBlacklistService tokenBlacklistService;
    private final JwtConfig jwtConfig;

    public RealDeviceSessionService(
            UserDeviceSessionRepository repository,
            TokenBlacklistService tokenBlacklistService,
            JwtConfig jwtConfig) {
        this.repository = repository;
        this.tokenBlacklistService = tokenBlacklistService;
        this.jwtConfig = jwtConfig;
    }

    /**
     * 记录一次登录设备（UPSERT）。
     * <ul>
     *   <li>deviceId 为空 → "unknown"</li>
     *   <li>同 (user_id, device_id) 行已存在 → 更新平台/jti/活跃时间，revoked 重置为 false（复活）</li>
     *   <li>不存在 → 新建</li>
     * </ul>
     * 唯一约束冲突（并发登录同设备）时回退查询既有记录再更新，避免 500。
     */
    @Override
    @Transactional
    public void recordLogin(Long userId, String deviceId, String platform, String jti) {
        if (userId == null) {
            return;
        }
        String effectiveDeviceId = deviceId == null || deviceId.isBlank() ? UNKNOWN_DEVICE_ID : deviceId.trim();
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

        Optional<UserDeviceSession> existingOpt = repository.findByUserIdAndDeviceId(userId, effectiveDeviceId);
        if (existingOpt.isPresent()) {
            UserDeviceSession session = existingOpt.get();
            session.setPlatform(platform != null && !platform.isBlank() ? platform : "unknown");
            session.setLastTokenJti(jti);
            session.setLastActiveAt(now);
            session.setUpdatedAt(now);
            session.setRevoked(false);
            repository.save(session);
            return;
        }

        UserDeviceSession session = new UserDeviceSession();
        session.setUserId(userId);
        session.setDeviceId(effectiveDeviceId);
        session.setPlatform(platform != null && !platform.isBlank() ? platform : "unknown");
        session.setLastTokenJti(jti);
        session.setLastActiveAt(now);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        session.setRevoked(false);
        try {
            repository.save(session);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // 并发首登同一设备：唯一约束冲突回退更新
            log.info("设备记录唯一约束冲突（并发登录），回退更新: userId={}, deviceId={}",
                    userId, SensitiveDeviceMasker.mask(effectiveDeviceId));
            repository.findByUserIdAndDeviceId(userId, effectiveDeviceId).ifPresent(existing -> {
                existing.setLastTokenJti(jti);
                existing.setLastActiveAt(now);
                existing.setUpdatedAt(now);
                existing.setRevoked(false);
                repository.save(existing);
            });
        }
    }

    /**
     * 查询指定用户的设备列表（含已吊销），按最近活跃时间倒序。
     */
    @Override
    @Transactional(readOnly = true)
    public List<UserDeviceSessionView> listDevices(Long userId) {
        return repository.findByUserIdOrderByLastActiveAtDesc(userId).stream()
                .map(UserDeviceSessionView::from)
                .toList();
    }

    /**
     * 吊销指定设备。
     * <ul>
     *   <li>设备不存在 → {@link ResourceNotFoundException}（404）</li>
     *   <li>设备不属于当前用户 → {@link OperationForbiddenException}（403）</li>
     *   <li>已吊销 → 幂等成功（不重复加入黑名单）</li>
     *   <li>正常 → revoked=true + 该设备 jti 加入黑名单（token 立即失效）</li>
     * </ul>
     */
    @Override
    @Transactional
    public void revokeDevice(Long userId, Long deviceId) {
        UserDeviceSession session = repository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorMessages.DEVICE_NOT_FOUND_PREFIX + deviceId));
        if (!session.getUserId().equals(userId)) {
            log.warn("越权吊销设备被拒绝: userId={}, deviceId={}", userId, deviceId);
            throw new OperationForbiddenException(ErrorMessages.DEVICE_OPERATION_FORBIDDEN);
        }
        if (Boolean.TRUE.equals(session.getRevoked())) {
            // 幂等：已吊销设备重复吊销直接成功
            return;
        }
        session.setRevoked(true);
        session.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        repository.save(session);

        // 吊销该设备最近签发的 token（jti 加入黑名单，TTL = JWT 有效期上限）
        String jti = session.getLastTokenJti();
        if (jti != null && !jti.isBlank()) {
            long ttl = jwtConfig != null ? Math.max(jwtConfig.getExpirationMs() / 1000, 1)
                    : FALLBACK_REVOKE_TTL_SECONDS;
            tokenBlacklistService.revoke(jti, ttl);
            log.info("设备已吊销: userId={}, deviceId={}, jti 已加入黑名单", userId, SensitiveDeviceMasker.mask(session.getDeviceId()));
        } else {
            log.info("设备已吊销（无关联 jti）: userId={}, deviceId={}", userId, SensitiveDeviceMasker.mask(session.getDeviceId()));
        }
    }

    /**
     * 吊销指定用户的全部未吊销设备 token（修改密码 / 注销账号时调用）。
     */
    @Override
    @Transactional
    public void revokeAllUserTokens(Long userId) {
        List<UserDeviceSession> activeSessions = repository.findByUserIdAndRevokedFalse(userId);
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        long ttl = jwtConfig != null ? Math.max(jwtConfig.getExpirationMs() / 1000, 1)
                : FALLBACK_REVOKE_TTL_SECONDS;
        for (UserDeviceSession session : activeSessions) {
            String jti = session.getLastTokenJti();
            if (jti != null && !jti.isBlank()) {
                tokenBlacklistService.revoke(jti, ttl);
            }
            session.setRevoked(true);
            session.setUpdatedAt(now);
            repository.save(session);
        }
        if (!activeSessions.isEmpty()) {
            log.info("已吊销用户全部设备 token: userId={}, 设备数={}", userId, activeSessions.size());
        }
    }

    /**
     * 日志脱敏：设备标识仅保留前 4 位，避免完整设备指纹落入日志。
     */
    private static final class SensitiveDeviceMasker {
        static String mask(String deviceId) {
            if (deviceId == null || deviceId.isBlank()) {
                return "unknown";
            }
            return deviceId.length() <= 4 ? "****" : deviceId.substring(0, 4) + "****";
        }
    }
}
