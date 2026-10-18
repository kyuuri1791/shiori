---
paths:
  - "lib/**"
  - "app/models/**"
  - "config/master_data.yml"
---

# 本のマスタ

- **本のマスタは `books`**（openBD の全件、約194万冊）。本番と開発で同じデータを使う。データセットは git 管理外の `data/master/` に置き、`config/master_data.yml` にファイル名と sha256 を固定して `master:load` で投入する。リリース後の追加・修正は `sql/master/` の SQL で行う。
- アプリのユーザーはマスタを追加・編集できず、アプリから外部の書誌 API も呼ばない（例外はマスタを作る `master:harvest` だけ）。
- 本の区別は `books.id`。ISBN などの外部の識別子は `book_identifiers`（`scheme` + `value` で一意）に持ち、特定の外部サービスの形式に依存させない。
- マスタは件数が多いので、マスタを引くクエリにはインデックスが効く形にし、`Book.with_statement_timeout` で時間の上限を付ける。
- マスタは書誌の表記がそろっていない（著者名の表記ゆれ、巻数の項目がないなど）。著者名で絞り込まず、並び順の参考にだけ使う。
- `user_shelf_items.book_id` が空の本は、マスタに紐付いていない自由入力の記録。マスタにない ISBN は `user_shelf_items.isbn13` にだけ持ち、あとでマスタに入れたら紐付ける。
