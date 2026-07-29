package com.campuslove.api.vip;

import com.campuslove.api.entity.VipRedPacket;
import com.campuslove.api.entity.VipRedPacketClaim;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipRedPacketClaimRepository;
import com.campuslove.api.repository.VipRedPacketRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * VIP 红包服务。
 * <p>提供红包创建、领取、查询等核心业务逻辑。
 * 支持普通红包（等额分配）与拼手气红包（随机分配）两种类型。</p>
 *
 * <p>金额单位：所有金额以"分"为整数存储，避免浮点精度问题。
 * 前端展示时除以 100 转换为元。</p>
 *
 * <p>事务处理：创建、领取操作使用 @Transactional 保证原子性，
 * 防止并发领取导致超发。领取时通过唯一索引 (redPacketId, claimerId) 兜底防重。</p>
 *
 * <p>错误处理：所有异常场景抛出 IllegalArgumentException，
 * 由 GlobalExceptionHandler 统一转换为 400 响应。</p>
 */
@Profile("real")
@Service
public class VipRedPacketService {

    private static final Logger log = LoggerFactory.getLogger(VipRedPacketService.class);

    /** 红包默认有效期：24 小时 */
    private static final int DEFAULT_EXPIRE_HOURS = 24;

    /** 单个红包最小金额（分）：100 分 = 1 元 */
    private static final int MIN_TOTAL_AMOUNT = 100;

    /** 单个红包最小个数 */
    private static final int MIN_TOTAL_COUNT = 1;

    /** 单个红包最大个数 */
    private static final int MAX_TOTAL_COUNT = 100;

    /** 单个红包最大金额（分）：100000 分 = 1000 元 */
    private static final int MAX_TOTAL_AMOUNT = 100_000;

    /** 安全随机数生成器，用于拼手气红包金额分配 */
    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Task 14（P1.12）：Redisson 分布式锁超时时间（秒）。
     * <p>30 秒覆盖单次红包创建/领取流程（DB 写入 + 钱包扣减/充值）的正常耗时，
     * 超时后锁自动释放，避免持锁线程崩溃导致死锁。</p>
     */
    private static final long LOCK_TIMEOUT_SECONDS = 30L;

    /**
     * Task 14（P1.12）：Redisson 分布式锁等待时间（秒）。
     * <p>等待 5 秒后仍未获取锁则放弃，避免线程长时间阻塞。
     * 同一发送者并发创建红包 / 同一红包并发领取时，后到的请求快速失败而不是堆积。</p>
     */
    private static final long LOCK_WAIT_SECONDS = 5L;

    private final VipRedPacketRepository redPacketRepository;
    private final VipRedPacketClaimRepository claimRepository;
    private final UserRepository userRepository;
    /**
     * Task 15（FIN-00171）：钱包服务，用于真实扣减发送方余额 / 充值领取者钱包。
     *
     * <p>替代前序版本中"仅扣减红包剩余份数未充值到领取者钱包"的 mock 逻辑：
     * <ul>
     *   <li>createRedPacket：调用 {@link WalletService#deduct} 扣减发送方钱包余额，
     *       余额不足时抛 {@link com.campuslove.api.wallet.InsufficientBalanceException}，
     *       事务回滚，红包创建失败</li>
     *   <li>claimRedPacket：调用 {@link WalletService#recharge} 充值到领取者钱包，
     *       与红包剩余份数原子扣减在同一事务内</li>
     * </ul>
     * </p>
     */
    private final WalletService walletService;

    /**
     * Task 14（P1.12）：Redisson 客户端，用于分布式锁。
     *
     * <p>红包创建使用 {@code red-packet-create:{senderId}} 锁防止同一发送者并发创建
     * 导致钱包余额竞态；红包领取使用 {@code red-packet-claim:{redPacketId}} 锁防止
     * 同一红包被并发领取导致超发（与悲观锁 + 原子扣减 + 唯一索引形成多重保障）。</p>
     */
    private final RedissonClient redissonClient;

    public VipRedPacketService(VipRedPacketRepository redPacketRepository,
                               VipRedPacketClaimRepository claimRepository,
                               UserRepository userRepository,
                               WalletService walletService,
                               RedissonClient redissonClient) {
        this.redPacketRepository = redPacketRepository;
        this.claimRepository = claimRepository;
        this.userRepository = userRepository;
        this.walletService = walletService;
        this.redissonClient = redissonClient;
    }

