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

const PRICE_BAND_RANGES = {
  live: {
    light: { max: 2000, label: "〜2,000円" },
    standard: { min: 2000, max: 5000, label: "2,000〜5,000円" },
    deep: { min: 5000, label: "5,000円〜" },
  },
  eat: {
    light: { max: 1800, label: "〜1,800円" },
    standard: { min: 1800, max: 5000, label: "1,800〜5,000円" },
    deep: { min: 5000, label: "5,000円〜" },
  },
  point: {
    light: { max: 2500, label: "〜2,500円" },
    standard: { min: 2500, max: 8000, label: "2,500〜8,000円" },
    deep: { min: 8000, label: "8,000円〜" },
  },
};

function getPriceBandRange(categoryKey, priceBand) {
  if (!priceBand || priceBand === "all") return null;
  return PRICE_BAND_RANGES[categoryKey]?.[priceBand] || null;
}

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
      ["アイマスク 耳栓 睡眠", "無理を重ねず、休む時間を先に確保する候補です。", ["睡眠", "回復"]],
      ["腹巻き お腹 冷え", "胃腸や下腹部の冷えを守り、翌日の重さを残しにくくする候補です。", ["胃腸", "お腹"]],
    ],
  },
  eat: {
    shizumeru: [
      ["ノンカフェイン お茶 リラックス", "カフェインで無理に上げず、落ち着く時間を作る候補です。", ["飲み物", "夜向き"]],
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
      ["ルイボスティー ノンカフェイン", "乾きやすい日に、カフェインに頼りすぎず飲みやすい候補です。", ["お茶", "ノンカフェイン"]],
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
    eat: [["ノンカフェイン お茶", "カフェインで無理に上げず、頭の高ぶりを増やしにくい候補です。", ["お茶", "ノンカフェイン"]]],
    point: [["頭皮ブラシ シリコン", "頭皮や側頭部まわりを軽くほぐす候補です。", ["頭皮", "ほぐす"]]],
  },
  dizziness: {
    live: [["アイマスク 睡眠 遮光", "刺激量を減らし、休む時間を先に確保したい時の候補です。", ["刺激を減らす", "睡眠"]]],
    eat: [["味噌汁 フリーズドライ", "無理に食べず、温かく軽く足しやすい候補です。", ["軽め", "温かい"]]],
    point: [["足裏 マッサージ ローラー", "足元から軽く整えたい時の候補です。", ["足元", "セルフケア"]]],
  },
  mood: {
    live: [["入浴剤 リラックス 無香料", "予定を詰めすぎた日の切り替え候補です。", ["入浴", "切り替え"]]],
    eat: [["ノンカフェイン お茶 リラックス", "高ぶりや焦りを増やしにくい飲み物候補です。", ["お茶", "リラックス"]]],
    point: [["頭皮ブラシ マッサージ シリコン", "頭まわりの張りを軽くほぐす候補です。", ["頭まわり", "ほぐす"]]],
  },
};


