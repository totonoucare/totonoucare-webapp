// lib/diagnosis/v2/questions.js
/**
 * Diagnosis v2 Question Set (Revised)
 *
 * 目的：
 * - 1問1画面で進めやすい構造（UI側でQ番号/進捗を表示）
 * - 内部は中医学パラメータへ変換（気・血・津液・寒熱・回復）
 * - 主訴（symptom_focus）は入口レンズとして必須
 * - 経絡（主座）はLINE版Q5（M-test参考）を正式採用
 *
 * UI実装の前提：
 * - QUESTIONS を order 昇順で1問ずつ表示
 * - progress は QUESTIONS.length を使って表示
 * - options は value と label を表示
 * - score は scoring.js が参照（UIは使わない）
 */

export const SYMPTOM_OPTIONS = [
  { value: "fatigue", label: "だるさ・疲労" },
  { value: "sleep", label: "睡眠の乱れ" },
  { value: "mood", label: "気分の浮き沈み（イライラ／落ち込み／不安の波）" },
  { value: "neck_shoulder", label: "首肩のつらさ（重だるさ／こり）" },
  { value: "low_back_pain", label: "腰のつらさ（重だるさ／こり）" },
  { value: "swelling", label: "むくみやすい（重だるい）" },
  { value: "headache", label: "頭痛" },
  { value: "dizziness", label: "めまい・ふらつき" }
];

export const QUESTIONS = [
  {
    order: 1,
    id: "symptom_focus",
    type: "single",
    title: "今、いちばん気になっている不調はどれですか？",
    description:
      "これは「診断の原因」を決めるものではなく、結果の説明やケア提案の“文脈（レンズ）”として使います。",
    options: SYMPTOM_OPTIONS,
    required: true
  },

  // --- 気：量（虚） ↔ 巡り（滞） ---
  {
    order: 2,
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

  // --- 血：不足（虚） ↔ 滞り（瘀） ---
  {
    order: 3,
    id: "blood_state",
    type: "single",
    title: "次のうち、より当てはまるものは？",
    description: "AとBの両方がある場合は、より気になる方を選んでください。",
    options: [
      {
        value: "deficiency",
        label: "乾燥しやすい／目の疲れ／不安感が出やすい",
        score: { blood: -1 }
      },
      {
        value: "balanced",
        label: "特に気になることはない",
        score: { blood: 0 }
      },
      {
        value: "stasis",
        label: "コリや痛みが固定的／（女性は）生理痛が重い",
        score: { blood: +1 }
      }
    ],
    required: true
  },

  // --- 津液：不足（乾・陰） ↔ 痰湿（水滞・重） ---
  {
    order: 4,
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

  // --- 寒熱 ---
  {
    order: 5,
    id: "cold_heat",
    type: "single",
    title: "気温や環境への反応として近いものは？",
    description:
      "「冷え」と「ほてり／のぼせ」が混在する場合は、よりツラい方を選んでください。",
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

  // --- 回復レジリエンス（虚実の現代翻訳） ---
  {
    order: 6,
    id: "resilience",
    type: "single",
    title: "疲れたときの回復について、近いものは？",
    options: [
      {
        value: "low",
        label: "回復に時間がかかる（翌日に残りやすい）",
        score: { resilience: -1 }
      },
      {
        value: "medium",
        label: "休めば回復する",
        score: { resilience: 0 }
      },
      {
        value: "high",
        label: "回復は早い方だ（疲れても戻りやすい）",
        score: { resilience: +1 }
      }
    ],
    required: true
  },

  // --- 経絡（主座）: LINE版 Q5 を正式採用 ---
  {
    order: 7,
    id: "meridian_test",
    type: "single",
    title: "【Q7】経絡ラインの負荷チェック（動作テスト）",
    description:
      "次の動作を“軽く試したとき”、最も違和感・張り・ツラさが出やすいものを選んでください。無理に伸ばす必要はありません。",
    options: [
      {
        value: "A",
        label: "A：首を後ろに倒す・横（左右）を向く",
        hint: "首〜鎖骨まわりがつらい",
        meridian: ["lung", "large_intestine"]
      },
      {
        value: "B",
        label: "B：腕をバンザイ・首をうつむける",
        hint: "肩甲骨まわり／腕の内側（小指側）っぽい",
        meridian: ["heart", "small_intestine"]
      },
      {
        value: "C",
        label: "C：立ったまま前屈する",
        hint: "背中〜腰／脚の後ろ側がつらい",
        meridian: ["kidney", "bladder"]
      },
      {
        value: "D",
        label: "D：腰を左右にひねる・体を横に倒す",
        hint: "脇腹／股関節まわりがつらい",
        meridian: ["liver", "gallbladder"]
      },
      {
        value: "E",
        label: "E：腰に手を当てて上体を反らす",
        hint: "お腹／前ももがつらい",
        meridian: ["spleen", "stomach"]
      }
    ],
    required: true
  }
];

/**
 * UI helper:
 * - sort & filter
 */
export function getQuestions() {
  return [...QUESTIONS].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getTotalQuestions() {
  return getQuestions().length;
}
