"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const SYMPTOMS = [
  { value: "fatigue", label: "だるさ・疲労" },
  { value: "sleep", label: "睡眠" },
  { value: "neck_shoulder", label: "首肩の重さ" },
  { value: "swelling", label: "むくみ" },
  { value: "headache", label: "頭痛" },
  { value: "low_back_pain", label: "腰の重さ" },
];

export default function CheckPage() {
  const [symptom_focus, setSymptomFocus] = useState("fatigue");
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

    const type = score >= 5 ? "巡り停滞タイプ" : score >= 3 ? "気血バランス崩れタイプ" : "安定タイプ";

    const payload = {
      answers: { symptom_focus, sleep, stress, cold, energy },
      type,
      explanation: buildExplanation(type, symptom_focus),
    };

    // ログイン中なら user_id を付ける（現状のappと互換維持）
    if (supabase) {
      const { data: s } = await supabase.auth.getSession();
      const userId = s?.session?.user?.id;
      if (userId) payload.user_id = userId;
    }

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

    window.location.href = `/result/${id}`;
  }

  return (
    <main style={{ padding: 16, maxWidth: 720 }}>
      <h1>体質チェック（仮）</h1>
      <p>※これは骨組みです。後で「ととのえタイプ分析」のロジックに差し替えます。</p>

      <form onSubmit={handleSubmit}>
        <label>いま一番困っている不調（主訴）</label>
        <br />
        <select value={symptom_focus} onChange={(e) => setSymptomFocus(e.target.value)}>
          {SYMPTOMS.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>

        <br /><br />

        <label>睡眠時間</label>
        <br />
        <select value={sleep} onChange={(e) => setSleep(e.target.value)}>
          <option>〜5時間</option>
          <option>5〜6時間</option>
          <option>6〜7時間</option>
          <option>7時間〜</option>
        </select>

        <br /><br />

        <label>ストレス感</label>
        <br />
        <select value={stress} onChange={(e) => setStress(e.target.value)}>
          <option>弱い</option>
          <option>普通</option>
          <option>強い</option>
        </select>

        <br /><br />

        <label>冷え</label>
        <br />
        <select value={cold} onChange={(e) => setCold(e.target.value)}>
          <option>冷えやすい</option>
          <option>どちらでもない</option>
          <option>熱がこもりやすい</option>
        </select>

        <br /><br />

        <label>体力・気力の波</label>
        <br />
        <select value={energy} onChange={(e) => setEnergy(e.target.value)}>
          <option>安定</option>
          <option>波がある</option>
          <option>落ちやすい</option>
        </select>

        <br /><br />

        <button type="submit">結果を見る</button>
      </form>
    </main>
  );
}

function buildExplanation(type, symptom_focus) {
  const symptomLabel = {
    fatigue: "だるさ・疲労",
    sleep: "睡眠",
    neck_shoulder: "首肩の重さ",
    swelling: "むくみ",
    headache: "頭痛",
    low_back_pain: "腰の重さ",
  }[symptom_focus] || "不調";

  if (type === "巡り停滞タイプ") {
    return `「${symptomLabel}」は、睡眠不足や緊張が続くと“巡り”が詰まることで出やすい傾向があります。まずは負担ラインを下げる（呼吸・温め・緩め）を優先します。`;
  }
  if (type === "気血バランス崩れタイプ") {
    return `「${symptomLabel}」は、回復と消耗のバランスが崩れると出やすい傾向があります。できる範囲で生活リズムを整えるのが最優先です。`;
  }
  return `現状は比較的安定しています。「${symptomLabel}」が出るときの“きっかけ”を観察して、悪化要因を減らすところから始めましょう。`;
}
