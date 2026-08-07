/**
 * vue-i18n 实例与导出工具。
 *
 * 设计说明：
 * - 使用 Composition API 模式（legacy: false），便于在 <script setup> 中通过 useI18n() 获取 t 函数；
 * - 默认 locale 为 zh-CN，回退 locale 同样为 zh-CN，避免缺失 key 时显示 raw key；
 * - 同时导出 i18n 实例（供 main.ts 中 app.use(i18n)）与全局 t 函数（供非组件场景使用）。
 *
 * 使用方式：
 * 1. 在组件中：
 *    import { useI18n } from 'vue-i18n';
 *    const { t } = useI18n();
 *    t('common.confirm');
 * 2. 在非组件场景（如 services、stores、utils）：
 *    import { t } from '@/i18n';
 *    t('common.networkError');
 */
import { createI18n } from "vue-i18n";
import zhCN from "./locales/zh-CN";
import enUS from "./locales/en-US";

/**
 * 创建 vue-i18n 实例。
 *
 * 关键参数说明：
 * - legacy: false —— 启用 Composition API 模式（vue-i18n@9 推荐）；
 * - locale: 'zh-CN' —— 默认语言为简体中文；
 * - fallbackLocale: 'zh-CN' —— 找不到翻译时回退到简体中文；
 * - messages —— 语言资源映射，结构与 locales/zh-CN.ts、locales/en-US.ts 一致。
 */
export const i18n = createI18n({
  legacy: false,
  // globalInjection: true —— 将 $t/$tc 等注入所有组件实例。
  // 修复（mp-weixin 2026-08-08）：legacy:false 默认不注入实例方法，
  // 模板中使用 `$t('...')` 的组件渲染时报 `TypeError: a.$t is not a function`
  // （报错栈位于组件 attached → 模板渲染函数）。
  // 开启后模板 $t 可用，且内部仍走 global composer 的 t（已被包装为
  // wrappedT，兜底插值逻辑不受影响）。
  globalInjection: true,
  locale: "zh-CN",
  fallbackLocale: "zh-CN",
  messages: {
    "zh-CN": zhCN,
    "en-US": enUS,
  },
});

/**
 * mp-weixin 插值兜底（2026-08-07 修复）。
 *
 * 背景：小程序构建中 vue-i18n 的运行时 message compiler 被替换为桩函数
 * （`messageCompiler: (msg) => (ctx) => ctx.normalize([msg])`），
 * `{n}` / `{total}` 等占位符不会被替换，界面上会直接显示
 * 「第 {n}/{total} 步」这类原始文本。
 *
 * 方案：在 t() 返回结果上按调用方传入的参数做二次插值——
 * 具名参数 `{n}` 匹配 `{(\w+)}` 并替换为对应值；列表参数（数组，
 * vue-i18n 的 `{0}` 语法）同样适用（数组索引经字符串键访问）。
 * 未命中参数的占位符原样保留（与 vue-i18n 默认行为一致）。
 *
 * @param raw  vue-i18n 翻译后的原始字符串（可能残留 {param} 占位符）
 * @param params t() 的最后一个参数（具名对象或列表数组）
 * @returns 插值后的字符串
 */
function interpolateResidual(raw: string, params?: unknown): string {
  if (!raw || params == null || typeof params !== "object") {
    return raw;
  }
  const p = params as Record<string | number, unknown>;
  return raw.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = p[key];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * 包装后的全局翻译函数。
 *
 * 除了支持 vue-i18n 原生插值外，额外对小程序端被剥离的运行时
 * 插值做兜底（见 {@link interpolateResidual}）。同时覆盖组件内
 * `useI18n().t`（组件无本地 scope 时返回的正是 global composer，
 * 其 t 被替换为本包装函数）。
 */
// ComposerTranslation 的类型签名较复杂（重载 + 泛型），
// 包装层用宽松签名收窄，不改变对外类型（导出时仍以原类型对外）。
type LooseTranslate = (key: string, ...args: unknown[]) => string;
const composerT = i18n.global.t as unknown as LooseTranslate;
const wrappedT: LooseTranslate = (key, ...args) => {
  const params = args.length > 0 ? args[args.length - 1] : undefined;
  return interpolateResidual(composerT(key, ...args), params);
};

// 替换 global composer 的 t，使组件内 useI18n().t 同样获得兜底插值
i18n.global.t = wrappedT as unknown as typeof i18n.global.t;

/**
 * 全局翻译函数。
 *
 * 用于非组件场景（services / stores / utils 等）：
 * - 通过 i18n.global.t 调用，与组件内 useI18n().t 行为一致；
 * - 类型为 ComposerTranslation，支持占位符插值（如 t('likes.minutesAgo', { n: 5 })）；
 * - 调用方无需关心当前 locale，由 vue-i18n 内部根据 i18n.global.locale.value 解析。
 *
 * 注意：在组件内优先使用 useI18n().t，以获得更准确的类型推导与响应式行为。
 */
export const t = wrappedT;

export default i18n;
