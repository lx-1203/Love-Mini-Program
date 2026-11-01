package com.campuslove.api.admin.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.admin.AdminConversationController;
import com.campuslove.api.admin.AdminPageView;
import com.campuslove.api.admin.AdminRealNameController;
import com.campuslove.api.admin.AdminWhisperController;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.entity.AuditLog;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * W1b-2 运行期判点：审计切面对 GET 到底记不记得下「读了谁、读了多少」。
 *
 * <p><b>先回答「{@link Auditable} 能不能作用于 GET」这个问题</b>：能。切点是
 * {@code @Around("@annotation(auditable)")}，只按「方法上有注解」匹配，与 HTTP 方法无关。
 * 所以这条发现的真实缺口不在切面拦不住，而在<b>拦到之后记不下</b>：改造前该切面的四个维度里，
 * {@code targetId} 只从 {@code @PathVariable} 取、{@code requestBody} 只从 {@code @RequestBody} 取，
 * 而读端点的选择器在 query 参数里、结果规模在返回值里 —— 两处都不在视野内。
 * 直接给敏感 GET 挂一个空注解，落库的只是「某管理员某时到过这个 URL」。
 * 本类就是用来证「我没有硬挂一个空注解」：断言 GET 那一行必须带上
 * 读选择器（query 快照）与读出规模（returned/total）两条新维度。</p>
 *
 * <p><b>四条判点</b>：</p>
 * <ol>
 *   <li>GET 一行必须记全：操作码 / 操作者 / GET 方法 / URI / 状态码 / query 快照 / returned+total；</li>
 *   <li>query 里命中敏感键（phone 等）必须与请求体同一张掩码表，不能因为换了载体就放宽；</li>
 *   <li>读失败也必须落这一行，且规模记成 {@code null}（不可判定）而不是 0 条 ——
 *       「读到空集」与「这次没读成」在审计库里必须是两个值；</li>
 *   <li>写请求口径逐字节不变：仍走 {@code @RequestBody} 序列化，不得被塞进读快照。</li>
 * </ol>
 *
 * <p>另外把「三个最敏感的管理端 GET 确实挂了注解」用反射钉一遍（改造前实测审计计数 0/0/0）。</p>
 */
@DisplayName("W1b-2 审计切面：敏感 GET 的留痕维度")
class AuditAspectReadDimensionTest {

    private com.campuslove.api.admin.AdminAuditLogService auditLogService;
    private UserRepository userRepository;
    private AuditLogAspect aspect;

