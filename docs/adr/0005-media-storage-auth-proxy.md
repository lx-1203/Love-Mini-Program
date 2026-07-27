# ADR-0005: 媒体存储方案 - 本地分片 + 鉴权代理

- **Status**: Accepted
- **Date**: 2026-07-26
- **Deciders**: 安全组、架构组、后端 Lead
- **Tags**: security, media, storage, auth-proxy

---

## Context and Problem Statement

校园恋爱小程序涉及大量用户媒体上传：

- 用户头像、相册（最多 6 张）
- 帖子图片、视频
- 校园话题配图
- 聊天图片、语音消息
- AI 视频生成

预估存储量：

- 单用户平均 5MB（头像 + 相册 + 帖子）
- 50 万用户 → 2.5TB
- 加上聊天媒体 → 总计 ~5TB/年

需求与挑战：

1. **隐私保护**：用户私密照片不可被未授权访问
2. **性能**：图片加载 ≤ 500ms
3. **存储成本**：5TB/年，本地 vs 对象存储成本对比
4. **带宽成本**：每月 ~10TB 流量
5. **管理便捷**：上传、删除、备份流程清晰

特别地，早期版本（P0 前）将 `/uploads/**` 设为 `permitAll`，导致用户私密照片可被任意人通过 URL 猜测访问，这是严重的安全漏洞。

---

## Decision Drivers

- **隐私合规**：满足《个人信息保护法》对生物识别信息（人脸）的保护要求
- **未授权访问防御**：URL 不可猜测，必须鉴权
- **性能要求**：图片加载 ≤ 500ms（含鉴权）
- **成本可控**：本地存储 + CDN 加速 vs 纯对象存储
- **运维便捷**：备份、迁移、删除流程清晰

---

## Considered Options

### 方案 A：本地分片存储 + 鉴权代理（**选定**）

- 文件路径：`uploads/{userId}/{yyyyMM}/{uuid}.{ext}`
- API 端点：`GET /api/v1/media/{userId}/{path}` 需 JWT 鉴权
- 鉴权逻辑：用户只能访问自己的文件，Admin 可访问所有
- 路径安全：防 Path Traversal（`..`、`%2e%2e` 等）

### 方案 B：阿里云 OSS / 腾讯云 COS

- 优势：弹性存储、CDN 加速、生命周期管理
- 劣势：成本高（5TB/年 ≈ 1.2 万元/年）、需预签名 URL

### 方案 C：本地直连（无鉴权）

- 优势：性能最优
- 劣势：安全漏洞（早期版本的问题）

### 方案 D：MinIO 自建对象存储

- 优势：兼容 S3 协议、自控数据
- 劣势：运维复杂度高、需额外部署

---

## Pros and Cons of the Options

### 方案 A（本地分片 + 鉴权代理）

| 优点 | 缺点 |
|------|------|
| ✅ 鉴权严格，未授权无法访问 | ❌ 鉴权增加 ~10ms 延迟 |
| ✅ 路径分片便于备份迁移 | ❌ 本地磁盘容量有限 |
| ✅ 无外部依赖 | ❌ 需自建 CDN（或用 Nginx 缓存） |
| ✅ 成本低（仅磁盘费用） | ❌ 横向扩展时需共享存储 |
| ✅ 数据自主可控 | |

### 方案 B（OSS / COS）

| 优点 | 缺点 |
|------|------|
| ✅ 弹性存储，无容量上限 | ❌ 成本高（5TB/年 1.2 万元） |
| ✅ CDN 加速，全国访问快 | ❌ 数据在第三方 |
| ✅ 生命周期管理自动化 | ❌ 需预签名 URL，复杂度增加 |
| ✅ 跨区域复制 | ❌ 上传需走 OSS API，非应用服务器 |

### 方案 C（本地直连无鉴权）

| 优点 | 缺点 |
|------|------|
| ✅ 性能最优 | ❌ 严重安全漏洞 |
| ✅ 实现简单 | ❌ 不合规 |
| | ❌ 不可用于生产 |

### 方案 D（MinIO 自建）

| 优点 | 缺点 |
|------|------|
| ✅ 兼容 S3 协议 | ❌ 运维复杂度高 |
| ✅ 数据自主 | ❌ 需额外部署集群 |
| ✅ 弹性扩展 | ❌ 当前规模过度设计 |

---

## Decision

**选定方案 A：本地分片存储 + 鉴权代理**

### 详细设计

#### 文件路径规范

```
uploads/
├── {userId}/
│   ├── {yyyyMM}/
│   │   ├── {uuid}.{ext}        # 头像/相册
│   │   ├── {uuid}.{ext}        # 帖子图
│   │   └── {uuid}.{ext}        # 聊天图
│   └── {yyyyMM}/
│       └── ...
├── {userId}/
└── ...
```

示例：`uploads/12345/202607/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`

#### 上传流程

```
[客户端] 选择图片 → uni.uploadFile
    ↓
[Filter] JWT 鉴权 + 隐私授权检查
    ↓
[Controller] MediaUploadController.upload()
    ↓
[Service] LocalMediaStorageService.store()
    ├── 校验 MIME + magic bytes
    ├── 生成 UUID 文件名
    ├── 按用户/年月分片存储
    └── 返回相对路径 /uploads/12345/202607/uuid.jpg
    ↓
[Controller] 返回 {url: '/api/v1/media/12345/202607/uuid.jpg'}
    ↓
[客户端] 后续通过鉴权代理 URL 访问
```

