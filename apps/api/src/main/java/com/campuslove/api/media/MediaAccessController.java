package com.campuslove.api.media;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
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
     * 鉴权代理读取媒体文件。
     *
     * <p>URL 模式：{@code GET /api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}}</p>
     *
     * <p>支持 query token 模式：{@code ?token=xxx}，
     * 由 {@link com.campuslove.api.config.JwtAuthenticationFilter} 在过滤链中提取并认证，
     * 用于微信小程序 {@code <image src>} 直接请求（image 标签无法携带 Authorization 头）。</p>
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
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "文件读取成功，返回二进制流（Content-Type 由 magic bytes 探测）",
                    content = @Content(mediaType = "application/octet-stream")),
            @ApiResponse(responseCode = "401", description = "UNAUTHORIZED：未携带有效 JWT", content = @Content),
            @ApiResponse(responseCode = "403", description = "FORBIDDEN：当前用户无权访问该文件", content = @Content),
            @ApiResponse(responseCode = "404", description = "NOT_FOUND：文件不存在", content = @Content)
    })
    public ResponseEntity<Resource> getMedia(
            @Parameter(description = "路径变量中的目标用户 ID（文件归属者）", required = true, example = "12345")
            @PathVariable("userId") Long userId,
            HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String subPath = extractSubPath(request, userId);
        LOGGER.debug("媒体访问请求: userId={}, subPath={}, authenticated={}",
                userId, subPath, authentication != null && authentication.isAuthenticated());

        MediaAccessService.MediaFile mediaFile =
                mediaAccessService.loadMedia(userId, subPath, authentication);

        return ResponseEntity.ok()
                .contentType(mediaFile.getMediaType())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .body(mediaFile.getResource());
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
