"use client";

// app/result/page.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
} from "@/lib/diagnosis/v2/labels";

function LockBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      🔒
    </span>
  );
}

function Toast({ text, onClose }) {
  if (!text) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-md justify-center px-4">
      <div className="w-full rounded-xl border bg-white px-4 py-3 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm text-slate-800">{text}</div>
          <button
            className="text-sm text-slate-500 hover:text-slate-700"
            onClick={onClose}
            aria-label="close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function pickFirstStep(card) {
  const steps = card?.body_steps;
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const first = steps[0];
  if (typeof first === "string") return first;
  if (first?.text) return first.text;
  return null;
}

export default function ResultPage() {
  const [loading, setLoading] = useState(true);

  const [ent, setEnt] = useState(null);
  const [profile, setProfile] = useState(null);

  const [today, setToday] = useState(null); // /api/radar/today
  const [aiExplain, setAiExplain] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);

  const [toast, setToast] = useState("");

  const hasGuide = useMemo(() => {
    const e = ent?.data;
    // entitlements/me の返しが実装によって違う可能性あるので柔軟に
    const list = Array.isArray(e) ? e : e?.entitlements || [];
    return list.some((x) => x.product === "guide_all_access" && x.status === "active");
  }, [ent]);

  const hasSub = useMemo(() => {
    const e = ent?.data;
    const list = Array.isArray(e) ? e : e?.entitlements || [];
    return list.some((x) => x.product === "radar_subscription" && x.status === "active");
  }, [ent]);

  const canSeeFullCards = hasGuide || hasSub;

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);

        const [entRes, profRes, todayRes] = await Promise.all([
          fetch("/api/entitlements/me", { cache: "no-store" }),
          fetch("/api/constitution/me", { cache: "no-store" }),
          fetch("/api/radar/today", { cache: "no-store" }),
        ]);

        const entJson = await entRes.json().catch(() => ({}));
        const profJson = await profRes.json().catch(() => ({}));
        const todayJson = await todayRes.json().catch(() => ({}));

        if (!alive) return;

        setEnt(entJson || null);
        setProfile(profJson?.data || null);
        setToday(todayJson?.data || todayJson || null);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  const ui = useMemo(() => {
    const symptom = profile?.symptom_focus || "fatigue";

    // v2 computed を優先、無ければ最低限のフォールバック
    const computed = profile?.computed || {};
    const coreCode = computed?.core_code;
    const core = getCoreLabel(coreCode);

    const subs = getSubLabels(computed?.sub_labels || profile?.computed?.sub_labels || []);
    const mer = getMeridianLine(profile?.primary_meridian || computed?.primary_meridian);

    return {
      symptom,
      symptomLabel: SYMPTOM_LABELS[symptom] || "だるさ・疲労",
      coreCode,
      core,
      subs,
      mer,
    };
  }, [profile]);

  async function runAiExplain() {
    try {
      setAiBusy(true);
      setAiExplain(null);

      const res = await fetch("/api/ai/explain-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          // explain-today 側が “profile無し” でも動くようにしてる想定
          // ただし v2に合わせるなら将来: constitution_profiles を参照させる
          use_constitution_v2: true,
        }),
      });

      const json = await res.json();
      const text = json?.data?.text || json?.text || json?.data || null;

      setAiExplain(text || "（AIの説明を取得できませんでした）");
    } catch (e) {
      console.error(e);
      setAiExplain("（AIの説明を取得できませんでした）");
    } finally {
      setAiBusy(false);
    }
  }

  async function recordToday(mainOrFood) {
    // mainOrFood: { kind, card_id }
    try {
      const res = await fetch("/api/carelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          // サーバ側の期待に合わせて（あなたの carelogs API に合わせている想定）
          kind: mainOrFood.kind,
          card_id: mainOrFood.card_id || null,
          done_level: 2, // ◎
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to record");
      }

      setToast("記録しました ✅（続けるほど“自分の崩れやすい条件”が見えてきます）");
      setTimeout(() => setToast(""), 3500);
    } catch (e) {
      console.error(e);
      setToast(`記録に失敗しました: ${e?.message || String(e)}`);
      setTimeout(() => setToast(""), 4500);
    }
  }

  // 今日の一手（APIが返す想定に合わせて柔軟に）
  const mainCard = today?.cards?.main || today?.mainCard || today?.main_card || null;
  const foodCard = today?.cards?.food || today?.foodCard || today?.food_card || null;

  const mainCardTeaser = useMemo(() => pickFirstStep(mainCard), [mainCard]);
  const foodCardTeaser = useMemo(() => pickFirstStep(foodCard), [foodCard]);

  return (
    <div className="space-y-4">
      <Toast text={toast} onClose={() => setToast("")} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">診断結果</div>
          <h1 className="text-xl font-semibold text-slate-900">
            {ui.symptomLabel} × {ui.core?.title || "バランス維持タイプ"}
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            {ui.core?.short || ""}{" "}
            {ui.coreCode ? <span className="text-slate-400">({ui.coreCode})</span> : null}
          </div>
        </div>

        <div className="shrink-0">
          <Link href="/check">
            <Button variant="secondary">再チェック</Button>
          </Link>
        </div>
      </div>

      {/* 体質サマリ */}
      <Card>
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-900">あなたの体質サマリ（固定）</div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs text-slate-500">メイン</div>
              <div className="mt-1 font-medium">{ui.core?.title || "バランス維持タイプ"}</div>
              <div className="mt-1 text-sm text-slate-600">{ui.core?.tcm_hint || ""}</div>
            </div>

            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs text-slate-500">影響が出やすいライン</div>
              <div className="mt-1 font-medium">{ui.mer?.title || "未設定"}</div>
              <div className="mt-1 text-sm text-slate-600">{ui.mer?.body_area || ""}</div>
              <div className="mt-1 text-xs text-slate-500">
                {ui.mer?.meridians?.length ? `(${ui.mer.meridians.join("・")})` : ""}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-3">
            <div className="text-xs text-slate-500">サブ（最大2つ）</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(ui.subs?.length ? ui.subs : []).map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                >
                  {s.short}：{s.title}
                </span>
              ))}
              {!ui.subs?.length ? (
                <span className="text-sm text-slate-600">（まだ判定がありません。体質チェックを行ってください）</span>
              ) : null}
            </div>
            {ui.subs?.length ? (
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {ui.subs.map((s, idx) => (
                  <div key={idx}>・{s.action_hint}</div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/guide">
              <Button>自分専用ケアガイドを見る {hasGuide ? "" : "（買い切り）"}</Button>
            </Link>
            <Link href="/radar">
              <Button variant="secondary">未病レーダーへ</Button>
            </Link>
          </div>

          {!profile && !loading ? (
            <div className="text-sm text-amber-700">
              体質情報はまだ未設定です（体質チェックで精度が上がります）
            </div>
          ) : null}
        </div>
      </Card>

      {/* 今日 */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900">今日の見立て（お試し）</div>
              <div className="mt-1 text-sm text-slate-600">
                {today?.summary || today?.label || "今日の状態は計算中です"}
              </div>
            </div>

            <div className="shrink-0">
              <Button variant="secondary" onClick={runAiExplain} disabled={aiBusy}>
                {aiBusy ? "AI生成中…" : "AIで説明（翻訳）"}
              </Button>
            </div>
          </div>

          {aiExplain ? (
            <div className="rounded-lg border bg-white p-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {aiExplain}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {/* 今日の一手（メイン） */}
            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs text-slate-500">今日の一手（メイン）</div>
              <div className="mt-1 font-medium">
                {mainCard?.title || "（未設定）"}
                {!canSeeFullCards ? <LockBadge /> : null}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                {mainCard ? (
                  canSeeFullCards ? (
                    <div className="space-y-1">
                      {(Array.isArray(mainCard.body_steps) ? mainCard.body_steps : []).slice(0, 5).map((s, i) => (
                        <div key={i}>・{typeof s === "string" ? s : s?.text || JSON.stringify(s)}</div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      ・{mainCardTeaser || "（内容の一部を表示）"} <span className="text-slate-400">…</span>
                      <div className="mt-2 text-xs text-slate-500">
                        全文は「買い切りガイド」または「サブスク」で解放されます。
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-slate-500">（カードがありません）</div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => recordToday({ kind: mainCard?.kind || "breathing", card_id: mainCard?.id })}
                  disabled={!mainCard}
                >
                  やった！を記録
                </Button>

                {!hasSub ? (
                  <Link href="/signup">
                    <Button variant="secondary">記録を可視化する（サブスク）</Button>
                  </Link>
                ) : (
                  <Link href="/calendar">
                    <Button variant="secondary">記録を見る</Button>
                  </Link>
                )}
              </div>
            </div>

            {/* 食（おまけ） */}
            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs text-slate-500">食の一言（おまけ）</div>
              <div className="mt-1 font-medium">
                {foodCard?.title || "（未設定）"}
                {!canSeeFullCards ? <LockBadge /> : null}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                {foodCard ? (
                  canSeeFullCards ? (
                    <div className="space-y-1">
                      {(Array.isArray(foodCard.body_steps) ? foodCard.body_steps : []).slice(0, 4).map((s, i) => (
                        <div key={i}>・{typeof s === "string" ? s : s?.text || JSON.stringify(s)}</div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      ・{foodCardTeaser || "（内容の一部を表示）"} <span className="text-slate-400">…</span>
                      <div className="mt-2 text-xs text-slate-500">
                        “今日の一手＋食” が毎日出ます。サブスクで自動化。
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-slate-500">（カードがありません）</div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => recordToday({ kind: foodCard?.kind || "food", card_id: foodCard?.id })}
                  disabled={!foodCard}
                >
                  できた！を記録
                </Button>

                {!hasGuide ? (
                  <Link href="/guide">
                    <Button>ケアガイドを買い切り</Button>
                  </Link>
                ) : (
                  <Link href="/guide">
                    <Button>ガイドを見る</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* CTA（2本柱） */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="text-sm font-medium text-slate-900">続けるなら、どっち？</div>
            <div className="mt-1 text-sm text-slate-600">
              「全部見返す教科書」か、「毎日届く＋記録で自分の崩れ方が見える」か。
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/guide">
                <Button>{hasGuide ? "ケアガイドへ" : "自分専用ケアガイド（買い切り）"}</Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary">{hasSub ? "サブスク設定へ" : "未病レーダー（サブスク）"}</Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* 読み込み */}
      {loading ? (
        <div className="text-sm text-slate-500">読み込み中…</div>
      ) : null}
    </div>
  );
}
