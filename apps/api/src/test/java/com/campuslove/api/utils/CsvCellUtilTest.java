package com.campuslove.api.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * {@link CsvCellUtil} 单元测试（P2 CSV 公式注入统一收口，2026-10-31）。
 *
 * <p><b>钉住的契约</b>：以 {@code = + - @ Tab CR} 开头的值必须被前置单引号中和，
 * 且「中和」要在电子表格实际看到的字符上成立——即先按 RFC 4180 剥掉外层引号、
 * 还原双写的内部引号之后，首字符仍不能是危险字符。普通值必须<b>逐字不变</b>
 * （转义只用于挡公式，不得改写数据内容）。</p>
 *
 * <p>之所以强调「引号包裹救不了」：修复前两个管理端导出只做 RFC 4180 转义，
 * {@code "=cmd|'/c calc'!A0"} 在 Excel 里会被剥掉引号后按公式/DDE 执行——
 * {@link #quotingAloneDoesNotStopFormula()} 用反例把这个认知钉住，
 * 防止后来人「只补引号不加前缀」。</p>
 */
@DisplayName("CsvCellUtil - 公式注入中和 + RFC 4180 转义")
class CsvCellUtilTest {

    /** 电子表格会当成公式/特殊分隔符处理的首字符 */
    private static final List<String> DANGEROUS_FIRST_CHARS = List.of("=", "+", "-", "@", "\t", "\r");

    /** 经典 DDE payload（Excel 打开即弹「是否启动外部内容」） */
    private static final String DDE_PAYLOAD = "cmd|'/c calc'!A0";

    @Test
    @DisplayName("每个危险首字符开头的值都被前置单引号，且剥引号后首字符不再是危险字符")
    void dangerousFirstChars_areNeutralised() {
        for (String prefix : DANGEROUS_FIRST_CHARS) {
            String payload = prefix + DDE_PAYLOAD;
            String cell = CsvCellUtil.escape(payload);

            String effective = unquote(cell);
            assertEquals("'" + payload, effective,
                    "首字符 [" + prefix + "] 应被前置单引号中和，实际单元格: " + cell);
            assertFalse(DANGEROUS_FIRST_CHARS.contains(String.valueOf(effective.charAt(0))),
                    "剥掉外层引号后首字符仍不得是危险字符，实际: " + effective);
        }
    }

    @Test
    @DisplayName("只做引号包裹（修复前的实现）挡不住公式：反例证明必须前置单引号")
    void quotingAloneDoesNotStopFormula() {
        String formula = "=" + DDE_PAYLOAD;
        String legacyStyle = "\"" + formula.replace("\"", "\"\"") + "\"";
        // Excel 读取时会剥掉 RFC 4180 的外层引号，剩下的仍然是以 = 开头的公式
        assertTrue(unquote(legacyStyle).startsWith("="),
                "反例：仅引号包裹在剥引号后依旧暴露公式首字符");
        assertTrue(CsvCellUtil.escape(formula).startsWith("'"),
                "而 CsvCellUtil 的产物前置了单引号");
    }

    @Test
    @DisplayName("普通值逐字不变：中文名 / 时间 / 危险字符只出现在中间的值都不被改写")
    void normalValues_areUnchanged() {
        assertEquals("张三", CsvCellUtil.escape("张三"));
        assertEquals("2026-10-30 12:00:00", CsvCellUtil.escape("2026-10-30 12:00:00"));
        assertEquals("joined", CsvCellUtil.escape("joined"));
        assertEquals("LVIPABCD2345", CsvCellUtil.escape("LVIPABCD2345"));
        // 危险字符只出现在中间（非首字符）时不构成公式起点，不应被改写
        assertEquals("a=b", CsvCellUtil.escape("a=b"));
        assertEquals("10-20", CsvCellUtil.escape("10-20"));
        assertEquals("邮箱 someone@example.com", CsvCellUtil.escape("邮箱 someone@example.com"));
    }

    @Test
    @DisplayName("null / 空串渲染为空串，绝不抛异常")
    void nullAndEmpty_renderAsEmpty() {
        assertEquals("", CsvCellUtil.escape(null));
        assertEquals("", CsvCellUtil.escape(""));
        assertEquals("", CsvCellUtil.row((Object[]) null));
        assertEquals("", CsvCellUtil.row());
        assertEquals(",", CsvCellUtil.row(null, null));
    }

    @Test
    @DisplayName("含逗号/引号/换行的值按 RFC 4180 包裹并双写内部引号")
    void structuralCharacters_areQuotedAndDoubled() {
        assertEquals("\"hello, world\"", CsvCellUtil.escape("hello, world"));
        assertEquals("\"说\"\"引号\"\"了\"", CsvCellUtil.escape("说\"引号\"了"));
        assertEquals("\"两\r\n行\"", CsvCellUtil.escape("两\r\n行"));

        // 两条规则叠加：既要前置单引号（挡公式），也要外层引号 + 内部双写（保结构）
        String cell = CsvCellUtil.escape("=1,2");
        assertEquals("\"'=1,2\"", cell, "公式前缀与逗号必须同时被处理");
        assertEquals("'=1,2", unquote(cell));
    }

    @Test
    @DisplayName("row()/line() 逐格转义：数字与 null 也走同一条路径，调用方无法漏掉某一列")
    void row_escapesEveryCell() {
        assertEquals("7,'=cmd|'/c calc'!A0,,joined",
                CsvCellUtil.row(7L, "=" + DDE_PAYLOAD, null, "joined"));

        // 负数：为挡公式刻意接受前导单引号（宁可多一个引号，也不给公式留门）
        assertEquals("'-50", CsvCellUtil.row(-50));

        assertEquals("a,b\r\n", CsvCellUtil.line("a", "b"));
    }

    @Test
    @DisplayName("BOM / CRLF 常量是三个导出场景共用的同一口径")
    void sharedConstants() {
        assertEquals(0xFEFF, CsvCellUtil.BOM);
        assertEquals("\r\n", CsvCellUtil.CRLF);
    }

    /** 模拟电子表格的读取视角：剥掉 RFC 4180 外层引号并还原双写的内部引号。 */
    private static String unquote(String cell) {
        if (cell.length() >= 2 && cell.charAt(0) == '"' && cell.charAt(cell.length() - 1) == '"') {
            return cell.substring(1, cell.length() - 1).replace("\"\"", "\"");
        }
        return cell;
    }
}