    /**
     * 创建红包。
     * <p>校验发送者存在性、金额与个数合法性，设置过期时间后持久化。</p>
     *
     * <p>Task 12.3：创建时同步初始化 remaining_amount / remaining_count 字段，
     * 用于后续领取时的原子扣减。</p>
     *
     * <p>Task 15（FIN-00171）：调用 {@link WalletService#deduct} 真实扣减发送方钱包余额。
     * 余额不足时抛 {@link com.campuslove.api.wallet.InsufficientBalanceException}，
     * 由 GlobalExceptionHandler 转换为 HTTP 400 响应，事务回滚，红包创建失败。
     * 同一红包 ID 作为 orderId 保证幂等：若创建过程中重复提交，只会扣减一次。</p>
     *
     * <p>Task 14（P1.12）：使用 Redisson 分布式锁 {@code red-packet-create:{senderId}}
     * 防止同一发送者并发创建红包导致钱包余额竞态。锁等待 5 秒、持锁 30 秒，
     * 未获取锁时快速失败。WalletService 内部的悲观锁 + order_id 唯一索引 + 事务
     * 仍为资金安全的核心保障，本锁为应用层串行化以减少并发事务争用。</p>
     *
     * @param senderId    发送者用户 ID（从 JWT 上下文获取）
     * @param totalAmount 总金额（分）
     * @param totalCount  总个数
     * @param type        类型 NORMAL/LUCKY
     * @param chatId      关联聊天会话 ID（可选，用于聊天红包）
     * @param blessing    祝福语（可选）
     * @return 创建后的红包视图
     * @throws IllegalArgumentException 参数非法或发送者不存在时抛出
     * @throws com.campuslove.api.wallet.InsufficientBalanceException 发送者余额不足时抛出
     */
    @Transactional
    public RedPacketView createRedPacket(Long senderId, Integer totalAmount, Integer totalCount,
                                          String type, String chatId, String blessing) {
        // 参数校验
        if (senderId == null) {
            throw new IllegalArgumentException("发送者 ID 不能为空");
        }
        if (totalAmount == null || totalAmount < MIN_TOTAL_AMOUNT) {
            throw new IllegalArgumentException("红包总金额不能少于 " + MIN_TOTAL_AMOUNT + " 分");
        }
        if (totalAmount > MAX_TOTAL_AMOUNT) {
            throw new IllegalArgumentException("红包总金额不能超过 " + MAX_TOTAL_AMOUNT + " 分");
        }
        if (totalCount == null || totalCount < MIN_TOTAL_COUNT) {
            throw new IllegalArgumentException("红包个数至少为 1");
        }
        if (totalCount > MAX_TOTAL_COUNT) {
            throw new IllegalArgumentException("红包个数不能超过 " + MAX_TOTAL_COUNT);
        }
        // 普通红包要求金额能被个数整除，避免分账精度问题
        String actualType = (type == null || type.isBlank()) ? "NORMAL" : type.toUpperCase();
        if ("NORMAL".equals(actualType) && totalAmount % totalCount != 0) {
            throw new IllegalArgumentException("普通红包总金额必须能被个数整除");
        }
        if (!"NORMAL".equals(actualType) && !"LUCKY".equals(actualType)) {
            throw new IllegalArgumentException("红包类型必须为 NORMAL 或 LUCKY");
        }

        // 校验发送者存在
        if (!userRepository.existsById(senderId)) {
            throw new IllegalArgumentException("发送者用户不存在");
        }

        // Task 14（P1.12）：获取分布式锁 red-packet-create:{senderId}，防止同一发送者并发创建
        String lockKey = "red-packet-create:" + senderId;
        RLock lock = redissonClient.getLock(lockKey);
        boolean locked = false;
        try {
            locked = lock.tryLock(LOCK_WAIT_SECONDS, LOCK_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!locked) {
                // 未获取锁：同一发送者已有创建流程在执行，快速失败
                log.warn("红包创建获取锁失败，已有任务在执行：senderId={}", senderId);
                throw new IllegalStateException("红包创建繁忙，请稍后重试");
            }

            try {
                VipRedPacket packet = new VipRedPacket();
                packet.setSenderId(senderId);
                packet.setTotalAmount(totalAmount);
                packet.setTotalCount(totalCount);
                packet.setClaimedCount(0);
                packet.setClaimedAmount(0);
                // Task 12.3：初始化 remaining 字段，用于后续原子扣减
                packet.setRemainingAmount(totalAmount);
                packet.setRemainingCount(totalCount);
                packet.setType(actualType);
                packet.setChatId(chatId);
                packet.setBlessing(blessing);
                packet.setExpireAt(LocalDateTime.now().plusHours(DEFAULT_EXPIRE_HOURS));
                packet.setStatus("PENDING");
                LocalDateTime now = LocalDateTime.now();
                packet.setCreatedAt(now);
                packet.setUpdatedAt(now);

                VipRedPacket saved = redPacketRepository.save(packet);

                // Task 15（FIN-00171）：扣减发送方钱包余额
                // 使用红包 ID 作为 orderId 业务幂等键，前缀 RP-SEND- 表示红包发送扣减
                // 若扣减失败（余额不足），@Transactional 会回滚红包创建，保证红包与扣减原子性
                String walletOrderId = "RP-SEND-" + saved.getId() + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                Long balanceAfter = walletService.deduct(
                        senderId,
                        totalAmount.longValue(),
                        walletOrderId,
                        WalletTransactionLog.RELATED_TYPE_RED_PACKET_SEND,
                        String.valueOf(saved.getId())
                );
                log.info("红包创建扣款成功：id={}, senderId={}, amount={}, balanceAfter={}",
                        saved.getId(), senderId, totalAmount, balanceAfter);

                log.info("红包创建成功：id={}, senderId={}, amount={}, count={}, type={}",
                        saved.getId(), senderId, totalAmount, totalCount, actualType);
                return toView(saved, null);
            } catch (DataAccessException e) {
                // 数据库访问异常（save 失败、约束冲突等）
                log.error("红包创建失败：senderId={}, amount={}, count={}", senderId, totalAmount, totalCount, e);
                throw new RuntimeException("红包创建失败，请稍后重试", e);
            }
        } catch (InterruptedException e) {
            // 等待锁时被中断：恢复中断状态并失败返回
            Thread.currentThread().interrupt();
            log.error("红包创建等待锁时被中断：senderId={}", senderId, e);
            throw new RuntimeException("红包创建被中断，请稍后重试", e);
        } finally {
            // 释放锁：仅当持有锁时才释放，避免 IllegalMonitorStateException
            if (locked && lock.isHeldByCurrentThread()) {
                try {
                    lock.unlock();
                } catch (IllegalMonitorStateException e) {
                    // 锁已被自动释放（持锁超时），忽略
                    log.debug("锁已被自动释放：lockKey={}", lockKey);
                }
            }
        }
    }

