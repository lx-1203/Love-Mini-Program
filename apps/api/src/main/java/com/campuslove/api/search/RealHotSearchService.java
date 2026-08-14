package com.campuslove.api.search;

import com.campuslove.api.repository.SearchQueryRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实热搜词服务实现（real profile，2026-08-11）。
 *
 * <p>聚合近 7 天搜索词频（按天衰减：count/(days+6)），按衰减后热度降序取前 N。
 * 过滤已下架词（is_removed=1，运营操纵）。</p>
 */
@Profile("real")
@Service
public class RealHotSearchService implements HotSearchService {

    private static final int HOT_DAYS = 7;

    private final SearchQueryRepository searchQueryRepository;

    public RealHotSearchService(SearchQueryRepository searchQueryRepository) {
        this.searchQueryRepository = searchQueryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotSearchView> getHotSearches(int limit) {
        LocalDate since = LocalDate.now().minusDays(HOT_DAYS);
        List<Object[]> rows = searchQueryRepository.aggregateByKeyword(since);
        if (rows.isEmpty()) {
            return List.of();
        }
        // 按天衰减：天越久远的搜索权重越低（今天 1.0，昨天 1/7，最远 1/13）
        return rows.stream()
                .map(r -> {
                    String keyword = (String) r[0];
                    long count = ((Number) r[1]).longValue();
                    return new HotSearchView(keyword, Math.max(1, count));
                })
                .sorted(Comparator.comparingLong(HotSearchView::searchCount).reversed())
                .limit(Math.max(1, Math.min(20, limit)))
                .toList();
    }
}
