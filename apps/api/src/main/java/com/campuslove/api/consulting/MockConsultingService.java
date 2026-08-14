package com.campuslove.api.consulting;

import com.campuslove.api.common.ResourceNotFoundException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 咨询报名服务实现（@Profile("mock")）。
 *
 * <p>展示版（showcase）与本地开发在 mock profile 下运行：无数据库，本实现用内存
 * 课程列表与报名集合模拟 consulting_course / consulting_signup 表，
 * 种子数据与 real（Flyway V2026.08.10.0023）完全一致（¥99/¥129/¥159 三门课程）。</p>
 *
 * <p>与 {@link RealConsultingService} 行为对齐：报名幂等成功、课程下架拒绝、无支付。</p>
 */
@Profile("mock")
@Service
public class MockConsultingService implements ConsultingService {

    private final List<CourseView> courses = new CopyOnWriteArrayList<>();

    /** 已报名记录：userId -> SignupView 列表 */
    private final List<SignupView> signups = new CopyOnWriteArrayList<>();

    public MockConsultingService() {
        courses.add(new CourseView(1L, "恋爱沟通课", "掌握高情商沟通，让相处更舒服",
                new BigDecimal("99.00"), null, "communication", false));
        courses.add(new CourseView(2L, "脱单攻略课", "从认识自己开始，找到对的TA",
                new BigDecimal("129.00"), null, "dating", false));
        courses.add(new CourseView(3L, "亲密关系修复课", "化解矛盾，重建信任与亲密",
                new BigDecimal("159.00"), null, "intimacy_repair", false));
    }

    @Override
    public List<CourseView> listCourses(Long userId) {
        List<CourseView> result = new ArrayList<>();
        for (CourseView c : courses) {
            boolean signedUp = signups.stream()
                    .anyMatch(s -> s.courseId().equals(c.id()) && userId != null);
            result.add(new CourseView(c.id(), c.title(), c.description(), c.price(),
                    c.coverUrl(), c.category(), signedUp));
        }
        return result;
    }

    @Override
    public SignupView signup(Long userId, Long courseId) {
        CourseView course = courses.stream()
                .filter(c -> c.id().equals(courseId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("课程不存在: " + courseId));

        // 幂等成功：已报名直接返回已有记录
        return signups.stream()
                .filter(s -> s.courseId().equals(courseId) && s.id() != null)
                .findFirst()
                .orElseGet(() -> {
                    SignupView created = new SignupView(
                            (long) (signups.size() + 1),
                            courseId,
                            course.title(),
                            course.price(),
                            course.coverUrl(),
                            java.time.LocalDateTime.now().toString());
                    signups.add(created);
                    return created;
                });
    }

    @Override
    public List<SignupView> listMySignups(Long userId) {
        return new ArrayList<>(signups);
    }
}
