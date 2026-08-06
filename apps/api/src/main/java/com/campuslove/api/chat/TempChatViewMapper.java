package com.campuslove.api.chat;

import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.TempChatContactExchange;
import com.campuslove.api.entity.TempChatMessage;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.TempChatContactExchangeRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 临时聊天视图转换器（Task 4.2.3 拆分，Task 4.2 进一步抽取）。
 *
 * <p>职责：将 {@link TempChatSession} / {@link TempChatMessage} 等实体
 * 转换为前端所需的 View 对象（{@link TempChatSessionView} /
 * {@link ChatSessionSummaryView} / {@link ChatMessageView} /
 * {@link RecommendedPersonCardView}），并组装对方用户信息与联系交换状态。</p>
 *
 * <p>从 {@link TempChatSessionService} 抽离，避免会话生命周期管理类承担过多视图组装职责。
 * 该组件不持有事务，所有方法均为纯读操作（数据库查询除外）。</p>
 */
@Profile("real")
@Component
public class TempChatViewMapper {

    private final UserRepository userRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final TempChatContactExchangeRepository contactExchangeRepository;
    private final TempChatMessageRepository messageRepository;

    public TempChatViewMapper(
            UserRepository userRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            TempChatContactExchangeRepository contactExchangeRepository,
            TempChatMessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.contactExchangeRepository = contactExchangeRepository;
        this.messageRepository = messageRepository;
    }

    /**
     * 将 TempChatSession 实体转换为 TempChatSessionView。
     * 包含消息列表（过期会话返回空列表）和联系交换状态。
     */
    public TempChatSessionView toSessionView(TempChatSession session, Long currentUserId,
                                             boolean sessionExpired) {
        Long partnerId = session.getUserAId().equals(currentUserId)
                ? session.getUserBId() : session.getUserAId();
        PartnerInfo partnerInfo = getPartnerInfo(partnerId);

        List<ChatMessageView> messages;
        if (session.getPhase() == SessionPhase.expired || sessionExpired) {
            messages = List.of();
        } else {
            List<TempChatMessage> messageList = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
            messages = messageList.stream().map(this::toMessageView).toList();
        }

        ContactExchangeStateView contactExchange = getContactExchangeView(session);

        return new TempChatSessionView(
                session.getSessionUid(),
                String.valueOf(partnerId),
                partnerInfo.name(),
                partnerInfo.headline(),
                partnerInfo.availability(),
                session.getPhase().name(),
                session.getClosesAt().toString(),
                session.getClosedReason(),
                messages,
                contactExchange
        );
    }

    /**
     * 将 TempChatSession 实体转换为 ChatSessionSummaryView。
     */
    public ChatSessionSummaryView toSummary(TempChatSession session, Long currentUserId) {
        Long partnerId = session.getUserAId().equals(currentUserId)
                ? session.getUserBId() : session.getUserAId();
        PartnerInfo partnerInfo = getPartnerInfo(partnerId);

        int unreadCount = session.getUserAId().equals(currentUserId)
                ? session.getUserAUnreadCount()
                : session.getUserBUnreadCount();

        String contactExchangeStatus = getContactExchangeStatus(session);

        return new ChatSessionSummaryView(
                session.getSessionUid(),
                String.valueOf(partnerId),
                partnerInfo.name(),
                partnerInfo.headline(),
                partnerInfo.availability(),
                session.getPhase().name(),
                session.getClosesAt().toString(),
                session.getClosedReason(),
                session.getLastMessagePreview(),
                session.getLastMessageAt() != null ? session.getLastMessageAt().toString() : null,
                contactExchangeStatus,
                Boolean.TRUE.equals(session.getIsPinned()),
                unreadCount
        );
    }

    /** 将消息实体转换为视图。 */
    public ChatMessageView toMessageView(TempChatMessage message) {
        return new ChatMessageView(
                String.valueOf(message.getId()),
                message.getSender(),
                message.getKind(),
                message.getBody(),
                message.getCreatedAt().toString(),
                message.getDurationSeconds(),
                Boolean.TRUE.equals(message.getRecalled()),
                message.getDeliveryStatus() != null ? message.getDeliveryStatus() : "sent",
                null, null, null
        );
    }

    /** 将推荐人物视图转换为卡片视图。 */
    public RecommendedPersonCardView toRecommendedPersonCard(
            com.campuslove.api.discover.RecommendedPersonView person) {
        return new RecommendedPersonCardView(
                String.valueOf(person.id()),
                person.name(),
                person.initials(),
                person.headline(),
                person.commonGround(),
                person.availability()
        );
    }

