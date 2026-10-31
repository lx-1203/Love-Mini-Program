package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.entity.User;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.privacy.AccountErasureService;
import com.campuslove.api.repository.AuditLogRepository;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.TaskClaimRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import com.campuslove.api.repository.UserAgreementConsentRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserInterestTagRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.wallet.UserWalletRepository;
import com.campuslove.api.wallet.WalletTransactionLogRepository;
import com.campuslove.api.verification.RealNameCertificationService;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 「导出清单 = 清除清单」的同源验证（P0 2026-10-31 第 1、3 项）。
 *
 * <p>两件事：</p>
 * <ol>
 *   <li>{@link PersonalDataService#build} 每次组装完都会拿产出的类别名去核对
 *       {@code PersonalDataTables} —— 本测试用一个<b>活的服务</b>跑通它，任何一侧清单漂移
 *       都会在导出接口上直接抛 {@link IllegalStateException}（而不是让用户「能导出、删不掉」）。</li>
 *   <li>读一个<b>已注销</b>的账号：导出不得崩、不得把墓碑值当成真实数据渲染，
 *       也不得留下任何含 userId 的手机号哨兵。这是 {@code maskPhone()} 旧实现
 *       （{@code "1****" + userId}）会在导出里显示成「一个绑定过的号码」的回归防线。</li>
 * </ol>
 */
class PersonalDataErasureAlignmentTest {

    private static final long SUBJECT = 100L;
    private static final String PLAIN_PHONE = "13812345678";

    @Mock private UserRepository userRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private UserInterestTagRepository userInterestTagRepository;
    @Mock private CampusCertificationRepository campusCertificationRepository;
    @Mock private RealNameCertificationService realNameCertificationService;
    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private LikeRepository likeRepository;
    @Mock private HeartSignalRepository heartSignalRepository;
    @Mock private UserFollowRepository userFollowRepository;
    @Mock private TempChatSessionRepository tempChatSessionRepository;
    @Mock private TempChatMessageRepository tempChatMessageRepository;
    @Mock private PrivateConversationRepository privateConversationRepository;
    @Mock private PrivateMessageRepository privateMessageRepository;
    @Mock private UserWalletRepository userWalletRepository;
    @Mock private WalletTransactionLogRepository walletTransactionLogRepository;
    @Mock private VipBillRepository vipBillRepository;
    @Mock private VipBillingLogRepository vipBillingLogRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private CheckInRepository checkInRepository;
    @Mock private TaskClaimRepository taskClaimRepository;
    @Mock private UserAgreementConsentRepository userAgreementConsentRepository;
    @Mock private AuditLogRepository auditLogRepository;

    private PersonalDataService service;
    private AesEncryptor encryptor;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new PersonalDataService(
                userRepository, userBasicProfileRepository, userCampusProfileRepository,
                userScheduleProfileRepository, userInterestTagRepository,
                campusCertificationRepository, realNameCertificationService, postRepository,
                commentRepository, likeRepository, heartSignalRepository, userFollowRepository,
                tempChatSessionRepository, tempChatMessageRepository, privateConversationRepository,
                privateMessageRepository, userWalletRepository, walletTransactionLogRepository,
                vipBillRepository, vipBillingLogRepository, notificationRepository,
                checkInRepository, taskClaimRepository, userAgreementConsentRepository,
                auditLogRepository);
        encryptor = realEncryptor();
        // aesEncryptor 是 required=false 的字段注入（不改 25 参构造器），测试里同样反射塞进去
        Field field = PersonalDataService.class.getDeclaredField("aesEncryptor");
        field.setAccessible(true);
        field.set(service, encryptor);
        stubEmptyPages();
    }

    @Test
    @DisplayName("导出实际产出的类别，与清除清单声明的类别一一对应")
    void exportCategoriesAndErasureInventoryNeverDiverge() {
        when(userRepository.findById(SUBJECT)).thenReturn(java.util.Optional.of(activeUser()));
        PersonalDataExport export = assertDoesNotThrow(() -> service.build(SUBJECT));
        List<String> produced = export.categories().stream().map(PersonalDataCategory::name).toList();
        assertEquals(com.campuslove.api.privacy.PersonalDataTables.declaredExportCategories(),
                new java.util.LinkedHashSet<>(produced),
                "导出类别集合与清除清单不一致 —— 有一类数据用户能看见却删不掉");
    }

    @Test
    @DisplayName("未注销账号：导出把密文手机号解出来再掩码，而不是掩码一段 Base64")
    void liveAccountExportsRealMaskedPhone() {
        User user = activeUser();
        user.setPhone(com.campuslove.api.privacy.PhoneColumnCodec.store(encryptor, PLAIN_PHONE));
        when(userRepository.findById(SUBJECT)).thenReturn(java.util.Optional.of(user));

        PersonalDataCategory account = service.build(SUBJECT).categories().get(0);
        String cell = cellOf(account, "phone");
        assertEquals("138****5678", cell,
                "phone 列存的是密文：直接掩码密文会得到一串 Base64 碎片，对用户是错误信息");
    }

    @Test
    @DisplayName("已注销账号：导出不崩，身份列全为空/墓碑常量，且不含 userId 派生的手机号哨兵")
    void erasedAccountExportsBlankIdentityColumns() {
        User user = activeUser();
        // 用真实墓碑写入路径（不是手搓字段），保证 users 列集与清除清单同源
        AccountErasureService erasure = new AccountErasureService(
                mock(JdbcTemplate.class), emptyMediaProvider());
        erasure.tombstone(user);
        when(userRepository.findById(SUBJECT)).thenReturn(java.util.Optional.of(user));

        PersonalDataExport export = assertDoesNotThrow(() -> service.build(SUBJECT),
                "读取一个已注销账号的档案不得抛异常（NULL 手机号会喂进掩码/解密路径）");
        PersonalDataCategory account = export.categories().get(0);

        assertEquals("", cellOf(account, "phone"), "注销后手机号列必须是空值，不是任何哨兵");
        assertEquals(com.campuslove.api.privacy.ErasedValues.NICKNAME, cellOf(account, "nickname"));
        assertEquals("deactivated", cellOf(account, "status"));
        assertEquals("", cellOf(account, "birth_date"));
        assertEquals("", cellOf(account, "campus_name"));
        assertEquals("", cellOf(account, "latitude"));
        assertEquals("", cellOf(account, "longitude"));
        assertEquals("", cellOf(account, "geo_updated_at"));
        assertEquals("", cellOf(account, "avatar_url"));
        // 牙齿：旧实现写的是 "1****"+userId，导出里会以「像手机号的值」出现
        assertFalse(cellOf(account, "phone").contains(String.valueOf(SUBJECT)));
        String flattened = String.join("|", account.rows().get(0));
        assertFalse(flattened.contains("1****" + SUBJECT),
                "导出里出现了 userId 派生的手机号哨兵：注销并未删除手机号");
        assertFalse(flattened.contains(PLAIN_PHONE), "导出里不得出现明文手机号");
        assertFalse(flattened.contains("phone:d3b07384"),
                "openid 必须已被随机墓碑覆盖（phone:<SHA-256> 可穷举反推手机号）");
    }

    // ---- 夹具 ----

    private User activeUser() {
        User user = new User();
        user.setId(SUBJECT);
        user.setOpenid("phone:d3b07384d113edec49eaa6238ad5ff00");
        user.setNickname("张小明");
        user.setPhone(PLAIN_PHONE);
        user.setBirthDate(LocalDate.of(2004, 3, 1));
        user.setCampusName("北京大学");
        user.setLatitude(BigDecimal.valueOf(39.9042));
        user.setLongitude(BigDecimal.valueOf(116.4074));
        user.setGeoUpdatedAt(java.time.LocalDateTime.now());
        user.setStatus("active");
        user.setRole("USER");
        user.setAvatarUrl("/uploads/avatar-100.jpg");
        return user;
    }

    private static String cellOf(PersonalDataCategory category, String column) {
        int index = category.columns().indexOf(column);
        assertTrue(index >= 0, "导出缺少列: " + column);
        return category.rows().get(0).get(index);
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<MediaStorageService> emptyMediaProvider() {
        ObjectProvider<MediaStorageService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        return provider;
    }

    private void stubEmptyPages() {
        Page<Object> empty = new PageImpl<>(List.of());
        when(commentRepository.findByAuthorIdOrderByCreatedAtDesc(anyLong(), any(Pageable.class)))
                .thenReturn((Page) empty);
        when(walletTransactionLogRepository.findByUserIdOrderByCreatedAtDesc(anyLong(),
                any(Pageable.class))).thenReturn((Page) empty);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(anyLong(), any(Pageable.class)))
                .thenReturn((Page) empty);
        when(checkInRepository.searchForAdmin(any(), any(), any(), any(), any(),
                any(Pageable.class))).thenReturn((Page) empty);
        when(auditLogRepository.search(any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn((Page) empty);
    }

    private static AesEncryptor realEncryptor() throws Exception {
        AesEncryptor encryptor = new AesEncryptor();
        Field secret = AesEncryptor.class.getDeclaredField("secret");
        secret.setAccessible(true);
        secret.set(encryptor, "0123456789abcdef0123456789abcdef-test-only");
        Field strict = AesEncryptor.class.getDeclaredField("strictAes");
        strict.setAccessible(true);
        strict.set(encryptor, Boolean.TRUE);
        encryptor.init();
        return encryptor;
    }
}
