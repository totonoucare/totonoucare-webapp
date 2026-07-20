const POLICY_KEYS = ["shizumeru", "yurumeru", "meguraseru", "nagasu", "uruosu", "nukumeru", "sasaeru"];

const PARTNER_PRODUCT_ROLE_LABELS = {
  reduce_light: "光・刺激を減らす",
  sleep_environment: "眠る環境づくり",
  warm_body: "冷やさない暮らし",
  bath_shift: "入浴で切り替える",
  humidity_control: "湿気をためない",
  moisture_air: "乾燥を守る",
  warm_drink: "温かい飲み物",
  caffeine_shift: "香りの一杯",
  light_meal: "軽めの食事",
  pantry_soup: "常備しやすい汁物",
  nutrition_support: "栄養補助",
  ingredient: "素材を足す",
  drinkware: "温かい一杯の道具",
  neck_shoulder_release: "首肩をほぐす",
  heat_release: "温めてゆるめる",
  posture_release: "姿勢を切り替える",
  foot_leg_release: "足・ふくらはぎをほぐす",
  gentle_stretch: "やさしく伸ばす",
  tsubo_support: "ツボケアを続ける",
  general: "ケア用品",
};

function inferPartnerProductRole({ title, primarySurface, categories = [], tags = [] } = {}) {
  const surface = primarySurface || safeArray(categories)[0] || "live";
  const text = `${title || ""} ${safeArray(tags).join(" ")}`;

  if (surface === "eat") {
    if (/ボトル|水筒|タンブラー/.test(text)) return "drinkware";
    if (/ハーブティー|ノンカフェイン|カフェインレス|enherb/.test(text)) return "caffeine_shift";
    if (/宅食|ミール|惣菜|スープ|食事/.test(text)) return "light_meal";
    return "warm_drink";
  }

  if (surface === "point") {
    if (/枕|まくら|ピロー|pillow|寝具|マットレス|睡眠|休息/.test(text)) return "sleep_environment";
    if (/温熱|温め|発熱|ホット|カイロ|パッド|パット/.test(text)) return "heat_release";
    if (/首|肩|ネック|ハンド|手元/.test(text)) return "neck_shoulder_release";
    if (/ストレッチ|姿勢|腰|背中/.test(text)) return "posture_release";
    if (/足|脚|フット|レッグ|ふくらはぎ/.test(text)) return "foot_leg_release";
    return "tsubo_support";
  }

  if (/エプソム|バス|入浴|温浴|足湯/.test(text)) return "bath_shift";
  if (/空気|サーキュレーター|除湿|湿気/.test(text)) return "humidity_control";
  if (/加湿|乾燥|保湿/.test(text)) return "moisture_air";
  if (/枕|マットレス|寝具|睡眠|休息|リカバリーウェア|SurvaQ|REVERIA/.test(text)) return "sleep_environment";
  if (/腹巻|湯たんぽ|ウォーマー|温熱|カイロ/.test(text)) return "warm_body";
  return "general";
}


const LIFE_POLICY_HINTS = {
  screen: { symptoms: ["neck_shoulder", "headache", "mood"], tags: ["画面作業"], policies: ["yurumeru", "meguraseru", "shizumeru"] },
  sleep_short: { symptoms: ["sleep", "fatigue"], tags: ["寝不足"], policies: ["shizumeru", "sasaeru", "uruosu"] },
  cold_drinks: { symptoms: ["digestion", "fatigue", "swelling"], tags: ["冷たい飲み物"], policies: ["nukumeru", "sasaeru", "nagasu"] },
  overeating: { symptoms: ["digestion", "fatigue"], tags: ["食べすぎ"], policies: ["sasaeru", "nagasu"] },
  no_bath: { symptoms: ["sleep", "neck_shoulder", "low_back_pain"], tags: ["湯船不足"], policies: ["meguraseru", "yurumeru", "nukumeru"] },
  low_activity: { symptoms: ["fatigue", "swelling", "low_back_pain"], tags: ["運動不足"], policies: ["meguraseru", "nagasu"] },
  tense: { symptoms: ["neck_shoulder", "headache", "mood", "sleep"], tags: ["緊張"], policies: ["yurumeru", "shizumeru"] },
  outdoor: { symptoms: ["fatigue", "dryness", "sleep"], tags: ["外出多め"], policies: ["sasaeru", "uruosu"] },
};

function a8({ id, title, clickUrl, imageUrl, impressionUrl, imageSize = { width: 300, height: 250 }, primarySurface, categories, policies, symptoms, weatherFit = [], seasonFit = [], seasonSuppress = [], lifeFit = [], subFit = [], coreFit = [], typeFit = [], priceBands = ["all"], starterEligible, fitStrictness = "normal", intensity = {}, rewardRank = "medium", riskLevel = "low", buyingBehavior = "official_or_marketplace", reason, tags = [], productRole, productRoleLabel }) {
  const resolvedProductRole = productRole || inferPartnerProductRole({ title, primarySurface, categories, tags });

  return {
    id,
    source: "a8",
    sourceType: "partner",
    provider: "A8",
    title,
    clickUrl,
    imageUrl,
    impressionUrl,
    imageSize,
    primarySurface: primarySurface || safeArray(categories)[0] || "live",
    categories: [primarySurface || safeArray(categories)[0] || "live"],
    policies,
    symptoms,
    weatherFit,
    seasonFit,
    seasonSuppress,
    lifeFit,
    subFit,
    coreFit,
    typeFit,
    priceBands,
    starterEligible,
    fitStrictness,
    intensity: {
      warming: 0,
      relaxing: 0,
      moisturizing: 0,
      draining: 0,
      stimulating: 0,
      ...intensity,
    },
    rewardRank,
    riskLevel,
    buyingBehavior,
    productRole: resolvedProductRole,
    productRoleLabel: productRoleLabel || PARTNER_PRODUCT_ROLE_LABELS[resolvedProductRole] || "ケア用品",
    reason,
    tags,
    buttonText: "公式サイトで詳しく見る",
  };
}

