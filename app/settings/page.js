"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import {
  RADAR_LOCATION_PRESETS,
  flattenRadarLocationPresets,
} from "@/lib/radar_v1/locationPresets";
import { SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";

const FLAT_PRESETS = flattenRadarLocationPresets();
const SYMPTOM_OPTIONS = Object.entries(SYMPTOM_LABELS).map(([value, label]) => ({ value, label }));

function Row({ label, value, action }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div>
        <div className="text-[13px] font-black text-slate-900">{label}</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{value || "—"}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function ToggleRow({ label, description, checked, disabled, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] font-black text-slate-900">{label}</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{description}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-8 w-14 shrink-0 rounded-full transition-all disabled:opacity-50",
          checked ? "bg-[var(--accent)]" : "bg-slate-200",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={[
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all",
            checked ? "left-7" : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function getJstDateString(offsetDays = 0) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const base = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00+09:00`);
  base.setDate(base.getDate() + offsetDays);

  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    window.navigator?.standalone === true
  );
}

function isProbablyIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && Number(window.navigator.maxTouchPoints || 0) > 1);
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [karteCount, setKarteCount] = useState(null);
  const [error, setError] = useState("");

  const [notificationSettings, setNotificationSettings] = useState(null);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  const [location, setLocation] = useState(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const [activeSymptomProfile, setActiveSymptomProfile] = useState(null);
  const [selectedSymptomKey, setSelectedSymptomKey] = useState("");
  const [savingSymptom, setSavingSymptom] = useState(false);
  const [symptomMessage, setSymptomMessage] = useState("");

  const [pwaGuideOpen, setPwaGuideOpen] = useState(false);
  const [standalone, setStandalone] = useState(false);

  async function authedFetch(path, options = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("ログインが必要です。");

    const res = await fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setStandalone(isStandalonePwa());

        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(data?.user || null);

        if (!data?.user) return;

        const [unlocksRes, notificationRes, locationRes, symptomRes] = await Promise.allSettled([
          supabase
            .from("personal_karte_unlocks")
            .select("id", { count: "exact", head: true })
            .eq("user_id", data.user.id)
            .in("status", ["active", "paid"]),
          authedFetch("/api/push/settings"),
          authedFetch("/api/radar/location"),
          authedFetch("/api/profile/active-symptom-focus"),
        ]);

        if (cancelled) return;
        if (unlocksRes.status === "fulfilled") setKarteCount(unlocksRes.value?.count ?? 0);
        if (notificationRes.status === "fulfilled") setNotificationSettings(notificationRes.value?.settings || null);
        if (locationRes.status === "fulfilled") setLocation(locationRes.value?.location || null);
        if (symptomRes.status === "fulfilled") {
          const profile = symptomRes.value?.profile || null;
          setActiveSymptomProfile(profile);
          setSelectedSymptomKey(profile?.active_symptom_focus || profile?.diagnosis_symptom_focus || "");
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "設定情報を読み込めませんでした。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function saveNotificationSettings(next) {
    setSavingNotifications(true);
    setNotificationMessage("");
    try {
      const json = await authedFetch("/api/push/settings", {
        method: "POST",
        body: JSON.stringify(next),
      });
      setNotificationSettings(json.settings);
      setNotificationMessage("通知設定を保存しました。");
    } catch (e) {
      setNotificationMessage(e?.message || "通知設定を保存できませんでした。");
    } finally {
      setSavingNotifications(false);
    }
  }

  async function enablePushNotifications() {
    setSavingNotifications(true);
    setNotificationMessage("");
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("この端末ではWeb通知に対応していません。");
      }
      if (isProbablyIos() && !isStandalonePwa()) {
        throw new Error("iPhoneではホーム画面に追加したアプリから通知をオンにしてください。");
      }

      const permission = await window.Notification.requestPermission();
      if (permission !== "granted") throw new Error("通知が許可されませんでした。");

      const keyRes = await fetch("/api/push/register", { cache: "no-store" });
      const keyJson = await keyRes.json().catch(() => ({}));
      if (!keyRes.ok || !keyJson?.public_key) throw new Error(keyJson?.error || "通知キーを取得できませんでした。");

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyJson.public_key),
      });

      await authedFetch("/api/push/register", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      const next = {
        enabled: true,
        night_enabled: notificationSettings?.night_enabled ?? true,
        morning_enabled: notificationSettings?.morning_enabled ?? true,
        min_score: notificationSettings?.min_score ?? 6,
      };
      const json = await authedFetch("/api/push/settings", {
        method: "POST",
        body: JSON.stringify(next),
      });
      setNotificationSettings(json.settings);
      setNotificationMessage("通知をオンにしました。天気の影響が強めの日を、前日夜・当日朝にお知らせします。");
    } catch (e) {
      setNotificationMessage(e?.message || "通知をオンにできませんでした。");
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleToggleNotifications(enabled) {
    if (enabled) {
      await enablePushNotifications();
      return;
    }
    await saveNotificationSettings({
      enabled: false,
      night_enabled: notificationSettings?.night_enabled ?? true,
      morning_enabled: notificationSettings?.morning_enabled ?? true,
      min_score: notificationSettings?.min_score ?? 6,
    });
  }

  async function handleSaveSymptomFocus() {
    const current = activeSymptomProfile?.active_symptom_focus || activeSymptomProfile?.diagnosis_symptom_focus || "";
    const next = selectedSymptomKey || current;

    if (!next || next === current) {
      setSymptomMessage("変更はありません。");
      return;
    }

    setSavingSymptom(true);
    setSymptomMessage("");
    try {
      const json = await authedFetch("/api/profile/active-symptom-focus", {
        method: "PATCH",
        body: JSON.stringify({ active_symptom_focus: next }),
      });
      setActiveSymptomProfile(json.profile || null);
      setSelectedSymptomKey(json.profile?.active_symptom_focus || next);

      if (location?.id) {
        const today = getJstDateString(0);
        const tomorrow = getJstDateString(1);
        await Promise.allSettled([
          authedFetch(`/api/radar/v1/forecast?date=${today}&force=1`),
          authedFetch(`/api/radar/v1/forecast?date=${tomorrow}&force=1`),
        ]);
        setSymptomMessage("今気になる不調を更新し、今日/明日の予報も再計算しました。");
      } else {
        setSymptomMessage("今気になる不調を更新しました。地域を設定すると予報にも反映されます。");
      }
    } catch (e) {
      setSymptomMessage(e?.message || "不調の種類を更新できませんでした。");
    } finally {
      setSavingSymptom(false);
    }
  }

  async function handleSaveLocation() {
    const preset = FLAT_PRESETS.find((p) => p.key === selectedPresetKey);
    if (!preset) {
      setLocationMessage("地域を選んでください。");
      return;
    }

    setSavingLocation(true);
    setLocationMessage("");
    try {
      const saved = await authedFetch("/api/radar/location", {
        method: "POST",
        body: JSON.stringify({ lat: preset.lat, lon: preset.lon, label: preset.label }),
      });
      setLocation(saved.location || null);

      const today = getJstDateString(0);
      const tomorrow = getJstDateString(1);
      const base = `lat=${encodeURIComponent(preset.lat)}&lon=${encodeURIComponent(preset.lon)}&label=${encodeURIComponent(preset.label)}&force=1`;
      await Promise.allSettled([
        authedFetch(`/api/radar/v1/forecast?date=${today}&${base}`),
        authedFetch(`/api/radar/v1/forecast?date=${tomorrow}&${base}`),
      ]);

      setLocationMessage("地域を更新し、今日/明日の予報も再計算しました。");
    } catch (e) {
      setLocationMessage(e?.message || "地域を更新できませんでした。");
    } finally {
      setSavingLocation(false);
    }
  }

  const notificationEnabled = Boolean(notificationSettings?.enabled);
  const minScore = notificationSettings?.min_score ?? 6;
  const locationLabel = useMemo(() => {
    if (!location) return "未設定";
    return location.display_name || location.region_name || location.label || "設定済み";
  }, [location]);

  return (
    <AppShell title="設定" subtitle="アカウントとアプリ設定">
      <Module className="p-6 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="text-[22px] font-black tracking-tight text-slate-900">設定</div>
        <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
          通知、地域、使い方、報告をここから確認できます。
        </div>
      </Module>

      {error ? (
        <Module className="p-5 bg-[#fff7ed] ring-1 ring-orange-100">
          <div className="text-[13px] font-black leading-6 text-orange-800">{error}</div>
        </Module>
      ) : null}

      <Module className="overflow-hidden bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <Row label="ログイン状態" value={loading ? "確認中…" : user ? "ログイン中" : "未ログイン"} />
        <Row label="メールアドレス" value={user?.email || "未ログイン"} />
        <Row
          label="保存済みトリセツ"
          value={loading ? "確認中…" : `${karteCount ?? 0}件`}
          action={<Button size="sm" variant="secondary" onClick={() => router.push("/history")}>履歴へ</Button>}
        />
      </Module>

      <Module className="overflow-hidden bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-[16px] font-black tracking-tight text-slate-900">通知設定</div>
          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
            天気の影響が強めの日を、前日夜・当日朝に短くお知らせします。
          </div>
          <div className="mt-3 rounded-[18px] bg-[#E2F1EA]/55 p-4 text-[12px] font-bold leading-6 text-[#255F4F] ring-1 ring-[#BFD9CC]/70">
            iPhoneで通知を使う場合は、先にホーム画面へ追加してから設定します。Androidではブラウザから通知を許可できますが、ホーム画面に追加しておくとアプリのように開きやすくなります。
            <button
              type="button"
              onClick={() => setPwaGuideOpen(true)}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2.5 text-[12px] font-black text-[#255F4F] shadow-sm ring-1 ring-[#BFD9CC] active:scale-[0.99]"
            >
              {standalone ? "ホーム画面追加済み" : "ホーム画面追加の手順を見る"}
            </button>
          </div>
        </div>
        <ToggleRow
          label="通知を受け取る"
          description={notificationEnabled ? "オン：影響が強めの日だけ通知します" : "オフ：通知は送信されません"}
          checked={notificationEnabled}
          disabled={!user || savingNotifications || loading}
          onChange={handleToggleNotifications}
        />
        <ToggleRow
          label="前日夜の通知"
          description="明日に備えたい日の先回り通知"
          checked={notificationSettings?.night_enabled ?? true}
          disabled={!user || savingNotifications || !notificationEnabled}
          onChange={(value) => saveNotificationSettings({
            enabled: notificationEnabled,
            night_enabled: value,
            morning_enabled: notificationSettings?.morning_enabled ?? true,
            min_score: minScore,
          })}
        />
        <ToggleRow
          label="当日朝の通知"
          description="今日の注意点を朝に確認"
          checked={notificationSettings?.morning_enabled ?? true}
          disabled={!user || savingNotifications || !notificationEnabled}
          onChange={(value) => saveNotificationSettings({
            enabled: notificationEnabled,
            night_enabled: notificationSettings?.night_enabled ?? true,
            morning_enabled: value,
            min_score: minScore,
          })}
        />
        {notificationMessage ? (
          <div className="px-5 pb-4 text-[12px] font-black leading-5 text-[#2F7668]">
            {notificationMessage}
          </div>
        ) : null}
      </Module>

      <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[16px] font-black tracking-tight text-slate-900">未病予報の地域</div>
            <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
              現在の地域：{loading ? "確認中…" : locationLabel}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => router.push("/radar")}>予報へ</Button>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[12px] font-extrabold text-slate-500">都道府県・地域</label>
          <select
            value={selectedPresetKey}
            onChange={(e) => setSelectedPresetKey(e.target.value)}
            disabled={!user || savingLocation}
            className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-sm font-extrabold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60"
          >
            <option value="">選んでください</option>
            {RADAR_LOCATION_PRESETS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Button
          onClick={handleSaveLocation}
          disabled={!user || !selectedPresetKey || savingLocation}
          className="mt-4 w-full shadow-sm"
        >
          {savingLocation ? "更新中…" : "この地域で設定する"}
        </Button>
        {locationMessage ? (
          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-[12px] font-black leading-5 text-slate-600 ring-1 ring-slate-100">
            {locationMessage}
          </div>
        ) : null}
      </Module>

      <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[16px] font-black tracking-tight text-slate-900">今気になる不調</div>
            <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
              現在の不調：{loading ? "確認中…" : activeSymptomProfile?.active_symptom_label || "未設定"}
              {activeSymptomProfile?.diagnosis_symptom_focus && activeSymptomProfile?.active_symptom_focus !== activeSymptomProfile?.diagnosis_symptom_focus
                ? `（チェック時：${activeSymptomProfile?.diagnosis_symptom_label || "—"}）`
                : ""}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => router.push("/radar")}>予報へ</Button>
        </div>

        <div className="mt-4 rounded-[18px] bg-[#F7FAF6] p-4 text-[12px] font-bold leading-6 text-slate-600 ring-1 ring-[#E1ECE4]">
          予報や体質トリセツの内容を、今気になる不調に合わせて反映し直します。体調傾向そのものが大きく変わった時は、体質チェックの更新がおすすめです。
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[12px] font-extrabold text-slate-500">不調の種類</label>
          <select
            value={selectedSymptomKey}
            onChange={(e) => setSelectedSymptomKey(e.target.value)}
            disabled={!user || savingSymptom || !activeSymptomProfile}
            className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-sm font-extrabold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60"
          >
            <option value="">選んでください</option>
            {SYMPTOM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleSaveSymptomFocus}
          disabled={!user || !selectedSymptomKey || savingSymptom || !activeSymptomProfile}
          className="mt-4 w-full shadow-sm"
        >
          {savingSymptom ? "反映中…" : "この不調で予報に反映する"}
        </Button>
        {symptomMessage ? (
          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-[12px] font-black leading-5 text-slate-600 ring-1 ring-slate-100">
            {symptomMessage}
          </div>
        ) : null}
      </Module>

      <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[16px] font-black tracking-tight text-slate-900">バグ・改善点を報告</div>
            <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
              表示崩れ、文言の違和感、使いにくいところを送れます。
            </div>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#E2F1EA] text-[18px] ring-1 ring-[#BFD9CC]">
            💬
          </div>
        </div>
        <div className="mt-4 rounded-[18px] bg-[#E2F1EA]/55 p-4 text-[12px] font-bold leading-6 text-slate-600 ring-1 ring-[#BFD9CC]/70">
          メールアドレスや名前は自動送信されません。返信を希望する場合だけ、連絡先を入力できます。
        </div>
        <Button variant="secondary" className="mt-4 w-full bg-white" onClick={() => router.push("/feedback")}>
          報告フォームを開く
        </Button>
      </Module>

      <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="text-[16px] font-black tracking-tight text-slate-900">使い方ガイド</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          トリセツ、予報、ケアカードの見方に迷った時はこちらから確認できます。
        </div>
        <div className="mt-4">
          <Button variant="secondary" className="w-full bg-white" onClick={() => router.push("/guide")}>使い方ガイドを開く</Button>
        </div>
      </Module>

      <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        {user ? (
          <Button variant="secondary" className="w-full bg-white" onClick={handleLogout}>ログアウト</Button>
        ) : (
          <Button className="w-full" onClick={() => router.push("/signup")}>ログインする</Button>
        )}
      </Module>

      {pwaGuideOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-[#101827]/38 px-4 pb-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[430px] rounded-[28px] border border-[#DCE7DE] bg-white p-5 shadow-[0_24px_72px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#101827]">ホーム画面に追加する手順</p>
                <p className="mt-1 text-xs font-extrabold leading-relaxed text-[#647386]">
                  追加すると、未病レーダーをアプリのように開けます。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPwaGuideOpen(false)}
                aria-label="手順を閉じる"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-[#9AA7B6] shadow-sm ring-1 ring-[#DCE7DE]"
              >
                ×
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm font-extrabold leading-relaxed text-[#344256]">
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF6EF] text-xs font-black text-[#3F7668] ring-1 ring-[#C9DED4]">1</span><span>Safari / Chrome で未病レーダーを開く</span></li>
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF6EF] text-xs font-black text-[#3F7668] ring-1 ring-[#C9DED4]">2</span><span>共有メニュー、またはブラウザのメニューを開く</span></li>
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF6EF] text-xs font-black text-[#3F7668] ring-1 ring-[#C9DED4]">3</span><span>「ホーム画面に追加」または「アプリをインストール」を選ぶ</span></li>
            </ol>
            <Button onClick={() => setPwaGuideOpen(false)} className="mt-5 w-full">わかった</Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}


