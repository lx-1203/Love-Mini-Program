package com.campuslove.api.profile;

import com.campuslove.api.common.ApiResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Mock 个人资料控制器（3-D 个人资料）。
 *
 * <p>mock profile 下激活。真实 {@link ProfileController} 依赖 JPA（UserRepository），
 * 在 mock（无 JPA）下不注册，故统一脱敏读取（basic/campus/schedule/stats）由本类
 * 委托 {@link ProfileService}（mock 实现 {@link MockProfileService}）提供，避免前端 404。</p>
 */
@Profile("mock")
@RestController
@RequestMapping("/api/v1/profile")
public class MockProfileController {

    private final ProfileService profileService;

    public MockProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    /** 资料统计（进度、资产统计）。 */
    @GetMapping("/stats")
    public ApiResponse<ProfileStatsView> getProfileStats() {
        return ApiResponse.ok(profileService.getProfileStats());
    }

    /** 基本资料。 */
    @GetMapping("/basic")
    public ApiResponse<BasicProfileView> getBasicProfile() {
        return ApiResponse.ok(profileService.getBasicProfile());
    }

    /** 校园资料。 */
    @GetMapping("/campus")
    public CampusProfileView getCampusProfile() {
        return profileService.getCampusProfile();
    }

    /** 课表资料。 */
    @GetMapping("/schedule")
    public ScheduleProfileView getScheduleProfile() {
        return profileService.getScheduleProfile();
    }
}