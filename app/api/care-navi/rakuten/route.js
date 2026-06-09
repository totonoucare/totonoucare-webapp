export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAKUTEN_ITEM_SEARCH_ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401";

const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

const CATEGORY_LABELS = {
  live: "暮らす",
  eat: "食べる",
  point: "ほぐす",
};

const POLICY_LABELS = {
  shizumeru: "しずめる",
  yurumeru: "ゆるめる",
  meguraseru: "めぐらせる",
  nagasu: "ながす",
  uruosu: "うるおす",
  nukumeru: "ぬくめる",
  sasaeru: "ささえる",
};

const POLICY_QUERY_RULES = {
  live: {
    shizumeru: [
      ["アイマスク 遮光 睡眠", "光や通知の刺激を減らし、頭の高ぶりを落ち着ける候補です。", ["睡眠前", "刺激を減らす"]],
      ["耳栓 睡眠 遮音", "音の刺激を減らして、休む方向へ切り替える候補です。", ["音対策", "睡眠"]],
    ],
    yurumeru: [
      ["入浴剤 リラックス 無香料", "予定や画面作業で入りっぱなしになった力みを、入浴でほどく候補です。", ["入浴", "切り替え"]],
      ["ネックウォーマー 首 肩 温め", "首肩を冷やさず、こわばりをほどきやすくする候補です。", ["首肩", "温める"]],
    ],
    meguraseru: [
      ["炭酸 入浴剤 無香料", "温浴でこわばった巡りを切り替え、停滞感を残しにくくする候補です。", ["入浴", "巡り"]],
      ["足湯 バケツ 折りたたみ", "足元から温めて、巡りのきっかけを作る候補です。", ["足元", "温活"]],
    ],
    nagasu: [
      ["除湿剤 湿気取り 部屋", "湿気の日の重だるさを、空間のこもりから減らす候補です。", ["湿気", "部屋"]],
      ["除湿シート 寝具 湿気", "寝具まわりの湿気をためにくくし、重だるさを残しにくくする候補です。", ["寝具", "湿気"]],
    ],
    uruosu: [
      ["卓上 加湿器 寝室", "乾燥で喉・目・肌が疲れやすい日に備える候補です。", ["乾燥", "寝室"]],
      ["就寝用 保湿 マスク", "寝ている間の口元や喉の乾きを守る候補です。", ["喉", "保湿"]],
    ],
    nukumeru: [
      ["腹巻き 薄手 温活", "お腹や腰腹まわりの冷えを守りやすい候補です。", ["お腹", "温活"]],
      ["湯たんぽ 足元 温熱", "足元や下腹部から冷えを残しにくくする候補です。", ["足元", "冷え"]],
    ],
    sasaeru: [
      ["アイマスク 耳栓 睡眠", "無理に押し切らず、回復の土台を作る候補です。", ["睡眠", "回復"]],
      ["腹巻き お腹 冷え", "胃腸や下腹部の冷えを守り、翌日の重さを残しにくくする候補です。", ["胃腸", "お腹"]],
    ],
  },
  eat: {
    shizumeru: [
      ["ノンカフェイン お茶 リラックス", "カフェインで押し切らず、落ち着く時間を作る候補です。", ["飲み物", "夜向き"]],
      ["カモミールティー ノンカフェイン", "夜の高ぶりを増やしにくい飲み物候補です。", ["お茶", "ノンカフェイン"]],
    ],
    yurumeru: [
      ["ハーブティー ノンカフェイン リラックス", "力みや焦りを増やしにくい、温かい飲み物候補です。", ["飲み物", "温かい"]],
      ["しょうが湯 ノンカフェイン", "冷えやこわばりを残しにくい温かい飲み物候補です。", ["温かい", "香味"]],
    ],
    meguraseru: [
      ["黒豆茶 ノンカフェイン", "巡りを止めにくく、日常に足しやすい飲み物候補です。", ["お茶", "ノンカフェイン"]],
      ["しょうが湯 国産", "冷たさや停滞を増やしにくく、動き出しを助ける候補です。", ["温かい", "香味"]],
    ],
    nagasu: [
      ["はとむぎ茶 ノンカフェイン", "重だるさや湿気の日に、冷たい甘い飲み物へ偏りにくくする候補です。", ["お茶", "湿気"]],
      ["とうもろこし茶 ノンカフェイン", "水っぽい重さが気になる日に、軽く続けやすい飲み物候補です。", ["お茶", "軽め"]],
    ],
    uruosu: [
      ["ルイボスティー ノンカフェイン", "乾きやすい日に、カフェインへ偏らず飲みやすい候補です。", ["お茶", "ノンカフェイン"]],
      ["白湯 ポット 保温", "乾きや冷えが重なりやすい日に、温かい水分を取りやすくする候補です。", ["温かい", "水分"]],
    ],
    nukumeru: [
      ["しょうが湯 ノンカフェイン", "冷たいものが続いた時に、内側を冷やしっぱなしにしない候補です。", ["温かい", "胃腸"]],
      ["味噌汁 フリーズドライ", "温かく軽く足しやすく、胃腸の負担を増やしにくい候補です。", ["汁物", "軽め"]],
    ],
    sasaeru: [
      ["味噌汁 フリーズドライ", "食べすぎず、温かく軽く足しやすい候補です。", ["胃腸", "軽め"]],
      ["スープ 常温 保存", "忙しい日でも回復を削りすぎない軽い食事候補です。", ["スープ", "備蓄"]],
    ],
  },
  point: {
    shizumeru: [
      ["頭皮ブラシ シリコン", "頭や目まわりに残る高ぶりを、軽く落ち着ける候補です。", ["頭まわり", "やさしく"]],
      ["ホットアイマスク 温熱", "目元から頭の冴えを落としやすくする候補です。", ["目元", "温熱"]],
    ],
    yurumeru: [
      ["マッサージボール 首 肩", "首肩や肩甲骨まわりのこわばりを逃がす候補です。", ["首肩", "ピンポイント"]],
      ["フォームローラー 肩甲骨", "背中や肩まわりを大きくゆるめたい時の候補です。", ["肩甲骨", "ストレッチ"]],
    ],
    meguraseru: [
      ["フォームローラー", "固まった姿勢を切り、巡りのきっかけを作る候補です。", ["全身", "巡り"]],
      ["ふくらはぎ ローラー", "下半身の重さや同じ姿勢の停滞を切る候補です。", ["足元", "巡り"]],
    ],
    nagasu: [
      ["ふくらはぎ マッサージ ローラー", "むくみ感や下半身の重さを、足元から逃がす候補です。", ["むくみ", "足元"]],
      ["足裏 マッサージ ローラー", "足元の重さやだるさを抜きたい時の候補です。", ["足裏", "重だるさ"]],
    ],
    uruosu: [
      ["ストレッチバンド やわらかい", "強く流すより、こわばりをやさしくほどく候補です。", ["やさしく", "伸ばす"]],
      ["ヨガマット ストレッチ", "ゆったり動かして乾きやこわばりを残しにくくする候補です。", ["ストレッチ", "床ケア"]],
    ],
    nukumeru: [
      ["湯たんぽ 足元", "冷えて縮こまりやすい足元から整える候補です。", ["足元", "冷え"]],
      ["温熱パッド 腰 肩", "腰腹・肩まわりを冷やしっぱなしにしない候補です。", ["温熱", "腰肩"]],
    ],
    sasaeru: [
      ["ストレッチポール ハーフ", "無理に強くほぐさず、体を休ませながら整える候補です。", ["姿勢", "回復"]],
      ["足裏 マッサージ ローラー", "だるさや胃腸の重さがある日に、足元から軽く整える候補です。", ["足元", "セルフケア"]],
    ],
  },
};


