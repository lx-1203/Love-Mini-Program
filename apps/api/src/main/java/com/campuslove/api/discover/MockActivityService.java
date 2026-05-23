package com.campuslove.api.discover;

import com.campuslove.api.runtime.MockRuntimeState;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Mock 活动服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟数据。
 */
@Profile("mock")
@Service
public class MockActivityService implements ActivityService {

    private final MockRuntimeState runtimeState;

    /** Mock 报名状态存储：activityId_userId -> enrolled */
    private final Map<String, Boolean> enrollmentMap = new ConcurrentHashMap<>();

    public MockActivityService(MockRuntimeState runtimeState) {
        this.runtimeState = runtimeState;
    }

    @Override
    public Page<ActivityView> getActivities(String campusName, Pageable pageable) {
        List<ActivityView> activities = runtimeState.activityRecommendations().stream()
                .map(item -> new ActivityView(
                        Long.valueOf(item.id()),
                        item.title(),
                        item.location(),
                        item.scheduleText(),
                        item.description(),
                        item.enrollmentCount(),
                        item.participantAvatars(),
                        "upcoming",
                        LocalDate.now().plusDays(1)
                ))
                .toList();

        return new PageImpl<>(activities, pageable, activities.size());
    }

    @Override
    public ActivityDetailView getActivityDetail(Long activityId, Long userId) {
        if (activityId == null) {
            throw new IllegalArgumentException("activityId is required");
        }

        MockRuntimeState.ActivityRecommendationData activity = runtimeState.activityRecommendations().stream()
                .filter(a -> a.id().equals(String.valueOf(activityId)))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        String key = activityId + "_" + userId;
        boolean isEnrolled = enrollmentMap.getOrDefault(key, false);

        return new ActivityDetailView(
                Long.valueOf(activity.id()),
                activity.title(),
                activity.location(),
                activity.scheduleText(),
                activity.description(),
                activity.enrollmentCount(),
                activity.participantAvatars(),
                "upcoming",
                LocalDate.now().plusDays(1),
                isEnrolled
        );
    }

    @Override
    public ActivityEnrollmentResultView enrollActivity(Long userId, Long activityId) {
        if (activityId == null) {
            throw new IllegalArgumentException("activityId is required");
        }

        String key = activityId + "_" + userId;
        enrollmentMap.put(key, true);

        MockRuntimeState.ActivityRecommendationData activity = runtimeState.activityRecommendations().stream()
                .filter(a -> a.id().equals(String.valueOf(activityId)))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        int enrollmentCount = activity.enrollmentCount() + 1;
        return new ActivityEnrollmentResultView(activityId, true, enrollmentCount);
    }

    @Override
    public ActivityEnrollmentResultView cancelEnrollment(Long userId, Long activityId) {
        if (activityId == null) {
            throw new IllegalArgumentException("activityId is required");
        }

        String key = activityId + "_" + userId;
        enrollmentMap.remove(key);

        MockRuntimeState.ActivityRecommendationData activity = runtimeState.activityRecommendations().stream()
                .filter(a -> a.id().equals(String.valueOf(activityId)))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        return new ActivityEnrollmentResultView(activityId, false, activity.enrollmentCount());
    }
}
