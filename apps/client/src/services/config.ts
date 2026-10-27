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
  /** 该校在籍用户数；null = 后端统计不可用，客户端隐藏该行而非补 0 */
  memberCount: number | null;
  /** 该校用户的可见动态数；null 语义同 memberCount */
  postCount: number | null;
  /**
   * 该校专业目录（选项顺序即数组顺序，picker 直接消费）。
   *
   * 真源是后端新表 {@code school_majors}（database/flyway/sql/V2026.10.27.0001__create_school_majors.sql）：
   * 命中「按校档」时下发该校专属目录，没有按校数据时后端自己回退「通用基线档（67 条）」
   * 并记一行日志。截至本次接线，库里**只有基线档**，即所有学校拿到的都是通用基线，
   * 不是该校开课事实——按校真源待教育部备案/学校本科招生专业目录导入。
   *
   * `null` 只出现在后端连基线都取不到的降级路径，语义是「后端没目录，客户端自己回退本地常量」；
   * 两种情况都**不得**渲染成空 picker（那等于告诉用户「这所学校没有专业」）。
   *
   * 声明为可选（`?`）：后端 mock 档与历史响应可能整体缺键，消费方统一走
   * `config/schools.ts` 的 getMajorsForSchool() 回退链，不在这里区分「缺键」与「null」。
   */
  majors?: string[] | null;
  /**
   * majors 的来源档（2026-10-28 后端新增）：`"school"` = 命中该校专属目录，
   * `"baseline"` = 回退通用基线档，`null`/缺键 = 连基线都取不到。
   *
   * 为什么要这个字段：17 所学校当前全部落在基线档，客户端只看得到「有 67 条专业」，
   * 分不出这是本校真源还是通用目录 ⇒ 界面会让人以为看到了本校专业目录。
   * 客户端无法自己判断（它看不到 school_majors 表），档位只能由后端说。
   * 同样声明为可选：mock 档与历史响应没有这个键，消费方按「未知」处理，不得当成 school。
   */
  majorsSource?: string | null;
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
 * R3-NEARBY-02（2026-10-13 产品诊断线）：本端点客户端按「公开配置」消费
 * （pages/nearby/index.vue 的 onLoad/onShow 不经登录门直接调用），但后端两态
 * SecurityConfig（SecurityConfig.java:194 / MockSecurityConfig.java:225
 * `/api/v1/** → authenticated()`，permitAll 白名单只有 /config/legal 与
 * /location/ip-city）都要求鉴权 ⇒ 无 token 时必得 401 → http 层
 * redirectToLogin（services/http.ts:493）强踢登录页，把「附近」tab 打成
 * nearby→login→discover。该读数是纯装饰数据且有本地静态兜底，不得驱动认证状态机，
 * 故与 services/auth.ts:454 同口径加 skipAuthRefresh：401 直接抛给调用方 catch，
 * 走 loadSchools 既有的静态回退，不再触发刷新与登录跳转。
 * 带鉴权语义的正解是后端把 /api/v1/config/** 放行（API 车道决策），不在此处。
 *
 * @returns 学校视图列表
 */
export async function loadCampuses(): Promise<CampusView[]> {
  return request<CampusView[]>({
    url: "/config/campuses",
    method: "GET",
    skipAuthRefresh: true,
  });
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

/**
 * 法定文本视图（与后端 {@code LegalTextView} record 对齐，P0-22）。
 */
export interface LegalTextView {
  /** 文本标题（如「用户协议」/「隐私政策」） */
  title: string;
  /** 正文长文本（客户端原样展示） */
  content: string;
  /** 最后更新时间（ISO 8601 字符串） */
  updatedAt: string | null;
  /** 当前法定文本版本号（2026-10-05 合规接线新增字段；后端旧版本无此字段） */
  version?: string | null;
}

/**
 * 法定文本版本号获取失败时的兜底值。
 *
 * 与服务端 `AgreementConsentService.DEFAULT_LEGAL_VERSION`（'v1.0.0'）保持同形：
 * 该值会作为 `agreedLegalVersion` 上报并写入 user_agreement_consent，
 * 两侧字面量不一致会让同一语义的同意留痕落进两种值，后续按版本对账/聚合需先归一。
 */
export const DEFAULT_LEGAL_VERSION = "v1.0.0";

/**
 * 获取当前法定文本版本号（2026-10-05 合规接线：注册同意落库）。
 *
 * <p>调用 {@code GET /config/legal?type=user_agreement}（后端 permitAll，无需鉴权），
 * 读取返回体中的 {@code version} 字段；后端未升级（无 version 字段）时回退
 * {@code updatedAt}；请求失败/字段缺失时回退 {@code DEFAULT_LEGAL_VERSION}（'v1.0.0'）。
 * 本函数任何情况下不抛错——注册主流程不应因版本号获取失败被阻断。</p>
 *
 * @returns 当前法定文本版本号（永远返回非空字符串）
 */
export async function fetchAgreedLegalVersion(): Promise<string> {
  try {
    const view = await request<LegalTextView>({
      url: "/config/legal",
      method: "GET",
      data: { type: "user_agreement" },
      skipAuth: true,
      noRetry: true,
      // 版本号获取属可降级辅助调用，失败由本函数兜底，不进 http 层上报
      reportError: false,
    });
    if (view && typeof view.version === "string" && view.version.trim()) {
      return view.version.trim();
    }
    if (view && typeof view.updatedAt === "string" && view.updatedAt.trim()) {
      return view.updatedAt.trim();
    }
    return DEFAULT_LEGAL_VERSION;
  } catch (e) {
    // 任何失败（网络/后端未升级/字段缺失）都回退默认版本，不阻断注册主流程
    return DEFAULT_LEGAL_VERSION;
  }
}
