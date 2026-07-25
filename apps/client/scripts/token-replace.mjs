// ============================================================
// 硬编码颜色批量替换为 design tokens（v2）
// 修复：在加载时规范化所有 RGBA_MAP 的 key
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, "..", "src");

const FILES = [
  "pages/village/detail.vue",
  "pages/verification/index.vue",
  "pages/circle/index.vue",
  "components/discover/CardSwiper.vue",
  "pages/campus/index.vue",
  "pages/campus/post-topic.vue",
  "pages/campus/topic-detail.vue",
  "pages/campus/certification.vue",
  "pages/circles/index.vue",
  "pages/circles/topics.vue",
  "pages/circles/topic-detail.vue",
  "pages/circles/post-topic.vue",
  "pages/discover/index.vue",
  "pages/discover/history.vue",
  "pages/profile/index.vue",
  "pages/village/index.vue",
  "pages/village/post.vue",
  "pages/village/tag-posts.vue",
  "pages/home/index.vue",
  "pages/likes/index.vue",
  "pages/messages/index.vue",
  "pages/chat/index.vue",
  "pages/chat-session/index.vue",
  "pages/vip/index.vue",
  "pages/daily-question/index.vue",
  "pages/heart-signals/index.vue",
  "pages/shop/index.vue",
  "pages/settings/index.vue",
  "pages/dev/index.vue",
  "subpackages/setup/profile/index.vue",
  "subpackages/setup/campus/index.vue",
  "subpackages/setup/recommend-pref/index.vue",
  "subpackages/setup/schedule/index.vue",
  "subpackages/discover/activities/index.vue",
  "subpackages/discover/discussions/index.vue",
  "subpackages/support/feedback/index.vue",
  "components/discover/CardDetailOverlay.vue",
  "components/discover/FilterDrawer.vue",
  "components/discover/LongPressMenu.vue",
  "components/home/ActivityScroll.vue",
  "components/home/PeopleScroll.vue",
  "components/home/HomeHeader.vue",
  "components/home/WallSection.vue",
  "components/social/WallPostCard.vue",
  "components/social/SocialProgressIndicator.vue",
  "components/chat/ChatBubble.vue",
  "components/chat/ChatItem.vue",
  "components/chat/HeartSignal.vue",
  "components/chat/IcebreakerSuggestions.vue",
  "components/common/Avatar.vue",
  "components/common/Button.vue",
  "components/common/Card.vue",
  "components/common/MatchCountChip.vue",
  "components/common/Ripple.vue",
  "components/common/SectionCard.vue",
  "components/common/Tag.vue",
  "components/layout/AppShell.vue",
  "components/layout/ChatHeader.vue",
  "App.vue",
  "uni.scss",
];

