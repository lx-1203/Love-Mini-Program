package com.campuslove.api.utils;

import com.campuslove.api.common.ErrorMessages;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 敏感数据脱敏工具类（P0 CRITICAL FIN-00001/00002）。
 *
 * <p>统一项目内敏感字段（openId / phone / idCard / realName / token / secret / email）
 * 的脱敏规则，供所有 Service / Controller 在日志输出、审计落库、调试信息等场景调用，
 * 避免敏感原始值泄露到日志文件、APM 链路追踪或异常堆栈。</p>
 *
 * <p>使用方式：</p>
 * <pre>{@code
 * import static com.campuslove.api.utils.SensitiveDataMasker.mask;
 * import static com.campuslove.api.utils.SensitiveDataMasker.maskPhone;
 *
 * log.info("用户登录, userId={}, openid={}", userId, mask(openId));
 * log.warn("短信发送失败, phone={}", maskPhone(phone));
 * }</pre>
 *
 * <p>设计原则：</p>
 * <ul>
 *   <li>纯静态方法 + 私有构造器，不可实例化</li>
 *   <li>对 {@code null} / 空串 / 短串安全降级，永不抛出 {@link NullPointerException}</li>
 *   <li>所有方法均无副作用、线程安全（无共享可变状态）</li>
 *   <li>使用 SLF4J 在 debug 级别记录脱敏调用，便于线上排查"是否经过脱敏"</li>
 * </ul>
 *
 * <p>注意：本类只负责"展示层"脱敏（log/审计/调试），不替代数据库加密
 * （由 {@link com.campuslove.api.config.AesEncryptor} 负责）和传输加密（HTTPS/TLS）。</p>
 *
 * @since 2026-07-28
 */
public final class SensitiveDataMasker {

    /** SLF4J Logger，记录脱敏调用情况（debug 级别，生产环境默认关闭） */
    private static final Logger log = LoggerFactory.getLogger(SensitiveDataMasker.class);

    /** 脱敏占位字符 */
    private static final char MASK_CHAR = '*';

    /** null / 空串输入时的统一返回值（用于 phone/openId/idCard/realName/email） */
    private static final String EMPTY_MASK = "";

    /** null / 空串输入时的统一返回值（用于 token/secret 等更高敏感度字段） */
    private static final String SECRET_EMPTY_MASK = "***";

    /**
     * 手机号脱敏长度分支阈值（R4-01832~01834，与 dto.MaskingUtils 共用）。
     * <ul>
     *   <li>{@link #PHONE_LEN_STANDARD}=11：标准 11 位手机号（前 3 + 4 星 + 后 4）</li>
     *   <li>{@link #PHONE_LEN_MEDIUM}=8：8-10 位保留前 3 + 后 4</li>
     *   <li>{@link #PHONE_LEN_SHORT}=4：4-7 位保留首尾各 1 位</li>
     * </ul>
     */
    public static final int PHONE_LEN_STANDARD = 11;
    public static final int PHONE_LEN_MEDIUM = 8;
    public static final int PHONE_LEN_SHORT = 4;

    /** 私有构造器，禁止实例化 */
    private SensitiveDataMasker() {
        throw new UnsupportedOperationException(ErrorMessages.UTILITY_CLASS_INSTANTIATION_FORBIDDEN);
    }

