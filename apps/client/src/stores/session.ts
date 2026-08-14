import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { isDev } from "../config/env";
// 微信登录真实链路（Task 0.1.1）：services/auth.ts 封装 wx.login + POST /v1/auth/wechat
import { loginWithWechat as authLoginWithWechat, loginAsGuest } from "../services/auth";
// JWT token 存取：bootstrap 检测到失效 token 时清除并以体验账号重登
import { getToken, clearTokens } from "../services/http";
// 2026-08-10 切换提速：登出时清空 TTL 缓存（防跨账号数据泄漏）
import { clearAllCaches } from "../utils/cache-ttl";
// Sentry 监控：登录成功关联用户身份，退出登录清除用户上下文
import { setUser, clearUser } from "../services/sentry";
import { toLoginHeroView } from "../view-models/login";
import { MOCK_LOGIN_HERO } from "../features/login/hero";
import { useMock } from "./helpers/use-mock";
// B6：后台配置即时生效——启动期非阻塞拉取功能开关/维护模式（见 bootstrap）
import { useAppConfigStore } from "./app-config";
import type { components } from "../services/generated/api-types";
// R4-00167: bindSchool 城市兜底（按学校名查城市表）
import { SCHOOLS } from "../config/schools";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

type Schemas = components["schemas"];
type UserSession = Schemas["UserSession"];
type LoginHeroConfig = Schemas["LoginHeroConfig"];

/* ========== Mock 数据 ========== */

/**
 * Mock 用户会话数据。
 *
 * 修复（R4-00134）：mock 当前用户 ID 与全项目 mock 家族统一为 "user-1001"
 * （services/mocks/fixtures.ts、stores/likes/mock-data.ts、stores/village/mock-data.ts、
 * stores/campus/mock-data.ts 的 MOCK_CURRENT_USER_ID 均为该值），
 * 不再与 "1" 并存导致 mock 身份语义分裂。
 */
const mockUserSession: UserSession = {
  userId: "user-1001",
  loggedIn: true,
  loginMethod: "wechat",
  displayName: "测试用户",
  phoneBound: false,
  profileCompleted: true,
  campusVerified: true,
  scheduleCompleted: true,
  campusName: "北京大学",
  // infra R2-00047: schoolId 使用学校 ID（非名称），避免 ID/名称语义混淆（与 config/schools.ts 的 id 体系一致）
  schoolId: "pku",
  schoolBound: true,
  featureFlags: {
    chat_ai_enabled: false,
  },
};

/** Mock 登录主视觉配置（引用 hero.ts 中的 mock 数据，确保视频背景生效） */
const mockLoginHero: LoginHeroConfig = {
  ...MOCK_LOGIN_HERO,
};

/**
 * 用户资料字段完善状态（用于细粒度完善度计算）
 */
export interface ProfileFieldStatus {
  avatar: boolean;
  nickname: boolean;
  gender: boolean;
  birthday: boolean;
  school: boolean;
  major: boolean;
  interestTags: boolean;
  bio: boolean;
}

/**
 * Session Store 持久化存储 Key。
 *
 * 用于将 profileBackgroundUrl / avatarUrl / nickname 等关键字段持久化到本地，
 * 以保证 H5 冷启动 / 刷新后背景图等视图状态不丢失。
 *
 * 注意：项目未引入 pinia-plugin-persistedstate，故采用 uni.setStorageSync 手动持久化。
 */
const SESSION_PERSIST_KEY = "session:persistent-fields";

/**
 * 资料完善度字段权重表（合计 100）。
 *
 * 修复（R4-00123）：权重魔法数字抽取为具名常量并注明业务依据，
 * 调整权重只需改此处一处，与后端/产品口径对齐时无需逐处改代码。
 *
 * 权重分配（合计 100）的业务依据（与产品资料完善度口径一致）：
 * - 头像 20%：第一印象的核心载体，权重最高档
 * - 昵称 10%：基础身份信息
 * - 性别 10%：匹配推荐的基础维度
 * - 生日 10%：年龄/星座推荐维度
 * - 学校 20%：同校/同城匹配的核心维度（与 campus 绑定同等重要）
 * - 专业 10%：兴趣相近度辅助维度
 * - 兴趣标签 10%：共同兴趣匹配维度
 * - 个人简介 10%：个性展示维度
 *
 * 注意：若产品调整口径，须与后端 profile_completion 计算保持同步
 * （后端 UserCompletionService 为最终权威，本表仅用于前端展示预估）。
 */
