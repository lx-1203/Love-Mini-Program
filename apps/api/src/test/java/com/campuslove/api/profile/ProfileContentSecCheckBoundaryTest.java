package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.ContentSecurityChecker;
import com.campuslove.api.config.ContentSecurityVerdict;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.media.MediaAssetService;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * S2-1（2026-10-30）资料保存链路的「内容安全外呼 vs DB 事务」边界。
 *
 * <p><b>缺陷</b>：{@code ProfileUpdateService.saveBasicProfile} 带着方法级
 * {@code @Transactional}，而其中的 {@code rejectIfRisky}（昵称 + 简介）会外呼微信
 * msgSecCheck v2。于是每次改资料都是「持着一条 Hikari 连接 + {@code users} /
 * {@code user_basic_profiles} 的行锁，等一个不受我们控制的第三方 HTTP 调用」。
 * 微信侧超时（秒级）时，并发改资料会先抽干连接池，再让整个 API 排队。</p>
 *
 * <p><b>判点是运行期事实，不是代码长相</b>：这里用<b>真的</b>
 * {@link AbstractPlatformTransactionManager} 子类驱动 {@link TransactionTemplate}
 * （口径同 {@code ContentSecCheckTransactionBoundaryTest}），使
 * {@link TransactionSynchronizationManager} 的线程状态与生产一致，并把
 * check / tx-begin / 读 / 写 / 视图 / tx-commit 按发生顺序记进一条事件列表，
 * 因此「两次检查都严格发生在任何事务开始之前」与「读改写 + 视图在同一个短事务里」
 * 可以被逐字断言。</p>
 *
 * <p><b>为什么不能只把 {@code @Transactional} 去掉</b>：调用方可能自己带事务进来
 * （此前 {@code RealProfileService.saveBasicProfile} 就是一个 {@code @Transactional}
 * 的纯委托），内层 REQUIRED 会直接<b>加入</b>那个事务，外呼照样在事务里。所以本类用
 * PROPAGATION_NOT_SUPPORTED 的挂起模板把边界自证——见用例 C。</p>
 *
 * <p><b>为什么还要用例 E</b>：两个实体都带 {@code @Version}，{@code save(...)} 走的是
 * {@code em.merge}，<b>返回值</b>才是持久化上下文里的权威实例，而改造前那两行把返回值丢掉了。
 * 一旦读被挪出这段事务（或这条链路被用在一个游离态实体上），丢弃返回值就会让视图拿到
 * 旧版本/旧标识的对象，乐观锁语义被悄悄改掉且不会报错。用例 E 用「桩返回另一个实例」
 * 把这个判点钉死。</p>
 *
 * <p>可证伪性：①把 {@code @Transactional} 加回 {@code saveBasicProfile}（D 直接红；
 * 在真实容器里 A/C 的 tx 标志也会变红）；②把 {@code rejectIfRisky} 挪回事务里
 * （A/C 的事件序列与 tx 标志双红）；③去掉 {@code suspendingTemplate}（C 的 check
 * 标志与 suspend/resume 序列变红）；④把视图构建挪出事务（A/C 的 view 标志变红）；
 * ⑤丢弃 {@code save(...)} 返回值（E 变红）。</p>
 */
@DisplayName("ProfileUpdateService - 内容安全外呼与事务边界")
class ProfileContentSecCheckBoundaryTest {

    private static final long USER_ID = 4100L;
    private static final long PROFILE_ROW_ID = 7001L;
    private static final long STORED_PROFILE_VERSION = 3L;
    private static final long STORED_USER_VERSION = 5L;

    /** 视图桩返回值：只用来证明「返回值来自事务内的那一次 toBasicProfileView」。 */
    private static final BasicProfileView VIEW = new BasicProfileView(
            "若星", "爱跑步的大三女生", "大三", "她/她", 165, "bachelor", "never",
            "浙江", "杭州", "上海", List.of("考研"), List.of(), null, null, 88,
            "campus", "/api/v1/media/4100/avatar/aa.png", List.of(), "approved", null,
            LocalDate.of(2003, 5, 12), "开朗、爱运动", Boolean.TRUE);

