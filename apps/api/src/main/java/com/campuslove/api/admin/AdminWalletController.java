package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.wallet.UserWallet;
import com.campuslove.api.wallet.UserWalletRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import com.campuslove.api.wallet.WalletTransactionLogRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
 * 管理后台 - 钱包商业模块控制器。
 * <p>提供钱包分页列表、钱包流水分页、管理员调整余额等管理端点。</p>
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 * <p>数据隔离：钱包/流水均按用户归属校区（{@code UserCampusProfile.campusName}）过滤，
 * 校区管理员仅可见本校区用户的数据；调额写操作越权返回 403。</p>
 * <p>金额单位：所有金额以「分」为整数存储（balanceCents/amount）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/business/wallets")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminWalletController {

    /** 管理员调额流水关联业务类型 */
    private static final String RELATED_TYPE_ADMIN_ADJUST = "ADMIN_ADJUST";

    private final UserWalletRepository userWalletRepository;
    private final WalletTransactionLogRepository transactionLogRepository;
    private final WalletService walletService;
    private final UserRepository userRepository;
    /** 校园管理员数据隔离（商业模式：每个高校一个管理员） */
    private final AdminDataScope adminDataScope;

    public AdminWalletController(
            UserWalletRepository userWalletRepository,
            WalletTransactionLogRepository transactionLogRepository,
            WalletService walletService,
            UserRepository userRepository,
            AdminDataScope adminDataScope) {
        this.userWalletRepository = userWalletRepository;
        this.transactionLogRepository = transactionLogRepository;
        this.walletService = walletService;
        this.userRepository = userRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询钱包列表（支持用户/余额范围筛选 + 校区数据隔离）。
     *
     * @param userId      用户 ID，可选
     * @param balanceFrom 余额下限（分），可选
     * @param balanceTo   余额上限（分），可选
     * @param page        页码，1-based，默认 1
     * @param pageSize    每页大小，默认 20，最大 100
     * @return 分页钱包列表（按更新时间倒序）
     */
    @GetMapping
    public AdminPageView<AdminWalletView> listWallets(
            @RequestParam(name = "userId", required = false) @Positive Long userId,
            @RequestParam(name = "balanceFrom", required = false) @Min(0) Long balanceFrom,
            @RequestParam(name = "balanceTo", required = false) @Min(0) Long balanceTo,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        // 余额范围参数自校验：下限不得大于上限
        if (balanceFrom != null && balanceTo != null && balanceFrom > balanceTo) {
            throw new IllegalArgumentException("余额下限不能大于上限");
        }

        // 数据隔离：当前管理员为校区管理员时强制按其管辖校区过滤
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<UserWallet> result = userWalletRepository.searchForAdmin(
                userId, balanceFrom, balanceTo, effectiveCampus, pageable);

        List<AdminWalletView> items = result.getContent().stream()
                .map(this::toWalletView)
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
     * 分页查询钱包流水（支持用户/交易类型筛选 + 校区数据隔离）。
     *
     * @param userId   用户 ID，可选
     * @param type     交易类型（DEBIT/CREDIT），可选
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页流水列表（按创建时间倒序）
     */
    @GetMapping("/transactions")
    public AdminPageView<AdminWalletTransactionView> listTransactions(
            @RequestParam(name = "userId", required = false) @Positive Long userId,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedType = parseTransactionType(type);

        // 数据隔离：流水按用户归属校区过滤
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<WalletTransactionLog> result = transactionLogRepository.searchForAdmin(
                userId, normalizedType, effectiveCampus, pageable);

        List<AdminWalletTransactionView> items = result.getContent().stream()
                .map(this::toTransactionView)
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
     * 管理员调整用户钱包余额（正数充值、负数扣减）。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>校验目标用户存在</li>
     *   <li>数据隔离：校区管理员越权操作其他校区用户返回 403</li>
     *   <li>amount &gt; 0 调用 {@link WalletService#recharge} 充值；amount &lt; 0 调用
     *       {@link WalletService#deduct} 扣减（余额不足时全局异常处理返回 409）</li>
     *   <li>复用钱包服务既有悲观锁 + 幂等键（orderId 由本端点生成，UUID 保证唯一）能力，
     *       余额变动与流水写入原子提交</li>
     * </ol>
     *
     * @param userId 目标用户 ID
     * @param req    调额请求体
     * @return 调额结果（调额后余额）
     */
    @PostMapping("/{userId}/adjust")
    @Auditable(value = AuditOperation.ADJUST_WALLET, targetType = "USER",
            description = "管理员调整钱包余额")
    public Map<String, Object> adjust(
            @PathVariable("userId") @Positive Long userId,
            @Valid @RequestBody AdminWalletAdjustRequest req) {
        SecurityUtils.getCurrentUserId();

        // 显式参数校验（与 @Valid 双保险，保证统一中文错误文案）
        if (req.amount() == null || req.amount() == 0) {
            throw new IllegalArgumentException("调整金额不能为空且不能为 0（正数充值、负数扣减）");
        }

        // 校验目标用户存在
        if (userRepository.findById(userId).isEmpty()) {
            throw new IllegalArgumentException("用户不存在: userId=" + userId);
        }

        // 数据隔离（写操作越权拦截）：校区管理员只能调整本校区用户余额
        adminDataScope.assertCampusAccess(adminDataScope.resolveUserCampusName(userId));

        // 幂等键：管理员调额单次请求全局唯一（UUID）
        String orderId = RELATED_TYPE_ADMIN_ADJUST + "_" + userId + "_" + UUID.randomUUID().toString().replace("-", "");
        String remark = normalize(req.reason());

        boolean isRecharge = req.amount() > 0;
        long amountCents = Math.abs(req.amount());
        Long balanceAfter = isRecharge
                ? walletService.recharge(userId, amountCents, orderId, RELATED_TYPE_ADMIN_ADJUST, null)
                : walletService.deduct(userId, amountCents, orderId, RELATED_TYPE_ADMIN_ADJUST, null);

        return Map.of(
                "userId", userId,
                "amount", req.amount(),
                "type", isRecharge ? "CREDIT" : "DEBIT",
                "balanceAfter", balanceAfter,
                "success", true
        );
    }

    /**
     * Entity 转钱包视图。
     */
    private AdminWalletView toWalletView(UserWallet wallet) {
        return new AdminWalletView(
                wallet.getId(),
                wallet.getUserId(),
                wallet.getBalanceCents(),
                wallet.getFrozenCents(),
                wallet.getCreatedAt(),
                wallet.getUpdatedAt()
        );
    }

    /**
     * Entity 转流水视图。
     */
    private AdminWalletTransactionView toTransactionView(WalletTransactionLog logEntry) {
        return new AdminWalletTransactionView(
                logEntry.getId(),
                logEntry.getUserId(),
                logEntry.getType(),
                logEntry.getAmount(),
                logEntry.getBalanceAfter(),
                logEntry.getRelatedType(),
                logEntry.getRelatedId(),
                logEntry.getOrderId(),
                logEntry.getRemark(),
                logEntry.getCreatedAt()
        );
    }

    /**
     * 解析交易类型参数（大小写不敏感），非法参数直接 400。
     */
    private String parseTransactionType(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (WalletTransactionLog.TransactionType t : WalletTransactionLog.TransactionType.values()) {
            if (t.name().equalsIgnoreCase(trimmed)) {
                return t.name();
            }
        }
        throw new IllegalArgumentException("非法交易类型参数: " + value + "，仅支持 DEBIT/CREDIT");
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
     * 管理后台 - 调整钱包余额请求体。
     *
     * @param amount 调整金额（分）：正数充值、负数扣减，不可为 0
     * @param reason 调整原因（可空）
     */
    public record AdminWalletAdjustRequest(
            @NotNull Long amount,
            String reason
    ) {
    }

    /**
     * 管理后台 - 钱包视图。
     *
     * @param id          钱包 ID
     * @param userId      用户 ID
     * @param balanceCents 可用余额（分）
     * @param frozenCents 冻结金额（分）
     * @param createdAt   创建时间
     * @param updatedAt   更新时间
     */
    public record AdminWalletView(
            Long id,
            Long userId,
            Long balanceCents,
            Long frozenCents,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    /**
     * 管理后台 - 钱包流水视图。
     *
     * @param id           流水 ID
     * @param userId       用户 ID
     * @param type         交易类型 DEBIT/CREDIT
     * @param amount       交易金额（分）
     * @param balanceAfter 交易后余额（分）
     * @param relatedType  关联业务类型
     * @param relatedId    关联业务实体 ID
     * @param orderId      业务订单号（幂等键）
     * @param remark       备注
     * @param createdAt    创建时间
     */
    public record AdminWalletTransactionView(
            Long id,
            Long userId,
            String type,
            Long amount,
            Long balanceAfter,
            String relatedType,
            String relatedId,
            String orderId,
            String remark,
            LocalDateTime createdAt
    ) {
    }
}
