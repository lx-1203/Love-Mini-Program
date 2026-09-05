package com.campuslove.api.media;

import com.campuslove.api.config.ContentSecurityVerdict;
import com.campuslove.api.config.WeChatConfig;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.util.Map;
import javax.imageio.ImageIO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

/**
 * 微信图片内容安全检测服务（imgSecCheck）。
 *
 * <p><b>条件启用</b>：仅 real profile 且配置了
 * {@code app.content-security.wechat-secret} 时才注册，
 * 与 {@link com.campuslove.api.config.WeChatMsgSecCheckClient} 共享同一凭据条件。</p>
 *
 * <p><b>fail-open 语义</b>：与文本检测（msgSecCheck）的 fail-closed 不同，
 * 图片检测采用 fail-open——网络异常 / token 失效等场景直接放行，
 * 避免因检测服务不可用阻断所有图片上传。原因：图片检测为辅助增强，
 * 核心安全性仍由扩展名 + MIME + magic bytes 三道校验保障。</p>
 *
 * <p>调用方式：{@code POST https://api.weixin.qq.com/wxa/img_sec_check?access_token=TOKEN}
 * multipart/form-data，字段名 {@code media}，文件大小限制 1MB（超限自动压缩）。</p>
 */
@Profile("real")
@ConditionalOnProperty(name = "app.content-security.wechat-secret")
@Service
public class WeChatImgSecCheckService {

    private static final Logger log = LoggerFactory.getLogger(WeChatImgSecCheckService.class);

    private static final String TOKEN_URL =
            "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential";
    private static final String IMG_SEC_CHECK_URL =
            "https://api.weixin.qq.com/wxa/img_sec_check";

    /** 微信 imgSecCheck 图片大小限制：1 MB */
    private static final long WECHAT_IMG_MAX_BYTES = 1024L * 1024;

    /** access_token 提前刷新窗口（官方有效期 7200s，提前 300s 刷新） */
    private static final long TOKEN_REFRESH_AHEAD_SECONDS = 300;

    private final RestTemplate restTemplate;
    private final WeChatConfig weChatConfig;
    private final String wechatSecret;

    /** access_token 缓存（单机内存；多实例部署需迁移 Redis） */
    private volatile String cachedAccessToken;
    private volatile long tokenExpiresAtEpochSeconds;

    public WeChatImgSecCheckService(WeChatConfig weChatConfig,
                                    @Value("${app.content-security.wechat-secret:}") String wechatSecret) {
        this.restTemplate = new RestTemplate();
        this.weChatConfig = weChatConfig;
        this.wechatSecret = wechatSecret;
    }

