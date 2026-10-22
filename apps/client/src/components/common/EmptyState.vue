<script setup lang="ts">
/**
 * EmptyState - 统一空状态组件
 *
 * 支持两种使用方式：
 * 1. 预设类型：通过 `type` 选择 'no-data' | 'no-match' | 'no-chat'，自动匹配图标与 i18n 文案
 * 2. 显式传入：通过 `image` / `title` / `description` / `actionText` props 自定义内容
 *
 * 显式传入优先级高于预设类型，便于业务侧灵活覆盖。
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';
import { resolveMediaUrl } from '../../utils/media';
import XunmiMascot from './XunmiMascot.vue';

const props = withDefaults(defineProps<{
  /** 预设空状态类型 */
  type?: 'no-data' | 'no-match' | 'no-chat' | 'network';
  /** 兼容旧 prop：等价于 title */
  message?: string;
  /** 显式图标 URL（优先级最高） */
  image?: string;
  /** 显式主标题（优先级高于 type/message） */
  title?: string;
  /** R10-P2-008：隐藏副标题（空态只留一句） */
  hideSub?: boolean;
  /** 显式副标题/描述 */
  description?: string;
  /** 操作按钮文案（传入即渲染按钮，点击触发 action 事件） */
  actionText?: string;
  /** 吉祥物表情（传入则用寻觅芽替换图标） */
  /** 吉祥物表情名称，支持全部V2变体：mascot_default/mascot_happy/mascot_cry/mascot_sad 等 */
  mascot?: string;
}>(), {
  type: 'no-data',
  message: '',
  image: '',
  title: '',
  description: '',
  actionText: '',
});

const emit = defineEmits<{
  /** 点击操作按钮时触发 */
  action: [];
}>();

const { t } = useI18n();

/** 预设类型 → 图标映射 */
/* R8-L04-D04（素材缺失 P2）+ R8-L05-D11（需新建 P2）：
   `no-data` 过去映射 ICONS_COMMON.SEARCH（= /common/search.**png**，一枚放大镜）。
   放大镜的语义是「搜索无结果」，而 no-data 是全站默认态（props.type 默认值），
   circles/campus topic-detail 的「话题不存在或已被删除」、各处「暂无内容」都走它 ⇒
   帧上（x≈189/y≈150、y≈375..425）出现一枚与文案无关的放大镜。
   改指仓内既有素材 ICONS_COMMON.BOX_SVG（/common/box.svg，lucide 开口空箱＝
   「空/无数据」通用图形，dist 包内 icons/common 与后端 app-assets 双份在盘），
   同时把位图档换成矢量档（L05-D11「该资产是位图 PNG」那一半随之消失）。
   —— 不新建素材：本仓硬规矩只许用既有资产；已核 src/static 全量，
   除 box/package 外没有更贴「空数据」语义的现成插画，故取 box。
   私有色 #94A3B8 的归一仍走文末 .empty-icon--preset 的 filter（R7-L13-D03 已批口径，
   本车道不推翻该判定；<image> 无法用 currentColor 给外链 SVG 上色，filter 是组件内唯一杠杆）。 */
/* R12-L11-D08（素材缺失 P3 · chat-session top 帧）：`network` 预设过去复用 CLOSE
   （close.png，一枚大号灰 ✕）——「出错/缺会话」的示意拿「可关闭」图形顶替，帧上
   y≈388-460 就是这枚 ✕，用户第一读感是"能关掉"而不是"出错了"，与 no-data 的立方体、
   no-chat 的铃铛也不成语义体系。换指仓内既有、三棵树齐备的警示三角
   ICONS_COMMON.WARNING_SVG（/common/warning.svg，lucide alert-triangle：三角 + 感叹线 =
   「出错/注意」通用图形；src/static、static-local-backup/full-static、apps/api/uploads/
   app-assets 三份已核在盘，icons/common 前缀走包内幂等解析，运行时取值方式与其余
   预设一致，统一色相仍走 .empty-icon--preset 的 filter）。本组件 type="network" 的
   唯一消费者是 subpackages/chat/chat-session/index.vue:2090 错误态空态（其余 network
   空态走 ErrorState 组件，不经本映射，已 grep 证）。`no-match` 仍保留 CLOSE——
   那是「无匹配」语义，不在本卡范围，不动。 */
const presetIconMap: Record<string, string> = {
  'no-data': IMAGE_PATHS.ICONS_COMMON.BOX_SVG,
  'no-match': IMAGE_PATHS.ICONS_COMMON.CLOSE,
  'no-chat': IMAGE_PATHS.ICONS_COMMON.NOTIFICATION,
  'network': IMAGE_PATHS.ICONS_COMMON.WARNING_SVG,
};

