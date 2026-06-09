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
      ["アイマスク 遮光 睡眠", "光や刺激を減らして、夜の高ぶりを残しにくくする候補です。", ["睡眠前", "刺激を減らす"]],
      ["ホットアイマスク 使い捨て", "目元を温めて、頭の冴えを落としやすくする候補です。", ["目元", "夜ケア"]],
    ],
    yurumeru: [
      ["ネックウォーマー 首 肩 温め", "首肩を冷やさず、力みをほどきやすくする候補です。", ["首肩", "温める"]],
      ["ホットアイマスク 目元 温熱", "画面作業後の目と首肩の緊張を一度切る候補です。", ["画面作業", "目元"]],
    ],
    meguraseru: [
      ["ストレッチポール ハーフ", "固まった姿勢をリセットし、巡りのきっかけを作る候補です。", ["姿勢", "リセット"]],
      ["足湯 バケツ 折りたたみ", "足元を温めて、巡りを切り替える候補です。", ["足元", "温活"]],
    ],
    nagasu: [
      ["除湿剤 湿気取り 部屋", "湿気の日の重だるさを、空間のこもりから減らす候補です。", ["湿気", "部屋"]],
      ["レッグウォーマー 薄手 足首", "足元を冷やしすぎず、下半身の重さをためにくくする候補です。", ["足元", "冷え対策"]],
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
      ["アイマスク 耳栓 睡眠", "無理に押し切らず、休む余白を作る候補です。", ["睡眠", "回復"]],
      ["腹巻き お腹 冷え", "胃腸や下腹部の冷えを守り、翌日の重さを残しにくくする候補です。", ["胃腸", "お腹"]],
    ],
  },
  eat: {
    shizumeru: [
      ["ノンカフェイン お茶 リラックス", "カフェインで押し切らず、落ち着く時間を作る候補です。", ["飲み物", "夜向き"]],
      ["カモミールティー ノンカフェイン", "夜の高ぶりを増やしにくい飲み物候補です。", ["お茶", "ノンカフェイン"]],
    ],
    yurumeru: [
      ["ノンカフェイン お茶 温活", "甘いものやカフェインだけで粘らず、力みを増やしにくい候補です。", ["飲み物", "温かい"]],
      ["しょうが湯 ノンカフェイン", "冷えやこわばりを残しにくい温かい飲み物候補です。", ["温かい", "香味"]],
    ],
    meguraseru: [
      ["しょうが湯 国産", "冷たさや停滞を増やしにくく、動き出しを助ける候補です。", ["温かい", "香味"]],
      ["黒豆茶 ノンカフェイン", "巡りを止めにくく、日常に足しやすい飲み物候補です。", ["お茶", "ノンカフェイン"]],
    ],
    nagasu: [
      ["はとむぎ茶 ノンカフェイン", "重だるさや湿気の日に、冷たい甘い飲み物へ偏りにくくする候補です。", ["お茶", "湿気"]],
      ["黒豆茶 ノンカフェイン", "水分を取りながら、重さを残しにくい候補です。", ["お茶", "ノンカフェイン"]],
    ],
    uruosu: [
      ["ルイボスティー ノンカフェイン", "乾きやすい日に、カフェインへ偏らず飲みやすい候補です。", ["お茶", "ノンカフェイン"]],
      ["ノンカフェイン お茶 温活", "乾いた菓子やコーヒーだけに偏らない候補です。", ["飲み物", "温かい"]],
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
      ["頭皮ブラシ シリコン", "頭や目まわりに残る力みを軽く逃がす候補です。", ["頭まわり", "ほぐす"]],
      ["ホットアイマスク 温熱", "目元から頭の高ぶりを落としやすくする候補です。", ["目元", "温熱"]],
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
    live: [["アイマスク 耳栓 睡眠", "疲れが残りやすい日の休む環境づくりに向いた候補です。", ["休息", "睡眠"]]],
    eat: [["味噌汁 フリーズドライ", "だるい日でも温かく軽く足しやすい候補です。", ["軽め", "温かい"]]],
    point: [["ストレッチポール ハーフ", "疲れで丸まりやすい姿勢を一度切る候補です。", ["姿勢", "回復"]]],
  },
  sleep: {
    live: [["アイマスク 遮光 睡眠", "寝る前の光刺激を減らしたい時の候補です。", ["睡眠", "遮光"]]],
    eat: [["ノンカフェイン お茶 リラックス", "夜のカフェインを避けたい時に選びやすい候補です。", ["夜", "ノンカフェイン"]]],
    point: [["ホットアイマスク 温熱", "目元から休むスイッチを入れたい時の候補です。", ["目元", "睡眠前"]]],
  },
  digestion: {
    live: [["腹巻き お腹 冷え", "お腹まわりを冷やさず、胃腸の重さを残しにくくする候補です。", ["胃腸", "お腹"]]],
    eat: [["味噌汁 フリーズドライ", "胃腸が重い日でも温かく軽く足しやすい候補です。", ["胃腸", "軽め"]]],
    point: [["足裏 マッサージ ローラー", "胃腸まわりの重さを直接商品名にせず、足元から整える候補です。", ["足裏", "重だるさ"]]],
  },
  neck_shoulder: {
    live: [["ネックウォーマー 首 肩 温め", "首肩を冷やさず、こわばりを残しにくくする候補です。", ["首肩", "温める"]]],
    eat: [["しょうが湯 ノンカフェイン", "冷えや力みが出やすい日の温かい飲み物候補です。", ["温かい", "香味"]]],
    point: [["マッサージボール 首 肩", "首肩のこわばりをピンポイントで逃がす候補です。", ["首肩", "ほぐす"]]],
  },
  low_back_pain: {
    live: [["腹巻き 腰 お腹 温活", "腰腹まわりを冷やしにくくする候補です。", ["腰腹", "温活"]]],
    eat: [["味噌汁 フリーズドライ", "冷えや重さを残しにくい軽い温かい候補です。", ["温かい", "軽め"]]],
    point: [["フォームローラー 腰 背中", "腰背部まわりを大きくゆるめたい時の候補です。", ["腰", "背中"]]],
  },
  swelling: {
    live: [["レッグウォーマー 薄手 足首", "足元を冷やしすぎず、重さを残しにくくする候補です。", ["足元", "冷え対策"]]],
    eat: [["はとむぎ茶 ノンカフェイン", "重だるさや湿気の日に足しやすい飲み物候補です。", ["湿気", "お茶"]]],
    point: [["ふくらはぎ マッサージ ローラー", "むくみ感や下半身の重さを足元から逃がす候補です。", ["むくみ", "足元"]]],
  },
  headache: {
    live: [["ホットアイマスク 目元 温熱", "目元の緊張や頭のこもりを軽く逃がす候補です。", ["目元", "温熱"]]],
    eat: [["ノンカフェイン お茶", "カフェインで押し切らず、頭の高ぶりを増やしにくい候補です。", ["お茶", "ノンカフェイン"]]],
    point: [["頭皮ブラシ シリコン", "頭皮や側頭部まわりを軽くほぐす候補です。", ["頭皮", "ほぐす"]]],
  },
  dizziness: {
    live: [["アイマスク 睡眠 遮光", "刺激量を減らし、休む余白を作りたい時の候補です。", ["刺激を減らす", "睡眠"]]],
    eat: [["味噌汁 フリーズドライ", "無理に食べず、温かく軽く足しやすい候補です。", ["軽め", "温かい"]]],
    point: [["足裏 マッサージ ローラー", "足元から軽く整えたい時の候補です。", ["足元", "セルフケア"]]],
  },
  mood: {
    live: [["入浴剤 リラックス 無香料", "予定や通知に押されすぎた日の切り替え候補です。", ["入浴", "切り替え"]]],
    eat: [["ノンカフェイン お茶 リラックス", "高ぶりや焦りを増やしにくい飲み物候補です。", ["お茶", "リラックス"]]],
    point: [["頭皮ブラシ マッサージ シリコン", "頭や気分のこもりを軽く逃がす候補です。", ["頭まわり", "ほぐす"]]],
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
  const plans = [];

  asArray(SYMPTOM_QUERY_BOOSTS[symptomKey]?.[safeCategory]).forEach((row) => {
    plans.push({
      keyword: row[0],
      reason: row[1],
      tags: row[2] || [],
      policyKey: asArray(policyKeys)[0] || "sasaeru",
      source: "symptom",
    });
  });

  asArray(policyKeys).forEach((policyKey) => {
    const rows = POLICY_QUERY_RULES[safeCategory]?.[policyKey] || [];
    rows.slice(0, 1).forEach((row) => {
      plans.push({
        keyword: row[0],
        reason: row[1],
        tags: [POLICY_LABELS[policyKey] || policyKey, ...(row[2] || [])].filter(Boolean).slice(0, 3),
        policyKey,
        source: "policy",
      });
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
    category: plan.category,
    imageUrl: firstImageUrl(item),
    itemUrl: url,
    price: Number.isFinite(price) && price > 0 ? price : null,
    shopName: item?.shopName || "",
    reviewAverage: Number.isFinite(reviewAverage) && reviewAverage > 0 ? reviewAverage : null,
    reviewCount: Number.isFinite(reviewCount) && reviewCount > 0 ? reviewCount : 0,
    itemCode: item?.itemCode || url || `${plan.keyword}-${planIndex}-${itemIndex}`,
    source: "rakuten",
    score: (100 - planIndex * 12 - itemIndex) + Math.min(reviewCount / 25, 18) + Math.min(reviewAverage, 5),
  };
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
  url.searchParams.set("NGKeyword", "中古 レンタル 福袋 訳あり 医薬品 サプリ プロテイン ダイエット");

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
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    if (!deduped.length && errors.length === plans.length) {
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
      items: deduped,
      queries: plans.map((plan) => plan.keyword),
      errors,
    });
  } catch (error) {
    console.error("/api/care-navi/rakuten POST error:", error);
    return jsonUtf8({ ok: false, error: error?.message || String(error) }, 500);
  }
}
