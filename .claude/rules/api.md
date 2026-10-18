---
paths:
  - "app/controllers/**"
  - "app/jobs/**"
  - "app/models/**"
  - "config/routes.rb"
---

# コントローラ・API・ジョブ

- **ブラウザから呼ぶ JSON のエンドポイントは `app/controllers/api/` の `Api::` 名前空間に置き、`/api/...` で公開する。** `Api::ApplicationController` を継承し、エラーはすべて JSON（`{ error: "..." }`）で返す。ログインしていなければ 401、CSRF トークンが不正なら 422。認証はセッション cookie なので CSRF 対策は外さない。
- **リクエストのパラメータは action_args でアクションの引数として受ける**（`def show(id)`、`def search(q: "", author: "")`）。必須のものは位置引数にして、なければ 400 にする。配列やハッシュを受け取ったら型を確かめ、中身は `permit` で絞る。複数のアクションで共通の絞り込み条件（本棚の一覧の条件・ページ）だけは、共通の concern で `params` から読む。
- **時間のかかる処理（外部 API の呼び出しなど）は Web のリクエストの中でやらず、Solid Queue のジョブに回す。** ジョブワーカーは compose の `jobs` サービス。ジョブはどんな失敗でも結果を失敗の状態にし、処理中のまま残さない。
- **書き込みは1件ずつの REST のアクション（`create` / `update` / `destroy`）にする。** 1つの入口に操作の種類を送って振り分ける作りにはしない。複数件をまとめて扱う必要があるものだけ、別のコントローラ（例: `Api::UserShelfItemsBulkController#create`）にする。複数のレコードをまとめて検証・保存する処理は、フォームオブジェクト（`app/models/forms/`、`ActiveModel::Model`、クラス名の末尾は `Form`）に書き、件数の上限を付ける。トランザクションはフォームオブジェクトではなくコントローラで張る（`ActiveRecord::Base.transaction { form.save }`）。コントローラは `save` の結果を見てレスポンスを返すだけにし、例外を捕まえて業務の判断をしない。入力→確認→登録→完了のように続く画面は、確認や完了ごとに別のコントローラを作らず、1つのコントローラのアクション（`new` / `confirm` / `create` / `complete`）にまとめる。登録のあとはリダイレクトして完了画面を出す（PRG）。
- 一覧は pagy で1ページ20件。回数制限は `rate_limit` で、外部サービスや重いクエリにつながるエンドポイントには必ず付ける。費用のかかる機能には、回数・入力の長さの上限を付ける。
- ログインは cookie ストアで管理し、sessions テーブルは持たない。認証の処理は `app/controllers/concerns/authenticatable.rb` にまとめ、モデル層には置かない。ログイン中のユーザーは、コントローラとビューで `current_user` を使って取る（`Current` のようなグローバルな置き場は使わない）。Action Cable と Action Mailer は読み込んでいない。
- **ログインしていなくても使えるのは、本棚の閲覧と本の検索だけ。** その API は `Api::Public::` に置いて `Api::Public::ApplicationController` を継承し、IP アドレス単位の `rate_limit` をかけ、読み取りしかできないようにする。公開ページは `noindex` にする。
- **外部の AI（Claude）を呼ぶのはジョブだけ。** API キーは jobs コンテナにだけ渡し、Web やブラウザには渡さない。AI には解釈（構造化出力）だけを返させ、表示する本は必ずマスタから引く。ユーザーの入力はデータとして渡し、その中の指示には従わせない。
