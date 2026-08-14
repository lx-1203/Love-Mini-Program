package com.campuslove.api.consulting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.entity.ConsultingCourse;
import com.campuslove.api.entity.ConsultingSignup;
import com.campuslove.api.repository.ConsultingCourseRepository;
import com.campuslove.api.repository.ConsultingSignupRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 真实咨询报名服务冒烟测试（3-I 咨询报名）。
 */
class RealConsultingServiceTest {

    @Mock private ConsultingCourseRepository courseRepository;
    @Mock private ConsultingSignupRepository signupRepository;

    private RealConsultingService consultingService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        consultingService = new RealConsultingService(courseRepository, signupRepository);
    }

    private ConsultingCourse course(Long id, String title, BigDecimal price) {
        ConsultingCourse c = new ConsultingCourse();
        c.setId(id);
        c.setTitle(title);
        c.setPrice(price);
        c.setStatus(ConsultingCourse.STATUS_ONLINE);
        return c;
    }

    @Test
    void listCourses_shouldMarkSignedUp() {
        ConsultingCourse c1 = course(1L, "恋爱沟通课", new BigDecimal("99.00"));
        when(courseRepository.findByStatusOrderByPriceAsc(ConsultingCourse.STATUS_ONLINE))
                .thenReturn(List.of(c1));

        ConsultingSignup s = new ConsultingSignup();
        s.setCourseId(1L);
        when(signupRepository.findByUserIdWithCourseOrderByCreatedAtDesc(7L)).thenReturn(List.of(s));

        List<ConsultingService.CourseView> courses = consultingService.listCourses(7L);

        assertEquals(1, courses.size());
        assertEquals("恋爱沟通课", courses.get(0).title());
        assertTrue(courses.get(0).isSignedUp());
    }

    @Test
    void signup_shouldReturn404_whenCourseNotExists() {
        when(courseRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> consultingService.signup(1L, 99L));
    }

    @Test
    void signup_shouldRejectOfflineCourse() {
        ConsultingCourse c = course(1L, "已下架课程", new BigDecimal("99.00"));
        c.setStatus(ConsultingCourse.STATUS_OFFLINE);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        assertThrows(IllegalArgumentException.class, () -> consultingService.signup(1L, 1L));
    }

    @Test
    void signup_shouldBeIdempotent_whenAlreadySignedUp() {
        ConsultingCourse c = course(1L, "恋爱沟通课", new BigDecimal("99.00"));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));

        ConsultingSignup existing = new ConsultingSignup();
        existing.setId(5L);
        existing.setUserId(1L);
        existing.setCourseId(1L);
        existing.setCourse(c);
        when(signupRepository.findByUserIdAndCourseId(1L, 1L)).thenReturn(Optional.of(existing));

        ConsultingService.SignupView view = consultingService.signup(1L, 1L);

        assertEquals(5L, view.id());
        // 幂等成功：不重复创建
        verify(signupRepository, never()).saveAndFlush(any());
    }

    @Test
    void signup_shouldCreate_whenNew() {
        ConsultingCourse c = course(1L, "恋爱沟通课", new BigDecimal("99.00"));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(signupRepository.findByUserIdAndCourseId(1L, 1L)).thenReturn(Optional.empty());

        ConsultingService.SignupView view = consultingService.signup(1L, 1L);

        assertEquals("恋爱沟通课", view.courseTitle());
        verify(signupRepository).saveAndFlush(any(ConsultingSignup.class));
    }

    @Test
    void listMySignups_shouldReturnSignupViews() {
        ConsultingCourse c = course(1L, "恋爱沟通课", new BigDecimal("99.00"));
        ConsultingSignup s = new ConsultingSignup();
        s.setId(1L);
        s.setUserId(7L);
        s.setCourseId(1L);
        s.setCourse(c);
        when(signupRepository.findByUserIdWithCourseOrderByCreatedAtDesc(7L)).thenReturn(List.of(s));

        List<ConsultingService.SignupView> views = consultingService.listMySignups(7L);

        assertEquals(1, views.size());
        assertEquals("恋爱沟通课", views.get(0).courseTitle());
    }
}
