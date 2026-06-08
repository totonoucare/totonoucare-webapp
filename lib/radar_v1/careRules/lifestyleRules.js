// lib/radar_v1/careRules/lifestyleRules.js

function normalizeTriggerKey(key) {
  if (key === "humidity") return "damp";
  if (key === "temp") return "cold";
  return key || "default";
}

const TODAY_LIFESTYLE_FOCUS_RULES = {
  fatigue: {
    default: {
      lead: "だるさがある日は、動きを増やすより“消耗を増やさない配置”に寄せるのがコツです。",
      step: "予定をひとつ小さくして、移動・家事・作業のどれかを軽くする",
    },
    damp: {
      lead: "だるさ・眠気・体の重さが出やすい日は、こもりを抜くほど動き出しが軽くなります。",
      step: "座りっぱなしを一度切り、足踏みか短い歩行で重さを外に逃がす",
    },
    pressure_down: {
      lead: "気圧の影響でぼんやりしやすい日は、頭を使い続けるより短い切り替えを挟みます。",
      step: "集中を続ける前に、目を閉じて首を起こす時間を30秒だけ作る",
    },
    cold: {
      lead: "冷えでエンジンがかかりにくい日は、頑張る前に温める場所を決めます。",
      step: "足首かお腹を温めてから、用事を一つだけ始める",
    },
    heat: {
      lead: "暑さで体力を削られやすい日は、動き切るより熱を逃がしながら進めます。",
      step: "強い作業は短く区切り、首元を冷ましてから再開する",
    },
    dry: {
      lead: "乾きがある日は、疲れを水分不足や目の使いすぎで上乗せしないようにします。",
      step: "温かい飲み物を少し取り、目を休める時間を先に入れる",
    },
  },
  digestion: {
    default: {
      lead: "胃腸が気になる日は、頑張って整えるより“重さを増やさない配置”に寄せるのがコツです。",
      step: "冷たいものを続けず、食後に数分だけ立つか歩く",
    },
    damp: {
      lead: "湿気の日は、胃腸の重さやお腹の張りとして残りやすいです。",
      step: "冷たい飲み物と甘いものを重ねず、温かい飲み物を一つ足す",
    },
    pressure_down: {
      lead: "気圧が下がる日は、だるさと一緒に胃腸の動きも重く感じやすいです。",
      step: "詰め込みすぎず、食事量を少し軽くして温かい汁物を足す",
    },
    cold: {
      lead: "冷えの日は、お腹まわりの冷たさが胃腸の重さに残りやすいです。",
      step: "足元かお腹を冷やさず、冷たい飲み物を続けない",
    },
    heat: {
      lead: "暑さの日は、冷たいものが増えるほど胃腸に負担が残りやすいです。",
      step: "冷たい飲み物を続けず、常温か温かいものを一つ挟む",
    },
    dry: {
      lead: "乾燥の日は、水分不足と食べ方の重さが胃腸の違和感に重なりやすいです。",
      step: "温かい飲み物を少し取り、急いで食べる流れを一度切る",
    },
  },
  sleep: {
    default: {
      lead: "睡眠が気になる日は、今日の夜に刺激を残さない動き方へ寄せます。",
      step: "夜に持ち越したくない用事を一つだけ決め、それ以外は明日に回す",
    },
    damp: {
      lead: "湿気の日は体が重く、夜までだるさを引きずりやすいので、寝る前のこもりを減らします。",
      step: "夕方以降は部屋のこもりを抜き、寝室に湿気を溜めない",
    },
    pressure_down: {
      lead: "気圧変化で眠気と頭の重さが混ざる日は、夜の画面刺激を減らすほど休みやすくなります。",
      step: "寝る前に首を固める姿勢を減らし、画面を見る時間を短くする",
    },
    cold: {
      lead: "冷えを拾う日は、足元やお腹の冷たさが眠りの入りに残りやすいです。",
      step: "寝る前に足首かお腹を温め、布団に入る前の冷えを減らす",
    },
    heat: {
      lead: "暑さが残る日は、寝る前に熱を抜ける環境を作ることが優先です。",
      step: "入浴後すぐ布団に入らず、汗と熱が少し引いてから休む",
    },
    dry: {
      lead: "乾燥の日は、喉や目の乾きが夜の不快感につながりやすいです。",
      step: "枕元に水を置き、顔に風が直接当たらないようにする",
    },
    pressure_up: {
      lead: "張りつめやすい日は、寝る直前まで頭を動かし続けないことが大切です。",
      step: "寝る30分前だけ通知を見ない時間を作り、予定を頭の外に出す",
    },
  },
  neck_shoulder: {
    default: {
      lead: "首肩が気になる日は、姿勢を正し続けるより“固めっぱなしを切る”方が使いやすいです。",
      step: "画面から目を離し、首を起こして肩を一度落とす",
    },
    damp: {
      lead: "湿気で上半身が重い日は、首肩のこもりも抜けにくくなります。",
      step: "首元の汗・湿り・締めつけを減らし、肩を軽く回す",
    },
    pressure_down: {
      lead: "気圧が下がる日は、頭だけでなく首肩から重さが来ることがあります。",
      step: "耳まわりをゆるめてから、首の後ろを長くする姿勢に戻す",
    },
    cold: {
      lead: "冷えの日は、首元を冷やすほど肩の力みとして残りやすいです。",
      step: "首元か肩甲骨まわりを一か所だけ温める",
    },
    heat: {
      lead: "暑さで力が入りやすい日は、首の後ろに熱を溜めないことを意識します。",
      step: "首の後ろを短時間冷まして、肩の力を抜く",
    },
    dry: {
      lead: "目や喉の乾きがある日は、画面疲れから首肩が固まりやすくなります。",
      step: "目を閉じる時間を10秒作り、あごを軽く引いて首を休める",
    },
  },
  low_back_pain: {
    default: {
      lead: "腰が気になる日は、腰だけを伸ばすより“同じ姿勢を続けない”ことを優先します。",
      step: "座りっぱなしを一度切り、骨盤まわりを小さく動かす",
    },
    damp: {
      lead: "湿気の日は、腰〜骨盤まわりや下半身の重さとして出やすいです。",
      step: "長く座る前に立ち上がり、腰まわりの重さを一度逃がす",
    },
    pressure_down: {
      lead: "気圧が下がる日は、だるさで姿勢が崩れ、腰まわりに負担が寄りやすくなります。",
      step: "浅く座り続けず、背中を起こして骨盤の位置を一度リセットする",
    },
    cold: {
      lead: "冷えの日は、腰腹・足首の冷たさが動き出しのこわばりに残りやすいです。",
      step: "腰腹か足首のどちらかを温め、冷えを腰に持ち込まない",
    },
    heat: {
      lead: "暑さでだるい日は、脱水や疲労で腰を支える力が落ちやすくなります。",
      step: "水分を小分けに取り、重い荷物や前かがみ作業を続けすぎない",
    },
    dry: {
      lead: "乾きがある日は、疲れとこわばりを腰に残さないように休み方を軽くします。",
      step: "腰を反らせ続ける姿勢を避け、短く体勢を変える",
    },
  },
  swelling: {
    default: {
      lead: "むくみが気になる日は、強く流そうとするより“溜める条件を減らす”のが先です。",
      step: "足首を小さく回し、座りっぱなし・立ちっぱなしを一度切る",
    },
    damp: {
      lead: "湿気の日は、顔や脚の重さとして出やすいので、こもりと停滞を減らします。",
      step: "足首を動かしてから、部屋や服の湿りを少し抜く",
    },
    pressure_down: {
      lead: "気圧が下がる日は、下半身の重さやぼんやり感が出やすくなります。",
      step: "ふくらはぎを軽く動かし、低い姿勢のまま固まらない",
    },
    cold: {
      lead: "冷えの日は、足元が冷えるほど巡りが鈍く感じやすいです。",
      step: "足首を冷やさず、つま先を数回動かしてから過ごす",
    },
    heat: {
      lead: "暑い日は、水分不足と塩気の重なりで重さを感じやすいです。",
      step: "水分を小分けに取り、長時間同じ姿勢のまま過ごさない",
    },
  },
  headache: {
    default: {
      lead: "頭痛が気になる日は、頭だけで粘らず、首・目・耳まわりの負担を減らします。",
      step: "画面から目を離し、首の後ろとこめかみの力を抜く",
    },
    damp: {
      lead: "湿気の日は、頭の重さやぼんやり感として出ることがあります。",
      step: "換気して空気を入れ替え、首元のこもりを減らす",
    },
    pressure_down: {
      lead: "気圧が下がる日は、頭・耳・首肩のこもりを早めに逃がします。",
      step: "耳まわりを軽くほぐし、画面姿勢を一度リセットする",
    },
    cold: {
      lead: "冷えの日は、首元の冷たさから頭まわりがこわばることがあります。",
      step: "首元を冷やさず、肩をすくめて落とす動きを3回する",
    },
    heat: {
      lead: "暑さの日は、熱のこもりや水分不足で頭に負担が出やすいです。",
      step: "首の後ろを短時間冷まし、水分を少しずつ取る",
    },
    dry: {
      lead: "乾燥の日は、目の疲れや喉の乾きから頭が重く感じやすいです。",
      step: "目を10秒閉じて、温かい飲み物を少し取る",
    },
  },
  dizziness: {
    default: {
      lead: "めまいが気になる日は、急に動かず、頭と体の向きをゆっくり切り替えます。",
      step: "立ち上がる前に一呼吸置き、首を急に振らない",
    },
    damp: {
      lead: "湿気の日は、頭の重さやふわつき感として出やすいことがあります。",
      step: "こもった空気を入れ替え、急な姿勢変更を避ける",
    },
    pressure_down: {
      lead: "気圧が下がる日は、耳まわりや首の緊張にも注意します。",
      step: "耳まわりを軽くゆるめ、立ち上がりをゆっくりにする",
    },
    cold: {
      lead: "冷えの日は、首元や足元の冷たさで体の切り替えが鈍く感じやすいです。",
      step: "足元を冷やさず、立つ前に足指を数回動かす",
    },
    heat: {
      lead: "暑さの日は、熱と水分不足でふらつき感が出やすくなります。",
      step: "無理に動き続けず、涼しい場所で水分を少しずつ取る",
    },
    dry: {
      lead: "乾きがある日は、目や喉の乾きも一緒に見ておくと安心です。",
      step: "目を休め、温かい飲み物を少し取ってから動く",
    },
  },
  mood: {
    default: {
      lead: "気分が揺れやすい日は、気合いで整えるより刺激量を小さくします。",
      step: "通知や予定を一つ減らし、呼吸が浅くならない時間を作る",
    },
    damp: {
      lead: "湿気の日は、体の重さが気分の重さに重なりやすいです。",
      step: "部屋の空気を入れ替え、体を少し動かして停滞感を切る",
    },
    pressure_down: {
      lead: "気圧が下がる日は、眠気やぼんやり感で気分も沈みやすくなります。",
      step: "やることを一つに絞り、できたら小さく区切る",
    },
    cold: {
      lead: "冷えの日は、体が縮こまるほど気分も固まりやすいです。",
      step: "手先か足元を温め、肩の力を一度抜く",
    },
    heat: {
      lead: "暑さの日は、イライラや疲れが出やすいので刺激を足しすぎないようにします。",
      step: "濃い味・辛いもの・画面刺激を重ねず、涼む時間を先に入れる",
    },
    dry: {
      lead: "乾燥の日は、目や喉の不快感が小さなストレスになりやすいです。",
      step: "温かい飲み物と目を休める時間をセットにする",
    },
    pressure_up: {
      lead: "張りつめやすい日は、考えごとを抱えたまま走り続けないことが大切です。",
      step: "明日の予定を一つだけ書き出し、頭の中から外へ置く",
    },
  },
};

