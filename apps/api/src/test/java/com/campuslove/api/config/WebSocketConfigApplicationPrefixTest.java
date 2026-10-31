package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.eq;

import java.lang.reflect.Field;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * WebSocketConfig 的应用前缀注册测试（P2 SEND 收口的配套约束，2026-10-31）。
 *
 * <p>{@link JwtChannelInterceptor} 现在按「目标必须落在应用前缀内」来放行客户端 SEND。
 * 这条授权口径只有在与 {@code setApplicationDestinationPrefixes} 注册的前缀<b>同源</b>时
 * 才成立：否则改一处配置就会让路由与授权分叉——消息要么发不进去，要么白名单形同虚设。
 * 本测试钉两件事：</p>
 * <ol>
 *   <li>注册到 broker 的应用前缀就是缺省 {@code /app}（{@code /topic}、{@code /queue}
 *       仍是代理前缀，{@code /user} 仍是用户目的地前缀——既有路由一条没动）；</li>
 *   <li>两处读取的是<b>同一个配置键、同一份缺省值</b>（直接比对 {@code @Value} 注解文本），
 *       并且前缀会被归一（补前导斜杠、丢空白项、空配置回落缺省）。</li>
 * </ol>
 */
@DisplayName("WebSocketConfig - 应用前缀与 SEND 白名单同源，注册口径不变")
class WebSocketConfigApplicationPrefixTest {

    private final WebSocketConfig config = new WebSocketConfig();

    @Test
    @DisplayName("缺省（未注入配置）注册 /app 为应用前缀，代理前缀与用户前缀保持不变")
    void registersDefaultApplicationPrefix() {
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

        config.configureMessageBroker(registry);

        verify(registry).enableSimpleBroker("/topic", "/queue");
        verify(registry).setApplicationDestinationPrefixes(eq("/app"));
        verify(registry).setUserDestinationPrefix("/user");
    }

    @Test
    @DisplayName("配置了多个前缀时逐一注册，缺前导斜杠的写法被归一")
    void registersConfiguredPrefixesWithNormalization() {
        setProperty(List.of("/app", "rpc", "  ", "/ws/"));
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

        config.configureMessageBroker(registry);

        verify(registry).setApplicationDestinationPrefixes(eq("/app"), eq("/rpc"), eq("/ws"));
    }

    @Test
    @DisplayName("配置为空或全非法时回落 /app，绝不把应用前缀注册成空（fail-closed）")
    void emptyConfigurationFallsBackToDefault() {
        setProperty(List.of());
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

        config.configureMessageBroker(registry);

        verify(registry).setApplicationDestinationPrefixes(eq("/app"));

        setProperty(List.of("   ", "/"));
        MessageBrokerRegistry second = mock(MessageBrokerRegistry.class);
        config.configureMessageBroker(second);
        verify(second).setApplicationDestinationPrefixes(eq("/app"));
    }

    @Test
    @DisplayName("路由注册与 SEND 白名单读同一个配置键（防两处各写一套前缀）")
    void brokerAndInterceptorReadTheSameProperty() throws Exception {
        String fromConfig = valueAnnotationOf(WebSocketConfig.class, "rawApplicationDestinationPrefixes");
        String fromInterceptor = valueAnnotationOf(JwtChannelInterceptor.class, "applicationDestinationPrefixes");

        assertTrue(fromConfig.contains(JwtChannelInterceptor.APP_DESTINATION_PREFIXES_PROPERTY),
                "WebSocketConfig 应读共享配置键，实际: " + fromConfig);
        assertTrue(fromInterceptor.contains(JwtChannelInterceptor.APP_DESTINATION_PREFIXES_PROPERTY),
                "JwtChannelInterceptor 应读同一个共享配置键，实际: " + fromInterceptor);
        assertEquals(fromConfig, fromInterceptor,
                "两处的占位符表达式必须逐字一致（同键 + 同缺省），否则改前缀会让路由与授权分叉");
        assertEquals("/app", JwtChannelInterceptor.DEFAULT_APP_DESTINATION_PREFIX,
                "缺省前缀沿用历史口径，客户端与既有 @MessageMapping 不受影响");
    }

    private void setProperty(List<String> prefixes) {
        ReflectionTestUtils.setField(config, "rawApplicationDestinationPrefixes", prefixes);
    }

    private static String valueAnnotationOf(Class<?> owner, String fieldName) {
        try {
            Field field = owner.getDeclaredField(fieldName);
            Value annotation = field.getAnnotation(Value.class);
            assertTrue(annotation != null, owner.getSimpleName() + "." + fieldName + " 应有 @Value 注解读取配置");
            return annotation.value();
        } catch (NoSuchFieldException e) {
            throw new AssertionError("字段应存在以便共享配置键: " + owner.getName() + "#" + fieldName, e);
        }
    }
}