    /**
     * 领取红包（Redisson 分布式锁 + 悲观锁 + 余额校验 + 原子扣减 + 钱包充值）。
     *
     * <p>Task 12.3（REAUDIT-REPORT-100+ 编号 40）：并发安全改造。</p>
     *
     * <p>Task 15（FIN-00171）：原子扣减红包剩余份数后，调用 {@link WalletService#recharge}
     * 真实充值到领取者钱包。所有操作在同一 {@code @Transactional} 内，
     * 任一步骤失败全部回滚（红包份数恢复、领取记录删除、钱包充值撤销）。</p>
     *
     * <p>Task 14（P1.12）：使用 Redisson 分布式锁 {@code red-packet-claim:{redPacketId}}
     * 防止同一红包被并发领取。锁等待 5 秒、持锁 30 秒，未获取锁时快速失败。
     * 与悲观锁 + 原子扣减 + 唯一索引形成多重保障。</p>
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>获取 Redisson 分布式锁 red-packet-claim:{redPacketId}</li>
     *   <li>悲观锁查询红包：SELECT ... FOR UPDATE，锁住红包行防止并发读取到过期状态</li>
     *   <li>校验红包状态、过期时间、是否已领取、是否自己发的</li>
     *   <li>余额校验：计算本次领取金额，确认 remaining_amount &gt;= amount</li>
     *   <li>原子扣减：UPDATE ... WHERE remaining_amount &gt;= amount AND remaining_count &gt; 0，
     *       影响行数 0 则失败（红包已被领完或剩余不足）</li>
     *   <li>保存领取记录（唯一索引兜底防重）</li>
     *   <li>调用 WalletService.recharge 充值到领取者钱包（Task 15）</li>
     *   <li>若扣减后 remaining_count = 0，将红包状态置为 DEPLETED（已领完）</li>
     * </ol>
     *
     * <p>并发安全：</p>
     * <ul>
     *   <li>Redisson 分布式锁串行化同一红包的领取请求，减少并发事务争用</li>
     *   <li>悲观锁保证同一红包同时只有一个事务在处理</li>
     *   <li>原子扣减作为兜底，即使悲观锁失效（如不同事务隔离级别）也能保证不超发</li>
     *   <li>唯一索引 (red_packet_id, claimer_id) 防止同一用户重复领取</li>
     *   <li>钱包充值通过 order_id 唯一索引保证幂等，重复提交不会重复充值</li>
     * </ul>
     *
     * <p>金额分配逻辑：</p>
     * <ul>
     *   <li>NORMAL：等额分配，每个 = totalAmount / totalCount</li>
     *   <li>LUCKY：剩余金额随机分配，最后一个领取者获得剩余全部金额</li>
     * </ul>
     *
     * @param redPacketId 红包 ID
     * @param claimerId   领取人用户 ID
     * @return 领取结果视图
     * @throws IllegalArgumentException 红包不存在/已过期/已领完/已领取过/自己发的红包时抛出
     */
    @Transactional
    public ClaimResultView claimRedPacket(Long redPacketId, Long claimerId) {
        if (redPacketId == null || claimerId == null) {
            throw new IllegalArgumentException("红包 ID 与领取人 ID 不能为空");
        }

        // Task 14（P1.12）：获取分布式锁 red-packet-claim:{redPacketId}，防止同一红包并发领取
        String lockKey = "red-packet-claim:" + redPacketId;
        RLock lock = redissonClient.getLock(lockKey);
        boolean locked = false;
        try {
            locked = lock.tryLock(LOCK_WAIT_SECONDS, LOCK_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!locked) {
                // 未获取锁：同一红包已有领取流程在执行，快速失败
                log.warn("红包领取获取锁失败，已有任务在执行：redPacketId={}", redPacketId);
                throw new IllegalStateException("红包领取繁忙，请稍后重试");
            }

            // 1. 悲观锁查询红包（SELECT ... FOR UPDATE），锁住红包行防止并发读取到过期状态
            VipRedPacket packet = redPacketRepository.findByIdForUpdate(redPacketId)
                    .orElseThrow(() -> new IllegalArgumentException("红包不存在"));

            // 不能领取自己发的红包
            if (packet.getSenderId().equals(claimerId)) {
                throw new IllegalArgumentException("不能领取自己发送的红包");
            }

            // 检查过期
            if (packet.getExpireAt() != null && packet.getExpireAt().isBefore(LocalDateTime.now())) {
                packet.setStatus("EXPIRED");
                redPacketRepository.save(packet);
                throw new IllegalArgumentException("红包已过期");
            }

            // 检查状态
            if ("DEPLETED".equals(packet.getStatus())) {
                throw new IllegalArgumentException("红包已被领完");
            }
            if ("EXPIRED".equals(packet.getStatus())) {
                throw new IllegalArgumentException("红包已过期");
            }

            // 检查是否已领取（唯一索引兜底，这里提前查询避免并发问题）
            Optional<VipRedPacketClaim> existing = claimRepository
                    .findByRedPacketIdAndClaimerId(redPacketId, claimerId);
            if (existing.isPresent()) {
                throw new IllegalArgumentException("您已领取过该红包");
            }

            // 2. 计算领取金额
            int amount = calculateClaimAmount(packet);

            // 3. 余额校验：确认红包剩余金额足够本次领取
            // （原子扣减 SQL 中也会校验，但提前校验可给出更明确的错误信息）
            if (packet.getRemainingAmount() == null || packet.getRemainingAmount() < amount
                    || packet.getRemainingCount() == null || packet.getRemainingCount() <= 0) {
                throw new IllegalArgumentException("红包已被领完");
            }

            try {
                // 4. 原子扣减：UPDATE ... WHERE remaining_amount >= :amount AND remaining_count > 0
                int affected = redPacketRepository.decrementRemaining(redPacketId, amount);
                if (affected == 0) {
                    // 影响行数 0：红包已被并发领完或剩余金额不足
                    log.warn("红包原子扣减失败，可能被并发领完：redPacketId={}, claimerId={}, amount={}",
                            redPacketId, claimerId, amount);
                    throw new IllegalArgumentException("红包已被领完");
                }

                // 5. 保存领取记录（唯一索引兜底防重，并发场景下若两个事务同时通过校验，
                // 此处 INSERT 会因唯一约束冲突回滚其中一个事务）
                VipRedPacketClaim claim = new VipRedPacketClaim();
                claim.setRedPacketId(redPacketId);
                claim.setClaimerId(claimerId);
                claim.setAmount(amount);
                claim.setClaimedAt(LocalDateTime.now());
                claimRepository.save(claim);

                // 6. Task 15（FIN-00171）：充值到领取者钱包
                //    使用红包 ID + 领取人 ID 作为 orderId 业务幂等键，前缀 RP-CLAIM- 表示红包领取充值
                //    若充值失败（如数据库异常），@Transactional 会回滚红包扣减与领取记录，保证原子性
                //    WalletService 内部通过悲观锁 + 幂等键 + 事务保证充值安全
                String walletOrderId = "RP-CLAIM-" + redPacketId + "-" + claimerId;
                Long balanceAfter = walletService.recharge(
                        claimerId,
                        (long) amount,
                        walletOrderId,
                        WalletTransactionLog.RELATED_TYPE_RED_PACKET_CLAIM,
                        String.valueOf(redPacketId)
                );
                log.info("红包领取充值成功：redPacketId={}, claimerId={}, amount={}, balanceAfter={}",
                        redPacketId, claimerId, amount, balanceAfter);

                // 7. 若扣减后剩余份数为 0，将红包状态置为 DEPLETED（已领完）
                int newClaimedCount = packet.getClaimedCount() + 1;
                int newRemainingCount = packet.getRemainingCount() - 1;
                if (newRemainingCount <= 0) {
                    redPacketRepository.markDepletedIfEmpty(redPacketId);
                }

                log.info("红包领取成功：redPacketId={}, claimerId={}, amount={}, remainingCount={}",
                        redPacketId, claimerId, amount, newRemainingCount);
                return new ClaimResultView(amount, newClaimedCount, packet.getTotalCount());
            } catch (DataAccessException e) {
                // 数据库写入失败时回滚事务（@Transactional 默认回滚 RuntimeException）并上报
                log.error("红包领取失败：redPacketId={}, claimerId={}", redPacketId, claimerId, e);
                throw new RuntimeException("红包领取失败，请稍后重试", e);
            }
        } catch (InterruptedException e) {
            // 等待锁时被中断：恢复中断状态并失败返回
            Thread.currentThread().interrupt();
            log.error("红包领取等待锁时被中断：redPacketId={}", redPacketId, e);
            throw new RuntimeException("红包领取被中断，请稍后重试", e);
        } finally {
            // 释放锁：仅当持有锁时才释放，避免 IllegalMonitorStateException
            if (locked && lock.isHeldByCurrentThread()) {
                try {
                    lock.unlock();
                } catch (IllegalMonitorStateException e) {
                    // 锁已被自动释放（持锁超时），忽略
                    log.debug("锁已被自动释放：lockKey={}", lockKey);
                }
            }
        }
    }

