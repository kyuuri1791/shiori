---
paths:
  - "db/**"
  - "sql/**"
  - "app/models/**"
  - "config/database.yml"
  - "config/locales/**"
---

# データベース・モデル

- **スキーマは ridgepole で、1テーブル1ファイルの `db/schemas/<table>.schema` に書く。** `db/Schemafile` はそれらを読み込むだけ。外部キーやチェック制約は、その制約を持つテーブルのファイルに書く。マイグレーションファイルは作らない（`db/migrate` は存在しない）。拡張（pg_trgm）は `dip rails db:extensions` で有効にする。
  - ridgepole で管理するのはアプリ用 DB（`primary`）のテーブルだけ。`schema_migrations` などの Rails の管理用テーブルと、別 DB に置く gem のテーブル（Solid Queue の `queue` DB）は ridgepole で管理せず、gem が生成したスキーマファイル（`db/queue_schema.rb`）を Rails の `db:schema:load:queue` で読み込む。gem を更新したときは gem 側の手順に従う。
  - スキーマを変えたら、反映前に必ず `dip ridgepole --dry-run` で差分を確認する。
  - チェック制約の式や部分インデックスの条件は、PostgreSQL が保存する形（`scheme::text <> 'isbn13'::text` のような型キャスト付き、括弧付き）で書く。そうしないと毎回差分が出る。
- **`sql/` には、初回リリース後に本番データを更新したときの証跡としての SQL だけを置く。** 初回リリース前のデータ投入（最初のマスタなど）や、開発用 DB だけの変換・データいじりはファイルに残さない。用途ごとにサブディレクトリを切り（マスタの投入は `sql/master/`、単発のデータ修正は `sql/fix/`）、ファイル名は `YYYYMMDD_内容.sql`。何度流しても結果が変わらないように書く。
- **クエリは ActiveRecord の公開 API（ハッシュの条件、`order(created_at: :desc)`、`left_joins`、`group` など）で書く。Arel は内部 API なので、`arel_table` や `Arel::Nodes` などの部品は使わない。** 公開 API で書けない PostgreSQL 独自の部分（`ILIKE`・正規表現・pg_trgm・`NULLS LAST`・`COLLATE` など）は、プレースホルダ付きの SQL の断片（`where("… ILIKE ?", …)`）で書き、モデルの名前付きスコープやクラスメソッドに閉じ込める。並べ替えの SQL は `Arel.sql("…")`、値を含むなら `Arel.sql(sanitize_sql_array([ "… ?", 値 ]))` と書く（Rails 8.1 の `order` は関数呼び出しを含む配列を受け付けない）。ActiveRecord の代わりをするだけの薄い独自メソッドは作らず、名前付きスコープやクラスメソッドにするのは業務上の意味があるもの（`Book.tagged` など）だけにする。値を SQL の文字列に直接埋め込まない。
- **関連の読み込みに `includes` は使わない。** 関連のテーブルで絞り込み・並べ替えをしないなら `preload`（別のクエリで読む）、するなら `eager_load`（JOIN して1回で読む）と、意図して使い分ける。
- **論理削除は、監査のために削除したデータを残す仕組み。ユーザーには削除済みを見せず、戻させない**（ユーザーが戻せるものは削除ではなく状態として持つ）。discard gem を `SoftDeletable` concern（`include Discard::Model` と `default_scope -> { kept }`）で使い、削除済みはアプリから自動的に見えないようにする。削除は `discard!` で行い、論理削除のモデルで `destroy` は使わない（本当に消えてしまう）。削除済みを見るのは監査のとき（`with_discarded`）だけ。今の対象は `books`。保存期間を過ぎたら本当に消すデータ（AI 検索の記録・写真の読み取り）は論理削除にしない。
- **enum は enumerize で、DB には integer で持つ。** 値は 1 から振り（0 は使わない）、一度決めた番号は変えない。DB 側にも値の範囲のチェック制約を付け、表示名は `config/locales/ja.yml` の `enumerize.<model>.<attribute>` に書く。
  - `books.status`: 1 = want（読みたい）、2 = reading（読んでる）、3 = read（読んだ）
- **読了の記録は `readings`**（1冊に複数持てる＝再読）。読了日の集計はこのテーブルから行う。
- 二重登録は `books` の部分ユニークインデックス（ユーザー × マスタ、ユーザー × ISBN）で防ぐ。画面側の判定はあくまで補助。
