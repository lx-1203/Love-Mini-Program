# 寻觅 V3 Icon Design System

- 53 个图标
- 16 / 20 / 24 / 32 / 48px
- default / muted / active / disabled / danger
- #1A1A1A / #667085 / #00B86B / #B8C0CC / #FF5A70
- SVG 全部为 path-only
- Vue 3 + TypeScript 可维护组件
- Figma 可直接导入的静态 SVG
- 首页 / 附近 / 匹配 / 消息 / 我的完整业务图标组
- 兴趣圈完整扩展：摄影、旅行、音乐、运动、美食、星空、阅读、电影、游戏、宠物、科技、绘画、咖啡、舞蹈、更多

示例：
```vue
import { Nearby, Heart, Message } from '@/components/xunmi-icons'

<Nearby :size="24" state="active" />
<Heart :size="24" state="danger" />
<Message :size="24" />
```

说明：这是基于你提供的 PNG 截图进行的 Path 级重建；无法从 PNG 恢复原设计文件中不存在于截图的原始控制点，因此不宣称与原始 SVG/Figma 几何数据 100% 相同。
