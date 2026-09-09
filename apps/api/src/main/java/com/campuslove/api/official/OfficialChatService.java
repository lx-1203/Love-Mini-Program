package com.campuslove.api.official;

import com.campuslove.api.entity.OfficialAccount;
import com.campuslove.api.entity.OfficialChatMessage;
import com.campuslove.api.repository.OfficialAccountRepository;
import com.campuslove.api.repository.OfficialChatMessageRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 官方客服双向会话服务（R16 2026-09-07）。
 *
 * <p>用户在寻觅助手会话里发送的消息落库（official_chat_messages），并生成一条
 * 规则化的助手回复；此前客户端发送是纯本地 echo 桩，消息不落库、刷新即丢。</p>
 */
@Service
public class OfficialChatService {

    private final OfficialChatMessageRepository chatMessageRepository;
    private final OfficialAccountRepository accountRepository;

    public OfficialChatService(OfficialChatMessageRepository chatMessageRepository,
                               OfficialAccountRepository accountRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.accountRepository = accountRepository;
    }

    /**
     * 用户发送一条消息：落库 + 生成助手回复（规则化）。
     *
     * @return 用户消息与助手回复（均已落库）
     */
    @Transactional
    public List<OfficialMessageView> sendUserMessage(String code, Long userId, String content) {
        OfficialAccount account = accountRepository.findByCode(code).orElse(null);
        long accountId = account != null ? account.getId() : 0L;
        LocalDateTime now = LocalDateTime.now();

        OfficialChatMessage userMessage = new OfficialChatMessage();
        userMessage.setUserId(userId);
        userMessage.setAccountId(accountId);
        userMessage.setDirection(OfficialChatMessage.Direction.user.name());
        userMessage.setContent(content);
        userMessage.setCreatedAt(now);
        chatMessageRepository.save(userMessage);

        OfficialChatMessage reply = new OfficialChatMessage();
        reply.setUserId(userId);
        reply.setAccountId(accountId);
        reply.setDirection(OfficialChatMessage.Direction.assistant.name());
        reply.setContent(buildAssistantReply(content));
        reply.setCreatedAt(now.plusNanos(1_000_000));
        chatMessageRepository.save(reply);

        List<OfficialMessageView> views = new ArrayList<>();
        views.add(toView(userMessage));
        views.add(toView(reply));
        return views;
    }

    /**
     * 某用户在某官方号下的会话消息（双向，时间升序）。
     * 与广播流合并由调用方决定；账号不存在时返回空列表。
     */
    public List<OfficialMessageView> getConversation(String code, Long userId) {
        OfficialAccount account = accountRepository.findByCode(code).orElse(null);
        if (account == null) {
            return List.of();
        }
        return chatMessageRepository
                .findByUserIdAndAccountIdOrderByCreatedAtAsc(userId, account.getId())
                .stream().map(this::toView).toList();
    }

    /**
     * 规则化助手回复：命中关键词给运营话术，未命中给通用引导。
     * 后续可替换为 AGNES 接入（app.agnes.api-base 已预留）。
     */
    private String buildAssistantReply(String content) {
        String text = content == null ? "" : content.toLowerCase();
        if (text.contains("报名") || text.contains("活动")) {
            return "报名活动很简单：进入「附近 → 附近活动」或消息页的活动卡片，点「感兴趣 / 立即报名」就锁定名额啦～活动开始前一天我会提醒你！";
        }
        if (text.contains("喜欢") || text.contains("匹配")) {
            return "在寻觅页点「喜欢」，如果对方也喜欢你就匹配成功，可以直接开始聊天！收到喜欢的话，消息页「有人喜欢你」里也能看到哦～";
        }
        if (text.contains("访客") || text.contains("看过")) {
            return "查看谁看过你：进入「我的 → 访客记录」，喜欢你的访客会优先展示；回复他们可以解锁更多互动～";
        }
        if (text.contains("签到") || text.contains("币") || text.contains("积分")) {
            return "每日签到可以领交友币，连续签到还有翻倍奖励；交友币可以用来解锁访客、喜欢你等权益～";
        }
        if (text.contains("你好") || text.contains("hi") || text.contains("hello")) {
            return "你好呀～我是寻觅助手 🌱 有任何恋爱困惑、功能使用问题都可以问我！";
        }
        if (text.contains("谢谢") || text.contains("感谢")) {
            return "不客气～祝你早日遇见同频的人！有事随时找我 🌱";
        }
        return "收到啦～我会帮你留意合适的活动和人物。你也可以问我「怎么报名活动」「怎么解锁访客」这类问题哦！";
    }

    private OfficialMessageView toView(OfficialChatMessage message) {
        boolean fromUser = OfficialChatMessage.Direction.user.name().equals(message.getDirection());
        // messageType 沿用广播流的 text 语义；direction 由客户端判别左右
        return new OfficialMessageView(
                message.getId(),
                "text",
                message.getContent(),
                null, null, null, null,
                message.getCreatedAt(),
                null,
                fromUser ? "user" : "assistant");
    }
}
