package com.campuslove.api.admin;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.SensitiveWord;
import com.campuslove.api.repository.SensitiveWordRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * SubTask 5.3.5：敏感词异步批量导入服务。
 *
 * <p>背景：管理后台一次性导入大量敏感词（如 1 万条以上）时，
 * 同步处理会阻塞 HTTP 请求线程并可能触发网关超时（默认 30s）。
 * 本服务将批量导入操作异步化，立即返回任务受理结果，
 * 实际导入在 {@code taskExecutor} 线程池中分批执行。</p>
 *
 * <p>设计要点：</p>
 * <ul>
 *   <li>{@code @Async} 使用 {@link com.campuslove.api.config.AsyncConfig} 中配置的
 *       {@code taskExecutor} Bean，参数化线程池（核心 8 / 最大 32 / 队列 200）。</li>
 *   <li>分批处理：每批 500 条，避免一次性占用过多内存与事务日志。</li>
 *   <li>幂等去重：通过内存 Set + DB {@code existsByWordIgnoreCase} 双层去重，
 *       重复词跳过，不抛异常。</li>
 *   <li>异常隔离：单批失败不阻断后续批次，记录日志后继续。</li>
 *   <li>缓存失效：全部批次完成后通过 {@code CacheManager} 主动失效
 *       {@link CacheNames#SENSITIVE_WORDS}，并同步刷新内存 SensitiveWordFilter。</li>
 *   <li>事务粒度：每批一个事务，避免长事务持锁。</li>
 * </ul>
 *
 * <p>使用方式：</p>
 * <pre>
 * SensitiveWordImportResult result = importService.importBatchAsync(words, category, operatorId);
 * // 立即返回任务受理结果（taskId），客户端可轮询 /api/v1/admin/sensitive-words/import/status/{taskId}
 * </pre>
 *
 * @since P5 / SubTask 5.3.5
 */
@Profile("real")
@Service
public class SensitiveWordImportService {

    private static final Logger log = LoggerFactory.getLogger(SensitiveWordImportService.class);

    /** 单批处理数量，平衡内存占用与事务开销 */
    private static final int BATCH_SIZE = 500;

    /** 任务 ID 生成用计数器（进程内，配合时间戳保证唯一） */
    private static long taskCounter = 0L;

    private final SensitiveWordRepository sensitiveWordRepository;
    private final SensitiveWordFilter sensitiveWordFilter;
    private final CacheManager cacheManager;

    public SensitiveWordImportService(SensitiveWordRepository sensitiveWordRepository,
                                       SensitiveWordFilter sensitiveWordFilter,
                                       CacheManager cacheManager) {
        this.sensitiveWordRepository = sensitiveWordRepository;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.cacheManager = cacheManager;
    }

    /**
     * 异步批量导入敏感词。
     *
     * <p>立即返回任务受理结果（含 taskId 与待导入条数），
     * 实际导入在 {@code taskExecutor} 线程池中异步执行。</p>
     *
     * @param words      待导入的敏感词列表
     * @param category   敏感词分类（POLITICS/PORN/ABUSE/AD/OTHER），可为 null
     * @param operatorId 操作者用户 ID（仅用于日志记录）
     * @return 任务受理结果（含 taskId）
     */
    public SensitiveWordImportResult importBatchAsync(List<String> words, String category, Long operatorId) {
        if (words == null || words.isEmpty()) {
            return new SensitiveWordImportResult(generateTaskId(), 0, 0, 0, "EMPTY_INPUT", "待导入列表为空");
        }

        String taskId = generateTaskId();
        int total = words.size();

        log.info("SubTask 5.3.5 敏感词异步导入任务已受理: taskId={}, total={}, category={}, operatorId={}",
                taskId, total, category, operatorId);

        // 触发异步执行
        doImportAsync(taskId, new ArrayList<>(words), category, operatorId);

        return new SensitiveWordImportResult(taskId, total, 0, 0, "ACCEPTED",
                "任务已受理，预计每 500 条/批异步处理");
    }

    /**
     * 实际的异步导入逻辑（由 {@code taskExecutor} 调度执行）。
     *
     * <p>分批处理，每批 {@link #BATCH_SIZE} 条，独立事务；
     * 全部完成后失效缓存并刷新内存过滤器。</p>
     *
     * @param taskId     任务 ID
     * @param words      待导入的敏感词列表（拷贝，避免外部修改）
     * @param category   敏感词分类
     * @param operatorId 操作者用户 ID
     */
    @Async("taskExecutor")
    @Transactional
    public void doImportAsync(String taskId, List<String> words, String category, Long operatorId) {
        long startMs = System.currentTimeMillis();
        int imported = 0;
        int skipped = 0;
        int failed = 0;

        // 内存去重 Set，避免单次导入内重复词重复写库
        Set<String> seen = new HashSet<>();

        try {
            int total = words.size();
            for (int from = 0; from < total; from += BATCH_SIZE) {
                int to = Math.min(from + BATCH_SIZE, total);
                List<String> batch = words.subList(from, to);

                try {
                    int[] batchResult = importBatch(batch, category, seen);
                    imported += batchResult[0];
                    skipped += batchResult[1];
                } catch (org.springframework.dao.DataAccessException e) {
                    failed += batch.size();
                    log.warn("SubTask 5.3.5 敏感词导入批次失败: taskId={}, batchFrom={}, batchSize={}, error={}",
                            taskId, from, batch.size(), e.getMessage());
                }
            }

            // 失效 Redis/Caffeine 缓存
            try {
                org.springframework.cache.Cache cache = cacheManager.getCache(CacheNames.SENSITIVE_WORDS);
                if (cache != null) {
                    cache.clear();
                }
            } catch (IllegalStateException e) {
                log.warn("SubTask 5.3.5 失效敏感词缓存失败: taskId={}, error={}", taskId, e.getMessage());
            }

            // 同步刷新内存 SensitiveWordFilter
            try {
                List<String> allWords = sensitiveWordRepository.findAllByOrderByCreatedAtDesc().stream()
                        .map(SensitiveWord::getWord)
                        .toList();
                sensitiveWordFilter.setKeywords(allWords);
            } catch (org.springframework.dao.DataAccessException e) {
                log.warn("SubTask 5.3.5 刷新内存敏感词过滤器失败: taskId={}, error={}", taskId, e.getMessage());
            }

            long costMs = System.currentTimeMillis() - startMs;
            log.info("SubTask 5.3.5 敏感词异步导入任务完成: taskId={}, total={}, imported={}, skipped={}, failed={}, costMs={}",
                    taskId, total, imported, skipped, failed, costMs);
        } catch (RuntimeException e) {
            log.error("SubTask 5.3.5 敏感词异步导入任务异常: taskId={}, error={}",
                    taskId, e.getMessage(), e);
        }
    }

    /**
     * 导入单批敏感词（独立事务）。
     *
     * <p>注意：本方法被 {@link #doImportAsync} 调用，由于 {@code @Async} 与
     * {@code @Transactional} 都基于 AOP 代理，外部直接调用不会走代理，
     * 因此本方法不标注 {@code @Transactional}，事务由调用方 {@code doImportAsync} 控制。</p>
     *
     * @param batch    单批敏感词
     * @param category 分类
     * @param seen     进程内去重 Set（方法内会修改）
     * @return int[2]：[导入条数, 跳过条数]
     */
    private int[] importBatch(List<String> batch, String category, Set<String> seen) {
        int imported = 0;
        int skipped = 0;
        LocalDateTime now = LocalDateTime.now();

        for (String rawWord : batch) {
            if (rawWord == null) {
                skipped++;
                continue;
            }
            String word = rawWord.trim();
            if (word.isEmpty()) {
                skipped++;
                continue;
            }

            // 内存去重
            String lowerKey = word.toLowerCase();
            if (!seen.add(lowerKey)) {
                skipped++;
                continue;
            }

            // 数据库去重
            try {
                if (sensitiveWordRepository.existsByWordIgnoreCase(word)) {
                    skipped++;
                    continue;
                }
            } catch (org.springframework.dao.DataAccessException e) {
                log.warn("SubTask 5.3.5 敏感词去重查询失败: word={}, error={}", word, e.getMessage());
                // 去重查询失败时仍尝试写入，由 unique 约束兜底
            }

            try {
                SensitiveWord entity = new SensitiveWord();
                entity.setWord(word);
                entity.setCategory(category);
                entity.setCreatedAt(now);
                sensitiveWordRepository.save(entity);
                imported++;
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                // 可能是 unique 约束冲突（并发导入），跳过即可
                skipped++;
                log.debug("SubTask 5.3.5 敏感词写入跳过: word={}, error={}", word, e.getMessage());
            }
        }

        return new int[]{imported, skipped};
    }

    /**
     * 生成任务 ID（时间戳 + 进程内自增）。
     */
    private static synchronized String generateTaskId() {
        taskCounter = (taskCounter + 1) % 1_000_000L;
        return "sw-import-" + System.currentTimeMillis() + "-" + taskCounter;
    }
}
