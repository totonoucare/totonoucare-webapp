# AI開発引き継ぎメモ

この資料は、未病レーダーの変わりにくい設計・運用ルールをまとめた補助資料です。現在の入口は `README_AI_HANDOFF.md` です。

---

## プロダクトの軸

> 明日の崩れやすさを、今夜の整え方に変える。

体質と天気から体調が崩れやすいタイミングを示し、`暮らす / 食べる / ほぐす` の具体的なセルフケアへつなげます。

詳細: `docs/PRODUCT_DIRECTION.md`

---

## 実装の大枠

```text
app/              画面とAPI Routes
components/       UI
lib/diagnosis/    体質チェック
lib/radar_v1/     予報・天気・ケア
lib/records/      記録・AIミモル・アクセス制御
lib/care-navi/    ケアナビ
lib/care-shop/    ケアショップ
lib/push/         通知
public/           画像・PWA
supabase/         DB関連
docs/             設計・運用資料
```

---

## 体調予報

現行の予報V2は、体質と天気からコード側で予報構造を決定します。

```text
点数
天気ストレス
主因・副因
signal
表示ケア
```

OpenAI APIにこれらを自由に再計算・上書きさせません。

予報ロジック変更時は、`lib/radar_v1/` と関連テストを先に確認してください。

---

## AIミモル

OpenAI APIの主用途は以下です。

```text
記録のAI分析
期間振り返りチャット
今の体調相談
```

モデル・利用上限・公開期間などの非機密運用値は `lib/records/policy.js` が正本です。

ユーザー向け表示名は「AIミモル」が基本です。内部コードに残るEkken系名称は、意図を確認してから変更します。

---

## DB管理

```text
supabase/schema/      現状把握用snapshot
supabase/migrations/  実変更SQL
supabase/checks/      確認用SELECT
supabase/seeds/       マスターデータ
```

`schema/` は原則そのまま実行しません。

DB変更時はRLS、制約、index、trigger/function、既存データを確認します。

詳細:

```text
docs/DB_SCHEMA_MANAGEMENT.md
docs/DB_CURRENT_STATUS_20260508.md
```

---

## 外部サービス・Secret

主な外部サービス:

```text
Supabase
Stripe
OpenAI
MET Norway
Google OAuth
Web Push / VAPID
Vercel
Netlify
GitHub Actions
```

環境変数名は `.env.example` を参照します。Secret実値はGitHubへ保存しません。

詳細: `docs/ENVIRONMENT_AND_EXTERNAL_SERVICES.md`

---

## AI開発時の原則

- コードを読む前に大きな変更を決めない
- 古いリリースメモを現在の仕様より優先しない
- DB状態が不明なら確認SQLから始める
- 保存済みデータとの互換性を確認する
- 医療効果を断定する表現を避ける
- 複数ファイル変更は原則ZIPで返す
- テスト・ビルド・実機確認の実施状況を明記する

現在の詳細な引き継ぎ入口は `README_AI_HANDOFF.md` を参照してください。
