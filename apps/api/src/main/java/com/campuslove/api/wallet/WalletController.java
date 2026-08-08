package com.campuslove.api.wallet;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.common.DailyLimitExceededException;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
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
 *   <li>POST /api/v1/wallet/recharge     - 充值（演示/模拟充值：无支付网关直接入账，
 *       默认关闭，仅 mock 本地演示开启，见 P0-15/R4-00312 说明）</li>
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

    private static final Logger log = LoggerFactory.getLogger(WalletController.class);

    /** 演示充值每日计数 Redis key 前缀（P0-15 演示充值风控）。 */
    private static final String REDIS_KEY_PREFIX_DEMO_RECHARGE = "demo-recharge:count:";

    /** 日期格式（yyyyMMdd），用于组装每日计数 key。 */
    private static final DateTimeFormatter DATE_KEY_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** 每日演示充值计数 TTL：36 小时（覆盖跨自然日，避免 Redis 无限增长）。 */
    private static final long DEMO_RECHARGE_COUNT_TTL_HOURS = 36L;

    private final WalletService walletService;
    /**
     * P0-17：商业化解锁服务（喜欢我列表 / 访客列表付费解锁）。
     * 双 profile 可用：real 走 {@link RealWalletUnlockService}（数据库），
     * mock 走 {@link MockWalletUnlockService}（内存）。
     */
    private final WalletUnlockService walletUnlockService;

    /**
     * P0-15：演示充值开关（配置 app.demo-recharge.enabled）。
     * R4-00312：【默认关闭】——演示充值直接入账、无支付网关验签，默认开启等于
     * 任意用户可免费无限充值（资金/账务风险）。仅 mock（本地演示）profile 默认开启
     * （见 application-mock.yml）；生产必须接入支付网关（微信支付/支付宝）回调验签后
     * 入账（见 {@link #recharge} 说明），严禁通过 APP_DEMO_RECHARGE_ENABLED=true 开启直接入账。
     */
    @Value("${app.demo-recharge.enabled:false}")
    private boolean demoRechargeEnabled;

    /** P0-15：每用户每日演示充值次数上限（配置 app.demo-recharge.daily-limit，默认 5 次）。 */
    @Value("${app.demo-recharge.daily-limit:5}")
    private int demoRechargeDailyLimit;

    /**
     * Redis 模板（可选注入）：演示充值每日计数持久化。
     * Redis 不可用时降级到本地内存 {@link #localDemoRechargeCount}（单实例方案）。
     */
    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    /** Redis 不可用时的本地内存每日计数降级方案。 */
    private final ConcurrentHashMap<String, Integer> localDemoRechargeCount = new ConcurrentHashMap<>();

    public WalletController(WalletService walletService, WalletUnlockService walletUnlockService) {
        this.walletService = walletService;
        this.walletUnlockService = walletUnlockService;
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
     * <p>P0-15 演示充值风控：</p>
     * <ul>
     *   <li>开关控制：{@code app.demo-recharge.enabled} 【默认关闭】（R4-00312），
     *       仅 mock（本地演示）profile 默认开启；关闭时本端点返回业务错误</li>
     *   <li>每日上限：每用户每日最多演示充值 {@code app.demo-recharge.daily-limit} 次（默认 5），
     *       通过 Redis 计数（key {@code demo-recharge:count:{userId}:{yyyyMMdd}}，INCR 原子递增），
     *       Redis 不可用时降级到本地内存计数；超限返回 429 DAILY_LIMIT_EXCEEDED</li>
     * </ul>
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
        // P0-15：演示充值开关——生产环境关闭后禁止直接入账（必须走支付网关回调）
        if (!demoRechargeEnabled) {
            log.warn("演示充值已被配置禁用（app.demo-recharge.enabled=false），userId={}", userId);
            throw new IllegalStateException("演示充值已关闭，请通过官方充值渠道完成支付");
        }
        // P0-15：每日演示充值次数上限（原子占用额度，超限回滚递增）
        if (!tryIncrementDemoRechargeCount(userId)) {
            throw new DailyLimitExceededException(
                    "演示充值",
                    demoRechargeDailyLimit,
                    "今日演示充值次数已用完（上限 " + demoRechargeDailyLimit + " 次），请明日再来");
        }
        // 演示充值：服务端生成订单号（UUID）；生产接入支付后，orderId 应由支付回调上下文确定
        String orderId = "WALLET-RECHARGE-" + UUID.randomUUID();
        Long balanceAfter = walletService.recharge(userId, request.amountCents(), orderId,
                WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE, null);
        return new WalletRechargeView(balanceAfter, request.amountCents(), orderId,
                WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE);
    }

    /**
     * P0-15：原子尝试占用今日一次演示充值额度（INCR 返回值判断，参考 MatchPolicy 反悔计数模式）。
     *
     * <p>Redis 侧：{@code INCR} 返回值超过 {@link #demoRechargeDailyLimit} 时回滚递减并返回 false；
     * 本地降级方案：synchronized 临界区内判断。首次递增时设置 36 小时 TTL 自动清理。</p>
     *
     * @param userId 用户 ID
     * @return true 表示成功占用额度；false 表示已达今日上限
     */
    private boolean tryIncrementDemoRechargeCount(Long userId) {
        String dateKey = LocalDate.now(TimeZones.BUSINESS).format(DATE_KEY_FORMATTER);
        String localKey = userId + ":" + dateKey;
        try {
            if (redisTemplate != null) {
                String redisKey = REDIS_KEY_PREFIX_DEMO_RECHARGE + userId + ":" + dateKey;
                Long newValue = redisTemplate.opsForValue().increment(redisKey);
                if (newValue != null && newValue == 1L) {
                    redisTemplate.expire(redisKey, DEMO_RECHARGE_COUNT_TTL_HOURS, TimeUnit.HOURS);
                }
                if (newValue != null && newValue > demoRechargeDailyLimit) {
                    // 超限回滚递增，保证计数不漂移
                    redisTemplate.opsForValue().decrement(redisKey);
                    return false;
                }
                return true;
            }
        } catch (RuntimeException e) {
            log.warn("写入 Redis 演示充值计数失败，降级使用本地内存方案：{}", e.getMessage());
        }
        // 本地降级方案（无 Redis 时）：临界区内判断+递增，保证单实例内原子性
        synchronized (localDemoRechargeCount) {
            int next = localDemoRechargeCount.getOrDefault(localKey, 0) + 1;
            if (next > demoRechargeDailyLimit) {
                return false;
            }
            localDemoRechargeCount.put(localKey, next);
            return true;
        }
    }

    /**
     * 商业化解锁（P0-17）：解锁"喜欢我列表 / 访客列表"等内容。
     *
     * <p>契约（客户端依赖）：</p>
     * <ul>
     *   <li>请求体 {@code {targetType, targetId}}，targetType ∈ {LIKED_ME, VISITOR}（白名单）</li>
     *   <li>已解锁：直接返回 {@code {unlocked:true, balance}}，不重复扣费</li>
     *   <li>未解锁：按配置单价（{@code app.unlock-price.liked-me / app.unlock-price.visitor}，
     *       单位分）扣费并记录解锁，返回 {@code {unlocked:true, balance}}</li>
     *   <li>余额不足：返回 400 INSUFFICIENT_BALANCE 业务错误（GlobalExceptionHandler 统一映射）</li>
     * </ul>
     *
     * <p>幂等：{@link Idempotent}（Idempotency-Key 头）+ 服务层 orderId 唯一索引
     * + wallet_unlocks 表 uk_user_target 唯一约束三重保障，重复解锁不重复扣费。</p>
     *
     * @param request 解锁请求体（targetType：解锁目标类型；targetId：目标用户 ID）
     * @return 解锁结果视图（{@code {unlocked:true, balance}}）
     */
    @PostMapping("/unlock")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public WalletUnlockView unlock(@Valid @RequestBody UnlockRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return walletUnlockService.unlock(userId, request.targetType(), request.targetId());
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

/**
 * 商业化解锁请求体（P0-17）。
 *
 * @param targetType 解锁目标类型：LIKED_ME（喜欢我列表）/ VISITOR（访客列表），服务层白名单校验
 * @param targetId   解锁目标 ID（对方用户 ID）
 */
record UnlockRequest(
        @NotNull(message = "解锁类型不能为空")
        String targetType,
        @NotNull(message = "解锁目标 ID 不能为空")
        @Min(value = 1, message = "解锁目标 ID 必须为正数")
        Long targetId) {
}
