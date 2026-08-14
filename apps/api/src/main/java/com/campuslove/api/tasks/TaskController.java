package com.campuslove.api.tasks;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 任务与积分控制器（3-J 任务与积分）。
 *
 * <p>端点：</p>
 * <ul>
 *   <li>GET /api/v1/tasks —— 任务定义列表（含当前用户进度与领取状态）</li>
 *   <li>POST /api/v1/tasks/{code}/claim —— 领取任务奖励（@Idempotent，奖励入交友币钱包）</li>
 *   <li>GET /api/v1/tasks/progress —— 各任务完成度聚合</li>
 * </ul>
 *
 * <p>任务：daily-checkin（每日签到）/ complete-profile（完善资料）/ first-post（发布首条动态）/
 * campus-verify（校园认证）；奖励积分与前端 pages/profile/tasks.vue 对齐（+5/+50/+20/+100）。</p>
 */
@RestController
@RequestMapping("/api/v1/tasks")
@Validated
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /**
     * 任务列表。
     * GET /api/v1/tasks
     *
     * @return 任务视图列表（含进度/领取状态/是否可领取）
     */
    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<TaskService.TaskView>> listTasks() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(taskService.listTasks(userId));
    }

    /**
     * 领取任务奖励。
     * POST /api/v1/tasks/{code}/claim
     *
     * @param code 任务编码（daily-checkin/complete-profile/first-post/campus-verify）
     * @return 领取结果视图（含奖励积分与钱包余额）
     */
    @PostMapping("/{code}/claim")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<TaskService.ClaimResultView> claim(@PathVariable("code") @NotBlank String code) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(taskService.claim(userId, code));
    }

    /**
     * 任务进度聚合。
     * GET /api/v1/tasks/progress
     *
     * @return 各任务完成度聚合（完成数/领取数/已领取与总奖励积分/百分比）
     */
    @GetMapping("/progress")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<TaskService.TaskProgressView> getProgress() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(taskService.getProgress(userId));
    }
}
