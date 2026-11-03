package com.campuslove.api.media;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 媒体孤儿文件治理（N-6，2026-11-03）。
 *
 * <p><b>问题</b>：{@code uploads/} 只增不减——帖子删除是软删、图片 URL 仍留在
 * posts.images JSON 里；media_asset 行也永不删除。磁盘按 10k DAU 约 1.8GB/日增长
 * （见商业化审查报告 §4.4 数据推演），没有回收能力，6-12 个月内将触顶本地卷。</p>
 *
 * <p><b>孤儿定义（保守）</b>：物理文件存在于存储目录，但 media_asset 表中<b>没有任何一行</b>
 * url 指向它，且文件最后修改时间早于保留窗口（默认 90 天）。两个条件缺一不可：</p>
 * <ul>
 *   <li>「无资产行引用」——media_asset 是上传的登记簿（无论帖子是否删除，行都在），
 *       只要行在就不算孤儿；帖子软删不删行，因此<b>本任务不会删除任何曾登记过的业务媒体</b>，
 *       只回收「上传后登记失败/中途崩溃」的真正孤儿</li>
 *   <li>「超过保留窗口」——防住「文件已落盘、资产行尚未提交」的竞态：
 *       新文件一律不动，等它老过窗口仍无登记才回收</li>
 * </ul>
 *
 * <p><b>安全设计（三层）</b>：</p>
 * <ol>
 *   <li>总闸 {@code app.media.gc-enabled}（env {@code MEDIA_GC_ENABLED}，默认 <b>false</b>）：
 *       未显式开启时本任务只记录「本应回收多少」的读数，零删除；</li>
 *   <li>删除闸 {@code app.media.gc.dry-run}（env {@code MEDIA_GC_DRY_RUN}，默认 <b>true</b>）：
 *       即使开了总闸，默认也只打印清单不删文件——运维核对 dry-run 报告后再切 false；</li>
 *   <li>范围闸：{@code temp/} 子树<b>永不触碰</b>（临时会话媒体有独立生命周期，
 *       由 TempChatCleanupService 管理，两个清理器职责互斥）；空目录删除仅限叶子层。</li>
 * </ol>
 *
 * <p>运营流程见 doc/RUNBOOKS.md「媒体存储治理」：先开总闸跑一周 dry-run 读数，
 * 确认孤儿量级与预期一致后再关 dry-run。保留期按合规留痕要求定（建议 ≥90 天）。</p>
 */
@Profile("real")
@Component
public class MediaGcService {

    private static final Logger log = LoggerFactory.getLogger(MediaGcService.class);

    /** 临时会话媒体子目录名（独立生命周期，本任务不触碰，见类注释范围闸） */
    static final String TEMP_DIR_NAME = "temp";

    /** 资产表 url 前缀（与 LocalMediaStorageService.URL_PREFIX 同源形态） */
    private static final String URL_PREFIX = "/api/v1/media/";
    private static final String LEGACY_URL_PREFIX = "/uploads/";

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${app.media.storage-root:./uploads}")
    private String storageRoot;

    /** 总闸：默认关。开启后仍默认 dry-run，见 {@code dryRun} */
    @Value("${app.media.gc-enabled:${MEDIA_GC_ENABLED:false}}")
    private boolean enabled;

    /** 删除闸：默认 true（只报告不删除） */
    @Value("${app.media.gc.dry-run:${MEDIA_GC_DRY_RUN:true}}")
    private boolean dryRun;

    /** 保留窗口（天）：孤儿文件须早于该窗口才可回收 */
    @Value("${app.media.gc.retention-days:${MEDIA_GC_RETENTION_DAYS:90}}")
    private int retentionDays;

    /**
     * 每日孤儿扫描（凌晨 04:10 低峰）。执行策略见类注释三层闸。
     */
    @Scheduled(cron = "0 10 4 * * ?", zone = "Asia/Shanghai")
    public void sweepDaily() {
        if (!enabled) {
            // 未开启也扫一遍出读数（零删除）：让容量趋势在日志里可见，避免「没开就完全没数」
            GcReport report = scan();
            log.info("媒体GC未开启（MEDIA_GC_ENABLED=false），本次仅读数: {}", report.summarize());
            return;
        }
        GcReport report = scan();
        if (dryRun) {
            log.info("媒体GC dry-run（MEDIA_GC_DRY_RUN=true，零删除）: {}", report.summarize());
            report.orphans().stream().limit(20)
                    .forEach(p -> log.info("媒体GC dry-run 候选: {}", p));
            if (report.orphans().size() > 20) {
                log.info("媒体GC dry-run 候选共 {} 个，仅列前 20（完整清单开 DEBUG）", report.orphans().size());
            }
            return;
        }
        int deleted = 0;
        long freedBytes = 0L;
        for (Path orphan : report.orphans()) {
            try {
                long size = Files.size(orphan);
                Files.deleteIfExists(orphan);
                deleted++;
                freedBytes += size;
            } catch (IOException ex) {
                log.warn("媒体GC删除失败（跳过，下轮重试）: {} cause={}", orphan, ex.getMessage());
            }
        }
        log.info("媒体GC执行完成: 删除孤儿 {} 个，释放 {}MB（登记引用 {} 个未动）",
                deleted, freedBytes / (1024 * 1024), report.referencedCount());
    }

