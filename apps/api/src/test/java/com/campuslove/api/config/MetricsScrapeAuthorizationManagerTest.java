package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.function.Supplier;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

/**
 * {@link MetricsScrapeAuthorizationManager} 单元测试。
 *
 * <p>它守住的是"监控链路是否真的通"与"指标端点是否被公开"这两件事的交界处：
 * 白名单为空时必须仍然拒绝（否则忘记配置＝意外公开指标），
 * 而判定依据只能是 {@code getRemoteAddr()}——一旦实现改成读 X-Forwarded-For，
 * 下面的伪造用例就会变红。</p>
 */
@DisplayName("指标抓取白名单 - MetricsScrapeAuthorizationManager")
class MetricsScrapeAuthorizationManagerTest {

    private static final Supplier<Authentication> ANONYMOUS = () -> null;

    private static AuthorizationDecision decide(MetricsScrapeAuthorizationManager manager, String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/prometheus");
        request.setRemoteAddr(remoteAddr);
        return manager.check(ANONYMOUS, new RequestAuthorizationContext(request));
    }

    private static boolean allows(MetricsScrapeAuthorizationManager manager, String remoteAddr) {
        return decide(manager, remoteAddr).isGranted();
    }

    @Test
    @DisplayName("白名单为空时一律拒绝（fail-closed，不会因漏配而公开指标）")
    void emptyAllowlistDeniesEverything() {
        MetricsScrapeAuthorizationManager manager = new MetricsScrapeAuthorizationManager("");
        assertTrue(manager.hasNoAllowlist());
        assertFalse(allows(manager, "172.20.3.4"), "容器网段也不能在白名单为空时通过");
        assertFalse(allows(manager, "127.0.0.1"));
        assertFalse(allows(manager, "8.8.8.8"));

        assertTrue(new MetricsScrapeAuthorizationManager(null).hasNoAllowlist(), "null 等同于未配置");
    }

    @Test
    @DisplayName("CIDR 命中放行、不命中拒绝")
    void cidrMatchControlsAccess() {
        MetricsScrapeAuthorizationManager manager =
                new MetricsScrapeAuthorizationManager("172.16.0.0/12,10.0.0.0/8");
        assertTrue(allows(manager, "172.20.3.4"));
        assertTrue(allows(manager, "10.1.2.3"));
        assertFalse(allows(manager, "192.168.1.7"), "未在列表中的私网段同样要拒绝");
        assertFalse(allows(manager, "8.8.8.8"));
    }

    @Test
    @DisplayName("X-Forwarded-For 不得成为判定依据（客户端可伪造）")
    void ignoresSpoofedForwardedHeaders() {
        MetricsScrapeAuthorizationManager manager = new MetricsScrapeAuthorizationManager("172.16.0.0/12");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/prometheus");
        request.setRemoteAddr("8.8.8.8");
        request.addHeader("X-Forwarded-For", "172.20.0.5");
        request.addHeader("X-Real-IP", "172.20.0.6");

        AuthorizationDecision decision =
                manager.check(ANONYMOUS, new RequestAuthorizationContext(request));

        assertFalse(decision.isGranted(), "带伪造头的公网来源必须被拒");
    }

    @Test
    @DisplayName("支持逗号与换行混排；解析条数必须对得上（防正则/切分静默失效）")
    void parsesMixedSeparators() {
        MetricsScrapeAuthorizationManager manager =
                new MetricsScrapeAuthorizationManager("10.0.0.0/8, 172.16.0.0/12\n192.168.7.0/24");
        assertTrue(allows(manager, "10.9.9.9"));
        assertTrue(allows(manager, "172.31.0.1"));
        assertTrue(allows(manager, "192.168.7.15"));
        assertFalse(allows(manager, "172.32.0.1"), "超出 /12 边界即不命中，说明网段没被解析错");
    }

    @Test
    @DisplayName("单一 IP 精确匹配")
    void supportsBareIp() {
        MetricsScrapeAuthorizationManager manager = new MetricsScrapeAuthorizationManager("172.17.0.8");
        assertTrue(allows(manager, "172.17.0.8"));
        assertFalse(allows(manager, "172.17.0.9"));
    }

    @Test
    @DisplayName("非法 CIDR 构造期即抛错（宁可启动失败，也不留「以为配好了」）")
    void rejectsInvalidCidrAtConstruction() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new MetricsScrapeAuthorizationManager("172.16.0.0/99"));
        assertFalse(ex.getMessage() == null || ex.getMessage().isBlank());
    }

    @Test
    @DisplayName("被拒时返回的是 deny 决策而不是抛异常（由 Spring Security 统一出 403）")
    void deniesViaDecisionNotException() {
        MetricsScrapeAuthorizationManager manager = new MetricsScrapeAuthorizationManager("10.0.0.0/8");
        AuthorizationDecision decision = decide(manager, "203.0.113.9");
        assertEquals(false, decision.isGranted());
    }
}
