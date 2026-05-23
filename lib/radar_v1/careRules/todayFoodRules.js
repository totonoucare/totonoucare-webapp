// lib/radar_v1/careRules/todayFoodRules.js

function normalizeTriggerKey(key) {
  if (key === "humidity") return "damp";
  if (key === "temp") return "cold";
  if (key === "pressure") return "pressure_down";
  return key || "default";
}

const TODAY_FOOD_LABELS = {
  badge: "今日の食べ方",
  detail_title: "なぜこの食べ方？",
  how_to_label: "今日はこれを足す",
  avoid_label: "今日は重ねすぎ注意",
  examples_label: "迷ったらこれ",
  reason_label: "ひとこと理由",
  lifestyle_tip_label: "食後に一緒に",
};


const TRIGGER_LABELS = {
  damp: "湿気",
  cold: "冷え",
  heat: "暑さ",
  dry: "乾燥",
  pressure_down: "低気圧",
  pressure_up: "気圧上昇",
  default: "天気変化",
};

const SYMPTOM_LABELS = {
  fatigue: "だるさ",
  sleep: "睡眠",
  neck_shoulder: "首肩",
  low_back_pain: "腰",
  swelling: "むくみ",
  headache: "頭痛",
  dizziness: "めまい",
  mood: "気分",
};

const SIGNAL_FOOD_CONTEXT = {
  low: {
    label: "シグナル低め",
    lead: "大きく変えなくても、重ね方を少し整えるだけで十分な日です。",
    choiceBody: "迷ったら、いつもの食事に温かさを一つ足すくらいで大丈夫です。",
  },
  middle: {
    label: "シグナル中くらい",
    lead: "午後〜夜に残りやすいので、温かいものを一つ足し、重ねすぎを一つ減らしたい日です。",
    choiceBody: "迷ったら、温かい汁物と軽めの主食で“詰め込まない”形に寄せます。",
  },
  high: {
    label: "シグナル強め",
    lead: "今日は食べ方の上乗せが体感に出やすい日です。温かく軽く足し、重ねすぎは早めに減らします。",
    choiceBody: "迷ったら、刺激や量で押さず、温かい汁物＋小さめ主食を優先します。",
  },
};

const TRIGGER_FOOD_ITEMS = {
  damp: {
    add: ["温かい汁物", "香味を少し", "軽めの主食"],
    caution: ["冷たい飲み物＋甘いもの", "パン・麺＋甘いカフェラテ", "塩気＋冷たい飲み物"],
  },
  cold: {
    add: ["温かい汁物", "ごはん系", "生姜・ねぎを少し"],
    caution: ["冷たい飲み物＋空腹", "生もの中心＋薄着", "冷たいプロテイン・乳製品"],
  },
  heat: {
    add: ["常温の水分", "軽い汁気", "梅・しそ系"],
    caution: ["お酒＋辛味・濃い味", "カフェイン＋睡眠不足", "甘いドリンク＋暑さ"],
  },
  dry: {
    add: ["温かいお茶", "汁物", "みずみずしいもの少量"],
    caution: ["コーヒーだけ＋空腹", "乾いた菓子＋水分不足", "お酒＋夜更かし"],
  },
  pressure_down: {
    add: ["温かいお茶", "軽いスープ", "小さめ主食"],
    caution: ["お酒＋脂っこいもの", "カフェイン＋甘いもの", "揚げ物＋食べすぎ"],
  },
  pressure_up: {
    add: ["温かい飲み物", "野菜スープ", "軽めの定食"],
    caution: ["辛味＋カフェイン", "濃い味＋早食い", "お酒＋予定詰め込み"],
  },
  default: {
    add: ["温かい飲み物", "軽い汁物", "小さめ主食"],
    caution: ["甘いもの＋カフェイン", "お酒＋脂っこいもの", "食べすぎ＋座りっぱなし"],
  },
};