const SYMPTOM_QUERY_BOOSTS = {
  fatigue: {
    live: [["アイマスク 耳栓 睡眠", "疲れが残りやすい日の休む環境づくりに向いた候補です。", ["不調直結", "休息"], "sasaeru"]],
    eat: [["味噌汁 フリーズドライ", "だるい日でも温かく軽く足しやすい候補です。", ["不調直結", "軽め"], "sasaeru"]],
    point: [["ストレッチポール ハーフ", "疲れで丸まりやすい姿勢を一度切る候補です。", ["不調直結", "姿勢"], "sasaeru"]],
  },
  sleep: {
    live: [["アイマスク 遮光 睡眠", "寝る前の光刺激を減らしたい時の候補です。", ["不調直結", "遮光"], "shizumeru"]],
    eat: [["ノンカフェイン お茶 リラックス", "夜のカフェインを避けたい時に選びやすい候補です。", ["不調直結", "夜"], "shizumeru"]],
    point: [["ホットアイマスク 温熱", "目元から休むスイッチを入れたい時の候補です。", ["不調直結", "睡眠前"], "shizumeru"]],
  },
  digestion: {
    live: [["腹巻き お腹 冷え", "お腹まわりを冷やさず、胃腸の重さを残しにくくする候補です。", ["不調直結", "胃腸"], "sasaeru"]],
    eat: [["味噌汁 フリーズドライ", "胃腸が重い日でも温かく軽く足しやすい候補です。", ["不調直結", "軽め"], "sasaeru"]],
    point: [["足裏 マッサージ ローラー", "胃腸まわりの重さを直接商品名にせず、足元から整える候補です。", ["不調直結", "足元"], "nagasu"]],
  },
  neck_shoulder: {
    live: [["ネックウォーマー 首 肩 温め", "首肩を冷やさず、こわばりを残しにくくする候補です。", ["不調直結", "首肩"], "yurumeru"]],
    eat: [["しょうが湯 ノンカフェイン", "冷えや力みが出やすい日の温かい飲み物候補です。", ["不調直結", "温かい"], "yurumeru"]],
    point: [["マッサージボール 首 肩", "首肩のこわばりをピンポイントで逃がす候補です。", ["不調直結", "首肩"], "yurumeru"]],
  },
  low_back_pain: {
    live: [["腹巻き 腰 お腹 温活", "腰腹まわりを冷やしにくくする候補です。", ["不調直結", "腰腹"], "nukumeru"]],
    eat: [["味噌汁 フリーズドライ", "冷えや重さを残しにくい軽い温かい候補です。", ["不調直結", "温かい"], "nukumeru"]],
    point: [["フォームローラー 腰 背中", "腰背部まわりを大きくゆるめたい時の候補です。", ["不調直結", "腰背中"], "yurumeru"]],
  },
  swelling: {
    live: [["除湿シート 寝具 湿気", "湿気や足元の重さをためにくい環境づくりの候補です。", ["不調直結", "湿気"], "nagasu"]],
    eat: [["はとむぎ茶 ノンカフェイン", "重だるさや湿気の日に足しやすい飲み物候補です。", ["不調直結", "湿気"], "nagasu"]],
    point: [["ふくらはぎ マッサージ ローラー", "むくみ感や下半身の重さを足元から逃がす候補です。", ["不調直結", "むくみ"], "nagasu"]],
  },
  headache: {
    live: [["アイマスク 遮光 睡眠", "光刺激や目元の負担を減らし、頭の高ぶりを増やしにくい候補です。", ["不調直結", "光対策"], "shizumeru"]],
    eat: [["ノンカフェイン お茶", "カフェインで押し切らず、頭の高ぶりを増やしにくい候補です。", ["不調直結", "ノンカフェイン"], "shizumeru"]],
    point: [["頭皮ブラシ シリコン", "頭皮や側頭部まわりを軽くほぐす候補です。", ["不調直結", "頭皮"], "yurumeru"]],
  },
  dizziness: {
    live: [["アイマスク 睡眠 遮光", "刺激量を減らし、休む余白を作りたい時の候補です。", ["不調直結", "刺激を減らす"], "sasaeru"]],
    eat: [["味噌汁 フリーズドライ", "無理に食べず、温かく軽く足しやすい候補です。", ["不調直結", "軽め"], "sasaeru"]],
    point: [["足裏 マッサージ ローラー", "足元から軽く整えたい時の候補です。", ["不調直結", "足元"], "sasaeru"]],
  },
  mood: {
    live: [["入浴剤 リラックス 無香料", "予定や通知に押されすぎた日の力みを、入浴でほどく候補です。", ["不調直結", "入浴"], "yurumeru"]],
    eat: [["ノンカフェイン お茶 リラックス", "高ぶりや焦りを増やしにくい飲み物候補です。", ["不調直結", "リラックス"], "shizumeru"]],
    point: [["頭皮ブラシ マッサージ シリコン", "頭や気分のこもりを軽く逃がす候補です。", ["不調直結", "頭まわり"], "yurumeru"]],
  },
};


