package com.campuslove.api.privacy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
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

import com.campuslove.api.privacy.ErasureMigrationGraph.ForeignKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 注销清除清单的<b>数据层不变量</b>判点（第六轮 W1c：收 E2 数据轨量出的三条账）。
 *
 * <p>三条账分别由这些判点看着：
 * <ol>
 *   <li><b>事项一（顺序）</b>：旧注释写「先删子后删父」，盘上实际是父前子后；整链不炸的唯一原因是
 *       被点名的 6 张父表里 5 张不删行。这条不变量现在由 {@link #deleteStatementsFollowChildBeforeParent()}
 *       与 {@link #deletingParentsAndUndeletedChildrenArePinned()} 从迁移链的外键图（纯静态）钉住，
 *       不再靠注释；{@link #orderingDetectorBitesOnParentDeletedBeforeChild()} 是它的阳性对照。</li>
 *   <li><b>事项二（借归属）</b>：判点在 {@code ErasureSchemaAlignmentTest#everyBorrowedOwnerTableIsNamedOrExempt}
 *       里（与 F-11 穷尽门同一载体、同一批豁免纪律）。</li>
 *   <li><b>事项三（作用面归因）</b>：{@link #surfaceLedgerCoversExactlyTheStatementBearingEntries()}、
 *       {@link #surfaceWriterAxisAgreesWithDerivedWritePoints()}、
 *       {@link #deadTableAdjudicationsAreExactlyTheZeroWriterEntries()}。</li>
 * </ol>
 *
 * <p><b>CI 无真库</b>：外键图、列集、写点全部从盘上文本（迁移链 DDL + {@code apps/api/src/main} 源码）派生，
 * 所以事项一与事项三的「写点轴」在 CI 里就能红。只有「本快照有没有行」这一半必须有库，
 * 那条判点（{@link #liveSchemaAgreesWithStaticDerivation()}）用 {@code -Derasure.db.enabled=true} 打开，
 * 没打开时按 assumption 跳过——<b>不写成「已通过」</b>。</p>
 */
class ErasureSurfaceAndOrderingGateTest {

    /** 清单里<b>被删行、且自身有外键子表</b>的父表（今天只有一张）。 */
    private static final Set<String> EXPECTED_DELETING_PARENTS = Set.of("temp_chat_session");

    /**
     * 「删这张父表会连带销毁、而清单不点名删它」的登记表：父表 → 理由。
     *
     * <p>今天必须是<b>空表</b>：{@code temp_chat_session} 的两张子表（{@code temp_chat_message}、
     * {@code temp_chat_contact_exchange}）都已显式点名并排在它之前。谁要把某张匿名父表
     * （{@code posts}/{@code circle_topics}/{@code campus_topics}/{@code private_conversations}/{@code users}）
     * 改成 {@code DELETE_ROWS}，这张表就会非空 ⇒ 必须在此写明理由，判点才放行。</p>
     */
    private static final Map<String, String> PARENT_DELETE_CASCADE_JUSTIFICATIONS = Map.of();

    /** 代码级死表的逐张裁定：清单项键 → 裁定（必须是盘上 rationale 里能对上的字面量）。 */
    private static final Map<String, String> DEAD_TABLE_ADJUDICATIONS = Map.of(
            "user_match_ticket", "保留清单项",
            "chat_ai_session_context", "保留清单项",
            "chat_ai_suggestion_log", "保留清单项",
            "activity_proposal", "保留清单项",
            "user_sessions", "保留清单项");

    /** 归因账的防空转地板（实测 45/29/5——R7-B 补 temp_chat_media_holds 后；地板留 5 项余量，防止清单被整体摘掉后判点空绿）。 */
    private static final Map<ErasureStatementSurface, Integer> SURFACE_FLOORS = Map.of(
            ErasureStatementSurface.LIVE_WRITTEN, 40,
            ErasureStatementSurface.EMPTY_WRITTEN, 22,
            ErasureStatementSurface.DEAD_TABLE, 4);

    /* ==================== 事项一：外键顺序不变量 ==================== */

    @Test
    @DisplayName("顺序不变量：任何删父表的语句，其子表的删除语句必须全部排在它之前")
    void deleteStatementsFollowChildBeforeParent() {
        ErasureMigrationGraph graph = ErasureMigrationGraph.load(ErasureMigrationGraph.locateMigrationDir());
        assertFalse(graph.edges().isEmpty(), "迁移链没解析出任何外键边，顺序判点是空门");
        assertTrue(graph.edges().size() >= 60,
                "只从迁移链解析出 " + graph.edges().size() + " 条外键边（<60，库上真值 64），"
                        + "解析器本身失效，顺序判点拒判");

        List<Stmt> stmts = statementsOf(PersonalDataTables.INVENTORY);
        List<String> problems = orderingProblems(stmts, graph);
        assertTrue(problems.isEmpty(),
                "清单顺序违反「先删子后删父」（真实注销会在这里炸外键约束、整笔回滚）：\n  "
                        + String.join("\n  ", problems));
        long checked = stmts.stream().filter(Stmt::deletes).count();
        assertTrue(checked >= 40,
                "清单里只有 " + checked + " 条删除语句（<40），顺序判点可能在空转");
    }

    @Test
    @DisplayName("父项不删行这件事被钉住：删行的父表集合 + 级联登记表必须逐一登记")
    void deletingParentsAndUndeletedChildrenArePinned() {
        ErasureMigrationGraph graph = ErasureMigrationGraph.load(ErasureMigrationGraph.locateMigrationDir());
        List<Stmt> stmts = statementsOf(PersonalDataTables.INVENTORY);

        Set<String> deletingParents = deletingParentTables(stmts, graph);
        assertEquals(EXPECTED_DELETING_PARENTS, deletingParents,
                "「被清单删行、且自身在库里有外键子表」的父表集合变了。"
                        + "旧注释声称的顺序不变量之所以成立，就是因为这 5 张父表全是 ANONYMISE 不删行："
                        + "新增一张删行的父表，必须先在新注释里给出「子表怎么办」的理由，判点才放行");

        Map<String, Set<String>> undeletedChildren = undeletedChildrenOfDeletingParents(stmts, graph);
        assertEquals(PARENT_DELETE_CASCADE_JUSTIFICATIONS.keySet(), undeletedChildren.keySet(),
                "删行的父表带着「清单没点名删除」的子表：" + undeletedChildren + "。"
                        + "每一对都必须在 PARENT_DELETE_CASCADE_JUSTIFICATIONS 里写明理由"
                        + "（级联会不会销毁别人的行、或者策略被改动后行会不会静默留存）——"
                        + "post_tags 那 163 行就是这条不变量没人看着时攒出来的");
        for (Map.Entry<String, Set<String>> e : undeletedChildren.entrySet()) {
            String reason = PARENT_DELETE_CASCADE_JUSTIFICATIONS.get(e.getKey());
            assertTrue(reason != null && reason.length() >= 20,
                    "父表 " + e.getKey() + " 的级联登记理由没写够（<20 字）：登记表不是随手填的名字");
        }
    }

    @Test
    @DisplayName("阳性对照：同一判点喂「先删父后删子」的夹具必须变红，正确顺序必须绿")
    void orderingDetectorBitesOnParentDeletedBeforeChild() {
        ErasureMigrationGraph graph = new ErasureMigrationGraph().applyDdl(
                "CREATE TABLE parent (id bigint NOT NULL, user_id bigint, PRIMARY KEY (id));"
                        + "CREATE TABLE kid (id bigint, parent_id bigint, user_id bigint,"
                        + "  FOREIGN KEY (parent_id) REFERENCES parent(id) ON DELETE RESTRICT);");
        assertEquals(1, graph.edges().size(), "夹具外键没解析出来，判点是空门");

        List<PersonalDataTable> wrong = List.of(
                deleteItem("p_first", "parent"),
                deleteItem("k_second", "kid"));
        List<String> problems = orderingProblems(statementsOf(wrong), graph);
        assertTrue(problems.stream().anyMatch(p -> p.contains("kid") && p.contains("parent")),
                "「父表删除排在子表删除之前」没被判红：" + problems);

        List<PersonalDataTable> right = List.of(
                deleteItem("k_first", "kid"),
                deleteItem("p_second", "parent"));
        assertTrue(orderingProblems(statementsOf(right), graph).isEmpty(),
                "正确顺序（子前父后）被误判为红");

        List<PersonalDataTable> anonysedParent = List.of(
                PersonalDataTable.of("p_anon", "parent", "夹具", ErasureAction.ANONYMISE_IN_PLACE,
                        List.of(), List.of("user_id"),
                        List.of("UPDATE parent SET user_id = NULL WHERE user_id = {uid}"),
                        List.of(), "夹具"),
                deleteItem("k_only", "kid"));
        assertTrue(orderingProblems(statementsOf(anonysedParent), graph).isEmpty(),
                "父项不删行时不该报顺序问题（这正是清单今天能成立的机制，判点不许把它判成红）");
    }

    @Test
    @DisplayName("借归属删除必须先于被借表自身的删除：JOIN 捞的是被借表的行，行先删了借方就静默变 0 行")
    void joinBorrowingDeletesRunBeforeTheJoinedTableIsDeleted() {
        JoinAudit audit = joinBorrowingProblems(PersonalDataTables.INVENTORY);
        assertFalse(audit.owners().isEmpty(), "清单里没有任何删行语句，本判点在空转");
        assertTrue(audit.borrowers() >= 1,
                "本判点没有任何可判对象（清单里没有 JOIN 被删表的语句）——第三轴的删除形状变了要重钉，不许空转");
        assertTrue(audit.problems().isEmpty(),
                "借归属的删除排在了被借表自身删除之后（静默 0 行缺陷）：\n  " + String.join("\n  ", audit.problems()));
    }

    /** 借归属顺序判点的审计结果（借方数用于防空转地板，problems 是红句）。 */
    private record JoinAudit(Map<String, Integer> owners, int borrowers, List<String> problems) {
    }

    /**
     * 判点本体：被清单删行的表（owners，值为删它那条的清单序号，同表多项删取最小）；
     * 语句里 JOIN 了某张被删行的表（且不是自己的目标表）的借方必须排在被借表删除**之前**。
     * 排在之后＝被借表的行已没了，JOIN 捞空、删除静默 0 行——temp_chat_media_holds 的删除
     * 靠 JOIN media_asset 借 user_id 归属，media_asset 行先删它就永远删不到东西。
     */
    private static JoinAudit joinBorrowingProblems(List<PersonalDataTable> inventory) {
        Map<String, Integer> ownerOrdinal = new LinkedHashMap<>();
        for (int i = 0; i < inventory.size(); i++) {
            for (String sql : inventory.get(i).statements()) {
                String target = deleteTarget(sql);
                if (target != null) {
                    ownerOrdinal.merge(target.toLowerCase(Locale.ROOT), i, Math::min);
                }
            }
        }
        List<String> problems = new ArrayList<>();
        int borrowers = 0;
        for (int j = 0; j < inventory.size(); j++) {
            for (String sql : inventory.get(j).statements()) {
                String own = deleteTarget(sql);
                for (String joined : joinTargetsOf(sql)) {
                    Integer ownerAt = ownerOrdinal.get(joined);
                    if (ownerAt == null || (own != null && own.equalsIgnoreCase(joined))) {
                        continue;
                    }
                    borrowers++;
                    if (j > ownerAt) {
                        problems.add(inventory.get(j).key() + "（序 " + j + "）JOIN 了 " + joined
                                + " 借归属，但 " + joined + " 自身的删除排在序 " + ownerAt
                                + " ⇒ JOIN 捞空、这条删除静默变 0 行");
                    }
                }
            }
        }
        return new JoinAudit(ownerOrdinal, borrowers, problems);
    }

    @Test
    @DisplayName("阳性对照：借方排在被借表删除之后必须红，正确顺序必须绿（同一条判点喂夹具）")
    void joinBorrowingDetectorBitesOnBorrowerAfterOwner() {
        List<PersonalDataTable> wrong = List.of(
                deleteItem("ma_first", "media_asset"),
                PersonalDataTable.of("hold_late", "temp_chat_media_holds", "夹具", ErasureAction.DELETE_ROWS,
                        List.of(), List.of(),
                        List.of("DELETE h FROM temp_chat_media_holds h JOIN media_asset ma "
                                + "ON h.media_asset_id = ma.id WHERE ma.user_id = {uid}"),
                        List.of(), "夹具"));
        List<String> problems = joinBorrowingProblems(wrong).problems();
        assertTrue(problems.stream().anyMatch(p -> p.contains("hold_late") && p.contains("media_asset")),
                "「借方排在被借表删除之后」没被判红：" + problems);

        List<PersonalDataTable> right = List.of(
                PersonalDataTable.of("hold_early", "temp_chat_media_holds", "夹具", ErasureAction.DELETE_ROWS,
                        List.of(), List.of(),
                        List.of("DELETE h FROM temp_chat_media_holds h JOIN media_asset ma "
                                + "ON h.media_asset_id = ma.id WHERE ma.user_id = {uid}"),
                        List.of(), "夹具"),
                deleteItem("ma_second", "media_asset"));
        assertTrue(joinBorrowingProblems(right).problems().isEmpty(),
                "正确顺序（借方在前）被误判为红");

        /* 子查询借形态（车道 E F-5）：IN (SELECT … FROM 被删表) 的借方同样必须排在被借表删除之前 */
        List<PersonalDataTable> subWrong = List.of(
                deleteItem("ma_first_sub", "media_asset"),
                PersonalDataTable.of("borrow_sub_late", "some_child", "夹具", ErasureAction.DELETE_ROWS,
                        List.of(), List.of(),
                        List.of("DELETE FROM some_child WHERE media_asset_id IN "
                                + "(SELECT id FROM media_asset WHERE user_id = {uid})"),
                        List.of(), "夹具"));
        List<String> subProblems = joinBorrowingProblems(subWrong).problems();
        assertTrue(subProblems.stream().anyMatch(p -> p.contains("borrow_sub_late") && p.contains("media_asset")),
                "子查询借方排在被借表删除之后没被判红（joinTargetsOf 对 IN(SELECT…FROM) 全盲，车道 E F-5）：" + subProblems);

        List<PersonalDataTable> subRight = List.of(
                PersonalDataTable.of("borrow_sub_early", "some_child", "夹具", ErasureAction.DELETE_ROWS,
                        List.of(), List.of(),
                        List.of("DELETE FROM some_child WHERE media_asset_id IN "
                                + "(SELECT id FROM media_asset WHERE user_id = {uid})"),
                        List.of(), "夹具"),
                deleteItem("ma_second_sub", "media_asset"));
        assertTrue(joinBorrowingProblems(subRight).problems().isEmpty(),
                "子查询借方在前被误判为红");
    }

    /**
     * 取语句里全部借归属目标表名（小写、去别名）。两种借形态都认（车道 E F-5 的修复：
     * 只认 JOIN 会让 `IN (SELECT … FROM 被删表 …)` 形态的借方绕过排序判点）：
     * ① `JOIN <table>`；② `IN (SELECT … FROM <table> …` 子查询。
     * LEFT/STRAIGHT JOIN 不在清单删除形态里，不认。
     */
    private static final java.util.regex.Pattern SUBQUERY_BORROW =
            java.util.regex.Pattern.compile("\\bin\\s*\\(\\s*select\\b[\\s\\S]{0,400}?\\bfrom\\s+([a-z_][a-z0-9_]*)",
                    java.util.regex.Pattern.CASE_INSENSITIVE);

    private static List<String> joinTargetsOf(String sql) {
        List<String> out = new ArrayList<>();
        String lower = sql.toLowerCase(Locale.ROOT);
        int idx = 0;
        while (true) {
            int at = lower.indexOf(" join ", idx);
            if (at < 0) {
                break;
            }
            int start = at + " join ".length();
            int end = start;
            while (end < lower.length()
                    && (Character.isLetterOrDigit(lower.charAt(end)) || lower.charAt(end) == '_')) {
                end++;
            }
            if (end > start) {
                out.add(lower.substring(start, end));
            }
            idx = end;
        }
        java.util.regex.Matcher m = SUBQUERY_BORROW.matcher(sql);
        while (m.find()) {
            out.add(m.group(1).toLowerCase(Locale.ROOT));
        }
        return out;
    }

    @Test
    @DisplayName("解析器自证：外键的 5 种声明形态（含两种 CALL 参数形状、策略改写、建后即删）都要认对")
    void migrationGraphParserHandlesAllFiveForeignKeyForms() {
        ErasureMigrationGraph g = new ErasureMigrationGraph();

        g.applyDdl("CREATE TABLE a (id bigint, user_id bigint, PRIMARY KEY (id));"
                + "CREATE TABLE b (id bigint, a_id bigint,"
                + "  CONSTRAINT fk_b_a FOREIGN KEY (a_id) REFERENCES a (id) ON DELETE CASCADE);");
        assertEquals("CASCADE", rule(g, "b", "a_id", "a"), "CREATE 体内的外键策略解析不符");

        // 形态 2：ALTER 重建同一条边，策略必须被后写的覆盖（NO ACTION → RESTRICT）
        g.applyDdl("ALTER TABLE b DROP FOREIGN KEY fk_b_a;"
                + "ALTER TABLE b ADD CONSTRAINT fk_b_a2 FOREIGN KEY (a_id) REFERENCES a (id)"
                + " ON DELETE RESTRICT;");
        assertEquals("RESTRICT", rule(g, "b", "a_id", "a"), "ALTER DROP/ADD 之后策略没被覆盖");

        // 形态 3a：6 参 CALL
        g.applyDdl("CALL add_fk_if_missing('c', 'a_id', 'fk_c_a', 'a', 'id', 'SET NULL');");
        assertEquals("SET NULL", rule(g, "c", "a_id", "a"), "6 参 add_fk_if_missing 没被认");

        // 形态 3b：5 参 CALL（引用列固定 id）
        g.applyDdl("CALL add_fk_if_missing('d', 'a_id', 'a', 'fk_d_a', 'CASCADE');");
        assertEquals("CASCADE", rule(g, "d", "a_id", "a"), "5 参 add_fk_if_missing 没被认");

        // 形态 4：drop_fk_by_column 撤边（V2026.07.25.0001 用它把 NO ACTION 换成 CASCADE）
        g.applyDdl("CALL drop_fk_by_column('d', 'a_id', 'a');"
                + "ALTER TABLE d ADD CONSTRAINT fk_d_a FOREIGN KEY (a_id) REFERENCES a (id) ON DELETE CASCADE;");
        assertEquals("CASCADE", rule(g, "d", "a_id", "a"), "drop_fk_by_column 之后重建的边解析不符");

        // 形态 5：建后即删 / drop→create 幂等重建，都要按文本位置判定
        ErasureMigrationGraph order = new ErasureMigrationGraph().applyDdl(
                "CREATE TABLE gone (id bigint, user_id bigint);"
                        + "CREATE TABLE kid2 (id bigint, gone_id bigint,"
                        + "  FOREIGN KEY (gone_id) REFERENCES gone(id) ON DELETE CASCADE);"
                        + "DROP TABLE kid2;");
        assertFalse(order.existingTables().contains("kid2"), "已 DROP 的子表仍被算作在场");
        assertFalse(order.childrenByParent().containsKey("gone"),
                "子表 kid2 已 DROP，它那条外键边应随之消失——否则顺序判点会被一条库里不存在的边绊住");
        assertTrue(order.existingTables().contains("gone"),
                "只 DROP 子表时，父表应仍在场（gone 的归属列还得继续被穷尽门看着）");
        assertTrue(order.ownerTables().containsKey("gone"),
                "父表 gone 有 user_id，应留在归属表集合里");

        // CREATE 体里的类型词碎片不许被当成列（与既有 F-11 同族纪律）
        ErasureMigrationGraph cols = new ErasureMigrationGraph().applyDdl(
                "CREATE TABLE e (id bigint, amount DECIMAL(10,6) NULL,"
                        + " PRIMARY KEY (id), KEY k_id (id));");
        assertFalse(cols.columnsByTable().get("e").contains("decimal"), "类型词被当成了列名");
        assertEquals(Set.of("id", "amount"), cols.columnsByTable().get("e"), "列集解析不符");
        assertFalse(cols.ownerTables().containsKey("e"),
                "没有用户归属列的表被算进了归属集合（e 只有 id/amount）");
    }

    /* ==================== 事项三：作用面归因账 ==================== */

    @Test
    @DisplayName("归因账覆盖：账的键集合必须恰好等于「带语句的清单项」，且每项恰好一条语句")
    void surfaceLedgerCoversExactlyTheStatementBearingEntries() {
        Set<String> withStatements = new LinkedHashSet<>();
        for (PersonalDataTable t : PersonalDataTables.INVENTORY) {
            if (t.retained()) {
                assertTrue(t.statements().isEmpty(), t.key() + "：RETAIN 项不该有语句");
                continue;
            }
            withStatements.add(t.key());
            // 「一项一条语句」是让 per-项 的账等价于 per-语句 的账的前提；破坏前提时必须显式来改这里
            assertEquals(1, t.statements().size(),
                    t.key() + "：有 " + t.statements().size() + " 条语句，而归因账是按清单项登记的"
                            + "（要加第二条语句就得把账改成按语句登记，别让账和语句数悄悄分叉）");
        }
        assertEquals(withStatements, PersonalDataTables.surfaceLedger().keySet(),
                "作用面归因账与清单已分叉（缺登记＝新语句免检，多登记＝账上有清单里没有的项）");
        assertEquals(PersonalDataTables.statementCount(), PersonalDataTables.surfaceLedger().size(),
                "归因账条数与语句总数不等——账不再等于「每条语句都有归因」");
        assertTrue(PersonalDataTables.statementCount() >= 79,
                "语句总数只有 " + PersonalDataTables.statementCount()
                        + "（出处：W1c 前 76 → W1c 后 78 → R7-B 补 temp_chat_media_holds 后 79），判点分母异常");
    }

    @Test
    @DisplayName("归因账的写点轴：静态派生的代码写点有无，必须与声明的类别两轴一致（CI 里就能红）")
    void surfaceWriterAxisAgreesWithDerivedWritePoints() {
        Map<String, Set<String>> writers = deriveWritePoints(locateMainSrc());
        assertFalse(writers.isEmpty(), "src/main 没派生出任何写点，写点轴是空门");
        int writerPositive = 0;
        List<String> problems = new ArrayList<>();
        for (PersonalDataTable t : PersonalDataTables.INVENTORY) {
            if (t.retained()) {
                continue;
            }
            ErasureStatementSurface declared = PersonalDataTables.surfaceOf(t.key());
            boolean hasWriter = !writers.getOrDefault(t.table().toLowerCase(Locale.ROOT), Set.of()).isEmpty();
            if (hasWriter) {
                writerPositive++;
            }
            if (hasWriter != declared.hasWriters()) {
                problems.add(t.key() + "（表 " + t.table() + "）声明为 " + declared
                        + "（写点轴＝" + declared.hasWriters() + "），但静态派生写点＝"
                        + (hasWriter ? "有 " + writers.get(t.table().toLowerCase(Locale.ROOT)) : "零"));
            }
        }
        assertTrue(problems.isEmpty(),
                "作用面归因账的「写点轴」与代码实际不符——下面这些项的归因是错的类别：\n  "
                        + String.join("\n  ", problems));
        assertTrue(writerPositive >= 60,
                "只派生出 " + writerPositive + " 张有写点的清单表（<60），写点扫描本身失效，拒判");
    }

    @Test
    @DisplayName("死表逐张裁定：零写点集合必须恰好等于登记表，且每项 rationale 里留有裁定原文")
    void deadTableAdjudicationsAreExactlyTheZeroWriterEntries() {
        Map<String, Set<String>> writers = deriveWritePoints(locateMainSrc());
        Set<String> derivedZero = new LinkedHashSet<>();
        for (PersonalDataTable t : PersonalDataTables.INVENTORY) {
            if (t.retained()) {
                continue;
            }
            if (writers.getOrDefault(t.table().toLowerCase(Locale.ROOT), Set.of()).isEmpty()) {
                derivedZero.add(t.key());
            }
        }
        assertEquals(DEAD_TABLE_ADJUDICATIONS.keySet(), derivedZero,
                "代码级死表集合变了：" + derivedZero + "。新增死表要逐张写裁定，"
                        + "消失的死表（有人补了写点，或表被退役迁移 DROP）要把裁定与归因一起划掉——"
                        + "不许留成语义不明的空转语句");
        for (Map.Entry<String, String> e : DEAD_TABLE_ADJUDICATIONS.entrySet()) {
            PersonalDataTable item = PersonalDataTables.byKey(e.getKey());
            assertEquals(ErasureStatementSurface.DEAD_TABLE, PersonalDataTables.surfaceOf(e.getKey()),
                    e.getKey() + "：静态零写点，归因却不在 DEAD_TABLE 格（类别改错必须炸）");
            assertTrue(item.rationale().contains("W1c 裁定＝" + e.getValue()),
                    e.getKey() + "：rationale 里没有「W1c 裁定＝" + e.getValue()
                            + "」这句裁定原文——表还在链上、语句恒 0 行的东西必须写清「进清单还是撤项」的理由");
        }
    }

    @Test
    @DisplayName("归因账不许空转：三类各有地板，且三类都非空（把某类整体摘掉就红）")
    void surfaceLedgerHasEveryCategoryAboveFloor() {
        Map<ErasureStatementSurface, Integer> counts = new LinkedHashMap<>();
        for (ErasureStatementSurface s : ErasureStatementSurface.values()) {
            counts.put(s, 0);
        }
        for (ErasureStatementSurface s : PersonalDataTables.surfaceLedger().values()) {
            counts.merge(s, 1, Integer::sum);
        }
        for (Map.Entry<ErasureStatementSurface, Integer> floor : SURFACE_FLOORS.entrySet()) {
            assertTrue(counts.get(floor.getKey()) >= floor.getValue(),
                    "归因类别 " + floor.getKey() + "（" + floor.getKey().chineseLabel() + "）只有 "
                            + counts.get(floor.getKey()) + " 项，低于地板 " + floor.getValue()
                            + "——账被整体摘掉或错并到别的类别时走这条路");
        }
        assertEquals(PersonalDataTables.surfaceLedger().size(),
                counts.values().stream().mapToInt(Integer::intValue).sum(),
                "有一格的类别没被统计到（2×2 缺角）");
        // 第 4 格「有遗留行但代码无写点」本轮实测为空。它不是免检格：
        // 一旦有项落进来（例如种子数据表被点名），必须先在这里登记条数下限，
        // 再补一条能证明「行确实来自非 App 写入」的证据——否则这一格会被当成垃圾桶。
        assertEquals(0, counts.get(ErasureStatementSurface.LIVE_UNWRITTEN).intValue(),
                "归因账里出现了 LIVE_UNWRITTEN（有行、代码无写点）的项："
                        + "这一格需要先登记证据与下限，不许直接落账");
    }

    @Test
    @DisplayName("写点扫描器自证：实体+注入+mutating 调用才算写点，零注入的壳接口不算")
    void writerDetectorBitesOnFixtures() {
        Path fixture = null;
        try {
            fixture = Files.createTempDirectory("w1c-writer-fixture");
        } catch (IOException ex) {
            throw new IllegalStateException("建不了夹具目录：", ex);
        }
        try {
            write(fixture.resolve("entity/LiveEntity.java"),
                    "package p; import jakarta.persistence.Table;"
                            + " @Table(name = \"live_tbl\") public class LiveEntity {}");
            write(fixture.resolve("repo/LiveRepository.java"),
                    "package p; interface LiveRepository extends JpaRepository<LiveEntity, Long> {}");
            write(fixture.resolve("svc/LiveService.java"),
                    "package p; class LiveService { private LiveRepository liveRepository;"
                            + " void go() { liveRepository.save(new LiveEntity()); } }");

            write(fixture.resolve("entity/ShellEntity.java"),
                    "package p; import jakarta.persistence.Table;"
                            + " @Table(name = \"shell_tbl\") public class ShellEntity {}");
            write(fixture.resolve("repo/ShellRepository.java"),
                    "package p; interface ShellRepository extends JpaRepository<ShellEntity, Long> {}");

            write(fixture.resolve("svc/NativeService.java"),
                    "package p; class NativeService { void go() {"
                            + " jdbc.update(\"DELETE FROM native_tbl WHERE user_id = 1\"); } }");

            Map<String, Set<String>> w = deriveWritePoints(fixture);
            assertTrue(w.containsKey("live_tbl"), "实体+注入+save 的写点没被认出来（判点会假死）");
            assertFalse(w.containsKey("shell_tbl"),
                    "只有实体和 Repository 声明、全仓零注入的壳表被认成了有写点——user_sessions 就是这么被漏掉的");
            assertTrue(w.containsKey("native_tbl"), "原生写 SQL 的写点没被认出来");
            assertFalse(w.containsKey("live_entity"), "类名不该被当成表名");
        } finally {
            deleteTree(fixture);
        }
    }

    @Test
    @DisplayName("反向变异自检：把一条归因改成错的类别，写点轴判点必须炸（不需要真库）")
    void mislabelingASurfaceCategoryTurnsTheWriterAxisRed() {
        Map<String, Set<String>> writers = deriveWritePoints(locateMainSrc());
        List<String> reds = new ArrayList<>();
        for (PersonalDataTable t : PersonalDataTables.INVENTORY) {
            if (t.retained()) {
                continue;
            }
            boolean hasWriter = !writers.getOrDefault(t.table().toLowerCase(Locale.ROOT), Set.of()).isEmpty();
            for (ErasureStatementSurface candidate : ErasureStatementSurface.values()) {
                if (candidate.hasWriters() != hasWriter) {
                    reds.add(t.key() + "→" + candidate);
                }
            }
        }
        assertFalse(reds.isEmpty(),
                "写点轴对任何类别都不敏感——把归因改成错的类别也不会红，判点是假门");
        assertTrue(reds.stream().anyMatch(s -> s.endsWith("→DEAD_TABLE")),
                "把一条「活表/有写点」的归因改成 DEAD_TABLE 不会被写点轴抓到");
        assertTrue(reds.stream().anyMatch(s -> s.endsWith("→EMPTY_WRITTEN")
                        || s.endsWith("→LIVE_WRITTEN")),
                "把死表的归因改成有写点类别不会被写点轴抓到");
    }

    /* ==================== DB-gated：行数轴 + 外键图对账（CI 无库时跳过，不写成通过） ==================== */

    @Test
    @DisplayName("真库对账（判不出项在此变可判）：静态外键图＝information_schema，快照行数＝归因账的行数轴")
    void liveSchemaAgreesWithStaticDerivation() throws Exception {
        assumeTrue("true".equals(System.getProperty("erasure.db.enabled")),
                "未开启 -Derasure.db.enabled=true：行数轴与外键图的真库对账判不出（CI 无库走这条）");
        Path env = ErasureMigrationGraph.locateMigrationDir().getParent().getParent().getParent()
                .resolve(".env");
        assumeTrue(Files.isRegularFile(env), "找不到仓库根 .env，真库对账判不出");
        Map<String, String> e = readDotEnv(env);
        assumeTrue(e.containsKey("DB_URL") && e.containsKey("DB_USERNAME"), ".env 里没有 DB_URL/DB_USERNAME");

        ErasureMigrationGraph graph = ErasureMigrationGraph.load(ErasureMigrationGraph.locateMigrationDir());
        try (Connection c = DriverManager.getConnection(e.get("DB_URL"), e.get("DB_USERNAME"),
                e.getOrDefault("DB_PASSWORD", ""))) {
            // 1) 外键图逐条对账（含 ON DELETE 策略）
            Set<String> liveEdges = new LinkedHashSet<>();
            try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(
                    "SELECT CONCAT_WS('|',k.TABLE_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,r.DELETE_RULE)"
                            + " FROM information_schema.KEY_COLUMN_USAGE k"
                            + " JOIN information_schema.REFERENTIAL_CONSTRAINTS r"
                            + " ON r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.CONSTRAINT_SCHEMA=k.TABLE_SCHEMA"
                            + " WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL")) {
                while (rs.next()) {
                    liveEdges.add(rs.getString(1).toLowerCase(Locale.ROOT));
                }
            }
            Set<String> staticEdges = new LinkedHashSet<>();
            for (ForeignKey fk : graph.edges()) {
                staticEdges.add((fk.child() + "|" + fk.column() + "|" + fk.parent() + "|" + fk.onDelete())
                        .toLowerCase(Locale.ROOT));
            }
            assertEquals(liveEdges.size(), staticEdges.size(),
                    "静态解析出 " + staticEdges.size() + " 条外键边，库里真值 " + liveEdges.size()
                            + " 条——解析器缺形态，顺序判点会静默漏判");
            List<String> onlyLive = new ArrayList<>(liveEdges);
            onlyLive.removeAll(staticEdges);
            List<String> onlyStatic = new ArrayList<>(staticEdges);
            onlyStatic.removeAll(liveEdges);
            assertTrue(onlyLive.isEmpty(), "库上有而静态解析没有的外键边（顺序判点看不见它们）：" + onlyLive);
            assertTrue(onlyStatic.isEmpty(), "静态解析凭空造出的外键边：" + onlyStatic);

            // 2) 在场表集合对账（flyway_schema_history 是 Flyway 自己的账本，不由迁移链 CREATE）
            Set<String> liveTables = new LinkedHashSet<>();
            try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(
                    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()")) {
                while (rs.next()) {
                    liveTables.add(rs.getString(1).toLowerCase(Locale.ROOT));
                }
            }
            Set<String> expected = new LinkedHashSet<>(graph.existingTables());
            expected.add("flyway_schema_history");
            assertEquals(expected, liveTables, "迁移链派生的在场表集合与库上不一致");

            // 3) 归因账的行数轴：LIVE_* ⇔ COUNT(*)>0
            List<String> rowProblems = new ArrayList<>();
            for (PersonalDataTable t : PersonalDataTables.INVENTORY) {
                if (t.retained()) {
                    continue;
                }
                String table = t.table().toLowerCase(Locale.ROOT);
                ErasureStatementSurface declared = PersonalDataTables.surfaceOf(t.key());
                long rows;
                try (Statement st = c.createStatement(); ResultSet rs = st
                        .executeQuery("SELECT COUNT(*) FROM `" + table + "`")) {
                    rs.next();
                    rows = rs.getLong(1);
                }
                if (rows > 0 != declared.rowsPresent()) {
                    rowProblems.add(t.key() + "（表 " + table + "）声明 " + declared
                            + "（有行＝" + declared.rowsPresent() + "），本快照实测 " + rows + " 行");
                }
            }
            assertTrue(rowProblems.isEmpty(),
                    "作用面归因账的「行数轴」与本快照不符：\n  " + String.join("\n  ", rowProblems));
        }
    }

    /* ==================== 判据实现（纯函数，真实清单与夹具共用同一条路） ==================== */

    /** 一条语句在它所属清单里的<b>执行序号</b>（与 {@code AccountErasureService#erase} 的发出顺序一致）。 */
    private record Stmt(String key, String table, int ordinal, boolean deletes) {
    }

    private static List<Stmt> statementsOf(List<PersonalDataTable> inventory) {
        List<Stmt> out = new ArrayList<>();
        int ordinal = 0;
        for (PersonalDataTable t : inventory) {
            for (String sql : t.statements()) {
                String target = deleteTarget(sql);
                out.add(new Stmt(t.key(), target == null
                        ? t.table().toLowerCase(Locale.ROOT) : target, ordinal, target != null));
                ordinal++;
            }
        }
        return out;
    }

    private static final Pattern DELETE_TARGET = Pattern.compile(
            "^\\s*DELETE\\s+(?:[A-Za-z0-9_]+\\s+)?FROM\\s+`?([A-Za-z0-9_]+)`?", Pattern.CASE_INSENSITIVE);

    /** 删除语句的目标表（非 DELETE 语句返回 null——UPDATE 不销毁行，不参与顺序判点）。 */
    private static String deleteTarget(String sql) {
        Matcher m = DELETE_TARGET.matcher(sql);
        return m.find() ? m.group(1).toLowerCase(Locale.ROOT) : null;
    }

    /** 顺序判点本体：父表删除必须排在它所有「被清单删除的子表」之后。 */
    private static List<String> orderingProblems(List<Stmt> stmts, ErasureMigrationGraph graph) {
        Map<String, List<Integer>> deleteOrdinals = new LinkedHashMap<>();
        for (Stmt s : stmts) {
            if (s.deletes()) {
                deleteOrdinals.computeIfAbsent(s.table(), k -> new ArrayList<>()).add(s.ordinal());
            }
        }
        List<String> problems = new ArrayList<>();
        for (Stmt s : stmts) {
            if (!s.deletes()) {
                continue;
            }
            for (ForeignKey child : graph.childrenByParent().getOrDefault(s.table(), List.of())) {
                List<Integer> childOrdinals = deleteOrdinals.get(child.child());
                if (childOrdinals == null || childOrdinals.isEmpty()) {
                    continue; // 子表不删 ⇒ 由「级联登记表」那条判点管，不是顺序问题
                }
                int childLast = Collections_max(childOrdinals);
                if (childLast > s.ordinal()) {
                    problems.add("清单项 " + s.key() + " 删父表 " + s.table() + "（第 " + (s.ordinal() + 1)
                            + " 条语句），但子表 " + child.child() + "（外键 " + child.column()
                            + "，ON DELETE " + child.onDelete() + "）的删除排在第 "
                            + (childLast + 1) + " 条之后——父表先删要么撞外键约束、要么把子表连带清空");
                }
            }
        }
        return problems;
    }

    /** 被清单删行、且自身有外键子表的父表集合。 */
    private static Set<String> deletingParentTables(List<Stmt> stmts, ErasureMigrationGraph graph) {
        Set<String> out = new LinkedHashSet<>();
        Map<String, List<Integer>> del = new LinkedHashMap<>();
        for (Stmt s : stmts) {
            if (s.deletes()) {
                del.computeIfAbsent(s.table(), k -> new ArrayList<>()).add(s.ordinal());
            }
        }
        for (String table : del.keySet()) {
            if (graph.childrenByParent().containsKey(table)) {
                out.add(table);
            }
        }
        return out;
    }

    /** 删行的父表 → 它那些「清单没点名删除」的子表。 */
    private static Map<String, Set<String>> undeletedChildrenOfDeletingParents(
            List<Stmt> stmts, ErasureMigrationGraph graph) {
        Set<String> deleted = new LinkedHashSet<>();
        for (Stmt s : stmts) {
            if (s.deletes()) {
                deleted.add(s.table());
            }
        }
        Map<String, Set<String>> out = new LinkedHashMap<>();
        for (String parent : deletingParentTables(stmts, graph)) {
            for (ForeignKey child : graph.childrenByParent().getOrDefault(parent, List.of())) {
                if (!deleted.contains(child.child())) {
                    out.computeIfAbsent(parent, k -> new LinkedHashSet<>()).add(child.child());
                }
            }
        }
        return out;
    }

    private static int Collections_max(List<Integer> xs) {
        int m = Integer.MIN_VALUE;
        for (int x : xs) {
            m = Math.max(m, x);
        }
        return m;
    }

    private static String rule(ErasureMigrationGraph g, String child, String column, String parent) {
        return g.edges().stream()
                .filter(f -> f.child().equals(child) && f.column().equals(column) && f.parent().equals(parent))
                .map(ForeignKey::onDelete).findFirst()
                .orElseThrow(() -> new AssertionError("夹具外键边没被解析出来：" + child + "." + column
                        + " -> " + parent + "，实际边集=" + g.edges()));
    }

    private static PersonalDataTable deleteItem(String key, String table) {
        return PersonalDataTable.of(key, table, "夹具", ErasureAction.DELETE_ROWS, List.of(),
                List.of("user_id"), List.of("DELETE FROM " + table + " WHERE user_id = {uid}"),
                List.of(), "夹具");
    }

    /* ==================== 代码写点派生（事项三的静态那一半） ==================== */

    private static final Pattern TABLE_ANNOTATION = Pattern.compile(
            "@Table\\s*\\(\\s*(?:name\\s*=\\s*)?\"([A-Za-z0-9_]+)\"");
    private static final Pattern ENTITY_DECL = Pattern.compile("\\b(?:class|record|enum)\\s+([A-Za-z0-9_]+)");
    private static final Pattern REPOSITORY_DECL = Pattern.compile(
            "interface\\s+(\\w*(?:Repository|Dao))[^{}]*?<\\s*([A-Z][A-Za-z0-9_]*)\\s*(?:,|>)");
    private static final Pattern MUTATING_CALL = Pattern.compile(
            "\\b([a-z][A-Za-z0-9_]*)\\.(saveAllAndFlush|saveAll|saveAndFlush|save"
                    + "|deleteAllInBatch|deleteAll|deleteById|deleteInBatch|delete"
                    + "|insert|upsert|update|persist|merge)\\s*\\(");
    private static final Pattern WRITE_SQL = Pattern.compile(
            "\\b(?:insert\\s+into|delete\\s+from|replace\\s+into)\\s+`?([a-z][a-z0-9_]{2,})`?"
                    + "|\\bupdate\\s+`?([a-z][a-z0-9_]{2,})`?\\s+set\\b",
            Pattern.CASE_INSENSITIVE);

    /**
     * 从 {@code apps/api/src/main}（<b>排除 privacy 包本身</b>——清单里的 DELETE/UPDATE 语句是注销通道自己，
     * 把它们算成写点就等于「清单证明清单」）派生「表 → 写点证据」。
     *
     * <p>两种写点：
     * ①实体映射到该表，且该实体的 Repository 接口在别的文件里被以该类型接收、并被调用过
     * mutating 方法（save/delete/…）——注意「接口存在但全仓零注入」不算写点，
     * {@code user_sessions} 就是这一格（有实体有接口、没人用）；
     * ②源码文本里出现 {@code INSERT INTO t}/{@code UPDATE t SET}/{@code DELETE FROM t} 形态的原生 SQL。</p>
     */
    private static Map<String, Set<String>> deriveWritePoints(Path mainSrc) {
        Map<Path, String> files = new LinkedHashMap<>();
        List<Path> all;
        try (Stream<Path> stream = Files.walk(mainSrc)) {
            all = stream.filter(Files::isRegularFile)
                    .filter(p -> {
                        String n = p.getFileName().toString();
                        return n.endsWith(".java") || n.endsWith(".xml") || n.endsWith(".yml")
                                || n.endsWith(".properties");
                    })
                    .sorted(Comparator.comparing(Path::toString))
                    .toList();
        } catch (IOException ex) {
            throw new IllegalStateException("列不出 " + mainSrc + "：", ex);
        }
        for (Path p : all) {
            if (p.toString().replace('\\', '/').contains("/privacy/")) {
                continue;
            }
            try {
                files.put(p, Files.readString(p, StandardCharsets.UTF_8));
            } catch (IOException ex) {
                throw new IllegalStateException("读不了 " + p + "：", ex);
            }
        }
        assertFalse(files.isEmpty(), mainSrc + " 下没扫到任何源文件，写点扫描是空门");

        Map<String, String> tableOfEntity = new LinkedHashMap<>();
        for (Map.Entry<Path, String> e : files.entrySet()) {
            Matcher m = TABLE_ANNOTATION.matcher(e.getValue());
            while (m.find()) {
                Matcher decl = ENTITY_DECL.matcher(e.getValue().substring(m.end()));
                String entity = decl.find() ? decl.group(1)
                        : e.getKey().getFileName().toString().replace(".java", "");
                tableOfEntity.put(entity, m.group(1).toLowerCase(Locale.ROOT));
            }
        }

        Map<String, Set<String>> out = new LinkedHashMap<>();
        // 写点 ①：原生写 SQL
        for (Map.Entry<Path, String> e : files.entrySet()) {
            Matcher m = WRITE_SQL.matcher(e.getValue());
            while (m.find()) {
                String table = (m.group(1) != null ? m.group(1) : m.group(2)).toLowerCase(Locale.ROOT);
                out.computeIfAbsent(table, k -> new LinkedHashSet<>())
                        .add("sql@" + e.getKey().getFileName());
            }
        }
        // 写点 ②：实体 → Repository → 被注入的接收者上的 mutating 调用
        for (Map.Entry<Path, String> e : files.entrySet()) {
            Matcher decl = REPOSITORY_DECL.matcher(e.getValue());
            while (decl.find()) {
                String repo = decl.group(1);
                String entity = decl.group(2);
                String table = tableOfEntity.get(entity);
                if (table == null) {
                    continue;
                }
                for (Map.Entry<Path, String> other : files.entrySet()) {
                    if (other.getKey().equals(e.getKey())) {
                        continue;
                    }
                    if (!other.getValue().contains(repo)) {
                        continue;
                    }
                    Matcher call = MUTATING_CALL.matcher(other.getValue());
                    while (call.find()) {
                        String receiver = call.group(1);
                        if (Pattern.compile("\\b" + repo + "\\s+" + receiver + "\\b")
                                .matcher(other.getValue()).find()) {
                            out.computeIfAbsent(table, k -> new LinkedHashSet<>())
                                    .add(repo + "." + call.group(2) + "@" + other.getKey().getFileName());
                            break;
                        }
                    }
                }
            }
        }
        return out;
    }

    /* ==================== 路径与工具 ==================== */

    /** 定位 {@code apps/api/src/main}（CI 里 {@code mvn -f apps/api/pom.xml} 与工作目录 {@code apps/api} 都要能找到）。 */
    private static Path locateMainSrc() {
        Path cursor = Path.of("").toAbsolutePath();
        for (int i = 0; i < 6 && cursor != null; i++) {
            Path candidate = cursor.resolve("src").resolve("main");
            if (Files.isDirectory(candidate) && cursor.getFileName().toString().equals("api")) {
                return candidate;
            }
            Path nested = cursor.resolve("apps").resolve("api").resolve("src").resolve("main");
            if (Files.isDirectory(nested)) {
                return nested;
            }
            cursor = cursor.getParent();
        }
        throw new IllegalStateException("从 " + Path.of("").toAbsolutePath()
                + " 向上找不到 apps/api/src/main，写点扫描无法运行");
    }

    private static Map<String, String> readDotEnv(Path file) throws IOException {
        Map<String, String> out = new LinkedHashMap<>();
        for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            String s = line.trim();
            if (s.isEmpty() || s.startsWith("#")) {
                continue;
            }
            int eq = s.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            String value = s.substring(eq + 1).trim();
            if (value.length() >= 2 && (value.startsWith("\"") && value.endsWith("\"")
                    || value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length() - 1);
            }
            out.put(s.substring(0, eq).trim(), value);
        }
        return out;
    }

    private static void write(Path file, String text) {
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, text, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("写不了夹具 " + file + "：", ex);
        }
    }

    private static void deleteTree(Path root) {
        try (Stream<Path> stream = Files.walk(root)) {
            stream.sorted(Comparator.comparingInt(Path::getNameCount)).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // 临时目录由 OS 回收，判点结果不受影响
                }
            });
        } catch (IOException ignored) {
            // 同上
        }
    }
}
