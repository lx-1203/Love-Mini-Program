package com.campuslove.api.dto;

import java.time.Instant;

/**
 * 通用 DTO 基类。
 *
 * <p>所有实体映射型 DTO（{@link UserDto}、{@link PostDto} 等）均继承此类，
 * 统一携带审计时间字段，便于客户端展示与排序。</p>
 *
 * <p><strong>时间类型选择：</strong>
 * 使用 {@link Instant}（UTC 时间戳）而非 {@link java.time.LocalDateTime}，
 * 原因有二：
 * <ol>
 *   <li>UTC 时间戳在跨时区场景下无歧义，前端可按本地时区自由格式化。</li>
 *   <li>避免 Entity 层 LocalDateTime 与 DTO 层时间类型混用导致的序列化歧义
 *      （Jackson 默认将 Instant 序列化为 epoch 毫秒，LocalDateTime 序列化为数组）。</li>
 * </ol>
 * Entity 层使用 LocalDateTime（数据库本地时间），由 {@link DtoMapper} 负责转换。</p>
 *
 * @since 2026-07-26
 */
public abstract class BaseDto {

    /** 创建时间（UTC），对应 Entity 的 created_at 字段 */
    private Instant createdAt;

    /** 最近更新时间（UTC），对应 Entity 的 updated_at 字段 */
    private Instant updatedAt;

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