function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanKeyword(keyword) {
  return String(keyword || "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function uniqueStrings(items) {
  return Array.from(new Set(asArray(items).filter(Boolean).map((item) => String(item))));
}

function resolvePolicyKey(key, fallback = "sasaeru") {
  return POLICY_LABELS[key] ? key : fallback;
}

function getRakutenCredentials() {
  return {
    applicationId:
      process.env.RAKUTEN_APPLICATION_ID ||
      process.env.RAKUTEN_APP_ID ||
      process.env.NEXT_PUBLIC_RAKUTEN_APPLICATION_ID ||
      "",
    accessKey:
      process.env.RAKUTEN_ACCESS_KEY ||
      process.env.RAKUTEN_API_ACCESS_KEY ||
      process.env.RAKUTEN_APPLICATION_SECRET ||
      "",
    affiliateId:
      process.env.RAKUTEN_AFFILIATE_ID ||
      process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ||
      "",
  };
}

function getAppOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "https://mibyo-radar.totonoucare.com";

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return "https://mibyo-radar.totonoucare.com";
  }
}

function buildQueryPlans({ category, policyKeys, symptomKey }) {
  const safeCategory = CATEGORY_LABELS[category] ? category : "live";
  const safePolicyKeys = asArray(policyKeys).filter((key) => POLICY_LABELS[key]).slice(0, 3);
  const fallbackPolicyKey = safePolicyKeys[0] || "sasaeru";
  const plans = [];

  function makePlan(row, { policyKey, source }) {
    if (!Array.isArray(row) || !row[0]) return null;

    const explicitPolicyKey = resolvePolicyKey(row[3], policyKey || fallbackPolicyKey);
    const baseTags = asArray(row[2]);
    const tags =
      source === "symptom"
        ? uniqueStrings(baseTags).slice(0, 3)
        : uniqueStrings([POLICY_LABELS[explicitPolicyKey], ...baseTags]).slice(0, 3);

    return {
      keyword: row[0],
      reason: row[1],
      tags,
      policyKey: explicitPolicyKey,
      source,
      sourceKey: source === "symptom" ? "symptom" : explicitPolicyKey,
      category: safeCategory,
    };
  }

  asArray(SYMPTOM_QUERY_BOOSTS[symptomKey]?.[safeCategory]).forEach((row) => {
    const plan = makePlan(row, { policyKey: fallbackPolicyKey, source: "symptom" });
    if (plan) plans.push(plan);
  });

  safePolicyKeys.forEach((policyKey) => {
    const rows = POLICY_QUERY_RULES[safeCategory]?.[policyKey] || [];
    rows.slice(0, 1).forEach((row) => {
      const plan = makePlan(row, { policyKey, source: "policy" });
      if (plan) plans.push(plan);
    });
  });

  const seen = new Set();
  return plans
    .map((plan) => ({ ...plan, keyword: cleanKeyword(plan.keyword) }))
    .filter((plan) => {
      if (!plan.keyword || seen.has(plan.keyword)) return false;
      seen.add(plan.keyword);
      return true;
    })
    .slice(0, 4);
}

