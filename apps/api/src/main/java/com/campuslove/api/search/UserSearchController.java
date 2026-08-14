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
 * 用户搜索控制器（B10，2026-08-10）。
 *
 * <p>GET /api/v1/search/users —— 按昵称/校区搜索用户（社交 APP 标准「发现」模块）。
 * 需登录（hasRole('USER')）：搜索依赖当前用户身份做「排除自己与拉黑关系」过滤。</p>
 *
 * <p>速率限制：桶容量 30，每秒补充 2 个令牌（约 2 次/秒，突发 30 次），
 * 按客户端 IP 限流，防止爬虫/批量遍历用户。</p>
 */
@RestController
@RequestMapping("/api/v1/search")
@Validated
public class UserSearchController {

    private final UserSearchService userSearchService;

    public UserSearchController(UserSearchService userSearchService) {
        this.userSearchService = userSearchService;
    }

    /**
     * 搜索用户。
     * GET /api/v1/search/users?keyword=&page=&size=
     *
     * @param keyword 搜索关键词（1-20 字符，昵称/校区名中缀匹配）
     * @param page    页码（从 0 开始）
     * @param size    每页条数（1-50）
     * @return 分页搜索结果
     */
    @GetMapping("/users")
    @RateLimit(capacity = 30, refillTokens = 2, key = "#request.remoteAddr")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Page<UserSearchView>> searchUsers(
            @RequestParam("keyword") @Size(min = 1, max = 20) String keyword,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(50) int size) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.ok(userSearchService.searchUsers(currentUserId, keyword, pageable));
    }
}
