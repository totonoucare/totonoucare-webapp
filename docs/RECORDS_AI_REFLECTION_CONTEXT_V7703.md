# 未病レーダー v7.70.3 振り返りUI・AI理解度更新

## 目的

1. 予報と実感を同じ数値軸へ無理に重ねない。
2. ユーザーが「次に何を比べるか」を4パターンから理解できるようにする。
3. AIを、記録だけでなく未病レーダー固有の体質・予報・ケアを理解した伴走役へ近づける。

## UI変更

- 予報と実感マップを廃止。
- 以下の4パターンをカード表示。
  - 注意予報でも穏やか
  - 注意予報でつらさあり
  - 安定予報どおり穏やか
  - 安定予報でもつらさあり
- 各カードに日数、ケアあり／なし、日付別の予報・実感・ケアを表示。
- 推移グラフから予報線を削除。
- 背景色を予報モード、○△×を実感、下段の色点をケアとして表示。
- 3か月以上は週平均の疑似的な数値線を使わず、週内の○△×件数を3段に表示。

## AIコンテキスト変更

- 未病レーダーの共通知識をバージョン付きで追加。
- 体質コードを動物タイプ名・アクセル／ブレーキ・余力・気血水・体のラインへ解釈して送信。
- 6方向の天気親和性と優先ケア方針を送信。
- 計算済みの気象強度、体質親和性、有効負担、主副トリガー、注意時間を送信。
- 保存済みの食事・ツボ提案をコンパクトに送信。
- 暮らすケアは現行ルールで再構成し、当時の保存値ではないことをsourceで明示。
- 体質チェックの生回答、氏名、メール、住所は送信しない。
- AIは予報スコアを再計算せず、安定・いたわり・守りを症状予測や的中率として扱わない。

## v7.70.2 → v7.70.3 差分

### 新規

- `components/records/ForecastPatternCards.jsx`
- `lib/records/aiContext.js`
- `docs/RECORDS_AI_REFLECTION_CONTEXT_V7703.md`

### 修正

- `app/api/records/analysis/route.js`
- `app/api/records/chat/route.js`
- `app/api/records/consent/route.js`
- `components/records/AiAnalysisPanel.jsx`
- `components/records/RecordsTrendChart.jsx`
- `lib/records/aiPrompts.js`
- `lib/records/analysis.js`
- `lib/records/server.js`
- `tests/records-analysis.test.mjs`
- `tests/records-ai-safety.test.mjs`
- `docs/RECORDS_AI_MVP_CHANGELOG.md`
- `docs/RECORDS_AI_MVP_DEPLOYMENT.md`
- `docs/RECORDS_AI_MVP_V770_COMPLETE.md`

### 削除

- `components/records/ForecastActualMap.jsx`

## DB

DB列・テーブル・RLSの変更はない。追加SQL・migrationは不要。

## 検証

- `npm test`: 19件成功
- `npm run build`: 成功
