# Tasks

## Phase 1: 蓝色主题统一

- [x] Task 1: 审计硬编码颜色
  - [x] SubTask 1.1: 使用 Grep 搜索 `apps/client/src/` 中所有硬编码十六进制颜色（`#FF`、`#F0`、`#E`开头非蓝色）
  - [x] SubTask 1.2: 分类整理硬编码颜色：品牌色候选 / 语义色（保留） / 功能色（保留） / 待替换
  - [x] SubTask 1.3: 输出审计报告到 `doc/reports/modules/01-color-audit.md`

- [x] Task 2: 替换非蓝色主色为品牌色令牌
  - [x] SubTask 2.1: 替换 `pages/` 目录下所有非蓝色主色为 `$brand-*` 令牌
  - [x] SubTask 2.2: 替换 `components/` 目录下所有非蓝色主色为 `$brand-*` 令牌
  - [x] SubTask 2.3: 保留 `#10B981`(success)、`#F59E0B`(warning)、`#EF4444`(error)、`#EC4899`(pink-喜欢)、`#F97316`(accent-强调) 不变
  - [x] SubTask 2.4: 验证替换后无破坏性样式变化

- [x] Task 3: 验证蓝色主题一致性
  - [x] SubTask 3.1: 启动 dev server，逐页检查主色调
  - [x] SubTask 3.2: 截图 5 个主页面保存到 `test-screenshots/2026-06-19-blue-theme/`
  - [x] SubTask 3.3: 截图 4 个设置页面保存到 `test-screenshots/2026-06-19-blue-theme/`
  - [x] SubTask 3.4: 记录视觉问题清单

## Phase 2: 真实编译部署

- [x] Task 4: H5 真实编译
  - [x] SubTask 4.1: 执行 `npm run build:h5`（在 `apps/client/` 目录）
  - [x] SubTask 4.2: 验证产物输出到 `apps/client/dist/build/h5/`
  - [x] SubTask 4.3: 检查编译日志无 ERROR
  - [x] SubTask 4.4: 验证 `index.html` 存在且资源引用正确

- [x] Task 5: 微信小程序真实编译
  - [x] SubTask 5.1: 执行 `npm run build:mp-weixin`（在 `apps/client/` 目录）
  - [x] SubTask 5.2: 验证产物输出到 `apps/client/dist/build/mp-weixin/`
  - [x] SubTask 5.3: 检查编译日志无 ERROR
  - [x] SubTask 5.4: 验证 `app.json`、`app.js` 和页面文件存在

- [x] Task 6: HBuilderX 导入验证
  - [x] SubTask 6.1: 验证 `D:\HBuilderX` 路径可访问
  - [x] SubTask 6.2: 将 `apps/client/dist/build/mp-weixin/` 导入 HBuilderX
  - [x] SubTask 6.3: 验证项目可在 HBuilderX 中正常打开
  - [x] SubTask 6.4: 记录 HBuilderX 导入结果到模块文档

## Phase 3: 逐页视觉检查

- [x] Task 7: 主页面视觉检查（5 页）
  - [x] SubTask 7.1: 首页 `/pages/home/index` 截图与检查
  - [x] SubTask 7.2: 讨论圈 `/pages/village/index` 截图与检查
  - [x] SubTask 7.3: 匹配 `/pages/discover/index` 截图与检查
  - [x] SubTask 7.4: 聊天 `/pages/chat/index` 截图与检查
  - [x] SubTask 7.5: 我的 `/pages/profile/index` 截图与检查

- [x] Task 8: 设置页面视觉检查（4 页）
  - [x] SubTask 8.1: 基础资料 `/subpackages/setup/profile/index` 截图与检查
  - [x] SubTask 8.2: 校区 `/subpackages/setup/campus/index` 截图与检查
  - [x] SubTask 8.3: 日程 `/subpackages/setup/schedule/index` 截图与检查
  - [x] SubTask 8.4: 推荐偏好 `/subpackages/setup/recommend-pref/index` 截图与检查

