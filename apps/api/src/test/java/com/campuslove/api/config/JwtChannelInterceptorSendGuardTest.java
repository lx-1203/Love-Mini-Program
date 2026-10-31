package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.security.Principal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.core.env.Environment;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * STOMP SEND / MESSAGE 目的地授权测试（P2，2026-10-31）。
 *
 * <p><b>缺陷基线（修复前）</b>：{@code JwtChannelInterceptor} 只授权 CONNECT 与 SUBSCRIBE，
 * {@code switch} 的 {@code default -> { }} 对 SEND 完全放行；而 {@code WebSocketConfig} 注册了
 * {@code enableSimpleBroker("/topic","/queue")}，SUBSCRIBE 又把 {@code /topic/**} 放开给所有
 * 认证用户。简单代理不区分「订阅」与「发送」，于是任何认证用户都能
 * {@code SEND destination=/topic/anything} 直接往广播命名空间注入内容——绕开所有
 * {@code @MessageMapping} 里的关系校验、内容安全校验与限流。当前 API 没有任何 {@code /topic}
 * 发送方（服务端全部走 {@code /user/**} 与 {@code /queue}），故影响面是<b>潜在</b>的。</p>
 *
 * <p><b>修复后契约</b>：客户端 SEND/MESSAGE 的目标必须落在应用前缀（缺省 {@code /app}）之下，
 * 否则拒绝并记 warn；CONNECT / SUBSCRIBE 的既有口径一条不动（本测试含正控）。
 * 消息构造方式与 {@code JwtChannelInterceptorTest} 保持一致
 * （{@code StompHeaderAccessor.create(...)} + {@code setLeaveMutable(true)}）。</p>
 */
@DisplayName("JwtChannelInterceptor - SEND/MESSAGE 只能落应用前缀")
class JwtChannelInterceptorSendGuardTest {

    private static final String USER_ID = "user-123";

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private MessageChannel messageChannel;

    private JwtChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
        interceptor = new JwtChannelInterceptor(jwtTokenProvider, environment);
        // 注意：这里不注入 applicationDestinationPrefixes（保持 null），
        // 于是每条断言同时钉住「未经 Spring 注入时回落缺省 /app」的 fail-closed 口径。
    }

    /* ===================== 一、代理命名空间不得被客户端写 ===================== */

    @Test
    @DisplayName("SEND 到 /topic/** 被拒绝（广播命名空间对客户端只读）")
    void sendToTopicBroadcastIsRejected() {
        MessageDeliveryException ex = assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, "/topic/announcements", true),
                        messageChannel),
                "客户端不得向 /topic 注入内容");
        assertTrue(ex.getMessage().contains("/topic/announcements"),
                "异常应指明被拒目标，实际: " + ex.getMessage());
    }

    @Test
    @DisplayName("SEND 到 /queue/** 被拒绝（点对点前缀同样只允许服务端写）")
    void sendToQueueIsRejected() {
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, "/queue/messages", true),
                        messageChannel));
    }

    @Test
    @DisplayName("SEND 到 /user/** 被拒绝（用户目的地由服务端解析，客户端不能自行投递）")
    void sendToUserDestinationIsRejected() {
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(
                        sendMessage(StompCommand.SEND, "/user/" + USER_ID + "/queue/messages", true),
                        messageChannel));
    }

    @Test
    @DisplayName("未认证的 SEND 到 /topic/** 同样被拒绝（先按目的地收口，不给匿名开口子）")
    void unauthenticatedSendToTopicIsRejected() {
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, "/topic/anything", false),
                        messageChannel));
    }

    @Test
    @DisplayName("客户端伪造的 MESSAGE 帧发到 /topic/** 也被拒绝（SEND 与 MESSAGE 同规则）")
    void messageFrameToTopicIsRejected() {
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.MESSAGE, "/topic/push", true),
                        messageChannel));
    }

    @Test
    @DisplayName("缺目标 / 空白目标的 SEND 被拒绝（无法证明它落在应用前缀内）")
    void sendWithoutDestinationIsRejected() {
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, null, true), messageChannel));
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, "   ", true), messageChannel));
    }

    @Test
    @DisplayName("前缀按路径段匹配：/application/** 不被 /app 顺带放行")
    void siblingPrefixIsNotMistakenForAppPrefix() {
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, "/application/evil", true),
                        messageChannel),
                "/app 前缀不得放行 /application 这样的兄弟命名空间");
    }

    /* ===================== 二、应用前缀仍然放行（不削弱既有链路） ===================== */

    @Test
    @DisplayName("SEND 到 /app/chat/send 正常放行（既有 @MessageMapping 路径不受影响）")
    void sendToApplicationPrefixIsAllowed() {
        Message<?> result = assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.SEND, "/app/chat/send", true), messageChannel));
        assertNotNull(result, "放行的消息应原样返回");
    }

    @Test
    @DisplayName("SEND 到 /app/chat/typing 正常放行（第二个既有映射点）")
    void sendTypingToApplicationPrefixIsAllowed() {
        assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.SEND, "/app/chat/typing", true), messageChannel));
    }

    @Test
    @DisplayName("SEND 到 /app 本身放行，但 /appx 不放行（同上：段边界）")
    void bareApplicationPrefixIsAllowed() {
        assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.SEND, "/app", true), messageChannel));
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, "/appx/chat/send", true),
                        messageChannel));
    }

    @Test
    @DisplayName("配置了额外应用前缀时一并放行，代理命名空间仍然拒绝")
    void configuredPrefixesAreHonoured() {
        ReflectionTestUtils.setField(interceptor, "applicationDestinationPrefixes",
                List.of("/app", "/rpc", "ws/notify"));

        assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.SEND, "/rpc/ping", true), messageChannel));
        assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.SEND, "/ws/notify/ping", true), messageChannel),
                "缺前导斜杠的配置应被归一为 /ws/notify");
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, "/topic/anything", true),
                        messageChannel));
    }

    @Test
    @DisplayName("配置为空/全非法时回落缺省 /app，绝不放开全部目标（fail-closed）")
    void emptyConfigurationFallsBackToDefaultPrefix() {
        ReflectionTestUtils.setField(interceptor, "applicationDestinationPrefixes", List.of("  ", "/"));

        assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.SEND, "/app/chat/send", true), messageChannel));
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(sendMessage(StompCommand.SEND, "/topic/anything", true),
                        messageChannel));
    }

    /* ===================== 三、正控：CONNECT / SUBSCRIBE 口径一条没动 ===================== */

    @Test
    @DisplayName("SUBSCRIBE /topic/** 仍然允许（广播只读语义未改）")
    void subscribeToTopicStillAllowed() {
        Message<?> message = sendMessage(StompCommand.SUBSCRIBE, "/topic/announcements", true);
        assertDoesNotThrow(() -> interceptor.preSend(message, messageChannel));
    }

    @Test
    @DisplayName("SUBSCRIBE 自己的 /user/queue/** 仍然允许")
    void subscribeOwnQueueStillAllowed() {
        Message<?> message = sendMessage(StompCommand.SUBSCRIBE, "/user/" + USER_ID + "/queue/messages", true);
        assertDoesNotThrow(() -> interceptor.preSend(message, messageChannel));
    }

    @Test
    @DisplayName("SUBSCRIBE 未认证仍然被拒绝")
    void subscribeWithoutAuthenticationStillRejected() {
        Message<?> message = sendMessage(StompCommand.SUBSCRIBE, "/topic/announcements", false);
        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    @DisplayName("DISCONNECT / ACK 等无目标语义的控制帧仍然直接放行")
    void controlFramesStillPassThrough() {
        assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.DISCONNECT, null, true), messageChannel));
        assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.ACK, null, true), messageChannel));
        assertDoesNotThrow(() -> interceptor.preSend(
                sendMessage(StompCommand.NACK, null, true), messageChannel));
    }

    /* ===================== 辅助 ===================== */

    /**
     * 构造一条可变的 STOMP 帧消息（与既有 WS 测试同一模式）。
     *
     * @param command     STOMP 命令
     * @param destination 目标地址（可为 null，用于「无目标」用例）
     * @param withUser    是否已认证（模拟 CONNECT 成功后的 Principal）
     */
    private static Message<byte[]> sendMessage(StompCommand command, String destination, boolean withUser) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setSessionId("send-guard-session");
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (withUser) {
            accessor.setUser((Principal) () -> USER_ID);
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
