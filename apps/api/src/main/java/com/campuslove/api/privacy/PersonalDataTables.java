package com.campuslove.api.privacy;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 注销清除清单（<b>单一事实来源</b>）：主体的数据在库里的哪张表、以何种方式消灭、为什么。
 *
 * <p>来历（P0，2026-10-31 审计）：旧 {@code RealAccountSecurityService#deactivateAccount}
 * 只改写 {@code users} 的 3 列（nickname/avatar_url/phone），其余 20+ 类个人信息原封不动，
 * 包括 {@code real_name_certifications.user_name/id_card_no}（实盘 261 行）、
 * {@code campus_certifications.chsi_code/student_id_card_url}、
 * {@code users.openid/birth_date/latitude/longitude/campus_name}、
 * {@code user_basic_profile.nickname/photo_gallery/half_body_photo_url}、
 * {@code user_campus_profile.department_name/city_name}。
 * 同一天里 {@code PersonalDataService}（PIPL 第 45 条查阅/复制权）已经把「主体的数据是哪些表」
 * 列对了——两份清单并存是这次 P0 的结构性根因。本清单接管它：导出侧与删除侧共用同一份
 * 表/类别集合，任何一侧新增而另一侧未跟，{@link #assertMatchesExportCategories(List)} 与
 * {@code AccountErasureServiceTest} 会立刻失败。</p>
 *
 * <p>SQL 约定：</p>
 * <ul>
 *   <li>{@code {uid}} 是主体 userId 占位符，由 {@link AccountErasureService} 展开为 JDBC {@code ?}
 *       并<b>只</b>出现在 WHERE/JOIN 侧；出现在 SET 右侧即等于「写了 userId 派生的稳定化名」，
 *       由测试禁止（见 {@code noSetClauseDerivesFromSubjectId}）。</li>
 *   <li>字面量全部来自 {@link ErasedValues}，保证「匿名」值既不含主体标识，也不会被
 *       AES 解密路径误判成密文。</li>
 *   <li>执行顺序 = 本清单顺序，按外键自下而上（先删/改引用行，{@code users} 墓碑最后写），
 *       任何一条失败整个事务回滚（不留「昵称改了、身份证还在」的半注销态）。</li>
 * </ul>
 */
public final class PersonalDataTables {

    /** 全部清单项（顺序即执行顺序）。 */
    public static final List<PersonalDataTable> INVENTORY = sanityCheck(buildInventory());

    private PersonalDataTables() {
        throw new UnsupportedOperationException("常量类不可实例化");
    }

    /**
     * 清单自检：把「写错就不该上线」的规则前移到类加载期。
     *
     * <ul>
     *   <li>key 唯一（同一物理表允许多条，但键不能重复）；</li>
     *   <li>一个导出类别最多被一项声明（两项都声明 {@code posts} 会让覆盖校验假绿）；</li>
     *   <li>{@code RETAIN_STATUTORY} 必须零语句；其余项必须至少有一条语句
     *       （users 项另有实体写入，允许只带未映射列的原生语句）；</li>
     *   <li>非保留项必须声明至少一个「必须消失的列」——否则测试无从验证；</li>
     *   <li>SET 子句里禁止出现 {@code {uid}}：任何由主体 ID 拼出来的值都是可反推的化名，
     *       不是匿名（这正是旧 {@code "1****"+userId} 哨兵被判 P0 的原因）。</li>
     * </ul>
     */
    private static List<PersonalDataTable> sanityCheck(List<PersonalDataTable> inventory) {
        Set<String> keys = new LinkedHashSet<>();
        Set<String> categories = new LinkedHashSet<>();
        for (PersonalDataTable t : inventory) {
            if (!keys.add(t.key())) {
                throw new IllegalStateException("清除清单 key 重复: " + t.key());
            }
            for (String category : t.exportCategories()) {
                if (!categories.add(category)) {
                    throw new IllegalStateException("导出类别被两个清单项重复声明: " + category);
                }
            }
            if (t.retained() && !t.statements().isEmpty()) {
                throw new IllegalStateException("RETAIN 项不应带 SQL: " + t.key());
            }
            if (!t.retained() && t.statements().isEmpty() && !t.viaUserEntity()) {
                throw new IllegalStateException("清单项既非保留也没有可执行语句: " + t.key());
            }
            if (!t.retained() && t.identifyingColumns().isEmpty()) {
                throw new IllegalStateException("清单项未声明需消灭的列，无法验证: " + t.key());
            }
            for (String sql : t.statements()) {
                if (setClauseOf(sql).contains("{uid}")) {
                    throw new IllegalStateException(
                            "SET 子句里出现 {uid}（等于写可反推的化名）: " + t.key());
                }
            }
        }
        return List.copyOf(inventory);
    }

    /** 取 SQL 的 SET 子句文本（无 SET 时返回空串），供 {@link #sanityCheck(List)} 使用。 */
    static String setClauseOf(String sql) {
        int set = sql.toUpperCase(java.util.Locale.ROOT).indexOf(" SET ");
        if (set < 0) {
            return "";
        }
        int where = sql.toUpperCase(java.util.Locale.ROOT).indexOf(" WHERE ", set);
        return where < 0 ? sql.substring(set) : sql.substring(set, where);
    }

    // ---- 自检：与导出清单逐字对齐 ----

    /**
     * 校验导出实际产出的类别集合与本清单声明的类别集合完全一致。
     *
     * <p>由 {@code PersonalDataService#build} 在返回前调用（与列宽自检同构）：
     * 一旦有人给导出加了新类别却没在清除清单登记（或反之），线上第一次导出就 500，
     * 而不是安静地「用户能导出、却删不掉」。</p>
     *
     * @param exportCategoryNames 导出产出的类别名（有序无关）
     * @throws IllegalStateException 两侧不一致
     */
    public static void assertMatchesExportCategories(List<String> exportCategoryNames) {
        Set<String> declared = declaredExportCategories();
        Set<String> actual = new LinkedHashSet<>(exportCategoryNames);
        List<String> onlyInExport = new ArrayList<>(actual);
        onlyInExport.removeAll(declared);
        List<String> onlyInRegistry = new ArrayList<>(declared);
        onlyInRegistry.removeAll(actual);
        if (!onlyInExport.isEmpty() || !onlyInRegistry.isEmpty()) {
            throw new IllegalStateException("个人信息清除清单与导出清单已分叉：导出有但未登记="
                    + onlyInExport + "，已登记但导出不产出=" + onlyInRegistry);
        }
    }

    /** 本清单声明覆盖的导出类别名（并集）。 */
    public static Set<String> declaredExportCategories() {
        Set<String> names = new LinkedHashSet<>();
        for (PersonalDataTable t : INVENTORY) {
            names.addAll(t.exportCategories());
        }
        return names;
    }

    /** 按清单项键取回。 */
    public static PersonalDataTable byKey(String key) {
        return INVENTORY.stream().filter(t -> t.key().equals(key)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("清除清单无此项: " + key));
    }

    /**
     * 「删除/匿名」项的必需执行语句数（RETAIN 项为 0）。
     *
     * @return 非保留项数，供测试断言清单里没有空操作项
     */
    public static long actionableCount() {
        return INVENTORY.stream().filter(t -> !t.retained()).count();
    }

    // ---- 清单 ----

    private static List<PersonalDataTable> buildInventory() {
        List<PersonalDataTable> list = new ArrayList<>(64);

        // ============================================================
        // 1) 上传物与照片：先取回 URL（删除后无法再定位文件），行随后删
        // ============================================================
        list.add(PersonalDataTable.of(
                "media_asset", "media_asset", "上传素材（图片/语音/视频）",
                ErasureAction.DELETE_ROWS, List.of(),
                List.of("url", "original_name"),
                List.of("DELETE FROM media_asset WHERE user_id = {uid}"),
                List.of("SELECT url FROM media_asset WHERE user_id = {uid}"),
                "主体的原始上传物，无任何法定保留义务；行删除 + 对象存储文件在事务提交后物理删除。"
                        + "注：user_basic_profile.photo_gallery 是 JSON 数组、无法逐元素 SELECT，"
                        + "其指向的文件依赖本表覆盖（每次上传都落一行 media_asset）——"
                        + "该假设未经实盘验证，见交付说明的 NOT VERIFIED 清单。"));

        // ============================================================
        // 2) 资料类（导出类别 profile_* / interest_tags）——整行删除
        // ============================================================
        list.add(PersonalDataTable.of(
                "user_basic_profile", "user_basic_profile", "基本资料",
                ErasureAction.DELETE_ROWS, List.of("profile_basic"),
                List.of("user_id", "nickname", "bio", "grade_label", "pronouns", "gender",
                        "interest_tags", "height", "education_level", "relationship_status",
                        "hometown_province", "hometown_city", "future_city", "future_plan_tags",
                        "occupation", "income_range", "personality_tags", "mbti",
                        "expected_partner", "birth_year", "email_verified", "id_card_verified",
                        "photo_gallery", "half_body_photo_url", "personal_video_url",
                        "profile_background_url"),
                List.of("DELETE FROM user_basic_profile WHERE user_id = {uid}"),
                List.of("SELECT half_body_photo_url FROM user_basic_profile WHERE user_id = {uid}",
                        "SELECT personal_video_url FROM user_basic_profile WHERE user_id = {uid}",
                        "SELECT profile_background_url FROM user_basic_profile WHERE user_id = {uid}"),
                "全部列都是主体的自我描述（含出生年份、籍贯、收入档、半身照/相册 URL）。"
                        + "该表 nickname 等 4 列 NOT NULL，无法逐列置空，且没有任何外部引用它，"
                        + "因此删除整行比写占位值更诚实。读取侧一律是 findByUserId(...).ifPresent/orElse"
                        + "（唯一 orElseThrow 在 RealCampusCertificationService，只有本人会话可触发，"
                        + "注销后 token 已吊销，不可达）。"));
        list.add(deleteRows("user_campus_profile", List.of("profile_campus"),
                "city_name/campus_name/department_name 三列 NOT NULL，「院系 + 校区」组合是强再识别特征"
                        + "（小院系里几乎唯一），置占位值等于留着同等信息量，故整行删除。"));
        list.add(deleteRows("user_schedule_profile", List.of("profile_schedule"),
                "课表 JSON 是行踪轨迹级别的精细时间习惯，无保留义务。"));
        list.add(deleteRows("user_interest_tag", List.of("interest_tags"),
                "标签关联行；tag_id 外键指向公共标签表，删除不影响标签字典。"));

        // ============================================================
        // 3) 认证材料（高敏）——整行删除 + 证件照文件删除
        // ============================================================
        list.add(PersonalDataTable.of(
                "real_name_certifications", "real_name_certifications", "实名认证记录",
                ErasureAction.DELETE_ROWS, List.of("real_name_certification"),
                List.of("user_name", "id_card_no", "id_card_front_url", "id_card_back_url",
                        "reviewer_id"),
                List.of("DELETE FROM real_name_certifications WHERE user_id = {uid}"),
                List.of("SELECT id_card_front_url FROM real_name_certifications WHERE user_id = {uid}",
                        "SELECT id_card_back_url FROM real_name_certifications WHERE user_id = {uid}"),
                "PIPL 第 28 条高敏个人信息；id_card_no 是 AES 密文但密文≠匿名，密钥一旦泄露即可还原，"
                        + "且 user_name 为明文。核验义务随服务终止消灭，整行删除（旧实现只删照片文件、"
                        + "留下实盘 261 行姓名+身份证密文，就是本次 P0）。"
                        + "注：本表 user_id 外键→users 无 CASCADE，说明数据库设计本就不允许删 users 行，"
                        + "users 只能墓碑化。"));
        list.add(PersonalDataTable.of(
                "campus_certifications", "campus_certifications", "校园认证材料",
                ErasureAction.DELETE_ROWS, List.of("campus_certification"),
                List.of("school_name", "major", "student_id_card_url", "chsi_code",
                        "chsi_screenshot_url", "review_comment"),
                List.of("DELETE FROM campus_certifications WHERE user_id = {uid}"),
                List.of("SELECT student_id_card_url FROM campus_certifications WHERE user_id = {uid}",
                        "SELECT chsi_screenshot_url FROM campus_certifications WHERE user_id = {uid}"),
                "学信码 + 学生证照片 + 学校/专业组合可唯一定位在校生；行删除，文件提交后删除。"
                        + "user_id 有唯一键（每人一条），删除天然幂等。"));
        list.add(PersonalDataTable.of(
                "love_verification_application", "love_verification_application", "恋爱认证申请",
                ErasureAction.DELETE_ROWS, List.of(),
                List.of("student_name", "student_id", "school_name", "student_id_card_url"),
                List.of("DELETE FROM love_verification_application WHERE user_id = {uid}"),
                List.of("SELECT student_id_card_url FROM love_verification_application "
                        + "WHERE user_id = {uid}"),
                "导出清单里没有本表（导出侧的缺口），但表里存着明文真实姓名 + 学号 + 证件照，"
                        + "注销必须覆盖；已列入交付说明的「导出应补类别」。"));

        // ============================================================
        // 4) 聊天：临时会话按设计短命→整链删除；私信是持久内容→只删我写的
        // ============================================================
        list.add(PersonalDataTable.of(
                "temp_chat_message", "temp_chat_message", "我发出的临时聊天消息",
                ErasureAction.DELETE_ROWS, List.of("temp_chat_messages"),
                List.of("body", "quote_snapshot", "sender"),
                List.of("DELETE m FROM temp_chat_message m JOIN temp_chat_session s "
                        + "ON m.session_id = s.id WHERE s.user_a_id = {uid} OR s.user_b_id = {uid}"),
                List.of(),
                "显式删消息（虽然下一条删会话时 FK 会级联）：万一级联策略被改动，"
                        + "消息正文也不会残留。临时会话按产品语义 24h 过期 + 每小时保留期清理，"
                        + "整体删除不会破坏对方长期数据。"));
        list.add(PersonalDataTable.of(
                "temp_chat_session", "temp_chat_session", "临时聊天会话",
                ErasureAction.DELETE_ROWS, List.of("temp_chat_sessions"),
                List.of("session_uid", "user_a_id", "user_b_id", "match_id",
                        "recommended_person_id", "last_message_preview", "phase"),
                List.of("DELETE ts FROM temp_chat_session ts "
                        + "WHERE ts.user_a_id = {uid} OR ts.user_b_id = {uid}"),
                List.of(),
                "会话行由双方共享、无独立保留价值（内容已由 TempChatCleanupService 的保留期任务定期清空），"
                        + "级联带走 temp_chat_message 与 temp_chat_contact_exchange（两者 FK 均 ON DELETE CASCADE）。"
                        + "session_uid 是含 userId 的字符串（session-1-2-abc12345），只匿名内容列是删不干净它的，"
                        + "所以整行删除。"));
        list.add(PersonalDataTable.of(
                "private_messages_outgoing", "private_messages", "我发出的私信",
                ErasureAction.DELETE_ROWS, List.of("private_messages"),
                List.of("content", "quote_context", "sender_id"),
                List.of("DELETE FROM private_messages WHERE sender_id = {uid}"),
                List.of(),
                "我发出的消息正文属我，删除；对方发出的消息属对方，不替对方销毁。"));
        list.add(PersonalDataTable.of(
                "private_messages_inbound_quote", "private_messages", "他人私信里引用我的内容快照",
                ErasureAction.INBOUND_REFERENCE_NULLIFIED, List.of(),
                List.of("quote_context"),
                List.of("UPDATE private_messages pm JOIN private_conversations pc "
                        + "ON pm.conversation_id = pc.id SET pm.quote_context = NULL "
                        + "WHERE (pc.user_a_id = {uid} OR pc.user_b_id = {uid}) "
                        + "AND pm.sender_id <> {uid}"),
                List.of(),
                "对方消息行里的引用快照可能整段是我的原文（我的数据），置 NULL；"
                        + "对方自己写的正文列不动——注销主体不授权删除他人数据。"));
        list.add(PersonalDataTable.of(
                "private_conversations", "private_conversations", "私信会话壳",
                ErasureAction.ANONYMISE_IN_PLACE, List.of("private_conversations"),
                List.of("last_message_preview"),
                List.of("UPDATE private_conversations SET last_message_preview = NULL "
                        + "WHERE user_a_id = {uid} OR user_b_id = {uid}"),
                List.of(),
                "会话行保留：对方还依赖它读自己的聊天记录，删行等于越权销毁第三方数据。"
                        + "预览文本可能是我发出的内容，必须清空。conversation_uid / user_a_id / user_b_id "
                        + "留存不构成识别——它们只指向已无身份列的墓碑行。"));

        // ============================================================
        // 5) 关系边：我发起的删掉，指向我的留着（是别人的数据，且只指向墓碑）
        // ============================================================
        list.add(deleteRows("likes_outgoing", "likes", "我发出的喜欢", "user_id",
                List.of("likes_given"),
                "我发起的喜欢是我的意思表示，删除。"));
        list.add(PersonalDataTable.of(
                "likes_inbound", "likes", "别人发给我的喜欢",
                ErasureAction.RETAIN_STATUTORY, List.of("likes_received"),
                List.of("target_user_id"), List.of(), List.of(),
                "行属发起方（他的喜欢记录），保留：注销主体不授权代他人删除数据。"
                        + "target_user_id 只指向 users 墓碑（身份列已全部销毁），"
                        + "去掉身份列后该行不再能识别主体：能看到的只是「某个已注销账号被喜欢过」。"));
        list.add(deleteRows("user_follows_outgoing", "user_follows", "我的关注", "follower_id",
                List.of("follows_given"), "我发起的关注边删除；对方 followers_count 的计数偏差属已知代价。"));
        list.add(PersonalDataTable.of(
                "user_follows_inbound", "user_follows", "别人对我的关注",
                ErasureAction.RETAIN_STATUTORY, List.of("follows_received"),
                List.of("following_id"), List.of(), List.of(),
                "同 likes_inbound：边属他人，行保留；following_id 解析到无身份墓碑行，不构成识别。"));
        list.add(PersonalDataTable.of(
                "heart_signals", "heart_signals", "心动信号/匹配",
                ErasureAction.DELETE_ROWS, List.of("heart_signals"),
                List.of("user_a_id", "user_b_id"),
                List.of("DELETE FROM heart_signals WHERE user_a_id = {uid} OR user_b_id = {uid}"),
                List.of(),
                "信号行是「A 与 B 配对」这一事实本身，无法只抹掉一半；且带 expires_at，"
                        + "过期清理任务本就会回收。删除双方各少一条匹配历史，是注销的必然结果。"));
        list.add(deleteRows("pass_records", "pass_records", "Pass/跳过记录", "user_id", List.of(),
                "「我跳过了谁」是偏好型行为轨迹；导出清单未声明（缺口），但注销应覆盖。"));
        list.add(deleteRows("interaction_events", "interaction_events", "互动事件流",
                List.of("user_id", "trigger_user_id"),
                "互动事件里我既是接收方也是触发方，两个列都指向主体，整行删除；"
                        + "trigger_user_id NOT NULL 无法置空（这是它不用 INBOUND 的原因）。",
                "DELETE FROM interaction_events WHERE user_id = {uid} OR trigger_user_id = {uid}"));

        // ============================================================
        // 6) UGC：行留着（第三方在引用它），主体写的内容列清掉
        // ============================================================
        list.add(PersonalDataTable.of(
                "posts", "posts", "我发布的动态",
                ErasureAction.ANONYMISE_IN_PLACE, List.of("posts"),
                List.of("title", "content", "images", "tags", "owner_circle_path", "audit_remark",
                        "status"),
                List.of("UPDATE posts SET title = NULL, content = "
                        + quote(ErasedValues.TEXT_CONTENT) + ", images = NULL, tags = NULL, "
                        + "owner_circle_path = NULL, audit_remark = NULL, status = 'deleted' "
                        + "WHERE author_id = {uid}"),
                List.of(),
                "不删行：comments.post_id 有 FK ON DELETE CASCADE，删动态会连带销毁<b>别人</b>的评论。"
                        + "正文/图片/话题/审核备注全部消失，status 置 deleted 使其不再出现在任何列表；"
                        + "author_id 指向无身份墓碑行。这是「匿名」而非「化名」：占位值是常量文本，"
                        + "不含 postId/authorId。"));
        list.add(PersonalDataTable.of(
                "comments", "comments", "我发的评论",
                ErasureAction.ANONYMISE_IN_PLACE, List.of("comments"),
                List.of("content", "images", "owner_circle_path"),
                List.of("UPDATE comments SET content = " + quote(ErasedValues.TEXT_CONTENT)
                        + ", images = NULL, owner_circle_path = NULL WHERE author_id = {uid}"),
                List.of(),
                "楼中楼用 parent_id 串接且 comment_likes 引用评论行，删行会破坏第三方线程与点赞对象，"
                        + "因此只清内容列。"));

        // ============================================================
        // 7) 通知/访客/草稿/偏好/行为轨迹：主体的数据，整行删除
        // ============================================================
        list.add(deleteRows("notifications_outgoing", "notifications", "我收到的站内通知", "user_id",
                List.of("notifications"),
                "通知属主体（他的收件箱），删除；下一条处理别人引用我的部分。"));
        list.add(PersonalDataTable.of(
                "notifications_inbound", "notifications", "别人通知里「来自我」的引用",
                ErasureAction.INBOUND_REFERENCE_NULLIFIED, List.of(),
                List.of("source_user_id"),
                List.of("UPDATE notifications SET source_user_id = NULL WHERE source_user_id = {uid}"),
                List.of(),
                "行属他人，只抹掉指向我的 source_user_id（与 FK 的 ON DELETE SET NULL 同语义），"
                        + "与建表时的约束设计一致，不销毁他人通知内容。"));
        list.add(deleteRows("profile_visitors", "profile_visitors", "我的访客足迹", "visitor_id",
                List.of(),
                "「我看过谁的主页」是可推断社交意图的行踪数据（导出清单未声明）。"
                        + "host_id 方向的行属被访者，保留：它只指向墓碑。"));
        list.add(deleteRows("post_draft", "post_draft", "未发布草稿", "user_id", List.of(),
                "草稿含正文/位置描述，未发布因而无任何第三方引用，直接删除（导出清单未声明）。"));
        list.add(deleteRows("user_match_ticket", "user_match_ticket", "匹配排队票", "user_id", List.of(),
                "含话题偏好与临时会话 uid，删除。"));
        list.add(deleteRows("recommendation_preferences", "recommendation_preferences", "推荐偏好",
                "user_id", List.of(), "偏好时间点/范围，删除。"));
        list.add(deleteRows("dnd_settings", "dnd_settings", "免打扰设置", "user_id", List.of(),
                "作息偏好（22:00-08:00 之类）本身可推断在场时间，删除。"));
        list.add(deleteRows("user_block", "user_block", "我的黑名单", "user_id", List.of(),
                "拉黑关系属发起方；被对方拉黑的行（blocked_user_id=我）保留，只指向墓碑。"));
        list.add(deleteRows("post_favorites", "post_favorites", "我收藏的动态", "user_id", List.of(),
                "收藏反映兴趣，删除。"));
        list.add(deleteRows("post_likes", "post_likes", "我给动态点的赞", "user_id", List.of(),
                "删除我发出的内容点赞；post 行的 likes_count 计数偏差不再修正（已知代价）。"));
        list.add(deleteRows("post_shares", "post_shares", "我的转发", "user_id", List.of(), "删除。"));
        list.add(deleteRows("post_view_history", "post_view_history", "我的浏览历史", "user_id",
                List.of(), "浏览历史是最强的再识别信号之一（谁看了什么、什么时候），删除。"));
        list.add(deleteRows("comment_likes", "comment_likes", "我点的评论赞", "user_id", List.of(),
                "删除。"));
        list.add(deleteRows("search_queries", "search_queries", "我的搜索词", "user_id", List.of(),
                "搜索词是自由文本，可能含真实姓名/校区，删除。"));
        list.add(deleteRows("daily_answers", "daily_answers", "每日话题作答", "user_id", List.of(),
                "答案文本属主体，删除。"));
        list.add(deleteRows("check_ins", "check_ins", "签到记录", "user_id", List.of("check_ins"),
                "签到日期 + 连续天数是主体作息轨迹，无保留义务（导出清单已声明本类）。"));
        list.add(deleteRows("task_claim", "task_claim", "任务领取记录", "user_id",
                List.of("task_claims"), "领取日期同样落在作息维度；删除（导出清单已声明本类）。"));
        list.add(deleteRows("daily_benefits", "daily_benefits", "每日权益领取", "user_id", List.of(),
                "权益领取流水（非资金凭证，站内虚拟权益），删除。"));
        list.add(deleteRows("make_up_quota", "make_up_quota", "补签额度", "user_id", List.of(), "删除。"));
        list.add(deleteRows("social_progress", "social_progress", "社交升温进度", "user_id", List.of(),
                "计数型行为画像，删除。"));
        list.add(deleteRows("push_preferences", "push_preferences", "推送偏好", "user_id", List.of(),
                "活跃时段是行踪推断数据，删除。"));
        list.add(deleteRows("push_summaries", "push_summaries", "推送汇总记录", "user_id", List.of(),
                "删除。"));
        list.add(deleteRows("circle_memberships", "circle_memberships", "我加入的圈子", "user_id",
                List.of(), "圈籍反映兴趣/同乡身份，删除。"));
        list.add(deleteRows("activity_enrollments", "activity_enrollments", "活动报名", "user_id",
                List.of(), "线下活动报名 = 主体在场证明（位置 + 时间），无财务列，整行删除。"
                        + "若后续接入付费活动，报名应改为财务留存 + 身份列匿名，届时须在此登记。"));
        list.add(deleteRows("consulting_signup", "consulting_signup", "咨询课程报名", "user_id",
                List.of(), "同上：报名事实可定位主体。"));
        list.add(deleteRows("official_chat_messages", "official_chat_messages", "公众号会话消息",
                "user_id", List.of(), "自由文本消息内容，删除。"));
        list.add(deleteRows("invite_code", "invite_code", "我的邀请码", "user_id", List.of(),
                "邀请码可反查邀请人身份，删除；invite_reward 的发放留痕走下一条 RETAIN。"));
        list.add(PersonalDataTable.of(
                "chat_ai_session_context", "chat_ai_session_context", "AI 助手会话上下文",
                ErasureAction.DELETE_ROWS, List.of(),
                List.of("context_payload", "chat_thread_id"),
                List.of("DELETE FROM chat_ai_session_context WHERE user_id = {uid}"),
                List.of(),
                "context_payload 是 JSON 化的对话内容，常含主体自述的姓名/校区/作息，删除。"));
        list.add(deleteRows("chat_ai_suggestion_log", "chat_ai_suggestion_log", "AI 建议留痕",
                "user_id", List.of(), "建议日志含对话派生文本，删除。"));

        // ============================================================
        // 8) 工单/提案：行有处理留痕价值，只清主体身份列
        // ============================================================
        list.add(PersonalDataTable.of(
                "feedback_tickets", "feedback_tickets", "我的反馈工单",
                ErasureAction.ANONYMISE_IN_PLACE, List.of(),
                List.of("contact_wechat", "attachments", "title", "content",
                        "latest_reply_summary"),
                List.of("UPDATE feedback_tickets SET contact_wechat = NULL, attachments = NULL, title = "
                        + quote(ErasedValues.TEXT_CONTENT) + ", content = "
                        + quote(ErasedValues.TEXT_CONTENT) + ", latest_reply_summary = NULL "
                        + "WHERE user_id = {uid}"),
                List.of(),
                "工单状态/类型保留用于处置留痕与统计，但「联系微信 + 附件 + 正文」是主体身份与自述内容，"
                        + "必须清空（旧实现完全未处理）。"));
        list.add(PersonalDataTable.of(
                "activity_proposal", "activity_proposal", "活动提案",
                ErasureAction.ANONYMISE_IN_PLACE, List.of(),
                List.of("submitter_phone", "title", "content", "attachment_json", "expected_city",
                        "expected_campus"),
                List.of("UPDATE activity_proposal SET submitter_phone = "
                        + quote(ErasedValues.SHORT_TEXT) + ", title = "
                        + quote(ErasedValues.TEXT_CONTENT) + ", content = "
                        + quote(ErasedValues.TEXT_CONTENT) + ", attachment_json = NULL, "
                        + "expected_city = NULL, expected_campus = NULL WHERE submitter_user_id = {uid}"),
                List.of(),
                "本表有一列<b>明文手机号</b>（submitter_phone NOT NULL，不走 AES）——它是全库唯一"
                        + "把手机号写明文的地方。提案可能已转成公开活动（converted_activity_id），"
                        + "删行会破坏活动溯源，故行保留、身份列清空/置常量。"));

        // ============================================================
        // 9) 日志与凭证（法律义务留存，但身份列必须清除）
        // ============================================================
        list.add(PersonalDataTable.of(
                "audit_log", "audit_log", "我操作产生的审计日志",
                ErasureAction.ANONYMISE_IN_PLACE, List.of("audit_logs"),
                List.of("operator_username", "request_body", "error_message", "ip", "user_agent"),
                List.of("UPDATE audit_log SET operator_username = " + quote(ErasedValues.NICKNAME)
                        + ", request_body = NULL, error_message = NULL, ip = NULL, user_agent = NULL "
                        + "WHERE operator_id = {uid}"),
                List.of(),
                "保留依据：《网络安全法》第 21 条第（三）项要求网络日志留存不少于六个月，"
                        + "PIPL 第 47 条的删除义务对「法律、行政法规规定的保存期限未届满」的情形让路。"
                        + "清掉的 5 列里 ip/user_agent 是网络标识符、request_body 可能夹带手机号明文；"
                        + "剩下的 operation/target/时间戳在 operator_id 只指向无身份墓碑行时不再能识别主体"
                        + "（能证明的只是「某个已注销账号做过某类操作」）。"));
        list.add(PersonalDataTable.of(
                "user_agreement_consent", "user_agreement_consent", "协议同意留痕",
                ErasureAction.ANONYMISE_IN_PLACE, List.of("agreement_consents"),
                List.of("ip"),
                List.of("UPDATE user_agreement_consent SET ip = NULL WHERE user_id = {uid}"),
                List.of(),
                "保留依据：处理者需能举证「同意确曾取得」（PIPL 第 14 条 + 举证责任倒置的实践），"
                        + "删除留痕等于自证不能。保留的 legal_version/agreed_at/source 不识别主体；"
                        + "ip 属网络标识符，清除。"));

        // ============================================================
        // 10) 财务：行按法定期限保留，但「能识别主体」的列一律清除
        // ============================================================
        list.add(PersonalDataTable.of(
                "payment_callback_log", "payment_callback_log", "微信支付回调原文",
                ErasureAction.ANONYMISE_IN_PLACE, List.of(),
                List.of("raw_body", "headers", "detail"),
                List.of("UPDATE payment_callback_log pcl JOIN vip_order vo "
                        + "ON pcl.order_no = vo.order_no "
                        + "SET pcl.raw_body = NULL, pcl.headers = NULL, pcl.detail = NULL "
                        + "WHERE vo.user_id = {uid}"),
                List.of(),
                "本表没有 user_id，主体只能通过 order_no 关联回来；回调原文 raw_body 里带着付款人 "
                        + "openid 与金额明细，是「保留财务证据」与「不留身份」最容易两失的地方。"
                        + "做法：回调幂等键/订单号/金额/状态保留（对账与争议必需），"
                        + "自由文本原文清除。"));
        list.add(PersonalDataTable.of(
                "vip_order", "vip_order", "VIP 支付订单",
                ErasureAction.ANONYMISE_IN_PLACE, List.of(),
                List.of("openid", "prepay_id"),
                List.of("UPDATE vip_order SET openid = NULL, prepay_id = NULL WHERE user_id = {uid}"),
                List.of(),
                "openid 列存的是<b>微信侧付款人 openid 快照</b>——它能在微信生态里唯一锁定自然人，"
                        + "与 users.openid 一起销毁才算真删。金额/订单号/微信交易号/时间保留：对账、"
                        + "退款与发票义务要求它可追溯，但追溯链只到无身份的墓碑 user_id 为止。"));
        list.add(PersonalDataTable.of(
                "vip_bills", "vip_bills", "VIP 账单",
                ErasureAction.ANONYMISE_IN_PLACE, List.of("vip_bills"),
                List.of("remark"),
                List.of("UPDATE vip_bills SET remark = NULL WHERE user_id = {uid}"),
                List.of(),
                "账单主体（套餐/金额/周期/第三方交易号）为会计档案，依《会计档案管理办法》"
                        + "与支付业务留痕要求保留；remark 是人写的自由文本，可能带手机号，清空。"));
        list.add(PersonalDataTable.of(
                "wallet_transaction_log", "wallet_transaction_log", "钱包流水",
                ErasureAction.ANONYMISE_IN_PLACE, List.of("wallet_transactions"),
                List.of("remark"),
                List.of("UPDATE wallet_transaction_log SET remark = NULL WHERE user_id = {uid}"),
                List.of(),
                "资金流水不可删（对账/争议/反洗钱配合义务），同上只清自由文本。"));
        list.add(PersonalDataTable.of(
                "vip_billing_log", "vip_billing_log", "VIP 续费留痕",
                ErasureAction.RETAIN_STATUTORY, List.of("vip_billing_logs"),
                List.of("user_id", "order_no"), List.of(), List.of(),
                "行原样保留（续费成功/失败与金额是财务凭证）。逐列核对：order_no 是「时间戳+随机数」"
                        + "形态的平台内部订单键，不含手机号/openid/userId，amount 与 status 不识别主体；"
                        + "唯一的主体引用是 user_id，而它解析到身份列已全部销毁的墓碑行。"));
        list.add(PersonalDataTable.of(
                "user_wallet", "user_wallet", "钱包余额",
                ErasureAction.RETAIN_STATUTORY, List.of("wallet"),
                List.of("user_id"), List.of(), List.of(),
                "行保留：余额是平台对主体的负债，注销不等于免除（可能待退款），删掉会摧毁账务完整性；"
                        + "表内除 user_id 外只有金额与时间，无身份列。"
                        + "本表 FK 为 ON DELETE RESTRICT，也从数据库层面证明 users 行不可删。"));
        list.add(PersonalDataTable.of(
                "promo_code_usages", "promo_code_usages", "优惠码核销",
                ErasureAction.RETAIN_STATUTORY, List.of(),
                List.of("user_id"), List.of(), List.of(),
                "行保留：营销核销留痕（防同一主体重复薅羊毛的口径由平台侧继续持有）；"
                        + "FK ON DELETE RESTRICT。列只有码/用户/时间，无身份文本。"));
        list.add(PersonalDataTable.of(
                "invite_reward", "invite_reward", "邀请奖励发放",
                ErasureAction.RETAIN_STATUTORY, List.of(),
                List.of("inviter_user_id", "invitee_user_id"), List.of(), List.of(),
                "奖励发放属权益账务，保留；两个列都只指向（已销毁身份的）user_id。"));
        list.add(PersonalDataTable.of(
                "reports", "reports", "我发起的举报",
                ErasureAction.RETAIN_STATUTORY, List.of(),
                List.of("reporter_id"), List.of(), List.of(),
                "举报与处置记录是平台履行内容安全义务的证据（reporter_id NOT NULL、"
                        + "handler_id 可空），保留以支撑事后复核；被举报内容与主体身份无关。"));

        // ============================================================
        // 11) 凭据/设备/会话：全部删除（token 与设备指纹同样属个人信息）
        // ============================================================
        list.add(deleteRows("user_sessions", "user_sessions", "会话令牌", "user_id", List.of(),
                "session_token 是可重放凭据，必须随账号消灭（黑名单只有 TTL，行必须删）。"));
        list.add(deleteRows("user_device_session", "user_device_session", "登录设备记录",
                List.of("user_id", "device_id", "last_token_jti"),
                "device_id 是设备标识符（PIPL 意义上的个人信息），"
                        + "last_token_jti 是凭据；整行删除。TokenBlacklistService 的 jti 黑名单是"
                        + "短期兜底，不构成本行的保留理由。",
                "DELETE FROM user_device_session WHERE user_id = {uid}"));
        list.add(deleteRows("user_online_status", "user_online_status", "在线状态", "user_id",
                List.of(), "心跳时间属在线轨迹。"));
        list.add(PersonalDataTable.of(
                "third_party_account", "third_party_account", "第三方账号绑定",
                ErasureAction.DELETE_ROWS, List.of(),
                List.of("open_id", "union_id"),
                List.of("DELETE FROM third_party_account WHERE user_id = {uid}"),
                List.of(),
                "open_id 是 SHA-256 派生摘要，union_id 是微信跨应用唯一标识：union_id 可在"
                        + "同主体的其他小程序间关联自然人，摘要+固定输入（微信 openid 空间可枚举）"
                        + "不等于匿名，故整行删除。删除后同一微信号再登录会视作新用户重新注册。"));

        // ============================================================
        // 12) users 墓碑：最后写（前面全部成功后不留半注销态）
        // ============================================================
        list.add(PersonalDataTable.viaUserEntity(
                "users", "users", "账号主记录（墓碑）",
                ErasureAction.ANONYMISE_IN_PLACE, List.of("account"),
                List.of("openid", "nickname", "avatar_url", "bio", "grade_label", "pronouns",
                        "phone", "birth_date", "campus_name", "circle_path", "password",
                        "interest_tags", "latitude", "longitude", "geo_updated_at", "role",
                        "status", "auto_renew_enabled", "profile_completion", "following_count",
                        "followers_count"),
                List.of("UPDATE users SET interest_tags = JSON_ARRAY() WHERE id = {uid}"),
                List.of("SELECT avatar_url FROM users WHERE id = {uid}"),
                "users 行不能删：至少 10 张表的外键指向它（其中 user_wallet/vip_bills/vip_order/"
                        + "promo_code_usages 为 ON DELETE RESTRICT），删行会直接报约束错误，"
                        + "且会让保留期内的财务流水失去归属。故采用墓碑：身份列全部销毁 + status=deactivated。"
                        + "两个必须点名的列——"
                        + "(1) openid：NOT NULL + uk_users_openid 唯一，故必须写非空且互不相同的值，"
                        + "取 ErasedValues.erasedOpenid()=UUIDv4（与真实微信 openid、phone:/guest: 前缀都不撞，"
                        + "同一秒注销两个账号也不撞）；旧值若是 phone:<SHA-256(手机号)>，"
                        + "11 位手机号空间可穷举反推，属可逆化名，必须覆盖。"
                        + "(2) phone：写 NULL 而不是任何哨兵——列可空、uk_users_phone 不去重 NULL、"
                        + "读侧（登录 phoneBound 判定 / 导出掩码 / 管理端列表）已把 NULL 当作「未绑定」，"
                        + "旧实现的 \"1****\"+userId 既是明文又把 userId 写进了手机号列，"
                        + "见 PhoneColumnCodec。"
                        + "auto_renew_enabled 置 false 是防复活的必要一步，见类注释的竞态清单。"
                        + "interest_tags 未被 User 实体映射（列不在 JPA 写回范围内），"
                        + "因此该列必须用原生 SQL 清，其余列必须用实体写——两种写法不能互换。"));
        return List.copyOf(list);
    }

    // ---- 构造辅助 ----

    /** 单引号 SQL 字面量（清单里的常量均不含引号，故无需转义）。 */
    private static String quote(String literal) {
        return "'" + literal + "'";
    }

    /** 「按归属列整行删除」的便捷构造（最常见的形状）。 */
    private static PersonalDataTable deleteRows(
            String key, String table, String label, String ownerColumn,
            List<String> exportCategories, String rationale) {
        return PersonalDataTable.of(key, table, label, ErasureAction.DELETE_ROWS, exportCategories,
                List.of(ownerColumn),
                List.of("DELETE FROM " + table + " WHERE " + ownerColumn + " = {uid}"),
                List.of(), rationale);
    }

    /** 单表、归属列就是 user_id 的删除项（key/label 由调用方给全）。 */
    private static PersonalDataTable deleteRows(String table, List<String> exportCategories,
                                                String rationale) {
        return deleteRows(table, table, table, "user_id", exportCategories, rationale);
    }

    /** 带自定义 SQL 的删除项（多列归属，如 interaction_events）。 */
    private static PersonalDataTable deleteRows(
            String key, String table, String label, List<String> identifyingColumns,
            String rationale, String sql) {
        return PersonalDataTable.of(key, table, label, ErasureAction.DELETE_ROWS, List.of(),
                identifyingColumns, List.of(sql), List.of(), rationale);
    }
}