function firstImageUrl(item) {
  const candidates = [
    item?.mediumImageUrls,
    item?.smallImageUrls,
    item?.imageUrls,
  ];

  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (typeof entry === "string" && entry) return entry.replace("?_ex=128x128", "");
      if (entry?.imageUrl) return String(entry.imageUrl).replace("?_ex=128x128", "");
    }
  }

  return "";
}

function normalizeRakutenItem(item, plan, planIndex, itemIndex) {
  const reviewCount = Number(item?.reviewCount || 0);
  const reviewAverage = Number(item?.reviewAverage || 0);
  const price = Number(item?.itemPrice || 0);
  const url = item?.affiliateUrl || item?.itemUrl || "";

  return {
    title: item?.itemName || item?.catchcopy || plan.keyword,
    reason: plan.reason,
    tags: plan.tags,
    query: plan.keyword,
    policyKey: plan.policyKey,
    category: plan.category || "live",
    imageUrl: firstImageUrl(item),
    itemUrl: url,
    price: Number.isFinite(price) && price > 0 ? price : null,
    shopName: item?.shopName || "",
    reviewAverage: Number.isFinite(reviewAverage) && reviewAverage > 0 ? reviewAverage : null,
    reviewCount: Number.isFinite(reviewCount) && reviewCount > 0 ? reviewCount : 0,
    itemCode: item?.itemCode || url || `${plan.keyword}-${planIndex}-${itemIndex}`,
    source: "rakuten",
    sourceType: plan.source || "policy",
    sourceKey: plan.sourceKey || (plan.source === "symptom" ? "symptom" : plan.policyKey),
    planIndex,
    planRank: planIndex + 1,
    score: (100 - planIndex * 12 - itemIndex) + Math.min(reviewCount / 25, 18) + Math.min(reviewAverage, 5),
  };
}