    @BeforeEach
    void setUp() {
        auditLogService = mock(com.campuslove.api.admin.AdminAuditLogService.class);
        userRepository = mock(UserRepository.class);
        User admin = new User();
        admin.setId(1L);
        admin.setNickname("运营甲");
        admin.setRole("ADMIN");
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        aspect = new AuditLogAspect(auditLogService, userRepository, new ObjectMapper(), "");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, "n/a", List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    /** 造一个 GET 请求上下文，并把 query 参数交给切面去摘。 */
    private void bindRequest(String method, String uri, Map<String, String[]> params) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn(method);
        when(request.getRequestURI()).thenReturn(uri);
        when(request.getParameterMap()).thenReturn(params);
        when(request.getRemoteAddr()).thenReturn("203.0.113.9");
        when(request.getHeader("User-Agent")).thenReturn("junit-agent");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    /** 用一个真实 Controller 方法的签名与注解来驱动切面（注解必须取自盘上，不是我自造的）。 */
    private Object runAround(Method method, Object[] args, Object returnValue, RuntimeException toThrow)
            throws Throwable {
        ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        when(pjp.getSignature()).thenReturn(signature);
        when(signature.getMethod()).thenReturn(method);
        when(pjp.getArgs()).thenReturn(args);
        if (toThrow != null) {
            when(pjp.proceed()).thenThrow(toThrow);
        } else {
            when(pjp.proceed()).thenReturn(returnValue);
        }
        Auditable auditable = method.getAnnotation(Auditable.class);
        assertNotNull(auditable, method.getName() + " 上没有 @Auditable —— 本判点失去被测物");
        return aspect.audit(pjp, auditable);
    }

    private AuditLog captured() {
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        org.mockito.Mockito.verify(auditLogService).saveAsync(captor.capture());
        return captor.getValue();
    }

    // ==================== 判点 ====================

    @Test
    @DisplayName("悄悄话 GET 过切面：记下操作码、GET、URI、query 快照与读出规模")
    void whisperListGet_recordsQueryAndReadScale() throws Throwable {
        bindRequest("GET", "/api/v1/admin/whispers", Map.of("page", new String[] {"2"},
                "size", new String[] {"50"}));
        Method list = AdminWhisperController.class.getDeclaredMethod("list", int.class, int.class);
        Object payload = org.springframework.http.ResponseEntity.ok(
                new AdminPageView<>(List.of("a", "b"), 137L, 2, 50, 3));

        runAround(list, new Object[] {2, 50}, payload, null);

        AuditLog row = captured();
        assertEquals("VIEW_WHISPER", row.getOperation());
        assertEquals("WHISPER", row.getTargetType());
        assertEquals("GET", row.getRequestMethod());
        assertEquals("/api/v1/admin/whispers", row.getRequestUrl());
        assertEquals(200, row.getResponseStatus().intValue());
        assertEquals(1L, row.getOperatorId());
        assertEquals("运营甲", row.getOperatorUsername());
        assertEquals("ADMIN", row.getOperatorRole());
        assertNull(row.getTargetId(), "列表读口没有 @PathVariable，targetId 必须是空而不是编一个");

        JsonNode snapshot = readSnapshot(row);
        assertEquals("2", snapshot.path("query").path("page").asText());
        assertEquals("50", snapshot.path("query").path("size").asText());
        assertEquals(2, snapshot.path("read").path("returned").asInt(),
                "读审计必须能回答「这次带走了几条」，否则「已审计」只是到了过一下 URL");
        assertEquals(137, snapshot.path("read").path("total").asLong());
    }

    @Test
    @DisplayName("query 里的敏感键与请求体同一张掩码表（换载体不放宽）")
    void sensitiveQueryParamIsMasked() throws Throwable {
        bindRequest("GET", "/api/v1/admin/users", Map.of(
                "phone", new String[] {"13800001111"},
                "idCardNo", new String[] {"120101199001011234"},
                "keyword", new String[] {"张三"}));
        Method list = AdminWhisperController.class.getDeclaredMethod("list", int.class, int.class);
        Object payload = org.springframework.http.ResponseEntity.ok(
                new AdminPageView<>(List.of(), 0L, 1, 20, 1));

        runAround(list, new Object[] {1, 20}, payload, null);

        String body = captured().getRequestBody();
        assertFalse(body.contains("13800001111"), "手机号明文进了审计库：" + body);
        assertFalse(body.contains("120101199001011234"), "证件号明文进了审计库：" + body);
        assertTrue(body.contains("\"phone\":\"***\""), "敏感键必须被掩码而不是被删掉：" + body);
        assertTrue(body.contains("张三"), "非敏感检索词应当保留，否则审计无法定位事件：" + body);
        JsonNode snapshot = readSnapshot(captured());
        assertEquals(0, snapshot.path("read").path("returned").asInt(),
                "确实读到空集时必须记 0，与「规模不可判定」的 null 区分开");
    }

    @Test
    @DisplayName("读失败也必须落这一行，且规模记成 null（不可判定≠读到 0 条）")
    void failedReadIsStillAudited_withUnknownScale() throws Throwable {
        bindRequest("DELETE", "/api/v1/admin/whispers/9", Map.of());
        Method delete = AdminWhisperController.class
                .getDeclaredMethod("delete", Long.class);
        Auditable auditable = delete.getAnnotation(Auditable.class);
        assertNotNull(auditable);

        ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        when(pjp.getSignature()).thenReturn(signature);
        when(signature.getMethod()).thenReturn(delete);
        when(pjp.getArgs()).thenReturn(new Object[] {9L});
        when(pjp.proceed()).thenThrow(new OperationForbiddenException("越权"));

        assertThrows(OperationForbiddenException.class, () -> aspect.audit(pjp, auditable));

        AuditLog row = captured();
        assertEquals("DELETE_WHISPER", row.getOperation());
        assertEquals("9", row.getTargetId(), "@PathVariable 维度照旧生效");
        assertNotNull(row.getErrorMessage(), "失败也必须留痕，否则「翻了多少次被拒」无从统计");
        assertEquals(403, row.getResponseStatus().intValue(),
                "状态码必须与 GlobalExceptionHandler 同一张映射表");
        assertNull(row.getRequestBody(), "非读方法（DELETE）不得被塞进读范围快照");
    }

    @Test
    @DisplayName("写请求口径逐字节不变：仍走 @RequestBody 序列化，不含读快照键")
    void writeRequestKeepsItsExistingShape() throws Throwable {
        bindRequest("POST", "/api/v1/admin/real-name-certifications/7/review", Map.of());
        // 按名字取盘上真实方法（其 @RequestBody 形参类型是包私有 record，跨包不可见，
        // 但切面只按注解取参数并序列化，传一个同形状的本地 record 即可驱动同一条代码路径）
        Method actual = java.util.Arrays.stream(AdminRealNameController.class.getDeclaredMethods())
                .filter(m -> m.getName().equals("reviewCertification"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("reviewCertification 已不在盘上"));
        record Body(String status, String comment, String phone) {}
        Object payload = org.springframework.http.ResponseEntity.ok(Map.of("ok", true));

        runAround(actual, new Object[] {7L, new Body("APPROVED", "材料齐全", "13800002222")},
                payload, null);

        AuditLog row = captured();
        assertEquals("POST", row.getRequestMethod());
        assertEquals("7", row.getTargetId());
        String body = row.getRequestBody();
        assertNotNull(body, "写请求的 @RequestBody 口径不能被读快照顶掉");
        assertFalse(body.contains("13800002222"), "请求体里的手机号仍须掩码：" + body);
        assertFalse(body.contains("\"read\""), "写请求不该出现读规模维度：" + body);
        assertFalse(body.contains("\"query\""), "写请求不该出现读选择器维度：" + body);
        assertTrue(body.contains("APPROVED"));
    }

    @Test
    @DisplayName("三个最敏感的后台读 GET 都挂了 @Auditable（改造前实测计数 0/0/0）")
    void sensitiveReadsAreAnnotated() throws Exception {
        Map<Method, String> expected = Map.of(
                AdminWhisperController.class.getDeclaredMethod("list", int.class, int.class),
                "VIEW_WHISPER",
                AdminConversationController.class.getDeclaredMethod("listConversations", int.class, int.class),
                "VIEW_CONVERSATION",
                AdminConversationController.class.getDeclaredMethod("getConversation", Long.class),
                "VIEW_CONVERSATION",
                AdminConversationController.class.getDeclaredMethod("listMessages", Long.class, int.class, int.class),
                "VIEW_CONVERSATION",
                AdminRealNameController.class.getDeclaredMethod(
                        "listCertifications", String.class, int.class, int.class),
                "VIEW_REAL_NAME_CERTIFICATION");
        expected.forEach((method, operation) -> {
            Auditable auditable = method.getAnnotation(Auditable.class);
            assertNotNull(auditable, method.getDeclaringClass().getSimpleName() + "#"
                    + method.getName() + " 是返回 PII 的管理端读口，必须留痕");
            assertEquals(operation, auditable.value().name());
            assertFalse(auditable.targetType().isBlank(), "敏感读口必须写明目标类型，否则审计库无法按对象筛选");
        });
    }

    @Test
    @DisplayName("非分页信封的读口（实名列表返回 List）也能记出规模")
    void plainListResultRecordsScale() throws Throwable {
        bindRequest("GET", "/api/v1/admin/real-name-certifications",
                Map.of("status", new String[] {"PENDING"}));
        Method list = AdminRealNameController.class.getDeclaredMethod(
                "listCertifications", String.class, int.class, int.class);
        Object payload = org.springframework.http.ResponseEntity.ok(List.of("v1", "v2", "v3"));

        runAround(list, new Object[] {"PENDING", 0, 20}, payload, null);

        JsonNode snapshot = readSnapshot(captured());
        assertEquals("PENDING", snapshot.path("query").path("status").asText());
        assertEquals(3, snapshot.path("read").path("returned").asInt());
        assertEquals(3, snapshot.path("read").path("total").asLong(),
                "无分页信封时总数即本次带走条数，不假装知道全库规模");
    }

    @Test
    @DisplayName("Page 返回值也能记出规模（分页元素不是正文物列，但规模仍要记）")
    void springPageResultRecordsScale() throws Throwable {
        bindRequest("GET", "/api/v1/admin/whispers", Map.of());
        Method list = AdminWhisperController.class.getDeclaredMethod("list", int.class, int.class);
        Object payload = new PageImpl<>(List.of("a", "b", "c"),
                org.springframework.data.domain.PageRequest.of(0, 3), 999);

        runAround(list, new Object[] {1, 3}, payload, null);

        JsonNode snapshot = readSnapshot(captured());
        assertEquals(3, snapshot.path("read").path("returned").asInt());
        assertEquals(999, snapshot.path("read").path("total").asLong());
    }

    @Test
    @DisplayName("形态不认识或异常返回：规模记 null，不留缺项也不谎报 0")
    void unrecognizedResultIsExplicitlyUnknown() throws Throwable {
        bindRequest("GET", "/api/v1/admin/whispers", Map.of());
        Method list = AdminWhisperController.class.getDeclaredMethod("list", int.class, int.class);
        Object payload = org.springframework.http.ResponseEntity.ok(Map.of("anything", 1));

        runAround(list, new Object[] {1, 20}, payload, null);

        JsonNode snapshot = readSnapshot(captured());
        assertTrue(snapshot.path("read").path("returned").isNull(),
                "不可判定必须是 null（与 0 条区分），否则审计读数会把「取不到」洗成「没有」");
        assertTrue(snapshot.path("read").path("total").isNull());
    }

    /**
     * 取这一行审计里的读范围快照。缺失时红话必须说「快照没记」，
     * 而不是让 Jackson 抛 {@code argument "content" is null}（那种红读起来像夹具坏了）。
     */
    private JsonNode readSnapshot(AuditLog row) {
        assertNotNull(row.getRequestBody(),
                "这一行审计没有读范围快照 ⇒ 敏感 GET 的留痕退化成「某人某时到过这个 URL」，"
                        + "答不出「读了谁、读了多少」——正是本条要封的「硬挂一个空注解」形态");
        try {
            return new ObjectMapper().readTree(row.getRequestBody());
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new AssertionError("读范围快照不是合法 JSON: " + row.getRequestBody(), e);
        }
    }
}
