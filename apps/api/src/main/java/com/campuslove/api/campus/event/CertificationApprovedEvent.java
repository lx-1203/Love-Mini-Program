package com.campuslove.api.campus.event;

import com.campuslove.api.entity.CampusCertification;
import java.util.Objects;
import org.springframework.context.ApplicationEvent;

/**
 * SubTask 5.3.2：校园认证审批通过事件。
 *
 * <p>当管理员在 {@link com.campuslove.api.campus.RealCampusCertificationService#reviewCertification}
 * 将认证记录审核为 APPROVED 时发布此事件，通知订阅者同步更新
 * Elasticsearch 用户索引（school_name / verification_status 等字段），
 * 使推荐搜索能基于最新认证状态进行筛选。</p>
 *
 * <p>设计说明：</p>
 * <ul>
 *   <li>当前项目尚未引入 Elasticsearch 客户端，订阅方
 *       {@link com.campuslove.api.search.UserIndexSyncListener} 为桩实现，
 *       仅记录日志，待 ES 接入后填充真实索引同步逻辑。</li>
 *   <li>采用事件解耦：认证服务不直接依赖 ES 客户端，便于后续替换为
 *       其他搜索引擎（如 Meilisearch / OpenSearch）。</li>
 *   <li>事件携带 userId 与 schoolName，订阅方无需再次查询数据库。</li>
 *   <li>事件不可变（final 字段），保证多订阅方线程安全。</li>
 * </ul>
 */
public class CertificationApprovedEvent extends ApplicationEvent {

    private static final long serialVersionUID = 1L;

    /** 被认证通过的用户 ID */
    private final Long userId;

    /** 学校名称（来自认证记录） */
    private final String schoolName;

    /** 专业（来自认证记录） */
    private final String major;

    /** 审核人 ID */
    private final Long reviewerId;

    /**
     * 构造认证通过事件。
     *
     * @param source     事件源
     * @param userId     被认证通过的用户 ID
     * @param schoolName 学校名称
     * @param major      专业
     * @param reviewerId 审核人 ID
     */
    public CertificationApprovedEvent(Object source, Long userId, String schoolName, String major, Long reviewerId) {
        super(source);
        this.userId = userId;
        this.schoolName = schoolName;
        this.major = major;
        this.reviewerId = reviewerId;
    }

    /**
     * 便捷工厂方法：从 {@link CampusCertification} 实体构造事件。
     *
     * @param source       事件源
     * @param certification 已审核通过的认证实体（status=APPROVED）
     * @param reviewerId   审核人 ID
     * @return 认证通过事件
     */
    public static CertificationApprovedEvent of(Object source, CampusCertification certification, Long reviewerId) {
        return new CertificationApprovedEvent(
                source,
                certification.getUserId(),
                certification.getSchoolName(),
                certification.getMajor(),
                reviewerId
        );
    }

    public Long getUserId() {
        return userId;
    }

    public String getSchoolName() {
        return schoolName;
    }

    public String getMajor() {
        return major;
    }

    public Long getReviewerId() {
        return reviewerId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CertificationApprovedEvent that)) return false;
        return Objects.equals(userId, that.userId)
                && Objects.equals(schoolName, that.schoolName)
                && Objects.equals(major, that.major)
                && Objects.equals(reviewerId, that.reviewerId)
                && Objects.equals(getSource(), that.getSource());
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, schoolName, major, reviewerId, getSource());
    }

    @Override
    public String toString() {
        return "CertificationApprovedEvent{userId=" + userId
                + ", schoolName='" + schoolName + "'"
                + ", major='" + major + "'"
                + ", reviewerId=" + reviewerId
                + ", source=" + getSource() + "}";
    }
}
