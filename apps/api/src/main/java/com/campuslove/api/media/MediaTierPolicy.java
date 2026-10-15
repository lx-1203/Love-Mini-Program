package com.campuslove.api.media;

import java.util.Locale;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

/**
 * 媒体读取分级授权谓词（唯一真源，{@link MediaAccessController} 与
 * {@link MediaAccessService} 共用，避免两处复制粘贴导致口径漂移）。
 *
 * <h3>为什么要拆成两档（本次安全变更的决策留痕）</h3>
 * <p>改造前只有一条谓词 {@code hasAdminRole()}（仅匹配 ROLE_ADMIN）同时决定
 * <b>所有内容类图片</b>（帖子配图 / 头像 / 照片墙 / 相册）与
 * <b>实名认证材料</b>（身份证正反面、学生证、学信网截图）的可读性。
 * 后果：只要为了「让审核员能看到帖子配图」而把某个角色放进这条谓词，
 * 就等于同时把用户的国民身份证照片也交了出去——授权面与业务需求不成比例。</p>
 *
 * <p>因此按<b>资源敏感度</b>而不是按角色集合判定，拆为两档：</p>
 * <ul>
 *   <li>{@link Tier#CONTENT}（内容档）—— 帖子配图、头像、照片墙/相册、
 *       聊天语音/视频。可读角色：ROLE_ADMIN、ROLE_SUPER_ADMIN、ROLE_AUDITOR
 *       （见 {@link #canReadContentMedia(Authentication)}）。
 *       社交场景本身要求任意登录用户可读，本档只对「非公开的内容类文件」
 *       （VOICE/VIDEO）追加角色要求。</li>
 *   <li>{@link Tier#VERIFICATION}（认证档）—— 身份证/学生证/学信网截图等
 *       实名认证材料。可读角色：<b>仅 ROLE_SUPER_ADMIN</b>
 *       （见 {@link #canReadVerificationMedia(Authentication)}）。</li>
 * </ul>
 *
 * <h3>AUDITOR 为何被排除在认证档之外（审批结论）</h3>
 * <p>AUDITOR 是本次新增的「只读审核员」三级角色，其职责是审核UGC（帖子/评论/
 * 图片合规），业务上<b>完全不需要</b>看到公民身份证原件影像；身份证/学生证属于
 * 极高敏感个人信息（PII），按最小必要与《个人信息保护法》的目的限定原则，
 * 授权范围必须收敛到平台最高权限（SUPER_ADMIN，且其读取同样会被
 * {@code media.access.*} 审计日志留痕）。
 * 校区 ADMIN 也一并排除：它的管辖范围按校区切分（见 AdminDataScope 语义），
 * 却对身份证这类全国口径的 PII 缺乏与之匹配的最小必要场景。
 * 已知代价：非 SUPER_ADMIN 的审核角色在「校园认证 / 实名审核」后台页面
 * 查看认证材料图片时会开始收到 403（记录列表与文字信息不受影响），
 * 这是本次变更刻意收紧的方向，不是回归缺陷。</p>
 *
 * <h3>档位判定顺序（fail-closed 方向）</h3>
 * <ol>
 *   <li>{@link #tierForStoredCategory(String)}：请求能映射到
 *       {@code media_asset} 存量记录时，优先按 DB 显式登记的
 *       {@code category} 定档（上传链路 {@code POST /api/v1/media/upload}
 *       的 multipart 字段 {@code category=ID_CARD}，配合迁移
 *       V2026.10.05.0001 对存量认证照片的回填）；</li>
 *   <li>{@link #tierForMediaCategory(String)}：DB 无记录（存量文件、
 *       mock profile）时按 URL 路径关键词兜底；</li>
 *   <li>两路都给不出可信分类（category 取值为空或不在已知枚举内）
 *       → <b>按认证档处理</b>：宁可让有权角色多点一次 403，
 *       也不在分类不明时放开身份证照片。</li>
 * </ol>
 *
 * <p>本类只做「角色/分类 → 档位」判定，不触碰路径穿越校验与文件读取，
 * 也不改变两条既有契约：① 上传者本人恒可读自己的文件；
 * ② 内容档公开图片（IMAGE）与 {@code app-assets} 公开端点行为不变。</p>
 */
public final class MediaTierPolicy {

