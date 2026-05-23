package com.campuslove.api.repository;

import com.campuslove.api.entity.PostCategoryEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 帖子分类 Repository。
 * 提供基于启用状态和排序的查询方法。
 */
public interface PostCategoryRepository extends JpaRepository<PostCategoryEntity, Long> {

    /**
     * 查询所有已启用的分类，按排序顺序升序排列。
     *
     * @return 已启用的分类列表
     */
    List<PostCategoryEntity> findByIsActiveTrueOrderBySortOrderAsc();
}
