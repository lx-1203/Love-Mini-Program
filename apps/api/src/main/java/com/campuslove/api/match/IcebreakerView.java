package com.campuslove.api.match;

/**
 * 破冰话题视图。
 * 包含话题内容、分类、来源和模板ID等展示字段。
 */
public class IcebreakerView {

    /** 显示文案（含占位符已替换） */
    private String content;

    /** 话题分类 */
    private String category;

    /** 来源：common_interest / same_school / common_answer / common_circle / same_profession / general */
    private String source;

    /** 破冰模板ID */
    private Long topicId;

    public IcebreakerView() {
    }

    public IcebreakerView(String content, String category, String source) {
        this.content = content;
        this.category = category;
        this.source = source;
    }

    public IcebreakerView(String content, String category, String source, Long topicId) {
        this.content = content;
        this.category = category;
        this.source = source;
        this.topicId = topicId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Long getTopicId() {
        return topicId;
    }

    public void setTopicId(Long topicId) {
        this.topicId = topicId;
    }
}