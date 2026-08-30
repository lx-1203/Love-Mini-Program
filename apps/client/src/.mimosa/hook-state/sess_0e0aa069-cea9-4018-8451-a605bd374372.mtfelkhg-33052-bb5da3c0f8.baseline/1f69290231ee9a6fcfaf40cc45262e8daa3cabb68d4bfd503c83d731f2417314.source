/**
 * 客户端动态配置服务（Task 3.6）。
 *
 * <p>本模块封装 5 类配置接口的客户端调用，替代散落在
 * {@code config/schools.ts} / {@code config/match-form.ts} / {@code config/home-banners.ts}
 * 与 stores 中的硬编码常量，使运营可在后台动态调整而无需发版。</p>
 *
 * <p><b>接口契约</b>（与后端 {@code ConfigController} 对齐，{@code apiBaseUrl} 默认包含 {@code /api} 前缀，
 * 因此客户端 url 写 {@code /config/...} 即对应后端 {@code /api/v1/config/...}）：</p>
 * <ul>
 *   <li>GET /config/campuses           → CampusView[]                （Task 3.6.1）</li>
 *   <li>GET /config/match-preferences  → MatchPreferenceOptionView[] （Task 3.6.2）</li>
 *   <li>GET /config/filter-options     → FilterOptionView[]          （Task 3.6.3）</li>
 *   <li>GET /config/hero-banners       → HeroBannerView[]            （Task 3.6.4）</li>
 *   <li>GET /config/unlock-guide-steps → UnlockGuideStepView[]       （Task 3.6.5）</li>
 * </ul>
 *
 * <p><b>鉴权</b>：所有端点需要登录用户（JWT），由 http.ts 自动附加 Authorization 头。</p>
 *
 * <p><b>降级策略</b>：后端不可达或返回异常时，调用方应回退到本地 {@code config/*.ts}
 * 静态默认值，保证首屏渲染不阻塞。本服务不在内部隐式降级，由调用方显式处理，
 * 避免静默掩盖后端故障。</p>
 *
 * <p><b>缓存</b>：后端侧 5 分钟缓存（{@code CacheNames.CLIENT_CONFIG}），
 * 客户端不额外缓存，避免与后端缓存不一致导致运营调整生效延迟。</p>
 */
import { request } from "./http";

/* ========== 视图 DTO 类型定义 ========== */

/**
 * 学校视图（与后端 {@code CampusView} record 对齐）。
 *
 * 用于驱动「校园认证 / 校区筛选 / 高级筛选」等模块的下拉选项。
 */
export interface CampusView {
  /** 学校稳定标识（与认证表 school_name 关联） */
  id: string;
  /** 学校中文名称（直接展示给用户） */
  name: string;
  /** 学校所在城市（可选，用于按城市分组筛选） */
  city: string | null;
}

/**
 * 匹配偏好选项视图（与后端 {@code MatchPreferenceOptionView} record 对齐）。
 *
 * 用于驱动「匹配偏好选择 / 偏好筛选」等模块的可选项列表。
 */
export interface MatchPreferenceOptionView {
  /** 偏好项标识（提交时回传，如 "preference" / "timeRange"） */
  key: string;
  /** 偏好项展示文本（按 Accept-Language 国际化） */
  label: string;
  /** 是否必填（用于表单校验） */
  required: boolean;
  /** 选项所属分组（可选，用于在 UI 上聚类展示，如 "basic" / "lifestyle"） */
  group: string | null;
  /** 偏好可选项列表（如「在校 / 已毕业」「文科 / 理科」），可为空表示自由输入 */
  options: MatchPreferenceOptionItem[];
}

/** 匹配偏好可选项。 */
export interface MatchPreferenceOptionItem {
  /** 选项值（提交时回传） */
  value: string;
  /** 选项展示文本（按 Accept-Language 国际化） */
  label: string;
}

/**
 * 筛选选项视图（与后端 {@code FilterOptionView} record 对齐）。
 *
 * 用于驱动「活动类型 / 论坛版块 / 帖子分类」等筛选下拉或 Tab 选项。
 */
export interface FilterOptionView {
  /** 筛选维度标识（如 "activity_type" / "forum_section" / "campus_topic_category"） */
  category: string;
  /** 该维度下的可选项列表（按展示顺序排列） */
  options: FilterOptionItem[];
}

