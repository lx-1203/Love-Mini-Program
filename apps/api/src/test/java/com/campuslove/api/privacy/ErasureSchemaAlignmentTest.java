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

    /** {@code CALL add_column_if_missing('table','column', ...)} 形态。 */
    private static final Pattern ADD_COLUMN_PROC = Pattern.compile(
            "add_column_if_missing\\(\\s*'([A-Za-z0-9_]+)'\\s*,\\s*'([A-Za-z0-9_]+)'",
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
