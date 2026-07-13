# v7.70.1 予報・実感マップ／AI分析簡潔化

## 修正理由

旧マップは、点の座標に0〜100の連続スコア、点の色に「安定・いたわり・守り」の3段階判定を使っていた。そのため、たとえば「いたわり」判定でもスコアが50未満なら安定側へ描かれ、色と区画の意味が一致しなかった。

AI期間分析は、受容・事実・仮説・次の行動・根拠をすべて独立カードで表示し、各項目の文字数上限も大きかったため、3日分程度の分析でも長くなりすぎていた。

## 修正内容

### 予報と実感マップ

- 連続スコアの2×2散布図を廃止
- 横軸を `安定 / いたわり / 守り`
- 縦軸を `○ よかった / △ 少しつらい / × つらい`
- 3×3の9マスで、予報と実感を同じ3段階基準へ統一
- 各マスには該当日数とケアあり日数を表示
- マス選択後、その組み合わせの日付とケア種類を表示
- 日付ボタンからその日の記録へ移動

### AI期間分析

- 生成プロンプトを簡潔版v3へ更新
- キャッシュキーもv3へ変更し、旧長文キャッシュを再利用しない
- 出力上限を1500から800トークンへ縮小
- 文字数をサーバー側でも制限
- 表示を以下の3要素へ集約
  - この期間の要点（受容・事実・仮説）
  - 次に一つだけ試すこと
  - AIからの質問
- 根拠は初期状態で閉じた「根拠を確認」に収納

AIチャットの質問・選択肢・安全ルールは変更していない。

## 修正ファイル

1. `components/records/ForecastActualMap.jsx`
2. `components/records/AiAnalysisPanel.jsx`
3. `lib/records/analysis.js`
4. `lib/records/aiPrompts.js`
5. `app/api/records/analysis/route.js`
6. `tests/records-analysis.test.mjs`
7. `tests/records-ai-safety.test.mjs`

## DB・環境変数

追加SQL、DB変更、環境変数変更は不要。

## 既存マイグレーション確認について

`20260711_records_ai_mvp_verify.sql` の最後に表示されるトリガー5件は、完成版マイグレーションの期待値と一致する。

- `radar_reviews`: 予報スナップショット保護＋updated_at
- `records_ai_analyses`: updated_at
- `records_ai_consents`: updated_at
- `records_ai_threads`: updated_at
- `records_feature_interests`: updated_at

旧版で先に作成された `records_ai_events` は、完成版マイグレーションが `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` とイベント種別制約の再作成で上書き拡張する。実画面で同意、AI分析、AIチャットが動作しているため、主要な移行は完了していると判断できる。

## 検証

- 単体テスト15件成功
- 予報3段階×実感3段階の全9マスをテスト
- AI分析の各文字数・配列件数上限をテスト
- Next.js production build成功

