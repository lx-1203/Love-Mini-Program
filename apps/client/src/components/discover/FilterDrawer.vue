<script setup lang="ts">
/**
 * FilterDrawer - 寻觅页筛选抽屉组件 (H-07 + M-16)
 *
 * 功能：
 * - 顶部"全部筛选"标题 + 关闭按钮
 * - 身高双滑块（120-250cm，两个 slider 互斥约束）
 * - 学历多选 chip 组（高中/本科/硕士/博士）
 * - 感情状态单选 chip 组（未婚/离异/丧偶）
 * - 籍贯省/市联动 picker（uni-app picker mode="multiSelector"）
 * - 未来城市 picker
 * - 关键词输入框（带 300ms 防抖，触发 fetchCards）
 * - 底部"重置"和"确认"按钮
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 backdrop-filter（opacity fallback）
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 所有过渡动画内联在 .vue 文件中
 *
 * 数据流：
 * - 父组件通过 v-model:visible 控制抽屉显隐
 * - 父组件通过 :filter 传入当前 RecommendationFilter（init 时拷贝到本地 draft）
 * - 用户编辑 draft，点击"确认"后 emit apply 事件携带最终 filter
 * - 点击"重置"清空 draft，emit reset 事件
 */
import { ref, computed, watch } from "vue";
import type { RecommendationFilter } from "../../services/generated/api-types-supplement";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic } from "../../utils/haptic";

const props = withDefaults(defineProps<{
  /** 抽屉显隐（v-model:visible） */
  visible: boolean;
  /** 当前已应用的筛选条件（用于初始化 draft） */
  filter: RecommendationFilter;
  /** 是否在抽屉打开时立即应用筛选（默认 false，需用户点击确认） */
  immediateApply?: boolean;
}>(), {
  immediateApply: false,
});

const emit = defineEmits<{
  /** 抽屉关闭（点击关闭按钮 / 遮罩 / 确认后） */
  (e: "update:visible", value: boolean): void;
  /** 用户点击"确认"，应用筛选（携带最新 filter） */
  (e: "apply", filter: RecommendationFilter): void;
  /** 用户点击"重置"，清空所有筛选项 */
  (e: "reset"): void;
}>();

/* ========== 常量 ========== */

/** 身高范围 */
const HEIGHT_MIN_BOUND = 120;
const HEIGHT_MAX_BOUND = 250;
const HEIGHT_STEP = 1;

/** 关键词防抖延迟 */
const KEYWORD_DEBOUNCE_MS = 300;

/** 学历选项 */
const EDUCATION_OPTIONS = [
  { value: "high_school", label: "高中" },
  { value: "bachelor", label: "本科" },
  { value: "master", label: "硕士" },
  { value: "phd", label: "博士" },
] as const;

/** 感情状态选项（与后端字段值对齐：never/married_before/divorced/widowed） */
const RELATIONSHIP_OPTIONS = [
  { value: "never", label: "未婚" },
  { value: "married_before", label: "曾婚" },
  { value: "divorced", label: "离异" },
  { value: "widowed", label: "丧偶" },
] as const;

/**
 * 籍贯省/市数据集（精简版，覆盖主要省份与直辖市）。
 *
 * 数据组织：键为省份名，值为该省下城市数组。
 * 直辖市（北京/上海/天津/重庆）的 city 与 province 同名。
 */
const PROVINCE_CITY_MAP: Record<string, string[]> = {
  "北京": ["北京"],
  "上海": ["上海"],
  "天津": ["天津"],
  "重庆": ["重庆"],
  "广东": ["广州", "深圳", "珠海", "佛山", "东莞", "中山"],
  "江苏": ["南京", "苏州", "无锡", "常州", "徐州", "扬州"],
  "浙江": ["杭州", "宁波", "温州", "绍兴", "嘉兴", "金华"],
  "山东": ["济南", "青岛", "烟台", "潍坊", "淄博"],
  "河南": ["郑州", "洛阳", "开封", "新乡"],
  "湖北": ["武汉", "宜昌", "襄阳", "荆州"],
  "湖南": ["长沙", "株洲", "湘潭", "岳阳"],
  "四川": ["成都", "绵阳", "德阳", "乐山"],
  "福建": ["福州", "厦门", "泉州", "漳州"],
  "安徽": ["合肥", "芜湖", "蚌埠", "安庆"],
  "河北": ["石家庄", "唐山", "保定", "秦皇岛"],
  "陕西": ["西安", "宝鸡", "咸阳", "延安"],
  "辽宁": ["沈阳", "大连", "鞍山", "抚顺"],
  "黑龙江": ["哈尔滨", "齐齐哈尔", "大庆"],
  "吉林": ["长春", "吉林", "延边"],
  "江西": ["南昌", "赣州", "九江", "上饶"],
  "广西": ["南宁", "柳州", "桂林", "北海"],
  "云南": ["昆明", "大理", "丽江", "曲靖"],
  "贵州": ["贵阳", "遵义", "六盘水"],
  "山西": ["太原", "大同", "临汾"],
  "海南": ["海口", "三亚", "儋州"],
  "甘肃": ["兰州", "天水", "酒泉"],
  "青海": ["西宁", "海东"],
  "宁夏": ["银川", "石嘴山"],
  "新疆": ["乌鲁木齐", "喀什", "伊犁"],
  "内蒙古": ["呼和浩特", "包头", "鄂尔多斯"],
  "西藏": ["拉萨", "日喀则", "林芝"],
};

