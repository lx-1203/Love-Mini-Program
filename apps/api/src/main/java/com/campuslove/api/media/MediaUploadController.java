package com.campuslove.api.media;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 媒体上传控制器。
 *
 * <p>端点：{@code POST /api/media/upload}
 * 接收 multipart 文件 + 类型，调用 {@link MediaStorageService} 完成存储，
 * 返回 URL 与元信息。</p>
 *
 * <p>鉴权：路径 {@code /api/media/upload} 走标准 /api/** 鉴权链（需认证）。
 * 静态资源 {@code /uploads/**} 由 SecurityConfig 放行。</p>
 *
 * <p>错误处理：
 * <ul>
 *   <li>文件过大 → {@link MediaSizeLimitExceededException} → 由 GlobalExceptionHandler 转 413 Payload Too Large</li>
 *   <li>格式不支持 → {@link IllegalArgumentException} → 转 400 Bad Request</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping("/api/media")
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
     * @param file        multipart 文件
     * @param type        媒体类型（image/video/background）
     * @param durationMs  视频时长（毫秒），可选，由前端记录
     * @return 上传响应（URL + 元信息）
     */
    @PostMapping("/upload")
    public UploadResponse upload(@RequestParam("file") MultipartFile file,
                                 @RequestParam("type") String type,
                                 @RequestParam(value = "durationMs", required = false)
                                 Integer durationMs) {
        Long userId = getCurrentUserId();
        LOGGER.info("收到上传请求: userId={} type={} size={} durationMs={}",
                userId, type, file == null ? 0 : file.getSize(), durationMs);

        MediaStorageService.UploadResult result = storageService.store(userId, file, type);
        // 若调用方未传 durationMs，使用服务返回的（视频场景通常为 null）
        Integer finalDuration = durationMs != null ? durationMs : result.getDurationMs();
        return new UploadResponse(
                result.getUrl(),
                result.getWidth(),
                result.getHeight(),
                result.getMime(),
                result.getSize(),
                finalDuration
        );
    }

    /**
     * 从 SecurityContext 获取当前登录用户 ID。
     *
     * <p>Mock 模式：MockSecurityConfig 注入 PreAuthenticatedAuthenticationToken，
     * principal 为用户 ID（Long）。</p>
     *
     * <p>Real 模式：JwtAuthenticationFilter 注入的 principal 通常为 userId。</p>
     *
     * <p>兜底：未获取到时返回 1L（dev 默认），避免 NPE 影响联调。
     * 生产环境应通过 SecurityConfig 强制认证，到达此处的请求一定有 principal。</p>
     *
     * @return 当前用户 ID
     */
    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            LOGGER.warn("SecurityContext 中未找到认证信息，使用 dev 默认 userId=1");
            return 1L;
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
                LOGGER.warn("无法解析 principal 为 Long: {}，使用 dev 默认 userId=1", principal);
                return 1L;
            }
        }
        LOGGER.warn("未识别的 principal 类型: {}，使用 dev 默认 userId=1",
                principal.getClass().getName());
        return 1L;
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
