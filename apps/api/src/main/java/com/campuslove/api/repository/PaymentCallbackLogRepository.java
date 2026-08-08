package com.campuslove.api.repository;

import com.campuslove.api.entity.PaymentCallbackLog;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 支付回调日志 Repository。
 *
 * <p>Task 12.1：BillingService 通过本 Repository 实现回调幂等性检查。
 * 收到回调时先按 notification_id 查询，若已存在则直接返回 SUCCESS 不重复处理。</p>
 *
 * <p>R4-00319：幂等键升级为 (notification_id, order_no) 双键——同 orderNo 以不同
 * notificationId 重复回调时，原单键检查会被绕过导致重复开通/顺延 VIP。</p>
 */
public interface PaymentCallbackLogRepository extends JpaRepository<PaymentCallbackLog, Long> {

    /**
     * 按微信回调通知 ID 查询日志（幂等性检查，兼容历史数据）。
     *
     * @param notificationId 微信回调通知 ID
     * @return 日志实体（若已处理过该通知则返回，否则空）
     */
    Optional<PaymentCallbackLog> findByNotificationId(String notificationId);

    /**
     * 按通知 ID + 订单号双键查询日志（R4-00319 双键幂等）。
     *
     * <p>同一 orderNo 以不同 notificationId 重复回调（攻击或微信重发场景）时，
     * 本查询仍能命中已处理记录，直接返回 SUCCESS 防止重复开通/无限顺延 VIP。</p>
     *
     * @param notificationId 微信回调通知 ID
     * @param orderNo        业务订单号
     * @return 日志实体（若已处理过该 (notificationId, orderNo) 组合则返回，否则空）
     */
    Optional<PaymentCallbackLog> findByNotificationIdAndOrderNo(String notificationId, String orderNo);
}
