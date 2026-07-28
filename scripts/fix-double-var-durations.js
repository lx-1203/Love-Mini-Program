// 修复 migrate-durations.js 的双重替换 bug
// 将 var(--d-xxx, var(--d-xxx, VALms)) 修复为 var(--d-xxx, VALms)
//
// 例如：var(--d-slow, var(--d-slow, 250ms)) -> var(--d-slow, 250ms)
//      var(--d-fade, var(--d-fade, 300ms)) -> var(--d-fade, 300ms)
const fs = require('fs');
const path = require('path');

// 匹配 var(--d-xxx, var(--d-xxx, VALUEms))，捕获外层 var 名、内层 var 名、值
// 要求外层与内层 var 名一致（同一 token）
const pattern = /var\((--d-[a-z]+),\s*var\((--d-[a-z]+),\s*(\d+ms)\)\)/g;

const targets = [
  // 主包页面
  'apps/client/src/pages/vip/index.vue',
  'apps/client/src/pages/vip/bills.vue',
  'apps/client/src/pages/vip/red-packet.vue',
  'apps/client/src/pages/vip/promo-code.vue',
  'apps/client/src/pages/village/detail.vue',
  'apps/client/src/pages/village/tag-posts.vue',
  'apps/client/src/pages/village/post.vue',
  'apps/client/src/pages/village/index.vue',
  'apps/client/src/pages/campus/topic-detail.vue',
  'apps/client/src/pages/campus/index.vue',
  'apps/client/src/pages/campus/post-topic.vue',
  'apps/client/src/pages/settings/dnd.vue',
  'apps/client/src/pages/settings/index.vue',
  'apps/client/src/pages/chat/video-call.vue',
  'apps/client/src/pages/chat/red-packet.vue',
  'apps/client/src/pages/chat-session/index.vue',
  'apps/client/src/pages/verification/index.vue',
  'apps/client/src/pages/discover/history.vue',
  'apps/client/src/pages/discover/index.vue',
  'apps/client/src/pages/circles/post-topic.vue',
  'apps/client/src/pages/circles/index.vue',
  'apps/client/src/pages/circle/index.vue',
  'apps/client/src/pages/feedback/history.vue',
  'apps/client/src/pages/shop/index.vue',
  'apps/client/src/pages/home/index.vue',
  'apps/client/src/pages/daily-question/index.vue',
  'apps/client/src/pages/dev/index.vue',
  'apps/client/src/pages/heart-signals/index.vue',
  'apps/client/src/pages/profile/index.vue',
  // 组件
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
  'apps/client/src/components/common/Skeleton.vue',
  'apps/client/src/components/common/ErrorState.vue',
  'apps/client/src/components/common/PageStateContainer.vue',
  'apps/client/src/components/common/BottomActionBar.vue',
  'apps/client/src/components/common/SafeImage.vue',
  'apps/client/src/components/common/Tag.vue',
  'apps/client/src/components/common/VerificationBadge.vue',
  'apps/client/src/components/home/PersonCard.vue',
  'apps/client/src/components/home/HomeHeader.vue',
  'apps/client/src/components/home/HomeBanner.vue',
  'apps/client/src/components/home/WelcomeBanner.vue',
  'apps/client/src/components/home/ActivityCard.vue',
  'apps/client/src/components/login/WechatBtn.vue',
  'apps/client/src/components/login/PhoneBtn.vue',
  'apps/client/src/components/login/LoginLogo.vue',
  'apps/client/src/components/login/LoginIllustration.vue',
  'apps/client/src/components/discover/LongPressMenu.vue',
  'apps/client/src/components/discover/CardDetailOverlay.vue',
  'apps/client/src/components/discover/CardSwiper.vue',
  'apps/client/src/components/discover/AdvancedFilter.vue',
  'apps/client/src/components/discover/FilterDrawer.vue',
  'apps/client/src/components/chat/VoicePill.vue',
  'apps/client/src/components/chat/VoiceMessageBubble.vue',
  'apps/client/src/components/chat/VoiceRecorder.vue',
  'apps/client/src/components/chat/RedPacketBubble.vue',
  'apps/client/src/components/chat/IcebreakerSuggestions.vue',
  'apps/client/src/components/chat/HeartSignal.vue',
  'apps/client/src/components/chat/ChatItem.vue',
  'apps/client/src/components/setup/SetupProgress.vue',
  // 分包页面
  'apps/client/src/subpackages/support/feedback/index.vue',
  'apps/client/src/subpackages/discover/discussions/index.vue',
  'apps/client/src/subpackages/discover/activities/index.vue',
  'apps/client/src/subpackages/setup/recommend-pref/index.vue',
  'apps/client/src/subpackages/setup/profile/index.vue',
  // 全局
  'apps/client/src/App.vue',
  // 自定义 tab-bar
  'apps/client/src/custom-tab-bar/index.wxss',
  // 样式
  'apps/client/src/styles/_components.scss',
  'apps/client/src/theme/global.scss',
  'apps/client/src/uni.scss',
];

const root = 'd:\\6\\恋爱小程序';
let totalReplaced = 0;
let totalFiles = 0;

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  let fileReplaced = 0;

  // 循环替换直到没有匹配，处理多重嵌套情况
  let newContent = content;
  let prevContent;
  do {
    prevContent = newContent;
    newContent = newContent.replace(pattern, (match, outerVar, innerVar, value) => {
      // 仅当外层与内层 var 名一致时才合并
      if (outerVar === innerVar) {
        fileReplaced++;
        return `var(${outerVar}, ${value})`;
      }
      return match;
    });
  } while (newContent !== prevContent);

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    totalFiles++;
    totalReplaced += fileReplaced;
    console.log(`Fixed: ${rel} (${fileReplaced} fixes)`);
  }
}
console.log(`Total files fixed: ${totalFiles}`);
console.log(`Total fixes: ${totalReplaced}`);
