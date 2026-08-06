package com.campuslove.api.wallet;

import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 钱包控制器（走查补齐：钱包 HTTP 端点化）。
 *
 * <p>背景：Task 2（FIN-00003）+ Task 15（FIN-00171）已实现钱包表与服务层
 * （{@link WalletService}：deduct / recharge / getBalance），但未暴露 HTTP 端点，
 * 前端"我的钱包 / 余额 / 充值 / 账单"入口无对应后端接口，走查标记为功能缺口。
 * 本控制器补齐以下端点：</p>
 * <ul>
 *   <li>GET  /api/v1/wallet/balance      - 查询当前用户钱包余额（分）</li>
 *   <li>GET  /api/v1/wallet/transactions - 分页查询当前用户钱包流水（账单），按创建时间倒序</li>
 *   <li>POST /api/v1/wallet/recharge     - 充值（演示/模拟充值：无支付网关，直接入账）</li>
 * </ul>
 *
 * <p>设计说明：</p>
 * <ul>
 *   <li>用户 ID 从 JWT 认证上下文获取（{@link SecurityUtils#getCurrentUserId()}），
 *       与项目其他写/读接口保持一致</li>
 *   <li>金额单位：分（cents），与 {@link UserWallet#getBalanceCents()} 存储口径一致；
 *       前端展示时自行转换元（分 / 100）</li>
 *   <li>流水分页结构与 VIP 账单（{@code items / total / page / size / totalPages}，
 *       page 从 0 开始）保持一致，便于前端账单类页面复用同一渲染结构</li>
 *   <li>写接口按项目约定带 {@link Idempotent}（客户端需携带 Idempotency-Key 请求头）；
 *       服务层另有 order_id 唯一索引幂等兜底</li>
 * </ul>
 *
 * <p>双 profile 可用：real 走 {@link WalletServiceImpl}（数据库），
 * mock 走 {@link MockWalletServiceImpl}（内存），展示版/本地开发可完整演示钱包流程。</p>
 */
@RestController
@RequestMapping("/api/v1/wallet")
@Validated
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    /**
     * 查询当前用户钱包余额。
     *
     * <p>钱包不存在时返回 0（服务层不自动创建，读操作无副作用）。</p>
     *
     * @return 钱包余额视图（balanceCents：余额，单位分）
     */
    @GetMapping("/balance")
    public WalletBalanceView getBalance() {
        Long userId = SecurityUtils.getCurrentUserId();
        return new WalletBalanceView(walletService.getBalance(userId));
    }

    /**
     * 分页查询当前用户钱包流水（账单），按创建时间倒序。
     *
     * @param page 页码（从 0 开始，默认 0）
     * @param size 每页大小（默认 20，最大 100）
     * @return 流水分页视图（items / total / page / size / totalPages）
     */
    @GetMapping("/transactions")
    public WalletTransactionListView listTransactions(
            @RequestParam(name = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", required = false, defaultValue = "20") @Min(1) @Max(100) int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        Page<WalletTransactionLog> txPage = walletService.listTransactions(userId, PageRequest.of(page, size));
        List<WalletTransactionItemView> items = txPage.getContent().stream()
                .map(WalletController::toItemView)
                .toList();
        return new WalletTransactionListView(items, txPage.getTotalElements(), page, size, txPage.getTotalPages());
    }

    /**
     * 充值（演示/模拟充值）。
     *
     * <p><b>说明</b>：当前无支付网关，采用演示充值实现——收到请求即视为支付成功，
     * 直接调用 {@link WalletService#recharge} 入账并写 CREDIT 流水。
     * <b>生产环境必须接入支付网关（微信支付/支付宝）+ 支付回调验签</b>，
     * 仅在支付回调确认成功后入账，本端点应替换为"创建充值订单"语义。</p>
     *
     * <p>幂等：{@link Idempotent}（Idempotency-Key 头）防止重复提交；
     * 服务层 orderId（UUID）配合 order_id 唯一索引兜底。</p>
     *
     * @param request 充值请求体（amountCents：充值金额，单位分）
     * @return 充值结果视图（充值后余额 balanceAfterCents / 充值金额 amountCents / orderId）
     */
    @PostMapping("/recharge")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public WalletRechargeView recharge(@Valid @RequestBody RechargeRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        // 演示充值：服务端生成订单号（UUID）；生产接入支付后，orderId 应由支付回调上下文确定
        String orderId = "WALLET-RECHARGE-" + UUID.randomUUID();
        Long balanceAfter = walletService.recharge(userId, request.amountCents(), orderId,
                WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE, null);
        return new WalletRechargeView(balanceAfter, request.amountCents(), orderId,
                WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE);
    }

    /**
     * 交友币消费（扣减）。
     *
     * <p>面向"解锁私信 / 访客 / 喜欢你"等交友币消费场景的通用扣费端点。
     * 幂等：Idempotency-Key 请求头 + 服务层 orderId 唯一索引兜底，
     * 同一业务扣费（orderId 相同）重复调用不重复扣钱。</p>
     *
     * <p>调用方约定：orderId 建议为 {@code UNLOCK-{scene}-{targetUserId}}，
     * scene ∈ MESSAGE / VISITORS / LIKES / WHISPER；余额不足返回
     * {@link InsufficientBalanceException}（HTTP 409，见全局异常处理）。</p>
     *
     * @param request 扣费请求体
     * @return 扣费结果视图（扣减后余额）
     */
    @PostMapping("/deduct")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public WalletDeductView deduct(@Valid @RequestBody DeductRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        String orderId = request.orderId() != null && !request.orderId().isBlank()
                ? request.orderId()
                : "UNLOCK-" + UUID.randomUUID();
        Long balanceAfter = walletService.deduct(userId, request.amountCents(), orderId,
                request.relatedType(), request.relatedId());
        return new WalletDeductView(balanceAfter, request.amountCents(), orderId);
    }

    /** 实体 → 流水项视图映射。 */
    private static WalletTransactionItemView toItemView(WalletTransactionLog log) {
        return new WalletTransactionItemView(
                log.getId(),
                log.getType(),
                log.getAmount(),
                log.getBalanceAfter(),
                log.getRelatedType(),
                log.getRelatedId(),
                log.getOrderId(),
                log.getRemark(),
                log.getCreatedAt());
    }
}

/** 钱包余额视图。 */
record WalletBalanceView(Long balanceCents) {
}

/** 交友币扣费结果视图。 */
record WalletDeductView(
        Long balanceAfterCents,
        Long amountCents,
        String orderId) {
}

/**
 * 交友币扣费请求体。
 *
 * @param amountCents 扣减金额（分，1 ~ 100_000_000）
 * @param orderId     幂等订单号（建议 UNLOCK-{scene}-{targetUserId}，可空，空则服务端生成）
 * @param relatedType 关联业务类型（MESSAGE_UNLOCK / VISITORS_UNLOCK / LIKES_UNLOCK / WHISPER_UNLOCK）
 * @param relatedId   关联业务实体 ID（如目标用户 ID，可空）
 */
record DeductRequest(
        @NotNull(message = "扣减金额不能为空")
        @Min(value = 1, message = "扣减金额必须大于 0")
        @Max(value = 100_000_000, message = "单次扣减金额超出上限")
        Long amountCents,
        String orderId,
        @NotNull(message = "关联业务类型不能为空")
        String relatedType,
        String relatedId) {
}

/** 钱包流水项视图（字段与 WalletTransactionLog 对齐，供账单页消费）。 */
record WalletTransactionItemView(
        Long id,
        String type,
        Long amount,
        Long balanceAfter,
        String relatedType,
        String relatedId,
        String orderId,
        String remark,
        LocalDateTime createdAt) {
}

/** 钱包流水分页视图（结构对齐 VIP 账单 BillListResponse：items/total/page/size/totalPages）。 */
record WalletTransactionListView(
        List<WalletTransactionItemView> items,
        long total,
        int page,
        int size,
        int totalPages) {
}

/** 钱包充值结果视图。 */
record WalletRechargeView(
        Long balanceAfterCents,
        Long amountCents,
        String orderId,
        String relatedType) {
}

/**
 * 充值请求体。
 *
 * @param amountCents 充值金额（分，1 ~ 100_000_000 即 1 分 ~ 100 万元）
 */
record RechargeRequest(
        @NotNull(message = "充值金额不能为空")
        @Min(value = 1, message = "充值金额必须大于 0")
        @Max(value = 100_000_000, message = "单次充值金额超出上限")
        Long amountCents) {
}
