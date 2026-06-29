# つっぱりラインチェック for Clinic MVP v0.2

治療院HPに埋め込める「予約前からだチェック」ツールのMVPです。

v0.2では、v0.1の単純な5ライン判定から、以下の方針に変更しています。

- 結果は「主訴 × 負担ライン」で表示
- 内部ラインを6系統へ拡張
  - 背面つっぱりライン
  - 前面つまりライン
  - 側面かたよりライン
  - ねじれライン
  - 深部体幹ライン
  - 腕肩ライン
- 質問を9問へ変更
  - 主訴
  - 前屈
  - 反る・上向き
  - 体側
  - 振り向き
  - 腕上げ
  - 呼吸・体幹
  - 姿勢・生活背景
  - 戻りやすさ
- 主訴別補正を追加
- 結果画面に「あなたの回答から見えたポイント」を表示
- サブライン、生活背景、戻りやすさも結果文で回収

## 開発・確認URL

```txt
/scan/demo
/embed/demo
/admin
```

## 環境変数

Vercel の Environment Variables に設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxx
```

`SUPABASE_SERVICE_ROLE_KEY` は GitHub に入れないでください。

## Supabase

`supabase/schema.sql` を Supabase SQL Editor に貼って実行してください。

v0.1のSQLをすでに実行済みなら、DB構造はそのまま使えます。v0.2は `primary_line` / `secondary_line` に `deep_core_line` が入る可能性がありますが、カラムは text 型なので追加SQLは不要です。

## 注意

このツールは医学的診断を行うものではありません。患者さんが「痛い場所だけでなく、全身のつながりを見る理由」を理解するためのHP拡張ツールです。
