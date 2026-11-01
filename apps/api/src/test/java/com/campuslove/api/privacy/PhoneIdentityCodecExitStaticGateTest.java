package com.campuslove.api.privacy;

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
 * W1b-3 静态门：{@code users.phone} 与手机号派生键只能有一个出口（第五轮 F-09 建议里没做的那半）。
 *
 * <p><b>为什么必须有形态门</b>：第六轮实测到的四条 phone 写入形状（注册侧密文+派生键、
 * 后台建号密文+派生键、换号密文+派生键、微信绑定<b>密文 + 微信 openid + 零查重</b>），
 * 成因全部是「同一个列被第四个写入方按第四种语义写了一次」。运行期判点只能守已知的那几条路，
 * 守不住下一个人再开第五个出口，所以这里把<b>出口形态</b>钉死。</p>
 *
 * <p><b>四条不变量</b>（1-3 扫描面 = 整个 {@code src/main/java}，注释已剥离、字符串字面量保留）：</p>
 * <ol>
 *   <li>{@code "phone:"} 这个派生键命名空间字面量只允许出现在
 *       {@code privacy/PhoneColumnCodec.java} 里。任何别处自创前缀 = 两条路径对
 *       「该号码是否已注册」给出不同答案 = 同号重复账号；</li>
 *   <li>每个 {@code .setPhone(x)} 的取值必须是 {@code PhoneColumnCodec.store(...)} /
 *       {@code PhoneColumnCodec.ERASED_VALUE} / {@code null}，
 *       或来自一个初值含 codec 的局部变量；</li>
 *   <li>每个 {@code findByPhone(...)} 都必须与派生键查询同句出现
 *       （明文兜底只是兜底，主判据必须是不可逆派生键——密文列永远等值查不中）。</li>
 *   <li>{@code W1b2 接力补的半件}：同一段方法体里写了带号码身份的 {@code phone}，
 *       就必须成对把 codec 的派生键（或注销墓碑）写进 {@code openid}；
 *       {@code setPhone(null)}（不写号码身份）豁免，媒体/反馈/订单/第三方登录等
 *       不写 {@code phone} 的 {@code openid} 出口不进本条分母（见该条 javadoc 的实测排除）。
 *       原交付正文把本门写成「禁止非 codec 出口写 phone/openid」，
 *       其中 <b>openid 那一半当时只有不变量 1 间接覆盖</b>（只管自创前缀，不管分家写），
 *       现补齐为不变量 4。</li>
 * </ol>
 *
 * <p><b>自带反证</b>：见末尾四组合成源码用例，逐条证明探测器咬得住、且不误伤合规形态。</p>
 */
@DisplayName("W1b-3 静态门：phone / 派生键只能有一个 codec 出口")
class PhoneIdentityCodecExitStaticGateTest {

    private static final String CODEC_FILE = "privacy/PhoneColumnCodec.java";
    private static final String DERIVED_PREFIX_LITERAL = "\"phone:";

    private Path sourceRoot() {
        Path p = Path.of("src", "main", "java");
        if (Files.isDirectory(p)) {
            return p;
        }
        Path alt = Path.of(System.getProperty("user.dir"), "src", "main", "java");
        assertTrue(Files.isDirectory(alt),
                "找不到 src/main/java —— 扫描面为空，不能把【没有判点】当成【全部通过】。尝试过: "
                        + p.toAbsolutePath() + " 与 " + alt.toAbsolutePath());
        return alt;
    }

    private record Violation(String file, int line, String rule, String snippet) {
        String label() {
            return file + ":" + line + " [" + rule + "] " + snippet;
        }
    }

