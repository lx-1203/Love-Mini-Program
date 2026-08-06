package com.campuslove.api.media;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.constraints.Positive;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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
 *   <li>Service 校验 targetUserId 必须等于当前 userId，或当前用户为 ADMIN，否则 403</li>
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
@RestController
@RequestMapping("/api/v1/media")
public class MediaAccessController {

    private static final Logger LOGGER = LoggerFactory.getLogger(MediaAccessController.class);

    /**
     * Task 11.5：审计日志 logger，路由到 logback-spring.xml 中的 AUDIT appender。
     *
     * <p>所有媒体访问审计事件（含拒绝/通过）通过此 logger 输出，
     * 由 AUDIT appender 写入 {@code logs/audit.log}，便于安全合规追溯。</p>
     */
    private static final Logger AUDIT_LOG = LoggerFactory.getLogger("com.campuslove.api.audit");

    /** Task 11.5：管理员角色标识，与 JwtAuthenticationFilter 注入的 ROLE_ADMIN 一致 */
    private static final String ROLE_ADMIN = "ROLE_ADMIN";

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

    /**
     * 构造函数注入媒体鉴权服务。
     *
     * @param mediaAccessService 媒体鉴权服务实现
     */
    public MediaAccessController(MediaAccessService mediaAccessService) {
        this.mediaAccessService = mediaAccessService;
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
            description = "按 JWT 中的 userId 校验文件归属，仅文件所有者或 ADMIN 可访问。支持 ?token=xxx 查询参数模式（用于 <image src> 标签）。路径穿越防护：字符级 + 绝对路径双重校验。",
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
        // Task 11.5：推断媒体类型，用于审计日志与差异化安全策略
        MediaType mediaType = MediaType.fromPath(subPath);
        String mediaId = extractMediaId(subPath);
        LOGGER.debug("媒体访问请求: userId={}, subPath={}, mediaType={}, mediaId={}, authenticated={}",
                userId, subPath, mediaType, mediaId,
                authentication != null && authentication.isAuthenticated());

        // Task 11.5：统一归属校验（含审计日志），实际访问控制仍由 service 强制执行
        assertOwnership(userId, mediaId, mediaType, authentication);

        MediaAccessService.MediaFile mediaFile =
                mediaAccessService.loadMedia(userId, subPath, authentication);

        // 审计日志：访问成功
        AUDIT_LOG.info("media.access.granted type={} targetUserId={} mediaId={} requesterId={} isAdmin={}",
                mediaType, userId, mediaId, extractCurrentUserId(authentication), hasAdminRole(authentication));

        // security_review 修复（R2-LOW-02）：按媒体类型差异化缓存策略——
        // IMAGE（公开社交资源）可私有缓存 1h；VOICE/VIDEO/ID_CARD（仅本人/管理员，
        // 高敏感）禁用缓存，避免共享设备浏览器缓存残留导致隐私泄露
        String cacheControl = mediaType == MediaType.IMAGE
                ? "private, max-age=3600"
                : "no-store, no-cache, must-revalidate";
        return ResponseEntity.ok()
                .contentType(mediaFile.getMediaType())
                .header(HttpHeaders.CACHE_CONTROL, cacheControl)
                .body(mediaFile.getResource());
    }

