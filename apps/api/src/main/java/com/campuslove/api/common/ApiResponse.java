package com.campuslove.api.common;

/**
 * 统一 API 响应包装类（Task 2.4.2）。
 *
 * <p>所有 Controller 方法 SHALL 返回 {@code ApiResponse<T>}（直接返回或通过
 * {@code ResponseEntity<ApiResponse<T>>}），保证响应体结构统一为：
 * <pre>{@code
 * {
 *   "code": 0,           // 0 表示成功，非 0 表示业务错误码
 *   "message": "ok",     // 人类可读消息
 *   "data": <T>,         // 业务数据载荷，可为 null
 *   "traceId": "uuid-..." // 请求追踪 ID，与 MDC + X-Trace-Id 响应头一致
 * }
 * }</pre>
 *
 * <p>设计说明：</p>
 * <ul>
 *   <li>采用 record（Java 14+，Spring Boot 3 已支持），保证不可变与序列化稳定</li>
 *   <li>{@link #SUCCESS_CODE} = 0 作为成功码约定，避免与 HTTP 状态码混淆</li>
 *   <li>{@link #traceId()} 来自 {@link org.slf4j.MDC} 的 "traceId" 字段；
 *       若 MDC 无值则降级为空字符串，由 {@link com.campuslove.api.config.TraceIdFilter}
 *       在请求入口注入</li>
 *   <li>失败响应由 {@link com.campuslove.api.config.GlobalExceptionHandler} 统一构造，
 *       不在 Controller 中手工 new</li>
 * </ul>
 *
 * @param code     业务状态码（0 表示成功）
 * @param message  人类可读消息
 * @param data     业务数据载荷
 * @param traceId  请求追踪 ID
 * @param <T>      载荷类型
 */
public record ApiResponse<T>(int code, String message, T data, String traceId) {

    /** 成功状态码：0 表示业务成功（与 HTTP 200 解耦） */
    public static final int SUCCESS_CODE = 0;

    /** 成功消息：默认 "ok"，可被 {@link #ok(String, Object)} 覆盖 */
    public static final String SUCCESS_MESSAGE = "ok";

    /**
     * 构造成功响应（默认消息 "ok"，traceId 从 MDC 读取）。
     *
     * @param data 业务数据
     * @param <T>  载荷类型
     * @return 包装后的成功响应
     */
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(SUCCESS_CODE, SUCCESS_MESSAGE, data, currentTraceId());
    }

    /**
     * 构造成功响应（自定义消息）。
     *
     * @param message 自定义成功消息
     * @param data    业务数据
     * @param <T>     载荷类型
     * @return 包装后的成功响应
     */
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(SUCCESS_CODE, message, data, currentTraceId());
    }

    /**
     * 构造成功响应（无数据载荷，仅 code/message/traceId）。
     *
     * @param <T> 载荷类型（Void）
     * @return 无数据的成功响应
     */
    public static <T> ApiResponse<T> empty() {
        return new ApiResponse<>(SUCCESS_CODE, SUCCESS_MESSAGE, null, currentTraceId());
    }

    /**
     * 构造失败响应（自定义错误码与消息）。
     *
     * @param code    业务错误码（非 0）
     * @param message 错误消息
     * @param <T>     载荷类型
     * @return 包装后的失败响应
     */
    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null, currentTraceId());
    }

    /**
     * 判断当前响应是否为成功响应。
     *
     * @return true 表示 code == {@link #SUCCESS_CODE}
     */
    public boolean isSuccess() {
        return this.code == SUCCESS_CODE;
    }

    /**
     * 从 MDC 获取当前请求的 traceId。
     *
     * <p>若 MDC 未设置 traceId（例如异步线程、单元测试），返回空字符串，
     * 避免序列化时出现 "null" 字符串。</p>
     *
     * @return 当前 traceId 或空字符串
     */
    private static String currentTraceId() {
        String traceId = org.slf4j.MDC.get("traceId");
        return traceId != null ? traceId : "";
    }
}
