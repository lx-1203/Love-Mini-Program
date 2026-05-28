export const designTokens = {
  color: {
    // 品牌色 - 校园蓝
    brand1: "#eff6ff",
    brand2: "#dbeafe",
    brand3: "#bfdbfe",
    brand4: "#93c5fd",
    brand5: "#60a5fa",
    brand6: "#2563eb",
    brand7: "#1d4ed8",
    brand8: "#1e40af",
    brand9: "#1e3a8a",

    // 语义色
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",

    // 文本色 - 现代灰阶
    textPrimary: "#1e293b",
    textSecondary: "#64748b",
    textPlaceholder: "#94a3b8",
    textDisabled: "#cbd5e1",

    // 背景色
    bgPage: "#f8fafc",
    bgContainer: "#ffffff",
    bgSurface: "#f1f5f9",
    bgSecondary: "#e2e8f0",

    // 边框
    border: "#e2e8f0",
    borderLight: "#f1f5f9",
  },
  radius: {
    small: 8,
    medium: 12,
    large: 16,
    xl: 24,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 40,
  },
  shadow: {
    sm: "0 1px 3px rgba(37, 99, 235, 0.06), 0 1px 2px rgba(37, 99, 235, 0.04)",
    base: "0 4px 12px rgba(37, 99, 235, 0.08), 0 2px 4px rgba(37, 99, 235, 0.04)",
    lg: "0 8px 24px rgba(37, 99, 235, 0.10), 0 4px 8px rgba(37, 99, 235, 0.06)",
    soft: "0 10px 30px rgba(15, 23, 42, 0.06)",
    raised: "0 18px 40px rgba(15, 23, 42, 0.08)",
  },
  typography: {
    titleLg: 32,
    titleMd: 24,
    titleSm: 20,
    bodyMd: 16,
    bodySm: 14,
    caption: 12,
  },
  motion: {
    fast: 160,
    base: 240,
    slow: 400,
  },
  zIndex: {
    modal: 1000,
  },
} as const;
