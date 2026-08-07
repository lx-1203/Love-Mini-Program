package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 前端错误上报实体，对应 error_reports 表。
 *
 * <p>mp-weixin 端无法使用 Sentry SDK，客户端通过 POST /api/v1/error-reports
 * 将异常（消息/堆栈/脱敏上下文）上报到本表聚合，供事后排查。</p>
 *
 * <p>设计说明：</p>
 * <ul>
 *   <li>append-only 日志表，无更新/删除场景，故不引入乐观锁 version 列；</li>
 *   <li>context 以 JSON 字符串存储（客户端上报前已做敏感字段脱敏与截断）；</li>
 *   <li>createdAt 由服务端审计写入，不信任客户端时间戳（客户端 payload 中
 *       的 timestamp 字段仅作展示参考，落库统一用服务端时间）。</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "error_reports")
public class ErrorReport {

    /** 主键 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 错误消息（客户端截断至 2000 字符） */
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    /** 错误堆栈（客户端截断至 8000 字符） */
    @Column(name = "stack", columnDefinition = "LONGTEXT")
    private String stack;

    /** 错误名称（如 EnhancedApiError / TypeError） */
    @Column(name = "name", length = 128)
    private String name;

    /** 上报上下文（JSON 字符串，客户端已脱敏） */
    @Column(name = "context", columnDefinition = "LONGTEXT")
    private String context;

    /** 上报平台：mp-weixin / h5 */
    @Column(name = "platform", length = 32)
    private String platform;

    /** 服务端接收时间 */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ErrorReport() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStack() {
        return stack;
    }

    public void setStack(String stack) {
        this.stack = stack;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContext() {
        return context;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
