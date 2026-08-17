package com.campuslove.api.campus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.campuslove.api.campus.CampusPermissionService.UserPermission;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 校园圈权限矩阵单测（v3 Nearby 冻结）。
 *
 * <p>UserPermission = UNVERIFIED / PENDING / VERIFIED_SAME_SCHOOL / NON_CAMPUS，
 * 公开内容四态均可读；私域互动仅 VERIFIED_SAME_SCHOOL。</p>
 */
@ExtendWith(MockitoExtension.class)
class CampusPermissionServiceTest {

    @Mock
    private UserCampusProfileRepository repository;

    private CampusPermissionService service;

    @BeforeEach
    void setUp() {
        service = new CampusPermissionService(repository);
    }

    private UserCampusProfile profile(String school, String status) {
        UserCampusProfile p = new UserCampusProfile();
        p.setCampusName(school);
        p.setVerificationStatus(status);
        return p;
    }

    @Test
    void noProfile_isUnverified() {
        when(repository.findByUserId(1L)).thenReturn(Optional.empty());
        assertEquals(UserPermission.UNVERIFIED, service.permissionOf(1L, "北京大学"));
    }

    @Test
    void pending_isPending() {
        when(repository.findByUserId(1L)).thenReturn(Optional.of(profile("北京大学", "pending")));
        assertEquals(UserPermission.PENDING, service.permissionOf(1L, "北京大学"));
    }

    @Test
    void verifiedSameSchool_isVerifiedSameSchool() {
        when(repository.findByUserId(1L)).thenReturn(Optional.of(profile("北京大学", "verified")));
        assertEquals(UserPermission.VERIFIED_SAME_SCHOOL, service.permissionOf(1L, "北京大学"));
    }

    @Test
    void verifiedOtherSchool_isNonCampus() {
        when(repository.findByUserId(1L)).thenReturn(Optional.of(profile("北京大学", "verified")));
        assertEquals(UserPermission.NON_CAMPUS, service.permissionOf(1L, "清华大学"));
    }

    @Test
    void draft_isUnverified() {
        when(repository.findByUserId(1L)).thenReturn(Optional.of(profile("北京大学", "draft")));
        assertEquals(UserPermission.UNVERIFIED, service.permissionOf(1L, "北京大学"));
    }

    @Test
    void requireVerifiedSameSchool_rejectsUnverified() {
        when(repository.findByUserId(1L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,
            () -> service.requireVerifiedSameSchool(1L, "北京大学"));
    }

    @Test
    void requireVerifiedSameSchool_rejectsNonCampus() {
        when(repository.findByUserId(1L)).thenReturn(Optional.of(profile("北京大学", "verified")));
        assertThrows(IllegalArgumentException.class,
            () -> service.requireVerifiedSameSchool(1L, "清华大学"));
    }

    @Test
    void requireVerifiedSameSchool_allowsSameSchoolVerified() {
        when(repository.findByUserId(1L)).thenReturn(Optional.of(profile("北京大学", "verified")));
        service.requireVerifiedSameSchool(1L, "北京大学");
    }
}
