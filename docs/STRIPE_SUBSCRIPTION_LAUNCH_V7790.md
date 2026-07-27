
# v7.79.0 Stripeサブスク開始準備

## 有料・無料の境界

- 無料のまま:
  - 体質チェック
  - 体質トリセツ
  - 体調予報と対策ケア
  - 記録カレンダーの保存・編集・閲覧
- プレミアム:
  - AI分析タブ全体（期間別グラフ、集計、AI分析、期間別チャット）
  - 相談タブのEkken相談
- 別料金:
  - 国家資格者等へのオンライン相談

無料先行体験は、日本時間の2026年8月31日23:59:59.999まで。2026年9月1日0:00以降は、ページを開いた時点の現在時刻と有効なentitlementで判定する。cronや当日の再デプロイは不要。

## Stripe Dashboardで行うこと

テストモードと本番モードは、商品・Price・Webhook secretが別物。まずテストモードで全工程を確認し、本番モードでも同じ設定を作り直す。

### 1. 月額商品とPrice

Stripe DashboardのProduct catalogで、サブスク商品を1つ作る。

- 商品名例: `未病レーダー プレミアム`
- 課金方式: 定額
- 請求間隔: 月次
- 通貨・金額: 公開する料金に合わせて設定
- Price ID: `price_...` をVercelの `STRIPE_PREMIUM_PRICE_ID` へ設定

アプリ内部の `radar_subscription` は権限判定用のメタデータ名であり、Stripeの商品IDを手入力する欄ではない。

### 2. Customer Portal

Settings > Billing > Customer portalで構成を保存する。

- 支払い方法の更新: 有効
- 請求書履歴: 有効
- サブスクリプション解約: 有効
- プラン変更: 単一プランで開始する間は無効でよい
- 解約時期: 原則「請求期間の終了時」

アプリの「契約・支払いを管理する」は `/api/stripe/portal` でその都度Portal Sessionを作る。

### 3. Webhook

Developers > Webhooks（またはWorkbench > Webhooks）でエンドポイントを作る。

```text
https://本番ドメイン/api/stripe/webhook
```

購読イベント:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
invoice.payment_action_required
```

エンドポイント作成後に表示されるSigning secret `whsec_...` を、同じモードの `STRIPE_WEBHOOK_SECRET` へ設定する。テスト用と本番用を混ぜない。

### 4. Vercel環境変数

```text
NEXT_PUBLIC_APP_URL=https://本番ドメイン
STRIPE_SECRET_KEY=sk_test_... または sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
```

テスト環境では3つともテストモードの値、本番開始時は3つとも本番モードの値に揃える。SecretをGitHubやソースへ書かない。

entitlementsにはStripeの`livemode`も保存する。テスト決済の権限はテストキーの環境だけ、本番決済の権限は本番キーの環境だけで有効になるため、テスト契約が本番の無料開放として残らない。

### 5. 本番利用の準備

- Stripeアカウントの事業者情報・本人確認・入金口座を完了
- 公開明細書表記、問い合わせ先、規約・プライバシー・返金方針を確認
- Dashboardで利用する支払い方法を確認
- 本番モードで商品、月額Price、Webhook、Customer Portalを再設定

## DBとデプロイ順

1. `supabase/migrations/20260727_add_stripe_subscription_identity_v7790.sql`
2. `supabase/checks/20260727_check_stripe_subscription_identity_v7790.sql`
3. アプリをデプロイ
4. Stripeテストモードの環境変数を設定して再デプロイ
5. 設定画面の「テスト決済を試す」からCheckout
6. Checkout後、設定画面が「プレミアム利用中」になることを確認
7. Customer Portalを開き、期間終了時の解約を試す
8. Stripe DashboardのWebhook配信結果がすべて2xxであることを確認
9. 本番開始前に本番モードの値へ切り替えて、少額または実決済で最終確認

DB migrationをコードより先に適用する。新コードはStripe Customer / Subscription / Price ID列を参照するため、逆順にしない。

## テストモードの安全策

- `STRIPE_SECRET_KEY` が `sk_test_` の時だけ、無料期間中の設定画面に「テスト決済を試す」を表示する。
- 本番キーでは2026年9月1日より前のCheckout作成をAPI側で拒否する。
- 9月1日以降は未契約者のAI分析・Ekken相談をUIとAPIの両方で拒否する。
- 記録カレンダーは契約状態にかかわらず利用できる。

## Stripe公式資料

- Checkoutによるサブスク: https://docs.stripe.com/payments/checkout/build-subscriptions
- サブスクWebhook: https://docs.stripe.com/billing/subscriptions/webhooks
- Webhook署名・運用: https://docs.stripe.com/webhooks
- Customer Portal設定: https://docs.stripe.com/customer-management/configure-portal
- Customer Portal統合: https://docs.stripe.com/customer-management/integrate-customer-portal
