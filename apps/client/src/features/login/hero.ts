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
