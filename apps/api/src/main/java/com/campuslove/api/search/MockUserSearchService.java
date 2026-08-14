package com.campuslove.api.search;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Mock 用户搜索服务实现（mock profile）。
 *
 * <p>mock 模式无数据库（JPA 被排除），返回空结果；
 * 前端 mock 分支基于本地 fixtures 过滤兜底（apps/client/src/services/mocks/fixtures.ts）。</p>
 */
@Profile("mock")
@Service
public class MockUserSearchService implements UserSearchService {

    @Override
    public Page<UserSearchView> searchUsers(Long currentUserId, String keyword, Pageable pageable) {
        return new PageImpl<>(List.of(), pageable, 0);
    }
}
