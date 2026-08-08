package com.campuslove.api.config;

import com.campuslove.api.admin.auth.AdminAuthException;
import com.campuslove.api.admin.auth.AdminDisabledException;
import com.campuslove.api.admin.auth.AdminNotFoundException;
import com.campuslove.api.admin.auth.InvalidCredentialsException;
import com.campuslove.api.ai.AiApiException;
import com.campuslove.api.ai.AiApiUnauthorizedException;
import com.campuslove.api.auth.InvalidTokenException;
import com.campuslove.api.auth.TokenRevokedException;
import com.campuslove.api.auth.WechatLoginException;
import com.campuslove.api.common.BusinessException;
import com.campuslove.api.common.DailyLimitExceededException;
import com.campuslove.api.media.MediaSizeLimitExceededException;
import com.campuslove.api.ratelimit.RateLimitExceededException;
import com.campuslove.api.wallet.InsufficientBalanceException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

/**
 * 全局异常处理器。
 * 统一处理各类异常，返回标准化的错误响应格式。
 * 错误响应格式: { "error": string, "message": string, "status": int }
 *
 * <p>Task 11.4 生产脱敏：
 * <ul>
 *   <li>通用未捕获异常（{@link #handleGenericException(Exception)}）在生产 profile
 *       （{@code spring.profiles.active} 含 {@code prod} 或 {@code real}）下仅返回
 *       {@code code}/{@code message}/{@code traceId}/{@code timestamp} 四个字段，
 *       不返回异常类名/堆栈/根因消息，避免攻击者探测内部结构</li>
 *   <li>堆栈写入日志：{@code log.error("Unhandled exception [traceId={}]", traceId, e)}</li>
 *   <li>开发 profile（{@code dev}/{@code local}/{@code mock}）下追加 {@code detail} 字段，
 *       包含异常类名与根因消息，辅助本地调试</li>
 *   <li>业务异常（{@link BusinessException} 及子类）已被业务侧精心设计为面向终端用户的安全消息，
 *       透传 message 不视为泄露</li>
 * </ul>
 * </p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Task 11.4：当前激活的 Spring profile，用于区分生产/开发脱敏策略。
     *
     * <p>注入 {@code spring.profiles.active}，未设置时默认 {@code dev}。
     * 包含 {@code prod} 或 {@code real} 视为生产 profile；其他视为开发 profile。</p>
     */
    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    /**
     * Task 11.4：判断当前是否为生产 profile（{@code prod} 或 {@code real}）。
     *
     * @return true 表示当前为生产环境，需脱敏
     */
    private boolean isProductionProfile() {
        if (activeProfile == null) {
            return false;
        }
        return activeProfile.contains("prod") || activeProfile.contains("real");
    }

    /**
     * 处理请求参数校验异常。
     * 当 @Valid 注解校验失败时触发，返回 400 Bad Request。
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("请求参数校验失败");

        log.warn("参数校验失败: {}", errorMessage);
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Validation Failed", errorMessage);
    }

    /**
     * 处理 401 Unauthorized 异常。
     * 当 HttpClientErrorException.Unauthorized 抛出时触发。
     */
    @ExceptionHandler(HttpClientErrorException.Unauthorized.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(
            HttpClientErrorException.Unauthorized ex) {
        log.warn("未授权访问: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Unauthorized",
                ex.getStatusText() != null ? ex.getStatusText() : "未认证的用户请求，请先登录");
    }

    /**
     * 处理非法参数异常。
     * 当业务逻辑校验失败时触发，返回 400 Bad Request。
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex) {
        log.warn("非法参数: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    /**
     * 处理钱包余额不足异常（Task 2 / Task 15）。
     *
     * <p>触发场景：</p>
     * <ul>
     *   <li>VIP 自动续费（{@link com.campuslove.api.vip.AutoRenewService#renewVip}）：
     *       内部已捕获并写 FAILED 流水，不会进入本 handler；但若未来有其他钱包扣减场景
     *       未捕获抛出，本 handler 作为兜底返回 400 响应</li>
     * </ul>
     *
     * <p>响应体格式（含业务错误码，不含余额明细——infra R2-00230: 精简响应避免回显
     * userId/金额/余额等字段放大攻击面，金额明细仅记录在服务端日志）：
     * <pre>{@code
     * {
     *   "error": "Bad Request",
     *   "message": "余额不足",
     *   "status": 400,
     *   "code": "INSUFFICIENT_BALANCE"
     * }
     * }</pre>
     *
     * @param ex 余额不足异常
     * @return 标准化的 400 错误响应（含 INSUFFICIENT_BALANCE 错误码）
     */
    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientBalance(
            InsufficientBalanceException ex) {
        log.warn("钱包余额不足: userId={}, 需要={}, 当前余额={}",
                ex.getUserId(), ex.getAmountCents(), ex.getBalanceCents());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "Bad Request");
        body.put("message", "余额不足");
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("code", "INSUFFICIENT_BALANCE");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * 处理媒体文件大小超限异常。
     * 当上传的图片或视频超过规定大小时触发，返回 413 Payload Too Large。
     */
    @ExceptionHandler(MediaSizeLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMediaSizeLimitExceeded(
            MediaSizeLimitExceededException ex) {
        log.warn("媒体文件大小超限: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.PAYLOAD_TOO_LARGE, "Payload Too Large",
                ex.getMessage());
    }

    /**
     * 处理访问拒绝异常。
     * 当用户无权限访问资源时触发，返回 403 Forbidden。
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            AccessDeniedException ex) {
        log.warn("访问被拒绝: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Forbidden", "您没有权限执行此操作");
    }

    /**
     * 处理管理员账号已被禁用异常。
     * <p>触发场景：登录时 {@code User.status='disabled'}。
     * 返回 HTTP 403 Forbidden 与标准化错误码 {@code ADMIN_DISABLED}，
     * 供前端展示"账号已被禁用"提示。</p>
     *
     * <p>Task 0.4.2 新增：禁用账号拒绝登录并返回明确错误码。</p>
     */
    @ExceptionHandler(AdminDisabledException.class)
    public ResponseEntity<Map<String, Object>> handleAdminDisabled(
            AdminDisabledException ex) {
        log.warn("管理员账号已被禁用: {}", ex.getMessage());
        return buildErrorResponseWithCode(
                HttpStatus.FORBIDDEN, "Forbidden", ex.getMessage(),
                AdminDisabledException.ERROR_CODE);
    }

    /**
     * 处理管理员凭据无效异常。
     * <p>触发场景：用户名/密码为空、账号不存在（防枚举统一返回）、密码错误、角色非 ADMIN。
     * 返回 HTTP 401 Unauthorized 与标准化错误码 {@code INVALID_CREDENTIALS}。</p>
     *
     * <p>Task 0.4.2 新增：登录失败返回标准化错误码，便于前端按错误码分支处理。</p>
     */
    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(
            InvalidCredentialsException ex) {
        log.warn("管理员凭据无效: {}", ex.getMessage());
        return buildErrorResponseWithCode(
                HttpStatus.UNAUTHORIZED, "Unauthorized", ex.getMessage(),
                InvalidCredentialsException.ERROR_CODE);
    }

    /**
     * 处理管理员账号不存在异常。
     * <p>触发场景：根据 username/openid 查询不到管理员账号。
     * 返回 HTTP 404 Not Found 与标准化错误码 {@code ADMIN_NOT_FOUND}。</p>
     *
     * <p>注意：为防账号枚举，生产环境通常将"账号不存在"统一为 {@link InvalidCredentialsException}。
     * 本 handler 供内部审计或显式查询场景使用。</p>
     */
    @ExceptionHandler(AdminNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleAdminNotFound(
            AdminNotFoundException ex) {
        log.warn("管理员账号不存在: {}", ex.getMessage());
        return buildErrorResponseWithCode(
                HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(),
                AdminNotFoundException.ERROR_CODE);
    }

    /**
     * 处理管理端认证业务异常基类（兜底）。
     * <p>当未匹配到具体子类 handler 时触发，返回 HTTP 401 Unauthorized 与异常自带的 errorCode。</p>
     */
    @ExceptionHandler(AdminAuthException.class)
    public ResponseEntity<Map<String, Object>> handleAdminAuth(
            AdminAuthException ex) {
        log.warn("管理端认证异常: code={}, message={}", ex.getErrorCode(), ex.getMessage());
        return buildErrorResponseWithCode(
                HttpStatus.UNAUTHORIZED, "Unauthorized", ex.getMessage(),
                ex.getErrorCode());
    }

    /**
     * 处理微信登录业务异常。
     *
     * <p>Task 0.1.2 新增：微信登录链路中 code 失效 / 微信 API 失败 / 用户被禁用
     * 等场景由 {@link WechatLoginException} 携带业务错误码抛出。本 handler 将其转换为
     * 标准化 JSON 错误响应，HTTP 状态码与错误码语义对齐：</p>
     * <ul>
     *   <li>{@code INVALID_CODE}（401）：微信 code 失效或已过期，前端应重新拉起 wx.login</li>
     *   <li>{@code WECHAT_API_ERROR}（502）：微信 API 调用失败，前端提示稍后重试</li>
     *   <li>{@code USER_DISABLED}（403）：用户被禁用，前端提示联系管理员</li>
     * </ul>
     *
     * <p>响应体在原 error/message/status 基础上追加 {@code code} 字段（业务错误码），
     * 便于前端按错误码做精细化分支处理（区别于 HTTP 状态码的粗粒度）。</p>
     *
     * @param ex 微信登录业务异常
     * @return 标准化的错误响应（包含 code 字段）
     */
    @ExceptionHandler(WechatLoginException.class)
    public ResponseEntity<Map<String, Object>> handleWechatLogin(
            WechatLoginException ex) {
        WechatLoginException.ErrorCode errorCode = ex.getErrorCode();
        HttpStatus status = ex.getStatus();
        log.warn("微信登录失败: code={}, status={}, message={}",
                errorCode.name(), status.value(), ex.getMessage());
        return buildErrorResponseWithCode(
                status,
                status.getReasonPhrase(),
                ex.getMessage(),
                errorCode.name());
    }

    /**
     * 修复：处理 javax.validation.ConstraintViolationException。
     * 当 @RequestParam / @PathVariable 上的 @NotBlank/@Min 等约束校验失败时触发，
     * 返回 400 Bad Request 并附带字段级错误信息。
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(
            ConstraintViolationException ex) {
        String errorMessage = ex.getConstraintViolations().stream()
                .map(v -> {
                    String path = v.getPropertyPath() != null ? v.getPropertyPath().toString() : "value";
                    return path + ": " + v.getMessage();
                })
                .reduce((a, b) -> a + "; " + b)
                .orElse("请求参数校验失败");
        log.warn("约束校验失败: {}", errorMessage);
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Validation Failed", errorMessage);
    }

    /**
     * 处理无效 Token 业务异常（Task 0.5.4）。
     *
     * <p>触发场景：JWT 解析失败、签名无效、已过期、格式错误或缺失。
     * 由 {@link InvalidTokenException#ERROR_CODE} 携带标准化错误码 {@code UNAUTHORIZED}。</p>
     *
     * <p>响应体格式（含 traceId，便于客户端报错时关联服务端日志）：
     * <pre>{@code
     * {
     *   "error": "Unauthorized",
     *   "message": "未认证或令牌已失效，请重新登录",
     *   "status": 401,
     *   "code": "UNAUTHORIZED",
     *   "traceId": "uuid-..."
     * }
     * }</pre>
     *
     * @param ex 无效 Token 异常
     * @return 401 + 标准 JSON 错误体
     */
    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidToken(InvalidTokenException ex) {
        String traceId = generateTraceId();
        log.warn("无效 Token: code={}, message={}, traceId={}",
                ex.getErrorCode(), ex.getMessage(), traceId);
        return buildErrorResponseWithCodeAndTraceId(
                HttpStatus.UNAUTHORIZED,
                "Unauthorized",
                "未认证或令牌已失效，请重新登录",
                ex.getErrorCode(),
                traceId);
    }

    /**
     * 处理 Token 已撤销业务异常（Task 0.5.4）。
     *
     * <p>触发场景：JWT 已被加入 Redis 黑名单（用户主动登出）后，
     * 仍尝试使用该 JWT 访问受保护资源。</p>
     *
     * <p>响应体格式（含 traceId）：
     * <pre>{@code
     * {
     *   "error": "Unauthorized",
     *   "message": "令牌已被撤销，请重新登录",
     *   "status": 401,
     *   "code": "TOKEN_REVOKED",
     *   "traceId": "uuid-..."
     * }
     * }</pre>
     *
     * <p>HTTP 状态码与 {@link InvalidTokenException} 一致（401），但通过错误码
     * {@code TOKEN_REVOKED} 区分场景，便于前端按场景提示用户重新登录。</p>
     *
     * @param ex Token 已撤销异常
     * @return 401 + 标准 JSON 错误体
     */
    @ExceptionHandler(TokenRevokedException.class)
    public ResponseEntity<Map<String, Object>> handleTokenRevoked(TokenRevokedException ex) {
        String traceId = generateTraceId();
        log.warn("Token 已撤销: code={}, message={}, traceId={}",
                ex.getErrorCode(), ex.getMessage(), traceId);
        return buildErrorResponseWithCodeAndTraceId(
                HttpStatus.UNAUTHORIZED,
                "Unauthorized",
                "令牌已被撤销，请重新登录",
                ex.getErrorCode(),
                traceId);
    }

    /**
     * 修复：处理 jakarta.persistence.EntityNotFoundException。
     * 当业务层主动抛出实体未找到异常（如查询用户/帖子不存在）时触发，
     * 返回 404 Not Found，不泄露内部细节。
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(
            EntityNotFoundException ex) {
        log.warn("实体未找到: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Not Found",
                ex.getMessage() != null ? ex.getMessage() : "请求的资源不存在");
    }

    /**
     * 修复：处理 DataIntegrityViolationException。
     * 当数据库约束冲突（唯一键、外键、非空约束等）时触发，
     * 返回 409 Conflict，不暴露具体数据库结构细节。
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex) {
        // 仅记录根因日志（不输出到响应体），防止泄露数据库结构
        log.warn("数据库完整性冲突: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.CONFLICT, "Conflict",
                "数据冲突，可能存在重复或违反约束的数据");
    }

    /**
     * 修复：处理 MaxUploadSizeExceededException。
     * 当 Spring multipart 解析器检测到上传文件超过 spring.servlet.multipart.max-file-size
     * 配置阈值时触发，返回 413 Payload Too Large。
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(
            MaxUploadSizeExceededException ex) {
        log.warn("上传文件大小超过 multipart 限制: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.PAYLOAD_TOO_LARGE, "Payload Too Large",
                "上传文件超过最大允许大小");
    }

    /**
     * 处理 Spring ResponseStatusException。
     * 将其转换为标准错误响应格式。
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(
            ResponseStatusException ex) {
        log.warn("请求错误: {} - {}", ex.getStatusCode(), ex.getReason());
        return buildErrorResponse(
                HttpStatus.valueOf(ex.getStatusCode().value()),
                "Error",
                ex.getReason() != null ? ex.getReason() : "请求错误");
    }

    /**
     * 处理速率限制超出异常。
     *
     * <p>当客户端请求触发 {@link com.campuslove.api.ratelimit.RateLimit} 注解配置的
     * 令牌桶限流策略（桶内无可用令牌）时，由 {@link com.campuslove.api.ratelimit.RateLimitAspect}
     * 抛出本异常。此处统一转换为 HTTP 429 Too Many Requests 响应，
     * 返回友好提示，避免暴露内部限流参数。</p>
     *
     * @param ex 速率限制超出异常
     * @return 标准化的 429 错误响应
     */
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleRateLimitExceeded(
            RateLimitExceededException ex) {
        log.warn("触发速率限制: {}", ex.getMessage());
        return buildErrorResponse(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too Many Requests",
                "请求过于频繁，请稍后再试");
    }

    /**
     * 处理每日限额超出异常（SubTask 1.4.4）。
     *
     * <p>触发场景：业务操作超出每日允许次数上限，例如：
     * <ul>
     *   <li>{@code RealMatchService.rewind()} 每日反悔次数已达上限（默认 1 次/天）</li>
     *   <li>未来扩展：每日点赞数上限、每日匹配次数上限等</li>
     * </ul>
     * </p>
     *
     * <p>响应体格式（含业务错误码，便于前端按错误码做精细化提示）：
     * <pre>{@code
     * {
     *   "error": "Too Many Requests",
     *   "message": "今日反悔次数已用完（上限 1 次），请明日再来",
     *   "status": 429,
     *   "code": "DAILY_LIMIT_EXCEEDED"
     * }
     * }</pre>
     *
     * <p>HTTP 状态码与 {@link RateLimitExceededException} 一致（429），
     * 但通过错误码 {@code DAILY_LIMIT_EXCEEDED} 区分场景（每日限额 vs 短时频次），
     * 便于前端按场景提示用户。</p>
     *
     * @param ex 每日限额超出异常
     * @return 标准化的 429 错误响应（含 DAILY_LIMIT_EXCEEDED 错误码）
     */
    @ExceptionHandler(DailyLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleDailyLimitExceeded(
            DailyLimitExceededException ex) {
        log.warn("每日限额超出: operation={}, limit={}, message={}",
                ex.getOperationName(), ex.getDailyLimit(), ex.getMessage());
        return buildErrorResponseWithCode(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too Many Requests",
                ex.getMessage(),
                DailyLimitExceededException.ERROR_CODE);
    }

    /**
     * 缺陷修复：处理静态资源不存在异常（未知路径）。
     *
     * <p>Spring Boot 3.2+ 对未匹配的 URL 抛
     * {@link org.springframework.web.servlet.resource.NoResourceFoundException}，
     * 原实现落入 {@link #handleGenericException(Exception)} 兜底返回 500，
     * 未知路径应返回 404 Not Found。</p>
     *
     * @param ex 资源不存在异常
     * @return 标准化的 404 错误响应
     */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        log.warn("请求的路径不存在: {}", ex.getResourcePath());
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Not Found", "请求的路径不存在");
    }

    /**
     * 缺陷修复：处理 HTTP 请求方法不支持异常。
     *
     * <p>当客户端使用错误的 HTTP 方法访问已知路径（如 GET 请求 POST 端点）时，
     * Spring MVC 抛 {@link org.springframework.web.HttpRequestMethodNotSupportedException}，
     * 原实现落入兜底返回 500，应返回 405 Method Not Allowed。</p>
     *
     * @param ex 方法不支持异常
     * @return 标准化的 405 错误响应
     */
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(
            org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        log.warn("请求方法不支持: method={}, message={}", ex.getMethod(), ex.getMessage());
        return buildErrorResponse(HttpStatus.METHOD_NOT_ALLOWED, "Method Not Allowed",
                ex.getMessage() != null ? ex.getMessage() : "请求方法不支持");
    }

    /**
     * 处理通用异常。
     * 捕获所有未处理的异常，返回 500 Internal Server Error。
     *
     * <p>Task 11.4 生产脱敏策略：
     * <ul>
     *   <li>堆栈与异常根因写入日志（含 traceId 关联）：
     *       {@code log.error("Unhandled exception [traceId={}]", traceId, ex)}</li>
     *   <li>生产 profile：响应体仅含 {@code code}/{@code message}/{@code traceId}/{@code timestamp}
     *       四个字段，不暴露异常类名/根因/堆栈</li>
     *   <li>开发 profile：追加 {@code detail} 字段（异常类名 + 根因 message），辅助本地调试</li>
     * </ul>
     * </p>
     *
     * @param ex 未捕获的异常
     * @return 500 错误响应（生产环境脱敏）
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        String traceId = generateTraceId();
        // Task 11.4：堆栈与根因写入日志（不返回响应体），通过 traceId 关联客户端报错与服务端日志
        log.error("Unhandled exception [traceId={}]", traceId, ex);
        return buildDesensitizedErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR", "服务器内部错误，请稍后重试", traceId, ex);
    }

    /**
     * 处理业务异常基类（Task 2.5.2）。
     *
     * <p>所有继承 {@link BusinessException} 的业务异常 SHALL 由本 handler 兜底处理，
     * 根据异常携带的 {@link BusinessException#getHttpStatus()} 与
     * {@link BusinessException#getErrorCode()} 构造标准化错误响应。</p>
     *
     * <p>已存在具体子类 handler 的异常（如 {@link DailyLimitExceededException}、
     * {@link com.campuslove.api.common.IdempotencyException}）由 Spring 优先匹配具体 handler，
     * 本 handler 仅作为业务异常层次的兜底，处理未显式定义 handler 的子类
     * （如 {@link com.campuslove.api.common.UserNotFoundException}、
     * {@link com.campuslove.api.common.ResourceConflictException}、
     * {@link com.campuslove.api.common.OperationForbiddenException}、
     * {@link com.campuslove.api.common.InvalidOperationException}、
     * {@link com.campuslove.api.common.ResourceNotFoundException}、
     * {@link com.campuslove.api.common.MatchAlreadyExistsException}）。</p>
     *
     * <p>响应体格式（含 traceId）：
     * <pre>{@code
     * {
     *   "error": "Not Found",
     *   "message": "用户不存在: 123",
     *   "status": 404,
     *   "code": "USER_NOT_FOUND",
     *   "traceId": "uuid-..."
     * }
     * }</pre>
     *
     * <p>生产环境策略：业务异常的消息（{@code message}）被视为对终端用户友好的提示，
     * 直接透传给前端展示；详细信息已在服务端日志中记录，不暴露堆栈。</p>
     *
     * @param ex 业务异常
     * @return 标准化的错误响应（含业务错误码与 traceId）
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessException(BusinessException ex) {
        HttpStatus status = ex.getHttpStatus();
        String errorCode = ex.getErrorCode();
        String traceId = generateTraceId();
        log.warn("业务异常: code={}, status={}, message={}, traceId={}",
                errorCode, status.value(), ex.getMessage(), traceId);
        return buildErrorResponseWithCodeAndTraceId(
                status,
                status.getReasonPhrase(),
                ex.getMessage(),
                errorCode,
                traceId);
    }

    /**
     * 处理 AI 服务未授权异常（SubTask 1.4.5）。
     *
     * <p>触发场景：</p>
     * <ul>
     *   <li>后端未配置 AGNES_API_KEY 环境变量，调用 /api/ai/** 端点时</li>
     *   <li>Agnes AI 上游接口返回 401 Unauthorized（API Key 失效或过期）</li>
     * </ul>
     *
     * <p>响应体格式（含业务错误码，便于前端按错误码做精细化提示）：
     * <pre>{@code
     * {
     *   "error": "Unauthorized",
     *   "message": "AI 服务未配置 API Key，请联系管理员补全 AGNES_API_KEY 环境变量",
     *   "status": 401,
     *   "code": "AI_API_UNAUTHORIZED"
     * }
     * }</pre>
     *
     * <p>注意：本异常与 JWT 认证 401 不同，HTTP 状态码均为 401 但错误码不同：
     * <ul>
     *   <li>{@code UNAUTHORIZED}（JWT）：用户未登录或 token 失效，需重新登录</li>
     *   <li>{@code AI_API_UNAUTHORIZED}（AI）：上游 AI 服务 API Key 问题，需联系管理员</li>
     * </ul>
     * </p>
     *
     * @param ex AI 服务未授权异常
     * @return 标准化的 401 错误响应（含 AI_API_UNAUTHORIZED 错误码）
     */
    @ExceptionHandler(AiApiUnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> handleAiApiUnauthorized(
            AiApiUnauthorizedException ex) {
        log.warn("AI 服务未授权: operation={}, message={}", ex.getOperation(), ex.getMessage());
        return buildErrorResponseWithCode(
                HttpStatus.UNAUTHORIZED,
                "Unauthorized",
                ex.getMessage(),
                AiApiUnauthorizedException.ERROR_CODE);
    }

    /**
     * 处理 AI 服务上游异常（SubTask 1.4.5）。
     *
     * <p>触发场景：Agnes AI 返回 4xx（非 401）/5xx，或网络异常。
     * 由 {@link AiApiException} 携带上游状态码与响应体抛出。</p>
     *
     * <p>响应体格式：
     * <pre>{@code
     * {
     *   "error": "Bad Gateway",
     *   "message": "AI 服务暂时不可用: 502",
     *   "status": 502,
     *   "code": "AI_API_ERROR"
     * }
     * }</pre>
     *
     * <p>不向上游响应体透传给前端，避免泄露 Agnes AI 内部错误细节。
     * 上游响应体仅记录在服务端日志中。</p>
     *
     * @param ex AI 服务上游异常
     * @return 标准化的 502 错误响应（含 AI_API_ERROR 错误码）
     */
    @ExceptionHandler(AiApiException.class)
    public ResponseEntity<Map<String, Object>> handleAiApiException(
            AiApiException ex) {
        log.warn("AI 服务上游异常: operation={}, message={}, upstreamBody={}",
                ex.getOperation(), ex.getMessage(), ex.getUpstreamBody());
        return buildErrorResponseWithCode(
                HttpStatus.BAD_GATEWAY,
                "Bad Gateway",
                ex.getMessage(),
                AiApiException.ERROR_CODE);
    }

    /**
     * 构建统一的错误响应体。
     *
     * @param status  HTTP 状态码
     * @param error   错误类型描述
     * @param message 详细错误信息
     * @return 标准化的错误响应
     */
    private ResponseEntity<Map<String, Object>> buildErrorResponse(
            HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", error);
        body.put("message", message);
        body.put("status", status.value());
        return ResponseEntity.status(status).body(body);
    }

    /**
     * 构建带标准化错误码的错误响应体。
     *
     * <p>Task 0.4.2 新增：在原错误响应基础上追加 {@code code} 字段，
     * 用于管理端登录/权限异常的标准化错误码（如 ADMIN_DISABLED、INVALID_CREDENTIALS），
     * 便于前端按错误码做精细化分支处理。</p>
     *
     * @param status    HTTP 状态码
     * @param error     错误类型描述
     * @param message   详细错误信息
     * @param errorCode 标准化错误码
     * @return 包含 code 字段的标准化错误响应
     */
    private ResponseEntity<Map<String, Object>> buildErrorResponseWithCode(
            HttpStatus status, String error, String message, String errorCode) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", error);
        body.put("message", message);
        body.put("status", status.value());
        body.put("code", errorCode);
        return ResponseEntity.status(status).body(body);
    }

    /**
     * 构建带标准化错误码与 traceId 的错误响应体。
     *
     * <p>Task 0.5.4 新增：在 {@link #buildErrorResponseWithCode} 基础上追加 {@code traceId} 字段，
     * 用于客户端报错时关联服务端日志，便于排查问题。</p>
     *
     * <p>响应体字段顺序（{@link LinkedHashMap} 保持插入顺序，便于客户端解析）：
     * {@code error} → {@code message} → {@code status} → {@code code} → {@code traceId}</p>
     *
     * @param status    HTTP 状态码
     * @param error     错误类型描述
     * @param message   详细错误信息
     * @param errorCode 标准化错误码
     * @param traceId   请求追踪 ID（UUID）
     * @return 包含 code 与 traceId 字段的标准化错误响应
     */
    private ResponseEntity<Map<String, Object>> buildErrorResponseWithCodeAndTraceId(
            HttpStatus status, String error, String message, String errorCode, String traceId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", error);
        body.put("message", message);
        body.put("status", status.value());
        body.put("code", errorCode);
        body.put("traceId", traceId);
        return ResponseEntity.status(status)
                .header("X-Trace-Id", traceId)
                .body(body);
    }

    /**
     * Task 11.4：构建生产脱敏的错误响应体。
     *
     * <p>生产 profile（{@code prod}/{@code real}）下响应体仅包含四个字段：
     * <ul>
     *   <li>{@code code}：标准化错误码（如 {@code INTERNAL_ERROR}）</li>
     *   <li>{@code message}：通用错误提示（不暴露异常类名/根因）</li>
     *   <li>{@code traceId}：请求追踪 ID，用于客户端报错时关联服务端日志</li>
     *   <li>{@code timestamp}：ISO-8601 时间戳，便于排查时间点</li>
     * </ul>
     * </p>
     *
     * <p>开发 profile 下追加 {@code detail} 字段，包含异常类名与根因 message，辅助本地调试：</p>
     * <pre>{@code
     * {
     *   "code": "INTERNAL_ERROR",
     *   "message": "服务器内部错误，请稍后重试",
     *   "traceId": "uuid-...",
     *   "timestamp": "2026-07-27T12:34:56.789Z",
     *   "detail": "NullPointerException: ..."
     * }
     * }</pre>
     *
     * <p>注：异常堆栈已在调用处通过 {@code log.error(..., ex)} 写入日志，
     * 本方法不重复打印堆栈，避免日志冗余。</p>
     *
     * @param status     HTTP 状态码
     * @param code       标准化错误码
     * @param message    通用错误提示（不暴露内部细节）
     * @param traceId    请求追踪 ID
     * @param ex         原始异常（仅开发 profile 用于提取 detail）
     * @return 生产环境脱敏 / 开发环境含 detail 的错误响应
     */
    private ResponseEntity<Map<String, Object>> buildDesensitizedErrorResponse(
            HttpStatus status, String code, String message, String traceId, Throwable ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        body.put("traceId", traceId);
        body.put("timestamp", Instant.now().toString());
        // 开发 profile 追加 detail 字段，便于本地调试
        if (!isProductionProfile() && ex != null) {
            String detail = ex.getClass().getSimpleName()
                    + (ex.getMessage() != null ? ": " + ex.getMessage() : "");
            body.put("detail", detail);
        }
        return ResponseEntity.status(status)
                .header("X-Trace-Id", traceId)
                .body(body);
    }

    /**
     * 生成 traceId（优先从 MDC 获取，否则生成新 UUID）。
     *
     * <p>Task 0.5.4 新增：用于错误响应体的 {@code traceId} 字段，
     * 便于客户端报错时关联服务端日志。</p>
     *
     * <p>Task 2.6.4 改造：优先从 {@link org.slf4j.MDC} 的 "traceId" 字段获取
     * （由 {@link TraceIdFilter} 在请求入口注入），保证错误响应中的 traceId
     * 与请求全链路日志一致；MDC 缺失时（如异步线程异常）降级为新 UUID。</p>
     *
     * @return traceId 字符串
     */
    private String generateTraceId() {
        String mdcTraceId = org.slf4j.MDC.get("traceId");
        if (mdcTraceId != null && !mdcTraceId.isBlank()) {
            return mdcTraceId;
        }
        return UUID.randomUUID().toString();
    }
}
