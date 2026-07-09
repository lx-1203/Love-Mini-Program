package com.campuslove.api.media;

/**
 * 媒体文件大小超限异常。
 *
 * <p>当上传的图片或视频文件超过规定的最大字节数时抛出。
 * 由 {@link GlobalExceptionHandler} 捕获后转换为 HTTP 413 Payload Too Large 响应。</p>
 *
 * <p>典型场景：
 * <ul>
 *   <li>图片超过 10MB（{@link LocalMediaStorageService#MAX_IMAGE_BYTES}）</li>
 *   <li>视频超过 50MB（{@link LocalMediaStorageService#MAX_VIDEO_BYTES}）</li>
 * </ul>
 * </p>
 */
public class MediaSizeLimitExceededException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /**
     * 构造函数。
     *
     * @param message 错误信息（包含当前大小与限制说明）
     */
    public MediaSizeLimitExceededException(String message) {
        super(message);
    }

    /**
     * 构造函数。
     *
     * @param message 错误信息
     * @param cause   原始异常
     */
    public MediaSizeLimitExceededException(String message, Throwable cause) {
        super(message, cause);
    }
}
