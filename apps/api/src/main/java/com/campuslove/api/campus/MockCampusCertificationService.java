package com.campuslove.api.campus;

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

    private final AtomicLong idSeq = new AtomicLong(1);
    private final Map<Long, CampusCertificationView> store = new LinkedHashMap<>();

    /**
     * 用户邮箱/身份证认证标志内存存储（Phase B - Task B3.3/B3.4）。
     * key: userId；value: [emailVerified, idCardVerified]。
     * 默认空，未设置时视为 false（none 级别）。
     */
    private final Map<Long, boolean[]> verificationFlags = new LinkedHashMap<>();

    public MockCampusCertificationService() {
        // 预置一条模拟认证记录：用户 1 正在审核中
        CampusCertificationView seed = new CampusCertificationView(
                idSeq.getAndIncrement(),
                1L,
                "模拟大学",
                "计算机科学与技术",
                "https://example.com/student-card-1.jpg",
                STATUS_PENDING,
                "审核中",
                null,
                null,
                LocalDateTime.now().minusDays(2),
                null
        );
        store.put(1L, seed);
    }

    @Override
    public CampusCertificationView submitCertification(Long userId, String schoolName, String major, String studentIdCardUrl) {
        CampusCertificationView existing = store.get(userId);
        if (existing != null) {
            String currentStatus = existing.getStatus();
            if (STATUS_PENDING.equals(currentStatus)) {
                throw new IllegalStateException("您的校园认证正在审核中，请耐心等待");
            }
            if (STATUS_APPROVED.equals(currentStatus)) {
                throw new IllegalStateException("您已完成校园认证，无需重复提交");
            }
            // REJECTED: 覆盖重新提交
            existing.setSchoolName(schoolName);
            existing.setMajor(major);
            existing.setStudentIdCardUrl(studentIdCardUrl);
            existing.setStatus(STATUS_PENDING);
            existing.setStatusLabel(CampusCertificationView.toStatusLabel(STATUS_PENDING));
            existing.setReviewerId(null);
            existing.setReviewComment(null);
            existing.setReviewedAt(null);
            existing.setSubmittedAt(LocalDateTime.now());
            return existing;
        }

        CampusCertificationView view = new CampusCertificationView(
                idSeq.getAndIncrement(),
                userId,
                schoolName,
                major,
                studentIdCardUrl,
                STATUS_PENDING,
                CampusCertificationView.toStatusLabel(STATUS_PENDING),
                null,
                null,
                LocalDateTime.now(),
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
            throw new IllegalArgumentException("审核结果无效，仅支持 APPROVED 或 REJECTED");
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
                view.setReviewedAt(LocalDateTime.now());
                return view;
            }
        }

        // 未找到对应 certId，创建模拟审核结果返回
        CampusCertificationView result = new CampusCertificationView(
                certId,
                999L,
                "模拟大学",
                "计算机科学与技术",
                "https://example.com/student-card-999.jpg",
                status,
                CampusCertificationView.toStatusLabel(status),
                reviewerId,
                reviewComment,
                LocalDateTime.now().minusDays(3),
                LocalDateTime.now()
        );
        return result;
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