function getTodayLifestyleFocus(primaryKey, symptomFocus) {
  const symptomRules = TODAY_LIFESTYLE_FOCUS_RULES[symptomFocus];
  if (!symptomRules) return null;
  const triggerKey = normalizeTriggerKey(primaryKey);
  return symptomRules[triggerKey] || symptomRules.default || null;
}

function getTodaySeverityLevel(signal) {
  const severity = Number(signal ?? 0);
  if (severity >= 2) return "high";
  if (severity >= 1) return "middle";
  return "low";
}

function pickBySeverity(value, level) {
  if (!value || typeof value === "string") return value || "";
  return value[level] || value.middle || value.low || value.high || "";
}

function withTodaySymptomFocus(plan, primaryKey, symptomFocus, level) {
  const focus = getTodayLifestyleFocus(primaryKey, symptomFocus);
  if (!focus) return plan;

  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  const focusLead = pickBySeverity(focus.leadByLevel || focus.lead, level);
  const focusStep = pickBySeverity(focus.stepByLevel || focus.step, level);

  // 今日タブでは「今見たい不調」に直結する行動を最初に置く。
  // そのあとに天気対策・環境調整・食後や姿勢の補助を並べる。
  const mergedSteps = Array.from(new Set([focusStep, ...steps].filter(Boolean))).slice(0, 4);

  return {
    ...plan,
    lead: focusLead ? `${plan.lead} ${focusLead}` : plan.lead,
    steps: mergedSteps,
  };
}

