package com.campuslove.api.draft;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * 发布草稿服务——内存实现。
 *
 * <p>mock（本地演示）profile 下无 DataSource/JPA，用 userId 为键的内存 Map 保存草稿，
 * 保证本地演示“退出保留草稿、再次进入还原”可用。生产 real profile 应替换为数据库实现
 * （见 DraftService 接口，后续接入 draft 表 + Flyway 迁移）。
 */
@Service
public class InMemoryDraftService implements DraftService {

    private final Map<Long, DraftView> store = new ConcurrentHashMap<>();
    private long seq = 1;

    @Override
    public DraftView save(Long userId, SaveDraftRequest request) {
        String updatedAt = Instant.now().toString();
        DraftView view = new DraftView(
            seq++,
            normalize(request.targetType(), "general"),
            request.targetId() == null ? null : request.targetId(),
            request.title(),
            request.content(),
            request.images() == null ? List.of() : request.images(),
            request.tags() == null ? List.of() : request.tags(),
            request.topics() == null ? List.of() : request.topics(),
            request.location(),
            request.visibility() == null ? "circle_members" : request.visibility(),
            updatedAt
        );
        store.put(userId, view);
        return view;
    }

    @Override
    public DraftView get(Long userId) {
        return store.get(userId);
    }

    @Override
    public void delete(Long userId) {
        store.remove(userId);
    }

    private String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
