package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 审计日志实体，对应 audit_log 表。
 * 由 AOP 切面异步写入，记录管理端关键操作。
 */
@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 操作者用户ID */
    @Column(name = "operator_id", nullable = false)
    private Long operatorId;

    /** 操作者用户名 */
    @Column(name = "operator_username", nullable = false, length = 64)
    private String operatorUsername;

    /** 操作者角色（ADMIN/USER） */
    @Column(name = "operator_role", nullable = false, length = 16)
    private String operatorRole;

    /** 操作类型（如 AUDIT_POST、DISABLE_USER） */
    @Column(name = "operation", nullable = false, length = 64)
    private String operation;

    /** 目标对象类型 */
    @Column(name = "target_type", length = 32)
    private String targetType;

    /** 目标对象ID */
    @Column(name = "target_id", length = 64)
    private String targetId;

    /** HTTP方法 */
    @Column(name = "request_method", length = 8)
    private String requestMethod;

    /** 请求URL */
    @Column(name = "request_url", length = 256)
    private String requestUrl;

    /** 请求体（脱敏后） */
    @Column(name = "request_body", columnDefinition = "TEXT")
    private String requestBody;

    /** 响应状态码 */
    @Column(name = "response_status")
    private Integer responseStatus;

    /** 错误信息 */
    @Column(name = "error_message", length = 512)
    private String errorMessage;

    /** 操作者IP */
    @Column(name = "ip", length = 64)
    private String ip;

    /** User-Agent */
    @Column(name = "user_agent", length = 256)
    private String userAgent;

    /** 耗时毫秒 */
    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public AuditLog() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOperatorId() {
        return operatorId;
    }

    public void setOperatorId(Long operatorId) {
        this.operatorId = operatorId;
    }

    public String getOperatorUsername() {
        return operatorUsername;
    }

    public void setOperatorUsername(String operatorUsername) {
        this.operatorUsername = operatorUsername;
    }

    public String getOperatorRole() {
        return operatorRole;
    }

    public void setOperatorRole(String operatorRole) {
        this.operatorRole = operatorRole;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public String getRequestMethod() {
        return requestMethod;
    }

    public void setRequestMethod(String requestMethod) {
        this.requestMethod = requestMethod;
    }

    public String getRequestUrl() {
        return requestUrl;
    }

    public void setRequestUrl(String requestUrl) {
        this.requestUrl = requestUrl;
    }

    public String getRequestBody() {
        return requestBody;
    }

    public void setRequestBody(String requestBody) {
        this.requestBody = requestBody;
    }

    public Integer getResponseStatus() {
        return responseStatus;
    }

    public void setResponseStatus(Integer responseStatus) {
        this.responseStatus = responseStatus;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public Long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(Long durationMs) {
        this.durationMs = durationMs;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
