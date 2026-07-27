package com.campuslove.api.ai;

/**
 * AI 服务未授权异常。
 *
 * <p>SubTask 1.4.5 新增：当调用 Agnes AI 接口返回 401 Unauthorized，
 * 或后端未配置 API Key 时抛出此异常。</p>
 *
 * <p>由 {@link com.campuslove.api.config.GlobalExceptionHandler} 捕获并转换为
 * HTTP 401 响应，返回标准化错误码 {@link #ERROR_CODE}，
 * 便于前端按错误码做精细化提示（如"AI 服务暂不可用，请稍后重试"）。</p>
 *
 * <p>继承 {@link RuntimeException} 以保持 unchecked 语义，
 * 不在业务方法签名中显式声明，符合 Spring AOP 异常传播机制。</p>
 */
public class AiApiUnauthorizedException extends RuntimeException {

    /** 序列化版本号（保持默认，未实现 Serializable 接口，仅作为预留）。 */
    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码：AI 服务未授权 */
    public static final String ERROR_CODE = "AI_API_UNAUTHORIZED";

    /** 触发场景（如"video"、"image"、"health"），用于日志与监控 */
    private final String operation;

    /**
     * 构造 AI 服务未授权异常。
     *
     * @param operation 触发场景（如"video"），用于日志
     * @param message   异常详细信息
     */
    public AiApiUnauthorizedException(String operation, String message) {
        super(message);
        this.operation = operation;
    }

    /**
     * 构造 AI 服务未授权异常（带原因）。
     *
     * @param operation 触发场景
     * @param message   异常详细信息
     * @param cause     原始异常
     */
    public AiApiUnauthorizedException(String operation, String message, Throwable cause) {
        super(message, cause);
        this.operation = operation;
    }

    /**
     * 获取触发场景。
     *
     * @return 操作名称（如"video"）
     */
    public String getOperation() {
        return operation;
    }
}
