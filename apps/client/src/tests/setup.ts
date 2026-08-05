/**
 * Vitest 全局初始化文件
 *
 * 背景：
 * - jsdom 默认使用 cssstyle 库校验 CSS 值，rpx（uni-app 单位）会被判定为非法并丢弃，
 *   导致 Avatar/Card/EducationBadge 等组件测试中 :style 绑定的 width/height/padding
 *   在 DOM 上丢失，断言失败。
 * - mp-weixin 专属 API（如 uni.createInnerAudioContext）在 jsdom 中不存在，需统一桩。
 * - 部分组件（Skeleton/WelcomeBanner 等）在 setup 中使用 useI18n()，若 mount 时未通过
 *   app.use(i18n) 注入实例，会抛出 SyntaxError: Need to install with 'app.use' function。
 *
 * 解决：
 * - 通过 setupFiles 在每个测试文件执行前注入以下环境补丁：
 *   1) 桩 globalThis.uni，覆盖 createInnerAudioContext / showToast / setClipboardData 等常用 API；
 *   2) 遍历 CSSStyleProperties.prototype（jsdom 29+ 实际承载 width/height 等 setter 的原型）
 *      上所有带 setter 的属性，对包含 rpx 的值绕过 cssstyle 校验，通过 impl._setProperty
 *      直接写入内部 #values Map，确保 getAttribute('style') 序列化时能保留 rpx 值。
 *   3) 通过 @vue/test-utils config.global.plugins 注入 i18n 实例，使所有 mount() 默认带上 i18n，
 *      避免 Skeleton/WelcomeBanner 这类未显式 plugins: [i18n] 的测试因 useI18n() 抛错。
 *
 * 注意：本文件仅作用于测试环境，不进入生产构建。
 */

// ------------------------------------------------------------------
// 0. 注入 vue-i18n 全局插件（解决 useI18n() 未注入报错）
// ------------------------------------------------------------------
// 部分测试（如 Skeleton.spec.ts、WelcomeBanner.spec.ts）直接 mount(Component) 而未在
// global.plugins 中传入 i18n，组件内 useI18n() 会抛出：
//   SyntaxError: Need to install with 'app.use' function.
// 这里通过 @vue/test-utils 的 config.global.plugins 默认注入 i18n，使所有 mount 自动带上。
import { config } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import zhCN from "../i18n/locales/zh-CN";
import enUS from "../i18n/locales/en-US";

const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  fallbackLocale: "zh-CN",
  messages: {
    "zh-CN": zhCN,
    "en-US": enUS,
  },
});

// 仅当未配置 plugins 时注入，避免覆盖测试用例内部的精细化 plugin 配置
if (
  !config.global.plugins ||
  !Array.isArray(config.global.plugins) ||
  config.global.plugins.length === 0
) {
  config.global.plugins = [i18n];
} else {
  // 已有 plugins 时也确保 i18n 在其中（去重添加）
  const hasI18n = config.global.plugins.some(
    (p) => p === i18n || (p && typeof p === "object" && "global" in p && p.global === i18n.global),
  );
  if (!hasI18n) {
    config.global.plugins.push(i18n);
  }
}

// ------------------------------------------------------------------
// 1. 桩 globalThis.uni（mp-weixin 运行时 API）
// ------------------------------------------------------------------
type InnerAudioContextStub = {
  src: string;
  onEnded: (cb: () => void) => void;
  onError: (cb: () => void) => void;
  onPlay: (cb: () => void) => void;
  onPause: (cb: () => void) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (position: number) => void;
  destroy: () => void;
};

function createInnerAudioContextStub(): InnerAudioContextStub {
  return {
    src: "",
    onEnded: () => {},
    onError: () => {},
    onPlay: () => {},
    onPause: () => {},
    play: () => {},
    pause: () => {},
    stop: () => {},
    seek: () => {},
    destroy: () => {},
  };
}

