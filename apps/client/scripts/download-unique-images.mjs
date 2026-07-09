/**
 * 下载真实不同的图片 - 使用 picsum.photos 的 seed 参数
 * 确保每张图片内容不同，MD5 哈希不同
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATIC_DIR = resolve(__dirname, "..", "src", "static", "assets");

/**
 * 图片配置 - 每张图片使用不同的 seed 确保内容不同
 */
const IMAGE_CONFIGS = [
  // ===== posters/ 海报 =====
  { subdir: "images/posters", filename: "home-poster.jpg", seed: "campus-home-001", dims: "720/1280" },
  { subdir: "images/posters", filename: "login-poster.jpg", seed: "campus-login-002", dims: "720/1280" },
  { subdir: "images/posters", filename: "login-poster.png", seed: "campus-login-png-003", dims: "720/1280" },

  // ===== posts/ 社区帖子图 =====
  { subdir: "images/posts", filename: "campus-library.jpg", seed: "library-004", dims: "800/600" },
  { subdir: "images/posts", filename: "post-placeholder.jpg", seed: "placeholder-005", dims: "800/600" },
  { subdir: "images/posts", filename: "post-1.jpg", seed: "post-cafe-101", dims: "800/600" },
  { subdir: "images/posts", filename: "post-2.jpg", seed: "post-library-102", dims: "800/600" },
  { subdir: "images/posts", filename: "post-3.jpg", seed: "post-playground-103", dims: "800/600" },
  { subdir: "images/posts", filename: "post-4.jpg", seed: "post-dorm-104", dims: "800/600" },
  { subdir: "images/posts", filename: "post-5.jpg", seed: "post-classroom-105", dims: "800/600" },
  { subdir: "images/posts", filename: "post-6.jpg", seed: "post-lake-106", dims: "800/600" },
  { subdir: "images/posts", filename: "post-7.jpg", seed: "post-night-107", dims: "800/600" },
  { subdir: "images/posts", filename: "post-8.jpg", seed: "post-club-108", dims: "800/600" },

  // ===== activities/ 活动图片 =====
  { subdir: "images/activities", filename: "activity-1.jpg", seed: "activity-music-006", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-2.jpg", seed: "activity-club-007", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-3.jpg", seed: "activity-sport-008", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-4.jpg", seed: "activity-film-109", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-5.jpg", seed: "activity-art-110", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-6.jpg", seed: "activity-volunteer-111", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-sports.jpg", seed: "activity-sports-009", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-study.jpg", seed: "activity-study-010", dims: "800/600" },

  // ===== products/ 商品图片 =====
  { subdir: "images/products", filename: "food-1.jpg", seed: "food-meal-011", dims: "600/600" },
  { subdir: "images/products", filename: "food-2.jpg", seed: "food-dessert-012", dims: "600/600" },
  { subdir: "images/products", filename: "merch-1.jpg", seed: "merch-bag-013", dims: "600/600" },
  { subdir: "images/products", filename: "merch-2.jpg", seed: "merch-badge-014", dims: "600/600" },
  { subdir: "images/products", filename: "ticket-1.jpg", seed: "ticket-music-015", dims: "600/600" },
  { subdir: "images/products", filename: "ticket-2.jpg", seed: "ticket-movie-016", dims: "600/600" },

  // ===== banners/ 横幅 =====
  { subdir: "images/banners", filename: "village-banner.jpg", seed: "banner-sakura-017", dims: "1280/720" },
  { subdir: "images/banners", filename: "home-banner.jpg", seed: "banner-campus-118", dims: "1280/720" },

  // ===== avatars/ 用户头像（共 12 张，每张 seed 唯一确保 MD5 不同）=====
  { subdir: "images/avatars", filename: "avatar-1.jpg", seed: "avatar-boy1-018", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-2.jpg", seed: "avatar-girl1-019", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-3.jpg", seed: "avatar-boy2-020", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-4.jpg", seed: "avatar-girl2-021", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-5.jpg", seed: "avatar-boy3-022", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-6.jpg", seed: "avatar-girl3-023", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-7.jpg", seed: "avatar-boy4-024", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-8.jpg", seed: "avatar-girl4-025", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-9.jpg", seed: "avatar-boy5-126", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-10.jpg", seed: "avatar-girl5-127", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-11.jpg", seed: "avatar-boy6-128", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-12.jpg", seed: "avatar-girl6-129", dims: "400/400" },
];

/** 下载单张图片 */
function downloadImage(url, destPath, maxRedirect = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirect > 0) {
        res.resume();
        return downloadImage(res.headers.location, destPath, maxRedirect - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) return reject(new Error("Empty body"));
        mkdirSync(dirname(destPath), { recursive: true });
        writeFileSync(destPath, buffer);
        resolve({ size: buffer.length });
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Timeout")));
  });
}

async function downloadWithRetry(cfg, destPath) {
  const url = `https://picsum.photos/seed/${cfg.seed}/${cfg.dims}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await downloadImage(url, destPath);
      // 验证文件大小 ≥ 10KB（避免占位文件）
      if (result.size >= 10 * 1024) return result;
    } catch (e) {
      console.log(`   (重试 ${attempt}/3: ${e.message})`);
    }
  }
  throw new Error(`下载失败: ${cfg.filename}`);
}

async function main() {
  console.log("开始下载真实不同的图片...\n");
  const results = [];
  for (const cfg of IMAGE_CONFIGS) {
    const destPath = resolve(STATIC_DIR, cfg.subdir, cfg.filename);
    console.log(`[GET] ${cfg.filename} (seed: ${cfg.seed})...`);
    try {
      const result = await downloadWithRetry(cfg, destPath);
      console.log(`[OK] ${cfg.filename} -> ${(result.size / 1024).toFixed(1)} KB`);
      results.push({ name: cfg.filename, size: result.size });
    } catch (e) {
      console.error(`[FAIL] ${cfg.filename}: ${e.message}`);
      results.push({ name: cfg.filename, error: e.message });
    }
  }
  const ok = results.filter((r) => r.size).length;
  const fail = results.filter((r) => r.error).length;
  console.log(`\n===== 结果: 成功 ${ok}, 失败 ${fail} =====`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
