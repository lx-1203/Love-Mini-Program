package com.campuslove.api.repository;

import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.Post.AuditStatus;
import com.campuslove.api.entity.Post.Visibility;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 帖子 Repository。
 * 提供基于分类、状态和作者的查询方法。
 */
public interface PostRepository extends JpaRepository<Post, Long> {

    /**
     * 根据分类和状态查询帖子，按创建时间倒序分页。
     *
     * @param category 帖子分类
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByCategoryAndStatusOrderByCreatedAtDesc(PostCategory category, PostStatus status, Pageable pageable);

    /**
     * 根据作者 ID 列表和状态查询帖子，按创建时间倒序分页。
     *
     * @param authorIds 作者 ID 列表
     * @param status    帖子状态
     * @param pageable  分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByAuthorIdInAndStatusOrderByCreatedAtDesc(List<Long> authorIds, PostStatus status, Pageable pageable);

    /**
     * 根据状态查询帖子，按创建时间倒序分页。
     *
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByStatusOrderByCreatedAtDesc(PostStatus status, Pageable pageable);

    /**
     * R4-00339：发现分类 discoverSub 子标签的关键词过滤查询。
     *
     * <p>匹配帖子的<b>内容或标签</b>包含任一关键词（LIKE %kw%），用于
     * hometown（老乡/同乡）/ buddy（搭子）子标签的服务端过滤，替代此前
     * discoverSub 被忽略、恒返回全量 active 帖子的占位实现。分页排序由
     * 传入的 {@code pageable} 决定（与发现流一致：置顶优先 + 创建时间倒序）。</p>
     *
     * @param status   帖子状态（通常 active）
     * @param kw1      关键词 1（null/空表示不参与匹配）
     * @param kw2      关键词 2（null/空表示不参与匹配）
     * @param pageable 分页参数（含排序）
     * @return 分页帖子列表
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.status = :status
              AND ((:kw1 IS NULL OR :kw1 = ''
                    OR p.content LIKE CONCAT('%', :kw1, '%')
                    OR p.tags LIKE CONCAT('%', :kw1, '%'))
                OR (:kw2 IS NULL OR :kw2 = ''
                    OR p.content LIKE CONCAT('%', :kw2, '%')
                    OR p.tags LIKE CONCAT('%', :kw2, '%')))
            """)
    Page<Post> findByStatusAndKeyword(@Param("status") PostStatus status,
                                      @Param("kw1") String kw1,
                                      @Param("kw2") String kw2,
                                      Pageable pageable);

    /**
     * 根据作者 ID 列表和分类查询帖子，按创建时间倒序分页。
     *
     * @param authorIds 作者 ID 列表
     * @param category  帖子分类
     * @param status    帖子状态
     * @param pageable  分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByAuthorIdInAndCategoryAndStatusOrderByCreatedAtDesc(
            List<Long> authorIds, PostCategory category, PostStatus status, Pageable pageable);

    /**
     * 根据作者 ID 查询该用户的所有帖子。
     * 用于统计用户帖子总获赞数等场景。
     *
     * @param authorId 作者 ID
     * @return 该作者的所有帖子列表
     */
    List<Post> findByAuthorId(Long authorId);

    /**
     * R16（2026-09-07）：我的「日常」（visibility=friends）最近 12 条，
     * 供个人主页「我的故事」区块使用。
     */
    List<Post> findTop12ByAuthorIdAndVisibilityAndStatusOrderByCreatedAtDesc(
            Long authorId, Visibility visibility, PostStatus status);

    /**
     * R16（2026-09-07）：作者帖子总获赞数聚合查询（他人主页 socialProof 性能修复，
     * 替代全量拉取后内存求和）。
     */
    @org.springframework.data.jpa.repository.Query(
            "select coalesce(sum(coalesce(p.likesCount, 0)), 0) from Post p where p.authorId = :authorId")
    long sumLikesByAuthorId(@org.springframework.data.repository.query.Param("authorId") Long authorId);

    /**
     * R16（2026-09-07）：他人视角的作者最近帖子（仅审核通过且 active），替代全量拉取后内存过滤。
     */
    List<Post> findTop12ByAuthorIdAndAuditStatusAndStatusOrderByCreatedAtDesc(
            Long authorId, Post.AuditStatus auditStatus, PostStatus status);

