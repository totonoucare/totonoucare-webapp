// lib/radar_v1/careRules/dailyCareV2.js
// Daily Care v2: forecast logic chooses the care direction; this layer turns it
// into a stable, varied and concise daily action without changing the forecast.

export const DAILY_CARE_LOGIC_VERSION = "daily_care_v2_3_2026-07-23_pressure_response";

// This file is also loaded as a standalone data module by the rule regression
// tests, so keep this small compatibility projection dependency-free here.
function hasExplicitPressureResponseDirection(source = null) {
  return readExplicitPressureResponseDirection(source) !== null;
}

function readExplicitPressureResponseDirection(source = null) {
  const values = typeof source === "string" ? [source] : [
    source?.pressure_response_direction, source?.response_direction, source?.reaction_direction,
    source?.summary?.pressure_response_direction, source?.summary?.reaction_direction,
    source?.forecast?.pressure_response_direction, source?.forecast?.reaction_direction,
    source?.meta?.manifestation?.reaction_direction,
    source?.meta?.personalized_meta?.manifestation?.reaction_direction,
  ];
  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .find((value) => ["accel", "brake", "balanced"].includes(value)) || null;
}

function getLegacyCareTriggerKey(exact, source = null) {
  const key = String(exact || "");
  if (!["pressure_down", "pressure_up", "pressure_shift"].includes(key)) {
    return key || "default";
  }
  const direction = readExplicitPressureResponseDirection(source);
  if (!direction) {
    if (key === "pressure_down" || key === "pressure_up") return key;
    const physical = String(source?.physical_direction || source?.pressure_direction || source?.direction || "");
    if (physical === "down") return "pressure_down";
    if (physical === "up") return "pressure_up";
    return "default";
  }
  return direction === "accel" ? "pressure_up" : direction === "brake" ? "pressure_down" : "default";
}

function rewritePressureBodyCopyDeep(value, source = null) {
  if (!hasExplicitPressureResponseDirection(source)) return value;
  if (typeof value === "string") {
    return value
      .replace(/気圧が急(?:に)?(?:下がる|上がる)/g, "気圧が急に変わる")
      .replace(/気圧が(?:下がる|上がる)/g, "気圧が変わる")
      .replace(/低気圧|高気圧|気圧低下|気圧上昇/g, "気圧変化");
  }
  if (Array.isArray(value)) return value.map((item) => rewritePressureBodyCopyDeep(item, source));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    rewritePressureBodyCopyDeep(item, source),
  ]));
}

const POLICY_DEFINITIONS = {
  shizumeru: { key: "shizumeru", label: "しずめる", short: "高ぶりを落ち着ける", guide: "熱や高ぶりを落ち着ける" },
  yurumeru: { key: "yurumeru", label: "ゆるめる", short: "力みをやわらげる", guide: "力みやこわばりをやわらげる" },
  meguraseru: { key: "meguraseru", label: "めぐらせる", short: "巡りを保つ", guide: "巡りを保つ" },
  nagasu: { key: "nagasu", label: "ながす", short: "重だるさをためない", guide: "重だるさやむくみをためない" },
  uruosu: { key: "uruosu", label: "うるおす", short: "乾きを補う", guide: "乾きと消耗を補う" },
  nukumeru: { key: "nukumeru", label: "ぬくめる", short: "冷えを防ぐ", guide: "冷えを防ぐ" },
  sasaeru: { key: "sasaeru", label: "ささえる", short: "疲れを増やさない", guide: "疲れや消耗を増やさない" },
};

const TRIGGER_LABELS = {
  damp: "湿気",
  humidity: "湿気",
  pressure_down: "気圧低下",
  pressure_up: "気圧上昇",
  cold: "低温",
  heat: "高温",
  dry: "乾燥",
  temp: "寒暖差",
  temp_shift: "寒暖差",
  default: "天気変化",
};

const TRIGGER_POLICY_SCORES = {
  damp: { nagasu: 4.2, meguraseru: 2.1, sasaeru: 0.9 },
  pressure_down: { yurumeru: 1.5, meguraseru: 1.5, sasaeru: 0.8, nagasu: 0.3 },
  pressure_up: { yurumeru: 1.5, meguraseru: 1.5, sasaeru: 0.8, shizumeru: 0.3 },
  temp_shift: { yurumeru: 2.3, sasaeru: 1.4, meguraseru: 1 },
  cold: { nukumeru: 4.2, sasaeru: 2.1, meguraseru: 0.8 },
  heat: { shizumeru: 4.1, uruosu: 1.8, sasaeru: 0.7 },
  dry: { uruosu: 4.2, sasaeru: 1.5, yurumeru: 0.7 },
  default: { sasaeru: 2.4, yurumeru: 1.1 },
};

const SUB_LABEL_POLICY_SCORES = {
  qi_stagnation: { meguraseru: 2.1, yurumeru: 1.3 },
  qi_deficiency: { sasaeru: 2.3, nukumeru: 0.7 },
  blood_deficiency: { sasaeru: 1.6, uruosu: 1.2 },
  blood_stasis: { meguraseru: 1.8, yurumeru: 0.8 },
  dampness: { nagasu: 2.2, meguraseru: 0.8 },
  fluid_damp: { nagasu: 2.2, meguraseru: 0.8 },
  fluid_deficiency: { uruosu: 2.3, sasaeru: 0.8 },
};

const SYMPTOM_POLICY_SCORES = {
  fatigue: { sasaeru: 1.9, nukumeru: 0.6 },
  sleep: { shizumeru: 1.4, yurumeru: 1.1 },
  digestion: { sasaeru: 1.6, nagasu: 0.8 },
  neck_shoulder: { yurumeru: 1.7, meguraseru: 0.6 },
  low_back_pain: { nukumeru: 1.3, sasaeru: 1 },
  swelling: { nagasu: 1.8, meguraseru: 0.6 },
  headache: { yurumeru: 1.2, shizumeru: 1 },
  dizziness: { sasaeru: 1.2, yurumeru: 0.8 },
  mood: { yurumeru: 1.4, meguraseru: 1.2 },
};

const POLICY_PAIR_SUMMARIES = {
  "nagasu+sasaeru": "重だるさをためず、疲れを増やさないように整えます。",
  "nagasu+meguraseru": "重だるさをためず、巡りを保つように整えます。",
  "yurumeru+sasaeru": "力みやこわばりをやわらげ、疲れを増やさないように整えます。",
  "yurumeru+meguraseru": "力みやこわばりをやわらげ、巡りを保つように整えます。",
  "shizumeru+yurumeru": "熱や高ぶりを落ち着け、力みやこわばりをやわらげるように整えます。",
  "nukumeru+sasaeru": "冷えを防ぎ、疲れを増やさないように整えます。",
  "uruosu+sasaeru": "乾きと消耗を補うように整えます。",
};

const ALLOWED_POLICY_PAIRS = new Set(Object.keys(POLICY_PAIR_SUMMARIES));

const MATERIAL_POLICY_SCORES = {
  qi_deficiency: { sasaeru: 1.7, nukumeru: 0.45 },
  qi_stagnation: { yurumeru: 1.35, meguraseru: 1.15 },
  blood_deficiency: { uruosu: 1.25, sasaeru: 0.85 },
  blood_stasis: { meguraseru: 1.35, yurumeru: 0.65 },
  fluid_deficiency: { uruosu: 1.55, sasaeru: 0.55 },
  fluid_damp: { nagasu: 1.55, meguraseru: 0.65 },
};

