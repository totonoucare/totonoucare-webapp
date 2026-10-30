// Production-build browser QA. All auth/API data is synthetic. External requests
// are intercepted; this script never reaches production DB, Meta or OAuth.
// v7.79.110 also covers result navigation, safe-area/resize and return login.
// v7.79.111 adds tomorrow-demo date/region/error and signed-in fallback checks.
// v7.79.112 checks the shared circular gauge, public weather groups and hero preservation.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3109";
const origin = "https://mibyo-radar.totonoucare.com";
const output = process.env.QA_OUTPUT_DIR;
if (!output) throw Error("Set QA_OUTPUT_DIR outside the source directory");
fs.mkdirSync(output, { recursive: true });
const uid = "11111111-1111-4111-8111-111111111111";
const resultId = "22222222-2222-4222-8222-222222222222";
const user = { id: uid, email: "qa@example.test", role: "authenticated", app_metadata: { provider: "google" }, user_metadata: {}, created_at: "2026-10-29T00:00:00Z" };
const access = { mode: "trial", trial_enabled: true, trial_ends_at: "2099-11-12T00:00:00Z", trial_days_remaining: 14, personalized_forecast_enabled: true, notifications_enabled: true, analysis_enabled: true, consult_enabled: true };
const token = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url") + "." + Buffer.from(JSON.stringify({ sub: uid, exp: 4090000000, role: "authenticated" })).toString("base64url") + ".qa";
const session = { access_token: token, refresh_token: "qa-refresh", expires_at: 4090000000, expires_in: 3600, token_type: "bearer", user };
const report = [];
const launched = [];
function getLocal(url, headers = {}) {
  const clean = { ...headers };
  for (const key of ["host", "accept-encoding", "content-length", "connection"]) delete clean[key];
  return new Promise((resolve, reject) => {
    http.get(url, { headers: clean }, response => {
      const chunks = [];
      response.on("data", part => chunks.push(part));
      response.on("end", () => resolve({ status: response.statusCode, headers: { "content-type": response.headers["content-type"] || "application/octet-stream" }, body: Buffer.concat(chunks) }));
    }).on("error", reject);
  });
}

