package com.campuslove.api.admin;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.ConsultingCourse;
import com.campuslove.api.repository.ConsultingCourseRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 咨询课程内容与上下架。
 * 读：ADMIN/SUPER_ADMIN/AUDITOR；写：仅 SUPER_ADMIN。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/consulting/courses")
@Validated
public class AdminConsultingController {

    private final ConsultingCourseRepository courseRepository;

    public AdminConsultingController(ConsultingCourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','AUDITOR')")
    public ApiResponse<List<CourseView>> list() {
        return ApiResponse.ok(courseRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(this::toView).toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<CourseView> create(@Valid @RequestBody CourseRequest request) {
        ConsultingCourse course = new ConsultingCourse();
        apply(course, request);
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        course.setCreatedAt(now);
        course.setUpdatedAt(now);
        course.setPublishedAt(null);
        // 新建默认下架，由运营编辑内容后再发布
        course.setStatus(ConsultingCourse.STATUS_OFFLINE);
        return ApiResponse.ok(toView(courseRepository.save(course)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<CourseView> update(@PathVariable("id") @Positive Long id,
                                          @Valid @RequestBody CourseRequest request) {
        ConsultingCourse course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.CONSULTING_COURSE_NOT_FOUND_PREFIX + id));
        apply(course, request);
        course.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        return ApiResponse.ok(toView(courseRepository.save(course)));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<CourseView> publish(@PathVariable("id") @Positive Long id) {
        ConsultingCourse course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.CONSULTING_COURSE_NOT_FOUND_PREFIX + id));
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        course.setStatus(ConsultingCourse.STATUS_ONLINE);
        if (course.getPublishedAt() == null) {
            course.setPublishedAt(now);
        }
        course.setUpdatedAt(now);
        return ApiResponse.ok(toView(courseRepository.save(course)));
    }

    @PostMapping("/{id}/offline")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<CourseView> offline(@PathVariable("id") @Positive Long id) {
        ConsultingCourse course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.CONSULTING_COURSE_NOT_FOUND_PREFIX + id));
        course.setStatus(ConsultingCourse.STATUS_OFFLINE);
        course.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        return ApiResponse.ok(toView(courseRepository.save(course)));
    }

    private void apply(ConsultingCourse course, CourseRequest request) {
        course.setTitle(request.title().trim());
        course.setDescription(request.description() == null ? null : request.description().trim());
        course.setContent(request.content());
        course.setPrice(request.price());
        course.setCoverUrl(request.coverUrl());
        course.setCategory(request.category().trim());
        course.setLecturer(request.lecturer() == null ? null : request.lecturer().trim());
        course.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        course.setPriceVisible(Boolean.TRUE.equals(request.priceVisible()));
        course.setSignupEnabled(Boolean.TRUE.equals(request.signupEnabled()));
    }

    private CourseView toView(ConsultingCourse c) {
        return new CourseView(
                c.getId(), c.getTitle(), c.getDescription(), c.getContent(), c.getPrice(),
                c.getCoverUrl(), c.getCategory(), c.getLecturer(), c.getSortOrder(),
                Boolean.TRUE.equals(c.getPriceVisible()), Boolean.TRUE.equals(c.getSignupEnabled()),
                c.getStatus(), c.getPublishedAt() != null ? c.getPublishedAt().toString() : null,
                c.getUpdatedAt() != null ? c.getUpdatedAt().toString() : null);
    }

    public record CourseRequest(
            @NotBlank @Size(max = 64) String title,
            @Size(max = 255) String description,
            String content,
            @NotNull @DecimalMin("0") BigDecimal price,
            @Size(max = 512) String coverUrl,
            @NotBlank @Size(max = 32) String category,
            @Size(max = 64) String lecturer,
            Integer sortOrder,
            Boolean priceVisible,
            Boolean signupEnabled) {
    }

    public record CourseView(
            Long id, String title, String description, String content, BigDecimal price,
            String coverUrl, String category, String lecturer, Integer sortOrder,
            boolean priceVisible, boolean signupEnabled, Integer status,
            String publishedAt, String updatedAt) {
    }
}