    /**
     * 真事务机制，只是把 begin/commit/suspend/resume 记下来
     * （复用 {@code ContentSecCheckTransactionBoundaryTest} 的口径：必须实现
     * {@code isExistingTransaction/doSuspend/doResume}，否则挂起分支不会被走到）。
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
    /** 每次外呼微信 msgSecCheck 时线程上是否有活动事务（期望全部 false）。 */
    private List<Boolean> checkInsideTransaction;
    /** 正控：两次仓库写入时是否真的有活动事务（期望全部 true，否则 false 毫无意义）。 */
    private List<Boolean> writeInsideTransaction;
    /** 正控：视图构建（内部还有认证徽章/媒体资产 DB 读）时是否在事务内（期望 true）。 */
    private List<Boolean> viewInsideTransaction;

    private UserRepository userRepository;
    private UserBasicProfileRepository userBasicProfileRepository;
    private ProfileQueryService queryService;
    private SensitiveWordFilter sensitiveWordFilter;
    private RecordingTxManager txManager;
    private ProfileUpdateService service;

    /** 表里那两行：findBy 返回、被本方法改写后交给 save(...) 的那个实例。 */
    private UserBasicProfile storedProfile;
    private User storedUser;
    /** save(...) 的返回值：模拟 merge 出来的<b>另一个</b>实例（同 id、version+1）。 */
    private UserBasicProfile mergedProfile;
    private User mergedUser;
    /** 观测点：save 收到的实参、视图收到的实参。 */
    private UserBasicProfile profileGivenToSave;
    private User userGivenToSave;
    private UserBasicProfile profileGivenToView;
    private User userGivenToView;

    /** 可控判定：pass / risky */
    private String verdictSuggest;

    @BeforeEach
    void setUp() {
        events = new ArrayList<>();
        checkInsideTransaction = new ArrayList<>();
        writeInsideTransaction = new ArrayList<>();
        viewInsideTransaction = new ArrayList<>();
        verdictSuggest = "pass";

        // SecurityUtils.getCurrentUserId() 走 SecurityContextHolder（principal 直接是用户 ID）
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(USER_ID, null, List.of()));

        userRepository = mock(UserRepository.class);
        userBasicProfileRepository = mock(UserBasicProfileRepository.class);
        queryService = mock(ProfileQueryService.class);
        sensitiveWordFilter = mock(SensitiveWordFilter.class);

        storedProfile = storedProfile();
        storedUser = storedUser();

        when(userBasicProfileRepository.findByUserId(USER_ID)).thenAnswer(invocation -> {
            events.add("find-profile");
            return Optional.of(storedProfile);
        });
        when(userRepository.findById(USER_ID)).thenAnswer(invocation -> {
            events.add("find-user");
            return Optional.of(storedUser);
        });

        // 桩 checker 记录「外呼那一刻线程上有没有活动事务」——这就是本门的判点
        ContentSecurityChecker checker = (content, userId, scene) -> {
            checkInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            events.add("check");
            return new ContentSecurityVerdict(verdictSuggest, "selftest", "wechat");
        };

