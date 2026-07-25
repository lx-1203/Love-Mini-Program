package com.campuslove.api.repository;

import com.campuslove.api.entity.ThirdPartyAccount;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

/**
 * 第三方账号 Repository（功能2：登录第三方账号）。
 *
 * <p>提供按 (provider, openId) 查询、按 userId 查询所有绑定、
 * 按 (userId, provider) 解绑等数据库操作。</p>
 */
public interface ThirdPartyAccountRepository extends JpaRepository<ThirdPartyAccount, Long> {

    /**
     * 按第三方平台与 openId 查询绑定记录。
     * 用于登录时根据第三方凭证查找本系统用户。
     *
     * @param provider 第三方平台标识（WECHAT / APPLE）
     * @param openId   第三方平台的 openId
     * @return 绑定记录（可能为空）
     */
    Optional<ThirdPartyAccount> findByProviderAndOpenId(String provider, String openId);

    /**
     * 按 userId 查询其绑定的所有第三方账号。
     * 用于个人中心展示已绑定的第三方账号列表。
     *
     * @param userId 本系统用户 ID
     * @return 绑定记录列表（按绑定时间倒序）
     */
    List<ThirdPartyAccount> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 按 userId 与 provider 查询特定平台的绑定记录。
     * 用于判断用户是否已绑定某平台、解绑等场景。
     *
     * @param userId   本系统用户 ID
     * @param provider 第三方平台标识
     * @return 绑定记录（可能为空）
     */
    Optional<ThirdPartyAccount> findByUserIdAndProvider(Long userId, String provider);

    /**
     * 按 userId 与 provider 删除绑定记录（解绑）。
     *
     * @param userId   本系统用户 ID
     * @param provider 第三方平台标识
     * @return 删除的记录数（0 表示未绑定，1 表示解绑成功）
     */
    @Transactional
    long deleteByUserIdAndProvider(Long userId, String provider);
}