const SYMPTOM_FOOD_ITEMS = {
  fatigue: {
    add: {
      default: ["味噌汁", "軽めの主食", "卵・豆腐系"],
      damp: ["具だくさん味噌汁", "温かいお茶", "軽めのごはん"],
      cold: ["雑炊", "味噌汁", "温かいごはん系"],
      heat: ["梅入りおにぎり", "常温の水分", "野菜スープ"],
    },
    caution: {
      default: ["甘いもの＋カフェイン", "プロテイン＋甘味", "食事抜き＋刺激物"],
      damp: ["冷たい飲み物＋甘いもの", "パン・麺＋カフェラテ", "揚げ物＋甘味"],
    },
  },
  sleep: {
    add: {
      default: ["軽い汁物", "温かいお茶", "小さめ夕食"],
      cold: ["味噌汁", "卵スープ", "温かい白湯"],
      heat: ["野菜スープ", "豆腐入り汁物", "常温の水分"],
    },
    caution: {
      default: ["お酒＋寝る直前の食事", "濃いカフェイン＋夜", "甘いもの＋夜更かし"],
      heat: ["お酒＋辛味", "濃い味＋夜更かし", "カフェイン＋暑さ"],
    },
  },
  neck_shoulder: {
    add: {
      default: ["温かいお茶", "味噌汁", "おにぎり＋汁物"],
      pressure_down: ["軽いスープ", "温かいお茶", "小さめ主食"],
      dry: ["汁物", "温かいお茶", "果物少量"],
    },
    caution: {
      default: ["カフェイン＋空腹", "甘いもの＋画面姿勢", "脂っこいもの＋座りっぱなし"],
      pressure_down: ["お酒＋脂っこいもの", "カフェイン＋甘いもの", "揚げ物＋首肩のこわばり"],
    },
  },
  low_back_pain: {
    add: {
      default: ["味噌汁＋ごはん", "雑炊", "温かい汁物"],
      damp: ["具だくさん味噌汁", "温かいお茶", "軽めの定食"],
      cold: ["雑炊", "生姜入りスープ", "味噌汁＋ごはん"],
    },
    caution: {
      default: ["冷たい飲み物＋座りっぱなし", "食べすぎ＋深く座る", "生もの中心＋冷え"],
      damp: ["甘いもの＋塩気", "冷たい飲み物＋大盛り", "パン・麺＋濃い味"],
      cold: ["冷たいサラダ＋空腹", "アイス＋薄着", "冷たい乳製品＋夜"],
    },
  },
  swelling: {
    add: {
      default: ["温かいお茶", "味噌汁", "軽めの定食"],
      damp: ["温かいお茶", "野菜スープ", "香味を少し"],
      heat: ["常温の水分", "具のあるスープ", "濃すぎない味"],
    },
    caution: {
      default: ["塩気＋甘い飲み物", "冷たい飲み物＋しょっぱい間食", "大盛りごはん＋濃い味"],
      damp: ["冷たいカフェラテ＋甘いもの", "塩気＋冷たい飲み物", "プロテイン・乳製品＋甘味"],
      heat: ["水分不足＋濃い味", "お酒＋塩気", "冷たい飲み物の一気飲み"],
    },
  },
  headache: {
    add: {
      default: ["温かいお茶", "軽いスープ", "小さめ主食"],
      pressure_down: ["温かいお茶", "具の少ないスープ", "小さめおにぎり"],
      dry: ["汁物", "温かいお茶", "果物少量"],
    },
    caution: {
      default: ["お酒＋脂っこいもの", "カフェイン＋空腹", "甘いもの＋画面姿勢"],
      pressure_down: ["お酒＋脂っこいもの", "カフェイン＋甘いもの", "揚げ物＋食べすぎ"],
      damp: ["冷たいもの＋甘いもの", "パン・麺＋カフェラテ", "油っこさ＋眠気"],
    },
  },
  dizziness: {
    add: {
      default: ["小さめおにぎり", "温かいお茶", "軽いスープ"],
      heat: ["常温の水分", "梅入りおにぎり", "野菜スープ"],
      cold: ["雑炊", "味噌汁", "温かい白湯"],
    },
    caution: {
      default: ["食事抜き＋カフェイン", "冷たい飲み物の一気飲み", "空腹＋急な移動"],
      heat: ["お酒＋濃い味", "水分不足＋カフェイン", "暑さ＋食事抜き"],
    },
  },
  mood: {
    add: {
      default: ["温かいお茶", "おにぎり＋味噌汁", "軽いスープ"],
      heat: ["野菜スープ", "常温の水分", "濃すぎない定食"],
      cold: ["味噌汁", "雑炊", "生姜を少し"],
    },
    caution: {
      default: ["甘いもの＋カフェイン", "お酒＋夜更かし", "食事抜き＋刺激物"],
      heat: ["辛味＋カフェイン", "お酒＋濃い味", "甘いドリンク＋暑さ"],
      pressure_down: ["甘いもの＋カフェイン", "パン・麺＋甘いラテ", "食事抜き＋眠気"],
    },
  },
};

