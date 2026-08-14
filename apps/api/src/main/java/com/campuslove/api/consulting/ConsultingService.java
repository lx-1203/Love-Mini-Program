package com.campuslove.api.consulting;

import com.campuslove.api.entity.ConsultingCourse;
import com.campuslove.api.entity.ConsultingSignup;
import java.math.BigDecimal;
import java.util.List;

/**
 * 咨询报名服务接口（3-I 咨询报名）。
 *
 * <p>无支付：报名即记录（consulting_signup），不产生任何扣费（支付链路为明确占位）。</p>
 */
public interface ConsultingService {

    /**
     * 课程列表（仅可报名课程，按价格升序，附当前用户是否已报名）。
     *
     * @param userId 当前用户 ID（用于计算 isSignedUp）
     * @return 课程视图列表
     */
    List<CourseView> listCourses(Long userId);

    /**
     * 报名课程（幂等成功：重复报名直接返回已有报名记录）。
     *
     * <p>校验：课程存在（404）、课程可报名（下架返回 400）。</p>
     *
     * @param userId   当前用户 ID
     * @param courseId 课程 ID
     * @return 报名记录视图
     * @throws com.campuslove.api.common.ResourceNotFoundException 课程不存在时抛出
     * @throws IllegalArgumentException 课程已下架时抛出
     */
    SignupView signup(Long userId, Long courseId);

    /**
     * 我的报名列表（按报名时间倒序，含课程信息）。
     *
     * @param userId 当前用户 ID
     * @return 报名记录视图列表
     */
    List<SignupView> listMySignups(Long userId);

    /**
     * 课程视图。
     *
     * @param id          课程 ID
     * @param title       课程标题
     * @param description 课程简介
     * @param price       课程价格（元）
     * @param coverUrl    封面图 URL
     * @param category    课程分类（communication/dating/intimacy_repair）
     * @param isSignedUp  当前用户是否已报名
     */
    record CourseView(
            Long id,
            String title,
            String description,
            BigDecimal price,
            String coverUrl,
            String category,
            boolean isSignedUp
    ) {
        static CourseView fromEntity(ConsultingCourse c, boolean signedUp) {
            return new CourseView(
                    c.getId(),
                    c.getTitle(),
                    c.getDescription(),
                    c.getPrice(),
                    c.getCoverUrl(),
                    c.getCategory(),
                    signedUp
            );
        }
    }

    /**
     * 报名记录视图（含课程信息）。
     *
     * @param id            报名记录 ID
     * @param courseId      课程 ID
     * @param courseTitle   课程标题
     * @param coursePrice   课程价格（元）
     * @param courseCover   课程封面图 URL
     * @param createdAt     报名时间（ISO 字符串）
     */
    record SignupView(
            Long id,
            Long courseId,
            String courseTitle,
            BigDecimal coursePrice,
            String courseCover,
            String createdAt
    ) {
        static SignupView fromEntity(ConsultingSignup s) {
            ConsultingCourse c = s.getCourse();
            return new SignupView(
                    s.getId(),
                    s.getCourseId(),
                    c != null ? c.getTitle() : null,
                    c != null ? c.getPrice() : null,
                    c != null ? c.getCoverUrl() : null,
                    s.getCreatedAt() != null ? s.getCreatedAt().toString() : null
            );
        }
    }
}
