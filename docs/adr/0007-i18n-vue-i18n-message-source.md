# ADR-0007: 国际化方案 - vue-i18n + Spring MessageSource

- **Status**: Accepted
- **Date**: 2026-07-26
- **Deciders**: 前端组、后端组、产品组
- **Tags**: i18n, frontend, backend, internationalization

---

## Context and Problem Statement

校园恋爱小程序商业化发布后，未来可能扩展到：

- 海外校园市场（东南亚、北美华人留学生）
- 多语言支持（中文简体、中文繁体、英文、日文）
- 文化差异适配（日期格式、货币、颜色禁忌）

早期版本（P3 前）存在大量硬编码中文：

- 客户端：500+ 处硬编码中文字符串
- Admin 后台：8 个视图均直接写中文
- 后端：异常消息、日志均为中文

这导致：

- 无法快速切换语言
- 海外市场不可用
- 文案修改需改代码、发版

需要引入统一的国际化方案。

---

## Decision Drivers

- **海外扩展**：未来 1-2 年可能进入东南亚/北美市场
- **维护便捷**：文案修改无需发版
- **运行时切换**：用户可在设置中切换语言
- **跨端一致**：客户端、Admin、后端文案统一管理
- **SEO 友好**（H5）：搜索引擎可索引多语言内容

---

## Considered Options

### 方案 A：vue-i18n（前端）+ Spring MessageSource（后端）（**选定**）

- 客户端：vue-i18n 9.x + `locales/zh-CN.ts` + `locales/en-US.ts`
- Admin：vue-i18n 9.x + `locales/zh-CN.ts` + `locales/en-US.ts`
- 后端：Spring MessageSource + `messages_zh_CN.properties` + `messages_en_US.properties`
- 法律文本：从 CMS 拉取，便于法务修改

### 方案 B：自研 i18n 方案

- 优势：完全可控
- 劣势：重复造轮子，无社区支持

### 方案 C：i18next（前端）+ Gettext（后端）

- 优势：成熟方案
- 劣势：与 Vue/Spring 集成不友好

### 方案 D：服务端渲染多语言（SSR）

- 优势：SEO 最佳
- 劣势：当前架构是 CSR，改造工作量大

---

## Pros and Cons of the Options

### 方案 A（vue-i18n + MessageSource）

| 优点 | 缺点 |
|------|------|
| ✅ Vue 生态标准方案 | ❌ 前后端文案需分别维护 |
| ✅ Spring 原生支持 | ❌ 法律文本需单独 CMS |
| ✅ 运行时切换 | |
| ✅ 类型安全（TypeScript） | |
| ✅ 工具链完善（vue-i18n-localemessage） | |

### 方案 B（自研）

| 优点 | 缺点 |
|------|------|
| ✅ 完全可控 | ❌ 重复造轮子 |
| ✅ 可定制特殊需求 | ❌ 无社区支持 |
| | ❌ 维护成本高 |

### 方案 C（i18next + Gettext）

| 优点 | 缺点 |
|------|------|
| ✅ 成熟方案 | ❌ Vue 集成差 |
| ✅ 社区活跃 | ❌ Gettext 与 Spring 集成复杂 |

### 方案 D（SSR）

| 优点 | 缺点 |
|------|------|
| ✅ SEO 最佳 | ❌ 架构改造大 |
| ✅ 首屏快 | ❌ 当前是 CSR |

---

## Decision

**选定方案 A：vue-i18n + Spring MessageSource**

### 详细设计

#### 客户端 i18n 架构

```
apps/client/src/i18n/
├── index.ts                    # i18n 入口
└── locales/
    ├── zh-CN.ts                # 中文简体
    └── en-US.ts                # 英文
```

#### Key 命名规范

```typescript
// 模块化 key，按业务域分组
export default {
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    loading: '加载中...',
    empty: '暂无数据',
    error: '出错了',
  },
  login: {
    title: '校园恋爱',
    subtitle: '找到你的同频心动',
    wechatLogin: '微信一键登录',
    privacyTip: '继续即表示同意{protocol}和{privacy}',
  },
  recommend: {
    title: '推荐',
    emptyTip: '今日推荐已看完，明天再来',
    like: '喜欢',
    pass: '跳过',
  },
  // ... 100+ keys
}
```

#### 使用示例