// ------------------------------------------------------------
// 颜色 → token 映射表
// ------------------------------------------------------------
const HEX_MAP_RAW = {
  // 品牌色
  "#3FCF8E": "--c-brand",
  "#2DB97A": "--c-brand-400",
  "#25A86C": "--c-brand-600",
  "#7CD9A6": "--c-brand-300",
  "#A3E0C0": "--c-brand-200",
  "#D1F0E0": "--c-brand-100",
  "#E8F8F0": "--c-brand-50",
  "#1D8A5A": "--c-brand-700",
  "#15744A": "--c-brand-800",
  "#0D5E3A": "--c-brand-900",
  // 浪漫粉
  "#EC4899": "--c-romance-500",
  "#F472B6": "--c-romance-400",
  "#F9A8C4": "--c-romance-300",
  "#FBCFE0": "--c-romance-200",
  "#FFE4E9": "--c-romance-100",
  "#FFF5F7": "--c-romance-50",
  "#DB2777": "--c-romance-600",
  "#BE185D": "--c-romance-700",
  // 强调橙
  "#F97316": "--c-accent-400",
  "#FB923C": "--c-accent-400",
  // VIP 金色
  "#C9A36A": "--c-vip-from",
  "#E8C98A": "--c-vip-to",
  "#FFD700": "--c-gold",
  "#FBBF24": "--c-gold",
  // 语义色
  "#10B981": "--c-success",
  "#34D399": "--c-success",
  "#F59E0B": "--c-warning",
  "#E5454D": "--c-error",
  "#EF4444": "--c-error",
  "#FF6B6B": "--c-error-dark",
  "#F87171": "--c-error-dark",
  "#FF4757": "--c-error",
  // 中性色
  "#FFFFFF": "--c-neutral-0",
  "#F4F6FA": "--c-bg-page",
  "#F8FAFC": "--c-bg-page",
  "#F0F2F5": "--c-neutral-100",
  "#F1F5F9": "--c-neutral-50",
  "#EEF2F5": "--c-neutral-100",
  "#EEF0F5": "--c-neutral-100",
  "#E2E8F0": "--c-neutral-200",
  "#CBD5E1": "--c-neutral-300",
  "#94A3B8": "--c-neutral-400",
  "#9CA3AF": "--c-neutral-400",
  "#64748B": "--c-neutral-500",
  "#6B7280": "--c-neutral-500",
  "#475569": "--c-neutral-600",
  "#334155": "--c-neutral-700",
  "#1A1F26": "--c-neutral-800",
  "#0E1116": "--c-neutral-900",
  "#1A1A2E": "--c-neutral-800",
  "#16213E": "--c-neutral-800",
  // 文本色
  "#1F2329": "--c-text-primary",
  "#1F2937": "--c-text-primary",
  "#5B6470": "--c-text-secondary",
  "#9AA1AB": "--c-text-tertiary",
  "#8E8E9E": "--c-text-tertiary",
  "#B8B8C8": "--c-text-quaternary",
  // 边框色
  "#EEF0F4": "--c-border-light",
  // 状态徽章色
  "#FFD479": "--c-state-ongoing-bg",
  "#B7C4FF": "--c-state-preview-bg",
  "#3B47B7": "--c-state-preview-text",
  "#1A7A4A": "--c-state-signup-text",
  "#8A5A00": "--c-state-ongoing-text",
  // 功能色
  "#FF7A45": "--c-badge-campus",
  // 浅色调
  "#E8F9F1": "--c-brand-50",
  "#FCE7F3": "--c-romance-100",
  "#FCE4EC": "--c-tint-pink-50",
  "#FFF0F5": "--c-tint-pink-soft",
  "#FFF8E7": "--c-tint-cream-50",
  "#FFF8E1": "--c-tint-amber-50",
  "#FFF3E0": "--c-tint-orange-50",
  "#E3F2FD": "--c-tint-blue-50",
  "#E8F4FD": "--c-tint-blue-soft",
  "#F3F4F6": "--c-tint-gray-50",
  "#E8F5E9": "--c-tint-green-50",
  "#F0FDF8": "--c-tint-green-50",
  "#F0FDF9": "--c-tint-green-50",
  "#E8F9F4": "--c-tint-green-50",
  "#F0FBF7": "--c-tint-green-50",
  "#F0F7FF": "--c-tint-blue-50",
  "#E8F4FF": "--c-tint-blue-50",
  "#EEF2FF": "--c-tint-blue-50",
  "#FDF2F8": "--c-romance-50",
  "#FEE2E2": "--c-red-bg-tint",
  "#FEF2F2": "--c-red-bg-tint",
  "#DCFCE7": "--c-success-bg-tint",
  "#FEF3C7": "--c-warning-bg-tint",
  "#FEF9C3": "--c-warning-bg-tint",
  "#FFF0D6": "--c-tint-orange-50",
  "#FFF8E6": "--c-tint-amber-50",
  "#FFF0F6": "--c-tint-pink-soft",
  // 次要蓝
  "#5B7FFF": "--c-secondary-blue-400",
  "#4C6EF5": "--c-secondary-blue-500",
  "#60A5FA": "--c-info-400",
  "#3B82F6": "--c-info-500",
  "#7C9BFF": "--c-secondary-blue-400-light",
  "#06B6D4": "--c-info-500",
  "#22D3EE": "--c-info-400",
  // 兴趣分类
  "#8B5CF6": "--c-lavender-500",
  "#A78BFA": "--c-lavender-500",
  "#F5F3FF": "--c-lavender-50",
  "#EDE9FE": "--c-lavender-100",
  "#0EA5E9": "--c-sky-500",
  "#F0F9FF": "--c-sky-50",
  "#E0F2FE": "--c-sky-100",
  "#FFEDD5": "--c-apricot-100",
  "#FFF7ED": "--c-apricot-50",
  // 深色文本
  "#5D4E37": "--c-text-vip-dark",
  "#065F46": "--c-text-success-dark",
  "#92400E": "--c-text-warning-dark",
  "#991B1B": "--c-text-error-dark",
  "#C2410C": "--c-badge-idcard-text",
  // 渐变中常用的浅色
  "#5ADBA0": "--c-brand-300",
  "#C6F0DB": "--c-brand-100",
  "#FF6B9D": "--c-romance-400",
  "#FFA500": "--c-accent-400",
  // 笔误/近似色（按设计意图映射到最近 token）
  "#2DB87A": "--c-brand-400", // #2DB97A 的笔误
  "#FBCFE8": "--c-romance-200", // #FBCFE0 的近似
  // 短 hex
  "#FFF": "--c-neutral-0",
  "#000": "--c-neutral-900",
};