    /**
     * 3-J 任务与积分：统计用户指定状态的帖子数（「发布首条动态」任务进度）。
     *
     * @param authorId 作者 ID
     * @param status   帖子状态（active/deleted/hidden）
     * @return 帖子数量
     */
    long countByAuthorIdAndStatus(Long authorId, PostStatus status);

    // ============ 管理后台首页「待办清单」只读聚合（2026-10-06） ============
    // 说明：以下三个聚合方法仅服务 AdminStatsService#getCommunityOverview（只读、无分页），
    // 采用 GROUP BY / CASE 聚合而非「多次 count() 循环」，避免首页一次请求触发 N+1 全表扫描。
    // 校区隔离口径与 {@link #searchForAdmin} 完全一致：posts 表无 campus_name 列，
    // campusName 非空时按<b>作者所属校区</b>（user_campus_profile.campus_name）过滤。

    /**
     * 管理后台首页统计：<b>单次</b>聚合出「帖子总数 / 待审核数 / 置顶数」。
     *
     * <p>返回单行三元组（无 GROUP BY 的聚合查询恒返回一行）：</p>
     * <ol>
     *   <li>[0] 帖子总数（COUNT）</li>
     *   <li>[1] 待审核帖子数（audit_status = pending）</li>
     *   <li>[2] 置顶帖子数（is_pinned = true）</li>
     * </ol>
     *
     * <p>JDBC 驱动不同，SUM 的结果类型可能是 {@code Long} 或 {@code BigDecimal}，
     * 调用方统一按 {@link Number} 取值；聚合结果理论上不为 null，仍做防御。</p>
     *
     * @param pendingAudit 待审核枚举值（调用方传入 {@code AuditStatus.pending}）
     * @param campusName   校区名（null/空表示全平台，与 {@link #searchForAdmin} 同口径）
     * @return 单行三元组列表
     */
    @Query("""
            SELECT COUNT(p),
                   SUM(CASE WHEN p.auditStatus = :pendingAudit THEN 1 ELSE 0 END),
                   SUM(CASE WHEN p.isPinned = true THEN 1 ELSE 0 END)
            FROM Post p
            WHERE (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = p.authorId AND ucp.campusName = :campusName))
            """)
    List<Object[]> countAdminPostFlags(@Param("pendingAudit") AuditStatus pendingAudit,
                                        @Param("campusName") String campusName);

    /**
     * 管理后台首页统计：按 {@code category} 分组的帖子数（GROUP BY 一次取全部分类）。
     *
     * @param campusName 校区名（null/空表示全平台）
     * @return 二元组列表：{@code [PostCategory category, Long count]}
     */
    @Query("""
            SELECT p.category, COUNT(p)
            FROM Post p
            WHERE (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = p.authorId AND ucp.campusName = :campusName))
            GROUP BY p.category
            """)
    List<Object[]> countAdminPostsGroupedByCategory(@Param("campusName") String campusName);

    /**
     * 管理后台首页统计：时间窗口内按创建日期分组的发帖数（近 7 天发帖趋势）。
     *
     * <p>与 {@code HeartSignalRepository#countDailyBetween} 同一实现口径
     * （{@code FUNCTION('DATE', ...)} 分组），仅返回<b>有发帖的日期</b>，
     * 缺失日期由调用方补 0，保证前端图表 X 轴连续。</p>
     *
     * @param from       起始时间（含）
     * @param to         结束时间（不含）
     * @param campusName 校区名（null/空表示全平台）
     * @return 二元组列表：{@code [java.sql.Date/LocalDate, Long count]}
     */
    @Query("""
            SELECT FUNCTION('DATE', p.createdAt), COUNT(p)
            FROM Post p
            WHERE p.createdAt >= :from AND p.createdAt < :to
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = p.authorId AND ucp.campusName = :campusName))
            GROUP BY FUNCTION('DATE', p.createdAt)
            ORDER BY FUNCTION('DATE', p.createdAt)
            """)
    List<Object[]> countAdminPostsDaily(@Param("from") LocalDateTime from,
                                         @Param("to") LocalDateTime to,
                                         @Param("campusName") String campusName);

