package com.campuslove.api.repository;

import com.campuslove.api.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 商品 Repository（3-H 商品）。
 */
public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * 按分类分页查询上架商品（按销量倒序，销量相同的按创建时间倒序）。
     *
     * @param category 分类（ticket/food/goods/creative）
     * @param status   状态（Product.STATUS_ON_SALE）
     * @param pageable 分页参数
     * @return 上架商品分页
     */
    Page<Product> findByCategoryAndStatusOrderBySalesDescIdDesc(String category, int status, Pageable pageable);

    /**
     * 分页查询全部上架商品（按销量倒序，销量相同的按创建时间倒序）。
     *
     * @param status   状态（Product.STATUS_ON_SALE）
     * @param pageable 分页参数
     * @return 上架商品分页
     */
    Page<Product> findByStatusOrderBySalesDescIdDesc(int status, Pageable pageable);
}