// 构建 HEX_MAP（同时支持大小写）
const HEX_MAP = {};
for (const [k, v] of Object.entries(HEX_MAP_RAW)) {
  HEX_MAP[k] = v;
  HEX_MAP[k.toLowerCase()] = v;
  HEX_MAP[k.toUpperCase()] = v;
}

// rgba 颜色映射（key 可含/不含空格、大小写混合，启动时统一规范化）
const RGBA_MAP_RAW = {
  // 黑色叠层
  "rgba(0,0,0,0)": "--c-black-overlay-transparent",
  "rgba(0,0,0,0.02)": "--c-black-shadow-xs",
  "rgba(0,0,0,0.03)": "--c-black-shadow-xs",
  "rgba(0,0,0,0.04)": "--c-black-shadow-xs",
  "rgba(0,0,0,0.06)": "--c-black-shadow-sm",
  "rgba(0,0,0,0.08)": "--c-black-shadow-sm",
  "rgba(0,0,0,0.1)": "--c-black-shadow-md",
  "rgba(0,0,0,0.12)": "--c-black-shadow-lg",
  "rgba(0,0,0,0.15)": "--c-black-shadow-lg",
  "rgba(0,0,0,0.16)": "--c-black-overlay-light",
  "rgba(0,0,0,0.18)": "--c-black-overlay-light",
  "rgba(0,0,0,0.2)": "--c-overlay-text-shadow-mid",
  "rgba(0,0,0,0.22)": "--c-black-shadow-xl",
  "rgba(0,0,0,0.24)": "--c-black-shadow-xl",
  "rgba(0,0,0,0.25)": "--c-gradient-mask-mid",
  "rgba(0,0,0,0.3)": "--c-text-shadow-overlay",
  "rgba(0,0,0,0.35)": "--c-black-overlay-mid",
  "rgba(0,0,0,0.4)": "--c-black-overlay-mid",
  "rgba(0,0,0,0.42)": "--c-black-overlay-mid",
  "rgba(0,0,0,0.5)": "--c-overlay-mid-strong",
  "rgba(0,0,0,0.55)": "--c-black-overlay-strong",
  "rgba(0,0,0,0.6)": "--c-gradient-mask-strong",
  "rgba(0,0,0,0.65)": "--c-black-overlay-strong",
  "rgba(0,0,0,0.7)": "--c-overlay-strong",
  "rgba(0,0,0,0.72)": "--c-overlay-stronger",
  "rgba(0,0,0,0.75)": "--c-overlay-stronger",
  // 深色叠层 rgba(15,23,42,x)
  "rgba(15,23,42,0.03)": "--c-neutral-shadow-xs",
  "rgba(15,23,42,0.04)": "--c-neutral-shadow-xs",
  "rgba(15,23,42,0.05)": "--c-neutral-shadow-sm",
  "rgba(15,23,42,0.06)": "--c-neutral-shadow-md",
  "rgba(15,23,42,0.08)": "--c-neutral-shadow-lg",
  "rgba(15,23,42,0.1)": "--c-black-shadow-md",
  "rgba(15,23,42,0.12)": "--c-neutral-shadow-xl",
  "rgba(15,23,42,0.14)": "--c-neutral-shadow-xl",
  "rgba(15,23,42,0.16)": "--c-black-overlay-light",
  "rgba(15,23,42,0.18)": "--c-neutral-shadow-xl",
  "rgba(15,23,42,0.2)": "--c-black-overlay-light",
  "rgba(15,23,42,0.35)": "--c-overlay-mid-strong",
  "rgba(15,23,42,0.45)": "--c-bg-overlay",
  "rgba(15,23,42,0.5)": "--c-overlay-mid-strong",
  "rgba(15,23,42,0.55)": "--c-overlay-mid",
  "rgba(15,23,42,0.6)": "--c-overlay-strong",
  "rgba(15,23,42,0.7)": "--c-overlay-strong",
  "rgba(15,23,42,0.72)": "--c-overlay-stronger",
  // 白色叠层
  "rgba(255,255,255,0)": "--c-overlay-bg-light",
  "rgba(255,255,255,0.08)": "--c-overlay-white-bg-tint",
  "rgba(255,255,255,0.1)": "--c-overlay-white-bg-tint-mid",
  "rgba(255,255,255,0.12)": "--c-overlay-white-bg-tint-strong",
  "rgba(255,255,255,0.15)": "--c-overlay-white-bg-tint-strong",
  "rgba(255,255,255,0.18)": "--c-overlay-border-light",
  "rgba(255,255,255,0.2)": "--c-overlay-bg-light",
  "rgba(255,255,255,0.25)": "--c-overlay-white-bg-mid-strong",
  "rgba(255,255,255,0.28)": "--c-overlay-white-shadow-light",
  "rgba(255,255,255,0.3)": "--c-overlay-border-strong",
  "rgba(255,255,255,0.32)": "--c-overlay-white-border-stronger",
  "rgba(255,255,255,0.35)": "--c-overlay-white-bg-strong-mid",
  "rgba(255,255,255,0.4)": "--c-overlay-white-bg-stronger",
  "rgba(255,255,255,0.5)": "--c-overlay-bg-mid",
  "rgba(255,255,255,0.6)": "--c-overlay-bg-strong",
  "rgba(255,255,255,0.7)": "--c-overlay-white-text-mid",
  "rgba(255,255,255,0.8)": "--c-overlay-white-text-strong",
  "rgba(255,255,255,0.85)": "--c-overlay-text-secondary",
  "rgba(255,255,255,0.9)": "--c-overlay-bg-solid",
  "rgba(255,255,255,0.95)": "--c-overlay-bg-pure",
  "rgba(255,255,255,0.96)": "--c-overlay-white-bg-most",
  "rgba(255,255,255,0.8)": "--c-overlay-white-text-strong",
  // 品牌绿 rgba(63,207,142,x)
  "rgba(63,207,142,0)": "--c-brand-bg-tint",
  "rgba(63,207,142,0.02)": "--c-gradient-card-atmosphere",
  "rgba(63,207,142,0.03)": "--c-brand-bg-tint",
  "rgba(63,207,142,0.04)": "--c-gradient-card-atmosphere",
  "rgba(63,207,142,0.05)": "--c-brand-bg-tint",
  "rgba(63,207,142,0.06)": "--c-brand-bg-tint",
  "rgba(63,207,142,0.08)": "--c-brand-bg-tint",
  "rgba(63,207,142,0.1)": "--c-location-bg",
  "rgba(63,207,142,0.12)": "--c-brand-bg-tint-strong",
  "rgba(63,207,142,0.15)": "--c-brand-shadow-tint",
  "rgba(63,207,142,0.2)": "--c-brand-border-tint",
  "rgba(63,207,142,0.24)": "--s-brand",
  "rgba(63,207,142,0.25)": "--c-brand-shadow-tint-mid",
  "rgba(63,207,142,0.28)": "--c-brand-shadow-tint-mid",
  "rgba(63,207,142,0.3)": "--c-brand-border-tint-stronger",
  "rgba(63,207,142,0.32)": "--s-float-btn",
  "rgba(63,207,142,0.35)": "--c-brand-shadow-tint-strong",
  "rgba(63,207,142,0.4)": "--c-brand-border-tint-stronger",
  "rgba(63,207,142,0.65)": "--c-tag-school-overlay",
  // 浪漫粉 rgba(236,72,153,x)
  "rgba(236,72,153,0)": "--c-romance-bg-tint",
  "rgba(236,72,153,0.02)": "--c-gradient-card-atmosphere",
  "rgba(236,72,153,0.03)": "--c-romance-bg-tint",
  "rgba(236,72,153,0.08)": "--c-romance-bg-tint",
  "rgba(236,72,153,0.1)": "--c-romance-bg-tint",
  "rgba(236,72,153,0.12)": "--c-romance-bg-tint",
  "rgba(236,72,153,0.15)": "--c-romance-bg-tint",
  "rgba(236,72,153,0.22)": "--c-romance-border-tint",
  "rgba(236,72,153,0.25)": "--c-shadow-romance-tint",
  "rgba(236,72,153,0.3)": "--s-romance",
  "rgba(236,72,153,0.32)": "--s-romance",
  "rgba(236,72,153,0.35)": "--c-shadow-romance-tint-strong",
  "rgba(236,72,153,0.4)": "--c-romance-border-tint",
  "rgba(236,72,153,0.45)": "--c-shadow-romance-tint-stronger",
  "rgba(236,72,153,0.5)": "--c-shadow-romance-tint-stronger",
  "rgba(236,72,153,0.6)": "--c-tag-match-from",
  "rgba(236,72,153,0.65)": "--c-tag-major-overlay",
  "rgba(236,72,153,0.72)": "--c-romance-bg-tint-strong",
  // 成功色 rgba(16,185,129,x)
  "rgba(16,185,129,0.08)": "--c-success-bg-tint",
  "rgba(16,185,129,0.1)": "--c-success-bg-tint",
  "rgba(16,185,129,0.18)": "--c-success-bg-tint",
  "rgba(16,185,129,0.2)": "--c-success-border-tint",
  "rgba(16,185,129,0.22)": "--c-success-border-tint",
  "rgba(16,185,129,0.25)": "--s-success",
  "rgba(16,185,129,0.3)": "--s-action-success",
  "rgba(16,185,129,0.35)": "--s-action-success",
  "rgba(16,185,129,0.42)": "--s-action-success",
  "rgba(16,185,129,0.85)": "--c-success-bg-strong",
  "rgba(16,185,129,0.95)": "--c-overlay-online-bg",
  // 警告色 rgba(245,158,11,x)
  "rgba(245,158,11,0.1)": "--c-warning-bg-tint",
  "rgba(245,158,11,0.2)": "--c-warning-border-tint",
  "rgba(245,158,11,0.22)": "--c-warning-border-tint",
  "rgba(245,158,11,0.3)": "--c-warning-border-tint",
  "rgba(245,158,11,0.75)": "--c-accent-bg-tint-mid",
  // 错误色 rgba(229,69,77,x)
  "rgba(229,69,77,0)": "--c-error-bg-tint",
  "rgba(229,69,77,0.08)": "--c-error-bg-tint",
  "rgba(229,69,77,0.1)": "--c-error-bg-tint",
  "rgba(229,69,77,0.15)": "--c-action-reject-border",
  "rgba(229,69,77,0.18)": "--c-action-reject-border",
  "rgba(229,69,77,0.2)": "--c-error-border-tint",
  "rgba(229,69,77,0.22)": "--c-error-border-tint",
  "rgba(229,69,77,0.25)": "--s-error",
  "rgba(229,69,77,0.3)": "--s-action-error",
  "rgba(229,69,77,0.35)": "--s-action-error",
  "rgba(229,69,77,0.4)": "--c-error-bg-tint-light",
  "rgba(229,69,77,0.42)": "--c-error-bg-tint-light",
  // 红色 rgba(239,68,68,x)
  "rgba(239,68,68,0.08)": "--c-red-bg-tint",
  "rgba(239,68,68,0.1)": "--c-red-bg-tint",
  "rgba(239,68,68,0.2)": "--c-red-border-tint",
  "rgba(239,68,68,0.4)": "--c-red-border-tint",
  // 橙色 rgba(249,115,22,x)
  "rgba(249,115,22,0.15)": "--c-apricot-100",
  "rgba(249,115,22,0.3)": "--c-tag-match-to",
  "rgba(249,115,22,0.6)": "--c-tag-match-to",
  "rgba(249,115,22,0.75)": "--c-accent-bg-tint",
  "rgba(249,115,22,0.32)": "--c-badge-idcard-border",
  // 次要蓝 rgba(91,127,255,x)
  "rgba(91,127,255,0)": "--c-secondary-blue-bg-tint",
  "rgba(91,127,255,0.03)": "--c-secondary-blue-bg-tint",
  "rgba(91,127,255,0.1)": "--c-secondary-blue-bg-tint",
  "rgba(91,127,255,0.15)": "--c-secondary-blue-bg-tint-light",
  "rgba(91,127,255,0.18)": "--c-secondary-blue-border-tint-strong",
  "rgba(91,127,255,0.25)": "--c-secondary-blue-shadow-soft",
  "rgba(91,127,255,0.3)": "--c-secondary-blue-shadow",
  "rgba(91,127,255,0.4)": "--c-secondary-blue-shadow",
  // VIP 金色 rgba(201,163,106,x)
  "rgba(201,163,106,0.2)": "--c-vip-border-light",
  "rgba(201,163,106,0.3)": "--c-vip-border-light",
  "rgba(201,163,106,0.35)": "--c-vip-border-tint",
  "rgba(201,163,106,0.5)": "--c-vip-border-tint",
  // 邮箱徽章
  "rgba(183,196,255,0.18)": "--c-badge-email-bg",
  "rgba(99,102,241,0.32)": "--c-badge-email-border",
  // 灰蓝
  "rgba(100,116,139,0.75)": "--c-neutral-bg-tint",
  // 中性蓝 rgba(59,130,246,x)
  "rgba(59,130,246,0.3)": "--s-action-super",
  "rgba(59,130,246,0.4)": "--s-action-super",
  "rgba(59,130,246,0.5)": "--s-action-super",
  "rgba(59,130,246,0.72)": "--s-action-super",
  // 蓝色 rgba(37,99,235,x)
  "rgba(37,99,235,0.04)": "--c-secondary-blue-bg-tint",
  "rgba(37,99,235,0.06)": "--c-secondary-blue-bg-tint",
  "rgba(37,99,235,0.08)": "--c-secondary-blue-bg-tint",
  "rgba(37,99,235,0.12)": "--c-secondary-blue-border-tint-strong",
  "rgba(37,99,235,0.14)": "--c-secondary-blue-border-tint-strong",
  // 蓝色 rgba(100,181,246,x)
  "rgba(100,181,246,0.3)": "--c-secondary-blue-shadow-soft",
  "rgba(100,181,246,0.4)": "--c-secondary-blue-shadow",
  // 黄色 rgba(255,215,0,x) - 金色
  "rgba(255,215,0,0.1)": "--c-vip-border-light",
  "rgba(255,215,0,0.18)": "--c-vip-border-light",
  "rgba(255,215,0,0.2)": "--c-vip-border-light",
  "rgba(255,215,0,0.25)": "--c-vip-border-tint",
  "rgba(255,215,0,0.4)": "--c-vip-border-tint",
  "rgba(255,215,0,0.5)": "--c-vip-border-tint",
  "rgba(255,215,0,0.8)": "--c-gold",
  // 橙色 rgba(255,165,0,x)
  "rgba(255,165,0,0.08)": "--c-accent-bg-tint",
  "rgba(255,165,0,0.1)": "--c-accent-bg-tint",
  "rgba(255,165,0,0.3)": "--c-accent-bg-tint",
  "rgba(255,165,0,0.4)": "--c-accent-bg-tint",
  // 黄色 rgba(255,183,77,x)
  "rgba(255,183,77,0.3)": "--c-state-ongoing-bg",
  "rgba(255,183,77,0.4)": "--c-state-ongoing-bg",
  // 粉色 rgba(244,143,177,x)
  "rgba(244,143,177,0.3)": "--c-romance-border-tint",
  "rgba(244,143,177,0.4)": "--c-romance-border-tint",
  // 紫色 rgba(139,92,246,x)
  "rgba(139,92,246,0.15)": "--c-lavender-100",
  "rgba(139,92,246,0.3)": "--c-lavender-500",
  // 青色 rgba(6,182,212,x)
  "rgba(6,182,212,0.3)": "--c-info-500",
  // rgba(14,165,233,x)
  "rgba(14,165,233,0.72)": "--c-info-500",
  // rgba(244,114,182,x)
  "rgba(244,114,182,0.72)": "--c-romance-500",
  // rgba(124,217,166,x)
  "rgba(124,217,166,0.5)": "--c-brand-300",
  // rgba(251,191,36,x)
  "rgba(251,191,36,0.4)": "--c-state-ongoing-bg",
  // rgba(255,212,121,x)
  "rgba(255,212,121,0)": "--c-state-ongoing-bg",
  "rgba(255,212,121,0.22)": "--c-state-ongoing-bg",
  // rgba(226,232,240,x)
  "rgba(226,232,240,0.8)": "--c-neutral-200",
  // rgba(26,26,46,x)
  "rgba(26,26,46,0.95)": "--c-neutral-800",
};

