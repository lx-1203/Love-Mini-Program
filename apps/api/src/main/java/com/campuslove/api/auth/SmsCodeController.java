/**
 * 短信验证码控制器。
 *
 * 接口：
 *   POST /api/v1/sms/send-code  发送验证码
 *
 * 安全契约（验证码去假 fail-closed）：
 * <ul>
 *   <li>mock profile（本地演示）：返回 mockCode 供联调回填（模拟短信默认成功）。</li>
 *   <li>非 mock profile：绝不返回验证码本体——真实短信网关未配置时返回 503 明确错误；
 *       网关就绪时验证码经网关下发，响应仅含 success/expiresIn。</li>
 *   <li>限流：按手机号维度 1 次/分钟（令牌桶 capacity=1，每 60 秒补充 1 个），
 *       防止单号刷短信；同端点另有全局限流体系兜底（见 ratelimit 包）。</li>
 * </ul>
 */
package com.campuslove.api.auth;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.ratelimit.RateLimit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/v1/sms")
public class SmsCodeController {

    private static final Logger log = LoggerFactory.getLogger(SmsCodeController.class);

    private final SmsCodeService smsCodeService;

    public SmsCodeController(SmsCodeService smsCodeService) {
        this.smsCodeService = smsCodeService;
    }

    /**
     * 发送短信验证码。
     *
     * <p>mock profile 返回 mockCode（联调用）；真实环境不返回验证码本体
     * （网关未配置时 503）。按手机号维度限流 1 次/分钟。</p>
     *
     * @param request 手机号
     * @return 发送结果（mock profile 附带 mockCode；真实环境不含验证码字段）
     */
    @PostMapping("/send-code")
    @RateLimit(capacity = 1, refillTokens = 1.0 / 60, key = "#request.phone")
    public ApiResponse<Map<String, Object>> sendCode(@RequestBody SendCodeRequest request) {
        log.info("验证码发送请求: phone={}", maskPhone(request.phone()));
        // mock profile：模拟发送并回传 mockCode（本地演示契约保持不变）
        if (smsCodeService.isMockProfile()) {
            String code = smsCodeService.sendCode(request.phone());
            return ApiResponse.ok(Map.of(
                    "success", true,
                    "mockCode", code,
                    "expiresIn", "300秒",
                    "message", "验证码已发送（模拟短信：无真实短信网关，默认发送成功）"
            ));
        }
        // 真实环境：网关未配置时抛 503；网关就绪时下发且响应不含验证码本体
        smsCodeService.sendCode(request.phone());
        return ApiResponse.ok(Map.of(
                "success", true,
                "expiresIn", "300秒",
                "message", "验证码已发送，请查收短信"
        ));
    }

    /** 发送验证码请求体 */
    public record SendCodeRequest(
            @NotBlank(message = "手机号不能为空")
            @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
            String phone
    ) {
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
