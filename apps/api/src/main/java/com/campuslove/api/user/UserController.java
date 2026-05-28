package com.campuslove.api.user;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.profile.ProfileService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户关注关系与在线状态控制器。
 * 提供关注、取关、查询粉丝列表、查询关注列表、判断关注状态、在线状态查询等接口。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/users")
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
    public FollowView followUser(@PathVariable("id") Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return profileService.followUser(userId, id);
    }

    /**
     * 取消关注用户。
     * DELETE /api/users/{id}/follow
     *
     * @param id 目标用户 ID（被关注者）
     * @return 取关操作结果
     */
    @DeleteMapping("/{id}/follow")
    public FollowView unfollowUser(@PathVariable("id") Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return profileService.unfollowUser(userId, id);
    }

    /**
     * 获取指定用户的粉丝列表。
     * GET /api/users/{id}/followers
     *
     * @param id 用户 ID
     * @return 粉丝用户列表
     */
    @GetMapping("/{id}/followers")
    public List<FollowUserView> getFollowers(@PathVariable("id") Long id) {
        return profileService.getFollowers(id);
    }

    /**
     * 获取指定用户的关注列表。
     * GET /api/users/{id}/following
     *
     * @param id 用户 ID
     * @return 关注用户列表
     */
    @GetMapping("/{id}/following")
    public List<FollowUserView> getFollowing(@PathVariable("id") Long id) {
        return profileService.getFollowing(id);
    }

    /**
     * 查询当前用户是否关注了目标用户。
     * GET /api/users/{id}/is-following
     *
     * @param id 目标用户 ID
     * @return 是否已关注
     */
    @GetMapping("/{id}/is-following")
    public ResponseEntity<IsFollowingView> isFollowing(@PathVariable("id") Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        boolean following = profileService.isFollowing(userId, id);
        return ResponseEntity.ok(new IsFollowingView(following));
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
    public ResponseEntity<OnlineStatusView> getOnlineStatus(@PathVariable("userId") Long userId) {
        try {
            OnlineStatusView view = onlineStatusService.getOnlineStatus(userId);
            return ResponseEntity.ok(view);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 批量查询多个用户的在线状态。
     * POST /api/users/online-status/batch
     *
     * @param request 批量查询请求体（包含用户 ID 列表）
     * @return 用户 ID 到在线状态视图的映射
     */
    @PostMapping("/online-status/batch")
    public ResponseEntity<Map<Long, OnlineStatusView>> batchGetOnlineStatus(
            @RequestBody BatchOnlineStatusRequest request) {
        try {
            Map<Long, OnlineStatusView> result = onlineStatusService.batchGetOnlineStatus(request.userIds());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
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
record BatchOnlineStatusRequest(List<Long> userIds) {
}
