package com.campuslove.api.profile;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.TaskClaim;
import com.campuslove.api.entity.TempChatMessage;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.UserAgreementConsent;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.entity.UserInterestTag;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.entity.VipBillingLog;
import com.campuslove.api.repository.AuditLogRepository;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.TaskClaimRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import com.campuslove.api.repository.UserAgreementConsentRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserInterestTagRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.utils.SensitiveDataMasker;
import com.campuslove.api.verification.RealNameCertificationService;
import com.campuslove.api.verification.RealNameCertificationView;
import com.campuslove.api.wallet.UserWalletRepository;
import com.campuslove.api.wallet.WalletTransactionLogRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 用户自助个人信息导出服务（S2-5，2026-10-30）。
 *
 * <p>合规依据：《个人信息保护法》第 45 条——个人有权向个人信息处理者查阅、复制其个人信息。
 * 本仓库此前只有管理端按用户导出（{@code AdminActivityController} 的报名 CSV）能力，
 * 用户侧没有可读、可复制自己全部个人信息的出口，是真实的合规缺口。</p>
 *
 * <p>三条硬性规则（由 {@code PersonalDataServiceTest} 逐条锁定）：</p>
 * <ol>
 *   <li><b>主体只来自认证上下文</b>：{@link SecurityUtils#getCurrentUserId()} 决定导出谁的 data，
 *       方法签名不接受 userId 参数（避免 IDOR——一旦接受请求参数，改一个数字就能拖库）；
 *       未登录时由其自身抛 401，本服务不做 null 兜底。</li>
 *   <li><b>每个类别都按主体 ID 过滤</b>：仓储查询一律带 {@code userId}；对「一条查询返回一整段
 *       会话」的消息类数据，额外做内存过滤，只保留本人发出的行
 *       （私信按 {@code senderId == userId}；临时聊天按 {@code sender} 判定，
 *       见 {@link #ownTempChatSenderValue}——{@code self/peer} 是相对 userA 的方位，
 *       导出人若是 userB 时"本人消息"是 {@code peer}）。</li>
 *   <li><b>不落敏感值</b>：密码散列、会话令牌一律不取；手机号 / openid / 真实姓名 /
 *       学信码等标识类字段经 {@link SensitiveDataMasker} 掩码后才进入导出；
 *       会话的 {@code last_message_preview}、私信的 {@code quote_context}、
 *       审计日志的 {@code request_body} 承载的是<b>他人</b>内容或第三方载荷，一律排除。</li>
 * </ol>
 *
 * <p>性能：导出是全表扫描式的重查询路径，公共方法标 {@code @Transactional(readOnly = true)}，
 * 控制器侧再叠 {@code @RateLimit} 按用户限流。每个类别最多
 * {@value #MAX_ROWS_PER_CATEGORY} 行、最多遍历 {@value #MAX_CHAT_THREADS} 个会话，
 * 超限置 {@code truncated=true} 让调用方看见"不完整"，而不是静默丢数据。</p>
 */
@Profile("real")
@Service
public class PersonalDataService {

    private static final Logger log = LoggerFactory.getLogger(PersonalDataService.class);

    /** 单类别最大导出行数（超出即截断并在类别上打 truncated 标记） */
    public static final int MAX_ROWS_PER_CATEGORY = 2000;

    /** 最多遍历的会话数（临时聊天 / 私信各算一个会话，防止会话数巨大时查询爆炸） */
    public static final int MAX_CHAT_THREADS = 200;

    /** 固定分页窗口：一次取满上限条数（打满即视为可能还有更多，标 truncated） */
    private static final Pageable PAGE = PageRequest.of(0, MAX_ROWS_PER_CATEGORY);

    private final UserRepository userRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final UserInterestTagRepository userInterestTagRepository;
    private final CampusCertificationRepository campusCertificationRepository;
    private final RealNameCertificationService realNameCertificationService;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final HeartSignalRepository heartSignalRepository;
    private final UserFollowRepository userFollowRepository;
    private final TempChatSessionRepository tempChatSessionRepository;
    private final TempChatMessageRepository tempChatMessageRepository;
    private final PrivateConversationRepository privateConversationRepository;
    private final PrivateMessageRepository privateMessageRepository;
    private final UserWalletRepository userWalletRepository;
    private final WalletTransactionLogRepository walletTransactionLogRepository;
    private final VipBillRepository vipBillRepository;
    private final VipBillingLogRepository vipBillingLogRepository;
    private final NotificationRepository notificationRepository;
    private final CheckInRepository checkInRepository;
    private final TaskClaimRepository taskClaimRepository;
    private final UserAgreementConsentRepository userAgreementConsentRepository;
    private final AuditLogRepository auditLogRepository;

    public PersonalDataService(
            UserRepository userRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            UserInterestTagRepository userInterestTagRepository,
            CampusCertificationRepository campusCertificationRepository,
            RealNameCertificationService realNameCertificationService,
            PostRepository postRepository,
            CommentRepository commentRepository,
            LikeRepository likeRepository,
            HeartSignalRepository heartSignalRepository,
            UserFollowRepository userFollowRepository,
            TempChatSessionRepository tempChatSessionRepository,
            TempChatMessageRepository tempChatMessageRepository,
            PrivateConversationRepository privateConversationRepository,
            PrivateMessageRepository privateMessageRepository,
            UserWalletRepository userWalletRepository,
            WalletTransactionLogRepository walletTransactionLogRepository,
            VipBillRepository vipBillRepository,
            VipBillingLogRepository vipBillingLogRepository,
            NotificationRepository notificationRepository,
            CheckInRepository checkInRepository,
            TaskClaimRepository taskClaimRepository,
            UserAgreementConsentRepository userAgreementConsentRepository,
            AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.userInterestTagRepository = userInterestTagRepository;
        this.campusCertificationRepository = campusCertificationRepository;
        this.realNameCertificationService = realNameCertificationService;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.likeRepository = likeRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.userFollowRepository = userFollowRepository;
        this.tempChatSessionRepository = tempChatSessionRepository;
        this.tempChatMessageRepository = tempChatMessageRepository;
        this.privateConversationRepository = privateConversationRepository;
        this.privateMessageRepository = privateMessageRepository;
        this.userWalletRepository = userWalletRepository;
        this.walletTransactionLogRepository = walletTransactionLogRepository;
        this.vipBillRepository = vipBillRepository;
        this.vipBillingLogRepository = vipBillingLogRepository;
        this.notificationRepository = notificationRepository;
        this.checkInRepository = checkInRepository;
        this.taskClaimRepository = taskClaimRepository;
        this.userAgreementConsentRepository = userAgreementConsentRepository;
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * 导出「当前登录用户」的全部个人信息。
     *
     * <p>主体解析自 SecurityContext，<b>不接收任何外部传入的 userId</b>：这是本端点唯一的
     * 越权防线（IDOR）。未认证时 {@link SecurityUtils#getCurrentUserId()} 抛 401。</p>
     *
     * @return 导出载荷（类别齐全，空类别仍以空行集出现）
     */
    @Transactional(readOnly = true)
    public PersonalDataExport exportForCurrentUser() {
        Long userId = SecurityUtils.getCurrentUserId();
        // searchForAdmin 类查询在 operatorId/userId 为 null 时不过滤（管理端语义），
        // 这里显式挡住，避免未来改动把「导出自己」变成「导出所有人」。
        Objects.requireNonNull(userId, "导出主体 ID 不可为空");
        PersonalDataExport export = build(userId);
        log.info("个人信息导出完成: userId={}, 类别数={}, 总行数={}, 是否有截断={}",
                userId, export.categories().size(), export.totalRowCount(), export.hasTruncatedCategory());
        return export;
    }

    /**
     * 组装全部类别。<b>包级私有</b>：唯一的公开入口是
     * {@link #exportForCurrentUser()}——把带 userId 的形态暴露成 public，等于给别的
     * 代码留了一个「导出他人档案」的后门（IDOR）。
     * 同包单测可直接以指定 ID 驱动本方法，验证每个仓储都按该 ID 查询。
     *
     * @param userId 主体用户 ID（非空）
     * @return 导出载荷
     */
    PersonalDataExport build(Long userId) {
        Objects.requireNonNull(userId, "导出主体 ID 不可为空");
        // 会话清单一次取回、会话与消息两个类别共用（各自再取一遍就是双倍重查询）
        List<TempChatSession> tempChatSessions = threadLimited(
                tempChatSessionRepository.findByUserIdOrderByPinnedAndLastMessage(userId));
        List<PrivateConversation> privateConversations = threadLimited(
                privateConversationRepository.findByUserAIdOrUserBIdOrderByLastMessageAtDesc(
                        userId, userId));
        List<PersonalDataCategory> categories = new ArrayList<>(28);
        categories.add(accountCategory(userId));
        categories.add(basicProfileCategory(userId));
        categories.add(campusProfileCategory(userId));
        categories.add(scheduleProfileCategory(userId));
        categories.add(interestTagCategory(userId));
        categories.add(campusCertificationCategory(userId));
        categories.add(realNameCertificationCategory(userId));
        categories.add(postCategory(userId));
        categories.add(commentCategory(userId));
        categories.add(likesGivenCategory(userId));
        categories.add(likesReceivedCategory(userId));
        categories.add(heartSignalCategory(userId));
        categories.add(followCategory(userId, true));
        categories.add(followCategory(userId, false));
        categories.add(tempChatSessionCategory(userId, tempChatSessions));
        categories.add(tempChatMessageCategory(userId, tempChatSessions));
        categories.add(privateConversationCategory(userId, privateConversations));
        categories.add(privateMessageCategory(userId, privateConversations));
        categories.add(walletCategory(userId));
        categories.add(walletTransactionCategory(userId));
        categories.add(vipBillCategory(userId));
        categories.add(vipBillingLogCategory(userId));
        categories.add(notificationCategory(userId));
        categories.add(checkInCategory(userId));
        categories.add(taskClaimCategory(userId));
        categories.add(consentCategory(userId));
        categories.add(auditLogCategory(userId));
        validateColumnWidths(categories);
        return new PersonalDataExport(userId, LocalDateTime.now(TimeZones.BUSINESS).toString(),
                List.copyOf(categories));
    }

    // ---- 各类别组装 ----

    /**
     * 账号主记录（users 表）。
     *
     * <p>脱敏：{@code phone} 走 {@link SensitiveDataMasker#maskPhone(String)}、
     * {@code openid} 走 {@link SensitiveDataMasker#mask(String)}；
     * {@code password}（BCrypt 散列）不在列——导出接口不是凭据备份接口，
     * 散列外流即可离线爆破。</p>
     */
    private PersonalDataCategory accountCategory(Long userId) {
        List<String> columns = List.of("id", "nickname", "phone", "openid", "role", "status",
                "campus_name", "bio", "grade_label", "pronouns", "avatar_url", "birth_date",
                "profile_completion", "following_count", "followers_count", "auto_renew_enabled",
                "latitude", "longitude", "geo_updated_at", "created_at", "updated_at");
        List<List<String>> rows = userRepository.findById(userId)
                .map(user -> List.of(row(user.getId(), user.getNickname(),
                        SensitiveDataMasker.maskPhone(user.getPhone()),
                        SensitiveDataMasker.mask(user.getOpenid()),
                        user.getRole(), user.getStatus(), user.getCampusName(), user.getBio(),
                        user.getGradeLabel(), user.getPronouns(), user.getAvatarUrl(),
                        user.getBirthDate(), user.getProfileCompletion(), user.getFollowingCount(),
                        user.getFollowersCount(), user.getAutoRenewEnabled(), user.getLatitude(),
                        user.getLongitude(), user.getGeoUpdatedAt(), user.getCreatedAt(),
                        user.getUpdatedAt())))
                .orElse(List.of());
        return PersonalDataCategory.of("account", "账号主记录", columns, rows);
    }

    /** 基本资料（user_basic_profile 表） */
    private PersonalDataCategory basicProfileCategory(Long userId) {
        List<String> columns = List.of("user_id", "nickname", "bio", "grade_label", "pronouns",
                "gender", "interest_tags", "height", "education_level", "relationship_status",
                "hometown_province", "hometown_city", "future_city", "future_plan_tags",
                "occupation", "income_range", "personality_tags", "mbti", "expected_partner",
                "birth_year", "email_verified", "id_card_verified", "photo_gallery",
                "half_body_photo_url", "personal_video_url", "profile_background_url",
                "created_at", "updated_at");
        List<List<String>> rows = userBasicProfileRepository.findByUserId(userId)
                .map(p -> List.of(row(p.getUserId(), p.getNickname(), p.getBio(), p.getGradeLabel(),
                        p.getPronouns(), p.getGender(), p.getInterestTags(), p.getHeight(),
                        p.getEducationLevel(), p.getRelationshipStatus(), p.getHometownProvince(),
                        p.getHometownCity(), p.getFutureCity(), p.getFuturePlanTags(),
                        p.getOccupation(), p.getIncomeRange(), p.getPersonalityTags(), p.getMbti(),
                        p.getExpectedPartner(), p.getBirthYear(), p.getEmailVerified(),
                        p.getIdCardVerified(), p.getPhotoGallery(), p.getHalfBodyPhotoUrl(),
                        p.getPersonalVideoUrl(), p.getProfileBackgroundUrl(), p.getCreatedAt(),
                        p.getUpdatedAt())))
                .orElse(List.of());
        return PersonalDataCategory.of("profile_basic", "基本资料", columns, rows);
    }

    /** 校园资料（user_campus_profile 表） */
    private PersonalDataCategory campusProfileCategory(Long userId) {
        List<String> columns = List.of("user_id", "city_name", "campus_name", "campus_branch",
                "department_name", "verification_status", "created_at", "updated_at");
        List<List<String>> rows = userCampusProfileRepository.findByUserId(userId)
                .map(p -> List.of(row(p.getUserId(), p.getCityName(), p.getCampusName(),
                        p.getCampusBranch(), p.getDepartmentName(), p.getVerificationStatus(),
                        p.getCreatedAt(), p.getUpdatedAt())))
                .orElse(List.of());
        return PersonalDataCategory.of("profile_campus", "校园资料", columns, rows);
    }

    /** 课表/时段资料（user_schedule_profile 表） */
    private PersonalDataCategory scheduleProfileCategory(Long userId) {
        List<String> columns = List.of("user_id", "preferred_campus_area",
                "preferred_time_window_json", "course_block_json", "created_at", "updated_at");
        List<List<String>> rows = userScheduleProfileRepository.findByUserId(userId)
                .map(p -> List.of(row(p.getUserId(), p.getPreferredCampusArea(),
                        p.getPreferredTimeWindowJson(), p.getCourseBlockJson(), p.getCreatedAt(),
                        p.getUpdatedAt())))
                .orElse(List.of());
        return PersonalDataCategory.of("profile_schedule", "课表与活跃时段", columns, rows);
    }

    /** 兴趣标签关联（user_interest_tag 表） */
    private PersonalDataCategory interestTagCategory(Long userId) {
        List<String> columns = List.of("id", "tag_id");
        List<UserInterestTag> items = userInterestTagRepository.findByUserId(userId);
        return capped("interest_tags", "兴趣标签", columns, items,
                t -> row(t.getId(), t.getTagId()));
    }

    /**
     * 校园认证材料（campus_certification 表）。
     *
     * <p>脱敏：{@code chsi_code}（学信网验证码）属标识类字段，按 openid 同规则掩码；
     * 证件照片 URL 是本人上传物，原样导出。</p>
     */
    private PersonalDataCategory campusCertificationCategory(Long userId) {
        List<String> columns = List.of("id", "school_name", "major", "status",
                "student_id_card_url", "chsi_code", "chsi_screenshot_url", "review_comment",
                "submitted_at", "reviewed_at");
        List<List<String>> rows = campusCertificationRepository.findByUserId(userId)
                .map(c -> List.of(row(c.getId(), c.getSchoolName(), c.getMajor(), c.getStatus(),
                        c.getStudentIdCardUrl(),
                        SensitiveDataMasker.mask(c.getChsiCode()),
                        c.getChsiScreenshotUrl(), c.getReviewComment(), c.getSubmittedAt(),
                        c.getReviewedAt())))
                .orElse(List.of());
        return PersonalDataCategory.of("campus_certification", "校园认证材料", columns, rows);
    }

    /**
     * 实名认证记录（复用 {@code RealNameCertificationService.getStatus}，不重复实现读取）。
     *
     * <p>{@code idCardNo} 由既有服务解密后掩码返回（前 6 后 4），本服务不再二次掩码；
     * 真实姓名额外经 {@link SensitiveDataMasker#maskRealName(String)}——导出物是可下载的
     * 附件文件，落盘面比 App 内展示更宽，取更严的口径。</p>
     */
    private PersonalDataCategory realNameCertificationCategory(Long userId) {
        List<String> columns = List.of("id", "status", "user_name", "id_card_no",
                "id_card_front_url", "id_card_back_url", "review_comment", "submitted_at",
                "reviewed_at");
        RealNameCertificationView view = realNameCertificationService.getStatus(userId);
        List<List<String>> rows = (view == null || view.id() == null)
                ? List.of()
                : List.of(row(view.id(), view.status(),
                        SensitiveDataMasker.maskRealName(view.userName()), view.idCardNo(),
                        view.idCardFrontUrl(), view.idCardBackUrl(), view.reviewComment(),
                        view.submittedAt(), view.reviewedAt()));
        return PersonalDataCategory.of("real_name_certification", "实名认证记录", columns, rows);
    }

    /** 本人发布的动态（posts 表；含已删除/隐藏状态，查阅权覆盖自己的全部记录） */
    private PersonalDataCategory postCategory(Long userId) {
        List<String> columns = List.of("id", "title", "content", "category", "status",
                "audit_status", "audit_remark", "visibility", "images", "tags", "likes_count",
                "comments_count", "share_count", "view_count", "is_pinned", "activity_id",
                "circle_id", "created_at", "updated_at");
        List<Post> items = postRepository.findByAuthorId(userId);
        return capped("posts", "我发布的动态", columns, items,
                p -> row(p.getId(), p.getTitle(), p.getContent(), p.getCategory(), p.getStatus(),
                        p.getAuditStatus(), p.getAuditRemark(), p.getVisibility(), p.getImages(),
                        p.getTags(), p.getLikesCount(), p.getCommentsCount(), p.getShareCount(),
                        p.getViewCount(), p.getIsPinned(), p.getActivityId(), p.getCircleId(),
                        p.getCreatedAt(), p.getUpdatedAt()));
    }

    /** 本人发表的评论（评论 ID 归属本人，postId 仅作定位用） */
    private PersonalDataCategory commentCategory(Long userId) {
        List<String> columns = List.of("id", "post_id", "parent_id", "content", "images",
                "created_at");
        return paged("comments", "我的评论", columns,
                commentRepository.findByAuthorIdOrderByCreatedAtDesc(userId, PAGE),
                c -> row(c.getId(), postId(c), c.getParentId(), c.getContent(), c.getImages(),
                        c.getCreatedAt()));
    }

    /** 我发出的喜欢 */
    private PersonalDataCategory likesGivenCategory(Long userId) {
        List<String> columns = List.of("id", "target_user_id", "status", "created_at",
                "updated_at");
        List<Like> items = new ArrayList<>();
        for (Like.LikeStatus status : Like.LikeStatus.values()) {
            items.addAll(likeRepository.findByUserIdAndStatus(userId, status));
        }
        return capped("likes_given", "我发出的喜欢", columns, items,
                l -> row(l.getId(), l.getTargetUserId(), l.getStatus(), l.getCreatedAt(),
                        l.getUpdatedAt()));
    }

    /**
     * 我收到的喜欢。
     *
     * <p>行的主体是「被喜欢」这一事实，归属本人；其中 {@code from_user_id} 与 App 内
     * 通知列表已展示的 {@code Notification.sourceUserId} 同口径，不引入新的他人信息暴露面。</p>
     */
    private PersonalDataCategory likesReceivedCategory(Long userId) {
        List<String> columns = List.of("id", "from_user_id", "status", "created_at", "updated_at");
        List<Like> items = new ArrayList<>();
        for (Like.LikeStatus status : Like.LikeStatus.values()) {
            items.addAll(likeRepository.findByTargetUserIdAndStatus(userId, status));
        }
        return capped("likes_received", "我收到的喜欢", columns, items,
                l -> row(l.getId(), l.getUserId(), l.getStatus(), l.getCreatedAt(),
                        l.getUpdatedAt()));
    }

    /** 心动信号（含双方视角，仅导出信号本身的字段 + 对方 ID） */
    private PersonalDataCategory heartSignalCategory(Long userId) {
        List<String> columns = List.of("id", "counterpart_user_id", "status", "match_type",
                "expires_at", "created_at", "updated_at");
        List<HeartSignal> items = new ArrayList<>();
        for (HeartSignal.SignalStatus status : HeartSignal.SignalStatus.values()) {
            items.addAll(heartSignalRepository.findByUserAIdOrUserBIdAndStatus(userId, userId,
                    status));
        }
        return capped("heart_signals", "心动信号与匹配", columns, items,
                s -> row(s.getId(), counterpart(userId, s.getUserAId(), s.getUserBId()),
                        s.getStatus(), s.getMatchType(), s.getExpiresAt(), s.getCreatedAt(),
                        s.getUpdatedAt()));
    }

    /** 关注关系：given=我关注的人，received=关注我的账号 */
    private PersonalDataCategory followCategory(Long userId, boolean given) {
        List<UserFollow> items = given
                ? userFollowRepository.findByFollowerId(userId)
                : userFollowRepository.findByFollowingId(userId);
        List<String> columns = List.of("id", given ? "following_user_id" : "follower_user_id",
                "created_at");
        return capped(given ? "follows_given" : "follows_received",
                given ? "我的关注" : "我的粉丝", columns, items,
                f -> row(f.getId(), given ? f.getFollowingId() : f.getFollowerId(),
                        f.getCreatedAt()));
    }

    /**
     * 临时聊天会话元数据。
     *
     * <p>刻意排除 {@code last_message_preview}：预览文本可能是<b>对方</b>发出的消息内容，
     * 不属于导出主体。</p>
     */
    private PersonalDataCategory tempChatSessionCategory(
            Long userId, List<TempChatSession> sessions) {
        List<String> columns = List.of("id", "session_uid", "counterpart_user_id", "phase",
                "match_id", "recommended_person_id", "own_unread_count", "is_pinned",
                "closes_at", "closed_reason", "last_message_at", "created_at");
        List<List<String>> rows = new ArrayList<>(sessions.size());
        for (TempChatSession s : sessions) {
            boolean isA = userId.equals(s.getUserAId());
            rows.add(row(s.getId(), s.getSessionUid(), counterpart(userId, s.getUserAId(),
                            s.getUserBId()), s.getPhase(), s.getMatchId(),
                    s.getRecommendedPersonId(),
                    isA ? s.getUserAUnreadCount() : s.getUserBUnreadCount(),
                    s.getIsPinned(), s.getClosesAt(), s.getClosedReason(), s.getLastMessageAt(),
                    s.getCreatedAt()));
        }
        return PersonalDataCategory.of("temp_chat_sessions", "临时聊天会话", columns, rows);
    }

    /**
     * 临时聊天消息——只导出「本人发出」的行。
     *
     * <p>{@code sender} 存的是相对方位（{@code self}=userA、{@code peer}=userB，见
     * {@code TempChatMessageService} 的服务端判定），因此本人消息对应的取值取决于
     * 导出人是 userA 还是 userB，不能固定按 {@code "self"} 过滤。</p>
     */
    private PersonalDataCategory tempChatMessageCategory(
            Long userId, List<TempChatSession> sessions) {
        List<String> columns = List.of("id", "session_id", "kind", "body", "duration_seconds",
                "delivery_status", "recalled", "quote_snapshot", "created_at");
        List<List<String>> rows = new ArrayList<>();
        boolean truncated = false;
        for (TempChatSession session : sessions) {
            String ownSender = ownTempChatSenderValue(userId, session);
            List<TempChatMessage> messages =
                    tempChatMessageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
            for (TempChatMessage m : messages) {
                if (!ownSender.equals(m.getSender())) {
                    continue;
                }
                if (rows.size() >= MAX_ROWS_PER_CATEGORY) {
                    truncated = true;
                    break;
                }
                rows.add(row(m.getId(), session.getId(), m.getKind(), m.getBody(),
                        m.getDurationSeconds(), m.getDeliveryStatus(), m.getRecalled(),
                        m.getQuoteSnapshot(), m.getCreatedAt()));
            }
            if (truncated) {
                break;
            }
        }
        return truncated
                ? PersonalDataCategory.truncated("temp_chat_messages", "我的临时聊天消息",
                        columns, rows)
                : PersonalDataCategory.of("temp_chat_messages", "我的临时聊天消息", columns, rows);
    }

    /**
     * 私信会话元数据（同样排除 {@code last_message_preview}）。
     *
     * <p>只输出 {@code userAId/userBId} 命中本人的会话——仓储查询本身已按此过滤，
     * 这里再断言一次，防止将来有人把查询改成 {@code findAll()}。</p>
     */
    private PersonalDataCategory privateConversationCategory(
            Long userId, List<PrivateConversation> conversations) {
        List<String> columns = List.of("id", "conversation_uid", "counterpart_user_id",
                "pinned", "own_muted", "own_marked_unread", "last_message_at", "created_at");
        List<List<String>> rows = new ArrayList<>(conversations.size());
        for (PrivateConversation c : conversations) {
            if (!isParticipant(userId, c.getUserAId(), c.getUserBId())) {
                continue;
            }
            boolean isA = userId.equals(c.getUserAId());
            rows.add(row(c.getId(), c.getConversationUid(),
                    counterpart(userId, c.getUserAId(), c.getUserBId()), c.getPinned(),
                    isA ? c.getUserAMuted() : c.getUserBMuted(),
                    isA ? c.getUserAMarkedUnread() : c.getUserBMarkedUnread(),
                    c.getLastMessageAt(), c.getCreatedAt()));
        }
        return PersonalDataCategory.of("private_conversations", "私信会话", columns, rows);
    }

    /**
     * 私信消息——只导出 {@code senderId == 本人} 的行。
     *
     * <p>会话另一方的消息文本属于对方，不在本人的查阅权范围内，故整段会话不做全量导出。</p>
     */
    private PersonalDataCategory privateMessageCategory(
            Long userId, List<PrivateConversation> conversations) {
        List<String> columns = List.of("id", "conversation_id", "message_kind", "content",
                "duration_seconds", "delivery_status", "is_read", "recalled",
                "deleted_for_sender", "created_at");
        List<List<String>> rows = new ArrayList<>();
        boolean truncated = false;
        for (PrivateConversation conversation : conversations) {
            if (!isParticipant(userId, conversation.getUserAId(), conversation.getUserBId())) {
                continue;
            }
            List<PrivateMessage> messages = privateMessageRepository
                    .findByConversationIdOrderByCreatedAtDesc(conversation.getId(), userId, PAGE)
                    .getContent();
            for (PrivateMessage m : messages) {
                if (!userId.equals(m.getSenderId())) {
                    continue;
                }
                if (rows.size() >= MAX_ROWS_PER_CATEGORY) {
                    truncated = true;
                    break;
                }
                rows.add(row(m.getId(), conversation.getId(), m.getMessageKind(), m.getContent(),
                        m.getDurationSeconds(), m.getDeliveryStatus(), m.getIsRead(),
                        m.getRecalled(), m.getDeletedForSender(), m.getCreatedAt()));
            }
            if (truncated) {
                break;
            }
        }
        return truncated
                ? PersonalDataCategory.truncated("private_messages", "我的私信消息", columns, rows)
                : PersonalDataCategory.of("private_messages", "我的私信消息", columns, rows);
    }

    /** 钱包余额（user_wallet 表） */
    private PersonalDataCategory walletCategory(Long userId) {
        List<String> columns = List.of("id", "balance_cents", "frozen_cents", "created_at",
                "updated_at");
        List<List<String>> rows = userWalletRepository.findByUserId(userId)
                .map(w -> List.of(row(w.getId(), w.getBalanceCents(), w.getFrozenCents(),
                        w.getCreatedAt(), w.getUpdatedAt())))
                .orElse(List.of());
        return PersonalDataCategory.of("wallet", "钱包余额", columns, rows);
    }

    /** 钱包流水（wallet_transaction_log 表） */
    private PersonalDataCategory walletTransactionCategory(Long userId) {
        List<String> columns = List.of("id", "type", "amount", "balance_after", "related_type",
                "related_id", "order_id", "remark", "created_at");
        return paged("wallet_transactions", "钱包流水", columns,
                walletTransactionLogRepository.findByUserIdOrderByCreatedAtDesc(userId, PAGE),
                t -> row(t.getId(), t.getType(), t.getAmount(), t.getBalanceAfter(),
                        t.getRelatedType(), t.getRelatedId(), t.getOrderId(), t.getRemark(),
                        t.getCreatedAt()));
    }

    /** VIP 账单（vip_bill 表；{@code transaction_id} 是本人的支付流水号，可导出） */
    private PersonalDataCategory vipBillCategory(Long userId) {
        List<String> columns = List.of("id", "plan_id", "plan_name", "amount",
                "original_amount", "type", "status", "payment_method", "transaction_id",
                "period_start", "period_end", "remark", "created_at");
        List<VipBill> items = vipBillRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return capped("vip_bills", "VIP 账单", columns, items,
                b -> row(b.getId(), b.getPlanId(), b.getPlanName(), b.getAmount(),
                        b.getOriginalAmount(), b.getType(), b.getStatus(), b.getPaymentMethod(),
                        b.getTransactionId(), b.getPeriodStart(), b.getPeriodEnd(), b.getRemark(),
                        b.getCreatedAt()));
    }

    /** VIP 计费留痕（vip_billing_log 表） */
    private PersonalDataCategory vipBillingLogCategory(Long userId) {
        List<String> columns = List.of("id", "order_no", "amount", "status", "created_at");
        List<VipBillingLog> items = vipBillingLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return capped("vip_billing_logs", "VIP 计费留痕", columns, items,
                l -> row(l.getId(), l.getOrderNo(), l.getAmount(), l.getStatus(),
                        l.getCreatedAt()));
    }

    /** 站内通知 */
    private PersonalDataCategory notificationCategory(Long userId) {
        List<String> columns = List.of("id", "type", "source_user_id", "reference_id",
                "reference_type", "is_read", "created_at");
        return paged("notifications", "站内通知", columns,
                notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PAGE),
                n -> row(n.getId(), n.getType(), n.getSourceUserId(), n.getReferenceId(),
                        n.getReferenceType(), n.getIsRead(), n.getCreatedAt()));
    }

    /** 签到记录（复用 {@code CheckInRepository.searchForAdmin}，userId 恒定非空以关掉「全部用户」分支） */
    private PersonalDataCategory checkInCategory(Long userId) {
        List<String> columns = List.of("id", "check_in_date", "consecutive_days", "source",
                "created_at");
        // userId 恒为非空（见 exportForCurrentUser 的 requireNonNull），
        // searchForAdmin 的「userId 为空则不过滤」管理端语义在此不可达
        return paged("check_ins", "签到记录", columns,
                checkInRepository.searchForAdmin(userId, null, null, null, null, PAGE),
                c -> row(c.getId(), c.getCheckInDate(), c.getConsecutiveDays(), c.getSource(),
                        c.getCreatedAt()));
    }

    /** 任务领取记录 */
    private PersonalDataCategory taskClaimCategory(Long userId) {
        List<String> columns = List.of("id", "task_code", "claim_date", "created_at");
        List<TaskClaim> items = taskClaimRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return capped("task_claims", "任务领取记录", columns, items,
                t -> row(t.getId(), t.getTaskCode(), t.getClaimDate(), t.getCreatedAt()));
    }

    /** 协议同意留痕（user_agreement_consent 表） */
    private PersonalDataCategory consentCategory(Long userId) {
        List<String> columns = List.of("id", "legal_version", "source", "agreed_at", "ip");
        List<UserAgreementConsent> items =
                userAgreementConsentRepository.findByUserIdOrderByAgreedAtAsc(userId);
        return capped("agreement_consents", "协议同意留痕", columns, items,
                c -> row(c.getId(), c.getLegalVersion(), c.getSource(), c.getAgreedAt(),
                        c.getIp()));
    }

    /**
     * 操作审计日志（仅 {@code operator_id == 本人} 的行）。
     *
     * <p>排除 {@code request_body} 与 {@code error_message}：二者可能夹带被操作对象的
     * 载荷或内部堆栈，属于第三方/平台数据，不在本人的查阅权范围内。</p>
     */
    private PersonalDataCategory auditLogCategory(Long userId) {
        List<String> columns = List.of("id", "operation", "operator_role", "target_type",
                "target_id", "request_method", "request_url", "response_status", "ip",
                "user_agent", "duration_ms", "created_at");
        return paged("audit_logs", "操作审计日志", columns,
                auditLogRepository.search(userId, null, null, null, null, PAGE),
                a -> row(a.getId(), a.getOperation(), a.getOperatorRole(), a.getTargetType(),
                        a.getTargetId(), a.getRequestMethod(), a.getRequestUrl(),
                        a.getResponseStatus(), a.getIp(), a.getUserAgent(), a.getDurationMs(),
                        a.getCreatedAt()));
    }

    // ---- 辅助方法 ----

    /**
     * 判定临时聊天里「本人消息」对应的 {@code sender} 取值。
     *
     * <p>与写入侧 {@code TempChatMessageService}（{@code sender = userAId.equals(currentUserId)
     * ? "self" : "peer"}）保持同一套映射；写读不一致会把对方的消息当成我的导出。</p>
     *
     * @param userId  导出主体
     * @param session 会话
     * @return {@code "self"} 或 {@code "peer"}
     */
    static String ownTempChatSenderValue(Long userId, TempChatSession session) {
        return session != null && userId.equals(session.getUserAId()) ? "self" : "peer";
    }

    /** 通用「行数上限 + 映射」装配，超出部分丢弃并标 truncated。 */
    private static <T> PersonalDataCategory capped(
            String name, String label, List<String> columns, List<T> items,
            Function<T, List<String>> mapper) {
        boolean truncated = items.size() > MAX_ROWS_PER_CATEGORY;
        return category(name, label, columns, kept(items, truncated), mapper, truncated);
    }

    /**
     * 分页来源的装配：返回条数正好打满上限时保守判定为「还有更多」，标 truncated。
     */
    private static <T> PersonalDataCategory paged(
            String name, String label, List<String> columns, Page<T> page,
            Function<T, List<String>> mapper) {
        List<T> items = page.getContent();
        boolean truncated = items.size() >= MAX_ROWS_PER_CATEGORY;
        return category(name, label, columns, items, mapper, truncated);
    }

    /**
     * 会话数裁剪（临时聊天/私信共用）。
     *
     * @param items 会话列表
     * @return 不超过 {@link #MAX_CHAT_THREADS} 的列表
     */
    private static <T> List<T> threadLimited(List<T> items) {
        return items.size() <= MAX_CHAT_THREADS ? items : items.subList(0, MAX_CHAT_THREADS);
    }

    /** 截断时保留前 {@link #MAX_ROWS_PER_CATEGORY} 条。 */
    private static <T> List<T> kept(List<T> items, boolean truncated) {
        return truncated ? items.subList(0, MAX_ROWS_PER_CATEGORY) : items;
    }

    /** 行映射 + 类别构造（truncated 由调用方判定）。 */
    private static <T> PersonalDataCategory category(
            String name, String label, List<String> columns, List<T> items,
            Function<T, List<String>> mapper, boolean truncated) {
        List<List<String>> rows = new ArrayList<>(items.size());
        for (T item : items) {
            rows.add(mapper.apply(item));
        }
        return truncated
                ? PersonalDataCategory.truncated(name, label, columns, rows)
                : PersonalDataCategory.of(name, label, columns, rows);
    }

    /** 评论所属帖子 ID（懒加载关联为空时降级为 null，不让导出因单条脏数据整体失败）。 */
    private static Long postId(Comment comment) {
        try {
            return comment.getPost() == null ? null : comment.getPost().getId();
        } catch (RuntimeException e) {
            log.warn("评论 {} 的帖子关联读取失败，postId 置空", comment.getId());
            return null;
        }
    }

    /** 会话/信号中除本人之外的一方 ID。 */
    private static Long counterpart(Long userId, Long userAId, Long userBId) {
        return userId.equals(userAId) ? userBId : userAId;
    }

    /** 是否为会话参与方（防御性复核，杜绝越权行）。 */
    private static boolean isParticipant(Long userId, Long userAId, Long userBId) {
        return userId.equals(userAId) || userId.equals(userBId);
    }

    /**
     * 单元格渲染：null → 空串，枚举 → 名称，时间/日期 → ISO 字符串，其余 → {@code toString()}。
     *
     * <p>统一成字符串是「JSON 与 CSV 内容逐字一致」的前提。</p>
     */
    private static String cell(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Enum<?> enumValue) {
            return enumValue.name();
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.toString();
        }
        if (value instanceof LocalDate date) {
            return date.toString();
        }
        return String.valueOf(value);
    }

    /** 变参构造一行，逐格过 {@link #cell(Object)}，保证无 null、无空指针。 */
    private static List<String> row(Object... cells) {
        List<String> row = new ArrayList<>(cells.length);
        for (Object c : cells) {
            row.add(cell(c));
        }
        return List.copyOf(row);
    }

    /**
     * 自检：每个类别的行宽必须等于列宽。
     *
     * <p>列名与取值是一一对应手写出来的，改字段时很容易漏一格导致整列错位（导出物
     * 看起来正常但语义全错）。这里在返回前一次性校验，宁可 500 也不给出错位的档案。</p>
     */
    private static void validateColumnWidths(List<PersonalDataCategory> categories) {
        for (PersonalDataCategory category : categories) {
            for (List<String> row : category.rows()) {
                if (row.size() != category.columns().size()) {
                    throw new IllegalStateException("导出类别 " + category.name()
                            + " 列数(" + category.columns().size()
                            + ")与取值数(" + row.size() + ")不一致");
                }
            }
        }
    }
}