    /**
     * 批量预加载对方用户信息 Map（partnerId → PartnerInfo），
     * 避免会话列表逐会话 4 次查库（user/basic/campus/schedule，N+1）。
     *
     * @param partnerIds 对方用户 ID 列表（可含 null/重复）
     * @return 对方用户信息映射
     */
    public Map<Long, PartnerInfo> loadPartnerInfoMap(List<Long> partnerIds) {
        List<Long> distinct = partnerIds.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, User> userMap = userRepository.findByIdIn(distinct).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        Map<Long, UserBasicProfile> basicMap = userBasicProfileRepository.findByUserIdIn(distinct).stream()
                .collect(Collectors.toMap(UserBasicProfile::getUserId, p -> p, (a, b) -> a));
        Map<Long, UserCampusProfile> campusMap = userCampusProfileRepository.findByUserIdIn(distinct).stream()
                .collect(Collectors.toMap(UserCampusProfile::getUserId, p -> p, (a, b) -> a));
        Map<Long, UserScheduleProfile> scheduleMap = userScheduleProfileRepository.findByUserIdIn(distinct).stream()
                .collect(Collectors.toMap(UserScheduleProfile::getUserId, p -> p, (a, b) -> a));

        Map<Long, PartnerInfo> result = new HashMap<>();
        for (Long id : distinct) {
            User partner = userMap.get(id);
            String name = partner != null ? partner.getNickname() : DisplayConstants.UNKNOWN_USER;
            result.put(id, new PartnerInfo(name,
                    buildHeadline(basicMap.get(id), campusMap.get(id)),
                    buildAvailability(scheduleMap.get(id))));
        }
        return result;
    }

    /**
     * 将 TempChatSession 实体转换为 ChatSessionSummaryView（批量预加载版本）。
     *
     * @param session        会话实体
     * @param currentUserId  当前用户 ID
     * @param partnerInfoMap 批量预加载的对方用户信息 Map
     * @return 会话摘要视图
     */
    public ChatSessionSummaryView toSummary(TempChatSession session, Long currentUserId,
                                            Map<Long, PartnerInfo> partnerInfoMap) {
        Long partnerId = session.getUserAId().equals(currentUserId)
                ? session.getUserBId() : session.getUserAId();
        PartnerInfo partnerInfo = partnerInfoMap.get(partnerId);
        if (partnerInfo == null) {
            // 兜底：Map 缺失时单查（理论不发生）
            partnerInfo = getPartnerInfo(partnerId);
        }

        int unreadCount = session.getUserAId().equals(currentUserId)
                ? session.getUserAUnreadCount()
                : session.getUserBUnreadCount();

        String contactExchangeStatus = getContactExchangeStatus(session);

        return new ChatSessionSummaryView(
                session.getSessionUid(),
                String.valueOf(partnerId),
                partnerInfo.name(),
                partnerInfo.headline(),
                partnerInfo.availability(),
                session.getPhase().name(),
                session.getClosesAt().toString(),
                session.getClosedReason(),
                session.getLastMessagePreview(),
                session.getLastMessageAt() != null ? session.getLastMessageAt().toString() : null,
                contactExchangeStatus,
                Boolean.TRUE.equals(session.getIsPinned()),
                unreadCount
        );
    }

    /** 获取对方用户信息（昵称、简介、可用时间）。 */
    private PartnerInfo getPartnerInfo(Long partnerId) {
        User partner = userRepository.findById(partnerId).orElse(null);
        UserBasicProfile basicProfile = userBasicProfileRepository.findByUserId(partnerId).orElse(null);
        UserCampusProfile campusProfile = userCampusProfileRepository.findByUserId(partnerId).orElse(null);
        UserScheduleProfile scheduleProfile = userScheduleProfileRepository.findByUserId(partnerId).orElse(null);

        String name = partner != null ? partner.getNickname() : DisplayConstants.UNKNOWN_USER;
        String headline = buildHeadline(basicProfile, campusProfile);
        String availability = buildAvailability(scheduleProfile);
        return new PartnerInfo(name, headline, availability);
    }

    /** 构建对方简介文本。 */
    private String buildHeadline(UserBasicProfile basicProfile, UserCampusProfile campusProfile) {
        StringBuilder sb = new StringBuilder();
        if (basicProfile != null && hasText(basicProfile.getGradeLabel())) {
            sb.append(basicProfile.getGradeLabel());
        }
        if (campusProfile != null && hasText(campusProfile.getDepartmentName())) {
            if (!sb.isEmpty()) sb.append("，");
            sb.append(campusProfile.getDepartmentName());
        }
        if (basicProfile != null && hasText(basicProfile.getBio())) {
            if (!sb.isEmpty()) sb.append("，");
            String bio = basicProfile.getBio().length() > 20
                    ? basicProfile.getBio().substring(0, 20) + "..."
                    : basicProfile.getBio();
            sb.append(bio);
        }
        return sb.isEmpty() ? "一位校园同学" : sb.toString();
    }

    /** 构建可用时间提示。 */
    private String buildAvailability(UserScheduleProfile scheduleProfile) {
        if (scheduleProfile == null) return "合适时间：待确认";
        String area = scheduleProfile.getPreferredCampusArea();
        return hasText(area) ? "合适时间：" + area : "合适时间：待确认";
    }

    /** 获取联系交换状态视图。 */
    private ContactExchangeStateView getContactExchangeView(TempChatSession session) {
        Optional<TempChatContactExchange> exchangeOpt = contactExchangeRepository.findBySessionId(session.getId());
        if (exchangeOpt.isEmpty()) {
            return new ContactExchangeStateView(null, "idle");
        }
        TempChatContactExchange exchange = exchangeOpt.get();
        return new ContactExchangeStateView(exchange.getProposer(), exchange.getStatus());
    }

    /** 获取联系交换状态字符串。 */
    private String getContactExchangeStatus(TempChatSession session) {
        return contactExchangeRepository.findBySessionId(session.getId())
                .map(TempChatContactExchange::getStatus).orElse("idle");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /** 对方用户信息内部记录（包可见，供 TempChatSessionService 批量预加载使用）。 */
    record PartnerInfo(String name, String headline, String availability) {
    }
}
