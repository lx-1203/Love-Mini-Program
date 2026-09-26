package com.campuslove.api.location;

/**
 * 城市归属视图。
 * 用于「同城 Tab」的 IP 定位：根据请求方 IP 返回城市名。
 *
 * <p>{@code latitude}/{@code longitude} 是该城市的中心坐标，用来让调用方能量出
 * "IP 推断出来的城市"与"本次 GPS 坐标"到底差多远（MP-R2VIS-...-LOCATION-001 的
 * &gt;100km 丢弃判据）。取不到中心坐标时两字段为 {@code null} —— 调用方必须把它当
 * "量不出来"，不能当"距离为 0"。</p>
 */
public record LocationCityView(
    /** 城市名（如"南京"） */
    String city,
    /** 城市中心纬度（gcj02，城市级精度足够 100km 判据用）；无中心表时为 null */
    Double latitude,
    /** 城市中心经度（gcj02）；无中心表时为 null */
    Double longitude
) {

    /** 只有城市名的旧形状：单测与内部调用图方便，等价于无中心坐标。 */
    public LocationCityView(String city) {
        this(city, null, null);
    }
}
