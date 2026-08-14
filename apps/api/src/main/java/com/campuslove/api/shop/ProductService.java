package com.campuslove.api.shop;

import com.campuslove.api.entity.Product;
import java.math.BigDecimal;
import java.util.List;

/**
 * 商品服务接口（3-H 商品）。
 *
 * <p>提供商品分页列表与详情查询（仅上架商品可见）。</p>
 */
public interface ProductService {

    /**
     * 分页查询商品列表（仅上架商品，按销量倒序）。
     *
     * @param category 分类（ticket/food/goods/creative；null/空/ALL 表示全部分类）
     * @param page     页码（从 0 开始）
     * @param pageSize 每页大小
     * @return 商品分页视图
     */
    ProductPageView listProducts(String category, int page, int pageSize);

    /**
     * 查询商品详情（仅上架商品）。
     *
     * @param productId 商品 ID
     * @return 商品视图
     * @throws com.campuslove.api.common.ResourceNotFoundException 商品不存在或已下架时抛出
     */
    ProductView getProduct(Long productId);

    /**
     * 商品视图（列表/详情共用）。
     *
     * @param id            商品 ID
     * @param name          商品名称
     * @param description   商品描述
     * @param price         现价（元）
     * @param originalPrice 原价（元，划线价展示）
     * @param imageUrl      商品图片 URL
     * @param category      分类（ticket/food/goods/creative）
     * @param sales         销量
     * @param stock         库存
     * @param createdAt     创建时间（ISO 字符串）
     */
    record ProductView(
            Long id,
            String name,
            String description,
            BigDecimal price,
            BigDecimal originalPrice,
            String imageUrl,
            String category,
            Integer sales,
            Integer stock,
            String createdAt
    ) {
        static ProductView fromEntity(Product p) {
            return new ProductView(
                    p.getId(),
                    p.getName(),
                    p.getDescription(),
                    p.getPrice(),
                    p.getOriginalPrice(),
                    p.getImageUrl(),
                    p.getCategory(),
                    p.getSales(),
                    p.getStock(),
                    p.getCreatedAt() != null ? p.getCreatedAt().toString() : null
            );
        }
    }

    /**
     * 商品分页响应。
     *
     * @param items    当前页商品列表
     * @param total    总数
     * @param page     页码（从 0 开始）
     * @param pageSize 每页大小
     */
    record ProductPageView(List<ProductView> items, long total, int page, int pageSize) {
    }

    /**
     * 商品分类常量（对齐前端 pages/shop/index.vue 分类 Tab）。
     */
    final class Category {
        public static final String TICKET = "ticket";
        public static final String FOOD = "food";
        public static final String GOODS = "goods";
        public static final String CREATIVE = "creative";

        private Category() {
        }
    }
}
