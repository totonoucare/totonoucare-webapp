// app/result/page.js
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/requireUser";
import { supabaseServer } from "@/lib/supabaseServer";

import {
  CORE_LABELS,
  SUB_LABELS,
  MERIDIAN_LINES,
  SYMPTOM_LABELS,
} from "@/lib/diagnosis/v2/labels";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResultPage() {
  const { user } = await requireUser();
  if (!user) redirect("/signup");

  /* -----------------------------
     最新の体質プロフィール取得
  ----------------------------- */
  const { data: profile } = await supabaseServer
    .from("constitution_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/check");
  }

  /* -----------------------------
     今日のレーダー（お試し1回）
  ----------------------------- */
  const { data: radar } = await supabaseServer
    .from("daily_radar")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const core = CORE_LABELS[profile.computed?.core_code] ?? null;
  const subLabels = (profile.computed?.sub_labels || [])
    .map((c) => SUB_LABELS[c])
    .filter(Boolean)
    .slice(0, 2);

  const meridian =
    MERIDIAN_LINES[profile.primary_meridian] ?? null;

  /* -----------------------------
     UI
  ----------------------------- */
  return (
    <div className="space-y-6">

      {/* 主訴 */}
      <Card>
        <div className="text-sm text-slate-500 mb-1">今回のお悩み</div>
        <div className="text-lg font-semibold">
          {SYMPTOM_LABELS[profile.symptom_focus]}
        </div>
      </Card>

      {/* コア体質 */}
      {core && (
        <Card>
          <div className="text-sm text-slate-500 mb-1">あなたの体質傾向</div>
          <div className="text-xl font-bold">{core.title}</div>
          <div className="text-sm text-slate-600 mt-2">
            {core.tcm_hint}
          </div>
        </Card>
      )}

      {/* サブラベル */}
      {subLabels.length > 0 && (
        <Card>
          <div className="text-sm text-slate-500 mb-2">
            いま意識したいポイント
          </div>
          <ul className="space-y-2">
            {subLabels.map((l) => (
              <li key={l.title}>
                <div className="font-semibold">{l.title}</div>
                <div className="text-sm text-slate-600">
                  {l.action_hint}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 経絡 */}
      {meridian && (
        <Card>
          <div className="text-sm text-slate-500 mb-1">
            影響が出やすいライン
          </div>
          <div className="font-semibold">{meridian.title}</div>
          <div className="text-sm text-slate-600 mt-1">
            {meridian.body_area}
          </div>
        </Card>
      )}

      {/* 今日の状態 */}
      {radar && (
        <Card>
          <div className="text-sm text-slate-500 mb-1">
            今日の状態（お試し）
          </div>
          <div className="font-semibold">
            {["安定", "注意", "警戒", "要対策"][radar.level]}
          </div>
          {radar.reason_text && (
            <div className="text-sm text-slate-600 mt-1">
              {radar.reason_text}
            </div>
          )}
        </Card>
      )}

      {/* 今日の一手 */}
      <Card>
        <div className="text-sm text-slate-500 mb-2">
          今日の一手（無料体験）
        </div>

        <div className="font-semibold mb-1">
          まずはこれだけ
        </div>

        {/* 仮：1ステップのみ */}
        <div className="text-sm text-slate-700 mb-3">
          深く息を吐く呼吸を30秒だけ行い、
          体の緊張が抜ける感覚を作ってみてください。
        </div>

        <div className="flex gap-3">
          <Button variant="primary">
            やった！
          </Button>
          <Button variant="ghost">
            あとで
          </Button>
        </div>

        <div className="mt-3 text-xs text-slate-400">
          ※ 詳しい手順・図解はケアガイド購入後に解放されます
        </div>
      </Card>

      {/* CTA */}
      <Card>
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => redirect("/subscribe")}
          >
            未病レーダーを毎日受け取る（サブスク）
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => redirect("/guide")}
          >
            自分専用ケアガイドをすべて見る（買い切り）
          </Button>
        </div>
      </Card>
    </div>
  );
}