const TRIGGER_FOOD_RULES = {
  damp: {
    title: "今日は重さを残しにくい食べ方",
    recommendation:
      "冷たいもの・甘いもの・油っこいものを重ねるより、温かい汁物や香味を一つ足して、重さを残しにくい食べ方に寄せます。",
    how_to:
      "昼か間食のどこかで、温かい飲み物・汁物・生姜やねぎなどの香味を一つだけ足します。一食まるごと変えなくて大丈夫です。",
    avoid: "冷たい飲み物、甘いもの、油っこいものを同じ時間帯に重ねすぎない。",
    reason:
      "湿気が響く日は、食べたものが力になる前に“重さ”として残りやすいので、軽く温かい選び方を優先します。",
    lifestyle_tip: "食後すぐ座りっぱなしにせず、2〜3分だけ歩くと重さを残しにくくなります。",
    examples: ["温かい味噌汁", "冷たい麺＋温かいお茶", "甘い飲み物を無糖のお茶に替える"],
  },
  cold: {
    title: "今日は内側を冷やしすぎない食べ方",
    recommendation:
      "冷たいサラダやアイスで済ませるより、温かい主食・汁物・香味を一つ足して、腰腹まわりを冷やしすぎない形に寄せます。",
    how_to:
      "昼食か夕方に、温かい飲み物か汁物を入れてください。量を増やすより、温度を変える方が今日向きです。",
    avoid: "空腹のまま冷たい飲み物を流し込む、薄着で冷たいものを続ける。",
    reason:
      "気温差や冷え込みがある日は、食事の温度がそのままこわばりの残り方に出やすいので、温かさを優先します。",
    lifestyle_tip: "食べる前後に足首・腰腹を冷やさないだけでも、午後の重さを減らしやすくなります。",
    examples: ["味噌汁", "卵スープ", "生姜・ねぎを少し足した温かいもの"],
  },
  heat: {
    title: "今日は熱をこもらせない食べ方",
    recommendation:
      "辛いもの・濃い味・カフェインを重ねるより、軽い汁気やみずみずしいものを入れて、熱の逃げ道を残します。",
    how_to:
      "昼〜夕方のどこかで、水分と塩気を少し補い、濃い味を重ねすぎないようにします。食事は“軽く整える”くらいで十分です。",
    avoid: "暑さに加えて辛味・アルコール・カフェインを重ねる。",
    reason:
      "暑さが響く日は、頑張るための刺激が“内側の熱っぽさ”として残りやすいので、刺激を足しすぎない選び方にします。",
    lifestyle_tip: "食後すぐに動き切らず、汗や熱が少し引く時間を作ると楽です。",
    examples: ["具のあるスープ", "梅・しそ系の軽い味", "常温の水分をこまめに"],
  },
  dry: {
    title: "今日は汁気とうるおいを足す食べ方",
    recommendation:
      "カリカリした菓子や濃いコーヒーだけでつなぐより、汁気・果物・温かい飲み物を少し入れて、喉と頭の乾きを残さないようにします。",
    how_to:
      "水を一気飲みするより、温かい飲み物や汁気を小分けに入れる方が今日向きです。乾いた間食だけで済ませない形にします。",
    avoid: "空腹のままコーヒーだけで粘る、乾いた菓子を続ける。",
    reason:
      "乾燥が響く日は、喉だけでなく頭や首肩の張りにもつながりやすいので、汁気とうるおいを少し足します。",
    lifestyle_tip: "室内が乾くなら、デスク周りの湿度や喉の使いすぎも一緒に見てください。",
    examples: ["温かいお茶", "汁物", "みずみずしい果物を少量"],
  },
  pressure_down: {
    title: "今日は頭と首肩を詰まらせない食べ方",
    recommendation:
      "急いで甘いものやカフェインで押すより、軽く温かいものを入れて、頭と首肩にこもる感じを逃がす食べ方に寄せます。",
    how_to:
      "昼〜夕方に、温かい飲み物・汁物・軽めの主食のどれかを選びます。食べすぎより“詰め込まない”ことを優先します。",
    avoid: "空腹のままカフェインを重ねる、甘いものだけで済ませようとする。",
    reason:
      "気圧変化が響く日は、胃腸の重さと首肩のこわばりが一緒に出ると体感が悪くなりやすいので、詰め込みすぎない選び方を優先します。",
    lifestyle_tip: "食後は首を一度起こし、耳まわりを軽く動かすと切り替えやすくなります。",
    examples: ["温かいお茶", "軽いスープ", "小さめのおにぎり＋汁物"],
  },
  pressure_up: {
    title: "今日は張りつめを増やさない食べ方",
    recommendation:
      "濃い味・辛いもの・カフェインでさらに押すより、温かく軽いものを入れて、力みを増やしすぎない食べ方に寄せます。",
    how_to:
      "昼〜夕方は、刺激を足すより“落ち着いて食べられる量”を優先します。温かい飲み物や汁物を一つ添えるだけで十分です。",
    avoid: "急いで食べる、濃い味・辛味・カフェインを重ねる。",
    reason:
      "張りつめやすい日は、刺激の重なりが夜のこわばりや気分の落ち着かなさに残りやすいので、刺激を重ねない食べ方にします。",
    lifestyle_tip: "食後にすぐ次の予定へ飛び込まず、息を吐く時間を少し作ると切り替えやすくなります。",
    examples: ["温かいお茶", "野菜スープ", "軽めの定食"],
  },
  default: {
    title: "今日は詰め込みすぎない食べ方",
    recommendation:
      "何かを大きく変えるより、温かいものを一つ足して、甘いもの・カフェイン・油っこさを重ねすぎない形にします。",
    how_to:
      "昼〜夕方に、温かい飲み物・汁物・軽めの主食のどれかを一つ選びます。空腹と食べすぎの差を大きくしないのが今日向きです。",
    avoid: "空腹のまま刺激物で粘る、食べすぎてすぐ座りっぱなしになる。",
    reason: "天気のぶれがある日は、食べ方の負担が体感に上乗せされやすいので、温かさと軽さを優先します。",
    lifestyle_tip: "食後に姿勢を一度起こし、呼吸を整える時間を少し作ります。",
    examples: ["温かいお茶", "軽い汁物", "小さめの主食"],
  },
};

