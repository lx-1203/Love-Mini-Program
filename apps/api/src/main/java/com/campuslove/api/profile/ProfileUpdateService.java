package com.campuslove.api.profile;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.ContentSecurityChecker;
import com.campuslove.api.config.ContentSecurityVerdict;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.media.MediaAssetService;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.user.FollowView;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

/**
 * 个人资料更新组件（Task 4.2.4 拆分）。
 *
 * <p>职责：所有写操作路径，包括：</p>
 * <ul>
 *   <li>{@link #saveBasicProfile}：保存基本资料（含 Phase B 扩展字段校验）</li>
 *   <li>{@link #uploadBackground} / {@link #uploadPhoto} / {@link #deletePhoto} / {@link #uploadVideo} / {@link #uploadHalfBody}：媒体上传与删除</li>
 *   <li>{@link #saveCampusProfile}：保存校园资料</li>
 *   <li>{@link #saveScheduleProfile}：保存日程资料</li>
 *   <li>{@link #followUser} / {@link #unfollowUser}：关注关系维护（含通知与计数）</li>
 *   <li>{@link #ensureBasicProfile}：媒体上传前自动创建空记录</li>
 *   <li>{@link #deleteOldMediaQuietly}：旧文件清理（失败不影响主流程）</li>
 * </ul>
 *
 * <p>该组件通过 ProfileQueryService 复用视图转换、JSON 解析与资料完善度计算逻辑，
 * 避免职责重复。写操作默认使用 {@code @Transactional} 保证事务一致性；
 * 唯一例外是 {@link #saveBasicProfile}（S2-1，2026-10-30）：它要外呼微信
 * msgSecCheck，事务边界改由 {@link #transactionTemplate} / {@link #suspendingTemplate}
 * 显式划定，见该方法的说明。</p>
 */
@Profile("real")
@Component
public class ProfileUpdateService {

    private static final Logger log = LoggerFactory.getLogger(ProfileUpdateService.class);

    /** 照片墙最大数量 */
    public static final int PHOTO_GALLERY_MAX = 6;

    /** height 取值范围 */
    public static final int HEIGHT_MIN = 120;
    public static final int HEIGHT_MAX = 250;

    /** educationLevel 合法取值 */
    public static final Set<String> VALID_EDUCATION_LEVELS =
            Set.of("high_school", "bachelor", "master", "phd");

    /** relationshipStatus 合法取值 */
    public static final Set<String> VALID_RELATIONSHIP_STATUS =
            Set.of("never", "married_before", "divorced", "widowed");

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final NotificationRepository notificationRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final InteractionEventService interactionEventService;
    private final MediaStorageService mediaStorageService;
    private final MediaAssetService mediaAssetService;
    private final ProfileQueryService queryService;
    private final FollowService followService;
    private final SensitiveWordFilter sensitiveWordFilter;

    /**
     * 统一内容安全检查器（微信 msgSecCheck v2 / 本地敏感词兜底，2026-10-05 合规接线）。
     * 字段注入（required=false）兼容既有单测构造器；为 null 时跳过统一检查，
     * 由 {@link SensitiveWordFilter} 兜底。checker 自身 fail-closed（异常降级本地过滤）。
     */
    @Autowired(required = false)
    private ContentSecurityChecker contentSecurityChecker;

    /**
     * 圈层树仓库（字段注入，required=false 与上面的增量接线同口径）。
     * 用于「用户选定校区 → 回填 users.circle_path」；为 null 时跳过回填，行为与改动前一致。
     */
    @Autowired(required = false)
    private com.campuslove.api.repository.circle.CircleLayerRepository circleLayerRepository;

    /**
     * 资料落库段的显式事务边界（S2-1，2026-10-30）。
     *
     * <p>内容安全检查（微信 msgSecCheck v2）是外部 HTTP 调用，原先被
     * {@code saveBasicProfile} 的方法级 {@code @Transactional} 圈在事务里：微信侧一慢，
     * 就长时间占住一条 Hikari 连接，外加 {@code users} / {@code user_basic_profiles}
     * 上它自己拿到的行锁，并发改资料会把连接池抽干，进而拖垮整个 API。现改成
     * 「校验 + 内容检查在事务外，读改写在事务内」，边界由本模板划定。</p>
     *
     * <p>用编程式而不是声明式：同类自调用不经过代理，注解本来就不生效；
     * 而且只有把边界写成代码，测试才能证伪「外呼发生在事务内」。</p>
     */
    private final TransactionTemplate transactionTemplate;

