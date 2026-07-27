package com.campuslove.api.repository;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.SensitiveWord;
import java.util.List;
import java.util.Optional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 敏感词 Repository。
 *
 * <p>Task 2.3.2：{@link #findAllByOrderByCreatedAtDesc()} 添加 {@code @Cacheable}，
 * 缓存全量敏感词列表至 Redis/Caffeine（CacheName = {@link CacheNames#SENSITIVE_WORDS}），
 * 避免每次内容过滤都重复查询数据库。Admin 后台增删敏感词时由 Service 层通过
 * {@code @CacheEvict(allEntries=true)} 主动失效。</p>
 */
public interface SensitiveWordRepository extends JpaRepository<SensitiveWord, Long> {

    /**
     * 判断敏感词是否已存在（大小写不敏感）。
     *
     * @param word 敏感词
     * @return 是否存在
     */
    boolean existsByWordIgnoreCase(String word);

    /**
     * 按敏感词文本查找（用于去重校验）。
     *
     * @param word 敏感词
     * @return Optional
     */
    Optional<SensitiveWord> findByWordIgnoreCase(String word);

    /**
     * 按分类查询，按创建时间倒序分页。
     *
     * @param category 分类
     * @param pageable 分页
     * @return 分页结果
     */
    Page<SensitiveWord> findByCategoryOrderByCreatedAtDesc(String category, Pageable pageable);

    /**
     * 查询全部，按创建时间倒序分页。
     *
     * @param pageable 分页
     * @return 分页结果
     */
    Page<SensitiveWord> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * 查询全部，按创建时间倒序。
     *
     * <p>Task 2.3.2：使用 {@code @Cacheable} 缓存全量结果。
     * 敏感词列表变更频率低（仅 Admin 后台增删时变化），缓存命中可显著降低 DB 压力。
     * CacheKey 固定为 {@code "all"}（无参数方法），TTL 1 小时；
     * Admin 增删时由 {@code AdminSensitiveWordController} 触发 @CacheEvict 主动失效。</p>
     *
     * @return 敏感词列表（缓存命中时直接返回缓存值，未命中时查询数据库并写入缓存）
     */
    @Cacheable(cacheNames = CacheNames.SENSITIVE_WORDS, key = "'all'")
    List<SensitiveWord> findAllByOrderByCreatedAtDesc();
}
