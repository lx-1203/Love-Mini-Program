// ============================================================
// 校园恋爱小程序 - Design Tokens
// 版本: 3.0.0 (青藤融入版 · 参考图对齐)
// 说明: 所有UI参数集中管理，支持主题切换，禁止硬编码
// 设计原则: 色彩和谐 · 排版韵律 · 间距统一 · 自然舒适
// 参考图: 青藤之恋风格 · 校园恋爱交友小程序
// ============================================================

export const designTokens = {
  // ---------- 色彩系统 ----------
  color: {
    // 品牌主色 - 青藤绿系（色相 150°）
    brand: {
      50:  '#E8F8F0',  // 极浅绿底
      100: '#D1F0E0',  // 浅绿底
      200: '#A3E0C0',  // 中浅绿
      300: '#7CD9A6',  // 过渡绿（报名中徽章底色）
      400: '#3FCF8E',  // 品牌主色（青藤绿）
      500: '#2DB97A',  // 深色主色（交互态）
      600: '#25A06A',  // 按下态
      700: '#1D8A5A',  // 深绿，文字强调
      800: '#15744A',  // 深色背景用
      900: '#0D5E3A',  // 最深
    },

    // 辅助色 - 浅绿，层次过渡
    secondary: {
      50:  '#F0FDF9',
      100: '#CCFBEF',
      200: '#99F6E0',
      300: '#7CD9A6',
      400: '#3FCF8E',  // 渐变副色
      500: '#2DB97A',
      600: '#25A06A',
      700: '#1D8A5A',
      800: '#15744A',
      900: '#0D5E3A',
    },

    // 强调色 - 暖橙色，温暖与活力
    accent: {
      50:  '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#F97316',  // 强调主色
      500: '#EA580C',
      600: '#C2410C',
      700: '#9A3412',
      800: '#7C2D12',
      900: '#65200D',
    },

    // 粉色 - 匹配/喜欢专用
    pink: {
      50:  '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#EC4899',  // 粉色主色
      500: '#DB2777',
      600: '#BE185D',
      700: '#9D174D',
      800: '#831843',
      900: '#701A3D',
    },

    // 语义色
    success: '#10B981',
    warning: '#F59E0B',
    error:   '#E5454D',  // 价格红（参考图番茄红）
    info:    '#3FCF8E',

    // 状态徽章色（参考图）
    state: {
      signup: {
        bg:    '#7CD9A6',  // 薄荷绿底
        text:  '#1A7A4A',  // 深绿字
      },
      ongoing: {
        bg:    '#FFD479',  // 琥珀黄底
        text:  '#8A5A00',  // 深棕字
      },
      preview: {
        bg:    '#B7C4FF',  // 蓝紫底
        text:  '#3B47B7',  // 深蓝紫字
      },
    },

    // VIP 渐变色（参考图金棕渐变）
    vip: {
      from:  '#C9A36A',  // 金棕起始
      to:    '#E8C98A',  // 金棕结束
    },

    // 价格红
    price: '#E5454D',

    // 中性色（参考图）
    neutral: {
      0:   '#FFFFFF',
      50:  '#F4F6FA',  // 浅背景（参考图）
      100: '#EEF0F4',  // 分隔线浅
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1A1F26',  // 深色卡片背景
      900: '#0E1116',  // 深色页面背景
    },

    // 文本色（参考图三色系统）
    text: {
      primary:    '#1F2329',  // 主文本色
      secondary:  '#5B6470',  // 次文本色
      tertiary:   '#9AA1AB',  // 辅文本色
      quaternary: '#94A3B8',
      inverse:    '#FFFFFF',
      brand:      '#3FCF8E',
      link:       '#2DB97A',
    },

    // 背景色（参考图）
    bg: {
      page:      '#F4F6FA',  // 浅背景
      container: '#FFFFFF',
      surface:   '#F4F6FA',
      overlay:   'rgba(15, 23, 42, 0.45)',
      brand:     '#E8F8F0',  // 同步 brand[50]
      secondary: '#D1F0E0',  // 同步 brand[100]
      accent:    '#FFF7ED',
      dark:      '#0E1116',  // 深色页面背景
      darkCard:  '#1A1F26',  // 深色卡片背景
    },

    // 边框与分割线
    border: {
      light:   '#EEF0F4',  // 浅分隔线
      default: '#E2E8F0',
      strong:  '#CBD5E1',
      dark:    '#222831',  // 深色分隔线
    },

    // 渐变预设
    gradient: {
      brand:           'linear-gradient(135deg, #3FCF8E 0%, #7CD9A6 100%)',
      secondary:       'linear-gradient(135deg, #7CD9A6 0%, #A3E0C0 100%)',
      warmCool:        'linear-gradient(135deg, #3FCF8E 0%, #D1F0E0 100%)',
      sunset:          'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
      pink:            'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
      match:           'linear-gradient(135deg, #E8F8F0 0%, #FDF2F8 100%)',
      pageAtmosphere:  'linear-gradient(180deg, #E8F8F0 0%, #F4F6FA 100%)',
      cardAtmosphere:  'linear-gradient(135deg, rgba(63,207,142,0.04) 0%, rgba(124,217,166,0.02) 100%)',
      brandOverlay:    'linear-gradient(180deg, rgba(63,207,142,0.08) 0%, transparent 100%)',
      vip:             'linear-gradient(12deg, #C9A36A 0%, #E8C98A 100%)',  // VIP 金棕渐变
    },
  },

  // ---------- 圆角系统（参考图四级圆角） ----------
  radius: {
    none:   0,
    xs:     4,
    sm:     8,
    md:     12,    // 输入控件、标签
    lg:     16,    // 卡片圆角（参考图）
    xl:     24,    // 弹层、胶囊按钮
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

  // ---------- 阴影系统（3 级高程 + 品牌色阴影） ----------
  shadow: {
    none: 'none',
    xs:   '0 1px 2px rgba(15, 23, 42, 0.03)',   // 标签/微元素
    sm:   '0 2px 8px rgba(15, 23, 42, 0.04)',    // 卡片（纸片感）
    md:   '0 4px 16px rgba(15, 23, 42, 0.06)',   // 弹出/浮层
    lg:   '0 8px 32px rgba(15, 23, 42, 0.08)',   // 模态/对话框
    xl:   '0 16px 48px rgba(15, 23, 42, 0.10)',  // 全屏遮罩
    inner:'inset 0 2px 4px rgba(15, 23, 42, 0.03)',
    // 品牌色阴影（按钮/品牌卡片悬停）- 青藤绿
    brand:     '0 4px 16px rgba(63, 207, 142, 0.25)',
    brandSm:   '0 2px 8px rgba(63, 207, 142, 0.15)',
    brandMd:   '0 4px 16px rgba(63, 207, 142, 0.20)',
    brandLg:   '0 8px 24px rgba(63, 207, 142, 0.30)',  // 强调态阴影
    pink:      '0 4px 16px rgba(236, 72, 153, 0.25)',
    pinkMd:    '0 4px 16px rgba(236, 72, 153, 0.30)',
    // 卡片阴影（参考图）
    card:      '0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.04)',
    // 弹层阴影（参考图）
    modal:     '0 24px 60px rgba(15,23,42,.18)',
  },

  // ---------- 排版系统 ----------
  typography: {
    fontFamily: {
      sans:    '-apple-system, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      display: '"SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif',
      mono:    '"SF Mono", "Fira Code", monospace',
    },

    // 字号（单位 rpx）
    size: {
      display: 80,  // 40px · 超大标题（匹配成功）
      h1:      44,  // 22px · 页面主标题（统一值，略大于原 h1=64/32）
      h2:      36,  // 18px · 区块标题（原 h2=52/26，统一为 36rpx）
      h3:      30,  // 15px · 卡片标题（原 h3=40/20，对齐实际使用）
      subtitle:28,  // 14px · 副标题/小标题（新增）
      body:    26,  // 13px · 正文（基准）
      bodySm:  24,  // 12px · 小正文
      caption: 22,  // 11px · 辅助说明
      overline:20,  // 10px · 标签/角标
    },

    // 行高
    lineHeight: {
      tight:   1.2,  // 标题
      normal:  1.5,  // 正文
      relaxed: 1.6,  // 长文本/说明
    },

    // 字重
    weight: {
      regular:  400,
      medium:   500,
      semibold: 600,
      bold:     700,
      extrabold:800,  // 新增：页面主标题专用
    },

    // 字间距
    letterSpacing: {
      tight:  '-0.02em', // 标题
      normal: '0',       // 正文
      wide:   '0.02em',  // 标签/按钮
    },
  },

  // ---------- 动效系统 ----------
  motion: {
    duration: {
      instant:  80,    // 颜色切换
      fast:     120,   // 按钮反馈/按压态
      normal:   200,   // 状态切换/卡片反馈
      slow:     250,   // 页面转场（原 350ms，加速至 250ms 更干脆）
      slower:   350,   // 复杂动画
      slowest:  600,   // 弹性动画/欢迎动画
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

  // ---------- 布局（4px 网格系统） ----------
  layout: {
    maxWidth:     375,   // 设计稿基准宽度（px，参考图 6.1 寸设备）
    pagePadding:  32,    // 页面水平边距（16px）
    cardPadding:  32,    // 卡片内边距（16px，参考图）
    sectionGap:   24,    // 区块间距（12px，参考图）
    safeBottom:   34,    // 底部安全区（iPhone X+）
    safeTop:      44,    // 顶部安全区
    gridUnit:     4,     // 基础网格单位（4px）
    borderRadius: {
      card:    16,       // 卡片圆角（参考图 16px）
      section: 16,       // 区块容器圆角
      button:  24,       // 胶囊按钮（参考图 24px）
      tag:     12,       // 标签圆角（参考图 12px）
      input:   12,       // 输入框圆角（md）
      modal:   24,       // 弹层圆角（参考图 24px）
    },
  },

  // ---------- 组件特定 Token ----------
  component: {
    button: {
      height: {
        sm: 48,   // 参考图按钮高度
        md: 48,
        lg: 56,
      },
      radius: 24,  // 胶囊按钮（参考图 24px）
    },
    card: {
      radius:      16,  // 卡片圆角（参考图 16px）
      padding:     32,  // 16px 内边距（参考图）
      radiusInner: 12,  // 内部小卡片（md）
      radiusMicro: 8,   // 微卡片/课程块（sm）
    },
    avatar: {
      xs: 32,   // 对方气泡头像
      sm: 40,   // 卡片头像
      md: 48,   // 列表头像
      lg: 64,   // 个人中心头像
      xl: 80,   // 大头像
    },
    input: {
      height: 44,   // 输入框高度
      radius: 12,   // 输入框圆角（参考图 12px）
    },
    tabBar: {
      height: 49,   // TabBar 高度（参考图 49px）
      iconSize: 24, // 图标大小
      iconWrapSize: 32,
      iconWrapActiveSize: 48,
    },
    tag: {
      height: 32,
      radius: 12,      // 标签圆角（参考图 12px）
      radiusPill: 24,  // 胶囊标签（参考图 24px）
      paddingX: 12,
    },
    statusBadge: {
      height: 18,    // 状态徽章高度（参考图）
      radius: 4,     // 徽章圆角（参考图）
      fontSize: 10,  // 徽章字号
    },
  },
} as const;

// ---------- 主题切换支持 ----------
export type ThemeMode = 'light' | 'dark' | 'warm';

export const darkThemeTokens = {
  ...designTokens,
  color: {
    ...designTokens.color,
    bg: {
      page:      '#0E1116',  // 深色页面背景（参考图）
      container: '#1A1F26',  // 深色卡片背景（参考图）
      surface:   '#222831',
      overlay:   'rgba(0, 0, 0, 0.65)',
      brand:     '#15744A',  // 深色品牌背景
      secondary: '#15744A',
      accent:    '#65200D',
      dark:      '#0E1116',
      darkCard:  '#1A1F26',
    },
    border: {
      light:   '#222831',  // 深色分隔线（参考图）
      default: '#334155',
      strong:  '#475569',
      dark:    '#222831',
    },
    neutral: {
      ...designTokens.color.neutral,
    },
    text: {
      primary:    '#F0F2F5',  // 深色模式主文本
      secondary:  '#B8BEC8',
      tertiary:   '#8A92A0',
      quaternary: '#5A6270',
      inverse:    '#1A1F26',
      brand:      '#3FCF8E',  // 深色模式品牌色
      link:       '#2DB97A',
    },
    // 深色模式消息气泡
    bubble: {
      other:  '#222831',  // 对方气泡背景
      self:   '#3FCF8E',  // 自己气泡背景
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
      surface:   '#FFF1EB',
      overlay:   'rgba(60, 30, 20, 0.45)',
      brand:     '#E8F8F0',
      secondary: '#D1F0E0',
      accent:    '#FFF7ED',
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