export const PARTNER_OFFERS = [
  a8({
    id: "teals-epsom-salt",
    title: "ティールズ エプソムソルト",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WK+BJKNCA+4GRI+HY7W1",
    imageUrl: "https://www25.a8.net/svt/bgt?aid=260622884698&wid=004&eno=01&mid=s00000020835003015000&mc=1",
    impressionUrl: "https://www13.a8.net/0.gif?a8mat=4B61WK+BJKNCA+4GRI+HY7W1",
    categories: ["live"],
    policies: ["yurumeru", "nukumeru", "shizumeru"],
    symptoms: ["sleep", "neck_shoulder", "low_back_pain", "mood", "fatigue"],
    weatherFit: ["cold", "pressure_down"],
    seasonFit: ["rainy", "autumn", "winter"],
    lifeFit: ["no_bath", "tense", "sleep_short"],
    priceBands: ["all", "standard"],
    intensity: { warming: 2, relaxing: 2 },
    reason: "力みや冷えが気になる条件で、入浴まわりからゆるめたい時の候補です。",
    tags: ["入浴", "温浴"],
  }),
  a8({
    id: "sibody-mineral-bath-powder",
    title: "SiBODY ミネラルバスパウダー",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WK+BHSCIY+31RE+2HC3BL",
    imageUrl: "https://www28.a8.net/svt/bgt?aid=260622884695&wid=004&eno=01&mid=s00000014225015005000&mc=1",
    impressionUrl: "https://www17.a8.net/0.gif?a8mat=4B61WK+BHSCIY+31RE+2HC3BL",
    categories: ["live"],
    policies: ["yurumeru", "nukumeru", "meguraseru"],
    symptoms: ["sleep", "neck_shoulder", "low_back_pain", "fatigue", "mood"],
    weatherFit: ["cold", "pressure_down"],
    seasonFit: ["rainy", "autumn", "winter"],
    lifeFit: ["no_bath", "tense"],
    priceBands: ["all", "standard"],
    intensity: { warming: 2, relaxing: 2 },
    reason: "寝る前や冷えが残る条件で、湯船の時間を整えたい時の候補です。",
    tags: ["入浴", "温活"],
  }),
  a8({
    id: "earth-conscious-epsom-salt",
    title: "アースコンシャス エプソムソルト",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WK+BGLGJM+R12+6AC5D",
    imageUrl: "https://www22.a8.net/svt/bgt?aid=260622884693&wid=003&eno=01&mid=s00000003503001056000&mc=1",
    impressionUrl: "https://www17.a8.net/0.gif?a8mat=4B61WK+BGLGJM+R12+6AC5D",
    categories: ["live"],
    policies: ["nukumeru", "yurumeru", "meguraseru"],
    symptoms: ["sleep", "neck_shoulder", "low_back_pain", "fatigue"],
    weatherFit: ["cold", "pressure_down"],
    seasonFit: ["rainy", "autumn", "winter"],
    lifeFit: ["no_bath", "low_activity"],
    priceBands: ["all", "standard"],
    intensity: { warming: 2, relaxing: 1.5 },
    reason: "冷えやこわばりが出やすい条件で、入浴から切り替えたい時の候補です。",
    tags: ["入浴", "エプソムソルト"],
  }),
  a8({
    id: "niplux-neck-relax-one-s",
    title: "NIPLUX ネックリラックスワンエス",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+E3UU3U+4QVE+61C2P",
    imageUrl: "https://www23.a8.net/svt/bgt?aid=260622883853&wid=004&eno=01&mid=s00000022145001014000&mc=1",
    impressionUrl: "https://www18.a8.net/0.gif?a8mat=4B61WJ+E3UU3U+4QVE+61C2P",
    primarySurface: "point",
    policies: ["yurumeru", "meguraseru", "nukumeru"],
    symptoms: ["neck_shoulder", "headache", "sleep", "fatigue", "mood"],
    weatherFit: ["pressure_down", "pressure_up", "cold"],
    seasonFit: ["spring", "rainy", "autumn", "winter"],
    lifeFit: ["screen", "tense", "no_bath"],
    priceBands: ["all", "deep"],
    intensity: { warming: 1.5, relaxing: 3, stimulating: 1 },
    rewardRank: "high",
    reason: "首肩のこわばりや画面作業が重なる条件で、局所的にゆるめたい時の候補です。",
    tags: ["首肩", "温熱"],
  }),
  a8({
    id: "relax-hand-pad",
    title: "リラックスハンドパッド",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+DSJLM2+Y92+BKUN75",
    imageUrl: "https://www20.a8.net/svt/bgt?aid=260622883834&wid=004&eno=01&mid=s00000004439070015000&mc=1",
    impressionUrl: "https://www19.a8.net/0.gif?a8mat=4B61WJ+DSJLM2+Y92+BKUN75",
    primarySurface: "point",
    policies: ["yurumeru", "shizumeru", "nukumeru"],
    symptoms: ["neck_shoulder", "mood", "fatigue", "sleep"],
    weatherFit: ["cold", "pressure_up", "pressure_down"],
    seasonFit: ["autumn", "winter", "spring"],
    lifeFit: ["screen", "tense"],
    priceBands: ["all", "standard", "deep"],
    intensity: { warming: 1.5, relaxing: 2.5 },
    reason: "手元のこわばりや緊張が残りやすい条件で、作業後にゆるめたい時の候補です。",
    tags: ["手元", "画面作業"],
  }),
  a8({
    id: "enherb",
    title: "enherb ハーブティー",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+C9RPYI+3PFM+5ZMCH",
    imageUrl: "https://www23.a8.net/svt/bgt?aid=260622883742&wid=004&eno=01&mid=s00000017293001006000&mc=1",
    impressionUrl: "https://www19.a8.net/0.gif?a8mat=4B61WJ+C9RPYI+3PFM+5ZMCH",
    categories: ["eat"],
    policies: ["shizumeru", "uruosu", "sasaeru", "nagasu"],
    symptoms: ["sleep", "mood", "fatigue", "swelling", "digestion"],
    weatherFit: ["dry", "cold", "humidity"],
    seasonFit: ["spring", "rainy", "autumn", "winter"],
    lifeFit: ["sleep_short", "tense", "cold_drinks"],
    priceBands: ["all", "standard"],
    intensity: { warming: 0.5, relaxing: 1.5, moisturizing: 1 },
    reason: "ハーブの香りや素材感を選びたい時に。方針に合わせた一杯を探しやすい候補です。",
    tags: ["ハーブティー", "ノンカフェイン"],
  }),
  a8({
    id: "cado-air-design",
    title: "cado 空気環境家電",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+BUVVU2+59RY+5Z6WX",
    imageUrl: "https://www25.a8.net/svt/bgt?aid=260622883717&wid=004&eno=01&mid=s00000024595001004000&mc=1",
    impressionUrl: "https://www19.a8.net/0.gif?a8mat=4B61WJ+BUVVU2+59RY+5Z6WX",
    categories: ["live"],
    policies: ["nagasu", "uruosu", "sasaeru"],
    symptoms: ["sleep", "fatigue", "swelling", "headache"],
    weatherFit: ["humidity", "damp", "dry", "cold", "heat"],
    seasonFit: ["rainy", "summer", "autumn", "winter"],
    lifeFit: ["sleep_short", "outdoor"],
    priceBands: ["all", "deep"],
    intensity: { moisturizing: 2, draining: 2 },
    rewardRank: "high",
    reason: "湿気・乾燥・寝室環境が気になる条件で、空気まわりを整えたい時の候補です。",
    tags: ["空気環境", "湿度"],
  }),
  a8({
    id: "cado-circulator-drying",
    title: "cado 除菌サーキュレーター",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+BUVVU2+59RY+5ZMCH",
    imageUrl: "https://www28.a8.net/svt/bgt?aid=260622883717&wid=004&eno=01&mid=s00000024595001006000&mc=1",
    impressionUrl: "https://www10.a8.net/0.gif?a8mat=4B61WJ+BUVVU2+59RY+5ZMCH",
    categories: ["live"],
    policies: ["nagasu", "sasaeru", "meguraseru"],
    symptoms: ["fatigue", "swelling", "sleep"],
    weatherFit: ["humidity", "damp", "heat"],
    seasonFit: ["rainy", "summer"],
    lifeFit: ["outdoor"],
    priceBands: ["all", "deep"],
    intensity: { draining: 2.5, stimulating: 0.5 },
    rewardRank: "medium",
    reason: "梅雨や湿気で部屋がこもりやすい条件で、室内環境を整えたい時の候補です。",
    tags: ["部屋干し", "湿気"],
  }),
  a8({
    id: "summer-cool-pillow",
    title: "夏の夜も涼しく眠れる枕",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+C0U7VU+5LHW+5YZ75",
    imageUrl: "https://www25.a8.net/svt/bgt?aid=260622883727&wid=004&eno=01&mid=s00000026114001003000&mc=1",
    impressionUrl: "https://www10.a8.net/0.gif?a8mat=4B61WJ+C0U7VU+5LHW+5YZ75",
    categories: ["live"],
    policies: ["shizumeru", "sasaeru", "uruosu"],
    symptoms: ["sleep", "fatigue", "headache"],
    weatherFit: ["heat", "humidity"],
    seasonFit: ["summer", "rainy"],
    seasonSuppress: ["winter"],
    lifeFit: ["sleep_short"],
    priceBands: ["all", "standard", "deep"],
    intensity: { relaxing: 1, stimulating: 0.2 },
    reason: "暑さや寝苦しさが出やすい条件で、寝具まわりを涼しく整えたい時の候補です。",
    tags: ["夏", "睡眠"],
  }),
  a8({
    id: "tiger-vacuum-bottle",
    title: "タイガー 真空断熱ボトル",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+BG01PM+4OAC+609HT",
    imageUrl: "https://www24.a8.net/svt/bgt?aid=260622883692&wid=004&eno=01&mid=s00000021810001009000&mc=1",
    impressionUrl: "https://www13.a8.net/0.gif?a8mat=4B61WJ+BG01PM+4OAC+609HT",
    primarySurface: "eat",
    policies: ["sasaeru", "nukumeru", "nagasu", "uruosu"],
    symptoms: ["fatigue", "digestion", "swelling", "dizziness"],
    weatherFit: ["cold", "heat", "dry", "humidity"],
    seasonFit: ["spring", "rainy", "summer", "autumn", "winter"],
    lifeFit: ["cold_drinks", "outdoor"],
    priceBands: ["all", "standard"],
    intensity: { warming: 0.8, moisturizing: 0.5 },
    reason: "冷たい飲み物に寄りすぎず、温かい一杯や水分補給を持ち歩きたい時の候補です。",
    tags: ["白湯", "水分補給"],
  }),
  a8({
    id: "ala-plus-deep-sleep-mental-care",
    title: "アラプラス 深い眠り メンタルケア",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+8WBAJU+43JO+NV1XD",
    imageUrl: "https://www27.a8.net/svt/bgt?aid=260622883538&wid=004&eno=01&mid=s00000019122004008000&mc=1",
    impressionUrl: "https://www10.a8.net/0.gif?a8mat=4B61WJ+8WBAJU+43JO+NV1XD",
    imageSize: { width: 200, height: 200 },
    primarySurface: "eat",
    productRole: "nutrition_support",
    policies: ["shizumeru", "sasaeru", "yurumeru"],
    symptoms: ["sleep", "mood", "fatigue"],
    weatherFit: ["pressure_down", "pressure_up", "cold", "heat"],
    seasonFit: ["spring", "rainy", "summer", "autumn", "winter"],
    lifeFit: ["sleep_short", "tense"],
    coreFit: ["accel", "batt_small"],
    priceBands: ["all", "standard", "deep"],
    starterEligible: false,
    fitStrictness: "strong",
    intensity: { relaxing: 1.6, stimulating: 0.2 },
    rewardRank: "high",
    riskLevel: "expression_careful",
    buyingBehavior: "official_preferred",
    reason: "睡眠の質や気分のゆらぎが気になる条件で、食品系サポートを取り入れたい時の候補です。",
    tags: ["睡眠", "5-ALA", "栄養補助"],
  }),
  a8({
    id: "kita-yumeshizuku",
    title: "北の大地の夢しずく",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+8YP0YY+1KO+2HD5WH",
    imageUrl: "https://www27.a8.net/svt/bgt?aid=260622883542&wid=004&eno=01&mid=s00000000204015010000&mc=1",
    impressionUrl: "https://www14.a8.net/0.gif?a8mat=4B61WJ+8YP0YY+1KO+2HD5WH",
    primarySurface: "eat",
    productRole: "nutrition_support",
    policies: ["shizumeru", "sasaeru", "yurumeru"],
    symptoms: ["sleep", "fatigue", "mood"],
    weatherFit: ["pressure_down", "pressure_up", "cold"],
    seasonFit: ["spring", "rainy", "autumn", "winter"],
    lifeFit: ["sleep_short", "tense"],
    coreFit: ["accel", "batt_small"],
    priceBands: ["all", "standard", "deep"],
    starterEligible: false,
    fitStrictness: "strong",
    intensity: { relaxing: 1.8 },
    rewardRank: "medium",
    riskLevel: "expression_careful",
    buyingBehavior: "official_preferred",
    reason: "寝不足や眠りの浅さが気になる条件で、休む前の整え方を見直したい時の候補です。",
    tags: ["睡眠", "ラフマ", "栄養補助"],
  }),
  a8({
    id: "hojun-saji",
    title: "豊潤サジー",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+ALMXUY+5TPQ+5ZEMP",
    imageUrl: "https://www21.a8.net/svt/bgt?aid=260622883641&wid=004&eno=01&mid=s00000027179001005000&mc=1",
    impressionUrl: "https://www19.a8.net/0.gif?a8mat=4B61WJ+ALMXUY+5TPQ+5ZEMP",
    primarySurface: "eat",
    productRole: "nutrition_support",
    policies: ["sasaeru", "meguraseru", "uruosu"],
    symptoms: ["fatigue", "mood", "dizziness", "sleep"],
    weatherFit: ["heat", "dry", "cold", "pressure_down"],
    seasonFit: ["spring", "summer", "autumn", "winter"],
    lifeFit: ["sleep_short", "outdoor", "cold_drinks"],
    coreFit: ["batt_small"],
    priceBands: ["all", "standard", "deep"],
    starterEligible: false,
    fitStrictness: "strong",
    intensity: { stimulating: 0.4, moisturizing: 0.5 },
    rewardRank: "high",
    riskLevel: "expression_careful",
    buyingBehavior: "official_preferred",
    reason: "食事が偏りやすい条件で、鉄分やビタミンCなどを含む果実飲料を取り入れたい時の候補です。",
    tags: ["サジー", "鉄分", "栄養補助"],
  }),
  a8({
    id: "green-spoon",
    title: "GREEN SPOON",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+AYQH62+4H72+5ZMCH",
    imageUrl: "https://www24.a8.net/svt/bgt?aid=260622883663&wid=004&eno=01&mid=s00000020891001006000&mc=1",
    impressionUrl: "https://www16.a8.net/0.gif?a8mat=4B61WJ+AYQH62+4H72+5ZMCH",
    categories: ["eat"],
    policies: ["sasaeru", "nagasu", "uruosu"],
    symptoms: ["fatigue", "digestion", "mood", "sleep"],
    weatherFit: ["humidity", "damp", "heat", "cold"],
    seasonFit: ["spring", "rainy", "summer", "autumn", "winter"],
    lifeFit: ["overeating", "sleep_short", "cold_drinks"],
    coreFit: ["batt_small"],
    priceBands: ["all", "deep"],
    intensity: { draining: 0.8, moisturizing: 0.4 },
    rewardRank: "high",
    buyingBehavior: "official_preferred",
    reason: "食事を考える余力が少ない条件で、野菜や軽い食事を選びやすくする候補です。",
    tags: ["食事負担", "冷凍惣菜"],
  }),
  a8({
    id: "medimeal",
    title: "メディミール",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+A8JEJU+4ICQ+5ZMCH",
    imageUrl: "https://www26.a8.net/svt/bgt?aid=260622883619&wid=004&eno=01&mid=s00000021041001006000&mc=1",
    impressionUrl: "https://www13.a8.net/0.gif?a8mat=4B61WJ+A8JEJU+4ICQ+5ZMCH",
    categories: ["eat"],
    policies: ["sasaeru", "nagasu"],
    symptoms: ["fatigue", "digestion", "swelling"],
    weatherFit: ["humidity", "damp", "cold"],
    seasonFit: ["spring", "rainy", "summer", "autumn", "winter"],
    lifeFit: ["overeating", "sleep_short"],
    coreFit: ["batt_small"],
    priceBands: ["all", "deep"],
    rewardRank: "high",
    buyingBehavior: "official_preferred",
    reason: "食事の準備が負担になりやすい条件で、食事管理を外に預けたい時の候補です。",
    tags: ["宅食", "食事管理"],
  }),
  a8({
    id: "kenmin-makura",
    title: "健眠枕",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+9K4MQY+2DDC+AF589T",
    imageUrl: "https://www27.a8.net/svt/bgt?aid=260622883578&wid=004&eno=01&mid=s00000011064063010000&mc=1",
    impressionUrl: "https://www17.a8.net/0.gif?a8mat=4B61WJ+9K4MQY+2DDC+AF589T",
    categories: ["live"],
    policies: ["sasaeru", "yurumeru"],
    symptoms: ["sleep", "neck_shoulder", "headache", "fatigue"],
    weatherFit: ["pressure_down", "pressure_up", "cold"],
    seasonFit: ["spring", "rainy", "autumn", "winter"],
    lifeFit: ["sleep_short", "screen", "tense"],
    priceBands: ["all", "standard", "deep"],
    intensity: { relaxing: 1.5 },
    reason: "睡眠や首肩まわりが気になる条件で、枕から休む環境を見直したい時の候補です。",
    tags: ["枕", "首肩"],
  }),
  a8({
    id: "recovery-design-waist-pillow",
    title: "リカバリーデザイン腰まくら",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+9ICBXM+4RZ4+HVNAP",
    imageUrl: "https://www22.a8.net/svt/bgt?aid=260622883575&wid=004&eno=01&mid=s00000022288003003000&mc=1",
    impressionUrl: "https://www18.a8.net/0.gif?a8mat=4B61WJ+9ICBXM+4RZ4+HVNAP",
    primarySurface: "live",
    productRole: "sleep_environment",
    policies: ["sasaeru", "yurumeru", "nukumeru"],
    symptoms: ["low_back_pain", "sleep", "fatigue"],
    weatherFit: ["cold", "pressure_down"],
    seasonFit: ["rainy", "autumn", "winter"],
    lifeFit: ["sleep_short", "low_activity"],
    priceBands: ["all", "standard", "deep"],
    intensity: { relaxing: 2, warming: 0.3 },
    reason: "腰まわりや寝姿勢が気になる条件で、休む姿勢を整えたい時の候補です。",
    tags: ["腰", "寝姿勢"],
  }),
  a8({
    id: "nell-mattress",
    title: "NELLマットレス",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+805VVU+4KD8+60WN5",
    imageUrl: "https://www21.a8.net/svt/bgt?aid=260622883484&wid=004&eno=01&mid=s00000021302001012000&mc=1",
    impressionUrl: "https://www12.a8.net/0.gif?a8mat=4B61WJ+805VVU+4KD8+60WN5",
    categories: ["live"],
    policies: ["sasaeru", "yurumeru"],
    symptoms: ["sleep", "low_back_pain", "fatigue", "neck_shoulder"],
    weatherFit: ["cold", "pressure_down", "humidity"],
    seasonFit: ["spring", "rainy", "autumn", "winter"],
    lifeFit: ["sleep_short", "tense"],
    coreFit: ["batt_small"],
    priceBands: ["all", "deep"],
    intensity: { relaxing: 1.5 },
    rewardRank: "high",
    buyingBehavior: "official_preferred",
    reason: "朝のだるさや腰まわりが気になる条件で、睡眠環境を見直したい時の候補です。",
    tags: ["睡眠環境", "マットレス"],
  }),
  a8({
    id: "recovery-sleep",
    title: "Recovery Sleep",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+7YDL2I+53VQ+62U35",
    imageUrl: "https://www26.a8.net/svt/bgt?aid=260622883481&wid=004&eno=01&mid=s00000023831001021000&mc=1",
    impressionUrl: "https://www14.a8.net/0.gif?a8mat=4B61WJ+7YDL2I+53VQ+62U35",
    categories: ["live"],
    policies: ["sasaeru", "shizumeru", "uruosu"],
    symptoms: ["sleep", "fatigue", "mood"],
    weatherFit: ["cold", "dry", "heat"],
    seasonFit: ["summer", "autumn", "winter"],
    lifeFit: ["sleep_short", "tense"],
    priceBands: ["all", "standard", "deep"],
    starterEligible: false,
    fitStrictness: "strong",
    intensity: { relaxing: 1.5 },
    riskLevel: "expression_careful",
    reason: "睡眠前の切り替えや回復環境が気になる条件で、寝る時間を整えたい時の候補です。",
    tags: ["睡眠", "回復環境"],
  }),
  a8({
    id: "ringconn-smart-ring",
    title: "RingConn スマートリング",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+8TXK4Q+5QLS+BZ0Z5",
    imageUrl: "https://www23.a8.net/svt/bgt?aid=260622883534&wid=004&eno=01&mid=s00000026776002011000&mc=1",
    impressionUrl: "https://www10.a8.net/0.gif?a8mat=4B61WJ+8TXK4Q+5QLS+BZ0Z5",
    categories: ["live"],
    policies: ["sasaeru", "shizumeru"],
    symptoms: ["sleep", "fatigue", "mood", "dizziness"],
    weatherFit: ["pressure_down", "pressure_up", "heat", "cold"],
    seasonFit: ["spring", "rainy", "summer", "autumn", "winter"],
    lifeFit: ["sleep_short", "tense"],
    priceBands: ["all", "deep"],
    intensity: { stimulating: 0.4 },
    rewardRank: "high",
    reason: "睡眠やコンディションを細かく見たい人向けに、状態の記録を足す候補です。",
    tags: ["見える化", "睡眠記録"],
  }),
  a8({
    id: "my-makura-order",
    title: "マイまくら オーダーメイド枕",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+8OKNOQ+3KHK+C9J29",
    imageUrl: "https://www29.a8.net/svt/bgt?aid=260622883525&wid=004&eno=01&mid=s00000016652002060000&mc=1",
    impressionUrl: "https://www12.a8.net/0.gif?a8mat=4B61WJ+8OKNOQ+3KHK+C9J29",
    categories: ["live"],
    policies: ["yurumeru", "sasaeru"],
    symptoms: ["sleep", "neck_shoulder", "headache", "fatigue"],
    weatherFit: ["pressure_down", "cold", "pressure_up"],
    seasonFit: ["spring", "rainy", "autumn", "winter"],
    lifeFit: ["sleep_short", "screen", "tense"],
    priceBands: ["all", "deep"],
    reason: "首肩や睡眠環境が気になる条件で、枕を自分に合わせたい時の候補です。",
    tags: ["枕", "オーダーメイド"],
  }),
  a8({
    id: "my-makura-recovery-wear",
    title: "マイまくら リカバリーウェア",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+8OKNOQ+3KHK+BXYE9",
    imageUrl: "https://www23.a8.net/svt/bgt?aid=260622883525&wid=004&eno=01&mid=s00000016652002006000&mc=1",
    impressionUrl: "https://www12.a8.net/0.gif?a8mat=4B61WJ+8OKNOQ+3KHK+BXYE9",
    categories: ["live"],
    policies: ["sasaeru", "yurumeru", "nukumeru"],
    symptoms: ["fatigue", "sleep", "neck_shoulder", "low_back_pain"],
    weatherFit: ["cold", "pressure_down"],
    seasonFit: ["autumn", "winter", "rainy"],
    lifeFit: ["sleep_short", "tense"],
    priceBands: ["all", "deep"],
    intensity: { warming: 0.8, relaxing: 1.2 },
    riskLevel: "expression_careful",
    reason: "休む時間を削りがちな条件で、着る休息環境を整えたい時の候補です。",
    tags: ["休息", "ウェア"],
  }),
  a8({
    id: "survaq",
    title: "SurvaQ Store",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+8FN5M2+573A+5ZMCH",
    imageUrl: "https://www21.a8.net/svt/bgt?aid=260622883510&wid=004&eno=01&mid=s00000024247001006000&mc=1",
    impressionUrl: "https://www12.a8.net/0.gif?a8mat=4B61WJ+8FN5M2+573A+5ZMCH",
    primarySurface: "live",
    policies: ["yurumeru", "nukumeru", "sasaeru"],
    symptoms: ["neck_shoulder", "sleep", "low_back_pain", "fatigue"],
    weatherFit: ["cold", "pressure_down", "pressure_up"],
    seasonFit: ["rainy", "autumn", "winter"],
    lifeFit: ["screen", "sleep_short", "tense"],
    priceBands: ["all", "deep", "standard"],
    intensity: { warming: 1.2, relaxing: 2.5 },
    rewardRank: "high",
    reason: "首肩・睡眠・腰まわりが気になる条件で、休みながらゆるめたい時の候補です。",
    tags: ["首肩", "睡眠"],
  }),
  a8({
    id: "motton-dehumidifying-sheet",
    title: "モットン除湿シート",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+82JMAY+3606+2BK6R5",
    imageUrl: "https://www21.a8.net/svt/bgt?aid=260622883488&wid=004&eno=01&mid=s00000014775014035000&mc=1",
    impressionUrl: "https://www13.a8.net/0.gif?a8mat=4B61WJ+82JMAY+3606+2BK6R5",
    categories: ["live"],
    policies: ["nagasu", "sasaeru"],
    symptoms: ["fatigue", "swelling", "sleep", "low_back_pain"],
    weatherFit: ["humidity", "damp"],
    seasonFit: ["rainy", "summer"],
    lifeFit: ["sleep_short"],
    priceBands: ["all", "standard", "deep"],
    intensity: { draining: 2.2 },
    reason: "湿気で寝具まわりがこもりやすい条件で、寝床の重さを減らしたい時の候補です。",
    tags: ["湿気", "寝具"],
  }),
  a8({
    id: "reveria",
    title: "REVERIA",
    clickUrl: "https://px.a8.net/svt/ejp?a8mat=4B61WJ+7O97SA+4TX4+ZRIB5",
    imageUrl: "https://www27.a8.net/svt/bgt?aid=260622883464&wid=004&eno=01&mid=s00000022540006007000&mc=1",
    impressionUrl: "https://www12.a8.net/0.gif?a8mat=4B61WJ+7O97SA+4TX4+ZRIB5",
    primarySurface: "live",
    policies: ["sasaeru", "yurumeru"],
    symptoms: ["sleep", "low_back_pain", "neck_shoulder", "fatigue"],
    weatherFit: ["cold", "pressure_down", "pressure_up", "humidity"],
    seasonFit: ["rainy", "autumn", "winter", "spring"],
    lifeFit: ["sleep_short", "tense", "low_activity"],
    coreFit: ["batt_small", "brake", "accel"],
    priceBands: ["all", "deep"],
    intensity: { relaxing: 2.5, warming: 0.4 },
    rewardRank: "high",
    riskLevel: "medical_expression_careful",
    buyingBehavior: "official_preferred",
    reason: "睡眠中の姿勢や、朝のこわばりが気になる条件で見直しやすい候補です。",
    tags: ["寝姿勢", "マットレス"],
  }),
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return Array.from(new Set(safeArray(values).filter(Boolean)));
}

