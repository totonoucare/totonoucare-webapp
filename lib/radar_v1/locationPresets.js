// lib/radar_v1/locationPresets.js

export const RADAR_LOCATION_PRESETS = [
  {
    group: "北海道・東北",
    options: [
      { key: "sapporo", label: "札幌", lat: 43.06417, lon: 141.34694 },
      { key: "aomori", label: "青森", lat: 40.82444, lon: 140.74 },
      { key: "sendai", label: "仙台", lat: 38.26889, lon: 140.87194 },
    ],
  },
  {
    group: "関東",
    options: [
      { key: "tokyo", label: "東京", lat: 35.68944, lon: 139.69167 },
      { key: "yokohama", label: "横浜", lat: 35.44778, lon: 139.6425 },
      { key: "saitama", label: "さいたま", lat: 35.85694, lon: 139.64889 },
    ],
  },
  {
    group: "中部",
    options: [
      { key: "niigata", label: "新潟", lat: 37.90222, lon: 139.02361 },
      { key: "kanazawa", label: "金沢", lat: 36.59444, lon: 136.62556 },
      { key: "nagoya", label: "名古屋", lat: 35.18028, lon: 136.90667 },
    ],
  },
  {
    group: "近畿",
    options: [
      { key: "kyoto", label: "京都", lat: 35.02139, lon: 135.75556 },
      { key: "osaka", label: "大阪", lat: 34.68639, lon: 135.52 },
      { key: "kobe", label: "神戸", lat: 34.69139, lon: 135.18306 },
    ],
  },
  {
    group: "中国・四国",
    options: [
      { key: "hiroshima", label: "広島", lat: 34.39639, lon: 132.45944 },
      { key: "okayama", label: "岡山", lat: 34.66167, lon: 133.935 },
      { key: "takamatsu", label: "高松", lat: 34.34028, lon: 134.04333 },
    ],
  },
  {
    group: "九州・沖縄",
    options: [
      { key: "fukuoka", label: "福岡", lat: 33.60639, lon: 130.41806 },
      { key: "kagoshima", label: "鹿児島", lat: 31.56028, lon: 130.55806 },
      { key: "naha", label: "那覇", lat: 26.2125, lon: 127.68111 },
    ],
  },
];

export function flattenRadarLocationPresets() {
  return RADAR_LOCATION_PRESETS.flatMap((g) =>
    g.options.map((o) => ({
      ...o,
      group: g.group,
    }))
  );
}
