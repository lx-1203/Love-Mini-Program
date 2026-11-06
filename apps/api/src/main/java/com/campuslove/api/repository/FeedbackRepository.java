package com.campuslove.api.repository;

import com.campuslove.api.entity.Feedback;
import com.campuslove.api.feedback.FeedbackTicketType;
import com.campuslove.api.feedback.SubmissionStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 反馈工单 Repository。
 * 提供基于用户、类型等条件的查询方法。
 */
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    /**
     * 根据用户 ID 和反馈类型查询，按创建时间降序排列。
     *
     * @param userId 用户 ID
     * @param type   反馈类型
     * @return 反馈列表
     */
    List<Feedback> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, FeedbackTicketType type);

    /**
     * 根据用户 ID 查询所有反馈，按创建时间降序排列。
     *
     * @param userId 用户 ID
     * @return 反馈列表
     */
    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 查询非指定类型的反馈（管理员查询，排除活动提案），按创建时间降序排列。
     *
     * @param type 排除的反馈类型
     * @return 反馈列表
     */
    List<Feedback> findByTypeNotOrderByCreatedAtDesc(FeedbackTicketType type);

    /**
     * 查询所有反馈，按创建时间降序排列（管理员查询全部）。
     *
     * @return 反馈列表
     */
    List<Feedback> findAllByOrderByCreatedAtDesc();

    /**
     * R17（路线图 R10 收口）：管理后台工单分页查询（WHERE+Pageable，替代全表加载内存分页）。
     *
     * <p>筛选：状态 / 类型 / 提交人校区（通过 EXISTS 子查询关联 user_campus_profile；
     * LOWER 双侧对齐既有 {@code equalsIgnoreCase} 语义；无校区资料的作者被 EXISTS 自然排除，
     * 与原内存过滤口径一致）。排序 created_at DESC 与原实现一致。</p>
     *
     * <p>{@code :param IS NULL OR ...} 可空参数模式为仓内已验证范式
     * （同 {@code MediaAssetRepository#searchForAdmin}）。</p>
     *
     * @param status     状态筛选（null 不限制）
     * @param type       类型筛选（null 不限制）
     * @param campusName 校区名筛选（null 不限制；LOWER 双侧对齐大小写不敏感语义）
     * @param pageable   分页参数
     * @return 分页结果
     */
    @Query("""
            SELECT f FROM Feedback f
            WHERE (:status IS NULL OR f.status = :status)
              AND (:type IS NULL OR f.type = :type)
              AND (:campusName IS NULL OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = f.userId AND LOWER(ucp.campusName) = LOWER(:campusName)))
            ORDER BY f.createdAt DESC
            """)
    Page<Feedback> searchForAdmin(@Param("status") SubmissionStatus status,
                                  @Param("type") FeedbackTicketType type,
                                  @Param("campusName") String campusName,
                                  Pageable pageable);
}
