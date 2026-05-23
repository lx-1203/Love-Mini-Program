package com.campuslove.api.repository;

import com.campuslove.api.entity.IcebreakerTopic;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 破冰话题 Repository。
 * 提供基于启用状态和分类的查询方法。
 */
public interface IcebreakerTopicRepository extends JpaRepository<IcebreakerTopic, Long> {

    /**
     * 查询所有已启用的破冰话题。
     *
     * @return 已启用的破冰话题列表
     */
    List<IcebreakerTopic> findByIsActiveTrue();

    /**
     * 根据分类查询已启用的破冰话题。
     *
     * @param category 话题分类
     * @return 匹配的已启用破冰话题列表
     */
    List<IcebreakerTopic> findByCategoryAndIsActiveTrue(String category);
}
