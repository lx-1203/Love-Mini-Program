import { describe, expect, it } from "vitest";
import { toLocalImage } from "../../utils/image-local";
import { resolveMediaUrl } from "../../utils/media";

/**
 * pexels 外链本地化兜底（2026-08-16）：
 * - toLocalImage：按 URL 尺寸规则确定性映射到本地包内素材；
 * - resolveMediaUrl：统一出口对 pexels 外链直接返回本地路径，不再暴露外链
 *   （此前 PostCard/WallPostCard 等裸 <image> 场景绕过 SafeImage 导致渲染层网络错误）。
 */
describe("pexels 外链本地化兜底", () => {
  it("toLocalImage: w=600 动态配图映射为本地 posts 素材", () => {
    const url = "https://images.pexels.com/photos/313630/pexels-photo-313630.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop";
    const local = toLocalImage(url);
    expect(local).not.toContain("pexels");
    expect(local.startsWith("/static/")).toBe(true);
  });

  it("toLocalImage: w=800 背景图映射为本地 campus 素材", () => {
    const url = "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?w=800";
    const local = toLocalImage(url);
    expect(local).not.toContain("pexels");
    expect(local.startsWith("/static/")).toBe(true);
  });

  it("toLocalImage: 普通 URL 原样返回", () => {
    expect(toLocalImage("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(toLocalImage("/static/assets/icons/x.svg")).toBe("/static/assets/icons/x.svg");
    expect(toLocalImage(null)).toBe("");
  });

  it("resolveMediaUrl: pexels 外链直接本地化（不再暴露外链）", () => {
    const url = "https://images.pexels.com/photos/313630/pexels-photo-313630.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop";
    const resolved = resolveMediaUrl(url);
    expect(resolved).not.toContain("pexels");
    expect(resolved.startsWith("/static/")).toBe(true);
  });

  it("resolveMediaUrl: 非 pexels 绝对 URL 原样返回（行为不变）", () => {
    expect(resolveMediaUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
  });
});
