/**
 * 客户端平台兼容层统一入口（Task 32 / Task 35）。
 *
 * 职责：
 * 1. 微信 JSAPI 弃用警告抑制（patchDeprecatedApi）
 * 2. 统一的触摸事件类型 UniTouchEvent（替代浏览器原生 TouchEvent）
 * 3. 统一的浏览器原生 API 适配层（document/window/localStorage 等）
 * 4. 平台判断与降级逻辑封装（避免业务代码散落 #ifdef 条件编译）
 *
 * 使用原则：
 * - 业务代码禁止直接引用 window/document/TouchEvent 等浏览器原生对象
 * - 必须通过本文件导出的类型或函数访问，保证 mp-weixin/H5 双端兼容
 */

/**
 * uni-app 触摸事件类型（与平台无关的统一抽象）。
 *
 * 浏览器原生 `TouchEvent` 类型在 mp-weixin 环境下不存在；uni-app 触摸事件
 * 通过 wxml 事件参数传递，结构与原生 TouchEvent 一致但 `@dcloudio/types`
 * 未提供具体类型定义。本类型提取业务代码所需的 touches/changedTouches 字段，
 * 避免依赖 DOM lib，同时为 H5 端的浏览器原生 TouchEvent 提供结构兼容。
 *
 * 设计要点：
 * - `touches`/`changedTouches` 使用 `ArrayLike<UniTouchPoint>` 而非 `UniTouchPoint[]`，
 *   与 DOM `TouchList` 结构对齐，保证 Vue 模板 `@touchstart` 等事件处理器签名
 *   既能接收 H5 端原生 `TouchEvent`，也能接收 mp-weixin 端的统一事件对象。
 * - 业务代码通过 `e.touches[0]` 索引访问触点，无需数组方法（pop/push 等）。
 */
export interface UniTouchPoint {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  identifier: number;
}

