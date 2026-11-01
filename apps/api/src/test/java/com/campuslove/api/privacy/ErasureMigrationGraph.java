package com.campuslove.api.privacy;

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

/**
 * 迁移链 DDL 的<b>纯静态</b>解析器：在场表集合、CREATE 体列集、外键边（含 {@code ON DELETE} 策略）。
 * （第六轮 W1c 事项一/事项二的判点载体；CI 无真库也能跑。）
 *
 * <p><b>为什么不能只会读 CREATE 体里的 FOREIGN KEY</b>：本仓的外键有 <b>5 种</b>声明形态，
 * 而「少认一种就漏判」的地方恰恰都在 CREATE 之外——
 * <ol>
 *   <li>CREATE TABLE 体内的 {@code [CONSTRAINT n] FOREIGN KEY (c) REFERENCES t (c) ON DELETE x}；</li>
 *   <li>{@code ALTER TABLE t ADD CONSTRAINT n FOREIGN KEY ...}（V2026.07.25.0001 用它把
 *       NO ACTION 重建成 CASCADE——<b>同一条边的策略会被后续迁移改写</b>，只读 CREATE 就会拿错策略）；</li>
 *   <li>{@code CALL add_fk_if_missing(...)} 幂等过程，且<b>有两种参数形状</b>：
 *       V2026.07.26.0003 是 5 参 {@code (表,列,引用表,约束名,策略)}（引用列固定 id），
 *       V2026.07.28.0008 是 6 参 {@code (表,列,约束名,引用表,引用列,策略)}；</li>
 *   <li>{@code CALL drop_fk_by_column(表,列,引用表)} 与 {@code ALTER TABLE t DROP FOREIGN KEY n}（撤边）；</li>
 *   <li>{@code DROP TABLE} 与 {@code CREATE TABLE IF NOT EXISTS} 同文件共存（幂等重建），
 *       必须按<b>文本位置</b>顺序施加，否则会把已删的表算成在场。</li>
 * </ol>
 * 只按 (1) 解析实测只得 <b>47</b> 条边，而库上真值 <b>64</b> 条 ⇒ 判点会漏 17 条父子关系，
 * 其中就包括 {@code vip_order}/{@code user_wallet}/{@code video_calls} 这些 RESTRICT 边。
 * 本类按上面 5 种形态全量解析，并由 {@code ErasureSurfaceAndOrderingGateTest} 里那条 DB-gated
 * 对账（接了只读库时）证明它与 {@code information_schema} 的外键图<b>逐条相等、策略也相等</b>。</p>
 *
 * <p>归属列检测沿用第五轮 F-11 的既有口径：<b>只认 CREATE 体</b>里的列，
 * {@code CALL add_*_column_if_missing} 这类循环补列不得凭空造出归属列。</p>
 */
final class ErasureMigrationGraph {

    /** 一条外键边：子表.子列 → 父表.父列，附带 ON DELETE 策略（大写，无子句时为 NO ACTION）。 */
    record ForeignKey(String child, String column, String parent, String referencedColumn, String onDelete) {
    }

    /** 约束/索引行的首词不是列名（与 {@code ErasureSchemaAlignmentTest.NOT_A_COLUMN} 同集合）。 */
    private static final Set<String> NOT_A_COLUMN = Set.of(
            "primary", "unique", "key", "index", "fulltext", "constraint", "foreign", "check", "period");

    /** 数据类型词：首词是它们说明这一段不是列定义（与 {@code ErasureSchemaAlignmentTest.TYPE_WORDS} 同集合）。 */
    private static final Set<String> TYPE_WORDS = Set.of(
            "varchar", "char", "text", "tinytext", "mediumtext", "longtext", "json", "enum", "set",
            "int", "integer", "tinyint", "smallint", "mediumint", "bigint", "float", "double",
            "decimal", "numeric", "bit", "bool", "boolean", "date", "time", "datetime", "timestamp",
            "year", "blob", "tinyblob", "mediumblob", "longblob", "geometry", "point");

    /** 用户归属列名单——与 {@code ErasureSchemaAlignmentTest.OWNER_COLUMNS} 逐字对齐（漂移由判点拦截）。 */
    private static final Set<String> OWNER_COLUMNS = Set.of(
            "user_id", "author_id", "sender_id", "receiver_id", "visitor_id", "reporter_id",
            "caller_id", "callee_id", "claimer_id", "operator_id", "follower_id", "following_id",
            "user_a_id", "user_b_id", "host_id");

