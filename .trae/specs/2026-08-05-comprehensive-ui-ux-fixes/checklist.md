# Checklist

本检查清单对应 `tasks.md` 中的所有任务，每完成一项打勾。所有项目必须全部通过才能标记本轮修复完成。

> **范围说明**：用户已明确要求本次仅检查与修复微信小程序端（mp-weixin），H5 端不在范围内。本清单已移除所有 H5 相关条目。

## A. 寻觅页（discover）

- [ ] CardSwiper 卡片在 mp-weixin 端占据屏幕中央 45% 以上高度，完整可见
- [ ] 签到卡片以紧凑横条形式展示在卡片上方，不挤压卡片区域
- [ ] 收藏按钮点击触发真实收藏逻辑，状态切换并给出 haptic 反馈
- [ ] 爱心按钮点击触发真实喜欢逻辑，状态切换并给出 haptic 反馈
- [ ] 收藏/爱心按钮以半透明浮动栏形式叠加在卡片底部
- [ ] 收藏/爱心按钮具有 ARIA 标签与 role="button"

## B. 圈子页（circle）

- [ ] 左上角标题显示"圈子"（而非"村口发帖"）
- [ ] 顶部 header 已移除"发帖"按钮
- [ ] 圈子页顶部存在"校园圈/兴趣圈"分区切换
- [ ] 未认证用户切换到"校园圈"时展示认证引导卡片
- [ ] 认证引导卡片点击跳转 `/pages/campus/certification`
- [ ] 已认证用户切换到"校园圈"时正常展示帖子列表
- [ ] 兴趣圈模式下展示兴趣分类列表（学习/运动/音乐/电影/旅行等）
- [ ] 右下角 FAB 发帖按钮位于"我的"Tab 图标上方
- [ ] FAB 按下时从圆形（border-radius: 50%）动画过渡到圆角方形（border-radius: 24rpx）
- [ ] FAB 位置 bottom = TabBar 高度 + safe-area-inset-bottom + 20rpx，不与底栏重叠
- [ ] 发帖编辑页包含"发布到"圈子选择器（校园圈/兴趣圈）
- [ ] 发帖编辑页包含 tag 多选选择器
- [ ] 发帖编辑页包含"喜爱"标签切换
- [ ] 提交发帖时携带 circleId/tags/favorite 字段
- [ ] post-list gap 为 24rpx
- [ ] FAB 区域底部留白足够，最后一个帖子不被遮挡

## C. 首页（home）学校匹配

- [ ] 未认证用户点击学校选择器弹出认证引导
- [ ] 认证引导跳转 `/pages/campus/certification`
- [ ] 已认证用户选择学校后调用后端绑定接口
- [ ] 绑定成功后学校选择器变为只读
- [ ] 已绑定用户点击学校选择器提示"学校已绑定，如需修改请联系客服"
- [ ] 后端 `POST /api/v1/users/bind-school` 接口存在且校验校园认证状态
- [ ] 已绑定学校的用户不可重复绑定（幂等性校验）

## D. 签到（checkin）积分

- [ ] 签到成功后展示"获得 N 积分"
- [ ] 签到卡片包含"我的积分：N"入口
- [ ] 签到成功卡片下方有"积分可在商城兑换权益"提示
- [ ] 提示文案点击跳转 `/pages/shop/index`
- [ ] shop 页顶部展示当前积分余额
- [ ] shop 页有积分兑换商品占位列表

## E. 活动页与设置入口

- [ ] 活动日历可点击日期，展示当日活动列表
- [ ] 活动日历支持横向滑动切换月份
- [ ] 点击活动进入活动详情页
- [ ] 活动详情页包含活动介绍、时间、地点、报名按钮
- [ ] 活动详情页编入"新人礼遇""周末派对"等示例活动数据
- [ ] 附近的人页面存在且有示例内容
- [ ] MBTI 人格测试页面存在且有示例题目
- [ ] 恋爱咨询课程页面存在且有示例内容
- [ ] 三个内容页支持后台配置 H5 URL，配置后通过 webview 加载
- [ ] 内容页右上角有退出按钮（返回箭头）
- [ ] 点击退出按钮调用 `uni.navigateBack()`
- [ ] 主页（首页/寻觅页）顶部有齿轮状设置按钮
- [ ] 点击齿轮按钮跳转 `/pages/settings/index`
- [ ] 设置页一级菜单有"反馈"入口
- [ ] 点击"反馈"跳转 `/pages/feedback/history`
- [ ] 后台 `GET /api/v1/admin/content-pages` 接口存在
- [ ] 后台 `POST /api/v1/admin/content-pages` 接口存在
- [ ] Admin 后台有 ContentConfig 视图可配置 H5 URL
- [ ] 客户端通过 configService 拉取内容页配置

