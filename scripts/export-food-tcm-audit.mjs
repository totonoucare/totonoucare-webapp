// Rebuild the specialist review table directly from the shipped dictionaries.
import fs from 'node:fs/promises';
import {createScenarioRunner} from '../tests/helpers/forecast-scenarios.mjs';
const {load}=await createScenarioRunner();
const {FOOD_ITEMS,FOOD_TCM_VERSION,selectTcmFoods,tcmFoodDetail}=await load('lib/radar_v1/careRules/foodTcm.js');
const {DRINK_ITEMS}=await load('lib/radar_v1/careRules/foodIngredientRules.js');
const rows=FOOD_ITEMS.filter(x=>x.role!=='drink');
const show=x=>Array.isArray(x)?x.join('・')||'—':String(x??'未確定').replaceAll('|','／').replaceAll('\n',' ');
const review={common_synthesis:'一般的整理',variable:'異説・加工等の確認対象',limited:'作用・帰経を保留'};
let md=`# 食べるケア：専門家確認用一覧（v7.79.68 作り直し版）\n\nモデル：${FOOD_TCM_VERSION}\n\nv7.79.67を基に、既存FOOD_ITEMSの全91項目を保持。食べ物81項目に属性を付け、旧辞書の飲み物10項目は専用飲み物辞書（14種類）へ委ねています。重複した飲み物候補は生成しません。\n\n## この表の扱い\n\n性・味・作用・帰経は、中医食養生の学習知識を基に整理した開発用仮説です。全項目を特定文献へ逐一照合したものではありません。専門家確認欄は空欄であり、監修済みとは扱っていません。「一般的整理」も臨床効果を保証する分類ではありません。\n\n食材の性と飲食時の温度は別に持ちます。作用は食材自体から選び、料理例は選定後に提示します。味・帰経は専門家確認用属性で、今回の順位計算へ直接加点していません。薬材の作用を同名・近縁の一般食品へそのまま移さないよう区別しました。\n\n## 選定の手順\n\n1. 体質ラベルから補気・健脾・養血・滋陰・理気・利水などの必要度を組み立てる。\n2. ケア方針、気になる不調、湿気・乾燥・暑さ・冷えを重ねる。同じ作用の必要度は最大値を採用し、同じ理由を重複加算しない。\n3. 冷えを補う条件では寒涼の食材、暑さへの備えでは温熱の食材を外す。寒熱が混在する場合は平性から選ぶ。この扱いは簡易な食養生ルールであり、診断ではない。\n4. 上位作用の一致を中心に、二番目の作用、寒熱、季節を小さく加点。異説ありは作用の加点を0.8倍。胃腸負担が気になる条件では粗い穀物等を少し下げる。\n5. 上位に近い候補内で日付を使い、主候補と代替候補を選ぶ。直近3日の取得済み飲食記録も反映。順位差の大きい食材をローテーションだけで上位にしない。\n6. 選ばれた食材の一致作用を日常語へ訳して理由を表示し、その食材の料理例を添える。\n\n重みは体質4、第一方針3、第二方針2、不調2.5、湿気2、乾燥・寒熱2.5。最上位一致＋次点の35％、寒熱適合最大1.5、旬0.35を用います。これらはアプリ内順位を決める設計値で、健康効果の大きさを表しません。\n\n気圧だけで寒熱を判定しません。気圧からケア方針を導く既存ルールと、体質・不調を介した関係を使います。頭痛やめまいだけから特定の食養生作用を固定しません。\n\n## 食べ物81項目\n\n|ID|食材|性|味|採用作用|帰経（参照）|区分|旬の加点月|調理例|確認点|専門家確認|\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
for(const f of rows)md+=`|${f.id}|${f.name}|${show(f.tcm.nature)}|${show(f.tcm.flavors)}|${show(f.tcm.functions)}|${show(f.tcm.channels)}|${review[f.tcm.review]}|${show(f.tcm.season||[])}|${show(f.tcm.examples[0])}|${show(f.tcm.note)}|未確認|\n`;
md+=`\n## 飲み物14種類\n\n|ID|飲み物|採用する性|温かく飲む想定|カフェイン|監査区分|画面の基本説明|専門家確認|\n|---|---|---|---|---|---|---|---|\n`;
for(const d of DRINK_ITEMS)md+=`|${d.id}|${d.name}|${show(d.nature)}|${d.servedWarm?'あり':'温度は別途調整'}|${d.caffeine?'含む':d.name==='デカフェコーヒー'?'低減・製品差あり':'含まない想定'}|${d.review}|${show(d.note)}|未確認|\n`;
md+=`\n## 特に確認してほしい点\n\n- 日本の魚種と中国の同名・近縁魚は同一視せず、一般的な補益方向までに抑えた候補を「異説・加工等」に分類。\n- 牛肉・りんご等は資料差を考慮し、寒熱の加点を付けていない。\n- れんこんは加熱を想定。生の清熱・涼血を、そのまま加熱料理の理由にしない。\n- 生姜と乾姜、食用シナモンと桂枝、みかんの果肉と陳皮、牡蠣の身と牡蛎（殻）を区別。\n- 納豆・味噌・小松菜・ブロッコリー・一部きのこ等は名称・加工・資料差から作用と帰経を保留。辞書には残り、強い作用一致で優先されることはない。\n- 麦茶は涼を仮採用し、焙煎・飲用温度の資料差を確認対象にした。\n- 白湯は平、温かい提供温度を別属性にした。葛湯は加工澱粉飲料として扱い、葛根の薬効を付けない。\n- 小豆茶・黒豆茶・とうもろこし茶は抽出飲料。豆を丸ごと食べた場合の作用や、とうもろこしのひげの作用を直接付けない。\n- コーヒー・デカフェ・ルイボス等の性は未確定。香り、温度、水分補給、カフェインの実用面を用いる。\n\n## 外部資料で点検した範囲\n\n[米国NCCIH「Green Tea」](https://www.nccih.nih.gov/health/green-tea)で、茶の飲用と濃縮エキス、カフェインの区別を再確認（2026-09-21）。本資料を全食材の性味・帰経の出典とは扱っていません。伝統的な性味等の外部照合は一部に留まり、上表の専門家確認を残しています。\n\n## 表示例（実際の選定結果）\n\n`;
for(const [name,trigger,labels] of [['冷え＋疲れ','cold',['qi_deficiency']],['乾き＋消耗','dry',['fluid_deficiency']],['湿気＋重だるさ','damp',['fluid_damp']]]){
 const picked=selectTcmFoods({targetDate:'2026-09-22',theme:{trigger_key:trigger},subLabels:labels});
 md+=`### ${name}\n\n`;
 for(const f of picked){const d=tcmFoodDetail(f,{targetDate:'2026-09-22'});md+=`- **${d.label}**：${d.public_reason} 料理例：${d.meal_example}\n`;}
 md+='\n';
}
md+=`## 記録とAIへの引き継ぎ\n\n食材ID・食材名、食べた／飲んだ、選定理由と属性を保存します。料理例は文脈として残し、料理の完食・量・効果を記録から推定しないようAIへ伝えます。実行日はsource_date、予報対象日はtarget_dateとして区別します。\n\n翌朝の候補は読み取り専用。今夜の夜食を食べた記録は今夜の実行として保存。旧い「食材・食べ方を取り入れた」記録の意味も保持しています。\n\n## ショップへの引き継ぎ\n\n体質とケア方針を基に、薬膳茶・和漢茶・食養生系健康食品・薬膳素材を探します。提案した食材名や料理名を買い物条件として送信しません。通常ショップの既存カテゴリは保持し、予報の食養生導線では茶・食養生系の検索意図へ絞ります。\n`;
await fs.writeFile(new URL('../docs/FOOD_TCM_REVIEW_V77968_REBUILT.md',import.meta.url),md);
console.log('Audit table written: 81 foods + 14 drinks');
