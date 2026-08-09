"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { jstDateString } from "@/lib/dateJST";
import { addDaysYmd } from "@/lib/records/analysis";
import DailyRecordCard from "@/components/records/DailyRecordCard";
import RecordsCalendar from "@/components/records/RecordsCalendar";
import AiAnalysisPanel from "@/components/records/AiAnalysisPanel";
import ExpertConsultPreview from "@/components/records/ExpertConsultPreview";
import LiveSupportPanel from "@/components/records/LiveSupportPanel";
import SubscriptionPaywall from "@/components/billing/SubscriptionPaywall";

const TAB_OPTIONS = [
  { key: "record", label: "記録カレンダー", short: "記録" },
  { key: "analysis", label: "AI分析", short: "AI分析" },
  { key: "consult", label: "相談", short: "相談" },
];

function normalizeTab(value) {
  const normalized = value === "expert" ? "consult" : value;
  return TAB_OPTIONS.some((item) => item.key === normalized) ? normalized : "record";
}

function monthRange(month) {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${year}-${String(monthNumber).padStart(2, "0")}-01`,
    end: `${year}-${String(monthNumber).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}

function IconLockSmall() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function RecordsTabs({ value, onChange, access }) {
  return (
    <div className="sticky top-[66px] z-30 -mx-1 bg-app/90 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-app/80">
      <div className="grid grid-cols-3 gap-1 rounded-[22px] bg-[#EDF2EF] p-1 ring-1 ring-inset ring-[#DDE7E1] shadow-inner">
        {TAB_OPTIONS.map((item) => {
          const active = value === item.key;
          const locked = Boolean(
            access &&
            ((item.key === "analysis" && !access.analysis_enabled) ||
              (item.key === "consult" && !access.consult_enabled))
          );
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={[
                "min-h-[42px] rounded-[18px] px-2 text-[12px] font-black leading-4 transition-all",
                active
                  ? "bg-[#EAF7F1] text-[#1F7D67] ring-1 ring-[#66B9A3] shadow-[0_10px_22px_-16px_rgba(47,129,110,0.54)]"
                  : "text-slate-500 hover:bg-white/70",
              ].join(" ")}
            >
              <span className="inline-flex items-center justify-center gap-1 sm:hidden">
                {item.short}{locked ? <IconLockSmall /> : null}
              </span>
              <span className="hidden items-center justify-center gap-1 sm:inline-flex">
                {item.label}{locked ? <IconLockSmall /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RecordsPageClient({
  initialTab = "record",
  initialLivePrompt = "",
  initialCheckoutStatus = "",
  initialCheckoutSessionId = "",
}) {
  const router = useRouter();
  const today = useMemo(() => jstDateString(new Date()), []);
  const earliestEditableDate = useMemo(() => addDaysYmd(today, -6), [today]);

  const [tab, setTab] = useState(normalizeTab(initialTab));
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [month, setMonth] = useState(today.slice(0, 7));
  const [monthRows, setMonthRows] = useState([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedRow, setSelectedRow] = useState({ date: today, review: null, forecast: null });
  const [recordSaving, setRecordSaving] = useState(false);
  const [recentlySavedDate, setRecentlySavedDate] = useState("");
  const [recordError, setRecordError] = useState("");
  const [careActionSaving, setCareActionSaving] = useState("");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [livePrompt, setLivePrompt] = useState(initialLivePrompt || "");
  const [featureAccess, setFeatureAccess] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    setTab(normalizeTab(initialTab));
  }, [initialTab]);

  useEffect(() => {
    if (initialLivePrompt) setLivePrompt(initialLivePrompt);
  }, [initialLivePrompt]);

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data?.session || null);
      setAuthLoading(false);
    })();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession || null);
      setAuthLoading(false);
    });
    subscription = data?.subscription;

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const authedFetch = useCallback(async (path, options = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("ログインが必要です");

    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const requestError = new Error(json?.error || "通信に失敗しました");
      requestError.code = json?.code || "request_failed";
      requestError.status = response.status;
      throw requestError;
    }
    return json?.data ?? json;
  }, []);

  const sendEvent = useCallback(async (eventType, metadata = {}) => {
    try {
      await authedFetch("/api/records/events", {
        method: "POST",
        body: JSON.stringify({ event_type: eventType, metadata }),
      });
    } catch {}
  }, [authedFetch]);

  const loadFeatureAccess = useCallback(async () => {
    setAccessLoading(true);
    setAccessError("");
    try {
      const data = await authedFetch("/api/records/access");
      setFeatureAccess(data?.access || null);
      return data?.access || null;
    } catch (loadError) {
      setAccessError(loadError?.message || "利用プランを確認できませんでした");
      return null;
    } finally {
      setAccessLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.access_token) {
      setFeatureAccess(null);
      setAccessLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const removeCheckoutParams = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        url.searchParams.delete("session_id");
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`
        );
      };
      if (initialCheckoutStatus === "cancel") removeCheckoutParams();

      if (initialCheckoutStatus === "success" && initialCheckoutSessionId) {
        try {
          const confirmed = await authedFetch("/api/stripe/checkout/confirm", {
            method: "POST",
            body: JSON.stringify({ session_id: initialCheckoutSessionId }),
          });
          const confirmedAccess = confirmed?.billing?.access || null;
          if (cancelled) return;
          if (confirmedAccess) {
            setFeatureAccess(confirmedAccess);
            setAccessError("");
            setAccessLoading(false);
            if (confirmedAccess.entitled) removeCheckoutParams();
            return;
          }
        } catch (confirmError) {
          if (!cancelled) {
            setAccessError(confirmError?.message || "決済情報を確認できませんでした");
          }
        }
      }

      const attempts = initialCheckoutStatus === "success" ? 4 : 1;
      for (let index = 0; index < attempts; index += 1) {
        const access = await loadFeatureAccess();
        if (access?.entitled && initialCheckoutStatus === "success") {
          removeCheckoutParams();
        }
        if (cancelled || access?.entitled || index === attempts - 1) break;
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    session?.access_token,
    initialCheckoutStatus,
    initialCheckoutSessionId,
    authedFetch,
    loadFeatureAccess,
  ]);

  useEffect(() => {
    if (!session?.access_token) return undefined;
    const refresh = () => {
      if (document.visibilityState === "visible") loadFeatureAccess();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [session?.access_token, loadFeatureAccess]);

  useEffect(() => {
    if (!featureAccess?.beta_enabled || !featureAccess?.beta_ends_at) return;
    const endMs = Date.parse(`${featureAccess.beta_ends_at}T23:59:59.999+09:00`);
    if (!Number.isFinite(endMs)) return;
    const untilBoundary = Math.max(1000, endMs + 1 - Date.now());
    const delay = Math.min(untilBoundary, 24 * 60 * 60 * 1000);
    const timer = window.setTimeout(() => {
      loadFeatureAccess();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [featureAccess?.beta_enabled, featureAccess?.beta_ends_at, loadFeatureAccess]);

  useEffect(() => {
    if (!session?.access_token) return;
    sendEvent("records_page_view", { initial_tab: normalizeTab(initialTab) });
  }, [session?.access_token, initialTab, sendEvent]);

  const loadSelectedDate = useCallback(async (date) => {
    if (!session?.access_token || !date) return;
    try {
      const data = await authedFetch(`/api/radar/review?date=${encodeURIComponent(date)}`);
      const nextRow = data || { date, review: null, forecast: null };
      setSelectedRow(nextRow);
      setMonthRows((current) => {
        const without = current.filter((row) => row.date !== date);
        return [...without, nextRow].sort((a, b) => String(a.date).localeCompare(String(b.date)));
      });
      return nextRow;
    } catch (error) {
      setRecordError(error?.message || "記録を読み込めませんでした");
    }
  }, [session?.access_token, authedFetch]);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    const range = monthRange(month);

    async function load() {
      setMonthLoading(true);
      setRecordError("");
      try {
        const data = await authedFetch(
          `/api/records/range?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
        );
        if (cancelled) return;
        const rows = data?.rows || [];
        setMonthRows(rows);
        const selected = rows.find((row) => row.date === selectedDate);
        if (selected) {
          setSelectedRow(selected);
        } else if (selectedDate.startsWith(month)) {
          setSelectedRow({ date: selectedDate, review: null, forecast: null });
          loadSelectedDate(selectedDate);
        }
      } catch (error) {
        if (!cancelled) setRecordError(error?.message || "カレンダーを読み込めませんでした");
      } finally {
        if (!cancelled) setMonthLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token, month, selectedDate, authedFetch, loadSelectedDate]);

  function changeTab(nextTab) {
    const normalized = normalizeTab(nextTab);
    setTab(normalized);
    router.replace(`/records?tab=${normalized}`, { scroll: false });
    if (normalized === "analysis") sendEvent("analysis_opened");
    if (normalized === "consult") sendEvent("live_support_opened");
  }

  function selectCalendarDate(date, row) {
    setSelectedDate(date);
    setSelectedRow(row || { date, review: null, forecast: null });
    if (!row) loadSelectedDate(date);
    window?.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  async function saveRecord(payload) {
    setRecordSaving(true);
    setRecordError("");
    try {
      const data = await authedFetch("/api/radar/review", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const nextRow = data || {
        date: payload.date,
        review: payload,
        forecast: selectedRow?.forecast || null,
      };
      setSelectedRow(nextRow);
      setRecentlySavedDate(payload.date);
      setMonthRows((current) => {
        const without = current.filter((row) => row.date !== payload.date);
        return [...without, nextRow].sort((a, b) => a.date.localeCompare(b.date));
      });
      return nextRow;
    } catch (error) {
      setRecordError(error?.message || "記録を保存できませんでした");
      throw error;
    } finally {
      setRecordSaving(false);
    }
  }

  async function removeCareAction(action) {
    if (!action?.id || careActionSaving) return;
    setCareActionSaving(action.id);
    setRecordError("");
    try {
      await authedFetch("/api/radar/care-actions", {
        method: "DELETE",
        body: JSON.stringify({ id: action.id, target_date: selectedDate }),
      });
      await loadSelectedDate(selectedDate);
    } catch (error) {
      setRecordError(error?.message || "具体的ケアを削除できませんでした");
    } finally {
      setCareActionSaving("");
    }
  }

  function goToAnalysis({ date, classification } = {}) {
    const prompts = {
      attention_good: `${date || "今日"}はいたわり・守り予報でも穏やかに過ごせました。体調ゆらぎ度、天気ストレス、先回りケアから、次に再現したい条件を整理してください。`,
      attention_difficult: `${date || "今日"}はいたわり・守り予報でつらさがありました。体調ゆらぎ度、天気ストレス、ケアの内容と時刻を見比べてください。`,
      stable_good: `${date || "今日"}は安定予報どおり穏やかでした。似た日の土台として残したい条件を整理してください。`,
      stable_difficult: `${date || "今日"}は安定予報でもつらさがありました。予報に含めない生活条件も含めて整理してください。`,
    };
    const prompt = prompts[classification?.reflection_pattern]
      || `${date || "今日"}の体調ゆらぎ度・実感・ケアを見比べて、次に試すことを一緒に考えてください。`;
    setAnalysisPrompt(prompt);
    changeTab("analysis");
    window?.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function openDateFromAnalysis(date) {
    if (!date) return;
    setMonth(date.slice(0, 7));
    setSelectedDate(date);
    changeTab("record");
    loadSelectedDate(date);
  }

  if (authLoading) {
    return (
      <AppShell title="記録・相談" subtitle="読み込み中">
        <Module className="p-6">
          <div className="h-48 animate-pulse rounded-[24px] bg-[#F4FAF7]" />
        </Module>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell
        title="記録・相談"
        subtitle="ログインして利用"
        headerRight={
          <button
            type="button"
            onClick={() => router.push("/radar")}
            className="rounded-full bg-white px-3 py-2 text-[12px] font-black text-slate-600 ring-1 ring-[#DCE8DD]"
          >
            体調予報へ
          </button>
        }
      >
        <Module className="p-6 text-center">
          <div className="text-[18px] font-black text-slate-900">記録にはログインが必要です</div>
          <div className="mt-2 text-[14px] font-bold leading-6 text-slate-500">
            予報と実際の体調を保存し、記録の振り返りや今の体調相談につなげます。
          </div>
          <Button onClick={() => router.push("/signup")} className="mt-5 w-full">
            ログイン・無料登録へ
          </Button>
        </Module>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="記録・相談"
      subtitle="記録・振り返り・今の相談"
      headerRight={
        <button
          type="button"
          onClick={() => router.push("/radar")}
          className="rounded-full bg-white px-3 py-2 text-[12px] font-black text-slate-600 ring-1 ring-[#DCE8DD] shadow-sm"
        >
          体調予報へ
        </button>
      }
    >
      <RecordsTabs value={tab} onChange={changeTab} access={featureAccess} />

      {initialCheckoutStatus === "success" ? (
        <div className="rounded-[20px] bg-[#EAF7F1] px-4 py-3 text-[13px] font-black leading-5 text-[#2F816E] ring-1 ring-[#CFE7DE]">
          {featureAccess?.entitled
            ? "プレミアムの利用を開始しました。"
            : "決済情報を確認しています。反映まで少し時間がかかる場合があります。"}
        </div>
      ) : null}
      {initialCheckoutStatus === "cancel" ? (
        <div className="rounded-[20px] bg-[#F7FAF8] px-4 py-3 text-[13px] font-bold leading-5 text-slate-500 ring-1 ring-[#DCE8DD]">
          申込みはキャンセルされました。料金は発生していません。
        </div>
      ) : null}
      {accessError ? (
        <div className="rounded-[18px] bg-[#FFF0EC] px-4 py-3 text-[13px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">
          {accessError}
        </div>
      ) : null}

      {tab === "record" ? (
        <div className="space-y-5">
          <DailyRecordCard
            date={selectedDate}
            isToday={selectedDate === today}
            row={selectedRow}
            saving={recordSaving}
            justSaved={recentlySavedDate === selectedDate}
            editable={selectedDate >= earliestEditableDate && selectedDate <= today}
            editWindowLabel="今日を含む直近7日"
            onSave={saveRecord}
            onGoAnalysis={goToAnalysis}
            onOpenRadar={selectedDate === today ? () => router.push(`/radar?date=${encodeURIComponent(selectedDate)}`) : null}
            onRemoveCareAction={removeCareAction}
            careActionSaving={careActionSaving}
          />

          {recordError ? (
            <div className="rounded-[18px] bg-[#FFF0EC] px-4 py-3 text-[14px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">
              {recordError}
            </div>
          ) : null}

          <RecordsCalendar
            month={month}
            rows={monthRows}
            today={today}
            selectedDate={selectedDate}
            loading={monthLoading}
            onMonthChange={(nextMonth) => setMonth(nextMonth)}
            onSelectDate={selectCalendarDate}
          />

          <button
            type="button"
            onClick={() => changeTab("analysis")}
            className="w-full rounded-[24px] bg-[#349B83] px-5 py-4 text-left text-white shadow-[0_16px_30px_-22px_rgba(52,155,131,0.56)]"
          >
            <div className="text-[12px] font-black tracking-[0.14em] text-white/70">NEXT STEP</div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-[15px] font-black">あなたの傾向をグラフで見る</div>
                <div className="mt-1 text-[12px] font-bold text-white/80">予報・実感・ケアをAIと振り返る</div>
              </div>
              <span className="text-[24px]">›</span>
            </div>
          </button>
        </div>
      ) : null}

      {tab === "analysis" ? (
        accessLoading ? (
          <div className="h-56 animate-pulse rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE]" />
        ) : featureAccess?.analysis_enabled ? (
          <AiAnalysisPanel
            active
            today={today}
            authedFetch={authedFetch}
            initialPrompt={analysisPrompt}
            onConsumePrompt={() => setAnalysisPrompt("")}
            onSelectDate={openDateFromAnalysis}
            onTrackEvent={sendEvent}
          />
        ) : (
          <SubscriptionPaywall feature="analysis" returnPath="/records?tab=analysis" />
        )
      ) : null}

      {tab === "consult" ? (
        <div className="space-y-5">
          {accessLoading ? (
            <div className="h-56 animate-pulse rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE]" />
          ) : featureAccess?.consult_enabled ? (
            <LiveSupportPanel
              active
              authedFetch={authedFetch}
              initialPrompt={livePrompt}
              onConsumePrompt={() => setLivePrompt("")}
            />
          ) : (
            <SubscriptionPaywall feature="consult" returnPath="/records?tab=consult" />
          )}
          <ExpertConsultPreview authedFetch={authedFetch} />
        </div>
      ) : null}
    </AppShell>
  );
}
