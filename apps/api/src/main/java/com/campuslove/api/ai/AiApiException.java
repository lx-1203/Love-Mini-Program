package com.campuslove.api.ai;

import org.springframework.http.HttpStatusCode;

/**
 * AI 服务上游异常（非 401）。
 *
 * <p>SubTask 1.4.5 新增：当 Agnes AI 返回 4xx（非 401）/5xx，
 * 或调用过程中发生网络异常时抛出此异常。</p>
 *
 * <p>由 {@link com.campuslove.api.config.GlobalExceptionHandler} 捕获并转换为
 * HTTP 502 Bad Gateway 响应，返回标准化错误码 {@link #ERROR_CODE}，
 * 便于前端按错误码做精细化提示（如"AI 服务暂时不可用，请稍后重试"）。</p>
 *
 * <p>响应体不向上游响应体透传给前端，避免泄露 Agnes AI 内部错误细节。
 * 上游响应体仅记录在服务端日志中。</p>
 *
 * <p>继承 {@link RuntimeException} 以保持 unchecked 语义，
 * 不在业务方法签名中显式声明，符合 Spring AOP 异常传播机制。</p>
 */
public class AiApiException extends RuntimeException {

    /** 序列化版本号（保持默认，未实现 Serializable 接口，仅作为预留）。 */
    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码：AI 服务上游异常 */
    public static final String ERROR_CODE = "AI_API_ERROR";

    /** 触发场景（如"video"、"image"、"health"），用于日志与监控 */
    private final String operation;

    /** 上游 Agnes AI 的原始响应体（仅用于服务端日志，不透传给前端） */
    private final String upstreamBody;

    /**
     * 构造 AI 服务上游异常。
     *
     * @param operation    触发场景（如"video"），用于日志
     * @param message      异常详细信息
     * @param upstreamBody 上游响应体（可为 null）
     * @param cause        原始异常
     */
    public AiApiException(String operation, String message, String upstreamBody, Throwable cause) {
        super(message, cause);
        this.operation = operation;
        this.upstreamBody = upstreamBody;
    }

    /**
     * 获取触发场景。
     *
     * @return 操作名称（如"video"）
     */
    public String getOperation() {
        return operation;
    }

    /**
     * 获取上游 Agnes AI 的原始响应体。
     *
     * @return 上游响应体（可能为 null）
     */
    public String getUpstreamBody() {
        return upstreamBody;
    }

    /**
     * 获取 HTTP 状态码。
     *
     * @return 始终返回 502 Bad Gateway
     */
    public HttpStatusCode getHttpStatus() {
        return HttpStatusCode.valueOf(502);
    }
}
