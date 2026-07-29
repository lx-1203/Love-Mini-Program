package com.campuslove.api.repository;

import com.campuslove.api.entity.PaymentCallbackLog;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 支付回调日志 Repository。
 *
 * <p>Task 12.1：BillingService 通过本 Repository 实现回调幂等性检查。
 * 收到回调时先按 notification_id 查询，若已存在则直接返回 SUCCESS 不重复处理。</p>
 */
public interface PaymentCallbackLogRepository extends JpaRepository<PaymentCallbackLog, Long> {

    /**
     * 按微信回调通知 ID 查询日志（幂等性检查）。
     *
     * @param notificationId 微信回调通知 ID
     * @return 日志实体（若已处理过该通知则返回，否则空）
     */
    Optional<PaymentCallbackLog> findByNotificationId(String notificationId);
}