#### 访问流程（鉴权代理）

```
[客户端] GET /api/v1/media/12345/202607/uuid.jpg
    ↓
[Filter] JWT 鉴权
    ↓
[Controller] MediaAccessController.getMedia()
    ├── 校验 Path Traversal
    ├── 校验文件归属（userId == 当前用户 or Admin）
    ├── 设置 Content-Type
    └── 流式返回文件内容
    ↓
[客户端] 渲染图片
```

#### 安全防护

| 威胁 | 防护措施 |
|------|----------|
| 未授权访问 | JWT 鉴权 + 文件归属校验 |
| Path Traversal | 拒绝 `..`、`%2e%2e`、绝对路径 |
| 文件类型伪造 | MIME + magic bytes 双重校验 |
| 大文件 DoS | 限制单文件 ≤ 10MB（图片）/ 50MB（视频） |
| 恶意文件名 | 服务端生成 UUID，不使用客户端文件名 |
| 跨用户访问 | 路径中 userId 必须等于当前用户 |

#### MIME 与 magic bytes 校验

```java
private static final Map<String, byte[]> MAGIC_BYTES = Map.of(
    "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},
    "image/png",  new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47},
    "image/gif",  new byte[]{0x47, 0x49, 0x46, 0x38},
    "image/webp", new byte[]{0x52, 0x49, 0x46, 0x46},  // RIFF
    "video/mp4",  new byte[]{0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70},
    "video/webm", new byte[]{0x1A, 0x45, 0xDF, (byte) 0xA3}
);

private void validateMagicBytes(byte[] fileContent, String contentType) {
    byte[] expected = MAGIC_BYTES.get(contentType);
    if (expected == null) throw new InvalidFileTypeException();
    for (int i = 0; i < expected.length; i++) {
        if (fileContent[i] != expected[i]) {
            throw new InvalidFileTypeException("Magic bytes mismatch");
        }
    }
}
```

#### 客户端适配

客户端通过 `utils/media.ts` 的 `resolveMediaUrl()` 统一将相对路径转为鉴权代理 URL：

```typescript
// utils/media.ts
export function resolveMediaUrl(path: string | undefined | null): string {
  if (!path) return '/static/placeholder.png';
  if (path.startsWith('http')) return path;  // 已是绝对 URL
  if (path.startsWith('/api/v1/media/')) return `${API_BASE}${path}`;
  // 兼容老路径 /uploads/...
  return `${API_BASE}/api/v1/media${path.replace('/uploads', '')}`;
}
```

已接入的 14 个组件/页面：Avatar/SafeImage/PersonCard/WallPostCard/ChatBubble/album/CardSwiper/village/tag-posts/village/index/village/detail/campus/topic-detail/circles/topic-detail/circles/topics/home/index/likes/index/profile/visitors/profile/index

#### 备份策略

- 本地磁盘 → 每日 rsync 到异地
- 异地保留 4 周
- 用户删除文件后，30 天内仍可恢复（软删除）

#### 未来演进

- 当存储量 > 5TB 时，迁移到 OSS / COS
- 迁移策略：
  - 新上传直接走 OSS
  - 老文件后台异步迁移
  - 客户端透明（URL 由后端动态生成）

---

## Consequences

### 正面后果

- **安全合规**：用户私密文件不可被未授权访问
- **路径分片**：备份、迁移、清理便捷
- **成本可控**：仅磁盘费用（5TB ≈ 1000 元/年）
- **数据自主**：所有数据在自有服务器

### 负面后果

- **鉴权延迟**：每次访问增加 ~10ms
- **磁盘容量**：需定期扩容
- **CDN 缺失**：跨地域访问慢（暂用 Nginx 缓存）
- **横向扩展受限**：多实例需共享存储（NFS 或迁移 OSS）

### 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 磁盘故障导致文件丢失 | 每日异地备份 + RAID 10 |
| 鉴权性能瓶颈 | Nginx 缓存层（已鉴权 URL 缓存 5min） |
| 跨地域访问慢 | 未来接入 CDN（CDN 回源时携带签名） |
| 磁盘满 | 监控告警 + 自动清理 30 天前软删除文件 |
| Path Traversal | 严格路径校验 + 单元测试覆盖 |

---

## Compliance Note

- 满足《个人信息保护法》对生物识别信息（人脸）的特别保护
- 文件路径不暴露用户真实信息（使用 UUID）
- 删除账号时联动删除所有媒体文件（30 天宽限期）
- 鉴权日志记录所有访问行为，保留 6 个月

---

## Related Documents

- [ADR-0002: 认证方案](./0002-authentication-jwt-wechat.md)
- [ADR-0010: 部署方案](./0010-deployment-docker-compose.md)
- 实现代码：
  - `apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java`
  - `apps/api/src/main/java/com/campuslove/api/media/MediaAccessService.java`
  - `apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java`
- 客户端：`apps/client/src/utils/media.ts`

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-07-26 | 首次提议（替代早期无鉴权方案） | 安全组 |
| 2026-07-26 | 评审通过 | 架构组 |