    /** 校区管理员角色（与 JwtAuthenticationFilter 注入的权限名一致） */
    public static final String ROLE_ADMIN = "ROLE_ADMIN";

    /** 超级管理员角色（与 JwtAuthenticationFilter 注入的权限名一致） */
    public static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";

    /** 只读审核员角色（与 JwtAuthenticationFilter 注入的权限名一致） */
    public static final String ROLE_AUDITOR = "ROLE_AUDITOR";

    /** DB 分类中代表实名认证材料的取值（对应 {@link MediaUploadCategory#ID_CARD}） */
    private static final String DB_CATEGORY_ID_CARD = "ID_CARD";

    /**
     * 媒体读取档位。
     */
    public enum Tier {
        /** 内容档：帖子配图 / 头像 / 相册 / 语音 / 视频 */
        CONTENT,
        /** 认证档：身份证 / 学生证 / 学信网截图等实名认证材料（极高敏感 PII） */
        VERIFICATION
    }

    /** 工具类，禁止实例化 */
    private MediaTierPolicy() {
    }

    /**
     * 内容档读取授权：校区管理员、超级管理员、只读审核员均可。
     *
     * <p>覆盖帖子配图、头像、相册，以及聊天语音/视频这类
     * 「非公开但非 PII 原件」的内容类文件。</p>
     *
     * @param authentication 当前请求认证主体，可为 null
     * @return true 表示可读取内容档媒体
     */
    public static boolean canReadContentMedia(Authentication authentication) {
        return hasAnyAuthority(authentication, ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_AUDITOR);
    }

    /**
     * 认证档读取授权：仅超级管理员。
     *
     * <p> AUDITOR 与校区 ADMIN 一律排除，理由见类注释「AUDITOR 为何被排除在
     * 认证档之外」段落（本次审批结论）。</p>
     *
     * @param authentication 当前请求认证主体，可为 null
     * @return true 表示可读取实名认证材料
     */
    public static boolean canReadVerificationMedia(Authentication authentication) {
        return hasAnyAuthority(authentication, ROLE_SUPER_ADMIN);
    }

    /**
     * 按档位分派到对应的读取谓词（调用方无需再关心档位与角色的对应关系）。
     *
     * @param tier           资源档位，null 视为认证档（fail-closed）
     * @param authentication 当前请求认证主体，可为 null
     * @return true 表示该认证主体可读取该档位的媒体
     */
    public static boolean grants(Tier tier, Authentication authentication) {
        // 档位缺失（理论上不应发生）→ 按最严格的认证档处理
        return tier == Tier.VERIFICATION || tier == null
                ? canReadVerificationMedia(authentication)
                : canReadContentMedia(authentication);
    }

    /**
     * 完整读取判定（controller 与 service 双层校验共用的唯一口径）。
     *
     * <p>三条既有契约逐条保留：</p>
     * <ol>
     *   <li><b>本人短路</b>：{@code isOwner == true} 直接可读，两档都不例外
     *       （用户上传的文件自己永远能打开）；</li>
     *   <li><b>内容档公开读</b>：{@code publicImageRead == true}（社交公开资源，
     *       如头像/帖子配图/相册被判为 IMAGE）时任何已登录用户可读，
     *       与改造前完全一致；该分支<b>只在内容档生效</b>，
     *       认证档不因它被绕过（分类异常的资产宁可 403 也不顺带放开）；</li>
     *   <li><b>两档角色</b>：其余情形按档位落到
     *       {@link #canReadVerificationMedia(Authentication)}（仅 SUPER_ADMIN）
     *       或 {@link #canReadContentMedia(Authentication)}
     *       （ADMIN / SUPER_ADMIN / AUDITOR）。</li>
     * </ol>
     *
     * @param tier            资源档位，null 视为认证档（fail-closed）
     * @param isOwner         当前用户是否文件归属者
     * @param publicImageRead 该资源是否属于「登录用户公开可读」的内容档图片
     * @param authentication  当前请求认证主体，可为 null
     * @return true 表示允许读取该文件
     */
    public static boolean canRead(Tier tier, boolean isOwner, boolean publicImageRead,
                                  Authentication authentication) {
        if (isOwner) {
            return true; // 本人短路（保持不变）
        }
        // 档位缺失（理论不可达）→ 按最严格的认证档处理（fail-closed）
        Tier effective = tier != null ? tier : Tier.VERIFICATION;
        if (effective != Tier.VERIFICATION && publicImageRead) {
            return true; // 内容档公开图片（保持不变）
        }
        return grants(effective, authentication);
    }

