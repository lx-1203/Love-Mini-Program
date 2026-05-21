import { appTabs } from "../config/navigation";

function normalizeUrl(url: string) {
  return url.startsWith("/") ? url : `/${url}`;
}

export function isTabPath(url: string) {
  const normalizedUrl = normalizeUrl(url);
  return appTabs.some((tab) => tab.path === normalizedUrl);
}

export function openAppPath(url: string) {
  const normalizedUrl = normalizeUrl(url);

  if (isTabPath(normalizedUrl)) {
    uni.switchTab({ url: normalizedUrl });
    return;
  }

  uni.navigateTo({ url: normalizedUrl });
}

export function replaceAppPath(url: string) {
  const normalizedUrl = normalizeUrl(url);

  if (isTabPath(normalizedUrl)) {
    uni.switchTab({ url: normalizedUrl });
    return;
  }

  uni.redirectTo({ url: normalizedUrl });
}