    /**
     * 管理后台首页统计：<b>尚未归属圈子</b>（owner_circle_path 为空）的帖子数。
     *
     * <p>使用原生 SQL 的原因：{@code posts.owner_circle_path} 列由「圈子分层」工作流
     * 新增，{@link Post} 实体<b>尚未映射</b>该列（现仅有 circle_id），JPQL 无法引用
     * 实体不存在的属性。列若在某环境缺失，查询会抛 DataAccessException，
     * 调用方按降级返回 0 处理，不影响首页其余指标。</p>
     *
     * <p>campusName 由调用方归一化为空串（原生 SQL 中 {@code ? IS NULL} 在 MySQL
     * 下对未定型参数不稳定），空串即表示「全平台不过滤」。</p>
     *
     * @param campusName 校区名（空串表示全平台）
     * @return 单行单列列表：{@code [[count]]}
     */
    @Query(value = """
            SELECT COUNT(*) FROM posts p
            WHERE (p.owner_circle_path IS NULL OR p.owner_circle_path = '')
              AND (:campusName = '' OR EXISTS (
                    SELECT 1 FROM user_campus_profile ucp
                    WHERE ucp.user_id = p.author_id AND ucp.campus_name = :campusName))
            """, nativeQuery = true)
    List<Object[]> countAdminPostsWithoutOwnerCircle(@Param("campusName") String campusName);

    /**
     * 根据状态查询帖子，按点赞数倒序分页。
     * 用于首页聚合"村口热门帖子"场景。
     *
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表（按点赞数从高到低）
     */
    Page<Post> findByStatusOrderByLikesCountDesc(PostStatus status, Pageable pageable);

    /**
     * 根据状态 + 审核状态查询帖子，按点赞数倒序分页。
     * 2026-09-03 发帖审核制：首页社区动态等聚合只展示审核通过（approved）的帖子，
     * 待审核（pending）/已拒绝（rejected）帖子不出现在任何 feed。
     */
    Page<Post> findByStatusAndAuditStatusOrderByLikesCountDesc(
            PostStatus status, AuditStatus auditStatus, Pageable pageable);

    /**
     * 根据 ID 列表和状态查询帖子，按创建时间倒序分页。
     * 用于标签聚合场景，查询特定标签下的帖子列表。
     *
     * @param ids     帖子 ID 列表
     * @param status  帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByIdInAndStatusOrderByCreatedAtDesc(List<Long> ids, PostStatus status, Pageable pageable);

    /**
     * 管理后台 - 多条件分页查询帖子。
     * <p>所有筛选条件均可为 null（不参与筛选），按创建时间倒序排列。</p>
     * <p>此查询不限制 PostStatus，便于管理员查看包含已删除/隐藏在内的所有帖子。</p>
     * <p>数据隔离（商业模式：每个高校一个管理员）：posts 表无 campus_name 列，
     * campusName 非空时按<b>作者所属校区</b>过滤（EXISTS 子查询关联
     * {@code UserCampusProfile.campusName}，与 AdminUserController 语义一致）。</p>
     *
     * @param auditStatus 审核状态筛选（pending/approved/rejected），null 表示不筛选
     * @param status      帖子状态筛选（active/deleted/hidden），null 表示不筛选
     * @param category    帖子分类筛选，null 表示不筛选
     * @param authorId    作者用户 ID 筛选，null 表示不筛选
     * @param campusName  校区筛选（按作者所属校区过滤），null/空表示不筛选
     * @param pageable    分页参数
     * @return 分页帖子列表
     */
    @Query("""
            SELECT p FROM Post p
            WHERE (:auditStatus IS NULL OR p.auditStatus = :auditStatus)
              AND (:status IS NULL OR p.status = :status)
              AND (:category IS NULL OR p.category = :category)
              AND (:authorId IS NULL OR p.authorId = :authorId)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = p.authorId AND ucp.campusName = :campusName))
            ORDER BY p.createdAt DESC
            """)
    Page<Post> searchForAdmin(
            @Param("auditStatus") AuditStatus auditStatus,
            @Param("status") PostStatus status,
            @Param("category") PostCategory category,
            @Param("authorId") Long authorId,
            @Param("campusName") String campusName,
            Pageable pageable);

