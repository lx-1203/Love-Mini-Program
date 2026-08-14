package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 恋爱咨询课程实体，对应 consulting_course 表（3-I 咨询报名，Flyway V2026.08.10.0023）。
 *
 * <p>种子数据对齐前端 pages/love-center/consulting.vue 的 3 门常量课程：</p>
 * <ul>
 *   <li>恋爱沟通课 ¥99（communication）</li>
 *   <li>脱单攻略课 ¥129（dating）</li>
 *   <li>亲密关系修复课 ¥159（intimacy_repair）</li>
 * </ul>
 *
 * <p>无支付：本阶段仅报名记录（consulting_signup），支付链路为明确占位。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "consulting_course")
public class ConsultingCourse {

    /** 可报名状态值（status 列） */
    public static final int STATUS_ONLINE = 1;
    /** 下架状态值（status 列） */
    public static final int STATUS_OFFLINE = 0;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 课程标题 */
    @Column(name = "title", nullable = false, length = 64)
    private String title;

    /** 课程简介 */
    @Column(name = "description", length = 255)
    private String description;

    /** 课程价格（元） */
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    /** 封面图 URL */
    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    /** 课程分类：communication/dating/intimacy_repair */
    @Column(name = "category", nullable = false, length = 32)
    private String category = "communication";

    /** 状态：1=可报名，0=下架 */
    @Column(name = "status", nullable = false)
    private Integer status = STATUS_ONLINE;

    /** 创建时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ConsultingCourse() {
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

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
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
