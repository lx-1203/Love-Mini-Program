package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.entity.ThirdPartyAccount;
import com.campuslove.api.repository.ThirdPartyAccountRepository;
import com.campuslove.api.repository.UserRepository;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionInterceptor;

/**
 * {@link ThirdPartyAuthService#bindThirdParty} 绑定安全加固单元测试（P0-1 第三方绑定验证加固）。
 *
 * <p>本类锁定"绑定接口不再信任客户端传入的原始 openId/unionId"这一安全契约：</p>
 * <ul>
 *   <li>微信绑定必须携带临时 {@code code}，服务端经 {@link WeChatClient#code2Session}
 *       换取真实 openid/unionid 后才落库；客户端无法指定要绑定的第三方身份。</li>
 *   <li>Apple 绑定必须携带 {@code identityToken}，服务端经
 *       {@link AppleIdentityTokenVerifier#verifyAndGetSubject} 验签取 sub 后才落库。</li>
 *   <li>伪造 / 无效 / 不可换取的凭据一律拒绝且<b>无任何数据库写入</b>。</li>
 *   <li>既有的跨用户冲突（OPENID_TAKEN）与"已绑定该平台"（ALREADY_BOUND）行为保留，
 *       且冲突判定基于服务端派生的真实身份，而非客户端原始入参。</li>
 * </ul>
 *
 * <p>测试策略：与 {@link RealAuthServiceTest} 一致，采用纯 Mockito、不加载 Spring 上下文，
 * 直接 new {@link ThirdPartyAuthService}。断言均针对<b>服务端派生并哈希后的身份</b>。</p>
 *
 * <p>独立复核后的两条 Important 修复同时被本类锁定：</p>
 * <ul>
 *   <li><b>I-1 凭据异常映射</b>：生产 {@link WeChatClient#code2Session} 对无效 code 抛
 *       {@code WeChatAuthException}，绑定必须按 {@code RealAuthService#loginWithWechat} 的既有
 *       约定映射为可区分错误（40029 → 401 INVALID_CODE；其他 errcode / 网络异常 / 熔断降级
 *       null → 502 WECHAT_API_ERROR），而不是落进 catch-all 500；openid 空白的响应仍是
 *       凭据无效（400）。任何失败路径都<b>零数据库写入</b>，且原始 code 不回显。</li>
 *   <li><b>I-2 事务边界</b>：公开编排方法 {@code bindThirdParty} 不得携带
 *       {@code @Transactional}（反射断言 + 未来自空转的正向对照），并经事务感知 AOP 代理
 *       实测：供应商失败时不开启数据库事务、供应商调用不被事务重放。</li>
 * </ul>
 */
class ThirdPartyAuthServiceBindTest {

    @Mock private ThirdPartyAccountRepository thirdPartyAccountRepository;
    @Mock private UserRepository userRepository;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private WeChatClient weChatClient;
    @Mock private AppleIdentityTokenVerifier appleIdentityTokenVerifier;