    /**
     * 管理后台 - 村落动态精细化管理分页查询。
     * <p>区别于 {@link #searchForAdmin}：支持内容关键字模糊筛选与校区隔离
     * （posts 表无 campus_name 列，校区隔离按作者所属校区过滤：
     * 作者校区取自 user_campus_profile.campus_name，与 AdminUserController 语义一致），
     * 且置顶帖子优先展示（isPinned DESC）。</p>
     *
     * @param auditStatus 审核状态筛选（pending/approved/rejected），null 表示不筛选
     * @param status      帖子状态筛选（active/deleted/hidden），null 表示不筛选
     * @param keyword     标题/内容模糊关键字，可空。
     *                    <p>原实现只 LIKE {@code p.content}，注释据此写「村落动态帖子无标题字段」——
     *                    但 posts.title 列真实存在（{@code Post.java}）且客户端发帖必填 5–30 字
     *                    （{@code CreatePostRequest} + {@code VillagePostService}），
     *                    导致审核员既看不到也搜不到标题，故一并匹配 title。</p>
     * @param campusName  校区筛选（按作者所属校区过滤），可空
     * @param circlePath  圈层前缀筛选（posts.owner_circle_path LIKE '前缀%'，与
     *                    EvidenceController 的 viewer scope 语义一致：选中大区
     *                    C1/R1 时其下全部学校 C1/R1/Sx 的帖子均命中），可空。
     *                    <p>Post 实体（ddl-auto=validate，不可加映射列）未映射
     *                    owner_circle_path，JPQL 无法引用该列，故本查询采用
     *                    native SQL + 显式 countQuery；auditStatus/status 由
     *                    调用方传枚举 name 字符串（与列存储值一致，
     *                    EnumType.STRING / MySQL ENUM 均以名称落库）。</p>
     * @param pageable    分页参数
     * @return 分页帖子列表（置顶优先，按创建时间倒序）
     */
    @Query(
            value = """
                    SELECT p.* FROM posts p
                    WHERE (:auditStatus IS NULL OR p.audit_status = :auditStatus)
                      AND (:status IS NULL OR p.status = :status)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR p.content LIKE CONCAT('%', :keyword, '%')
                           OR p.title LIKE CONCAT('%', :keyword, '%'))
                      AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                            SELECT 1 FROM user_campus_profile ucp
                            WHERE ucp.user_id = p.author_id AND ucp.campus_name = :campusName))
                      AND (:circlePath IS NULL OR :circlePath = ''
                           OR p.owner_circle_path LIKE CONCAT(:circlePath, '%'))
                    ORDER BY p.is_pinned DESC, p.created_at DESC
                    """,
            countQuery = """
                    SELECT COUNT(*) FROM posts p
                    WHERE (:auditStatus IS NULL OR p.audit_status = :auditStatus)
                      AND (:status IS NULL OR p.status = :status)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR p.content LIKE CONCAT('%', :keyword, '%')
                           OR p.title LIKE CONCAT('%', :keyword, '%'))
                      AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                            SELECT 1 FROM user_campus_profile ucp
                            WHERE ucp.user_id = p.author_id AND ucp.campus_name = :campusName))
                      AND (:circlePath IS NULL OR :circlePath = ''
                           OR p.owner_circle_path LIKE CONCAT(:circlePath, '%'))
                    """,
            nativeQuery = true)
    Page<Post> searchForVillageAdmin(
            @Param("auditStatus") String auditStatus,
            @Param("status") String status,
            @Param("keyword") String keyword,
            @Param("campusName") String campusName,
            @Param("circlePath") String circlePath,
            Pageable pageable);

