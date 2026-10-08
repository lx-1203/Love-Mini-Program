package com.campuslove.api.vip;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.PaymentCallbackLog;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.VipOrder;
import com.campuslove.api.monitor.PaymentMetrics;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipOrderRepository;
import com.campuslove.api.wxpay.WxPayApiException;
import com.campuslove.api.wxpay.WxPayDisabledException;
import com.campuslove.api.wxpay.WxPayJsapiService;
import com.campuslove.api.wxpay.WxPayModels;
import com.campuslove.api.wxpay.WxPayProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * VIP 微信支付订单服务（2026-10-05 微信支付工程补齐）。
 *
 * <p>职责：</p>
 * <ol>
 *   <li>下单：校验套餐（服务端定价快照，不信客户端金额）→ 生成全局唯一 orderNo →
 *       落 PENDING → 调微信 JSAPI 统一下单拿 prepay_id → 迁移 PAYING；</li>
 *   <li>支付回调处理：以 <b>订单状态机</b> 为幂等依据（订单已 SUCCESS 的重复通知
 *       直接返回成功应答），金额比对（分，容差 1 分），成功后迁移 SUCCESS 并
 *       复用 {@link BillingService} 的 VIP 时长顺延逻辑写 vip_bills
 *       （paymentMethod=WECHAT、transactionId=微信交易单号）；</li>
 *   <li>退款回调处理：REFUNDING/SUCCESS → REFUNDED，写 REFUND 账单（transactionId=微信退款单号）；</li>
 *   <li>超时关单：定时扫描 PENDING/PAYING 且 expire_at 已过的订单置 CLOSED，
 *       enabled 时先调微信关单接口（避免用户在关单瞬间仍可拉起支付）。</li>
 * </ol>
 *
 * <p>幂等设计（替代原 (notificationId, orderNo) 双键查询——该方案可被
 * 「同 orderNo 换新 notificationId」绕过）：</p>
 * <ul>
 *   <li>订单状态机是幂等唯一真相源：重复通知时订单已 SUCCESS 直接成功应答；</li>
 *   <li>并发重复回调由 vip_order.version 乐观锁兜底（后提交方抛
 *       ObjectOptimisticLockingFailureException，按「已被并发处理」成功应答）；</li>
 *   <li>vip_bills.transaction_id 唯一约束（V2026.10.05.0011）兜底防重复账单；</li>
 *   <li>payment_callback_log.notification_id 唯一索引保留为留痕去重（写入冲突静默忽略）。</li>
 * </ul>
 */
@Profile("real")
@Service
public class VipOrderService {

    private static final Logger log = LoggerFactory.getLogger(VipOrderService.class);

    /** 金额对账容差：1 分（与 BillingService 原回调逻辑一致） */
    private static final int AMOUNT_TOLERANCE_CENTS = 1;

    /** orderNo 前缀 + 时间戳 + 短随机串（总长 ≤32，微信 out_trade_no 上限 6-32 位） */
    private static final DateTimeFormatter ORDER_NO_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /** 套餐定义（服务端定价唯一真相源，与客户端 config/vip-plans.ts 价格对齐） */
    public record VipPlanDef(String planId, String planName, int priceCents, int days) {
    }

    /** 套餐目录：monthly=1800 分/30 天，quarterly=4800 分/90 天，yearly=15800 分/365 天 */
    private static final Map<String, VipPlanDef> PLAN_CATALOG = Map.of(
            "monthly", new VipPlanDef("monthly", "月卡", 1800, 30),
            "quarterly", new VipPlanDef("quarterly", "季卡", 4800, 90),
            "yearly", new VipPlanDef("yearly", "年卡", 15800, 365));

