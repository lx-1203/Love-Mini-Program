package com.campuslove.api.search;

import java.util.List;

/**
 * 热搜词服务接口（2026-08-11）。
 */
public interface HotSearchService {

    /**
     * 查询热搜词列表（按词频降序，过滤已下架词）。
     *
     * @param limit 返回条数上限（1-20）
     * @return 热搜词列表
     */
    List<HotSearchView> getHotSearches(int limit);
}
