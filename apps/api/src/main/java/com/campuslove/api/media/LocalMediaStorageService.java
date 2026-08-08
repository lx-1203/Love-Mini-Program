package com.campuslove.api.media;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.Resilience4jConfig;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
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
 * <p>访问 URL：{@code /api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}}，
 * 由 MediaAccessController 鉴权代理提供服务（图片登录用户可读，
 * 语音/视频/身份证仅本人或管理员；infra R2-00014）。</p>
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

    /** 音频最大字节数：8 MB（60s 语音 aac/mp3 通常 < 1.5MB，留足余量） */
    private static final long MAX_AUDIO_BYTES = 8L * 1024 * 1024;

    /** 允许的图片扩展名（小写） */
    private static final Set<String> ALLOWED_IMAGE_EXT =
            Set.of("jpg", "jpeg", "png", "webp");

    /** 允许的视频扩展名（小写） */
    private static final Set<String> ALLOWED_VIDEO_EXT =
            Set.of("mp4", "mov");

    /** 允许的音频扩展名（小写）—— 微信 RecorderManager aac/mp3，兼容 wav/m4a */
    private static final Set<String> ALLOWED_AUDIO_EXT =
            Set.of("aac", "mp3", "m4a", "wav");

    /**
     * 修复：允许的图片 MIME 类型白名单，防止上传伪装文件（如 .jpg 实为可执行文件）。
     * 与 ALLOWED_IMAGE_EXT 保持一致：jpg/jpeg/png/webp。
     */
    private static final Set<String> ALLOWED_IMAGE_MIME =
            Set.of("image/jpeg", "image/png", "image/webp");

    /**
     * 修复：允许的视频 MIME 类型白名单。
     * 包含 mp4 与 quicktime（mov 文件浏览器通常以 video/quicktime 上传），
     * 与 ALLOWED_VIDEO_EXT 保持一致。
     */
    private static final Set<String> ALLOWED_VIDEO_MIME =
            Set.of("video/mp4", "video/quicktime");

    /**
     * 允许的音频 MIME 类型白名单。
     * 与 ALLOWED_AUDIO_EXT 保持一致：aac/mp3/m4a/wav 及其常见别名。
     */
    private static final Set<String> ALLOWED_AUDIO_MIME =
            Set.of("audio/aac", "audio/mpeg", "audio/mp3",
                    "audio/mp4", "audio/x-m4a", "audio/x-aac",
                    "audio/wav", "audio/wave", "audio/x-wav");

    /** 月份目录格式（如 202607） */
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyyMM");

    /** URL 前缀（与 MediaAccessController 鉴权代理路由一致）
     *  infra R2-00014：原 /uploads/ 被 SecurityConfig denyAll，上传后 URL 不可访问；
     *  改为 /api/v1/media/ 使 URL 直接走鉴权代理（图片登录用户可读，语音/视频/身份证仅本人）。 */
    private static final String URL_PREFIX = "/api/v1/media/";

    /** 旧前缀（兼容历史存量 URL 的删除操作） */
    private static final String LEGACY_URL_PREFIX = "/uploads/";

    /**
     * Task 2.6.5：图片格式 magic bytes 白名单。
     *
     * <p>每种图片格式对应文件头部的固定字节序列（magic number），用于在 MIME
     * 与扩展名校验之外再做内容级校验，防止伪装文件攻击
     * （如恶意脚本重命名为 .jpg 上传）。</p>
     *
     * <p>已知的图片 magic bytes：</p>
     * <ul>
     *   <li>JPEG：{@code FF D8 FF}（3 字节）</li>
     *   <li>PNG：{@code 89 50 4E 47 0D 0A 1A 0A}（8 字节）</li>
     *   <li>WebP：{@code 52 49 46 46 ?? ?? ?? ?? 57 45 42 50}（RIFF + 4 字节大小 + WEBP）</li>
     * </ul>
     */
    private static final Map<String, byte[][]> IMAGE_MAGIC_BYTES = new LinkedHashMap<>();

    /**
     * Task 2.6.5：视频格式 magic bytes 白名单。
     *
     * <p>MP4 与 MOV 文件均使用 ISO BMFF 容器格式，文件头为：
     * {@code ?? ?? ?? ?? 66 74 79 70}（4 字节 size + "ftyp" box type）。</p>
     */
    private static final byte[][] VIDEO_MAGIC_BYTES = new byte[][]{
            // ftyp box 标识，位于文件偏移 4-7
            new byte[]{0x66, 0x74, 0x79, 0x70} // "ftyp"
    };

    /**
     * Phase Feedback5 P2.6：音频格式 magic bytes 白名单。
     *
     * <p>每种音频格式对应文件头部的固定字节序列：</p>
     * <ul>
     *   <li>aac：ADTS 帧同步字 {@code FF F1}（微信 RecorderManager 默认输出）</li>
     *   <li>mp3：ID3v2 标签头 {@code 49 44 33}（"ID3"，微信 mp3 输出均带标签）</li>
     *   <li>m4a：MP4 容器 ftyp box（偏移 4-7）</li>
     *   <li>wav：RIFF + WAVE（偏移 0 与 8）</li>
     * </ul>
     */
    private static final Map<String, byte[][]> AUDIO_MAGIC_BYTES = new LinkedHashMap<>();

    /** 音频格式 magic bytes 的起始偏移（与 AUDIO_MAGIC_BYTES 的序列一一对应） */
    private static final Map<String, int[]> AUDIO_MAGIC_OFFSETS = new LinkedHashMap<>();

    static {
        // JPEG: FF D8 FF
        IMAGE_MAGIC_BYTES.put("jpg", new byte[][]{new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}});
        IMAGE_MAGIC_BYTES.put("jpeg", new byte[][]{new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}});
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        IMAGE_MAGIC_BYTES.put("png", new byte[][]{new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}});
        // WebP: RIFF....WEBP —— 校验前 4 字节 RIFF 与偏移 8-11 的 WEBP
        IMAGE_MAGIC_BYTES.put("webp", new byte[][]{
                new byte[]{0x52, 0x49, 0x46, 0x46}, // "RIFF"
                new byte[]{0x57, 0x45, 0x42, 0x50}  // "WEBP" at offset 8
        });
        // AAC: ADTS 帧同步字 FF F1（前 2 字节，偏移 0）
        AUDIO_MAGIC_BYTES.put("aac", new byte[][]{
                new byte[]{(byte) 0xFF, (byte) 0xF1}
        });
        AUDIO_MAGIC_OFFSETS.put("aac", new int[]{0});
        // MP3: ID3v2 标签头（偏移 0）；无标签的裸 MPEG 帧流不在白名单内（微信输出均带 ID3）
        AUDIO_MAGIC_BYTES.put("mp3", new byte[][]{
                new byte[]{0x49, 0x44, 0x33} // "ID3"
        });
        AUDIO_MAGIC_OFFSETS.put("mp3", new int[]{0});
        // M4A: MP4 容器 ftyp box（偏移 4）
        AUDIO_MAGIC_BYTES.put("m4a", new byte[][]{
                new byte[]{0x66, 0x74, 0x79, 0x70} // "ftyp"
        });
        AUDIO_MAGIC_OFFSETS.put("m4a", new int[]{4});
        // WAV: RIFF @ 0 + WAVE @ 8
        AUDIO_MAGIC_BYTES.put("wav", new byte[][]{
                new byte[]{0x52, 0x49, 0x46, 0x46}, // "RIFF"
                new byte[]{0x57, 0x41, 0x56, 0x45}  // "WAVE"
        });
        AUDIO_MAGIC_OFFSETS.put("wav", new int[]{0, 8});
    }

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
    @CircuitBreaker(name = Resilience4jConfig.OBJECT_STORAGE_BACKEND,
            fallbackMethod = "storeFallback")
    @Retry(name = Resilience4jConfig.OBJECT_STORAGE_BACKEND)
    public UploadResult store(Long userId, MultipartFile file, String type) {
        // 入参校验：避免 NPE
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(ErrorMessages.UPLOAD_FILE_REQUIRED);
        }
        String normalizedType = normalizeType(type);

        // 修复：对原始文件名进行安全清洗，移除路径分隔符与 ../ 等危险字符，
        // 防止路径遍历攻击。原始文件名仅用于提取扩展名，不直接用于存储路径。
        String originalName = sanitizeFileName(file.getOriginalFilename());
        String ext = extractExtension(originalName);
        String lowerExt = ext.toLowerCase(Locale.ROOT);

        // 根据类型校验大小与扩展名（先做扩展名校验，再做 MIME 校验，
        // 保证不支持的扩展名优先抛出"不支持的格式"信息，便于调用方定位问题）
        boolean isVideoType = "video".equals(normalizedType);
        boolean isAudioType = "audio".equals(normalizedType);
        long fileSize = file.getSize();
        if (isVideoType) {
            validateVideo(lowerExt, fileSize);
        } else if (isAudioType) {
            validateAudio(lowerExt, fileSize);
        } else {
            validateImage(lowerExt, fileSize);
        }

        // 修复：校验 ContentType MIME 类型白名单，防止上传伪装文件
        // （扩展名校验通过后再校验 MIME，避免不支持的扩展名优先抛出 MIME 异常信息）
        String contentType = file.getContentType();
        validateMimeType(contentType, normalizedType);

        // Task 2.6.5：校验文件 magic bytes，防止伪装文件攻击
        // （仅靠扩展名 + MIME 仍可被绕过，magic bytes 是文件内容级校验）
        validateMagicBytes(file, lowerExt, normalizedType);

        // 计算存储路径与 URL
        String monthSegment = LocalDate.now(TimeZones.BUSINESS).format(MONTH_FMT);
        // 存储文件名使用 UUID，不依赖原始文件名，进一步消除路径遍历风险
        String fileName = UUID.randomUUID().toString() + "." + lowerExt;
        Path relativePath = Paths.get(String.valueOf(userId), monthSegment, fileName);
        Path absolutePath = Paths.get(storageRoot).resolve(relativePath).toAbsolutePath().normalize();
        // 修复：二次校验最终绝对路径仍在 storageRoot 之下，防止路径穿越
        Path root = Paths.get(storageRoot).toAbsolutePath().normalize();
        if (!absolutePath.startsWith(root)) {
            LOGGER.error("计算存储路径越界，拒绝上传: absolutePath={}, root={}", absolutePath, root);
            throw new IllegalStateException(ErrorMessages.UPLOAD_PATH_INVALID);
        }
        String url = URL_PREFIX + relativePath.toString().replace('\\', '/');

        // 创建目录（如不存在）
        try {
            Files.createDirectories(absolutePath.getParent());
        } catch (IOException ex) {
            LOGGER.error("创建存储目录失败: path={}", absolutePath.getParent(), ex);
            throw new IllegalStateException(ErrorMessages.MKDIR_FAILED_PREFIX + ex.getMessage(), ex);
        }

        // 写入文件
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, absolutePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            LOGGER.error("写入上传文件失败: path={}", absolutePath, ex);
            throw new IllegalStateException(ErrorMessages.WRITE_FILE_FAILED_PREFIX + ex.getMessage(), ex);
        }

        // 读取图片元信息（音频/视频无宽高）
        Integer width = null;
        Integer height = null;
        if (!isVideoType && !isAudioType) {
            try {
                int[] dims = readImageDimensions(absolutePath, lowerExt);
                width = dims[0];
                height = dims[1];
            } catch (IOException ex) {
                LOGGER.warn("读取图片元信息失败 path={} ext={}: {}", absolutePath, lowerExt,
                        ex.getMessage());
            }
        }

        String finalContentType = contentType;
        if (finalContentType == null || finalContentType.isBlank()) {
            if (isVideoType) {
                finalContentType = "video/mp4";
            } else if (isAudioType) {
                finalContentType = "audio/mp4";
            } else {
                finalContentType = "image/jpeg";
            }
        }

        LOGGER.info("媒体上传成功: userId={} type={} url={} size={} ", userId, normalizedType,
                url, fileSize);

        return new UploadResult(url, width, height, finalContentType, fileSize, null);
    }

    /**
     * Task 2.3.3：{@link #store(Long, MultipartFile, String)} 的 fallback 方法。
     *
     * <p>触发场景：本地文件存储连续 IO 失败（如磁盘满 / 权限错误）触发熔断，
     * 或重试 3 次后仍失败。降级策略：抛出 IllegalStateException 由
     * {@link com.campuslove.api.config.GlobalExceptionHandler} 转换为 HTTP 500 响应，
     * 客户端展示"上传失败，请稍后重试"提示。</p>
     *
     * <p>注意：本 fallback 不返回 null，因为 UploadResult 为 final record，
     * 上传失败应明确告知调用方，而非静默返回 null 导致后续 NPE。</p>
     *
     * @param userId 用户 ID
     * @param file   上传文件
     * @param type   媒体类型
     * @param ex     触发 fallback 的异常
     * @return 不返回，始终抛 IllegalStateException
     */
    @SuppressWarnings("unused")
    private UploadResult storeFallback(Long userId, MultipartFile file, String type, Throwable ex) {
        LOGGER.error("媒体上传降级: userId={}, type={}, errorType={}, message={}",
                userId, type, ex.getClass().getSimpleName(), ex.getMessage());
        throw new IllegalStateException(
                "媒体存储服务暂时不可用，请稍后重试: " + ex.getMessage(), ex);
    }

    /**
     * 删除已存储的媒体文件。
     *
     * <p>仅删除受管路径（{@code /api/v1/media/} 前缀，兼容历史 {@code /uploads/}）下的文件，
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
        // 仅删除受管前缀下的文件，避免路径穿越；兼容新旧两种前缀
        String relative = null;
        if (url.startsWith(URL_PREFIX)) {
            relative = url.substring(URL_PREFIX.length());
        } else if (url.startsWith(LEGACY_URL_PREFIX)) {
            relative = url.substring(LEGACY_URL_PREFIX.length());
        }
        if (relative == null) {
            LOGGER.warn("跳过删除非受管 URL: {}", url);
            return;
        }
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
            throw new IllegalStateException(ErrorMessages.DELETE_FILE_FAILED_PREFIX + ex.getMessage(), ex);
        }
    }

    /**
     * 归一化媒体类型。
     * 背景图按图片规则校验。
     *
     * @param type 原始类型字符串
     * @return image / video / audio
     * @throws IllegalArgumentException 不支持的类型
     */
    private String normalizeType(String type) {
        if (type == null) {
            throw new IllegalArgumentException(ErrorMessages.MEDIA_TYPE_REQUIRED);
        }
        String lower = type.toLowerCase(Locale.ROOT);
        if ("image".equals(lower) || "background".equals(lower)) {
            return "image";
        }
        if ("video".equals(lower)) {
            return "video";
        }
        if ("audio".equals(lower) || "voice".equals(lower)) {
            return "audio";
        }
        throw new IllegalArgumentException(ErrorMessages.UNSUPPORTED_MEDIA_TYPE_PREFIX + type);
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
            throw new IllegalArgumentException(ErrorMessages.FILE_NAME_INVALID);
        }
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx < 0 || dotIdx == originalName.length() - 1) {
            throw new IllegalArgumentException(ErrorMessages.FILE_MISSING_EXTENSION_PREFIX + originalName);
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
                    ErrorMessages.IMAGE_SIZE_EXCEED_10MB_PREFIX + (fileSize / 1024 / 1024) + "MB");
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
     * Phase Feedback5 P2.6：校验音频扩展名与大小。
     *
     * <p>60s 语音状态上传（最长 60 秒 aac/mp3）。</p>
     *
     * @param lowerExt 扩展名（小写）
     * @param fileSize 文件大小（字节）
     */
    private void validateAudio(String lowerExt, long fileSize) {
        if (!ALLOWED_AUDIO_EXT.contains(lowerExt)) {
            throw new IllegalArgumentException(
                    "不支持的音频格式: " + lowerExt + "，仅支持 aac/mp3/m4a/wav");
        }
        if (fileSize > MAX_AUDIO_BYTES) {
            throw new MediaSizeLimitExceededException(
                    "音频大小超过限制（8MB）: 当前 " + (fileSize / 1024 / 1024) + "MB");
        }
    }

    /**
     * 修复：校验上传文件 ContentType MIME 类型是否在白名单中。
     * 防止攻击者通过修改扩展名绕过校验上传恶意文件（如 .jpg 实为可执行文件）。
     *
     * <p>MIME 类型与扩展名双校验策略：
     * <ul>
     *   <li>浏览器根据文件内容嗅探 MIME，比扩展名更可信</li>
     *   <li>同时校验扩展名与 MIME，单一绕过仍会被另一道防线拦截</li>
     *   <li>允许 null MIME（部分客户端不传），仅扩展名校验生效（向后兼容）</li>
     * </ul>
     * </p>
     *
     * @param contentType    文件 ContentType（可能为 null）
     * @param normalizedType 归一化后的媒体类型（image/video/audio）
     */
    private void validateMimeType(String contentType, String normalizedType) {
        // ContentType 为 null 时跳过 MIME 校验，仅依赖扩展名校验（向后兼容）
        if (contentType == null || contentType.isBlank()) {
            LOGGER.warn("上传文件未提供 ContentType，仅依赖扩展名校验");
            return;
        }
        // 取分号前的主 MIME 类型（如 "image/jpeg; charset=utf-8" → "image/jpeg"）
        String mainMime = contentType.split(";")[0].trim().toLowerCase(Locale.ROOT);
        Set<String> allowed;
        if ("video".equals(normalizedType)) {
            allowed = ALLOWED_VIDEO_MIME;
        } else if ("audio".equals(normalizedType)) {
            allowed = ALLOWED_AUDIO_MIME;
        } else {
            allowed = ALLOWED_IMAGE_MIME;
        }
        if (!allowed.contains(mainMime)) {
            throw new IllegalArgumentException(
                    "不支持的文件 MIME 类型: " + mainMime
                    + "，仅支持 " + allowed
                    + "（类型=" + normalizedType + "）");
        }
    }

    /**
     * Task 2.6.5：校验文件 magic bytes（文件头魔数）。
     *
     * <p>读取文件头部前 12 字节，按扩展名查找期望的 magic bytes 序列，
     * 逐字节比对确保文件内容与扩展名声明一致。三道防线（扩展名 + MIME + magic bytes）
     * 同时绕过才可上传恶意文件，显著提升上传安全性。</p>
     *
     * <p>校验规则：</p>
     * <ul>
     *   <li>读取文件前 {@code MAX_HEADER_BYTES=12} 字节（覆盖所有支持格式的 magic 长度）</li>
     *   <li>按扩展名从 {@link #IMAGE_MAGIC_BYTES} 或 {@link #VIDEO_MAGIC_BYTES} 取期望 magic 序列</li>
     *   <li>对每个 magic 序列，按其偏移量逐一比对字节</li>
     *   <li>任一字节不匹配 → 抛出 IllegalArgumentException（HTTP 400 等价）</li>
     *   <li>读取失败 → 抛出 IllegalStateException（HTTP 500 等价）</li>
     * </ul>
     *
     * <p>WebP 特殊处理：magic bytes 由两组序列组成（RIFF @ 0, WEBP @ 8），
     * 两组均需匹配才视为合法 WebP 文件。</p>
     *
     * @param file           上传文件
     * @param lowerExt       扩展名（小写）
     * @param normalizedType 归一化后的媒体类型（image/video/audio）
     */
    private void validateMagicBytes(MultipartFile file, String lowerExt, String normalizedType) {
        // 读取文件头部字节（最多 12 字节，覆盖 WebP "WEBP" @ offset 8 + 4 字节长度）
        final int maxHeaderBytes = 12;
        byte[] header;
        try (InputStream in = file.getInputStream()) {
            header = in.readNBytes(maxHeaderBytes);
        } catch (IOException ex) {
            LOGGER.error("读取文件 magic bytes 失败: name={}", file.getOriginalFilename(), ex);
            throw new IllegalStateException(ErrorMessages.READ_FILE_FAILED_PREFIX + ex.getMessage(), ex);
        }

        if (header.length == 0) {
            throw new IllegalArgumentException(ErrorMessages.FILE_CONTENT_EMPTY);
        }

        // 按扩展名与类型选择期望的 magic bytes
        byte[][] expectedMagic;
        int[] offsets;
        if ("video".equals(normalizedType)) {
            // MP4/MOV 共用 ftyp box 标识
            expectedMagic = VIDEO_MAGIC_BYTES;
            offsets = new int[]{4};
        } else if ("audio".equals(normalizedType)) {
            // 音频按扩展名取序列与偏移（见 AUDIO_MAGIC_BYTES / AUDIO_MAGIC_OFFSETS）
            expectedMagic = AUDIO_MAGIC_BYTES.get(lowerExt);
            offsets = AUDIO_MAGIC_OFFSETS.getOrDefault(lowerExt, new int[]{0});
        } else {
            expectedMagic = IMAGE_MAGIC_BYTES.get(lowerExt);
            offsets = new int[]{0, 8};
        }

        if (expectedMagic == null || expectedMagic.length == 0) {
            // 无 magic bytes 配置的扩展名跳过内容校验（理论上不会发生，因为扩展名已校验）
            LOGGER.debug("扩展名 {} 无 magic bytes 配置，跳过内容校验", lowerExt);
            return;
        }

        // 逐序列校验（每个序列可指定不同偏移量，按顺序匹配）
        // 偏移量按扩展名确定：
        //   - 图片 jpg/png：序列 0 @ 偏移 0
        //   - WebP：序列 0 (RIFF) @ 偏移 0，序列 1 (WEBP) @ 偏移 8
        //   - 视频 mp4/mov：序列 0 (ftyp) @ 偏移 4（前 4 字节为 box size，动态值不校验）
        //   - 音频 aac/mp3：序列 0 @ 偏移 0；m4a：偏移 4；wav：RIFF @ 0 + WAVE @ 8
        for (int i = 0; i < expectedMagic.length; i++) {
            byte[] magic = expectedMagic[i];
            int offset = i < offsets.length ? offsets[i] : 0;
            if (!matchesMagicBytes(header, magic, offset)) {
                LOGGER.warn("文件 magic bytes 校验失败: ext={}, type={}, expected={}, actual={}, offset={}",
                        lowerExt, normalizedType, bytesToHex(magic), bytesToHex(header), offset);
                throw new IllegalArgumentException(
                        "文件内容与扩展名声明不一致（magic bytes 校验失败），疑似伪装文件");
            }
        }
    }

    /**
     * 比对 header 中指定偏移量开始的字节是否与 magic 序列完全匹配。
     *
     * @param header 文件头字节数组
     * @param magic  期望的 magic bytes
     * @param offset 起始偏移量
     * @return true 表示完全匹配
     */
    private boolean matchesMagicBytes(byte[] header, byte[] magic, int offset) {
        if (offset + magic.length > header.length) {
            return false;
        }
        for (int i = 0; i < magic.length; i++) {
            if (header[offset + i] != magic[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * 将字节数组转换为十六进制字符串，便于日志输出。
     *
     * @param bytes 字节数组
     * @return 十六进制字符串（如 "FF D8 FF"）
     */
    private String bytesToHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        StringBuilder sb = new StringBuilder(bytes.length * 3);
        for (int i = 0; i < bytes.length; i++) {
            if (i > 0) {
                sb.append(' ');
            }
            sb.append(String.format("%02X", bytes[i] & 0xFF));
        }
        return sb.toString();
    }

    /**
     * 修复：对原始文件名进行安全清洗，移除路径分隔符、.. 与控制字符。
     *
     * <p>清洗规则：
     * <ul>
     *   <li>移除路径分隔符 / 与 \，防止伪造路径</li>
     *   <li>移除 .. 序列，防止路径遍历</li>
     *   <li>移除控制字符（0x00-0x1F 与 0x7F）</li>
     *   <li>移除前导/后导空白与点号</li>
     *   <li>null 或空字符串返回 "file"（占位符）</li>
     * </ul>
     * </p>
     *
     * <p>注：清洗后的文件名仅用于提取扩展名，最终存储文件名为 UUID，
     * 双重保障消除路径遍历风险。</p>
     *
     * @param rawName 原始文件名（可能为 null）
     * @return 清洗后的安全文件名
     */
    private String sanitizeFileName(String rawName) {
        if (rawName == null || rawName.isBlank()) {
            return "file";
        }
        // 移除路径分隔符与 ..
        String cleaned = rawName.replace("/", "").replace("\\", "")
                .replace("..", "").replace("\u0000", "");
        // 移除控制字符
        cleaned = cleaned.replaceAll("[\\x00-\\x1F\\x7F]", "");
        // 移除前导/后导空白与点号
        cleaned = cleaned.trim().replaceAll("^[.\\s]+", "").replaceAll("[.\\s]+$", "");
        return cleaned.isEmpty() ? "file" : cleaned;
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
