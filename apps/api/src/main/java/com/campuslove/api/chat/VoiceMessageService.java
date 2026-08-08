package com.campuslove.api.chat;

import com.campuslove.api.common.TimeZones;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * 聊天语音消息服务。
 *
 * <p>职责：封装语音文件的存储、删除、路径生成等业务逻辑，
 * 供 {@link VoiceMessageController} 调用。复用 LocalMediaStorageService 的存储根目录
 * （由 {@code file-storage.base-dir} 配置），保证语音文件与其他媒体统一管理。</p>
 *
 * <p>存储路径：{@code uploads/{userId}/{yyyyMM}/{uuid}.{ext}}，
 * 与 LocalMediaStorageService 风格一致（按用户/月份分目录）。
 * Task 9：已移除 {@code voice} 子目录，统一为 {@code uploads/{userId}/{yyyyMM}/{uuid}.{ext}}
 * 格式，符合项目约定的路径规范。</p>
 *
 * <p>校验规则：
 * <ul>
 *   <li>文件非空、大小 ≤ 2MB</li>
 *   <li>MIME 类型白名单：audio/mpeg、audio/mp3</li>
 *   <li>扩展名白名单：mp3、aac、m4a、wav、amr</li>
 *   <li>时长 ≤ 60 秒</li>
 * </ul>
 * </p>
 *
 * <p>错误处理：参数非法抛出 {@link IllegalArgumentException}（由 GlobalExceptionHandler 转 400），
 * IO 异常抛出 {@link RuntimeException}（由 GlobalExceptionHandler 转 500）。</p>
 *
 * <p>mp-weixin 兼容：前端通过 uni.uploadFile 上传 multipart/form-data，
 * 服务端使用 {@link MultipartFile} 接收，与微信小程序兼容。</p>
 */
@Profile("real")
@Service
public class VoiceMessageService {

    private static final Logger log = LoggerFactory.getLogger(VoiceMessageService.class);

    /** 语音消息最大时长（秒）：60 秒，与前端录音配置一致 */
    private static final int MAX_DURATION_SECONDS = 60;

    /** 语音消息最大文件大小：2MB，与微信小程序限制一致 */
    private static final long MAX_FILE_SIZE = 2L * 1024 * 1024;

    /** 允许的语音文件扩展名（小写） */
    private static final Set<String> ALLOWED_VOICE_EXT =
            Set.of("mp3", "aac", "m4a", "wav", "amr");

    /** 允许的语音 MIME 类型白名单 */
    private static final Set<String> ALLOWED_VOICE_MIME =
            Set.of("audio/mpeg", "audio/aac", "audio/x-m4a", "audio/mp3",
                    "audio/wav", "audio/x-wav", "audio/amr");

    /** 月份目录格式（如 202607） */
    private static final DateTimeFormatter MONTH_FMT =
            DateTimeFormatter.ofPattern("yyyyMM");

    /**
     * URL 前缀，与 WebConfig 静态资源映射一致。
     *
     * <p>Task 9：原为硬编码常量 {@code "/uploads/"}，已改为配置注入。
     * 默认 {@code /uploads/}，可通过 {@code FILE_STORAGE_PREFIX} 环境变量覆盖。</p>
     */
    @Value("${file-storage.upload-prefix:/uploads/}")
    private String urlPrefix;

    /**
     * 本地存储根目录。
     *
     * <p>Task 9：原为 {@code app.media.storage-root}，已切换至 {@code file-storage.base-dir}
     * 命名空间，与 urlPrefix 同源。默认 {@code uploads}，
     * 可通过 {@code FILE_STORAGE_BASE_DIR} 环境变量覆盖。</p>
     */
    @Value("${file-storage.base-dir:uploads}")
    private String storageRoot;

