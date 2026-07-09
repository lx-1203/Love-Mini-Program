// ============================================================
// 校园恋爱小程序 - Design Tokens
// 版本: 4.0.0 (浪漫恋爱风格UI美化版 · 陌陌/TT语音参考)
// 说明: 所有UI参数集中管理，支持主题切换，禁止硬编码
// 设计原则: 色彩和谐 · 排版韵律 · 间距统一 · 自然舒适 · 浪漫青春
// ============================================================

export const designTokens = {
  color: {
    brand: {
      50:  '#E8F8F0',
      100: '#D1F0E0',
      200: '#A3E0C0',
      300: '#7CD9A6',
      400: '#2DB97A',
      500: '#3FCF8E',
      600: '#25A86C',
      700: '#1D8A5A',
      800: '#15744A',
      900: '#0D5E3A',
    },

    secondary: {
      50:  '#F0FDF9',
      100: '#CCFBEF',
      200: '#99F6E0',
      300: '#7CD9A6',
      400: '#2DB97A',
      500: '#3FCF8E',
      600: '#25A86C',
      700: '#1D8A5A',
      800: '#15744A',
      900: '#0D5E3A',
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
      50:  '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#EC4899',
      500: '#DB2777',
      600: '#BE185D',
      700: '#9D174D',
      800: '#831843',
      900: '#701A3D',
    },

    romance: {
      50:  '#FFF5F7',
      100: '#FFE4E9',
      200: '#FBCFE0',
      300: '#F9A8C4',
      400: '#F472B6',
      500: '#EC4899',
      600: '#DB2777',
      700: '#BE185D',
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

    success: '#10B981',
    warning: '#F59E0B',
    error:   '#E5454D',
    errorDark: '#FF6B6B',
    info:    '#3FCF8E',

    state: {
      signup: {
        bg:    '#7CD9A6',
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
      mint:    '#DCEFE2',
      blue:    '#DCE6F2',
      purple:  '#E8DCEF',
      apricot: '#F2E8DC',
      green:   '#DCEFDC',
      pink:    '#EFDCE8',
    },

    location: {
      bg:   'rgba(63, 207, 142, 0.12)',
      text: '#3FCF8E',
    },

    vip: {
      from:  '#C9A36A',
      to:    '#E8C98A',
    },

    price: '#E5454D',

    neutral: {
      0:   '#FFFFFF',
      50:  '#F4F6FA',
      100: '#F0F2F5',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1A1F26',
      900: '#0E1116',
    },

    text: {
      primary:    '#1F2329',
      secondary:  '#5B6470',
      tertiary:   '#9AA1AB',
      quaternary: '#94A3B8',
      inverse:    '#FFFFFF',
      brand:      '#3FCF8E',
      link:       '#2DB97A',
      romance:    '#EC4899',
    },

    bg: {
      page:      '#F4F6FA',
      container: '#FFFFFF',
      surface:   '#F4F6FA',
      overlay:   'rgba(15, 23, 42, 0.45)',
      brand:     '#E8F8F0',
      secondary: '#D1F0E0',
      accent:    '#FFF7ED',
      romance:   '#FFF5F7',
    },

    border: {
      light:   '#EEF0F4',
      default: '#E2E8F0',
      strong:  '#CBD5E1',
      dark:    '#222831',
    },

    gradient: {
      brand:           'linear-gradient(135deg, #3FCF8E 0%, #7CD9A6 100%)',
      secondary:       'linear-gradient(135deg, #7CD9A6 0%, #A3E0C0 100%)',
      warmCool:        'linear-gradient(135deg, #3FCF8E 0%, #D1F0E0 100%)',
      sunset:          'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
      pink:            'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
      match:           'linear-gradient(135deg, #E8F8F0 0%, #FDF2F8 100%)',
      pageAtmosphere:  'linear-gradient(180deg, #FFF5F7 0%, #F4F6FA 100%)',
      cardAtmosphere:  'linear-gradient(135deg, rgba(63,207,142,0.04) 0%, rgba(236,72,153,0.02) 100%)',
      brandOverlay:    'linear-gradient(180deg, rgba(63,207,142,0.08) 0%, transparent 100%)',
      vip:             'linear-gradient(12deg, #C9A36A 0%, #E8C98A 100%)',
      romance:         'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
      romanceSoft:     'linear-gradient(135deg, #FFF5F7 0%, #FFEDD5 100%)',
      brandRomance:    'linear-gradient(135deg, #3FCF8E 0%, #F472B6 100%)',
      headerGradient:  'linear-gradient(180deg, #FFF5F7 0%, #E8F8F0 40%, #F4F6FA 100%)',
      floatButton:     'linear-gradient(135deg, #3FCF8E 0%, #2DB97A 100%)',
      vipGold:         'linear-gradient(135deg, #D4A853 0%, #F0D090 100%)',
    },

    functionIcon: {
      blue:    'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
      pink:    'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',
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
    lg:     16,
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
    brand:     '0 8px 24px rgba(63, 207, 142, 0.24)',
    brandSm:   '0 2px 8px rgba(63, 207, 142, 0.15)',
    brandMd:   '0 4px 16px rgba(63, 207, 142, 0.20)',
    brandLg:   '0 8px 24px rgba(63, 207, 142, 0.30)',
    pink:      '0 4px 16px rgba(236, 72, 153, 0.25)',
    pinkMd:    '0 4px 16px rgba(236, 72, 153, 0.30)',
    card:      '0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.04)',
    modal:     '0 24px 60px rgba(15,23,42,.18)',
    /* 卡片软阴影对齐青藤参考：双层 4% 不透明 */
    cardSoft:  '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)',
    /* 浮动按钮阴影对齐青藤参考：8px 偏移 + 24px 模糊 + 32% 不透明 */
    floatBtn:  '0 8px 24px rgba(63, 207, 142, 0.32)',
    romanceShadow: '0 4px 16px rgba(236, 72, 153, 0.2)',
  },

  typography: {
    fontFamily: {
      sans:    '-apple-system, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      display: '"SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif',
      mono:    '"SF Mono", "Fira Code", monospace',
    },

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
      height: {
        sm: 56,
        md: 72,
        lg: 88,
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
      radius:      16,
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
      brand:     '#15744A',
      secondary: '#15744A',
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
      brand:      '#3FCF8E',
      link:       '#2DB97A',
      romance:    '#F472B6',
    },
    bubble: {
      other:  '#222831',
      self:   '#3FCF8E',
    },
    romance: {
      50:  '#2D1F24',
      100: '#3D242E',
      200: '#5A2D3D',
      300: '#7A3850',
      400: '#BE4D8A',
      500: '#EC4899',
      600: '#F472B6',
      700: '#F9A8C4',
      800: '#FBCFE0',
      900: '#FFE4E9',
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
    floatBtn:     '0 6px 20px rgba(63, 207, 142, 0.45)',
    romanceShadow:'0 4px 16px rgba(236, 72, 153, 0.35)',
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
      brand:     '#FFF5F7',
      secondary: '#FFEDD5',
      accent:    '#FFF7ED',
    },
    gradient: {
      ...designTokens.color.gradient,
      pageAtmosphere: 'linear-gradient(180deg, #FFF5F7 0%, #FFFAF5 100%)',
      headerGradient: 'linear-gradient(180deg, #FFF5F7 0%, #FFF7ED 50%, #FFFAF5 100%)',
    },
  },
  shadow: {
    ...designTokens.shadow,
    cardSoft:     '0 2px 12px rgba(124, 45, 18, 0.05), 0 1px 3px rgba(124, 45, 18, 0.04)',
    romanceShadow:'0 4px 16px rgba(236, 72, 153, 0.25)',
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
