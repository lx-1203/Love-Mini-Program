package com.campuslove.api.mock;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.official.OfficialAccountService;
import com.campuslove.api.official.OfficialAccountView;
import com.campuslove.api.official.OfficialMessageView;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 官方号服务实现。
 * 在 mock profile 下激活，使用内存常量返回模拟数据。
 *
 * <p>文案与 Flyway 种子数据（V2026.08.07.0003）对齐，
 * 保证 mock / real 双模式展示一致。</p>
 */
@Profile("mock")
@Service
public class MockOfficialAccountService implements OfficialAccountService {

    /** 官方账号（code -> 账号视图） */
    private static final Map<String, OfficialAccountView> ACCOUNTS = Map.of(
            "official-assistant",
            new OfficialAccountView(1L, "official-assistant", "产品助手",
                    "系统通知 · 功能答疑", ""),
            "official-promoter",
            new OfficialAccountView(2L, "official-promoter", "活动运营",
                    "活动推送 · 福利通知", "")
    );

    /** 消息流（code -> 消息列表，发布时间升序） */
    private static final Map<String, List<OfficialMessageView>> MESSAGES = Map.of(
            "official-assistant", List.of(
                    new OfficialMessageView(101L, "text",
                            "你好，我是产品助手 🤖 有任何恋爱困惑、功能使用问题都可以问我～",
                            null, null, null, null, LocalDateTime.now(TimeZones.BUSINESS).minusDays(4)),
                    new OfficialMessageView(102L, "text",
                            "解锁访客 / 喜欢你：进入消息页点击对应入口，可使用交友币解锁全部内容。",
                            null, null, null, null, LocalDateTime.now(TimeZones.BUSINESS).minusDays(3)),
                    new OfficialMessageView(103L, "text",
                            "缘分速配玩法：随机匹配后，互发 5 条解锁更多信息，聊满 20 条解锁 TA 的主页。",
                            null, null, null, null, LocalDateTime.now(TimeZones.BUSINESS).minusDays(2)),
                    new OfficialMessageView(104L, "text",
                            "开通会员后，访客 / 喜欢你 / 私信全部免费解锁，快去看看吧～",
                            null, null, null, null, LocalDateTime.now(TimeZones.BUSINESS).minusDays(1))
            ),
            "official-promoter", List.of(
                    new OfficialMessageView(201L, "text",
                            "每日签到可领交友币，连续签到奖励翻倍！",
                            null, null, null, null, LocalDateTime.now(TimeZones.BUSINESS).minusDays(5)),
                    new OfficialMessageView(202L, "card",
                            "本周五晚 19:00 校园操场，现场抽幸运观众上台告白～",
                            "校园操场「星空告白夜」",
                            "本周五晚 19:00 · 现场抽幸运观众上台告白",
                            "本周活动",
                            // R4-00405：原指向 /pages/activities/detail?id=star-confession，
                            // 对应活动不存在于任何数据源（死链）——改为活动列表页（始终可达）
                            "/pages/activities/index",
                            LocalDateTime.now(TimeZones.BUSINESS).minusDays(4)),
                    new OfficialMessageView(203L, "text",
                            "七夕特别企划：在星空下认识心动的人，游戏与表白墙等你来解锁。",
                            null, null, null, null, LocalDateTime.now(TimeZones.BUSINESS).minusDays(2)),
                    new OfficialMessageView(204L, "card",
                            "在星空下认识心动的人，游戏与表白墙等你来解锁。",
                            "七夕特别企划：星空告白夜",
                            "在星空下认识心动的人，游戏与表白墙等你来解锁。",
                            "七夕限定",
                            // R4-00405：同 202L，改指向活动列表页（活动详情死链修复）
                            "/pages/activities/index",
                            LocalDateTime.now(TimeZones.BUSINESS).minusDays(1))
            )
    );

    @Override
    public List<OfficialAccountView> getAccounts() {
        return List.copyOf(ACCOUNTS.values());
    }

    @Override
    public List<OfficialMessageView> getMessages(String code) {
        List<OfficialMessageView> messages = MESSAGES.get(code);
        return messages == null ? List.of() : messages;
    }
}
