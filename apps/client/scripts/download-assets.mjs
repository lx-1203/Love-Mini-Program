import { writeFileSync, mkdirSync, existsSync, statSync, readdirSync, unlinkSync } from "fs";
import { dirname, resolve, basename } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATIC_DIR = resolve(__dirname, "..", "src", "static", "assets");

/**
 * 图片生成配置
 * 使用 TRAE 内置 text_to_image API
 * size 取值参考: portrait_16_9 / landscape_4_3 / landscape_16_9 / square_hd / square
 */
const IMAGE_CONFIGS = [
  // ===== posters/ 首页/登录页海报 =====
  {
    name: "home-poster",
    subdir: "images/posters",
    filename: "home-poster.jpg",
    size: "portrait_16_9",
    prompt: "青春校园大学校园全景，阳光明媚，绿树成荫的林荫道，现代化教学楼，蓝天白云，温暖明亮的色调，适合手机APP首页背景，高品质摄影风格，无人物，唯美浪漫，樱花飘落，春日校园",
  },
  {
    name: "login-poster",
    subdir: "images/posters",
    filename: "login-poster.jpg",
    size: "portrait_16_9",
    prompt: "校园黄昏浪漫场景，夕阳下的教学楼，情侣剪影，金色阳光，唯美浪漫氛围，青春校园风格，高品质摄影，温暖橙黄色调",
  },

  // ===== posts/ 社区帖子图 =====
  {
    name: "campus-library",
    subdir: "images/posts",
    filename: "campus-library.jpg",
    size: "landscape_4_3",
    prompt: "大学校园图书馆内部场景，阳光透过窗户洒在书架上，温暖的阅读氛围，青春校园风格，高品质摄影，唯美浪漫，书籍整齐排列，木质书桌",
  },
  {
    name: "post-placeholder",
    subdir: "images/posts",
    filename: "post-placeholder.jpg",
    size: "landscape_4_3",
    prompt: "校园风景占位图，樱花树下长椅，绿色草坪，春日校园，唯美浪漫，柔和光线，高品质摄影，无人",
  },

  // ===== activities/ 活动图片 =====
  {
    name: "activity-1",
    subdir: "images/activities",
    filename: "activity-1.jpg",
    size: "landscape_4_3",
    prompt: "校园音乐节现场，舞台灯光，年轻大学生观众挥手，夜晚霓虹灯效果，青春活力氛围，高品质摄影，演唱会场景",
  },
  {
    name: "activity-2",
    subdir: "images/activities",
    filename: "activity-2.jpg",
    size: "landscape_4_3",
    prompt: "学生社团活动，大学校园社团招新展台，彩色气球和横幅，年轻大学生交流互动，青春活力，阳光明媚，高品质摄影",
  },
  {
    name: "activity-3",
    subdir: "images/activities",
    filename: "activity-3.jpg",
    size: "landscape_4_3",
    prompt: "校园运动比赛，大学操场篮球赛，学生运动员激烈对抗，观众席欢呼，青春热血氛围，阳光金色光芒，高品质体育摄影",
  },

  // ===== products/ 商品图片 =====
  {
    name: "food-1",
    subdir: "images/products",
    filename: "food-1.jpg",
    size: "square_hd",
    prompt: "大学校园食堂美食套餐，营养搭配均衡的学生餐，餐盘里有米饭、蔬菜、肉类，清新校园风格，美食摄影，暖色调，俯拍",
  },
  {
    name: "food-2",
    subdir: "images/products",
    filename: "food-2.jpg",
    size: "square_hd",
    prompt: "校园咖啡厅甜点，精致蛋糕和咖啡，木质桌面，文艺清新氛围，暖色调，高品质美食摄影，青春校园风格",
  },
  {
    name: "merch-1",
    subdir: "images/products",
    filename: "merch-1.jpg",
    size: "square_hd",
    prompt: "大学校园文创帆布袋，印着大学校徽图案，文艺清新风格，放在木质桌面上，旁边有书本和咖啡，青春校园文创产品，高品质产品摄影",
  },
  {
    name: "merch-2",
    subdir: "images/products",
    filename: "merch-2.jpg",
    size: "square_hd",
    prompt: "校园徽章纪念品，金属质感校徽别针，精致工艺，放在丝绒衬布上，特写镜头，高品质产品摄影，文艺复古风格",
  },
  {
    name: "ticket-1",
    subdir: "images/products",
    filename: "ticket-1.jpg",
    size: "square_hd",
    prompt: "校园音乐节门票设计，青春活力风格，霓虹灯光效果，舞台背景，音乐符号元素，大学生音乐节早鸟票，高品质设计，色彩鲜艳",
  },
  {
    name: "ticket-2",
    subdir: "images/products",
    filename: "ticket-2.jpg",
    size: "square_hd",
    prompt: "校园电影票设计，复古文艺风格，电影院场景，爆米花和可乐元素，大学生情侣观影主题，高品质平面设计，温暖色调",
  },

  // ===== banners/ 横幅 =====
  {
    name: "village-banner",
    subdir: "images/banners",
    filename: "village-banner.jpg",
    size: "landscape_16_9",
    prompt: "大学校园樱花大道，粉色樱花盛开，情侣漫步，浪漫青春氛围，春日校园，阳光透过花瓣，唯美浪漫，高品质摄影，横幅构图",
  },

  // ===== avatars/ 用户头像（4男4女） =====
  {
    name: "avatar-1",
    subdir: "images/avatars",
    filename: "avatar-1.jpg",
    size: "square",
    prompt: "阳光男孩头像，短发，微笑，清新自然，青春大学生，纯色背景，半身像，高品质人像摄影，温暖光线",
  },
  {
    name: "avatar-2",
    subdir: "images/avatars",
    filename: "avatar-2.jpg",
    size: "square",
    prompt: "文艺女孩头像，长发，温柔笑容，清新自然，青春大学生，纯色背景，半身像，高品质人像摄影，柔和光线",
  },
  {
    name: "avatar-3",
    subdir: "images/avatars",
    filename: "avatar-3.jpg",
    size: "square",
    prompt: "学霸男孩头像，戴眼镜，知性气质，清新自然，青春大学生，纯色背景，半身像，高品质人像摄影，柔和光线",
  },
  {
    name: "avatar-4",
    subdir: "images/avatars",
    filename: "avatar-4.jpg",
    size: "square",
    prompt: "活力女孩头像，马尾辫，阳光笑容，清新自然，青春大学生，纯色背景，半身像，高品质人像摄影，明亮光线",
  },
  {
    name: "avatar-5",
    subdir: "images/avatars",
    filename: "avatar-5.jpg",
    size: "square",
    prompt: "潮流男孩头像，时尚发型，自信微笑，清新自然，青春大学生，纯色背景，半身像，高品质人像摄影，现代感",
  },
  {
    name: "avatar-6",
    subdir: "images/avatars",
    filename: "avatar-6.jpg",
    size: "square",
    prompt: "甜美女孩头像，圆脸可爱，温暖笑容，清新自然，青春大学生，纯色背景，半身像，高品质人像摄影，柔美光线",
  },
  {
    name: "avatar-7",
    subdir: "images/avatars",
    filename: "avatar-7.jpg",
    size: "square",
    prompt: "运动男孩头像，健康阳光，自信微笑，清新自然，青春大学生，纯色背景，半身像，高品质人像摄影，明亮户外光线",
  },
  {
    name: "avatar-8",
    subdir: "images/avatars",
    filename: "avatar-8.jpg",
    size: "square",
    prompt: "优雅女孩头像，气质佳，温柔微笑，清新自然，青春大学生，纯色背景，半身像，高品质人像摄影，柔和光线",
  },
];

