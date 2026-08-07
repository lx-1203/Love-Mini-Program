package com.campuslove.api.official;

import com.campuslove.api.entity.OfficialAccount;
import com.campuslove.api.entity.OfficialMessage;
import com.campuslove.api.repository.OfficialAccountRepository;
import com.campuslove.api.repository.OfficialMessageRepository;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实官方号服务实现。
 * 在 real profile 下激活，使用 Repository 查询数据库。
 */
@Profile("real")
@Service
public class RealOfficialAccountService implements OfficialAccountService {

    private final OfficialAccountRepository accountRepository;
    private final OfficialMessageRepository messageRepository;

    public RealOfficialAccountService(
            OfficialAccountRepository accountRepository,
            OfficialMessageRepository messageRepository) {
        this.accountRepository = accountRepository;
        this.messageRepository = messageRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfficialAccountView> getAccounts() {
        return accountRepository.findByEnabledTrueOrderBySortOrderAsc().stream()
                .map(this::toView)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfficialMessageView> getMessages(String code) {
        OfficialAccount account = accountRepository.findByCode(code).orElse(null);
        if (account == null || !account.isEnabled()) {
            return List.of();
        }
        return messageRepository.findByAccountIdOrderByPublishedAtAsc(account.getId()).stream()
                .map(this::toView)
                .toList();
    }

    private OfficialAccountView toView(OfficialAccount account) {
        return new OfficialAccountView(
                account.getId(),
                account.getCode(),
                account.getName(),
                account.getDescription(),
                account.getIconUrl());
    }

    private OfficialMessageView toView(OfficialMessage message) {
        return new OfficialMessageView(
                message.getId(),
                message.getMessageType(),
                message.getContent(),
                message.getCardTitle(),
                message.getCardDesc(),
                message.getCardTag(),
                message.getCardTargetUrl(),
                message.getPublishedAt());
    }
}