    /**
     * 查询红包详情（含领取记录）。
     *
     * @param redPacketId 红包 ID
     * @return 红包视图（含领取列表）
     * @throws IllegalArgumentException 红包不存在时抛出
     */
    @Transactional(readOnly = true)
    public RedPacketView getRedPacketDetail(Long redPacketId) {
        if (redPacketId == null) {
            throw new IllegalArgumentException("红包 ID 不能为空");
        }
        VipRedPacket packet = redPacketRepository.findById(redPacketId)
                .orElseThrow(() -> new IllegalArgumentException("红包不存在"));
        List<VipRedPacketClaim> claims = claimRepository
                .findByRedPacketIdOrderByClaimedAtDesc(redPacketId);
        return toView(packet, claims);
    }

    /**
     * 按聊天会话 ID 查询红包列表。
     *
     * <p>用于"聊天红包"场景，按会话展示历史红包列表。
     * 仅返回基础红包信息，不包含领取记录列表（避免数据量过大）。</p>
     *
     * @param chatId 聊天会话 ID
     * @return 红包视图列表（按创建时间倒序，不含领取记录）
     * @throws IllegalArgumentException chatId 为空时抛出
     */
    @Transactional(readOnly = true)
    public List<RedPacketView> listByChatId(String chatId) {
        if (chatId == null || chatId.isBlank()) {
            throw new IllegalArgumentException("聊天会话 ID 不能为空");
        }
        try {
            List<VipRedPacket> packets = redPacketRepository
                    .findByChatIdOrderByCreatedAtDesc(chatId);
            List<RedPacketView> views = new ArrayList<>(packets.size());
            for (VipRedPacket packet : packets) {
                // 不查询领取记录，传 null 减少查询开销
                views.add(toView(packet, null));
            }
            return views;
        } catch (DataAccessException e) {
            // 数据库查询失败时上报，由 GlobalExceptionHandler 转换为 5xx 响应
            log.error("按会话查询红包列表失败：chatId={}", chatId, e);
            throw new RuntimeException("查询红包列表失败，请稍后重试", e);
        }
    }

