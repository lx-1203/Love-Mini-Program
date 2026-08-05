/**
 * 首页 Banner 数据源配置
 *
 * 设计说明：
 * - 集中管理首页 Banner 轮播数据（图片URL + 跳转链接 + 标题），
 *   运营/后端可联动维护，避免在视图层硬编码；
 * - 图片资源统一通过 IMAGE_PATHS 引用，确保路径与磁盘文件一一对应；
 * - 跳转链接使用 app 内部路径（如 /pages/discover/index），
 *   HomeBanner 组件通过 openAppPath 进行跳转。
 *
 * Task 3.6.4：新增 loadHomeBanners() 异步从后端 /api/v1/config/hero-banners 拉取，
 * 失败时回退到本地 homeBanners 静态默认值，保证首屏渲染不阻塞。
 *
 * mp-weixin 兼容性：
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 数据为纯静态配置，无运行时副作用
 */
import { IMAGE_PATHS } from "./images";
import { loadHeroBanners } from "../services/config";

/**
 * 单个 Banner 项的数据结构。
 */
export interface HomeBannerItem {
  /** 唯一标识（用于 swiper item key） */
  id: string;
  /** Banner 图片 URL */
  imageUrl: string;
  /** Banner 标题（显示在图片下方/上方） */
  title: string;
  /** Banner 副标题（可选） */
  subtitle?: string;
  /** 点击跳转的 app 内部路径，如 /pages/discover/index */
  link: string;
}

/**
 * 首页 Banner 数据源。
 *
 * 当前为本地静态数据，后续可无缝切换为后端 API 返回：
 *   const banners = await request<HomeBannerItem[]>({ url: "/home/banners" });
 *
 * Task 3.6.4 已接入：loadHomeBanners() 封装 GET /api/v1/config/hero-banners，
 * 视图按需调用刷新；homeBanners 作为初始渲染兜底。
 */
export const homeBanners: HomeBannerItem[] = [
  {
    id: "banner-daily-fate",
    imageUrl: IMAGE_PATHS.BANNERS.HOME,
    title: "发现心动的人",
    subtitle: "双向喜欢即可开启聊天",
    link: "/pages/discover/index",
  },
  {
    id: "banner-new-user",
    imageUrl: IMAGE_PATHS.POSTERS.HOME,
    title: "新人礼遇",
    subtitle: "完成任务领专属徽章",
    link: "/subpackages/discover/activities/index",
  },
  {
    id: "banner-weekend-party",
    imageUrl: IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
    title: "周末派对",
    subtitle: "校园桌游局报名中",
    link: "/subpackages/discover/activities/index",
  },
  {
    id: "banner-graduation",
    imageUrl: IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
    title: "毕业季告白",
    subtitle: "勇敢说出心里话",
    link: "/pages/circles/index",
  },
];

/**
 * 默认 imageUrl 兜底映射：后端返回空 imageUrl 时按 id 回退到本地 IMAGE_PATHS。
 *
 * 设计原因：后端 RealConfigService.DEFAULT_HERO_BANNERS 中 imageUrl 暂为空字符串
 * （后续接入 CMS 时由运营上传），前端按 id 找到对应静态资源保证视觉不空白。
 */
const FALLBACK_IMAGE_BY_ID: Record<string, string> = {
  "banner-daily-fate": IMAGE_PATHS.BANNERS.HOME,
  "banner-new-user": IMAGE_PATHS.POSTERS.HOME,
  "banner-weekend-party": IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
  "banner-graduation": IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
};

/**
 * 从后端动态加载 Hero Banner 列表（Task 3.6.4）。
 *
 * 调用 GET /api/v1/config/hero-banners，返回 Banner 视图列表。
 * - 过滤 enabled=false 项（防御性处理，后端已过滤）
 * - 后端返回空 imageUrl 时按 id 回退到本地 IMAGE_PATHS
 * - 后端不可达时回退到本地 homeBanners 静态默认值
 *
 * @returns Banner 列表（后端数据或本地兜底）
 */
export async function loadHomeBanners(): Promise<HomeBannerItem[]> {
  try {
    const banners = await loadHeroBanners();
    const enabledBanners = banners.filter((b) => b.enabled);
    if (enabledBanners.length === 0) {
      return homeBanners;
    }
    return enabledBanners.map((b) => ({
      id: b.id,
      imageUrl: b.imageUrl || FALLBACK_IMAGE_BY_ID[b.id] || "",
      title: b.title,
      subtitle: b.subtitle ?? undefined,
      link: b.link,
    }));
  } catch (_e) {
    // 后端不可达或返回异常：回退到本地静态默认值
    return homeBanners;
  }
}

