/**
 * 寻觅/匹配相关常量
 *
 * 集中维护寻觅页（discover）卡片滑动交互、长按菜单、堆叠动画等用到的阈值与延迟。
 * 与 stores/discover/constants.ts 互补——后者偏向 store 数据流（限量/防抖/重试），
 * 本文件偏向组件层手势/动画参数。
 *
 * 注意：
 * - 卡片采用 4:5 比例布局，参数需结合视觉设计调整
 * - mp-weixin 不支持 :hover，相关动效改用 hover-class
 */

/** 滑动阈值（px）：超过此距离触发飞出，否则回弹 */
export const SWIPE_THRESHOLD = 120;

/** 拖动时卡片最大旋转角度（度） */
export const SWIPE_ROTATION_MAX = 15;

/** 长按触发延迟（毫秒）：长按超过此时长调出快捷菜单 */
export const LONG_PRESS_DELAY_MS = 500;

/** 长按识别的移动阈值（px）：超过此距离取消长按识别 */
export const LONG_PRESS_MOVE_THRESHOLD = 10;

/** 触摸点击识别阈值（px）：移动总距离小于此值视为点击 */
export const TAP_MOVE_THRESHOLD = 8;

/** 卡片 3D 倾斜最大角度（度）：拖动时根据位移计算 Y 轴旋转 */
export const CARD_TILT_MAX_DEGREE = 8;

/** 卡片倾斜计算的分母（px）：translateX / 此值得到倾斜比例 */
export const CARD_TILT_DIVISOR = 300;

/** 旋转角度计算的分母（px）：translateX / 此值得到旋转比例 */
export const SWIPE_ROTATION_DIVISOR = 300;

/** 拖动遮罩不透明度计算分母（px） */
export const DRAG_TINT_OPACITY_DIVISOR = 160;

/** 滑动指示器比例计算分母（px） */
export const SWIPE_INDICATOR_RATIO_DIVISOR = 120;

/** 卡片飞出动画时长（毫秒） */
export const CARD_FLY_OUT_DURATION_MS = 400;

/** 卡片入场动画延迟（毫秒） */
export const CARD_ENTER_DELAY_MS = 50;

/** 飞出位移距离（px）：飞出方向上的目标 translateX */
export const CARD_FLY_OUT_DISTANCE_PX = 1100;

/** 飞出旋转角度（度） */
export const CARD_FLY_OUT_ROTATION_DEGREE = 36;

/** 照片墙最大展示图片数量 */
export const PHOTO_GALLERY_MAX = 6;

/** 卡片静止状态下的缩放比例 */
export const CARD_SCALE_STATIC = 1.02;

/** 卡片拖动状态下的缩放比例 */
export const CARD_SCALE_DRAGGING = 1.0;

/** 卡片长按状态下的缩放比例 */
export const CARD_SCALE_LONG_PRESS = 0.95;

/** 下一张卡片在拖动状态下的缩放比例 */
export const NEXT_CARD_SCALE_DRAGGING = 0.97;

/** 下一张卡片在静止状态下的缩放比例 */
export const NEXT_CARD_SCALE_STATIC = 0.92;

/** 下一张卡片在拖动状态下的 Y 位移（px） */
export const NEXT_CARD_TRANSLATE_Y_DRAGGING = -4;

/** 下一张卡片在静止状态下的 Y 位移（px） */
export const NEXT_CARD_TRANSLATE_Y_STATIC = -18;

/** 下一张卡片在拖动状态下的不透明度 */
export const NEXT_CARD_OPACITY_DRAGGING = 0.8;

/** 下一张卡片在静止状态下的不透明度 */
export const NEXT_CARD_OPACITY_STATIC = 0.58;

/** 默认匹配度分数（无卡片数据时的兜底值） */
export const DEFAULT_MATCH_SCORE = 95;

/** 匹配度分数计算基准值 */
export const MATCH_SCORE_BASE = 80;

/** 匹配度分数计算倍率（共同圈数 × 此值） */
export const MATCH_SCORE_STEP = 5;

/** 匹配度分数上限 */
export const MATCH_SCORE_MAX = 98;

/** 默认年龄兜底值（解析失败时使用） */
export const DEFAULT_AGE_FALLBACK = "22";
