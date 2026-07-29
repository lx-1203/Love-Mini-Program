package com.campuslove.api.wallet;

/**
 * 钱包余额不足异常。
 *
 * <p>Task 2（FIN-00003）+ Task 15（FIN-00171）：当用户钱包余额不足以完成扣减时抛出。</p>
 *
 * <p>使用场景：</p>
 * <ul>
 *   <li>VIP 自动续费：余额不足时，AutoRenewService 捕获本异常，写入 vip_billing_log FAILED
 *       并通过 WeChatPushService 通知用户，不向上抛出</li>
 *   <li>红包发送：余额不足时，VipRedPacketService.createRedPacket 向上抛出本异常，
 *       由 GlobalExceptionHandler 转换为 HTTP 400 响应，红包创建失败回滚</li>
 * </ul>
 *
 * <p>异常处理：GlobalExceptionHandler 将本异常映射为 HTTP 400 Bad Request，
 * 返回结构化错误信息（userId、amountCents、message），便于前端展示"余额不足，请充值"提示。</p>
 */
public class InsufficientBalanceException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** 用户 ID */
    private final Long userId;

    /** 试图扣减的金额（分） */
    private final Long amountCents;

    /** 当前余额（分，便于前端展示"余额 X，需要 Y"） */
    private final Long balanceCents;

    /**
     * 构造余额不足异常。
     *
     * @param userId       用户 ID
     * @param amountCents  试图扣减的金额（分）
     * @param balanceCents 当前余额（分）
     */
    public InsufficientBalanceException(Long userId, Long amountCents, Long balanceCents) {
        super(String.format("余额不足：userId=%d, 需要=%d 分, 当前余额=%d 分",
                userId, amountCents, balanceCents));
        this.userId = userId;
        this.amountCents = amountCents;
        this.balanceCents = balanceCents;
    }

    /**
     * 构造余额不足异常（带自定义消息）。
     *
     * @param userId       用户 ID
     * @param amountCents  试图扣减的金额（分）
     * @param balanceCents 当前余额（分）
     * @param message      自定义错误消息
     */
    public InsufficientBalanceException(Long userId, Long amountCents, Long balanceCents, String message) {
        super(message);
        this.userId = userId;
        this.amountCents = amountCents;
        this.balanceCents = balanceCents;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getAmountCents() {
        return amountCents;
    }

    public Long getBalanceCents() {
        return balanceCents;
    }
}
