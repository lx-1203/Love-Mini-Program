# 最终审计与重构验证 Checklist

## Spec标记同步
- [x] reference-deep-refactor/tasks.md Phase 1-4 任务标记已同步为 `[x]`
- [x] reference-deep-refactor/checklist.md 检查项已同步更新
- [x] social-interaction-refactor/tasks.md Phase 5 验证任务标记为 `[x]`
- [x] social-interaction-refactor/checklist.md 检查项已同步更新

## 代码级静态审查
- [x] 13个Real服务无UnsupportedOperationException抛出（仅@Deprecated方法有，已确认设计意图）
- [x] 所有服务无DEFAULT_USER_ID硬编码回退
- [x] SecurityUtils.getCurrentUserId()在未认证时正确抛出401
- [x] 所有Store文件Mock/Real双模式分支存在（6个显式useMock + 6个API层切换）

## 14条核心链路审查
- [x] 链路1：微信登录 → 资料编辑 → 资料完善度更新
- [x] 链路2：首页 → 推荐卡片 → 签到 → 每日一问 → 活动推荐 → 村口热门
- [x] 链路3：寻觅 → 喜欢 → 心动信号 → 破冰引导 → 私信
- [x] 链路4：村口 → 发帖 → 评论 → 点赞 → 转发
- [x] 链路5：兴趣圈 → 加入 → 话题 → 回复
- [x] 链路6：签到 → 每日一问 → 回答
- [x] 链路7：活动 → 列表 → 详情 → 报名
- [x] 链路8：临时聊天 → 创建 → 发消息 → 联系方式交换
- [x] 链路9：反馈 → 提交 → 查询历史
- [x] 链路10：推荐偏好设置 → 保存 → 影响推荐结果
- [x] 链路11：在线状态 → 心跳 → 状态标识 → 超时离线
- [x] 链路12：互动提醒 → 事件触发 → 推送通知 → 点击跳转
- [x] 链路13：同校动态 → 帖子/活动/话题聚合 → 浏览
- [x] 链路14：个人统计 → 关注数/粉丝数/获赞数/帖子数

## Mock模式验证
- [x] 所有12个Store Mock模式分支完整性确认
- [x] 新增功能Store（在线状态/破冰引导/互动事件/同校动态）Mock分支存在

## 约束合规审计
- [x] 全代码库无游戏化元素（积分/等级/排行榜/成就/徽章/金币/钻石/段位/经验值）
- [x] 全代码库无购物功能（商城/商品/付费/购买/会员/VIP/订单/支付/充值）
- [x] 签到连续天数仅作视觉标识（无积分关联）

## 设计预览对齐
- [x] 设计预览TabBar与pages.json路由映射一致（设计预览为简化概念模型，实际遵循参考产品结构）
- [x] 首页→discover / 讨论圈→village / 匹配→match / 活动→activities / 我的→profile

## 大学生模式兼容性
- [x] campus字段贯穿推荐/社区/活动/同校动态全链路
- [x] 同校优先逻辑在推荐和社区模块中生效
- [x] 学校认证作为资料完善度硬门槛

## 回归验证
- [x] 大学生模式不受影响
- [x] 资料完善硬门槛正常生效
- [x] 推荐计划设置完整保留
- [x] 线下活动功能完整保留
- [x] 无游戏化元素和购物功能

## Git提交
- [x] 所有更新的Spec文件已git add
- [x] Git commit信息规范，变更记录完整