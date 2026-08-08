package com.campuslove.api.media;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.ratelimit.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * 媒体上传控制器。
 *
 * <p>端点：{@code POST /api/media/upload}
 * 接收 multipart 文件 + 类型，调用 {@link MediaStorageService} 完成存储，
 * 返回 URL 与元信息。</p>
 *
 * <p>鉴权：路径 {@code /api/media/upload} 走标准 /api/** 鉴权链（需认证）。
 * 返回的 URL 为 {@code /api/v1/media/...} 鉴权代理路径（infra R2-00014），
 * 不再依赖已 denyAll 的静态资源映射。</p>
 *
 * <p>错误处理：
 * <ul>
 *   <li>文件过大 → {@link MediaSizeLimitExceededException} → 由 GlobalExceptionHandler 转 413 Payload Too Large</li>
 *   <li>格式不支持 → {@link IllegalArgumentException} → 转 400 Bad Request</li>
 * </ul>
 * </p>
 */
@Tag(name = "Media", description = "媒体文件上传与鉴权访问接口")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/media")
public class MediaUploadController {

    private static final Logger LOGGER = LoggerFactory.getLogger(MediaUploadController.class);

    private final MediaStorageService storageService;

    /**
     * 构造函数注入存储服务。
     *
     * @param storageService 媒体存储服务实现
     */
    public MediaUploadController(MediaStorageService storageService) {
        this.storageService = storageService;
    }

    /**
     * 上传媒体文件。
     *
     * <p>速率限制：桶容量 30，每秒补充 1 个令牌，按客户端 IP 限流，
     * 防止恶意刷上传占用存储与带宽。</p>
     *
     * @param file        multipart 文件
     * @param type        媒体类型（image/video/background）
     * @param durationMs  视频时长（毫秒），可选，由前端记录
     * @return 上传响应（URL + 元信息）
     */
    @PostMapping("/upload")
    @PreAuthorize("hasRole('USER')")
    @Operation(
            summary = "上传媒体文件",
            description = "接收 multipart 文件 + 类型，校验 MIME 与 magic bytes，按 uploads/{userId}/{yyyyMM}/{uuid}.{ext} 分片存储。速率限制：桶容量 30，每秒补充 1 个令牌（按 IP 限流）。支持幂等性。",
            operationId = "uploadMedia"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "上传成功，返回访问 URL 与元信息",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "BAD_REQUEST：格式不支持或文件损坏", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "UNAUTHORIZED：未登录", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "413", description = "PAYLOAD_TOO_LARGE：文件超过大小限制", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "RATE_LIMITED：触发限流", content = @Content)
    })
    @RateLimit(capacity = 30, refillTokens = 1, key = "#request.remoteAddr")
    @Idempotent
    public ApiResponse<UploadResponse> upload(
            @Parameter(in = ParameterIn.QUERY, description = "multipart 文件", required = true,
                    content = @Content(mediaType = "multipart/form-data"))
            @RequestParam("file") MultipartFile file,
            @Parameter(in = ParameterIn.QUERY, description = "媒体类型：image / video / background / audio（60s 语音状态）", required = true, example = "image")
            @RequestParam("type") String type,
            @Parameter(in = ParameterIn.QUERY, description = "视频时长（毫秒），可选", example = "15000")
            @RequestParam(value = "durationMs", required = false)
            Integer durationMs) {
        Long userId = getCurrentUserId();
        LOGGER.info("收到上传请求: userId={} type={} size={} durationMs={}",
                userId, type, file == null ? 0 : file.getSize(), durationMs);

        MediaStorageService.UploadResult result = storageService.store(userId, file, type);
        // 若调用方未传 durationMs，使用服务返回的（视频场景通常为 null）
        Integer finalDuration = durationMs != null ? durationMs : result.getDurationMs();
        return ApiResponse.ok(new UploadResponse(
                result.getUrl(),
                result.getWidth(),
                result.getHeight(),
                result.getMime(),
                result.getSize(),
                finalDuration
        ));
    }

    /**
     * 从 SecurityContext 获取当前登录用户 ID。
     *
     * <p>Mock 模式：MockSecurityConfig 注入 PreAuthenticatedAuthenticationToken，
     * principal 为用户 ID（Long）。</p>
     *
     * <p>Real 模式：JwtAuthenticationFilter 注入的 principal 通常为 userId。</p>
     *
     * <p>未认证时直接抛出 401，不再使用兜底默认值。</p>
     *
     * @return 当前用户 ID
     * @throws ResponseStatusException 未认证时返回 401
     */
    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHENTICATED);
        }
        Object principal = auth.getPrincipal();
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
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHENTICATED);
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHENTICATED);
    }

    /**
     * 上传响应 DTO。
     */
    public static class UploadResponse {

        /** 访问 URL */
        private final String url;

        /** 宽度（像素，可空） */
        private final Integer width;

        /** 高度（像素，可空） */
        private final Integer height;

        /** MIME 类型 */
        private final String mime;

        /** 文件大小（字节） */
        private final Long size;

        /** 视频时长（毫秒，可空） */
        private final Integer durationMs;

        public UploadResponse(String url, Integer width, Integer height,
                              String mime, Long size, Integer durationMs) {
            this.url = url;
            this.width = width;
            this.height = height;
            this.mime = mime;
            this.size = size;
            this.durationMs = durationMs;
        }

        public String getUrl() {
            return url;
        }

        public Integer getWidth() {
            return width;
        }

        public Integer getHeight() {
            return height;
        }

        public String getMime() {
            return mime;
        }

        public Long getSize() {
            return size;
        }

        public Integer getDurationMs() {
            return durationMs;
        }
    }
}
