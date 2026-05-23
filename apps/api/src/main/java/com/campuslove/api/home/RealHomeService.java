package com.campuslove.api.home;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 真实首页服务实现存根。
 * 在 real profile 下激活，Phase 2 将使用 Repository 实现数据库查询。
 * 当前返回空的默认仪表盘视图，避免抛出异常导致首页不可用。
 */
@Profile("real")
@Service
public class RealHomeService implements HomeService {

    // TODO: Phase 2 - 注入 UserRepository, ScheduleRepository 等

    /**
     * 获取首页仪表盘视图。
     * 当前返回空的默认视图，Phase 2 将从数据库查询真实数据。
     *
     * @return 空的默认仪表盘视图
     */
    @Override
    public HomeDashboardView getDashboard() {
        // TODO: Phase 2 - 从数据库查询用户课表、推荐、活动等数据

        // 返回空的默认仪表盘视图，避免抛出异常
        return new HomeDashboardView(
            /* scheduleSummary */ new HomeCardView(
                "schedule-summary", "暂无课表数据", "请先完善您的日程资料", null, "去设置"
            ),
            /* freeSlots */ List.of(),
            /* aiPlan */ new HomeCardView(
                "ai-plan", "智能推荐", "AI 推荐功能即将上线", null, null
            ),
            /* recommendedPeople */ List.of(),
            /* peopleLead */ "发现更多有趣的人",
            /* activityPreview */ new ActivityPreviewView(
                "活动推荐", "查看近期活动", "查看活动", List.of(), null, null
            )
        );
    }
}
