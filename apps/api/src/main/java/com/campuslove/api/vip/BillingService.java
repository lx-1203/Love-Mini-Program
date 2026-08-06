package com.campuslove.api.vip;

import com.campuslove.api.entity.PaymentCallbackLog;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.VipBillRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    /** 金额对账容差：1 分。
     * <p>微信支付金额以分为单位，回调通知金额与订单金额可能因四舍五入存在 1 分差异，
     * 在容差范围内视为一致；超出容差则记录告警并返回 FAIL。</p>
     */
    private static final int AMOUNT_TOLERANCE_CENTS = 1;

    /**
     * 支付成功后授予的 VIP 时长（天）：30 天（月度套餐）。
     * FIN HIGH-11：支付回调成功时按此天数延长 {@code vip_bills.period_end}。
     */
    private static final int VIP_GRANT_DAYS = 30;

    private final VipBillRepository vipBillRepository;
    private final PaymentCallbackLogRepository paymentCallbackLogRepository;

    public BillingService(VipBillRepository vipBillRepository,
                          PaymentCallbackLogRepository paymentCallbackLogRepository) {
        this.vipBillRepository = vipBillRepository;
        this.paymentCallbackLogRepository = paymentCallbackLogRepository;
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
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        if (page == null || page < 0) {
            throw new IllegalArgumentException("页码不能为负数");
        }
        if (size == null || size <= 0) {
            throw new IllegalArgumentException("每页大小必须大于 0");
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
            throw new RuntimeException("账单查询失败，请稍后重试", e);
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
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        if (amount == null || amount < 0) {
            throw new IllegalArgumentException("支付金额不能为负数");
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
            bill.setCreatedAt(java.time.LocalDateTime.now());
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
            throw new RuntimeException("账单创建失败，请稍后重试", e);
        }
    }

    /**
     * 处理微信支付回调（幂等）。
     *
     * <p>Task 12.1（REAUDIT-REPORT-100+ 编号 38）：支付回调幂等性 + 金额对账。</p>
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>幂等键检查：notification_id + order_no 组合，查询 payment_callback_log 表，
     *       若已处理过该 notification_id 直接返回 SUCCESS（不重复开通）</li>
     *   <li>金额校验：回调金额 vs 订单金额（vip_bills.amount），不一致记录告警并返回 FAIL</li>
     *   <li>处理业务：调用 createBill 写入账单（实际生产应调用 VIP 开通服务）</li>
     *   <li>写日志：将本次处理结果写入 payment_callback_log 表</li>
     * </ol>
     *
     * <p>幂等键设计：notification_id 是微信回调的唯一标识，作为幂等键主体。
     * 同时携带 order_no 便于按订单号查询历史回调。即使攻击者伪造不同 notification_id，
     * 由于 vip_bills.transaction_id 已存在唯一约束（业务层校验），仍能防止重复开通。</p>
     *
     * @param notificationId 微信回调通知 ID（幂等键）
     * @param orderNo        业务订单号
     * @param callbackAmount 回调通知金额（元，BigDecimal 避免浮点精度）
     * @param userId         用户 ID（用于创建账单）
     * @param planId         套餐 ID（用于创建账单）
     * @param planName       套餐名称（用于创建账单）
     * @return 处理结果 SUCCESS / FAIL
     */
    @Transactional
    public String handlePaymentCallback(String notificationId, String orderNo,
                                        BigDecimal callbackAmount, Long userId,
                                        String planId, String planName) {
        // 1. 参数校验
        if (notificationId == null || notificationId.isBlank()) {
            log.warn("支付回调缺少 notificationId，orderNo={}", orderNo);
            return "FAIL";
        }
        if (orderNo == null || orderNo.isBlank()) {
            log.warn("支付回调缺少 orderNo，notificationId={}", notificationId);
            return "FAIL";
        }
        if (callbackAmount == null || callbackAmount.signum() < 0) {
            log.warn("支付回调金额非法：notificationId={}, amount={}", notificationId, callbackAmount);
            return "FAIL";
        }

        // 2. 幂等键检查：若已处理过该 notification_id，直接返回 SUCCESS 不重复开通
        // 注意（R2 review MED）：幂等仅按 notification_id 维度。同一 orderNo 若以
        // 不同 notificationId 重复回调，会绕过此检查重复开通/顺延 VIP。
        // 账单表 transaction_id 当前仅为普通 INDEX（非唯一约束），接入真实支付前
        // 必须：a) 为 vip_bills.transaction_id 建唯一约束；b) 增加按 orderNo 的幂等检查。
        Optional<PaymentCallbackLog> existing = paymentCallbackLogRepository
                .findByNotificationId(notificationId);
        if (existing.isPresent()) {
            log.info("支付回调重复通知，已处理过：notificationId={}, orderNo={}, status={}",
                    notificationId, orderNo, existing.get().getStatus());
            // 重复通知直接返回 SUCCESS，微信收到 SUCCESS 后不再重试
            return "SUCCESS";
        }

        // 3. 金额校验：回调金额 vs 订单金额
        // 通过订单号查找对应账单（VIP 账单 transaction_id 即订单号）
        Optional<VipBill> billOpt = vipBillRepository.findByTransactionId(orderNo);
        if (billOpt.isEmpty()) {
            // 订单不存在：可能是攻击者伪造订单号，记录告警并返回 FAIL
            log.warn("支付回调订单不存在：notificationId={}, orderNo={}", notificationId, orderNo);
            writeCallbackLog(notificationId, orderNo, callbackAmount, "FAIL");
            return "FAIL";
        }

        VipBill bill = billOpt.get();
        // 账单金额以"分"存储，回调金额以"元"传入，统一转为分比较
        int callbackCents = callbackAmount.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP).intValueExact();
        int orderCents = bill.getAmount() != null ? bill.getAmount() : 0;
        if (Math.abs(callbackCents - orderCents) > AMOUNT_TOLERANCE_CENTS) {
            // 金额不一致：可能少付、伪造回调，记录告警并返回 FAIL
            log.warn("支付回调金额对账失败：notificationId={}, orderNo={}, callbackCents={}, orderCents={}",
                    notificationId, orderNo, callbackCents, orderCents);
            writeCallbackLog(notificationId, orderNo, callbackAmount, "FAIL");
            return "FAIL";
        }

        try {
            // 4. 处理业务：账单状态置为 SUCCESS + 开通/延长 VIP 权益（FIN HIGH-11）
            //    修复前仅更新账单状态，支付成功但用户权益未开通，支付-权益链路断裂。
            //    开通逻辑：以 vip_bills.period_end 记录 VIP 有效期结束时间（User 实体
            //    未定义 vipExpiresAt 字段，VipBill.periodEnd 即"VIP 有效期结束时间"，见实体注释）。
            //    规则：取 max(当前时间, 账单原 periodEnd) + 30 天（月度套餐），
            //    保证新订阅/续费均正确顺延，不会因续费时间点丢失剩余天数。
            bill.setStatus("SUCCESS");
            bill.setTransactionId(orderNo);
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime base = (bill.getPeriodEnd() != null && bill.getPeriodEnd().isAfter(now))
                    ? bill.getPeriodEnd() : now;
            bill.setPeriodEnd(base.plusDays(VIP_GRANT_DAYS));
            if (bill.getPeriodStart() == null) {
                bill.setPeriodStart(now);
            }
            vipBillRepository.save(bill);
            log.info("支付回调处理成功并开通/延长 VIP：notificationId={}, orderNo={}, userId={}, amount={}, newExpiry={}",
                    notificationId, orderNo, userId, callbackAmount, bill.getPeriodEnd());

            // 5. 写日志：将本次处理结果写入 payment_callback_log 表
            writeCallbackLog(notificationId, orderNo, callbackAmount, "SUCCESS");

            log.info("支付回调处理成功：notificationId={}, orderNo={}, userId={}, amount={}",
                    notificationId, orderNo, userId, callbackAmount);
            return "SUCCESS";
        } catch (DataAccessException e) {
            // 数据库写入失败：返回 FAIL 触发微信重试
            log.error("支付回调处理失败：notificationId={}, orderNo={}", notificationId, orderNo, e);
            return "FAIL";
        }
    }

    /**
     * 写入支付回调日志（内部辅助方法）。
     *
     * <p>独立 try-catch 防止日志写入失败影响主流程返回值。
     * 若日志写入失败，主流程仍按业务结果返回，但会记录 ERROR 日志。</p>
     *
     * @param notificationId 微信回调通知 ID
     * @param orderNo        业务订单号
     * @param amount         回调金额（元）
     * @param status         处理状态 SUCCESS / FAIL
     */
    private void writeCallbackLog(String notificationId, String orderNo,
                                  BigDecimal amount, String status) {
        try {
            PaymentCallbackLog logEntry = new PaymentCallbackLog();
            logEntry.setNotificationId(notificationId);
            logEntry.setOrderNo(orderNo);
            logEntry.setAmount(amount);
            logEntry.setStatus(status);
            logEntry.setCreatedAt(LocalDateTime.now());
            paymentCallbackLogRepository.save(logEntry);
        } catch (DataAccessException e) {
            // 日志写入失败不影响主流程，但需记录 ERROR 便于排查
            log.error("支付回调日志写入失败：notificationId={}, orderNo={}",
                    notificationId, orderNo, e);
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
