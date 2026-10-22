<script setup lang="ts">


/**
 * 校园圈 Hub（v3 Nearby 冻结 · 04_campus_circle）
 * 加入校园圈引导 + 校园列表（未认证/认证中/已认证/非本校 四态）+ 校园圈推荐。
 * 点击学校：已认证本校 → 私域（campus/index?school=）；其他 → 公开浏览。
 */
import { ref, computed } from "vue";
import { onShow, onPageScroll } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
// R6 §1.6 铁律 3：本页图片绑定改为统一经 resolveMediaUrl 解析
// （mock 档留包内 /static、real 档按 cdn-buckets 出后端 app-assets URL、/uploads/** 补鉴权 token）
import { resolveMediaUrl } from "../../../utils/media";
import { useI18n } from "vue-i18n";
import { useCampusStore } from "../../../stores/campus";
import { useSessionStore } from "../../../stores/session";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { SCHOOLS } from "../../../config/schools";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../../config/images";
// 第五轮 QA（补做）：校园圈卡片统一浅绿背景 + 学校名字，移除每校一色渐变与首字徽标。
// 渲染逻辑支持 coverUrl：coverUrl 非空 → 显示图片；空 → 浅绿背景 + 学校名字。

const { t } = useI18n();
const campusStore = useCampusStore();
const sessionStore = useSessionStore();
const { styleVars: menuStyleVars } = useMenuButtonRect();

/**
 * R6-L05-D29（尺寸比例 P2）：常驻吸顶带吃掉 16% 视口。
 * 实测本帧与 top 帧在 y=0..100 区间 37329/37800 像素逐字节相同（98.8%）
 * ⇒ 状态栏 + 标题 + 副标题 + 20rpx 下衬整块在滚动后仍留在屏上（≈130px，理想图换算后 ≈90px）。
 * 滚动过阈值后收副标题、并把「胶囊呼吸量 20px」并掉一份（胶囊已由 padding-right
 * calc(--capsule-right + 104px) 做横向避让，纵向再留 20px 是重复计费），
 * 使常驻带降到 ≈96px。本页是 window 滚动（R1-L05-D19 已移除内层 scroll-view），
 * 故用页面级 onPageScroll 而非 scroll 事件。
 */
const headerCompact = ref(false);
onPageScroll((e) => {
  const next = e.scrollTop > 24;
  if (next !== headerCompact.value) headerCompact.value = next;
});
const { certificationStatus, certificationInfo, isVerified } = storeToRefs(campusStore);

/** 2026-08-20：校园圈搜索关键词（参考图顶部搜索框对齐） */
const searchKeyword = ref("");

/**
 * 2026-08-27 校园圈修复：校园封面图映射（复用 /static/generated/images/campus 既有素材，
 * 让每个校园圈卡片都有真实封面图，不再只有浅绿背景 + 学校名）。
 */
const CAMPUS_COVER: Record<string, string> = {
  // 2026-09-03 可选缺口清零：头部三校换专属地标封面（AI 生成实景风格，对齐理想效果图）
  pku: IMAGE_PATHS.GENERATED.CAMPUS_GATE_LANDMARK,
  thu: IMAGE_PATHS.GENERATED.CAMPUS_ARCH_LANDMARK,
  ruc: IMAGE_PATHS.GENERATED.CAMPUS_LAKE_PAVILION,
  fudan: IMAGE_PATHS.GENERATED.CAMPUS_PLAYGROUND,
  sjtu: IMAGE_PATHS.GENERATED.CAMPUS_NIGHT,
  tongji: IMAGE_PATHS.GENERATED.CAMPUS_CLASSROOM,
  zju: IMAGE_PATHS.GENERATED.CAMPUS_CAFETERIA,
  nju: IMAGE_PATHS.GENERATED.CAMPUS_RAIN,
  whu: IMAGE_PATHS.GENERATED.CAMPUS_GATE,
  sysu: IMAGE_PATHS.GENERATED.CAMPUS_LIBRARY,
  szu: IMAGE_PATHS.GENERATED.CAMPUS_LAKE,
};

/** 2026-08-27 校园圈修复：展示全部学校圈（不再只取前 6 个），并附加校园封面图
 *  2026-09-12 素材补齐：无地标专属封面的学校兜底改用 campus-circle-cover（摄影级校园场景），
 *  不再回落到「浅绿背景 + 学校名」 */
const schools = SCHOOLS.map((s) => ({
  ...s,
  coverUrl: CAMPUS_COVER[s.id] || s.coverUrl || IMAGE_PATHS.CIRCLE_COVERS.CAMPUS,
}));

/** R11-L04-D15（P0 · 假计数，按 §12.4 合法形态之二处置）：
 *  学校卡原先的「3.2k 位同学 · 2.8w 条动态」「等 342 位同学」是按校 id 硬编码的字面量表
 *  （11 校 + 一组对所有表外学校共用的 fallback 常量），不是后端读数；列表超过 11 所即出现
 *  多卡同数。后端 /config/campuses 的 CampusView 只有 id/name/city
 *  （services/config.ts:36-43），没有成员数/动态数/好友数列。
 *  没有真值支撑的数字连同成员头像预览整块撤下——不换一组新常量、不挪写死表、不按 id 造数；
 *  后端补列后再按接口数据渲染。
 *  R11-L04-D19（k/w 混档）与 D15 同源：该行不再渲染，读者不会再在同一列看到两档缩写。 */