function hasOverlap(a, b) {
  const set = new Set(safeArray(a));
  return safeArray(b).some((item) => set.has(item));
}

function add(score, value) {
  return score + Number(value || 0);
}

function rewardScore(rank) {
  if (rank === "high") return 1.1;
  if (rank === "medium") return 0.65;
  return 0.3;
}


function normalizePartnerPriceBand(priceBand) {
  // MYケアセレクトの「軽く試せるセット」は楽天商品では light 価格帯で探すが、
  // A8の提携候補には light タグを付けていないため、そのまま渡すと全件除外される。
  // ただし高額・継続系まで混ざると納得感が落ちるので、starterEligible で別途制御する。
  return priceBand === "light" ? "standard" : priceBand;
}

function isStarterEligiblePartnerOffer(offer, requestedPriceBand) {
  if (requestedPriceBand !== "light") return true;
  if (typeof offer.starterEligible === "boolean") return offer.starterEligible;

  const starterRoles = new Set([
    "bath_shift",
    "warm_drink",
    "caffeine_shift",
    "drinkware",
    "ingredient",
  ]);

  // 価格が取れないA8は、軽く試せるセットでは「小物・飲み物・入浴剤」寄りに限定する。
  // 寝具・家電・宅食・サプリ/機能性表示食品などは standard/deep 側で出す。
  return starterRoles.has(offer.productRole) && !safeArray(offer.priceBands).includes("deep");
}

