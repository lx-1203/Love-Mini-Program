package com.campuslove.api.privacy;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 「已注销主体不得再被后台链路写行」的统一判定（第五轮审查 F-08）。
 *
 * <p><b>要解决的问题</b>：注销跑完清单之后，后台链路仍然可以往墓碑 {@code user_id} 上追加新行 ——
 * {@code NotificationConsumer}/{@code MatchEventConsumer}/{@code CheckInEventConsumer} 落库前
 * 不校验主体状态（outbox 补偿投递每 30 秒重投一次，窗口是真实存在的），
 * {@code AutoRenewService} 的「未开启续费」分支还会给墓碑用户写一条 {@code vip_billing_log} 的
 * FAILED 流水。结果就是「注销不是终态」：清单执行完 ≠ 数据已消灭。</p>
 *
 * <p><b>为什么放在一个类里而不是各写一份</b>：这条判定有 4 个调用点（3 个消费者 + 续费扫描）。
 * 四处各写一份 {@code findById(...).map(...)}，漂移是迟早的事（少判一种状态、
 * 或某处用了 {@code isDisabled()} 把管理员禁用也判成注销）。判定口径收敛到
 * {@link User#isErasedSubject()} 一处，调用点只负责「短路 + ack/跳过」。</p>
 *
 * <p><b>失败方向</b>：查询本身抛异常时返回 {@code false}（= 按注销前的行为继续落库）。
 * 这是刻意的：数据库抖动不该被解释成「该用户已注销」而把通知永久丢掉；
 * 真出问题由后续落库自己冒异常走重试/死信。缺席（mock profile 下 {@code UserRepository}
 * 未装配）同样返回 {@code false}，与改造前行为一致。</p>
 */
public final class ErasureSubjectGuard {

    private static final Logger log = LoggerFactory.getLogger(ErasureSubjectGuard.class);

    private ErasureSubjectGuard() {
    }

    /**
     * 主体是否已注销（终态）。
     *
     * @param userRepository 用户仓储（未装配时视为「判不出 ⇒ 不拦」）
     * @param userId         主体 ID（null 视为不拦）
     * @return true = 已注销，调用方必须丢弃本次写入并 ack；false = 照常写入
     */
    public static boolean isErasedSubject(UserRepository userRepository, Long userId) {
        if (userRepository == null || userId == null) {
            return false;
        }
        try {
            boolean erased = userRepository.findById(userId)
                    .map(User::isErasedSubject)
                    .orElse(false);
            if (erased) {
                log.info("主体已注销（status=deactivated），后台链路拒绝为其追加新行：userId={}", userId);
            }
            return erased;
        } catch (RuntimeException ex) {
            // 判不出 ≠ 已注销。宁可多写一行（可事后清理），不可误判成注销而永久丢弃数据。
            log.warn("查询主体注销状态失败，按「未注销」继续处理：userId={}, error={}",
                    userId, ex.getMessage());
            return false;
        }
    }
}