/** 省份列表（picker 第一列数据源） */
const PROVINCE_LIST = Object.keys(PROVINCE_CITY_MAP);

/* ========== Draft 状态（用户编辑中的临时筛选条件） ========== */

/** 身高下限 */
const heightMinDraft = ref<number>(HEIGHT_MIN_BOUND);
/** 身高上限 */
const heightMaxDraft = ref<number>(HEIGHT_MAX_BOUND);
/** 学历多选 */
const educationDraft = ref<string[]>([]);
/** 感情状态单选（仅 1 个值，使用数组以保持与后端多选字段一致） */
const relationshipDraft = ref<string[]>([]);
/** 籍贯省 */
const hometownProvinceDraft = ref<string>("");
/** 籍贯市 */
const hometownCityDraft = ref<string>("");
/** 未来城市 */
const futureCityDraft = ref<string>("");
/** 关键词 */
const keywordDraft = ref<string>("");

/* ========== 关键词防抖 ========== */

/** 防抖定时器（模块级单例，避免响应式追踪） */
let keywordDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 防抖触发 fetchCards
 *
 * 设计：抽屉内关键词输入框的变更应实时反馈到推荐列表（用户在抽屉中即可看到结果）。
 * 通过 emit "apply" 事件由父组件调用 store.setRecommendationFilter。
 */
function emitKeywordChange() {
  if (keywordDebounceTimer) {
    clearTimeout(keywordDebounceTimer);
  }
  keywordDebounceTimer = setTimeout(() => {
    // immediateApply 模式下实时应用关键词
    if (props.immediateApply) {
      emit("apply", buildFilterFromDraft());
    }
    keywordDebounceTimer = null;
  }, KEYWORD_DEBOUNCE_MS);
}

/* ========== Picker 数据源 ========== */

/** 省/市联动的当前选中索引 [provinceIndex, cityIndex] */
const hometownPickerValue = ref<[number, number]>([0, 0]);

/** 省/市联动的多列数据源（picker mode="multiSelector" 接受二维数组） */
const hometownPickerRange = computed<(string[])[]>(() => {
  const province = PROVINCE_LIST[hometownPickerValue.value[0]] ?? "";
  const cities = PROVINCE_CITY_MAP[province] ?? [""];
  return [PROVINCE_LIST, cities];
});

/** 未来城市 picker 单列数据源（所有城市平铺） */
const futureCityList = computed<string[]>(() => {
  const all: string[] = [];
  for (const province of PROVINCE_LIST) {
    for (const city of PROVINCE_CITY_MAP[province]) {
      if (!all.includes(city)) {
        all.push(city);
      }
    }
  }
  return all;
});

/** 未来城市 picker 当前选中索引 */
const futureCityPickerValue = ref<number>(0);

/** 籍贯显示文案（picker 触发器） */
const hometownDisplayText = computed(() => {
  if (!hometownProvinceDraft.value) return "请选择籍贯";
  if (hometownProvinceDraft.value === hometownCityDraft.value) {
    return hometownProvinceDraft.value;
  }
  return `${hometownProvinceDraft.value} ${hometownCityDraft.value}`;
});

/** 未来城市显示文案 */
const futureCityDisplayText = computed(() => {
  return futureCityDraft.value || "请选择未来城市";
});

/* ========== Watcher: visible 变化时同步 draft ========== */

/**
 * 抽屉打开时，从 props.filter 初始化 draft 状态。
 * 抽屉关闭时，不做任何操作（保留 draft 状态供下次打开时复用）。
 */
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      syncDraftFromProps();
    }
  },
);

