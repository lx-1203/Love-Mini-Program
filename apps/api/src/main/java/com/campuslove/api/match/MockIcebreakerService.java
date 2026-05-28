package com.campuslove.api.match;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 破冰引导服务 Mock 实现。
 * 在 mock profile 下激活，返回模拟的破冰话题数据。
 */
@Profile("mock")
@Service
public class MockIcebreakerService implements IcebreakerService {

    @Override
    public List<IcebreakerView> getIcebreakers(Long matchId) {
        return getMockIcebreakers();
    }

    @Override
    public List<IcebreakerView> getMatchIcebreakers(Long userId, Long matchUserId) {
        return List.of(
                new IcebreakerView("嗨，很高兴认识你！看到你也喜欢摄影，我也超爱～", "interests", "common_interest", 100L),
                new IcebreakerView("你也在这个学校呀！阳光校区的图书馆你去过吗？", "campus", "same_school", 101L),
                new IcebreakerView("你们最近回答了同一个每日一问，可以聊聊各自的看法！", "daily", "common_answer", 102L)
        );
    }

    @Override
    public List<IcebreakerView> getProfileBasedIcebreakers(Long userId, Long peerUserId) {
        return List.of(
                new IcebreakerView("你也加入了摄影圈子！里面的讨论都好有意思", "circles", "common_circle", 103L),
                new IcebreakerView("我们都在计算机科学专业，以后可以一起交流学习呀～", "campus", "same_profession", 104L),
                new IcebreakerView("可以先聊聊彼此的校园生活。", "daily", "general")
        );
    }

    @Override
    public List<IcebreakerView> getGenericIcebreakers() {
        return List.of(
                new IcebreakerView("可以先聊聊彼此的校园生活。", "daily", "general"),
                new IcebreakerView("你最近在看什么书？", "interests", "general"),
                new IcebreakerView("你最喜欢的校园角落是哪里？", "campus", "general")
        );
    }

    private List<IcebreakerView> getMockIcebreakers() {
        return List.of(
                new IcebreakerView("可以先聊聊彼此的校园生活。", "daily", "general"),
                new IcebreakerView("你最近在看什么书？", "interests", "general"),
                new IcebreakerView("你最喜欢的校园角落是哪里？", "campus", "general")
        );
    }
}