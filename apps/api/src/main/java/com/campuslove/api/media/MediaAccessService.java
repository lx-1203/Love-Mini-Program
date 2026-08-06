package com.campuslove.api.media;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Task 0.3.2：媒体鉴权代理服务。
 *
 * <p>核心职责：
 * <ol>
 *   <li>鉴权：按当前 JWT 中的 userId 校验文件归属，仅文件所有者或管理员可访问；
 *       否则抛出 {@link AccessDeniedException}（由 GlobalExceptionHandler 转 403）。</li>
 *   <li>路径穿越（Path Traversal）防护：校验 subPath 不含 {@code ..}、绝对路径、
 *       反斜杠等危险字符；并对最终绝对路径做 {@code startsWith(storageRoot)} 二次校验。</li>
 *   <li>读取文件并返回 {@link MediaFile}（包含 {@link Resource} 与 {@link MediaType}）。</li>
 * </ol>
 * </p>
 *
 * <p>路径规则：
 * <ul>
 *   <li>请求 URL：{@code GET /api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}}</li>
 *   <li>磁盘路径：{@code {storageRoot}/{userId}/{yyyyMM}/{uuid}.{ext}}</li>
 *   <li>subPath 即 {@code {yyyyMM}/{uuid}.{ext}}，由 Controller 从 URI 提取后传入</li>
 * </ul>
 * </p>
 *
 * <p>与 {@link LocalMediaStorageService} 共享 {@code app.media.storage-root} 配置，
 * 确保上传与读取使用同一根目录。</p>
 */
