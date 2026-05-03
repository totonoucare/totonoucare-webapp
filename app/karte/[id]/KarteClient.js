"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PRICE_LABEL = "¥1,500";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function SectionCard({ section, locked }) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[#d9e3dc] bg-white p-6 shadow-[0_16px_42px_rgba(15,23,42,0.07)] md:p-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-full border border-[#ead7a5] bg-[#fff8df] px-3 py-1 text-[11px] font-black tracking-[0.18em] text-[#b17425]">
          {section.badge}
        </span>
        <span className="text-[11px] font-black tracking-[0.18em] text-[#9aa7b8]">PERSONAL FILE</span>
      </div>

      <h2 className="text-[25px] font-black leading-[1.42] tracking-[-0.04em] text-[#10182d] md:text-[30px]">
        {section.title}
      </h2>
      {section.teaser ? <p className="mt-3 text-[14px] font-black text-[#64748b]">{section.teaser}</p> : null}

      {locked ? (
        <div className="relative mt-6 rounded-[28px] border border-[#e4ebe6] bg-[#f7faf8] p-5">
          <p className="text-[16px] font-black leading-[2] text-[#39475a]">{section.preview}</p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f7faf8] via-[#f7faf8]/90 to-transparent" />
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 text-[13px] font-black text-[#2f7567] shadow-sm">
            <span>🔒</span>
            <span>続きはアンロック後に表示</span>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {(section.body || []).map((text, index) => (
            <p key={`${section.id}-p-${index}`} className="text-[16px] font-bold leading-[2.05] text-[#334155]">
              {text}
            </p>
          ))}

          {section.bullets?.length ? (
            <div className="rounded-[26px] border border-[#e6eee9] bg-[#f8fbf9] p-5">
              <div className="mb-3 text-[12px] font-black tracking-[0.14em] text-[#9aa7b8]">見るポイント</div>
              <ul className="space-y-3">
                {section.bullets.map((item, index) => (
                  <li key={`${section.id}-b-${index}`} className="flex gap-3 text-[15px] font-black leading-[1.8] text-[#334155]">
                    <span className="mt-[0.55em] h-2 w-2 shrink-0 rounded-full bg-[#f4b73d]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section.steps?.length ? (
            <div className="space-y-3">
              {section.steps.map((item, index) => (
                <div key={`${section.id}-s-${index}`} className="rounded-[24px] border border-[#e6eee9] bg-[#f8fbf9] px-5 py-4 text-[15px] font-black leading-[1.8] text-[#334155]">
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function LoadingView() {
  return (
    <div className="min-h-screen bg-[#f7f7f1] px-6 py-20 text-center">
      <div className="mx-auto max-w-[680px] rounded-[34px] border border-[#d9e3dc] bg-white p-8 shadow-sm">
        <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-full bg-[#dfeee8]" />
        <p className="text-[16px] font-black text-[#64748b]">カルテを読み込み中です。</p>
      </div>
    </div>
  );
}

function ErrorView({ message }) {
  return (
    <div className="min-h-screen bg-[#f7f7f1] px-6 py-20">
      <div className="mx-auto max-w-[680px] rounded-[34px] border border-[#d9e3dc] bg-white p-8 text-center shadow-sm">
        <p className="text-[18px] font-black text-[#10182d]">カルテを表示できませんでした</p>
        <p className="mt-3 text-[14px] font-bold leading-7 text-[#64748b]">{message}</p>
        <Link href="/" className="mt-7 inline-flex rounded-full bg-[#2f7567] px-8 py-4 text-[15px] font-black text-white shadow-[0_10px_22px_rgba(47,117,103,0.24)]">
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
}

export default function KarteClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const checkoutState = searchParams.get("checkout");

  async function loadKarte() {
    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/karte/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "カルテの取得に失敗しました。");
      setData(json);
    } catch (err) {
      setError(err?.message || "カルテの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadKarte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (checkoutState === "success") {
      const timer = setTimeout(() => loadKarte(), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutState]);

  const karte = data?.karte;
  const locked = data ? !data.unlocked : true;

  const completionLabel = useMemo(() => {
    if (!karte?.sections?.length) return "8項目＋ボーナス";
    return `${Math.max(0, karte.sections.length - 1)}項目＋ボーナス`;
  }, [karte]);

  async function startCheckout() {
    setCheckoutLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        const next = encodeURIComponent(`/karte/${id}`);
        router.push(`/signup?result=${encodeURIComponent(id)}&next=${next}`);
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product: "personal_mibyo_karte",
          resultId: id,
        }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "決済ページを開けませんでした。");
      window.location.href = json.url;
    } catch (err) {
      setError(err?.message || "決済ページを開けませんでした。");
      setCheckoutLoading(false);
    }
  }

  if (loading) return <LoadingView />;
  if (error && !data) return <ErrorView message={error} />;
  if (!karte) return <ErrorView message="カルテ情報が見つかりませんでした。" />;

  return (
    <main className="min-h-screen bg-[#f7f7f1] pb-16 text-[#10182d]">
      <div className="sticky top-0 z-20 border-b border-[#eef1ed] bg-white/88 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-[#d9e3dc] bg-white px-5 py-3 text-[14px] font-black text-[#334155] shadow-sm"
          >
            ← 戻る
          </button>
          <div className="text-center">
            <div className="text-[18px] font-black tracking-[-0.04em]">パーソナル未病カルテ</div>
            <div className="text-[12px] font-black text-[#8290a4]">PERSONAL MIBYO FILE</div>
          </div>
          <Link href="/" className="rounded-full border border-[#d9e3dc] bg-white px-5 py-3 text-[14px] font-black text-[#334155] shadow-sm">
            ホーム
          </Link>
        </div>
      </div>

      {checkoutState === "success" && !data?.unlocked ? (
        <div className="mx-auto mt-5 max-w-[760px] px-5">
          <div className="rounded-[24px] border border-[#d7e6df] bg-[#eff8f4] px-5 py-4 text-[14px] font-black leading-7 text-[#2f7567]">
            決済を確認中です。数秒後にカルテが開かない場合は、ページを再読み込みしてください。
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mx-auto mt-5 max-w-[760px] px-5">
          <div className="rounded-[24px] border border-[#f6d4c5] bg-[#fff7ed] px-5 py-4 text-[14px] font-black leading-7 text-[#9a4b20]">
            {error}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-[760px] space-y-7 px-5 pt-8">
        <section className="overflow-hidden rounded-[38px] border border-[#d9e3dc] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="relative p-7 md:p-9">
            <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-[#f7e8b9] opacity-60" />
            <div className="pointer-events-none absolute right-10 top-20 h-28 w-28 rounded-full border border-[#d9e3dc]" />
            <div className="relative">
              <span className="inline-flex rounded-full border border-[#d9e3dc] bg-[#f8fbf9] px-4 py-2 text-[12px] font-black tracking-[0.16em] text-[#2f7567]">
                ONE TIME UNLOCK
              </span>
              <h1 className="mt-5 text-[34px] font-black leading-tight tracking-[-0.06em] text-[#10182d] md:text-[44px]">
                {karte.productName}
              </h1>
              <p className="mt-4 text-[17px] font-black leading-[1.8] text-[#475569]">{karte.subtitle}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-[#e6eee9] bg-[#f8fbf9] p-4">
                  <div className="text-[11px] font-black tracking-[0.14em] text-[#9aa7b8]">体質軸</div>
                  <div className="mt-2 text-[18px] font-black text-[#2f7567]">{karte.coreTitle}</div>
                </div>
                <div className="rounded-[24px] border border-[#e6eee9] bg-[#f8fbf9] p-4">
                  <div className="text-[11px] font-black tracking-[0.14em] text-[#9aa7b8]">お困りの不調</div>
                  <div className="mt-2 text-[18px] font-black text-[#10182d]">{karte.symptomLabel}</div>
                </div>
                <div className="rounded-[24px] border border-[#ead7a5] bg-[#fffaf0] p-4">
                  <div className="text-[11px] font-black tracking-[0.14em] text-[#b17425]">収録</div>
                  <div className="mt-2 text-[18px] font-black text-[#9a5b1e]">{completionLabel}</div>
                </div>
              </div>
              <p className="mt-6 rounded-[26px] border border-[#e6eee9] bg-white/78 p-5 text-[15px] font-bold leading-[1.9] text-[#475569]">
                {karte.heroLead}
              </p>
            </div>
          </div>
        </section>

        {locked ? (
          <section className="rounded-[34px] border border-[#d7e6df] bg-[#eff8f4] p-6 shadow-[0_14px_38px_rgba(47,117,103,0.10)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[12px] font-black tracking-[0.16em] text-[#2f7567]">LOCKED</div>
                <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em] text-[#10182d]">
                  あなた専用の仕様書をアンロック
                </h2>
                <p className="mt-2 text-[14px] font-bold leading-7 text-[#475569]">
                  無料結果では見えない「崩れる順番」「逆効果ケア」「季節別の先回り」「相談時に伝えるメモ」「HP10%の日のレスキュー行動」まで、いつでも見返せます。
                </p>
              </div>
              <button
                type="button"
                onClick={startCheckout}
                disabled={checkoutLoading}
                className={cn(
                  "shrink-0 rounded-full px-7 py-4 text-[15px] font-black text-white shadow-[0_12px_26px_rgba(47,117,103,0.28)]",
                  checkoutLoading ? "bg-[#8fb8ad]" : "bg-[#2f7567] active:translate-y-[1px]"
                )}
              >
                {checkoutLoading ? "決済ページを準備中…" : `アンロックする（${PRICE_LABEL}）`}
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-[34px] border border-[#d7e6df] bg-[#eff8f4] p-6 text-[15px] font-black leading-7 text-[#2f7567]">
            ✅ アンロック済みです。このカルテはアプリ上でいつでも見返せます。
          </section>
        )}

        {(karte.sections || []).map((section) => (
          <SectionCard key={section.id} section={section} locked={locked} />
        ))}

        {locked ? (
          <section className="rounded-[34px] border border-[#ead7a5] bg-[#fffaf0] p-6 text-center shadow-sm">
            <div className="text-[12px] font-black tracking-[0.16em] text-[#b17425]">ONE TIME</div>
            <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em] text-[#10182d]">読み返せる未病ケア指南書</h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[14px] font-bold leading-7 text-[#6b4a2a]">
              一度アンロックすると、同じ診断結果のカルテをアプリ上で再表示できます。相談メモも含めて見返せます。PDF出力・共有リンクは次フェーズで拡張予定です。
            </p>
            <button
              type="button"
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="mt-6 rounded-full bg-[#2f7567] px-8 py-4 text-[15px] font-black text-white shadow-[0_12px_26px_rgba(47,117,103,0.28)]"
            >
              {checkoutLoading ? "決済ページを準備中…" : `カルテをアンロック（${PRICE_LABEL}）`}
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
