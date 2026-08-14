package com.campuslove.api.repository;

import com.campuslove.api.entity.SearchQuery;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 搜索词记录 Repository（2026-08-11 热搜聚合）。
 */
@Repository
public interface SearchQueryRepository extends JpaRepository<SearchQuery, Long> {

    /**
     * 按用户/关键词/日期查询记录（防刷去重判断）。
     */
    Optional<SearchQuery> findByUserIdAndKeywordAndSearchDate(Long userId, String keyword, LocalDate searchDate);

    /**
     * 热搜聚合：近 N 天词频（按天衰减），排除已下架词。
     *
     * @return 每行 [keyword, score]（score = SUM(search_count) / (天衰减)）
     */
    @Query("""
            SELECT sq.keyword, SUM(sq.searchCount) AS total
            FROM SearchQuery sq
            WHERE sq.searchDate >= :since
              AND sq.isRemoved = false
            GROUP BY sq.keyword
            ORDER BY total DESC
            """)
    List<Object[]> aggregateByKeyword(@Param("since") LocalDate since);

    /**
     * 管理端热搜列表（含已下架词，按词频降序）。
     */
    @Query("""
            SELECT sq.keyword, SUM(sq.searchCount) AS total, sq.isRemoved AS removed
            FROM SearchQuery sq
            WHERE sq.searchDate >= :since
            GROUP BY sq.keyword, sq.isRemoved
            ORDER BY total DESC
            """)
    List<Object[]> aggregateForAdmin(@Param("since") LocalDate since);

    /**
     * 批量更新指定关键词的下架状态（热搜下架/恢复，软删防复现）。
     */
    @Modifying
    @Query("UPDATE SearchQuery sq SET sq.isRemoved = :removed WHERE sq.keyword = :keyword")
    int updateRemovedByKeyword(@Param("keyword") String keyword, @Param("removed") boolean removed);

    /**
     * 按关键词查询（管理端定位词条）。
     */
    List<SearchQuery> findByKeyword(String keyword);
}
