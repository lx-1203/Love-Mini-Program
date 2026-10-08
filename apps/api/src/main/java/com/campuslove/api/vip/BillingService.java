package com.campuslove.api.vip;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.wallet.InsufficientBalanceException;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * VIP 账单服务。
 * <p>提供账单列表查询（分页）、账单创建（支付成功后调用）等业务逻辑。</p>
 *
 * <p>事务处理：查询使用只读事务，创建使用读写事务。</p>
 *
 * <p>错误处理：参数非法抛出 IllegalArgumentException，
 * 由 GlobalExceptionHandler 统一转换为 400 响应。
 * 数据库异常被捕获后包装为 RuntimeException 抛出，避免泄漏堆栈。</p>
 */
@Profile("real")
@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    /**
     * 支付成功后授予的 VIP 时长（天）：30 天（月度套餐）。
     * FIN HIGH-11：支付回调成功时按此天数延长 {@code vip_bills.period_end}。
     */
    private static final int VIP_GRANT_DAYS = 30;

    private final VipBillRepository vipBillRepository;
    private final PaymentCallbackLogRepository paymentCallbackLogRepository;

    /**
     * 优惠码服务（R4-00320：VIP 购买链路消费折扣）。
     * 采用 required=false 字段注入，避免破坏既有单测构造器；未注入时购买请求
     * 携带 promoCode 会返回「优惠码服务不可用」业务错误。
     */
    @Autowired(required = false)
    private PromoCodeService promoCodeService;

    /**
     * 钱包服务（R4-00320：VIP 购买钱包扣费）。
     * 采用 required=false 字段注入，避免破坏既有单测构造器；未注入时购买请求报错。
     */
    @Autowired(required = false)
    private WalletService walletService;

    public BillingService(VipBillRepository vipBillRepository,
                          PaymentCallbackLogRepository paymentCallbackLogRepository) {
        this.vipBillRepository = vipBillRepository;
        this.paymentCallbackLogRepository = paymentCallbackLogRepository;
    }

    /**
     * VIP 购买（钱包支付，R4-00320：优惠码折扣消费方）。
     *
     * <p>背景：PromoCodeService.redeem 兑换的折扣金额此前无任何消费方——兑换成功
     * 但购买时无人读取折扣，营销链路断裂。本方法将折扣接入支付/下单链路：</p>
     * <ol>
     *   <li>携带 promoCode 时调用 {@link PromoCodeService#redeem} 真实消耗优惠码
     *       （原子扣减剩余次数 + 写入使用记录），得到折扣金额与折后价</li>
     *   <li>按折后价调用 {@link WalletService#deduct} 扣减钱包（orderId 唯一索引幂等）</li>
     *   <li>写入 VIP 账单（amount=实付、originalAmount=原价，type=SUBSCRIBE，
     *       paymentMethod=WALLET）并顺延 VIP 到期时间 30 天</li>
     * </ol>
     *
     * <p>余额不足抛 {@link InsufficientBalanceException}（HTTP 409）；
     * 优惠码无效/过期/已用完抛 IllegalArgumentException（HTTP 400）。
     * 全部操作在同一事务内，任一步失败整体回滚（优惠码使用记录一并回滚）。</p>
     *
     * @param userId     购买用户 ID
     * @param planId     套餐 ID
     * @param planName   套餐名称
     * @param baseAmount 原价（分）
     * @param promoCode  优惠码（可空，空表示不参与优惠）
     * @return 购买结果视图（订单号 / 原价 / 折扣 / 实付 / 扣费后余额 / 新 VIP 到期时间）
     */
    @Transactional
    public PurchaseResultView purchaseVip(Long userId, String planId, String planName,
                                          Integer baseAmount, String promoCode) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        if (baseAmount == null || baseAmount < 0) {
            throw new IllegalArgumentException(ErrorMessages.PLAN_PRICE_NOT_NEGATIVE);
        }
        if (planId == null || planId.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PLAN_ID_REQUIRED);
        }

        // 1. 优惠码折扣消费（R4-00320）：redeem 原子消耗使用次数并返回折扣
        int discountAmount = 0;
        String usedCode = null;
        if (promoCode != null && !promoCode.isBlank()) {
            if (promoCodeService == null) {
                throw new IllegalStateException("优惠码服务不可用，请稍后重试");
            }
            PromoCodeService.RedeemResultView redeem = promoCodeService.redeem(promoCode, userId, baseAmount);
            discountAmount = redeem.discountAmount();
            usedCode = redeem.code();
        }
        int finalAmount = Math.max(0, baseAmount - discountAmount);

        // 2. 钱包扣费（折后价；orderId 唯一索引幂等防重复扣款）
        String orderNo = "VIP-PURCHASE-" + UUID.randomUUID().toString().replace("-", "");
        Long balanceAfter = null;
        if (finalAmount > 0) {
            if (walletService == null) {
                throw new IllegalStateException("钱包服务不可用，请稍后重试");
            }
            balanceAfter = walletService.deduct(
                    userId,
                    (long) finalAmount,
                    orderNo,
                    WalletTransactionLog.RELATED_TYPE_VIP_PURCHASE,
                    orderNo);
        }

        // 3. 写入账单并顺延 VIP 到期时间（与支付回调开通逻辑对齐：max(now, 当前 periodEnd) + 套餐天数）
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        LocalDateTime newExpiry = grantVipExpiry(userId, VIP_GRANT_DAYS);
        BillView bill = createBill(userId, planId, planName != null ? planName : "月度会员",
                finalAmount, baseAmount, "SUBSCRIBE", "SUCCESS", "WALLET",
                orderNo, now.toString(), newExpiry.toString(),
                usedCode != null
                        ? "VIP 购买（钱包支付），优惠码 " + usedCode + " 抵扣 " + discountAmount + " 分"
                        : "VIP 购买（钱包支付）");
        log.debug("VIP 购买账单已写入：billId={}, orderNo={}", bill.id(), orderNo);

        log.info("VIP 购买成功：userId={}, orderNo={}, baseAmount={}, discount={}, finalAmount={}",
                userId, orderNo, baseAmount, discountAmount, finalAmount);
        return new PurchaseResultView(orderNo, baseAmount, discountAmount, finalAmount,
                balanceAfter, newExpiry.toString());
    }

    /**
     * 计算并返回购买后 VIP 到期时间（max(now, 最近一笔 SUCCESS 账单 periodEnd) + grantDays）。
     * 与支付回调开通规则一致，保证续购不丢失剩余权益天数。
     *
     * <p>2026-10-05 微信支付工程补齐：由 private 提升为 public，供
     * {@link VipOrderService} 支付回调开通时复用（天数按套餐定义传入，
     * 原固定 30 天扩展为套餐快照天数）。</p>
     *
     * @param userId    用户 ID
     * @param grantDays 本次授予天数（monthly=30 / quarterly=90 / yearly=365）
     * @return 新的 VIP 到期时间
     */
    public LocalDateTime grantVipExpiry(Long userId, int grantDays) {
        List<VipBill> bills = vipBillRepository.findByUserIdOrderByCreatedAtDesc(userId);
        LocalDateTime base = LocalDateTime.now(TimeZones.BUSINESS);
        if (bills != null) {
            for (VipBill bill : bills) {
                if ("SUCCESS".equals(bill.getStatus()) && bill.getPeriodEnd() != null
                        && bill.getPeriodEnd().isAfter(base)) {
                    base = bill.getPeriodEnd();
                    break;
                }
            }
        }
        return base.plusDays(grantDays);
    }

    /**
     * 查询当前用户的账单列表（分页）。
     * <p>按创建时间倒序返回当前页的账单记录。</p>
     *
     * @param userId 用户 ID
     * @param page   页码（从 0 开始）
     * @param size   每页大小
     * @return 账单列表视图（含 items、total、page、size、totalPages）
     * @throws IllegalArgumentException 用户 ID 为空或分页参数非法时抛出
     */
    @Transactional(readOnly = true)
    public BillListResponse listBills(Long userId, Integer page, Integer size) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        if (page == null || page < 0) {
            throw new IllegalArgumentException(ErrorMessages.PAGE_NUM_NOT_NEGATIVE);
        }
        if (size == null || size <= 0) {
            throw new IllegalArgumentException(ErrorMessages.PAGE_SIZE_POSITIVE);
        }

        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<VipBill> billPage = vipBillRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);

            List<BillView> views = new ArrayList<>();
            for (VipBill bill : billPage.getContent()) {
                views.add(toView(bill));
            }

            return new BillListResponse(
                    views,
                    billPage.getTotalElements(),
                    billPage.getNumber(),
                    billPage.getSize(),
                    billPage.getTotalPages()
            );
        } catch (DataAccessException e) {
            // 数据库访问异常
            log.error("账单列表查询失败：userId={}, page={}, size={}", userId, page, size, e);
            throw new RuntimeException(ErrorMessages.BILL_QUERY_FAILED_RETRY, e);
        }
    }

    // infra R2-00222: 删除无分页版 listBills（无调用方，全量账单列表膨胀风险），
    // 统一走带 page/size 的分页版本（BillingController 已接入）

    /**
     * 创建账单记录（支付成功后调用）。
     * <p>由支付回调或订阅服务调用，记录本次支付明细。</p>
     *
     * @param userId        用户 ID
     * @param planId        套餐 ID
     * @param planName      套餐名称
     * @param amount        支付金额（分）
     * @param originalAmount 原价（分）
     * @param type          类型 SUBSCRIBE/RENEW/REFUND
     * @param status        状态 SUCCESS/FAILED/REFUNDED
     * @param paymentMethod 支付方式
     * @param transactionId 第三方交易号
     * @param periodStart   有效期开始时间（ISO 字符串）
     * @param periodEnd     有效期结束时间（ISO 字符串）
     * @param remark        备注
     * @return 账单视图
     */
    @Transactional
    public BillView createBill(Long userId, String planId, String planName, Integer amount,
                               Integer originalAmount, String type, String status,
                               String paymentMethod, String transactionId,
                               String periodStart, String periodEnd, String remark) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        if (amount == null || amount < 0) {
            throw new IllegalArgumentException(ErrorMessages.PAYMENT_AMOUNT_NOT_NEGATIVE);
        }

        try {
            VipBill bill = new VipBill();
            bill.setUserId(userId);
            bill.setPlanId(planId);
            bill.setPlanName(planName);
            bill.setAmount(amount);
            bill.setOriginalAmount(originalAmount);
            bill.setType(type != null ? type : "SUBSCRIBE");
            bill.setStatus(status != null ? status : "SUCCESS");
            bill.setPaymentMethod(paymentMethod != null ? paymentMethod : "WECHAT");
            bill.setTransactionId(transactionId);
            bill.setRemark(remark);
            bill.setCreatedAt(java.time.LocalDateTime.now(TimeZones.BUSINESS));
            // 简化处理：periodStart/periodEnd 仅在字符串非空时尝试解析
            if (periodStart != null && !periodStart.isBlank()) {
                try {
                    bill.setPeriodStart(java.time.LocalDateTime.parse(periodStart));
                } catch (DateTimeParseException e) {
                    // 时间字符串格式不合法（非 ISO-8601 LocalDateTime 格式）
                    log.warn("periodStart 解析失败：{}", periodStart, e);
                }
            }
            if (periodEnd != null && !periodEnd.isBlank()) {
                try {
                    bill.setPeriodEnd(java.time.LocalDateTime.parse(periodEnd));
                } catch (DateTimeParseException e) {
                    // 时间字符串格式不合法（非 ISO-8601 LocalDateTime 格式）
                    log.warn("periodEnd 解析失败：{}", periodEnd, e);
                }
            }

            VipBill saved = vipBillRepository.save(bill);
            log.info("账单创建成功：id={}, userId={}, amount={}", saved.getId(), userId, amount);
            return toView(saved);
        } catch (DataAccessException e) {
            // 数据库写入失败时回滚事务并上报
            log.error("账单创建失败：userId={}, amount={}", userId, amount, e);
            throw new RuntimeException(ErrorMessages.BILL_CREATE_FAILED_RETRY, e);
        }
    }

    /**
     * 实体转视图。
     */
    private BillView toView(VipBill bill) {
        return new BillView(
                bill.getId(),
                bill.getUserId(),
                bill.getPlanId(),
                bill.getPlanName(),
                bill.getAmount(),
                bill.getOriginalAmount(),
                bill.getType(),
                bill.getStatus(),
                bill.getPaymentMethod(),
                bill.getTransactionId(),
                bill.getPeriodStart() != null ? bill.getPeriodStart().toString() : null,
                bill.getPeriodEnd() != null ? bill.getPeriodEnd().toString() : null,
                bill.getRemark(),
                bill.getCreatedAt() != null ? bill.getCreatedAt().toString() : null
        );
    }

    /**
     * 账单视图。
     */
    public record BillView(
            Long id,
            Long userId,
            String planId,
            String planName,
            Integer amount,
            Integer originalAmount,
            String type,
            String status,
            String paymentMethod,
            String transactionId,
            String periodStart,
            String periodEnd,
            String remark,
            String createdAt
    ) {
    }

    /**
     * VIP 购买结果视图（R4-00320）。
     *
     * @param orderNo      订单号（钱包流水 order_id 幂等键）
     * @param baseAmount   原价（分）
     * @param discountAmount 优惠码折扣金额（分，未使用优惠码为 0）
     * @param finalAmount  实付金额（分）
     * @param balanceAfter 扣费后钱包余额（分；折后价为 0 未扣费时为 null）
     * @param newExpiry    新 VIP 到期时间（ISO 字符串）
     */
    public record PurchaseResultView(
            String orderNo,
            Integer baseAmount,
            Integer discountAmount,
            Integer finalAmount,
            Long balanceAfter,
            String newExpiry
    ) {
    }

    /**
     * 账单列表响应（含分页元信息）。
     *
     * @param items      当前页账单列表
     * @param total      总记录数
     * @param page       当前页码（从 0 开始）
     * @param size       每页大小
     * @param totalPages 总页数
     */
    public record BillListResponse(
            List<BillView> items,
            Long total,
            Integer page,
            Integer size,
            Integer totalPages
    ) {
        /**
         * 兼容旧调用：仅传 items 与 total，分页元信息使用默认值。
         */
        public BillListResponse(List<BillView> items, Integer total) {
            this(items, total == null ? null : total.longValue(), 0, items.size(), 1);
        }

        /**
         * 兼容旧调用：仅传 items 与 total(long)，分页元信息使用默认值。
         */
        public BillListResponse(List<BillView> items, Long total) {
            this(items, total, 0, items.size(), 1);
        }
    }
}
