// Reading material shared by result explanations, daily forecasts and conversation.
// These are concepts for composing a person's explanation, not prewritten results.
export const MIMORU_KNOWLEDGE_VERSION = "mimoru_connections_20261107_v3";

export const MIMORU_WRITING_GUIDE = `
利用者が知りたいのは、自分の体質がお悩みの不調とどうつながり、ケアをすると何を整えられるかです。
「体質の傾向 → 関係する体の働き → 不調の現れ方 → ケアの狙い」を、体の中を想像できる言葉で説明します。
気になる不調を主題に、今回関係の深い材料を選んで考えます。複数の要素は、一人の体の状態として組み合わせて読みます。
専門概念は体の場所・働きの日常語で説明します。経絡名や要穴の分類名は判断材料に使い、本文ではどことどこがどう関係するかを伝えます。症状の例は「たとえば」と紹介します。
落ち着いた自然な日本語で本題から書き、説明が済んだところで終えます。画面の案内ではミモルが親しみをもって話しかけます。
`.trim();

export const CONNECTION_SOURCES = {
  constitution: { title: "香港衞生署：体質と養生", url: "https://www.cmro.gov.hk/html/b5/useful_information/public_health/exhibit_boards/Body_Constitution_and_Relevant_Health_Maintenance.html" },
  stomach: { title: "香港浸会大学：胃痛・胃脹の体質別の考え方", url: "https://embracehealth.hkbu.edu.hk/html/eclassroom_article_detail.php?id=82" },
  headache: { title: "香港浸会大学：頭痛の気・血・痰・寒熱の読み方", url: "https://embracehealth.hkbu.edu.hk/html/eclassroom_article_detail.php?id=69" },
  sleep: { title: "香港浸会大学：睡眠と虚実の読み方", url: "https://embracehealth.hkbu.edu.hk/html/eclassroom_article_detail.php?id=43" },
  nourishment: { title: "香港浸会大学：血の不足と睡眠・めまい", url: "https://embracehealth.hkbu.edu.hk/html/eclassroom_book_detail.php?bookid=37&id=1809&sectionid=241" },
  pain: { title: "香港浸会大学：慢性的な痛みの滞り・温養・潤い", url: "https://embracehealth.hkbu.edu.hk/html/eclassroom_article_detail.php?id=132" },
};

export const MATERIAL_CONNECTIONS = {
  qi_deficiency: { label: "気虚", function: "食べ物から必要なものを取り込み、体を動かし、水分を運び、回復する働き", change: "働かせる力が不足すると、動作や消化で疲れやすく、水分もさばきにくくなる", care_aim: "食事と休息で働く力を保ち、消耗を減らす" },
  qi_stagnation: { label: "気滞", function: "胸やお腹の動き、呼吸、緊張と休息の切り替えを滑らかにする働き", change: "動きが滞ると、張る・詰まる・力が抜けにくい状態として現れる", care_aim: "張りつめた状態をほどき、動きと切り替えを取り戻す" },
  blood_deficiency: { label: "血虚", function: "目や筋肉、心身の活動を養い、休息時に回復させる働き", change: "養うものが不足すると、使ったあとの疲れや回復の遅れ、休まりにくさにつながる", care_aim: "食事と睡眠で養い、使い続ける負担を減らす" },
  blood_stasis: { label: "血瘀", function: "体の各部へ養うものを届け、同じ場所に滞りを残さない巡り", change: "巡りが滞ると、同じ場所に残る痛みやこわばりとして現れる", care_aim: "姿勢や動きの偏りをほどき、少しずつ巡りを保つ" },
  fluid_deficiency: { label: "津液不足", function: "体を潤し、冷まし、胃や筋肉などの働きを滑らかに保つ役割", change: "潤いが不足すると、乾きやつっぱり、落ち着かなさが出やすく、胃では食を受け入れにくい状態にもつながる", care_aim: "潤いを保ち、汗や夜更かしなどによる消耗を減らす" },
  fluid_damp: { label: "痰湿", function: "水分を必要なところへ運び、余分な分をさばく働き", change: "水分の停滞は、重さ・もたれ・むくみ・動き始めにくさとして現れる", care_aim: "胃腸に負担をためず、軽い動きで水分の流れを助ける" },
};

