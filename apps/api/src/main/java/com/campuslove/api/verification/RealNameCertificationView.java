package com.campuslove.api.verification;

import java.time.LocalDateTime;

/**
 * 实名认证视图（GET/POST /api/v1/real-name-certification 响应载荷）。
 *
 * <p>未提交过申请时返回 {@code id=null、status=null} 的空视图（前端映射为 unverified）。</p>
 *
 * <p>隐私说明：{@code idCardNo} 字段仅返回<b>脱敏</b>后的身份证号
 * （保留前 6 位与后 4 位，中间以 * 掩码），完整明文仅存在于后端密文存储中。</p>
 *
 * @param id               申请记录 ID（未提交为 null）
 * @param userId           申请人用户 ID
 * @param status           认证状态：PENDING / APPROVED / REJECTED（未提交为 null）
 * @param userName         真实姓名
 * @param idCardNo         脱敏后的身份证号（前 6 后 4，中间掩码）
 * @param idCardFrontUrl   身份证人像面（正面）照片 URL
 * @param idCardBackUrl    身份证国徽面（背面）照片 URL
 * @param reviewComment    审核意见（仅 rejected 时有值）
 * @param submittedAt      提交时间
 * @param reviewedAt       审核时间（未审核为 null）
 */
public record RealNameCertificationView(
        Long id,
        Long userId,
        String status,
        String userName,
        String idCardNo,
        String idCardFrontUrl,
        String idCardBackUrl,
        String reviewComment,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt
) {

    /**
     * 从实体构造视图。
     *
     * @param entity       申请实体
     * @param maskedIdCard 脱敏后的身份证号（服务层已解密并掩码）
     * @return 视图
     */
    public static RealNameCertificationView from(RealNameCertification entity, String maskedIdCard) {
        return new RealNameCertificationView(
                entity.getId(),
                entity.getUserId(),
                entity.getStatus(),
                entity.getUserName(),
                maskedIdCard,
                entity.getIdCardFrontUrl(),
                entity.getIdCardBackUrl(),
                entity.getReviewComment(),
                entity.getSubmittedAt(),
                entity.getReviewedAt()
        );
    }

    /**
     * 构造未提交申请的空视图（前端映射为 unverified）。
     *
     * @return 空视图（status 为 null）
     */
    public static RealNameCertificationView empty() {
        return new RealNameCertificationView(null, null, null, null, null, null, null, null, null, null);
    }

    /**
     * 身份证号脱敏：保留前 6 位与后 4 位，中间以 * 掩码。
     * 长度不足 10 位时仅保留首尾各 1 位（防御性兜底，正常数据不会触发）。
     * 供 real/mock 服务与管理后台列表共用，保证视图脱敏口径一致。
     *
     * @param plain 明文身份证号（可为空）
     * @return 脱敏后的身份证号；空输入返回空串
     */
    public static String maskIdCardNo(String plain) {
        if (plain == null || plain.isEmpty()) {
            return "";
        }
        if (plain.length() <= 10) {
            return plain.charAt(0) + "****" + plain.charAt(plain.length() - 1);
        }
        int maskLen = plain.length() - 10;
        return plain.substring(0, 6) + "*".repeat(maskLen) + plain.substring(plain.length() - 4);
    }
}
