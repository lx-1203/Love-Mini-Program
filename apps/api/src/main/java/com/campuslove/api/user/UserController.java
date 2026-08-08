package com.campuslove.api.user;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.profile.ProfileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户关注关系与在线状态控制器。
 * 提供关注、取关、查询粉丝列表、查询关注列表、判断关注状态、在线状态查询等接口。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 *
 * <p>Task 42 / P2.19：所有 {@code @PathVariable Long} 参数均添加 {@link Positive} 校验，
 * 拒绝 0/负数 ID，避免无效数据库查询。</p>
 */
@RestController
@RequestMapping("/api/v1/users")
@Validated
public class UserController {

    private final ProfileService profileService;
    private final OnlineStatusService onlineStatusService;

    public UserController(ProfileService profileService, OnlineStatusService onlineStatusService) {
        this.profileService = profileService;
        this.onlineStatusService = onlineStatusService;
    }

    /**
     * 关注用户。
     * POST /api/users/{id}/follow
     *
     * @param id 目标用户 ID（被关注者）
     * @return 关注操作结果
     */
    @PostMapping("/{id}/follow")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FollowView> followUser(@PathVariable("id") @Positive Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(profileService.followUser(userId, id));
    }

    /**
     * 取消关注用户。
     * DELETE /api/users/{id}/follow
     *
     * @param id 目标用户 ID（被关注者）
     * @return 取关操作结果
     */
    @DeleteMapping("/{id}/follow")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FollowView> unfollowUser(@PathVariable("id") @Positive Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(profileService.unfollowUser(userId, id));
    }

    /**
     * 获取指定用户的粉丝列表（R4-00302 加分页，粉丝量大时避免全量返回）。
     * GET /api/users/{id}/followers?page=0&size=20
     *
     * @param id   用户 ID
     * @param page 页码（从 0 开始，默认 0）
     * @param size 每页大小（默认 20，最大 200）
     * @return 粉丝用户列表（当前页）
     */
    @GetMapping("/{id}/followers")
    public ApiResponse<List<FollowUserView>> getFollowers(
            @PathVariable("id") @Positive Long id,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(200) int size) {
        return ApiResponse.ok(profileService.getFollowers(id, page, size));
    }

    /**
     * 获取指定用户的关注列表（R4-00302 加分页）。
     * GET /api/users/{id}/following?page=0&size=20
     *
     * @param id   用户 ID
     * @param page 页码（从 0 开始，默认 0）
     * @param size 每页大小（默认 20，最大 200）
     * @return 关注用户列表（当前页）
     */
    @GetMapping("/{id}/following")
    public ApiResponse<List<FollowUserView>> getFollowing(
            @PathVariable("id") @Positive Long id,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(200) int size) {
        return ApiResponse.ok(profileService.getFollowing(id, page, size));
    }

    /**
     * 查询当前用户是否关注了目标用户。
     * GET /api/users/{id}/is-following
     *
     * @param id 目标用户 ID
     * @return 是否已关注
     */
    @GetMapping("/{id}/is-following")
    public ApiResponse<IsFollowingView> isFollowing(@PathVariable("id") @Positive Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        boolean following = profileService.isFollowing(userId, id);
        return ApiResponse.ok(new IsFollowingView(following));
    }

    // ---- 在线状态感知 ----

    /**
     * 查询指定用户的在线状态。
     * GET /api/users/{userId}/online-status
     *
     * @param userId 用户 ID
     * @return 在线状态视图
     */
    @GetMapping("/{userId}/online-status")
    public ApiResponse<OnlineStatusView> getOnlineStatus(@PathVariable("userId") @Positive Long userId) {
        return ApiResponse.ok(onlineStatusService.getOnlineStatus(userId));
    }

    /**
     * 批量查询多个用户的在线状态。
     * POST /api/users/online-status/batch
     *
     * @param request 批量查询请求体（包含用户 ID 列表）
     * @return 用户 ID 到在线状态视图的映射
     */
    @PostMapping("/online-status/batch")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Map<Long, OnlineStatusView>> batchGetOnlineStatus(
            @Valid @RequestBody BatchOnlineStatusRequest request) {
        return ApiResponse.ok(onlineStatusService.batchGetOnlineStatus(request.userIds()));
    }
}

/**
 * 是否关注状态视图。
 */
record IsFollowingView(boolean isFollowing) {
}

/**
 * 批量在线状态查询请求体。
 */
record BatchOnlineStatusRequest(
        @NotEmpty(message = ErrorMessages.USER_IDS_REQUIRED)
        @Size(max = 500, message = ErrorMessages.USER_IDS_MAX_COUNT)
        List<@Positive Long> userIds
) {
}