export interface UniTouchEvent {
  // 使用 ArrayLike 与 DOM TouchList 结构对齐，避免 Vue 模板类型校验失败
  touches: ArrayLike<UniTouchPoint>;
  changedTouches: ArrayLike<UniTouchPoint>;
  timeStamp: number;
  // 兼容 mp-weixin 事件对象的 detail/target/currentTarget 等字段
  // 注：H5 端原生 Event.detail 为 number、target 为 EventTarget | null，
  // 使用 unknown 兼容两端；业务代码访问 dataset 时需自行收敛类型
  detail?: unknown;
  target?: unknown;
  currentTarget?: unknown;
  // H5 端原生事件含 preventDefault/stopPropagation，mp-weixin 端可能缺失
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

/**
 * 平台标识（构建期常量，由 uni-app 条件编译注入）。
 *
 * 设计目的：让业务代码通过 isPlatform('mp-weixin') 等函数判断平台，
 * 替代散落的 `#ifdef` 条件编译块，便于集中维护与单元测试 mock。
 */
export type UniPlatform = "mp-weixin" | "h5" | "app" | "unknown";

/**
 * 获取当前运行平台（运行时判断）。
 *
 * 优先级：
 * 1. uni.getAppBaseInfo().appPlatform（mp-weixin 1.6.0+）
 * 2. uni.getSystemInfoSync().uniPlatform（兼容旧版本）
 * 3. typeof window 判断 H5
 *
 * 注意：本函数运行时判断，无法被 webpack/vite 摇树优化；
 * 静态平台判断仍应使用 `#ifdef` 条件编译，本函数仅用于需要运行时动态判断的场景。
 */
export function getPlatform(): UniPlatform {
  // #ifdef MP-WEIXIN
  return "mp-weixin";
  // #endif
  // #ifdef H5
  return "h5";
  // #endif
  // #ifdef APP-PLUS
  return "app";
  // #endif
  // #ifndef MP-WEIXIN || H5 || APP-PLUS
  return "unknown";
  // #endif
}

/**
 * 判断当前是否为指定平台。
 *
 * @param platform 目标平台
 */
export function isPlatform(platform: UniPlatform): boolean {
  return getPlatform() === platform;
}

/**
 * 是否为微信小程序平台。
 */
export function isMpWeixin(): boolean {
  return isPlatform("mp-weixin");
}

/**
 * 是否为 H5 平台。
 */
export function isH5(): boolean {
  return isPlatform("h5");
}

/**
 * 安全获取 H5 端 window 对象（mp-weixin 端返回 undefined）。
 *
 * 业务代码应通过本函数访问 window，避免在 mp-weixin 环境下直接引用导致运行时错误。
 * 注意：调用方必须自行判断返回值为 undefined 时降级处理。
 */
export function safeGetWindow(): Window | undefined {
  // #ifdef H5
  return typeof window !== "undefined" ? window : undefined;
  // #endif
  // #ifndef H5
  return undefined;
  // #endif
}

/**
 * 安全获取 H5 端 document 对象（mp-weixin 端返回 undefined）。
 */
export function safeGetDocument(): Document | undefined {
  // #ifdef H5
  return typeof document !== "undefined" ? document : undefined;
  // #endif
  // #ifndef H5
  return undefined;
  // #endif
}

/**
 * 安全 localStorage 适配（mp-weixin 端降级为 uni.storage 同步 API 包装）。
 *
 * 设计目的：业务代码需要持久化少量数据时，统一通过本函数访问，
 * 自动选择 H5 localStorage 或 mp-weixin uni.storage。
 *
 * 注意：mp-weixin 端 storage 为异步 API，本函数仅提供同步访问能力，
 * 适用于 get/set/remove 单 key 场景；批量或大容量数据请直接调用 uni.getStorage。
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    // #ifdef H5
    const doc = safeGetDocument();
    if (doc) {
      try {
        return doc.defaultView?.localStorage?.getItem(key) ?? null;
      } catch (_e) {
        return null;
      }
    }
    return null;
    // #endif
    // #ifndef H5
    try {
      const value = uni.getStorageSync(key);
      return value === "" ? null : String(value);
    } catch (_e) {
      return null;
    }
    // #endif
  },
  setItem(key: string, value: string): void {
    // #ifdef H5
    const doc = safeGetDocument();
    if (doc) {
      try {
        doc.defaultView?.localStorage?.setItem(key, value);
      } catch (_e) {
        // ignore quota exceeded
      }
    }
    return;
    // #endif
    // #ifndef H5
    try {
      uni.setStorageSync(key, value);
    } catch (_e) {
      // ignore
    }
    // #endif
  },
  removeItem(key: string): void {
    // #ifdef H5
    const doc = safeGetDocument();
    if (doc) {
      try {
        doc.defaultView?.localStorage?.removeItem(key);
      } catch (_e) {
        // ignore
      }
    }
    return;
    // #endif
    // #ifndef H5
    try {
      uni.removeStorageSync(key);
    } catch (_e) {
      // ignore
    }
    // #endif
  },
};

/**
 * Task 35：获取开发环境 API 基础地址（平台降级）。
 *
 * 设计目的：替代散落在 `config/env.ts` 与 `services/env.ts` 中的
 * `#ifdef H5 / #ifndef H5` 条件编译块，集中维护 dev 模式下的协议降级策略。
 *
 * 规则：
 * - H5 端：返回 http://127.0.0.1:8080/api（本地后端，允许 http）
 * - mp-weixin / 其他端：返回 https://127.0.0.1:8080/api（合法域名强制 https）
 *
 * 注意：本函数仅用于 dev 模式回退，生产环境必须显式配置 VITE_API_BASE_URL。
 */
export function getDevApiBaseUrl(): string {
  // #ifdef H5
  return "http://127.0.0.1:8080/api";
  // #endif
  // #ifndef H5
  // 非 H5 环境（mp-weixin 等）dev 模式同样要求 https，避免运行时违规
  return "https://127.0.0.1:8080/api";
  // #endif
}

/**
 * Task 35：当前平台是否支持 CSS backdrop-filter 毛玻璃效果。
 *
 * 设计目的：替代业务组件中散落的 backdrop-filter 条件编译判断。
 * - H5 端：现代浏览器普遍支持
 * - mp-weixin 端：基础库部分版本支持，但稳定性差，统一返回 false 走降级
 *
 * 注意：本函数返回 false 时，调用方应使用高不透明度（0.96+）实色背景降级。
 */
export function supportsBackdropFilter(): boolean {
  // #ifdef H5
  return true;
  // #endif
  // #ifndef H5
  return false;
  // #endif
}

/**
 * Task 35：安全获取当前页面路径（替代散落的 getCurrentPages() 调用）。
 *
 * 设计目的：mp-weixin 端通过 getCurrentPages() 获取页面实例，
 * H5 端通过 window.location.pathname 获取，逻辑分散易错。
 *
 * @returns 当前页面路径（如 `/pages/home/index`），获取失败返回空字符串
 */
export function getCurrentPagePath(): string {
  try {
    // #ifdef MP-WEIXIN
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    return current ? `/${current.route}` : "";
    // #endif
    // #ifdef H5
    // 直接 typeof 检查替代 safeGetWindow() 返回值窄化，规避 vue-tsc 严格模式下
    // `Window | undefined` 在 try 块内 `if (win)` 不正确窄化的问题
    if (typeof window !== "undefined") {
      return window.location.pathname;
    }
    return "";
    // #endif
    // #ifndef MP-WEIXIN || H5
    return "";
    // #endif
  } catch (_e) {
    return "";
  }
}

/**
 * Task 35：安全获取系统信息（替代散落的 uni.getSystemInfoSync / wx.getSystemInfoSync 调用）。
 *
 * 设计目的：封装平台差异，统一返回业务所需的 statusBarHeight / windowWidth 等字段。
 * 异常时返回空对象，调用方需自行兜底。
 */
export function safeGetSystemInfo(): Record<string, unknown> {
  try {
    // #ifdef MP-WEIXIN
    return uni.getSystemInfoSync() as unknown as Record<string, unknown>;
    // #endif
    // #ifndef MP-WEIXIN
    // 直接 typeof 检查替代 safeGetWindow() 返回值窄化，规避 vue-tsc 严格模式下
    // `Window | undefined` 在 try 块内 `if (!win) return` 后仍被识别为可空的问题
    if (typeof window === "undefined") return {};
    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      platform: "h5",
    };
    // #endif
  } catch (_e) {
    return {};
  }
}