const CATEGORY_ANCHOR_QUERY_RULES = {
  live: {
    bySymptom: {
      fatigue: [
        ["リカバリーウェア 一般医療機器", "休む時間を整えたい日の、着て休むケア候補です。", ["高単価", "休息"]],
        ["蒸気 温熱シート 首 肩", "疲れが残りやすい日の首肩まわりを温める候補です。", ["温熱", "首肩"]],
      ],
      sleep: [
        ["リカバリーウェア 睡眠 一般医療機器", "寝る時間を整えたい日の、着て休むケア候補です。", ["高単価", "睡眠"]],
        ["蒸気 ホットアイマスク 睡眠", "寝る前の目元を休ませる候補です。", ["目元", "睡眠前"]],
      ],
      neck_shoulder: [
        ["リカバリーウェア 首 肩 一般医療機器", "首肩まわりを冷やさず休みたい日の候補です。", ["高単価", "首肩"]],
      ],
      low_back_pain: [
        ["リカバリーウェア 腰 一般医療機器", "腰腹まわりを冷やさず休みたい日の候補です。", ["高単価", "腰腹"]],
      ],
    },
    byPolicy: {
      shizumeru: [
        ["蒸気 ホットアイマスク 睡眠", "光や目元の刺激を減らして休みやすくする候補です。", ["目元", "休息"]],
      ],
      yurumeru: [
        ["入浴剤 リラックス 無香料", "力みが残る日に、入浴で一度ゆるめる候補です。", ["入浴", "ゆるめる"]],
        ["リカバリーウェア 一般医療機器", "着て休む時間を整えたい日の候補です。", ["高単価", "休息"]],
      ],
      meguraseru: [
        ["炭酸 入浴剤 無香料", "温浴で体のこわばりを切り替える候補です。", ["入浴", "温浴"]],
      ],
      nagasu: [
        ["除湿シート 寝具 湿気", "寝具まわりの湿気をためにくくする候補です。", ["湿気", "寝具"]],
      ],
      uruosu: [
        ["卓上 加湿器 寝室", "乾燥しやすい日の寝室環境を整える候補です。", ["乾燥", "寝室"]],
      ],
      nukumeru: [
        ["腹巻き 薄手 温活", "お腹や腰腹まわりを冷やしにくくする候補です。", ["温活", "お腹"]],
        ["レッグウォーマー 足首 温活", "足首まわりを冷やしにくくする候補です。", ["足元", "温活"]],
      ],
      sasaeru: [
        ["リカバリーウェア 一般医療機器", "無理を重ねず、休む時間を整えたい日の候補です。", ["高単価", "休息"]],
        ["温湿度計 デジタル 室内", "湿気・乾燥・冷え込みを見える化する候補です。", ["環境", "見える化"]],
      ],
    },
  },

  eat: {
    bySymptom: {
      fatigue: [
        ["ビタミンB群 サプリ", "食事が乱れがちな日に、不足しやすい栄養を補う候補です。", ["補う", "活動量"]],
        ["プロテイン スープ", "食事量が落ちやすい日に、軽く補いやすい候補です。", ["たんぱく質", "軽め"]],
      ],
      sleep: [
        ["GABA テアニン グリシン 機能性表示食品", "夜の休息習慣に合わせて選びやすい候補です。", ["休息", "機能性表示"]],
        ["カフェインレス ハーブティー", "寝る前にカフェインを避けたい日の飲み物候補です。", ["夜", "ノンカフェイン"]],
      ],
      digestion: [
        ["酪酸菌 乳酸菌 食物繊維 サプリ", "胃腸まわりを日常的に支えたい時の候補です。", ["腸活", "補う"]],
        ["イヌリン オリゴ糖 食物繊維", "食事が偏りがちな日に、食物繊維を足す候補です。", ["食物繊維", "補う"]],
      ],
      swelling: [
        ["はとむぎ茶 小豆茶 とうもろこし茶", "湿気や重だるさが気になる日の飲み物候補です。", ["湿気", "お茶"]],
        ["カリウム 食品 タブレット", "塩気が続いた日の食事まわりを見直す候補です。", ["塩気", "補う"]],
      ],
      headache: [
        ["マグネシウム サプリ", "食事が乱れがちな日に、不足しやすい栄養を補う候補です。", ["補う", "栄養"]],
        ["カフェインレス お茶", "カフェインに頼りすぎず、温かく休む候補です。", ["お茶", "ノンカフェイン"]],
      ],
      dizziness: [
        ["鉄分 サプリ ヘム鉄", "食事量が落ちやすい日に、不足しやすい栄養を補う候補です。", ["補う", "栄養"]],
        ["味噌汁 フリーズドライ", "無理に食べず、温かく軽く足しやすい候補です。", ["軽め", "温かい"]],
      ],
      mood: [
        ["GABA テアニン サプリ", "気分が張りやすい日の休息習慣に合わせやすい候補です。", ["休息", "補う"]],
        ["カフェインレス ハーブティー", "甘いものやカフェインに寄せすぎない飲み物候補です。", ["お茶", "ノンカフェイン"]],
      ],
    },
    byPolicy: {
      shizumeru: [
        ["GABA テアニン グリシン 機能性表示食品", "夜や高ぶりが気になる日に、休息習慣へ寄せる候補です。", ["休息", "機能性表示"]],
        ["カフェインレス ハーブティー", "カフェインに頼りすぎず落ち着く時間を作る候補です。", ["飲み物", "夜向き"]],
      ],
      yurumeru: [
        ["テアニン GABA サプリ", "力みや張りが続く日の休息習慣に合わせる候補です。", ["補う", "休息"]],
        ["カモミールティー ノンカフェイン", "夜の飲み物を軽くしたい日の候補です。", ["お茶", "夜向き"]],
      ],
      meguraseru: [
        ["黒豆茶 なつめ茶 陳皮茶", "冷たい飲み物に偏らず、日常に足しやすい候補です。", ["お茶", "和漢"]],
        ["ビタミンB群 サプリ", "活動量が落ちやすい日の補う候補です。", ["補う", "活動量"]],
      ],
      nagasu: [
        ["はとむぎ茶 小豆茶 とうもろこし茶", "湿気や重だるさが気になる日の飲み物候補です。", ["お茶", "湿気"]],
        ["食物繊維 イヌリン オリゴ糖", "食事が偏りがちな日に、食物繊維を足す候補です。", ["食物繊維", "補う"]],
      ],
      uruosu: [
        ["はちみつ のど飴 マヌカハニー", "乾きが気になる日の、のどまわりの候補です。", ["のど", "うるおす"]],
        ["ルイボスティー ノンカフェイン", "カフェインを避けながら温かく飲みやすい候補です。", ["お茶", "ノンカフェイン"]],
      ],
      nukumeru: [
        ["しょうが湯 葛湯 粉末", "冷たいものが続いた日に、温かく足しやすい候補です。", ["温める", "粉末"]],
        ["生姜 シナモン 粉末 飲み物", "冷え込みの日の飲み物に足しやすい候補です。", ["温める", "香味"]],
      ],
      sasaeru: [
        ["乳酸菌 酪酸菌 食物繊維 サプリ", "胃腸まわりを日常的に支えたい時の候補です。", ["腸活", "補う"]],
        ["プロテイン スープ", "忙しい日でも軽く栄養を足しやすい候補です。", ["たんぱく質", "軽め"]],
      ],
    },
    default: [
      ["健康茶 ノンカフェイン 和漢", "日常の飲み物を軽く整えたい日の候補です。", ["お茶", "和漢"]],
    ],
  },

  point: {
    bySymptom: {
      fatigue: [
        ["火を使わないお灸 足三里", "だるさがある日に、足元から温めるセルフケア候補です。", ["お灸", "足三里"]],
        ["ツボ押し棒 足裏", "手で押すケアを続けやすくする候補です。", ["ツボ押し", "足元"]],
      ],
      sleep: [
        ["火を使わないお灸 三陰交", "寝る前に足元から温めたい日の候補です。", ["お灸", "睡眠前"]],
        ["電子灸 温熱 ツボ", "火を使わず温めるセルフケア候補です。", ["電子灸", "温熱"]],
      ],
      digestion: [
        ["せんねん灸 太陽 お腹 足三里", "胃腸まわりが気になる日に、火を使わず温める候補です。", ["お灸", "胃腸"]],
        ["ツボ押し棒 足三里", "足三里まわりのセルフケアを続けやすくする候補です。", ["ツボ押し", "足三里"]],
      ],
      neck_shoulder: [
        ["マッサージガン 軽量 首 肩", "首肩まわりのこわばりを短時間でゆるめたい時の候補です。", ["高単価", "首肩"]],
        ["電子灸 温熱 首 肩", "首肩を冷やさず温めるセルフケア候補です。", ["電子灸", "温熱"]],
      ],
      low_back_pain: [
        ["電子灸 温熱 腰", "腰腹まわりを冷やさず温めるセルフケア候補です。", ["電子灸", "腰"]],
        ["マッサージガン 軽量 腰", "腰背部のこわばりを短時間でゆるめたい時の候補です。", ["高単価", "腰"]],
      ],
      swelling: [
        ["足裏 ツボ押し 棒", "足元の重だるさを手軽にケアする候補です。", ["ツボ押し", "足元"]],
        ["ふくらはぎ マッサージ ローラー", "下半身の重さを足元からゆるめる候補です。", ["ふくらはぎ", "足元"]],
      ],
      headache: [
        ["ホットアイマスク 温熱", "目元から頭まわりをゆるめる候補です。", ["目元", "温熱"]],
        ["頭皮ブラシ シリコン", "頭皮や側頭部まわりを軽くほぐす候補です。", ["頭皮", "ほぐす"]],
      ],
      dizziness: [
        ["足裏 ツボ押し 棒", "刺激を強くしすぎず、足元から軽く整える候補です。", ["足元", "ツボ押し"]],
        ["火を使わないお灸 足元", "足元を冷やさず温めるセルフケア候補です。", ["お灸", "足元"]],
      ],
      mood: [
        ["火を使わないお灸 せんねん灸 太陽", "気分が張りやすい日に、温めながら一度落ち着く候補です。", ["お灸", "温熱"]],
        ["頭皮ブラシ マッサージ シリコン", "頭まわりの張りを軽くほぐす候補です。", ["頭まわり", "ほぐす"]],
      ],
    },
    byPolicy: {
      shizumeru: [
        ["火を使わないお灸 せんねん灸 太陽", "火を使わず、ツボまわりを温める候補です。", ["お灸", "温熱"]],
        ["電子灸 温熱 ツボ", "繰り返し使える温熱ツボケア候補です。", ["電子灸", "高単価"]],
      ],
      yurumeru: [
        ["せんねん灸 火を使わない", "ツボケアを温めながら続ける候補です。", ["お灸", "温熱"]],
        ["マッサージガン 軽量", "こわばりを短時間でゆるめたい時の候補です。", ["高単価", "振動"]],
        ["ツボ押し棒 足裏", "手で押すケアを続けやすくする候補です。", ["ツボ押し", "足元"]],
      ],
      meguraseru: [
        ["せんねん灸 レギュラー 台座灸", "ツボまわりを温め、巡りのきっかけを作る候補です。", ["お灸", "リピート"]],
        ["マッサージガン 筋膜リリース 軽量", "同じ姿勢で固まった体を短時間で切り替える候補です。", ["高単価", "振動"]],
        ["フォームローラー", "体を大きく動かして切り替える候補です。", ["伸ばす", "巡り"]],
      ],
      nagasu: [
        ["足裏 ツボ押し 棒", "足元の重だるさを手軽にケアする候補です。", ["ツボ押し", "足元"]],
        ["ふくらはぎ マッサージ ローラー", "下半身の重さを足元からゆるめる候補です。", ["ふくらはぎ", "足元"]],
        ["火を使わないお灸 足 三陰交", "足元から温めるセルフケア候補です。", ["お灸", "足元"]],
      ],
      uruosu: [
        ["ストレッチポール ハーフ", "強く攻めず、やさしく伸ばす候補です。", ["ストレッチ", "やさしく"]],
        ["低刺激 せんねん灸", "温めを弱めに試したい日の候補です。", ["お灸", "低刺激"]],
      ],
      nukumeru: [
        ["火を使わないお灸 せんねん灸 太陽", "冷えが気になるツボまわりを火を使わず温める候補です。", ["お灸", "温熱"]],
        ["電子灸 温熱 ツボ", "繰り返し使える温熱ツボケア候補です。", ["電子灸", "高単価"]],
        ["温熱パッド 腰 肩", "腰肩まわりを冷やしにくくする候補です。", ["温熱", "腰肩"]],
      ],
      sasaeru: [
        ["ツボ押し棒 足三里", "足三里まわりのケアを続けやすくする候補です。", ["ツボ押し", "足三里"]],
        ["火を使わないお灸 足三里", "火を使わず、足三里まわりを温める候補です。", ["お灸", "足三里"]],
        ["電子灸 温熱 ツボ", "繰り返し使える温熱ツボケア候補です。", ["電子灸", "高単価"]],
      ],
    },
    default: [
      ["ツボ押し棒 足裏", "手で押すケアを続けやすくする候補です。", ["ツボ押し", "足元"]],
    ],
  },
};


