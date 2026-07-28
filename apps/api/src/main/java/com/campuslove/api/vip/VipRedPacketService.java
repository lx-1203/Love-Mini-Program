package com.campuslove.api.vip;

import com.campuslove.api.entity.VipRedPacket;
import com.campuslove.api.entity.VipRedPacketClaim;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipRedPacketClaimRepository;
import com.campuslove.api.repository.VipRedPacketRepository;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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

    private final VipRedPacketRepository redPacketRepository;
    private final VipRedPacketClaimRepository claimRepository;
    private final UserRepository userRepository;

    public VipRedPacketService(VipRedPacketRepository redPacketRepository,
                               VipRedPacketClaimRepository claimRepository,
                               UserRepository userRepository) {
        this.redPacketRepository = redPacketRepository;
        this.claimRepository = claimRepository;
        this.userRepository = userRepository;
    }

    /**
     * 创建红包。
     * <p>校验发送者存在性、金额与个数合法性，设置过期时间后持久化。</p>
     *
     * @param senderId    发送者用户 ID（从 JWT 上下文获取）
     * @param totalAmount 总金额（分）
     * @param totalCount  总个数
     * @param type        类型 NORMAL/LUCKY
     * @param chatId      关联聊天会话 ID（可选，用于聊天红包）
     * @param blessing    祝福语（可选）
     * @return 创建后的红包视图
     * @throws IllegalArgumentException 参数非法或发送者不存在时抛出
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

        try {
            VipRedPacket packet = new VipRedPacket();
            packet.setSenderId(senderId);
            packet.setTotalAmount(totalAmount);
            packet.setTotalCount(totalCount);
            packet.setClaimedCount(0);
            packet.setClaimedAmount(0);
            packet.setType(actualType);
            packet.setChatId(chatId);
            packet.setBlessing(blessing);
            packet.setExpireAt(LocalDateTime.now().plusHours(DEFAULT_EXPIRE_HOURS));
            packet.setStatus("PENDING");
            LocalDateTime now = LocalDateTime.now();
            packet.setCreatedAt(now);
            packet.setUpdatedAt(now);

            VipRedPacket saved = redPacketRepository.save(packet);
            log.info("红包创建成功：id={}, senderId={}, amount={}, count={}, type={}",
                    saved.getId(), senderId, totalAmount, totalCount, actualType);
            return toView(saved, null);
        } catch (DataAccessException e) {
            // 数据库访问异常（save 失败、约束冲突等）
            log.error("红包创建失败：senderId={}, amount={}, count={}", senderId, totalAmount, totalCount, e);
            throw new RuntimeException("红包创建失败，请稍后重试", e);
        }
    }

    /**
     * 领取红包。
     * <p>校验红包状态、过期时间、是否已领取，计算领取金额后持久化。</p>
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

        VipRedPacket packet = redPacketRepository.findById(redPacketId)
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

        // 计算领取金额
        int amount = calculateClaimAmount(packet);

        try {
            // 保存领取记录
            VipRedPacketClaim claim = new VipRedPacketClaim();
            claim.setRedPacketId(redPacketId);
            claim.setClaimerId(claimerId);
            claim.setAmount(amount);
            claim.setClaimedAt(LocalDateTime.now());
            claimRepository.save(claim);

            // 更新红包统计
            packet.setClaimedCount(packet.getClaimedCount() + 1);
            packet.setClaimedAmount(packet.getClaimedAmount() + amount);
            if (packet.getClaimedCount() >= packet.getTotalCount()) {
                packet.setStatus("DEPLETED");
            }
            packet.setUpdatedAt(LocalDateTime.now());
            redPacketRepository.save(packet);

            log.info("红包领取成功：redPacketId={}, claimerId={}, amount={}",
                    redPacketId, claimerId, amount);
            return new ClaimResultView(amount, packet.getClaimedCount(), packet.getTotalCount());
        } catch (DataAccessException e) {
            // 数据库写入失败时回滚事务（@Transactional 默认回滚 RuntimeException）并上报
            log.error("红包领取失败：redPacketId={}, claimerId={}", redPacketId, claimerId, e);
            throw new RuntimeException("红包领取失败，请稍后重试", e);
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
