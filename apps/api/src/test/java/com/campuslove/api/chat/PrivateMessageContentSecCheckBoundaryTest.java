package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.ContentSecurityChecker;
import com.campuslove.api.config.ContentSecurityVerdict;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.growth.SocialProgressService;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.UserBlockRepository;
import com.campuslove.api.repository.UserRepository;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * S2-1（2026-10-30）私信发消息的内容安全外呼与 DB 事务边界
 * （机制与桩件口径同 {@code village.ContentSecCheckTransactionBoundaryTest}）。
 *
 * <p><b>缺陷</b>：{@code RealPrivateMessageService.sendMessage} 挂着方法级
 * {@code @Transactional}，而其中的 {@code rejectIfRisky} 会外呼微信 msgSecCheck v2。
 * 于是每条私信都是「持着一条 Hikari 连接 + 会话行锁，等一个第三方 HTTP 调用」——
 * 聊天是这条服务里 QPS 最高的写路径，微信侧一慢就先把连接池抽干，再让整个 API 排队，
 * 表现为「私信慢」，实际是全服务退化。</p>
 *
 * <p><b>判点是运行期事实，不是代码长相</b>：这里用<b>真的</b>
 * {@link AbstractPlatformTransactionManager} 子类驱动 TransactionTemplate，使
 * {@link TransactionSynchronizationManager} 的线程状态与生产一致，并把
 * find / block-check / check / tx-begin / save / view / tx-commit / push / 埋点
 * 按发生顺序记进同一条事件列表，因此「检查必须发生在任何事务开始之前」
 * 「消息插入与会话预览更新在同一个事务里」「视图在事务内构建」都能逐字断言。
 * 落库那一刻的 tx 标志是<b>正控</b>：若它不是 true，上面那些 false 就只是「根本没事务」的空读。</p>
 *
 * <p><b>拆事务最容易碰坏的两件事</b>（本门一并钉住）：</p>
 * <ul>
 *   <li>{@code PrivateMessage.conversation} 是 {@code @ManyToOne(LAZY)}，视图必须在那个
 *       写事务里构建，否则出事务取关联抛 LazyInitializationException；</li>
 *   <li>事务外读到的会话实例拆分后已是游离对象，落库段必须<b>重新加载</b>后再改预览、
 *       再 save（口径见 {@code VillagePostService} 的 merge 注释），否则带着过期
 *       {@code @Version} 走 merge 会造成乐观锁误报 / 更新丢失。</li>
 * </ul>
 *
 * <p>可证伪性：①把 {@code @Transactional} 加回 sendMessage（反射用例红）；
 * ②把 {@code rejectIfRisky} 挪进落库事务（事件序列 + tx 标志双红）；
 * ③把视图构建挪出事务（序列 + view 标志红）；④删掉事务内的会话重新加载
 * （序列里的第二次 find-conversation 消失 + 关联实例同一性断言红）；
 * ⑤把会话预览更新挪进另一个事务（tx-commit 计数红）。</p>
 */
@DisplayName("RealPrivateMessageService - 内容安全外呼与事务边界")
class PrivateMessageContentSecCheckBoundaryTest {

    private static final Long CONVERSATION_ID = 7L;
    private static final Long SENDER_ID = 1001L;
    private static final Long RECIPIENT_ID = 1002L;
    private static final Long MESSAGE_ID = 5001L;
    private static final String CONTENT = "今天一起去图书馆吗";

    /**
     * 真事务机制，只是把 begin/commit/suspend/resume 记下来
     * （口径同 ContentSecCheckTransactionBoundaryTest，挂起能力用来模拟调用方带外层事务）。
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

    /**
     * 会话实体桩：{@code getId()} 被 {@code toMessageView} 读到的那一刻记录线程上是否有活动事务，
     * 用来钉住「视图必须在写事务内构建」（LAZY 关联出事务即不可取）。
     */
    private static final class RecordingConversation extends PrivateConversation {
        private final List<String> events;
        private final List<Boolean> viewInsideTransaction;

        RecordingConversation(List<String> events, List<Boolean> viewInsideTransaction) {
            this.events = events;
            this.viewInsideTransaction = viewInsideTransaction;
        }

        @Override
        public Long getId() {
            events.add("view");
            viewInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            return super.getId();
        }
    }

