package com.campuslove.api.repository;

import com.campuslove.api.entity.SchoolMajor;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 高校专业字典 Repository（school_majors 表）。
 *
 * <p>只读消费方是 {@code RealConfigService#loadCampuses()}：先按启用学校编码批量取按校档，
 * 再用 {@link #findBySchoolCodeOrderBySortOrderAsc(String)} 传
 * {@link SchoolMajor#GENERIC_SCHOOL_CODE} 取通用基线档作为回退。</p>
 */
public interface SchoolMajorRepository extends JpaRepository<SchoolMajor, Long> {

    /**
     * 取某一档（具体高校编码或 {@link SchoolMajor#GENERIC_SCHOOL_CODE} 基线档）的全部专业，按展示顺序。
     *
     * @param schoolCode 高校编码或基线保留字符
     * @return 专业条目列表；无数据时为空列表（调用方据此判断是否回退）
     */
    List<SchoolMajor> findBySchoolCodeOrderBySortOrderAsc(String schoolCode);

    /**
     * 批量取多所高校的按校专业目录（一次查询装配整份校区列表，避免每校一条 SQL 的 N+1）。
     *
     * <p>结果按 (school_code, sort_order) 升序，所以按 code 分组后组内天然保序，
     * 调用方直接按插入顺序收集 name 即可。</p>
     *
     * @param schoolCodes 高校编码集合（不含基线保留字符）
     * @return 命中的专业条目；某校没有行就等于「该校无专属目录，走基线」
     */
    List<SchoolMajor> findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(Collection<String> schoolCodes);
}