const SYMPTOM_FOOD_RULES = {
  fatigue: {
    title: {
      default: "今日はだるさを増やさない食べ方",
      damp: "今日は重だるさを残さない食べ方",
      cold: "今日は動き出しを冷やさない食べ方",
      pressure_down: "今日は詰め込まず温かさを足す食べ方",
    },
    how_to: {
      default: "温かい汁物か軽めの主食を一つ足して、空腹のままカフェインや甘いもので粘らない形にします。",
      damp: "温かい汁物・香味・軽めの主食のどれかを足して、重だるさを増やしにくい食べ方にします。",
      cold: "温かい汁物かごはん系を足して、内側の冷えで動き出しが鈍くならないようにします。",
      heat: "水分と軽い塩気を少し足して、暑さで削られる感じを増やさないようにします。",
    },
    avoid: {
      default: "甘いものやカフェインだけで済ませようとする。",
      damp: "冷たい飲み物・甘いもの・揚げ物を同じ時間帯に重ねる。",
      heat: "暑さの上に辛味・アルコール・カフェインを重ねる。",
    },
    examples: {
      default: ["味噌汁＋小さめごはん", "卵スープ", "温かいお茶＋軽い主食"],
      damp: ["具だくさん味噌汁", "温かいお茶", "冷たい麺なら汁物を足す"],
      cold: ["雑炊", "味噌汁", "生姜を少し足したスープ"],
      heat: ["梅入りおにぎり", "野菜スープ", "常温の水分"],
    },
    reason: "だるさが気になる日は、食べ方の重さを減らすほど午後の消耗を上乗せしにくくなります。",
    lifestyle_tip: "食後すぐ座り込まず、立つ・歩く・換気のどれかを少しだけ入れます。",
  },
  sleep: {
    title: {
      default: "今夜は刺激と重さを残さない食べ方",
      cold: "今夜は冷えを残さない食べ方",
      heat: "今夜は熱をこもらせない食べ方",
      pressure_down: "今夜は首肩を重くしない食べ方",
    },
    how_to: {
      default: "夕方以降は、温かい飲み物や軽い汁物を足して、寝る前に胃が重く残らない量にします。",
      cold: "夕方〜夜に温かい汁物か飲み物を足して、足首・お腹を冷やす食べ方を避けます。",
      heat: "濃い味や辛味で押さず、水分と軽い汁気を入れて、熱を持ち越しにくい形にします。",
    },
    avoid: {
      default: "寝る直前の食べすぎ、アルコール、濃いカフェインを重ねる。",
      heat: "辛いもの・濃い味・アルコールを夜に重ねる。",
    },
    examples: {
      default: ["温かいお茶", "軽いスープ", "小さめの夕食"],
      cold: ["味噌汁", "卵スープ", "温かい白湯"],
      heat: ["野菜スープ", "豆腐入りの軽い汁物", "常温の水分"],
    },
    reason: "睡眠が気になる日は、夜に刺激や重さを残さないほど休む準備に入りやすくなります。",
    lifestyle_tip: "食後は画面を見ながら食べ続けず、首を起こす時間を少し作ります。",
  },
  neck_shoulder: {
    title: {
      default: "今日は首肩を詰まらせない食べ方",
      pressure_down: "今日は首肩にこもりを残さない食べ方",
      cold: "今日は首元と胃腸を冷やさない食べ方",
      dry: "今日は乾きで首肩を固めない食べ方",
    },
    how_to: {
      default: "温かい飲み物か汁物を足して、甘いもの・カフェインだけで済ませない形にします。",
      pressure_down: "軽い汁物や温かいお茶を足して、脂っこさやカフェインで首肩のこもりを増やさないようにします。",
      cold: "温かい汁物を足し、首元を冷やす飲食を続けないようにします。",
      dry: "温かい飲み物や汁気を足して、目・喉の乾きから首肩が固まる流れを減らします。",
    },
    avoid: {
      default: "空腹のままカフェインを重ねる、急いで食べてすぐ画面姿勢に戻る。",
      pressure_down: "脂っこいものや甘いものだけで済ませて、そのまま首を固める。",
    },
    examples: {
      default: ["温かいお茶", "味噌汁", "おにぎり＋汁物"],
      pressure_down: ["軽いスープ", "温かいお茶", "小さめのおにぎり"],
      dry: ["汁物", "温かいお茶", "みずみずしい果物を少量"],
    },
    reason: "首肩が気になる日は、食後の重さと画面姿勢が重なるとこわばりとして残りやすいためです。",
    lifestyle_tip: "食後に肩をすくめて落とし、首の後ろを一度長くします。",
  },
  low_back_pain: {
    title: {
      default: "今日は腰腹を冷やさない食べ方",
      damp: "今日は腰まわりを重くしない食べ方",
      cold: "今日は腰腹を内側から冷やさない食べ方",
      pressure_down: "今日は腰まわりに重さを残さない食べ方",
    },
    how_to: {
      default: "温かい汁物かごはん系を足して、腰腹まわりを冷やしすぎない形にします。",
      damp: "温かい汁物を足し、冷たい飲み物・甘いもの・揚げ物を重ねないようにします。",
      cold: "温かい汁物・ごはん系・火を通したものを一つ足して、内側を冷やさないようにします。",
      pressure_down: "軽い主食と汁物を選び、食べすぎで姿勢が崩れない量にします。",
    },
    avoid: {
      default: "冷たい飲み物や生ものだけで済ませる、食べすぎて座りっぱなしになる。",
      damp: "甘いもの・塩気・冷たい飲み物を重ねて下半身の重さを増やす。",
      cold: "冷たいサラダやアイスで済ませる。",
    },
    examples: {
      default: ["味噌汁＋ごはん", "雑炊", "温かいうどんを軽めに"],
      damp: ["具だくさん味噌汁", "温かいお茶", "軽めの定食"],
      cold: ["雑炊", "生姜入りスープ", "味噌汁＋ごはん"],
    },
    reason: "腰が気になる日は、冷えや食後の重さが腰腹・骨盤まわりのこわばりに残りやすいので、冷やさず重くしすぎない食べ方にします。",
    lifestyle_tip: "食後は深く座り込む前に、骨盤まわりを小さく動かします。",
  },
  swelling: {
    title: {
      default: "今日はむくみを増やさない食べ方",
      damp: "今日は甘さ・冷たさ・塩気を重ねない食べ方",
      heat: "今日は水分を小分けに足す食べ方",
      cold: "今日は足元を冷やさない食べ方",
    },
    how_to: {
      default: "温かい飲み物や汁物を足しつつ、塩気・甘さ・冷たい飲み物を重ねすぎない形にします。",
      damp: "冷たい飲み物・甘いもの・塩気を重ねすぎず、温かいお茶や汁物を一つ足します。",
      heat: "水分を一気に入れるより小分けにして、濃い味を重ねすぎないようにします。",
      cold: "温かい飲み物や汁物を足して、足元が冷える食べ方を避けます。",
    },
    avoid: {
      default: "塩気の強いもの、甘い飲み物、冷たい飲み物を同じ時間帯に重ねる。",
      damp: "冷たいカフェラテ・甘いもの・しょっぱい間食を続ける。",
    },
    examples: {
      default: ["温かいお茶", "味噌汁", "軽めの定食"],
      damp: ["温かいお茶", "野菜スープ", "甘い飲み物を無糖に替える"],
      heat: ["常温の水分", "具のあるスープ", "濃すぎない味付け"],
    },
    reason: "むくみが気になる日は、余分な甘さ・塩気・冷たさを重ねない方が重さを残しにくくなります。",
    lifestyle_tip: "食後に足首を小さく回し、同じ姿勢を一度切ります。",
  },
  headache: {
    title: {
      default: "今日は頭をこもらせない食べ方",
      pressure_down: "今日はお酒・脂っこさ・カフェインを重ねない食べ方",
      damp: "今日は頭の重さを増やさない食べ方",
      cold: "今日は首元を冷やさない食べ方",
      dry: "今日は目と喉に汁気を足す食べ方",
    },
    how_to: {
      default: "温かい飲み物か軽い汁物を足して、空腹のままカフェインや甘いものだけで済ませない形にします。",
      pressure_down: "軽い汁物や温かいお茶を足し、脂っこいもの・アルコール・カフェインを重ねてこもらせないようにします。",
      damp: "温かい汁物を足し、冷たいもの・甘いもの・油っこいものを重ねないようにします。",
      cold: "温かい汁物を足して、首元や胃腸を冷やす食べ方を避けます。",
      dry: "温かい飲み物や汁気を足して、目と喉の乾きが頭の重さに重ならないようにします。",
    },
    avoid: {
      default: "空腹のままカフェインを重ねる、脂っこいものやアルコールを重ねる。",
      pressure_down: "脂っこいもの・アルコール・カフェインを重ねて、頭や首肩のこもりを増やす。",
    },
    examples: {
      default: ["温かいお茶", "軽いスープ", "小さめのおにぎり＋汁物"],
      pressure_down: ["温かいお茶", "具の少ないスープ", "小さめのおにぎり"],
      dry: ["汁物", "温かいお茶", "みずみずしい果物を少量"],
    },
    reason: "頭痛が気になる日は、空腹・刺激・食後の重さが首肩や耳まわりのこもりに重なりやすいので、空腹・刺激・重さを増やしすぎない食べ方にします。",
    lifestyle_tip: "食後は首を起こし、耳まわりを軽くゆるめてから画面に戻ります。",
  },
  dizziness: {
    title: {
      default: "今日はふわつきを増やさない食べ方",
      pressure_down: "今日は空腹と詰め込みを避ける食べ方",
      heat: "今日は水分を小分けに足す食べ方",
      cold: "今日は足元と胃腸を冷やさない食べ方",
    },
    how_to: {
      default: "食事を抜いて急に動くより、軽い主食や温かい飲み物を入れて、空腹と食べすぎの差を小さくします。",
      pressure_down: "軽い主食や汁物を選び、空腹のままカフェインで動く流れを避けます。",
      heat: "水分を小分けに入れ、濃い味やアルコールで負担を増やさないようにします。",
      cold: "温かい飲み物や汁物を足して、足元や胃腸を冷やしすぎないようにします。",
    },
    avoid: {
      default: "食事を抜いて急に動く、冷たい飲み物を一気に入れる。",
      heat: "暑い中で水分を後回しにする、アルコールや濃い味を重ねる。",
    },
    examples: {
      default: ["小さめのおにぎり", "温かいお茶", "軽いスープ"],
      heat: ["常温の水分", "梅入りおにぎり", "野菜スープ"],
      cold: ["雑炊", "味噌汁", "温かい白湯"],
    },
    reason: "めまいが気になる日は、空腹・冷え・急な詰め込みを避ける方が動き出しを安定させやすくなります。",
    lifestyle_tip: "食後や立ち上がりの前に、一呼吸置いて首を急に振らないようにします。",
  },
  mood: {
    title: {
      default: "今日は気分を揺らしすぎない食べ方",
      pressure_down: "今日は甘さとカフェインに頼りすぎない食べ方",
      heat: "今日は辛味・濃い味・カフェインを足しすぎない食べ方",
      cold: "今日は温かさで縮こまりを減らす食べ方",
    },
    how_to: {
      default: "温かい飲み物・汁物・軽い主食のどれかを足して、甘いものやカフェインだけで気分を持ち上げようとしない形にします。",
      pressure_down: "軽い主食や汁物を足し、甘いもの・カフェインだけでぼんやり感を済ませないようにします。",
      heat: "辛味・濃い味・カフェインを重ねず、軽い汁気や常温の水分を足します。",
      cold: "温かい汁物や飲み物を足して、体の縮こまりを少しゆるめる方向にします。",
    },
    avoid: {
      default: "甘いものとカフェインだけで済ませようとする。",
      heat: "イライラの上に辛味・濃い味・カフェインを重ねる。",
    },
    examples: {
      default: ["温かいお茶", "おにぎり＋味噌汁", "軽いスープ"],
      heat: ["野菜スープ", "常温の水分", "濃すぎない定食"],
      cold: ["味噌汁", "雑炊", "生姜を少し足した飲み物"],
    },
    reason: "気分が揺れやすい日は、刺激で一気に上げるより、血糖や胃腸の負担を大きく揺らさない方が合います。",
    lifestyle_tip: "食後に通知を見る前に、息を長めに吐く時間を少し作ります。",
  },
};

