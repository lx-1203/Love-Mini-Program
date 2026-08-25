package com.campuslove.api.draft;

import com.campuslove.api.entity.PostDraft;
import com.campuslove.api.repository.PostDraftRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 发布草稿服务——MySQL 实现（real profile）。
 *
 * <p>对应 post_draft 表（V2026.08.24.0001），每用户一条草稿（upsert 语义）。
 * images/tags/topics 以 JSON 字符串存储于 MySQL JSON 列。</p>
 */
@Service
@Profile("real")
public class RealDraftService implements DraftService {

    private final PostDraftRepository repository;
    private final ObjectMapper objectMapper;

    public RealDraftService(PostDraftRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public DraftView save(Long userId, SaveDraftRequest request) {
        PostDraft draft = repository.findByUserId(userId)
                .orElseGet(() -> new PostDraft(userId));

        draft.setTargetType(normalize(request.targetType(), "general"));
        draft.setTargetId(request.targetId());
        draft.setTitle(request.title());
        draft.setContent(request.content());
        draft.setImages(toJson(request.images()));
        draft.setTags(toJson(request.tags()));
        draft.setTopics(toJson(request.topics()));
        draft.setLocation(request.location());
        draft.setVisibility(normalize(request.visibility(), "circle_members"));

        PostDraft saved = repository.save(draft);
        return toView(saved);
    }

    @Override
    public DraftView get(Long userId) {
        Optional<PostDraft> draft = repository.findByUserId(userId);
        return draft.map(this::toView).orElse(null);
    }

    @Override
    public void delete(Long userId) {
        repository.deleteByUserId(userId);
    }

    // --- helpers ---

    private String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String toJson(List<String> list) {
        if (list == null || list.isEmpty()) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private List<String> fromJson(String json) {
        if (json == null || json.isBlank() || "[]".equals(json)) return List.of();
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory()
                    .constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private DraftView toView(PostDraft d) {
        return new DraftView(
            d.getId(),
            d.getTargetType(),
            d.getTargetId(),
            d.getTitle(),
            d.getContent(),
            fromJson(d.getImages()),
            fromJson(d.getTags()),
            fromJson(d.getTopics()),
            d.getLocation(),
            d.getVisibility(),
            d.getUpdatedAt() != null ? d.getUpdatedAt().toString() : ""
        );
    }
}
