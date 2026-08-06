package com.campuslove.api.location;

/**
 * 城市归属视图。
 * 用于「同城 Tab」的 IP 定位：根据请求方 IP 返回城市名。
 */
public record LocationCityView(
    /** 城市名（如"南京"） */
    String city
) {}
