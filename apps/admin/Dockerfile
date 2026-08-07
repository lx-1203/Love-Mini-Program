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
FROM node:20.15.0-alpine AS builder

# 安装 pnpm（与项目根 package.json packageManager 字段一致：pnpm@11.17.0）
# 版本固定（infra #35），避免与仓库锁定的包管理器漂移
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate

WORKDIR /build

# 构建上下文为仓库根（docker-compose.yml 中 context 已改为 "."）：
# apps/admin 目录本身没有 lockfile，pnpm-lock.yaml / pnpm-workspace.yaml 位于仓库根，
# 必须从仓库根复制并以 workspace 模式安装，才能使用 --frozen-lockfile 锁定版本。
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/admin/package.json apps/admin/package.json

# 安装生产与开发依赖（构建期需要 devDependencies：vite、vue-tsc 等）
# workspace 模式下仅安装仓库中实际存在的子包（apps/admin）；
# 强制 --frozen-lockfile：lockfile 与 package.json 不一致时构建失败而非静默回退（infra #36）
RUN pnpm install --frozen-lockfile

# 复制 admin 源码（其余 workspace 子包不复制，减小构建上下文）
COPY apps/admin/ ./apps/admin/

# 注入构建时变量（默认占位，可通过 --build-arg 覆盖）
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_VERSION=0.1.0
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_APP_VERSION=${VITE_APP_VERSION} \
    NODE_ENV=production

# 构建生产产物（在 admin 包目录内执行，vite 按 apps/admin 根目录解析配置）
WORKDIR /build/apps/admin
RUN pnpm run build

# ---------- Stage 2: Runtime ----------
FROM nginx:1.27.3-alpine AS runtime

LABEL org.opencontainers.image.title="campus-love-admin" \
      org.opencontainers.image.description="Campus Love admin console" \
      org.opencontainers.image.licenses="MIT"

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 复制自定义 nginx 配置（SPA 路由 fallback + gzip + API 反代）
# 注意：构建上下文已改为仓库根，nginx.conf 位于 apps/admin/docker/ 下
COPY apps/admin/docker/nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物到 nginx 静态目录（builder 在 /build/apps/admin 下构建）
COPY --from=builder /build/apps/admin/dist /usr/share/nginx/html

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

# ---------- Stage 3: Trivy 漏洞扫描（Task 24，中间步骤）----------
# 说明：此 stage 仅用于 CI 构建期漏洞扫描，不会进入最终运行镜像。
#   - 构建生产镜像：docker build --target runtime -t campus-love/admin:latest .
#   - 单独触发扫描：docker build --target trivy-scanner .
# 扫描范围：builder 阶段产出的 nginx 静态文件目录（dist）
# 退出策略：发现 HIGH/CRITICAL 漏洞时 exit-code=1，构建失败
# 镜像版本固定（infra 补充）：禁止 latest 浮点 tag
FROM aquasec/trivy:0.53.0 AS trivy-scanner

WORKDIR /scan

# 复制 builder 阶段产出的静态资源到扫描目录
COPY --from=builder /build/apps/admin/dist /scan/dist

# Trivy 文件系统扫描：HIGH+CRITICAL 级别漏洞，命中即失败
RUN trivy fs --severity HIGH,CRITICAL --exit-code 1 /scan
