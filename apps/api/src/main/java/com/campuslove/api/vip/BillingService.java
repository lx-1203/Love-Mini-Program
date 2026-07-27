package com.campuslove.api.vip;

import com.campuslove.api.entity.VipBill;
import com.campuslove.api.repository.VipBillRepository;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
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

    private final VipBillRepository vipBillRepository;

    public BillingService(VipBillRepository vipBillRepository) {
        this.vipBillRepository = vipBillRepository;
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

    /**
     * 查询当前用户的账单列表（全量，兼容旧接口）。
     * <p>仅供内部或测试使用，前端请使用分页接口。</p>
     *
     * @param userId 用户 ID
     * @return 账单列表视图
     */
    @Transactional(readOnly = true)
    public BillListResponse listBills(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }

        try {
            List<VipBill> bills = vipBillRepository.findByUserIdOrderByCreatedAtDesc(userId);
            List<BillView> views = new ArrayList<>();
            for (VipBill bill : bills) {
                views.add(toView(bill));
            }
            return new BillListResponse(views, (long) views.size(), 0, views.size(), 1);
        } catch (DataAccessException e) {
            // 数据库查询失败时上报，由 GlobalExceptionHandler 转换为 5xx 响应
            log.error("账单列表查询失败：userId={}", userId, e);
            throw new RuntimeException("账单查询失败，请稍后重试", e);
        }
    }

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
