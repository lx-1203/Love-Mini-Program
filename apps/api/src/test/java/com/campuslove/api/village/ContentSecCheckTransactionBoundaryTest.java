package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.ContentSecurityChecker;
import com.campuslove.api.config.ContentSecurityVerdict;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PostTag;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostTagRepository;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * S2-1（2026-10-30）内容安全外呼与 DB 事务边界。
 *
 * <p><b>缺陷</b>：{@code createPost} 带着方法级 {@code @Transactional}，而其中的
 * {@code rejectIfRisky} 会外呼微信 msgSecCheck v2。于是每次发帖都「持着一条 Hikari
 * 连接 + posts 写入锁，等一个不受我们控制的第三方 HTTP 调用」。微信侧超时（秒级）时，
 * 并发发帖会先把连接池抽干，再让整个 API 排队——表现为"发帖慢"，实际是全服务退化。</p>
 *
 * <p><b>判点是运行期事实，不是代码长相</b>：这里用<b>真的</b>
 * {@link AbstractPlatformTransactionManager} 子类驱动 TransactionTemplate，
 * 使 {@link TransactionSynchronizationManager} 的线程状态与生产一致，并把
 * check / tx-begin / save / view / tx-commit 按发生顺序记进一条事件列表，因此
 * 「检查必须全部发生在事务开始之前」与「视图必须在事务内构建」可以被逐字断言。</p>
 *
 * <p><b>为什么不能改成 afterCommit 里做检查</b>：那是「先发后审」，违规内容已经落库
 * 并可能被分发，合规检查失效。本门把顺序钉死：check 在前、事务在后。</p>
 *
 * <p>可证伪性：①把 {@code @Transactional} 加回 createPost（反射用例红）；
 * ②把 rejectIfRisky 挪进 transactionTemplate 的回调里（事件序列与 tx 标志双红）；
 * ③把 toPostDetailView 挪出事务（序列红）。</p>
 */
@DisplayName("VillagePostService - 内容安全外呼与事务边界")
class ContentSecCheckTransactionBoundaryTest {

    private static final long USER_ID = 4100L;

    /**
     * 真事务机制，只是把 begin/commit/suspend/resume 记下来
     * （口径同 VipOrderTransactionBoundaryTest，额外支持挂起，用来模拟调用方带外层事务）。
     */
    private static final class RecordingTxManager extends AbstractPlatformTransactionManager {
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

    private List<String> events;
    private List<Boolean> checkHappenedInsideTransaction;
    /** 正控：落库那一刻线程上必须真的有活动事务，否则「检查在事务外」的 false 毫无意义。 */
    private final List<Boolean> writeHappenedInsideTransaction = new ArrayList<>();
    private PostRepository postRepository;
    private SensitiveWordFilter sensitiveWordFilter;
    private VillageQueryService queryService;
    private PostTagRepository postTagRepository;
    private PostMentionService postMentionService;
    private RecordingTxManager txManager;
    private VillagePostService service;

    /** 可控判定：pass / risky */
    private String verdictSuggest;

    @BeforeEach
    void setUp() {
        events = new ArrayList<>();
        checkHappenedInsideTransaction = new ArrayList<>();
        writeHappenedInsideTransaction.clear();
        postRepository = mock(PostRepository.class);
        sensitiveWordFilter = mock(SensitiveWordFilter.class);
        queryService = mock(VillageQueryService.class);
        postTagRepository = mock(PostTagRepository.class);
        postMentionService = mock(PostMentionService.class);
        verdictSuggest = "pass";

        ContentSecurityChecker checker = (content, userId, scene) -> {
            checkHappenedInsideTransaction.add(
                    TransactionSynchronizationManager.isActualTransactionActive());
            events.add("check");
            return new ContentSecurityVerdict(verdictSuggest, "selftest", "local");
        };

        when(postRepository.saveAndFlush(any(Post.class))).thenAnswer(inv -> {
            Post p = inv.getArgument(0);
            p.setId(9001L);
            writeHappenedInsideTransaction.add(
                    TransactionSynchronizationManager.isActualTransactionActive());
            events.add("save-post");
            return p;
        });
        org.mockito.Mockito.doAnswer(inv -> {
            events.add("save-mentions");
            return null;
        }).when(postMentionService).saveMentions(any(), any(), any());
        when(postTagRepository.save(any(PostTag.class))).thenAnswer(inv -> {
            events.add("save-tag");
            return inv.getArgument(0);
        });
        when(sensitiveWordFilter.filterWithLog(any(), any(), any()))
                .thenAnswer(inv -> inv.getArgument(0));
        when(queryService.toJsonString(any())).thenReturn("[]");
        when(queryService.toPostDetailView(any(Post.class), any())).thenAnswer(inv -> {
            events.add("view");
            return null;
        });

        txManager = new RecordingTxManager(events);
        service = new VillagePostService(postRepository, sensitiveWordFilter, queryService,
                null, postTagRepository, null, null, txManager);
        ReflectionTestUtils.setField(service, "contentSecurityChecker", checker);
        ReflectionTestUtils.setField(service, "postMentionService", postMentionService);
    }

