// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import Button from "@/components/ui/Button";

/* -----------------------------
 * Icons
 * ---------------------------- */
function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l1.2 5.1L18 9l-4.8 1.9L12 16l-1.2-5.1L6 9l4.8-1.9L12 2z" />
      <path d="M19 13l.7 3L22 17l-2.3 1-.7 3-.7-3L16 17l2.3-1 .7-3z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 12l8-4" />
      <path d="M12 12a8 8 0 1 0 8 8" />
      <path d="M12 12V4" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h10v18H7z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
function IconLogin() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 3v18" />
    </svg>
  );
}

/* -----------------------------
 * UI primitives（result味）
 * ---------------------------- */
function TopBar({ title }) {
  return (
    <div className="sticky top-0 z-30 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-slate-800 shadow-sm ring-1 ring-[var(--ring)]">
            <span className="text-[var(--accent-ink)]"><IconSpark /></span>
            未病レーダー
          </div>
          <div className="min-w-0 text-sm font-extrabold tracking-tight text-slate-800 truncate">{title}</div>
          <div className="w-[88px]" />
        </div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <section
      className={[
        "rounded-[26px] bg-[var(--panel)] shadow-sm ring-1 ring-[var(--ring)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function CardHeader({ icon, title, sub }) {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[var(--mint)] ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold tracking-tight text-slate-900">{title}</div>
            {sub ? <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div> : null}
          </div>
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-black/5" />
    </div>
  );
}

function Panel({ icon, title, tone = "mint", children, right }) {
  const tones = {
    mint: { wrap: "bg-[color-mix(in_srgb,var(--mint),white_55%)]", bar: "bg-[var(--accent)]", title: "text-[var(--accent-ink)]" },
    teal: { wrap: "bg-[color-mix(in_srgb,#d1fae5,white_35%)]", bar: "bg-[#0f766e]", title: "text-[#115e59]" },
    violet: { wrap: "bg-[color-mix(in_srgb,#ede9fe,white_35%)]", bar: "bg-[#6d5bd0]", title: "text-[#3b2f86]" },
    amber: { wrap: "bg-[color-mix(in_srgb,#fef3c7,white_35%)]", bar: "bg-[#b45309]", title: "text-[#7c2d12]" },
  };
  const t = tones[tone] || tones.mint;

  return (
    <div className={`relative rounded-[22px] ${t.wrap} ring-1 ring-[var(--ring)]`}>
      <div className={`absolute left-0 top-0 h-full w-1.5 rounded-l-[22px] ${t.bar}`} />
      <div className="px-4 py-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {icon ? (
              <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-white/70 ring-1 ring-[var(--ring)] text-slate-700">
                {icon}
              </div>
            ) : null}
            <div className={`text-sm font-extrabold tracking-tight ${t.title}`}>{title}</div>
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
        <div className="mt-3 text-sm leading-7 text-slate-800">{children}</div>
      </div>
    </div>
  );
}

/* -----------------------------
 * Bottom Tab Bar（3タブ）
 * ---------------------------- */
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconRadarTab() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M12 12l8-4" />
      <path d="M12 12a8 8 0 1 0 8 8" />
      <path d="M12 12V4" />
    </svg>
  );
}
/**
 * @param {{
 *  active: 'home'|'latest'|'forecast',
 *  hrefs?: { home?: string, latest?: string, forecast?: string }
 * }} props
 */
