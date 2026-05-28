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
}