    /**
     * 脱敏 openId：保留前 4 + 后 4，中间用 {@code *} 替换；不足 8 位全部星号。
     *
     * <p>示例：</p>
     * <ul>
     *   <li>{@code "oK5aBcDeFgHiJkL"}（15 位） -&gt; {@code "oK5a*******iJkL"}（4 + 7 个 * + 4）</li>
     *   <li>{@code "o1234567890ab"}（13 位） -&gt; {@code "o123*****90ab"}（4 + 5 个 * + 4）</li>
     *   <li>{@code "o12345678"}（9 位） -&gt; {@code "o123*5678"}（4 + 1 个 * + 4）</li>
     *   <li>{@code "o1234567"}（8 位） -&gt; {@code "o1234567"}（前 4 + 后 4 直接拼接，无中间星号）</li>
     *   <li>{@code "short"}（5 位） -&gt; {@code "*****"}（不足 8 位全部星号）</li>
     *   <li>{@code null} / {@code ""} -&gt; {@code ""}</li>
     * </ul>
     *
     * @param openId 原始微信 openId
     * @return 脱敏后的字符串；null/空串返回 {@code ""}
     */
    public static String mask(String openId) {
        if (openId == null || openId.isEmpty()) {
            log.debug("mask(openId) 输入为 null/空，返回空串");
            return EMPTY_MASK;
        }
        int len = openId.length();
        // 不足 8 位无法既保留前 4 又保留后 4，全部星号
        if (len < 8) {
            log.debug("mask(openId) 输入长度 {} < 8，全部星号", len);
            return repeat(MASK_CHAR, len);
        }
        // 长度 == 8：前 4 + 后 4 直接拼接，无中间星号
        if (len == 8) {
            return openId.substring(0, 4) + openId.substring(len - 4);
        }
        // 长度 > 8：前 4 + 中间至少 1 个 * + 后 4
        String masked = openId.substring(0, 4)
                + repeat(MASK_CHAR, len - 8)
                + openId.substring(len - 4);
        log.debug("mask(openId) 脱敏完成, 原长度={}, 脱敏后长度={}", len, masked.length());
        return masked;
    }

    /**
     * 脱敏手机号：保留前 3 + 后 4，中间 4 位用星号替换（标准 11 位场景输出 {@code 138****5678}）。
     *
     * <p>示例：</p>
     * <ul>
     *   <li>{@code "13812345678"} -&gt; {@code "138****5678"}</li>
     *   <li>{@code "1385678"}（7 位） -&gt; {@code "138*5678"}（中间按长度填充）</li>
     *   <li>{@code "138"}（3 位） -&gt; {@code "***"}（长度 &lt;= 7 视为短串）</li>
     *   <li>{@code null} / {@code ""} -&gt; {@code ""}</li>
     * </ul>
     *
     * @param phone 原始手机号
     * @return 脱敏后的字符串；null/空串返回 {@code ""}
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.isEmpty()) {
            log.debug("maskPhone 输入为 null/空，返回空串");
            return EMPTY_MASK;
        }
        int len = phone.length();
        // R4-01832~01834：长度分支阈值收敛为共享常量（与 dto.MaskingUtils 共用）
        // 标准 11 位手机号：前 3 + 4 个 * + 后 4
        if (len >= PHONE_LEN_STANDARD) {
            return phone.substring(0, 3) + "****" + phone.substring(len - 4);
        }
        // 长度 8-10：保留前 3 + 后 4，中间用 * 填充剩余
        if (len >= PHONE_LEN_MEDIUM) {
            return phone.substring(0, 3)
                    + repeat(MASK_CHAR, len - 7)
                    + phone.substring(len - 4);
        }
        // 长度 4-7：保留首尾各 1 位
        if (len >= PHONE_LEN_SHORT) {
            return phone.substring(0, 1)
                    + repeat(MASK_CHAR, len - 2)
                    + phone.substring(len - 1);
        }
        // 长度 < 4：全部星号
        log.debug("maskPhone 输入长度 {} < 4，全部星号", len);
        return repeat(MASK_CHAR, len);
    }

    /**
     * 脱敏身份证号：保留前 6 + 后 4，中间用星号替换。
     *
     * <p>示例：</p>
     * <ul>
     *   <li>{@code "110101199001011234"}（18 位） -&gt; {@code "110101********1234"}</li>
     *   <li>{@code "110101"}（6 位） -&gt; {@code "110101"}（长度 &lt; 10 直接原样返回，已无法脱敏）</li>
     *   <li>{@code "11010119901234"}（14 位） -&gt; {@code "110101****1234"}</li>
     *   <li>{@code null} / {@code ""} -&gt; {@code ""}</li>
     * </ul>
     *
     * @param idCard 原始身份证号
     * @return 脱敏后的字符串；null/空串返回 {@code ""}
     */
    public static String maskIdCard(String idCard) {
        if (idCard == null || idCard.isEmpty()) {
            log.debug("maskIdCard 输入为 null/空，返回空串");
            return EMPTY_MASK;
        }
        int len = idCard.length();
        // 长度 < 10 无法既保留前 6 又保留后 4，全部星号
        if (len < 10) {
            log.debug("maskIdCard 输入长度 {} < 10，全部星号", len);
            return repeat(MASK_CHAR, len);
        }
        // 长度 == 10：前 6 + 后 4 直接拼接
        if (len == 10) {
            return idCard.substring(0, 6) + idCard.substring(len - 4);
        }
        // 长度 > 10：前 6 + 中间 * + 后 4
        return idCard.substring(0, 6)
                + repeat(MASK_CHAR, len - 10)
                + idCard.substring(len - 4);
    }

