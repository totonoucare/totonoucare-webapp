import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const home = await readFile(new URL("../app/HomeClient.jsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../components/forecast/GuestForecastDemo.jsx", import.meta.url), "utf8");
const guest = home.slice(home.indexOf("  if (!isLoggedIn) {"), home.indexOf("  if (featureAccess?.personalized_forecast_enabled === false) {"));
const dateFunctions = home.slice(home.indexOf("function getJstDateString"), home.indexOf("function signalBadge"));

test("the guest demo explicitly requests tomorrow and the signed-in fallback requests today", () => {
  assert.match(home, /const publicForecastDate = getJstDateString\(isLoggedIn \? 0 : 1\)/);
  assert.ok(home.includes("/api/radar/v1/forecast/public?lat=${lat}&lon=${lon}&date=${publicForecastDate}"));
  assert.match(home, /publicLocation\.key, publicForecastDate\]/);
});

test("tomorrow date, hero, mode, signs and explanation all use the same day", () => {
  assert.ok(guest.includes('title={`明日 ${formatYmdJP(pf?.target_date || publicForecastDate)}`}'));
  for (const phrase of ["明日は守りモード", "明日はいたわりモード", "明日は安定モード", "明日の体調予報デモを確認中"]) assert.ok(guest.includes(phrase), phrase);
  for (const phrase of ["明日の体調予報", "明日の体調警戒度", "あなたに合わせた明日の体調予報とケア"]) assert.ok(demo.includes(phrase), phrase);
  assert.match(guest, /buildGuestSignHints\(pf, pf\.target_date\)/);
  assert.doesNotMatch(guest, /今日| getJstDateString\(0\)/);
});

test("failed or wrong-date forecasts never become a fake stable tomorrow demo", () => {
  assert.match(home, /setPublicForecast\(res\.ok && json\?\.ok && json\?\.forecast && json\.target_date === publicForecastDate/);
  assert.match(home, /setPublicForecast\(null\)/);
  assert.match(guest, /ok: Boolean\(pf\)/);
  assert.match(guest, /明日の予報を読み込めませんでした/);
  assert.match(demo, /if \(!bundle\?\.ok \|\| !bundle\.forecast\)/);
});

test("CTA, region presets and logged-in today/tomorrow dashboard stay available", () => {
  assert.match(guest, /\{HOME_CHECK_CTA\}/);
  assert.match(guest, /router\.push\("\/check"\)/);
  assert.match(guest, /PUBLIC_FORECAST_PRESETS\.map/);
  assert.match(home, /modeDescription = "今日の崩れやすさ"/);
  assert.match(home, /loadFixedForecastCard\(today, setTodayBundle, setTodayLoading, "今日"\)/);
  assert.match(home, /loadFixedForecastCard\(tomorrow, setTomorrowBundle, setTomorrowLoading, "明日"\)/);
  assert.match(home, /cache_only=1/);
});

for (const timezone of ["Asia/Tokyo", "UTC", "America/Los_Angeles", "Pacific/Auckland"]) {
  test("JST dates, weekday, month/year rollover in " + timezone, () => {
    const script = `
      const assert = require("node:assert/strict");
      const NativeDate = Date;
      ${dateFunctions}
      for (const [now, today, tomorrow] of [
        ["2026-10-30T02:00:00Z", "2026-10-30", "2026-10-31"],
        ["2026-10-30T14:59:59Z", "2026-10-30", "2026-10-31"],
        ["2026-10-30T15:00:00Z", "2026-10-31", "2026-11-01"],
        ["2026-12-31T12:00:00Z", "2026-12-31", "2027-01-01"],
        ["2024-02-28T15:00:00Z", "2024-02-29", "2024-03-01"]
      ]) {
        global.Date = class extends NativeDate {
          constructor(...args) { super(...(args.length ? args : [now])); }
        };
        assert.equal(getJstDateString(0), today);
        assert.equal(getJstDateString(1), tomorrow);
      }
      global.Date = NativeDate;
      assert.equal(formatYmdJP("2026-10-31"), "10/31(土)");
      assert.equal(formatYmdJP("2026-11-01"), "11/1(日)");
      assert.equal(formatYmdJP("2027-01-01"), "1/1(金)");
      assert.equal(formatYmdJP(null), "—");
      assert.equal(formatYmdJP("invalid"), "invalid");
    `;
    execFileSync(process.execPath, ["-e", script], { env: { ...process.env, TZ: timezone } });
  });
}