    /**
     * 村落动态列表的<b>圈层数据域强制版</b>（RBAC 圈层授权，AdminScopeService 轴）。
     *
     * <p>与 {@link #searchForVillageAdmin} 的筛选条件完全一致，额外强制一条：帖子必须在
     * 调用管理员（{@code :adminId}）于 {@code admin_layer} 绑定的圈层节点之下——用相关
     * 子查询 {@code EXISTS} 把「绑定节点的 circle_path」当前缀去匹配 {@code posts.owner_circle_path}，
     * 天然支持「一个管理员绑定多个不相邻节点」而无需把变长前缀列表塞进 SQL。</p>
     *
     * <p>未归属（{@code owner_circle_path IS NULL}）的行：{@code NULL LIKE ...} 结果为 NULL，
     * 被 EXISTS 天然排除，即局部圈层作用域读不到未归属数据（fail-closed）。全平台账号
     * （SUPER_ADMIN）不走本方法，行为与 {@link #searchForVillageAdmin} 逐字节一致。</p>
     *
     * <p>保持 native：{@code Post} 虽已映射 ownerCirclePath，但既有查询口径是原生 SQL +
     * 显式 countQuery，沿用以免分页 count 语义漂移。</p>
     */
    @Query(
            value = """
                    SELECT p.* FROM posts p
                    WHERE (:auditStatus IS NULL OR p.audit_status = :auditStatus)
                      AND (:status IS NULL OR p.status = :status)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR p.content LIKE CONCAT('%', :keyword, '%')
                           OR p.title LIKE CONCAT('%', :keyword, '%'))
                      AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                            SELECT 1 FROM user_campus_profile ucp
                            WHERE ucp.user_id = p.author_id AND ucp.campus_name = :campusName))
                      AND (:circlePath IS NULL OR :circlePath = ''
                           OR p.owner_circle_path LIKE CONCAT(:circlePath, '%'))
                      AND EXISTS (
                            SELECT 1 FROM admin_layer al
                            JOIN circle_layer cl ON cl.id = al.circle_layer_id
                            WHERE al.admin_id = :adminId
                              AND p.owner_circle_path LIKE CONCAT(cl.circle_path, '%'))
                    ORDER BY p.is_pinned DESC, p.created_at DESC
                    """,
            countQuery = """
                    SELECT COUNT(*) FROM posts p
                    WHERE (:auditStatus IS NULL OR p.audit_status = :auditStatus)
                      AND (:status IS NULL OR p.status = :status)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR p.content LIKE CONCAT('%', :keyword, '%')
                           OR p.title LIKE CONCAT('%', :keyword, '%'))
                      AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                            SELECT 1 FROM user_campus_profile ucp
                            WHERE ucp.user_id = p.author_id AND ucp.campus_name = :campusName))
                      AND (:circlePath IS NULL OR :circlePath = ''
                           OR p.owner_circle_path LIKE CONCAT(:circlePath, '%'))
                      AND EXISTS (
                            SELECT 1 FROM admin_layer al
                            JOIN circle_layer cl ON cl.id = al.circle_layer_id
                            WHERE al.admin_id = :adminId
                              AND p.owner_circle_path LIKE CONCAT(cl.circle_path, '%'))
                    """,
            nativeQuery = true)
    Page<Post> searchForVillageAdminScoped(
            @Param("auditStatus") String auditStatus,
            @Param("status") String status,
            @Param("keyword") String keyword,
            @Param("campusName") String campusName,
            @Param("circlePath") String circlePath,
            @Param("adminId") Long adminId,
            Pageable pageable);

    /**
     * SubTask 5.1.3：批量统计指定作者集合在时间窗口内的发帖数（按 authorId 分组）。
     *
     * <p>用于推荐算法的「活跃度」评分维度：候选用户最近 N 天的发帖数反映其活跃程度，
     * 活跃用户优先推荐，提升匹配成功率与对话响应率。</p>
     *
     * <p>查询返回 {@code [authorId, postCount]} 二元组列表，调用方按需转为 Map。
     * 单次批量查询避免 N+1 问题。</p>
     *
     * @param authorIds 作者 ID 列表（候选用户集合）
     * @param status    帖子状态（通常为 {@code active}，排除已删除/隐藏）
     * @param since     起始时间（含），通常为 {@code now().minusDays(activityRecentDays)}
     * @return 二元组列表：每个元素为 {@code [Long authorId, Long postCount]}
     */
    @Query("""
            SELECT p.authorId, COUNT(p)
            FROM Post p
            WHERE p.authorId IN :authorIds
              AND p.status = :status
              AND p.createdAt >= :since
            GROUP BY p.authorId
            """)
    List<Object[]> countRecentPostsByAuthorIds(
            @Param("authorIds") List<Long> authorIds,
            @Param("status") PostStatus status,
            @Param("since") LocalDateTime since);