// 构建 RGBA_MAP（启动时规范化 key：去除空格、小写）
const RGBA_MAP = {};
for (const [k, v] of Object.entries(RGBA_MAP_RAW)) {
  const normalized = k.replace(/\s+/g, "").toLowerCase();
  RGBA_MAP[normalized] = v;
}

// 全局统计
const stats = {
  totalReplacements: 0,
  filesModified: 0,
  perFile: {},
  unmatchedColors: new Map(),
};

function normalizeRgba(str) {
  return str.replace(/\s+/g, "").toLowerCase();
}

function findRgbaMatches(css) {
  const results = [];
  const re = /rgba?\(/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const start = m.index;
    let depth = 1;
    let i = start + m[0].length;
    while (i < css.length && depth > 0) {
      if (css[i] === "(") depth++;
      else if (css[i] === ")") depth--;
      i++;
    }
    results.push({ start, end: i, raw: css.slice(start, i) });
  }
  return results;
}

function isInsideVarFallback(str, pos) {
  const before = str.slice(0, pos);
  const varIdx = before.lastIndexOf("var(");
  if (varIdx === -1) return false;
  const afterVar = str.slice(varIdx);
  const closeIdx = afterVar.indexOf(")");
  if (closeIdx === -1) return false;
  return varIdx + closeIdx >= pos;
}

