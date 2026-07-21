const MATERIAL_DEFINITIONS = {
  qi_stagnation: {
    label: "気滞",
    layer: "流通・緊張",
    role: "気の巡り、張り、切り替えにくさを表す構成要素",
    care_direction: "ゆるめる・めぐらせる",
  },
  qi_deficiency: {
    label: "気虚",
    layer: "絶対量・消耗",
    role: "動かす力と回復に使える気の不足を表す構成要素",
    care_direction: "ささえる・消耗を増やさない",
  },
  blood_deficiency: {
    label: "血虚",
    layer: "絶対量・滋養",
    role: "養う力、回復、目や睡眠に関わる血の不足を表す構成要素",
    care_direction: "養う・うるおす・休ませる",
  },
  blood_stasis: {
    label: "血瘀",
    layer: "流通・固定化",
    role: "局所に残るこわばりや固定化した巡りの滞りを表す構成要素",
    care_direction: "温めながら少しずつめぐらせる",
  },
  fluid_deficiency: {
    label: "津液不足",
    layer: "絶対量・潤い",
    role: "体を潤し、冷まし、滑らかに保つ津液の不足を表す構成要素",
    care_direction: "うるおす・消耗を防ぐ",
  },
  fluid_damp: {
    label: "痰湿",
    layer: "流通・重さ",
    role: "水分の停滞、重だるさ、動き始めにくさを表す構成要素",
    care_direction: "ながす・胃腸を支えながらさばく",
  },
};

const CORE_READINGS = {
  accel_batt_small: {
    title: "アクセル優位 × 余力小",
    integrated_meaning: "張る・詰まる・前へ出る反応が表に出やすい一方、回復に使える余力は小さめです。勢いで押し切れても、あとから反動が出やすい組み合わせです。",
    care_balance: "巡らせる・ゆるめる方向と、余力を守り支える方向を必ず両立する",
    avoid_bias: "発散や刺激だけを強め、さらに消耗させること",
  },
  accel_batt_standard: {
    title: "アクセル優位 × 余力標準",
    integrated_meaning: "張る・詰まる・前へ出る反応が表に出やすく、余力は標準域です。動けるため負荷を重ねやすく、区切りを入れないと張りが残りやすい組み合わせです。",
    care_balance: "巡らせる・ゆるめる方向を軸に、やり過ぎを区切る",
    avoid_bias: "動けることを余力が無限にあることと取り違えること",
  },
  accel_batt_large: {
    title: "アクセル優位 × 余力大",
    integrated_meaning: "張る・詰まる・前へ出る反応が表に出やすく、余力は大きめです。活動を続けられるぶん、滞りやこわばりを溜め込むまで気づきにくい組み合わせです。",
    care_balance: "余力を活かしつつ、張りや固定化を早めに逃がす",
    avoid_bias: "頑張れることを理由に微調整を後回しにすること",
  },
  brake_batt_small: {
    title: "ブレーキ優位 × 余力小",
    integrated_meaning: "重くなる・守る・動き始めにくい反応が表に出やすく、回復に使える余力も小さめです。まず土台を守り、少しずつ重さを抜く組み合わせです。",
    care_balance: "支える方向を先に置き、ながす・動かす刺激は小さく始める",
    avoid_bias: "重さを抜こうとして強く動かし、余力まで削ること",
  },
  brake_batt_standard: {
    title: "ブレーキ優位 × 余力標準",
    integrated_meaning: "重くなる・守る・動き始めにくい反応が表に出やすく、余力は標準域です。一定のリズムを作ると保ちやすい組み合わせです。",
    care_balance: "リズムを守りながら、ため込んだ重さを少しずつ動かす",
    avoid_bias: "急に活動量を上げ、切り替えの重さを増やすこと",
  },
  brake_batt_large: {
    title: "ブレーキ優位 × 余力大",
    integrated_meaning: "重くなる・守る・動き始めにくい反応が表に出やすく、余力は大きめです。土台は保ちやすい一方、重さや停滞を抱え込む組み合わせです。",
    care_balance: "余力を使って、ため込みを小さく動かし続ける",
    avoid_bias: "余力があるため重さや停滞を放置すること",
  },
};

