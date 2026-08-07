package com.campuslove.api.repository;

import com.campuslove.api.entity.ShopItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 积分商城商品 Repository。
 */
public interface ShopItemRepository extends JpaRepository<ShopItem, Long> {

    /**
     * 分页查询商品（管理后台用，支持关键字/分类/上下架/校区筛选）。
     *
     * <p>数据隔离：campusName 非 null 时返回「本校区商品或全局商品」
     * （校区管理员可见全局 + 本校区商品）；null 时返回全部。</p>
     *
     * @param keyword      标题模糊关键字（可空）
     * @param category     分类（可空）
     * @param published    上下架筛选（可空）
     * @param campusName   校区名（可空，数据隔离注入）
     * @param pageable     分页参数
     * @return 分页商品列表
     */
    @Query("SELECT s FROM ShopItem s WHERE "
            + "(:keyword IS NULL OR s.title LIKE CONCAT('%', :keyword, '%')) "
            + "AND (:category IS NULL OR s.category = :category) "
            + "AND (:published IS NULL OR s.published = :published) "
            + "AND (:campusName IS NULL OR s.campusName IS NULL OR s.campusName = :campusName)")
    Page<ShopItem> searchForAdmin(@Param("keyword") String keyword,
                                  @Param("category") String category,
                                  @Param("published") Boolean published,
                                  @Param("campusName") String campusName,
                                  Pageable pageable);
}