const uniStub: Record<string, unknown> = {
  // 内存存储（Phase 4.5：权限持久化测试用）
  ...(() => {
    const store = new Map<string, unknown>();
    return {
      __mockStorage: store,
      setStorageSync: (key: string, data: unknown) => {
        store.set(key, data);
      },
      getStorageSync: (key: string) => {
        return store.has(key) ? store.get(key) : null;
      },
    };
  })(),
  createInnerAudioContext: createInnerAudioContextStub,
  showToast: () => {},
  hideToast: () => {},
  showModal: () => {},
  showLoading: () => {},
  hideLoading: () => {},
  showActionSheet: () => {},
  setClipboardData: (opts: { success?: () => void }) => {
    if (opts && typeof opts.success === "function") {
      opts.success();
    }
  },
  getClipboardData: () => {},
  setStorage: () => {},
  getStorage: () => {},
  removeStorage: () => {},
  removeStorageSync: () => {},
  clearStorage: () => {},
  clearStorageSync: () => {},
  navigateTo: () => {},
  navigateBack: () => {},
  redirectTo: () => {},
  reLaunch: () => {},
  switchTab: () => {},
  getSystemInfoSync: () => ({
    pixelRatio: 2,
    windowWidth: 375,
    windowHeight: 667,
    statusBarHeight: 20,
    platform: "devtools",
  }),
  getSystemInfo: () => {},
  uploadFile: () => {},
  downloadFile: () => {},
  request: () => {},
  createSelectorQuery: () => ({
    select: () => ({ boundingClientRect: () => ({ exec: () => {} }) }),
    selectAll: () => ({ boundingClientRect: () => ({ exec: () => {} }) }),
    exec: () => {},
  }),
  // ShareCard 等组件依赖 uni.share（小程序原生分享），测试环境桩为不支持
  share: (opts: { fail?: (err: Error) => void }) => {
    if (opts && typeof opts.fail === "function") {
      opts.fail(new Error("uni.share is not supported in test environment"));
    }
  },
};

// 仅当未设置时注入桩，避免覆盖测试用例内部的精细化 mock
if (typeof (globalThis as Record<string, unknown>).uni === "undefined") {
  (globalThis as Record<string, unknown>).uni = uniStub;
}

// ------------------------------------------------------------------
// 2. 拦截 CSSStyleDeclaration / CSSStyleProperties：让 jsdom 接受 rpx 单位
// ------------------------------------------------------------------
// jsdom 29+ 的 CSS 属性 setter（如 width/height/padding/borderRadius）位于
// CSSStyleProperties.prototype（CSSStyleDeclaration 的子类）上，会对 rpx 值调用
// parseLength/parsePropertyValue，由于 rpx 不在合法单位列表内，setter 会静默丢弃，
// 导致 getAttribute('style') 序列化时丢失这些属性。
//
// 此处遍历 CSSStyleProperties.prototype 上所有带 setter 的属性，重新定义为：
// - 对包含 rpx 的值，定位到 impl 对象（wrapper[Symbol("impl")]）并调用 _setProperty
//   方法（绕过校验直接写入 #values Map）；
// - 其他值走原始 setter 路径，保留校验。
//
// 这样 Vue 通过 `el.style.width = '80rpx'` 设置时，能正确写入并被 getAttribute('style') 读取。

const globalRef = globalThis as unknown as {
  CSSStyleDeclaration?: { prototype: Record<string, unknown> };
  CSSStyleProperties?: { prototype: Record<string, unknown> };
};

// 收集需要拦截的原型：CSSStyleProperties 优先（含 width/height 等），否则退回到 CSSStyleDeclaration
const prototypesToPatch: Record<string, unknown>[] = [];
if (globalRef.CSSStyleProperties && globalRef.CSSStyleProperties.prototype) {
  prototypesToPatch.push(globalRef.CSSStyleProperties.prototype);
}
if (
  globalRef.CSSStyleDeclaration &&
  globalRef.CSSStyleDeclaration.prototype &&
  !prototypesToPatch.includes(globalRef.CSSStyleDeclaration.prototype)
) {
  prototypesToPatch.push(globalRef.CSSStyleDeclaration.prototype);
}

