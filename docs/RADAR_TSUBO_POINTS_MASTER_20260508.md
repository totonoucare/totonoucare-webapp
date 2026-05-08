# radar_tsubo_points マスター一覧 2026-05-08

このファイルは、2026-05-08にSupabaseで確認した `public.radar_tsubo_points` の現役ツボ一覧メモ。

## 結論

```text
total_points: 36
active_points: 36
inactive_points: 0
```

`radar_tsubo_points` は現役。削除禁止。

主な使用箇所:

```text
lib/radar_v1/pickTcmPoints.js
lib/radar_v1/mtestPointRepo.js
lib/radar_v1/selectMtestPoint.js
```

## 注意

この一覧は、ユーザーがSupabase SQL Editorで確認した結果をもとにした引き継ぎ用メモ。  
実際にDBを復元できる完全なseed SQLではない。

完全なseed SQLを作る場合は、`supabase/seeds/radar_tsubo_points_seed_export_query.sql` または今回追加の確認SQLで、Supabase上の全カラムをエクスポートする。

---

## ツボ一覧

| code | 名前 | 読み | 経絡 | 部位分類 | M-test block | M-test role | trigger tags | symptom tags | sub tags | TCM actions | organ focus | image |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BL65 | 束骨 | そっこつ | bl | limb | E | child | temp, humidity | low_back_pain, neck_shoulder | qi_stagnation, blood_stasis | move_qi, move_blood | kidney, liver | points/BL65.webp |
| BL67 | 至陰 | しいん | bl | limb | E | mother | temp, humidity | headache, low_back_pain | blood_stasis | move_blood | kidney | points/BL67.webp |
| CV12 | 中脘 | ちゅうかん | cv | abdomen | - | - | humidity, temp | fatigue, swelling | qi_deficiency, fluid_damp | tonify_qi, strengthen_spleen, transform_damp | spleen | points/CV12.webp |
| CV6 | 気海 | きかい | cv | abdomen | - | - | temp, pressure | fatigue, low_back_pain, dizziness | qi_deficiency, blood_deficiency, fluid_deficiency | tonify_qi, support_kidney, generate_fluids | kidney | points/CV6.webp |
| GB20 | 風池 | ふうち | gb | head_neck | - | - | pressure, temp | headache, dizziness, neck_shoulder | qi_stagnation, blood_stasis | move_qi, move_blood, soothe_liver | liver | points/GB20.webp |
| GB34 | 陽陵泉 | ようりょうせん | gb | limb | - | - | pressure, humidity | neck_shoulder, headache, mood | qi_stagnation, fluid_damp, blood_stasis | move_qi, transform_damp, move_blood | liver, spleen | points/GB34.webp |
| GB38 | 陽輔 | ようほ | gb | limb | F | child | temp, humidity | headache, neck_shoulder | qi_stagnation, blood_stasis | move_qi, move_blood | liver | points/GB38.webp |
| GB43 | 侠渓 | きょうけい | gb | limb | F | mother | temp, humidity | headache, neck_shoulder | qi_stagnation | move_qi | liver | points/GB43.webp |
| GV20 | 百会 | ひゃくえ | gv | head_neck | - | - | pressure, temp | headache, sleep, mood | qi_stagnation, blood_deficiency | move_qi, nourish_blood | liver, kidney | points/GV20.webp |
| HT7 | 神門 | しんもん | ht | limb | B | child | pressure, temp | sleep, mood | blood_deficiency, qi_stagnation | nourish_blood, move_qi | kidney, liver | points/HT7.webp |
| HT9 | 少衝 | しょうしょう | ht | limb | B | mother | pressure, temp | sleep, mood | blood_deficiency | nourish_blood | kidney | points/HT9.webp |
| KI1 | 湧泉 | ゆうせん | ki | limb | E | child | temp, pressure | dizziness, sleep | fluid_deficiency | support_kidney | kidney | points/KI1.webp |
| KI3 | 太渓 | たいけい | ki | limb | - | - | temp, pressure | fatigue, low_back_pain, dizziness | qi_deficiency, fluid_deficiency, blood_deficiency | support_kidney, generate_fluids, nourish_blood | kidney | points/KI3.webp |
| KI7 | 復溜 | ふくりゅう | ki | limb | E | mother | temp, pressure | fatigue, low_back_pain | qi_deficiency, fluid_deficiency | support_kidney, generate_fluids | kidney | points/KI7.webp |
| LI11 | 曲池 | きょくち | li | limb | A | mother | humidity, temp | neck_shoulder, headache | qi_stagnation, fluid_damp | move_qi, transform_damp | liver, spleen | points/LI11.webp |
| LI2 | 二間 | じかん | li | limb | A | child | temp, humidity | headache | qi_stagnation | move_qi | liver | points/LI2.webp |
| LI4 | 合谷 | ごうこく | li | limb | - | - | pressure, temp | headache, neck_shoulder, mood | qi_stagnation, blood_stasis | move_qi, move_blood, soothe_liver | liver | points/LI4.webp |
| LR2 | 行間 | こうかん | lr | limb | F | child | temp, pressure | headache, mood | qi_stagnation | move_qi, soothe_liver | liver | points/LR2.webp |
| LR3 | 太衝 | たいしょう | lr | limb | - | - | pressure, temp | headache, mood, neck_shoulder | qi_stagnation, blood_stasis | move_qi, soothe_liver, move_blood | liver | points/LR3.webp |
| LR8 | 曲泉 | きょくせん | lr | limb | F | mother | pressure, temp | mood, headache | blood_deficiency, qi_stagnation | nourish_blood, soothe_liver | liver | points/LR8.webp |
| LU5 | 尺沢 | しゃくたく | lu | limb | A | child | pressure, temp | headache, neck_shoulder | qi_stagnation | move_qi | liver | points/LU5.webp |
| LU7 | 列缺 | れっけつ | lu | limb | - | - | pressure, temp | neck_shoulder, headache | qi_stagnation, qi_deficiency | move_qi, tonify_qi | liver, spleen | points/LU7.webp |
| LU9 | 太淵 | たいえん | lu | limb | A | mother | pressure, temp | headache, neck_shoulder, dizziness | qi_deficiency | tonify_qi | spleen | points/LU9.webp |
| PC6 | 内関 | ないかん | pc | limb | - | - | pressure, temp | sleep, mood, dizziness | qi_stagnation, fluid_deficiency | move_qi, soothe_liver, generate_fluids | liver, kidney | points/PC6.webp |
| PC7 | 大陵 | だいりょう | pc | limb | C | child | pressure, temp | mood, sleep, dizziness | qi_stagnation | move_qi | liver | points/PC7.webp |
| PC9 | 中衝 | ちゅうしょう | pc | limb | C | mother | pressure, temp | mood, sleep | qi_deficiency | tonify_qi | spleen | points/PC9.webp |
| SI3 | 後渓 | こうけい | si | limb | B | mother | pressure, temp | neck_shoulder, headache | qi_stagnation | move_qi | liver | points/SI3.webp |
| SI8 | 小海 | しょうかい | si | limb | B | child | pressure, temp | neck_shoulder | qi_stagnation, blood_stasis | move_qi, move_blood | liver | points/SI8.webp |
| SP2 | 大都 | だいと | sp | limb | D | mother | humidity, temp | fatigue, swelling | qi_deficiency, fluid_damp | strengthen_spleen, transform_damp | spleen | points/SP2.webp |
| SP5 | 商丘 | しょうきゅう | sp | limb | D | child | humidity, temp | swelling, fatigue | fluid_damp | transform_damp | spleen | points/SP5.webp |
| SP6 | 三陰交 | さんいんこう | sp | limb | - | - | humidity, temp | fatigue, sleep, low_back_pain | blood_deficiency, fluid_deficiency, qi_deficiency | nourish_blood, generate_fluids, strengthen_spleen | spleen, kidney | points/SP6.webp |
| ST36 | 足三里 | あしさんり | st | limb | - | - | humidity, temp | fatigue, swelling, dizziness | qi_deficiency, blood_deficiency | tonify_qi, strengthen_spleen | spleen, kidney | points/ST36.webp |
| ST41 | 解渓 | かいけい | st | limb | D | mother | temp, humidity | fatigue, headache | qi_stagnation | move_qi | spleen | points/ST41.webp |
| ST45 | 厲兌 | れいだ | st | limb | D | child | temp, humidity | headache | qi_stagnation | move_qi | liver | points/ST45.webp |
| TE10 | 天井 | てんせい | te | limb | C | child | pressure, temp | neck_shoulder | qi_stagnation, blood_stasis | move_qi, move_blood | liver | points/TE10.webp |
| TE3 | 中渚 | ちゅうしょ | te | limb | C | mother | pressure, temp | headache, neck_shoulder | qi_stagnation | move_qi | liver | points/TE3.webp |

---

## trigger_tag 件数

| trigger_tag | point_count |
|---|---:|
| temp | 35 |
| pressure | 23 |
| humidity | 14 |

## symptom_tag 件数

| symptom_tag | point_count |
|---|---:|
| headache | 19 |
| neck_shoulder | 15 |
| mood | 11 |
| fatigue | 9 |
| dizziness | 8 |
| sleep | 8 |
| low_back_pain | 6 |
| swelling | 4 |

## M-test block 件数

| mtest_block | point_count |
|---|---:|
| null | 12 |
| A | 4 |
| B | 4 |
| C | 4 |
| D | 4 |
| E | 4 |
| F | 4 |

---

## 解釈

```text
M-test用ツボ:
  A〜F blockあり

汎用・東洋医学的ケア用ツボ:
  mtest_block null
```

2026-05-08時点では、`mtest_block` がnullのツボが12件ある。これは欠損ではなく、汎用・東洋医学的ケア用として扱う。

## 将来の改善余地

```text
humidity / swelling / fatigue 寄りのツボや暮らしケアロジックを増やす余地あり。
ただしMVPとしては36ツボで十分。
```