```vue
<template>
  <text>{{ t('login.title') }}</text>
  <text>{{ t('login.privacyTip', { protocol: t('login.protocol'), privacy: t('login.privacy') }) }}</text>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
```

#### 语言切换

```typescript
// i18n/index.ts
import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

const i18n = createI18n({
  legacy: false,                    // 使用 Composition API
  locale: 'zh-CN',                  // 默认语言
  fallbackLocale: 'zh-CN',          // 回退语言
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
});

export function setLocale(locale: string) {
  i18n.global.locale.value = locale;
  uni.setStorageSync('locale', locale);
}

export default i18n;
```

#### 后端 i18n 架构

```
apps/api/src/main/resources/
├── i18n/
│   ├── messages_zh_CN.properties
│   └── messages_en_US.properties
└── application.yml
```

```properties
# messages_zh_CN.properties
error.user_not_found=用户不存在
error.resource_conflict=资源冲突：{0}
error.daily_limit_exceeded=今日{0}次数已达上限（{1}次）
success.operation_completed=操作成功
```

```properties
# messages_en_US.properties
error.user_not_found=User not found
error.resource_conflict=Resource conflict: {0}
error.daily_limit_exceeded=Daily limit reached for {0} ({1} times)
success.operation_completed=Operation completed successfully
```

#### Spring 配置

```java
@Configuration
public class I18nConfig {
    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource source = new ReloadableResourceBundleMessageSource();
        source.setBasename("classpath:i18n/messages");
        source.setDefaultEncoding("UTF-8");
        source.setUseCodeAsDefaultMessage(true);
        return source;
    }

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(Locale.SIMPLIFIED_CHINESE);
        resolver.setSupportedLocales(List.of(
            Locale.SIMPLIFIED_CHINESE,
            Locale.US
        ));
        return resolver;
    }
}
```

#### 异常消息国际化

```java
@ExceptionHandler(BusinessException.class)
public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex, Locale locale) {
    String message = messageSource.getMessage(ex.getErrorCode(), ex.getArgs(), locale);
    return ResponseEntity.status(ex.getHttpStatus())
        .body(ApiResponse.error(ex.getErrorCode(), message));
}
```

#### 时间格式化

```typescript
// utils/time.ts
import { IntlDateTimeFormat } from 'intl';

export function formatDateTime(date: Date, locale: string = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(date: Date, locale: string = 'zh-CN'): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-1, 'day');
}
```

#### 法律文本 CMS 化

- 用户协议、隐私政策从后端 CMS 拉取
- 法务修改后无需发版
- 多语言版本按 locale 字段区分

```typescript
// services/legal.ts
export async function fetchLegalText(type: 'protocol' | 'privacy', locale: string) {
  return api.get(`/api/v1/legal/${type}`, { params: { locale } });
}
```

---

## Consequences

### 正面后果

- **运行时切换**：用户可在设置中切换语言，无需重启
- **海外扩展**：未来增加新语言仅需新增 locale 文件
- **维护便捷**：文案修改无需改代码（除硬编码）
- **类型安全**：TypeScript 提供编译时检查
- **法律合规**：法律文本从 CMS，便于法务修改

### 负面后果

- **初期工作量大**：500+ 处硬编码需迁移（已在 P3 完成）
- **前后端文案分离**：需分别维护，可能不一致
- **Bundle 体积**：locale 文件增加 ~50KB（gzip）

### 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 前后端文案不一致 | 建立共享 key 命名规范，定期对账 |
| Locale 文件膨胀 | 按业务域拆分（已实现） |
| Key 命名冲突 | 模块化命名（`module.key`） |
| 翻译质量 | 专业译员审核 + 用户反馈机制 |

---

## Compliance Note

- 满足海外市场多语言合规要求
- 法律文本可由法务独立维护，满足合规审计
- 用户可选择语言，满足「用户选择权」要求

---

## Related Documents

- [ADR-0001: 技术栈选型](./0001-technology-stack-selection.md)
- 客户端 i18n：`apps/client/src/i18n/`
- Admin i18n：`apps/admin/src/i18n/`
- 后端 i18n：`apps/api/src/main/java/com/campuslove/api/config/I18nConfig.java`
- 时间工具：`apps/client/src/utils/time.ts`

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-07-26 | 首次提议 | 前端组 |
| 2026-07-26 | 评审通过 | 架构组 |
