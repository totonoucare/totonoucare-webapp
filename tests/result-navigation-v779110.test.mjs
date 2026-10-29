import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = name => readFile(new URL("../" + name, import.meta.url), "utf8");

test("home CTA explicitly names the body forecast and keeps its existing entry points", async () => {
  const copy = await source("lib/homeEntryCopy.js");
  assert.match(copy, /HOME_CHECK_CTA = "体質チェックして体調予報へ"/);
  const home = await source("app/HomeClient.jsx");
  assert.equal((home.match(/\{HOME_CHECK_CTA\}/g) || []).length, 2);
  assert.equal((home.match(/min-\[375px\]:!text-\[14px\] whitespace-nowrap/g) || []).length, 2);
  assert.match(home, /router\.push\("\/check"\)/);
  assert.match(home, /router\.push\("\/signup\?next=%2F"\)/);
  assert.match(home, /ログインする/);
});

test("all result-shell states expose the existing navigation with Trisetsu active", async () => {
  const result = await source("app/result/[id]/page.js");
  assert.equal((result.match(/<AppShell title="体質トリセツ"/g) || []).length, 4);
  assert.doesNotMatch(result, /noTabs/);
  const tabs = await source("components/nav/BottomTabs.js");
  assert.match(tabs, /pathname\.startsWith\("\/result"\) \? "check"/);
  assert.match(tabs, /aria-current=\{isActive \? "page" : undefined\}/);
  for (const target of ["ホーム", "トリセツ", "体調予報", "記録・相談", "ショップ"]) assert.ok(tabs.includes(target));
});

test("the CTA and shell reserve the measured tab height, including the safe area", async () => {
  const tabs = await source("components/nav/BottomTabs.js");
  assert.match(tabs, /tabs\.getBoundingClientRect\(\)\.height/);
  assert.match(tabs, /new ResizeObserver\(measure\)/);
  assert.match(tabs, /observer\?\.observe\(tabs, \{ box: "border-box" \}\)/);
  assert.match(tabs, /window\.addEventListener\("resize", measure\)/);
  assert.match(tabs, /shell\.style\.setProperty\("--app-bottom-tabs-height"/);
  assert.match(tabs, /observer\?\.disconnect\(\)/);
  assert.match(tabs, /shell\.style\.removeProperty\("--app-bottom-tabs-height"\)/);
  const shell = await source("components/layout/AppShell.js");
  assert.match(shell, /paddingBottom: "var\(--app-bottom-tabs-height, calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\)\)"/);
  const result = await source("app/result/[id]/page.js");
  const sticky = result.slice(result.indexOf("function SaveStickyBar"), result.indexOf("function buildForecastConstitution"));
  assert.match(sticky, /bottom: "var\(--app-bottom-tabs-height, calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\)\)"/);
  assert.match(sticky, /pb-2\.5/);
  assert.doesNotMatch(sticky, /bottom-0|pb-\[calc\(env/);
  assert.match(result, /mt-3 space-y-6 pb-32/);
});

test("the first-result-only reveal and dismissal contract is preserved", async () => {
  const result = await source("app/result/[id]/page.js");
  assert.match(result, /shouldShowResultIntroCta\(\{ isLoggedIn, event, from \}\)/);
  assert.match(result, /observeResultSaveCtaScroll\(window, \(\) => setVisible\(true\)\)/);
  assert.match(result, /dismissResultCta\(id\)/);
  assert.match(result, /\{showIntroCta \? <SaveStickyBar/);
  const tabs = await source("components/nav/BottomTabs.js");
  assert.match(tabs, /onClick=\{\(\) => router\.push\(href\)\}/);
  assert.doesNotMatch(tabs, /attachToAccount|confirm_update|fetch\(/);
});