/** R2b-L05-D11：理想图卡片标题为「北京大学圈 / 清华大学圈」带「圈」后缀，
 *  而数据源（config/schools.ts SCHOOLS[].name）是校名本体「北京大学」——后缀属展示层，
 *  在模板侧拼接（endsWith 守卫，避免数据侧将来自带后缀时拼成「北京大学圈圈」）。 */
function schoolTitle(name: string): string {
  if (!name) return "";
  return name.endsWith("圈") ? name : `${name}圈`;
}

/** 我加入的（本校已认证）。
 * MP-R2-CAMPUS-HUB-002：补认证门槛——bindSchool 直写 campusName 不经认证，
 * 未认证但已绑定学校的用户原会看到「未认证」badge + 「进入」CTA 的矛盾组合
 * （进入后被 campus/index 门禁又降级为公开浏览） */
const joinedSchools = computed(() =>
  isVerified.value ? schools.filter((sc) => sc.name === ownSchool.value) : []
);
/** 推荐圈子（其他学校）。
 * MP-R1-CH06-01 / MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-001/REQ-01：排除本校仅在
 * 已认证时生效——未认证用户的 ownSchool 回退 session.campusName（注册选校即写入），
 * 原实现无条件排除导致本校圈在本页「看不到、搜不到、进不去」（推荐 10 卡无北大、
 * 搜索「北京」空态）；未认证时本校卡应以「未认证」badge + 公开浏览视角出现在推荐列表 */
const recommendedSchools = computed(() =>
  isVerified.value && ownSchool.value ? schools.filter((sc) => sc.name !== ownSchool.value) : schools
);

const isPending = computed(() => certificationStatus.value === "pending");
const ownSchool = computed(() => certificationInfo.value?.schoolName || sessionStore.userSession?.campusName || "");

/**
 * MP-R1-CAMPUS-HUB-001：badge 三态（认证通过/审核中/未认证）——
 * 未认证用户不再被谎报为「认证中」，且每个状态都有对应配色修饰类；
 * 推荐 Tab 统一显示「未认证」灰胶囊。
 */
const joinedBadge = computed<{ text: string; class: string }>(() => {
  if (activeTab.value === "recommend") {
    return { text: t("campus.hub.unverified"), class: "campus-school-card__badge--unverified" };
  }
  if (isVerified.value) {
    return { text: t("campus.hub.certified"), class: "campus-school-card__badge--verified" };
  }
  if (isPending.value) {
    return { text: t("campus.hub.statusPending"), class: "campus-school-card__badge--pending" };
  }
  return { text: t("campus.hub.unverified"), class: "campus-school-card__badge--unverified" };
});

/** 当前选中的 Tab：joined = 我加入的，recommend = 推荐圈子
 * 2026-08-27 校园圈修复：默认落到「推荐圈子」，避免"我加入的"仅有 1 校导致页面大片空白 */
const activeTab = ref<"joined" | "recommend">("recommend");

/**
 * 校园圈封面：2026-08-27 修复后由 CAMPUS_COVER 提供各校封面图（见上方定义），
 * 卡片封面区渲染校园风景图；未命中时回退浅绿背景 + 学校名字。
 * coverUrl 数据模型保留（config/schools.ts School.coverUrl?），未来后端下发时优先使用。
 */

/** Tab 切换过滤列表 */
const filteredSchools = computed(() => {
  const base = activeTab.value === "joined" ? joinedSchools.value : recommendedSchools.value;
  const kw = searchKeyword.value.trim();
  const list = kw
    ? base.filter((sc) => sc.name.includes(kw) || sc.id.includes(kw.toLowerCase()))
    : base;
  return list;
});

/**
 * R2b-L05-D15（需新建 / 列表末尾「查看更多校园圈 ⌄」入口）
 *
 * 理想图 校园圈.png 列表末尾那行是「灰色文字 + 向下箭头」的**可点入口**，且理想图在该行之上
 * 正好排了 6 张卡。原实现（MP-R1-CAMPUS-HUB-003）因为「箭头暗示可展开但点击无响应」是死元素，
 * 把箭头删了、文案换成静态「更多校园圈持续接入中」——那是拿掉入口去迁就坏实现，
 * 方向与理想图相反（R2b-L05-D15 判为「上一轮修得不对」）。
 *
 * 这里把语义补全而不是把内容藏起来做样子：折叠只作用在**已渲染的真实学校列表**上
 * （SCHOOLS / 后端 campuses 接口，无一条伪造条目），箭头方向即当前态，一次点击即可看全。
 * 2026-08-27 那次「展示全部学校圈（不再只取前 6 个）」是为了补偿当时的死控件；
 * 控件真实可用后，恢复理想图的 6 张预览 + 展开语义。
 * 搜索态不折叠（结果本就少，折叠会把命中项藏掉）；不足预览数时该行自动退化为不可点的说明行。
 */
const SCHOOL_PREVIEW = 6;
const schoolsExpanded = ref(false);
const canToggleMore = computed(() => filteredSchools.value.length > SCHOOL_PREVIEW);
const visibleSchools = computed(() => {
  const list = filteredSchools.value;
  if (!canToggleMore.value || schoolsExpanded.value || searchKeyword.value.trim()) return list;
  return list.slice(0, SCHOOL_PREVIEW);
});
function toggleSchools() {
  if (!canToggleMore.value) return;
  schoolsExpanded.value = !schoolsExpanded.value;
}
/** 理想图整句「查看更多校园圈」。locale 无整句词条（只有 common.viewMore + campus.hub.title），
 *  故展示层拼接；拉丁语系两词间补空格，避免 "View moreCampus Circles" 连字。 */
