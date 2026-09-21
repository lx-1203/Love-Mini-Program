# 后台 RBAC 三级管理圈层 · 开发规格文档

> 状态：设计交付物（供后端 / 前端开发复用）　|　版本：v1.0　|　对应设计：`design-tokens-admin.md §11.2`、画布 Frame 08
> 适用范围：恋爱小程序**管理后台**（独立 Web 应用），与 uni-app 小程序端、Java Spring Boot 后端（`apps/api`）对接。

---

## 1. 圈层模型定义（设计约束，不可偏离）

管理员分**三级圈层**，上层可下钻查看下层，权力等级越大可见范围越广：

| 等级 | 圈层 | 管辖范围 | 可见用户内容（聊天 / 图片 / 帖子 / 临时聊天） |
|------|------|----------|----------------------------------------|
| **L1** | 公司管理级（我们公司） | 全平台：全部区域 / 学校 / 用户 | 全量（可下钻查看 L2、L3） |
| **L2** | 区域管理（华北 / 华东 / 华南…） | 本区域：全部学校 / 用户 | 本区域全量（可下钻查看 L3） |
| **L3** | 学校管理（各大高校各派管理员） | 本校：仅本校用户 | 本校全量（不可越级） |

**正交规则（核心）**：圈层（管理员等级）与功能角色**正交叠加**。
- 圈层决定 **数据域（能看到谁）**；
- 功能角色（运营 / 审核 / 客服 / 风控）决定 **操作权限（能做什么）**；
- 任一角色可绑定任意圈层，例：`华东区域 · 审核员`、`公司级 · 风控`。
- 二者同时生效：可见数据取「圈层 scope 交集」，可执行操作取「功能角色权限集」。

---

## 2. 数据模型（ER 草图 → 表结构）

### 2.1 圈层表 `t_admin_circle`
```sql
CREATE TABLE t_admin_circle (
  id          BIGINT      PRIMARY KEY,
  grade       TINYINT     NOT NULL COMMENT '1=公司 2=区域 3=学校',
  name        VARCHAR(64) NOT NULL COMMENT '圈层名，如"华东区域""浙江大学"',
  parent_id   BIGINT      NULL     COMMENT '上级圈层ID；L1为NULL',
  circle_path VARCHAR(64) NOT NULL COMMENT '层级路径，如 C1/R3/S12，用于范围过滤',
  region_code VARCHAR(16) NULL     COMMENT '区域编码（L2必填）',
  school_id   BIGINT      NULL     COMMENT '高校ID（L3必填）',
  sort        INT         DEFAULT 0,
  UNIQUE KEY uk_path (circle_path)
) COMMENT='三级管理圈层';
```
> `circle_path` 约定：`C{公司}` / `C{公司}/R{区域}` / `C{公司}/R{区域}/S{学校}`。可见性 = **前缀匹配**（L1 前缀最短 = 最广）。

### 2.2 管理员表 `t_admin`（圈层 + 功能角色叠加）
```sql
CREATE TABLE t_admin (
  id           BIGINT      PRIMARY KEY,
  username     VARCHAR(64) NOT NULL,
  circle_id    BIGINT      NOT NULL COMMENT '绑定圈层（数据域）',
  role         VARCHAR(16) NOT NULL COMMENT '功能角色：OPERATOR/AUDITOR/CS/RC/RISK/SUPER',
  status       TINYINT     DEFAULT 1 COMMENT '1启用 0禁用',
  created_at   DATETIME,
  FOREIGN KEY (circle_id) REFERENCES t_admin_circle(id)
) COMMENT='后台管理员（圈层×角色）';
```
> `SUPER` = 公司级超级管理员（L1 + 全功能）；其余角色可落在任意圈层。

### 2.3 用户与内容的圈层归属（scope 过滤键）
- `t_user` 增加字段 `circle_path VARCHAR(64)`：注册/入校时按「公司/区域/学校」写入（如 `C1/R3/S12`）。
- 内容表统一带 `owner_id` + 冗余 `owner_circle_path`（写入时落库，避免联表）：
  - `t_chat_message`（私聊 / 临时会话）　`owner_circle_path`
  - `t_user_image`（上传图片）　`owner_circle_path`
  - `t_post`（帖子）　`owner_circle_path`
  - `t_temp_session`（临时聊天）　`owner_circle_path`

> 冗余 `owner_circle_path` 是为让**举报调阅**走单表前缀过滤，性能最优；用户转校时由定时任务同步更新。

---

## 3. 圈层包含与下钻规则

1. **可见范围计算**：取 viewer 的 `circle_path` 作前缀，内容 `WHERE owner_circle_path LIKE CONCAT(viewer_path, '%')`。
   - L1 `C1` → 可见全部；
   - L2 `C1/R3` → 可见该区域全部学校；
   - L3 `C1/R3/S12` → 仅本校。
