package com.campuslove.api.admin;

import com.campuslove.api.entity.InterestTag;
import com.campuslove.api.entity.UserInterestTag;
import com.campuslove.api.repository.InterestTagRepository;
import com.campuslove.api.repository.UserInterestTagRepository;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 兴趣标签字典与用户兴趣关系。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminInterestTagController {

    private final InterestTagRepository interestTagRepository;
    private final UserInterestTagRepository userInterestTagRepository;

    public AdminInterestTagController(
            InterestTagRepository interestTagRepository,
            UserInterestTagRepository userInterestTagRepository) {
        this.interestTagRepository = interestTagRepository;
        this.userInterestTagRepository = userInterestTagRepository;
    }

    public record InterestTagView(Long id, String groupKey, String name, boolean enabled, Integer sortOrder, String category, String icon, Integer recommendWeight) {}

    @GetMapping("/interest-tags")
    public List<InterestTagView> listTags() {
        return interestTagRepository.findByEnabledTrueOrderByIdAsc().stream()
                .map(tag -> new InterestTagView(tag.getId(), tag.getGroupKey(), tag.getName(), tag.isEnabled(), tag.getSortOrder(), tag.getCategory(), tag.getIcon(), tag.getRecommendWeight()))
                .toList();
    }

    @GetMapping("/users/{userId}/interest-tags")
    public List<Long> getUserTagIds(@PathVariable("userId") Long userId) {
        return userInterestTagRepository.findByUserId(userId).stream()
                .map(UserInterestTag::getTagId)
                .toList();
    }

    @PutMapping("/users/{userId}/interest-tags")
    @Transactional
    public List<Long> saveUserTagIds(@PathVariable("userId") Long userId, @RequestBody List<Long> tagIds) {
        userInterestTagRepository.deleteByUserId(userId);
        if (tagIds != null) {
            for (Long tagId : tagIds) {
                if (tagId != null) {
                    userInterestTagRepository.save(new UserInterestTag(userId, tagId));
                }
            }
        }
        return getUserTagIds(userId);
    }
}
