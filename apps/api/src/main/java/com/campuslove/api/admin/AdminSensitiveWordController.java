package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.SensitiveWord;
import com.campuslove.api.repository.SensitiveWordRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 敏感词控制器。
 * <p>提供敏感词的列表、新增、删除功能。
 * 新增/删除后会同步刷新内存中的 {@link SensitiveWordFilter} 缓存（通过重置 keywords 列表）。</p>
 *
 * <p>接口：</p>
 * <ul>
 *   <li>GET    /api/admin/sensitive-words         - 敏感词列表（支持可选 category 过滤）</li>
 *   <li>POST   /api/admin/sensitive-words         - 新增敏感词</li>
 *   <li>DELETE /api/admin/sensitive-words/{id}    - 删除敏感词</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/admin/sensitive-words")
public class AdminSensitiveWordController {

    private final SensitiveWordRepository sensitiveWordRepository;
    private final SensitiveWordFilter sensitiveWordFilter;

    public AdminSensitiveWordController(SensitiveWordRepository sensitiveWordRepository,
                                        SensitiveWordFilter sensitiveWordFilter) {
        this.sensitiveWordRepository = sensitiveWordRepository;
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    /**
     * 查询敏感词列表。
     * 支持可选 category 过滤；不传 category 返回全部。
     */
    @GetMapping
    public ResponseEntity<List<SensitiveWordView>> list(
            @RequestParam(name = "category", required = false) String category) {
        SecurityUtils.getCurrentUserId();
        List<SensitiveWord> entities;
        if (category != null && !category.isBlank()) {
            entities = sensitiveWordRepository.findByCategoryOrderByCreatedAtDesc(category, Pageable.unpaged())
                    .getContent();
        } else {
            entities = sensitiveWordRepository.findAllByOrderByCreatedAtDesc();
        }
        List<SensitiveWordView> views = entities.stream().map(this::toView).toList();
        return ResponseEntity.ok(views);
    }

    /**
     * 新增敏感词。
     * 词文本大小写不敏感去重；若已存在返回 409 Conflict。
     */
    @Auditable(value = AuditOperation.ADD_SENSITIVE_WORD, targetType = "SENSITIVE_WORD")
    @PostMapping
    public ResponseEntity<SensitiveWordView> create(
            @Valid @RequestBody SensitiveWordCreateRequest request) {
        SecurityUtils.getCurrentUserId();

        String word = request.word().trim();
        if (sensitiveWordRepository.existsByWordIgnoreCase(word)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        SensitiveWord entity = new SensitiveWord();
        entity.setWord(word);
        entity.setCategory(request.category());
        entity.setCreatedAt(LocalDateTime.now());
        SensitiveWord saved = sensitiveWordRepository.save(entity);

        // 同步刷新内存敏感词过滤器
        refreshFilterKeywords();

        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 删除敏感词。
     * 不存在时返回 404。
     */
    @Auditable(value = AuditOperation.DELETE_SENSITIVE_WORD, targetType = "SENSITIVE_WORD")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        SecurityUtils.getCurrentUserId();

        if (!sensitiveWordRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        sensitiveWordRepository.deleteById(id);

        // 同步刷新内存敏感词过滤器
        refreshFilterKeywords();

        return ResponseEntity.noContent().build();
    }

    /**
     * 将数据库中的敏感词列表同步到内存 SensitiveWordFilter。
     * <p>注：SensitiveWordFilter.setKeywords 会重建内部 HashSet 和正则 Pattern，
     * 调用是线程安全的（虽然会短暂产生新的 Pattern 对象，但读多写少场景可接受）。</p>
     */
    private void refreshFilterKeywords() {
        try {
            List<String> words = sensitiveWordRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(SensitiveWord::getWord)
                    .toList();
            sensitiveWordFilter.setKeywords(words);
        } catch (Exception ignore) {
            // 同步失败不影响主流程，原有内存敏感词列表仍生效
        }
    }

    private SensitiveWordView toView(SensitiveWord entity) {
        return new SensitiveWordView(
                entity.getId(),
                entity.getWord(),
                entity.getCategory(),
                entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null
        );
    }
}

/** 敏感词视图 */
record SensitiveWordView(
        Long id,
        String word,
        String category,
        String createdAt
) {}

/** 新增敏感词请求 */
record SensitiveWordCreateRequest(
        @NotBlank String word,
        String category
) {}
