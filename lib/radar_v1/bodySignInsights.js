// lib/radar_v1/bodySignInsights.js
//
// 「出やすいサイン」の2・3件目専用。
// 天気説明と一般的な症状文を自由結合せず、次の根拠を分けて扱う。
//   2件目: 主な天気ストレス × 選択中の不調
//   3件目: 体質の反応様式 × 選択中の不調
//
// 辞書はすべて完成文として監修できる粒度に保ち、根拠のない部位比較や
// 「AよりBが先」といった細かな予測を生成しない。

const WEATHER_PREFIXES = {
  damp: "湿気の日は",
  pressure_down: "気圧が変わる日は",
  pressure_up: "気圧が変わる日は",
  temp_shift: "寒暖差がある日は",
  cold: "低温の日は",
  heat: "高温の日は",
  dry: "乾燥する日は",
  default: "天気が変わる日は",
};

const WEATHER_SYMPTOM_SIGNS = {
  fatigue: {
    pressure_down: ["頭や体の重さで、だるさが抜けにくい", "動き出しに時間がかかりやすい"],
    pressure_up: ["張りつめた後に疲れが出やすい", "力みで消耗しやすい"],
    temp_shift: ["体温調節に力を使い、疲れやすい", "だるさが残りやすい"],
    damp: ["体が重だるく感じやすい", "眠気やだるさが残りやすい"],
    cold: ["動き出しが重くなりやすい", "冷えで疲れやすい"],
    heat: ["暑さで消耗しやすい", "汗をかいた後に疲れが出やすい"],
    dry: ["乾きで疲れが抜けにくい", "集中が切れやすい"],
  },
  sleep: {
    pressure_down: ["頭の重さで寝起きが重くなりやすい", "日中の眠気が残りやすい"],
    pressure_up: ["張りつめが残って眠りに入りにくい", "体の力が抜けにくい"],
    temp_shift: ["体が落ち着かず、休みに入りにくい", "寝起きのすっきりしなさが残りやすい"],
    damp: ["眠気や寝起きのだるさが残りやすい", "休んでも重さが抜けにくい"],
    cold: ["体が休みに入りにくい", "寝起きのだるさにつながりやすい"],
    heat: ["熱がこもって寝つきに響きやすい", "寝る前まで頭が冴えやすい"],
    dry: ["口や喉の乾燥感が寝つきに響きやすい", "眠りが浅く感じやすい"],
  },
  digestion: {
    pressure_down: ["胃腸の動きが重く感じやすい", "お腹の張りやもたれが残りやすい"],
    pressure_up: ["張りつめが胃腸の重さに出やすい", "急いで食べると負担が出やすい"],
    temp_shift: ["胃腸の調子が揺らぎやすい", "食後の重さが残りやすい"],
    damp: ["胃腸まわりが重く感じやすい", "食後のもたれが残りやすい"],
    cold: ["胃腸の動きが鈍りやすい", "冷たいものが響きやすい"],
    heat: ["食べ方が乱れやすい", "冷たい飲み物が胃腸に響きやすい"],
    dry: ["喉の乾きや便の硬さが気になりやすい", "胃腸のリズムが乱れやすい"],
  },
  neck_shoulder: {
    pressure_down: ["頭から首肩に重さが残りやすい", "首肩のこわばりが出やすい"],
    pressure_up: ["張りつめが首肩の力みに出やすい", "肩に力が入りやすい"],
    temp_shift: ["首肩がこわばりやすい", "首肩の力が抜けにくい"],
    damp: ["首肩に重だるさが残りやすい", "肩まわりがすっきりしにくい"],
    cold: ["首肩がこわばりやすい", "首元の冷えが肩に残りやすい"],
    heat: ["首肩の力みが抜けにくい", "汗をかいた後に首肩が固まりやすい"],
    dry: ["首肩のこわばりが残りやすい", "肩の力が抜けにくい"],
  },
  low_back_pain: {
    pressure_down: ["腰腹まわりに重さが残りやすい", "下半身の動き出しが重くなりやすい"],
    pressure_up: ["張りつめが腰の力みに出やすい", "急いだ動きが腰に残りやすい"],
    temp_shift: ["腰まわりがこわばりやすい", "立ち上がりが重くなりやすい"],
    damp: ["腰から下半身に重だるさが残りやすい", "座った後に腰が重くなりやすい"],
    cold: ["腰腹がこわばりやすい", "足元の冷えが腰に響きやすい"],
    heat: ["消耗すると腰の支えが抜けやすい", "腰まわりに疲れが残りやすい"],
    dry: ["腰のこわばりが残りやすい", "体を動かしにくく感じやすい"],
  },
  swelling: {
    pressure_down: ["顔や脚のむくみ感が残りやすい", "足元が重くなりやすい"],
    pressure_up: ["力みで足元の巡りが鈍りやすい", "同じ姿勢でむくみ感が出やすい"],
    temp_shift: ["足元の巡りが鈍りやすい", "顔や脚の重さが残りやすい"],
    damp: ["顔や脚のむくみ感が出やすい", "足首まわりが重だるくなりやすい"],
    cold: ["足元の巡りが鈍りやすい", "足首まわりが重くなりやすい"],
    heat: ["脚のだるさが残りやすい", "水分のとり方が偏り、むくみ感が残りやすい"],
    dry: ["水分のとり方が偏り、むくみ感が残りやすい", "顔や脚のむくみ感が残りやすい"],
  },
  headache: {
    pressure_down: ["頭・耳まわりが重くなりやすい", "首肩のこわばりが頭に響きやすい"],
    pressure_up: ["頭まわりに張りを感じやすい", "力みが頭に響きやすい"],
    temp_shift: ["頭や首肩に負担が出やすい", "頭の重さが残りやすい"],
    damp: ["頭まわりに重だるさが残りやすい", "頭がすっきりしにくい"],
    cold: ["首肩のこわばりが頭に響きやすい", "頭の重さが残りやすい"],
    heat: ["頭に熱がこもりやすい", "のぼせ感が出やすい"],
    dry: ["乾きによる疲れが頭に響きやすい", "頭まわりに疲れが残りやすい"],
  },
  dizziness: {
    pressure_down: ["頭が重く、立ち上がりでふわつきやすい", "動き出しに時間がかかりやすい"],
    pressure_up: ["張りつめるとふわつきやすい", "急いで動くと揺れを感じやすい"],
    temp_shift: ["動き出しにふわつきやすい", "体の向きを変えた時に揺れを感じやすい"],
    damp: ["体が重く、動き出しでふわつきやすい", "足取りが不安定になりやすい"],
    cold: ["体がこわばり、動き出しで揺れやすい", "足元の冷えがふわつきに響きやすい"],
    heat: ["消耗するとふわつきやすい", "立ち上がりが不安定になりやすい"],
    dry: ["乾きや水分不足でふわつきやすい", "動き出しで揺れを感じやすい"],
  },
  mood: {
    pressure_down: ["頭の重さと気分の重さが重なりやすい", "気持ちの切り替えに時間がかかりやすい"],
    pressure_up: ["焦りや落ち着かなさが出やすい", "気持ちが急きやすい"],
    temp_shift: ["気持ちの切り替えに時間がかかりやすい", "落ち着かなさが残りやすい"],
    damp: ["体の重さと気分の重さが重なりやすい", "動き始める気持ちが起こりにくい"],
    cold: ["気分が内向きになりやすい", "気持ちの切り替えが遅れやすい"],
    heat: ["そわそわ感や焦りが出やすい", "小さな刺激が気になりやすい"],
    dry: ["集中が切れやすい", "小さな刺激が気になりやすい"],
  },
  default: {
    pressure_down: ["体の重さに気づきやすい"],
    pressure_up: ["体の力みに気づきやすい"],
    temp_shift: ["体調の切り替わりに気づきやすい"],
    damp: ["体の重だるさに気づきやすい"],
    cold: ["体のこわばりに気づきやすい"],
    heat: ["熱と消耗に気づきやすい"],
    dry: ["乾きと疲れに気づきやすい"],
  },
};

