# 未病レーダー 更新履歴

このファイルは更新履歴の入口です。現行仕様は `README.md` と現行コードを参照してください。

過去資料は、そのリリース時点のsnapshotです。

---

## 最新

### v7.79.89

保存アイコンと短い登録見出しを復活。価値説明を一文に集約し、本文・注意文・無料体験・メール欄・参考予報の文字の強弱と濃度を調整。認証・予報計算・計測の変更なし。追加SQL・設定変更なし。

- `RELEASE-v7.79.89.md`

### v7.79.88

登録画面を価値説明から始まる短い構成へ整理。Google・メール認証の下に東京の参考体質予報（ミモル）を表示。14日間無料・自動課金なしとPWA・通知の説明を追加。README・AI引き継ぎも現行仕様へ更新。追加SQL・設定変更なし。

- `RELEASE-v7.79.88.md`

### v7.79.83

「整え方」の7方針を、意味が伝わる説明へ調整。結果画面の補足文と低余力時の理由文も整理。v7.79.82の保存案内変更を包含。点数・選定・認証処理の変更なし。

- `RELEASE-v7.79.83.md`
- `CHANGED-v7.79.83.txt`

### v7.79.82

整え方タブの文章改善。選定ロジック・点数・認証・計測の変更なし。

- `RELEASE-v7.79.82.md`

### v7.79.81

登録導線、6桁Email OTP、内部signup funnel計測を追加。Supabase migrationとAuthenticationメールテンプレート設定が必要。

- `RELEASE-v7.79.81.md`
- `CHANGED-v7.79.81.txt`

### v7.79.80

ケア記録の `no_symptoms` 対応、PWA/通知案内条件、表示文言を調整。DB migrationあり。

- `RELEASE-v7.79.80.md`
- `SETUP-v7.79.80.txt`

### v7.79.78

Meta SDK / PageViewを本番ホストへ限定し、流入パラメータ保存と重複防止を整理。

- `RELEASE-v7.79.78.md`

---

## v7.79 系リリース資料

詳細が必要な場合だけ対象バージョンを開いてください。

```text
RELEASE-v7.79.77.md
RELEASE-v7.79.76.md
RELEASE-v7.79.75.md
RELEASE-v7.79.74.md
RELEASE-v7.79.73.md
RELEASE-v7.79.72.md
RELEASE-v7.79.71.md
RELEASE-v7.79.70.md
RELEASE-v7.79.69.md
RELEASE-v7.79.68-rebuilt.md
RELEASE-v7.79.67.md
RELEASE-v7.79.66.md
RELEASE-v7.79.65.md
RELEASE-v7.79.64.md
RELEASE-v7.79.63.md
RELEASE-v7.79.62.md
RELEASE-v7.79.61.md
RELEASE-v7.79.60.md
RELEASE-v7.79.59.md
RELEASE-v7.79.58.md
RELEASE-v7.79.57.md
RELEASE-v7.79.56.md
RELEASE-v7.79.55.md
RELEASE_NOTES_V77943.md
RELEASE_NOTES_V77929.md
```

適用手順や変更ファイル一覧として、`SETUP-*`、`UPDATED-*`、`CHANGED-*` も残しています。

---

## それ以前の詳細履歴

以前はREADME自体に長いバージョン履歴を追記していました。内容は削除せず、以下へそのまま保存しています。

```text
docs/archive/README_FULL_HISTORY_PRE_V77983.md
docs/archive/README_AI_HANDOFF_FULL_HISTORY_PRE_V77983.md
docs/archive/AI_HANDOFF_STABLE_PRE_V77983.md
```

v7.79.54以前やv7.78 / v7.77 / v7.76 / v7.75 / v7.74 / v7.73 / v7.72 / v7.71系の詳細を追う場合は、上記archiveまたは関連 `docs/` を参照してください。
