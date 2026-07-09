# 校园素材自动生成

## 目录结构

```
scripts/media-gen/
├── config.ts        # API 配置 + 提示词
├── generate.ts      # 生成脚本
├── README.md        # 本文件

src/static/generated/      # 生成的素材输出目录
├── videos/                # 生成的视频 (.mp4)
├── images/                # 生成的图片 (.png)
│   ├── campus-*.png       # 校园场景
│   ├── music-festival.png # 活动图片
│   └── ...

src/config/
└── assets-index.ts        # 素材路径索引（供应用引用）
```

## 使用方法

### 1. 确认 API 端点

首次使用前，请访问 https://agnes-ai.com/zh-Hans/docs/agnes-video-v20
确认正确的 API 端点，然后更新 `config.ts` 中的地址：

```ts
export const AGNES_CONFIG = {
  apiKey: 'sk-...',
  videoEndpoint: 'https://api.agnes-ai.com/v20/video/generate',  // 确认此 URL
  imageEndpoint: 'https://api.agnes-ai.com/v20/image/generate',
  chatEndpoint: 'https://api.agnes-ai.com/v20/chat/completions',
};
```

### 2. 生成图片

```bash
cd apps/client
npx ts-node scripts/media-gen/generate.ts images
```

### 3. 生成视频

```bash
cd apps/client
npx ts-node scripts/media-gen/generate.ts videos
```

### 4. 生成全部

```bash
cd apps/client
npx ts-node scripts/media-gen/generate.ts
```

## 提示词说明

所有提示词都在 `config.ts` 中集中管理：

- `IMAGE_PROMPTS` - 校园场景图片（10 个）
- `ACTIVITY_PROMPTS` - 活动图片（3 个）
- `VIDEO_PROMPTS` - 校园主题视频（4 个）

可在 `config.ts` 中直接修改或添加新的提示词。