    /**
     * 脱敏真实姓名：保留姓氏（首字），其余用星号替换。
     *
     * <p>示例：</p>
     * <ul>
     *   <li>{@code "张三"} -&gt; {@code "张*"}</li>
     *   <li>{@code "欧阳修"} -&gt; {@code "欧**"}</li>
     *   <li>{@code "司马相如"} -&gt; {@code "司***"}</li>
     *   <li>{@code "张"}（单字） -&gt; {@code "张"}（仅 1 字直接原样）</li>
     *   <li>{@code null} / {@code ""} -&gt; {@code ""}</li>
     * </ul>
     *
     * @param name 原始真实姓名
     * @return 脱敏后的字符串；null/空串返回 {@code ""}
     */
    public static String maskRealName(String name) {
        if (name == null || name.isEmpty()) {
            log.debug("maskRealName 输入为 null/空，返回空串");
            return EMPTY_MASK;
        }
        int len = name.length();
        // 单字姓名无法脱敏，直接原样返回（仅 1 字本身就是姓氏）
        if (len == 1) {
            return name;
        }
        // 保留首字（姓氏），其余用 * 替换
        return name.substring(0, 1) + repeat(MASK_CHAR, len - 1);
    }

    /**
     * 脱敏 token（JWT / access_token / refresh_token 等）：仅保留前 4 + 后 4，中间星号。
     *
     * <p>与 {@link #mask(String)} 不同，token 敏感度更高，null/空串返回 {@code "***"} 而非空串，
     * 防止日志读取者误以为"未输出 token"即"无 token"，造成安全审计误判。</p>
     *
     * <p>示例：</p>
     * <ul>
     *   <li>{@code "eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM.signature"} -&gt;
     *       {@code "eyJh********signature"}</li>
     *   <li>{@code "abcdefg"}（7 位） -&gt; {@code "***"}（不足 8 位视为异常 token）</li>
     *   <li>{@code null} / {@code ""} -&gt; {@code "***"}</li>
     * </ul>
     *
     * @param token 原始 token 字符串
     * @return 脱敏后的字符串；null/空/短串返回 {@code "***"}
     */
    public static String maskToken(String token) {
        if (token == null || token.isEmpty()) {
            log.debug("maskToken 输入为 null/空，返回 ***");
            return SECRET_EMPTY_MASK;
        }
        int len = token.length();
        // 不足 8 位视为异常 token，全部返回 ***
        if (len < 8) {
            log.debug("maskToken 输入长度 {} < 8，视为异常 token 返回 ***", len);
            return SECRET_EMPTY_MASK;
        }
        // 长度 == 8：前 4 + 后 4
        if (len == 8) {
            return token.substring(0, 4) + token.substring(len - 4);
        }
        // 长度 > 8：前 4 + 中间 * + 后 4
        return token.substring(0, 4)
                + repeat(MASK_CHAR, len - 8)
                + token.substring(len - 4);
    }

