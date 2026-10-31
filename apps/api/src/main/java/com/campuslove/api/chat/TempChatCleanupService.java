package com.campuslove.api.chat;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.TempChatContactExchange;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.TempChatContactExchangeRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 临时聊天清理与联系交换组件（Task 4.2.3 拆分）。
 *
 * <p>职责：</p>
 * <ul>
 *   <li>联系交换状态机管理（{@link #respondToContactExchange}）</li>
 *   <li>联系交换状态查询</li>
 *   <li>会话过期标记（委托 {@link TempChatSessionService#markExpiredIfDue}）</li>
 *   <li>completed 状态触发 WebSocket 通知</li>
 *   <li>SubTask 5.3.1：定时清理过期临时聊天会话（每小时一次）</li>
 * </ul>
 *
 * <p>状态流转规则：</p>
 * <ul>
 *   <li>rejected：直接拒绝（终态）</li>
 *   <li>accepted-by-self：自己单方同意</li>
 *   <li>accepted-by-peer：对方单方同意</li>
 *   <li>completed：双方同意（终态，触发 WebSocket 通知）</li>
 * </ul>
 *
 * <p><b>租约策略</b>（两个定时清理任务共用，2026-10-31）：只传等待时间、不传租期的
 * {@code tryLock(waitTime, unit)} → Redisson 看门狗在持锁线程存活期间每
 * lockWatchdogTimeout/3（默认 10s）续期一次，持锁进程崩溃后约 30s 自动释放。
 * 原实现固定 30s 租期在大会表/慢 IO 下会在扫描【中途】静默过期，下一轮或另一副本
 * 于是与本轮重叠处理；而解锁点后又挪到了事务完成之后，30s 租期可能短于"业务 + 提交"
 * 总耗时，属必现风险。任务本身幂等（按 phase + closesAt 过滤，处理过的行不再命中），
 * 诉求只是"同一时刻一个写入者"，看门狗恰好给这个保证；代价是一次超长扫描会推迟
 * 本实例的下一轮整点任务（Spring 默认单线程调度器不会自相重叠）。</p>
 */
@Profile("real")
@Component
public class TempChatCleanupService {

    private static final Logger log = LoggerFactory.getLogger(TempChatCleanupService.class);

    private final TempChatContactExchangeRepository contactExchangeRepository;
    private final TempChatSessionService sessionService;
    private final TempChatSessionRepository sessionRepository;
    /**
     * Redisson 分布式锁客户端（FIN-00061）。
     *
     * <p>用于 {@link #cleanupExpiredSessions()} 定时任务的分布式锁，
     * 确保多实例部署时仅一个实例执行清理，避免重复扫描与数据竞争。
     * 本类标注 {@code @Profile("real")}，仅 real profile 加载，Redisson 必可用。</p>
     */
    private final RedissonClient redissonClient;

    /** 保留期清理依赖（2026-10-28）：字段注入保持既有构造器兼容。 */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.campuslove.api.repository.TempChatMessageRepository tempChatMessageRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.campuslove.api.media.MediaAssetService mediaAssetService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.campuslove.api.media.MediaStorageService mediaStorageService;

    /** 会话关闭后的宽限小时数（默认 24h；会话 24h + 宽限 ⇒ T+48h 删除）。 */
    @org.springframework.beans.factory.annotation.Value("${app.temp-chat.grace-hours:24}")
    private long graceHours = 24;

    public TempChatCleanupService(TempChatContactExchangeRepository contactExchangeRepository,
                                 TempChatSessionService sessionService,
                                 TempChatSessionRepository sessionRepository,
                                 RedissonClient redissonClient) {
        this.contactExchangeRepository = contactExchangeRepository;
        this.sessionService = sessionService;
        this.sessionRepository = sessionRepository;
        this.redissonClient = redissonClient;
    }

    /**
     * SubTask 5.3.1：定时清理过期临时聊天会话。
     *
     * <p>每小时整点执行一次（cron = "0 0 * * * *"），扫描所有
     * {@code matching} / {@code active} 阶段且 {@code closesAt < now()} 的会话，
     * 将其标记为 {@code expired} 并设置 {@code closedReason = "expired"}。</p>
     *
     * <p>设计说明：</p>
     * <ul>
     *   <li>原 {@link TempChatSessionService#markExpiredIfDue} 为惰性标记，
     *       仅在用户访问会话时触发，导致已过期但无人访问的会话长期停留在
     *       {@code active} 阶段，占用数据库并影响会话列表查询性能。</li>
     *   <li>本定时任务作为惰性标记的补充，主动扫描并清理过期会话，
     *       保证数据一致性并释放查询资源。</li>
     *   <li>使用 {@link Scheduled#fixedDelay} 替代 cron 不可取：fixedDelay 起始
     *       时间依赖应用启动时间，cron 则固定整点执行，便于运维排查。</li>
     *   <li>任务由 {@code @EnableScheduling}（已在 CampusLoveApplication 启用）调度。</li>
     *   <li>异常处理：捕获所有异常并记录日志，避免定时任务因单次失败而停止后续调度。</li>
     *   <li>修复（FIN-00061/MED-50）：tryLock 成功后必须释放锁，
     *       避免持锁线程崩溃或提前 return 导致锁长期不释放。</li>
     *   <li>修复（2026-10-31，对齐 {@code AutoRenewService} 的 R4-00317）：锁的释放点从方法
     *       {@code finally} 挪到【事务提交/回滚之后】。本方法带 {@code @Transactional}，
     *       finally 早于代理层提交执行：第二个 JVM 拿到锁后重读到的还是未提交状态，
     *       同一批过期会话会被两个实例各处理一次（重复标记/重复计数）。
     *       现在 {@code unlock} 由 {@link TransactionSynchronization#afterCompletion(int)} 触发；
     *       无活动事务时（本地直跑、单测直连构造）退化为方法返回时立即释放。</li>
     *   <li>租约：不再显式传 30s leaseTime，改用 Redisson 看门狗续期，
     *       见类注释「租约策略」——固定短租期会在大会表扫描中途静默过期，
     *       让下一轮/另一副本与本轮重叠处理。</li>
     * </ul>
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanupExpiredSessions() {
        // FIN-00061: 分布式锁确保多实例部署时仅一个实例执行清理任务
        String lockKey = "scheduled:tempChatCleanup";
        org.redisson.api.RLock lock = redissonClient.getLock(lockKey);
        boolean locked = false;
        try {
            // 只传等待时间（0=不等待）、不传租期 → Redisson 看门狗负责续期，见类注释「租约策略」
            locked = lock.tryLock(0, TimeUnit.SECONDS);
            if (!locked) {
                log.debug("tempChatCleanup 定时任务已被其他实例持有，跳过本次执行");
                return;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("tempChatCleanup 获取分布式锁被中断");
            return;
        }
        // 锁交给事务同步在提交/回滚后释放；返回 false 表示当前线程没有活动事务，
        // 只能退回"方法返回时立即释放"（此时提前解锁也不会有人读到未提交数据）。
        boolean unlockDeferredToTransaction = registerUnlockAfterTransactionCompletion(lock, lockKey);
        try {
            LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
            int cleaned = 0;
            for (SessionPhase phase : new SessionPhase[]{SessionPhase.matching, SessionPhase.active}) {
                try {
                    List<TempChatSession> expired = sessionRepository.findByPhaseAndClosesAtBefore(phase, now);
                    if (expired.isEmpty()) {
                        continue;
                    }
                    for (TempChatSession session : expired) {
                        try {
                            if (sessionService.markExpiredIfDue(session)) {
                                cleaned++;
                            }
                        } catch (RuntimeException e) {
                            // 单条会话清理失败不阻断整体任务，记录日志后继续
                            log.warn("清理过期会话失败: sessionUid={}, error={}",
                                    session.getSessionUid(), e.getMessage());
                        }
                    }
                } catch (org.springframework.dao.DataAccessException e) {
                    log.warn("扫描阶段 {} 的过期会话失败: {}", phase, e.getMessage());
                }
            }
            if (cleaned > 0) {
                log.info("SubTask 5.3.1 定时清理过期临时聊天会话完成: 共清理 {} 个会话", cleaned);
            }
        } finally {
            // FIN MED-50 + 2026-10-31：只有【没有】委托给事务同步时才在这里立即释放锁，
            // 正常路径（有事务）由 afterCompletion 在提交/回滚后释放。
            if (!unlockDeferredToTransaction) {
                releaseLockQuietly(lock, lockKey);
            }
        }
    }

    /**
     * 临时会话材料保留期清理（2026-10-28 强匿名 B）。
     *
     * <p>每小时 :30 执行：删除已过保留期（closesAt + 宽限）的会话消息与 TEMP_CHAT 媒体文件；
     * hold_until 未到期的举报取证资产跳过。会话行保留为墓碑，不保留内容。</p>
     *
     * <p>锁边界与租约同 {@link #cleanupExpiredSessions()}：不传租期（看门狗续期），
     * 释放点后移到事务提交/回滚之后——本方法 {@code @Transactional}，若在 finally 里解锁，
     * 另一实例可在删除语句提交前拿到锁并重删同一批行（重复删文件 + 重复标记资产）。</p>
     */
    @Scheduled(cron = "0 30 * * * *")
    @Transactional
    public void cleanupRetainedMaterials() {
        doCleanupRetainedMaterials();
    }

    /**
     * 受控触发一次保留期清理（后台维护端点调用，2026-10-28）。
     * 与定时任务同一条实现，返回实际删除计数，供验收/运维确认。
     */
    @Transactional
    public CleanupResult runRetainedMaterialsCleanup() {
        return doCleanupRetainedMaterials();
    }

    private CleanupResult doCleanupRetainedMaterials() {
        String lockKey = "scheduled:tempChatMaterialCleanup";
        org.redisson.api.RLock lock = redissonClient.getLock(lockKey);
        boolean locked = false;
        try {
            // 只传等待时间、不传租期 → 看门狗续期，避免 30s 固定租期在删除大批资产时中途过期
            locked = lock.tryLock(0, TimeUnit.SECONDS);
            if (!locked) {
                return new CleanupResult(0, 0, false);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new CleanupResult(0, 0, false);
        }
        boolean unlockDeferredToTransaction = registerUnlockAfterTransactionCompletion(lock, lockKey);
        try {
            LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
            int assetsDeleted = 0;
            if (mediaAssetService != null) {
                for (com.campuslove.api.entity.MediaAsset asset : mediaAssetService.findExpiredTempAssets(now)) {
                    if (asset.getHoldUntil() != null && asset.getHoldUntil().isAfter(now)) {
                        continue;
                    }
                    if (deleteTempAsset(asset)) {
                        assetsDeleted++;
                    }
                }
            }
            int messagesDeleted = 0;
            if (tempChatMessageRepository != null) {
                List<TempChatSession> sessions = sessionRepository.findByPhaseInAndClosesAtBefore(
                        List.of(SessionPhase.closed, SessionPhase.expired),
                        now.minusHours(graceHours));
                for (TempChatSession session : sessions) {
                    try {
                        messagesDeleted += (int) tempChatMessageRepository.deleteBySessionId(session.getId());
                        if (mediaAssetService != null) {
                            for (com.campuslove.api.entity.MediaAsset asset
                                    : mediaAssetService.findTempAssetsBySession(session.getId())) {
                                if (asset.getHoldUntil() != null && asset.getHoldUntil().isAfter(now)) {
                                    continue;
                                }
                                if (deleteTempAsset(asset)) {
                                    assetsDeleted++;
                                }
                            }
                        }
                    } catch (RuntimeException e) {
                        log.warn("清理临时会话材料失败: sessionUid={}, error={}",
                                session.getSessionUid(), e.getMessage());
                    }
                }
            }
            if (assetsDeleted > 0 || messagesDeleted > 0) {
                log.info("临时会话材料保留期清理完成: assets={}, messages={}",
                        assetsDeleted, messagesDeleted);
            }
            return new CleanupResult(assetsDeleted, messagesDeleted, true);
        } finally {
            // 正常路径（有事务）由 afterCompletion 在提交/回滚后释放；仅无事务时在此立即释放
            if (!unlockDeferredToTransaction) {
                releaseLockQuietly(lock, lockKey);
            }
        }
    }

    /**
     * 把分布式锁的释放挂到【事务完成之后】（2026-10-31，与 AutoRenewService R4-00317 同一模式）。
     *
     * <p>为什么不能留在 {@code finally}：{@code @Transactional} 由代理在方法返回【之后】才提交，
     * finally 里的 {@code unlock} 早于提交执行——第二个实例立刻拿到锁、读到同一批还没变成
     * expired/deleted 的行，于是重复标记、重复删除消息与媒体文件。</p>
     *
     * @param lock    已持有的锁
     * @param lockKey 锁名（仅日志用）
     * @return {@code true} 表示释放已交由事务同步（提交或回滚后都会执行，含回滚场景）；
     *         {@code false} 表示当前线程没有活动事务（本地直跑、单测直连 new 出来的对象），
     *         调用方必须退回"方法返回时立即释放"的旧行为，否则锁永远不释放
     */
    private boolean registerUnlockAfterTransactionCompletion(org.redisson.api.RLock lock, String lockKey) {
        try {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    releaseLockQuietly(lock, lockKey);
                }
            });
            return true;
        } catch (IllegalStateException e) {
            // TransactionSynchronizationManager 在无同步（无事务）线程上注册会抛这个异常
            log.warn("无活动事务，退化为方法返回时释放清理锁: lockKey={}", lockKey);
            return false;
        }
    }

    /**
     * 安静释放锁：仅当当前线程仍持有时解锁，异常只记日志不外抛。
     * afterCompletion 回调里抛异常会被 Spring 吞掉并污染后续同步，故必须安静。
     */
    private void releaseLockQuietly(org.redisson.api.RLock lock, String lockKey) {
        try {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
                log.debug("清理任务锁已释放（事务完成后）: lockKey={}", lockKey);
            }
        } catch (IllegalMonitorStateException e) {
            // 锁已被看门狗/超时释放（持锁进程早已不在），忽略
            log.debug("锁已被自动释放: lockKey={}", lockKey);
        } catch (RuntimeException e) {
            log.warn("释放清理任务锁异常（不影响业务结果）: lockKey={}, error={}", lockKey, e.getMessage());
        }
    }

    /** 清理结果：删除资产数、删除消息数、是否取得分布式锁。 */
    public record CleanupResult(int assetsDeleted, int messagesDeleted, boolean lockAcquired) {
    }

    private boolean deleteTempAsset(com.campuslove.api.entity.MediaAsset asset) {
        try {
            if (mediaStorageService != null) {
                mediaStorageService.delete(asset.getUrl());
            }
            if (mediaAssetService != null) {
                mediaAssetService.markTempDeleted(asset);
            }
            return true;
        } catch (RuntimeException e) {
            log.warn("删除临时会话媒体失败: assetId={}, error={}", asset.getId(), e.getMessage());
            return false;
        }
    }

    /**
     * 响应联系交换请求。
     *
     * <p>已关闭或已过期的会话不允许操作联系交换，直接返回当前会话视图。
     * 根据当前状态、操作方（actor）和决定（decision）计算新状态：
     * rejected -> 终态；accepted-by-self/peer -> 单方同意；completed -> 双方同意。</p>
     *
     * <p>安全修复（FIN HIGH-5）：actor 不再信任客户端请求体，由服务端根据
     * 当前用户与会话参与者关系推导（userA → "self"，userB → "peer"），
     * 防止冒认对方接受联系交换；同时校验当前用户为会话参与者（FIN HIGH-1）。</p>
     *
     * @param id            会话 ID
     * @param request       决定请求（仅使用 decision；actor 由服务端推导）
     * @param currentUserId 当前用户 ID（用于解析会话、推导 actor 与最终视图转换）
     * @return 更新后的会话实体（调用方负责转换为视图）
     */
    @Transactional
    public TempChatSession respondToContactExchange(String id, ContactExchangeDecisionRequest request,
                                                    Long currentUserId) {
        if (currentUserId == null) {
            throw new IllegalArgumentException(ErrorMessages.CURRENT_USER_ID_REQUIRED);
        }
        TempChatSession session = sessionService.resolveSession(id);
        // FIN HIGH-1：校验当前用户是会话参与者
        sessionService.requireParticipant(session, currentUserId);

        // 已关闭或已过期的会话不允许操作联系交换
        if (session.getPhase() == SessionPhase.closed || session.getPhase() == SessionPhase.expired) {
            log.debug("会话 {} 已{}，无法响应联系交换",
                    id, session.getPhase() == SessionPhase.closed ? "关闭" : "过期");
            return session;
        }

        // FIN HIGH-5：actor 由服务端根据当前用户与会话关系推导，拒绝客户端传入值
        String actor = session.getUserAId().equals(currentUserId) ? "self" : "peer";

        // 获取或创建联系交换记录
        TempChatContactExchange exchange = contactExchangeRepository.findBySessionId(session.getId())
                .orElseGet(() -> {
                    LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
                    TempChatContactExchange newExchange = new TempChatContactExchange();
                    newExchange.setSession(session);
                    newExchange.setStatus("idle");
                    newExchange.setCreatedAt(now);
                    newExchange.setUpdatedAt(now);
                    return contactExchangeRepository.save(newExchange);
                });

        String currentStatus = exchange.getStatus();
        String newStatus = resolveExchangeStatus(currentStatus, actor, request.decision());
        String proposer = exchange.getProposer() == null ? actor : exchange.getProposer();

        exchange.setProposer(proposer);
        exchange.setStatus(newStatus);
        exchange.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        contactExchangeRepository.save(exchange);

        // 完成时通知双方
        if ("completed".equals(newStatus)) {
            sessionService.getMessagingTemplate().convertAndSendToUser(
                    String.valueOf(session.getUserAId()),
                    "/queue/temp-chat",
                    Map.of("type", "contact_exchange_completed", "sessionId", session.getSessionUid())
            );
            sessionService.getMessagingTemplate().convertAndSendToUser(
                    String.valueOf(session.getUserBId()),
                    "/queue/temp-chat",
                    Map.of("type", "contact_exchange_completed", "sessionId", session.getSessionUid())
            );
        }

        log.info("会话 {} 联系交换状态更新: {} -> {}, actor={}, decision={}",
                id, currentStatus, newStatus, actor, request.decision());

        return session;
    }

    /**
     * 获取联系交换状态视图。
     *
     * @param session 会话实体
     * @return 联系交换状态视图（无记录时返回 idle 状态）
     */
    @Transactional(readOnly = true)
    public ContactExchangeStateView getContactExchangeView(TempChatSession session) {
        Optional<TempChatContactExchange> exchangeOpt = contactExchangeRepository.findBySessionId(session.getId());
        if (exchangeOpt.isEmpty()) {
            return new ContactExchangeStateView(null, "idle");
        }
        TempChatContactExchange exchange = exchangeOpt.get();
        return new ContactExchangeStateView(exchange.getProposer(), exchange.getStatus());
    }

    /**
     * 获取联系交换状态字符串。
     *
     * @param session 会话实体
     * @return 联系交换状态（无记录时返回 "idle"）
     */
    @Transactional(readOnly = true)
    public String getContactExchangeStatus(TempChatSession session) {
        return contactExchangeRepository.findBySessionId(session.getId())
                .map(TempChatContactExchange::getStatus).orElse("idle");
    }

    /**
     * 解析联系交换状态流转逻辑。
     *
     * <p>修复（FIN MED-70）：拒绝非法 actor 值（非 self/peer 直接抛异常），
     * 不再将未知 actor 默认按 peer 处理，防止状态机被非法输入污染。</p>
     *
     * @param currentStatus 当前状态
     * @param actor         操作方（self / peer）
     * @param decision      决定（accepted / rejected）
     * @return 新状态
     */
    public String resolveExchangeStatus(String currentStatus, String actor, String decision) {
        if (!"self".equals(actor) && !"peer".equals(actor)) {
            throw new IllegalArgumentException(ErrorMessages.ILLEGAL_OPERATOR_PREFIX + actor);
        }
        // 修复（R2 review HIGH）：客户端/Controller 枚举为 accept|reject|revoke，
        // 旧实现只匹配 "rejected" 导致"拒绝"被当成"接受"——三种拒绝表达统一处理
        if ("reject".equals(decision) || "rejected".equals(decision) || "revoke".equals(decision)) {
            return "rejected";
        }
        if ("self".equals(actor)) {
            return "accepted-by-peer".equals(currentStatus) ? "completed" : "accepted-by-self";
        }
        return "accepted-by-self".equals(currentStatus) ? "completed" : "accepted-by-peer";
    }
}
