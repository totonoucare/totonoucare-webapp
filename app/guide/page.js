"use client";

import { useEffect, useMemo, useState } from "react";

export default function GuidePage() {
  const [user, setUser] = useState(null);
  const [assessment, setAssessment] = useState(null);

  const assessmentId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("latestAssessmentId") || "";
  }, []);

  useEffect(() => {
    const rawUser = localStorage.getItem("mockUser");
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {}
    }
    if (assessmentId) {
      const raw = localStorage.getItem(`assessment:${assessmentId}`);
      if (raw) {
        try {
          setAssessment(JSON.parse(raw));
        } catch {}
      }
    }
  }, [assessmentId]);

  if (!user) {
    return (
      <div className="card">
        <h1>ととのうケアガイド（仮）</h1>
        <p className="small">
          このページは登録後に見られます（いまは仮の登録＝localStorageです）。
        </p>
        <div style={{ marginTop: 16 }}>
          <a className="btn primary" href="/signup">登録して続ける</a>
          <a className="btn" href="/check" style={{ marginLeft: 10 }}>体質チェックへ</a>
        </div>
      </div>
    );
  }

  const type = assessment?.type || "（診断結果が未取得）";
  const symptom = assessment?.answers?.symptom || "（未選択）";

  const guide = buildGuide(type, symptom);

  return (
    <div className="card">
      <h1>ととのうケアガイド（仮）</h1>
      <p className="small">
        ログイン中（仮）：{user.email}
      </p>

      <hr />

      <h2>あなたの状態</h2>
      <ul>
        <li>体質タイプ（仮）：{type}</li>
        <li>困っている不調：{symptom}</li>
      </ul>

      <hr />

      <h2>優先ケア（仮）</h2>
      <div className="card" style={{ marginTop: 10 }}>
        <h3 style={{ marginTop: 0 }}>1) 今日やる（5〜8分）</h3>
        <ul>
          {guide.today.map((x) => <li key={x}>{x}</li>)}
        </ul>

        <h3>2) できる日だけ（10分）</h3>
        <ul>
          {guide.optional.map((x) => <li key={x}>{x}</li>)}
        </ul>

        <h3>3) 食養生（ゆるく）</h3>
        <ul>
          {guide.food.map((x) => <li key={x}>{x}</li>)}
        </ul>

        <h3>4) 市販漢方 “例”（※仮）</h3>
        <p className="small">
          ※ これは現在ダミーです。実装時は、禁忌・受診推奨・服薬中の注意などを必ず含めます。
        </p>
        <ul>
          {guide.otc.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>

      <hr />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="btn primary" href="/check">もう一度チェック</a>
        <a className="btn" href="/" onClick={() => logout()}>
          （仮）ログアウト
        </a>
      </div>
    </div>
  );
}

function logout() {
  localStorage.removeItem("mockUser");
  // latestAssessmentId は残しておく（現実でも「前回結果」扱いにできる）
  window.location.href = "/";
}

function buildGuide(type, symptom) {
  // いまは仮。後で既存ロジックを移植して差し替える。
  if (type.includes("巡り停滞")) {
    return {
      today: [
        "首〜胸の前をゆるめる（胸鎖乳突筋〜鎖骨まわりを軽く）",
        "呼吸：4秒吸って→6秒吐く×8回",
        "温め：首・みぞおちを3〜5分"
      ],
      optional: [
        "背中を丸めて伸ばす（猫のポーズ）30秒×3",
        "軽い散歩 10分（息が上がらない強度）"
      ],
      food: [
        "温かい汁物を足す（冷たい飲み物は減らす）",
        "夜遅い食事を避ける（消化の負担を減らす）"
      ],
      otc: [
        "例：気の巡り系（※後で具体名は表現設計して出します）",
        "例：ストレス＋胃腸ケア系"
      ]
    };
  }

  if (type.includes("気血バランス")) {
    return {
      today: [
        "起床後に日光を浴びる（3〜5分）",
        "肩甲骨まわりを動かす（ぐるぐる10回×2）",
        "入浴 or 足湯 5〜10分"
      ],
      optional: [
        "スクワット浅め10回×2（無理しない）",
        "就寝前ストレッチ（前もも・ふくらはぎ）"
      ],
      food: [
        "朝か昼にタンパク質を足す（卵/魚/豆）",
        "カフェインを午後に寄せない"
      ],
      otc: [
        "例：疲労感＋胃腸ケア系",
        "例：睡眠リズムサポート系"
      ]
    };
  }

  return {
    today: [
      "軽いストレッチ（首・肩）2分",
      "深呼吸（長く吐く）1分",
      "水分（温かいもの）を1杯"
    ],
    optional: [
      "散歩10分",
      "入浴で温め"
    ],
    food: [
      "冷たいものを控えめに",
      "夜食を減らす"
    ],
    otc: [
      "例：症状に応じたサポート（後で設計）"
    ]
  };
}