/** 下载单张图片（核心实现） */
function downloadImage(url, destPath, { maxRedirect = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 60000 }, (res) => {
      // 处理重定向
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirect > 0) {
        res.resume();
        return downloadImage(res.headers.location, destPath, { maxRedirect: maxRedirect - 1 })
          .then(resolve)
          .catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const buffer = Buffer.concat(chunks);
          if (buffer.length === 0) {
            return reject(new Error("Empty response body"));
          }
          mkdirSync(dirname(destPath), { recursive: true });
          writeFileSync(destPath, buffer);
          resolve({ size: buffer.length, path: destPath });
        } catch (e) {
          reject(e);
        }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timeout"));
    });
  });
}

/** URL encode */
function enc(str) {
  return encodeURIComponent(str);
}

/** 获取图片备用 URL（picsum 随机图，根据 size 推算宽高） */
function getFallbackUrl(size) {
  const sizeMap = {
    portrait_16_9: "720/1280",
    landscape_4_3: "800/600",
    landscape_16_9: "1280/720",
    square_hd: "800/800",
    square: "600/600",
  };
  const dims = sizeMap[size] || "800/600";
  return `https://picsum.photos/${dims}`;
}

/** 单个配置的下载流程：含重试 + 备用图源 */
async function downloadWithRetry(cfg, destPath) {
  const primaryUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${enc(cfg.prompt)}&image_size=${cfg.size}`;
  const minSize = cfg.subdir === "images/avatars" ? 5 * 1024 : 10 * 1024;

  // 主源最多重试 3 次（首次 + 2 次重试）
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await downloadImage(primaryUrl, destPath);
      if (result.size >= minSize) {
        return { ...result, source: "trae", attempt };
      }
      // 文件太小，视为失败
      lastErr = new Error(`File too small: ${result.size} bytes (need >= ${minSize})`);
    } catch (e) {
      lastErr = e;
    }
    console.log(`   (重试 ${attempt}/3 失败: ${lastErr.message})`);
  }

  // 备用源：picsum 最多重试 2 次
  const fallbackUrl = getFallbackUrl(cfg.size);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await downloadImage(fallbackUrl, destPath);
      if (result.size >= minSize) {
        return { ...result, source: "picsum", attempt };
      }
      lastErr = new Error(`Fallback file too small: ${result.size} bytes`);
    } catch (e) {
      lastErr = e;
    }
    console.log(`   (备用源重试 ${attempt}/2 失败: ${lastErr.message})`);
  }

  throw lastErr;
}

async function main() {
  console.log("开始下载青春校园主题素材...\n");

  const results = [];
  for (const cfg of IMAGE_CONFIGS) {
    const dir = resolve(STATIC_DIR, cfg.subdir);
    const destPath = resolve(dir, cfg.filename);

    // 检查是否已存在且足够大
    if (existsSync(destPath)) {
      const stat = statSync(destPath);
      const minSize = cfg.subdir === "images/avatars" ? 5 * 1024 : 10 * 1024;
      if (stat.size >= minSize) {
        console.log(`[SKIP] ${cfg.name} 已存在 (${(stat.size / 1024).toFixed(1)} KB)`);
        results.push({ name: cfg.name, status: "exists", path: destPath, size: stat.size });
        continue;
      }
    }

    console.log(`[GET ] ${cfg.name} (${cfg.size})...`);

    try {
      const result = await downloadWithRetry(cfg, destPath);
      const sourceTag = result.source === "picsum" ? " [picsum]" : "";
      console.log(`[OK  ] ${cfg.name} -> ${(result.size / 1024).toFixed(1)} KB${sourceTag}`);
      results.push({
        name: cfg.name,
        status: "downloaded",
        path: destPath,
        size: result.size,
        source: result.source,
      });
    } catch (e) {
      console.error(`[FAIL] ${cfg.name}:`, e.message);
      results.push({ name: cfg.name, status: "failed", error: e.message });
    }
  }

  console.log("\n===== 下载结果 =====");
  const ok = results.filter((r) => r.status === "downloaded" || r.status === "exists").length;
  const fail = results.filter((r) => r.status === "failed").length;
  console.log(`成功: ${ok}, 失败: ${fail}`);

  if (fail > 0) {
    console.log("\n失败项:");
    results
      .filter((r) => r.status === "failed")
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  // 输出最终目录清单
  console.log("\n===== 最终文件清单 =====");
  const subdirs = ["images/posters", "images/posts", "images/activities", "images/products", "images/banners", "images/avatars"];
  for (const sub of subdirs) {
    const dir = resolve(STATIC_DIR, sub);
    if (!existsSync(dir)) {
      console.log(`\n[${sub}] (目录不存在)`);
      continue;
    }
    const files = readdirSync(dir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)).sort();
    console.log(`\n[${sub}] (${files.length} 个文件)`);
    for (const f of files) {
      const fp = resolve(dir, f);
      const s = statSync(fp);
      console.log(`  - ${f}: ${(s.size / 1024).toFixed(1)} KB`);
    }
  }

  if (fail > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
