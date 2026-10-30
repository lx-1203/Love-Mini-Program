package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.ContentSecurityChecker;
import com.campuslove.api.config.ContentSecurityVerdict;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.content.ContentMentionService;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.CircleReply;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleReplyRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.InterestCircleRepository;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * S2-2（2026-10-30）圈子话题/回复的内容安全外呼与 DB 事务边界。
 *
 * <p><b>缺陷</b>：{@code createTopic} / {@code replyToTopic} 带着方法级
 * {@code @Transactional}，而其中的 {@code rejectIfRisky} 会外呼微信 msgSecCheck v2。
 * 于是每次发话题/回复都「持着一条 Hikari 连接 + circle_topics / circle_replies 的行锁，
 * 等一个不受我们控制的第三方 HTTP 调用」。微信侧超时（秒级）时，并发发帖会先把连接池抽干，
 * 再让整个 API 排队——表现为"发帖慢"，实际是全服务退化。</p>
 *
 * <p><b>判点是运行期事实，不是代码长相</b>：这里用<b>真的</b>
 * {@link AbstractPlatformTransactionManager} 子类驱动 {@code TransactionTemplate}，
 * 使 {@link TransactionSynchronizationManager} 的线程状态与生产一致，并把
 * check / tx-begin / read / save / view / tx-commit 按发生顺序记进一条事件列表，因此
 * 「检查必须全部发生在事务开始之前」「读+写+视图构建必须在事务内」可以被逐字断言。</p>
 *
 * <p><b>为什么不能改成 afterCommit 里做检查</b>：那是「先发后审」，违规内容已经落库
 * 并可能被分发，合规检查失效。本门把顺序钉死：check 在前、事务在后。</p>
 *
 * <p><b>为什么要测「调用方带外层事务」</b>：只把本方法改成编程式事务还不够——内层用
 * REQUIRED 会直接<b>加入</b>外层事务，微信外呼照样跑在事务里，连接和行锁还是被占着。
 * 生产调用方（{@code CircleController}）今天是裸的，但本类自己的
 * {@code joinCircle}/{@code likeTopic} 是 {@code @Transactional} 的，任何后续把发布链路
 * 包进事务的调用方都会踩同一个坑，所以「外呼不在事务内」必须由本类的
 * PROPAGATION_NOT_SUPPORTED 模板自己兜住（用例 C / G 复现并证伪）。</p>
 *
 * <p>可证伪性：①把 {@code @Transactional} 加回 createTopic/replyToTopic（反射用例 D 红）；
 * ②把 rejectIfRisky 挪进 transactionTemplate 回调里（事件序列与 tx 标志双红）；
 * ③把 NOT_SUPPORTED 换成 REQUIRED（用例 C / G 的 suspend 断言与标志双红）；
 * ④把 findCircleOrThrow/findTopicOrThrow 挪回事务外（read-* 位置断言红）；
 * ⑤把 toTopicView/toReplyView 挪出事务（view-author 位置断言红）。</p>
 */
@DisplayName("RealCircleService - 内容安全外呼与事务边界")
class CircleContentSecCheckBoundaryTest {

    private static final long CIRCLE_ID = 7L;
    private static final long TOPIC_ID = 900L;
    private static final long AUTHOR_ID = 4100L;
    private static final long REPLIER_ID = 4101L;
    private static final long MENTIONED_ID = 777L;
    private static final long SAVED_TOPIC_ID = 9001L;
    private static final long SAVED_REPLY_ID = 9101L;

    /**
     * 真事务机制，只是把 begin/commit/suspend/resume 记下来
     * （口径同 ContentSecCheckTransactionBoundaryTest，额外支持挂起，用来模拟调用方带外层事务）。
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
    private List<Boolean> writeHappenedInsideTransaction;
    private InterestCircleRepository interestCircleRepository;
    private CircleMembershipRepository circleMembershipRepository;
    private CircleTopicRepository circleTopicRepository;
    private CircleReplyRepository circleReplyRepository;
    private UserRepository userRepository;
    private InteractionEventService interactionEventService;
    private SensitiveWordFilter sensitiveWordFilter;
    private ContentMentionService contentMentionService;
    private RecordingTxManager txManager;
    private RealCircleService service;

    /** 可控判定：pass / risky */
    private String verdictSuggest;

