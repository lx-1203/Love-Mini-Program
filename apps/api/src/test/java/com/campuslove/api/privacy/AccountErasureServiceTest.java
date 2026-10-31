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
import org.springframework.jdbc.core.JdbcTemplate;

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
        // 且都不含自己的 userId（旧 "1****"+userId 哨兵正是把 id 写进了手机号列）
        assertFalse(openidA.contains(String.valueOf(SUBJECT)));
        assertFalse(openidB.contains(String.valueOf(OTHER_SUBJECT)));
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
                "temp_chat_messages", "private_conversations", "private_messages", "wallet",
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
