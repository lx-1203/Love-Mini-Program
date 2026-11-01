package com.campuslove.api.privacy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 注销清单 ↔ 迁移链真实列集的对账（2026-10-31 P0「注销不删除」的收尾判点）。
 *
 * <p><b>为什么还需要这一道</b>：执行侧的 {@code AccountErasureServiceTest} 用的是记录型
 * {@code JdbcTemplate} 替身——它证明「清单里的语句被原样发出」，从不连库。于是有一类错误
 * 盘上无处可红：清单里把列名写错一个字母（{@code id_card_no} 其实叫 {@code id_card_number}），
 * 或者引用了一张迁移链里根本不存在的表。MySQL 会在真实注销时直接报错，{@code @Transactional}
 * 让整笔回滚 ⇒ 用户点「注销」拿到 500、数据一条都没删——与 P0 同一个后果，
 * 却比 P0 更难发现，因为 CI 里没有真库跑过注销。</p>
 *
 * <p><b>为什么写在 Java 里而不是 node 门</b>：清单里有 {@code deleteRows(...)} 这类构造辅助，
 * 表名/归属列是<b>运行期参数</b>（{@code "DELETE FROM " + table + " WHERE " + ownerColumn}）。
 * 静态正则读不到它们，只有 {@link PersonalDataTables#INVENTORY} 本身是权威形态，
 * 所以判据必须拿到真实对象。</p>
 *
 * <p><b>判据</b>：
 * A. 每个清单项的物理表必须在迁移链里被 CREATE TABLE 过；
 * B. 每项声明的 {@code identifyingColumns}（注销后必须不再可读回原值的列）必须是该表真实存在的列；
 * C. 「单表、无 JOIN」形态语句里的 SET 目标列 / WHERE 侧列 / 单列 SELECT，必须属于该表；
 * D. 多表 JOIN 与别名形态不做 C（本类不是 SQL 解析器，宁缺毋滥），但仍受 A、B 覆盖。</p>
 *
 * <p>迁移目录按 {@code database/flyway/sql} 从当前目录向上找，因此
 * {@code mvn -f apps/api/pom.xml test}（CI）与 {@code cd apps/api && ./mvnw test}（本机）都能定位。</p>
 */
class ErasureSchemaAlignmentTest {

    /** 约束/索引子句的开头关键字——这些行不是列定义。 */
    private static final Set<String> NOT_A_COLUMN = Set.of(
            "primary", "unique", "key", "index", "fulltext", "constraint", "foreign", "check", "period");

    /** SQL 里不该被当成列名的关键字与函数名（保守清单）。 */
    private static final Set<String> SQL_NOISE = Set.of(
            "and", "or", "not", "null", "is", "in", "like", "between", "where", "set", "from", "select",
            "delete", "update", "insert", "into", "values", "join", "left", "right", "inner", "on",
            "using", "order", "by", "group", "limit", "offset", "as", "case", "when", "then", "else",
            "end", "true", "false", "uid", "count", "sum", "max", "min", "concat", "if", "ifnull",
            "coalesce", "json", "unix_timestamp", "time", "now", "interval", "second", "day", "hour",
            "ascii", "convert", "cast", "distinct", "exists", "all", "union", "having", "desc", "asc",
            "replace");

    private static final Pattern TABLE_REF =
            Pattern.compile("\\b(?:FROM|UPDATE|JOIN|INTO)\\s+`?([A-Za-z0-9_]+)`?", Pattern.CASE_INSENSITIVE);
    private static final Pattern CREATE_TABLE = Pattern.compile(
            "CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?`?([A-Za-z0-9_]+)`?\\s*\\(",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern CREATE_TABLE_LIKE = Pattern.compile(
            "CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?`?([A-Za-z0-9_]+)`?\\s+LIKE\\s+`?([A-Za-z0-9_]+)`?",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ALTER_TABLE = Pattern.compile(
            "ALTER\\s+TABLE\\s+`?([A-Za-z0-9_]+)`?([\\s\\S]*?);", Pattern.CASE_INSENSITIVE);

    /**
     * {@code DROP TABLE [IF EXISTS] t}（第五轮 F-11 穷尽门用：建后又删的表不算「在盘上」）。
     * 与 {@link #CREATE_TABLE} 一道按文本位置排序处理，正确识别「同文件 drop→create」的幂等重建。
     */
    private static final Pattern DROP_TABLE = Pattern.compile(
            "DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?`?([A-Za-z0-9_]+)`?", Pattern.CASE_INSENSITIVE);

    /**
     * 用户归属列的精确名单（第五轮 F-11）。判据只认 <b>CREATE TABLE 体里</b>这些列——它们把一行数据
     * 归到某个自然人（{@code user_a_id/user_b_id} 是会话双方、{@code host_id} 是被访者、
     * {@code caller_id/callee_id/claimer_id} 是通话/红包参与人，都在本仓承载主体关系）。
     * 另加两条后缀规则覆盖 {@code *_user_id}（mentioned/replier/submitter/…）与 {@code *_author_id}。
     */
    private static final Set<String> OWNER_COLUMNS = Set.of(
            "user_id", "author_id", "sender_id", "receiver_id", "visitor_id", "reporter_id",
            "caller_id", "callee_id", "claimer_id", "operator_id", "follower_id", "following_id",
            "user_a_id", "user_b_id", "host_id");

    /** 「带用户归属列」的表集合（表名小写 → 该表在 CREATE 体里出现的归属列）。 */
    private static boolean isOwnerColumn(String column) {
        return OWNER_COLUMNS.contains(column)
                || column.endsWith("_user_id") || column.endsWith("_author_id");
    }

    /**
     * 「有用户归属列、经代码核对确认不属注销主体个人数据」的<b>显式豁免表</b>（表名 → 不可省略的理由）。
     *
     * <p>纪律与 {@code tests/gate-wiring.spec.mjs:156-161} 的 {@code TEST_EXECUTION_BASELINE}、
     * {@code tests/entity-ddl-drift.spec.mjs} 的 {@code PHANTOM_DML_EXEMPTIONS} 同族：
     * 只许写明确理由且<b>只减不增</b>；{@link #exhaustivenessResidueAreCovered} 里有一条反漂移断言，
     * 一旦某张豁免表在盘上已消失（被删/不再有归属列）或已进清单，就必须从本表划掉，否则判点变红。</p>
     */
    private static final Map<String, String> OWNER_TABLE_EXEMPTIONS = Map.of(
            // 第五轮 A 车道 F-04「找不到 Java 构造点」的死表之一。
            "post_mentions",
            "有 CREATE（V2026.10.28.0005）与实体 PostMention，但全仓无 new/save/insert 写点；"
                    + "已被 content_mentions 取代——content_mentions 迁移注释自证『旧表 post_mentions 保留一个"
                    + "发布周期，回填后不再写入』，且其数据由 content_mentions 清单项覆盖。",
            "feedback_admin_reply",
            "有 CREATE（V2026.05.18.1600），但全仓 grep『feedback_admin_reply』零命中——无实体映射、无构造点、"
                    + "无写入 SQL（死表）；语义上 replier_user_id 是处置人（管理员）非 APP 主体，"
                    + "主体反馈正文在 feedback_tickets 清单项里已匿名。",
            "sensitive_word_import_task",
            "有 CREATE（V2026.08.09.0014）且 SensitiveWordImportService 有原生 INSERT，但 operator_id 是执行"
                    + "敏感词库导入的<b>管理员</b>，message 为系统生成的进度/异常摘要（非主体自由文本），"
                    + "属平台内容安全运营记录，非 APP 用户注销射程的个人数据。");

    /**
     * 「无用户归属列、但经外键挂在<b>有归属列的表</b>上（传递闭包，含 {@code users} 这个根）」的
     * <b>显式豁免表</b>（第六轮 W1c 事项二）。
     *
     * <p>这条形状是 F-11 原穷尽门的<b>结构性盲区</b>：门按「CREATE 体里有没有归属列」这一轴派生，
     * 覆盖度就等于那一轴——{@code post_tags} 只有 {@code post_id/tag_name}，于是整张表从未被点名，
     * 而它的父表 {@code posts} 是就地匿名不删行、{@code ON DELETE CASCADE} 永不触发，
     * 主体亲手打的 163 行标签在注销后原样留着。装上门后，同类形状必须<b>逐张</b>点名或在此写理由。</p>
     *
     * <p>纪律与 {@link #OWNER_TABLE_EXEMPTIONS} 同族：只减不增、理由须 ≥20 字、
     * 且该表当下仍必须留在「借归属」集合里且不在清单里，否则判点红。</p>
     */
    private static final Map<String, String> BORROWED_OWNER_TABLE_EXEMPTIONS = Map.of(
            "promo_codes",
            "本表没有用户归属列，只经 fk_promo_codes_creator（V2026.07.28.0008，created_by→users，"
                    + "ON DELETE RESTRICT）挂在 users 上。created_by 存的是<b>发放优惠码的后台运营账号</b>"
                    + "（PromoCodeService 由管理端调用），code/discount/used_count/remark 是平台营销资产而非"
                    + "APP 主体的个人数据；且它是 users 的<b>子</b>表——主体行只墓碑化不删除，"
                    + "RESTRICT 永不触发，不会因此产生孤儿行。");

    /** 一次对账的产出：问题清单 + 覆盖面计数（覆盖面用来防「空转绿」）。 */
    private record Verdict(List<String> problems, int columnsChecked, int statementsChecked) {
    }

    /* ================= 判据 ================= */

    @Test
    @DisplayName("A/B/C：注销清单引用的每张表、每个列名都必须真的存在于迁移链")
    void inventoryResolvesAgainstRealMigrationSchema() {
        Map<String, Set<String>> schema = buildSchema();
        assertFalse(schema.isEmpty(), "迁移链没解析出任何表，判据是空门");
        assertTrue(schema.size() >= 50,
                "只从迁移链解析出 " + schema.size() + " 张表的列集（<50），schema 解析本身失效，拒判");

        Verdict verdict = checkEntries(PersonalDataTables.INVENTORY, schema);

        // 下限：判据不许在空集合上假装绿（清单被整体删掉时 problems 也是空的）。
        assertTrue(PersonalDataTables.INVENTORY.size() >= 25,
                "注销清单只有 " + PersonalDataTables.INVENTORY.size() + " 项（<25），覆盖面不足以谈「完整」");
        assertTrue(verdict.columnsChecked() >= 100,
                "只核对到 " + verdict.columnsChecked() + " 个列名（<100），判据可能空转");
        assertTrue(verdict.statementsChecked() >= 20,
                "只核对到 " + verdict.statementsChecked() + " 条 SQL（<20），判据可能空转");

        assertTrue(verdict.problems().isEmpty(),
                "注销清单与迁移链 schema 对不上（真实注销会在第一条语句就整笔回滚）：\n  "
                        + String.join("\n  ", verdict.problems()));
    }

    @Test
    @DisplayName("反证：同一判据喂进错列名/错表名必须变红，正确项必须绿")
    void detectorBitesOnSyntheticTypo() {
        Map<String, Set<String>> schema = new LinkedHashMap<>();
        schema.put("widget", new LinkedHashSet<>(List.of("id", "user_id", "note")));

        PersonalDataTable badDeclaredColumn = PersonalDataTable.of(
                "decl", "widget", "夹具", ErasureAction.ANONYMISE_IN_PLACE, List.of(),
                List.of("note", "typo_column"),
                List.of("UPDATE widget SET note = 'x' WHERE user_id = {uid}"),
                List.of(), "夹具");
        PersonalDataTable badSetColumn = PersonalDataTable.of(
                "sett", "widget", "夹具", ErasureAction.ANONYMISE_IN_PLACE, List.of(),
                List.of("note"),
                List.of("UPDATE widget SET typo_in_set = 'x' WHERE user_id = {uid}"),
                List.of(), "夹具");
        PersonalDataTable badWhereColumn = PersonalDataTable.of(
                "wher", "widget", "夹具", ErasureAction.DELETE_ROWS, List.of(),
                List.of("note"),
                List.of("DELETE FROM widget WHERE typo_in_where = {uid}"),
                List.of(), "夹具");
        PersonalDataTable badTable = PersonalDataTable.of(
                "ghost", "phantom_table", "夹具", ErasureAction.DELETE_ROWS, List.of(),
                List.of("user_id"), List.of("DELETE FROM phantom_table WHERE user_id = {uid}"),
                List.of(), "夹具");
        PersonalDataTable good = PersonalDataTable.of(
                "ok", "widget", "夹具", ErasureAction.DELETE_ROWS, List.of(),
                List.of("user_id"), List.of("DELETE FROM widget WHERE user_id = {uid}"),
                List.of("SELECT note FROM widget WHERE user_id = {uid}"), "夹具");

        Verdict verdict = checkEntries(
                List.of(badDeclaredColumn, badSetColumn, badWhereColumn, badTable, good), schema);
        List<String> problems = verdict.problems();
        assertTrue(problems.stream().anyMatch(p -> p.startsWith("decl:") && p.contains("typo_column")),
                "清单声明的错列名没被判红：" + problems);
        assertTrue(problems.stream().anyMatch(p -> p.startsWith("sett:") && p.contains("SET 侧列")),
                "SET 子句里的错列名没被判红：" + problems);
        assertTrue(problems.stream().anyMatch(p -> p.startsWith("wher:") && p.contains("WHERE 侧列")),
                "WHERE 子句里的错列名没被判红：" + problems);
        assertTrue(problems.stream().anyMatch(p -> p.startsWith("ghost:") && p.contains("没有 CREATE TABLE")),
                "不存在的表没被判红：" + problems);
        assertTrue(problems.stream().noneMatch(p -> p.startsWith("ok:")),
                "正确清单项被判红了（误报）：" + problems);
        assertTrue(verdict.columnsChecked() >= 6,
                "夹具只核对到 " + verdict.columnsChecked() + " 个列名，判据可能在空转");
    }

    @Test
    @DisplayName("schema 解析器自证：CREATE TABLE / ALTER ADD / DROP COLUMN / 约束行四种形态都要认对")
    void schemaParserHandlesTheColumnMorphs() {
        Map<String, Set<String>> schema = new LinkedHashMap<>();
        applyCreateTable("create table a (id bigint not null primary key, note varchar(20), "
                + "unique key u_note (note), key k (id));", schema);
        assertEquals(Set.of("id", "note"), schema.get("a"), "CREATE TABLE 的列/约束行解析不符");
        applyAlterTable("alter table a add column extra int null, drop column note;", schema);
        assertEquals(Set.of("id", "extra"), schema.get("a"), "ALTER ADD/DROP 解析不符");
        applyAlterTable("alter table a add constraint c_a check (id > 0), add index i_extra (extra);", schema);
        assertEquals(Set.of("id", "extra"), schema.get("a"), "ADD CONSTRAINT/INDEX 不该被当成列");
        applyAlterTable("alter table a add (more_col int, yet_another varchar(8));", schema);
        assertTrue(schema.get("a").contains("more_col") && schema.get("a").contains("yet_another"),
                "ADD (多列) 形态没被解析：" + schema.get("a"));
    }

    /* ================= F-11：schema ↔ 清单 的穷尽性对账（纯静态、不需要真库） ================= */

    /**
     * 第五轮 A 车道 F-11 的结构性根因闭合：A/B/C 只校「清单 → 迁移链」的自洽，从不问「迁移链里还有哪些
     * 带用户归属列的表没被清单点名」——于是清单漏表时门全绿（F-01/F-02/F-03/F-04 就是这么活下来的）。
     *
     * <p>本判点反向派生 T＝「CREATE 体里含用户归属列、且没被后续 DROP TABLE 删掉」的表集合，
     * 断言 {@code T ⊆ 清单点名表 ∪ 显式豁免表}。装上门后，任何「新增一张带归属列的表却既没进清单、
     * 也没写理由」在提交当场变红。</p>
     *
     * <p>防空转下限：解析到的归属表数 / 归属列总数 / 清单点名表数都设了地板，清单被整体清空或解析器失效时
     * 本判点不会假绿。豁免表用同族反漂移纪律：每张豁免表必须<b>当下仍</b>在 T 里、且仍不在清单里，否则划掉。</p>
     */
    @Test
    @DisplayName("F-11 穷尽门：带用户归属列的表必须被清单点名或带理由显式豁免")
    void everyOwnerColumnTableIsNamedOrExempt() {
        Map<String, Set<String>> ownerTables = buildOwnerTables();

        // 防空转下限（归属表 / 归属列 / 清单点名表三处地板）
        assertTrue(ownerTables.size() >= 60,
                "从迁移链只解析出 " + ownerTables.size() + " 张带归属列的表（<60），schema 派生本身失效，拒判");
        int ownerColumnCount = ownerTables.values().stream().mapToInt(Set::size).sum();
        assertTrue(ownerColumnCount >= 80,
                "只解析出 " + ownerColumnCount + " 个归属列引用（<80），判据可能在空转");
        Set<String> named = PersonalDataTables.INVENTORY.stream()
                .map(t -> t.table().toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        assertTrue(named.size() >= 50,
                "注销清单只点名 " + named.size() + " 张不同的表（<50），覆盖面不足以谈『穷尽』");

        List<String> uncovered = new ArrayList<>();
        for (Map.Entry<String, Set<String>> e : ownerTables.entrySet()) {
            String table = e.getKey();
            if (named.contains(table) || OWNER_TABLE_EXEMPTIONS.containsKey(table)) {
                continue;
            }
            uncovered.add(table + "（归属列 " + new ArrayList<>(e.getValue())
                    + "）既没进清单、也没写豁免理由");
        }
        assertTrue(uncovered.isEmpty(),
                "注销清单不穷尽——这些有用户归属列的表没人管（第五轮 F-01/F-02/F-03/F-04 的同一失效形态）：\n  "
                        + String.join("\n  ", uncovered));

        // 反漂移（照 gate-wiring:156-161 / PHANTOM_DML_EXEMPTIONS 的同族纪律）：豁免只能在盘上还成立时存在。
        for (Map.Entry<String, String> exemption : OWNER_TABLE_EXEMPTIONS.entrySet()) {
            String table = exemption.getKey();
            assertTrue(exemption.getValue() != null && exemption.getValue().length() >= 20,
                    "豁免表 " + table + " 没写够理由（<20 字）——豁免不是随手填的名字，必须能被读者反驳");
            assertTrue(ownerTables.containsKey(table),
                    "豁免表 " + table + " 现在已经不在 T 里（表被 DROP 了、或 CREATE 体里不再有归属列）："
                            + "这条豁免必须从 OWNER_TABLE_EXEMPTIONS 划掉");
            assertFalse(named.contains(table),
                    "豁免表 " + table + " 现在已经进了注销清单：豁免与清单并存会造成假绿，必须划掉豁免");
        }
    }

    /* ================= F-11 补形（第六轮 W1c 事项二）：借父表归属的子表 ================= */

    /**
     * 「按归属列派生」的穷尽门看不见<b>自己没有归属列</b>的子表，而这些子表的数据同样属主体：
     * 它靠外键挂在一张有归属列的父表上，主体的行只能<b>借父表</b>找回。
     * {@code post_tags} 就是这一形状的第一张（163 行、逃出 F-11、父表不删行所以级联永不触发）。
     *
     * <p>本判点把轴补成「<b>归属闭包</b>」：T₀＝有归属列的在场表 ∪ {@code users}（主体表自身没有
     * {@code user_id} 列，但它是所有归属的根）；沿外键边 child→parent 取传递闭包；
     * 闭包里每一张表都必须被清单点名或在 {@link #BORROWED_OWNER_TABLE_EXEMPTIONS} 里写理由。
     * 取闭包而不是只看一层，是因为「子表的子表」形状（孙表）与 {@code post_tags} 同理由漏检。</p>
     *
     * <p>两套归属派生（本类自己的 {@link #buildOwnerTables()} 与 {@link ErasureMigrationGraph#ownerTables()}）
     * 必须<b>逐表逐列相等</b>：判点增加了第二个解析器，就必须钉住它们不漂移，
     * 否则同一件事会有两个答案，而其中一个是绿的。</p>
     */
    @Test
    @DisplayName("F-11 补形：无归属列但经外键挂在归属表上的子表，必须点名或带理由豁免")
    void everyBorrowedOwnerTableIsNamedOrExempt() {
        ErasureMigrationGraph graph = ErasureMigrationGraph.load(ErasureMigrationGraph.locateMigrationDir());

        // 0) 反漂移：两个解析器派生的归属表集合必须完全一致
        Map<String, Set<String>> legacy = buildOwnerTables();
        Map<String, Set<String>> modern = graph.ownerTables();
        assertEquals(legacy.keySet(), modern.keySet(),
                "两个归属列解析器派生出的表集合已分叉（只信哪个？判点必须先解决这件事）：\n"
                        + "只在旧解析器=" + diff(legacy.keySet(), modern.keySet())
                        + "\n只在新解析器=" + diff(modern.keySet(), legacy.keySet()));
        for (Map.Entry<String, Set<String>> e : legacy.entrySet()) {
            assertEquals(e.getValue(), modern.get(e.getKey()),
                    "归属表 " + e.getKey() + " 的归属列集在两个解析器里不一致");
        }

        // 1) 归属闭包（沿外键 child→parent 传递；实现与夹具自证共用同一个 borrowedClosureOf）
        List<String> borrowedList = borrowedClosureOf(graph);
        Set<String> borrowed = new LinkedHashSet<>(borrowedList);

        // 2) 防空转地板：这一形状必须真的存在，否则本判点是在空集上假装绿
        assertTrue(borrowed.size() >= 4,
                "「借归属」集合只派生出 " + borrowed.size() + " 张表（实测 4：post_tags、temp_chat_message、"
                        + "temp_chat_contact_exchange、promo_codes），外键图解析可能失效，拒判");
        assertTrue(borrowed.contains("post_tags"),
                "借归属集合里没有 post_tags——外键解析或归属轴本身坏了（它是这条门的存在理由）");

        // 3) 穷尽断言
        Set<String> named = PersonalDataTables.INVENTORY.stream()
                .map(t -> t.table().toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        List<String> uncovered = new ArrayList<>();
        for (String table : borrowed) {
            if (named.contains(table) || BORROWED_OWNER_TABLE_EXEMPTIONS.containsKey(table)
                    || OWNER_TABLE_EXEMPTIONS.containsKey(table)) {
                continue;
            }
            List<String> parents = new ArrayList<>();
            for (com.campuslove.api.privacy.ErasureMigrationGraph.ForeignKey fk : graph.edges()) {
                if (fk.child().equals(table)) {
                    parents.add(fk.column() + "→" + fk.parent() + "(" + fk.onDelete() + ")");
                }
            }
            uncovered.add(table + "（借 " + parents + " 的归属）既没进清单、也没写豁免理由");
        }
        assertTrue(uncovered.isEmpty(),
                "注销清单对「借父表归属的子表」不穷尽（post_tags 163 行的同一形状）：\n  "
                        + String.join("\n  ", uncovered));

        // 4) 反漂移：豁免只在该表当下仍然「借归属且未被点名」时成立
        for (Map.Entry<String, String> exemption : BORROWED_OWNER_TABLE_EXEMPTIONS.entrySet()) {
            String table = exemption.getKey();
            assertTrue(exemption.getValue().length() >= 20,
                    "借归属豁免表 " + table + " 的理由没写够（<20 字）");
            assertTrue(borrowed.contains(table),
                    "豁免表 " + table + " 现在已经不在借归属闭包里（外键被撤/表被 DROP/自己有了归属列）："
                            + "这条豁免必须划掉");
            assertFalse(named.contains(table),
                    "豁免表 " + table + " 现在已经进了注销清单：豁免与清单并存会假绿，必须划掉豁免");
        }
    }

    @Test
    @DisplayName("借归属判点的解析器自证：一层与两层都要认，无外键的孤儿表不许被牵连进来")
    void borrowedOwnerClosureIsTransitiveAndOrderAware() {
        ErasureMigrationGraph g = new ErasureMigrationGraph();
        // 故意把孙表建在子表<b>之前</b>：这样「只扫一遍外键边」的实现会先看到
        // grandchild→child（此时 child 还没进集合）而漏掉孙表，只有真正的传递闭包才认得出它。
        // （第一版夹具按 child→grandchild 的顺序写，一遍扫描恰好也能过 ⇒ 变异 M4 抓不到，
        //  这条顺序就是那次没红换来的加固。）
        g.applyDdl("CREATE TABLE owner_tbl (id bigint, user_id bigint, PRIMARY KEY (id));"
                + "CREATE TABLE grandchild_no_owner (id bigint, child_id bigint,"
                + "  FOREIGN KEY (child_id) REFERENCES child_no_owner(id) ON DELETE CASCADE);"
                + "CREATE TABLE child_no_owner (id bigint, owner_id bigint,"
                + "  FOREIGN KEY (owner_id) REFERENCES owner_tbl(id) ON DELETE CASCADE);"
                + "CREATE TABLE unrelated (id bigint, note varchar(10));");
        List<String> closure = borrowedClosureOf(g);
        assertTrue(closure.contains("child_no_owner"), "一层借归属没被认出：" + closure);
        assertTrue(closure.contains("grandchild_no_owner"), "两层（子表的子表）借归属没被认出：" + closure);
        assertFalse(closure.contains("unrelated"), "无外键的表不该进借归属闭包：" + closure);
        assertFalse(closure.contains("owner_tbl"), "自身有归属列的表不该被算成『借』归属：" + closure);

        // 建后即删的父表不该继续把归属借给子表（在场判定按文本位置）
        ErasureMigrationGraph dropped = new ErasureMigrationGraph();
        dropped.applyDdl("CREATE TABLE p1 (id bigint, user_id bigint);"
                + "CREATE TABLE c1 (id bigint, p1_id bigint, FOREIGN KEY (p1_id) REFERENCES p1(id));"
                + "DROP TABLE p1; DROP TABLE c1;");
        assertFalse(borrowedClosureOf(dropped).contains("c1"),
                "已 DROP 的借归属表仍被算进闭包（在场判定失效）");
    }

    /** 借归属闭包（与 {@link #everyBorrowedOwnerTableIsNamedOrExempt} 同一条路，供夹具复用）。 */
    private static List<String> borrowedClosureOf(ErasureMigrationGraph graph) {
        Set<String> linked = new LinkedHashSet<>(graph.ownerTables().keySet());
        linked.add("users");
        boolean grew = true;
        while (grew) {
            grew = false;
            for (com.campuslove.api.privacy.ErasureMigrationGraph.ForeignKey fk : graph.edges()) {
                if (linked.contains(fk.parent()) && graph.existingTables().contains(fk.child())
                        && linked.add(fk.child())) {
                    grew = true;
                }
            }
        }
        List<String> borrowed = new ArrayList<>(linked);
        borrowed.removeAll(graph.ownerTables().keySet());
        borrowed.sort(Comparator.naturalOrder());
        return borrowed;
    }

    /* ================= F-11 第三轴（第七轮 R7-B）：「列名点名引用清单表、外键图上却无边」的表 ================= */

    /**
     * 「列名 = {@code <清单表名>_id}（如 {@code media_asset_id}→{@code media_asset}）但 FK 图上没有
     * 该表→该清单表 的边」的<b>显式豁免表</b>（第七轮 R7-B）。
     *
     * <p>这条形状是前两轴共同的<b>结构性盲区</b>：一张表既没有用户归属列（第一轴派生不到）、
     * 又没有任何外键（第二轴的闭包走不到），但它的列名<b>明确点名</b>了一张清单表——
     * {@code temp_chat_media_holds.media_asset_id} 就是第一张（管理员举报保留表，
     * {@code created_by} 存管理员不是主体、{@code media_asset_id} 无 FK 指向 {@code media_asset}，
     * 主体关联只有 {@code media_asset_id → media_asset.user_id}）。本轴按列名约定把这类「约定式引用」
     * 找回来：全库枚举所有命中表，逐张点名进清单或在此写理由（≥20 字）。</p>
     *
     * <p>纪律与 {@link #OWNER_TABLE_EXEMPTIONS} / {@link #BORROWED_OWNER_TABLE_EXEMPTIONS} 同族：
     * 只减不增、理由须 ≥20 字、且该表当下仍必须是本轴命中（列还在、清单表还叫这名、边仍然没有）
     * 且不在清单里，否则判点红。<b>当前为空表</b>：R7-B 装轴时全库枚举只命中
     * {@code temp_chat_media_holds} 一张（见 {@link #everyNamedManifestIdReferenceWithoutFkIsNamedOrExempt}），
     * 它进了清单（借 {@code media_asset.user_id} 删行），无需豁免。</p>
     */
    private static final Map<String, String> NAMED_REFERENCE_TABLE_EXEMPTIONS = Map.of();

    /**
     * F-11 第三轴穷尽门（R7-B）：列名按 {@code <清单表名>_id} 约定指向清单表、而外键图上没有
     * 该表→该清单表 边的表，必须被清单点名或在豁免表里写理由。
     *
     * <p>派生复用 {@link ErasureMigrationGraph}（不写第二台解析器）：列集口径与第一轴一致
     * （只认 CREATE 体里的列），外键边口径与第二轴一致（5 种声明形态全认、按文本位置施加）。
     * 有 FK 边的同类列不在此轴点名——它们已由「借归属闭包」轴覆盖，这里再点名只会让一张表
     * 有两个答案。</p>
     */
    @Test
    @DisplayName("F-11 第三轴：列名=清单表名_id 且外键图无边的表，必须点名或带理由豁免")
    void everyNamedManifestIdReferenceWithoutFkIsNamedOrExempt() {
        ErasureMigrationGraph graph = ErasureMigrationGraph.load(ErasureMigrationGraph.locateMigrationDir());
        Set<String> manifestTables = PersonalDataTables.INVENTORY.stream()
                .map(t -> t.table().toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        List<String> hits = namedReferenceHits(graph, manifestTables);

        // 防空转地板：这一形状必须真的存在（temp_chat_media_holds 是这条门的存在理由）
        assertTrue(hits.contains("temp_chat_media_holds.media_asset_id→media_asset"),
                "第三轴没命中 temp_chat_media_holds.media_asset_id→media_asset——列集/外键图解析或轴本身坏了："
                        + hits);
        assertTrue(hits.size() >= 1,
                "第三轴在全库上 0 命中（R7-B 装轴时实测 1：temp_chat_media_holds.media_asset_id），"
                        + "轴在空集合上假装绿，拒判");

        Set<String> hitTables = new LinkedHashSet<>();
        for (String hit : hits) {
            hitTables.add(hit.substring(0, hit.indexOf('.')));
        }
        List<String> uncovered = new ArrayList<>();
        for (String table : hitTables) {
            if (manifestTables.contains(table) || NAMED_REFERENCE_TABLE_EXEMPTIONS.containsKey(table)
                    || OWNER_TABLE_EXEMPTIONS.containsKey(table)
                    || BORROWED_OWNER_TABLE_EXEMPTIONS.containsKey(table)) {
                continue;
            }
            uncovered.add(table + "（列 " + hitsOf(hits, table) + " 按名字指向清单表、外键图上却无边）"
                    + "既没进清单、也没写豁免理由");
        }
        assertTrue(uncovered.isEmpty(),
                "注销清单对「按列名引用清单表但无外键」的表不穷尽（temp_chat_media_holds 的同一形状）：\n  "
                        + String.join("\n  ", uncovered)
                        + "\n全库本轴命中清单（对照用）：" + hits);

        // 反漂移（与前两轴同族纪律）：豁免只在该表当下仍是本轴命中、且未被点名时成立
        for (Map.Entry<String, String> exemption : NAMED_REFERENCE_TABLE_EXEMPTIONS.entrySet()) {
            String table = exemption.getKey();
            assertTrue(exemption.getValue().length() >= 20,
                    "第三轴豁免表 " + table + " 的理由没写够（<20 字）");
            assertTrue(hitTables.contains(table),
                    "第三轴豁免表 " + table + " 已经不是本轴命中（列被删/改名、清单表更名、或外键边补上了）："
                            + "这条豁免必须划掉");
            assertFalse(manifestTables.contains(table),
                    "第三轴豁免表 " + table + " 已经进了注销清单：豁免与清单并存会假绿，必须划掉豁免");
        }
    }

    /** 取命中清单里属于某张表的全部条目（拼进失败信息用）。 */
    private static List<String> hitsOf(List<String> hits, String table) {
        return hits.stream().filter(h -> h.startsWith(table + ".")).toList();
    }

    /**
     * 第三轴判点的解析器自证（阴性/阳性对照，注入假 DDL）：
     * 有 {@code media_asset_id} 无 FK ⇒ 必须命中；同列但有 FK（CREATE 体内或 ALTER 补建都算）⇒ 不命中；
     * 指向非清单表 / 自指 ⇒ 不命中。
     */
    @Test
    @DisplayName("第三轴自证：无 FK 的点名列必须命中，同列有 FK（两种声明形态）不命中，非清单目标不命中")
    void namedReferenceDetectorBitesOnSyntheticDdl() {
        ErasureMigrationGraph g = new ErasureMigrationGraph().applyDdl(
                "CREATE TABLE media_asset (id bigint, user_id bigint, PRIMARY KEY (id));"
                        + "CREATE TABLE hold_no_fk (id bigint, media_asset_id bigint);"
                        + "CREATE TABLE hold_with_fk (id bigint, media_asset_id bigint,"
                        + "  FOREIGN KEY (media_asset_id) REFERENCES media_asset(id) ON DELETE CASCADE);"
                        + "CREATE TABLE stray (id bigint, widget_id bigint);");
        g.applyDdl("CREATE TABLE hold_alter_fk (id bigint, media_asset_id bigint);"
                + "ALTER TABLE hold_alter_fk ADD CONSTRAINT fk_haf"
                + " FOREIGN KEY (media_asset_id) REFERENCES media_asset (id);");
        Set<String> miniManifest = Set.of("media_asset");

        List<String> hits = namedReferenceHits(g, miniManifest);
        assertTrue(hits.contains("hold_no_fk.media_asset_id→media_asset"),
                "有 media_asset_id 而无 FK 的表必须被第三轴命中：" + hits);
        assertFalse(hits.contains("hold_with_fk.media_asset_id→media_asset"),
                "同列但有 CREATE 体内 FK（借归属闭包轴已覆盖）不该被第三轴点名：" + hits);
        assertFalse(hits.contains("hold_alter_fk.media_asset_id→media_asset"),
                "同列但 FK 是 ALTER 补建的（解析器必须认全 5 种形态，否则这里会重复点名）不该被第三轴点名：" + hits);
        assertFalse(hits.stream().anyMatch(h -> h.startsWith("stray.")),
                "列名指向非清单表（widget_id→widget 不在清单里）不该被命中：" + hits);
    }

    /**
     * 第三轴派生（真实清单与夹具共用同一条路）：在场表 T 的 CREATE 体列 c 满足
     * {@code c = <清单表>_id}、目标≠T、且外键图上没有 T→目标 的边（任意列）⇒ 命中。
     * 输出形如 {@code temp_chat_media_holds.media_asset_id→media_asset}，按表/列排序稳定。
     */
    private static List<String> namedReferenceHits(ErasureMigrationGraph graph, Set<String> manifestTables) {
        List<String> hits = new ArrayList<>();
        for (String table : graph.existingTables().stream().sorted().toList()) {
            for (String column : graph.columnsByTable()
                    .getOrDefault(table, Set.of()).stream().sorted().toList()) {
                if (!column.endsWith("_id") || column.equals("id")) {
                    continue;
                }
                String target = column.substring(0, column.length() - 3);
                if (target.equals(table) || !manifestTables.contains(target)) {
                    continue;
                }
                boolean edgeExists = graph.edges().stream()
                        .anyMatch(fk -> fk.child().equals(table) && fk.parent().equals(target));
                if (!edgeExists) {
                    hits.add(table + "." + column + "→" + target);
                }
            }
        }
        return hits;
    }

    private static Set<String> diff(Set<String> a, Set<String> b) {
        Set<String> out = new LinkedHashSet<>(a);
        out.removeAll(b);
        return out;
    }

    /**
     * 穷尽门解析器自证（第五轮 C 泳道的「循环补列盲区」约束）：
     * 1. 建后即删（含同文件 drop→create 的幂等重建）要按<b>文本位置</b>判定，不能被后写的 create 复活、
     *    也不能被前写的 drop 误杀；
     * 2. 归属列检测只认 CREATE 体——{@code CALL add_version_column_if_missing('t')} 这类循环补列
     *    不得凭空造出归属列（否则会把无主表假报成有主、或把清单点名表漏掉）。
     */
    @Test
    @DisplayName("穷尽门解析器：建后即删按序判定、循环补列不伪造归属列")
    void exhaustivenessParserIsOrderAwareAndLoopProof() {
        Map<String, Set<String>> ownerCols = new LinkedHashMap<>();
        Set<String> exists = new LinkedHashSet<>();

        // 建后即删：最终不存在，不应进 T
        applySchemaText("create table gone (id bigint, user_id bigint);"
                + "drop table gone;", ownerCols, exists);
        assertFalse(ownerTablesFrom(ownerCols, exists).containsKey("gone"),
                "已 DROP 的表仍被算作带归属列的在场表");

        // 同文件先 drop 再 create（create_temp_chat_tables.sql 的幂等形态）：最终存在且在 T
        applySchemaText("drop table if exists rebuilt;"
                + "create table rebuilt (id bigint, author_id bigint);", ownerCols, exists);
        assertTrue(ownerTablesFrom(ownerCols, exists).containsKey("rebuilt"),
                "drop→create 同文件应判定为在场");
        assertTrue(ownerTablesFrom(ownerCols, exists).get("rebuilt").contains("author_id"),
                "create 体里的归属列没被识别");

        // 循环补列过程形态：CREATE 体里没有归属列，只有 CALL add_*_column_if_missing 补的版本列——
        // 归属检测只读 CREATE 体，必须把这种表挡在 T 外（不伪造 user 归属）。
        applySchemaText("create table looped (id bigint);"
                + "call add_version_column_if_missing('looped');"
                + "call add_created_at_column_if_missing_v6('looped');", ownerCols, exists);
        assertFalse(ownerTablesFrom(ownerCols, exists).containsKey("looped"),
                "只被循环补列过程补了非归属列的表，不应因解析器盲区被算进 T");
    }

    /** 把一段迁移文本按<b>文本位置</b>顺序施加到 {@code ownerCols}/{@code exists}（create 记归属列、drop 撤在场）。 */
    private static void applySchemaText(String text, Map<String, Set<String>> ownerCols,
                                        Set<String> exists) {
        String stripped = stripSqlComments(text);
        List<SchemaEvent> events = new ArrayList<>();
        for (Matcher m = DROP_TABLE.matcher(stripped); m.find(); ) {
            events.add(new SchemaEvent(m.start(), false, m.group(1).toLowerCase(Locale.ROOT), null));
        }
        for (Matcher m = CREATE_TABLE.matcher(stripped); m.find(); ) {
            String table = m.group(1).toLowerCase(Locale.ROOT);
            Set<String> owners = new LinkedHashSet<>();
            for (String column : columnsOfCreateBody(stripped, m)) {
                if (isOwnerColumn(column)) {
                    owners.add(column);
                }
            }
            events.add(new SchemaEvent(m.start(), true, table, owners));
        }
        events.sort(Comparator.comparingInt(e -> e.pos));
        for (SchemaEvent e : events) {
            if (e.create) {
                ownerCols.computeIfAbsent(e.table, k -> new LinkedHashSet<>()).addAll(e.owners);
                exists.add(e.table);
            } else {
                exists.remove(e.table);
            }
        }
    }

    /** 当前在场的带归属列表集合（只有 CREATE 体里出现过归属列、且没被后续 DROP 掉的表才进 T）。 */
    private static Map<String, Set<String>> ownerTablesFrom(Map<String, Set<String>> ownerCols,
                                                             Set<String> exists) {
        Map<String, Set<String>> t = new LinkedHashMap<>();
        for (Map.Entry<String, Set<String>> e : ownerCols.entrySet()) {
            if (exists.contains(e.getKey()) && !e.getValue().isEmpty()) {
                t.put(e.getKey(), e.getValue());
            }
        }
        return t;
    }

    /** 从迁移链派生「带用户归属列的在场表」（跨文件按版本序、文件内按文本序处理 CREATE/DROP）。 */
    private static Map<String, Set<String>> buildOwnerTables() {
        Path dir = locateMigrationDir();
        List<Path> files;
        try (Stream<Path> stream = Files.list(dir)) {
            files = stream.filter(p -> p.getFileName().toString().endsWith(".sql"))
                    .sorted(Comparator.comparing(ErasureSchemaAlignmentTest::versionKey)
                            .thenComparing(p -> p.getFileName().toString()))
                    .toList();
        } catch (IOException ex) {
            throw new IllegalStateException("列不出迁移目录 " + dir + "：", ex);
        }
        Map<String, Set<String>> ownerCols = new LinkedHashMap<>();
        Set<String> exists = new LinkedHashSet<>();
        for (Path file : files) {
            String text;
            try {
                text = Files.readString(file, StandardCharsets.UTF_8);
            } catch (IOException ex) {
                throw new IllegalStateException("读不了迁移文件 " + file + "：", ex);
            }
            applySchemaText(text, ownerCols, exists);
        }
        return ownerTablesFrom(ownerCols, exists);
    }

    /** 取一段 CREATE TABLE 体里的全部列名（复用 {@link #columnName} 的类型词/约束行排除逻辑）。 */
    private static List<String> columnsOfCreateBody(String text, Matcher createMatcher) {
        int open = createMatcher.end() - 1;
        int close = matchingParen(text, open);
        if (close < 0) {
            return List.of();
        }
        List<String> cols = new ArrayList<>();
        for (String part : splitTopLevel(text.substring(open + 1, close))) {
            String first = columnName(part.replaceAll("^\\s*\\(+", ""));
            if (first != null && !NOT_A_COLUMN.contains(first)) {
                cols.add(first);
            }
        }
        return cols;
    }

    /** 迁移文件内按文本位置排队的 CREATE/DROP 事件。 */
    private static final class SchemaEvent {
        final int pos;
        final boolean create;
        final String table;
        final Set<String> owners;

        SchemaEvent(int pos, boolean create, String table, Set<String> owners) {
            this.pos = pos;
            this.create = create;
            this.table = table;
            this.owners = owners;
        }
    }

    /* ================= 对账主体（纯函数，真实清单与夹具共用同一条路） ================= */

    private static Verdict checkEntries(List<PersonalDataTable> entries, Map<String, Set<String>> schema) {
        List<String> problems = new ArrayList<>();
        int columnsChecked = 0;
        int statementsChecked = 0;
        for (PersonalDataTable entry : entries) {
            String table = entry.table().toLowerCase(Locale.ROOT);
            Set<String> tableColumns = schema.get(table);
            if (tableColumns == null) {
                problems.add(entry.key() + ": 清单项的物理表 " + entry.table()
                        + " 在迁移链里没有 CREATE TABLE（真实注销会在第一条语句就炸）");
            }
            for (String column : entry.identifyingColumns()) {
                columnsChecked++;
                if (tableColumns != null && !tableColumns.contains(column.toLowerCase(Locale.ROOT))) {
                    problems.add(entry.key() + ": 声明要消灭的列 " + entry.table() + "." + column
                            + " 在库里不存在（该表的实际列集里没有它）");
                }
            }
            List<String> sqls = new ArrayList<>(entry.statements());
            sqls.addAll(entry.fileUrlSelects());
            for (String sql : sqls) {
                if (!looksLikeStatement(sql)) {
                    continue;
                }
                statementsChecked++;
                for (String ref : tablesIn(sql)) {
                    if (!schema.containsKey(ref)) {
                        problems.add(entry.key() + ": 语句「" + abbreviate(sql)
                                + "」引用了迁移链里不存在的表 " + ref);
                    }
                }
                Set<String> refs = tablesIn(sql);
                if (refs.size() != 1 || sql.toUpperCase(Locale.ROOT).contains("JOIN")) {
                    continue;
                }
                String single = refs.iterator().next();
                Set<String> known = schema.get(single);
                if (known == null) {
                    continue;
                }
                for (String column : setColumnsProbed(sql)) {
                    columnsChecked++;
                    if (!known.contains(column)) {
                        problems.add(entry.key() + ": 语句「" + abbreviate(sql) + "」的 SET 侧列 "
                                + single + "." + column + " 在库里不存在");
                    }
                }
                for (String column : whereColumnsProbed(sql)) {
                    columnsChecked++;
                    if (!known.contains(column)) {
                        problems.add(entry.key() + ": 语句「" + abbreviate(sql) + "」的 WHERE 侧列 "
                                + single + "." + column + " 在库里不存在");
                    }
                }
                String selected = selectSingleColumn(sql);
                if (selected != null) {
                    columnsChecked++;
                    if (!known.contains(selected)) {
                        problems.add(entry.key() + ": 语句「" + abbreviate(sql) + "」SELECT 的列 "
                                + single + "." + selected + " 在库里不存在");
                    }
                }
            }
        }
        return new Verdict(problems, columnsChecked, statementsChecked);
    }

    /* ================= 迁移链 → schema ================= */

    /* ================= 迁移链 → schema ================= */

    /**
     * {@code ALTER TABLE t ADD [COLUMN] c} 的成对形态——**含写在字符串里的幂等 DDL**。
     *
     * <p>本仓大量迁移走这个形状：
     * {@code SET @sql := IF(@has_col = 0, 'ALTER TABLE users ADD COLUMN campus_name ...', 'SELECT 1');
     * PREPARE stmt FROM @sql;}。列的 DDL 因此在字符串字面量里，按「语句」解析会整段看不见。
     * 这里直接配对 {@code ALTER TABLE + ADD COLUMN}，字符串内外都认。</p>
     */
    private static final Pattern ALTER_ADD_PAIR = Pattern.compile(
            "ALTER\\s+TABLE\\s+`?([A-Za-z0-9_]+)`?\\s+(?:ADD|CHANGE|MODIFY)\\s+(?:COLUMN\\s+|COLUMNS\\s+)?"
                    + "`?([A-Za-z][A-Za-z0-9_]*)`?",
            Pattern.CASE_INSENSITIVE);

    /**
     * 幂等「加列」存储过程的调用形态。
     *
     * <p>不写死过程名：本仓的链里有 {@code add_column_if_missing}（22 次）、
     * {@code add_version_column_if_missing}（65 次）、
     * {@code add_created_at_column_if_missing}（52 次）、
     * {@code add_updated_at_column_if_missing}（31 次）等同族过程，
     * 签名都是 {@code ('表名','列名',定义)}。逐个列名字面量去枚举是会被新过程名漏掉的，
     * 所以按族匹配（第五轮 C 泳道指出这一点）。</p>
     */
    private static final Pattern ADD_COLUMN_PROC = Pattern.compile(
            "add(?:_[a-z0-9_]*?)?_column_if_missing(?:_v\\d+)?\\(\\s*'([A-Za-z0-9_]+)'\\s*,\\s*'([A-Za-z0-9_]+)'",
            Pattern.CASE_INSENSITIVE);

    /** {@code ALTER TABLE t DROP [COLUMN] c} 的成对形态（不认 DROP INDEX/KEY/CONSTRAINT）。 */
    private static final Pattern DROP_COLUMN_ALL = Pattern.compile(
            "ALTER\\s+TABLE\\s+`?([A-Za-z0-9_]+)`?\\s+DROP\\s+(?:COLUMN\\s+|COLUMNS\\s+)?`?([A-Za-z][A-Za-z0-9_]*)`?",
            Pattern.CASE_INSENSITIVE);

    private static Map<String, Set<String>> buildSchema() {
        Path dir = locateMigrationDir();
        List<Path> files;
        try (Stream<Path> stream = Files.list(dir)) {
            files = stream.filter(p -> p.getFileName().toString().endsWith(".sql"))
                    .sorted(Comparator.comparing(ErasureSchemaAlignmentTest::versionKey)
                            .thenComparing(p -> p.getFileName().toString()))
                    .toList();
        } catch (IOException ex) {
            throw new IllegalStateException("列不出迁移目录 " + dir + "：", ex);
        }
        Map<String, Set<String>> schema = new LinkedHashMap<>();
        for (Path file : files) {
            String text;
            try {
                text = stripSqlComments(Files.readString(file, StandardCharsets.UTF_8));
            } catch (IOException ex) {
                throw new IllegalStateException("读不了迁移文件 " + file + "：", ex);
            }
            for (Matcher m = CREATE_TABLE_LIKE.matcher(text); m.find(); ) {
                Set<String> src = schema.get(m.group(2).toLowerCase(Locale.ROOT));
                if (src != null) {
                    schema.put(m.group(1).toLowerCase(Locale.ROOT), new LinkedHashSet<>(src));
                }
            }
            for (Matcher m = CREATE_TABLE.matcher(text); m.find(); ) {
                applyCreateTable(text, m, schema);
            }
            // 三种「加列」形态：字符串外按语句解析、字符串内按成对解析、幂等存储过程按调用解析
            for (Matcher m = ALTER_TABLE.matcher(text); m.find(); ) {
                applyAlterTable(m.group(0), schema);
            }
            for (Matcher m = ALTER_ADD_PAIR.matcher(text); m.find(); ) {
                String column = m.group(2).toLowerCase(Locale.ROOT);
                if (!NOT_A_COLUMN.contains(column)) {
                    table(schema, m.group(1)).add(column);
                }
            }
            for (Matcher m = ADD_COLUMN_PROC.matcher(text); m.find(); ) {
                table(schema, m.group(1)).add(m.group(2).toLowerCase(Locale.ROOT));
            }
            for (Matcher m = DROP_COLUMN_ALL.matcher(text); m.find(); ) {
                Set<String> cols = schema.get(m.group(1).toLowerCase(Locale.ROOT));
                if (cols != null) {
                    cols.remove(m.group(2).toLowerCase(Locale.ROOT));
                }
            }
        }
        return schema;
    }

    private static Set<String> table(Map<String, Set<String>> schema, String name) {
        // 只对「已被 CREATE TABLE 过」的表记账：ALTER 一张链里从没建过的表本身就是问题，
        // 但那是 entity-ddl-drift 门的射程；这里若凭空造出表名，会让「表不存在」判点失去意义。
        Set<String> cols = schema.get(name.toLowerCase(Locale.ROOT));
        return cols == null ? new LinkedHashSet<>() : cols;
    }

    /** 迁移文件名 {@code V2026.10.13.0001__x.sql} → 可直接比较的定长版本键。 */
    private static String versionKey(Path file) {
        String name = file.getFileName().toString();
        int sep = name.indexOf("__");
        String version = sep > 0 ? name.substring(1, sep) : name;
        String[] parts = version.split("\\.");
        StringBuilder key = new StringBuilder();
        for (int i = 0; i < 4; i++) {
            String p = i < parts.length ? parts[i] : "0";
            key.append(String.format(Locale.ROOT, "%12s", p).replace(' ', '0'));
        }
        return key.toString();
    }

    private static Path locateMigrationDir() {
        Path cursor = Path.of("").toAbsolutePath();
        for (int i = 0; i < 6 && cursor != null; i++) {
            Path candidate = cursor.resolve("database").resolve("flyway").resolve("sql");
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
            cursor = cursor.getParent();
        }
        throw new IllegalStateException(
                "从 " + Path.of("").toAbsolutePath() + " 向上找不到 database/flyway/sql，"
                        + "本判据需要完整迁移链才能运行（工作目录形态变了？）");
    }

    private static void applyCreateTable(String text, Matcher m, Map<String, Set<String>> schema) {
        String table = m.group(1).toLowerCase(Locale.ROOT);
        int open = m.end() - 1;
        int close = matchingParen(text, open);
        if (close < 0) {
            return;
        }
        Set<String> cols = schema.computeIfAbsent(table, k -> new LinkedHashSet<>());
        for (String part : splitTopLevel(text.substring(open + 1, close))) {
            String first = columnName(part.replaceAll("^\\s*\\(+", ""));
            if (first != null && !NOT_A_COLUMN.contains(first)) {
                cols.add(first);
            }
        }
    }

    private static void applyCreateTable(String ddl, Map<String, Set<String>> schema) {
        Matcher m = CREATE_TABLE.matcher(ddl);
        if (m.find()) {
            applyCreateTable(ddl, m, schema);
        }
    }

    private static void applyAlterTable(String ddl, Map<String, Set<String>> schema) {
        Matcher m = ALTER_TABLE.matcher(ddl);
        if (!m.find()) {
            return;
        }
        Set<String> cols = schema.get(m.group(1).toLowerCase(Locale.ROOT));
        if (cols == null) {
            return;
        }
        for (String clauseRaw : splitTopLevel(m.group(2))) {
            String clause = clauseRaw.trim();
            String upper = clause.toUpperCase(Locale.ROOT);
            if (upper.startsWith("DROP")) {
                if (knownObjectKind(upper)) {
                    continue;
                }
                Matcher d = Pattern.compile("^DROP\\s+(?:COLUMN\\s+)?`?([A-Za-z0-9_]+)`?",
                        Pattern.CASE_INSENSITIVE).matcher(clause);
                if (d.find()) {
                    cols.remove(d.group(1).toLowerCase(Locale.ROOT));
                }
                continue;
            }
            if (upper.startsWith("ADD CONSTRAINT") || upper.startsWith("ADD PRIMARY")
                    || upper.startsWith("ADD UNIQUE") || upper.startsWith("ADD KEY")
                    || upper.startsWith("ADD INDEX") || upper.startsWith("ADD FULLTEXT")
                    || upper.startsWith("ADD FOREIGN") || upper.startsWith("ADD CHECK")) {
                continue;
            }
            if (!(upper.startsWith("ADD") || upper.startsWith("CHANGE") || upper.startsWith("MODIFY"))) {
                continue;
            }
            // 只有「ADD (多列)」才是列清单。必须锚定在子句开头：
            // `ADD COLUMN future_plan_tags JSON DEFAULT (JSON_ARRAY())` 也以一个右括号收尾，
            // 不锚定就会把 JSON_ARRAY 当成列名、把真列名丢掉（本门第一版即如此）。
            Matcher inner = Pattern.compile("^ADD\\s+(?:COLUMN\\s+|COLUMNS\\s+)?\\(([\\s\\S]*)\\)\\s*$",
                    Pattern.CASE_INSENSITIVE).matcher(clause);
            if (inner.find()) {
                for (String part : splitTopLevel(inner.group(1))) {
                    String first = columnName(part);
                    if (first != null) {
                        cols.add(first);
                    }
                }
                continue;
            }
            Matcher one = Pattern.compile("^(?:ADD|CHANGE|MODIFY)\\s+(?:COLUMN\\s+)?`?([A-Za-z0-9_]+)`?",
                    Pattern.CASE_INSENSITIVE).matcher(clause);
            if (one.find()) {
                cols.add(one.group(1).toLowerCase(Locale.ROOT));
            }
        }
    }

    /** {@code DROP INDEX/KEY/CONSTRAINT/...} 与 {@code DROP col} 的区分。 */
    private static boolean knownObjectKind(String upperClause) {
        return upperClause.startsWith("DROP INDEX") || upperClause.startsWith("DROP KEY")
                || upperClause.startsWith("DROP CONSTRAINT") || upperClause.startsWith("DROP PRIMARY")
                || upperClause.startsWith("DROP FOREIGN") || upperClause.startsWith("DROP CHECK")
                || upperClause.startsWith("DROP UNIQUE");
    }

    /* ================= SQL → 表名 / 列名 ================= */

    private static boolean looksLikeStatement(String sql) {
        String s = sql.trim();
        return s.regionMatches(true, 0, "SELECT", 0, 6)
                || s.regionMatches(true, 0, "INSERT", 0, 6)
                || s.regionMatches(true, 0, "UPDATE", 0, 6)
                || s.regionMatches(true, 0, "DELETE", 0, 6)
                || s.regionMatches(true, 0, "REPLACE", 0, 7);
    }

    private static Set<String> tablesIn(String sql) {
        Set<String> out = new LinkedHashSet<>();
        for (Matcher m = TABLE_REF.matcher(sql); m.find(); ) {
            String name = m.group(1).toLowerCase(Locale.ROOT);
            if (!SQL_NOISE.contains(name)) {
                out.add(name);
            }
        }
        return out;
    }

    /** SET 子句里的目标列。 */
    private static List<String> setColumnsProbed(String sql) {
        List<String> out = new ArrayList<>();
        Matcher set = Pattern.compile("\\bSET\\b([\\s\\S]*?)(?:\\bWHERE\\b|$)",
                Pattern.CASE_INSENSITIVE).matcher(sql);
        if (!set.find()) {
            return out;
        }
        for (String part : splitTopLevel(set.group(1))) {
            Matcher m = Pattern.compile("^\\s*`?([A-Za-z0-9_]+)`?\\s*=",
                    Pattern.CASE_INSENSITIVE).matcher(part);
            if (m.find() && !SQL_NOISE.contains(m.group(1).toLowerCase(Locale.ROOT))) {
                out.add(m.group(1).toLowerCase(Locale.ROOT));
            }
        }
        return out;
    }

    /** WHERE 子句里出现在比较符左侧的列。 */
    private static List<String> whereColumnsProbed(String sql) {
        List<String> out = new ArrayList<>();
        Matcher where = Pattern.compile("\\bWHERE\\b([\\s\\S]*?)(?:\\bORDER\\b|\\bLIMIT\\b|$)",
                Pattern.CASE_INSENSITIVE).matcher(sql);
        if (!where.find()) {
            return out;
        }
        Matcher m = Pattern.compile(
                "([A-Za-z_][A-Za-z0-9_]*)\\s*(?:=|<=>|<>|!=|>=|<=|>|<|\\bIN\\b|\\bLIKE\\b|\\bIS\\b|\\bBETWEEN\\b)",
                Pattern.CASE_INSENSITIVE).matcher(where.group(1));
        while (m.find()) {
            String name = m.group(1).toLowerCase(Locale.ROOT);
            if (!SQL_NOISE.contains(name)) {
                out.add(name);
            }
        }
        return out;
    }

    private static String selectSingleColumn(String sql) {
        Matcher m = Pattern.compile("^\\s*SELECT\\s+`?([A-Za-z0-9_]+)`?\\s+FROM",
                Pattern.CASE_INSENSITIVE).matcher(sql);
        if (!m.find() || SQL_NOISE.contains(m.group(1).toLowerCase(Locale.ROOT))) {
            return null;
        }
        return m.group(1).toLowerCase(Locale.ROOT);
    }

    /* ================= 通用小工具 ================= */

    private static String stripSqlComments(String text) {
        return text.replaceAll("/\\*[\\s\\S]*?\\*/", " ").replaceAll("--[^\\n]*", " ");
    }

    /** 找到与 openIdx 处左括号配对的右括号（SQL 字面量感知，含 '' 转义）。 */
    private static int matchingParen(String text, int openIdx) {
        int depth = 0;
        for (int i = openIdx; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '\'' || c == '"' || c == '`') {
                i = skipLiteral(text, i);
                continue;
            }
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    /** 按顶层逗号切分（SQL 字面量与嵌套括号里的逗号不算分隔）。 */
    private static List<String> splitTopLevel(String body) {
        List<String> parts = new ArrayList<>();
        int depth = 0;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (c == '\'' || c == '"' || c == '`') {
                int end = skipLiteral(body, i);
                cur.append(body, i, Math.min(end + 1, body.length()));
                i = end;
                continue;
            }
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
            }
            if (c == ',' && depth == 0) {
                parts.add(cur.toString());
                cur.setLength(0);
                continue;
            }
            cur.append(c);
        }
        if (!cur.toString().trim().isEmpty()) {
            parts.add(cur.toString());
        }
        return parts;
    }

    /**
     * 返回从 open 处引号开始的字面量的结束下标（闭引号本身）。
     *
     * <p>SQL 的转义是<b>双写</b>（{@code 'it''s'}），MySQL 也接受反斜杠转义。
     * 只按「下一个同种引号结束」解析会在 {@code COMMENT ''管理员''} 这种形态上提前收工，
     * 于是字符串内部的 {@code DECIMAL(10,6)} 被当成代码、逗号被当成顶层分隔符——
     * 本判据的第一版正是这样把 {@code 10}、{@code 6}、{@code 128} 当成了 users 的列。</p>
     */
    private static int skipLiteral(String text, int open) {
        char q = text.charAt(open);
        for (int i = open + 1; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '\\' && q != '`' && i + 1 < text.length()) {
                i++;
                continue;
            }
            if (c == q) {
                if (q == '\'' && i + 1 < text.length() && text.charAt(i + 1) == '\'') {
                    i++;
                    continue;
                }
                return i;
            }
        }
        return text.length() - 1;
    }

    /** 数据类型关键字——出现在定义首词时说明这一段不是列定义（是错切的碎片）。 */
    private static final Set<String> TYPE_WORDS = Set.of(
            "varchar", "char", "text", "tinytext", "mediumtext", "longtext", "json", "enum", "set",
            "int", "integer", "tinyint", "smallint", "mediumint", "bigint", "float", "double",
            "decimal", "numeric", "bit", "bool", "boolean", "date", "time", "datetime", "timestamp",
            "year", "blob", "tinyblob", "mediumblob", "longblob", "geometry", "point");

    /**
     * 取一段列定义的首个<b>列名</b>。
     *
     * <p>要求形态是「标识符 + 空白 + 类型词」：纯数字碎片（{@code 128) NULL COMMENT }）、
     * 类型词本身（{@code DECIMAL(10}）以及约束行都因此被自然排除。</p>
     */
    private static String columnName(String token) {
        Matcher m = Pattern.compile("^\\s*`?([A-Za-z][A-Za-z0-9_]*)`?\\s+[A-Za-z(]").matcher(token);
        if (!m.find()) {
            return null;
        }
        String first = m.group(1).toLowerCase(Locale.ROOT);
        return NOT_A_COLUMN.contains(first) || TYPE_WORDS.contains(first) ? null : first;
    }

    private static String abbreviate(String sql) {
        String s = sql.trim();
        return s.length() <= 80 ? s : s.substring(0, 80) + "...";
    }
}
