package com.campuslove.api.repository;

/**
 * 字段计数投影接口。
 * 用于 GROUP BY 查询返回 (字段值, 数量) 的简洁结构，
 * Spring Data JPA 会基于接口自动生成代理实现。
 *
 * <p>典型用法：
 * <pre>{@code
 * @Query("SELECT u.pronouns AS field, COUNT(u) AS cnt FROM User u GROUP BY u.pronouns")
 * List<FieldCountProjection> countGroupByPronouns();
 * }</pre>
 */
public interface FieldCountProjection {

    /** 分组字段值（如 pronouns、campusName 等） */
    String getField();

    /** 该分组下的记录数 */
    Long getCnt();
}
