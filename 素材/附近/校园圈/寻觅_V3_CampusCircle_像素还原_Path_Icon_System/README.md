# 寻觅 V3 Campus Circle — 原图 Path 级 Icon System

## 基准
源图：`清新校园圈子发现界面.png`，853 × 1844 px。

本版本不是把整张截图塞进 SVG，而是把截图中可识别的图标重新构造成独立
SVG Path 几何，适合 Figma / Vue3 / uni-app / 微信小程序。

## 已逐项覆盖
1. 底部 Tab：home / nearby / match / message / profile
2. 顶部搜索
3. 校园认证卡：graduation-cap
4. 已认证 / 未认证徽标
5. 查看更多：chevron-down
6. 左右方向：chevron-left / chevron-right
7. 统计类：users / activity / pulse
8. 辅助：more / dot / shield / flame / star / crown
9. iOS 状态栏：signal / wifi / battery

## 颜色 Token
- Primary: #00B86B
- Text: #1A1A1A
- Secondary: #667085
- Disabled: #C7CCD9
- Unverified: #7C5CFF
- Verified BG: #E8FBEF

## 使用原则
所有主图标采用 `currentColor`。不要把颜色写死到组件里。
推荐尺寸：16 / 20 / 24 / 32 px。
推荐默认 stroke：1.5–1.65 @ 24px。

## 关于“100%像素级”
截图是栅格源，不是原始 Figma/SVG 矢量源，因此不存在数学意义上的“100%恢复原始 Bézier
控制点”。本包采取的是“按截图几何、比例、线宽和视觉重量重新矢量化”的生产方式。
如果后续提供原始 Figma / SVG 源，可进一步做到源文件级 1:1。
