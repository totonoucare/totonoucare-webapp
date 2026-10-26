import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = name => readFile(new URL(`../${name}`, import.meta.url), "utf8");
const load = async name => import("data:text/javascript;base64," + Buffer.from(await source(name)).toString("base64"));
const policy = await load("lib/trialWelcome.js");
const experience = await load("lib/experience/policy.js");
const now = Date.parse("2026-10-26T09:00:00Z");
const access = { mode: "trial", trial_enabled: true, trial_ends_at: "2026-11-09T08:59:59.999Z" };

test("only a current trial with a valid deadline is eligible", () => {
  assert.equal(policy.trialWelcomeEligible({ access, now }), true);
  for (const mode of ["paid", "beta", "free", "expired", undefined]) {
    assert.equal(policy.trialWelcomeEligible({ access: { ...access, mode }, now }), false);
  }
  for (const overrides of [{ trial_enabled: false }, { entitled: true }, { beta_enabled: true }, { trial_ends_at: null }, { trial_ends_at: "bad" }, { trial_ends_at: "2026-10-26T08:59:59Z" }]) {
    assert.equal(policy.trialWelcomeEligible({ access: { ...access, ...overrides }, now }), false);
  }
});

test("deadline uses the exact trial boundary rather than a calendar-day extension", () => {
  const end = Date.parse(access.trial_ends_at);
  assert.equal(policy.trialWelcomeActive(access, end), true);
  assert.equal(policy.trialWelcomeActive(access, end + 1), false);
});

test("the account receipt suppresses the introduction on another device", () => {
  const rows = [{ event_key: "guide:trial_intro" }];
  assert.equal(policy.trialWelcomeEligible({ access, rows, now }), false);
  assert.equal(policy.trialWelcomeEligible({ access, seen: true, now }), false);
  assert.equal(policy.trialWelcomeEligible({ access, rows: [{ event_key: "guide:forecast" }], now }), true);
});

test("local outage protection is scoped to the account and contains no health data", () => {
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) } };
  try {
    policy.rememberTrialWelcome("user-a");
    assert.equal(policy.readTrialWelcomeSeen("user-a"), true);
    assert.equal(policy.readTrialWelcomeSeen("user-b"), false);
    assert.equal(policy.readTrialWelcomeSeen(""), false);
    assert.deepEqual([...storage.entries()], [["mibyo-trial-welcome:user-a", "1"]]);
  } finally { delete globalThis.window; }
});

test("unavailable browser storage never blocks forecast use", () => {
  assert.doesNotThrow(() => policy.rememberTrialWelcome("user-a"));
  globalThis.window = Object.defineProperty({}, "localStorage", { get() { throw Error("blocked"); } });
  try {
    assert.doesNotThrow(() => policy.rememberTrialWelcome("user-a"));
    assert.equal(policy.readTrialWelcomeSeen("user-a"), false);
  } finally { delete globalThis.window; }
});

test("deadline is rendered in Japan time with hours and minutes", () => {
  const result = policy.formatTrialEnd("2026-11-08T15:45:00Z");
  assert.match(result, /11月9日/);
  assert.match(result, /00:45/);
  assert.equal(policy.formatTrialEnd("bad"), "");
});

test("the existing authenticated experience API accepts the new guide id", async () => {
  assert.equal(experience.GUIDE_IDS.includes(policy.TRIAL_WELCOME_ID), true);
  const api = (await source("app/api/experience/route.js")).replace(/^import .*;\n/gm, "").replace(/export /g, "");
  const writes = [];
  const POST = new Function("NextResponse", "requireUser", "supabaseServer", "GUIDE_IDS", "FEATURE_IDS", "SURVEYS", api + ";return POST;")(
    { json: (body, options) => ({ body, ...options }) },
    async () => ({ user: { id: "owner" } }),
    { from: () => ({ upsert: async (row, options) => { writes.push({ row, options }); return { error: null }; } }) },
    experience.GUIDE_IDS, experience.FEATURE_IDS, experience.SURVEYS,
  );
  const response = await POST({ json: async () => ({ type: "guide", id: "trial_intro", user_id: "someone-else" }) });
  assert.equal(response.status, 200);
  assert.equal(writes[0].row.user_id, "owner");
  assert.equal(writes[0].row.event_key, "guide:trial_intro");
  assert.equal(writes[0].options.ignoreDuplicates, true);
});

test("welcome is requested only in the fully rendered forecast branch", async () => {
  const radar = await source("app/radar/page.js");
  assert.equal(radar.split("<TrialWelcomeTrigger />").length - 1, 1);
  assert.ok(radar.indexOf("<TrialWelcomeTrigger />") > radar.indexOf("if (!bundle || !forecast)"));
  const provider = await source("components/experience/ExperienceProvider.jsx");
  assert.match(provider, /requests\[TRIAL_WELCOME_ID\]\?\.eligible/);
  assert.match(provider, /priority:120/);
  assert.match(provider, /rememberTrialWelcome\(user.id\)/);
});

test("check welcome contains no payment or trial promotion", async () => {
  const welcome = await source("components/auth/CheckLoginWelcome.jsx");
  assert.match(welcome, /ログインしてください/);
  assert.doesNotMatch(welcome, /14日|無料登録|支払い|自動課金|580円/);
  const signup = await source("app/signup/SignupClient.js");
  assert.match(signup, /params\.isBeforeCheck \? <CheckLoginWelcome/);
  assert.match(signup, /Googleアカウントでログイン/);
  assert.match(signup, /メールアドレスでログイン/);
  assert.match(signup, /!params\.isBeforeCheck \? <p[\s\S]*?14日間/);
  const landing = await source("app/check/page.js");
  assert.match(landing, /ログインして体質チェックへ/);
  assert.doesNotMatch(landing, /無料登録して|支払い情報|自動課金/);
});

test("dialog has accessible dismissal, scroll containment and no checkout action", async () => {
  const dialog = await source("components/billing/TrialWelcomeDialog.jsx");
  for (const text of ['role="dialog"', 'aria-modal="true"', 'aria-labelledby={titleId}', 'h-12 w-12', 'event.key === "Escape"', 'event.key !== "Tab"', 'previousOverflow', 'previousFocus', '月額580円', '無料体験の案内を閉じる', '予報を見る']) assert.ok(dialog.includes(text), text);
  assert.doesNotMatch(dialog, /CheckoutButton|\/api\/billing|\/api\/stripe/);
  assert.match(await source("app/settings/page.js"), /formatTrialEnd\(billingStatus\?\.access\?\.trial_ends_at\)/);
});
