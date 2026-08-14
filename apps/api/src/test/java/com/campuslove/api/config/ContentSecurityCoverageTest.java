package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

/**
 * 内容安全覆盖测试（2026-08-10 C1）。
 *
 * <p>微信审核红线要求 UGC 功能必须具备违规内容过滤机制。
 * 本测试验证两条链路：
 * 1. 本地敏感词过滤（LocalContentSecurityChecker，默认兜底）对敏感内容判定 risky；
 * 2. 微信检测客户端（WeChatMsgSecCheckClient）在微信侧不可用（无凭据/异常）时
 *    降级本地过滤（fail-closed，绝不直接放行）。</p>
 *
 * <p>注：存量 UGC 服务（帖子/评论/话题/私信/临时聊天/圈子/昵称签名）直接调用
 * {@link SensitiveWordFilter} 的覆盖情况已在 2026-08-10 审查中逐入口核实
 * （RealCampusService / RealPrivateMessageService / TempChatMessageService /
 * RealCircleService / ProfileUpdateService / VillageInteractionService /
 * VillagePostService 等 10+ 服务），本测试聚焦统一入口链路的兜底行为。</p>
 */
class ContentSecurityCoverageTest {

    private SensitiveWordFilter sensitiveWordFilter;
    private LocalContentSecurityChecker localChecker;

    @BeforeEach
    void setUp() {
        sensitiveWordFilter = new SensitiveWordFilter();
        sensitiveWordFilter.setEnabled(true);
        sensitiveWordFilter.setKeywords(List.of("骗子", "诈骗"));
        localChecker = new LocalContentSecurityChecker(sensitiveWordFilter);
    }

    // ---------- 1. 本地敏感词过滤（默认兜底） ----------

    @Test
    void localChecker_shouldFlagRiskyOnSensitiveKeyword() {
        ContentSecurityVerdict verdict = localChecker.check("加微信领红包，这是诈骗吗", 1L, "3");
        assertEquals("risky", verdict.suggest());
        assertEquals("sensitive-word", verdict.label());
        assertFalse(verdict.isPass());
    }

    @Test
    void localChecker_shouldPassOnCleanContent() {
        ContentSecurityVerdict verdict = localChecker.check("周末一起去图书馆学习", 1L, "3");
        assertTrue(verdict.isPass());
    }

    @Test
    void localChecker_shouldPassOnBlankOrDisabled() {
        assertTrue(localChecker.check("", 1L, "3").isPass());
        assertTrue(localChecker.check(null, 1L, "3").isPass());
        sensitiveWordFilter.setEnabled(false);
        assertTrue(localChecker.check("这是诈骗", 1L, "3").isPass());
    }

    // ---------- 2. 微信检测客户端 fail-closed 降级 ----------

    @Test
    void wechatClient_shouldFallbackToLocalWhenSecretMissing() {
        // 无 access_token（secret 为空）→ 降级本地过滤：敏感词仍被拦截
        WeChatMsgSecCheckClient client = new WeChatMsgSecCheckClient(
                mock(RestClient.Builder.class),
                weChatConfigWithoutSecret(),
                localChecker,
                null,
                "");
        ContentSecurityVerdict verdict = client.check("这是诈骗信息", 1L, "3");
        assertEquals("risky", verdict.suggest());
        assertEquals("local", verdict.source());
    }

    private static WeChatConfig weChatConfigWithoutSecret() {
        WeChatConfig cfg = new WeChatConfig();
        cfg.setAppId("wx-test-appid");
        cfg.setAppSecret("");
        return cfg;
    }

    // 降级语义契约：微信侧异常路径不得返回 pass（fail-closed）
    @Test
    void wechatClient_shouldNeverPassThroughSensitiveContentWhenWechatUnavailable() {
        WeChatMsgSecCheckClient client = new WeChatMsgSecCheckClient(
                mock(RestClient.Builder.class),
                weChatConfigWithoutSecret(),
                localChecker,
                null,
                "");
        // 本地词库命中 → 即使微信链路不可用也必须 risky（本地兜底）
        ContentSecurityVerdict verdict = client.check("兼职刷单是诈骗", 2L, "4");
        assertEquals("risky", verdict.suggest());
        assertEquals("local", verdict.source());
    }

    // 空内容恒通过（无检查必要）
    @Test
    void wechatClient_shouldPassOnEmptyContent() {
        WeChatMsgSecCheckClient client = new WeChatMsgSecCheckClient(
                mock(RestClient.Builder.class),
                weChatConfigWithoutSecret(),
                localChecker,
                null,
                "");
        assertTrue(client.check("", 1L, "3").isPass());
        assertTrue(client.check(null, 1L, "3").isPass());
    }

    // ---------- 3. 审核红线：UGC 场景清单（防回归枚举） ----------

    /**
     * 审核红线要求的 UGC 场景必须可被本地过滤覆盖。
     * 场景值与 msgSecCheck v2 的 scene 枚举对齐：1=资料 2=评论 3=论坛 4=社交日志。
     */
    @Test
    void ugcScenes_shouldAllBeCoveredByLocalFilter() {
        String[] scenes = {"1", "2", "3", "4"}; // 资料/评论/论坛/社交日志
        for (String scene : scenes) {
            ContentSecurityVerdict risky = localChecker.check("你好，我是骗子请加我", 9L, scene);
            assertEquals("risky", risky.suggest(), "scene=" + scene + " 必须拦截敏感词");
        }
    }
}