const LIFESTYLE_CANDIDATES = {
  damp: [
    { id: "damp-air", text: "5分だけ換気し、部屋干しや濡れた物から少し離れる", policies: ["nagasu"] },
    { id: "damp-walk", text: "食後に2〜3分だけ歩き、座りっぱなしを一度切る", policies: ["nagasu", "meguraseru"] },
    { id: "damp-clothes", text: "汗や湿気を含んだ服をそのままにせず、首元か背中を乾いた状態に戻す", policies: ["nagasu"] },
    { id: "damp-loosen", text: "ベルトやウエストの締めつけを一段ゆるめ、深く座り直す", policies: ["yurumeru", "nagasu"] },
    { id: "damp-ankle", text: "足首をゆっくり10回動かし、下半身の重さを固めない", policies: ["meguraseru", "nagasu"] },
  ],
  pressure_down: [
    { id: "pd-screen", text: "画面から目を離し、首を起こして肩を一度落とす", policies: ["yurumeru"] },
    { id: "pd-ear", text: "耳のまわりを10秒ずつ軽く触り、首を急に動かさない", policies: ["yurumeru"] },
    { id: "pd-task", text: "今からやることを一つに絞り、終わったら短く休む", policies: ["sasaeru", "yurumeru"] },
    { id: "pd-posture", text: "浅く座った姿勢をやめ、背中を預けて呼吸を一度深くする", policies: ["yurumeru"] },
    { id: "pd-light", text: "明るさと通知を少し落とし、頭へ入る情報を一段減らす", policies: ["shizumeru", "sasaeru"] },
  ],
  pressure_up: [
    { id: "pu-notice", text: "通知を5分だけ切り、急いで片づける流れを一度止める", policies: ["shizumeru", "yurumeru"] },
    { id: "pu-exhale", text: "息を吐く時間を長めにして、肩と手の力を一度抜く", policies: ["yurumeru", "shizumeru"] },
    { id: "pu-plan", text: "次の予定を一つだけ書き出し、それ以外は今は考えない", policies: ["shizumeru"] },
    { id: "pu-caffeine", text: "このあとのカフェインを増やさず、水分を少しずつ取る", policies: ["shizumeru", "uruosu"] },
    { id: "pu-pace", text: "歩く速さや家事の手数を一段落とし、体を前のめりにしない", policies: ["yurumeru", "sasaeru"] },
  ],
  cold: [
    { id: "cold-ankle", text: "足首・お腹・首元のうち、いちばん冷える一か所を先に守る", policies: ["nukumeru"] },
    { id: "cold-wind", text: "冷房や外気の風が直接当たる位置を変える", policies: ["nukumeru"] },
    { id: "cold-start", text: "立ち上がる前に足指を動かし、急に動き始めない", policies: ["nukumeru", "sasaeru"] },
    { id: "cold-bath", text: "入浴は熱く長くせず、ぬるめで短く温まる", policies: ["nukumeru", "sasaeru"] },
    { id: "cold-layer", text: "薄手の一枚を足し、汗をかくほど温めすぎない", policies: ["nukumeru", "sasaeru"] },
  ],
  heat: [
    { id: "heat-neck", text: "首の後ろを短時間だけ冷まし、涼しい場所で一度休む", policies: ["shizumeru"] },
    { id: "heat-sip", text: "水分を一気飲みせず、数口ずつ分けて取る", policies: ["uruosu", "sasaeru"] },
    { id: "heat-task", text: "暑い時間の家事や移動を一つ後ろへずらす", policies: ["sasaeru", "shizumeru"] },
    { id: "heat-light", text: "照明・画面・音の刺激を一段落として、熱と情報を重ねない", policies: ["shizumeru"] },
    { id: "heat-clothes", text: "汗を含んだ服を替え、熱がこもる場所を一つ減らす", policies: ["shizumeru", "nagasu"] },
  ],
  dry: [
    { id: "dry-sip", text: "のどが渇き切る前に、飲み物を数口取る", policies: ["uruosu"] },
    { id: "dry-eyes", text: "画面を閉じて10秒目を休め、まばたきをゆっくりする", policies: ["uruosu", "yurumeru"] },
    { id: "dry-room", text: "室内の乾きを確認し、加湿か濡れタオルを一つ使う", policies: ["uruosu"] },
    { id: "dry-mouth", text: "口呼吸になっていないか確認し、鼻から楽に呼吸できる姿勢へ戻す", policies: ["uruosu", "yurumeru"] },
    { id: "dry-rest", text: "汗をかく運動を増やさず、今日は短い休憩を先に置く", policies: ["uruosu", "sasaeru"] },
  ],
  default: [
    { id: "default-pause", text: "予定を一つ減らし、5分だけ何もしない時間を先に置く", policies: ["sasaeru"] },
    { id: "default-posture", text: "同じ姿勢を一度切り、肩・手首・足首のどれかを軽く動かす", policies: ["yurumeru", "meguraseru"] },
    { id: "default-air", text: "窓かドアを短く開け、空気を一度入れ替える", policies: ["nagasu"] },
    { id: "default-water", text: "飲み物を数口取り、次の行動を一つだけ決める", policies: ["sasaeru", "uruosu"] },
  ],
};

const POLICY_LIFESTYLE_CANDIDATES = {
  sasaeru: [
    { id: "support-reduce", text: "今日の予定・家事・移動のどれかを一段軽くする", policies: ["sasaeru"] },
    { id: "support-rest", text: "注意時間の前に、座るか横になる10分を先に確保する", policies: ["sasaeru"] },
  ],
  yurumeru: [
    { id: "release-jaw", text: "奥歯を離し、肩をすくめて落とす動きを3回する", policies: ["yurumeru"] },
    { id: "release-breath", text: "息を吐く時間を少し長くし、胸と肩の力を抜く", policies: ["yurumeru"] },
  ],
  meguraseru: [
    { id: "move-small", text: "立ち上がって30秒だけ歩き、固まった姿勢を切る", policies: ["meguraseru"] },
  ],
  nagasu: [
    { id: "drain-air", text: "空気・服・姿勢のうち、重さをためているものを一つ変える", policies: ["nagasu"] },
  ],
  shizumeru: [
    { id: "calm-input", text: "通知・照明・音のうち、一つだけ刺激を減らす", policies: ["shizumeru"] },
  ],
  nukumeru: [
    { id: "warm-one", text: "冷えている場所を一か所だけ、汗ばまない程度に温める", policies: ["nukumeru"] },
  ],
  uruosu: [
    { id: "moisture-small", text: "水分と休憩を小分けにして、乾き切る前に補う", policies: ["uruosu"] },
  ],
};

const SYMPTOM_LIFESTYLE_CANDIDATES = {
  fatigue: [
    { id: "sym-fatigue", text: "頑張って動く前に、まず座って3分休む", symptoms: ["fatigue"], policies: ["sasaeru"] },
  ],
  sleep: [
    { id: "sym-sleep", text: "寝る30分前に通知と明日の予定確認を終える", symptoms: ["sleep"], policies: ["shizumeru"] },
  ],
  digestion: [
    { id: "sym-digestion", text: "食後すぐに丸まらず、上体を起こして2分だけゆっくり動く", symptoms: ["digestion"], policies: ["nagasu", "meguraseru"] },
  ],
  neck_shoulder: [
    { id: "sym-neck", text: "画面から目を離し、首を起こして肩を一度落とす", symptoms: ["neck_shoulder"], policies: ["yurumeru"] },
  ],
  low_back_pain: [
    { id: "sym-back", text: "座りっぱなしを一度切り、骨盤を小さく前後へ動かす", symptoms: ["low_back_pain"], policies: ["meguraseru", "yurumeru"] },
  ],
  swelling: [
    { id: "sym-swelling", text: "足首をゆっくり回し、同じ姿勢を一度切る", symptoms: ["swelling"], policies: ["nagasu"] },
  ],
  headache: [
    { id: "sym-head", text: "目を閉じ、首の後ろとこめかみの力を10秒抜く", symptoms: ["headache"], policies: ["yurumeru", "shizumeru"] },
  ],
  dizziness: [
    { id: "sym-dizzy", text: "立ち上がる前に一呼吸置き、頭の向きをゆっくり変える", symptoms: ["dizziness"], policies: ["sasaeru"] },
  ],
  mood: [
    { id: "sym-mood", text: "今からやることを一つだけにし、終わったら場所を変える", symptoms: ["mood"], policies: ["yurumeru", "meguraseru"] },
  ],
};

