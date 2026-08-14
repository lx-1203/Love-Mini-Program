package com.campuslove.api.auth;

import java.util.List;

/**
 * 用户设备会话服务接口（3-D 设备管理）。
 *
 * <p>登录成功时记录设备（四个登录入口统一挂接：wechat / phone / apple / guest），
 * 支持设备列表查询、单设备吊销与「吊销该用户全部 token」（修改密码/注销账号时使用）。
 * 根据激活的 Spring Profile，由 RealDeviceSessionService 或 MockDeviceSessionService 实现。</p>
 */
public interface DeviceSessionService {

    /**
     * 记录一次登录设备（UPSERT 语义）。
     *
     * <p>deviceId 为空时统一使用 "unknown"；同 (user_id, device_id) 行已存在时
     * 更新平台/jti/活跃时间并复活（revoked 重置为 false）；已吊销设备再次登录自动复活。</p>
     *
     * @param userId   用户 ID
     * @param deviceId 设备标识（可空，空则 "unknown"）
     * @param platform 登录平台（wechat/phone/apple/guest/unknown）
     * @param jti      本次登录签发 JWT 的 jti（吊销设备时加入黑名单，可空）
     */
    void recordLogin(Long userId, String deviceId, String platform, String jti);

    /**
     * 查询指定用户的设备列表（含已吊销，前端置灰展示），按最近活跃时间倒序。
     *
     * @param userId 用户 ID
     * @return 设备视图列表
     */
    List<UserDeviceSessionView> listDevices(Long userId);

    /**
     * 吊销指定设备。
     *
     * <p>校验设备属主（非本人设备抛 {@link com.campuslove.api.common.OperationForbiddenException}），
     * 置 revoked=true 并将该设备最近签发的 JWT jti 加入黑名单（该设备 token 立即失效）。
     * 已吊销设备重复吊销为幂等成功。</p>
     *
     * @param userId   当前用户 ID（属主校验）
     * @param deviceId 目标设备记录 ID
     */
    void revokeDevice(Long userId, Long deviceId);

    /**
     * 吊销指定用户的全部未吊销设备 token（修改密码 / 注销账号时调用）。
     *
     * <p>将该用户所有设备的 jti 加入黑名单并置 revoked=true，
     * 实现「吊销该用户全部 token」。设备记录缺失（历史登录）时静默跳过。</p>
     *
     * @param userId 用户 ID
     */
    void revokeAllUserTokens(Long userId);
}