    /**
     * 「挂起一切事务」模板（S2-1，2026-10-30）——内容安全外呼专用。
     *
     * <p>只把本方法改成编程式事务还不够：调用方仍可能带着外层事务进来。
     * {@code RealProfileService.saveBasicProfile} 此前就是一个 {@code @Transactional}
     * 的纯委托，于是改资料的线程上早就有一个活动事务，本类里 {@code rejectIfRisky}
     * 的微信 HTTP 调用照样跑在事务内——连接和行锁还是被占着，改造等于没发生。</p>
     *
     * <p>PROPAGATION_NOT_SUPPORTED 会让 Spring <b>挂起</b>当前事务（含其 EntityManager
     * 与连接），外呼返回后再恢复，因此「外呼不在事务内」由本类自己保证，不依赖任何调用方
     * 的注解写法。落库段仍用 {@link #transactionTemplate}（REQUIRED）：有外层事务就加入、
     * 没有就新建，原子性与改造前一致。</p>
     */
    private final TransactionTemplate suspendingTemplate;

    /**
     * Spring 注入构造器。
     *
     * <p>注入 {@link PlatformTransactionManager} 而不是 TransactionTemplate bean：
     * 前者只要开了事务管理就一定存在，后者依赖 Boot 的 TransactionAutoConfiguration，
     * 手工装配的容器（含本包单测）里没有，会让 bean 创建直接失败（口径同
     * VillagePostService、VipOrderService）。</p>
     */
    @Autowired
    public ProfileUpdateService(
            UserRepository userRepository,
            UserFollowRepository userFollowRepository,
            NotificationRepository notificationRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            InteractionEventService interactionEventService,
            MediaStorageService mediaStorageService,
            MediaAssetService mediaAssetService,
            ProfileQueryService queryService,
            FollowService followService,
            SensitiveWordFilter sensitiveWordFilter,
            PlatformTransactionManager transactionManager) {
        this.userRepository = userRepository;
        this.userFollowRepository = userFollowRepository;
        this.notificationRepository = notificationRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.interactionEventService = interactionEventService;
        this.mediaStorageService = mediaStorageService;
        this.mediaAssetService = mediaAssetService;
        this.queryService = queryService;
        this.followService = followService;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.suspendingTemplate = new TransactionTemplate(transactionManager);
        this.suspendingTemplate.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_NOT_SUPPORTED);
    }

    // ---- 基本资料保存 ----

    /**
     * 保存基本资料。
     * 仅当请求显式传入扩展字段时才更新（null 保留原值）。
     * 同步更新 User 表的 nickname/bio/gradeLabel/pronouns 与 profileCompletion。
     *
     * <p>S2-1（2026-10-30）事务边界：这里<b>不能</b>用方法级 {@code @Transactional}。
     * 本方法中的 {@code rejectIfRisky}（昵称/简介）会外呼微信 msgSecCheck v2，
     * 声明式事务会让那次第三方 HTTP 调用带着 Hikari 连接和 {@code users} /
     * {@code user_basic_profiles} 行锁一起挂起等待，微信侧超时即等于拖垮连接池。
     * 现在的划分是：字段校验、取当前用户、内容安全检查（在 NOT_SUPPORTED 的
     * {@link #suspendingTemplate} 里，连调用方的外层事务也被挂起）全部在事务之外；
     * 从第一次仓库读开始，读-改-写、完善度重算与视图构建放进一个短事务
     * （{@link #transactionTemplate}，REQUIRED）原子提交。</p>
     *
     * <p>视图必须留在事务内构建：{@link ProfileQueryService#toBasicProfileView}
     * 会再查认证徽章等级与媒体资产，出事务后取会抛 LazyInitializationException。</p>
     *
     * <p>顺序与改造前一致：两次检查仍先于任何写入，敏感词命中判定（纯内存）仍在检查之后。</p>
     */
    public BasicProfileView saveBasicProfile(BasicProfileRequest request) {
        validateExtendedFields(request);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

        // 2026-10-05 合规接线：保存前统一内容安全检查（微信 msgSecCheck v2，scene=1 资料），
        // 命中高风险（risky）直接拒绝；checker 异常时内部降级本地敏感词（fail-closed）。
        // S2-1（2026-10-30）：这里会外呼微信 API，因此必须在事务之外——放进事务会带着连接和
        // 行锁等一个外部调用；挪到 afterCommit 等于先存后审，合规失效。用 NOT_SUPPORTED
        // 模板包一层：调用方即便带着外层事务进来，外呼期间那个事务也会被挂起。
        suspendingTemplate.executeWithoutResult(status -> {
            rejectIfRisky(request.nickname(), currentUserId, "1", "昵称");
            rejectIfRisky(request.bio(), currentUserId, "1", "简介");
        });

        // infra R2-00254 / R4-00298 的落库段（含读）整体在一个短事务里，见方法注释。
        return transactionTemplate.execute(status -> {
            UserBasicProfile profile = userBasicProfileRepository.findByUserId(currentUserId)
                    .orElseGet(() -> {
                        UserBasicProfile newProfile = new UserBasicProfile();
                        newProfile.setUserId(currentUserId);
                        newProfile.setCreatedAt(now);
                        newProfile.setPhotoGallery("[]");
                        newProfile.setFuturePlanTags("[]");
                        newProfile.setInterestTags("[]");
                        return newProfile;
                    });

            // R4-00298：资料昵称/简介属身份展示字段，命中敏感词直接【拒绝】并记录
            // （仅替换为 *** 无法阻止拆分/谐音绕过内容审核；拒绝策略保证资料区无违规内容）。
            // 与社区发帖（村口帖子/评论走替换策略）语义区分：资料字段更接近实名身份，
            // 从严处理。
            String filteredNickname = request.nickname();
            if (sensitiveWordFilter != null && sensitiveWordFilter.containsSensitive(request.nickname())) {
                // 记录命中（含用户 ID 与场景），随后拒绝保存
                sensitiveWordFilter.filterWithLog(request.nickname(), currentUserId, "PROFILE_NICKNAME");
                throw new IllegalArgumentException("资料包含违规内容，请修改后重试");
            }
            String filteredBio = request.bio();
            if (request.bio() != null && sensitiveWordFilter != null
                    && sensitiveWordFilter.containsSensitive(request.bio())) {
                sensitiveWordFilter.filterWithLog(request.bio(), currentUserId, "PROFILE_BIO");
                throw new IllegalArgumentException("资料包含违规内容，请修改后重试");
            }

            profile.setNickname(filteredNickname);
            profile.setBio(filteredBio);
            profile.setGradeLabel(request.grade());
            profile.setPronouns(request.pronouns());
            if (request.height() != null) {
                profile.setHeight(request.height());
            }
            if (request.educationLevel() != null) {
                profile.setEducationLevel(request.educationLevel());
            }
            if (request.relationshipStatus() != null) {
                profile.setRelationshipStatus(request.relationshipStatus());
            }
            if (request.hometownProvince() != null) {
                profile.setHometownProvince(request.hometownProvince());
            }
            if (request.hometownCity() != null) {
                profile.setHometownCity(request.hometownCity());
            }
            if (request.futureCity() != null) {
                profile.setFutureCity(request.futureCity());
            }
            if (request.futurePlanTags() != null) {
                profile.setFuturePlanTags(queryService.serializeListToJson(request.futurePlanTags()));
            }
            // P0-34 修复（2026-08-08）：兴趣标签写入（此前缺失 → 完善度差 20 分 → 无法解锁）
            if (request.interestTags() != null) {
                profile.setInterestTags(queryService.serializeListToJson(request.interestTags()));
            }
            // 2026-08-11 匹配精细化：理想型画像写入（可空，未传保留既有值）
            if (request.expectedPartner() != null) {
                profile.setExpectedPartner(request.expectedPartner().trim());
            }
            profile.setUpdatedAt(now);
            // save(...) 的返回值必须接收：实体带 @Version（UserBasicProfile#version），
            // Spring Data 走的是 em.merge，merge 返回的才是持久化上下文里那份权威实例
            // （读被挪出本事务时它就是游离态，merge 会换一个新对象并带上自增后的 version）。
            // 旧写法丢弃返回值，一旦调用形态变化就会静默改掉乐观锁/标识语义。
            profile = userBasicProfileRepository.save(profile);

            // 同步更新 User 表
            User user = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new IllegalStateException(ErrorMessages.USER_NOT_FOUND_CN_PREFIX + currentUserId));
            user.setNickname(filteredNickname);
            user.setBio(filteredBio);
            user.setGradeLabel(request.grade());
            user.setPronouns(request.pronouns());
            // 3-N 未成年人保护：birthDate 可选（存量用户不强制补填，避免破坏既有资料更新）；
            // 传值时校验年龄 >= 18，未满 18 拒绝保存并返回 MINOR_NOT_ALLOWED 业务错误
            if (request.birthDate() != null) {
                if (!com.campuslove.api.common.AgePolicy.isAdult(request.birthDate())) {
                    log.warn("未成年人资料更新被拒绝: userId={}, birthDate={}",
                            currentUserId, request.birthDate());
                    throw new com.campuslove.api.common.MinorNotAllowedException(
                            com.campuslove.api.common.ErrorMessages.MINOR_NOT_ALLOWED);
                }
                user.setBirthDate(request.birthDate());
            }

            // 2026-08-07：头像 URL 可选更新（非空时写入 users.avatar_url）
            // R4-00297：仅允许本服务媒体存储返回的 URL（/api/v1/media/ 或 /uploads/ 前缀
            // 的相对路径）——拒绝任意外部 URL（http/https/data/blob/wxfile 等），
            // 防止注入外部图片冒充头像（钓鱼/第三方追踪像素）。
            if (request.avatarUrl() != null && !request.avatarUrl().isBlank()) {
                String avatarUrl = request.avatarUrl().trim();
                if (!isTrustedMediaUrl(avatarUrl)) {
                    log.warn("头像 URL 未通过白名单校验，拒绝写入: userId={}, avatarUrl={}",
                            currentUserId, sanitizeForLog(avatarUrl));
                    throw new IllegalArgumentException("头像地址不合法，仅支持本服务上传的图片");
                }
                user.setAvatarUrl(avatarUrl);
            }

            // 重新计算资料完善度并保存
            user.setProfileCompletion(queryService.calculateProfileCompletion(currentUserId));
            user.setUpdatedAt(now);
            // 同上：@Version（User#version）使 save 走 merge，返回值才是权威实例，
            // 接收后再传给视图。
            user = userRepository.save(user);

            return queryService.toBasicProfileView(profile, user);
        });
    }

    /**
     * R4-00297：头像 URL 白名单校验。
     *
     * <p>仅接受本服务媒体存储返回的相对路径（当前 {@code /api/v1/media/...} 或
     * 历史 {@code /uploads/...}），拒绝绝对 URL（http/https/data: 等），
     * 杜绝任意外部 URL 冒充头像。</p>
     *
     * @param url 待校验的头像 URL
     * @return true 表示可信（本服务存储路径）
     */
    private boolean isTrustedMediaUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String lower = url.toLowerCase(java.util.Locale.ROOT);
        if (lower.startsWith("http://") || lower.startsWith("https://")
                || lower.startsWith("data:") || lower.startsWith("blob:")
                || lower.startsWith("wxfile://") || lower.startsWith("//")) {
            return false;
        }
        return lower.startsWith("/api/v1/media/") || lower.startsWith("/uploads/");
    }

    /** R4-00297：日志输出头像 URL 前截断，避免完整 URL 落入日志（可含用户 ID 等路径信息） */
    private String sanitizeForLog(String url) {
        if (url == null) {
            return "null";
        }
        return url.length() > 120 ? url.substring(0, 120) + "..." : url;
    }

    // ---- 媒体上传 ----

    /**
     * 上传头像（2026-08-07 新增）。
     *
     * 头像存于 users.avatar_url，由推荐卡片（DiscoverCard.avatar）与个人主页共用。
     * 覆盖前先删除旧文件，避免文件堆积。
     */
    @Transactional
    public BasicProfileView uploadAvatar(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "avatar");
        // 2026-08-09：同事务写入媒体资产记录（audit_status=pending，待审核），并清理旧头像记录
        mediaAssetService.recordUpload(currentUserId, "avatar", result, file.getOriginalFilename());
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException(ErrorMessages.USER_NOT_FOUND_CN_PREFIX + currentUserId));
        mediaAssetService.deleteByUrl(user.getAvatarUrl());
        deleteOldMediaQuietly(user.getAvatarUrl());
        user.setAvatarUrl(result.getUrl());
        user.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userRepository.save(user);
        // 返回含头像 URL 的最新资料视图（含自动创建的 basic profile 记录）
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        profile.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        return queryService.toBasicProfileView(profile, user);
    }

    /**
     * 上传个人主页背景图。
     * 删除旧背景图（如有），避免文件堆积。
     */
    @Transactional
    public BasicProfileView uploadBackground(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "background");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        deleteOldMediaQuietly(profile.getProfileBackgroundUrl());
        profile.setProfileBackgroundUrl(result.getUrl());
        profile.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    /**
     * 上传照片墙图片到指定索引。
     * 索引范围 0-5，覆盖前先删除旧文件。
     */
    @Transactional
    public BasicProfileView uploadPhoto(MultipartFile file, int index) {
        if (index < 0 || index >= PHOTO_GALLERY_MAX) {
            throw new IllegalArgumentException(
                    "照片墙索引越界，仅支持 0-" + (PHOTO_GALLERY_MAX - 1) + "，当前: " + index);
        }
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "image");
        // 2026-08-09：同事务写入媒体资产记录（audit_status=pending，待审核）
        mediaAssetService.recordUpload(currentUserId, "image", result, file.getOriginalFilename());
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        List<String> gallery = queryService.parseStringList(profile.getPhotoGallery());
        while (gallery.size() <= index) {
            gallery.add("");
        }
        String oldUrl = gallery.get(index);
        if (oldUrl != null && !oldUrl.isBlank()) {
            // 2026-08-09：覆盖时同步清理旧资产记录，避免脏数据
            mediaAssetService.deleteByUrl(oldUrl);
            deleteOldMediaQuietly(oldUrl);
        }
        gallery.set(index, result.getUrl());
        profile.setPhotoGallery(queryService.serializeListToJson(gallery));
        profile.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    /**
     * 删除指定索引的照片墙图片。
     * 索引越界或指定索引无照片时抛 {@link IllegalArgumentException}。
     */
    @Transactional
    public BasicProfileView deletePhoto(int index) {
        if (index < 0 || index >= PHOTO_GALLERY_MAX) {
            throw new IllegalArgumentException(
                    "照片墙索引越界，仅支持 0-" + (PHOTO_GALLERY_MAX - 1) + "，当前: " + index);
        }
        Long currentUserId = SecurityUtils.getCurrentUserId();
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        List<String> gallery = queryService.parseStringList(profile.getPhotoGallery());
        if (index >= gallery.size()) {
            throw new IllegalArgumentException(ErrorMessages.PHOTO_INDEX_INVALID_PREFIX + index);
        }
        String removed = gallery.remove(index);
        if (removed != null && !removed.isBlank()) {
            // 2026-08-09：删除照片时同步清理媒体资产记录，避免脏数据
            mediaAssetService.deleteByUrl(removed);
            deleteOldMediaQuietly(removed);
        }
        profile.setPhotoGallery(queryService.serializeListToJson(gallery));
        profile.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    /**
     * 上传个人视频。
     * 删除旧视频（如有）。
     */
    @Transactional
    public BasicProfileView uploadVideo(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "video");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        deleteOldMediaQuietly(profile.getPersonalVideoUrl());
        profile.setPersonalVideoUrl(result.getUrl());
        profile.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    /**
     * 上传半身照，用于推荐卡片大图。
     * 删除旧半身照（如有）。
     */
    @Transactional
    public BasicProfileView uploadHalfBody(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "image");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        deleteOldMediaQuietly(profile.getHalfBodyPhotoUrl());
        profile.setHalfBodyPhotoUrl(result.getUrl());
        profile.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    // ---- 校园资料保存 ----

    /**
     * 保存校园资料。
     * 新记录默认 verificationStatus=pending，已有记录保留原状态。
     * 重新计算 profileCompletion 并同步到 User 表。
     */
    @Transactional
    public CampusProfileView saveCampusProfile(CampusProfileRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

        UserCampusProfile profile = userCampusProfileRepository.findByUserId(currentUserId)
                .orElseGet(() -> {
                    UserCampusProfile newProfile = new UserCampusProfile();
                    newProfile.setUserId(currentUserId);
                    newProfile.setCreatedAt(now);
                    return newProfile;
                });

        profile.setCityName(request.city());
        profile.setCampusName(request.campusName());
        profile.setDepartmentName(request.department());
        if (profile.getId() == null) {
            profile.setVerificationStatus("pending");
        }
        profile.setUpdatedAt(now);
        userCampusProfileRepository.save(profile);

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException(ErrorMessages.USER_NOT_FOUND_CN_PREFIX + currentUserId));
        user.setProfileCompletion(queryService.calculateProfileCompletion(currentUserId));
        // 圈层归属回填（2026-10-14）：选定校区后把该校区在 circle_layer 上的三级节点路径写进
        // users.circle_path。此前这一列只由一次性回填脚本维护，于是新用户永远进不了圈层轴——
        // 他们的帖子全部落「未归属」，按圈层收缩的后台管理员看不到任何本人内容。
        // 校区名不在树上的（如未挂树的校区）保持 null，即未归属，而不是猜一个大区。
        user.setCirclePath(circlePathOfCampus(profile.getCampusName()));
        user.setUpdatedAt(now);
        userRepository.save(user);

        return new CampusProfileView(
                profile.getCityName(),
                profile.getCampusName(),
                profile.getDepartmentName(),
                profile.getVerificationStatus());
    }

    /**
     * 校区名 → 圈层树三级节点的 {@code circle_path}（level=3 且 name 全等）。
     *
     * <p>规则与后台建号链路共用同一个仓库方法（{@code findFirstByLevelAndName}）；
     * 未命中（校区没挂树）返回 null，由调用方按「未归属」处理，而不是猜一个大区。</p>
     */
    private String circlePathOfCampus(String campusName) {
        if (circleLayerRepository == null || campusName == null || campusName.isBlank()) {
            return null;
        }
        return circleLayerRepository.findFirstByLevelAndName(3, campusName.trim())
                .map(com.campuslove.api.entity.circle.CircleLayer::getCirclePath)
                .filter(path -> path != null && !path.isBlank())
                .orElse(null);
    }

    // ---- 日程资料保存 ----

    /**
     * 保存日程资料。
     * 将 preferredTimeWindows 与 courseBlocks 序列化为 JSON 存储。
     * 重新计算 profileCompletion 并同步到 User 表。
     */
    @Transactional
    public ScheduleProfileView saveScheduleProfile(ScheduleProfileRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

        String preferredTimeWindowJson = queryService.serializeListToJson(
                request.preferredTimeWindows() != null ? request.preferredTimeWindows() : List.of());
        String courseBlockJson = queryService.serializeListToJson(
                request.courseBlocks() != null ? request.courseBlocks() : List.of());

        UserScheduleProfile profile = userScheduleProfileRepository.findByUserId(currentUserId)
                .orElseGet(() -> {
                    UserScheduleProfile newProfile = new UserScheduleProfile();
                    newProfile.setUserId(currentUserId);
                    newProfile.setCreatedAt(now);
                    return newProfile;
                });

        profile.setPreferredCampusArea(request.preferredCampusArea());
        profile.setPreferredTimeWindowJson(preferredTimeWindowJson);
        profile.setCourseBlockJson(courseBlockJson);
        profile.setUpdatedAt(now);
        userScheduleProfileRepository.save(profile);

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException(ErrorMessages.USER_NOT_FOUND_CN_PREFIX + currentUserId));
        user.setProfileCompletion(queryService.calculateProfileCompletion(currentUserId));
        user.setUpdatedAt(now);
        userRepository.save(user);

        List<String> preferredTimeWindows = queryService.parseJsonToList(
                preferredTimeWindowJson, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        List<ScheduleBlockView> courseBlocks = queryService.parseJsonToList(
                courseBlockJson, new com.fasterxml.jackson.core.type.TypeReference<List<ScheduleBlockView>>() {});

        return new ScheduleProfileView(
                profile.getPreferredCampusArea(),
                preferredTimeWindows,
                courseBlocks);
    }

    // ---- 关注关系管理（委托至 FollowService） ----

    /**
     * 关注用户。
     * 创建关注关系，更新双方 followingCount/followersCount，并触发通知与互动事件。
     */
    @Transactional
    public FollowView followUser(Long userId, Long targetUserId) {
        return followService.followUser(userId, targetUserId);
    }

    /**
     * 取消关注用户。
     * 删除关注关系，更新双方 followingCount/followersCount（不低于 0）。
     */
    @Transactional
    public FollowView unfollowUser(Long userId, Long targetUserId) {
        return followService.unfollowUser(userId, targetUserId);
    }

    // ---- 私有辅助方法 ----

    /**
     * 统一内容安全检查（2026-10-05 合规接线）：高风险（risky）内容直接拒绝保存。
     * review 判定放行但记录告警日志；checker 未注入（旧测试构造器）时跳过。
     *
     * @param content 待检文本
     * @param userId  用户 ID
     * @param scene   msgSecCheck v2 场景（1=资料 2=评论 3=论坛 4=社交日志）
     * @param field   字段名（用于拒绝文案与日志）
     */
    private void rejectIfRisky(String content, Long userId, String scene, String field) {
        if (contentSecurityChecker == null || content == null || content.isBlank()) {
            return;
        }
        ContentSecurityVerdict verdict = contentSecurityChecker.check(content, userId, scene);
        if ("risky".equals(verdict.suggest())) {
            log.warn("内容安全检查命中高风险，拒绝保存资料: userId={}, scene={}, field={}, label={}, source={}",
                    userId, scene, field, verdict.label(), verdict.source());
            throw new IllegalArgumentException("资料包含违规内容，请修改后重试");
        }
        if ("review".equals(verdict.suggest())) {
            log.warn("内容安全检查命中待复核（review），放行并记录: userId={}, scene={}, field={}, source={}",
                    userId, scene, field, verdict.source());
        }
    }

    /**
     * 校验 Phase B 扩展字段范围。
     * 字段为 null 时跳过校验（可选字段）。
     */
    private void validateExtendedFields(BasicProfileRequest request) {
        if (request.height() != null) {
            int h = request.height();
            if (h < HEIGHT_MIN || h > HEIGHT_MAX) {
                throw new IllegalArgumentException(
                        "height 越界，仅支持 " + HEIGHT_MIN + "-" + HEIGHT_MAX + "，当前: " + h);
            }
        }
        if (request.educationLevel() != null && !request.educationLevel().isBlank()) {
            if (!VALID_EDUCATION_LEVELS.contains(request.educationLevel())) {
                throw new IllegalArgumentException(
                        "educationLevel 取值非法，仅支持 high_school/bachelor/master/phd，当前: "
                                + request.educationLevel());
            }
        }
        if (request.relationshipStatus() != null && !request.relationshipStatus().isBlank()) {
            if (!VALID_RELATIONSHIP_STATUS.contains(request.relationshipStatus())) {
                throw new IllegalArgumentException(
                        "relationshipStatus 取值非法，仅支持 never/married_before/divorced/widowed，当前: "
                                + request.relationshipStatus());
            }
        }
    }

    /**
     * 获取或创建当前用户的基本资料记录。
     * 媒体上传端点不要求用户先填写基本资料，故自动创建空白记录以便写入 URL。
     */
    public UserBasicProfile ensureBasicProfile(Long userId) {
        return userBasicProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserBasicProfile newProfile = new UserBasicProfile();
                    newProfile.setUserId(userId);
                    newProfile.setNickname("");
                    newProfile.setBio("");
                    newProfile.setGradeLabel("");
                    newProfile.setPronouns("");
                    newProfile.setInterestTags("[]");
                    newProfile.setFuturePlanTags("[]");
                    newProfile.setPhotoGallery("[]");
                    newProfile.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
                    return newProfile;
                });
    }

    /**
     * 删除旧媒体文件，失败时仅记日志不抛异常，避免主流程被影响。
     */
    public void deleteOldMediaQuietly(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        try {
            mediaStorageService.delete(url);
        } catch (IllegalStateException e) {
            log.warn("删除旧媒体文件失败 url={}: {}", url, e.getMessage());
        }
    }

    /**
     * 重新构建 BasicProfileView（包含完善度与认证徽章）。
     * 媒体上传后重新计算完善度。
     */
    public BasicProfileView rebuildView(Long userId, UserBasicProfile profile) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException(ErrorMessages.USER_NOT_FOUND_CN_PREFIX + userId));
        int completion = queryService.calculateProfileCompletion(userId);
        user.setProfileCompletion(completion);
        userRepository.save(user);
        return queryService.toBasicProfileView(profile, user);
    }
}
