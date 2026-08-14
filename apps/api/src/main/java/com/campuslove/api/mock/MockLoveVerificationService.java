package com.campuslove.api.mock;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.verification.LoveVerificationService;
import com.campuslove.api.verification.LoveVerificationView;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 恋爱认证服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 *
 * <p>与前端 verification/index.vue 的 mock 分支行为保持一致：</p>
 * <ul>
 *   <li>提交后立即返回 pending（前端 submitVerification 1s 后置为 pending）</li>
 *   <li>查询返回内存中的申请记录；未提交时返回 status=null 空视图（前端 unverified）</li>
 *   <li>前端 mock 分支的「模拟审核通过」为纯本地行为（simulateApprove 不请求后端），
 *       故 Mock 侧无需额外提供模拟审核端点；如需联调可复用本类的置位入口</li>
 * </ul>
 */
@Profile("mock")
@Service
public class MockLoveVerificationService implements LoveVerificationService {

    private static final Logger log = LoggerFactory.getLogger(MockLoveVerificationService.class);

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";

    private final AtomicLong idSeq = new AtomicLong(1);
    private final Map<Long, LoveVerificationView> store = new LinkedHashMap<>();

    /**
     * 提交恋爱认证申请（mock 模式：立即置为 pending）。
     * 重复提交语义与 real 一致：pending/approved 抛业务异常，rejected 覆盖重提。
     */
    @Override
    public LoveVerificationView submit(Long userId, String studentName, String studentId,
                                       String schoolName, String studentIdCardUrl) {
        LoveVerificationView existing = store.get(userId);
        if (existing != null) {
            String currentStatus = existing.status();
            if (STATUS_PENDING.equals(currentStatus)) {
                throw new IllegalStateException(ErrorMessages.LOVE_CERT_PENDING);
            }
            if (STATUS_APPROVED.equals(currentStatus)) {
                throw new IllegalStateException(ErrorMessages.LOVE_CERT_ALREADY_DONE);
            }
            // REJECTED: 覆盖重新提交
            LoveVerificationView replaced = new LoveVerificationView(
                    existing.id(),
                    STATUS_PENDING,
                    studentName,
                    studentId,
                    schoolName,
                    studentIdCardUrl,
                    null,
                    LocalDateTime.now(TimeZones.BUSINESS),
                    null
            );
            store.put(userId, replaced);
            return replaced;
        }

        LoveVerificationView view = new LoveVerificationView(
                idSeq.getAndIncrement(),
                STATUS_PENDING,
                studentName,
                studentId,
                schoolName,
                studentIdCardUrl,
                null,
                LocalDateTime.now(TimeZones.BUSINESS),
                null
        );
        store.put(userId, view);
        log.info("mock 恋爱认证申请已提交: userId={}", userId);
        return view;
    }

    /**
     * 查询恋爱认证申请与状态（mock 模式：返回内存记录或空视图）。
     */
    @Override
    public LoveVerificationView getStatus(Long userId) {
        LoveVerificationView view = store.get(userId);
        if (view != null) {
            return view;
        }
        return LoveVerificationView.empty();
    }

    /**
     * 模拟审核通过（mock 演示辅助，与前端 simulateApprove 语义对齐）。
     *
     * <p>前端 verification/index.vue 的「模拟审核通过」按钮为纯本地行为；
     * 本方法供演示/联调脚本直接置位内存状态，使 GET /api/v1/verification
     * 返回 approved，与前端 mock 分支「status=verified」展示一致。</p>
     *
     * @param userId 用户 ID
     * @return approved 视图
     */
    public LoveVerificationView simulateApprove(Long userId) {
        LoveVerificationView existing = store.get(userId);
        LoveVerificationView view;
        if (existing != null) {
            view = new LoveVerificationView(
                    existing.id(),
                    STATUS_APPROVED,
                    existing.studentName(),
                    existing.studentId(),
                    existing.schoolName(),
                    existing.studentIdCardUrl(),
                    null,
                    existing.submittedAt(),
                    LocalDateTime.now(TimeZones.BUSINESS)
            );
        } else {
            view = new LoveVerificationView(
                    idSeq.getAndIncrement(),
                    STATUS_APPROVED,
                    "体验用户",
                    "20260001",
                    "广州大学",
                    MockMediaPaths.STUDENT_CARD_1,
                    null,
                    LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(5),
                    LocalDateTime.now(TimeZones.BUSINESS)
            );
        }
        store.put(userId, view);
        return view;
    }
}
