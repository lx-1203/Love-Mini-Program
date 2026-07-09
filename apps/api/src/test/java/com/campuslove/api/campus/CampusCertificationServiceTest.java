package com.campuslove.api.campus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * 校园认证服务单元测试（Phase B - Task B4）。
 *
 * <p>覆盖 {@link CampusCertificationService#getVerificationBadgeLevel(Long)} 的判定逻辑：
 * <ul>
 *   <li>Real 实现：优先级 school > email > idcard > none
 *     <ul>
 *       <li>status=APPROVED → "school"（即使 email/idcard 也为 true，仍优先 school）</li>
 *       <li>emailVerified=true → "email"</li>
 *       <li>idCardVerified=true → "idcard"</li>
 *       <li>其他状态/无记录/null userId → "none"</li>
 *     </ul>
 *   </li>
 *   <li>Mock 实现：内存存储中 APPROVED → "school"；emailVerified → "email"；
 *       idCardVerified → "idcard"；其他 → "none"</li>
 * </ul>
 * </p>
 *
 * <p>测试策略：
 * <ul>
 *   <li>Real 实现通过 Mockito mock CampusCertificationRepository 与
 *       UserBasicProfileRepository 控制 findByUserId 返回值</li>
 *   <li>Mock 实现直接实例化 MockCampusCertificationService，
 *       调用 reviewCertification 模拟审核通过、setVerificationFlags 设置邮箱/身份证标志</li>
 * </ul>
 * </p>
 */
class CampusCertificationServiceTest {

    private CampusCertificationRepository repository;
    private UserBasicProfileRepository userBasicProfileRepository;
    private RealCampusCertificationService realService;
    private MockCampusCertificationService mockService;

    @BeforeEach
    void setUp() {
        repository = mock(CampusCertificationRepository.class);
        userBasicProfileRepository = mock(UserBasicProfileRepository.class);
        realService = new RealCampusCertificationService(repository, userBasicProfileRepository);
        mockService = new MockCampusCertificationService();
    }

    // ---- Real 实现：school 徽章 ----

    /**
     * TR-B3.1：已通过校园认证的用户，徽章级别应为 "school"。
     * 即使 email/idcard 标志为 true，school 优先级最高。
     */
    @Test
    void real_getVerificationBadgeLevel_approvedCertification_returnsSchool() {
        CampusCertification cert = new CampusCertification();
        cert.setUserId(100L);
        cert.setStatus("APPROVED");
        cert.setSubmittedAt(LocalDateTime.now().minusDays(1));
        when(repository.findByUserId(100L)).thenReturn(Optional.of(cert));

        String badge = realService.getVerificationBadgeLevel(100L);

        assertEquals("school", badge, "APPROVED 状态应返回 school 徽章");
    }

    /**
     * TR-B3.2：未认证用户（无认证记录且无邮箱/身份证标志），徽章级别应为 "none"。
     */
    @Test
    void real_getVerificationBadgeLevel_noCertificationRecord_returnsNone() {
        when(repository.findByUserId(200L)).thenReturn(Optional.empty());
        when(userBasicProfileRepository.findByUserId(200L)).thenReturn(Optional.empty());

        String badge = realService.getVerificationBadgeLevel(200L);

        assertEquals("none", badge, "无认证记录应返回 none 徽章");
    }

    /**
     * PENDING 状态（审核中）不应授予 school 徽章；若无 email/idcard 标志则返回 none。
     */
    @Test
    void real_getVerificationBadgeLevel_pendingCertification_returnsNone() {
        CampusCertification cert = new CampusCertification();
        cert.setUserId(300L);
        cert.setStatus("PENDING");
        when(repository.findByUserId(300L)).thenReturn(Optional.of(cert));
        when(userBasicProfileRepository.findByUserId(300L)).thenReturn(Optional.empty());

        String badge = realService.getVerificationBadgeLevel(300L);

        assertEquals("none", badge, "PENDING 状态且无其他认证标志应返回 none 徽章");
    }

    /**
     * REJECTED 状态（审核未通过）不应授予 school 徽章；若无 email/idcard 标志则返回 none。
     */
    @Test
    void real_getVerificationBadgeLevel_rejectedCertification_returnsNone() {
        CampusCertification cert = new CampusCertification();
        cert.setUserId(400L);
        cert.setStatus("REJECTED");
        when(repository.findByUserId(400L)).thenReturn(Optional.of(cert));
        when(userBasicProfileRepository.findByUserId(400L)).thenReturn(Optional.empty());

        String badge = realService.getVerificationBadgeLevel(400L);

        assertEquals("none", badge, "REJECTED 状态且无其他认证标志应返回 none 徽章");
    }

    /**
     * null userId 应直接返回 "none"，避免 NPE。
     */
    @Test
    void real_getVerificationBadgeLevel_nullUserId_returnsNone() {
        String badge = realService.getVerificationBadgeLevel(null);

        assertEquals("none", badge, "null userId 应返回 none 徽章");
    }

    // ---- Real 实现：email 徽章（B3.3）----

    /**
     * TR-B3.3：无校园认证但邮箱已认证的用户，徽章级别应为 "email"。
     */
    @Test
    void real_getVerificationBadgeLevel_emailVerified_returnsEmail() {
        when(repository.findByUserId(500L)).thenReturn(Optional.empty());
        UserBasicProfile bp = new UserBasicProfile();
        bp.setUserId(500L);
        bp.setEmailVerified(true);
        bp.setIdCardVerified(false);
        when(userBasicProfileRepository.findByUserId(500L)).thenReturn(Optional.of(bp));

        String badge = realService.getVerificationBadgeLevel(500L);

        assertEquals("email", badge, "邮箱已认证应返回 email 徽章");
    }

    /**
     * 校园认证 PENDING 但邮箱已认证时，仍应返回 "email"（PENDING 不阻断 email 徽章）。
     */
    @Test
    void real_getVerificationBadgeLevel_pendingCertButEmailVerified_returnsEmail() {
        CampusCertification cert = new CampusCertification();
        cert.setUserId(501L);
        cert.setStatus("PENDING");
        when(repository.findByUserId(501L)).thenReturn(Optional.of(cert));
        UserBasicProfile bp = new UserBasicProfile();
        bp.setUserId(501L);
        bp.setEmailVerified(true);
        bp.setIdCardVerified(false);
        when(userBasicProfileRepository.findByUserId(501L)).thenReturn(Optional.of(bp));

        String badge = realService.getVerificationBadgeLevel(501L);

        assertEquals("email", badge, "校园认证 PENDING 但邮箱已认证应返回 email 徽章");
    }

    // ---- Real 实现：idcard 徽章（B3.4）----

    /**
     * TR-B3.4：无校园认证、邮箱未认证但身份证已认证的用户，徽章级别应为 "idcard"。
     */
    @Test
    void real_getVerificationBadgeLevel_idCardVerified_returnsIdcard() {
        when(repository.findByUserId(600L)).thenReturn(Optional.empty());
        UserBasicProfile bp = new UserBasicProfile();
        bp.setUserId(600L);
        bp.setEmailVerified(false);
        bp.setIdCardVerified(true);
        when(userBasicProfileRepository.findByUserId(600L)).thenReturn(Optional.of(bp));

        String badge = realService.getVerificationBadgeLevel(600L);

        assertEquals("idcard", badge, "身份证已认证应返回 idcard 徽章");
    }

    /**
     * 优先级：email > idcard（同时设置时返回 email）。
     */
    @Test
    void real_getVerificationBadgeLevel_bothEmailAndIdCardVerified_returnsEmail() {
        when(repository.findByUserId(601L)).thenReturn(Optional.empty());
        UserBasicProfile bp = new UserBasicProfile();
        bp.setUserId(601L);
        bp.setEmailVerified(true);
        bp.setIdCardVerified(true);
        when(userBasicProfileRepository.findByUserId(601L)).thenReturn(Optional.of(bp));

        String badge = realService.getVerificationBadgeLevel(601L);

        assertEquals("email", badge, "邮箱与身份证都认证时，应优先返回 email 徽章");
    }

    /**
     * 优先级：school > email > idcard。
     * 校园认证 APPROVED 且 email/idcard 都为 true 时，应返回 school。
     */
    @Test
    void real_getVerificationBadgeLevel_allVerified_returnsSchool() {
        CampusCertification cert = new CampusCertification();
        cert.setUserId(602L);
        cert.setStatus("APPROVED");
        when(repository.findByUserId(602L)).thenReturn(Optional.of(cert));
        UserBasicProfile bp = new UserBasicProfile();
        bp.setUserId(602L);
        bp.setEmailVerified(true);
        bp.setIdCardVerified(true);
        when(userBasicProfileRepository.findByUserId(602L)).thenReturn(Optional.of(bp));

        String badge = realService.getVerificationBadgeLevel(602L);

        assertEquals("school", badge, "三种认证均通过时，应优先返回 school 徽章");
    }

    /**
     * BasicProfile 存在但 email/idcard 均为 false 时返回 none。
     */
    @Test
    void real_getVerificationBadgeLevel_basicProfileExistsButNoFlags_returnsNone() {
        when(repository.findByUserId(603L)).thenReturn(Optional.empty());
        UserBasicProfile bp = new UserBasicProfile();
        bp.setUserId(603L);
        bp.setEmailVerified(false);
        bp.setIdCardVerified(false);
        when(userBasicProfileRepository.findByUserId(603L)).thenReturn(Optional.of(bp));

        String badge = realService.getVerificationBadgeLevel(603L);

        assertEquals("none", badge, "BasicProfile 存在但邮箱/身份证均未认证应返回 none");
    }

    // ---- Mock 实现 ----

    /**
     * Mock 实现初始状态：用户 1 处于 PENDING（构造函数预置），徽章应为 "none"。
     */
    @Test
    void mock_getVerificationBadgeLevel_defaultPendingState_returnsNone() {
        String badge = mockService.getVerificationBadgeLevel(1L);

        assertEquals("none", badge, "Mock 默认 PENDING 状态应返回 none");
    }

    /**
     * Mock 实现：审核通过后（APPROVED），徽章应为 "school"。
     * 流程：submit → review(APPROVED) → 查询徽章。
     */
    @Test
    void mock_getVerificationBadgeLevel_afterApproval_returnsSchool() {
        // 用户 2 提交认证，certId 由 store 内部 idSeq 自增分配
        CampusCertificationView view = mockService.submitCertification(2L, "模拟大学", "计算机系", "card.jpg");
        // 审核通过需使用 submitCertification 返回的 certId
        mockService.reviewCertification(view.getId(), "APPROVED", 999L, "通过");

        String badge = mockService.getVerificationBadgeLevel(2L);

        assertEquals("school", badge, "审核通过后应返回 school 徽章");
    }

    /**
     * Mock 实现：未提交认证的用户，徽章应为 "none"。
     */
    @Test
    void mock_getVerificationBadgeLevel_noRecord_returnsNone() {
        String badge = mockService.getVerificationBadgeLevel(9999L);

        assertEquals("none", badge, "未提交认证应返回 none");
    }

    /**
     * Mock 实现：null userId 应返回 "none"。
     */
    @Test
    void mock_getVerificationBadgeLevel_nullUserId_returnsNone() {
        String badge = mockService.getVerificationBadgeLevel(null);

        assertEquals("none", badge, "null userId 应返回 none");
    }

    /**
     * Mock 实现：邮箱已认证（无校园认证）应返回 "email"。
     */
    @Test
    void mock_getVerificationBadgeLevel_emailVerified_returnsEmail() {
        mockService.setVerificationFlags(100L, true, false);

        String badge = mockService.getVerificationBadgeLevel(100L);

        assertEquals("email", badge, "Mock 邮箱已认证应返回 email 徽章");
    }

    /**
     * Mock 实现：身份证已认证（无校园认证、邮箱未认证）应返回 "idcard"。
     */
    @Test
    void mock_getVerificationBadgeLevel_idCardVerified_returnsIdcard() {
        mockService.setVerificationFlags(200L, false, true);

        String badge = mockService.getVerificationBadgeLevel(200L);

        assertEquals("idcard", badge, "Mock 身份证已认证应返回 idcard 徽章");
    }

    /**
     * Mock 实现：邮箱与身份证都认证时，应优先返回 email。
     */
    @Test
    void mock_getVerificationBadgeLevel_bothEmailAndIdCard_returnsEmail() {
        mockService.setVerificationFlags(300L, true, true);

        String badge = mockService.getVerificationBadgeLevel(300L);

        assertEquals("email", badge, "Mock 邮箱与身份证都认证时应优先返回 email");
    }

    /**
     * Mock 实现：校园认证 APPROVED 优先于 email/idcard 标志。
     */
    @Test
    void mock_getVerificationBadgeLevel_approvedOverridesEmailAndIdCard_returnsSchool() {
        CampusCertificationView view = mockService.submitCertification(400L, "模拟大学", "计算机系", "card.jpg");
        // 审核需使用 submitCertification 返回的 certId（idSeq 自增分配，与 userId 不一定相同）
        mockService.reviewCertification(view.getId(), "APPROVED", 999L, "通过");
        mockService.setVerificationFlags(400L, true, true);

        String badge = mockService.getVerificationBadgeLevel(400L);

        assertEquals("school", badge, "Mock 校园认证 APPROVED 应优先返回 school");
    }
}
