# 読書カード帳

自分用の読書記録アプリ。Rails 8.1 / Ruby 4.0 / PostgreSQL 17 / React 19 + Vite 8 / Solid Queue。

決まりごとは `.claude/rules/` に分けて置いている（`principles.md` は常に、それ以外は `paths` に合うファイルを扱うときに読み込まれる）。

## 開発環境

すべて Docker Compose 上で動かし、コマンドは dip 経由で叩く。ホストで `bundle` や `pnpm` を直接実行しない。JS のパッケージ管理は pnpm（バージョンは `package.json` の `packageManager` で固定）。インストール時スクリプトは既定で動かないので、必要なものだけ `pnpm-workspace.yaml` の `allowBuilds` で許可する。`node_modules` はエディタが型を読めるよう、ボリュームにせずホストのプロジェクト内に置く（コンテナはホストと同じ UID で動くので、ファイルの所有者もホストのユーザーになる）。

| やりたいこと | コマンド |
|---|---|
| 起動 | `dip rails s`（Rails・Vite・ジョブワーカー・Postgres が立ち上がる。http://localhost:3000） |
| Rails コマンド | `dip rails c`、`dip rails runner '...'` など |
| スキーマ反映 | `dip ridgepole`（確認だけなら `dip ridgepole --dry-run`）、テスト用 DB は `dip ridgepole test`。ジョブキュー用 DB は `dip rails db:schema:load:queue`（テスト用は末尾に `RAILS_ENV=test`） |
| SQL ファイルを流す | `dip sql sql/master/xxx.sql`（1トランザクションで実行し、エラーがあれば全部取り消す） |
| DB に入る | `dip psql` |
| テスト | `dip rspec` |
| まとめてチェック（RuboCop・型チェック・bundler-audit・Brakeman・RSpec） | `dip ci` |
| 型チェック（TypeScript） | `dip pnpm typecheck` |
| パスワードを変える | `dip rails runner 'User.find_by!(email_address: "dev@example.com").update!(password: "...")'`（メール送信の機能はないので、再設定はコンソールで行う） |
| 管理者にする | `dip rails runner 'User.find_by!(email_address: "...").update!(admin: true)'`（管理画面 `/admin` で AI の機能を承認する。管理者を決める画面はない） |
| 開発用のユーザーと本棚を作り直す | `dip rails dev:reset`（マスタはそのまま残す） |
| マスタを投入する | `dip rails master:load`（`config/master_data.yml` で指定した `data/master/` のファイルを投入。sha256 を確認し、入っている ISBN は飛ばす） |
| openBD から全件取り直す | `dip rails master:harvest`（約40分。openBD に負荷をかけないよう1秒に1回以下。普段は不要） |
| gem / パッケージを追加 | `dip bundle add xxx` / `dip pnpm add xxx`（開発用は `dip pnpm add -D xxx`） |

## 全体の構成

- 本棚画面は `user_shelf_items#index`（HTML）＋ React（`app/client/bookshelf/`）。データの取得・書き込みは `app/controllers/api/` の JSON API。
- アプリの DB（`primary`）はスキーマを ridgepole で管理。ジョブキューは別 DB（`queue`）の Solid Queue で、ワーカーは compose の `jobs` サービス。
- 本のマスタ（`books` / `book_identifiers`）は openBD の全件（約194万冊）。本番と開発で同じデータを使う。
- 開発用データは `db/seeds.rb` → `lib/dev_seeder.rb`（development のみ）。ユーザーと本棚だけを作り、本棚の本は投入済みのマスタから乱数シード固定で選ぶ。マスタは seed では作らない。