    /**
     * DB 显式登记的 {@code media_asset.category} → 读取档位。
     *
     * <p>取值真源是 {@link MediaUploadCategory}（上传契约）：
     * ID_CARD 为认证档，GENERAL/AVATAR/POST/VOICE/VIDEO 为内容档。</p>
     *
     * <p><b>fail-closed 方向（中文说明，代码即文档）</b>：category 为空串/
     * null 或不在已知枚举内（脏数据、未来新增而未同步本方法的取值）时，
     * 一律返回认证档——分类不明的高敏感可能性远大于普通配图，
     * 宁可拒绝也不放开身份证照片。</p>
     *
     * @param dbCategory media_asset.category 原始取值（可为 null）
     * @return 档位，永不为 null
     */
    public static Tier tierForStoredCategory(String dbCategory) {
        if (dbCategory == null || dbCategory.isBlank()) {
            return Tier.VERIFICATION; // 无法归类 → 认证档（fail-closed）
        }
        return switch (dbCategory.trim().toUpperCase(Locale.ROOT)) {
            case DB_CATEGORY_ID_CARD -> Tier.VERIFICATION;
            case "GENERAL", "AVATAR", "POST", "VOICE", "VIDEO" -> Tier.CONTENT;
            // 未知取值 → 认证档（fail-closed）：不因不认识而放松
            default -> Tier.VERIFICATION;
        };
    }

    /**
     * 已解析的媒体访问分类（{@link MediaAccessService.MediaCategory} /
     * {@link MediaAccessController.MediaType} 的枚举名）→ 读取档位。
     *
     * <p>用于 DB 无记录时的路径兜底：ID_CARD（路径关键词识别出的认证资料）
     * → 认证档；IMAGE/VOICE/VIDEO → 内容档；其他/未知 → 认证档（fail-closed）。</p>
     *
     * @param mediaCategoryName 媒体分类枚举名（可为 null）
     * @return 档位，永不为 null
     */
    public static Tier tierForMediaCategory(String mediaCategoryName) {
        if (mediaCategoryName == null || mediaCategoryName.isBlank()) {
            return Tier.VERIFICATION; // 无法归类 → 认证档（fail-closed）
        }
        return switch (mediaCategoryName.trim().toUpperCase(Locale.ROOT)) {
            case "ID_CARD" -> Tier.VERIFICATION;
            case "IMAGE", "VOICE", "VIDEO" -> Tier.CONTENT;
            default -> Tier.VERIFICATION;
        };
    }

    /**
     * 合并 DB 分类与路径分类两路信号，取<b>更严格</b>的档位（只收紧不放松）。
     *
     * @param dbTier   DB 分类档位，可为 null（DB 无记录）
     * @param pathTier 路径兜底档位，可为 null（分类未知）
     * @return 档位，至少与两者中最严格的一致，永不为 null
     */
    public static Tier strictest(Tier dbTier, Tier pathTier) {
        if (dbTier == Tier.VERIFICATION || pathTier == Tier.VERIFICATION) {
            return Tier.VERIFICATION;
        }
        if (dbTier == null && pathTier == null) {
            return Tier.VERIFICATION; // 两路都无信号 → 认证档（fail-closed）
        }
        return Tier.CONTENT;
    }

    /**
     * 角色集合判定的唯一实现：遍历 {@link Authentication#getAuthorities()}
     * 做权限名精确匹配（与 JwtAuthenticationFilter 注入的 {@code ROLE_*} 串一致）。
     *
     * @param authentication 认证主体，可为 null
     * @param required       允许的权限名（任一命中即通过）
     * @return true 表示命中其中任一权限
     */
    private static boolean hasAnyAuthority(Authentication authentication, String... required) {
        if (authentication == null || authentication.getAuthorities() == null
                || required == null || required.length == 0) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String granted = authority == null ? null : authority.getAuthority();
            if (granted == null) {
                continue;
            }
            for (String want : required) {
                if (want.equals(granted)) {
                    return true;
                }
            }
        }
        return false;
    }
}
