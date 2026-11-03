package com.campuslove.api.tasks;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 帖子计数对账任务（P2-4，2026-11-03）。
 *
 * <p><b>为什么需要对账</b>：posts.likes_count / comments_count 由应用层原子
 * UPDATE 维护（VillageInteractionService），单条路径正确，但
 * ① 历史上非原子实现留下的旧账；② 进程在「写明细行」与「改计数列」之间崩溃；
 * ③ 手工修数——都会让计数漂移且无自愈手段。防新增漂移的硬约束
 * （uk_post_likes_user_post / uk_comment_likes_user_comment）早已存在，
 * 本任务负责消灭<b>存量</b>漂移：以明细表为准重算冗余列。</p>
 *
 * <p><b>口径</b>：</p>
 * <ul>
 *   <li>likes_count = COUNT(post_likes WHERE post_id=p)；</li>
 *   <li>comments_count = COUNT(comments WHERE post_id=p)——comments 无 status 列
 *       （V2026.05.21.0004 建表即无；软删仅存在于 posts 层），全量计入，
 *       与 {@code VillageInteractionService.commentPost} 的 +1 口径一致；</li>
 *   <li>share_count 明细表为 post_shares（V2026.05.23.0006）——但 share 行
 *       记录的是「转发事件」而非「转发后持续存在的关系」，转发记录可能被清理
 *       而计数语义是累计值，故<b>不对账 share_count</b>（对账会把清理过的
 *       转发从累计数里扣掉，制造新漂移）。</li>
 * </ul>
 *
 * <p><b>只修有漂移的行</b>：UPDATE 带 WHERE 计数不等条件，未漂移行零写入
 * （不触发 updated_at/@Version 漂移，也不会把整表行锁一遍）。</p>
 *
 * <p>开关：{@code app.posts.count-reconcile-enabled}（环境变量
 * APP_POSTS_COUNT_RECONCILE_ENABLED），默认开。凌晨 3:40 业务低峰执行；
 * 运行时长与 posts 行数线性相关，全表 UPDATE 走 post_id 索引相关子查询。</p>
 */
@Profile("real")
@Component
public class PostCountReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(PostCountReconciliationService.class);

    @PersistenceContext
    private EntityManager entityManager;

    /** 对账开关（默认开；压测/演练环境可关） */
    @Value("${app.posts.count-reconcile-enabled:true}")
    private boolean enabled;

    /**
     * 每日对账：把 likes_count / comments_count 重算为明细表真实值。
     *
     * <p>native UPDATE 而非 JPQL：相关子查询 COUNT 需要按明细表逐帖统计，
     * JPQL 不支持对非实体表（post_likes 为复合主键明细）的灵活关联子查询写法，
     * 且本仓库既有计数维护（VillageInteractionService）同为 native 口径。</p>
     */
    @Scheduled(cron = "0 40 3 * * ?", zone = "Asia/Shanghai")
    @Transactional
    public void reconcileDaily() {
        if (!enabled) {
            return;
        }
        int likesFixed = executeUpdate("""
                UPDATE posts p SET p.likes_count = (
                        SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id)
                WHERE p.likes_count <> (
                        SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id)
                """);
        int commentsFixed = executeUpdate("""
                UPDATE posts p SET p.comments_count = (
                        SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
                WHERE p.comments_count <> (
                        SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
                """);
        if (likesFixed > 0 || commentsFixed > 0) {
            log.warn("帖子计数对账完成：修正点赞数 {} 行、评论数 {} 行（明细表为准，P2-4）",
                    likesFixed, commentsFixed);
        } else {
            log.info("帖子计数对账完成：无漂移行（likes/comments 口径见类注释）");
        }
    }

    /** 执行一条对账 UPDATE，返回受影响行数（漂移被修正的行数）。 */
    private int executeUpdate(String sql) {
        Query query = entityManager.createNativeQuery(sql);
        return query.executeUpdate();
    }
}
