package com.campuslove.api.dto;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * DTO 转换器（MapStruct 风格，静态方法实现）。
 *
 * <p>本类负责 Entity -&gt; DTO 的单向映射，是 Service 层与 Controller 层之间的
 * "数据隔离屏障"。所有从 Service 返回的 Entity 在交给 Controller 之前，
 * 必须经由此处的方法转换为 DTO，确保敏感字段不外泄、关联对象不懒加载。</p>
 *
 * <p><strong>实现说明：</strong>
 * 采用静态方法而非 MapStruct 注解接口，避免引入 MapStruct 编译期依赖与
 * annotation processor 配置，降低构建复杂度。所有方法均为无状态纯函数，
 * 线程安全。</p>
 *
 * <p><strong>时间类型转换：</strong>
 * Entity 使用 {@link LocalDateTime}（数据库本地时间），
 * DTO 使用 {@link Instant}（UTC），通过 {@link #toInstant(LocalDateTime)} 统一转换，
 * 时区显式指定 {@link com.campuslove.api.common.TimeZones#BUSINESS}（Asia/Shanghai，
 * R4-00293 修复：与 DB serverTimezone 对齐，避免 JVM 默认时区漂移导致时间偏移 8 小时）。</p>
 *
 * <p><strong>敏感字段脱敏：</strong>
 * 涉及 openid、手机号、邮箱等敏感字段的映射，必须调用
 * {@link MaskingUtils} 的对应方法，禁止直接拷贝原始值。</p>
 *
 * <p><strong>关于 Match / Message 实体：</strong>
 * 当前项目尚不存在独立的 {@code Match} 实体（匹配关系以 {@code HeartSignal} 等形式存储），
 * 因此 {@link #toMatchDto} 方法暂未提供；待 Match 实体引入后再补全。
 * {@link #toMessageDto(PrivateMessage)} 以 {@link PrivateMessage} 作为最接近的消息源实体进行映射。</p>
 *
 * @since 2026-07-26
 */
public final class DtoMapper {

    /** 静态 ObjectMapper 实例（Jackson 保证配置完成后的线程安全性） */
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /** 私有构造方法，防止实例化 */
    private DtoMapper() {
        throw new UnsupportedOperationException("DTO 转换器不可实例化");
    }

    // ------------------------------------------------------------------
    // User 相关映射
    // ------------------------------------------------------------------

    /**
     * 将 {@link User} 实体转换为完整的 {@link UserDto}。
     *
     * <p>openid 字段经 {@link MaskingUtils#maskOpenid(String)} 脱敏后填入。
     * 性别、年龄、学校、认证、VIP 等关联字段不在 User 实体内，
     * 本方法仅填充 User 主表字段，关联字段保留为 {@code null}，
     * 由调用方按需通过 {@link #fillUserRelatedFields} 等方法补充。</p>
     *
     * @param entity 用户实体，null 时返回 null
     * @return 脱敏后的 UserDto
     */
    public static UserDto toUserDto(User entity) {
        if (entity == null) {
            return null;
        }
        UserDto dto = new UserDto();
        dto.setId(entity.getId());
        // 敏感字段强制脱敏
        dto.setOpenid(MaskingUtils.maskOpenid(entity.getOpenid()));
        dto.setNickname(entity.getNickname());
        dto.setAvatarUrl(entity.getAvatarUrl());
        dto.setBio(entity.getBio());
        // isVerified / isVip / gender / age / schoolId / schoolName / college / major / enrollmentYear / tags
        // 均来源于关联实体，此处保持 null，由调用方按需补充
        dto.setCreatedAt(toInstant(entity.getCreatedAt()));
        dto.setUpdatedAt(toInstant(entity.getUpdatedAt()));
        return dto;
    }

    /**
     * 将 {@link User} 实体转换为轻量版 {@link UserBriefDto}，
     * 用于列表场景下的作者/匹配对象展示。
     *
     * @param entity 用户实体，null 时返回 null
     * @return 用户简要 DTO
     */
    public static UserBriefDto toUserBriefDto(User entity) {
        if (entity == null) {
            return null;
        }
        // isVerified / isVip 不在 User 主表，暂以 null 占位
        return new UserBriefDto(
                entity.getId(),
                entity.getNickname(),
                entity.getAvatarUrl(),
                null,
                null
        );
    }

    // ------------------------------------------------------------------
    // Post 相关映射
    // ------------------------------------------------------------------

    /**
     * 将 {@link Post} 实体转换为 {@link PostDto}，附带作者信息与聚合计数。
     *
     * <p>{@code images} 和 {@code tags} 字段在 Entity 中以 JSON 字符串存储，
     * 本方法负责解析为 {@code List<String>}；解析失败时降级为空列表，不影响主流程。</p>
     *
     * @param entity        帖子实体
     * @param author        作者用户实体（可为 null，如作者已注销）
     * @param likeCount     点赞数（外部聚合，避免 Mapper 触发懒加载）
     * @param commentCount  评论数（外部聚合）
     * @return PostDto，entity 为 null 时返回 null
     */
    public static PostDto toPostDto(Post entity, User author, long likeCount, long commentCount) {
        if (entity == null) {
            return null;
        }
        PostDto dto = new PostDto();
        dto.setId(entity.getId());
        dto.setAuthor(toUserBriefDto(author));
        dto.setContent(entity.getContent());
        dto.setImages(parseStringList(entity.getImages()));
        dto.setTags(parseStringList(entity.getTags()));
        dto.setLikeCount(likeCount);
        dto.setCommentCount(commentCount);
        // circleName 来源于关联的 InterestCircle 实体，此处保持 null
        dto.setCircleName(null);
        dto.setCreatedAt(toInstant(entity.getCreatedAt()));
        dto.setUpdatedAt(toInstant(entity.getUpdatedAt()));
        return dto;
    }

    // ------------------------------------------------------------------
    // Match 相关映射
    // ------------------------------------------------------------------

    // /**
    //  * 将 Match 实体转换为 {@link MatchDto}。
    //  *
    //  * <p><strong>注意：</strong>当前项目中尚不存在独立的 {@code Match} 实体，
    //  * 匹配关系暂以 {@code HeartSignal} 等形式存储。本方法签名预留，
    //  * 待 Match 实体引入后实现。</p>
    //  *
    //  * @param entity              匹配关系实体
    //  * @param partner             匹配对方用户实体
    //  * @param lastMessagePreview  最近一条消息预览文本
    //  * @param unreadCount         未读消息数
    //  * @return MatchDto
    //  */
    // public static MatchDto toMatchDto(Match entity, User partner,
    //                                   String lastMessagePreview, int unreadCount) {
    //     if (entity == null) {
    //         return null;
    //     }
    //     MatchDto dto = new MatchDto();
    //     dto.setId(entity.getId());
    //     dto.setPartner(toUserBriefDto(partner));
    //     dto.setMatchedAt(toInstant(entity.getMatchedAt()));
    //     dto.setLastMessageAt(toInstant(entity.getLastMessageAt()));
    //     dto.setLastMessagePreview(lastMessagePreview);
    //     dto.setUnreadCount(unreadCount);
    //     return dto;
    // }

    // ------------------------------------------------------------------
    // Message 相关映射
    // ------------------------------------------------------------------

    /**
     * 将 {@link PrivateMessage} 实体转换为 {@link MessageDto}。
     *
     * <p>PrivateMessage 是当前项目中最接近统一 Message 概念的实体，
     * 其 {@code messageKind} 字段映射到 {@link MessageDto#getType()}，
     * {@code deliveryStatus} 映射到 {@link MessageDto#getStatus()}。</p>
     *
     * <p>attachments 字段在 PrivateMessage 中以 quoteContext（JSON 字符串）形式存在，
     * 本方法将其解析为 {@code Map<String, Object>}；解析失败时设为 null。</p>
     *
     * @param entity 私信实体
     * @return 消息 DTO，entity 为 null 时返回 null
     */
    public static MessageDto toMessageDto(PrivateMessage entity) {
        if (entity == null) {
            return null;
        }
        MessageDto dto = new MessageDto();
        dto.setId(entity.getId());
        // sessionId 取自关联的 PrivateConversation，为避免懒加载仅设 null，由调用方补充
        dto.setSessionId(null);
        dto.setSenderId(entity.getSenderId());
        dto.setType(entity.getMessageKind());
        dto.setContent(entity.getContent());
        dto.setAttachments(parseStringToMap(entity.getQuoteContext()));
        dto.setSentAt(toInstant(entity.getCreatedAt()));
        // PrivateMessage 仅记录 isRead 布尔值，无独立的 deliveredAt/readAt 时间戳
        dto.setDeliveredAt(null);
        dto.setReadAt(null);
        dto.setStatus(entity.getDeliveryStatus());
        dto.setCreatedAt(toInstant(entity.getCreatedAt()));
        dto.setUpdatedAt(toInstant(entity.getCreatedAt()));
        return dto;
    }

    // ------------------------------------------------------------------
    // 批量转换
    // ------------------------------------------------------------------

    /**
     * 批量转换 Entity 列表为 DTO 列表（泛型方法）。
     *
     * <p>调用方传入单条转换函数（如 {@code DtoMapper::toUserDto}），
     * 本方法遍历列表逐条转换，自动跳过 null 元素。</p>
     *
     * <p>示例：
     * <pre>{@code
     * List<UserDto> dtos = DtoMapper.toDtoList(users, DtoMapper::toUserDto);
     * }</pre>
     * </p>
     *
     * @param list      源列表，null 时返回空列表
     * @param converter 单条转换函数
     * @param <T>       源类型
     * @param <R>       目标类型
     * @return 转换后的列表（不为 null）
     */
    public static <T, R> List<R> toDtoList(List<T> list, Function<T, R> converter) {
        if (list == null || list.isEmpty()) {
            return Collections.emptyList();
        }
        return list.stream()
                .filter(java.util.Objects::nonNull)
                .map(converter)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    // ------------------------------------------------------------------
    // 内部工具方法
    // ------------------------------------------------------------------

    /**
     * LocalDateTime -&gt; Instant 转换（R4-00293：显式使用业务时区 Asia/Shanghai，
     * 与 DB serverTimezone 对齐，不依赖 JVM 默认时区）。
     *
     * @param ldt 待转换时间，null 时返回 null
     * @return UTC Instant
     */
    private static Instant toInstant(LocalDateTime ldt) {
        if (ldt == null) {
            return null;
        }
        return ldt.atZone(TimeZones.BUSINESS).toInstant();
    }

    /**
     * 将 JSON 字符串解析为 {@code List<String>}，解析失败返回空列表。
     * 用于 Post.images / Post.tags 等字段的反序列化。
     *
     * @param json JSON 字符串
     * @return 字符串列表（不为 null）
     */
    private static List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            List<String> result = OBJECT_MAPPER.readValue(json, new TypeReference<List<String>>() {});
            return result != null ? result : Collections.emptyList();
        } catch (JsonProcessingException e) {
            // 解析失败降级为空列表，避免阻断主流程
            return Collections.emptyList();
        }
    }

    /**
     * 将 JSON 字符串解析为 {@code Map<String, Object>}，解析失败返回 null。
     * 用于 PrivateMessage.quoteContext 等字段的反序列化。
     *
     * @param json JSON 字符串
     * @return Map（解析失败或空串时为 null）
     */
    private static Map<String, Object> parseStringToMap(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
