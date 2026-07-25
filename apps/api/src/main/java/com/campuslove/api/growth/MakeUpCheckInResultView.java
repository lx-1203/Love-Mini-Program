package com.campuslove.api.growth;

/**
 * 签到补签结果视图（功能7）。
 *
 * 对应 POST /api/check-in/make-up 返回的结果。
 * 包含补签是否成功、补签后连续天数、本月已用次数和消耗积分信息。
 */
public record MakeUpCheckInResultView(

    /** 补签是否成功 */
    boolean success,

    /** 补签的日期（yyyy-MM-dd） */
    String checkInDate,

    /** 补签后连续签到天数 */
    int consecutiveDays,

    /** 本月已用补签次数 */
    int usedMakeUpCount,

    /** 本月补签次数上限 */
    int makeUpLimit,

    /** 补签消耗的积分（0 表示免费补签，首次补签免费） */
    int costPoints
) {
}
