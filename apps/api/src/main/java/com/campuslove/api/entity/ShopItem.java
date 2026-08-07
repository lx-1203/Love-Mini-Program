package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 积分商城商品实体，对应 shop_items 表。
 * <p>商品上下架由后台管理（AdminShopController），客户端积分商城从此表读取。
 * published=true 上架可见，false 下架不可见（已兑换记录保留）。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>category：ticket 票务 / food 餐饮 / goods 商品 / creative 文创</li>
 *   <li>priceCents：积分价格（分，避免浮点误差）</li>
 *   <li>stock：库存（-1 = 不限）</li>
 *   <li>campusName：所属校区（NULL = 全局商品，数据隔离维度）</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "shop_items")
public class ShopItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 商品标题 */
    @Column(name = "title", nullable = false, length = 128)
    private String title;

    /** 分类：ticket/food/goods/creative */
    @Column(name = "category", nullable = false, length = 16)
    private String category = "goods";

    /** 积分价格（分） */
    @Column(name = "price_cents", nullable = false)
    private Integer priceCents = 0;

    /** 划线价（分，可空） */
    @Column(name = "original_price")
    private Integer originalPrice;

    /** 商品图片 URL */
    @Column(name = "image_url", nullable = false, length = 512)
    private String imageUrl = "";

    /** 商品描述 */
    @Column(name = "description", nullable = false, length = 512)
    private String description = "";

    /** 库存（-1=不限） */
    @Column(name = "stock", nullable = false)
    private Integer stock = -1;

    /** 已售数量 */
    @Column(name = "sales_count", nullable = false)
    private Integer salesCount = 0;

    /** 是否上架（1=上架，0=下架） */
    @Column(name = "published", nullable = false)
    private Boolean published = true;

    /** 排序权重（升序） */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    /** 所属校区（NULL=全局商品） */
    @Column(name = "campus_name", length = 128)
    private String campusName;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public ShopItem() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getPriceCents() {
        return priceCents;
    }

    public void setPriceCents(Integer priceCents) {
        this.priceCents = priceCents;
    }

    public Integer getOriginalPrice() {
        return originalPrice;
    }

    public void setOriginalPrice(Integer originalPrice) {
        this.originalPrice = originalPrice;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public Integer getSalesCount() {
        return salesCount;
    }

    public void setSalesCount(Integer salesCount) {
        this.salesCount = salesCount;
    }

    public Boolean getPublished() {
        return published;
    }

    public void setPublished(Boolean published) {
        this.published = published;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getCampusName() {
        return campusName;
    }

    public void setCampusName(String campusName) {
        this.campusName = campusName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
