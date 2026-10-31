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
import com.campuslove.api.privacy.PhoneColumnCodec;
import com.campuslove.api.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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

    /**
     * 注销数据清除服务（P0 2026-10-31：注销必须真的删）。
     *
     * <p>字段注入（required=false）兼容既有单测构造器：为 null 时仅退化为「users 墓碑」，
     * 生产装配 real profile 时必定存在。原先这里注入的是
     * {@code RealNameMediaPurgeService}（只删实名照片文件），其职责已被
     * {@link com.campuslove.api.privacy.AccountErasureService} 完全覆盖并扩展
     * （实名记录整行删除 + 实名/学生证/相册/背景等文件在事务提交后物理删除）。</p>
     */
    @Autowired(required = false)
    private com.campuslove.api.privacy.AccountErasureService accountErasureService;

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
        String newPhoneCipher = PhoneColumnCodec.store(aesEncryptor, newPhone);
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
     * 注销账号（幂等、可重跑）。
     * <ul>
     *   <li>已注销（status=deactivated）→ <b>不再直接返回</b>：跳过凭据复验（密码散列本身已被销毁，
     *       复验必然失败），但仍然把清除清单重跑一遍——上一次若在清单中途失败并回滚，
     *       会出现「users 已是墓碑、实名记录还在库里」的状态，重跑必须能补齐。</li>
     *   <li>有密码账号：校验旧密码；无密码账号：校验 confirmationText 非空（替代密码）</li>
     *   <li>数据清除：{@link com.campuslove.api.privacy.AccountErasureService#erase(Long)}
     *       按 {@code PersonalDataTables} 清单删除/匿名化主体的全部关联数据（40+ 项），
     *       再 {@code tombstone(user)} 写 users 行的身份列墓碑</li>
     *   <li>吊销该用户全部 token（含当前 token）</li>
     * </ul>
     *
     * <p>users 墓碑的两个关键值：{@code openid} 写
     * {@code erased:<UUIDv4>}（满足 NOT NULL + uk_users_openid 唯一，与真实微信 openid /
     * {@code phone:} / {@code guest:} 前缀都不冲突，两个账号同秒注销也不互撞）；
     * {@code phone} 写 <b>NULL</b>（旧实现写 {@code "1****"+userId} 是含 userId 的稳定化名，
     * 既没删除也可反推，同时把「明文哨兵」混进了本应存 AES 密文的列——见
     * {@link com.campuslove.api.privacy.PhoneColumnCodec}）。</p>
     */
    @Override
    @Transactional
    public void deactivateAccount(Long userId, String password, String confirmationText, String currentToken) {
        User user = findUserOrThrow(userId);

        boolean alreadyDeactivated = "deactivated".equalsIgnoreCase(user.getStatus());
        if (!alreadyDeactivated) {
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
        } else {
            log.info("账号已是注销墓碑，重跑清除清单以修复可能的半成品状态: userId={}", userId);
        }

        // 1) 关联数据清除（原生 SQL 逐表 DELETE/匿名化，与 PIPL 导出清单同源；含证件照/相册文件 URL 收集）
        if (accountErasureService != null) {
            accountErasureService.erase(userId);
        } else {
            // 生产装配不会走到这里（real profile 下必然存在）；退化为仅墓碑，并把缺口显式打出来
            log.error("注销缺少 AccountErasureService 装配，仅写了 users 墓碑——"
                    + "实名/校园认证/聊天/行为数据未清除, userId={}", userId);
        }

        // 2) users 行墓碑（身份列全部销毁；openid 非空且唯一，phone 置 NULL）
        String erasedOpenid = accountErasureService != null
                ? accountErasureService.tombstone(user)
                : manualTombstone(user);
        userRepository.save(user);
        log.info("账号已注销，users 行已墓碑化（openid 已换为一次性随机墓碑值）, userId={}", userId);

        // 3) 吊销该用户全部 token（含当前请求 token）
        revokeAllTokens(userId, currentToken);
    }

    /**
     * 装配缺失时的兜底墓碑（列集与 {@code AccountErasureService#tombstone} 保持一致）。
     * 仅本地/测试窄场景使用；生产路径由清除服务写墓碑。
     */
    private String manualTombstone(User user) {
        String erasedOpenid = com.campuslove.api.privacy.ErasedValues.erasedOpenid();
        user.setOpenid(erasedOpenid);
        user.setNickname(com.campuslove.api.privacy.ErasedValues.NICKNAME);
        user.setAvatarUrl(null);
        user.setBio(null);
        user.setGradeLabel(null);
        user.setPronouns(null);
        user.setPhone(com.campuslove.api.privacy.PhoneColumnCodec.ERASED_VALUE);
        user.setBirthDate(null);
        user.setCampusName(null);
        user.setCirclePath(null);
        user.setPassword(null);
        user.setLatitude(null);
        user.setLongitude(null);
        user.setGeoUpdatedAt(null);
        user.setRole("USER");
        user.setStatus("deactivated");
        user.setAutoRenewEnabled(false);
        user.setProfileCompletion(0);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        user.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        return erasedOpenid;
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