/**
 * Task 35：当前平台是否支持 localStorage 同步 API。
 *
 * 用于业务代码判断是否可直接使用 safeLocalStorage 的同步语义，
 * 还是必须降级为异步 uni.storage 调用（mp-weixin 端 sync API 实为同步包装）。
 */
export function supportsSyncStorage(): boolean {
  // #ifdef H5
  return true;
  // #endif
  // #ifndef H5
  // mp-weixin 端 uni.getStorageSync 为同步 API，但底层可能阻塞主线程
  // 大数据量场景建议使用异步 uni.getStorage，本函数仅标识能力
  return true;
  // #endif
}

/**
 * Task 35：当前平台是否支持 GSAP 等 ESM 库的运行时 import。
 *
 * - H5 端：浏览器原生支持 ESM 动态 import
 * - mp-weixin 端：构建期已打包，运行时不应再动态 import 第三方库
 */
export function supportsRuntimeEsmImport(): boolean {
  // #ifdef H5
  return true;
  // #endif
  // #ifndef H5
  return false;
  // #endif
}

/**
 * Task 35：当前平台是否支持 uni.vibrateShort 短振动反馈。
 *
 * - H5 / APP-PLUS / MP-WEIXIN 端：支持 uni.vibrateShort（H5 端 type 参数无效但不抛错）
 * - 其他平台：不支持，调用应静默跳过
 *
 * 用于业务代码（utils/haptic.ts）替代散落的 `#ifdef H5 || APP-PLUS || MP-WEIXIN` 块。
 */
export function supportsHapticFeedback(): boolean {
  // #ifdef H5 || APP-PLUS || MP-WEIXIN
  return true;
  // #endif
  // #ifndef H5 || APP-PLUS || MP-WEIXIN
  return false;
  // #endif
}

/**
 * 小程序胶囊按钮（右上角菜单）位置信息。
 *
 * 与 wx.getMenuButtonBoundingClientRect 返回结构一致，字段单位为 px。
 * mp-weixin 端由 uni.getMenuButtonBoundingClientRect 提供；其他平台无胶囊，返回 null。
 */