const moreLabel = computed(() => {
  const head = t("common.viewMore");
  const tail = t("campus.hub.title");
  return /[一-鿿]$/.test(head) ? `${head}${tail}` : `${head} ${tail}`;
});

// MP-R2-CAMPUS-HUB-003：onLoad 原读取 ?school= 写入 selectedSchool 死状态（全页零消费），
// 参数消费语义由 goSchool 链路承接；死 ref 已删除

// MP-R2-CAMPUS-HUB-004：认证状态拉取失败可感知（原空 catch + errorMessage 零消费，
// 非 404 失败静默按「未认证」渲染）——错误条 + 重试入口
const certLoadFailed = ref(false);
async function refreshCertification(): Promise<void> {
  certLoadFailed.value = false;
  try {
    await campusStore.fetchCertificationStatus();
  } catch (_e) {
    certLoadFailed.value = true;
    return;
  }
  if (campusStore.errorMessage) certLoadFailed.value = true;
}
onShow(() => {
  void refreshCertification();
});

function goSchool(schoolName: string) {
  openAppPath(`${ROUTES.CAMPUS.INDEX}?school=${encodeURIComponent(schoolName)}`);
}

function goCertification() {
  openAppPath(ROUTES.CAMPUS.CERTIFICATION);
}

// MP-R2-CAMPUS-HUB-006：栈底兜底（分享/编译直达栈=1 时裸 navigateBack 静默失败），
// 与 campus/index.vue:98-106 同口径
function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: "/pages/nearby/index" });
  }
}
</script>

