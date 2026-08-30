import { describe, expect, it } from "vitest";
import { resolveLoginHero } from "../features/login/hero";

describe("resolveLoginHero", () => {
  it("falls back to animation when video mode has no source", () => {
    expect(
      resolveLoginHero({
        heroMode: "video",
        heroVideoUrl: "",
        heroPosterUrl: "",
        heroAnimationTheme: "campus-night",
        heroTitle: "校园恋爱",
        heroSubtitle: "先从内容认识彼此",
        videoFallbackToAnimation: true,
      })
    ).toMatchObject({
      mediaState: "animation",
      activeMode: "animation",
    });
  });

  it("keeps video mode when a playable source exists", () => {
    expect(
      resolveLoginHero({
        heroMode: "video",
        heroVideoUrl: "https://example.com/hero.mp4",
        heroPosterUrl: "https://example.com/poster.jpg",
        heroAnimationTheme: "campus-night",
        heroTitle: "校园恋爱",
        heroSubtitle: "先从内容认识彼此",
        videoFallbackToAnimation: true,
      })
    ).toMatchObject({
      mediaState: "video",
      activeMode: "video",
    });
  });
});
