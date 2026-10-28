package com.campuslove.api.admin.audit;

/**
 * 审计操作类型枚举。
 * <p>用于 {@link Auditable} 注解标识管理端操作的类型，
 * 切面将该枚举名写入 audit_log.operation 字段，便于后续按类型筛选审计记录。</p>
 */
public enum AuditOperation {

    AUDIT_POST("审核帖子"),
    /** 后台新建帖子（官方小编代发）；与「审核帖子」区分，否则审计日志分不清谁产的内容 */
    CREATE_POST("新建帖子"),
    DELETE_POST("删除帖子"),
    /**
     * 发布全站广播公告（写入 official_messages，全部校区所有用户即时可见）。
     * <p>单列一个操作码，而不是复用 UPDATE_CONFIG：审计日志里"改了条配置"和
     * "向全校所有人推了一条公告"是完全不同量级的动作，事后追查不能靠猜。</p>
     */
    PUBLISH_ANNOUNCEMENT("发布全站公告"),
    /** 下架全站广播公告（物理删除 official_messages 行，所有用户立即不再看到） */
    TAKE_DOWN_ANNOUNCEMENT("下架全站公告"),
    DELETE_COMMENT("删除评论"),
    DISABLE_USER("禁用用户"),
    ENABLE_USER("启用用户"),
    EDIT_USER("编辑用户"),
    HANDLE_REPORT("处理举报"),
    /** 处理反馈工单（更新工单状态 / 写回复摘要）；与「处理举报」区分，避免审计日志混淆两类工单 */
    HANDLE_FEEDBACK("处理反馈"),
    REVIEW_CERTIFICATION("审核认证"),
    UPDATE_CONFIG("更新配置"),
    UPDATE_RULE("更新规则"),
    UPDATE_SWITCH("更新开关"),
    UPDATE_MATCH_CONFIG("更新匹配配置"),
    UPDATE_RECOMMEND_STRATEGY("更新推荐策略"),
    UPDATE_NOTIFY_CONFIG("更新通知配置"),
    ADD_SENSITIVE_WORD("新增敏感词"),
    DELETE_SENSITIVE_WORD("删除敏感词"),
    CHANGE_PASSWORD("修改密码"),
    CREATE_USER("新增用户"),
    KICK_ONLINE_USER("强制下线在线用户"),
    CREATE_SCHOOL("新增高校"),
    UPDATE_SCHOOL("编辑高校"),
    DELETE_SCHOOL("删除高校"),
    TOGGLE_SCHOOL("启用/停用高校"),
    CREATE_MENU("新增菜单"),
    UPDATE_MENU("编辑菜单"),
    DELETE_MENU("删除菜单"),
    CREATE_ROLE("新增角色"),
    UPDATE_ROLE("编辑角色"),
    DELETE_ROLE("删除角色"),
    ASSIGN_ROLE_MENU("角色菜单权限分配"),
    CREATE_DICT("新增字典"),
    UPDATE_DICT("编辑字典"),
    DELETE_DICT("删除字典"),
    CREATE_DICT_ITEM("新增字典条目"),
    UPDATE_DICT_ITEM("编辑字典条目"),
    DELETE_DICT_ITEM("删除字典条目"),
    CREATE_ACTIVITY("新增活动"),
    UPDATE_ACTIVITY("编辑活动"),
    DELETE_ACTIVITY("删除活动"),
    PUBLISH_ACTIVITY("上架活动"),
    UNPUBLISH_ACTIVITY("下架活动"),
    PIN_POST("置顶帖子"),
    UNPIN_POST("取消置顶"),
    PIN_TOPIC("置顶话题"),
    UNPIN_TOPIC("取消置顶话题"),
    CREATE_CIRCLE("新增兴趣圈"),
    UPDATE_CIRCLE("编辑兴趣圈"),
    /** 2026-10-28：圈子公告表化后的发布/编辑/下线（目标类型 CIRCLE_ANNOUNCEMENT） */
    CREATE_CIRCLE_ANNOUNCEMENT("新增圈子公告"),
    UPDATE_CIRCLE_ANNOUNCEMENT("编辑/发布/下线圈子公告"),
    /** 2026-10-28：手动触发临时会话材料保留期清理（验收/运维） */
    CLEANUP_TEMP_CHAT("清理临时会话材料"),
    DELETE_CIRCLE("删除兴趣圈"),
    CREATE_PROMO_CODE("生成兑换码"),
    DISABLE_PROMO_CODE("作废兑换码"),
    CREATE_SHOP_ITEM("新增商城商品"),
    UPDATE_SHOP_ITEM("编辑商城商品"),
    DELETE_SHOP_ITEM("删除商城商品"),
    PUBLISH_SHOP_ITEM("上架商城商品"),
    UNPUBLISH_SHOP_ITEM("下架商城商品"),
    ADJUST_WALLET("调整钱包余额"),
    AUDIT_MEDIA_ASSET("审核媒体图片");

    private final String description;

    AuditOperation(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
