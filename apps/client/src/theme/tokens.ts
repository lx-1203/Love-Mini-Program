export const designTokens = {
  color: {
    brand1: "#eff6ff",
    brand2: "#dbeafe",
    brand3: "#bfdbfe",
    brand6: "#2563eb",
    brand7: "#1d4ed8",
    success: "#0f766e",
    warning: "#b45309",
    error: "#be123c",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textPlaceholder: "#94a3b8",
    bgPage: "#f4f7fb",
    bgContainer: "#ffffff",
    bgSurface: "#e2e8f0",
    border: "#dbe2ea",
  },
  radius: {
    small: 8,
    medium: 12,
    large: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  shadow: {
    soft: "0 10px 30px rgba(15, 23, 42, 0.06)",
    raised: "0 18px 40px rgba(15, 23, 42, 0.08)",
  },
  typography: {
    titleLg: 28,
    titleMd: 20,
    bodyMd: 14,
    bodySm: 12,
  },
  motion: {
    fast: 160,
    base: 240,
  },
  zIndex: {
    modal: 1000,
  },
} as const;
