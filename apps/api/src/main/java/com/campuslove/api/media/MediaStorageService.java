package com.campuslove.api.media;

import org.springframework.web.multipart.MultipartFile;

/**
 * 媒体存储服务接口。
 *
 * <p>定义上传文件的统一契约，由不同实现（如本地存储、对象存储）提供具体能力。</p>
 *
 * <p>实现方需保证：
 * <ul>
 *   <li>校验文件类型与大小（图片 jpg/png/webp ≤10MB；视频 mp4/mov ≤50MB）</li>
 *   <li>读取图片宽高元信息（用于前端展示）</li>
 *   <li>文件过大抛出 {@link IllegalArgumentException}（HTTP 413 等价）</li>
 *   <li>格式不支持抛出 {@link IllegalArgumentException}（HTTP 400 等价）</li>
 * </ul>
 * </p>
 */
public interface MediaStorageService {

    /**
     * 存储上传的媒体文件。
     *
     * @param userId 上传者用户 ID，用于按用户分目录
     * @param file   Spring MVC 包装的 multipart 文件
     * @param type   媒体类型（image/video/background），用于校验规则和存储路径
     * @return 上传结果（包含 URL 与元信息）
     * @throws IllegalArgumentException 文件过大或格式不支持时抛出
     * @throws IllegalStateException    IO 错误或读取图片元信息失败时抛出
     */
    UploadResult store(Long userId, MultipartFile file, String type);

    /**
     * 删除已存储的媒体文件。
     *
     * <p>用于用户删除照片墙、个人视频、背景图等场景。
     * 实现需保证：
     * <ul>
     *   <li>URL 不在受管范围（如不属于本服务前缀）时静默忽略，不抛异常</li>
     *   <li>文件不存在时静默忽略，不抛异常</li>
     *   <li>IO 异常时抛出 {@link IllegalStateException}（HTTP 500 等价）</li>
     * </ul>
     * </p>
     *
     * @param url 文件访问 URL（store 方法返回的 URL）
     */
    void delete(String url);

    /**
     * 上传结果，包含访问 URL 和文件元信息。
     *
     * <p>不可变值对象，由实现方构造并返回。</p>
     */
    class UploadResult {

        /** 访问 URL（相对路径，如 /uploads/1/202607/uuid.jpg） */
        private final String url;

        /** 图片/视频宽度（像素），无法识别时为 null */
        private final Integer width;

        /** 图片/视频高度（像素），无法识别时为 null */
        private final Integer height;

        /** MIME 类型，如 image/jpeg */
        private final String mime;

        /** 文件大小（字节） */
        private final Long size;

        /** 视频时长（毫秒），图片为 null */
        private final Integer durationMs;

        /**
         * 构造上传结果。
         *
         * @param url        访问 URL
         * @param width      宽度（像素，可空）
         * @param height     高度（像素，可空）
         * @param mime       MIME 类型
         * @param size       文件大小（字节）
         * @param durationMs 视频时长（毫秒，可空）
         */
        public UploadResult(String url, Integer width, Integer height,
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
