# 图标来源记录（freesvglab + 素材复用）

> 生成时间：2026-08-14T12:20:10.711Z
> 生成脚本：`scripts/download-freesvglab-icons.mjs`
> 风格：freesvglab flat-icon（扁平实心）；徽标类直接复用 `素材` 既有图标。

| 图标 | 来源 | slug / 回退 | URL |
| --- | --- | --- | --- |
| discover | freesvglab | compass | https://freesvglab.com/images/vectors/flat_icon/compass.svg |
| nearby | freesvglab | map-pin | https://freesvglab.com/images/vectors/flat_icon/map-pin.svg |
| heart | freesvglab | heart | https://freesvglab.com/images/vectors/flat_icon/heart.svg |
| chat | freesvglab | speech-bubble | https://freesvglab.com/images/vectors/flat_icon/speech-bubble.svg |
| profile | freesvglab | account-icon | https://freesvglab.com/images/vectors/flat_icon/account-icon.svg |
| star | freesvglab | star-symbol | https://freesvglab.com/images/vectors/flat_icon/star-symbol.svg |
| x | fallback | — | 素材/匹配\icons\x.svg |
| search | fallback | — | 素材/匹配\icons\search.svg |
| edit | fallback | — | 素材/主页\icons\edit.svg |
| more | fallback | — | 素材/匹配\icons\more.svg |
| back | fallback | — | 素材/匹配\icons\back.svg |
| plus | freesvglab | plus-shape | https://freesvglab.com/images/vectors/flat_icon/plus-shape.svg |
| bell | freesvglab | bell | https://freesvglab.com/images/vectors/flat_icon/bell.svg |
| sliders | freesvglab | settings-gear | https://freesvglab.com/images/vectors/flat_icon/settings-gear.svg |
| verify | reuse | — | 素材/匹配\icons\verify.svg |
| online | reuse | — | 素材/匹配\icons\online.svg |

## 使用说明

- tabBar 只支持 PNG：`static/assets/icons/tabbar/*.png`（灰 #7A838D / 品牌绿 #34C98F / 中央白心）。
- 页内 `<image>` 使用 `static/assets/icons/v2/*.svg`（中性色 #20242A，需要品牌色时按需生成色变体）。
- 徽标 verify / online 复用 `素材/匹配/icons`。
