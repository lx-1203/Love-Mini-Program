import { defineStore } from "pinia";
import { clientApi, type ClientAppConfig } from "../services/api";
// 2026-08-10 切换提速：TTL 缓存工具（切 Tab 时按新鲜度窗口决定是否重拉）
import { isCacheFresh, setCachedValue } from "../utils/cache-ttl";

/**
 * App 配置 Store（B6：后台配置即时生效，前后端联动）。
 *
 * <p>拉取 GET /api/v1/app-config 聚合视图（功能开关 / 业务规则 / 站点标题），
 * 驱动维护模式遮罩、登录/注册入口开关、匹配/发帖开关等全局 UI 状态。
 * 数据源为后端 app_switch / app_rule / app_config 表（不缓存），
 * 本 store 侧以 30s TTL 新鲜度窗口限制拉取频率：
 * <ul>
 *   <li>启动期：sessionStore.bootstrap 非阻塞拉取一次；</li>
 *   <li>切 Tab：App.vue onShow 按 {@link #refreshIfStale()} 判断是否重拉；</li>
 *   <li>失败静默：保留旧值继续展示（开关判定默认开放，不影响功能）。</li>
 * </ul>
 * </p>
 */
export const useAppConfigStore = defineStore("app-config", {
  state: () => ({
    /** 功能开关（key → 是否开启）；未加载时为空对象（getter 默认开放） */
    switches: {} as Record<string, boolean>,
    /** 业务规则（key → 数值） */
    rules: {} as Record<string, number>,
    /** 站点标题 */
    siteTitle: "",
    /** 是否已成功拉取过（首次加载完成前不展示维护遮罩等状态） */
    loaded: false,
    /** 最近一次拉取时间戳（ms），配合 cache-ttl 新鲜度窗口使用 */
    fetchedAt: 0,
  }),
  getters: {
    /** 维护模式（true=维护中，展示全局维护遮罩）；未加载默认非维护 */
    isMaintenanceMode: (state): boolean => state.switches["maintenance_mode"] === true,
    /** 注册功能是否开放；未加载默认开放（后端开关缺失同样默认开启） */
    isRegisterOpen: (state): boolean => state.switches["register_open"] !== false,
    /** 登录功能是否开放；未加载默认开放 */
    isLoginOpen: (state): boolean => state.switches["login_open"] !== false,
    /** 匹配功能是否开放；未加载默认开放 */
    isMatchOpen: (state): boolean => state.switches["match_open"] !== false,
    /** 推荐功能是否开放；未加载默认开放 */
    isRecommendOpen: (state): boolean => state.switches["recommend_open"] !== false,
    /** 发帖功能是否开放；未加载默认开放 */
    isPostPublishOpen: (state): boolean => state.switches["post_publish_open"] !== false,
    /** 反馈功能是否开放；未加载默认开放 */
    isFeedbackOpen: (state): boolean => state.switches["feedback_open"] !== false,
  },
  actions: {
    /**
     * 拉取客户端配置聚合（B6）。
     *
     * <p>成功后覆盖本地状态并写入 TTL 缓存（key="app-config"）；
     * 失败向上抛出，由调用方决定降级策略（默认静默保留旧值）。</p>
     */
    async fetchAppConfig(): Promise<ClientAppConfig> {
      const config = await clientApi.getAppConfig();
      this.switches = config.switches ?? {};
      this.rules = config.rules ?? {};
      this.siteTitle = config.siteTitle ?? "";
      this.loaded = true;
      this.fetchedAt = Date.now();
      setCachedValue(APP_CONFIG_CACHE_KEY, true);
      return config;
    },

    /**
     * 按 TTL 新鲜度窗口判断是否重拉（App.vue onShow 切前台时调用）。
     *
     * <p>新鲜（30s 内已拉取）→ 跳过；过期/未拉取 → 后台刷新，
     * 失败静默（保留旧值），避免弱网下切 Tab 卡顿。</p>
     */
    refreshIfStale(): void {
      if (isCacheFresh(APP_CONFIG_CACHE_KEY, APP_CONFIG_TTL_MS)) {
        return;
      }
      void this.fetchAppConfig().catch((error: unknown) => {
        // 配置拉取失败不影响主流程，仅诊断日志（开发环境输出）
        // eslint-disable-next-line no-console
        console.warn("[AppConfigStore] refreshIfStale 拉取失败，保留旧值:", error);
      });
    },
  },
});

/** TTL 缓存 Key（与 utils/cache-ttl 约定一致，登录切换时随 clearAllCaches 清理） */
const APP_CONFIG_CACHE_KEY = "app-config";

/** 配置新鲜度窗口：30s（管理后台更新后 30s 内客户端生效） */
const APP_CONFIG_TTL_MS = 30_000;
