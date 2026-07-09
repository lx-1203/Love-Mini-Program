/**
 * 校园素材自动生成脚本
 *
 * 用法：
 *   npx ts-node scripts/media-gen/generate.ts           # 生成全部
 *   npx ts-node scripts/media-gen/generate.ts videos    # 仅生成视频
 *   npx ts-node scripts/media-gen/generate.ts images    # 仅生成图片
 *
 * 提示：首先生成校园主题图片作为备用素材。
 * 视频需要 Agnes AI 视频 API 端点确认后启用。
 */
import { AGNES_CONFIG, VIDEO_PROMPTS, IMAGE_PROMPTS, ACTIVITY_PROMPTS } from "./config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, "..", "..", "src", "static", "generated");

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("HTTP " + response.status);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log("  已保存:", outputPath);
}

async function generateImage(prompt: string): Promise<string> {
  const response = await fetch(AGNES_CONFIG.imageEndpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + AGNES_CONFIG.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, n: 1, size: "1024x1024" }),
  });
  if (!response.ok) throw new Error("Image API error: " + response.status);
  const data = await response.json();
  return data.data?.[0]?.url || data.url || data.image_url || "";
}

async function generateVideo(prompt: string, duration: number): Promise<string> {
  const response = await fetch(AGNES_CONFIG.videoEndpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + AGNES_CONFIG.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, duration, style: "campus", resolution: "720p" }),
  });
  if (!response.ok) throw new Error("Video API error: " + response.status);
  const data = await response.json();
  return data.videoUrl || data.url || data.video_url || "";
}

async function generateAllImages() {
  console.log("\n========== 开始生成校园图片 ==========\n");
  const allPrompts = [...IMAGE_PROMPTS, ...ACTIVITY_PROMPTS];
  let success = 0, failed = 0;
  for (const item of allPrompts) {
    console.log("生成图片:", item.name, "-", item.id);
    try {
      const url = await generateImage(item.prompt);
      const ext = url.match(/\.(png|jpg|jpeg|webp)(\?|$)/)?.[1] || "png";
      const outputPath = path.join(OUTPUT_DIR, "images", item.id + "." + ext);
      await downloadFile(url, outputPath);
      success++;
    } catch (err) {
      console.error("  失败:", (err as Error).message);
      failed++;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("\n图片生成完成: 成功 " + success + ", 失败 " + failed);
}

async function generateAllVideos() {
  console.log("\n========== 开始生成校园视频 ==========\n");
  let success = 0, failed = 0;
  for (const item of VIDEO_PROMPTS) {
    console.log("生成视频:", item.name, "-", item.id);
    try {
      const url = await generateVideo(item.prompt, item.duration);
      const outputPath = path.join(OUTPUT_DIR, "videos", item.id + ".mp4");
      await downloadFile(url, outputPath);
      success++;
    } catch (err) {
      console.error("  失败:", (err as Error).message);
      failed++;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log("\n视频生成完成: 成功 " + success + ", 失败 " + failed);
}

async function verifyApiKey(): Promise<boolean> {
  try {
    const response = await fetch(AGNES_CONFIG.chatEndpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AGNES_CONFIG.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });
    if (response.ok) {
      console.log("API 密钥验证成功");
      return true;
    }
    console.warn("API 端点返回 " + response.status + " - 可能需要确认正确的端点 URL");
    return false;
  } catch (err) {
    console.warn("API 密钥验证失败:", (err as Error).message);
    console.warn("请确认正确的 API 端点 URL");
    return false;
  }
}

async function main() {
  const mode = process.argv[2] || "all";
  console.log("Agnes AI 校园素材生成器");
  console.log("========================\n");
  const apiOk = await verifyApiKey();
  if (!apiOk) {
    console.log("\n⚠️  API 端点未确认。请先验证 config.ts 中的 API 端点配置。");
    console.log("   当前配置:");
    console.log("   - 视频: " + AGNES_CONFIG.videoEndpoint);
    console.log("   - 图片: " + AGNES_CONFIG.imageEndpoint);
    console.log("   - 对话: " + AGNES_CONFIG.chatEndpoint);
    console.log("\n   如果 API 端点已确认，请手动运行此脚本重试。");
    return;
  }
  if (mode === "images" || mode === "all") await generateAllImages();
  if (mode === "videos" || mode === "all") await generateAllVideos();
}

main().catch(console.error);
