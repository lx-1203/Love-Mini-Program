# Checklist

## Phase A: 显示问题修复

- [x] A1: SocialProgressIndicator 的 sip-action-card__icon 渲染为 `<image>` 而非路径文本
- [x] A1: 图标尺寸 40rpx×40rpx，垂直居中显示
- [x] A1: home 和 profile 页面图标正常显示（浏览器验证）
- [x] A2: profile 编辑资料按钮对比度 ≥ 4.5:1
- [x] A2: 按钮不被头像光环或其他元素遮挡（z-index: 2）
- [x] A2: 按钮有明显的边框或背景色区分
- [x] A3: discover count-chip "15 次"字号 ≥ 28rpx（30rpx）
- [x] A3: chip 背景对比度 ≥ 4.5:1
- [x] A3: icon 与文字水平居中
- [x] A4: SocialProgressIndicator 卡片使用 card-base--elevated 双层阴影
- [x] A4: 6 步漏斗当前步骤有脉冲动画
- [x] A4: 连接线使用渐变
- [x] A4: 行动卡片整块可点击（@click 在 .sip-action-card 整体）
- [x] A4: 点击行动卡片跳转到对应页面

## Phase B: 交互补全

- [x] B1: 首页功能网格 8 个入口都有 @tap 事件
- [x] B1: 点击入口触发 press-feedback 按压动画
- [x] B1: 8 个入口跳转到正确页面
- [x] B2: "兴趣匹配"和"CP匹配"有 .function-item--highlight 类
- [x] B2: 高亮样式：背景色 + 边框 + scale(1.05) + 阴影增强
- [x] B2: 两个匹配入口右上角有"热门"角标
- [x] B3: discover 页面可上下滑动（无卡顿）
- [x] B3: card-stack 可左右滑动（不与页面滚动冲突）
- [x] B4: 4 个 filter-chip 可点击切换 active 状态
- [x] B4: 筛选栏下方有搜索框
- [x] B4: 搜索框可输入用户名/标签/学校
- [x] B4: 输入时实时过滤推荐列表

## Phase C: 跨页面复用

- [x] C1: MatchCountChip.vue 组件已创建在 components/common/
- [x] C1: 组件接收 count 和 icon props
- [x] C1: 组件 @click 跳转到 /pages/discover/index
- [x] C1: home/index.vue 顶部引入 <MatchCountChip />
- [x] C1: profile/index.vue 顶部引入 <MatchCountChip />
- [x] C1: 3 个页面 chip 显示样式一致
- [x] C1: chip 显示剩余匹配次数（从 discover store 共享）

## Phase D: 视觉强化

- [x] D1: 作者卡片头像有光环（双层 box-shadow）
- [x] D1: 兴趣 chip 颜色根据类别映射（4 种颜色）
- [x] D1: 简介字号 28rpx，最多 2 行（line-clamp: 2）
- [x] D1: 头像左上角有身份徽章小图标
- [x] D2: chat 对方消息左侧显示 32rpx 圆形头像
- [x] D2: chat 自己消息右侧显示 32rpx 圆形头像
- [x] D2: 对方气泡背景使用 brand-50 浅色变体
- [x] D3: chat 输入栏改造为微信风格（4 个按钮 + 输入框）
- [x] D3: 输入框聚焦时显示发送按钮
- [x] D3: 输入栏适配键盘弹起（不遮挡）
- [x] D4: profile-info 顶部有 240rpx 高度的背景图（默认品牌色渐变）
- [x] D4: 头像放大到 128rpx，半遮挡背景
- [x] D4: 数据统计字号增大（value 40rpx, label 24rpx）
- [x] D4: session store 添加 profileBgUrl 字段
- [x] D5: card-stack 支持左右滑动手势
- [x] D5: 左滑触发 pass，右滑触发 like
- [x] D5: 卡片背景图增强（brightness + saturate）
- [x] D5: 当前卡片有特殊视觉（box-shadow + 轻微缩放）
- [x] D6: 课表标题改为"本周安排"
- [x] D6: 显示周一到周日 7 天
- [x] D6: 时段支持 3 种类型显示（课程/活动/自定义）
- [x] D6: 添加类型图例
- [x] D6: 空闲时段显示"✨ 空闲，可添加安排"
- [x] D6: 点击空闲时段弹出添加操作表