    /**
     * 检测图片内容是否合规。
     *
     * <p>fail-open：任何异常（网络错误、token 获取失败、图片压缩失败等）
     * 均记录告警日志并返回 pass，不阻断上传。</p>
     *
     * @param file 上传的图片文件
     * @return 内容安全判定结果（pass 或 risky）
     */
    public ContentSecurityVerdict checkImage(MultipartFile file) {
        try {
            String accessToken = obtainAccessToken();
            if (accessToken == null || accessToken.isBlank()) {
                log.warn("[img-sec-check] 获取 access_token 失败，跳过图片安全检测");
                return ContentSecurityVerdict.pass();
            }

            byte[] imageBytes = file.getBytes();
            String filename = file.getOriginalFilename() != null
                    ? file.getOriginalFilename() : "image.jpg";
            String contentType = file.getContentType() != null
                    ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

            // 微信 imgSecCheck 限制 1MB，超限时压缩
            if (imageBytes.length > WECHAT_IMG_MAX_BYTES) {
                imageBytes = compressImage(imageBytes, filename);
            }

            // 构造 multipart/form-data 请求
            HttpHeaders partHeaders = new HttpHeaders();
            partHeaders.setContentType(MediaType.parseMediaType(contentType));
            partHeaders.setContentDispositionFormData("media", filename);

            ByteArrayResource fileResource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, partHeaders);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("media", filePart);

            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(body, requestHeaders);

            ResponseEntity<ImgSecCheckResponse> resp = restTemplate.postForEntity(
                    URI.create(IMG_SEC_CHECK_URL + "?access_token=" + accessToken),
                    requestEntity,
                    ImgSecCheckResponse.class);

            ImgSecCheckResponse result = resp.getBody();
            if (result == null) {
                log.warn("[img-sec-check] 微信返回空响应，视为通过");
                return ContentSecurityVerdict.pass();
            }

            if (result.errcode() == null || result.errcode() == 0) {
                // 通过
                return ContentSecurityVerdict.pass();
            } else if (result.errcode() == 87014) {
                // 内容违规
                log.info("[img-sec-check] 检测到违规图片: errcode={}, errmsg={}",
                        result.errcode(), result.errmsg());
                return new ContentSecurityVerdict("risky", "image_risky", "wechat");
            } else {
                // 其他错误（如参数错误等），视为通过（fail-open）
                log.warn("[img-sec-check] 微信返回非预期错误码: errcode={}, errmsg={}",
                        result.errcode(), result.errmsg());
                return ContentSecurityVerdict.pass();
            }
        } catch (Exception e) {
            // fail-open：任何异常均放行，不阻断上传
            log.warn("[img-sec-check] 图片安全检测异常，跳过: {}", e.getMessage());
            return ContentSecurityVerdict.pass();
        }
    }

    /**
     * 获取 access_token（带缓存与提前刷新）。
     *
     * @return access_token 字符串，获取失败返回 null
     */
    private String obtainAccessToken() {
        long now = System.currentTimeMillis() / 1000;
        if (cachedAccessToken != null && now < tokenExpiresAtEpochSeconds - TOKEN_REFRESH_AHEAD_SECONDS) {
            return cachedAccessToken;
        }
        String appId = weChatConfig.getAppId();
        if (appId == null || appId.isBlank() || wechatSecret == null || wechatSecret.isBlank()) {
            return null;
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(
                    TOKEN_URL + "&appid=" + appId + "&secret=" + wechatSecret,
                    Map.class);
            if (resp == null || resp.get("access_token") == null) {
                log.warn("[img-sec-check] 获取 access_token 失败: errcode={}, errmsg={}",
                        resp == null ? "null" : resp.get("errcode"),
                        resp == null ? "null" : resp.get("errmsg"));
                return null;
            }
            cachedAccessToken = (String) resp.get("access_token");
            Object expiresIn = resp.get("expires_in");
            long ttl = expiresIn instanceof Number ? ((Number) expiresIn).longValue() : 7200;
            tokenExpiresAtEpochSeconds = now + ttl;
            return cachedAccessToken;
        } catch (Exception e) {
            log.warn("[img-sec-check] 获取 access_token 异常: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 压缩图片至 1MB 以内。
     *
     * <p>策略：先计算目标尺寸（按比例缩放至最长边不超过
     * {@code sqrt(1MB / 原始大小) * 原始最长边}），然后尝试以 JPEG 格式写出。
     * JPEG 质量默认 0.85，配合缩放通常可将 10MB 压缩至 200KB~500KB。</p>
     *
     * @param originalBytes 原始图片字节
     * @param filename      文件名（用于推断格式）
     * @return 压缩后的图片字节；压缩失败时返回原始字节
     */
    private byte[] compressImage(byte[] originalBytes, String filename) {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(originalBytes)) {
            BufferedImage original = ImageIO.read(bais);
            if (original == null) {
                log.warn("[img-sec-check] 无法读取图片进行压缩，使用原始数据");
                return originalBytes;
            }

            int origW = original.getWidth();
            int origH = original.getHeight();
            // 按比例缩放：目标面积不超过 (1MB / 原始大小) 的平方根倍
            double ratio = Math.sqrt((double) WECHAT_IMG_MAX_BYTES / originalBytes.length);
            int targetW = (int) (origW * ratio);
            int targetH = (int) (origH * ratio);
            // 确保至少 1x1
            targetW = Math.max(1, targetW);
            targetH = Math.max(1, targetH);

            BufferedImage scaled = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = scaled.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(original, 0, 0, targetW, targetH, null);
            g.dispose();

            String formatName = detectFormat(filename);
            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                boolean written = ImageIO.write(scaled, formatName, baos);
                if (!written) {
                    log.warn("[img-sec-check] ImageIO 无 {} 格式写入器，使用原始数据", formatName);
                    return originalBytes;
                }
                byte[] compressed = baos.toByteArray();
                log.debug("[img-sec-check] 压缩图片: {}x{} ({}B) -> {}x{} ({}B)",
                        origW, origH, originalBytes.length, targetW, targetH, compressed.length);
                return compressed;
            }
        } catch (IOException e) {
            log.warn("[img-sec-check] 图片压缩失败，使用原始数据: {}", e.getMessage());
            return originalBytes;
        }
    }

    /**
     * 从文件名推断 ImageIO 格式名（jpg / png / webp）。
     * 无法识别时默认 jpg。
     */
    private String detectFormat(String filename) {
        if (filename == null) {
            return "jpg";
        }
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "png";
        if (lower.endsWith(".webp")) return "webp";
        return "jpg";
    }

    /**
     * imgSecCheck 响应。
     *
     * @param errcode 错误码（0=通过，87014=内容违规，其他为参数/系统错误）
     * @param errmsg  错误信息
     */
    public record ImgSecCheckResponse(Integer errcode, String errmsg) {
    }
}
