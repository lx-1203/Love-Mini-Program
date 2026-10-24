# 07 Progress 进度组件

进度条、匹配度圆环、步骤指示器和雷达匹配动画。

## 文件列表

| 文件名 | 说明 |
|--------|------|
| progress-bar-green.svg | 横向绿色进度条 |
| progress-ring-match.svg | 圆形匹配度圆环（92%，绿色） |
| progress-step-1.svg | 4步指示器 - 第1步 |
| progress-step-2.svg | 4步指示器 - 第2步 |
| match-radar.svg | 雷达/声呐匹配动画帧（同心圆+点） |

## 设计规范

- 进度条渐变：`#6FD4AA` → `#36C99A`
- 圆环使用 `stroke-dasharray` 实现进度
- 雷达动画为静态帧，可用于CSS动画参考
