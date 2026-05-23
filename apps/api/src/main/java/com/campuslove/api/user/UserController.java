package com.campuslove.api.user;

import com.campuslove.api.user.FollowUserView;
import com.campuslove.api.user.FollowView;
import com.campuslove.api.profile.ProfileService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户关注关系控制器。
 * 提供关注、取关、查询粉丝列表、查询关注列表、判断关注状态等接口。
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final ProfileService profileService;

    public UserController(ProfileService profileService) {
        this.profileService = profileService;
    }

    /**
     * 关注用户。
     * POST /api/users/{id}/follow?userId=xxx
     *
     * @param id     目标用户 ID（被关注者）
     * @param userId 当前用户 ID（关注者）
     * @return 关注操作结果
     */
    @PostMapping("/{id}/follow")
    public FollowView followUser(
            @PathVariable("id") Long id,
            @RequestParam("userId") Long userId) {
        return profileService.followUser(userId, id);
    }

    /**
     * 取消关注用户。
     * DELETE /api/users/{id}/follow?userId=xxx
     *
     * @param id     目标用户 ID（被关注者）
     * @param userId 当前用户 ID（关注者）
     * @return 取关操作结果
     */
    @DeleteMapping("/{id}/follow")
    public FollowView unfollowUser(
            @PathVariable("id") Long id,
            @RequestParam("userId") Long userId) {
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
     * GET /api/users/{id}/is-following?userId=xxx
     *
     * @param id     目标用户 ID
     * @param userId 当前用户 ID
     * @return 是否已关注
     */
    @GetMapping("/{id}/is-following")
    public ResponseEntity<IsFollowingView> isFollowing(
            @PathVariable("id") Long id,
            @RequestParam("userId") Long userId) {
        boolean following = profileService.isFollowing(userId, id);
        return ResponseEntity.ok(new IsFollowingView(following));
    }
}

/**
 * 是否关注状态视图。
 */
record IsFollowingView(boolean isFollowing) {
}
