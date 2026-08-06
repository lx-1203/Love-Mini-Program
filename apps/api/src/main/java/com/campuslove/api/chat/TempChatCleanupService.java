package com.campuslove.api.chat;

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
     *   <li>修复（FIN-00061/MED-50）：tryLock 成功后必须在 finally 中 unlock，
     *       避免持锁线程崩溃或提前 return 导致锁长期不释放。</li>
     * </ul>
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanupExpiredSessions() {
        // FIN-00061: 分布式锁确保多实例部署时仅一个实例执行清理任务
        boolean locked = false;
        org.redisson.api.RLock lock = redissonClient.getLock("scheduled:tempChatCleanup");
        try {
            locked = lock.tryLock(0, 30, TimeUnit.SECONDS);
            if (!locked) {
                log.debug("tempChatCleanup 定时任务已被其他实例持有，跳过本次执行");
                return;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("tempChatCleanup 获取分布式锁被中断");
            return;
        }
        try {
            LocalDateTime now = LocalDateTime.now();
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
            // FIN MED-50：finally 中释放锁，确保所有路径（正常/异常/提前 return）均解锁
            if (locked && lock.isHeldByCurrentThread()) {
                try {
                    lock.unlock();
                } catch (IllegalMonitorStateException e) {
                    // 锁已被自动释放（持锁超时），忽略
                    log.debug("锁已被自动释放: scheduled:tempChatCleanup");
                }
            }
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
            throw new IllegalArgumentException("当前用户 ID 不能为空");
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
                    LocalDateTime now = LocalDateTime.now();
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
        exchange.setUpdatedAt(LocalDateTime.now());
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
            throw new IllegalArgumentException("非法操作方: " + actor);
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