        when(userBasicProfileRepository.save(any(UserBasicProfile.class))).thenAnswer(invocation -> {
            profileGivenToSave = invocation.getArgument(0);
            writeInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            events.add("save-profile");
            mergedProfile = mergedCopyOf(profileGivenToSave);
            return mergedProfile;
        });
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            userGivenToSave = invocation.getArgument(0);
            writeInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            events.add("save-user");
            mergedUser = mergedCopyOf(userGivenToSave);
            return mergedUser;
        });

        when(queryService.calculateProfileCompletion(USER_ID)).thenAnswer(invocation -> {
            events.add("calc-completion");
            return 88;
        });
        when(queryService.serializeListToJson(anyList())).thenReturn("[]");
        when(queryService.toBasicProfileView(any(UserBasicProfile.class), any(User.class)))
                .thenAnswer(invocation -> {
                    profileGivenToView = invocation.getArgument(0);
                    userGivenToView = invocation.getArgument(1);
                    viewInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
                    events.add("view");
                    return VIEW;
                });

        txManager = new RecordingTxManager(events);
        service = new ProfileUpdateService(
                userRepository,
                mock(UserFollowRepository.class),
                mock(NotificationRepository.class),
                userBasicProfileRepository,
                mock(UserCampusProfileRepository.class),
                mock(UserScheduleProfileRepository.class),
                mock(InteractionEventService.class),
                mock(MediaStorageService.class),
                mock(MediaAssetService.class),
                queryService,
                mock(FollowService.class),
                sensitiveWordFilter,
                txManager);
        // 生产是 @Autowired(required = false) 字段注入，这里手工装上才能观察到外呼
        ReflectionTestUtils.setField(service, "contentSecurityChecker", checker);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private BasicProfileView save() {
        return service.saveBasicProfile(request());
    }

    /** 一份贴近真实提交的资料请求（可选字段有值，走完整写入路径）。 */
    private static BasicProfileRequest request() {
        return new BasicProfileRequest(
                "若星", "爱跑步的大三女生", "大三", "她/她",
                165, "bachelor", "never", "浙江", "杭州", "上海",
                List.of("考研", "出国"), List.of("跑步", "电影"),
                "/api/v1/media/4100/avatar/aa.png", LocalDate.of(2003, 5, 12), "开朗、爱运动");
    }

    private static UserBasicProfile storedProfile() {
        UserBasicProfile profile = new UserBasicProfile();
        profile.setId(PROFILE_ROW_ID);
        profile.setUserId(USER_ID);
        profile.setNickname("旧昵称");
        profile.setBio("旧简介");
        profile.setPhotoGallery("[]");
        profile.setFuturePlanTags("[]");
        profile.setInterestTags("[]");
        profile.setVersion(STORED_PROFILE_VERSION);
        return profile;
    }

    private static User storedUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setNickname("旧昵称");
        user.setProfileCompletion(10);
        user.setVersion(STORED_USER_VERSION);
        return user;
    }

    /** merge 语义：返回值是<b>另一个</b>实例，id 不变、version 自增。 */
    private static UserBasicProfile mergedCopyOf(UserBasicProfile incoming) {
        UserBasicProfile merged = new UserBasicProfile();
        merged.setId(incoming.getId());
        merged.setUserId(incoming.getUserId());
        merged.setNickname(incoming.getNickname());
        merged.setBio(incoming.getBio());
        merged.setVersion(incoming.getVersion() + 1);
        return merged;
    }

    private static User mergedCopyOf(User incoming) {
        User merged = new User();
        merged.setId(incoming.getId());
        merged.setNickname(incoming.getNickname());
        merged.setAvatarUrl(incoming.getAvatarUrl());
        merged.setProfileCompletion(incoming.getProfileCompletion());
        merged.setVersion(incoming.getVersion() + 1);
        return merged;
    }

    @Test
    @DisplayName("A 昵称/简介检查全部先于任何事务；读改写与视图构建才在事务内")
    void contentChecksRunBeforeAnyTransaction() {
        BasicProfileView view = save();

        assertSame(VIEW, view, "返回值应来自事务内那次 toBasicProfileView");
        assertFalse(events.isEmpty(), "事件列表为空说明本门在空转（桩一次都没被调用）");
        assertEquals(List.of("check", "check", "tx-begin", "find-profile", "save-profile",
                        "find-user", "calc-completion", "save-user", "view", "tx-commit"), events,
                "必须先有两次事务外的微信外呼，再开一个短事务做读改写；实际: " + events);
        assertEquals(List.of(Boolean.FALSE, Boolean.FALSE), List.copyOf(checkInsideTransaction),
                "调 msgSecCheck 时线程上不允许有活动事务，实际: " + checkInsideTransaction);
        // 正控：同一根线程在落库那一刻必须真的处于事务内，否则上面的 false 只是「根本没事务」。
        assertEquals(List.of(Boolean.TRUE, Boolean.TRUE), List.copyOf(writeInsideTransaction),
                "profile 与 user 两次写入都必须在活动事务内（原子性与改造前一致），"
                        + "实际: " + writeInsideTransaction);
        assertEquals(List.of(Boolean.TRUE), List.copyOf(viewInsideTransaction),
                "toBasicProfileView 自身要读认证徽章与媒体资产，必须留在事务内构建");
    }

    @Test
    @DisplayName("B 昵称命中高风险：不开事务、不读表、不落库，直接拒绝")
    void riskyNicknameAbortsBeforeAnyTransaction() {
        verdictSuggest = "risky";

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, this::save);

        assertTrue(ex.getMessage().contains("资料包含违规内容"), "实际文案: " + ex.getMessage());
        assertEquals(List.of("check"), events, "昵称命中即拒绝，不应继续检查简介或开事务；实际: " + events);
        assertEquals(List.of(Boolean.FALSE), List.copyOf(checkInsideTransaction),
                "拒绝路径同样不允许在事务内外呼");
        assertFalse(events.contains("tx-begin"), "被拒绝的内容不允许开启事务");
        assertTrue(writeInsideTransaction.isEmpty(), "命中高风险后不允许发生任何落库");
        verify(userBasicProfileRepository, never()).findByUserId(anyLong());
        verify(userBasicProfileRepository, never()).save(any(UserBasicProfile.class));
        verify(userRepository, never()).save(any(User.class));
        verify(queryService, never()).toBasicProfileView(any(UserBasicProfile.class), any(User.class));
    }

    @Test
    @DisplayName("C 调用方带外层事务时：外呼期间外层事务被挂起，落库仍在那个事务里")
    void outerTransactionIsSuspendedAroundContentChecks() {
        // 复现真实生产路径：调用方（曾经的 RealProfileService.saveBasicProfile、
        // 以及任何 @Transactional 的上层组合）带着活动事务进来。只把内层改成
        // 编程式 REQUIRED 是治不好的——REQUIRED 会「加入」外层事务，微信外呼照样在事务里。
        TransactionTemplate outer = new TransactionTemplate(txManager);

        BasicProfileView view = outer.execute(status -> save());

        assertSame(VIEW, view, "返回值应来自事务内那次 toBasicProfileView");
        assertEquals(List.of("tx-begin", "tx-suspend", "check", "check", "tx-resume",
                        "find-profile", "save-profile", "find-user", "calc-completion", "save-user",
                        "view", "tx-commit"), events,
                "两次外呼必须夹在 tx-suspend 与 tx-resume 之间；实际: " + events);
        assertEquals(List.of(Boolean.FALSE, Boolean.FALSE), List.copyOf(checkInsideTransaction),
                "即使调用方开了事务，调微信那一刻也不允许有活动事务，实际: " + checkInsideTransaction);
        assertEquals(List.of(Boolean.TRUE, Boolean.TRUE), List.copyOf(writeInsideTransaction),
                "落库必须在事务内（原子性与改造前一致），实际: " + writeInsideTransaction);
        assertEquals(List.of(Boolean.TRUE), List.copyOf(viewInsideTransaction),
                "视图构建必须留在事务内");
        assertEquals(1, events.stream().filter("tx-commit"::equals).count(),
                "内层写事务应加入外层事务，只允许一次真提交，实际序列: " + events);
    }

    @Test
    @DisplayName("D saveBasicProfile 不得再声明 @Transactional（边界只能由 TransactionTemplate 表达）")
    void saveBasicProfileMustNotBeAnnotatedTransactional() {
        Method target = null;
        for (Method method : ProfileUpdateService.class.getDeclaredMethods()) {
            if ("saveBasicProfile".equals(method.getName())) {
                target = method;
            }
        }
        assertNotNull(target, "saveBasicProfile 必须仍然存在（本门的前提）");
        assertFalse(target.isAnnotationPresent(Transactional.class),
                "saveBasicProfile 重新带上 @Transactional 会把微信 msgSecCheck 外呼圈回事务里，"
                        + "并占住 users / user_basic_profiles 的行锁");
        assertFalse(ProfileUpdateService.class.isAnnotationPresent(Transactional.class),
                "类级 @Transactional 会让保存资料整条链路回到事务内");
    }

    @Test
    @DisplayName("E 视图必须拿到 save(...) 返回的实例（@Version merge 的返回值不可丢弃）")
    void viewMustReceiveTheMergedInstances() {
        save();

        // 桩本身模拟 merge 返回「新实例」；若实现丢弃返回值，下面两条 assertSame 立刻变红
        assertNotSame(storedProfile, mergedProfile, "桩必须返回另一个实例，否则本门空转");
        assertNotSame(storedUser, mergedUser, "桩必须返回另一个实例，否则本门空转");
        assertSame(storedProfile, profileGivenToSave, "事务里读到的那个 profile 才是被 save 的对象");
        assertSame(storedUser, userGivenToSave, "事务里读到的那个 user 才是被 save 的对象");
        assertSame(mergedProfile, profileGivenToView,
                "toBasicProfileView 必须收到 save(profile) 的返回值（version 已自增的新实例）");
        assertSame(mergedUser, userGivenToView,
                "toBasicProfileView 必须收到 save(user) 的返回值（version 已自增的新实例）");
        assertEquals(PROFILE_ROW_ID, mergedProfile.getId().longValue(), "merge 后 id 必须同源");
        assertEquals(STORED_PROFILE_VERSION + 1, mergedProfile.getVersion().longValue());
        assertEquals(STORED_USER_VERSION + 1, mergedUser.getVersion().longValue());
        assertEquals("若星", mergedProfile.getNickname(), "落库前应已写入请求里的昵称");
        assertEquals(88, mergedUser.getProfileCompletion().intValue(), "完善度应先重算再落库");
    }
}
