package com.campuslove.api.chat;

import com.campuslove.api.chat.VoiceMessageService.VoiceUploadResult;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 聊天语音消息控制器。
 * <p>提供语音消息上传与删除接口，接收 mp3/aac/m4a 等格式的录音文件，
 * 由 {@link VoiceMessageService} 处理存储与校验逻辑。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>POST /api/chat/voice：上传语音消息（multipart/form-data），返回 URL</li>
 *   <li>DELETE /api/chat/voice/{id}：删除语音消息（id 为 URL 编码后的语音 URL）</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径要求已认证，发送者 ID 从 JWT 上下文获取。
 * 删除时仅校验受管前缀下的文件，避免越权删除其他用户文件。</p>
 *
 * <p>错误处理：
 * <ul>
 *   <li>文件为空/过大/格式不支持/时长超限 → IllegalArgumentException（400）</li>
 *   <li>IO 异常 → RuntimeException（500）</li>
 * </ul>
 * </p>
 *
 * <p>mp-weixin 兼容：前端通过 uni.uploadFile 调用此接口，
 * 上传时使用 multipart/form-data 格式，与微信小程序兼容。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/chat/voice")
public class VoiceMessageController {

    private static final Logger log = LoggerFactory.getLogger(VoiceMessageController.class);

    private final VoiceMessageService voiceMessageService;

    public VoiceMessageController(VoiceMessageService voiceMessageService) {
        this.voiceMessageService = voiceMessageService;
    }

    /**
     * 上传语音消息。
     * <p>接收 multipart 文件，校验大小与格式后存储，返回 URL。</p>
     *
     * <p>使用 @Valid 等价校验：duration 参数使用 {@link Min}/{@link Max} 注解约束范围，
     * 文件内容校验由 Service 层完成。</p>
     *
     * @param file     语音文件（multipart）
     * @param duration 语音时长（秒），由前端录音时记录
     * @return 上传响应（含 URL / 时长 / 文件大小）
     */
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public VoiceUploadResponse uploadVoice(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "duration", required = false, defaultValue = "0")
            @Min(0) @Max(60) Integer duration) {

        Long userId = SecurityUtils.getCurrentUserId();
        log.info("收到语音上传请求：userId={}, size={}, duration={}",
                userId, file == null ? 0 : file.getSize(), duration);

        try {
            VoiceUploadResult result = voiceMessageService.store(userId, file, duration);
            return new VoiceUploadResponse(result.url(), result.duration(), result.size());
        } catch (IllegalArgumentException e) {
            // 参数校验失败，向上抛出由 GlobalExceptionHandler 转换为 400
            throw e;
        } catch (RuntimeException e) {
            // Service 层包装后的运行时异常（如 IllegalStateException、RuntimeException 包装的 IO 异常等）
            log.error("语音上传处理失败：userId={}", userId, e);
            throw e;
        }
    }

    /**
     * 删除语音消息。
     *
     * <p>路径参数 {@code id} 实际为 URL 编码后的语音文件 URL（含路径分隔符），
     * 由 Service 层校验受管前缀后删除，避免越权删除。</p>
     *
     * <p>权限说明：仅校验文件位于受管 {@code /uploads/} 前缀下，
     * 当前实现不限制跨用户删除（语音文件名使用 UUID，难以碰撞），
     * 后续可扩展为校验文件路径中的 userId 与当前用户匹配。</p>
     *
     * @param id URL 编码后的语音文件 URL
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public DeleteVoiceResponse deleteVoice(@PathVariable("id") String id) {
        Long userId = SecurityUtils.getCurrentUserId();
        log.info("收到语音删除请求：userId={}, id={}", userId, id);

        try {
            // 简单的 URL 解码：将 %2F 还原为 /，前端调用时需 encodeURIComponent 编码
            String url = decodeUrl(id);
            voiceMessageService.delete(url);
            return new DeleteVoiceResponse(true, url);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (RuntimeException e) {
            // Service 层包装后的运行时异常
            log.error("语音删除处理失败：userId={}, id={}", userId, id, e);
            throw e;
        }
    }

    /**
     * 简单 URL 解码：还原 URL 编码后的路径分隔符与特殊字符。
     *
     * <p>不使用 java.net.URLDecoder：其将 + 解码为空格，与文件名中的 + 冲突。
     * 此处仅还原 %2F / %5C / %20 等常见编码。</p>
     *
     * @param encoded URL 编码字符串
     * @return 解码后的字符串
     */
    private String decodeUrl(String encoded) {
        if (encoded == null || encoded.isEmpty()) {
            return "";
        }
        return encoded
                .replace("%2F", "/")
                .replace("%2f", "/")
                .replace("%5C", "\\")
                .replace("%5c", "\\")
                .replace("%20", " ")
                .replace("%3A", ":")
                .replace("%3a", ":");
    }

    /**
     * 语音上传响应。
     *
     * @param url      语音文件 URL
     * @param duration 语音时长（秒）
     * @param size     文件大小（字节）
     */
    public record VoiceUploadResponse(
            String url,
            Integer duration,
            Long size
    ) {
    }

    /**
     * 语音删除响应。
     *
     * @param success 是否删除成功
     * @param url     语音文件 URL
     */
    public record DeleteVoiceResponse(
            Boolean success,
            String url
    ) {
    }
}