const PROFILE_COMPLETION_WEIGHTS = {
  avatar: 20,
  nickname: 10,
  gender: 10,
  birthday: 10,
  school: 20,
  major: 10,
  interestTags: 10,
  bio: 10,
} as const;

/**
 * 解析 UserSession 中各资料字段的完成状态（唯一真相源）。
 *
 * 修复（R4-00194）：profileFieldStatus 与 profileCompletion 两处原先各写一份
 * 字段判定逻辑，且全部字段以 profileCompleted 为代理，头像未上传但资料保存后
 * 所有字段显示已完成、完善度虚高。现收敛为单一函数：
 * - nickname/school 有真实字段判定（displayName / campusName）；
 * - avatar/gender/birthday/major/interestTags/bio 在 UserSession 未下发字段级
 *   状态前，仍以 profileCompleted 为代理（注释明确标注），待后端下发后仅需
 *   修改本函数一处。
 *
 * @param session 用户会话（可能为 null）
 * @returns 各字段完成状态
 */
function resolveProfileFields(session: UserSession | null): ProfileFieldStatus {
  if (!session) {
    return {
      avatar: false,
      nickname: false,
      gender: false,
      birthday: false,
      school: false,
      major: false,
      interestTags: false,
      bio: false,
    };
  }
  return {
    // 头像：以 profileCompleted 为代理（实际应有 avatarUrl 字段，待后端下发）
    avatar: session.profileCompleted === true,
    // 昵称：有 displayName 即算完成
    nickname: Boolean(session.displayName && session.displayName.trim().length > 0),
    // 性别、生日、专业、兴趣标签、简介：以 profileCompleted 为代理（待后端下发字段级状态）
    gender: session.profileCompleted === true,
    birthday: session.profileCompleted === true,
    // 学校：有 campusName 即算完成
    school: Boolean(session.campusName && session.campusName.trim().length > 0),
    major: session.profileCompleted === true,
    interestTags: session.profileCompleted === true,
    bio: session.profileCompleted === true,
  };
}

/**
 * Session Store 持久化字段（仅持久化必要字段，避免泄漏完整会话）。
 *
 * 导出供 types/guards.ts 中的类型守卫引用，确保从本地存储反序列化时
 * 能通过运行时校验安全收敛到该类型。
 */
export interface SessionPersistedFields {
  profileBackgroundUrl: string;
}

/**
 * 从本地存储读取持久化字段，失败时返回空对象。
 */