/** 筛选可选项。 */
export interface FilterOptionItem {
  /** 选项值（提交时回传，与后端实体字段值一致） */
  value: string;
  /** 选项展示文本（按 Accept-Language 国际化） */
  label: string;
  /** 选项图标 URL 或 icon class（可选，用于 UI 图标渲染） */
  icon: string | null;
}

/**
 * Hero Banner 视图（与后端 {@code HeroBannerView} record 对齐）。
 *
 * 用于驱动首页 / 登录页 Banner 轮播。
 */
export interface HeroBannerView {
  /** Banner 唯一标识（用于 swiper item key） */
  id: string;
  /** Banner 图片 URL（走媒体鉴权代理或 CDN） */
  imageUrl: string;
  /** Banner 主标题（按 Accept-Language 国际化） */
  title: string;
  /** Banner 副标题（可选，按 Accept-Language 国际化） */
  subtitle: string | null;
  /** 点击跳转路径（app 内部路径，如 /pages/discover/index） */
  link: string;
  /** 展示顺序（升序），同 order 时按 id 升序 */
  order: number;
  /** 是否启用（false 时前端不展示） */
  enabled: boolean;
}

/**
 * 解锁引导步骤视图（与后端 {@code UnlockGuideStepView} record 对齐）。
 *
 * 用于驱动「解锁引导弹窗 / 一次性教学蒙层」的分步文案展示。
 */
export interface UnlockGuideStepView {
  /** 步骤序号（从 1 开始，前端按序展示） */
  step: number;
  /** 步骤标题（按 Accept-Language 国际化） */
  title: string;
  /** 步骤详细说明（按 Accept-Language 国际化） */
  description: string;
  /** 步骤主按钮文案（如「去完善资料」，按 Accept-Language 国际化） */
  ctaText: string;
  /** 点击主按钮跳转的 app 内部路径（如 /subpackages/setup/profile/index） */
  ctaLink: string;
  /** 关闭按钮文案（如「暂不完善」，按 Accept-Language 国际化） */
  dismissText: string;
}

/* ========== 配置加载函数 ========== */

/**
 * 加载学校列表（Task 3.6.1）。
 *
 * 失败策略：后端不可达时抛 EnhancedApiError，由调用方（config/schools.ts 的
 * loadSchools）回退到本地默认值，并输出告警（infra R2-00122），避免静默降级。
 *
 * @returns 学校视图列表
 */
export async function loadCampuses(): Promise<CampusView[]> {
  return request<CampusView[]>({ url: "/config/campuses", method: "GET" });
}

/**
 * 加载匹配偏好选项列表（Task 3.6.2）。
 *
 * @returns 匹配偏好选项列表；后端不可达时抛 EnhancedApiError。
 */
export async function loadMatchPreferences(): Promise<MatchPreferenceOptionView[]> {
  return request<MatchPreferenceOptionView[]>({
    url: "/config/match-preferences",
    method: "GET",
  });
}

/**
 * 加载筛选选项列表（Task 3.6.3）。
 *
 * @returns 筛选选项列表（包含多个维度：activity_type / forum_section / campus_topic_category）。
 */
export async function loadFilterOptions(): Promise<FilterOptionView[]> {
  return request<FilterOptionView[]>({
    url: "/config/filter-options",
    method: "GET",
  });
}

/**
 * 加载 Hero Banner 列表（Task 3.6.4）。
 *
 * @returns Hero Banner 视图列表（按 order 升序，已过滤 enabled=false）。
 *          调用方需自行过滤 enabled=false 项（后端已过滤，但防御性处理）。
 */
export async function loadHeroBanners(): Promise<HeroBannerView[]> {
  return request<HeroBannerView[]>({
    url: "/config/hero-banners",
    method: "GET",
  });
}

/**
 * 加载解锁引导步骤文案列表（Task 3.6.5）。
 *
 * @returns 解锁引导步骤视图列表（按 step 升序）。
 */
export async function loadUnlockGuideSteps(): Promise<UnlockGuideStepView[]> {
  return request<UnlockGuideStepView[]>({
    url: "/config/unlock-guide-steps",
    method: "GET",
  });
}
