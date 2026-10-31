package com.campuslove.api.profile;

import com.campuslove.api.utils.CsvCellUtil;
import java.util.List;

/**
 * 个人信息导出载荷（S2-5，2026-10-30）。
 *
 * <p>《个人信息保护法》第 45 条要求个人可「查阅、复制」自己的个人信息。本对象是唯一的
 * 导出真相形态：{@code format=json}（缺省）时按原样序列化，{@code format=csv} 时由
 * {@link #toCsv()} 渲染。两者承载的字段集合完全相同——只存在渲染差异，不存在数据差异。</p>
 *
 * <p>空类别仍会输出（{@code rows} 为空数组），便于用户与监管方核对"哪些类别查过了、
 * 结果是零条"，而不是靠猜测区分"没查"与"没数据"。</p>
 *
 * @param userId      被导出主体的用户 ID（恒等于当前登录用户，永不由请求参数决定）
 * @param generatedAt 导出时间（ISO 8601 字符串，业务时区）
 * @param categories  各类别的数据表格，顺序即 CSV 输出顺序
 */
public record PersonalDataExport(
        Long userId,
        String generatedAt,
        List<PersonalDataCategory> categories) {

    /** CSV 行分隔符（RFC 4180 要求 CRLF；与三个导出场景共用 {@link CsvCellUtil#CRLF}） */
    private static final String CRLF = CsvCellUtil.CRLF;

    /**
     * 导出总行数（跨全部类别），供日志与"是否被行数上限截断"的排查使用。
     *
     * @return 总行数
     */
    public int totalRowCount() {
        return categories.stream().mapToInt(PersonalDataCategory::rowCount).sum();
    }

    /**
     * 是否存在被单类行数上限截断的类别。
     *
     * @return true 表示至少一个类别未导出完整行集
     */
    public boolean hasTruncatedCategory() {
        return categories.stream().anyMatch(PersonalDataCategory::truncated);
    }

    /**
     * 渲染为可下载的 CSV 文本（含 UTF-8 BOM，Excel 直接打开中文不乱码）。
     *
     * <p>结构为「每类别一块」，与 {@code format=json} 的类别数组一一对应：</p>
     * <pre>
     * #&lt;分隔说明行&gt;
     * # &lt;label&gt; (&lt;name&gt;) — N 条[, 已截断]
     * col1,col2,...
     * v1,v2,...
     * </pre>
     *
     * <p>单元格转义统一委托 {@link CsvCellUtil#escape(String)}（本类不再有第二份转义实现）：
     * 含逗号/引号/换行时用双引号包裹并双写内部引号；以 {@code = + - @ Tab CR} 开头的值
     * 前置单引号，阻断 CSV 公式注入（用户可控字段如昵称/简介会被 Excel 当公式执行）。
     * 两个管理端导出（活动报名 {@code AdminActivityController}、兑换码
     * {@code AdminPromoCodeController}）与本方法共用同一份实现，新增第四个导出没有
     * "忘记转义"的可能。转义仅影响渲染，不改变数据本身——JSON 形态下值保持原文。</p>
     *
     * @return CSV 全文（调用方以 UTF-8 编码为字节流）
     */
    public String toCsv() {
        StringBuilder sb = new StringBuilder(1024);
        // 前置 UTF-8 BOM，与两个管理端 CSV 导出共用同一常量
        sb.append(CsvCellUtil.BOM);
        sb.append("# 个人信息导出").append(CRLF);
        sb.append("# userId,").append(userId).append(CRLF);
        sb.append("# generatedAt,").append(CsvCellUtil.escape(generatedAt)).append(CRLF);
        for (PersonalDataCategory category : categories) {
            sb.append(CRLF);
            sb.append("# ").append(category.label()).append(" (").append(category.name())
                    .append(") — ").append(category.rowCount()).append(" 条");
            if (category.truncated()) {
                sb.append("（已截断：超过单类别行数上限）");
            }
            sb.append(CRLF);
            if (category.columns().isEmpty()) {
                continue;
            }
            sb.append(joinRow(category.columns())).append(CRLF);
            for (List<String> row : category.rows()) {
                sb.append(joinRow(row)).append(CRLF);
            }
        }
        return sb.toString();
    }

    /** 以逗号连接一行（逐格转义，规则见 {@link CsvCellUtil#row(Object...)}）。 */
    private String joinRow(List<String> cells) {
        return CsvCellUtil.row(cells.toArray());
    }
}