    @BeforeEach
    void setUp() {
        events = new ArrayList<>();
        checkHappenedInsideTransaction = new ArrayList<>();
        writeHappenedInsideTransaction = new ArrayList<>();
        verdictSuggest = "pass";

        interestCircleRepository = mock(InterestCircleRepository.class);
        circleMembershipRepository = mock(CircleMembershipRepository.class);
        circleTopicRepository = mock(CircleTopicRepository.class);
        circleReplyRepository = mock(CircleReplyRepository.class);
        userRepository = mock(UserRepository.class);
        interactionEventService = mock(InteractionEventService.class);
        sensitiveWordFilter = mock(SensitiveWordFilter.class);
        contentMentionService = mock(ContentMentionService.class);

        ContentSecurityChecker checker = (content, userId, scene) -> {
            checkHappenedInsideTransaction.add(
                    TransactionSynchronizationManager.isActualTransactionActive());
            events.add("check");
            return new ContentSecurityVerdict(verdictSuggest, "selftest", "local");
        };

        InterestCircle circle = new InterestCircle();
        circle.setId(CIRCLE_ID);
        circle.setName("读书圈");

        // 既有话题：作者与回复者不同，保证 recordEvent（TOPIC_REPLIED）分支被走到
        CircleTopic existingTopic = new CircleTopic();
        existingTopic.setId(TOPIC_ID);
        existingTopic.setCircle(circle);
        existingTopic.setAuthorId(AUTHOR_ID);
        existingTopic.setTitle("既有话题");
        existingTopic.setContent("既有正文");
        existingTopic.setReplyCount(3);
        existingTopic.setIsPinned(false);
        existingTopic.setLikeCount(0);
        existingTopic.setCreatedAt(LocalDateTime.now());

        when(interestCircleRepository.findById(CIRCLE_ID)).thenAnswer(inv -> {
            events.add("read-circle");
            return Optional.of(circle);
        });
        when(circleMembershipRepository.findByUserIdAndCircleId(any(), any())).thenAnswer(inv -> {
            events.add("read-membership");
            return List.of(new CircleMembership());
        });
        when(circleTopicRepository.findById(TOPIC_ID)).thenAnswer(inv -> {
            events.add("read-topic");
            return Optional.of(existingTopic);
        });
        when(circleTopicRepository.save(any(CircleTopic.class))).thenAnswer(inv -> {
            CircleTopic topic = inv.getArgument(0);
            if (topic.getId() == null) {
                topic.setId(SAVED_TOPIC_ID);
            }
            writeHappenedInsideTransaction.add(
                    TransactionSynchronizationManager.isActualTransactionActive());
            events.add("save-topic");
            return topic;
        });
        when(circleReplyRepository.save(any(CircleReply.class))).thenAnswer(inv -> {
            CircleReply reply = inv.getArgument(0);
            reply.setId(SAVED_REPLY_ID);
            writeHappenedInsideTransaction.add(
                    TransactionSynchronizationManager.isActualTransactionActive());
            events.add("save-reply");
            return reply;
        });
        // toTopicView / toReplyView 取作者昵称与头像（事务内 DB 读）：视图构建必须在事务内，
        // 否则懒加载关联出事务即抛 LazyInitializationException
        when(userRepository.findById(any())).thenAnswer(inv -> {
            events.add("view-author");
            return Optional.empty();
        });
        when(sensitiveWordFilter.filterWithLog(any(), any(), any()))
                .thenAnswer(inv -> inv.getArgument(0));
        doAnswer(inv -> {
            events.add("save-mentions");
            return null;
        }).when(contentMentionService).saveMentions(any(), any(), any(), any(), any());
        when(contentMentionService.notifyMentions(any(), any(), any(), any(), any())).thenAnswer(inv -> {
            events.add("notify-mentions");
            return 0;
        });
        doAnswer(inv -> {
            events.add("record-event");
            return null;
        }).when(interactionEventService).recordEvent(any(), any(), any(), any(), any(), any());

        txManager = new RecordingTxManager(events);
        service = new RealCircleService(interestCircleRepository, circleMembershipRepository,
                circleTopicRepository, circleReplyRepository, userRepository, new ObjectMapper(),
                interactionEventService, sensitiveWordFilter, null, txManager);
        ReflectionTestUtils.setField(service, "contentSecurityChecker", checker);
        ReflectionTestUtils.setField(service, "contentMentionService", contentMentionService);
    }

    private CircleTopicView createTopic() {
        return service.createTopic(CIRCLE_ID, AUTHOR_ID, "圈子话题标题", "正文内容",
                List.of("https://img/1.png"), List.of(MENTIONED_ID));
    }

    private CircleReplyView reply() {
        return service.replyToTopic(TOPIC_ID, REPLIER_ID, "回复内容", List.of(MENTIONED_ID));
    }

    private void assertNoCheckInsideTransaction() {
        assertFalse(checkHappenedInsideTransaction.isEmpty(),
                "桩检查器一次都没被调用，本门等于空转（必须能观察到外呼）");
        assertTrue(checkHappenedInsideTransaction.stream().noneMatch(Boolean::booleanValue),
                "调用微信 msgSecCheck 时线程上不允许有活动事务，实际: " + checkHappenedInsideTransaction);
    }

