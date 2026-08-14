package com.campuslove.api.consulting;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.entity.ConsultingCourse;
import com.campuslove.api.entity.ConsultingSignup;
import com.campuslove.api.repository.ConsultingCourseRepository;
import com.campuslove.api.repository.ConsultingSignupRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实咨询报名服务实现（3-I 咨询报名，real profile）。
 *
 * <p>报名幂等：先查（user_id, course_id）唯一记录，已存在直接返回（幂等成功）；
 * 并发场景由数据库唯一约束兜底（DataIntegrityViolationException → 409，见
 * GlobalExceptionHandler）。无支付：报名即记录。</p>
 */
@Profile("real")
@Service
public class RealConsultingService implements ConsultingService {

    private static final Logger log = LoggerFactory.getLogger(RealConsultingService.class);

    private final ConsultingCourseRepository courseRepository;
    private final ConsultingSignupRepository signupRepository;

    public RealConsultingService(ConsultingCourseRepository courseRepository,
                                 ConsultingSignupRepository signupRepository) {
        this.courseRepository = courseRepository;
        this.signupRepository = signupRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsultingService.CourseView> listCourses(Long userId) {
        List<ConsultingCourse> courses = courseRepository.findByStatusOrderByPriceAsc(ConsultingCourse.STATUS_ONLINE);

        // 批量查询当前用户已报名课程 ID，避免逐课程查库（N+1）
        List<ConsultingSignup> mySignups = userId == null
                ? List.of()
                : signupRepository.findByUserIdWithCourseOrderByCreatedAtDesc(userId);
        Map<Long, Boolean> signedUpMap = mySignups.stream()
                .collect(Collectors.toMap(ConsultingSignup::getCourseId, s -> true, (a, b) -> a));

        return courses.stream()
                .map(c -> ConsultingService.CourseView.fromEntity(c, signedUpMap.getOrDefault(c.getId(), false)))
                .toList();
    }

    @Override
    @Transactional
    public ConsultingService.SignupView signup(Long userId, Long courseId) {
        if (userId == null || courseId == null) {
            throw new IllegalArgumentException("userId and courseId are required");
        }

        ConsultingCourse course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorMessages.CONSULTING_COURSE_NOT_FOUND_PREFIX + courseId));

        if (course.getStatus() == null || course.getStatus() != ConsultingCourse.STATUS_ONLINE) {
            throw new IllegalArgumentException(ErrorMessages.CONSULTING_COURSE_OFFLINE);
        }

        // 幂等成功：已报名直接返回已有记录（不重复创建）
        Optional<ConsultingSignup> existing = signupRepository.findByUserIdAndCourseId(userId, courseId);
        if (existing.isPresent()) {
            log.info("重复报名，幂等返回已有记录：userId={}, courseId={}", userId, courseId);
            return ConsultingService.SignupView.fromEntity(existing.get());
        }

        ConsultingSignup signup = new ConsultingSignup();
        signup.setUserId(userId);
        signup.setCourseId(courseId);
        signup.setCourse(course);
        signupRepository.saveAndFlush(signup);
        log.info("课程报名成功（无支付占位）：userId={}, courseId={}", userId, courseId);
        return ConsultingService.SignupView.fromEntity(signup);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsultingService.SignupView> listMySignups(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return signupRepository.findByUserIdWithCourseOrderByCreatedAtDesc(userId).stream()
                .map(ConsultingService.SignupView::fromEntity)
                .toList();
    }
}
