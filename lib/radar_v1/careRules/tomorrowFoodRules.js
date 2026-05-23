// lib/radar_v1/careRules/tomorrowFoodRules.js

const TOMORROW_FOOD_LABELS = {
  badge: "明日の食べ方",
  detail_title: "なぜこの準備？",
  how_to_label: "明日に向けて足す",
  avoid_label: "今夜〜明朝の重ねすぎ注意",
  examples_label: "明日の朝・昼に迷ったら",
  reason_label: "ひとこと理由",
  lifestyle_tip_label: "今夜一緒に",
};

const TRIGGER_LABELS = {
  damp: "湿気",
  cold: "冷え込み",
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

const TOMORROW_SIGNAL_CONTEXT = {
  low: {
    label: "影響少なめ",
    lead: "明日の天気の影響は少なめ。今夜〜明朝は、重ね方を軽く整えるくらいで十分です。",
    choiceBody: "迷ったら、朝か昼に温かい汁物と軽めの主食を足すくらいで大丈夫です。",
  },
  middle: {
    label: "少し響きやすい",
    lead: "明日は少し響きやすい見込み。今夜から、足すものと重ねすぎを一つずつ決めておきたい日です。",
    choiceBody: "迷ったら、朝は温かい汁物、昼は詰め込みすぎない主食量に寄せます。",
  },
  high: {
    label: "強めに響きやすい",
    lead: "明日は食べ方の上乗せが体感に出やすい見込み。今夜の重さを残さず、明朝の選び方も軽めにします。",
    choiceBody: "迷ったら、刺激や量で押さず、温かい汁物＋小さめ主食を優先します。",
  },
};

const TRIGGER_FOOD_ITEMS = {
  damp: {
    add: ["温かい汁物", "軽めの主食", "香味を少し"],
    caution: ["冷たい飲み物＋甘いもの", "塩気＋冷たい飲み物", "パン・麺＋甘いカフェラテ"],
    examples: ["味噌汁＋おにぎり", "雑炊", "温かいお茶＋軽めの定食"],
  },
  cold: {
    add: ["温かい汁物", "ごはん系", "生姜・ねぎを少し"],
    caution: ["冷たい飲み物＋空腹", "冷たい乳製品＋夜", "生もの中心＋薄着"],
    examples: ["味噌汁＋ごはん", "卵スープ", "雑炊"],
  },
  heat: {
    add: ["常温の水分", "軽い汁気", "濃すぎない味"],
    caution: ["お酒＋辛味・濃い味", "カフェイン＋夜更かし", "甘いドリンク＋暑さ"],
    examples: ["野菜スープ", "豆腐入り汁物", "梅入りおにぎり"],
  },
  dry: {
    add: ["温かいお茶", "汁物", "みずみずしいもの少量"],
    caution: ["コーヒーだけ＋空腹", "乾いた菓子＋水分不足", "お酒＋夜更かし"],
    examples: ["温かいお茶", "卵スープ", "果物を少量"],
  },
  pressure_down: {
    add: ["温かいお茶", "軽いスープ", "小さめ主食"],
    caution: ["お酒＋脂っこいもの", "カフェイン＋甘いもの", "揚げ物＋食べすぎ"],
    examples: ["具だくさん味噌汁", "小さめおにぎり＋スープ", "温かいお茶"],
  },
  pressure_up: {
    add: ["温かい飲み物", "野菜スープ", "軽めの定食"],
    caution: ["辛味＋カフェイン", "濃い味＋早食い", "お酒＋予定詰め込み"],
    examples: ["野菜スープ", "温かいお茶", "香味控えめの定食"],
  },
  default: {
    add: ["温かい飲み物", "軽い汁物", "小さめ主食"],
    caution: ["甘いもの＋カフェイン", "お酒＋脂っこいもの", "食べすぎ＋座りっぱなし"],
    examples: ["味噌汁＋おにぎり", "軽いスープ", "温かいお茶"],
  },
};

const TRIGGER_FOOD_RULES = {
  damp: {
    title: "明日は重さを残さない朝にする",
    recommendation:
      "今夜の冷たさ・甘さ・塩気を重ねすぎず、明日は温かい汁物や軽めの主食から始めます。",
    how_to:
      "今夜か明日の朝に、温かい汁物・お茶・軽めの主食を一つ足します。水分を増やすより、冷たさと甘さを重ねない方を優先します。",
    avoid:
      "冷たい飲み物、甘いもの、塩気の強いものを夜から朝にかけて重ねる。",
    reason:
      "湿気が響く日は、前夜の冷たさ・甘さ・塩気が翌朝の重さに残りやすいためです。",
    lifestyle_tip: "今夜は食後すぐ座りっぱなしにせず、数分だけ立つか歩く時間を作ります。",
  },
  cold: {
    title: "今夜から冷やさず明朝に備える",
    recommendation:
      "冷たいものだけで済ませず、今夜〜明朝に温かい汁物やごはん系を一つ足して、内側を冷やしすぎない形にします。",
    how_to:
      "夕食か明日の朝に、味噌汁・卵スープ・温かいごはん系のどれかを足します。量より温度を整える方が明日向きです。",
    avoid:
      "冷たい飲み物、冷たい乳製品、生もの中心の食事を夜から朝に続ける。",
    reason:
      "冷え込みがある日は、前夜からの冷たさが明朝のこわばりや重さに残りやすいためです。",
    lifestyle_tip: "今夜は食後に足首・お腹・首元を冷やしたままにしないようにします。",
  },
  heat: {
    title: "明日は熱をこもらせない軽さへ",
    recommendation:
      "辛味・濃い味・お酒で押し切らず、常温の水分や軽い汁気を入れて、明日に熱っぽさを持ち越しにくくします。",
    how_to:
      "今夜は濃い味を重ねすぎず、明日の朝か昼に軽い汁気と常温の水分を入れます。冷たいものの一気飲みより、小分けが合います。",
    avoid:
      "お酒、辛味、濃い味、カフェインを夜に重ねる。",
    reason:
      "暑さが響く日は、夜の刺激が明日のほてり・だるさ・眠りの浅さに残りやすいためです。",
    lifestyle_tip: "今夜は食後すぐ動き切らず、汗や熱が少し引く時間を作ります。",
  },
  dry: {
    title: "明日に向けて汁気とうるおいを足す",
    recommendation:
      "乾いた間食やコーヒーだけでつなぐより、温かい飲み物や汁物を少し足して、喉・目・頭の乾きを残しにくくします。",
    how_to:
      "今夜〜明日の朝に、温かいお茶・汁物・みずみずしいもの少量のどれかを足します。一気飲みより、小分けに入れる方が合います。",
    avoid:
      "空腹のままコーヒーだけで粘る、乾いた菓子、アルコールを夜に重ねる。",
    reason:
      "乾燥が響く日は、前夜の水分不足や乾いた食べ方が翌日の喉・目・頭の重さに残りやすいためです。",
    lifestyle_tip: "今夜は寝る前の喉の乾きと、部屋の乾燥も一緒に見ます。",
  },
  pressure_down: {
    title: "明日は詰め込みすぎない食べ方へ",
    recommendation:
      "空腹を引っぱりすぎず、食べすぎでも押さず、温かい飲み物・軽いスープ・小さめ主食で明日のこもりを増やしにくくします。",
    how_to:
      "今夜の食べすぎを避けつつ、明日の朝か昼に温かい汁物と小さめ主食を入れます。空腹と食べすぎの差を大きくしないのが明日向きです。",
    avoid:
      "お酒、脂っこいもの、甘いもの、カフェインで明日の山場を押し切ろうとする。",
    reason:
      "気圧低下が響く日は、胃腸の重さと首肩・頭のこもりが重なると体感が落ちやすいためです。",
    lifestyle_tip: "今夜は食後に首を起こし、耳まわりを軽く動かしてから休みます。",
  },
  pressure_up: {
    title: "明日は力ませない軽さへ",
    recommendation:
      "濃い味・辛味・カフェインでさらに押さず、温かい飲み物や軽い汁物を足して、明日に張りつめを残しにくくします。",
    how_to:
      "今夜〜明日の朝は、刺激を足すより落ち着いて食べられる量を優先します。温かい飲み物か汁物を一つ添える形が合います。",
    avoid:
      "辛味、濃い味、カフェイン、早食いを夜から朝に重ねる。",
    reason:
      "気圧上昇が響く日は、刺激の重なりがこわばりや気分の張りつめに残りやすいためです。",
    lifestyle_tip: "今夜は次の予定や通知に移る前に、息を長めに吐く時間を少し作ります。",
  },
  default: {
    title: "明日は重ね方を軽くして備える",
    recommendation:
      "何かを大きく変えるより、今夜〜明朝の温かさ・量・刺激の重ね方を軽く整えます。",
    how_to:
      "温かい飲み物・軽い汁物・小さめ主食のどれかを一つ足します。空腹と食べすぎの差を大きくしない形が明日向きです。",
    avoid:
      "甘いもの、カフェイン、お酒、脂っこいものを同じ時間帯に重ねる。",
    reason:
      "天気のぶれがある日は、前夜からの食べ方が翌日の体感に上乗せされやすいためです。",
    lifestyle_tip: "今夜は食後に姿勢を一度起こし、呼吸を整える時間を少し作ります。",
  },
};

const SYMPTOM_FOOD_ITEMS = {
  fatigue: {
    add: {
      default: ["味噌汁", "軽めの主食", "卵・豆腐系"],
      damp: ["具だくさん味噌汁", "温かいお茶", "軽めのごはん"],
      cold: ["雑炊", "味噌汁", "温かいごはん系"],
      pressure_down: ["具だくさんスープ", "小さめおにぎり", "温かいお茶"],
    },
    caution: {
      default: ["甘いもの＋カフェイン", "食事抜き＋刺激物", "プロテイン＋甘味"],
      damp: ["冷たい飲み物＋甘いもの", "パン・麺＋カフェラテ", "揚げ物＋甘味"],
    },
    examples: {
      default: ["味噌汁＋小さめごはん", "卵スープ", "温かいお茶＋軽い主食"],
      damp: ["具だくさん味噌汁", "雑炊", "温かいお茶"],
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
    examples: {
      default: ["温かいお茶", "軽いスープ", "小さめの夕食"],
      cold: ["味噌汁", "卵スープ", "温かい白湯"],
    },
  },
  neck_shoulder: {
    add: {
      default: ["温かいお茶", "味噌汁", "おにぎり＋汁物"],
      pressure_down: ["軽いスープ", "温かいお茶", "小さめ主食"],
      cold: ["味噌汁", "温かいお茶", "生姜を少し"],
      dry: ["汁物", "温かいお茶", "果物少量"],
    },
    caution: {
      default: ["カフェイン＋空腹", "甘いもの＋画面姿勢", "脂っこいもの＋座りっぱなし"],
      pressure_down: ["お酒＋脂っこいもの", "カフェイン＋甘いもの", "揚げ物＋首肩のこわばり"],
    },
    examples: {
      default: ["温かいお茶", "味噌汁", "おにぎり＋汁物"],
      pressure_down: ["軽いスープ", "小さめおにぎり", "温かいお茶"],
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
    examples: {
      default: ["味噌汁＋ごはん", "雑炊", "温かいうどんを軽めに"],
      cold: ["雑炊", "生姜入りスープ", "味噌汁＋ごはん"],
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
    examples: {
      default: ["温かいお茶", "味噌汁", "軽めの定食"],
      damp: ["温かいお茶", "野菜スープ", "甘い飲み物を無糖に替える"],
    },
  },
  headache: {
    add: {
      default: ["温かいお茶", "軽いスープ", "小さめ主食"],
      pressure_down: ["温かいお茶", "具の少ないスープ", "小さめおにぎり"],
      cold: ["味噌汁", "温かいお茶", "生姜を少し"],
      dry: ["汁物", "温かいお茶", "果物少量"],
    },
    caution: {
      default: ["お酒＋脂っこいもの", "カフェイン＋空腹", "甘いもの＋画面姿勢"],
      pressure_down: ["お酒＋脂っこいもの", "カフェイン＋甘いもの", "揚げ物＋食べすぎ"],
      damp: ["冷たいもの＋甘いもの", "パン・麺＋カフェラテ", "油っこさ＋眠気"],
    },
    examples: {
      default: ["温かいお茶", "軽いスープ", "小さめのおにぎり＋汁物"],
      pressure_down: ["温かいお茶", "具の少ないスープ", "小さめのおにぎり"],
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
    examples: {
      default: ["小さめのおにぎり", "温かいお茶", "軽いスープ"],
      heat: ["常温の水分", "梅入りおにぎり", "野菜スープ"],
    },
  },
  mood: {
    add: {
      default: ["温かいお茶", "おにぎり＋味噌汁", "軽いスープ"],
      pressure_down: ["軽い主食", "温かい汁物", "温かいお茶"],
      heat: ["野菜スープ", "常温の水分", "濃すぎない定食"],
      cold: ["味噌汁", "雑炊", "生姜を少し"],
    },
    caution: {
      default: ["甘いもの＋カフェイン", "お酒＋夜更かし", "食事抜き＋刺激物"],
      heat: ["辛味＋カフェイン", "お酒＋濃い味", "甘いドリンク＋暑さ"],
      pressure_down: ["甘いもの＋カフェイン", "パン・麺＋甘いラテ", "食事抜き＋眠気"],
    },
    examples: {
      default: ["温かいお茶", "おにぎり＋味噌汁", "軽いスープ"],
      pressure_down: ["おにぎり＋味噌汁", "具だくさんスープ", "温かいお茶"],
    },
  },
};

const SYMPTOM_FOOD_RULES = {
  fatigue: {
    title: {
      default: "明日はだるさを残さない食べ方へ",
      damp: "湿気×だるさは、前夜の重さを残さない",
      cold: "冷え×だるさは、明朝に温かさを足す",
      pressure_down: "低気圧×だるさは、詰め込まずに備える",
    },
    how_to: {
      default: "今夜〜明日の朝に温かい汁物か軽めの主食を足して、空腹のまま甘いものやカフェインで粘らない形にします。",
      damp: "今夜の冷たさ・甘さ・揚げ物を重ねすぎず、明日の朝は温かい汁物か軽めの主食を足します。",
      cold: "今夜か明日の朝に温かい汁物かごはん系を足して、冷えで動き出しが鈍くならないようにします。",
    },
    avoid: {
      default: "甘いものやカフェインだけで夜〜朝をつなぐ。",
      damp: "冷たい飲み物・甘いもの・揚げ物を夜から朝に重ねる。",
    },
    reason: "だるさが気になる日は、前夜の重さを残さないほど明日の動き出しが軽くなりやすいためです。",
    lifestyle_tip: "今夜は食後すぐ座り込まず、一度だけ立つか歩く時間を作ります。",
  },
  sleep: {
    title: {
      default: "明日の睡眠に残さない夜の食べ方へ",
      cold: "冷え×睡眠は、寝る前に冷やさない",
      heat: "暑さ×睡眠は、夜の刺激を残さない",
      pressure_down: "低気圧×睡眠は、首肩を重くしない夜へ",
    },
    how_to: {
      default: "夕方以降は温かい飲み物や軽い汁物を足し、寝る前に胃が重く残らない量にします。",
      cold: "夕方〜夜に温かい汁物か飲み物を足して、足首・お腹を冷やす食べ方を避けます。",
      heat: "辛味・濃い味・お酒を夜に重ねず、常温の水分や軽い汁気で熱を持ち越しにくくします。",
    },
    avoid: {
      default: "寝る直前の食べすぎ、アルコール、濃いカフェインを重ねる。",
      heat: "辛いもの・濃い味・アルコールを夜に重ねる。",
    },
    reason: "睡眠が気になる日は、夜に刺激や重さを残さないほど休む準備に入りやすくなるためです。",
    lifestyle_tip: "今夜は食後に画面を見ながら食べ続けず、首を起こす時間を少し作ります。",
  },
  neck_shoulder: {
    title: {
      default: "明日は首肩をこもらせない食べ方へ",
      pressure_down: "低気圧×首肩は、明日にこもりを残さない",
      cold: "冷え×首肩は、今夜から首元と内側を冷やさない",
      dry: "乾燥×首肩は、明日に汁気を残す",
    },
    how_to: {
      default: "今夜〜明日の朝に温かい飲み物か汁物を足して、甘いもの・カフェインだけで山場を押し切らない形にします。",
      pressure_down: "軽い汁物や温かいお茶を足して、お酒・脂っこさ・カフェインで首肩のこもりを増やさないようにします。",
      cold: "今夜から温かい汁物を足し、首元を冷やす飲食を続けないようにします。",
    },
    avoid: {
      default: "空腹のままカフェインを重ねる、急いで食べてすぐ画面姿勢に戻る。",
      pressure_down: "お酒や脂っこいもので押し切って、そのまま首肩を固める。",
    },
    reason: "首肩が気になる日は、前夜の食後の重さと画面姿勢が重なると、翌日のこわばりとして残りやすいためです。",
    lifestyle_tip: "今夜は食後に肩をすくめて落とし、首の後ろを一度長くします。",
  },
  low_back_pain: {
    title: {
      default: "明日は腰腹を冷やさない食べ方へ",
      damp: "湿気×腰は、下半身に重さを残さない",
      cold: "冷え×腰は、今夜から温かい汁物・ごはん系へ",
      pressure_down: "低気圧×腰は、明日に重さを残さない",
    },
    how_to: {
      default: "今夜〜明日の朝に温かい汁物かごはん系を足して、腰腹まわりを冷やしすぎない形にします。",
      damp: "温かい汁物を足し、冷たい飲み物・甘いもの・揚げ物を夜から朝に重ねないようにします。",
      cold: "温かい汁物・ごはん系・火を通したものを一つ足して、内側を冷やさないようにします。",
    },
    avoid: {
      default: "冷たい飲み物や生ものだけで済ませる、食べすぎて座りっぱなしになる。",
      cold: "冷たいサラダ・アイス・冷たい乳製品を夜に重ねる。",
    },
    reason: "腰が気になる日は、冷えや食後の重さが翌日の腰腹・骨盤まわりのこわばりに残りやすいためです。",
    lifestyle_tip: "今夜は食後に深く座り込む前に、骨盤まわりを小さく動かします。",
  },
  swelling: {
    title: {
      default: "明日はむくみを増やさない食べ方へ",
      damp: "湿気×むくみは、今夜の甘さ・冷たさ・塩気を重ねない",
      heat: "暑さ×むくみは、水分を小分けに備える",
      cold: "冷え×むくみは、足元を冷やさない温かさへ",
    },
    how_to: {
      default: "温かい飲み物や汁物を足しつつ、塩気・甘さ・冷たい飲み物を夜から朝に重ねすぎない形にします。",
      damp: "冷たい飲み物・甘いもの・塩気を重ねすぎず、温かいお茶や汁物を一つ足します。",
      heat: "水分を一気に入れるより小分けにして、濃い味を重ねすぎないようにします。",
    },
    avoid: {
      default: "塩気の強いもの、甘い飲み物、冷たい飲み物を同じ時間帯に重ねる。",
      damp: "冷たいカフェラテ・甘いもの・しょっぱい間食を夜から朝に続ける。",
    },
    reason: "むくみが気になる日は、前夜の甘さ・塩気・冷たさを重ねない方が、翌日の重さを残しにくいためです。",
    lifestyle_tip: "今夜は食後に足首を小さく回し、同じ姿勢を一度切ります。",
  },
  headache: {
    title: {
      default: "明日は頭をこもらせない食べ方へ",
      pressure_down: "低気圧×頭痛は、お酒と脂っこさを重ねない",
      damp: "湿気×頭痛は、明日に重さを残さない",
      cold: "冷え×頭痛は、今夜から首元を冷やさない",
      dry: "乾燥×頭痛は、目と喉に汁気を残す",
    },
    how_to: {
      default: "今夜〜明日の朝に温かい飲み物か軽い汁物を足して、空腹のままカフェインや甘いもので押し切らない形にします。",
      pressure_down: "軽い汁物や温かいお茶を足し、脂っこいもの・アルコール・カフェインを重ねてこもらせないようにします。",
      damp: "温かい汁物を足し、冷たいもの・甘いもの・油っこいものを夜から朝に重ねないようにします。",
      cold: "温かい汁物を足して、首元や胃腸を冷やす食べ方を避けます。",
    },
    avoid: {
      default: "空腹のままカフェインを重ねる、脂っこいものやアルコールで押す。",
      pressure_down: "脂っこいもの・アルコール・カフェインを重ねて、頭や首肩のこもりを増やす。",
    },
    reason: "頭痛が気になる日は、空腹・画面刺激・食後の重さが首肩や耳まわりのこもりに重なりやすいためです。",
    lifestyle_tip: "今夜は食後に首を起こし、耳まわりを軽くゆるめてから画面に戻ります。",
  },
  dizziness: {
    title: {
      default: "明日はふわつきを増やさない食べ方へ",
      pressure_down: "低気圧×めまいは、空腹と詰め込みを避ける",
      heat: "暑さ×めまいは、水分を小分けに備える",
      cold: "冷え×めまいは、足元まで冷やさない温かさへ",
    },
    how_to: {
      default: "明日の朝に食事を抜いて急に動くより、軽い主食や温かい飲み物を入れて、空腹と食べすぎの差を小さくします。",
      pressure_down: "軽い主食や汁物を選び、空腹のままカフェインで動く流れを避けます。",
      heat: "水分を小分けに入れ、濃い味やアルコールで負担を増やさないようにします。",
    },
    avoid: {
      default: "食事を抜いて急に動く、冷たい飲み物を一気に入れる。",
      heat: "暑い中で水分を後回しにする、アルコールや濃い味を重ねる。",
    },
    reason: "めまいが気になる日は、空腹・冷え・急な詰め込みを避ける方が、翌日の動き出しを安定させやすいためです。",
    lifestyle_tip: "今夜〜明朝は立ち上がりの前に一呼吸置き、首を急に振らないようにします。",
  },
  mood: {
    title: {
      default: "明日は気分を揺らしすぎない食べ方へ",
      pressure_down: "低気圧×気分は、甘さとカフェインで押し切らない",
      heat: "暑さ×気分は、夜の刺激を足しすぎない",
      cold: "冷え×気分は、温かさで縮こまりを減らす",
    },
    how_to: {
      default: "今夜〜明日の朝に温かい飲み物・汁物・軽い主食のどれかを足して、甘いものやカフェインだけで持ち上げない形にします。",
      pressure_down: "軽い主食や汁物を足し、甘いもの・カフェインだけでぼんやり感を押し切らないようにします。",
      heat: "辛味・濃い味・カフェインを重ねず、軽い汁気や常温の水分を足します。",
    },
    avoid: {
      default: "甘いものとカフェインだけで夜〜朝をつなぐ。",
      heat: "辛味・濃い味・カフェインを夜に重ねる。",
    },
    reason: "気分が揺れやすい日は、刺激で一気に上げるより、血糖や胃腸の負担を大きく揺らさない方が合うためです。",
    lifestyle_tip: "今夜は食後に通知を見る前に、息を長めに吐く時間を少し作ります。",
  },
};

function normalizeTriggerKeyFromRiskContext(riskContext) {
  const exact = riskContext?.summary?.main_trigger_exact;
  if (exact) return exact;

  const main = riskContext?.summary?.main_trigger;
  const dir = riskContext?.summary?.trigger_dir;
  if (main === "humidity" && dir === "up") return "damp";
  if (main === "humidity" && dir === "down") return "dry";
  if (main === "temp" && dir === "down") return "cold";
  if (main === "temp" && dir === "up") return "heat";
  if (main === "pressure" && dir === "down") return "pressure_down";
  if (main === "pressure" && dir === "up") return "pressure_up";
  return "default";
}

function getSecondaryExact(riskContext) {
  const primary = riskContext?.summary?.main_trigger_exact || null;
  const secondary = riskContext?.summary?.secondary_trigger_exact || null;
  if (!secondary || secondary === primary) return null;
  return secondary;
}

function getSignalFoodContext(signal) {
  const level = Number(signal ?? 0);
  if (level >= 2) return { ...TOMORROW_SIGNAL_CONTEXT.high, intensity: "high" };
  if (level >= 1) return { ...TOMORROW_SIGNAL_CONTEXT.middle, intensity: "middle" };
  return { ...TOMORROW_SIGNAL_CONTEXT.low, intensity: "low" };
}

function parseHour(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h] = hhmm.split(":");
  const n = Number(h);
  return Number.isFinite(n) ? n : null;
}

function getTimingLabel(peakStart) {
  if (peakStart == null) return "今夜〜明朝";
  if (peakStart >= 5 && peakStart <= 10) return "明日の朝";
  if (peakStart >= 11 && peakStart <= 15) return "明日の昼";
  if (peakStart >= 16 && peakStart <= 23) return "明日の夕方以降";
  return "今夜〜明朝";
}

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

function mergeItems(primary, fallback, limit = 3) {
  return Array.from(new Set([...(primary || []), ...(fallback || [])].filter(Boolean))).slice(0, limit);
}

function formatCautionBody(text) {
  if (!text) return null;
  const trimmed = String(text).replace(/[。.]$/, "");
  if (trimmed.includes("重ねすぎ") || trimmed.includes("避け")) return `${trimmed}。`;
  if (trimmed.endsWith("重ねる")) return `${trimmed.replace(/を?重ねる$/, "")}を重ねすぎないようにします。`;
  if (trimmed.endsWith("続ける")) return `${trimmed.replace(/続ける$/, "続けすぎないようにします")}。`;
  if (trimmed.endsWith("押す")) return `${trimmed.replace(/押す$/, "押し切りすぎないようにします")}。`;
  return `${trimmed}流れに注意します。`;
}

function buildFoodContextChips({ triggerKey, signalContext, symptomFocus, secondaryKey }) {
  return [
    TRIGGER_LABELS[triggerKey] || TRIGGER_LABELS.default,
    secondaryKey ? `${TRIGGER_LABELS[secondaryKey] || TRIGGER_LABELS.default}も背景` : null,
    signalContext?.label,
    symptomFocus ? `${SYMPTOM_LABELS[symptomFocus] || symptomFocus}に合わせる` : null,
  ].filter(Boolean);
}

function buildSymptomFoodOverride(triggerKey, symptomFocus) {
  const rule = SYMPTOM_FOOD_RULES[symptomFocus];
  if (!rule) return null;

  return {
    title: pickByTrigger(rule.title, triggerKey),
    how_to: pickByTrigger(rule.how_to, triggerKey),
    avoid: pickByTrigger(rule.avoid, triggerKey),
    reason: rule.reason || null,
    lifestyle_tip: rule.lifestyle_tip || null,
  };
}

function buildActionCards({ howTo, avoid, examples, addItems, cautionItems, signalContext }) {
  return [
    {
      key: "add",
      label: TOMORROW_FOOD_LABELS.how_to_label,
      body: howTo,
      items: addItems,
    },
    {
      key: "caution",
      label: TOMORROW_FOOD_LABELS.avoid_label,
      body: formatCautionBody(avoid),
      items: cautionItems,
    },
    {
      key: "choice",
      label: TOMORROW_FOOD_LABELS.examples_label,
      body: signalContext?.choiceBody || null,
      items: examples,
    },
  ].filter((card) => card.body || (card.items || []).length > 0);
}

export function buildTomorrowFoodContext(riskContext) {
  const triggerKey = normalizeTriggerKeyFromRiskContext(riskContext);
  const secondaryKey = getSecondaryExact(riskContext);
  const signalContext = getSignalFoodContext(riskContext?.target?.signal ?? 0);
  const symptomFocus = riskContext?.constitution_context?.symptom_focus || null;
  const peakStart = parseHour(riskContext?.summary?.peak_start);
  const timing = getTimingLabel(peakStart);

  const base = TRIGGER_FOOD_RULES[triggerKey] || TRIGGER_FOOD_RULES.default;
  const symptomOverride = buildSymptomFoodOverride(triggerKey, symptomFocus);
  const triggerItems = TRIGGER_FOOD_ITEMS[triggerKey] || TRIGGER_FOOD_ITEMS.default;
  const secondaryItems = secondaryKey ? TRIGGER_FOOD_ITEMS[secondaryKey] || null : null;
  const symptomItems = SYMPTOM_FOOD_ITEMS[symptomFocus] || null;

  const title = symptomOverride?.title || base.title;
  const howTo = symptomOverride?.how_to || base.how_to;
  const avoid = symptomOverride?.avoid || base.avoid;
  const addItems = mergeItems(
    pickListByTrigger(symptomItems?.add, triggerKey),
    mergeItems(triggerItems.add, secondaryItems?.add, 3),
  );
  const cautionItems = mergeItems(
    pickListByTrigger(symptomItems?.caution, triggerKey),
    mergeItems(triggerItems.caution, secondaryItems?.caution, 3),
  );
  const examples = mergeItems(
    pickListByTrigger(symptomItems?.examples, triggerKey),
    mergeItems(triggerItems.examples, secondaryItems?.examples, 3),
  );

  const reason = symptomOverride?.reason
    ? `${base.reason} ${symptomOverride.reason}`
    : base.reason;
  const lifestyleTip = symptomOverride?.lifestyle_tip || base.lifestyle_tip;
  const recommendation = `${signalContext.lead} ${symptomOverride?.how_to || base.recommendation}`;

  return {
    ...TOMORROW_FOOD_LABELS,
    title,
    timing,
    recommendation,
    how_to: howTo,
    avoid,
    reason,
    lifestyle_tip: lifestyleTip,
    examples,
    add_items: addItems,
    caution_items: cautionItems,
    action_cards: buildActionCards({
      howTo,
      avoid,
      examples,
      addItems,
      cautionItems,
      signalContext,
    }),
    context_chips: buildFoodContextChips({
      triggerKey,
      secondaryKey,
      signalContext,
      symptomFocus,
    }),
    personal_main_trigger_exact: riskContext?.summary?.main_trigger_exact || null,
    personal_secondary_trigger_exact: riskContext?.summary?.secondary_trigger_exact || null,
    trigger_factors: riskContext?.summary?.trigger_factors || [],
    symptom_focus: symptomFocus,
    organ_focus: riskContext?.tcm_context?.organ_focus || [],
    sub_labels: riskContext?.constitution_context?.sub_labels || [],
    care_tone: riskContext?.care_tone,
    trigger_key: triggerKey,
    secondary_trigger_key: secondaryKey,
    intensity: signalContext.intensity,
  };
}
