package com.campuslove.api.service;

import com.campuslove.api.repository.VerificationRepository;
import com.campuslove.api.repository.VerificationRepository.VerificationRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;

/**
 * 学生身份认证服务。
 * 仅在 DataSource 可用时创建（db profile）。
 */
@Service
@ConditionalOnBean(DataSource.class)
public class VerificationService {

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

    private final VerificationRepository verificationRepository;

    public VerificationService(VerificationRepository verificationRepository) {
        this.verificationRepository = verificationRepository;
    }

    /**
     * 提交学生证认证申请。
     */
    public VerificationRecord submitVerification(Long userId, String studentId, String imagePath) {
        log.info("Verification submitted: userId={}, studentId={}", userId, studentId);
        return verificationRepository.insert(userId, studentId, imagePath);
    }

    /**
     * 查询当前用户的最新认证状态。
     */
    public VerificationRecord getStatus(Long userId) {
        return verificationRepository.findLatestByUserId(userId).orElse(null);
    }
}