export const SYMPTOM_CONNECTIONS = {
  digestion: {
    label: "胃腸の調子",
    function: "胃は潤いを保ちながら食べ物を受け入れて下へ送り、脾は食べ物から養うものや水分を取り込んで運ぶ、と読む。受け入れる・送る・取り込む働きのどこに負担があるかを考える。",
    paths: {
      fluid_deficiency: "胃を潤すものの不足 → 受け入れて下へ送る働きが乱れる → 胃が落ち着かない、空腹なのに食が進まない、といった現れ方",
      qi_stagnation: "胸やお腹の動きが滞る → 胃の通りがつかえる → 張り、げっぷ、食後のつかえ感",
      qi_deficiency: "食べ物を取り込み運ぶ力の不足 → 食事の負担を処理しきりにくい → 食後の疲れやもたれ、食欲の落ち方",
      fluid_damp: "水分を運ぶ働きの停滞 → 胃腸に湿った重さが残る → 胃の重さやもたれ",
      blood_stasis: "胃の周囲の巡りが滞る → 同じ場所に負担が残る → 場所の変わりにくい痛みや不快感",
      blood_deficiency: "胃腸を含む体を養うものの不足 → 回復の遅れと食事から補う必要性を、余力や気虚の程度と合わせて読む",
    },
    combination: "潤い不足と湿の停滞は、潤いが必要な場所に届くことと、水分を運びさばくことに分けて読む。今回の強さと主訴への関係から、説明の中心を選ぶ。",
    sources: ["stomach", "constitution"],
  },
  headache: {
    label: "頭のつらさ",
    function: "頭へ養うものが届くことと、頭の巡り・緊張が保たれることから読む。張り、重さ、固定した痛み、使ったあとの消耗という経路を考える。",
    paths: {
      qi_stagnation: "張りや緊張がほどけにくい → 頭や首の張り、締めつけられる感じにつながる",
      blood_stasis: "巡りの滞りが残る → 同じ場所に繰り返す痛みにつながる",
      fluid_damp: "湿の停滞で清らかな働きが頭へ届きにくい → 頭が重い、すっきりしない感じにつながる",
      qi_deficiency: "頭を働かせる力を保ちにくい → 活動後の頭のつらさを疲れや回復と合わせて読む",
      blood_deficiency: "頭を養うものの不足 → 消耗したときの頭のつらさやふらつきにつながる",
      fluid_deficiency: "潤い不足による乾きと熱の落ち着きにくさを、寒熱と首肩の状態に合わせて読む",
    },
    sources: ["headache", "nourishment"],
  },
  sleep: {
    label: "眠り",
    function: "日中の活動から夜の休息へ切り替わり、心身が養われて落ち着く流れから読む。",
    paths: {
      qi_stagnation: "張りつめた状態が続く → 休む時間にも緊張がほどけにくく、寝つきに響く",
      qi_deficiency: "日中の消耗から回復する力の不足を、血や余力の状態と合わせて読む",
      blood_deficiency: "心身を養うものの不足 → 休息時に落ち着きにくく、眠りが浅い・目が覚めやすい現れ方につながる",
      fluid_deficiency: "潤い不足で熱や高ぶりが静まりにくい → 夜のほてりや落ち着かなさにつながる",
      fluid_damp: "湿の停滞や胃腸のもたれ → 横になったときの重さ・胸や胃のつかえを通じて休息を妨げる",
      blood_stasis: "残る痛みやこわばりが、休む姿勢や夜の休まり方にどう関係するかを読む",
    },
    sources: ["sleep", "nourishment"],
  },
  fatigue: {
    label: "疲れやすさ",
    function: "動くための力、使った体を養い回復させるもの、動きを妨げる重さを読む。",
    paths: {
      qi_deficiency: "働かせる力が不足 → 動作や食事で消耗しやすく、休息を必要とする",
      blood_deficiency: "養うものが不足 → 使ったあとの疲れが残り、回復が追いつきにくい",
      fluid_deficiency: "潤いを失いやすい → 暑さや発汗などで消耗し、回復にも休息が必要になる",
      fluid_damp: "水分の停滞が重さになる → 体が重く、動き始めに抵抗を感じる",
      qi_stagnation: "力みが続いて切り替えにくい → 休んでいても張りが残り、疲れた感じにつながる",
      blood_stasis: "同じ場所のこわばりが続く → 動作の負担と休まりにくさにつながる",
    },
    sources: ["constitution", "pain"],
  },
  neck_shoulder: {
    label: "首・肩のこり",
    function: "首肩の筋肉を養うこと、動きに合わせて緊張がほどけること、巡りと温かさが保たれることから読む。",
    paths: {
      qi_stagnation: "緊張がほどけにくい → 首肩の張りや、力が抜けにくい感じにつながる",
      blood_stasis: "同じ姿勢などで巡りの滞りが残る → 場所の変わりにくいこりや痛みにつながる",
      blood_deficiency: "筋肉を養うものの不足 → 使い続けたあとの疲れやこりが残りやすい",
      fluid_deficiency: "筋肉や筋を潤すものの不足 → つっぱりや、動かしたときの滑らかさに関係する",
      fluid_damp: "水分の停滞による重さが、首肩の重だるさに関係する",
      qi_deficiency: "姿勢を保つ力や回復余力から、支え続けたあとの負担を読む",
    },
    sources: ["pain", "constitution"],
  },
  low_back_pain: {
    label: "腰のつらさ",
    function: "腰を支える力、筋肉や筋が養われ潤うこと、巡りと温かさが保たれることから読む。",
    paths: {
      qi_deficiency: "支え続ける力と回復余力の不足 → 立つ・座る・動く負担が残りやすい",
      blood_deficiency: "筋肉や筋を養うものの不足 → 使ったあとの疲れや回復の遅れにつながる",
      blood_stasis: "腰の巡りの滞り → 同じ場所に残る痛みやこわばりにつながる",
      qi_stagnation: "張りや緊張がほどけにくい → 動き出しや姿勢の切り替えに響く",
      fluid_damp: "水分の停滞による重さを、冷えと合わせて腰の重だるさとして読む",
      fluid_deficiency: "筋肉や筋の潤い不足を、つっぱりや休息後の回復と合わせて読む",
    },
    sources: ["pain", "constitution"],
  },
  swelling: {
    label: "むくみ・重だるさ",
    function: "水分を運び、必要な場所へ届け、余分な分をさばく流れから読む。",
    paths: {
      fluid_damp: "水分の停滞 → むくみや体の重さとして現れる",
      qi_deficiency: "水分を運びさばく力の不足 → 滞りをため込みやすい",
      qi_stagnation: "胸腹の動きの滞り → 水分の移動も滞り、張りと重さが同時に出やすい",
      blood_stasis: "巡りの滞りと水分の停滞が、局所の重さにどう関係するかを読む",
      blood_deficiency: "養うものの不足を、活動量や回復余力に関係する材料として読む",
      fluid_deficiency: "必要な潤いの不足と水分の停滞を別の働きとして読み、食事・飲水・運ぶ力を合わせて考える",
    },
    sources: ["constitution"],
  },
  dizziness: {
    label: "めまい・ふらつき",
    function: "頭を働かせ養うものが届くこと、湿による重さや熱・高ぶりが落ち着くことから読む。",
    paths: {
      qi_deficiency: "頭を働かせる力の不足 → 動作や疲労に伴うふらつきにつながる",
      blood_deficiency: "頭や目を養うものの不足 → ふらつきや使ったあとの疲れにつながる",
      fluid_damp: "湿の停滞が頭の働きに重さを与える → 頭重やすっきりしない感じにつながる",
      fluid_deficiency: "潤い不足と熱の落ち着きにくさを、寒熱や余力に合わせて読む",
      qi_stagnation: "高ぶりや張りがほどけにくいことを、頭・首の状態と合わせて読む",
      blood_stasis: "巡りの滞りを、首肩のこわばりや頭の不快感との関係から読む",
    },
    sources: ["nourishment", "headache"],
  },
  mood: {
    label: "気分のゆらぎ",
    function: "心身の緊張を切り替えること、活動と休息を支える力、心身が養われて落ち着くことから読む。",
    paths: {
      qi_stagnation: "気持ちと体の張りがほどけにくい → 胸のつかえ、いら立ち、落ち着きにくさにつながる",
      blood_deficiency: "心身を養うものの不足 → 休まりにくさや、疲れたときの心細さにつながる",
      fluid_deficiency: "潤い不足で熱や高ぶりが静まりにくい → 落ち着かなさや夜の休まりにくさにつながる",
      qi_deficiency: "働く力と回復余力の不足 → 活動の負担が気分や意欲へどう響くかを読む",
      fluid_damp: "重さやすっきりしない体感が、動き始めや気分の切り替えに関係する",
      blood_stasis: "痛みやこわばりが残ることと、心身の休まり方の関係を読む",
    },
    sources: ["constitution", "sleep", "pain"],
  },
};