function pickByTrigger(value, triggerKey) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value[triggerKey] || value.default || null;
}


function pickListByTrigger(value, triggerKey) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value[triggerKey] || value.default || [];
}

function mergeActionItems(primary, fallback, limit = 3) {
  return Array.from(new Set([...(primary || []), ...(fallback || [])].filter(Boolean))).slice(0, limit);
}

function getSignalFoodContext(signal) {
  const level = Number(signal ?? 0);
  if (level >= 2) return { ...SIGNAL_FOOD_CONTEXT.high, intensity: "high" };
  if (level >= 1) return { ...SIGNAL_FOOD_CONTEXT.middle, intensity: "middle" };
  return { ...SIGNAL_FOOD_CONTEXT.low, intensity: "low" };
}

function buildFoodContextChips({ triggerKey, signalContext, symptomFocus }) {
  return [
    TRIGGER_LABELS[triggerKey] || TRIGGER_LABELS.default,
    signalContext?.label,
    symptomFocus ? `${SYMPTOM_LABELS[symptomFocus] || symptomFocus}に合わせる` : null,
  ].filter(Boolean);
}


function formatCautionBody(text) {
  if (!text) return null;
  const trimmed = String(text).replace(/[。.]$/, "");
  if (trimmed.includes("重ねすぎない") || trimmed.includes("避け")) return `${trimmed}。`;
  if (trimmed.endsWith("重ねる")) {
    return `${trimmed.replace(/を?重ねる$/, "")}を重ねすぎないようにします。`;
  }
  if (trimmed.endsWith("続ける")) return `${trimmed.replace(/続ける$/, "続けすぎないようにします")}。`;
  if (trimmed.endsWith("で済ませる")) return `${trimmed.replace(/で済ませる$/, "だけで済ませないようにします")}。`;
  if (trimmed.endsWith("済ませる")) return `${trimmed.replace(/済ませる$/, "で済ませすぎないようにします")}。`;
  if (trimmed.endsWith("増やす")) return `${trimmed.replace(/増やす$/, "増やしすぎないようにします")}。`;
  if (trimmed.endsWith("押す")) return `${trimmed.replace(/押す$/, "頼りすぎないようにします")}。`;
  return `${trimmed}流れに注意します。`;
}

