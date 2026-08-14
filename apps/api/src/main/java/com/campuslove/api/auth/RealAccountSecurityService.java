package com.campuslove.api.auth;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.PasswordNotSetException;
import com.campuslove.api.common.ResourceConflictException;
import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实账号安全服务实现（3-B 修改密码 / 3-C 更换手机号 / 3-E 注销账号）。
 * 在 real profile 下激活，使用 UserRepository + PasswordEncoder 完成凭据校验与更新，
 * 通过 {@link DeviceSessionService} + {@link TokenBlacklistService} 吊销该用户全部 token。
 */
@Profile("real")
@Service
public class RealAccountSecurityService implements AccountSecurityService {

    private static final Logger log = LoggerFactory.getLogger(RealAccountSecurityService.class);

    /** 新密码长度下界（与注册口径一致） */
    private static final int PASSWORD_MIN_LENGTH = 6;
    /** 新密码长度上界 */
    private static final int PASSWORD_MAX_LENGTH = 64;

    /** 手机号格式（与注册口径一致） */
    private static final String PHONE_PATTERN = "^1[3-9]\\d{9}$";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DeviceSessionService deviceSessionService;
    private final TokenBlacklistService tokenBlacklistService;
    private final JwtTokenProvider jwtTokenProvider;
    /** AES 加密器（phone 加密存储，与 RealAuthService 同一口径；单测可为 null） */
    private final AesEncryptor aesEncryptor;

