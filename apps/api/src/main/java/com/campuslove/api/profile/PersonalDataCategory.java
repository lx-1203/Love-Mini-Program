package com.campuslove.api.profile;

import java.util.List;

/**
 * 个人信息导出载荷的单个类别（S2-5，2026-10-30）。
 *
 * <p>刻意采用「表格」形态（列名 + 行值）而非每个类别一个自定义 DTO，原因有二：</p>
 * <ol>
 *   <li>一个逻辑形态可以同时渲染成 JSON（{@code columns} + {@code rows}）与 CSV
 *       （表头 + 数据行），两种 format 下用户看到的内容逐字一致，不存在
 *       "JSON 比 CSV 少字段" 的合规缺口；</li>
 *   <li>类别多达 20+ 个，逐个建 DTO 会让导出契约难以维护。</li>
 * </ol>
 *
 * <p>所有单元格统一为 {@link String}（数字/布尔/时间都做字符串渲染，{@code null} 渲染为
 * 空串），保证两种序列化结果的可比性与 CSV 可直接落表。</p>
 *
 * @param name      机器可读类别名（snake_case，与 CSV 块标题、JSON 字段同名）
 * @param label     人类可读中文标签（仅用于 CSV 块注释与 UI 展示）
 * @param columns   列名（有序，决定 CSV 表头顺序）
 * @param rows      数据行；每行是与 {@link #columns} 等长的字符串列表
 * @param truncated 是否因超过单类导出行数上限而被截断（{@code true} 表示行集不完整）
 */
public record PersonalDataCategory(
        String name,
        String label,
        List<String> columns,
        List<List<String>> rows,
        boolean truncated) {

    /**
     * 构造未截断类别的便捷工厂。
     *
     * @param name    类别名
     * @param label   中文标签
     * @param columns 列名
     * @param rows    数据行
     * @return 类别（{@code truncated = false}）
     */
    public static PersonalDataCategory of(
            String name, String label, List<String> columns, List<List<String>> rows) {
        return new PersonalDataCategory(name, label, List.copyOf(columns), List.copyOf(rows), false);
    }

    /**
     * 构造被行数上限截断的类别（导出侧显式告知调用方"行集不完整"）。
     *
     * @param name    类别名
     * @param label   中文标签
     * @param columns 列名
     * @param rows    数据行（已截断）
     * @return 类别（{@code truncated = true}）
     */
    public static PersonalDataCategory truncated(
            String name, String label, List<String> columns, List<List<String>> rows) {
        return new PersonalDataCategory(name, label, List.copyOf(columns), List.copyOf(rows), true);
    }

    /**
     * 本类别导出的行数。
     *
     * @return 行数
     */
    public int rowCount() {
        return rows.size();
    }
}