// 不調 × ケア方針 × カテゴリ。
// 商品そのものを固定分類するのではなく、「その不調の時に、その方針でどう使うか」で検索語と説明を決める。
// 未定義の組み合わせは、下の POLICY_QUERY_RULES / SYMPTOM_QUERY_BOOSTS にフォールバックする。
const CARE_QUERY_MATRIX = {
  fatigue: {
    sasaeru: {
      live: [
        ["アイマスク 耳栓 睡眠", "疲れが残りやすい日に、まず休む環境を守る候補です。", ["不調直結", "休息"]],
        ["腹巻き お腹 冷え", "疲れた日の胃腸や下腹部を冷やしすぎない候補です。", ["回復", "お腹"]],
      ],
      eat: [
        ["味噌汁 フリーズドライ", "だるい日でも温かく軽く足しやすい候補です。", ["不調直結", "軽め"]],
        ["スープ 常温 保存", "忙しい日でも回復を削りすぎない軽い食事候補です。", ["備蓄", "軽め"]],
      ],
      point: [
        ["ストレッチポール ハーフ", "疲れで丸まりやすい姿勢を一度切る候補です。", ["不調直結", "姿勢"]],
        ["足裏 マッサージ ローラー", "疲れの重さを足元から軽く逃がす候補です。", ["足元", "回復"]],
      ],
    },
    yurumeru: {
      live: [
        ["入浴剤 リラックス 無香料", "疲れで入りっぱなしになった力みを、入浴でほどく候補です。", ["入浴", "切り替え"]],
        ["ホットアイマスク 温熱", "疲れ目や首肩の緊張を一度ゆるめる候補です。", ["目元", "温熱"]],
      ],
      eat: [["ハーブティー ノンカフェイン リラックス", "疲れた日に焦りや力みを増やしにくい飲み物候補です。", ["温かい", "休息"]]],
      point: [["マッサージボール 首 肩", "疲れで固まりやすい首肩をピンポイントで逃がす候補です。", ["首肩", "ほぐす"]]],
    },
    nagasu: {
      live: [
        ["入浴剤 リラックス 無香料", "疲れでこもった一日の重さを、入浴で切り替える候補です。", ["入浴", "切り替え"]],
        ["除湿シート 寝具 湿気", "寝具まわりの湿気をためにくくし、朝の重さを残しにくくする候補です。", ["寝具", "湿気"]],
      ],
      eat: [["はとむぎ茶 ノンカフェイン", "重だるさがある日に、甘い冷たい飲み物へ偏りにくくする候補です。", ["お茶", "軽め"]]],
      point: [["ふくらはぎ マッサージ ローラー", "下半身の重さを足元から逃がす候補です。", ["足元", "重だるさ"]]],
    },
    nukumeru: {
      live: [["腹巻き 薄手 温活", "疲れた日にお腹や腰腹まわりを冷やしにくくする候補です。", ["お腹", "温活"]]],
      eat: [["しょうが湯 ノンカフェイン", "疲れに冷えが重なる日に、内側を冷やしっぱなしにしない候補です。", ["温かい", "香味"]]],
      point: [["湯たんぽ 足元", "足元から冷えをゆるめ、休みやすくする候補です。", ["足元", "温め"]]],
    },
    shizumeru: {
      live: [["アイマスク 遮光 睡眠", "疲れているのに頭が冴える日の刺激を減らす候補です。", ["睡眠前", "遮光"]]],
      eat: [["ノンカフェイン お茶 リラックス", "疲れをカフェインで無理に上げすぎない候補です。", ["夜向き", "お茶"]]],
      point: [["ホットアイマスク 温熱", "目元から頭の高ぶりを落としやすくする候補です。", ["目元", "温熱"]]],
    },
  },

  sleep: {
    shizumeru: {
      live: [
        ["アイマスク 遮光 睡眠", "寝る前の光刺激を減らし、休む方向へ入りやすくする候補です。", ["不調直結", "遮光"]],
        ["耳栓 睡眠 遮音", "音の刺激を減らして、眠る環境を整える候補です。", ["音対策", "睡眠"]],
      ],
      eat: [["ノンカフェイン お茶 リラックス", "夜のカフェインを避け、頭の高ぶりを増やしにくい候補です。", ["夜", "ノンカフェイン"]]],
      point: [["ホットアイマスク 温熱", "目元から休むスイッチを入れたい時の候補です。", ["目元", "睡眠前"]]],
    },
    yurumeru: {
      live: [
        ["入浴剤 リラックス 無香料", "寝る前の力みを、入浴でほどく候補です。", ["入浴", "夜"]],
        ["バスソルト リラックス", "眠る前に体の張りをほどく入浴候補です。", ["入浴", "リラックス"]],
      ],
      eat: [["カモミールティー ノンカフェイン", "夜の緊張を増やしにくい飲み物候補です。", ["お茶", "夜向き"]]],
      point: [["ストレッチバンド やわらかい", "強くほぐさず、寝る前に軽くゆるめる候補です。", ["やさしく", "伸ばす"]]],
    },
    nukumeru: {
      live: [["湯たんぽ 足元 温熱", "足元の冷えで眠りに入りにくい時の候補です。", ["足元", "冷え"]]],
      eat: [["しょうが湯 ノンカフェイン", "冷えで休みにくい夜の温かい飲み物候補です。", ["温かい", "夜"]]],
      point: [["温熱パッド 腰 肩", "冷えてこわばる部分を温めて休みやすくする候補です。", ["温熱", "腰肩"]]],
    },
    sasaeru: {
      live: [["アイマスク 耳栓 睡眠", "睡眠の土台を崩しにくくする候補です。", ["睡眠", "回復"]]],
      eat: [["味噌汁 フリーズドライ", "夜に食べすぎず、温かく軽く済ませたい時の候補です。", ["軽め", "温かい"]]],
      point: [["ヨガマット ストレッチ", "寝る前に無理なく体を整える候補です。", ["ストレッチ", "床ケア"]]],
    },
  },

  digestion: {
    sasaeru: {
      live: [["腹巻き お腹 冷え", "胃腸まわりを冷やさず、調子を崩しにくくする候補です。", ["不調直結", "胃腸"]]],
      eat: [
        ["味噌汁 フリーズドライ", "胃腸が重い日でも温かく軽く足しやすい候補です。", ["不調直結", "軽め"]],
        ["スープ 常温 保存", "食べすぎず胃腸を支えたい日の候補です。", ["スープ", "軽め"]],
      ],
      point: [["足裏 マッサージ ローラー", "胃腸まわりの重さを、足元から軽く整える候補です。", ["足元", "胃腸"]]],
    },
    nukumeru: {
      live: [["腹巻き 薄手 温活", "冷えで胃腸が重くなりやすい日の候補です。", ["お腹", "温活"]]],
      eat: [["しょうが湯 ノンカフェイン", "胃腸を冷やしっぱなしにしない温かい飲み物候補です。", ["温かい", "胃腸"]]],
      point: [["湯たんぽ 足元", "足元や下腹部から冷えを残しにくくする候補です。", ["足元", "冷え"]]],
    },
    nagasu: {
      live: [["除湿剤 湿気取り 部屋", "湿気で胃腸が重くなりやすい日の空間ケア候補です。", ["湿気", "部屋"]]],
      eat: [["はとむぎ茶 ノンカフェイン", "胃腸の重さがある日に、甘い冷たい飲み物へ偏りにくくする候補です。", ["お茶", "湿気"]]],
      point: [["足裏 マッサージ ローラー", "胃腸の重さやだるさを、足元から逃がす候補です。", ["足裏", "重だるさ"]]],
    },
    meguraseru: {
      live: [["足湯 バケツ 折りたたみ", "足元から温めて、胃腸まわりのこわばりを切り替える候補です。", ["足元", "温活"]]],
      eat: [["黒豆茶 ノンカフェイン", "冷えや停滞を増やしにくい飲み物候補です。", ["お茶", "巡り"]]],
      point: [["フォームローラー", "固まった姿勢を切り、胃腸まわりの巡りを邪魔しにくくする候補です。", ["姿勢", "巡り"]]],
    },
  },

  neck_shoulder: {
    yurumeru: {
      live: [["ネックウォーマー 首 肩 温め", "首肩を冷やさず、こわばりをほどきやすくする候補です。", ["不調直結", "首肩"]]],
      eat: [["しょうが湯 ノンカフェイン", "冷えや力みが出やすい日の温かい飲み物候補です。", ["温かい", "香味"]]],
      point: [["マッサージボール 首 肩", "首肩のこわばりをピンポイントで逃がす候補です。", ["不調直結", "首肩"]]],
    },
    meguraseru: {
      live: [["炭酸 入浴剤 無香料", "温浴で首肩のこわばった巡りを切り替える候補です。", ["入浴", "巡り"]]],
      eat: [["黒豆茶 ノンカフェイン", "巡りを止めにくく、日常に足しやすい飲み物候補です。", ["お茶", "巡り"]]],
      point: [["フォームローラー 肩甲骨", "肩甲骨まわりを大きく動かし、停滞感を切る候補です。", ["肩甲骨", "巡り"]]],
    },
    nukumeru: {
      live: [["ネックウォーマー 首 肩 温め", "冷えで首肩が固まりやすい日の候補です。", ["首肩", "温める"]]],
      eat: [["しょうが湯 ノンカフェイン", "冷えによるこわばりを増やしにくい候補です。", ["温かい", "香味"]]],
      point: [["温熱パッド 腰 肩", "肩まわりを冷やしっぱなしにしない候補です。", ["温熱", "肩"]]],
    },
    shizumeru: {
      live: [["ホットアイマスク 目元 温熱", "目元から首肩の緊張を落としやすくする候補です。", ["目元", "温熱"]]],
      eat: [["ノンカフェイン お茶", "カフェインで無理に上げず、首肩の力みを増やしにくい候補です。", ["お茶", "ノンカフェイン"]]],
      point: [["頭皮ブラシ シリコン", "頭皮や側頭部から首肩の緊張を逃がす候補です。", ["頭皮", "首肩"]]],
    },
  },

  low_back_pain: {
    nukumeru: {
      live: [["腹巻き 腰 お腹 温活", "腰腹まわりを冷やしにくくする候補です。", ["不調直結", "腰腹"]]],
      eat: [["しょうが湯 ノンカフェイン", "冷えで腰が重くなりやすい日の温かい候補です。", ["温かい", "冷え"]]],
      point: [["湯たんぽ 足元", "足元や腰腹まわりから冷えを残しにくくする候補です。", ["足元", "冷え"]]],
    },
    yurumeru: {
      live: [["入浴剤 リラックス 無香料", "腰背部の力みを、入浴でほどく候補です。", ["入浴", "腰背中"]]],
      eat: [["ハーブティー ノンカフェイン リラックス", "痛みで力みやすい日の温かい飲み物候補です。", ["飲み物", "リラックス"]]],
      point: [["フォームローラー 腰 背中", "腰背部まわりを大きくゆるめたい時の候補です。", ["不調直結", "腰背中"]]],
    },
    meguraseru: {
      live: [["足湯 バケツ 折りたたみ", "下半身から温めて腰まわりの停滞を切り替える候補です。", ["足元", "温活"]]],
      eat: [["黒豆茶 ノンカフェイン", "巡りを止めにくく、冷たい飲み物へ偏りにくい候補です。", ["お茶", "巡り"]]],
      point: [["フォームローラー", "固まった姿勢を切り、腰まわりの巡りを作る候補です。", ["姿勢", "巡り"]]],
    },
    sasaeru: {
      live: [["腹巻き お腹 冷え", "腰腹まわりを支え、無理に悪化させにくくする候補です。", ["腰腹", "支える"]]],
      eat: [["味噌汁 フリーズドライ", "腰が重い日でも胃腸を削りすぎない軽い候補です。", ["軽め", "温かい"]]],
      point: [["ストレッチポール ハーフ", "無理に強くほぐさず、姿勢から整える候補です。", ["姿勢", "回復"]]],
    },
  },

  swelling: {
    nagasu: {
      live: [["レッグウォーマー 薄手 足首", "足元を冷やしすぎず、重さを残しにくくする候補です。", ["不調直結", "足元"]]],
      eat: [["はとむぎ茶 ノンカフェイン", "重だるさや湿気の日に足しやすい飲み物候補です。", ["不調直結", "湿気"]]],
      point: [["ふくらはぎ マッサージ ローラー", "むくみ感や下半身の重さを足元から逃がす候補です。", ["不調直結", "むくみ"]]],
    },
    meguraseru: {
      live: [["足湯 バケツ 折りたたみ", "足元を温めて、下半身の停滞を切り替える候補です。", ["足元", "巡り"]]],
      eat: [["黒豆茶 ノンカフェイン", "水分を取りながら巡りを止めにくい候補です。", ["お茶", "巡り"]]],
      point: [["ふくらはぎ ローラー", "下半身の重さや同じ姿勢の停滞を切る候補です。", ["足元", "巡り"]]],
    },
    nukumeru: {
      live: [["レッグウォーマー 薄手 足首", "冷えで水っぽさを残しやすい足元を守る候補です。", ["足元", "冷え対策"]]],
      eat: [["しょうが湯 ノンカフェイン", "冷たい飲み物へ偏らず、足元の重さを増やしにくい候補です。", ["温かい", "冷え"]]],
      point: [["湯たんぽ 足元", "足元の冷えを残しにくくする候補です。", ["足元", "温め"]]],
    },
    sasaeru: {
      live: [["除湿シート 寝具 湿気", "寝具まわりの湿気をためにくくし、朝の重さを残しにくくする候補です。", ["寝具", "湿気"]]],
      eat: [["味噌汁 フリーズドライ", "むくみ感がある日でも、重い食事へ寄せすぎない候補です。", ["軽め", "温かい"]]],
      point: [["足裏 マッサージ ローラー", "足元から軽く整えたい時の候補です。", ["足裏", "重だるさ"]]],
    },
  },

  headache: {
    shizumeru: {
      live: [["アイマスク 遮光 睡眠", "光刺激や目元の負担を減らし、頭の高ぶりを増やしにくい候補です。", ["不調直結", "光対策"]]],
      eat: [["ノンカフェイン お茶", "カフェインで無理に上げず、頭の高ぶりを増やしにくい候補です。", ["不調直結", "ノンカフェイン"]]],
      point: [["ホットアイマスク 温熱", "目元から頭のこわばりを落としやすくする候補です。", ["目元", "温熱"]]],
    },
    yurumeru: {
      live: [["入浴剤 リラックス 無香料", "頭や首肩の力みを、入浴でほどく候補です。", ["入浴", "力み"]]],
      eat: [["カモミールティー ノンカフェイン", "焦りや力みを増やしにくい飲み物候補です。", ["お茶", "夜向き"]]],
      point: [["頭皮ブラシ シリコン", "頭皮や側頭部まわりを軽くほぐす候補です。", ["不調直結", "頭皮"]]],
    },
    meguraseru: {
      live: [["炭酸 入浴剤 無香料", "温浴で首肩から頭まわりの停滞を切り替える候補です。", ["入浴", "巡り"]]],
      eat: [["黒豆茶 ノンカフェイン", "巡りを止めにくく、日常に足しやすい飲み物候補です。", ["お茶", "巡り"]]],
      point: [["フォームローラー 肩甲骨", "肩甲骨まわりから頭のこもりを逃がす候補です。", ["肩甲骨", "巡り"]]],
    },
  },

  dizziness: {
    sasaeru: {
      live: [["アイマスク 睡眠 遮光", "刺激量を減らし、休む時間を先に確保したい時の候補です。", ["不調直結", "刺激を減らす"]]],
      eat: [["味噌汁 フリーズドライ", "無理に食べず、温かく軽く足しやすい候補です。", ["不調直結", "軽め"]]],
      point: [["足裏 マッサージ ローラー", "足元から軽く整えたい時の候補です。", ["不調直結", "足元"]]],
    },
    shizumeru: {
      live: [["アイマスク 遮光 睡眠", "光や情報量を減らし、ふらつきやすい日の刺激を抑える候補です。", ["遮光", "休息"]]],
      eat: [["ノンカフェイン お茶", "カフェインで無理に上げず、刺激を増やしにくい候補です。", ["お茶", "ノンカフェイン"]]],
      point: [["ホットアイマスク 温熱", "目元から緊張を落としたい時の候補です。", ["目元", "温熱"]]],
    },
    nukumeru: {
      live: [["腹巻き 薄手 温活", "冷えでふらつきやすい日の下腹部ケア候補です。", ["お腹", "温活"]]],
      eat: [["しょうが湯 ノンカフェイン", "冷たい飲み物へ偏らず、内側を冷やしっぱなしにしない候補です。", ["温かい", "冷え"]]],
      point: [["湯たんぽ 足元", "足元から冷えを残しにくくする候補です。", ["足元", "冷え"]]],
    },
  },

  mood: {
    shizumeru: {
      live: [["アイマスク 遮光 睡眠", "予定を詰めすぎて高ぶった頭の刺激を減らす候補です。", ["刺激を減らす", "休息"]]],
      eat: [["ノンカフェイン お茶 リラックス", "高ぶりや焦りを増やしにくい飲み物候補です。", ["不調直結", "リラックス"]]],
      point: [["頭皮ブラシ シリコン", "頭まわりの張りを軽く落ち着ける候補です。", ["頭まわり", "軽く"]]],
    },
    yurumeru: {
      live: [
        ["入浴剤 リラックス 無香料", "予定を詰めすぎた日の力みを、入浴でほどく候補です。", ["不調直結", "入浴"]],
        ["バスソルト リラックス", "気分の張りを、入浴でゆるめる候補です。", ["入浴", "リラックス"]],
      ],
      eat: [["ハーブティー ノンカフェイン リラックス", "気分の張りを増やしにくい温かい飲み物候補です。", ["飲み物", "リラックス"]]],
      point: [["頭皮ブラシ マッサージ シリコン", "頭まわりの張りを軽くほぐす候補です。", ["不調直結", "頭まわり"]]],
    },
    meguraseru: {
      live: [
        ["重炭酸 入浴剤 無香料", "温浴でこわばった巡りを切り替え、停滞感を残しにくくする候補です。", ["入浴", "巡り"]],
        ["炭酸 入浴剤 無香料", "入浴で気分と体のこもりを切り替える候補です。", ["温浴", "切り替え"]],
      ],
      eat: [["黒豆茶 ノンカフェイン", "気分の停滞を増やしにくい、日常に足しやすい飲み物候補です。", ["お茶", "巡り"]]],
      point: [["フォームローラー", "固まった姿勢を切り、気分の停滞を動かす候補です。", ["姿勢", "巡り"]]],
    },
    nagasu: {
      live: [
        ["入浴剤 リラックス 無香料", "気分のこもりを、入浴で一度流して切り替える候補です。", ["入浴", "切り替え"]],
        ["炭酸 入浴剤 無香料", "こもった一日の重さを、温浴で切り替える候補です。", ["温浴", "切り替え"]],
      ],
      eat: [["ノンカフェイン お茶 リラックス", "甘いものやカフェインで粘らず、気分の重さを残しにくい候補です。", ["お茶", "リラックス"]]],
      point: [["頭皮ブラシ マッサージ シリコン", "頭まわりの張りを軽くほぐす候補です。", ["頭まわり", "ながす"]]],
    },
    uruosu: {
      live: [["卓上 加湿器 寝室", "乾きや情報量で消耗しやすい日の休む環境候補です。", ["乾燥", "寝室"]]],
      eat: [["ルイボスティー ノンカフェイン", "カフェインや甘いものへ寄せすぎず、乾きや消耗を残しにくい候補です。", ["お茶", "ノンカフェイン"]]],
      point: [["ヨガマット ストレッチ", "強く流すより、ゆったり戻す候補です。", ["ストレッチ", "やさしく"]]],
    },
    nukumeru: {
      live: [["湯たんぽ 足元 温熱", "気分が沈みやすい日に、足元から冷えを残しにくくする候補です。", ["足元", "温め"]]],
      eat: [["しょうが湯 ノンカフェイン", "冷えと気分の重さが重なる日の温かい飲み物候補です。", ["温かい", "香味"]]],
      point: [["温熱パッド 腰 肩", "冷えで縮こまった体を温める候補です。", ["温熱", "こわばり"]]],
    },
    sasaeru: {
      live: [["アイマスク 耳栓 睡眠", "気分の波がある日に、まず休む土台を守る候補です。", ["睡眠", "回復"]]],
      eat: [["味噌汁 フリーズドライ", "気分で食事が乱れやすい日に、温かく軽く足す候補です。", ["軽め", "温かい"]]],
      point: [["ストレッチポール ハーフ", "無理に変えようとせず、姿勢から整える候補です。", ["姿勢", "回復"]]],
    },
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

function getPolicyKey(key, fallback = "sasaeru") {
  return POLICY_LABELS[key] ? key : fallback;
}

function polishCareReason(reason) {
  let text = String(reason || "").trim();
  if (!text) return "今の条件に合わせて選びやすいアイテムです。";

  const exact = {
    "胃腸まわりの重さを直接商品名にせず、足元から整える候補です。": "胃腸の重さが気になる日に、足元から軽く整えます。",
    "甘いものやカフェインだけで粘らないための候補です。": "甘いものやカフェインだけで粘らず、温かく軽く整えます。",
    "活動量が落ちやすい日の補う候補です。": "活動量が落ちやすい日に、不足しやすい栄養を補いやすくします。",
    "乾きが夜〜朝に残りやすい人の候補です。": "夜〜朝に乾きが残りやすいとき、口元や喉を守りやすくします。",
    "冷えや重さを残しにくい軽い温かい候補です。": "冷えや重さを残しにくい、軽く温かい選択です。",
    "冷えで腰が重くなりやすい日の温かい候補です。": "冷えで腰が重くなりやすい日に、温かく整えます。",
    "眠る前に体の張りをほどく入浴候補です。": "眠る前の体の張りを、入浴でほどきやすくします。",
  };
  if (exact[text]) return exact[text];

  text = text
    .replace(/飲み物候補です。/g, "飲み物として選びやすいです。")
    .replace(/入浴候補です。/g, "入浴まわりの選択肢です。")
    .replace(/セルフケア候補です。/g, "セルフケアとして選びやすいです。")
    .replace(/ケア候補です。/g, "ケアとして選びやすいです。")
    .replace(/食事候補です。/g, "食事として選びやすいです。")
    .replace(/休息習慣に合わせる候補です。/g, "休息習慣に合わせやすいです。")
    .replace(/休息習慣へ寄せる候補です。/g, "休息習慣へ寄せやすいです。")
    .replace(/休む環境づくりに向いた候補です。/g, "休む環境づくりに向いています。")
    .replace(/選びやすい候補です。/g, "選びやすいです。")
    .replace(/足しやすい候補です。/g, "足しやすいです。")
    .replace(/使いやすい候補です。/g, "使いやすいです。")
    .replace(/残しにくくする候補です。/g, "残しにくくします。")
    .replace(/増やしにくい候補です。/g, "増やしにくい選択です。")
    .replace(/偏りにくくする候補です。/g, "偏りにくくします。")
    .replace(/冷やしにくくする候補です。/g, "冷やしにくくします。")
    .replace(/守りやすい候補です。/g, "守りやすくします。")
    .replace(/温める候補です。/g, "温めやすくします。")
    .replace(/整える候補です。/g, "整えやすくします。")
    .replace(/作る候補です。/g, "作りやすくします。")
    .replace(/切り替える候補です。/g, "切り替えやすくします。")
    .replace(/逃がす候補です。/g, "逃がしやすくします。")
    .replace(/ほどく候補です。/g, "ほどきやすくします。")
    .replace(/補う候補です。/g, "補いやすくします。")
    .replace(/足す候補です。/g, "足しやすくします。")
    .replace(/減らす候補です。/g, "減らしやすくします。")
    .replace(/高ぶりを残しにくくする候補です。/g, "高ぶりを残しにくくします。")
    .replace(/候補です。/g, "選択肢です。");

  return text;
}

function normalizeQueryRow(row) {
  if (!row) return null;

  if (Array.isArray(row)) {
    return {
      keyword: row[0],
      reason: row[1],
      tags: row[2] || [],
    };
  }

  return {
    keyword: row.keyword,
    reason: row.reason,
    tags: row.tags || [],
  };
}

function contextRowsFor(symptomKey, policyKey, categoryKey) {
  return asArray(CARE_QUERY_MATRIX[symptomKey]?.[policyKey]?.[categoryKey]);
}

function fallbackPolicyRowsFor(policyKey, categoryKey) {
  return asArray(POLICY_QUERY_RULES[categoryKey]?.[policyKey]);
}

function fallbackSymptomRowsFor(symptomKey, categoryKey) {
  return asArray(SYMPTOM_QUERY_BOOSTS[symptomKey]?.[categoryKey]);
}

function categoryAnchorRowsFor(categoryKey, policyKey, symptomKey) {
  const group = CATEGORY_ANCHOR_QUERY_RULES[categoryKey];
  if (!group) return [];

  const rows = [
    ...asArray(group.bySymptom?.[symptomKey]),
    ...asArray(group.byPolicy?.[policyKey]),
    ...asArray(group.default),
  ];

  const seen = new Set();
  return rows.filter((row) => {
    const keyword = cleanKeyword(normalizeQueryRow(row)?.keyword);
    if (!keyword || seen.has(keyword)) return false;
    seen.add(keyword);
    return true;
  }).slice(0, 4);
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
  const primaryPolicyKey = safePolicyKeys[0] || "sasaeru";
  const plans = [];
  const seenKeywords = new Set();

  function addPlanFromRow(row, { policyKey, source, sourceKey }) {
    const normalized = normalizeQueryRow(row);
    const keyword = cleanKeyword(normalized?.keyword);
    if (!keyword || seenKeywords.has(keyword)) return false;

    const resolvedPolicyKey = getPolicyKey(policyKey, primaryPolicyKey);
    const tags =
      source === "symptom"
        ? uniqueStrings(normalized.tags).slice(0, 3)
        : uniqueStrings([POLICY_LABELS[resolvedPolicyKey], ...asArray(normalized.tags)]).slice(0, 3);

    plans.push({
      keyword,
      reason: normalized.reason,
      tags,
      policyKey: resolvedPolicyKey,
      source,
      sourceKey: sourceKey || (source === "symptom" ? "symptom" : resolvedPolicyKey),
      category: safeCategory,
    });

    seenKeywords.add(keyword);
    return true;
  }

  // 1本目: 不調直結。ただし検索語は「不調 × 第1方針 × カテゴリ」で決める。
  const symptomCandidates = [
    ...categoryAnchorRowsFor(safeCategory, primaryPolicyKey, symptomKey),
    ...contextRowsFor(symptomKey, primaryPolicyKey, safeCategory),
    ...fallbackSymptomRowsFor(symptomKey, safeCategory),
    ...fallbackPolicyRowsFor(primaryPolicyKey, safeCategory),
  ];
  for (const row of symptomCandidates) {
    if (addPlanFromRow(row, { policyKey: primaryPolicyKey, source: "symptom", sourceKey: "symptom" })) break;
  }

  // 2本目以降: 方針別。ただし各方針も「不調 × 方針 × カテゴリ」を優先する。
  safePolicyKeys.forEach((policyKey) => {
    const contextRows = contextRowsFor(symptomKey, policyKey, safeCategory);
    const candidates = [
      ...(policyKey === primaryPolicyKey ? contextRows.slice(1) : contextRows),
      ...categoryAnchorRowsFor(safeCategory, policyKey, symptomKey),
      ...fallbackPolicyRowsFor(policyKey, safeCategory),
      ...contextRows,
    ];

    for (const row of candidates) {
      if (addPlanFromRow(row, { policyKey, source: "policy", sourceKey: policyKey })) break;
    }
  });

  return plans.slice(0, 5);
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
    reason: polishCareReason(plan.reason),
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

async function searchRakutenForPlan(plan, planIndex, credentials, priceRange) {
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

  const minPrice = Number(priceRange?.min || 0);
  const maxPrice = Number(priceRange?.max || 0);

  if (Number.isFinite(minPrice) && minPrice > 0) {
    url.searchParams.set("minPrice", String(Math.floor(minPrice)));
  }

  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    url.searchParams.set("maxPrice", String(Math.floor(maxPrice)));
  }
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
  url.searchParams.set("NGKeyword", "中古 レンタル 福袋 訳あり 医薬品 医薬部外品 ダイエット 痩せる EMS 美顔器 フットマッサージャー 低周波治療器");

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
    const rawPriceBand = String(body?.priceBand || "all");
    const priceBand = rawPriceBand === "all" || PRICE_BAND_RANGES[category]?.[rawPriceBand] ? rawPriceBand : "all";
    const priceRange = getPriceBandRange(category, priceBand);

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
      return jsonUtf8({ ok: true, items: [], queries: [], category, priceBand, priceRange });
    }

    const settled = await Promise.allSettled(
      plans.map((plan, index) => searchRakutenForPlan({ ...plan, category }, index, credentials, priceRange))
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
        priceBand,
        priceRange,
        items: [],
        queries: plans.map((plan) => plan.keyword),
        errors,
        error: errors[0]?.message || "楽天APIから商品候補を取得できませんでした。",
      }, errors[0]?.status && Number(errors[0].status) !== 404 ? Number(errors[0].status) : 502);
    }

    return jsonUtf8({
      ok: true,
      category,
      priceBand,
      priceRange,
      items: balancedItems,
      queries: plans.map((plan) => plan.keyword),
      errors,
    });
  } catch (error) {
    console.error("/api/care-navi/rakuten POST error:", error);
    return jsonUtf8({ ok: false, error: error?.message || String(error) }, 500);
  }
}
