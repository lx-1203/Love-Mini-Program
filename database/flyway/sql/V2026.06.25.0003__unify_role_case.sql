-- ============================================================
-- 迁移：统一用户角色大小写为 ADMIN/USER（大写）
-- ============================================================
-- 背景：
--   前端 apps/admin/src/stores/session.ts 原使用小写 'admin'/'user' 判断角色，
--   后端 apps/api/.../entity/User.java 使用大写 'ADMIN'/'USER'，
--   导致前端 role === 'admin' 与后端 role === 'ADMIN' 不匹配，权限校验不一致。
--
-- 修复内容：
--   1. 前端已统一改为大写 'ADMIN'/'USER'（见 session.ts、Layout.vue）
--   2. 后端 User.java role 字段默认值 'USER'（大写），isAdmin() 使用 equalsIgnoreCase 兼容
--   3. 本迁移脚本将存量数据中的小写角色值统一更新为大写
--
-- 注意事项：
--   * 实际表名为 users（项目无独立 admins 表，管理员与普通用户共用 users 表，通过 role 字段区分）
--   * 使用 UPPER(role) 兜底处理混合大小写情况（如 'Admin'、'User'）
--   * Spring Security RoleVoter 默认使用 ROLE_ 前缀 + 大写角色，
--     hasRole('ADMIN') 实际匹配 ROLE_ADMIN 权限，故数据库存储应为大写 'ADMIN'
-- ============================================================

-- 将小写 'admin' 统一为大写 'ADMIN'
UPDATE users SET role = 'ADMIN', updated_at = NOW()
WHERE role = 'admin';

-- 将小写 'user' 统一为大写 'USER'
UPDATE users SET role = 'USER', updated_at = NOW()
WHERE role = 'user';

-- 兜底：处理其他混合大小写情况（如 'Admin'、'User'、'ADMIN' 已正确则不变）
UPDATE users SET role = UPPER(role), updated_at = NOW()
WHERE role IN ('Admin', 'User', 'admin', 'user');

-- 校验：更新后不应存在小写角色值
-- SELECT role, COUNT(*) FROM users GROUP BY role;
-- 预期结果：仅 'ADMIN' 和 'USER' 两行