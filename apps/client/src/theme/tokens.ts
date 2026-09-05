// ============================================================
// 校园恋爱小程序 - Design Tokens
// 版本: 4.0.1 (双源漂移修复 · 与 design-variables.scss 对齐)
// 说明: 所有UI参数集中管理，支持主题切换，禁止硬编码
// 设计原则: 色彩和谐 · 排版韵律 · 间距统一 · 自然舒适 · 浪漫青春
//
// 双源同步约定（重要）：
// 本文件（JS 侧）与 theme/design-variables.scss（SCSS 侧）是同一设计体系的
// 两个视图，颜色值以 scss 为准（含 P2 对比度修复），改值必须两端同步——
// 历史上 text.tertiary 曾因仅 scss 侧修复而漂移（#9AA1AB vs #999999），
// 现已在下方对齐并注释说明。
// ============================================================

export const designTokens = {
  color: {
    brand: {
      50:  '#E8FAF3',
      100: '#D1F5E7',
      200: '#A3EBCF',
      300: '#75E1B7',
      400: '#36C99A',
      500: '#36C99A',
      600: '#36C99A',
      700: '#2AAE83',
      dark:  '#36C99A',
      light: '#E8FBF2',
      800: '#156B51',
      900: '#0B5038',
    },

    secondary: {
      50:  '#E8FAF3',
      100: '#D1F5E7',
      200: '#A3EBCF',
      300: '#75E1B7',
      400: '#55D5A7',
      500: '#36C99A',
      600: '#2AAE83',
      700: '#1F8D6A',
      800: '#156B51',
      900: '#0B4A38',
    },

    accent: {
      50:  '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#F97316',
      500: '#EA580C',
      600: '#C2410C',
      700: '#9A3412',
      800: '#7C2D12',
      900: '#65200D',
    },

    pink: {
      50:  '#E8FAF3',
      100: '#D1F5E7',
      200: '#A3EBCF',
      300: '#75E1B7',
      400: '#55D5A7',
      500: '#E85A70',
      600: '#2AAE83',
      700: '#1F8D6A',
      800: '#831843',
      900: '#0B4A38',
    },

    romance: {
      50:  '#FFECEF',
      100: '#FFD9DF',
      200: '#FFB3C0',
      300: '#FF8DA1',
      400: '#FF7C91',
      500: '#FF6B81',
      600: '#E85A70',
      700: '#CC4A5F',
      800: '#9D174D',
      900: '#831843',
    },

    warm: {
      50:  '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
    },

    success: '#36C99A',
    warning: '#FF9F43',
    error:   '#FF4757',
    errorDark: '#FF6B6B',
    info:    '#54A0FF',
    blue:    '#4D8DFF',
    purple:  '#A29BFE',
    // ===== 寻觅 v3 视觉角色 Token（设计图优先） =====
    action:         '#36C99A',
    love:           '#FF6B81',
    secondaryAction:'#FF9F43',
    nearbyExplore:  '#36C99A',
    verified:       '#36C99A',
    unverified:     '#A29BFE',
    disabled:       '#C8CFCD',
    // ===== v3.1 状态 Token（docs/design/v3.1-contract.md §2） =====
    status: {
      success: '#36C99A',
      warning: '#F59E0B',
      error:   '#E94D87',
      info:    '#4D8DFF',
      online:  '#36C99A',
      offline: '#C8CFCD',
      disabled: '#DCE5E2',
      pressed: '#EAF2EF',
      selected: '#36C99A',
    },
    // ===== v3.1 兴趣标签三色（contract §1） =====
    tag: {
      green: { bg: '#EAF8F2', text: '#279B70' },
      pink:  { bg: '#FFF0F6', text: '#E94D87' },
      blue:  { bg: '#EEF3FF', text: '#4D79D8' },
    },
    // VIP 金色：与 design-variables.scss 的 --c-gold(#FFD700) 双源同步
    // （R4-00116：VIP 页 switch 激活色引用此处，改金色只需改这一处）
    gold:    '#FFD700',

    state: {
      signup: {
        bg:    '#55D5A7',
        text:  '#1A7A4A',
      },
      ongoing: {
        bg:    '#FFD479',
        text:  '#8A5A00',
      },
      preview: {
        bg:    '#B7C4FF',
        text:  '#3B47B7',
      },
    },

    schedule: {
      50:  '#FFECEF',
      100: '#FFD9DF',
      200: '#FFB3C0',
      300: '#FF8DA1',
      400: '#FF7C91',
      500: '#FF6B81',
      600: '#E85A70',
      700: '#CC4A5F',
      800: '#9D174D',
      900: '#831843',
    },

      neutral: {
        50:  '#EEF7F2',
        100: '#EEF2F0',
        200: '#DDE3E0',
        300: '#C2CAC6',
        400: '#9AA39F',
        500: '#6B7571',
        600: '#4A524E',
        700: '#333A37',
        800: '#1A1F26',
        900: '#1A1E1C',
      },

    text: {
        primary:    '#1A1E1C',
        secondary:  '#4A524E',
        tertiary:   '#6B7571',
        quaternary: '#9AA39F',
      inverse:    '#FFFFFF',
      brand:      '#36C99A',
      link:       '#36C99A',
      romance:    '#FF6B81',
    },

    border: {
      light:   '#EEF2F0',
      default: '#DDE3E0',
      strong:  '#C2CAC6',
      dark:    '#222831',
    },

    gradient: {
      brand:           'linear-gradient(135deg, #36C99A 0%, #55D5A7 100%)',
      secondary:       'linear-gradient(135deg, #55D5A7 0%, #A3EBCF 100%)',
      warmCool:        'linear-gradient(135deg, #36C99A 0%, #D1F5E7 100%)',
      sunset:          'linear-gradient(135deg, #F97316 0%, #FF6B81 100%)',
      pink:            'linear-gradient(135deg, #FF6B81 0%, #F97316 100%)',
      match:           'linear-gradient(135deg, #E8FAF3 0%, #FDF2F8 100%)',
      pageAtmosphere:  'linear-gradient(180deg, #FFECEF 0%, #EEF7F2 100%)',
      cardAtmosphere:  'linear-gradient(135deg, rgba(54, 201, 154, 0.04) 0%, rgba(255, 107, 129, 0.02) 100%)',
      brandOverlay:    'linear-gradient(180deg, rgba(54, 201, 154, 0.08) 0%, transparent 100%)',
      vip:             'linear-gradient(12deg, #C9A36A 0%, #E8C98A 100%)',
      romance:         'linear-gradient(135deg, #FF6B81 0%, #F97316 100%)',
      romanceSoft:     'linear-gradient(135deg, #FFECEF 0%, #FFEDD5 100%)',
      brandRomance:    'linear-gradient(135deg, #36C99A 0%, #FF7C91 100%)',
      headerGradient:  'linear-gradient(180deg, #FFECEF 0%, #E8FAF3 40%, #EEF7F2 100%)',
      floatButton:     'linear-gradient(135deg, #36C99A 0%, #36C99A 100%)',
      vipGold:         'linear-gradient(135deg, #D4A853 0%, #F0D090 100%)',
    },
    bg: {
      page:      '#EEF7F2',
      container: '#FFFFFF',
      surface:   '#FFFFFF',
      overlay:   'rgba(0, 0, 0, 0.45)',
      brand:     '#E8FAF3',
      secondary: '#EEF2F0',
      accent:    '#F0F9FF',
      romance:   '#FFF0F6',
      dark:      '#1A1E1C',
      darkCard:  '#222831',
    },

    functionIcon: {
      blue:    'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
      pink:    'linear-gradient(135deg, #FF7C91 0%, #FF6B81 100%)',
      purple:  'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
      orange:  'linear-gradient(135deg, #FB923C 0%, #F97316 100%)',
      green:   'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
      cyan:    'linear-gradient(135deg, #22D3EE 0%, #06B6D4 100%)',
      red:     'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
      yellow:  'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    },
  },

  radius: {
    none:   0,
    xs:     4,
    sm:     8,
    md:     12,
    lg:     20,
    xl:     24,
    xxl:    28,
    full:   9999,
  },

  spacing: {
    0:  0,
    1:  4,
    2:  8,
    3:  12,
    4:  16,
    5:  20,
    6:  24,
    7:  32,
    8:  32,
    9:  48,
    10: 48,
    11: 80,
    12: 96,
  },

  shadow: {
    none: 'none',
    xs:   '0 1px 2px rgba(15, 23, 42, 0.03)',
    sm:   '0 2px 8px rgba(15, 23, 42, 0.04)',
    md:   '0 4px 16px rgba(15, 23, 42, 0.06)',
    lg:   '0 8px 32px rgba(15, 23, 42, 0.08)',
    xl:   '0 16px 48px rgba(15, 23, 42, 0.10)',
    inner:'inset 0 2px 4px rgba(15, 23, 42, 0.03)',
    /* 品牌阴影对齐青藤参考：8px 偏移 + 24px 模糊 + 24% 不透明 */
    brand:     '0 8px 24px rgba(54, 201, 154, 0.24)',
    brandSm:   '0 2px 8px rgba(54, 201, 154, 0.15)',
    /* v3 冻结：卡片 / 浮层阴影（docs 冻结表） */
    card:      '0 4px 16px rgba(30, 80, 65, 0.08)',
    float:     '0 10px 28px rgba(30, 80, 65, 0.12)',
    brandMd:   '0 4px 16px rgba(54, 201, 154, 0.20)',
    brandLg:   '0 8px 24px rgba(54, 201, 154, 0.30)',
    pink:      '0 4px 16px rgba(255, 107, 129, 0.25)',
    pinkMd:    '0 4px 16px rgba(255, 107, 129, 0.30)',
    modal:     '0 24px 60px rgba(15,23,42,.18)',
    /* 卡片软阴影对齐青藤参考：双层 4% 不透明 */
    cardSoft:  '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)',
    /* 浮动按钮阴影对齐青藤参考：8px 偏移 + 24px 模糊 + 32% 不透明 */
    floatBtn:  '0 8px 24px rgba(54, 201, 154, 0.32)',
    romanceShadow: '0 4px 16px rgba(255, 107, 129, 0.2)',
  },

  /** v3 冻结：Hero 渐变遮罩（寻觅卡/匹配卡文字可读性） */
  overlay: {
    hero: 'linear-gradient(transparent 45%, rgba(13, 35, 29, 0.72) 100%)',
  },

  /** v3 冻结：文本层级语义（Title/Headline/Body/Caption/Meta） */
  textHierarchy: {
    title:    { size: 44, weight: 'extrabold' },
    headline: { size: 34, weight: 'bold' },
    body:     { size: 26, weight: 'regular' },
    caption:  { size: 22, weight: 'regular' },
    meta:     { size: 20, weight: 'regular' },
  },

  /** v3 冻结：交互状态（default/pressed/disabled/selected/loading） */
  interaction: {
    default:  { bg: '#FFFFFF', border: '#EEF2F0' },
    pressed:  { bg: '#EAF2EF' },
    disabled: { opacity: 0.5 },
    selected: { bg: '#36C99A', text: '#FFFFFF' },
    loading:  { bg: '#F0F2F5' },
  },

  typography: {
    fontFamily: {
      sans:    '-apple-system, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      display: '"SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif',
      mono:    '"SF Mono", "Fira Code", monospace',
    },

    /**
     * 字号（px，供 JS 逻辑/动态计算与 H5 场景使用）。
     * 与 SCSS rpx 体系（--fs-*，design-variables.scss: --fs-xs:20rpx … --fs-7xl:56rpx）是
     * 两套独立体系：仅当 750 设计稿按 1rpx = 0.5px 折算时数值近似（如 body 26px ≈ --fs-md 26rpx），
     * 实际渲染单位不同。修改任意一侧字号时必须评估另一体系是否需要同步，
     * 业务代码不得在样式里直接引用本 px 值，也不得在 JS 里引用 rpx 值。
     */
    size: {
      display: 80,
      h1:      44,
      h2:      36,
      h3:      30,
      subtitle:28,
      body:    26,
      bodySm:  24,
      caption: 22,
      overline:20,
    },

    lineHeight: {
      tight:   1.2,
      normal:  1.5,
      relaxed: 1.6,
    },

    weight: {
      regular:  400,
      medium:   500,
      semibold: 600,
      bold:     700,
      extrabold:800,
    },

    letterSpacing: {
      tight:  '-0.02em',
      normal: '0',
      wide:   '0.02em',
    },
  },

  motion: {
    duration: {
      instant:  80,
      fast:     120,
      normal:   200,
      slow:     250,
      slower:   350,
      slowest:  600,
    },
    easing: {
      default:    'cubic-bezier(0.4, 0, 0.2, 1)',
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
      bounce:     'cubic-bezier(0.34, 1.56, 0.64, 1)',
      smooth:     'cubic-bezier(0.25, 0.1, 0.25, 1)',
      spring:     'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  zIndex: {
    base:     0,
    card:     2,
    overlay:  5,
    badge:    6,
    indicator: 7,
    header:   10,
    dropdown: 100,
    sticky:   200,
    modal:    400,
    toast:    500,
    tooltip:  600,
  },

  layout: {
    maxWidth:     375,
    pagePadding:  32,
    cardPadding:  32,
    sectionGap:   24,
    safeBottom:   34,
    safeTop:      44,
    gridUnit:     4,
    borderRadius: {
      card:    16,
      section: 16,
      button:  24,
      tag:     12,
      input:   12,
      modal:   24,
    },
  },

  component: {
    button: {
      // 双源同步（R4-00236）：与 theme/design-variables.scss 的
      // --btn-height-sm/md/lg（80/96/104rpx）对齐，本处为 px 值
      // （按 750 设计稿 2x 基准换算：rpx / 2）。修改按钮高度必须两端同步。
      height: {
        sm: 40, // == 80rpx
        md: 48, // == 96rpx
        lg: 52, // == 104rpx
      },
      paddingX: {
        sm: 24,
        md: 36,
        lg: 48,
      },
      radius: 24,
      pressScale: 0.95,
      pressOpacity: 0.9,
      pressDuration: 200,
    },
    card: {
      radius:      20,
      padding:     32,
      radiusInner: 12,
      radiusMicro: 8,
    },
    avatar: {
      xs: 32,
      sm: 40,
      md: 48,
      lg: 64,
      xl: 80,
    },
    input: {
      height: 44,
      radius: 12,
    },
    tabBar: {
      height: 49,
      iconSize: 24,
      iconWrapSize: 32,
      iconWrapActiveSize: 48,
    },
    tag: {
      height: 32,
      radius: 12,
      radiusPill: 24,
      paddingX: 12,
    },
    statusBadge: {
      height: 18,
      radius: 4,
      fontSize: 10,
    },
  },
} as const;

export type ThemeMode = 'light' | 'dark' | 'warm';

export const darkThemeTokens = {
  ...designTokens,
  color: {
    ...designTokens.color,
    bg: {
      page:      '#0E1116',
      container: '#1A1F26',
      surface:   '#222831',
      overlay:   'rgba(0, 0, 0, 0.65)',
      brand:     '#156B51',
      secondary: '#156B51',
      accent:    '#65200D',
      romance:   '#2D1F24',
      dark:      '#0E1116',
      darkCard:  '#1A1F26',
    },
    border: {
      light:   '#222831',
      default: '#334155',
      strong:  '#475569',
      dark:    '#222831',
    },
    neutral: {
      ...designTokens.color.neutral,
    },
    text: {
      primary:    '#F0F2F5',
      secondary:  '#B8BEC8',
      tertiary:   '#8A92A0',
      quaternary: '#5A6270',
      inverse:    '#1A1F26',
      brand:      '#36C99A',
      link:       '#36C99A',
      romance:    '#FF7C91',
    },
    bubble: {
      other:  '#222831',
      self:   '#36C99A',
    },
    romance: {
      50:  '#2D1F24',
      100: '#3D242E',
      200: '#5A2D3D',
      300: '#7A3850',
      400: '#BE4D8A',
      500: '#FF6B81',
      600: '#FF7C91',
      700: '#FF8DA1',
      800: '#FFB3C0',
      900: '#FFD9DF',
    },
    warm: {
      50:  '#2D2017',
      100: '#3D2A1A',
      200: '#5A3A1F',
      300: '#7D4D27',
      400: '#C25C16',
      500: '#F97316',
      600: '#FB923C',
      700: '#FDBA74',
      800: '#FED7AA',
      900: '#FFEDD5',
    },
    gradient: {
      ...designTokens.color.gradient,
      romanceSoft:    'linear-gradient(135deg, #2D1F24 0%, #2D2017 100%)',
      headerGradient: 'linear-gradient(180deg, #2D1F24 0%, #0F1F1A 50%, #0E1116 100%)',
    },
  },
  shadow: {
    ...designTokens.shadow,
    cardSoft:     '0 2px 12px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.2)',
    floatBtn:     '0 6px 20px rgba(54, 201, 154, 0.45)',
    romanceShadow:'0 4px 16px rgba(255, 107, 129, 0.35)',
  },
} as const;

export const warmThemeTokens = {
  ...designTokens,
  color: {
    ...designTokens.color,
    bg: {
      ...designTokens.color.bg,
      page:      '#FFFAF5',
      container: '#FFFFFF',
      surface:   '#FFF1EB',
      overlay:   'rgba(60, 30, 20, 0.45)',
      brand:     '#FFECEF',
      secondary: '#FFEDD5',
      accent:    '#FFF7ED',
    },
    gradient: {
      ...designTokens.color.gradient,
      pageAtmosphere: 'linear-gradient(180deg, #FFECEF 0%, #FFFAF5 100%)',
      headerGradient: 'linear-gradient(180deg, #FFECEF 0%, #FFF7ED 50%, #FFFAF5 100%)',
    },
  },
  shadow: {
    ...designTokens.shadow,
    cardSoft:     '0 2px 12px rgba(124, 45, 18, 0.05), 0 1px 3px rgba(124, 45, 18, 0.04)',
    romanceShadow:'0 4px 16px rgba(255, 107, 129, 0.25)',
  },
} as const;

export const getThemeTokens = (mode: ThemeMode = 'light') => {
  switch (mode) {
    case 'dark': return darkThemeTokens;
    case 'warm': return warmThemeTokens;
    default:     return designTokens;
  }
};

export default designTokens;


















