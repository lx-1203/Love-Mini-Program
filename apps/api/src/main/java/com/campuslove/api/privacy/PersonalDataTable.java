package com.campuslove.api.privacy;

import java.util.List;

/**
 * 注销清除清单里的一张表 = 一个显式决定（P0：2026-10-31「注销不删除」修复）。
 *
 * <p>本记录是「主体数据有哪些」这件事的<b>唯一</b>清单：
 * {@link com.campuslove.api.profile.PersonalDataService} 的导出类别集合必须与
 * {@link PersonalDataTables} 的 {@link #exportCategories()} 并集<b>逐字对齐</b>，
 * 由 {@link PersonalDataTables#assertMatchesExportCategories(List)} 在导出时自检、
 * 由 {@code AccountErasureServiceTest} 在测试期锁死。这样「导出」和「删除」不可能再各写一份清单、
 * 各自漂移（审计 findings 的根因就是删除清单只有 3 列，而导出清单有 27 类）。</p>
 *
 * @param key               清单项唯一键（同一张物理表可有多项，如 {@code likes_outgoing} / {@code likes_inbound}）
 * @param table             物理表名（SQL 里出现，测试据此断言）
 * @param label             人类可读名称
 * @param action            处置决定，见 {@link ErasureAction}
 * @param exportCategories  该表对应 {@code PersonalDataCategory} 的类别名；空集 = 导出未声明、
 *                          但经代码核对确实存着主体数据（属「导出清单的缺口」，见交付说明）
 * @param identifyingColumns 注销后<b>必须不再可读回原值</b>的列名（删除项写的是主键归属列，
 *                          匿名项写被清空的列名）——测试按这份列清单逐条检查 SQL
 * @param statements        执行的 SQL（{@code {uid}} 为主体 userId 占位符）；{@code RETAIN_STATUTORY} 必须为空
 * @param fileUrlSelects    删除/覆盖前要取回并物理删除的对象存储 URL 查询（单列 SELECT，{@code {uid}} 占位）
 * @param viaUserEntity     true 表示 {@code users} 行的身份列由 JPA 托管实体写墓碑
 *                          （{@link AccountErasureService#tombstone}）——因为 Hibernate 不带
 *                          {@code @DynamicUpdate}，提交时会用实体内存值整行回写，
 *                          原生 SQL 先写后被覆盖，所以 users 只能走实体
 * @param rationale         为什么是这个决定（法律义务 / 幂等 / 竞态说明）
 */
public record PersonalDataTable(
        String key,
        String table,
        String label,
        ErasureAction action,
        List<String> exportCategories,
        List<String> identifyingColumns,
        List<String> statements,
        List<String> fileUrlSelects,
        boolean viaUserEntity,
        String rationale) {

    /** 常规清单项构造（users 之外的表都不走实体）。 */
    public static PersonalDataTable of(
            String key, String table, String label, ErasureAction action,
            List<String> exportCategories, List<String> identifyingColumns,
            List<String> statements, List<String> fileUrlSelects, String rationale) {
        return new PersonalDataTable(key, table, label, action, List.copyOf(exportCategories),
                List.copyOf(identifyingColumns), List.copyOf(statements),
                List.copyOf(fileUrlSelects), false, rationale);
    }

    /** users 墓碑项（列由实体写、仅未映射的 JSON 列走原生 SQL）。 */
    public static PersonalDataTable viaUserEntity(
            String key, String table, String label, ErasureAction action,
            List<String> exportCategories, List<String> identifyingColumns,
            List<String> statements, List<String> fileUrlSelects, String rationale) {
        return new PersonalDataTable(key, table, label, action, List.copyOf(exportCategories),
                List.copyOf(identifyingColumns), List.copyOf(statements),
                List.copyOf(fileUrlSelects), true, rationale);
    }

    /** 本清单项是否为「原样保留」。 */
    public boolean retained() {
        return action == ErasureAction.RETAIN_STATUTORY;
    }
}
