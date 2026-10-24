package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.entity.ThirdPartyAccount;
import com.campuslove.api.repository.ThirdPartyAccountRepository;
import com.campuslove.api.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

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
     * 场景 2：伪造 openId（当作 code 传入，无法被 code2session 换取）→ 拒绝且零写入
     * ============================================================ */
    @Test
    void bindThirdParty_forgedOpenIdThatCode2SessionRejects_shouldNotWriteDb() {
        // Arrange：攻击者把"想绑定的他人 openId"塞进 code 字段，但 code2session 无法换取（返回 null）
        String forgedOpenId = "victim-openid-attacker-wants";
        when(weChatClient.code2Session(forgedOpenId)).thenReturn(null);

        // Act & Assert：应因凭据不可验证被拒绝
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.bindThirdParty(8L, ThirdPartyAuthService.PROVIDER_WECHAT, forgedOpenId, null));
        assertEquals(ErrorMessages.WECHAT_CREDENTIAL_INVALID, ex.getMessage());

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
