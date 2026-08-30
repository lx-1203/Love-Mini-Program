/**
 * 短信验证码控制器（模拟短信收发）。
 *
 * 接口：
 *   POST /api/v1/sms/send-code  发送验证码（模拟成功，返回 mockCode 供联调）
 *
 * 说明：项目当前无短信基础设施，发送为模拟实现——"填入手机号后默认成功发送短信，
 * 用户输入返回的 mockCode 即视为已收到短信"。接入真实短信网关后仅替换
 * SmsCodeService 发送实现，接口契约不变。
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
     * 发送短信验证码（模拟：默认成功）。
     *
     * @param request 手机号
     * @return 发送结果 + mockCode（模拟联调用；真实短信场景不返回验证码本体）
     */
    @PostMapping("/send-code")
    public ApiResponse<Map<String, Object>> sendCode(@RequestBody SendCodeRequest request) {
        String code = smsCodeService.sendCode(request.phone());
        log.info("验证码发送请求: phone={}", maskPhone(request.phone()));
        return ApiResponse.ok(Map.of(
                "success", true,
                "mockCode", code,
                "expiresIn", "300秒",
                "message", "验证码已发送（模拟短信：无真实短信网关，默认发送成功）"
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
