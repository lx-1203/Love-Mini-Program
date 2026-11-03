package com.campuslove.api.official;

import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.OfficialAccount;
import com.campuslove.api.entity.OfficialMessage;
import com.campuslove.api.entity.OfficialMessage.AudienceType;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.OfficialAccountRepository;
import com.campuslove.api.repository.OfficialMessageRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实官方号服务实现。
 * 在 real profile 下激活，使用 Repository 查询数据库。
 */
@Profile("real")
@Service
public class RealOfficialAccountService implements OfficialAccountService {

    private final OfficialAccountRepository accountRepository;
    private final OfficialMessageRepository messageRepository;
    private final ActivityRepository activityRepository;
    /**
     * P1-2（2026-11-03）受众过滤数据源：读用户校区（user_campus_profile.campus_name）
     * 与圈层归属（users.circle_path）。两个口径与后台数据隔离轴逐字同源
     * （AdminPostController 校区轴 / AdminScopeService 圈层轴），不另造第三套归属语义。
     */
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserRepository userRepository;

    public RealOfficialAccountService(
            OfficialAccountRepository accountRepository,
            OfficialMessageRepository messageRepository,
            ActivityRepository activityRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.messageRepository = messageRepository;
        this.activityRepository = activityRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfficialAccountView> getAccounts() {
        return accountRepository.findByEnabledTrueOrderBySortOrderAsc().stream()
                .map(this::toView)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfficialMessageView> getMessages(String code) {
        OfficialAccount account = accountRepository.findByCode(code).orElse(null);
        if (account == null || !account.isEnabled()) {
            return List.of();
        }
        return messageRepository.findByAccountIdOrderByPublishedAtAsc(account.getId()).stream()
                .map(this::toView)
                .toList();
    }

    /**
     * P1-2（2026-11-03）：按当前用户归属过滤受众消息流。
     *
     * <p>实现取舍：单账号广播消息量级小（运营手工发布），先全量拉取再内存过滤，
     * 不为每个用户拼一条带归属上下文的 SQL——同一份消息行可被所有用户复用，
     * 受众判定集中在一个可单测的纯函数 {@link #visibleTo}。</p>
     *
     * <p>过滤语义（fail-closed）：</p>
     * <ul>
     *   <li>ALL → 全可见（存量行为不变）</li>
     *   <li>CAMPUS → 用户校区 === audienceValue 才可见；未认证/未填校区不可见</li>
     *   <li>CIRCLE → 用户圈层路径等于受众节点或位于其子树（按路径段：
     *       userPath == value 或 userPath.startsWith(value + "/")，
     *       与 AdminScopeService 圈层轴同口径，禁裸前缀）才可见</li>
     *   <li>audienceValue 缺失/空 → 一律不可见（脏数据按最严口径处理）</li>
     * </ul>
     */
    @Override
    @Transactional(readOnly = true)
    public List<OfficialMessageView> getMessages(String code, Long userId) {
        OfficialAccount account = accountRepository.findByCode(code).orElse(null);
        if (account == null || !account.isEnabled()) {
            return List.of();
        }
        String userCampus = userId == null ? null : userCampusProfileRepository
                .findById(userId)
                .map(p -> p.getCampusName())
                .filter(c -> c != null && !c.isBlank())
                .orElse(null);
        String userCirclePath = userId == null ? null : userRepository
                .findById(userId)
                .map(u -> u.getCirclePath())
                .filter(p -> p != null && !p.isBlank())
                .map(String::trim)
                .orElse(null);
        return messageRepository.findByAccountIdOrderByPublishedAtAsc(account.getId()).stream()
                .filter(m -> visibleTo(m, userCampus, userCirclePath))
                .map(this::toView)
                .toList();
    }

    /** 受众可见性判定（纯函数，集中单测；口径见 getMessages(String, Long) 注释）。 */
    static boolean visibleTo(OfficialMessage message, String userCampus, String userCirclePath) {
        AudienceType type = message.getAudienceType() == null ? AudienceType.ALL : message.getAudienceType();
        String value = message.getAudienceValue();
        return switch (type) {
            case ALL -> true;
            case CAMPUS -> value != null && !value.isBlank() && value.equals(userCampus);
            case CIRCLE -> value != null && !value.isBlank()
                    && userCirclePath != null
                    && (userCirclePath.equals(value) || userCirclePath.startsWith(value + "/"));
        };
    }

    private OfficialAccountView toView(OfficialAccount account) {
        return new OfficialAccountView(
                account.getId(),
                account.getCode(),
                account.getName(),
                account.getDescription(),
                account.getIconUrl());
    }

    private OfficialMessageView toView(OfficialMessage message) {
        return new OfficialMessageView(
                message.getId(),
                message.getMessageType(),
                message.getContent(),
                message.getCardTitle(),
                message.getCardDesc(),
                message.getCardTag(),
                message.getCardTargetUrl(),
                message.getPublishedAt(),
                buildCardActivity(message),
                null,
                // P1-2 受众字段（管理端展示用；用户端流已按受众过滤）
                message.getAudienceType() == null ? AudienceType.ALL.name() : message.getAudienceType().name(),
                message.getAudienceValue());
    }

    private OfficialActivityCardView buildCardActivity(OfficialMessage message) {
        Long activityId = message.getCardActivityId();
        if (activityId == null || !"card".equals(message.getMessageType())) {
            return null;
        }
        return activityRepository.findById(activityId)
                .map(this::toActivityCard)
                .orElse(null);
    }

    private OfficialActivityCardView toActivityCard(Activity activity) {
        return new OfficialActivityCardView(
                activity.getId(),
                activity.getTitle(),
                activity.getCoverImage(),
                activity.getScheduleText(),
                activity.getLocation(),
                activity.getEnrollmentCount() == null ? 0 : activity.getEnrollmentCount(),
                null);
    }
}
