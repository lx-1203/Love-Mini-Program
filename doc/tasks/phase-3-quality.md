# Phase 3 — 质量与验收 — 任务清单

## 模块概述
全量测试通过、代码规范检查、蓝色主题视觉验收、最终文档完善。本 Phase 为发布前的最终质量关卡。

## 依赖关系
- **上游依赖**：Phase 0/1/2 全部模块完成
- **下游被依赖**：无（终点）

## 任务列表

- [ ] **T001: 全量测试通过**
  - 输入：全部模块代码
  - 输出：所有测试通过
  - 验收：
    - `npm test` 通过（prototype + structure + client）
    - `npm run api:test` 通过（后端 JUnit）
    - `pytest` 通过（Python 脚本）
    - `npm run verify:phase01` 通过（全链路）
  - 测试命令：`npm run verify:phase01 && pytest`

- [ ] **T002: 代码规范检查通过**
  - 输入：全部模块代码
  - 输出：所有 lint 检查 0 error
  - 验收：
    - `npm --workspace apps/client run typecheck` → 0 error
    - `mypy --strict .` → 0 error
    - `ruff check` → 0 error
    - `npm run lint:openapi:spectral` → 0 error
  - 测试命令：`npm --workspace apps/client run typecheck && mypy --strict . && ruff check && npm run lint:openapi:spectral`

- [ ] **T003: 蓝色主题视觉验收**
  - 输入：蓝色主题规范（`redesign-ui-2026-05-27` spec）
  - 输出：验收报告（每页截图 + 对比检查表）
  - 验收项：
    - [ ] TabBar 图标：全部 SVG 线面结合，无 emoji
    - [ ] 品牌色：`#2563EB` 正确应用于按钮/链接/选中态
    - [ ] 页面背景：`#F8FAFC`
    - [ ] 卡片背景：`#FFFFFF` + 细边框 `#E2E8F0` + 柔和阴影
    - [ ] 圆角：卡片 16~24rpx，按钮 999px
    - [ ] 渐变：品牌蓝渐变背景叠加层
    - [ ] 登录页：视频背景 + 渐变遮罩
    - [ ] 文字层级：四层 Token (primary/secondary/tertiary/quaternary)
    - [ ] 过渡动效：淡入淡出、骨架屏、弹性缓动
  - 测试命令：手动逐页检查

- [ ] **T004: Mock/Real 双模式一致性验收**
  - 输入：Mock/Real 双模式
  - 输出：10 场景验收报告
  - 验收场景（见 `docs/phase-1-execution-plan.md` §6.1）：
    1. 登录后进入首页
    2. 首页展示完整内容
    3. 从推荐的人进入聊天
    4. 会话出现在聊天列表
    5. 发送文字/语音消息
    6. 处理联系方式交换
    7. 主动结束会话
    8. 聊天列表状态变化
    9. 从匹配页进入聊天
    10. Mock/Real 状态迁移一致
  - 测试命令：手动逐场景验证

- [ ] **T005: 文档完善**
  - 输入：`doc/` 目录
  - 输出：完善的文档体系
  - 验收项：
    - [ ] `proposal.md` — 需求文档完整
    - [ ] `detailed-design.md` — 设计文档完整
    - [ ] `tasks/` — 所有任务清单已勾选
    - [ ] `prompt.md` — VibeCoding Prompt 完整
    - [ ] `progress.md` — 进度汇总完成
  - 测试命令：手动检查

- [ ] **T006: 构建产物验证**
  - 输入：构建命令
  - 输出：H5 + 小程序构建产物
  - 验收：
    - `npm run verify:client-builds` 通过
    - H5 预览可正常访问
    - 小程序构建包可正常导入微信开发者工具
  - 测试命令：`npm run verify:client-builds`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| 全量测试通过 | ⏳ |
| 代码规范 0 error | ⏳ |
| 蓝色主题视觉验收 | ⏳ |
| Mock/Real 一致性 | ⏳ |
| 文档完善 | ⏳ |
| 构建产物验证 | ⏳ |

## 最终验收报告模板

```
# 校园恋爱小程序 — 最终验收报告

## 日期
YYYY-MM-DD

## 测试结果
- [ ] npm test 通过
- [ ] npm run api:test 通过
- [ ] pytest 通过
- [ ] npm run verify:phase01 通过
- [ ] typecheck 0 error
- [ ] mypy --strict 0 error
- [ ] ruff check 0 error
- [ ] Spectral lint 0 error

## 视觉验收
- [ ] 5个 Tab 页面 蓝色主题正确
- [ ] 登录页视频背景正常
- [ ] 所有图标 SVG 无 emoji
- [ ] 动效过渡流畅

## Mock/Real 一致性
- [ ] 10 场景全部通过

## 构建
- [ ] H5 构建成功
- [ ] 小程序构建成功

## 结论
[通过/不通过] — [备注]
```
