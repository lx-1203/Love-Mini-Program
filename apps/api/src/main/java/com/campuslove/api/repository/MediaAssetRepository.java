package com.campuslove.api.repository;

import com.campuslove.api.entity.MediaAsset;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 媒体资产 Repository。
 *
 * <p>提供按用户 ID、类型查询的方法，用于：
 * <ul>
 *   <li>查询用户全部照片墙资产（type=image）</li>
 *   <li>查询用户全部视频资产（type=video）</li>
 *   <li>查询用户全部背景图资产（type=background）</li>
 *   <li>查询用户最近上传的资产（按 createdAt 倒序）</li>
 *   <li>管理后台审核分页查询（pending 优先 + 校区隔离，2026-08-09）</li>
 *   <li>读取侧按 URL 批量查审核状态（防 N+1，2026-08-09）</li>
 * </ul>
 * </p>
 */
@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {

    /**
     * 根据用户 ID 和媒体类型查询【未软删除】的资产列表（S3-D，2026-10-31）。
     *
     * <p>原名 {@code findByUserIdAndType} 不带 {@code DeletedAtIsNull}，会把
     * {@code markTempDeleted()} 留下的墓碑行一起返回。实测本仓 campus_love 里
     * {@code media_asset.deleted_at IS NOT NULL} 目前是 0 行，所以这是一个
     * 【尚无活数据、但一旦有人调用就会漏出已删资产】的地雷；
     * 本方法同时是【当前无 main 调用方】的死方法——保留并加过滤器，
     * 是因为删掉它不等于修好它（下一个人会重新写出来）。</p>
     *
     * @param userId 用户 ID
     * @param type   媒体类型（image/video/background）
     * @return 资产列表（可能为空，不会返回 null；不含墓碑）
     */
    List<MediaAsset> findByUserIdAndTypeAndDeletedAtIsNull(Long userId, String type);

    /**
     * 根据用户 ID 查询全部【未软删除】资产，按创建时间倒序排列（S3-D，2026-10-31）。
     * 用于个人主页媒体管理场景。
     *
     * <p>同上：原 {@code findByUserIdOrderByCreatedAtDesc} 不过滤墓碑，
     * 当前无 main 调用方，加过滤后保留。</p>
     *
     * @param userId 用户 ID
     * @return 资产列表（最新优先；不含墓碑）
     */
    List<MediaAsset> findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId);

    /**
     * 按 URL 集合批量查询【未软删除】的资产（读取侧过滤审核状态用，避免 N+1）。
     *
     * <p>S3-D（2026-10-31）：这是【面向用户展示】的读路径，必须排除墓碑。
     * 调用方：{@code MediaAssetService.findByUrls}(→ RecommendationRanker 照片墙、
     * ProfileQueryService 相册) 与 {@code MediaAssetService.findByUrl}(→ 头像审核状态)。</p>
     *
     * @param urls 媒体 URL 集合
     * @return 匹配的资产列表（URL 在给定集合内且未被软删除）
     */
    List<MediaAsset> findByUrlInAndDeletedAtIsNull(Collection<String> urls);

    /**
     * 按 URL 集合查询资产，【含软删除墓碑】——仅限下面点名的两个调用方使用。
     *
     * <p>为什么这里【故意】不过滤 deleted_at（S3-D 的「有意可读」例外）：</p>
     * <ol>
     *   <li>{@code MediaAssetService.deleteByUrl}：物理清理旧记录。若跳过墓碑行，
     *       {@code markTempDeleted()} 登记过的行将【永久无法删除】——过滤反而造成数据泄漏。</li>
     *   <li>{@code MediaAccessService.resolveAccessProfile}：媒体访问分级。该方法的设计是
     *       「DB 分类只收紧、不放松」；若把已删行的分类信号丢掉，被判成
     *       {@code ID_CARD} 的资产会在回落到路径推断时【放松】到 IMAGE 档。
     *       这里保留墓碑可读，是安全性上的刻意选择，不是遗漏。</li>
     * </ol>
     *
     * <p>新代码请优先用 {@link #findByUrlInAndDeletedAtIsNull}。</p>
     *
     * @param urls 媒体 URL 集合
     * @return 匹配的资产列表（含墓碑；见上方两个调用方）
     */
    List<MediaAsset> findByUrlIn(Collection<String> urls);

    /**
     * 按 URL + 类型查询单条资产（2026-08-10，app_asset 公开访问注册校验用）。
     *
     * <p>公开端点 {@code GET /api/v1/media/app-assets/**} 在落盘读取前校验
     * 该 URL 存在 type=app_asset 且 audit_status=approved 的注册记录，
     * 使管理后台的「审核驳回」对应用资产同样生效（驳回后公开访问 404）。</p>
     *
     * <p>S3-D（2026-10-31）：补 {@code DeletedAtIsNull}。本方法是「通过才放行」的门，
     * 排除墓碑只会让判定【更严】（已删资产不再公开可读），方向上安全，
     * 不存在 {@code findByUrlIn} 那种「丢掉收紧信号」的顾虑。</p>
     *
     * @param url  媒体 URL（完整路径，如 /api/v1/media/app-assets/generated/images/campus/campus-gate.jpg）
     * @param type 媒体类型（app_asset）
     * @return 匹配的资产记录（未软删除；可能为空）
     */
    Optional<MediaAsset> findByUrlAndTypeAndDeletedAtIsNull(String url, String type);

    /**
     * 管理后台审核分页查询（2026-08-09，2026-08-10 增加 type 筛选）。
     *
     * 筛选条件：审核状态 / 媒体类型 / 上传者用户 ID / 校区名（校区隔离子查询）。
     * 排序：pending 优先，同状态按创建时间倒序。
     *
     * <p>S3-D（2026-10-31）：这里【故意不加】deleted_at 过滤——后台是「审核 / 清理取证」
     * 视角，墓碑必须可见，否则管理员看不到「待审队列里被删过的是哪些」。
     * 调用方（即「墓碑有意可读」的名单）：
     * {@code AdminMediaAssetController} 的列表接口与
     * {@code RealAdminStatsService} 的待审计数。</p>
     *
     * @param auditStatus 审核状态（pending/approved/rejected，null 为全部）
     * @param userId      上传者用户 ID（null 为全部）
     * @param type        媒体类型（avatar/image/video/background/app_asset，null 为全部）
     * @param campusName  校区名（null 为全部；校区管理员传入强制隔离）
     * @param pageable    分页参数
     * @return 分页结果
     */
    @Query("""
            SELECT m FROM MediaAsset m
            WHERE (:auditStatus IS NULL OR m.auditStatus = :auditStatus)
              AND (:userId IS NULL OR m.userId = :userId)
              AND (:type IS NULL OR m.type = :type)
              AND (:campusName IS NULL OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = m.userId AND ucp.campusName = :campusName))
            ORDER BY CASE m.auditStatus WHEN 'pending' THEN 0 ELSE 1 END, m.createdAt DESC
            """)
    Page<MediaAsset> searchForAdmin(@Param("auditStatus") String auditStatus,
                                    @Param("userId") Long userId,
                                    @Param("type") String type,
                                    @Param("campusName") String campusName,
                                    Pageable pageable);

    /** 到期且未删除的临时会话媒体（清理任务扫描，2026-10-28）。 */
    List<MediaAsset> findByCategoryAndExpiresAtBeforeAndDeletedAtIsNull(
            String category, java.time.LocalDateTime cutoff);

    /** 指定临时会话的未删除媒体（会话结束时批量清理）。 */
    List<MediaAsset> findByTempSessionIdAndDeletedAtIsNull(Long tempSessionId);
}
