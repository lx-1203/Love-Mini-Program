package com.campuslove.api.wxpay;

import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.monitor.PaymentMetrics;
import com.campuslove.api.vip.VipOrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 微信退款结果回调控制器（real profile）。
 *
 * <p>POST /api/v1/refund/notify —— 与支付回调同一套防护：
 * 配置闸（enabled=false 时 404）→ IP 白名单 → 真实验签（RSA-SHA256 + 防重放）→
 * AES-256-GCM 解密 → 订单状态机 REFUNDING/SUCCESS → REFUNDED + REFUND 账单。</p>
 *
 * <p>安全放行：SecurityConfig permitAll（/api/v1/refund/notify，微信服务器无 JWT），
 * 防护全部在端点内完成。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/refund")
public class WxPayRefundNotifyController {

    private static final Logger log = LoggerFactory.getLogger(WxPayRefundNotifyController.class);

    private final WxPayProperties wxPayProperties;
    private final WxPayCallbackVerifier wxPayCallbackVerifier;
    private final WxPayCallbackGuard wxPayCallbackGuard;
    private final VipOrderService vipOrderService;
    private final ObjectMapper objectMapper;
    /** 回调失败指标（2026-10-05 接线：退款回调失败按 reason 计数，与支付回调同一告警体系） */
    private final PaymentMetrics paymentMetrics;

    public WxPayRefundNotifyController(WxPayProperties wxPayProperties,
                                       WxPayCallbackVerifier wxPayCallbackVerifier,
                                       WxPayCallbackGuard wxPayCallbackGuard,
                                       VipOrderService vipOrderService,
                                       ObjectMapper objectMapper,
                                       PaymentMetrics paymentMetrics) {
        this.wxPayProperties = wxPayProperties;
        this.wxPayCallbackVerifier = wxPayCallbackVerifier;
        this.wxPayCallbackGuard = wxPayCallbackGuard;
        this.vipOrderService = vipOrderService;
        this.objectMapper = objectMapper;
        this.paymentMetrics = paymentMetrics;
    }

    /**
     * 退款结果通知端点。
     *
     * <p>信封结构与支付回调一致（resource.associated_data=refund），解密载荷为
     * {@code {out_trade_no, refund_id, refund_status, amount{refund,total}, ...}}。</p>
     *
     * @param signature Wechatpay-Signature 头
     * @param timestamp Wechatpay-Timestamp 头（秒级）
     * @param nonce     Wechatpay-Nonce 头
     * @param serial    Wechatpay-Serial 头（留痕）
     * @param body      回调请求体原文
     * @param request   HTTP 请求（IP 白名单）
     * @return 微信标准应答体 {"code":"SUCCESS"/"FAIL","message":"..."}
     */
    @PostMapping("/notify")
    public Map<String, String> handleRefundNotify(
            @RequestHeader(value = "Wechatpay-Signature", required = false) String signature,
            @RequestHeader(value = "Wechatpay-Timestamp", required = false) String timestamp,
            @RequestHeader(value = "Wechatpay-Nonce", required = false) String nonce,
            @RequestHeader(value = "Wechatpay-Serial", required = false) String serial,
            @RequestBody String body,
            HttpServletRequest request) {
        // 1. 配置闸：微信支付未启用时端点直接 404
        if (wxPayProperties == null || !wxPayProperties.isEnabled()) {
            throw new ResourceNotFoundException("资源不存在");
        }

        // 2. IP 白名单（优先 X-Forwarded-For 首跳）
        String remoteIp = resolveClientIp(request);
        if (!wxPayCallbackGuard.isIpAllowed(remoteIp)) {
            throw new ResourceNotFoundException("资源不存在");
        }

        // 3. 真实验签（平台证书 RSA-SHA256 + 时间戳防重放）
        if (!wxPayCallbackVerifier.verifyCallback(timestamp, nonce, body, signature)) {
            log.warn("退款回调验签失败，拒绝处理：remoteIp={}, serial={}", remoteIp, serial);
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("signature_invalid");
            }
            return Map.of("code", "FAIL", "message", "验签失败");
        }

        // 4. 解析信封 + AES-256-GCM 解密 resource
        WxPayModels.WxPayNotification notification;
        try {
            notification = objectMapper.readValue(body, WxPayModels.WxPayNotification.class);
        } catch (Exception e) {
            log.warn("退款回调信封解析失败：{}", e.getMessage());
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("envelope_invalid");
            }
            return Map.of("code", "FAIL", "message", "报文格式错误");
        }
        if (notification == null || notification.resource() == null) {
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("envelope_invalid");
            }
            return Map.of("code", "FAIL", "message", "报文缺少 resource");
        }
        String plain;
        try {
            plain = wxPayCallbackVerifier.decryptResource(
                    notification.resource().ciphertext(),
                    notification.resource().associatedData(),
                    notification.resource().nonce());
        } catch (RuntimeException e) {
            log.warn("退款回调解密失败：notificationId={}, error={}", notification.id(), e.getMessage());
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("decrypt_failed");
            }
            return Map.of("code", "FAIL", "message", "解密失败");
        }

        // 5. 解析退款载荷并迁移订单状态机（REFUNDING/SUCCESS → REFUNDED）
        WxPayModels.WxPayRefundPayload payload;
        try {
            payload = objectMapper.readValue(plain, WxPayModels.WxPayRefundPayload.class);
        } catch (Exception e) {
            log.warn("退款回调载荷解析失败：notificationId={}, error={}", notification.id(), e.getMessage());
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("payload_invalid");
            }
            return Map.of("code", "FAIL", "message", "报文格式错误");
        }

        try {
            String result = vipOrderService.handleRefundNotification(payload, notification.id(), body, null);
            if ("SUCCESS".equals(result)) {
                return Map.of("code", "SUCCESS", "message", "成功");
            }
            // 业务 FAIL（订单不存在/非法迁移/账单写失败）：reason 已在 VipOrderService 内按分支记录
            return Map.of("code", "FAIL", "message", "处理失败");
        } catch (RuntimeException e) {
            log.error("退款回调处理异常：notificationId={}, orderNo={}",
                    notification.id(), payload != null ? payload.outTradeNo() : null, e);
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("internal_error");
            }
            return Map.of("code", "FAIL", "message", "处理异常");
        }
    }

    /** 解析客户端真实 IP：X-Forwarded-For 首跳 → X-Real-IP → remoteAddr。 */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return WxPayCallbackGuard.normalizeIp(comma > 0 ? xff.substring(0, comma) : xff);
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) {
            return WxPayCallbackGuard.normalizeIp(xri);
        }
        return request.getRemoteAddr();
    }
}
