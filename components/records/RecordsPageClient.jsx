// components/records/RecordsPageClient.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";

function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div className="flex rounded-full bg-slate-200/50 p-1 ring-1 ring-inset ring-slate-200/50">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              "flex-1 h-[34px] rounded-full text-[13px] font-black tracking-tight transition-all duration-200",
              active
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function PreviewCalendar() {
  const cells = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="rounded-[28px] bg-white p-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-4 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="grid grid-cols-7 gap-1.5 blur-[2px]">
        {cells.map((i) => (
          <div
            key={i}
            className={[
              "aspect-square rounded-[12px] ring-1 ring-inset ring-slate-200",
              i % 9 === 0
                ? "bg-rose-100"
                : i % 5 === 0
                  ? "bg-amber-100"
                  : i % 4 === 0
                    ? "bg-emerald-100"
                    : "bg-slate-50",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewReport() {
  return (
    <div className="rounded-[28px] bg-white p-5 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#EAF5EF] text-[18px] ring-1 ring-[#CFE3DA]">
          ✨
        </div>
        <div>
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-2 h-2.5 w-36 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="mt-5 space-y-3 blur-[2px]">
        <div className="h-16 rounded-[18px] bg-slate-50 ring-1 ring-inset ring-slate-100" />
        <div className="h-16 rounded-[18px] bg-[#F3EBDD] ring-1 ring-inset ring-amber-100" />
        <div className="h-16 rounded-[18px] bg-[#EAF4F0] ring-1 ring-inset ring-emerald-100" />
      </div>
    </div>
  );
}

export default function RecordsPageClient({ initialTab = "calendar" }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab === "report" ? "report" : "calendar");

  useEffect(() => {
    setTab(initialTab === "report" ? "report" : "calendar");
  }, [initialTab]);

  function changeTab(nextTab) {
    setTab(nextTab);
    router.replace(`/records?tab=${nextTab}`, { scroll: false });
  }

  return (
    <AppShell
      title="記録と振り返り"
      subtitle="ただいま開発中です"
      headerRight={
        <button
          onClick={() => router.push("/radar")}
          className="rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] transition-all hover:bg-slate-50 active:scale-95"
        >
          レーダーへ
        </button>
      }
    >
      <SegmentedTabs
        tabs={[
          { key: "calendar", label: "カレンダー" },
          { key: "report", label: "週次レポート" },
        ]}
        value={tab}
        onChange={changeTab}
      />

      <Module className="relative overflow-hidden p-6 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#EAF5EF] blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3D8] px-3 py-1.5 text-[10px] font-black tracking-widest text-[#8A6417] ring-1 ring-[#E9D8A9]">
            準備中
          </div>
          <div className="mt-4 text-[22px] font-black tracking-tight text-slate-900">
            {tab === "report" ? "週次レポートは鋭意開発中です" : "記録カレンダーは鋭意開発中です"}
          </div>
          <div className="mt-2 text-[13px] font-bold leading-7 text-slate-600">
            まずは体質トリセツ・体調予報・ケアナビを安定して使えるように整えています。
          </div>

          <div className="mt-6">
            {tab === "report" ? <PreviewReport /> : <PreviewCalendar />}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button onClick={() => router.push("/radar")} className="w-full shadow-md">
              体調予報へ戻る
            </Button>
            <Button variant="secondary" onClick={() => router.push("/guide")} className="w-full bg-white">
              使い方を見る
            </Button>
          </div>
        </div>
      </Module>

      <Module className="p-5 bg-[#FBFCF8] ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="text-[14px] font-black tracking-tight text-slate-900">今使える機能</div>
        <div className="mt-3 grid gap-2 text-[12px] font-bold leading-6 text-slate-600">
          <div className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-slate-100">今日・明日の体調予報</div>
          <div className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-slate-100">天気に合わせたツボ・食養生</div>
          <div className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-slate-100">体質トリセツ</div>
        </div>
      </Module>
    </AppShell>
  );
}


