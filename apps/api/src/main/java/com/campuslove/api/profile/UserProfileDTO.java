package com.campuslove.api.profile;

import java.util.List;

/**
 * 个人主页统一契约。新个人主页只消费本 DTO，避免继续扩散 recommended/profile/stats 散字段。
 *
 * <p>R6/L07（2026-10-19）：他人主页与理想效果图对不上的根因是本 DTO 缺字段。
 * 本次补 {@code distanceText} / {@code online} / {@code Relation.commonPoints}，
 * 三者全部由真实持久化列推导，无来源时返回 {@code null}（前端渲染明确占位，服务端不编数据）。</p>
 */
public record UserProfileDTO(
        Long id,
        Basic basic,
        Identity identity,
        Intro intro,
        Relationship relationship,
        Media media,
        ProfileSocialProofView socialProof,
        Relation relation,
        List<Post> posts,
        List<Story> stories,
        List<String> circles,
        String state,
        /**
         * 距离文案（如 "3km" / "&lt;1km"），他人视角才有意义。
         *
         * <p>来源：{@code users.latitude} + {@code users.longitude}（gcj02，实测 271/292 两侧同时有值），
         * 由查看者与目标两点做 haversine，口径与管理后台/附近的人一致
         * （{@code GeoService.haversineKm} + {@code GeoService.formatDistance}，ADR-16 模糊化）。
         * 与 {@code RecommendationRanker.deriveDistanceText} 同规的两条压制：同校不下发距离、
         * 超出 300km 视为 GPS 漂移不下发。命名沿用仓内既有契约 {@code distanceText}
         * （{@code RecommendedPersonView.distanceText} / {@code GeoService.NearbyPerson.distanceText}），
         * 客户端 {@code types/profile.ts} 已按 {@code distanceText?: string} 声明。</p>
         */
        String distanceText,
        /**
         * 是否在线；{@code null} 表示「无任何在线证据」，与 {@code false}（有登录/心跳记录但当前不活跃）严格区分。
         *
         * <p>来源（按优先级，两条都是仓内既有的权威口径，客户端 parked.md 要求的正是「会话/心跳派生」）：</p>
         * <ol>
         *   <li>{@code OnlineUserService}（Redis {@code online:user:{userId}}，登录写入、登出/踢下线删除、
         *       TTL = {@code app.jwt.expiration-ms}）—— 管理后台「在线用户」列表（{@code OnlineUserAdminController}）
         *       用的就是这一份，本字段与之完全同源同口径。实测当前仅 2 个活跃会话（100000 admin、100151 体验号）。</li>
         *   <li>{@code user_online_status.last_heartbeat}（阈值 5 分钟，与
         *       {@code RealOnlineStatusService.HEARTBEAT_TIMEOUT_MINUTES} 同值同语义）。
         *       注意：全仓无任何代码调用 {@code OnlineStatusService.updateHeartbeat}（实测 0 个调用点），
         *       该表实测 0 行，因此本条来源目前恒不命中。</li>
         * </ol>
         *
         * <p>判定：命中 1 或 2 → {@code true}；两者都没命中但 {@code user_device_session} 存在该用户
         * 未吊销记录（实测 280 行 / 169 个用户）→ {@code false}；三处全无记录 → {@code null}（未知，不猜测）。
         * 已知粒度限制写清楚：来源 1 的存活期等于 JWT 有效期（小时级），语义是「有未登出的有效会话」，
         * 不是秒级心跳；在没有心跳写入方之前，本字段无法做到更细粒度。</p>
         */
        Boolean online
) {
    public record Basic(String name, String avatar, Integer age, String location, String gender) {}
    public record Identity(boolean verified, boolean student, String mbti, List<String> personality) {}
    public record Intro(String bio, List<String> tags) {}
    public record Relationship(String goal, List<String> expectation) {}
    public record Media(String cover, List<String> photos, List<String> videos, String voiceIntro) {}
    public record Relation(
            boolean liked,
            boolean matched,
            boolean chatted,
            boolean blocked,
            int matchScore,
            List<String> matchReasons,
            /**
             * 共同点扁平词表（"同校"/"同城"/"同龄"/兴趣词）。
             * 保留不删：客户端 {@code PublicCommon.vue} 与后台仍在消费；
             * 结构化形态见 {@link #commonPoints}，两者条目一一对应（title 即本列表元素）。
             */
            List<String> commonInterests,
            /**
             * 结构化共同点（title/subtitle/icon），他人视角才有意义，自己视角恒为空列表。
             * 与 {@link #commonInterests} 同源同序同上限（3 条），由同一份推导产出，
             * 避免出现两套共同点口径。字段级来源与有值率见 {@link CommonPointDTO}。
             */
            List<CommonPointDTO> commonPoints) {}
    public record Post(String id, String content, List<String> images, long likes, long comments, String createdAt) {}
    public record Story(String id, String cover, String title, String location, String dateText) {}
}