export interface MenuButtonRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/**
 * Task 36：获取小程序右上角胶囊按钮位置（mp-weixin 独有能力，其他平台返回 null）。
 *
 * 设计目的：自定义导航（navigationStyle: custom）下，页面右上角元素（标题计数、
 * 筛选标签等）可能被胶囊遮挡，业务代码通过本函数测量胶囊右缘以预留安全距离。
 * 异常（低版本基础库无此 API / 非小程序平台）时返回 null，调用方自行兜底。
 *
 * @returns 胶囊矩形信息（px）或 null
 */
export function getMenuButtonRect(): MenuButtonRect | null {
  // #ifdef MP-WEIXIN
  try {
    const rect = uni.getMenuButtonBoundingClientRect();
    if (rect && typeof rect.right === "number" && rect.right > 0) {
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      };
    }
  } catch (_e) {
    // 低版本基础库无此 API，返回 null 由调用方走 CSS 兜底
  }
  return null;
  // #endif
  // #ifndef MP-WEIXIN
  return null;
  // #endif
}

/**
 * Task 36：安全获取窗口宽度（px）。
 *
 * 基于 safeGetSystemInfo() 统一取值，H5 端回退 window.innerWidth。
 *
 * @returns 窗口宽度（px），获取失败时返回 375（常规设计稿宽度兜底）
 */
export function getWindowWidth(): number {
  const info = safeGetSystemInfo();
  const width = info.windowWidth;
  if (typeof width === "number" && width > 0) {
    return width;
  }
  return 375;
}

/**
 * Task 35：获取 mp-weixin 自定义 TabBar 实例（其他平台返回 null）。
 *
 * mp-weixin 自定义 TabBar 模式下，页面实例通过 getTabBar() 暴露 TabBar 组件实例，
 * 调用 setData({ selected: N }) 同步选中状态。H5 / APP 端无此机制，统一返回 null。
 *
 * 用于 composables/useTabBar.ts 替代散落的 `#ifdef MP-WEIXIN` 块。
 *
 * @returns TabBar 实例（含 setData 方法）或 null
 */
export function getTabBarInstance(): { setData?: (data: { selected: number }) => void } | null {
  // #ifdef MP-WEIXIN
  try {
    interface PageWithTabBar {
      getTabBar?: () => { setData?: (data: { selected: number }) => void } | null;
    }
    const pages = getCurrentPages();
    const page = pages[pages.length - 1] as PageWithTabBar | undefined;
    return page?.getTabBar?.() ?? null;
  } catch (_e) {
    return null;
  }
  // #endif
  // #ifndef MP-WEIXIN
  return null;
  // #endif
}

// ============================================================================
// 微信JSAPI兼容层（原 patchDeprecatedApi 实现，保持向后兼容）
// ============================================================================

// Phase R1：installAbortControllerPolyfill 必须在 MP-WEIXIN 条件块之外，
// 以便 H5 / APP 端也能 import 该函数（内部幂等：已有原生实现则跳过）。

/**
 * 全局 AbortController polyfill（Phase R1：修复微信小程序运行时 ReferenceError）。
 *
 * 背景：微信小程序基础库（lib 3.15.2 及以下）的 WAService 运行环境**未提供**全局
 * `AbortController`/`AbortSignal`，而项目大量 store/service 直接执行
 * `new AbortController()`（超时控制、请求竞态取消），在 mp-weixin 下会抛出
 * `ReferenceError: AbortController is not defined`，导致 fetchPosts / fetchStatus /
 * fetchCards 等请求全部 reject（表现为 uni.onUnhandledRejection 上报）。
 *
 * 方案：在应用启动最早阶段（createApp 之前）调用本函数，向全局注入最小实现：
 * - 仅实现 abort() 与 signal.aborted / addEventListener / removeEventListener /
 *   dispatchEvent，满足项目内所有使用点（请求取消 + 竞态保护）；
 * - 若环境已存在原生实现（H5 / 高版本基础库），则跳过注入（幂等）。
 *
 * 注意：注入目标为 globalThis（小程序逻辑层与 H5 均指向全局对象），
 * 必须在任何 store 首次实例化前执行，故由 main.ts 的 createApp() 最先调用。
 */
