# 校园恋爱小程序 UI 重构与差异化设计 Spec

## Why

当前设计系统已初步建立，但用户反馈"感觉还是差点"。通过参考青藤之恋的核心功能架构，结合天蓝色系主色调进行差异化设计，打造更具辨识度的品牌视觉风格，同时建立规范的设计文件归档体系。

## What Changes

* **BREAKING**: 主色调从珊瑚粉/薄荷青双主色切换为天蓝色系（#3B9DE5 / #5BC0DE）

* **BREAKING**: 重新设计全部页面视觉风格，融入青藤之恋参考元素

* 新增差异化功能模块：学历认证标识、兴趣图谱、恋爱测试

* 建立设计文件归档体系（按时间顺序与效果分类）

* 更新 Design Tokens 与组件库以适配新主题

## Impact

* Affected specs: 色彩系统、组件库、全部页面设计稿

* Affected code: `design-system/tokens.ts`, `design-system/components/*`, `design-system/pages/*`, `design-preview/index.html`

## ADDED Requirements

### Requirement: 天蓝色系主题设计

The system SHALL provide a sky-blue dominant color scheme with specific hex values.

#### Scenario: 品牌主色定义

* **WHEN** 查看设计令牌

* **THEN** 主色应为天蓝 #3B9DE5，辅色为浅青 #5BC0DE，强调色为暖橙 #FF8C42

### Requirement: 青藤之恋差异化设计

The system SHALL incorporate reference elements from 青藤之恋 while maintaining unique brand identity.

#### Scenario: 学历认证标识

* **WHEN** 用户完成学校认证

* **THEN** 个人资料展示青藤风格的学历徽章

#### Scenario: 兴趣图谱展示

* **WHEN** 浏览个人资料

* **THEN** 以可视化图谱展示兴趣标签关联

### Requirement: 设计文件归档体系

The system SHALL organize all design files chronologically and by effect.

#### Scenario: 文件归档

* **WHEN** 查看 design-archive 目录

* **THEN** 文件按 YYYY-MM-DD 子目录组织，每个目录包含 preview\.html 与说明文档