    private PostDetailView create() {
        return service.createPost(USER_ID, "校园帖标题", "正文内容", List.of("https://img/1.png"),
                List.of("标签A"), "all", null, "general", null, List.of(777L));
    }

    @Test
    @DisplayName("检查全部发生在事务开始之前，落库与视图构建才在事务内")
    void contentCheckRunsBeforeAnyTransaction() {
        create();

        assertEquals(List.of("check", "check", "tx-begin", "save-post", "save-mentions",
                        "save-tag", "view", "tx-commit"), events,
                "发帖事件序列必须先是事务外的内容检查，再开事务落库；实际: " + events);
        assertFalse(checkHappenedInsideTransaction.isEmpty(),
                "桩检查器一次都没被调用，本门等于空转（必须能观察到外呼）");
        assertTrue(checkHappenedInsideTransaction.stream().noneMatch(Boolean::booleanValue),
                "调用微信 msgSecCheck 时线程上不允许有活动事务，实际: " + checkHappenedInsideTransaction);
        // 正控：同一根线程在落库那一刻必须真的处于事务内，否则上面的 false 只是"根本没事务"。
        assertEquals(List.of(Boolean.TRUE), List.copyOf(writeHappenedInsideTransaction),
                "saveAndFlush 必须在活动事务内执行（否则本门的 false 是空读）");
    }

    @Test
    @DisplayName("命中高风险：不开事务、不落库，直接拒绝")
    void riskyContentIsRejectedWithoutOpeningTransaction() {
        verdictSuggest = "risky";

        assertThrows(IllegalArgumentException.class, this::create);

        assertFalse(events.contains("tx-begin"), "被拒绝的内容不允许开启事务");
        assertFalse(events.contains("save-post"), "被拒绝的内容不允许落库");
        assertEquals(List.of("check"), events, "标题检查命中即拒绝，不应继续检查正文");
        assertTrue(checkHappenedInsideTransaction.stream().noneMatch(Boolean::booleanValue),
                "拒绝路径同样不能在事务内外呼");
    }

    @Test
    @DisplayName("调用方带外层事务时：外呼期间外层事务被挂起，落库仍在那个事务里")
    void outerTransactionIsSuspendedAroundContentCheck() {
        // 复现真实生产路径：RealVillageService.createPost（以及后台代发）是 @Transactional 的
        // 纯委托，发帖进来时线程上已经有一个活动事务。只把内层方法改成编程式事务是治不好的
        // ——内层 REQUIRED 会「加入」外层事务，微信外呼照样跑在事务里。
        org.springframework.transaction.support.TransactionTemplate outer =
                new org.springframework.transaction.support.TransactionTemplate(txManager);

        outer.execute(status -> {
            create();
            return null;
        });

        assertEquals(List.of(Boolean.FALSE, Boolean.FALSE),
                List.copyOf(checkHappenedInsideTransaction),
                "即使调用方开了事务，调微信那一刻也不允许有活动事务，实际: " + checkHappenedInsideTransaction);
        assertEquals(List.of(Boolean.TRUE), List.copyOf(writeHappenedInsideTransaction),
                "落库必须在事务内（原子性与改造前一致），实际: " + writeHappenedInsideTransaction);
        int suspendAt = events.indexOf("tx-suspend");
        int firstCheckAt = events.indexOf("check");
        int resumeAt = events.indexOf("tx-resume");
        assertTrue(suspendAt >= 0 && firstCheckAt > suspendAt && resumeAt > firstCheckAt,
                "外呼必须夹在 suspend 与 resume 之间，实际序列: " + events);
        assertEquals(1, events.stream().filter("tx-commit"::equals).count(),
                "内层模板应加入外层事务，只允许一次真正提交，实际序列: " + events);
    }

    @Test
    @DisplayName("createPost 不得再声明 @Transactional（边界只能由 TransactionTemplate 表达）")
    void createPostMustNotBeAnnotatedTransactional() {
        for (Method method : VillagePostService.class.getDeclaredMethods()) {
            if (!"createPost".equals(method.getName())) {
                continue;
            }
            assertFalse(method.isAnnotationPresent(Transactional.class),
                    "createPost 重新带上 @Transactional 会把微信外呼圈回事务里："
                            + java.util.Arrays.toString(method.getParameterTypes()));
        }
        assertFalse(VillagePostService.class.isAnnotationPresent(Transactional.class),
                "类级 @Transactional 会让发帖整条链路回到事务内");
    }

    @Test
    @DisplayName("事务管理器未装配时（旧测试构造器）不允许伪造「事务已生效」")
    void noOpManagerDoesNotPretendATransactionIsActive() {
        writeHappenedInsideTransaction.clear();
        VillagePostService legacy = new VillagePostService(postRepository, sensitiveWordFilter, queryService);
        ReflectionTestUtils.setField(legacy, "contentSecurityChecker",
                (ContentSecurityChecker) (content, userId, scene) -> ContentSecurityVerdict.pass());

        legacy.createPost(USER_ID, "校园帖标题", "正文内容", List.of(), List.of(), "all", null, "general", null);

        assertEquals(List.of(Boolean.FALSE), List.copyOf(writeHappenedInsideTransaction),
                "直连构造的事务桩必须显式承认「没开事务」，否则外呼出事务的判点会在别的用例里假绿");
    }
}
