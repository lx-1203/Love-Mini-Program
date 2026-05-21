package com.campuslove.api.growth;

public record LoginHeroConfigView(
    String heroMode,
    String heroVideoUrl,
    String heroPosterUrl,
    String heroAnimationTheme,
    String heroTitle,
    String heroSubtitle,
    boolean videoFallbackToAnimation
) {
}
