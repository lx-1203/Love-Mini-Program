package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 图片内容安全检测异常（imgSecCheck）。
 *
 * <p>触发场景：微信 imgSecCheck 检测到上传图片包含违规内容（errcode=87014）时，
 * 由 {@code WeChatImgSecCheckService} 抛出，{@code LocalMediaStorageService}
 * 在图片落盘前拦截，拒绝存储。</p>
 *
 * <p>由 {@link com.campuslove.api.config.GlobalExceptionHandler} 统一映射为
 * HTTP 400 Bad Request + 业务错误码 {@code CONTENT_SECURITY}。</p>
 */
public class ContentSecurityException extends BusinessException {

    /** 标准化业务错误码：内容安全违规 */
    public static final String ERROR_CODE = "CONTENT_SECURITY";

    public ContentSecurityException(String message) {
        super(HttpStatus.BAD_REQUEST, ERROR_CODE, message);
    }
}