    private void assertWritesObservedTransaction() {
        assertFalse(writeHappenedInsideTransaction.isEmpty(),
                "没有任何写入被观测到，正控失效");
        assertTrue(writeHappenedInsideTransaction.stream().allMatch(Boolean::booleanValue),
                "落库必须在活动事务内执行（否则「检查在事务外」的 false 只是空读），实际: "
                        + writeHappenedInsideTransaction);
    }

    // ==================== createTopic ====================

    @Test
    @DisplayName("A. createTopic：检查全部在事务开始之前，读+写+视图才在事务内")
    void createTopicChecksRunBeforeAnyTransaction() {
        createTopic();

        assertEquals(List.of("read-circle", "read-membership", "check", "check", "tx-begin", "read-circle",
                        "save-topic", "save-mentions", "view-author", "view-author", "tx-commit"),
                events, "发话题事件序列必须先是事务外的内容检查，再开事务读库/落库/建视图；实际: " + events);
        assertNoCheckInsideTransaction();
        // 正控：同一根线程在落库那一刻必须真的处于事务内，否则上面的 false 只是"根本没事务"。
        assertWritesObservedTransaction();
    }

    @Test
    @DisplayName("B. createTopic：授权读在前，命中高风险不开事务、不落库")
    void createTopicRiskyContentIsRejectedWithoutOpeningTransaction() {
        verdictSuggest = "risky";

        assertThrows(IllegalArgumentException.class, this::createTopic);

        // 授权（圈子存在 + 成员身份）必须先于外呼判定，所以这里允许出现两次只读查询；
        // 关键是不允许开事务、不允许落库。
        assertEquals(List.of("read-circle", "read-membership", "check"), events,
                "标题检查命中即拒绝：不允许开事务、更不允许落库；实际: " + events);
        assertFalse(events.contains("tx-begin"), "被拒绝的内容不允许开启事务");
        assertFalse(events.contains("save-topic"), "被拒绝的内容不允许落库");
        assertNoCheckInsideTransaction();
        assertTrue(writeHappenedInsideTransaction.isEmpty(), "拒绝路径不应发生任何写入");
    }

    @Test
    @DisplayName("C. createTopic：调用方带外层事务时，外呼期间外层事务被挂起，读与写仍在那个事务里")
    void createTopicSuspendsOuterTransactionForContentCheck() {
        // 复现「调用方是 @Transactional」的路径：只把内层改成编程式事务不够，
        // REQUIRED 会加入外层事务，微信外呼照样跑在事务里。
        TransactionTemplate outer = new TransactionTemplate(txManager);

        outer.execute(status -> createTopic());

        assertEquals(List.of("tx-begin", "read-circle", "read-membership", "tx-suspend", "check", "check", "tx-resume",
                        "read-circle", "save-topic", "save-mentions",
                        "view-author", "view-author", "tx-commit"),
                events, "外层事务必须在检查前挂起、检查后恢复，落库段加入外层事务；实际: " + events);
        assertNoCheckInsideTransaction();
        assertWritesObservedTransaction();
        assertEquals(1, events.stream().filter("tx-begin"::equals).count(),
                "内层模板应加入外层事务，只允许一次真正 begin，实际序列: " + events);
        assertEquals(1, events.stream().filter("tx-commit"::equals).count(),
                "内层模板应加入外层事务，只允许一次真正提交，实际序列: " + events);
    }

    // ==================== replyToTopic ====================

    @Test
    @DisplayName("E. replyToTopic：检查在事务之前，话题读、回复写、事件与视图构建都在事务内")
    void replyToTopicChecksRunBeforeAnyTransaction() {
        reply();

        assertEquals(List.of("read-topic", "check", "tx-begin", "read-topic", "save-reply", "save-topic",
                        "save-mentions", "notify-mentions", "record-event",
                        "view-author", "view-author", "tx-commit"),
                events, "回复事件序列必须先是事务外的内容检查，再开事务读话题/落回复/更新回复数/建视图；实际: " + events);
        assertNoCheckInsideTransaction();
        assertWritesObservedTransaction();
    }

    @Test
    @DisplayName("F. replyToTopic：话题存在性先判定，命中高风险不开事务、不落库")
    void replyToTopicRiskyContentIsRejectedWithoutOpeningTransaction() {
        verdictSuggest = "risky";

        assertThrows(IllegalArgumentException.class, this::reply);

        assertEquals(List.of("read-topic", "check"), events,
                "回复内容命中即拒绝：话题先判定存在性，但不允许开事务、不允许落库；实际: " + events);
        assertFalse(events.contains("tx-begin"), "被拒绝的回复不允许开启事务");
        assertFalse(events.contains("save-reply"), "被拒绝的回复不允许落库");
        assertNoCheckInsideTransaction();
        assertTrue(writeHappenedInsideTransaction.isEmpty(), "拒绝路径不应发生任何写入");
    }

