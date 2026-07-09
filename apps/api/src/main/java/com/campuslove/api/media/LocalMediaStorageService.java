package com.campuslove.api.media;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * 本地文件系统媒体存储实现。
 *
 * <p>存储路径：{@code {storageRoot}/{userId}/{yyyyMM}/{uuid}.{ext}}
 * 默认 {@code storageRoot = ./uploads}，可通过 {@code app.media.storage-root} 配置覆盖。</p>
 *
 * <p>访问 URL：{@code /uploads/{userId}/{yyyyMM}/{uuid}.{ext}}，
 * 由 WebConfig 中 {@code /uploads/**} 静态资源映射提供服务。</p>
 *
 * <p>校验规则：
 * <ul>
 *   <li>图片：jpg/jpeg/png/webp，大小 ≤ 10MB</li>
 *   <li>视频：mp4/mov，大小 ≤ 50MB</li>
 *   <li>背景图：与图片规则相同</li>
 *   <li>其他类型/格式 → 抛出 IllegalArgumentException（HTTP 400 等价）</li>
 *   <li>超过大小限制 → 抛出 {@link MediaSizeLimitExceededException}（HTTP 413 等价）</li>
 * </ul>
 * </p>
 *
 * <p>元信息读取：
 * <ul>
 *   <li>图片：使用 {@link ImageIO} 读取宽高</li>
 *   <li>视频：本实现不解析视频元信息（不引入 FFmpeg），
 *       宽高/时长由前端记录后通过参数传给控制器</li>
 * </ul>
 * </p>
 */
@Service
public class LocalMediaStorageService implements MediaStorageService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LocalMediaStorageService.class);

    /** 图片最大字节数：10 MB */
    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;

    /** 视频最大字节数：50 MB */
    private static final long MAX_VIDEO_BYTES = 50L * 1024 * 1024;

    /** 允许的图片扩展名（小写） */
    private static final Set<String> ALLOWED_IMAGE_EXT =
            Set.of("jpg", "jpeg", "png", "webp");

    /** 允许的视频扩展名（小写） */
    private static final Set<String> ALLOWED_VIDEO_EXT =
            Set.of("mp4", "mov");

    /** 月份目录格式（如 202607） */
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyyMM");

    /** URL 前缀（与 WebConfig 静态资源映射一致） */
    private static final String URL_PREFIX = "/uploads/";

    /** 本地存储根目录，默认 ./uploads，相对路径基于应用工作目录 */
    private final String storageRoot;

    /**
     * 构造函数，注入存储根目录配置。
     *
     * @param storageRoot 来自 {@code app.media.storage-root} 配置，默认 ./uploads
     */
    public LocalMediaStorageService(
            @Value("${app.media.storage-root:./uploads}") String storageRoot) {
        this.storageRoot = storageRoot;
    }

    @Override
    public UploadResult store(Long userId, MultipartFile file, String type) {
        // 入参校验：避免 NPE
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空");
        }
        String normalizedType = normalizeType(type);

        // 提取并校验扩展名
        String originalName = file.getOriginalFilename();
        String ext = extractExtension(originalName);
        String lowerExt = ext.toLowerCase(Locale.ROOT);

        // 根据类型校验大小与扩展名
        boolean isVideoType = "video".equals(normalizedType);
        long fileSize = file.getSize();
        if (isVideoType) {
            validateVideo(lowerExt, fileSize);
        } else {
            validateImage(lowerExt, fileSize);
        }

        // 计算存储路径与 URL
        String monthSegment = LocalDate.now().format(MONTH_FMT);
        String fileName = UUID.randomUUID().toString() + "." + lowerExt;
        Path relativePath = Paths.get(String.valueOf(userId), monthSegment, fileName);
        Path absolutePath = Paths.get(storageRoot).resolve(relativePath).toAbsolutePath();
        String url = URL_PREFIX + relativePath.toString().replace('\\', '/');

        // 创建目录（如不存在）
        try {
            Files.createDirectories(absolutePath.getParent());
        } catch (IOException ex) {
            LOGGER.error("创建存储目录失败: path={}", absolutePath.getParent(), ex);
            throw new IllegalStateException("创建存储目录失败: " + ex.getMessage(), ex);
        }

        // 写入文件
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, absolutePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            LOGGER.error("写入上传文件失败: path={}", absolutePath, ex);
            throw new IllegalStateException("写入上传文件失败: " + ex.getMessage(), ex);
        }

        // 读取图片元信息
        Integer width = null;
        Integer height = null;
        if (!isVideoType) {
            try {
                int[] dims = readImageDimensions(absolutePath, lowerExt);
                width = dims[0];
                height = dims[1];
            } catch (IOException ex) {
                LOGGER.warn("读取图片元信息失败 path={} ext={}: {}", absolutePath, lowerExt,
                        ex.getMessage());
            }
        }

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = isVideoType ? "video/mp4" : "image/jpeg";
        }

        LOGGER.info("媒体上传成功: userId={} type={} url={} size={} ", userId, normalizedType,
                url, fileSize);

        return new UploadResult(url, width, height, contentType, fileSize, null);
    }

    /**
     * 删除已存储的媒体文件。
     *
     * <p>仅删除受管路径（{@code /uploads/} 前缀）下的文件，
     * 防止通过构造 URL 删除应用其他文件。
     * 文件不存在时静默忽略，IO 异常抛出 {@link IllegalStateException}。</p>
     *
     * @param url 文件访问 URL
     */
    @Override
    public void delete(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        // 仅删除受管前缀下的文件，避免路径穿越
        if (!url.startsWith(URL_PREFIX)) {
            LOGGER.warn("跳过删除非受管 URL: {}", url);
            return;
        }
        String relative = url.substring(URL_PREFIX.length());
        Path target = Paths.get(storageRoot, relative).toAbsolutePath().normalize();
        Path root = Paths.get(storageRoot).toAbsolutePath().normalize();
        // 二次校验：normalize 后仍需在 storageRoot 之下，防止 ../ 穿越
        if (!target.startsWith(root)) {
            LOGGER.warn("跳过删除越界 URL: {}", url);
            return;
        }
        try {
            boolean deleted = Files.deleteIfExists(target);
            if (deleted) {
                LOGGER.info("媒体删除成功: url={}", url);
            } else {
                LOGGER.debug("媒体文件不存在，忽略删除: url={}", url);
            }
        } catch (IOException ex) {
            LOGGER.error("删除媒体文件失败: url={}", url, ex);
            throw new IllegalStateException("删除媒体文件失败: " + ex.getMessage(), ex);
        }
    }

    /**
     * 归一化媒体类型。
     * 背景图按图片规则校验。
     *
     * @param type 原始类型字符串
     * @return image / video
     * @throws IllegalArgumentException 不支持的类型
     */
    private String normalizeType(String type) {
        if (type == null) {
            throw new IllegalArgumentException("媒体类型 type 不能为空");
        }
        String lower = type.toLowerCase(Locale.ROOT);
        if ("image".equals(lower) || "background".equals(lower)) {
            return "image";
        }
        if ("video".equals(lower)) {
            return "video";
        }
        throw new IllegalArgumentException("不支持的媒体类型: " + type);
    }

    /**
     * 从原始文件名中提取扩展名（不含点号）。
     * 文件名无扩展名时抛出异常。
     *
     * @param originalName 原始文件名
     * @return 扩展名（不含点号，未做大小写归一化）
     */
    private String extractExtension(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            throw new IllegalArgumentException("文件名无效");
        }
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx < 0 || dotIdx == originalName.length() - 1) {
            throw new IllegalArgumentException("文件缺少扩展名: " + originalName);
        }
        return originalName.substring(dotIdx + 1);
    }

    /**
     * 校验图片扩展名与大小。
     *
     * @param lowerExt 扩展名（小写）
     * @param fileSize 文件大小（字节）
     */
    private void validateImage(String lowerExt, long fileSize) {
        if (!ALLOWED_IMAGE_EXT.contains(lowerExt)) {
            throw new IllegalArgumentException(
                    "不支持的图片格式: " + lowerExt + "，仅支持 jpg/jpeg/png/webp");
        }
        if (fileSize > MAX_IMAGE_BYTES) {
            throw new MediaSizeLimitExceededException(
                    "图片大小超过限制（10MB）: 当前 " + (fileSize / 1024 / 1024) + "MB");
        }
    }

    /**
     * 校验视频扩展名与大小。
     *
     * @param lowerExt 扩展名（小写）
     * @param fileSize 文件大小（字节）
     */
    private void validateVideo(String lowerExt, long fileSize) {
        if (!ALLOWED_VIDEO_EXT.contains(lowerExt)) {
            throw new IllegalArgumentException(
                    "不支持的视频格式: " + lowerExt + "，仅支持 mp4/mov");
        }
        if (fileSize > MAX_VIDEO_BYTES) {
            throw new MediaSizeLimitExceededException(
                    "视频大小超过限制（50MB）: 当前 " + (fileSize / 1024 / 1024) + "MB");
        }
    }

    /**
     * 使用 ImageIO 读取图片宽高。
     *
     * <p>不直接使用 {@code ImageIO.read()}，避免对大图占用过多内存；
     * 改用 {@link ImageReader} 流式读取元信息后立即释放。</p>
     *
     * @param path 图片绝对路径
     * @param ext  扩展名（小写，仅用于日志）
     * @return int[]{width, height}；若 ImageIO 无对应 reader，返回 {0, 0}
     * @throws IOException 文件读取失败
     */
    private int[] readImageDimensions(Path path, String ext) throws IOException {
        try (ImageInputStream in = ImageIO.createImageInputStream(path.toFile())) {
            if (in == null) {
                return new int[]{0, 0};
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                return new int[]{0, 0};
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in);
                int w = reader.getWidth(0);
                int h = reader.getHeight(0);
                return new int[]{w, h};
            } finally {
                reader.dispose();
            }
        }
    }
}
