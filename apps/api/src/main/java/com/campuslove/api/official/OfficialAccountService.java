package com.campuslove.api.official;

import java.util.List;

/**
 * 官方号服务接口（2026-08-07 官方号体系）。
 *
 * <p>官方号 = 产品助手号（official-assistant）/ 活动运营号（official-promoter），
 * 会话进消息列表、消息流按发布时间升序拉取。</p>
 */
public interface OfficialAccountService {

    /**
     * 获取全部启用官方账号，按展示顺序升序。
     *
     * @return 账号视图列表
     */
    List<OfficialAccountView> getAccounts();

    /**
     * 获取某官方号的消息流（发布时间升序）。
     *
     * @param code 官方号唯一标识
     * @return 消息视图列表；账号不存在或已下线时返回空列表
     */
    List<OfficialMessageView> getMessages(String code);

    /**
     * 获取某官方号对<b>指定用户可见</b>的消息流（P1-2 按人群群发，2026-11-03）。
     *
     * <p>受众过滤：ALL 全可见；CAMPUS 仅该校区用户；CIRCLE 仅圈层子树内用户
     * （按 users.circle_path 与受众前缀的路径段匹配）。userId 为 null 时
     * 仅 ALL 可见（与匿名访问同语义，fail-closed）。</p>
     *
     * <p>默认实现退化为无过滤的全量流（{@link #getMessages(String)}），
     * 兼容 mock 档演示；real 实现覆写本方法做真实过滤。</p>
     *
     * @param code   官方号唯一标识
     * @param userId 当前用户 ID（可空=匿名）
     * @return 过滤后的消息视图列表（发布时间升序）
     */
    default List<OfficialMessageView> getMessages(String code, Long userId) {
        return getMessages(code);
    }
}
