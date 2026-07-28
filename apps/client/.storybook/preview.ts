import type { Preview } from '@storybook/vue3';
import { setup } from '@storybook/vue3';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';

// 注册 Pinia：组件内 useStore 调用所需的根状态树
setup((app) => {
  app.use(createPinia());
  app.use(
    createI18n({
      legacy: false,
      locale: 'zh-CN',
      fallbackLocale: 'zh-CN',
      messages: {
        'zh-CN': {
          common: {
            confirm: '确认',
            cancel: '取消',
            loading: '加载中…',
          },
        },
      },
    }),
  );
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // 视口预设：覆盖移动端、平板、桌面三种主要尺寸
    viewport: {
      viewports: {
        mobile: { name: 'Mobile (390×844)', styles: { width: '390px', height: '844px' } },
        tablet: { name: 'Tablet (768×1024)', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop (1280×800)', styles: { width: '1280px', height: '800px' } },
      },
      defaultViewport: 'mobile',
    },
    // 主题预设：浅色 / 暗色 双主题
    backgrounds: {
      values: [
        { name: 'light', value: '#f7f7fa' },
        { name: 'dark', value: '#0f1115' },
        { name: 'brand', value: '#ff6b9d' },
      ],
      default: 'light',
    },
    // a11y 配置：自动注入 axe-core 检查
    a11y: {
      config: {
        rules: [
          // 自定义规则：图片必须 alt（覆盖 P6 a11y 规范）
          { id: 'image-alt', enabled: true },
          // 颜色对比度 ≥ 4.5:1
          { id: 'color-contrast', enabled: true },
        ],
      },
      options: {
        checks: {},
      },
    },
    // Chromatic 视觉回归配置
    chromatic: {
      delay: 300, // 动画稳定后再截图
      viewports: [390, 768, 1280],
      pauseAnimationAtEnd: true,
      diffThreshold: 0.1, // 容差 0.1，避免反锯齿差异误报
    },
  },
  // 全局装饰器：为所有 stories 注入 uni-app 兼容层
  decorators: [
    (story) => ({
      components: { story },
      template: '<div style="padding: 16px; background: var(--bg-base, #f7f7fa);"><story /></div>',
    }),
  ],
};

export default preview;
