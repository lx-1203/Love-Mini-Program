package com.campuslove.api.search;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 帖子搜索服务接口（2026-08-11）。
 *
 * <p>C 端帖子搜索：关键词匹配标题/内容/标签，相关性排序
 * （标题命中 > 标签命中 > 内容命中；完全 > 前缀 > 中缀）+ 热度加权，
 * 参考贴吧搜索准则。</p>
 */
public interface PostSearchService {

    /**
     * 按关键词搜索帖子（分页，相关性排序）。
     *
     * @param currentUserId 当前用户 ID（记录搜索词防刷，可空时跳过记录）
     * @param keyword       搜索关键词（1-20 字符）
     * @param pageable      分页参数
     * @return 分页搜索结果（按相关性分降序）
     */
    Page<PostSearchView> searchPosts(Long currentUserId, String keyword, Pageable pageable);
}
