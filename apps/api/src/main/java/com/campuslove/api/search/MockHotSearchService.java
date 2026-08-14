package com.campuslove.api.search;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 热搜词服务实现（mock profile）。
 */
@Profile("mock")
@Service
public class MockHotSearchService implements HotSearchService {

    @Override
    public List<HotSearchView> getHotSearches(int limit) {
        return List.of();
    }
}
