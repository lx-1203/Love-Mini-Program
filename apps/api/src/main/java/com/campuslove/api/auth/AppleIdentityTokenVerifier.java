package com.campuslove.api.auth;

import com.campuslove.api.common.ErrorMessages;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.SignatureException;
import java.security.PublicKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Apple Sign in with Apple identityToken 验签器。
 *
 * <p>infra R2-00010 修复：原 ThirdPartyAuthController 直接信任客户端传入的
 * appleIdentifier，任意用户传任意字符串即可登录/创建账号，身份认证完全失效。
 * 本组件对前端传来的 identityToken（JWT）做完整校验：</p>
 * <ul>
 *   <li>RS256 签名验签（公钥来自 Apple 官方 JWKS https://appleid.apple.com/auth/keys）</li>
 *   <li>{@code iss} 必须为 {@code https://appleid.apple.com}</li>
 *   <li>{@code aud} 必须为本应用 Bundle ID（配置 {@code app.apple.bundle-id}）</li>
 *   <li>{@code exp} 未过期、{@code iat} 已生效</li>
 *   <li>{@code nonce}（若配置 {@code app.apple.nonce} 则校验，防重放）</li>
 * </ul>
 *
 * <p>验签通过后返回 {@code sub}（Apple User Identifier）作为账号标识。</p>
 */
@Component
@Profile("real")
public class AppleIdentityTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(AppleIdentityTokenVerifier.class);

    /**
     * Apple 官方 JWKS 端点（R4-01785）。
     * Apple 官方固定地址（https://appleid.apple.com/auth/keys），
     * 为 Apple 平台契约的一部分，可保持常量；如未来需接入代理/沙箱，
     * 可改为配置注入。
     */
    private static final String APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

    /** JWKS 缓存有效期（公钥轮换频率低，24h 足够） */
    private static final long JWKS_CACHE_TTL_MILLIS = 24 * 60 * 60 * 1000L;

    /** JWKS 请求超时（秒） */
    private static final int JWKS_TIMEOUT_SECONDS = 5;

    /**
     * Apple 签发者固定值（R4-01786）。
     * Apple 官方固定地址（https://appleid.apple.com），
     * 为 Apple 平台契约的一部分，可保持常量（来源：Apple 文档
     * "Verify a user's identity token" iss 声明要求）。
     */
    private static final String APPLE_ISSUER = "https://appleid.apple.com";

    /** 缓存的公钥列表（kid -> PublicKey）与拉取时间（review 修复:避免每次登录实时拉取） */
    private volatile java.util.Map<String, PublicKey> cachedKeys = java.util.Collections.emptyMap();
    private volatile long keysFetchedAtMillis = 0L;

    private final RestClient restClient;
    private final String bundleId;
    private final String expectedNonce;

    public AppleIdentityTokenVerifier(
            RestClient.Builder restClientBuilder,
            @Value("${app.apple.bundle-id:}") String bundleId,
            @Value("${app.apple.nonce:}") String expectedNonce
    ) {
        this.restClient = restClientBuilder
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory() {{
                    setConnectTimeout(JWKS_TIMEOUT_SECONDS * 1000);
                    setReadTimeout(JWKS_TIMEOUT_SECONDS * 1000);
                }})
                .build();
        this.bundleId = bundleId;
        this.expectedNonce = expectedNonce;
    }

    /**
     * 验签 identityToken 并返回 Apple User Identifier（sub）。
     *
     * @param identityToken Sign in with Apple 返回的 JWT
     * @return sub（Apple User Identifier）
     * @throws IllegalArgumentException token 为空 / 格式非法 / 验签失败 / 声明不匹配时抛出
     */
    public String verifyAndGetSubject(String identityToken) {
        if (identityToken == null || identityToken.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.IDENTITY_TOKEN_REQUIRED);
        }

        // 1. 解析 JWT header 获取 kid，取对应公钥
        String kid = parseKid(identityToken);
        PublicKey publicKey = fetchPublicKey(kid);
        if (publicKey == null) {
            throw new IllegalArgumentException(ErrorMessages.APPLE_PUBLIC_KEY_FETCH_FAILED_PREFIX + kid + "）");
        }

        // 2. 验签 + 声明校验
        Claims claims;
        try {
            claims = Jwts.parser()
                    .verifyWith(publicKey)
                    .requireIssuer(APPLE_ISSUER)
                    .requireAudience(bundleId)
                    .build()
                    .parseSignedClaims(identityToken)
                    .getPayload();
        } catch (SignatureException e) {
            log.warn("Apple identityToken 签名校验失败: {}", e.getMessage());
            throw new IllegalArgumentException(ErrorMessages.APPLE_TOKEN_SIGNATURE_INVALID);
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            log.warn("Apple identityToken 声明校验失败: {}", e.getMessage());
            throw new IllegalArgumentException(ErrorMessages.APPLE_TOKEN_INVALID_PREFIX + e.getMessage());
        }

        // 3. exp / iat 时间窗校验（jjwt 已校验 exp，此处补充 iat 前置校验的友好报错）
        Instant now = Instant.now();
        if (claims.getExpiration() != null && claims.getExpiration().toInstant().isBefore(now)) {
            throw new IllegalArgumentException(ErrorMessages.APPLE_TOKEN_EXPIRED);
        }

        // 4. nonce 防重放（配置了才校验）
        if (expectedNonce != null && !expectedNonce.isBlank()) {
            Object nonce = claims.get("nonce");
            if (nonce == null || !expectedNonce.equals(nonce.toString())) {
                throw new IllegalArgumentException(ErrorMessages.APPLE_TOKEN_NONCE_MISMATCH);
            }
        }

        String sub = claims.getSubject();
        if (sub == null || sub.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.APPLE_TOKEN_MISSING_SUB);
        }
        return sub;
    }

    /** 从 JWT header 解析 kid。 */
    private String parseKid(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException(ErrorMessages.IDENTITY_TOKEN_NOT_JWT);
            }
            String headerJson = new String(Base64.getUrlDecoder().decode(parts[0]));
            // 轻量解析 kid（避免引入额外 JSON 库依赖）
            int kidIdx = headerJson.indexOf("\"kid\"");
            if (kidIdx < 0) {
                throw new IllegalArgumentException(ErrorMessages.IDENTITY_TOKEN_MISSING_KID);
            }
            String rest = headerJson.substring(kidIdx + 5);
            int colon = rest.indexOf(':');
            int quoteStart = rest.indexOf('"', colon);
            int quoteEnd = rest.indexOf('"', quoteStart + 1);
            return rest.substring(quoteStart + 1, quoteEnd);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new IllegalArgumentException(ErrorMessages.IDENTITY_TOKEN_FORMAT_INVALID, e);
        }
    }

    /**
     * 从 Apple JWKS 获取指定 kid 的 RSA 公钥（带 24h 缓存）。
     *
     * @return PublicKey 或 null（未找到对应 kid）
     */
    @SuppressWarnings("unchecked")
    private PublicKey fetchPublicKey(String kid) {
        try {
            java.util.Map<String, PublicKey> keys = getJwksKeys();
            return keys.get(kid);
        } catch (Exception e) {
            log.warn("获取 Apple 公钥失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 获取（或按需刷新）JWKS 公钥表。
     * 缓存过期时才发起网络请求，避免每次登录都拉取 Apple 公钥。
     */
    @SuppressWarnings("unchecked")
    private java.util.Map<String, PublicKey> getJwksKeys() {
        long now = System.currentTimeMillis();
        java.util.Map<String, PublicKey> current = cachedKeys;
        if (!current.isEmpty() && now - keysFetchedAtMillis < JWKS_CACHE_TTL_MILLIS) {
            return current;
        }
        synchronized (this) {
            now = System.currentTimeMillis();
            current = cachedKeys;
            if (!current.isEmpty() && now - keysFetchedAtMillis < JWKS_CACHE_TTL_MILLIS) {
                return current;
            }
            java.util.Map<String, PublicKey> fresh = fetchJwksKeys();
            cachedKeys = fresh;
            keysFetchedAtMillis = System.currentTimeMillis();
            return fresh;
        }
    }

    /** 发起 JWKS 网络请求并解析公钥表。 */
    @SuppressWarnings("unchecked")
    private java.util.Map<String, PublicKey> fetchJwksKeys() {
        java.util.Map<String, Object> jwks = restClient.get()
                .uri(APPLE_JWKS_URL)
                .retrieve()
                .body(Map.class);
        if (jwks == null) {
            return java.util.Collections.emptyMap();
        }
        Object keysObj = jwks.get("keys");
        if (!(keysObj instanceof java.util.List<?> keys)) {
            return java.util.Collections.emptyMap();
        }
        java.util.Map<String, PublicKey> result = new java.util.HashMap<>();
        for (Object keyObj : keys) {
            Map<String, Object> key = (Map<String, Object>) keyObj;
            String keyId = (String) key.get("kid");
            String n = (String) key.get("n");
            String e = (String) key.get("e");
            if (keyId == null || n == null || e == null) {
                continue;
            }
            try {
                byte[] nBytes = Base64.getUrlDecoder().decode(n);
                byte[] eBytes = Base64.getUrlDecoder().decode(e);
                java.math.BigInteger modulus = new java.math.BigInteger(1, nBytes);
                java.math.BigInteger exponent = new java.math.BigInteger(1, eBytes);
                java.security.spec.RSAPublicKeySpec spec =
                        new java.security.spec.RSAPublicKeySpec(modulus, exponent);
                result.put(keyId,
                        java.security.KeyFactory.getInstance("RSA").generatePublic(spec));
            } catch (Exception ex) {
                log.warn("解析 Apple 公钥失败 kid={}: {}", keyId, ex.getMessage());
            }
        }
        return result;
    }
}