@Service
public class MediaAccessService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MediaAccessService.class);

    /** 管理员角色标识，与 JwtAuthenticationFilter 注入的 ROLE_ADMIN 一致 */
    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    /** 媒体存储根目录，与 LocalMediaStorageService 共享配置 */
    private final String storageRoot;

    /**
     * 构造函数，注入存储根目录配置。
     *
     * @param storageRoot 来自 {@code app.media.storage-root} 配置，默认 {@code ./uploads}
     */
    public MediaAccessService(
            @Value("${app.media.storage-root:./uploads}") String storageRoot) {
        this.storageRoot = storageRoot;
    }

    /**
     * 加载并返回指定用户的媒体文件（已通过鉴权与路径安全校验）。
     *
     * <p>处理流程：
     * <ol>
     *   <li>从 {@link Authentication} 提取当前 userId 与是否 ADMIN</li>
     *   <li>分级鉴权（infra R2-00013）：IMAGE（头像/帖子图/活动图）登录用户均可读；
     *       语音/视频/身份证仅本人或 ADMIN；否则 403</li>
     *   <li>路径穿越校验：subPath 不含 {@code ..}、{@code \}、绝对路径前缀</li>
     *   <li>构造磁盘绝对路径并 normalize，二次校验仍在 storageRoot 之下</li>
     *   <li>文件存在性校验，不存在则 404</li>
     *   <li>探测 MIME 类型，构造 {@link MediaFile} 返回</li>
     * </ol>
     * </p>
     *
     * @param targetUserId   路径变量中的目标用户 ID（文件归属者）
     * @param subPath        subPath（如 {@code 202607/uuid.jpg}），不含 userId
     * @param authentication 当前请求的认证主体（由 SecurityContext 注入）
     * @return 已通过校验的 {@link MediaFile}，包含可读取的 Resource 与 MediaType
     * @throws AccessDeniedException    当前用户无权访问该文件（非本人且非管理员，且非公开图片）
     * @throws ResponseStatusException  路径非法或文件不存在（400/404）
     */
    public MediaFile loadMedia(Long targetUserId, String subPath, Authentication authentication) {
        if (targetUserId == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "userId 不能为空");
        }
        // 分级鉴权：IMAGE 为社交公开资源（登录用户可读）；其余类型仅本人或管理员
        Long currentUserId = extractCurrentUserId(authentication);
        boolean isAdmin = hasAdminRole(authentication);
        if (currentUserId == null) {
            // 未认证（无 token 或 token 无效）
            throw new AccessDeniedException("未认证，拒绝访问媒体文件");
        }
        MediaCategory detectedType = probeMediaTypeByPath(subPath);
        boolean isOwner = targetUserId.equals(currentUserId);
        boolean imagePublicRead = detectedType == MediaCategory.IMAGE;
        if (!isOwner && !isAdmin && !imagePublicRead) {
            LOGGER.warn("媒体访问被拒绝: targetUserId={}, currentUserId={}, isAdmin={}, type={}",
                    targetUserId, currentUserId, isAdmin, detectedType);
            throw new AccessDeniedException("无权访问该用户的媒体文件");
        }

        // Path Traversal 防护：subPath 字符级校验
        validateSubPath(subPath);

        // 构造磁盘绝对路径并 normalize
        Path root = Paths.get(storageRoot).toAbsolutePath().normalize();
        Path target = root.resolve(Paths.get(targetUserId.toString(), subPath))
                .toAbsolutePath().normalize();

        // 二次校验：normalize 后仍在 storageRoot 之下（防御构造的边缘 case）
        if (!target.startsWith(root)) {
            LOGGER.error("媒体路径越界，拒绝访问: target={}, root={}", target, root);
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,
                    "路径越界，拒绝访问");
        }

        // 文件存在性校验
        if (!Files.exists(target) || !Files.isRegularFile(target)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,
                    "文件不存在");
        }

        MediaType mediaType = probeMediaType(target);
        LOGGER.debug("媒体访问授权通过: targetUserId={}, currentUserId={}, isAdmin={}, path={}",
                targetUserId, currentUserId, isAdmin, target);
        return new MediaFile(new FileSystemResource(target), mediaType);
    }

    /**
     * 从 Authentication 提取当前 userId。
     *
     * <p>支持 principal 为 Long/Number/String 三种类型，与
     * {@link com.campuslove.api.media.MediaUploadController#getCurrentUserId()} 保持一致。</p>
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
     * 判断当前用户是否为管理员（拥有 ROLE_ADMIN 权限）。
     *
     * @param authentication 当前认证主体
     * @return true 表示为管理员
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
     * 路径穿越（Path Traversal）字符级校验。
     *
     * <p>校验规则：
     * <ul>
     *   <li>非空且非空白</li>
     *   <li>不含 {@code ..}（连续两个点号，防止 {@code ../} 穿越）</li>
     *   <li>不含反斜杠 {@code \}（防止 Windows 路径分隔符绕过）</li>
     *   <li>不以 {@code /} 开头（防止绝对路径）</li>
     *   <li>不含控制字符与 NUL 字节</li>
     *   <li>不含分号 {@code ;}（防止某些文件系统特殊语义）</li>
     * </ul>
     * </p>
     *
     * <p>注：除字符级校验外，{@link #loadMedia} 还会在构造最终路径后做
     * {@code startsWith(root)} 二次校验，作为深度防御。</p>
     *
     * @param subPath 待校验的子路径
     * @throws ResponseStatusException 校验失败返回 400 Bad Request
     */
    private void validateSubPath(String subPath) {
        if (subPath == null || subPath.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "媒体路径不能为空");
        }
        // 拒绝 .. 序列（路径穿越）
        if (subPath.contains("..")) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "非法路径");
        }
        // 拒绝反斜杠（Windows 路径分隔符绕过）
        if (subPath.contains("\\")) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "非法路径");
        }
        // 拒绝绝对路径
        if (subPath.startsWith("/")) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "非法路径");
        }
        // 拒绝控制字符与 NUL
        if (subPath.indexOf('\u0000') >= 0
                || subPath.codePoints().anyMatch(c -> c < 0x20 || c == 0x7F)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "非法路径");
        }
        // 拒绝分号（防止某些文件系统/URL 解析器特殊语义）
        if (subPath.contains(";")) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "非法路径");
        }
    }

    /**
     * 探测文件 MIME 类型。
     *
     * <p>优先使用 {@link Files#probeContentType(Path)}（依赖操作系统），
     * 探测失败时按扩展名回退到常见图片/视频 MIME。</p>
     *
     * @param path 文件路径
     * @return 探测到的 MediaType，默认 {@link MediaType#APPLICATION_OCTET_STREAM}
     */
    private MediaType probeMediaType(Path path) {
        String probed = null;
        try {
            probed = Files.probeContentType(path);
        } catch (IOException ex) {
            LOGGER.warn("探测 MIME 类型失败 path={}: {}", path, ex.getMessage());
        }
        if (probed != null && !probed.isBlank()) {
            try {
                return MediaType.parseMediaType(probed);
            } catch (org.springframework.util.InvalidMimeTypeException ex) {
                LOGGER.warn("解析 MIME 失败 probed={}: {}", probed, ex.getMessage());
            }
        }
        // 扩展名回退
        String fileName = path.getFileName().toString();
        int dotIdx = fileName.lastIndexOf('.');
        if (dotIdx > 0 && dotIdx < fileName.length() - 1) {
            String ext = fileName.substring(dotIdx + 1).toLowerCase(Locale.ROOT);
            switch (ext) {
                case "jpg":
                case "jpeg":
                    return MediaType.IMAGE_JPEG;
                case "png":
                    return MediaType.IMAGE_PNG;
                case "webp":
                    return MediaType.parseMediaType("image/webp");
                case "mp4":
                    return MediaType.parseMediaType("video/mp4");
                case "mov":
                    return MediaType.parseMediaType("video/quicktime");
                default:
                    // 走默认 octet-stream
                    break;
            }
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    /**
     * infra R2-00013：按子路径推断媒体类型，用于分级授权判定。
     *
     * <p>与 {@link com.campuslove.api.media.MediaAccessController.MediaType#fromPath}
     * 保持一致的分类规则：身份证/学生证关键词 → ID_CARD，voice/audio 或语音扩展名 → VOICE，
     * 视频扩展名 → VIDEO，其余按 IMAGE（公开可读）。</p>
     *
     * @param subPath 子路径（如 {@code 202607/uuid.jpg} 或 {@code voice/202607/uuid.m4a}）
     * @return 推断的媒体分类，默认 {@code IMAGE}
     */
    private MediaCategory probeMediaTypeByPath(String subPath) {
        if (subPath == null || subPath.isBlank()) {
            return MediaCategory.IMAGE;
        }
        String lower = subPath.toLowerCase(Locale.ROOT);
        // 与 MediaAccessController.MediaType.fromPath 的分类规则保持一致：
        // 身份证/认证资料（id[-_]?card|idcard|verification|certification）→ ID_CARD
        if (lower.matches(".*(id[-_]?card|idcard|verification|certification).*")) {
            return MediaCategory.ID_CARD;
        }
        // 语音（voice|audio 路径或 mp3/wav/m4a/aac/opus/amr 扩展名）
        if (lower.matches(".*(voice|audio).*")
                || lower.matches(".*\\.(mp3|wav|m4a|aac|opus|amr)$")) {
            return MediaCategory.VOICE;
        }
        // 视频（video|videos 路径或 mp4/mov/avi/webm/mkv/flv 扩展名）
        if (lower.matches(".*(video|videos).*")
                || lower.matches(".*\\.(mp4|mov|avi|webm|mkv|flv)$")) {
            return MediaCategory.VIDEO;
        }
        return MediaCategory.IMAGE;
    }

    /**
     * 媒体分类枚举（与 {@link com.campuslove.api.media.MediaAccessController.MediaType} 对齐，
     * 用于 service 层分级授权判定；命名避开 Spring 的 {@code org.springframework.http.MediaType}）。
     */
    public enum MediaCategory {
        IMAGE,
        VOICE,
        VIDEO,
        ID_CARD
    }

    /**
     * 媒体文件值对象，包含可读取的 {@link Resource} 与对应 {@link MediaType}。
     *
     * <p>不可变，由 {@link #loadMedia} 构造并返回给 Controller，
     * Controller 通过 {@code ResponseEntity<Resource>} 直接写入响应体。</p>
     */
    public static class MediaFile {

        /** 可读取的文件资源（FileSystemResource，可重复读取） */
        private final Resource resource;

        /** 文件 MIME 类型，用于响应 Content-Type 头 */
        private final MediaType mediaType;

        /**
         * 构造媒体文件。
         *
         * @param resource  文件资源
         * @param mediaType MIME 类型
         */
        public MediaFile(Resource resource, MediaType mediaType) {
            this.resource = resource;
            this.mediaType = mediaType;
        }

        public Resource getResource() {
            return resource;
        }

        public MediaType getMediaType() {
            return mediaType;
        }

        /**
         * 读取文件内容为字节数组（仅供测试使用，避免大文件 OOM）。
         *
         * @return 文件字节数组
         * @throws IOException 读取失败
         */
        public byte[] readBytes() throws IOException {
            try (InputStream in = resource.getInputStream()) {
                return in.readAllBytes();
            }
        }
    }
}