export function installAbortControllerPolyfill(): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.AbortController !== "undefined") {
    // 原生可用（H5 / 新基础库），无需注入
    return;
  }

  const kAborted = "__aborted";

  class PolyfillAbortSignal {
    aborted = false;
    onabort: ((this: AbortSignal, ev: Event) => unknown) | null = null;
    private listeners = new Set<() => void>();

    addEventListener(type: string, listener: () => void): void {
      if (type === "abort") {
        this.listeners.add(listener);
      }
    }

    removeEventListener(type: string, listener: () => void): void {
      if (type === "abort") {
        this.listeners.delete(listener);
      }
    }

    dispatchEvent(): boolean {
      // 触发 abort 监听器（Event 对象在小程序环境可用性有限，直接回调）
      this.listeners.forEach((fn) => {
        try {
          fn();
        } catch (_e) {
          // 单个监听器异常不影响其余监听器与主流程
        }
      });
      if (typeof this.onabort === "function") {
        try {
          // 加固（security_review 复审）：部分小程序环境无全局 Event 构造器，
          // 此处降级为传简单事件对象，避免 new Event 抛错导致 onabort 不触发。
          const event =
            typeof Event !== "undefined"
              ? new Event("abort")
              : ({ type: "abort" } as Event);
          this.onabort.call(this as unknown as AbortSignal, event);
        } catch (_e) {
          // 忽略监听器内部异常
        }
      }
      return true;
    }
  }

  class PolyfillAbortController {
    signal = new PolyfillAbortSignal();

    abort(): void {
      const sig = this.signal as unknown as Record<string, unknown>;
      if (sig[kAborted]) {
        return;
      }
      sig[kAborted] = true;
      (sig as unknown as { aborted: boolean }).aborted = true;
      (sig as unknown as PolyfillAbortSignal).dispatchEvent();
    }
  }

  Object.defineProperty(g, "AbortController", {
    configurable: true,
    writable: false,
    value: PolyfillAbortController,
  });
  Object.defineProperty(g, "AbortSignal", {
    configurable: true,
    writable: false,
    value: PolyfillAbortSignal,
  });
}

/**
 * 全局 URLSearchParams polyfill（收尾轮：mp-weixin 基础库无原生 URLSearchParams/URL，
 * 而 stores/village/api.ts、stores/profile.ts、pages/feedback/history.vue 均直接使用，
 * 会导致运行时 ReferenceError）。
 *
 * 实现覆盖本项目实际使用的 API：构造（字符串/记录）、append/get/set/has/delete、
 * toString（encodeURIComponent）、forEach/entries。其余 API 保持 undefined 语义。
 */
export function installUrlSearchParamsPolyfill(): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.URLSearchParams !== "undefined") {
    // 原生可用（H5 / 新基础库），无需注入
    return;
  }

  class PolyfillURLSearchParams {
    private pairs: Array<[string, string]> = [];

    constructor(
      init?:
        | string
        | Record<string, string>
        | Array<[string, string]>
        | PolyfillURLSearchParams
    ) {
      if (!init) return;
      if (typeof init === "string") {
        const query = init.startsWith("?") ? init.slice(1) : init;
        if (!query) return;
        query.split("&").forEach((pair) => {
          if (!pair) return;
          const idx = pair.indexOf("=");
          // review 修复：解码兜底——非法编码（如 a=%）原生 URLSearchParams 宽容保留原样，
          // polyfill 需等价处理，避免 decodeURIComponent 抛 URIError
          const safeDecode = (s: string): string => {
            try {
              return decodeURIComponent(s);
            } catch (_e) {
              return s;
            }
          };
          if (idx === -1) {
            this.pairs.push([safeDecode(pair), ""]);
          } else {
            this.pairs.push([safeDecode(pair.slice(0, idx)), safeDecode(pair.slice(idx + 1))]);
          }
        });
      } else if (Array.isArray(init)) {
        init.forEach(([k, v]) => this.pairs.push([String(k), String(v)]));
      } else if (init instanceof PolyfillURLSearchParams) {
        this.pairs = init.pairs.map(([k, v]) => [k, v]);
      } else {
        Object.keys(init).forEach((k) => this.pairs.push([k, String(init[k])]));
      }
    }

    append(key: string, value: string): void {
      this.pairs.push([String(key), String(value)]);
    }

    get(key: string): string | null {
      const found = this.pairs.find(([k]) => k === key);
      return found ? found[1] : null;
    }

    set(key: string, value: string): void {
      this.delete(key);
      this.append(key, value);
    }

    has(key: string): boolean {
      return this.pairs.some(([k]) => k === key);
    }

    delete(key: string): void {
      this.pairs = this.pairs.filter(([k]) => k !== key);
    }

    toString(): string {
      return this.pairs
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
        )
        .join("&");
    }

    forEach(cb: (value: string, key: string) => void): void {
      this.pairs.forEach(([k, v]) => cb(v, k));
    }

    entries(): Array<[string, string]> {
      return this.pairs.map(([k, v]) => [k, v]);
    }
  }

  Object.defineProperty(g, "URLSearchParams", {
    configurable: true,
    writable: false,
    value: PolyfillURLSearchParams,
  });
}

