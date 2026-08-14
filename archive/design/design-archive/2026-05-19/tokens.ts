// ============================================================
// 校园恋爱小程序 - Design Tokens
// 版本: 1.0.0
// 说明: 所有UI参数集中管理，支持主题切换，禁止硬编码
// ============================================================

export const designTokens = {
  // ---------- 色彩系统 ----------
  color: {
    // 品牌主色 - 天蓝色，清新校园感
    brand: {
      50:  '#E8F4FD',
      100: '#C5E5F8',
      200: '#9DD4F3',
      300: '#6CBFED',
      400: '#3B9DE5', // 主色
      500: '#2A8BD4',
      600: '#1E77B8',
      700: '#176194',
      800: '#114D75',
      900: '#0C3A58',
    },

    // 辅助色 - 浅青色，活力与信任
    secondary: {
      50:  '#E8F9FC',
      100: '#C5F0F7',
      200: '#9DE4F0',
      300: '#6CD5E8',
      400: '#5BC0DE', // 辅助主色
      500: '#4AABC8',
      600: '#3D94AE',
      700: '#317A8F',
      800: '#266172',
      900: '#1C4A57',
    },

    // 强调色 - 暖橙色，温暖与活力
    accent: {
      50:  '#FFF2E8',
      100: '#FFD9C5',
      200: '#FFBF9D',
      300: '#FFA36E',
      400: '#FF8C42', // 强调主色
      500: '#E87A35',
      600: '#D1682A',
      700: '#B35722',
      800: '#8C451B',
      900: '#6B3515',
    },

    // 语义色
    success: '#3ECBB1',
    warning: '#FF8C42',
    error:   '#E85A6E',
    info:    '#3B9DE5',

    // 中性色
    neutral: {
      0:   '#FFFFFF',
      50:  '#F7F9FC',
      100: '#EEF1F6',
      200: '#DDE2EB',
      300: '#C4CBD8',
      400: '#9BA3B4',
      500: '#6E7687',
      600: '#4A5060',
      700: '#2D323E',
      800: '#1A1D26',
      900: '#0D0F14',
    },

    // 文本色
    text: {
      primary:   '#1A1D26',
      secondary: '#4A5060',
      tertiary:  '#6E7687',
      quaternary:'#9BA3B4',
      inverse:   '#FFFFFF',
      brand:     '#3B9DE5',
      link:      '#3B9DE5',
    },

    // 背景色
    bg: {
      page:      '#F7F9FC',
      container: '#FFFFFF',
      surface:   '#EEF1F6',
      overlay:   'rgba(13, 15, 20, 0.45)',
      brand:     '#E8F4FD',
      secondary: '#E8F9FC',
      accent:    '#FFF2E8',
    },

    // 边框与分割线
    border: {
      light:   '#EEF1F6',
      default: '#DDE2EB',
      strong:  '#C4CBD8',
    },

    // 渐变预设
    gradient: {
      brand:    'linear-gradient(135deg, #3B9DE5 0%, #5BC0DE 100%)',
      secondary:'linear-gradient(135deg, #5BC0DE 0%, #6CD5E8 100%)',
      warmCool: 'linear-gradient(135deg, #3B9DE5 0%, #5BC0DE 100%)',
      sunset:   'linear-gradient(135deg, #FF8C42 0%, #3B9DE5 100%)',
    },
  },

  // ---------- 圆角系统 ----------
  radius: {
    none:   0,
    xs:     4,
    sm:     8,
    md:     12,
    lg:     16,
    xl:     20,
    xxl:    28,
    full:   9999,
  },

  // ---------- 间距系统 ----------
  spacing: {
    0:  0,
    1:  4,
    2:  8,
    3:  12,
    4:  16,
    5:  20,
    6:  24,
    7:  32,
    8:  40,
    9:  48,
    10: 64,
    11: 80,
    12: 96,
  },

  // ---------- 阴影系统 ----------
  shadow: {
    none: 'none',
    xs:   '0 1px 2px rgba(26, 29, 38, 0.04)',
    sm:   '0 2px 8px rgba(26, 29, 38, 0.06)',
    md:   '0 8px 24px rgba(26, 29, 38, 0.08)',
    lg:   '0 16px 40px rgba(26, 29, 38, 0.10)',
    xl:   '0 24px 64px rgba(26, 29, 38, 0.12)',
    inner:'inset 0 2px 4px rgba(26, 29, 38, 0.04)',
    // 品牌色阴影（用于按钮/卡片悬停）
    brand: '0 8px 24px rgba(59, 157, 229, 0.25)',
    secondary: '0 8px 24px rgba(91, 192, 222, 0.25)',
  },

  // ---------- 排版系统 ----------
  typography: {
    // 字体族
    fontFamily: {
      sans: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      display: '"DIN Alternate", "Helvetica Neue", "PingFang SC", sans-serif',
      mono: '"SF Mono", "Fira Code", monospace',
    },

    // 字号（单位 rpx）
    size: {
      display: 48,  // 超大标题，如匹配成功
      h1:      40,  // 页面主标题
      h2:      32,  // 区块标题
      h3:      28,  // 卡片标题
      h4:      24,  // 小标题
      body:    26,  // 正文（基准）
      bodySm:  24,  // 小正文
      caption: 20,  // 辅助说明
      overline:18,  // 标签/角标
    },

    // 行高
    lineHeight: {
      tight: 1.2,   // 标题
      normal: 1.6,  // 正文
      relaxed: 1.8, // 长文本
    },

    // 字重
    weight: {
      regular: 400,
      medium:  500,
      semibold:600,
      bold:    700,
    },

    // 字间距
    letterSpacing: {
      tight:  '-0.02em',
      normal: '0',
      wide:   '0.04em',
    },
  },

  // ---------- 动效系统 ----------
  motion: {
    duration: {
      instant:  80,
      fast:     160,
      normal:   240,
      slow:     400,
      slower:   600,
    },
    easing: {
      default:   'cubic-bezier(0.4, 0, 0.2, 1)',
      decelerate:'cubic-bezier(0, 0, 0.2, 1)',
      accelerate:'cubic-bezier(0.4, 0, 1, 1)',
      bounce:    'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  // ---------- Z-Index 层级 ----------
  zIndex: {
    base:     0,
    dropdown: 100,
    sticky:   200,
    overlay:  300,
    modal:    400,
    toast:    500,
    tooltip:  600,
  },

  // ---------- 布局 ----------
  layout: {
    maxWidth:     750,   // 设计稿基准宽度（rpx）
    pagePadding:  24,    // 页面水平边距
    cardPadding:  24,    // 卡片内边距
    sectionGap:   24,    // 区块间距
    safeBottom:   34,    // 底部安全区（iPhone X+）
    safeTop:      44,    // 顶部安全区
  },

  // ---------- 组件特定 Token ----------
  component: {
    button: {
      height: {
        sm: 56,
        md: 72,
        lg: 88,
      },
      radius: 9999,
    },
    card: {
      radius: 20,
      padding: 24,
    },
    avatar: {
      xs: 48,
      sm: 64,
      md: 88,
      lg: 120,
      xl: 160,
    },
    input: {
      height: 80,
      radius: 12,
    },
    tabBar: {
      height: 96,
    },
    tag: {
      height: 36,
      radius: 9999,
      paddingX: 16,
    },
  },
} as const;

// ---------- 主题切换支持 ----------
export type ThemeMode = 'light' | 'dark' | 'warm';

export const darkThemeTokens = {
  ...designTokens,
  color: {
    ...designTokens.color,
    text: {
      primary:   '#F0F2F5',
      secondary: '#B8BEC8',
      tertiary:  '#8A92A0',
      quaternary:'#5A6270',
      inverse:   '#1A1D26',
      brand:     '#6CBFED',
      link:      '#6CBFED',
    },
    bg: {
      page:      '#0D0F14',
      container: '#1A1D26',
      surface:   '#2D323E',
      overlay:   'rgba(0, 0, 0, 0.65)',
      brand:     '#0C2A42',
      secondary: '#0C2E38',
      accent:    '#3A200E',
    },
    border: {
      light:   '#2D323E',
      default: '#3A4050',
      strong:  '#4A5060',
    },
  },
} as const;

export const warmThemeTokens = {
  ...designTokens,
  color: {
    ...designTokens.color,
    bg: {
      page:      '#FFF8F5',
      container: '#FFFFFF',
      surface:   '#FFEDE5',
      overlay:   'rgba(60, 30, 20, 0.45)',
      brand:     '#E8F4FD',
      secondary: '#E8F9FC',
      accent:    '#FFF2E8',
    },
  },
} as const;

// 导出便捷函数
export const getThemeTokens = (mode: ThemeMode = 'light') => {
  switch (mode) {
    case 'dark': return darkThemeTokens;
    case 'warm': return warmThemeTokens;
    default:     return designTokens;
  }
};

export default designTokens;
