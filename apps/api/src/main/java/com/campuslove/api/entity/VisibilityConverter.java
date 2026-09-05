package com.campuslove.api.entity;

import com.campuslove.api.entity.Post.Visibility;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA 属性转换器：{@link Post.Visibility} 枚举与数据库字符串值之间的映射。
 *
 * <p>解决 Java 保留关键字 {@code public} 无法用作枚举名的问题：
 * Java 枚举使用 {@code public_}（带下划线），数据库存储 {@code public}（不带下划线）。</p>
 *
 * @see Post#visibility
 */
@Converter(autoApply = false)
public class VisibilityConverter implements AttributeConverter<Visibility, String> {

    @Override
    public String convertToDatabaseColumn(Visibility attribute) {
        if (attribute == null) {
            return "public";
        }
        return switch (attribute) {
            case public_ -> "public";
            case school -> "school";
            case interest -> "interest";
        };
    }

    @Override
    public Visibility convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return Visibility.public_;
        }
        return switch (dbData) {
            case "public" -> Visibility.public_;
            case "school" -> Visibility.school;
            case "interest" -> Visibility.interest;
            default -> throw new IllegalArgumentException(
                    "未知的帖子可见范围值: " + dbData);
        };
    }
}
