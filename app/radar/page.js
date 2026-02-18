"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { getCoreLabel, getSubLabels, getMeridianLine, SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";

/* -----------------------------
 * Icons
 * ---------------------------- */
function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12l8-4" />
      <path d="M12 12a8 8 0 1 0 8 8" />
      <path d="M12 12V4" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function IconCompass() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10z" />
      <path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
    </svg>
  );
}

/* -----------------------------
 * UI primitives
 * ---------------------------- */
function Segments({ value, onChange }) {
  const items = [
    { key: "today", label: "今日" },
    { key: "week", label: "7日" },
    { key: "profile", label: "体質" },
  ];

  return (
    <div className="rounded-[18px] bg-white ring-1 ring-[var(--ring)] p-1">
      <div className="flex gap-1">
        {items.map((it) => {
          const active = value === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              className={[
                "flex-1 rounded-[14px] px-3 py-2 text-[12px] font-extrabold transition",
                active ? "bg-[var(--mint)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)]" : "text-slate-600 hover:bg-black/5",
              ].join(" ")}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RiskBadge({ score }) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const band =
    s >= 75 ? { title: "高め", tone: "bg-red-50 text-red-700 ring-red-200" } :
    s >= 45 ? { title: "注意", tone: "bg-amber-50 text-amber-800 ring-amber-200" } :
    { title: "低め", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" };

  return (
    <div className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-extrabold ring-1", band.tone].join(" ")}>
      <span>危険度</span>
      <span className="tabular-nums">{s}</span>
      <span className="opacity-80">({band.title})</span>
    </div>
  );
}

/* -----------------------------
 * Risk + micro-advice (temporary)
 * - backendで天気統合に置き換える前提の「暫定」
 * ---------------------------- */
function computeRiskFromProfile(profile) {
  const axes = profile?.computed?.axes || {};
  const drive = Number(axes.drive_score ?? 0); // -1..+1 (低いほど消耗)
  const obs = Number(axes.obstruction_score ?? 0); // 0..1
  const yy = Number(axes.yin_yang_score ?? 0); // -1..+1
  const env = Number(profile?.answers?.env_sensitivity ?? 0) || 0;

  // 雑でも一貫性：drive低い + obstruction高い + env高いで上げる
  // accel/brake どちらに寄りすぎてもブレ要因として微増
  let risk = 0;
  risk += (1 - ((drive + 1) / 2)) * 55;    // drive=-1 -> +55
  risk += Math.max(0, Math.min(1, obs)) * 30; // obs=1 -> +30
  risk += (Math.abs(yy) * 10);             // 偏り -> +0..10
  risk += Math.max(0, Math.min(3, env)) * 5;  // env 0..3 -> +0..15

  return Math.max(0, Math.min(100, risk));
}

function buildMicroAdvice(profile) {
  const computed = profile?.computed || {};
  const coreCode = computed?.core_code;
  const core = getCoreLabel(coreCode);

  const subs = getSubLabels(computed?.sub_labels).slice(0, 2);
  const dr = computed?.axes?.drive_label; // batt_small / standard / large
  const yy = computed?.axes?.yin_yang_label; // accel / steady / brake

  const tips = [];

  // battery
  if (dr === "batt_small") {
    tips.push("今日は「削らない」が正解。予定は詰めず、回復を最優先。");
    tips.push("短い休憩を先に確保（先に確保すると勝てる）。");
  } else if (dr === "batt_standard") {
    tips.push("無理は効くが、連続稼働が続くと崩れやすい。区切りを挟む。");
  } else if (dr === "batt_large") {
    tips.push("余力はある。調子の良さで押し切るより、微調整で“崩れない形”に寄せる。");
  }

  // accel/brake
  if (yy === "accel") {
    tips.push("張りやすい日。やることを増やすより、切り替えを増やす。");
  } else if (yy === "brake") {
    tips.push("重だるさが出やすい日。温め・軽さ方向で“詰まらせない”。");
  } else {
    tips.push("大崩れしにくい。環境要因が乗ったときだけ注意。");
  }

  // subs
  subs.forEach((s) => {
    // action_hintは長いので、短く要約（中身の具体は書かない）
    tips.push(`${s.title}：今日は“やりすぎない範囲で”整える。`);
  });

  // 30sec CTA文（実装は後で辞書と連携で置換）
  const micro = [
    "危ない日は、30秒の先回りケアを出します（内容は今日の状態に合わせて変わります）。",
  ];

  return { core, tips: tips.slice(0, 5), micro };
}

/* -----------------------------
 * Page
 * ---------------------------- */
export default function RadarPage() {
  const router = useRouter();

  const [seg, setSeg] = useState("today");

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoadingAuth(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s || null);
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const isLoggedIn = !!session;

  async function fetchProfile() {
    if (!session?.access_token) return;

    setErr("");
    setLoadingProfile(true);

    try {
      const res = await fetch("/api/diagnosis/v2/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "体質プロフィールの取得に失敗しました");
      setProfile(json?.data || null);
    } catch (e) {
      setErr(e?.message || String(e));
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    if (!session?.access_token) return;
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const hasProfile = !!profile?.computed?.core_code;

  const risk = useMemo(() => computeRiskFromProfile(profile), [profile]);
  const advice = useMemo(() => buildMicroAdvice(profile), [profile]);

  const symptomLabel = useMemo(() => {
    const k = profile?.symptom_focus || profile?.answers?.symptom_focus || "fatigue";
    return SYMPTOM_LABELS[k] || "だるさ・疲労";
  }, [profile?.symptom_focus, profile?.answers?.symptom_focus]);

  const merPrimary = useMemo(() => getMeridianLine(profile?.computed?.primary_meridian), [profile?.computed?.primary_meridian]);
  const merSecondary = useMemo(() => getMeridianLine(profile?.computed?.secondary_meridian), [profile?.computed?.secondary_meridian]);

  return (
    <AppShell title="体調予報">
      <Module>
        <ModuleHeader icon={<IconRadar />} title="体調予報（未病レーダー）" sub="体質 × 環境変化で、崩れる前に先回り" />
        <div className="px-5 pb-6 pt-4 space-y-4">
          <Segments value={seg} onChange={setSeg} />

          {/* Auth gate */}
          {loadingAuth ? (
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
              <div className="text-sm font-bold text-slate-700">ログイン状態を確認中…</div>
            </div>
          ) : !isLoggedIn ? (
            <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_50%)] ring-1 ring-[var(--ring)] p-5">
              <div className="text-base font-extrabold tracking-tight text-slate-900">
                予報は「体質（保存済み）」があると精度が上がります
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-700">
                先にログインすると、チェック結果を保存して予報に接続できます。
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => router.push("/signup")}>ログイン / 登録</Button>
                <Button variant="secondary" onClick={() => router.push("/check")}>体質チェック</Button>
              </div>
            </div>
          ) : loadingProfile ? (
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
              <div className="text-sm font-bold text-slate-700">体質プロフィールを読み込み中…</div>
            </div>
          ) : err ? (
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
              <div className="text-sm font-extrabold text-slate-900">読み込みに失敗</div>
              <div className="mt-2 text-xs font-bold text-slate-600 whitespace-pre-wrap">{err}</div>
              <div className="mt-4 flex gap-2">
                <Button onClick={fetchProfile}>再読み込み</Button>
                <Button variant="ghost" onClick={() => router.push("/check")}>体質チェック</Button>
              </div>
            </div>
          ) : !hasProfile ? (
            <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
              <div className="text-base font-extrabold tracking-tight text-slate-900">
                まずは体質チェックを完了してください
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                体質（軸・整えポイント）が揃うと、予報を「行動に変換」できます。
              </div>
              <div className="mt-4">
                <Button onClick={() => router.push("/check")}>体質チェックへ</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Seg: today */}
              {seg === "today" ? (
                <div className="space-y-3">
                  <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_50%)] ring-1 ring-[var(--ring)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--accent-ink)]/80">今日</div>
                        <div className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                          不調の波が来る前に、先回りで軽くする
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">
                          フォーカス：<span className="font-extrabold">{symptomLabel}</span>
                        </div>
                      </div>
                      <RiskBadge score={risk} />
                    </div>

                    <div className="mt-4 rounded-[18px] bg-white ring-1 ring-[var(--ring)] p-4">
                      <div className="text-sm font-extrabold text-slate-900">今日の短い先回り</div>
                      <div className="mt-2 space-y-2">
                        {advice.tips.slice(0, 3).map((t, i) => (
                          <div key={i} className="text-sm leading-7 text-slate-800">
                            ・{t}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-[11px] font-bold text-slate-500">
                        {advice.micro[0]}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
                    <div className="text-sm font-extrabold text-slate-900">あなたの体質（今の軸）</div>
                    <div className="mt-2 text-base font-extrabold tracking-tight text-slate-900">
                      {advice.core?.title || "—"}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-700">
                      {advice.core?.tcm_hint || ""}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Seg: week (placeholder until weather integration) */}
              {seg === "week" ? (
                <div className="space-y-3">
                  <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
                    <div className="text-sm font-extrabold text-slate-900">7日予報（準備中）</div>
                    <div className="mt-2 text-sm leading-7 text-slate-700">
                      次はここに「気象データ × 体質」で、揺れやすい日を並べます。
                      まずは今日の危険度と先回りを安定稼働させます。
                    </div>
                    <div className="mt-4">
                      <Button variant="ghost" onClick={() => setSeg("today")}>今日へ戻る</Button>
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_50%)] ring-1 ring-[var(--ring)] p-5">
                    <div className="text-sm font-extrabold text-slate-900">いま出来る最適化</div>
                    <div className="mt-2 text-sm leading-7 text-slate-700">
                      予報の精度を上げるには、体質チェック結果（保存済み）を最新に保つのが効きます。
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={() => router.push("/check")}>体質チェック</Button>
                      <Button variant="secondary" onClick={() => router.push("/history")}>履歴</Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Seg: profile */}
              {seg === "profile" ? (
                <div className="space-y-3">
                  <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900">体質の要約</div>
                        <div className="mt-2 text-base font-extrabold tracking-tight text-slate-900">
                          {advice.core?.title || "—"}
                        </div>
                      </div>
                      <div className="text-slate-500">
                        <IconCompass />
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-slate-700">
                      {advice.core?.tcm_hint || ""}
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
                    <div className="text-sm font-extrabold text-slate-900">張りやすい場所</div>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-[18px] bg-[color-mix(in_srgb,#ede9fe,white_55%)] ring-1 ring-[var(--ring)] p-4">
                        <div className="text-xs font-bold text-slate-500">主</div>
                        {merPrimary ? (
                          <>
                            <div className="mt-1 text-sm font-extrabold text-slate-900">{merPrimary.title}</div>
                            <div className="mt-1 text-xs font-bold text-slate-500">
                              {merPrimary.body_area}（{merPrimary.meridians.join("・")}）
                            </div>
                            <div className="mt-2 text-sm leading-7 text-slate-700">{merPrimary.organs_hint}</div>
                          </>
                        ) : (
                          <div className="mt-1 text-sm text-slate-700">今回は強い偏りなし</div>
                        )}
                      </div>

                      <div className="rounded-[18px] bg-[color-mix(in_srgb,#d1fae5,white_55%)] ring-1 ring-[var(--ring)] p-4">
                        <div className="text-xs font-bold text-slate-500">副</div>
                        {merSecondary ? (
                          <>
                            <div className="mt-1 text-sm font-extrabold text-slate-900">{merSecondary.title}</div>
                            <div className="mt-1 text-xs font-bold text-slate-500">
                              {merSecondary.body_area}（{merSecondary.meridians.join("・")}）
                            </div>
                            <div className="mt-2 text-sm leading-7 text-slate-700">{merSecondary.organs_hint}</div>
                          </>
                        ) : (
                          <div className="mt-1 text-sm text-slate-700">今回は強い偏りなし</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_50%)] ring-1 ring-[var(--ring)] p-5">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-white/70 ring-1 ring-[var(--ring)] text-slate-700">
                        <IconBolt />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900">更新</div>
                        <div className="mt-1 text-xs font-bold text-slate-600">
                          体質は固定じゃない。定期的に測り直した方が予報が当たる。
                        </div>
                        <div className="mt-3">
                          <Button onClick={() => router.push("/check")}>体質チェックを更新</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Module>
    </AppShell>
  );
}
