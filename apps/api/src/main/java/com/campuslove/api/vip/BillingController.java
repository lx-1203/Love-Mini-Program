package com.campuslove.api.vip;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.vip.BillingService.BillListResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * VIP 账单控制器。
 * <p>提供账单列表查询接口（支持分页）。
 * 仅在 real profile 下激活，依赖数据库持久化。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>GET /api/vip/bills?page=&size=：查询当前用户的账单列表（按创建时间倒序、分页）</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径要求已认证，用户 ID 从 JWT 上下文获取。</p>
 */
@Profile("real")
@Validated
@RestController
@RequestMapping("/api/v1/vip/bills")
public class BillingController {

    private static final Logger log = LoggerFactory.getLogger(BillingController.class);

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    /**
     * 微信支付回调端点（R4-00318）。
     * POST /api/v1/vip/payment-callback
     *
     * <p>背景：{@link BillingService#handlePaymentCallback} 原为死代码——无任何
     * HTTP/Controller 调用方，微信支付-权益开通闭环断裂。本端点作为其唯一入口：
     * 接收支付结果通知 → 验签（骨架）→ 验单（金额对账 + 订单存在性）→ 开通/顺延 VIP。</p>
     *
     * <p><b>微信支付 SDK 接入为排除项</b>：项目当前未集成 wechatpay-java SDK，
     * 验签实现为骨架——{@code signature} 字段透传并由 {@link #verifyWechatSignature}
     * 做「非空即通过 + 告警日志」占位校验。接入真实微信支付时必须：
     * <ol>
     *   <li>按 APIv3 解密 resource.ciphertext（AES-256-GCM，APIv3 密钥）获取真实字段</li>
     *   <li>用微信平台证书公钥校验 Wechatpay-Signature 请求头（RSA-SHA256）</li>
     *   <li>替换 {@link #verifyWechatSignature} 为 SDK 实现，拒绝验签失败的通知（返回 FAIL）</li>
     * </ol>
     * 在 SDK 接入前，本端点<b>不得在生产开启</b>（无真实验签即等于任意请求可开通 VIP），
     * 应通过网关/网络策略限制仅微信服务器 IP 可访问，或保持关闭待 SDK 接入。</p>
     *
     * <p>安全放行：本端点由微信服务器调用（无 JWT），已在 SecurityConfig /
     * MockSecurityConfig 的 permitAll 列表中放行（/api/v1/vip/payment-callback）。</p>
     *
     * <p>响应：按微信支付约定返回 {@code {"code":"SUCCESS","message":"成功"}}（200）；
     * 处理失败返回 {@code {"code":"FAIL","message":"..."}}（200），微信将按重试策略重发。
     * 幂等：{@link BillingService#handlePaymentCallback} 内部按 (notificationId, orderNo)
     * 双键去重（R4-00319），重复通知不重复开通。</p>
     *
     * @param request 回调请求体（字段为 APIv3 解密后的业务字段子集）
     * @return 微信支付标准响应体
     */
    @PostMapping("/payment-callback")
    public Map<String, String> handleWechatPayCallback(@Valid @RequestBody WechatPayCallbackRequest request) {
        // 1. 验签骨架：SDK 接入前仅校验签名非空；接入后替换为真实验签（见类注释）
        if (!verifyWechatSignature(request.signature())) {
            log.warn("微信支付回调验签失败（骨架校验），拒绝处理：notificationId={}, orderNo={}",
                    request.id(), request.orderNo());
            return Map.of("code", "FAIL", "message", "验签失败");
        }

        // 2. 验单 + 开通/顺延 VIP（BillingService 内部完成双键幂等、金额对账、权益开通）
        try {
            String result = billingService.handlePaymentCallback(
                    request.id(),
                    request.orderNo(),
                    request.amount(),
                    request.userId(),
                    request.planId(),
                    request.planName());
            if ("SUCCESS".equals(result)) {
                return Map.of("code", "SUCCESS", "message", "成功");
            }
            return Map.of("code", "FAIL", "message", "处理失败");
        } catch (RuntimeException e) {
            log.error("支付回调处理异常：notificationId={}, orderNo={}, error={}",
                    request.id(), request.orderNo(), e.getMessage());
            return Map.of("code", "FAIL", "message", "处理异常");
        }
    }