    /**
     * 计算本次领取金额。
     * <p>NORMAL 类型：等额分配。
     * LUCKY 类型：剩余金额随机分配，保证每人至少 1 分，最后一个领剩余全部。</p>
     *
     * @param packet 红包实体
     * @return 领取金额（分）
     */
    private int calculateClaimAmount(VipRedPacket packet) {
        int remainingAmount = packet.getTotalAmount() - packet.getClaimedAmount();
        int remainingCount = packet.getTotalCount() - packet.getClaimedCount();

        if ("NORMAL".equals(packet.getType())) {
            return packet.getTotalAmount() / packet.getTotalCount();
        }

        // LUCKY：最后一个领取者拿剩余全部
        if (remainingCount <= 1) {
            return remainingAmount;
        }

        // 随机分配：保证每人至少 1 分，最大不超过剩余金额 - 剩余人数 + 1
        int minAmount = 1;
        int maxAmount = remainingAmount - remainingCount + 1;
        if (maxAmount <= minAmount) {
            return minAmount;
        }
        return minAmount + RANDOM.nextInt(maxAmount - minAmount);
    }

    /**
     * 实体转视图。
     */
    private RedPacketView toView(VipRedPacket packet, List<VipRedPacketClaim> claims) {
        List<ClaimView> claimViews = new ArrayList<>();
        if (claims != null) {
            for (VipRedPacketClaim claim : claims) {
                claimViews.add(new ClaimView(
                        claim.getId(),
                        claim.getClaimerId(),
                        claim.getAmount(),
                        claim.getClaimedAt() != null ? claim.getClaimedAt().toString() : null
                ));
            }
        }
        return new RedPacketView(
                packet.getId(),
                packet.getSenderId(),
                packet.getTotalAmount(),
                packet.getTotalCount(),
                packet.getClaimedCount(),
                packet.getClaimedAmount(),
                packet.getType(),
                packet.getChatId(),
                packet.getBlessing(),
                packet.getExpireAt() != null ? packet.getExpireAt().toString() : null,
                packet.getStatus(),
                packet.getCreatedAt() != null ? packet.getCreatedAt().toString() : null,
                claimViews
        );
    }

    /**
     * 红包视图。
     */
    public record RedPacketView(
            Long id,
            Long senderId,
            Integer totalAmount,
            Integer totalCount,
            Integer claimedCount,
            Integer claimedAmount,
            String type,
            String chatId,
            String blessing,
            String expireAt,
            String status,
            String createdAt,
            List<ClaimView> claims
    ) {
    }

    /**
     * 领取记录视图。
     */
    public record ClaimView(
            Long id,
            Long claimerId,
            Integer amount,
            String claimedAt
    ) {
    }

    /**
     * 领取结果视图。
     */
    public record ClaimResultView(
            Integer amount,
            Integer claimedCount,
            Integer totalCount
    ) {
    }
}
