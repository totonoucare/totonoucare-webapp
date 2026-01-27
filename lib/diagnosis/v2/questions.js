// lib/diagnosis/v2/questions.js

/**
 * Diagnosis v2 Question Set
 *
 * 設計思想：
 * - ユーザーは「感覚」で答えられる
 * - 内部では中医学的パラメータ（気・血・津液・寒熱・回復力）に変換
 * - 主訴（symptom_focus）は入口レンズとして明示的に取得
 */

export const SYMPTOM_OPTIONS = [
  { value: "fatigue", label: "だるさ・疲労" },
  { value: "sleep", label: "睡眠の乱れ" },
  { value: "mood", label: "気分の浮き沈み" },
  { value: "neck_shoulder", label: "首や肩のつらさ" },
  { value: "low_back_pain", label: "腰のつらさ" },
  { value: "swelling", label: "むくみやすい" },
  { value: "headache", label: "頭痛" },
  { value: "dizziness", label: "めまい・ふらつき" }
];

export const QUESTIONS = [
  {
    id: "symptom_focus",
    type: "single",
    title: "今、いちばん気になっている不調はどれですか？",
    options: SYMPTOM_OPTIONS,
    required: true
  },

  // --- 気の状態（量・巡り） ---
  {
    id: "qi_state",
    type: "single",
    title: "最近のエネルギーの出方として、近いものは？",
    options: [
      {
        value: "deficiency",
        label: "すぐ疲れる／力が入りにくい",
        score: { qi: -1 }
      },
      {
        value: "balanced",
        label: "特に問題は感じない",
        score: { qi: 0 }
      },
      {
        value: "stagnation",
        label: "溜め込んで張る感じ／イライラしやすい",
        score: { qi: +1 }
      }
    ],
    required: true
  },

  // --- 血の状態 ---
  {
    id: "blood_state",
    type: "single",
    title: "次のうち、より当てはまるものは？",
    options: [
      {
        value: "deficiency",
        label: "乾燥しやすい／目の疲れ／不安感",
        score: { blood: -1 }
      },
      {
        value: "balanced",
        label: "特に気になることはない",
        score: { blood: 0 }
      },
      {
        value: "stasis",
        label: "コリや痛みが固定的／生理痛が重い",
        score: { blood: +1 }
      }
    ],
    required: true
  },

  // --- 津液（水）の状態 ---
  {
    id: "fluid_state",
    type: "single",
    title: "体の水分バランスについて近いものは？",
    options: [
      {
        value: "deficiency",
        label: "乾燥しやすい／のどが渇きやすい",
        score: { fluid: -1 }
      },
      {
        value: "balanced",
        label: "特に偏りは感じない",
        score: { fluid: 0 }
      },
      {
        value: "damp",
        label: "むくみやすい／体が重い",
        score: { fluid: +1 }
      }
    ],
    required: true
  },

  // --- 寒熱傾向 ---
  {
    id: "cold_heat",
    type: "single",
    title: "気温や環境への反応として近いものは？",
    options: [
      {
        value: "cold",
        label: "冷えやすく、冷えると不調が出やすい",
        score: { cold_heat: -1 }
      },
      {
        value: "neutral",
        label: "寒さ暑さに大きな偏りはない",
        score: { cold_heat: 0 }
      },
      {
        value: "heat",
        label: "暑さが苦手／ほてりやすい",
        score: { cold_heat: +1 }
      }
    ],
    required: true
  },

  // --- 回復レジリエンス ---
  {
    id: "resilience",
    type: "single",
    title: "疲れたときの回復について、近いものは？",
    options: [
      {
        value: "low",
        label: "回復に時間がかかる",
        score: { resilience: -1 }
      },
      {
        value: "medium",
        label: "休めば回復する",
        score: { resilience: 0 }
      },
      {
        value: "high",
        label: "回復は早い方だ",
        score: { resilience: +1 }
      }
    ],
    required: true
  },

  // --- 体表経絡（主座） ---
  {
    id: "primary_meridian",
    type: "single",
    title: "動かしたとき、いちばん張りやすい・つらいラインは？",
    description: "ストレッチして一番気になるところを選んでください",
    options: [
      { value: "liver", label: "体の側面・脇〜太もも外側" },
      { value: "spleen", label: "内もも〜お腹まわり" },
      { value: "kidney", label: "腰〜背中下部" },
      { value: "bladder", label: "背中〜脚の後ろ側" },
      { value: "stomach", label: "前もも〜すね" },
      { value: "gallbladder", label: "お尻〜脚の外側" },
      { value: "lung", label: "胸〜腕の内側" },
      { value: "heart", label: "脇〜腕の内側" }
    ],
    required: true
  }
];
