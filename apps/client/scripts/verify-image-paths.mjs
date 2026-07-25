/**
 * 手动验证 IMAGE_PATHS 中的所有关键路径
 */

import { readdirSync, existsSync } from "fs";
import { join, resolve, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const SRC_DIR = resolve(__dirname, "..", "src");
const STATIC_ASSETS_DIR = resolve(SRC_DIR, "static", "assets");

function listFiles(dir) {
  const result = [];
  if (!existsSync(dir)) return result;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }
  return result;
}

function toWebPath(fsPath) {
  const rel = relative(STATIC_ASSETS_DIR, fsPath).replace(/\\/g, "/");
  return "/static/assets/" + rel;
}

const allAssetFiles = listFiles(STATIC_ASSETS_DIR);
const existingPaths = new Set(allAssetFiles.map(f => toWebPath(f)));

// 根据 IMAGE_PATHS 的定义手动构造所有路径进行验证
const STATIC_BASE = "/static/assets";
const IMAGES = STATIC_BASE + "/images";
const AVATAR_BASE = IMAGES + "/avatars";
const ICONS_BASE = STATIC_BASE + "/icons";

const pathsToCheck = {
  POST_PLACEHOLDER: IMAGES + "/posts/post-placeholder.jpg",
  DEFAULT_AVATAR: STATIC_BASE + "/default-avatar.jpg",

  // AVATARS
  "AVATARS.AVATAR_1": AVATAR_BASE + "/avatar-1.jpg",
  "AVATARS.AVATAR_2": AVATAR_BASE + "/avatar-2.jpg",
  "AVATARS.AVATAR_3": AVATAR_BASE + "/avatar-3.jpg",
  "AVATARS.AVATAR_4": AVATAR_BASE + "/avatar-4.jpg",
  "AVATARS.AVATAR_5": AVATAR_BASE + "/avatar-5.jpg",
  "AVATARS.AVATAR_6": AVATAR_BASE + "/avatar-6.jpg",
  "AVATARS.AVATAR_7": AVATAR_BASE + "/avatar-7.jpg",
  "AVATARS.AVATAR_8": AVATAR_BASE + "/avatar-8.jpg",
  "AVATARS.AVATAR_9": AVATAR_BASE + "/avatar-9.jpg",
  "AVATARS.AVATAR_10": AVATAR_BASE + "/avatar-10.jpg",
  "AVATARS.AVATAR_11": AVATAR_BASE + "/avatar-11.jpg",
  "AVATARS.AVATAR_12": AVATAR_BASE + "/avatar-12.jpg",
  "AVATARS.DEFAULT": STATIC_BASE + "/default-avatar.jpg",

  // POSTS
  "POSTS.CAMPUS_LIBRARY": IMAGES + "/posts/campus-library.jpg",
  "POSTS.POST_PLACEHOLDER": IMAGES + "/posts/post-placeholder.jpg",
  "POSTS.POST_1": IMAGES + "/posts/post-1.jpg",
  "POSTS.POST_2": IMAGES + "/posts/post-2.jpg",
  "POSTS.POST_3": IMAGES + "/posts/post-3.jpg",
  "POSTS.POST_4": IMAGES + "/posts/post-4.jpg",
  "POSTS.POST_5": IMAGES + "/posts/post-5.jpg",
  "POSTS.POST_6": IMAGES + "/posts/post-6.jpg",
  "POSTS.POST_7": IMAGES + "/posts/post-7.jpg",
  "POSTS.POST_8": IMAGES + "/posts/post-8.jpg",

  // ACTIVITIES
  "ACTIVITIES.ACTIVITY_1": IMAGES + "/activities/activity-1.jpg",
  "ACTIVITIES.ACTIVITY_2": IMAGES + "/activities/activity-2.jpg",
  "ACTIVITIES.ACTIVITY_3": IMAGES + "/activities/activity-3.jpg",
  "ACTIVITIES.ACTIVITY_4": IMAGES + "/activities/activity-4.jpg",
  "ACTIVITIES.ACTIVITY_5": IMAGES + "/activities/activity-5.jpg",
  "ACTIVITIES.ACTIVITY_6": IMAGES + "/activities/activity-6.jpg",
  "ACTIVITIES.ACTIVITY_SPORTS": IMAGES + "/activities/activity-sports.jpg",
  "ACTIVITIES.ACTIVITY_STUDY": IMAGES + "/activities/activity-study.jpg",

  // PRODUCTS
  "PRODUCTS.FOOD_1": IMAGES + "/products/food-1.jpg",
  "PRODUCTS.FOOD_2": IMAGES + "/products/food-2.jpg",
  "PRODUCTS.MERCH_1": IMAGES + "/products/merch-1.jpg",
  "PRODUCTS.MERCH_2": IMAGES + "/products/merch-2.jpg",
  "PRODUCTS.TICKET_1": IMAGES + "/products/ticket-1.jpg",
  "PRODUCTS.TICKET_2": IMAGES + "/products/ticket-2.jpg",

  // POSTERS
  "POSTERS.LOGIN": IMAGES + "/posters/login-poster.jpg",
  "POSTERS.HOME": IMAGES + "/posters/home-poster.jpg",

  // BANNERS
  "BANNERS.VILLAGE": IMAGES + "/banners/village-banner.jpg",
  "BANNERS.HOME": IMAGES + "/banners/home-banner.jpg",

  // ICONS_COMMON (PNG)
  "ICONS_COMMON.ADD": ICONS_BASE + "/common/add.png",
  "ICONS_COMMON.ADD_WHITE": ICONS_BASE + "/common/add-white.png",
  "ICONS_COMMON.AI": ICONS_BASE + "/common/ai.png",
  "ICONS_COMMON.ARROW_RIGHT": ICONS_BASE + "/common/arrow-right.png",
  "ICONS_COMMON.BACK": ICONS_BASE + "/common/back.png",
  "ICONS_COMMON.BUILDING": ICONS_BASE + "/common/building.png",
  "ICONS_COMMON.CAMERA": ICONS_BASE + "/common/camera.png",
  "ICONS_COMMON.CELEBRATION": ICONS_BASE + "/common/celebration.png",
  "ICONS_COMMON.CHECK": ICONS_BASE + "/common/check.png",
  "ICONS_COMMON.CLOSE": ICONS_BASE + "/common/close.png",
  "ICONS_COMMON.EDIT": ICONS_BASE + "/common/edit.png",
  "ICONS_COMMON.FIRE": ICONS_BASE + "/common/fire.png",
  "ICONS_COMMON.GRADUATION": ICONS_BASE + "/common/graduation.png",
  "ICONS_COMMON.HEART": ICONS_BASE + "/common/heart.png",
  "ICONS_COMMON.LOCATION": ICONS_BASE + "/common/location.png",
  "ICONS_COMMON.NEW_BADGE": ICONS_BASE + "/common/new-badge.png",
  "ICONS_COMMON.NOTIFICATION": ICONS_BASE + "/common/notification.png",
  "ICONS_COMMON.SCHEDULE": ICONS_BASE + "/common/schedule.png",
  "ICONS_COMMON.SCHOOL": ICONS_BASE + "/common/school.png",
  "ICONS_COMMON.SEARCH": ICONS_BASE + "/common/search.png",
  "ICONS_COMMON.SETTINGS": ICONS_BASE + "/common/settings.png",
  "ICONS_COMMON.SHOP": ICONS_BASE + "/common/shop.png",
  "ICONS_COMMON.STAR": ICONS_BASE + "/common/star.png",
  "ICONS_COMMON.VIP": ICONS_BASE + "/common/vip.png",
  "ICONS_COMMON.SCHOOL_SVG": ICONS_BASE + "/common/school.svg",
  "ICONS_COMMON.CELEBRATION_SVG": ICONS_BASE + "/common/celebration.svg",
  "ICONS_COMMON.NOTIFICATION_SVG": ICONS_BASE + "/common/notification.svg",
  "ICONS_COMMON.STAR_SVG": ICONS_BASE + "/common/star.svg",
  "ICONS_COMMON.SCHEDULE_SVG": ICONS_BASE + "/common/schedule.svg",
  "ICONS_COMMON.GRADUATION_SVG": ICONS_BASE + "/common/graduation.svg",

  // ICONS_SOCIAL
  "ICONS_SOCIAL.CHECKIN": ICONS_BASE + "/social/checkin.png",
  "ICONS_SOCIAL.COMMENT": ICONS_BASE + "/social/comment.png",
  "ICONS_SOCIAL.FOLLOW": ICONS_BASE + "/social/follow.png",
  "ICONS_SOCIAL.HEART_SIGNAL": ICONS_BASE + "/social/heart-signal.png",
  "ICONS_SOCIAL.LIKE": ICONS_BASE + "/social/like.png",
  "ICONS_SOCIAL.LIKE_FILLED": ICONS_BASE + "/social/like-filled.png",
  "ICONS_SOCIAL.MATCH": ICONS_BASE + "/social/match.png",
  "ICONS_SOCIAL.MESSAGE": ICONS_BASE + "/social/message.png",
  "ICONS_SOCIAL.PASS": ICONS_BASE + "/social/pass.png",
  "ICONS_SOCIAL.SHARE": ICONS_BASE + "/social/share.png",
  "ICONS_SOCIAL.SUPER_LIKE": ICONS_BASE + "/social/super-like.png",
  "ICONS_SOCIAL.VISITOR": ICONS_BASE + "/social/visitor.png",

  // ICONS_TABBAR
  "ICONS_TABBAR.CHAT_ACTIVE": ICONS_BASE + "/tabbar/chat-active.png",
  "ICONS_TABBAR.CHAT_DEFAULT": ICONS_BASE + "/tabbar/chat-default.png",
  "ICONS_TABBAR.DISCOVER_ACTIVE": ICONS_BASE + "/tabbar/discover-active.png",
  "ICONS_TABBAR.DISCOVER_DEFAULT": ICONS_BASE + "/tabbar/discover-default.png",
  "ICONS_TABBAR.HOME_ACTIVE": ICONS_BASE + "/tabbar/home-active.png",
  "ICONS_TABBAR.HOME_DEFAULT": ICONS_BASE + "/tabbar/home-default.png",
  "ICONS_TABBAR.PROFILE_ACTIVE": ICONS_BASE + "/tabbar/profile-active.png",
  "ICONS_TABBAR.PROFILE_DEFAULT": ICONS_BASE + "/tabbar/profile-default.png",
  "ICONS_TABBAR.VILLAGE_ACTIVE": ICONS_BASE + "/tabbar/village-active.png",
  "ICONS_TABBAR.VILLAGE_DEFAULT": ICONS_BASE + "/tabbar/village-default.png",

  // ICONS_PROFILE (复用)
  "ICONS_PROFILE.POSTS": ICONS_BASE + "/social/heart-signal.png",
  "ICONS_PROFILE.FAVORITES": ICONS_BASE + "/common/star.png",
  "ICONS_PROFILE.MATCHES": ICONS_BASE + "/social/match.png",
  "ICONS_PROFILE.VISITORS": ICONS_BASE + "/social/visitor.png",
  "ICONS_PROFILE.VERIFICATION": ICONS_BASE + "/common/check.png",
  "ICONS_PROFILE.LAB": ICONS_BASE + "/common/ai.png",
  "ICONS_PROFILE.SHARE": ICONS_BASE + "/social/share.png",
  "ICONS_PROFILE.SETTINGS": ICONS_BASE + "/common/settings.png",
  "ICONS_PROFILE.INFO": ICONS_BASE + "/common/notification.png",

  // ICONS_EMOJI (SVG)
  "ICONS_EMOJI.LOCATION": ICONS_BASE + "/location.svg",
  "ICONS_EMOJI.GROUP": ICONS_BASE + "/group.svg",
  "ICONS_EMOJI.CAKE": ICONS_BASE + "/cake.svg",
  "ICONS_EMOJI.SPARKLES": ICONS_BASE + "/sparkles.svg",
  "ICONS_EMOJI.SEARCH": ICONS_BASE + "/search.svg",
  "ICONS_EMOJI.MICROPHONE": ICONS_BASE + "/microphone.svg",
  "ICONS_EMOJI.SMILE": ICONS_BASE + "/smile.svg",
  "ICONS_EMOJI.PLUS": ICONS_BASE + "/plus.svg",
  "ICONS_EMOJI.HEART": ICONS_BASE + "/heart.svg",
  "ICONS_EMOJI.CHAT": ICONS_BASE + "/chat.svg",
  "ICONS_EMOJI.BOOKMARK": ICONS_BASE + "/bookmark.svg",
  "ICONS_EMOJI.GIFT": ICONS_BASE + "/gift.svg",
  "ICONS_EMOJI.FIRE": ICONS_BASE + "/fire.svg",
  "ICONS_EMOJI.THUMBS_UP": ICONS_BASE + "/thumbs-up.svg",
};

