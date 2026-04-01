// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import Button from "@/components/ui/Button";
import AppShell, { Module } from "@/components/layout/AppShell";
import { IconSpark, IconRoute, IconUser } from "@/components/illust/icons/home";
import { HeroMain, HeroTitleMark } from "@/components/illust/home";

const SESSION_TIMEOUT_MS = 5000;

function FeatureCard({ title, body }) {
  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-[var(--ring)]">
      <div className="text-sm font-extrabold text-slate-900">{title}</div>
      <div className="mt-1 text-xs font-bold leading-6 text-slate-600">{body}</div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  const isLoggedIn = !!session;
  const email = useMemo(() => session?.user?.email || "", [session?.user?.email]);

  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        setError("");
        if (!supabase) {
          setSession(null);
          return;
        }

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          "getSession timeout"
        );

        setSession(data.session || null);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession);
        });
        unsub = sub?.subscription;
      } catch (e) {
        console.error(e);
        setError(`セッション取得に失敗: ${e?.message || String(e)}`);
        setSession(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  async function logout() {
    try {
      if (!supabase) return;
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      console.error(e);
      alert("ログアウトに失敗しました");
    }
  }

  return (
    <AppShell
      title="ホーム"
      headerRight={
        <button
          type="button"
          onClick={() => router.push("/guide")}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          使い方
        </button>
      }
    >
      <Module>
        <div className="px-5 pb-6 pt-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--mint),white_36%)] px-3 py-1.5 text-[11px] font-extrabold tracking-[0.04em] text-[var(--accent-ink)] ring-1 ring-[var(--ring)]">
            <IconSpark className="h-4 w-4" />
            体質チェック × 気象変化 × 先回りケア
          </div>

          <div className="mt-4">
            <HeroTitleMark className="h-[52px] w-[248px] sm:h-[56px] sm:w-[280px]" />
          </div>

          <div className="mt-3 max-w-[12ch] text-[28px] font-extrabold leading-[1.24] tracking-tight text-slate-900 sm:max-w-none sm:text-[32px]">
            今日の「しんどい」には、理由がある。
          </div>

          <div className="mt-3 max-w-[32ch] text-[14px] font-bold leading-7 text-slate-700 sm:max-w-none">
            気象の変化と、あなたの体質。天気だけでは見えにくい「体調の波」を先読みして、無理をしないための一日をナビゲートします。
          </div>

          <div className="mt-4">
            <HeroMain />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button onClick={() => router.push("/check")} size="lg" className="rounded-2xl font-extrabold">
              無料で体質チェックをはじめる
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/radar")}
              size="lg"
              className="rounded-2xl font-extrabold"
            >
              未病レーダーを見る
            </Button>
          </div>

          <div className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
            まずは無料で体質チェックと結果閲覧ができます。ログインすると、予報・履歴・記録を使って継続的に振り返れます。
          </div>
        </div>
      </Module>

      <Module>
        <div className="px-5 pb-6 pt-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-[var(--mint)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)]">
              <IconRoute className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[17px] font-extrabold tracking-tight text-slate-900">このサービスでわかること</div>
              <div className="mt-1 text-xs font-bold text-slate-500">体質・明日の予報・先回りケアまでを一連で見られます。</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <FeatureCard
              title="体質チェック"
              body="気血津液や踏み癖、余力の傾向から、今の体質の偏りを見える化します。"
            />
            <FeatureCard
              title="未病レーダー"
              body="体質と気象の変化を重ねて、明日どんな不調が出やすいかを先回りで見られます。"
            />
            <FeatureCard
              title="合いやすいケア"
              body="注意したい時間帯に合わせて、ツボ・食養生・過ごし方をすぐ確認できます。"
            />
          </div>
        </div>
      </Module>

      <Module>
        <div className="px-5 pb-6 pt-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-[color-mix(in_srgb,#ede9fe,white_40%)] text-[#3b2f86] ring-1 ring-[var(--ring)]">
              <IconUser className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[17px] font-extrabold tracking-tight text-slate-900">アカウント</div>
              <div className="mt-1 text-xs font-bold text-slate-500">結果保存や継続利用のためのログイン状況です。</div>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
                <div className="text-sm font-bold text-slate-700">読み込み中…</div>
              </div>
            ) : error ? (
              <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
                <div className="text-sm font-extrabold text-slate-900">セッション確認に失敗</div>
                <div className="mt-2 whitespace-pre-wrap text-xs font-bold text-slate-600">{error}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => window.location.reload()}>リロード</Button>
                  <Button variant="ghost" onClick={() => router.push("/debug/env")}>debug/env</Button>
                </div>
              </div>
            ) : isLoggedIn ? (
              <div className="rounded-[20px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] p-5 ring-1 ring-[var(--ring)]">
                <div className="text-sm font-extrabold text-emerald-800">ログイン中 ✅</div>
                <div className="mt-1 text-sm font-bold text-slate-800">{email}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => router.push("/history")}>履歴</Button>
                  <Button variant="secondary" onClick={() => router.push("/check")}>体質チェック</Button>
                  <Button variant="ghost" onClick={logout}>ログアウト</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                <div className="text-base font-extrabold tracking-tight text-slate-900">
                  結果を保存して、履歴と予報へ
                </div>
                <div className="mt-2 text-xs font-bold text-slate-600">
                  メールで登録/ログインできます
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => router.push("/signup")}>ログイン / 登録</Button>
                  <Button variant="secondary" onClick={() => router.push("/check")}>まずは体質チェック</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Module>

      <div className="pb-6 text-center text-[11px] font-bold text-slate-400">
        ※ 先行公開中のため、見た目や導線は順次アップデートします
      </div>
    </AppShell>
  );
}