const CONSTITUTION_PROFILES = {
  accel_batt_small: {
    axis: "accel",
    leads: ["勢いで動けても余力が先に削れやすく", "動けるうちに進めすぎると", "休む前まで頑張れてしまい"],
  },
  accel_batt_standard: {
    axis: "accel",
    leads: ["動けてしまうぶん", "忙しさを押し切れるぶん", "区切りを入れずに進むと"],
  },
  accel_batt_large: {
    axis: "accel",
    leads: ["頑張りが利くぶん", "長く動き続けられるぶん", "不調があっても進めてしまい"],
  },
  brake_batt_small: {
    axis: "brake",
    leads: ["負担を受けると守りに入りやすく", "余力を温存しようとして", "疲れが重なるほど動きを小さくしやすく"],
  },
  brake_batt_standard: {
    axis: "brake",
    leads: ["体の切り替えに少し時間がかかるぶん", "急にペースを変えようとすると", "自分のリズムが乱れると"],
  },
  brake_batt_large: {
    axis: "brake",
    leads: ["大きく崩れにくいぶん", "重さがあっても保ててしまい", "変化へゆっくり合わせるぶん"],
  },
};

const CONSTITUTION_SYMPTOM_TAILS = {
  fatigue: {
    accel: ["疲れを後からまとめて感じやすい", "休んだ時に消耗へ気づきやすい", "だるさより先に力みが出やすい"],
    brake: ["動き出しの重さが長引きやすい", "休んでもだるさが残りやすい", "使える余力が早めに小さくなりやすい"],
    balanced: ["疲れ方の小さな変化に気づきやすい"],
  },
  sleep: {
    accel: ["夜まで頭と体の緊張が残りやすい", "眠る直前まで考える働きが続きやすい", "休むモードへの切り替えが遅れやすい"],
    brake: ["寝起きの重さが残りやすい", "日中の眠気を引きずりやすい", "目覚めてから動き始めるまでに時間がかかりやすい"],
    balanced: ["眠りへ入る時と目覚める時の変化に気づきやすい"],
  },
  digestion: {
    accel: ["急いだ食べ方の負担が胃腸に残りやすい", "張りつめたまま食べると胃腸が休まりにくい", "忙しさが食事のリズムに出やすい"],
    brake: ["食後の重さで動きが鈍りやすい", "胃腸のもたれを長く残しやすい", "食べた後に休みたくなりやすい"],
    balanced: ["食後の重さや張りに気づきやすい"],
  },
  neck_shoulder: {
    accel: ["首肩の力みを後から自覚しやすい", "休んだ時に首肩の張りへ気づきやすい", "肩の力を抜くまでこわばりをためやすい"],
    brake: ["首肩の重さが動き出しに響きやすい", "首肩の重だるさを長く残しやすい", "首肩が重いと動きを小さくしやすい"],
    balanced: ["首肩の張りと重さの両方に気づきやすい"],
  },
  low_back_pain: {
    accel: ["動いた後に腰の力みへ気づきやすい", "急いだ動きの負担を腰に残しやすい", "腰で踏ん張る時間が長くなりやすい"],
    brake: ["腰の重さが一歩目に響きやすい", "腰のこわばりで動き始めが鈍りやすい", "座った後の腰の重さを残しやすい"],
    balanced: ["腰の力みと動き始めの重さに気づきやすい"],
  },
  swelling: {
    accel: ["力んだ姿勢の後に脚の重さへ気づきやすい", "動き続けた後にむくみ感を自覚しやすい", "休んだ時に顔や脚の張りへ気づきやすい"],
    brake: ["顔や脚の重さを長く残しやすい", "足元の重さで動き出しが鈍りやすい", "同じ姿勢の後にむくみ感が残りやすい"],
    balanced: ["顔や脚の重さの変化に気づきやすい"],
  },
  headache: {
    accel: ["張りや刺激が頭まわりに集まりやすい", "力みが続いた後に頭の重さへ気づきやすい", "休んだ時に頭まわりの張りを自覚しやすい"],
    brake: ["頭の重さで動き出しが鈍りやすい", "頭の重だるさを長く残しやすい", "ぼんやり感から行動が遅れやすい"],
    balanced: ["頭まわりの張りと重さの両方に気づきやすい"],
  },
  dizziness: {
    accel: ["急いだ切り替えでふわつきに気づきやすい", "動きを止めた時に揺れを自覚しやすい", "体より先に頭を動かしやすい"],
    brake: ["動き始めのふわつきを残しやすい", "立ち上がるまでに時間がかかりやすい", "足元の重さとふわつきが重なりやすい"],
    balanced: ["動き始めの揺れに気づきやすい"],
  },
  mood: {
    accel: ["焦りや落ち着かなさが先に出やすい", "考えを止めにくくなりやすい", "疲れより先に気持ちが急きやすい"],
    brake: ["気持ちの切り替えに時間がかかりやすい", "気分が内向きになりやすい", "やることを始めるまでに時間がかかりやすい"],
    balanced: ["気持ちの切り替わり方に気づきやすい"],
  },
  default: {
    accel: ["力みや切り替えにくさを後から自覚しやすい"],
    brake: ["重さや動き出しにくさを長く残しやすい"],
    balanced: ["いつもとの小さな違いに気づきやすい"],
  },
};

