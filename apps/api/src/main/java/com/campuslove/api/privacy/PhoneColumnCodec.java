package com.campuslove.api.privacy;

import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.utils.SensitiveDataMasker;

/**
 * {@code users.phone} 列的<b>唯一</b>读写口径（P0：2026-10-31「一列三种语义」修复）。
 *
 * <p>修复前该列同时存在三种语义，互相踩踏：</p>
 * <table border="1">
 *   <caption>users.phone 的历史写入方</caption>
 *   <tr><th>写入方</th><th>写入语义</th></tr>
 *   <tr><td>{@code RealAuthService#registerUser}、{@code PhoneBindingController#bindPhone}、
 *       {@code RealAccountSecurityService#changePhone}</td><td>AES-GCM Base64 密文</td></tr>
 *   <tr><td>{@code AdminUserController#createUser/createAdmin}</td><td>明文手机号</td></tr>
 *   <tr><td>{@code RealAccountSecurityService#deactivateAccount}（旧实现）</td>
 *       <td>明文哨兵 {@code "1****" + userId} —— 既不加密、又把 userId 写进了手机号列</td></tr>
 * </table>
 *
 * <p>收敛后的口径只有三种合法取值，本类是它们的唯一出口：</p>
 * <ol>
 *   <li><b>AES-GCM 密文</b>——新写入一律走 {@link #store(AesEncryptor, String)}；</li>
 *   <li><b>历史明文</b>——迁移前的存量行，读取侧兼容、不再新增
 *       （{@code AdminUserController} 的明文写入属管理端建号路径，本次不动，见交付说明）；</li>
 *   <li><b>NULL = 已注销/未绑定</b>——即 {@link #ERASED_VALUE}。选 NULL 而不是任何字符串哨兵，理由：
 *     <ul>
 *       <li>列本就可空，体验号 {@code RealAuthService#loginAsGuest} 早已写 NULL，NULL 是被现有
 *           读取路径当作「未绑定手机号」处理的既有取值（{@code user.getPhone() != null && !isBlank()}），
 *           语义正确、无歧义；</li>
 *       <li>{@code uk_users_phone} 对 NULL 不去重，多个账号可同时注销且互不冲突；</li>
 *       <li>NULL 不含任何字符，永远不可能被 Base64/AES 解密路径误读，也不可能被
 *           {@link SensitiveDataMasker#maskPhone(String)} 二次加工后泄露片段；</li>
 *       <li>NULL 不携带 userId，因此不构成「可反推的稳定化名」。</li>
 *     </ul>
 *   </li>
 * </ol>
 *
 * <p>无状态、纯静态，线程安全。</p>
 */
public final class PhoneColumnCodec {

    /** 注销后 {@code users.phone} 的唯一合法表示：NULL（不是字符串哨兵）。 */
    public static final String ERASED_VALUE = null;

    private PhoneColumnCodec() {
        throw new UnsupportedOperationException("工具类不可实例化");
    }

    /**
     * 写入侧：把明文手机号转成该列应存的值。
     *
     * <p>{@code enc} 为 null（单测/未装配加密器的窄场景）时退化为原样存明文，与历史行为一致；
     * 空串归一为 NULL，避免 {@code uk_users_phone} 被空串占据（{@code V2026.08.08.0003} 已就
     * 空串做过一次数据清理，这里从写入侧断掉复发路径）。</p>
     *
     * @param enc       AES 加密器，可为 null
     * @param plaintext 明文手机号，可为 null
     * @return 密文（或退化明文）；{@code null}/空白输入返回 NULL
     */
    public static String store(AesEncryptor enc, String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return ERASED_VALUE;
        }
        return enc != null ? enc.encrypt(plaintext) : plaintext;
    }

    /**
     * 唯一性派生键：{@code "phone:" + SHA-256(明文) 的小写 hex}，写进 {@code users.openid}。
     *
     * <p>为什么必须有这个派生键而不是直接拿手机号当 openid：AES-GCM 用随机 IV，
     * 同一手机号每次密文都不同，密文既不能当唯一键也不能等值查重；而 openid 列是
     * NOT NULL + UNIQUE，历史上被写成 {@code "phone:" + 明文}，等于把同一个明文手机号
     * 在两个列里各存一遍——库里泄露一次就同时暴露两遍，且注销时只要漏掉 openid 就仍然可识别。</p>
     *
     * <p>口径与 {@code RealAuthService}（R4-00249）逐字一致，注册与后台建号必须走同一个派生，
     * 否则「同手机号已注册」的查重在两条路径上会给出不同答案。</p>
     *
     * @param plaintext 明文手机号
     * @return {@code "phone:<64 位小写 hex>"}；{@code null}/空白原样返回（沿用旧 hashOpenid 的宽容）
     */
    public static String derivedOpenid(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return plaintext;
        }
        return "phone:" + sha256Hex(plaintext);
    }

    /**
     * 不可逆小写 hex 摘要（SHA-256）。{@code derivedOpenid} 与 {@code RealAuthService#hashOpenid}
     * 共用这一份实现——两条路径的派生口径必须逐字相同，否则「该手机号是否已注册」
     * 在注册侧与后台建号侧会给出不同答案。
     *
     * @param value 原值；{@code null}/空白原样返回
     * @return 64 位小写 hex
     */
    public static String sha256Hex(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format(java.util.Locale.ROOT, "%02x", b));
            }
            return hex.toString();
        } catch (java.security.NoSuchAlgorithmException ex) {
            // SHA-256 是 JLS 要求每个实现都支持的算法；真到这一步只能显式失败，
            // 绝不能退回「存明文」——那正是本方法要消灭的形态。
            throw new IllegalStateException("SHA-256 不可用，无法生成不可逆派生键", ex);
        }
    }

    /**
     * 读取侧：把列里存的任何合法取值渲染成「本人可见的掩码手机号」。
     *
     * <p>不抛异常的保证：密文认证失败（密钥轮换/数据被篡改）时返回空串，既不泄露密文片段，
     * 也不会把 {@link IllegalStateException} 抛给导出/管理端读接口。</p>
     *
     * @param enc    AES 加密器，可为 null（此时按明文处理）
     * @param stored 列里的原始值（密文 / 历史明文 / NULL）
     * @return {@code 138****5678} 形态；NULL/空/解密失败返回空串
     */
    public static String displayMasked(AesEncryptor enc, String stored) {
        if (stored == null || stored.isEmpty()) {
            return "";
        }
        if (enc == null) {
            return SensitiveDataMasker.maskPhone(stored);
        }
        if (!enc.isEncrypted(stored)) {
            // 历史明文行（或本类写出的 NULL 之外的常量占位）：按明文掩码
            return SensitiveDataMasker.maskPhone(stored);
        }
        try {
            return SensitiveDataMasker.maskPhone(enc.decrypt(stored));
        } catch (RuntimeException ex) {
            return "";
        }
    }

    /**
     * 该列值是否表示「已注销 / 无手机号」。
     *
     * <p>空串也算：历史上 {@code V2026.08.08.0003} 之前存在过空串行，读侧必须同等处理。</p>
     */
    public static boolean isErasedOrAbsent(String stored) {
        return stored == null || stored.isBlank();
    }
}
