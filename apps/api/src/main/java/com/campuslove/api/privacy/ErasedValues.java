package com.campuslove.api.privacy;

import java.util.Locale;
import java.util.UUID;

/**
 * 注销后各敏感列的<b>唯一</b>表示值（单一事实来源；生产代码与 {@link PersonalDataTables} 的 SQL 共用）。
 *
 * <p>三条设计约束，缺一条就不算「真的删掉了」：</p>
 * <ol>
 *   <li><b>不含主体标识</b>：所有占位值都是常量，或由加密安全随机数生成、与 userId 无任何映射关系。
 *       历史实现 {@code "1****" + userId} 被判定为「稳定化名」而非匿名，本类是它的替代。</li>
 *   <li><b>不会被误当成密文</b>：{@code users.phone}／{@code real_name_certifications.id_card_no}
 *       等列在活着的时候存的是 {@link com.campuslove.api.config.AesEncryptor} 的 AES-GCM Base64 密文，
 *       读取侧（{@code AdminRealNameController#decryptIdCardNo}、
 *       {@code RealRealNameCertificationService#decryptIdCardNo}、{@link PhoneColumnCodec}）
 *       会先按 Base64 试解码。<b>R4-00247 之后</b>，Base64 可解但认证标签不匹配的值会抛
 *       {@link IllegalStateException}（不是静默返回原值）。因此占位值一律含 Base64 字母表外的字符
 *       （中文、「*」、':'），保证 {@code isEncrypted()==false}，走「历史明文」分支原样返回。
 *       由 {@code AccountErasureServiceTest} 逐个把注册表里的字面量喂进真实 AesEncryptor 验证。</li>
 *   <li><b>满足约束</b>：{@link #erasedOpenid()} 非空且全局唯一（{@code uk_users_openid}），
 *       手机号则直接写 NULL（{@code uk_users_phone} 允许多行 NULL，两个账号同秒注销不冲突）。</li>
 * </ol>
 */
public final class ErasedValues {

    /** 昵称占位（users.nickname / audit_log.operator_username 等 NOT NULL 列）。所有注销账号共用，不识别个体。 */
    public static final String NICKNAME = "已注销用户";

    /** 自由文本（简介/动态正文/评论正文）内容占位。 */
    public static final String TEXT_CONTENT = "（内容已随账号注销删除）";

    /** 短文本 NOT NULL 列（年级、代词、校区相关）占位。 */
    public static final String SHORT_TEXT = "已注销";

    /** 无法置空的地址/院系类列占位（user_campus_profile 等 NOT NULL 列的兜底文案）。 */
    public static final String UNKNOWN_LOCATION = "未知";

    /**
     * 注销墓碑 openid 的前缀。
     *
     * <p>选值理由：真实微信 openid 为 28 位、字符集 {@code [A-Za-z0-9_-]}、以 {@code o} 开头，
     * <b>永不含半角冒号</b>；本项目已有的派生键前缀是 {@code phone:}（SHA-256 派生）与
     * {@code guest:}（UUID）。{@code erased:} 与三者都不重叠，也不会与历史
     * {@code phone:<sha256>} 冲突——后者必须被覆盖掉，因为 11 位手机号空间仅约 3×10⁹，
     * 拿到 SHA-256 摘要后穷举即可复原手机号，属可逆化名。</p>
     */
    public static final String OPENID_PREFIX = "erased:";

    /**
     * 生成注销墓碑 openid：{@code erased:<UUIDv4>}（长度 43 &lt; 列宽 128）。
     *
     * <p>唯一性：UUIDv4 有 122 位随机熵，{@code UUID.randomUUID()} 底层是 {@link java.security.SecureRandom}，
     * <b>不</b>依赖时间戳——两个账号在同一秒注销也不会撞 {@code uk_users_openid}；
     * 同一账号被重复注销时每次生成新值，同样满足唯一约束（幂等复跑安全）。
     * 不可逆性：值与 userId、手机号、openid 原文都没有函数关系，无法反推。</p>
     */
    public static String erasedOpenid() {
        return OPENID_PREFIX + UUID.randomUUID().toString().toLowerCase(Locale.ROOT);
    }

    /** 该值是否为本类写出的墓碑 openid。 */
    public static boolean isErasedOpenid(String value) {
        return value != null && value.startsWith(OPENID_PREFIX);
    }

    /** JSON 列（interest_tags / photo_gallery 等）的清空表示：空数组。 */
    public static final String EMPTY_JSON_ARRAY = "[]";

    private ErasedValues() {
        throw new UnsupportedOperationException("常量类不可实例化");
    }
}
