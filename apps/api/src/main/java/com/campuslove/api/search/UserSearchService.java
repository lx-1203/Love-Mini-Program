package com.campuslove.api.search;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 用户搜索服务接口（B10，2026-08-10）。
 *
 * <p>社交 APP 标准模块「发现」的组成部分：按昵称/校区搜索用户，
 * 排除自己与存在拉黑关系的双方，仅返回可搜索的普通用户。</p>
 */
public interface UserSearchService {

    /**
     * 按关键词搜索用户（分页）。
     *
     * @param currentUserId 当前用户 ID（用于排除自己与拉黑关系）
     * @param keyword       搜索关键词（昵称/校区名，中缀匹配）
     * @param pageable      分页参数（size 上限由 Controller 校验）
     * @return 分页搜索结果视图
     */
    Page<UserSearchView> searchUsers(Long currentUserId, String keyword, Pageable pageable);
}
