package com.campuslove.api.growth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.UncheckedIOException;
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
 * C6（2026-11 第六轮修复波 W1）静态门：任何 {@code @Transactional} 方法体内不得出现 HTTP 外呼。
 *
 * <p><b>缺陷</b>：{@link WeChatPushService} 的三个
 * {@code sendSubscribeMessage} / {@code sendSocialDigestPush} /
 * {@code sendRecommendRefreshPush} 都带着方法级 {@code @Transactional}，
 * 而方法体是一次打到微信订阅消息接口的 HTTP 调用（{@code restClient}），
 * 本类又没有注入任何 Repository/EntityManager —— 全程不写库。
 * 于是每次推送都从连接池（池上限 20）借一条连接并一直占着，直到微信侧返回
 * （自家文档承认 3s+ 慢调用）；高并发下先把连接抽干再让整个 API 排队。
 * 上一轮 S2-1 只剪了调用方（{@code NotificationConsumer}）的注解，
 * 跨 bean 这一层原封没动 —— 所以本轮直接撤除这三个注解。</p>
 *
 * <p><b>为什么用静态门而不是运行期事务边界测试</b>：本类根本没有写库，
 * 「撤注解」这件事的正确性判据是「形态」而非「运行期事务状态」——
 * 运行期 {@code isActualTransactionActive()} 对一个不写库的 bean 没有可断言的落库点。
 * 因此判点写成纯源码判定：扫 {@code src/main/java} 下每个 {@code @Transactional}
 * 方法体，命中 {@code restClient./webClient./restTemplate./.retrieve()/.exchange()/
 * HttpURLConnection/java.net.http./HttpClient.newHttpClient(} 之一即红。
 * 该门与 {@code NotificationPushTransactionBoundaryTest}（运行期）互补：
 * 前者守「形态不变量·全仓」，后者守「真事务边界·单点」。</p>
 *
 * <p><b>注释与字符串不参与匹配</b>：匹配前先把块注释、行注释、字符串/字符字面量
 * （含 Java 文本块）逐字符替换为空格（保留换行以维持行号），因此
 * 类文档里出现 "微信/推送" 或代码注释里出现 "restClient" 字样都不会误伤。</p>
 *
 * <p><b>自带反证</b>：一个永远不会红的判点不叫判点。见
 * {@link #scannerFlagsTransactionalHttpCall} 与 {@link #scannerIgnoresCleanAndNonTransactional}：
 * 用两段合成源码证明探测器【咬得住】@Transactional+外呼、【不误伤】无注解方法与异常类型名
 * （{@code HttpClientErrorException}）。</p>
 *
 * <p>可证伪性（本轮真实反向变异）：把 {@code @Transactional} 加回
 * {@link WeChatPushService#sendSubscribeMessage}，主判点立刻变红；还原后复绿。</p>
 */
@DisplayName("C6 静态门：@Transactional 方法体内禁止 HTTP 外呼")
class TransactionalHttpCallStaticGateTest {

    /** 外呼形态标记：命中即认定方法体里有 HTTP 调用。刻意不用裸 "HttpClient"，
     * 否则会误伤 {@code catch (HttpClientErrorException ...)}（那只是异常类型，不是外呼）。 */
    private static final List<String> HTTP_CALL_MARKERS = List.of(
            "restClient.", "webClient.", "restTemplate.",
            ".retrieve()", ".exchange(",
            "HttpURLConnection", "HttpClient.newHttpClient(", "java.net.http.");

    private static final List<String> TRANSACTIONAL = List.of("@Transactional");

    private Path sourceRoot() {
        Path p = Path.of("src", "main", "java");
        if (!Files.isDirectory(p)) {
            // surefire 的 working dir 是模块 basedir；万一被从别处调起，回退到 user.dir 定位。
            Path alt = Path.of(System.getProperty("user.dir"), "src", "main", "java");
            assertTrue(Files.isDirectory(alt),
                    "找不到 src/main/java —— 扫描面为空，不能把【没有判点】当成【全部通过】。尝试过: "
                            + p.toAbsolutePath() + " 与 " + alt.toAbsolutePath());
            return alt;
        }
        return p;
    }

    /** 一条违规：文件 + 方法名 + 命中标记 + 行号。 */
    private record Violation(String file, String method, String marker, int line) {
        String label() {
            return file + "#" + method + " (第 " + line + " 行, 命中 " + marker + ")";
        }
    }

    @Test
    @DisplayName("全仓 @Transactional 方法体内不得出现 HTTP 外呼")
    void noTransactionalMethodBodyContainsHttpCall() throws IOException {
        List<String> javaFiles;
        try (Stream<Path> walk = Files.walk(sourceRoot())) {
            javaFiles = walk
                    .filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().endsWith(".java"))
                    .map(p -> sourceRoot().relativize(p).toString().replace('\\', '/'))
                    .sorted(Comparator.naturalOrder())
                    .toList();
        }
        assertFalse(javaFiles.isEmpty(), "src/main/java 下一个 .java 都没有，扫描面为空");
        // 下限：本仓 main 源码规模远超此数，骤降说明扫描根路径出问题（口径同 RateLimitKeyAuditTest）。
        assertTrue(javaFiles.size() >= 200,
                "只扫到 " + javaFiles.size() + " 个 .java（下限 200）——扫描根路径出问题，判点覆盖不全");

        List<Violation> violations = new ArrayList<>();
        for (String rel : javaFiles) {
            Path file = sourceRoot().resolve(rel);
            String src;
            try {
                src = Files.readString(file, StandardCharsets.UTF_8);
            } catch (IOException e) {
                throw new UncheckedIOException("读取源码失败: " + file, e);
            }
            violations.addAll(scan(rel, src));
        }

        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 个 @Transactional 方法体内含 HTTP 外呼"
                        + "（外呼占着数据库连接，池上限 20，微信侧 3s+ 慢调用会把连接抽干）：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    // ==================== 探测器实现 ====================

    /** 扫描单个源文件，返回其 @Transactional 方法/类体内的 HTTP 外呼违规。 */
    private List<Violation> scan(String file, String rawSrc) {
        String src = stripCommentsAndLiterals(rawSrc);
        List<Violation> out = new ArrayList<>();
        int idx = 0;
        while (idx < src.length()) {
            int at = src.indexOf("@Transactional", idx);
            if (at < 0) {
                break;
            }
            // token 边界：前面不能是标识符字符，后面也不能是标识符字符（排除 @TransactionalFoo）
            boolean leftOk = at == 0 || !isIdentChar(src.charAt(at - 1));
            int nameEnd = at + "@Transactional".length();
            boolean rightOk = nameEnd >= src.length() || !isIdentChar(src.charAt(nameEnd));
            if (!leftOk || !rightOk) {
                idx = nameEnd;
                continue;
            }
            // 先跳过 @Transactional 自身的 (...) 参数（如 readOnly = true），
            // 否则其括号会混进声明文本，导致方法名解析失败。
            int afterArgs = skipOptionalParens(src, nameEnd);
            int bodyOpen = firstDepthZeroBrace(src, afterArgs);
            if (bodyOpen < 0) {
                idx = afterArgs;
                continue;
            }
            int bodyClose = matchBrace(src, bodyOpen);
            if (bodyClose < 0) {
                idx = afterArgs;
                continue;
            }
            String declarator = src.substring(afterArgs, bodyOpen);
            String method = methodName(declarator);
            boolean classLevel = method == null;

            // 搜索体：排除嵌套类型体（嵌套类型自身的 @Transactional 方法会被本轮 while 循环单独扫到）
            String region = blankNestedTypes(src, bodyOpen, bodyClose);
            for (String marker : HTTP_CALL_MARKERS) {
                int hit = region.indexOf(marker);
                if (hit >= 0) {
                    int line = lineOf(src, bodyOpen + hit);
                    out.add(new Violation(file, classLevel ? "<class-level>" : method, marker, line));
                    break; // 一个位置报一条即可
                }
            }
            idx = bodyOpen + 1;
        }
        return out;
    }

    /** 从 fromIdx 起，返回第一个「圆括号/尖括号深度为 0」的 '{'（注解参数的花括号位于 () 内故被跳过）。 */
    private int firstDepthZeroBrace(String s, int fromIdx) {
        int paren = 0, angle = 0;
        for (int i = fromIdx; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '(' -> paren++;
                case ')' -> paren = Math.max(0, paren - 1);
                // 尖括号仅在圆括号深度 0 时计数：注解参数里的 '<'（若有）不应污染签名泛型深度。
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
                        return i; // 注解与签名结束，方法体/类体的第一个 '{'
                    }
                }
                default -> {
                }
            }
        }
        return -1;
    }

    /** 若 fromIdx（跳过空白后）是 '('，返回其配对 ')' 之后的下标；否则原样返回 fromIdx。 */
    private int skipOptionalParens(String s, int fromIdx) {
        int i = fromIdx;
        while (i < s.length() && Character.isWhitespace(s.charAt(i))) {
            i++;
        }
        if (i >= s.length() || s.charAt(i) != '(') {
            return fromIdx;
        }
        int depth = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
                if (depth == 0) {
                    return i + 1;
                }
            }
            i++;
        }
        return fromIdx;
    }

    /** 匹配 openIdx 处 '{' 的闭合 '}'（此时字符串/注释已在 strip 阶段被清空，无需再处理）。 */
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

    /**
     * 从声明文本推断方法名；判定为类级 @Transactional（含 class/interface/enum/record）时返回 null。
     * 声明文本里可能夹着其它注解（已带括号），先剔除注解使用，再取最后一个 '{' 前参数列表 '(' 前的标识符。
     */
    private String methodName(String declarator) {
        String stripped = stripAnnotationUses(declarator);
        if (containsTypeKeyword(stripped)) {
            return null; // 类级
        }
        int lp = stripped.indexOf('(', indexOfTopLevelParen(stripped));
        if (lp < 0) {
            return null;
        }
        int j = lp - 1;
        while (j >= 0 && Character.isWhitespace(stripped.charAt(j))) {
            j--;
        }
        int end = j + 1;
        while (j >= 0 && isIdentChar(stripped.charAt(j))) {
            j--;
        }
        if (end - 1 <= j) {
            return null;
        }
        return stripped.substring(j + 1, end);
    }

    /** 返回方法参数列表 '(' 的下标（第一个非注解括号）。剔除注解后声明里第一个 '(' 即参数列表。 */
    private int indexOfTopLevelParen(String s) {
        int p = s.indexOf('(');
        return p < 0 ? 0 : p;
    }

    /** 剔除注解使用（@Name 及其后的平衡 (...)），返回剩余（修饰符/返回类型/方法名/参数）。 */
    private String stripAnnotationUses(String s) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '@') {
                // 跳过限定名
                int k = i + 1;
                while (k < s.length() && (isIdentChar(s.charAt(k)) || s.charAt(k) == '.')) {
                    k++;
                }
                // 跳过可选的 (...) 参数
                while (k < s.length() && Character.isWhitespace(s.charAt(k))) {
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
                    i = k;
                    continue;
                }
                i = k;
                continue;
            }
            sb.append(c);
            i++;
        }
        return sb.toString();
    }

    private boolean containsTypeKeyword(String s) {
        for (String kw : List.of("class", "interface", "enum", "record", "@interface")) {
            int p = 0;
            while ((p = s.indexOf(kw, p)) >= 0) {
                boolean l = p == 0 || !isIdentChar(s.charAt(p - 1));
                int e = p + kw.length();
                boolean r = e >= s.length() || !isIdentChar(s.charAt(e));
                if (l && r) {
                    return true;
                }
                p = e;
            }
        }
        return false;
    }

    /**
     * 把 [openIdx+1, closeIdx] 区间内【嵌套类型】的方法体之外内容保留、嵌套类型整段（含其花括号体）
     * 就地替换为空格。这样类级 @Transactional 只对本类直接方法负责，嵌套类型另由主循环单独覆盖。
     */
    private String blankNestedTypes(String s, int openIdx, int closeIdx) {
        char[] arr = s.toCharArray();
        int i = openIdx + 1;
        while (i < closeIdx) {
            char c = arr[i];
            if (c == '{' || c == '}') {
                i++;
                continue;
            }
            int kw = matchTypeKeywordAt(arr, i);
            if (kw >= 0) {
                // 找到该类型的 '{'
                int nb = firstDepthZeroBraceFromChars(arr, kw, closeIdx);
                if (nb >= 0) {
                    int nc = matchBraceFromChars(arr, nb, closeIdx);
                    if (nc > nb) {
                        for (int j = nb; j <= nc; j++) {
                            if (arr[j] != '\n') {
                                arr[j] = ' ';
                            }
                        }
                        i = nc + 1;
                        continue;
                    }
                }
            }
            i++;
        }
        return new String(arr, openIdx, closeIdx - openIdx + 1);
    }

    private int matchTypeKeywordAt(char[] a, int i) {
        for (String kw : List.of("class", "interface", "enum", "record")) {
            int len = kw.length();
            if (i + len <= a.length) {
                boolean hit = true;
                for (int k = 0; k < len; k++) {
                    if (a[i + k] != kw.charAt(k)) {
                        hit = false;
                        break;
                    }
                }
                if (hit) {
                    boolean l = i == 0 || !isIdentChar(a[i - 1]);
                    int e = i + len;
                    boolean r = e >= a.length || !isIdentChar(a[e]);
                    if (l && r) {
                        return e;
                    }
                }
            }
        }
        return -1;
    }

    private int firstDepthZeroBraceFromChars(char[] a, int from, int limit) {
        int paren = 0, angle = 0;
        for (int i = from; i <= limit; i++) {
            char c = a[i];
            if (c == '(') {
                paren++;
            } else if (c == ')') {
                paren = Math.max(0, paren - 1);
            } else if (c == '<') {
                angle++;
            } else if (c == '>') {
                angle = Math.max(0, angle - 1);
            } else if ((c == '{') && paren == 0 && angle == 0) {
                return i;
            }
        }
        return -1;
    }

    private int matchBraceFromChars(char[] a, int open, int limit) {
        int depth = 0;
        for (int i = open; i <= limit; i++) {
            if (a[i] == '{') {
                depth++;
            } else if (a[i] == '}') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    /** 逐字符把块/行注释、字符串/字符字面量（含文本块）替换为空格，保留换行以维持行号与下标对齐。 */
    static String stripCommentsAndLiterals(String src) {
        char[] a = src.toCharArray();
        int n = a.length;
        char[] out = a.clone();
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
                    i = j + 2;
                } else {
                    i = j;
                }
            } else if (c == '"' && i + 2 < n && a[i + 1] == '"' && a[i + 2] == '"') {
                // 文本块 """..."""
                out[i] = ' ';
                out[i + 1] = ' ';
                out[i + 2] = ' ';
                int j = i + 3;
                while (j < n && !(a[j] == '"' && j + 1 < n && a[j + 1] == '"' && j + 2 < n && a[j + 2] == '"')) {
                    if (a[j] != '\n') {
                        out[j] = ' ';
                    }
                    j++;
                }
                int close = Math.min(j + 3, n);
                for (int k = j; k < close; k++) {
                    out[k] = ' ';
                }
                i = close;
            } else if (c == '"' || c == '\'') {
                char quote = c;
                out[i] = ' ';
                int j = i + 1;
                while (j < n) {
                    if (a[j] == '\\') {
                        out[j] = ' ';
                        if (j + 1 < n && a[j + 1] != '\n') {
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
                        break; // 非法未闭合，保守停在换行
                    }
                    out[j] = ' ';
                    j++;
                }
                i = j;
            } else {
                i++;
            }
        }
        return new String(out);
    }

    private static boolean isIdentChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_' || c == '$';
    }

    private static int lineOf(String s, int idx) {
        int line = 1;
        for (int i = 0; i < idx && i < s.length(); i++) {
            if (s.charAt(i) == '\n') {
                line++;
            }
        }
        return line;
    }

    // ==================== 反证：证明探测器能红 ====================

    @Test
    @DisplayName("反证：@Transactional 方法体含 restClient 外呼一定被探测器咬住")
    void scannerFlagsTransactionalHttpCall() {
        String bad = """
                package p;
                class X {
                    @Transactional
                    public boolean push() {
                        restClient.post().uri("u").body(b).retrieve().body(R.class);
                        return true;
                    }
                }
                """;
        List<Violation> v = scan("X.java", bad);
        assertEquals(1, v.size(), "探测器没抓到 @Transactional+外呼，形同虚设");
        assertEquals("push", v.get(0).method());
        assertTrue(v.get(0).marker().startsWith("restClient."));
    }

    @Test
    @DisplayName("反证：无注解方法、仅 catch 异常类型名、注释里的字样都不误伤")
    void scannerIgnoresCleanAndNonTransactional() {
        String clean = """
                package p;
                class X {
                    // 这里注释提到 restClient. 但只是注释
                    public String fetch() {
                        try {
                            return restClient.get().retrieve().body(String.class);
                        } catch (HttpClientErrorException e) {
                            return "err";
                        }
                    }

                    @Transactional(readOnly = true)
                    public long count() {
                        return repo.count();
                    }

                    @Transactional
                    public String buildMessage() {
                        String s = "restClient.post() 是字符串字面量，不该被当成外呼";
                        return s;
                    }
                }
                """;
        assertTrue(scan("X.java", clean).isEmpty(), "探测器误伤了无注解/注释/字面量/异常类型名: "
                + scan("X.java", clean));
    }

    @Test
    @DisplayName("反证：类级 @Transactional + 类内 HTTP 外呼被识别为 <class-level> 违规")
    void scannerFlagsClassLevelTransactionalHttpCall() {
        String cls = """
                package p;
                @Transactional
                class X {
                    public boolean push() {
                        return webClient.post().retrieve() != null;
                    }
                }
                """;
        List<Violation> v = scan("X.java", cls);
        assertEquals(1, v.size());
        assertEquals("<class-level>", v.get(0).method());
    }
}