console.log("=" .repeat(80));
console.log("IMAGE_PATHS 路径验证报告");
console.log("=".repeat(80));

const missing = [];
const found = [];

for (const [key, path] of Object.entries(pathsToCheck)) {
  if (existingPaths.has(path)) {
    found.push({ key, path });
  } else {
    missing.push({ key, path });
  }
}

console.log(`\n✅ 存在: ${found.length} 个路径`);
console.log(`❌ 缺失: ${missing.length} 个路径`);

if (missing.length > 0) {
  console.log("\n❌ 缺失的路径:");
  for (const item of missing) {
    console.log(`  - ${item.key}: ${item.path}`);
  }
}

// 检查 SafeImage 默认 fallback
const safeImageFallback = "/static/assets/default-avatar.png";
console.log(`\nSafeImage 默认 fallback: ${existingPaths.has(safeImageFallback) ? '✅' : '❌'} ${safeImageFallback}`);

// 检查实际存在但 IMAGE_PATHS 中没有定义的文件
console.log("\n" + "=".repeat(80));
console.log("实际存在但未在 IMAGE_PATHS 中定义的资源");
console.log("=".repeat(80));

const definedPaths = new Set(Object.values(pathsToCheck));
const undefinedFiles = [];
for (const p of existingPaths) {
  if (!definedPaths.has(p)) {
    undefinedFiles.push(p);
  }
}

console.log(`\n未在 IMAGE_PATHS 中定义的文件: ${undefinedFiles.length} 个`);
// 分类显示
const svgFiles = undefinedFiles.filter(f => f.endsWith(".svg"));
const pngFiles = undefinedFiles.filter(f => f.endsWith(".png"));
const jpgFiles = undefinedFiles.filter(f => f.endsWith(".jpg"));
const otherFiles = undefinedFiles.filter(f => !f.endsWith(".svg") && !f.endsWith(".png") && !f.endsWith(".jpg"));

console.log(`  SVG: ${svgFiles.length} 个`);
console.log(`  PNG: ${pngFiles.length} 个`);
console.log(`  JPG: ${jpgFiles.length} 个`);
console.log(`  其他: ${otherFiles.length} 个`);

// 显示 SVG 图标（可能是未定义的 emoji 图标）
console.log("\n未定义的 SVG 图标 (可能是 tabbar/其他用途):");
for (const f of svgFiles.sort()) {
  console.log(`  - ${f}`);
}
