/**
 * Open-Meteoで現在値＋直近24h差分の材料を取る（APIキー不要）
 */
export async function fetchOpenMeteo({ lat, lon }) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("timezone", "Asia/Tokyo");
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "pressure_msl",
      "wind_speed_10m",
      "precipitation",
    ].join(",")
  );
  // 直近の時間列（24h差分を見るため）
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "pressure_msl",
      "wind_speed_10m",
      "precipitation",
    ].join(",")
  );
  url.searchParams.set("forecast_days", "2"); // 今日〜明日分で十分
  url.searchParams.set("past_days", "1");     // 24h前を取るため

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  return res.json();
}

/**
 * hourly配列から「現在時刻に最も近いindex」と「24h前index」を探す
 */
export function pickNowAnd24hAgo(hourly) {
  const times = hourly?.time || [];
  if (!times.length) return { nowIdx: -1, agoIdx: -1 };

  const now = new Date();
  // JSTのISOっぽい "YYYY-MM-DDTHH:00" に近いものを探す
  // Open-Meteoのtimeは timezone指定するとJSTで返ってくる前提
  const nowStr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  })
    .formatToParts(now)
    .reduce((acc, p) => {
      if (p.type === "year") acc.y = p.value;
      if (p.type === "month") acc.m = p.value;
      if (p.type === "day") acc.d = p.value;
      if (p.type === "hour") acc.h = p.value;
      return acc;
    }, { y: "", m: "", d: "", h: "" });

  const target = `${nowStr.y}-${nowStr.m}-${nowStr.d}T${nowStr.h}:00`;
  let nowIdx = times.indexOf(target);

  // ぴったり無い場合は末尾近辺を使う
  if (nowIdx < 0) nowIdx = Math.max(0, times.length - 1);

  const agoIdx = Math.max(0, nowIdx - 24);
  return { nowIdx, agoIdx };
}
