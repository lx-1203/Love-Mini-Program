package com.campuslove.api.auth;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.config.WeChatConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.utils.SensitiveDataMasker;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

/**
 * 微信手机号绑定控制器。
 * 仅在 real profile 下激活，提供 {@code POST /api/v1/auth/phone/bind} 端点，
 * 通过微信 getPhoneNumber 回调 code 换取用户手机号并绑定到当前登录用户。
 *
 * <p>流程：</p>
 * <ol>
 *   <li>接收前端 {@code <button open-type="getPhoneNumber">} 回调中的 code</li>
 *   <li>使用 AppID + AppSecret 获取微信 access_token</li>
 *   <li>调用微信 getuserphonenumber 接口换取手机号</li>
 *   <li>将手机号加密存储到当前用户的 phone 字段</li>
 *   <li>返回脱敏后的手机号</li>
 * </ol>
 *
 * <p>安全说明：</p>
 * <ul>
 *   <li>手机号经 {@link AesEncryptor} 加密后存储，数据库泄露不暴露明文</li>
 *   <li>日志输出经 {@link SensitiveDataMasker#maskPhone} 脱敏</li>
 *   <li>access_token 不缓存，每次请求实时获取（调用频率低，简化实现）</li>
 * </ul>
 */
@Tag(name = "Auth", description = "认证相关接口")
@RestController
@RequestMapping("/api/v1/auth")
@Profile("real")
public class PhoneBindingController {

    private static final Logger log = LoggerFactory.getLogger(PhoneBindingController.class);

    private static final String GET_ACCESS_TOKEN_URL =
            "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appId}&secret={appSecret}";
    private static final String GET_PHONE_NUMBER_URL =
            "https://api.weixin.qq.com/wxa/getuserphonenumber?access_token={accessToken}";

    private final WeChatConfig weChatConfig;
    private final UserRepository userRepository;
    private final AesEncryptor aesEncryptor;
    private final RestClient restClient;

    public PhoneBindingController(
            WeChatConfig weChatConfig,
            UserRepository userRepository,
            AesEncryptor aesEncryptor,
            RestClient.Builder restClientBuilder) {
        this.weChatConfig = weChatConfig;
        this.userRepository = userRepository;
        this.aesEncryptor = aesEncryptor;
        this.restClient = restClientBuilder.build();
    }

    /**
     * 微信手机号绑定：通过 getPhoneNumber 回调 code 换取手机号并绑定到当前用户。
     *
     * <p>前置条件：用户已登录（JWT 有效），即必须先通过微信/手机号/体验账号登录。</p>
     *
     * <p>错误场景：</p>
     * <ul>
     *   <li>code 无效或已过期（微信 errcode=40029）→ 抛出 IllegalArgumentException</li>
     *   <li>access_token 获取失败 → 抛出 IllegalStateException</li>
     *   <li>当前用户不存在 → 抛出 IllegalArgumentException</li>
     * </ul>
     *
     * @param request 包含微信 getPhoneNumber 回调 code 的请求体
     * @return ApiResponse 包含脱敏手机号
     */
    @PostMapping("/phone/bind")
    @Operation(
            summary = "微信手机号绑定",
            description = "通过微信 getPhoneNumber 回调 code 换取手机号并绑定到当前登录用户。手机号经 AES 加密存储。",
            operationId = "bindPhoneViaWechat"
    )
    public ApiResponse<Map<String, String>> bindPhone(@Valid @RequestBody PhoneBindRequest request) {
        // 1. 获取当前登录用户
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow(() ->
                new IllegalArgumentException(ErrorMessages.USER_NOT_FOUND));

        // 2. 获取微信 access_token
        String accessToken = getAccessToken();

        // 3. 调用微信 getuserphonenumber 接口换取手机号
        String phoneNumber = getPhoneNumber(accessToken, request.code());

        // 4. 加密存储手机号
        String phoneCipher = aesEncryptor.encrypt(phoneNumber);
        user.setPhone(phoneCipher);
        user.setUpdatedAt(java.time.LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS));
        userRepository.save(user);

        log.info("手机号绑定成功: userId={}, phone={}", userId, SensitiveDataMasker.maskPhone(phoneNumber));