    private List<String> events;
    /** 每次外呼微信时线程上是否有活动事务（期望恒为 false）。 */
    private final List<Boolean> checkInsideTransaction = new ArrayList<>();
    /** 正控：第一处写库（消息插入）那一刻是否有活动事务（期望恒为 true）。 */
    private final List<Boolean> writeInsideTransaction = new ArrayList<>();
    /** 视图构建（读 LAZY 会话关联）那一刻是否有活动事务（期望恒为 true）。 */
    private final List<Boolean> viewInsideTransaction = new ArrayList<>();
    /** msgSecCheck 场景码，钉住 scene=4（社交日志）这条合规接线没被拆丢。 */
    private final List<String> checkScenes = new ArrayList<>();
    /** 每次 findById 返回的会话实例（拆事务后应有两次：事务外授权读 + 事务内重新加载）。 */
    private final List<PrivateConversation> fetchedConversations = new ArrayList<>();

    private PrivateConversationRepository conversationRepository;
    private PrivateMessageRepository messageRepository;
    private SimpMessagingTemplate messagingTemplate;
    private UserBlockRepository blockRepository;
    private SocialProgressService socialProgressService;
    private RecordingTxManager txManager;
    private RealPrivateMessageService service;

    /** 可控判定：pass / risky */
    private String verdictSuggest;

