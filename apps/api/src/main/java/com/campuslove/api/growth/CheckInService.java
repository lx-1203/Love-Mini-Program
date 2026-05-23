package com.campuslove.api.growth;

/**
 * 签到服务接口。
 * 提供签到和查询签到状态的功能。
 */
public interface CheckInService {

    /**
     * 执行签到。
     *
     * @param userId 用户 ID
     * @return 签到结果视图
     */
    CheckInResultView checkIn(Long userId);

    /**
     * 查询今日签到状态。
     *
     * @param userId 用户 ID
     * @return 签到状态视图
     */
    CheckInStatusView getCheckInStatus(Long userId);
}
