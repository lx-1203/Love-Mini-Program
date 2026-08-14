package com.campuslove.api.block;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBlock;
import com.campuslove.api.repository.UserBlockRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 真实拉黑服务冒烟测试（3-F 拉黑）。
 */
class RealBlockServiceTest {

    @Mock private UserBlockRepository blockRepository;
    @Mock private UserRepository userRepository;

    private RealBlockService blockService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        blockService = new RealBlockService(blockRepository, userRepository);
    }

    @Test
    void block_shouldRejectSelfBlock() {
        assertThrows(IllegalArgumentException.class, () -> blockService.block(1L, 1L));
    }

    @Test
    void block_shouldBeIdempotent_whenAlreadyBlocked() {
        when(userRepository.existsById(2L)).thenReturn(true);
        when(blockRepository.existsByUserIdAndBlockedUserId(1L, 2L)).thenReturn(true);

        blockService.block(1L, 2L);

        // 已拉黑：不重复保存
        verify(blockRepository, never()).save(any());
    }

    @Test
    void block_shouldSave_whenNotBlockedYet() {
        when(userRepository.existsById(2L)).thenReturn(true);
        when(blockRepository.existsByUserIdAndBlockedUserId(1L, 2L)).thenReturn(false);

        blockService.block(1L, 2L);

        verify(blockRepository).save(any(UserBlock.class));
    }

    @Test
    void unblock_shouldDelegateToRepository() {
        blockService.unblock(1L, 2L);
        verify(blockRepository).deleteByUserIdAndBlockedUserId(1L, 2L);
    }

    @Test
    void getBlockedUsers_shouldReturnViews() {
        UserBlock block = new UserBlock(1L, 2L);
        when(blockRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(block));
        User user = new User();
        user.setId(2L);
        user.setNickname("小明");
        when(userRepository.findAllById(List.of(2L))).thenReturn(List.of(user));

        List<BlockedUserView> views = blockService.getBlockedUsers(1L);

        assertEquals(1, views.size());
        assertEquals(2L, views.get(0).userId());
        assertEquals("小明", views.get(0).nickname());
    }

    @Test
    void isBlockedBetween_shouldDelegateToRepository() {
        when(blockRepository.existsBlockedBetween(1L, 2L)).thenReturn(true);
        assertTrue(blockService.isBlockedBetween(1L, 2L));
        verify(blockRepository).existsBlockedBetween(1L, 2L);
    }

    @Test
    void getBlockedRelationUserIds_shouldDelegateToRepository() {
        when(blockRepository.findBlockedRelationUserIds(1L)).thenReturn(List.of(2L, 3L));
        assertEquals(List.of(2L, 3L), blockService.getBlockedRelationUserIds(1L));
    }

    @Test
    void block_shouldRejectWhenTargetNotExists() {
        when(userRepository.existsById(99L)).thenReturn(false);
        assertThrows(IllegalArgumentException.class, () -> blockService.block(1L, 99L));
        verify(blockRepository, never()).save(any());
    }
}
