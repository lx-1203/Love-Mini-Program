package com.campuslove.api.growth;

/**
 * 签到服务接口。
 * 提供签到、查询签到状态、补签的功能。
 *
 * 功能7：新增 makeUp 方法，用于补签昨日及之前 7 天内的某一天。
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

    /**
     * 功能7：签到补签。
     *
     * 业务规则：
     * - 仅可补签昨日及之前 7 天内的日期
     * - 不能补签未来日期或当天
     * - 不能补签已签到过的日期
     * - 每月补签次数上限默认 3 次（由 MakeUpQuota.limitCount 控制）
     * - 首次补签免费，其后每次消耗 50 积分（积分扣减由调用方/前端展示，此处仅返回 costPoints）
     *
     * @param userId 用户 ID
     * @param date   补签日期（yyyy-MM-dd）
     * @return 补签结果视图（含连续天数、已用次数、消耗积分）
     * @throws IllegalArgumentException 日期格式无效、超出范围、已签到过、超出月配额时抛出
     */
    MakeUpCheckInResultView makeUp(Long userId, String date);
}
