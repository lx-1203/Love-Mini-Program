package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.SensitiveWord;
import com.campuslove.api.repository.SensitiveWordRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
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
 * <p>提供敏感词的列表、新增、删除、批量异步导入功能。
 * 新增/删除后会同步刷新内存中的 {@link SensitiveWordFilter} 缓存（通过重置 keywords 列表）。</p>
 *
 * <p>接口：</p>
 * <ul>
 *   <li>GET    /api/admin/sensitive-words                - 敏感词列表（支持可选 category 过滤）</li>
 *   <li>POST   /api/admin/sensitive-words                - 新增敏感词</li>
 *   <li>DELETE /api/admin/sensitive-words/{id}           - 删除敏感词</li>
 *   <li>POST   /api/admin/sensitive-words/batch-import   - SubTask 5.3.5：批量异步导入敏感词</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/sensitive-words")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSensitiveWordController {

    private final SensitiveWordRepository sensitiveWordRepository;
    private final SensitiveWordFilter sensitiveWordFilter;
    private final SensitiveWordImportService importService;
    /** 缓存管理器：用于在刷新内存过滤器前主动失效敏感词列表缓存（缺陷修复） */
    private final CacheManager cacheManager;

    public AdminSensitiveWordController(SensitiveWordRepository sensitiveWordRepository,
                                        SensitiveWordFilter sensitiveWordFilter,
                                        SensitiveWordImportService importService,
                                        CacheManager cacheManager) {
        this.sensitiveWordRepository = sensitiveWordRepository;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.importService = importService;
        this.cacheManager = cacheManager;
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
     *
     * <p>Task 2.3.2：通过 {@code @CacheEvict(allEntries=true)} 主动失效 {@link CacheNames#SENSITIVE_WORDS}
     * 全量缓存，保证下次查询能取到新增的敏感词。同时调用 {@link #refreshFilterKeywords()}
     * 同步内存 SensitiveWordFilter。</p>
     */
    @Auditable(value = AuditOperation.ADD_SENSITIVE_WORD, targetType = "SENSITIVE_WORD")
    @CacheEvict(cacheNames = CacheNames.SENSITIVE_WORDS, allEntries = true)
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    // 缺陷修复：@Transactional 保证 save 与刷新过滤器在同一个事务内，
    // JPA FlushModeType.AUTO 下刷新查询前会自动 flush，事务内即可读到新增词，消除并发/时序竞态
    @Transactional
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
     *
     * <p>Task 2.3.2：通过 {@code @CacheEvict(allEntries=true)} 主动失效 {@link CacheNames#SENSITIVE_WORDS}
     * 全量缓存，保证下次查询不会返回已删除的敏感词。同时同步刷新内存 SensitiveWordFilter。</p>
     */
    @Auditable(value = AuditOperation.DELETE_SENSITIVE_WORD, targetType = "SENSITIVE_WORD")
    @CacheEvict(cacheNames = CacheNames.SENSITIVE_WORDS, allEntries = true)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable("id") @Positive Long id) {
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
     *
     * <p>缺陷修复：先主动失效 SENSITIVE_WORDS 缓存再查询。
     * {@code findAllByOrderByCreatedAtDesc()} 带 {@code @Cacheable}（TTL 1 小时），
     * 若直接查询会命中旧缓存导致新增词不生效（命中不稳定）；
     * {@code @CacheEvict} 注解默认在方法返回后才清缓存，无法覆盖方法内的本次读取。</p>
     */
    private void refreshFilterKeywords() {
        try {
            // 主动失效敏感词列表缓存，确保下方查询读取的是最新数据库数据而非旧缓存
            org.springframework.cache.Cache cache = cacheManager.getCache(CacheNames.SENSITIVE_WORDS);
            if (cache != null) {
                cache.clear();
            }
            List<String> words = sensitiveWordRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(SensitiveWord::getWord)
                    .toList();
            sensitiveWordFilter.setKeywords(words);
        } catch (DataAccessException ignore) {
            // 同步失败不影响主流程，原有内存敏感词列表仍生效
        }
    }

    /**
     * SubTask 5.3.5：批量异步导入敏感词。
     *
     * <p>支持一次性导入 1 万条以上敏感词，立即返回任务受理结果（含 taskId），
     * 实际导入在 {@code taskExecutor} 线程池中分批执行，每批 500 条。</p>
     *
     * <p>设计说明：</p>
     * <ul>
     *   <li>异步处理避免 HTTP 请求阻塞与网关超时</li>
     *   <li>双层去重：内存 Set + DB existsByWordIgnoreCase</li>
     *   <li>异常隔离：单批失败不阻断后续批次</li>
     *   <li>导入完成后主动失效 {@link CacheNames#SENSITIVE_WORDS} 缓存
     *       并同步刷新内存 SensitiveWordFilter</li>
     * </ul>
     *
     * @param request 批量导入请求（words + category）
     * @return 任务受理结果
     */
    @Auditable(value = AuditOperation.ADD_SENSITIVE_WORD, targetType = "SENSITIVE_WORD")
    @PostMapping("/batch-import")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<SensitiveWordImportResult> batchImport(
            @Valid @RequestBody SensitiveWordBatchImportRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        SensitiveWordImportResult result = importService.importBatchAsync(
                request.words(), request.category(), operatorId);
        return ResponseEntity.accepted().body(result);
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
        @NotBlank @Size(max = 64) String word,
        @Pattern(regexp = "POLITICS|PORN|ABUSE|AD|OTHER",
                message = "category 必须为 POLITICS/PORN/ABUSE/AD/OTHER")
        String category
) {}

/**
 * SubTask 5.3.5：批量导入敏感词请求。
 *
 * @param words    待导入的敏感词列表（最多 10000 条，超过将分批处理）
 * @param category 敏感词分类（POLITICS/PORN/ABUSE/AD/OTHER），可为 null
 */
record SensitiveWordBatchImportRequest(
        @jakarta.validation.constraints.NotEmpty
        @Size(max = 10000, message = "words 列表不能超过 10000 条")
        List<@NotBlank @Size(max = 64) String> words,
        @Pattern(regexp = "POLITICS|PORN|ABUSE|AD|OTHER",
                message = "category 必须为 POLITICS/PORN/ABUSE/AD/OTHER")
        String category
) {}
