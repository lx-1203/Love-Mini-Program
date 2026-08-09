package com.campuslove.api.media;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.MediaAsset;
import com.campuslove.api.repository.MediaAssetRepository;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 媒体资产审核服务（2026-08-09）。
 *
 * <p>承接 media_asset 元数据表与业务链路的接线：</p>
 * <ul>
 *   <li>{@link #recordUpload}：上传落盘后同事务写入资产记录（audit_status=pending）</li>
 *   <li>{@link #findByUrls}：读取侧按 URL 批量查审核状态（防 N+1，他人视角过滤 approved-only）</li>
 *   <li>{@link #deleteByUrl}：覆盖/删除时同步物理删除旧资产记录（避免脏数据）</li>
 *   <li>{@link #updateAudit}：管理后台审核写回</li>
 * </ul>
 *
 * <p>审核语义（与页面展示矩阵一致）：</p>
 * <ul>
 *   <li>pending：本人可见 + 状态角标；他人不可见</li>
 *   <li>approved：对外展示</li>
 *   <li>rejected：本人可见 + 角标原因；他人不可见</li>
 * </ul>
 */
@Profile("real")
@Component
public class MediaAssetService {

    private static final Logger log = LoggerFactory.getLogger(MediaAssetService.class);

    /** 审核状态常量 */
    public static final String AUDIT_PENDING = "pending";
    public static final String AUDIT_APPROVED = "approved";
    public static final String AUDIT_REJECTED = "rejected";

    /** 受管媒体 URL 前缀（与 LocalMediaStorageService.URL_PREFIX 一致） */
    private static final String MEDIA_URL_PREFIX = "/api/v1/media/";

    private final MediaAssetRepository mediaAssetRepository;

    public MediaAssetService(MediaAssetRepository mediaAssetRepository) {
        this.mediaAssetRepository = mediaAssetRepository;
    }

    /**
     * 记录一次上传（与业务上传同事务调用）。
     * 新上传默认审核状态 pending（待审核）。
     *
     * @param userId       上传者用户 ID
     * @param type         媒体类型（avatar/image/video/background）
     * @param result       上传结果（URL/宽高/MIME/大小）
     * @param originalName 原始文件名（可为 null）
     * @return 已持久化的资产记录
     */
    @Transactional
    public MediaAsset recordUpload(Long userId, String type,
                                   MediaStorageService.UploadResult result, String originalName) {
        MediaAsset asset = new MediaAsset();
        asset.setUserId(userId);
        asset.setType(type);
        asset.setUrl(result.getUrl());
        asset.setOriginalName(originalName);
        asset.setMime(result.getMime());
        asset.setSize(result.getSize());
        asset.setWidth(result.getWidth());
        asset.setHeight(result.getHeight());
        asset.setDurationMs(result.getDurationMs());
        asset.setStatus("ready");
        asset.setAuditStatus(AUDIT_PENDING);
        return mediaAssetRepository.save(asset);
    }

    /**
     * 按 URL 集合批量查询（读取侧过滤用，防 N+1）。
     *
     * @param urls 媒体 URL 集合
     * @return URL → 资产记录 映射（仅含查得到的记录；空集合返回空映射）
     */
    @Transactional(readOnly = true)
    public Map<String, MediaAsset> findByUrls(Collection<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return Collections.emptyMap();
        }
        return mediaAssetRepository.findByUrlIn(urls).stream()
                .collect(Collectors.toMap(MediaAsset::getUrl, Function.identity(), (a, b) -> a));
    }

    /**
     * 按 URL 查询单条资产。
     *
     * @param url 媒体 URL
     * @return 资产记录（不存在返回 empty）
     */
    @Transactional(readOnly = true)
    public Optional<MediaAsset> findByUrl(String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }
        return mediaAssetRepository.findByUrlIn(java.util.List.of(url)).stream().findFirst();
    }

    /**
     * 物理删除指定 URL 的资产记录（覆盖/删除照片墙时清理旧记录）。
     * null / 空串 / 非受管 URL 静默跳过（沿用 deleteOldMediaQuietly 容错哲学）。
     *
     * @param url 媒体 URL
     */
    @Transactional
    public void deleteByUrl(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        if (!url.startsWith(MEDIA_URL_PREFIX) && !url.startsWith("/uploads/")) {
            // 非受管 URL（静态资源/外链），无需清理
            return;
        }
        try {
            mediaAssetRepository.findByUrlIn(java.util.List.of(url)).forEach(mediaAssetRepository::delete);
        } catch (RuntimeException ex) {
            // 删除失败不影响主流程（容错），仅记日志
            log.warn("[MediaAssetService] 删除媒体资产记录失败 url={}", url, ex);
        }
    }

    /**
     * 审核写回（管理后台调用）。
     *
     * @param id         资产 ID
     * @param decision   审核决定：approved / rejected
     * @param remark     审核备注（拒绝原因，可空）
     * @param auditorId  审核人用户 ID
     * @return 更新后的资产记录；不存在返回 empty
     */
    @Transactional
    public Optional<MediaAsset> updateAudit(Long id, String decision, String remark, Long auditorId) {
        return mediaAssetRepository.findById(id).map(asset -> {
            String newStatus = AUDIT_APPROVED.equals(decision) ? AUDIT_APPROVED : AUDIT_REJECTED;
            asset.setAuditStatus(newStatus);
            asset.setAuditRemark(remark);
            asset.setAuditorId(auditorId);
            asset.setAuditedAt(LocalDateTime.now(TimeZones.BUSINESS));
            return mediaAssetRepository.save(asset);
        });
    }
}
