package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * 短信网关开关打开但真实 provider 未接入时，sendCode 必须 fail-closed：
 * 不得把验证码写进 Redis/内存，更不得向客户端声称“已发送”。
 */
class SmsCodeServiceGatewayTest {

    @SuppressWarnings("unchecked")
    private static SmsCodeService newRealService(boolean gatewayEnabled) {
        ObjectProvider<StringRedisTemplate> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("real");
        SmsCodeService service = new SmsCodeService(provider, environment);
        ReflectionTestUtils.setField(service, "gatewayEnabled", gatewayEnabled);
        ReflectionTestUtils.setField(service, "expireSeconds", 300L);
        ReflectionTestUtils.setField(service, "mockCode", "123456");
        return service;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> memoryStore(SmsCodeService service) {
        return (Map<String, String>) ReflectionTestUtils.getField(service, "memoryStore");
    }

    @Test
    @DisplayName("gateway-enabled=true 但 provider 未接入：503 且不落任何验证码")
    void enabledButProviderMissing_shouldFailClosedWithoutStoringCode() {
        SmsCodeService service = newRealService(true);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.sendCode("13800000001"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        assertTrue(memoryStore(service).isEmpty(),
                "真实网关未接入时不得先落验证码再返回成功；否则用户会看到“已发送”却永远收不到");
    }

    @Test
    @DisplayName("gateway-enabled=false：仍保持既有 503 配置缺失错误")
    void disabled_shouldRemainUnavailable() {
        SmsCodeService service = newRealService(false);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.sendCode("13800000002"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        assertTrue(memoryStore(service).isEmpty());
    }
}
