package com.campuslove.api.campus;

import org.springframework.context.annotation.Profile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * 校园圈权限模型（v3 Nearby 冻结）。
 *
 * <p>将「浏览权限」与「互动权限」彻底拆开，避免各 Controller 散落 if 判断：</p>
 * <ul>
 *   <li>公开内容（PUBLIC）：任何已登录用户可浏览（未认证/认证中/已认证本校/非本校）；</li>
 *   <li>私域互动（PRIVATE）：仅 {@code VERIFIED_SAME_SCHOOL} 可发帖/回复。</li>
 * </ul>
 *
 * <p>注意：本模型只用于校园圈（CampusService 域），普通兴趣圈（CircleService）零校园校验。</p>
 */
@Profile("real")
@Component
public class CampusPermissionService {

    public static final String STATUS_VERIFIED = "verified";
    public static final String STATUS_PENDING = "pending";

    private final UserCampusProfileRepository campusProfileRepository;

    public CampusPermissionService(UserCampusProfileRepository campusProfileRepository) {
        this.campusProfileRepository = campusProfileRepository;
    }

    /** 用户校园权限状态。 */
    public enum UserPermission {
        /** 未认证（无校园资料或未通过认证） */
        UNVERIFIED,
        /** 认证审核中 */
        PENDING,
        /** 已认证且为目标学校本校 */
        VERIFIED_SAME_SCHOOL,
        /** 已认证但非目标学校（非本校） */
        NON_CAMPUS
    }

    /** 读取用户校园资料（无则 empty）。 */
    public Optional<UserCampusProfile> profileOf(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return campusProfileRepository.findByUserId(userId);
    }

    /** 计算用户对某学校的权限状态。 */
    public UserPermission permissionOf(Long userId, String schoolName) {
        Optional<UserCampusProfile> profileOpt = profileOf(userId);
        if (profileOpt.isEmpty()) {
            return UserPermission.UNVERIFIED;
        }
        UserCampusProfile profile = profileOpt.get();
        String status = profile.getVerificationStatus();
        if (STATUS_VERIFIED.equals(status)) {
            boolean sameSchool = schoolName != null && schoolName.equals(profile.getCampusName());
            return sameSchool ? UserPermission.VERIFIED_SAME_SCHOOL : UserPermission.NON_CAMPUS;
        }
        if (STATUS_PENDING.equals(status)) {
            return UserPermission.PENDING;
        }
        return UserPermission.UNVERIFIED;
    }

    /** 私域互动门禁：仅本校已认证用户可发帖/回复。 */
    public void requireVerifiedSameSchool(Long userId, String schoolName) {
        if (permissionOf(userId, schoolName) != UserPermission.VERIFIED_SAME_SCHOOL) {
            throw new IllegalArgumentException("仅本校已认证用户可参与校园圈互动");
        }
    }
}