    /**
     * 热度榜查询（2026-08-11）：按 hot_score 降序，过滤禁止上榜与非 active 帖。
     *
     * <p>hot_banned=1 的帖子不进入榜单（运营压榜），但前台仍可见；
     * 与 status=active 过滤正交。</p>
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.status = :status
              AND p.hotBanned = false
            ORDER BY p.hotScore DESC, p.createdAt DESC
            """)
    Page<Post> findHotBoard(@Param("status") PostStatus status, Pageable pageable);

    /**
     * 搜索帖子（2026-08-11 C 端搜索）：标题/内容/标签中缀 LIKE。
     *
     * <p>校园规模纯 SQL 搜索（与用户搜索同口径），不引入全文索引；
     * 相关性排序在内存完成（见 RealPostSearchService）。</p>
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.status = :status
              AND p.auditStatus = :auditStatus
              AND (p.title LIKE CONCAT('%', :keyword, '%')
                   OR p.content LIKE CONCAT('%', :keyword, '%')
                   OR p.tags LIKE CONCAT('%', :keyword, '%'))
            """)
    Page<Post> searchByKeyword(@Param("keyword") String keyword,
                               @Param("status") PostStatus status,
                               @Param("auditStatus") AuditStatus auditStatus,
                               Pageable pageable);

    /**
     * 根据 ID 列表和状态查询帖子，按热度分倒序（推荐流热度段复用）。
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.id IN :ids
              AND p.status = :status
              AND p.hotBanned = false
            ORDER BY p.hotScore DESC, p.createdAt DESC
            """)
    Page<Post> findByIdInAndStatusOrderByHotScoreDesc(@Param("ids") List<Long> ids,
                                                       @Param("status") PostStatus status,
                                                       Pageable pageable);

    /**
     * 指定时间之后创建、按热度分倒序（推荐流新鲜度段复用）。
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.status = :status
              AND p.hotBanned = false
              AND p.createdAt >= :since
            ORDER BY p.hotScore DESC, p.createdAt DESC
            """)
    Page<Post> findActiveSinceOrderByHotScoreDesc(@Param("status") PostStatus status,
                                                   @Param("since") LocalDateTime since,
                                                   Pageable pageable);

    /**
     * 按作者 ID 列表 + 创建时间范围查询（推荐流关注段复用）。
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.authorId IN :authorIds
              AND p.status = :status
              AND p.hotBanned = false
              AND p.createdAt >= :since
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findByAuthorIdInAndStatusAndCreatedAtAfterOrderByCreatedAtDesc(
            @Param("authorIds") List<Long> authorIds,
            @Param("status") PostStatus status,
            @Param("since") LocalDateTime since,
            Pageable pageable);

    // ============ Batch B：可见范围查询 ============

    /**
     * 可见帖子分页查询（Batch B：按可见范围过滤）。
     *
     * <p>过滤规则：</p>
     * <ul>
     *   <li>public_ 帖子：所有人可见</li>
     *   <li>school 帖子：仅同校认证用户可见（通过 userCampusName 匹配帖子作者的校区）</li>
     *   <li>interest 帖子：仅指定圈子成员可见（通过 memberCircleIds 过滤 circleId）</li>
     * </ul>
     *
     * @param status          帖子状态
     * @param auditStatus     审核状态
     * @param userCampusName  当前用户校区名（null 表示未认证，不看 school 帖子）
     * @param memberCircleIds 当前用户加入的圈子 ID 集合（空集合表示未加入任何圈子）
     * @param pageable        分页参数
     * @return 可见帖子分页列表
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.status = :status
              AND p.auditStatus = :auditStatus
              AND (
                  p.visibility = :publicVis
                  OR (p.visibility = :schoolVis AND :userCampusName IS NOT NULL AND :userCampusName <> ''
                      AND EXISTS (SELECT 1 FROM UserCampusProfile ucp
                                  WHERE ucp.userId = p.authorId AND ucp.campusName = :userCampusName))
                  OR (p.visibility = :interestVis AND p.circleId IN :memberCircleIds)
                  OR (p.visibility = :friendsVis AND p.authorId = :currentUserId)
                  OR (p.visibility = :friendsVis AND EXISTS (SELECT 1 FROM Like l
                                  WHERE l.targetUserId = p.authorId AND l.userId = :currentUserId
                                  AND l.status = :activeLikeStatus))
                  OR (p.visibility = :friendsVis AND EXISTS (SELECT 1 FROM UserFollow f
                                  WHERE f.followingId = p.authorId AND f.followerId = :currentUserId))
              )
            ORDER BY p.isPinned DESC, p.createdAt DESC
            """)
    Page<Post> findVisiblePosts(
            @Param("status") PostStatus status,
            @Param("auditStatus") AuditStatus auditStatus,
            @Param("publicVis") Visibility publicVis,
            @Param("schoolVis") Visibility schoolVis,
            @Param("interestVis") Visibility interestVis,
            @Param("friendsVis") Visibility friendsVis,
            @Param("activeLikeStatus") Like.LikeStatus activeLikeStatus,
            @Param("currentUserId") Long currentUserId,
            @Param("userCampusName") String userCampusName,
            @Param("memberCircleIds") List<Long> memberCircleIds,
            Pageable pageable);

    /**
     * 可见帖子分页查询（含分类过滤，Batch B：村口列表主查询）。
     *
     * @param status          帖子状态
     * @param auditStatus     审核状态
     * @param category        帖子分类（null 表示不限分类）
     * @param userCampusName  当前用户校区名
     * @param memberCircleIds 当前用户加入的圈子 ID 集合
     * @param pageable        分页参数
     * @return 可见帖子分页列表
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.status = :status
              AND p.auditStatus = :auditStatus
              AND (:category IS NULL OR p.category = :category)
              AND (
                  p.visibility = :publicVis
                  OR (p.visibility = :schoolVis AND :userCampusName IS NOT NULL AND :userCampusName <> ''
                      AND EXISTS (SELECT 1 FROM UserCampusProfile ucp
                                  WHERE ucp.userId = p.authorId AND ucp.campusName = :userCampusName))
                  OR (p.visibility = :interestVis AND p.circleId IN :memberCircleIds)
                  OR (p.visibility = :friendsVis AND p.authorId = :currentUserId)
                  OR (p.visibility = :friendsVis AND EXISTS (SELECT 1 FROM Like l
                                  WHERE l.targetUserId = p.authorId AND l.userId = :currentUserId
                                  AND l.status = :activeLikeStatus))
                  OR (p.visibility = :friendsVis AND EXISTS (SELECT 1 FROM UserFollow f
                                  WHERE f.followingId = p.authorId AND f.followerId = :currentUserId))
              )
            ORDER BY p.isPinned DESC, p.createdAt DESC
            """)
    Page<Post> findVisiblePostsByCategory(
            @Param("status") PostStatus status,
            @Param("auditStatus") AuditStatus auditStatus,
            @Param("category") PostCategory category,
            @Param("publicVis") Visibility publicVis,
            @Param("schoolVis") Visibility schoolVis,
            @Param("interestVis") Visibility interestVis,
            @Param("friendsVis") Visibility friendsVis,
            @Param("activeLikeStatus") Like.LikeStatus activeLikeStatus,
            @Param("currentUserId") Long currentUserId,
            @Param("userCampusName") String userCampusName,
            @Param("memberCircleIds") List<Long> memberCircleIds,
            Pageable pageable);

    /**
     * 可见帖子详情查询（Batch B：单帖可见性校验）。
     *
     * <p>用于帖子详情接口：验证当前用户是否有权查看该帖子。</p>
     *
     * @param postId          帖子 ID
     * @param status          帖子状态
     * @param auditStatus     审核状态
     * @param userCampusName  当前用户校区名
     * @param memberCircleIds 当前用户加入的圈子 ID 集合
     * @return 可见帖子（Optional.empty 表示无权查看或帖子不存在）
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.id = :postId
              AND p.status = :status
              AND p.auditStatus = :auditStatus
              AND (
                  p.visibility = :publicVis
                  OR (p.visibility = :schoolVis AND :userCampusName IS NOT NULL AND :userCampusName <> ''
                      AND EXISTS (SELECT 1 FROM UserCampusProfile ucp
                                  WHERE ucp.userId = p.authorId AND ucp.campusName = :userCampusName))
                  OR (p.visibility = :interestVis AND p.circleId IN :memberCircleIds)
                  OR (p.visibility = :friendsVis AND p.authorId = :currentUserId)
                  OR (p.visibility = :friendsVis AND EXISTS (SELECT 1 FROM Like l
                                  WHERE l.targetUserId = p.authorId AND l.userId = :currentUserId
                                  AND l.status = :activeLikeStatus))
                  OR (p.visibility = :friendsVis AND EXISTS (SELECT 1 FROM UserFollow f
                                  WHERE f.followingId = p.authorId AND f.followerId = :currentUserId))
              )
            """)
    java.util.Optional<Post> findVisiblePostById(
            @Param("postId") Long postId,
            @Param("status") PostStatus status,
            @Param("auditStatus") AuditStatus auditStatus,
            @Param("publicVis") Visibility publicVis,
            @Param("schoolVis") Visibility schoolVis,
            @Param("interestVis") Visibility interestVis,
            @Param("friendsVis") Visibility friendsVis,
            @Param("activeLikeStatus") Like.LikeStatus activeLikeStatus,
            @Param("currentUserId") Long currentUserId,
            @Param("userCampusName") String userCampusName,
            @Param("memberCircleIds") List<Long> memberCircleIds);
}
