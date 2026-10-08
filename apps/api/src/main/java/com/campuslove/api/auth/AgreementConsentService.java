/**
 * 协议同意留痕服务（2026-10-05 合规落库，任务 9 服务端半边）。
 *
 * <p>注册成功后同事务写入 user_agreement_consent（source=REGISTER）；
 * 客户端注册请求体携带可选字段 {@code agreedLegalVersion}，缺省以当前法律文本版本
 * {@value #DEFAULT_LEGAL_VERSION} 兜底。未来支付链路（PAYMENT 来源）复用
 * {@link #recordConsent}。</p>
 *
 * <p>幂等：同 (user_id, legal_version, source) 已留痕时跳过；
 * 并发重复插入由唯一索引兜底（捕获冲突静默跳过，不阻断注册主流程的提交语义——
 * 注册事务内写入失败会随注册一起回滚，保证「注册成功 ⇔ 同意留痕」原子性）。</p>
 */
package com.campuslove.api.auth;

import com.campuslove.api.entity.UserAgreementConsent;
import com.campuslove.api.repository.UserAgreementConsentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Profile("real")
@Service
public class AgreementConsentService {

    private static final Logger log = LoggerFactory.getLogger(AgreementConsentService.class);

    /** 当前法律文本版本（与 LegalTextProvider 文案口径一致；版本升级时同步调整） */
    public static final String DEFAULT_LEGAL_VERSION = "v1.0.0";

    /** 同意来源：注册 */
    public static final String SOURCE_REGISTER = "REGISTER";
    /** 同意来源：支付前确认（预留） */
    public static final String SOURCE_PAYMENT = "PAYMENT";
    /** 同意来源：存量用户迁移回填 */
    public static final String SOURCE_BACKFILL = "BACKFILL";

    private final UserAgreementConsentRepository consentRepository;

    public AgreementConsentService(UserAgreementConsentRepository consentRepository) {
        this.consentRepository = consentRepository;
    }

    /**
     * 注册协议同意留痕（source=REGISTER，版本缺省兜底）。
     *
     * @param userId             注册成功的用户 ID
     * @param agreedLegalVersion 客户端携带的同意版本（可空/空白 → 当前版本兜底）
     */
    @Transactional
    public void recordRegisterConsent(Long userId, String agreedLegalVersion) {
        recordConsent(userId, agreedLegalVersion, SOURCE_REGISTER);
    }

    /**
     * 记录一次协议同意（幂等）。
     *
     * @param userId       用户 ID
     * @param legalVersion 法律文本版本（可空/空白 → 当前版本兜底）
     * @param source       同意来源（REGISTER/PAYMENT/BACKFILL）
     */
    @Transactional
    public void recordConsent(Long userId, String legalVersion, String source) {
        if (userId == null) {
            return;
        }
        String version = legalVersion != null && !legalVersion.isBlank()
                ? legalVersion.trim() : DEFAULT_LEGAL_VERSION;
        try {
            if (consentRepository.existsByUserIdAndLegalVersionAndSource(userId, version, source)) {
                log.debug("协议同意已留痕，幂等跳过: userId={}, version={}, source={}", userId, version, source);
                return;
            }
            UserAgreementConsent consent = new UserAgreementConsent();
            consent.setUserId(userId);
            consent.setLegalVersion(version);
            consent.setIp(currentClientIp());
            consent.setSource(source);
            consentRepository.save(consent);
            log.info("协议同意留痕成功: userId={}, version={}, source={}", userId, version, source);
        } catch (DataIntegrityViolationException ex) {
            // 并发重复写入：唯一索引兜底，视为已留痕
            log.info("协议同意并发重复写入，按已留痕处理: userId={}, version={}, source={}",
                    userId, version, source);
        }
    }

    /**
     * 尽力获取当前请求的客户端 IP（注册线程的审计信息，失败不影响主流程）。
     *
     * <p>代理场景优先取 X-Forwarded-For 首地址，否则取直连 remoteAddr；
     * 非Web 线程（如单测）返回 null。</p>
     *
     * @return 客户端 IP（可为 null）
     */
    private static String currentClientIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return null;
            }
            var request = attrs.getRequest();
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                int comma = xff.indexOf(',');
                String first = (comma >= 0 ? xff.substring(0, comma) : xff).trim();
                if (!first.isEmpty()) {
                    return first;
                }
            }
            return request.getRemoteAddr();
        } catch (RuntimeException ex) {
            return null;
        }
    }
}
