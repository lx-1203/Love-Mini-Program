package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.entity.VipRedPacket;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipRedPacketRepository;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - VIP 商业模块控制器。
 * <p>提供 VIP 账单分页列表、账单详情、VIP 红包分页列表等管理端点。</p>
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 * <p>数据隔离：账单/红包均按用户归属校区（{@code UserCampusProfile.campusName}）过滤，
 * 校区管理员仅可见本校区用户的数据，全局管理员（SUPER_ADMIN 或 ADMIN 无校区）可见全部。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/business/vip")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminVipController {

    private final VipBillRepository vipBillRepository;
    private final VipRedPacketRepository vipRedPacketRepository;
    /** 校园管理员数据隔离（商业模式：每个高校一个管理员） */
    private final AdminDataScope adminDataScope;

    public AdminVipController(
            VipBillRepository vipBillRepository,
            VipRedPacketRepository vipRedPacketRepository,
            AdminDataScope adminDataScope) {
        this.vipBillRepository = vipBillRepository;
        this.vipRedPacketRepository = vipRedPacketRepository;
        this.adminDataScope = adminDataScope;
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
     * 分页查询 VIP 红包列表（支持状态/创建时间筛选 + 校区数据隔离）。
     *
     * @param status        红包状态（PENDING/EXPIRED/DEPLETED），可选
     * @param createdAtFrom 创建起始时间，可选
     * @param createdAtTo   创建结束时间，可选
     * @param page          页码，1-based，默认 1
     * @param pageSize      每页大小，默认 20，最大 100
     * @return 分页红包列表（按创建时间倒序）
     */
    @GetMapping("/red-packets")
    public AdminPageView<AdminRedPacketView> listRedPackets(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "createdAtFrom", required = false) LocalDateTime createdAtFrom,
            @RequestParam(name = "createdAtTo", required = false) LocalDateTime createdAtTo,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedStatus = parseRedPacketStatus(status);

        // 数据隔离：红包按发送者归属校区过滤
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<VipRedPacket> result = vipRedPacketRepository.searchForAdmin(
                normalizedStatus, createdAtFrom, createdAtTo, effectiveCampus, pageable);

        List<AdminRedPacketView> items = result.getContent().stream()
                .map(this::toRedPacketView)
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
     * Entity 转红包视图。
     */
    private AdminRedPacketView toRedPacketView(VipRedPacket packet) {
        return new AdminRedPacketView(
                packet.getId(),
                packet.getSenderId(),
                packet.getTotalAmount(),
                packet.getTotalCount(),
                packet.getClaimedCount(),
                packet.getClaimedAmount(),
                packet.getType(),
                packet.getStatus(),
                packet.getBlessing(),
                packet.getExpireAt(),
                packet.getCreatedAt()
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
     * 解析红包状态参数，非法参数直接 400。
     */
    private String parseRedPacketStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (VipRedPacket.RedPacketStatus s : VipRedPacket.RedPacketStatus.values()) {
            if (s.name().equalsIgnoreCase(trimmed)) {
                return s.name();
            }
        }
        throw new IllegalArgumentException("非法红包状态参数: " + value);
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

    /**
     * 管理后台 - VIP 红包视图。
     *
     * @param id            红包 ID
     * @param senderId      发送者用户 ID
     * @param totalAmount   红包总金额（分）
     * @param totalCount    红包总个数
     * @param claimedCount  已领取个数
     * @param claimedAmount 已领取金额（分）
     * @param type          红包类型 NORMAL/LUCKY
     * @param status        状态 PENDING/EXPIRED/DEPLETED
     * @param blessing      祝福语
     * @param expireAt      过期时间
     * @param createdAt     创建时间
     */
    public record AdminRedPacketView(
            Long id,
            Long senderId,
            Integer totalAmount,
            Integer totalCount,
            Integer claimedCount,
            Integer claimedAmount,
            String type,
            String status,
            String blessing,
            LocalDateTime expireAt,
            LocalDateTime createdAt
    ) {
    }
}
