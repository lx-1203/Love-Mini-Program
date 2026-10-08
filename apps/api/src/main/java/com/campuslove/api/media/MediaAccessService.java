package com.campuslove.api.media;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.entity.MediaAsset;
import com.campuslove.api.repository.MediaAssetRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
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

    /**
     * 应用资产目录名（2026-08-10，小程序主包瘦身）。
     *
     * <p>装饰性图片（static/generated/images、static/assets/images）经种子脚本
     * （apps/api/scripts/seed-app-assets.ps1）复制到
     * {@code {storageRoot}/app-assets/{源相对路径}}，由公开端点
     * {@code GET /api/v1/media/app-assets/**} 免登录访问。</p>
     */
    private static final String APP_ASSETS_DIR = "app-assets";

    /** 媒体存储根目录，与 LocalMediaStorageService 共享配置 */
    private final String storageRoot;

    /** 受管媒体 URL 前缀（与 LocalMediaStorageService.URL_PREFIX 一致） */
    private static final String MEDIA_URL_PREFIX = "/api/v1/media/";

    /**
     * 媒体资产仓库（可选注入，real profile 有 JPA 仓库；mock/单测直连构造时为 null）。
     * 用于按 DB 分类（media_asset.category）判定访问权限——DB 分类优先，路径关键词兜底。
     */
    private final MediaAssetRepository mediaAssetRepository;

    /**
     * 构造函数，注入存储根目录配置。
     *
     * @param storageRoot 来自 {@code app.media.storage-root} 配置，默认 {@code ./uploads}
     */
    public MediaAccessService(
            @Value("${app.media.storage-root:./uploads}") String storageRoot) {
        this(storageRoot, null);
    }

    /**
     * 构造函数（完整形态）：注入存储根目录与媒体资产仓库。
     *
     * @param storageRoot          来自 {@code app.media.storage-root} 配置，默认 {@code ./uploads}
     * @param mediaAssetRepository 媒体资产仓库（可为 null：mock profile / 单元测试直连构造）
     */
    @org.springframework.beans.factory.annotation.Autowired
    public MediaAccessService(
            @Value("${app.media.storage-root:./uploads}") String storageRoot,
            MediaAssetRepository mediaAssetRepository) {
        this.storageRoot = storageRoot;
        this.mediaAssetRepository = mediaAssetRepository;
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
        MediaCategory category = resolveCategory(targetUserId, subPath);
        return loadMedia(targetUserId, subPath, authentication, category);
    }

    /**
     * 加载并返回指定用户的媒体文件（带分类提示重载，2026-10-05 身份证照片越权面收敛）。
     *
     * <p>与 {@link #loadMedia(Long, String, Authentication)} 语义一致，但由调用方
     * （MediaAccessController）先经 {@link #resolveCategory} 解析分类后传入，
     * 避免同一请求重复查库；controller 侧前置校验与 service 侧强制校验使用同一分类结论。</p>
     *
     * @param targetUserId   路径变量中的目标用户 ID（文件归属者）
     * @param subPath        subPath（如 {@code 202607/uuid.jpg}），不含 userId
     * @param authentication 当前请求的认证主体（由 SecurityContext 注入）
     * @param categoryHint   已解析的媒体分类（null 时内部按路径关键词兜底推断）
     * @return 已通过校验的 {@link MediaFile}，包含可读取的 Resource 与 MediaType
     * @throws AccessDeniedException    当前用户无权访问该文件（非本人且非管理员，且非公开图片）
     * @throws ResponseStatusException  路径非法或文件不存在（400/404）；分类查库故障时 503
     */
    public MediaFile loadMedia(Long targetUserId, String subPath, Authentication authentication,
                               MediaCategory categoryHint) {
        if (targetUserId == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "userId 不能为空");
        }
        // 分级鉴权：IMAGE 为社交公开资源（登录用户可读）；其余类型仅本人或管理员
        Long currentUserId = extractCurrentUserId(authentication);
        boolean isAdmin = hasAdminRole(authentication);
        if (currentUserId == null) {
            // 未认证（无 token 或 token 无效）
            throw new AccessDeniedException(ErrorMessages.MEDIA_ACCESS_UNAUTHENTICATED);
        }
        MediaCategory detectedType = categoryHint != null
                ? categoryHint
                : probeMediaTypeByPath(subPath);
        boolean isOwner = targetUserId.equals(currentUserId);
        boolean imagePublicRead = detectedType == MediaCategory.IMAGE;
        if (!isOwner && !isAdmin && !imagePublicRead) {
            LOGGER.warn("媒体访问被拒绝: targetUserId={}, currentUserId={}, isAdmin={}, type={}",
                    targetUserId, currentUserId, isAdmin, detectedType);
            throw new AccessDeniedException(ErrorMessages.MEDIA_ACCESS_FORBIDDEN);
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
            // MP-R5-DIAG（2026-09-13）：404 分支此前无任何日志，磁盘路径漂移类问题无法排查
            LOGGER.warn("媒体文件未命中: targetUserId={}, subPath={}, root={}, target={}",
                    targetUserId, subPath, root, target);
            throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,
                    "文件不存在");
        }

        MediaType mediaType = probeMediaType(target);
        LOGGER.debug("媒体访问授权通过: targetUserId={}, currentUserId={}, isAdmin={}, path={}",
                targetUserId, currentUserId, isAdmin, target);
        return new MediaFile(new FileSystemResource(target), mediaType);
    }

    /**
     * 加载应用资产文件（2026-08-10，公开访问，无需登录）。
     *
     * <p>存储路径：{@code {storageRoot}/app-assets/{subPath}}，subPath 为源静态路径
     * 的相对部分（如 {@code generated/images/campus/campus-gate.jpg}，
     * {@code assets/images/banners/home-banner.jpg}）。</p>
     *
     * <p>安全校验与 {@link #loadMedia} 一致：字符级路径穿越校验 +
     * normalize 后必须仍在 storageRoot 之下 + 文件存在性校验。</p>
     *
     * @param subPath 子路径（app-assets 之下的相对路径，可含多级目录）
     * @return 已通过校验的 {@link MediaFile}，包含可读取的 Resource 与 MediaType
     * @throws ResponseStatusException 路径非法或文件不存在（400/403/404）
     */
    public MediaFile loadAppAsset(String subPath) {
        // Path Traversal 防护：subPath 字符级校验（复用 loadMedia 同款规则）
        validateSubPath(subPath);

        Path root = Paths.get(storageRoot).toAbsolutePath().normalize();
        Path target = root.resolve(Paths.get(APP_ASSETS_DIR, subPath))
                .toAbsolutePath().normalize();
        // 二次校验：normalize 后仍在 storageRoot 之下（防御构造的边缘 case）
        if (!target.startsWith(root)) {
            LOGGER.error("应用资产路径越界，拒绝访问: target={}, root={}", target, root);
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,
                    "路径越界，拒绝访问");
        }

        // 文件存在性校验
        if (!Files.exists(target) || !Files.isRegularFile(target)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,
                    "文件不存在");
        }

        MediaType mediaType = probeMediaType(target);
        LOGGER.debug("应用资产访问授权通过: path={}", target);
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
     * 解析媒体访问分类（2026-10-05 身份证照片越权面收敛）。
     *
     * <p>优先级：</p>
     * <ol>
     *   <li>DB 分类（media_asset.category，按 URL 精确查询）：ID_CARD/VOICE/VIDEO
     *       直接生效——实名认证照片上传时显式登记，不再依赖路径关键词</li>
     *   <li>路径关键词（{@link #probeMediaTypeByPath}）兜底：DB 无记录（存量文件/
     *       mock profile）或 DB 分类为普通类时，路径关键词命中仍收紧为更严格分类
     *       （只收紧不放松，保留存量 "verification" 等路径的既有防护）</li>
     *   <li>均未命中 → IMAGE（登录用户公开可读）</li>
     * </ol>
     *
     * <p>fail-closed：DB 查询故障时抛 503（无法确认是否为高敏感分类时宁可拒绝服务，
     * 不降级为公开可读）。mock profile（仓库为 null）直接走路径兜底，行为不变。</p>
     *
     * @param targetUserId 文件归属者用户 ID
     * @param subPath      子路径（不含 userId）
     * @return 解析出的访问分类，永不为 null
     */
    public MediaCategory resolveCategory(Long targetUserId, String subPath) {
        if (mediaAssetRepository != null && targetUserId != null
                && subPath != null && !subPath.isBlank()) {
            try {
                String url = MEDIA_URL_PREFIX + targetUserId + "/" + subPath;
                List<MediaAsset> assets = mediaAssetRepository.findByUrlIn(List.of(url));
                MediaCategory fromDb = assets.isEmpty()
                        ? null : mapAccessCategory(assets.get(0).getCategory());
                // DB 显式登记为高敏感分类 → 直接采用
                if (fromDb == MediaCategory.ID_CARD) {
                    return MediaCategory.ID_CARD;
                }
                MediaCategory fromPath = probeMediaTypeByPath(subPath);
                // 路径关键词命中 → 收紧（VOICE/VIDEO/ID_CARD，只收紧不放松）
                if (fromPath != MediaCategory.IMAGE) {
                    return fromPath;
                }
                return fromDb != null ? fromDb : MediaCategory.IMAGE;
            } catch (RuntimeException e) {
                // fail-closed：分类不确定时拒绝服务（避免 DB 故障窗口期把 ID_CARD 判为公开 IMAGE）
                LOGGER.warn("媒体分类查询失败，fail-closed 拒绝访问: targetUserId={}, subPath={}, error={}",
                        targetUserId, subPath, e.getMessage());
                throw new ResponseStatusException(
                        org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                        "媒体权限校验暂不可用，请稍后重试");
            }
        }
        return probeMediaTypeByPath(subPath);
    }

    /**
     * media_asset.category 值 → 访问分类映射。
     *
     * @param category DB 分类（GENERAL/AVATAR/POST/VOICE/VIDEO/ID_CARD，可为 null）
     * @return 高敏感分类映射（ID_CARD/VOICE/VIDEO）；普通类（GENERAL/AVATAR/POST/空）返回 null
     */
    private static MediaCategory mapAccessCategory(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }
        return switch (category.trim().toUpperCase(Locale.ROOT)) {
            case "ID_CARD" -> MediaCategory.ID_CARD;
            case "VOICE" -> MediaCategory.VOICE;
            case "VIDEO" -> MediaCategory.VIDEO;
            default -> null; // GENERAL/AVATAR/POST → 走路径兜底后按 IMAGE 处理
        };
    }

    /**
     * infra R2-00013：按子路径推断媒体类型，用于分级授权判定。
     *
     * <p>与 {@link com.campuslove.api.media.MediaAccessController.MediaType#fromPath}
     * 保持一致的分类规则：身份证/学生证关键词 → ID_CARD，voice/audio 或语音扩展名 → VOICE，
     * 视频扩展名 → VIDEO，其余按 IMAGE（公开可读）。</p>
     *
     * <p>2026-10-05 起降级为<b>兜底</b>推断：优先使用 {@link #resolveCategory}
     * 的 DB 分类（实名照片上传即登记 category=ID_CARD），本方法仅用于
     * DB 无记录的存量文件与 mock profile。</p>
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