    public RealAccountSecurityService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            DeviceSessionService deviceSessionService,
            TokenBlacklistService tokenBlacklistService,
            JwtTokenProvider jwtTokenProvider,
            AesEncryptor aesEncryptor) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.deviceSessionService = deviceSessionService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.aesEncryptor = aesEncryptor;
    }

    /**
     * 修改密码。
     * <ul>
     *   <li>无密码账号（纯 wechat/apple 注册）→ {@link OperationForbiddenException}
     *       （错误码 OPERATION_FORBIDDEN，文案 PASSWORD_NOT_SET）</li>
     *   <li>旧密码不匹配 → {@link OperationForbiddenException}（旧密码错误）</li>
     *   <li>成功：更新 BCrypt 密码 + 吊销该用户全部 token（含当前 token）</li>
     * </ul>
     */
    @Override
    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword, String currentToken) {
        validateNewPassword(newPassword);
        User user = findUserOrThrow(userId);

        // 无密码账号（纯 wechat/apple 注册）：明确业务错误码 PASSWORD_NOT_SET
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            log.warn("无密码账号请求修改密码被拒绝: userId={}", userId);
            throw new PasswordNotSetException(ErrorMessages.PASSWORD_NOT_SET);
        }
        if (oldPassword == null || !passwordEncoder.matches(oldPassword, user.getPassword())) {
            log.warn("修改密码失败：旧密码错误, userId={}", userId);
            throw new OperationForbiddenException(ErrorMessages.OLD_PASSWORD_WRONG);
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userRepository.save(user);
        log.info("密码修改成功, userId={}", userId);

        // 吊销该用户全部 token（含当前请求 token），强制重新登录
        revokeAllTokens(userId, currentToken);
    }

    /**
     * 更换手机号（本期实现「验旧密码」路径）。
     * <ul>
     *   <li>新手机号格式非法 → IllegalArgumentException（400）</li>
     *   <li>无密码账号 → {@link OperationForbiddenException}（PASSWORD_NOT_SET 语义）</li>
     *   <li>旧密码不匹配 → {@link OperationForbiddenException}（旧密码错误）</li>
     *   <li>新手机号已被占用 → {@link ResourceConflictException}（409，业务错误码）</li>
     * </ul>
     * <p>契约预留：请求体含可选 verificationCode 字段（后端当前无短信基础设施，
     * 后续接入 SMS 服务无需改契约，本期仅验密码）。</p>
     */
    @Override
    @Transactional
    public void changePhone(Long userId, String password, String newPhone) {
        if (newPhone == null || !newPhone.matches(PHONE_PATTERN)) {
            throw new IllegalArgumentException(ErrorMessages.PHONE_FORMAT_INVALID);
        }
        User user = findUserOrThrow(userId);

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            log.warn("无密码账号请求更换手机号被拒绝: userId={}", userId);
            throw new PasswordNotSetException(ErrorMessages.PASSWORD_NOT_SET);
        }
        if (password == null || !passwordEncoder.matches(password, user.getPassword())) {
            log.warn("更换手机号失败：旧密码错误, userId={}", userId);
            throw new OperationForbiddenException(ErrorMessages.OLD_PASSWORD_WRONG);
        }

        // 新手机号占用校验（与 registerUser 同一加密口径：先密文后明文，兼容历史数据）
        String newPhoneCipher = aesEncryptor != null ? aesEncryptor.encrypt(newPhone) : newPhone;
        boolean occupied = userRepository.findByPhone(newPhoneCipher)
                .or(() -> userRepository.findByPhone(newPhone))
                .isPresent();
        if (occupied) {
            log.warn("更换手机号失败：新手机号已被占用, userId={}", userId);
            throw new ResourceConflictException(ErrorMessages.PHONE_ALREADY_REGISTERED);
        }

        // 更新 phone（加密存储）+ 同步 openid 派生键（phone:hash），
        // 释放旧派生键避免未来旧手机号重新注册时唯一约束冲突
        user.setPhone(newPhoneCipher);
        if (user.getOpenid() != null && user.getOpenid().startsWith("phone:")) {
            user.setOpenid("phone:" + deriveSha256Hex(newPhone));
        }
        user.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userRepository.save(user);
        log.info("手机号更换成功, userId={}", userId);
    }

    /**
     * 注销账号（幂等）。
     * <ul>
     *   <li>已注销（status=deactivated）→ 幂等成功（不重复处理）</li>
     *   <li>有密码账号：校验旧密码；无密码账号：校验 confirmationText 非空（替代密码）</li>
     *   <li>匿名化：昵称→「已注销用户」、头像置空、手机号脱敏（置为不可登录的脱敏占位）</li>
     *   <li>吊销该用户全部 token（含当前 token）</li>
     * </ul>
     */
    @Override
    @Transactional
    public void deactivateAccount(Long userId, String password, String confirmationText, String currentToken) {
        User user = findUserOrThrow(userId);

        // 幂等：已注销账号重复注销直接成功
        if ("deactivated".equalsIgnoreCase(user.getStatus())) {
            log.info("账号已处于注销状态，重复注销幂等返回: userId={}", userId);
            return;
        }

        boolean hasPassword = user.getPassword() != null && !user.getPassword().isBlank();
        if (hasPassword) {
            if (password == null || !passwordEncoder.matches(password, user.getPassword())) {
                log.warn("注销账号失败：旧密码错误, userId={}", userId);
                throw new OperationForbiddenException(ErrorMessages.OLD_PASSWORD_WRONG);
            }
        } else {
            // 无密码账号：以注销确认文本替代密码校验
            if (confirmationText == null || confirmationText.isBlank()) {
                throw new OperationForbiddenException(ErrorMessages.CONFIRMATION_TEXT_REQUIRED);
            }
            log.info("无密码账号注销：confirmationText 已确认, userId={}", userId);
        }

        // 个人数据匿名化（昵称/头像/手机号）
        user.setStatus("deactivated");
        user.setNickname("已注销用户");
        user.setAvatarUrl(null);
        // 手机号脱敏：置为不可登录的脱敏占位（含用户 ID 保证 uk_users_phone 唯一）
        user.setPhone(maskPhone(userId));
        user.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userRepository.save(user);
        log.info("账号已注销并匿名化, userId={}", userId);

        // 吊销该用户全部 token（含当前请求 token）
        revokeAllTokens(userId, currentToken);
    }

    // ---- 私有辅助方法 ----

    /**
     * 吊销该用户全部 token：设备会话 jti 全部加入黑名单 + 当前请求 token 的 jti 加入黑名单。
     */
    private void revokeAllTokens(Long userId, String currentToken) {
        try {
            deviceSessionService.revokeAllUserTokens(userId);
        } catch (RuntimeException ex) {
            // 设备记录吊销失败不影响主流程（黑名单降级由 TokenBlacklistService 内部兜底）
            log.warn("吊销用户设备 token 失败, userId={}: {}", userId, ex.getMessage());
        }
        revokeCurrentToken(currentToken);
    }

    /**
     * 将当前请求 token 的 jti 加入黑名单（TTL = JWT 剩余有效期）。
     */
    private void revokeCurrentToken(String currentToken) {
        if (currentToken == null || currentToken.isBlank()) {
            return;
        }
        try {
            String jti = jwtTokenProvider.getJtiFromToken(currentToken);
            if (jti != null && !jti.isBlank()) {
                long ttlSeconds = jwtTokenProvider.getRemainingTtlSeconds(currentToken);
                if (ttlSeconds > 0) {
                    tokenBlacklistService.revoke(jti, ttlSeconds);
                }
            }
        } catch (JwtException | IllegalArgumentException ex) {
            // 当前 token 解析失败（异常 token）不影响主流程
            log.debug("吊销当前 token 失败: {}", ex.getMessage());
        }
    }

    /**
     * 手机号脱敏：置为不可登录的脱敏占位，含用户 ID 保证唯一约束不冲突。
     */
    private String maskPhone(Long userId) {
        return "1****" + userId;
    }

    /**
     * 新密码长度校验（6-64 位，与注册口径一致）。
     */
    private void validateNewPassword(String newPassword) {
        if (newPassword == null || newPassword.length() < PASSWORD_MIN_LENGTH
                || newPassword.length() > PASSWORD_MAX_LENGTH) {
            throw new IllegalArgumentException(ErrorMessages.PASSWORD_LENGTH_INVALID);
        }
    }

    /**
     * 查询用户，不存在抛业务异常（404）。
     */
    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorMessages.USER_NOT_FOUND_CN_PREFIX + userId));
    }

    /**
     * SHA-256 hex（小写），用于 phone 派生 openid（与 RealAuthService.registerUser 口径一致）。
     */
    private String deriveSha256Hex(String input) {
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] digest = sha256.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format(Locale.ROOT, "%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ErrorMessages.SHA256_UNAVAILABLE, ex);
        }
    }
}