/**
 * 当父组件外部修改 filter 后（如 reset），同步到 draft。
 * 仅在抽屉关闭时同步，避免用户编辑过程中被覆盖。
 */
watch(
  () => props.filter,
  () => {
    if (!props.visible) {
      syncDraftFromProps();
    }
  },
  { deep: true },
);

/**
 * 将 props.filter 同步到 draft 状态。
 */
function syncDraftFromProps() {
  heightMinDraft.value = props.filter.heightMin ?? HEIGHT_MIN_BOUND;
  heightMaxDraft.value = props.filter.heightMax ?? HEIGHT_MAX_BOUND;
  educationDraft.value = props.filter.educationLevel ? [...props.filter.educationLevel] : [];
  relationshipDraft.value = props.filter.relationshipStatus ? [...props.filter.relationshipStatus] : [];
  hometownProvinceDraft.value = props.filter.hometownProvince ?? "";
  hometownCityDraft.value = props.filter.hometownCity ?? "";
  futureCityDraft.value = props.filter.futureCity ?? "";
  keywordDraft.value = props.filter.keyword ?? "";

  // 同步 picker 索引
  const provinceIdx = Math.max(0, PROVINCE_LIST.indexOf(hometownProvinceDraft.value));
  hometownPickerValue.value = [provinceIdx, 0];

  const futureIdx = Math.max(0, futureCityList.value.indexOf(futureCityDraft.value));
  futureCityPickerValue.value = futureIdx;
}

/* ========== 身高滑块互斥约束 ========== */

/**
 * 身高下限变更：不允许超过上限-1
 */
function onHeightMinChange(e: { detail: { value: number } }) {
  const value = e.detail.value;
  if (value >= heightMaxDraft.value) {
    heightMinDraft.value = heightMaxDraft.value - HEIGHT_STEP;
  } else {
    heightMinDraft.value = value;
  }
  lightHaptic();
  if (props.immediateApply) {
    emitKeywordChange();
  }
}

/**
 * 身高上限变更：不允许低于下限+1
 */
function onHeightMaxChange(e: { detail: { value: number } }) {
  const value = e.detail.value;
  if (value <= heightMinDraft.value) {
    heightMaxDraft.value = heightMinDraft.value + HEIGHT_STEP;
  } else {
    heightMaxDraft.value = value;
  }
  lightHaptic();
  if (props.immediateApply) {
    emitKeywordChange();
  }
}

/** 身高显示文案 */
const heightDisplayText = computed(() => {
  return `${heightMinDraft.value}-${heightMaxDraft.value}cm`;
});

/* ========== Chip 选择 ========== */

/**
 * 切换学历多选
 */
function toggleEducation(value: string) {
  lightHaptic();
  const idx = educationDraft.value.indexOf(value);
  if (idx >= 0) {
    educationDraft.value.splice(idx, 1);
  } else {
    educationDraft.value.push(value);
  }
  if (props.immediateApply) {
    emitKeywordChange();
  }
}

/**
 * 切换感情状态单选（再次点击同一项时取消）
 */
function toggleRelationship(value: string) {
  lightHaptic();
  const idx = relationshipDraft.value.indexOf(value);
  if (idx >= 0) {
    relationshipDraft.value = [];
  } else {
    relationshipDraft.value = [value];
  }
  if (props.immediateApply) {
    emitKeywordChange();
  }
}

/* ========== Picker 事件 ========== */

/**
 * 籍贯 picker 列变化：第一列变化时重置第二列
 */
function onHometownPickerColumnChange(e: { detail: { column: number; value: number } }) {
  const { column, value } = e.detail;
  if (column === 0) {
    // 切换省份时，第二列重置为该省第一个城市
    hometownPickerValue.value = [value, 0];
  } else {
    hometownPickerValue.value = [hometownPickerValue.value[0], value];
  }
}

/**
 * 籍贯 picker 确认
 */
function onHometownPickerConfirm(e: { detail: { value: [number, number] } }) {
  lightHaptic();
  const [pIdx, cIdx] = e.detail.value;
  const province = PROVINCE_LIST[pIdx] ?? "";
  const cities = PROVINCE_CITY_MAP[province] ?? [""];
  const city = cities[cIdx] ?? "";
  hometownProvinceDraft.value = province;
  hometownCityDraft.value = city;
  if (props.immediateApply) {
    emitKeywordChange();
  }
}

/**
 * 籍贯 picker 取消：不修改 draft
 */
