package com.campuslove.api.media;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 媒体 URL 签名器（P0-2 收口的最后一寸：把会话凭据从图片 URL 里彻底拿掉）。
 *
 * <p>背景：{@code <image src>} 一类标签带不了 Authorization 头，此前只能把令牌拼进
 * {@code ?token=}。即便 R4-00407 已让 Tomcat 访问日志不记 query，URL 仍会进
 * 浏览器历史、上游代理/CDN 日志与开发者工具，而且拼进去的是**完整 24 小时会话 JWT**
 * ——泄露即等于整个账号被冒用。客户端改用短期媒体令牌可以缩小后果，但 5 分钟轮换
 * 会让每个图片 URL 变化、击穿图片缓存（{@code SafeImage} 的本地文件键含完整 URL）。</p>
 *
 * <p>本类提供第三条路：**能力型签名 URL**。签名只覆盖「路径 + 过期时刻」，
 * 因此它：
 * <ul>
 *   <li>不是会话凭据——拿不到用户角色、刷不了新令牌、进不了业务接口与 WebSocket
 *       （验证通过后注入的正是媒体令牌的 {@link MediaTokenPolicy#mediaAuthorities()}，
 *       所有既有的降权规则与测试原样适用）；</li>
 *   <li>逐路径绑定——一枚 {@code /media/7/a.jpg} 的签名读不了 {@code /media/7/b.jpg}，
 *       也读不了别人的目录；</li>
 *   <li>短期——{@link #TTL_SECONDS} 内有效，过期即 401。</li>
 * </ul>
 * 签发入口在 {@code MediaAccessController}，且**必须穿过与 GET 同一套归属/档位判定**，
 * 否则「能签名」本身会变成新的越权面。</p>
 *
 * <p>密钥：从 {@code app.jwt.secret} 派生（加域分隔标签后取 SHA-256），
 * 不新增一个必须部署的密钥项。派生意味着「签名密钥泄露」不直接给出 JWT 签名密钥
 * （需原像攻击），而两者同属一个部署的信任域，泄露任一都应整体轮换。
 * 想与 JWT 分家时，显式配置 {@code app.media.url-secret} 即可覆盖派生来源。</p>
 */
@Component
public class MediaUrlSigner {

    /** 签名有效期（秒）：15 分钟。够覆盖一次会话内的图片浏览，又限制 URL 外泄后的可用窗口。 */
    public static final long TTL_SECONDS = 15L * 60;

    /** 域分隔标签：防止同一底层密钥被当成其他用途的 HMAC 密钥复用。 */
    private static final String DOMAIN_TAG = "campus-love:media-url:v1|";

    /** 参与签名的查询参数名（URL 形态：{@code ?exp=<epochSec>&sig=<hex>}）。 */
    public static final String PARAM_EXPIRES = "exp";
    public static final String PARAM_SIGNATURE = "sig";

    /** 截断到 16 字节（128 位）：能力 URL 无需完整 256 位，URL 更短且强度足够。 */
    private static final int SIGNATURE_BYTES = 16;

    private final byte[] signingKey;

    public MediaUrlSigner(
            @Value("${app.media.url-secret:}") String configuredSecret,
            @Value("${app.jwt.secret:}") String jwtSecret) {
        String source = !configuredSecret.isBlank() ? configuredSecret : jwtSecret;
        if (source.isBlank()) {
            throw new IllegalStateException(
                    "媒体 URL 签名密钥未配置：需要 app.media.url-secret 或 app.jwt.secret");
        }
        this.signingKey = sha256(DOMAIN_TAG + source);
    }

    /** 计算某路径在 expiresEpochSec 之前的访问签名（hex，小写，32 字符）。 */
    public String sign(String path, long expiresEpochSec) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
            byte[] full = mac.doFinal(canonical(path, expiresEpochSec).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(truncate(full, SIGNATURE_BYTES));
        } catch (java.security.InvalidKeyException | NoSuchAlgorithmException ex) {
            throw new IllegalStateException("媒体 URL 签名计算失败", ex);
        }
    }

    /**
     * 校验签名：路径与过期时刻必须与签发时逐字一致，且未过期。
     *
     * <p>比较走 {@link MessageDigest#isEqual}（常量时间），避免用响应时间逐字节猜签名。
     * 过期判定不留时钟偏移容忍——签发方与校验方是同一个进程，没有跨机时钟偏差问题。</p>
     */
    public boolean verify(String path, long expiresEpochSec, String signature) {
        if (path == null || signature == null || signature.isBlank()) {
            return false;
        }
        if (expiresEpochSec <= Instant.now().getEpochSecond()) {
            return false;
        }
        byte[] expected;
        try {
            expected = HexFormat.of().parseHex(signature.trim());
        } catch (IllegalArgumentException notHex) {
            return false;
        }
        byte[] actual = parseExpected(sign(path, expiresEpochSec));
        return actual != null && MessageDigest.isEqual(expected, actual);
    }

    /** 该路径此刻的过期时刻（now + {@link #TTL_SECONDS}，epoch 秒）。 */
    public long expiresAtNow() {
        return Instant.now().getEpochSecond() + TTL_SECONDS;
    }

    /** 拼出带签名的媒体 URL（不含站点前缀，供客户端直接当 src 用）。 */
    public String signedUrl(String path, long expiresEpochSec) {
        String separator = path.indexOf('?') >= 0 ? "&" : "?";
        return path + separator + PARAM_EXPIRES + "=" + expiresEpochSec
                + "&" + PARAM_SIGNATURE + "=" + sign(path, expiresEpochSec);
    }

    private static String canonical(String path, long expiresEpochSec) {
        return path + "|" + expiresEpochSec;
    }

    private static byte[] parseExpected(String hex) {
        try {
            return HexFormat.of().parseHex(hex);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static byte[] sha256(String input) {
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 不可用", ex);
        }
    }

    private static byte[] truncate(byte[] bytes, int keep) {
        if (bytes.length <= keep) {
            return bytes;
        }
        byte[] out = new byte[keep];
        System.arraycopy(bytes, 0, out, 0, keep);
        return out;
    }
}
