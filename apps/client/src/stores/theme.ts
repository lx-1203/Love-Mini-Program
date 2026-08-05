/**
 * 深色模式状态（收尾轮接线：tokens.scss 已提供 [data-theme="dark"] 手动覆盖，
 * 本 store 负责状态持久化与 H5 端 DOM 属性切换）。
 *
 * 平台说明：
 * - H5：完整支持手动切换（<html data-theme="dark">，优先级高于系统偏好）；
 * - mp-weixin：原生支持跟随系统（@media prefers-color-scheme）；
 *   手动深色在 mp 端无法通过 JS 设置 page 属性，降级为系统偏好（文档披露）。
 */
import { defineStore } from "pinia";

export type ThemeMode = "auto" | "dark" | "light";

const THEME_STORAGE_KEY = "campus-love:theme-mode";

function readStoredMode(): ThemeMode {
  try {
    const raw = uni.getStorageSync(THEME_STORAGE_KEY) as ThemeMode | undefined;
    if (raw === "dark" || raw === "light" || raw === "auto") return raw;
  } catch (_e) {
    // 读取失败按 auto
  }
  return "auto";
}

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: readStoredMode() as ThemeMode,
  }),

  getters: {
    /** 是否深色（auto 时按系统偏好；H5 通过 matchMedia 判断，mp 由 CSS 媒体查询处理） */
    isDark(): boolean {
      if (this.mode === "dark") return true;
      if (this.mode === "light") return false;
      // auto：跟随系统
      try {
        if (typeof window !== "undefined" && window.matchMedia) {
          return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
      } catch (_e) {
        // 忽略
      }
      return false;
    },
  },

  actions: {
    /** 设置主题模式并持久化（H5 端同步切换 html[data-theme]） */
    setMode(mode: ThemeMode): void {
      this.mode = mode;
      try {
        uni.setStorageSync(THEME_STORAGE_KEY, mode);
      } catch (_e) {
        // 存储失败静默
      }
      applyThemeAttribute(this.mode);
    },

    /** 初始化时应用一次主题属性（main.ts 调用） */
    init(): void {
      applyThemeAttribute(this.mode);
    },
  },
});

/** H5 端切换 <html data-theme="dark">；mp-weixin 端由 CSS 媒体查询接管（手动降级） */
function applyThemeAttribute(mode: ThemeMode): void {
  // #ifdef H5
  const root = document.documentElement;
  if (mode === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (mode === "light") {
    // 显式标记 light：media 深色规则以 :not([data-theme="light"]) 排除，保证手动浅色优先
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  // #endif
}
