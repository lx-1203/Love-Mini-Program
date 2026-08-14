package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 校内商品实体，对应 products 表（3-H 商品，Flyway V2026.08.10.0022）。
 *
 * <p>商品展示数据：名字/价格/原价/分类/销量与前端 pages/shop/index.vue
 * 的 6 个 mock 商品对齐（价格单位：元）。</p>
 *
 * <p>分类取值（对齐前端分类 Tab）：</p>
 * <ul>
 *   <li>{@code ticket} 门票</li>
 *   <li>{@code food} 美食</li>
 *   <li>{@code goods} 好物</li>
 *   <li>{@code creative} 文创</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "products", indexes = {
        @Index(name = "idx_products_category_status", columnList = "category, status")
})
public class Product {

    /** 上架状态值（status 列） */
    public static final int STATUS_ON_SALE = 1;
    /** 下架状态值（status 列） */
    public static final int STATUS_OFF_SALE = 0;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 商品名称 */
    @Column(name = "name", nullable = false, length = 64)
    private String name;

    /** 商品描述 */
    @Column(name = "description", length = 255)
    private String description;

    /** 现价（元） */
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    /** 原价（元），划线价展示 */
    @Column(name = "original_price", precision = 10, scale = 2)
    private BigDecimal originalPrice;

    /** 商品图片 URL */
    @Column(name = "image_url", length = 512)
    private String imageUrl;

    /** 分类：ticket/food/goods/creative */
    @Column(name = "category", nullable = false, length = 32)
    private String category = "goods";

    /** 销量 */
    @Column(name = "sales", nullable = false)
    private Integer sales = 0;

    /** 库存 */
    @Column(name = "stock", nullable = false)
    private Integer stock = 0;

    /** 状态：1=上架，0=下架 */
    @Column(name = "status", nullable = false)
    private Integer status = STATUS_ON_SALE;

    /** 创建时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Product() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getOriginalPrice() {
        return originalPrice;
    }

    public void setOriginalPrice(BigDecimal originalPrice) {
        this.originalPrice = originalPrice;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getSales() {
        return sales;
    }

    public void setSales(Integer sales) {
        this.sales = sales;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
