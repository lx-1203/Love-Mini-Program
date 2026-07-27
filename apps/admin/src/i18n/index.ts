/**
 * Admin vue-i18n 实例与导出工具。
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
 * 2. 在非组件场景（如 api http 拦截器、stores、utils）：
 *    import { t } from '@/i18n';
 *    t('errors.network');
 *
 * Task 3.2.2 - Admin 引入 vue-i18n 国际化框架。
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
  locale: "zh-CN",
  fallbackLocale: "zh-CN",
  messages: {
    "zh-CN": zhCN,
    "en-US": enUS,
  },
});

/**
 * 全局翻译函数。
 *
 * 用于非组件场景（api / stores / utils 等）：
 * - 通过 i18n.global.t 调用，与组件内 useI18n().t 行为一致；
 * - 类型为 ComposerTranslation，支持占位符插值（如 t('users.banConfirm', { name: '张三' })）；
 * - 调用方无需关心当前 locale，由 vue-i18n 内部根据 i18n.global.locale.value 解析。
 *
 * 注意：在组件内优先使用 useI18n().t，以获得更准确的类型推导与响应式行为。
 */
export const t = i18n.global.t;

/**
 * 切换当前 locale。
 *
 * 用于在用户切换语言时同步更新 i18n.global.locale.value。
 * 后续可扩展为同步持久化到 localStorage，便于下次启动恢复用户选择。
 *
 * @param locale - 目标 locale，目前支持 'zh-CN' / 'en-US'
 */
export function setLocale(locale: "zh-CN" | "en-US"): void {
  i18n.global.locale.value = locale;
}

/**
 * 获取当前 locale。
 *
 * 用于在工具函数中根据当前 locale 选择不同策略（如时间格式化、数字格式化）。
 *
 * @returns 当前 locale 字符串
 */
export function getLocale(): string {
  return i18n.global.locale.value;
}

export default i18n;