const SUBLABEL_SYMPTOM_INSIGHTS = {
  qi_stagnation: {
    fatigue: ["緊張が抜けにくいぶん、休んだ後も疲れを残しやすい"],
    sleep: ["考える働きが止まりにくく、休むモードへ入りにくい"],
    digestion: ["張りつめたまま食べると、胃腸の重さを残しやすい"],
    neck_shoulder: ["緊張が抜けにくいぶん、首肩の張りが残りやすい"],
    low_back_pain: ["踏ん張りが続くと、腰の力みが抜けにくい"],
    headache: ["力みが上に集まり、頭まわりの張りとして残りやすい"],
    mood: ["気持ちを切り替えようとするほど、焦りが残りやすい"],
  },
  qi_deficiency: {
    fatigue: ["使える余力が減ると、だるさが長引きやすい"],
    sleep: ["回復に時間がかかり、寝起きのだるさが残りやすい"],
    digestion: ["消耗が重なると、胃腸の動きまで重くなりやすい"],
    low_back_pain: ["余力が減ると、腰まわりの支えが弱く感じやすい"],
    dizziness: ["余力が減ると、立ち上がりのふわつきに気づきやすい"],
    mood: ["体の余力が減ると、やることを始めにくくなりやすい"],
  },
  blood_deficiency: {
    fatigue: ["回復に必要な滋養が不足しやすく、疲れが抜けにくい"],
    sleep: ["休んでも回復した感じが得られにくい"],
    neck_shoulder: ["首肩を支える疲れが、こわばりとして残りやすい"],
    headache: ["頭を使った後の疲れが、頭まわりに残りやすい"],
    dizziness: ["消耗が重なると、ふわつきに気づきやすい"],
    mood: ["疲れが続くと、気持ちの余裕が小さくなりやすい"],
  },
  blood_stasis: {
    neck_shoulder: ["同じ場所のこわばりとして、首肩につらさが残りやすい"],
    low_back_pain: ["同じ姿勢の後に、腰のこわばりが残りやすい"],
    swelling: ["巡りの滞りが、脚の張りや重さとして残りやすい"],
    headache: ["首肩のこわばりと頭の重さが、同じ場所に残りやすい"],
  },
  fluid_damp: {
    fatigue: ["水分の重さを抱えやすく、だるさが抜けにくい"],
    sleep: ["重だるさを抱えたまま、寝起きのすっきりしなさを残しやすい"],
    digestion: ["胃腸まわりに重さを抱え、食後のもたれが残りやすい"],
    neck_shoulder: ["水分の重さを抱えやすく、首肩がすっきりしにくい"],
    low_back_pain: ["腰から下半身に、重だるさを残しやすい"],
    swelling: ["顔や脚に、水分の重さを残しやすい"],
    headache: ["頭まわりに、重だるさを残しやすい"],
    dizziness: ["体の重さと、動き始めのふわつきが重なりやすい"],
    mood: ["体の重さと気分の重さが、同時に出やすい"],
  },
  fluid_deficiency: {
    fatigue: ["乾きと消耗が重なると、疲れが抜けにくい"],
    sleep: ["乾きによる小さな不快感で、休まりにくくなりやすい"],
    digestion: ["水分の不足や偏りが、胃腸の調子に出やすい"],
    neck_shoulder: ["乾きと疲れが重なると、首肩のこわばりが残りやすい"],
    headache: ["乾きと消耗が、頭まわりの疲れとして残りやすい"],
    dizziness: ["乾きと消耗が重なると、ふわつきに気づきやすい"],
    mood: ["乾きによる不快感が続くと、気持ちの余裕が減りやすい"],
  },
};

function toBodySignArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueBodySignTexts(items) {
  return [...new Set(toBodySignArray(items).map((item) => String(item || "").trim()).filter(Boolean))];
}

const BODY_SIGN_SENSATION_PATTERNS = [
  ["heavy", /(重|だる|もたれ|鈍|すっきりしにく|抜けにく|一拍遅|時間がかか|遅れ)/],
  ["tension", /(こわば|力み|力が入|肩に力|張り|緊張|踏ん張|縮こま|前のめり)/],
  ["fatigue", /(疲れ|消耗|余力|集中が切れ)/],
  ["sleep", /(眠|寝起き|目覚め|休む|休み|休ん|休まり)/],
  ["unstable", /(ふわつ|揺れ|不安定|足取り)/],
  ["dry", /(乾き|乾燥|カサつ)/],
  ["heat", /(熱|暑さ|高温|のぼせ|そわつ)/],
  ["cold", /(冷え|低温|冷たい)/],
  ["mood", /(気分|気持ち|焦り|落ち着かな|刺激が気|考えを止め)/],
  ["swelling", /(むくみ|水分の重さ|脚の張り)/],
];

const BODY_SIGN_REGION_PATTERNS = [
  ["head", /(頭|耳|目|喉|のど)/],
  ["neck", /(首|肩|肩甲骨)/],
  ["digestion", /(胃腸|お腹|食後|食べ|食事|便)/],
  ["waist", /(腰|腰腹)/],
  ["legs", /(脚|足元|足首|下半身|立ち上が)/],
  ["sleep", /(眠|寝起き|目覚め|夜|休むモード)/],
  ["mood", /(気分|気持ち|焦り|落ち着かな|刺激が気|考え)/],
  ["whole", /(全身|体の重さ|体が重|体のこわばり|動き出し)/],
];

