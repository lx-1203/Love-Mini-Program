package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.repository.SearchQueryRepository;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 热搜词管理控制器（2026-08-11）。
 *
 * <p>运营操纵热搜：查看热搜词列表（含已下架）、下架/恢复热搜词。
 * 下架为软删（is_removed=1），可恢复，防运营事故。</p>
 *
 * <p>归属 /api/v1/admin/search/hot；URL 层 /api/v1/admin/** 已限制 ADMIN 角色，
 * 方法层 @PreAuthorize 深度防御。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/search/hot")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminHotSearchController {

    /** 热搜聚合窗口（近 7 天） */
    private static final int HOT_DAYS = 7;

    private final SearchQueryRepository searchQueryRepository;

    public AdminHotSearchController(SearchQueryRepository searchQueryRepository) {
        this.searchQueryRepository = searchQueryRepository;
    }

    /**
     * 热搜词列表（含已下架词，按词频降序）。
     */
    @GetMapping
    public AdminPageView<AdminHotSearchView> listHotSearches(
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) int pageSize) {
        SecurityUtils.getCurrentUserId();
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));

        LocalDate since = LocalDate.now().minusDays(HOT_DAYS);
        List<Object[]> rows = searchQueryRepository.aggregateForAdmin(since);
        // 内存分页（词条量小，聚合结果本身有限）
        int from = Math.min((safePage - 1) * safeSize, rows.size());
        int to = Math.min(from + safeSize, rows.size());
        List<AdminHotSearchView> items = rows.subList(from, to).stream()
                .map(r -> new AdminHotSearchView(
                        (String) r[0],
                        ((Number) r[1]).longValue(),
                        Boolean.TRUE.equals(r[2])))
                .toList();
        return new AdminPageView<>(items, rows.size(), safePage, safeSize,
                AdminPageView.calculateTotalPages(rows.size(), safeSize));
    }

    /**
     * 下架热搜词（is_removed=1 软删，C 端热搜不再展示）。
     */
    @PostMapping("/{keyword}/remove")
    @Transactional
    public ResponseEntity<Object> removeHotSearch(@PathVariable("keyword") String keyword) {
        SecurityUtils.getCurrentUserId();
        int updated = searchQueryRepository.updateRemovedByKeyword(keyword, true);
        return ResponseEntity.ok(java.util.Map.of(
                "keyword", keyword, "removed", true, "updated", updated, "success", true));
    }

    /**
     * 恢复热搜词（is_removed=0，重新进入 C 端热搜）。
     */
    @PostMapping("/{keyword}/restore")
    @Transactional
    public ResponseEntity<Object> restoreHotSearch(@PathVariable("keyword") String keyword) {
        SecurityUtils.getCurrentUserId();
        int updated = searchQueryRepository.updateRemovedByKeyword(keyword, false);
        return ResponseEntity.ok(java.util.Map.of(
                "keyword", keyword, "removed", false, "updated", updated, "success", true));
    }
}

/**
 * 管理后台 - 热搜词视图。
 *
 * @param keyword     搜索词
 * @param searchCount 近 7 天搜索次数
 * @param isRemoved   是否已下架（运营操纵）
 */
record AdminHotSearchView(
        String keyword,
        long searchCount,
        boolean isRemoved
) {
}