function onHometownPickerCancel() {
  // 无操作
}

/**
 * 未来城市 picker 列变化（单列）
 */
function onFutureCityPickerChange(e: { detail: { value: number } }) {
  lightHaptic();
  const idx = e.detail.value;
  futureCityPickerValue.value = idx;
  futureCityDraft.value = futureCityList.value[idx] ?? "";
  if (props.immediateApply) {
    emitKeywordChange();
  }
}

/* ========== 关键词输入 ========== */

/**
 * 关键词输入回调（带 300ms 防抖）
 */
function onKeywordInput(e: any) {
  keywordDraft.value = e?.detail?.value ?? "";
  emitKeywordChange();
}

/**
 * 清空关键词
 */
function clearKeyword() {
  lightHaptic();
  keywordDraft.value = "";
  emitKeywordChange();
}

/* ========== 重置 / 确认 ========== */

/**
 * 构建最终 filter 对象（从 draft 提取有效字段）
 */
function buildFilterFromDraft(): RecommendationFilter {
  const filter: RecommendationFilter = {};

  // 身高：仅在用户调整过（非默认范围）时透传
  if (heightMinDraft.value !== HEIGHT_MIN_BOUND || heightMaxDraft.value !== HEIGHT_MAX_BOUND) {
    filter.heightMin = heightMinDraft.value;
    filter.heightMax = heightMaxDraft.value;
  }

  // 学历多选
  if (educationDraft.value.length > 0) {
    filter.educationLevel = [...educationDraft.value];
  }

  // 感情状态（数组形式，但仅含 0/1 个值）
  if (relationshipDraft.value.length > 0) {
    filter.relationshipStatus = [...relationshipDraft.value];
  }

  // 籍贯
  if (hometownProvinceDraft.value) {
    filter.hometownProvince = hometownProvinceDraft.value;
  }
  if (hometownCityDraft.value) {
    filter.hometownCity = hometownCityDraft.value;
  }

  // 未来城市
  if (futureCityDraft.value) {
    filter.futureCity = futureCityDraft.value;
  }

  // 关键词
  if (keywordDraft.value && keywordDraft.value.trim().length > 0) {
    filter.keyword = keywordDraft.value.trim();
  }

  return filter;
}

/**
 * 点击"重置"：清空 draft，emit reset 事件
 */
function handleReset() {
  lightHaptic();
  heightMinDraft.value = HEIGHT_MIN_BOUND;
  heightMaxDraft.value = HEIGHT_MAX_BOUND;
  educationDraft.value = [];
  relationshipDraft.value = [];
  hometownProvinceDraft.value = "";
  hometownCityDraft.value = "";
  futureCityDraft.value = "";
  keywordDraft.value = "";
  hometownPickerValue.value = [0, 0];
  futureCityPickerValue.value = 0;
  emit("reset");
}

/**
 * 点击"确认"：emit apply 事件携带最终 filter，并关闭抽屉
 */
function handleConfirm() {
  lightHaptic();
  const filter = buildFilterFromDraft();
  emit("apply", filter);
  emit("update:visible", false);
}

/**
 * 点击关闭按钮 / 遮罩：关闭抽屉
 */
function handleClose() {
  lightHaptic();
  emit("update:visible", false);
}

/* ========== 阻止内容区点击事件冒泡 ========== */

function onContentTap() {
  // 阻止冒泡到遮罩层（模板中 @tap.stop 已处理）
}

const icons = {
  close: IMAGE_PATHS.ICONS_COMMON.CLOSE,
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
} as const;
</script>

