package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 视频上传已封存异常（批次 A / A9 / ADR-17）。
 *
 * <p>触发场景：{@code upload.video.enabled=false}（封存态）时，媒体上传
 * {@code type=video} 请求在<b>落盘前</b>被 {@code LocalMediaStorageService}
 * 拒绝抛出（先校验后落盘，无文件写入）。</p>
 *
 * <p>由 GlobalExceptionHandler 统一映射为 HTTP 403 + 业务错误码
 * {@code VIDEO_UPLOAD_DISABLED}。图片/语音/背景图上传不受影响；
 * 存量视频媒体资产的访问代理不受限（封存不删除）。</p>
 */
public class VideoUploadDisabledException extends BusinessException {

    /** 标准化业务错误码：视频上传未开放 */
    public static final String ERROR_CODE = "VIDEO_UPLOAD_DISABLED";

    public VideoUploadDisabledException(String message) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message);
    }
}