function buildDisplayQuotas(policyKeys) {
  const keys = asArray(policyKeys).filter((key) => POLICY_LABELS[key]).slice(0, 3);

  if (keys.length >= 3) {
    return [
      { key: "symptom", count: 2 },
      { key: keys[0], count: 2 },
      { key: keys[1], count: 2 },
      { key: keys[2], count: 1 },
      { key: "__remaining__", count: 1 },
    ];
  }

  if (keys.length >= 2) {
    return [
      { key: "symptom", count: 2 },
      { key: keys[0], count: 3 },
      { key: keys[1], count: 2 },
      { key: "__remaining__", count: 1 },
    ];
  }

  if (keys.length === 1) {
    return [
      { key: "symptom", count: 2 },
      { key: keys[0], count: 4 },
      { key: "__remaining__", count: 2 },
    ];
  }

  return [
    { key: "symptom", count: 2 },
    { key: "__remaining__", count: 6 },
  ];
}

function selectBalancedItems(items, policyKeys, { displayLimit = 8, totalLimit = 24 } = {}) {
  const sorted = asArray(items)
    .filter(Boolean)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  const used = new Set();
  const displayItems = [];

  function itemUniqueKey(item) {
    return item?.itemCode || item?.itemUrl || item?.title || "";
  }

  function addItem(item) {
    const key = itemUniqueKey(item);
    if (!key || used.has(key)) return false;
    used.add(key);
    displayItems.push(item);
    return true;
  }

  function addFromGroup(groupKey, count) {
    if (count <= 0 || displayItems.length >= displayLimit) return;
    const candidates = sorted.filter((item) => item?.sourceKey === groupKey);
    for (const item of candidates) {
      if (displayItems.length >= displayLimit) break;
      if (displayItems.filter((current) => current?.sourceKey === groupKey).length >= count) break;
      addItem(item);
    }
  }

  const quotas = buildDisplayQuotas(policyKeys);
  quotas
    .filter((quota) => quota.key !== "__remaining__")
    .forEach((quota) => addFromGroup(quota.key, quota.count));

  const remainingQuota = quotas.find((quota) => quota.key === "__remaining__")?.count || 0;
  const remainingTarget = Math.min(displayLimit, displayItems.length + remainingQuota);
  for (const item of sorted) {
    if (displayItems.length >= remainingTarget) break;
    addItem(item);
  }

  for (const item of sorted) {
    if (displayItems.length >= displayLimit) break;
    addItem(item);
  }

  const balanced = [...displayItems];

  for (const item of sorted) {
    if (balanced.length >= totalLimit) break;
    const key = itemUniqueKey(item);
    if (!key || used.has(key)) continue;
    used.add(key);
    balanced.push(item);
  }

  return balanced.slice(0, totalLimit);
}

