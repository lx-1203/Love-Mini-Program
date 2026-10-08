package com.campuslove.api.admin;

import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.vip.VipOrderService;
import com.campuslove.api.wxpay.WxPayDisabledException;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - VIP 账单查询控制器（R4-00397 注释更新：VIP 会员已下线，
 * 红包实体/页面已删，本控制器仅保留账单只读查询能力，供对账/追溯用）。
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 * <p>数据隔离：账单按用户归属校区（{@code UserCampusProfile.campusName}）过滤，
 * 校区管理员仅可见本校区用户的数据，全局管理员（SUPER_ADMIN 或 ADMIN 无校区）可见全部。</p>
 *
 * <p>2026-10-05 微信支付工程补齐：新增管理员退款发起端点
 * （POST /orders/{orderNo}/refund，仅 SUPER_ADMIN）——资金操作不开放给校区管理员。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/business/vip")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminVipController {

    private final VipBillRepository vipBillRepository;
    /** 校园管理员数据隔离（商业模式：每个高校一个管理员） */
    private final AdminDataScope adminDataScope;
    /** VIP 微信支付订单服务（2026-10-05：退款发起） */
    private final VipOrderService vipOrderService;

    public AdminVipController(
            VipBillRepository vipBillRepository,
            AdminDataScope adminDataScope,
            VipOrderService vipOrderService) {
        this.vipBillRepository = vipBillRepository;
        this.adminDataScope = adminDataScope;
        this.vipOrderService = vipOrderService;
    }

    /**
     * 分页查询 VIP 账单列表（支持用户/套餐/状态筛选 + 校区数据隔离）。
     *
     * @param userId   用户 ID，可选
     * @param planType 套餐 ID（monthly/quarterly/yearly），可选
     * @param status   账单状态（SUCCESS/FAILED/REFUNDED），可选
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页账单列表（按创建时间倒序）
     */
    @GetMapping("/bills")
    public AdminPageView<AdminVipBillView> listBills(
            @RequestParam(name = "userId", required = false) @Positive Long userId,
            @RequestParam(name = "planType", required = false) String planType,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedPlanType = normalize(planType);
        String normalizedStatus = normalize(status);

        // 数据隔离：当前管理员为校区管理员时强制按其管辖校区过滤，防止越权查看其他校区账单
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<VipBill> result = vipBillRepository.searchForAdmin(
                userId, normalizedPlanType, normalizedStatus, effectiveCampus, pageable);

        List<AdminVipBillView> items = result.getContent().stream()
                .map(this::toBillView)
                .toList();

        return new AdminPageView<>(
                items,
                result.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize)
        );
    }

    /**
     * 查询 VIP 账单详情。
     *
     * @param id 账单 ID
     * @return 账单详情；账单不存在返回 404
     */
    @GetMapping("/bills/{id}")
    public ResponseEntity<AdminVipBillView> getBill(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<VipBill> billOpt = vipBillRepository.findById(id);
        if (billOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 数据隔离：账单按用户归属校区隔离，校区管理员越权访问其他校区账单返回 403
        adminDataScope.assertCampusAccess(resolveUserCampus(billOpt.get().getUserId()));

        return ResponseEntity.ok(toBillView(billOpt.get()));
    }

    /**
     * 管理员发起 VIP 订单退款（2026-10-05 微信支付工程补齐，仅 SUPER_ADMIN）。
     * POST /api/v1/admin/business/vip/orders/{orderNo}/refund
     *
     * <p>流程：校验订单为 SUCCESS → 状态机迁移 REFUNDING → 调微信退款 API（全额，
     * 商户退款单号 RF+orderNo 幂等，重试安全）→ 返回受理结果。最终 REFUNDED 由
     * 微信退款回调（/api/v1/refund/notify）确认并写 REFUND 账单。</p>
     *
     * <p>错误口径：订单不存在/状态不允许 → 400（IllegalArgumentException）；
     * 微信支付管道未开（enabled=false，含 mock/off）→ 404（与用户端支付端点口径一致）；
     * 微信 API 失败 → 502 语义包装（事务已回滚，订单留在 SUCCESS，可凭同一单号重试）。</p>
     *
     * @param orderNo 商户订单号
     * @param request 退款原因（可空）
     * @return 退款受理视图
     */
    @PostMapping("/orders/{orderNo}/refund")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AdminRefundView> refundOrder(
            @PathVariable("orderNo") String orderNo,
            @RequestBody(required = false) AdminRefundRequest request) {
        SecurityUtils.getCurrentUserId();
        String reason = request != null ? request.reason() : null;
        try {
            VipOrderService.RefundInitiatedView view = vipOrderService.initiateRefund(orderNo, reason);
            return ResponseEntity.ok(new AdminRefundView(
                    view.orderNo(), view.refundId(), view.outRefundNo(),
                    view.status(), view.refundCents()));
        } catch (WxPayDisabledException e) {
            // 微信支付管道未开（mock/off）：拒绝发起，404 与用户端支付端点口径一致
            throw new ResourceNotFoundException("资源不存在");
        } catch (com.campuslove.api.wxpay.WxPayApiException e) {
            // 微信退款 API 失败：事务已回滚（订单留 SUCCESS），向管理端透出失败原因便于重试
            throw new IllegalStateException("微信退款受理失败: " + e.getMessage(), e);
        }
    }

    /**
     * 管理员退款发起请求体。
     *
     * @param reason 退款原因（审计日志用，可空）
     */
    public record AdminRefundRequest(String reason) {
    }

    /**
     * 管理员退款受理视图。
     *
     * @param orderNo     商户订单号
     * @param refundId    微信退款单号（受理成功返回）
     * @param outRefundNo 商户退款单号（RF + orderNo，幂等键）
     * @param status      订单状态（受理成功为 REFUNDING，等退款回调确认 REFUNDED）
     * @param refundCents 退款金额（分，当前为全额退款）
     */
    public record AdminRefundView(
            String orderNo,
            String refundId,
            String outRefundNo,
            String status,
            Integer refundCents
    ) {
    }

    /**
     * Entity 转账单视图。
     */
    private AdminVipBillView toBillView(VipBill bill) {
        return new AdminVipBillView(
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
                bill.getPeriodStart(),
                bill.getPeriodEnd(),
                bill.getCreatedAt()
        );
    }

    /**
     * 解析用户归属校区名（用于写操作越权校验）。
     * <p>通过用户 ID 反查 {@code UserCampusProfile}；未认证校区信息时返回 null（按全局资源处理）。</p>
     *
     * @param userId 用户 ID
     * @return 校区名（可能为 null）
     */
    private String resolveUserCampus(Long userId) {
        if (userId == null) {
            return null;
        }
        return adminDataScope.resolveUserCampusName(userId);
    }

    /**
     * 参数归一化：空字符串视为 null。
     */
    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    /**
     * 管理后台 - VIP 账单视图。
     *
     * @param id            账单 ID
     * @param userId        用户 ID
     * @param planId        套餐 ID
     * @param planName      套餐名称
     * @param amount        支付金额（分）
     * @param originalAmount 原价（分）
     * @param type          账单类型 SUBSCRIBE/RENEW/REFUND
     * @param status        状态 SUCCESS/FAILED/REFUNDED
     * @param paymentMethod 支付方式 WECHAT/ALIPAY
     * @param transactionId 第三方交易号
     * @param periodStart   VIP 有效期开始时间
     * @param periodEnd     VIP 有效期结束时间
     * @param createdAt     创建时间
     */
    public record AdminVipBillView(
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
            LocalDateTime periodStart,
            LocalDateTime periodEnd,
            LocalDateTime createdAt
    ) {
    }

}
