package com.campuslove.api.vip;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.config.FeatureSwitch;
import com.campuslove.api.config.FeatureSwitchKeys;
import com.campuslove.api.monitor.PaymentMetrics;
import com.campuslove.api.wxpay.WxPayCallbackGuard;
import com.campuslove.api.wxpay.WxPayCallbackVerifier;
import com.campuslove.api.wxpay.WxPayModels;
import com.campuslove.api.wxpay.WxPayProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * VIP 账单控制器（real profile）。
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>POST /api/v1/vip/bills/payment-callback：微信支付回调（真实验签 + 解密 + 防重放）</li>
 *   <li>GET /api/v1/vip/bills?page=&amp;size=：查询当前用户的账单列表（分页）</li>
 *   <li>POST /api/v1/vip/bills/purchase：VIP 购买（钱包支付，优惠码折扣消费方）</li>
 * </ul>
 *
 * <p><b>回调安全（2026-10-05 微信支付工程补齐）</b>——替代原「非空即过」骨架验签：</p>
 * <ol>
 *   <li>配置闸：app.wechat-pay.enabled=false 时端点直接 404（不再依赖
 *       「permitAll 但没人会调」的假设）；</li>
 *   <li>IP 白名单：app.wechat-pay.callback-ip-whitelist 非空时来源 IP 不在名单内 404
 *       （空名单=不限制但输出告警日志）；</li>
 *   <li>真实验签：Wechatpay-Signature 头 RSA-SHA256 验签（平台证书公钥，签名串
 *       timestamp\nnonce\nbody\n）+ 时间戳偏移 5 分钟内（防重放）；</li>
 *   <li>解密：resource.ciphertext AES-256-GCM（APIv3 密钥）；</li>
 *   <li>业务幂等：订单状态机为准（见 {@link VipOrderService#handlePayNotification}），
 *       不再依赖可被「同 orderNo 换新 notificationId」绕过的双键查询。</li>
 * </ol>
 *
 * <p>安全放行：本端点由微信服务器调用（无 JWT），SecurityConfig 与 MockSecurityConfig
 * 均对实际注册路径 {@code /api/v1/vip/bills/payment-callback} permitAll（2026-10-11 修正：
 * 历史上白名单写的是 {@code /api/v1/vip/payment-callback}，与类级前缀 + 方法路径拼出的
 * 真实路径不等，回调会被 {@code /api/v1/**} 的 authenticated() 拦成 401），
 * 防护全部在端点内完成。</p>
 */
@Profile("real")
@Validated
@RestController
@RequestMapping("/api/v1/vip/bills")
public class BillingController {

    private static final Logger log = LoggerFactory.getLogger(BillingController.class);

    private final BillingService billingService;
    private final VipOrderService vipOrderService;
    private final WxPayProperties wxPayProperties;
    private final WxPayCallbackVerifier wxPayCallbackVerifier;
    private final WxPayCallbackGuard wxPayCallbackGuard;
    private final ObjectMapper objectMapper;
    /** 支付回调失败指标（2026-10-05 接线：验签/解密/报文解析失败按 reason 计数，供 PaymentCallbackFailure 告警消费） */
    private final PaymentMetrics paymentMetrics;

    public BillingController(BillingService billingService,
                             VipOrderService vipOrderService,
                             WxPayProperties wxPayProperties,
                             WxPayCallbackVerifier wxPayCallbackVerifier,
                             WxPayCallbackGuard wxPayCallbackGuard,
                             ObjectMapper objectMapper,
                             PaymentMetrics paymentMetrics) {
        this.billingService = billingService;
        this.vipOrderService = vipOrderService;
        this.wxPayProperties = wxPayProperties;
        this.wxPayCallbackVerifier = wxPayCallbackVerifier;
        this.wxPayCallbackGuard = wxPayCallbackGuard;
        this.objectMapper = objectMapper;
        this.paymentMetrics = paymentMetrics;
    }

    /**
     * 微信支付回调端点。
     * POST /api/v1/vip/bills/payment-callback
     *
     * <p>流程：配置闸 → IP 白名单 → 验签（RSA-SHA256 + 防重放时间窗）→
     * AES-256-GCM 解密 resource → 订单状态机处理（幂等）→ 按微信约定应答。
     * 验签失败/解密失败/业务失败返回 {@code {"code":"FAIL"}}，微信将按重试策略重发。</p>
     *
     * @param signature 微信签名（请求头 Wechatpay-Signature）
     * @param timestamp 微信时间戳（请求头 Wechatpay-Timestamp，秒级）
     * @param nonce     随机串（请求头 Wechatpay-Nonce）
     * @param serial    平台证书序列号（请求头 Wechatpay-Serial，留痕）
     * @param body      回调请求体原文（raw body，验签与留痕依赖原文不可改写）
     * @param request   HTTP 请求（来源 IP 白名单校验）
     * @return 微信标准应答体 {"code":"SUCCESS"/"FAIL","message":"..."}
     */
    @PostMapping("/payment-callback")
    public Map<String, String> handleWechatPayCallback(
            @RequestHeader(value = "Wechatpay-Signature", required = false) String signature,
            @RequestHeader(value = "Wechatpay-Timestamp", required = false) String timestamp,
            @RequestHeader(value = "Wechatpay-Nonce", required = false) String nonce,
            @RequestHeader(value = "Wechatpay-Serial", required = false) String serial,
            @RequestBody String body,
            HttpServletRequest request) {
        // 1. 配置闸：微信支付未启用时端点直接 404（管道未开闸，杜绝任何伪造请求进业务）
        if (wxPayProperties == null || !wxPayProperties.isEnabled()) {
            throw new ResourceNotFoundException("资源不存在");
        }

        // 2. IP 白名单（优先 X-Forwarded-For 首跳，反代场景下 remoteAddr 为代理 IP）
        String remoteIp = resolveClientIp(request);
        if (!wxPayCallbackGuard.isIpAllowed(remoteIp)) {
            // 非 404 语义上更接近 403，但为不暴露端点存在性，统一按资源不存在处理
            throw new ResourceNotFoundException("资源不存在");
        }

        // 3. 真实验签（平台证书 RSA-SHA256 + 时间戳防重放）
        if (!wxPayCallbackVerifier.verifyCallback(timestamp, nonce, body, signature)) {
            log.warn("微信支付回调验签失败，拒绝处理：remoteIp={}, serial={}", remoteIp, serial);
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
            log.warn("微信支付回调信封解析失败：{}", e.getMessage());
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
            log.warn("微信支付回调解密失败：notificationId={}, error={}", notification.id(), e.getMessage());
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("decrypt_failed");
            }
            return Map.of("code", "FAIL", "message", "解密失败");
        }

        // 5. 解析解密载荷并按订单状态机处理（幂等）
        WxPayModels.WxPayTransaction tx;
        try {
            tx = objectMapper.readValue(plain, WxPayModels.WxPayTransaction.class);
        } catch (Exception e) {
            log.warn("微信支付回调载荷解析失败：notificationId={}, error={}", notification.id(), e.getMessage());
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("payload_invalid");
            }
            return Map.of("code", "FAIL", "message", "报文格式错误");
        }

        String headersJson = buildHeadersSnapshot(timestamp, nonce, serial);
        try {
            String result = vipOrderService.handlePayNotification(tx, notification.id(), body, headersJson);
            if ("SUCCESS".equals(result)) {
                return Map.of("code", "SUCCESS", "message", "成功");
            }
            // 业务 FAIL（订单不存在/金额不符/账单写失败等）：reason 已在 VipOrderService 内按分支记录，此处不重复计数
            return Map.of("code", "FAIL", "message", "处理失败");
        } catch (RuntimeException e) {
            log.error("支付回调处理异常：notificationId={}, orderNo={}",
                    notification.id(), tx != null ? tx.outTradeNo() : null, e);
            if (paymentMetrics != null) {
                paymentMetrics.recordCallbackFailure("internal_error");
            }
            return Map.of("code", "FAIL", "message", "处理异常");
        }
    }

    /**
     * 查询当前用户的账单列表（分页）。
     * <p>默认第 0 页、每页 20 条；最大每页 100 条以防止滥用。</p>
     */
    @GetMapping
    public BillingService.BillListResponse listBills(
            @RequestParam(value = "page", defaultValue = "0")
            @Min(value = 0, message = ErrorMessages.PAGE_NUM_MIN) Integer page,
            @RequestParam(value = "size", defaultValue = "20")
            @Min(value = 1, message = ErrorMessages.PAGE_SIZE_MIN)
            @Max(value = 100, message = ErrorMessages.PAGE_SIZE_MAX) Integer size
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        return billingService.listBills(userId, page, size);
    }

    /**
     * VIP 购买（钱包支付，R4-00320：优惠码折扣消费方；P0-3：服务端权威定价）。
     * POST /api/v1/vip/bills/purchase
     *
     * <p>客户端仅被信任传 {@code planId} 与可选 {@code promoCode}；套餐名称、价格、
     * 授予天数一律由服务端 {@link VipPlanCatalog} 决定。历史请求体中的
     * {@code planName}/{@code baseAmount} 字段不再属于契约：Spring Boot 默认
     * {@code fail-on-unknown-properties=false}，旧客户端多带上送的两个字段会被直接忽略
     * （fail-closed——服务端绝不据其定价），缺失 {@code planId} 一律 400。</p>
     */
    @PostMapping("/purchase")
    @FeatureSwitch(FeatureSwitchKeys.COMMERCE_VIP)
    // 2026-10-30：按 (用户, 套餐) 限流，堵住"双击=两次真实扣款"。
    // 客户端在未显式设置 Idempotency-Key 时会为每个请求现生成一个（apps/client
    // src/services/http.ts:279-280 的口径就是"双击=两次操作"），而本端点的 orderId
    // 又是每次新 UUID（BillingService.purchaseVip），所以两次点击会各自扣款一次、
    // 各自顺延一次。钱包余额是用户资产，这里按 60 秒 1 次/用户+套餐收紧：
    // 误点的第二次立即 429，真想买第二次（续期）等一分钟即可，不构成业务阻碍。
    //
    // 2026-10-31 限流轨 P0 修复：键表达式原写作
    //   "T(...SecurityUtils).getCurrentUserId() + ':' + #request.planId()"
    // 而方法参数恰好叫 request —— RateLimitAspect 曾把 HttpServletRequest 注入到
    // 名为 request 的 SpEL 变量上，覆盖了方法参数，于是 #request 解析成
    // HttpServletRequest（没有 planId()）→ SpEL 抛异常 → 走降级 → 键变成
    // BillingController#purchase:fallback，<b>全站共用一个 1 次/60 秒的桶</b>：
    // 用户 A 买完的 60 秒内用户 B 被 429（付费路径误伤）。
    // 现在（1）切面不再注入名为 request 的变量，（2）方法参数改名 purchaseRequest，
    // （3）RateLimitKeyAuditTest 逐注解求值，任何表达式抛异常/落降级即 CI 红。
    @com.campuslove.api.ratelimit.RateLimit(
            capacity = 1,
            refillTokens = 1.0 / 60.0,
            key = "T(com.campuslove.api.config.SecurityUtils).getCurrentUserId()"
                    + " + ':' + #purchaseRequest.planId()")
    @PreAuthorize("hasRole('USER')")
    public BillingService.PurchaseResultView purchase(
            @Valid @RequestBody VipPurchaseRequest purchaseRequest) {
        Long userId = SecurityUtils.getCurrentUserId();
        return billingService.purchaseVip(userId, purchaseRequest.planId(),
                purchaseRequest.promoCode());
    }

    /** 关键请求头快照（留痕 JSON，不含签名原文——签名已由验签环节校验）。 */
    private String buildHeadersSnapshot(String timestamp, String nonce, String serial) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "wechatpay-timestamp", timestamp == null ? "" : timestamp,
                    "wechatpay-nonce", nonce == null ? "" : nonce,
                    "wechatpay-serial", serial == null ? "" : serial));
        } catch (Exception e) {
            return "{}";
        }
    }

    /** 解析客户端真实 IP：X-Forwarded-For 首跳 → X-Real-IP → remoteAddr。 */
    static String resolveClientIp(HttpServletRequest request) {
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

/**
 * VIP 购买请求体（R4-00320；P0-3 收敛为服务端权威定价契约）。
 *
 * <p>P0-3 前本契约含客户端上送的 {@code planName} 与 {@code baseAmount}（原价分），
 * 服务端据此计算优惠并扣款，等于把定价权交给客户端（1 分即可买走 18 元月卡）。
 * 现两字段已从契约移除，套餐名称/价格/时长由 {@link VipPlanCatalog} 权威给出；
 * 旧客户端继续上送这两个字段时会被 Jackson 忽略（未知属性不失败）。</p>
 *
 * @param planId    套餐 ID（必填，最长 32 字符，与 {@code vip_bills.plan_id} 列宽一致；
 *                  非法或已下架一律业务错误，不产生扣款）
 * @param promoCode 优惠码（可空；折扣以服务端原价计算）
 */
record VipPurchaseRequest(
        @NotBlank(message = ErrorMessages.PLAN_ID_REQUIRED)
        @Size(max = 32, message = ErrorMessages.PLAN_ID_TOO_LONG) String planId,
        @Size(max = 64) String promoCode
) {
}
