package com.campuslove.api.search;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 帖子搜索控制器（2026-08-11，参考贴吧搜索准则）。
 *
 * <p>GET /api/v1/search/posts —— 按关键词搜索帖子（标题/内容/标签），
 * 相关性排序（标题命中 > 标签命中 > 内容命中；完全 > 前缀 > 中缀）+ 热度加权。</p>
 *
 * <p>速率限制：桶容量 30，每秒补充 2 个令牌（与用户搜索同口径），
 * 按客户端 IP 限流，防止爬虫/批量遍历。</p>
 */
@RestController
@RequestMapping("/api/v1/search")
@Validated
public class PostSearchController {

    private final PostSearchService postSearchService;
    private final HotSearchService hotSearchService;

    public PostSearchController(PostSearchService postSearchService,
                                HotSearchService hotSearchService) {
        this.postSearchService = postSearchService;
        this.hotSearchService = hotSearchService;
    }

    /**
     * 搜索帖子。
     * GET /api/v1/search/posts?keyword=&page=&size=
     */
    @GetMapping("/posts")
    @RateLimit(capacity = 30, refillTokens = 2, key = "#request.remoteAddr")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Page<PostSearchView>> searchPosts(
            @RequestParam("keyword") @Size(min = 1, max = 20) String keyword,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(50) int size) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.ok(postSearchService.searchPosts(currentUserId, keyword, pageable));
    }

    /**
     * 热搜词列表。
     * GET /api/v1/search/hot?limit=10
     */
    @GetMapping("/hot")
    @RateLimit(capacity = 60, refillTokens = 4, key = "#request.remoteAddr")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<java.util.List<HotSearchView>> getHotSearches(
            @RequestParam(name = "limit", defaultValue = "10") @Min(1) @Max(20) int limit) {
        return ApiResponse.ok(hotSearchService.getHotSearches(limit));
    }
}
