package com.campuslove.api.repository;

import com.campuslove.api.entity.VipOrder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * VIP 微信支付订单 Repository。
 *
 * <p>核心查询：按订单号取单（回调幂等与状态机判定入口）、
 * 按状态+过期时间扫描超时订单（定时关单）。</p>
 */
public interface VipOrderRepository extends JpaRepository<VipOrder, Long> {

    /**
     * 按商户订单号查询订单（回调处理入口）。
     *
     * @param orderNo 商户订单号
     * @return 订单实体（可选）
     */
    Optional<VipOrder> findByOrderNo(String orderNo);

    /**
     * 按用户 + 订单号查询（订单状态查询接口，校验归属）。
     *
     * @param userId  用户 ID
     * @param orderNo 商户订单号
     * @return 订单实体（可选）
     */
    Optional<VipOrder> findByUserIdAndOrderNo(Long userId, String orderNo);

    /**
     * 扫描指定状态下已过期的订单（定时关单）。
     *
     * @param statuses 状态列表（PENDING / PAYING）
     * @param now      当前时间（expire_at 早于该时间即超时）
     * @return 超时订单列表
     */
    List<VipOrder> findByStatusInAndExpireAtBefore(List<String> statuses, LocalDateTime now);
}
