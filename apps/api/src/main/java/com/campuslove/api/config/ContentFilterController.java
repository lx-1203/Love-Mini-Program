package com.campuslove.api.config;

import java.util.List;
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
    @PostMapping("/content-filter/check")
    public Map<String, Object> checkContent(@RequestBody Map<String, String> body) {
        String content = body.get("content");

        if (content == null || content.isBlank()) {
            return Map.of("hasSensitiveWords", false, "filteredWords", List.of());
        }

        boolean hasSensitiveWords = sensitiveWordFilter.containsSensitive(content);

        // 找出具体命中的敏感词
        List<String> filteredWords = hasSensitiveWords
                ? findMatchedKeywords(content)
                : List.of();

        return Map.of(
                "hasSensitiveWords", hasSensitiveWords,
                "filteredWords", filteredWords
        );
    }

    /**
     * 查找内容中命中的敏感词列表。
     * 对每个敏感词执行大小写不敏感的匹配。
     *
     * @param content 待检查的内容
     * @return 命中的敏感词列表
     */
    private List<String> findMatchedKeywords(String content) {
        String lowerContent = content.toLowerCase();
        return sensitiveWordFilter.getKeywords().stream()
                .filter(keyword -> keyword != null && !keyword.isBlank())
                .filter(keyword -> lowerContent.contains(keyword.toLowerCase()))
                .toList();
    }
}