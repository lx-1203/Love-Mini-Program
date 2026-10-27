package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.User;
import com.campuslove.api.media.MediaAssetService;
import com.campuslove.api.media.MediaSizeLimitExceededException;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.media.MediaUploadCategory;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.village.PostDetailView;
import com.campuslove.api.village.VillagePostService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * 管理后台 - 内容创作（运营代发）控制器。
 *
 * <p>提供两个「写」端点，供运营人员在后台直接产出官方内容：</p>
 * <ul>
 *   <li>{@code POST /api/v1/admin/posts}：新建帖子（含配图），作者固定为配置的「官方小编」账号</li>
 *   <li>{@code POST /api/v1/admin/media/upload}：图片上传，落盘目录与 URL 形态与小程序端一致，
 *       并登记 {@code media_asset}（归属小编账号）</li>
 * </ul>
 *
 * <p>设计约束：</p>
 * <ul>
 *   <li><b>不提供编辑端点</b>：后台只允许「新建 + 审核既有内容」，存量帖子的修改一律走
 *       {@link AdminVillagePostController} 的审核/置顶/删除通道（产品决策，防止后台改写用户原文）。</li>
 *   <li><b>作者来源</b>：请求体不接受 {@code authorId}/{@code userId}，作者取配置项
 *       {@code app.admin.compose-author-user-id}（环境变量 {@code APP_ADMIN_COMPOSE_AUTHOR_USER_ID}）。
 *       未配置或账号不存在/被禁用时直接 503 + 中文提示，<b>绝不</b>回退为当前管理员自己，
 *       避免运营账号出现在 C 端作者位上。</li>
 *   <li><b>复用发帖主链路</b>：帖子创建委托
 *       {@link VillagePostService#createPost}（敏感词过滤 + 微信 msgSecCheck 内容安全 +
 *       {@code post_tags} 落库 + 热门列表缓存失效 + 可见范围推导），本类只在同一事务内
 *       追加后台代发的差异字段（审核状态改为 approved、审计人、owner_circle_path）。</li>
 *   <li><b>权限</b>：类级 {@code hasAnyRole('ADMIN','SUPER_ADMIN','AUDITOR')} 与其他后台控制器一致；
 *       本类两个方法均为写操作，方法级收紧为 {@code hasAnyRole('ADMIN','SUPER_ADMIN')}
 *       （AUDITOR 按设计只读）。</li>
 *   <li><b>校区隔离</b>：沿用 {@link AdminDataScope#assertCampusAccess(String)}——
 *       校区管理员（ADMIN + campusName）发布时按小编账号所属校区校验，越权返回 403。</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
@Validated
@Profile("real")
public class AdminContentComposeController {

    private static final Logger log = LoggerFactory.getLogger(AdminContentComposeController.class);

    // ===== 内容校验阈值：与小程序端 apps/client/src/constants/village.ts 保持一致 =====

    /** 标题最小长度（对应 client POST_TITLE_MIN_LENGTH / VillagePostService.POST_TITLE_MIN_LENGTH） */
    static final int TITLE_MIN_LENGTH = 5;

    /** 标题最大长度（对应 client POST_TITLE_MAX_LENGTH / VillagePostService.POST_TITLE_MAX_LENGTH） */
    static final int TITLE_MAX_LENGTH = 30;

    /** 正文最大长度（对应 client POST_MAX_LENGTH = 500；后端 CreatePostRequest 放宽到 5000，后台取严） */
    static final int CONTENT_MAX_LENGTH = 500;

    /** 单帖最大图片数（对应 client POST_MAX_IMAGES = 9） */
    static final int MAX_IMAGES = 9;

    /** 单帖最大标签数（对应 client POST_MAX_CUSTOM_TAGS = 5） */
    static final int MAX_TAGS = 5;

    /** 单个标签最大长度（与 CreatePostRequest 的 @Size(max = 20) 对齐） */
    static final int TAG_MAX_LENGTH = 20;

    /** 图片 URL 最大长度（与 posts.images 列 / 媒体 URL 形态匹配，防御超长入参） */
    static final int IMAGE_URL_MAX_LENGTH = 512;

    /**
     * 图片最大字节数：10 MB。
     * <p>镜像 {@code LocalMediaStorageService.MAX_IMAGE_BYTES}（private 常量，10L * 1024 * 1024），
     * 与 ErrorMessages.IMAGE_SIZE_EXCEED_10MB_PREFIX 文案同源；存储层仍是权威校验方，
     * 这里只做前置快速失败，不另设更宽松/更严格的阈值。</p>
     */
    static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;

    /** 上传类型白名单：后台代发只允许图片（视频/语音走小程序端既有链路，封存策略不变） */
    static final String UPLOAD_TYPE_IMAGE = "image";

    /** 后台代发帖子的审核备注固定文案（审计留痕，说明免审原因） */
    static final String COMPOSE_AUDIT_REMARK = "官方小编后台发布，免内容审核";

    /** 未配置小编账号时的 503 文案 */
    static final String COMPOSE_AUTHOR_NOT_CONFIGURED =
            "官方小编账号未配置：请在后端设置 app.admin.compose-author-user-id"
                    + "（环境变量 APP_ADMIN_COMPOSE_AUTHOR_USER_ID）为小编账号的用户 ID 后重启服务";

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final VillagePostService villagePostService;
    private final MediaStorageService storageService;
    private final MediaAssetService mediaAssetService;
    private final AdminDataScope adminDataScope;
    private final RealAdminStatsService adminStatsService;

    /**
     * 官方小编账号用户 ID（{@code app.admin.compose-author-user-id}，缺省 0 表示未配置）。
     * 0 时两个写端点均返回 503，不回退为当前管理员。
     */
    private final long composeAuthorUserId;

    public AdminContentComposeController(PostRepository postRepository,
                                        UserRepository userRepository,
                                        VillagePostService villagePostService,
                                        MediaStorageService storageService,
                                        MediaAssetService mediaAssetService,
                                        AdminDataScope adminDataScope,
                                        RealAdminStatsService adminStatsService,
                                        @Value("${app.admin.compose-author-user-id:0}") long composeAuthorUserId) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.villagePostService = villagePostService;
        this.storageService = storageService;
        this.mediaAssetService = mediaAssetService;
        this.adminDataScope = adminDataScope;
        this.adminStatsService = adminStatsService;
        this.composeAuthorUserId = composeAuthorUserId;
    }

    /**
     * 后台发布帖子（官方小编代发）。
     *
     * <p>校验：标题 5-30 字、正文 ≤500 字、图片 ≤9 张、标签 ≤5 个（与小程序端一致），
     * 分类必须是 {@link PostCategory} 枚举值，{@code targetType} 走服务层
     * general/circle/campus/friends 语义（circle 需 targetId + 小编为该圈成员，
     * campus 需小编已通过校园认证，否则返回 403）。</p>
     *
     * <p>落库后本方法在同一事务内追加：{@code audit_status=approved}、
     * {@code status=active}（服务层默认值）、审计人/审计时间，以及
     * {@code posts.owner_circle_path}（取作者 {@code users.circle_path}，缺列或无值时跳过）。</p>
     *
     * @param req 请求体（不接受作者 ID）
     * @return 新帖摘要（id/标题/分类/标签/图片/状态/审核状态/可见范围/作者/校区/圈层路径/创建时间）
     */
    @PostMapping("/posts")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Transactional
    @Auditable(value = AuditOperation.CREATE_POST, targetType = "POST",
            description = "管理后台发布帖子（官方小编代发）")
    public ResponseEntity<Map<String, Object>> composePost(@Valid @RequestBody ComposePostRequest req) {
        Long adminId = SecurityUtils.getCurrentUserId();
        User author = requireComposeAuthor();
        // 校区隔离：校区管理员只能在本校区（小编账号校区）下发内容，越权 403
        adminDataScope.assertCampusAccess(author.getCampusName());

        String category = req.category() == null || req.category().isBlank()
                ? PostCategory.all.name() : req.category().trim();
        String targetType = req.targetType() == null || req.targetType().isBlank()
                ? "general" : req.targetType().trim();
        List<String> images = normalizeImages(req.images());
        List<String> tags = normalizeTags(req.tags());

        // 复用 C 端发帖主链路（敏感词 + 内容安全 + post_tags + 缓存失效 + 可见范围推导）
        PostDetailView view = villagePostService.createPost(
                author.getId(), req.title(), req.content(), images, tags,
                category, null, targetType, req.targetId());

        Post post = postRepository.findById(view.id())
                .orElseThrow(() -> new IllegalStateException("帖子创建后未能读取到记录: id=" + view.id()));
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        post.setAuditStatus(Post.AuditStatus.approved);
        post.setAuditRemark(COMPOSE_AUDIT_REMARK);
        post.setAuditorId(adminId);
        post.setAuditedAt(now);
        // 冗余圈层路径：按「谁在操作」定数据域——校区管理员发的内容要落进本校圈层，
        // 否则他在圈层树里点自己学校看不到自己发的帖。超管操作时回退到小编账号的圈层。
        post.setOwnerCirclePath(resolveOwnerCirclePath(adminId, author));
        post = postRepository.save(post);
        adminStatsService.invalidateStatsCache();

        String ownerCirclePath = post.getOwnerCirclePath();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", post.getId());
        body.put("title", post.getTitle());
        body.put("category", post.getCategory() == null ? null : post.getCategory().name());
        body.put("tags", tags);
        body.put("images", images);
        body.put("status", post.getStatus() == null ? null : post.getStatus().name());
        body.put("auditStatus", post.getAuditStatus() == null ? null : post.getAuditStatus().name());
        body.put("visibility", post.getVisibility() == null ? null : post.getVisibility().name());
        body.put("circleId", post.getCircleId());
        body.put("authorId", author.getId());
        body.put("authorNickname", author.getNickname());
        body.put("authorCampusName", author.getCampusName());
        body.put("ownerCirclePath", ownerCirclePath);
        body.put("createdAt", post.getCreatedAt() == null ? null
                : post.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        return ResponseEntity.ok(body);
    }

    /**
     * 后台图片上传（与小程序端同一存储实现、同一 URL 形态）。
     *
     * <p>文件落盘为 {@code {storageRoot}/{小编用户 ID}/{yyyyMM}/{uuid}.{ext}}，
     * 返回相对 key {@code /api/v1/media/...}；同事务登记 {@code media_asset}
     * （user_id=小编 ID、type=image、category=POST、audit_status=pending）。</p>
     *
     * @param file multipart 图片文件（jpg/jpeg/png/webp，≤10MB）
     * @param type 媒体类型，仅接受 {@code image}
     * @return 上传结果（url/width/height/mime/size）
     */
    @PostMapping("/media/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", required = false, defaultValue = UPLOAD_TYPE_IMAGE) String type) {
        // 上传归属小编账号（与后续发帖作者一致），未配置时同样 503，不落「管理员名下」的孤儿资产
        User author = requireComposeAuthor();
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空");
        }
        if (type != null && !type.isBlank() && !UPLOAD_TYPE_IMAGE.equalsIgnoreCase(type.trim())) {
            throw new IllegalArgumentException("管理后台仅支持上传图片（type=image），当前 type=" + type);
        }
        long fileSize = file.getSize();
        if (fileSize > MAX_IMAGE_BYTES) {
            // 与小程序端同一文案/异常类型：GlobalExceptionHandler 转 HTTP 413
            throw new MediaSizeLimitExceededException(
                    ErrorMessages.IMAGE_SIZE_EXCEED_10MB_PREFIX + (fileSize / 1024 / 1024) + "MB");
        }
        // 走同一 MediaStorageService bean：目录 {storageRoot}/{userId}/{yyyyMM}/{uuid}.{ext}、
        // 返回相对 key /api/v1/media/...；扩展名/MIME/magic bytes 校验由存储层完成（不支持时 400）
        MediaStorageService.UploadResult result =
                storageService.store(author.getId(), file, UPLOAD_TYPE_IMAGE);
        if (mediaAssetService != null) {
            mediaAssetService.recordUpload(author.getId(), UPLOAD_TYPE_IMAGE, result,
                    file.getOriginalFilename(), MediaUploadCategory.POST.name());
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("url", result.getUrl());
        body.put("width", result.getWidth());
        body.put("height", result.getHeight());
        body.put("mime", result.getMime());
        body.put("size", result.getSize());
        body.put("durationMs", result.getDurationMs());
        body.put("authorId", author.getId());
        return ResponseEntity.ok(body);
    }

    /**
     * 读取并校验官方小编账号。
     *
     * <p>三种失败形态统一返回 HTTP 503 + 中文指引（而非静默回退成当前管理员）：</p>
     * <ol>
     *   <li>配置缺失（≤0）：提示设置 {@code app.admin.compose-author-user-id}</li>
     *   <li>用户行不存在：提示在后台用户管理创建该账号或修正配置</li>
     *   <li>账号被禁用：提示先启用该账号</li>
     * </ol>
     *
     * @return 小编账号对应的 {@link User}
     * @throws ResponseStatusException 503 SERVICE_UNAVAILABLE
     */
    private User requireComposeAuthor() {
        if (composeAuthorUserId <= 0L) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, COMPOSE_AUTHOR_NOT_CONFIGURED);
        }
        User author = userRepository.findById(composeAuthorUserId).orElse(null);
        if (author == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "官方小编账号不存在（用户 ID=" + composeAuthorUserId + "）：请先在后台「用户管理」创建该账号，"
                            + "或修正 app.admin.compose-author-user-id 配置");
        }
        String status = author.getStatus();
        if (status != null && !status.isBlank() && !"active".equalsIgnoreCase(status.trim())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "官方小编账号不可用（用户 ID=" + composeAuthorUserId + "，状态=" + status
                            + "）：请先在后台启用该账号后再发布内容");
        }
        return author;
    }

    /**
     * 图片 URL 清洗：去空白、剔除空项、数量与长度双重校验（与客户端 9 张上限一致）。
     *
     * @param raw 请求体图片列表（可为 null）
     * @return 清洗后的列表（不为 null）
     * @throws IllegalArgumentException 超数量 / 超长度 / 空白项占比异常时（HTTP 400）
     */
    private List<String> normalizeImages(List<String> raw) {
        List<String> cleaned = new ArrayList<>();
        if (raw == null) {
            return cleaned;
        }
        for (String url : raw) {
            if (url == null || url.isBlank()) {
                continue;
            }
            String trimmed = url.trim();
            if (trimmed.length() > IMAGE_URL_MAX_LENGTH) {
                throw new IllegalArgumentException("图片 URL 长度不能超过 " + IMAGE_URL_MAX_LENGTH + " 字");
            }
            cleaned.add(trimmed);
        }
        if (cleaned.size() > MAX_IMAGES) {
            throw new IllegalArgumentException("单帖图片数量不能超过 " + MAX_IMAGES + " 张");
        }
        return cleaned;
    }

    /**
     * 标签清洗：去空白、剔除空项、去重，最多 5 个（MAX_TAGS）、单个最长 20 字（TAG_MAX_LENGTH）。
     *
     * @param raw 请求体标签列表（可为 null）
     * @return 清洗后的列表（不为 null）
     * @throws IllegalArgumentException 超数量 / 超长度时（HTTP 400）
     */
    private List<String> normalizeTags(List<String> raw) {
        List<String> cleaned = new ArrayList<>();
        if (raw == null) {
            return cleaned;
        }
        for (String tag : raw) {
            if (tag == null || tag.isBlank()) {
                continue;
            }
            String trimmed = tag.trim();
            if (trimmed.length() > TAG_MAX_LENGTH) {
                throw new IllegalArgumentException("标签长度不能超过 " + TAG_MAX_LENGTH + " 字");
            }
            if (!cleaned.contains(trimmed)) {
                cleaned.add(trimmed);
            }
        }
        if (cleaned.size() > MAX_TAGS) {
            throw new IllegalArgumentException("标签数量不能超过 " + MAX_TAGS + " 个");
        }
        return cleaned;
    }

    /**
     * 解析新帖的圈层归属：优先取实际操作人（登录管理员）的 circle_path，
     * 其次取官方小编账号的；两者都无值时返回 null，即「未归属圈层」。
     *
     * @param operatorId 当前登录管理员用户 ID
     * @param author     官方小编账号
     * @return 圈层路径（形如 {@code C1/R1/S1}）或 null
     */
    private String resolveOwnerCirclePath(Long operatorId, User author) {
        String operatorPath = operatorId == null ? null
                : userRepository.findById(operatorId).map(User::getCirclePath).orElse(null);
        for (String candidate : new String[]{operatorPath, author == null ? null : author.getCirclePath()}) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate.trim();
            }
        }
        return null;
    }

    /** 发布帖子请求体（无作者字段：作者由后端配置决定）。 */
    public record ComposePostRequest(
            @NotBlank @Size(min = TITLE_MIN_LENGTH, max = TITLE_MAX_LENGTH) String title,
            @NotBlank @Size(max = CONTENT_MAX_LENGTH) String content,
            @Size(max = 20) String category,
            @Size(max = MAX_TAGS) List<@Size(max = TAG_MAX_LENGTH) String> tags,
            @Size(max = MAX_IMAGES) List<@Size(max = IMAGE_URL_MAX_LENGTH) String> images,
            @Size(max = 20) String targetType,
            Long targetId
    ) {
    }
}
