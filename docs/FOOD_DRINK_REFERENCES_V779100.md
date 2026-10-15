# 食材・飲料の設計と参照先 v7.79.100

2026-10-15。商品ページは国内で食品として取り入れられる原料・販売形態の確認に使用。理論の参照先と流通の参照先を分けています。在庫の継続や市場全体の流通量を示す資料ではありません。

## 食材の説明

食材81種類は、既存の `foodTcm.js` の採用属性を基準に、食性・味・香りの意味を日常語へ整えました。食材の採点係数と採用作用は維持しています。作用を採用していない食材では、組み合わせの中での料理上の役目を説明します。味だけから作用を自動推定して加点する処理はありません。

- [クラシエ 薬膳食材図鑑](https://www.kracie.co.jp/kampo/kampofullife/yakuzen/)
- [薬日本堂 薬膳食材辞典](https://www.kampo-sodan.com/yakuzen)
- [香港衛生署 四気五味・食養生](https://www.cmro.gov.hk/html/b5/useful_information/public_health/publication/Health_Preservation_by_Food_in_CM.html)

## 飲料の説明と採用する原料

|対象|採用する内容|理論の参照先|
|---|---|---|
|生姜・陳皮・菊花|生姜の温胃散寒、陳皮の理気・健脾・燥湿、菊花の清熱と目まわりの養生|[香港衛生署 薬補或食補](https://www.cmro.gov.hk/html/b5/useful_information/public_health/exhibit_boards/Herbal_Tonics_or_Food_Tonics.html)|
|はとむぎ・小豆・とうもろこしの実・黒豆|食用原料の健脾・利湿・養う働き。焙煎や抽出を考慮して設計上の強弱を設定|[香港衛生署 食養生](https://www.cmro.gov.hk/html/b5/useful_information/public_health/publication/Health_Preservation_by_Food_in_CM.html)、[クラシエ ハトムギ](https://www.kracie.co.jp/kampo/kampofullife/yakuzen/ingredients/hatomugi.html)|
|マイカイ花|食用Rosa rugosaの花。気と血の巡りに着目|[香港浸会大学中医師の玫瑰花茶解説](https://thebuddypost.hkbu.edu.hk/web/aug21/eng/treasures_and_moments7.php)|
|ジャスミン花|食品用の花だけの茶。茶葉を使うジャスミン茶と原料・カフェインを区別|[香港浸会大学 茉莉花](https://sys01.lib.hkbu.edu.hk/cmed/mpid/detail.php?herb_id=D01010)|
|龍眼・なつめ|体を養う甘み、気血と落ち着きに着目した組み合わせ|[香港浸会大学 龍眼肉](https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00191)、[クラシエ なつめ](https://www.kracie.co.jp/kampo/kampofullife/yakuzen/)|
|コーヒー・デカフェ|苦味を「心」の養生から読む説明。朝〜昼の風味として残し、疲れへの覚醒加点と香りだけの理気加点を削除|[薬日本堂 喫茶養生記コラム](https://www.kampo-sodan.com/column/entry-1824)|
|ルイボス|ノンカフェインの飲料・ブレンドの土台。マイカイを合わせる場合は花の働きを説明|[薬日本堂 妃美茶](https://www.nihondo-shop.com/SHOP/496149020823.html)、[薬日本堂 香巡茶](https://www.nihondo-shop.com/SHOP/496149020857.html)|

コーヒーを不眠対策として選ぶ処理は設けていません。苦味の説明から清熱・利湿などを自動加点する処理もありません。デカフェのカフェイン表示は「少量・製品差あり」。ルイボス単独へ補血・滋陰・安神の作用を追加していません。薬日本堂の市販ブレンドと本アプリのブレンドは配合を区別します。

## 追加8項目の流通・作り方

|追加する飲料|国内で確認した入手先・形態|実装で固定した条件|
|---|---|---|
|マイカイ花茶|[Plus Herb 食用Rosa rugosa](https://item.rakuten.co.jp/plus-herb07/s-ma-5013/)、[運龍堂 マイカイ](https://item.rakuten.co.jp/unryudo/maimaika/)|食品用の花。観賞用のバラやローズヒップを代用しない|
|陳皮しょうが茶|[薬日本堂 みかん果皮](https://www.nihondo-shop.com/SHOP/496149020705.html)、[三越伊勢丹 朝岡スパイス陳皮](https://www.mistore.jp/shopping/product/900000000000000002771973.html)。生姜は一般の食品|食用の乾燥果皮と生姜を家庭で組み合わせる|
|ジャスミン花茶|[温活農園 花のみ](https://onkatsunouen.com/products/jasmine)、[Venurse ジャスミン](https://www.venurse.net/jasmine50g.html)|食品用・茶葉なしの花茶。緑茶ベースの市販品には別のカフェイン情報が必要|
|菊花クコ茶|[薬日本堂 菊花](https://www.nihondo-shop.com/SHOP/496149020709.html)、[薬日本堂 クコの実](https://www.nihondo-shop.com/SHOP/496149020708.html)、[草漢堂 菊花クコセット](https://store.shopping.yahoo.co.jp/kanpo-1193/kukoki-dai.html)|菊花とクコの実。プーアル茶・緑茶入りのブレンドとは区別|
|なつめ龍眼茶|[薬日本堂 なつめ](https://www.nihondo-shop.com/SHOP/496149020707.html)、[彩香 龍眼なつめ茶](https://store.shopping.yahoo.co.jp/saika/10613101.html)、[京都伝統中医学研究所 なつめ竜眼茶](https://store.shopping.yahoo.co.jp/iktcm/yyt002-2000.html)|食品用のなつめ・龍眼肉を使う。市販の確認例はクコなどを含むものもあり、同じ配合とは扱わない|
|しょうがなつめ茶|なつめは上記。生姜は一般の食品。[成城石井 なつめしょうが茶](https://seijoishii.com/products/4953762454474-q24)も確認|本アプリは生姜となつめ。市販の複数原料の茶と配合を区別|
|はとむぎ小豆茶|[オリヒロ はとむぎ茶](https://health.orihiro.com/product/detail/?id=342)、[山本漢方 小豆茶の国内販売](https://www.seims.co.jp/shop/g/g4979654028172/)|表示に沿って淹れた単品茶を合わせる。2原料だけの完成品の広い流通は前提にしない|
|ルイボス＋マイカイ花|ルイボスの一般流通と上記の食品用マイカイ花。薬日本堂の花入りルイボスの販売例も参照|本アプリ独自の取り入れ方。市販ブレンドの配合をそのまま移していない|

原料の種類と配合を固定して説明・カフェイン表示・選定条件を対応させています。食品用製品の表示に沿った家庭での取り入れ方を案内します。飲む湯の温度と、食材の温める・冷ます性質は別に扱います。

## 保存と検証

- 飲料は既存14項目のIDを保持し、追加8項目を末尾に追加。
- 飲食を記録した時点の選定理由・解説・内容バージョンを、既存JSON内へ保存。
- 過去記録に説明がない場合も読み込める形式を維持。
- 合成条件の出現件数は、実ユーザーの人数・利用頻度・効果を示す数値とは区別。詳細は `verification/food-drink-explanations-v779100.json`。