function evaluatePartnerFit(offer, { symptomKey, lifeKeys, weatherKeys, coreHints, policyKeys, environmentMode, seasonKey } = {}) {
  const directSymptom = Boolean(symptomKey && safeArray(offer.symptoms).includes(symptomKey));
  const directLife = hasOverlap(offer.lifeFit, lifeKeys);
  const directWeather = ["tomorrow", "now", "shelf"].includes(environmentMode) && hasOverlap(offer.weatherFit, weatherKeys);
  const directSeason = ["season", "now", "shelf"].includes(environmentMode) && Boolean(seasonKey && safeArray(offer.seasonFit).includes(seasonKey));
  const directCore = hasOverlap(offer.coreFit, coreHints) || hasOverlap(offer.typeFit, coreHints);
  const directPolicy = hasOverlap(offer.policies, policyKeys);

  return {
    directSymptom,
    directLife,
    directWeather,
    directSeason,
    directCore,
    directPolicy,
    hasStrongUserNeed: directSymptom || directLife,
    hasContextNeed: directSymptom || directLife || directWeather || directSeason,
  };
}

function isContextuallyRelevantPartnerOffer(offer, fit) {
  // サプリ・機能性表示食品・表現注意系は「方針が合う」だけでは出さない。
  // 不調選択または生活サインとつながる時だけ候補にする。
  if (offer.fitStrictness === "strong" || offer.productRole === "nutrition_support" || offer.riskLevel === "expression_careful") {
    return Boolean(fit.hasStrongUserNeed);
  }

  // 高単価/環境見直し系は、少なくとも不調・生活・天気・季節のどれかに接続している時に出す。
  // 方針一致だけで寝具・家電・サービスが出ると、広告感が強くなるため。
  const deepOnlyOrHighIntent =
    safeArray(offer.priceBands).includes("deep") &&
    !offer.starterEligible &&
    !["bath_shift", "caffeine_shift", "warm_drink", "drinkware", "ingredient"].includes(offer.productRole);

  if (offer.riskLevel === "medical_expression_careful" || offer.buyingBehavior === "official_preferred" || deepOnlyOrHighIntent) {
    return Boolean(fit.hasContextNeed);
  }

  return true;
}