    private List<String> javaFiles() throws IOException {
        try (Stream<Path> walk = Files.walk(sourceRoot())) {
            List<String> out = walk.filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().endsWith(".java"))
                    .map(p -> sourceRoot().relativize(p).toString().replace('\\', '/'))
                    .filter(rel -> !rel.contains("/.mimosa/")) // 编辑器钩子残留，不是源码
                    .sorted(Comparator.naturalOrder())
                    .toList();
            assertFalse(out.isEmpty(), "src/main/java 下一个 .java 都没有，扫描面为空");
            assertTrue(out.size() >= 200,
                    "只扫到 " + out.size() + " 个 .java（下限 200）——扫描根路径出问题，判点覆盖不全");
            return out;
        }
    }

    private String read(String rel) {
        try {
            return Files.readString(sourceRoot().resolve(rel), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("读取源码失败: " + rel, e);
        }
    }

    // ==================== 判点 ====================

    @Test
    @DisplayName("不变量 1：\"phone:\" 派生键前缀只允许出现在 PhoneColumnCodec")
    void derivedKeyPrefixHasExactlyOneHome() throws IOException {
        List<Violation> violations = new ArrayList<>();
        for (String rel : javaFiles()) {
            if (rel.endsWith(CODEC_FILE)) {
                continue;
            }
            String code = stripCommentsKeepLiterals(read(rel));
            int idx = 0;
            while ((idx = code.indexOf(DERIVED_PREFIX_LITERAL, idx)) >= 0) {
                violations.add(new Violation(rel, lineOf(code, idx), "派生键前缀自创出口",
                        code.substring(idx, Math.min(code.length(), idx + 40)).replace('\n', ' ')));
                idx += DERIVED_PREFIX_LITERAL.length();
            }
        }
        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 处在 codec 之外拼手机号派生键前缀"
                        + "（两条路径的派生口径一旦分叉，同号重复账号就是必然结果）：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    @Test
    @DisplayName("不变量 2：每个 setPhone 的取值都必须出自 PhoneColumnCodec（或 null）")
    void phoneColumnHasExactlyOneWriteExit() throws IOException {
        List<Violation> violations = new ArrayList<>();
        for (String rel : javaFiles()) {
            if (rel.endsWith("entity/User.java")) {
                continue; // 实体自身的 setter 定义
            }
            String code = stripCommentsKeepLiterals(read(rel));
            int idx = 0;
            while ((idx = code.indexOf(".setPhone(", idx)) >= 0) {
                int open = idx + ".setPhone".length();
                int close = matchingParen(code, open);
                assertTrue(close > open, rel + " 的 setPhone 括号不配对，扫描器口径需复核");
                String arg = code.substring(open + 1, close).strip();
                if (!phoneValueIsCodecSourced(code, arg)) {
                    violations.add(new Violation(rel, lineOf(code, idx), "phone 非 codec 出口", arg));
                }
                idx = close + 1;
            }
        }
        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 处绕过 PhoneColumnCodec 写 users.phone：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    @Test
    @DisplayName("不变量 3：每个 findByPhone 兜底查询都必须与派生键主查询同句")
    void phoneFallbackQueryIsAlwaysPairedWithDerivedKey() throws IOException {
        List<Violation> violations = new ArrayList<>();
        for (String rel : javaFiles()) {
            if (rel.endsWith("repository/UserRepository.java")) {
                continue; // 仓储方法声明本身
            }
            String code = stripCommentsKeepLiterals(read(rel));
            int idx = 0;
            while ((idx = code.indexOf("findByPhone(", idx)) >= 0) {
                String statement = enclosingStatement(code, idx);
                if (!statement.contains("findByOpenid")) {
                    violations.add(new Violation(rel, lineOf(code, idx), "明文兜底没有主判据",
                            statement.replaceAll("\\s+", " ").strip()));
                }
                idx += "findByPhone(".length();
            }
        }
        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 处只按明文/密文等值查手机号而不问派生键"
                        + "（密文列随机 IV ⇒ 等值查询恒不命中 ⇒ 同号重复账号）：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    /**
     * 阳性对照：本仓确实存在被本门管的出口（否则三条不变量可能只是扫了个空集）。
     */
    @Test
    @DisplayName("阳性对照：codec 出口/派生键前缀在盘上真实存在（扫描面不是空集）")
    void gateHasRealTargets() throws IOException {
        List<String> files = javaFiles();
        String codecRel = files.stream()
                .filter(rel -> rel.endsWith(CODEC_FILE))
                .findFirst()
                .orElseThrow(() -> new AssertionError("扫描面里没有 PhoneColumnCodec.java —— 判点失去被测物"));
        String codec = read(codecRel);
        assertTrue(codec.contains(DERIVED_PREFIX_LITERAL),
                "codec 自身都不再持有派生键前缀 ⇒ 不变量 1 的分母已失效，需复核扫描面");
        long codecExits = files.stream()
                .map(this::read)
                .filter(c -> c.contains("PhoneColumnCodec.store("))
                .count();
        assertTrue(codecExits >= 3,
                "只有 " + codecExits + " 个文件经 codec 写 phone —— 少于既有的注册/后台建号/换号三处，"
                        + "说明写入方被绕开或扫描面出问题");
    }

    // ==================== 探测器实现 ====================

    /** setPhone 取值是否出自 codec：直接调用 / ERASED_VALUE / null / 初值含 codec 的局部变量。 */
    private boolean phoneValueIsCodecSourced(String code, String arg) {
        if (arg.contains("PhoneColumnCodec") || arg.equals("null")) {
            return true;
        }
        if (arg.matches("[A-Za-z_$][A-Za-z0-9_$]*")) {
            // 局部变量：必须能在本文件里找到「X = <含 PhoneColumnCodec 的表达式>;」或「X = null;」
            String quoted = java.util.regex.Pattern.quote(arg);
            return java.util.regex.Pattern.compile(quoted + "\\s*=\\s*[^;]*PhoneColumnCodec")
                    .matcher(code).find()
                    || java.util.regex.Pattern.compile(quoted + "\\s*=\\s*null\\s*;")
                    .matcher(code).find();
        }
        return false;
    }

    /** 取包含 idx 的语句文本：向前到最近的 ; / { / }，向后到括号深度 0 处的 ;。 */
    private String enclosingStatement(String code, int idx) {
        int start = idx;
        while (start > 0) {
            char c = code.charAt(start - 1);
            if (c == ';' || c == '{' || c == '}') {
                break;
            }
            start--;
        }
        int depth = 0;
        int end = idx;
        while (end < code.length()) {
            char c = code.charAt(end);
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth = Math.max(0, depth - 1);
            } else if (c == ';' && depth == 0) {
                break;
            }
            end++;
        }
        return code.substring(start, Math.min(end + 1, code.length()));
    }

    private int matchingParen(String s, int openIdx) {
        int depth = 0;
        for (int i = openIdx; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
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

    /** 剥离块/行注释（保留字符串字面量与下标对齐）。 */
    static String stripCommentsKeepLiterals(String src) {
        char[] a = src.toCharArray();
        char[] out = a.clone();
        int n = a.length;
        int i = 0;
        while (i < n) {
            char c = a[i];
            if (c == '"' || c == '\'') {
                // 字面量内部不识别注释起始
                char quote = c;
                i++;
                while (i < n) {
                    if (a[i] == '\\') {
                        i += 2;
                        continue;
                    }
                    if (a[i] == quote) {
                        i++;
                        break;
                    }
                    i++;
                }
                continue;
            }
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
            } else {
                i++;
            }
        }
        return new String(out);
    }

    /**
     * 不变量 4：同一处写入若把手机号身份写进 {@code users.phone}，
     * 那么同一段方法体里的 {@code users.openid} 也必须出自 codec（派生键或注销墓碑）。
     *
     * <p><b>为什么这是 W1b-3 缺的那半</b>：派生键查重看的是 {@code openid}，
     * 号码本体看的是 {@code phone}。两条列分家写（{@code phone} 走 codec、
     * {@code openid} 随手塞一个微信 hash / 运营手填值）时的失效方向是
     * 「下一任持号者两条判据都问不到这一行」⇒ 同号重复账号复活，
     * 而 {@code PhoneBindingController} 改造前正是这个形状。所以本条把「成对」钉死。</p>
     *
     * <p><b>不误伤其它出口</b>（实测媒体 / 反馈签名 / 订单 / DTO 掩码 / 第三方登录 / 设备号
     * 这些写 {@code openid} 的地方都不与本规则相遇）：本条只在<b>同一段方法体里同时出现
     * {@code .setPhone()}</b> 时才生效，且 {@code setPhone(null)}（不写号码身份，如体验账号
     * 建号）直接豁免。扫描面因此天然排除：媒体与反馈包里一次都没有 {@code setPhone}
     * （{@code grep -c "\\.setPhone(" media feedback} = 0/0），第三方登录与订单写的是各自的
     * openid 语义列，与手机号身份列无关。</p>
     */
    @Test
    @DisplayName("不变量 4：写了 phone 身份就必须成对写 codec 的 openid（媒体/反馈等出口不受影响）")
    void phoneIdentityWriteForcesPairedCodecOpenid() throws IOException {
        List<Violation> violations = new ArrayList<>();
        for (String rel : javaFiles()) {
            if (rel.endsWith("entity/User.java")) {
                continue;
            }
            String code = stripCommentsKeepLiterals(read(rel));
            for (int[] body : methodBodies(code)) {
                String method = code.substring(body[0], body[1] + 1);
                if (!method.contains(".setPhone(")) {
                    continue; // 本段不写 users.phone ⇒ 它的 openid 语义不归本条管
                }
                if (phoneWriteCarriesNoIdentity(method)) {
                    continue; // setPhone(null)：没写号码身份（体验账号建号），不要求成对
                }
                int idx = 0;
                while ((idx = method.indexOf(".setOpenid(", idx)) >= 0) {
                    int open = idx + ".setOpenid".length();
                    int close = matchingParen(method, open);
                    assertTrue(close > open, rel + " 的 setOpenid 括号不配对，扫描器口径需复核");
                    String arg = method.substring(open + 1, close).strip();
                    if (!openidValueIsCodecSourced(code, arg)) {
                        violations.add(new Violation(rel, lineOf(code, body[0] + idx),
                                "phone 身份未成对写 codec openid", arg));
                    }
                    idx = close + 1;
                }
            }
        }
        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 处把手机号身份写进 users.phone 却没把派生键成对写进"
                        + " users.openid（两条列分家 ⇒ 查重两条判据都问不到 ⇒ 同号重复账号复活）：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    /** {@code setPhone} 的取值是否根本不带号码身份（{@code null} / codec 的已注销哨兵）。 */
    private boolean phoneWriteCarriesNoIdentity(String method) {
        int idx = method.indexOf(".setPhone(");
        while (idx >= 0) {
            int open = idx + ".setPhone".length();
            int close = matchingParen(method, open);
            String arg = method.substring(open + 1, close).strip();
            boolean identityCarrying = arg.contains("PhoneColumnCodec.store")
                    || (arg.matches("[A-Za-z_$][A-Za-z0-9_$]*")
                        && !arg.equals("null")
                        && java.util.regex.Pattern
                                .compile(java.util.regex.Pattern.quote(arg) + "\\s*=\\s*[^;]*store\\(")
                                .matcher(method).find());
            if (!identityCarrying) {
                return true;
            }
            idx = method.indexOf(".setPhone(", close);
        }
        return false;
    }

    /** openid 取值是否出自 codec 侧：派生键 / 已注销墓碑 / null / 初值含上述来源的局部变量。 */
    private boolean openidValueIsCodecSourced(String code, String arg) {
        if (arg.equals("null") || arg.contains("PhoneColumnCodec") || arg.contains("ErasedValues")) {
            return true;
        }
        if (arg.matches("[A-Za-z_$][A-Za-z0-9_$]*")) {
            String quoted = java.util.regex.Pattern.quote(arg);
            return java.util.regex.Pattern.compile(
                            quoted + "\\s*=\\s*[^;]*(PhoneColumnCodec|ErasedValues)")
                    .matcher(code).find();
        }
        return false;
    }

    /**
     * 列出「方法体」字符区间：类体是深度 0→1，方法体是深度 1→2，
     * 故凡是把深度从 1 抬到 2 的左括号及其配对右括号就是方法体。
     */
    private List<int[]> methodBodies(String code) {
        List<int[]> out = new ArrayList<>();
        java.util.Deque<Integer> stack = new java.util.ArrayDeque<>();
        int depth = 0;
        for (int i = 0; i < code.length(); i++) {
            char c = code.charAt(i);
            if (c == '{') {
                if (depth == 1) {
                    stack.push(i);
                }
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 1 && !stack.isEmpty()) {
                    out.add(new int[] {stack.pop(), i});
                }
            }
        }
        return out;
    }

    @Test
    @DisplayName("反证：不变量 4 咬得住「写 phone 却把 openid 塞成微信 hash」")
    void scannerFlagsUnpairedOpenidWrite() {
        String bad = """
                package p;
                class X {
                    void bind(User user, AesEncryptor enc, String phone, String wechatOpenid) {
                        String cipher = PhoneColumnCodec.store(enc, phone);
                        user.setPhone(cipher);
                        user.setOpenid(wechatOpenid);
                    }
                }
                """;
        String code = stripCommentsKeepLiterals(bad);
        List<String> found = new ArrayList<>();
        for (int[] body : methodBodies(code)) {
            String method = code.substring(body[0], body[1] + 1);
            if (!method.contains(".setPhone(") || phoneWriteCarriesNoIdentity(method)) {
                continue;
            }
            int idx = method.indexOf(".setOpenid(");
            if (idx >= 0) {
                int close = matchingParen(method, idx + ".setOpenid".length());
                if (!openidValueIsCodecSourced(code, method.substring(idx + ".setOpenid".length() + 1, close))) {
                    found.add("命中未成对写");
                }
            }
        }
        assertEquals(1, found.size(), "不变量 4 没抓到 phone 与 openid 分家写 ⇒ 形同虚设");

        String good = """
                package p;
                class X {
                    void bind(User user, AesEncryptor enc, String phone) {
                        String derived = PhoneColumnCodec.derivedOpenid(phone);
                        user.setPhone(PhoneColumnCodec.store(enc, phone));
                        user.setOpenid(derived);
                    }
                }
                """;
        String gcode = stripCommentsKeepLiterals(good);
        for (int[] body : methodBodies(gcode)) {
            String method = gcode.substring(body[0], body[1] + 1);
            if (!method.contains(".setPhone(") || phoneWriteCarriesNoIdentity(method)) {
                continue;
            }
            int idx = method.indexOf(".setOpenid(");
            int close = matchingParen(method, idx + ".setOpenid".length());
            assertTrue(openidValueIsCodecSourced(gcode,
                            method.substring(idx + ".setOpenid".length() + 1, close)),
                    "合规的成对写法被误伤");
        }
    }

    @Test
    @DisplayName("反证：体验账号建号（setPhone(null) + guest 随机 openid）不被本条误伤")
    void guestProvisioningIsExempt() {
        String guest = """
                package p;
                class X {
                    void createGuest(User newUser) {
                        newUser.setOpenid("guest:" + randomUuid());
                        newUser.setPhone(null);
                    }
                }
                """;
        String code = stripCommentsKeepLiterals(guest);
        for (int[] body : methodBodies(code)) {
            String method = code.substring(body[0], body[1] + 1);
            if (method.contains(".setPhone(")) {
                assertTrue(phoneWriteCarriesNoIdentity(method),
                        "没写号码身份的建号路径被当成需要成对派生键 ⇒ 不变量 4 误伤");
            }
        }
    }

    // ==================== 反证：证明探测器能红 ====================

    @Test
    @DisplayName("反证：codec 外自创 \"phone:\" 前缀必被咬住")
    void scannerFlagsForeignDerivedKeyPrefix() {
        String bad = """
                package p;
                class X {
                    void bind(User u, String phone) {
                        u.setOpenid("phone:" + sha(phone));
                    }
                }
                """;
        String code = stripCommentsKeepLiterals(bad);
        assertTrue(code.indexOf(DERIVED_PREFIX_LITERAL) >= 0, "探测器看不见 codec 外的派生键前缀");
    }

    @Test
    @DisplayName("反证：注释里出现的 \"phone: 字样不算违规出口")
    void scannerIgnoresCommentMentions() {
        String commented = """
                package p;
                class X {
                    // 约定：openid 存不可逆派生键 "phone:"+SHA-256(手机号)
                    void noop() {
                    }
                    /* 同样是注释里的 "phone:xxx" */
                    String s = "真实的字符串字面量不在注释里";
                }
                """;
        String code = stripCommentsKeepLiterals(commented);
        assertFalse(code.contains(DERIVED_PREFIX_LITERAL), "注释里的字样被当成代码出口 ⇒ 判点会误伤");
        assertTrue(code.contains("\"真实的字符串字面量不在注释里\""),
                "字面量必须保留（不变量 1 与 2 都依赖它）");
    }

    @Test
    @DisplayName("反证：绕过 codec 的 setPhone 必被咬住，合规形态不误伤")
    void scannerFlagsPhoneWriteBypassingCodec() {
        String bad = """
                package p;
                class X {
                    void bind(User u, String phone) {
                        u.setPhone(enc.encrypt(phone));
                    }
                }
                """;
        String code = stripCommentsKeepLiterals(bad);
        int at = code.indexOf(".setPhone(");
        int open = at + ".setPhone".length();
        String arg = code.substring(open + 1, matchingParen(code, open)).strip();
        assertFalse(phoneValueIsCodecSourced(code, arg), "绕过 codec 的 phone 写入没被抓到");

        String good = """
                package p;
                class X {
                    void bind(User u, String phone) {
                        String cipher = PhoneColumnCodec.store(enc, phone);
                        u.setPhone(cipher);
                        u.setPhone(PhoneColumnCodec.store(enc, phone));
                        u.setPhone(PhoneColumnCodec.ERASED_VALUE);
                        u.setPhone(null);
                    }
                }
                """;
        String gcode = stripCommentsKeepLiterals(good);
        int idx = 0;
        List<String> offenders = new ArrayList<>();
        while ((idx = gcode.indexOf(".setPhone(", idx)) >= 0) {
            int argOpen = gcode.indexOf('(', idx + 1);
            String a = gcode.substring(argOpen + 1, matchingParen(gcode, argOpen)).strip();
            if (!phoneValueIsCodecSourced(gcode, a)) {
                offenders.add(a);
            }
            idx = argOpen + 1;
        }
        assertEquals(List.of(), offenders, "合规的 codec 出口被误伤: " + offenders);
    }

    @Test
    @DisplayName("反证：只问明文而不问派生键的查重必被咬住")
    void scannerFlagsUnpairedPhoneLookup() {
        String bad = """
                package p;
                class X {
                    boolean exists(UserRepository repo, String phone) {
                        return repo.findByPhone(phone).isPresent();
                    }
                }
                """;
        String code = stripCommentsKeepLiterals(bad);
        String st = enclosingStatement(code, code.indexOf("findByPhone("));
        assertFalse(st.contains("findByOpenid"), "没有主判据的明文查重没被抓到");

        String good = """
                package p;
                class X {
                    boolean exists(UserRepository repo, String derived, String phone) {
                        return repo.findByOpenid(derived).isPresent()
                                || repo.findByPhone(phone).isPresent();
                    }
                }
                """;
        String gcode = stripCommentsKeepLiterals(good);
        assertTrue(enclosingStatement(gcode, gcode.indexOf("findByPhone(")).contains("findByOpenid"),
                "合规的「派生键优先 + 明文兜底」被误伤");
    }
}
