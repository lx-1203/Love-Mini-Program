package com.campuslove.api.repository;

import com.campuslove.api.entity.CampusCertification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 校园认证 Repository。
 * 提供基于用户ID、认证状态等条件的查询方法。
 */
public interface CampusCertificationRepository extends JpaRepository<CampusCertification, Long> {

    /**
     * 根据用户 ID 查询认证记录。
     *
     * @param userId 用户 ID
     * @return 认证记录（Optional）
     */
    Optional<CampusCertification> findByUserId(Long userId);

    /**
     * 根据认证状态查询，按提交时间降序排列。
     *
     * @param status 认证状态
     * @return 认证记录列表
     */
    List<CampusCertification> findByStatusOrderBySubmittedAtDesc(String status);

    /**
     * 查询所有认证记录，按提交时间降序排列。
     *
     * @return 认证记录列表
     */
    List<CampusCertification> findAllByOrderBySubmittedAtDesc();
}