<template>
  <view
    v-if="visible"
    class="filter-drawer"
    @tap="handleClose"
  >
    <!-- 抽屉内容（向上滑入动画） -->
    <view
      class="filter-drawer__panel"
      @tap.stop="onContentTap"
    >
      <!-- 顶部标题栏 -->
      <view class="filter-drawer__header">
        <text class="filter-drawer__title">全部筛选</text>
        <view
          class="filter-drawer__close press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleClose"
        >
          <image class="filter-drawer__close-icon" :src="icons.close" mode="aspectFit" />
        </view>
      </view>

      <!-- 滚动内容区 -->
      <scroll-view scroll-y class="filter-drawer__body">
        <!-- 身高 -->
        <view class="filter-section">
          <view class="filter-section__head">
            <text class="filter-section__title">身高</text>
            <text class="filter-section__value">{{ heightDisplayText }}</text>
          </view>
          <view class="filter-section__sliders">
            <!-- 下限滑块 -->
            <slider
              class="height-slider"
              :min="HEIGHT_MIN_BOUND"
              :max="HEIGHT_MAX_BOUND"
              :step="HEIGHT_STEP"
              :value="heightMinDraft"
              activeColor="var(--c-brand-500)"
              backgroundColor="var(--c-neutral-200)"
              block-color="var(--c-brand-600)"
              block-size="22"
              @change="onHeightMinChange"
            />
            <!-- 上限滑块 -->
            <slider
              class="height-slider"
              :min="HEIGHT_MIN_BOUND"
              :max="HEIGHT_MAX_BOUND"
              :step="HEIGHT_STEP"
              :value="heightMaxDraft"
              activeColor="var(--c-romance-500)"
              backgroundColor="var(--c-neutral-200)"
              block-color="var(--c-romance-500)"
              block-size="22"
              @change="onHeightMaxChange"
            />
          </view>
          <view class="filter-section__hint">
            <text class="filter-section__hint-text">范围 {{ HEIGHT_MIN_BOUND }}-{{ HEIGHT_MAX_BOUND }}cm</text>
          </view>
        </view>

        <!-- 学历（多选） -->
        <view class="filter-section">
          <view class="filter-section__head">
            <text class="filter-section__title">学历</text>
            <text class="filter-section__value">{{ educationDraft.length > 0 ? `已选 ${educationDraft.length}` : '不限' }}</text>
          </view>
          <view class="chip-group">
            <view
              v-for="opt in EDUCATION_OPTIONS"
              :key="opt.value"
              class="filter-chip press-feedback"
              :class="{ 'filter-chip--active': educationDraft.includes(opt.value) }"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              @tap="toggleEducation(opt.value)"
            >
              <text class="filter-chip__text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <!-- 感情状态（单选） -->
        <view class="filter-section">
          <view class="filter-section__head">
            <text class="filter-section__title">感情状态</text>
            <text class="filter-section__value">{{ relationshipDraft.length > 0 ? RELATIONSHIP_OPTIONS.find(o => o.value === relationshipDraft[0])?.label : '不限' }}</text>
          </view>
          <view class="chip-group">
            <view
              v-for="opt in RELATIONSHIP_OPTIONS"
              :key="opt.value"
              class="filter-chip press-feedback"
              :class="{ 'filter-chip--active': relationshipDraft.includes(opt.value) }"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              @tap="toggleRelationship(opt.value)"
            >
              <text class="filter-chip__text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <!-- 籍贯（省/市联动） -->
        <view class="filter-section">
          <view class="filter-section__head">
            <text class="filter-section__title">籍贯</text>
          </view>
          <picker
            mode="multiSelector"
            :value="hometownPickerValue"
            :range="hometownPickerRange"
            @columnchange="onHometownPickerColumnChange"
            @change="onHometownPickerConfirm"
            @cancel="onHometownPickerCancel"
          >
            <view class="picker-trigger press-feedback" hover-class="press-feedback--active" hover-stay-time="120">
              <text class="picker-trigger__text" :class="{ 'picker-trigger__text--placeholder': !hometownProvinceDraft }">
                {{ hometownDisplayText }}
              </text>
              <text class="picker-trigger__arrow">›</text>
            </view>
          </picker>
        </view>

        <!-- 未来城市 -->
        <view class="filter-section">
          <view class="filter-section__head">
            <text class="filter-section__title">未来城市</text>
          </view>
          <picker
            mode="selector"
            :value="futureCityPickerValue"
            :range="futureCityList"
            @change="onFutureCityPickerChange"
          >
            <view class="picker-trigger press-feedback" hover-class="press-feedback--active" hover-stay-time="120">
              <text class="picker-trigger__text" :class="{ 'picker-trigger__text--placeholder': !futureCityDraft }">
                {{ futureCityDisplayText }}
              </text>
              <text class="picker-trigger__arrow">›</text>
            </view>
          </picker>
        </view>

        <!-- 关键词 -->
        <view class="filter-section">
          <view class="filter-section__head">
            <text class="filter-section__title">关键词</text>
          </view>
          <view class="keyword-input">
            <image class="keyword-input__icon" :src="icons.search" mode="aspectFit" />
            <input
              class="keyword-input__field"
              placeholder="搜索昵称/标签/学校"
              placeholder-class="keyword-input__placeholder"
              :value="keywordDraft"
              @input="onKeywordInput"
            />
            <text
              v-if="keywordDraft"
              class="keyword-input__clear"
              @tap="clearKeyword"
            >✕</text>
          </view>
        </view>

        <!-- 底部占位（防止内容被按钮遮挡） -->
        <view class="filter-drawer__body-footer" />
      </scroll-view>

      <!-- 底部操作按钮 -->
      <view class="filter-drawer__footer">
        <view
          class="filter-drawer__btn filter-drawer__btn--reset press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleReset"
        >
          <text class="filter-drawer__btn-text">重置</text>
        </view>
        <view
          class="filter-drawer__btn filter-drawer__btn--confirm press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleConfirm"
        >
          <text class="filter-drawer__btn-text">确认</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.filter-drawer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  background: var(--c-bg-overlay);
  display: flex;
  align-items: flex-end;
  animation: drawer-fade-in 280ms ease both;
}

