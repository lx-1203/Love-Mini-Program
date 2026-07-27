package com.campuslove.api.clientconfig;

/**
 * Hero Banner 视图 DTO（Task 3.6.4）。
 *
 * <p>对应客户端 {@code GET /api/v1/config/hero-banners} 返回的列表项，
 * 用于驱动首页 / 登录页 Banner 轮播。</p>
 *
 * <p>由后端 {@code ConfigService.loadHeroBanners()} 返回，5 分钟缓存，
 * 替代客户端 {@code apps/client/src/config/home-banners.ts} 中的硬编码 homeBanners。
 * 后台运营可通过维护 banner 配置表（或后续 CMS）动态调整 Banner 文案、图片、跳转目标，
 * 无需发版即可上线新活动。</p>
 *
 * @param id        Banner 唯一标识（用于 swiper item key）
 * @param imageUrl  Banner 图片 URL（走媒体鉴权代理或 CDN）
 * @param title     Banner 主标题（按 Accept-Language 国际化）
 * @param subtitle  Banner 副标题（可选，按 Accept-Language 国际化）
 * @param link      点击跳转路径（app 内部路径，如 /pages/discover/index）
 * @param order     展示顺序（升序），同 order 时按 id 升序
 * @param enabled   是否启用（false 时前端不展示）
 */
public record HeroBannerView(
        String id,
        String imageUrl,
        String title,
        String subtitle,
        String link,
        int order,
        boolean enabled
) {
}