function getTodayLifestylePlan(primaryKey, secondaryKey, signal, symptomFocus) {
  const key = normalizeTriggerKey(primaryKey);
  const level = getTodaySeverityLevel(signal);
  let plan;

  if (key === "damp") {
    plan = {
      title: "重さを外に逃がす環境づくり",
      lead: pickBySeverity(
        {
          low: "今日は湿気の影響が少し出やすい日です。大きな対策より、こもりを作らない一手にします。",
          middle:
            "今日は湿気で重さや停滞感が出やすい日です。部屋・服・姿勢のこもりを少し抜くだけでも体感が変わります。",
          high: "今日は湿気の影響が強く出やすい日です。重さをため込まないよう、空間・服装・姿勢を早めに軽くします。",
        },
        level,
      ),
      steps: ["5分だけ換気する", "濡れたタオルや部屋干しから少し離れる", "食後に2〜3分だけ歩く"],
      trap: "座りっぱなし・冷たい飲食・甘いものを重ねると、重さが残りやすくなります。",
    };
  } else if (key === "pressure_down") {
    plan = {
      title: "頭と首肩の通り道を作る",
      lead: pickBySeverity(
        {
          low: "今日は気圧変化が少し響きやすい日です。首を固めたまま粘らないのがコツです。",
          middle:
            "今日は気圧変化で、頭・首肩・耳まわりの重さが出やすい日です。上半身の力みをこまめに抜きます。",
          high: "今日は気圧低下の影響が強く出やすい日です。山場を作る前に、頭・首肩・耳まわりの逃げ道を作ります。",
        },
        level,
      ),
      steps: ["耳の周りを10秒ずつほぐす", "画面から目を離して首を一度起こす", "肩をすくめて落とす動きを3回する"],
      trap: "頭が重いままカフェインや甘いもので押し切ると、あとで首肩の重さとして残ることがあります。",
    };
  } else if (key === "cold") {
    plan = {
      title: "冷えをこわばりに変えない",
      lead: pickBySeverity(
        {
          low: "今日は冷えを少し拾いやすい日です。冷やし切ってから戻すより、先に一か所だけ守ります。",
          middle: "今日は冷えや気温差がこわばりにつながりやすい日です。腰腹・足元・首元のどれか一つを先に守ります。",
          high: "今日は冷えの影響が強く出やすい日です。動き出しの前に、冷えを拾いやすい場所を早めに温めます。",
        },
        level,
      ),
      steps: ["足首かお腹のどちらかを温める", "冷たい飲み物を続けない", "外に出る前に首元・腰元を確認する"],
      trap: "薄着のまま冷たい飲み物を重ねると、腰や足のだるさに残りやすくなります。",
    };
  } else if (key === "heat") {
    plan = {
      title: "熱をこもらせない休ませ方",
      lead: pickBySeverity(
        {
          low: "今日は熱が少しこもりやすい日です。刺激を足すより、余分な熱を残さない方向に寄せます。",
          middle: "今日は暑さや熱のこもりが出やすい日です。頑張って発散するより、熱の逃げ道を作ります。",
          high: "今日は暑さの影響が強く出やすい日です。無理に動き切らず、熱を逃がしながら回復力を守ります。",
        },
        level,
      ),
      steps: ["首の後ろを短時間だけ冷ます", "水分を小分けに取る", "辛いもの・濃い味を重ねすぎない"],
      trap: "暑さの上に辛味・アルコール・カフェインを重ねると、眠りやだるさに残ることがあります。",
    };
  } else if (key === "dry") {
    plan = {
      title: "乾きの入口を減らす",
      lead: pickBySeverity(
        {
          low: "今日は乾きを少し拾いやすい日です。喉や目が乾く前に小さく補います。",
          middle: "今日は喉・目・首肩の乾きが出やすい日です。水分だけでなく、環境と使いすぎを一緒に整えます。",
          high: "今日は乾燥の影響が強く出やすい日です。喉・目・肌に負担を残さないよう、早めに潤いの入口を作ります。",
        },
        level,
      ),
      steps: ["温かい飲み物を少しずつ取る", "目を閉じる時間を10秒作る", "室内が乾くなら加湿や濡れタオルを使う"],
      trap: "コーヒーだけで粘る、乾いた菓子だけでつなぐと、乾きが残りやすくなります。",
    };
  } else {
    plan = {
      title: "張りつめをほどく切り替え",
      lead: pickBySeverity(
        {
          low: "今日は少し張りつめやすい日です。早めに小さく切り替えると残りにくくなります。",
          middle: "今日は身体が前のめりになりやすい日です。集中を増やすより、一度抜く時間を作ります。",
          high: "今日は張りつめが強く出やすい日です。予定や通知を抱え込まず、こまめに力を抜く日として扱います。",
        },
        level,
      ),
      steps: ["通知を見ない時間を5分作る", "息を吐く時間を長めにする", "肩・手首・足首のどれかをゆるめる"],
      trap: "予定や通知を抱えたまま走り続けると、夜に張りが残りやすくなります。",
    };
  }

  return withTodaySymptomFocus(plan, key, symptomFocus, level);
}

