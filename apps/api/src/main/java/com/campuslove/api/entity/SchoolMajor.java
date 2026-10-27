package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 高校专业字典条目，对应 school_majors 表（V2026.10.27.0001）。
 *
 * <p>「学校 → 专业目录」的后端真源，用于 {@code GET /api/v1/config/campuses} 的
 * {@code majors} 字段，驱动客户端 setup/campus 三级联动的第三级 picker。</p>
 *
 * <p><b>两档语义（读数据前务必理解）</b>：</p>
 * <ul>
 *   <li>{@link #GENERIC_SCHOOL_CODE}（{@code "*"}）＝<b>通用基线档</b>，67 条，不属于任何具体学校。
 *       之所以用保留字符而不是 {@code school_code IS NULL}：MySQL 唯一索引放行多个 NULL 行，
 *       用 NULL 表示基线就等于基线档没有防重约束。</li>
 *   <li>具体 {@code schools.code}（大写，如 {@code NJU}）＝该校专属目录，覆盖基线。</li>
 * </ul>
 *
 * <p><b>诚实口径</b>：截至本文件落地，库里<b>只有基线档有数据</b>——没有任何权威来源
 * （教育部学科备案 / 各校本科招生专业目录）被导入过，所以 17 所学校全部走基线回退。
 * 这不是缺陷而是当前真实数据状态；{@code RealConfigService#loadCampuses()} 会把每次回退
 * 记成一行日志，运营据此知道「按校真源还没到位」。</p>
 *
 * <p>与 {@link School} 一样按字符串 code 对齐、不建外键：基线档的 {@code "*"} 本来就不指向任何
 * schools 行，加了外键反而装不下基线。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "school_majors",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_school_majors_school_name", columnNames = {"school_code", "name"})
    },
    indexes = {@Index(name = "idx_school_majors_school_code", columnList = "school_code")}
)
public class SchoolMajor {

    /** 通用基线档的保留 school_code（不是任何真实高校的编码）。 */
    public static final String GENERIC_SCHOOL_CODE = "*";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 高校编码（schools.code，大写如 NJU）；{@value #GENERIC_SCHOOL_CODE} 表示通用基线档 */
    @Column(name = "school_code", nullable = false, length = 32)
    private String schoolCode = GENERIC_SCHOOL_CODE;

    /** 专业全称（直接展示给用户；与 campus_certifications.major 同宽） */
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /** 学科门类分组（工学/理学/…），仅用于展示分组，可空 */
    @Column(name = "category", length = 64)
    private String category;

    /** 同档内排序权重（升序），决定 picker 选项顺序 */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public SchoolMajor() {
    }

    /**
     * 便捷构造（测试与导入脚本用）。
     *
     * @param schoolCode 高校编码或 {@link #GENERIC_SCHOOL_CODE}
     * @param name       专业全称
     * @param sortOrder  排序权重
     */
    public SchoolMajor(String schoolCode, String name, Integer sortOrder) {
        this.schoolCode = schoolCode;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSchoolCode() {
        return schoolCode;
    }

    public void setSchoolCode(String schoolCode) {
        this.schoolCode = schoolCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
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
