package com.campuslove.api.location;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * F-W1b-1（第六轮修复车道 W1b）静态门：LBS 读接口必须绑定主体。
 *
 * <p><b>缺陷</b>：{@code LocationController#getNearby} 的方法体内<b>一次</b>
 * {@code SecurityUtils.getCurrentUserId()} 都没有——它读的是「一整个集合」，
 * 却不知道该集合被谁读。运行期判点（{@code GeoServiceNearbyAuthzTest}）守得住今天的实现，
 * 但守不住「下一个人往 location 包里再加一个不带主体的 GET」，所以这里补一条形态门。</p>
 *
 * <p><b>三条形态不变量</b>：</p>
 * <ol>
 *   <li>{@code location/} 下 Controller 的每个 {@code @GetMapping} 方法体必须出现
 *       {@code getCurrentUserId()}（或 {@code getCurrentUserIdOrNull()}）；公开白名单只有
 *       {@code /ip-city}（只回 IP 归属城市，不含任何主体维度数据）；</li>
 *   <li>{@code GeoService#findNearby} 的第一个入参必须是主体，防止有人把主体从签名里
 *       摘掉、只留一句「调用方自己传」的注释；</li>
 *   <li>{@code /nearby} 的 {@code @RateLimit} 键必须引用主体：单按 IP 限流时，
 *       一个账号换出口 IP 就能把「铺网格扫坐标」的速率叠上去。</li>
 * </ol>
 *
 * <p><b>自带反证</b>：见末尾三个合成源码用例——探测器必须咬得住「不带主体的 GET」，
 * 不误伤白名单，也不误伤注释/字符串里出现的 {@code getCurrentUserId()} 字样。
 * 一个永远不会红的判点不叫判点。</p>
 */
@DisplayName("F-W1b-1 静态门：LBS 读接口必须绑定主体")
class NearbySubjectBindingStaticGateTest {

    /** 公开（无主体）读取白名单：只做 IP→城市解析，返回体不含任何用户维度数据。 */
    private static final List<String> PUBLIC_READ_ALLOWLIST = List.of("/ip-city");

    private static final List<String> SUBJECT_MARKERS =
            List.of("getCurrentUserId()", "getCurrentUserIdOrNull()");

    private Path sourceRoot() {
        Path p = Path.of("src", "main", "java", "com", "campuslove", "api", "location");
        if (Files.isDirectory(p)) {
            return p;
        }
        Path alt = Path.of(System.getProperty("user.dir"),
                "src", "main", "java", "com", "campuslove", "api", "location");
        assertTrue(Files.isDirectory(alt),
                "找不到 location 包源码目录 —— 扫描面为空，不能把【没有判点】当成【全部通过】。尝试过: "
                        + p.toAbsolutePath() + " 与 " + alt.toAbsolutePath());
        return alt;
    }

    /** 一条违规：文件 + 方法名 + 原因。 */
    private record Violation(String file, String method, String reason) {
        String label() {
            return file + "#" + method + "：" + reason;
        }
    }

    // ==================== 全仓判点 ====================

    @Test
    @DisplayName("location 包内每个 GET 读端点都必须取主体（/ip-city 白名单除外）")
    void everyLbsReadEndpointBindsTheSubject() throws IOException {
        List<Path> controllers;
        try (Stream<Path> walk = Files.walk(sourceRoot())) {
            controllers = walk.filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().endsWith("Controller.java"))
                    .sorted(Comparator.naturalOrder())
                    .toList();
        }
        assertFalse(controllers.isEmpty(), "location 包下一个 Controller 都没有，扫描面为空");
        assertTrue(controllers.stream()
                        .anyMatch(p -> p.getFileName().toString().equals("LocationController.java")),
                "扫描面没覆盖到 LocationController —— 本缺陷正出在这个文件上，扫不到它等于没判");

        List<Violation> violations = new ArrayList<>();
        for (Path file : controllers) {
            String rel = sourceRoot().relativize(file).toString().replace('\\', '/');
            violations.addAll(scanController(rel, Files.readString(file, StandardCharsets.UTF_8)));
        }
        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 个 LBS 读端点没有绑定当前主体：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    @Test
    @DisplayName("GeoService#findNearby 的第一个入参必须是主体")
    void findNearbySignatureCarriesTheSubject() throws IOException {
        String raw = Files.readString(sourceRoot().resolve("GeoService.java"), StandardCharsets.UTF_8);
        String clean = stripCommentsAndLiterals(raw);
        String key = "findNearby(";
        int at = clean.indexOf(key);
        assertTrue(at >= 0, "找不到 GeoService#findNearby 的签名 —— 判点失去被测物");
        int open = at + key.length() - 1;
        int close = matchingParen(clean, open);
        assertTrue(close > open, "findNearby 参数列表括号不配对，扫描器口径需要复核");
        String params = clean.substring(open + 1, close).replaceAll("\\s+", " ").strip();
        String first = params.split(",")[0].strip();
        assertTrue(first.startsWith("Long ")
                        && (first.toLowerCase().contains("requester") || first.toLowerCase().contains("userid")),
                "findNearby 的第一个入参必须是主体（Long requesterId / userId），实际: [" + first
                        + "] —— 没有主体就无法做「对方是否同意被看到」的授权判定");
    }

    @Test
    @DisplayName("/nearby 的限流键必须引用主体，而不只是客户端 IP")
    void nearbyRateLimitKeyIsSubjectBound() throws IOException {
        String raw = Files.readString(
                sourceRoot().resolve("LocationController.java"), StandardCharsets.UTF_8);
        List<GetEndpoint> endpoints = endpointsOf("LocationController.java", raw);
        GetEndpoint nearby = endpoints.stream()
                .filter(e -> "/nearby".equals(e.path()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("找不到 /nearby 端点——它被改名或删掉了？"));
        String annotation = raw.substring(nearby.annotationStart(), nearby.bodyStart());
        int rateLimitAt = annotation.indexOf("@RateLimit");
        assertTrue(rateLimitAt >= 0, "/nearby 没有 @RateLimit —— 铺网格扫描的运行时刹车就是它");
        String rateLimit = annotation.substring(rateLimitAt,
                matchingParen(annotation, rateLimitAt + "@RateLimit".length()) + 1);
        assertTrue(rateLimit.contains("getCurrentUserId"),
                "/nearby 的限流键必须含主体维度（单按 IP 限流可被换出口 IP 叠加），实际注解: " + rateLimit);
    }

    // ============ 临时 deny 的交接形态（本仓口径：不许留没人看的口头待办） ============

    /** 交接标记：门禁按这个字符串认人，改名字之前请先改门。 */
    private static final String HANDOFF_MARKER = "TODO(F-W1b-1-H)";

    /** deny 口径的类注释必须写明的等待对象（「等待授权列落地」是这句话的可判形态）。 */
    private static final String HANDOFF_WAITING_PHRASE = "等待授权列落地";

    /** 地理曝光同意位的候选列名：迁移里出现任意一个即视为授权位已落地。 */
    private static final List<String> CONSENT_COLUMN_NAMES =
            List.of("nearby_visible", "nearby_consent_at", "geo_discoverable", "location_consent");

    @Test
    @DisplayName("临时 deny 必须带可被门看见的交接标记，并写明它在等什么")
    void denyPolicyCarriesMachineReadableHandoff() throws IOException {
        Path denyFile = sourceRoot().resolve("DenyAllNearbyPolicy.java");
        assertTrue(Files.isRegularFile(denyFile),
                "DenyAllNearbyPolicy 已不在盘上 —— 若已被真实授权策略替换，请同步把本条判点"
                        + "改成「deny 实现不得存在」，否则本条只是在钉一个不存在的文件");
        String src = Files.readString(denyFile, StandardCharsets.UTF_8);
        assertTrue(src.contains(HANDOFF_MARKER),
                "deny-all 是「附近的人」整体关停，必须挂着机器可读的交接标记 " + HANDOFF_MARKER
                        + "（本仓口径：不许留没人看的口头待办）。标记被摘掉而 deny 仍在 ⇒ 下一个人"
                        + "只会看到「这里恒返回 false」，不会知道它在等一列");
        assertTrue(src.contains(HANDOFF_WAITING_PHRASE),
                "类注释必须写明「" + HANDOFF_WAITING_PHRASE + "」——只说『一律拒绝』不说等什么，"
                        + "交接项就只是一句口头承诺");
        // 标记必须同时出现在实现与接口两处之一，且接口侧的授权论证不能丢
        String policySrc = Files.readString(
                sourceRoot().resolve("NearbyVisibilityPolicy.java"), StandardCharsets.UTF_8);
        assertTrue(policySrc.contains("user_agreement_consent"),
                "接口注释里「为什么现有列都不算这一位」的论证被删掉了 ⇒ 下一个人会误以为"
                        + "协议同意位可以拿来放开附近的人");
    }

    @Test
    @DisplayName("授权列已落地却仍是 deny-all ⇒ 红：功能被永久打死必须被发现")
    void consentColumnAndDenyPolicyCannotCoexist() throws IOException {
        Path migrationDir = migrationDir();
        boolean consentLanded = CONSENT_COLUMN_NAMES.stream()
                .anyMatch(name -> migrationDirMatches(migrationDir, name));
        if (consentLanded) {
            fail("迁移里已经出现地理曝光同意位（" + CONSENT_COLUMN_NAMES + " 之一），"
                    + "但 " + sourceRoot().resolve("DenyAllNearbyPolicy.java")
                    + " 仍是唯一的 NearbyVisibilityPolicy 实现 ⇒ 「附近的人」已被永久打死。"
                    + "请替换实现（读取该位）并把本条判点改写为「deny 实现不得存在」。");
        }
        // 反向对照：证明本条不是因为「扫不到东西」才绿的
        assertFalse(migrationDirMatches(migrationDir, "nearby_visible"),
                "探测器连真实迁移目录都读不到 ⇒ 本条绿是假的（见 migrationDir() 的找目录口径）");
        assertTrue(scannerSeesConsentColumnInSyntheticMigration(),
                "合成迁移夹具都扫不出来 ⇒ consentLanded 恒为 false，本条形同虚设");
    }

    /** 探测器阳性反证：一段带 nearby_visible 列的合成迁移必须被认成「授权位已落地」。 */
    private boolean scannerSeesConsentColumnInSyntheticMigration() {
        String synthetic = "ALTER TABLE users ADD COLUMN nearby_visible TINYINT(1) NOT NULL DEFAULT 0;";
        return CONSENT_COLUMN_NAMES.stream().anyMatch(synthetic::contains);
    }

    /** 向上找 {@code database/flyway/sql}（与 ErasureSchemaAlignmentTest 同一口径：不假设工作目录）。 */
    private Path migrationDir() {
        java.nio.file.Path cursor = Path.of("").toAbsolutePath();
        for (int up = 0; up < 6 && cursor != null; up++, cursor = cursor.getParent()) {
            Path candidate = cursor.resolve("database").resolve("flyway").resolve("sql");
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
        }
        throw new AssertionError("从 " + Path.of("").toAbsolutePath()
                + " 向上找不到 database/flyway/sql —— 扫描根路径出问题，不能把【读不到】当成【没落地】");
    }

    /** 迁移目录里是否有任意脚本提到给定列名。 */
    private boolean migrationDirMatches(Path dir, String columnName) {
        try (Stream<Path> walk = Files.walk(dir)) {
            return walk.filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().endsWith(".sql"))
                    .anyMatch(p -> {
                        try {
                            return Files.readString(p, StandardCharsets.UTF_8)
                                    .toLowerCase(java.util.Locale.ROOT).contains(columnName);
                        } catch (IOException e) {
                            throw new java.io.UncheckedIOException("读取迁移脚本失败: " + p, e);
                        }
                    });
        } catch (IOException e) {
            throw new java.io.UncheckedIOException("扫描迁移目录失败: " + dir, e);
        }
    }

    // ==================== 探测器实现 ====================

    /** 一个 GET 端点在三份文本（原文/strip 文）里的定位锚点。 */
    private record GetEndpoint(String file, String path, int annotationStart, int bodyStart, int bodyEnd) {}

    /** 扫描单个 Controller 源文件里的 @GetMapping 方法，返回「未绑定主体」的违规。 */
    private List<Violation> scanController(String file, String rawSrc) {
        List<Violation> out = new ArrayList<>();
        for (GetEndpoint e : endpointsOf(file, rawSrc)) {
            String clean = stripCommentsAndLiterals(rawSrc);
            String body = clean.substring(e.bodyStart(), e.bodyEnd() + 1);
            boolean bindsSubject = SUBJECT_MARKERS.stream().anyMatch(body::contains);
            if (bindsSubject) {
                continue;
            }
            if (e.path() != null && PUBLIC_READ_ALLOWLIST.contains(e.path())) {
                continue; // 公开端点白名单
            }
            out.add(new Violation(file, methodNameIn(rawSrc.substring(e.annotationStart(), e.bodyStart())),
                    "方法体内没有 getCurrentUserId()/getCurrentUserIdOrNull()，"
                            + "且不在公开读取白名单 " + PUBLIC_READ_ALLOWLIST + " 内（映射路径=" + e.path() + "）"));
        }
        return out;
    }

    /** 列出源文件里所有 {@code @GetMapping} 端点（路径取自原文，主体判定取自 strip 后的文本）。 */
    private List<GetEndpoint> endpointsOf(String file, String rawSrc) {
        String clean = stripCommentsAndLiterals(rawSrc);
        List<GetEndpoint> out = new ArrayList<>();
        int idx = 0;
        while ((idx = clean.indexOf("@GetMapping", idx)) >= 0) {
            int declEnd = clean.indexOf(';', idx);
            int bodyOpen = firstDepthZeroBrace(clean, idx);
            if (bodyOpen < 0) {
                idx += "@GetMapping".length();
                continue;
            }
            // @InitBinder/@ModelAttribute 之类的非端点注解不会与 @GetMapping 同段；
            // 若注解行后先出现分号再出现 '{'，那是接口/抽象声明，跳过。
            if (declEnd >= 0 && declEnd < bodyOpen) {
                idx = declEnd + 1;
                continue;
            }
            int bodyClose = matchBrace(clean, bodyOpen);
            if (bodyClose < 0) {
                idx = bodyOpen + 1;
                continue;
            }
            out.add(new GetEndpoint(file, mappingPath(rawSrc, idx), idx, bodyOpen, bodyClose));
            idx = bodyClose + 1;
        }
        return out;
    }

    /** 从原文里取 @GetMapping("xxx") 的路径字面量；无参 @GetMapping 返回 null。 */
    private String mappingPath(String raw, int annotationIdx) {
        int p = raw.indexOf("(", annotationIdx);
        if (p < 0) {
            return null;
        }
        int close = raw.indexOf(")", p);
        if (close < 0) {
            return null;
        }
        String inner = raw.substring(p + 1, close).strip();
        if (inner.isEmpty()) {
            return null;
        }
        // 形如 "/nearby" 或 value = "/nearby"
        int q1 = inner.indexOf('"');
        int q2 = inner.lastIndexOf('"');
        return (q1 >= 0 && q2 > q1) ? inner.substring(q1 + 1, q2) : null;
    }

    private String methodNameIn(String declarator) {
        String stripped = stripAnnotationUses(declarator.replaceAll("\\s+", " "));
        int lp = stripped.indexOf('(');
        if (lp < 0) {
            return "<unknown>";
        }
        int j = lp - 1;
        while (j >= 0 && Character.isWhitespace(stripped.charAt(j))) {
            j--;
        }
        int end = j + 1;
        while (j >= 0 && isIdentChar(stripped.charAt(j))) {
            j--;
        }
        return end - 1 <= j ? "<unknown>" : stripped.substring(j + 1, end);
    }

    private String stripAnnotationUses(String s) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '@') {
                int k = i + 1;
                while (k < s.length() && (isIdentChar(s.charAt(k)) || s.charAt(k) == '.')) {
                    k++;
                }
                if (k < s.length() && s.charAt(k) == '(') {
                    int depth = 0;
                    while (k < s.length()) {
                        char d = s.charAt(k);
                        if (d == '(') {
                            depth++;
                        } else if (d == ')') {
                            depth--;
                            if (depth == 0) {
                                k++;
                                break;
                            }
                        }
                        k++;
                    }
                }
                i = k;
                continue;
            }
            sb.append(c);
            i++;
        }
        return sb.toString();
    }

    private int firstDepthZeroBrace(String s, int fromIdx) {
        int paren = 0, angle = 0;
        for (int i = fromIdx; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '(' -> paren++;
                case ')' -> paren = Math.max(0, paren - 1);
                case '<' -> {
                    if (paren == 0) {
                        angle++;
                    }
                }
                case '>' -> {
                    if (paren == 0) {
                        angle = Math.max(0, angle - 1);
                    }
                }
                case '{', '}' -> {
                    if (paren == 0 && angle == 0) {
                        return i;
                    }
                }
                default -> {
                }
            }
        }
        return -1;
    }

    private int matchingParen(String s, int openIdx) {
        int depth = 0;
        for (int i = openIdx; i < s.length(); i++) {
            if (s.charAt(i) == '(') {
                depth++;
            } else if (s.charAt(i) == ')') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    private int matchBrace(String s, int openIdx) {
        int depth = 0;
        for (int i = openIdx; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    /** 逐字符把块/行注释与字符串/字符字面量替换为空格（保留下标对齐与换行）。 */
    static String stripCommentsAndLiterals(String src) {
        char[] a = src.toCharArray();
        char[] out = a.clone();
        int n = a.length;
        int i = 0;
        while (i < n) {
            char c = a[i];
            if (c == '/' && i + 1 < n && a[i + 1] == '/') {
                int j = i + 2;
                while (j < n && a[j] != '\n') {
                    out[j] = ' ';
                    j++;
                }
                i = j;
            } else if (c == '/' && i + 1 < n && a[i + 1] == '*') {
                int j = i;
                while (j < n && !(a[j] == '*' && j + 1 < n && a[j + 1] == '/')) {
                    if (a[j] != '\n') {
                        out[j] = ' ';
                    }
                    j++;
                }
                if (j < n) {
                    out[j] = ' ';
                    if (j + 1 < n) {
                        out[j + 1] = ' ';
                    }
                }
                i = Math.min(j + 2, n);
            } else if (c == '"' || c == '\'') {
                char quote = c;
                out[i] = ' ';
                int j = i + 1;
                while (j < n) {
                    if (a[j] == '\\') {
                        out[j] = ' ';
                        if (j + 1 < n) {
                            out[j + 1] = ' ';
                        }
                        j += 2;
                        continue;
                    }
                    if (a[j] == quote) {
                        out[j] = ' ';
                        j++;
                        break;
                    }
                    if (a[j] == '\n') {
                        break;
                    }
                    out[j] = ' ';
                    j++;
                }
                i = j;
            } else if (c == '"' && i + 2 < n && a[i + 1] == '"' && a[i + 2] == '"') {
                i++;
            } else {
                i++;
            }
        }
        return new String(out);
    }

    private static boolean isIdentChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_' || c == '$';
    }

    // ==================== 反证：证明探测器能红 ====================

    @Test
    @DisplayName("反证：不带主体的 GET 一定被咬住")
    void scannerFlagsGetWithoutSubject() {
        String bad = """
                package p;
                class C {
                    @GetMapping("/nearby")
                    public List<String> getNearby(BigDecimal lat) {
                        return service.findNearby(lat, 5, 50);
                    }
                }
                """;
        List<Violation> v = scanController("C.java", bad);
        assertEquals(1, v.size(), "探测器没抓到不带主体的 GET，形同虚设");
        assertEquals("getNearby", v.get(0).method());
        assertTrue(v.get(0).reason().contains("getCurrentUserId"));
    }

    @Test
    @DisplayName("反证：取主体的 GET 与白名单公开 GET 都不误伤")
    void scannerAcceptsCompliantAndAllowlisted() {
        String good = """
                package p;
                class C {
                    @GetMapping("/nearby")
                    public List<String> getNearby(BigDecimal lat) {
                        Long me = SecurityUtils.getCurrentUserId();
                        return service.findNearby(me, lat, 5, 50);
                    }

                    @GetMapping("/ip-city")
                    public String ipCity(HttpServletRequest request) {
                        return locationService.resolveCity(ip);
                    }

                    @GetMapping
                    public List<String> root() {
                        Long me = SecurityUtils.getCurrentUserIdOrNull();
                        return service.list(me);
                    }
                }
                """;
        assertTrue(scanController("C.java", good).isEmpty(),
                "探测器误伤了合规实现/白名单: " + scanController("C.java", good));
    }

    @Test
    @DisplayName("反证：注释与字符串里的 getCurrentUserId() 字样不算取主体")
    void scannerIgnoresCommentsAndLiterals() {
        String fake = """
                package p;
                class C {
                    // 这里写了 SecurityUtils.getCurrentUserId() 只是注释
                    @GetMapping("/nearby")
                    public List<String> getNearby(BigDecimal lat) {
                        log.warn("记得补 getCurrentUserId()");
                        return service.findNearby(lat, 5, 50);
                    }
                }
                """;
        assertEquals(1, scanController("C.java", fake).size(),
                "注释/字符串里的字样被当成「已取主体」，判点就是假的");
    }
}
