package com.campuslove.api.media;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * N-6（2026-11-03）：媒体孤儿文件判定测试。
 *
 * <p>判点（与 {@link MediaGcService} 类注释逐条对应）：</p>
 * <ul>
 *   <li>登记在册（media_asset.url 指向）→ 无论多旧都不是孤儿</li>
 *   <li>未登记 + 超过保留窗口 → 孤儿候选</li>
 *   <li>未登记 + 窗口内（含刚写入）→ 不动（防上传-登记竞态）</li>
 *   <li>temp/ 子树 → 永不触碰</li>
 * </ul>
 */
class MediaGcServiceTest {

    private Path root;
    private MediaGcService service;
    private EntityManager entityManager;

    @BeforeEach
    void setUp() throws IOException {
        root = Files.createTempDirectory("media-gc-test");
        entityManager = Mockito.mock(EntityManager.class);
        service = new MediaGcService();
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        ReflectionTestUtils.setField(service, "storageRoot", root.toString());
        ReflectionTestUtils.setField(service, "enabled", true);
        ReflectionTestUtils.setField(service, "dryRun", true);
        ReflectionTestUtils.setField(service, "retentionDays", 90);
    }

    @AfterEach
    void tearDown() throws IOException {
        // 递归删临时目录
        try (var walk = Files.walk(root)) {
            walk.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
        }
    }

    /** 在存储根下造一个文件，mtime 可指定。 */
    private Path putFile(String relative, Instant mtime) throws IOException {
        Path p = root.resolve(relative.replace('/', java.io.File.separatorChar));
        Files.createDirectories(p.getParent());
        Files.writeString(p, "x");
        java.nio.file.attribute.FileTime time = java.nio.file.attribute.FileTime.from(mtime);
        Files.getFileAttributeView(p, java.nio.file.attribute.BasicFileAttributeView.class).setTimes(time, time, time);
        return p;
    }

    /** 资产表 url 投影桩。 */
    private void stubReferencedUrls(List<String> urls) {
        // scan 使用 createQuery(String) 单列投影，直接桩原生 Query
        var query = Mockito.mock(jakarta.persistence.Query.class);
        Mockito.when(query.getResultList()).thenReturn(urls);
        Mockito.when(entityManager.createQuery(Mockito.anyString())).thenReturn(query);
    }

    @Test
    @DisplayName("登记在册的文件无论多旧都不是孤儿；未登记超窗才算；窗口内不动；temp 永不触碰")
    void scan_classifiesOrphansCorrectly() throws IOException {
        Instant old = Instant.now().minus(200, ChronoUnit.DAYS);
        Instant fresh = Instant.now().minus(1, ChronoUnit.DAYS);

        Path referencedOld = putFile("7/202601/keep-old.jpg", old);          // 登记+超旧 → 保留
        putFile("7/202601/orphan.jpg", old);                                  // 未登记+超窗 → 孤儿
        putFile("7/202601/fresh.jpg", fresh);                                 // 未登记+窗口内 → 保留
        putFile("temp/s1/202601/whatever.jpg", old);                          // temp 子树 → 无视

        stubReferencedUrls(List.of("/api/v1/media/7/202601/keep-old.jpg",
                "/uploads/7/202601/legacy-ref.jpg"));                          // 含 legacy 前缀归一化

        MediaGcService.GcReport report = service.scan();

        assertEquals(1, report.orphans().size(), "只有未登记且超窗的文件是孤儿候选");
        assertTrue(report.orphans().stream().noneMatch(p -> p.toString().contains("temp")),
                "temp 子树永不进入候选");
        assertTrue(report.keptRecent().stream().anyMatch(p -> p.getFileName().toString().equals("fresh.jpg")),
                "窗口内未登记文件保留（防上传-登记竞态）");
        // 登记引用数 = 扫描的 3 个非 temp 文件 - 1 孤儿 - 1 窗口内 = 1
        assertEquals(1, report.referencedCount(), "登记在册 1 个（keep-old）");
        assertFalse(report.orphans().contains(referencedOld));
    }

    @Test
    @DisplayName("dry-run 模式零删除：候选文件原样在盘")
    void sweepDryRun_deletesNothing() throws IOException {
        putFile("7/202601/orphan.jpg", Instant.now().minus(200, ChronoUnit.DAYS));
        stubReferencedUrls(List.of());

        service.sweepDaily(); // enabled=true, dryRun=true

        assertTrue(Files.exists(root.resolve("7/202601/orphan.jpg")),
                "dry-run 不得删除任何文件（三层闸第二层）");
    }

    @Test
    @DisplayName("真实回收只删孤儿：登记文件与 temp 文件完好")
    void sweepReal_deletesOnlyOrphans() throws IOException {
        ReflectionTestUtils.setField(service, "dryRun", false);
        Path orphan = putFile("7/202601/orphan.jpg", Instant.now().minus(200, ChronoUnit.DAYS));
        putFile("7/202601/keep.jpg", Instant.now().minus(200, ChronoUnit.DAYS)); // 登记+超旧
        putFile("temp/s1/202601/x.jpg", Instant.now().minus(200, ChronoUnit.DAYS));
        stubReferencedUrls(List.of("/api/v1/media/7/202601/keep.jpg"));

        service.sweepDaily();

        assertFalse(Files.exists(orphan), "孤儿被回收");
        assertTrue(Files.exists(root.resolve("7/202601/keep.jpg")), "登记文件不动");
        assertTrue(Files.exists(root.resolve("temp/s1/202601/x.jpg")), "temp 子树不动");
    }
}
