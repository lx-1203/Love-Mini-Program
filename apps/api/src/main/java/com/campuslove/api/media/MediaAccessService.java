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
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Task 0.3.2：媒体鉴权代理服务。
 *
 * <p>核心职责：
 * <ol>
 *   <li>鉴权：按当前 JWT 中的 userId 校验文件归属；非本人时按<b>资源敏感度分档</b>授权
 *       （见 {@link MediaTierPolicy}：内容档 ADMIN/SUPER_ADMIN/AUDITOR，
 *       认证档（实名认证材料）仅 SUPER_ADMIN）；不满足则抛出
 *       {@link AccessDeniedException}（由 GlobalExceptionHandler 转 403）。</li>
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
     *   <li>先经 {@link #resolveAccessProfile} 一次解析出「访问分类 + 读取档位」</li>
     *   <li>两档鉴权：本人恒可读；认证档（实名认证材料）仅 SUPER_ADMIN；
     *       内容档中 IMAGE（头像/帖子图/活动图）登录用户均可读，
     *       语音/视频需 ADMIN / SUPER_ADMIN / AUDITOR；否则 403</li>
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
     * @throws AccessDeniedException    当前用户无权访问该文件（未认证；或非本人且
     *                                  不具备该档位要求的角色，且非公开图片）
     * @throws ResponseStatusException  路径非法或文件不存在（400/404）
     */
    public MediaFile loadMedia(Long targetUserId, String subPath, Authentication authentication) {
        return loadMedia(targetUserId, subPath, authentication,
                resolveAccessProfile(targetUserId, subPath));
    }

    /**
     * 加载并返回指定用户的媒体文件（带分类提示重载，2026-10-05 身份证照片越权面收敛）。
     *
     * <p>与 {@link #loadMedia(Long, String, Authentication)} 语义一致，但由调用方
     * 先解析出分类后传入，避免同一请求重复查库。注意：本重载<b>拿不到 DB 原始
     * category 字符串</b>，档位只能由已解析分类推导（ID_CARD → 认证档，
     * IMAGE/VOICE/VIDEO → 内容档），因此无法触发「DB 分类取值异常 → 认证档」
     * 那条 fail-closed 分支。需要完整分级口径的调用方
     * （如 MediaAccessController）应改用
     * {@link #loadMedia(Long, String, Authentication, AccessProfile)}。</p>
     *
     * @param targetUserId   路径变量中的目标用户 ID（文件归属者）
     * @param subPath        subPath（如 {@code 202607/uuid.jpg}），不含 userId
     * @param authentication 当前请求的认证主体（由 SecurityContext 注入）
     * @param categoryHint   已解析的媒体分类（null 时内部按路径关键词兜底推断）
     * @return 已通过校验的 {@link MediaFile}，包含可读取的 Resource 与 MediaType
     * @throws AccessDeniedException    当前用户无权访问该文件（未认证；或非本人且
     *                                  不具备该档位要求的角色，且非公开图片）
     * @throws ResponseStatusException  路径非法或文件不存在（400/404）；分类查库故障时 503
     */
    public MediaFile loadMedia(Long targetUserId, String subPath, Authentication authentication,
                               MediaCategory categoryHint) {
        MediaCategory effective = categoryHint != null
                ? categoryHint
                : probeMediaTypeByPath(subPath);
        // 兼容旧签名：调用方只给了分类、没给 DB 原始 category 字符串时，
        // 按已解析分类定档（ID_CARD → 认证档，IMAGE/VOICE/VIDEO → 内容档）
        return loadMedia(targetUserId, subPath, authentication,
                new AccessProfile(effective, MediaTierPolicy.tierForMediaCategory(effective.name())));
    }

    /**
     * 加载并返回指定用户的媒体文件（按 {@link AccessProfile} 已解析的分类 + 档位）。
     *
     * <p>这是真正执行鉴权与文件加载的实现。授权判定（2026-10 分级改造）：
     * <ol>
     *   <li><b>本人短路（保持不变）</b>：{@code targetUserId == currentUserId} 恒可读，
     *       两档都不例外——用户上传的文件自己永远能打开；</li>
     *   <li><b>认证档（{@link MediaTierPolicy.Tier#VERIFICATION}）</b>：
     *       仅 {@link MediaTierPolicy#canReadVerificationMedia(Authentication)}
     *       （ROLE_SUPER_ADMIN）可读；「IMAGE 公开可读」分支在本档<b>不适用</b>，
     *       避免分类异常的资产被顺带放开；</li>
     *   <li><b>内容档（{@link MediaTierPolicy.Tier#CONTENT}）</b>：沿用既有契约——
     *       IMAGE（头像/帖子图/相册）任意登录用户可读，VOICE/VIDEO 需
     *       {@link MediaTierPolicy#canReadContentMedia(Authentication)}
     *       （ROLE_ADMIN / ROLE_SUPER_ADMIN / ROLE_AUDITOR）。</li>
     * </ol>
     * </p>
     *
     * @param targetUserId   路径变量中的目标用户 ID（文件归属者）
     * @param subPath        subPath（如 {@code 202607/uuid.jpg}），不含 userId
     * @param authentication 当前请求的认证主体（由 SecurityContext 注入）
     * @param profile        已解析的访问档案（分类 + 档位），null 时内部重新解析
     * @return 已通过校验的 {@link MediaFile}，包含可读取的 Resource 与 MediaType
     * @throws AccessDeniedException    未认证，或非本人且不具备该档位要求的角色
     * @throws ResponseStatusException  路径非法或文件不存在（400/404）；分类查库故障时 503
     */
    public MediaFile loadMedia(Long targetUserId, String subPath, Authentication authentication,
                               AccessProfile profile) {
        if (targetUserId == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "userId 不能为空");
        }
        Long currentUserId = extractCurrentUserId(authentication);
        if (currentUserId == null) {
            // 未认证（无 token 或 token 无效）
            throw new AccessDeniedException(ErrorMessages.MEDIA_ACCESS_UNAUTHENTICATED);
        }
        AccessProfile effectiveProfile = profile != null
                ? profile
                : resolveAccessProfile(targetUserId, subPath);
        MediaCategory detectedType = effectiveProfile.category() != null
                ? effectiveProfile.category()
                : probeMediaTypeByPath(subPath);
        // 档位缺失（理论不可达）→ 按最严格的认证档处理（fail-closed）
        MediaTierPolicy.Tier tier = effectiveProfile.tier() != null
                ? effectiveProfile.tier()
                : MediaTierPolicy.Tier.VERIFICATION;

        boolean isOwner = targetUserId.equals(currentUserId);
        // 内容档公开读：与改造前完全一致（帖子配图/头像/相册对登录用户可见）
        boolean imagePublicRead = detectedType == MediaCategory.IMAGE;
        // 两档判定唯一口径（controller / service 双层校验共用 MediaTierPolicy#canRead）
        boolean permitted = MediaTierPolicy.canRead(
                tier, isOwner, imagePublicRead, authentication);
        if (!permitted) {
            LOGGER.warn("媒体访问被拒绝: targetUserId={}, currentUserId={}, tier={}, type={}, "
                            + "canReadContent={}, canReadVerification={}",
                    targetUserId, currentUserId, tier, detectedType,
                    MediaTierPolicy.canReadContentMedia(authentication),
                    MediaTierPolicy.canReadVerificationMedia(authentication));
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
        LOGGER.debug("媒体访问授权通过: targetUserId={}, currentUserId={}, tier={}, type={}, path={}",
                targetUserId, currentUserId, tier, detectedType, target);
        return new MediaFile(new FileSystemResource(target), mediaType);
    }

    /**
     * 加载临时会话媒体（2026-10-28 强匿名）。
     *
     * <p>磁盘路径：{@code {storageRoot}/temp/{sessionUid}/{subPath}}；
     * 不含 userId。授权（会话双方/过期判定）由调用方
     * {@code TempChatMediaService} 在加载前完成，本方法只做路径安全与存在性校验。</p>
     *
     * @param sessionUid 临时会话 UID（仅允许字母数字下划线短横线）
     * @param subPath    会话目录下的相对路径（{@code yyyyMM/uuid.ext}）
     * @return 媒体文件
     */
    public MediaFile loadTempMedia(String sessionUid, String subPath) {
        if (sessionUid == null || !sessionUid.matches("[A-Za-z0-9_-]{1,64}")) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "非法的临时会话标识");
        }
        validateSubPath(subPath);
        Path root = Paths.get(storageRoot).toAbsolutePath().normalize();
        Path target = root.resolve(Paths.get(TEMP_DIR, sessionUid, subPath))
                .toAbsolutePath().normalize();
        if (!target.startsWith(root)) {
            LOGGER.error("临时媒体路径越界，拒绝访问: target={}, root={}", target, root);
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,
                    "路径越界，拒绝访问");
        }
        if (!Files.exists(target) || !Files.isRegularFile(target)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,
                    "文件不存在");
        }
        return new MediaFile(new FileSystemResource(target), probeMediaType(target));
    }

    /** 临时会话媒体目录名（与 LocalMediaStorageService.storeTemp 落盘路径一致）。 */
    private static final String TEMP_DIR = "temp";

    /**
     * 媒体访问档案：一次解析同时给出「访问分类」与「读取档位」。
     *
     * <p>Controller 与 Service 共用同一实例，保证前置审计与强制校验口径一致，
     * 且同一请求只查一次库。</p>
     *
     * @param category 访问分类（IMAGE/VOICE/VIDEO/ID_CARD，驱动公开读与缓存策略）
     * @param tier     读取档位（CONTENT/VERIFICATION，驱动两档角色授权）
     */
    public record AccessProfile(MediaCategory category, MediaTierPolicy.Tier tier) {
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
     * 解析媒体访问分类（2026-10-05 身份证照片越权面收敛；2026-10 分级改造后为薄封装）。
     *
     * <p>只关心「访问分类」（IMAGE/VOICE/VIDEO/ID_CARD）的调用方用本方法；
     * 需要同时拿到<b>读取档位</b>（CONTENT/VERIFICATION）的调用方请用
     * {@link #resolveAccessProfile}，两者同源于同一次查库，不会出现口径漂移。</p>
     *
     * <p>分类优先级（口径与改造前逐字一致）：</p>
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
        return resolveAccessProfile(targetUserId, subPath).category();
    }

    /**
     * 解析媒体访问档案（访问分类 + 读取档位，2026-10 媒体读取两档分级改造）。
     *
     * <p><b>档位判定优先级</b>（真源见 {@link MediaTierPolicy}）：</p>
     * <ol>
     *   <li>(a) <b>DB 显式分类优先</b>：请求能映射到 {@code media_asset} 记录时，
     *       按其 {@code category} 定档。ID_CARD（上传契约
     *       {@code POST /api/v1/media/upload} 的 multipart 字段 category=ID_CARD
     *       + 迁移 V2026.10.05.0001 对存量认证照片的回填）→ 认证档；
     *       GENERAL/AVATAR/POST/VOICE/VIDEO → 内容档。</li>
     *   <li>(b) <b>URL 路径关键词兜底</b>：DB 无记录（存量文件、mock profile）时
     *       沿用 {@link #probeMediaTypeByPath} 的关键词识别。注意正常落盘路径是
     *       {@code {userId}/{yyyyMM}/{uuid}.{ext}}（{@link LocalMediaStorageService}），
     *       <b>不携带任何业务语义</b>，路径兜底只对早期非 UUID 命名的存量文件生效。</li>
     *   <li>(c) <b>无法归类 → 认证档（fail-closed，方向不可逆）</b>：DB 有记录但
     *       category 为空或不在已知枚举内（脏数据/未来新增未同步的取值），
     *       以及两路信号皆缺失时，一律按最严格的认证档处理——
     *       分类不明时宁可让有权角色吃 403，也不放开身份证照片。</li>
     * </ol>
     *
     * <p>两路信号以 {@link MediaTierPolicy#strictest} 合并，<b>只收紧不放松</b>，
     * 因此路径关键词命中的高敏感结论（历史 id-card/verification 目录）不会被
     * DB 的普通分类洗白。</p>
     *
     * <p>访问分类（category）的计算口径与改造前逐字一致，因为它是「IMAGE 公开可读」
     * 与响应缓存策略的唯一依据：帖子配图/头像/照片墙对任意登录用户可读的既有契约
     * 不因本次分级而改变。真正收紧的是档位维度——认证档资源不再因
     * 任何非 SUPER_ADMIN 角色（含校区 ADMIN 与新增的只读审核员 AUDITOR）而放开。</p>
     *
     * <p>fail-closed：DB 查询故障时抛 503（无法确认是否为高敏感分类时宁可拒绝服务，
     * 不降级为公开可读）。mock profile（仓库为 null）直接走路径兜底。</p>
     *
     * @param targetUserId 文件归属者用户 ID
     * @param subPath      子路径（不含 userId）
     * @return 解析出的访问档案（分类 + 档位），永不为 null
     */
    public AccessProfile resolveAccessProfile(Long targetUserId, String subPath) {
        if (mediaAssetRepository != null && targetUserId != null
                && subPath != null && !subPath.isBlank()) {
            try {
                String url = MEDIA_URL_PREFIX + targetUserId + "/" + subPath;
                List<MediaAsset> assets = mediaAssetRepository.findByUrlIn(List.of(url));
                boolean registered = !assets.isEmpty();
                String dbCategory = registered ? assets.get(0).getCategory() : null;
                MediaCategory fromDb = mapAccessCategory(dbCategory);
                // DB 显式登记为高敏感分类 → 直接采用
                MediaCategory fromPath = probeMediaTypeByPath(subPath);
                MediaCategory category;
                if (fromDb == MediaCategory.ID_CARD) {
                    category = MediaCategory.ID_CARD;
                } else if (fromPath != MediaCategory.IMAGE) {
                    // 路径关键词命中 → 收紧（VOICE/VIDEO/ID_CARD，只收紧不放松）
                    category = fromPath;
                } else {
                    category = fromDb != null ? fromDb : MediaCategory.IMAGE;
                }
                // 档位：DB 分类（已登记时）与路径分类两路信号取更严者
                MediaTierPolicy.Tier dbTier = registered
                        ? MediaTierPolicy.tierForStoredCategory(dbCategory)
                        : null;
                MediaTierPolicy.Tier pathTier =
                        MediaTierPolicy.tierForMediaCategory(category.name());
                return new AccessProfile(category, MediaTierPolicy.strictest(dbTier, pathTier));
            } catch (ResponseStatusException ex) {
                throw ex;
            } catch (RuntimeException e) {
                // fail-closed：分类不确定时拒绝服务（避免 DB 故障窗口期把 ID_CARD 判为公开 IMAGE）
                LOGGER.warn("媒体分类查询失败，fail-closed 拒绝访问: targetUserId={}, subPath={}, error={}",
                        targetUserId, subPath, e.getMessage());
                throw new ResponseStatusException(
                        org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                        "媒体权限校验暂不可用，请稍后重试");
            }
        }
        // 无 DB 可依（mock profile / 参数缺失）→ 纯路径兜底，行为与改造前一致
        MediaCategory category = probeMediaTypeByPath(subPath);
        return new AccessProfile(category, MediaTierPolicy.tierForMediaCategory(category.name()));
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
