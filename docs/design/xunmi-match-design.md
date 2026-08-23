# 寻觅 · 纯匹配版 UI/UX 设计规范（唯一视觉依据）

> 版本：v2（纯匹配产品收敛 · A+B 融合）  
> 依据：`素材/匹配/DESIGN_GUIDE.md`（最终规范）+ `素材/主页/DESIGN_GUIDE.md`（发现/附近/我的/他人主页结构）  
> 适用范围：微信小程序（mp-weixin）C 端 + 后端契约 + Admin 后台一致性  
> 冲突消解原则：两包存在差异时，以本文件为准；本文件未覆盖处，以 `素材/匹配` 优先。

## 1. 核心理念

产品主线：**发现 → 看人 → 喜欢/超级喜欢/跳过 → 匹配成功 → 打招呼 → 聊天**。

- 绿色负责「认识与品牌」，粉色负责「心动与关系」，蓝色负责「互动与消息」。
- 第一视觉永远是「人」，不是功能入口；不做传统论坛式兴趣圈，兴趣圈是「认识同好的理由」。
- 页面最多 2~3 个视觉重点；恋爱动作用粉色，品牌动作用绿色。
- 照片、姓名、标签、匹配率等一切用户数据必须由 WXML 动态渲染，SVG 只负责图标与固定视觉 shell，禁止整页 SVG。

## 2. 颜色 Token（唯一语义）

| Token | 值 | 语义 |
|---|---|---|
| `--brand` | `#34C38F` | 品牌 / 在线 / 认证 / 附近 / 匹配主入口（浮岛） |
| `--brand-dark` | `#269B70` | 品牌深色 |
| `--brand-light` | `#E9FBF3` | 品牌浅背景 |
| `--pink` | `#FF5D9E` | 喜欢 / 心动 / 匹配结果（成功页、匹配度） |
| `--pink-light` | `#FFF0F7` | 心动浅背景 |
| `--blue` | `#4D8DFF` | 消息与互动 / 超级喜欢 |
| `--purple` | `#A87BFA` | 浪漫 / 特殊兴趣（扩展 Token，本期不强制使用） |
| `--page` | `#F7FAF9` | 页面背景 |
| `--text` | `#222222` | 主文字 |
| `--subtext` | `#7A7A7A` | 次级文字 |
| `--line` | `#EEF2F1` | 分隔线 |
| 灰 | `#7A7A7A` | 跳过 / 次要操作 |

代码落点：`src/theme/design-variables.scss`、`src/theme/tokens.ts`、`src/styles/tokens.scss`（含 `--color-blue` 别名）。

## 3. 底部导航（唯一入口）

固定五项，顺序不可变；「匹配」为唯一凸起主入口（绿色圆形浮岛 + 白色爱心）：

```
发现  附近  🟢♥匹配  消息  我的
```

- 未选中图标：灰 `#7A7A7A`；选中：绿 `#34C38F`；中心浮岛：绿色圆 56–64rpx + 白心 + 轻微阴影 + 品牌绿标签。
- 消息 Tab 保留未读角标。
- 实现：`src/config/navigation.ts`（唯一真相源）→ `src/pages.json`、`src/custom-tab-bar/*`、H5 `TabBar.vue` 同步；`scripts/check-tabbar-consistency.mjs` 保证三处一致。
- Tab 页面：发现=`/pages/home/index`、附近=`/pages/nearby/index`、匹配=`/pages/discover/index`、消息=`/pages/messages/index`、我的=`/pages/profile/index`。

## 4. 匹配页（沉浸式大图卡）

- 大图 ≥70% 视觉区域；左上距离 chip、右上在线徽标。
- 底部黑色透明渐变直接叠信息（**禁止白色资料卡**），顺序：
  姓名 + 年龄 + 认证徽章 → 学校 · 年级 · 距离 → 兴趣标签 → 一句话简介 → `♥ 80% 与你很合拍`（匹配度置底）。
- 右侧竖向操作：`❤️ 喜欢`（粉）、`☆ 超级喜欢`（蓝）、`× 跳过`（灰半透明），与左右滑手势并存。
- 保留：详情弹层、长按菜单、悄悄话解锁、匹配成功双头像碰撞动画 + 双 CTA（去打个招呼 / 继续探索）。
- 视频功能已删除：无视频角标、无 video-player 页、无 `personalVideoUrl` 对外字段（DB 列保留不迁移）。

## 5. 匹配成功页 / 匹配列表 / 聊天详情

- 匹配成功页：粉色主题，仅两个 CTA：`去打个招呼` / `继续探索`。
- 匹配列表：重构自 likes 页（喜欢我的 / 我喜欢的 / 访客），卡片列表样式，接口与 store 不变。
- 聊天详情：蓝色互动语义（气泡、头像、导航统一 Token），不新增聊天功能。

## 6. 发现页

首屏只回答「今天可以认识谁」：问候语（Hi，同学）→ 搜索 → 今日心动推荐单卡 → 兴趣圈/校园/活动入口。签到等弱功能移出首屏（签到入口放「我的」次级位置）。

## 7. 附近页

顶部筛选：`附近的人 / 兴趣圈 / 校园 / 活动`（默认附近的人）。附近的人复用 CardSwiper（`distanceMax` 过滤）；兴趣圈/校园/活动复用现有 store 与入口，不加后端聚合接口。

## 8. 我的主页 / 他人主页

- 我的：恋爱名片优先（头像、姓名、年龄、学校、简介、认证 → 编辑名片 → 动态/照片墙/兴趣/圈子），模块可显示/隐藏，长按拖动排序。
- 他人：大图 → 姓名年龄 → 学校/距离/在线 → 一句话 → 共同点 → 动态 → 喜欢/私聊；身高/收入等折叠到「更多资料」。

## 9. 组件与资源

- 组件命名：`MatchCard / MatchActions / BottomNav / MatchSuccess / MatchList / MessageItem / InterestTag / OnlineBadge / VerifyBadge / CircleCard / PostCard / CommonPoints / HeartValue`。
- 图标资源（v2）：核心图标来自 freesvglab flat-icon（脚本 `scripts/download-freesvglab-icons.mjs` 自动下载，来源记录 `docs/design/icon-source.md`），缺失项回退复用 `素材/匹配/icons`、`素材/主页/icons` 既有矢量图标；原始 SVG 归档于 `docs/design/icon-src/`。
- 运行态资源：`/static/assets/icons/tabbar/*.png`（Tab 三态：灰 #7A838D / 品牌绿 #34C98F / 中央白心，微信 tabBar 仅支持 PNG）、`/static/assets/icons/v2/*.png`（96px 运行态图标与品牌色变体，如 heart-pink / star-blue / x-gray）。
- 小程序用法：`<image class="icon" src="/static/assets/icons/v2/heart-pink.png" mode="aspectFit" />`，WXSS `width:44rpx;height:44rpx`；图标为固定色 PNG（`<image>` 不继承 currentColor）。

## 10. 未登录

不用「禁止访问」：价值说明（附近的人 / 兴趣圈 / 匹配聊天）+ 主按钮「登录并开始探索」+ 次按钮「先逛逛」。