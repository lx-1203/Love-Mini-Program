package com.campuslove.api.repository;

import com.campuslove.api.entity.SensitiveWord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 敏感词 Repository。
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
     * @return 敏感词列表
     */
    List<SensitiveWord> findAllByOrderByCreatedAtDesc();
}