const SYMPTOM_LENSES = {
  fatigue: "余力低下と、痰湿などによる重さを分けて確認する",
  sleep: "高ぶり・緊張、滋養や潤いの不足、余力の消耗を分けて確認する",
  digestion: "胃腸を支える力の不足と、湿・重さ・冷えの停滞を分けて確認する",
  neck_shoulder: "気滞による張り、血瘀による固定化、経絡ラインの動作反応を分けて確認する",
  low_back_pain: "余力や冷えの土台と、固定化した張り・動作ラインを分けて確認する",
  swelling: "痰湿の重さ、余力不足によるさばきにくさ、環境湿度を分けて確認する",
  headache: "張り・上への高ぶり、湿による頭重、固定化、余力低下を分けて確認する",
  dizziness: "余力・滋養不足と、巡りや湿の影響を分けて確認する",
  mood: "張り・詰まり・高ぶりと、消耗・滋養不足・睡眠や食欲の低下を分けて確認する",
};

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : null;
}

function materialScoreMap(splitScores = {}) {
  return {
    qi_deficiency: finite(splitScores?.qi?.deficiency),
    qi_stagnation: finite(splitScores?.qi?.stagnation),
    blood_deficiency: finite(splitScores?.blood?.deficiency),
    blood_stasis: finite(splitScores?.blood?.stasis),
    fluid_deficiency: finite(splitScores?.fluid?.deficiency),
    fluid_damp: finite(splitScores?.fluid?.damp),
  };
}

function rankedMaterials(profile = {}) {
  const selected = new Set(Array.isArray(profile.sub_labels) ? profile.sub_labels : []);
  const scores = materialScoreMap(profile.split_scores);
  return Object.entries(MATERIAL_DEFINITIONS)
    .map(([code, definition]) => ({
      code,
      ...definition,
      score: scores[code],
      score_available: scores[code] !== null,
      selected_as_sub_tendency: selected.has(code),
    }))
    .sort((a, b) => {
      if (a.score_available && b.score_available && b.score !== a.score) return b.score - a.score;
      if (a.score_available !== b.score_available) return a.score_available ? -1 : 1;
      if (a.selected_as_sub_tendency !== b.selected_as_sub_tendency) return a.selected_as_sub_tendency ? -1 : 1;
      return a.code.localeCompare(b.code);
    });
}

function integratedBalance(materials, coreCode) {
  const active = materials.filter((item) => item.score > 0).slice(0, 3);
  const hasDeficiency = active.some((item) => ["qi_deficiency", "blood_deficiency", "fluid_deficiency"].includes(item.code));
  const hasObstruction = active.some((item) => ["qi_stagnation", "blood_stasis", "fluid_damp"].includes(item.code));
  const core = CORE_READINGS[coreCode] || CORE_READINGS.brake_batt_standard;

  if (hasDeficiency && hasObstruction) {
    return `${core.care_balance}。下位構成には不足と滞りの両方があるため、単に補う／単に巡らせるの一方向へ寄せない。`;
  }
  if (hasDeficiency) {
    return `${core.care_balance}。下位構成では不足側が上位なので、発散よりも補う・守る順序を優先する。`;
  }
  if (hasObstruction) {
    return `${core.care_balance}。下位構成では滞り側が上位なので、巡らせる・さばく方向を使うが、余力区分に応じて刺激量を調整する。`;
  }
  return core.care_balance;
}

export const RECORDS_CONSTITUTION_MODEL_CONTEXT = {
  hierarchy: [
    "第1層はコアタイプ。アクセル／ブレーキ軸と余力軸を組み合わせた、体質チェック最上位の統合結果として最初に読む。",
    "第2層は二軸と滞り補助軸。反応方向、回復余力、滞り・重さ・固定化の強さを分けて読む。",
    "第3層は気滞・気虚・血虚・血瘀・痰湿・津液不足。コアタイプを構成し、崩れ方の内訳を説明する下位要素で、横並びの別診断ではない。",
    "第4層は不調フォーカス、主・副経絡、環境感受性、気象への反応補正。現在どこにどう表れやすいかを読む材料で、コアタイプそのものと混同しない。",
  ],
  accelerator_brake_axis: {
    role: "性格や活動量ではなく、不調時に表へ出やすい反応方向の要約。",
    engine_logic: "アクセル側は主に気滞。ブレーキ側は主に痰湿に、気虚と動き始めの重さを補助的に加えて比較する。主観的な寒熱は境界付近だけを補助する。",
    interpretation: "アクセル優位は張り・詰まり・前へ出る反応、ブレーキ優位は重さ・守り・動き始めにくさが相対的に表へ出やすいことを示す。",
  },
  reserve_axis: {
    role: "気血津液の絶対量だけでなく、消耗後の持ち越しと環境感受性まで含む回復バッテリー。",
    engine_logic: "気虚・血虚・津液不足の量的負荷を中心に、翌日への持ち越しや環境感受性を加えて余力を小・標準・大に分ける。",
    interpretation: "同じ滞りでも、余力小なら強く動かさず支えながら、余力大ならため込みを逃がすなど、刺激量と順序を変える。",
  },
  obstruction_axis: {
    role: "コアタイプを直接決める第三軸ではなく、滞り・重さ・固定化の程度を見る0〜1の内部補助軸。",
    engine_logic: "気滞・血瘀・痰湿を統合する。",
  },
  important_boundaries: [
    "上位2つのsub_tendenciesは代表ラベルであり、6要素すべてのスコアを捨ててよいという意味ではない。",
    "symptom_focusは結果の見せ方とケア・予報の焦点で、コアタイプ主計算の材料ではない。",
    "主・副経絡は動作負担や現れやすい体のラインで、臓腑疾患の診断ではなく、コアタイプ主計算の材料でもない。",
    "環境感受性は余力と気象への反応補正へ関わるが、当日の天気でベース体質を作り替えない。",
  ],
  inference_order: [
    "コアタイプを最上位の統合結果として読む",
    "アクセル／ブレーキと余力の組み合わせから、ケアの方向と刺激量を決める",
    "6つの物質・流通パターンの順位から、なぜそのタイプなのかを説明する",
    "不調フォーカス、経絡、天気、現在の訴えを重ねて、今回の質問と提案へ落とす",
  ],
};