@keyframes drawer-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.filter-drawer__panel {
  width: 100%;
  max-height: 85vh;
  background: var(--c-bg-container);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  box-shadow: var(--s-modal);
  display: flex;
  flex-direction: column;
  animation: drawer-slide-up 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  overflow: hidden;
}

@keyframes drawer-slide-up {
  from {
    transform: translateY(100%);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ========== 顶部标题栏 ========== */
.filter-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5) var(--sp-7);
  border-bottom: 1rpx solid var(--c-border-light);
}

.filter-drawer__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.filter-drawer__close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  background: var(--c-bg-surface);
}

.filter-drawer__close-icon {
  width: 32rpx;
  height: 32rpx;
}

/* ========== 滚动内容区 ========== */
.filter-drawer__body {
  flex: 1;
  padding: 0 var(--sp-7);
  min-height: 0;
}

.filter-drawer__body-footer {
  height: var(--sp-7);
  flex-shrink: 0;
}

/* ========== 筛选分段 ========== */
.filter-section {
  padding: var(--sp-6) 0;
  border-bottom: 1rpx solid var(--c-border-light);
}

.filter-section:last-of-type {
  border-bottom: none;
}

.filter-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-4);
}

.filter-section__title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.filter-section__value {
  font-size: var(--fs-base);
  color: var(--c-brand-600);
  font-weight: 600;
}

.filter-section__hint {
  margin-top: var(--sp-2);
}

.filter-section__hint-text {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ========== 身高滑块 ========== */
.filter-section__sliders {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.height-slider {
  width: 100%;
  margin: 0;
}

/* ========== Chip 组 ========== */
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--r-full);
  background: var(--c-bg-surface);
  border: 1rpx solid var(--c-border-default);
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-chip--active {
  background: var(--c-gradient-brand);
  border-color: transparent;
  box-shadow: var(--s-brand-sm);
}

.filter-chip__text {
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--c-text-secondary);
}

.filter-chip--active .filter-chip__text {
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== Picker 触发器 ========== */
.picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
  background: var(--c-bg-surface);
  border-radius: var(--r-lg);
  border: 1rpx solid var(--c-border-default);
}

.picker-trigger__text {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
}

.picker-trigger__text--placeholder {
  color: var(--c-text-tertiary);
}

.picker-trigger__arrow {
  font-size: var(--fs-2xl);
  color: var(--c-text-tertiary);
  font-weight: 300;
}

/* ========== 关键词输入框 ========== */
.keyword-input {
  display: flex;
  align-items: center;
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-bg-surface);
  border-radius: var(--r-lg);
  border: 1rpx solid var(--c-border-default);
}

.keyword-input__icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: var(--sp-3);
  flex-shrink: 0;
}

.keyword-input__field {
  flex: 1;
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  height: 48rpx;
}

.keyword-input__placeholder {
  color: var(--c-text-tertiary);
}

.keyword-input__clear {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  padding: var(--sp-1) var(--sp-2);
}

/* ========== 底部按钮 ========== */
.filter-drawer__footer {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-5) var(--sp-7);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-5));
  border-top: 1rpx solid var(--c-border-light);
  background: var(--c-bg-container);
}

.filter-drawer__btn {
  flex: 1;
  height: var(--btn-height-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-drawer__btn--reset {
  background: var(--c-bg-surface);
  border: 1rpx solid var(--c-border-default);
}

.filter-drawer__btn--confirm {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.filter-drawer__btn-text {
  font-size: var(--fs-md);
  font-weight: 700;
}

.filter-drawer__btn--reset .filter-drawer__btn-text {
  color: var(--c-text-primary);
}

.filter-drawer__btn--confirm .filter-drawer__btn-text {
  color: var(--c-text-inverse);
}
</style>