function getWeatherKeys(triggerFactors) {
  return safeArray(triggerFactors)
    .map((factor) => factor?.key || factor?.exact)
    .filter(Boolean);
}

function getCoreHints(coreCode) {
  const text = String(coreCode || "");
  return [
    text.includes("batt_small") ? "batt_small" : null,
    text.includes("batt_large") ? "batt_large" : null,
    text.startsWith("accel_") ? "accel" : null,
    text.startsWith("brake_") ? "brake" : null,
  ].filter(Boolean);
}

function isSeasonSuppressed(offer, seasonKey, weatherKeys) {
  if (!seasonKey) return false;
  if (safeArray(offer.seasonSuppress).includes(seasonKey)) return true;

  // 真夏は強い温めを抑える。ただし冷え込みトリガーがある時は残す。
  if (seasonKey === "summer" && Number(offer.intensity?.warming || 0) >= 2 && !weatherKeys.includes("cold")) {
    return true;
  }

  // 梅雨〜夏の湿気が主役の日は、強い加湿・うるおし家電を抑える。
  if ((seasonKey === "rainy" || seasonKey === "summer") && hasOverlap(weatherKeys, ["humidity", "damp"]) && Number(offer.intensity?.moisturizing || 0) >= 2.5) {
    return true;
  }

  return false;
}

