package com.campuslove.api.ratelimit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 限流键审计测试（2026-10-31，修 P0 之后补的防线）。
 *
 * <p><b>为什么必须有这扇门</b>：{@code RateLimitAspect} 过去把 servlet 请求以变量名
 * {@code request} 注入 SpEL 上下文，而 {@code MethodBasedEvaluationContext} 本来就把
 * 方法入参按名字绑定 —— 于是凡是"参数恰好叫 request"的端点，{@code #request.xxx()}
 * 解析到的是 {@code HttpServletRequest} 而不是那个 DTO。{@code BillingController#purchase}
 * 的键 {@code ... + ':' + #request.planId()} 就是这样抛 SpelEvaluationException，
 * 被 catch 之后降级成【全站共用一个】"1 次 / 60 秒"的桶（付费路径）：
 * 用户 B 会因为用户 A 刚下过单而被 429。键写错不会让任何单元测试变红，
 * 因为过去没有任何测试按生产同一条路径去求值过这 51 个表达式。</p>
 *
 * <p>本类因此做四件事：</p>
 * <ol>
 *   <li>从 <b>编译产物</b> 里枚举所有 {@code @RateLimit} 方法（不靠手工清单，
 *       漏一个就少一个判点），并用 {@link RateLimitAspect#resolveKey} 逐条求值；</li>
 *   <li>断言任何一条都不落到降级标记上
 *       （{@code :spel-failure:} / {@code :null-value:} / 历史遗留 {@code :fallback}）；</li>
 *   <li>断言没有任何键还在用被保留掉的变量名 {@code #request}
 *       （命名不变量：注入的只能是 {@code #httpRequest} / {@code #clientIp}）；</li>
 *   <li>自带反证：用两个故意写坏的合成注解证明第 2 条【能变红】。
 *       一个永远不会红的判点不叫判点。</li>
 * </ol>
 *
 * <p>顺带钉住一个编译期事实：键里用到了 {@code #purchaseRequest} / {@code #payload}
 * 这类【按参数名】访问，而 Spring 6 的参数名发现依赖字节码里的
 * {@code MethodParameters}（即 {@code -parameters}，由 spring-boot-starter-parent 打开）。
 * 若哪天有人关掉它，本类会以"表达式求值抛异常/落降级"的形式变红，
 * 而不是让限流静默退化。</p>
 */
@DisplayName("限流键审计：每个 @RateLimit 的 SpEL 必须按生产同一路径真的解析出来")
class RateLimitKeyAuditTest {

    /** 只用 resolveKey，不需要真的扣令牌 ⇒ registry 传 null（走到令牌逻辑才会用）。 */
    private static final RateLimitAspect ASPECT = new RateLimitAspect(null, "");

    /** 扫描下限：实测 51 处注解。数字大幅下滑说明扫描面坏了，不是注解变少了。 */
    private static final int MIN_ANNOTATED_METHODS = 40;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    private record Site(Class<?> owner, Method method, RateLimit annotation) {
        String label() {
            return owner.getSimpleName() + "#" + method.getName();
        }
    }

    private List<Site> scanAnnotatedSites() throws IOException {
        Path root = Path.of("target", "classes");
        assertTrue(Files.isDirectory(root),
                "需要已编译的 target/classes（Maven 会在 compile 之后跑本测试）；找不到就是扫描面为空");
        List<Site> sites = new ArrayList<>();
        List<String> loadFailures = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(root)) {
            List<Path> classFiles = paths
                    .filter(p -> p.getFileName().toString().endsWith(".class"))
                    .sorted(Comparator.comparing(Path::toString))
                    .toList();
            assertFalse(classFiles.isEmpty(), "target/classes 里一个 .class 都没有，扫描面为空");
            ClassLoader loader = getClass().getClassLoader();
            for (Path classFile : classFiles) {
                String binaryName = root.relativize(classFile).toString()
                        .replace(java.io.File.separatorChar, '.')
                        .replaceAll("\\.class$", "");
                Class<?> type;
                if (binaryName.endsWith(".package-info") || binaryName.endsWith("module-info")) {
                    continue; // 非类型单元，反射无意义
                }
                try {
                    // initialize=false：只要元数据，不触发任何静态初始化副作用
                    type = Class.forName(binaryName, false, loader);
                } catch (Throwable t) {
                    loadFailures.add(binaryName + " -> " + t.getClass().getSimpleName());
                    continue;
                }
                for (Method method : safeDeclaredMethods(type, binaryName, loadFailures)) {
                    RateLimit annotation = method.getAnnotation(RateLimit.class);
                    if (annotation != null) {
                        sites.add(new Site(type, method, annotation));
                    }
                }
            }
        }
        assertEquals(List.of(), loadFailures, "有类加载失败，判点覆盖不全：\n" + String.join("\n", loadFailures));
        return sites;
    }

    /** 反射取方法也可能因缺失的类型而炸；任何一次失败都记成"覆盖不全"，不许静默跳过。 */
    private List<Method> safeDeclaredMethods(Class<?> type, String binaryName, List<String> failures) {
        try {
            return List.of(type.getDeclaredMethods());
        } catch (Throwable t) {
            failures.add(binaryName + " #getDeclaredMethods -> " + t.getClass().getSimpleName());
            return List.of();
        }
    }

    /** 认证主体：键里 {@code T(SecurityUtils).getCurrentUserId()} 在未认证时会直接抛。 */
    private void authenticateAs(long userId) {
        var auth = new UsernamePasswordAuthenticationToken(userId, "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void bindRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/probe");
        request.setRemoteAddr("203.0.113.7");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    /** 只为"被表达式引用到的参数"造值：其余给 null，避免无谓的 mock 失败。 */
    private Object[] syntheticArgs(Method method, String expression) {
        Class<?>[] types = method.getParameterTypes();
        String[] names = probeParamNames(method);
        Object[] args = new Object[types.length];
        for (int i = 0; i < types.length; i++) {
            String name = names == null ? null : names[i];
            boolean referenced = name != null && expression.contains("#" + name);
            args[i] = referenced ? valueFor(types[i], name) : null;
        }
        return args;
    }

    /**
     * 参数名来自字节码 MethodParameters（-parameters）。取不到就返回 null，
     * 由调用方退化处理 —— 真取不到时，下面主判点会因为 {@code #xxx} 解析失败而变红。
     */
    private String[] probeParamNames(Method method) {
        var discoverer = new org.springframework.core.DefaultParameterNameDiscoverer();
        return discoverer.getParameterNames(method);
    }

    private Object valueFor(Class<?> type, String name) {
        if (type == String.class) {
            return "probe-" + name;
        }
        if (type == long.class || type == Long.class) {
            return 7L;
        }
        if (type == int.class || type == Integer.class) {
            return 7;
        }
        if (type == boolean.class || type == Boolean.class) {
            return Boolean.TRUE;
        }
        if (HttpServletRequest.class.isAssignableFrom(type)) {
            var attrs = RequestContextHolder.getRequestAttributes();
            return attrs instanceof ServletRequestAttributes sra ? sra.getRequest() : null;
        }
        if (type.isEnum()) {
            Object[] constants = type.getEnumConstants();
            return constants != null && constants.length > 0 ? constants[0] : null;
        }
        if (type.isInterface() || java.lang.reflect.Modifier.isAbstract(type.getModifiers())) {
            return mock(type);
        }
        try {
            return mock(type, invocation -> {
                Class<?> rt = invocation.getMethod().getReturnType();
                if (rt == String.class) {
                    return "probe-" + invocation.getMethod().getName();
                }
                if (rt == long.class || rt == Long.class) {
                    return 7L;
                }
                if (rt == int.class || rt == Integer.class) {
                    return 7;
                }
                if (rt == boolean.class || rt == Boolean.class) {
                    return Boolean.TRUE;
                }
                return null;
            });
        } catch (Throwable cannotMock) {
            // 最终兜底：真的构造不出来时用无参构造，仍失败则留 null（求值会暴露成降级键）
            try {
                var ctor = type.getDeclaredConstructor();
                ctor.setAccessible(true);
                return ctor.newInstance();
            } catch (ReflectiveOperationException e) {
                return null;
            }
        }
    }

    @Test
    @DisplayName("全部 @RateLimit 键表达式都能求值，且不落进任何降级桶")
    void everyRateLimitKeyResolves() throws IOException {
        authenticateAs(1001L);
        bindRequest();

        List<Site> sites = scanAnnotatedSites();
        assertTrue(sites.size() >= MIN_ANNOTATED_METHODS,
                "只扫到 " + sites.size() + " 处 @RateLimit（下限 " + MIN_ANNOTATED_METHODS
                        + "）——扫描面出问题，不能把【没有判点】当成【全部通过】");

        List<String> problems = new ArrayList<>();
        for (Site site : sites) {
            String key = site.annotation().key();
            if (key == null || key.isBlank()) {
                continue; // 无表达式 ⇒ 方法级默认桶，本来就不解析
            }
            String resolved;
            try {
                resolved = ASPECT.resolveKey(site.annotation(), site.method(),
                        syntheticArgs(site.method(), key));
            } catch (RuntimeException e) {
                problems.add(site.label() + " 求值抛异常：" + e.getClass().getSimpleName()
                        + " / key=" + key);
                continue;
            }
            for (String marker : List.of(RateLimitAspect.MARKER_SPEL_FAILURE,
                    RateLimitAspect.MARKER_NULL_VALUE, RateLimitAspect.LEGACY_FALLBACK_MARKER)) {
                if (resolved.contains(marker)) {
                    problems.add(site.label() + " 落进降级桶 " + marker + "：key=" + key
                            + " ⇒ 实际桶=" + resolved);
                }
            }
            assertTrue(resolved.startsWith(site.owner().getSimpleName() + "#" + site.method().getName()),
                    site.label() + " 的桶键没有以【类#方法】限定开头：" + resolved);
        }
        assertEquals(List.of(), problems,
                "有 " + problems.size() + " 个限流键会静默降级（降级=该端点的限流维度不再是你写的那个）：\n"
                        + String.join("\n", problems));
    }

    @Test
    @DisplayName("命名不变量：任何键都不许再用被保留掉的 #request")
    void noKeyMayReferenceTheReservedRequestVariable() throws IOException {
        for (Site site : scanAnnotatedSites()) {
            String key = site.annotation().key();
            assertFalse(key != null && key.contains("#request"),
                    site.label() + " 仍在使用 #request：" + key
                            + " —— 切面刻意不再注入这个名字（注入的是 #httpRequest / #clientIp），"
                            + "留着它说明还有端点没迁完，会直接落进降级桶");
        }
    }

    // ==================== 反证：证明上面的判点真的能红 ====================

    /** 故意写坏的键：引用一个不存在的参数 ⇒ 必须落进 spel-failure 桶。 */
    @RateLimit(capacity = 1, refillTokens = 1.0, key = "#thisParameterDoesNotExist.planId()")
    private void brokenKeyProbe(String harmless) {
    }

    /** 故意写坏的键：表达式合法但结果为 null ⇒ 必须落进 null-value 桶。 */
    @RateLimit(capacity = 1, refillTokens = 1.0, key = "#nothingAtAll")
    private void nullValueProbe(String harmless) {
    }

    /** 正确写法参照物：与生产端点同形的合法键 ⇒ 不许出现任何降级标记。 */
    @RateLimit(capacity = 1, refillTokens = 1.0, key = "#clientIp + ':' + #okParam")
    private void goodKeyProbe(String okParam) {
    }

    private RateLimit annotationOf(String methodName, Class<?>... params) throws NoSuchMethodException {
        Method method = RateLimitKeyAuditTest.class.getDeclaredMethod(methodName, params);
        RateLimit annotation = method.getAnnotation(RateLimit.class);
        assertTrue(annotation != null, "测试自身少了 @" + RateLimit.class.getSimpleName() + " 样例方法：" + methodName);
        return annotation;
    }

    @Test
    @DisplayName("反证：坏键一定被这扇门抓到，好键一定不被误伤")
    void detectorActuallyBites() throws Exception {
        authenticateAs(1001L);
        bindRequest();

        Method broken = RateLimitKeyAuditTest.class.getDeclaredMethod("brokenKeyProbe", String.class);
        String brokenKey = ASPECT.resolveKey(annotationOf("brokenKeyProbe", String.class), broken,
                new Object[] { "probe" });
        assertTrue(brokenKey.contains(RateLimitAspect.MARKER_SPEL_FAILURE),
                "坏表达式没有落进 spel-failure 桶，说明这扇门失效了：" + brokenKey);
        assertTrue(brokenKey.contains("203.0.113.7"),
                "降级桶必须仍按客户端 IP 分开，否则又变回全站共用一个桶：" + brokenKey);

        Method nullish = RateLimitKeyAuditTest.class.getDeclaredMethod("nullValueProbe", String.class);
        String nullKey = ASPECT.resolveKey(annotationOf("nullValueProbe", String.class), nullish,
                new Object[] { "probe" });
        assertTrue(nullKey.contains(RateLimitAspect.MARKER_NULL_VALUE),
                "结果为 null 的键没有落进 null-value 桶：" + nullKey);

        Method good = RateLimitKeyAuditTest.class.getDeclaredMethod("goodKeyProbe", String.class);
        String goodKey = ASPECT.resolveKey(annotationOf("goodKeyProbe", String.class), good,
                new Object[] { "probe-value" });
        assertFalse(goodKey.contains(RateLimitAspect.MARKER_SPEL_FAILURE)
                        || goodKey.contains(RateLimitAspect.MARKER_NULL_VALUE)
                        || goodKey.contains(RateLimitAspect.LEGACY_FALLBACK_MARKER),
                "合法键被误判成降级（本类自身就是假红的现场）：" + goodKey);
        assertTrue(goodKey.endsWith("203.0.113.7:probe-value"),
                "合法键的维度不对（应当是 IP + 入参）：" + goodKey);
    }

    /** 编译期不变量：-parameters 必须开着，否则按参数名取值的键会集体降级。 */
    @Test
    @DisplayName("-parameters 生效：按参数名写出的键能解析（关掉它这扇门就会变红）")
    void parameterNamesAreAvailableToSpel() throws Exception {
        authenticateAs(1001L);
        bindRequest();
        Method good = RateLimitKeyAuditTest.class.getDeclaredMethod("goodKeyProbe", String.class);
        String key = ASPECT.resolveKey(annotationOf("goodKeyProbe", String.class), good,
                new Object[] { "v" });
        assertFalse(key.contains(RateLimitAspect.MARKER_SPEL_FAILURE),
                "按参数名访问的键解析失败 ⇒ 编译产物里没有 MethodParameters（-parameters 被关了），"
                        + "生产上所有 #参数名 形态的限流键都会集体降级：" + key);
    }
}