/** 预设类型 → 副标题 i18n key 映射 */
const presetSubMap: Record<string, string> = {
  'no-data': t('empty.noDataSub'),
  'no-match': t('empty.noMatchSub'),
  'no-chat': t('empty.noChatSub'),
  'network': t('empty.networkSub'),
};

// R16（2026-09-07）：iconSrc 统一过 resolveMediaUrl——此前原样渲染 IMAGE_PATHS，
// real 模式下 app-assets 托管地址/相对路径未重写会导致空态图标 404 加载异常
const iconSrc = computed(() =>
  resolveMediaUrl(props.image || presetIconMap[props.type] || IMAGE_PATHS.ICONS_COMMON.BOX_SVG),
);

const titleText = computed(() => {
  if (props.title) return props.title;
  if (props.message) return props.message;
  return t('empty.noData');
});

const descriptionText = computed(() => {
  // R10-P2-008：hideSub 允许「只留一句」——空态主标题与「这里空空如也」语义重复时使用
  if (props.hideSub) return '';
  return props.description || presetSubMap[props.type] || t('empty.noDataSub');
});

const hasAction = computed(() => !!props.actionText);

function handleAction() {
  emit('action');
}
</script>

<template>
  <view
    class="empty"
    role="status"
    aria-live="polite"
    :aria-label="titleText"
  >
    <XunmiMascot v-if="mascot" :mood="mascot" size="lg" animated />
    <image
      v-else
      class="empty-icon"
      :class="{ 'empty-icon--preset': !props.image }"
      :src="iconSrc"
      mode="aspectFit"
      alt=""
    />
    <text class="empty-msg">{{ titleText }}</text>
    <text v-if="descriptionText" class="empty-sub">{{ descriptionText }}</text>
    <view
      v-if="hasAction"
      class="empty-action press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="actionText"
      @tap="handleAction"
    >
      <text class="empty-action__text">{{ actionText }}</text>
    </view>
    <slot />
  </view>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 80rpx/40rpx 无对应 sp token（sp 阶梯为 4/8/12/16/20/24/32/48rpx），固定布局尺寸保留 */
  padding: 80rpx 40rpx;
  /* R6-L05-D02（位置 P2）：空态块贴顶不居中——实测图标顶 y=167、按钮底 y=311，
     其下留白 487px，视觉重心只占帧高 29%。原声明只有 padding，无任何高度约束。
     按缺陷卡给的口径补组件这一半：`flex:1` 让本组件在「flex 列 + 有高度」的父级里
     撑满可用区，配合上面的 justify-content:center 即垂直居中。
     ⚠️ 另一半在宿主：父级必须给可解析高度（circles/campus topic-detail 页里
     :810-842 那条 `.empty-state{flex:1;justify-content:center}` 是模板无对应节点的死样式，
     实际走本组件）⇒ 登记给页面车道，本车道不改 subpackages/**。
     刻意不自证 min-height:xxvh —— 本组件有 30+ 消费点（含卡片内的小面积空态），
     给一个全局视口高度会把小空态撑成大块，属用新缺陷换旧缺陷。 */
  flex: 1 0 auto;
  box-sizing: border-box;
}
.empty-icon {
  /* 固定布局尺寸（图标 120rpx），无对应 token */
  width: 120rpx;
  height: 120rpx;
  margin-bottom: var(--sp-4);
}

/* R7-L13-D03（颜色 token P3 · 【R6 已批过，未落地】）：
   预设图标三枚（R8 起为 common/box.svg 与 close.png、notification.png，描线/像素主色同为
   #94A3B8（蓝灰，实测帧上 120rpx 图标渲染为 #91A0B6 最暗值），§1.2 全量色板无该档 ⇒
   在白卡上发蓝发飘，与同空态标题 --c-text-tertiary #6B7571 不同系。
   R6 那一轮把改动落在 static/assets/icons/common/search.**svg** 上，而 ICONS_COMMON.SEARCH
   这个键（config/images.ts:415）指过去的是 **.png**，运行时加载的从来不是那份 SVG ⇒
   帧上零差别。素材是位图、本车道不许改图，故按缺陷卡给的第二条口径在 image 上加 filter
   统一色相：grayscale(1) 抹掉蓝偏后按 #94A3B8→#6B7571 的亮度比压暗（107..117 / 161 ≈ 0.70），
   落点即三级文本色档。只对「走预设图标映射」的分支生效（:class 上的 --preset），
   业务侧显式传 image 的彩色插画不染色。 */