- [x] Task 9: 视觉问题修复
  - [x] SubTask 9.1: 汇总 Task 7-8 发现的视觉问题
  - [x] SubTask 9.2: 逐项修复颜色、间距、字体、图标问题
  - [x] SubTask 9.3: 修复后重新截图验证
  - [x] SubTask 9.4: 记录问题与解决方案到模块文档

## Phase 4: 结构化验收文档

- [x] Task 10: 生成模块任务文档
  - [x] SubTask 10.1: 创建 `doc/reports/modules/` 目录
  - [x] SubTask 10.2: 生成 `01-color-audit.md`（颜色审计模块）
  - [x] SubTask 10.3: 生成 `02-theme-unify.md`（主题统一模块）
  - [x] SubTask 10.4: 生成 `03-h5-build.md`（H5 编译模块）
  - [x] SubTask 10.5: 生成 `04-mp-build.md`（小程序编译模块）
  - [x] SubTask 10.6: 生成 `05-hbuilderx-verify.md`（HBuilderX 验证模块）
  - [x] SubTask 10.7: 生成 `06-visual-inspection.md`（视觉检查模块）
  - [x] SubTask 10.8: 生成 `07-issue-fix.md`（问题修复模块）

- [x] Task 11: 生成主验收报告
  - [x] SubTask 11.1: 创建 `doc/reports/blue-theme-build-acceptance.md`
  - [x] SubTask 11.2: 编写窗口验收维度（每轮验收结果）
  - [x] SubTask 11.3: 编写子智能体验收维度（每个子智能体工作结果）
  - [x] SubTask 11.4: 编写问题清单与解决方案
  - [x] SubTask 11.5: 编写总体进度计划与跟踪表

- [x] Task 12: 全量功能验收
  - [x] SubTask 12.1: 验证 5 个主页面功能可用
  - [x] SubTask 12.2: 验证 4 个设置页面功能可用
  - [x] SubTask 12.3: 验证蓝色主题全应用一致
  - [x] SubTask 12.4: 验证 H5/小程序编译产物可用
  - [x] SubTask 12.5: 验证无运行错误、无控制台报错

## 追加任务：Store 重构（用户确认）

- [x] Task 13: DiscoverStore 存储同步重构
  - [x] SubTask 13.1: 引入 Pinia watch 机制监听 viewedCards/hasRewoundToday/lastRefreshTime
  - [x] SubTask 13.2: 实现 300ms 防抖存储机制
  - [x] SubTask 13.3: 移除 8 处手动 saveToStorage 调用
  - [x] SubTask 13.4: 增强 saveToStorage 错误处理
  - [x] SubTask 13.5: TypeScript 类型检查通过

- [x] Task 14: ChatStore 重复代码重构
  - [x] SubTask 14.1: 创建 withErrorHandling 高阶函数
  - [x] SubTask 14.2: 创建 withMockMode 高阶函数
  - [x] SubTask 14.3: 重构 12 个 action 方法
  - [x] SubTask 14.4: 消除约 80-100 行重复代码
  - [x] SubTask 14.5: TypeScript 类型检查通过

# Task Dependencies

- Task 2（替换颜色）依赖 Task 1（审计完成）
- Task 3（主题验证）依赖 Task 2（替换完成）
- Task 4-5（编译）依赖 Task 2（主题统一），可并行
- Task 6（HBuilderX）依赖 Task 5（小程序编译产物）
- Task 7-8（视觉检查）依赖 Task 3（主题验证），可并行
- Task 9（问题修复）依赖 Task 7-8（视觉检查）
- Task 10（模块文档）依赖 Task 1-9 全部完成
- Task 11（主验收报告）依赖 Task 10（模块文档）
- Task 12（全量验收）依赖 Task 11（主验收报告）
- Task 13-14（Store 重构）独立于 Phase 1-4，可并行
