package com.campuslove.api.mock;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.official.OfficialAccountService;
import com.campuslove.api.official.OfficialAccountView;
import com.campuslove.api.official.OfficialActivityCardView;
import com.campuslove.api.official.OfficialMessageView;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 官方号服务实现。
 * 在 mock profile 下激活，使用内存常量返回模拟数据。
 */
@Profile("mock")
@Service
public class MockOfficialAccountService implements OfficialAccountService {

    private static final OfficialAccountView ASSISTANT = new OfficialAccountView(
            1L,
            "official-assistant",
            "寻觅助手",
            "你的恋爱小管家",
            "/static/assets/message/svg/assistant_avatar.svg");

    @Override
    public List<OfficialAccountView> getAccounts() {
        return List.of(ASSISTANT);
    }

    @Override
    public List<OfficialMessageView> getMessages(String code) {
        if (!"official-assistant".equals(code)) {
            return List.of();
        }
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        return List.of(
                new OfficialMessageView(101L, "text",
                        "你好，我是寻觅助手 🌱 今天也会帮你抓住真正重要的关系。",
                        null, null, null, null, now.minusDays(4)),
                new OfficialMessageView(102L, "text",
                        "有人喜欢你：进入消息页今日心动，看看谁想认识你。",
                        null, null, null, null, now.minusDays(3)),
                new OfficialMessageView(103L, "card",
                        "周末附近有一场适合你的露营活动，名额不多啦。",
                        "城市露营计划",
                        "周六 14:00 · 距离 2.3km",
                        "周末活动",
                        "/subpackages/discover/activities/index",
                        now.minusDays(2),
                        new OfficialActivityCardView(2001L, "城市露营计划",
                                "/static/assets/images/activities/activity-sports.jpg",
                                "周六 14:00",
                                "2.3km",
                                12,
                                "你和小林都喜欢咖啡与户外")),
                new OfficialMessageView(104L, "text",
                        "建议回复小林：你们已经连续聊天 3 天啦。",
                        null, null, null, null, now.minusDays(1)));
    }
}
