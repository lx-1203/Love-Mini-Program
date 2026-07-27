package com.campuslove.api.clientconfig;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 客户端动态配置服务 Mock 实现（Task 3.6）。
 *
 * <p>在 mock profile 下激活，返回与 {@link RealConfigService} 一致的内置默认数据，
 * 便于本地联调与单元测试。Mock 实现不进行缓存（避免 CaffeineCacheConfig 在 mock 下
 * 也激活导致缓存语义混乱），由调用方按需在 Controller 层或测试中处理缓存。</p>
 */
@Profile("mock")
@Service
public class MockConfigService implements ConfigService {

    @Override
    public List<CampusView> loadCampuses() {
        return List.of(
                new CampusView("pku", "北京大学", "北京"),
                new CampusView("thu", "清华大学", "北京"),
                new CampusView("fudan", "复旦大学", "上海"),
                new CampusView("zju", "浙江大学", "杭州")
        );
    }

    @Override
    public List<MatchPreferenceOptionView> loadMatchPreferences() {
        return List.of(
                new MatchPreferenceOptionView(
                        "preference", "匹配偏好", true, "basic",
                        List.of(
                                new MatchPreferenceOptionView.OptionItem("same_school", "同校"),
                                new MatchPreferenceOptionView.OptionItem("nearby_school", "附近学校"),
                                new MatchPreferenceOptionView.OptionItem("cross_school", "跨校")
                        )
                ),
                new MatchPreferenceOptionView(
                        "timeRange", "可聊时间", false, "lifestyle",
                        List.of(
                                new MatchPreferenceOptionView.OptionItem("morning", "上午"),
                                new MatchPreferenceOptionView.OptionItem("afternoon", "下午"),
                                new MatchPreferenceOptionView.OptionItem("evening", "晚上")
                        )
                )
        );
    }

    @Override
    public List<FilterOptionView> loadFilterOptions() {
        return List.of(
                new FilterOptionView(
                        "activity_type",
                        List.of(
                                new FilterOptionView.OptionItem("online", "线上", null),
                                new FilterOptionView.OptionItem("offline", "线下", null),
                                new FilterOptionView.OptionItem("mixed", "线上线下结合", null)
                        )
                ),
                new FilterOptionView(
                        "forum_section",
                        List.of(
                                new FilterOptionView.OptionItem("interest", "兴趣", null),
                                new FilterOptionView.OptionItem("sincere", "真诚", null),
                                new FilterOptionView.OptionItem("hometown", "家乡", null),
                                new FilterOptionView.OptionItem("anonymous", "匿名", null),
                                new FilterOptionView.OptionItem("campus", "校园", null)
                        )
                ),
                new FilterOptionView(
                        "campus_topic_category",
                        List.of(
                                new FilterOptionView.OptionItem("course_exchange", "课程交流", null),
                                new FilterOptionView.OptionItem("club_recruitment", "社团招新", null),
                                new FilterOptionView.OptionItem("campus_activity", "校园活动", null),
                                new FilterOptionView.OptionItem("study_help", "学习互助", null),
                                new FilterOptionView.OptionItem("life_service", "生活服务", null),
                                new FilterOptionView.OptionItem("alumni_news", "校友动态", null)
                        )
                )
        );
    }

    @Override
    public List<HeroBannerView> loadHeroBanners() {
        return List.of(
                new HeroBannerView(
                        "banner-daily-fate", "", "今日缘分值98%",
                        "3位与你高度契合的同学", "/pages/discover/index", 1, true),
                new HeroBannerView(
                        "banner-new-user", "", "新人礼遇",
                        "完成任务领专属徽章", "/subpackages/discover/activities/index", 2, true),
                new HeroBannerView(
                        "banner-weekend-party", "", "周末派对",
                        "校园桌游局报名中", "/subpackages/discover/activities/index", 3, true),
                new HeroBannerView(
                        "banner-graduation", "", "毕业季告白",
                        "勇敢说出心里话", "/pages/circles/index", 4, true)
        );
    }

    @Override
    public List<UnlockGuideStepView> loadUnlockGuideSteps() {
        return List.of(
                new UnlockGuideStepView(
                        1, "完善基础资料", "完善昵称、头像、生日等基础信息，让 Ta 更容易认识你",
                        "去完善资料", "/subpackages/setup/profile/index", "暂不完善"),
                new UnlockGuideStepView(
                        2, "完成校园认证", "上传学生证完成校园认证，解锁匹配与私信功能",
                        "去认证", "/subpackages/setup/campus/index", "暂不认证"),
                new UnlockGuideStepView(
                        3, "发布第一条动态", "在村口发布你的第一条动态，让更多人发现你",
                        "去发布", "/pages/village/index", "稍后再说")
        );
    }
}