function loadPersistedFields(): Partial<SessionPersistedFields> {
  try {
    const raw = uni.getStorageSync(SESSION_PERSIST_KEY);
    if (typeof raw === "string" && raw.length > 0) {
      const parsed = JSON.parse(raw) as Partial<SessionPersistedFields>;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (_e) {
    // 读取失败忽略，使用默认空值
  }
  return {};
}

/**
 * 将持久化字段写入本地存储，失败时静默忽略。
 */
function savePersistedFields(fields: SessionPersistedFields): void {
  try {
    uni.setStorageSync(SESSION_PERSIST_KEY, JSON.stringify(fields));
  } catch (_e) {
    // 写入失败忽略，避免阻塞业务流程
  }
}

// 启动时一次性读取持久化字段，作为 store 初始值
const initialPersisted = loadPersistedFields();

/**
 * 将 UserSession 同步到 Sentry，便于在异常发生时关联用户身份。
 *
 * 调用时机：
 * - refreshSession / bootstrap / loginWithWechat 成功后；
 * - 用户未登录（loggedIn=false 或 session 为空）时调用 clearUser 清除上下文，
 *   避免上一个用户的身份残留到后续上报。
 *
 * 字段映射：
 * - userId → Sentry.User.id
 * - displayName → Sentry.User.username（nickname）
 * - loginMethod → 作为扩展字段透传，便于在后台按登录方式筛选
 *
 * @param session 当前用户会话（可能为 null）
 */
function syncSentryUser(session: UserSession | null): void {
  try {
    if (session && session.loggedIn && typeof session.userId === "string" && session.userId.length > 0) {
      setUser(session.userId, {
        nickname: session.displayName ?? "",
        loginMethod: session.loginMethod ?? "",
      });
    } else {
      // 未登录或会话已失效：清除 Sentry 用户上下文，避免身份残留
      clearUser();
    }
  } catch (_e) {
    // Sentry 调用失败不应影响 session 流程，静默处理
  }
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    loading: false,
    /** 是否为离线状态（无法连接服务器） */
    isOffline: false,
    userSession: null as Awaited<ReturnType<typeof clientApi.getSession>> | null,
    loginHero: null as ReturnType<typeof toLoginHeroView> | null,
    /**
     * 个人主页顶部背景图 URL（Phase D4 / Phase E1）
     * 字段名与后端 schema / fixtures / api-types-supplement 中的 profileBackgroundUrl 对齐。
     * 默认空字符串，空时使用品牌色渐变；非空时使用 <image> 渲染。
     *
     * 持久化策略：上传成功后通过 uni.setStorageSync 持久化，冷启动 / H5 刷新后从 storage 恢复，
     * 避免每次刷新都丢失背景图。refreshSession 时若后端 UserSession 携带 profileBackgroundUrl，
     * 优先使用后端返回值（向后兼容：UserSession schema 暂未暴露该字段，使用类型断言安全访问）。
     */
    profileBackgroundUrl: (initialPersisted.profileBackgroundUrl ?? "") as string,
    /**
     * 最近一次会话错误信息。
     *
     * 修复（P1 BUG）：原 refreshSession 失败时仅设置 isOffline 标记并 throw，
     * UI 无法获取具体错误原因（如「网络超时」「鉴权失败」），无法给用户明确提示。
     * 现新增 errorMessage 字段，refreshSession 失败时记录具体错误信息，
     * 成功时清空，UI 可据此展示重试入口与错误提示。
     */
    errorMessage: null as string | null,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.userSession?.loggedIn),
    featureFlags: (state) => state.userSession?.featureFlags ?? {},
    completionState: (state) => ({
      profileCompleted: Boolean(state.userSession?.profileCompleted),
      campusCompleted: Boolean(state.userSession?.campusVerified),
      scheduleCompleted: Boolean(state.userSession?.scheduleCompleted),
    }),

    /**
     * 资料字段完善状态
     *
     * 修复（R4-00194）：字段判定收敛到 {@link resolveProfileFields} 单一真相源。
     * 已知限制——avatar/gender/birthday/major/interestTags/bio 暂以 profileCompleted
     * 为代理（后端 UserSession 未暴露字段级状态），待后端下发后仅需修改
     * resolveProfileFields 一处。
     */
    profileFieldStatus: (state): ProfileFieldStatus => {
      return resolveProfileFields(state.userSession);
    },

    /**
     * 细粒度资料完善度百分比（0-100）
     *
     * 修复（SubTask 1.4.2）：原实现使用 `Math.min(baseScore, detailScore)` 取基础维度
     * 与细粒度维度较小值，导致用户即使填完所有细粒度字段，只要三大模块任一未完成，
     * 完善度就会被压低到 33% / 67%，与用户实际填写感受不符。
     *
     * 现改为纯加权平均算法：按字段权重累加得分，权重总和为 100，
     * 每个字段完成则加上对应权重，未完成则加 0，最终得分即完善度百分比。
     *
     * 修复（R4-00123）：权重表收敛为模块级常量 {@link PROFILE_COMPLETION_WEIGHTS}
     * （含业务依据注释），字段完成状态复用 {@link resolveProfileFields} 单一真相源。
     */
    profileCompletion: (state): number => {
      const session = state.userSession;
      if (!session) return 0;

      const weights = PROFILE_COMPLETION_WEIGHTS;
      const fields = resolveProfileFields(session);

      // 加权平均：每个字段完成则加上对应权重
      let score = 0;
      (Object.keys(weights) as Array<keyof typeof weights>).forEach((key) => {
        if (fields[key]) {
          score += weights[key];
        }
      });

      // 边界值检查确保 0-100 范围
      return Math.max(0, Math.min(100, score));
    },

    /**
     * 资料是否已完善（资料完善硬门槛）
     *
     * 修复（P0 BUG）：原逻辑要求 profileCompleted && campusVerified && scheduleCompleted，
     * 与 session-guard 的 `snapshot.profileCompleted` 判定不一致，导致用户完成资料完善后，
     * profile-guard 与页面 LockScreen 仍因 campus/schedule 未完成而锁定村口/我的等页面。
     *
     * 现统一为仅判定 `profileCompleted`，与 session-guard、page-access.ts 的 requiresProfile 保持一致。
     * campus/schedule 的硬门槛由各自的 requiresCampus / requiresSchedule 控制，不再耦合在资料判定里。
     */
    isProfileComplete: (state): boolean => {
      const session = state.userSession;
      if (!session) return false;
      // 修复（P0 BUG）：原逻辑要求 profileCompleted && campusVerified && scheduleCompleted，
      // 与 session-guard 的 snapshot.profileCompleted 判定不一致，导致用户完成资料完善后
      // profile-guard 与页面 LockScreen 仍因 campus/schedule 未完成而锁定村口/我的等页面。
      // 现统一为仅判定 profileCompleted，与 session-guard、page-access.ts 的 requiresProfile 保持一致。
      // campus/schedule 硬门槛由各自的 requiresCampus / requiresSchedule 控制，不再耦合在资料判定里。
      const result = Boolean(session.profileCompleted);
      // infra R2-00049: 移除 isDev console.warn 调试日志（getter 高频求值，生产分支无需执行判断），
      // 需要排查时改用一次性日志或调试工具
      return result;
    },

    /**
     * 是否已完成校园认证（用于课表等仅在校生可用的功能守卫）
     * 基于 userSession.campusVerified 字段判定
     */
    isCampusVerified: (state): boolean => {
      return Boolean(state.userSession?.campusVerified);
    },

    /**
     * 是否已绑定学校（任务 C：学校一次性绑定）。
     *
     * UserSession schema 暂未暴露 schoolBound 字段（同 profileBackgroundUrl 处理方式），
     * 使用类型断言安全访问，避免 TS 编译错误；真实环境由后端返回该字段。
     */
    isSchoolBound: (state): boolean => {
      return Boolean(
        (state.userSession as { schoolBound?: boolean } | null)?.schoolBound,
      );
    },

    /**
     * 是否超级测试账号（2026-08-07 本地联调账号体系）。
     *
     * 种子脚本 V2026.08.07.0004 固定 userId = 100000（openid=<REDACTED>），
     * 前端据此放行：匹配次数无限 / 付费解锁免费 / dev 页身份切换。
     *
     * 修复（R4-00122）：userId 硬编码前端旁路仅限开发环境生效，生产环境恒为 false，
     * 防止超级账号特权（免费解锁等）在生产被滥用；最终是否超级账号应由后端判定
     * （如 UserSession 增加 isSuperTestAccount 字段）后下发，前端仅作展示辅助。
     */
    isSuperTestAccount: (state): boolean => {
      if (!isDev) return false;
      return state.userSession?.userId === "100000";
    },
  },
  actions: {
    /**
     * 刷新用户会话
     * 包含离线状态检测
     *
     * 修复（E1.1）：将 userSession.profileBackgroundUrl 同步到 store.profileBackgroundUrl，
     * 保证后端返回背景图 URL 时前端状态一致；同时持久化到本地存储以支撑冷启动 / H5 刷新场景。
     *
     * 修复（P1 BUG）：原 refreshSession 失败时仅设置 isOffline 标记并 throw，
     * UI 无法获取具体错误原因，且对鉴权失败（401）和网络错误一视同仁，
     * 导致鉴权失败时仍保留陈旧 userSession（用户看起来仍处于登录态）。
     * 现改进失败处理：
     * 1. 新增 errorMessage 字段记录具体错误信息，成功时清空
     * 2. 区分网络错误（isOffline=true，保留 userSession 以支持离线浏览）与
     *    鉴权错误（清空 userSession，强制重新登录）
     * 3. 仍然向上抛出错误，调用方可据此展示重试入口
     */
    async refreshSession() {
      try {
        // 修复（P1 BUG）：开始时清空 errorMessage，避免陈旧错误信息误导 UI
        this.errorMessage = null;
        this.isOffline = false;

        // 修复：原 useMock()/else 两个分支完全相同（clientApi.getSession 内部已做
        // mock/real 分流），属死分支，合并为单一调用（语义不变）。
        this.userSession = await clientApi.getSession();

        // 同步 profileBackgroundUrl：后端 UserSession schema 暂未暴露此字段，
        // 使用类型断言安全访问，避免 TS 编译错误。若后端补字段后可移除断言。
        const bgUrl = (
          this.userSession as { profileBackgroundUrl?: string } | null
        )?.profileBackgroundUrl;
        if (typeof bgUrl === "string") {
          this.profileBackgroundUrl = bgUrl;
        }

        // 持久化到本地存储，保证 H5 刷新 / 冷启动后背景图不丢失
        savePersistedFields({
          profileBackgroundUrl: this.profileBackgroundUrl,
        });

        // 同步用户身份到 Sentry：H5 刷新后用户身份不丢失，便于异常关联
        syncSentryUser(this.userSession);

        // 开发模式日志：便于排查完善度状态变化（资料保存后是否同步更新）
        if (isDev && this.userSession) {
          // 修复 no-console：调试日志改用 console.warn（允许的方法）
          console.warn("[SessionStore] refreshSession 完成:", {
            profileCompleted: this.userSession.profileCompleted,
            campusVerified: this.userSession.campusVerified,
            scheduleCompleted: this.userSession.scheduleCompleted,
            isProfileComplete: this.isProfileComplete,
          });
        }

        return this.userSession;
      } catch (error) {
        // 修复（P1 BUG）：记录具体错误信息，UI 可据此展示
        // R4-00124：兜底文案走 i18n（storeErrors.session.refreshFailed）
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.session.refreshFailed");

        // 修复（P1 BUG）：区分网络错误与鉴权错误
        // 鉴权错误（401）：清空 userSession，强制重新登录
        // 网络错误：保留 userSession 以支持离线浏览，仅设置 isOffline
        const isAuthError =
          error !== null &&
          typeof error === "object" &&
          ("status" in error || "statusCode" in error || "code" in error) &&
          ((error as { status?: number }).status === 401 ||
            (error as { statusCode?: number }).statusCode === 401 ||
            (error as { code?: number }).code === 401);

        if (isAuthError) {
          // 鉴权失败：清空会话，强制重新登录
          this.userSession = null;
          this.isOffline = false;
        } else {
          // 网络或其他错误：标记为离线，保留 userSession 以支持离线浏览
          this.isOffline = true;
        }

        console.warn("[SessionStore] 刷新会话失败:", {
          error: this.errorMessage,
          isAuthError,
          isOffline: this.isOffline,
        });
        throw error;
      }
    },

    /**
     * 退出登录。
     *
     * 修复（P1 BUG）：原 settings/index.vue 与 profile/index.vue 直接通过
     * `sessionStore.userSession = null` 清空会话，未调用后端 logout 接口、
     * 未清理本地状态（profileBackgroundUrl / isOffline / errorMessage），
     * 导致：
     * 1. 后端 token 在过期前仍有效，存在安全隐患
     * 2. 下次登录后可能展示上一次用户的背景图等残留状态
     * 3. 模块级定时器（如未来扩展的会话心跳）不会被清理，可能在登出后继续触发
     *
     * 现新增 logout action 统一处理退出登录流程：
     * 1. 调用 clientApi.logout() 清除本地 token + 通知后端 + 跳转登录页
     * 2. 清空 store 状态（userSession / isOffline / errorMessage / profileBackgroundUrl）
     * 3. 清除持久化的 profileBackgroundUrl（避免下次登录残留）
     * 4. 清理模块级 in-flight Promise / 定时器（当前无显式定时器，预留扩展点）
     */
    async logout() {
      try {
        // 1. 调用 clientApi.logout 清除本地 token + 通知后端 + 跳转登录页
        //    实际顺序（见 services/api.ts）：先携带 token 请求后端 /auth/logout，
        //    再在 finally 中清本地 token 并 reLaunch 登录页——保证后端能收到
        //    有效的认证信息，避免先清 token 导致后端登出请求 401 失效。
        await clientApi.logout();
      } catch (error) {
        // logout 内部已 best-effort 处理后端通知失败，此处仅记录日志
        console.warn("[SessionStore] logout 调用异常:", error);
      } finally {
        // 2026-08-10 切换提速：清空 TTL 缓存，防跨账号数据泄漏
        clearAllCaches();
        // 2. 清空 store 状态，确保下次登录从干净状态开始
        this.userSession = null;
        this.loginHero = null;
        this.isOffline = false;
        this.errorMessage = null;
        this.profileBackgroundUrl = "";

        // 3. 清除 Sentry 用户上下文：避免登出后的上报仍关联已登出用户
        try {
          clearUser();
        } catch (_e) {
          // Sentry 调用失败不影响登出主流程
        }

        // 4. 清除持久化的 profileBackgroundUrl，避免下次登录残留
        try {
          savePersistedFields({ profileBackgroundUrl: "" });
        } catch (_e) {
          // 持久化失败忽略，不影响登出主流程
        }

        if (isDev) {
          // 修复 no-console：调试日志改用 console.warn（允许的方法）
          console.warn("[SessionStore] logout 完成，store 状态已清空");
        }
      }
    },

    /**
     * 应用启动初始化
     * 包含离线状态处理
     */
    async bootstrap() {
      this.loading = true;
      try {
        this.isOffline = false;

        if (useMock()) {
          // Mock 模式：使用本地硬编码的登录主视觉和用户会话数据
          this.loginHero = toLoginHeroView({ ...mockLoginHero });
          this.userSession = { ...mockUserSession };
        } else {
          const [hero, session] = await Promise.all([
            clientApi.getLoginHero(),
            clientApi.getSession(),
          ]);
          this.loginHero = toLoginHeroView(hero);

          // 修复（Bootstrap 失效 token）：后端对无效/过期 token 的 /auth/me 容错返回
          // HTTP 200 + loggedIn=false（而非 401）。若本地残留过期 token，旧逻辑把
          // userSession 置为未登录态但不清除 storage token → 页面请求仍携带过期 token
          // → 401 → refresh 链路不可达（UserSessionView 无 refreshToken）→ 401 雪崩
          // （表现为「登录已过期，请重新登录」级联）。现检测该场景：清除失效 token。
          //
          // 修复（R4-00166）：自动 guest 重登仅限 mock/开发模式（isDev 或 apiMode=mock），
          // 真实模式改为静默登出——真实环境若自动切换体验账号会造成数据串号
          // （A 用户 token 失效后被当 B 体验账号写入数据）。
          if (!session?.loggedIn && getToken()) {
            clearTokens();
            if (isDev || useMock()) {
              console.warn("[SessionStore] 检测到失效 token，已清除并以体验账号自动重登（仅 mock/开发模式）");
              this.userSession = await loginAsGuest();
            } else {
              // 真实模式：静默登出（保留未登录态，不自动切换账号）
              console.warn("[SessionStore] 检测到失效 token，已静默登出（真实模式不自动切换体验账号）");
              this.userSession = null;
            }
          } else {
            this.userSession = session;
          }
        }

        // 应用启动时同步 Sentry 用户身份：H5 冷启动后用户身份不丢失
        syncSentryUser(this.userSession);

        // B6：启动期非阻塞拉取客户端配置（维护模式/功能开关），
        // 失败仅记录日志不阻塞启动——开关判定默认开放，App.vue onShow 会按 TTL 重试
        useAppConfigStore()
          .fetchAppConfig()
          .catch((error: unknown) => {
            // R4-batch4：诊断日志仅开发环境输出
            if (isDev) {
              console.warn("[SessionStore] 拉取客户端配置失败（启动期非阻塞）:", error);
            }
          });
      } catch (error) {
        this.isOffline = true;
        console.warn("[SessionStore] 初始化失败，进入离线模式:", error);
        // 离线模式下不清空已有数据
        if (!this.userSession) {
          this.userSession = null;
        }
      } finally {
        this.loading = false;
      }
    },

    /**
     * 微信登录（Task 0.1 真实链路）。
     *
     * <p>调用 {@link authLoginWithWechat}（services/auth.ts）完成端到端登录流程：</p>
     * <ol>
     *   <li>wx.login() 获取微信临时 code（带 15 秒超时 + state CSRF 防护）</li>
     *   <li>POST /v1/auth/wechat 将 code 发送到后端</li>
     *   <li>后端调用微信 jscode2session 换取 openId、查找/创建用户、签发 JWT</li>
     *   <li>services/auth.ts 自动保存 token 到本地存储</li>
     * </ol>
     *
     * <p>Task 0.1.4 修复：移除原 `code = "mock-code"` 默认参数与 `if (useMock())` Mock fallback，
     * 确保登录失败时抛出具体业务错误（WechatLoginError）供 UI 显示。
     * Mock 模式不再适用于登录链路，仅保留在非登录的会话刷新 / bootstrap 流程中。</p>
     *
     * <p>错误处理：失败时抛出 WechatLoginError（含 INVALID_CODE / WECHAT_API_ERROR /
     * USER_DISABLED / CLIENT_ERROR 业务错误码），调用方应捕获并在 UI 上显示 error.message。
     * isOffline 标记为 true 仅供 UI 显示离线提示，实际错误信息以抛出的异常为准。</p>
     *
     * @throws WechatLoginError 当 wx.login 失败 / 后端返回业务错误 / 网络异常时抛出
     */
    async loginWithWechat() {
      try {
        this.isOffline = false;
        this.errorMessage = null;

        // Task 0.1.1 真实链路：services/auth.ts 封装 wx.login + POST /v1/auth/wechat
        // 不含 Mock fallback，失败时抛出 WechatLoginError（含明确业务错误码）
        this.userSession = await authLoginWithWechat();

        // 2026-08-10 切换提速：新账号登录成功，清空 TTL 缓存（防跨账号数据泄漏）
        clearAllCaches();
        // 登录成功：同步用户身份到 Sentry，后续异常上报将自动关联该用户
        syncSentryUser(this.userSession);

        return this.userSession;
      } catch (error) {
        // 登录失败：记录具体错误信息，UI 可据此展示
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.session.wechatLoginFailed");
        this.isOffline = true;
        console.warn("[SessionStore] 微信登录失败:", {
          error: this.errorMessage,
          errorName: error instanceof Error ? error.name : "Unknown",
        });
        throw error;
      }
    },

    /**
     * 更新资料完善度
     * 用于在资料编辑完成后重新计算完善度
     */
    async updateProfileCompletion() {
      this.loading = true;
      try {
        if (isDev) {
          // 修复 no-console：调试日志改用 console.warn（允许的方法）
          console.warn("[SessionStore] updateProfileCompletion 触发，准备刷新会话");
        }
        await this.refreshSession();
        if (isDev) {
          console.warn("[SessionStore] updateProfileCompletion 完成:", {
            isProfileComplete: this.isProfileComplete,
            profileCompletion: this.profileCompletion,
          });
        }
      } catch (error) {
        console.warn("[SessionStore] 更新资料完善度失败:", error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 设置离线状态
     * @param offline - 是否离线
     */
    setOfflineStatus(offline: boolean) {
      this.isOffline = offline;
      if (!offline) {
        // 恢复在线时自动刷新会话
        this.refreshSession().catch(() => {
          console.warn("[SessionStore] 恢复在线后刷新会话失败");
        });
      }
    },

    /**
     * 设置个人主页背景图 URL（Phase E1）。
     *
     * 由 profileStore.uploadBackground 调用，更新状态的同时持久化到本地存储，
     * 保证 H5 刷新 / 冷启动后背景图不丢失。
     *
     * @param url - 背景图 URL（空字符串表示清除）
     */
    setProfileBackgroundUrl(url: string) {
      this.profileBackgroundUrl = url;
      savePersistedFields({
        profileBackgroundUrl: this.profileBackgroundUrl,
      });
    },

    /**
     * 绑定学校（任务 C：学校一次性绑定）。
     *
     * 已认证用户选择学校后调用，绑定成功后学校不可再切换
     * （UI 侧配合 home 页的只读态提示处理）。
     *
     * Mock 风格：本地写入 userSession 的 schoolId / schoolBound / campusName 字段。
     * 真实环境接入：应改为调用后端绑定接口（如 POST /api/schools/bind，
     * 请求体携带 schoolId），成功后由后端返回包含 schoolBound 的最新会话。
     *
     * @param schoolId - 学校 ID（当前 mock 下直接使用学校名称）
     * @returns 是否绑定成功
     */
    async bindSchool(schoolId: string): Promise<boolean> {
      if (!this.userSession) return false;
      // infra R2-00020 修复：真实模式调用后端保存校园档案（POST /profile/campus），
      // 落库后 schoolBound 刷新/重登不再回退；mock 模式保持本地改写。
      if (!useMock()) {
        try {
          // 修复（R4-00167）：CampusProfileRequest 的 city/department 标注 @NotBlank，
          // 原实现传空串导致真实模式恒 400。现优先取用户已认证的真实校园资料
          // （GET /profile/campus 返回的 city/department），其次按学校名查
          // config/schools.ts 城市表兜底；仅当两者都缺失时才保留空串
          // （该路径仅未认证用户可达，首页学校选择器本应不可见）。
          let city = "";
          let department = "";
          try {
            const existing = await clientApi.getCampusProfile();
            city = existing?.city ?? "";
            department = existing?.department ?? "";
          } catch (_e) {
            // 未认证/无档案：静默降级，走 SCHOOLS 城市表
          }
          if (!city) {
            city =
              SCHOOLS.find((s) => s.name === schoolId || t(s.nameKey ?? "") === schoolId)?.city ?? "";
          }
          // CampusProfileRequest 要求 city/campusName/department 三字段
          const payload = {
            city,
            campusName: schoolId,
            department,
          };
          const saved = await clientApi.saveCampusProfile(payload);
          this.userSession = {
            ...this.userSession,
            schoolId,
            schoolBound: true,
            campusName: saved?.campusName ?? schoolId,
          } as typeof this.userSession;
          return true;
        } catch (error) {
          if (isDev) {
            console.warn("[SessionStore] bindSchool 后端保存失败:", error);
          }
          return false;
        }
      }
      this.userSession = {
        ...this.userSession,
        schoolId,
        schoolBound: true,
        // 同步校园名称，保持现有 campusName 字段（首页选择器/资料完善度依赖）一致
        campusName: schoolId,
      } as typeof this.userSession;
      if (isDev) {
        // 修复 no-console：调试日志改用 console.warn（允许的方法）
        console.warn("[SessionStore] bindSchool 完成（本地改写）:", { schoolId });
      }
      return true;
    },
  },
});
