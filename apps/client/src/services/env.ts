const env = import.meta.env;

export const appEnv = {
  apiBaseUrl: env.VITE_API_BASE_URL || "http://127.0.0.1:8080/api",
  apiMode: env.VITE_API_MODE === "real" ? "real" : "mock",
} as const;
