package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 兴趣标签字典（2.0 后台标签运营层）。
 */
@Entity
@Table(name = "interest_tag")
public class InterestTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_key", length = 32)
    private String groupKey;

    @Column(name = "name", nullable = false, length = 32)
    private String name;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(name = "category", length = 32)
    private String category;

    @Column(name = "icon", length = 128)
    private String icon;

    @Column(name = "recommend_weight")
    private Integer recommendWeight = 0;

    public InterestTag() {}

    public InterestTag(String groupKey, String name, boolean enabled) {
        this.groupKey = groupKey;
        this.name = name;
        this.enabled = enabled;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getGroupKey() { return groupKey; }
    public void setGroupKey(String groupKey) { this.groupKey = groupKey; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public Integer getRecommendWeight() { return recommendWeight; }
    public void setRecommendWeight(Integer recommendWeight) { this.recommendWeight = recommendWeight; }
}
