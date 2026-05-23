package com.campuslove.api.discover;

import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.ActivityEnrollment;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实活动服务实现。
 * 在 real profile 下激活，使用 ActivityRepository 和 ActivityEnrollmentRepository 实现数据库查询。
 */
@Profile("real")
@Service
public class RealActivityService implements ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityEnrollmentRepository activityEnrollmentRepository;
    private final ObjectMapper objectMapper;

    public RealActivityService(
            ActivityRepository activityRepository,
            ActivityEnrollmentRepository activityEnrollmentRepository,
            ObjectMapper objectMapper) {
        this.activityRepository = activityRepository;
        this.activityEnrollmentRepository = activityEnrollmentRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 获取活动列表。
     * 优先返回 upcoming 状态的活动，可按校区名称过滤。
     *
     * @param campusName 校区名称（可选）
     * @param pageable   分页参数
     * @return 活动视图分页列表
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ActivityView> getActivities(String campusName, Pageable pageable) {
        Page<Activity> activities;

        if (campusName != null && !campusName.isBlank()) {
            // 按校区过滤，查询 upcoming 状态的活动
            activities = activityRepository.findByCampusNameAndStatusOrderByActivityDateAsc(
                    campusName, ActivityStatus.upcoming, pageable);
        } else {
            // 不限校区，查询所有 upcoming 状态的活动
            activities = activityRepository.findByStatusOrderByActivityDateAsc(
                    ActivityStatus.upcoming, pageable);
        }

        return activities.map(this::toActivityView);
    }

    /**
     * 获取活动详情。
     *
     * @param activityId 活动 ID
     * @param userId     当前用户 ID（可选，用于判断是否已报名）
     * @return 活动详情视图
     */
    @Override
    @Transactional(readOnly = true)
    public ActivityDetailView getActivityDetail(Long activityId, Long userId) {
        if (activityId == null) {
            throw new IllegalArgumentException("activityId is required");
        }

        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        boolean isEnrolled = false;
        if (userId != null) {
            isEnrolled = activityEnrollmentRepository.existsByActivityIdAndUserId(activityId, userId);
        }

        return new ActivityDetailView(
                activity.getId(),
                activity.getTitle(),
                activity.getLocation(),
                activity.getScheduleText(),
                activity.getDescription(),
                activity.getEnrollmentCount(),
                parseParticipantAvatars(activity.getParticipantAvatars()),
                activity.getStatus().name(),
                activity.getActivityDate(),
                isEnrolled
        );
    }

    /**
     * 报名活动。
     * 创建报名记录并增加活动报名人数。
     *
     * @param userId     用户 ID
     * @param activityId 活动 ID
     * @return 报名操作结果视图
     */
    @Override
    @Transactional
    public ActivityEnrollmentResultView enrollActivity(Long userId, Long activityId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (activityId == null) {
            throw new IllegalArgumentException("activityId is required");
        }

        // 检查活动是否存在
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        // 检查是否已报名
        if (activityEnrollmentRepository.existsByActivityIdAndUserId(activityId, userId)) {
            // 已报名，返回当前状态
            return new ActivityEnrollmentResultView(activityId, true, activity.getEnrollmentCount());
        }

        // 创建报名记录
        LocalDateTime now = LocalDateTime.now();
        ActivityEnrollment enrollment = new ActivityEnrollment();
        enrollment.setActivityId(activityId);
        enrollment.setUserId(userId);
        enrollment.setEnrolledAt(now);
        enrollment.setCreatedAt(now);
        activityEnrollmentRepository.save(enrollment);

        // 增加报名人数
        activity.setEnrollmentCount(activity.getEnrollmentCount() + 1);
        activityRepository.save(activity);

        return new ActivityEnrollmentResultView(activityId, true, activity.getEnrollmentCount());
    }

    /**
     * 取消活动报名。
     * 删除报名记录并减少活动报名人数。
     *
     * @param userId     用户 ID
     * @param activityId 活动 ID
     * @return 取消报名操作结果视图
     */
    @Override
    @Transactional
    public ActivityEnrollmentResultView cancelEnrollment(Long userId, Long activityId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (activityId == null) {
            throw new IllegalArgumentException("activityId is required");
        }

        // 检查活动是否存在
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        // 查找报名记录
        Optional<ActivityEnrollment> enrollmentOpt =
                activityEnrollmentRepository.findByActivityIdAndUserId(activityId, userId);

        if (enrollmentOpt.isEmpty()) {
            // 未报名，返回当前状态
            return new ActivityEnrollmentResultView(activityId, false, activity.getEnrollmentCount());
        }

        // 删除报名记录
        activityEnrollmentRepository.delete(enrollmentOpt.get());

        // 减少报名人数（不低于 0）
        activity.setEnrollmentCount(Math.max(0, activity.getEnrollmentCount() - 1));
        activityRepository.save(activity);

        return new ActivityEnrollmentResultView(activityId, false, activity.getEnrollmentCount());
    }

    /**
     * 将 Activity 实体转换为 ActivityView。
     */
    private ActivityView toActivityView(Activity activity) {
        return new ActivityView(
                activity.getId(),
                activity.getTitle(),
                activity.getLocation(),
                activity.getScheduleText(),
                activity.getDescription(),
                activity.getEnrollmentCount(),
                parseParticipantAvatars(activity.getParticipantAvatars()),
                activity.getStatus().name(),
                activity.getActivityDate()
        );
    }

    /**
     * 解析参与者头像 JSON 字符串为列表。
     *
     * @param json JSON 字符串
     * @return 头像 URL 列表
     */
    private List<String> parseParticipantAvatars(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }
}