const FOOD_IDEAS = {
  damp: [
    { id: "damp-soba", label: "温かいそば＋大根おろし・しそを少し", note: "汁気で食べやすく、香りで重さをためずに通します。", tags: ["light", "aroma", "quick"] },
    { id: "damp-onigiri", label: "おにぎり＋茶碗蒸し＋温かいお茶", note: "主食とたんぱく質を小さくそろえ、胃腸へ荷物を積みすぎません。", tags: ["light", "support", "quick"] },
    { id: "damp-chicken", label: "蒸し鶏と夏野菜＋少量のごはん", note: "油を控えながら、余力を支える材料は残します。", tags: ["support", "light", "home"] },
    { id: "damp-oat", label: "だしで煮たオートミール＋卵・小ねぎ", note: "やわらかく温かい形で、食後の重さを残しにくくします。", tags: ["digestion", "quick", "support"] },
    { id: "damp-fish", label: "白身魚の蒸し物＋大根・柑橘＋ごはん少なめ", note: "軽いたんぱく質に香りを添え、強く発散せず巡りを助けます。", tags: ["aroma", "light", "home"] },
  ],
  pressure_down: [
    { id: "pd-rice", label: "小さめのおにぎり＋具だくさんの汁物", note: "食事を抜かず、あとで動き出せる軽さに整えます。", tags: ["support", "light", "quick"] },
    { id: "pd-soba", label: "温かいそば＋焼きのり・ねぎ", note: "頭と胃腸が重い日に、量を増やさず温かさと香りを足します。", tags: ["aroma", "light", "quick"] },
    { id: "pd-fish", label: "焼き魚＋大根おろし＋ごはん少なめ", note: "脂っこさを重ねず、午後まで持つ材料をそろえます。", tags: ["support", "home"] },
    { id: "pd-chawan", label: "茶碗蒸し＋梅のおにぎり", note: "食欲が揺れる時でも、やわらかく小さく入りやすい組み合わせです。", tags: ["digestion", "quick"] },
    { id: "pd-soup", label: "鶏と大根のスープ＋少量のごはん", note: "汁気を使い、胃腸の動きが遅い日にも重さを残しにくくします。", tags: ["support", "digestion"] },
  ],
  pressure_up: [
    { id: "pu-fish", label: "焼き魚定食を、ごはん少なめ・味つけ薄めで", note: "刺激で押さず、食事のリズムを落ち着けます。", tags: ["support", "calm"] },
    { id: "pu-chicken", label: "蒸し鶏＋温野菜＋柑橘を少し", note: "油と辛味を増やさず、香りだけで詰まりをほどきます。", tags: ["aroma", "light", "calm"] },
    { id: "pu-soba", label: "そば＋大根おろし＋焼きのり", note: "濃い味や早食いへ寄りにくく、軽く区切りやすい一食です。", tags: ["light", "quick"] },
    { id: "pu-tofu", label: "豆腐ときのこのスープ＋少量のごはん", note: "熱と力みを足さず、胃腸へ静かな燃料を入れます。", tags: ["calm", "digestion"] },
    { id: "pu-onigiri", label: "おにぎり＋ゆで卵＋常温の飲み物", note: "忙しい時も、カフェインだけで前のめりになる流れを止めます。", tags: ["quick", "support"] },
  ],
  cold: [
    { id: "cold-porridge", label: "しょうがを少量入れた卵雑炊", note: "内側を冷やさず、やわらかい形で余力を支えます。", tags: ["warm", "digestion", "support"] },
    { id: "cold-udon", label: "鶏と根菜の温かいうどん", note: "温かさと材料を一皿にまとめ、動き出す燃料を足します。", tags: ["warm", "support", "quick"] },
    { id: "cold-salmon", label: "ごはん＋焼き鮭＋根菜の味噌汁", note: "冷えで縮こまりやすい日に、食事を抜かず土台を作ります。", tags: ["warm", "support", "home"] },
    { id: "cold-pot", label: "豆腐と鶏肉の小鍋＋ごはん少なめ", note: "熱くしすぎず、温かい汁気でお腹を守ります。", tags: ["warm", "digestion"] },
    { id: "cold-chawan", label: "茶碗蒸し＋温かいおにぎり茶漬け", note: "食欲が弱い時も、冷たさを入れず少量から始められます。", tags: ["warm", "light", "quick"] },
  ],
  heat: [
    { id: "heat-shabu", label: "冷やしすぎない豚しゃぶ＋ごはん少なめ", note: "熱をこもらせず、冷たい物だけで胃腸を止めない組み合わせです。", tags: ["cool", "support", "home"] },
    { id: "heat-soba", label: "常温に近いそば＋大根おろし・すだち", note: "香りと軽さを使い、辛味や油で火を足しません。", tags: ["cool", "aroma", "quick"] },
    { id: "heat-fish", label: "白身魚の蒸し物＋トマトを少し＋ごはん", note: "軽いたんぱく質を残しながら、暑さに合わせて熱を足しすぎません。", tags: ["cool", "light", "home"] },
    { id: "heat-tofu", label: "冷蔵庫から少し置いた豆腐＋おにぎり＋汁物少量", note: "冷えすぎを避けつつ、食欲がない時も材料を小さくそろえます。", tags: ["cool", "quick", "digestion"] },
    { id: "heat-chicken", label: "蒸し鶏ときゅうり・トマト＋常温の飲み物", note: "汗で消耗しやすい日に、刺激を増やさず支えます。", tags: ["cool", "support"] },
  ],
  dry: [
    { id: "dry-soup", label: "鶏と大根のとろみスープ＋ごはん", note: "汁気を食事として取り、乾きと消耗を一緒に見ます。", tags: ["moist", "support", "digestion"] },
    { id: "dry-tofu", label: "豆腐と卵のスープ＋白ごま", note: "やわらかい材料と汁気で、乾いた物だけの一食を避けます。", tags: ["moist", "quick"] },
    { id: "dry-fish", label: "白身魚の煮つけ＋青菜＋ごはん", note: "乾燥で削れやすい日に、汁気と養う材料をそろえます。", tags: ["moist", "support", "home"] },
    { id: "dry-porridge", label: "きのこ卵がゆ＋ねぎを少し", note: "食べやすい形で、胃腸へ負担を増やさずうるおいを補います。", tags: ["moist", "digestion", "quick"] },
    { id: "dry-udon", label: "とろろ昆布うどん＋卵", note: "汁気を増やしながら、食事抜きや乾いた菓子だけを避けます。", tags: ["moist", "quick", "support"] },
  ],
  default: [
    { id: "base-set", label: "ごはん＋汁物＋卵か魚を一つ", note: "食材を増やすより、主食・汁気・たんぱく質を小さくそろえます。", tags: ["support", "home"] },
    { id: "base-quick", label: "おにぎり＋茶碗蒸し＋飲み物", note: "忙しい時も、甘い物やカフェインだけで済ませない組み合わせです。", tags: ["quick", "light"] },
    { id: "base-soba", label: "温かいそば＋大根おろし・ねぎ", note: "量を増やさず、温かさと香りを足します。", tags: ["quick", "aroma"] },
    { id: "base-chicken", label: "蒸し鶏と温野菜＋少量のごはん", note: "油を控えながら、回復に使う材料は残します。", tags: ["support", "light"] },
    { id: "base-soup", label: "豆腐と青菜のとろみスープ＋ごはん", note: "汁気とやわらかさを足し、乾いた物だけの食事を避けます。", tags: ["moist", "digestion"] },
    { id: "base-aroma", label: "白身魚＋大根おろし・しそ＋ごはん少なめ", note: "軽さを保ちながら、香りを小さな巡りのきっかけにします。", tags: ["aroma", "light"] },
  ],
};