export function buildConstitutionReasoningContext(profile = {}) {
  if (!profile?.core_code) return null;
  const materials = rankedMaterials(profile);
  const core = CORE_READINGS[profile.core_code] || CORE_READINGS.brake_batt_standard;
  const topLabels = materials.filter((item) => item.selected_as_sub_tendency).slice(0, 2);
  const quantityTotal = finite(profile?.split_scores?.total?.deficiency);
  const obstructionTotal = finite(profile?.split_scores?.total?.obstruction);

  return {
    hierarchy_role: "core_is_top_level_integrated_result",
    inference_order: RECORDS_CONSTITUTION_MODEL_CONTEXT.inference_order,
    core_reading: {
      code: profile.core_code,
      axis_label: core.title,
      integrated_meaning: core.integrated_meaning,
      care_balance: integratedBalance(materials, profile.core_code),
      avoid_one_sided_bias: core.avoid_bias,
    },
    axes: {
      accelerator_brake: {
        label: profile?.axes?.yin_yang_label || null,
        score: finite(profile?.axes?.yin_yang_score),
        meaning: RECORDS_CONSTITUTION_MODEL_CONTEXT.accelerator_brake_axis.interpretation,
      },
      reserve: {
        label: profile?.axes?.drive_label || null,
        score: finite(profile?.axes?.drive_score),
        meaning: RECORDS_CONSTITUTION_MODEL_CONTEXT.reserve_axis.interpretation,
      },
      obstruction_auxiliary: {
        score: finite(profile?.axes?.obstruction_score),
        meaning: RECORDS_CONSTITUTION_MODEL_CONTEXT.obstruction_axis.role,
      },
    },
    material_pattern_summary: {
      representative_labels: topLabels.map((item) => ({ code: item.code, label: item.label, score: item.score })),
      all_ranked_patterns: materials,
      quantity_deficiency_total: quantityTotal,
      obstruction_total: obstructionTotal,
      interpretation: "代表ラベルだけに縮めず、コアタイプと全6要素の順位を組み合わせて読む。",
    },
    current_expression_lenses: {
      symptom_focus: profile.symptom_focus || null,
      symptom_reasoning: SYMPTOM_LENSES[profile.symptom_focus] || "現在の訴えを、余力・滞り・寒熱・燥湿・経絡のどこに重ねるか確認する",
      meridian_usage: "主・副経絡は、今回の状態が現れやすい体のラインと、ほぐすケア・確認質問の優先順位に使う。",
      environment_usage: "環境感受性と本人が選んだ天候条件は、ベース体質を上書きせず、揺れやすさを小さく補正するために使う。",
    },
    consultation_rules: {
      kampo: "症状名だけで定番処方を列挙しない。コアタイプ→余力→全6パターン→現在の身体所見の順に読み、候補になる理由と候補から外れる所見を示す。",
      food: "コアタイプで刺激量と補瀉のバランスを決め、全6パターンと寒熱燥湿から食性・五味・調理法を選ぶ。",
      lifestyle: "アクセル／ブレーキで活動と休息の配分を、余力で実行量を、天気と時刻でタイミングを決める。",
      loosen: "主・副経絡を候補に含め、コアタイプと余力に応じて押す・さする・動かす・休ませるの強さを変える。",
    },
  };
}