async function fixture(launchOptions, { signedIn = true, location = true, width = 390, ios = true, standalone = false, trialSeen = false, resultKind = "first", publicState = "ok", expired = false, timezoneId = "Asia/Tokyo" } = {}) {
  const browser = await chromium.launch(launchOptions);
  launched.push(browser);
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block", timezoneId,
    userAgent: ios ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1" : undefined });
  const page = await context.newPage(), errors = [], metrics = [], diagnosisWrites = [], publicRequests = [];
  const fixtureAccess = expired ? { ...access, mode: "free", trial_enabled: false, trial_expired: true, personalized_forecast_enabled: false } : access;
  page.setDefaultTimeout(10000);
  let hasLocation = location, rows = trialSeen ? [{ event_key: "guide:trial_intro", payload: {}, created_at: new Date().toISOString() }] : [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ signedIn, session, standalone, ios, qaFont }) => {
    if (signedIn) localStorage.setItem("sb-example-auth-token", JSON.stringify(session));
    Object.defineProperty(navigator, "platform", { get: () => ios ? "iPhone" : "Linux x86_64" });
    Object.defineProperty(navigator, "standalone", { get: () => standalone });
    const match = window.matchMedia.bind(window);
    window.matchMedia = value => /display-mode: (standalone|fullscreen)/.test(value) ? { matches: standalone, media: value, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} } : match(value);
    const registration = { update: async () => {}, pushManager: { getSubscription: async () => null } };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: async () => registration, ready: Promise.resolve(registration) } });
    if (!window.PushManager) window.PushManager = function(){};
    if (!window.Notification) window.Notification = class { static permission = "default"; };
    Object.defineProperty(window.Notification, "permission", { configurable: true, get: () => "default" });
    if (qaFont && document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = '@font-face{font-family:"QA Zen";src:url("/__qa_font.woff2")}body,button,input,select,p,h1,h2,h3,span,div,a{font-family:"QA Zen",sans-serif!important}';
      document.head.appendChild(style);
    }, { once: true });
  }, { signedIn, session, standalone, ios, qaFont: Boolean(process.env.QA_FONT_FILE) });
  await context.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    const json = (value, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
    if (url.hostname === "example.supabase.co") return json(user);
    if (url.origin !== origin) return route.abort();
    if (process.env.QA_FONT_FILE && (url.pathname.endsWith(".woff2") || url.pathname === "/__qa_font.woff2")) return route.fulfill({ contentType: "font/woff2", body: fs.readFileSync(process.env.QA_FONT_FILE) });
    if (!url.pathname.startsWith("/api/")) {
      return route.fulfill(await getLocal(base + url.pathname + url.search, req.headers()));
    }
    if (url.pathname === "/api/records/access") return json({ data: { access: fixtureAccess } });
    if (url.pathname.startsWith("/api/diagnosis/v2/events/") && req.method() !== "GET") {
      diagnosisWrites.push({ path: url.pathname, method: req.method(), body: req.postDataJSON() });
      return json({ error: "Unexpected diagnosis write in navigation QA" }, 409);
    }
    if (url.pathname === "/api/diagnosis/v2/events/" + resultId) {
      if (resultKind === "notFound") return json({ error: "Not found" }, 404);
      return json({ data: {
        id: resultId, created_at: "2026-10-29T00:00:00Z", is_attached: true,
        is_current: resultKind !== "history", is_first_result: resultKind === "first", has_current_profile: true,
        current_core_code: resultKind === "history" ? "accel_batt_standard" : "brake_batt_small",
        retake_required: resultKind === "retake", diagnosis_symptom_focus: "fatigue", active_symptom_focus: "fatigue",
        answers: { symptom_focus: "fatigue", env_vectors: ["pressure_down", "cold", "damp"] },
        computed: { core_code: "brake_batt_small", sub_labels: ["qi_deficiency", "fluid_damp"],
          axes: { yin_yang_score: -0.2, battery_score: 0.25, thermo_answer: "neutral" },
          env: { sensitivity: 0.5, vectors: ["pressure_down", "cold", "damp"] }, split_scores: {}, material_scores: {} }
      } });
    }
    if (url.pathname === "/api/experience") {
      if (req.method() === "POST") {
        const b = req.postDataJSON(), day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0,10);
        const key = b.type === "use" || b.type === "hardware" ? b.type + ":" + b.id + ":" + day : b.type + ":" + b.id;
        if (!rows.some(r => r.event_key === key)) rows.push({ event_key: key, payload: {}, created_at: new Date().toISOString() });
        return json({ data: { saved: true } });
      }
      return json({ data: { rows, access: fixtureAccess, recordDays: 0 } });
    }
    if (url.pathname === "/api/journey") { metrics.push(req.postDataJSON()); return json({ ok: true }); }
    if (url.pathname === "/api/funnel") return route.fulfill({ status: 204 });
    if (url.pathname === "/api/radar/location") {
      if (req.method() === "POST") hasLocation = true;
      return json({ ok: true, location: hasLocation ? { id: "qa-location", display_name: "東京", label: "東京", lat: 35.68, lon: 139.69 } : null });
    }
    if (url.pathname === "/api/radar/v1/forecast" && !hasLocation) return json({ error: "No radar location found." }, 400);
    if (url.pathname === "/api/radar/v1/forecast/public") {
      publicRequests.push(Object.fromEntries(url.searchParams));
      if (publicState === "error") return json({ ok: false, error: "QA unavailable" }, 503);
      if (publicState === "network") return route.abort();
      const date = publicState === "wrong-date" ? "2026-10-30" : url.searchParams.get("date");
      const osaka = url.searchParams.get("lon") === "135.52";
      return json({ ok: true, target_date: date, forecast: {
        score_0_10: osaka ? 7 : 4, score_display_0_10: osaka ? 7.2 : 4.4, signal: osaka ? 2 : 1,
        main_trigger: osaka ? "moisture" : "pressure", trigger_dir: osaka ? "damp" : "down",
        personal_main_trigger_exact: osaka ? "damp" : "pressure_down",
        weather_load_groups: {
          temperature: { exact: "cold", personal_load: osaka ? 0.18 : 0.8, personalized: false },
          moisture: { exact: "dry", personal_load: osaka ? 0.82 : 0.45, personalized: false },
          pressure: { exact: "pressure_up", personal_load: osaka ? 0.44 : 0.12, personalized: false },
        },
      } });
    }
    if (url.pathname.startsWith("/api/radar/v1/forecast")) {
      const date = url.searchParams.get("date") || new Date(Date.now() + 9 * 3600000).toISOString().slice(0,10);
      return json({ ok: true, target_date: date, location: { display_name: "東京", label: "東京" }, forecast: {
        target_date: date, score_0_10: 4, signal: 1, dominant_trigger: "down", computed: { radar_plan_meta: { risk_context: {
          constitution_context: { core_code: "brake_batt_small", sub_labels: [], symptom_focus: "fatigue" },
          target: { signal: 1, score_0_10: 4 }, summary: "検証用の予報です。"
        } } }
      }, care_plan: {} });
    }
    if (url.pathname === "/api/radar/care-actions") return json({ data: { actions: [], completed_care: [], schema_ready: true } });
    if (url.pathname === "/api/radar/review") return json({ data: { review: null } });
    if (url.pathname === "/api/care-shop/items") return json({ data: { items: [] } });
    return json({ data: [] });
  });
  return { context, page, errors, metrics, diagnosisWrites, publicRequests, close: async () => { await context.close(); await browser.close(); } };
}