<template>
  <view class="campus-hub" :style="menuStyleVars">
    <!-- MP-R2-CAMPUS-HUB-004：认证状态拉取失败错误条 + 重试（原全链路静默） -->
    <view v-if="certLoadFailed" class="campus-hub__cert-error">
      <text class="campus-hub__cert-error-text">{{ campusStore.errorMessage || t('common.networkError') }}</text>
      <view class="campus-hub__cert-error-retry press-feedback" role="button" @tap="refreshCertification">
        <text class="campus-hub__cert-error-retry-text">{{ t('common.retry') }}</text>
      </view>
    </view>
    <view class="campus-hub__header" :class="{ 'campus-hub__header--compact': headerCompact }">
      <view class="campus-hub__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.back')" @tap="goBack">
        <text class="campus-hub__back-text">&#x2039;</text>
      </view>
      <view class="campus-hub__title-col">
        <text class="campus-hub__title">{{ t('campus.hub.title') }}</text>
        <text v-show="!headerCompact" class="campus-hub__subtitle">{{ t('campus.hub.subtitle') }}</text>
      </view>
      <!-- 页头不再放重复的认证入口（MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-002）：
           认证动作只保留下方引导横幅那一处；这里只在已认证时挂状态标记。 -->
      <view v-if="isVerified" class="campus-hub__cert-badge">
        <text class="campus-hub__cert-badge-text">{{ t('campus.hub.certified') }}</text>
      </view>
    </view>

    <!-- 加入引导 -->
    <view class="campus-guide card-base">
      <view class="campus-guide__icon">
        <image class="campus-guide__icon-img" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.GRADUATION_CAP_SVG)" mode="aspectFit" alt="" />
      </view>
      <view class="campus-guide__body">
        <text class="campus-guide__title">{{ t('campus.hub.guideTitle') }}</text>
        <text class="campus-guide__desc">{{ t('campus.hub.guideDesc') }}</text>
      </view>
      <view
        v-if="!isVerified"
        class="campus-guide__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('campus.hub.goCertify')"
        @tap="goCertification"
      >
        <text class="campus-guide__btn-text">{{ isPending ? t('campus.hub.viewProgress') : t('campus.hub.goCertify') }}</text>
      </view>
      <view v-else class="campus-guide__badge">
        <text class="campus-guide__badge-text">{{ t('campus.hub.certified') }}</text>
      </view>
    </view>

    <!-- 2026-08-20：搜索框（参考图对齐） -->
    <view class="campus-search">
      <view class="campus-search__icon">
        <image class="campus-search__icon-text" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.SEARCH)" mode="aspectFit" alt="" />
      </view>
      <input
  cursor-spacing="20"
        v-model="searchKeyword"
        class="campus-search__input"
        :placeholder="t('campus.hub.searchPlaceholder')"
        placeholder-class="campus-search__placeholder"
        confirm-type="search"
        :aria-label="t('campus.hub.searchAria')"
      />
      <text v-if="searchKeyword" class="campus-search__clear" role="button" :aria-label="t('campus.hub.clearAria')" @tap="searchKeyword = ''">×</text>
    </view>

    <!-- Tab 切换 -->
    <view class="campus-hub__tabs">
      <view
        class="campus-hub__tab"
        role="tab"
        :aria-selected="activeTab === 'joined'"
        @tap="activeTab = 'joined'"
      >
        <text class="campus-hub__tab-text" :class="{ 'campus-hub__tab-text--active': activeTab === 'joined' }">{{ t('campus.hub.joinedTitle') }}</text>
        <view v-if="activeTab === 'joined'" class="campus-hub__tab-indicator" />
      </view>
      <view
        class="campus-hub__tab"
        role="tab"
        :aria-selected="activeTab === 'recommend'"
        @tap="activeTab = 'recommend'"
      >
        <text class="campus-hub__tab-text" :class="{ 'campus-hub__tab-text--active': activeTab === 'recommend' }">{{ t('campus.hub.recommendTitle2') }}</text>
        <view v-if="activeTab === 'recommend'" class="campus-hub__tab-indicator" />
      </view>
    </view>

    <!-- R1-L05-D19：原内层 scroll-view(scroll-y)+外层 height:100%/overflow:hidden 吞掉页面滚动，
         末卡在屏幕底边被硬裁、bottom 帧与 top 帧逐像素相同。改为普通 view 走页面级滚动；
         该 scroll-view 未绑任何事件（无 @scrolltolower / scroll-top / scroll-into-view），
         去掉后滚动语义与交互不变，仅高度约束交回页面 -->
    <view class="campus-hub__feed">
    <!-- 空状态 -->
    <view v-if="filteredSchools.length === 0" class="campus-hub__empty">
      <text class="campus-hub__empty-text">{{ activeTab === 'joined' ? t('campus.hub.emptyJoined') : t('campus.hub.emptyRecommend') }}</text>
    </view>

    <!-- 圈子卡片列表 -->
    <view
      v-for="school in visibleSchools"
      :key="school.id"
      class="campus-school-card press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="schoolTitle(school.name)"
      @tap="goSchool(school.name)"
    >
      <!-- 封面恒有兜底 URL（script 里 schools 的第三层兜底是常量），所以「无封面」分支永远进不去；
           原来的 v-else 校名文本 + 那条条件类一起删掉，渲染结果与删前逐像素相同（--img 类此前恒为真）。 -->
      <view class="campus-school-card__cover campus-school-card__cover--img">
        <image class="campus-school-card__cover-img" :src="resolveMediaUrl(school.coverUrl)" mode="aspectFill" alt="" />
      </view>

      <!-- 内容 -->
      <view class="campus-school-card__body">
        <view class="campus-school-card__name-row">
          <!-- R2b-L05-D11：理想图标题带「圈」后缀（北京大学圈），数据源是校名本体，展示层拼接 -->
          <text class="campus-school-card__name">{{ schoolTitle(school.name) }}</text>
          <view
            class="campus-school-card__badge"
            :class="joinedBadge.class"
          >
            <text class="campus-school-card__badge-text">{{ joinedBadge.text }}</text>
          </view>
        </view>
        <!-- R11-L04-D15：在位同学/动态数/好友数无后端列，整块不渲染（原先的字面量表已删除） -->
      </view>

      <!-- 操作按钮（描边样式） -->
      <view class="campus-school-card__cta" :class="{ 'campus-school-card__cta--outline': activeTab !== 'joined' }">
        <text class="campus-school-card__cta-text">{{ activeTab === 'joined' ? t('campus.hub.enter') : t('campus.hub.join') }}</text>
      </view>
    </view>

    <!-- 2026-08-27：底部"查看更多校园圈"（对齐理想图 校园圈.png 底部提示）
         R2b-L05-D15：恢复理想图的「灰字 + 向下箭头」可点入口——箭头节点重新挂上此前零引用的
         .campus-hub__more-arrow（孤儿规则），@tap 绑定列表折叠/展开，role="button" + aria-label
         补可访问语义。MP-R1-CAMPUS-HUB-003 当年删箭头是因为它是死元素，现元素已绑真实动作。 -->
    <view
      class="campus-hub__more"
      :class="{ 'campus-hub__more--static': !canToggleMore }"
      role="button"
      :aria-label="moreLabel"
      :aria-expanded="canToggleMore ? String(schoolsExpanded) : undefined"
      @tap="toggleSchools"
    >
      <text class="campus-hub__more-text">{{ canToggleMore ? moreLabel : t('campus.hub.moreHint') }}</text>
      <text v-if="canToggleMore" class="campus-hub__more-arrow" :class="{ 'campus-hub__more-arrow--up': schoolsExpanded }">&#x2304;</text>
    </view>
    <view class="campus-hub__footer" />
    </view>
  </view>
</template>

