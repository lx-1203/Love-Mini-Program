package com.campuslove.api.config;

import com.campuslove.api.entity.SensitiveWord;
import com.campuslove.api.repository.SensitiveWordRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;

/**
 * 敏感词启动加载器（real profile）。
 *
 * <p>背景：{@link SensitiveWordFilter} 的 keywords 默认来自 {@code app.content-filter.keywords}
 * 配置（application.yml），仅包含少量内置词；管理后台新增/删除敏感词时由
 * {@code AdminSensitiveWordController} 调用 {@code refreshFilterKeywords()} 同步内存。
 * 但应用重启后，数据库中已存在的敏感词（管理后台维护的权威数据）不会自动载入内存，
 * 导致「后台列表可见、前端过滤不生效」的不一致。</p>
 *
 * <p>本组件在应用完全就绪（{@link ApplicationReadyEvent}）后，从数据库全量加载敏感词
 * 并刷新内存过滤器；数据库为空时保留配置内置词，保证过滤能力始终可用。
 * 与 {@code refreshFilterKeywords()} 语义一致（数据库为权威源）。</p>
 *
 * <p>仅 real profile 激活（mock 环境无 JPA 仓库，SensitiveWordFilter 使用配置内置词）。</p>
 */
@Profile("real")
@Component
public class SensitiveWordStartupLoader {

    private static final Logger log = LoggerFactory.getLogger(SensitiveWordStartupLoader.class);

    private final SensitiveWordRepository sensitiveWordRepository;
    private final SensitiveWordFilter sensitiveWordFilter;

    public SensitiveWordStartupLoader(SensitiveWordRepository sensitiveWordRepository,
                                      SensitiveWordFilter sensitiveWordFilter) {
        this.sensitiveWordRepository = sensitiveWordRepository;
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    /**
     * 应用就绪后加载数据库敏感词到内存过滤器。
     * 失败时仅记录 WARN 并降级，不阻断应用启动。
     */
    @EventListener(ApplicationReadyEvent.class)
    public void loadSensitiveWordsOnStartup() {
        try {
            List<String> words = sensitiveWordRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(SensitiveWord::getWord)
                    .toList();
            if (words.isEmpty()) {
                log.info("数据库无敏感词，保留配置内置敏感词过滤列表");
                return;
            }
            sensitiveWordFilter.setKeywords(words);
            log.info("启动时加载数据库敏感词 {} 条到内存过滤器", words.size());
        } catch (DataAccessException e) {
            log.warn("启动加载数据库敏感词失败，沿用配置内置词", e);
        }
    }
}