// 跳过这些已知的方法属性（它们没有 setter 或不应被拦截）
const skipNames = new Set([
  "getPropertyValue",
  "setProperty",
  "removeProperty",
  "item",
  "cssText",
  "length",
  "parentRule",
  "getPropertyPriority",
  "constructor",
  "cssFloat",
]);

// 把 camelCase 转为 kebab-case（如 borderRadius → border-radius）
function toKebab(name: string): string {
  return name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

// 缓存 impl symbol 引用（避免每次查找）
let cachedImplSymbol: symbol | null = null;
function getImplSymbol(): symbol | null {
  if (cachedImplSymbol !== null) return cachedImplSymbol;
  // jsdom 内部使用 Symbol("impl") 注册 impl 对象
  // 通过任意 element.style 的 OwnPropertySymbols 找到该 symbol
  try {
    const dom = globalThis as unknown as { document?: Document };
    if (!dom.document) return null;
    const el = dom.document.createElement("div");
    const symbols = Object.getOwnPropertySymbols(el.style);
    for (const sym of symbols) {
      if (sym.toString() === "Symbol(impl)") {
        cachedImplSymbol = sym;
        return sym;
      }
    }
  } catch (_e) {
    // ignore
  }
  return null;
}

// 调用 impl._setProperty 写入 #values Map（绕过 cssstyle 校验）
function writeRaw(
  target: unknown,
  kebabKey: string,
  value: string,
): void {
  const sym = getImplSymbol();
  if (sym !== null) {
    const impl = (target as Record<symbol, unknown>)[sym] as
      | { _setProperty?: (p: string, v: string, pr?: string) => void }
      | undefined;
    if (impl && typeof impl._setProperty === "function") {
      impl._setProperty(kebabKey, value, "");
      return;
    }
  }
  // Fallback：若 impl 不可用，直接写 _values 表（旧版 jsdom 兼容）
  const legacy = target as { _values?: Record<string, string>; _onChange?: () => void };
  if (!legacy._values) legacy._values = {};
  legacy._values[kebabKey] = value;
  if (typeof legacy._onChange === "function") {
    legacy._onChange();
  }
}

for (const prototype of prototypesToPatch) {
  // 同时拦截公共 setProperty 方法（部分库可能直接调用此方法）
  const originalSetProperty = prototype.setProperty as
    | ((this: unknown, prop: string, value: string, priority?: string) => void)
    | undefined;
  if (typeof originalSetProperty === "function") {
    prototype.setProperty = function setProperty(
      this: unknown,
      prop: string,
      value: string,
      priority?: string,
    ): void {
      if (typeof value === "string" && value.includes("rpx")) {
        writeRaw(this, prop, value);
        return;
      }
      try {
        return originalSetProperty.call(this, prop, value, priority);
      } catch (_e) {
        writeRaw(this, prop, value);
      }
    };
  }

  // 遍历所有带 setter 的属性（如 width/height/padding/borderRadius 等）
  const propNames = Object.getOwnPropertyNames(prototype);
  for (const name of propNames) {
    if (skipNames.has(name)) continue;

    const desc = Object.getOwnPropertyDescriptor(prototype, name);
    if (!desc || typeof desc.set !== "function") continue;

    const originalSet = desc.set;
    const originalGet = desc.get;

    // 重新定义 setter，对 rpx 值放行
    Object.defineProperty(prototype, name, {
      configurable: true,
      enumerable: true,
      get: originalGet,
      set: function set(this: unknown, value: string | number | null | undefined): void {
        if (typeof value === "string" && value.includes("rpx")) {
          writeRaw(this, toKebab(name), value);
          return;
        }
        try {
          originalSet.call(this, value);
        } catch (_e) {
          writeRaw(this, toKebab(name), String(value));
        }
      },
    });
  }
}