    private ThirdPartyAuthService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new ThirdPartyAuthService(
                thirdPartyAccountRepository,
                userRepository,
                jwtTokenProvider,
                weChatClient,
                appleIdentityTokenVerifier);
    }

    /* ============================================================
     * 场景 1：合法微信 code → 落库服务端派生的 openid/unionid（而非原始 code）
     * ============================================================ */
    @Test
    void bindThirdParty_validWechatCode_shouldPersistServerDerivedIdentity() {
        // Arrange：真实微信 code2session 返回的 openid/unionid 与客户端入参（code）不同
        String clientCode = "wx-code-from-client";
        String verifiedOpenId = "real-openid-abc123";
        String verifiedUnionId = "real-unionid-xyz789";
        WeChatClient.WeChatSessionResponse session = new WeChatClient.WeChatSessionResponse();
        session.setOpenid(verifiedOpenId);
        session.setUnionid(verifiedUnionId);
        when(weChatClient.code2Session(clientCode)).thenReturn(session);
        when(thirdPartyAccountRepository.findByProviderAndOpenId(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(thirdPartyAccountRepository.findByUserIdAndProvider(any(), anyString()))
                .thenReturn(Optional.empty());

        // Act
        boolean ok = service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null);

        // Assert
        assertTrue(ok, "合法微信 code 绑定应成功");
        // 服务端必须调用 code2session 校验 code（旧实现完全跳过，直接信任原始 openId）
        verify(weChatClient).code2Session(clientCode);

        ArgumentCaptor<ThirdPartyAccount> captor = ArgumentCaptor.forClass(ThirdPartyAccount.class);
        verify(thirdPartyAccountRepository).save(captor.capture());
        ThirdPartyAccount saved = captor.getValue();
        assertEquals(7L, saved.getUserId(), "绑定应归属当前用户");
        assertEquals(ThirdPartyAuthService.PROVIDER_WECHAT, saved.getProvider());
        // 落库的必须是"服务端派生 openid 的哈希"，绝不允许是客户端传入的原始 code
        assertEquals(sha256(verifiedOpenId), saved.getOpenId(),
                "openId 必须是服务端换取的真实 openid 哈希，而非客户端原始入参");
        assertEquals(sha256(verifiedUnionId), saved.getUnionId(),
                "unionId 必须是服务端换取的真实 unionid 哈希");
    }

    /* ============================================================
     * 场景 2：伪造 openId（当作 code 传入，微信侧判为无效 code）→ 拒绝且零写入
     *
     * <p>I-1 校正：生产 {@link WeChatClient#code2Session} 对无效 code 是<b>抛</b>
     * {@code WeChatAuthException(errcode=40029)}，而不是返回 null（null 只在熔断/重试
     * 耗尽的降级路径出现）。故本场景按生产真实行为打桩，并断言映射为
     * 凭据类客户端错误（401 INVALID_CODE）而非 catch-all 500。</p>
     * ============================================================ */
    @Test
    void bindThirdParty_forgedOpenIdThatCode2SessionRejects_shouldNotWriteDb() {
        // Arrange：攻击者把"想绑定的他人 openId"塞进 code 字段，微信侧判为无效 code 抛 40029
        String forgedOpenId = "victim-openid-attacker-wants";
        when(weChatClient.code2Session(forgedOpenId)).thenThrow(
                new WeChatClient.WeChatAuthException("WeChat auth failed: invalid code", 40029));

        // Act & Assert：凭据不可验证被拒绝，且是"提供方正确的"客户端错误
        WechatLoginException ex = assertThrows(WechatLoginException.class,
                () -> service.bindThirdParty(8L, ThirdPartyAuthService.PROVIDER_WECHAT, forgedOpenId, null));
        assertEquals(WechatLoginException.ErrorCode.INVALID_CODE, ex.getErrorCode());
        assertEquals(401, ex.getStatus().value(), "无效 code 属客户端可修复错误，不得是 500");

        // Assert：关键安全断言——没有任何绑定记录写入数据库
        verify(thirdPartyAccountRepository, never()).save(any());
    }

    /* ============================================================
     * 场景 3：合法 Apple identityToken → 落库服务端验签派生的 sub
     * ============================================================ */
    @Test
    void bindThirdParty_validAppleToken_shouldPersistServerDerivedSubject() {
        String identityToken = "valid-apple-identity-token";
        String verifiedSub = "apple-user-sub-0001";
        when(appleIdentityTokenVerifier.verifyAndGetSubject(identityToken)).thenReturn(verifiedSub);
        when(thirdPartyAccountRepository.findByProviderAndOpenId(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(thirdPartyAccountRepository.findByUserIdAndProvider(any(), anyString()))
                .thenReturn(Optional.empty());

        // Act
        boolean ok = service.bindThirdParty(9L, ThirdPartyAuthService.PROVIDER_APPLE, null, identityToken);

        // Assert
        assertTrue(ok, "合法 Apple identityToken 绑定应成功");
        verify(appleIdentityTokenVerifier).verifyAndGetSubject(identityToken);

        ArgumentCaptor<ThirdPartyAccount> captor = ArgumentCaptor.forClass(ThirdPartyAccount.class);
        verify(thirdPartyAccountRepository).save(captor.capture());
        ThirdPartyAccount saved = captor.getValue();
        assertEquals(9L, saved.getUserId());
        assertEquals(ThirdPartyAuthService.PROVIDER_APPLE, saved.getProvider());
        assertEquals(sha256(verifiedSub), saved.getOpenId(),
                "openId 必须是服务端验签得到的 Apple sub 哈希");
        // Apple 无 unionId
        assertTrue(saved.getUnionId() == null || saved.getUnionId().isBlank(),
                "Apple 绑定不应写入 unionId");
    }

    /* ============================================================
     * 场景 4：非法 / 重放 Apple token（验签抛错）→ 拒绝且零写入
     * ============================================================ */
    @Test
    void bindThirdParty_invalidAppleToken_shouldNotWriteDb() {
        String badToken = "replayed-or-tampered-apple-token";
        when(appleIdentityTokenVerifier.verifyAndGetSubject(badToken))
                .thenThrow(new IllegalArgumentException(ErrorMessages.APPLE_TOKEN_SIGNATURE_INVALID));

        // Act & Assert
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.bindThirdParty(10L, ThirdPartyAuthService.PROVIDER_APPLE, null, badToken));
        assertEquals(ErrorMessages.APPLE_TOKEN_SIGNATURE_INVALID, ex.getMessage());

        // 服务端必须真正调用验签器
        verify(appleIdentityTokenVerifier).verifyAndGetSubject(badToken);
        verify(thirdPartyAccountRepository, never()).save(any());
    }

    /* ============================================================
     * 场景 5：微信 code 换取到的 openid 已被他人绑定 → OPENID_TAKEN 冲突，零写入
     *         且冲突判定基于服务端派生身份（非原始 code）
     * ============================================================ */
    @Test
    void bindThirdParty_wechatVerifiedOpenIdTakenByOtherUser_shouldThrowConflictNoWrite() {
        String clientCode = "wx-code";
        String verifiedOpenId = "openid-owned-by-another-user";
        WeChatClient.WeChatSessionResponse session = new WeChatClient.WeChatSessionResponse();
        session.setOpenid(verifiedOpenId);
        session.setUnionid(null);
        when(weChatClient.code2Session(clientCode)).thenReturn(session);

        ThirdPartyAccount existing = new ThirdPartyAccount();
        existing.setUserId(42L); // 已属于另一个用户
        existing.setProvider(ThirdPartyAuthService.PROVIDER_WECHAT);
        existing.setOpenId(sha256(verifiedOpenId));
        // 仅当以"服务端派生 openid 哈希"为键查询时才命中他人绑定
        when(thirdPartyAccountRepository.findByProviderAndOpenId(
                ThirdPartyAuthService.PROVIDER_WECHAT, sha256(verifiedOpenId)))
                .thenReturn(Optional.of(existing));

        // Act & Assert
        ThirdPartyBindConflictException ex = assertThrows(ThirdPartyBindConflictException.class,
                () -> service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null));
        assertEquals(ThirdPartyBindConflictException.CODE_OPENID_TAKEN, ex.getErrorCode());
        verify(thirdPartyAccountRepository, never()).save(any());
    }

    /* ============================================================
     * 场景 6：当前用户已绑定该平台 → ALREADY_BOUND 冲突，零写入
     * ============================================================ */
    @Test
    void bindThirdParty_userAlreadyBoundToProvider_shouldThrowAlreadyBoundNoWrite() {
        String clientCode = "wx-code";
        String verifiedOpenId = "fresh-openid";
        WeChatClient.WeChatSessionResponse session = new WeChatClient.WeChatSessionResponse();
        session.setOpenid(verifiedOpenId);
        when(weChatClient.code2Session(clientCode)).thenReturn(session);

        when(thirdPartyAccountRepository.findByProviderAndOpenId(anyString(), anyString()))
                .thenReturn(Optional.empty());
        ThirdPartyAccount alreadyBound = new ThirdPartyAccount();
        alreadyBound.setUserId(7L);
        alreadyBound.setProvider(ThirdPartyAuthService.PROVIDER_WECHAT);
        when(thirdPartyAccountRepository.findByUserIdAndProvider(7L, ThirdPartyAuthService.PROVIDER_WECHAT))
                .thenReturn(Optional.of(alreadyBound));

        // Act & Assert
        ThirdPartyBindConflictException ex = assertThrows(ThirdPartyBindConflictException.class,
                () -> service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null));
        assertEquals(ThirdPartyBindConflictException.CODE_ALREADY_BOUND, ex.getErrorCode());
        verify(thirdPartyAccountRepository, never()).save(any());
    }

    /* ============================================================
     * 场景 7：微信绑定缺少 code → 拒绝（旧契约的 openId 必填校验被 code 必填取代）
     * ============================================================ */
    @Test
    void bindThirdParty_wechatWithoutCode_shouldRequireCodeAndNotWrite() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, "  ", null));
        // 新契约：缺少临时 code 无法验证身份 → 明确提示 code 必填（而非旧的 openId 必填）
        assertEquals(ErrorMessages.CODE_REQUIRED, ex.getMessage());
        verify(thirdPartyAccountRepository, never()).save(any());
    }

    /* ============================================================
     * 场景 8：Apple 绑定缺少 identityToken → 拒绝且零写入
     * ============================================================ */
    @Test
    void bindThirdParty_appleWithoutIdentityToken_shouldRejectAndNotWrite() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.bindThirdParty(9L, ThirdPartyAuthService.PROVIDER_APPLE, null, null));
        assertEquals(ErrorMessages.IDENTITY_TOKEN_REQUIRED, ex.getMessage());
        verify(thirdPartyAccountRepository, never()).save(any());
    }

    /* ============================================================
     * 场景 9（I-1）：code2session 抛 errcode=40029（code 无效/已过期）
     *               → 与 RealAuthService.loginWithWechat 同尺子：INVALID_CODE（401），零写入
     * ============================================================ */
    @Test
    void bindThirdParty_wechatInvalidCodeErrcode40029_shouldMapToClientCredentialErrorAndNotWrite() {
        String clientCode = "expired-wx-code-from-client";
        when(weChatClient.code2Session(clientCode)).thenThrow(
                new WeChatClient.WeChatAuthException("WeChat auth failed: invalid code", 40029));

        WechatLoginException ex = assertThrows(WechatLoginException.class,
                () -> service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null));

        assertEquals(WechatLoginException.ErrorCode.INVALID_CODE, ex.getErrorCode(),
                "errcode 40029 应映射为 INVALID_CODE（既有 loginWithWechat 约定）");
        assertEquals(401, ex.getStatus().value(), "40029 属客户端可修复错误：401，不是 500");
        // 上游细节仅进日志：面向用户的消息不得回显原始 code / 上游 errmsg 细节
        assertFalse(ex.getMessage().contains(clientCode), "客户端错误消息禁止包含原始 code");
        assertInstanceOf(WeChatClient.WeChatAuthException.class, ex.getCause(),
                "原始微信异常应保留为 cause 供日志排查");
        // 验证阶段失败即拒绝，数据库层完全不被触碰（零写入，也零查询）
        verifyNoInteractions(thirdPartyAccountRepository, userRepository);
    }

    /* ============================================================
     * 场景 10（I-1）：code2session 抛非 40029 的业务 errcode（如 45011 限流）
     *                → 可区分的上游服务失败：WECHAT_API_ERROR（502），零写入
     * ============================================================ */
    @Test
    void bindThirdParty_wechatOtherErrcode_shouldMapToUpstreamServiceFailureAndNotWrite() {
        String clientCode = "rate-limited-wx-code";
        when(weChatClient.code2Session(clientCode)).thenThrow(
                new WeChatClient.WeChatAuthException("WeChat auth failed: api freq is limited", 45011));

        WechatLoginException ex = assertThrows(WechatLoginException.class,
                () -> service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null));

        assertEquals(WechatLoginException.ErrorCode.WECHAT_API_ERROR, ex.getErrorCode(),
                "非 40029 的微信错误码属上游服务失败");
        assertEquals(502, ex.getStatus().value(), "上游失败须为可区分的 502，不得是 catch-all 500");
        assertFalse(ex.getMessage().contains(clientCode), "客户端错误消息禁止包含原始 code");
        verifyNoInteractions(thirdPartyAccountRepository, userRepository);
    }

    /* ============================================================
     * 场景 11（I-1）：网络故障（RestClientException 包装，errcode 为 null）
     *                → 可区分的上游服务失败：WECHAT_API_ERROR（502），零写入
     * ============================================================ */
    @Test
    void bindThirdParty_wechatNetworkFailure_shouldMapToUpstreamServiceFailureAndNotWrite() {
        String clientCode = "wx-code-while-wechat-down";
        when(weChatClient.code2Session(clientCode)).thenThrow(
                new WeChatClient.WeChatAuthException(
                        "Network error calling WeChat API: read timed out",
                        new java.net.SocketTimeoutException("read timed out")));

        WechatLoginException ex = assertThrows(WechatLoginException.class,
                () -> service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null));

        assertEquals(WechatLoginException.ErrorCode.WECHAT_API_ERROR, ex.getErrorCode());
        assertEquals(502, ex.getStatus().value());
        assertFalse(ex.getMessage().contains(clientCode));
        verifyNoInteractions(thirdPartyAccountRepository, userRepository);
    }

    /* ============================================================
     * 场景 12（I-1）：熔断打开 / 重试耗尽的降级（code2Session 返回 null）
     *                → 与 RealAuthService 一致视为服务不可用：502，而非"凭据无效"400
     * ============================================================ */
    @Test
    void bindThirdParty_wechatCircuitBreakerFallbackNull_shouldMapToUpstreamOutageAndNotWrite() {
        String clientCode = "wx-code-during-outage";
        when(weChatClient.code2Session(clientCode)).thenReturn(null);

        WechatLoginException ex = assertThrows(WechatLoginException.class,
                () -> service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null));

        assertEquals(WechatLoginException.ErrorCode.WECHAT_API_ERROR, ex.getErrorCode(),
                "null 只会来自熔断/重试降级，属上游不可用，必须与'凭据无效'可区分");
        assertEquals(502, ex.getStatus().value());
        verifyNoInteractions(thirdPartyAccountRepository, userRepository);
    }

    /* ============================================================
     * 场景 13（I-1 补齐缺口）：session 非空但 openid 为空白
     *                        → 仍是凭据无效（400 WECHAT_CREDENTIAL_INVALID），零写入
     * ============================================================ */
    @Test
    void bindThirdParty_wechatSessionWithBlankOpenId_shouldRejectAsInvalidCredentialAndNotWrite() {
        String clientCode = "wx-code-with-blank-openid";
        WeChatClient.WeChatSessionResponse session = new WeChatClient.WeChatSessionResponse();
        session.setOpenid("   ");
        session.setUnionid("should-not-be-persisted");
        when(weChatClient.code2Session(clientCode)).thenReturn(session);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null));
        assertEquals(ErrorMessages.WECHAT_CREDENTIAL_INVALID, ex.getMessage());

        verify(thirdPartyAccountRepository, never()).save(any());
        verifyNoInteractions(thirdPartyAccountRepository, userRepository);
    }

    /* ============================================================
     * 场景 14（I-2）：绑定的公开编排方法不得带 @Transactional
     *               （出站 code2Session / JWKS 验签必须落在数据库事务之外）
     * ============================================================ */
    @Test
    void bindThirdParty_shouldNotBeAnnotatedTransactional_soVerificationStaysOutsideDbTransaction()
            throws NoSuchMethodException {
        Method bind = ThirdPartyAuthService.class.getMethod(
                "bindThirdParty", Long.class, String.class, String.class, String.class);

        assertNull(bind.getDeclaredAnnotation(Transactional.class),
                "bindThirdParty 携带 @Transactional 会把出站供应商调用圈进数据库事务");
        assertNull(bind.getAnnotation(Transactional.class),
                "方法级（含继承）@Transactional 会让代理在 code2Session 之前开启事务");
        assertNull(ThirdPartyAuthService.class.getDeclaredAnnotation(Transactional.class),
                "类级 @Transactional 同样会让 bindThirdParty 落入事务");

        // 正向对照（防止断言空转）：纯 DB 操作方法仍应保留 @Transactional
        Method unbind = ThirdPartyAuthService.class.getMethod(
                "unbindThirdParty", Long.class, String.class);
        assertNotNull(unbind.getDeclaredAnnotation(Transactional.class),
                "对照基准：unbindThirdParty 仅做 DB 操作，必须仍带 @Transactional");
    }

    /* ============================================================
     * 场景 15（I-2）：经事务感知 AOP 代理调用时，供应商异常
     *               既不得开启数据库事务，也不得被数据库事务重试
     * ============================================================ */
    @Test
    void bindThirdParty_throughTxAwareProxy_providerFailureOpensNoDbTransactionAndIsNotRetried() {
        PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
        doReturn(mock(TransactionStatus.class)).when(txManager).getTransaction(any(TransactionDefinition.class));

        TransactionInterceptor interceptor =
                new TransactionInterceptor(txManager, new AnnotationTransactionAttributeSource());
        ProxyFactory proxyFactory = new ProxyFactory(service);
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAdvice(interceptor);
        ThirdPartyAuthService proxied = (ThirdPartyAuthService) proxyFactory.getProxy();

        String clientCode = "wx-code-fails-through-proxy";
        when(weChatClient.code2Session(clientCode)).thenThrow(
                new WeChatClient.WeChatAuthException(
                        "Network error calling WeChat API: connection reset",
                        new java.io.IOException("connection reset")));

        Throwable thrown = null;
        try {
            proxied.bindThirdParty(7L, ThirdPartyAuthService.PROVIDER_WECHAT, clientCode, null);
        } catch (Throwable ex) {
            thrown = ex;
        }

        assertNotNull(thrown, "供应商失败必须拒绝绑定");
        // 事务边界断言优先：验证阶段整个过程中事务管理器一次都没被调用
        verifyNoInteractions(thirdPartyAccountRepository, userRepository);
        verify(weChatClient, times(1)).code2Session(clientCode);
        verify(txManager, never()).getTransaction(any(TransactionDefinition.class));
        verify(txManager, never()).commit(any(TransactionStatus.class));
        verify(txManager, never()).rollback(any(TransactionStatus.class));

        // I-1：映射为可区分的上游失败（502），而不是 catch-all 500
        assertInstanceOf(WechatLoginException.class, thrown);
        assertEquals(WechatLoginException.ErrorCode.WECHAT_API_ERROR,
                ((WechatLoginException) thrown).getErrorCode());
    }

    /** SHA-256 hex（小写），与服务端 hashIdentifier 算法保持一致，用于断言落库的派生哈希。 */
    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
