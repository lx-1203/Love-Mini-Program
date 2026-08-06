package com.campuslove.api.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.User;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * DtoMapper 单元测试。
 *
 * <p>覆盖 Entity -&gt; DTO 单向映射的全部核心方法：</p>
 * <ul>
 *   <li>User：toUserDto / toUserBriefDto（含 openid 脱敏、时间类型转换、null 降级）</li>
 *   <li>Post：toPostDto（images/tags JSON 解析、解析失败降级为空列表）</li>
 *   <li>PrivateMessage：toMessageDto（quoteContext JSON 解析、失败降级为 null）</li>
 *   <li>批量转换：toDtoList（null/空列表返回空列表、跳过 null 元素）</li>
 * </ul>
 */
class DtoMapperTest {

    // ---- User 映射 ----

    @Test
    void toUserDto_nullEntity_shouldReturnNull() {
        assertNull(DtoMapper.toUserDto(null));
    }

    @Test
    void toUserDto_shouldMapBaseFieldsAndMaskOpenid() {
        User user = new User();
        user.setId(42L);
        user.setOpenid("o1234abcdef56");
        user.setNickname("星野");
        user.setAvatarUrl("/uploads/mock/avatar.jpg");
        user.setBio("安静、好奇");
        user.setCreatedAt(LocalDateTime.of(2026, 1, 1, 10, 0));
        user.setUpdatedAt(LocalDateTime.of(2026, 1, 2, 10, 0));

        UserDto dto = DtoMapper.toUserDto(user);

        assertEquals(42L, dto.getId());
        // openid 必须脱敏：前 4 位 + 中间 * + 后 2 位
        assertEquals("o123*******56", dto.getOpenid());
        assertEquals("星野", dto.getNickname());
        assertEquals("/uploads/mock/avatar.jpg", dto.getAvatarUrl());
        assertEquals("安静、好奇", dto.getBio());
        assertNotNull(dto.getCreatedAt(), "createdAt 应转换为 Instant");
        assertNotNull(dto.getUpdatedAt(), "updatedAt 应转换为 Instant");
        // 关联实体字段保持 null（由调用方补充）
        assertNull(dto.getGender());
        assertNull(dto.getAge());
        assertNull(dto.getIsVerified());
        assertNull(dto.getIsVip());
    }

    @Test
    void toUserDto_shortOpenid_shouldDegradeMasking() {
        User user = new User();
        user.setOpenid("o12");
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        UserDto dto = DtoMapper.toUserDto(user);

        // 实现逻辑：长度 <=6 时仅保留首尾各 1 位，中间用 * 填充（o12 -> o*2）
        assertEquals("o*2", dto.getOpenid());
    }

    @Test
    void toUserBriefDto_shouldMapBriefFields() {
        User user = new User();
        user.setId(7L);
        user.setNickname("林安");
        user.setAvatarUrl("/uploads/mock/avatar-linan.jpg");

        UserBriefDto dto = DtoMapper.toUserBriefDto(user);

        assertEquals(7L, dto.getId());
        assertEquals("林安", dto.getNickname());
        assertEquals("/uploads/mock/avatar-linan.jpg", dto.getAvatarUrl());
    }

    @Test
    void toUserBriefDto_nullEntity_shouldReturnNull() {
        assertNull(DtoMapper.toUserBriefDto(null));
    }

    // ---- Post 映射 ----

