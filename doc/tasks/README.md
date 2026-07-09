# 校园恋爱小程序 — 任务清单总览

> 版本：1.0 | 总模块数：13 | 预估总子任务：~75

---

## 模块任务文件索引

| Phase | 文件 | 模块 | 子任务数 | 预估工期 |
|-------|------|------|----------|----------|
| **Phase 0** | [phase-0-scaffold.md](./phase-0-scaffold.md) | 项目骨架：构建链路、目录规范、配置 | 7 | 1d |
| **Phase 0** | [phase-0-database.md](./phase-0-database.md) | 数据库：Flyway迁移 + Entity + Repository | 6 | 1.5d |
| **Phase 0** | [phase-0-auth.md](./phase-0-auth.md) | 认证：微信登录、JWT、会话 | 5 | 1d |
| **Phase 1** | [phase-1-discover.md](./phase-1-discover.md) | 寻觅：卡片推荐、每日限额、挽回 | 7 | 2d |
| **Phase 1** | [phase-1-likes.md](./phase-1-likes.md) | 喜欢：喜欢/访客、心跳信号、匹配 | 6 | 1.5d |
| **Phase 1** | [phase-1-village.md](./phase-1-village.md) | 村口：帖子CRUD、评论、点赞、分类 | 8 | 2d |
| **Phase 1** | [phase-1-messages.md](./phase-1-messages.md) | 消息：私信WebSocket、临时聊天、通知 | 7 | 2d |
| **Phase 2** | [phase-2-profile.md](./phase-2-profile.md) | 资料：编辑、学校认证、完善度 | 5 | 1d |
| **Phase 2** | [phase-2-checkin.md](./phase-2-checkin.md) | 签到：每日签到、连续天数 | 4 | 0.5d |
| **Phase 2** | [phase-2-daily-question.md](./phase-2-daily-question.md) | 每日一问：问题、回答、浏览 | 4 | 0.5d |
| **Phase 2** | [phase-2-circles.md](./phase-2-circles.md) | 兴趣圈：圈子、话题、回复 | 5 | 1d |
| **Phase 2** | [phase-2-activities.md](./phase-2-activities.md) | 活动：列表、详情、报名 | 4 | 0.5d |
| **Phase 3** | [phase-3-quality.md](./phase-3-quality.md) | 质量：全量测试、lint、蓝色主题验收 | 6 | 2d |
| **合计** | | **13 模块** | **74** | **16.5d** |

---

## 依赖关系图

```
Phase 0 (基础)
├── 0-scaffold ────────────── (无依赖)
├── 0-database ────────────── (依赖: scaffold 部分)
└── 0-auth ────────────────── (依赖: database)

Phase 1 (核心) — Phase 0 全部完成后开始
├── 1-discover ────────────── (依赖: auth)
├── 1-likes ───────────────── (依赖: auth, discover)
├── 1-village ─────────────── (依赖: auth, database)
└── 1-messages ────────────── (依赖: auth, likes)

Phase 2 (互动) — Phase 1 部分完成后可并行
├── 2-profile ─────────────── (依赖: auth)
├── 2-checkin ─────────────── (依赖: auth, profile)
├── 2-daily-question ──────── (依赖: auth)
├── 2-circles ─────────────── (依赖: auth, village)
└── 2-activities ──────────── (依赖: auth)

Phase 3 (质量) — Phase 1+2 全部完成后开始
└── 3-quality ─────────────── (依赖: 全部模块)
```

---

## 子任务统计

```
Phase 0: 18 tasks (24%)
Phase 1: 28 tasks (38%)
Phase 2: 22 tasks (30%)
Phase 3:  6 tasks ( 8%)
─────────────────────
Total:   74 tasks
```

---

## 进度汇总公式

```
完成率 = 已完成子任务数 / 总子任务数 × 100%
模块完成率 = 模块已完成子任务数 / 模块总子任务数 × 100%
Phase完成 = 所有模块完成率 = 100%
```

---

## 验收标准总览

| 检查项 | 工具 | 标准 |
|--------|------|------|
| 前端单元测试 | Vitest | 全部通过 |
| 后端单元测试 | JUnit 5 | 全部通过 |
| 后端集成测试 | MockMvc | 核心场景通过 |
| 前端类型检查 | vue-tsc / tsc | 0 error |
| Python 测试 | pytest | 全部通过 |
| Python 类型检查 | mypy --strict | 0 error |
| Python 代码规范 | ruff check | 0 error |
| OpenAPI 规范 | Spectral | 0 error |
| 客户端构建 | H5 + MP-WEIXIN | 无错误 |
| 蓝色主题验收 | Manual | 全部页面通过 |

---

## 使用说明

1. 主 agent 阅读本文件，了解全局任务结构
2. 按 Phase 顺序和依赖关系分配子 agent
3. 子 agent 接收对应模块 md 文件，逐项完成 checkbox 子任务
4. 每完成一项子任务，子 agent 勾选 checkbox 并汇报
5. 主 agent 更新 `progress.md` 中的状态
6. 所有不明确的需求必须向主 agent 提问，不可猜测
