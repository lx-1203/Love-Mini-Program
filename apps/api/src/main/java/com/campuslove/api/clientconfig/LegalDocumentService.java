package com.campuslove.api.clientconfig;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.LegalDocument;
import com.campuslove.api.repository.LegalDocumentRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 法律文本 CMS 服务（real profile）。
 *
 * <p>DB 优先；表为空时用 {@link LegalTextProvider} 的现有内嵌文本种成 v1.0.0。
 * 客户端 /config/legal 与注册同意版本都以这里为准，Provider 仅作 DB 不可用时的兜底。</p>
 */
@Service
@Profile("real")
public class LegalDocumentService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LegalDocumentService.class);

    public static final String PUBLISHED = "published";
    public static final String DRAFT = "draft";
    public static final String TYPE_USER_AGREEMENT = "user_agreement";
    public static final String TYPE_PRIVACY_POLICY = "privacy_policy";

    private final LegalDocumentRepository repository;
    private final LegalTextProvider provider;

    public LegalDocumentService(LegalDocumentRepository repository, LegalTextProvider provider) {
        this.repository = repository;
        this.provider = provider;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (repository.count() > 0) {
            return;
        }
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        for (String type : List.of(TYPE_USER_AGREEMENT, TYPE_PRIVACY_POLICY)) {
            LegalTextView view = provider.getLegalText(type);
            LegalDocument doc = new LegalDocument();
            doc.setDocType(type);
            doc.setTitle(view.title());
            doc.setContent(view.content());
            doc.setVersion(view.version());
            doc.setStatus(PUBLISHED);
            doc.setEffectiveAt(parseDate(view.updatedAt(), now));
            doc.setCreatedAt(now);
            doc.setUpdatedAt(now);
            repository.save(doc);
        }
        log.info("法律文本 CMS 已用 Provider 文本种子 v1.0.0（待法务复核）");
    }

    @Transactional(readOnly = true)
    public LegalTextListResponse list(String type) {
        if (type != null && !type.isBlank()) {
            return new LegalTextListResponse(List.of(getPublished(type)));
        }
        List<LegalTextView> items = repository.findByStatusOrderByDocTypeAsc(PUBLISHED).stream()
                .map(this::toView)
                .toList();
        if (!items.isEmpty()) {
            return new LegalTextListResponse(items);
        }
        return new LegalTextListResponse(List.of(
                provider.getLegalText(TYPE_USER_AGREEMENT),
                provider.getLegalText(TYPE_PRIVACY_POLICY)));
    }

    @Transactional(readOnly = true)
    public LegalTextView getPublished(String type) {
        return repository.findFirstByDocTypeAndStatusOrderByEffectiveAtDescIdDesc(type, PUBLISHED)
                .map(this::toView)
                .orElseGet(() -> provider.getLegalText(type));
    }

    @Transactional(readOnly = true)
    public String currentVersion(String type) {
        return getPublished(type).version();
    }

    @Transactional(readOnly = true)
    public List<LegalDocument> listAll() {
        return repository.findAllByOrderByDocTypeAscIdAsc();
    }

    @Transactional
    public LegalDocument update(Long id, String title, String content, String version,
                                LocalDateTime effectiveAt, Long updatedBy) {
        LegalDocument doc = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("法律文本不存在: " + id));
        if (title != null && !title.isBlank()) {
            doc.setTitle(title.trim());
        }
        if (content != null && !content.isBlank()) {
            doc.setContent(content);
        }
        if (version != null && !version.isBlank()) {
            doc.setVersion(version.trim());
        }
        if (effectiveAt != null) {
            doc.setEffectiveAt(effectiveAt);
        }
        doc.setUpdatedBy(updatedBy);
        doc.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        return repository.save(doc);
    }

    @Transactional
    public LegalDocument publish(Long id, Long updatedBy) {
        LegalDocument doc = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("法律文本不存在: " + id));
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        // 同一类型只保留一个 published 版本
        repository.findByStatusOrderByDocTypeAsc(PUBLISHED).stream()
                .filter(other -> other.getDocType().equals(doc.getDocType()) && !other.getId().equals(doc.getId()))
                .forEach(other -> {
                    other.setStatus(DRAFT);
                    other.setUpdatedBy(updatedBy);
                    other.setUpdatedAt(now);
                    repository.save(other);
                });
        doc.setStatus(PUBLISHED);
        if (doc.getEffectiveAt() == null) {
            doc.setEffectiveAt(now);
        }
        doc.setUpdatedBy(updatedBy);
        doc.setUpdatedAt(now);
        return repository.save(doc);
    }

    @Transactional
    public LegalDocument offline(Long id, Long updatedBy) {
        LegalDocument doc = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("法律文本不存在: " + id));
        doc.setStatus(DRAFT);
        doc.setUpdatedBy(updatedBy);
        doc.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        return repository.save(doc);
    }

    private LegalTextView toView(LegalDocument doc) {
        return new LegalTextView(
                doc.getDocType(),
                doc.getTitle(),
                doc.getContent(),
                doc.getVersion(),
                doc.getUpdatedAt() != null ? doc.getUpdatedAt().toString() : "");
    }

    private LocalDateTime parseDate(String value, LocalDateTime fallback) {
        try {
            return LocalDateTime.parse(value);
        } catch (RuntimeException e) {
            return fallback;
        }
    }
}
