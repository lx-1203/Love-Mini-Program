# Checklist

## Phase 1 验收：P0 业务阻断点 + 安全凭据

- [x] 聊天会话跳转不再触发登出（消息列表 → 聊天会话 → 返回消息列表无登出）
- [x] 资料完善后村口立即解锁（无需刷新或重新登录）
- [x] 资料完善后讨论圈立即解锁
- [x] 资料完善后我的页面访问正常
- [x] profile-guard 与 session-guard 完善度判定一致
- [x] LOCKED_PAGES 与 page-access.ts 中 requiresProfile 配置一致
- [x] 管理员密码使用 BCrypt 校验，无明文比较
- [x] Login.vue 默认凭据明文展示已移除
- [x] 角色值统一为 ADMIN/USER（大写）
- [x] 数据库存量 admin/user 值已迁移为 ADMIN/USER
- [x] 管理员登录后权限校验通过
- [x] 普通用户权限校验通过
- [x] Phase 1 修复前后截图对比已归档

## Phase 2 验收：管理端 12 类后端 API

- [x] 用户管理 5 个接口（列表/详情/编辑/禁用/启用）已实现
- [x] 内容管理 7 个接口（帖子列表/审核/删除、评论列表/删除、举报列表/处理）已实现
- [x] 系统配置 6 个接口（参数/规则/开关 各 查询+更新）已实现
- [x] 数据统计 3 个接口（用户/活跃度/匹配）已实现
- [x] 匹配算法配置 2 个接口（查询/更新）已实现
- [x] 推荐策略配置 2 个接口（查询/更新）已实现
- [x] 通知配置 2 个接口（查询/更新）已实现
- [x] 敏感词管理 3 个接口（列表/新增/删除）已实现
- [x] 审计日志接口已实现（含 AOP 切面自动记录）
- [x] audit_log 表已通过 Flyway 迁移创建
- [x] 管理前端 12 类页面全部从 Mock 切换为 Real
- [x] 管理端无 Mock 数据残留
- [x] 所有管理接口集成测试通过
- [x] 管理操作均记录到审计日志

## Phase 3 验收：安全加固

- [x] 后端注册接口密码使用 BCrypt 加密
- [x] 后端登录接口密码使用 BCrypt 校验
- [x] 客户端注册/登录流程联调通过
- [x] 管理端登录流程联调通过
- [x] JWT 密钥从 JWT_SECRET 环境变量读取
- [x] application-mock.yml 中无硬编码 JWT 密钥
- [x] JWT_SECRET 未配置时应用启动失败并报错
- [x] WebSocket token 通过 Sec-WebSocket-Protocol Header 传递
- [x] WebSocket URL 中无 ?token=xxx 参数
- [x] WebSocket 连接建立与消息收发正常
- [x] 数据库密码从 DB_PASSWORD 环境变量读取
- [x] application-db.yml 中无空 password / change-me 默认值
- [x] DB_PASSWORD 未配置时应用启动失败并报错
- [x] SecurityConfig 中 permitAll 仅放行登录/注册/公开接口
- [x] /api/admin/** 强制要求 ADMIN 角色
- [x] /api/user/** 强制要求 USER 角色且认证通过
- [x] 未登录访问受保护接口返回 401
- [x] 普通用户访问管理接口返回 403
- [x] 集成测试覆盖 401/403 场景

## Phase 4 验收：性能优化 + 解锁提示优化

- [x] 脚本资源数量从 96 降至 ≤ 30
- [x] 首屏传输从 5MB 降至 ≤ 2MB
- [x] vite.config.ts manualChunks 扩展（vant/uni-app/echarts 等）
- [x] 所有非首屏路由使用动态 import
- [x] 图片懒加载属性已添加
- [x] LCP ≤ 1.5s
- [x] CLS ≤ 0.1
- [x] INP ≤ 200ms
- [x] UnlockGuideModal 组件已实现
- [x] profile-guard 静默重定向已替换为 Modal 弹窗
- [x] 弹窗含"去完善资料"按钮跳转 setup 页
- [x] 弹窗含"暂不完善"按钮关闭弹窗停留当前页
- [x] 首次进入锁定页显示一次性蒙层引导
- [x] Phase 4 验收报告已生成
- [x] 完整业务链路回归通过

## 总体验收

- [x] 52 个问题中 P0 全部 12 个已修复并验证
- [x] 52 个问题中 P1 至少 20 个已修复并验证
- [x] 52 个问题中 P2/P3 视情况修复
- [x] 三个角色（普通用户/管理员/工程师）回归测试通过
- [x] 系统综合评分从 55.5 提升至 ≥ 80
- [x] 修复报告归档至 `doc/reports/system-fixes/`
- [x] 部署文档更新（含 JWT_SECRET/DB_PASSWORD 环境变量配置说明）
- [x] 数据库迁移脚本归档至 `apps/api/src/main/resources/db/migration/`
