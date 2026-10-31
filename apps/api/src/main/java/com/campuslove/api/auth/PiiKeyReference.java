package com.campuslove.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * PII 安全键引用（PII key reference）：把「手机号 / 账号名」等小空间敏感标识
 * 映射成不可逆的定长十六进制片段，供 Redis <b>key 名</b>使用。
 *
 * <p>为什么需要它（隐私清理，2026-10-31 数据轨）：Redis 开了 AOF 持久化
 * （{@code appendonly yes}），任何写入的 key 名都会落进 {@code appendonly.aof}
 * 追加日志。此前 {@code sms:code:13800001111}、{@code login:fail:13800001111}
 * 这类 key 把裸手机号写进 key 名——value 有 5 分钟 TTL，key 名却长期留在
 * AOF/RDB 备份里（备份介质通常比线上更难轮换）。key 名不是「值」，
 * 所以字段级加密（{@code AesEncryptor}）保护不到它，只能改用单向键引用。</p>
 *
 * <p>算法选择——<b>为什么不用裸 SHA-256</b>：11 位中国大陆手机号的有效号码空间
 * 远小于 2^64（前缀受运营商号段约束，实际约 10^10～4×10^10 量级），
 * 单台 GPU 数秒到数分钟即可全量枚举并反查，等于没做。因此使用
 * <b>HMAC-SHA256 + 服务端密钥</b>：反查需要同时拿到密钥，
 * 而密钥只在 real profile 强制非空（{@code app.security.strict-aes=true}
 * 已使 {@code APP_AES_SECRET} 成为启动必填项，密钥来源与 {@code AesEncryptor} 一致）。</p>
 *
 * <p>域分隔：派生输入混入固定标签 {@value #LABEL} 与调用方 purpose，
 * 使同一手机号在「短信验证码」与「登录失败计数」下得到<b>不同</b>的引用值，
 * 因此两类 key 之间无法互相当字典表用；输出再截断到 {@value #HEX_LENGTH} 个
 * 十六进制字符（128 bit 截断，碰撞概率对本场景的活跃 key 规模可忽略）。</p>
 *
 * <p>无密钥兜底（仅供 mock/单测）：密钥为空时使用<b>不加密钥</b>的 SHA-256 摘要，
 * 保证本地演示与手工构造的测试对象仍可运行；这会在全 JVM 内打印一次 warn，
 * 明确「此路径不抗枚举，仅限 mock」。real profile 不会走到该分支。</p>
 */
public final class PiiKeyReference {

    private static final Logger log = LoggerFactory.getLogger(PiiKeyReference.class);

    /** 固定域分隔标签：轮换它即可整体换一批 key 名（视为 key schema 版本升级） */
    static final String LABEL = "pii-keyref:v1:";

    /** 输出截断长度（十六进制字符数 = 128 bit） */
    static final int HEX_LENGTH = 32;

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    /** 无密钥兜底 warn 只打印一次（避免每次请求刷屏） */
    private static final AtomicBoolean UNKEYED_WARNED = new AtomicBoolean(false);

    private PiiKeyReference() {
    }

    /**
     * 计算敏感标识的 key 引用。
     *
     * @param secret  服务端密钥（{@code app.security.aes-secret}）；为空则走不加密钥的兜底摘要
     * @param purpose 域分隔用途（如 {@code sms-code} / {@code login-attempt}）
     * @param value   敏感原值（手机号、账号名）；null/空原样返回空串
     * @return 定长小写十六进制引用值，永不含输入原值
     */
    public static String of(String secret, String purpose, String value) {
        if (value == null) {
            return "";
        }
        String message = LABEL + purpose + ':' + value;
        if (secret == null || secret.isBlank()) {
            // 不加密钥的摘要仅用于 mock profile / 手工 new 出来的测试对象。
            // 真实号码空间可被枚举反查，绝不用于生产：real profile 下
            // strict-aes 已强制 APP_AES_SECRET 非空，正常启动不会进这个分支。
            warnUnkeyedOnce();
            return truncate(sha256Hex(message));
        }
        return truncate(hmacSha256Hex(secret, message));
    }

    private static void warnUnkeyedOnce() {
        if (UNKEYED_WARNED.compareAndSet(false, true)) {
            log.warn("PII key 引用使用【不加密钥】的 SHA-256 兜底：app.security.aes-secret 为空。"
                    + "该模式不抗号码枚举，仅允许出现在 mock profile 或单元测试中；"
                    + "real profile 必须配置 APP_AES_SECRET。");
        }
    }

    private static String hmacSha256Hex(String secret, String message) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            // 与 AesEncryptor.deriveKey 同口径：任意长度口令先压成 32 字节密钥，
            // 避免短口令直接做 HMAC key 带来的长度依赖。
            byte[] keyBytes = sha256Bytes(secret);
            mac.init(new SecretKeySpec(keyBytes, HMAC_ALGORITHM));
            return toHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException ex) {
            // HmacSHA256 是 JDK 标配算法，理论上不会缺失；缺失即配置/运行时损坏，fail-fast。
            throw new IllegalStateException("HmacSHA256 不可用，无法生成 PII key 引用", ex);
        }
    }

    private static String sha256Hex(String message) {
        return toHex(sha256Bytes(message));
    }

    private static byte[] sha256Bytes(String input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 不可用，无法生成 PII key 引用", ex);
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }

    private static String truncate(String hex) {
        return hex.length() <= HEX_LENGTH ? hex : hex.substring(0, HEX_LENGTH);
    }
}