2. **下钻**：上层在后台点击下层圈层节点（Frame 08 结构图 / 用户详情圈层链），即把查询前缀收窄到该下层 path，等价于"切换到下层视角"。
3. **越级拦截**：viewer 请求的内容若 `owner_circle_path` 不以自身 path 为前缀 → 返回 `403 FORBIDDEN`（含举报调阅接口）。
4. **功能角色独立校验**：即便数据可见，操作（封禁 / 删帖 / 改配置）仍需 `role` 在允许集内，否则 `403`。

---

## 4. 权限判定中间件（Spring 拦截器逻辑）

```
请求到达 → 拦截器取 Token 解析 admin_id
  → 查 t_admin 得 (circle_path, role)
  → 写入 RequestContext：ctx.viewerPath = circle_path; ctx.role = role
  → 业务层 / MyBatis 拦截器自动拼接：AND owner_circle_path LIKE ctx.viewerPath + '%'
  → 危险操作注解 @RequireRole("RISK","SUPER") 校验 ctx.role
  → 越级或越权 → 403
```

> 建议用 MyBatis 拦截器统一注入 `viewerPath` 过滤，避免每个查询手写；或用 Spring Security + 自定义 `CircleScopeVoter`。

---

## 5. 举报调阅接口规格（核心取证链路）

### 5.1 调阅管辖内容（按类型）
```
GET /api/admin/evidence
Query:
  targetUserId  LONG   必填  被调阅用户（被举报人）
  type          ENUM  必填  chat | image | post | tempChat
  page/pageSize INT   分页
鉴权：Bearer Token（admin）
scope 校验：targetUser.circle_path LIKE ctx.viewerPath + '%' 否则 403
返回：
{
  "targetUser": { "id": 12, "circlePath": "C1/R3/S12", "nickname": "…" },
  "type": "chat",
  "visible": true,
  "scope": "本校",                 // 实际命中的圈层范围描述
  "items": [
    { "id": 901, "preview": "…", "createdAt": "…", "peerId": 33 }
  ],
  "page": { "page":1, "pageSize":20, "total": 58 }
}
```
> 四类内容映射：`chat`=私聊+临时会话消息；`image`=上传图片（返回缩略图 URL）；`post`=帖子；`tempChat`=临时聊天记录。

### 5.2 举报处理（闭环落点）
```
POST /api/admin/report/{reportId}/handle
Body: { "action": "WARN|BAN|DELETE|IGNORE", "evidenceRef": ["chat:901","post:412"] }
鉴权：role ∈ {AUDITOR, RISK, SUPER} 且 circle 可见
行为：写处理记录 + 关联 evidenceRef（取证留痕）+ 触发对应用户处罚
```

### 5.3 圈层下钻（用户/内容列表）
```
GET /api/admin/circle/{circleId}/users     // 某圈层下用户
GET /api/admin/circle/{circleId}/reports   // 某圈层下举报
（均以 viewerPath 为上限，circleId 必须是 viewerPath 的下级或自身）
```

---

## 6. 前端对接点（画布节点，逐页还原）

| 页面 | 节点 | 对接动作 |
|------|------|----------|
| Frame 08 系统设置/RBAC | `8:251` | 圈层结构图 + 管辖内容可见性表 → 渲染圈层树与权限矩阵 UI |
| Frame 04 用户详情 | `6:114` | 「圈层归属链」显示 `circle_path`；「调阅管辖内容」按钮 → 调 5.1 |
| Frame 05 内容审核 | `7:1` | 「调阅证据」四分类 chip → 调 5.1（type 切换） |
| Frame 09 风控举报 | `10:14` | 「举报调阅·圈层可见内容」chip → 调 5.1；处理面板「取证留痕」→ 调 5.2 |

---

## 7. 验证用例（验收口径）

1. 用 **L1 公司级**账号登录：可见全部区域/学校用户与内容；可下钻任意 L2/L3。
2. 用 **L2 华东区域**账号：仅见华东用户/内容；可下钻华东内学校；请求华北内容 → 403。
3. 用 **L3 浙江大学**账号：仅见浙大用户/内容；请求其他学校 → 403；不可越级。
4. 功能角色校验：`华东区域·客服`可见华东用户但**无封禁/删帖**按钮（role 限制）；`华东区域·审核员`有审核操作但无系统设置入口。
5. 举报调阅：在 Frame 09 点「聊天内容」chip，返回的 `items` 仅限被举报人 `circle_path` 落在 viewer 可见 scope 内。

---

## 8. 落地建议（工程顺序）

1. 先建 `t_admin_circle` + `t_admin` + `t_user.circle_path`，初始化公司/区域/学校种子数据。
2. 中间件注入 `viewerPath`（MyBatis 拦截器优先）。
3. 实现 5.1 / 5.2 / 5.3 三个接口 + 越级 403。
4. 前端按 Frame 04/05/08/09 节点接接口，串起"圈层下钻 → 举报调阅"闭环。
5. 按 §7 用例做三级账号回归。