    private static final Pattern CREATE_TABLE = Pattern.compile(
            "CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?`?([A-Za-z0-9_]+)`?\\s*\\(",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern DROP_TABLE = Pattern.compile(
            "DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?`?([A-Za-z0-9_]+)`?", Pattern.CASE_INSENSITIVE);
    private static final Pattern FK_IN_BODY = Pattern.compile(
            "(?:CONSTRAINT\\s+`?([A-Za-z0-9_]+)`?\\s+)?FOREIGN\\s+KEY\\s*\\(\\s*`?([A-Za-z0-9_]+)`?\\s*\\)"
                    + "\\s*REFERENCES\\s+`?([A-Za-z0-9_]+)`?\\s*\\(\\s*`?([A-Za-z0-9_]+)`?\\s*\\)(.*)",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern ALTER_ADD_FK = Pattern.compile(
            "ALTER\\s+TABLE\\s+`?([A-Za-z0-9_]+)`?\\s+ADD\\s+CONSTRAINT\\s+`?([A-Za-z0-9_]+)`?\\s+"
                    + "FOREIGN\\s+KEY\\s*\\(\\s*`?([A-Za-z0-9_]+)`?\\s*\\)\\s*REFERENCES\\s+"
                    + "`?([A-Za-z0-9_]+)`?\\s*\\(\\s*`?([A-Za-z0-9_]+)`?\\s*\\)([^;]{0,200})",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ALTER_DROP_FK = Pattern.compile(
            "ALTER\\s+TABLE\\s+`?([A-Za-z0-9_]+)`?\\s+DROP\\s+FOREIGN\\s+KEY\\s+`?([A-Za-z0-9_]+)`?",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern CALL_ADD_FK = Pattern.compile(
            "call\\s+add_fk_if_missing\\s*\\(([^)]*)\\)", Pattern.CASE_INSENSITIVE);
    private static final Pattern CALL_DROP_FK = Pattern.compile(
            "call\\s+drop_fk_by_column\\s*\\(([^)]*)\\)", Pattern.CASE_INSENSITIVE);
    private static final Pattern ON_DELETE = Pattern.compile(
            "ON\\s+DELETE\\s+(CASCADE|SET\\s+NULL|SET\\s+DEFAULT|RESTRICT|NO\\s+ACTION)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern COLUMN_HEAD = Pattern.compile(
            "^\\s*`?([A-Za-z][A-Za-z0-9_]*)`?\\s+[A-Za-z(]");
    private static final Pattern QUOTED_ARG = Pattern.compile("'([^']*)'");

    private final Map<String, Set<String>> columnsByTable = new LinkedHashMap<>();
    private final Map<String, Set<String>> ownerColumnsByTable = new LinkedHashMap<>();
    private final Map<String, ForeignKey> edges = new LinkedHashMap<>();
    /** 约束名（{@code 表|约束名} 小写）→ 边键，供 {@code ALTER TABLE ... DROP FOREIGN KEY} 反查。 */
    private final Map<String, String> named = new LinkedHashMap<>();
    private final Set<String> existing = new LinkedHashSet<>();

    /** 包内可见：判点的夹具自证要能 new 一个空图，逐段 {@link #applyDdl(String)} 施加。 */
    ErasureMigrationGraph() {
    }

    /** 从迁移目录加载（文件按 {@code V2026.x.y.zzzz} 版本序，文件内按文本位置序施加 CREATE/DROP/ALTER/CALL）。 */
    static ErasureMigrationGraph load(Path migrationDir) {
        List<Path> files;
        try (Stream<Path> stream = Files.list(migrationDir)) {
            files = stream.filter(p -> p.getFileName().toString().endsWith(".sql"))
                    .sorted(Comparator.comparing(ErasureMigrationGraph::versionKey)
                            .thenComparing(p -> p.getFileName().toString()))
                    .toList();
        } catch (IOException ex) {
            throw new IllegalStateException("列不出迁移目录 " + migrationDir + "：", ex);
        }
        ErasureMigrationGraph g = new ErasureMigrationGraph();
        for (Path file : files) {
            String text;
            try {
                text = stripSqlComments(Files.readString(file, StandardCharsets.UTF_8));
            } catch (IOException ex) {
                throw new IllegalStateException("读不了迁移文件 " + file + "：", ex);
            }
            g.applyDdl(text);
        }
        return g;
    }

    /** 迁移链目录（从当前工作目录向上找 {@code database/flyway/sql}，与既有判点同一套定位法）。 */
    static Path locateMigrationDir() {
        Path cursor = Path.of("").toAbsolutePath();
        for (int i = 0; i < 6 && cursor != null; i++) {
            Path candidate = cursor.resolve("database").resolve("flyway").resolve("sql");
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
            cursor = cursor.getParent();
        }
        throw new IllegalStateException("从 " + Path.of("").toAbsolutePath()
                + " 向上找不到 database/flyway/sql，本判据需要完整迁移链才能运行");
    }

    /** 施加一段 DDL（可以是一个迁移文件的正文，也可以是夹具片段）；同一段内按<b>文本位置</b>顺序施加。 */
    ErasureMigrationGraph applyDdl(String text) {
        List<Event> events = new ArrayList<>();
        for (Matcher m = DROP_TABLE.matcher(text); m.find(); ) {
            events.add(new Event(m.start(), "drop-table", lower(m.group(1)), -1, List.of()));
        }
        for (Matcher m = CREATE_TABLE.matcher(text); m.find(); ) {
            // 必须在此刻就把组值取出来存好：Matcher 在 find() 循环结束后就没有匹配状态了
            events.add(new Event(m.start(), "create", lower(m.group(1)), m.end() - 1, List.of()));
        }
        for (Matcher m = ALTER_ADD_FK.matcher(text); m.find(); ) {
            events.add(new Event(m.start(), "alter-fk", null, -1,
                    List.of(lower(m.group(1)), m.group(2), lower(m.group(3)), lower(m.group(4)),
                            lower(m.group(5)), m.group(6))));
        }
        for (Matcher m = ALTER_DROP_FK.matcher(text); m.find(); ) {
            events.add(new Event(m.start(), "alter-drop", null, -1,
                    List.of(lower(m.group(1)), m.group(2))));
        }
        for (Matcher m = CALL_ADD_FK.matcher(text); m.find(); ) {
            events.add(new Event(m.start(), "call-add", null, -1, List.of(m.group(1))));
        }
        for (Matcher m = CALL_DROP_FK.matcher(text); m.find(); ) {
            events.add(new Event(m.start(), "call-drop", null, -1, List.of(m.group(1))));
        }
        events.sort(Comparator.comparingInt(e -> e.pos));
        for (Event e : events) {
            switch (e.kind) {
                case "drop-table" -> dropTable(e.table);
                case "create" -> applyCreate(text, e);
                case "alter-fk" -> applyAlterAddFk(e.groups);
                case "alter-drop" -> applyAlterDropFk(e.groups);
                case "call-add" -> applyCallAddFk(e.groups.get(0));
                case "call-drop" -> applyCallDropFk(e.groups.get(0));
                default -> throw new IllegalStateException("未知事件种类 " + e.kind);
            }
        }
        return this;
    }

    /** {@code DROP TABLE}：表不再在场，且它作为子表<b>或父表</b>的外键边一并失效。 */
    private void dropTable(String table) {
        existing.remove(table);
        columnsByTable.remove(table);
        ownerColumnsByTable.remove(table);
        List<String> gone = edges.entrySet().stream()
                .filter(en -> table.equals(en.getValue().child()) || table.equals(en.getValue().parent()))
                .map(Map.Entry::getKey).toList();
        for (String key : gone) {
            edges.remove(key);
        }
        named.entrySet().removeIf(en -> gone.contains(en.getValue()));
    }

    private void applyCreate(String text, Event e) {
        existing.add(e.table);
        int close = matchingParen(text, e.open);
        if (close < 0) {
            return;
        }
        for (String part : splitTopLevel(text.substring(e.open + 1, close))) {
            String clause = part.replaceAll("^\\s*\\(+", "").trim();
            Matcher head = COLUMN_HEAD.matcher(clause);
            if (head.find()) {
                String first = head.group(1).toLowerCase(Locale.ROOT);
                if (!NOT_A_COLUMN.contains(first) && !TYPE_WORDS.contains(first)) {
                    columnsByTable.computeIfAbsent(e.table, k -> new LinkedHashSet<>()).add(first);
                    if (isOwnerColumn(first)) {
                        ownerColumnsByTable.computeIfAbsent(e.table, k -> new LinkedHashSet<>()).add(first);
                    }
                }
            }
            Matcher fk = FK_IN_BODY.matcher(clause);
            if (fk.find()) {
                ForeignKey edge = new ForeignKey(e.table, lower(fk.group(2)), lower(fk.group(3)),
                        lower(fk.group(4)), onDeleteOf(fk.group(5)));
                putEdge(edge);
                if (fk.group(1) != null) {
                    named.put(nameKey(e.table, fk.group(1)), edgeKey(edge));
                }
            }
        }
    }

    private void applyAlterAddFk(List<String> g) {
        ForeignKey edge = new ForeignKey(g.get(0), g.get(2), g.get(3), g.get(4), onDeleteOf(g.get(5)));
        putEdge(edge);
        named.put(nameKey(edge.child(), g.get(1)), edgeKey(edge));
    }

    private void applyAlterDropFk(List<String> g) {
        String edgeKey = named.remove(nameKey(g.get(0), g.get(1)));
        if (edgeKey != null) {
            edges.remove(edgeKey);
        }
    }

    /**
     * {@code CALL add_fk_if_missing(...)}：两种参数形状都要认（见类注释第 3 条）。
     * 6 参＝{@code (表,列,约束名,引用表,引用列,策略)}；5 参＝{@code (表,列,引用表,约束名,策略)}（引用列固定 id）。
     */
    private void applyCallAddFk(String rawArgs) {
        List<String> a = argsOf(rawArgs);
        String child;
        String column;
        String parent;
        String referenced;
        String rule;
        String fkName;
        if (a.size() == 6) {
            child = a.get(0);
            column = a.get(1);
            fkName = a.get(2);
            parent = a.get(3);
            referenced = a.get(4);
            rule = a.get(5);
        } else if (a.size() == 5) {
            child = a.get(0);
            column = a.get(1);
            parent = a.get(2);
            fkName = a.get(3);
            referenced = "id";
            rule = a.get(4);
        } else {
            throw new IllegalStateException("add_fk_if_missing 出现了没登记过的参数形状（"
                    + a.size() + " 参）：" + a + "——新签名必须同时登记进本解析器，"
                    + "否则外键图会静默缺边、顺序判点跟着假绿");
        }
        ForeignKey edge = new ForeignKey(lower(child), lower(column), lower(parent),
                lower(referenced), ruleOf(rule));
        putEdge(edge);
        named.put(nameKey(child, fkName), edgeKey(edge));
    }

    private void applyCallDropFk(String rawArgs) {
        List<String> a = argsOf(rawArgs);
        if (a.size() != 3) {
            throw new IllegalStateException("drop_fk_by_column 参数形状未登记：" + a);
        }
        edges.remove(edgeKey(a.get(0).toLowerCase(Locale.ROOT), a.get(1).toLowerCase(Locale.ROOT),
                a.get(2).toLowerCase(Locale.ROOT)));
    }

    private void putEdge(ForeignKey edge) {
        edges.put(edgeKey(edge), edge);
    }

    private static String edgeKey(ForeignKey edge) {
        return edgeKey(edge.child(), edge.column(), edge.parent());
    }

    private static String edgeKey(String child, String column, String parent) {
        return child + "." + column + "->" + parent;
    }

    private static String nameKey(String table, String fkName) {
        return lower(table) + "|" + lower(fkName);
    }

    /** 从外键子句尾巴里取 {@code ON DELETE x}；没写就是 MySQL 默认的 NO ACTION。 */
    private static String onDeleteOf(String tail) {
        if (tail == null) {
            return "NO ACTION";
        }
        Matcher m = ON_DELETE.matcher(tail);
        return m.find() ? normaliseRule(m.group(1)) : "NO ACTION";
    }

    /** {@code CALL add_fk_if_missing} 的策略实参：只认 MySQL 支持的 5 种，出现新值必须先登记再判点。 */
    private static String ruleOf(String bareRule) {
        String norm = normaliseRule(bareRule);
        if (!Set.of("CASCADE", "SET NULL", "SET DEFAULT", "RESTRICT", "NO ACTION").contains(norm)) {
            throw new IllegalStateException("外键策略实参未登记：" + bareRule
                    + "——出现新写法时必须先加进判点，否则顺序不变量会按 NO ACTION 误判");
        }
        return norm;
    }

    private static String normaliseRule(String raw) {
        return raw == null ? "" : raw.toUpperCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static String lower(String s) {
        return s.toLowerCase(Locale.ROOT);
    }

    /** 归属列口径：名单 + {@code *_user_id} / {@code *_author_id} 后缀（与 F-11 一致）。 */
    static boolean isOwnerColumn(String column) {
        return OWNER_COLUMNS.contains(column)
                || column.endsWith("_user_id") || column.endsWith("_author_id");
    }

    // ---- 查询视图 ----

    Set<String> existingTables() {
        return Set.copyOf(existing);
    }

    Map<String, Set<String>> columnsByTable() {
        Map<String, Set<String>> out = new LinkedHashMap<>();
        columnsByTable.forEach((k, v) -> out.put(k, Set.copyOf(v)));
        return out;
    }

    /** 在场且 CREATE 体里带用户归属列的表（第五轮 F-11 的 T 集合）。 */
    Map<String, Set<String>> ownerTables() {
        Map<String, Set<String>> out = new LinkedHashMap<>();
        ownerColumnsByTable.forEach((k, v) -> {
            if (existing.contains(k) && !v.isEmpty()) {
                out.put(k, Set.copyOf(v));
            }
        });
        return out;
    }

    List<ForeignKey> edges() {
        return List.copyOf(edges.values());
    }

    /** 父表 → 指向它的外键边（自环除外）。 */
    Map<String, List<ForeignKey>> childrenByParent() {
        Map<String, List<ForeignKey>> out = new LinkedHashMap<>();
        for (ForeignKey fk : edges.values()) {
            if (fk.child().equals(fk.parent())) {
                continue;
            }
            out.computeIfAbsent(fk.parent(), k -> new ArrayList<>()).add(fk);
        }
        return out;
    }

    /** 子表 → 它指向的父表边集合（自环除外）。 */
    Map<String, List<ForeignKey>> parentsByChild() {
        Map<String, List<ForeignKey>> out = new LinkedHashMap<>();
        for (ForeignKey fk : edges.values()) {
            if (fk.child().equals(fk.parent())) {
                continue;
            }
            out.computeIfAbsent(fk.child(), k -> new ArrayList<>()).add(fk);
        }
        return out;
    }

    // ---- 事件与文本工具 ----

    private static final class Event {
        final int pos;
        final String kind;
        final String table;
        /** CREATE 体左括号下标（其余事件为 -1）。 */
        final int open;
        /** 在 {@code find()} 循环<b>当场</b>取好的捕获组（Matcher 出循环就没有匹配状态了）。 */
        final List<String> groups;

        Event(int pos, String kind, String table, int open, List<String> groups) {
            this.pos = pos;
            this.kind = kind;
            this.table = table;
            this.open = open;
            this.groups = groups;
        }
    }

    private static boolean isQuote(char c) {
        return c == '\'' || c == '"' || c == '`';
    }

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

    private static int matchingParen(String text, int openIdx) {
        int depth = 0;
        for (int i = openIdx; i < text.length(); i++) {
            char c = text.charAt(i);
            if (isQuote(c)) {
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

    private static List<String> splitTopLevel(String body) {
        List<String> parts = new ArrayList<>();
        int depth = 0;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (isQuote(c)) {
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

    /** 取 {@code CALL x('a','b',...)} 的实参：只认<b>单引号字面量</b>，所以 {@code 'SET NULL'} 不会被拆成两个。 */
    private static List<String> argsOf(String raw) {
        List<String> out = new ArrayList<>();
        Matcher m = QUOTED_ARG.matcher(raw == null ? "" : raw);
        while (m.find()) {
            out.add(m.group(1));
        }
        return out;
    }

    private static String stripSqlComments(String text) {
        return text.replaceAll("/\\*[\\s\\S]*?\\*/", " ").replaceAll("--[^\\n]*", " ");
    }

    /** 迁移文件名 {@code V2026.10.13.0001__x.sql} → 定长可比较版本键。 */
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
}
