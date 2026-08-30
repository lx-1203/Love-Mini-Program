# 01 Tabbar 底部导航栏图标

底部导航栏使用的5个核心图标，24x24 尺寸，outline 风格，使用 currentColor 便于着色。

## 文件列表

| 文件名 | 说明 |
|--------|------|
| home.svg | 首页图标（房子形状） |
| nearby.svg | 附近图标（定位针） |
| match.svg | 匹配图标（心形） |
| message.svg | 消息图标（带三个点的聊天气泡） |
| profile.svg | 我的图标（人物轮廓） |

## 使用说明

- 所有图标均为 24x24 viewBox
- 使用 `currentColor` 作为 stroke 颜色，可通过 CSS `color` 属性修改颜色
- 激活态设置 `color: #36C99A`，未激活态设置 `color: #999`
- 统一 `stroke-linecap="round"` 和 `stroke-linejoin="round"` 风格
