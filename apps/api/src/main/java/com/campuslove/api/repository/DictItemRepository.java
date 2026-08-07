package com.campuslove.api.repository;

import com.campuslove.api.entity.DictItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 数据字典条目 Repository。
 */
public interface DictItemRepository extends JpaRepository<DictItem, Long> {

    /**
     * 按字典 ID 查询条目（按排序升序）。
     *
     * @param dictId 字典 ID
     * @return 条目列表
     */
    List<DictItem> findByDictIdOrderBySortAsc(Long dictId);

    /**
     * 删除指定字典的全部条目（删除字典级联用）。
     *
     * @param dictId 字典 ID
     */
    void deleteByDictId(Long dictId);
}
