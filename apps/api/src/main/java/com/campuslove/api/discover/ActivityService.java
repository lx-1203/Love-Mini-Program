package com.campuslove.api.discover;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 活动服务接口。
 * 提供活动列表查询、活动详情、报名和取消报名等功能。
 */
public interface ActivityService {

    /**
     * 获取活动列表。
     * 可按校区名称过滤，返回分页结果。
     *
     * @param campusName 校区名称（可选，为 null 则不过滤）
     * @param pageable   分页参数
     * @return 活动视图分页列表
     */
    Page<ActivityView> getActivities(String campusName, Pageable pageable);

    /**
     * 获取活动详情。
     *
     * @param activityId 活动 ID
     * @param userId     当前用户 ID（可选，用于判断是否已报名）
     * @return 活动详情视图
     */
    ActivityDetailView getActivityDetail(Long activityId, Long userId);

    /**
     * 报名活动。
     * 创建报名记录并增加活动报名人数。
     *
     * @param userId     用户 ID
     * @param activityId 活动 ID
     * @return 报名操作结果视图
     */
    ActivityEnrollmentResultView enrollActivity(Long userId, Long activityId);

    /**
     * 取消活动报名。
     * 删除报名记录并减少活动报名人数。
     *
     * @param userId     用户 ID
     * @param activityId 活动 ID
     * @return 取消报名操作结果视图
     */
    ActivityEnrollmentResultView cancelEnrollment(Long userId, Long activityId);
}
