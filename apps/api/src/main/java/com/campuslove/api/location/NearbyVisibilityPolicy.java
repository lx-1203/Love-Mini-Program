package com.campuslove.api.location;

import com.campuslove.api.entity.User;

/**
 * 「附近的人」授权判定：某个候选用户是否已经把「被附近的人看到」这件事授权出去。
 *
 * <p><b>为什么这件事必须由一个显式的策略对象来回答</b>（第六轮 W1b F-W1b-1）：
 * LBS 读接口 {@code GET /api/v1/location/nearby} 改造前把 bounding box 查询结果
 * 直接铺成 {@code userId + 昵称 + 校区 + 距离}，方法体内一次
 * {@code SecurityUtils.getCurrentUserId()} 都没有——任何登录账号传任意坐标都能读全平台，
 * 配合 1km 粒度的距离文本二分收敛，可以把任意一个人的居住点压到约 1km 内。
 * 「谁能看到谁」必须是一次可判定、可替换、可测试的调用，而不是散落在 Controller 里的
 * 一句注释。</p>
 *
 * <p><b>与已有授权位的对应关系</b>（本仓现状，交接项见同名交付报告）：
 * <ul>
 *   <li>{@code users} 只有 {@code latitude/longitude/geo_updated_at} 三个地理列
 *       （V2026.09.02.0001），<b>没有</b>「同意被附近的人看到」这一位；
 *       上报过坐标 ≠ 同意被展示（上报是逆地理编码取城市用的）。</li>
 *   <li>{@code user_agreement_consent} 记的是协议版本同意，粒度是「整份隐私政策」，
 *       不能拿来证明「向附近的人公开我的位置」这一具体用途同意。</li>
 *   <li>{@code posts.visibility} 是帖子可见范围、{@code push_preference}/
 *       {@code dnd_settings} 是推送开关，都不是地理曝光开关。</li>
 *   <li>{@code user_blocks}（{@code BlockService}）是「对方拒绝与我有任何关联」，
 *       可作为否决位，但不是同意位——它只能把范围缩小，不能把范围打开。</li>
 * </ul>
 *
 * <p><b>因此本策略在拿到同意位之前一律 deny</b>：证明不了授权，就不返回身份字段
 * （连匿名化的「此处有 1 个人」也不返回，人数本身是可推断的地理位置侧信道）。
 * 待迁移补上 {@code users.nearby_visible}（或等价位）后，只需替换实现，
 * 调用点与判点都不用动。</p>
 */
public interface NearbyVisibilityPolicy {

    /**
     * 候选用户是否授权「被 {@code requesterId} 在附近的人列表里看到」。
     *
     * <p>实现必须 fail-closed：任何异常/缺数据/未知状态都返回 {@code false}。</p>
     *
     * @param candidate   候选用户（已确认有坐标、状态正常、未被拉黑）
     * @param requesterId 发起查询的主体 ID（非空）
     * @return 明确授权时为 {@code true}
     */
    boolean isDiscoverableTo(User candidate, Long requesterId);
}
