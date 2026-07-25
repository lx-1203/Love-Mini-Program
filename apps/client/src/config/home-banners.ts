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
 * mp-weixin 兼容性：
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 数据为纯静态配置，无运行时副作用
 */
import { IMAGE_PATHS } from "./images";

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
 */
export const homeBanners: HomeBannerItem[] = [
  {
    id: "banner-daily-fate",
    imageUrl: IMAGE_PATHS.BANNERS.HOME,
    title: "今日缘分值98%",
    subtitle: "3位与你高度契合的同学",
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