<style scoped lang="scss">
/* MP-R2-CAMPUS-HUB-004：认证状态错误条 */
.campus-hub__cert-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  /* R2b-L05-D14 连带：状态栏避让已从 .campus-hub 的 padding-top 迁入吸顶导航带后，
     本条是容器首个子节点、排在吸顶带之上，须自带一份状态栏内衬，否则错误文案压在状态栏上 */
  margin: calc(var(--statusbar, env(safe-area-inset-top)) + 16rpx) 32rpx 0;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: var(--c-error-bg-tint, rgba(229, 69, 77, 0.1));
}
.campus-hub__cert-error-text {
  flex: 1;
  font-size: 24rpx;
  color: var(--c-error, #E5454D);
}
.campus-hub__cert-error-retry {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36C99A);
}
.campus-hub__cert-error-retry-text {
  font-size: 24rpx;
  color: var(--c-neutral-0, #FFFFFF);
}

.campus-hub {
  display: flex;
  flex-direction: column;
  /* R1-L05-D19：原 height:100% + overflow:hidden 把滚动锁死在内层 scroll-view 里
     （全局无 page{height:100%}，页面级滚动带不动内层容器 ⇒ bottom 帧=top 帧、末卡被屏底硬裁）。
     列表已改为页面级滚动，容器随内容增长，只保留最小视口高度铺满底色 */
  min-height: 100vh;
  /* R2b-L05-D10（颜色token）：页面底从 --c-bg-page(#EEF7F2 薄荷) 改纯白。
     理想图 校园圈.png 页面底取色实测 rgb(254,254,254)=#FEFEFE，卡片同为白底、
     靠 1rpx 描边 + 投影分层；原整页薄荷使卡内白卡与页面几乎同色、卡边界只能靠阴影勉强看出。
     薄荷档保留给引导卡（.campus-guide 的 --c-brand-bg-tint 单色底；R11-L04-D16 已去掉
     原来的 --c-brand-50 → #FFFFFF 渐变）与徽标底色（--c-brand-50）。
     与同文件 .campus-school-card 的 --c-neutral-0 取同一令牌，保持本页白档单一来源。 */
  background: var(--c-neutral-0, #FFFFFF);
  /* R2b-L05-D14（层级遮挡）：状态栏避让不再写在容器 padding-top 上——页面级滚动会把这段
     内衬连同吸顶内容一起推走，bottom 帧首卡封面直接压在状态栏时间上、微信胶囊叠在卡片
     徽标/按钮区。避让改由下方 .campus-hub__header 这条吸顶导航带承担（高度 = 状态栏 + 胶囊带），
     容器顶部只留常规呼吸间距，滚动内容恒从该带下方穿过。 */
  padding: 0 32rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.campus-hub__feed {
  /* R1-L05-D19：不再是定高滚动容器 ⇒ flex:1 0 auto（内容不足一屏时铺底色，超出时不收缩不被裁） */
  flex: 1 0 auto;
}

/* ===== Header ===== */
/* R2b-L05-D14（层级遮挡，P1）：页头改为吸顶导航带。
   原状态栏避让只写在容器 .campus-hub 的 padding-top 上，页面级滚动一滚这段内衬就被推走，
   bottom 帧里第一张卡的封面图直接压在状态栏时间上、微信胶囊叠在「同济大学」这行的徽标/按钮区。
   现由本带承担避让：top:0 吸顶 + padding-top = 状态栏 + 胶囊带高度 + 同色不透明底，
   滚动内容恒从带下方穿过，顶部不留裸内容带（理想图：滚动后列表内容始终从状态栏/胶囊之下穿过）。
   左右 -32rpx 负衬破出容器 gutter 让底色铺满整行，再由 padding 把内容送回原栅格，
   与 AppShell .is-fixed .shell__header 的吸顶口径一致。 */
.campus-hub__header {
  display: flex;
  align-items: center;
  /* R1-L05-D12：原 space-between + 整行 padding-right 让标题列被顶到屏宽约 26% 处悬空
     （理想图：大标题贴左栅格起排）。改为从左往右排、右侧状态标记自己吸右，
     padding-right 只作用到被 margin-left:auto 推到右侧的那一档 */
  justify-content: flex-start;
  gap: 16rpx;
  position: sticky;
  top: 0;
  z-index: var(--z-header, 10);
  background: var(--c-neutral-0, #FFFFFF);
  /* R6-L05-D28（层级遮挡 P2）：改前是 margin: 0 -32rpx 24rpx —— 底部那 24rpx 是**外边距**，
     不透明背景铺不到那里，于是滚动时上一张卡的封面会从这条 12px 透明带里露出来
     （bottom 帧实测 y=134-139、x=28-105 一条 #A2CC6B→#69A824 照片残边，上沿紧贴头部白底）。
     现把这 24rpx 并进 padding-bottom（20rpx→44rpx），常驻带整块不透明，残边消失、间距不变。 */
  margin: 0 -32rpx;
  /* 上：状态栏 + 胶囊带（20px 为原容器内衬里的胶囊呼吸量）+ 20rpx 呼吸
     右：避让微信胶囊（--capsule-right/--statusbar 由 useMenuButtonRect 注入）
     R4：原 padding-right = capsule-right(7px)+8px 漏加胶囊本体 87px，认证按钮被胶囊压住 85%
     MP-R1-CAMPUS-HUB-004：状态栏只计一份——避让位已从容器 padding-top 迁入本带，不再叠加 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 20px + 20rpx)
    calc(var(--capsule-right, 7px) + 104px) 44rpx 32rpx;
  box-sizing: border-box;
  transition: padding-top 0.2s ease;
}

/* R6-L05-D29（尺寸比例 P2）：滚动后收起副标题（见模板 v-show）并把纵向那份 20px 胶囊呼吸量
   去掉——胶囊本体已由 padding-right calc(--capsule-right + 104px) 做**横向**避让，
   纵向再计一份是重复计费。常驻带由 ≈130px（258rpx）降到 ≈96px（≈192rpx），
   对齐理想图 校园圈.png 页头换算后 ≈90px，满足「常驻带 ≤ 100px」。 */
.campus-hub__header--compact {
  padding-top: calc(var(--statusbar, env(safe-area-inset-top)) + 20rpx);
}

.campus-hub__back {
  /* R10-L04-D19（P2 · 可达性）：实测 64rpx（32×32px），只有 88rpx/44px 热区标准的 73%。
     本页只有这一个返回控件（系统返回是兜底），扩到 88rpx。
     父级 .campus-hub__header 已是 display:flex + align-items:center ⇒ 扩大后钮心自动
     与标题行垂直居中，不需要再加 margin。flex-shrink:0 防止被标题列挤压回 64rpx。 */
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* R6-L05-D26（可达性 P2）：白底白钮——改前 background 取 --c-bg-container(#FFFFFF)、
     描边取 --c-line(#EEF2F0)，而头部 background 本身就是 #FFFFFF，
     实测 x=8-56 / y=40-120 整块只有 20 个平均亮度 <200 的像素（全靠被切掉大半的「‹」提示）。
     现底色下沉到页面底、描边换成品牌绿 200 阶：与头部白底最大通道差
     #A3EBCF vs #FFFFFF = (92,20,48)/255，远超判据要求的 ≥20/255。 */
  background: var(--c-bg-page, #EEF7F2);
  border: 2rpx solid var(--c-brand-200, #A3EBCF);
  box-sizing: border-box;
}

.campus-hub__back-text {
  font-size: 40rpx;
  color: var(--c-text-primary, #222222);
  line-height: 1;
}

.campus-hub__title-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
}

.campus-hub__title {
  /* R1-L05-D13：主标题 36rpx 比理想图（≈48rpx）低一档，且与卡片校名 30rpx 只差 6rpx、层级被压平 */
  font-size: var(--fs-6xl, 48rpx);
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.campus-hub__subtitle {
  /* R1-L05-D13：副标题 24rpx → 28rpx（理想图约 28rpx） */
  font-size: var(--fs-lg, 28rpx);
  font-weight: 400;
  color: var(--c-text-tertiary, #8A9694);
}

.campus-hub__cert-badge {
  /* R1-L05-D12：header 改左对齐后，右侧状态标记由 margin-left:auto 吸右，
     仍落在 padding-right 预留的胶囊避让区内 */
  margin-left: auto;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: var(--c-bg-brand, #E8FAF3);
}

.campus-hub__cert-badge-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--c-brand, #36C99A);
}

/* ===== Certification Guide ===== */
.campus-guide {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx;
  border-radius: 22rpx;
  /* R11-L04-D16（颜色token P2）：改前是 135° 渐变（--c-brand-50 → #FFFFFF 字面量），
     帧上左缘 #E9FAF4、右缘 #FCFFFD——右半褪成纯白，「去认证」钮坐在白底上，
     横幅左右不再是同一块氛围面。规范 §3.12 要求统一绿浅底 ⇒ 收成单色品牌底纹令牌，
     去掉 #FFFFFF 私有字面量（渐变写法一并去掉，不再靠两端同色伪装纯色）。 */
  background: var(--c-brand-bg-tint, #E8FAF3);
  border: 1rpx solid var(--c-line, #EEF2F0);
  margin-bottom: 32rpx;
}

.campus-guide__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  /* R11-L04-D17（颜色token P2）：改前 background: var(--c-bg-container,#FFFFFF) 的白色托盘
     压在横幅浅绿底上只有 1.04:1，托盘轮廓读不出来（只剩一枚深灰图形悬在浅底上）。
     理想图该位置没有托盘 ⇒ 托盘整体撤掉，学士帽直接落在横幅底纹上。
     图标本身是 graduation-cap.svg 的硬编码 stroke #94A3B8（素材非本车道可改），
     「学士帽着品牌绿」需换/改素材，已在交件里登记。 */
  background: transparent;
  flex-shrink: 0;
}

.campus-guide__icon-img {
  width: 40rpx;
  height: 40rpx;
}

.campus-guide__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.campus-guide__title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.campus-guide__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.campus-guide__btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R2b-L05-D16：实心 CTA 底色从 --c-brand(#36C99A) 收敛到深一档品牌绿 --c-brand-600(#2AAE83)。
     理想图 校园圈.png「去认证」取色实测 rgb(4,186,116)=#04BA74（本车道 PIL 复量，
     缺陷卡记的 #08B870 同档）；对品牌色阶做 CIE L*a*b* 距离：600 档 dE=16.7、
     500 档 dE=15.0、700 档 dE=26.8 —— 500/600 近乎并列，但 500 正是被诉「偏薄荷、淡一档」
     的当前值，且 R2b-L05-D03 的 circle-home 主 CTA（理想 #33A06E）唯一收敛解是 600 档
     （dE=7.3），两条缺陷要求「与 circle-home 的 CTA 一起收敛到同一档」⇒ 取 --c-brand-600。
     缺陷建议的「在 design-variables.scss 增设 --c-brand-action」不可执行：theme/ 为只读集，
     故映射到既有最近档位令牌。渐变两端同色＝纯色，保留写法不动结构。 */
  background: linear-gradient(135deg, var(--c-brand-600, #2AAE83) 0%, var(--c-brand-600, #2AAE83) 100%);
}

.campus-guide__btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.campus-guide__badge {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand-50, #E8FAF3);
}

.campus-guide__badge-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-brand-600, #36C99A);
}

/* ===== Tab Bar ===== */
.campus-hub__tabs {
  display: flex;
  gap: 0;
  margin-bottom: 28rpx;
  border-bottom: 2rpx solid var(--c-line, #EEF2F0);
}

.campus-hub__tab {
  position: relative;
  padding: 20rpx 0;
  margin-right: 48rpx;
}

.campus-hub__tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--c-text-tertiary, #8A9694);
}

.campus-hub__tab-text--active {
  font-weight: 700;
  /* R10-L04-D18（P1 · 可达性）：改前 --c-brand #36C99A 压白底实测 2.10:1，
     比同排未选段 --c-text-tertiary #6B7571（4.76:1）还淡 ⇒ 分段控件读不出当前态。
     卡里建议的 brand-600（2.81）/brand-700（4.14）按已知机制 §2 的白底算档都不到 4.5:1，
     故与 R9 同口径取 --c-brand-800 #156B51 = 6.45:1（design-variables.scss:18）。 */
  color: var(--c-brand-800, #156B51);
}

.campus-hub__tab-indicator {
  position: absolute;
  bottom: -2rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  /* R10-L04-D18：下划线与选中字同色（非文本对比同样从 2.06 提到 6.45）。 */
  background: var(--c-brand-800, #156B51);
}

/* ===== Empty State ===== */
.campus-hub__empty {
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.campus-hub__empty-text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #8A9694);
}

/* ===== School Card ===== */
.campus-school-card {
  display: flex;
  align-items: stretch;
  gap: 20rpx;
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 28rpx;
  /* 2026-08-27 校园圈修复：卡片统一白色圆角卡 + 校园封面图（对齐理想图 校园圈.png） */
  background: var(--c-neutral-0, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  box-shadow: 0 6rpx 24rpx rgba(26, 55, 48, 0.06);
  overflow: hidden;
}

.campus-school-card__cover {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-brand, #E6F6EF);
}

.campus-school-card__cover--img {
  background: var(--c-neutral-100, #F2F4F3);
}

.campus-school-card__cover-img {
  width: 100%;
  height: 100%;
}

.campus-school-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.campus-school-card__name-row {
  display: flex;
  align-items: center;
  /* R6-L05-D25 / R6-L05-D30（文案 P2）：改前不换行，badge 又 flex-shrink:0 不让位，
     于是长校名被压成省略号——top 帧「中国人民大学圈」只剩「中国人民大…」（名墨块 x=117-176，
     badge 起点 x=195），bottom 帧「上海交通大学圈」同样受害，滚到底 40% 的卡主名带省略号。
     现允许**整行换行**：名称放不下时 badge 让到第二行，名称独占首行全宽
     （卡内可用宽 ≈496rpx，8 字 ×30rpx = 240rpx，绰绰有余）。
     注意这不是把校名折成两行——MP-R8-CAMPUS-001 修的「人民大/学」内部折行仍由
     .campus-school-card__name 的 white-space:nowrap 挡住，此处只让 badge 换行。 */
  flex-wrap: wrap;
  /* R11-L04-D18（位置 P2）：帧上 7 字校名（中国人民大学圈 / 上海交通大学圈）的「未认证」
     胶囊掉到第二行，5 张卡 2 张换档。卡内可用宽实测约 294rpx（封面 160 + gap 20 + 卡内衬 40
     + 页边距 64 之后，再让出右侧「申请加入」胶囊 152rpx），原 7×30rpx 名 + 12rpx gap +
     100rpx 胶囊 ≈ 322rpx，越界一整档 ⇒ 校名收 28rpx、胶囊左右内衬 14→8rpx、行内 gap 收 8rpx：
     7×28 + 8 + 88 = 292rpx，7 字名与胶囊回到首行；wrap 仍保留给更长的兜底名。 */
  gap: 8rpx;
}

/* R10-P2-007：校名行禁折行（超长省略），badge 不参与收缩 */
.campus-school-card__name-row .campus-school-card__badge {
  flex-shrink: 0;
}

.campus-school-card__name {
  /* R11-L04-D18：30rpx → 28rpx，给同排胶囊让出 14rpx（见 .campus-school-card__name-row） */
  font-size: 28rpx;
  font-weight: 700;
  /* 2026-08-27：白卡上名称用正文主色 */
  color: var(--c-text-primary, #222222);
  /* MP-R8-CAMPUS-001（2026-09-16）：「中国人民大学/上海交通大学」被 badge 挤压折行（人民大/学）。
     名称按内容收缩 + 禁止折行（超长省略），badge 不参与收缩。 */
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Badge ===== */
.campus-school-card__badge {
  /* R11-L04-D18：左右内衬 14rpx → 8rpx（每颗省 12rpx），7 字校名 + 胶囊同排 */
  padding: 4rpx 8rpx;
  border-radius: 999rpx;
  /* MP-R8-CAMPUS-001：badge 固定不收缩，宽度让给校名 */
  flex-shrink: 0;
  flex-shrink: 0;
}

.campus-school-card__badge--verified {
  /* 理想图：已认证 = 绿色圆角标签 + 白色字体 */
  background: var(--c-brand, #36C99A);
}

.campus-school-card__badge--verified .campus-school-card__badge-text {
  color: var(--c-text-inverse, #FFFFFF);
}

.campus-school-card__badge--pending {
  background: var(--c-warning-bg-tint, #FFF4E5);
}

.campus-school-card__badge--pending .campus-school-card__badge-text {
  color: var(--c-warning, #FF9F43);
}

.campus-school-card__badge--unverified {
  /* R1-L05-D15：理想图未认证 = 淡紫底 + 紫字。原 background 写成硬编码 #9AA39F（同组 verified/pending
     都走 var()），既脱离 token 体系、又把紫档整体落到中灰档；灰底白字对比度不足。
     改取既有 lavender 档位令牌（--c-lavender-50 #F5F3FF / --c-lavender-500 #8B5CF6）；
     卡里建议的 --c-accent-50/--c-accent 在 design-variables.scss 中并不存在，故用同值既有令牌
     R10-L04-D20（P2 · 可达性）：按卡的后半方案把底加深一档到 --c-lavender-100 #EDE9FE
     （design-variables.scss:314，仍是淡紫语义不变），配下沉后的紫字，
     对比从 3.86:1 提到 5.99:1。 */
  background: var(--c-lavender-100, #EDE9FE);
}

.campus-school-card__badge--unverified .campus-school-card__badge-text {
  /* R10-L04-D20：改前 --c-lavender-500 #8B5CF6 压 #F5F3FF 实测 3.86:1（次级文字档不达标）。
     卡里建议的 lavender-700 档在本仓不存在（design-variables.scss:313-315 只发了 50/100/500，
     且我没有改全站令牌文件的权限），故按同族落档取实色 #6D28D9：
     压 lavender-50 = 6.48:1、压 lavender-100 = 5.99:1，均 ≥4.5，语义仍是「未认证 = 紫」。 */
  color: #6D28D9;
}

.campus-school-card__badge-text {
  /* R1-L05-D20：20rpx(≈10.8px CSS) 低于可读下限 ⇒ 提到 24rpx */
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
}

/* ===== Stats & Members ===== */
.campus-school-card__stats {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  /* 2026-08-27：白卡上数据行用次要文字色
     R3：单行省略——原文案换行把「态」字折成孤字（judged 证据） */
  color: var(--c-text-secondary, #666666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campus-school-card__members {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.campus-school-card__avatar-stack {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.campus-school-card__avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid var(--c-neutral-0, #FFFFFF);
  display: block;
}

.campus-school-card__avatar--2 {
  border-radius: var(--r-full);

  margin-left: -10rpx;
}

.campus-school-card__avatar--3 {
  border-radius: var(--r-full);

  margin-left: -10rpx;
}

.campus-school-card__peers {
  /* R1-L05-D20：22rpx 与徽标同样偏小、帧内糊成灰点 ⇒ 提到 26rpx */
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary, #9AA39F);
}

/* ===== CTA (Green Filled) ===== */
/* 推荐 tab「申请加入」= 白底绿描边绿字（对齐理想图层级：仅「去认证」实心）
   R2b-L05-D16：描边/文字与实心档同步收敛到 --c-brand-600（见 .campus-guide__btn 的取色推导） */
.campus-school-card__cta--outline {
  /* R10-L04-D17（P1 · 可达性）：描边同文字一起下沉（2rpx 细线压白属于非文本对比，
     改前 brand-600 只有 2.81:1 <3:1）。 */
  background: var(--c-neutral-0, #FFFFFF) !important;
  border: 2rpx solid var(--c-brand-800, #156B51) !important;
  box-shadow: none !important;
}

.campus-school-card__cta--outline .campus-school-card__cta-text {
  /* R10-L04-D17：改前 --c-brand-600 #2AAE83 压白 = 2.81:1。卡里建议的 brand-700
     按已知机制 §2 实测 4.14:1 仍不达 4.5，故取 --c-brand-800 #156B51 = 6.45:1。 */
  color: var(--c-brand-800, #156B51);
}

.campus-school-card__cta {
  flex-shrink: 0;
  align-self: center;
  /* R10-L04-D17：实测整颗只有 131×71rpx（66×36px），高度差 88rpx 标准 17rpx。
     补 min-height 并立成 flex，让 24rpx 文字在新高度里垂直居中。 */
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  /* 理想图：绿色圆角矩形按钮（进入 / 申请加入）；R2b-L05-D16 取深一档品牌绿 */
  background: var(--c-brand-600, #2AAE83);
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger, rgba(54, 201, 154, 0.32));
}

.campus-school-card__cta-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

/* ===== Footer ===== */
.campus-hub__more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  /* R2b-L05-D15：该行现为可点入口，命中区上下各留够呼吸（合计 ≥88rpx 高） */
  padding: 32rpx 0 20rpx;
}

/* 列表不足预览档时没有可展开的内容，该行退回静态说明文案，不再给出可点暗示 */
.campus-hub__more--static {
  padding: 32rpx 0 8rpx;
}

.campus-hub__more-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

.campus-hub__more-arrow {
  font-size: 28rpx;
  color: var(--c-text-tertiary, #9AA39F);
  line-height: 1;
  transition: transform var(--d-normal, 200ms) ease;
}

/* 展开态箭头翻向上方，读作「收起」，与 aria-expanded 同步 */
.campus-hub__more-arrow--up {
  transform: rotate(180deg);
}

.campus-hub__footer {
  height: 48rpx;
}

/* ===== 2026-08-20 校园圈搜索框（参考图对齐） ===== */
.campus-search {
  /* R2b-L05-D13：原 `margin: 0 40rpx 20rpx` 在 .campus-hub 已有的 32rpx 页面内衬之外
     又叠一层左右缩进，搜索胶囊比卡片多缩 40rpx，三条左边缘不成一条线（理想图搜索/引导卡/
     列表卡共用同一栅格边线）。左右归零，栅格统一由容器 padding: 0 32rpx 承担；
     需要更窄时改自身高度/圆角，不改左右。 */
  margin: 0 0 20rpx;
  height: 76rpx;
  border-radius: 999rpx;
  /* R1-L05-D14：原底色取 --c-bg-page，与页面容器（.campus-hub）同色 ⇒ 胶囊在帧里完全看不见、
     999rpx 圆角等于没生效。改取容器白底并补 1rpx 描边，与页面底拉开一档 */
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  box-sizing: border-box;
  gap: 12rpx;
}

.campus-search__icon {
  flex-shrink: 0;
}

.campus-search__icon-text {
  width: 30rpx;
  height: 30rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

.campus-search__input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: var(--c-text-primary, #333A37);
}

.campus-search__placeholder {
  color: #9AA39F;
}

.campus-search__clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--c-border-light, #D8E0DC);
  color: var(--c-text-tertiary, #6B7571);
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

</style>



