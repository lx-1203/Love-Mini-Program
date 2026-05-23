package com.campuslove.api.discover;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 活动控制器。
 * 提供活动列表查询、活动详情、报名和取消报名等 API。
 */
@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    /**
     * 获取活动列表。
     * GET /api/activities?campusName=xxx&page=0&size=20
     *
     * @param campusName 校区名称（可选）
     * @param page       页码（默认 0）
     * @param size       每页大小（默认 20）
     * @return 活动视图分页列表
     */
    @GetMapping
    public Page<ActivityView> getActivities(
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", required = false, defaultValue = "0") int page,
            @RequestParam(name = "size", required = false, defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return activityService.getActivities(campusName, pageable);
    }

    /**
     * 获取活动详情。
     * GET /api/activities/{id}?userId=xxx
     *
     * @param id     活动 ID
     * @param userId 当前用户 ID（可选，用于判断是否已报名）
     * @return 活动详情视图
     */
    @GetMapping("/{id}")
    public ActivityDetailView getActivityDetail(
            @PathVariable("id") Long id,
            @RequestParam(name = "userId", required = false) Long userId) {
        return activityService.getActivityDetail(id, userId);
    }

    /**
     * 报名活动。
     * POST /api/activities/{id}/enroll
     *
     * @param id      活动 ID
     * @param request 包含用户 ID 的请求体
     * @return 报名操作结果视图
     */
    @PostMapping("/{id}/enroll")
    public ActivityEnrollmentResultView enrollActivity(
            @PathVariable("id") Long id,
            @RequestBody ActivityEnrollRequest request) {
        return activityService.enrollActivity(request.userId(), id);
    }

    /**
     * 取消活动报名。
     * DELETE /api/activities/{id}/enroll
     *
     * @param id      活动 ID
     * @param request 包含用户 ID 的请求体
     * @return 取消报名操作结果视图
     */
    @DeleteMapping("/{id}/enroll")
    public ActivityEnrollmentResultView cancelEnrollment(
            @PathVariable("id") Long id,
            @RequestBody ActivityEnrollRequest request) {
        return activityService.cancelEnrollment(request.userId(), id);
    }
}

/**
 * 活动报名/取消报名请求体
 */
record ActivityEnrollRequest(
    Long userId
) {}
