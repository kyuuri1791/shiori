---
paths:
  - "db/**"
  - "sql/**"
  - "app/models/**"
  - "config/database.yml"
---

# データベース・モデル

- **スキーマは ridgepole で管理する**（`db/schemas/<table>.schema`、マイグレーションファイルは作らない）。
  - スキーマを変えたら、反映前に必ず `dip ridgepole --dry-run` で差分を確認する。
  - チェック制約の式や部分インデックスの条件は、PostgreSQL が保存する形（`scheme::text <> 'isbn13'::text` のような型キャスト付き、括弧付き）で書く。そうしないと毎回差分が出る。
  - ridgepole で管理するのはアプリ用 DB（`primary`）だけ。Solid Queue の `queue` DB は `db/queue_schema.rb` を `db:schema:load:queue` で読み込む。拡張（pg_trgm）は `dip rails db:extensions` で有効にする。
- **`sql/` には、初回リリース後に本番データを更新したときの証跡としての SQL だけを置く。** 初回リリース前のデータ投入や、開発用 DB だけの変換・データいじりはファイルに残さない。用途ごとにサブディレクトリを切り（マスタの投入は `sql/master/`、単発のデータ修正は `sql/fix/`）、ファイル名は `YYYYMMDD_内容.sql`。何度流しても結果が変わらないように書く。
- **論理削除は、監査のために削除したデータを残す仕組み。ユーザーには削除済みを見せず、戻させない**（ユーザーが戻せるものは削除ではなく状態として持つ）。保存期間を過ぎたら本当に消すデータ（AI 検索の記録・写真の読み取り）は論理削除にしない。
- **enum の番号は一度決めたら変えない。**
  - `user_shelf_items.status`: 1 = want（読みたい）、2 = reading（読んでる）、3 = read（読んだ）
- **読了の記録は `readings`**（1冊に複数持てる＝再読）。読了日の集計はこのテーブルから行う。
- 二重登録は `user_shelf_items` の部分ユニークインデックス（ユーザー × マスタ、ユーザー × ISBN）で防ぐ。画面側の判定はあくまで補助。