const TOMORROW_LIFESTYLE_FOCUS_RULES = {
  fatigue: {
    leadByLevel: {
      low: "だるさが気になるなら、明日は“いつも通り”より少し余白を残すくらいが合います。",
      middle: "だるさが出やすい見込みなので、明日は動く前に休む余白を確保しておくと崩れにくくなります。",
      high: "だるさが強く出やすい見込みです。今夜のうちに予定量を一段軽くして、明日の消耗を増やさない設計にします。",
    },
    stepByLevel: {
      low: "明日の予定をひとつだけ軽くする",
      middle: "午前か午後のどちらかに、何もしない10分を先に置く",
      high: "明日の移動・家事・作業のどれかを一段減らす",
    },
  },
  sleep: {
    leadByLevel: {
      low: "睡眠が気になる日は、明日のために今夜の刺激を少し減らすだけでも差が出ます。",
      middle: "睡眠の乱れが明日の体感に響きやすい見込みです。寝る前の画面・冷え・考えごとを残しすぎないようにします。",
      high: "明日は睡眠不足の影響が表に出やすい見込みです。今夜は回復を最優先にして、刺激を足さない夜に寄せます。",
    },
    stepByLevel: {
      low: "寝る前の画面時間を少し短くする",
      middle: "寝る30分前に、通知と明日の予定確認を終わらせる",
      high: "寝る前の用事を一つやめて、布団に入る時間を先に決める",
    },
  },
  neck_shoulder: {
    leadByLevel: {
      low: "首肩が気になる日は、明日にこわばりを持ち越さない準備が効きます。",
      middle: "明日は首肩まわりの重さが出やすい見込みです。今夜のうちに首を固める姿勢を減らします。",
      high: "首肩のこわばりが強く出やすい見込みです。今夜は画面姿勢と冷えを残さないことを優先します。",
    },
    stepByLevel: {
      low: "寝る前に肩をすくめて落とす動きを3回入れる",
      middle: "スマホを見る姿勢を一度やめて、首の後ろをゆるめてから休む",
      high: "首元を冷やさず、寝る前の画面姿勢を早めに切り上げる",
    },
  },
  low_back_pain: {
    leadByLevel: {
      low: "腰が気になる日は、明日の朝にこわばりを残さない準備が使いやすいです。",
      middle: "明日は腰〜骨盤まわりに重さが出やすい見込みです。今夜は冷えと同じ姿勢を残さないようにします。",
      high: "腰まわりのつらさが強く出やすい見込みです。今夜のうちに腰腹・足元を守り、明日の動き出しを軽くします。",
    },
    stepByLevel: {
      low: "寝る前に腰腹か足首のどちらかを冷やさない",
      middle: "長く座ったまま寝る準備に入らず、腰まわりを小さく動かす",
      high: "明日の朝に使う上着や靴下を用意して、腰腹を冷やさない準備をする",
    },
  },
  swelling: {
    leadByLevel: {
      low: "むくみが気になる日は、明日に重さを残さないよう足元の停滞を少し抜きます。",
      middle: "明日は脚や顔の重さが出やすい見込みです。今夜は水分・塩気・同じ姿勢の重なりを減らします。",
      high: "むくみ感が強く出やすい見込みです。今夜は足元を固めず、寝る前の重さをためない準備にします。",
    },
    stepByLevel: {
      low: "寝る前に足首をゆっくり数回回す",
      middle: "長く座ったまま過ごさず、ふくらはぎを軽く動かしてから休む",
      high: "塩気の強いものを控えめにして、足元を冷やさず休む",
    },
  },
  headache: {
    leadByLevel: {
      low: "頭痛が気になる日は、明日に頭の重さを持ち越さないよう首・目・耳まわりを休めます。",
      middle: "明日は頭の重さが出やすい見込みです。今夜は首を固める姿勢と画面刺激を残しすぎないようにします。",
      high: "頭痛・頭重感が強く出やすい見込みです。今夜のうちに首肩と耳まわりの逃げ道を作ります。",
    },
    stepByLevel: {
      low: "寝る前に目を閉じる時間を10秒作る",
      middle: "耳まわりを軽くほぐし、首の後ろをゆるめてから休む",
      high: "寝る直前の画面を切り上げ、首元を冷やさないようにする",
    },
  },
  dizziness: {
    leadByLevel: {
      low: "めまいが気になる日は、明日の立ち上がりを急がない準備をしておくと安心です。",
      middle: "明日はふわつき感が出やすい見込みです。今夜は首・耳まわりを固めず、朝の動きをゆっくりにします。",
      high: "ふらつき感が強く出やすい見込みです。今夜は無理に整えようとせず、明日の動き出しをゆっくりにする前提で準備します。",
    },
    stepByLevel: {
      low: "朝に急いで立ち上がらないよう、使うものを枕元に寄せる",
      middle: "寝る前に耳まわりを軽くゆるめ、明日の朝は一呼吸置いて立つ",
      high: "明日の朝の移動や準備を詰めすぎず、立ち上がりに余白を作る",
    },
  },
  mood: {
    leadByLevel: {
      low: "気分が揺れやすい日は、明日の刺激量を少し減らすだけでも整えやすくなります。",
      middle: "明日は気分の重さや焦りが出やすい見込みです。今夜のうちに予定と通知を抱え込みすぎないようにします。",
      high: "気分の揺れが強く出やすい見込みです。今夜は考えごとを抱えたまま寝ず、明日の負担を一段軽くします。",
    },
    stepByLevel: {
      low: "明日のやることを一つだけ書き出して、頭の外に置く",
      middle: "通知を見ない時間を作り、明日の予定を一つ減らす",
      high: "明日やらなくていいことを一つ決めて、予定の余白を先に作る",
    },
  },
};

