package com.campuslove.api.consulting;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 咨询报名控制器（3-I 咨询报名）。
 *
 * <p>端点：</p>
 * <ul>
 *   <li>GET /api/v1/consulting/courses —— 课程列表（含当前用户是否已报名）</li>
 *   <li>POST /api/v1/consulting/courses/{id}/signup —— 报名（幂等成功，重复报名返回已有记录）</li>
 *   <li>GET /api/v1/consulting/signups —— 我的报名列表（含课程信息）</li>
 * </ul>
 *
 * <p>无支付：报名即记录，不产生任何扣费（支付链路为明确占位）。</p>
 */
@RestController
@RequestMapping("/api/v1/consulting")
@Validated
public class ConsultingController {

    private final ConsultingService consultingService;

    public ConsultingController(ConsultingService consultingService) {
        this.consultingService = consultingService;
    }

    /**
     * 课程列表。
     * GET /api/v1/consulting/courses
     *
     * @return 课程视图列表（仅可报名课程，按价格升序）
     */
    @GetMapping("/courses")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<ConsultingService.CourseView>> listCourses() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(consultingService.listCourses(userId));
    }

    /**
     * 报名课程（幂等成功）。
     * POST /api/v1/consulting/courses/{id}/signup
     *
     * @param id 课程 ID
     * @return 报名记录视图（重复报名返回已有记录）
     */
    @PostMapping("/courses/{id}/signup")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<ConsultingService.SignupView> signup(@PathVariable("id") @Positive Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(consultingService.signup(userId, id));
    }

    /**
     * 我的报名列表。
     * GET /api/v1/consulting/signups
     *
     * @return 报名记录视图列表（按报名时间倒序，含课程信息）
     */
    @GetMapping("/signups")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<ConsultingService.SignupView>> listMySignups() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(consultingService.listMySignups(userId));
    }
}
