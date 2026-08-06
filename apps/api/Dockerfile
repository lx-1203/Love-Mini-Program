# ============================================================
# Campus Love API Dockerfile（Task 8.1.1）
# ============================================================
# 多阶段构建：
#   Stage 1 (builder)：Maven 编译打包，产出可执行 jar
#   Stage 2 (runtime)：JRE 17 极简运行时，仅复制 jar 与必要资源
#
# 基础镜像：
#   - builder: eclipse-temurin:17-jdk（含 Maven 与 JDK）
#   - runtime: eclipse-temurin:17-jre（仅 JRE，镜像体积更小）
#
# 优化点：
#   1. 分层打包（spring-boot-maven-plugin layers）：依赖未变更时复用 Docker 缓存
#   2. .m2 缓存卷：加速重复构建
#   3. 非 root 用户运行：降低容器逃逸风险
#   4. JVM 参数通过 JAVA_OPTS 注入，支持 GC/堆内存调优
#   5. 健康检查通过 /actuator/health 端点
# ============================================================

# ---------- Stage 1: Builder ----------
# 镜像版本固定（infra #31）：pin 到具体小版本，禁止浮点 tag
FROM eclipse-temurin:17.0.12-jdk AS builder

WORKDIR /build

# 复制 Maven Wrapper 与 pom.xml，先解析依赖（利用 Docker 缓存）
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn .mvn

# 复制源码（src 目录）
COPY src ./src

# 构建可执行 jar，跳过测试（CI 已执行过测试）
# 只保留 -DskipTests（infra #43：-DskipTests 与 -Dmaven.test.skip=true 重复，
# 两者均跳过测试；-DskipTests 仍编译测试代码，便于 IDE/CI 复用编译产物）
RUN chmod +x mvnw && \
    ./mvnw clean package -DskipTests

# 列出分层（用于 Stage 2 按层 COPY，提升缓存命中率）
RUN java -Djarmode=layertools -jar target/*.jar list --verbose

# ---------- Stage 2: Runtime ----------
# 镜像版本固定（infra #31）：pin 到具体小版本，禁止浮点 tag
FROM eclipse-temurin:17.0.12-jre AS runtime

LABEL org.opencontainers.image.title="campus-love-api" \
      org.opencontainers.image.description="Campus Love backend API" \
      org.opencontainers.image.source="https://github.com/campuslove/api" \
      org.opencontainers.image.licenses="MIT"

# 安装 dumb-init：作为 PID 1 进程，正确处理信号转发（SIGTERM 等）
# curl：用于容器内健康检查调试
# tini 已被 dumb-init 替代；如需更小镜像可使用 eclipse-temurin:17-jre-alpine
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        dumb-init \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# 创建非 root 用户运行应用
RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app

WORKDIR /app

# 复制分层 jar（按层 COPY，依赖未变更时复用 Docker 缓存）
# 通过 jarmode=layertools extract 拆分为 dependencies/spring-boot-loader/snapshot-dependencies/application
COPY --from=builder /build/target/*.jar /tmp/app.jar
RUN mkdir -p /app && \
    cd /app && \
    java -Djarmode=layertools -jar /tmp/app.jar extract --destination /app && \
    rm /tmp/app.jar

# 创建日志与上传目录（运行时写入）
RUN mkdir -p /app/logs /app/uploads && \
    chown -R app:app /app

USER app

# 暴露应用端口（HTTP）
EXPOSE 8080

# JVM 参数：堆内存、GC、容器感知
# -XX:+UseContainerSupport：启用容器感知（JDK 10+ 默认开启）
# -XX:MaxRAMPercentage=75.0：容器内存的 75% 作为堆上限（避免 OOM Killer）
# -XX:+UseG1GC：G1 收集器，适合多核服务端
# -XX:+HeapDumpOnOutOfMemoryError：OOM 时自动 dump
# -Djava.security.egd=file:/dev/./urandom：加速 SecureRandom 初始化
ENV JAVA_OPTS="-XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:InitialRAMPercentage=50.0 \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200 \
    -XX:+HeapDumpOnOutOfMemoryError \
    -XX:HeapDumpPath=/app/logs/heap-dump.hprof \
    -Djava.security.egd=file:/dev/./urandom \
    -Dfile.encoding=UTF-8 \
    -Duser.timezone=Asia/Shanghai"

# Spring 配置：默认 real profile，可通过 SPRING_PROFILES_ACTIVE 覆盖
ENV SPRING_PROFILES_ACTIVE=real \
    APP_PORT=8080 \
    APP_LOGGING_PATH=/app/logs \
    APP_MEDIA_STORAGE_ROOT=/app/uploads

# 健康检查：每 30s 调用 /actuator/health，超时 5s，启动等待 60s
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8080/actuator/health || exit 1

# dumb-init 作为 PID 1，正确转发信号
ENTRYPOINT ["dumb-init", "--"]

# 启动命令：从分层目录加载，提升启动速度
CMD ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]

# ---------- Stage 3: Trivy 漏洞扫描（Task 24，中间步骤）----------
# 说明：此 stage 仅用于 CI 构建期漏洞扫描，不会进入最终运行镜像。
#   - 构建生产镜像：docker build --target runtime -t campus-love/api:latest .
#   - 单独触发扫描：docker build --target trivy-scanner .
# 扫描范围：builder 阶段产出的 jar 与依赖
# 退出策略：发现 HIGH/CRITICAL 漏洞时 exit-code=1，构建失败
# 镜像版本固定（infra 补充）：禁止 latest 浮点 tag
FROM aquasec/trivy:0.53.0 AS trivy-scanner

WORKDIR /scan

# 复制 builder 阶段产出的可执行 jar（含全部依赖）到扫描目录
COPY --from=builder /build/target/*.jar /scan/app.jar

# Trivy 文件系统扫描：HIGH+CRITICAL 级别漏洞，命中即失败
RUN trivy fs --severity HIGH,CRITICAL --exit-code 1 /scan
