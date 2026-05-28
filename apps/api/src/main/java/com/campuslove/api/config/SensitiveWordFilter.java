package com.campuslove.api.config;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 敏感词过滤服务。
 * <p>
 * 从配置文件读取敏感词列表，提供内容过滤和检测功能。
 * 过滤策略：将敏感词替换为 ***，而非拒绝发布，以保证用户体验。
 * </p>
 * <p>
 * 配置前缀: app.content-filter
 * </p>
 */
@Component
@ConfigurationProperties(prefix = "app.content-filter")
public class SensitiveWordFilter {

    private static final Logger log = LoggerFactory.getLogger(SensitiveWordFilter.class);

    /** 替换敏感词的字符串 */
    private static final String REPLACEMENT = "***";

    /** 是否启用敏感词过滤 */
    private boolean enabled = false;

    /** 敏感词列表（从配置文件读取） */
    private List<String> keywords = List.of();

    /** 高效匹配用的敏感词集合（转小写存储，实现大小写不敏感） */
    private Set<String> keywordSet = Collections.emptySet();

    /** 编译后的正则模式，用于批量替换 */
    private Pattern pattern = null;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<String> getKeywords() {
        return keywords;
    }

    /**
     * 设置敏感词列表。
     * Spring Boot ConfigurationProperties 注入时会调用此方法，
     * 同时自动初始化内部的 HashSet 和正则 Pattern。
     */
    public void setKeywords(List<String> keywords) {
        this.keywords = keywords != null ? keywords : List.of();
        initKeywordSet();
    }

    /**
     * 初始化敏感词集合和正则模式。
     * 将所有敏感词转为小写存入 HashSet，实现 O(1) 查找和大小写不敏感匹配。
     * 同时构建正则 Pattern 用于批量替换。
     */
    private void initKeywordSet() {
        Set<String> set = new HashSet<>();
        for (String keyword : this.keywords) {
            if (keyword != null && !keyword.isBlank()) {
                set.add(keyword.toLowerCase());
            }
        }
        this.keywordSet = Collections.unmodifiableSet(set);

        // 构建正则表达式模式：按敏感词长度降序排列，确保长词优先匹配
        if (!this.keywordSet.isEmpty()) {
            String[] sortedKeywords = this.keywordSet.toArray(new String[0]);
            java.util.Arrays.sort(sortedKeywords, (a, b) -> Integer.compare(b.length(), a.length()));
            StringBuilder regexBuilder = new StringBuilder();
            for (int i = 0; i < sortedKeywords.length; i++) {
                if (i > 0) {
                    regexBuilder.append("|");
                }
                regexBuilder.append(Pattern.quote(sortedKeywords[i]));
            }
            this.pattern = Pattern.compile(regexBuilder.toString(), Pattern.CASE_INSENSITIVE);
        } else {
            this.pattern = null;
        }
    }

    /**
     * 过滤内容中的敏感词，将其替换为 ***。
     * <p>
     * 如果未启用过滤或内容为空，则原样返回。
     * 使用正则批量替换，优先匹配更长的敏感词。
     * </p>
     *
     * @param content 待过滤的原始内容
     * @return 过滤后的内容；如果内容不包含敏感词，返回原内容
     */
    public String filter(String content) {
        if (!enabled || content == null || content.isBlank()) {
            return content;
        }
        if (pattern == null || keywordSet.isEmpty()) {
            return content;
        }
        return pattern.matcher(content).replaceAll(REPLACEMENT);
    }

    /**
     * 检查内容是否包含敏感词。
     * <p>
     * 使用滑动窗口方式扫描每个词是否在敏感词集合中，
     * 实现大小写不敏感的检测。
     * </p>
     *
     * @param content 待检查的内容
     * @return true 如果包含敏感词，false 否则
     */
    public boolean containsSensitive(String content) {
        if (!enabled || content == null || content.isBlank()) {
            return false;
        }
        if (keywordSet.isEmpty()) {
            return false;
        }

        // 转小写后按字符遍历，检测包含关系
        String lowerContent = content.toLowerCase();
        for (String keyword : keywordSet) {
            if (lowerContent.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 过滤并记录日志。
     * 用于在业务服务中调用，过滤内容的同时记录被过滤事件。
     * 日志只记录用户ID和过滤时间，不记录原始内容以保证隐私。
     *
     * @param content 待过滤的内容
     * @param userId  执行操作的用户 ID
     * @param scene   过滤场景（如 "POST", "COMMENT", "MESSAGE", "CAMPUS_TOPIC" 等）
     * @return 过滤后的内容
     */
    public String filterWithLog(String content, Long userId, String scene) {
        if (!enabled || content == null || content.isBlank()) {
            return content;
        }

        String filtered = filter(content);

        // 如果内容发生了变化（即包含敏感词），记录日志
        if (!filtered.equals(content)) {
            log.warn("Sensitive word filtered: userId={}, scene={}, filterTime={}",
                    userId, scene, java.time.LocalDateTime.now());
        }

        return filtered;
    }
}