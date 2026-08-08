package com.campuslove.api.config;

import com.campuslove.api.common.ErrorMessages;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 内容过滤控制器。
 * <p>
 * 提供前端实时敏感词检测接口。
 * 用户在提交内容（发帖/评论/私信等）前调用此接口获取提示，
 * 服务端仍会对所有内容进行服务端过滤（替换为 ***），此接口仅用于前端实时提示。
 * </p>
 */
@RestController
public class ContentFilterController {

    /** 单次检测内容最大长度（字符），防止超大文本触发正则扫描造成 CPU 滥用 */
    private static final int MAX_CONTENT_LENGTH = 5000;

    private final SensitiveWordFilter sensitiveWordFilter;

    public ContentFilterController(SensitiveWordFilter sensitiveWordFilter) {
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    /**
     * 检查内容是否包含敏感词。
     * <p>
     * 请求体：{ "content": "待检查的内容" }
     * 响应体：{ "hasSensitiveWords": true, "filteredWords": ["赌博", "色情"] }
     * </p>
     *
     * @param body 包含 content 字段的请求体
     * @return 敏感词检测结果
     */
    @PostMapping("/api/v1/content-filter/check")
    // R4-00307：敏感词预检端点 permitAll 且每次全词库正则扫描（上限 5000 字符），
    // 匿名可高频调用消耗 CPU——补按 IP 限流（桶 60，5 令牌/秒，前端输入防抖后足够）
    @com.campuslove.api.ratelimit.RateLimit(capacity = 60, refillTokens = 5, key = "#request.remoteAddr")
    public Map<String, Object> checkContent(@Valid @RequestBody Map<String, String> body) {
        String content = body.get("content");

        if (content == null || content.isBlank()) {
            return Map.of("hasSensitiveWords", false);
        }

        // infra R2-00200: 限制检测内容长度，防止超大文本触发正则扫描
        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException(ErrorMessages.CONTENT_MAX_LENGTH_PREFIX + MAX_CONTENT_LENGTH + " 字符");
        }

        // infra R2-00201: 仅返回 hasSensitiveWords 布尔值，不暴露命中的敏感词字典，
        // 防止攻击者枚举完整词库后规避内容审核
        boolean hasSensitiveWords = sensitiveWordFilter.containsSensitive(content);
        return Map.of("hasSensitiveWords", hasSensitiveWords);
    }
}