export interface LoginHeroInput {
  heroMode: "animation" | "video";
  heroVideoUrl?: string | null;
  heroPosterUrl?: string | null;
  heroAnimationTheme: string;
  heroTitle: string;
  heroSubtitle: string;
  videoFallbackToAnimation: boolean;
}

export interface ResolvedLoginHero extends LoginHeroInput {
  activeMode: "animation" | "video";
  mediaState: "animation" | "video";
}

/**
 * Mock 登录主视觉配置（视频背景）
 * heroVideoUrl 指向本地校园背景视频，resolveLoginHero 解析后 activeMode 为 "video"
 */
export const MOCK_LOGIN_HERO: LoginHeroInput = {
  heroMode: "video",
  heroVideoUrl: "/static/assets/videos/campus-bg.mp4",
  heroPosterUrl: "/static/assets/images/posters/login-poster.jpg",
  heroAnimationTheme: "campus-night",
  heroTitle: "校园恋爱",
  heroSubtitle: "先从推荐的人、讨论圈、活动和临时聊天开始认识彼此。",
  videoFallbackToAnimation: true,
};

export function resolveLoginHero(input: LoginHeroInput): ResolvedLoginHero {
  const hasVideoSource = Boolean(input.heroVideoUrl?.trim());
  const shouldFallback =
    input.heroMode === "video" && input.videoFallbackToAnimation && !hasVideoSource;

  return {
    ...input,
    activeMode: shouldFallback ? "animation" : input.heroMode,
    mediaState: shouldFallback ? "animation" : input.heroMode,
  };
}
