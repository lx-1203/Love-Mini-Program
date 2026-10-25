package com.campuslove.api.media;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.entity.MediaAsset;
import com.campuslove.api.repository.MediaAssetRepository;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.context.annotation.Profile;
import jakarta.validation.constraints.Positive;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Task 0.3.2：媒体鉴权代理控制器。
 *
 * <p>端点：{@code GET /api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}}
 * 按当前 JWT 中的 userId 校验文件归属，仅文件所有者或管理员可访问。</p>
 *
 * <p>路径模式：{@code /api/v1/media/{userId}/**}，其中 {@code **} 匹配
 * {@code {yyyyMM}/{uuid}.{ext}} 子路径。Controller 从请求属性中提取该子路径
 * （由 Spring MVC 的 {@link HandlerMapping#PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE} 提供），
 * 交给 {@link MediaAccessService} 做鉴权与路径安全校验。</p>
 *
 * <p>鉴权流程：
 * <ol>
 *   <li>SecurityConfig 配置 {@code /api/v1/media/** authenticated()}，
 *       要求请求必须携带有效 JWT（支持 Authorization 头或 {@code ?token=xxx} 查询参数，
 *       详见 {@link com.campuslove.api.config.JwtAuthenticationFilter}）</li>
 *   <li>Controller 从 {@link SecurityContextHolder} 取 Authentication，传给 Service</li>
 *   <li>Service 校验 targetUserId 必须等于当前 userId；非本人时按<b>资源敏感度两档</b>
 *       授权（真源 {@link MediaTierPolicy}）：内容档（帖子配图/头像/相册/语音/视频）
 *       ADMIN / SUPER_ADMIN / AUDITOR 可读，其中 IMAGE 仍对任意登录用户公开可读；
 *       认证档（实名认证材料：身份证/学生证/学信网截图）仅 SUPER_ADMIN 可读</li>
 * </ol>
 * </p>
 *
 * <p>路径穿越（Path Traversal）防护：
 * <ul>
 *   <li>字符级校验：subPath 不含 {@code ..}、{@code \}、绝对路径前缀、控制字符、分号</li>
 *   <li>绝对路径校验：normalize 后必须仍在 {@code storageRoot} 之下</li>
 *   <li>详见 {@link MediaAccessService#loadMedia}</li>
 * </ul>
 * </p>
 *
 * <p>响应：直接以 {@code ResponseEntity<Resource>} 写入二进制数据，
 * Content-Type 由 {@link MediaAccessService#probeMediaType} 探测决定。</p>
 */
@Tag(name = "Media", description = "媒体文件上传与鉴权访问接口")
@SecurityRequirement(name = "bearerAuth")
@Profile("real")
@RestController
@RequestMapping("/api/v1/media")
public class MediaAccessController {

    private static final Logger LOGGER = LoggerFactory.getLogger(MediaAccessController.class);

    /** IMAGE 媒体私有缓存时长（秒）（R4-01851）：公开社交图片可缓存 1h */
    private static final long IMAGE_CACHE_MAX_AGE_SECONDS = 3600L;

    /**
     * 应用资产（app-assets）公开缓存时长（秒）（2026-08-10）。
     *
     * <p>装饰性静态图片，内容变更频率极低（重新播种时 url 不变），
     * 使用 {@code public, max-age=86400} 允许客户端/CDN 共享缓存一天。</p>
     */
    private static final long APP_ASSET_CACHE_MAX_AGE_SECONDS = 86400L;

    /** 应用资产 URL 前缀（与 LocalMediaStorageService.URL_PREFIX + app-assets 目录一致） */
    private static final String APP_ASSET_URL_PREFIX = "/api/v1/media/app-assets/";

    /** 应用资产媒体类型（与 media_asset.type 取值一致） */
    private static final String TYPE_APP_ASSET = "app_asset";

    /** 审核通过状态（与 MediaAssetService.AUDIT_APPROVED 取值一致，避免跨包耦合） */
    private static final String AUDIT_STATUS_APPROVED = "approved";

    /**
     * Task 11.5：审计日志 logger，路由到 logback-spring.xml 中的 AUDIT appender。
     *
     * <p>所有媒体访问审计事件（含拒绝/通过）通过此 logger 输出，
     * 由 AUDIT appender 写入 {@code logs/audit.log}，便于安全合规追溯。</p>
     */
    private static final Logger AUDIT_LOG = LoggerFactory.getLogger("com.campuslove.api.audit");

    /** Task 11.5：身份证文件路径关键词（小写匹配） */
    private static final Pattern ID_CARD_PATTERN = Pattern.compile(
            "(id[-_]?card|idcard|verification|certification)");
    /** Task 11.5：语音文件扩展名 */
    private static final Pattern VOICE_EXT_PATTERN = Pattern.compile(
            ".*\\.(mp3|wav|m4a|aac|opus|amr)$");
    /** Task 11.5：视频文件扩展名 */
    private static final Pattern VIDEO_EXT_PATTERN = Pattern.compile(
            ".*\\.(mp4|mov|avi|webm|mkv|flv)$");
    /** Task 11.5：语音文件路径关键词 */
    private static final Pattern VOICE_PATH_PATTERN = Pattern.compile("(voice|audio)");
    /** Task 11.5：视频文件路径关键词 */
    private static final Pattern VIDEO_PATH_PATTERN = Pattern.compile("(video|videos)");

    private final MediaAccessService mediaAccessService;

    /** R4-00273：短期媒体访问令牌签发器（5 分钟 TTL、scope=media） */
    private final com.campuslove.api.config.JwtTokenProvider jwtTokenProvider;

    /** P0-2：能力型签名 URL 签发器（把会话凭据从图片 URL 里彻底拿掉） */
    private final MediaUrlSigner mediaUrlSigner;

    /**
     * 应用资产注册校验用的资产仓库（2026-08-10，可选注入）。
     *
     * <p>mock profile 排除 DataSource 自动配置（无 JPA 仓库），公开端点降级为
     * 纯磁盘访问（不校验注册表）；real profile 注入后校验
     * {@code type=app_asset 且 audit_status=approved}，审核驳回的应用资产
     * 公开访问返回 404（管理闭环生效）。</p>
     */
    @Autowired(required = false)
    private MediaAssetRepository mediaAssetRepository;

    /**
     * 构造函数注入媒体鉴权服务。
     *
     * @param mediaAccessService 媒体鉴权服务实现
     * @param jwtTokenProvider   R4-00273：用于签发短期媒体访问令牌
     */
    public MediaAccessController(MediaAccessService mediaAccessService,
                                 com.campuslove.api.config.JwtTokenProvider jwtTokenProvider,
                                 MediaUrlSigner mediaUrlSigner) {
        this.mediaAccessService = mediaAccessService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.mediaUrlSigner = mediaUrlSigner;
    }

    /** 单次批量签发的路径上限：够覆盖一屏九宫格 + 头像，又限制被滥用时的放大面。 */
    private static final int SIGN_BATCH_MAX = 100;

    /** 媒体读取 URL 的形态：{@code /api/v1/media/{userId}/{子路径}}。 */
    private static final Pattern SIGNABLE_PATH_PATTERN =
            Pattern.compile("^/api/v1/media/(\\d+)/(.+)$");

    /**
     * 批量签发能力型媒体 URL（P0-2 收口最后一寸）。
     *
     * <p>为什么需要它：{@code <image src>} 带不了 Authorization 头，此前只能把
     * **完整 24 小时会话 JWT** 拼进 {@code ?token=}，于是会话凭据长期驻留在
     * 浏览器历史、上游代理日志与开发者工具里（自家 Tomcat 访问日志已在 R4-00407
     * 改为不记 query，但管不到上游）。</p>
     *
     * <p>安全要点：<b>签发即授权</b>。每条路径都走与 {@link #getMedia} 同一套
     * 归属/档位判定（{@code resolveAccessProfile} + {@link MediaTierPolicy#canRead}），
     * 判定不过的路径一律不签——否则「能签名」本身会变成绕过媒体分级读取的越权面，
     * 尤其是认证材料档。返回体不带拒绝原因，避免把本端点变成
     * 「这条路径存在吗 / 我能读吗」的探测预言机。</p>
     *
     * <p>媒体令牌（scope=media）不能调用本端点：与 {@code /token} 同理，
     * 否则短期凭据就能自我扩权成一批可读 URL。</p>
     *
     * @param request 待签发路径集合
     * @return 已签发的路径与对应 URL（无权限的路径不在其中）
     */
    @PostMapping("/sign")
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "返回调用者可读路径的签名（不可读路径静默省略）"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403",
                    description = "FORBIDDEN：未登录或使用媒体作用域令牌")
    })
    public MediaSignView signMediaUrls(@org.springframework.web.bind.annotation.RequestBody MediaSignRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (MediaTokenPolicy.isMediaOnlyAuthentication(authentication)) {
            throw new AccessDeniedException("媒体作用域令牌不能签发签名 URL，请使用完整会话重新获取");
        }
        Long requesterId = extractCurrentUserId(authentication);
        if (requesterId == null) {
            throw new AccessDeniedException("未认证，无法签发媒体签名 URL");
        }

        List<String> paths = request == null || request.paths() == null
                ? List.of()
                : request.paths().stream().filter(java.util.Objects::nonNull).distinct().limit(SIGN_BATCH_MAX).toList();

        List<MediaSignView.SignedPath> signed = new java.util.ArrayList<>(paths.size());
        for (String path : paths) {
            java.util.regex.Matcher matcher = SIGNABLE_PATH_PATTERN.matcher(path);
            if (!matcher.matches()) {
                // 非本人可读形态（含 app-assets 这类本就 permitAll 的公开资产）直接跳过
                continue;
            }
            Long ownerUserId;
            try {
                ownerUserId = Long.valueOf(matcher.group(1));
            } catch (NumberFormatException notNumeric) {
                continue;
            }
            String subPath = matcher.group(2);
            if (subPath.contains("..") || subPath.contains("//")) {
                continue;
            }
            MediaAccessService.AccessProfile profile =
                    mediaAccessService.resolveAccessProfile(ownerUserId, subPath);
            MediaTierPolicy.Tier tier = profile.tier();
            MediaType mediaType = MediaType.valueOf(profile.category().name());
            boolean isOwner = requesterId.equals(ownerUserId);
            boolean imagePublicRead = mediaType == MediaType.IMAGE;
            if (!MediaTierPolicy.canRead(tier, isOwner, imagePublicRead, authentication)) {
                AUDIT_LOG.warn("media.sign.denied tier={} targetUserId={} requesterId={} subPath={}",
                        tier, ownerUserId, requesterId, subPath);
                continue;
            }
            long expiresAt = mediaUrlSigner.expiresAtNow();
            signed.add(new MediaSignView.SignedPath(
                    path, mediaUrlSigner.signedUrl(path, expiresAt), expiresAt));
        }
        return new MediaSignView(signed);
    }

    /** 批量签发请求体。 */
    public record MediaSignRequest(List<String> paths) {
    }

    /** 批量签发响应：只含调用者有权读取的路径。 */
    public record MediaSignView(List<SignedPath> items) {
        /**
         * 单条签名结果。
         *
         * @param path      原始媒体路径（客户端用它做缓存键，不含签名）
         * @param url       可直接用于 {@code <image src>} 的带签名 URL
         * @param expiresAt 过期时刻（epoch 秒）
         */
        public record SignedPath(String path, String url, long expiresAt) {
        }
    }

    /**
     * R4-00273：签发短期媒体访问令牌。
     *
     * <p>用途：{@code <image src>} 等无法携带 Authorization 头的媒体请求，需要将
     * token 拼入 {@code ?token=} 查询参数。本端点签发 TTL 5 分钟的
     * {@code scope=media} 短期令牌（非完整用户 JWT），即使进入访问日志/浏览器
     * 历史，泄露窗口与可冒用范围也大幅缩小。</p>
     *
     * @return 媒体令牌（token + 有效期秒数）
     */
    @GetMapping("/token")
    @Operation(
            summary = "签发短期媒体访问令牌",
            description = "R4-00273：签发 TTL 5 分钟的 scope=media 短期令牌，用于 <image src> 等无法携带 Authorization 头的媒体请求（拼入 ?token= 查询参数）。相比完整用户 JWT，泄露窗口与冒用范围大幅缩小。",
            operationId = "issueMediaToken"
    )
    public MediaTokenView issueMediaToken() {
        Authentication currentAuthentication = SecurityContextHolder.getContext().getAuthentication();
        // P0-2 媒体令牌降权：本端点是「用完整用户会话换取短期媒体令牌」的入口，
        // 媒体令牌自己再来换一枚就成了自我续期（短期凭据变相长会话）。
        // 安全链已把 GET /api/v1/media/token 排除在媒体读取之外（403），这里再设一道
        // 代码闸：即使将来规则顺序被改动，媒体令牌也换不到新令牌。
        if (MediaTokenPolicy.isMediaOnlyAuthentication(currentAuthentication)) {
            throw new AccessDeniedException("媒体访问令牌不能续签，请使用完整用户会话重新获取");
        }
        Long currentUserId = extractCurrentUserId(currentAuthentication);
        if (currentUserId == null) {
            throw new AccessDeniedException("未认证，无法签发媒体访问令牌");
        }
        String token = jwtTokenProvider.generateMediaToken(String.valueOf(currentUserId));
        return new MediaTokenView(
                token,
                com.campuslove.api.config.JwtTokenProvider.MEDIA_TOKEN_TTL_SECONDS);
    }

    /**
     * 媒体访问令牌响应视图（R4-00273）。
     *
     * @param token            短期媒体访问令牌
     * @param expiresInSeconds 有效期（秒）
     */
    public record MediaTokenView(String token, long expiresInSeconds) {
    }

    /**
     * Task 11.5：媒体文件类型枚举。
     *
     * <p>按业务场景区分四类文件，便于审计日志分类记录与安全策略差异化配置：
     * <ul>
     *   <li>{@link #IMAGE} —— 头像/帖子图片（一般敏感）</li>
     *   <li>{@link #VOICE} —— 语音消息（高敏感，可能含私人对话）</li>
     *   <li>{@link #VIDEO} —— 视频消息/动态（高敏感）</li>
     *   <li>{@link #ID_CARD} —— 身份证/学生证/认证资料（极高敏感，禁止越权访问）</li>
     * </ul>
     * </p>
     */
    public enum MediaType {
        /** 头像/帖子图片等普通图片资源 */
        IMAGE,
        /** 语音消息文件 */
        VOICE,
        /** 视频消息文件 */
        VIDEO,
        /** 身份证/学生证等高敏感认证资料 */
        ID_CARD;

        /**
         * 根据子路径推断媒体类型。
         *
         * <p>推断规则（按优先级）：
         * <ol>
         *   <li>路径含 {@code id-card}/{@code idcard}/{@code verification}/{@code certification}
         *       → {@link #ID_CARD}</li>
         *   <li>路径含 {@code voice}/{@code audio} 或扩展名为 mp3/wav/m4a/aac/opus/amr
         *       → {@link #VOICE}</li>
         *   <li>路径含 {@code video}/{@code videos} 或扩展名为 mp4/mov/avi/webm/mkv/flv
         *       → {@link #VIDEO}</li>
         *   <li>其他默认 → {@link #IMAGE}</li>
         * </ol>
         * </p>
         *
         * @param subPath 子路径（如 {@code 202607/uuid.jpg} 或 {@code voice/202607/uuid.m4a}）
         * @return 推断出的媒体类型，永不为 null
         */
        public static MediaType fromPath(String subPath) {
            if (subPath == null || subPath.isBlank()) {
                return IMAGE;
            }
            String lower = subPath.toLowerCase(Locale.ROOT);
            if (ID_CARD_PATTERN.matcher(lower).find()) {
                return ID_CARD;
            }
            if (VOICE_PATH_PATTERN.matcher(lower).find() || VOICE_EXT_PATTERN.matcher(lower).matches()) {
                return VOICE;
            }
            if (VIDEO_PATH_PATTERN.matcher(lower).find() || VIDEO_EXT_PATTERN.matcher(lower).matches()) {
                return VIDEO;
            }
            return IMAGE;
        }
    }

    /**
     * 鉴权代理读取媒体文件。
     *
     * <p>URL 模式：{@code GET /api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}}</p>
     *
     * <p>支持 query token 模式：{@code ?token=xxx}，
     * 由 {@link com.campuslove.api.config.JwtAuthenticationFilter} 在过滤链中提取并认证，
     * 用于微信小程序 {@code <image src>} 直接请求（image 标签无法携带 Authorization 头）。</p>
     *
     * <p>Task 11.5：在调用底层 service 之前，先按子路径推断 {@link MediaType}，
     * 并通过 {@link #assertOwnership(Long, String, MediaType, Authentication)} 执行
     * 统一归属校验（含审计日志）。实际访问控制仍由 {@link MediaAccessService#loadMedia}
     * 强制执行（深度防御，双层校验）。</p>
     *
     * @param userId  路径变量中的目标用户 ID（文件归属者）
     * @param request HTTP 请求，用于提取子路径
     * @return ResponseEntity 包含文件资源与 Content-Type
     * @throws AccessDeniedException 当前用户无权访问该文件
     */
    @GetMapping("/{userId}/**")
    @Operation(
            summary = "鉴权代理读取媒体文件",
            description = "按 JWT 中的 userId 校验文件归属；非本人时按资源敏感度两档授权：内容档（帖子配图/头像/相册/语音/视频）ADMIN/SUPER_ADMIN/AUDITOR 可读、IMAGE 对登录用户公开可读；实名认证材料（身份证/学生证）仅本人或 SUPER_ADMIN。支持 ?token=xxx 查询参数模式（用于 <image src> 标签）。路径穿越防护：字符级 + 绝对路径双重校验。",
            operationId = "getMedia"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "文件读取成功，返回二进制流（Content-Type 由 magic bytes 探测）",
                    content = @Content(mediaType = "application/octet-stream")),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "UNAUTHORIZED：未携带有效 JWT", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "FORBIDDEN：当前用户无权访问该文件", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "NOT_FOUND：文件不存在", content = @Content)
    })
    public ResponseEntity<Resource> getMedia(
            @Parameter(description = "路径变量中的目标用户 ID（文件归属者）", required = true, example = "12345")
            @PathVariable("userId") @Positive Long userId,
            HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String subPath = extractSubPath(request, userId);
        // Task 11.5 + 2026-10-05 收敛 + 2026-10 两档分级：
        // 一次解析同时得到「访问分类」（驱动公开读与缓存策略）与「读取档位」
        // （CONTENT / VERIFICATION，驱动两档角色授权），controller 与 service 共用同一结论。
        MediaAccessService.AccessProfile accessProfile =
                mediaAccessService.resolveAccessProfile(userId, subPath);
        MediaTierPolicy.Tier tier = accessProfile.tier();
        MediaType mediaType = MediaType.valueOf(accessProfile.category().name());
        String mediaId = extractMediaId(subPath);
        LOGGER.debug("媒体访问请求: userId={}, subPath={}, mediaType={}, tier={}, mediaId={}, authenticated={}",
                userId, subPath, mediaType, tier, mediaId,
                authentication != null && authentication.isAuthenticated());

        // Task 11.5：统一归属校验（含审计日志），实际访问控制仍由 service 强制执行
        // （传入同一档案，controller/service 双层校验口径一致）
        assertOwnership(userId, mediaId, mediaType, tier, authentication);

        MediaAccessService.MediaFile mediaFile =
                mediaAccessService.loadMedia(userId, subPath, authentication, accessProfile);

        // 审计日志：访问成功
        AUDIT_LOG.info("media.access.granted type={} tier={} targetUserId={} mediaId={} requesterId={}"
                        + " canReadContent={} canReadVerification={}",
                mediaType, tier, userId, mediaId, extractCurrentUserId(authentication),
                MediaTierPolicy.canReadContentMedia(authentication),
                MediaTierPolicy.canReadVerificationMedia(authentication));

        // security_review 修复（R2-LOW-02）：按媒体类型差异化缓存策略——
        // IMAGE（公开社交资源）可私有缓存 1h；VOICE/VIDEO/ID_CARD（仅本人/管理员，
        // 高敏感）禁用缓存，避免共享设备浏览器缓存残留导致隐私泄露
        // R4-01851：缓存时长收敛为常量，调整无需改字符串字面量
        // 2026-10 两档分级补充：认证档一律 no-store（即便其分类被兜底判为 IMAGE，
        // 例如 media_asset.category 取值异常的 fail-closed 场景），绝不让实名材料进共享缓存
        String cacheControl = mediaType == MediaType.IMAGE
                        && tier != MediaTierPolicy.Tier.VERIFICATION
                ? "private, max-age=" + IMAGE_CACHE_MAX_AGE_SECONDS
                : "no-store, no-cache, must-revalidate";
        return ResponseEntity.ok()
                .contentType(mediaFile.getMediaType())
                .header(HttpHeaders.CACHE_CONTROL, cacheControl)
                .body(mediaFile.getResource());
    }

    /**
     * 公开访问应用资产（2026-08-10，小程序主包瘦身）。
     *
     * <p>URL 模式：{@code GET /api/v1/media/app-assets/{relpath}}，无需登录。
     * {@code relpath} 为源静态路径的相对部分（多级目录），如
     * {@code generated/images/campus/campus-gate.jpg} 或
     * {@code assets/images/banners/home-banner.jpg}。</p>
     *
     * <p>SecurityConfig / MockSecurityConfig 对 {@code /api/v1/media/app-assets/**}
     * permitAll 放行（匿名可访问）；已登录请求仍可带 token（若 token 失效，
     * JwtAuthenticationFilter 清除上下文后由 permitAll 规则继续放行）。</p>
     *
     * <p>注册校验（real profile）：先查 media_asset 是否存在
     * {@code url + type=app_asset + audit_status=approved} 的记录，缺失或未通过审核
     * 返回 404——管理后台「图片审核」驳回应用资产即下线该图；mock profile 无仓库，
     * 降级为纯磁盘读取。</p>
     *
     * @param request HTTP 请求，用于提取子路径
     * @return ResponseEntity 包含文件资源与 Content-Type
     * @throws ResponseStatusException 资产未注册/被驳回或文件不存在（404）
     */
    @GetMapping("/app-assets/**")
    @Operation(
            summary = "公开访问应用资产（无需登录）",
            description = "小程序主包瘦身：装饰性图片（campus 场景/活动海报/插画等）后端托管后的公开访问端点，免登录可看图。real profile 下校验 media_asset 注册记录（type=app_asset 且 audit_status=approved），驳回即下线。",
            operationId = "getAppAsset"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "文件读取成功，返回二进制流",
                    content = @Content(mediaType = "application/octet-stream")),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "NOT_FOUND：资产未注册、被驳回或文件不存在", content = @Content)
    })
    public ResponseEntity<Resource> getAppAsset(HttpServletRequest request) {
        String subPath = extractAppAssetSubPath(request);
        LOGGER.debug("应用资产访问请求: subPath={}", subPath);

        // 注册校验（real profile 有仓库时）：存在 url + type=app_asset + audit_status=approved 才可读
        if (mediaAssetRepository != null) {
            String url = APP_ASSET_URL_PREFIX + subPath;
            boolean registeredAndApproved = mediaAssetRepository
                    .findByUrlAndType(url, TYPE_APP_ASSET)
                    .map(MediaAsset::getAuditStatus)
                    .map(AUDIT_STATUS_APPROVED::equals)
                    .orElse(false);
            if (!registeredAndApproved) {
                LOGGER.debug("应用资产未注册或未通过审核，拒绝访问: subPath={}", subPath);
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "应用资产不存在或未启用");
            }
        }

        MediaAccessService.MediaFile mediaFile = mediaAccessService.loadAppAsset(subPath);
        // 静态装饰图，允许公开共享缓存（1 天）
        return ResponseEntity.ok()
                .contentType(mediaFile.getMediaType())
                .header(HttpHeaders.CACHE_CONTROL,
                        "public, max-age=" + APP_ASSET_CACHE_MAX_AGE_SECONDS)
                .body(mediaFile.getResource());
    }

    /**
     * Task 11.5 + 2026-10 两档分级：统一归属校验。
     *
     * <p>改造前只有一条 {@code hasAdminRole()}（仅 ROLE_ADMIN）同时决定内容类图片与
     * 实名认证材料的可读性；现在按资源敏感度分两档，判定真源见 {@link MediaTierPolicy}：
     * <ul>
     *   <li><b>本人短路（保持不变）</b>：上传者永远可读自己的文件；</li>
     *   <li>{@link MediaTierPolicy.Tier#VERIFICATION} 认证档（身份证/学生证/学信网截图）：
     *       仅 ROLE_SUPER_ADMIN（{@link MediaTierPolicy#canReadVerificationMedia}），
     *       校区 ADMIN 与只读审核员 AUDITOR 一律 403 并审计标注，
     *       「IMAGE 公开可读」分支在本档<b>不适用</b>；</li>
     *   <li>{@link MediaTierPolicy.Tier#CONTENT} 内容档（帖子配图/头像/相册/语音/视频）：
     *       IMAGE 仍为社交公开资源、任何已登录用户可读（否则查看他人资料、帖子、活动
     *       等核心功能不可用）；VOICE/VIDEO 需 ROLE_ADMIN / ROLE_SUPER_ADMIN /
     *       ROLE_AUDITOR（{@link MediaTierPolicy#canReadContentMedia}）；</li>
     *   <li>未认证一律拒绝。</li>
     * </ul>
     * </p>
     *
     * <p>本方法为控制器层的"前置审计 + 显式校验"，记录所有访问尝试（含拒绝）到审计日志；
     * 实际访问控制仍由 {@link MediaAccessService#loadMedia} 在文件加载阶段强制执行，
     * 形成双层防护，避免任一层的疏漏导致越权。</p>
     *
     * <p>认证档（{@link MediaType#ID_CARD}）属于极高敏感个人信息，访问拒绝时会在审计日志中
     * 显式标注，便于安全审计追溯越权尝试（含「有权角色但档位不够」的情形，
     * 例如 AUDITOR 尝试读取身份证照片）。</p>
     *
     * @param targetUserId   路径变量中的目标用户 ID（文件归属者）
     * @param mediaId        媒体文件标识（从 subPath 提取的 uuid 部分，可为空）
     * @param mediaType      媒体类型（IMAGE/VOICE/VIDEO/ID_CARD，驱动公开读与缓存）
     * @param tier           读取档位（CONTENT/VERIFICATION，驱动两档角色授权）
     * @param authentication 当前请求的认证主体
     * @throws AccessDeniedException 未认证，或非本人且不具备该档位要求的角色时抛出
     */
    private void assertOwnership(Long targetUserId, String mediaId, MediaType mediaType,
                                  MediaTierPolicy.Tier tier, Authentication authentication) {
        Long currentUserId = extractCurrentUserId(authentication);

        if (currentUserId == null) {
            // 未认证访问尝试
            AUDIT_LOG.warn("media.access.denied.unauthenticated type={} tier={} targetUserId={} mediaId={}",
                    mediaType, tier, targetUserId, mediaId);
            throw new AccessDeniedException(ErrorMessages.MEDIA_ACCESS_UNAUTHENTICATED);
        }

        boolean isOwner = targetUserId.equals(currentUserId);
        // 内容档公开读：与改造前一致（头像/帖子图/活动图对登录用户可见）
        boolean imagePublicRead = mediaType == MediaType.IMAGE;
        // 两档判定唯一口径（与 service 层强制校验共用 MediaTierPolicy#canRead）
        boolean permitted = MediaTierPolicy.canRead(
                tier, isOwner, imagePublicRead, authentication);
        if (!permitted) {
            MediaTierPolicy.Tier effectiveTier =
                    tier != null ? tier : MediaTierPolicy.Tier.VERIFICATION;
            // 越权访问尝试（非本人，且不具备该档位要求的角色，且非公开图片）
            AUDIT_LOG.warn("media.access.denied.forbidden type={} tier={} targetUserId={} "
                            + "requesterId={} mediaId={}",
                    mediaType, effectiveTier, targetUserId, currentUserId, mediaId);
            // 认证资料越权访问尝试单独标注，便于安全审计高频告警
            // （档位为认证档即标注，不再只看 mediaType——DB 分类异常被 fail-closed
            // 收紧为认证档的资源同样要留痕）
            if (effectiveTier == MediaTierPolicy.Tier.VERIFICATION) {
                AUDIT_LOG.error("media.access.idcard.breach.attempt type={} targetUserId={} "
                                + "requesterId={} mediaId={}",
                        mediaType, targetUserId, currentUserId, mediaId);
            }
            throw new AccessDeniedException(
                    "无权访问该用户的" + mediaTypeLabel(mediaType) + "文件");
        }
    }

    /**
     * Task 11.5：从 subPath 提取媒体标识（uuid 部分，去除扩展名）。
     *
     * <p>示例：{@code 202607/uuid.jpg} → {@code uuid}；
     * {@code voice/202607/uuid.m4a} → {@code uuid}。</p>
     *
     * @param subPath 子路径
     * @return 媒体标识，提取失败时返回空字符串
     */
    private String extractMediaId(String subPath) {
        if (subPath == null || subPath.isBlank()) {
            return "";
        }
        int slashIdx = subPath.lastIndexOf('/');
        String fileName = slashIdx >= 0 ? subPath.substring(slashIdx + 1) : subPath;
        int dotIdx = fileName.lastIndexOf('.');
        return dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName;
    }

    /**
     * Task 11.5：从 Authentication 提取当前 userId。
     *
     * <p>与 {@link MediaAccessService} 中的逻辑保持一致，支持 Long/Number/String principal。</p>
     *
     * @param authentication 当前认证主体
     * @return 当前 userId，未认证或无法解析返回 null
     */
    private Long extractCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Long longValue) {
            return longValue;
        }
        if (principal instanceof Number number) {
            return number.longValue();
        }
        if (principal instanceof String strValue) {
            try {
                return Long.parseLong(strValue);
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    /**
     * Task 11.5：媒体类型的中文标签，用于错误消息。
     *
     * @param mediaType 媒体类型
     * @return 中文标签
     */
    private String mediaTypeLabel(MediaType mediaType) {
        switch (mediaType) {
            case IMAGE:
                return "图片";
            case VOICE:
                return "语音";
            case VIDEO:
                return "视频";
            case ID_CARD:
                return "身份证";
            default:
                return "媒体";
        }
    }

    /**
     * 从请求 URI 中提取应用资产子路径（{@code app-assets} 之下的相对路径）。
     *
     * <p>直接按 requestURI 字符串切割：PATH_WITHIN_HANDLER_MAPPING 在
     * {@code @RequestMapping("/api/v1/media")} 前缀下会带上完整 controller 路径
     * （含 {@code /api/v1/media}），若再拼 {@code APP_ASSET_URL_PREFIX}
     * 会得到双前缀 URL（2026-08-10 实测修复）。</p>
     *
     * @param request HTTP 请求
     * @return 子路径字符串（如 {@code generated/images/campus/campus-gate.jpg}）
     */
    private String extractAppAssetSubPath(HttpServletRequest request) {
        // 直接按请求 URI 切割：PATH_WITHIN_HANDLER_MAPPING 在 @RequestMapping("/api/v1/media")
        // 前缀下会带上完整路径（含 controller 前缀），再拼 APP_ASSET_URL_PREFIX 会双前缀 404。
        String uri = request.getRequestURI();
        int idx = uri.indexOf(APP_ASSET_URL_PREFIX);
        if (idx < 0) {
            // 路径不匹配预期格式，交给 Service 抛 400
            return "";
        }
        String raw = uri.substring(idx + APP_ASSET_URL_PREFIX.length());
        // 注册表里的 media_asset.url 存的是原始 UTF-8 路径，而 getRequestURI() 给的是**未解码**的
        // 百分号形态：中文名素材（占 IMAGE_PATHS 的 370/393 条 404）因此永远匹配不上、
        // 在 :356 的注册校验分支就被判 404，磁盘分支根本跑不到。
        // 用 UriUtils 而不是 URLDecoder：后者是 form 解码器，会把路径里的 '+' 变成空格。
        // 安全性：解码后仍要过注册表白名单（real）以及 loadAppAsset 里的
        // validateSubPath + normalize/startsWith 双重越界校验，故不扩大穿越面。
        return org.springframework.web.util.UriUtils.decode(raw, java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * 从请求 URI 中提取子路径（{@code {yyyyMM}/{uuid}.{ext}}）。
     *
     * <p>优先从 {@link HandlerMapping#PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE} 提取
     * （由 Spring MVC 在 HandlerMapping 阶段注入，形如 {@code {userId}/{yyyyMM}/{uuid}.jpg}），
     * 兜底使用 {@link HttpServletRequest#getRequestURI()} 字符串切割。</p>
     *
     * <p>提取出的子路径会传给 {@link MediaAccessService#loadMedia} 做安全校验，
     * 这里不需要再做额外清洗。</p>
     *
     * @param request HTTP 请求
     * @param userId  路径变量中的目标用户 ID
     * @return 子路径字符串（如 {@code 202607/uuid.jpg}）
     */
    private String extractSubPath(HttpServletRequest request, Long userId) {
        String marker = "/api/v1/media/" + userId + "/";
        // MP-R5-MEDIA404（2026-09-13）：实测 PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE
        // 返回的是去除前导斜杠的完整 URI（"api/v1/media/{userId}/..."）而非 `**` 段，
        // 旧"不含 userId 前缀则原样返回"的兜底把整串当 subPath → 磁盘路径多出
        // api/v1/media 层级 → 所有用户上传图片读取 404。统一改为 marker 切割：
        // 从 pathWithin / requestURI 中定位 "/api/v1/media/{userId}/" 之后的部分。
        for (String candidate : new String[] {
                pathWithinOrNull(request), request.getRequestURI()}) {
            if (candidate == null) {
                continue;
            }
            int idx = candidate.indexOf(marker);
            if (idx >= 0 && idx + marker.length() < candidate.length()) {
                return candidate.substring(idx + marker.length());
            }
        }
        // 路径不匹配预期格式，交给 Service 抛 400
        return "";
    }

    /** pathWithin 属性的空安全读取（可能为 null 或非 String）。 */
    private String pathWithinOrNull(HttpServletRequest request) {
        Object pathAttr = request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        return pathAttr instanceof String s ? s : null;
    }
}