async function searchRakutenForPlan(plan, planIndex, credentials) {
  const url = new URL(RAKUTEN_ITEM_SEARCH_ENDPOINT);
  url.searchParams.set("applicationId", credentials.applicationId);
  url.searchParams.set("accessKey", credentials.accessKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatVersion", "2");
  url.searchParams.set("keyword", plan.keyword);
  url.searchParams.set("hits", "10");
  url.searchParams.set("page", "1");
  url.searchParams.set("availability", "1");
  url.searchParams.set("imageFlag", "1");
  url.searchParams.set("carrier", "2");
  url.searchParams.set("field", "0");
  url.searchParams.set("orFlag", "1");
  url.searchParams.set("sort", "standard");
  url.searchParams.set("elements", [
    "itemName",
    "catchcopy",
    "itemPrice",
    "itemUrl",
    "affiliateUrl",
    "itemCode",
    "mediumImageUrls",
    "smallImageUrls",
    "shopName",
    "reviewAverage",
    "reviewCount",
  ].join(","));
  url.searchParams.set("NGKeyword", "中古 レンタル 福袋 訳あり 医薬品 サプリ プロテイン ダイエット EMS 美顔器 フットマッサージャー マッサージ機");

  if (credentials.affiliateId) {
    url.searchParams.set("affiliateId", credentials.affiliateId);
  }

  const appOrigin = getAppOrigin();

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Referer: `${appOrigin}/`,
      Origin: appOrigin,
    },
  });
  const json = await res.json().catch(() => ({}));

  if (res.status === 404) return [];

  if (!res.ok) {
    const error = new Error(json?.error_description || json?.error || `Rakuten API error ${res.status}`);
    error.status = res.status;
    error.payload = json;
    throw error;
  }

  const rawItems = asArray(json?.Items || json?.items);
  return rawItems
    .map((entry) => entry?.Item || entry)
    .filter(Boolean)
    .map((item, itemIndex) => normalizeRakutenItem(item, plan, planIndex, itemIndex));
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = CATEGORY_LABELS[body?.category] ? body.category : "live";
    const policyKeys = asArray(body?.policyKeys).filter((key) => POLICY_LABELS[key]).slice(0, 3);
    const symptomKey = String(body?.symptomKey || "");

    const credentials = getRakutenCredentials();
    if (!credentials.applicationId || !credentials.accessKey) {
      return jsonUtf8({
        ok: false,
        apiNotConfigured: true,
        error: "楽天APIの環境変数が未設定です。",
        requiredEnv: ["RAKUTEN_APPLICATION_ID", "RAKUTEN_ACCESS_KEY"],
        optionalEnv: ["RAKUTEN_AFFILIATE_ID"],
      }, 500);
    }

    const plans = buildQueryPlans({ category, policyKeys, symptomKey });
    if (!plans.length) {
      return jsonUtf8({ ok: true, items: [], queries: [], category });
    }

    const settled = await Promise.allSettled(
      plans.map((plan, index) => searchRakutenForPlan({ ...plan, category }, index, credentials))
    );

    const items = [];
    const errors = [];

    settled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        items.push(...result.value);
      } else {
        errors.push({
          keyword: plans[index]?.keyword,
          message: result.reason?.message || String(result.reason),
          status: result.reason?.status || null,
        });
      }
    });

    const seen = new Set();
    const deduped = items
      .filter((item) => {
        const key = item.itemCode || item.itemUrl || item.title;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score);

    const balancedItems = selectBalancedItems(deduped, policyKeys, { displayLimit: 8, totalLimit: 24 });

    if (!balancedItems.length && errors.length === plans.length) {
      return jsonUtf8({
        ok: false,
        category,
        items: [],
        queries: plans.map((plan) => plan.keyword),
        errors,
        error: errors[0]?.message || "楽天APIから商品候補を取得できませんでした。",
      }, errors[0]?.status && Number(errors[0].status) !== 404 ? Number(errors[0].status) : 502);
    }

    return jsonUtf8({
      ok: true,
      category,
      items: balancedItems,
      queries: plans.map((plan) => plan.keyword),
      errors,
    });
  } catch (error) {
    console.error("/api/care-navi/rakuten POST error:", error);
    return jsonUtf8({ ok: false, error: error?.message || String(error) }, 500);
  }
}
