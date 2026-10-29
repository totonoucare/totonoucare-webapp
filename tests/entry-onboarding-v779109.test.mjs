import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = name => readFile(new URL("../" + name, import.meta.url), "utf8");
const load = async name => import("data:text/javascript;base64," + Buffer.from(await source(name)).toString("base64"));
const copy = await load("lib/homeEntryCopy.js");
const policy = await load("lib/experience/promptPolicy.js");
const install = await load("lib/pwa/installGuide.js");
const forecast = [{ event_key: "milestone:forecast" }];

test("home copy names the body, regional weather and useful forecast/care without free/trial promotion", () => {
  assert.equal(copy.HOME_CHECK_CTA, "体質チェックして体調予報へ");
  for (const phrase of ["約5分", "お体の崩れやすさ", "お住まいの地域の天気", "体調警戒予報", "食事・ツボ・過ごし方"]) assert.ok(copy.HOME_CHECK_INTRO.includes(phrase));
  assert.doesNotMatch(Object.values(copy).join(""), /無料|14日/);
});
test("home keeps the check destination, adds the early CTA, and replaces only the third feature", async () => {
  const home = await source("app/HomeClient.jsx");
  const start = home.slice(home.indexOf("function GuestStartCta"), home.indexOf("function MyCareScopeBadge"));
  assert.match(start, /title: "記録・AI相談"/);
  assert.match(start, /AppIcon name="chat"/);
  assert.doesNotMatch(start, /title: "ショップ"|パーソナルケアショップへ/);
  assert.equal((home.match(/\{HOME_CHECK_CTA\}/g) || []).length, 2);
  assert.ok(home.lastIndexOf("{HOME_CHECK_CTA}") < home.indexOf("参考体質で見る体調予報デモ"));
  assert.match(home, /onCheck=\{\(\) => router\.push\("\/check"\)\}/);
  assert.doesNotMatch(home, /登録後14日間、体調予報・記録・AI相談まで|無料で体質チェックを始める/);
});
test("forecast, not care, unlocks hardware prompts, without showing over location/loading/paywalls", () => {
  assert.equal(policy.hardwareExperienceReady({ rows: forecast, pathname: "/radar", forecastMounted: true }), true);
  assert.equal(policy.hardwareExperienceReady({ rows: forecast, pathname: "/radar", forecastMounted: false }), false);
  assert.equal(policy.hardwareExperienceReady({ rows: [], pathname: "/radar", forecastMounted: true }), false);
  assert.equal(policy.hardwareExperienceReady({ rows: forecast, pathname: "/" }), true);
  assert.equal(policy.hardwareExperienceReady({ rows: [{ event_key: "use:forecast:2026-10-29" }], pathname: "/radar", forecastMounted: true }), true);
});
test("hardware can follow after 30 seconds without a new action; guides/surveys cannot chain", () => {
  assert.equal(policy.EXPERIENCE_COOLDOWN_MS, 30000);
  const state = { now: 30000, cooldownUntil: 30000, boundary: 2, closedBoundary: 2 };
  assert.equal(policy.experienceCandidateReady("hardware", state), true);
  assert.equal(policy.experienceCandidateReady("hardware", { ...state, now: 29999 }), false);
  assert.equal(policy.experienceCandidateReady("guide", state), false);
  assert.equal(policy.experienceCandidateReady("survey", state), false);
  assert.equal(policy.experienceCandidateReady("guide", { ...state, boundary: 3 }), true);
});
test("iOS Chrome and Safari have their own manual installation instructions", () => {
  const ios = { platform: "iPhone", maxTouchPoints: 5 };
  const chrome = install.iosInstallGuide({ ...ios, userAgent: "iPhone AppleWebKit CriOS/140 Mobile Safari/604.1" });
  const safari = install.iosInstallGuide({ ...ios, userAgent: "iPhone AppleWebKit Version/18 Mobile Safari/604.1" });
  assert.equal(chrome.browser, "Chrome");
  assert.equal(safari.browser, "Safari");
  assert.equal(chrome.firstStep, "共有ボタンを押す");
  assert.match(chrome.secondStep, /ホーム画面に追加/);
  assert.equal(install.isIosDevice({ platform: "MacIntel", maxTouchPoints: 5 }), true);
  assert.match(install.iosInstallGuide({ ...ios, userAgent: "iPhone Instagram Safari/604.1" }).firstStep, /Safari または Chrome で開く/);
  assert.equal(install.iosInstallGuide({ platform: "Linux", userAgent: "Android Chrome" }), null);
});
test("care-view popup is retired, explicit dismissals and iOS push restrictions remain", async () => {
  const provider = await source("components/experience/ExperienceProvider.jsx");
  assert.doesNotMatch(provider, /button:'ケアを見る'|id:'forecast',kind:'guide'|120000/);
  assert.match(provider, /14\*86400000/);
  assert.match(provider, /busyScreen\(inputUntil.current\)/);
  const pwa = await source("components/pwa/PwaInstallPrompt.jsx");
  assert.match(pwa, /const DISMISS_DAYS = 14/);
  assert.match(pwa, /isStandaloneMode\(\)/);
  const push = await source("components/pwa/PushNotificationPrompt.jsx");
  assert.match(push, /isProbablyIos\(\) && !isStandalonePwa\(\)/);
  assert.match(push, /permission === "denied"/);
  assert.match(push, /if \(existing\)/);
});