    /**
     * 脱敏密钥（API secret / app secret / JWT secret 等）：全部用星号替换。
     *
     * <p>密钥类字段任何明文片段泄露都可能被用于重放/伪造，因此全部星号，不保留任何明文。
     * 返回长度与输入相同，便于日志识别"原本有内容"。</p>
     *
     * <p>示例：</p>
     * <ul>
     *   <li>{@code "sk-abc123xyz"} -&gt; {@code "***********"}</li>
     *   <li>{@code "a"} -&gt; {@code "*"}</li>
     *   <li>{@code null} / {@code ""} -&gt; {@code "***"}（与 token 一致，避免误判"无密钥"）</li>
     * </ul>
     *
     * @param secret 原始密钥字符串
     * @return 全部星号的字符串；null/空串返回 {@code "***"}
     */
    public static String maskSecret(String secret) {
        if (secret == null || secret.isEmpty()) {
            log.debug("maskSecret 输入为 null/空，返回 ***");
            return SECRET_EMPTY_MASK;
        }
        return repeat(MASK_CHAR, secret.length());
    }

    /**
     * 脱敏邮箱：邮箱名（@ 前）保留前 1 + 后 1，中间用星号替换；@ 域名部分完整保留。
     *
     * <p>示例：</p>
     * <ul>
     *   <li>{@code "test@example.com"} -&gt; {@code "t**t@example.com"}</li>
     *   <li>{@code "ab@b.com"}（@ 前 2 位） -&gt; {@code "a*b@b.com"}</li>
     *   <li>{@code "a@b.com"}（@ 前 1 位） -&gt; {@code "a@b.com"}（仅 1 位无法脱敏，原样）</li>
     *   <li>{@code "invalid-email"}（无 @） -&gt; {@code "invalid-email"}（原样返回）</li>
     *   <li>{@code null} / {@code ""} -&gt; {@code ""}</li>
     * </ul>
     *
     * @param email 原始邮箱
     * @return 脱敏后的字符串；null/空串返回 {@code ""}
     */
    public static String maskEmail(String email) {
        if (email == null || email.isEmpty()) {
            log.debug("maskEmail 输入为 null/空，返回空串");
            return EMPTY_MASK;
        }
        int atIdx = email.indexOf('@');
        if (atIdx <= 0) {
            // 无 @ 或 @ 在首位，无法按规则脱敏，原样返回
            log.debug("maskEmail 输入无有效 @ 符号，原样返回");
            return email;
        }
        String local = email.substring(0, atIdx);
        String domain = email.substring(atIdx); // 包含 @
        // @ 前长度 < 2 无法保留前 1 后 1，原样返回 local
        if (local.length() < 2) {
            return local + domain;
        }
        // @ 前长度 == 2：前 1 + 1 个 * + 后 1
        if (local.length() == 2) {
            return local.substring(0, 1) + MASK_CHAR + local.substring(1) + domain;
        }
        // @ 前长度 > 2：前 1 + 中间 * + 后 1
        String maskedLocal = local.substring(0, 1)
                + repeat(MASK_CHAR, local.length() - 2)
                + local.substring(local.length() - 1);
        return maskedLocal + domain;
    }

    /**
     * 内部工具方法：将指定字符重复 n 次。
     *
     * @param c 待重复字符
     * @param n 重复次数（&lt;= 0 时返回空串）
     * @return 由 n 个 c 组成的字符串
     */
    private static String repeat(char c, int n) {
        if (n <= 0) {
            return "";
        }
        char[] arr = new char[n];
        java.util.Arrays.fill(arr, c);
        return new String(arr);
    }
}