function bodySignFingerprint(value) {
  const text = String(value || "").normalize("NFKC").trim();
  return {
    text: text.replace(/[、。・\s]/g, ""),
    sensations: BODY_SIGN_SENSATION_PATTERNS
      .filter(([, pattern]) => pattern.test(text))
      .map(([key]) => key),
    regions: BODY_SIGN_REGION_PATTERNS
      .filter(([, pattern]) => pattern.test(text))
      .map(([key]) => key),
  };
}

function bodySignsAreSimilar(a, b) {
  const left = bodySignFingerprint(a);
  const right = bodySignFingerprint(b);
  if (!left.text || !right.text) return false;
  if (left.text === right.text || left.text.includes(right.text) || right.text.includes(left.text)) return true;

  const sharedSensations = left.sensations.filter((key) => right.sensations.includes(key));
  if (!sharedSensations.length) return false;

  const sharedRegions = left.regions.filter((key) => right.regions.includes(key));
  const genericRegion = !left.regions.length
    || !right.regions.length
    || left.regions.includes("whole")
    || right.regions.includes("whole");
  return genericRegion || sharedRegions.length > 0;
}

// 根拠の違う文章でも、同じ部位・同じ体感を言い換えただけなら一件へまとめる。
// 3件を埋めることより、利用者が見分けられるサインだけを残すことを優先する。
export function selectDistinctBodySigns(items, limit = 3) {
  const selected = [];
  for (const item of uniqueBodySignTexts(items)) {
    if (selected.some((current) => bodySignsAreSimilar(current, item))) continue;
    selected.push(item);
    if (selected.length >= limit) break;
  }
  return selected;
}

function normalizeWeatherKey(value) {
  const key = String(value || "");
  if (key === "humidity") return "damp";
  if (key === "temperature_shift") return "temp_shift";
  return WEATHER_PREFIXES[key] ? key : "default";
}

function selectDated(items, targetDate, scope = "") {
  const candidates = uniqueBodySignTexts(items);
  if (!candidates.length) return "";
  if (!targetDate) return candidates[0];

  const parsed = Date.parse(`${targetDate}T00:00:00Z`);
  const daySerial = Number.isFinite(parsed) ? Math.floor(parsed / 86400000) : 0;
  const scopeOffset = [...String(scope)].reduce(
    (sum, char) => (sum + char.codePointAt(0)) % candidates.length,
    0
  );
  return candidates[(daySerial + scopeOffset) % candidates.length];
}

