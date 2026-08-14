package com.campuslove.api.search;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserBlockRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实用户搜索服务实现（real profile）。
 *
 * <p>流程：JPQL 中缀 LIKE 查询（昵称/校区）→ 过滤当前用户自己与
 * 存在拉黑关系的双方（findBlockedRelationUserIds 双向并集）→ 映射为视图。
 * 纯 SQL 搜索，不引入索引/ES（校园规模，见 {@code UserRepository.searchByKeyword} 注释）。</p>
 */
@Profile("real")
@Service
public class RealUserSearchService implements UserSearchService {

    private static final String STATUS_ACTIVE = "active";
    private static final String ROLE_USER = "USER";

    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;

    public RealUserSearchService(UserRepository userRepository,
                                 UserBlockRepository userBlockRepository) {
        this.userRepository = userRepository;
        this.userBlockRepository = userBlockRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserSearchView> searchUsers(Long currentUserId, String keyword, Pageable pageable) {
        String trimmed = keyword == null ? "" : keyword.trim();
        if (trimmed.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        // 拉黑关系双向并集：我拉黑的 + 拉黑我的（含自己，一并排除）
        Set<Long> excludedIds = userBlockRepository
                .findBlockedRelationUserIds(currentUserId)
                .stream()
                .collect(Collectors.toSet());
        excludedIds.add(currentUserId);

        Page<User> page = userRepository.searchByKeyword(trimmed, STATUS_ACTIVE, ROLE_USER, pageable);
        List<UserSearchView> views = page.getContent().stream()
                .filter(u -> !excludedIds.contains(u.getId()))
                .map(RealUserSearchService::toView)
                .toList();
        return new PageImpl<>(views, pageable, Math.max(0, page.getTotalElements() - excludedIds.size()));
    }

    private static UserSearchView toView(User u) {
        return new UserSearchView(
                u.getId(),
                u.getNickname(),
                u.getAvatarUrl(),
                u.getCampusName(),
                u.getGradeLabel(),
                u.getBio(),
                u.getProfileCompletion() != null ? u.getProfileCompletion() : 0
        );
    }
}