async function verifyResultStack(page) {
  await page.waitForFunction(() => {
    const tabs = document.querySelector('[aria-label="アプリのメニュー"]');
    const cta = document.querySelector(".result-save-cta-enter");
    if (!tabs || !cta) return false;
    const t = tabs.getBoundingClientRect(), c = cta.getBoundingClientRect();
    return Math.abs(c.bottom - t.top) < 1 && c.top >= 0;
  });
  const tabs = page.getByRole("navigation", { name: "アプリのメニュー" });
  const sizes = await tabs.evaluate(el => ({ height: el.getBoundingClientRect().height,
    reserved: parseFloat(getComputedStyle(el.parentElement).paddingBottom) }));
  assert.ok(Math.abs(sizes.height - sizes.reserved) < 1, "shell reserves the measured tab height");
  assert.equal(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth), true);
}

(async () => {
  let server;
  if (process.env.QA_START_SERVER === "1") {
    server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", new URL(base).port || "3109"], {
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-public-placeholder", SUPABASE_SERVICE_ROLE_KEY: "qa-server-placeholder" },
    });
    for (let i = 0; ; i++) {
      try { await getLocal(base); break; } catch (error) { if (i >= 80) { server.kill(); throw error; } await new Promise(resolve => setTimeout(resolve, 100)); }
    }
  }
  let options = { headless: true };
  if (process.env.QA_CHROMIUM_MODULE) {
    const mod = require(process.env.QA_CHROMIUM_MODULE), bin = mod.default || mod;
    options = { ...options, executablePath: process.env.QA_CHROMIUM_EXECUTABLE || await bin.executablePath(), args: bin.args };
  }
  const browser = options;
  try {
    for (const width of [320, 390, 820]) {
      const f = await fixture(browser, { signedIn: false, width });
      await f.page.clock.setFixedTime(new Date("2026-10-30T02:00:00Z"));
      await f.page.goto(origin);
      await f.page.getByText("記録・AI相談", { exact: true }).waitFor();
      await f.page.getByText("明日はいたわりモード。今から少しずつ整えておこう。", { exact: true }).waitFor();
      await f.page.getByText("明日 10/31(土)", { exact: true }).waitFor();
      assert.equal(f.publicRequests.at(-1).date, "2026-10-31");
      const circular = f.page.getByRole("img", { name: "参考体質の明日の体調警戒度 44／100、いたわりモード", exact: true });
      await circular.waitFor();
      await circular.getByText("いたわりたい日", { exact: true }).waitFor();
      assert.equal(await circular.getByText("いたわりたい日", { exact: true }).evaluate(el => getComputedStyle(el).whiteSpace), "nowrap");
      assert.equal(await circular.locator('svg[viewBox="0 0 340 300"]').count(), 1);
      assert.equal(await circular.locator('svg text tspan').first().textContent(), "44");
      assert.equal(await f.page.getByLabel("低温 ストレス 高", { exact: true }).count(), 1);
      assert.equal(await f.page.getByLabel("乾燥 ストレス 中", { exact: true }).count(), 1);
      assert.equal(await f.page.getByLabel("気圧上昇 ストレス 低", { exact: true }).count(), 1);
      assert.equal(await f.page.getByText("今日のモード", { exact: true }).count(), 0);
      const cta = f.page.getByRole("button", { name: "体質チェックして体調予報へ", exact: true }).first();
      assert.ok((await cta.boundingBox()).y < 844, "CTA is visible without scrolling");
      const demo = f.page.getByRole("button", { name: "体質チェックして自分の体調予報を見る", exact: true });
      assert.ok((await cta.boundingBox()).y < (await demo.boundingBox()).y, "hero CTA stays before demo");
      assert.ok((await demo.boundingBox()).y < (await f.page.getByText("START GUIDE", { exact: true }).boundingBox()).y, "start guide stays after demo");
      for (const button of await f.page.getByRole("button", { name: "体質チェックして体調予報へ", exact: true }).all()) {
        assert.equal(await button.evaluate(el => getComputedStyle(el).whiteSpace), "nowrap");
        assert.equal(await button.evaluate(el => el.scrollWidth <= el.clientWidth), true, "CTA fits on one line");
      }
      assert.equal(await f.page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth), true);
      assert.equal(await f.page.getByText("無料体験", { exact: true }).count(), 0);
      await f.page.screenshot({ path: path.join(output, "home-" + width + ".png"), fullPage: true });
      await demo.scrollIntoViewIfNeeded();
      await f.page.screenshot({ path: path.join(output, "home-demo-" + width + ".png"), fullPage: false });
      await cta.click();
      await f.page.waitForURL("**/check");
      assert.equal(f.errors.length, 0, f.errors.join("\n"));
      report.push("home " + width + "px: hero/CTA retained, shared circular 44/100 gauge, three real weather levels, tomorrow date/copy, no overflow, check destination");
      if (width === 390) {
        await f.page.goto(origin);
        await f.page.locator("select").selectOption("osaka");
        await f.page.getByText("明日は守りモード。予定に余裕を持って備えようね。", { exact: true }).waitFor();
        await f.page.getByRole("img", { name: "参考体質の明日の体調警戒度 72／100、守りモード", exact: true }).waitFor();
        assert.equal(await f.page.getByLabel("低温 ストレス 低", { exact: true }).count(), 1);
        assert.equal(await f.page.getByLabel("乾燥 ストレス 高", { exact: true }).count(), 1);
        assert.equal(await f.page.getByLabel("気圧上昇 ストレス 中", { exact: true }).count(), 1);
        assert.deepEqual(f.publicRequests.at(-1), { lat: "34.68639", lon: "135.52", date: "2026-10-31" });
        assert.equal(await f.page.getByText("明日 10/31(土)", { exact: true }).count(), 1);
        report.push("guest region change: Osaka weather response updates signal and keeps tomorrow");
        await f.page.getByRole("button", { name: "体質チェックして自分の体調予報を見る", exact: true }).click();
        await f.page.waitForURL("**/check");
        report.push("circular demo card: click still opens the check entry");
        await f.page.goto(origin);
        await f.page.getByRole("button", { name: "ログイン", exact: true }).click();
        await f.page.waitForURL(url => url.pathname === "/signup" && url.searchParams.get("next") === "/");
        await f.page.goto(origin);
        await f.page.getByRole("button", { name: "ログインする", exact: true }).click();
        await f.page.waitForURL(url => url.pathname === "/signup" && url.searchParams.get("next") === "/");
        assert.equal(f.errors.length, 0, f.errors.join("\n"));
        report.push("return login: header and start-guide buttons keep the explicit home return path");
      }
      await f.close();
    }
    for (const [time, timezoneId, expectedDate, expectedTitle] of [
      ["2026-10-30T12:00:00Z", "Asia/Tokyo", "2026-10-31", "明日 10/31(土)"],
      ["2026-10-30T14:59:59Z", "UTC", "2026-10-31", "明日 10/31(土)"],
      ["2026-10-30T15:00:01Z", "America/Los_Angeles", "2026-11-01", "明日 11/1(日)"],
      ["2026-12-31T12:00:00Z", "Asia/Tokyo", "2027-01-01", "明日 1/1(金)"],
    ]) {
      const f = await fixture(browser, { signedIn: false, timezoneId });
      await f.page.clock.setFixedTime(new Date(time));
      await f.page.goto(origin);
      await f.page.getByText(expectedTitle, { exact: true }).waitFor();
      await f.page.getByText("明日はいたわりモード。今から少しずつ整えておこう。", { exact: true }).waitFor();
      assert.equal(f.publicRequests.at(-1).date, expectedDate);
      assert.deepEqual(f.errors, []);
      report.push("tomorrow boundary: " + time + " in " + timezoneId + " => " + expectedDate);
      await f.close();
    }
    for (const publicState of ["error", "network", "wrong-date"]) {
      const f = await fixture(browser, { signedIn: false, publicState });
      await f.page.clock.setFixedTime(new Date("2026-10-30T02:00:00Z"));
      await f.page.goto(origin);
      await f.page.getByText("明日の予報を読み込めませんでした。時間をおいてお試しください。", { exact: true }).waitFor();
      assert.equal(await f.page.getByRole("img", { name: /^参考体質の明日の体調警戒度/ }).count(), 0);
      assert.equal(await f.page.getByText("出やすいサイン", { exact: true }).count(), 0);
      await f.page.getByRole("button", { name: "体質チェックして体調予報へ", exact: true }).first().click();
      await f.page.waitForURL("**/check");
      assert.deepEqual(f.errors, []);
      report.push("tomorrow " + publicState + ": explicit error, no fake stable score/signs, CTA stays usable");
      await f.close();
    }
    const expiredHome = await fixture(browser, { expired: true });
    await expiredHome.page.clock.setFixedTime(new Date("2026-10-30T12:00:00Z"));
    await expiredHome.page.goto(origin);
    await expiredHome.page.getByText("今日 10/30(金)", { exact: true }).waitFor();
    await expiredHome.page.getByText("今日のモード", { exact: true }).waitFor();
    assert.equal(expiredHome.publicRequests.at(-1).date, "2026-10-30");
    await expiredHome.page.getByText("あなた向けの予報を続ける", { exact: true }).waitFor();
    assert.deepEqual(expiredHome.errors, []);
    report.push("signed-in expired home: explicit today even after 18:00, existing paywall retained");
    await expiredHome.close();
    if (process.env.QA_HOME_ONLY === "1") {
      console.log(JSON.stringify({ passed: report.length, checks: report }, null, 2));
      return;
    }
    const f = await fixture(browser);
    await f.page.goto(origin + "/radar");
    await f.page.getByRole("dialog").filter({ hasText: "14日" }).waitFor();
    assert.equal(await f.page.getByText("あなたの体調予報です", { exact: true }).count(), 0);
    await f.page.getByRole("button", { name: "無料体験の案内を閉じる" }).click();
    await f.page.clock.install();
    await f.page.clock.runFor(32000);
    await f.page.getByText("ホーム画面に追加できます", { exact: true }).waitFor();
    await f.page.screenshot({ path: path.join(output, "chrome-pwa.png"), fullPage: false });
    await f.page.getByRole("button", { name: "手順", exact: true }).click();
    await f.page.getByRole("dialog", { name: "ホーム画面に追加する手順" }).waitFor();
    assert.ok((await f.page.getByRole("dialog").textContent()).includes("Chrome"));
    assert.equal(await f.page.getByText("体調予報の通知を受け取る", { exact: true }).count(), 0);
    assert.equal(f.errors.length, 0, f.errors.join("\n"));
    report.push("forecast: trial retained, care guide removed, Chrome PWA after cooldown without new action, push hidden in iOS tab");
    await f.close();

    const loc = await fixture(browser, { location: false, trialSeen: true });
    await loc.page.goto(origin + "/radar");
    await loc.page.getByText("位置情報の設定が必要です", { exact: true }).waitFor();
    await loc.page.clock.install();
    await loc.page.clock.runFor(35000);
    assert.equal(await loc.page.getByText("ホーム画面に追加できます", { exact: true }).count(), 0);
    assert.ok(loc.metrics.some(e => e.event === "forecast_page_view"));
    assert.ok(loc.metrics.some(e => e.event === "location_setup_view"));
    const select = loc.page.locator("select").first();
    const value = await select.locator("option").nth(1).getAttribute("value");
    await select.selectOption(value);
    await loc.page.getByRole("button", { name: "この地域で設定する", exact: true }).click();
    await loc.page.clock.runFor(2000);
    await loc.page.getByText("今日の体調予報", { exact: true }).waitFor();
    assert.ok(loc.metrics.some(e => e.event === "location_save_start" && e.method === "preset"));
    assert.ok(loc.metrics.some(e => e.event === "location_save_success" && e.method === "preset"));
    assert.equal(loc.errors.length, 0, loc.errors.join("\n"));
    report.push("location setup: no premature popup; page/setup/save metrics distinct and no SQL");
    await loc.close();

    const push = await fixture(browser, { standalone: true, trialSeen: true });
    await push.page.goto(origin + "/radar");
    await push.page.getByText("体調予報の通知を受け取る", { exact: true }).waitFor();
    assert.equal(await push.page.getByText("ホーム画面に追加できます", { exact: true }).count(), 0);
    assert.equal(push.errors.length, 0, push.errors.join("\n"));
    report.push("iOS standalone: push invitation available, install invitation suppressed");
    await push.close();

    for (const width of [320, 390, 820]) {
      const r = await fixture(browser, { width, trialSeen: true });
      await r.page.goto(origin + "/result/" + resultId + "?from=check_complete");
      await r.page.getByText("ハリネズミ型", { exact: true }).waitFor();
      const tabs = r.page.getByRole("navigation", { name: "アプリのメニュー" });
      assert.equal(await tabs.getByRole("button").count(), 5);
      assert.equal(await tabs.getByRole("button", { name: "トリセツ", exact: true }).getAttribute("aria-current"), "page");
      assert.equal(await r.page.locator(".result-save-cta-enter").count(), 0);
      await r.page.evaluate(() => window.scrollTo(0, 240));
      await r.page.locator(".result-save-cta-enter").waitFor();
      await verifyResultStack(r.page);
      // Simulate a 34px home-indicator area; no claim of an actual iOS run.
      await tabs.evaluate(el => { el.style.paddingBottom = "34px"; });
      await verifyResultStack(r.page);
      if (width === 390) {
        await r.page.setViewportSize({ width: 844, height: 390 });
        await verifyResultStack(r.page);
        await r.page.setViewportSize({ width, height: 844 });
        await verifyResultStack(r.page);
      }
      await r.page.screenshot({ path: path.join(output, "result-" + width + "-safe-area.png"), fullPage: false });
      await r.page.getByRole("button", { name: "予報とケアの案内を閉じる", exact: true }).click();
      await r.page.getByRole("button", { name: "天気相性", exact: true }).click();
      assert.equal(await r.page.locator(".result-save-cta-enter").count(), 0);
      assert.equal(await tabs.getByRole("button").count(), 5);
      await tabs.getByRole("button", { name: "体調予報", exact: true }).click();
      await r.page.waitForURL("**/radar");
      assert.equal(r.diagnosisWrites.length, 0);
      assert.equal(r.errors.length, 0, r.errors.join("\n"));
      report.push("result " + width + "px: five tabs, active Trisetsu, CTA above resized/safe-area nav, close persists, forecast tab works without profile writes");
      await r.close();
    }

    const initial = await fixture(browser, { trialSeen: true });
    await initial.page.goto(origin + "/result/" + resultId + "?from=check_complete");
    await initial.page.getByText("ハリネズミ型", { exact: true }).waitFor();
    await initial.page.evaluate(() => window.scrollTo(0, 240));
    await initial.page.locator(".result-save-cta-enter").getByRole("button", { name: "予報とケアを見る", exact: true }).click();
    await initial.page.waitForURL("**/radar");
    assert.ok(initial.metrics.some(e => e.event === "forecast_cta_click" && e.position === "floating_save"));
    assert.equal(initial.diagnosisWrites.length, 0);
    assert.equal(initial.errors.length, 0, initial.errors.join("\n"));
    report.push("initial result: floating CTA retains navigation and authenticated click metrics");
    await initial.close();

    for (const resultKind of ["first", "history"]) {
      const r = await fixture(browser, { resultKind, trialSeen: true });
      await r.page.goto(origin + "/result/" + resultId + "?from=" + (resultKind === "history" ? "history" : "home"));
      await r.page.getByText("ハリネズミ型", { exact: true }).waitFor();
      await r.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      assert.equal(await r.page.locator(".result-save-cta-enter").count(), 0);
      const tabs = r.page.getByRole("navigation", { name: "アプリのメニュー" });
      const finalText = await r.page.getByText("Result ID: " + resultId, { exact: true }).boundingBox();
      assert.ok(finalText.y + finalText.height <= (await tabs.boundingBox()).y);
      await tabs.getByRole("button", { name: "体調予報", exact: true }).click();
      await r.page.waitForURL("**/radar");
      assert.equal(r.diagnosisWrites.length, 0);
      assert.equal(r.errors.length, 0, r.errors.join("\n"));
      report.push("result " + resultKind + " revisit: no introductory CTA, footer clear of tabs, no implicit result adoption");
      await r.close();
    }

    for (const resultKind of ["notFound", "retake"]) {
      const r = await fixture(browser, { resultKind, trialSeen: true });
      await r.page.goto(origin + "/result/" + resultId);
      await r.page.getByText(resultKind === "notFound" ? "トリセツが見つかりません" : "体質チェックが新しくなりました", { exact: true }).waitFor();
      const tabs = r.page.getByRole("navigation", { name: "アプリのメニュー" });
      assert.equal(await tabs.getByRole("button").count(), 5);
      assert.equal(await r.page.locator(".result-save-cta-enter").count(), 0);
      assert.equal(r.errors.length, 0, r.errors.join("\n"));
      report.push("result " + resultKind + ": navigation remains available without a forecast CTA");
      await r.close();
    }
    console.log(JSON.stringify({ passed: report.length, checks: report }, null, 2));
  } finally { for (const browser of launched) await browser.close().catch(() => {}); server?.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