function processFile(fileRel) {
  const filePath = resolve(ROOT, fileRel);
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (e) {
    console.warn(`[skip] cannot read: ${filePath}`);
    return;
  }

  const original = content;
  let replaceCount = 0;

  function replaceColorsInCss(css) {
    let result = css;
    // 1. 替换 rgba(...) 表达式
    const rgbaMatches = findRgbaMatches(result);
    for (let i = rgbaMatches.length - 1; i >= 0; i--) {
      const { start, end, raw } = rgbaMatches[i];
      const normalized = normalizeRgba(raw);
      if (normalized.includes("var(")) continue;
      const token = RGBA_MAP[normalized];
      if (token) {
        const replacement = `var(${token}, ${raw})`;
        result = result.slice(0, start) + replacement + result.slice(end);
        replaceCount++;
        stats.totalReplacements++;
      } else {
        const key = normalized;
        stats.unmatchedColors.set(key, (stats.unmatchedColors.get(key) || 0) + 1);
      }
    }
    // 2. 替换 hex 颜色
    const hexRe = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
    const matches = [];
    let m;
    while ((m = hexRe.exec(result)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, raw: m[0] });
    }
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, raw } = matches[i];
      if (isInsideVarFallback(result, start)) continue;
      const token = HEX_MAP[raw] || HEX_MAP[raw.toLowerCase()] || HEX_MAP[raw.toUpperCase()];
      if (token) {
        const replacement = `var(${token}, ${raw})`;
        result = result.slice(0, start) + replacement + result.slice(end);
        replaceCount++;
        stats.totalReplacements++;
      } else {
        const key = raw.toLowerCase();
        stats.unmatchedColors.set(key, (stats.unmatchedColors.get(key) || 0) + 1);
      }
    }
    return result;
  }

  const styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  content = content.replace(styleBlockRe, (full, inner) => {
    const newInner = replaceColorsInCss(inner);
    return full.replace(inner, newInner);
  });

  if (fileRel.endsWith(".scss")) {
    content = replaceColorsInCss(content);
  }

  if (content !== original) {
    writeFileSync(filePath, content, "utf-8");
    stats.filesModified++;
    stats.perFile[fileRel] = replaceCount;
  } else {
    stats.perFile[fileRel] = 0;
  }
}

console.log("开始批量替换硬编码颜色 (v2)...");
console.log(`待处理文件数: ${FILES.length}`);
console.log(`HEX_MAP 条目数: ${Object.keys(HEX_MAP).length}`);
console.log(`RGBA_MAP 条目数: ${Object.keys(RGBA_MAP).length}`);
console.log("");

for (const f of FILES) {
  processFile(f);
}

console.log("===== 替换统计 =====");
console.log(`总替换数: ${stats.totalReplacements}`);
console.log(`修改文件数: ${stats.filesModified}`);
console.log("");

console.log("===== 每文件替换数 =====");
for (const [f, n] of Object.entries(stats.perFile)) {
  console.log(`  ${n.toString().padStart(4)}  ${f}`);
}

console.log("");
console.log("===== 未匹配颜色（>1 次） =====");
const sorted = [...stats.unmatchedColors.entries()]
  .sort((a, b) => b[1] - a[1])
  .filter(([, n]) => n >= 1);
for (const [color, count] of sorted) {
  console.log(`  ${count.toString().padStart(4)}  ${color}`);
}
