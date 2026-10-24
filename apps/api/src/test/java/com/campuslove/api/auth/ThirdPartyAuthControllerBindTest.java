package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.testdata.ControllerTestBase;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

/**
 * 第三方绑定控制器契约测试（P0-1 安全加固）。
 *
 * <p>验证 {@code POST /api/v1/auth/third-party/bind} 的对外契约不再允许客户端伪造第三方身份：</p>
 * <ul>
 *   <li>控制器只把一次性凭据（微信 code / Apple identityToken）透传给服务端做验证派生，
 *       绝不接收/透传原始 openId/unionId。</li>
 *   <li>请求 DTO 的字段集合已移除 openId/unionId（旧契约字段不复存在）。</li>
 *   <li>携带旧字段 openId/unionId 的请求体反序列化后被忽略，code/identityToken 为空，
 *       即客户端无法借旧字段选定被绑定的身份。</li>
 *   <li>provider 非法在调用服务前即被拒绝（既有行为保留）。</li>
 * </ul>
 *
 * <p>与 {@link AccountSecurityControllerTest} 一致：纯 Mockito + {@link ControllerTestBase}，
 * 不加载 Spring 上下文。</p>
 */
class ThirdPartyAuthControllerBindTest extends ControllerTestBase {

    @Mock private ThirdPartyAuthService thirdPartyAuthService;

    private ThirdPartyAuthController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ThirdPartyAuthController(thirdPartyAuthService);
    }

    @Test
    void bind_wechat_shouldForwardCodeAndNullTokenToService() {
        when(thirdPartyAuthService.bindThirdParty(anyLong(), anyString(), anyString(), isNull()))
                .thenReturn(true);

        Map<String, Boolean> response = withUserIdReturning(100L,
                () -> controller.bindThirdParty(new BindThirdPartyRequest("WECHAT", "wx-code", null)));

        assertTrue(response.get("success"));
        // 服务收到的是 code（第 3 参），且没有原始 openId 被传入
        verify(thirdPartyAuthService).bindThirdParty(100L, "WECHAT", "wx-code", null);
    }

    @Test
    void bind_apple_shouldForwardIdentityTokenToService() {
        when(thirdPartyAuthService.bindThirdParty(anyLong(), anyString(), isNull(), anyString()))
                .thenReturn(true);

        Map<String, Boolean> response = withUserIdReturning(100L,
                () -> controller.bindThirdParty(new BindThirdPartyRequest("APPLE", null, "apple-token")));

        assertTrue(response.get("success"));
        verify(thirdPartyAuthService).bindThirdParty(100L, "APPLE", null, "apple-token");
    }

    @Test
    void bind_unknownProvider_shouldRejectBeforeCallingService() {
        assertThrows(HttpClientErrorException.class, () -> withUserId(100L,
                () -> controller.bindThirdParty(new BindThirdPartyRequest("GOOGLE", "whatever", "whatever"))));
        verify(thirdPartyAuthService, never())
                .bindThirdParty(anyLong(), anyString(), any(), any());
    }

    @Test
    void bindRequest_shouldNoLongerExposeRawOpenIdOrUnionIdFields() {
        List<String> components = Arrays.stream(BindThirdPartyRequest.class.getRecordComponents())
                .map(RecordComponent::getName)
                .toList();
        assertTrue(components.contains("provider"), "provider 字段应保留");
        assertTrue(components.contains("code"), "新增 code 凭据字段");
        assertTrue(components.contains("identityToken"), "新增 identityToken 凭据字段");
        assertFalse(components.contains("openId"), "旧 openId 字段必须移除");
        assertFalse(components.contains("unionId"), "旧 unionId 字段必须移除");
    }

    @Test
    void bindRequest_legacyRawOpenIdBody_shouldBeIgnoredLeavingCredentialsNull() throws Exception {
        // 模拟仍在使用旧契约的客户端：只发送 provider/openId/unionId，不发送 code/identityToken。
        // Spring Boot 默认关闭 FAIL_ON_UNKNOWN_PROPERTIES，这里保持一致。
        ObjectMapper mapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        String legacyBody = "{\"provider\":\"WECHAT\",\"openId\":\"victim-openid\",\"unionId\":\"victim-union\"}";

        BindThirdPartyRequest request = mapper.readValue(legacyBody, BindThirdPartyRequest.class);

        assertEquals("WECHAT", request.provider());
        // 旧字段被忽略，无法作为被绑定身份传入 → 服务端不会拿到任何可用凭据 → 拒绝绑定
        assertNull(request.code(), "旧 openId 不应被映射到 code");
        assertNull(request.identityToken(), "旧请求体不含 identityToken 时应为 null");
    }

    /**
     * 在注入当前用户 ID 的上下文中执行并返回结果（{@link ControllerTestBase#withUserId} 仅支持 void）。
     */
    private <T> T withUserIdReturning(Long userId, java.util.function.Supplier<T> body) {
        final T[] holder = (T[]) new Object[1];
        withUserId(userId, () -> holder[0] = body.get());
        return holder[0];
    }
}