function buildActionCards({ howTo, avoid, examples, addItems, cautionItems, signalContext }) {
  return [
    {
      key: "add",
      label: TODAY_FOOD_LABELS.how_to_label,
      body: howTo,
      items: addItems,
    },
    {
      key: "caution",
      label: TODAY_FOOD_LABELS.avoid_label,
      body: formatCautionBody(avoid),
      items: cautionItems,
    },
    {
      key: "choice",
      label: TODAY_FOOD_LABELS.examples_label,
      body: signalContext?.choiceBody || null,
      items: examples,
    },
  ].filter((card) => card.body || (card.items || []).length > 0);
}

function mergeExamples(primary, fallback) {
  return Array.from(new Set([...(primary || []), ...(fallback || [])].filter(Boolean))).slice(0, 3);
}

function buildSymptomFoodOverride(triggerKey, symptomFocus) {
  const rule = SYMPTOM_FOOD_RULES[symptomFocus];
  if (!rule) return null;

  return {
    title: pickByTrigger(rule.title, triggerKey),
    how_to: pickByTrigger(rule.how_to, triggerKey),
    avoid: pickByTrigger(rule.avoid, triggerKey),
    examples: pickByTrigger(rule.examples, triggerKey),
    reason: rule.reason || null,
    lifestyle_tip: rule.lifestyle_tip || null,
  };
}