// #ifdef MP-WEIXIN
// 仅在微信小程序平台生效（以下为微信 JSAPI 兼容层）

/**
 * 微信小程序全局对象类型声明（条件编译下 TS 无法自动识别 wx）。
 *
 * 使用 Record<string, unknown> 替代 Record<string, any>，保留运行时访问能力的同时
 * 强制调用方在使用具体字段前自行收敛类型，避免隐式 any 污染。
 */
declare const wx: Record<string, unknown>;

export function patchDeprecatedApi(): void {
  if (typeof wx === "undefined") return;

  // wx 已声明为 Record<string, unknown>，直接复用避免重复断言
  const wxAny = wx;

  // 保存原始引用，用于真正的 fallback
  const origGetSystemInfoSync = wxAny.getSystemInfoSync as (() => Record<string, unknown>) | undefined;

  // 构造一个使用新 API 的兼容实现
  function patchedGetSystemInfoSync(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    try {
      // 1. 基础信息
      const appBaseInfo = typeof wx.getAppBaseInfo === "function"
        ? wx.getAppBaseInfo()
        : {};
      Object.assign(result, appBaseInfo);

      // 2. 设备信息（覆盖同名属性）
      const deviceInfo = typeof wx.getDeviceInfo === "function"
        ? wx.getDeviceInfo()
        : {};
      Object.assign(result, deviceInfo);

      // 3. 窗口信息
      const windowInfo = typeof wx.getWindowInfo === "function"
        ? wx.getWindowInfo()
        : {};
      Object.assign(result, windowInfo);

      // 4. 系统设置
      const systemSetting = typeof wx.getSystemSetting === "function"
        ? wx.getSystemSetting()
        : {};
      Object.assign(result, systemSetting);

      // 5. 授权设置
      const authSetting = typeof wx.getAppAuthorizeSetting === "function"
        ? wx.getAppAuthorizeSetting()
        : {};
      Object.assign(result, authSetting);
    } catch (_e) {
      // 如果新 API 调用失败，回退到原始 API
      if (origGetSystemInfoSync) {
        try {
          return origGetSystemInfoSync();
        } catch (_ex) {
          // 忽略
        }
      }
    }

    return result;
  }

  // 替换 getSystemInfoSync 实现
  Object.defineProperty(wxAny, "getSystemInfoSync", {
    configurable: true,
    writable: false,
    value: patchedGetSystemInfoSync,
  });

  // 同时替换 getSystemInfo（异步版本）
  const origGetSystemInfo = wxAny.getSystemInfo as ((opts?: Record<string, unknown>) => void) | undefined;
  function patchedGetSystemInfo(opts?: Record<string, unknown>): void {
    const successCallback = opts && typeof opts === "object" ? (opts as Record<string, unknown>).success : undefined;

    try {
      const result = patchedGetSystemInfoSync();
      if (typeof successCallback === "function") {
        (successCallback as (res: Record<string, unknown>) => void)({ ...result, errMsg: "getSystemInfo:ok" });
      }
      return;
    } catch (_e) {
      // 回退
      if (origGetSystemInfo) {
        origGetSystemInfo(opts);
      }
    }
  }

  Object.defineProperty(wxAny, "getSystemInfo", {
    configurable: true,
    writable: false,
    value: patchedGetSystemInfo,
  });
}
// #endif
