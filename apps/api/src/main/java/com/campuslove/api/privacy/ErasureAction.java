package com.campuslove.api.privacy;

/**
 * 注销（账户清除）对单张表的处置决定（P0：2026-10-31 审计「注销不删除」修复）。
 *
 * <p>刻意只有四个取值，且<b>不允许</b>「保留但改写成稳定化名」这一类：化名若由 userId 派生
 * （例如历史实现写入 {@code users.phone = "1****" + userId}），任何知道 userId 的人都能反推，
 * 在 PIPL/GB/T 35273 口径下仍属可识别个人信息，不得对外宣称「已匿名」。
 * 该反例由 {@code AccountErasureServiceTest#rejectedRepresentations...} 系列断言锁定。</p>
 *
 * @see PersonalDataTable
 * @see PersonalDataTables
 */
public enum ErasureAction {

    /**
     * 整行删除。用于「数据本体就是主体个人信息、且无法律保留义务」的表
     * （资料、认证材料、会话、草稿、行为轨迹等）。删除是幂等的：第二次执行影响 0 行。
     */
    DELETE_ROWS,

    /**
     * 行保留，但把表里承载主体身份的列写成<b>常量</b>占位或 NULL（不写 userId 派生值）。
     * 用于「行本身有保留价值（第三方仍引用它、或有账务/审核留痕价值），
     * 但列里存着主体的身份文本」的表：动态（posts）、评论（comments）、
     * 审计日志（audit_log）、协议同意（user_agreement_consent）、支付订单里的 openid。
     */
    ANONYMISE_IN_PLACE,

    /**
     * 行属于<b>他人</b>，注销主体只是被引用的一方：只把指向主体的引用列抹掉
     * （SET NULL / 删除指向本人的行），不动他人的内容列。
     * 例：他人通知里 {@code source_user_id} 指向我。
     */
    INBOUND_REFERENCE_NULLIFIED,

    /**
     * 行原样保留（法定留存：会计凭证、支付对账、举报处置证据）。
     * 使用本取值<b>必须</b>在 {@link PersonalDataTable#rationale()} 里写清
     * ① 法律义务来源，② 为什么去掉身份列之后该行不再能识别主体。
     * 若表里存在自由文本/网络标识符列（remark、raw_body、openid 快照、ip），
     * 那就不是本取值，而是 {@link #ANONYMISE_IN_PLACE}。
     */
    RETAIN_STATUTORY
}