    @BeforeEach
    void setUp() {
        events = new ArrayList<>();
        checkInsideTransaction.clear();
        writeInsideTransaction.clear();
        viewInsideTransaction.clear();
        checkScenes.clear();
        fetchedConversations.clear();
        verdictSuggest = "pass";

        conversationRepository = mock(PrivateConversationRepository.class);
        messageRepository = mock(PrivateMessageRepository.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        blockRepository = mock(UserBlockRepository.class);
        socialProgressService = mock(SocialProgressService.class);
        SensitiveWordFilter sensitiveWordFilter = mock(SensitiveWordFilter.class);
        UserRepository userRepository = mock(UserRepository.class);

        when(conversationRepository.findById(CONVERSATION_ID)).thenAnswer(inv -> {
            events.add("find-conversation");
            // 每次返回新实例，模拟「一次 SELECT 一份数据」，避免用例误依赖跨事务的对象同一性
            RecordingConversation conv = new RecordingConversation(events, viewInsideTransaction);
            conv.setId(CONVERSATION_ID);
            conv.setConversationUid("conv-1001-1002-seed");
            conv.setUserAId(SENDER_ID);
            conv.setUserBId(RECIPIENT_ID);
            fetchedConversations.add(conv);
            return Optional.of(conv);
        });
        when(blockRepository.existsBlockedBetween(SENDER_ID, RECIPIENT_ID)).thenAnswer(inv -> {
            events.add("block-check");
            return false;
        });
        when(sensitiveWordFilter.filterWithLog(any(), any(), any()))
                .thenAnswer(inv -> inv.getArgument(0));
        when(messageRepository.saveAndFlush(any(PrivateMessage.class))).thenAnswer(inv -> {
            PrivateMessage m = inv.getArgument(0);
            m.setId(MESSAGE_ID);
            writeInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            events.add("save-message");
            return m;
        });
        when(conversationRepository.save(any(PrivateConversation.class))).thenAnswer(inv -> {
            events.add("save-conversation");
            return inv.getArgument(0);
        });
        org.mockito.Mockito.doAnswer(inv -> {
            events.add("ws-push");
            return null;
        }).when(messagingTemplate).convertAndSendToUser(anyString(), anyString(), any());
        org.mockito.Mockito.doAnswer(inv -> {
            events.add("record-chat");
            return null;
        }).when(socialProgressService).recordChat(SENDER_ID);

        ContentSecurityChecker checker = (content, userId, scene) -> {
            checkInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            checkScenes.add(scene);
            events.add("check");
            return new ContentSecurityVerdict(verdictSuggest, "selftest", "local");
        };

        txManager = new RecordingTxManager(events);
        service = new RealPrivateMessageService(conversationRepository, messageRepository,
                userRepository, messagingTemplate, sensitiveWordFilter, blockRepository, txManager);
        // 可选注入的两个字段（生产由 Spring 注入，单测手工装配）
        ReflectionTestUtils.setField(service, "contentSecurityChecker", checker);
        ReflectionTestUtils.setField(service, "socialProgressService", socialProgressService);
    }

    private MessageView send() {
        return service.sendMessage(CONVERSATION_ID, SENDER_ID, CONTENT, "text", null, null);
    }

    @Test
    @DisplayName("外呼在任何事务开始之前；消息与会话更新落在同一个短事务里；视图在事务内构建")
    void contentCheckRunsBeforeAnyTransaction() {
        MessageView view = send();

        assertEquals(List.of("find-conversation", "block-check", "check",
                        "tx-begin", "find-conversation", "save-message", "save-conversation", "view",
                        "tx-commit", "ws-push", "record-chat"),
                events, "发消息的事件序列不符，实际: " + events);
        assertFalse(events.isEmpty(), "桩件一次都没被触发，本门等于空转");
        assertFalse(checkInsideTransaction.isEmpty(), "桩检查器没被调用，本门空转");
        assertTrue(checkInsideTransaction.stream().noneMatch(Boolean::booleanValue),
                "调微信 msgSecCheck 时线程上不允许有活动事务，实际: " + checkInsideTransaction);
        assertEquals(List.of("4"), checkScenes, "私信内容检查必须仍走 scene=4（社交日志）");
        assertTrue(events.indexOf("check") < events.indexOf("tx-begin"),
                "微信外呼必须严格发生在第一个事务开始之前，实际序列: " + events);
        // 正控：落库那一刻必须真的处于事务内，否则上面的 false 只是「根本没事务」。
        assertEquals(List.of(Boolean.TRUE), List.copyOf(writeInsideTransaction),
                "消息插入必须在活动事务内执行，实际: " + writeInsideTransaction);
        // 视图构建也必须在事务内：toMessageView 读 @ManyToOne(LAZY) 的 conversation
        assertEquals(List.of(Boolean.TRUE), List.copyOf(viewInsideTransaction),
                "MessageView 必须在写事务内构建（LAZY 会话关联出事务不可取），实际: " + viewInsideTransaction);
        assertEquals(1L, events.stream().filter("tx-begin"::equals).count(),
                "落库段只允许一个事务：消息插入与会话预览更新必须原子提交");
        assertEquals(1L, events.stream().filter("tx-commit"::equals).count(),
                "消息与会话预览必须一次原子提交，不允许拆成两个事务");

        // 事务边界拆开后，消息必须挂在「事务内重新加载」的那份会话上（否则是游离对象）
        assertEquals(2, fetchedConversations.size(),
                "会话应在事务外做一次授权读、事务内再加载一次，实际: " + fetchedConversations.size());
        ArgumentCaptor<PrivateMessage> savedMessage = ArgumentCaptor.forClass(PrivateMessage.class);
        verify(messageRepository).saveAndFlush(savedMessage.capture());
        assertSame(fetchedConversations.get(1), savedMessage.getValue().getConversation(),
                "消息的 conversation 必须是写事务内加载的那个实例，而不是事务外的游离对象");

        ArgumentCaptor<PrivateConversation> savedConversation = ArgumentCaptor.forClass(PrivateConversation.class);
        verify(conversationRepository).save(savedConversation.capture());
        assertSame(fetchedConversations.get(1), savedConversation.getValue(),
                "会话预览更新必须落在事务内重新加载的那份会话上");
        assertEquals(CONTENT, savedConversation.getValue().getLastMessagePreview(),
                "text 消息的会话预览应等于过滤后的内容");
        assertNotNull(savedConversation.getValue().getLastMessageAt(),
                "会话最后消息时间必须随消息插入一起更新");

        // 推送与升温埋点保持在事务之外，且顺序仍是「先推送、后埋点」
        assertTrue(events.indexOf("ws-push") > events.indexOf("tx-commit"),
                "WebSocket 推送应在提交之后（否则接收端可能收到推送却查不到消息），实际: " + events);
        assertTrue(events.indexOf("record-chat") > events.indexOf("ws-push"),
                "升温埋点应紧随推送，实际: " + events);
        verify(messagingTemplate).convertAndSendToUser(String.valueOf(RECIPIENT_ID), "/queue/messages", view);

        assertEquals(MESSAGE_ID, view.id(), "视图 id 必须由 saveAndFlush 回填");
        assertEquals(CONVERSATION_ID, view.conversationId());
        assertEquals(SENDER_ID, view.senderId());
        assertEquals("text", view.messageKind());
        assertEquals(CONTENT, view.content());
    }

    @Test
    @DisplayName("命中高风险：不开事务、不落库、不推送")
    void riskyContentIsRejectedWithoutOpeningTransaction() {
        verdictSuggest = "risky";

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, this::send);

        assertEquals("消息包含违规内容，无法发送", ex.getMessage(),
                "必须是内容安全拒绝，而不是别的校验分支");
        assertEquals(List.of("find-conversation", "block-check", "check"), events,
                "命中即拒绝，不允许进入任何事务或写路径，实际: " + events);
        assertFalse(events.contains("tx-begin"), "被拒绝的消息不允许开启事务");
        assertFalse(events.contains("tx-suspend"), "没有事务可挂起时不应出现挂起");
        assertFalse(checkInsideTransaction.isEmpty(), "桩检查器没被调用，本门空转");
        assertTrue(checkInsideTransaction.stream().noneMatch(Boolean::booleanValue),
                "拒绝路径同样不能在事务内外呼，实际: " + checkInsideTransaction);
        assertTrue(writeInsideTransaction.isEmpty(), "被拒绝的消息不允许落库，实际: " + writeInsideTransaction);
        verify(messageRepository, never()).saveAndFlush(any(PrivateMessage.class));
        verify(conversationRepository, never()).save(any(PrivateConversation.class));
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("调用方带外层事务时：外呼期间外层事务被挂起，落库仍在那个事务里")
    void outerTransactionIsSuspendedAroundContentCheck() {
        // 复现真实调用形态：上层若以 @Transactional 复用 sendMessage（WS 链路或未来的聚合服务），
        // 发消息线程上早就有一个活动事务。只用 REQUIRED 模板的话内层会「加入」外层事务，
        // 微信外呼照样跑在事务里——必须用 NOT_SUPPORTED 把外层挂起。
        TransactionTemplate outer = new TransactionTemplate(txManager);

        MessageView view = outer.execute(status -> send());

        assertEquals(List.of("tx-begin", "find-conversation", "block-check",
                        "tx-suspend", "check", "tx-resume",
                        "find-conversation", "save-message", "save-conversation", "view",
                        "ws-push", "record-chat", "tx-commit"),
                events, "带外层事务时的事件序列不符，实际: " + events);
        assertNotNull(view, "外层事务内的发消息必须仍返回视图");
        assertEquals(List.of(Boolean.FALSE), List.copyOf(checkInsideTransaction),
                "即使调用方开了事务，调微信那一刻也不允许有活动事务，实际: " + checkInsideTransaction);
        assertEquals(List.of(Boolean.TRUE), List.copyOf(writeInsideTransaction),
                "落库必须在事务内（原子性与改造前一致），实际: " + writeInsideTransaction);
        assertEquals(List.of(Boolean.TRUE), List.copyOf(viewInsideTransaction),
                "视图构建必须在事务内，实际: " + viewInsideTransaction);
        int suspendAt = events.indexOf("tx-suspend");
        int checkAt = events.indexOf("check");
        int resumeAt = events.indexOf("tx-resume");
        assertTrue(suspendAt >= 0 && checkAt > suspendAt && resumeAt > checkAt,
                "外呼必须夹在 suspend 与 resume 之间，实际序列: " + events);
        assertEquals(1L, events.stream().filter("tx-begin"::equals).count(),
                "内层 REQUIRED 模板应加入外层事务，不允许另开一个");
        assertEquals(1L, events.stream().filter("tx-commit"::equals).count(),
                "只允许外层那一次真正提交，实际序列: " + events);
    }

    @Test
    @DisplayName("sendMessage 不得再声明 @Transactional（边界只能由 TransactionTemplate 表达）")
    void sendMessageMustNotBeAnnotatedTransactional() throws NoSuchMethodException {
        Method sendMessage = RealPrivateMessageService.class.getMethod("sendMessage",
                Long.class, Long.class, String.class, String.class, Integer.class, String.class);
        assertFalse(sendMessage.isAnnotationPresent(Transactional.class),
                "sendMessage 重新带上 @Transactional 会把微信外呼圈回事务里："
                        + java.util.Arrays.toString(sendMessage.getParameterTypes()));

        int declared = 0;
        for (Method method : RealPrivateMessageService.class.getDeclaredMethods()) {
            if (!"sendMessage".equals(method.getName())) {
                continue;
            }
            declared++;
            assertFalse(method.isAnnotationPresent(Transactional.class),
                    "sendMessage 重载不允许声明 @Transactional："
                            + java.util.Arrays.toString(method.getParameterTypes()));
        }
        assertEquals(1, declared, "应且仅应有一个 sendMessage（用例不能空转）");
        assertFalse(RealPrivateMessageService.class.isAnnotationPresent(Transactional.class),
                "类级 @Transactional 会让私信整条链路回到事务内");
    }
}