    @Test
    void toPostDto_shouldParseImagesAndTags() {
        User author = new User();
        author.setId(7L);
        author.setNickname("林安");
        author.setAvatarUrl("/a.jpg");

        Post post = new Post();
        post.setId(99L);
        post.setContent("今晚图书馆门口见");
        post.setImages("[\"https://cdn.example.com/1.jpg\",\"https://cdn.example.com/2.jpg\"]");
        post.setTags("[\"咖啡\",\"图书馆\"]");
        post.setCreatedAt(LocalDateTime.of(2026, 2, 1, 9, 30));
        post.setUpdatedAt(LocalDateTime.of(2026, 2, 1, 9, 30));

        PostDto dto = DtoMapper.toPostDto(post, author, 5L, 2L);

        assertEquals(99L, dto.getId());
        assertEquals("今晚图书馆门口见", dto.getContent());
        assertNotNull(dto.getAuthor());
        assertEquals("林安", dto.getAuthor().getNickname());
        assertEquals(List.of("https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"), dto.getImages());
        assertEquals(List.of("咖啡", "图书馆"), dto.getTags());
        assertEquals(5L, dto.getLikeCount());
        assertEquals(2L, dto.getCommentCount());
        assertNotNull(dto.getCreatedAt());
        assertNotNull(dto.getUpdatedAt());
    }

    @Test
    void toPostDto_invalidJsonImages_shouldDegradeToEmptyList() {
        Post post = new Post();
        post.setId(1L);
        post.setContent("内容");
        post.setImages("not-valid-json");
        post.setTags(null);
        post.setCreatedAt(LocalDateTime.now());
        post.setUpdatedAt(LocalDateTime.now());

        PostDto dto = DtoMapper.toPostDto(post, null, 0L, 0L);

        assertNotNull(dto.getImages());
        assertTrue(dto.getImages().isEmpty(), "非法 JSON 应降级为空列表");
        assertTrue(dto.getTags().isEmpty());
        assertNull(dto.getAuthor(), "作者为 null 时 DTO 中 author 为 null");
    }

    @Test
    void toPostDto_nullEntity_shouldReturnNull() {
        assertNull(DtoMapper.toPostDto(null, null, 0L, 0L));
    }

    // ---- Message 映射 ----

    @Test
    void toMessageDto_shouldMapFieldsAndParseQuoteContext() {
        PrivateMessage message = new PrivateMessage();
        message.setId(5L);
        message.setSenderId(3L);
        message.setContent("你好呀");
        message.setMessageKind("text");
        message.setQuoteContext("{\"postId\":1,\"preview\":\"原文\"}");
        message.setDeliveryStatus("delivered");
        message.setCreatedAt(LocalDateTime.of(2026, 3, 1, 12, 0));

        MessageDto dto = DtoMapper.toMessageDto(message);

        assertEquals(5L, dto.getId());
        assertEquals(3L, dto.getSenderId());
        assertEquals("text", dto.getType());
        assertEquals("你好呀", dto.getContent());
        assertEquals("delivered", dto.getStatus());
        assertNotNull(dto.getAttachments());
        assertEquals(1, dto.getAttachments().get("postId"));
        assertNotNull(dto.getSentAt());
        assertNotNull(dto.getCreatedAt());
    }

    @Test
    void toMessageDto_invalidJsonQuoteContext_shouldReturnNullAttachments() {
        PrivateMessage message = new PrivateMessage();
        message.setQuoteContext("not-valid-json");
        message.setCreatedAt(LocalDateTime.now());

        MessageDto dto = DtoMapper.toMessageDto(message);

        assertNull(dto.getAttachments(), "非法 quoteContext 应降级为 null");
    }

    @Test
    void toMessageDto_nullEntity_shouldReturnNull() {
        assertNull(DtoMapper.toMessageDto(null));
    }

    // ---- 批量转换 ----

    @Test
    void toDtoList_nullOrEmptyList_shouldReturnEmptyList() {
        assertTrue(DtoMapper.toDtoList(null, DtoMapper::toUserDto).isEmpty());
        assertTrue(DtoMapper.toDtoList(List.of(), DtoMapper::toUserDto).isEmpty());
    }

    @Test
    void toDtoList_shouldConvertAndSkipNullElements() {
        User user = new User();
        user.setId(1L);
        user.setNickname("A");
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        List<UserDto> result = DtoMapper.toDtoList(
                java.util.Arrays.asList(user, null), DtoMapper::toUserDto);

        assertEquals(1, result.size());
        assertEquals("A", result.get(0).getNickname());
    }
}
