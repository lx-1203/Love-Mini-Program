package com.campuslove.api.admin.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 审计日志注解。
 * <p>标注于管理端 Controller 方法上，由 {@link AuditLogAspect} 切面拦截，
 * 自动记录操作者、操作类型、请求信息、执行结果等并异步写入 audit_log 表。</p>
 *
 * <p>使用示例：</p>
 * <pre>{@code
 * @Auditable(value = AuditOperation.REVIEW_CERTIFICATION, targetType = "CERTIFICATION")
 * @PostMapping("/{id}/review")
 * public ResponseEntity<?> review(@PathVariable Long id, @RequestBody ReviewRequest req) { ... }
 * }</pre>
 *
 * <p>切面会自动：</p>
 * <ul>
 *   <li>从 {@link org.springframework.web.bind.annotation.PathVariable} 参数提取 targetId</li>
 *   <li>从 {@link org.springframework.web.bind.annotation.RequestBody} 参数提取并脱敏请求体</li>
 *   <li>从 SecurityContext 提取操作者 ID/用户名/角色</li>
 *   <li>从 HttpServletRequest 提取 IP、UA、URL、Method</li>
 * </ul>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {

    /**
     * 操作类型（必填）。
     */
    AuditOperation value();

    /**
     * 目标对象类型，如 USER/POST/CERTIFICATION/CONFIG 等（可空）。
     */
    String targetType() default "";

    /**
     * 操作描述（可空，预留人工阅读说明）。
     */
    String description() default "";
}
