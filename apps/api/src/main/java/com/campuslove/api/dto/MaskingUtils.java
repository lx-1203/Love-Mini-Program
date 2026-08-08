package com.campuslove.api.dto;

/**
 * 敏感字段脱敏工具类。
 *
 * <p>所有从 Entity 转换到 DTO 的敏感字段（openid、手机号、邮箱、身份证号等）
 * 必须经过本工具类的方法处理，确保原始敏感数据不会通过 API 响应外泄。</p>
 *
 * <p>本类为工具类，不可实例化，仅提供静态方法。</p>
 *
 * @since 2026-07-26
 */
public final class MaskingUtils {

    /** 默认脱敏替换字符 */
    private static final char MASK_CHAR = '*';

    /**
     * 手机号中长分支阈值（R4-01836）：长度 7-10 时保留前 3 + 后 4。
     * 与 {@link com.campuslove.api.utils.SensitiveDataMasker} 的脱敏阈值对齐。
     */
    private static final int PHONE_LEN_MEDIUM_7 = 7;

    /** 私有构造方法，防止实例化 */
    private MaskingUtils() {
        throw new UnsupportedOperationException("工具类不可实例化");
    }

    /**
     * 脱敏微信 openid：保留前 4 位 + 后 2 位，中间用 * 替换。
     *
     * <p>示例：
     * <ul>
     *   <li>{@code "o1234abcdef56"} -&gt; {@code "o123*******56"}</li>
     *   <li>{@code "o12"} -&gt; {@code "o***12"}（长度不足时降级处理）</li>
     *   <li>{@code null} -&gt; {@code null}</li>
     * </ul>
     * </p>
     *
     * @param openid 原始 openid
     * @return 脱敏后的 openid，输入 null 时返回 null
     */
    public static String maskOpenid(String openid) {
        if (openid == null) {
            return null;
        }
        int len = openid.length();
        // 长度 <= 6 时无法既保留前 4 又保留后 2，统一降级为只保留前 1 后 1
        if (len <= 6) {
            if (len <= 2) {
                return repeat(MASK_CHAR, len);
            }
            int keep = Math.min(1, len - 2);
            return openid.substring(0, keep)
                    + repeat(MASK_CHAR, len - keep - 1)
                    + openid.substring(len - 1);
        }
        // 正常场景：前 4 + 中间 * + 后 2
        int maskLen = len - 6;
        return openid.substring(0, 4)
                + repeat(MASK_CHAR, maskLen)
                + openid.substring(len - 2);
    }

    /**
     * 脱敏手机号：保留前 3 位 + 后 4 位，中间 4 位用 * 替换。
     *
     * <p>示例：
     * <ul>
     *   <li>{@code "13812345678"} -&gt; {@code "138****5678"}</li>
     *   <li>{@code "1385678"}（7 位，长度不足） -&gt; {@code "138*5678"} 模式降级</li>
     *   <li>{@code null} -&gt; {@code null}</li>
     * </ul>
     * </p>
     *
     * @param phone 原始手机号
     * @return 脱敏后的手机号，输入 null 时返回 null
     */
    public static String maskPhone(String phone) {
        if (phone == null) {
            return null;
        }
        int len = phone.length();
        // R4-01835/01836：阈值收敛为共享常量（与 SensitiveDataMasker 共用，
        // 标准 11 位 / 中长 7 位两个分支阈值）
        // 标准 11 位手机号：前 3 + 4 个 * + 后 4
        if (len >= com.campuslove.api.utils.SensitiveDataMasker.PHONE_LEN_STANDARD) {
            return phone.substring(0, 3)
                    + "****"
                    + phone.substring(len - 4);
        }
        // 长度 7-10：保留前 3 后 4，中间用 * 填充
        if (len >= PHONE_LEN_MEDIUM_7) {
            int maskLen = len - 7;
            return phone.substring(0, 3)
                    + repeat(MASK_CHAR, maskLen)
                    + phone.substring(len - 4);
        }
        // 长度不足 7：仅保留首尾各 1 位
        if (len <= 2) {
            return repeat(MASK_CHAR, len);
        }
        return phone.substring(0, 1)
                + repeat(MASK_CHAR, len - 2)
                + phone.substring(len - 1);
    }

    /**
     * 脱敏邮箱：@ 前仅显示前 2 位，其余用 * 替换；@ 后域名部分完整保留。
     *
     * <p>示例：
     * <ul>
     *   <li>{@code "test@example.com"} -&gt; {@code "te**@example.com"}</li>
     *   <li>{@code "a@b.com"}（@ 前仅 1 位） -&gt; {@code "a*@b.com"}</li>
     *   <li>{@code null} -&gt; {@code null}</li>
     *   <li>{@code "invalid-email"}（无 @） -&gt; 原样返回</li>
     * </ul>
     * </p>
     *
     * @param email 原始邮箱
     * @return 脱敏后的邮箱，输入 null 时返回 null
     */
    public static String maskEmail(String email) {
        if (email == null) {
            return null;
        }
        int atIdx = email.indexOf('@');
        if (atIdx <= 0) {
            // 无 @ 或 @ 在首位，无法按规则脱敏，原样返回
            return email;
        }
        String local = email.substring(0, atIdx);
        String domain = email.substring(atIdx); // 包含 @
        String maskedLocal;
        if (local.length() <= 2) {
            // @ 前不足 2 位：保留全部 + 补一个 *
            maskedLocal = local + repeat(MASK_CHAR, Math.max(1, 2 - local.length()));
        } else {
            // 保留前 2 位，其余 *
            maskedLocal = local.substring(0, 2) + repeat(MASK_CHAR, local.length() - 2);
        }
        return maskedLocal + domain;
    }

    /**
     * 重复字符 n 次。
     *
     * @param c   待重复字符
     * @param n   重复次数（&lt;= 0 时返回空串）
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
