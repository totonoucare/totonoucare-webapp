// Production-build browser QA. All auth/API data is synthetic. External requests
// are intercepted; this script never reaches production DB, Meta or OAuth.
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

async function fixture(launchOptions, { signedIn = true, location = true, width = 390, ios = true, standalone = false, trialSeen = false } = {}) {
  const browser = await chromium.launch(launchOptions);
  launched.push(browser);
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block",
    userAgent: ios ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1" : undefined });
  const page = await context.newPage(), errors = [], metrics = [];
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
    if (url.pathname === "/api/records/access") return json({ data: { access } });
    if (url.pathname === "/api/experience") {
      if (req.method() === "POST") {
        const b = req.postDataJSON(), day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0,10);
        const key = b.type === "use" || b.type === "hardware" ? b.type + ":" + b.id + ":" + day : b.type + ":" + b.id;
        if (!rows.some(r => r.event_key === key)) rows.push({ event_key: key, payload: {}, created_at: new Date().toISOString() });
        return json({ data: { saved: true } });
      }
      return json({ data: { rows, access, recordDays: 0 } });
    }
    if (url.pathname === "/api/journey") { metrics.push(req.postDataJSON()); return json({ ok: true }); }
    if (url.pathname === "/api/funnel") return route.fulfill({ status: 204 });
    if (url.pathname === "/api/radar/location") {
      if (req.method() === "POST") hasLocation = true;
      return json({ ok: true, location: hasLocation ? { id: "qa-location", display_name: "東京", label: "東京", lat: 35.68, lon: 139.69 } : null });
    }
    if (url.pathname === "/api/radar/v1/forecast" && !hasLocation) return json({ error: "No radar location found." }, 400);
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
  return { context, page, errors, metrics, close: async () => { await context.close(); await browser.close(); } };
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
    options = { ...options, executablePath: await bin.executablePath(), args: bin.args };
  }
  const browser = options;
  try {
    for (const width of [320, 390, 820]) {
      const f = await fixture(browser, { signedIn: false, width });
      await f.page.goto(origin);
      await f.page.getByText("記録・AI相談", { exact: true }).waitFor();
      const cta = f.page.getByRole("button", { name: "体質チェックして予報へ", exact: true }).first();
      assert.ok((await cta.boundingBox()).y < 844, "CTA is visible without scrolling");
      assert.equal(await f.page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth), true);
      assert.equal(await f.page.getByText("無料体験", { exact: true }).count(), 0);
      await f.page.screenshot({ path: path.join(output, "home-" + width + ".png"), fullPage: true });
      await cta.click();
      await f.page.waitForURL("**/check");
      assert.equal(f.errors.length, 0, f.errors.join("\n"));
      report.push("home " + width + "px: CTA, records/AI, no trial promotion, no overflow, check destination");
      await f.close();
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
    console.log(JSON.stringify({ passed: report.length, checks: report }, null, 2));
  } finally { for (const browser of launched) await browser.close().catch(() => {}); server?.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
