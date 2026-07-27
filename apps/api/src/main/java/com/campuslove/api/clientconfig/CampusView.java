package com.campuslove.api.clientconfig;

/**
 * 学校（校区）视图 DTO（Task 3.6.1）。
 *
 * <p>对应客户端 {@code GET /api/v1/config/campuses} 返回的列表项，
 * 用于驱动「校园认证 / 校区筛选 / 高级筛选」等模块的下拉选项。</p>
 *
 * <p>由后端 {@code ConfigService.loadCampuses()} 返回，5 分钟缓存，
 * 替代客户端 {@code apps/client/src/config/schools.ts} 中的硬编码 SCHOOLS。</p>
 *
 * @param id   学校稳定标识（与认证表 school_name 关联，建议使用拼音首字母或 slug）
 * @param name 学校中文名称（直接展示给用户）
 * @param city 学校所在城市（可选，用于按城市分组筛选）
 */
public record CampusView(
        String id,
        String name,
        String city
) {
}