    /**
     * 扫描存储目录，产出孤儿候选清单（纯读，不删除）。
     *
     * <p>供定时任务与手动触发共用；单测直接测本方法的判定逻辑。</p>
     */
    public GcReport scan() {
        Path root = Path.of(storageRoot);
        if (!Files.isDirectory(root)) {
            return new GcReport(Set.of(), Set.of(), 0);
        }
        Set<String> referenced = loadReferencedRelativePaths();
        Instant cutoff = Instant.now().minus(Duration.ofDays(Math.max(1, retentionDays)));
        Set<Path> orphans = new HashSet<>();
        Set<Path> keptRecent = new HashSet<>();
        int scanned = 0;
        try (Stream<Path> files = Files.walk(root)) {
            for (Path file : (Iterable<Path>) files.filter(Files::isRegularFile)::iterator) {
                if (isUnderTemp(file, root)) {
                    continue; // 范围闸：temp/ 子树独立生命周期
                }
                scanned++;
                String rel = root.relativize(file).toString().replace('\\', '/');
                if (referenced.contains(rel)) {
                    continue; // 登记在册：无论审核状态如何都不动
                }
                Instant mtime;
                try {
                    mtime = Files.readAttributes(file, BasicFileAttributes.class).lastModifiedTime().toInstant();
                } catch (IOException ex) {
                    keptRecent.add(file); // 读不到属性按「不可判定=不动」处理
                    continue;
                }
                if (mtime.isBefore(cutoff)) {
                    orphans.add(file);
                } else {
                    keptRecent.add(file);
                }
            }
        } catch (IOException ex) {
            log.warn("媒体GC扫描存储目录失败（本轮放弃）: root={} cause={}", root, ex.getMessage());
            return new GcReport(Set.of(), keptRecent, 0);
        }
        log.debug("媒体GC扫描: 文件 {} 个，登记引用 {} 个，窗口内未登记 {} 个，孤儿候选 {} 个",
                scanned, referenced.size(), keptRecent.size(), orphans.size());
        return new GcReport(orphans, keptRecent, scanned);
    }

    /** temp/ 子树判定（相对存储根的第一段目录名）。 */
    private static boolean isUnderTemp(Path file, Path root) {
        return root.relativize(file).getNameCount() > 0
                && TEMP_DIR_NAME.equals(root.relativize(file).getName(0).toString());
    }

    /**
     * 登记引用集合：media_asset.url 全表取回，归一化为存储相对路径。
     *
     * <p>JPQL 单列投影（非 select 实体）规避 entityManager 泛型转换；
     * 资产表量级 = 上传总数（百万级内可接受，定时凌晨执行）。</p>
     */
    private Set<String> loadReferencedRelativePaths() {
        @SuppressWarnings("unchecked")
        java.util.List<String> urls = entityManager
                .createQuery("select m.url from MediaAsset m")
                .getResultList();
        Set<String> rel = new HashSet<>(urls.size() * 2);
        for (String url : urls) {
            if (url == null || url.isBlank()) {
                continue;
            }
            if (url.startsWith(URL_PREFIX)) {
                rel.add(url.substring(URL_PREFIX.length()));
            } else if (url.startsWith(LEGACY_URL_PREFIX)) {
                rel.add(url.substring(LEGACY_URL_PREFIX.length()));
            }
            // 其余形态（绝对外链等）与本地存储无关，跳过
        }
        return rel;
    }

    /**
     * 扫描读数（不可变）。orphans=可回收候选；keptRecent=未登记但在保留窗口内（不动）；
     * scannedFiles=本轮扫过的文件总数。
     */
    public record GcReport(Set<Path> orphans, Set<Path> keptRecent, int scannedFiles) {
        String summarize() {
            return "扫描=" + scannedFiles + " 登记未动=?, 孤儿候选=" + orphans.size()
                    + " 窗口内未登记=" + keptRecent.size();
        }

        public int referencedCount() {
            return scannedFiles - orphans.size() - keptRecent.size();
        }
    }
}
