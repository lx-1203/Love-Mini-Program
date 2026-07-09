# Checklist

## 阶段一：tabBar 图标格式修复

### 源码 tabBar 图标引用
- [x] `apps/client/src/custom-tab-bar/index.js` 中 5 个 tab 的 `iconPath` 与 `activeIconPath` 字段均以 `.png` 结尾
- [x] `apps/client/src/config/navigation.ts` 中 5 个 tab 的 `iconPath` 与 `selectedIconPath` 字段均以 `.png` 结尾
- [x] `apps/client/src/components/layout/TabBar.vue` 中 `defaultTabs` 5 个 tab 的 `iconPath` 与 `selectedIconPath` 字段均以 `.png` 结尾
- [x] 对 `apps/client/src` 执行 `grep "tabbar/.*\.svg"` 返回 0 条匹配

### 资源文件
- [x] `apps/client/src/static/assets/icons/tabbar/` 目录下存在 10 个 `.png` 文件
- [x] `apps/client/src/static/assets/icons/tabbar/` 目录下不存在任何 `.svg` 文件
- [x] 每个 `.png` 文件头为 `89 50 4E 47 0D 0A 1A 0A`（合法 PNG 魔数）
- [x] 每个 `.png` 尺寸为 81×81 像素

### pages.json 与主题色
- [x] `apps/client/src/pages.json` 中 `tabBar.list[0..4].iconPath` 均以 `.png` 结尾
- [x] `apps/client/src/pages.json` 中 `tabBar.list[0..4].selectedIconPath` 均以 `.png` 结尾
- [x] `apps/client/src/pages.json` 中 `tabBar.selectedColor` 为 `#5B7FFF`（蓝色主题保留）

## 阶段二：首页设计同步优化

### Emoji 替换
- [x] `apps/client/src/pages/home/index.vue` 模板中不再出现 🏫🎉📅💬🛍️🔥📍🎊❤️🤍✨ Emoji 字符
- [x] 学校选择器图标使用 `<image src=".../common/school.svg">`
- [x] 5 个区块标题（校园圈活动/课表空档/校园墙/逛逛推荐/社交升温进度）使用对应 SVG 图标
- [x] 帖子位置/点赞/评论/空闲/活动占位均使用 SVG 图标
- [x] 所有引用的 SVG 图标实际存在于 `src/static/assets/icons/common/` 或 `src/static/assets/icons/social/` 目录

### 视频遮罩
- [x] `.home-bg__overlay` 白色不透明度降低至 0.4~0.6 区间
- [x] 叠加品牌色微染层 `rgba(91,127,255,0.05)`
- [x] 视频内容在首页可见

### CSS 变量统一
- [x] `apps/client/src/pages/home/index.vue` 中无 `var(--td-` 引用
- [x] 所有颜色/阴影/边框引用通过 `v-bind('t.color.*')` 等 designTokens 字段

### 区块标题装饰
- [x] `.section__title::before` 伪元素存在
- [x] 伪元素宽度为 4rpx，背景为 `linear-gradient(180deg, brand-400, brand-500)`
- [x] 伪元素与文字间距 12rpx

### WelcomeBanner 装饰
- [x] `apps/client/src/components/home/WelcomeBanner.vue` 中存在至少 3 个装饰圆
- [x] 装饰圆尺寸/位置/透明度各异
- [x] 装饰圆应用 `breathe` 浮动动画

### PersonCard 头像光环
- [x] `apps/client/src/components/home/PersonCard.vue` 中 `isSameSchool === true` 时头像有品牌色 box-shadow 光环
- [x] 光环样式为 `0 0 0 4rpx rgba(91,127,255,0.2), 0 0 16rpx rgba(91,127,255,0.15)`

## 阶段三：构建与验证

### 构建产物
- [x] 执行 `pnpm build:mp-weixin` 构建成功，无 error
- [x] `apps/client/dist/build/mp-weixin/app.json` 中 `tabBar.list[*].iconPath/selectedIconPath` 均以 `.png` 结尾
- [x] `apps/client/dist/build/mp-weixin/custom-tab-bar/index.js` 中所有图标路径均以 `.png` 结尾
- [x] `apps/client/dist/build/mp-weixin/static/assets/icons/tabbar/` 下存在 10 个 `.png` 文件
- [x] `apps/client/dist/build/mp-weixin/static/assets/icons/tabbar/*.png` 文件头均为合法 PNG 魔数

### 蓝色主题保留
- [x] `apps/client/src/theme/tokens.ts` 中 `color.brand.400` 仍为 `#5B7FFF`
- [x] `apps/client/src/theme/design-variables.scss` 中 `$brand-400` 仍为 `#5B7FFF`
- [x] 本次修改未触及 `apps/client/src/theme/` 目录下任何文件
- [x] 项目中未引入 `#3FCF8E`（青藤绿）色板字段

### 最终验证
- [ ] 在微信开发者工具中重新打开 `apps/client/dist/build/mp-weixin/` 项目
- [ ] 控制台不再出现 `["tabBar"]["list"][*]["iconPath"] Wrong file format` 错误
- [ ] 模拟器中 5 个 Tab 图标正常显示，点击切换无 broken image
- [ ] 首页视频背景可见，无 Emoji 出现
- [ ] 首页区块标题左侧有品牌色竖线
- [ ] WelcomeBanner 有多个浮动装饰圆
- [ ] PersonCard 同校头像有蓝色光环
