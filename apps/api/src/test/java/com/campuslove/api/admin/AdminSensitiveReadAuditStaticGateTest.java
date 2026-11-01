package com.campuslove.api.admin;

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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * W1b-2 静态门：返回 PII 明文列的管理端 GET 必须<b>同时</b>具备档位收紧与审计留痕。
 *
 * <p><b>缺陷本体</b>（第六轮 W1b F-W1b-2）：{@code AdminWhisperController} 把
 * {@code whisper_message.content} 原样铺给 ADMIN/SUPER_ADMIN/AUDITOR 三档，而同域同语义的
 * {@code AdminConversationController} 对非超管一律置 null —— 同一份私密内容换了个页面就换了保密档位。
 * 更糟的是这一类读接口在 {@code audit_log} 里<b>一条都不留</b>（改动前实测 whisper/conversation/
 * realname 三个 GET 的审计计数 = 0/0/0），所以「谁翻了多少条悄悄话」事后无从追查：
 * 档位只防住今天，留痕才管得住「有人用合规身份批量翻完再离职」。</p>
 *
 * <p><b>为什么必须有形态门</b>：运行期判点守得住已知的三个端点，守不住下一个人新加的第四个敏感读口。
 * 本门把「敏感读 = 收紧 + 留痕」这件事钉成三条可判不变量。</p>
 *
 * <p><b>扫描面</b>：{@code src/main/java/com/campuslove/api/admin/**&#47;*.java}（注释剥离、
 * 字符串字面量保留）。</p>
 *
 * <p><b>三条不变量</b>：</p>
 * <ol>
 *   <li><b>审计</b>：方法体（含其注解区）引用了「PII 载体类型」的 {@code @GetMapping}，
 *       必须同时带 {@code @Auditable}。PII 载体类型 = 行内存有私下通讯正文或证件号的实体
 *       （{@code WhisperMessage}/{@code PrivateMessage}/{@code PrivateConversation}/
 *       {@code RealNameCertification}），其成立性由 {@link #piiCarrierTypesReallyCarrySensitiveColumns()}
 *       逐类回源核验，不是我抄一张名单；</li>
 *   <li><b>档位收紧</b>：在上述文件里，每一次「从 PII 载体实体上取正文物列」的出现
 *       （接收者变量声明类型 ∈ PII 载体类型，访问器 ∈
 *       {@code .getContent()}/{@code .getLastMessagePreview()}/{@code .getQuoteContext()}）
 *       都必须落在<b>它自己那一格实参</b>里带档位判据
 *       （{@code isCurrentSuperAdmin}/{@code canSeeContent}）——按实参粒度而非语句粒度判，
 *       因为盘上第一次反向变异证明语句粒度会漏（详见 {@link #enclosingArgument}）。
 *       按<b>接收者类型</b>而不是按访问器名字判定，是为了不被同名 {@code getContent()} 误伤：
 *       {@code Page}/{@code List} 上的同名方法是「取分页元素」，不是取正文物列
 *       （帖子/评论/活动那些 {@code result.getContent()} 一视同仁地不进本门分母）；</li>
 *   <li><b>证件号不出明文</b>：{@code .getIdCardNo()} 只允许出现在「已被 {@code maskIdCardNo} 包住」
 *       的语句里，或出现在 {@code decrypt*}/{@code mask*} 这类<b>变换助手自身的方法体内</b>
 *       （其出口由调用点那条语句的掩码证明）。直接 {@code return entity.getIdCardNo()} 给视图 = 红。</li>
 * </ol>
 *
 * <p><b>自带反证</b>：末尾 6 组合成源码用例 —— 探测器必须咬得住「敏感 GET 不挂审计」
 * 「正文不过档位」「证件号裸奔」三种不合规形态，且不误伤合规形态、不误伤
 * 帖子/评论/反馈这些<b>不是</b> PII 载体的读口。一个永远不会红的判点不叫判点。</p>
 */
@DisplayName("W1b-2 静态门：敏感管理端读口必须收紧 + 留痕")
class AdminSensitiveReadAuditStaticGateTest {

    /** PII 载体类型：这些实体的行里存着「两个人私下说的话」或证件号。 */
    private static final List<String> PII_CARRIER_TYPES = List.of(
            "WhisperMessage", "PrivateMessage", "PrivateConversation", "RealNameCertification");

    /** 私密正文物列访问器（出现即代表本文件有一个正文明文出口）。 */
    private static final List<String> CONTENT_ACCESSORS = List.of(
            ".getContent()", ".getLastMessagePreview()", ".getQuoteContext()");

    /** 档位判据：服务端裁决「这一档能不能看正文」的唯一口径。 */
    private static final List<String> TIER_MARKERS = List.of(
            "isCurrentSuperAdmin", "canSeeContent");

    /** 证件号掩码出口。 */
    private static final String ID_MASK_MARKER = "maskIdCardNo";

    /** 变换助手方法名（{@code decrypt*}/{@code mask*}）：方法体内允许出现明文，出口必须被掩码包住。 */
    private static final Pattern TRANSFORMER_METHOD =
            Pattern.compile("(?:private|public|protected|static)[^;{}(]*\\b((?:decrypt|mask)\\w*)\\s*\\(");

    private Path adminRoot() {
        Path p = Path.of("src", "main", "java", "com", "campuslove", "api", "admin");
        if (Files.isDirectory(p)) {
            return p;
        }
        Path alt = Path.of(System.getProperty("user.dir"),
                "src", "main", "java", "com", "campuslove", "api", "admin");
        assertTrue(Files.isDirectory(alt),
                "找不到 admin 包源码目录 —— 扫描面为空，不能把【没有判点】当成【全部通过】。尝试过: "
                        + p.toAbsolutePath() + " 与 " + alt.toAbsolutePath());
        return alt;
    }

    private List<String> adminJavaFiles() throws IOException {
        try (Stream<Path> walk = Files.walk(adminRoot())) {
            List<String> out = walk.filter(Files::isRegularFile)
                    .filter(f -> f.getFileName().toString().endsWith(".java"))
                    .map(f -> adminRoot().relativize(f).toString().replace('\\', '/'))
                    .filter(rel -> !rel.contains("/.mimosa/"))
                    .sorted(Comparator.naturalOrder())
                    .toList();
            assertTrue(out.size() >= 40,
                    "只扫到 " + out.size() + " 个 admin 源文件（下限 40）——扫描根路径出问题，判点覆盖不全");
            for (String must : List.of("AdminWhisperController.java", "AdminConversationController.java",
                    "AdminRealNameController.java")) {
                assertTrue(out.contains(must),
                        "扫描面没覆盖到 " + must + " —— 本缺陷正出在这些文件上，扫不到它们等于没判");
            }
            return out;
        }
    }

    private String read(String rel) {
        try {
            return Files.readString(adminRoot().resolve(rel), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("读取源码失败: " + rel, e);
        }
    }

    /** 一条违规：文件 + 行 + 规则 + 现场片段。 */
    private record Violation(String file, int line, String rule, String snippet) {
        String label() {
            return file + ":" + line + " [" + rule + "] " + snippet;
        }
    }

    // ==================== 全仓判点 ====================

    @Test
    @DisplayName("不变量 0：PII 载体名单逐类回源核验（名单不是抄的）")
    void piiCarrierTypesReallyCarrySensitiveColumns() {
        Path mainRoot = adminRoot().getParent().getParent(); // .../com/campuslove/api
        for (String type : PII_CARRIER_TYPES) {
            Path entityFile = findEntityFile(mainRoot, type);
            String src = readRel(mainRoot, entityFile);
            boolean hasSensitiveColumn =
                    Pattern.compile("private\\s+String\\s+(content|idCardNo|lastMessagePreview|quoteContext)\\b")
                            .matcher(src).find();
            assertTrue(hasSensitiveColumn,
                    type + " 已不再声明任何正文物列 —— 不变量 1/2 的分母失效，需复核名单与扫描面："
                            + entityFile);
        }
    }

    @Test
    @DisplayName("不变量 1：引用 PII 载体的管理端 GET 必须挂 @Auditable")
    void sensitiveAdminReadEndpointsAreAudited() throws IOException {
        List<Violation> violations = new ArrayList<>();
        for (String rel : adminJavaFiles()) {
            violations.addAll(scanMissingAudit(rel, read(rel)));
        }
        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 个敏感管理端 GET 没有审计留痕"
                        + "（读 PII 不留痕 ⇒ 事后无法判定泄露规模与责任人）：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    @Test
    @DisplayName("不变量 2：私密正文物列的每一处出口都必须过档位判据")
    void privateContentColumnsAreTierGated() throws IOException {
        List<Violation> violations = new ArrayList<>();
        for (String rel : adminJavaFiles()) {
            violations.addAll(scanUntieredContentExit(rel, read(rel)));
        }
        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 处私密正文不经档位判据就离开管理端控制器"
                        + "（同一份私信内容不得因为「走哪个 Controller」而换保密档位）：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    @Test
    @DisplayName("不变量 3：身份证号在管理端只能以掩码形态出现")
    void idCardNumberNeverLeavesInPlaintext() throws IOException {
        List<Violation> violations = new ArrayList<>();
        for (String rel : adminJavaFiles()) {
            violations.addAll(scanUnmaskedIdCardExit(rel, read(rel)));
        }
        assertEquals(List.of(), violations.stream().map(Violation::label).toList(),
                "有 " + violations.size() + " 处证件号未经 maskIdCardNo 就被交出去：\n"
                        + String.join("\n", violations.stream().map(Violation::label).toList()));
    }

    @Test
    @DisplayName("阳性对照：三条不变量今天各自都真的有分母（不是扫了个空集）")
    void gateHasRealTargets() throws IOException {
        int auditedSensitiveGets = 0;
        int tieredContentExits = 0;
        int maskedIdCardExits = 0;
        for (String rel : adminJavaFiles()) {
            String code = stripCommentsKeepLiterals(read(rel));
            for (GetEndpoint e : endpointsOf(code)) {
                if (referencesPiiCarrier(code.substring(e.headerStart(), e.bodyEnd() + 1))) {
                    auditedSensitiveGets++;
                }
            }
            List<String> piiReceivers = piiTypedReceivers(code);
            if (!referencesPiiCarrier(code)) {
                continue; // 本文件不碰 PII 载体，正文物列分母与它无关（与不变量 2 同一口径）
            }
            for (String accessor : CONTENT_ACCESSORS) {
                int idx = 0;
                while ((idx = code.indexOf(accessor, idx)) >= 0) {
                    if (isPiiTypedReceiver(code, idx, piiReceivers)) {
                        tieredContentExits++;
                    }
                    idx += accessor.length();
                }
            }
            int idx = 0;
            while ((idx = code.indexOf(".getIdCardNo()", idx)) >= 0) {
                maskedIdCardExits++;
                idx += ".getIdCardNo()".length();
            }
        }
        assertTrue(auditedSensitiveGets >= 4,
                "只有 " + auditedSensitiveGets + " 个敏感管理端 GET（下限 4：悄悄话列表 + 会话列表/详情/消息）"
                        + " —— 敏感读口被删掉了，或扫描面出问题");
        assertTrue(tieredContentExits >= 4,
                "只有 " + tieredContentExits + " 处「从 PII 载体实体取正文物列」的出口（下限 4：悄悄话 content + "
                        + "会话 preview 两处 + 消息 content/quoteContext）—— 判点失去被测物");
        assertTrue(maskedIdCardExits >= 1,
                "管理端一处都不再触碰 getIdCardNo() —— 不变量 3 的分母已失效，需复核扫描面");
    }

    @Test
    @DisplayName("不误伤：帖子/评论/反馈这类非 PII 载体读口不进本门分母")
    void nonPiiAdminReadsAreNotDraggedIn() throws IOException {
        // 帖子/评论正文也是「content」，但 post/comment 是面向公开的 UGC，不是私信，
        // 把它们算进分母会让本门要么长期红、要么被迫给几十个 GET 挂审计（那就是误伤）。
        for (String rel : List.of("AdminPostController.java", "AdminCommentController.java",
                "AdminFeedbackController.java")) {
            String code = stripCommentsKeepLiterals(read(rel));
            assertTrue(scanMissingAudit(rel, code).isEmpty(),
                    rel + " 不是 PII 载体读口，却被本门判成缺审计 ⇒ 扫描口径误伤："
                            + scanMissingAudit(rel, code));
            assertTrue(scanUntieredContentExit(rel, code).isEmpty(),
                    rel + " 不是 PII 载体读口，却被本门判成正文未收紧 ⇒ 扫描口径误伤："
                            + scanUntieredContentExit(rel, code));
        }
    }

    // ==================== 探测器实现 ====================

    /** 一个 {@code @GetMapping} 端点：注解区起点、方法体起止。 */
    private record GetEndpoint(int headerStart, int annotationStart, int bodyStart, int bodyEnd) {}

    /** 列出源文件（注释已剥离）里所有 @GetMapping 端点。 */
    private List<GetEndpoint> endpointsOf(String code) {
        List<GetEndpoint> out = new ArrayList<>();
        int idx = 0;
        while ((idx = code.indexOf("@GetMapping", idx)) >= 0) {
            int bodyOpen = firstDepthZeroBrace(code, idx);
            if (bodyOpen < 0) {
                idx += "@GetMapping".length();
                continue;
            }
            int declEnd = code.indexOf(';', idx);
            if (declEnd >= 0 && declEnd < bodyOpen) {
                idx = declEnd + 1; // 抽象/接口声明，无方法体
                continue;
            }
            int bodyClose = matchBrace(code, bodyOpen);
            if (bodyClose < 0) {
                idx = bodyOpen + 1;
                continue;
            }
            // 本方法的注解区：从上一个成员边界（; } {）开始，到方法体左括号为止，
            // 这样 @Auditable 写在 @GetMapping 前或后都算数。
            int headerStart = previousMemberBoundary(code, idx) + 1;
            out.add(new GetEndpoint(headerStart, idx, bodyOpen, bodyClose));
            idx = bodyClose + 1;
        }
        return out;
    }

    /** 不变量 1：引用 PII 载体的 GET 缺 @Auditable ⇒ 违规。 */
    private List<Violation> scanMissingAudit(String file, String rawSrc) {
        List<Violation> out = new ArrayList<>();
        String code = stripCommentsKeepLiterals(rawSrc);
        for (GetEndpoint e : endpointsOf(code)) {
            String declAndBody = code.substring(e.headerStart(), e.bodyEnd() + 1);
            if (!referencesPiiCarrier(declAndBody)) {
                continue;
            }
            String annotationRegion = code.substring(e.headerStart(), e.bodyStart());
            if (!annotationRegion.contains("@Auditable")) {
                out.add(new Violation(file, lineOf(code, e.annotationStart()), "敏感读口零审计",
                        snippetAt(code, e.annotationStart())));
            }
        }
        return out;
    }

    /** 不变量 2：私密正文访问器未经档位判据 ⇒ 违规。 */
    private List<Violation> scanUntieredContentExit(String file, String rawSrc) {
        List<Violation> out = new ArrayList<>();
        String code = stripCommentsKeepLiterals(rawSrc);
        if (!referencesPiiCarrier(code)) {
            return out; // 本文件不碰私信/悄悄话实体，正文物列不归本门管（见非误伤用例）
        }
        List<String> piiReceivers = piiTypedReceivers(code);
        for (String accessor : CONTENT_ACCESSORS) {
            int idx = 0;
            while ((idx = code.indexOf(accessor, idx)) >= 0) {
                if (isPiiTypedReceiver(code, idx, piiReceivers)) {
                    String argument = enclosingArgument(code, idx);
                    if (TIER_MARKERS.stream().noneMatch(argument::contains)) {
                        out.add(new Violation(file, lineOf(code, idx), "正文明文出口未过档位",
                                argument.replaceAll("\\s+", " ").strip()));
                    }
                }
                idx += accessor.length();
            }
        }
        return out;
    }

    /** 不变量 3：证件号未经掩码且不在变换助手方法体内 ⇒ 违规。 */
    private List<Violation> scanUnmaskedIdCardExit(String file, String rawSrc) {
        List<Violation> out = new ArrayList<>();
        String code = stripCommentsKeepLiterals(rawSrc);
        List<int[]> transformerSpans = transformerMethodSpans(code);
        int idx = 0;
        while ((idx = code.indexOf(".getIdCardNo()", idx)) >= 0) {
            final int at = idx;
            String statement = enclosingStatement(code, at);
            boolean masked = statement.contains(ID_MASK_MARKER);
            boolean insideTransformer = transformerSpans.stream()
                    .anyMatch(span -> at >= span[0] && at <= span[1]);
            if (!masked && !insideTransformer) {
                out.add(new Violation(file, lineOf(code, at), "证件号明文出口",
                        statement.replaceAll("\\s+", " ").strip()));
            }
            idx = at + ".getIdCardNo()".length();
        }
        return out;
    }

    /** 本段文本是否引用了 PII 载体类型（类型名出现即算；实体与仓储都在名单里）。 */
    private boolean referencesPiiCarrier(String text) {
        return PII_CARRIER_TYPES.stream().anyMatch(text::contains);
    }

    /** 收集「声明类型为 PII 载体」的变量名（方法形参与局部声明都算）。 */
    private List<String> piiTypedReceivers(String code) {
        List<String> names = new ArrayList<>();
        for (String type : PII_CARRIER_TYPES) {
            Matcher m = Pattern.compile("\\b" + type + "\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\b")
                    .matcher(code);
            while (m.find()) {
                names.add(m.group(1));
            }
        }
        return names;
    }

    /** 该 {@code x.getContent()} 的接收者是否声明为 PII 载体类型（否则取的不是正文物列）。 */
    private boolean isPiiTypedReceiver(String code, int accessorIdx, List<String> piiReceivers) {
        int j = accessorIdx - 1;
        while (j >= 0 && Character.isWhitespace(code.charAt(j))) {
            j--;
        }
        int end = j + 1;
        while (j >= 0 && (Character.isLetterOrDigit(code.charAt(j)) || code.charAt(j) == '_'
                || code.charAt(j) == '$')) {
            j--;
        }
        return piiReceivers.contains(code.substring(j + 1, end));
    }

    /** 求出所有 {@code decrypt*}/{@code mask*} 方法体的字符区间（明文允许在其中出现，出口必须被掩码包住）。 */
    private List<int[]> transformerMethodSpans(String code) {
        List<int[]> spans = new ArrayList<>();
        Matcher m = TRANSFORMER_METHOD.matcher(code);
        while (m.find()) {
            int brace = code.indexOf('{', m.end());
            if (brace < 0) {
                continue;
            }
            int close = matchBrace(code, brace);
            if (close > brace) {
                spans.add(new int[] {brace, close});
            }
        }
        return spans;
    }

    private int previousMemberBoundary(String code, int idx) {
        for (int i = idx - 1; i >= 0; i--) {
            char c = code.charAt(i);
            if (c == ';' || c == '{' || c == '}') {
                return i;
            }
        }
        return -1;
    }

    /**
     * 取包含 idx 的<b>实参片段</b>：向前/向后到「同层逗号或括号边界」为止。
     *
     * <p>这里刻意不用 {@code enclosingStatement}（整条语句）——反向变异实测证明语句粒度会漏：
     * 悄悄话视图构造是
     * {@code new AdminWhisperView(id, …, m.getContent(), …, !canSeeContent)}，
     * 把档位三元判据从正文那一格删掉后，末尾 {@code !canSeeContent} 仍在<b>同一条语句</b>里，
     * 语句粒度会把它当成「已收紧」而放过（盘上第一次变异正是这么溜过去的，运行期判点才咬住）。
     * 实参粒度才对齐真实语义：<b>正文明文必须由它自己那一格的判据放行</b>，
     * 旁边另一格传了个档位布尔不算数。</p>
     */
    private String enclosingArgument(String code, int idx) {
        int depth = 0;
        int start = idx;
        while (start > 0) {
            char c = code.charAt(start - 1);
            if (c == ')' || c == ']') {
                depth++;
            } else if (c == '(' || c == '[') {
                if (depth == 0) {
                    break;
                }
                depth--;
            } else if ((c == ',' || c == '{' || c == ';') && depth == 0) {
                break;
            }
            start--;
        }
        depth = 0;
        int end = idx;
        while (end < code.length()) {
            char c = code.charAt(end);
            if (c == '(' || c == '[') {
                depth++;
            } else if (c == ')' || c == ']') {
                if (depth == 0) {
                    break;
                }
                depth--;
            } else if ((c == ',' || c == ';') && depth == 0) {
                break;
            }
            end++;
        }
        return code.substring(start, Math.min(end + 1, code.length())).strip();
    }

    /** 取包含 idx 的语句文本：向前到最近的 ; / { / }，向后到括号深度 0 处的 ;（与 W1b-3 静态门同一口径）。 */
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

    private String snippetAt(String code, int idx) {
        int lineStart = code.lastIndexOf('\n', idx) + 1;
        int lineEnd = code.indexOf('\n', idx);
        return code.substring(lineStart, (lineEnd < 0 ? code.length() : lineEnd)).strip();
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

    private static int lineOf(String s, int idx) {
        int line = 1;
        for (int i = 0; i < idx && i < s.length(); i++) {
            if (s.charAt(i) == '\n') {
                line++;
            }
        }
        return line;
    }

    private Path findEntityFile(Path mainRoot, String type) {
        try (Stream<Path> walk = Files.walk(mainRoot)) {
            return walk.filter(p -> p.getFileName().toString().equals(type + ".java")).findFirst()
                    .orElseThrow(() -> new AssertionError(
                            "PII 载体实体 " + type + ".java 已不在盘上 —— 名单需与扫描面同步复核"));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private String readRel(Path root, Path abs) {
        try {
            return Files.readString(abs, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("读取源码失败: " + abs, e);
        }
    }

    /** 剥离块/行注释（保留字符串字面量与下标对齐；与 W1b-1/W1b-3 静态门同一实现）。 */
    static String stripCommentsKeepLiterals(String src) {
        char[] a = src.toCharArray();
        char[] out = a.clone();
        int n = a.length;
        int i = 0;
        while (i < n) {
            char c = a[i];
            if (c == '"' || c == '\'') {
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

    // ==================== 反证：证明探测器能红 ====================

    private static final String SYNTHETIC = "Synthetic.java";

    /** 合规形态：敏感 GET 带审计、正文过档位、证件号走掩码。 */
    private static final String COMPLIANT = """
            package com.campuslove.api.admin;
            class SynthesizedWhisperController {
                private AdminDataScope adminDataScope;
                @GetMapping
                @Auditable(value = AuditOperation.VIEW_WHISPER, targetType = "WHISPER")
                public AdminPageView<AdminWhisperView> list(int page) {
                    boolean canSeeContent = adminDataScope.isCurrentSuperAdmin();
                    Page<WhisperMessage> result = repository.findAll();
                    List<WhisperMessage> scoped = filterWhispersByCampus();
                    return new AdminPageView<>(result.getContent(), scoped.size(), page, 20, 1);
                }
                static AdminWhisperView of(WhisperMessage m, boolean canSeeContent) {
                    return new AdminWhisperView(m.getId(), m.getSenderId(),
                            canSeeContent ? m.getContent() : null, m.getStatus(), !canSeeContent);
                }
                private String decryptIdCardNo(RealNameCertification entity) {
                    return aesEncryptor.decrypt(entity.getIdCardNo());
                }
                RealNameCertificationView toView(RealNameCertification entity) {
                    return RealNameCertificationView.from(entity,
                            RealNameCertificationView.maskIdCardNo(decryptIdCardNo(entity)));
                }
                List<WhisperMessage> filterWhispersByCampus() {
                    return List.of();
                }
            }
            """;

    @Test
    @DisplayName("反证 1：合规的敏感读口三条不变量都不误伤")
    void compliantShapePassesAllThreeRules() {
        assertTrue(scanMissingAudit(SYNTHETIC, COMPLIANT).isEmpty(),
                "合规形态被判缺审计 ⇒ 判点会长期红：\n" + scanMissingAudit(SYNTHETIC, COMPLIANT));
        assertTrue(scanUntieredContentExit(SYNTHETIC, COMPLIANT).isEmpty(),
                "合规形态被判正文未收紧 ⇒ 判点会长期红：\n" + scanUntieredContentExit(SYNTHETIC, COMPLIANT));
        assertTrue(scanUnmaskedIdCardExit(SYNTHETIC, COMPLIANT).isEmpty(),
                "合规形态被判证件号明文 ⇒ 判点会长期红：\n" + scanUnmaskedIdCardExit(SYNTHETIC, COMPLIANT));
    }

    @Test
    @DisplayName("反证 2：敏感 GET 把 @Auditable 摘掉 ⇒ 必红（正是本次要封的「读 PII 零留痕」）")
    void scannerFlagsSensitiveGetWithoutAudit() {
        String bad = replaceAnnotation(COMPLIANT);
        List<Violation> v = scanMissingAudit(SYNTHETIC, bad);
        assertEquals(1, v.size(), "摘掉 @Auditable 后探测器没抓到 ⇒ 不变量 1 形同虚设");
        assertTrue(v.get(0).rule().contains("敏感读口零审计"), v.get(0).label());
    }

    /** 把合成夹具里那一行 {@code @Auditable} 换成同位置的注释（保留行结构，只动注解本身）。 */
    private static String replaceAnnotation(String src) {
        String out = src.replace(
                "@Auditable(value = AuditOperation.VIEW_WHISPER, targetType = \"WHISPER\")",
                "/* 这一行的审计注解被摘掉了 */");
        assertFalse(out.contains("@Auditable"), "夹具改写失败：@Auditable 还留在文本里，本反证没真正测到东西");
        return out;
    }

    @Test
    @DisplayName("反证 3：正文明文出口不经档位 ⇒ 必红（正是悄悄话改造前的形态）")
    void scannerFlagsContentExitWithoutTier() {
        String bad = COMPLIANT.replace("canSeeContent ? m.getContent() : null", "m.getContent()");
        assertNotSame(COMPLIANT, bad, "合成夹具改写失败，本反证没真正测到东西");
        List<Violation> v = scanUntieredContentExit(SYNTHETIC, bad);
        assertEquals(1, v.size(), "把档位三元判据摘掉后探测器没抓到 ⇒ 不变量 2 形同虚设");
        assertTrue(v.get(0).snippet().contains("getContent"), v.get(0).label());
    }

    @Test
    @DisplayName("反证 4：证件号不经掩码直接进视图 ⇒ 必红")
    void scannerFlagsPlaintextIdCardNumber() {
        String bad = COMPLIANT.replace(
                "RealNameCertificationView.maskIdCardNo(decryptIdCardNo(entity))",
                "entity.getIdCardNo()");
        assertNotSame(COMPLIANT, bad, "合成夹具改写失败，本反证没真正测到东西");
        List<Violation> v = scanUnmaskedIdCardExit(SYNTHETIC, bad);
        assertFalse(v.isEmpty(), "证件号裸奔被放过了 ⇒ 不变量 3 形同虚设");
        assertTrue(v.stream().anyMatch(x -> x.rule().contains("证件号明文出口")),
                v.stream().map(Violation::label).toList().toString());
    }

    @Test
    @DisplayName("反证 5：分页接收者的同名 getContent() 不算正文物列（不误伤 result.getContent()）")
    void pageShapedGetNameIsNotTreatedAsContentColumn() {
        String only = """
                package com.campuslove.api.admin;
                class OnlyPaging {
                    List<WhisperMessage> pageItems(WhisperMessageRepository repository) {
                        Page<WhisperMessage> result = repository.findAll();
                        return result.getContent();
                    }
                }
                """;
        assertTrue(scanUntieredContentExit(SYNTHETIC, only).isEmpty(),
                "分页取元素被当成了正文明文出口 ⇒ 扫描口径误伤：" + scanUntieredContentExit(SYNTHETIC, only));
    }

    @Test
    @DisplayName("反证 6：注释里写 @Auditable/正文访问器不算数（探测器不被字样糊弄）")
    void commentsDoNotSatisfyTheGate() {
        String faked = replaceAnnotation(COMPLIANT) + """

                // @Auditable 这里只是注释里写了字样
                /* .getContent() 与 maskIdCardNo 也都只出现在这段注释里 */
                """;
        assertFalse(scanMissingAudit(SYNTHETIC, faked).isEmpty(),
                "注释里的 @Auditable 字样被判成「已挂审计」 ⇒ 判点是假的");
    }

    private static void assertNotSame(String unexpected, String actual, String message) {
        assertFalse(unexpected.equals(actual), message);
    }
}
