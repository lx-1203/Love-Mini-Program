package com.campuslove.api.report;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.repository.ErrorReportRepository;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * 前端错误上报（error_reports）的留存清理任务（S3-F，2026-10-31）。
 *
 * <p><b>本类只清一张表，这是刻意的设计而不是遗漏。</b>审计提出「六张表没有留存清理」，
 * 逐表判定后只有 error_reports 具备「可自动删除」的完整条件，其余按下面的依据
 * 显式登记为【不得自动清理】。判定的完整版（含复核 SQL）在
 * {@code scripts/qa/data-layer-decisions-2026-10-31.md}，此处摘要：</p>
 *
 * <table border="1">
 *   <caption>留存判定（行数为 2026-10-31 实测 campus_love）</caption>
 *   <tr><th>表</th><th>实测行数</th><th>判定</th><th>依据</th></tr>
 *   <tr><td>error_reports</td><td>721</td>
 *       <td>【清理】&gt;180 天删除</td>
 *       <td>纯运维遥测：{@code ErrorReportRepository} 至今【没有任何读路径】
 *           （接口只有 JpaRepository 的 save，注释自陈「后续需要管理后台查看时再补分页」），
 *           且 {@code ErrorReportController} 只有 POST。既然无人消费又含用户端上报文本，
 *           留着只有害处；180 天足够覆盖一轮缺陷排查周期。</td></tr>
 *   <tr><td>audit_log</td><td>520</td>
 *       <td>【不得自动清理】</td>
 *       <td>管理员操作问责链 + 法定留存：《网络安全法》第二十一条要求网络日志留存
 *           【不少于六个月】；《个人信息保护法》下的个人信息处理留痕也靠它举证。
 *           自动删除 = 主动销毁合规证据。需要控制体量时只能走【归档】
 *           （导出到只冷存储后再删），且必须有独立的审批与校验和，不在本任务范围。</td></tr>
 *   <tr><td>private_messages</td><td>6593</td>
 *       <td>【不得自动清理】</td>
 *       <td>用户生成的通信内容。(1) 静默到期删除会改变用户可见的聊天记录，
 *           属于产品/合规决定而非运维决定；(2) 举报与纠纷处置依赖原文取证；
 *           (3) 隐私最小化在这里由【用户主动删除 + 注销级联】实现，
 *           而不是由后台定时销毁实现。需要上限时应做成「会话级 TTL」并在产品侧公示。</td></tr>
 *   <tr><td>notifications</td><td>1830</td>
 *       <td>【不得自动清理】</td>
 *       <td>站内通知是用户读取回执与权益发放（签到/VIP/支付）的凭据，
 *           删掉会让「我没收到通知」类申诉无法自证。体量可控（1830 行 +
 *           已有 idx_notifications_user_read_created），无清理紧迫性。</td></tr>
 *   <tr><td>interaction_events</td><td>139</td>
 *       <td>【不得自动清理】</td>
 *       <td>不是匿名埋点：{@code RealInteractionEventService} 按用户分页把它当
 *           【用户可见的互动列表】读（与 private_messages 同类）。139 行更支持
 *           「先不做、等量级起来再判」。</td></tr>
 *   <tr><td>profile_visitors / visitors</td><td>0 / 2693</td>
 *       <td>【不得自动清理】</td>
 *       <td>「谁看过我」是产品功能本身的数据，非日志。已确认 profile_visitors
 *           为 0 行（功能未铺量），现在写清理任务等于给没数据的表加风险。</td></tr>
 *   <tr><td>user_wallet / wallet_transaction_log / vip_billing_log /
 *           payment_callback_log</td><td>—</td>
 *       <td>【绝对不得清理】</td>
 *       <td>资金流水与支付回调凭证：会计档案凭证属性 + 对账/争议重放的唯一依据。
 *           这四张也正是发现项 C 里唯一使用 timestamp 存储的表，
 *           任何「顺手清理/顺手改类型」都不要碰它们。</td></tr>
 * </table>
 *
 * <p>并发与事务口径沿用 {@code TempChatCleanupService} 的既有结论：
 * Redisson 分布式锁保证多副本只有一个实例执行；{@code tryLock(0, unit)} 不传租期，
 * 由看门狗续期（固定短租期会在大表扫描中途静默过期，导致两轮重叠）。</p>
 *
 * <p>{@code @Profile("real")}：与 {@code TempChatCleanupService} 同口径。mock profile
 * 不加载数据源与 Redisson，本类若不加 profile 会在 mock 上下文里因缺
 * {@code RedissonClient} 而启动失败。</p>
 */
@Profile("real")
@Service
public class ErrorReportRetentionService {

    private static final Logger log = LoggerFactory.getLogger(ErrorReportRetentionService.class);

    private final ErrorReportRepository errorReportRepository;
    private final RedissonClient redissonClient;

    /** 保留天数；<=0 表示关闭本任务（运维总开关，非默认关闭）。 */
    private final int retentionDays;

    public ErrorReportRetentionService(ErrorReportRepository errorReportRepository,
                                       RedissonClient redissonClient,
                                       @Value("${app.retention.error-report-days:180}") int retentionDays) {
        this.errorReportRepository = errorReportRepository;
        this.redissonClient = redissonClient;
        this.retentionDays = retentionDays;
    }

    /**
     * 每日 04:20 清理超过保留期的错误上报。
     *
     * <p>选 04:20：与已有的实名照片清理（04:30）错峰，避免同一时刻两个删除任务抢连接池。
     * 使用 cron 而非 fixedDelay，理由同 TempChatCleanupService：整点执行便于运维对账。</p>
     *
     * <p>幂等：判据是 {@code created_at < now-180d}，重跑只会删更少/零行，无副作用；
     * 不做软删除——本表没有读路径，墓碑只会把它变成另一张需要清理的表。</p>
     */
    @Scheduled(cron = "0 20 4 * * *")
    public void purgeExpiredErrorReports() {
        if (retentionDays <= 0) {
            log.debug("error_reports 留存清理已由配置关闭（retentionDays={}）", retentionDays);
            return;
        }
        LocalDateTime cutoff = LocalDateTime.now(TimeZones.BUSINESS).minusDays(retentionDays);
        RLock lock = redissonClient.getLock("scheduled:errorReportRetention");
        boolean locked = false;
        try {
            locked = lock.tryLock(0, TimeUnit.SECONDS);
            if (!locked) {
                log.debug("errorReportRetention 已由其他实例持有，跳过本次执行");
                return;
            }
            int deleted = errorReportRepository.deleteByCreatedAtBefore(cutoff);
            if (deleted > 0) {
                log.info("error_reports 留存清理：删除 {} 条早于 {} 的上报（保留 {} 天）",
                        deleted, cutoff, retentionDays);
            } else {
                log.debug("error_reports 留存清理：无早于 {} 的记录", cutoff);
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("errorReportRetention 获取锁被中断，本轮不执行");
        } catch (RuntimeException ex) {
            // 单次失败不得终止后续调度（与 TempChatCleanupService 一致）
            log.error("error_reports 留存清理失败，保留全部记录不做删除", ex);
        } finally {
            if (locked && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
