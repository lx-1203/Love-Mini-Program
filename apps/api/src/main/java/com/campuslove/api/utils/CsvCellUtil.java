package com.campuslove.api.utils;

/**
 * CSV 单元格安全化工具（P2：CSV 公式注入统一收口，2026-10-31）。
 *
 * <p><b>为什么只有一份实现</b>：项目里有三类 CSV 写出方——活动报名导出
 * （{@code AdminActivityController}）、兑换码导出（{@code AdminPromoCodeController}）、
 * 个人信息自助导出（{@code PersonalDataExport#toCsv()}）。前两处历史上只做
 * RFC 4180 引号转义，把用户可控的昵称原样写进单元格；昵称仅有长度校验、无字符集限制，
 * 于是 {@code =cmd|'/c calc'!A0} 这类值被管理员用 Excel 打开时会触发 DDE 提示
 * ——<b>引号包裹救不了它</b>：Excel 先把引号剥掉还原成 {@code =cmd...}，再按公式执行。
 * 自助导出早已用「前置单引号中和」挡住了这条路径，本工具把那段逻辑抽成唯一入口，
 * 让第四个导出场景没有"忘记转义"的可能。</p>
 *
 * <p>两条规则互相独立、必须同时生效：</p>
 * <ol>
 *   <li><b>公式中和</b>：首字符为 <code>= + - @ \t \r</code> 之一时前置 {@code '}
 *       （单引号让电子表格把该格当纯文本）。放行的字符集与 OWASP CSV injection
 *       建议一致；<code>-</code> 会被前置，所以「负数」导出形态是 {@code '-5}，
 *       这是刻意的取舍——宁可让人看见一个前导引号，也不给公式留门。</li>
 *   <li><b>RFC 4180 结构转义</b>：含逗号 / 双引号 / CR / LF 时用双引号包裹，
 *       内部双引号双写。</li>
 * </ol>
 *
 * <p>本工具<b>只作用于渲染</b>，不改数据本身：数据库与 JSON 形态下值保持原文，
 * 转义发生在写文件的最后一米。</p>
 *
 * <p>用法（首选调 {@link #row(Object...)} / {@link #line(Object...)}，逐格转义是内置的，
 * 调用方无法"漏掉"某一列）：</p>
 * <pre>{@code
 * StringBuilder sb = new StringBuilder();
 * sb.append(CsvCellUtil.BOM);
 * sb.append(CsvCellUtil.line("用户ID", "昵称", "报名时间"));
 * sb.append(CsvCellUtil.line(enrollment.getUserId(), user.getNickname(), enrolledAt));
 * }</pre>
 *
 * <p>设计原则：纯静态方法 + 私有构造器，无共享可变状态，对 {@code null} 安全降级
 * （渲染为空串），永不抛出 {@link NullPointerException}。</p>
 *
 * @since 2026-10-31
 */
public final class CsvCellUtil {

    /** RFC 4180 要求的行分隔符（CRLF） */
    public static final String CRLF = "\r\n";

    /** UTF-8 BOM：Excel 直接打开中文表头不乱码，三个导出场景口径一致 */
    public static final char BOM = '\uFEFF';

    /**
     * 公式注入危险首字符集：{@code =}（公式）、{@code +} {@code -}（算术/负数公式）、
     * {@code @}（某些本地化下的公式前缀）、制表符与 CR（部分解析器把它当分隔符，
     * 且 Excel 会在剥离引号后重新暴露公式首字符）。
     */
    private static final String FORMULA_PREFIX_CHARS = "=+-@\t\r";

    /** 中和前缀：单引号让电子表格把单元格当纯文本 */
    private static final char NEUTRALISING_PREFIX = '\'';

    private CsvCellUtil() {
        // 工具类，禁止实例化
    }

    /**
     * CSV 单元格转义 + 公式注入中和（写出 CSV 前唯一允许的字符串处理入口）。
     *
     * @param value 原始值（可为 null，渲染为空串）
     * @return 可安全写入 CSV 的值；null/空串返回 {@code ""}
     */
    public static String escape(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        String guarded = value;
        if (FORMULA_PREFIX_CHARS.indexOf(guarded.charAt(0)) >= 0) {
            guarded = NEUTRALISING_PREFIX + guarded;
        }
        if (guarded.indexOf(',') >= 0 || guarded.indexOf('"') >= 0
                || guarded.indexOf('\n') >= 0 || guarded.indexOf('\r') >= 0) {
            return '"' + guarded.replace("\"", "\"\"") + '"';
        }
        return guarded;
    }

    /**
     * 把若干值渲染成一行（逐格走 {@link #escape(String)}，逗号连接，<b>不含</b>行尾符）。
     *
     * <p>非字符串值（Long/Integer/BigDecimal...）先 {@code String.valueOf} 再转义，
     * 因此「以 {@code -} 开头的数值」同样被中和——不要为了保住负号而绕过本方法。</p>
     *
     * @param cells 单元格值（null 元素渲染为空串）
     * @return 一行 CSV 文本（无行尾符）
     */
    public static String row(Object... cells) {
        if (cells == null || cells.length == 0) {
            return "";
        }
        StringBuilder line = new StringBuilder(cells.length * 16);
        for (int i = 0; i < cells.length; i++) {
            if (i > 0) {
                line.append(',');
            }
            line.append(escape(cells[i] == null ? "" : String.valueOf(cells[i])));
        }
        return line.toString();
    }

    /**
     * 同 {@link #row(Object...)}，并追加 CRLF 行尾（表头与数据行都推荐用它）。
     *
     * @param cells 单元格值（null 元素渲染为空串）
     * @return 一行 CSV 文本（以 {@link #CRLF} 结尾）
     */
    public static String line(Object... cells) {
        return row(cells) + CRLF;
    }
}