## Phase E: 课表编辑优化

- [x] E1: schedule.ts 数据模型扩展 type 字段（course/activity/custom）
- [x] E1: 添加 3 个课程 + 2 个活动 + 1 个自定义的 mock 数据
- [x] E1: session.ts 添加 isCampusVerified getter
- [x] E1: schedule/index.vue 添加 v-if="isCampusVerified" 守卫
- [x] E1: 未认证时显示引导卡片
- [x] E1: "去认证"按钮跳转到 /pages/campus/certification

## Phase F: 浏览器验证 + mp-weixin 整体适配

- [x] F1: Chrome DevTools MCP 截图 5 个核心页面（home/profile/discover/chat-session/village）
- [x] F1: 16 项改动全部通过 DOM 检查
- [x] F1: 控制台无 error 级别日志
- [x] F2: Grep 搜索新代码无 catch { / :hover / backdrop-filter / import.meta.env.DEV 违规
- [x] F2: npx uni build --platform mp-weixin 编译成功（exit code 0）
- [x] F2: mp-weixin 编译产物无新增警告
- [x] F2: 所有改动在 mp-weixin 端不报错（双端验证）
- [x] F3: npx vitest run 201 个测试用例无回归

## Phase G: 硬编码清理

- [x] G1: A-F 改动的 .vue 文件中无 `#[0-9a-fA-F]{3,6}` 颜色字面量（除注释外）
- [x] G1: 所有颜色使用 `var(--c-brand-xxx)` 或 design tokens 引用
- [x] G1: 新增颜色 token 已在 theme/design-variables.scss 中定义
- [x] G1: 替换后视觉效果与原硬编码一致
- [x] G2: A-F 改动的 .vue 文件中无 `font-size: \d+rpx` 字面量（除注释外）
- [x] G2: 所有字号使用 `var(--fs-xxx)` 或 design tokens 引用
- [x] G2: 新增字号 token 已在 theme/design-variables.scss 中定义
- [x] G2: 替换后字号显示一致
- [x] G3: A-F 改动的 .vue 文件中无 `padding|margin|gap: \d+rpx` 字面量（除注释外，允许 0）
- [x] G3: 所有间距使用 `var(--sp-xxx)` 或 design tokens 引用
- [x] G3: 新增间距 token 已在 theme/design-variables.scss 中定义
- [x] G3: 替换后间距显示一致
- [x] G4: A-F 改动的 .vue 文件中无 `/static/assets/...` 路径字面量
- [x] G4: 所有资源路径从 config/assets-index.ts 导入
- [x] G4: 新增资源路径已在 config/assets-index.ts 注册
- [x] G4: 替换后图片正常加载
- [x] G5: 浏览器验证所有改动页面视觉无回归
- [x] G5: mp-weixin 编译验证无新增错误
- [x] G5: 单元测试无回归

## 严格参考验证

- [x] R1: 每项改动对照 `参考/` 目录具体截图（在 tasks.md 中标注参考图）
- [x] R1: SocialProgressIndicator 对照 `参考/screenshot_141.png` 行动卡片
- [x] R1: profile edit-btn 对照 `参考/mobile_141.png` 我的页面
- [x] R1: discover count-chip 对照 `参考/screenshot_142.png` 顶部徽章
- [x] R1: 功能网格对照 `参考/screenshot_141.png` 首页功能宫格
- [x] R1: 匹配入口高亮对照 `参考/img142_top.png`
- [x] R1: 筛选栏对照 `参考/screenshot_142.png`
- [x] R1: 作者卡片对照 `参考/img144_top.png`
- [x] R1: chat 头像+背景对照 `参考/screenshot_144.png`
- [x] R1: chat 输入栏对照 `参考/screenshot_144.png` 底部
- [x] R1: profile-info 背景对照 `参考/mobile_141.png` 头部
- [x] R1: card-stack 对照 `参考/img142_mid.png`
- [x] R1: 课表对照 `参考/img143_mid.png`

## 整体适配验证

- [x] A1: H5 端所有改动正常显示
- [x] A1: mp-weixin 端所有改动正常编译
- [x] A1: mp-weixin 编译产物在微信开发者工具中无报错（用户真机验证）
- [x] A1: 双端交互行为一致（点击/滑动/输入）
