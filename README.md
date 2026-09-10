# 不動産投資提案書作成アプリ

投資用不動産(キャッシュフロー・節税重視)の提案書をA4で生成する社内ツール。

- 仕様: [docs/spec.md](docs/spec.md)
- 設計判断の記録: [docs/decisions.md](docs/decisions.md)

## 開発

```sh
npm install
npm run dev        # 開発サーバー
npm test           # 計算エンジンのテスト
npm run typecheck
npm run build      # dist/ に静的ファイルを出力
npm run template   # Excel入力テンプレートを再生成 (openpyxl が必要)
```

サーバーサイドはなく、成果物は静的ファイルのみ。提案履歴は各利用者のブラウザの
IndexedDB に保存されるため、静的ホスティングに公開しても他人からは見えない。

## 構成

```
src/domain/     計算エンジン(UIから独立、テストあり)
  units.ts        金額の単位を型で分ける(月額/年額/率)
  structures.ts   建物構造と法定耐用年数
  depreciation.ts 耐用年数(簡便法)と減価償却
  loan.ts         元利均等返済、土地対応借入の建物優先充当
  simulate.ts     提案書の全数値を1回で算出する入口
  validate.ts     入力の整合性チェック
src/storage/    IndexedDB / JSONバックアップ / Excel取り込み
  excelColumns.json  Excelの列定義。テンプレート生成と取り込みの唯一の正
  excelImport.ts     テンプレートの読み取り
src/ui/         4画面(一覧 / 入力 / プレビュー / 使い方)と提案書レイアウト(2枚目に年次明細と計算の根拠)
```

## デプロイ

`main` またはこのプロジェクトの作業ブランチに push すると、GitHub Actions が
typecheck → test → build を通したうえで GitHub Pages に公開する
(`.github/workflows/deploy.yml`)。

公開URL: `https://<owner>.github.io/rent-assessment/`

初回だけリポジトリ側の設定が必要:
**Settings → Pages → Build and deployment → Source を「GitHub Actions」にする。**

Vite の `base` は `./` なので、サブパス配信でも資産・テンプレート・遅延読み込みの
チャンクがすべて解決する。

提案履歴は各利用者のブラウザの IndexedDB にあるため、公開しても他人からは見えない。

## 注意

提案書に載る数字は税務計算そのものなので、`src/domain/` を変更したら必ず
`npm test` を通すこと。ローンの計算値は手計算値でテストに固定してある。
