import type { StorybookConfig } from '@storybook/vue3-vite';

/**
 * Storybook 配置（P9 / Task 9.1.2）。
 *
 * 项目栈：uni-app + Vue 3 + TypeScript + Vite。
 * Storybook 框架：@storybook/vue3-vite。
 *
 * 启动：pnpm --filter @campus-love/client storybook
 * 构建：pnpm --filter @campus-love/client build-storybook
 */
const config: StorybookConfig = {
  stories: [
    '../src/components/**/*.stories.@(ts|tsx|js|jsx)',
    '../src/components/**/*.mdx',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
};

export default config;