    /**
     * Task 11.5：统一归属校验。
     *
     * <p>对图片/语音/视频/身份证四类文件执行分级授权（infra R2-00013 修复）：
     * <ul>
     *   <li>{@link MediaType#IMAGE}（头像/帖子图/活动图）：任何已登录用户可读——
     *       社交浏览场景（查看他人资料、帖子、活动）必须能加载图片，否则核心功能不可用</li>
     *   <li>{@link MediaType#VOICE} / {@link MediaType#VIDEO}：仅本人或 ADMIN</li>
     *   <li>{@link MediaType#ID_CARD}（身份证/学生证）：仅本人或 ADMIN，拒绝时审计标注</li>
     *   <li>未认证一律拒绝</li>
     * </ul>
     * </p>
     *
     * <p>本方法为控制器层的"前置审计 + 显式校验"，记录所有访问尝试（含拒绝）到审计日志；
     * 实际访问控制仍由 {@link MediaAccessService#loadMedia} 在文件加载阶段强制执行，
     * 形成双层防护，避免任一层的疏漏导致越权。</p>
     *
     * <p>身份证（{@link MediaType#ID_CARD}）属于极高敏感数据，访问拒绝时会在审计日志中
     * 显式标注，便于安全审计追溯越权尝试。</p>
     *
     * @param targetUserId   路径变量中的目标用户 ID（文件归属者）
     * @param mediaId        媒体文件标识（从 subPath 提取的 uuid 部分，可为空）
     * @param mediaType      媒体类型（IMAGE/VOICE/VIDEO/ID_CARD）
     * @param authentication 当前请求的认证主体
     * @throws AccessDeniedException 未认证或非本人/非管理员时抛出
     */
    private void assertOwnership(Long targetUserId, String mediaId, MediaType mediaType,
                                  Authentication authentication) {
        Long currentUserId = extractCurrentUserId(authentication);
        boolean isAdmin = hasAdminRole(authentication);

        if (currentUserId == null) {
            // 未认证访问尝试
            AUDIT_LOG.warn("media.access.denied.unauthenticated type={} targetUserId={} mediaId={}",
                    mediaType, targetUserId, mediaId);
            throw new AccessDeniedException("未认证，拒绝访问媒体文件");
        }

        // 分级授权：IMAGE（头像/帖子图/活动图）为社交公开资源，登录用户均可读；
        // 语音/视频/身份证仅本人或管理员可读
        boolean isOwner = targetUserId.equals(currentUserId);
        boolean imagePublicRead = mediaType == MediaType.IMAGE;
        if (!isOwner && !isAdmin && !imagePublicRead) {
            // 越权访问尝试（非本人且非管理员，且非公开图片）
            AUDIT_LOG.warn("media.access.denied.forbidden type={} targetUserId={} requesterId={} mediaId={}",
                    mediaType, targetUserId, currentUserId, mediaId);
            // 身份证越权访问尝试单独标注，便于安全审计高频告警
            if (mediaType == MediaType.ID_CARD) {
                AUDIT_LOG.error("media.access.idcard.breach.attempt targetUserId={} requesterId={} mediaId={}",
                        targetUserId, currentUserId, mediaId);
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
     * Task 11.5：判断当前用户是否为管理员。
     *
     * @param authentication 当前认证主体
     * @return true 表示为管理员（拥有 ROLE_ADMIN）
     */
    private boolean hasAdminRole(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (ROLE_ADMIN.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
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
        // 优先使用 Spring MVC 提供的 pathWithin
        Object pathAttr = request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        if (pathAttr instanceof String pathWithin) {
            // pathWithin 形如 "{userId}/{yyyyMM}/{uuid}.jpg"，可能含前导 "/"
            String stripped = pathWithin;
            // 移除前导斜杠（不同 Spring 版本行为差异）
            if (stripped.startsWith("/")) {
                stripped = stripped.substring(1);
            }
            String prefix = userId + "/";
            if (stripped.startsWith(prefix)) {
                return stripped.substring(prefix.length());
            }
            // 兜底：pathWithin 不含 userId 前缀时直接返回（Service 会做安全校验）
            if (!stripped.isEmpty()) {
                return stripped;
            }
        }
        // 极端兜底：从 requestURI 中切割
        String uri = request.getRequestURI();
        String marker = "/api/v1/media/" + userId + "/";
        int idx = uri.indexOf(marker);
        if (idx < 0) {
            // 路径不匹配预期格式，交给 Service 抛 400
            return "";
        }
        return uri.substring(idx + marker.length());
    }
}
