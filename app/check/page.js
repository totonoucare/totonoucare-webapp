"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CheckPage() {
  const [symptom, setSymptom] = useState("肩こり");
  const [sleep, setSleep] = useState("6〜7時間");
  const [stress, setStress] = useState("普通");
  const [cold, setCold] = useState("冷えやすい");
  const [energy, setEnergy] = useState("波がある");

  async function handleSubmit(e) {
    e.preventDefault();

    // いまは仮のロジック（後で既存診断ロジックに置き換える）
    const score =
      (cold === "冷えやすい" ? 2 : 0) +
      (stress === "強い" ? 2 : stress === "普通" ? 1 : 0) +
      (sleep === "〜5時間" ? 2 : sleep === "5〜6時間" ? 1 : 0) +
      (energy === "波がある" ? 1 : 0);

    const type =
      score >= 5 ? "巡り停滞タイプ" : score >= 3 ? "気血バランス崩れタイプ" : "安定タイプ";

const payload = {
  answers: { symptom, sleep, stress, cold, energy },
  type,
  explanation: buildExplanation(type, symptom),
};

// ✅ ログイン中なら user_id を payload に追加して送る
if (supabase) {
  const { data: s } = await supabase.auth.getSession();
  const userId = s?.session?.user?.id;
  if (userId) payload.user_id = userId;
}

    // ✅ DBに保存して、Supabaseの assessments.id を受け取る
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(json);
      alert("保存に失敗しました。Vercelのログと /api/assessments を確認してください。");
      return;
    }

    const id = json?.id;
    if (!id) {
      console.error(json);
      alert("保存はできたが id が返ってきていません。/api/assessments の返却を確認してください。");
      return;
    }

    // ✅ 結果ページへ（DBのID）
    window.location.href = `/result/${id}`;
  }

  return (
    <div className="card">
      <h1>体質チェック（仮）</h1>
      <p className="small">
        ※ これはWebアプリの骨組み用です。後で「ととのえタイプ分析」のロジックに差し替えます。
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div style={{ marginTop: 12 }}>
          <div className="label">いま一番困っている不調</div>
          <select className="select" value={symptom} onChange={(e) => setSymptom(e.target.value)}>
            <option>肩こり</option>
            <option>首こり</option>
            <option>頭痛</option>
            <option>胃腸の不調</option>
            <option>睡眠の不調</option>
            <option>メンタルの不調</option>
            <option>疲れやすさ</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="label">睡眠時間</div>
          <select className="select" value={sleep} onChange={(e) => setSleep(e.target.value)}>
            <option>〜5時間</option>
            <option>5〜6時間</option>
            <option>6〜7時間</option>
            <option>7時間〜</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="label">ストレス感</div>
          <select className="select" value={stress} onChange={(e) => setStress(e.target.value)}>
            <option>弱い</option>
            <option>普通</option>
            <option>強い</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="label">冷え</div>
          <select className="select" value={cold} onChange={(e) => setCold(e.target.value)}>
            <option>冷えやすい</option>
            <option>どちらでもない</option>
            <option>熱がこもりやすい</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="label">体力・気力の波</div>
          <select className="select" value={energy} onChange={(e) => setEnergy(e.target.value)}>
            <option>安定</option>
            <option>波がある</option>
            <option>落ちやすい</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn primary" type="submit">
            結果を見る
          </button>
        </div>
      </form>
    </div>
  );
}

function buildExplanation(type, symptom) {
  if (type === "巡り停滞タイプ") {
    return `「${symptom}」は、ストレスや睡眠不足などで“巡り”が詰まると出やすくなります。まずは負担ラインを下げる（睡眠・緊張の抜け）を優先すると改善が早いです。`;
  }
  if (type === "気血バランス崩れタイプ") {
    return `「${symptom}」は、回復と消耗のバランスが崩れると出やすい傾向があります。できる範囲で生活リズムを整えるのが最優先です。`;
  }
  return `現状は比較的安定しています。「${symptom}」が出るときの“きっかけ”を観察して、悪化要因を減らすところから始めましょう。`;
}
