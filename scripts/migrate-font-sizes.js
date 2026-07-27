// 字号 token 化脚本 (SubTask 3.4.2)
// 将 .vue/.scss 文件中硬编码的 font-size 值替换为 CSS 变量
// 映射：
//   20rpx -> var(--fs-xs, 20rpx)
//   22rpx -> var(--fs-sm, 22rpx)
//   24rpx -> var(--fs-base, 24rpx)
//   26rpx -> var(--fs-md, 26rpx)
//   28rpx -> var(--fs-lg, 28rpx)
//   30rpx -> var(--fs-xl, 30rpx)
//   32rpx -> var(--fs-2xl, 32rpx)
//   36rpx -> var(--fs-3xl, 36rpx)
//   40rpx -> var(--fs-4xl, 40rpx)
//   44rpx -> var(--fs-5xl, 44rpx)
//   48rpx -> var(--fs-6xl, 48rpx)
//   56rpx -> var(--fs-7xl, 56rpx)
const fs = require('fs');
const path = require('path');

const targets = [
  'apps/client/src/pages/vip/index.vue',
  'apps/client/src/pages/vip/bills.vue',
  'apps/client/src/pages/vip/red-packet.vue',
  'apps/client/src/pages/vip/promo-code.vue',
  'apps/client/src/pages/village/detail.vue',
  'apps/client/src/pages/village/tag-posts.vue',
  'apps/client/src/pages/village/post.vue',
  'apps/client/src/pages/campus/topic-detail.vue',
  'apps/client/src/pages/campus/index.vue',
  'apps/client/src/pages/campus/post-topic.vue',
  'apps/client/src/pages/settings/dnd.vue',
  'apps/client/src/pages/settings/index.vue',
  'apps/client/src/pages/chat/video-call.vue',
  'apps/client/src/pages/chat/red-packet.vue',
  'apps/client/src/pages/verification/index.vue',
  'apps/client/src/pages/discover/history.vue',
  'apps/client/src/pages/circles/post-topic.vue',
  'apps/client/src/pages/circle/index.vue',
  'apps/client/src/pages/feedback/history.vue',
  'apps/client/src/pages/shop/index.vue',
  'apps/client/src/pages/dev/index.vue',
  'apps/client/src/components/UnlockGuideModal.vue',
  'apps/client/src/components/UnlockGuideOverlay.vue',
  'apps/client/src/components/social/MatchGuideOverlay.vue',
  'apps/client/src/components/social/SocialProgressIndicator.vue',
  'apps/client/src/components/social/WallPostCard.vue',
  'apps/client/src/components/social/PostReportDialog.vue',
  'apps/client/src/components/social/LikeBurst.vue',
  'apps/client/src/components/layout/TabBar.vue',
  'apps/client/src/components/layout/AppShell.vue',
  'apps/client/src/components/layout/ChatHeader.vue',
  'apps/client/src/components/common/UnreadBadge.vue',
  'apps/client/src/components/common/Toast.vue',
  'apps/client/src/components/common/ShareCard.vue',
  'apps/client/src/components/common/BaseTabs.vue',
  'apps/client/src/components/common/StatusState.vue',
  'apps/client/src/components/common/HeartParticles.vue',
  'apps/client/src/components/common/SectionCard.vue',
  'apps/client/src/components/common/PageStateContainer.vue',
  'apps/client/src/components/common/BottomActionBar.vue',
  'apps/client/src/components/home/PersonCard.vue',
  'apps/client/src/components/home/HomeHeader.vue',
  'apps/client/src/components/home/ActivityCard.vue',
  'apps/client/src/components/login/WechatBtn.vue',
  'apps/client/src/components/login/LoginLogo.vue',
  'apps/client/src/components/login/LoginIllustration.vue',
  'apps/client/src/components/discover/LongPressMenu.vue',
  'apps/client/src/components/discover/CardDetailOverlay.vue',
  'apps/client/src/components/chat/VoicePill.vue',
  'apps/client/src/components/chat/VoiceMessageBubble.vue',
  'apps/client/src/components/chat/RedPacketBubble.vue',
  'apps/client/src/components/chat/IcebreakerSuggestions.vue',
  'apps/client/src/components/chat/HeartSignal.vue',
  'apps/client/src/components/chat/ChatItem.vue',
  'apps/client/src/subpackages/support/feedback/index.vue',
  'apps/client/src/subpackages/discover/discussions/index.vue',
  'apps/client/src/subpackages/discover/activities/index.vue',
  'apps/client/src/subpackages/setup/recommend-pref/index.vue',
];

// 从大到小排序，避免 22rpx 在 2rpx 处被截断
// 注意：使用 \b 边界保证匹配完整数字
const replacements = [
  { pattern: /font-size:\s*56rpx\s*;/g, replacement: 'font-size: var(--fs-7xl, 56rpx);' },
  { pattern: /font-size:\s*48rpx\s*;/g, replacement: 'font-size: var(--fs-6xl, 48rpx);' },
  { pattern: /font-size:\s*44rpx\s*;/g, replacement: 'font-size: var(--fs-5xl, 44rpx);' },
  { pattern: /font-size:\s*40rpx\s*;/g, replacement: 'font-size: var(--fs-4xl, 40rpx);' },
  { pattern: /font-size:\s*36rpx\s*;/g, replacement: 'font-size: var(--fs-3xl, 36rpx);' },
  { pattern: /font-size:\s*32rpx\s*;/g, replacement: 'font-size: var(--fs-2xl, 32rpx);' },
  { pattern: /font-size:\s*30rpx\s*;/g, replacement: 'font-size: var(--fs-xl, 30rpx);' },
  { pattern: /font-size:\s*28rpx\s*;/g, replacement: 'font-size: var(--fs-lg, 28rpx);' },
  { pattern: /font-size:\s*26rpx\s*;/g, replacement: 'font-size: var(--fs-md, 26rpx);' },
  { pattern: /font-size:\s*24rpx\s*;/g, replacement: 'font-size: var(--fs-base, 24rpx);' },
  { pattern: /font-size:\s*22rpx\s*;/g, replacement: 'font-size: var(--fs-sm, 22rpx);' },
  { pattern: /font-size:\s*20rpx\s*;/g, replacement: 'font-size: var(--fs-xs, 20rpx);' },
];

const root = 'd:\\6\\恋爱小程序';
let totalReplaced = 0;
let totalFiles = 0;

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log(`Skip (not found): ${rel}`);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  for (const r of replacements) {
    newContent = newContent.replace(r.pattern, r.replacement);
  }
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    totalFiles++;
    console.log(`Updated: ${rel}`);
  }
}
console.log(`Total files updated: ${totalFiles}`);
