// ESLint Flat Config（Task 50：代码风格统一）
// 适用于 ESLint 9+ 的 flat config 格式
// 启用关键规则：no-unused-vars / no-console / prefer-const / eqeqeq
//
// 使用方式：
//   pnpm add -D -w eslint @eslint/js typescript-eslint eslint-plugin-vue
//   pnpm exec eslint .
//
// 规则等级说明：
//   "off" / 0   关闭
//   "warn" / 1  警告（不阻塞构建）
//   "error" / 2 错误（构建失败）

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vuePlugin from 'eslint-plugin-vue'

/**
 * Node.js 脚本全局变量（R4-00517：scripts/tools/tests 与根目录工具脚本为
 * CommonJS 诊断工具，flat config 不默认注入 Node 全局；内联定义避免新增依赖）。
 */
const nodeScriptGlobals = {
  process: 'readonly',
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  global: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
}

export default tseslint.config(
  // 全局忽略
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'apps/client/dist/**',
      'apps/client/unpackage/**',
      'apps/admin/dist/**',
      'apps/api/target/**',
      'apps/api/.mvn/**',
      'apps/client/src/services/generated/**',
      '**/*.generated.ts',
      '**/*.generated.js',
      'pnpm-lock.yaml',
      'design-preview/**',
      'design-archive/**',
      'design-system/previews/**',
      '*.min.js',
      '*.min.css',
    ],
  },

  // JS 推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  // Vue 推荐规则（Vue 3）
  ...vuePlugin.configs['flat/recommended'],

  // 项目通用规则
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        // Vue <script lang="ts"> 使用 TypeScript 解析器
        parser: tseslint.parser,
      },
      globals: {
        // uni-app 全局 API
        uni: 'readonly',
        wx: 'readonly',
        // uni-app 类型命名空间（@dcloudio/types 提供的全局类型）
        UniApp: 'readonly',
        // 浏览器全局（H5 端）
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        // 微信小程序全局
        getApp: 'readonly',
        getCurrentPages: 'readonly',
        App: 'readonly',
        Page: 'readonly',
        Component: 'readonly',
      },
    },
    rules: {
      // ========== 关键规则（Task 50 要求） ==========

      // 未使用变量：警告（避免阻塞构建，但提示开发者清理）
      // 关闭 base 规则，由 @typescript-eslint/no-unused-vars 统一处理（TS/JS 文件均由 TS 解析器解析）
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // 禁止 console：错误（除 logger 外）
      // 例外：允许 console.warn / console.error（用于运行时错误日志）
      // 业务代码应使用统一的 logger 服务
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],

      // 强制 const：错误（避免误用 let）
      'prefer-const': 'error',

      // 严格相等：错误（禁止 == / !=，强制使用 === / !==）
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // ========== 补充规则 ==========

      // 禁止 debugger
      'no-debugger': 'error',

      // 禁止 alert / confirm / prompt（小程序不支持）
      'no-alert': 'error',

      // 禁止 var
      'no-var': 'error',

      // 强制使用对象简写
      'object-shorthand': 'warn',

      // 强制模板字符串（优于字符串拼接）
      'prefer-template': 'warn',

      // 禁止重复 import
      'no-duplicate-imports': 'error',

      // Vue 特定规则
      'vue/multi-word-component-names': 'off', // 允许单词组件名（如 index.vue）
      'vue/no-v-html': 'warn', // 避免 v-html XSS 风险
      'vue/require-default-prop': 'off', // TS 类型已约束
      'vue/require-explicit-emits': 'warn', // 显式声明 emits
    },
  },

  // 测试文件特定规则
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.mjs', '**/tests/**'],
    rules: {
      // 测试文件允许 console
      'no-console': 'off',
      // 测试文件允许 any
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // 配置文件特定规则
  {
    files: ['*.config.ts', '*.config.js', '*.config.mjs', 'vite.config.*', 'vitest.config.*'],
    rules: {
      'no-console': 'off',
    },
  },

  // 开发/诊断工具脚本（R4-00517）：scripts/ tools/ tests/ 与根目录游离工具脚本
  // 均为 Node 环境脚本（CommonJS 为主），补充 Node 全局变量与 require 支持，
  // 并允许 console（诊断工具以 console 输出为唯一交互方式）。
  // 产品代码（apps/admin/src、apps/client/src）不在此豁免范围内。
  {
    files: [
      'scripts/**/*.{cjs,js,mjs}',
      'tools/**/*.{cjs,js,mjs}',
      'tests/**/*.{cjs,js,mjs}',
      '*.{cjs,js,mjs}',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...nodeScriptGlobals,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