export const CONNECTION_EXAMPLES = {
  digestion: {
    context: "潤い不足と巡りの滞りが目立ち、胃腸の調子が気になる人の文章例",
    overview: "今回の胃腸の不調では、潤いの不足と巡りの滞りに注目します。胃は潤いを保ちながら、食べ物を受け入れて下へ送る働きをします。その潤いが不足すると、たとえば胃が落ち着かない、空腹なのに食が進まない、といった形で現れます。巡りの滞りは、同じ場所に残る胃の痛みなどにも関係します。潤いを保ち、滞りを整えることが、胃腸をいたわるケアにつながります。",
    weather: "暑さで汗をかく日は、体の潤いも消耗します。潤い不足の傾向があるあなたは、胃の落ち着かなさや食欲の落ち方にも気を配りたい日です。",
    care: "食事の量や休息を整え、胃腸が無理なく働ける状態を保ちます。",
    forecast: "今日は気圧の変化を受けて、体に力が入りやすい予報です。胃の張りや、食後にすっきりしない感じに気を配りましょう。食事は急いで済ませず、食べる前にひと息。",
    invitation: "今日は、胃腸をいたわりながら、力みをほどいていこう。食事・ほぐし・過ごし方、どれから見てみる？",
    item_reason: { item: "中脘のツボケア", reason: "胃の受け入れて下へ送る働きを整え、食後のつかえやもたれに備える狙いで選びました。" },
  },
  headache: {
    context: "張り・緊張が目立ち、余力が小さめで頭のつらさが気になる人の文章例",
    overview: "頭のつらさでは、張りつめた状態がほどけにくいことと、頑張ったあとに回復が追いつきにくいことに注目します。緊張が続くと、たとえば頭や首が締めつけられるような不快感につながります。力みをほどきながら、使い切る前に休むことが、頭をいたわるケアになります。",
    weather: "気圧が大きく変わる日は、普段の張りが強まりやすい予報です。頭だけに意識を向けず、首や肩に力が入り続けていないか確かめましょう。",
    care: "首肩に入り続けた力をほどき、頭の張りに備えます。息をゆっくり吐きながら、楽に動かせる範囲で取り入れましょう。",
    forecast: "明日は気圧の変化による負担が増える予報です。頭や首の張りに備え、今夜は作業を早めに区切って、休む時間を確保しましょう。",
    invitation: "明日の頭の張りに備えて、今夜できるケアを用意したよ。どれから見てみる？",
    item_reason: { item: "太衝のツボケア", reason: "張りつめた状態をほどき、頭や首に集まる張りに備えるためのツボです。" },
  },
};

export function buildConnectionReference(symptomKey) {
  const symptom = SYMPTOM_CONNECTIONS[symptomKey] || null;
  return {
    version: MIMORU_KNOWLEDGE_VERSION,
    purpose: "体質の特徴から体の働き、お悩みの現れ方、ケアの狙いを組み立てるための参考資料",
    materials: MATERIAL_CONNECTIONS,
    symptom,
    sources: (symptom?.sources || ["constitution"]).map(key => ({ key, ...CONNECTION_SOURCES[key] })),
    composition: "今回のスコアの強さ、寒熱、余力と、主訴への関係から説明の中心を選ぶ。資料にある各経路は、組み合わせを考えるための材料。",
    writing_examples: symptomKey === "digestion" ? [CONNECTION_EXAMPLES.digestion, CONNECTION_EXAMPLES.headache]
      : [CONNECTION_EXAMPLES[symptomKey] || CONNECTION_EXAMPLES.headache, CONNECTION_EXAMPLES.digestion],
    example_usage: "作例は説明の具体性・自然な日本語・文章量の見本。今回の内容は今回のデータから組み立てる。",
  };
}
