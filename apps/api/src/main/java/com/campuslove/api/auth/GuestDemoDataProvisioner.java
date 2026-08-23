package com.campuslove.api.auth;

import org.springframework.context.annotation.Profile;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.ActivityEnrollment;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.entity.Visitor;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.VisitorRepository;
import org.springframework.data.domain.PageRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 体验账号流程演示数据播种器。
 *
 * <p>背景（2026-08-09）：R4-00251 将 guest-login 改为「每次登录创建独立临时账号」
 * （会话隔离），新体验账号除公开内容（推荐/圈子/活动）外，按用户维度的流程数据
 * （私信会话、喜欢我、访客、通知）为空，演示「完整流程」时无数据可展示。
 * 本组件在 {@link RealAuthService#provisionGuestProfile} 播种资料后调用，
 * 为每次新体验账号灌入一套与现有虚拟用户（10001-10014，V2026.08.07.0021/0023 创建）
 * 交互的演示数据，使一键体验即可完整演示：私信红点/已读会话、喜欢我、我的访客、
 * 消息页「喜欢与访客」通知角标、双向喜欢（匹配）等闭环。</p>
 *
 * <p>数据量：每体验账号约 23 条私信 + 7 条喜欢 + 5 条访客 + 7 条通知。
 * 由运营侧定期清理（与 R4-00251 已知代价一致）。</p>
 *
 * <p>幂等：按首个会话 conversation_uid（guest-demo-{userId}-{peerId}）判重，
 * 已播种过则整体跳过，避免重复灌入。</p>
 */
@Profile("real")
@Component
public class GuestDemoDataProvisioner {

    private static final Logger log = LoggerFactory.getLogger(GuestDemoDataProvisioner.class);

    /** 匹配池虚拟用户（V2026.08.07.0021/0023 创建，北京大学校区） */
    private static final long PEER_ZHOUYU = 10001L;   // 夏言（person-02，双向喜欢对象）
    private static final long PEER_LINWAN = 10002L;   // 阿辰（person-03）
    private static final long PEER_WALKTHROUGH = 8L;  // 走查号

    /** 喜欢我的虚拟用户（V2026.08.09.0017 口径 10009-10014） */
    private static final long[] LIKERS = {10001L, 10002L, 10003L, 10004L, 10005L, 10006L, 10007L, 10008L, 10009L, 10010L, 10011L, 10012L, 10013L, 10014L};
    /** 访客虚拟用户 */
    private static final long[] VISITORS = {10001L, 10002L, 10003L, 10004L, 10005L, 10006L, 10007L, 10008L, 10009L, 10010L};

    private final PrivateConversationRepository conversationRepository;
    private final PrivateMessageRepository messageRepository;
    private final LikeRepository likeRepository;
    private final VisitorRepository visitorRepository;
    private final NotificationRepository notificationRepository;
    private final UserFollowRepository followRepository;
    private final ActivityRepository activityRepository;
    private final ActivityEnrollmentRepository enrollmentRepository;

    public GuestDemoDataProvisioner(
            PrivateConversationRepository conversationRepository,
            PrivateMessageRepository messageRepository,
            LikeRepository likeRepository,
            VisitorRepository visitorRepository,
            NotificationRepository notificationRepository,
            UserFollowRepository followRepository,
            ActivityRepository activityRepository,
            ActivityEnrollmentRepository enrollmentRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.likeRepository = likeRepository;
        this.visitorRepository = visitorRepository;
        this.notificationRepository = notificationRepository;
        this.followRepository = followRepository;
        this.activityRepository = activityRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    /**
     * 为体验账号播种流程演示数据（幂等）。
     * 任一分项失败仅记录日志，不影响其余分项与登录主流程。
     *
     * @param guestUserId 刚创建的体验账号 ID
     */
    public void provision(Long guestUserId) {
        if (guestUserId == null) {
            return;
        }
        try {
            String markerUid = conversationUid(guestUserId, PEER_ZHOUYU);
            if (conversationRepository.findByConversationUid(markerUid).isPresent()) {
                log.info("体验账号演示数据已存在（幂等跳过）: userId={}", guestUserId);
                return;
            }
            provisionChats(guestUserId);
            provisionLikes(guestUserId);
            provisionVisitors(guestUserId);
            provisionNotifications(guestUserId);
            provisionRelationshipSignals(guestUserId);
            log.info("体验账号演示数据播种完成: userId={}", guestUserId);
        } catch (RuntimeException ex) {
            log.warn("体验账号演示数据播种失败, userId={}: {}", guestUserId, ex.getMessage());
        }
    }

    // ---- 私信：3 个会话（红点 2 / 红点 0 / 红点 3） ----

    private void provisionChats(Long guestUserId) {
        // 会话 1：与夏言（匹配对象），最后 2 条对方未读（红点 = 2）
        seedConversation(guestUserId, PEER_ZHOUYU, "顺便吃个火锅？",
                List.of(
                        msg(PEER_ZHOUYU, 90, "你好呀，看到你也喜欢建筑", "text", true),
                        msg(guestUserId, 85, "你好！对啊，周末经常去逛展", "text", true),
                        msg(PEER_ZHOUYU, 80, "太巧了，我也喜欢探店", "text", true),
                        msg(guestUserId, 75, "那下次可以一起去看展", "text", true),
                        msg(PEER_ZHOUYU, 70, "好呀，你喜欢什么风格", "text", true),
                        msg(guestUserId, 65, "国贸或者三里屯，都挺近的", "text", true),
                        msg(PEER_ZHOUYU, 60, "你主页的建筑照片拍得真好看", "text", true),
                        msg(guestUserId, 55, "谢谢～", "emoji", true),
                        msg(PEER_ZHOUYU, 30, "周末有空的话一起去看展吧？", "text", false),
                        msg(PEER_ZHOUYU, 15, "顺便吃个火锅？", "text", false)
                ));

        // 会话 2：与阿辰（摄影话题），全部已读（红点 = 0）
        seedConversation(guestUserId, PEER_LINWAN, "嗯嗯",
                List.of(
                        msg(PEER_LINWAN, 150, "嗨，你也喜欢摄影呀", "text", true),
                        msg(guestUserId, 140, "是的！胶片机刚入坑", "text", true),
                        msg(PEER_LINWAN, 130, "胶片质感真的绝了", "text", true),
                        msg(guestUserId, 120, "下次可以交流一下", "text", true),
                        msg(PEER_LINWAN, 110, "好呀，加个好友慢慢聊", "text", true),
                        msg(guestUserId, 100, "嗯嗯", "emoji", true)
                ));

        // 会话 3：与走查号，最后 3 条对方未读（红点 = 3），含语音
        seedConversation(guestUserId, PEER_WALKTHROUGH, "等你回复哦～",
                List.of(
                        msg(PEER_WALKTHROUGH, 600, "早呀，昨晚睡得怎么样", "text", true),
                        msg(guestUserId, 590, "还不错～", "text", true),
                        msg(PEER_WALKTHROUGH, 580, "哈哈那就好", "text", true),
                        msg(guestUserId, 570, "你最近忙吗", "text", true),
                        msg(PEER_WALKTHROUGH, 560, "还行，周末一起吃饭？", "text", true),
                        msg(guestUserId, 550, "可以呀", "emoji", true),
                        msg(PEER_WALKTHROUGH, 40, "/static/audio/voice-demo-1.wav", "voice", false),
                        msg(PEER_WALKTHROUGH, 20, "周六下午见！", "text", false),
                        msg(PEER_WALKTHROUGH, 5, "等你回复哦～", "text", false)
                ));
    }

    private void seedConversation(Long guestUserId, Long peerId, String lastPreview,
                                  List<Object[]> messages) {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        String uid = conversationUid(guestUserId, peerId);
        if (conversationRepository.findByConversationUid(uid).isPresent()) {
            return;
        }
        PrivateConversation conversation = new PrivateConversation();
        conversation.setConversationUid(uid);
        conversation.setUserAId(guestUserId);
        conversation.setUserBId(peerId);
        conversation.setLastMessagePreview(lastPreview);
        conversation.setLastMessageAt(now.minusMinutes(5));
        conversation.setPinned(false);
        conversation.setCreatedAt(now.minusDays(3));
        conversation.setUpdatedAt(now.minusMinutes(5));
        conversation = conversationRepository.saveAndFlush(conversation);

        for (Object[] m : messages) {
            PrivateMessage pm = new PrivateMessage();
            pm.setConversation(conversation);
            pm.setSenderId((Long) m[0]);
            pm.setContent((String) m[1]);
            pm.setMessageKind((String) m[2]);
            pm.setIsRead((Boolean) m[3]);
            pm.setCreatedAt(now.minusMinutes((Integer) m[4]));
            pm.setDeliveryStatus("sent");
            if ("voice".equals(m[2])) {
                pm.setDurationSeconds(6);
            }
            messageRepository.save(pm);
        }
        log.info("体验账号会话播种: guest={}, peer={}, messages={}", guestUserId, peerId, messages.size());
    }

    /** 消息元组：[senderId, content, kind, isRead, minutesAgo] */
    private Object[] msg(Long senderId, int minutesAgo, String content, String kind, boolean isRead) {
        return new Object[]{senderId, content, kind, isRead, minutesAgo};
    }

    private String conversationUid(Long guestUserId, Long peerId) {
        return "guest-demo-" + guestUserId + "-" + peerId;
    }

    // ---- 喜欢：虚拟用户 → 体验账号 + 双向喜欢（匹配演示） ----

    private void provisionLikes(Long guestUserId) {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        for (int i = 0; i < LIKERS.length; i++) {
            saveLike(LIKERS[i], guestUserId, now.minusHours(3 + i));
        }
        // 双向喜欢：体验账号 → 夏言（likes 互指即匹配，支撑「互相喜欢 → 进入聊天」演示）
        saveLike(guestUserId, PEER_ZHOUYU, now.minusHours(20));
    }

    private void saveLike(Long fromUserId, Long toUserId, LocalDateTime at) {
        if (likeRepository.findByUserIdAndTargetUserId(fromUserId, toUserId).isPresent()) {
            return;
        }
        Like like = new Like();
        like.setUserId(fromUserId);
        like.setTargetUserId(toUserId);
        like.setStatus(Like.LikeStatus.active);
        like.setCreatedAt(at);
        like.setUpdatedAt(at);
        likeRepository.save(like);
    }

    // ---- 消息 V3：关系推进信号（互相关注 + 共同活动报名） ----

    private void provisionRelationshipSignals(Long guestUserId) {
        // 互相关注：和夏言互相关注，用于展示「互相关注」关系标签
        saveFollow(guestUserId, PEER_ZHOUYU);
        saveFollow(PEER_ZHOUYU, guestUserId);

        // 共同活动：体验账号和阿辰报名同一活动，用于展示「暧昧中」关系标签
        Long activityId = activityRepository.findAll(PageRequest.of(0, 1))
                .getContent()
                .stream()
                .findFirst()
                .map(Activity::getId)
                .orElse(null);
        if (activityId != null) {
            saveEnrollment(guestUserId, activityId);
            saveEnrollment(PEER_LINWAN, activityId);
        }
    }

    private void saveFollow(Long followerId, Long followingId) {
        if (followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
            return;
        }
        UserFollow follow = new UserFollow(followerId, followingId);
        followRepository.save(follow);
    }

    private void saveEnrollment(Long userId, Long activityId) {
        if (enrollmentRepository.existsByActivityIdAndUserId(activityId, userId)) {
            return;
        }
        ActivityEnrollment enrollment = new ActivityEnrollment();
        enrollment.setActivityId(activityId);
        enrollment.setUserId(userId);
        enrollment.setEnrolledAt(LocalDateTime.now(TimeZones.BUSINESS));
        enrollment.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        enrollmentRepository.save(enrollment);
    }

    // ---- 访客：虚拟用户访问过体验账号主页 ----

    private void provisionVisitors(Long guestUserId) {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        for (int i = 0; i < VISITORS.length; i++) {
            Visitor visitor = new Visitor();
            visitor.setVisitorId(VISITORS[i]);
            visitor.setVisitedUserId(guestUserId);
            visitor.setIsRead(false);
            visitor.setCreatedAt(now.minusHours(1 + i * 3));
            visitorRepository.save(visitor);
        }
    }

    // ---- 通知：驱动消息页「喜欢与访客」入口红点 ----

    private void provisionNotifications(Long guestUserId) {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        // like 通知：10009-10011 喜欢了你
        for (int i = 0; i < 3; i++) {
            saveNotification(guestUserId, Notification.NotificationType.like,
                    LIKERS[i], now.minusHours(3 + i));
        }
        // visitor 通知：10001-10003 查看了你的资料
        for (int i = 0; i < 3; i++) {
            saveNotification(guestUserId, Notification.NotificationType.visitor,
                    VISITORS[i], now.minusHours(1 + i * 3));
        }
        // match 通知：和夏言互相喜欢
        saveNotification(guestUserId, Notification.NotificationType.match,
                PEER_ZHOUYU, now.minusHours(20));
    }

    private void saveNotification(Long toUserId, Notification.NotificationType type,
                                  Long sourceUserId, LocalDateTime at) {
        Notification notification = new Notification();
        notification.setUserId(toUserId);
        notification.setType(type);
        notification.setSourceUserId(sourceUserId);
        notification.setReferenceId(null);
        notification.setReferenceType(Notification.ReferenceType.user);
        notification.setIsRead(false);
        notification.setCreatedAt(at);
        notification.setVersion(0L);
        notificationRepository.save(notification);
    }
}

