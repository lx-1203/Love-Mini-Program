package com.campuslove.api.repository;

import com.campuslove.api.entity.MediaAsset;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
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
 * </ul>
 * </p>
 */
@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {

    /**
     * 根据用户 ID 和媒体类型查询资产列表。
     *
     * @param userId 用户 ID
     * @param type   媒体类型（image/video/background）
     * @return 资产列表（可能为空，不会返回 null）
     */
    List<MediaAsset> findByUserIdAndType(Long userId, String type);

    /**
     * 根据用户 ID 查询全部资产，按创建时间倒序排列。
     * 用于个人主页媒体管理场景。
     *
     * @param userId 用户 ID
     * @return 资产列表（最新优先）
     */
    List<MediaAsset> findByUserIdOrderByCreatedAtDesc(Long userId);
}