        // 5. 返回脱敏手机号
        String maskedPhone = SensitiveDataMasker.maskPhone(phoneNumber);
        return ApiResponse.ok(Map.of("phone", maskedPhone));
    }

    /**
     * 获取微信 access_token。
     *
     * <p>使用 AppID + AppSecret 调用微信 cgi-bin/token 接口获取。
     * 当前实现不缓存 token（每次请求实时获取），因绑定操作频率极低。</p>
     *
     * @return access_token 字符串
     * @throws IllegalStateException 当 access_token 获取失败时
     */
    private String getAccessToken() {
        Map<String, String> uriVars = Map.of(
                "appId", weChatConfig.getAppId(),
                "appSecret", weChatConfig.getAppSecret());

        try {
            AccessTokenResponse resp = restClient.get()
                    .uri(GET_ACCESS_TOKEN_URL, uriVars)
                    .retrieve()
                    .body(AccessTokenResponse.class);

            if (resp == null || resp.accessToken == null || resp.accessToken.isBlank()) {
                String errMsg = resp != null ? resp.errmsg : "empty response";
                log.error("获取微信 access_token 失败: {}", errMsg);
                throw new IllegalStateException("获取微信 access_token 失败: " + errMsg);
            }
            return resp.accessToken;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("调用微信 access_token 接口异常", ex);
            throw new IllegalStateException("获取微信 access_token 失败: " + ex.getMessage(), ex);
        }
    }

    /**
     * 调用微信 getuserphonenumber 接口，用 code 换取手机号。
     *
     * @param accessToken 微信 access_token
     * @param code        getPhoneNumber 回调 code
     * @return 手机号字符串（如 "13800138000"）
     * @throws IllegalArgumentException 当 code 无效或已过期时
     * @throws IllegalStateException    当接口调用失败时
     */
    private String getPhoneNumber(String accessToken, String code) {
        Map<String, String> uriVars = Map.of("accessToken", accessToken);

        try {
            PhoneNumberResponse resp = restClient.post()
                    .uri(GET_PHONE_NUMBER_URL, uriVars)
                    .body(Map.of("code", code))
                    .retrieve()
                    .body(PhoneNumberResponse.class);

            if (resp == null) {
                log.error("微信 getuserphonenumber 返回空响应");
                throw new IllegalStateException("微信手机号获取失败：空响应");
            }

            if (resp.errcode != null && resp.errcode != 0) {
                log.warn("微信 getuserphonenumber 错误: errcode={}, errmsg={}", resp.errcode, resp.errmsg);
                // 40029: code 无效或已过期
                if (resp.errcode == 40029) {
                    throw new IllegalArgumentException("手机号获取凭证已失效，请重试");
                }
                throw new IllegalStateException("微信手机号获取失败: " + resp.errmsg);
            }

            if (resp.phoneInfo == null || resp.phoneInfo.phoneNumber == null) {
                log.error("微信 getuserphonenumber 响应缺少 phone_info");
                throw new IllegalStateException("微信手机号获取失败：响应格式异常");
            }

            return resp.phoneInfo.phoneNumber;
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("调用微信 getuserphonenumber 接口异常", ex);
            throw new IllegalStateException("微信手机号获取失败: " + ex.getMessage(), ex);
        }
    }

    // ========== 请求/响应 DTO ==========

    /**
     * 手机号绑定请求体。
     *
     * @param code 微信 getPhoneNumber 回调 code（不可为空）
     */
    public record PhoneBindRequest(@NotBlank(message = "code 不能为空") String code) {}

    /**
     * 微信 access_token 接口响应体。
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class AccessTokenResponse {
        @JsonProperty("access_token")
        String accessToken;
        @JsonProperty("expires_in")
        Integer expiresIn;
        @JsonProperty("errcode")
        Integer errcode;
        @JsonProperty("errmsg")
        String errmsg;
    }

    /**
     * 微信 getuserphonenumber 接口响应体。
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class PhoneNumberResponse {
        @JsonProperty("errcode")
        Integer errcode;
        @JsonProperty("errmsg")
        String errmsg;
        @JsonProperty("phone_info")
        PhoneInfo phoneInfo;
    }

    /**
     * 手机号信息。
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class PhoneInfo {
        @JsonProperty("phoneNumber")
        String phoneNumber;
        @JsonProperty("purePhoneNumber")
        String purePhoneNumber;
        @JsonProperty("countryCode")
        String countryCode;
    }
}
