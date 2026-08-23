# 寻觅 Mascot Design System V2

## 目标
将当前吉祥物总览图整理成正式可开发的资产系统，并统一输出 PNG 多尺寸与真正由 `<path>` 构成的 SVG。

## 资产分类
- `01-mascot`：主吉祥物
- `02-expression`：表情 / 互动
- `03-state`：业务状态
- `04-chat`：聊天气泡
- `05-nav`：导航头像
- `06-avatar`：小头像
- `07-decor`：装饰元素

## PNG 尺寸
16 / 24 / 32 / 48 / 72 / 128 / 256 px

## 设计 Token
- Primary: #34C38F
- Light: #E8FBF2
- Pink: #FF5A91
- Deep: #168B65
- Yellow: #FFECA4
- Text: #222222

## 单个资产结构
`asset-name.master.png`
`asset-name.svg`
`png/asset-name@16.png ... @256.png`

## SVG 规则
- 无 `<image>`
- 无 base64
- 仅使用 `<path>`
- 统一 viewBox：`0 0 256 256`
- 颜色按图像区域进行矢量重建
- 可直接进入 uni-app / Vue 静态资源目录

## 前端用法

```vue
<image src="/static/mascot/mascot_smile.svg" mode="aspectFit" />
```

```css
.mascot {
  width: 72px;
  height: 72px;
  background: url('/static/mascot/mascot_smile.svg') center / contain no-repeat;
}
```

## 生产说明
源素材是 AI 生成的位图总览，不存在可恢复的原始矢量工程，因此 V2 的 SVG 是基于透明切图的路径重建。
它是生产可编辑 SVG，但不能声称与 AI 原图逐像素 100% 相同。若后续需要“品牌母体级”精确矢量，需要针对主吉祥物母体单独重新描摹并锁定控制点。