## F. 全局发布动态 FAB

- [ ] GlobalPublishFab 组件存在于 `apps/client/src/components/common/`
- [ ] GlobalPublishFab fixed 定位于右下角
- [ ] GlobalPublishFab 的 bottom 值 = TabBar 高度 + safe-area-inset-bottom + 20rpx
- [ ] 点击 GlobalPublishFab 触发发帖流程
- [ ] 寻觅页接入 GlobalPublishFab
- [ ] 首页接入 GlobalPublishFab
- [ ] 圈子页接入 GlobalPublishFab（移除原局部 fab-post）
- [ ] 消息页接入 GlobalPublishFab
- [ ] 我的页接入 GlobalPublishFab
- [ ] mp-weixin 端 FAB 不与 TabBar 重叠
- [ ] 页面滚动时 FAB 始终保持 fixed 定位

## G. 消息页（messages）

- [ ] "林夕"会话 avatar 字段已修复，不再展示莫名其妙图标
- [ ] 私信列表顶部固定展示"官方消息"会话
- [ ] 官方消息使用 megaphone 或 brand 图标
- [ ] 私信列表顶部固定展示"小助手"会话（位于官方消息下方）
- [ ] 小助手使用 sparkles 或 gift 图标
- [ ] 消息页不再展示"话题推荐"入口
- [ ] 圈子页顶部已增加"话题推荐"入口
- [ ] 所有私信会话使用 SafeImage 展示对方真实头像
- [ ] 头像加载失败时回退到默认头像

## H. 我的页（profile）

- [ ] "编辑资料"按钮可点击，跳转 `/subpackages/setup/profile/index`
- [ ] "编辑资料"按钮图标尺寸 32-40rpx
- [ ] "编辑资料"按钮点击热区不小于 80rpx
- [ ] profile 顶部未知大图标已移除或替换
- [ ] 我的动态分区中爱心 emoji 已替换为 SVG 标记
- [ ] "动态"入口跳转 `/pages/village/index?tab=mine`
- [ ] "任务中心"入口跳转 `/pages/profile/tasks`
- [ ] "访客记录"入口跳转 `/pages/profile/visitors`
- [ ] "相册"入口跳转 `/pages/profile/album`
- [ ] "恋爱认证"入口跳转 `/pages/verification/index`
- [ ] `ICONS_PROFILE` 中所有图标（POSTS/MATCHES/VISITORS/PHOTO_WALL/VERIFICATION/SETTINGS/SHARE/INFO/LAB）已补齐
- [ ] 所有 SVG 图标风格统一（线条粗细/颜色/尺寸）
- [ ] 菜单项 bgColor 使用统一同色系浅色背景
- [ ] profile 顶部 header 有显式退出按钮
- [ ] 点击退出按钮触发 `handleLogout()` 确认弹窗

## I. 验证与测试

- [ ] checkin store 新增/修改 action 的单元测试通过
- [ ] circle store 新增/修改 action 的单元测试通过
- [ ] session store 新增/修改 action 的单元测试通过
- [ ] messages store 新增/修改 action 的单元测试通过
- [ ] `pnpm --filter client run test` 全部通过
- [ ] `pnpm --filter client run build:mp-weixin` 构建成功
- [ ] mp-weixin 端微信开发者工具真机预览无报错
- [ ] 使用 chrome-devtools 验证 UI/UX 无视觉断层
- [ ] 使用 stark 插件验证设计规范一致性

## 通用质量门禁

- [ ] 所有新增/修改的 v-for 都有 :key
- [ ] 所有新增/修改的 catchtap 都替代了 .stop 修饰符
- [ ] 所有新增/修改的 setTimeout 都在 onUnmounted/onUnload 中 clearTimeout
- [ ] 所有新增/修改的用户可见文案已抽取到 i18n locale 文件
- [ ] 所有新增/修改的颜色/radius/shadow/motion 使用 design tokens
- [ ] 所有新增/修改的可点击元素有 ARIA 标签
- [ ] 所有新增/修改的图片有 lazy-load
