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
        return List.of(
                new IcebreakerView("可以先聊聊彼此的校园生活。", "daily", "generic"),
                new IcebreakerView("你最近在看什么书？", "interests", "generic"),
                new IcebreakerView("你最喜欢的校园角落是哪里？", "campus", "generic")
        );
    }
}
