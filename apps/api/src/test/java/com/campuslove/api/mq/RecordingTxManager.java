package com.campuslove.api.mq;

import java.util.List;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

/**
 * 测试用的「真事务机制 + 事件记录」事务管理器。
 *
 * <p>口径复制自 {@code village/ContentSecCheckTransactionBoundaryTest.RecordingTxManager}：
 * 它<b>不是</b> Mockito 桩，而是真的继承 {@link AbstractPlatformTransactionManager}，
 * 因此 {@code TransactionSynchronizationManager} 的线程状态与生产一致——
 * 被测代码里的 {@code TransactionTemplate} 会真的走 begin/join/suspend/resume/commit，
 * 测试才能对「外呼时线程上到底有没有活动事务」下断言（桩事务管理器做不到这点）。</p>
 *
 * <p>没有直接复用 village 那个内部类，是因为它是测试类的 private 嵌套类型；
 * 而 village 包当前由其他同事在改，跨包抽取会撞车。本副本放在 mq 测试包内自用，
 * 行为与来源一致（额外保留 depth 计数以驱动「加入外层事务」与「挂起外层事务」两个分支）。</p>
 */
class RecordingTxManager extends AbstractPlatformTransactionManager {

    private final List<String> events;

    /** 当前活动事务层数：决定 isExistingTransaction 的答案，从而驱动加入/挂起分支。 */
    private int depth;

    RecordingTxManager(List<String> events) {
        this.events = events;
    }

    @Override
    protected Object doGetTransaction() {
        return new Object();
    }

    @Override
    protected boolean isExistingTransaction(Object transaction) {
        return depth > 0;
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        depth++;
        events.add("tx-begin");
    }

    @Override
    protected void doCommit(DefaultTransactionStatus status) {
        depth--;
        events.add("tx-commit");
    }

    @Override
    protected void doRollback(DefaultTransactionStatus status) {
        depth--;
        events.add("tx-rollback");
    }

    @Override
    protected Object doSuspend(Object transaction) {
        depth--;
        events.add("tx-suspend");
        return "suspended";
    }

    @Override
    protected void doResume(Object transaction, Object suspendedResources) {
        depth++;
        events.add("tx-resume");
    }
}