function getTomorrowLifestyleFocus(symptomFocus) {
  return TOMORROW_LIFESTYLE_FOCUS_RULES[symptomFocus] || null;
}

function withTomorrowSymptomFocus(plan, symptomFocus, level) {
  const focus = getTomorrowLifestyleFocus(symptomFocus);
  if (!focus) return plan;

  const focusLead = pickBySeverity(focus.leadByLevel || focus.lead, level);
  const focusStep = pickBySeverity(focus.stepByLevel || focus.step, level);
  const steps = Array.isArray(plan.steps) ? plan.steps : [];

  // 明日タブでは「今夜やること」なので、今見たい不調に直結する準備を先頭に置く。
  const mergedSteps = Array.from(new Set([focusStep, ...steps].filter(Boolean))).slice(0, 4);

  return {
    ...plan,
    lead: focusLead ? `${plan.lead} ${focusLead}` : plan.lead,
    steps: mergedSteps,
  };
}

function getTomorrowLifestylePlan(primaryKey, secondaryKey, signal, symptomFocus) {
  const keys = new Set([primaryKey, secondaryKey].map(normalizeTriggerKey).filter(Boolean));
  const level = getTodaySeverityLevel(signal);
  let plan;

  if (keys.has("damp")) {
    plan = {
      title: "湿気を寝室に持ち込まない",
      lead: pickBySeverity(
        {
          low: "明日は湿気の影響が少し出やすい見込みです。大きな対策より、寝る前のこもりを少し抜く準備に寄せます。",
          middle:
            "明日は湿気で重さや停滞感が出やすい見込みです。身体だけを整えるより、まず空間と服装の湿気を残しにくくします。",
          high: "明日は湿気の影響が強く出やすい見込みです。重さを翌朝に持ち越さないよう、今夜のうちに空間・服装・寝具まわりを軽くします。",
        },
        level,
      ),
      steps: [
        "寝る前に5分だけ換気して、空気を一度入れ替える",
        "部屋干しや濡れたタオルを、寝室から少し離す",
        "首・みぞおち・お腹まわりを冷やさない服装にする",
      ],
      trap: "冷たい飲み物・甘いもの・部屋のこもりが重なると、翌朝に重さとして残りやすくなります。",
    };
  } else if (keys.has("pressure_down")) {
    plan = {
      title: "頭と首肩の逃げ道を作る",
      lead: pickBySeverity(
        {
          low: "明日は気圧変化が少し響きやすい見込みです。首を固めたまま休まないことが小さな差になります。",
          middle:
            "明日は気圧低下で、頭・首肩・耳まわりの重さが出やすい見込みです。寝る前に上半身の通り道を作っておきます。",
          high: "明日は気圧低下の影響が強く出やすい見込みです。山場の前に、今夜のうちから頭・首肩・耳まわりの逃げ道を作ります。",
        },
        level,
      ),
      steps: [
        "耳を上・横・下に軽く引っぱり、耳まわりを温める",
        "スマホを見る姿勢を一度リセットして、首の後ろをゆるめる",
        "枕元に水を置き、寝る前の一口で乾きすぎを避ける",
      ],
      trap: "寝る直前まで画面を見続けて首を固めると、明日の山場で重く感じやすくなります。",
    };
  } else if (keys.has("cold")) {
    plan = {
      title: "朝に冷えを持ち越さない",
      lead: pickBySeverity(
        {
          low: "明日は冷えを少し拾いやすい見込みです。冷やし切ってから戻すより、今夜のうちに一か所だけ守ります。",
          middle: "明日は冷え込みや気温差がこわばりにつながりやすい見込みです。寝る前の足元・腰腹まわりを守ります。",
          high: "明日は冷えの影響が強く出やすい見込みです。朝になってから温めるより、今夜のうちに冷えの入口をふさいでおきます。",
        },
        level,
      ),
      steps: [
        "足首・お腹・腰のどこか一つだけ温かくして寝る",
        "シャワーだけの日は、足先に少し長めに温水を当てる",
        "朝使う上着や靴下を、寝る前に手に取りやすい場所へ置く",
      ],
      trap: "首元・足首・お腹を同時に冷やすと、翌朝にこわばりとして出やすくなります。",
    };
  } else if (keys.has("heat")) {
    plan = {
      title: "熱を部屋と身体に残さない",
      lead: pickBySeverity(
        {
          low: "明日は暑さが少し響きやすい見込みです。寝苦しさを作らない準備が翌日の余力につながります。",
          middle: "明日は暑さや熱のこもりが出やすい見込みです。頑張って汗をかくより、夜に熱を持ち越さない設計にします。",
          high: "明日は暑さの影響が強く出やすい見込みです。今夜は部屋と身体の熱を逃がし、回復力を削らないことを優先します。",
        },
        level,
      ),
      steps: [
        "寝る前に部屋の熱気を逃がしてから冷房を使う",
        "首元を締めつけない服で、熱がこもる場所を減らす",
        "入浴後すぐ布団に入らず、汗が引いてから休む",
      ],
      trap: "熱がこもった部屋でそのまま寝ると、眠りの浅さやだるさにつながりやすくなります。",
    };
  } else if (keys.has("dry")) {
    plan = {
      title: "乾きを寝ている間に進ませない",
      lead: pickBySeverity(
        {
          low: "明日は乾燥を少し拾いやすい見込みです。喉や目が乾く前に、寝室の乾きを少しやわらげます。",
          middle: "明日は乾燥で、のど・肌・目の負担が出やすい見込みです。寝る前に乾きの入口を減らしておきます。",
          high: "明日は乾燥の影響が強く出やすい見込みです。寝ている間に乾きを進ませないよう、今夜の環境づくりを優先します。",
        },
        level,
      ),
      steps: [
        "枕元に水を置き、寝る前と起床後に一口飲めるようにする",
        "エアコンの風が顔に直接当たらない向きに変える",
        "洗顔後や入浴後は、乾く前に保湿まで済ませる",
      ],
      trap: "暖房の風・夜更かし・水分不足が重なると、翌朝の乾きとして出やすくなります。",
    };
  } else if (keys.has("pressure_up")) {
    plan = {
      title: "張りつめたまま寝ない",
      lead: pickBySeverity(
        {
          low: "明日は少し張りつめやすい見込みです。短くても、休む前の切り替えを入れます。",
          middle: "明日は身体が前のめりになりやすい見込みです。寝る前に抜く時間を作り、張りつめを持ち越さないようにします。",
          high: "明日は張りつめが強く出やすい見込みです。予定や通知を抱えたまま寝ず、今夜のうちに力を抜く流れを作ります。",
        },
        level,
      ),
      steps: [
        "寝る30分前だけ、通知を見ない時間を作る",
        "肩をすくめて一気に落とす動きを3回入れる",
        "明日の予定を一つだけ紙に出して、頭の中から外に置く",
      ],
      trap: "予定や通知を抱えたまま寝ると、休んだのに張りが残る感覚につながりやすくなります。",
    };
  } else {
    plan = {
      title: "いつもの調子を崩さない夜にする",
      lead: pickBySeverity(
        {
          low: "明日は大きな波は出にくい見込みです。特別なことを増やすより、睡眠・食べ方・身体の力みを少し整えます。",
          middle: "明日は小さな波が出る可能性があります。無理に整え込むより、睡眠と明日の準備を軽くして安定を残します。",
          high: "明日は体調の波が出やすい見込みです。夜更かしや食べすぎを避け、明日の負担を先に小さくします。",
        },
        level,
      ),
      steps: [
        "寝る前のスマホ時間を少し短くする",
        "明日の朝に使うものを先に出して、起きた直後の負担を減らす",
        "首肩かお腹のどちらか一つだけ、冷やさないようにする",
      ],
      trap: "安定の日ほど、夜更かしや食べすぎで自分から波を作らないのがコツです。",
    };
  }

  return withTomorrowSymptomFocus(plan, symptomFocus, level);
}

export function getLifestylePlan(primaryKey, secondaryKey, signal, mode = "tomorrow", symptomFocus = null) {
  if (mode === "today") return getTodayLifestylePlan(primaryKey, secondaryKey, signal, symptomFocus);
  return getTomorrowLifestylePlan(primaryKey, secondaryKey, signal, symptomFocus);
}

