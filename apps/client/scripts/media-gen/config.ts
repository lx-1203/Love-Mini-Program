/**
 * 素材生成配置 - 已验证端点的 Agnes AI API
 * 
 * API 基础: https://api.agnes-ai.com/api/
 * 文档: https://agnes-ai.com/zh-Hans/docs/agnes-video-v20
 */

// Agnes AI API 配置 (端点已通过 api.agnes-ai.com/health 验证)
export const AGNES_CONFIG = {
  /** API 基础地址 */
  apiBase: "https://api.agnes-ai.com/api",

  /** API Key - 请在 https://agnes-ai.com 重新生成 */
  apiKey: "sk-PeAzA2C0MerWSzrqDbmiB0xFYTVFT3WJnzkfBC9zv0wjMWLT",

  /** 获取新 Key: https://agnes-ai.com/dashboard/api-keys */

  /** 视频生成 */
  videoEndpoint: "https://api.agnes-ai.com/api/video/generate",
  /** 图片生成 */
  imageEndpoint: "https://api.agnes-ai.com/api/image/generate",
  /** 对话 (用于生成提示词) */
  chatEndpoint: "https://api.agnes-ai.com/api/chat/completions",
  /** 模型列表 */
  modelsEndpoint: "https://api.agnes-ai.com/api/models",
} as const;

// 输出路径配置
export const OUTPUT = {
  videos: "src/static/generated/videos",
  images: "src/static/generated/images",
  campus: "src/static/generated/images/campus",
  avatars: "src/static/generated/images/avatars",
  posters: "src/static/generated/images/posters",
  activities: "src/static/generated/images/activities",
} as const;

// ===== 校园主题视频提示词 =====
export const VIDEO_PROMPTS = [
  {
    id: "campus-spring",
    name: "春日校园",
    prompt: "青春校园，春光明媚，樱花树下学生们漫步聊天，图书馆前草坪上读书，阳光洒在教学楼，温馨浪漫的大学时光，4K cinematic",
    duration: 5,
  },
  {
    id: "campus-sunset",
    name: "黄昏校园",
    prompt: "傍晚的大学校园，夕阳余晖下情侣在湖边散步，路灯渐亮，梧桐叶飘落，温暖柔和的慢镜头画面，4K cinematic",
    duration: 5,
  },
  {
    id: "campus-life",
    name: "校园生活",
    prompt: "大学生活场景：教室里认真听课，操场上跑步打球，食堂里一起用餐，社团活动欢声笑语，青春洋溢的校园日常，4K",
    duration: 8,
  },
  {
    id: "campus-graduation",
    name: "毕业季",
    prompt: "毕业季场景：穿着学士服合影，抛学士帽，拥抱告别，青春的记忆，感人的校园时光，4K cinematic",
    duration: 5,
  },
];

// ===== 校园主题图片提示词 =====
export const IMAGE_PROMPTS = [
  { id: "campus-gate", name: "大学校门", prompt: "Beautiful university campus gate, cherry blossoms, spring sunshine, students walking, warm atmosphere, high quality photography" },
  { id: "campus-library", name: "图书馆", prompt: "Modern university library interior, students studying, warm lighting, bookshelves, peaceful atmosphere" },
  { id: "campus-lake", name: "校园湖景", prompt: "University campus lake with willows, swans, students sitting by the water, golden hour lighting, romantic atmosphere" },
  { id: "campus-playground", name: "操场", prompt: "University sports field, students running basketball, blue sky, vibrant energy, sunny day" },
  { id: "campus-classroom", name: "教室", prompt: "Bright university classroom, students listening, sunlight through windows, modern campus atmosphere" },
  { id: "campus-cafeteria", name: "食堂", prompt: "University cafeteria scene, students eating together, warm lighting, modern interior, lively atmosphere" },
  { id: "campus-dorm", name: "宿舍", prompt: "University dormitory common room, friends hanging out, cozy atmosphere, warm lighting" },
  { id: "campus-club", name: "社团活动", prompt: "University club activity, students performing music, art exhibition, creative atmosphere, vibrant energy" },
  { id: "campus-night", name: "夜晚校园", prompt: "University campus at night, street lamps glowing, quiet pathways, starry sky, romantic atmosphere" },
  { id: "campus-rain", name: "雨中校园", prompt: "University campus in gentle rain, umbrellas, reflections on wet pavement, nostalgic mood, cinematic" },
];

// 活动图片
export const ACTIVITY_PROMPTS = [
  { id: "music-festival", name: "音乐节", prompt: "University outdoor music festival, students enjoying live band, colorful lights, energetic crowd" },
  { id: "sports-day", name: "运动会", prompt: "University sports day, track and field, cheering crowds, athletes competing, sunny day, vibrant energy" },
  { id: "art-exhibition", name: "艺术展", prompt: "University art exhibition, paintings on walls, students appreciating artwork, elegant gallery atmosphere" },
];

export default { AGNES_CONFIG, OUTPUT, VIDEO_PROMPTS, IMAGE_PROMPTS, ACTIVITY_PROMPTS };
