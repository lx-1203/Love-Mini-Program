package com.campuslove.api.mock;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.verification.RealNameCertificationService;
import com.campuslove.api.verification.RealNameCertificationView;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 实名认证服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 *
 * <p>与前端 real-name.vue 的 mock 分支行为保持一致：</p>
 * <ul>
 *   <li>提交后立即返回 pending（与恋爱认证 mock 分支同语义）</li>
 *   <li>查询返回内存中的申请记录；未提交时返回 status=null 空视图（前端 unverified）</li>
 *   <li>身份证号脱敏：前 6 后 4，中间掩码（与 real 视图口径一致）</li>
 * </ul>
 */
@Profile("mock")
@Service
public class MockRealNameCertificationService implements RealNameCertificationService {

    private static final Logger log = LoggerFactory.getLogger(MockRealNameCertificationService.class);

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";

    private final AtomicLong idSeq = new AtomicLong(1);
    private final Map<Long, RealNameCertificationView> store = new LinkedHashMap<>();

    /**
     * 提交实名认证申请（mock 模式：立即置为 pending）。
     * 重复提交语义与 real 一致：pending/approved 抛业务异常，rejected 覆盖重提。
     */
    @Override
    public RealNameCertificationView submit(Long userId, String userName, String idCardNo,
                                            String idCardFrontUrl, String idCardBackUrl) {
        RealNameCertificationView existing = store.get(userId);
        if (existing != null) {
            String currentStatus = existing.status();
            if (STATUS_PENDING.equals(currentStatus)) {
                throw new IllegalStateException(ErrorMessages.REAL_NAME_CERT_PENDING);
            }
            if (STATUS_APPROVED.equals(currentStatus)) {
                throw new IllegalStateException(ErrorMessages.REAL_NAME_CERT_ALREADY_DONE);
            }
            // REJECTED: 覆盖重新提交
            RealNameCertificationView replaced = new RealNameCertificationView(
                    existing.id(),
                    existing.userId(),
                    STATUS_PENDING,
                    userName,
                    RealNameCertificationView.maskIdCardNo(idCardNo),
                    idCardFrontUrl,
                    idCardBackUrl,
                    null,
                    LocalDateTime.now(TimeZones.BUSINESS),
                    null
            );
            store.put(userId, replaced);
            return replaced;
        }

        RealNameCertificationView view = new RealNameCertificationView(
                idSeq.getAndIncrement(),
                userId,
                STATUS_PENDING,
                userName,
                RealNameCertificationView.maskIdCardNo(idCardNo),
                idCardFrontUrl,
                idCardBackUrl,
                null,
                LocalDateTime.now(TimeZones.BUSINESS),
                null
        );
        store.put(userId, view);
        log.info("mock 实名认证申请已提交: userId={}", userId);
        return view;
    }

    /**
     * 查询实名认证申请与状态（mock 模式：返回内存记录或空视图）。
     */
    @Override
    public RealNameCertificationView getStatus(Long userId) {
        RealNameCertificationView view = store.get(userId);
        if (view != null) {
            return view;
        }
        return RealNameCertificationView.empty();
    }

    /**
     * 审核实名认证申请（mock 模式：直接置位内存状态）。
     * 审核为 APPROVED 时置位用户的 idCardVerified 内存标志（校园认证 mock 前置门槛）。
     */
    @Override
    public RealNameCertificationView review(Long certId, String status, Long reviewerId, String reviewComment) {
        if (!STATUS_APPROVED.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new IllegalArgumentException(ErrorMessages.CAMPUS_AUDIT_RESULT_INVALID);
        }
        for (Map.Entry<Long, RealNameCertificationView> e : store.entrySet()) {
            RealNameCertificationView view = e.getValue();
            if (view.id().equals(certId)) {
                if (!STATUS_PENDING.equals(view.status())) {
                    throw new IllegalStateException(
                            "仅审核中状态的记录可审核，当前状态: " + view.status());
                }
                RealNameCertificationView updated = new RealNameCertificationView(
                        view.id(),
                        view.userId(),
                        status,
                        view.userName(),
                        view.idCardNo(),
                        view.idCardFrontUrl(),
                        view.idCardBackUrl(),
                        reviewComment,
                        view.submittedAt(),
                        LocalDateTime.now(TimeZones.BUSINESS)
                );
                store.put(e.getKey(), updated);
                return updated;
            }
        }
        throw new IllegalArgumentException(ErrorMessages.REAL_NAME_CERT_NOT_FOUND_PREFIX + certId);
    }
}