function BottomTabs({ active, hrefs }) {
  const go = (key) => {
    const h = hrefs?.[key];
    if (h) window.location.href = h;
  };

  const item = (key, label, Icon) => {
    const isActive = active === key;
    return (
      <button
        type="button"
        onClick={() => go(key)}
        className={[
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] py-2",
          isActive ? "text-[var(--accent-ink)]" : "text-slate-500",
        ].join(" ")}
      >
        <span
          className={[
            "grid h-9 w-9 place-items-center rounded-[14px] transition",
            isActive ? "bg-[var(--mint)] ring-1 ring-[var(--ring)]" : "bg-transparent",
          ].join(" ")}
        >
          <Icon />
        </span>
        <span className={`text-[11px] font-extrabold ${isActive ? "" : "font-bold"}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white/92 backdrop-blur supports-[backdrop-filter]:bg-white/75 ring-1 ring-[var(--ring)]">
      <div className="mx-auto w-full max-w-[440px] px-4 py-2">
        <div className="flex items-stretch gap-2 rounded-[20px] bg-white ring-1 ring-[var(--ring)] p-1 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.35)]">
          {item("home", "トップ", IconHome)}
          {item("latest", "最新結果", IconDoc)}
          {item("forecast", "体調予報", IconRadarTab)}
        </div>
      </div>
    </div>
  );
}

const SESSION_TIMEOUT_MS = 5000;

export default function HomePage() {
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
    <div className="min-h-screen bg-app pb-28">
      <TopBar title="トップ" />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-5 pb-3">
          {/* Hero */}
          <div className="pt-2">
            <div className="rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_45%)] ring-1 ring-[var(--ring)] shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-5">
                <div className="text-xs font-extrabold text-[var(--accent-ink)]/80">今日の目的</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
                  崩れやすい日を先回りして、今日を軽くする
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-700">
                  体質チェックの結果と気象変化を組み合わせて、揺れを読みやすくします。
                </div>

                <div className="mt-4 grid gap-2">
                  <a href="/check">
                    <Button>体質チェックをはじめる</Button>
                  </a>
                  <a href="/radar">
                    <Button variant="secondary">今日の体調予報（未病レーダー）</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader icon={<IconSpark />} title="入口" sub="迷ったらここから" />
            <div className="px-5 pb-6 pt-4 space-y-3">
              <Panel title="体質チェック" tone="mint" icon={<IconCheck />}>
                2週間の傾向＋動作テストで、「崩れ方のクセ」を整理します。
                <div className="mt-4">
                  <a href="/check">
                    <Button>チェックへ</Button>
                  </a>
                </div>
              </Panel>

              <Panel title="最新のチェック結果" tone="violet" icon={<IconDoc />}>
                直近の保存結果を確認します（未保存の場合は履歴に出ません）。
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="/history?tab=latest">
                    <Button variant="secondary">最新結果へ</Button>
                  </a>
                  <a href="/history">
                    <Button variant="ghost">履歴一覧</Button>
                  </a>
                </div>
              </Panel>

              <Panel title="体調予報（レーダー）" tone="teal" icon={<IconRadar />}>
                気象の揺れと体質を掛け合わせて、注意日を先回りします。
                <div className="mt-4">
                  <a href="/radar">
                    <Button variant="secondary">予報を見る</Button>
                  </a>
                </div>
              </Panel>
            </div>
          </Card>

          {/* Auth / Status */}
          <Card>
            <CardHeader icon={<IconLogin />} title="アカウント" sub="保存・履歴・レーダーを使うためのログイン" />
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
                    <a href="/debug/env">
                      <Button variant="ghost">debug/envを見る</Button>
                    </a>
                    <Button variant="ghost" onClick={() => window.location.reload()}>
                      リロード
                    </Button>
                  </div>
                </div>
              ) : isLoggedIn ? (
                <div className="rounded-[22px] bg-[color-mix(in_srgb,#d1fae5,white_35%)] p-5 ring-1 ring-[var(--ring)]">
                  <div className="text-sm font-extrabold text-emerald-800">ログイン中 ✅</div>
                  <div className="mt-1 text-sm font-bold text-slate-800">{email}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href="/history">
                      <Button>履歴を見る</Button>
                    </a>
                    <a href="/check">
                      <Button variant="secondary">体質チェック（再）</Button>
                    </a>
                    <Button variant="ghost" onClick={logout}>ログアウト</Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                  <div className="text-base font-extrabold tracking-tight text-slate-900">
                    保存して、履歴と予報が“自分用”に
                  </div>
                  <div className="mt-2 text-xs font-bold text-slate-600">
                    メールで登録/ログインできます（登録だけでは課金されません）
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href="/signup">
                      <Button>ログイン / 登録</Button>
                    </a>
                    <a href="/check">
                      <Button variant="secondary">まずは体質チェック</Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="pb-6 text-center text-[11px] font-bold text-slate-400">
            ※ プロトタイプ運用中。UI・導線・データ設計は順次アップデートします。
          </div>
        </div>
      </div>

      <BottomTabs
        active="home"
        hrefs={{
          home: "/",
          latest: "/history?tab=latest",
          forecast: "/radar",
        }}
      />
    </div>
  );
}
