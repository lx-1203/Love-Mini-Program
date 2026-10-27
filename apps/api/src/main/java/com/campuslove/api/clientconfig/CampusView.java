package com.campuslove.api.clientconfig;

import java.util.List;

/**
 * 学校（校区）视图 DTO（Task 3.6.1；majors 字段：校园专业字典后端真源）。
 *
 * <p>对应客户端 {@code GET /api/v1/config/campuses} 返回的列表项，
 * 用于驱动「校园认证 / 校区筛选 / 高级筛选」等模块的下拉选项。</p>
 *
 * <p>由后端 {@code ConfigService.loadCampuses()} 返回，5 分钟缓存，
 * 替代客户端 {@code apps/client/src/config/schools.ts} 中的硬编码 SCHOOLS。</p>
 *
 * @param id          学校稳定标识（与认证表 school_name 关联，建议使用拼音首字母或 slug）
 * @param name        学校中文名称（直接展示给用户）
 * @param city        学校所在城市（可选，用于按城市分组筛选）
 * @param memberCount 该校在籍用户数；null 表示当前不可知（降级/mock 档），客户端不得用 0 顶替
 * @param postCount   该校用户发布的可见动态数；null 语义同 {@link #memberCount}
 * @param majors      该校专业目录（picker 选项顺序即列表顺序）。
 *                    真源为 {@code school_majors} 表：命中按校档则给按校目录，
 *                    没有按校数据时由后端回退通用基线档（并输出一行日志，见
 *                    {@link RealConfigService#loadCampuses()}），因此这里下发的一般是基线而非空值。
 *                    {@code null} 只出现在「连基线都取不到」的降级路径，语义是
 *                    「后端没有目录数据，客户端自行回退本地常量」——
 *                    客户端两种情况都不得当成「这所学校没有专业」渲染成空列表
 * @param majorsSource majors 的来源档：{@code "school"} = 命中该校专属目录，
 *                    {@code "baseline"} = 回退通用基线档，{@code null} = 连基线都没有。
 *                    加这个字段的理由：17 所学校当前全部落在基线档，而客户端只知道"有 67 条专业"，
 *                    分不出这是按校真源还是通用目录 ⇒ 界面会让人以为看到了本校专业。
 *                    档位必须由后端说，客户端不得自己猜（它看不到表）。
 */
public record CampusView(
        String id,
        String name,
        String city,
        Integer memberCount,
        Integer postCount,
        List<String> majors,
        String majorsSource
) {

    public CampusView {
        // 防御性不可变：缓存里放的是引用，别让下游一改就污染整个 5 分钟缓存
        if (majors != null) {
            majors = List.copyOf(majors);
        }
    }

    /** 无统计、无专业目录的构造（降级路径使用；可空字段保持 null 而非伪值）。 */
    public CampusView(String id, String name, String city) {
        this(id, name, city, null, null, null, null);
    }

    /** 只有专业目录、没有统计的构造（内置默认列表与 mock 档使用）。这些目录一律来自通用基线档。 */
    public CampusView(String id, String name, String city, List<String> majors) {
        this(id, name, city, null, null, majors, "baseline");
    }
}
