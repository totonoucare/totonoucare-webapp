"use client";

import { useEffect, useState } from "react";

export default function ResultPage({ params }) {
  const { id } = params;
  const [data, setData] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(`assessment:${id}`);
    if (!raw) {
      setData({ notFound: true });
      return;
    }
    try {
      setData(JSON.parse(raw));
    } catch {
      setData({ notFound: true });
    }
  }, [id]);

  if (!data) {
    return (
      <div className="card">
        <h1>結果を読み込み中…</h1>
        <p className="small">少し待ってください。</p>
      </div>
    );
  }

  if (data.notFound) {
    return (
      <div className="card">
        <h1>結果が見つかりません</h1>
        <p className="small">
          この端末で保存された結果がないか、期限切れ/削除された可能性があります。
        </p>
        <div style={{ marginTop: 16 }}>
          <a className="btn primary" href="/check">体質チェックをやり直す</a>
        </div>
      </div>
    );
  }

  const { type, explanation, answers, createdAt } = data;

  return (
    <div className="card">
      <h1>体質チェック結果（仮）</h1>
      <p className="small">
        作成日時：{new Date(createdAt).toLocaleString("ja-JP")}
      </p>

      <hr />

      <h2 style={{ margin: "8px 0" }}>あなたは：{type}</h2>
      <p>{explanation}</p>

      <hr />

      <h3>回答内容</h3>
      <ul>
        <li>困っている不調：{answers?.symptom}</li>
        <li>睡眠時間：{answers?.sleep}</li>
        <li>ストレス感：{answers?.stress}</li>
        <li>冷え：{answers?.cold}</li>
        <li>体力・気力の波：{answers?.energy}</li>
      </ul>

      <hr />

      <h3>次のステップ</h3>
      <p className="small">
        ここから先（ケアガイド・記録・AI伴走）は登録後に解放する想定です。
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <a className="btn primary" href={`/signup?result=${encodeURIComponent(id)}`}>
          この結果を保存して登録する
        </a>
        <a className="btn" href="/check">別の条件でやり直す</a>
      </div>
    </div>
  );
}