.empty-icon--preset {
  filter: grayscale(1) brightness(0.7);
}
/* R10-L10-D20（字号 P2 · favorites，同源复现于全部空态消费点）：
   主标题原取 --fs-lg=28rpx=14px、副标题 --fs-base=24rpx=12px ⇒ 两行只差 4rpx，
   帧上（favorites bottom：主句墨迹 y≈207..219 / 副句 y≈228..239，实测 13px vs 12px）
   没有任何一句读起来是「标题」，本页唯一的状态宣告与补充说明同权重。
   §1.3 字阶：辅助/小字档 12–13px、正文 15/16px（--fs-xl/2xl）。空态主句是本页的
   状态宣告，按正文档取 --fs-xl=30rpx=15px，与 --fs-base 副句拉开 3 档（24→26→28→30），
   层级立住；字号仅 +2rpx，图标 120rpx 与按钮 min-height 88rpx 未动 ⇒ 不引入溢出/遮挡。
   颜色与字重保持 R9-L10-D18 已定的 --c-text-secondary/600（那一轮改的是可达性轴，本条是字号轴）。 */
.empty-msg {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-secondary);
}
/* R9-L10-D18（可达性 P1 · favorites）+ R9-L04-D06（可达性 P2 · topic-detail）：
   副标题（favorites「在帖子页点收藏，喜欢的帖子会出现在这里」＝本页唯一功能指引，
   topic-detail「这里空空如也」）原取 --c-text-quaternary #9AA39F（design-variables.scss:126），
   落在页面底 --c-bg-page #EEF7F2（:127）上：
     亮度 #9AA39F L=0.35571 / #EEF7F2 L=0.91111 ⇒ (0.96111)/(0.40571) = 2.37:1
   --fs-base 24rpx 不享大字号豁免，2.37:1 低于正文 4.5:1、也低于次级文字 3:1 下限。
   升到 --c-text-secondary #4A524E（:122）L=0.080366 ⇒ 0.96111/0.130366 = 7.37:1。
   组件级一处改，30+ 消费点（含 favorites / topic-detail 两帧）同收益；
   缺陷卡另给的「本页传 hide-sub」属宿主页可写集（本车道只许改组件），
   语义重复那一半由页面车道决定，颜色轴在此收口。 */
.empty-sub {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  margin-top: var(--sp-2);
  text-align: center;
}
.empty-action {
  margin-top: var(--sp-6);
  padding: var(--sp-4) 40rpx; /* 40rpx 无对应 sp token，固定布局尺寸保留 */
  border-radius: var(--r-full, 9999rpx);
  /* R10-L04-D05（可达性 P1 · circles/topic-detail）+ R10-L05-D08（P1 · campus/topic-detail）
     + R10-L06-D18（P1 · discover/history）三卡同根因：空态唯一出口的按钮底取 --c-brand
     #36C99A（design-variables.scss:270），前景 .95 白 ⇒ 2.02–2.10:1（帧上实测 fill #36C99A、
     字 #F3F8F6，history 药丸 x153–225/y531–573），整页唯一可点件读不出。
     卡上建议的 brand-700 #1F8D6A 按 §2 算法只有 4.14:1，仍不达 4.5:1（R8 已实测否掉一次），
     故与 L05-D08 建议的深档一致取同族最深可用档 --c-brand-800 #156B51（:18）：
     L=0.11271 ⇒ .95 白合成后 6.01:1、纯白 6.45:1，≥4.5:1。
     与 BottomActionBar.vue:108、LegalTextPage.vue:477、LockScreen.vue:745 的主 CTA 同一档，
     全站「深绿实心 + 白字」口径归一；只动本组件，30+ 消费点同收益。 */
  background: var(--c-brand-800);
  /* R6-L05-D06（尺寸比例 P2）：空态唯一可点元素实测 62×35px = 123×69rpx，
     热区高 69rpx 比同页自述标准（topic-detail.vue:792「热区高度 ≥ 44px / min-height:88rpx」）
     少 19rpx；高度此前只由 padding 撑出，无 min-height。
     补 min-height:88rpx(44px) 并用 flex 居中保持文字视觉位置不变。 */
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.empty-action__text {
  font-size: var(--fs-base);
  font-weight: 600;
  /* 前景归位到 --c-neutral-0（#FFFFFF，design-variables.scss:350）：
     --c-text-inverse 自 decisions-v33 §2 起即「图片遮罩白字」rgba(255,255,255,.95)
     （:369 → :749），用作按钮前景属令牌误配，且那 5% 透明白把对比度从 6.45:1 削到 6.01:1。
     与 LegalTextPage.vue:487 / LockScreen.vue:761 的主 CTA 前景同口径（均 --c-neutral-0）。 */
  color: var(--c-neutral-0, #FFFFFF);
}
</style>