function buildReason(offer, { environmentMode, symptomLabel, seasonLabel, weatherLabels }) {
  if (environmentMode === "shelf") {
    const tomorrowHint = weatherLabels.length ? ` 明日の${weatherLabels[0]}にも備えやすい候補です。` : "";
    return `${symptomLabel || "いつものゆらぎ"}と${seasonLabel || "今の時季"}をふまえて、${offer.reason}${tomorrowHint}`;
  }
  if (environmentMode === "now") {
    const tomorrowText = weatherLabels.length ? `明日の${weatherLabels.slice(0, 2).join("と")}` : "これからの天気";
    return `${tomorrowText}と${seasonLabel || "季節"}の傾向をふまえて、${offer.reason}`;
  }
  if (environmentMode === "tomorrow" && weatherLabels.length) {
    return `${weatherLabels[0]}が気になる条件で、${offer.reason}`;
  }
  if (environmentMode === "season" && seasonLabel) {
    return `${seasonLabel}の傾向をふまえて、${offer.reason}`;
  }
  if (symptomLabel) {
    return `${symptomLabel}が気になる人に、${offer.reason}`;
  }
  return offer.reason;
}

function pickPolicyKey(offer, policyKeys) {
  return safeArray(policyKeys).find((key) => safeArray(offer.policies).includes(key)) || offer.policies?.[0] || "sasaeru";
}

