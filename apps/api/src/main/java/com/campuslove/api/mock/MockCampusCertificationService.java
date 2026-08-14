package com.campuslove.api.mock;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.campus.CampusCertificationView;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 校园认证服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 * 模拟一个用户已提交认证并在审核中的场景。
 */
@Profile("mock")
@Service
public class MockCampusCertificationService implements CampusCertificationService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";

    /** R4-00404：模拟审核人占位 ID（mock 模式无真实审核人身份，统一使用固定占位值）。 */
    private static final Long MOCK_REVIEWER_ID = 1L;

    /** R4-00404：模拟认证审核备注（mock 演示文案，随 STATUS_APPROVED 一并写入记录）。 */
    private static final String MOCK_APPROVE_REMARK = "模拟认证：直接通过";

    private final AtomicLong idSeq = new AtomicLong(1);
    private final Map<Long, CampusCertificationView> store = new LinkedHashMap<>();

    /**
     * 用户邮箱/身份证认证标志内存存储（Phase B - Task B3.3/B3.4）。
     * key: userId；value: [emailVerified, idCardVerified]。
     * 默认空，未设置时视为 false（none 级别）。
     */
    private final Map<Long, boolean[]> verificationFlags = new LinkedHashMap<>();

    /**
     * 2026-08-09 模拟认证：运行时状态（联动 mock 用户校区 南校区/verified）。
     * 兼容单元测试直接 new 的场景，为 null 时模拟认证仅写认证记录不联动校区。
     */
    private final MockRuntimeState runtimeState;

    /** 兼容既有单元测试的无参构造器（runtimeState 为 null，联动逻辑跳过）。 */
    public MockCampusCertificationService() {
        this(null);
    }

    public MockCampusCertificationService(MockRuntimeState runtimeState) {
        this.runtimeState = runtimeState;
        // 预置一条模拟认证记录：用户 1 正在审核中
        // FIN-00039 修复：编造校名"模拟大学"改为真实存在的学校名；
        // 学生证图片 example.com 假链接改为本地 mock 资源路径（避免必 404）
        CampusCertificationView seed = new CampusCertificationView(
                idSeq.getAndIncrement(),
                1L,
                "广州大学",
                "计算机科学与技术",
                MockMediaPaths.STUDENT_CARD_1,
                STATUS_PENDING,
                "审核中",
                null,
                null,
                LocalDateTime.now(TimeZones.BUSINESS).minusDays(2),
                null
        );
        store.put(1L, seed);
    }

    @Override
    public CampusCertificationView submitCertification(Long userId, String schoolName, String major,
                                                       String studentIdCardUrl, String chsiCode,
                                                       String chsiScreenshotUrl) {
        CampusCertificationView existing = store.get(userId);
        if (existing != null) {
            String currentStatus = existing.getStatus();
            if (STATUS_PENDING.equals(currentStatus)) {
                throw new IllegalStateException(ErrorMessages.CAMPUS_CERT_PENDING);
            }
            if (STATUS_APPROVED.equals(currentStatus)) {
                throw new IllegalStateException(ErrorMessages.CAMPUS_CERT_ALREADY_DONE);
            }
            // REJECTED: 覆盖重新提交
            existing.setSchoolName(schoolName);
            existing.setMajor(major);
            existing.setStudentIdCardUrl(studentIdCardUrl);
            existing.setChsiCode(chsiCode);
            existing.setChsiScreenshotUrl(chsiScreenshotUrl);
            existing.setStatus(STATUS_PENDING);
            existing.setStatusLabel(CampusCertificationView.toStatusLabel(STATUS_PENDING));
            existing.setReviewerId(null);
            existing.setReviewComment(null);
            existing.setReviewedAt(null);
            existing.setSubmittedAt(LocalDateTime.now(TimeZones.BUSINESS));
            return existing;
        }

        CampusCertificationView view = new CampusCertificationView(
                idSeq.getAndIncrement(),
                userId,
                schoolName,
                major,
                studentIdCardUrl,
                chsiCode,
                chsiScreenshotUrl,
                STATUS_PENDING,
                CampusCertificationView.toStatusLabel(STATUS_PENDING),
                null,
                null,
                LocalDateTime.now(TimeZones.BUSINESS),
                null
        );
        store.put(userId, view);
        return view;
    }

    @Override
    public CampusCertificationView getCertificationStatus(Long userId) {
        CampusCertificationView view = store.get(userId);
        if (view != null) {
            return view;
        }
        // 未提交认证
        CampusCertificationView emptyView = new CampusCertificationView();
        emptyView.setUserId(userId);
        return emptyView;
    }

    @Override
    public CampusCertificationView reviewCertification(Long certId, String status, Long reviewerId, String reviewComment) {
        if (!STATUS_APPROVED.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new IllegalArgumentException(ErrorMessages.CAMPUS_AUDIT_RESULT_INVALID);
        }

        for (CampusCertificationView view : store.values()) {
            if (view.getId().equals(certId)) {
                if (!STATUS_PENDING.equals(view.getStatus())) {
                    throw new IllegalStateException(
                            "仅审核中状态的记录可审核，当前状态: " + view.getStatusLabel());
                }
                view.setStatus(status);
                view.setStatusLabel(CampusCertificationView.toStatusLabel(status));
                view.setReviewerId(reviewerId);
                view.setReviewComment(reviewComment);
                view.setReviewedAt(LocalDateTime.now(TimeZones.BUSINESS));
                return view;
            }
        }

        // FIN-00059 修复：原实现未找到 certId 时伪造一条审核成功记录返回，
        // 掩盖了「审核对象不存在」的事实（调用方无法区分成功与 404）。
        // 现改为抛出 IllegalArgumentException（由 GlobalExceptionHandler 转为 400/404 语义），
        // 与 real 侧「记录不存在即失败」的行为对齐。
        throw new IllegalArgumentException(ErrorMessages.CAMPUS_CERT_NOT_FOUND_PREFIX + certId);
    }

    /**
     * 模拟校园认证直接通过（P3 演示接口，2026-08-09）。
     *
     * <p>直接写入/覆盖一条 APPROVED 认证记录，并联动当前 mock 用户校区
     * （南校区 / verified，campusVerified 标志置位），演示环境可快速获得
     * 校园认证徽章与同校内容可见性。</p>
     *
     * @param userId 用户 ID
     * @return 认证视图（APPROVED）
     */
    @Override
    public CampusCertificationView simulateApprove(Long userId) {
        CampusCertificationView existing = store.get(userId);
        CampusCertificationView view;
        if (existing != null) {
            existing.setStatus(STATUS_APPROVED);
            existing.setStatusLabel(CampusCertificationView.toStatusLabel(STATUS_APPROVED));
            existing.setReviewerId(MOCK_REVIEWER_ID);
            existing.setReviewComment(MOCK_APPROVE_REMARK);
            existing.setReviewedAt(LocalDateTime.now(TimeZones.BUSINESS));
            view = existing;
        } else {
            view = new CampusCertificationView(
                    idSeq.getAndIncrement(),
                    userId,
                    "广州大学",
                    "工业设计",
                    MockMediaPaths.STUDENT_CARD_1,
                    STATUS_APPROVED,
                    CampusCertificationView.toStatusLabel(STATUS_APPROVED),
                    MOCK_REVIEWER_ID,
                    MOCK_APPROVE_REMARK,
                    LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(5),
                    LocalDateTime.now(TimeZones.BUSINESS)
            );
            store.put(userId, view);
        }
        // 联动当前 mock 用户校区（南校区 / verified，campusVerified 标志置位）
        if (runtimeState != null) {
            runtimeState.saveCampusProfile(
                    new MockRuntimeState.CampusProfileData("广州", MockDemoConstants.MOCK_CAMPUS_NAME, "工业设计", "verified"));
        }
        return view;
    }

    /**
     * 查询用户的认证徽章级别（Phase B - Task B3.3/B3.4）。
     *
     * <p>判定逻辑（优先级：school > email > idcard > none）：</p>
     * <ol>
     *   <li>从内存存储中查询用户的校园认证记录，若 status=APPROVED，则返回 "school"</li>
     *   <li>否则查询 verificationFlags 中 emailVerified 标志，true 时返回 "email"</li>
     *   <li>否则查询 verificationFlags 中 idCardVerified 标志，true 时返回 "idcard"</li>
     *   <li>否则返回 "none"</li>
     * </ol>
     *
     * @param userId 用户 ID，null 时直接返回 "none"
     * @return 徽章级别字符串（school/email/idcard/none）
     */
    @Override
    public String getVerificationBadgeLevel(Long userId) {
        if (userId == null) {
            return "none";
        }
        // 1. 校园认证 APPROVED 优先级最高
        CampusCertificationView view = store.get(userId);
        if (view != null && STATUS_APPROVED.equals(view.getStatus())) {
            return "school";
        }
        // 2. 邮箱认证次之；3. 身份证认证再次之
        boolean[] flags = verificationFlags.get(userId);
        if (flags != null) {
            if (flags.length >= 1 && flags[0]) {
                return "email";
            }
            if (flags.length >= 2 && flags[1]) {
                return "idcard";
            }
        }
        return "none";
    }

    /**
     * 设置用户的邮箱/身份证认证标志（仅供测试与 mock 场景使用）。
     *
     * @param userId        用户 ID
     * @param emailVerified 邮箱认证标志
     * @param idCardVerified 身份证认证标志
     */
    public void setVerificationFlags(Long userId, boolean emailVerified, boolean idCardVerified) {
        verificationFlags.put(userId, new boolean[]{emailVerified, idCardVerified});
    }
}
