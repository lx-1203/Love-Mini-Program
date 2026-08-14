package com.campuslove.api.invite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.InviteCode;
import com.campuslove.api.entity.InviteReward;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.InviteCodeRepository;
import com.campuslove.api.repository.InviteRewardRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 真实邀请奖励服务冒烟测试（3-K 邀请奖励）。
 */
class RealInviteServiceTest {

    @Mock private InviteCodeRepository inviteCodeRepository;
    @Mock private InviteRewardRepository inviteRewardRepository;
    @Mock private UserRepository userRepository;
    @Mock private WalletService walletService;

    private RealInviteService inviteService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        inviteService = new RealInviteService(inviteCodeRepository, inviteRewardRepository,
                userRepository, walletService);
    }

    @Test
    void getOrCreateInviteCode_shouldReturnExisting_whenAlreadyExists() {
        InviteCode existing = new InviteCode();
        existing.setUserId(1L);
        existing.setCode("ABC12345");
        when(inviteCodeRepository.findByUserId(1L)).thenReturn(Optional.of(existing));

        InviteService.InviteCodeView view = inviteService.getOrCreateInviteCode(1L);

        assertEquals("ABC12345", view.code());
        verify(inviteCodeRepository, never()).saveAndFlush(any());
    }

    @Test
    void getOrCreateInviteCode_shouldGenerate_whenNotExists() {
        when(inviteCodeRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(inviteCodeRepository.existsByCode(any())).thenReturn(false);

        InviteService.InviteCodeView view = inviteService.getOrCreateInviteCode(1L);

        assertEquals(8, view.code().length());
        verify(inviteCodeRepository).saveAndFlush(any(InviteCode.class));
    }

    @Test
    void acceptInvite_shouldRejectUnknownCode() {
        when(inviteCodeRepository.findByCode("NOPE")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> inviteService.acceptInvite(2L, "NOPE"));
    }

    @Test
    void acceptInvite_shouldRejectSelfInvite() {
        InviteCode code = new InviteCode();
        code.setUserId(2L);
        code.setCode("ABC12345");
        when(inviteCodeRepository.findByCode("ABC12345")).thenReturn(Optional.of(code));

        assertThrows(IllegalArgumentException.class, () -> inviteService.acceptInvite(2L, "ABC12345"));
    }

    @Test
    void acceptInvite_shouldRejectAlreadyBound() {
        InviteCode code = new InviteCode();
        code.setUserId(1L);
        code.setCode("ABC12345");
        when(inviteCodeRepository.findByCode("ABC12345")).thenReturn(Optional.of(code));

        InviteReward existing = new InviteReward();
        existing.setInviterUserId(1L);
        existing.setInviteeUserId(2L);
        existing.setRewardPoints(100);
        when(inviteRewardRepository.findByInviteeUserId(2L)).thenReturn(Optional.of(existing));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1L, "小明")));
        when(walletService.getBalance(1L)).thenReturn(100L);

        InviteService.AcceptResultView result = inviteService.acceptInvite(2L, "ABC12345");

        assertTrue(result.alreadyBound());
        assertEquals(100, result.rewardPoints());
        // 已绑定：不重复创建/入账
        verify(inviteRewardRepository, never()).saveAndFlush(any());
    }

    @Test
    void acceptInvite_shouldCreateRewardAndCreditInviter() {
        InviteCode code = new InviteCode();
        code.setUserId(1L);
        code.setCode("ABC12345");
        when(inviteCodeRepository.findByCode("ABC12345")).thenReturn(Optional.of(code));
        when(inviteRewardRepository.findByInviteeUserId(2L)).thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1L, "小明")));
        when(walletService.recharge(eq(1L), eq(100L), eq("INVITE-2"),
                eq(WalletTransactionLog.RELATED_TYPE_INVITE_REWARD), eq("2"))).thenReturn(100L);

        InviteService.AcceptResultView result = inviteService.acceptInvite(2L, "ABC12345");

        assertEquals(1L, result.inviterUserId());
        assertEquals("小明", result.inviterName());
        assertEquals(100, result.rewardPoints());
        verify(inviteRewardRepository).saveAndFlush(any(InviteReward.class));
    }

    @Test
    void listMyRewards_shouldReturnViewsWithInviteeName() {
        InviteReward reward = new InviteReward();
        reward.setId(1L);
        reward.setInviterUserId(1L);
        reward.setInviteeUserId(2L);
        reward.setRewardPoints(100);
        reward.setStatus(InviteReward.STATUS_GRANTED);
        when(inviteRewardRepository.findByInviterUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(reward));
        when(userRepository.findAllById(List.of(2L))).thenReturn(List.of(user(2L, "小红")));

        List<InviteService.RewardView> rewards = inviteService.listMyRewards(1L);

        assertEquals(1, rewards.size());
        assertEquals("小红", rewards.get(0).inviteeName());
        assertEquals(100, rewards.get(0).rewardPoints());
    }

    private User user(Long id, String nickname) {
        User u = new User();
        u.setId(id);
        u.setNickname(nickname);
        return u;
    }
}