    /** 订单状态机合法迁移表（终点态 CLOSED/FAILED/REFUNDED 无出边） */
    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
            VipOrder.STATUS_PENDING, Set.of(VipOrder.STATUS_PAYING, VipOrder.STATUS_CLOSED, VipOrder.STATUS_FAILED),
            VipOrder.STATUS_PAYING, Set.of(VipOrder.STATUS_SUCCESS, VipOrder.STATUS_CLOSED, VipOrder.STATUS_FAILED),
            VipOrder.STATUS_SUCCESS, Set.of(VipOrder.STATUS_REFUNDING),
            VipOrder.STATUS_REFUNDING, Set.of(VipOrder.STATUS_REFUNDED));

    private final VipOrderRepository vipOrderRepository;
    private final BillingService billingService;
    private final PaymentCallbackLogRepository paymentCallbackLogRepository;

    /** 微信支付配置（real profile 注入；缺省 enabled=false 时下单/回调端点 404） */
    @Autowired(required = false)
    private WxPayProperties wxPayProperties;

    /** 微信支付 JSAPI 客户端（real profile 注入；单元测试为 null） */
    @Autowired(required = false)
    private WxPayJsapiService wxPayJsapiService;

    /** 用户信息（下单时取 openid 作为 JSAPI payer；单元测试可为 null） */
    @Autowired(required = false)
    private UserRepository userRepository;

    /** 支付回调耗时指标（real profile 注入；单元测试可为 null） */
    @Autowired(required = false)
    private PaymentMetrics paymentMetrics;

    public VipOrderService(VipOrderRepository vipOrderRepository,
                           BillingService billingService,
                           PaymentCallbackLogRepository paymentCallbackLogRepository) {
        this.vipOrderRepository = vipOrderRepository;
        this.billingService = billingService;
        this.paymentCallbackLogRepository = paymentCallbackLogRepository;
    }

    /* ==================== 下单 ==================== */

    /**
     * 创建 VIP 微信支付订单并获取 prepay_id。
     *
     * <p>流程：校验套餐 → 服务端定价 → 生成全局唯一 orderNo → 落 PENDING（含过期时间）→
     * 调微信统一下单 → 迁移 PAYING → 返回 wx.requestPayment 五件套。
     * 下单失败（微信 API 异常）时订单置 FAILED 并抛出业务异常。</p>
     *
     * @param userId 下单用户 ID
     * @param planId 套餐 ID（monthly/quarterly/yearly）
     * @return wx.requestPayment 所需参数（orderNo + appId/timeStamp/nonceStr/package/signType/paySign）
     * @throws IllegalArgumentException 套餐非法 / openid 缺失
     * @throws WxPayDisabledException   微信支付未启用（端点层已 404，此处兜底）
     */
    @Transactional
    public OrderCreatedView createOrder(Long userId, String planId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        VipPlanDef plan = planOf(planId);

        User user = userRepository != null ? userRepository.findById(userId).orElse(null) : null;
        String openid = user != null ? user.getOpenid() : null;
        if (openid == null || openid.isBlank()) {
            throw new IllegalArgumentException("缺少微信 openid，无法发起支付");
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        VipOrder order = new VipOrder();
        order.setOrderNo(newOrderNo(now));
        order.setUserId(userId);
        order.setPlanId(plan.planId());
        order.setPlanName(plan.planName());
        order.setPlanDays(plan.days());
        order.setAmountCents(plan.priceCents());
        order.setStatus(VipOrder.STATUS_PENDING);
        order.setOpenid(openid);
        order.setExpireAt(now.plusMinutes(orderExpireMinutes()));
        vipOrderRepository.save(order);
        log.info("VIP 订单已创建（PENDING）：orderNo={}, userId={}, planId={}, amountCents={}",
                order.getOrderNo(), userId, planId, plan.priceCents());

        // 调微信统一下单拿 prepay_id（双闸校验在 WxPayJsapiService 内部）
        try {
            WxPayJsapiService.PrepayResult prepay = wxPayJsapiService.createJsapiOrder(
                    new WxPayJsapiService.CreateOrderCommand(
                            order.getOrderNo(),
                            "校园恋爱 VIP - " + plan.planName(),
                            plan.priceCents(),
                            openid,
                            formatRfc3339(order.getExpireAt()),
                            null));
            order.setPrepayId(prepay.prepayId());
            applyTransition(order, VipOrder.STATUS_PAYING);
            vipOrderRepository.save(order);
            log.info("微信统一下单成功（PAYING）：orderNo={}, prepayId={}", order.getOrderNo(), prepay.prepayId());
            WxPayJsapiService.JsapiPayParams payParams =
                    wxPayJsapiService.buildJsapiPayParams(order.getOrderNo(), prepay.prepayId());
            return new OrderCreatedView(payParams.orderNo(), payParams.appId(), payParams.timeStamp(),
                    payParams.nonceStr(), payParams.packageValue(), payParams.signType(), payParams.paySign());
        } catch (WxPayApiException e) {
            // 下单失败：订单置 FAILED（终态），用户可重新下单
            log.error("微信统一下单失败，订单置 FAILED：orderNo={}, code={}", order.getOrderNo(), e.getCode(), e);
            order.setStatus(VipOrder.STATUS_FAILED);
            vipOrderRepository.save(order);
            throw new IllegalArgumentException("微信下单失败，请稍后重试");
        }
    }

    /**
     * 查询订单状态（归属校验：只能查自己的订单）。
     *
     * @param userId  用户 ID
     * @param orderNo 订单号
     * @return 订单状态视图
     * @throws IllegalArgumentException 订单不存在或非本人订单
     */
    @Transactional(readOnly = true)
    public OrderStatusView getOrder(Long userId, String orderNo) {
        if (userId == null || orderNo == null || orderNo.isBlank()) {
            throw new IllegalArgumentException("参数不能为空");
        }
        VipOrder order = vipOrderRepository.findByUserIdAndOrderNo(userId, orderNo)
                .orElseThrow(() -> new IllegalArgumentException("订单不存在"));
        return new OrderStatusView(
                order.getOrderNo(),
                order.getStatus(),
                order.getPlanId(),
                order.getAmountCents(),
                order.getExpireAt() != null ? order.getExpireAt().toString() : null,
                order.getPaidAt() != null ? order.getPaidAt().toString() : null);
    }

    /* ==================== 支付回调 ==================== */

    /**
     * 处理支付结果通知（幂等：以订单状态机为准）。
     *
     * @param tx             解密后的支付结果载荷（out_trade_no/transaction_id/trade_state/amount）
     * @param notificationId 微信通知 ID（留痕）
     * @param rawBody        回调请求体原文（留痕取证）
     * @param headersJson    关键请求头快照（留痕）
     * @return "SUCCESS" / "FAIL"（微信按此决定是否重试）
     */
    @Transactional
    public String handlePayNotification(WxPayModels.WxPayTransaction tx,
                                        String notificationId,
                                        String rawBody,
                                        String headersJson) {
        long startMs = System.currentTimeMillis();
        String result = doHandlePayNotification(tx, notificationId, rawBody, headersJson);
        if (paymentMetrics != null) {
            paymentMetrics.recordCallbackLatency(System.currentTimeMillis() - startMs);
        }
        return result;
    }

    private String doHandlePayNotification(WxPayModels.WxPayTransaction tx,
                                           String notificationId,
                                           String rawBody,
                                           String headersJson) {
        if (tx == null || tx.outTradeNo() == null || tx.outTradeNo().isBlank()) {
            log.warn("支付回调缺少 out_trade_no：notificationId={}", notificationId);
            recordFailure("missing_out_trade_no");
            writeCallbackLog(notificationId, tx != null ? tx.outTradeNo() : "", null,
                    "FAIL", rawBody, headersJson, null,
                    tx != null ? tx.mchid() : null, "缺少 out_trade_no");
            return "FAIL";
        }
        String orderNo = tx.outTradeNo();
        VipOrder order = vipOrderRepository.findByOrderNo(orderNo).orElse(null);
        if (order == null) {
            // 未知订单号：可能是伪造回调或脏数据，拒绝处理
            log.warn("支付回调订单不存在：notificationId={}, orderNo={}", notificationId, orderNo);
            recordFailure("order_not_found");
            writeCallbackLog(notificationId, orderNo, null, "FAIL", rawBody, headersJson,
                    tx.transactionId(), tx.mchid(), "订单不存在");
            return "FAIL";
        }

        // 幂等判定（订单状态机为唯一真相源）：已成功/退款中的订单重复通知直接成功应答
        if (VipOrder.STATUS_SUCCESS.equals(order.getStatus())
                || VipOrder.STATUS_REFUNDING.equals(order.getStatus())
                || VipOrder.STATUS_REFUNDED.equals(order.getStatus())) {
            log.info("支付回调重复通知（订单已成功），幂等返回：notificationId={}, orderNo={}",
                    notificationId, orderNo);
            recordFailure("duplicate_notify");
            writeCallbackLogQuietly(notificationId, orderNo, tx, "SUCCESS", rawBody, headersJson,
                    "重复通知（订单已 SUCCESS），幂等应答");
            return "SUCCESS";
        }

        // 金额比对（分，容差 1 分）：以订单服务端定价为准
        Integer callbackTotal = tx.amount() != null ? tx.amount().total() : null;
        if (callbackTotal == null) {
            log.warn("支付回调缺少金额：notificationId={}, orderNo={}", notificationId, orderNo);
            recordFailure("amount_missing");
            writeCallbackLog(notificationId, orderNo, null, "FAIL", rawBody, headersJson,
                    tx.transactionId(), tx.mchid(), "回调报文缺少金额");
            return "FAIL";
        }
        int orderCents = order.getAmountCents() != null ? order.getAmountCents() : 0;
        if (Math.abs(callbackTotal - orderCents) > AMOUNT_TOLERANCE_CENTS) {
            log.warn("支付回调金额对账失败：notificationId={}, orderNo={}, callbackCents={}, orderCents={}",
                    notificationId, orderNo, callbackTotal, orderCents);
            recordFailure("amount_mismatch");
            writeCallbackLog(notificationId, orderNo, centsToYuan(callbackTotal), "FAIL", rawBody, headersJson,
                    tx.transactionId(), tx.mchid(),
                    "金额对账失败: callback=" + callbackTotal + ", order=" + orderCents);
            return "FAIL";
        }

        // 按交易状态迁移订单状态机
        String tradeState = tx.tradeState();
        if ("SUCCESS".equals(tradeState)) {
            try {
                // 极端竞态兜底：支付回调先于下单方 PAYING 状态落库到达（如回调与下单事务并发），
                // 按状态机先补 PAYING 迁移再迁移 SUCCESS（微信已确认支付成功，事实优先）
                if (VipOrder.STATUS_PENDING.equals(order.getStatus())) {
                    applyTransition(order, VipOrder.STATUS_PAYING);
                }
                applyTransition(order, VipOrder.STATUS_SUCCESS);
            } catch (IllegalOrderStateException e) {
                // 并发回调竞态：状态已被其他线程迁移，按幂等成功应答
                log.info("支付回调并发竞态（状态已迁移），幂等返回：orderNo={}, error={}", orderNo, e.getMessage());
                recordFailure("duplicate_notify");
                writeCallbackLogQuietly(notificationId, orderNo, tx, "SUCCESS", rawBody, headersJson,
                        "并发回调，订单状态已迁移");
                return "SUCCESS";
            }
            order.setWxTransactionId(tx.transactionId());
            order.setPaidAt(LocalDateTime.now(TimeZones.BUSINESS));
            order.setNotifyProcessedAt(LocalDateTime.now(TimeZones.BUSINESS));
            try {
                vipOrderRepository.save(order);
            } catch (ObjectOptimisticLockingFailureException e) {
                // 乐观锁冲突 = 并发重复回调已处理完成，幂等成功应答
                log.info("支付回调乐观锁冲突（并发重复回调已处理），幂等返回：orderNo={}", orderNo);
                recordFailure("duplicate_notify");
                return "SUCCESS";
            }

            // 写 vip_bills（paymentMethod=WECHAT、transactionId=微信交易单号），
            // VIP 时长顺延复用 BillingService 公共逻辑：max(now, 最近 SUCCESS periodEnd) + 套餐天数
            try {
                grantVipAndWriteBill(order, tx.transactionId());
            } catch (DataAccessException e) {
                // 账单写入失败（如 transaction_id 唯一约束冲突=重复账单）：返回 FAIL 触发微信重试
                log.error("支付回调写账单失败：orderNo={}, wxTransactionId={}", orderNo, tx.transactionId(), e);
                recordFailure("persist_error");
                return "FAIL";
            }

            writeCallbackLog(notificationId, orderNo, centsToYuan(callbackTotal), "SUCCESS", rawBody, headersJson,
                    tx.transactionId(), tx.mchid(), "支付成功，VIP 已开通/顺延");
            log.info("支付回调处理成功：orderNo={}, userId={}, amountCents={}, wxTransactionId={}",
                    orderNo, order.getUserId(), callbackTotal, tx.transactionId());
            return "SUCCESS";
        }

        if ("CLOSED".equals(tradeState) || "REVOKED".equals(tradeState)) {
            // 微信侧关单/撤销：订单置 CLOSED 终态
            applyTransitionQuietly(order, VipOrder.STATUS_CLOSED);
            order.setClosedAt(LocalDateTime.now(TimeZones.BUSINESS));
            order.setNotifyProcessedAt(order.getClosedAt());
            vipOrderRepository.save(order);
            writeCallbackLog(notificationId, orderNo, centsToYuan(callbackTotal), "SUCCESS", rawBody, headersJson,
                    tx.transactionId(), tx.mchid(), "微信侧关单（trade_state=" + tradeState + "）");
            return "SUCCESS";
        }

        if ("PAYERROR".equals(tradeState)) {
            applyTransitionQuietly(order, VipOrder.STATUS_FAILED);
            order.setNotifyProcessedAt(LocalDateTime.now(TimeZones.BUSINESS));
            vipOrderRepository.save(order);
            writeCallbackLog(notificationId, orderNo, centsToYuan(callbackTotal), "SUCCESS", rawBody, headersJson,
                    tx.transactionId(), tx.mchid(), "支付失败（PAYERROR）");
            return "SUCCESS";
        }

        // 其他状态（NOTPAY/USERPAYING 等）：应答 SUCCESS 停止重试，等待后续通知
        writeCallbackLog(notificationId, orderNo, centsToYuan(callbackTotal), "SUCCESS", rawBody, headersJson,
                tx.transactionId(), tx.mchid(), "交易未完成（trade_state=" + tradeState + "），等待后续通知");
        return "SUCCESS";
    }

    /* ==================== 退款回调 ==================== */

    /**
     * 处理退款结果通知（REFUNDING/SUCCESS → REFUNDED，写 REFUND 账单）。
     *
     * @param payload        解密后的退款结果载荷
     * @param notificationId 微信通知 ID（留痕）
     * @param rawBody        回调请求体原文（留痕）
     * @param headersJson    关键请求头快照（留痕）
     * @return "SUCCESS" / "FAIL"
     */
    @Transactional
    public String handleRefundNotification(WxPayModels.WxPayRefundPayload payload,
                                           String notificationId,
                                           String rawBody,
                                           String headersJson) {
        if (payload == null || payload.outTradeNo() == null || payload.outTradeNo().isBlank()) {
            log.warn("退款回调缺少 out_trade_no：notificationId={}", notificationId);
            recordFailure("missing_out_trade_no");
            return "FAIL";
        }
        String orderNo = payload.outTradeNo();
        VipOrder order = vipOrderRepository.findByOrderNo(orderNo).orElse(null);
        if (order == null) {
            log.warn("退款回调订单不存在：notificationId={}, orderNo={}", notificationId, orderNo);
            recordFailure("order_not_found");
            writeCallbackLog(notificationId, orderNo, null, "FAIL", rawBody, headersJson,
                    payload.transactionId(), payload.mchid(), "退款回调订单不存在");
            return "FAIL";
        }

        // 幂等：已退款订单的重复通知直接成功应答
        if (VipOrder.STATUS_REFUNDED.equals(order.getStatus())) {
            log.info("退款回调重复通知（订单已 REFUNDED），幂等返回：orderNo={}", orderNo);
            recordFailure("duplicate_notify");
            return "SUCCESS";
        }

        String refundStatus = payload.refundStatus();
        if (!"SUCCESS".equals(refundStatus)) {
            // ABNORMAL/CLOSED：退款未完成，保持 REFUNDING 等待人工介入，应答 SUCCESS 停止重试
            log.warn("退款回调状态非 SUCCESS，保持现状等待人工介入：orderNo={}, refundStatus={}", orderNo, refundStatus);
            writeCallbackLog(notificationId, orderNo, null, "SUCCESS", rawBody, headersJson,
                    payload.transactionId(), payload.mchid(), "退款状态=" + refundStatus + "，待人工介入");
            return "SUCCESS";
        }

        // SUCCESS / REFUNDING 均允许迁移到 REFUNDED（退款回调可能先于退款发起方落 REFUNDING 到达）
        String from = order.getStatus();
        if (!VipOrder.STATUS_REFUNDING.equals(from) && !VipOrder.STATUS_SUCCESS.equals(from)) {
            log.warn("退款回调非法状态迁移，拒绝：orderNo={}, from={}", orderNo, from);
            recordFailure("illegal_transition");
            writeCallbackLog(notificationId, orderNo, null, "FAIL", rawBody, headersJson,
                    payload.transactionId(), payload.mchid(), "非法退款迁移: from=" + from);
            return "FAIL";
        }
        order.setStatus(VipOrder.STATUS_REFUNDED);
        order.setRefundId(payload.refundId());
        order.setRefundedAt(LocalDateTime.now(TimeZones.BUSINESS));
        order.setNotifyProcessedAt(order.getRefundedAt());
        try {
            vipOrderRepository.save(order);
        } catch (ObjectOptimisticLockingFailureException e) {
            log.info("退款回调乐观锁冲突（并发已处理），幂等返回：orderNo={}", orderNo);
            return "SUCCESS";
        }

        // 写 REFUND 账单（transactionId=微信退款单号，独立于支付账单的交易单号，满足唯一约束）
        Integer refundCents = payload.amount() != null ? payload.amount().refund() : order.getAmountCents();
        try {
            billingService.createBill(order.getUserId(), order.getPlanId(), order.getPlanName(),
                    refundCents != null ? refundCents : 0, order.getAmountCents(),
                    "REFUND", "REFUNDED", "WECHAT",
                    payload.refundId(),
                    null, null,
                    "VIP 退款成功，退款单号 " + payload.refundId());
        } catch (DataAccessException e) {
            log.error("退款回调写 REFUND 账单失败：orderNo={}, refundId={}", orderNo, payload.refundId(), e);
            recordFailure("persist_error");
            return "FAIL";
        }

        writeCallbackLog(notificationId, orderNo, centsToYuan(refundCents), "SUCCESS", rawBody, headersJson,
                payload.transactionId(), payload.mchid(), "退款成功，订单置 REFUNDED");
        log.info("退款回调处理成功：orderNo={}, refundId={}", orderNo, payload.refundId());
        return "SUCCESS";
    }

    /* ==================== 退款发起（管理员） ==================== */

    /**
     * 管理员发起退款（SUPER_ADMIN 入口，见 AdminVipController）。
     *
     * <p>流程：管道闸（mock/off 状态直接拒绝，不产生半状态）→ 校验订单存在且为
     * SUCCESS → 状态机迁移 REFUNDING → 调微信退款 API（全额退款）→ 回填 refundId。
     * 微信 API 失败时抛 {@link WxPayApiException}，@Transactional 回滚使订单留在
     * SUCCESS；商户退款单号取 {@code RF + orderNo}（≤32 位），微信侧按其幂等，
     * 重试安全。最终 REFUNDED 由退款回调（{@link #handleRefundNotification}）确认。</p>
     *
     * @param orderNo 商户订单号
     * @param reason  退款原因（审计日志用，可空）
     * @return 退款受理视图（订单号 / 微信退款单号 / 商户退款单号 / 状态 / 退款金额分）
     * @throws WxPayDisabledException     微信支付未启用（mock/off，调用方转 404）
     * @throws IllegalArgumentException   订单不存在或状态不允许退款
     * @throws IllegalOrderStateException 非法状态迁移（如已 REFUNDING/REFUNDED 重复发起）
     * @throws WxPayApiException          微信退款 API 调用失败（事务回滚，可凭同一单号重试）
     */
    @Transactional
    public RefundInitiatedView initiateRefund(String orderNo, String reason) {
        if (orderNo == null || orderNo.isBlank()) {
            throw new IllegalArgumentException("订单号不能为空");
        }
        // 管道闸：mock/off 状态下拒绝（不迁移状态、不调微信，调用方翻译为 404）
        if (wxPayProperties == null || !wxPayProperties.isEnabled() || wxPayJsapiService == null) {
            throw new WxPayDisabledException("微信支付未启用，无法发起退款");
        }
        VipOrder order = vipOrderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new IllegalArgumentException("订单不存在"));
        String currentStatus = order.getStatus();
        if (!VipOrder.STATUS_SUCCESS.equals(currentStatus)
                && !VipOrder.STATUS_REFUNDING.equals(currentStatus)) {
            // PENDING/PAYING/CLOSED/FAILED/REFUNDED 均无退款事实基础（REFUNDING 允许穿过以触发幂等拒绝）
            throw new IllegalArgumentException("仅支付成功的订单可退款，当前状态: " + currentStatus);
        }
        // 状态机唯一入口：SUCCESS → REFUNDING（已 REFUNDING 的重复发起在此被 IllegalOrderStateException 拒绝）
        applyTransition(order, VipOrder.STATUS_REFUNDING);

        String outRefundNo = "RF" + orderNo;
        log.info("管理员发起退款：orderNo={}, outRefundNo={}, refundCents={}, reason={}",
                orderNo, outRefundNo, order.getAmountCents(), reason);
        WxPayJsapiService.RefundResult result = wxPayJsapiService.createRefund(
                new WxPayJsapiService.RefundCommand(
                        orderNo, outRefundNo, order.getAmountCents(), order.getAmountCents()));
        order.setRefundId(result.refundId());
        vipOrderRepository.save(order);
        log.info("退款受理成功（等待退款回调确认）：orderNo={}, refundId={}", orderNo, result.refundId());
        return new RefundInitiatedView(orderNo, result.refundId(), outRefundNo,
                order.getStatus(), order.getAmountCents());
    }

    /** 退款发起受理视图（管理员端点出参）。 */
    public record RefundInitiatedView(
            String orderNo,
            String refundId,
            String outRefundNo,
            String status,
            Integer refundCents
    ) {
    }

    /* ==================== 超时关单 ==================== */

    /**
     * 定时关单：每 60s 扫描 PENDING/PAYING 且已过期的订单置 CLOSED。
     *
     * <p>enabled=true 时先调微信关单接口（成功才置 CLOSED——接口失败可能是用户
     * 恰好支付完成，需等回调确认）；enabled=false（管道未开）时不存在线上订单，
     * 仅做本地兜底清理。</p>
     *
     * @return 本次关单数量
     */
    @Scheduled(fixedDelay = 60_000, initialDelay = 120_000)
    @Transactional
    public int closeExpiredOrders() {
        List<VipOrder> expired = vipOrderRepository.findByStatusInAndExpireAtBefore(
                List.of(VipOrder.STATUS_PENDING, VipOrder.STATUS_PAYING),
                LocalDateTime.now(TimeZones.BUSINESS));
        if (expired.isEmpty()) {
            return 0;
        }
        boolean wechatEnabled = wxPayProperties != null && wxPayProperties.isEnabled();
        int closed = 0;
        for (VipOrder order : expired) {
            if (wechatEnabled && wxPayJsapiService != null
                    && VipOrder.STATUS_PAYING.equals(order.getStatus())) {
                try {
                    // 先关微信侧单，成功才置 CLOSED（避免用户在关单瞬间支付成功造成状态错乱）
                    wxPayJsapiService.closeOrder(order.getOrderNo());
                } catch (WxPayApiException e) {
                    // 微信侧关单失败（可能已支付）：跳过，等支付回调确认
                    log.warn("微信关单失败，跳过本地关单等待回调确认：orderNo={}, code={}",
                            order.getOrderNo(), e.getCode());
                    continue;
                } catch (WxPayDisabledException e) {
                    // 双闸竞态（运行中开关被关）：降级为本地关单
                    log.info("微信支付开关已关闭，降级为本地关单：orderNo={}", order.getOrderNo());
                }
            }
            applyTransitionQuietly(order, VipOrder.STATUS_CLOSED);
            order.setClosedAt(LocalDateTime.now(TimeZones.BUSINESS));
            vipOrderRepository.save(order);
            closed++;
            log.info("超时订单已关单：orderNo={}, userId={}", order.getOrderNo(), order.getUserId());
        }
        return closed;
    }

    /* ==================== 状态机 ==================== */

    /**
     * 订单状态机迁移（唯一入口）：非法迁移抛 {@link IllegalOrderStateException}。
     *
     * @param order  订单
     * @param target 目标状态
     * @throws IllegalOrderStateException 当前状态无到目标状态的合法边
     */
    public void applyTransition(VipOrder order, String target) {
        Set<String> allowed = ALLOWED_TRANSITIONS.get(order.getStatus());
        if (allowed == null || !allowed.contains(target)) {
            throw new IllegalOrderStateException(order.getStatus(), target);
        }
        order.setStatus(target);
    }

    /** 宽松版迁移：非法迁移仅记录告警不抛异常（定时任务/清理场景），状态保持不变。 */
    private void applyTransitionQuietly(VipOrder order, String target) {
        try {
            applyTransition(order, target);
        } catch (IllegalOrderStateException e) {
            log.warn("订单状态迁移被拒绝（保持原状态）：orderNo={}, {} -> {}",
                    order.getOrderNo(), order.getStatus(), target);
        }
    }

    /**
     * 订单非法状态迁移异常。
     */
    public static class IllegalOrderStateException extends IllegalStateException {

        private final String from;
        private final String to;

        public IllegalOrderStateException(String from, String to) {
            super("订单状态非法迁移: " + from + " -> " + to);
            this.from = from;
            this.to = to;
        }

        public String getFrom() {
            return from;
        }

        public String getTo() {
            return to;
        }
    }

    /* ==================== 内部辅助 ==================== */

    /** 记录回调失败指标（reason 区分失败原因，供 PaymentCallbackFailure 告警消费；指标缺失时静默跳过）。 */
    private void recordFailure(String reason) {
        if (paymentMetrics != null) {
            paymentMetrics.recordCallbackFailure(reason);
        }
    }

    /** 支付成功后开通/顺延 VIP 并写账单（复用 BillingService 现有顺延逻辑）。 */
    private void grantVipAndWriteBill(VipOrder order, String wxTransactionId) {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        // 复用现有 VIP 时长顺延逻辑：max(now, 最近一笔 SUCCESS 账单 periodEnd) + 套餐天数
        LocalDateTime newExpiry = billingService.grantVipExpiry(order.getUserId(), order.getPlanDays());
        billingService.createBill(order.getUserId(), order.getPlanId(), order.getPlanName(),
                order.getAmountCents(), order.getAmountCents(),
                "SUBSCRIBE", "SUCCESS", "WECHAT",
                wxTransactionId,
                now.toString(), newExpiry.toString(),
                "VIP 微信支付成功，订单号 " + order.getOrderNo());
    }

    /** 校验并取套餐定义。 */
    private VipPlanDef planOf(String planId) {
        if (planId == null || planId.isBlank()) {
            throw new IllegalArgumentException("套餐 ID 不能为空");
        }
        VipPlanDef plan = PLAN_CATALOG.get(planId);
        if (plan == null) {
            throw new IllegalArgumentException("非法套餐: " + planId + "，仅支持 " + PLAN_CATALOG.keySet());
        }
        return plan;
    }

    /** 生成全局唯一订单号：VIP + yyyyMMddHHmmss + 8 位随机（共 25 位，≤32 上限）。 */
    private String newOrderNo(LocalDateTime now) {
        return "VIP" + ORDER_NO_FORMAT.format(now)
                + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private int orderExpireMinutes() {
        return wxPayProperties != null ? wxPayProperties.getOrderExpireMinutes() : 120;
    }

    /** 过期时间 → RFC 3339（微信 time_expire 要求，含时区偏移）。 */
    private String formatRfc3339(LocalDateTime time) {
        return time.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX"));
    }

    /** 分 → 元（两位小数，回调日志金额字段用）。 */
    private BigDecimal centsToYuan(Integer cents) {
        return cents == null ? BigDecimal.ZERO
                : BigDecimal.valueOf(cents).movePointLeft(2).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    /**
     * 写回调留痕日志（幂等写：notification_id 冲突静默忽略）。
     */
    private void writeCallbackLog(String notificationId, String orderNo, BigDecimal amount, String status,
                                  String rawBody, String headersJson, String wxTransactionId,
                                  String mchid, String detail) {
        try {
            PaymentCallbackLog logEntry = new PaymentCallbackLog();
            logEntry.setNotificationId(notificationId != null ? notificationId : "UNKNOWN-" + UUID.randomUUID());
            logEntry.setOrderNo(orderNo != null ? orderNo : "");
            if (amount != null) {
                logEntry.setAmount(amount);
            } else {
                logEntry.setAmount(BigDecimal.ZERO);
            }
            logEntry.setStatus(status);
            logEntry.setRawBody(rawBody != null && rawBody.length() > 20_000 ? rawBody.substring(0, 20_000) : rawBody);
            logEntry.setHeaders(headersJson);
            logEntry.setWxTransactionId(wxTransactionId);
            logEntry.setMchid(mchid);
            logEntry.setDetail(detail);
            logEntry.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
            paymentCallbackLogRepository.save(logEntry);
        } catch (DataIntegrityViolationException e) {
            // 同一 notification_id 重复通知：留痕去重，不影响主流程
            log.info("回调留痕日志已存在（notification_id 冲突），跳过：notificationId={}", notificationId);
        } catch (DataAccessException e) {
            // 留痕失败不影响主流程应答
            log.error("回调留痕日志写入失败：notificationId={}, orderNo={}", notificationId, orderNo, e);
        }
    }

    /** 留痕便捷重载：金额取解密载荷。 */
    private void writeCallbackLogQuietly(String notificationId, String orderNo,
                                         WxPayModels.WxPayTransaction tx, String status,
                                         String rawBody, String headersJson, String detail) {
        Integer total = tx.amount() != null ? tx.amount().total() : null;
        writeCallbackLog(notificationId, orderNo, centsToYuan(total), status, rawBody, headersJson,
                tx.transactionId(), tx.mchid(), detail);
    }

    /* ==================== 视图模型 ==================== */

    /**
     * 下单结果视图：wx.requestPayment 五件套 + 订单号。
     *
     * <p>字段名与微信小程序 wx.requestPayment 参数严格对齐（package 为 JS 侧字段名，
     * Java 记录组件用 packageValue 规避关键字，经 @JsonProperty 映射）。</p>
     */
    public record OrderCreatedView(
            String orderNo,
            String appId,
            String timeStamp,
            String nonceStr,
            @JsonProperty("package") String packageValue,
            String signType,
            String paySign
    ) {
    }

    /** 订单状态视图（查询接口出参）。 */
    public record OrderStatusView(
            String orderNo,
            String status,
            String planId,
            Integer amountCents,
            String expireAt,
            String paidAt
    ) {
    }
}