    /**
     * 微信支付回调验签（骨架实现）。
     *
     * <p><b>排除项说明</b>：微信支付 SDK（wechatpay-java）未接入，本方法为占位骨架——
     * 校验 signature 非空即放行并输出告警日志。接入 SDK 后必须替换为：
     * 微信平台证书公钥验签（RSA-SHA256）+ APIv3 解密，验签失败返回 false 拒绝处理。</p>
     *
     * @param signature 微信签名（请求体透传字段；接入 SDK 后应取 Wechatpay-Signature 请求头）
     * @return true 表示验签通过（骨架：非空即通过）；false 表示验签失败
     */
    private boolean verifyWechatSignature(String signature) {
        if (signature == null || signature.isBlank()) {
            return false;
        }
        // TODO(微信支付 SDK)：替换为 wechatpay-java 真实验签（平台证书 RSA-SHA256）
        log.warn("微信支付回调验签为骨架实现（SDK 未接入），仅校验签名非空——"
                + "接入真实微信支付前本端点不得在生产启用");
        return true;
    }

    /**
     * 查询当前用户的账单列表（分页）。
     * <p>默认第 0 页、每页 20 条；最大每页 100 条以防止滥用。</p>
     *
     * @param page 页码（从 0 开始，默认 0）
     * @param size 每页大小（默认 20，最大 100）
     * @return 账单列表响应（含 items、total、page、size、totalPages）
     */
    @GetMapping
    public BillListResponse listBills(
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
     * VIP 购买（钱包支付，R4-00320：优惠码折扣消费方）。
     * POST /api/v1/vip/bills/purchase
     *
     * <p>支付/下单链路接入优惠码折扣：携带 promoCode 时服务端调用
     * {@link PromoCodeService#redeem} 真实消耗优惠码并计算折后价，
     * 按折后价钱包扣费 + 写入账单 + 顺延 VIP 到期时间 30 天（同一事务）。</p>
     *
     * @param request 购买请求体（planId / planName / baseAmount / promoCode 可选）
     * @return 购买结果视图（订单号 / 原价 / 折扣 / 实付 / 余额 / 新到期时间）
     */
    @PostMapping("/purchase")
    @PreAuthorize("hasRole('USER')")
    public BillingService.PurchaseResultView purchase(
            @Valid @RequestBody VipPurchaseRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return billingService.purchaseVip(userId, request.planId(), request.planName(),
                request.baseAmount(), request.promoCode());
    }
}

/**
 * VIP 购买请求体（R4-00320）。
 *
 * @param planId     套餐 ID
 * @param planName   套餐名称（可空）
 * @param baseAmount 原价（分）
 * @param promoCode  优惠码（可空）
 */
record VipPurchaseRequest(
        @NotBlank @Size(max = 64) String planId,
        @Size(max = 64) String planName,
        @NotNull @Min(1) Integer baseAmount,
        @Size(max = 64) String promoCode
) {
}

/**
 * 微信支付回调请求体（R4-00318）。
 *
 * <p>字段为微信支付 APIv3 通知解密（resource.ciphertext）后的业务字段子集；
 * 接入 wechatpay-java SDK 后由服务端解密填充，当前由微信服务器直接以本结构回调。</p>
 *
 * @param id        微信通知 ID（幂等键第一维）
 * @param orderNo   商户订单号（幂等键第二维，R4-00319 双键幂等）
 * @param amount    支付金额（元）
 * @param userId    支付用户 ID
 * @param planId    套餐 ID
 * @param planName  套餐名称
 * @param signature 微信签名（验签骨架透传；接入 SDK 后取 Wechatpay-Signature 请求头）
 */
record WechatPayCallbackRequest(
        @NotBlank(message = ErrorMessages.NOTIFY_ID_REQUIRED)
        @Size(max = 64) String id,
        @NotBlank(message = ErrorMessages.MERCHANT_ORDER_NO_REQUIRED)
        @Size(max = 128) String orderNo,
        @NotNull(message = ErrorMessages.PAYMENT_AMOUNT_REQUIRED)
        @DecimalMin(value = "0.01", message = ErrorMessages.PAYMENT_AMOUNT_POSITIVE)
        BigDecimal amount,
        @NotNull(message = ErrorMessages.USER_ID_CN_REQUIRED)
        @Min(1) Long userId,
        @NotBlank(message = ErrorMessages.PLAN_ID_REQUIRED)
        @Size(max = 64) String planId,
        @Size(max = 64) String planName,
        @NotBlank(message = ErrorMessages.SIGNATURE_REQUIRED)
        @Size(max = 512) String signature
) {
}
