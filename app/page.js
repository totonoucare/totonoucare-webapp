// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import Button from "@/components/ui/Button";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import { IconSpark, IconRoute, IconUser, HeroArt } from "@/components/illust/icons/home";

const SESSION_TIMEOUT_MS = 5000;

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
      {/* Hero */}
      <Module>
        <ModuleHeader icon={<IconSpark />} title="未病レーダー" sub="体質 × 気象で、崩れる前に先回りする" />
        <div className="px-5 pb-6 pt-4 space-y-4">
          <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_50%)] ring-1 ring-[var(--ring)] p-5">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--accent-ink)]/80">体調予報 × 先回りケア</div>
              <div className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                不調の波が来る前に気づいて、先回りで軽くする
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-700">
                あなたの体質と気象の変化を重ねて、崩れやすいタイミングがわかります。
                危ない日は、30秒でできる先回りケアが出ます。
              </div>
            </div>

            <div className="mt-4">
              <HeroArt />
            </div>

            <div className="mt-4 grid gap-2">
              <Button onClick={() => router.push("/check")}>体質チェックをはじめる</Button>
              <Button variant="secondary" onClick={() => router.push("/radar")}>
                体調予報へ
              </Button>
            </div>

            <div className="mt-3 text-[11px] font-bold text-slate-500">
              ※ 対策の中身は結果と予報に合わせて提示（ここでは煽らない）
            </div>
          </div>

          {/* routes */}
          <div className="grid gap-3">
            <div className="rounded-[20px] bg-white ring-1 ring-[var(--ring)] p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-[color-mix(in_srgb,#ede9fe,white_40%)] ring-1 ring-[var(--ring)] text-[#3b2f86]">
                  <IconRoute />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900">全導線</div>
                  <div className="mt-1 text-xs font-medium text-slate-500">
                    迷子防止。必要な導線だけを短距離で。
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => router.push("/check")}>体質チェック</Button>
                    <Button variant="ghost" onClick={() => router.push("/radar")}>体調予報</Button>
                    <Button variant="ghost" onClick={() => router.push("/history")}>履歴</Button>
                    <Button variant="ghost" onClick={() => router.push("/guide")}>使い方</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Module>

      {/* Account */}
      <Module>
        <ModuleHeader icon={<IconUser />} title="アカウント" sub="保存・履歴・予報のパーソナライズに必要" />
        <div className="px-5 pb-6 pt-4 space-y-4">
          {loading ? (
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
              <div className="text-sm font-bold text-slate-700">読み込み中…</div>
            </div>
          ) : error ? (
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
              <div className="text-sm font-extrabold text-slate-900">セッション確認に失敗</div>
              <div className="mt-2 text-xs font-bold text-slate-600 whitespace-pre-wrap">{error}</div>
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
      </Module>

      <div className="pb-6 text-center text-[11px] font-bold text-slate-400">
        ※ UI・導線・データ設計は順次アップデート
      </div>
    </AppShell>
  );
}