export function buildTodayFoodContext(triggerKey, signal, symptomFocus = null) {
  const key = normalizeTriggerKey(triggerKey);
  const base = TRIGGER_FOOD_RULES[key] || TRIGGER_FOOD_RULES.default;
  const symptomOverride = buildSymptomFoodOverride(key, symptomFocus);
  const hasSymptomOverride = !!symptomOverride;
  const signalContext = getSignalFoodContext(signal);
  const triggerItems = TRIGGER_FOOD_ITEMS[key] || TRIGGER_FOOD_ITEMS.default;
  const symptomItems = SYMPTOM_FOOD_ITEMS[symptomFocus] || null;

  const title = symptomOverride?.title || base.title;
  const howTo = symptomOverride?.how_to || base.how_to;
  const avoid = symptomOverride?.avoid || base.avoid;
  const examples = mergeExamples(symptomOverride?.examples, base.examples);
  const addItems = mergeActionItems(
    pickListByTrigger(symptomItems?.add, key),
    triggerItems.add,
  );
  const cautionItems = mergeActionItems(
    pickListByTrigger(symptomItems?.caution, key),
    triggerItems.caution,
  );
  const reason = symptomOverride?.reason
    ? `${base.reason} ${symptomOverride.reason}`
    : base.reason;
  const lifestyleTip = symptomOverride?.lifestyle_tip || base.lifestyle_tip;

  const baseRecommendation = hasSymptomOverride ? howTo : base.recommendation;
  const recommendation = `${signalContext.lead} ${baseRecommendation}`;
  const actionCards = buildActionCards({
    howTo,
    avoid,
    examples,
    addItems,
    cautionItems,
    signalContext,
  });

  return {
    ...TODAY_FOOD_LABELS,
    title,
    recommendation,
    how_to: howTo,
    avoid,
    reason,
    lifestyle_tip: lifestyleTip,
    examples,
    add_items: addItems,
    caution_items: cautionItems,
    action_cards: actionCards,
    context_chips: buildFoodContextChips({
      triggerKey: key,
      signalContext,
      symptomFocus,
    }),
    symptom_focus: symptomFocus || null,
    trigger_key: key,
    intensity: signalContext.intensity,
  };
}

