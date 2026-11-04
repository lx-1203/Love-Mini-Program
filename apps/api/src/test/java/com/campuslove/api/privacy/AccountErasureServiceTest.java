package com.campuslove.api.privacy;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.entity.User;
import com.campuslove.api.media.MediaStorageService;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * {@link AccountErasureService} 与 {@link PersonalDataTables} 清除清单的单元测试
 * （P0 2026-10-31：注销必须真的删）。
 *
 * <p>测试策略：用记录型 {@link JdbcTemplate} 替身捕获「实际执行了什么 SQL」，
 * 然后<b>遍历整份清单</b>逐表逐列断言——不是挑五张表手写作断言。清单里加一项而没写 SQL、
 * 或 SQL 少写一个列，下面的循环都会失败：</p>
 * <ul>
 *   <li>{@code everyColumnDeclaredInInventoryIsActuallyWiped}：每个「必须消失的列」都要在
 *       该表的 DELETE 语句里（整行删除）或 SET 子句里（就地匿名）出现；</li>
 *   <li>{@code noErasedValueIsDerivedFromSubjectId}：SET 右侧永不含主体 ID（旧
 *       {@code "1****"+userId} 哨兵的反例）；</li>
 *   <li>{@code retainedRowsCarryNoDirectIdentifier}：RETAIN 项声明的列只能是
 *       {@code *_id}/{@code *_no} 形态的引用/单号，不允许任何身份文本列；</li>
 *   <li>{@code eraseIsIdempotentAndReplayable}：注销两次不抛异常，且第二次执行的语句序列与第一次一致。</li>
 * </ul>
 *
 * <p>变异推理（本文件末尾的 {@code #wouldFailIf} 注释块按断言组给出「删掉哪行生产代码会红哪条断言」）。</p>
 */
class AccountErasureServiceTest {

    private static final long SUBJECT = 100L;
    private static final long OTHER_SUBJECT = 200L;

    private RecordingJdbcTemplate jdbc;
    private MediaStorageService mediaStorage;
    private AccountErasureService service;

    @BeforeEach
    void setUp() {
        jdbc = new RecordingJdbcTemplate();
        mediaStorage = mock(MediaStorageService.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<MediaStorageService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mediaStorage);
        service = new AccountErasureService(jdbc, provider);
    }

    // ---- 清单结构 ----

    @Test
    @DisplayName("清单每项都有可执行内容，且每项都真的被执行")
    void everyActionableEntryExecutesAtLeastOneStatement() {
        AccountErasureService.ErasureResult result = service.erase(SUBJECT);
        assertEquals(PersonalDataTables.INVENTORY.stream()
                        .mapToInt(t -> t.statements().size()).sum(),
                result.statements(), "执行的 SQL 条数必须等于清单声明的条数（漏执行即清单形同废纸）");
        assertFalse(PersonalDataTables.INVENTORY.isEmpty());
        for (PersonalDataTable table : PersonalDataTables.INVENTORY) {
            if (table.retained()) {
                assertTrue(table.statements().isEmpty(), table.key() + "：RETAIN 项不得带语句");
                assertTrue(table.rationale().length() > 20,
                        table.key() + "：保留必须写清依据，不能只写「保留」");
            } else {
                assertFalse(table.statements().isEmpty() && !table.viaUserEntity(),
                        table.key() + "：既无语句又非实体墓碑 = 什么都没删");
                assertTrue(jdbc.statements.stream().anyMatch(s -> mentionsTable(s, table.table())),
                        table.key() + "：清单声明了该表，但没有任何 SQL 触及它");
            }
        }
    }

    @Test
    @DisplayName("每个「注销后必须不再可读回」的列都出现在 DELETE 或 SET 里")
    void everyColumnDeclaredInInventoryIsActuallyWiped() {
        service.erase(SUBJECT);
        for (PersonalDataTable table : PersonalDataTables.INVENTORY) {
            if (table.retained() || table.viaUserEntity()) {
                continue; // users 的列由实体墓碑负责，另测；RETAIN 项见下一条断言
            }
            for (String column : table.identifyingColumns()) {
                assertTrue(anyStatementWipes(table, column),
                        () -> table.key() + " 的列 " + column + " 注销后仍可读回原值");
            }
        }
    }

    @Test
    @DisplayName("users 墓碑把清单声明的每一个身份列都写成了擦除值")
    void tombstoneWipesEveryColumnDeclaredForUsers() {
        User user = populatedUser();
        String erasedOpenid = service.tombstone(user);

        List<String> declared = PersonalDataTables.byKey("users").identifyingColumns();
        // 冻结列集：清单里被删掉一项 → 这里立刻红（否则「遍历清单断言」会因清单自身变小而假绿）
        assertEquals(Set.of("openid", "nickname", "avatar_url", "bio", "grade_label", "pronouns",
                "phone", "birth_date", "campus_name", "circle_path", "password", "interest_tags",
                "latitude", "longitude", "geo_updated_at", "role", "status", "auto_renew_enabled",
                "profile_completion", "following_count", "followers_count"),
                new LinkedHashSet<>(declared), "users 身份列清单被改动，须同步核对擦除实现与本断言");

        Map<String, Object> actual = readUserColumns(user);
        for (String column : declared) {
            if ("interest_tags".equals(column)) {
                continue; // 未被 User 实体映射，由清单里的原生 SQL 清（见 users 项注释）
            }
            if ("openid".equals(column)) {
                continue; // 非空随机墓碑，不能为 NULL，单独断言
            }
            String expected = expectedErasureOf(column);
            Object value = actual.get(column);
            if (expected == null) {
                assertNull(value, column + " 注销后应为 NULL，实际=" + value);
            } else {
                assertEquals(expected, String.valueOf(value), column + " 注销后应为常量擦除值");
            }
        }
        assertTrue(ErasedValues.isErasedOpenid(erasedOpenid));
        assertEquals(erasedOpenid, user.getOpenid());
    }

    @Test
    @DisplayName("users.interest_tags 由清单的原生语句清除（实体未映射该列）")
    void unmappedUsersColumnIsClearedByNativeStatement() {
        service.erase(SUBJECT);
        String sql = jdbc.statements.stream()
                .filter(s -> s.startsWith("UPDATE users"))
                .findFirst().orElse(null);
        assertNotNull(sql, "users 项必须带一条原生 UPDATE（interest_tags 不在实体里）");
        assertTrue(sql.contains("interest_tags ="), sql);
        assertFalse(sql.contains("nickname"), "已映射列不得用原生 SQL 写：Hibernate 提交时会整行回写覆盖");
    }

    // ---- openid 墓碑的约束满足（NOT NULL + 唯一 + 不撞真实 openid）----

    @Test
    @DisplayName("墓碑 openid：非空、≤128、不与真实微信 openid/派生键同形、两个账号同秒注销不互撞")
    void tombstoneOpenidSatisfiesNullabilityAndUniqueness() {
        Set<String> generated = new HashSet<>();
        for (int i = 0; i < 5000; i++) {
            String openid = AccountErasureService.newTombstoneOpenid();
            assertNotNull(openid);
            assertFalse(openid.isBlank(), "openid 列 NOT NULL，墓碑不得为空串");
            assertTrue(openid.length() <= 128, "超出 users.openid 列宽 128: " + openid.length());
            assertFalse(openid.startsWith("phone:"), "不得与手机号派生键同形");
            assertFalse(openid.startsWith("guest:"), "不得与体验号同形");
            assertFalse(openid.indexOf(':') < 0 && openid.length() == 28,
                    "不得长得像真实微信 openid（28 位无冒号）");
            generated.add(openid);
        }
        assertEquals(5000, generated.size(), "同一秒连续生成的墓碑 openid 必须互不相同");
    }

    @Test
    @DisplayName("两个主体同一秒注销：openid 与 phone 都不违反唯一键")
    void twoSubjectsErasedInSameSecondDoNotCollide() {
        User a = populatedUser();
        a.setId(SUBJECT);
        User b = populatedUser();
        b.setId(OTHER_SUBJECT);
        String openidA = service.tombstone(a);
        String openidB = service.tombstone(b);

        assertFalse(openidA.equals(openidB), "uk_users_openid 会直接冲突");
        // uk_users_phone：两行都写 NULL，MySQL 唯一索引允许多行 NULL
        assertNull(a.getPhone());
        assertNull(b.getPhone());
        // 墓碑值不得是「可反推 userId」的确定性拼接形态（旧 "1****"+userId 哨兵正是把 id 写进了手机号列）。
        // R10-1（2026-11-05 第十辑）：原 contains 子串断言数学上站不住——UUID hex 32 字符对小数字
        // userId 有天然子串概率（"100"/"200" 各 ≈0.59%，实测 1/169），全量跑约每 85 次必偶发红一次；
        // 「不可反推」的可判定代理是非拼接形态（equals/前缀紧贴），而非子串不出现。
        String prefix = openidA.substring(0, openidA.length() - 36); // 剥掉 UUID 段取前缀
        assertFalse(openidA.equals(prefix + String.valueOf(SUBJECT)),
                "墓碑 openid 不得是 前缀+userId 的确定性拼接（可反推）");
        assertFalse(openidB.equals(prefix + String.valueOf(OTHER_SUBJECT)),
                "墓碑 openid 不得是 前缀+userId 的确定性拼接（可反推）");
        // 紧贴形态同样可反推（erased:100<uuid> 也能肉眼读出）：前缀后不得紧跟 userId
        assertFalse(openidA.startsWith(prefix + String.valueOf(SUBJECT) + "-"),
                "前缀后不得紧跟 userId（紧贴形态同样可反推）");
        assertFalse(openidB.startsWith(prefix + String.valueOf(OTHER_SUBJECT) + "-"),
                "前缀后不得紧跟 userId（紧贴形态同样可反推）");
    }

    // ---- 擦除值不得被误当成密文（AES 读取路径）----

    @Test
    @DisplayName("清单里的每个字面量都落不进 AES 解密分支；被否决的 hex 化名则会炸")
    void erasedLiteralsAreNeverMistakenForAesCiphertext() throws Exception {
        AesEncryptor encryptor = realEncryptor();
        Set<String> literals = allSqlLiterals();
        assertFalse(literals.isEmpty(), "清单里一个常量都没有，断言无从谈起");
        for (String literal : literals) {
            assertFalse(encryptor.isEncrypted(literal),
                    "擦除常量 " + literal + " 会被 isEncrypted() 判成密文，读侧会走 AES 解密");
            String read = assertDoesNotThrow(() -> encryptor.decrypt(literal),
                    "擦除常量 " + literal + " 喂进 AesEncryptor.decrypt 抛异常（读取路径会 500）");
            assertEquals(literal, read, "擦除常量必须原样读回（历史明文分支）");
        }
        // 反例钉桩：一个「看起来更安全」的 hex 化名（如 sha256(userId)）会被判成密文，
        // 并因 R4-00247 之后认证标签不匹配而抛 IllegalStateException —— 这就是为什么
        // 本清单只用 NULL / 含 Base64 字母表外字符的常量。
        String hexPseudonym = "d3b07384d113edec49eaa6238ad5ff00d3b07384d113edec49eaa6238ad5ff00";
        assertTrue(encryptor.isEncrypted(hexPseudonym));
        assertThrows(IllegalStateException.class, () -> encryptor.decrypt(hexPseudonym));
    }

    // ---- 化名禁令与保留行的识别面 ----

    @Test
    @DisplayName("SET 右侧永不含主体 ID：不允许「稳定化名」冒充匿名")
    void noErasedValueIsDerivedFromSubjectId() {
        service.erase(SUBJECT);
        for (String sql : jdbc.statements) {
            String setClause = setPartOf(sql);
            assertFalse(setClause.contains("?") || setClause.contains("{uid}"),
                    "SET 子句绑定了主体 ID，写出来的是可反推化名而非匿名: " + sql);
        }
        // 实体墓碑同理
        User user = populatedUser();
        service.tombstone(user);
        assertFalse(String.valueOf(user.getOpenid()).contains(String.valueOf(SUBJECT)));
        assertNull(user.getPhone(), "phone 必须是 NULL，不是任何哨兵字符串");
    }

    @Test
    @DisplayName("RETAIN 项只能留下引用列/单号，不能留身份文本列")
    void retainedRowsCarryNoDirectIdentifier() {
        for (PersonalDataTable table : PersonalDataTables.INVENTORY) {
            if (!table.retained()) {
                continue;
            }
            for (String column : table.identifyingColumns()) {
                boolean referenceOrOrderKey = column.endsWith("_id") || column.endsWith("_no");
                assertTrue(referenceOrOrderKey,
                        table.key() + " 声明保留，却列出了身份文本列 " + column + "：必须改为擦除");
            }
            assertTrue(table.rationale().contains("保留") || table.rationale().contains("留存"),
                    table.key() + "：RETAIN 必须写明保留依据");
        }
    }

    @Test
    @DisplayName("导出清单与清除清单同源自检：两边不一致就抛")
    void inventoryMatchesExportCategoriesExactly() {
        List<String> frozen = List.of("account", "profile_basic", "profile_campus",
                "profile_schedule", "interest_tags", "campus_certification",
                "real_name_certification", "posts", "comments", "likes_given", "likes_received",
                "heart_signals", "follows_given", "follows_received", "temp_chat_sessions",
                "temp_chat_messages", "private_conversations", "private_messages", "whispers",
                "wallet",
                "wallet_transactions", "vip_bills", "vip_billing_logs", "notifications",
                "check_ins", "task_claims", "agreement_consents", "audit_logs");
        assertDoesNotThrow(() -> PersonalDataTables.assertMatchesExportCategories(frozen));
        // 牙齿：少一类（导出新增了表却没登记删除策略）必须炸
        List<String> missingOne = new ArrayList<>(frozen);
        missingOne.remove("real_name_certification");
        assertThrows(IllegalStateException.class,
                () -> PersonalDataTables.assertMatchesExportCategories(missingOne));
        // 牙齿：多一类（登记了但导出不产出）也必须炸
        List<String> extra = new ArrayList<>(frozen);
        extra.add("ghost_category");
        assertThrows(IllegalStateException.class,
                () -> PersonalDataTables.assertMatchesExportCategories(extra));
    }

    // ---- 幂等 / 复跑 ----

    @Test
    @DisplayName("注销两次：不抛异常，且第二次执行的语句序列与第一次逐条相同")
    void eraseIsIdempotentAndReplayable() {
        service.erase(SUBJECT);
        List<String> firstRun = List.copyOf(jdbc.statements);
        assertFalse(firstRun.isEmpty());

        assertDoesNotThrow(() -> service.erase(SUBJECT));

        List<String> secondRun = jdbc.statements.subList(firstRun.size(), jdbc.statements.size());
        assertEquals(firstRun, List.copyOf(secondRun),
                "复跑必须执行同一套语句（部分失败后可安全重放，不多删也不漏删）");
        // 每条语句的绑定参数都只有主体 ID，绝无跨主体写入
        for (Object[] args : jdbc.parameters) {
            for (Object arg : args) {
                assertEquals(SUBJECT, arg, "绑定参数只能是主体 userId");
            }
        }
    }

    @Test
    @DisplayName("空 userId 直接拒绝，不做任何删除")
    void nullSubjectIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.erase(null));
        assertTrue(jdbc.statements.isEmpty());
    }

    // ---- 文件物理删除（提交后）----

    @Test
    @DisplayName("证件照/头像/相册 URL 在语句执行前被取回，并逐个物理删除")
    void fileUrlsAreCollectedBeforeDeletionAndPurged() {
        jdbc.selectResults.put("SELECT url FROM media_asset WHERE user_id = ?", List.of("/u/1/a.jpg"));
        jdbc.selectResults.put("SELECT id_card_front_url FROM real_name_certifications "
                + "WHERE user_id = ?", List.of("/idcard/front.png"));
        service.erase(SUBJECT);
        verify(mediaStorage).delete("/u/1/a.jpg");
        verify(mediaStorage).delete("/idcard/front.png");
        // 取回 URL 必须早于该表的 DELETE，否则行没了、文件永远定位不到
        int selectIdx = jdbc.statements.indexOf("SELECT url FROM media_asset WHERE user_id = ?");
        int deleteIdx = jdbc.orderOfFirst("DELETE FROM media_asset WHERE user_id = ?");
        assertTrue(selectIdx >= 0 && deleteIdx >= 0 && selectIdx < deleteIdx,
                "文件 URL 查询必须在删除语句之前");
    }

    @Test
    @DisplayName("单个文件删除失败不影响注销结果（库内清除已完成）")
    void filePurgeFailureDoesNotBreakErasure() {
        jdbc.selectResults.put("SELECT url FROM media_asset WHERE user_id = ?", List.of("/u/1/a.jpg"));
        doThrow(new RuntimeException("对象存储 503")).when(mediaStorage).delete(anyString());
        assertDoesNotThrow(() -> service.erase(SUBJECT));
        verify(mediaStorage).delete("/u/1/a.jpg");
    }

    @Test
    @DisplayName("媒体存储未装配时只清库内引用并告警，不抛")
    void missingMediaStorageOnlyLogs() {
        @SuppressWarnings("unchecked")
        ObjectProvider<MediaStorageService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        AccountErasureService noMedia = new AccountErasureService(jdbc, provider);
        jdbc.selectResults.put("SELECT url FROM media_asset WHERE user_id = ?", List.of("/u/1/a.jpg"));
        assertDoesNotThrow(() -> noMedia.erase(SUBJECT));
        assertFalse(jdbc.statements.isEmpty(), "库内语句仍须执行");
    }

    // ---- F-10（第五轮审查）：失败/回滚边界的可判点 + 「实体写 ↔ 原生写」一致性静态门 ----

    /**
     * F-10 第①步：让第 k 条语句抛 {@link DataIntegrityViolationException}，断言「users 墓碑没被写下去」。
     *
     * <p>异常选型纠正：反证报告原文写的是「抛 {@code DataUpdateException}」，
     * 该类在本仓依赖（Spring 6.1 / spring-tx）里<b>不存在</b>，以盘上为准改用
     * {@link DataIntegrityViolationException} —— 同为 {@code DataAccessException} 家族、
     * 是 {@code JdbcTemplate} 在 FK RESTRICT / NOT NULL 撞值时真正抛出的类型，
     * 也是 {@code @Transactional} 默认回滚规则覆盖的类型（ RuntimeException）。</p>
     *
     * <p>本机没有真库，所以这条判的是<b>代理边界与调用序列</b>，不是「MySQL 真的回滚了」：
     * <ul>
     *   <li>异常必须<b>原样冒出去</b>（不 catch ⇒ Spring 声明式事务的默认回滚规则会被触发；
     *       若这里被 catch 掉，@Transactional 根本不会回滚，才是真的「留半注销态」）；</li>
     *   <li>炸点之后的语句一条都不执行（写序被硬中断）；</li>
     *   <li>清单里那条唯一的 users 原生写（interest_tags）必须落在炸点之后 ⇒ 没被执行；</li>
     *   <li>文件物理删除一条都不发生。</li>
     * </ul>
     */
    @Test
    @DisplayName("F-10①：第 k 条语句抛 DataIntegrityViolationException ⇒ 异常冒出去、users 墓碑语句与文件删除都不发生")
    void midSweepFailureStopsBeforeUsersTombstoneStatement() {
        final int failAtUpdate = 5;
        ThrowingJdbcTemplate failing = new ThrowingJdbcTemplate(failAtUpdate);
        @SuppressWarnings("unchecked")
        ObjectProvider<MediaStorageService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mediaStorage);
        AccountErasureService withFailingJdbc = new AccountErasureService(failing, provider);
        failing.selectResults.put("SELECT url FROM media_asset WHERE user_id = ?",
                List.of("/u/1/a.jpg"));

        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class,
                () -> withFailingJdbc.erase(SUBJECT),
                "清单中途失败必须把异常冒出去（@Transactional 的回滚靠它触发；被 catch 掉才是真半注销态）");
        assertTrue(ex.getMessage().contains("第 5 条"), "异常应指明炸点，实际: " + ex.getMessage());

        assertEquals(failAtUpdate, failing.failedUpdate,
                "炸点之后的 UPDATE 一条都不许再执行（调用序列被硬中断）");
        assertTrue(failing.statements.stream().noneMatch(s -> s.startsWith("UPDATE users")),
                "users 行的原生墓碑写必须在炸点之后 ⇒ 实际已执行语句=" + failing.statements);
        verify(mediaStorage, never()).delete(anyString());
    }

    /**
     * F-10 第①步的配套：文件物理删除只允许发生在<b>提交后</b>。
     *
     * <p>这是「不留半注销态」的另一半：若回滚后仍把对象存储里的文件删了，
     * 就得到「库里数据完好、文件没了」的第三种坏状态。本用例用
     * {@link TransactionSynchronizationManager} 手工激活同步，分别触发
     * 回滚完成与提交两个回调，钉住只有提交才删文件。</p>
     */
    @Test
    @DisplayName("F-10①：文件删除挂在 afterCommit —— 回滚不删、提交才删")
    void filePurgeRunsOnlyOnCommitAndNotOnRollback() {
        jdbc.selectResults.put("SELECT url FROM media_asset WHERE user_id = ?",
                List.of("/u/1/a.jpg"));
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.erase(SUBJECT);
            List<TransactionSynchronization> synchronizations =
                    TransactionSynchronizationManager.getSynchronizations();
            assertFalse(synchronizations.isEmpty(),
                    "erase 必须把文件删除注册成提交后回调，而不是当场执行");

            for (TransactionSynchronization synchronization : synchronizations) {
                synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            }
            verify(mediaStorage, never()).delete(anyString());

            org.springframework.transaction.support.TransactionSynchronizationUtils
                    .invokeAfterCommit(synchronizations);
            verify(mediaStorage).delete("/u/1/a.jpg");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    /**
     * F-10 第②步（静态门）：users 项「原生 SQL 写的列」与「User 实体映射的列」必须互不相交，
     * 且声明列里<b>未映射</b>的那些必须<b>全部</b>由原生 SQL 覆盖。
     *
     * <p><b>防的是哪一种漂移</b>（反证审查 F-10 原文）：{@code users} 行同时被
     * 「原生 SQL（interest_tags）」与「Hibernate 整行回写（其余列）」写。清单靠
     * 「interest_tags 未被 User 映射」这条<b>脆弱事实</b>成立。哪天有人给 {@code User}
     * 加一个映射了 {@code interest_tags} 的字段（加个需求太正常了），
     * 实体写就会在提交时把原生语句刚清掉的值覆盖回去，而全库没有任何用例能变红
     * —— 既不会红于本清单（列仍在），也不会红于 entity-ddl 门（它管枚举/列宽，不管这个）。
     * 这条门把「映射关系」本身变成判点：两侧不一致即红。</p>
     *
     * <p>映射集合是<b>反射</b> {@code User} 实体的持久字段得到的（{@code @Column(name)}
     * 优先，否则驼峰转下划线），不是手抄第二份列清单 —— 手抄的那份正是会漂移的东西。</p>
     */
    @Test
    @DisplayName("F-10②：users 项原生 SQL 只许写实体未映射的列；已映射列必须走实体写")
    void usersNativeWritesStayDisjointFromEntityMapping() {
        Set<String> mapped = mappedColumnsOfUserEntity();
        assertTrue(mapped.size() >= 20,
                "反射只取到 " + mapped.size() + " 个 User 映射列 ⇒ 这条门已经空转，先修反射：" + mapped);
        assertTrue(mapped.contains("nickname") && mapped.contains("circle_path"),
                "反射没取到已知的映射列，判据不成立：" + mapped);

        PersonalDataTable users = PersonalDataTables.byKey("users");
        assertTrue(users.viaUserEntity(), "users 项不再是 viaUserEntity ⇒ 本门的语义前提没了");
        assertEquals(List.of(), usersWritePathProblems(users, mapped),
                "users 的「实体写 ↔ 原生写」两侧不一致（详见断言消息）");

        // 反证（判点必须能咬）：两个合成项分别踩中两种不一致，检查函数必须各报一条。
        // 没有这一段的话，「门是绿的」可能只是因为「检查根本没做事」。
        PersonalDataTable mappedButNativeWritten = PersonalDataTable.viaUserEntity(
                "synthetic_mapped_native", "users", "合成：已映射列被原生写",
                ErasureAction.ANONYMISE_IN_PLACE, List.of(),
                List.of("nickname"),
                List.of("UPDATE users SET nickname = '已注销' WHERE id = {uid}"),
                List.of(), "合成夹具，只为证明方向一能红。");
        assertTrue(usersWritePathProblems(mappedButNativeWritten, mapped).stream()
                        .anyMatch(p -> p.contains("已被 User 实体映射")),
                "方向一失效：把已映射列写成原生 SQL 都没被抓到");

        PersonalDataTable unmappedNotWritten = PersonalDataTable.viaUserEntity(
                "synthetic_unmapped_missing", "users", "合成：未映射列没人写",
                ErasureAction.ANONYMISE_IN_PLACE, List.of(),
                List.of("some_json_column_not_in_entity"),
                List.of("UPDATE users SET interest_tags = JSON_ARRAY() WHERE id = {uid}"),
                List.of(), "合成夹具，只为证明方向二能红。");
        assertTrue(usersWritePathProblems(unmappedNotWritten, mapped).stream()
                        .anyMatch(p -> p.contains("some_json_column_not_in_entity")),
                "方向二失效：未映射列没有任何原生语句清除都没被抓到（注销后原值仍可读回）");
    }

    /**
     * F-10② 的判据本体（做成纯函数是为了能被合成坏项反证，口径同
     * {@code ErasureSchemaAlignmentTest#detectorBitesOnSyntheticTypo}）。
     *
     * @return 问题描述列表；空列表 = 两侧一致
     */
    private static List<String> usersWritePathProblems(PersonalDataTable users, Set<String> mapped) {
        List<String> problems = new ArrayList<>();
        Set<String> nativelyWritten = new LinkedHashSet<>();
        for (String sql : users.statements()) {
            nativelyWritten.addAll(setColumnsOfUpdate(sql));
        }
        if (nativelyWritten.isEmpty()) {
            problems.add("users 项没有任何原生 SET 语句 ⇒ 未被实体映射的列就没人清了");
        }
        // 方向一：原生 SQL 不得写「已被实体映射」的列
        for (String column : nativelyWritten) {
            if (mapped.contains(column)) {
                problems.add("users 列 " + column + " 已被 User 实体映射，却又被清单里的原生 SQL 写："
                        + "注销时 Hibernate 的整行回写会用内存里的旧值覆盖这条 UPDATE"
                        + "（= 注销把数据复活）。要么把该列改由 tombstone 实体写负责，要么先撤销 User 上的映射。");
            }
        }
        // 方向二：声明列里未被实体映射的，必须由原生 SQL 覆盖（实体写不到它们）
        for (String column : users.identifyingColumns()) {
            if (!mapped.contains(column) && !nativelyWritten.contains(column)) {
                problems.add("users 列 " + column + " 既没被 User 实体映射、又不在原生 SET 里"
                        + " ⇒ 注销后原值仍可读回（实体写不到它，原生写又没写它）");
            }
        }
        return problems;
    }

    /** 反射取 {@code User} 实体的持久化列名（@Column(name) 优先，否则驼峰转下划线）。 */
    private static Set<String> mappedColumnsOfUserEntity() {
        Set<String> columns = new LinkedHashSet<>();
        for (Field field : User.class.getDeclaredFields()) {
            int modifiers = field.getModifiers();
            if (java.lang.reflect.Modifier.isStatic(modifiers)
                    || java.lang.reflect.Modifier.isTransient(modifiers)
                    || field.isSynthetic()) {
                continue;
            }
            if (field.isAnnotationPresent(jakarta.persistence.Transient.class)) {
                continue;
            }
            // 关系字段不是 users 表的列（本实体目前也没有关系字段，防御性地排除）
            if (field.isAnnotationPresent(jakarta.persistence.ManyToOne.class)
                    || field.isAnnotationPresent(jakarta.persistence.OneToMany.class)
                    || field.isAnnotationPresent(jakarta.persistence.ManyToMany.class)
                    || field.isAnnotationPresent(jakarta.persistence.ElementCollection.class)) {
                continue;
            }
            jakarta.persistence.Column column = field.getAnnotation(jakarta.persistence.Column.class);
            if (column != null && !column.name().isBlank()) {
                columns.add(column.name().toLowerCase(Locale.ROOT));
            } else {
                columns.add(camelToSnake(field.getName()));
            }
        }
        return columns;
    }

    private static String camelToSnake(String name) {
        StringBuilder out = new StringBuilder(name.length() + 8);
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (Character.isUpperCase(c)) {
                if (i > 0) {
                    out.append('_');
                }
                out.append(Character.toLowerCase(c));
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    /** 取 {@code UPDATE t SET a = x, b = y WHERE …} 里被写的列名集合（只认 SET 段）。 */
    private static Set<String> setColumnsOfUpdate(String sql) {
        Set<String> columns = new LinkedHashSet<>();
        String upper = sql.toUpperCase(Locale.ROOT);
        int setIndex = upper.indexOf(" SET ");
        if (setIndex < 0) {
            return columns;
        }
        int whereIndex = upper.indexOf(" WHERE ", setIndex);
        String setClause = sql.substring(setIndex + 5, whereIndex < 0 ? sql.length() : whereIndex);
        for (String assignment : setClause.split(",")) {
            int equals = assignment.indexOf('=');
            if (equals > 0) {
                columns.add(assignment.substring(0, equals).trim()
                        .replace("`", "").toLowerCase(Locale.ROOT));
            }
        }
        return columns;
    }

    /**
     * 在第 k 条 UPDATE 上抛 {@link DataIntegrityViolationException} 的 JdbcTemplate 替身
     * （F-10 第①步用；其余行为与 {@link RecordingJdbcTemplate} 一致）。
     */
    static class ThrowingJdbcTemplate extends RecordingJdbcTemplate {
        private final int failAtUpdate;
        private int updatesSeen;
        /** 炸点序号（== failAtUpdate 时表示「后续 UPDATE 一条都没再执行」）。 */
        int failedUpdate;

        ThrowingJdbcTemplate(int failAtUpdate) {
            this.failAtUpdate = failAtUpdate;
        }

        @Override
        public int update(String sql, Object... args) {
            updatesSeen++;
            statements.add(sql);
            parameters.add(args);
            if (updatesSeen == failAtUpdate) {
                failedUpdate = updatesSeen;
                throw new DataIntegrityViolationException("第 " + updatesSeen + " 条清除语句失败（测试注入）：" + sql);
            }
            if (updatesSeen < failAtUpdate) {
                return 1;
            }
            throw new IllegalStateException("炸点之后的 UPDATE 不应该被执行：" + sql);
        }
    }

    /*
     * ============================ 变异推理（每条断言对应「删掉哪一行生产代码会红」）============================
     *
     * 1. everyActionableEntryExecutesAtLeastOneStatement / everyColumnDeclaredInInventoryIsActuallyWiped
     *    - 把 AccountErasureService#erase 的语句循环改成只处理 users（即回到旧行为）：
     *      result.statements() 远小于清单条数，且「实名/校园认证/聊天/行为」每一项都会
     *      在 anyMatch(mentionsTable) 处失败 —— 不是只有 5 个手挑用例红，是整表遍历全红。
     *    - 把清单里某条 UPDATE 的 `content = '（内容已随账号注销删除）'` 删掉（漏一列）：
     *      everyColumnDeclaredInInventoryIsActuallyWiped 只对该列失败（posts.content /
     *      comments.content / feedback_tickets.title 等各自独立）。
     *    - 把某表的 DELETE 换成「只删一半条件」（如 temp_chat_session 只按 user_a_id 删）：
     *      语句仍存在，本组断言不会假绿的地方由 5. 的 SQL 文本冻结断言 + 交付说明的
     *      「NOT VERIFIED：需要一次真库往返测试」承担。
     *
     * 2. tombstoneWipesEveryColumnDeclaredForUsers
     *    - 删掉 AccountErasureService#tombstone 里任意一行 setter（如 user.setBirthDate(null)）：
     *      对应用例的 assertNull 直接失败；
     *    - 从 users 清单项里删一列（想让断言「跳过」它）：
     *      紧接着的「冻结列集」assertEquals 失败，所以清单不能自我缩水。
     *
     * 3. unmappedUsersColumnIsClearedByNativeStatement
     *    - 把 interest_tags 改写成实体 setter：编译不过（User 无该属性），且本断言要求
     *      users 项必须带原生 UPDATE；
     *    - 反过来把已映射列（nickname）写进原生 SQL：assertFalse(sql.contains("nickname")) 失败
     *      —— 那会被 Hibernate 的整行回写覆盖，等于没删。
     *
     * 4. noErasedValueIsDerivedFromSubjectId
     *    - 把 maskPhone(userId) 那种写法搬进任何一条 SET：setPartOf(sql).contains("?") 失败；
     *      同时 PersonalDataTables 的类加载期自检也会抛（双保险）。
     *
     * 5. retainedRowsCarryNoDirectIdentifier
     *    - 有人把某张还带身份文本列的表（如 activity_proposal.submitter_phone）改成
     *      RETAIN_STATUTORY：列名不以 _id/_no 结尾 → 失败。
     *
     * 6. inventoryMatchesExportCategoriesExactly
     *    - 给 PersonalDataService 新增一个导出类别而不在清单登记：build() 现在会抛
     *      （PersonalDataErasureAlignmentTest 与既有 PersonalDataServiceTest 同时变红）。
     *
     * 7. eraseIsIdempotentAndReplayable / RealAccountSecurityServiceTest
     *       .deactivate_alreadyDeactivated_rerunsSweepWithoutCredentialCheck
     *    - 把 deactivateAccount 开头的「已注销直接 return」改回来：复跑不再执行清单，
     *      第二条断言（verify(userRepository).save(any())）失败 —— 这正是
     *      「中途失败后第二次注销不会补齐」的旧缺陷。
     *
     * 8. fileUrlsAreCollectedBeforeDeletionAndPurged / filePurgeFailureDoesNotBreakErasure
     *    - 把 collectNonBlank 挪到 DELETE 之后：顺序断言失败，且真实运行时 URL 永远为空
     *      （文件删不掉）；- 让 purgeQuietly 不吞异常：第二条断言失败。
     *
     * 9. tombstoneOpenidSatisfiesNullabilityAndUniqueness / twoSubjectsErasedInSameSecondDoNotCollide
     *    - 把 erasedOpenid() 改成 "erased:" + userId 或时间戳：5000 次生成去重断言与
     *      「两个主体不互撞」断言双双失败（NOT NULL 与 uk_users_openid 的实盘验证仍需真库，
     *      见交付说明 NOT VERIFIED）。
     */

    // ---- 辅助 ----

    /**
     * 该列在注销后是否真的读不回原值：
     * 要么整行被 DELETE（该表任一 DELETE 语句命中），要么该表的 UPDATE 在 SET 子句里显式写了这一列。
     */
    private boolean anyStatementWipes(PersonalDataTable table, String column) {
        String upperTable = table.table().toUpperCase(Locale.ROOT);
        for (String sql : jdbc.statements) {
            String upper = sql.toUpperCase(Locale.ROOT);
            if (!upper.contains(upperTable)) {
                continue;
            }
            if (upper.startsWith("DELETE") && upper.contains("FROM " + upperTable)) {
                return true; // 行没了，任何列都读不回来
            }
            if (setPartOf(sql).contains(column.toUpperCase(Locale.ROOT) + " =")) {
                return true;
            }
        }
        return false;
    }

    private static boolean mentionsTable(String sql, String table) {
        return sql.toUpperCase(Locale.ROOT).contains(table.toUpperCase(Locale.ROOT));
    }

    private static String setPartOf(String sql) {
        int set = sql.toUpperCase(Locale.ROOT).indexOf(" SET ");
        if (set < 0) {
            return "";
        }
        int where = sql.toUpperCase(Locale.ROOT).indexOf(" WHERE ", set);
        return (where < 0 ? sql.substring(set) : sql.substring(set, where)).toUpperCase(Locale.ROOT);
    }

    /** 清单里所有单引号字面量（用于「擦除常量不得像密文」的断言）。 */
    private static Set<String> allSqlLiterals() {
        Set<String> literals = new LinkedHashSet<>();
        for (PersonalDataTable table : PersonalDataTables.INVENTORY) {
            for (String sql : table.statements()) {
                int i = 0;
                while (true) {
                    int open = sql.indexOf('\'', i);
                    if (open < 0) {
                        break;
                    }
                    int close = sql.indexOf('\'', open + 1);
                    if (close < 0) {
                        break;
                    }
                    literals.add(sql.substring(open + 1, close));
                    i = close + 1;
                }
            }
        }
        literals.add(ErasedValues.NICKNAME);
        literals.add(ErasedValues.SHORT_TEXT);
        literals.add(ErasedValues.TEXT_CONTENT);
        literals.add(ErasedValues.UNKNOWN_LOCATION);
        literals.add(AccountErasureService.newTombstoneOpenid());
        return literals;
    }

    private static String expectedErasureOf(String column) {
        return switch (column) {
            case "nickname" -> ErasedValues.NICKNAME;
            case "role" -> "USER";
            case "status" -> "deactivated";
            case "auto_renew_enabled" -> "false";
            case "profile_completion", "following_count", "followers_count" -> "0";
            case "openid" -> null; // 非空随机值，单独断言
            default -> null;       // 其余列一律 NULL
        };
    }

    /** 逐列读出实体值（列名→属性名按驼峰转换；未映射列返回 null 并跳过）。 */
    private static Map<String, Object> readUserColumns(User user) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("openid", user.getOpenid());
        out.put("nickname", user.getNickname());
        out.put("avatar_url", user.getAvatarUrl());
        out.put("bio", user.getBio());
        out.put("grade_label", user.getGradeLabel());
        out.put("pronouns", user.getPronouns());
        out.put("phone", user.getPhone());
        out.put("birth_date", user.getBirthDate());
        out.put("campus_name", user.getCampusName());
        out.put("circle_path", user.getCirclePath());
        out.put("password", user.getPassword());
        out.put("latitude", user.getLatitude());
        out.put("longitude", user.getLongitude());
        out.put("geo_updated_at", user.getGeoUpdatedAt());
        out.put("role", user.getRole());
        out.put("status", user.getStatus());
        out.put("auto_renew_enabled", user.getAutoRenewEnabled());
        out.put("profile_completion", user.getProfileCompletion());
        out.put("following_count", user.getFollowingCount());
        out.put("followers_count", user.getFollowersCount());
        return out;
    }

    private static User populatedUser() {
        User user = new User();
        user.setId(SUBJECT);
        user.setOpenid("phone:d3b07384d113edec49eaa6238ad5ff00");
        user.setNickname("张小明");
        user.setAvatarUrl("/uploads/avatar-100.jpg");
        user.setBio("计科大三");
        user.setGradeLabel("大三");
        user.setPronouns("TA");
        user.setPhone("AES-CIPHER-PHONENUMBER");
        user.setBirthDate(java.time.LocalDate.of(2004, 3, 1));
        user.setCampusName("北京大学");
        user.setCirclePath("C1/R1/S1");
        user.setPassword("$2a$10$abcdefghijklmnopqrstuv");
        user.setLatitude(java.math.BigDecimal.valueOf(39.9042));
        user.setLongitude(java.math.BigDecimal.valueOf(116.4074));
        user.setGeoUpdatedAt(java.time.LocalDateTime.now());
        user.setRole("ADMIN");
        user.setStatus("active");
        user.setAutoRenewEnabled(true);
        user.setProfileCompletion(85);
        user.setFollowingCount(12);
        user.setFollowersCount(34);
        return user;
    }

    /** 用真实 AesEncryptor（反射注入密钥后走 @PostConstruct 校验），以覆盖 R4-00247 的抛异常分支。 */
    private static AesEncryptor realEncryptor() throws Exception {
        AesEncryptor encryptor = new AesEncryptor();
        Field secret = AesEncryptor.class.getDeclaredField("secret");
        secret.setAccessible(true);
        secret.set(encryptor, "0123456789abcdef0123456789abcdef-test-only");
        Field strict = AesEncryptor.class.getDeclaredField("strictAes");
        strict.setAccessible(true);
        strict.set(encryptor, Boolean.TRUE);
        encryptor.init();
        return encryptor;
    }

    /** 记录型 JdbcTemplate 替身：不连库，只记下执行过的 SQL 与参数。 */
    static class RecordingJdbcTemplate extends JdbcTemplate {
        final List<String> statements = new ArrayList<>();
        final List<Object[]> parameters = new ArrayList<>();
        final Map<String, List<String>> selectResults = new LinkedHashMap<>();

        RecordingJdbcTemplate() {
            super();
        }

        @Override
        public int update(String sql, Object... args) {
            statements.add(sql);
            parameters.add(args);
            return 1;
        }

        @Override
        public <T> List<T> queryForList(String sql, Class<T> elementType, Object... args) {
            statements.add(sql);
            List<String> rows = selectResults.getOrDefault(sql, List.of());
            @SuppressWarnings("unchecked")
            List<T> cast = (List<T>) rows;
            return cast;
        }

        int orderOfFirst(String sql) {
            return statements.indexOf(sql);
        }
    }
}
