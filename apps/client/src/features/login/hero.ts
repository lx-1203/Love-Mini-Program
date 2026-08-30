import { resolveMediaUrl } from "@/utils/media";
export interface LoginHeroInput {
  heroMode: "animation" | "video";
  heroVideoUrl?: string | null;
  heroPosterUrl?: string | null;
  heroAnimationTheme: string;
  heroTitle: string;
  heroSubtitle: string;
  /** 品牌描述（参考图：慢慢成为特别的人） */
  heroDesc?: string | null;
  /** 品牌描述副行（参考图：校园里的每一次相遇都有美好记录） */
  heroDescSub?: string | null;
  videoFallbackToAnimation: boolean;
}

export interface ResolvedLoginHero extends LoginHeroInput {
  activeMode: "animation" | "video";
  mediaState: "animation" | "video";
}

/**
 * Mock 登录主视觉配置（2026-08-10 包体积优化：4.6MB 本地视频移除，改用动画背景；
 * resolveLoginHero 在 heroMode="video" 且无视频源时自动降级动画）
 */
export const MOCK_LOGIN_HERO: LoginHeroInput = {
  heroMode: "animation",
  heroVideoUrl: null,
  heroPosterUrl: resolveMediaUrl("/static/assets/images/posters/login-poster.png"),
  heroAnimationTheme: "campus-night",
  // 2026-08-25：与 i18n login.heroTitle/heroSubtitle 对齐（规格书 01/02 节）
  heroTitle: "寻觅",
  heroSubtitle: "遇见同频的人",
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