// 「何を足すか」と同じ重みで、「今日は何を重ねないか」を選ぶ。
// 一般栄養学の禁止リストではなく、食性・天候・体質・ケア方針が
// 同時に負担を増やしやすい組み合わせを、日ごとに一つだけ提示する。
const FOOD_SUBTRACTION_IDEAS = {
  damp: [
    {
      id: "damp-cold-sweet",
      label: "冷たい甘い飲み物を、食事や間食に重ねない",
      reason: "冷たさと濃い甘味が重なると、湿気の日の重さを胃腸へ残しやすくなります。",
      policies: ["nagasu", "sasaeru"],
      subLabels: ["dampness", "痰湿"],
      symptoms: ["digestion", "swelling"],
      compound: true,
    },
    {
      id: "damp-fried-dessert",
      label: "揚げ物のあとに、甘いデザートまで続けない",
      reason: "油と濃い甘味を続けると、体の中へ湿った重さを上乗せしやすい日です。",
      policies: ["nagasu"],
      subLabels: ["dampness", "痰湿"],
      compound: true,
    },
    {
      id: "damp-bread-dairy",
      label: "菓子パンと冷たい乳製品だけで一食を終えない",
      reason: "甘さ・油・冷たさが一度に重なると、食後の動き出しが鈍くなりやすくなります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["fatigue", "digestion"],
      compound: true,
    },
    {
      id: "damp-raw-only",
      label: "サラダや冷たい麺だけで一食を終えない",
      reason: "湿気の日に冷たい物だけで済ませると、軽くしたつもりでも胃腸の働きを落としやすくなります。",
      policies: ["sasaeru", "nagasu"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["digestion", "fatigue"],
      reserveRisk: true,
    },
    {
      id: "damp-overdrink",
      label: "湿気対策の茶や水を、一気に大量に流し込まない",
      reason: "水はけを急いでも、余力が小さい日は胃腸が疲れて、かえって重さを残すことがあります。",
      policies: ["sasaeru", "nagasu"],
      subLabels: ["qi_deficiency", "気虚", "fluid_deficiency", "津液不足"],
      reserveRisk: true,
    },
  ],
  pressure_down: [
    {
      id: "pd-skip-caffeine",
      label: "食事を抜いて、カフェインだけで押し切らない",
      reason: "低気圧の日に空腹のまま無理に起こすと、あとから疲れと胃の重さが重なりやすくなります。",
      policies: ["sasaeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["fatigue", "dizziness", "digestion"],
      reserveRisk: true,
    },
    {
      id: "pd-fried-sweet",
      label: "揚げ物と甘いものを、一度にまとめて入れない",
      reason: "動きが鈍い日に油と甘味を重ねると、食後の重さを長く引きずりやすくなります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
    {
      id: "pd-alcohol-fat",
      label: "お酒を飲みながら、脂っこいものを続けない",
      reason: "巡りが落ちやすい日に、酒と油を重ねると、眠りや翌朝の重さへ持ち越しやすくなります。",
      policies: ["yurumeru", "nagasu"],
      symptoms: ["sleep", "headache"],
      compound: true,
    },
    {
      id: "pd-late-full",
      label: "夜遅い食事で、満腹まで食べない",
      reason: "低気圧で処理の速度が落ちる日は、遅い時間の食べすぎが翌朝まで残りやすくなります。",
      policies: ["sasaeru"],
      symptoms: ["digestion", "sleep"],
      reserveRisk: true,
    },
    {
      id: "pd-cold-only",
      label: "冷たい飲み物と軽食だけで、一日をつながない",
      reason: "軽く済ませても、冷たさと材料不足が重なると、余力をさらに削りやすくなります。",
      policies: ["sasaeru", "nukumeru"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      reserveRisk: true,
    },
  ],
  pressure_up: [
    {
      id: "pu-spice-coffee",
      label: "辛いもののあとに、コーヒーを重ねない",
      reason: "辛味とカフェインを続けると、前のめりな熱と緊張をさらに上乗せしやすくなります。",
      policies: ["shizumeru", "yurumeru"],
      subLabels: ["qi_stagnation", "気滞"],
      symptoms: ["mood", "sleep", "headache"],
      compound: true,
    },
    {
      id: "pu-fast-salty",
      label: "濃い味の食事を、急いでかき込まない",
      reason: "気持ちが前へ出やすい日に、濃い味と早食いが重なると、張りつめたまま食事を終えやすくなります。",
      policies: ["yurumeru", "shizumeru"],
      symptoms: ["mood", "digestion", "headache"],
      compound: true,
    },
    {
      id: "pu-alcohol-salty",
      label: "アルコールと塩辛いものを、同じ時間帯に重ねない",
      reason: "熱と乾きを足しやすい組み合わせで、のぼせや眠りの浅さへつながりやすくなります。",
      policies: ["shizumeru", "uruosu"],
      symptoms: ["sleep", "headache"],
      compound: true,
    },
    {
      id: "pu-sweet-only",
      label: "空腹を、甘いものだけで埋めない",
      reason: "一度は動けても、そのあとに気分とエネルギーの波を大きくしやすい食べ方です。",
      policies: ["sasaeru", "shizumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["mood", "fatigue"],
      reserveRisk: true,
    },
    {
      id: "pu-hot-spice",
      label: "熱々の料理へ、強い辛味をさらに足さない",
      reason: "熱い温度と辛味が重なると、体の上側へ熱と力みを集めやすくなります。",
      policies: ["shizumeru"],
      subLabels: ["qi_stagnation", "気滞"],
      symptoms: ["headache", "mood"],
      compound: true,
    },
  ],
  cold: [
    {
      id: "cold-iced-raw",
      label: "冷たい飲み物と生ものだけで、一食を終えない",
      reason: "外からの冷えに食事の冷たさが重なると、胃腸まで省エネ運転になりやすくなります。",
      policies: ["nukumeru", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
    {
      id: "cold-empty-coffee",
      label: "空腹のまま、コーヒーだけで動き始めない",
      reason: "冷えた朝に燃料を入れず刺激だけ足すと、あとから疲れや胃の不快感が出やすくなります。",
      policies: ["sasaeru", "nukumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["fatigue", "digestion"],
      reserveRisk: true,
    },
    {
      id: "cold-night-ice",
      label: "夜遅くに、アイスや冷たい乳製品を重ねない",
      reason: "眠る前に内側まで冷やすと、翌朝のだるさや胃の重さへ持ち越しやすくなります。",
      policies: ["nukumeru", "sasaeru"],
      symptoms: ["sleep", "digestion"],
      compound: true,
    },
    {
      id: "cold-salad-only",
      label: "サラダだけで一食を済ませない",
      reason: "量は軽くても寒涼に偏ると、冷えやすい日は回復に使う火まで弱めやすくなります。",
      policies: ["nukumeru", "sasaeru"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      reserveRisk: true,
    },
    {
      id: "cold-force-sweat",
      label: "強い辛味で、無理に汗を出そうとしない",
      reason: "一時的に温まっても、余力が小さい日は発散しすぎて冷え戻りを招くことがあります。",
      policies: ["sasaeru", "nukumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      reserveRisk: true,
    },
  ],
  heat: [
    {
      id: "heat-spice-alcohol",
      label: "辛い料理とアルコールを、同じ食事に重ねない",
      reason: "暑さに辛味と酒の熱が加わると、のぼせや乾き、寝苦しさを増やしやすくなります。",
      policies: ["shizumeru", "uruosu"],
      symptoms: ["sleep", "headache", "mood"],
      compound: true,
    },
    {
      id: "heat-ice-gulp",
      label: "キンキンの飲み物を、一気に流し込まない",
      reason: "表面は涼しくても、急な冷たさで胃腸の動きを止めると、食後の重さが残りやすくなります。",
      policies: ["sasaeru", "shizumeru"],
      symptoms: ["digestion", "fatigue"],
      reserveRisk: true,
    },
    {
      id: "heat-fried-strong",
      label: "揚げ物へ、濃い味や辛味をさらに足さない",
      reason: "油・濃味・辛味はどれも熱をこもらせやすく、暑い日の負担を三重にしやすい組み合わせです。",
      policies: ["shizumeru", "nagasu"],
      compound: true,
    },
    {
      id: "heat-cold-only",
      label: "冷たい麺や飲み物だけで、一食を終えない",
      reason: "冷やすことだけに寄ると、汗で削れた材料を補えず、あとからだるさが出やすくなります。",
      policies: ["sasaeru", "uruosu"],
      subLabels: ["qi_deficiency", "気虚", "fluid_deficiency", "津液不足"],
      symptoms: ["fatigue", "dizziness"],
      reserveRisk: true,
    },
    {
      id: "heat-energy-caffeine",
      label: "暑さ疲れを、エナジードリンクや濃いコーヒーだけで押さない",
      reason: "刺激で一時的に動けても、熱と消耗を重ね、余力の反動を大きくしやすくなります。",
      policies: ["sasaeru", "shizumeru"],
      subLabels: ["qi_deficiency", "気虚", "fluid_deficiency", "津液不足"],
      symptoms: ["fatigue", "mood", "sleep"],
      reserveRisk: true,
    },
  ],
  dry: [
    {
      id: "dry-snack-coffee",
      label: "乾いた菓子を、コーヒーだけで流し込まない",
      reason: "乾いた食感とカフェインが重なると、のどや胃の乾きを置き去りにしやすくなります。",
      policies: ["uruosu", "sasaeru"],
      subLabels: ["fluid_deficiency", "津液不足"],
      symptoms: ["fatigue", "digestion"],
      compound: true,
    },
    {
      id: "dry-spice-roast",
      label: "辛いもの・焼きすぎたもの・濃い塩味を重ねない",
      reason: "乾かす方向の食性が重なると、口やのどだけでなく、気分の余裕まで削りやすくなります。",
      policies: ["uruosu", "shizumeru"],
      subLabels: ["fluid_deficiency", "津液不足", "blood_deficiency", "血虚"],
      compound: true,
    },
    {
      id: "dry-alcohol-caffeine",
      label: "アルコールのあとに、カフェインで押し切らない",
      reason: "どちらも乾きと睡眠の浅さを重ねやすく、翌日の消耗へつながりやすい組み合わせです。",
      policies: ["uruosu", "sasaeru"],
      symptoms: ["sleep", "headache"],
      compound: true,
    },
    {
      id: "dry-water-only",
      label: "水分だけ取って、食事を抜かない",
      reason: "水だけでは、乾燥で消耗した体を養う材料までは補えません。",
      policies: ["sasaeru", "uruosu"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      symptoms: ["fatigue", "dizziness"],
      reserveRisk: true,
    },
    {
      id: "dry-fried-snack",
      label: "揚げ物やスナック菓子を、間を空けず続けない",
      reason: "油と乾いた食感が続くと、うるおいを補うより先に重さと乾きを増やしやすくなります。",
      policies: ["uruosu", "nagasu"],
      compound: true,
    },
  ],
  default: [
    {
      id: "base-skip-stimulant",
      label: "食事を抜いて、甘いものやカフェインだけでつながない",
      reason: "刺激だけで動くと、体調の波が読みにくい日に余力の上下を大きくしやすくなります。",
      policies: ["sasaeru", "shizumeru"],
      subLabels: ["qi_deficiency", "気虚"],
      symptoms: ["fatigue", "mood"],
      reserveRisk: true,
    },
    {
      id: "base-late-full",
      label: "夜遅くに、満腹まで食べない",
      reason: "回復へ切り替える時間に処理の仕事を増やすと、翌朝へ重さを持ち越しやすくなります。",
      policies: ["sasaeru"],
      symptoms: ["sleep", "digestion"],
      reserveRisk: true,
    },
    {
      id: "base-fried-sweet",
      label: "揚げ物と甘いものを、一度に重ねない",
      reason: "油と濃い甘味を同時に入れると、胃腸へ重い荷物をまとめて渡す食べ方になります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
    {
      id: "base-cold-only",
      label: "冷たい飲み物だけで、食事を済ませない",
      reason: "一時的に軽くても、内側を冷やしながら材料不足を重ねやすい食べ方です。",
      policies: ["nukumeru", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      reserveRisk: true,
    },
  ],
};

const FOOD_SUBTRACTION_PAIR_IDEAS = {
  "damp+heat": [
    {
      id: "pair-damp-heat-triple",
      label: "辛い料理・揚げ物・冷たい甘い飲み物を、一度に重ねない",
      reason: "暑さで熱を足し、湿気で重さを残す組み合わせです。冷たさで打ち消そうとしても胃腸へ負担が集まります。",
      policies: ["shizumeru", "nagasu", "sasaeru"],
      compound: true,
    },
    {
      id: "pair-damp-heat-noodle-ice",
      label: "冷たい麺だけで終えたあと、アイスまで続けない",
      reason: "暑さには涼しく感じても、冷たさと甘味が湿気の重さを胃腸へ残しやすくなります。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
  ],
  "cold+damp": [
    {
      id: "pair-cold-damp-dairy-bread",
      label: "冷たい乳製品と甘いパンを、朝食の中心にしない",
      reason: "冷え・甘味・油分が重なると、湿った重さを動かす力まで弱めやすくなります。",
      policies: ["nukumeru", "nagasu", "sasaeru"],
      symptoms: ["fatigue", "digestion"],
      compound: true,
    },
    {
      id: "pair-cold-damp-raw-sweet",
      label: "生もの・冷たい飲み物・甘味を、一食に重ねない",
      reason: "寒涼と甘味が重なると、冷えと湿気の両方を内側へ持ち込みやすくなります。",
      policies: ["nukumeru", "nagasu"],
      compound: true,
    },
  ],
  "dry+heat": [
    {
      id: "pair-dry-heat-spice-alcohol",
      label: "辛い焼き物とアルコールを、同じ食事に重ねない",
      reason: "熱を足しながら水分を削る組み合わせで、のどの乾きや寝苦しさを強めやすくなります。",
      policies: ["shizumeru", "uruosu"],
      compound: true,
    },
    {
      id: "pair-dry-heat-snack-coffee",
      label: "乾いた菓子を、冷たいコーヒーで流し込まない",
      reason: "暑さで消耗している日に、乾いた物とカフェインを重ねると、うるおいと余力の両方を削りやすくなります。",
      policies: ["uruosu", "sasaeru"],
      reserveRisk: true,
      compound: true,
    },
  ],
  "cold+dry": [
    {
      id: "pair-cold-dry-snack",
      label: "冷たい飲み物と乾いた菓子だけで、食事を済ませない",
      reason: "冷えで動きを落とし、乾いた食事でうるおいも足せない組み合わせです。",
      policies: ["nukumeru", "uruosu", "sasaeru"],
      reserveRisk: true,
      compound: true,
    },
  ],
  "damp+pressure_down": [
    {
      id: "pair-damp-pd-rebound",
      label: "食事を抜いた反動で、揚げ物と甘いものをまとめて入れない",
      reason: "低気圧で動きが鈍いところへ、湿った重さを一気に積む食べ方になりやすい日です。",
      policies: ["nagasu", "sasaeru"],
      symptoms: ["fatigue", "digestion"],
      reserveRisk: true,
      compound: true,
    },
  ],
  "heat+pressure_up": [
    {
      id: "pair-heat-pu-stimulants",
      label: "辛いもの・カフェイン・アルコールを、同じ時間帯に重ねない",
      reason: "暑さと気圧上昇で前のめりになりやすい日に、熱と刺激を三重に足す組み合わせです。",
      policies: ["shizumeru", "yurumeru", "uruosu"],
      symptoms: ["mood", "sleep", "headache"],
      compound: true,
    },
  ],
};

const POLICY_FOOD_SUBTRACTION_IDEAS = {
  sasaeru: [
    {
      id: "policy-support-skip",
      label: "食事を抜いて、刺激だけで動こうとしない",
      reason: "余力を守りたい日は、カフェインや甘味で一時的に上げるより、小さくても材料を入れる方が反動を減らせます。",
      policies: ["sasaeru"],
      subLabels: ["qi_deficiency", "気虚", "blood_deficiency", "血虚"],
      symptoms: ["fatigue", "dizziness"],
      reserveRisk: true,
    },
  ],
  nagasu: [
    {
      id: "policy-drain-heavy-stack",
      label: "冷たい・甘い・脂っこいを、一度に重ねない",
      reason: "重さを逃がしたい日に、湿った荷物を三つまとめて積まないための引き算です。",
      policies: ["nagasu"],
      subLabels: ["dampness", "痰湿"],
      compound: true,
    },
  ],
  meguraseru: [
    {
      id: "policy-move-force",
      label: "辛味やお酒で、無理に巡らせようとしない",
      reason: "詰まりを動かしたい日でも、強い発散は余力まで一緒に削ることがあります。",
      policies: ["meguraseru", "sasaeru"],
      subLabels: ["qi_stagnation", "気滞", "qi_deficiency", "気虚"],
      reserveRisk: true,
    },
  ],
  yurumeru: [
    {
      id: "policy-release-fast-eating",
      label: "画面や仕事を見ながら、急いで食べない",
      reason: "力みをほどきたい日は、食事中まで頭と体を働かせ続けないことも大切な引き算です。",
      policies: ["yurumeru"],
      symptoms: ["mood", "neck_shoulder", "digestion"],
    },
  ],
  shizumeru: [
    {
      id: "policy-calm-stimulant",
      label: "辛味・カフェイン・アルコールを、続けて重ねない",
      reason: "高ぶりをしずめたい日に、熱と刺激を追加し続けないための引き算です。",
      policies: ["shizumeru"],
      symptoms: ["mood", "sleep", "headache"],
      compound: true,
    },
  ],
  nukumeru: [
    {
      id: "policy-warm-cold-stack",
      label: "冷たい飲み物と生ものを、同じ食事に重ねない",
      reason: "温めたい日に、食事から冷たさを二重に入れないための引き算です。",
      policies: ["nukumeru"],
      symptoms: ["digestion", "fatigue"],
      compound: true,
    },
  ],
  uruosu: [
    {
      id: "policy-moist-dry-stack",
      label: "乾いた菓子とカフェインだけで、空腹をつながない",
      reason: "うるおしたい日に、乾かす食感と飲み物を重ねないための引き算です。",
      policies: ["uruosu", "sasaeru"],
      subLabels: ["fluid_deficiency", "津液不足", "blood_deficiency", "血虚"],
      compound: true,
    },
  ],
};

const MERIDIAN_LINE_CARE = {
  lung_li: {
    id: "line-lung-li",
    title: "首・鎖骨ラインをひらく",
    action: "鎖骨の下を内側から肩先へ、服の上からゆっくり3往復する",
    reason: "呼吸が浅い時や首肩に力が集まる時の、体質上の入口です。",
  },
  heart_si: {
    id: "line-heart-si",
    title: "肩甲骨〜小指側をゆるめる",
    action: "反対の手で肩甲骨の外側から腕の小指側を、痛くない範囲でゆっくりなでる",
    reason: "頭の使いすぎや睡眠の乱れが、肩から腕へ残りやすいラインです。",
  },
  kidney_bl: {
    id: "line-kidney-bl",
    title: "背中〜足元の土台を守る",
    action: "腰へ手を当てて温めたあと、ふくらはぎの後ろを手のひらでゆっくりなでる",
    reason: "冷えや消耗が、背中・腰・脚の後ろへ出やすいラインです。",
  },
  liver_gb: {
    id: "line-liver-gb",
    title: "体側の張りを逃がす",
    action: "脇腹へ手を当て、息を吐きながら外ももまで手のひらでゆっくりなでる",
    reason: "気分の詰まりや緊張が、体側と脚の内外側へ表れやすいラインです。",
  },
  spleen_st: {
    id: "line-spleen-st",
    title: "お腹〜すねの前面を支える",
    action: "お腹へ手を置いて呼吸したあと、太もも前からすねを手のひらで軽くなでる",
    reason: "胃腸の疲れや湿気の重さが、体の前面へ出やすいラインです。",
  },
  pc_sj: {
    id: "line-pc-sj",
    title: "腕の外側から熱と力みを逃がす",
    action: "手首から肩の外側へ、反対の手でゆっくり3往復なでる",
    reason: "上半身の熱や緊張が、腕と肩へ逃げ場を探しやすいラインです。",
  },
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniq(values) {
  return Array.from(new Set(safeArray(values).filter(Boolean)));
}

export function normalizeDailyCareTrigger(value) {
  const key = String(value || "").trim();
  if (key === "humidity") return "damp";
  if (key === "temp") return "cold";
  return TRIGGER_POLICY_SCORES[key] ? key : "default";
}

export function stableCareHash(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dateOrdinal(targetDate) {
  const match = String(targetDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

export function getDailyCareRotationIndex({ targetDate, contextKey = "", length = 1, offset = 0 } = {}) {
  const size = Math.max(1, Number(length || 1));
  const base = dateOrdinal(targetDate) + stableCareHash(contextKey) + Number(offset || 0);
  return ((base % size) + size) % size;
}

function addScores(scores, weights, multiplier = 1) {
  Object.entries(weights || {}).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(scores, key)) return;
    scores[key] += Number(value || 0) * multiplier;
  });
}

function getCoreCode(riskContext) {
  return String(riskContext?.constitution_context?.core_code || "");
}

function getSubLabels(riskContext, explicit = []) {
  return uniq([...safeArray(explicit), ...safeArray(riskContext?.constitution_context?.sub_labels)]);
}

function getThemeSummary(policies) {
  const keys = safeArray(policies).map((item) => item.key);
  if (keys.length >= 2) {
    return POLICY_PAIR_SUMMARIES[`${keys[0]}+${keys[1]}`]
      || POLICY_PAIR_SUMMARIES[`${keys[1]}+${keys[0]}`]
      || `${policies[0].short}、${policies[1].short}方針です。`;
  }
  const policy = policies[0] || POLICY_DEFINITIONS.sasaeru;
  return `${policy.short}方針です。`;
}

function getContinuousConstitution(riskContext) {
  const constitution = riskContext?.constitution_context || {};
  const axes = constitution?.axes && typeof constitution.axes === "object" ? constitution.axes : null;
  const split = constitution?.split_scores && typeof constitution.split_scores === "object"
    ? constitution.split_scores
    : null;
  const material = {
    qi_deficiency: Number(split?.qi?.deficiency || 0),
    qi_stagnation: Number(split?.qi?.stagnation || 0),
    blood_deficiency: Number(split?.blood?.deficiency || 0),
    blood_stasis: Number(split?.blood?.stasis || 0),
    fluid_deficiency: Number(split?.fluid?.deficiency || 0),
    fluid_damp: Number(split?.fluid?.damp || 0),
  };
  return {
    available: Boolean(axes || split),
    yin_yang_score: Math.max(-1, Math.min(1, Number(axes?.yin_yang_score || 0))),
    drive_score: Math.max(-1, Math.min(1, Number(axes?.drive_score || 0))),
    obstruction_score: Math.max(0, Math.min(1, Number(axes?.obstruction_score || 0))),
    material,
  };
}

function addContinuousConstitutionScores(scores, continuous) {
  if (!continuous?.available) return;

  const yy = Number(continuous.yin_yang_score || 0);
  if (yy > 0) addScores(scores, { yurumeru: 0.9, shizumeru: 0.55 }, yy);
  if (yy < 0) addScores(scores, { nagasu: 0.75, meguraseru: 0.7 }, Math.abs(yy));

  const reserveNeed = Math.max(0, -Number(continuous.drive_score || 0));
  if (reserveNeed > 0) addScores(scores, { sasaeru: 1.35 }, reserveNeed);
  if (continuous.obstruction_score > 0) {
    addScores(scores, { meguraseru: 0.75, yurumeru: 0.4 }, continuous.obstruction_score);
  }

  Object.entries(continuous.material || {}).forEach(([key, raw]) => {
    const value = Math.max(0, Number(raw || 0));
    const normalized = value / (value + 2.5);
    addScores(scores, MATERIAL_POLICY_SCORES[key], normalized);
  });
}

function isAllowedPolicyPair(first, second) {
  return ALLOWED_POLICY_PAIRS.has(`${first}+${second}`)
    || ALLOWED_POLICY_PAIRS.has(`${second}+${first}`);
}

export function buildDailyCareTheme({
  mode = "today",
  targetDate = null,
  triggerKey = "default",
  secondaryKey = null,
  signal = 0,
  symptomFocus = null,
  riskContext = null,
  subLabels = [],
} = {}) {
  const responseSource = riskContext || null;
  const primaryInput = hasExplicitPressureResponseDirection(responseSource)
    ? getLegacyCareTriggerKey(triggerKey, responseSource)
    : triggerKey;
  const secondaryInput = secondaryKey && hasExplicitPressureResponseDirection(responseSource)
    ? getLegacyCareTriggerKey(secondaryKey, responseSource)
    : secondaryKey;
  const primary = normalizeDailyCareTrigger(primaryInput);
  const secondary = secondaryInput ? normalizeDailyCareTrigger(secondaryInput) : null;
  const scores = Object.fromEntries(Object.keys(POLICY_DEFINITIONS).map((key) => [key, 0]));
  addScores(scores, TRIGGER_POLICY_SCORES[primary] || TRIGGER_POLICY_SCORES.default, 1);
  if (secondary && secondary !== primary) addScores(scores, TRIGGER_POLICY_SCORES[secondary], 0.38);

  getSubLabels(riskContext, subLabels).forEach((label, index) => {
    addScores(scores, SUB_LABEL_POLICY_SCORES[label], index === 0 ? 1 : 0.58);
  });
  addScores(scores, SYMPTOM_POLICY_SCORES[symptomFocus], 1);

  const coreCode = getCoreCode(riskContext);
  const continuous = getContinuousConstitution(riskContext);
  addContinuousConstitutionScores(scores, continuous);
  // Old profiles and old snapshots do not have continuous values. Preserve the
  // previous categorical fallback only for those rows.
  if (!continuous.available) {
    if (coreCode.includes("batt_small")) addScores(scores, { sasaeru: 1.2 }, 1);
    if (coreCode.startsWith("accel_")) addScores(scores, { yurumeru: 0.65, shizumeru: 0.45 }, 1);
    if (coreCode.startsWith("brake_")) addScores(scores, { nagasu: 0.55, meguraseru: 0.45 }, 1);
  }
  if (Number(signal) >= 2) addScores(scores, { sasaeru: 0.65 }, 1);
  else if (Number(signal) === 1) addScores(scores, { sasaeru: 0.22 }, 1);

  const ranked = Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => b.score - a.score);
  const selected = [ranked[0] || { key: "sasaeru", score: 1 }];
  const second = ranked.find((item) =>
    item.key !== selected[0].key && isAllowedPolicyPair(selected[0].key, item.key)
  );
  if (
    Number(signal) > 0
    && second
    && second.score >= Math.max(1.9, selected[0].score * 0.5)
    && !([selected[0].key, second.key].includes("shizumeru") && [selected[0].key, second.key].includes("nukumeru"))
  ) {
    selected.push(second);
  }
  const policies = selected.map((item) => POLICY_DEFINITIONS[item.key]).filter(Boolean);
  const intensity = Number(signal) >= 2 ? "high" : Number(signal) === 1 ? "middle" : "low";
  const reserveSmall = coreCode.includes("batt_small");
  const stimulus = reserveSmall || Number(signal) >= 2 ? "弱め・短め" : intensity === "low" ? "軽く一度" : "やさしく短く";
  const labels = [TRIGGER_LABELS[primary] || TRIGGER_LABELS.default];
  if (secondary && secondary !== primary) labels.push(TRIGGER_LABELS[secondary] || TRIGGER_LABELS.default);

  return {
    version: DAILY_CARE_LOGIC_VERSION,
    mode: mode === "tomorrow" ? "tomorrow" : "today",
    target_date: targetDate || null,
    trigger_key: primary,
    secondary_trigger_key: secondary,
    trigger_labels: labels,
    signal: Number(signal || 0),
    intensity,
    stimulus,
    policies,
    scores,
    continuous_constitution_used: continuous.available,
    summary: getThemeSummary(policies),
    core_code: coreCode || null,
    reserve_small: reserveSmall,
    sub_labels: getSubLabels(riskContext, subLabels),
    symptom_focus: symptomFocus || null,
    primary_meridian: riskContext?.constitution_context?.primary_meridian || null,
    secondary_meridian: riskContext?.constitution_context?.secondary_meridian || null,
  };
}

function candidateScore(candidate, { theme, symptomFocus }) {
  let score = 0;
  const policyKeys = safeArray(theme?.policies).map((item) => item.key);
  safeArray(candidate?.policies).forEach((policy) => {
    const rank = policyKeys.indexOf(policy);
    if (rank === 0) score += 3;
    else if (rank === 1) score += 1.4;
  });
  if (safeArray(candidate?.symptoms).includes(symptomFocus)) score += 2.8;
  if (theme?.reserve_small && safeArray(candidate?.policies).includes("sasaeru")) score += 0.9;
  return score;
}

function selectDailyCandidates(candidates, { theme, symptomFocus, targetDate, contextKey, limit = 3 }) {
  const unique = Array.from(new Map(safeArray(candidates).filter((item) => item?.id && item?.text).map((item) => [item.id, item])).values());
  if (!unique.length) return [];
  const scored = unique
    .map((item) => ({ ...item, _score: candidateScore(item, { theme, symptomFocus }) }))
    .sort((a, b) => b._score - a._score || a.id.localeCompare(b.id));
  const best = scored[0]?._score || 0;
  const preferred = scored.filter((item) => item._score >= best - 3);
  const rest = scored.filter((item) => !preferred.includes(item));
  const rotate = (items, offset) => {
    if (!items.length) return [];
    const index = getDailyCareRotationIndex({ targetDate, contextKey, length: items.length, offset });
    return [...items.slice(index), ...items.slice(0, index)];
  };
  return [...rotate(preferred, 0), ...rotate(rest, 2)].slice(0, limit);
}

export function enhanceLifestylePlan({
  basePlan = null,
  theme,
  targetDate = null,
  symptomFocus = null,
} = {}) {
  const plan = basePlan || {};
  const trigger = normalizeDailyCareTrigger(theme?.trigger_key);
  const baseCandidates = plan.version === DAILY_CARE_LOGIC_VERSION
    ? []
    : safeArray(plan.steps).map((text, index) => ({
        id: safeArray(plan.step_ids)[index] || `legacy-${trigger}-${index}`,
        text,
        policies: safeArray(theme?.policies).map((item) => item.key),
      }));
  const candidates = [
    ...safeArray(SYMPTOM_LIFESTYLE_CANDIDATES[symptomFocus]),
    ...safeArray(LIFESTYLE_CANDIDATES[trigger] || LIFESTYLE_CANDIDATES.default),
    ...safeArray(theme?.policies).flatMap((policy) => safeArray(POLICY_LIFESTYLE_CANDIDATES[policy.key])),
    ...baseCandidates,
  ];
  const selected = selectDailyCandidates(candidates, {
    theme,
    symptomFocus,
    targetDate,
    contextKey: `lifestyle|${trigger}|${symptomFocus || "none"}|${theme?.core_code || "none"}`,
    limit: 3,
  });
  const primary = selected[0] || { id: "fallback-rest", text: "予定を一つ軽くし、短い休憩を先に置く" };
  const alternatives = selected.slice(1, 3);
  const timingLead = theme?.intensity === "high"
    ? "注意時間の前に"
    : theme?.intensity === "middle"
      ? "体調が変わる前に一度"
      : "気になった時に一度";

  const enhanced = {
    ...plan,
    version: DAILY_CARE_LOGIC_VERSION,
    title: theme?.mode === "tomorrow" ? "明日に残さない暮らしの一手" : "今日の暮らしの一手",
    lead: `${theme?.summary || "無理を増やさない方針です。"} ${timingLead}、一つだけ試せば十分です。`,
    primary_action: {
      id: primary.id,
      label: primary.text,
      reason: `${(theme?.trigger_labels || ["天気変化"]).join("と")}に合わせ、${theme?.stimulus || "やさしく短く"}整える行動です。`,
    },
    alternatives: alternatives.map((item) => ({ id: item.id, label: item.text })),
    steps: [primary.text, ...alternatives.map((item) => item.text)],
    step_ids: [primary.id, ...alternatives.map((item) => item.id)],
    trap: String(plan.trap || "").trim(),
    care_theme: theme,
  };
  return enhanced;
}

function foodTagScore(idea, { theme, symptomFocus, subLabels, mode }) {
  let score = 0;
  const tags = new Set(safeArray(idea?.tags));
  const policyKeys = new Set(safeArray(theme?.policies).map((item) => item.key));
  if (policyKeys.has("sasaeru") && tags.has("support")) score += 2;
  if (policyKeys.has("nagasu") && tags.has("light")) score += 1.8;
  if (policyKeys.has("meguraseru") && tags.has("aroma")) score += 1.5;
  if (policyKeys.has("yurumeru") && tags.has("aroma")) score += 1.1;
  if (policyKeys.has("nukumeru") && tags.has("warm")) score += 2.1;
  if (policyKeys.has("shizumeru") && (tags.has("calm") || tags.has("cool"))) score += 1.8;
  if (policyKeys.has("uruosu") && tags.has("moist")) score += 2.1;
  if (["digestion", "dizziness"].includes(symptomFocus) && tags.has("digestion")) score += 1.7;
  if (symptomFocus === "fatigue" && tags.has("support")) score += 1.4;
  if (["mood", "neck_shoulder", "headache"].includes(symptomFocus) && tags.has("aroma")) score += 1;
  const labels = new Set(safeArray(subLabels));
  if (["qi_deficiency", "気虚"].some((label) => labels.has(label)) && tags.has("support")) score += 1.2;
  if (["qi_stagnation", "気滞"].some((label) => labels.has(label)) && tags.has("aroma")) score += 1.1;
  if (["dampness", "fluid_damp", "痰湿"].some((label) => labels.has(label)) && tags.has("light")) score += 1.2;
  if (["fluid_deficiency", "津液不足"].some((label) => labels.has(label)) && tags.has("moist")) score += 1.2;
  if (["blood_deficiency", "血虚"].some((label) => labels.has(label)) && tags.has("support")) score += 0.9;
  if (["blood_stasis", "血瘀"].some((label) => labels.has(label)) && tags.has("aroma")) score += 0.8;
  if (theme?.reserve_small && (tags.has("light") || tags.has("support"))) score += 0.8;
  if (theme?.intensity === "high" && tags.has("quick")) score += 0.7;
  if (mode === "tomorrow" && tags.has("quick")) score += 0.3;
  return score;
}

function selectFoodIdeas({ theme, targetDate, symptomFocus, subLabels, mode }) {
  const key = normalizeDailyCareTrigger(theme?.trigger_key);
  const source = safeArray(FOOD_IDEAS[key] || FOOD_IDEAS.default);
  const scored = source
    .map((idea) => ({ ...idea, _score: foodTagScore(idea, { theme, symptomFocus, subLabels, mode }) }))
    .sort((a, b) => b._score - a._score || a.id.localeCompare(b.id));
  const best = scored[0]?._score || 0;
  const preferred = scored.filter((idea) => idea._score >= best - 1.2);
  const rest = scored.filter((idea) => !preferred.includes(idea));
  const contextKey = `food|${key}|${symptomFocus || "none"}|${theme?.core_code || "none"}`;
  const rotate = (items, offset) => {
    if (!items.length) return [];
    const index = getDailyCareRotationIndex({ targetDate, contextKey, length: items.length, offset });
    return [...items.slice(index), ...items.slice(0, index)];
  };
  return [...rotate(preferred, 0), ...rotate(rest, 3)].slice(0, 3);
}

function foodSubtractionPairKey(primary, secondary) {
  if (!primary || !secondary || primary === "default" || secondary === "default" || primary === secondary) return null;
  return [primary, secondary].sort().join("+");
}

function foodSubtractionScore(candidate, { theme, symptomFocus, subLabels, sourceWeight = 0 }) {
  let score = sourceWeight;
  const policyKeys = safeArray(theme?.policies).map((item) => item.key);
  safeArray(candidate?.policies).forEach((policy) => {
    const rank = policyKeys.indexOf(policy);
    if (rank === 0) score += 3;
    else if (rank === 1) score += 1.5;
  });
  if (safeArray(candidate?.symptoms).includes(symptomFocus)) score += 1.6;
  const labels = new Set(safeArray(subLabels));
  const subtypeHits = safeArray(candidate?.subLabels).filter((label) => labels.has(label)).length;
  score += subtypeHits * 1.15;
  if (theme?.reserve_small && candidate?.reserveRisk) score += 1.15;
  if (theme?.intensity === "high" && candidate?.compound) score += 0.55;
  if (theme?.intensity === "low" && candidate?.compound) score -= 0.15;
  return score;
}

function selectFoodSubtraction({ theme, targetDate, symptomFocus, subLabels, legacyItems = [] }) {
  const primary = normalizeDailyCareTrigger(theme?.trigger_key);
  const secondary = theme?.secondary_trigger_key
    ? normalizeDailyCareTrigger(theme.secondary_trigger_key)
    : null;
  const pairKey = foodSubtractionPairKey(primary, secondary);
  const candidates = [];
  const pushAll = (items, sourceWeight) => {
    safeArray(items).forEach((item) => candidates.push({ ...item, _sourceWeight: sourceWeight }));
  };

  pushAll(FOOD_SUBTRACTION_PAIR_IDEAS[pairKey], 2.4);
  pushAll(FOOD_SUBTRACTION_IDEAS[primary] || FOOD_SUBTRACTION_IDEAS.default, 1.6);
  if (secondary && secondary !== primary) pushAll(FOOD_SUBTRACTION_IDEAS[secondary], 0.65);
  safeArray(theme?.policies).forEach((policy, index) => {
    pushAll(POLICY_FOOD_SUBTRACTION_IDEAS[policy.key], index === 0 ? 1.1 : 0.45);
  });
  safeArray(legacyItems).forEach((item, index) => {
    const label = String(item || "").trim().replace(/[。]$/, "");
    if (!label) return;
    candidates.push({
      id: `legacy-caution-${stableCareHash(label)}-${index}`,
      label,
      reason: `${(theme?.trigger_labels || ["今日の天気"]).join("と")}と体質が重なる日は、負担を追加しやすい食べ方です。`,
      policies: safeArray(theme?.policies).map((policy) => policy.key),
      _sourceWeight: 0.15,
    });
  });

  const unique = Array.from(new Map(candidates
    .filter((item) => item?.id && item?.label)
    .map((item) => [item.id, item])).values());
  const scored = unique
    .map((item) => ({
      ...item,
      _score: foodSubtractionScore(item, {
        theme,
        symptomFocus,
        subLabels,
        sourceWeight: item._sourceWeight,
      }),
    }))
    .sort((a, b) => b._score - a._score || a.id.localeCompare(b.id));
  const best = scored[0]?._score || 0;
  const preferred = scored.filter((item) => item._score >= best - 3);
  const rest = scored.filter((item) => !preferred.includes(item));
  const contextKey = `food-subtraction|${primary}|${secondary || "none"}|${symptomFocus || "none"}|${theme?.core_code || "none"}`;
  const rotate = (items, offset) => {
    if (!items.length) return [];
    const index = getDailyCareRotationIndex({ targetDate, contextKey, length: items.length, offset });
    return [...items.slice(index), ...items.slice(0, index)];
  };
  return [...rotate(preferred, 0), ...rotate(rest, 2)][0]
    || FOOD_SUBTRACTION_IDEAS.default[0];
}

export function enhanceFoodContext({
  baseFood = null,
  theme,
  targetDate = null,
  symptomFocus = null,
  subLabels = [],
  mode = "today",
} = {}) {
  const food = baseFood || {};
  const ideas = selectFoodIdeas({ theme, targetDate, symptomFocus, subLabels, mode });
  const primary = ideas[0] || FOOD_IDEAS.default[0];
  const alternatives = ideas.slice(1, 3);
  const existingDrinkCard = safeArray(food.action_cards).find((card) => card?.key === "drink");
  const drinkItems = safeArray(existingDrinkCard?.items).slice(0, 2);
  const cautionItems = safeArray(food.caution_items).length
    ? safeArray(food.caution_items)
    : safeArray(food.action_cards).find((card) => card?.key === "caution")?.items || [];
  const subtraction = selectFoodSubtraction({
    theme,
    targetDate,
    symptomFocus,
    subLabels,
    legacyItems: cautionItems,
  });
  const primaryLabel = mode === "tomorrow" ? "今夜〜明朝の一手" : "今日の一手";
  const cautionLabel = mode === "tomorrow" ? "今夜〜明朝に控えたい" : "今日は控えたい";
  const actionCards = [
    {
      key: "choice",
      label: primaryLabel,
      body: primary.note,
      items: [primary.label],
      primary: true,
      prominent: true,
    },
    {
      key: "caution",
      label: cautionLabel,
      body: subtraction.reason,
      items: [subtraction.label],
      prominent: true,
      subtraction_basis: {
        trigger: theme?.trigger_key || "default",
        secondary_trigger: theme?.secondary_trigger_key || null,
        policies: safeArray(subtraction.policies),
      },
    },
    alternatives.length ? {
      key: "alternative",
      label: "別案",
      body: "同じ方針で、場面に合わせて選べる候補です。",
      items: alternatives.map((item) => item.label),
    } : null,
    drinkItems.length ? {
      key: "drink",
      label: "飲み物を合わせるなら",
      body: existingDrinkCard?.body || "一気に飲まず、食事や喉の渇きに合わせて少しずつ。",
      items: drinkItems,
    } : null,
  ].filter(Boolean);

  const enhanced = {
    ...food,
    version: DAILY_CARE_LOGIC_VERSION,
    badge: primaryLabel,
    title: primary.label,
    recommendation: null,
    focus: null,
    detail_eyebrow: "ほかの選び方",
    detail_title: mode === "tomorrow" ? "別案・飲み物・明日の理由" : "別案・飲み物・選んだ理由",
    primary_action: { id: primary.id, label: primary.label, reason: primary.note },
    subtraction_action: {
      id: subtraction.id,
      label: subtraction.label,
      reason: subtraction.reason,
      policies: safeArray(subtraction.policies),
    },
    alternatives: alternatives.map((item) => ({ id: item.id, label: item.label, reason: item.note })),
    action_cards: actionCards,
    add_items: [primary.label, ...alternatives.map((item) => item.label)],
    caution_items: [subtraction.label],
    avoid: subtraction.label,
    how_to: primary.note,
    reason: `${theme?.summary || "無理を増やさない方針です。"} ${(theme?.trigger_labels || []).join("と")}に合わせて、この一食と引き算を選びました。`,
    care_theme: theme,
    display_compact: true,
  };
  return enhanced;
}

export function buildMeridianLineCare({ theme, riskContext = null } = {}) {
  const primary = theme?.primary_meridian || riskContext?.constitution_context?.primary_meridian || null;
  const secondary = theme?.secondary_meridian || riskContext?.constitution_context?.secondary_meridian || null;
  const selected = MERIDIAN_LINE_CARE[primary] || MERIDIAN_LINE_CARE[secondary] || null;
  if (!selected) return null;
  return {
    ...selected,
    meridian_code: MERIDIAN_LINE_CARE[primary] ? primary : secondary,
    intensity: theme?.stimulus || "やさしく短く",
    label: selected.action,
  };
}

export function enhanceTsuboSet({ baseTsuboSet = null, theme, riskContext = null } = {}) {
  const set = baseTsuboSet || {};
  const lineCare = buildMeridianLineCare({ theme, riskContext });
  const points = safeArray(set.points);
  const primaryPoint = points[0] || null;
  return {
    ...set,
    version: DAILY_CARE_LOGIC_VERSION,
    title: theme?.mode === "tomorrow" ? "明日に備えるほぐしの一手" : "今日のほぐしの一手",
    lead: lineCare
      ? `${lineCare.reason} 今日は${lineCare.intensity}で十分です。`
      : set.lead || "強く効かせるより、短く触れて体の反応を見ます。",
    line_care: lineCare,
    primary_action: lineCare || (primaryPoint ? {
      id: `point-${primaryPoint.code || primaryPoint.name_ja}`,
      label: `${primaryPoint.name_ja || primaryPoint.code}を軽く触る`,
      reason: primaryPoint?.explanation?.role_summary || "今日の状態に合わせて選んだツボです。",
    } : null),
    care_theme: theme,
  };
}

export function enhanceDailyCarePlan({
  baseCarePlan = null,
  forecast = null,
  riskContext = null,
  mode = "today",
  targetDate = null,
  symptomFocus = null,
  triggerKey = null,
  secondaryKey = null,
} = {}) {
  const plan = baseCarePlan || {};
  const target = targetDate || forecast?.target_date || plan?.target_date || null;
  const summary = riskContext?.summary || {};
  const physicalTrigger = triggerKey || summary.main_trigger_exact || summary.personal_main_trigger_exact || forecast?.personal_main_trigger_exact || forecast?.main_trigger || "default";
  const physicalSecondary = secondaryKey || summary.secondary_trigger_exact || summary.personal_secondary_trigger_exact || forecast?.personal_secondary_trigger_exact || null;
  const responseSource = riskContext || forecast || null;
  const trigger = hasExplicitPressureResponseDirection(responseSource)
    ? getLegacyCareTriggerKey(physicalTrigger, responseSource)
    : physicalTrigger;
  const secondary = physicalSecondary && hasExplicitPressureResponseDirection(responseSource)
    ? getLegacyCareTriggerKey(physicalSecondary, responseSource)
    : physicalSecondary;
  const activeSymptom = symptomFocus || riskContext?.constitution_context?.symptom_focus || null;
  const theme = buildDailyCareTheme({
    mode,
    targetDate: target,
    triggerKey: trigger,
    secondaryKey: secondary,
    signal: forecast?.signal ?? riskContext?.target?.signal ?? 0,
    symptomFocus: activeSymptom,
    riskContext,
  });
  const baseFood = plan.tomorrow_food_context || plan.night_food || {};
  const food = enhanceFoodContext({
    baseFood,
    theme,
    targetDate: target,
    symptomFocus: activeSymptom,
    subLabels: riskContext?.constitution_context?.sub_labels || [],
    mode,
  });
  const lifestyle = enhanceLifestylePlan({
    basePlan: plan.lifestyle_plan || null,
    theme,
    targetDate: target,
    symptomFocus: activeSymptom,
  });
  const tsuboSet = enhanceTsuboSet({
    baseTsuboSet: plan.night_tsubo_set || {},
    theme,
    riskContext,
  });

  const enhancedPlan = {
    ...plan,
    version: DAILY_CARE_LOGIC_VERSION,
    target_date: target,
    care_theme: theme,
    lifestyle_plan: lifestyle,
    night_tsubo_set: tsuboSet,
    tomorrow_food_context: food,
    night_food: food,
    night_food_reason: food.reason,
    tomorrow_caution: food.avoid || plan.tomorrow_caution || "",
  };

  return rewritePressureBodyCopyDeep(enhancedPlan, responseSource);
}
