package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.SensitiveWord;
import com.campuslove.api.repository.SensitiveWordRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.Lazy;
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

    /**
     * 任务状态注册表（R4-00382）。
     *
     * <p>taskId → 最新进度快照（SensitiveWordImportResult 不可变 record 原子替换）。
     * 用于支撑客户端轮询 {@code /import/status/{taskId}}（Javadoc 承诺的端点此前不存在）。
     * 已知局限（与既有设计一致）：状态仅存内存，应用重启/多实例后任务状态丢失——
     * 如需跨重启追踪应引入 DB 任务表（见 generateTaskId 注释）。</p>
     */
    private final Map<String, SensitiveWordImportResult> taskRegistry = new ConcurrentHashMap<>();

    private final SensitiveWordRepository sensitiveWordRepository;
    private final SensitiveWordFilter sensitiveWordFilter;
    private final CacheManager cacheManager;

    /**
     * 自引用代理（FIN-00044 修复）。
     *
     * <p>Spring AOP 基于代理，同一 Bean 内部方法调用不经过代理，
     * {@code @Transactional} 会失效。通过 {@link Lazy} 注入自身代理，
     * 使每批导入 {@link #importBatchTransactional} 的事务注解真正生效，
     * 实现「每批一个事务」而非整批长事务。</p>
     */
    @Lazy
    @Autowired
    private SensitiveWordImportService self;

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
            SensitiveWordImportResult empty = new SensitiveWordImportResult(
                    generateTaskId(), 0, 0, 0, "EMPTY_INPUT", "待导入列表为空");
            taskRegistry.put(empty.taskId(), empty);
            return empty;
        }

        String taskId = generateTaskId();
        int total = words.size();

        log.info("SubTask 5.3.5 敏感词异步导入任务已受理: taskId={}, total={}, category={}, operatorId={}",
                taskId, total, category, operatorId);

        // R4-00382：登记任务状态（ACCEPTED），供 /import/status/{taskId} 轮询
        taskRegistry.put(taskId, new SensitiveWordImportResult(taskId, total, 0, 0, "ACCEPTED",
                "任务已受理，预计每 500 条/批异步处理"));

        // 触发异步执行
        doImportAsync(taskId, new ArrayList<>(words), category, operatorId);

        return taskRegistry.get(taskId);
    }

    /**
     * 查询任务状态（R4-00382）。
     *
     * @param taskId 任务 ID
     * @return 任务最新状态快照；任务不存在（未受理/已重启丢失）时返回空
     */
    public Optional<SensitiveWordImportResult> getTaskStatus(String taskId) {
        if (taskId == null || taskId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(taskRegistry.get(taskId));
    }

    /**
     * 实际的异步导入逻辑（由 {@code taskExecutor} 调度执行）。
     *
     * <p>分批处理，每批 {@link #BATCH_SIZE} 条，独立事务（FIN-00044 修复：
     * {@code @Transactional} 从本方法移除，移至 {@link #importBatchTransactional}，
     * 避免整个异步任务持有一个长事务）；
     * 全部完成后失效缓存并刷新内存过滤器。</p>
     *
     * @param taskId     任务 ID
     * @param words      待导入的敏感词列表（拷贝，避免外部修改）
     * @param category   敏感词分类
     * @param operatorId 操作者用户 ID
     */
    @Async("taskExecutor")
    public void doImportAsync(String taskId, List<String> words, String category, Long operatorId) {
        long startMs = System.currentTimeMillis();
        int imported = 0;
        int skipped = 0;
        int failed = 0;

        // 内存去重 Set，避免单次导入内重复词重复写库
        Set<String> seen = new HashSet<>();

        try {
            int total = words.size();
            // R4-00382：任务进入执行中状态（RUNNING，进度随批次更新）
            taskRegistry.put(taskId, new SensitiveWordImportResult(
                    taskId, total, 0, 0, "RUNNING", "任务执行中，每 500 条/批异步处理"));

            for (int from = 0; from < total; from += BATCH_SIZE) {
                int to = Math.min(from + BATCH_SIZE, total);
                List<String> batch = words.subList(from, to);

                try {
                    // 通过 self 代理调用，确保 @Transactional 生效（每批独立事务，短事务释放锁）
                    int[] batchResult = self.importBatchTransactional(batch, category, seen);
                    imported += batchResult[0];
                    skipped += batchResult[1];
                } catch (org.springframework.dao.DataAccessException e) {
                    failed += batch.size();
                    log.warn("SubTask 5.3.5 敏感词导入批次失败: taskId={}, batchFrom={}, batchSize={}, error={}",
                            taskId, from, batch.size(), e.getMessage());
                }

                // R4-00382：每批完成后更新任务进度（供 /import/status/{taskId} 轮询）
                taskRegistry.put(taskId, new SensitiveWordImportResult(
                        taskId, total, imported, skipped, "RUNNING",
                        "任务执行中，已处理 " + Math.min(to, total) + "/" + total + " 条"));
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
            // R4-00382：任务完成状态（DONE）
            taskRegistry.put(taskId, new SensitiveWordImportResult(
                    taskId, total, imported, skipped, "DONE",
                    "任务完成：导入 " + imported + " 条，跳过 " + skipped + " 条，失败 " + failed + " 条"));
            log.info("SubTask 5.3.5 敏感词异步导入任务完成: taskId={}, total={}, imported={}, skipped={}, failed={}, costMs={}",
                    taskId, total, imported, skipped, failed, costMs);
        } catch (RuntimeException e) {
            // R4-00382：任务失败状态（FAILED）
            taskRegistry.put(taskId, new SensitiveWordImportResult(
                    taskId, words.size(), imported, skipped, "FAILED",
                    "任务异常：" + (e.getMessage() != null ? e.getMessage() : "未知错误")));
            log.error("SubTask 5.3.5 敏感词异步导入任务异常: taskId={}, error={}",
                    taskId, e.getMessage(), e);
        }
    }

    /**
     * 导入单批敏感词（每批独立事务，FIN-00044 修复）。
     *
     * <p>本方法为 public 且标注 {@code @Transactional}，由 {@link #doImportAsync}
     * 通过 {@code self} 代理调用（同 Bean 内部直接调用不走 AOP 代理），
     * 确保每批数据在独立短事务中提交，避免整个异步任务持有一个长事务。</p>
     *
     * @param batch    单批敏感词
     * @param category 分类
     * @param seen     进程内去重 Set（方法内会修改）
     * @return int[2]：[导入条数, 跳过条数]
     */
    @Transactional
    public int[] importBatchTransactional(List<String> batch, String category, Set<String> seen) {
        return importBatch(batch, category, seen);
    }

    /**
     * 导入单批敏感词（无事务的纯处理逻辑，由 {@link #importBatchTransactional} 调用）。
     *
     * @param batch    单批敏感词
     * @param category 分类
     * @param seen     进程内去重 Set（方法内会修改）
     * @return int[2]：[导入条数, 跳过条数]
     */
    private int[] importBatch(List<String> batch, String category, Set<String> seen) {
        int imported = 0;
        int skipped = 0;
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

        List<SensitiveWord> toSave = new ArrayList<>();
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

            SensitiveWord entity = new SensitiveWord();
            entity.setWord(word);
            entity.setCategory(category);
            entity.setCreatedAt(now);
            toSave.add(entity);
        }

        // infra R2-00243: 数据库去重改为批量预查询 + saveAll，
        // 避免每词 1 次 exists + 1 次 save（5000 词 = 1 万次往返）；唯一约束仍兜底
        if (!toSave.isEmpty()) {
            List<String> lowerWords = toSave.stream()
                    .map(w -> w.getWord().toLowerCase(java.util.Locale.ROOT))
                    .toList();
            Set<String> existing = new HashSet<>(
                    sensitiveWordRepository.findExistingWordsIgnoreCase(lowerWords));
            List<SensitiveWord> finalList = toSave.stream()
                    .filter(w -> existing.add(w.getWord().toLowerCase(java.util.Locale.ROOT)))
                    .toList();
            skipped += toSave.size() - finalList.size();
            try {
                imported += sensitiveWordRepository.saveAll(finalList).size();
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                // 并发导入撞 unique 约束（概率极低）：回退逐条保存，冲突跳过
                for (SensitiveWord w : finalList) {
                    try {
                        sensitiveWordRepository.save(w);
                        imported++;
                    } catch (org.springframework.dao.DataIntegrityViolationException ex) {
                        skipped++;
                    }
                }
            }
        }

        return new int[]{imported, skipped};
    }

    /**
     * 生成任务 ID（FIN-00045 轻量修复）。
     *
     * <p>原实现为「时间戳 + 进程内自增计数器」：重启后计数器归零、多实例部署时
     * 不同实例各自计数，均可能产生重复 taskId。现改用 UUID（全局唯一，无状态），
     * 彻底消除撞号风险。</p>
     *
     * <p>已知局限（任务状态未持久化）：taskId 仅存于内存，应用重启后客户端
     * 轮询 {@code /import/status/{taskId}} 将查不到任务；如需跨重启/多实例
     * 状态追踪，应引入 DB 任务表（task_id 主键 + 进度/状态列）。</p>
     */
    private static String generateTaskId() {
        return "sw-import-" + java.util.UUID.randomUUID().toString().replace("-", "");
    }
}
