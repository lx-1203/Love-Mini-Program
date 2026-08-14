package com.campuslove.api.mock;

import com.campuslove.api.auth.AccountSecurityService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 账号安全服务实现（3-B 修改密码 / 3-C 更换手机号 / 3-E 注销账号）。
 * 在 mock profile 下激活，仅记录日志并返回成功（mock 无真实密码/设备黑名单语义，
 * 与前端 mock 分支「操作成功」的行为保持一致）。
 */
@Profile("mock")
@Service
public class MockAccountSecurityService implements AccountSecurityService {

    private static final Logger log = LoggerFactory.getLogger(MockAccountSecurityService.class);

    @Override
    public void changePassword(Long userId, String oldPassword, String newPassword, String currentToken) {
        log.info("mock 修改密码成功, userId={}", userId);
    }

    @Override
    public void changePhone(Long userId, String password, String newPhone) {
        log.info("mock 更换手机号成功, userId={}", userId);
    }

    @Override
    public void deactivateAccount(Long userId, String password, String confirmationText, String currentToken) {
        log.info("mock 注销账号成功, userId={}", userId);
    }
}
