# 全项目代码审计修复 - 实现任务清单

## 进度总结

### Phase 1: 基础设施 ✅
- [x] 1.1 删除重复文件（双份 pages.json / subpackages）✅
- [x] 1.2 删除僵尸组件（7 个零引用组件）✅
- [x] 1.3 删除零引用 Store（3 个）✅
- [x] 1.4 移除 deprecated 导出和引用 ✅

### Phase 2: 前端客户端修复 ✅
- [x] 2.1 移除 Agnes AI Key 硬编码 ✅
- [x] 2.2 修复 env.ts 诊断日志泄露 ✅
- [x] 2.3 修复 profile 页面 logout ✅
- [x] 2.4 修复 home 页 6 个假按钮 ✅
- [x] 2.5 修复 chat-session 表情/更多按钮 ✅
- [x] 2.6 修复 messages 占位功能 ✅
- [x] 2.7 修复 login 占位 ✅
- [x] 2.8 village 分享按钮 ✅
- [x] 2.9 circle 页修复 ✅
- [x] 2.11 WebSocket 断连 UI 提示 ✅
- [x] 2.12 删除 App.vue 重复 CSS ✅
- [x] 2.13 DEV 页面条件编译 ✅
- [x] 2.15 useMock 集中 ✅

### Phase 3: 后端 API 修复 ✅
- [x] 3.1 AI 代理端点（标记为后续实现，暂时移除客户端 key）✅
- [x] 3.2 移除默认 ADMIN_PASSWORD_HASH + 校验 ✅
- [x] 3.3 openid 日志脱敏 ✅
- [x] 3.4 MediaUploadController 认证修复 ✅
- [x] 3.5 WeChatPushService 同步缓存 ✅
- [x] 3.6 LocalMediaStorageService 魔数校验 ✅
- [x] 3.7 CORS 统一 ✅
- [x] 3.8 RealPushSummaryService markSent 认证修复 ✅

### Phase 4: 管理后台修复 ✅
- [x] 4.1 移除硬编码开发凭据 ✅
- [x] 4.2 Feedback.vue 实现处理函数 ✅
- [x] 4.3 修复 err.message || err.message 重复 ✅

### Phase 5: 数据库修复 ✅
- [x] 5.1 修复 BCrypt 哈希占位符缺引号 ✅
- [x] 5.2 移除管理员明文密码注释 ✅
- [x] 5.3 新增迁移: 10 个外键加 ON DELETE CASCADE ✅
- [x] 5.4 新增迁移: 统一 collation ✅
- [x] 5.5 新增迁移: 补充缺失索引 ✅
- [x] 5.6 新增迁移: 第二轮审计补充索引 (V2026.07.25.0004) ✅

### Phase 6: 配置和脚本修复 ✅
- [x] 6.1 CI: 移除 Gitleaks continue-on-error ✅
- [x] 6.2 收缩 .gitleaks.toml 白名单 ✅
- [x] 6.3 脚本: 绝对路径 → 相对路径 ✅
- [x] 6.4 移除 flyway.toml 默认 BCrypt 哈希 ✅

### Phase 7: 集成验证 ⏳
- [ ] 7.1 复检 Agent 验证修复完整性 ⏳
- [ ] 7.2 更新 CLAUDE.md ⏳