export function scorePartnerOffers({
  category,
  policyKeys,
  symptomKey,
  symptomLabel,
  profile,
  environmentMode = "none",
  triggerFactors = [],
  seasonKey,
  seasonLabel,
  lifeKeys = [],
  priceBand = "all",
  limit = 4,
} = {}) {
  const safeCategory = category || "live";
  const safePolicyKeys = safeArray(policyKeys).filter((key) => POLICY_KEYS.includes(key));
  const partnerPriceBand = normalizePartnerPriceBand(priceBand);
  const weatherKeys = getWeatherKeys(triggerFactors);
  const weatherLabels = safeArray(triggerFactors).map((factor) => factor?.label).filter(Boolean);
  const subLabels = safeArray(profile?.sub_labels || profile?.computed?.sub_labels);
  const coreHints = getCoreHints(profile?.core_code || profile?.computed?.core_code);
  const lifeHints = lifeKeys.flatMap((key) => {
    const hint = LIFE_POLICY_HINTS[key] || {};
    return [...safeArray(hint.symptoms), ...safeArray(hint.policies), ...safeArray(hint.tags)];
  });

  const ranked = PARTNER_OFFERS
    .filter((offer) => (offer.primarySurface || safeArray(offer.categories)[0]) === safeCategory)
    .filter((offer) => partnerPriceBand === "all" || safeArray(offer.priceBands).includes(partnerPriceBand))
    .filter((offer) => isStarterEligiblePartnerOffer(offer, priceBand))
    .map((offer) => {
      const fit = evaluatePartnerFit(offer, {
        symptomKey,
        lifeKeys,
        weatherKeys,
        coreHints,
        policyKeys: safePolicyKeys,
        environmentMode,
        seasonKey,
      });

      if (!isContextuallyRelevantPartnerOffer(offer, fit)) return null;

      let score = 0;

      score = add(score, 4.2); // category match

      safePolicyKeys.forEach((key, index) => {
        if (safeArray(offer.policies).includes(key)) score = add(score, index === 0 ? 2.3 : 1.35);
      });

      if (fit.directSymptom) score = add(score, 4.2);
      if (symptomKey === "fatigue" && hasOverlap(offer.symptoms, ["sleep", "digestion"])) score = add(score, 0.45);
      if (symptomKey === "sleep" && hasOverlap(offer.symptoms, ["fatigue", "neck_shoulder"])) score = add(score, 0.35);

      if (environmentMode === "shelf") {
        // MYケアは体質・不調・反復傾向の棚。明日の天気は順位を決め切らず、
        // 直近に使う理由がある候補を少し押し上げるだけにする。
        weatherKeys.forEach((key, index) => {
          if (safeArray(offer.weatherFit).includes(key)) score = add(score, index === 0 ? 0.45 : 0.2);
        });
        if (safeArray(offer.seasonFit).includes(seasonKey)) score = add(score, 0.55);
      } else if (environmentMode === "now") {
        // MYケアは「今」の棚。変化する環境条件は、明日7割・季節3割で商品適合へ反映する。
        weatherKeys.forEach((key, index) => {
          if (safeArray(offer.weatherFit).includes(key)) score = add(score, index === 0 ? 1.68 : 0.8);
        });
        if (safeArray(offer.seasonFit).includes(seasonKey)) score = add(score, 0.66);
      } else if (environmentMode === "tomorrow") {
        weatherKeys.forEach((key, index) => {
          if (safeArray(offer.weatherFit).includes(key)) score = add(score, index === 0 ? 2.4 : 1.15);
        });
      } else if (environmentMode === "season") {
        if (safeArray(offer.seasonFit).includes(seasonKey)) score = add(score, 2.2);
      } else {
        // 通年ベースでは、季節限定すぎる候補を少し抑え、土台系を残す。
        if (safeArray(offer.seasonFit).length >= 4) score = add(score, 0.9);
        if (safeArray(offer.seasonFit).length <= 2) score = add(score, -0.45);
      }

      if (hasOverlap(offer.subFit, subLabels)) score = add(score, 1.4);
      if (fit.directCore) score = add(score, 0.85);
      if (fit.directLife) score = add(score, lifeKeys.length ? 2.25 : 0);
      else if (hasOverlap(offer.symptoms, lifeHints) || hasOverlap(offer.policies, lifeHints)) score = add(score, lifeKeys.length ? 0.75 : 0);

      // 報酬は最後の軽い後押しに留め、悩みとの接続を上書きしない。
      score = add(score, Math.min(rewardScore(offer.rewardRank), 0.65));

      if (isSeasonSuppressed(offer, seasonKey, weatherKeys)) score = add(score, -5.5);
      if (hasOverlap(weatherKeys, ["heat"]) && Number(offer.intensity?.warming || 0) >= 2 && !safeArray(offer.weatherFit).includes("heat")) score = add(score, -2.2);
      if (hasOverlap(weatherKeys, ["humidity", "damp"]) && Number(offer.intensity?.moisturizing || 0) >= 2.5) score = add(score, -2.4);
      if (offer.riskLevel === "medical_expression_careful" || offer.riskLevel === "expression_careful") score = add(score, -0.25);

      const policyKey = pickPolicyKey(offer, safePolicyKeys);
      return {
        ...offer,
        score,
        policyKey,
        category: safeCategory,
        sourceKey: offer.id,
        itemUrl: offer.clickUrl,
        tags: unique([offer.productRoleLabel, ...(offer.tags || []), ...(policyKey ? [policyKey] : [])]).slice(0, 4),
        reason: buildReason(offer, { environmentMode, symptomLabel, seasonLabel, weatherLabels }),
      };
    })
    .filter(Boolean)
    .filter((offer) => offer.score >= 5.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}

export function buildApproachTags({ environmentMode = "none", triggerFactors = [], seasonLabel = "", lifeKeys = [], symptomChanged = false, symptomLabel = "" } = {}) {
  const tags = [];
  if (environmentMode === "shelf") {
    tags.push("体質の土台から選ぶ");
    if (seasonLabel) tags.push(`${seasonLabel}に続けやすい`);
    safeArray(triggerFactors).slice(0, 1).forEach((factor) => {
      if (factor?.label) tags.push(`明日は${factor.label}にも注目`);
    });
  } else if (environmentMode === "now") {
    tags.push("今の自分に合わせる");
    safeArray(triggerFactors).slice(0, 1).forEach((factor) => {
      if (factor?.label) tags.push(`明日の${factor.label}`);
    });
    if (seasonLabel) tags.push(`${seasonLabel}の傾向`);
  } else if (environmentMode === "tomorrow") {
    tags.push("明日の予報");
    safeArray(triggerFactors).slice(0, 2).forEach((factor) => {
      if (factor?.label) tags.push(factor.label);
    });
  } else if (environmentMode === "season") {
    tags.push(`${seasonLabel || "季節"}の天候`);
  } else {
    tags.push("通年の土台");
  }

  safeArray(lifeKeys).slice(0, 2).forEach((key) => {
    const label = LIFE_POLICY_HINTS[key]?.tags?.[0];
    if (label) tags.push(label);
  });

  if (symptomChanged && symptomLabel) tags.push(`${symptomLabel}に変更中`);

  return unique(tags).slice(0, 5);
}
