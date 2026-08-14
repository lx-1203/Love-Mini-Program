package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 咨询课程报名实体，对应 consulting_signup 表（3-I 咨询报名，Flyway V2026.08.10.0023）。
 *
 * <p>语义：</p>
 * <ul>
 *   <li>幂等：(user_id, course_id) 唯一约束，重复报名不产生重复记录</li>
 *   <li>无支付：报名即记录，不产生任何扣费（支付链路为明确占位）</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "consulting_signup", uniqueConstraints = {
        @UniqueConstraint(name = "uk_consulting_signup_user_course", columnNames = {"user_id", "course_id"})
})
public class ConsultingSignup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 报名用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 课程 ID */
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /**
     * 所属课程（LAZY 加载；「我的报名列表」按 JOIN FETCH 预加载避免 N+1）。
     * 注意：course_id 列由 {@link #courseId} 映射（与迁移脚本列名一致），
     * 此处 JoinColumn 引用同一列。
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false, insertable = false, updatable = false,
            foreignKey = @jakarta.persistence.ForeignKey(name = "fk_consulting_signup_course"))
    private ConsultingCourse course;

    /** 报名时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ConsultingSignup() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public ConsultingCourse getCourse() {
        return course;
    }

    public void setCourse(ConsultingCourse course) {
        this.course = course;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