function softenSign(value) {
  const text = String(value || "").trim();
  if (!text || text.endsWith("かも")) return text;
  const endings = [
    ["気づきやすい", "気づくかも"],
    ["感じやすい", "感じるかも"],
    ["残りやすい", "残るかも"],
    ["出やすい", "出るかも"],
    ["なりやすい", "なるかも"],
    ["入りにくい", "入りにくいかも"],
    ["抜けにくい", "抜けにくいかも"],
    ["響きやすい", "響くかも"],
    ["休まりにくい", "休まりにくいかも"],
    ["かかりやすい", "かかるかも"],
  ];
  const matched = endings.find(([suffix]) => text.endsWith(suffix));
  if (!matched) return `${text}かも`;
  return `${text.slice(0, -matched[0].length)}${matched[1]}`;
}

function normalizeConstitutionContext(value) {
  const constitution = value?.constitution_context || value || {};
  const summary = value?.summary || {};
  const coreCode = String(
    value?.coreCode ||
    value?.core_code ||
    constitution?.coreCode ||
    constitution?.core_code ||
    ""
  );
  const subLabels = uniqueBodySignTexts(
    value?.subLabels ||
    value?.sub_labels ||
    constitution?.subLabels ||
    constitution?.sub_labels
  );
  const reactionDirection = String(
    value?.reactionDirection ||
    value?.reaction_direction ||
    summary?.reaction_direction ||
    constitution?.manifestation?.reaction_direction ||
    ""
  );
  return {
    coreCode,
    subLabels,
    reactionDirection: ["accel", "brake", "balanced"].includes(reactionDirection)
      ? reactionDirection
      : null,
  };
}

function buildWeatherSymptomPool(weatherKey, symptomFocus) {
  const key = normalizeWeatherKey(weatherKey);
  const symptomSigns = WEATHER_SYMPTOM_SIGNS[symptomFocus] || WEATHER_SYMPTOM_SIGNS.default;
  const candidates = symptomSigns?.[key] || symptomSigns?.default || [];
  const prefix = WEATHER_PREFIXES[key] || WEATHER_PREFIXES.default;
  return uniqueBodySignTexts(candidates.map((item) => `${prefix}、${item}`));
}

function buildConstitutionSymptomPool(symptomFocus, context) {
  const normalized = normalizeConstitutionContext(context);
  const profile = CONSTITUTION_PROFILES[normalized.coreCode] || null;
  // pressure response で明示的に balanced と判定された場合は、
  // core type の軸へ勝手に戻さない。反応方向が未保存の旧データだけ
  // core type を補助情報として使う。
  const axis = normalized.reactionDirection || profile?.axis || "balanced";
  const symptomTails =
    CONSTITUTION_SYMPTOM_TAILS[symptomFocus] ||
    CONSTITUTION_SYMPTOM_TAILS.default;
  const tails = symptomTails?.[axis] || symptomTails?.balanced || [];
  const leads = normalized.reactionDirection === "balanced" ? [] : profile?.leads || [];
  const coreSigns = leads.length
    ? leads.map((lead, index) => `${lead}、${tails[index % Math.max(1, tails.length)]}`)
    : tails;
  const subLabelSigns = normalized.subLabels.flatMap(
    (label) => SUBLABEL_SYMPTOM_INSIGHTS[label]?.[symptomFocus] || []
  );
  return uniqueBodySignTexts([...coreSigns, ...subLabelSigns]);
}

export function buildGroundedBodySignDetails({
  weatherKey,
  symptomFocus,
  signal = 0,
  targetDate = null,
  constitutionContext = null,
} = {}) {
  const safeSymptom = WEATHER_SYMPTOM_SIGNS[symptomFocus] ? symptomFocus : "default";
  const weatherPool = buildWeatherSymptomPool(weatherKey, safeSymptom);
  const constitutionPool = buildConstitutionSymptomPool(safeSymptom, constitutionContext);
  const fallbackPool = CONSTITUTION_SYMPTOM_TAILS[safeSymptom]?.balanced || ["いつもとの小さな違いに気づきやすい"];
  const weatherSign = selectDated(
    weatherPool,
    targetDate,
    `weather:${normalizeWeatherKey(weatherKey)}:${safeSymptom}`
  );
  const constitutionSign = selectDated(
    constitutionPool.length ? constitutionPool : fallbackPool,
    targetDate,
    `constitution:${normalizeWeatherKey(weatherKey)}:${safeSymptom}:${normalizeConstitutionContext(constitutionContext).coreCode}`
  );
  const details = [weatherSign, constitutionSign].filter(Boolean);
  return Number(signal ?? 0) === 0 ? details.map(softenSign) : details;
}
