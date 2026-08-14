package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 搜索词记录实体，对应 search_queries 表（V2026.08.11.0002 迁移新增）。
 *
 * <p>供热搜榜聚合：同一用户同一天搜索同一关键词仅一条记录
 * （uk_search_query_day 唯一约束兜底，防刷）；is_removed 供运营下架热搜词
 * （软删防复现，后台可恢复）。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "search_queries",
    indexes = {
        @Index(name = "idx_search_queries_keyword_date", columnList = "keyword, search_date"),
        @Index(name = "idx_search_queries_date", columnList = "search_date")
    }
)
public class SearchQuery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 搜索关键词（trim 后，≤50 字符） */
    @Column(name = "keyword", nullable = false, length = 50)
    private String keyword;

    /** 搜索日期（本地业务日） */
    @Column(name = "search_date", nullable = false)
    private LocalDate searchDate;

    /** 搜索用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 当日搜索次数（防刷：同人同词同日仅 1） */
    @Column(name = "search_count", nullable = false)
    private Integer searchCount = 1;

    /** 热搜下架（1=不进入热搜榜，后台可恢复） */
    @Column(name = "is_removed", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isRemoved = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;

    public SearchQuery() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public LocalDate getSearchDate() {
        return searchDate;
    }

    public void setSearchDate(LocalDate searchDate) {
        this.searchDate = searchDate;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getSearchCount() {
        return searchCount;
    }

    public void setSearchCount(Integer searchCount) {
        this.searchCount = searchCount;
    }

    public Boolean getIsRemoved() {
        return isRemoved;
    }

    public void setIsRemoved(Boolean isRemoved) {
        this.isRemoved = isRemoved;
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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
