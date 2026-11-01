package com.campuslove.api.location;

import com.campuslove.api.block.BlockService;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.campuslove.api.common.TimeZones;

/**
 * LBS Phase 2：地理坐标服务。
 *
 * <p>提供坐标上报存储与附近的人查询能力。</p>
 *
 * <p>依赖 {@link UserRepository}（JPA）。mock profile 排除了 DataSource/JPA 自动配置、
 * 无 JPA 仓库可注入，因此与 RecommendationRanker 同规格限定 real 档装配；
 * mock 档的 LBS 端点由 LocationController 的可选注入兜底。</p>
 *
 * <p><b>附近的人的授权口径（第六轮 W1b F-W1b-1）</b>：改造前
 * {@link #findNearby} 的签名里<b>没有主体</b>，查询只按 bounding box 过滤，
 * 于是「读一整个集合却不取主体」——任何登录账号传任意坐标即可铺网格扫全国，
 * 再靠 {@code formatDistance} 的 1km 粒度二分收敛到约 1km。现在的口径是三件事同时成立：
 * <ol>
 *   <li><b>主体必须在场</b>：{@code requesterId} 为空或主体不存在 ⇒ 返回空集（fail-closed，
 *       绝不退化成「按坐标读全平台」）；</li>
 *   <li><b>授权必须在查询与投影两层都生效</b>：先剔除自我、被拉黑（{@link BlockService}，
 *       双向）、状态非 active 的候选，再交给 {@link NearbyVisibilityPolicy} 判定
 *       「对方是否同意被附近的人看到」；<b>距离只在通过全部前置判定后才计算</b>——
 *       否则未授权主体仍然会通过「有没有被过滤掉」这条侧信道被二分；</li>
 *   <li><b>返回字段按最小必要裁剪</b>：投影只剩 {@code userId + 昵称 + 头像 + 模糊距离}，
 *       原先的 {@code campusName}（校区）拿掉——距离已经比校区更精确，同一条响应里给两个
 *       定位粒度等于白送一次交叉验证。</li>
 * </ol>
 * 本库尚无地理曝光同意位，故当前实现（{@link DenyAllNearbyPolicy}）一律 deny，
 * 结果集为空。这是「未闭合的边界」而不是「已修好的功能」，详见交付报告交接项。
 */
@Service
@Profile("real")
public class GeoService {

    private static final Logger log = LoggerFactory.getLogger(GeoService.class);

    /** 地球平均半径（km），用于 haversine 公式 */
    private static final double EARTH_RADIUS_KM = 6371.0;

    /** 坐标上报节流间隔（分钟） */
    private static final int REPORT_THROTTLE_MINUTES = 5;

    /** 可被附近的人看到的账号状态（注销墓碑/被禁用都不在此列，fail-closed） */
    private static final String STATUS_ACTIVE = "active";

    private final UserRepository userRepository;
    /** 拉黑关系（双向否决位）；未装配时按「查不到否决位但仍然要过授权判定」处理，不影响 deny 口径 */
    private final BlockService blockService;
    /** 地理曝光授权判定；为 null ⇒ 一律不返回（fail-closed） */
    private final NearbyVisibilityPolicy nearbyVisibilityPolicy;

    public GeoService(UserRepository userRepository,
                      BlockService blockService,
                      NearbyVisibilityPolicy nearbyVisibilityPolicy) {
        this.userRepository = userRepository;
        this.blockService = blockService;
        this.nearbyVisibilityPolicy = nearbyVisibilityPolicy;
    }

