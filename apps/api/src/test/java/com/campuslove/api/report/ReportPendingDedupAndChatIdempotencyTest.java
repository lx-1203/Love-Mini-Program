package com.campuslove.api.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Report;
import com.campuslove.api.official.OfficialAccountController;
import com.campuslove.api.repository.ReportRepository;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;

/**
 * C1（2026-11 第六轮修复波 W1）：非钱轨写端点的业务唯一键 / 幂等缺口。
 *
 * <p>纠正交办前提：{@code @Idempotent} 结构上不防双击（客户端 http.ts 自述
 * 「双击=两次逻辑操作=两次都放行」），故判据是业务唯一键，不是注解覆盖率。
 * 本仓两侧皆缺的真账两条：</p>
 * <ul>
 *   <li>(a) 举报 {@code reports} 表无唯一键 ⇒ 同人同目标重复立案。修法：服务端派生
 *       {@code pending_dedup_key}（reporter:target）业务唯一键 + 幂等迁移。</li>
 *   <li>(b) 官方号私信 {@code sendUserMessage} 每次写成对两行（用户+助手），端点缺
 *       {@code @Idempotent} ⇒ 网络重试（复用同一幂等键）把成对行再写一遍。</li>
 * </ul>
 *
 * <p>无真库 ⇒ 去重键落库的并发拒绝（DataIntegrityViolation→409）由全局 handler 已有能力承担，
 * 本门证到「SQL 形态 + 派生逻辑 + 端点注解」三层。</p>
 */
@DisplayName("C1 业务唯一键：举报去重 + 官方号私信幂等")
class ReportPendingDedupAndChatIdempotencyTest {

    private static final Path MIGRATION =
            Path.of("..", "..", "database", "flyway", "sql",
                    "V2026.11.01.0001__add_reports_pending_dedup_unique.sql");

    @Test
    @DisplayName("实体：Report 暴露 pendingDedupKey 读写访问器")
    void entityExposesPendingDedupKey() throws Exception {
        Method setter = Report.class.getMethod("setPendingDedupKey", String.class);
        Method getter = Report.class.getMethod("getPendingDedupKey");
        assertNotNull(setter);
        assertEquals(String.class, getter.getReturnType());
    }

    /** (a) 行为：建单把去重键派生成 reporter:targetType:targetId。 */
    @Test
    @DisplayName("举报建单派生 pending_dedup_key = reporter:targetType:targetId")
    void createReportDerivesDedupKey() {
        ReportRepository repo = mock(ReportRepository.class);
        when(repo.countByReporterIdAndCreatedAtAfter(anyLong(), any())).thenReturn(0L);
        when(repo.save(any(Report.class))).thenAnswer(inv -> inv.getArgument(0));
        ReportController controller = new ReportController(repo);

        ArgumentCaptor<Report> captor = ArgumentCaptor.forClass(Report.class);
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            controller.createReport(new ReportCreateRequest("POST", 42L, "spam", "广告"));
        }
        org.mockito.Mockito.verify(repo).save(captor.capture());
        assertEquals("1:POST:42", captor.getValue().getPendingDedupKey(),
                "举报未派生业务唯一键，同人同目标仍可重复立案");
    }

    /** (a) 迁移内容门：幂等补列 + 回填 + 去重 + 唯一键四段齐全。 */
    @Test
    @DisplayName("迁移：补列/回填/去重/加唯一键四段，全部幂等（information_schema + PREPARE）")
    void migrationIsIdempotentAndComplete() throws IOException {
        Path sql = resolveMigration();
        assertTrue(Files.isRegularFile(sql), "找不到举报去重迁移: " + sql.toAbsolutePath());
        String text = Files.readString(sql, StandardCharsets.UTF_8);

        // 1 补列：information_schema.COLUMNS 判断 + PREPARE
        assertTrue(text.contains("information_schema.COLUMNS"), "补列段缺少列存在性判断");
        assertTrue(text.contains("ADD COLUMN pending_dedup_key"), "缺少 ADD COLUMN pending_dedup_key");
        // 2 回填 PENDING
        assertTrue(text.contains("SET pending_dedup_key = CONCAT(reporter_id, ':', target_type, ':', target_id)"),
                "缺少对现存 PENDING 行的去重键回填");
        // 3 去重：HAVING COUNT + MIN(id) 保留一条
        assertTrue(text.contains("HAVING COUNT(*) > 1") && text.contains("MIN(id)"),
                "缺少加约束前的存量去重（否则唯一键会因重复行创建失败）");
        // 4 唯一键：information_schema.STATISTICS 判断 + ADD UNIQUE KEY + PREPARE
        assertTrue(text.contains("information_schema.STATISTICS"), "索引段缺少存在性判断");
        assertTrue(text.contains("ADD UNIQUE KEY uk_reports_pending_dedup"), "缺少 ADD UNIQUE KEY uk_reports_pending_dedup");
        assertTrue(text.contains("PREPARE stmt"), "迁移未按本仓幂等写法用 PREPARE/EXECUTE");
    }

    /** (b) 端点注解：官方号私信发送必须有 @Idempotent，防网络重试成对行。 */
    @Test
    @DisplayName("官方号私信 send 端点带 @Idempotent（防重试成对行）")
    void officialChatSendEndpointIsIdempotent() throws Exception {
        Method sendMessage = OfficialAccountController.class.getMethod(
                "sendMessage", String.class, OfficialAccountController.OfficialChatSendRequest.class);
        assertNotNull(sendMessage.getAnnotation(Idempotent.class),
                "官方号私信发送缺 @Idempotent ⇒ 网络重试复用同键却把成对行(用户+助手)再写一遍");
    }

    /** (b) 行为：sendUserMessage 确实写两行（用户 + 助手），佐证成对行风险真实存在。 */
    @Test
    @DisplayName("举报写端点已有 @Idempotent（既有，非本发现新增，仅作覆盖对照）")
    void reportCreateEndpointAlreadyIdempotent() throws Exception {
        Method createReport = ReportController.class.getMethod(
                "createReport", ReportCreateRequest.class);
        assertNotNull(createReport.getAnnotation(Idempotent.class),
                "举报建单缺 @Idempotent（本发现依赖它拦同键重试）");
    }

    private static Path resolveMigration() {
        Path p = MIGRATION;
        if (!Files.isRegularFile(p)) {
            // surefire basedir 是 apps/api；数据库在仓库根，相对路径向上两级。
            Path alt = Path.of(System.getProperty("user.dir")).resolve(MIGRATION).normalize();
            if (Files.isRegularFile(alt)) {
                return alt;
            }
            // 再兜底：从 user.dir 找仓库根
            Path root = Path.of(System.getProperty("user.dir"), "..", "..")
                    .resolve(Path.of("database", "flyway", "sql",
                            "V2026.11.01.0001__add_reports_pending_dedup_unique.sql"))
                    .normalize();
            if (Files.isRegularFile(root)) {
                return root;
            }
        }
        return p;
    }
}
