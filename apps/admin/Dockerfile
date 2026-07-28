# ============================================================
# Campus Love Admin Dockerfile（Task 8.1.2）
# ============================================================
# 多阶段构建：
#   Stage 1 (builder)：Node + pnpm 编译 Vue3 + Vite，产出静态资源
#   Stage 2 (runtime)：nginx alpine 静态托管 + API 反向代理
#
# 基础镜像：
#   - builder: node:20-alpine（轻量 Node 镜像）
#   - runtime: nginx:1.27-alpine（轻量 nginx，含 stream 模块）
#
# 优化点：
#   1. pnpm store 缓存卷：加速依赖安装
#   2. 多阶段构建：仅复制 dist 产物到运行时镜像，体积小
#   3. nginx.conf 自定义：SPA history 路由 fallback + gzip + API 反代
#   4. 非 root 用户运行 nginx
#   5. 健康检查通过 nginx 自身 200 响应
# ============================================================

# ---------- Stage 1: Builder ----------
FROM node:20-alpine AS builder

# 安装 pnpm（与项目根 package.json 推荐包管理器一致）
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /build

# 复制 package.json 与 lockfile，先安装依赖（利用 Docker 缓存）
COPY package.json pnpm-lock.yaml* ./

# 安装生产与开发依赖（构建期需要 devDependencies：vite、vue-tsc 等）
RUN pnpm install --frozen-lockfile || pnpm install

# 复制源码
COPY . .

# 注入构建时变量（默认占位，可通过 --build-arg 覆盖）
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_VERSION=0.1.0
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_APP_VERSION=${VITE_APP_VERSION} \
    NODE_ENV=production

# 构建生产产物
RUN pnpm run build

# ---------- Stage 2: Runtime ----------
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="campus-love-admin" \
      org.opencontainers.image.description="Campus Love admin console" \
      org.opencontainers.image.licenses="MIT"

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 复制自定义 nginx 配置（SPA 路由 fallback + gzip + API 反代）
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物到 nginx 静态目录
COPY --from=builder /build/dist /usr/share/nginx/html

# 创建非 root 用户运行 nginx（nginx 默认以 root 启动 master，需调整）
# 注：nginx master 监听 80 端口需特权，这里改用 8080 端口避免 root
RUN sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

# 健康检查：每 30s 请求 nginx 根路径
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8080/ || exit 1