    /**
     * 存储语音文件。
     *
     * <p>校验通过后保存到 {@code {storageRoot}/{userId}/voice/{yyyyMM}/{uuid}.{ext}}，
     * 返回相对 URL 供前端访问与发送。</p>
     *
     * @param userId   当前用户 ID（从 JWT 上下文获取）
     * @param file     语音文件（multipart）
     * @param duration 语音时长（秒），由前端录音时记录
     * @return 上传响应（含 URL / 时长 / 文件大小）
     * @throws IllegalArgumentException 文件为空/过大/格式不支持/时长超限时抛出
     * @throws RuntimeException         IO 异常或其他未知异常时抛出
     */
    // infra R2-00210: store/delete 为纯文件 IO，不涉及数据库，移除无意义事务开销
    public VoiceUploadResult store(Long userId, MultipartFile file, Integer duration) {
        // 入参校验：userId
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        // 文件非空校验
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("语音文件不能为空");
        }
        // 文件大小校验
        long fileSize = file.getSize();
        if (fileSize > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "语音文件超过 " + (MAX_FILE_SIZE / 1024 / 1024) + "MB 限制");
        }
        // 时长校验
        if (duration != null && duration > MAX_DURATION_SECONDS) {
            throw new IllegalArgumentException(
                    "语音时长超过 " + MAX_DURATION_SECONDS + " 秒限制");
        }
        // 扩展名校验
        String originalFilename = file.getOriginalFilename();
        String ext = extractExtension(originalFilename);
        if (!ALLOWED_VOICE_EXT.contains(ext)) {
            throw new IllegalArgumentException(
                    "不支持的语音格式：" + ext + "，仅支持 " + ALLOWED_VOICE_EXT);
        }
        // MIME 类型校验（客户端未提供时跳过）
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()
                && !ALLOWED_VOICE_MIME.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("不支持的语音 MIME 类型：" + contentType);
        }

        try {
            // 构建存储路径：{storageRoot}/{userId}/{yyyyMM}/{uuid}.{ext}
            // Task 9：移除 voice 子目录，统一为 uploads/{userId}/{yyyyMM}/{uuid}.{ext} 格式
            String yyyyMM = LocalDate.now(TimeZones.BUSINESS).format(MONTH_FMT);
            String fileName = UUID.randomUUID().toString().replace("-", "") + "." + ext;
            Path targetDir = Paths.get(storageRoot,
                    String.valueOf(userId), yyyyMM);
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(fileName).toAbsolutePath().normalize();

            // 二次校验：防止路径遍历
            Path root = Paths.get(storageRoot).toAbsolutePath().normalize();
            if (!targetPath.startsWith(root)) {
                log.error("语音存储路径越界，拒绝写入: target={}, root={}", targetPath, root);
                throw new IllegalStateException("语音存储路径异常，已拒绝");
            }

            // 写入文件
            try (var in = file.getInputStream()) {
                Files.copy(in, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            // 构造访问 URL：{urlPrefix}{userId}/{yyyyMM}/{fileName}
            // Task 9：URL 前缀由 file-storage.upload-prefix 注入，原为硬编码 "/uploads/"
            String url = urlPrefix + userId + "/" + yyyyMM + "/" + fileName;
            log.info("语音上传成功：userId={}, url={}, size={}", userId, url, fileSize);
            return new VoiceUploadResult(
                    url,
                    duration != null ? duration : 0,
                    fileSize
            );
        } catch (IOException e) {
            log.error("语音上传 IO 失败：userId={}", userId, e);
            throw new RuntimeException("语音上传失败，请稍后重试", e);
        } catch (IllegalStateException e) {
            // 媒体存储服务（LocalMediaStorageService）抛出的 IllegalStateException（路径越界/写入失败等）
            log.error("语音上传失败：userId={}", userId, e);
            throw new RuntimeException("语音上传失败，请稍后重试", e);
        }
    }

    /**
     * 删除语音文件。
     *
     * <p>仅删除受管路径（{@code /uploads/} 前缀）下的文件，防止路径遍历。
     * 文件不存在时静默忽略，IO 异常抛出 {@link RuntimeException}。</p>
     *
     * <p>infra R2-00011 修复：增加归属校验——URL 格式为
     * {@code {urlPrefix}{ownerUserId}/{yyyyMM}/{fileName}}，仅允许删除
     * ownerUserId 与当前操作者一致的文件，杜绝跨用户删除他人语音（IDOR）。</p>
     *
     * @param ownerUserId 文件归属用户 ID（来自 JWT 上下文的当前用户）
     * @param url         语音文件 URL
     * @throws RuntimeException IO 异常时抛出
     */
    // infra R2-00210: 同上，删除为纯文件 IO，移除 @Transactional
    public void delete(Long ownerUserId, String url) {
        try {
            if (url == null || url.isBlank()) {
                return;
            }
            // Task 9：使用注入的 urlPrefix 判定受管路径，原为硬编码 URL_PREFIX 常量
            if (!url.startsWith(urlPrefix)) {
                log.warn("跳过删除非受管语音 URL: {}", url);
                return;
            }
            String relative = url.substring(urlPrefix.length());
            // security_review 修复（R2-MEDIUM-01）：归属校验必须基于 normalize 之后的
            // 真实目标路径首段。原实现对原始 URL 首段校验，攻击者可构造
            // {prefix}{自己}/{x}/../../{受害者}/{yyyyMM}/{file}.mp3 使首段校验通过、
            // 实际删除却指向受害者文件（IDOR + 路径穿越）。先 normalize 再校验，
            // 并对含 ".." 段的输入直接拒绝（纵深防御，不依赖 normalize 语义）。
            if (relative.contains("..")) {
                log.warn("拒绝删除含路径穿越段的语音 URL: {}", url);
                return;
            }
            Path target = Paths.get(storageRoot, relative).toAbsolutePath().normalize();
            Path root = Paths.get(storageRoot).toAbsolutePath().normalize();
            if (!target.startsWith(root)) {
                log.warn("跳过删除越界语音 URL: {}", url);
                return;
            }
            // 归属校验：以 normalize 后路径的相对首段为准
            Path relPath = root.relativize(target);
            String ownerIdSegment = relPath.getNameCount() > 0
                    ? relPath.getName(0).toString() : "";
            if (ownerUserId == null || !String.valueOf(ownerUserId).equals(ownerIdSegment)) {
                log.warn("拒绝删除他人语音文件: ownerIdSegment={}, currentUserId={}",
                        ownerIdSegment, ownerUserId);
                throw new IllegalArgumentException("无权删除该语音文件");
            }
            boolean deleted = Files.deleteIfExists(target);
            if (deleted) {
                log.info("语音删除成功: url={}", url);
            } else {
                log.debug("语音文件不存在，忽略删除: url={}", url);
            }
        } catch (IOException e) {
            log.error("删除语音文件失败: url={}", url, e);
            throw new RuntimeException("删除语音文件失败，请稍后重试", e);
        } catch (IllegalStateException e) {
            // 媒体存储服务抛出的非法状态异常（路径越界等）
            log.error("删除语音文件失败: url={}", url, e);
            throw new RuntimeException("删除语音文件失败，请稍后重试", e);
        }
    }

    /**
     * 从文件名提取扩展名（小写，无点）。
     *
     * @param filename 文件名
     * @return 扩展名（小写），无扩展名返回空字符串
     */
    private String extractExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return "";
        }
        int dotIdx = filename.lastIndexOf('.');
        if (dotIdx < 0 || dotIdx == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIdx + 1).toLowerCase(Locale.ROOT);
    }

    /**
     * 语音上传响应。
     *
     * @param url      语音文件 URL
     * @param duration 语音时长（秒）
     * @param size     文件大小（字节）
     */
    public record VoiceUploadResult(
            String url,
            Integer duration,
            Long size
    ) {
    }
}
