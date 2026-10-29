export function isIosDevice(navigatorLike) {
  if (!navigatorLike) return false;
  return /iPhone|iPad|iPod/i.test(navigatorLike.userAgent || "") ||
    (navigatorLike.platform === "MacIntel" && Number(navigatorLike.maxTouchPoints || 0) > 1);
}

export function iosInstallGuide(navigatorLike) {
  if (!isIosDevice(navigatorLike)) return null;
  const ua = navigatorLike.userAgent || "";
  const chrome = /CriOS/i.test(ua);
  const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium|FBAN|FBAV|Instagram|Line\//i.test(ua);
  return {
    browser: chrome ? "Chrome" : safari ? "Safari" : "Safari または Chrome",
    firstStep: chrome || safari ? "共有ボタンを押す" : "メニューから Safari または Chrome で開く",
    secondStep: chrome || safari ? "「ホーム画面に追加」を選ぶ" : "開いたブラウザの共有メニューで「ホーム画面に追加」を選ぶ",
    lastStep: "「追加」を押し、ホーム画面のアイコンから開く",
  };
}
