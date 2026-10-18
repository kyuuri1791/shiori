# 読書カード帳

自分用の読書記録アプリ。Rails 8.1 / Ruby 4.0 / PostgreSQL 17 / React 19 + Vite 8（HMR あり）。
開発環境はすべて Docker Compose 上で動き、コマンドは [dip](https://github.com/bibendi/dip) 経由で叩く。

## はじめに

```sh
gem install dip
dip provision          # イメージのビルド、gem / pnpm パッケージのインストール、DB 作成、スキーマ反映、seed
dip rails s            # http://localhost:3000 （Vite とジョブワーカーも一緒に起動する）
```

ログイン: `dev@example.com` / `password`（開発用 seed）

`dip provision` で、本番と同じマスタ（openBD の全件、約194万冊）と、85 冊ほどの開発用の本棚が入る。
マスタのファイル（`data/master/` 以下、git 管理外）は手元で管理している。別の環境では、このファイルを `data/master/` に置いてから `dip provision` する。
ユーザーと本棚だけ作り直すときは `dip rails dev:reset`。

## よく使うコマンド

| やりたいこと | コマンド |
|---|---|
| 起動 / 停止 | `dip rails s`（Ctrl+C で止まる） / `dip compose down` |
| Rails コンソール | `dip rails c` |
| スキーマ変更を反映 | `db/schemas/<table>.schema` を編集して `dip ridgepole --dry-run` で確認してから `dip ridgepole` |
| SQL ファイルを流す | `dip sql sql/master/xxx.sql` |
| ISBN だけの本をマスタに紐付ける | `dip rails editions:link_books` |
| テスト | `dip ridgepole test && dip rspec` |
| gem / パッケージを追加 | `dip bundle add xxx` / `dip pnpm add xxx`（開発用は `dip pnpm add -D xxx`） |
| DB に入る | `dip psql` |

## 構成メモ

- スキーマは ridgepole で、1テーブル1ファイル（`db/schemas/*.schema`）で管理する。マイグレーションは使わない。
- 本のマスタ（`editions` / `edition_identifiers`）は、初回は `master:load` で openBD の全件を投入し、リリース後の更新は `sql/master/` の SQL で行う。
- 本棚画面は `books#index` が本の一覧を `data-props` に埋め込み、React（`app/client/`）が描く。
- 書き込みはすべて `POST /api/books/batch`（登録・更新・削除・復元を1トランザクションで適用）。
- 削除は `discarded_at` による論理削除。画面の「元に戻す」は直前の変更の逆操作を送っている。
- Vite の読み込みは gem を使わず `app/helpers/vite_helper.rb` で行う。開発中は Vite の開発サーバー、
  本番は `pnpm build` で `public/vite/` に出力したものを manifest から読む。
