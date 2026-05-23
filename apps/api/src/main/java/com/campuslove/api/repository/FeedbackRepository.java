package com.campuslove.api.repository;

import com.campuslove.api.entity.Feedback;
import com.campuslove.api.feedback.FeedbackTicketType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