    @Test
    @DisplayName("G. replyToTopic：调用方带外层事务时，外呼期间外层事务被挂起，读写仍在事务内")
    void replyToTopicSuspendsOuterTransactionForContentCheck() {
        TransactionTemplate outer = new TransactionTemplate(txManager);

        outer.execute(status -> reply());

        assertEquals(List.of("tx-begin", "read-topic", "tx-suspend", "check", "tx-resume", "read-topic",
                        "save-reply", "save-topic", "save-mentions", "notify-mentions",
                        "record-event", "view-author", "view-author", "tx-commit"),
                events, "外层事务必须在检查前挂起、检查后恢复；实际: " + events);
        assertNoCheckInsideTransaction();
        assertWritesObservedTransaction();
        assertEquals(1, events.stream().filter("tx-begin"::equals).count(),
                "内层落库模板应加入外层事务，只允许一次真正 begin，实际序列: " + events);
        assertEquals(1, events.stream().filter("tx-commit"::equals).count(),
                "内层落库模板应加入外层事务，只允许一次真正提交，实际序列: " + events);
    }

    // ==================== 声明式注解必须消失 ====================

    @Test
    @DisplayName("D. createTopic/replyToTopic 不得再声明 @Transactional（类级也不允许）")
    void writeMethodsMustNotBeAnnotatedTransactional() {
        int matched = 0;
        for (Method method : RealCircleService.class.getDeclaredMethods()) {
            String name = method.getName();
            if (!"createTopic".equals(name) && !"replyToTopic".equals(name)) {
                continue;
            }
            matched++;
            assertFalse(method.isAnnotationPresent(Transactional.class),
                    name + " 重新带上 @Transactional 会把微信外呼圈回事务里："
                            + Arrays.toString(method.getParameterTypes()));
        }
        // 4 个重载：createTopic 5 参 + 6 参、replyToTopic 3 参 + 4 参。少了说明签名被动过。
        assertEquals(4, matched, "必须同时覆盖 createTopic 与 replyToTopic 的全部重载，实际匹配: " + matched);
        assertFalse(RealCircleService.class.isAnnotationPresent(Transactional.class),
                "类级 @Transactional 会让发帖/回复整条链路回到事务内");
    }

    @Test
    @DisplayName("H. 重载自调用路径（5 参 createTopic / 3 参 replyToTopic）同样守住边界")
    void selfInvokingOverloadsKeepTheBoundary() {
        // 5 参重载在改造前带着 @Transactional，但同类自调用不经过代理，注解从来没生效过；
        // 现在边界写在被调用的 6 参/4 参实现里，两条入口都必须是「检查在事务外、落库在事务内」。
        CircleTopicView viaFiveArg = service.createTopic(CIRCLE_ID, AUTHOR_ID, "标题", "正文", List.of());
        assertNotNull(viaFiveArg);
        assertEquals(2, checkHappenedInsideTransaction.size(), "标题与正文各外呼一次");
        assertTrue(events.indexOf("tx-begin") > events.lastIndexOf("check"),
                "事务必须在两次内容检查之后才开始；实际: " + events);
        assertNoCheckInsideTransaction();
        assertWritesObservedTransaction();
        assertTrue(events.contains("view-author"), "视图构建必须发生在落库段内（懒加载关联出事务即报错）");

        events.clear();
        checkHappenedInsideTransaction.clear();
        writeHappenedInsideTransaction.clear();

        CircleReplyView viaThreeArg = service.replyToTopic(TOPIC_ID, REPLIER_ID, "回复内容");
        assertNotNull(viaThreeArg);
        assertEquals(List.of("read-topic", "check", "tx-begin", "read-topic", "save-reply", "save-topic",
                        "save-mentions", "notify-mentions", "record-event",
                        "view-author", "view-author", "tx-commit"),
                events, "3 参回复入口的事件序列应与 4 参一致；实际: " + events);
        assertNoCheckInsideTransaction();
        assertWritesObservedTransaction();
    }

    @Test
    @DisplayName("I. 授权优先于内容校验：非成员提交违规文本必须先拿 403，一次都不外呼微信")
    void authorizationWinsOverContentSecurityCheck() {
        // 把成员身份改成"不是成员"
        when(circleMembershipRepository.findByUserIdAndCircleId(any(), any()))
                .thenReturn(List.of());

        assertThrows(com.campuslove.api.common.OperationForbiddenException.class, this::createTopic);

        assertFalse(events.contains("check"),
                "没有发帖资格的请求不该先惊动微信：既浪费一次外呼配额，又向越权者透露了内容判定结果");
        assertTrue(checkHappenedInsideTransaction.isEmpty(), "外呼一次都不该发生");
    }
}