    /**
     * 上报用户坐标（节流：5 分钟内重复上报忽略）。
     *
     * @param userId    当前用户 ID
     * @param latitude  纬度（gcj02）
     * @param longitude 经度（gcj02）
     */
    @Transactional
    public void reportLocation(Long userId, BigDecimal latitude, BigDecimal longitude) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        // 节流：5 分钟内不重复更新
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        if (user.getGeoUpdatedAt() != null &&
                user.getGeoUpdatedAt().plusMinutes(REPORT_THROTTLE_MINUTES).isAfter(now)) {
            return;
        }
        user.setLatitude(latitude);
        user.setLongitude(longitude);
        user.setGeoUpdatedAt(now);
        userRepository.save(user);
        log.debug("用户坐标已更新: userId={}, lat={}, lng={}", userId, latitude, longitude);
    }

    /**
     * 查询附近的人（bounding box 预筛 → 主体/否决/授权三重判定 → 才做距离精算 → 最小必要投影）。
     *
     * <p><b>调用方必须先解析出主体</b>：{@code requesterId} 来自
     * {@code SecurityUtils.getCurrentUserId()}，为空即 401（由 SecurityUtils 抛），
     * 到得了本方法的请求也必须带着它——本方法不再接受「无主体的坐标查询」这种形态，
     * 因为它正是 F-W1b-1 的缺陷本体。</p>
     *
     * @param requesterId 发起查询的主体 ID（null ⇒ 返回空集，fail-closed）
     * @param lat       请求者纬度
     * @param lng       请求者经度
     * @param radiusKm  搜索半径（km，1-20）
     * @param maxResults 最大返回数
     * @return 已授权被该主体看到的附近用户列表（含模糊距离）
     */
    public List<NearbyPerson> findNearby(Long requesterId, BigDecimal lat, BigDecimal lng,
                                         int radiusKm, int maxResults) {
        // 判定 1：主体必须在场。无主体/主体不存在 ⇒ 空集，绝不退化成「按坐标读全平台」
        if (requesterId == null) {
            log.warn("附近的人查询缺少主体，按 fail-closed 返回空集");
            return List.of();
        }
        if (userRepository.findById(requesterId).isEmpty()) {
            log.warn("附近的人查询主体不存在，按 fail-closed 返回空集: requesterId={}", requesterId);
            return List.of();
        }
        // 判定 2：授权判定器缺席 ⇒ 什么都证明不了 ⇒ 空集（不是「跳过授权」）
        if (nearbyVisibilityPolicy == null) {
            log.error("附近的人查询未装配 NearbyVisibilityPolicy，按 fail-closed 返回空集");
            return List.of();
        }

        double latD = lat.doubleValue();
        double lngD = lng.doubleValue();
        double radius = Math.min(Math.max(radiusKm, 1), 20);

        // bounding box 预筛（±radius 纬度/经度，快速排除远距离用户）
        double latDelta = radius / 111.0; // 1 纬度 ≈ 111km
        double lngDelta = radius / (111.0 * Math.cos(Math.toRadians(latD)));

        BigDecimal minLat = BigDecimal.valueOf(latD - latDelta);
        BigDecimal maxLat = BigDecimal.valueOf(latD + latDelta);
        BigDecimal minLng = BigDecimal.valueOf(lngD - lngDelta);
        BigDecimal maxLng = BigDecimal.valueOf(lngD + lngDelta);

        // 从仓库查询 bounding box 内有坐标的用户
        List<User> candidates = userRepository.findByLatitudeBetweenAndLongitudeBetween(
                minLat, maxLat, minLng, maxLng);

        // 否决位：与主体存在拉黑关系（任一方拉黑另一方）的候选一律剔除
        java.util.Optional<Set<Long>> blockedIds = resolveBlockedRelationIds(requesterId);
        if (blockedIds.isEmpty()) {
            // 否决位读不出来 ⇒ 谁都可能已经把主体拉黑 ⇒ 整条查询 fail-closed 返回空集
            log.error("附近的人查询无法读取拉黑关系，按 fail-closed 返回空集: requesterId={}", requesterId);
            return List.of();
        }
        Set<Long> excludedIds = blockedIds.get();

        // 判定 3：授权 + 否决 + 状态过滤【全部先过】，再算距离。
        // 顺序很关键：距离本身是可二分的信息，未授权候选连距离都不该被计算/输出。
        return candidates.stream()
                .filter(Objects::nonNull)
                .filter(u -> u.getId() != null && !requesterId.equals(u.getId()))
                .filter(u -> STATUS_ACTIVE.equalsIgnoreCase(u.getStatus()))
                .filter(u -> !excludedIds.contains(u.getId()))
                .filter(u -> nearbyVisibilityPolicy.isDiscoverableTo(u, requesterId))
                .map(u -> {
                    if (u.getLatitude() == null || u.getLongitude() == null) {
                        return null;
                    }
                    double dist = haversineKm(latD, lngD,
                            u.getLatitude().doubleValue(), u.getLongitude().doubleValue());
                    if (dist > radius) return null;
                    // 最小必要投影：不含校区/手机号/实名/证件等任何其它定位或身份字段
                    return new NearbyPerson(u.getId(), u.getNickname(), u.getAvatarUrl(),
                            formatDistance(dist));
                })
                .filter(p -> p != null)
                .sorted((a, b) -> Double.compare(parseDistanceKm(a.distanceText()), parseDistanceKm(b.distanceText())))
                .limit(maxResults)
                .toList();
    }

    /**
     * 取与主体存在拉黑关系的全部对方 ID（双向并集）。
     *
     * <p>返回 {@link java.util.Optional#empty()} 表示「否决位不可判定」，调用方必须整条查询
     * fail-closed；{@link BlockService} 未装配时返回空集合（无可否决对象）——因为是否放开
     * 由 {@link NearbyVisibilityPolicy} 决定，deny 口径不受这里影响。</p>
     */
    private java.util.Optional<Set<Long>> resolveBlockedRelationIds(Long requesterId) {
        if (blockService == null) {
            return java.util.Optional.of(Set.of());
        }
        try {
            List<Long> ids = blockService.getBlockedRelationUserIds(requesterId);
            return java.util.Optional.of(ids == null ? Set.of() : new HashSet<>(ids));
        } catch (RuntimeException ex) {
            log.warn("读取拉黑关系失败: requesterId={}, error={}", requesterId, ex.getMessage());
            return java.util.Optional.empty();
        }
    }

    /**
     * 计算两点间的 haversine 距离（km）。
     */
    public double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    /**
     * 距离模糊化（ADR-16）：>1km 取整、<1km 显示 "<1km"。
     */
    public String formatDistance(double km) {
        if (km < 1.0) return "<1km";
        return Math.round(km) + "km";
    }

    /** 解析格式化距离为数值（用于排序）。 */
    private double parseDistanceKm(String text) {
        if (text == null) return Double.MAX_VALUE;
        if (text.startsWith("<")) return 0.5;
        try {
            return Double.parseDouble(text.replace("km", "").trim());
        } catch (NumberFormatException e) {
            return Double.MAX_VALUE;
        }
    }

    /**
     * 附近的人视图（最小必要投影）。
     *
     * <p>字段集就是授权边界：只有「打开资料页需要的 userId」、展示用的昵称/头像、
     * 以及模糊到 1km 的距离。改造前的第 4 个字段 {@code campusName}（校区）已删除——
     * 距离比校区更精确，同时下发两个定位粒度等于给未授权读取者一次免费的交叉验证。
     * 新增字段必须过 {@link NearbyVisibilityPolicy} 这一层，见
     * {@code NearbySubjectBindingStaticGateTest} 的投影白名单断言。</p>
     */
    public record NearbyPerson(
            Long userId,
            String nickname,
            String avatarUrl,
            String distanceText
    ) {}
}
